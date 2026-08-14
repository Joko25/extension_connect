import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Profile, House, Role, StatusWarga, HouseWithProfile } from '@/types/database.types'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ProfileWithHouse extends Profile {
  house: Pick<House, 'id' | 'blok_rumah' | 'no_rumah' | 'status_tinggal'> | null
}

/**
 * PostgREST mengembalikan embed `house` sebagai array (karena profile_id
 * tidak UNIQUE di houses). Normalisasi ke satu objek (atau null).
 */
function collapseHouse<T extends { house?: unknown }>(
  row: T
): T & {
  house: Pick<House, 'id' | 'blok_rumah' | 'no_rumah' | 'status_tinggal'> | null
} {
  const h = Array.isArray(row.house) ? row.house[0] : (row.house ?? null)
  return { ...row, house: (h as ProfileWithHouse['house']) ?? null }
}

export interface WargaFilters {
  search?: string
  blokRumah?: string
  statusTinggal?: string
  statusWarga?: StatusWarga
}

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const wargaKeys = {
  all: ['warga'] as const,
  list: (filters: WargaFilters) => [...wargaKeys.all, 'list', filters] as const,
  detail: (id: string) => [...wargaKeys.all, 'detail', id] as const,
  signedUrl: (url: string) => [...wargaKeys.all, 'signed-url', url] as const,
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

/**
 * Fetch semua warga dengan filter + relasi rumah
 */
export function useWargaList(filters: WargaFilters = {}) {
  return useQuery({
    queryKey: wargaKeys.list(filters),
    queryFn: async (): Promise<ProfileWithHouse[]> => {
      // Base query: join profiles dengan houses
      let query = supabase
        .from('profiles')
        .select(`
          *,
          house:houses!houses_profile_id_fkey (
            id,
            blok_rumah,
            no_rumah,
            status_tinggal
          )
        `)
        .order('nama_lengkap', { ascending: true })

      // Filter status warga (hanya jika diisi eksplisit; kosong = semua status)
      if (filters.statusWarga) {
        query = query.eq('status_warga', filters.statusWarga)
      }

      // Filter pencarian nama atau NIK
      if (filters.search && filters.search.trim()) {
        query = query.or(
          `nama_lengkap.ilike.%${filters.search.trim()}%,nik.ilike.%${filters.search.trim()}%`
        )
      }

      const { data, error } = await query

      if (error) throw new Error(error.message)

      let result = ((data ?? []) as ProfileWithHouse[]).map(collapseHouse)

      // Filter blok rumah (client-side karena nested relation)
      if (filters.blokRumah) {
        result = result.filter((w) => w.house?.blok_rumah === filters.blokRumah)
      }

      // Filter status tinggal
      if (filters.statusTinggal) {
        result = result.filter((w) => w.house?.status_tinggal === filters.statusTinggal)
      }

      return result
    },
    staleTime: 1000 * 30, // 30 detik — data warga cukup sering berubah
  })
}

/**
 * Fetch detail warga by profile ID
 */
export function useWargaDetail(profileId: string | null) {
  return useQuery({
    queryKey: wargaKeys.detail(profileId ?? ''),
    queryFn: async (): Promise<ProfileWithHouse> => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          house:houses!houses_profile_id_fkey (
            id,
            blok_rumah,
            no_rumah,
            status_tinggal
          )
        `)
        .eq('id', profileId!)
        .single()

      if (error) throw new Error(error.message)
      return collapseHouse(data as ProfileWithHouse)
    },
    enabled: !!profileId,
  })
}

/**
 * Generate signed URL untuk file private (KTP/KK)
 * Signed URL berlaku 60 menit
 */
export function useSignedUrl(bucket: string, path: string | null | undefined) {
  return useQuery({
    queryKey: wargaKeys.signedUrl(path ?? ''),
    queryFn: async (): Promise<string> => {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path!, 60 * 60) // 1 jam

      if (error) throw new Error(error.message)
      return data.signedUrl
    },
    enabled: !!path,
    staleTime: 1000 * 50 * 60, // cache 50 menit (sebelum expire)
    gcTime: 1000 * 60 * 60,
  })
}

export interface WargaStats {
  total: number
  tetap: number
  kontrak: number
  pending: number
}

/**
 * Statistik warga: total, status tinggal, dan jumlah pending
 */
export function useWargaStats() {
  return useQuery({
    queryKey: [...wargaKeys.all, 'stats'],
    queryFn: async (): Promise<WargaStats> => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          status_warga,
          house:houses!houses_profile_id_fkey (
            status_tinggal
          )
        `)

      if (error) throw new Error(error.message)

      const list = (data ?? []) as {
        status_warga: StatusWarga
        house: { status_tinggal: 'tetap' | 'kontrak' }[] | null
      }[]

      return {
        total: list.length,
        tetap: list.filter((w) => w.house?.[0]?.status_tinggal === 'tetap').length,
        kontrak: list.filter((w) => w.house?.[0]?.status_tinggal === 'kontrak').length,
        pending: list.filter((w) => w.status_warga === 'pending').length,
      }
    },
    staleTime: 1000 * 30,
  })
}

