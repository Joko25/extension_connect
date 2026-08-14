import { useState } from 'react'
import {
  FileText, Loader2, CheckCircle2, XCircle, Clock, ExternalLink, Upload, UserCheck, UserX,
} from 'lucide-react'
import { toast } from '@/hooks/useToast'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  useAllLetters, useUpdateLetterStatus, useLetterPdfUrl, GENERATED_PDF_BUCKET,
  type LetterWithProfile,
} from '@/hooks/useLetters'
import type { StatusSurat } from '@/types/database.types'

const STATUS_META: Record<StatusSurat, { label: string; class: string }> = {
  pending: { label: 'Menunggu', class: 'bg-amber-50 text-amber-700 border-amber-200' },
  approved: { label: 'Disetujui', class: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  rejected: { label: 'Ditolak', class: 'bg-red-50 text-red-700 border-red-200' },
}

const TABS: { key: StatusSurat | 'all'; label: string }[] = [
  { key: 'all', label: 'Semua' },
  { key: 'pending', label: 'Menunggu' },
  { key: 'approved', label: 'Disetujui' },
  { key: 'rejected', label: 'Ditolak' },
]

function PdfLink({ path }: { path: string | null }) {
  const { data: url, isLoading } = useLetterPdfUrl(path)
  if (!path) return null
  if (isLoading) return <Skeleton className="h-5 w-20 bg-slate-100" />
  if (!url) return <span className="text-red-600 text-xs">Gagal</span>
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-xs font-medium">
      <ExternalLink className="w-3.5 h-3.5" /> PDF
    </a>
  )
}

