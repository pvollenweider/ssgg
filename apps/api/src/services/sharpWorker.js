// Copyright (c) 2026 Philippe Vollenweider
//
// This file is part of the GalleryPack commercial platform.
// This source code is proprietary and confidential.
// Use, reproduction, or distribution requires a valid commercial license.
// Unauthorized use is strictly prohibited.

// apps/api/src/services/sharpWorker.js
//
// Runs as a child process spawned by sharpProcess.js.
// Reads one JSON job from stdin, processes it with Sharp, prints JSON result
// to stdout, then exits.
//
// If libvips crashes with SIGBUS the child process dies — the spawning API
// process is completely unaffected.
//
// Supported ops:
//   { op: "metadata",       srcPath }
//   { op: "resize-webp",    srcPath, destPath, width, height, fit, quality }
//   { op: "validate-and-thumbs", srcPath, smPath, mdPath }

import sharp from 'sharp';
import fs    from 'node:fs/promises';
import path  from 'node:path';
import { tmpdir } from 'node:os';

// ── JPEG trailer stripper ──────────────────────────────────────────────────────
//
// iOS Live Photos are a valid JPEG immediately followed by an H.264/MOV
// container.  libvips reads past the JPEG EOI marker into the video data,
// which causes non-deterministic SIGBUS crashes.
//
// We parse the JPEG marker structure properly (skipping APP1/Exif embedded
// thumbnails by their declared length) and return the byte offset of the
// first byte AFTER the main image's EOI (FF D9).  Any bytes beyond that
// offset are non-JPEG trailer data.
//
// Algorithm:
//   1. After SOI (FF D8), iterate marker segments.  Each has a 2-byte
//      big-endian length that covers the segment (skip length-2 bytes).
//   2. When we reach SOS (FF DA), the compressed scan data follows.
//      Scan byte-by-byte:  FF 00 = byte-stuffed FF (skip), FF D0-D7 =
//      restart markers (skip), FF D9 = EOI (done!), FF DA = next progressive
//      scan (skip its header), other FF XX = skip by length.
//   3. Returning the offset after EOI lets us slice() the buffer precisely.

function findJpegEndOffset(buf) {
  if (buf.length < 2 || buf[0] !== 0xFF || buf[1] !== 0xD8) return null;

  let pos = 2; // right after SOI

  while (pos < buf.length - 1) {
    // Each marker starts with one or more 0xFF bytes (allow padding)
    if (buf[pos] !== 0xFF) return null;
    while (pos < buf.length && buf[pos] === 0xFF) pos++;
    if (pos >= buf.length) return null;

    const marker = buf[pos++];

    if (marker === 0xD9) return pos;          // EOI — done
    if (marker === 0xD8) return null;          // unexpected nested SOI
    if (marker >= 0xD0 && marker <= 0xD7) continue; // RST0-RST7, no length

    if (pos + 1 >= buf.length) return null;
    const segLen = (buf[pos] << 8) | buf[pos + 1];
    if (segLen < 2) return null;

    if (marker === 0xDA) {
      // SOS: skip the segment header, then scan compressed data
      pos += segLen;

      while (pos < buf.length - 1) {
        if (buf[pos] !== 0xFF) { pos++; continue; }
        pos++;
        if (pos >= buf.length) return null;
        const b = buf[pos++];
        if (b === 0x00) continue;                    // byte stuffing
        if (b >= 0xD0 && b <= 0xD7) continue;        // restart markers
        if (b === 0xD9) return pos;                  // EOI — done
        if (b === 0xDA) {
          // Progressive: another SOS header follows
          if (pos + 1 >= buf.length) return null;
          const sosLen = (buf[pos] << 8) | buf[pos + 1];
          if (sosLen < 2) return null;
          pos += sosLen;
          continue;
        }
        // Any other marker inside compressed data — skip by length
        if (pos + 1 >= buf.length) return null;
        const mLen = (buf[pos] << 8) | buf[pos + 1];
        if (mLen < 2) return null;
        pos += mLen;
      }
      return null; // EOI never found
    }

    // Non-SOS segment: skip by declared length
    pos += segLen;
  }

  return null;
}

/**
 * If srcPath is a JPEG with trailing non-JPEG data (e.g. iOS Live Photo),
 * writes a stripped copy to a temp file and returns its path.
 * Returns null when no stripping is needed.
 * Caller must delete the returned temp file when done.
 */
