import { useState, useRef } from 'react'
import { UploadCloud, CheckCircle2, Clock, XCircle, FileText, Loader2, ArrowLeft, Image as ImageIcon } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useMyContributions, useSubmitIuran, useProofSignedUrl } from '@/hooks/useIuran'
import { useIuranRekening } from '@/hooks/useSettings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/hooks/useToast'
import { Link } from 'react-router-dom'
import type { StatusPembayaran } from '@/types/database.types'

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

const STATUS_BADGE_VARIANTS: Record<StatusPembayaran, { label: string; class: string; icon: typeof Clock }> = {
  pending: { label: 'Menunggu Verifikasi', class: 'bg-amber-500/15 text-amber-600 border-amber-500/30', icon: Clock },
  approved: { label: 'Disetujui', class: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30', icon: CheckCircle2 },
  rejected: { label: 'Ditolak', class: 'bg-red-500/15 text-red-600 border-red-500/30', icon: XCircle },
}

function ProofImageModal({ path, open, onClose }: { path: string | null; open: boolean; onClose: () => void }) {
  const { data: signedUrl, isLoading } = useProofSignedUrl(path)

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-slate-900">Bukti Transfer</DialogTitle>
        </DialogHeader>
        <div className="flex items-center justify-center p-4 min-h-[250px]">
          {isLoading ? (
            <Skeleton className="w-full h-64 bg-slate-100 rounded-lg animate-pulse" />
          ) : signedUrl ? (
            <img src={signedUrl} alt="Bukti Transfer" className="max-h-96 rounded-lg object-contain" />
          ) : (
            <p className="text-slate-500 text-sm">Gagal memuat gambar</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-slate-300 text-slate-700 hover:bg-slate-100">
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function BayarIuran() {
  const { profile } = useAuth()
  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear())
  const [nominal, setNominal] = useState<string>('50000')
  const [file, setFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [viewProofPath, setViewProofPath] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: history = [], isLoading } = useMyContributions(profile?.id)
  const submitIuran = useSubmitIuran()
  const rekening = useIuranRekening()

  const handleFileChange = (selectedFile: File | null) => {
    if (!selectedFile) return
    if (!selectedFile.type.startsWith('image/')) {
      toast({ title: 'Format tidak mendukung', description: 'File harus berupa gambar (JPG, PNG, WebP)', variant: 'destructive' })
      return
    }
    if (selectedFile.size > 5 * 1024 * 1024) {
      toast({ title: 'Ukuran file terlalu besar', description: 'Maksimal ukuran file adalah 5MB', variant: 'destructive' })
      return
    }
    setFile(selectedFile)
    const reader = new FileReader()
    reader.onloadend = () => setFilePreview(reader.result as string)
    reader.readAsDataURL(selectedFile)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return
    if (!file) {
      toast({ title: 'Bukti transfer wajib diunggah', variant: 'destructive' })
      return
    }

    const bulanTahun = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`
    const numNominal = Number(nominal)

    if (isNaN(numNominal) || numNominal <= 0) {
      toast({ title: 'Nominal tidak valid', variant: 'destructive' })
      return
    }

    // Cek apakah bulan ini sudah pernah di-submit & status bukan rejected
    const existing = history.find((h) => h.bulan_tahun === bulanTahun)
    if (existing && existing.status_pembayaran !== 'rejected') {
      toast({
        title: 'Iuran sudah diajukan',
        description: `Pembayaran iuran untuk bulan ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear} sudah ada dengan status ${STATUS_BADGE_VARIANTS[existing.status_pembayaran].label}.`,
        variant: 'destructive',
      })
      return
    }

    try {
      await submitIuran.mutateAsync({
        profileId: profile.id,
        bulanTahun,
        nominal: numNominal,
        proofFile: file,
      })

      toast({ title: 'Iuran berhasil dikirim!', description: 'Menunggu konfirmasi dan verifikasi dari Bendahara.' })
      setFile(null)
      setFilePreview(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err: any) {
      toast({ title: 'Gagal mengirim pembayaran', description: err.message, variant: 'destructive' })
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Link to="/dashboard" className="text-slate-500 hover:text-slate-900 transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-xl font-bold text-slate-900">Pembayaran Iuran Bulanan</h1>
            </div>
            <p className="text-slate-500 text-sm ml-8">
              Upload bukti transfer iuran kebersihan & keamanan RT
            </p>
          </div>
          <Link to="/cashflow">
            <Button variant="outline" className="border-slate-200 text-slate-800 hover:bg-slate-50 text-sm">
              <FileText className="w-4 h-4 mr-2 text-blue-600" />
              Laporan Cashflow
            </Button>
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Card */}
        <div className="lg:col-span-1 space-y-6">
          {/* Rekening Tujuan Pembayaran */}
          {rekening.nomor && (
            <div className="bg-gradient-to-br from-blue-600 to-blue-500 rounded-2xl p-5 text-white shadow-lg shadow-blue-600/25">
              <p className="text-blue-100 text-xs font-semibold uppercase tracking-wider">
                Transfer Pembayaran Iuran
              </p>
              <div className="mt-3 space-y-1">
                <p className="text-white/80 text-xs">{rekening.bank || 'Rekening Bank'}</p>
                <p className="text-2xl font-bold font-mono tracking-wide">{rekening.nomor}</p>
                {rekening.atas_nama && (
                  <p className="text-blue-100 text-xs mt-1">a.n. {rekening.atas_nama}</p>
                )}
              </div>
              <p className="text-blue-100/70 text-[11px] mt-3">
                Transfer ke nomor di atas lalu unggah bukti pembayaran.
              </p>
            </div>
          )}

          <div className="bg-white/60 border border-slate-200 rounded-2xl p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Form Bayar Iuran</h2>
            <p className="text-slate-500 text-xs mt-0.5">Isi detail pembayaran dan bukti transfer</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Periode Bulan & Tahun */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-slate-800 text-xs">Bulan</Label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="w-full h-10 rounded-md bg-slate-100 border border-slate-300 px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {MONTH_NAMES.map((m, idx) => (
                    <option key={m} value={idx + 1} className="bg-white text-slate-900">
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-slate-800 text-xs">Tahun</Label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="w-full h-10 rounded-md bg-slate-100 border border-slate-300 px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
                    <option key={y} value={y} className="bg-white text-slate-900">
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Nominal */}
            <div className="space-y-1.5">
              <Label className="text-slate-800 text-xs">Nominal Iuran (Rp)</Label>
              <Input
                type="number"
                value={nominal}
                onChange={(e) => setNominal(e.target.value)}
                className="bg-slate-100 border-slate-300 text-slate-900 h-10 font-semibold"
                placeholder="50000"
              />
            </div>

            {/* Drag & Drop Upload */}
            <div className="space-y-1.5">
              <Label className="text-slate-800 text-xs">Bukti Transfer (Foto/Screenshot)</Label>
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                  isDragging ? 'border-blue-400 bg-blue-500/10' : 'border-slate-300 hover:border-blue-400 bg-slate-50'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
                  accept="image/*"
                  className="hidden"
                />

                {filePreview ? (
                  <div className="relative group">
                    <img src={filePreview} alt="Preview" className="max-h-36 mx-auto rounded-lg object-contain" />
                    <p className="text-xs text-slate-500 mt-2">{file?.name}</p>
                    <p className="text-xs text-blue-600 mt-1 underline">Klik untuk mengganti gambar</p>
                  </div>
                ) : (
                  <div className="space-y-2 py-3">
                    <UploadCloud className="w-8 h-8 mx-auto text-slate-500" />
                    <div>
                      <p className="text-xs font-medium text-slate-900">Tarik & lepas file di sini</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Atau klik untuk memilih file (Maks 5MB)</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={submitIuran.isPending}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white h-11 font-medium shadow-lg shadow-blue-500/25 mt-2"
            >
              {submitIuran.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Mengirim...
                </>
              ) : (
                'Kirim Bukti Pembayaran'
              )}
            </Button>
          </form>
        </div>
        </div>

        {/* History Table Card */}
        <div className="lg:col-span-2 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Riwayat Pembayaran Anda</h2>
            <p className="text-slate-500 text-xs">Daftar transaksi iuran yang pernah Anda ajukan</p>
          </div>

          <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-200 hover:bg-transparent">
                  <TableHead className="text-slate-500 text-xs">Periode</TableHead>
                  <TableHead className="text-slate-500 text-xs">Nominal</TableHead>
                  <TableHead className="text-slate-500 text-xs">Status</TableHead>
                  <TableHead className="text-slate-500 text-xs">Tanggal Kirim</TableHead>
                  <TableHead className="text-slate-500 text-xs text-right">Bukti</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i} className="border-slate-100">
                      <TableCell><Skeleton className="h-4 w-20 bg-slate-100" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16 bg-slate-100" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24 rounded-full bg-slate-100" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24 bg-slate-100" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto rounded-lg bg-slate-100" /></TableCell>
                    </TableRow>
                  ))
                ) : history.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-slate-400 text-sm">
                      Belum ada riwayat pembayaran iuran
                    </TableCell>
                  </TableRow>
                ) : (
                  history.map((item) => {
                    const [year, month] = item.bulan_tahun.split('-')
                    const monthName = MONTH_NAMES[parseInt(month, 10) - 1]
                    const statusMeta = STATUS_BADGE_VARIANTS[item.status_pembayaran]
                    const StatusIcon = statusMeta.icon

                    return (
                      <TableRow key={item.id} className="border-slate-100 hover:bg-slate-50">
                        <TableCell className="font-medium text-slate-900 text-sm">
                          {monthName} {year}
                        </TableCell>
                        <TableCell className="text-slate-800 font-mono text-sm">
                          Rp {Number(item.nominal).toLocaleString('id-ID')}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusMeta.class}`}>
                            <StatusIcon className="w-3 h-3" />
                            {statusMeta.label}
                          </span>
                          {item.status_pembayaran === 'rejected' && item.catatan && (
                            <p className="text-xs text-red-600 mt-1 italic">Catatan: {item.catatan}</p>
                          )}
                        </TableCell>
                        <TableCell className="text-slate-500 text-xs">
                          {new Date(item.created_at).toLocaleDateString('id-ID', {
                            day: 'numeric', month: 'short', year: 'numeric'
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.proof_url ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setViewProofPath(item.proof_url)}
                              className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-500/20"
                              title="Lihat Foto Bukti"
                            >
                              <ImageIcon className="w-4 h-4" />
                            </Button>
                          ) : (
                            <span className="text-slate-300 text-xs italic">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <ProofImageModal
        path={viewProofPath}
        open={!!viewProofPath}
        onClose={() => setViewProofPath(null)}
      />
    </div>
  )
}
