import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Loader2, Save, User, Phone, Hash, IdCard, BadgeCheck, Shield, Clock,
  UploadCloud, FileText, CheckCircle2, ExternalLink,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useUpdateProfile, useSignedUrl } from '@/hooks/useWarga'
import { toast } from '@/hooks/useToast'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'

const ROLE_LABELS: Record<string, string> = {
  warga: 'Warga',
  bendahara: 'Bendahara',
  sekretaris: 'Sekretaris',
  humas: 'Humas',
  ketua_rt: 'Ketua RT',
}

const ROLE_BADGE: Record<string, string> = {
  warga: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  bendahara: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  sekretaris: 'bg-blue-500/15 text-blue-600 border-blue-200',
  humas: 'bg-purple-50 text-purple-700 border-purple-200',
  ketua_rt: 'bg-amber-50 text-amber-700 border-amber-200',
}

const profileSchema = z.object({
  nama_lengkap: z.string().min(3, 'Nama lengkap minimal 3 karakter'),
  no_kk: z.string().min(1, 'Nomor KK wajib diisi'),
  no_hp: z.string().optional(),
})
type ProfileFormData = z.infer<typeof profileSchema>

// ─── Preview dokumen identitas (signed URL) ─────────────────────────────────

function DocPreview({ path, label }: { path: string | null; label: string }) {
  const { data: url, isLoading } = useSignedUrl('ktp-kk-docs', path)

  if (!path) return null
  if (isLoading) return <Skeleton className="h-28 w-full bg-slate-100 rounded-lg" />

  if (!url) {
    return <p className="text-red-600 text-xs">Gagal memuat dokumen</p>
  }

  const isPdf = path.toLowerCase().endsWith('.pdf')
  if (isPdf) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
      >
        <FileText className="w-4 h-4" /> {label} (PDF)
        <ExternalLink className="w-3.5 h-3.5" />
      </a>
    )
  }

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="block group">
      <img
        src={url}
        alt={label}
        className="max-h-36 w-full object-contain rounded-lg border border-slate-200 bg-slate-50 group-hover:opacity-90 transition-opacity"
      />
    </a>
  )
}

function FilePicker({
  label,
  file,
  onChange,
}: {
  label: string
  file: File | null
  onChange: (f: File | null) => void
}) {
  return (
    <label
      className={`flex flex-col items-center justify-center gap-1 border-2 border-dashed rounded-xl px-4 py-4 cursor-pointer text-center transition-colors ${
        file ? 'border-emerald-300 bg-emerald-50' : 'border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50'
      }`}
    >
      <UploadCloud className={`w-5 h-5 ${file ? 'text-emerald-600' : 'text-slate-400'}`} />
      <span className="text-sm text-slate-700 font-medium">
        {file ? file.name : `Upload ${label}`}
      </span>
      <span className="text-xs text-slate-400">
        {file ? `${(file.size / 1024).toFixed(0)} KB` : 'JPG, PNG, WebP, atau PDF'}
      </span>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
    </label>
  )
}

// ─── Section: Dokumen Identitas ──────────────────────────────────────────────

