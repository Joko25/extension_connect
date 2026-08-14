-- Seeding struktur rumah: blok HA (1-38) & HB (1-34).
-- Menghapus blok dummy (A/B/C/D) lalu mengisi semua rumah pada blok yang valid,
-- tanpa menimpa link warga (profile_id) yang sudah ada.

-- 1. Hapus blok dummy yang bukan blok sebenarnya
DELETE FROM houses WHERE blok_rumah NOT IN ('HA', 'HB');

-- 2. Isi lengkap setiap blok untuk nomor yang belum ada
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
