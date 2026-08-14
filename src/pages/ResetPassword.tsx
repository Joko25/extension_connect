import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Home, Loader2, Eye, EyeOff, KeyRound, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/hooks/useToast'

const schema = z
  .object({
    password: z.string().min(6, 'Password minimal 6 karakter'),
    konfirmasi: z.string().min(6, 'Konfirmasi password minimal 6 karakter'),
  })
  .refine((d) => d.password === d.konfirmasi, {
    message: 'Konfirmasi password tidak cocok',
    path: ['konfirmasi'],
  })
type FormData = z.infer<typeof schema>

export default function ResetPassword() {
  const navigate = useNavigate()
  const { updatePassword } = useAuth()
  const [checking, setChecking] = useState(true)
  const [ready, setReady] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      if (data.session) setReady(true)
      setChecking(false)
    })

    // Link reset (PASSWORD_RECOVERY) diproses otomatis oleh supabase-js
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (active && event === 'PASSWORD_RECOVERY') {
        setReady(true)
        setChecking(false)
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  async function onSubmit(data: FormData) {
    const { error } = await updatePassword(data.password)
    if (error) {
      toast({
        title: 'Gagal mengubah password',
        description: error.message,
        variant: 'destructive',
      })
      return
    }
    await supabase.auth.signOut()
    toast({ title: 'Password berhasil diubah', description: 'Silakan masuk dengan password baru.' })
    navigate('/login', { replace: true })
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
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-7 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl mb-4 backdrop-blur-sm">
              <Home className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Buat Kata Sandi Baru</h1>
            <p className="text-blue-100 text-sm mt-1">Portal RT</p>
          </div>

          <div className="px-8 py-8">
            {checking ? (
              <div className="text-center py-8 space-y-3">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                <p className="text-slate-500 text-sm">Memverifikasi link...</p>
              </div>
            ) : !ready ? (
              <div className="text-center space-y-3 py-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500/15 rounded-full">
                  <KeyRound className="w-8 h-8 text-red-500" />
                </div>
                <h2 className="text-lg font-semibold text-slate-900">Link tidak valid</h2>
                <p className="text-slate-500 text-sm">
                  Link reset tidak valid atau sudah kedaluwarsa. Silakan minta link baru.
                </p>
                <Link
                  to="/forgot-password"
                  className="inline-block mt-2 text-blue-600 hover:text-blue-700 font-medium text-sm"
                >
                  Minta link reset baru
                </Link>
              </div>
            ) : (
              <>
                <div className="mb-6 flex items-center gap-2 text-emerald-600">
                  <CheckCircle2 className="w-5 h-5" />
                  <p className="text-sm">Link terverifikasi. Buat kata sandi baru.</p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-slate-800 text-sm font-medium">
                      Kata Sandi Baru
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Minimal 6 karakter"
                        autoComplete="new-password"
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

                  <div className="space-y-2">
                    <Label htmlFor="konfirmasi" className="text-slate-800 text-sm font-medium">
                      Konfirmasi Kata Sandi
                    </Label>
                    <Input
                      id="konfirmasi"
                      type="password"
                      placeholder="Ulangi kata sandi baru"
                      autoComplete="new-password"
                      className="bg-slate-100 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:ring-blue-400/20 h-11"
                      {...register('konfirmasi')}
                    />
                    {errors.konfirmasi && (
                      <p className="text-red-600 text-xs">{errors.konfirmasi.message}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium transition-all duration-200 shadow-lg shadow-blue-500/25"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Menyimpan...
                      </>
                    ) : (
                      'Simpan Kata Sandi'
                    )}
                  </Button>
                </form>
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
