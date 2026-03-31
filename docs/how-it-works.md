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
  └── Organization  (a photography business, team, or brand; also called "studio" internally)
        └── Project  (a shoot, event, or series)
              └── Gallery  (deliverable — photos + settings + build output)
```

- In `PLATFORM_MODE=single` there is exactly one organization. The hierarchy simplifies to Project → Gallery.
- In `PLATFORM_MODE=multi` a superadmin manages multiple organizations, each isolated from the others.

The terms "studio" and "organization" refer to the same entity. "Organization" is used in the admin UI; "studio" appears in internal API routes and the database for historical reasons.

---

## Galleries

A gallery has:
- **Slug** — used in the public URL: `yourdomain.com/project-slug/gallery-slug/`
- **Description** — optional free-text description displayed in the admin
- **Access mode** — `public`, `private`, or `password`
- **Photos** — uploaded by organization members or invited photographers
- **Build output** — a folder in `public/<project-slug>/<gallery-slug>/` containing HTML, CSS, JS, and WebP images

### Access modes

| Mode | Who can view |
|---|---|
| `public` | Anyone |
| `private` | Only authenticated users with studio/project/gallery access, or a viewer token |
| `password` | Anyone with the password |

Private galleries use a hash-based `distName` derived from the gallery ID so the public URL is not guessable.

---

## Build pipeline

1. An admin clicks **Build** in the gallery admin
2. The API creates a `build_job` row in the database (status: `queued`)
3. The worker polls the database, picks up the job, and calls the engine
4. The engine:
   - Reads source photos from `private/<gallery-slug>/photos/`
   - Resizes and optimizes images (outputs WebP)
   - Generates an HTML/CSS/JS gallery
   - Writes output to `public/<project-slug>/<gallery-slug>/`
5. The worker updates the job status to `done` (or `error`)
6. The browser receives real-time log lines via SSE and shows a progress bar

A build can be **cancelled** at any point while it is `queued` or `running` via the stop button in the build log page or the gallery jobs list. The API sets the job status to `cancelled`; the worker detects this before writing the final `done` status and aborts cleanly.

### Watermark

When the gallery's watermark setting is enabled, the engine composites a text overlay onto every full-size image using Sharp's SVG compositing. The watermark renders bottom-right, using the DIN Tape font bundled in `packages/engine/assets/din-tape.ttf`. Font size is 1.5 % of the image height. The Docker worker image registers the font via `fc-cache` so that librsvg (Sharp's SVG renderer) can resolve it by family name.

Caddy serves the `dist/` directory directly as static files.

### Gallery ordering

Within a project, galleries are displayed in the order defined by the admin via drag-and-drop in the project galleries page. This order is stored as `sort_order` on the `galleries` table and respected on both the static prerendered page and the dynamic fallback route.

---

## Invitations

Photographers and collaborators are invited by email. An optional `name` field pre-fills the invitee's display name. The invite link is also copyable so it can be shared via other channels if SMTP is not configured. Flow:

1. Admin creates an invitation (email, optional name, role, optional gallery assignment)
2. An invitation row with a signed token is created; an email is sent if SMTP is configured
3. The invitee clicks the link, sets a password, and is added to the organization (and gallery if specified)
4. They can immediately upload photos or manage their assigned content

---

## Multi-organization routing (PLATFORM_MODE=multi)

Each request carries a `Host` header. The `resolveStudioContext` middleware resolves the organization in this order:

1. `studio_override` cookie — set when a superadmin switches context
2. Exact match in `studio_domains` table
3. Subdomain of `BASE_DOMAIN` → organization slug (e.g. `circus.gallerypack.app`)
4. `BASE_DOMAIN` itself → platform root (no organization)

In single mode, every request resolves to the one default organization.

---

## Storage

Photos and build artifacts are stored either:
- **Locally** (`STORAGE_DRIVER=local`) — in the `storage/` volume on disk
- **S3-compatible** (`STORAGE_DRIVER=s3`) — in a bucket with `src/` and `dist/` prefixes

The engine and worker both use the same storage abstraction so they work identically in both modes.

---

## Two distinct upload flows (Sprint 12)

There are two clearly separate operations. They share no code paths.

### Flow A — Admin creates a gallery and uploads their own photos

**Actor:** authenticated studio member (collaborator, admin, or owner)

1. Admin creates gallery via `POST /api/galleries` — sets title, metadata
2. Admin uploads photos via `POST /api/galleries/:id/photos` (multipart)
3. Photos are inserted into the `photos` table with `status = 'validated'`
4. Admin triggers a build — all validated photos are published

### Flow B — Photographer contributes photos via upload link

**Actor:** anyone with a valid upload link token (no account required)

1. Admin creates an upload link via `POST /api/galleries/:id/upload-links`
2. Admin shares the link URL (e.g. `https://your-domain/upload/<token>`)
3. Photographer opens the link in a browser — no login needed
4. Photographer uploads photos via `POST /upload/:token/photos` (multipart)
5. Photos are inserted with `status = 'uploaded'` — they are **not** immediately visible
6. Studio editors are notified by email
7. Admin reviews photos in the **Inbox** tab, accepts or rejects them
8. Accepted photos get `status = 'validated'` and become eligible for the next build

### Key rules

- `POST /api/galleries` requires authentication — photographers cannot create galleries
- `POST /upload/:token/photos` has **no side effects** beyond inserting photo rows and updating `gallery.updated_at`
- Upload link tokens are single-purpose — they cannot modify gallery metadata or trigger builds
- Revoked or expired tokens return 401 immediately
