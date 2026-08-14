import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Contribution, ContributionWithProfile, StatusPembayaran } from '@/types/database.types'

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const iuranKeys = {
  all: ['iuran'] as const,
  mine: (profileId: string) => [...iuranKeys.all, 'mine', profileId] as const,
  pending: () => [...iuranKeys.all, 'pending'] as const,
  all_list: () => [...iuranKeys.all, 'list'] as const,
  byYear: (year: number) => [...iuranKeys.all, 'year', year] as const,
  proofUrl: (path: string) => [...iuranKeys.all, 'proof-url', path] as const,
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SubmitIuranPayload {
  profileId: string
  bulanTahun: string   // format: YYYY-MM
  nominal: number
  proofFile: File
}

export interface ApproveIuranPayload {
  contributionId: string
  profileId: string    // profile yang membayar (untuk cashflow created_by)
  bulanTahun: string
  nominal: number
  namaWarga: string
}

export interface RejectIuranPayload {
  contributionId: string
  catatan?: string
}

export interface AddManualIuranPayload {
  profileId: string        // warga yang membayar
  namaWarga: string
  bulanTahun: string       // format: YYYY-MM
  nominal: number
  reviewerProfileId: string // created_by untuk cashflow
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

/**
 * Riwayat iuran milik warga yang sedang login
 */
export function useMyContributions(profileId: string | null | undefined) {
  return useQuery({
    queryKey: iuranKeys.mine(profileId ?? ''),
    queryFn: async (): Promise<Contribution[]> => {
      const { data, error } = await supabase
        .from('contributions')
        .select('*')
        .eq('profile_id', profileId!)
        .order('bulan_tahun', { ascending: false })

      if (error) throw new Error(error.message)
      return (data ?? []) as Contribution[]
    },
    enabled: !!profileId,
    staleTime: 1000 * 30,
  })
}

/**
 * Semua iuran pending (untuk antrean review bendahara)
 */
export function usePendingContributions() {
  return useQuery({
    queryKey: iuranKeys.pending(),
    queryFn: async (): Promise<ContributionWithProfile[]> => {
      const { data, error } = await supabase
        .from('contributions')
        .select(`
          *,
          profile:profiles!contributions_profile_id_fkey (
            nama_lengkap,
            no_hp
          )
        `)
        .eq('status_pembayaran', 'pending')
        .order('created_at', { ascending: true })

      if (error) throw new Error(error.message)
      return (data ?? []) as ContributionWithProfile[]
    },
    staleTime: 1000 * 15,
  })
}

/**
 * Semua iuran (untuk history lengkap — bendahara/ketua_rt)
 */
export function useAllContributions() {
  return useQuery({
    queryKey: iuranKeys.all_list(),
    queryFn: async (): Promise<ContributionWithProfile[]> => {
      const { data, error } = await supabase
        .from('contributions')
        .select(`
          *,
          profile:profiles!contributions_profile_id_fkey (
            nama_lengkap,
            no_hp
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw new Error(error.message)
      return (data ?? []) as ContributionWithProfile[]
    },
    staleTime: 1000 * 30,
  })
}

/**
 * Semua iuran dalam satu tahun berjalan (untuk matrix Cashflow Warga)
 */
export function useContributionsByYear(year: number) {
  return useQuery({
    queryKey: iuranKeys.byYear(year),
    queryFn: async (): Promise<Contribution[]> => {
      const start = `${year}-01`
      const end = `${year}-12`
      const { data, error } = await supabase
        .from('contributions')
        .select('*')
        .gte('bulan_tahun', start)
        .lte('bulan_tahun', end)
        .order('bulan_tahun', { ascending: true })

      if (error) throw new Error(error.message)
      return (data ?? []) as Contribution[]
    },
    staleTime: 1000 * 30,
  })
}

/**
 * Signed URL untuk foto bukti transfer (private bucket)
 */
export function useProofSignedUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: iuranKeys.proofUrl(path ?? ''),
    queryFn: async (): Promise<string> => {
      const { data, error } = await supabase.storage
        .from('payment-proofs')
        .createSignedUrl(path!, 60 * 60)

      if (error) throw new Error(error.message)
      return data.signedUrl
    },
    enabled: !!path,
    staleTime: 1000 * 50 * 60,
    gcTime: 1000 * 60 * 60,
  })
}

// ─── Mutations ───────────────────────────────────────────────────────────────

/**
 * Submit iuran baru: upload foto → insert contributions row
 */
export function useSubmitIuran() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ profileId, bulanTahun, nominal, proofFile }: SubmitIuranPayload) => {
      // 1. Upload foto bukti ke storage
      const ext = proofFile.name.split('.').pop()
      const filePath = `${profileId}/${bulanTahun}-${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(filePath, proofFile, { upsert: false })

      if (uploadError) throw new Error(`Upload gagal: ${uploadError.message}`)

      // 2. Insert row contributions
      const { error: insertError } = await supabase
        .from('contributions')
        .insert({
          profile_id: profileId,
          bulan_tahun: bulanTahun,
          nominal,
          proof_url: filePath,
          status_pembayaran: 'pending',
        })

      if (insertError) {
        // Rollback: hapus file yang sudah diupload
        await supabase.storage.from('payment-proofs').remove([filePath])
        throw new Error(`Gagal menyimpan data: ${insertError.message}`)
      }
    },
    onSuccess: (_data, { profileId }) => {
      qc.invalidateQueries({ queryKey: iuranKeys.mine(profileId) })
      qc.invalidateQueries({ queryKey: iuranKeys.pending() })
    },
  })
}

/**
 * Approve iuran: update status → approved + buat entry cashflow masuk
 */
export function useApproveIuran() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      contributionId,
      profileId,
      bulanTahun,
      nominal,
      namaWarga,
    }: ApproveIuranPayload) => {
      // 1. Update status contribution
      const { error: updateError } = await supabase
        .from('contributions')
        .update({
          status_pembayaran: 'approved' as StatusPembayaran,
          reviewed_by: profileId,
        })
        .eq('id', contributionId)

      if (updateError) throw new Error(updateError.message)

      // 2. Buat entry cashflow masuk
      const [year, month] = bulanTahun.split('-')
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
      const monthLabel = monthNames[parseInt(month, 10) - 1]

      const { error: cashflowError } = await supabase
        .from('cashflows')
        .insert({
          tipe: 'masuk',
          nominal,
          keterangan: `Iuran ${monthLabel} ${year} — ${namaWarga}`,
          tanggal: new Date().toISOString().split('T')[0],
          created_by: profileId,
        })

      if (cashflowError) throw new Error(`Cashflow gagal: ${cashflowError.message}`)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: iuranKeys.all })
      qc.invalidateQueries({ queryKey: ['cashflow'] })
    },
  })
}

