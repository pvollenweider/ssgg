-- Migration 023: add default_download_mode to settings
-- Mirrors the gallery-level download_mode enum for org-wide defaults.

ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS default_download_mode ENUM('none','display','original') NOT NULL DEFAULT 'display'
  AFTER default_allow_download_original;

-- Migrate from existing flags
UPDATE settings
SET default_download_mode = CASE
  WHEN default_allow_download_image = 1 THEN 'display'
  ELSE 'none'
END;
