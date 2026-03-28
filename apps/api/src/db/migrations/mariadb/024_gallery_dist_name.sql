-- Migration 024: store the actual built distName for each gallery
-- For password/private galleries the distName is a hash (not the user-defined slug),
-- so we must persist it after each build to be able to show the correct public URL.
ALTER TABLE galleries
  ADD COLUMN dist_name VARCHAR(255) NULL DEFAULT NULL
    COMMENT 'Actual dist directory name used in the last successful build (hash for password galleries)';
