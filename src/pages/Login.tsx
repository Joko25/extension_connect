import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Home, Loader2, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { usePublicPerumahan } from '@/hooks/useSettings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const loginSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { signInWithEmail } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)
  const { data: perumahan } = usePublicPerumahan()

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/dashboard'

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data: LoginFormData) {
    setLoginError(null)
    const { error } = await signInWithEmail(data.email, data.password)

    if (error) {
      // Terjemahkan error Supabase ke Bahasa Indonesia
      if (error.message.includes('Invalid login credentials')) {
        setLoginError('Email atau password salah. Silakan coba lagi.')
      } else if (error.message.includes('Email not confirmed')) {
        setLoginError('Email belum diverifikasi. Cek inbox/spam Anda.')
      } else {
        setLoginError('Terjadi kesalahan. Silakan coba beberapa saat lagi.')
      }
      return
    }

    // Navigasi berdasarkan status & role
    // AuthContext + ProtectedRoute yang akan handle redirect ke /status/* jika pending/ditolak
    navigate(from, { replace: true })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 flex items-center justify-center p-4">
      {/* Background pattern */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #cbd5e1 1px, transparent 0)`,
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-slate-50 backdrop-blur-xl border border-slate-200 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl mb-4 backdrop-blur-sm">
              <Home className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">
              {perumahan?.nama || 'Portal RT'}
            </h1>
            <p className="text-blue-100 text-sm mt-1">
              {perumahan?.nama ? perumahan.alamat : 'Manajemen Rukun Tetangga Digital'}
            </p>
          </div>

          {/* Form */}
          <div className="px-8 py-8">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-slate-900">Masuk ke Akun</h2>
              <p className="text-slate-500 text-sm mt-1">
                Gunakan email yang didaftarkan pengurus RT
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-800 text-sm font-medium">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="contoh@email.com"
                  autoComplete="email"
                  className="bg-slate-100 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:ring-blue-400/20 h-11"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-red-600 text-xs">{errors.email.message}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-800 text-sm font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Masukkan password"
                    autoComplete="current-password"
                    className="bg-slate-100 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:ring-blue-400/20 h-11 pr-11"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-600 text-xs">{errors.password.message}</p>
                )}
              </div>

              {/* Lupa password */}
              <div className="flex justify-end -mt-2">
                <Link
                  to="/forgot-password"
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Lupa password?
                </Link>
              </div>

              {/* Error umum */}
              {loginError && (
                <div className="bg-red-500/15 border border-red-500/30 rounded-lg px-4 py-3">
                  <p className="text-red-600 text-sm">{loginError}</p>
                </div>
              )}

              {/* Submit */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium transition-all duration-200 shadow-lg shadow-blue-500/25"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Memverifikasi...
                  </>
                ) : (
                  'Masuk'
                )}
              </Button>
            </form>

            {/* Security note */}
            <div className="mt-6 flex items-center gap-2 text-slate-400 text-xs">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>Akses hanya untuk warga terdaftar. Kontak pengurus RT untuk pendaftaran.</span>
            </div>
          </div>

          <div className="px-8 pb-6 border-t border-slate-200 pt-4">
            <p className="text-center text-sm text-slate-500">
              Belum punya akun?{' '}
              <Link to="/daftar" className="text-blue-600 hover:text-blue-700 font-medium">
                Daftar warga baru
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-500 text-xs mt-6">
          © {new Date().getFullYear()} Portal RT · Powered by Warga Extension
        </p>
      </div>
    </div>
  )
}
