-- Migration 022: add apache_protection flag to galleries
-- When enabled (standalone=1, access='password'), the build generates
-- a .htaccess placeholder and README-protection.md for Apache static hosting.

ALTER TABLE galleries
  ADD COLUMN IF NOT EXISTS apache_protection TINYINT(1) NOT NULL DEFAULT 0
  AFTER download_mode;
