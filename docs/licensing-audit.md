# Licensing Audit

This document records the authorship and dependency audit performed on 2026-03-25 prior to the dual-license release of GalleryPack.

## Authorship

**Git log review:** all commits in this repository were authored by a single contributor:

```
pvollenweider@jahia.com  Philippe Vollenweider
```

No external contributor has committed code to this repository. No code was copied from third-party projects without a compatible license.

**Conclusion:** sole authorship confirmed. The dual-license model is legally valid.

---

## Dependency Audit

### `packages/engine` (AGPL-3.0)

Dependencies must be AGPL-compatible (MIT, Apache-2.0, BSD, ISC, etc.).

| Package | Version | License | Notes |
|---|---|---|---|
| `exifr` | ^7.1.3 | MIT | EXIF metadata extraction |
| `piexifjs` | ^1.0.6 | MIT | EXIF read/write |
| `sharp` | ^0.33.5 | Apache-2.0 | Image resizing (libvips) |

**Result:** all dependencies are permissive. No GPL/AGPL contamination. Compatible with AGPL-3.0 distribution.

**Assets:** one font bundled in `packages/engine/assets/`:

| Asset | File | License | Notes |
|---|---|---|---|
| DIN Tape | `din-tape.ttf` | Commercial — licensed to Philippe Vollenweider | Used for watermark overlay on full-size images; not redistributed to end users |

---

### `packages/shared` (AGPL-3.0)

| Package | Version | License | Notes |
|---|---|---|---|
| *(no runtime dependencies)* | — | — | — |

**Result:** clean.

---

### `apps/api` (Proprietary)

GPL/AGPL dependencies are acceptable here — GalleryPack holds copyright on the platform code.

| Package | Version | License | Notes |
|---|---|---|---|
| `@gallerypack/engine` | workspace | AGPL-3.0-only | Internal — we hold copyright |
| `@gallerypack/shared` | workspace | AGPL-3.0-only | Internal — we hold copyright |
| `cookie-parser` | * | MIT | Session cookie parsing |
| `express` | * | MIT | HTTP framework |
| `multer` | * | MIT | File upload handling |
| `nodemailer` | * | MIT-0 | Email delivery |
| `mysql2` | * | MIT | MariaDB/MySQL client |

**Result:** all third-party dependencies are permissive. No commercial license risk.

---

### `apps/web` (Proprietary)

| Package | Version | License | Notes |
|---|---|---|---|
| `@gallerypack/shared` | workspace | AGPL-3.0-only | Internal — we hold copyright |
| `react` | * | MIT | UI framework |
| `react-dom` | * | MIT | DOM renderer |
| `react-router-dom` | * | MIT | Client-side routing |
| `qrcode` | * | MIT | QR code generation for upload links |
| `admin-lte` | 4.0.0-rc7 | MIT | AdminLTE 4 admin UI template (Bootstrap 5 bundled, no jQuery) |
| `@fortawesome/fontawesome-free` | ^6 | MIT (icons), OFL-1.1 (fonts), CC-BY-4.0 (docs) | Icon font |
| `@vitejs/plugin-react` | * | MIT | Vite React plugin |
| `vite` | * | MIT | Build tool (dev only) |

**Result:** all dependencies are permissive. No commercial license risk.

**Asset note:** FontAwesome Free uses MIT for JS/CSS, OFL-1.1 for font files (.woff2/.ttf) — both are compatible with proprietary distribution.

---

### `workers/builder` (Proprietary)

| Package | Version | License | Notes |
|---|---|---|---|
| `@gallerypack/engine` | workspace | AGPL-3.0-only | Internal — we hold copyright |
| `@gallerypack/shared` | workspace | AGPL-3.0-only | Internal — we hold copyright |

**Result:** no third-party runtime dependencies. Clean.

---

## Summary

| Concern | Status |
|---|---|
| Sole authorship of all code | Confirmed |
| AGPL packages — no GPL contamination | Confirmed |
| Proprietary packages — no commercial license risk | Confirmed |
| No bundled assets with incompatible licenses | Confirmed |

**Sign-off:** Philippe Vollenweider, 2026-03-25. All source code in this repository is original work authored solely by Philippe Vollenweider and is licensable under both AGPL-3.0 and a proprietary commercial license.
