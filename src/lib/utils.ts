import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format angka dengan separator ribuan untuk input nominal rupiah.
 * Contoh: "50000" -> "50.000", "" -> "".
 */
export function formatRupiahInput(value: string | number): string {
  const digits = String(value ?? '').replace(/[^\d]/g, '')
  if (!digits) return ''
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

/**
 * Hapus separator (titik/karakter non-digit) dari nilai input.
 * Contoh: "50.000" -> "50000".
 */
export function parseRupiahInput(value: string): string {
  return String(value ?? '').replace(/[^\d]/g, '')
}

/**
 * Format angka menjadi teks rupiah ("50.000").
 */
export function formatRupiah(value: number | string): string {
  const num = Number(value)
  if (Number.isNaN(num)) return '0'
  return num.toLocaleString('id-ID')
}

