// Copyright (c) 2026 Philippe Vollenweider
//
// This file is part of the GalleryPack commercial platform.
// This source code is proprietary and confidential.
// Use, reproduction, or distribution requires a valid commercial license.
// Unauthorized use is strictly prohibited.

import { useAuth } from '../../lib/auth.jsx';
import { useT } from '../../lib/I18nContext.jsx';

/**
 * Top navigation bar shared by ManageLayout and PlatformLayout.
 */
export default function Topbar({ onToggleSidebar }) {
  const { user, logout } = useAuth();
  const t = useT();

  return (
    <nav className="app-header navbar navbar-expand">
      <div className="container-fluid">
        {/* Sidebar toggle */}
        <ul className="navbar-nav">
          <li className="nav-item">
            <button type="button" className="nav-link" onClick={onToggleSidebar} aria-label="Toggle sidebar">
              <i className="fas fa-bars" aria-hidden="true" />
            </button>
          </li>
        </ul>

        {/* Right side: user + logout */}
        <ul className="navbar-nav ms-auto">
          <li className="nav-item d-none d-sm-flex align-items-center">
            <span className="nav-link text-muted" style={{ fontSize: '0.85rem' }}>
              {user?.email}
            </span>
          </li>
          <li className="nav-item">
            <button type="button" className="nav-link" onClick={logout} aria-label="Sign out">
              <i className="fas fa-sign-out-alt" aria-hidden="true" />
              <span className="d-none d-md-inline ms-1">{t('sign_out')}</span>
            </button>
          </li>
        </ul>
      </div>
    </nav>
  );
}
