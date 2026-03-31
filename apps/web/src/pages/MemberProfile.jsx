// Copyright (c) 2026 Philippe Vollenweider
//
// This file is part of the GalleryPack commercial platform.
// This source code is proprietary and confidential.
// Use, reproduction, or distribution requires a valid commercial license.
// Unauthorized use is strictly prohibited.

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useT } from '../lib/I18nContext.jsx';
import { useAuth } from '../lib/auth.jsx';
import { Toast } from '../components/Toast.jsx';

const ORG_ROLES = ['photographer', 'editor', 'admin', 'owner'];
const ROLE_COLORS  = { owner: '#7c3aed', admin: '#2563eb', editor: '#0891b2', photographer: '#059669' };
const GALLERY_ROLE_COLORS = { viewer: '#888', contributor: '#059669', editor: '#0891b2' };

export default function MemberProfile() {
  const { userId }  = useParams();
  const navigate    = useNavigate();
  const t           = useT();
  const { user }    = useAuth();
  const [member,    setMember]    = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [toast,     setToast]     = useState('');
  const [removing,  setRemoving]  = useState(false);

  useEffect(() => {
    api.getOrgLegacyMember(userId)
      .then(setMember)
      .catch(e => setToast(e.message))
      .finally(() => setLoading(false));
  }, [userId]);

  const ORG_ROLE_LABELS = {
    photographer: t('role_photographer'),
    editor:       t('role_editor'),
    admin:        t('role_admin'),
    owner:        t('role_owner'),
  };
  const ORG_ROLE_DESC = {
    photographer: t('role_photographer_desc'),
    editor:       t('role_editor_desc'),
    admin:        t('role_admin_desc'),
    owner:        t('role_owner_desc'),
  };
  const GALLERY_ROLE_LABELS = {
    viewer:      t('gallery_role_viewer'),
    contributor: t('gallery_role_contributor'),
    editor:      t('gallery_role_editor'),
  };

  async function handleRoleChange(role) {
    try {
      await api.updateOrgLegacyMember(userId, role);
      setMember(m => ({ ...m, role }));
      setToast(t('team_toast_role_updated'));
    } catch (e) { setToast(e.message); }
  }

  async function handleResetLink() {
    try {
      const { resetUrl } = await api.adminResetLink(userId);
      await navigator.clipboard.writeText(resetUrl);
      setToast(t('team_toast_reset_link'));
    } catch (e) { setToast(e.message); }
  }

  async function handleRemoveRights() {
    const name = member.user.name || member.user.email;
    if (!confirm(t('member_remove_rights_confirm', { name }))) return;
    setRemoving(true);
    try {
      await api.removeOrgLegacyMember(userId);
      setToast(t('member_rights_removed'));
      setTimeout(() => navigate('/team'), 800);
    } catch (e) {
      setToast(e.message);
      setRemoving(false);
    }
  }

  function formatDate(ms) {
    if (!ms) return '—';
    return new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
  }

  return (
    <>
      {/* Content Header */}
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2 align-items-center">
            <div className="col-sm-6">
              <h1 className="m-0">
                <Link to="/team" className="text-muted me-1" style={{ fontSize: '0.875rem' }}>
                  {user?.organizationName || t('studio_back')}
                </Link>
                <span className="text-muted me-1">/</span>
                <Link to="/team" className="text-muted me-1" style={{ fontSize: '0.875rem' }}>
                  {t('team_title')}
                </Link>
                <span className="text-muted me-1">/</span>
                {member ? (member.user.name || member.user.email) : t('loading')}
              </h1>
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">
          {loading ? (
            <div className="text-center text-muted py-5">
              <i className="fas fa-spinner fa-spin fa-2x" />
            </div>
          ) : !member ? null : (
            <div className="row">
              <div className="col-md-4">

                {/* Identity card */}
                <div className="card card-primary card-outline">
                  <div className="card-body text-center">
                    <div className="d-flex align-items-center justify-content-center mb-3"
                      style={{ width: 64, height: 64, borderRadius: '50%', background: '#e5e5e5', fontSize: '1.5rem', fontWeight: 700, color: '#555', margin: '0 auto' }}>
                      {(member.user.name || member.user.email)[0].toUpperCase()}
                    </div>
                    <h5 className="mb-0">{member.user.name || member.user.email}</h5>
                    {member.user.name && <p className="text-muted mb-1" style={{ fontSize: '0.85rem' }}>{member.user.email}</p>}
                    <p className="text-muted" style={{ fontSize: '0.78rem' }}>
                      {t('member_joined')} {formatDate(member.user.createdAt)}
                    </p>
                  </div>
                  <div className="card-footer">
                    <div className="d-flex flex-column" style={{ gap: '0.5rem' }}>
                      <button className="btn btn-outline-secondary btn-sm w-100" onClick={handleResetLink}>
                        <i className="fas fa-key me-1" />{t('team_reset_link_title')}
                      </button>
                      <button
                        className="btn btn-outline-danger btn-sm w-100"
                        style={{ opacity: removing ? 0.6 : 1 }}
                        disabled={removing}
                        onClick={handleRemoveRights}
                      >
                        {t('member_remove_rights')}
                      </button>
                    </div>
                  </div>
                </div>

              </div>
              <div className="col-md-8">

                {/* Organization role */}
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">{t('member_studio_role')}</h3>
                  </div>
                  <div className="card-body">
                    <div className="mb-3 mb-1">
                      <select
                        className="form-control"
                        style={{ borderColor: ROLE_COLORS[member.role] || '#ced4da', color: ROLE_COLORS[member.role] || '#495057', fontWeight: 600, maxWidth: 220 }}
                        value={member.role}
                        onChange={e => handleRoleChange(e.target.value)}
                      >
                        {ORG_ROLES.map(r => (
                          <option key={r} value={r}>{ORG_ROLE_LABELS[r]}</option>
                        ))}
                      </select>
                    </div>
                    <small className="text-muted">{ORG_ROLE_DESC[member.role]}</small>
                  </div>
                </div>

                {/* Gallery accesses */}
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">{t('member_gallery_access')}</h3>
                  </div>
                  <div className="card-body p-0">
                    {member.galleries.length === 0 ? (
                      <div className="text-center text-muted py-4" style={{ fontSize: '0.875rem' }}>
                        {t('member_no_gallery_access')}
                      </div>
                    ) : (
                      <table className="table table-sm table-hover mb-0">
                        <tbody>
                          {member.galleries.map(g => (
                            <tr key={g.galleryId}>
                              <td>
                                <Link to={`/galleries/${g.galleryId}`}>{g.galleryTitle}</Link>
                              </td>
                              <td>
                                <span
                                  className="badge"
                                  style={{
                                    background: (GALLERY_ROLE_COLORS[g.role] || '#888') + '20',
                                    color: GALLERY_ROLE_COLORS[g.role] || '#888',
                                    fontWeight: 600,
                                  }}
                                >
                                  {GALLERY_ROLE_LABELS[g.role] || g.role}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>
      </section>

      <Toast message={toast} onDone={() => setToast('')} />
    </>
  );
}
