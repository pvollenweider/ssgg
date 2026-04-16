// Copyright (c) 2026 Philippe Vollenweider
//
// This file is part of GalleryPack.
//
// GalleryPack is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.
//
// GalleryPack is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program. If not, see <https://www.gnu.org/licenses/>.

/**
 * Focal-length bins (35 mm equivalent).
 * Each bin has a stable key, a display label, and the inclusive [min, max] range in mm.
 * max = Infinity for the last bucket.
 *
 * Boundaries are aligned with standard lens categories:
 *   ultra_wide  ≤ 17 mm  — fisheye, ultra-wide (10–17 mm primes)
 *   wide        18–28 mm — wide-angle (18, 20, 21, 24, 28 mm)
 *   wide_std    29–40 mm — wide-normal (35, 40 mm)
 *   normal      41–60 mm — normal (50, 55, 58 mm)
 *   portrait    61–105 mm — portrait telephoto (70, 85, 100, 105 mm)
 *   short_tele 106–200 mm — short telephoto (135, 150, 180, 200 mm)
 *   tele       201–400 mm — telephoto (300, 400 mm)
 *   super_tele  > 400 mm  — super telephoto (500, 600 mm+)
 */
export const FOCAL_BINS = [
  { key: 'ultra_wide',  label: '≤ 17 mm',    min: 0,   max: 17  },
  { key: 'wide',        label: '18–28 mm',   min: 18,  max: 28  },
  { key: 'wide_std',    label: '29–40 mm',   min: 29,  max: 40  },
  { key: 'normal',      label: '41–60 mm',   min: 41,  max: 60  },
  { key: 'portrait',    label: '61–105 mm',  min: 61,  max: 105 },
  { key: 'short_tele',  label: '106–200 mm', min: 106, max: 200 },
  { key: 'tele',        label: '201–400 mm', min: 201, max: 400 },
  { key: 'super_tele',  label: '> 400 mm',   min: 401, max: Infinity },
];

/**
 * Return the bin key for a focal length in mm (35 mm equivalent).
 * Returns null if mm is not a positive finite number.
 *
 * @param {number} mm
 * @returns {string|null}
 */
export function binFocalLength(mm) {
  if (typeof mm !== 'number' || !isFinite(mm) || mm <= 0) return null;
  for (const bin of FOCAL_BINS) {
    if (mm >= bin.min && mm <= bin.max) return bin.key;
  }
  return null;
}

/**
 * Parse the focal35 string produced by packages/engine/src/exif.js.
 * Format: "52mm (éq. 35mm)"  →  52
 * Returns null if unparseable.
 *
 * @param {string|undefined} focal35
 * @returns {number|null}
 */
export function parseFocal35(focal35) {
  if (!focal35) return null;
  const n = parseInt(focal35, 10);
  return isFinite(n) && n > 0 ? n : null;
}
