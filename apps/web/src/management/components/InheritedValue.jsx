// Copyright (c) 2026 Philippe Vollenweider
//
// This file is part of the GalleryPack commercial platform.
// This source code is proprietary and confidential.
// Use, reproduction, or distribution requires a valid commercial license.
// Unauthorized use is strictly prohibited.

/**
 * Shows a reference value inherited from a parent scope.
 *
 * @param {string} label   e.g. "Organization default"
 * @param {React.ReactNode} children  the value to display
 */
export default function InheritedValue({ label = 'Organization default', children }) {
  return (
    <div className="d-flex align-items-center gap-2 mt-2" style={{ fontSize: '0.8rem' }}>
      <span className="badge bg-light text-muted border">{label}</span>
      <span className="text-muted">{children}</span>
    </div>
  );
}
