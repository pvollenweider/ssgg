-- Migration 032: unique constraint on (gallery_id, original_name) to prevent duplicate uploads
-- NULL values are treated as distinct by MySQL/MariaDB so legacy rows with NULL original_name
-- are unaffected by this constraint.
ALTER TABLE photos ADD CONSTRAINT uq_photos_gallery_original_name UNIQUE (gallery_id, original_name);
