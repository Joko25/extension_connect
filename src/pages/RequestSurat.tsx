import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  FileText, Loader2, CheckCircle2, XCircle, Clock, ExternalLink, Plus,
} from 'lucide-react'
import { toast } from '@/hooks/useToast'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  useMyLetters, useCreateLetter, useLetterPdfUrl, JENIS_SURAT_LIST,
} from '@/hooks/useLetters'
import type { StatusSurat } from '@/types/database.types'

const STATUS_META: Record<StatusSurat, { label: string; class: string; icon: typeof Clock }> = {
  pending: { label: 'Menunggu', class: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
  approved: { label: 'Disetujui', class: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  rejected: { label: 'Ditolak', class: 'bg-red-50 text-red-700 border-red-200', icon: XCircle },
}

const schema = z.object({
  jenis_surat: z.string().min(1, 'Pilih jenis surat'),
  keterangan: z.string().min(5, 'Keterangan minimal 5 karakter').max(500, 'Maksimal 500 karakter'),
})
type FormData = z.infer<typeof schema>

function StatusBadge({ status }: { status: StatusSurat }) {
  const m = STATUS_META[status]
  const Icon = m.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${m.class}`}>
      <Icon className="w-3 h-3" />
      {m.label}
    </span>
  )
}

function PdfLink({ path, label }: { path: string | null; label: string }) {
  const { data: url, isLoading, error } = useLetterPdfUrl(path)
  if (!path) return null
  if (isLoading) return <Skeleton className="h-5 w-32 bg-slate-100" />
  if (error || !url) return <span className="text-red-600 text-sm">Gagal memuat</span>
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-sm font-medium"
    >
      <ExternalLink className="w-3.5 h-3.5" />
      {label}
    </a>
  )
}

export default function RequestSurat() {
  const { profile } = useAuth()
  const [open, setOpen] = useState(false)
  const { data: letters = [], isLoading } = useMyLetters(profile?.id)
  const createLetter = useCreateLetter()

  // Admin (sekretaris/ketua_rt) melihat CMS surat menyurat, bukan halaman warga
  if (profile && (profile.role === 'sekretaris' || profile.role === 'ketua_rt')) {
    return <Navigate to="/admin/surat" replace />
  }

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const jenis = watch('jenis_surat')

  async function onSubmit(data: FormData) {
    if (!profile) return
    try {
      await createLetter.mutateAsync({
        profileId: profile.id,
        jenisSurat: data.jenis_surat,
        keterangan: data.keterangan,
      })
      toast({ title: 'Permohonan surat terkirim', description: 'Pengurus akan memproses permohonan Anda.' })
      setOpen(false)
      reset()
    } catch {
      toast({ title: 'Gagal mengirim permohonan', variant: 'destructive' })
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 sm:py-5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900">Request Surat</h1>
              <p className="text-slate-500 text-xs sm:text-sm">
                Ajukan permohonan surat keterangan dan pantau statusnya
              </p>
            </div>
          </div>
          <Button onClick={() => setOpen(true)} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white">
            <Plus className="w-4 h-4 mr-2" />
            Ajukan Surat
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5">
                <Skeleton className="h-4 w-48 bg-slate-100 mb-2" />
                <Skeleton className="h-3 w-72 bg-slate-50" />
              </div>
            ))}
          </div>
        ) : letters.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-14 text-center space-y-3">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 rounded-full">
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
            <p className="text-slate-900 font-medium">Belum ada permohonan surat</p>
            <p className="text-slate-500 text-sm">
              Klik "Ajukan Surat" untuk membuat permohonan baru.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {letters.map((l) => (
              <div key={l.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-slate-900">{l.jenis_surat}</h3>
                      <StatusBadge status={l.status} />
                    </div>
                    <p className="text-slate-500 text-sm mt-1.5">{l.keterangan}</p>
                    <p className="text-slate-400 text-xs mt-2">
                      Diajukan{' '}
                      {new Date(l.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric', month: 'long', year: 'numeric',
                      })}
                    </p>
                  </div>
                  {l.status === 'approved' && l.pdf_url && (
                    <div className="shrink-0">
                      <PdfLink path={l.pdf_url} label="Unduh Surat" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Ajukan Surat */}
      <Dialog open={open} onOpenChange={(v) => { if (!v) { setOpen(false); reset() } }}>
        <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-slate-900">Ajukan Permohonan Surat</DialogTitle>
            <DialogDescription className="text-slate-500">
              Pilih jenis surat dan isi keterangan permohonan Anda.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-slate-800">Jenis Surat</Label>
              <Select
                value={jenis}
                onValueChange={(v) => setValue('jenis_surat', v, { shouldValidate: true })}
              >
                <SelectTrigger className="bg-slate-100 border-slate-300 text-slate-900">
                  <SelectValue placeholder="Pilih jenis surat" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  {JENIS_SURAT_LIST.map((j) => (
                    <SelectItem key={j} value={j} className="text-slate-900 focus:bg-slate-100">
                      {j}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.jenis_surat && <p className="text-red-600 text-xs">{errors.jenis_surat.message}</p>}
            </div>

            <div className="space-y-2">
              <Label className="text-slate-800">Keterangan</Label>
              <textarea
                {...register('keterangan')}
                placeholder="Jelaskan keperluan surat ini..."
                rows={4}
                className="w-full bg-slate-100 border border-slate-300 text-slate-900 placeholder:text-slate-400 rounded-lg px-3 py-2 text-sm focus:border-blue-400 focus:ring-blue-400/20 focus:outline-none"
              />
              {errors.keterangan && <p className="text-red-600 text-xs">{errors.keterangan.message}</p>}
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => { setOpen(false); reset() }}
                className="border-slate-300 text-slate-700 hover:bg-slate-100"
                disabled={createLetter.isPending}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={createLetter.isPending}
                className="bg-blue-600 hover:bg-blue-500 text-white"
              >
                {createLetter.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Kirim Permohonan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
