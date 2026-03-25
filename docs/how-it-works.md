# How GalleryPack works

## Core concept

GalleryPack separates **content management** from **delivery**. Admins and photographers work in the admin panel; visitors see pure static files. No database or server is hit when someone views a gallery.

```
Upload → Manage → Build → Static files → Visitors
```

---

## Data hierarchy

```
Platform  (the GalleryPack installation)
  └── Studio  (a photography business, team, or brand)
        └── Project  (a shoot, event, or series)
              └── Gallery  (deliverable — photos + settings + build output)
```

- In `PLATFORM_MODE=single` there is exactly one studio. The hierarchy simplifies to Project → Gallery.
- In `PLATFORM_MODE=multi` a superadmin manages multiple studios, each isolated from the others.

---

## Galleries

A gallery has:
- **Slug** — used in the public URL: `yourdomain.com/project-slug/gallery-slug/`
- **Access mode** — `public`, `private`, or `password`
- **Photos** — uploaded by studio members or invited photographers
- **Build output** — a folder in `dist/` containing HTML, CSS, and resized images

### Access modes

| Mode | Who can view |
|---|---|
| `public` | Anyone |
| `private` | Only authenticated users with studio/project/gallery access, or a viewer token |
| `password` | Anyone with the password |

Private galleries are built to a hash-based path (e.g. `dist/a3f9c2.../`) so the URL is not guessable.

---

## Build pipeline

1. An admin clicks **Build** in the gallery admin
2. The API creates a `build_job` row in the database (status: `queued`)
3. The worker polls the database, picks up the job, and calls the engine
4. The engine:
   - Reads source photos from `src/<studio>/<gallery>/`
   - Resizes and optimizes images
   - Generates an HTML/CSS/JS gallery
   - Writes output to `dist/<project>/<gallery>/`
5. The worker updates the job status to `done` (or `error`)
6. The browser receives real-time log lines via SSE and shows a progress bar

Caddy serves the `dist/` directory directly as static files.

---

## Invitations

Photographers are invited by email. The invite link:
1. Creates a pending `invitation` row with a signed token
2. The photographer clicks the link, sets a password, and is added to the studio/gallery
3. They can immediately upload photos to their assigned gallery

---

## Multi-studio routing (PLATFORM_MODE=multi)

Each request carries a `Host` header. The `studioContext` middleware resolves the studio in this order:

1. `studio_override` cookie — set when a superadmin switches context
2. Exact match in `studio_domains` table
3. Subdomain of `BASE_DOMAIN` → studio slug (e.g. `circus.gallerypack.app`)
4. `BASE_DOMAIN` itself → platform root (no studio)

In single mode, every request resolves to the one default studio.

---

## Storage

Photos and build artifacts are stored either:
- **Locally** (`STORAGE_DRIVER=local`) — in the `storage/` volume on disk
- **S3-compatible** (`STORAGE_DRIVER=s3`) — in a bucket with `src/` and `dist/` prefixes

The engine and worker both use the same storage abstraction so they work identically in both modes.
