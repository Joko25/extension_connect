import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { ThreadWithAuthor } from '@/types/database.types'

export const THREAD_ATTACHMENT_BUCKET = 'thread-attachments'
export const MAX_THREAD_IMAGE_SIZE = 5 * 1024 * 1024 // 5 MB

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const threadKeys = {
  all: ['threads'] as const,
  list: () => [...threadKeys.all, 'list'] as const,
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CreateThreadPayload {
  authorId: string
  konten: string
  kategori: string
  file?: File | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Validasi file lampiran thread (hanya gambar, maks 5MB)
 * Mengembalikan pesan error, atau null jika valid.
 */
export function validateThreadImage(file: File): string | null {
  if (!file.type.startsWith('image/')) {
    return 'Hanya file gambar yang diizinkan.'
  }
  if (file.size > MAX_THREAD_IMAGE_SIZE) {
    return 'Ukuran gambar maksimal 5 MB.'
  }
  return null
}

/**
 * Upload gambar lampiran thread ke storage, kembalikan URL publik + nama file
 */
export async function uploadThreadImage(
  authorId: string,
  file: File
): Promise<{ url: string; name: string }> {
  const ext = file.name.split('.').pop() ?? 'png'
  const path = `${authorId}/thread-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

  const { error } = await supabase.storage
    .from(THREAD_ATTACHMENT_BUCKET)
    .upload(path, file, { upsert: false })

  if (error) throw new Error(`Upload gagal: ${error.message}`)

  const { data } = supabase.storage.from(THREAD_ATTACHMENT_BUCKET).getPublicUrl(path)
  return { url: data.publicUrl, name: file.name }
}

// ─── Queries ─────────────────────────────────────────────────────────────────

/**
 * Semua thread warga (terbaru di atas), beserta data penulis
 */
export function useThreads() {
  return useQuery({
    queryKey: threadKeys.list(),
    queryFn: async (): Promise<ThreadWithAuthor[]> => {
      const { data, error } = await supabase
        .from('threads')
        .select(`
          *,
          author:profiles!threads_author_id_fkey (
            nama_lengkap,
            no_hp
          ),
          likes:thread_likes (
            profile_id
          ),
          comments:thread_comments (
            id,
            thread_id,
            author_id,
            konten,
            created_at,
            author:profiles!thread_comments_author_id_fkey (
              nama_lengkap
            )
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw new Error(error.message)

      // Normalisasi komentar: kosongkan jika array kosong
      const normalized = (data ?? []).map((t) => ({
        ...t,
        likes: t.likes ?? [],
        comments: t.comments ?? [],
      }))
      return normalized as ThreadWithAuthor[]
    },
    staleTime: 1000 * 20,
  })
}

// ─── Mutations ───────────────────────────────────────────────────────────────

/**
 * Buat postingan thread baru, dengan opsional lampiran gambar
 */
export function useCreateThread() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ authorId, konten, kategori, file }: CreateThreadPayload) => {
      let fileUrl: string | null = null
      let fileName: string | null = null

      if (file) {
        const err = validateThreadImage(file)
        if (err) throw new Error(err)
        const uploaded = await uploadThreadImage(authorId, file)
        fileUrl = uploaded.url
        fileName = uploaded.name
      }

      const { error } = await supabase.from('threads').insert({
        author_id: authorId,
        konten,
        kategori,
        file_url: fileUrl,
        file_name: fileName,
      })

      if (error) {
        // Rollback: hapus file yang sudah diupload
        if (fileUrl) {
          const path = fileUrl.split('/').pop()
          if (path) await supabase.storage.from(THREAD_ATTACHMENT_BUCKET).remove([`${authorId}/${path}`])
        }
        throw new Error(error.message)
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: threadKeys.all })
    },
  })
}

/**
 * Toggle like pada thread (like jika belum, batalkan jika sudah)
 */
export function useToggleLike() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ threadId, profileId }: { threadId: string; profileId: string }) => {
      // Cek apakah sudah like
      const { data: existing } = await supabase
        .from('thread_likes')
        .select('thread_id')
        .eq('thread_id', threadId)
        .eq('profile_id', profileId)
        .maybeSingle()

      if (existing) {
        const { error } = await supabase
          .from('thread_likes')
          .delete()
          .eq('thread_id', threadId)
          .eq('profile_id', profileId)
        if (error) throw new Error(error.message)
      } else {
        const { error } = await supabase
          .from('thread_likes')
          .insert({ thread_id: threadId, profile_id: profileId })
        if (error) throw new Error(error.message)
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: threadKeys.all })
    },
  })
}

/**
 * Tambah komentar pada thread
 */
export function useAddComment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      threadId,
      authorId,
      konten,
    }: {
      threadId: string
      authorId: string
      konten: string
    }) => {
      const { error } = await supabase
        .from('thread_comments')
        .insert({ thread_id: threadId, author_id: authorId, konten })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: threadKeys.all })
    },
  })
}

/**
 * Hapus komentar milik sendiri
 */
export function useDeleteComment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ commentId }: { commentId: string }) => {
      const { error } = await supabase.from('thread_comments').delete().eq('id', commentId)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: threadKeys.all })
    },
  })
}
export function useDeleteThread() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ threadId }: { threadId: string }) => {
      const { error } = await supabase.from('threads').delete().eq('id', threadId)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: threadKeys.all })
    },
  })
}
