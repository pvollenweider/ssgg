# Storage & Security Model

## Three-tier storage layout

GalleryPack separates all stored data into three access tiers under `STORAGE_ROOT` (default: `/srv/gallerypack` in containers, `./data/` on the host in dev):

```
STORAGE_ROOT/
  public/     ← generated galleries (HTML, CSS, JS, optimised images)
  internal/   ← admin thumbnails, previews, inbox photos
  private/    ← original uploads, high-resolution source files
```

---

## Public tier

**Path:** `/srv/gallerypack/public/`

**Contents:**
- Built gallery sites (`<project-slug>/<gallery-slug>/index.html`, CSS, JS, WebP images)
- Shared vendor libraries (`vendor/`)
- Shared fonts (`fonts/`)

**Access:** Served directly by Caddy via `file_server`. No authentication required.

**Security:** Only Caddy reads this directory. The API and worker write here during gallery builds.

---

## Internal tier

**Path:** `/srv/gallerypack/internal/`

**Contents:**
- Admin thumbnails (`thumbnails/sm/<id>.webp`, `thumbnails/md/<id>.webp`)
- Photo previews (resized on-demand, served via `/api/galleries/:id/photos/:filename/preview`)
- Inbox photos pending moderation

**Access:** Only the API backend serves files from this tier. Caddy does **not** have a mount or route for `/internal/`.

**Security:** Callers must be authenticated (admin session or valid API token) to access any internal asset.

---

## Private tier

**Path:** `/srv/gallerypack/private/`

**Contents:**
- Original photo uploads (`<gallery-slug>/photos/<filename>`)
- Gallery configuration (`<gallery-slug>/gallery.config.json`)
- Photo ordering and attribution metadata

**Access:** Only the API and worker read/write this tier. Never exposed publicly.

If original download is enabled for a gallery, originals are served exclusively through:
```
GET /api/galleries/:id/download-original/:photoId
```
This endpoint verifies the caller's access rights before streaming the file.

---

## How Caddy enforces the boundary

The `Caddyfile` mounts **only** `public/` for built gallery delivery. Thumbnails under `internal/` are served directly by Caddy from a separate, narrowly scoped path with no directory listing:

```caddy
handle /media/thumbnails/* {
    uri strip_prefix /media
    root * /srv/gallerypack/internal
    file_server { precompressed br gzip }
}

handle /* {
    root * /srv/gallerypack/public
    try_files {path} {path}/index.html
    file_server { precompressed br gzip }
    ...
}
```

Only the `/media/thumbnails/` path is exposed from `internal/`. All other `internal/` paths and all `private/` paths are inaccessible — Caddy routes them to the API which enforces authentication before responding.

In Docker Compose (`docker-compose.saas.yml`), the Caddy container only mounts `./data/public` read-only. The `./data/internal` and `./data/private` volumes are mounted into the `api` and `worker` containers only.

In K3s, the proxy pod only mounts the `gallerypack-public` PVC. The `gallerypack-internal` and `gallerypack-private` PVCs are mounted into the `api` and `worker` pods only.

---

## Data that is never exposed publicly

| Data | Location | Exposure |
|------|----------|----------|
| Original uploads | `private/<gallery>/photos/` | Backend only |
| Gallery config | `private/<gallery>/gallery.config.json` | Backend only |
| Admin thumbnails | `internal/thumbnails/` | Authenticated API |
| Inbox photos | `internal/inbox/` | Authenticated API |
| Database | MariaDB container/PVC | No external port |
| Session secrets | Environment variable | Never on disk |
| Viewer tokens | Environment variable | Never on disk |
