import { useState } from 'react'
import { CheckCircle2, Clock, Minus, Users, ArrowLeft, CalendarDays } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useWargaList } from '@/hooks/useWarga'
import { useContributionsByYear } from '@/hooks/useIuran'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

type StatusCell = 'approved' | 'pending' | 'none'

export default function CashflowWarga() {
  const now = new Date()
  const [year, setYear] = useState<number>(now.getFullYear())

  const { data: wargaList = [], isLoading: loadingWarga } = useWargaList({ statusWarga: 'aktif' })
  const { data: contributions = [], isLoading: loadingContrib } = useContributionsByYear(year)

  console.log("#warga", wargaList)

  const isLoading = loadingWarga || loadingContrib

  // lookup: `${profile_id}|${MM}` -> status
  const lookup: Record<string, StatusCell> = {}
  for (const c of contributions) {
    const [, month] = c.bulan_tahun.split('-')
    lookup[`${c.profile_id}|${month}`] = c.status_pembayaran as StatusCell
  }

  // Total warga yang sudah lunas (semua bulan? → sederhananya: yang punya status di bulan tsb)
  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]

  function getStatus(wargaId: string, monthIndex: number): StatusCell {
    const mm = String(monthIndex + 1).padStart(2, '0')
    return lookup[`${wargaId}|${mm}`] ?? 'none'
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Link to="/" className="text-slate-500 hover:text-slate-900 transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-xl font-bold text-slate-900">Cashflow Warga</h1>
            </div>
            <p className="text-slate-500 text-sm ml-8">
              Status pembayaran iuran seluruh warga per bulan
            </p>
          </div>
          <div className="ml-8 sm:ml-0 flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-slate-400" />
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="h-10 rounded-md bg-slate-100 border border-slate-300 px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {years.map((y) => (
                <option key={y} value={y} className="bg-white text-slate-900">
                  Tahun {y}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-5">
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-emerald-500/20 border border-emerald-500 inline-block" />
            Lunas / Disetujui
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-amber-500/20 border border-amber-500 inline-block" />
            Menunggu Verifikasi
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-slate-100 border border-slate-300 inline-block" />
            Belum Bayar
          </span>
        </div>

        {/* Tabel matrix */}
        <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-200 hover:bg-transparent">
                  <TableHead className="text-slate-500 text-xs min-w-[200px]">
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      Warga ({wargaList.length})
                    </span>
                  </TableHead>
                  {MONTHS.map((m) => (
                    <TableHead key={m} className="text-slate-500 text-xs text-center px-1 min-w-[56px]">
                      {m}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i} className="border-slate-100">
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <Skeleton className="w-8 h-8 rounded-full bg-slate-100" />
                          <Skeleton className="h-4 w-36 bg-slate-100" />
                        </div>
                      </TableCell>
                      {MONTHS.map((_, j) => (
                        <TableCell key={j} className="text-center px-1">
                          <Skeleton className="w-6 h-6 rounded-md bg-slate-100 mx-auto" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : wargaList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={13} className="text-center py-12 text-slate-400 text-sm">
                      Belum ada warga aktif
                    </TableCell>
                  </TableRow>
                ) : (
                  wargaList.map((w) => {
                    const inisial = (w.nama_lengkap ?? '?')
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase()
                    return (
                      <TableRow key={w.id} className="border-slate-100 hover:bg-slate-50">
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <Avatar className="w-8 h-8 border border-slate-200 bg-blue-600/30">
                              <AvatarFallback className="bg-blue-600/30 text-blue-200 text-[11px] font-bold">
                                {inisial}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-slate-900 text-sm truncate">
                              {w.nama_lengkap}
                            </span>
                          </div>
                        </TableCell>
                        {MONTHS.map((_, j) => {
                          const status = getStatus(w.id, j)
                          return (
                            <TableCell key={j} className="text-center px-1">
                              {status === 'approved' ? (
                                <span
                                  className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-emerald-500/20 text-emerald-600"
                                  title="Lunas"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                </span>
                              ) : status === 'pending' ? (
                                <span
                                  className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-amber-500/20 text-amber-600"
                                  title="Menunggu Verifikasi"
                                >
                                  <Clock className="w-4 h-4" />
                                </span>
                              ) : (
                                <span
                                  className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-slate-100 text-slate-400"
                                  title="Belum Bayar"
                                >
                                  <Minus className="w-4 h-4" />
                                </span>
                              )}
                            </TableCell>
                          )
                        })}
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <p className="text-slate-400 text-xs">
          Data diambil dari pembayaran iuran yang tercatat pada tahun {year}.
        </p>
      </div>
    </div>
  )
}
