// Daftar blok rumah beserta rentang nomor rumah di lingkungan RT
export const BLOK_RUMAH_LIST = ['HA', 'HB'] as const
export type BlokRumah = (typeof BLOK_RUMAH_LIST)[number]

export const BLOK_RUMAH_RANGE: Record<BlokRumah, { min: number; max: number }> = {
  HA: { min: 1, max: 38 },
  HB: { min: 1, max: 34 },
}

export const BLOK_RUMAH_MAX: Record<BlokRumah, number> = {
  HA: 38,
  HB: 34,
}

/** Cek apakah blok valid (salah satu dari HA/HB) */
export function isValidBlokRumah(blok: string): blok is BlokRumah {
  return (BLOK_RUMAH_LIST as readonly string[]).includes(blok.toUpperCase())
}

/** Cek apakah nomor rumah valid untuk blok tertentu */
export function isValidNoRumah(blok: string, noRumah: string): boolean {
  if (!isValidBlokRumah(blok)) return false
  const b = blok.toUpperCase() as BlokRumah
  const n = Number(noRumah)
  return Number.isInteger(n) && n >= BLOK_RUMAH_RANGE[b].min && n <= BLOK_RUMAH_RANGE[b].max
}

/** Pesan bantuan rentang nomor rumah untuk blok tertentu */
export function noRumahRangeText(blok: string): string {
  if (!isValidBlokRumah(blok)) return ''
  const b = blok.toUpperCase() as BlokRumah
  return `${BLOK_RUMAH_RANGE[b].min}-${BLOK_RUMAH_RANGE[b].max}`
}
