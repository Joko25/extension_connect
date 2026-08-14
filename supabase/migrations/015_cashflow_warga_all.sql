-- ============================================================
-- 015: Cashflow Warga — semua warga aktif bisa melihat
-- seluruh warga (profil) & status pembayaran iuran mereka.
-- Tujuannya agar halaman "Cashflow Warga" menampilkan semua data
-- warga (apakah sudah bayar/belum) untuk semua role, termasuk warga.
--
-- CATATAN: Hindari subquery inline pada tabel yang sama (menyebabkan
-- cyclic RLS dependency → error 500). Gunakan fungsi SECURITY DEFINER
-- seperti get_user_role() agar tidak terdeteksi sebagai siklus.
-- ============================================================

-- Helper: apakah user yang login adalah warga aktif
CREATE OR REPLACE FUNCTION public.get_user_is_aktif()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND status_warga = 'aktif'
  );
$$;

-- profiles: semua warga aktif bisa lihat seluruh profil warga aktif
DROP POLICY IF EXISTS "profiles: select all aktif (semua warga)" ON public.profiles;
CREATE POLICY "profiles: select all aktif (semua warga)"
  ON public.profiles FOR SELECT
  USING (
    status_warga = 'aktif'
    AND public.get_user_is_aktif()
  );

-- contributions: semua warga aktif bisa lihat seluruh iuran (status bayar)
DROP POLICY IF EXISTS "contributions: select all (semua warga aktif)" ON public.contributions;
CREATE POLICY "contributions: select all (semua warga aktif)"
  ON public.contributions FOR SELECT
  USING (
    public.get_user_is_aktif()
  );