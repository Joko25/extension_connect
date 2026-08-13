import { formatDistanceToNow } from 'date-fns'
import { id } from 'date-fns/locale'
import { MessageSquare, Trash2, Loader2, Download, ImageIcon } from 'lucide-react'
import type { ThreadWithAuthor } from '@/types/database.types'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'

const KATEGORI_LABELS: Record<string, string> = {
  umum: 'Umum',
  informasi: 'Informasi',
  diskusi: 'Diskusi',
  keluhan: 'Keluhan',
  lainnya: 'Lainnya',
}

const KATEGORI_BADGE: Record<string, string> = {
  umum: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  informasi: 'bg-blue-500/15 text-blue-600 border-blue-200',
  diskusi: 'bg-purple-50 text-purple-700 border-purple-200',
  keluhan: 'bg-amber-50 text-amber-700 border-amber-200',
  lainnya: 'bg-emerald-50 text-emerald-700 border-emerald-200',
}

export interface ThreadCardProps {
  thread: ThreadWithAuthor
  isOwner: boolean
  isDeleting?: boolean
  onDelete?: (threadId: string) => void
}

/**
 * Kartu postingan thread warga
 */
export default function ThreadCard({
  thread,
  isOwner,
  isDeleting = false,
  onDelete,
}: ThreadCardProps) {
  const kategori = thread.kategori || 'umum'
  const kategoriLabel = KATEGORI_LABELS[kategori] ?? 'Umum'
  const badgeClass = KATEGORI_BADGE[kategori] ?? KATEGORI_BADGE.umum

  const inisial = (thread.author?.nama_lengkap ?? '?')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

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

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
        <span className="text-slate-400 text-xs inline-flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5" />
          Thread Warga
        </span>

        {isOwner && (
          <Button
            variant="ghost"
            size="sm"
            disabled={isDeleting}
            onClick={() => onDelete?.(thread.id)}
            className="text-slate-500 hover:text-red-700 hover:bg-red-500/10 text-xs gap-1.5"
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
    </article>
  )
}
