# Commercial Edition

The GalleryPack commercial platform includes all components required to run a complete, multi-tenant gallery hosting service.

## What is included

### `apps/api/` — Platform API server

Node.js / Express 5 REST API handling:
- Authentication (sessions, magic links, password reset, personal tokens)
- Organization, project, gallery, and photo management
- Role-based access control (platform / organization / project / gallery levels)
- Build job queue and SSE build log streaming
- Invitation system (organization members, gallery collaborators) with copyable invite links
- Viewer token generation for private galleries
- Photo upload with format validation (JPEG, PNG, TIFF, HEIC, HEIF, AVIF)
- Thumbnail generation (sm/md WebP) with post-restart recovery
- Focal-length and photo insights
- S3 or local storage integration
- License validation

### `apps/web/` — Admin web application

React / Vite single-page application, mounted at `/admin`:
- Organization management and platform administration
- Gallery management, photo upload, build triggering
- Team and invitation management with copyable links
- Focal-length insights and photo statistics
- Multi-organization support for platform operators
- 18 supported UI locales
- Platform admin panel (`/admin/platform/`) with license, SMTP, branding, and team management

### `workers/builder/` — Build job worker

Node.js worker process:
- Polls job queue and dequeues build jobs
- Delegates to the gallery build engine (`packages/engine/`)
- Handles retries, timeouts, and error reporting via SSE

## Licensing

Use of the commercial components requires a valid license agreement. The source code is available in this repository for inspection and auditing, but is not freely deployable or redistributable.

## Contact

To obtain a commercial license or discuss pricing:

- Open an issue at [github.com/pvollenweider/gallerypack](https://github.com/pvollenweider/gallerypack)
- Contact the maintainer via GitHub

A formal license agreement will be provided. Terms vary depending on use case (single studio, multi-tenant SaaS, OEM integration).
