// Copyright (c) 2026 Philippe Vollenweider
//
// This file is part of the GalleryPack commercial platform.
// This source code is proprietary and confidential.
// Use, reproduction, or distribution requires a valid commercial license.
// Unauthorized use is strictly prohibited.

// apps/api/src/services/thumbnailService.js — static thumbnail generation for admin use
//
// Spec:
//   Sizes  : sm (160px max-dim), md (400px max-dim)
//   Format : WebP, quality 80, EXIF auto-rotation applied
//   Storage: <ROOT>/thumbnails/<size>/<photoId>.webp
//   URL    : /media/thumbnails/<size>/<photoId>.webp
//
// Generation is split into two priority queues:
//   sm  — high priority, processed first (used in management grids)
//   md  — low  priority, processed after all sm jobs (used in lightbox/preview)

import path              from 'node:path';
import fs                from 'node:fs/promises';
import { existsSync }    from 'node:fs';
import { INTERNAL_ROOT } from '../../../../packages/engine/src/fs.js';

// ── Constants ─────────────────────────────────────────────────────────────────

export const THUMB_SIZES = { sm: 160, md: 400 };
const THUMB_ROOT = process.env.THUMB_ROOT || path.join(INTERNAL_ROOT, 'thumbnails');
const QUEUE_CONCURRENCY = Number(process.env.THUMB_CONCURRENCY) || 4;

// ── Path / URL helpers ────────────────────────────────────────────────────────

export function thumbPath(photoId, size) {
  return path.join(THUMB_ROOT, size, `${photoId}.webp`);
}

export function thumbUrl(photoId, size) {
  return `/media/thumbnails/${size}/${photoId}.webp`;
}

/**
 * Returns { sm, md } URLs, null for each size that doesn't exist on disk yet.
 */
export function photoThumbnails(photoId) {
  const result = {};
  for (const size of Object.keys(THUMB_SIZES)) {
    try {
      result[size] = existsSync(thumbPath(photoId, size)) ? thumbUrl(photoId, size) : null;
    } catch {
      result[size] = null;
    }
  }
  return result;
}

// ── Priority queue ────────────────────────────────────────────────────────────
// sm jobs always drain before any md job starts.

class ThumbnailQueue {
  constructor(concurrency) {
    this.concurrency = concurrency;
    this.running     = 0;
    this.smJobs      = [];   // high priority
    this.mdJobs      = [];   // low  priority
  }

  /** Push a job at sm priority (runs before any md job). */
  pushSm(fn) { this.smJobs.push(fn); this._tick(); }

  /** Push a job at md priority (runs after all queued sm jobs). */
  pushMd(fn) { this.mdJobs.push(fn); this._tick(); }

  _tick() {
    while (this.running < this.concurrency) {
      const fn = this.smJobs.shift() ?? this.mdJobs.shift();
      if (!fn) break;
      this.running++;
      Promise.resolve()
        .then(fn)
        .catch(() => {}) // errors logged inside the job
        .finally(() => { this.running--; this._tick(); });
    }
  }

  get queueLength() { return this.smJobs.length + this.mdJobs.length; }
  get stats() { return { running: this.running, sm: this.smJobs.length, md: this.mdJobs.length }; }
}

export const thumbQueue = new ThumbnailQueue(QUEUE_CONCURRENCY);

// ── Single-size generation ────────────────────────────────────────────────────

/**
 * Generate one thumbnail size (sm or md) for a photo.
 * Returns the destination path on success, null on failure.
 */
export async function generateSingleThumbnail(srcPath, photoId, size) {
  const maxDim = THUMB_SIZES[size];
  if (!maxDim) throw new Error(`Unknown thumbnail size: ${size}`);

  const dest = thumbPath(photoId, size);
  const { default: sharp } = await import('sharp');
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await sharp(srcPath, { failOn: 'none' })
    .rotate()
    .resize(maxDim, maxDim, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(dest);
  return dest;
}

// ── Queue helpers — fire-and-forget ──────────────────────────────────────────

/**
 * Enqueue sm thumbnail generation (high priority).
 * Logs errors; never throws.
 */
export function enqueueSm(srcPath, photoId) {
  thumbQueue.pushSm(async () => {
    try {
      await generateSingleThumbnail(srcPath, photoId, 'sm');
    } catch (err) {
      console.error(`[thumb:sm] ${photoId}: ${err.message}`);
    }
  });
}

/**
 * Enqueue md thumbnail generation (low priority).
 * Logs errors; never throws.
 */
export function enqueueMd(srcPath, photoId) {
  thumbQueue.pushMd(async () => {
    try {
      await generateSingleThumbnail(srcPath, photoId, 'md');
    } catch (err) {
      console.error(`[thumb:md] ${photoId}: ${err.message}`);
    }
  });
}

// ── Batch generation (maintenance / reanalyze) ────────────────────────────────

/**
 * Generate both sm and md thumbnails synchronously (awaitable).
 * Used by the reanalyze maintenance route.
 */
export async function generateThumbnails(srcPath, photoId) {
  const result = { sm: null, md: null };
  for (const size of ['sm', 'md']) {
    try {
      result[size] = await generateSingleThumbnail(srcPath, photoId, size);
    } catch (err) {
      console.error(`[thumbnailService] failed to generate ${size} for ${photoId}: ${err.message}`);
    }
  }
  return result;
}