function IdentityDocsSection({
  uid,
  ktpUrl,
  kkUrl,
  onUpdated,
}: {
  uid: string
  ktpUrl: string | null
  kkUrl: string | null
  onUpdated: () => void
}) {
  const [ktpFile, setKtpFile] = useState<File | null>(null)
  const [kkFile, setKkFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasNew = !!ktpFile || !!kkFile
  const canSave = hasNew && !uploading

  async function handleSave() {
    if (!hasNew) return
    setError(null)
    setUploading(true)
    try {
      const updates: Record<string, string> = {}
      const uploadOne = async (file: File, type: 'ktp' | 'kk') => {
        const ext = file.name.split('.').pop()
        const path = `${uid}/${type}-${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage
          .from('ktp-kk-docs')
          .upload(path, file, { upsert: false })
        if (upErr) throw new Error(`Gagal mengunggah ${type === 'ktp' ? 'KTP' : 'KK'}: ${upErr.message}`)
        updates[type === 'ktp' ? 'ktp_url' : 'kk_url'] = path
      }
      if (ktpFile) await uploadOne(ktpFile, 'ktp')
      if (kkFile) await uploadOne(kkFile, 'kk')
      if (Object.keys(updates).length > 0) {
        const { error: upErr } = await supabase.from('profiles').update(updates).eq('user_id', uid)
        if (upErr) throw new Error('Gagal menyimpan dokumen ke data warga')
      }
      toast({ title: 'Dokumen berhasil diunggah', description: 'Dokumen identitas Anda telah diperbarui.' })
      setKtpFile(null)
      setKkFile(null)
      onUpdated()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal mengunggah dokumen')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-2">
        <IdCard className="w-4 h-4 text-slate-500" />
        <h3 className="text-sm font-semibold text-slate-800">Dokumen Identitas</h3>
      </div>

      <div className="p-6 space-y-5">
        {/* KTP */}
        <div>
          <Label className="text-slate-800 mb-2 block">Kartu Tanda Penduduk (KTP)</Label>
          {ktpUrl && !ktpFile ? (
            <div className="space-y-2">
              <DocPreview path={ktpUrl} label="KTP" />
              <div className="flex items-center gap-1 text-emerald-600 text-xs font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> Sudah diunggah
              </div>
            </div>
          ) : (
            <FilePicker label="KTP" file={ktpFile} onChange={setKtpFile} />
          )}
        </div>

        {/* KK */}
        <div>
          <Label className="text-slate-800 mb-2 block">Kartu Keluarga (KK)</Label>
          {kkUrl && !kkFile ? (
            <div className="space-y-2">
              <DocPreview path={kkUrl} label="KK" />
              <div className="flex items-center gap-1 text-emerald-600 text-xs font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> Sudah diunggah
              </div>
            </div>
          ) : (
            <FilePicker label="Kartu Keluarga" file={kkFile} onChange={setKkFile} />
          )}
        </div>

        {error && <p className="text-red-600 text-xs">{error}</p>}

        {canSave && (
          <Button
            onClick={handleSave}
            disabled={uploading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white"
          >
            {uploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Unggah Dokumen
          </Button>
        )}
      </div>
    </div>
  )
}


export default function Profile() {
  const { profile, refreshProfile } = useAuth()
  const updateProfile = useUpdateProfile()

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    values: {
      nama_lengkap: profile?.nama_lengkap ?? '',
      no_kk: profile?.no_kk ?? '',
      no_hp: profile?.no_hp ?? '',
    },
  })

  if (!profile) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  const me = profile

  const inisial = me.nama_lengkap
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  async function onSubmit(data: ProfileFormData) {
    try {
      await updateProfile.mutateAsync({
        profileId: me.id,
        namaLengkap: data.nama_lengkap.trim(),
        noKk: data.no_kk.trim(),
        noHp: data.no_hp?.trim() ?? '',
      })
      await refreshProfile()
      toast({
        title: 'Profil diperbarui',
        description: 'Perubahan data berhasil disimpan.',
      })
    } catch (err) {
      toast({
        title: 'Gagal memperbarui profil',
        description: err instanceof Error ? err.message : 'Terjadi kesalahan',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Profil Saya</h1>
          <p className="text-slate-500 text-sm mt-1">
            Kelola dan perbarui informasi data diri Anda
          </p>
        </div>

        {/* Kartu identitas */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16 border border-slate-200 bg-blue-600/30">
              <AvatarFallback className="bg-blue-600/30 text-blue-200 text-xl font-bold">
                {inisial}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{profile.nama_lengkap}</h2>
              <div className="flex items-center gap-2 mt-1.5">
                <Badge
                  variant="outline"
                  className={`px-2 py-0.5 text-xs font-medium ${ROLE_BADGE[profile.role]}`}
                >
                  <Shield className="w-3 h-3 mr-1" />
                  {ROLE_LABELS[profile.role] ?? profile.role}
                </Badge>
                <Badge
                  variant="outline"
                  className={
                    profile.status_warga === 'aktif'
                      ? 'border-green-500/30 text-green-600 bg-green-500/10'
                      : profile.status_warga === 'pending'
                        ? 'border-amber-500/30 text-amber-600 bg-amber-500/10'
                        : profile.status_warga === 'pindah'
                          ? 'border-slate-500/30 text-slate-600 bg-slate-500/10'
                          : 'border-red-500/30 text-red-600 bg-red-500/10'
                  }
                >
                  {profile.status_warga === 'aktif'
                    ? 'Aktif'
                    : profile.status_warga === 'pending'
                      ? 'Pending'
                      : profile.status_warga === 'pindah'
                        ? 'Pindah'
                        : 'Non-aktif'}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Data hanya-baca */}
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-2">
            <IdCard className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-800">Data Tetap</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-6">
            <div className="space-y-1">
              <p className="text-slate-500 text-xs flex items-center gap-1.5">
                <Hash className="w-3 h-3" /> NIK
              </p>
              <p className="text-slate-900 font-medium font-mono text-sm">{profile.nik}</p>
            </div>
            <div className="space-y-1">
              <p className="text-slate-500 text-xs flex items-center gap-1.5">
                <BadgeCheck className="w-3 h-3" /> Status Warga
              </p>
              <p className="text-slate-900 font-medium text-sm">
                {profile.status_warga}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-slate-500 text-xs flex items-center gap-1.5">
                <Clock className="w-3 h-3" /> Terdaftar Sejak
              </p>
              <p className="text-slate-900 font-medium text-sm">
                {new Date(profile.created_at).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-slate-500 text-xs flex items-center gap-1.5">
                <Shield className="w-3 h-3" /> ID Pengguna
              </p>
              <p className="text-slate-500 text-xs font-mono truncate">{profile.user_id}</p>
            </div>
          </div>
        </div>

        <Separator className="bg-slate-100" />

        {/* Form ubah data */}
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-2">
            <User className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-800">Ubah Data Diri</h3>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-800">Nama Lengkap</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  {...register('nama_lengkap')}
                  placeholder="Nama sesuai KTP"
                  className="pl-9 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-500/50"
                />
              </div>
              {errors.nama_lengkap && (
                <p className="text-red-600 text-xs">{errors.nama_lengkap.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-slate-800">No. Kartu Keluarga (KK)</Label>
              <div className="relative">
                <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  {...register('no_kk')}
                  placeholder="Nomor Kartu Keluarga"
                  className="pl-9 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-500/50 font-mono"
                />
              </div>
              {errors.no_kk && (
                <p className="text-red-600 text-xs">{errors.no_kk.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-slate-800">No. HP / WhatsApp</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  {...register('no_hp')}
                  placeholder="08xxxxxxxxxx"
                  className="pl-9 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-500/50"
                />
              </div>
              {errors.no_hp && (
                <p className="text-red-600 text-xs">{errors.no_hp.message}</p>
              )}
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                disabled={updateProfile.isPending || !isDirty}
                className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/25"
              >
                {updateProfile.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Simpan Perubahan
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>

        {/* Dokumen Identitas */}
        <IdentityDocsSection
          uid={me.user_id}
          ktpUrl={me.ktp_url}
          kkUrl={me.kk_url}
          onUpdated={refreshProfile}
        />
      </div>
    </div>
  )
}
