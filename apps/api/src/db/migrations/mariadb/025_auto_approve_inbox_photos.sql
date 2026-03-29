-- Migration 025: auto-approve all inbox photos
-- The inbox validation workflow is removed. Photos are now approved immediately on upload.
-- Existing photos in 'inbox' status (awaiting validation) are moved to 'approved'.
UPDATE photos SET status = 'approved' WHERE status = 'inbox';
