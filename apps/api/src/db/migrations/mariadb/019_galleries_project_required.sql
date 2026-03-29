-- Migration 019: galleries must always belong to a project
-- Revert 018: remove any orphaned galleries, then enforce NOT NULL.

DELETE FROM galleries WHERE project_id IS NULL;

ALTER TABLE galleries
  MODIFY COLUMN project_id CHAR(36) NOT NULL;
