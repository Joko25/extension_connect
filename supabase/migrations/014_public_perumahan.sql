-- ============================================================
-- 014: Baca publik detail perumahan (untuk halaman login/dll)
-- Aman: hanya mengembalikan nama & alamat perumahan.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_public_perumahan()
RETURNS TABLE(nama TEXT, alamat TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    (SELECT value FROM public.app_settings WHERE key = 'nama_perumahan'),
    (SELECT value FROM public.app_settings WHERE key = 'alamat_perumahan');
$$;

REVOKE ALL ON FUNCTION public.get_public_perumahan() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_perumahan() TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_perumahan() TO authenticated;
