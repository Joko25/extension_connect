import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import {
  Wallet, FileText, MessageSquare, Cctv, UserRound, BadgeCheck, Landmark,
  Users, UserCheck, Megaphone, ChevronRight, Settings, Sparkles,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useThreads } from '@/hooks/useThreads'
import { usePublicPerumahan } from '@/hooks/useSettings'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import type { Role } from '@/types/database.types'

const ROLE_LABELS: Record<Role, string> = {
  warga: 'Warga',
  bendahara: 'Bendahara',
  sekretaris: 'Sekretaris',
  humas: 'Humas',
  ketua_rt: 'Ketua RT',
}

const ROLE_BADGE: Record<Role, string> = {
  warga: 'bg-slate-100 text-slate-600 border-slate-300',
  bendahara: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  sekretaris: 'bg-blue-50 text-blue-700 border-blue-200',
  humas: 'bg-purple-50 text-purple-700 border-purple-200',
  ketua_rt: 'bg-amber-50 text-amber-700 border-amber-200',
}

interface Feature {
  to: string
  label: string
  desc: string
  icon: React.ReactNode
  color: string
  roles?: Role[]
}

const FEATURES: Feature[] = [
  { to: '/bayar-iuran', label: 'Bayar Iuran', desc: 'Upload bukti iuran bulanan', icon: <BadgeCheck className="w-5 h-5" />, color: 'bg-blue-500/15 text-blue-600' },
  { to: '/surat', label: 'Request Surat', desc: 'Ajukan surat keterangan', icon: <FileText className="w-5 h-5" />, color: 'bg-indigo-500/15 text-indigo-600' },
  { to: '/threads', label: 'Thread Warga', desc: 'Diskusi & info warga', icon: <MessageSquare className="w-5 h-5" />, color: 'bg-purple-500/15 text-purple-600' },
  { to: '/cashflow', label: 'Cashflow Warga', desc: 'Cek status iuran warga', icon: <Wallet className="w-5 h-5" />, color: 'bg-emerald-500/15 text-emerald-600' },
  { to: '/cctv', label: 'Pantau CCTV', desc: 'Pemantauan lingkungan', icon: <Cctv className="w-5 h-5" />, color: 'bg-rose-500/15 text-rose-600' },
  { to: '/profile', label: 'Profil Saya', desc: 'Kelola data & dokumen', icon: <UserRound className="w-5 h-5" />, color: 'bg-slate-500/15 text-slate-600' },
  { to: '/bendahara/iuran', label: 'Review Iuran', desc: 'Verifikasi pembayaran', icon: <BadgeCheck className="w-5 h-5" />, color: 'bg-blue-500/15 text-blue-600', roles: ['bendahara', 'ketua_rt'] },
  { to: '/kas', label: 'Kelola Kas', desc: 'Atur pemasukan & pengeluaran', icon: <Landmark className="w-5 h-5" />, color: 'bg-emerald-500/15 text-emerald-600', roles: ['bendahara', 'ketua_rt'] },
  { to: '/konfigurasi', label: 'Konfigurasi', desc: 'Pengaturan aplikasi', icon: <Settings className="w-5 h-5" />, color: 'bg-slate-500/15 text-slate-600', roles: ['bendahara', 'ketua_rt'] },
  { to: '/admin/warga', label: 'Master Data Warga', desc: 'Kelola data warga', icon: <Users className="w-5 h-5" />, color: 'bg-cyan-500/15 text-cyan-600', roles: ['sekretaris', 'ketua_rt'] },
  { to: '/admin/verifikasi', label: 'Verifikasi Warga', desc: 'Persetujuan pendaftaran', icon: <UserCheck className="w-5 h-5" />, color: 'bg-amber-500/15 text-amber-600', roles: ['sekretaris', 'ketua_rt'] },
  { to: '/humas/pengumuman', label: 'Pengumuman', desc: 'Kelola info & flyer', icon: <Megaphone className="w-5 h-5" />, color: 'bg-fuchsia-500/15 text-fuchsia-600', roles: ['humas', 'ketua_rt'] },
]

export default function Dashboard() {
  const { profile } = useAuth()
  const { data: perumahan } = usePublicPerumahan()
  const { data: threads = [], isLoading: loadingThreads } = useThreads()

  const role = profile?.role
  const visibleFeatures = FEATURES.filter(
    (f) => !f.roles || (role ? f.roles.includes(role) : false)
  )

  const inisial = profile?.nama_lengkap
    ?.split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const today = format(new Date(), 'EEEE, d MMMM yyyy', { locale: id })

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Hero / Welcome */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-700 p-6 sm:p-8 text-white">
          <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/10 rounded-full" />
          <div className="absolute right-16 bottom-0 w-24 h-24 bg-white/10 rounded-full" />

          <div className="relative flex items-center gap-4">
            <Avatar className="w-16 h-16 border-2 border-white/40 bg-white/20">
              <AvatarFallback className="bg-white/20 text-white text-lg font-bold">
                {inisial ?? 'W'}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-blue-100 text-sm">{today}</p>
              <h1 className="text-2xl font-bold truncate">
                Hai, {profile?.nama_lengkap ?? 'Warga'}!
              </h1>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {perumahan?.nama && (
                  <span className="text-blue-100 text-sm inline-flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    {perumahan.nama}
                  </span>
                )}
                <Badge
                  variant="outline"
                  className={`px-2.5 py-0.5 text-[11px] font-medium border-0 ${role ? ROLE_BADGE[role] : ''}`}
                >
                  {role ? ROLE_LABELS[role] : '—'}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Fitur yang tersedia */}
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Apa yang bisa Anda lakukan?</h2>
            <p className="text-slate-500 text-xs">Fitur yang tersedia untuk Anda berdasarkan peran</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {visibleFeatures.map((f) => (
              <Link
                key={f.to}
                to={f.to}
                className="group bg-white border border-slate-200 rounded-2xl p-4 transition-all hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/5"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${f.color}`}>
                  {f.icon}
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-900 flex items-center gap-1">
                  {f.label}
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                </p>
                <p className="text-xs text-slate-500 mt-0.5">{f.desc}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Thread Warga */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Thread Warga Terbaru</h2>
              <p className="text-slate-500 text-xs">Diskusi & informasi terbaru dari warga</p>
            </div>
            <Link
              to="/threads"
              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Lihat semua <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="space-y-3">
            {loadingThreads ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-9 h-9 rounded-full bg-slate-100" />
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="h-3.5 w-32 bg-slate-100" />
                      <Skeleton className="h-3 w-20 bg-slate-50" />
                    </div>
                  </div>
                  <Skeleton className="h-3 w-full bg-slate-50" />
                </div>
              ))
            ) : threads.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
                <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">Belum ada thread</p>
                <p className="text-slate-300 text-xs mt-1">
                  Jadilah warga pertama yang membuat postingan di{' '}
                  <Link to="/threads" className="text-blue-600 hover:underline">Thread Warga</Link>
                </p>
              </div>
            ) : (
              threads.slice(0, 3).map((t) => {
                const tInisial = (t.author?.nama_lengkap ?? '?')
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()
                return (
                  <Link
                    key={t.id}
                    to="/threads"
                    className="block bg-white border border-slate-200 rounded-2xl p-4 transition-all hover:border-blue-300 hover:shadow-md"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="w-9 h-9 border border-slate-200 bg-blue-600/30">
                        <AvatarFallback className="bg-blue-600/30 text-blue-200 text-xs font-bold">
                          {tInisial}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {t.author?.nama_lengkap ?? 'Warga'}
                        </p>
                        <p className="text-xs text-slate-400">
                          {format(new Date(t.created_at), 'dd MMM yyyy', { locale: id })} ·{' '}
                          {(t.likes ?? []).length} suka · {(t.comments ?? []).length} komentar
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-slate-700 mt-3 line-clamp-2">{t.konten}</p>
                  </Link>
                )
              })
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
