# Architecture decisions

Key decisions made during development and the reasoning behind them.

---

## Monorepo structure

The project uses npm workspaces with three top-level packages:

```
packages/engine/    Build engine — pure functions, no I/O side effects
packages/shared/    Storage abstraction and utilities shared across packages
apps/api/           Express 5 API server + React SPA
workers/builder/    Background worker — polls job queue, calls engine
```

**Why separate the engine?** The engine has no dependency on the API's database, auth, or HTTP concerns. It can be tested in isolation, and the worker calls it directly (no subprocess, no inter-process communication).

**Why a separate worker?** Builds are CPU-intensive and can take minutes. Running them in the API process would block request handling. The worker is a dedicated Node.js process that shares the database with the API.

---

## MariaDB (not SQLite)

The project started with SQLite. It was migrated to MariaDB for:
- **Concurrent writes** — the worker and API write to the database simultaneously
- **Multi-organization** — foreign keys with cascade delete, complex joins for role resolution
- **Production reliability** — connection pooling, replication options

Migrations are numbered SQL files in `apps/api/src/db/migrations/mariadb/`. They run automatically on startup and are tracked in a `_migrations` table.

---

## Storage abstraction

Photos and build artifacts are accessed through a storage interface with two implementations:
- `LocalStorage` — reads/writes from the local filesystem
- `S3Storage` — reads/writes from an S3-compatible bucket

Both the API (for uploads) and the worker (for reading source photos and writing build output) use the same abstraction, so switching `STORAGE_DRIVER` from `local` to `s3` requires no code changes.

---

## Multi-organization architecture

The data model is: **Platform → Organization → Project → Gallery**.

"Organization" is used in the UI and documentation. The database and some legacy API routes use "studio" for historical reasons, but they refer to the same entity.

In `PLATFORM_MODE=single` (default) the hierarchy collapses — there is one organization and requests always resolve to it. This is fully backwards-compatible with earlier single-tenant deployments.

In `PLATFORM_MODE=multi`:
- Each request is resolved to an organization via the `Host` header
- Custom domains are stored in a `studio_domains` table
- Subdomains of `BASE_DOMAIN` are automatically routed by slug
- A `superadmin` can switch organization context with a `studio_override` cookie

**Authorization** uses a hierarchical `can(user, action, resource)` function that checks permissions in order: platform role → organization role → project role → gallery role → viewer token → public access.

`getOrgRole` resolves membership via both `organization_id` and `studio_id` fields to support both the new and legacy membership schema.

---

## Static gallery delivery

Built galleries are pure static files written to `public/<project-slug>/<gallery-slug>/`. For project galleries the `distName` is `{project-slug}/{gallery-slug}` (set by the builder). Caddy serves the `public/` directory directly — no API call is made when a visitor loads a gallery. This means:
- Galleries are fast (no server-side rendering)
- The API can be down without affecting public galleries
- Galleries can be copied to any CDN or static host

The trade-off is that access control for private galleries cannot be enforced at the HTTP level without a server in the path. Private galleries are built to hash-based paths (not guessable) and optionally require a viewer token.

---

## SSE for build logs

Build progress is streamed to the browser via Server-Sent Events (SSE) from `GET /api/jobs/:id/stream`. The worker writes log lines to the `build_events` table; the API streams rows to connected clients using long-polling.

The frontend displays a live console with an animated progress bar. Progress is estimated from log line patterns (phase detection) combined with an elastic timer that approaches 90% asymptotically and snaps to 100% on the `done` event.

---

## Session authentication

Sessions are stored in the database (`sessions` table) with an opaque token in an HTTP-only cookie. There are no JWTs.

Additional token types:
- **Invitation tokens** — one-time, expire after 72 hours, create a user account on acceptance
- **Viewer tokens** — long-lived, scoped to a gallery or project, grant read-only access without login
- **Personal upload tokens** — bearer tokens for programmatic/CLI uploads, scoped to a gallery or project
- **Magic links** — one-time login links sent by email (passwordless flow)
- **Password reset tokens** — one-time, expire after 1 hour

---

## Admin SPA routing

The React admin application is mounted at the `/admin` basename. All management routes are under `/admin/organizations/...`. The app redirects legacy paths (`/manage/*`, `/studio`, `/dashboard`) to their current equivalents for backwards compatibility.

The Inspector (`/inspector`) is a superadmin-only diagnostic tool that provides a cross-organization view of organizations, projects, galleries, photos, users, and anomalies.

---

## Internationalisation

The admin UI supports 18 locales: `en`, `fr`, `de`, `es`, `it`, `pt-BR`, `pt-PT`, `nl`, `ja`, `ko`, `pl`, `sv`, `tr`, `cs`, `uk`, `el`, `nb`, `da`. Locale files live in `apps/web/src/locales/`. The gallery viewer is localised separately at build time by the engine.
