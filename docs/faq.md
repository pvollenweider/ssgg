# FAQ

## General

**Does it require a server to view galleries?**
No. Built galleries are pure static files (HTML + images). Caddy serves them directly without hitting the database or the API. You could copy the `dist/<gallery>/` folder to any static host.

**What image formats are supported for upload?**
JPEG, PNG, HEIC, and WebP. The engine converts everything to optimized JPEG for output.

**How long does a build take?**
Roughly 1–3 seconds per photo. A 50-photo gallery typically builds in under a minute. The build progress bar in the admin gives real-time feedback via SSE.

**Can I use my own domain for a gallery?**
Yes. In `PLATFORM_MODE=multi`, add your domain to the studio's domain list. Caddy handles TLS automatically.

**Is internet access required during build?**
Vendors and fonts are downloaded on first build and cached locally. Subsequent builds are fully offline.

---

## Access control

**What's the difference between `private` and `password`?**
- `private` — only logged-in users with the right studio/project/gallery role, or users with a viewer token link.
- `password` — anyone with the password can view it, no account required.

**How do photographer invitations work?**
An admin creates an invite for the photographer's email address. The invite link creates their account, adds them to the gallery, and lets them upload photos immediately — no further admin action required.

**Can a client view a private gallery without creating an account?**
Yes — use a **viewer token**. Create one from the gallery's Access tab and share the link. It grants read-only access to that gallery (or all galleries in a project) without requiring login.

**Can I revoke access after sharing a viewer token?**
Yes. Each viewer token can be revoked individually from the Access tab at any time.

---

## Multi-studio

**What is `PLATFORM_MODE=single` vs `multi`?**
- `single` — one studio, one domain. Simpler setup, fully backwards-compatible.
- `multi` — multiple studios, each with its own domain or subdomain, managed by a superadmin.

**How does studio routing work in multi mode?**
Each request's `Host` header is matched against: the `studio_override` cookie (superadmin context switch) → custom domain entries in the database → `<slug>.BASE_DOMAIN` subdomains → the platform root.

**Can a user belong to multiple studios?**
Yes. A user account can be a member of multiple studios with different roles in each.

---

## Storage

**Where are photos stored?**
In `local` mode: source photos under `storage/src/<galleryId>/`, built output under `storage/dist/<project>/<gallery>/`. In `s3` mode: same structure inside the configured bucket.

**Can I switch from local storage to S3 later?**
Yes — copy the files to the bucket and set `STORAGE_DRIVER=s3`. Galleries need to be rebuilt after the switch so the worker reads from the new location.

---

## Technical

**What database does it use?**
MariaDB (or MySQL 8+). Migrations run automatically on startup and are tracked in a `_migrations` table.

**Can I run without Docker?**
Yes. Run MariaDB separately, set the `DB_*` environment variables, and start `node apps/api/src/index.js` and `node workers/builder/src/index.js` directly.

**How does the worker know when to build?**
The API inserts a row into `build_jobs` when a build is triggered. The worker polls this table, picks up queued jobs, and processes them sequentially. Build log lines are written to `build_events` and streamed to the browser via SSE.
