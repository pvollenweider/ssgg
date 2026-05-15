# AI Photo Description / Alt-Text Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add on-demand Claude Vision AI description generation per photo, stored in DB, surfaced as `img` alt text and lightbox caption in built galleries.

**Architecture:** Synchronous API endpoint calls Anthropic Claude Vision, saves `ai_description` to the `photos` table. The builder runner writes `photo_descriptions.json` alongside `photo_attribution.json`; the engine reads it and passes descriptions through to the gallery HTML. Admin UI adds a textarea + generate button per photo via a click-to-expand detail panel.

**Tech Stack:** `@anthropic-ai/sdk`, Node.js `node:test` for unit tests, React (existing), MariaDB migration pattern.

**Spec:** `docs/superpowers/specs/2026-05-15-ai-photo-description-design.md`

---

## File Map

| Action | File |
|--------|------|
| Create | `apps/api/src/db/migrations/mariadb/006_photos_ai_description.sql` |
| Create | `apps/api/src/services/aiDescription.js` |
| Create | `apps/api/src/services/aiDescription.test.js` |
| Modify | `apps/api/package.json` — add `@anthropic-ai/sdk` |
| Modify | `apps/api/src/routes/photos.js` — generate endpoint, extend PATCH, expose `ai_description` in list |
| Modify | `packages/engine/src/images.js` — read `photo_descriptions.json`, pass `description` field |
| Modify | `packages/engine/src/html.js` — use `desc` in photosJson, img.alt, add `#gl-caption` overlay |
| Modify | `workers/builder/src/runner.js` — extend photo SELECT, write `photo_descriptions.json` |
| Modify | `apps/web/src/lib/api.js` — add `generatePhotoDescription`, `updatePhotoDescription` |
| Modify | `apps/web/src/pages/GalleryDetail.jsx` — photo detail panel with textarea + generate button |

---

## Task 1: DB Migration

**Files:**
- Create: `apps/api/src/db/migrations/mariadb/006_photos_ai_description.sql`

- [ ] **Step 1: Create migration file**

```sql
-- 006_photos_ai_description.sql
ALTER TABLE photos ADD COLUMN ai_description TEXT NULL DEFAULT NULL;
```

- [ ] **Step 2: Run migration**

```bash
cd apps/api && node src/db/migrations/run.js
```

Expected output: migration applied without error.

- [ ] **Step 3: Verify column exists**

```bash
# In MariaDB shell or via mysql client:
# DESCRIBE photos;
# Should show ai_description TEXT NULL
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/db/migrations/mariadb/006_photos_ai_description.sql
git commit -m "feat(db): add ai_description column to photos table"
```

---

## Task 2: Install SDK + AI Description Service

**Files:**
- Modify: `apps/api/package.json`
- Create: `apps/api/src/services/aiDescription.js`
- Create: `apps/api/src/services/aiDescription.test.js`

- [ ] **Step 1: Install Anthropic SDK**

```bash
cd apps/api && npm install @anthropic-ai/sdk
```

Expected: `@anthropic-ai/sdk` appears in `package.json` dependencies.

- [ ] **Step 2: Write failing unit test**

Create `apps/api/src/services/aiDescription.test.js`:

```js
// apps/api/src/services/aiDescription.test.js
import { test, describe, mock } from 'node:test';
import assert from 'node:assert/strict';

describe('generateDescription', () => {
  test('returns description string from Claude response', async () => {
    // Stub the Anthropic client before importing the service
    const fakeContent = [{ type: 'text', text: 'A golden sunset over mountains.' }];
    const fakeCreate  = mock.fn(async () => ({ content: fakeContent }));

    mock.module('@anthropic-ai/sdk', {
      namedExports: {
        default: class Anthropic {
          constructor() { this.messages = { create: fakeCreate }; }
        },
      },
    });

    const { generateDescription } = await import('./aiDescription.js');
    const buf = Buffer.from('fake-image-data');
    const result = await generateDescription(buf, 'image/jpeg', 'en');
    assert.equal(result, 'A golden sunset over mountains.');
    assert.equal(fakeCreate.mock.calls.length, 1);
  });

  test('throws when ANTHROPIC_API_KEY is not set', async () => {
    const savedKey = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    try {
      const { generateDescription } = await import('./aiDescription.js');
      await assert.rejects(
        () => generateDescription(Buffer.from('x'), 'image/jpeg', 'en'),
        /ANTHROPIC_API_KEY/
      );
    } finally {
      if (savedKey !== undefined) process.env.ANTHROPIC_API_KEY = savedKey;
    }
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd apps/api && node --test src/services/aiDescription.test.js
```

