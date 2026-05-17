// Copyright (c) 2026 Philippe Vollenweider
//
// This file is part of the GalleryPack commercial platform.
// This source code is proprietary and confidential.
// Use, reproduction, or distribution requires a valid commercial license.
// Unauthorized use is strictly prohibited.

// apps/api/src/services/geocoding.js — Nominatim geocoder (OpenStreetMap, free)

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT    = 'GalleryPack/1.0 (https://gallerypack.app)';

// Nominatim requires max 1 req/s — track last call time
let _lastCall = 0;

/**
 * Geocode a location string to lat/lng using Nominatim.
 * Respects 1 req/s rate limit.
 *
 * @param {string} location - e.g. "Lyon, France"
 * @returns {Promise<{lat: number, lng: number}|null>}
 */
export async function geocode(location) {
  if (!location?.trim()) return null;

  const now = Date.now();
  const wait = 1050 - (now - _lastCall);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  _lastCall = Date.now();

  const url = `${NOMINATIM_URL}?q=${encodeURIComponent(location)}&format=json&limit=1`;
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) return null;
  const data = await res.json();
  if (!data[0]) return null;

  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
}
