-- ============================================================
-- RT Management App — SQL Migration Script
-- Supabase PostgreSQL
-- Versi: 1.0.0
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- HELPER FUNCTION: get current user role
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT role::text
  FROM public.profiles
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- ============================================================
-- TABLE: profiles
-- Extend auth.users dengan data warga RT
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nama_lengkap  TEXT NOT NULL,
  nik           TEXT UNIQUE NOT NULL,
  no_kk         TEXT NOT NULL,
  no_hp         TEXT,
  ktp_url       TEXT,           -- URL file KTP di Supabase Storage (private)
  kk_url        TEXT,           -- URL file KK di Supabase Storage (private)
  role          TEXT NOT NULL DEFAULT 'warga'
                  CHECK (role IN ('warga', 'bendahara', 'sekretaris', 'humas', 'ketua_rt')),
  status_warga  TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status_warga IN ('pending', 'aktif', 'menolak')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-create profile saat user registrasi via Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nama_lengkap, nik, no_kk)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nama_lengkap', 'Belum diisi'),
    COALESCE(NEW.raw_user_meta_data->>'nik', ''),
    COALESCE(NEW.raw_user_meta_data->>'no_kk', '')
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- TABLE: houses
-- Data rumah/blok dalam lingkungan RT
-- ============================================================
CREATE TABLE IF NOT EXISTS public.houses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blok_rumah      TEXT NOT NULL,
  no_rumah        TEXT NOT NULL,
  status_tinggal  TEXT NOT NULL DEFAULT 'tetap'
                    CHECK (status_tinggal IN ('tetap', 'kontrak')),
  profile_id      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (blok_rumah, no_rumah)
);

CREATE OR REPLACE TRIGGER houses_updated_at
  BEFORE UPDATE ON public.houses
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- TABLE: contributions
-- Iuran bulanan warga
-- ============================================================
CREATE TABLE IF NOT EXISTS public.contributions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  bulan_tahun         TEXT NOT NULL,  -- format: YYYY-MM, contoh: 2025-01
  nominal             NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status_pembayaran   TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status_pembayaran IN ('pending', 'approved', 'rejected')),
  proof_url           TEXT,           -- URL bukti pembayaran (Supabase Storage)
  reviewed_by         UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  catatan             TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (profile_id, bulan_tahun)    -- 1 record per warga per bulan
);

CREATE OR REPLACE TRIGGER contributions_updated_at
  BEFORE UPDATE ON public.contributions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- TABLE: cashflows
-- Kas masuk & keluar RT
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cashflows (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipe        TEXT NOT NULL CHECK (tipe IN ('masuk', 'keluar')),
  nominal     NUMERIC(12, 2) NOT NULL,
  keterangan  TEXT NOT NULL,
  tanggal     DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: letters
-- Permohonan surat dari warga
-- ============================================================
CREATE TABLE IF NOT EXISTS public.letters (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  jenis_surat   TEXT NOT NULL,  -- contoh: 'Surat Keterangan Domisili', 'Surat Pengantar KTP'
  keterangan    TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'rejected')),
  pdf_url       TEXT,           -- URL PDF surat yang di-generate
  reviewed_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER letters_updated_at
  BEFORE UPDATE ON public.letters
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- TABLE: announcements
-- Pengumuman & flyer dari pengurus RT
-- ============================================================
CREATE TABLE IF NOT EXISTS public.announcements (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  judul       TEXT NOT NULL,
  isi         TEXT NOT NULL,
  kategori    TEXT NOT NULL DEFAULT 'umum',  -- contoh: 'umum', 'keamanan', 'kebersihan', 'acara'
  flyer_url   TEXT,                           -- URL flyer/gambar pengumuman
  created_by  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- INDEXES untuk performa query
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status_warga);
CREATE INDEX IF NOT EXISTS idx_houses_profile_id ON public.houses(profile_id);
CREATE INDEX IF NOT EXISTS idx_contributions_profile_id ON public.contributions(profile_id);
CREATE INDEX IF NOT EXISTS idx_contributions_bulan_tahun ON public.contributions(bulan_tahun);
CREATE INDEX IF NOT EXISTS idx_contributions_status ON public.contributions(status_pembayaran);
CREATE INDEX IF NOT EXISTS idx_cashflows_tanggal ON public.cashflows(tanggal);
CREATE INDEX IF NOT EXISTS idx_cashflows_tipe ON public.cashflows(tipe);
CREATE INDEX IF NOT EXISTS idx_letters_profile_id ON public.letters(profile_id);
CREATE INDEX IF NOT EXISTS idx_letters_status ON public.letters(status);
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON public.announcements(created_at DESC);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.houses         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contributions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cashflows      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.letters        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements  ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS: profiles
-- ============================================================

