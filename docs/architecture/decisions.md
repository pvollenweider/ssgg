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
- **Multi-studio** — foreign keys with cascade delete, complex joins for role resolution
- **Production reliability** — connection pooling, replication options

Migrations are numbered SQL files in `apps/api/src/db/migrations/mariadb/`. They run automatically on startup and are tracked in a `_migrations` table.

---

## Storage abstraction

Photos and build artifacts are accessed through a storage interface with two implementations:
- `LocalStorage` — reads/writes from the local filesystem
- `S3Storage` — reads/writes from an S3-compatible bucket

Both the API (for uploads) and the worker (for reading source photos and writing build output) use the same abstraction, so switching `STORAGE_DRIVER` from `local` to `s3` requires no code changes.

---

## Multi-studio architecture

The data model is: **Platform → Studio → Project → Gallery**.

In `PLATFORM_MODE=single` (default) the hierarchy collapses — there is one studio and requests always resolve to it. This is fully backwards-compatible with earlier single-tenant deployments.

In `PLATFORM_MODE=multi`:
- Each request is resolved to a studio via the `Host` header
- Studio domains are stored in a `studio_domains` table
- Subdomains of `BASE_DOMAIN` are automatically routed by slug
- A `superadmin` can switch studio context with an `studio_override` cookie

**Authorization** uses a hierarchical `can(user, action, resource)` function that checks permissions in order: platform role → studio role → project role → gallery role → viewer token → public access.

---

## Static gallery delivery

Built galleries are pure static files written to `dist/<project>/<gallery>/`. Caddy serves this directory directly — no API call is made when a visitor loads a gallery. This means:
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
- **Magic links** — one-time login links sent by email (passwordless flow)
- **Password reset tokens** — one-time, expire after 1 hour
