-- ============================================================
-- 017: Tambah Warga Manual + Input Kas Manual
-- 1) Admin (sekretaris/ketua_rt) bisa upload dokumen KTP/KK warga
--    ke ktp-kk-docs saat menambah warga manual.
-- 2) Bendahara/ketua_rt bisa input kas iuran manual dengan
--    membuat kontribusi approved (pilih warga + bulan).
-- ============================================================

-- ─── Storage: ktp-kk-docs ────────────────────────────────────
-- Admin bisa mengunggah dokumen identitas atas nama warga
DROP POLICY IF EXISTS "ktp-kk: upload (sekretaris, ketua_rt)" ON storage.objects;
CREATE POLICY "ktp-kk: upload (sekretaris, ketua_rt)"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'ktp-kk-docs'
    AND public.get_user_role() IN ('sekretaris', 'ketua_rt')
  );

-- ─── RPC: set_warga_docs ─────────────────────────────────────
-- Kolom-kolom ktp_url/kk_url hanya bisa diubah oleh admin
-- (sekretaris/ketua_rt), tetap aman per-kolom (bukan semua kolom).
CREATE OR REPLACE FUNCTION public.set_warga_docs(
  p_profile_id UUID,
  p_ktp_path TEXT,
  p_kk_path TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.get_user_role() NOT IN ('sekretaris', 'ketua_rt') THEN
    RAISE EXCEPTION 'Unauthorized: hanya admin yang dapat mengubah dokumen warga';
  END IF;

  UPDATE public.profiles
  SET ktp_url = NULLIF(p_ktp_path, ''),
      kk_url  = NULLIF(p_kk_path, '')
  WHERE id = p_profile_id;
END;
$$;

-- ─── contributions: insert (bendahara, ketua_rt) ─────────────
-- Dibutuhkan untuk input kas iuran manual (pilih warga + bulan).
DROP POLICY IF EXISTS "contributions: insert (bendahara, ketua_rt)" ON public.contributions;
CREATE POLICY "contributions: insert (bendahara, ketua_rt)"
  ON public.contributions FOR INSERT
  WITH CHECK (public.get_user_role() IN ('bendahara', 'ketua_rt'));