function ApproveDialog({ letter, onClose }: { letter: LetterWithProfile | null; onClose: () => void }) {
  const { profile } = useAuth()
  const updateStatus = useUpdateLetterStatus()
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  async function handleApprove() {
    if (!letter) return
    let pdfUrl: string | null = null

    // Upload PDF (opsional) jika admin melampirkan file
    if (file) {
      setUploading(true)
      const path = `${letter.profile.user_id}/${letter.id}.pdf`
      const { error: upErr } = await supabase.storage
        .from(GENERATED_PDF_BUCKET)
        .upload(path, file, { upsert: true })
      setUploading(false)
      if (upErr) {
        toast({ title: 'Gagal upload PDF', description: upErr.message, variant: 'destructive' })
        return
      }
      pdfUrl = path
    }

    try {
      await updateStatus.mutateAsync({
        letterId: letter.id,
        status: 'approved',
        reviewerId: profile?.id ?? '',
        pdfUrl,
      })
      toast({ title: 'Permohonan disetujui', description: `Surat ${letter.jenis_surat} milik ${letter.profile.nama_lengkap}` })
      onClose()
    } catch {
      toast({ title: 'Gagal menyetujui permohonan', variant: 'destructive' })
    }
  }

  return (
    <Dialog open={!!letter} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-slate-900">Setujui Permohonan</DialogTitle>
          <DialogDescription className="text-slate-500">
            {letter?.jenis_surat} — {letter?.profile.nama_lengkap}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="bg-slate-50 rounded-lg px-4 py-3 text-sm text-slate-600">
            {letter?.keterangan}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-800 mb-1.5">
              Lampirkan PDF Surat (Opsional)
            </label>
            <label className={`flex flex-col items-center justify-center gap-1 border-2 border-dashed rounded-xl px-4 py-5 cursor-pointer transition-colors ${file ? 'border-emerald-300 bg-emerald-50' : 'border-slate-300 bg-slate-50 hover:border-blue-400'}`}>
              <Upload className="w-5 h-5 text-slate-400" />
              {file ? (
                <p className="text-sm text-slate-700 font-medium">{file.name}</p>
              ) : (
                <p className="text-sm text-slate-500">Klik untuk pilih file PDF</p>
              )}
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={updateStatus.isPending || uploading} className="border-slate-300 text-slate-700 hover:bg-slate-100">
            Batal
          </Button>
          <Button onClick={handleApprove} disabled={updateStatus.isPending || uploading} className="bg-emerald-600 hover:bg-emerald-500 text-white">
            {(updateStatus.isPending || uploading) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Setujui
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RejectDialog({ letter, onClose }: { letter: LetterWithProfile | null; onClose: () => void }) {
  const { profile } = useAuth()
  const updateStatus = useUpdateLetterStatus()

  async function handleReject() {
    if (!letter) return
    try {
      await updateStatus.mutateAsync({
        letterId: letter.id,
        status: 'rejected',
        reviewerId: profile?.id ?? '',
      })
      toast({ title: 'Permohonan ditolak', description: `Surat ${letter.jenis_surat} milik ${letter.profile.nama_lengkap}` })
      onClose()
    } catch {
      toast({ title: 'Gagal menolak permohonan', variant: 'destructive' })
    }
  }

  return (
    <Dialog open={!!letter} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-slate-900">Tolak Permohonan</DialogTitle>
          <DialogDescription className="text-slate-500">
            {letter?.jenis_surat} — {letter?.profile.nama_lengkap}
          </DialogDescription>
        </DialogHeader>

        <div className="bg-slate-50 rounded-lg px-4 py-3 text-sm text-slate-600">
          {letter?.keterangan}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={updateStatus.isPending} className="border-slate-300 text-slate-700 hover:bg-slate-100">
            Batal
          </Button>
          <Button onClick={handleReject} disabled={updateStatus.isPending} className="bg-red-600 hover:bg-red-500 text-white">
            {updateStatus.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Tolak
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function SuratMenyurat() {
  const [tab, setTab] = useState<StatusSurat | 'all'>('pending')
  const [approveLetter, setApproveLetter] = useState<LetterWithProfile | null>(null)
  const [rejectLetter, setRejectLetter] = useState<LetterWithProfile | null>(null)

  const { data: letters = [], isLoading } = useAllLetters(tab === 'all' ? undefined : tab)
  const { data: allLetters = [] } = useAllLetters()

  const count = (s: StatusSurat | 'all') =>
    s === 'all' ? allLetters.length : allLetters.filter((l) => l.status === s).length

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 sm:py-5">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900">CMS Surat Menyurat</h1>
              <p className="text-slate-500 text-xs sm:text-sm">Kelola dan proses permohonan surat dari warga</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-5 overflow-x-auto border-b border-slate-200">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg whitespace-nowrap transition-colors ${tab === t.key ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {t.label} ({count(t.key)})
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5">
                <Skeleton className="h-4 w-52 bg-slate-100 mb-2" />
                <Skeleton className="h-3 w-80 bg-slate-50" />
              </div>
            ))}
          </div>
        ) : letters.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-14 text-center space-y-2">
            <p className="text-slate-400">Tidak ada permohonan pada tab ini</p>
          </div>
        ) : (
          <div className="space-y-3">
            {letters.map((l) => {
              const m = STATUS_META[l.status]
              return (
                <div key={l.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-slate-900">{l.jenis_surat}</h3>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${m.class}`}>
                          {l.status === 'approved' ? <CheckCircle2 className="w-3 h-3" /> : l.status === 'rejected' ? <XCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {m.label}
                        </span>
                        {l.pdf_url && <PdfLink path={l.pdf_url} />}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                        <span className="text-slate-500">Nama: <span className="text-slate-900 font-medium">{l.profile.nama_lengkap}</span></span>
                        <span className="text-slate-500">NIK: <span className="text-slate-900 font-medium font-mono">{l.profile.nik}</span></span>
                        <span className="text-slate-500">Diajukan: <span className="text-slate-900 font-medium">{new Date(l.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span></span>
                      </div>
                      <p className="text-slate-500 text-sm mt-2">{l.keterangan}</p>
                    </div>
                    {l.status === 'pending' && (
                      <div className="flex gap-2 shrink-0">
                        <Button onClick={() => setApproveLetter(l)} className="bg-emerald-600 hover:bg-emerald-500 text-white">
                          <UserCheck className="w-4 h-4 mr-2" /> Setujui
                        </Button>
                        <Button variant="outline" onClick={() => setRejectLetter(l)} className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700">
                          <UserX className="w-4 h-4 mr-2" /> Tolak
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <ApproveDialog letter={approveLetter} onClose={() => setApproveLetter(null)} />
      <RejectDialog letter={rejectLetter} onClose={() => setRejectLetter(null)} />
    </div>
  )
}