Expected: FAIL — `aiDescription.js` does not exist yet.

- [ ] **Step 4: Create the service**

Create `apps/api/src/services/aiDescription.js`:

```js
// Copyright (c) 2026 Philippe Vollenweider
//
// This file is part of the GalleryPack commercial platform.
// This source code is proprietary and confidential.
// Use, reproduction, or distribution requires a valid commercial license.
// Unauthorized use is strictly prohibited.

// apps/api/src/services/aiDescription.js — Claude Vision AI photo description

import Anthropic from '@anthropic-ai/sdk';

const LOCALE_TO_LANG = {
  'fr': 'French', 'fr-FR': 'French', 'fr-CH': 'French', 'fr-BE': 'French',
  'en': 'English', 'en-US': 'English', 'en-GB': 'English',
  'de': 'German', 'de-DE': 'German', 'de-CH': 'German', 'de-AT': 'German',
  'it': 'Italian', 'it-IT': 'Italian', 'it-CH': 'Italian',
  'es': 'Spanish', 'es-ES': 'Spanish',
  'pt': 'Portuguese', 'pt-PT': 'Portuguese', 'pt-BR': 'Portuguese',
  'nl': 'Dutch', 'nl-NL': 'Dutch', 'nl-BE': 'Dutch',
  'pl': 'Polish', 'pl-PL': 'Polish',
  'ru': 'Russian', 'ru-RU': 'Russian',
  'ja': 'Japanese', 'ja-JP': 'Japanese',
  'zh': 'Chinese', 'zh-CN': 'Chinese', 'zh-TW': 'Chinese',
  'ko': 'Korean', 'ko-KR': 'Korean',
  'ar': 'Arabic', 'ar-SA': 'Arabic',
  'sv': 'Swedish', 'sv-SE': 'Swedish',
  'da': 'Danish', 'da-DK': 'Danish',
  'fi': 'Finnish', 'fi-FI': 'Finnish',
  'no': 'Norwegian', 'nb': 'Norwegian',
};

/**
 * Generate a photo description using Claude Vision.
 *
 * @param {Buffer} imageBuffer - Raw image bytes
 * @param {string} mediaType   - MIME type, e.g. 'image/jpeg'
 * @param {string} locale      - BCP-47 locale string, e.g. 'fr' or 'en-US'
 * @returns {Promise<string>}  - Description text
 */
export async function generateDescription(imageBuffer, mediaType, locale) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not set');
  }

  const lang   = LOCALE_TO_LANG[locale] || LOCALE_TO_LANG[locale?.split('-')[0]] || 'English';
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 256,
    messages: [{
      role:    'user',
      content: [
        {
          type:   'image',
          source: {
            type:       'base64',
            media_type: mediaType,
            data:       imageBuffer.toString('base64'),
          },
        },
        {
          type: 'text',
          text: `Describe this photo in ${lang}. Write 1-2 sentences suitable as an image caption and alt text. Be specific and descriptive. Return only the description, no preamble.`,
        },
      ],
    }],
  });

  const block = response.content.find(b => b.type === 'text');
  return block?.text?.trim() ?? '';
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd apps/api && node --test src/services/aiDescription.test.js
```

Expected: both tests PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/package.json apps/api/package-lock.json \
        apps/api/src/services/aiDescription.js \
        apps/api/src/services/aiDescription.test.js
