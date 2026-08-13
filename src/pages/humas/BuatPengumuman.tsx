import { useRef, useState } from 'react'
import {
  ArrowLeft,
  Loader2,
  Sparkles,
  Upload,
  Megaphone,
  Wand2,
  ImageIcon,
  CheckCircle2,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { toast } from '@/hooks/useToast'
import { supabase } from '@/lib/supabase'
import {
  usePublishAnnouncement,
  uploadFlyerManual,
} from '@/hooks/useAnnouncements'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const KATEGORI_LIST = ['umum', 'keamanan', 'kebersihan', 'acara', 'lainnya']

const KATEGORI_LABELS: Record<string, string> = {
  umum: 'Umum',
  keamanan: 'Keamanan',
  kebersihan: 'Kebersihan',
  acara: 'Acara',
  lainnya: 'Lainnya',
}

export default function BuatPengumuman() {
  const { profile } = useAuth()

  const [judul, setJudul] = useState('')
  const [kategori, setKategori] = useState('umum')
  const [agenda, setAgenda] = useState('')

  const [isGenerating, setIsGenerating] = useState(false)
  const [isUploadingManual, setIsUploadingManual] = useState(false)
  const [flyerUrl, setFlyerUrl] = useState<string | null>(null)
  const [flyerSource, setFlyerSource] = useState<'ai' | 'manual' | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const publishMutation = usePublishAnnouncement()

  const hasRequired = judul.trim() !== '' && agenda.trim() !== ''

  async function handleGenerateFlyer() {
    if (!hasRequired) {
      toast({
        title: 'Data belum lengkap',
        description: 'Judul dan detail agenda wajib diisi terlebih dahulu.',
        variant: 'destructive',
      })
      return
    }

    setIsGenerating(true)
    setFlyerUrl(null)
    setFlyerSource(null)

    try {
      const { data, error } = await supabase.functions.invoke('generate-flyer', {
        body: { judul, agenda, kategori },
      })

      if (error) {
        throw new Error(error.message || 'Gagal memanggil layanan AI')
      }

      const url = data?.url
      if (!url) {
        throw new Error('Layanan AI tidak mengembalikan gambar')
      }

      setFlyerUrl(url)
      setFlyerSource('ai')
      toast({
        title: 'Flyer berhasil dibuat!',
        description: 'Preview flyer AI sudah tersedia di bawah.',
      })
    } catch (err) {
      toast({
        title: 'Gagal membuat flyer',
        description: err instanceof Error ? err.message : 'Terjadi kesalahan',
        variant: 'destructive',
      })
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleManualFileChange(file: File | undefined) {
    if (!file) return
    if (!profile) return

    if (!file.type.startsWith('image/')) {
      toast({ title: 'File tidak valid', description: 'Pilih file gambar (PNG/JPG).', variant: 'destructive' })
      return
    }

    setIsUploadingManual(true)
    try {
      const url = await uploadFlyerManual(profile.id, file)
      setFlyerUrl(url)
      setFlyerSource('manual')
      toast({ title: 'Flyer berhasil diunggah!', description: 'Flyer manual siap dipublikasikan.' })
    } catch (err) {
      toast({
        title: 'Upload gagal',
        description: err instanceof Error ? err.message : 'Terjadi kesalahan',
        variant: 'destructive',
      })
    } finally {
      setIsUploadingManual(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handlePublish() {
    if (!profile) return
    if (!hasRequired) {
      toast({ title: 'Data belum lengkap', description: 'Judul dan agenda wajib diisi.', variant: 'destructive' })
      return
    }

    try {
      await publishMutation.mutateAsync({
        judul: judul.trim(),
        isi: agenda.trim(),
        kategori,
        flyerUrl,
        createdBy: profile.id,
      })
      toast({
        title: 'Pengumuman dipublikasikan!',
        description: 'Warga RT kini dapat melihat pengumuman ini.',
      })
      setJudul('')
      setAgenda('')
      setFlyerUrl(null)
      setFlyerSource(null)
    } catch (err) {
      toast({
        title: 'Gagal mempublikasikan',
        description: err instanceof Error ? err.message : 'Terjadi kesalahan',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <Link to="/dashboard" className="text-slate-500 hover:text-slate-900 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <Megaphone className="w-4 h-4 text-purple-600" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Buat Pengumuman</h1>
          </div>
          <p className="text-slate-500 text-sm ml-11">
            Buat pengumuman & generate flyer otomatis dengan AI untuk warga RT
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ─── Form Kiri ─── */}
          <div className="space-y-5">
            {/* Judul */}
            <div className="space-y-2">
              <Label className="text-slate-800">Judul Pengumuman</Label>
              <Input
                value={judul}
                onChange={(e) => setJudul(e.target.value)}
                placeholder="Contoh: Kerja Bakti Akhir Bulan"
                className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-purple-500/50"
              />
            </div>

            {/* Kategori */}
            <div className="space-y-2">
              <Label className="text-slate-800">Kategori Pengumuman</Label>
              <Select value={kategori} onValueChange={setKategori}>
                <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-900 h-10">
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

            {/* Agenda */}
            <div className="space-y-2">
              <Label className="text-slate-800">Detail Agenda</Label>
              <Textarea
                value={agenda}
                onChange={(e) => setAgenda(e.target.value)}
                placeholder="Tuliskan detail kegiatan, waktu, tempat, dan informasi penting lainnya..."
                className="min-h-[140px] bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-purple-500/50 resize-none"
              />
            </div>

            {/* Tombol Generate AI */}
            <Button
              onClick={handleGenerateFlyer}
              disabled={isGenerating}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/25"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Menghasilkan flyer dengan AI...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Generate Flyer via AI
                </>
              )}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-slate-50 px-3 text-xs text-slate-400 uppercase tracking-wider">atau</span>
              </div>
            </div>

            {/* Upload Manual */}
            <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleManualFileChange(e.target.files?.[0])}
              />
              <Button
                type="button"
                variant="outline"
                disabled={isUploadingManual}
                onClick={() => fileInputRef.current?.click()}
                className="border-slate-300 text-slate-800 hover:bg-slate-50 hover:text-slate-900"
              >
                {isUploadingManual ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Mengunggah...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Flyer Manual
                  </>
                )}
              </Button>
              <p className="text-slate-400 text-xs mt-2">
                Upload gambar flyer sendiri jika tidak ingin memakai AI
              </p>
            </div>
          </div>

          {/* ─── Preview Kanan ─── */}
          <div className="space-y-3">
            <Label className="text-slate-800">Preview Flyer</Label>

            {isGenerating ? (
              <div className="space-y-3">
                <Skeleton className="w-full aspect-square bg-slate-50 rounded-2xl" />
                <Skeleton className="w-3/4 h-4 bg-slate-100" />
                <Skeleton className="w-1/2 h-4 bg-slate-100" />
              </div>
            ) : flyerUrl ? (
              <div className="space-y-3">
                <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white">
                  <img
                    src={flyerUrl}
                    alt="Preview Flyer"
                    className="w-full aspect-square object-cover"
                  />
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border ${
                      flyerSource === 'ai'
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}
                  >
                    {flyerSource === 'ai' ? (
                      <Sparkles className="w-3 h-3" />
                    ) : (
                      <ImageIcon className="w-3 h-3" />
                    )}
                    {flyerSource === 'ai' ? 'Dibuat oleh AI' : 'Upload manual'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 aspect-square flex flex-col items-center justify-center text-center p-6 bg-white/[0.02]">
                <ImageIcon className="w-10 h-10 text-slate-300 mb-3" />
                <p className="text-slate-400 text-sm">
                  Flyer akan tampil di sini
                </p>
                <p className="text-slate-300 text-xs mt-1">
                  Generate dengan AI atau upload manual
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ─── Tombol Publikasi ─── */}
        <div className="pt-4 border-t border-slate-200">
          <Button
            onClick={handlePublish}
            disabled={publishMutation.isPending}
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25 h-11 px-8"
          >
            {publishMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Mempublikasikan...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Publikasikan Pengumuman
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
