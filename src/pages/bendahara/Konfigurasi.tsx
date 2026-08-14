import { useState, useEffect } from 'react'
import { Landmark, Wallet, Save, Loader2, Building2, CreditCard, User, PiggyBank, AlertTriangle, RotateCcw, Home } from 'lucide-react'
import {
  useSettings, useSaveSettings, SETTING_KEYS, parseIuranRekening,
} from '@/hooks/useSettings'
import { useAuth, hasRole } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { formatRupiahInput, parseRupiahInput } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { toast } from '@/hooks/useToast'

export default function Konfigurasi() {
  const { profile } = useAuth()
  const { data: settings, isLoading, refetch } = useSettings()
  const saveSettings = useSaveSettings()

  const isKetua = hasRole(profile?.role, ['ketua_rt'])
  const [resetOpen, setResetOpen] = useState(false)
  const [resetting, setResetting] = useState(false)

  // Rekening
  const [bank, setBank] = useState('')
  const [nomor, setNomor] = useState('')
  const [atasNama, setAtasNama] = useState('')

  // Kas
  const [saldoAwal, setSaldoAwal] = useState('')

  // Perumahan
  const [namaPerumahan, setNamaPerumahan] = useState('')
  const [alamatPerumahan, setAlamatPerumahan] = useState('')

  // Isi form dari data settings saat tersedia
  useEffect(() => {
    if (!settings) return
    const rek = parseIuranRekening(settings[SETTING_KEYS.IURAN_REKENING])
    setBank(rek.bank)
    setNomor(rek.nomor)
    setAtasNama(rek.atas_nama)
    setSaldoAwal(settings[SETTING_KEYS.SALDO_AWAL] ?? '')
    setNamaPerumahan(settings[SETTING_KEYS.NAMA_PERUMAHAN] ?? '')
    setAlamatPerumahan(settings[SETTING_KEYS.ALAMAT_PERUMAHAN] ?? '')
  }, [settings])

  async function handleSaveRekening() {
    if (!bank.trim() || !nomor.trim()) {
      toast({ title: 'Data belum lengkap', description: 'Nama bank dan nomor rekening wajib diisi.', variant: 'destructive' })
      return
    }
    try {
      await saveSettings.mutateAsync({
        updates: [
          {
            key: SETTING_KEYS.IURAN_REKENING,
            value: JSON.stringify({ bank: bank.trim(), nomor: nomor.trim(), atas_nama: atasNama.trim() }),
          },
        ],
      })
      toast({ title: 'Rekening disimpan', description: 'Nomor rekening pembayaran iuran telah diperbarui.' })
    } catch (err) {
      toast({
        title: 'Gagal menyimpan',
        description: err instanceof Error ? err.message : 'Terjadi kesalahan',
        variant: 'destructive',
      })
    }
  }

  async function handleSaveKas() {
    const num = Number(saldoAwal)
    if (isNaN(num) || num < 0) {
      toast({ title: 'Saldo awal tidak valid', variant: 'destructive' })
      return
    }
    try {
      await saveSettings.mutateAsync({
        updates: [{ key: SETTING_KEYS.SALDO_AWAL, value: String(Math.round(num)) }],
      })
      toast({ title: 'Setup kas disimpan', description: 'Saldo awal kas telah diperbarui.' })
      refetch()
    } catch (err) {
      toast({
        title: 'Gagal menyimpan',
        description: err instanceof Error ? err.message : 'Terjadi kesalahan',
        variant: 'destructive',
      })
    }
  }

  const saving = saveSettings.isPending

  async function handleSavePerumahan() {
    if (!namaPerumahan.trim() || !alamatPerumahan.trim()) {
      toast({ title: 'Data belum lengkap', description: 'Nama dan alamat perumahan wajib diisi.', variant: 'destructive' })
      return
    }
    try {
      await saveSettings.mutateAsync({
        updates: [
          { key: SETTING_KEYS.NAMA_PERUMAHAN, value: namaPerumahan.trim() },
          { key: SETTING_KEYS.ALAMAT_PERUMAHAN, value: alamatPerumahan.trim() },
        ],
      })
      toast({ title: 'Detail perumahan disimpan', description: 'Nama dan alamat perumahan telah diperbarui.' })
    } catch (err) {
      toast({
        title: 'Gagal menyimpan',
        description: err instanceof Error ? err.message : 'Terjadi kesalahan',
        variant: 'destructive',
      })
    }
  }

  async function handleReset() {
    setResetting(true)
    try {
      const { error } = await supabase.rpc('reset_app_data')
      if (error) throw new Error(error.message)
      toast({ title: 'Data berhasil direset', description: 'Semua data terhapus, hanya akun Ketua RT yang tersisa.' })
      setResetOpen(false)
      refetch()
    } catch (err) {
      toast({
        title: 'Gagal reset data',
        description: err instanceof Error ? err.message : 'Terjadi kesalahan',
        variant: 'destructive',
      })
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-5">
        {/* Judul */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <Landmark className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Konfigurasi Aplikasi</h1>
            <p className="text-slate-500 text-xs">Atur nomor rekening iuran dan setup kas RT</p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-52 bg-slate-100 rounded-2xl" />
            <Skeleton className="h-44 bg-slate-100 rounded-2xl" />
          </div>
        ) : (
          <>
            {/* Detail Perumahan */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-5">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-indigo-500/15 rounded-xl flex items-center justify-center shrink-0">
                  <Home className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Detail Perumahan</h2>
                  <p className="text-slate-500 text-xs mt-0.5">
                    Nama dan alamat perumahan/komplek untuk identitas lingkungan RT.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-slate-800 text-xs">Nama Perumahan</Label>
                  <Input
                    value={namaPerumahan}
                    onChange={(e) => setNamaPerumahan(e.target.value)}
                    placeholder="Contoh: Perumahan Griya Asri"
                    className="bg-slate-100 border-slate-300 text-slate-900"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-800 text-xs">Alamat Perumahan</Label>
                  <textarea
                    value={alamatPerumahan}
                    onChange={(e) => setAlamatPerumahan(e.target.value)}
                    placeholder="Contoh: Jl. Merdeka No. 1, RT 04/RW 02, Kelurahan Sukamaju, Kecamatan Ciputat, Kota Tangerang Selatan"
                    rows={3}
                    className="w-full rounded-md bg-slate-100 border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleSavePerumahan}
                  disabled={saving}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Simpan Detail Perumahan
                </Button>
              </div>
            </section>

            {/* Rekening Iuran */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-5">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-blue-500/15 rounded-xl flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Nomor Rekening Iuran</h2>
                  <p className="text-slate-500 text-xs mt-0.5">
                    Rekening tujuan pembayaran iuran, ditampilkan pada halaman Bayar Iuran untuk warga.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-slate-800 text-xs">Nama Bank</Label>
                    <div className="relative">
                      <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <Input
                        value={bank}
                        onChange={(e) => setBank(e.target.value)}
                        placeholder="Contoh: Bank BCA"
                        className="bg-slate-100 border-slate-300 text-slate-900 pl-9"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-800 text-xs">Nomor Rekening</Label>
                    <Input
                      value={nomor}
                      onChange={(e) => setNomor(e.target.value)}
                      placeholder="Contoh: 1234567890"
                      className="bg-slate-100 border-slate-300 text-slate-900 font-mono"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-800 text-xs">Atas Nama (Opsional)</Label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      value={atasNama}
                      onChange={(e) => setAtasNama(e.target.value)}
                      placeholder="Contoh: Bendahara RT 04"
                      className="bg-slate-100 border-slate-300 text-slate-900 pl-9"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleSaveRekening}
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-500 text-white"
                >
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Simpan Rekening
                </Button>
              </div>
            </section>

            {/* Setup Kas */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-5">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-emerald-500/15 rounded-xl flex items-center justify-center shrink-0">
                  <PiggyBank className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Setup Kas (Saldo Awal)</h2>
                  <p className="text-slate-500 text-xs mt-0.5">
                    Isi saldo awal kas jika kas sudah berjalan sebelum aplikasi ini. Nilai ini ditambahkan ke total kas.
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-slate-800 text-xs">Saldo Awal Kas (Rp)</Label>
                <div className="relative">
                  <Wallet className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    inputMode="numeric"
                    value={formatRupiahInput(saldoAwal)}
                    onChange={(e) => setSaldoAwal(parseRupiahInput(e.target.value))}
                    placeholder="Contoh: 1500000"
                    className="bg-slate-100 border-slate-300 text-slate-900 font-semibold pl-9"
                  />
                </div>
                {saldoAwal !== '' && !isNaN(Number(saldoAwal)) && (
                  <p className="text-slate-400 text-xs">
                    = Rp {Number(saldoAwal).toLocaleString('id-ID')}
                  </p>
                )}
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleSaveKas}
                  disabled={saving}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Simpan Setup Kas
                </Button>
              </div>
            </section>

            {/* Reset Data (khusus Ketua RT) */}
            {isKetua && (
              <section className="rounded-2xl border border-red-200 bg-red-500/5 p-5 sm:p-6 space-y-5">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-red-500/15 rounded-xl flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">Reset Data Aplikasi</h2>
                    <p className="text-slate-500 text-xs mt-0.5">
                      Menghapus seluruh data warga, transaksi kas, iuran, surat, pengumuman, dan thread.
                      Hanya akun Ketua RT yang dipertahankan. Tindakan ini tidak dapat dibatalkan.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={() => setResetOpen(true)}
                    variant="destructive"
                    className="bg-red-600 hover:bg-red-500 text-white"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset Data
                  </Button>
                </div>
              </section>
            )}
          </>
        )}

        {/* Dialog konfirmasi reset */}
        <Dialog open={resetOpen} onOpenChange={(v) => !v && !resetting && setResetOpen(false)}>
          <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-slate-900">Reset Semua Data?</DialogTitle>
              <DialogDescription className="text-slate-500">
                Seluruh data warga, kas, iuran, surat, pengumuman, dan thread akan dihapus permanen.
                Hanya akun Ketua RT yang tersisa.
              </DialogDescription>
            </DialogHeader>

            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-600">
              Tindakan ini tidak dapat dibatalkan.
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setResetOpen(false)}
                disabled={resetting}
                className="border-slate-300 text-slate-700 hover:bg-slate-100"
              >
                Batal
              </Button>
              <Button
                variant="destructive"
                onClick={handleReset}
                disabled={resetting}
                className="bg-red-600 hover:bg-red-500 text-white"
              >
                {resetting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RotateCcw className="w-4 h-4 mr-2" />}
                Ya, Reset Data
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
