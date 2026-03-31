// Copyright (c) 2026 Philippe Vollenweider
//
// This file is part of GalleryPack.
//
// GalleryPack is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.

// packages/engine/src/watermark.js — watermark overlay for full-size images
//
// Design spec (hardcoded per product requirements):
//   Font:    DIN Tape (bundled in packages/engine/assets/din-tape.ttf)
//   Shadow:  opacity 0.80, translation 10px, angle -90° (straight up), blur radius 20
//   Effect:  opacity 0.50, font-size = 1.5% of image height
//            horizontal padding = 3% from right, vertical padding = 1% from bottom
//            alignment: bottom-right

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FONT_PATH = path.join(__dirname, '..', 'assets', 'din-tape.ttf');

const warn = (m) => process.stdout.write(`  \x1b[33m!\x1b[0m  ${m}\n`);
const ok   = (m) => process.stdout.write(`  \x1b[32m✓\x1b[0m  ${m}\n`);

// ── Font management ───────────────────────────────────────────────────────────

/**
 * Return the bundled DIN Tape font path, or null if the file is missing.
 */
export async function ensureWatermarkFont() {
  if (fs.existsSync(FONT_PATH)) return FONT_PATH;
  warn(`Watermark font not found at ${FONT_PATH}`);
  return null;
}

// ── SVG overlay ───────────────────────────────────────────────────────────────

/**
 * Build an SVG Buffer sized to imgWidth × imgHeight that renders the
 * watermark text with the product-spec shadow and opacity, bottom-right aligned.
 *
 * @param {number} imgWidth
 * @param {number} imgHeight
 * @param {string} text       — watermark string
 * @param {string|null} fontPath — absolute path to TTF font, or null for fallback
 * @returns {Buffer}
 */
export function buildWatermarkSvg(imgWidth, imgHeight, text, fontPath) {
  // Design constants
  const opacity    = 0.50;
  const sizeRatio  = 0.015;  // 1.5% of shortest side
  const hPadRatio  = 0.03;   // 3% from right
  const vPadRatio  = 0.01;   // 1% from bottom
  const shadowOpacity    = 0.80;
  const shadowTranslation = 10;
  const shadowAngle      = -90; // degrees → straight up
  const shadowRadius     = 20;

  const fontSize = Math.round(Math.min(imgWidth, imgHeight) * sizeRatio);
  const x        = imgWidth  - Math.round(imgWidth  * hPadRatio);
  const y        = imgHeight - Math.round(imgHeight * vPadRatio);

  // Shadow offset from angle
  const rad = (shadowAngle * Math.PI) / 180;
  const sdx = Math.round(shadowTranslation * Math.cos(rad) * 10) / 10;
  const sdy = Math.round(shadowTranslation * Math.sin(rad) * 10) / 10;

  // fontconfig is installed in the container — reference font by family name.
  // Fallback to DejaVu Sans (always present) when the custom font isn't available.
  const fontFamily = fontPath ? 'DIN Tape' : 'DejaVu Sans';

  const txt = escXml(text);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${imgWidth}" height="${imgHeight}">
  <defs>
    <filter id="wmshadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="${sdx}" dy="${sdy}" stdDeviation="${shadowRadius}"
        flood-color="black" flood-opacity="${shadowOpacity}"/>
    </filter>
  </defs>
  <text
    x="${x}" y="${y}"
    font-family="${fontFamily}"
    font-size="${fontSize}"
    fill="white"
    fill-opacity="${opacity}"
    text-anchor="end"
    dominant-baseline="auto"
    filter="url(#wmshadow)"
  >${txt}</text>
</svg>`;

  return Buffer.from(svg, 'utf8');
}

function escXml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
