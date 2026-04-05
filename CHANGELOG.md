# Changelog

All notable changes to GalleryPack are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [v1.7.0] - 2026-04-05

### Added
- **Gallery modes** — four first-class modes (portfolio, client_preview, client_delivery, archive) each with a fixed policy (access, downloads, watermark). Central `resolveGalleryPolicy()` module is the single source of truth for all policy-derived fields across API and worker.
- **Gallery settings split** — identity fields (`/settings`) separated from diffusion & security (`/access`), including mode selector, access controls, downloads, watermark and client sharing tokens.
- **Move gallery between projects** — drag gallery to another project from the settings page.
- **Viewer token gate on static files** — private gallery HTML is now blocked at the Express layer; requires a valid `?vt=` token or cookie before serving `index.html`.
- **Comprehensive SEO** — Open Graph, Twitter Cards, JSON-LD (`ImageGallery`, `CollectionPage`, `WebSite`), canonical links and `noindex` for private galleries on every gallery and project page.
- **`GET /sitemap.xml`** — dynamic sitemap listing all public galleries and projects with `lastmod`.
- **`GET /robots.txt`** — auto-generated, points to sitemap.
- **Inspector: global rebuild buttons** — "Rebuild all" and "Rebuild watermarks" buttons in the inspector dashboard for platform-wide maintenance.
- **Inspector: unified activity log** (`/inspector/activity`) — cross-source feed aggregating builds, photo uploads, admin actions and emails for the last 30 days, with type filter and auto-refresh.
- **UX confirmation modals** — confirmation required before switching a gallery to public or enabling original downloads.
- **`scripts/backfill-gallery-modes.js`** — classifies existing galleries with `gallery_mode IS NULL` using a heuristic (dry-run by default, `--apply` to commit).
- **64 unit tests** for `resolveGalleryPolicy`, `validateModeConstraints`, `applyModeDefaults` and `GALLERY_MODES`.
- **Mode badge and public/token links** in the project gallery table.
- **7-level date formatting** for gallery and project cards.
- **Comprehensive mobile UX** improvements across all management interfaces.

### Changed
- Watermark is **locked by gallery mode** — portfolio/client_preview/client_delivery always enable watermark; archive always disables it.
- Watermark text auto-derived from photographer: primary user → guest photographer → per-photo attribution → gallery author. No title/slug fallback — no name means no watermark.
- Builder `galleryToProjectConfig()` now delegates to `resolveGalleryPolicy()` instead of duplicating mode logic.
- Gallery public URLs deduplicated — slug already includes project prefix, no double prepend.
- **K3s worker scaled** for production: 2 replicas, limits 8 CPU / 10 Gi RAM per pod, `SHARP_CONCURRENCY=6`, `NODE_OPTIONS=--max-old-space-size=7168`.
- Mode selector and access settings moved to dedicated `/access` page with rebuild warning banner.

### Fixed
- Gallery mode not saving — constraint validation was running before `applyModeDefaults`, causing false 400 errors.
- Watermark not applied for mode-based galleries — builder was only reading `config_json`, never checking `gallery_mode`.
- Wrong JOIN for photographer name in builder — `primary_photographer_id` is FK to `users`, not `photographers`.
- Duplicate project slug in gallery public URLs on project pages.
- Mobile `bar-meta` overflow on gallery toolbar.
- Project-gallery URL fallback now matches `dist_name` and preserves query string.

### Security
- Private gallery static files gated behind viewer token verification at the Express layer (not just JS-side).

---

## [v1.6.0] - 2026-02

### Added
- Resumable uploads via tus protocol (@uppy/tus + @tus/server)
- Resumable upload endpoint for public upload-link flow
- Structured JSON logging with Pino and Prometheus metrics
- BullMQ + Redis persistent queues for thumbnails and prerender
- Storage quotas, bandwidth throttling, Sentry integration, checksum verification
- Duplicate conflict resolution dialog (skip, rename, overwrite)
- Show original filename, sort photos by EXIF date, sticky upload zone
- Auto-remove completed photos from upload queue grid
- Photo attribution -- filter by photographer with legal mentions
- Team page -- add/edit members with bio and photographer flag
- Photographer-as-user refactor with bulk assign
- Gallery hero image, Markdown description, primary photographer
- Gallery photos maintenance UI -- reconcile and reanalyze with result display
- Platform team management, gallery description, collaborator access
- Gallery maintenance endpoint to bootstrap missing thumbnails

### Changed
- Pause prerender queue during uploads to prevent Sharp contention

### Fixed
- Cross-device move between Docker bind mounts (EXDEV)
- Adapt hooks and metadata to @tus/server v2 API
- Deduplicate uploads by original_name to prevent quota inflation
- Deduplicate existing photos with unique constraint to prevent race-condition duplicates
- Isolate Sharp in child process + use Buffer input to prevent SIGBUS on iOS Live Photos
- AdminToast component API fix (broken since rewrite)
- Legacy studio-only membership rows (organization_id IS NULL)
- Create member -- add existing user to org instead of blocking with 409
- Migration 029 -- drop FK by auto-generated name before column drop
- Thumbnail generation -- use toBuffer() to prevent 0-byte files on Sharp failure

---

## [v1.5.0] - 2026-01

### Added
- Multi-organization platform mode (PLATFORM_MODE=multi) with subdomain routing
- Superadmin role with organization management and context switching
- Organization CRUD with custom domains
- Platform admin panel (license, SMTP, branding, team management)
- K3s / Kubernetes deployment manifests
- Docker image build and push to GHCR via CI
- Comprehensive documentation refresh
- Gallery Photos Hub with reconcile and reanalyze
- Settings consolidation
- Navigation architecture overhaul
- Download control with Apache standalone protection
- Internationalized sidebar, insights, build log inline, photo drill-down
- Original photo download endpoint
- Invitation accept page with copyable invite links
- Team page for studio member management
- Access management UI and audit log
- Viewer tokens and unified access model
- Route authorization hardening and invitation system
- Gallery memberships and can() authorization engine
- Auth hardening and studio memberships

### Fixed
- Persist gallery distName after build for correct public URL on password galleries
- Remove duplicate localhost site block in Caddyfile
- Purge secrets from history, fix low-entropy password generator

---

## [v1.4.0] - 2025

### Added
- Hash filenames and needs_rebuild tracking
- Admin UX overhaul -- i18n, gallery filters, folder upload, slug auto-gen, description, danger zone
- Toast notifications, global settings page, footer, gallery card hover effect
- Smart date range from EXIF, rebuild banner, sort icon toggle
- Public landing page, gallery view link in card, photo sort and drag-and-drop reorder
- Photo preview endpoint, cover photo picker, date picker, instant thumbnails

### Fixed
- Caddy try_files for gallery directory requests
- Docker volume mounts for source and dist
- Boolean field conversion for SQLite binding

---

## [v1.3.0] - 2025

### Added
- GalleryPack rebrand (from SSGG)
- Cover images
- Interactive gallery selection in publish command
- Tests, utils module, manifest versioning, config validation
- Basic auth, delivery docs, npm run publish
- Fallbacks, build summary, safe deploy

---

## Earlier releases

### v1.1.2
- Reverse geocoding locale-aware via Accept-Language

### v1.1.1
- GPS Maps link in EXIF metadata panel

### v1.1.0
- Initial public release with static gallery generation

### v1.0.0
- Initial SSGG build system -- static gallery generator
