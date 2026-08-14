import { useState } from 'react'
import {
  Wallet, TrendingUp, TrendingDown, ArrowLeft, PlusCircle,
  FileSpreadsheet, Loader2, ArrowUpRight, ArrowDownRight
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid
} from 'recharts'
import { useAuth, hasRole } from '@/context/AuthContext'
import { useCashflowList, useCashflowSummary, useCreateCashflow } from '@/hooks/useCashflow'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/hooks/useToast'
import { Link } from 'react-router-dom'
import type { TipeCashflow } from '@/types/database.types'

function CreateCashflowModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { profile } = useAuth()
  const [tipe, setTipe] = useState<TipeCashflow>('keluar')
  const [nominal, setNominal] = useState('')
  const [keterangan, setKeterangan] = useState('')
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0])

  const createMutation = useCreateCashflow()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return
    const numNominal = Number(nominal)
    if (isNaN(numNominal) || numNominal <= 0) {
      toast({ title: 'Nominal tidak valid', variant: 'destructive' })
      return
    }
    if (!keterangan.trim()) {
      toast({ title: 'Keterangan wajib diisi', variant: 'destructive' })
      return
    }

    try {
      await createMutation.mutateAsync({
        tipe,
        nominal: numNominal,
        keterangan: keterangan.trim(),
        tanggal,
        createdBy: profile.id,
      })

      toast({
        title: 'Transaksi Berhasil Dicatat',
        description: `Catatan transaksi ${tipe === 'masuk' ? 'pemasukan' : 'pengeluaran'} sebesar Rp ${numNominal.toLocaleString('id-ID')} telah disimpan.`,
      })
      setNominal('')
      setKeterangan('')
      onClose()
    } catch (err: any) {
      toast({ title: 'Gagal mencatat transaksi', description: err.message, variant: 'destructive' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-slate-900">Tambah Transaksi Cashflow</DialogTitle>
          <DialogDescription className="text-slate-500">
            Catat pemasukan atau pengeluaran kas RT secara transparan
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-slate-800 text-xs">Jenis Transaksi</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTipe('masuk')}
                className={`py-2 px-3 rounded-lg text-sm font-medium border flex items-center justify-center gap-1.5 transition-all ${
                  tipe === 'masuk'
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-600 font-semibold'
                    : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                }`}
              >
                <ArrowUpRight className="w-4 h-4" />
                Pemasukan
              </button>
              <button
                type="button"
                onClick={() => setTipe('keluar')}
                className={`py-2 px-3 rounded-lg text-sm font-medium border flex items-center justify-center gap-1.5 transition-all ${
                  tipe === 'keluar'
                    ? 'bg-rose-500/20 border-rose-500/50 text-rose-400 font-semibold'
                    : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                }`}
              >
                <ArrowDownRight className="w-4 h-4" />
                Pengeluaran
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-800 text-xs">Nominal (Rp)</Label>
            <Input
              type="number"
              value={nominal}
              onChange={(e) => setNominal(e.target.value)}
              placeholder="Contoh: 150000"
              className="bg-slate-100 border-slate-300 text-slate-900 font-semibold h-10"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-800 text-xs">Keterangan Transaksi</Label>
            <Input
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Contoh: Pembelian lampu jalan Gang A"
              className="bg-slate-100 border-slate-300 text-slate-900 h-10"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-800 text-xs">Tanggal Transaksi</Label>
            <Input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className="bg-slate-100 border-slate-300 text-slate-900 h-10"
            />
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-slate-300 text-slate-700 hover:bg-slate-100"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="bg-blue-600 hover:bg-blue-500 text-white"
            >
              {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Simpan Transaksi
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function CashflowPublic() {
  const { profile } = useAuth()
  const [isModalOpen, setIsModalOpen] = useState(false)

  const canManage = hasRole(profile?.role, ['bendahara', 'ketua_rt'])

  const { data: summary, isLoading: isLoadingSummary } = useCashflowSummary()
  const { data: transactions = [], isLoading: isLoadingList } = useCashflowList()

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
              <h1 className="text-lg sm:text-xl font-bold text-slate-900">Transparansi Cashflow Kas RT</h1>
            </div>
            <p className="text-slate-500 text-sm ml-8">
              Laporan pemasukan & pengeluaran kas lingkungan secara terbuka
            </p>
          </div>
          {canManage && (
            <Button
              onClick={() => setIsModalOpen(true)}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium shadow-lg shadow-blue-500/25"
            >
              <PlusCircle className="w-4 h-4 mr-2" />
              Tambah Transaksi
            </Button>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Ringkasan Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Total Kas */}
          <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-200 rounded-2xl p-5 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <p className="text-blue-700 text-xs font-semibold uppercase tracking-wider">Total Kas RT</p>
              <div className="w-9 h-9 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <Wallet className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            {isLoadingSummary ? (
              <Skeleton className="h-8 w-36 bg-slate-100 mt-3" />
            ) : (
              <p className="text-2xl font-bold text-slate-900 font-mono mt-3">
                Rp {(summary?.totalKas ?? 0).toLocaleString('id-ID')}
              </p>
            )}
            <p className="text-slate-500 text-xs mt-2">Saldo kas aktif saat ini</p>
          </div>

          {/* Pemasukan Bulan Ini */}
          <div className="bg-gradient-to-br from-emerald-50 to-white border border-emerald-200 rounded-2xl p-5 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <p className="text-emerald-700 text-xs font-semibold uppercase tracking-wider">Masuk Bulan Ini</p>
              <div className="w-9 h-9 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
            {isLoadingSummary ? (
              <Skeleton className="h-8 w-36 bg-slate-100 mt-3" />
            ) : (
              <p className="text-2xl font-bold text-emerald-600 font-mono mt-3">
                + Rp {(summary?.pemasukanBulanIni ?? 0).toLocaleString('id-ID')}
              </p>
            )}
            <p className="text-slate-500 text-xs mt-2">Total iuran & dana masuk</p>
          </div>

          {/* Pengeluaran Bulan Ini */}
          <div className="bg-gradient-to-br from-rose-50 to-white border border-rose-200 rounded-2xl p-5 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <p className="text-rose-600 text-xs font-semibold uppercase tracking-wider">Keluar Bulan Ini</p>
              <div className="w-9 h-9 bg-rose-100 rounded-xl flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-rose-600" />
              </div>
            </div>
            {isLoadingSummary ? (
              <Skeleton className="h-8 w-36 bg-slate-100 mt-3" />
            ) : (
              <p className="text-2xl font-bold text-rose-600 font-mono mt-3">
                - Rp {(summary?.pengeluaranBulanIni ?? 0).toLocaleString('id-ID')}
              </p>
            )}
            <p className="text-slate-500 text-xs mt-2">Operasional & kegiatan RT</p>
          </div>
        </div>

        {/* Grafik Recharts: Pemasukan vs Pengeluaran */}
        <div className="bg-white/60 border border-slate-200 rounded-2xl p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Grafik Keuangan 6 Bulan Terakhir</h2>
            <p className="text-slate-500 text-xs">Perbandingan arus pemasukan dan pengeluaran per bulan</p>
          </div>

          <div className="h-72 w-full pt-4">
            {isLoadingSummary ? (
              <Skeleton className="w-full h-full bg-slate-50 rounded-xl" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summary?.monthlyChartData ?? []} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis dataKey="bulan" stroke="#ffffff40" fontSize={12} tickLine={false} />
                  <YAxis
                    stroke="#ffffff40"
                    fontSize={12}
                    tickLine={false}
                    tickFormatter={(val) => `${val / 1000}k`}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#ffffff20', borderRadius: '8px', color: '#fff' }}
                    formatter={(value: any) => [`Rp ${Number(value).toLocaleString('id-ID')}`, '']}
                  />
                  <Legend wrapperStyle={{ paddingTop: '10px' }} />
                  <Bar dataKey="pemasukan" name="Pemasukan" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pengeluaran" name="Pengeluaran" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Tabel Transaksi */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Riwayat Transaksi Terbaru</h2>
              <p className="text-slate-500 text-xs">Daftar arus kas masuk & keluar terperinci</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <FileSpreadsheet className="w-4 h-4" />
              <span>{transactions.length} Transaksi Tercatat</span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-200 hover:bg-transparent">
                  <TableHead className="text-slate-500 text-xs">Tanggal</TableHead>
                  <TableHead className="text-slate-500 text-xs">Tipe</TableHead>
                  <TableHead className="text-slate-500 text-xs">Keterangan</TableHead>
                  <TableHead className="text-slate-500 text-xs text-right">Nominal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingList ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="border-slate-100">
                      <TableCell><Skeleton className="h-4 w-24 bg-slate-100" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20 rounded-full bg-slate-100" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-48 bg-slate-100" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-4 w-24 ml-auto bg-slate-100" /></TableCell>
                    </TableRow>
                  ))
                ) : transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-12 text-slate-400 text-sm">
                      Belum ada catatan transaksi cashflow
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((tx) => {
                    const isMasuk = tx.tipe === 'masuk'

                    return (
                      <TableRow key={tx.id} className="border-slate-100 hover:bg-slate-50">
                        <TableCell className="text-slate-600 text-xs font-mono">
                          {new Date(tx.tanggal).toLocaleDateString('id-ID', {
                            day: 'numeric', month: 'short', year: 'numeric'
                          })}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
                            isMasuk
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                          }`}>
                            {isMasuk ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            {isMasuk ? 'Masuk' : 'Keluar'}
                          </span>
                        </TableCell>
                        <TableCell className="text-slate-900 text-sm font-medium">
                          {tx.keterangan}
                        </TableCell>
                        <TableCell className={`text-right font-mono font-semibold text-sm ${
                          isMasuk ? 'text-emerald-600' : 'text-rose-400'
                        }`}>
                          {isMasuk ? '+' : '-'} Rp {Number(tx.nominal).toLocaleString('id-ID')}
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

      <CreateCashflowModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  )
}