-- User bisa lihat profil sendiri
DROP POLICY IF EXISTS "profiles: select own" ON public.profiles;
CREATE POLICY "profiles: select own"
  ON public.profiles FOR SELECT
  USING (user_id = auth.uid());

-- Sekretaris & ketua_rt bisa lihat semua profil (termasuk KTP/KK URL)
DROP POLICY IF EXISTS "profiles: select all (sekretaris, ketua_rt)" ON public.profiles;
CREATE POLICY "profiles: select all (sekretaris, ketua_rt)"
  ON public.profiles FOR SELECT
  USING (
    public.get_user_role() IN ('sekretaris', 'ketua_rt')
  );

-- Bendahara bisa lihat profil warga untuk keperluan iuran
DROP POLICY IF EXISTS "profiles: select aktif (bendahara)" ON public.profiles;
CREATE POLICY "profiles: select aktif (bendahara)"
  ON public.profiles FOR SELECT
  USING (
    public.get_user_role() = 'bendahara'
    AND status_warga = 'aktif'
  );

-- User bisa update profil sendiri (kecuali role & status_warga)
DROP POLICY IF EXISTS "profiles: update own" ON public.profiles;
CREATE POLICY "profiles: update own"
  ON public.profiles FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    -- role dan status_warga tidak bisa diubah sendiri (diatur via service role)
  );

-- Ketua RT bisa update semua profil (termasuk role & status_warga)
DROP POLICY IF EXISTS "profiles: update all (ketua_rt)" ON public.profiles;
CREATE POLICY "profiles: update all (ketua_rt)"
  ON public.profiles FOR UPDATE
  USING (public.get_user_role() = 'ketua_rt');

-- Sekretaris bisa update status_warga (approve/reject pendaftaran)
DROP POLICY IF EXISTS "profiles: update status (sekretaris)" ON public.profiles;
CREATE POLICY "profiles: update status (sekretaris)"
  ON public.profiles FOR UPDATE
  USING (public.get_user_role() = 'sekretaris');

-- Insert hanya via trigger (handle_new_user), buka untuk authenticated
DROP POLICY IF EXISTS "profiles: insert own" ON public.profiles;
CREATE POLICY "profiles: insert own"
  ON public.profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- RLS: houses
-- ============================================================

-- Warga aktif bisa lihat rumah sendiri
DROP POLICY IF EXISTS "houses: select own" ON public.houses;
CREATE POLICY "houses: select own"
  ON public.houses FOR SELECT
  USING (
    profile_id IN (
      SELECT id FROM public.profiles
      WHERE user_id = auth.uid() AND status_warga = 'aktif'
    )
  );

-- Sekretaris & ketua_rt bisa lihat semua rumah
DROP POLICY IF EXISTS "houses: select all (sekretaris, ketua_rt)" ON public.houses;
CREATE POLICY "houses: select all (sekretaris, ketua_rt)"
  ON public.houses FOR SELECT
  USING (public.get_user_role() IN ('sekretaris', 'ketua_rt'));

-- Sekretaris & ketua_rt bisa manage rumah
DROP POLICY IF EXISTS "houses: insert (sekretaris, ketua_rt)" ON public.houses;
CREATE POLICY "houses: insert (sekretaris, ketua_rt)"
  ON public.houses FOR INSERT
  WITH CHECK (public.get_user_role() IN ('sekretaris', 'ketua_rt'));

DROP POLICY IF EXISTS "houses: update (sekretaris, ketua_rt)" ON public.houses;
CREATE POLICY "houses: update (sekretaris, ketua_rt)"
  ON public.houses FOR UPDATE
  USING (public.get_user_role() IN ('sekretaris', 'ketua_rt'));

DROP POLICY IF EXISTS "houses: delete (ketua_rt)" ON public.houses;
CREATE POLICY "houses: delete (ketua_rt)"
  ON public.houses FOR DELETE
  USING (public.get_user_role() = 'ketua_rt');

-- ============================================================
-- RLS: contributions (iuran)
-- ============================================================

-- Warga aktif bisa lihat iuran milik sendiri
DROP POLICY IF EXISTS "contributions: select own" ON public.contributions;
CREATE POLICY "contributions: select own"
  ON public.contributions FOR SELECT
  USING (
    profile_id IN (
      SELECT id FROM public.profiles
      WHERE user_id = auth.uid()
    )
  );

-- Bendahara & ketua_rt bisa lihat semua iuran
DROP POLICY IF EXISTS "contributions: select all (bendahara, ketua_rt)" ON public.contributions;
CREATE POLICY "contributions: select all (bendahara, ketua_rt)"
  ON public.contributions FOR SELECT
  USING (public.get_user_role() IN ('bendahara', 'ketua_rt'));

