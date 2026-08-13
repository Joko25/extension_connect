-- ============================================================
-- Migration 006: Fungsi warga mendaftarkan rumahnya sendiri
-- ------------------------------------------------------------
-- RLS pada tabel houses hanya mengizinkan sekretaris/ketua_rt
-- menulis. Supaya warga (termasuk status 'pending') bisa menautkan
-- rumahnya saat registrasi, sediakan fungsi SECURITY DEFINER yang
-- melewati RLS. auth.uid() tetap mengacu pada pemanggil (JWT).
-- ============================================================

CREATE OR REPLACE FUNCTION public.daftar_rumah(
  p_blok_rumah TEXT,
  p_no_rumah   TEXT,
  p_status_tinggal TEXT DEFAULT 'tetap'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_house   public.houses%ROWTYPE;
BEGIN
  -- Ambil profil milik pemanggil
  SELECT * INTO v_profile
  FROM public.profiles
  WHERE user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profil tidak ditemukan untuk akun ini';
  END IF;

  -- Cari rumah berdasarkan blok + no
  SELECT * INTO v_house
  FROM public.houses
  WHERE blok_rumah = UPPER(p_blok_rumah)
    AND no_rumah   = p_no_rumah;

  IF FOUND THEN
    IF v_house.profile_id IS NOT NULL AND v_house.profile_id <> v_profile.id THEN
      RAISE EXCEPTION 'Rumah Blok %-% sudah ditempati warga lain', UPPER(p_blok_rumah), p_no_rumah;
    END IF;

    UPDATE public.houses
    SET profile_id      = v_profile.id,
        status_tinggal  = p_status_tinggal
    WHERE id = v_house.id;

    RETURN v_house.id;
  ELSE
    INSERT INTO public.houses (blok_rumah, no_rumah, status_tinggal, profile_id)
    VALUES (UPPER(p_blok_rumah), p_no_rumah, p_status_tinggal, v_profile.id)
    RETURNING id INTO v_house.id;

    RETURN v_house.id;
  END IF;
END;
$$;

-- Izinkan semua user authenticated memanggil fungsi ini
GRANT EXECUTE ON FUNCTION public.daftar_rumah(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.daftar_rumah(TEXT, TEXT, TEXT) TO service_role;
