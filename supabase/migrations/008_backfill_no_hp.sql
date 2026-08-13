-- ============================================================
-- 008: Simpan no_hp saat registrasi
-- Trigger handle_new_user sebelumnya tidak mengisi no_hp,
-- sehingga No. HP selalu null di data warga.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nama_lengkap, nik, no_kk, no_hp)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nama_lengkap', 'Belum diisi'),
    COALESCE(NEW.raw_user_meta_data->>'nik', ''),
    COALESCE(NEW.raw_user_meta_data->>'no_kk', ''),
    COALESCE(NEW.raw_user_meta_data->>'no_hp', '')
  );
  RETURN NEW;
END;
$$;

-- Backfill no_hp untuk warga yang sudah terdaftar (masih null)
UPDATE public.profiles p
SET no_hp = COALESCE(
  NULLIF(a.raw_user_meta_data->>'no_hp', ''),
  NULLIF(a.phone, '')
)
FROM auth.users a
WHERE p.user_id = a.id
  AND (p.no_hp IS NULL OR p.no_hp = '');