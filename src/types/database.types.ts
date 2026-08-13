export type Role = 'warga' | 'bendahara' | 'sekretaris' | 'humas' | 'ketua_rt'
export type StatusWarga = 'pending' | 'aktif' | 'menolak'
export type StatusTinggal = 'tetap' | 'kontrak'
export type StatusPembayaran = 'pending' | 'approved' | 'rejected'
export type StatusSurat = 'pending' | 'approved' | 'rejected'
export type TipeCashflow = 'masuk' | 'keluar'

export interface Profile {
  id: string
  user_id: string
  nama_lengkap: string
  nik: string
  no_kk: string
  no_hp: string
  ktp_url: string | null
  kk_url: string | null
  role: Role
  status_warga: StatusWarga
  created_at: string
  updated_at: string
}

export interface House {
  id: string
  blok_rumah: string
  no_rumah: string
  status_tinggal: StatusTinggal
  profile_id: string | null
  created_at: string
  updated_at: string
}

export interface Contribution {
  id: string
  profile_id: string
  bulan_tahun: string // format: YYYY-MM
  nominal: number
  status_pembayaran: StatusPembayaran
  proof_url: string | null
  reviewed_by: string | null
  catatan: string | null
  created_at: string
  updated_at: string
}

export interface Cashflow {
  id: string
  tipe: TipeCashflow
  nominal: number
  keterangan: string
  tanggal: string // format: YYYY-MM-DD
  created_by: string
  created_at: string
}

export interface Letter {
  id: string
  profile_id: string
  jenis_surat: string
  keterangan: string
  status: StatusSurat
  pdf_url: string | null
  reviewed_by: string | null
  created_at: string
  updated_at: string
}

export type ThreadKategori = 'umum' | 'informasi' | 'diskusi' | 'keluhan' | 'lainnya'

export interface Thread {
  id: string
  author_id: string
  konten: string
  kategori: string
  file_url: string | null
  file_name: string | null
  created_at: string
  updated_at: string
}

export interface Announcement {
  id: string
  judul: string
  isi: string
  kategori: string
  flyer_url: string | null
  created_by: string
  created_at: string
  updated_at: string
}

// Join types untuk query dengan relasi
export interface ContributionWithProfile extends Contribution {
  profile: Pick<Profile, 'nama_lengkap' | 'no_hp'>
}

export interface LetterWithProfile extends Letter {
  profile: Pick<Profile, 'nama_lengkap' | 'nik'>
}

export interface ThreadWithAuthor extends Thread {
  author: Pick<Profile, 'nama_lengkap' | 'no_hp'>
}

export interface HouseWithProfile extends House {
  profile: Pick<Profile, 'nama_lengkap' | 'no_hp'> | null
}
