# AI Photo Description / Alt-Text Generation

**Date:** 2026-05-15
**Status:** Approved

## Summary

On-demand AI-generated descriptions for photos, stored per-photo in the DB, surfaced as `img` alt text and visible captions in built static galleries. Uses Claude Vision (Anthropic). Descriptions are editable by admins.

---

## Database

**Migration:** `apps/api/src/db/migrations/mariadb/006_photos_ai_description.sql`

```sql
ALTER TABLE photos ADD COLUMN ai_description TEXT NULL DEFAULT NULL;
```

**API key:** `ANTHROPIC_API_KEY` environment variable. Not stored in DB. Matches existing credential pattern (SMTP).

---

## API

### Generate — `POST /api/photos/:id/ai-description`

- Permission: org-level admin (existing RBAC pattern)
- Loads photo record from DB
- Resolves locale: gallery locale → org `default_locale` → `'en'`
- Reads photo file from storage (local or S3), encodes as base64
- Calls Claude Vision with prompt:
  > "Describe this photo in {locale}. Write 1-2 sentences suitable as an image caption and alt text. Be specific and descriptive."
- Saves result to `photos.ai_description`
- Returns `{ description: "..." }`
- Returns `402` if `ANTHROPIC_API_KEY` is not set

### Edit — `PATCH /api/photos/:id` (extend existing)

- Add `ai_description` to allowed update fields
- Plain text, no server-side length limit

### Service

`apps/api/src/services/aiDescription.js` — wraps Anthropic SDK call. Takes `{ photoBuffer, locale }`, returns description string. Isolated from route logic for testability.

---

## Builder

**File:** `workers/builder/src/runner.js`

- Extend photo SELECT to include `ph.ai_description`
- Write `photo_descriptions.json` to gallery source dir alongside `photo_attribution.json`:
  ```json
  { "filename.webp": "A couple walks hand-in-hand..." }
  ```
- Only non-null descriptions included
- File omitted entirely if no photos have descriptions

---

## Engine

**File:** `packages/engine/src/html.js`

- Read `photo_descriptions.json` at build time (optional — no error if missing)
- Extend `photosJson` map (line ~501):
  ```js
  desc: p.description || null
  ```
- In `makeTile()` (line ~1422):
  ```js
  img.alt = photo.desc || photo.name;
  ```
- In lightbox overlay: show `photo.desc` as a caption line below the image when present (same region as EXIF panel, visually distinct line)

---

## Admin UI

**Location:** photo editor in `apps/web/`

- **Textarea** — labeled "Description / Alt text", bound to `ai_description`
- **"Generate with AI" button** — calls `POST /api/photos/:id/ai-description`, fills textarea on success, shows spinner during request
- **"Regenerate" button** — shown when description already exists; same endpoint, overwrites
- Button disabled with tooltip "Set ANTHROPIC_API_KEY to enable" when API returns 402
- On save: textarea value sent via `PATCH /api/photos/:id`
- Scope: per-photo only (no batch UI)

---

## Error Handling

| Scenario | Behavior |
|---|---|
| `ANTHROPIC_API_KEY` not set | 402, button disabled in UI |
| Claude API error / timeout | 502, toast in UI, description unchanged |
| Photo file not found in storage | 404 |
| Description cleared by user | `PATCH` with `ai_description: null` or `""` |

---

## Out of Scope

- Batch generation across a gallery
- Provider selection (Claude only)
- Per-photo language override (locale comes from gallery/org)
- Description length enforcement
