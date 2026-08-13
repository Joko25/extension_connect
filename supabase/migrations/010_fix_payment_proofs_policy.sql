-- ============================================================
-- 010: Fix payment-proofs storage policy
-- Foldername berisi profile.id, bukan auth uid.
-- Validasi folder via join profiles(user_id = auth.uid()).
-- ============================================================

-- payment-proofs: Owner (aktif) bisa upload ke folder profile.id miliknya
DROP POLICY IF EXISTS "payment-proofs: upload own" ON storage.objects;
CREATE POLICY "payment-proofs: upload own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'payment-proofs'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.status_warga = 'aktif'
        AND p.id::text = (storage.foldername(name))[1]
    )
  );

-- payment-proofs: Owner (via profile) & bendahara & ketua_rt bisa READ
DROP POLICY IF EXISTS "payment-proofs: read own" ON storage.objects;
CREATE POLICY "payment-proofs: read own"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'payment-proofs'
    AND (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.user_id = auth.uid()
          AND p.id::text = (storage.foldername(name))[1]
      )
      OR public.get_user_role() IN ('bendahara', 'ketua_rt')
    )
  );
