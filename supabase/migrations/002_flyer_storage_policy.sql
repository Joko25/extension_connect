-- ============================================================
-- STORAGE RLS POLICIES — announcement-flyers (PUBLIC)
-- Bucket sudah dibuat di 001_initial_schema.sql
-- Tambahan policy agar Humas & Ketua RT bisa upload flyer
-- ============================================================

-- Humas & Ketua RT bisa upload flyer
DROP POLICY IF EXISTS "announcement-flyers: upload (humas, ketua_rt)" ON storage.objects;
CREATE POLICY "announcement-flyers: upload (humas, ketua_rt)"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'announcement-flyers'
    AND public.get_user_role() IN ('humas', 'ketua_rt')
  );

-- Humas & Ketua RT bisa menghapus flyer yang mereka upload
DROP POLICY IF EXISTS "announcement-flyers: delete (humas, ketua_rt)" ON storage.objects;
CREATE POLICY "announcement-flyers: delete (humas, ketua_rt)"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'announcement-flyers'
    AND public.get_user_role() IN ('humas', 'ketua_rt')
  );
