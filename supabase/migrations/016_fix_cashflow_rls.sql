-- ============================================================
-- 016: Fix RLS policies dari 015 yang menyebabkan error 500.
-- Policy 015 memakai subquery inline pada tabel yang sama
-- (cyclic RLS dependency). Ganti dengan helper SECURITY DEFINER
-- get_user_is_aktif().
-- ============================================================

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

-- Hapus policy lama (015) yang bermasalah & buat ulang yang benar
DROP POLICY IF EXISTS "profiles: select all aktif (semua warga)" ON public.profiles;
CREATE POLICY "profiles: select all aktif (semua warga)"
  ON public.profiles FOR SELECT
  USING (
    status_warga = 'aktif'
    AND public.get_user_is_aktif()
  );

DROP POLICY IF EXISTS "contributions: select all (semua warga aktif)" ON public.contributions;
CREATE POLICY "contributions: select all (semua warga aktif)"
  ON public.contributions FOR SELECT
  USING (
    public.get_user_is_aktif()
  );