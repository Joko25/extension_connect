-- ============================================================
-- Migration 003: Policy Tambah Warga Manual oleh Admin
-- Sekretaris & Ketua RT dapat membuat profil warga secara manual
-- (misal warga yang sudah punya akun auth tapi belum tercatat lengkap).
-- ============================================================

-- Sekretaris & ketua_rt bisa insert profil untuk user_id siapa pun
DROP POLICY IF EXISTS "profiles: insert manual (sekretaris, ketua_rt)" ON public.profiles;
CREATE POLICY "profiles: insert manual (sekretaris, ketua_rt)"
  ON public.profiles FOR INSERT
  WITH CHECK (
    public.get_user_role() IN ('sekretaris', 'ketua_rt')
  );
