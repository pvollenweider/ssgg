// Copyright (c) 2026 Philippe Vollenweider
//
// This file is part of the GalleryPack commercial platform.
// This source code is proprietary and confidential.
// Use, reproduction, or distribution requires a valid commercial license.
// Unauthorized use is strictly prohibited.

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../../lib/api.js';
import { useT } from '../../../lib/I18nContext.jsx';
import { AdminPage, AdminCard, AdminAlert, AdminButton } from '../../../components/ui/index.js';

export default function ProjectAccessPage() {
  const t = useT();
  const { projectId } = useParams();
  const [project,    setProject]    = useState(null);
  const [orgDefaults, setOrgDefaults] = useState(null);
  const [form,   setForm]   = useState({ visibility: 'public' });
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState('');
  const [error,  setError]  = useState('');

  useEffect(() => {
    Promise.all([api.getProject(projectId), api.getSettings()])
      .then(([p, s]) => {
        setProject(p);
        setOrgDefaults(s);
        setForm({ visibility: p.visibility || 'public' });
      })
      .catch(() => {});
  }, [projectId]);

  async function save(e) {
    e.preventDefault();
    setSaving(true); setSaved(''); setError('');
    try {
      await api.updateProject(projectId, { visibility: form.visibility });
      setSaved(t('access_saved'));
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const orgId = project?.organizationId;

  return (
    <AdminPage title={t('proj_access_title')} maxWidth="100%">
      <div className="row">
        <div className="col-lg-7">
          <form onSubmit={save}>
            <AdminCard title={t('proj_access_visibility_title')}>
              <p className="text-muted mb-3" style={{ fontSize: '0.875rem' }}>
                {t('proj_access_visibility_desc')}
              </p>
              {['public', 'private'].map(v => (
                <div key={v} className="form-check">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="visibility"
                    id={`vis-${v}`}
                    value={v}
                    checked={form.visibility === v}
                    onChange={e => setForm(f => ({ ...f, visibility: e.target.value }))}
                  />
                  <label className="form-check-label" htmlFor={`vis-${v}`}>
                    {v === 'public' ? t('access_public_full') : t('access_private_full')}
                  </label>
                </div>
              ))}
            </AdminCard>

            <AdminAlert variant="success" message={saved} />
            <AdminAlert message={error} />

            <AdminButton type="submit" loading={saving} loadingLabel={t('saving')} className="mb-4">
              {t('save')}
            </AdminButton>
          </form>

          <AdminCard title={t('proj_access_gallery_overrides_title')}>
            <p className="text-muted mb-2" style={{ fontSize: '0.875rem' }}>
              {t('proj_access_gallery_overrides_desc')}
            </p>
            {orgDefaults && (
              <div className="d-flex align-items-center gap-2 mb-2">
                <span className="badge bg-light text-dark border">{t('org_default_label')}</span>
                <span className="text-muted" style={{ fontSize: '0.875rem' }}>{orgDefaults.defaultAccess || 'public'}</span>
              </div>
            )}
            <div className="d-flex gap-2">
              <Link to={`/admin/projects/${projectId}/galleries`} className="btn btn-sm btn-outline-secondary">
                {t('proj_access_manage_galleries')} <i className="fas fa-arrow-right ms-1" />
              </Link>
              {orgId && (
                <Link to={`/admin/organizations/${orgId}/access`} className="btn btn-sm btn-outline-secondary">
                  {t('proj_access_edit_org_defaults')} <i className="fas fa-arrow-right ms-1" />
                </Link>
              )}
            </div>
          </AdminCard>
        </div>
      </div>
    </AdminPage>
  );
}
