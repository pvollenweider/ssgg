// Copyright (c) 2026 Philippe Vollenweider
//
// This file is part of the GalleryPack commercial platform.
// This source code is proprietary and confidential.
// Use, reproduction, or distribution requires a valid commercial license.
// Unauthorized use is strictly prohibited.

import { useEffect, useRef, useState } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { useT } from '../lib/I18nContext.jsx';
import { api } from '../lib/api.js';

export default function AdminLayout({ children }) {
  const { user, setUser, logout } = useAuth();
  const t          = useT();
  const location   = useLocation();
  const navigate   = useNavigate();

  const isSuperadmin = user?.platformRole === 'superadmin';
  const canAdmin     = ['admin', 'owner'].includes(user?.organizationRole) || isSuperadmin;

  const [collapsed, setCollapsed] = useState(false);

  // Org switcher
  const [organizations,   setOrganizations]   = useState([]);
  const [orgOpen,   setOrgOpen]   = useState(false);
  const [switching, setSwitching] = useState(false);
  const orgRef = useRef(null);

  useEffect(() => {
    document.body.classList.add('sidebar-mini', 'layout-fixed');
    return () => document.body.classList.remove(
      'sidebar-mini', 'layout-fixed', 'sidebar-collapse', 'sidebar-open'
    );
  }, []);

  useEffect(() => {
    if (collapsed) {
      document.body.classList.add('sidebar-collapse');
      document.body.classList.remove('sidebar-open');
    } else {
      document.body.classList.remove('sidebar-collapse');
    }
  }, [collapsed]);

  useEffect(() => {
    if (isSuperadmin) api.listPlatformOrganizations().then(setOrganizations).catch(() => {});
  }, [isSuperadmin]);

  // Close org dropdown on outside click
  useEffect(() => {
    function onOutside(e) {
      if (orgRef.current && !orgRef.current.contains(e.target)) setOrgOpen(false);
    }
    if (orgOpen) document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [orgOpen]);

  async function handleSwitchOrg(orgId) {
    if (orgId === user?.organizationId) { setOrgOpen(false); return; }
    setSwitching(true);
    try {
      await api.switchOrganization(orgId);
      const me = await api.me();
      setUser(me);
      navigate('/studio');
    } catch (e) {}
    finally { setSwitching(false); setOrgOpen(false); }
  }

  const navCls       = ({ isActive }) => `nav-link${isActive ? ' active' : ''}`;
  const onSettings   = location.pathname === '/settings';
  const settingsHash = location.hash;
  const otherOrgs = organizations.filter(s => s.id !== user?.organizationId);
  const canSwitch    = isSuperadmin && otherOrgs.length > 0;

  function settingsLinkCls(hash) {
    return `nav-link${onSettings && settingsHash === hash ? ' active' : ''}`;
  }

  return (
    <div className="app-wrapper">

      {/* ── Top Navbar ── */}
      <nav className="app-header navbar navbar-expand">
        <div className="container-fluid">
          <ul className="navbar-nav">
            <li className="nav-item">
              <a className="nav-link" role="button" style={{ cursor: 'pointer' }}
                onClick={() => setCollapsed(c => !c)}>
                <i className="fas fa-bars" />
              </a>
            </li>
          </ul>
          <ul className="navbar-nav ms-auto">
            <li className="nav-item d-none d-sm-flex align-items-center">
              <span className="nav-link text-muted" style={{ fontSize: '0.85rem' }}>
                {user?.email}
              </span>
            </li>
            <li className="nav-item">
              <a className="nav-link" role="button" style={{ cursor: 'pointer' }} onClick={logout}>
                <i className="fas fa-sign-out-alt" />
                <span className="d-none d-md-inline ms-1">{t('sign_out')}</span>
              </a>
            </li>
          </ul>
        </div>
      </nav>

      {/* ── Sidebar ── */}
      <aside className="app-sidebar bg-body" data-bs-theme="dark">
        <div className="sidebar-brand">
          <Link to="/studio" className="brand-link">
            <span className="brand-text fw-bold" style={{ fontSize: '1rem', letterSpacing: '-0.02em' }}>
              GalleryPack
            </span>
          </Link>
        </div>

        <div className="sidebar-wrapper">
          <nav className="mt-2">
            <ul className="nav sidebar-menu flex-column">

              {/* ── Current organization (+ switcher) ── */}
              <li className="nav-item" ref={orgRef} style={{ position: 'relative' }}>
                <button
                  type="button"
                  className={`nav-link w-100 text-start d-flex align-items-center${orgOpen ? ' active' : ''}`}
                  onClick={() => canSwitch && setOrgOpen(o => !o)}
                  style={{ background: 'none', border: 'none', cursor: canSwitch ? 'pointer' : 'default' }}
                  disabled={switching}
                >
                  <i className="nav-icon fas fa-building" />
                  <p className="mb-0 flex-grow-1">
                    {switching ? '…' : (user?.organizationName || t('studio_untitled'))}
                  </p>
                  {canSwitch && (
                    <i className={`fas fa-angle-${orgOpen ? 'up' : 'down'} ms-1`}
                      style={{ fontSize: '0.7rem', opacity: 0.5 }} />
                  )}
                </button>

                {/* Org switcher dropdown */}
                {orgOpen && (
                  <div style={{
                    position: 'absolute', left: 0, right: 0, top: '100%',
                    background: '#2d3238', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '0 0 4px 4px', zIndex: 1050,
                    maxHeight: 220, overflowY: 'auto',
                  }}>
                    {otherOrgs.map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleSwitchOrg(s.id)}
                        style={{
                          display: 'block', width: '100%', textAlign: 'left',
                          padding: '0.5rem 1.25rem', background: 'none', border: 'none',
                          color: 'rgba(255,255,255,0.65)', fontSize: '0.82rem', cursor: 'pointer',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                      >
                        <i className="fas fa-building me-2" style={{ opacity: 0.4 }} />{s.name}
                      </button>
                    ))}
                  </div>
                )}
              </li>

              {/* Org sub-items */}
              <li className="nav-item">
                <NavLink to="/studio" className={navCls}>
                  <i className="nav-icon fas fa-home" />
                  <p>{t('nav_home')}</p>
                </NavLink>
              </li>
              {canAdmin && (
                <li className="nav-item">
                  <NavLink to="/team" className={navCls}>
                    <i className="nav-icon fas fa-users" />
                    <p>{t('nav_team')}</p>
                  </NavLink>
                </li>
              )}
              {canAdmin && (
                <li className="nav-item">
                  <Link to="/settings#studio" className={settingsLinkCls('#studio')}>
                    <i className="nav-icon fas fa-sliders-h" />
                    <p>{t('nav_org_settings')}</p>
                  </Link>
                </li>
              )}

              {/* ── My account ── */}
              <li className="nav-header">{t('nav_my_profile')}</li>
              <li className="nav-item">
                <Link to="/settings#profile" className={settingsLinkCls('#profile')}>
                  <i className="nav-icon fas fa-user" />
                  <p>{t('profile_title')}</p>
                </Link>
              </li>
              <li className="nav-item">
                <NavLink to="/dashboard" className={navCls}>
                  <i className="nav-icon fas fa-tachometer-alt" />
                  <p>{t('nav_dashboard')}</p>
                </NavLink>
              </li>

              {/* ── Platform (superadmin) ── */}
              {isSuperadmin && (<>
                <li className="nav-header">{t('nav_platform')}</li>
                <li className="nav-item">
                  <NavLink to="/" end className={navCls}>
                    <i className="nav-icon fas fa-building" />
                    <p>{t('nav_organizations')}</p>
                  </NavLink>
                </li>
                <li className="nav-item">
                  <Link to="/settings#smtp" className={settingsLinkCls('#smtp')}>
                    <i className="nav-icon fas fa-envelope" />
                    <p>{t('section_smtp')}</p>
                  </Link>
                </li>
                <li className="nav-item">
                  <Link to="/settings#license" className={settingsLinkCls('#license')}>
                    <i className="nav-icon fas fa-certificate" />
                    <p>{t('section_license')}</p>
                  </Link>
                </li>
              </>)}

              {/* ── Tools (admin+) ── */}
              {canAdmin && (<>
                <li className="nav-header">{t('nav_tools')}</li>
                <li className="nav-item">
                  <NavLink to="/inspector" className={navCls}>
                    <i className="nav-icon fas fa-search" />
                    <p>{t('nav_inspector')}</p>
                  </NavLink>
                </li>
              </>)}

            </ul>
          </nav>
        </div>
      </aside>

      {/* ── Content ── */}
      <main className="app-main">
        <div className="app-content">
          {children}
        </div>
      </main>

      <footer className="app-footer">
        <strong>GalleryPack</strong> &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
