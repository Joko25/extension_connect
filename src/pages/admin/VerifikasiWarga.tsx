import { useState } from 'react'
import {
  ExternalLink, Loader2, ShieldCheck, UserCheck, UserX, Clock, CheckCircle2,
} from 'lucide-react'
import { toast } from '@/hooks/useToast'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  useWargaList, useSignedUrl, useUpdateWargaStatus,
  type ProfileWithHouse,
} from '@/hooks/useWarga'

// ─── Signed URL untuk dokumen private ─────────────────────────────────────────

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

// ─── Modal Konfirmasi ─────────────────────────────────────────────────────────

function ModalKonfirmasi({
  warga,
  mode,
  onClose,
}: {
  warga: ProfileWithHouse | null
  mode: 'approve' | 'reject'
  onClose: () => void
}) {
  const updateStatus = useUpdateWargaStatus()
  const isApprove = mode === 'approve'

  async function handleConfirm() {
    if (!warga) return
    try {
      await updateStatus.mutateAsync({
        profileId: warga.id,
        status: isApprove ? 'aktif' : 'menolak',
      })
      toast({
        title: isApprove ? 'Pendaftaran disetujui' : 'Pendaftaran ditolak',
        description: isApprove
          ? `${warga.nama_lengkap} kini aktif dan bisa mengakses portal`
          : `${warga.nama_lengkap} ditolak sebagai warga`,
      })
      onClose()
    } catch {
      toast({
        title: 'Gagal mengubah status',
        description: 'Terjadi kesalahan, coba lagi.',
        variant: 'destructive',
      })
    }
  }

  if (!warga) return null

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-slate-900">
            {isApprove ? 'Setujui Pendaftaran' : 'Tolak Pendaftaran'}
          </DialogTitle>
          <DialogDescription className="text-slate-500">
            {isApprove
              ? 'Warga akan langsung aktif dan dapat mengakses seluruh menu sesuai role-nya.'
              : 'Warga tidak dapat mengakses portal. Data tetap tersimpan dan bisa diaktifkan kembali.'}
          </DialogDescription>
        </DialogHeader>

        <div className="bg-slate-50 rounded-xl p-4 my-2">
          <p className="text-slate-900 font-medium">{warga.nama_lengkap}</p>
          <p className="text-slate-500 text-sm mt-0.5">NIK: {warga.nik}</p>
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
            onClick={handleConfirm}
            disabled={updateStatus.isPending}
            className={
              isApprove
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-red-600 hover:bg-red-500 text-white'
            }
          >
            {updateStatus.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isApprove ? 'Setujui' : 'Tolak'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function VerifikasiWarga() {
  const [selected, setSelected] = useState<ProfileWithHouse | null>(null)
  const [mode, setMode] = useState<'approve' | 'reject'>('approve')

  const { data: pendingList = [], isLoading, error } = useWargaList({ statusWarga: 'pending' })
  const { data: allWarga = [] } = useWargaList()
  const pendingCount = allWarga.filter((w) => w.status_warga === 'pending').length

  const openConfirm = (warga: ProfileWithHouse, m: 'approve' | 'reject') => {
    setSelected(warga)
    setMode(m)
  }
  const closeConfirm = () => setSelected(null)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 sm:py-5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900">Verifikasi Warga Baru</h1>
              <p className="text-slate-500 text-xs sm:text-sm">
                Setujui atau tolak pendaftaran warga yang baru masuk
              </p>
            </div>
          </div>
          <Badge className="w-fit bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 text-xs">
            <Clock className="w-3.5 h-3.5 mr-1" />
            {pendingCount} menunggu
          </Badge>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-12 h-12 rounded-full bg-slate-100" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-40 bg-slate-100" />
                    <Skeleton className="h-3 w-28 bg-slate-50" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-red-600">
            Gagal memuat data. Coba refresh halaman.
          </div>
        ) : pendingList.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-14 text-center space-y-3">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-50 rounded-full">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <p className="text-slate-900 font-medium">Tidak ada pendaftaran menunggu</p>
            <p className="text-slate-500 text-sm">
              Semua pendaftaran warga baru sudah diproses.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingList.map((warga) => {
              const inisial = warga.nama_lengkap
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()

              return (
                <div
                  key={warga.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    {/* Info utama */}
                    <div className="flex items-start gap-3 flex-1">
                      <Avatar className="w-12 h-12 shrink-0">
                        <AvatarFallback className="bg-blue-100 text-blue-700 text-sm font-bold border border-blue-500/20">
                          {inisial}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-slate-900">
                            {warga.nama_lengkap}
                          </h3>
                          <Badge className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px]">
                            Menunggu
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-1 mt-2 text-sm">
                          <p className="text-slate-500">
                            NIK: <span className="text-slate-900 font-medium font-mono">{warga.nik}</span>
                          </p>
                          <p className="text-slate-500">
                            No. KK: <span className="text-slate-900 font-medium font-mono">{warga.no_kk}</span>
                          </p>
                          <p className="text-slate-500">
                            No. HP: <span className="text-slate-900 font-medium">{warga.no_hp || '—'}</span>
                          </p>
                          <p className="text-slate-500">
                            Terdaftar:{' '}
                            <span className="text-slate-900 font-medium">
                              {new Date(warga.created_at).toLocaleDateString('id-ID', {
                                day: 'numeric', month: 'long', year: 'numeric',
                              })}
                            </span>
                          </p>
                        </div>

                        <Separator className="bg-slate-100 my-3" />

                        {/* Dokumen */}
                        <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
                          <span className="text-slate-500">KTP: <DocumentLink bucket="ktp-kk-docs" path={warga.ktp_url} label="Lihat" /></span>
                          <span className="text-slate-500">KK: <DocumentLink bucket="ktp-kk-docs" path={warga.kk_url} label="Lihat" /></span>
                        </div>
                      </div>
                    </div>

                    {/* Aksi */}
                    <div className="flex sm:flex-col gap-2 sm:shrink-0">
                      <Button
                        onClick={() => openConfirm(warga, 'approve')}
                        className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-500 text-white"
                      >
                        <UserCheck className="w-4 h-4 mr-2" />
                        Setujui
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => openConfirm(warga, 'reject')}
                        className="flex-1 sm:flex-none border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                      >
                        <UserX className="w-4 h-4 mr-2" />
                        Tolak
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <ModalKonfirmasi warga={selected} mode={mode} onClose={closeConfirm} />
    </div>
  )
}
