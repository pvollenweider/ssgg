-- Migration 014: Personal upload tokens
-- Idempotent — safe to run on both old installs (pre-baseline-consolidation) and
-- new installs where 001_baseline.sql already contains this schema.

CREATE TABLE IF NOT EXISTS personal_tokens (
  id            CHAR(36)      NOT NULL PRIMARY KEY,
  user_id       VARCHAR(32)   NOT NULL,
  name          VARCHAR(128)  NOT NULL,
  token_hash    CHAR(64)      NOT NULL UNIQUE,
  prefix        VARCHAR(12)   NOT NULL,
  scope_type    ENUM('gallery','project') NOT NULL,
  scope_id      CHAR(36)      NOT NULL,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_used_at  DATETIME      NULL,
  expires_at    DATETIME      NULL,
  revoked_at    DATETIME      NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX IF NOT EXISTS idx_personal_tokens_user  ON personal_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_personal_tokens_scope ON personal_tokens(scope_type, scope_id);

ALTER TABLE photos
  ADD COLUMN IF NOT EXISTS personal_token_id CHAR(36) NULL AFTER upload_link_id;

ALTER TABLE photos
  ADD CONSTRAINT IF NOT EXISTS fk_photos_personal_token
  FOREIGN KEY (personal_token_id) REFERENCES personal_tokens(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_photos_personal_token ON photos(personal_token_id);
