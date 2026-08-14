import { useState } from 'react'
import { CheckCircle2, Clock, Minus, ArrowLeft, CalendarDays, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useHousesAll } from '@/hooks/useWarga'
import { useContributionsByYear } from '@/hooks/useIuran'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

type StatusCell = 'approved' | 'pending' | 'none'
type HouseStatus = 'lunas' | 'pending' | 'belum' | 'kosong'

export default function CashflowWarga() {
  const now = new Date()
  const [year, setYear] = useState<number>(now.getFullYear())
  const [blokFilter, setBlokFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<HouseStatus | 'all'>('all')
  const [search, setSearch] = useState('')

  const { data: houses = [], isLoading: loadingHouses } = useHousesAll()
  const { data: contributions = [], isLoading: loadingContrib } = useContributionsByYear(year)

  const isLoading = loadingHouses || loadingContrib

  // lookup: `${profile_id}|${MM}` -> status
  const lookup: Record<string, StatusCell> = {}
  for (const c of contributions) {
    const [, month] = c.bulan_tahun.split('-')
    lookup[`${c.profile_id}|${month}`] = c.status_pembayaran as StatusCell
  }

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]

  function getStatus(profileId: string | null, monthIndex: number): StatusCell {
    if (!profileId) return 'none'
    const mm = String(monthIndex + 1).padStart(2, '0')
    return lookup[`${profileId}|${mm}`] ?? 'none'
  }

  // Klasifikasi status satu rumah
  function houseStatus(h: (typeof houses)[number]): HouseStatus {
    if (!h.profile) return 'kosong'
    let approved = 0
    let pending = 0
    for (let j = 0; j < MONTHS.length; j++) {
      const s = getStatus(h.profile_id, j)
      if (s === 'approved') approved++
      else if (s === 'pending') pending++
    }
    if (approved > 0) return 'lunas'
    if (pending > 0) return 'pending'
    return 'belum'
  }

  const uniqueBloks = [...new Set(houses.map((h) => h.blok_rumah))].sort()

  // Terapkan filter
  const filteredHouses = houses.filter((h) => {
    if (blokFilter !== 'all' && h.blok_rumah !== blokFilter) return false
    if (statusFilter !== 'all' && houseStatus(h) !== statusFilter) return false
    if (search.trim()) {
      const nama = (h.profile?.nama_lengkap ?? '').toLowerCase()
      if (!nama.includes(search.trim().toLowerCase())) return false
    }
    return true
  })

  // Kelompokkan rumah per blok (sudah terurut blok lalu no dari backend)
  const blocks: { blok: string; rows: (typeof houses)[number][] }[] = []
  for (const h of filteredHouses) {
    const last = blocks[blocks.length - 1]
    if (last && last.blok === h.blok_rumah) {
      last.rows.push(h)
    } else {
      blocks.push({ blok: h.blok_rumah, rows: [h] })
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 sm:py-5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Link to="/" className="text-slate-500 hover:text-slate-900 transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900">Cashflow Warga</h1>
            </div>
            <p className="text-slate-500 text-sm ml-8">
              Status pembayaran iuran seluruh rumah per bulan
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
            Belum Bayar / Kosong
          </span>
        </div>

        {/* Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama warga..."
              className="w-full h-10 pl-9 pr-3 rounded-md bg-white border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={blokFilter}
            onChange={(e) => setBlokFilter(e.target.value)}
            className="h-10 rounded-md bg-white border border-slate-300 px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Semua Blok</option>
            {uniqueBloks.map((b) => (
              <option key={b} value={b} className="bg-white text-slate-900">
                Blok {b}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as HouseStatus | 'all')}
            className="h-10 rounded-md bg-white border border-slate-300 px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Semua Status</option>
            <option value="lunas">Lunas</option>
            <option value="pending">Menunggu Verifikasi</option>
            <option value="belum">Belum Bayar</option>
            <option value="kosong">Kosong</option>
          </select>
        </div>

        {/* Tabel laporan per rumah */}
        <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-200 hover:bg-transparent">
                  <TableHead className="text-slate-500 text-xs min-w-[70px]">Blok</TableHead>
                  <TableHead className="text-slate-500 text-xs min-w-[90px]">No. Rumah</TableHead>
                  <TableHead className="text-slate-500 text-xs min-w-[180px]">Warga</TableHead>
                  {MONTHS.map((m) => (
                    <TableHead key={m} className="text-slate-500 text-xs text-center px-1 min-w-[44px]">
                      {m}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i} className="border-slate-100">
                      <TableCell>
                        <Skeleton className="h-4 w-10 bg-slate-100" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-12 bg-slate-100" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-32 bg-slate-100" />
                      </TableCell>
                      {MONTHS.map((_, j) => (
                        <TableCell key={j} className="text-center px-1">
                          <Skeleton className="w-6 h-6 rounded-md bg-slate-100 mx-auto" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredHouses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={15} className="text-center py-12 text-slate-400 text-sm">
                      Tidak ada rumah yang cocok dengan filter
                    </TableCell>
                  </TableRow>
                ) : (
                  blocks.flatMap((block) =>
                    block.rows.map((h) => {
                      const profileId = h.profile_id
                      return (
                        <TableRow key={h.id} className="border-slate-100 hover:bg-slate-50">
                          <TableCell className="text-slate-500 text-sm">{h.blok_rumah}</TableCell>
                          <TableCell className="text-slate-700 text-sm font-medium">
                            {h.no_rumah}
                          </TableCell>
                          <TableCell className="text-slate-900 text-sm truncate max-w-[180px]">
                            {h.profile ? h.profile.nama_lengkap : <span className="text-slate-400">Kosong</span>}
                          </TableCell>
                          {MONTHS.map((_, j) => {
                            const status = getStatus(profileId, j)
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
                                ) : h.profile ? (
                                  <span
                                    className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-slate-100 text-slate-400"
                                    title="Belum Bayar"
                                  >
                                    <Minus className="w-4 h-4" />
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-md border border-dashed border-slate-200 text-slate-200" />
                                )}
                              </TableCell>
                            )
                          })}
                        </TableRow>
                      )
                    })
                  )
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <p className="text-slate-400 text-xs">
          Data diambil dari pembayaran iuran yang tercatat pada tahun {year}. Rumah tanpa penghuni ditandai kosong.
        </p>
      </div>
    </div>
  )
}
