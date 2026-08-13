import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Letter, StatusSurat } from '@/types/database.types'

export const GENERATED_PDF_BUCKET = 'generated-pdfs'

export const JENIS_SURAT_LIST = [
  'Surat Keterangan Domisili',
  'Surat Pengantar KTP',
  'Surat Keterangan Kematian',
  'Surat Keterangan Usaha',
  'Surat Pengantar Nikah',
  'Surat Keterangan Tidak Mampu',
  'Lainnya',
] as const

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const letterKeys = {
  all: ['letters'] as const,
  mine: (profileId: string) => [...letterKeys.all, 'mine', profileId] as const,
  list: () => [...letterKeys.all, 'list'] as const,
  pdfUrl: (path: string) => [...letterKeys.all, 'pdf', path] as const,
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LetterWithProfile extends Letter {
  profile: { nama_lengkap: string; nik: string; user_id: string }
}

export interface CreateLetterPayload {
  profileId: string
  jenisSurat: string
  keterangan: string
}

export interface UpdateLetterStatusPayload {
  letterId: string
  status: StatusSurat
  reviewerId: string
  pdfUrl?: string | null
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

/**
 * Riwayat permohonan surat milik warga yang sedang login
 */
export function useMyLetters(profileId: string | null | undefined) {
  return useQuery({
    queryKey: letterKeys.mine(profileId ?? ''),
    queryFn: async (): Promise<Letter[]> => {
      const { data, error } = await supabase
        .from('letters')
        .select('*')
        .eq('profile_id', profileId!)
        .order('created_at', { ascending: false })

      if (error) throw new Error(error.message)
      return (data ?? []) as Letter[]
    },
    enabled: !!profileId,
    staleTime: 1000 * 15,
  })
}

/**
 * Semua permohonan surat (admin: sekretaris/ketua_rt)
 */
export function useAllLetters(status?: StatusSurat) {
  return useQuery({
    queryKey: [...letterKeys.list(), status ?? 'all'],
    queryFn: async (): Promise<LetterWithProfile[]> => {
      let query = supabase
        .from('letters')
        .select(`
          *,
          profile:profiles!letters_profile_id_fkey (
            nama_lengkap,
            nik,
            user_id
          )
        `)
        .order('created_at', { ascending: false })

      if (status) query = query.eq('status', status)

      const { data, error } = await query
      if (error) throw new Error(error.message)
      return (data ?? []) as LetterWithProfile[]
    },
    staleTime: 1000 * 15,
  })
}

/**
 * Signed URL untuk PDF surat (private bucket generated-pdfs)
 */
export function useLetterPdfUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: letterKeys.pdfUrl(path ?? ''),
    queryFn: async (): Promise<string> => {
      const { data, error } = await supabase.storage
        .from(GENERATED_PDF_BUCKET)
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
 * Warga aktif membuat permohonan surat baru
 */
export function useCreateLetter() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ profileId, jenisSurat, keterangan }: CreateLetterPayload) => {
      const { error } = await supabase.from('letters').insert({
        profile_id: profileId,
        jenis_surat: jenisSurat,
        keterangan,
        status: 'pending',
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: letterKeys.mine(vars.profileId) })
    },
  })
}

/**
 * Admin update status permohonan (approve/reject) + opsional attach PDF
 */
export function useUpdateLetterStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      letterId,
      status,
      reviewerId,
      pdfUrl,
    }: UpdateLetterStatusPayload) => {
      const { error } = await supabase
        .from('letters')
        .update({
          status,
          reviewed_by: reviewerId,
          ...(pdfUrl !== undefined ? { pdf_url: pdfUrl } : {}),
        })
        .eq('id', letterId)

      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: letterKeys.all })
    },
  })
}
