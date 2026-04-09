-- Migration 005: PWA defaults at project and org level
-- Adds pwa_default + color columns to projects and settings tables.

ALTER TABLE projects
  ADD COLUMN pwa_default            TINYINT(1)  NOT NULL DEFAULT 0    AFTER standalone_default,
  ADD COLUMN pwa_theme_color_default VARCHAR(7)  NOT NULL DEFAULT '#000000' AFTER pwa_default,
  ADD COLUMN pwa_bg_color_default    VARCHAR(7)  NOT NULL DEFAULT '#000000' AFTER pwa_theme_color_default;

ALTER TABLE settings
  ADD COLUMN default_pwa            TINYINT(1)  NOT NULL DEFAULT 0    AFTER default_private,
  ADD COLUMN default_pwa_theme_color VARCHAR(7)  NOT NULL DEFAULT '#000000' AFTER default_pwa,
  ADD COLUMN default_pwa_bg_color    VARCHAR(7)  NOT NULL DEFAULT '#000000' AFTER default_pwa_theme_color;
