import { ArrowLeft, Megaphone } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAnnouncements } from '@/hooks/useAnnouncements'
import AnnouncementCard from '@/components/AnnouncementCard'
import { Skeleton } from '@/components/ui/skeleton'

export default function Pengumuman() {
  const { data: list = [], isLoading } = useAnnouncements()

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 sm:py-5">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <Link to="/dashboard" className="text-slate-500 hover:text-slate-900 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <Megaphone className="w-4 h-4 text-purple-600" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900">Pengumuman</h1>
          </div>
          <p className="text-slate-500 text-sm ml-11">
            Informasi dan kegiatan terbaru untuk warga RT
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <Skeleton className="w-full aspect-[4/3] bg-slate-50" />
                <div className="p-5 space-y-3">
                  <Skeleton className="h-5 w-20 rounded-full bg-slate-100" />
                  <Skeleton className="h-4 w-3/4 bg-slate-100" />
                  <Skeleton className="h-3 w-full bg-slate-50" />
                  <Skeleton className="h-3 w-2/3 bg-slate-50" />
                </div>
              </div>
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className="text-center py-24">
            <Megaphone className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-400">Belum ada pengumuman</p>
            <p className="text-slate-300 text-sm mt-1">Pengurus RT akan segera menginformasikan kegiatan</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {list.map((announcement) => (
              <AnnouncementCard key={announcement.id} announcement={announcement} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
