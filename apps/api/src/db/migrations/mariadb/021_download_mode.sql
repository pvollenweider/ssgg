-- Migration 021: replace three separate download booleans with a single download_mode enum
-- download_mode: 'none' | 'display' | 'original'
--   none     — no download allowed
--   display  — download 4K WebP display version only
--   original — download original source file

ALTER TABLE galleries
  ADD COLUMN IF NOT EXISTS download_mode ENUM('none','display','original') NOT NULL DEFAULT 'display'
  AFTER allow_download_original;

-- Migrate existing data: original > display > none
UPDATE galleries
SET download_mode = CASE
  WHEN allow_download_original = 1 THEN 'original'
  WHEN allow_download_image    = 1 THEN 'display'
  ELSE 'none'
END;
