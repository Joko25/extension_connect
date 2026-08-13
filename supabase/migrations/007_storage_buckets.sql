-- ============================================================
-- 007: Buat storage buckets (idempotent)
-- Bucket sempat tidak ada karena definisi awal ada di 001 yang
-- sudah terlanjur di-push tanpa pernyataan storage diterapkan.
-- ============================================================

-- Buat bucket (ON CONFLICT DO NOTHING agar aman dijalankan ulang)
INSERT INTO storage.buckets (id, name, public)
VALUES ('ktp-kk-docs', 'ktp-kk-docs', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('announcement-flyers', 'announcement-flyers', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('generated-pdfs', 'generated-pdfs', false)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- STORAGE RLS POLICIES (idempotent)
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

-- announcement-flyers: bucket public, izinkan semua user membaca
DROP POLICY IF EXISTS "announcement-flyers: read public" ON storage.objects;
CREATE POLICY "announcement-flyers: read public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'announcement-flyers');
