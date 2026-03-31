-- 034_gallery_sort_order.sql
-- Add sort_order to galleries for manual ordering within a project
ALTER TABLE galleries ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0;
