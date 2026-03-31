// Copyright (c) 2026 Philippe Vollenweider
//
// This file is part of the GalleryPack commercial platform.
// This source code is proprietary and confidential.
// Use, reproduction, or distribution requires a valid commercial license.
// Unauthorized use is strictly prohibited.

// Page d'accueil : liste des studios accessibles
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { useT } from '../lib/I18nContext.jsx';
import { Toast } from '../components/Toast.jsx';

function slugify(str) {
  return str.toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const PLAN_BADGE = { free: 'g-secondary', pro: 'g-primary', agency: 'g-info' };

export default function StudiosPage() {
  const t                   = useT();
  const navigate            = useNavigate();
  const { user, setUser, logout } = useAuth();
  const isSuperadmin        = user?.platformRole === 'superadmin';

  const [studios,     setStudios]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [toast,       setToast]       = useState('');
  const [creating,    setCreating]    = useState(false);
  const [switching,   setSwitching]   = useState(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [form, setForm] = useState({ name: '', slug: '', plan: 'free', ownerEmail: '' });
  const [inviteLink, setInviteLink] = useState('');
  const [license,     setLicense]     = useState(null);

  // Photographers don't have organization access — redirect them to their gallery
  useEffect(() => {
    if (user?.role === 'photographer') {
      api.myGalleries().then(gs => {
        if (gs?.[0]) navigate(`/galleries/${gs[0].id}`, { replace: true });
      }).catch(() => {});
    }
  }, [user]);

  useEffect(() => { load(); }, [isSuperadmin]);

  async function load() {
    setLoading(true);
    try {
      if (isSuperadmin) {
        const [orgList, lic] = await Promise.all([
          api.listPlatformOrganizations(),
          api.getPlatformLicense().catch(() => null),
        ]);
        setStudios(orgList);
        setLicense(lic);
      } else {
        if (user?.organizationId) {
          setStudios([{ id: user.organizationId, name: user.organizationName || user.organizationId, slug: '', is_default: 1, member_count: null, gallery_count: null }]);
        }
      }
    } catch (e) { setToast(e.message); }
    finally { setLoading(false); }
  }

  function handleNameChange(v) {
    setForm(f => ({ ...f, name: v, slug: slugTouched ? f.slug : slugify(v) }));
  }

  async function handleCreate(e) {
    e.preventDefault();
    try {
      const studio = await api.createPlatformOrganization(form);
      setStudios(ss => [...ss, studio]);
      setCreating(false);
      setForm({ name: '', slug: '', plan: 'free', ownerEmail: '' });
      setSlugTouched(false);
      if (studio.inviteToken) {
        const base = window.location.origin;
        setInviteLink(`${base}/admin/invite/${studio.inviteToken}`);
      }
      setToast(t('studios_toast_created'));
    } catch (err) {
      if (err.data?.error === 'organization_limit_reached' || err.message?.includes('organization_limit_reached')) {
        setCreating(false);
        setToast(t('license_org_limit_toast'));
      } else {
        setToast(err.message);
      }
    }
  }

  const orgLimitReached = isSuperadmin && license && (() => {
    const explicitLimit = license.limits?.organization_limit;
    const limit = explicitLimit != null
      ? explicitLimit
      : license.features?.includes('multi_organization') ? Infinity : 1;
    return limit !== Infinity && studios.length >= limit;
  })();

  async function handleEnter(orgId) {
    setSwitching(orgId);
    try {
      if (isSuperadmin) {
        await api.switchOrganization(orgId);
        const me = await api.me();
        setUser(me);
      }
      navigate('/studio');
    } catch (e) { setToast(e.message); }
    finally { setSwitching(null); }
  }

  async function handleDelete(id) {
    if (!confirm(t('studios_confirm_delete'))) return;
    try {
      await api.deletePlatformOrganization(id);
      setStudios(ss => ss.filter(s => s.id !== id));
      setToast(t('studios_toast_deleted'));
    } catch (e) { setToast(e.message); }
  }

  return (
    <>
      {/* Content Header */}
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2 align-items-center">
            <div className="col-sm-6">
              <h1 className="m-0">{t('studios_title')}</h1>
            </div>
            <div className="col-sm-6 text-sm-end">
              {isSuperadmin && (
                <button
                  className="btn btn-primary"
                  disabled={orgLimitReached}
                  title={orgLimitReached ? t('license_org_limit_tooltip') : undefined}
                  onClick={() => !orgLimitReached && setCreating(v => !v)}
                >
                  <i className="fas fa-plus me-1" />{t('studios_new')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">

          {/* Org limit banner */}
          {orgLimitReached && (
            <div className="alert alert-warning d-flex align-items-center">
              <i className="fas fa-exclamation-triangle me-2" />
              <div>
                <strong>{t('license_org_limit_title')}</strong>{' '}
                {t('license_org_limit_body')}{' '}
                <Link to="/settings#license">{t('license_upgrade_link')}</Link>
              </div>
            </div>
          )}

          {/* Create form */}
          {creating && (
            <div className="card card-primary card-outline mb-4">
              <div className="card-header">
                <h3 className="card-title">{t('studios_new')}</h3>
                <div className="card-tools">
                  <button className="btn btn-tool" onClick={() => setCreating(false)}>
                    <i className="fas fa-times" />
                  </button>
                </div>
              </div>
              <div className="card-body">
                <form onSubmit={handleCreate}>
                  <div className="row mb-3">
                    <div className="col">
                      <input
                        className="form-control"
                        placeholder={t('studios_name_placeholder')}
                        value={form.name}
                        onChange={e => handleNameChange(e.target.value)}
                        required autoFocus
                      />
                    </div>
                    <div className="col-auto">
                      <input
                        className="form-control font-monospace"
                        style={{ fontFamily: 'monospace', maxWidth: 180 }}
                        placeholder="slug"
                        value={form.slug}
                        onChange={e => { setSlugTouched(true); setForm(f => ({ ...f, slug: e.target.value })); }}
                        required
                      />
                    </div>
                    <div className="col-auto">
                      <select className="form-control" value={form.plan} onChange={e => setForm(f => ({ ...f, plan: e.target.value }))}>
                        {['free','pro','agency'].map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="row mb-3">
                    <div className="col">
                      <input
                        className="form-control"
                        type="email"
                        placeholder={t('studios_owner_email_placeholder')}
                        value={form.ownerEmail}
                        onChange={e => setForm(f => ({ ...f, ownerEmail: e.target.value }))}
                      />
                    </div>
                    {form.ownerEmail && (
                      <div className="col-auto d-flex align-items-center">
                        <small className="text-muted">{t('studios_owner_invite_hint')}</small>
                      </div>
                    )}
                  </div>
                  <div className="d-flex gap-2">
                    <button className="btn btn-primary me-2" type="submit">{t('studios_create_btn')}</button>
                    <button className="btn btn-secondary" type="button" onClick={() => setCreating(false)}>{t('cancel')}</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Invite link banner */}
          {inviteLink && (
            <div className="alert alert-success d-flex align-items-center">
              <i className="fas fa-link me-2" />
              <span className="flex-grow-1" style={{ wordBreak: 'break-all', fontSize: '0.85rem' }}>{inviteLink}</span>
              <button className="btn btn-sm btn-outline-success ms-2"
                onClick={() => { navigator.clipboard.writeText(inviteLink); setToast(t('access_copied')); }}>
                {t('team_invite_link_copy')}
              </button>
              <button className="btn btn-sm btn-link text-secondary ms-1" onClick={() => setInviteLink('')}>
                <i className="fas fa-times" />
              </button>
            </div>
          )}

          {/* Studios list */}
          {loading ? (
            <div className="text-center text-muted py-5">
              <i className="fas fa-spinner fa-spin fa-2x mb-2 d-block" />
              {t('loading')}
            </div>
          ) : studios.length === 0 ? (
            <div className="text-center py-5">
              <p className="text-muted">{t('studios_empty')}</p>
              {isSuperadmin && (
                <button className="btn btn-primary" onClick={() => setCreating(true)}>
                  <i className="fas fa-plus me-1" />{t('studios_new')}
                </button>
              )}
            </div>
          ) : (
            <div className="row">
              {studios.map(studio => (
                <div key={studio.id} className="col-md-6 col-lg-4">
                  <div className="card">
                    <div className="card-body">
                      <div className="d-flex align-items-start justify-content-between">
                        <div>
                          <h5 className="card-title mb-1">
                            {studio.name}
                            {studio.is_default === 1 && (
                              <span className="badge bg-secondary ms-2" style={{ fontSize: '0.65rem' }}>
                                {t('studios_default_badge')}
                              </span>
                            )}
                          </h5>
                          {isSuperadmin && (
                            <div className="d-flex flex-wrap gap-1 mt-1">
                              <span className={`badge ${PLAN_BADGE[studio.plan] || 'g-secondary'}`}>
                                {studio.plan}
                              </span>
                              {studio.member_count != null && (
                                <span className="badge bg-light text-muted">
                                  {studio.member_count} {t('studios_members_label')}
                                </span>
                              )}
                              {studio.gallery_count != null && (
                                <span className="badge bg-light text-muted">
                                  {studio.gallery_count} {t('studios_galleries_label')}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="card-footer d-flex gap-2">
                      <button
                        className="btn btn-dark btn-sm"
                        onClick={() => handleEnter(studio.id)}
                        disabled={switching === studio.id}
                      >
                        {switching === studio.id
                          ? <><i className="fas fa-spinner fa-spin me-1" />…</>
                          : <><i className="fas fa-sign-in-alt me-1" />{t('studios_enter_btn')}</>
                        }
                      </button>
                      {isSuperadmin && !studio.is_default && (
                        <button className="btn btn-outline-danger btn-sm" onClick={() => handleDelete(studio.id)}>
                          {t('delete')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </section>
      <Toast message={toast} onDone={() => setToast('')} />
    </>
  );
}
