# Storage Abstraction Audit

> Phase 1 of issue #58 — all direct `fs.*` calls catalogued and classified.
> Classification: **migrate** | **tolerated** | **forbidden for new code**

---

## Summary

The storage abstraction (`packages/shared/src/storage/`) exists and is used by the worker for build artifacts.
The API routes still bypass it and read/write directly to `src/<slug>/` and `dist/<slug>/`.

---

## apps/api/src/routes/galleries.js

| Line | Operation | Classification | Notes |
|------|-----------|----------------|-------|
| 17–18 | `fs.existsSync` + `fs.readdirSync` on `src/<slug>/photos/` | Tolerated | `getPhotos()` helper — reads source photos for API listing |
| 27–30 | `fs.readdirSync` + `fs.statSync` for `needsRebuild()` | Tolerated | Checks mtime of photos vs `built_at` in DB |
| 37–38 | `fs.readdirSync` for `countPhotos()` | Tolerated | Could be replaced with DB counter |
| 46–49 | `fs.readdirSync` + `fs.statSync` for `dirSize()` | Tolerated | Size estimate — low risk |
| 60 | `fs.readFileSync(dist/<slug>/photos.json)` | **Migrate** | Should go through storage adapter — blocked when switching to S3 |
| 266–267 | `fs.renameSync(src/<old_slug>/, src/<new_slug>/)` | **High risk** | Slug rename moves physical directory. See issue #60. |

## apps/api/src/routes/photos.js

| Line | Operation | Classification | Notes |
|------|-----------|----------------|-------|
| 47 | `fs.mkdirSync(src/<slug>/photos/)` | Tolerated | Creates upload directory on first photo |
| 78, 198 | `fs.existsSync` file check before download/delete | Tolerated | |
| 105–115 | `fs.readdirSync` + optional `order.json` read | Tolerated | Photo listing — could be DB-backed |
| 129 | `fs.statSync` for file size/mtime | Tolerated | |
| 157, 170 | `fs.unlinkSync` on multer temp files | Legitimate | Cleanup of upload temp files |
| 200 | `fs.unlinkSync` on photo file | Tolerated | Photo deletion — must also clean dist/ |
| 221–223 | `fs.mkdirSync` + `fs.writeFileSync` for `order.json` | **Migrate** | Photo order should be in DB, not a sidecar file |

## apps/api/src/routes/public.js

| Line | Operation | Classification | Notes |
|------|-----------|----------------|-------|
| 12, 60 | `fs.readFileSync(dist/<slug>/photos.json)` | **Migrate** | Public gallery manifest — should go through storage adapter |
| 23–24 | `fs.readdirSync` for photo count | Tolerated | Used for gallery card preview count |

## apps/api/src/index.js

| Line | Operation | Classification | Notes |
|------|-----------|----------------|-------|
| 107 | `fs.existsSync(indexHtml)` | Legitimate | SPA fallback — serving the React app |

## apps/api/src/db/

| File | Operation | Classification | Notes |
|------|-----------|----------------|-------|
| `database.js` | `fs.mkdirSync(DATA_DIR)` | Legitimate | Creates SQLite data directory |
| `migrations/run.js` | `fs.readdirSync` + `fs.readFileSync` | Legitimate | Reads `.sql` migration files at startup |

## workers/builder/src/

| File | Line | Operation | Classification | Notes |
|------|------|-----------|----------------|-------|
| `index.js` | 53 | `fs.writeFileSync(ALIVE_FILE)` | Tolerated | Heartbeat file for watchdog |
| `runner.js` | 95–96 | `fs.readFileSync(build.config.json)` | **Investigate** | `build.config.json` — CLI artifact? Check if still needed |
| `runner.js` | 156 | `fs.rmSync(dir, { recursive: true })` | Tolerated | Post-build cleanup |

---

## Priority items to migrate

### P1 — Migrate `order.json` to DB

`photos.js` reads/writes a `src/<slug>/photos/order.json` sidecar file for photo ordering.
This should be a `photo_order` column in the `galleries` table (or a `gallery_photos` table).
Risk: sidecar file is lost on slug rename.

### P2 — Route manifest reads through storage adapter

Both `galleries.js` and `public.js` read `dist/<slug>/photos.json` directly via `fs.readFileSync`.
The storage adapter already has a `get()` method — use it.

### P3 — Investigate `build.config.json` in worker runner

`runner.js` reads `build.config.json` from ROOT. This was a CLI config file.
Verify whether this is still used or can be replaced by DB settings.

### P4 — Slug rename (`fs.renameSync`) — see issue #60

`galleries.js` renames `src/<old_slug>/` to `src/<new_slug>/` on slug change.
When storage is abstracted (keys based on gallery.id, not slug), this goes away.

---

## What `packages/shared/src/storage/` already handles

- `put(key, buffer)` — write a file
- `get(key)` — read a file
- `delete(key)` — delete a file
- `list(prefix)` — list files under a prefix
- Adapters: `local` (direct fs) and `s3`

The worker already uses this for build artifact writes.
The API routes bypass it entirely — that's the gap to close in Phase 2.

---

## Forbidden for new code

Any new route or helper that reads/writes gallery files must use the storage adapter, not `fs` directly.
Grep check: `grep -r "fs\." apps/api/src/routes/` should produce no new entries.
