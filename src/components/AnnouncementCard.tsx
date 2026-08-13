import { Download, Megaphone } from 'lucide-react'
import type { Announcement } from '@/types/database.types'
import { Button } from '@/components/ui/button'

const KATEGORI_LABELS: Record<string, string> = {
  umum: 'Umum',
  keamanan: 'Keamanan',
  kebersihan: 'Kebersihan',
  acara: 'Acara',
  lainnya: 'Lainnya',
}

const KATEGORI_BADGE: Record<string, string> = {
  umum: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  keamanan: 'bg-red-50 text-red-700 border-red-200',
  kebersihan: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  acara: 'bg-purple-50 text-purple-700 border-purple-200',
  lainnya: 'bg-amber-50 text-amber-700 border-amber-200',
}

export interface AnnouncementCardProps {
  announcement: Announcement
}

/**
 * Card pengumuman untuk warga — menampilkan flyer, judul, kategori,
 * dan tombol "Download Flyer".
 */
export default function AnnouncementCard({ announcement }: AnnouncementCardProps) {
  const kategori = announcement.kategori || 'umum'
  const kategoriLabel = KATEGORI_LABELS[kategori] ?? 'Umum'
  const badgeClass = KATEGORI_BADGE[kategori] ?? KATEGORI_BADGE.umum

  function handleDownload() {
    if (!announcement.flyer_url) return
    const a = document.createElement('a')
    a.href = announcement.flyer_url
    a.download = `flyer-${announcement.judul.replace(/\s+/g, '-').toLowerCase()}.png`
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    a.click()
  }

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white flex flex-col">
      {/* Flyer */}
      {announcement.flyer_url ? (
        <div className="relative aspect-[4/3] bg-slate-50">
          <img
            src={announcement.flyer_url}
            alt={announcement.judul}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="aspect-[4/3] bg-white flex flex-col items-center justify-center gap-2">
          <Megaphone className="w-10 h-10 text-slate-300" />
          <p className="text-slate-400 text-xs">Tidak ada flyer</p>
        </div>
      )}

      {/* Konten */}
      <div className="p-5 flex flex-col flex-1">
        <span
          className={`inline-flex self-start items-center px-2 py-0.5 rounded-full text-xs font-medium border ${badgeClass}`}
        >
          {kategoriLabel}
        </span>

        <h3 className="text-base font-semibold text-slate-900 mt-3 leading-snug">
          {announcement.judul}
        </h3>

        <p className="text-slate-500 text-sm mt-1.5 line-clamp-3 leading-relaxed">
          {announcement.isi}
        </p>

        <div className="pt-4 border-t border-slate-200 mt-auto flex items-center justify-between gap-3">
          <span className="text-slate-500 text-xs">
            {new Date(announcement.created_at).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </span>

          {announcement.flyer_url && (
            <Button
              size="sm"
              onClick={handleDownload}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Download Flyer
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
