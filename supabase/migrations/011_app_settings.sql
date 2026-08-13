-- ============================================================
-- 011: Pengaturan Aplikasi (app_settings)
-- Menyimpan konfigurasi seperti nomor rekening iuran
-- dan saldo awal kas (setup kas berjalan).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.app_settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Semua warga aktif bisa membaca pengaturan (misal nomor rekening)
DROP POLICY IF EXISTS "app_settings: select (all aktif)" ON public.app_settings;
CREATE POLICY "app_settings: select (all aktif)"
  ON public.app_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND status_warga = 'aktif'
    )
  );

-- Bendahara & ketua_rt bisa mengubah pengaturan
DROP POLICY IF EXISTS "app_settings: insert (bendahara, ketua_rt)" ON public.app_settings;
CREATE POLICY "app_settings: insert (bendahara, ketua_rt)"
  ON public.app_settings FOR INSERT
  WITH CHECK (public.get_user_role() IN ('bendahara', 'ketua_rt'));

DROP POLICY IF EXISTS "app_settings: update (bendahara, ketua_rt)" ON public.app_settings;
CREATE POLICY "app_settings: update (bendahara, ketua_rt)"
  ON public.app_settings FOR UPDATE
  USING (public.get_user_role() IN ('bendahara', 'ketua_rt'));
