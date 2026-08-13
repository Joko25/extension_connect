import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { id } from 'date-fns/locale'
import {
  MessageSquare, Trash2, Loader2, Download, ImageIcon, ThumbsUp, Send,
} from 'lucide-react'
import type { ThreadWithAuthor } from '@/types/database.types'
import { useToggleLike, useAddComment, useDeleteComment } from '@/hooks/useThreads'
import { toast } from '@/hooks/useToast'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const KATEGORI_LABELS: Record<string, string> = {
  umum: 'Umum',
  informasi: 'Informasi',
  diskusi: 'Diskusi',
  keluhan: 'Keluhan',
  lainnya: 'Lainnya',
}

const KATEGORI_BADGE: Record<string, string> = {
  umum: 'bg-slate-100 text-slate-700 border-slate-300',
  informasi: 'bg-blue-100 text-blue-700 border-blue-300',
  diskusi: 'bg-purple-100 text-purple-700 border-purple-300',
  keluhan: 'bg-red-100 text-red-700 border-red-300',
  lainnya: 'bg-emerald-100 text-emerald-700 border-emerald-300',
}

export interface ThreadCardProps {
  thread: ThreadWithAuthor
  myProfileId?: string
  isOwner: boolean
  isDeleting?: boolean
  onDelete?: (threadId: string) => void
}

/**
 * Kartu postingan thread warga, dengan like & komentar
 */
