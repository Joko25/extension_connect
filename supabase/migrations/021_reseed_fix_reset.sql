-- ============================================================
-- 021: Seeding ulang struktur rumah (HA 1-38 & HB 1-34)
-- + perbaiki reset_app_data agar struktur rumah TIDAK hilang saat reset
-- ============================================================

-- 1. Isi ulang rumah yang belum ada (idempotent)
INSERT INTO houses (blok_rumah, no_rumah, profile_id, status_tinggal, created_at, updated_at)
SELECT b.blok, n::text, NULL, 'tetap', now(), now()
FROM (
  SELECT 'HA' AS blok, generate_series(1, 38) AS n
  UNION ALL
  SELECT 'HB', generate_series(1, 34)
) b
WHERE NOT EXISTS (
  SELECT 1 FROM houses h WHERE h.blok_rumah = b.blok AND h.no_rumah = b.n::text
);

-- 2. Reset tidak menghapus rumah, hanya melepas tautan warga,
--    sehingga struktur blok (HA/HB) tetap utuh setelah reset.
CREATE OR REPLACE FUNCTION public.reset_app_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ketua_uid uuid;
BEGIN
  -- Hanya Ketua RT yang boleh menjalankan
  IF public.get_user_role() != 'ketua_rt' THEN
    RAISE EXCEPTION 'Hanya Ketua RT yang dapat melakukan reset data';
  END IF;

  SELECT user_id INTO ketua_uid FROM public.profiles WHERE role = 'ketua_rt' LIMIT 1;
  IF ketua_uid IS NULL THEN
    RAISE EXCEPTION 'Akun Ketua RT tidak ditemukan';
  END IF;

  -- Hapus transaksi yang RESTRICT terhadap profiles
  DELETE FROM public.announcements WHERE true;
  DELETE FROM public.cashflows WHERE true;

  -- Lepas semua rumah dari warga (pertahankan struktur blok & nomor)
  UPDATE public.houses SET profile_id = NULL WHERE true;

  -- Hapus warga (cascade: contributions, letters, threads, likes, komentar)
  DELETE FROM public.profiles WHERE role <> 'ketua_rt';

  -- Hapus akun auth warga (cascade menghapus profil tersisa)
  DELETE FROM auth.users WHERE id <> ketua_uid;

  -- Reset pengaturan aplikasi
  DELETE FROM public.app_settings WHERE true;
END;
$$;

REVOKE ALL ON FUNCTION public.reset_app_data() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reset_app_data() TO authenticated;
