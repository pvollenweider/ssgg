// Copyright (c) 2026 Philippe Vollenweider
//
// This file is part of the GalleryPack commercial platform.
// This source code is proprietary and confidential.
// Use, reproduction, or distribution requires a valid commercial license.
// Unauthorized use is strictly prohibited.

const BUILD_MAP  = { done: 'success', error: 'danger', running: 'primary', queued: 'warning' };
const ACCESS_MAP = { public: 'success', private: 'secondary', password: 'warning' };

/**
 * @param {'build'|'access'} type
 * @param {string} value
 */
export default function StatusBadge({ type = 'build', value }) {
  if (!value) return <span className="text-muted">—</span>;
  const map   = type === 'access' ? ACCESS_MAP : BUILD_MAP;
  const color = map[value] ?? 'secondary';
  return <span className={`badge bg-${color}`}>{value}</span>;
}
