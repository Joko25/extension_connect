import { useState } from 'react'
import { CheckCircle2, XCircle, Eye, Loader2, ArrowLeft, AlertCircle, RefreshCw } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { usePendingContributions, useApproveIuran, useRejectIuran, useProofSignedUrl } from '@/hooks/useIuran'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/hooks/useToast'
import { Link } from 'react-router-dom'
import type { ContributionWithProfile } from '@/types/database.types'

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

function ReviewModal({
  item,
  open,
  onClose,
}: {
  item: ContributionWithProfile | null
  open: boolean
  onClose: () => void
}) {
  const { profile } = useAuth()
  const [rejectReason, setRejectReason] = useState('')
  const [isRejectingState, setIsRejectingState] = useState(false)

  const approveMutation = useApproveIuran()
  const rejectMutation = useRejectIuran()

  const { data: signedUrl, isLoading: isLoadingImage } = useProofSignedUrl(item?.proof_url)

  if (!item) return null

  const [year, month] = item.bulan_tahun.split('-')
  const monthName = MONTH_NAMES[parseInt(month, 10) - 1]

  const handleApprove = async () => {
    if (!profile) return
    try {
      await approveMutation.mutateAsync({
        contributionId: item.id,
        profileId: profile.id,
        bulanTahun: item.bulan_tahun,
        nominal: Number(item.nominal),
        namaWarga: item.profile.nama_lengkap,
      })
      toast({
        title: 'Iuran Disetujui!',
        description: `Pembayaran iuran ${monthName} ${year} dari ${item.profile.nama_lengkap} berhasil disetujui & dicatat di Cashflow.`,
      })
      onClose()
    } catch (err: any) {
      toast({ title: 'Gagal menyetujui', description: err.message, variant: 'destructive' })
    }
  }

  const handleRejectConfirm = async () => {
    try {
      await rejectMutation.mutateAsync({
        contributionId: item.id,
        catatan: rejectReason.trim() || undefined,
      })
      toast({
        title: 'Iuran Ditolak',
        description: `Pembayaran iuran ${monthName} ${year} dari ${item.profile.nama_lengkap} ditolak.`,
      })
      setIsRejectingState(false)
      setRejectReason('')
      onClose()
    } catch (err: any) {
      toast({ title: 'Gagal menolak', description: err.message, variant: 'destructive' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setIsRejectingState(false); onClose() } }}>
      <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-slate-900">Review Bukti Pembayaran</DialogTitle>
          <DialogDescription className="text-slate-500">
            Periksa keabsahan bukti transfer dari warga
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Information box */}
          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-sm">
            <div>
              <p className="text-slate-500 text-xs">Nama Warga</p>
              <p className="font-semibold text-slate-900 mt-0.5">{item.profile.nama_lengkap}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs">No. HP / WhatsApp</p>
              <p className="font-medium text-slate-800 mt-0.5">{item.profile.no_hp || '—'}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs">Periode Iuran</p>
              <p className="font-semibold text-blue-600 mt-0.5">{monthName} {year}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs">Nominal Transfer</p>
              <p className="font-bold text-emerald-600 font-mono mt-0.5">
                Rp {Number(item.nominal).toLocaleString('id-ID')}
              </p>
            </div>
          </div>

          {/* Proof Image */}
          <div className="space-y-1.5">
            <Label className="text-slate-800 text-xs">Foto Bukti Transfer</Label>
            <div className="bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-center p-3 min-h-[220px]">
              {isLoadingImage ? (
                <Skeleton className="w-full h-56 bg-slate-100 rounded-lg animate-pulse" />
              ) : signedUrl ? (
                <img src={signedUrl} alt="Bukti Transfer" className="max-h-72 rounded-lg object-contain" />
              ) : (
                <p className="text-slate-500 text-sm">Gagal memuat bukti transfer</p>
              )}
            </div>
          </div>

          {/* Reject reasoning form if active */}
          {isRejectingState && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3.5 space-y-2">
              <Label className="text-red-600 text-xs font-medium">Alasan Penolakan (Opsional)</Label>
              <Input
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Contoh: Nominal transfer kurang / Foto tidak terbaca"
                className="bg-white border-red-500/40 text-slate-900 placeholder:text-slate-400 h-9 text-sm"
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {isRejectingState ? (
            <>
              <Button
                variant="outline"
                onClick={() => setIsRejectingState(false)}
                className="border-slate-300 text-slate-700 hover:bg-slate-100"
              >
                Batal
              </Button>
              <Button
                onClick={handleRejectConfirm}
                disabled={rejectMutation.isPending}
                className="bg-red-600 hover:bg-red-500 text-white"
              >
                {rejectMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Konfirmasi Tolak
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setIsRejectingState(true)}
                disabled={approveMutation.isPending}
                className="border-red-500/40 text-red-600 hover:bg-red-500/20"
              >
                <XCircle className="w-4 h-4 mr-1.5" />
                Tolak
              </Button>
              <Button
                onClick={handleApprove}
                disabled={approveMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25"
              >
                {approveMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                    Setujui & Catat Kas
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function ReviewIuran() {
  const { data: pendingList = [], isLoading, refetch } = usePendingContributions()
  const [selectedItem, setSelectedItem] = useState<ContributionWithProfile | null>(null)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 sm:py-5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Link to="/dashboard" className="text-slate-500 hover:text-slate-900 transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900">Review Antrean Iuran Warga</h1>
            </div>
            <p className="text-slate-500 text-sm ml-8">
              Verifikasi bukti transfer pembayaran iuran dari warga RT
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => refetch()}
            className="w-full sm:w-auto border-slate-200 text-slate-800 hover:bg-slate-50 text-sm"
          >
            <RefreshCw className="w-4 h-4 mr-2 text-blue-600" />
            Refresh Data
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Antrean Info Bar */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              {pendingList.length} Pembayaran Menunggu Review
            </h3>
            <p className="text-slate-500 text-xs mt-0.5">
              Setiap persetujuan akan secara otomatis menambahkan nominal iuran ke laporan Kas Masuk.
            </p>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-200 hover:bg-transparent">
                <TableHead className="text-slate-500 text-xs">Nama Warga</TableHead>
                <TableHead className="text-slate-500 text-xs">Periode Iuran</TableHead>
                <TableHead className="text-slate-500 text-xs">Nominal</TableHead>
                <TableHead className="text-slate-500 text-xs">Tanggal Upload</TableHead>
                <TableHead className="text-slate-500 text-xs text-right">Aksi Review</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i} className="border-slate-100">
                    <TableCell><Skeleton className="h-4 w-32 bg-slate-100" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24 bg-slate-100" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20 bg-slate-100" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24 bg-slate-100" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto rounded-lg bg-slate-100" /></TableCell>
                  </TableRow>
                ))
              ) : pendingList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-16 text-slate-400 text-sm">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500/30 mx-auto mb-2" />
                    Tidak ada antrean pembayaran iuran saat ini
                  </TableCell>
                </TableRow>
              ) : (
                pendingList.map((item) => {
                  const [year, month] = item.bulan_tahun.split('-')
                  const monthName = MONTH_NAMES[parseInt(month, 10) - 1]

                  return (
                    <TableRow key={item.id} className="border-slate-100 hover:bg-slate-50">
                      <TableCell>
                        <p className="font-semibold text-slate-900 text-sm">{item.profile.nama_lengkap}</p>
                        <p className="text-slate-500 text-xs">{item.profile.no_hp || '—'}</p>
                      </TableCell>
                      <TableCell className="text-blue-600 font-medium text-sm">
                        {monthName} {year}
                      </TableCell>
                      <TableCell className="font-mono text-emerald-600 font-semibold text-sm">
                        Rp {Number(item.nominal).toLocaleString('id-ID')}
                      </TableCell>
                      <TableCell className="text-slate-500 text-xs">
                        {new Date(item.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => setSelectedItem(item)}
                          className="bg-blue-600 hover:bg-blue-500 text-white text-xs gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Review Bukti
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <ReviewModal
        item={selectedItem}
        open={!!selectedItem}
        onClose={() => setSelectedItem(null)}
      />
    </div>
  )
}
