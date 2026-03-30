-- Migration 031: backfill is_photographer for users with role = 'photographer'
UPDATE users SET is_photographer = 1 WHERE role = 'photographer' AND is_photographer = 0;
