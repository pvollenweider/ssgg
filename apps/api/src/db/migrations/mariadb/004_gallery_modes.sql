-- 004_gallery_modes.sql
-- Sprint 1: introduce gallery_mode as the high-level intent for a gallery.
--
-- gallery_mode is intentionally NULL for existing galleries so that:
--   - legacy rows keep their existing flag-based behaviour unchanged
--   - new galleries can be assigned a mode at creation or later
--   - backfill can happen gradually in Sprint 3 (scripts/backfill-gallery-modes.js)
--
-- When gallery_mode IS NOT NULL the policy resolver (resolveGalleryPolicy) treats
-- it as the source of truth and derives the low-level flags from it.

ALTER TABLE galleries
  ADD COLUMN IF NOT EXISTS gallery_mode
    ENUM('portfolio','client_preview','client_delivery','archive')
    NULL
    DEFAULT NULL
    COMMENT 'High-level gallery intent. NULL = legacy flag-based behaviour.'
  AFTER allow_download_original;
