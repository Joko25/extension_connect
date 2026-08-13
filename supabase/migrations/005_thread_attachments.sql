-- ============================================================
-- Migration 005: Attachment Gambar pada Thread Warga
-- Menambahkan kolom file pada tabel threads + bucket storage
-- ============================================================

-- Kolom lampiran pada threads
ALTER TABLE public.threads
  ADD COLUMN IF NOT EXISTS file_url  TEXT,
  ADD COLUMN IF NOT EXISTS file_name TEXT;

-- Bucket publik untuk lampiran gambar thread
INSERT INTO storage.buckets (id, name, public)
VALUES ('thread-attachments', 'thread-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Warga aktif bisa mengunggah lampiran
DROP POLICY IF EXISTS "thread-attachments: upload (aktif)" ON storage.objects;
CREATE POLICY "thread-attachments: upload (aktif)"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'thread-attachments'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND status_warga = 'aktif'
    )
  );

-- Warga aktif bisa membaca lampiran
DROP POLICY IF EXISTS "thread-attachments: select (aktif)" ON storage.objects;
CREATE POLICY "thread-attachments: select (aktif)"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'thread-attachments'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND status_warga = 'aktif'
    )
  );