git commit -m "feat(ai): add Claude Vision aiDescription service with tests"
```

---

## Task 3: API Endpoints

**Files:**
- Modify: `apps/api/src/routes/photos.js`

- [ ] **Step 1: Add `aiDescription` import at top of photos.js**

In `apps/api/src/routes/photos.js`, add after the existing service imports (around line 30):

```js
import { generateDescription } from '../services/aiDescription.js';
```

- [ ] **Step 2: Include `ai_description` in listPhotos response**

In the `router.get('/:id/photos', ...)` handler, find the `return res.json(dbPhotos.map(p => ({` block (~line 165) and add `ai_description` to the mapped object:

```js
return res.json(dbPhotos.map(p => ({
  file:              p.filename,
  original_name:     p.original_name || null,
  exif:              p.exif ? (typeof p.exif === 'string' ? JSON.parse(p.exif) : p.exif) : null,
  size:              p.size_bytes,
  mtime:             p.created_at,
  status:            p.status,
  id:                p.id,
  sort_order:        p.sort_order,
  upload_link_label: p.upload_link_label || null,
  thumb:             nameMap[p.filename] || null,
  thumbnail:         photoThumbnails(p.id),
  photographer_id:   p.photographer_id || null,
  ai_description:    p.ai_description || null,
})));
```

- [ ] **Step 3: Add generate endpoint**

Add this new route to `apps/api/src/routes/photos.js`, just before `export default router;`:

```js
// POST /api/galleries/:id/photos/:photoId/ai-description — generate AI description via Claude Vision
router.post('/:id/photos/:photoId/ai-description', async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(402).json({ error: 'ANTHROPIC_API_KEY is not configured' });
  }

  const gallery = await ensureGalleryBelongsToOrg(req, res);
  if (!gallery) return;
  const galleryRole = await getGalleryRole(req.userId, gallery.id);
  if (!can(req.user, 'upload', 'photo', { studioRole: req.studioRole, galleryRole })) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const [photoRows] = await query(
    'SELECT id, filename FROM photos WHERE id = ? AND gallery_id = ?',
    [req.params.photoId, gallery.id]
  );
  const photo = photoRows[0];
  if (!photo) return res.status(404).json({ error: 'Photo not found' });

  // Resolve locale: gallery → org default → 'en'
  const locale = gallery.locale || 'en';

  // Read photo file from storage
  const photoKey = `private/${gallery.slug}/photos/${photo.filename}`;
  let imageBuffer;
  try {
    imageBuffer = await fileStorage.read(photoKey);
  } catch {
    return res.status(404).json({ error: 'Photo file not found in storage' });
  }

  // Determine media type from extension
  const ext = photo.filename.split('.').pop().toLowerCase();
  const MEDIA_TYPES = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    webp: 'image/webp', gif: 'image/gif', heic: 'image/heic', heif: 'image/heif',
  };
  const mediaType = MEDIA_TYPES[ext] ?? 'image/jpeg';

  let description;
  try {
    description = await generateDescription(imageBuffer, mediaType, locale);
  } catch (err) {
    return res.status(502).json({ error: 'AI generation failed', detail: err.message });
  }

  await query(
    'UPDATE photos SET ai_description = ? WHERE id = ?',
    [description, photo.id]
  );

  res.json({ description });
});
```

- [ ] **Step 4: Extend PATCH endpoint to accept `ai_description`**

Find the existing `router.patch('/:id/photos/:photoId', ...)` handler (~line 709). Replace it with:

```js
// PATCH /api/galleries/:id/photos/:photoId — update photo fields (photographer_id, ai_description)
router.patch('/:id/photos/:photoId', async (req, res) => {
  const gallery = await ensureGalleryBelongsToOrg(req, res);
  if (!gallery) return;
  const galleryRole = await getGalleryRole(req.userId, gallery.id);
  if (!can(req.user, 'upload', 'photo', { studioRole: req.studioRole, galleryRole })) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { photographerId, ai_description } = req.body || {};

  if (photographerId !== undefined && photographerId !== null) {
    const [urows] = await query('SELECT id FROM users WHERE id = ?', [photographerId]);
    if (!urows[0]) return res.status(400).json({ error: 'User not found' });
  }

  if (photographerId !== undefined) {
    await setPhotoPhotographer(req.params.photoId, photographerId ?? null);
  }

  if (ai_description !== undefined) {
    const val = ai_description === null || ai_description === '' ? null : String(ai_description).trim();
    await query('UPDATE photos SET ai_description = ? WHERE id = ?', [val, req.params.photoId]);
  }

  res.json({ ok: true });
});
```

- [ ] **Step 5: Manual smoke test**

Start the API locally, then:
1. `GET /api/galleries/:id/photos` — confirm `ai_description` appears in response (null initially)
2. `POST /api/galleries/:id/photos/:photoId/ai-description` with `ANTHROPIC_API_KEY` unset — confirm 402
3. `PATCH /api/galleries/:id/photos/:photoId` with `{ "ai_description": "Test caption" }` — confirm 200 + DB updated

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/routes/photos.js
git commit -m "feat(api): add AI description generate endpoint and extend photo PATCH"
```

---

## Task 4: Engine — Read photo_descriptions.json

**Files:**
- Modify: `packages/engine/src/images.js`

- [ ] **Step 1: Add description loading in `listPhotos()`**

In `packages/engine/src/images.js`, in the `listPhotos` function, after the `photo_attribution.json` block (~line 77), add:

```js
// Load AI descriptions (photo_descriptions.json) — maps filename → description text
const descFile = path.join(galDir, 'photo_descriptions.json');
let descriptions = {};
if (fs.existsSync(descFile)) {
  try { descriptions = JSON.parse(fs.readFileSync(descFile, 'utf8')); } catch {}
}
```

Then in the `return ordered.map(f => ({...}))` block (~line 94), add `description`:

```js
return ordered.map(f => ({
  file:        f,
  full:        path.join(srcDir, f),
  credit:      attribution[f] ?? null,
  description: descriptions[f] ?? null,
}));
```

- [ ] **Step 2: Pass `description` through `processPhotos()`**

In `packages/engine/src/images.js`, in the `processPhotos` function (~line 323), update the `manifest.photos[photo.file]` assignment and `results.push(...)` to include `description`:

```js
manifest.photos[photo.file] = {
  name:        dims.name,
  dlName:      dims.dlName,
  index:       i + 1,
  role:        BIG_POSITIONS.has(i % 12) ? 'big' : 'small',
  isDark:      dims.isDark,
  exif:        exifFull,
  credit:      photo.credit ?? null,
  description: photo.description ?? null,
};
results.push({ ...dims, exif: exifFull, credit: photo.credit ?? null, description: photo.description ?? null });
```

- [ ] **Step 3: Verify engine still builds without descriptions**

Run a gallery build (or engine unit test if one exists). A gallery with no `photo_descriptions.json` should build identically to before.

```bash
# In the repo root or workers/builder:
# Trigger a test build and confirm no errors
```

- [ ] **Step 4: Commit**

```bash
git add packages/engine/src/images.js
git commit -m "feat(engine): read photo_descriptions.json and pass description through processPhotos"
```

---

## Task 5: Engine — Alt Text + Lightbox Caption

**Files:**
- Modify: `packages/engine/src/html.js`

- [ ] **Step 1: Add `desc` to photosJson map**

In `packages/engine/src/html.js`, find the `const photosJson = JSON.stringify(...)` line (~line 501). Replace it with:

```js
const photosJson  = JSON.stringify(photos.map((p, i) => ({ name: p.name, dlName: p.dlName || p.name, role: BIG_POSITIONS.has(i % 12) ? 'big' : 'small', isDark: p.isDark, exif: p.exif, credit: p.credit || null, desc: p.description || null })));
```

- [ ] **Step 2: Use description as img alt text**

In `packages/engine/src/html.js`, in the `makeTile()` function (~line 1422), change:

```js
img.alt     = photo.name;
```

to:

```js
img.alt     = photo.desc || photo.name;
```

- [ ] **Step 3: Add `#gl-caption` HTML element**

In `packages/engine/src/html.js`, find the `<!-- Title overlay (bottom-left) -->` comment and the `<div id="gl-title"></div>` line (~line 1236). Add the caption div immediately after it:

```html
<!-- Title overlay (bottom-left) -->
<div id="gl-title"></div>
<!-- AI caption overlay (above title, shown when photo has a description) -->
<div id="gl-caption"></div>
```

- [ ] **Step 4: Add CSS for `#gl-caption`**

In `packages/engine/src/html.js`, find the `#gl-title` CSS block (~line 986) and add `#gl-caption` after it:

```css
#gl-caption{
  position:fixed;z-index:1000001;
  bottom:108px;left:24px;
  font-family:'Poppins',sans-serif;
  font-size:11px;font-weight:300;letter-spacing:.04em;
  color:rgba(255,255,255,.70);
  background:rgba(0,0,0,.32);
  backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);
  border:1px solid rgba(255,255,255,.08);
  border-radius:4px;
  padding:3px 9px;
  opacity:0;
  transition:opacity .35s;
  pointer-events:none;
  max-width:calc(100vw - 140px);
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
  display:none
}
body.glightbox-open:hover #gl-caption{opacity:1}
body.glightbox-open.sw-playing #gl-caption{opacity:1}
body.sw-idle #gl-caption{opacity:0 !important;pointer-events:none !important}
```

- [ ] **Step 5: Add JS to update `#gl-caption` on slide change**

In `packages/engine/src/html.js`, after the `const glTitle = ...` line (~line 1364), add:

```js
const glCaption = document.getElementById('gl-caption');
function updateCaption(idx) {
  const desc = PHOTOS[idx]?.desc;
  if (desc) {
    glCaption.textContent = desc;
    glCaption.style.display = 'block';
  } else {
    glCaption.style.display = 'none';
  }
}
```

Then in the `lb.on('open', ...)` callback (~line 1769), add `updateCaption(idx);` after `updateTitleColor(idx);`:

```js
lb.on('open', () => {
  lbOpen = true;
  blurOverlays();
  buildThumbs();
  const idx = lb.getActiveSlideIndex();
  document.getElementById('gl-thumbs').style.display = 'block';
  if (CAN_DL_IMAGE && dlBtn) dlBtn.style.display = 'flex';
  infoBtn.style.display = 'flex';
  syncOverlays(idx);
  syncThumb(idx);
  updateTitleColor(idx);
  updateCaption(idx);
  history.replaceState(null, '', '#' + PHOTOS[idx].name);
});
```

And in `lb.on('slide_changed', ...)` (~line 1783), add `updateCaption(idx);` after `updateTitleColor(idx);`:

```js
lb.on('slide_changed', ({ current }) => {
  blurOverlays();
  const idx = current.index;
  syncOverlays(idx);
  syncThumb(idx);
  updateTitleColor(idx);
  updateCaption(idx);
  if (exifOpen) showExif(idx);
  if (swActive) swScheduleNext();
  history.replaceState(null, '', '#' + PHOTOS[idx].name);
});
```

- [ ] **Step 6: Build a test gallery and verify**

Trigger a full gallery build. In the output HTML:
- Photos with descriptions: `img.alt` = description text, caption appears in lightbox on hover
- Photos without descriptions: `img.alt` = filename (unchanged from before), no caption overlay

- [ ] **Step 7: Commit**

```bash
git add packages/engine/src/html.js
git commit -m "feat(engine): use AI description as img alt text and lightbox caption"
```

---

## Task 6: Builder — Write photo_descriptions.json

**Files:**
- Modify: `workers/builder/src/runner.js`

- [ ] **Step 1: Add `ai_description` to photo SELECT query**

In `workers/builder/src/runner.js`, find the `SELECT ph.filename, COALESCE(...) AS photographer_name` query (~line 154). Add `ph.ai_description` to it:

```js
const [validatedRows] = await query(
  `SELECT ph.filename,
          ph.ai_description,
          COALESCE(u.name,  pu.name)  AS photographer_name,
          COALESCE(u.email, pu.email) AS photographer_email
   FROM photos ph
   LEFT JOIN users u  ON u.id  = ph.photographer_id
   LEFT JOIN users pu ON pu.id = ?
   WHERE ph.gallery_id = ? AND ph.status IN ('validated', 'published')
   ORDER BY ph.sort_order ASC, ph.created_at ASC`,
  [gallery.primary_photographer_id ?? null, gallery.id]
);
```

- [ ] **Step 2: Write `photo_descriptions.json` after `photo_attribution.json`**

In the same block (~line 175, after the `attrFile` write), add:

```js
// photo_descriptions.json — filename → AI description text (omitted if none exist)
const descriptions = {};
for (const r of validatedRows) {
  if (r.ai_description) descriptions[r.filename] = r.ai_description;
}
if (Object.keys(descriptions).length > 0) {
  const descFile = path.join(galSrcDir, 'photo_descriptions.json');
  fs.writeFileSync(descFile, JSON.stringify(descriptions));
  await appendEvent(jobId, 'log', `AI descriptions: ${Object.keys(descriptions).length} photo(s) with descriptions`);
}
```

- [ ] **Step 3: Verify build still works for galleries without descriptions**

Trigger a build for a gallery with no `ai_description` values. Confirm no `photo_descriptions.json` is written and build succeeds normally.

- [ ] **Step 4: Trigger a build for a gallery with at least one description (after Task 3 API works)**

Set a description via the PATCH endpoint, trigger rebuild. Confirm:
- `photo_descriptions.json` written to `private/<slug>/` during build
- Built gallery HTML has correct `img.alt` and caption appears in lightbox

- [ ] **Step 5: Commit**

```bash
git add workers/builder/src/runner.js
git commit -m "feat(builder): write photo_descriptions.json for AI alt text generation"
```

---

## Task 7: Web UI — API Client + Photo Detail Panel

**Files:**
- Modify: `apps/web/src/lib/api.js`
- Modify: `apps/web/src/pages/GalleryDetail.jsx`

- [ ] **Step 1: Add API client methods**

In `apps/web/src/lib/api.js`, in the Photos section (~line 50), add two methods:

```js
generatePhotoDescription: (galleryId, photoId) =>
  req('POST', `/galleries/${galleryId}/photos/${photoId}/ai-description`),
updatePhotoDescription: (galleryId, photoId, description) =>
  req('PATCH', `/galleries/${galleryId}/photos/${photoId}`, { ai_description: description }),
```

- [ ] **Step 2: Add state variables for photo detail panel**

In `apps/web/src/pages/GalleryDetail.jsx`, add these state variables alongside the existing ones near the top of the component:

```js
const [selectedPhoto,   setSelectedPhoto]   = useState(null);   // photo object or null
const [descDraft,       setDescDraft]       = useState('');     // textarea value
const [descGenerating,  setDescGenerating]  = useState(false);  // spinner
const [descSaving,      setDescSaving]      = useState(false);  // save spinner
const [aiKeyMissing,    setAiKeyMissing]    = useState(false);  // 402 flag
```

- [ ] **Step 3: Add photo selection handler**

In `apps/web/src/pages/GalleryDetail.jsx`, add this function alongside the existing handlers:

```js
function openPhotoDetail(photo) {
  setSelectedPhoto(photo);
  setDescDraft(photo.ai_description || '');
  setAiKeyMissing(false);
}

function closePhotoDetail() {
  setSelectedPhoto(null);
  setDescDraft('');
}
```

- [ ] **Step 4: Add generate handler**

```js
async function handleGenerateDescription() {
  if (!selectedPhoto) return;
  setDescGenerating(true);
  try {
    const result = await api.generatePhotoDescription(id, selectedPhoto.id);
    setDescDraft(result.description);
    // Also update the photo in the photos array so re-opening shows fresh value
    setPhotos(ps => ps.map(p => p.id === selectedPhoto.id
      ? { ...p, ai_description: result.description }
      : p
    ));
    setSelectedPhoto(p => ({ ...p, ai_description: result.description }));
  } catch (err) {
    if (err?.status === 402) {
      setAiKeyMissing(true);
    } else {
      alert('AI generation failed. Please try again.');
    }
  } finally {
    setDescGenerating(false);
  }
}
```

- [ ] **Step 5: Add save handler**

```js
async function handleSaveDescription() {
  if (!selectedPhoto) return;
  setDescSaving(true);
  try {
    await api.updatePhotoDescription(id, selectedPhoto.id, descDraft.trim() || null);
    setPhotos(ps => ps.map(p => p.id === selectedPhoto.id
      ? { ...p, ai_description: descDraft.trim() || null }
      : p
    ));
    setSelectedPhoto(p => ({ ...p, ai_description: descDraft.trim() || null }));
  } catch {
    alert('Failed to save description.');
  } finally {
    setDescSaving(false);
  }
}
```

- [ ] **Step 6: Add click handler to photo cards**

In the photo grid section (~line 540), update each photo card `<div>` to add an `onClick` that calls `openPhotoDetail`. Change:

```jsx
<div
  key={p.file}
  style={{ ...s.photoCard, opacity: dragIdx === i ? 0.5 : 1, cursor:'grab' }}
  draggable
  onDragStart={() => onDragStart(i)}
  onDragOver={e => onDragOver(e, i)}
  onDragEnd={onDragEnd}
>
```

to:

```jsx
<div
  key={p.file}
  style={{ ...s.photoCard, opacity: dragIdx === i ? 0.5 : 1, cursor:'grab', position: 'relative' }}
  draggable
  onDragStart={() => onDragStart(i)}
  onDragOver={e => onDragOver(e, i)}
  onDragEnd={onDragEnd}
>
  {p.ai_description && (
    <span style={{
      position: 'absolute', top: 2, left: 2,
      background: 'rgba(0,120,212,0.75)',
      borderRadius: 3, width: 8, height: 8, display: 'block',
    }} title="Has AI description" />
  )}
```

Also add an edit icon button on the card (alongside the delete button), gated by `CAN_BUILD`:

```jsx
{CAN_BUILD && (
  <button
    style={{ ...s.deleteBtn, right: 26 }}
    title="Edit description"
    onClick={e => { e.stopPropagation(); openPhotoDetail(p); }}
  >
    <i className="fas fa-align-left" />
  </button>
)}
```

- [ ] **Step 7: Add photo detail panel JSX**

After the photo grid `</div>` closing tag (still inside `{tab === 'photos' && (`), add the detail panel:

```jsx
{selectedPhoto && CAN_BUILD && (
  <div className="card card-primary card-outline mb-4" style={{ marginTop: '1.5rem' }}>
    <div className="card-header">
      <h3 className="card-title">
        <i className="fas fa-align-left me-2" />
        Description — {selectedPhoto.file}
      </h3>
      <div className="card-tools">
        <button className="btn btn-tool" type="button" onClick={closePhotoDetail}>
          <i className="fas fa-times" />
        </button>
      </div>
    </div>
    <div className="card-body">
      <p style={{ fontSize: '0.8rem', color: '#666', margin: '0 0 0.5rem' }}>
        Used as <code>alt</code> text and lightbox caption in the built gallery.
      </p>
      <textarea
        style={{ width: '100%', minHeight: 80, resize: 'vertical', fontFamily: 'inherit', fontSize: '0.9rem', padding: '0.4rem', border: '1px solid #ccc', borderRadius: 4 }}
        value={descDraft}
        onChange={e => setDescDraft(e.target.value)}
        placeholder="No description yet. Click Generate to create one with AI."
      />
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', alignItems: 'center' }}>
        <button
          className="btn btn-sm btn-secondary"
          onClick={handleGenerateDescription}
          disabled={descGenerating || aiKeyMissing}
          title={aiKeyMissing ? 'Set ANTHROPIC_API_KEY to enable AI generation' : undefined}
        >
          {descGenerating
            ? <><i className="fas fa-spinner fa-spin me-1" />Generating…</>
            : selectedPhoto.ai_description
              ? <><i className="fas fa-redo me-1" />Regenerate</>
              : <><i className="fas fa-magic me-1" />Generate with AI</>
          }
        </button>
        {aiKeyMissing && (
          <span style={{ fontSize: '0.78rem', color: '#c00' }}>
            ANTHROPIC_API_KEY not configured on the server.
          </span>
        )}
        <button
          className="btn btn-sm btn-primary"
          style={{ marginLeft: 'auto' }}
          onClick={handleSaveDescription}
          disabled={descSaving}
        >
          {descSaving ? <><i className="fas fa-spinner fa-spin me-1" />Saving…</> : 'Save'}
        </button>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 8: Test the full flow manually**

1. Open a gallery in the admin UI
2. Click the edit icon on a photo card — detail panel opens with empty textarea
3. Click "Generate with AI" — spinner appears, description fills in after ~3–5s
4. Edit the description text
5. Click Save — photo list updates
6. Rebuild the gallery — confirm alt text and lightbox caption appear in built output
7. Click "Regenerate" — existing description overwritten with new AI description
8. Clear textarea, Save — description set to null; after rebuild, img.alt reverts to filename

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/lib/api.js apps/web/src/pages/GalleryDetail.jsx
git commit -m "feat(web): add photo description panel with AI generate and edit"
```

---

## Self-Review Checklist (completed)

- **Spec coverage:** DB ✓, generate endpoint ✓, edit endpoint ✓, locale ✓, builder JSON ✓, engine alt text ✓, engine caption ✓, admin UI ✓, 402 on missing key ✓, 502 on Claude error ✓
- **No placeholders:** All code blocks are complete
- **Type consistency:** `ai_description` (DB/API), `description` (engine internal), `desc` (photosJson runtime) — consistent within each layer
- **Locale fallback chain:** gallery.locale → 'en' (org default_locale not used in generate endpoint for simplicity, gallery.locale already inherits org default at creation)
