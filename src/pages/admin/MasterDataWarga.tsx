import { useState, useCallback } from 'react'
import { Search, MoreHorizontal, Eye, Shield, Home, UserMinus, Loader2, ExternalLink, User, UserPlus, Users, Home as HomeIcon, CheckCircle2, Clock, MoveRight } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from '@/hooks/useToast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  useWargaList,
  useSignedUrl,
  useUpdateWargaRole,
  useUpdateWargaStatus,
  useUpdateWargaHouse,
  useBlokRumahList,
  useWargaStats,
  useAddWargaManual,
  type ProfileWithHouse,
} from '@/hooks/useWarga'
import type { Role, StatusTinggal } from '@/types/database.types'
import {
  BLOK_RUMAH_LIST, BLOK_RUMAH_RANGE, isValidBlokRumah, isValidNoRumah,
  type BlokRumah,
} from '@/lib/blokRumah'

// ─── Constants ───────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<Role, string> = {
  warga: 'Warga',
  bendahara: 'Bendahara',
  sekretaris: 'Sekretaris',
  humas: 'Humas',
  ketua_rt: 'Ketua RT',
}

const ROLE_BADGE_VARIANTS: Record<Role, string> = {
  warga: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
  bendahara: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  sekretaris: 'bg-blue-500/15 text-blue-600 border-blue-200',
  humas: 'bg-purple-50 text-purple-700 border-purple-200',
  ketua_rt: 'bg-amber-50 text-amber-700 border-amber-200',
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

// Badge Role
function RoleBadge({ role }: { role: Role }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${ROLE_BADGE_VARIANTS[role]}`}
    >
      {ROLE_LABELS[role]}
    </span>
  )
}

// Signed URL display untuk dokumen private
function DocumentLink({ bucket, path, label }: { bucket: string; path: string | null; label: string }) {
  const { data: signedUrl, isLoading, error } = useSignedUrl(bucket, path)

  if (!path) {
    return <span className="text-slate-400 text-sm italic">Belum diunggah</span>
  }
  if (isLoading) {
    return <Skeleton className="h-6 w-32 bg-slate-100" />
  }
  if (error || !signedUrl) {
    return <span className="text-red-600 text-sm">Gagal memuat link</span>
  }
  return (
    <a
      href={signedUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
    >
      <ExternalLink className="w-3.5 h-3.5" />
      {label}
    </a>
  )
}

// ─── Modal: Detail Warga ──────────────────────────────────────────────────────

function ModalDetailWarga({
  warga,
  open,
  onClose,
}: {
  warga: ProfileWithHouse | null
  open: boolean
  onClose: () => void
}) {
  if (!warga) return null

  const inisial = warga.nama_lengkap
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-slate-900">Detail Warga</DialogTitle>
          <DialogDescription className="text-slate-500">
            Informasi lengkap data warga terdaftar
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Avatar + nama */}
          <div className="flex items-center gap-4">
            <Avatar className="w-14 h-14 bg-blue-600/30 border border-blue-200">
              <AvatarFallback className="bg-blue-600/30 text-blue-300 text-lg font-bold">
                {inisial}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{warga.nama_lengkap}</h3>
              <div className="flex items-center gap-2 mt-1">
                <RoleBadge role={warga.role} />
              </div>
            </div>
          </div>

          <Separator className="bg-slate-100" />

          {/* Data diri */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'NIK', value: warga.nik },
              { label: 'No. KK', value: warga.no_kk },
              { label: 'No. HP', value: warga.no_hp || '—' },
              { label: 'Blok Rumah', value: warga.house ? `${warga.house.blok_rumah}-${warga.house.no_rumah}` : '—' },
              { label: 'Status Tinggal', value: warga.house?.status_tinggal === 'tetap' ? 'Tetap' : warga.house?.status_tinggal === 'kontrak' ? 'Kontrak' : '—' },
              { label: 'Terdaftar', value: new Date(warga.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-slate-500 text-xs mb-0.5">{label}</p>
                <p className="text-slate-900 text-sm font-medium">{value}</p>
              </div>
            ))}
          </div>

          <Separator className="bg-slate-100" />

          {/* Dokumen KTP & KK */}
          <div>
            <p className="text-slate-600 text-xs font-medium uppercase tracking-wider mb-3">
              Dokumen Identitas
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-3">
                <span className="text-slate-600 text-sm">KTP</span>
                <DocumentLink bucket="ktp-kk-docs" path={warga.ktp_url} label="Lihat KTP" />
              </div>
              <div className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-3">
                <span className="text-slate-600 text-sm">Kartu Keluarga</span>
                <DocumentLink bucket="ktp-kk-docs" path={warga.kk_url} label="Lihat KK" />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900"
          >
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Modal: Ubah Role ─────────────────────────────────────────────────────────

const roleSchema = z.object({
  role: z.enum(['warga', 'bendahara', 'sekretaris', 'humas', 'ketua_rt']),
})

function ModalUbahRole({
  warga,
  open,
  onClose,
}: {
  warga: ProfileWithHouse | null
  open: boolean
  onClose: () => void
}) {
  const updateRole = useUpdateWargaRole()
  const { register, handleSubmit, setValue, watch, reset } = useForm<{ role: Role }>({
    resolver: zodResolver(roleSchema),
    defaultValues: { role: warga?.role ?? 'warga' },
  })

  const currentRole = watch('role')

  async function onSubmit(data: { role: Role }) {
    if (!warga) return
    try {
      await updateRole.mutateAsync({ profileId: warga.id, role: data.role })
      toast({ title: 'Role berhasil diubah', description: `${warga.nama_lengkap} sekarang menjadi ${ROLE_LABELS[data.role]}` })
      onClose()
      reset()
    } catch (err) {
      toast({ title: 'Gagal mengubah role', variant: 'destructive' })
    }
  }

  if (!warga) return null

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { onClose(); reset() } }}>
      <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-slate-900">Ubah Role Warga</DialogTitle>
          <DialogDescription className="text-slate-500">
            Mengubah role <span className="text-slate-900 font-medium">{warga.nama_lengkap}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-slate-800">Role Saat Ini</Label>
            <div className="px-3 py-2 bg-slate-50 rounded-lg">
              <RoleBadge role={warga.role} />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-800">Role Baru</Label>
            <Select
              defaultValue={warga.role}
              onValueChange={(v) => setValue('role', v as Role)}
            >
              <SelectTrigger className="bg-slate-100 border-slate-300 text-slate-900">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200">
                {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                  <SelectItem key={r} value={r} className="text-slate-900 focus:bg-slate-100">
                    {ROLE_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {currentRole === 'ketua_rt' && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3">
              <p className="text-amber-600 text-sm">
                ⚠️ Menjadikan warga sebagai Ketua RT akan memberikan akses penuh ke seluruh sistem.
              </p>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => { onClose(); reset() }}
              className="border-slate-300 text-slate-700 hover:bg-slate-100"
              disabled={updateRole.isPending}
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={updateRole.isPending || currentRole === warga.role}
              className="bg-blue-600 hover:bg-blue-500 text-white"
            >
              {updateRole.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Modal: Edit Rumah ────────────────────────────────────────────────────────

const houseSchema = z
  .object({
    blok_rumah: z.string().min(1, 'Blok rumah wajib diisi'),
    no_rumah: z.string().min(1, 'Nomor rumah wajib diisi'),
    status_tinggal: z.enum(['tetap', 'kontrak']),
  })
  .superRefine((data, ctx) => {
    const blok = data.blok_rumah.toUpperCase()
    if (!isValidBlokRumah(blok)) {
      ctx.addIssue({ code: 'custom', path: ['blok_rumah'], message: 'Blok rumah hanya HA atau HB' })
      return
    }
    if (!isValidNoRumah(blok, data.no_rumah)) {
      const r = BLOK_RUMAH_RANGE[blok as BlokRumah]
      ctx.addIssue({ code: 'custom', path: ['no_rumah'], message: `Nomor rumah blok ${blok} berkisar ${r.min}-${r.max}` })
    }
  })
type HouseFormData = z.infer<typeof houseSchema>

function ModalEditRumah({
  warga,
  open,
  onClose,
}: {
  warga: ProfileWithHouse | null
  open: boolean
  onClose: () => void
}) {
  const updateHouse = useUpdateWargaHouse()
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<HouseFormData>({
    resolver: zodResolver(houseSchema),
    defaultValues: {
      blok_rumah: warga?.house?.blok_rumah ?? '',
      no_rumah: warga?.house?.no_rumah ?? '',
      status_tinggal: warga?.house?.status_tinggal ?? 'tetap',
    },
  })

  const statusTinggal = watch('status_tinggal')

  async function onSubmit(data: HouseFormData) {
    if (!warga) return
    try {
      await updateHouse.mutateAsync({
        profileId: warga.id,
        oldHouseId: warga.house?.id ?? null,
        blokRumah: data.blok_rumah.toUpperCase(),
        noRumah: data.no_rumah,
        statusTinggal: data.status_tinggal,
      })
      toast({ title: 'Data rumah diperbarui', description: `Blok ${data.blok_rumah.toUpperCase()}-${data.no_rumah}` })
      onClose()
      reset()
    } catch (err) {
      toast({
        title: 'Gagal memperbarui data rumah',
        description: err instanceof Error ? err.message : 'Terjadi kesalahan',
        variant: 'destructive',
      })
    }
  }

  if (!warga) return null

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { onClose(); reset() } }}>
      <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-slate-900">Edit Data Rumah</DialogTitle>
          <DialogDescription className="text-slate-500">
            Perbarui informasi tempat tinggal <span className="text-slate-900 font-medium">{warga.nama_lengkap}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-slate-800">Blok Rumah</Label>
              <Select
                value={watch('blok_rumah')?.toUpperCase() || ''}
                onValueChange={(v) => setValue('blok_rumah', v, { shouldValidate: true })}
              >
                <SelectTrigger className="bg-slate-100 border-slate-300 text-slate-900">
                  <SelectValue placeholder="Pilih blok" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  {BLOK_RUMAH_LIST.map((b) => (
                    <SelectItem key={b} value={b} className="text-slate-900 focus:bg-slate-100">{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.blok_rumah && <p className="text-red-600 text-xs">{errors.blok_rumah.message}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-slate-800">No. Rumah</Label>
              <Input
                {...register('no_rumah')}
                placeholder="01"
                className="bg-slate-100 border-slate-300 text-slate-900 placeholder:text-slate-400"
              />
              {errors.no_rumah && <p className="text-red-600 text-xs">{errors.no_rumah.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-800">Status Tinggal</Label>
            <Select
              defaultValue={warga.house?.status_tinggal ?? 'tetap'}
              onValueChange={(v) => setValue('status_tinggal', v as StatusTinggal)}
            >
              <SelectTrigger className="bg-slate-100 border-slate-300 text-slate-900">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200">
                <SelectItem value="tetap" className="text-slate-900 focus:bg-slate-100">Tetap</SelectItem>
                <SelectItem value="kontrak" className="text-slate-900 focus:bg-slate-100">Kontrak</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => { onClose(); reset() }}
              className="border-slate-300 text-slate-700 hover:bg-slate-100"
              disabled={updateHouse.isPending}
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={updateHouse.isPending}
              className="bg-blue-600 hover:bg-blue-500 text-white"
            >
              {updateHouse.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Modal: Set Non-Aktif ─────────────────────────────────────────────────────

function ModalSetNonAktif({
  warga,
  open,
  onClose,
}: {
  warga: ProfileWithHouse | null
  open: boolean
  onClose: () => void
}) {
  const updateStatus = useUpdateWargaStatus()
  const [mode, setMode] = useState<'menolak' | 'pindah'>('menolak')

  async function handleConfirm() {
    if (!warga) return
    try {
      await updateStatus.mutateAsync({ profileId: warga.id, status: mode })
      toast({
        title: mode === 'pindah' ? 'Status warga diubah ke Pindah' : 'Warga dinonaktifkan',
        description:
          mode === 'pindah'
            ? `${warga.nama_lengkap} ditandai sebagai warga yang pindah`
            : `${warga.nama_lengkap} tidak lagi tercatat sebagai warga aktif`,
      })
      onClose()
    } catch {
      toast({ title: 'Gagal mengubah status', variant: 'destructive' })
    }
  }

  if (!warga) return null

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-slate-900">Set Non-Aktif / Pindah</DialogTitle>
          <DialogDescription className="text-slate-500">
            Pilih status baru untuk warga ini
          </DialogDescription>
        </DialogHeader>

        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 space-y-2 my-2">
          <p className="text-slate-900 font-medium">{warga.nama_lengkap}</p>
          <p className="text-slate-500 text-sm">NIK: {warga.nik}</p>
          {warga.house && (
            <p className="text-slate-500 text-sm">
              Blok {warga.house.blok_rumah}-{warga.house.no_rumah}
            </p>
          )}
        </div>

        {/* Pilihan status */}
        <div className="space-y-2 my-1">
          <button
            type="button"
            onClick={() => setMode('menolak')}
            className={`w-full text-left p-3 rounded-xl border transition-all ${
              mode === 'menolak'
                ? 'border-red-500/50 bg-red-500/10'
                : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
            }`}
          >
            <p className="text-sm font-medium text-slate-900">Non-Aktif</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Warga tidak bisa mengakses portal, namun masih tercatat di RT
            </p>
          </button>
          <button
            type="button"
            onClick={() => setMode('pindah')}
            className={`w-full text-left p-3 rounded-xl border transition-all ${
              mode === 'pindah'
                ? 'border-slate-500/50 bg-slate-100'
                : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
            }`}
          >
            <p className="text-sm font-medium text-slate-900">Pindah</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Warga telah pindah keluar dari lingkungan RT
            </p>
          </button>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-slate-300 text-slate-700 hover:bg-slate-100"
            disabled={updateStatus.isPending}
          >
            Batal
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={updateStatus.isPending}
            className="bg-red-600 hover:bg-red-500"
          >
            {updateStatus.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {mode === 'pindah' ? 'Konfirmasi Pindah' : 'Konfirmasi Non-Aktif'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Modal: Tambah Warga Manual ───────────────────────────────────────────────

const addWargaSchema = z
  .object({
    user_id: z.string().min(1, 'User ID akun wajib diisi'),
    nama_lengkap: z.string().min(1, 'Nama lengkap wajib diisi'),
    nik: z.string().min(10, 'NIK minimal 10 digit'),
    no_kk: z.string().min(1, 'Nomor KK wajib diisi'),
    no_hp: z.string().regex(/^08\d{8,12}$/, 'Format nomor HP tidak valid (08...)'),
    blok_rumah: z.string().min(1, 'Blok rumah wajib diisi'),
    no_rumah: z.string().min(1, 'Nomor rumah wajib diisi'),
    status_tinggal: z.enum(['tetap', 'kontrak']),
  })
  .superRefine((data, ctx) => {
    const blok = data.blok_rumah.toUpperCase()
    if (!isValidBlokRumah(blok)) {
      ctx.addIssue({ code: 'custom', path: ['blok_rumah'], message: 'Blok rumah hanya HA atau HB' })
      return
    }
    if (!isValidNoRumah(blok, data.no_rumah)) {
      const r = BLOK_RUMAH_RANGE[blok as BlokRumah]
      ctx.addIssue({ code: 'custom', path: ['no_rumah'], message: `Nomor rumah blok ${blok} berkisar ${r.min}-${r.max}` })
    }
  })
type AddWargaFormData = z.infer<typeof addWargaSchema>

function ModalTambahWarga({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const addWarga = useAddWargaManual()
  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } =
    useForm<AddWargaFormData>({
      resolver: zodResolver(addWargaSchema),
      defaultValues: { status_tinggal: 'tetap' },
    })

  const statusTinggal = watch('status_tinggal')

  async function onSubmit(data: AddWargaFormData) {
    try {
      await addWarga.mutateAsync({
        user_id: data.user_id,
        nama_lengkap: data.nama_lengkap,
        nik: data.nik,
        no_kk: data.no_kk,
        no_hp: data.no_hp,
        blokRumah: data.blok_rumah.toUpperCase(),
        noRumah: data.no_rumah,
        statusTinggal: data.status_tinggal,
      })
      toast({
        title: 'Warga berhasil disimpan',
        description: `${data.nama_lengkap} ditautkan ke Blok ${data.blok_rumah.toUpperCase()}-${data.no_rumah}`,
      })
      onClose()
      reset()
    } catch (err) {
      toast({
        title: 'Gagal menambahkan warga',
        description: err instanceof Error ? err.message : 'Terjadi kesalahan',
        variant: 'destructive',
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { onClose(); reset() } }}>
      <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-slate-900">Tambah Warga Manual</DialogTitle>
          <DialogDescription className="text-slate-500">
            Buat profil warga baru dan tautkan ke rumahnya
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-slate-800">User ID Akun</Label>
            <Input
              {...register('user_id')}
              placeholder="UUID dari akun yang sudah terdaftar"
              className="bg-slate-100 border-slate-300 text-slate-900 placeholder:text-slate-400 font-mono"
            />
            {errors.user_id && <p className="text-red-600 text-xs">{errors.user_id.message}</p>}
            <p className="text-slate-400 text-[11px]">
              Warga harus sudah memiliki akun login terlebih dahulu.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-800">Nama Lengkap</Label>
            <Input
              {...register('nama_lengkap')}
              placeholder="Nama sesuai KTP"
              className="bg-slate-100 border-slate-300 text-slate-900 placeholder:text-slate-400"
            />
            {errors.nama_lengkap && <p className="text-red-600 text-xs">{errors.nama_lengkap.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-slate-800">NIK</Label>
              <Input
                {...register('nik')}
                placeholder="16 digit"
                className="bg-slate-100 border-slate-300 text-slate-900 placeholder:text-slate-400 font-mono"
              />
              {errors.nik && <p className="text-red-600 text-xs">{errors.nik.message}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-slate-800">No. KK</Label>
              <Input
                {...register('no_kk')}
                placeholder="Nomor Kartu Keluarga"
                className="bg-slate-100 border-slate-300 text-slate-900 placeholder:text-slate-400 font-mono"
              />
              {errors.no_kk && <p className="text-red-600 text-xs">{errors.no_kk.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-800">No. HP</Label>
            <Input
              {...register('no_hp')}
              inputMode="tel"
              placeholder="08xxxxxxxxxx"
              className="bg-slate-100 border-slate-300 text-slate-900 placeholder:text-slate-400"
            />
            {errors.no_hp && <p className="text-red-600 text-xs">{errors.no_hp.message}</p>}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label className="text-slate-800">Blok Rumah</Label>
              <Select
                value={watch('blok_rumah')?.toUpperCase() || ''}
                onValueChange={(v) => setValue('blok_rumah', v, { shouldValidate: true })}
              >
                <SelectTrigger className="bg-slate-100 border-slate-300 text-slate-900">
                  <SelectValue placeholder="Pilih blok" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  {BLOK_RUMAH_LIST.map((b) => (
                    <SelectItem key={b} value={b} className="text-slate-900 focus:bg-slate-100">{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.blok_rumah && <p className="text-red-600 text-xs">{errors.blok_rumah.message}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-slate-800">No. Rumah</Label>
              <Input
                {...register('no_rumah')}
                placeholder="01"
                className="bg-slate-100 border-slate-300 text-slate-900 placeholder:text-slate-400"
              />
              {errors.no_rumah && <p className="text-red-600 text-xs">{errors.no_rumah.message}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-slate-800">Status Tinggal</Label>
              <Select
                value={statusTinggal}
                onValueChange={(v) => setValue('status_tinggal', v as 'tetap' | 'kontrak')}
              >
                <SelectTrigger className="bg-slate-100 border-slate-300 text-slate-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  <SelectItem value="tetap" className="text-slate-900 focus:bg-slate-100">Tetap</SelectItem>
                  <SelectItem value="kontrak" className="text-slate-900 focus:bg-slate-100">Kontrak</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => { onClose(); reset() }}
              className="border-slate-300 text-slate-700 hover:bg-slate-100"
              disabled={addWarga.isPending}
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={addWarga.isPending}
              className="bg-blue-600 hover:bg-blue-500 text-white"
            >
              {addWarga.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Simpan Warga
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Page Component ──────────────────────────────────────────────────────

type ActiveModal = 'detail' | 'role' | 'rumah' | 'nonaktif' | null

export default function MasterDataWarga() {
  const [search, setSearch] = useState('')
  const [blokFilter, setBlokFilter] = useState<string>('')
  const [statusTinggalFilter, setStatusTinggalFilter] = useState<string>('')
  const [selectedWarga, setSelectedWarga] = useState<ProfileWithHouse | null>(null)
  const [activeModal, setActiveModal] = useState<ActiveModal>(null)
  const [tambahOpen, setTambahOpen] = useState(false)

  const { data: wargaList = [], isLoading, error } = useWargaList({
    search,
    blokRumah: blokFilter || undefined,
    statusTinggal: statusTinggalFilter || undefined,
  })

  const { data: blokList = [] } = useBlokRumahList()
  const { data: stats } = useWargaStats()

  const openModal = useCallback((warga: ProfileWithHouse, modal: ActiveModal) => {
    setSelectedWarga(warga)
    setActiveModal(modal)
  }, [])

  const closeModal = useCallback(() => {
    setActiveModal(null)
    // Jangan langsung null-kan selectedWarga agar closing animation tidak flicker
    setTimeout(() => setSelectedWarga(null), 200)
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <User className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Master Data Warga</h1>
                <p className="text-slate-500 text-sm">
                  Kelola data warga aktif di lingkungan RT
                </p>
              </div>
            </div>
            <Button
              onClick={() => setTambahOpen(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/25"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Tambah Warga Manual
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-xs">Total Warga</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {stats?.total ?? <Skeleton className="h-7 w-12 bg-slate-100" />}
                </p>
              </div>
              <div className="w-10 h-10 bg-blue-500/15 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-xs">Warga Tetap</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {stats?.tetap ?? <Skeleton className="h-7 w-12 bg-slate-100" />}
                </p>
              </div>
              <div className="w-10 h-10 bg-emerald-500/15 rounded-xl flex items-center justify-center">
                <HomeIcon className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-xs">Warga Kontrak</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {stats?.kontrak ?? <Skeleton className="h-7 w-12 bg-slate-100" />}
                </p>
              </div>
              <div className="w-10 h-10 bg-orange-500/15 rounded-xl flex items-center justify-center">
                <Home className="w-5 h-5 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-xs">Menunggu Verifikasi</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {stats?.pending ?? <Skeleton className="h-7 w-12 bg-slate-100" />}
                </p>
              </div>
              <div className="w-10 h-10 bg-amber-500/15 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
            </div>
          </div>
        </div>
        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Cari nama atau NIK..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-500/50 h-10"
            />
          </div>

          {/* Filter Blok */}
          <Select value={blokFilter} onValueChange={setBlokFilter}>
            <SelectTrigger className="w-[160px] bg-slate-50 border-slate-200 text-slate-900 h-10">
              <SelectValue placeholder="Semua Blok" />
            </SelectTrigger>
            <SelectContent className="bg-white border-slate-200">
              <SelectItem value="" className="text-slate-900 focus:bg-slate-100">Semua Blok</SelectItem>
              {blokList.map((blok) => (
                <SelectItem key={blok} value={blok} className="text-slate-900 focus:bg-slate-100">
                  Blok {blok}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filter Status Tinggal */}
          <Select value={statusTinggalFilter} onValueChange={setStatusTinggalFilter}>
            <SelectTrigger className="w-[180px] bg-slate-50 border-slate-200 text-slate-900 h-10">
              <SelectValue placeholder="Status Tinggal" />
            </SelectTrigger>
            <SelectContent className="bg-white border-slate-200">
              <SelectItem value="" className="text-slate-900 focus:bg-slate-100">Semua Status</SelectItem>
              <SelectItem value="tetap" className="text-slate-900 focus:bg-slate-100">Tetap</SelectItem>
              <SelectItem value="kontrak" className="text-slate-900 focus:bg-slate-100">Kontrak</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats summary */}
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span>
            {isLoading ? 'Memuat...' : `${wargaList.length} warga ditemukan`}
          </span>
          {(search || blokFilter || statusTinggalFilter) && (
            <button
              onClick={() => { setSearch(''); setBlokFilter(''); setStatusTinggalFilter('') }}
              className="text-blue-600 hover:text-blue-700 transition-colors"
            >
              Reset filter
            </button>
          )}
        </div>

        {/* Table */}
        <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-200 hover:bg-transparent">
                <TableHead className="text-slate-500 font-medium">Warga</TableHead>
                <TableHead className="text-slate-500 font-medium">NIK</TableHead>
                <TableHead className="text-slate-500 font-medium">Blok & Rumah</TableHead>
                <TableHead className="text-slate-500 font-medium">Status Tinggal</TableHead>
                <TableHead className="text-slate-500 font-medium">Status Warga</TableHead>
                <TableHead className="text-slate-500 font-medium">Role</TableHead>
                <TableHead className="text-slate-500 font-medium">Terdaftar</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                // Skeleton rows
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i} className="border-slate-100">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Skeleton className="w-9 h-9 rounded-full bg-slate-100" />
                        <div className="space-y-1.5">
                          <Skeleton className="h-3.5 w-32 bg-slate-100" />
                          <Skeleton className="h-3 w-24 bg-slate-50" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><Skeleton className="h-3.5 w-36 bg-slate-100" /></TableCell>
                    <TableCell><Skeleton className="h-3.5 w-16 bg-slate-100" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16 rounded-full bg-slate-100" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16 rounded-full bg-slate-100" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20 rounded-full bg-slate-100" /></TableCell>
                    <TableCell><Skeleton className="h-3.5 w-24 bg-slate-100" /></TableCell>
                    <TableCell />
                  </TableRow>
                ))
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-16 text-red-600">
                    Gagal memuat data. Coba refresh halaman.
                  </TableCell>
                </TableRow>
              ) : wargaList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-16">
                    <div className="space-y-2">
                      <User className="w-10 h-10 text-slate-300 mx-auto" />
                      <p className="text-slate-400">Tidak ada warga ditemukan</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                wargaList.map((warga) => {
                  const inisial = warga.nama_lengkap
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()

                  return (
                    <TableRow
                      key={warga.id}
                      className="border-slate-100 hover:bg-slate-50 cursor-default transition-colors"
                    >
                      {/* Nama + HP */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-9 h-9 shrink-0">
                            <AvatarFallback className="bg-blue-100 text-blue-700 text-xs font-bold border border-blue-500/20">
                              {inisial}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-slate-900 font-medium text-sm leading-tight">
                              {warga.nama_lengkap}
                            </p>
                            <p className="text-slate-500 text-xs">{warga.no_hp || '—'}</p>
                          </div>
                        </div>
                      </TableCell>

                      {/* NIK */}
                      <TableCell className="text-slate-600 text-sm font-mono">
                        {warga.nik}
                      </TableCell>

                      {/* Blok & Rumah */}
                      <TableCell>
                        {warga.house ? (
                          <span className="text-slate-900 font-medium text-sm">
                            {warga.house.blok_rumah}-{warga.house.no_rumah}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-sm italic">Belum ditetapkan</span>
                        )}
                      </TableCell>

                      {/* Status Tinggal */}
                      <TableCell>
                        {warga.house ? (
                          <Badge
                            variant="outline"
                            className={
                              warga.house.status_tinggal === 'tetap'
                                ? 'border-green-500/30 text-green-600 bg-green-500/10'
                                : 'border-orange-500/30 text-orange-600 bg-orange-500/10'
                            }
                          >
                            {warga.house.status_tinggal === 'tetap' ? 'Tetap' : 'Kontrak'}
                          </Badge>
                        ) : (
                          <span className="text-slate-400 text-sm">—</span>
                        )}
                      </TableCell>

                      {/* Status Warga */}
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            warga.status_warga === 'aktif'
                              ? 'border-green-500/30 text-green-600 bg-green-500/10'
                              : warga.status_warga === 'pending'
                                ? 'border-amber-500/30 text-amber-600 bg-amber-500/10'
                                : warga.status_warga === 'pindah'
                                  ? 'border-slate-500/30 text-slate-600 bg-slate-500/10'
                                  : 'border-red-500/30 text-red-600 bg-red-500/10'
                          }
                        >
                          {warga.status_warga === 'aktif'
                            ? <CheckCircle2 className="w-3 h-3 mr-1" />
                            : warga.status_warga === 'pending'
                              ? <Clock className="w-3 h-3 mr-1" />
                              : warga.status_warga === 'pindah'
                                ? <MoveRight className="w-3 h-3 mr-1" />
                                : null}
                          {warga.status_warga === 'aktif'
                            ? 'Aktif'
                            : warga.status_warga === 'pending'
                              ? 'Pending'
                              : warga.status_warga === 'pindah'
                                ? 'Pindah'
                                : 'Non-Aktif'}
                        </Badge>
                      </TableCell>

                      {/* Role */}
                      <TableCell>
                        <RoleBadge role={warga.role} />
                      </TableCell>

                      {/* Tanggal daftar */}
                      <TableCell className="text-slate-500 text-sm">
                        {new Date(warga.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </TableCell>

                      {/* Action Menu */}
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-8 h-8 text-slate-400 hover:text-slate-900 hover:bg-slate-100"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                              <span className="sr-only">Menu aksi</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="bg-white border-slate-200 text-slate-900 w-52"
                          >
                            <DropdownMenuLabel className="text-slate-500 text-xs">
                              {warga.nama_lengkap}
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-slate-100" />
                            <DropdownMenuItem
                              onClick={() => openModal(warga, 'detail')}
                              className="focus:bg-slate-100 cursor-pointer gap-2"
                            >
                              <Eye className="w-4 h-4 text-slate-500" />
                              Lihat Detail
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openModal(warga, 'role')}
                              className="focus:bg-slate-100 cursor-pointer gap-2"
                            >
                              <Shield className="w-4 h-4 text-slate-500" />
                              Ubah Role
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openModal(warga, 'rumah')}
                              className="focus:bg-slate-100 cursor-pointer gap-2"
                            >
                              <Home className="w-4 h-4 text-slate-500" />
                              Edit Data Rumah
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-slate-100" />
                            <DropdownMenuItem
                              onClick={() => openModal(warga, 'nonaktif')}
                              className="focus:bg-red-500/20 text-red-600 cursor-pointer gap-2"
                            >
                              <UserMinus className="w-4 h-4" />
                              Set Non-Aktif / Pindah
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Modals */}
      <ModalDetailWarga
        warga={selectedWarga}
        open={activeModal === 'detail'}
        onClose={closeModal}
      />
      <ModalUbahRole
        warga={selectedWarga}
        open={activeModal === 'role'}
        onClose={closeModal}
      />
      <ModalEditRumah
        warga={selectedWarga}
        open={activeModal === 'rumah'}
        onClose={closeModal}
      />
      <ModalSetNonAktif
        warga={selectedWarga}
        open={activeModal === 'nonaktif'}
        onClose={closeModal}
      />
      <ModalTambahWarga
        open={tambahOpen}
        onClose={() => setTambahOpen(false)}
      />
    </div>
  )
}
