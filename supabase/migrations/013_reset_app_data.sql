-- ============================================================
-- 013: Reset Data Aplikasi
-- Hanya Ketua RT. Menghapus semua data warga & transaksional,
-- menyisakan 1 akun Ketua RT.
-- ============================================================

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
  DELETE FROM public.announcements;
  DELETE FROM public.cashflows;

  -- Kosongkan seluruh rumah
  DELETE FROM public.houses;

  -- Hapus warga (cascade: contributions, letters, threads, likes, komentar)
  DELETE FROM public.profiles WHERE role <> 'ketua_rt';

  -- Hapus akun auth warga (cascade menghapus profil tersisa)
  DELETE FROM auth.users WHERE id <> ketua_uid;

  -- Reset pengaturan aplikasi
  DELETE FROM public.app_settings;
END;
$$;

REVOKE ALL ON FUNCTION public.reset_app_data() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reset_app_data() TO authenticated;
