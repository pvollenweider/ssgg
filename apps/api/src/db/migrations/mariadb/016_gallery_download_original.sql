-- Migration 016: add allow_download_original column to galleries
-- Allows administrators to permit downloading original full-resolution source files.

ALTER TABLE galleries
  ADD COLUMN IF NOT EXISTS allow_download_original TINYINT(1) NOT NULL DEFAULT 0
  AFTER allow_download_gallery;

ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS default_allow_download_original TINYINT(1) NOT NULL DEFAULT 0
  AFTER default_allow_download_gallery;
