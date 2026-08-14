-- ============================================================
-- 020: Seeding ulang struktur rumah (HA 1-38 & HB 1-34)
-- Dipicu setelah reset_app_data mengosongkan tabel houses.
-- Idempotent: tidak menimpa rumah yang sudah ada.
-- ============================================================

INSERT INTO houses (blok_rumah, no_rumah, profile_id, status_tinggal, created_at, updated_at)
SELECT b.blok, n::text, NULL, 'tetap', now(), now()
FROM (
  SELECT 'HA' AS blok, generate_series(1, 38) AS n
  UNION ALL
  SELECT 'HB', generate_series(1, 34)
) b
WHERE NOT EXISTS (
  SELECT 1 FROM houses h WHERE h.blok_rumah = b.blok AND h.no_rumah = b.n::text
);
