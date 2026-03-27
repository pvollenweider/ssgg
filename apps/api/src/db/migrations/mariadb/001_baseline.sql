-- Copyright (c) 2026 Philippe Vollenweider
-- This file is part of the GalleryPack commercial platform.
-- Proprietary and confidential. All rights reserved.

-- GalleryPack — MariaDB baseline schema (consolidated, fresh-install only)
-- Represents the fully-evolved schema after all incremental migrations.
-- Applied once on first boot; the migration runner records it and stops.

-- ── Studios (tenants) ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS studios (
  id          VARCHAR(32)  NOT NULL PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  slug        VARCHAR(128) NOT NULL UNIQUE,
  plan        VARCHAR(32)  NOT NULL DEFAULT 'free',
  is_default  TINYINT(1)   NOT NULL DEFAULT 0,
  locale      VARCHAR(8)   DEFAULT NULL,
  country     VARCHAR(8)   DEFAULT NULL,
  created_at  BIGINT       NOT NULL,
  updated_at  BIGINT       NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Organizations (canonical tenant model, Sprint 22) ─────────────────────────

CREATE TABLE IF NOT EXISTS organizations (
  id          VARCHAR(36)  NOT NULL PRIMARY KEY,
  slug        VARCHAR(128) NOT NULL,
  name        VARCHAR(255) NOT NULL,
  locale      VARCHAR(10)  NULL,
  country     VARCHAR(4)   NULL,
  is_default  TINYINT(1)   NOT NULL DEFAULT 0,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_org_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Studio domains (multi-tenant routing) ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS studio_domains (
  id              VARCHAR(32)  NOT NULL PRIMARY KEY,
  studio_id       VARCHAR(32)  NOT NULL,
  organization_id VARCHAR(36)  NULL DEFAULT NULL,
  domain          VARCHAR(255) NOT NULL UNIQUE,
  is_primary      TINYINT(1)   NOT NULL DEFAULT 0,
  created_at      BIGINT       NOT NULL,
  FOREIGN KEY (studio_id)       REFERENCES studios(id)       ON DELETE CASCADE,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_studio_domains_studio ON studio_domains(studio_id);
CREATE INDEX idx_domains_org           ON studio_domains(organization_id);

-- ── Users ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id                VARCHAR(32)  NOT NULL PRIMARY KEY,
  studio_id         VARCHAR(32),
  organization_id   VARCHAR(36)  NULL DEFAULT NULL,
  email             VARCHAR(255) NOT NULL UNIQUE,
  password_hash     TEXT,
  role              VARCHAR(32)  NOT NULL DEFAULT 'photographer',
  name              VARCHAR(255),
  locale            VARCHAR(16),
  platform_role     VARCHAR(32)  DEFAULT NULL,
  notify_on_upload  TINYINT(1)   NOT NULL DEFAULT 1,
  notify_on_publish TINYINT(1)   NOT NULL DEFAULT 1,
  created_at        BIGINT       NOT NULL,
  updated_at        BIGINT       NOT NULL,
  FOREIGN KEY (studio_id) REFERENCES studios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_users_studio        ON users(studio_id);
CREATE INDEX idx_users_email         ON users(email);
CREATE INDEX idx_users_platform_role ON users(platform_role);

-- ── Sessions ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sessions (
  id          VARCHAR(64)  NOT NULL PRIMARY KEY,
  user_id     VARCHAR(32)  NOT NULL,
  expires_at  BIGINT       NOT NULL,
  created_at  BIGINT       NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_sessions_user    ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- ── Projects ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS projects (
  id              CHAR(36)     NOT NULL PRIMARY KEY,
  studio_id       CHAR(36)     NOT NULL,
  organization_id VARCHAR(36)  NULL DEFAULT NULL,
  slug            VARCHAR(100) NOT NULL,
  name            VARCHAR(255) NOT NULL,
  description     TEXT,
  visibility      VARCHAR(20)  NOT NULL DEFAULT 'restricted',
  starts_at       BIGINT,
  ends_at         BIGINT,
  status          VARCHAR(20)  NOT NULL DEFAULT 'active',
  created_at      BIGINT       NOT NULL,
  updated_at      BIGINT       NOT NULL,
  UNIQUE KEY uq_project_slug (studio_id, slug),
  FOREIGN KEY (studio_id)       REFERENCES studios(id)       ON DELETE CASCADE,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_projects_studio ON projects(studio_id);
CREATE INDEX idx_projects_org    ON projects(organization_id);

-- ── Project role assignments ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS project_role_assignments (
  id                 CHAR(36)    NOT NULL PRIMARY KEY,
  project_id         CHAR(36)    NOT NULL,
  user_id            CHAR(36)    NOT NULL,
  role               VARCHAR(50) NOT NULL,
  granted_by_user_id CHAR(36),
  created_at         BIGINT      NOT NULL,
  UNIQUE KEY uq_project_role (project_id, user_id),
  FOREIGN KEY (project_id)         REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)            REFERENCES users(id)    ON DELETE CASCADE,
  FOREIGN KEY (granted_by_user_id) REFERENCES users(id)    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_project_role_user ON project_role_assignments(user_id);
CREATE INDEX idx_pra_user_project  ON project_role_assignments(user_id, project_id);

-- ── Galleries ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS galleries (
  id                     VARCHAR(32)  NOT NULL PRIMARY KEY,
  studio_id              VARCHAR(32)  NOT NULL,
  organization_id        VARCHAR(36)  NULL DEFAULT NULL,
  project_id             CHAR(36)     NOT NULL,
  slug                   VARCHAR(255) NOT NULL,
  title                  VARCHAR(512),
  subtitle               VARCHAR(512),
  author                 VARCHAR(255),
  author_email           VARCHAR(255),
  date                   VARCHAR(32),
  location               VARCHAR(512),
  locale                 VARCHAR(16)  NOT NULL DEFAULT 'en',
  access                 VARCHAR(32)  NOT NULL DEFAULT 'public',
  visibility             VARCHAR(20)  NOT NULL DEFAULT 'restricted',
  password_hash          TEXT,
  standalone             TINYINT(1)   NOT NULL DEFAULT 0,
  allow_download_image   TINYINT(1)   NOT NULL DEFAULT 1,
  allow_download_gallery TINYINT(1)   NOT NULL DEFAULT 1,
  cover_photo            VARCHAR(512),
  slideshow_interval     INT,
  copyright              VARCHAR(512),
  description            TEXT,
  config_json            MEDIUMTEXT,
  build_status           VARCHAR(32)  NOT NULL DEFAULT 'pending',
  workflow_status        ENUM('draft','ready','published') NOT NULL DEFAULT 'draft',
  active                 TINYINT(1)   NOT NULL DEFAULT 1,
  needs_rebuild          TINYINT(1)   NOT NULL DEFAULT 0,
  photo_order            MEDIUMTEXT,
  built_at               BIGINT,
  created_at             BIGINT       NOT NULL,
  updated_at             BIGINT       NOT NULL,
  UNIQUE (studio_id, slug),
  FOREIGN KEY (studio_id)       REFERENCES studios(id)       ON DELETE CASCADE,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id)      REFERENCES projects(id)      ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_galleries_studio          ON galleries(studio_id);
CREATE INDEX idx_galleries_org             ON galleries(organization_id);
CREATE INDEX idx_galleries_project         ON galleries(project_id);
CREATE INDEX idx_galleries_slug            ON galleries(slug);
CREATE INDEX idx_galleries_studio_status   ON galleries(studio_id, build_status);
CREATE INDEX idx_galleries_studio_access   ON galleries(studio_id, access);
CREATE INDEX idx_galleries_studio_updated  ON galleries(studio_id, updated_at);
CREATE INDEX idx_galleries_workflow_status ON galleries(organization_id, workflow_status);

-- ── Gallery role assignments ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS gallery_role_assignments (
  id                 CHAR(36)    NOT NULL PRIMARY KEY,
  gallery_id         CHAR(36)    NOT NULL,
  user_id            CHAR(36)    NOT NULL,
  role               VARCHAR(50) NOT NULL,
  granted_by_user_id CHAR(36),
  created_at         BIGINT      NOT NULL,
  UNIQUE KEY uq_gallery_role (gallery_id, user_id),
  FOREIGN KEY (gallery_id)         REFERENCES galleries(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)            REFERENCES users(id)     ON DELETE CASCADE,
  FOREIGN KEY (granted_by_user_id) REFERENCES users(id)     ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_gallery_role_user ON gallery_role_assignments(user_id);
CREATE INDEX idx_gra_user_gallery  ON gallery_role_assignments(user_id, gallery_id);

-- ── Unified scoped invites ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS invites (
  id                  CHAR(36)     NOT NULL PRIMARY KEY,
  email               VARCHAR(255) NOT NULL,
  scope_type          VARCHAR(20)  NOT NULL,
  scope_id            CHAR(64)     NOT NULL,
  role_to_grant       VARCHAR(50)  NOT NULL,
  organization_id     VARCHAR(36)  NULL,
  token_hash          CHAR(64)     NOT NULL UNIQUE,
  expires_at          BIGINT       NOT NULL,
  used_at             BIGINT,
  revoked_at          BIGINT,
  created_by_user_id  VARCHAR(32),
  created_at          BIGINT       NOT NULL,
  CONSTRAINT fk_invites_created_by FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_invites_scope ON invites(scope_type, scope_id);
CREATE INDEX idx_invites_email ON invites(email);

-- ── Viewer tokens v2 (scoped) ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS viewer_tokens (
  id                  CHAR(36)     NOT NULL PRIMARY KEY,
  scope_type          VARCHAR(20)  NOT NULL,
  scope_id            CHAR(64)     NOT NULL,
  email               VARCHAR(255),
  label               VARCHAR(255),
  token_hash          CHAR(64)     NOT NULL UNIQUE,
  expires_at          BIGINT,
  revoked_at          BIGINT,
  last_used_at        BIGINT,
  created_by_user_id  VARCHAR(32),
  created_at          BIGINT       NOT NULL,
  CONSTRAINT fk_vt_created_by FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_viewer_tokens_scope ON viewer_tokens(scope_type, scope_id);

-- ── Build jobs ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS build_jobs (
  id              VARCHAR(32)  NOT NULL PRIMARY KEY,
  gallery_id      VARCHAR(32)  NOT NULL,
  studio_id       VARCHAR(32)  NOT NULL,
  organization_id VARCHAR(36)  NULL DEFAULT NULL,
  status          VARCHAR(32)  NOT NULL DEFAULT 'queued',
  triggered_by    VARCHAR(255),
  `force`         TINYINT(1)   NOT NULL DEFAULT 0,
  started_at      BIGINT,
  finished_at     BIGINT,
  updated_at      BIGINT,
  error_msg       TEXT,
  created_at      BIGINT       NOT NULL,
  FOREIGN KEY (gallery_id)      REFERENCES galleries(id)     ON DELETE CASCADE,
  FOREIGN KEY (studio_id)       REFERENCES studios(id)       ON DELETE CASCADE,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_jobs_gallery       ON build_jobs(gallery_id);
CREATE INDEX idx_jobs_status        ON build_jobs(status);
CREATE INDEX idx_jobs_studio        ON build_jobs(studio_id);
CREATE INDEX idx_jobs_studio_status ON build_jobs(studio_id, status);
CREATE INDEX idx_build_jobs_org     ON build_jobs(organization_id);

-- ── Build events (streaming log) ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS build_events (
  id         BIGINT      NOT NULL PRIMARY KEY AUTO_INCREMENT,
  job_id     VARCHAR(32) NOT NULL,
  seq        INT         NOT NULL,
  type       VARCHAR(32) NOT NULL DEFAULT 'log',
  data       TEXT        NOT NULL,
  created_at BIGINT      NOT NULL,
  FOREIGN KEY (job_id) REFERENCES build_jobs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_events_job ON build_events(job_id, seq);

-- ── App settings (per studio) ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS settings (
  studio_id                      VARCHAR(32)  NOT NULL PRIMARY KEY,
  organization_id                VARCHAR(36)  NULL,
  smtp_host                      VARCHAR(255),
  smtp_port                      INT,
  smtp_user                      VARCHAR(255),
  smtp_pass                      TEXT,
  smtp_from                      VARCHAR(255),
  smtp_secure                    TINYINT(1)   NOT NULL DEFAULT 0,
  apache_path                    TEXT,
  base_url                       TEXT,
  site_title                     VARCHAR(512),
  default_author                 VARCHAR(255),
  default_author_email           VARCHAR(255),
  default_locale                 VARCHAR(16)  NOT NULL DEFAULT 'fr',
  default_access                 VARCHAR(32)  NOT NULL DEFAULT 'public',
  default_allow_download_image   TINYINT(1)   NOT NULL DEFAULT 1,
  default_allow_download_gallery TINYINT(1)   NOT NULL DEFAULT 0,
  default_private                TINYINT(1)   NOT NULL DEFAULT 0,
  updated_at                     BIGINT       NOT NULL,
  FOREIGN KEY (studio_id) REFERENCES studios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Email log ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS email_log (
  id              VARCHAR(36)  NOT NULL PRIMARY KEY,
  studio_id       VARCHAR(32),
  organization_id VARCHAR(36)  NULL DEFAULT NULL,
  to_address      VARCHAR(255) NOT NULL,
  subject         VARCHAR(512) NOT NULL,
  template        VARCHAR(64),
  status          VARCHAR(32)  NOT NULL DEFAULT 'sent',
  error           TEXT,
  sent_at         BIGINT       NOT NULL,
  FOREIGN KEY (studio_id) REFERENCES studios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_email_log_studio ON email_log(studio_id);

-- ── Studio memberships ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS studio_memberships (
  id              VARCHAR(32) NOT NULL PRIMARY KEY,
  studio_id       VARCHAR(32) NOT NULL,
  organization_id VARCHAR(36) NULL DEFAULT NULL,
  user_id         VARCHAR(32) NOT NULL,
  role            VARCHAR(32) NOT NULL DEFAULT 'collaborator',
  created_at      BIGINT      NOT NULL,
  UNIQUE (studio_id, user_id),
  FOREIGN KEY (studio_id)       REFERENCES studios(id)       ON DELETE CASCADE,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)         REFERENCES users(id)         ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_studio_memberships_studio ON studio_memberships(studio_id);
CREATE INDEX idx_studio_memberships_user   ON studio_memberships(user_id);
CREATE INDEX idx_memberships_org           ON studio_memberships(organization_id);
CREATE INDEX idx_sm_user_studio            ON studio_memberships(user_id, studio_id);

-- ── Studio invitations ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS invitations (
  id              VARCHAR(36)  NOT NULL PRIMARY KEY,
  studio_id       VARCHAR(32)  NOT NULL,
  organization_id VARCHAR(36)  NULL DEFAULT NULL,
  email           VARCHAR(255) NOT NULL,
  role            VARCHAR(32)  NOT NULL,
  token           VARCHAR(64)  NOT NULL,
  token_hash      VARCHAR(64)  NOT NULL UNIQUE,
  created_by      VARCHAR(32),
  created_at      BIGINT       NOT NULL,
  expires_at      BIGINT       NOT NULL,
  accepted_at     BIGINT       DEFAULT NULL,
  gallery_id      VARCHAR(32)  DEFAULT NULL,
  gallery_role    VARCHAR(32)  DEFAULT NULL,
  CONSTRAINT fk_invitations_studio  FOREIGN KEY (studio_id)       REFERENCES studios(id)       ON DELETE CASCADE,
  CONSTRAINT fk_invitations_org     FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_invitations_gallery FOREIGN KEY (gallery_id)      REFERENCES galleries(id)     ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_invitations_studio ON invitations(studio_id);
CREATE INDEX idx_invitations_email  ON invitations(email);

-- ── Gallery upload links (photographer upload access) ─────────────────────────

CREATE TABLE IF NOT EXISTS gallery_upload_links (
  id                  CHAR(36)     NOT NULL PRIMARY KEY,
  gallery_id          CHAR(36)     NOT NULL,
  token_hash          CHAR(64)     NOT NULL,
  token               VARCHAR(64)  NULL,
  label               VARCHAR(255) NULL,
  expires_at          DATETIME     NULL,
  revoked_at          DATETIME     NULL,
  created_by_user_id  VARCHAR(32)  NULL,
  created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_upload_link_token (token_hash),
  FOREIGN KEY (gallery_id)         REFERENCES galleries(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id)     ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_upload_links_gallery ON gallery_upload_links(gallery_id);
CREATE INDEX idx_upload_links_token   ON gallery_upload_links(token);

-- ── Photographers (named entities for photo attribution) ──────────────────────

CREATE TABLE IF NOT EXISTS photographers (
  id              VARCHAR(36)  NOT NULL PRIMARY KEY,
  gallery_id      VARCHAR(36)  NOT NULL,
  organization_id VARCHAR(36)  NULL DEFAULT NULL,
  name            VARCHAR(255) NOT NULL,
  email           VARCHAR(255) NULL,
  bio             TEXT         NULL,
  upload_link_id  VARCHAR(36)  NULL,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_photographer_gallery FOREIGN KEY (gallery_id)     REFERENCES galleries(id)            ON DELETE CASCADE,
  CONSTRAINT fk_photographer_link    FOREIGN KEY (upload_link_id) REFERENCES gallery_upload_links(id)  ON DELETE SET NULL,
  INDEX idx_photographer_gallery (gallery_id),
  INDEX idx_photographer_link    (upload_link_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Photos ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS photos (
  id                  CHAR(36)     NOT NULL PRIMARY KEY,
  gallery_id          CHAR(36)     NOT NULL,
  filename            VARCHAR(255) NOT NULL,
  original_name       VARCHAR(255) NULL,
  size_bytes          BIGINT       NULL,
  sort_order          INT          NOT NULL DEFAULT 0,
  status              ENUM('uploaded','validated','published') NOT NULL DEFAULT 'validated',
  uploaded_by_user_id VARCHAR(32)  NULL,
  upload_link_id      CHAR(36)     NULL,
  photographer_id     VARCHAR(36)  NULL,
  created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_gallery_file (gallery_id, filename),
  FOREIGN KEY (gallery_id)      REFERENCES galleries(id)            ON DELETE CASCADE,
  FOREIGN KEY (upload_link_id)  REFERENCES gallery_upload_links(id) ON DELETE SET NULL,
  FOREIGN KEY (photographer_id) REFERENCES photographers(id)        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_photos_gallery_status ON photos(gallery_id, status);
CREATE INDEX idx_photos_upload_link    ON photos(upload_link_id);

-- ── Inspector audit log ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS inspector_audit_log (
  id           CHAR(36)     NOT NULL PRIMARY KEY,
  actor_id     VARCHAR(32)  NOT NULL,
  action       VARCHAR(64)  NOT NULL,
  target_type  VARCHAR(32)  NOT NULL,
  target_id    VARCHAR(64)  NOT NULL,
  before_state JSON         NULL,
  after_state  JSON         NULL,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ial_target  (target_type, target_id),
  INDEX idx_ial_actor   (actor_id),
  INDEX idx_ial_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Audit log ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_log (
  id          VARCHAR(36)  NOT NULL PRIMARY KEY,
  studio_id   VARCHAR(32),
  user_id     VARCHAR(32),
  action      VARCHAR(128) NOT NULL,
  target_type VARCHAR(64),
  target_id   VARCHAR(36),
  meta        TEXT,
  created_at  BIGINT       NOT NULL,
  FOREIGN KEY (studio_id) REFERENCES studios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_audit_log_studio ON audit_log(studio_id, created_at);
CREATE INDEX idx_audit_log_user   ON audit_log(user_id, created_at);
CREATE INDEX idx_audit_target     ON audit_log(target_type, target_id);
CREATE INDEX idx_audit_user       ON audit_log(user_id);

-- ── Password reset tokens ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id         VARCHAR(36)  NOT NULL PRIMARY KEY,
  user_id    VARCHAR(32)  NOT NULL,
  token      VARCHAR(64)  NOT NULL UNIQUE,
  token_hash VARCHAR(64)  NOT NULL UNIQUE,
  created_at BIGINT       NOT NULL,
  expires_at BIGINT       NOT NULL,
  used_at    BIGINT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_prt_token_hash ON password_reset_tokens(token_hash);

-- ── Magic links (passwordless login) ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS magic_links (
  id         VARCHAR(36)  NOT NULL PRIMARY KEY,
  user_id    VARCHAR(32)  NOT NULL,
  token      VARCHAR(64)  NOT NULL UNIQUE,
  token_hash VARCHAR(64)  NOT NULL UNIQUE,
  created_at BIGINT       NOT NULL,
  expires_at BIGINT       NOT NULL,
  used_at    BIGINT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_magic_links_token_hash ON magic_links(token_hash);