-- Warga bisa upload bukti bayar (insert/update proof_url milik sendiri)
DROP POLICY IF EXISTS "contributions: insert own" ON public.contributions;
CREATE POLICY "contributions: insert own"
  ON public.contributions FOR INSERT
  WITH CHECK (
    profile_id IN (
      SELECT id FROM public.profiles
      WHERE user_id = auth.uid() AND status_warga = 'aktif'
    )
  );

DROP POLICY IF EXISTS "contributions: update own proof" ON public.contributions;
CREATE POLICY "contributions: update own proof"
  ON public.contributions FOR UPDATE
  USING (
    profile_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
    AND status_pembayaran = 'pending'
  );

-- Bendahara & ketua_rt bisa update status (approve/reject)
DROP POLICY IF EXISTS "contributions: update status (bendahara, ketua_rt)" ON public.contributions;
CREATE POLICY "contributions: update status (bendahara, ketua_rt)"
  ON public.contributions FOR UPDATE
  USING (public.get_user_role() IN ('bendahara', 'ketua_rt'));

-- ============================================================
-- RLS: cashflows
-- ============================================================

-- Semua warga aktif bisa lihat cashflow (transparansi keuangan)
DROP POLICY IF EXISTS "cashflows: select (all aktif)" ON public.cashflows;
CREATE POLICY "cashflows: select (all aktif)"
  ON public.cashflows FOR SELECT
  USING (
    public.get_user_role() IN ('warga', 'bendahara', 'sekretaris', 'humas', 'ketua_rt')
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND status_warga = 'aktif'
    )
  );

-- Bendahara & ketua_rt bisa input cashflow
DROP POLICY IF EXISTS "cashflows: insert (bendahara, ketua_rt)" ON public.cashflows;
CREATE POLICY "cashflows: insert (bendahara, ketua_rt)"
  ON public.cashflows FOR INSERT
  WITH CHECK (
    public.get_user_role() IN ('bendahara', 'ketua_rt')
    AND created_by IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- Hanya ketua_rt yang bisa hapus cashflow
DROP POLICY IF EXISTS "cashflows: delete (ketua_rt)" ON public.cashflows;
CREATE POLICY "cashflows: delete (ketua_rt)"
  ON public.cashflows FOR DELETE
  USING (public.get_user_role() = 'ketua_rt');

-- ============================================================
-- RLS: letters (surat menyurat)
-- ============================================================

-- Warga bisa lihat surat milik sendiri
DROP POLICY IF EXISTS "letters: select own" ON public.letters;
CREATE POLICY "letters: select own"
  ON public.letters FOR SELECT
  USING (
    profile_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- Sekretaris & ketua_rt bisa lihat semua surat
DROP POLICY IF EXISTS "letters: select all (sekretaris, ketua_rt)" ON public.letters;
CREATE POLICY "letters: select all (sekretaris, ketua_rt)"
  ON public.letters FOR SELECT
  USING (public.get_user_role() IN ('sekretaris', 'ketua_rt'));

-- Warga aktif bisa buat permohonan surat
DROP POLICY IF EXISTS "letters: insert own" ON public.letters;
CREATE POLICY "letters: insert own"
  ON public.letters FOR INSERT
  WITH CHECK (
    profile_id IN (
      SELECT id FROM public.profiles
      WHERE user_id = auth.uid() AND status_warga = 'aktif'
    )
  );

-- Sekretaris & ketua_rt bisa update status surat + upload PDF
DROP POLICY IF EXISTS "letters: update status (sekretaris, ketua_rt)" ON public.letters;
CREATE POLICY "letters: update status (sekretaris, ketua_rt)"
  ON public.letters FOR UPDATE
  USING (public.get_user_role() IN ('sekretaris', 'ketua_rt'));

-- ============================================================
-- RLS: announcements
-- ============================================================

-- Semua warga aktif bisa lihat pengumuman
DROP POLICY IF EXISTS "announcements: select (all aktif)" ON public.announcements;
CREATE POLICY "announcements: select (all aktif)"
  ON public.announcements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND status_warga = 'aktif'
    )
  );

