import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export const settingsKeys = {
  all: ['settings'] as const,
  list: () => [...settingsKeys.all, 'list'] as const,
}

// ─── Konstanta kunci pengaturan ──────────────────────────────────────────────

export const SETTING_KEYS = {
  IURAN_REKENING: 'iuran_rekening', // JSON: { bank, nomor, atas_nama }
  SALDO_AWAL: 'saldo_awal',         // string angka
  NAMA_PERUMAHAN: 'nama_perumahan', // nama komplek/perumahan
  ALAMAT_PERUMAHAN: 'alamat_perumahan', // alamat lengkap
} as const

// ─── Tipe ────────────────────────────────────────────────────────────────────

export interface IuranRekening {
  bank: string
  nomor: string
  atas_nama: string
}

export interface SaveSettingsPayload {
  updates: Array<{ key: string; value: string }>
}

// ─── Parsing helper ───────────────────────────────────────────────────────────

export function parseIuranRekening(value: string | undefined | null): IuranRekening {
  if (!value) return { bank: '', nomor: '', atas_nama: '' }
  try {
    const parsed = JSON.parse(value) as Partial<IuranRekening>
    return {
      bank: parsed.bank ?? '',
      nomor: parsed.nomor ?? '',
      atas_nama: parsed.atas_nama ?? '',
    }
  } catch {
    return { bank: '', nomor: '', atas_nama: '' }
  }
}

// ─── Query ────────────────────────────────────────────────────────────────────

/**
 * Ambil seluruh pengaturan aplikasi sebagai Record<key, value>
 */
export function useSettings() {
  return useQuery({
    queryKey: settingsKeys.list(),
    queryFn: async (): Promise<Record<string, string>> => {
      const { data, error } = await supabase.from('app_settings').select('key, value')
      if (error) throw new Error(error.message)
      const record: Record<string, string> = {}
      for (const row of data ?? []) {
        record[row.key] = row.value
      }
      return record
    },
    staleTime: 1000 * 30,
  })
}

/**
 * Rekening pembayaran iuran
 */
export function useIuranRekening() {
  const { data } = useSettings()
  return parseIuranRekening(data?.[SETTING_KEYS.IURAN_REKENING])
}

/**
 * Saldo awal kas (nilai angka, default 0)
 */
export function useSaldoAwal() {
  const { data } = useSettings()
  const raw = data?.[SETTING_KEYS.SALDO_AWAL]
  const num = Number(raw)
  return isNaN(num) || !raw ? 0 : num
}

/**
 * Detail perumahan (nama & alamat)
 */
export function usePerumahan() {
  const { data } = useSettings()
  return {
    nama: data?.[SETTING_KEYS.NAMA_PERUMAHAN] ?? '',
    alamat: data?.[SETTING_KEYS.ALAMAT_PERUMAHAN] ?? '',
  }
}

/**
 * Detail perumahan yang bisa dibaca publik (tanpa login) —
 * via fungsi SECURITY DEFINER di database.
 */
export function usePublicPerumahan() {
  return useQuery({
    queryKey: ['settings', 'public-perumahan'],
    queryFn: async (): Promise<{ nama: string; alamat: string }> => {
      const { data, error } = await supabase.rpc('get_public_perumahan')
      if (error) throw new Error(error.message)
      const row = Array.isArray(data) ? data[0] : data
      return {
        nama: (row?.nama as string) ?? '',
        alamat: (row?.alamat as string) ?? '',
      }
    },
    staleTime: 1000 * 60 * 5,
  })
}

// ─── Mutation ─────────────────────────────────────────────────────────────────

/**
 * Simpan / perbarui pengaturan (upsert banyak key sekaligus)
 */
export function useSaveSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ updates }: SaveSettingsPayload) => {
      const now = new Date().toISOString()
      const { error } = await supabase
        .from('app_settings')
        .upsert(
          updates.map((u) => ({ key: u.key, value: u.value, updated_at: now })),
          { onConflict: 'key' }
        )
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: settingsKeys.all })
      qc.invalidateQueries({ queryKey: ['cashflow'] })
    },
  })
}
