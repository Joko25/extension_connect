import { useState, useRef } from 'react'
import { MessageSquare, Send, Loader2, Info, ImageIcon, X } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useThreads, useCreateThread, useDeleteThread, validateThreadImage } from '@/hooks/useThreads'
import { toast } from '@/hooks/useToast'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import ThreadCard from '@/components/ThreadCard'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const KATEGORI_LIST = ['umum', 'informasi', 'diskusi', 'keluhan', 'lainnya']
const KATEGORI_LABELS: Record<string, string> = {
  umum: 'Umum',
  informasi: 'Informasi',
  diskusi: 'Diskusi',
  keluhan: 'Keluhan',
  lainnya: 'Lainnya',
}

export default function Threads() {
  const { profile } = useAuth()
  const [konten, setKonten] = useState('')
  const [kategori, setKategori] = useState('umum')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: threads = [], isLoading } = useThreads()
  const createThread = useCreateThread()
  const deleteThread = useDeleteThread()

  const myProfileId = profile?.id

  function handleSelectFile(file: File | undefined) {
    if (!file) return
    const err = validateThreadImage(file)
    if (err) {
      toast({ title: 'File tidak valid', description: err, variant: 'destructive' })
      return
    }
    setImageFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleRemoveImage() {
    setImageFile(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
  }

  async function handleSubmit() {
    if (!profile) return
    const text = konten.trim()
    if (!text) {
      toast({ title: 'Postingan kosong', description: 'Tuliskan sesuatu terlebih dahulu.', variant: 'destructive' })
      return
    }

    try {
      await createThread.mutateAsync({
        authorId: profile.id,
        konten: text,
        kategori,
        file: imageFile,
      })
      setKonten('')
      setKategori('umum')
      handleRemoveImage()
      toast({ title: 'Postingan terbit', description: 'Thread berhasil dipublikasikan untuk warga.' })
    } catch (err) {
      toast({
        title: 'Gagal memposting',
        description: err instanceof Error ? err.message : 'Terjadi kesalahan',
        variant: 'destructive',
      })
    }
  }

  function handleDelete(threadId: string) {
    deleteThread.mutateAsync({ threadId })
      .then(() => toast({ title: 'Thread dihapus' }))
      .catch((err) =>
        toast({
          title: 'Gagal menghapus',
          description: err instanceof Error ? err.message : 'Terjadi kesalahan',
          variant: 'destructive',
        })
      )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-5">
        {/* Judul */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Thread Warga</h1>
            <p className="text-slate-500 text-xs">Bagikan informasi dan diskusi dengan warga RT</p>
          </div>
        </div>

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-3">
          <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
          <p className="text-blue-100/70 text-xs leading-relaxed">
            Jaga sopan santun dan hindari menyebarkan informasi pribadi atau hoaks. Postingan dapat dihapus oleh pemiliknya.
          </p>
        </div>

        {/* Komposer */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-slate-800 text-sm">Buat Postingan</Label>
            <Select value={kategori} onValueChange={setKategori}>
              <SelectTrigger className="w-[150px] h-8 bg-slate-50 border-slate-200 text-slate-900 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200">
                {KATEGORI_LIST.map((k) => (
                  <SelectItem key={k} value={k} className="text-slate-900 focus:bg-slate-100">
                    {KATEGORI_LABELS[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Textarea
            value={konten}
            onChange={(e) => setKonten(e.target.value)}
            placeholder="Tuliskan postingan Anda untuk warga RT..."
            className="min-h-[100px] bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-500/50 resize-none"
          />

          {/* Lampiran gambar */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleSelectFile(e.target.files?.[0])}
          />

          {previewUrl ? (
            <div className="relative rounded-xl overflow-hidden border border-slate-200">
              <img src={previewUrl} alt="Pratinjau lampiran" className="w-full max-h-64 object-cover" />
              <button
                onClick={handleRemoveImage}
                className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1.5 hover:bg-red-500/80 transition-colors"
                aria-label="Hapus lampiran"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 self-start"
            >
              <ImageIcon className="w-4 h-4 mr-1.5" />
              Lampirkan Gambar
            </Button>
          )}

          <div className="flex justify-end">
            <Button
              onClick={handleSubmit}
              disabled={createThread.isPending}
              className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/25"
            >
              {createThread.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Memposting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Posting
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Daftar thread */}
        <div className="space-y-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-full bg-slate-100" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-3.5 w-32 bg-slate-100" />
                    <Skeleton className="h-3 w-20 bg-slate-50" />
                  </div>
                </div>
                <Skeleton className="h-3 w-full bg-slate-50" />
                <Skeleton className="h-3 w-2/3 bg-slate-50" />
              </div>
            ))
          ) : threads.length === 0 ? (
            <div className="text-center py-16">
              <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-400">Belum ada postingan</p>
              <p className="text-slate-300 text-sm mt-1">Jadilah warga pertama yang membuat thread</p>
            </div>
          ) : (
            threads.map((thread) => (
              <ThreadCard
                key={thread.id}
                thread={thread}
                isOwner={myProfileId === thread.author_id}
                isDeleting={deleteThread.isPending && deleteThread.variables?.threadId === thread.id}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
