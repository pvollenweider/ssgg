# Changelog

All notable changes to GalleryPack are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [v1.7.0] - 2026-03

### Added
- Watermark on full-size lightbox images using DIN Tape font with Sharp SVG compositing
- Build cancellation -- stop queued or running builds from the admin UI
- Gallery sort order via drag-and-drop reorder within projects
- Cover gallery per project and cover project per organization
- Project reorder via drag-and-drop
- Date phrases on gallery and project cards with manual gallery date field
- Organization description Markdown editor and gallery-hero layout on org index page
- Pre-generate static index.html for landing pages at startup
- Manual prerender buttons in admin UI
- "Republier tout" button to rebuild all galleries in a project or organization
- Redesigned public project page with gallery-hero aesthetic
- Cover photo selection via star button on photo cards
- Photographer names, description, and smart dates on project pages
- Markdown description editor for projects
- Sort project galleries by most recent photo date

### Changed
- Watermark font size is 1.5% of the shortest side (height for landscape, width for portrait)
- Watermark text defaults to copyright + author name
- Photographer names displayed below hero divider with "Photos de" prefix
- Use relative links in landing pages (organization-slug agnostic)

### Fixed
- Watermark missing font-family quotes in SVG, empty text fallback to title
- Show gallery title instead of ID on job detail page
- Build log scrolls inside container instead of full page
- Remove all /admin links from public pages
- Use build_status column name in build-all queries

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
