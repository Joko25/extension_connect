import { useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, FileText, ImagePlus, Loader2, UserPlus, ShieldCheck, X } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { toast } from '@/hooks/useToast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  BLOK_RUMAH_LIST, BLOK_RUMAH_RANGE, isValidBlokRumah, isValidNoRumah,
  type BlokRumah,
} from '@/lib/blokRumah'

const daftarSchema = z
  .object({
    nama_lengkap: z.string().min(3, 'Nama lengkap minimal 3 karakter'),
    nik: z.string().regex(/^\d{16}$/, 'NIK harus 16 digit angka'),
    no_kk: z.string().min(6, 'Nomor KK wajib diisi'),
    no_hp: z.string().regex(/^08\d{8,12}$/, 'Format nomor HP tidak valid (08...)'),
    blok_rumah: z.string().min(1, 'Blok rumah wajib diisi'),
    no_rumah: z.string().min(1, 'Nomor rumah wajib diisi'),
    status_tinggal: z.enum(['tetap', 'kontrak']),
    email: z.string().email('Format email tidak valid'),
    password: z.string().min(6, 'Password minimal 6 karakter'),
    konfirmasi_password: z.string().min(6, 'Konfirmasi password wajib diisi'),
  })
  .superRefine((data, ctx) => {
    const blok = data.blok_rumah.toUpperCase()
    if (!isValidBlokRumah(blok)) {
      ctx.addIssue({
        code: 'custom',
        path: ['blok_rumah'],
        message: 'Blok rumah hanya HA atau HB',
      })
      return
    }
    if (!isValidNoRumah(blok, data.no_rumah)) {
      const r = BLOK_RUMAH_RANGE[blok as BlokRumah]
      ctx.addIssue({
        code: 'custom',
        path: ['no_rumah'],
        message: `Nomor rumah blok ${blok} berkisar ${r.min}-${r.max}`,
      })
    }
  })
  .refine((d) => d.password === d.konfirmasi_password, {
    message: 'Password tidak sama',
    path: ['konfirmasi_password'],
  })

type DaftarFormData = z.infer<typeof daftarSchema>

function FileField({
  label,
  icon,
  file,
  onChange,
  inputId,
}: {
  label: string
  icon: React.ReactNode
  file: File | null
  onChange: (f: File | null) => void
  inputId: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={`w-full border-2 border-dashed rounded-xl px-3 py-4 text-left transition-colors ${
          file
            ? 'border-emerald-300 bg-emerald-50'
            : 'border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50'
        }`}
      >
        {file ? (
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
              <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(0)} KB</p>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(null); if (inputRef.current) inputRef.current.value = '' }}
              className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50"
              aria-label={`Hapus ${label}`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-blue-500">{icon}</span>
            <div>
              <p className="text-sm font-medium text-slate-700">{label}</p>
              <p className="text-xs text-slate-400">Ketuk untuk unggah</p>
            </div>
          </div>
        )}
      </button>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
    </div>
  )
}

