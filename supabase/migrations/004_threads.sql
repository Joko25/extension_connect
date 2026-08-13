-- ============================================================
-- Migration 004: Thread Warga
-- Feed/forum komunitas — warga bisa membuat postingan
-- dan melihat postingan warga lain.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.threads (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  konten      TEXT NOT NULL,
  kategori    TEXT NOT NULL DEFAULT 'umum'
                CHECK (kategori IN ('umum', 'informasi', 'diskusi', 'keluhan', 'lainnya')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER threads_updated_at
  BEFORE UPDATE ON public.threads
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_threads_created_at ON public.threads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_threads_author_id  ON public.threads(author_id);

ALTER TABLE public.threads ENABLE ROW LEVEL SECURITY;

-- Semua warga aktif bisa melihat thread
DROP POLICY IF EXISTS "threads: select (all aktif)" ON public.threads;
CREATE POLICY "threads: select (all aktif)"
  ON public.threads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND status_warga = 'aktif'
    )
  );

-- Warga aktif bisa membuat thread
DROP POLICY IF EXISTS "threads: insert own" ON public.threads;
CREATE POLICY "threads: insert own"
  ON public.threads FOR INSERT
  WITH CHECK (
    author_id IN (
      SELECT id FROM public.profiles
      WHERE user_id = auth.uid() AND status_warga = 'aktif'
    )
  );

-- Author bisa mengubah thread miliknya
DROP POLICY IF EXISTS "threads: update own" ON public.threads;
CREATE POLICY "threads: update own"
  ON public.threads FOR UPDATE
  USING (
    author_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- Author bisa menghapus thread miliknya
DROP POLICY IF EXISTS "threads: delete own" ON public.threads;
CREATE POLICY "threads: delete own"
  ON public.threads FOR DELETE
  USING (
    author_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );
