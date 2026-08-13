-- ============================================================
-- 009: Like & Komentar Thread
-- ============================================================

-- ── Thread Likes ──
CREATE TABLE IF NOT EXISTS public.thread_likes (
  thread_id   UUID NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
  profile_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (thread_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_thread_likes_thread ON public.thread_likes(thread_id);

ALTER TABLE public.thread_likes ENABLE ROW LEVEL SECURITY;

-- Semua warga aktif bisa melihat like
DROP POLICY IF EXISTS "thread_likes: select (all aktif)" ON public.thread_likes;
CREATE POLICY "thread_likes: select (all aktif)"
  ON public.thread_likes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND status_warga = 'aktif'
    )
  );

-- Warga aktif bisa memberi like
DROP POLICY IF EXISTS "thread_likes: insert own" ON public.thread_likes;
CREATE POLICY "thread_likes: insert own"
  ON public.thread_likes FOR INSERT
  WITH CHECK (
    profile_id IN (
      SELECT id FROM public.profiles
      WHERE user_id = auth.uid() AND status_warga = 'aktif'
    )
  );

-- Warga bisa mencabut like miliknya
DROP POLICY IF EXISTS "thread_likes: delete own" ON public.thread_likes;
CREATE POLICY "thread_likes: delete own"
  ON public.thread_likes FOR DELETE
  USING (
    profile_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- ── Thread Comments ──
CREATE TABLE IF NOT EXISTS public.thread_comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id   UUID NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
  author_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  konten      TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_thread_comments_thread ON public.thread_comments(thread_id);

ALTER TABLE public.thread_comments ENABLE ROW LEVEL SECURITY;

-- Semua warga aktif bisa melihat komentar
DROP POLICY IF EXISTS "thread_comments: select (all aktif)" ON public.thread_comments;
CREATE POLICY "thread_comments: select (all aktif)"
  ON public.thread_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND status_warga = 'aktif'
    )
  );

-- Warga aktif bisa berkomentar
DROP POLICY IF EXISTS "thread_comments: insert own" ON public.thread_comments;
CREATE POLICY "thread_comments: insert own"
  ON public.thread_comments FOR INSERT
  WITH CHECK (
    author_id IN (
      SELECT id FROM public.profiles
      WHERE user_id = auth.uid() AND status_warga = 'aktif'
    )
  );

-- Author bisa menghapus komentar miliknya
DROP POLICY IF EXISTS "thread_comments: delete own" ON public.thread_comments;
CREATE POLICY "thread_comments: delete own"
  ON public.thread_comments FOR DELETE
  USING (
    author_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );
