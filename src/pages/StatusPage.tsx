import { Link } from 'react-router-dom'
import { ClockIcon, XCircle, Home, Phone } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'

type StatusType = 'pending' | 'ditolak'

interface StatusPageProps {
  type: StatusType
}

export default function StatusPage({ type }: StatusPageProps) {
  const { profile } = useAuth()

  const config = {
    pending: {
      icon: <ClockIcon className="w-16 h-16 text-amber-500" />,
      bgGradient: 'from-amber-100 via-slate-50 to-slate-100',
      iconBg: 'bg-amber-50 border-amber-200',
      badge: 'bg-amber-500/10 text-amber-700 border-amber-300',
      badgeText: 'Menunggu Verifikasi',
      title: 'Pendaftaran Sedang Diproses',
      description:
        'Pengurus RT sedang memverifikasi data Anda. Proses ini biasanya memerlukan 1–3 hari kerja. Anda akan mendapatkan notifikasi setelah verifikasi selesai.',
      steps: [
        { label: 'Pendaftaran dikirim', done: true },
        { label: 'Verifikasi KTP & KK', done: false },
        { label: 'Konfirmasi Pengurus RT', done: false },
        { label: 'Akses diberikan', done: false },
      ],
      ctaText: null,
    },
    ditolak: {
      icon: <XCircle className="w-16 h-16 text-red-500" />,
      bgGradient: 'from-red-100 via-slate-50 to-slate-100',
      iconBg: 'bg-red-50 border-red-200',
      badge: 'bg-red-500/10 text-red-700 border-red-300',
      badgeText: 'Pendaftaran Ditolak',
      title: 'Akses Tidak Dapat Diberikan',
      description:
        'Maaf, pendaftaran Anda tidak dapat disetujui. Hal ini mungkin karena data yang tidak valid atau tidak sesuai dengan data RT. Silakan hubungi pengurus RT untuk informasi lebih lanjut.',
      steps: null,
      ctaText: 'Hubungi Pengurus RT',
    },
  }

  const c = config[type]

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  return (
    <div
      className={`min-h-screen bg-gradient-to-br ${c.bgGradient} flex items-center justify-center p-4`}
    >
      <div className="w-full max-w-md">
        <div className="bg-slate-50 backdrop-blur-xl border border-slate-200 rounded-2xl shadow-2xl p-8 text-center space-y-6">
          {/* Icon */}
          <div
            className={`inline-flex items-center justify-center w-24 h-24 rounded-full border ${c.iconBg}`}
          >
            {c.icon}
          </div>

          {/* Badge */}
          <span
            className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${c.badge}`}
          >
            {c.badgeText}
          </span>

          {/* Title */}
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-slate-900">{c.title}</h1>
            <p className="text-slate-500 text-sm leading-relaxed">{c.description}</p>
          </div>

          {/* Nama warga */}
          {profile && (
            <div className="bg-slate-50 rounded-xl px-4 py-3 text-left">
              <p className="text-slate-500 text-xs mb-1">Pendaftar</p>
              <p className="text-slate-900 font-medium">{profile.nama_lengkap}</p>
              <p className="text-slate-500 text-sm">NIK: {profile.nik}</p>
            </div>
          )}

          {/* Progress steps (hanya untuk pending) */}
          {c.steps && (
            <div className="text-left space-y-3">
              {c.steps.map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs font-bold
                      ${step.done
                        ? 'bg-green-500 text-white'
                        : 'bg-slate-100 border border-slate-300 text-slate-400'
                      }`}
                  >
                    {step.done ? '✓' : i + 1}
                  </div>
                  <span
                    className={`text-sm ${step.done ? 'text-green-400' : 'text-slate-500'}`}
                  >
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-3 pt-2">
            {c.ctaText && (
              <Button
                className="w-full bg-slate-100 hover:bg-white/20 text-slate-900 border border-slate-300"
                variant="outline"
              >
                <Phone className="w-4 h-4 mr-2" />
                {c.ctaText}
              </Button>
            )}
            <Button
              variant="ghost"
              className="w-full text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              onClick={handleSignOut}
            >
              Keluar dari Akun
            </Button>
          </div>
        </div>

        <p className="text-center text-slate-300 text-xs mt-6">
          © {new Date().getFullYear()} Portal RT · Manajemen Rukun Tetangga
        </p>
      </div>
    </div>
  )
}
