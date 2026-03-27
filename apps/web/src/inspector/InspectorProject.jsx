// Copyright (c) 2026 Philippe Vollenweider
//
// This file is part of the GalleryPack commercial platform.
// This source code is proprietary and confidential.
// Use, reproduction, or distribution requires a valid commercial license.
// Unauthorized use is strictly prohibited.

// apps/web/src/inspector/InspectorProject.jsx — project list (stub) + detail (Sprint 19)
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useT } from '../lib/I18nContext.jsx';

const STATUS_COLOR = { published: '#4ade80', ready: '#fbbf24', draft: '#555' };

export function InspectorProjectList() {
  const t = useT();
  return (
    <>
      <div className="content-header" style={s.header}>
        <div className="container-fluid">
          <div className="row mb-2 align-items-center">
            <div className="col-sm-6">
              <h1 className="m-0" style={s.pageTitle}>{t('inspector_projects_title')}</h1>
            </div>
          </div>
        </div>
      </div>
      <section className="content">
        <div className="container-fluid pt-3">
          <div className="callout callout-info" style={{ background: '#1a1a2e', borderLeftColor: '#60a5fa' }}>
            <p className="m-0" style={{ color: '#aaa', fontSize: '0.875rem' }}>
              {t('inspector_projects_hint')}
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

export function InspectorProjectDetail() {
  const t = useT();
  const { id } = useParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.inspectorProject(id).then(setData).catch(() => {});
  }, [id]);

  return (
    <>
      <div className="content-header" style={s.header}>
        <div className="container-fluid">
          <div className="row mb-2 align-items-center">
            <div className="col-sm-6">
              <h1 className="m-0" style={s.pageTitle}>{data?.name || '…'}</h1>
              {data && <p className="m-0" style={{ color: '#555', fontSize: '0.8rem' }}>{data.slug}</p>}
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid pt-3">
          {!data ? (
            <p style={{ color: '#555' }}>{t('loading')}</p>
          ) : (
            <div className="card" style={s.card}>
              <div className="card-header" style={s.cardHeader}>
                <h3 className="card-title" style={s.cardTitle}>{t('inspector_nav_galleries')} — {data.galleries?.length}</h3>
              </div>
              <div className="card-body p-0">
                <table className="table table-sm mb-0" style={{ background: 'transparent' }}>
                  <thead>
                    <tr>
                      <th style={s.th}>{t('inspector_th_title')}</th>
                      <th style={s.th}>{t('inspector_th_slug')}</th>
                      <th style={s.th} className="text-center">{t('inspector_th_status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.galleries?.map(g => (
                      <tr key={g.id}>
                        <td style={s.td}>
                          <Link to={`/inspector/galleries/${g.id}`} style={s.link}>{g.title || g.slug}</Link>
                          {!g.active && <span className="badge bg-danger ms-2" style={{ fontSize: '0.65rem' }}>{t('inspector_status_disabled')}</span>}
                        </td>
                        <td style={s.td}><code style={s.code}>{g.slug}</code></td>
                        <td style={{ ...s.td, textAlign: 'center' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: STATUS_COLOR[g.status] || '#666' }}>{g.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

const s = {
  header:    { background: '#0f1117', borderBottom: '1px solid #1e1e2e' },
  pageTitle: { color: '#eee', fontSize: '1.3rem' },
  card:      { background: '#1a1a2e', border: '1px solid #2a2a3e' },
  cardHeader:{ background: '#1a1a2e', borderBottom: '1px solid #2a2a3e' },
  cardTitle: { color: '#eee', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.05em' },
  th:        { background: '#111', color: '#666', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', border: 'none', borderBottom: '1px solid #2a2a3e', padding: '0.5rem 0.75rem' },
  td:        { border: 'none', borderBottom: '1px solid #1e1e2e', padding: '0.5rem 0.75rem', color: '#ccc', fontSize: '0.85rem' },
  link:      { color: '#7dd3fc', textDecoration: 'none' },
  code:      { fontFamily: 'monospace', fontSize: '0.75rem', color: '#666', background: 'none' },
};
