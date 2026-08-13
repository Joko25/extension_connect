import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Announcement } from '@/types/database.types'

export const FLYER_BUCKET = 'announcement-flyers'

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const announcementKeys = {
  all: ['announcements'] as const,
  list: () => [...announcementKeys.all, 'list'] as const,
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface GenerateFlyerPayload {
  judul: string
  agenda: string
  kategori: string
}

export interface PublishAnnouncementPayload {
  judul: string
  isi: string
  kategori: string
  flyerUrl: string | null
  createdBy: string
}

// ─── Queries ─────────────────────────────────────────────────────────────────

/**
 * Daftar pengumuman terbaru (semua warga aktif bisa melihat)
 */
export function useAnnouncements() {
  return useQuery({
    queryKey: announcementKeys.list(),
    queryFn: async (): Promise<Announcement[]> => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw new Error(error.message)
      return (data ?? []) as Announcement[]
    },
    staleTime: 1000 * 30,
  })
}

// ─── Mutations ───────────────────────────────────────────────────────────────

/**
 * Publikasikan pengumuman baru ke tabel announcements
 */
export function usePublishAnnouncement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      judul,
      isi,
      kategori,
      flyerUrl,
      createdBy,
    }: PublishAnnouncementPayload) => {
      const { error } = await supabase.from('announcements').insert({
        judul,
        isi,
        kategori,
        flyer_url: flyerUrl,
        created_by: createdBy,
      })

      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: announcementKeys.all })
    },
  })
}

/**
 * Upload flyer manual ke storage bucket announcement-flyers.
 * Mengembalikan URL publik.
 */
export async function uploadFlyerManual(
  profileId: string,
  file: File
): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'png'
  const filePath = `${profileId}/flyer-${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(FLYER_BUCKET)
    .upload(filePath, file, { upsert: false })

  if (uploadError) throw new Error(`Upload gagal: ${uploadError.message}`)

  const { data } = supabase.storage.from(FLYER_BUCKET).getPublicUrl(filePath)
  return data.publicUrl
}
