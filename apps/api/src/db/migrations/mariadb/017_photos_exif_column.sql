-- Migration 017: store EXIF data in photos table
-- Allows insights to be computed before a gallery is published.

ALTER TABLE photos
  ADD COLUMN IF NOT EXISTS exif JSON NULL DEFAULT NULL
  AFTER photographer_id;
