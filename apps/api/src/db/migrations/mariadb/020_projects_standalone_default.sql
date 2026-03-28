-- Migration 020: add standalone_default to projects
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS standalone_default TINYINT(1) NOT NULL DEFAULT 0;
