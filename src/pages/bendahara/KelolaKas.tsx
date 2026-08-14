import { useState } from 'react'
import { ArrowLeft, Wallet, PlusCircle, Loader2, Users, TrendingUp, TrendingDown, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useWargaList } from '@/hooks/useWarga'
import { useAddManualIuran } from '@/hooks/useIuran'
import { useCashflowList, useCashflowSummary } from '@/hooks/useCashflow'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/hooks/useToast'

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

export default function KelolaKas() {
  const { profile } = useAuth()
  const now = new Date()

  const [search, setSearch] = useState('')
  const [selectedWarga, setSelectedWarga] = useState<string>('')
  const [monthIndex, setMonthIndex] = useState<number>(now.getMonth())
  const [year, setYear] = useState<number>(now.getFullYear())
  const [nominal, setNominal] = useState<string>('')

  const { data: wargaList = [], isLoading: loadingWarga } = useWargaList({ statusWarga: 'aktif' })
  const addManualIuran = useAddManualIuran()
  const { data: cashflowList = [], isLoading: loadingCashflow } = useCashflowList()
  const { data: summary } = useCashflowSummary()

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]

  const filteredWarga = wargaList.filter((w) =>
    (w.nama_lengkap?.toLowerCase() ?? '').includes(search.toLowerCase()) ||
    (w.no_hp ?? '').includes(search)
  )

  const selectedWargaData = wargaList.find((w) => w.id === selectedWarga)

  async function handleSubmit() {
    if (!profile) return
    if (!selectedWarga) {
      toast({ title: 'Pilih warga', description: 'Silakan pilih warga yang membayar iuran.', variant: 'destructive' })
      return
    }
    const num = Number(nominal)
    if (!nominal || isNaN(num) || num <= 0) {
      toast({ title: 'Nominal tidak valid', description: 'Masukkan nominal iuran yang benar.', variant: 'destructive' })
      return
    }

    const bulanTahun = `${year}-${String(monthIndex + 1).padStart(2, '0')}`
    try {
      await addManualIuran.mutateAsync({
        profileId: selectedWarga,
        namaWarga: selectedWargaData?.nama_lengkap ?? 'Warga',
        bulanTahun,
        nominal: Math.round(num),
        reviewerProfileId: profile.id,
      })
      toast({
        title: 'Kas iuran tercatat',
        description: `Iuran ${MONTH_NAMES[monthIndex]} ${year} untuk ${selectedWargaData?.nama_lengkap} berhasil dicatat.`,
      })
      setSelectedWarga('')
      setNominal('')
    } catch (err) {
      toast({
        title: 'Gagal mencatat kas',
        description: err instanceof Error ? err.message : 'Terjadi kesalahan',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 sm:py-5">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <Link to="/" className="text-slate-500 hover:text-slate-900 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Wallet className="w-4 h-4 text-blue-600" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900">Kelola Kas</h1>
          </div>
          <p className="text-slate-500 text-sm ml-8">
            Catat pemasukan dan pantau kas RT
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Ringkasan Kas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-xs">Total Kas</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {summary ? `Rp ${summary.totalKas.toLocaleString('id-ID')}` : <Skeleton className="h-7 w-24 bg-slate-100" />}
                </p>
              </div>
              <div className="w-10 h-10 bg-blue-500/15 rounded-xl flex items-center justify-center">
                <Wallet className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-xs">Pemasukan Bulan Ini</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">
                  {summary ? `Rp ${summary.pemasukanBulanIni.toLocaleString('id-ID')}` : <Skeleton className="h-7 w-24 bg-slate-100" />}
                </p>
              </div>
              <div className="w-10 h-10 bg-emerald-500/15 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-xs">Pengeluaran Bulan Ini</p>
                <p className="text-2xl font-bold text-red-600 mt-1">
                  {summary ? `Rp ${summary.pengeluaranBulanIni.toLocaleString('id-ID')}` : <Skeleton className="h-7 w-24 bg-slate-100" />}
                </p>
              </div>
              <div className="w-10 h-10 bg-red-500/15 rounded-xl flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Form Input Kas Manual */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex items-start gap-3 mb-5">
            <div className="w-9 h-9 bg-blue-500/15 rounded-xl flex items-center justify-center shrink-0">
              <PlusCircle className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Input Iuran Manual</h2>
              <p className="text-slate-500 text-xs mt-0.5">
                Catat pembayaran iuran tunai/langsung dengan memilih warga dan periode.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pilih Warga */}
            <div className="space-y-2 md:col-span-2">
              <Label className="text-slate-800 text-xs">Warga</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari nama warga..."
                  className="pl-9 bg-slate-100 border-slate-300 text-slate-900 placeholder:text-slate-400"
                />
              </div>
              <Select value={selectedWarga} onValueChange={setSelectedWarga}>
                <SelectTrigger className="w-full bg-slate-100 border-slate-300 text-slate-900">
                  <SelectValue placeholder="Pilih warga yang membayar" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 max-h-72">
                  {loadingWarga ? (
                    <div className="p-3 text-slate-400 text-sm">Memuat warga...</div>
                  ) : filteredWarga.length === 0 ? (
                    <div className="p-3 text-slate-400 text-sm">Tidak ada warga ditemukan</div>
                  ) : (
                    filteredWarga.map((w) => {
                      const inisial = (w.nama_lengkap ?? '?')
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase()
                      return (
                        <SelectItem key={w.id} value={w.id} className="text-slate-900 focus:bg-slate-100">
                          <span className="inline-flex items-center gap-2">
                            <Avatar className="w-5 h-5 border border-slate-200">
                              <AvatarFallback className="bg-blue-600/30 text-blue-200 text-[10px] font-bold">
                                {inisial}
                              </AvatarFallback>
                            </Avatar>
                            {w.nama_lengkap}
                          </span>
                        </SelectItem>
                      )
                    })
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Periode */}
            <div className="space-y-2">
              <Label className="text-slate-800 text-xs">Bulan</Label>
              <Select
                value={String(monthIndex)}
                onValueChange={(v) => setMonthIndex(Number(v))}
              >
                <SelectTrigger className="w-full bg-slate-100 border-slate-300 text-slate-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  {MONTH_NAMES.map((m, i) => (
                    <SelectItem key={m} value={String(i)} className="text-slate-900 focus:bg-slate-100">{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-800 text-xs">Tahun</Label>
              <Select
                value={String(year)}
                onValueChange={(v) => setYear(Number(v))}
              >
                <SelectTrigger className="w-full bg-slate-100 border-slate-300 text-slate-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)} className="text-slate-900 focus:bg-slate-100">Tahun {y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Nominal */}
            <div className="space-y-2 md:col-span-2">
              <Label className="text-slate-800 text-xs">Nominal Iuran (Rp)</Label>
              <Input
                type="number"
                min="0"
                value={nominal}
                onChange={(e) => setNominal(e.target.value)}
                placeholder="Contoh: 50000"
                className="bg-slate-100 border-slate-300 text-slate-900 font-semibold"
              />
              {nominal && !isNaN(Number(nominal)) && (
                <p className="text-slate-400 text-xs">
                  = Rp {Number(nominal).toLocaleString('id-ID')}
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end mt-5">
            <Button
              onClick={handleSubmit}
              disabled={addManualIuran.isPending}
              className="bg-blue-600 hover:bg-blue-500 text-white"
            >
              {addManualIuran.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Mencatat...
                </>
              ) : (
                <>
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Catat Kas Masuk
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Riwayat Transaksi */}
        <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
          <div className="px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-400" />
              <h2 className="text-sm font-semibold text-slate-900">Transaksi Kas Terbaru</h2>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="border-slate-200 hover:bg-transparent">
                <TableHead className="text-slate-500 text-xs">Keterangan</TableHead>
                <TableHead className="text-slate-500 text-xs">Tipe</TableHead>
                <TableHead className="text-slate-500 text-xs">Tanggal</TableHead>
                <TableHead className="text-slate-500 text-xs text-right">Nominal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingCashflow ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i} className="border-slate-100">
                    <TableCell><Skeleton className="h-4 w-40 bg-slate-100" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16 bg-slate-100" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20 bg-slate-100" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto bg-slate-100" /></TableCell>
                  </TableRow>
                ))
              ) : cashflowList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12 text-slate-400 text-sm">
                    Belum ada transaksi kas
                  </TableCell>
                </TableRow>
              ) : (
                cashflowList.slice(0, 10).map((item) => (
                  <TableRow key={item.id} className="border-slate-100 hover:bg-slate-50">
                    <TableCell className="text-slate-800 text-sm">{item.keterangan}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                          item.tipe === 'masuk'
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                            : 'bg-red-500/10 text-red-600 border-red-500/30'
                        }`}
                      >
                        {item.tipe === 'masuk' ? 'Masuk' : 'Keluar'}
                      </span>
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm">
                      {new Date(item.tanggal).toLocaleDateString('id-ID', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </TableCell>
                    <TableCell
                      className={`text-right font-mono text-sm font-semibold ${
                        item.tipe === 'masuk' ? 'text-emerald-600' : 'text-red-600'
                      }`}
                    >
                      {item.tipe === 'masuk' ? '+' : '−'} Rp {Number(item.nominal).toLocaleString('id-ID')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}