/**
 * Fetch daftar blok rumah unik untuk filter dropdown
 */
export function useBlokRumahList() {
  return useQuery({
    queryKey: ['houses', 'blok-list'],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from('houses')
        .select('blok_rumah')
        .order('blok_rumah')

      if (error) throw new Error(error.message)
      const unique = [...new Set((data ?? []).map((h) => h.blok_rumah))]
      return unique
    },
    staleTime: 1000 * 60 * 10,
  })
}

/**
 * Fetch SEMUA rumah (blok + no_rumah) bersama penghuninya,
 * diurutkan berdasarkan blok lalu nomor rumah.
 */
export function useHousesAll() {
  return useQuery({
    queryKey: ['houses', 'all'],
    queryFn: async (): Promise<HouseWithProfile[]> => {
      const { data, error } = await supabase
        .from('houses')
        .select(`
          *,
          profile:profiles!houses_profile_id_fkey (
            id,
            nama_lengkap
          )
        `)
        .order('blok_rumah', { ascending: true })

      if (error) throw new Error(error.message)
      return ((data ?? []) as HouseWithProfile[])
        .map((h) => ({
          ...h,
          profile: (Array.isArray(h.profile) ? h.profile[0] : h.profile) ?? null,
        }))
        .sort((a, b) => {
          if (a.blok_rumah !== b.blok_rumah) return a.blok_rumah.localeCompare(b.blok_rumah)
          return (Number(a.no_rumah) || 0) - (Number(b.no_rumah) || 0)
        })
    },
    staleTime: 1000 * 30,
  })
}

// ─── Mutations ───────────────────────────────────────────────────────────────

/**
 * Update role warga
 */
export function useUpdateWargaRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ profileId, role }: { profileId: string; role: Role }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', profileId)

      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: wargaKeys.all })
    },
  })
}

/**
 * Update status warga (aktif/menolak/pindah → set non-aktif)
 */
export function useUpdateWargaStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      profileId,
      status,
    }: {
      profileId: string
      status: StatusWarga
    }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ status_warga: status })
        .eq('id', profileId)

      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: wargaKeys.all })
    },
  })
}

/**
 * Update data rumah warga (pindah blok/no rumah)
 */
export function useUpdateWargaHouse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      profileId,
      oldHouseId,
      blokRumah,
      noRumah,
      statusTinggal,
    }: {
      profileId: string
      oldHouseId?: string | null
      blokRumah: string
      noRumah: string
      statusTinggal: 'tetap' | 'kontrak'
    }) => {
      // 1. Lepas rumah lama milik warga (jika ada)
      if (oldHouseId) {
        const { error: clearError } = await supabase
          .from('houses')
          .update({ profile_id: null })
          .eq('id', oldHouseId)
        if (clearError) throw new Error(clearError.message)
      }

      // 2. Cari rumah target (blok + no)
      const { data: existing, error: findError } = await supabase
        .from('houses')
        .select('id')
        .eq('blok_rumah', blokRumah)
        .eq('no_rumah', noRumah)
        .maybeSingle()
      if (findError) throw new Error(findError.message)

      if (existing) {
        const { error } = await supabase
          .from('houses')
          .update({ profile_id: profileId, status_tinggal: statusTinggal })
          .eq('id', existing.id)
        if (error) throw new Error(error.message)
      } else {
        const { error } = await supabase.from('houses').insert({
          blok_rumah: blokRumah,
          no_rumah: noRumah,
          status_tinggal: statusTinggal,
          profile_id: profileId,
        })
        if (error) throw new Error(error.message)
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: wargaKeys.all })
      qc.invalidateQueries({ queryKey: ['houses'] })
    },
  })
}

