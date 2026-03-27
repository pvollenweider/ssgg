// Copyright (c) 2026 Philippe Vollenweider
//
// This file is part of the GalleryPack commercial platform.
// This source code is proprietary and confidential.
// Use, reproduction, or distribution requires a valid commercial license.
// Unauthorized use is strictly prohibited.

// apps/web/src/inspector/InspectorAnomalies.jsx — anomaly list (Sprint 21)
import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useT } from '../lib/I18nContext.jsx';

const SEV_COLOR = { error: '#f87171', warning: '#fbbf24', info: '#60a5fa' };
const SEV_BADGE = { error: 'danger', warning: 'warning', info: 'info' };

const TYPES = ['build_failed', 'inbox_not_empty', 'stale_draft', 'never_built'];

export default function InspectorAnomalies() {
  const t = useT();
  const [params, setParams] = useSearchParams();
  const [items,  setItems]  = useState(null);
  const [total,  setTotal]  = useState(0);
  const type = params.get('type') || '';

  const TYPE_LABELS = {
    build_failed:     t('inspector_anomaly_build_failed'),
    inbox_not_empty:  t('inspector_anomaly_inbox_not_empty'),
    stale_draft:      t('inspector_anomaly_stale_draft'),
    never_built:      t('inspector_anomaly_never_built'),
  };

  useEffect(() => {
    const p = {};
    if (type) p.type = type;
    api.inspectorAnomalies(p)
      .then(r => { setItems(r.items); setTotal(r.total); })
      .catch(() => setItems([]));
  }, [type]);

  return (
    <>
      <div className="content-header" style={s.header}>
        <div className="container-fluid">
          <div className="row mb-2 align-items-center">
            <div className="col-sm-6">
              <h1 className="m-0" style={s.pageTitle}>
                {t('inspector_anomalies_title')} {total > 0 && <span className="badge bg-danger ms-2">{total}</span>}
              </h1>
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid pt-3">

          {/* Filter bar */}
          <div className="btn-group mb-3 flex-wrap" role="group">
            <button
              className={`btn btn-sm ${type === '' ? 'btn-secondary' : 'btn-outline-secondary'}`}
              style={type === '' ? s.filterActive : s.filterBtn}
              onClick={() => setParams({})}
            >
              {t('inspector_anomalies_all')}
            </button>
            {TYPES.map(tp => (
              <button
                key={tp}
                className={`btn btn-sm ${type === tp ? 'btn-secondary' : 'btn-outline-secondary'}`}
                style={type === tp ? s.filterActive : s.filterBtn}
                onClick={() => setParams({ type: tp })}
              >
                {TYPE_LABELS[tp]}
              </button>
            ))}
          </div>

          {!items && <p style={{ color: '#555' }}>{t('loading')}</p>}
          {items?.length === 0 && (
            <div className="callout callout-success" style={{ background: '#1a2e1a', borderLeftColor: '#4ade80' }}>
              <p className="m-0" style={{ color: '#4ade80', fontSize: '0.875rem' }}>
                <i className="fas fa-check-circle me-1" /> {t('inspector_anomalies_none')}
              </p>
            </div>
          )}

          {items?.map((item, i) => (
            <div key={i} className="callout" style={{
              background: '#1a1a2e',
              borderLeftColor: SEV_COLOR[item.severity] || '#333',
              padding: '0.6rem 0.75rem',
              marginBottom: '0.4rem',
            }}>
              <div className="d-flex align-items-center" style={{ gap: '0.75rem' }}>
                <div style={{ flex: 1 }}>
                  <span className={`badge bg-${SEV_BADGE[item.severity] || 'secondary'} me-1`} style={{ fontSize: '0.65rem' }}>
                    {item.severity}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#666', marginRight: '0.5rem' }}>
                    {TYPE_LABELS[item.type] || item.type}
                  </span>
                  <span style={{ fontSize: '0.85rem', color: '#ccc' }}>{item.target_label}</span>
                </div>
                <span style={{ fontSize: '0.75rem', color: '#555', whiteSpace: 'nowrap' }}>
                  {item.detected_at ? new Date(item.detected_at).toLocaleDateString() : ''}
                </span>
                {item.target_type === 'gallery' && (
                  <Link to={`/inspector/galleries/${item.target_id}`} style={{ color: '#7dd3fc', textDecoration: 'none', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                    {t('inspector_view')}
                  </Link>
                )}
              </div>
            </div>
          ))}

        </div>
      </section>
    </>
  );
}

const s = {
  header:      { background: '#0f1117', borderBottom: '1px solid #1e1e2e' },
  pageTitle:   { color: '#eee', fontSize: '1.3rem' },
  link:        { color: '#7dd3fc', textDecoration: 'none' },
  filterBtn:   { background: 'none', border: '1px solid #2a2a3e', color: '#888', fontSize: '0.78rem' },
  filterActive:{ background: '#1e1e2e', border: '1px solid #3a3a4e', color: '#eee', fontSize: '0.78rem' },
};
