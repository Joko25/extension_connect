import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Profile, House, Role, StatusWarga } from '@/types/database.types'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ProfileWithHouse extends Profile {
  house: Pick<House, 'id' | 'blok_rumah' | 'no_rumah' | 'status_tinggal'> | null
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

      let result = (data ?? []) as ProfileWithHouse[]

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
      return data as ProfileWithHouse
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
      houseId,
      blokRumah,
      noRumah,
      statusTinggal,
    }: {
      profileId: string
      houseId: string
      blokRumah: string
      noRumah: string
      statusTinggal: 'tetap' | 'kontrak'
    }) => {
      const { error } = await supabase
        .from('houses')
        .update({ blok_rumah: blokRumah, no_rumah: noRumah, status_tinggal: statusTinggal })
        .eq('id', houseId)

      if (error) throw new Error(error.message)
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
  user_id: string
  nama_lengkap: string
  nik: string
  no_kk: string
  no_hp?: string
  blokRumah: string
  noRumah: string
  statusTinggal: 'tetap' | 'kontrak'
}

/**
 * Tambah warga manual oleh admin (sekretaris/ketua_rt).
 * Upsert profil + menautkan ke rumah berdasarkan blok/no.
 * Jika user_id sudah punya profil (mis. dari trigger registrasi),
 * profil tsb di-update (nama/nik/no_kk → aktif) alih-alih insert duplikat.
 * Catatan: user_id harus merujuk akun auth yang sudah terdaftar.
 */
export function useAddWargaManual() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: AddWargaManualPayload) => {
      // 1. Cek apakah profil sudah ada untuk user_id ini
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', payload.user_id)
        .maybeSingle()

      let profileId: string

      if (existingProfile) {
        // Update profil yang sudah ada (pending → aktif) + lengkapi data
        const { data, error } = await supabase
          .from('profiles')
          .update({
            nama_lengkap: payload.nama_lengkap,
            nik: payload.nik,
            no_kk: payload.no_kk,
            no_hp: payload.no_hp ?? null,
            status_warga: 'aktif',
          })
          .eq('id', existingProfile.id)
          .select('id')
          .single()

        if (error) throw new Error(error.message)
        profileId = data.id
      } else {
        // Insert profil baru
        const { data, error } = await supabase
          .from('profiles')
          .insert({
            user_id: payload.user_id,
            nama_lengkap: payload.nama_lengkap,
            nik: payload.nik,
            no_kk: payload.no_kk,
            no_hp: payload.no_hp ?? null,
            role: 'warga',
            status_warga: 'aktif',
          })
          .select('id')
          .single()

        if (error) throw new Error(error.message)
        profileId = data.id
      }

      // 2. Cari rumah berdasarkan blok + no
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
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: wargaKeys.all })
      qc.invalidateQueries({ queryKey: ['houses'] })
    },
  })
}