/**
 * Reject iuran dengan opsional catatan
 */
export function useRejectIuran() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ contributionId, catatan }: RejectIuranPayload) => {
      const { error } = await supabase
        .from('contributions')
        .update({
          status_pembayaran: 'rejected' as StatusPembayaran,
          catatan: catatan ?? null,
        })
        .eq('id', contributionId)

      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: iuranKeys.all })
    },
  })
}

/**
 * Input kas iuran manual oleh bendahara/ketua_rt.
 * Membuat kontribusi langsung approved + mencatat cashflow masuk.
 * Digunakan saat warga membayar tunai/di luar aplikasi.
 */
export function useAddManualIuran() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      profileId,
      namaWarga,
      bulanTahun,
      nominal,
      reviewerProfileId,
    }: AddManualIuranPayload) => {
      // 1. Insert contribution dengan status approved
      const { error: insertError } = await supabase.from('contributions').insert({
        profile_id: profileId,
        bulan_tahun: bulanTahun,
        nominal,
        status_pembayaran: 'approved' as StatusPembayaran,
        reviewed_by: reviewerProfileId,
      })

      if (insertError) throw new Error(`Gagal menyimpan iuran: ${insertError.message}`)

      // 2. Catat cashflow masuk
      const [year, month] = bulanTahun.split('-')
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
      const monthLabel = monthNames[parseInt(month, 10) - 1]

      const { error: cashflowError } = await supabase
        .from('cashflows')
        .insert({
          tipe: 'masuk',
          nominal,
          keterangan: `Iuran ${monthLabel} ${year} — ${namaWarga}`,
          tanggal: new Date().toISOString().split('T')[0],
          created_by: reviewerProfileId,
        })

      if (cashflowError) throw new Error(`Cashflow gagal: ${cashflowError.message}`)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: iuranKeys.all })
      qc.invalidateQueries({ queryKey: ['cashflow'] })
    },
  })
}
