import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Cashflow, TipeCashflow } from '@/types/database.types'

export const cashflowKeys = {
  all: ['cashflow'] as const,
  list: () => [...cashflowKeys.all, 'list'] as const,
  summary: () => [...cashflowKeys.all, 'summary'] as const,
}

export interface CashflowSummary {
  totalKas: number
  pemasukanBulanIni: number
  pengeluaranBulanIni: number
  monthlyChartData: Array<{
    bulan: string
    pemasukan: number
    pengeluaran: number
  }>
}

export interface CreateCashflowPayload {
  tipe: TipeCashflow
  nominal: number
  keterangan: string
  tanggal: string
  createdBy: string
}

/**
 * Fetch semua daftar transaksi cashflow
 */
export function useCashflowList() {
  return useQuery({
    queryKey: cashflowKeys.list(),
    queryFn: async (): Promise<Cashflow[]> => {
      const { data, error } = await supabase
        .from('cashflows')
        .select('*')
        .order('tanggal', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw new Error(error.message)
      return (data ?? []) as Cashflow[]
    },
    staleTime: 1000 * 30,
  })
}

/**
 * Ringkasan Keuangan (Total Kas, Masuk Bulan Ini, Keluar Bulan Ini, Chart Data per Bulan)
 */
export function useCashflowSummary() {
  return useQuery({
    queryKey: cashflowKeys.summary(),
    queryFn: async (): Promise<CashflowSummary> => {
      const { data, error } = await supabase
        .from('cashflows')
        .select('*')
        .order('tanggal', { ascending: true })

      if (error) throw new Error(error.message)
      const list = (data ?? []) as Cashflow[]

      // Saldo awal kas (setup kas yang sudah berjalan)
      const { data: saldoRes } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'saldo_awal')
        .maybeSingle()
      const saldoAwal = Number(saldoRes?.value) || 0

      const now = new Date()
      const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

      let totalKas = saldoAwal
      let pemasukanBulanIni = 0
      let pengeluaranBulanIni = 0

      // Map untuk 6 bulan terakhir chart
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
      const monthlyMap: Record<string, { label: string; masuk: number; keluar: number }> = {}

      // Inisialisasi 6 bulan terakhir
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        monthlyMap[key] = {
          label: `${monthNames[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
          masuk: 0,
          keluar: 0,
        }
      }

      for (const item of list) {
        const nominal = Number(item.nominal) || 0
        if (item.tipe === 'masuk') {
          totalKas += nominal
          if (item.tanggal.startsWith(currentYearMonth)) {
            pemasukanBulanIni += nominal
          }
        } else {
          totalKas -= nominal
          if (item.tanggal.startsWith(currentYearMonth)) {
            pengeluaranBulanIni += nominal
          }
        }

        // Aggregate per bulan untuk chart jika masuk rentang
        const itemMonthKey = item.tanggal.slice(0, 7)
        if (monthlyMap[itemMonthKey]) {
          if (item.tipe === 'masuk') {
            monthlyMap[itemMonthKey].masuk += nominal
          } else {
            monthlyMap[itemMonthKey].keluar += nominal
          }
        }
      }

      const monthlyChartData = Object.values(monthlyMap).map((m) => ({
        bulan: m.label,
        pemasukan: m.masuk,
        pengeluaran: m.keluar,
      }))

      return {
        totalKas,
        pemasukanBulanIni,
        pengeluaranBulanIni,
        monthlyChartData,
      }
    },
    staleTime: 1000 * 30,
  })
}

/**
 * Mutation untuk buat transaksi manual cashflow (Bendahara / Ketua RT)
 */
export function useCreateCashflow() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateCashflowPayload) => {
      const { error } = await supabase.from('cashflows').insert({
        tipe: payload.tipe,
        nominal: payload.nominal,
        keterangan: payload.keterangan,
        tanggal: payload.tanggal,
        created_by: payload.createdBy,
      })

      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: cashflowKeys.all })
    },
  })
}
