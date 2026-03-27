// Copyright (c) 2026 Philippe Vollenweider
//
// This file is part of the GalleryPack commercial platform.
// This source code is proprietary and confidential.
// Use, reproduction, or distribution requires a valid commercial license.
// Unauthorized use is strictly prohibited.

/**
 * @param {string} icon  FontAwesome class e.g. "fa-images"
 * @param {string} title
 * @param {string} [message]
 * @param {React.ReactNode} [action]
 */
export default function EmptyState({ icon = 'fa-inbox', title, message, action }) {
  return (
    <div className="text-center py-5 text-muted">
      <i className={`fas ${icon} fa-2x mb-3`} style={{ display: 'block' }} />
      {title   && <p className="mb-1 fw-semibold">{title}</p>}
      {message && <p className="mb-2" style={{ fontSize: '0.875rem' }}>{message}</p>}
      {action}
    </div>
  );
}