-- Humas & ketua_rt bisa buat pengumuman
DROP POLICY IF EXISTS "announcements: insert (humas, ketua_rt)" ON public.announcements;
CREATE POLICY "announcements: insert (humas, ketua_rt)"
  ON public.announcements FOR INSERT
  WITH CHECK (
    public.get_user_role() IN ('humas', 'ketua_rt')
    AND created_by IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- Humas & ketua_rt bisa update pengumuman milik sendiri; ketua_rt bisa update semua
DROP POLICY IF EXISTS "announcements: update own (humas)" ON public.announcements;
CREATE POLICY "announcements: update own (humas)"
  ON public.announcements FOR UPDATE
  USING (
    public.get_user_role() = 'humas'
    AND created_by IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "announcements: update all (ketua_rt)" ON public.announcements;
CREATE POLICY "announcements: update all (ketua_rt)"
  ON public.announcements FOR UPDATE
  USING (public.get_user_role() = 'ketua_rt');

-- Hanya ketua_rt yang bisa hapus pengumuman
DROP POLICY IF EXISTS "announcements: delete (ketua_rt)" ON public.announcements;
CREATE POLICY "announcements: delete (ketua_rt)"
  ON public.announcements FOR DELETE
  USING (public.get_user_role() = 'ketua_rt');

-- ============================================================
-- STORAGE BUCKETS
-- Jalankan via Supabase Dashboard atau Storage API
-- ============================================================

-- Bucket: ktp-kk-docs (PRIVATE)
-- Hanya bisa diakses oleh sekretaris & ketua_rt
INSERT INTO storage.buckets (id, name, public)
VALUES ('ktp-kk-docs', 'ktp-kk-docs', false)
ON CONFLICT (id) DO NOTHING;

-- Bucket: payment-proofs (PRIVATE, owner bisa upload)
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', false)
ON CONFLICT (id) DO NOTHING;

-- Bucket: announcement-flyers (PUBLIC)
INSERT INTO storage.buckets (id, name, public)
VALUES ('announcement-flyers', 'announcement-flyers', true)
ON CONFLICT (id) DO NOTHING;

-- Bucket: generated-pdfs (PRIVATE)
INSERT INTO storage.buckets (id, name, public)
VALUES ('generated-pdfs', 'generated-pdfs', false)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- STORAGE RLS POLICIES
-- ============================================================

-- ktp-kk-docs: Owner bisa upload sendiri
DROP POLICY IF EXISTS "ktp-kk: upload own" ON storage.objects;
CREATE POLICY "ktp-kk: upload own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'ktp-kk-docs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ktp-kk-docs: Hanya sekretaris & ketua_rt bisa READ
DROP POLICY IF EXISTS "ktp-kk: read (sekretaris, ketua_rt)" ON storage.objects;
CREATE POLICY "ktp-kk: read (sekretaris, ketua_rt)"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'ktp-kk-docs'
    AND public.get_user_role() IN ('sekretaris', 'ketua_rt')
  );

-- payment-proofs: Owner bisa upload
DROP POLICY IF EXISTS "payment-proofs: upload own" ON storage.objects;
CREATE POLICY "payment-proofs: upload own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'payment-proofs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- payment-proofs: Owner & bendahara & ketua_rt bisa READ
DROP POLICY IF EXISTS "payment-proofs: read own" ON storage.objects;
CREATE POLICY "payment-proofs: read own"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'payment-proofs'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.get_user_role() IN ('bendahara', 'ketua_rt')
    )
  );

-- generated-pdfs: Sekretaris & ketua_rt bisa upload
DROP POLICY IF EXISTS "generated-pdfs: upload (sekretaris, ketua_rt)" ON storage.objects;
CREATE POLICY "generated-pdfs: upload (sekretaris, ketua_rt)"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'generated-pdfs'
    AND public.get_user_role() IN ('sekretaris', 'ketua_rt')
  );

-- generated-pdfs: Owner surat & sekretaris & ketua_rt bisa READ
DROP POLICY IF EXISTS "generated-pdfs: read" ON storage.objects;
CREATE POLICY "generated-pdfs: read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'generated-pdfs'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.get_user_role() IN ('sekretaris', 'ketua_rt')
    )
  );

-- ============================================================
-- SEED DATA: Data sample untuk testing
-- (Hapus bagian ini sebelum production)
-- ============================================================

-- Ketua RT pertama harus dibuat via Supabase Auth Dashboard
-- kemudian update role-nya langsung di tabel profiles menggunakan service_role key:
-- UPDATE public.profiles SET role = 'ketua_rt', status_warga = 'aktif'
-- WHERE user_id = '<uuid-dari-auth-user>';

-- Contoh data rumah
INSERT INTO public.houses (blok_rumah, no_rumah, status_tinggal) VALUES
  ('A', '01', 'tetap'),
  ('A', '02', 'tetap'),
  ('A', '03', 'kontrak'),
  ('B', '01', 'tetap'),
  ('B', '02', 'tetap'),
  ('B', '03', 'kontrak')
ON CONFLICT (blok_rumah, no_rumah) DO NOTHING;
