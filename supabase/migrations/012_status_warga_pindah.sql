-- ============================================================
-- 012: Status warga "pindah"
-- Warga yang pindah / keluar ditandai status 'pindah'
-- ============================================================

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_status_warga_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_status_warga_check
  CHECK (status_warga IN ('pending', 'aktif', 'menolak', 'pindah'));
