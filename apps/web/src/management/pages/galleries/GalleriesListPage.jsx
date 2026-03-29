// Copyright (c) 2026 Philippe Vollenweider
//
// This file is part of the GalleryPack commercial platform.
// This source code is proprietary and confidential.
// Use, reproduction, or distribution requires a valid commercial license.
// Unauthorized use is strictly prohibited.

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../../lib/api.js';
import { useT } from '../../../lib/I18nContext.jsx';
import { slugify } from '../../../lib/i18n.js';
import { AdminPage, AdminCard, AdminInput, AdminAlert, AdminButton, AdminBadge, AdminLoader, AdminEmptyState } from '../../../components/ui/index.js';

const STATUS_BADGE = { done: 'success', error: 'danger', running: 'primary', queued: 'warning' };
const ACCESS_BADGE = { public: 'success', private: 'secondary', password: 'warning' };

export default function GalleriesListPage() {
  const t = useT();
  const navigate = useNavigate();
  const [galleries, setGalleries] = useState([]);
  const [projects,  setProjects]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');

  // Create form
  const [showCreate,  setShowCreate]  = useState(false);
  const [newG,        setNewG]        = useState({ title: '', slug: '', projectId: '' });
  const [slugEdited,  setSlugEdited]  = useState(false);
  const [creating,    setCreating]    = useState(false);
  const [createErr,   setCreateErr]   = useState('');

  function load() {
    setLoading(true);
    Promise.all([api.listGalleries(), api.listProjects()])
      .then(([gals, projs]) => { setGalleries(gals); setProjects(projs); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function handleTitleChange(e) {
    const title = e.target.value;
    setNewG(f => ({ ...f, title, slug: slugEdited ? f.slug : slugify(title) }));
  }

  function handleSlugChange(e) {
    setSlugEdited(true);
    setNewG(f => ({ ...f, slug: e.target.value }));
  }

  function resetForm() {
    setNewG({ title: '', slug: '', projectId: projects[0]?.id ?? '' });
    setSlugEdited(false);
    setCreateErr('');
  }

  function openCreate() {
    resetForm();
    setShowCreate(true);
  }

  async function create(e) {
    e.preventDefault();
    if (!newG.projectId) { setCreateErr(t('gal_create_project_required')); return; }
    setCreating(true); setCreateErr('');
    try {
      const gallery = await api.createProjectGallery(newG.projectId, { title: newG.title, slug: newG.slug });
      resetForm();
      setShowCreate(false);
      navigate(`/admin/galleries/${gallery.id}/photos`);
    } catch (err) {
      setCreateErr(err.message);
    } finally {
      setCreating(false);
    }
  }

  const activeProjects = projects.filter(p => p.status !== 'archived');

  return (
    <AdminPage
      title={t('gal_list_title')}
      maxWidth="100%"
      actions={
        <AdminButton size="sm" icon="fas fa-plus" onClick={openCreate}>
          {t('new_gallery')}
        </AdminButton>
      }
    >
      {showCreate && (
        <AdminCard title={t('new_gallery')} className="mb-3">
          {activeProjects.length === 0 ? (
            <div className="alert alert-warning d-flex align-items-center gap-3 mb-0">
              <i className="fas fa-folder-open fa-lg" />
              <div>
                {t('gal_create_no_projects')}
                {' '}
                <Link to="/admin/projects/new">{t('gal_create_project_link')}</Link>
              </div>
            </div>
          ) : (
            <form onSubmit={create}>
              <div className="row">
                <div className="col-sm-3 mb-3">
                  <label className="form-label">{t('gal_create_project_label')}</label>
                  <select
                    className="form-select"
                    value={newG.projectId}
                    onChange={e => setNewG(f => ({ ...f, projectId: e.target.value }))}
                    required
                  >
                    <option value="">{t('gal_create_project_placeholder')}</option>
                    {activeProjects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="col-sm-4 mb-3">
                  <AdminInput
                    label={t('field_title')}
                    value={newG.title}
                    onChange={handleTitleChange}
                    required
                    autoFocus
                    className="mb-0"
                  />
                </div>
                <div className="col-sm-4 mb-3">
                  <AdminInput
                    label={t('orgs_th_slug')}
                    value={newG.slug}
                    onChange={handleSlugChange}
                    required
                    pattern="[-a-z0-9]+"
                    title={t('orgs_slug_hint')}
                    className="mb-0"
                    hint={!slugEdited && newG.title ? t('slug_auto_hint') : undefined}
                  />
                </div>
              </div>
              <AdminAlert message={createErr} />
              <div className="d-flex gap-2">
                <AdminButton type="submit" size="sm" loading={creating} loadingLabel={t('proj_creating')}>
                  {t('create')}
                </AdminButton>
                <AdminButton variant="outline-secondary" size="sm" type="button" onClick={() => setShowCreate(false)}>
                  {t('cancel')}
                </AdminButton>
              </div>
            </form>
          )}
        </AdminCard>
      )}

      <AdminAlert message={error} />

      <AdminCard noPadding>
        {loading ? (
          <AdminLoader />
        ) : galleries.length === 0 ? (
          <AdminEmptyState
            icon="fas fa-images"
            title={t('gal_list_no_galleries')}
            action={
              <AdminButton size="sm" icon="fas fa-plus" onClick={openCreate}>
                {t('new_gallery')}
              </AdminButton>
            }
          />
        ) : (
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr><th>{t('gal_list_th_gallery')}</th><th>{t('gal_list_th_access')}</th><th>{t('gal_list_th_build')}</th><th></th></tr>
              </thead>
              <tbody>
                {galleries.map(g => (
                  <tr key={g.id}>
                    <td>
                      <Link to={`/admin/galleries/${g.id}`} className="fw-semibold text-body">{g.title || g.slug}</Link>
                      <small className="text-muted d-block"><code>{g.slug}</code></small>
                    </td>
                    <td>
                      <AdminBadge color={ACCESS_BADGE[g.access] || 'secondary'}>{g.access || 'public'}</AdminBadge>
                    </td>
                    <td>
                      {g.buildStatus
                        ? <AdminBadge color={STATUS_BADGE[g.buildStatus] || 'secondary'}>{g.buildStatus}</AdminBadge>
                        : <span className="text-muted" style={{ fontSize: '0.8rem' }}>{t('gal_list_never_built')}</span>
                      }
                    </td>
                    <td className="text-end">
                      <Link to={`/admin/galleries/${g.id}`} className="btn btn-sm btn-outline-secondary">
                        {t('gal_overview_manage')} <i className="fas fa-chevron-right ms-1" aria-hidden="true" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>
    </AdminPage>
  );
}
