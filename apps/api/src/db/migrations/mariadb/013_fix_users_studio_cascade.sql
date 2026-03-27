-- Migration 013: fix users.studio_id CASCADE → SET NULL
-- Deleting a studio was silently deleting all users whose studio_id pointed to it.
-- Users should survive studio deletion (studio_id becomes NULL, reassigned at login).
--
-- NOTE: 001_baseline.sql was updated to already use ON DELETE SET NULL.
-- This migration is kept for existing installations that ran the original baseline.
-- It is safe to re-run (DROP + ADD is idempotent for the net result).

-- Drop the old CASCADE constraint (auto-named by MariaDB on existing installs)
ALTER TABLE users DROP FOREIGN KEY IF EXISTS users_ibfk_1;
ALTER TABLE users DROP FOREIGN KEY IF EXISTS fk_users_studio;

ALTER TABLE users
  ADD CONSTRAINT fk_users_studio
  FOREIGN KEY (studio_id) REFERENCES studios(id) ON DELETE SET NULL;
