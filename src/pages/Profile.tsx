import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Save, User, Phone, Hash, IdCard, BadgeCheck, Shield, Clock } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useUpdateProfile } from '@/hooks/useWarga'
import { toast } from '@/hooks/useToast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'

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
                        : 'border-red-500/30 text-red-600 bg-red-500/10'
                  }
                >
                  {profile.status_warga === 'aktif'
                    ? 'Aktif'
                    : profile.status_warga === 'pending'
                      ? 'Pending'
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
      </div>
    </div>
  )
}
