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
import { AdminPage, AdminCard, AdminBadge } from '../../../components/ui/index.js';

export default function ProjectDeliveryPage() {
  const t = useT();
  const { projectId } = useParams();
  const [project,     setProject]     = useState(null);
  const [orgDefaults, setOrgDefaults] = useState(null);

  useEffect(() => {
    Promise.all([api.getProject(projectId), api.getSettings()])
      .then(([p, s]) => { setProject(p); setOrgDefaults(s); })
      .catch(() => {});
  }, [projectId]);

  const orgId = project?.organizationId;

  return (
    <AdminPage title={t('proj_delivery_title')} maxWidth="100%">
      <div className="row">
        <div className="col-lg-7">

          <AdminCard title={t('proj_delivery_defaults_title')}>
            <p className="text-muted mb-3" style={{ fontSize: '0.875rem' }}>
              {t('proj_delivery_defaults_desc')}
            </p>
            {orgDefaults ? (
              <table className="table table-sm mb-3" style={{ fontSize: '0.875rem' }}>
                <tbody>
                  <tr>
                    <th className="text-muted fw-normal" style={{ width: 220 }}>{t('allow_photo_download')}</th>
                    <td>
                      <AdminBadge color={orgDefaults.defaultAllowDownloadImage !== false ? 'success' : 'secondary'}>
                        {orgDefaults.defaultAllowDownloadImage !== false ? t('status_allowed') : t('status_disabled_val')}
                      </AdminBadge>
                    </td>
                  </tr>
                  <tr>
                    <th className="text-muted fw-normal">{t('allow_zip_download')}</th>
                    <td>
                      <AdminBadge color={orgDefaults.defaultAllowDownloadGallery ? 'success' : 'secondary'}>
                        {orgDefaults.defaultAllowDownloadGallery ? t('status_allowed') : t('status_disabled_val')}
                      </AdminBadge>
                    </td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <div className="text-muted mb-3" style={{ fontSize: '0.875rem' }}>—</div>
            )}
            {orgId && (
              <Link to={`/admin/organizations/${orgId}/access`} className="btn btn-sm btn-outline-secondary">
                {t('proj_delivery_edit_org_defaults')} <i className="fas fa-arrow-right ms-1" />
              </Link>
            )}
          </AdminCard>

          <AdminCard title={t('proj_delivery_gallery_overrides_title')}>
            <p className="text-muted mb-3" style={{ fontSize: '0.875rem' }}>
              {t('proj_delivery_gallery_overrides_desc')}
            </p>
            <Link to={`/admin/projects/${projectId}/galleries`} className="btn btn-sm btn-outline-secondary">
              {t('proj_access_manage_galleries')} <i className="fas fa-arrow-right ms-1" />
            </Link>
          </AdminCard>

        </div>
      </div>
    </AdminPage>
  );
}