/**
 * Update profil milik sendiri (nama, no_kk, no_hp)
 * Role & status_warga tidak diubah di sini
 */
export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      profileId,
      namaLengkap,
      noKk,
      noHp,
    }: {
      profileId: string
      namaLengkap: string
      noKk: string
      noHp: string
    }) => {
      const { error } = await supabase
        .from('profiles')
        .update({
          nama_lengkap: namaLengkap,
          no_kk: noKk,
          no_hp: noHp || null,
        })
        .eq('id', profileId)

      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: wargaKeys.all })
    },
  })
}

export interface AddWargaManualPayload {
  email: string
  password: string
  nama_lengkap: string
  nik: string
  no_kk: string
  no_hp?: string
  blokRumah: string
  noRumah: string
  statusTinggal: 'tetap' | 'kontrak'
  ktpFile?: File | null
  kkFile?: File | null
}

/**
 * Tambah warga manual oleh admin (sekretaris/ketua_rt).
 * Akun & profil dibuat otomatis (UUID di-generate server) via
 * edge function `create-warga`, lalu rumah ditautkan & dokumen diunggah.
 */
export function useAddWargaManual() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: AddWargaManualPayload) => {
      // 1. Buat akun + profil otomatis via edge function
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const { data: created, error: fnError } = await supabase.functions.invoke('create-warga', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: {
          email: payload.email,
          password: payload.password,
          nama_lengkap: payload.nama_lengkap,
          nik: payload.nik,
          no_kk: payload.no_kk,
          no_hp: payload.no_hp ?? '',
        },
      })

      if (fnError) throw new Error(fnError.message)
      if (!created?.profileId) throw new Error('Gagal membuat akun warga')

      const profileId = created.profileId as string
      const userId = created.userId as string

      // 2. Tautkan rumah berdasarkan blok + no
      const { data: existing } = await supabase
        .from('houses')
        .select('id')
        .eq('blok_rumah', payload.blokRumah)
        .eq('no_rumah', payload.noRumah)
        .maybeSingle()

      if (existing) {
        const { error } = await supabase
          .from('houses')
          .update({
            profile_id: profileId,
            status_tinggal: payload.statusTinggal,
          })
          .eq('id', existing.id)

        if (error) throw new Error(error.message)
      } else {
        const { error } = await supabase.from('houses').insert({
          blok_rumah: payload.blokRumah,
          no_rumah: payload.noRumah,
          status_tinggal: payload.statusTinggal,
          profile_id: profileId,
        })

        if (error) throw new Error(error.message)
      }

      // 3. Upload dokumen KTP & KK (opsional) ke folder user_id warga
      const uploadDoc = async (file: File, type: 'ktp' | 'kk') => {
        const ext = file.name.split('.').pop()
        const path = `${userId}/${type}-${Date.now()}.${ext}`
        const { error } = await supabase.storage
          .from('ktp-kk-docs')
          .upload(path, file, { upsert: false })
        if (error) throw new Error(`Gagal mengunggah ${type === 'ktp' ? 'KTP' : 'KK'}: ${error.message}`)
        return path
      }

      const ktpPath = payload.ktpFile ? await uploadDoc(payload.ktpFile, 'ktp') : ''
      const kkPath = payload.kkFile ? await uploadDoc(payload.kkFile, 'kk') : ''

      if (ktpPath || kkPath) {
        const { error: docsError } = await supabase.rpc('set_warga_docs', {
          p_profile_id: profileId,
          p_ktp_path: ktpPath,
          p_kk_path: kkPath,
        })
        if (docsError) throw new Error(`Gagal menyimpan dokumen: ${docsError.message}`)
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: wargaKeys.all })
      qc.invalidateQueries({ queryKey: ['houses'] })
    },
  })
}