async function stripJpegTrailerIfNeeded(srcPath) {
  const buf = await fs.readFile(srcPath);
  if (buf.length < 2 || buf[0] !== 0xFF || buf[1] !== 0xD8) return null; // not JPEG

  const end = findJpegEndOffset(buf);
  if (end === null || end >= buf.length) return null; // no trailing data

  // Trailing non-JPEG bytes detected — write a clean JPEG to a temp file
  const tmp = path.join(
    tmpdir(),
    `gp-strip-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`,
  );
  await fs.writeFile(tmp, buf.slice(0, end));
  return tmp;
}

// ── Main dispatcher ───────────────────────────────────────────────────────────

async function run() {
  let raw = '';
  for await (const chunk of process.stdin) raw += chunk;

  let msg;
  try {
    msg = JSON.parse(raw);
  } catch (e) {
    process.stdout.write(JSON.stringify({ ok: false, error: `Bad JSON input: ${e.message}` }));
    process.exit(1);
  }

  try {
    const result = await dispatch(msg);
    process.stdout.write(JSON.stringify({ ok: true, result }));
    process.exit(0);
  } catch (err) {
    process.stdout.write(JSON.stringify({ ok: false, error: err.message }));
    process.exit(1);
  }
}

/**
 * Load a source image into a Buffer that is safe to pass to Sharp.
 *
 * Two hazards are handled here:
 *
 * 1. iOS Live Photos — valid JPEG immediately followed by an H.264/MOV
 *    container.  We parse the JPEG marker structure to find the true EOI and
 *    slice off any trailing non-JPEG bytes.
 *
 * 2. SIGBUS on file-path input — when Sharp opens a file path, libvips
 *    memory-maps it.  If libjpeg's error-recovery look-ahead reads a few bytes
 *    past the last mapped byte (e.g. at EOF on a JPEG with restart markers),
 *    the OS delivers SIGBUS and kills the process.  Passing a Buffer instead of
 *    a path avoids mmap entirely; libvips uses a bounded in-memory blob, so any
 *    over-read produces a recoverable error instead of a signal.
 */
async function loadSafeBuffer(srcPath) {
  let buf = await fs.readFile(srcPath);

  // Strip trailing non-JPEG data (iOS Live Photo H.264 trailer)
  const end = findJpegEndOffset(buf);
  if (end !== null && end < buf.length) {
    buf = buf.slice(0, end);
  }

  return buf;
}

async function dispatch(msg) {
  const { op } = msg;

  if (op === 'metadata') {
    const buf = await loadSafeBuffer(msg.srcPath);
    const meta = await sharp(buf, { failOn: 'none' }).metadata();
    return { width: meta.width, height: meta.height, format: meta.format };
  }

  // Validate AND generate both sm (160px) and md (400px) thumbnails atomically.
  // If this succeeds, both thumbnails are on disk and enqueueSm/enqueueMd will skip them.
  // Both must succeed — this guarantees full thumbnail consistency before DB insertion.
  if (op === 'validate-and-thumbs') {
    const { srcPath, smPath, mdPath } = msg;
    await fs.mkdir(path.dirname(smPath), { recursive: true });
    await fs.mkdir(path.dirname(mdPath), { recursive: true });

    const buf = await loadSafeBuffer(srcPath);

    // Decode once into memory, then resize twice (avoids re-decoding).
    const decoded = sharp(buf, { failOn: 'none' }).rotate();

    const smBuf = await decoded.clone()
      .resize(160, 160, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
    if (!smBuf || smBuf.length === 0) throw new Error('sm thumbnail: Sharp produced empty buffer');

    const mdBuf = await decoded.clone()
      .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
    if (!mdBuf || mdBuf.length === 0) throw new Error('md thumbnail: Sharp produced empty buffer');

    await fs.writeFile(smPath, smBuf);
    await fs.writeFile(mdPath, mdBuf);
    return { smSize: smBuf.length, mdSize: mdBuf.length };
  }

  if (op === 'resize-webp') {
    const { srcPath, destPath, width, height, fit, quality } = msg;
    await fs.mkdir(path.dirname(destPath), { recursive: true });

    const buf = await loadSafeBuffer(srcPath);
    const out = await sharp(buf, { failOn: 'none' })
      .rotate()
      .resize(width, height, { fit, withoutEnlargement: true })
      .webp({ quality })
      .toBuffer();
    if (!out || out.length === 0) throw new Error('Sharp produced an empty buffer');
    await fs.writeFile(destPath, out);
    return { size: out.length };
  }

  throw new Error(`Unknown op: ${op}`);
}

run();
