import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Home, Loader2, MailCheck, ArrowLeft, Mail } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { usePublicPerumahan } from '@/hooks/useSettings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const schema = z.object({
  email: z.string().email('Format email tidak valid'),
})
type FormData = z.infer<typeof schema>

export default function ForgotPassword() {
  const { sendPasswordReset } = useAuth()
  const { data: perumahan } = usePublicPerumahan()
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    setError(null)
    const { error } = await sendPasswordReset(data.email)
    if (error) {
      setError('Gagal mengirim link. Pastikan email terdaftar dan coba lagi.')
      return
    }
    setSent(true)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #cbd5e1 1px, transparent 0)`,
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative w-full max-w-md">
        <div className="bg-slate-50 backdrop-blur-xl border border-slate-200 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-7 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl mb-4 backdrop-blur-sm">
              <Home className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">
              {perumahan?.nama || 'Portal RT'}
            </h1>
            <p className="text-blue-100 text-sm mt-1">Reset kata sandi akun Anda</p>
          </div>

          {/* Body */}
          <div className="px-8 py-8">
            {sent ? (
              <div className="text-center space-y-3 py-4">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500/15 rounded-full">
                  <MailCheck className="w-8 h-8 text-emerald-600" />
                </div>
                <h2 className="text-lg font-semibold text-slate-900">Cek email Anda</h2>
                <p className="text-slate-500 text-sm">
                  Jika email terdaftar, kami telah mengirimkan link untuk mereset kata sandi.
                  Periksa inbox atau folder spam Anda.
                </p>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-medium text-sm mt-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Kembali ke halaman masuk
                </Link>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-slate-900">Lupa kata sandi?</h2>
                  <p className="text-slate-500 text-sm mt-1">
                    Masukkan email yang terdaftar untuk menerima link reset.
                  </p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-slate-800 text-sm font-medium">
                      Email
                    </Label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="contoh@email.com"
                        autoComplete="email"
                        className="bg-slate-100 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:ring-blue-400/20 h-11 pl-9"
                        {...register('email')}
                      />
                    </div>
                    {errors.email && (
                      <p className="text-red-600 text-xs">{errors.email.message}</p>
                    )}
                  </div>

                  {error && (
                    <div className="bg-red-500/15 border border-red-500/30 rounded-lg px-4 py-3">
                      <p className="text-red-600 text-sm">{error}</p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium transition-all duration-200 shadow-lg shadow-blue-500/25"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Mengirim link...
                      </>
                    ) : (
                      'Kirim Link Reset'
                    )}
                  </Button>
                </form>

                <div className="mt-6 text-center">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-medium text-sm"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Kembali ke halaman masuk
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>

        <p className="text-center text-slate-500 text-xs mt-6">
          © {new Date().getFullYear()} Portal RT · Powered by Warga Extension
        </p>
      </div>
    </div>
  )
}
