#!/usr/bin/env node
// Copyright (c) 2026 Philippe Vollenweider
//
// This file is part of the GalleryPack commercial platform.
// This source code is proprietary and confidential.
// Use, reproduction, or distribution requires a valid commercial license.
// Unauthorized use is strictly prohibited.

/**
 * Verifies that every first-party source file starts with the copyright header.
 * Run: node scripts/check-headers.js
 * Exit 1 if any file is missing the header.
 */

import { readdirSync, readFileSync, statSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const ROOT       = join(__dirname, '..');

const HEADER     = '// Copyright (c) 2026 Philippe Vollenweider';
const EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx']);

// Directories to walk (relative to ROOT)
const INCLUDE_DIRS = ['apps', 'packages', 'workers'];

// Path segments that cause a file to be skipped
const SKIP_SEGMENTS = new Set(['node_modules', 'dist', '.git', '.claude']);

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_SEGMENTS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else if (entry.isFile() && EXTENSIONS.has(extname(entry.name))) {
      yield full;
    }
  }
}

const missing = [];

for (const dir of INCLUDE_DIRS) {
  const abs = join(ROOT, dir);
  try { statSync(abs); } catch { continue; }
  for (const file of walk(abs)) {
    const first = readFileSync(file, 'utf8').slice(0, HEADER.length);
    if (first !== HEADER) {
      missing.push(file.replace(ROOT + '/', ''));
    }
  }
}

if (missing.length > 0) {
  console.error(`\nMissing license header in ${missing.length} file(s):\n`);
  for (const f of missing) console.error(`  ${f}`);
  console.error('\nExpected first line:\n  ' + HEADER + '\n');
  process.exit(1);
} else {
  console.log(`License headers OK (checked ${INCLUDE_DIRS.join(', ')})`);
}