export default function Daftar() {
  const navigate = useNavigate()
  const { signUpWithEmail } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [daftarError, setDaftarError] = useState<string | null>(null)
  const [confirmMode, setConfirmMode] = useState(false)
  const [ktpFile, setKtpFile] = useState<File | null>(null)
  const [kkFile, setKkFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)

  const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB

  function validateFile(file: File | null): string | null {
    if (!file) return null
    if (file.size > MAX_FILE_SIZE) return 'Ukuran file maksimal 5 MB'
    if (!/^(image\/(jpeg|png|webp)|application\/pdf)$/.test(file.type)) {
      return 'Format harus JPG, PNG, atau PDF'
    }
    return null
  }

  async function uploadDocs(userId: string, ktp: File | null, kk: File | null) {
    const updates: Record<string, string> = {}

    const uploadOne = async (file: File, type: 'ktp' | 'kk') => {
      const ext = file.name.split('.').pop()
      const path = `${userId}/${type}-${Date.now()}.${ext}`
      const { error } = await supabase.storage
        .from('ktp-kk-docs')
        .upload(path, file, { upsert: false })
      if (error) throw new Error(`Gagal mengunggah ${type === 'ktp' ? 'KTP' : 'KK'}: ${error.message}`)
      updates[type === 'ktp' ? 'ktp_url' : 'kk_url'] = path
    }

    if (ktp) await uploadOne(ktp, 'ktp')
    if (kk) await uploadOne(kk, 'kk')

    if (Object.keys(updates).length > 0) {
      await supabase.from('profiles').update(updates).eq('user_id', userId)
    }
  }

  async function ensureProfile(
    userId: string,
    data: { nama: string; nik: string; noKk: string; noHp: string }
  ) {
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()

    if (existing) return existing.id

    // Trigger on_auth_user_created mungkin belum dibuat di DB → buat profil sendiri
    const { data: created, error } = await supabase
      .from('profiles')
      .insert({
        user_id: userId,
        nama_lengkap: data.nama,
        nik: data.nik,
        no_kk: data.noKk,
        no_hp: data.noHp,
        role: 'warga',
        status_warga: 'pending',
      })
      .select('id')
      .single()

    if (error) throw new Error(`Gagal membuat profil: ${error.message}`)
    return created.id
  }

  async function linkRumah(blokRumah: string, noRumah: string, statusTinggal: 'tetap' | 'kontrak') {
    const { error } = await supabase.rpc('daftar_rumah', {
      p_blok_rumah: blokRumah,
      p_no_rumah: noRumah,
      p_status_tinggal: statusTinggal,
    })
    return { error }
  }

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<DaftarFormData>({
    resolver: zodResolver(daftarSchema),
    defaultValues: { status_tinggal: 'tetap' },
  })

  const statusTinggal = watch('status_tinggal')
  const blokRumah = watch('blok_rumah')

  async function onSubmit(data: DaftarFormData) {
    setDaftarError(null)
    setFileError(null)

    const ktpErr = validateFile(ktpFile)
    const kkErr = validateFile(kkFile)
    if (ktpErr || kkErr) {
      setFileError(ktpErr || kkErr)
      return
    }

    const { error, session } = await signUpWithEmail({
      email: data.email,
      password: data.password,
      namaLengkap: data.nama_lengkap,
      nik: data.nik,
      noKk: data.no_kk,
      noHp: data.no_hp || undefined,
    })

    if (error) {
      if (error.message.includes('already registered') || error.message.includes('already exists')) {
        setDaftarError('Email sudah terdaftar. Silakan masuk atau gunakan email lain.')
      } else {
        setDaftarError('Pendaftaran gagal. Silakan coba beberapa saat lagi.')
      }
      return
    }

    // Jika ada session (email confirmation off) → upload dokumen lalu arahkan ke pending
    if (session) {
      try {
        // Pastikan profil warga ada (cadangan jika trigger DB belum terpasang)
        await ensureProfile(session.user.id, {
          nama: data.nama_lengkap,
          nik: data.nik,
          noKk: data.no_kk,
          noHp: data.no_hp,
        })
        await uploadDocs(session.user.id, ktpFile, kkFile)
      } catch (e) {
        console.warn('Gagal upload dokumen:', e)
      }

      // Tautkan blok rumah
      try {
        const { error: rumahErr } = await linkRumah(
          data.blok_rumah,
          data.no_rumah,
          data.status_tinggal
        )
        if (rumahErr) {
          console.warn('Gagal tautkan rumah:', rumahErr)
          toast({
            title: 'Blok rumah sudah ditempati',
            description: `Blok ${data.blok_rumah.toUpperCase()}-${data.no_rumah} terisi warga lain. Akun tetap terdaftar; pengurus akan menetapkan rumah Anda.`,
            variant: 'destructive',
          })
        }
      } catch (e) {
        console.warn('Gagal tautkan rumah:', e)
      }

      navigate('/pending-approval', { replace: true })
      return
    }

    // Email confirmation aktif → minta konfirmasi email
    setConfirmMode(true)
  }

  if (confirmMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl p-8 text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 rounded-full">
              <ShieldCheck className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Pendaftaran Terkirim</h1>
            <p className="text-slate-500 text-sm leading-relaxed">
              Data Anda telah terdaftar. Silakan <span className="font-medium text-slate-900">konfirmasi email</span> Anda
              untuk menyelesaikan pendaftaran, lalu tunggu persetujuan pengurus RT.
            </p>
            <Button
              onClick={() => navigate('/login')}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white"
            >
              Ke Halaman Masuk
            </Button>
          </div>
        </div>
      </div>
    )
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

      <div className="relative w-full max-w-lg">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-7 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-white/20 rounded-2xl mb-3 backdrop-blur-sm">
              <UserPlus className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white">Daftar Warga Baru</h1>
            <p className="text-blue-100 text-sm mt-1">Manajemen Rukun Tetangga Digital</p>
          </div>

          {/* Form */}
          <div className="px-8 py-7">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-slate-900">Data Diri</h2>
              <p className="text-slate-500 text-sm mt-1">
                Lengkapi data sesuai KTP. Akun menunggu verifikasi pengurus RT.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nama_lengkap" className="text-slate-800 text-sm font-medium">
                  Nama Lengkap
                </Label>
                <Input
                  id="nama_lengkap"
                  placeholder="Nama sesuai KTP"
                  className="bg-slate-100 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:ring-blue-400/20 h-11"
                  {...register('nama_lengkap')}
                />
                {errors.nama_lengkap && (
                  <p className="text-red-600 text-xs">{errors.nama_lengkap.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="nik" className="text-slate-800 text-sm font-medium">
                    NIK
                  </Label>
                  <Input
                    id="nik"
                    inputMode="numeric"
                    placeholder="16 digit"
                    className="bg-slate-100 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:ring-blue-400/20 h-11 font-mono"
                    {...register('nik')}
                  />
                  {errors.nik && <p className="text-red-600 text-xs">{errors.nik.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="no_kk" className="text-slate-800 text-sm font-medium">
                    No. KK
                  </Label>
                  <Input
                    id="no_kk"
                    placeholder="Nomor KK"
                    className="bg-slate-100 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:ring-blue-400/20 h-11 font-mono"
                    {...register('no_kk')}
                  />
                  {errors.no_kk && <p className="text-red-600 text-xs">{errors.no_kk.message}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="no_hp" className="text-slate-800 text-sm font-medium">
                  No. HP
                </Label>
                <Input
                  id="no_hp"
                  inputMode="tel"
                  placeholder="08xxxxxxxxxx"
                  className="bg-slate-100 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:ring-blue-400/20 h-11"
                  {...register('no_hp')}
                />
                {errors.no_hp && <p className="text-red-600 text-xs">{errors.no_hp.message}</p>}
              </div>

              {/* Dokumen Identitas */}
              <div className="space-y-3 pt-1">
                <div>
                  <p className="text-slate-800 text-sm font-medium">Dokumen Identitas (Opsional)</p>
                  <p className="text-slate-500 text-xs mt-0.5">
                    Foto/scan KTP & KK (JPG, PNG, atau PDF, maks. 5 MB) untuk mempercepat verifikasi.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FileField
                    label="KTP"
                    icon={<FileText className="w-4 h-4" />}
                    file={ktpFile}
                    onChange={setKtpFile}
                    inputId="ktp"
                  />
                  <FileField
                    label="Kartu Keluarga"
                    icon={<ImagePlus className="w-4 h-4" />}
                    file={kkFile}
                    onChange={setKkFile}
                    inputId="kk"
                  />
                </div>
                {fileError && <p className="text-red-600 text-xs">{fileError}</p>}
              </div>

              {/* Data Rumah */}
              <div className="space-y-3 pt-1">
                <div>
                  <p className="text-slate-800 text-sm font-medium">Data Rumah</p>
                  <p className="text-slate-500 text-xs mt-0.5">Blok dan nomor rumah tempat tinggal Anda.</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="blok_rumah" className="text-slate-800 text-sm font-medium">
                      Blok
                    </Label>
                    <Select
                      value={blokRumah?.toUpperCase() || ''}
                      onValueChange={(v) => setValue('blok_rumah', v, { shouldValidate: true })}
                    >
                      <SelectTrigger className="bg-slate-100 border-slate-300 text-slate-900 h-11">
                        <SelectValue placeholder="Pilih blok" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200">
                        {BLOK_RUMAH_LIST.map((b) => (
                          <SelectItem key={b} value={b} className="text-slate-900 focus:bg-slate-100">
                            {b}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.blok_rumah && <p className="text-red-600 text-xs">{errors.blok_rumah.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="no_rumah" className="text-slate-800 text-sm font-medium">
                      No. Rumah
                    </Label>
                    <Input
                      id="no_rumah"
                      inputMode="numeric"
                      placeholder={blokRumah ? `1-${BLOK_RUMAH_RANGE[blokRumah.toUpperCase() as BlokRumah]?.max ?? 38}` : '01'}
                      className="bg-slate-100 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:ring-blue-400/20 h-11"
                      {...register('no_rumah')}
                    />
                    {errors.no_rumah ? (
                      <p className="text-red-600 text-xs">{errors.no_rumah.message}</p>
                    ) : blokRumah ? (
                      <p className="text-slate-400 text-xs">
                        {blokRumah.toUpperCase()}-1 s/d {blokRumah.toUpperCase()}-{BLOK_RUMAH_RANGE[blokRumah.toUpperCase() as BlokRumah]?.max ?? ''}
                      </p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-800 text-sm font-medium">Status Tinggal</Label>
                    <Select
                      value={statusTinggal}
                      onValueChange={(v) => setValue('status_tinggal', v as 'tetap' | 'kontrak')}
                    >
                      <SelectTrigger className="bg-slate-100 border-slate-300 text-slate-900 h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200">
                        <SelectItem value="tetap" className="text-slate-900 focus:bg-slate-100">Tetap</SelectItem>
                        <SelectItem value="kontrak" className="text-slate-900 focus:bg-slate-100">Kontrak</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

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
                {errors.email && <p className="text-red-600 text-xs">{errors.email.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-slate-800 text-sm font-medium">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Min. 6 karakter"
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
                  <Label htmlFor="konfirmasi_password" className="text-slate-800 text-sm font-medium">
                    Ulangi Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="konfirmasi_password"
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="Ulangi"
                      autoComplete="new-password"
                      className="bg-slate-100 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:ring-blue-400/20 h-11 pr-11"
                      {...register('konfirmasi_password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 transition-colors"
                      tabIndex={-1}
                      aria-label={showConfirm ? 'Sembunyikan password' : 'Tampilkan password'}
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.konfirmasi_password && (
                    <p className="text-red-600 text-xs">{errors.konfirmasi_password.message}</p>
                  )}
                </div>
              </div>

              {daftarError && (
                <div className="bg-red-500/15 border border-red-500/30 rounded-lg px-4 py-3">
                  <p className="text-red-600 text-sm">{daftarError}</p>
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
                    Mendaftarkan...
                  </>
                ) : (
                  'Daftar'
                )}
              </Button>
            </form>

            <p className="mt-5 text-center text-sm text-slate-500">
              Sudah punya akun?{' '}
              <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                Masuk di sini
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-slate-500 text-xs mt-6">
          © {new Date().getFullYear()} Portal RT · Powered by Supabase
        </p>
      </div>
    </div>
  )
}
