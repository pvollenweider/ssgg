-- Migration 018: allow galleries without a project (project_id nullable)

ALTER TABLE galleries
  MODIFY COLUMN project_id CHAR(36) NULL DEFAULT NULL;