export default function ThreadCard({
  thread,
  myProfileId,
  isOwner,
  isDeleting = false,
  onDelete,
}: ThreadCardProps) {
  const kategori = thread.kategori || 'umum'
  const kategoriLabel = KATEGORI_LABELS[kategori] ?? 'Umum'
  const badgeClass = KATEGORI_BADGE[kategori] ?? KATEGORI_BADGE.umum

  const [showComments, setShowComments] = useState(false)
  const [commentText, setCommentText] = useState('')

  const toggleLike = useToggleLike()
  const addComment = useAddComment()
  const deleteComment = useDeleteComment()

  const likes = thread.likes ?? []
  const comments = thread.comments ?? []
  const likeCount = likes.length
  const likedByMe = myProfileId ? likes.some((l) => l.profile_id === myProfileId) : false
  const likePending = toggleLike.isPending && toggleLike.variables?.threadId === thread.id
  const commentPending = addComment.isPending && addComment.variables?.threadId === thread.id

  const inisial = (thread.author?.nama_lengkap ?? '?')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  async function handleToggleLike() {
    if (!myProfileId) return
    try {
      await toggleLike.mutateAsync({ threadId: thread.id, profileId: myProfileId })
    } catch (err) {
      toast({
        title: 'Gagal',
        description: err instanceof Error ? err.message : 'Terjadi kesalahan',
        variant: 'destructive',
      })
    }
  }

  async function handleAddComment() {
    if (!myProfileId) return
    const text = commentText.trim()
    if (!text) {
      toast({ title: 'Komentar kosong', variant: 'destructive' })
      return
    }
    try {
      await addComment.mutateAsync({ threadId: thread.id, authorId: myProfileId, konten: text })
      setCommentText('')
    } catch (err) {
      toast({
        title: 'Gagal berkomentar',
        description: err instanceof Error ? err.message : 'Terjadi kesalahan',
        variant: 'destructive',
      })
    }
  }

  function handleDeleteComment(commentId: string) {
    deleteComment.mutate({ commentId }, {
      onSuccess: () => toast({ title: 'Komentar dihapus' }),
      onError: (err) =>
        toast({
          title: 'Gagal menghapus komentar',
          description: err instanceof Error ? err.message : 'Terjadi kesalahan',
          variant: 'destructive',
        }),
    })
  }

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="w-10 h-10 shrink-0 border border-slate-200 bg-blue-600/30">
            <AvatarFallback className="bg-blue-600/30 text-blue-200 text-xs font-bold">
              {inisial}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-slate-900 font-semibold text-sm truncate">
              {thread.author?.nama_lengkap ?? 'Warga'}
            </p>
            <p className="text-slate-500 text-xs">
              {formatDistanceToNow(new Date(thread.created_at), { addSuffix: true, locale: id })}
            </p>
          </div>
        </div>

        <span
          className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${badgeClass}`}
        >
          {kategoriLabel}
        </span>
      </div>

      {/* Konten */}
      <p className="text-slate-800 text-sm leading-relaxed mt-4 whitespace-pre-wrap break-words">
        {thread.konten}
      </p>

      {/* Lampiran gambar */}
      {thread.file_url && (
        <div className="mt-4">
          <a
            href={thread.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block group rounded-xl overflow-hidden border border-slate-200 bg-slate-50"
          >
            <img
              src={thread.file_url}
              alt={thread.file_name ?? 'Lampiran'}
              loading="lazy"
              className="w-full max-h-80 object-cover"
            />
            <div className="flex items-center justify-between px-3 py-2 bg-white/80">
              <span className="inline-flex items-center gap-1.5 text-slate-500 text-xs truncate">
                <ImageIcon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{thread.file_name ?? 'Gambar'}</span>
              </span>
              <span className="inline-flex items-center gap-1 text-blue-600 text-xs font-medium shrink-0 group-hover:text-blue-700">
                <Download className="w-3.5 h-3.5" />
                Unduh
              </span>
            </div>
          </a>
        </div>
      )}

      {/* Aksi: like & komentar */}
      <div className="mt-4 pt-3 border-t border-slate-200 flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          disabled={!myProfileId || likePending}
          onClick={handleToggleLike}
          className={`gap-1.5 text-xs ${
            likedByMe
              ? 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          {likePending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ThumbsUp className={`w-4 h-4 ${likedByMe ? 'fill-current' : ''}`} />
          )}
          Suka{likeCount > 0 ? ` (${likeCount})` : ''}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowComments((v) => !v)}
          className="gap-1.5 text-xs text-slate-500 hover:text-slate-900 hover:bg-slate-50"
        >
          <MessageSquare className="w-4 h-4" />
          Komentar{comments.length > 0 ? ` (${comments.length})` : ''}
        </Button>

        {isOwner && (
          <Button
            variant="ghost"
            size="sm"
            disabled={isDeleting}
            onClick={() => onDelete?.(thread.id)}
            className="ml-auto text-slate-500 hover:text-red-700 hover:bg-red-500/10 text-xs gap-1.5"
          >
            {isDeleting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
            Hapus
          </Button>
        )}
      </div>

      {/* Bagian komentar */}
      {showComments && (
        <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
          <div className="space-y-2.5">
            {comments.length === 0 ? (
              <p className="text-slate-400 text-xs">Belum ada komentar.</p>
            ) : (
              comments.map((c) => {
                const cInisial = (c.author?.nama_lengkap ?? '?')
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()
                const isCommentOwner = myProfileId === c.author_id
                return (
                  <div key={c.id} className="flex items-start gap-2.5">
                    <Avatar className="w-7 h-7 shrink-0 border border-slate-200 bg-blue-600/30">
                      <AvatarFallback className="bg-blue-600/30 text-blue-200 text-[10px] font-bold">
                        {cInisial}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold text-slate-800">
                          {c.author?.nama_lengkap ?? 'Warga'}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: id })}
                        </p>
                      </div>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap break-words mt-0.5">
                        {c.konten}
                      </p>
                    </div>
                    {isCommentOwner && (
                      <button
                        onClick={() => handleDeleteComment(c.id)}
                        className="text-slate-300 hover:text-red-600 p-1 shrink-0 transition-colors"
                        aria-label="Hapus komentar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {/* Input komentar */}
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              handleAddComment()
            }}
          >
            <Input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Tulis komentar..."
              disabled={!myProfileId || commentPending}
              className="h-9 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-500/50 text-sm"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!myProfileId || commentPending}
              className="bg-blue-600 hover:bg-blue-500 text-white h-9 w-9 shrink-0"
              aria-label="Kirim komentar"
            >
              {commentPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </form>
        </div>
      )}
    </article>
  )
}
