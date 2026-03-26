// Copyright (c) 2026 Philippe Vollenweider
//
// This file is part of the GalleryPack commercial platform.
// This source code is proprietary and confidential.
// Use, reproduction, or distribution requires a valid commercial license.
// Unauthorized use is strictly prohibited.

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useT } from '../lib/I18nContext.jsx';

const FEATURE_LABELS = {
  multi_organization: 'Multiple organizations',
  custom_domain:      'Custom domain',
  white_label:        'White-label branding',
  api_access:         'API access',
};

const LIMIT_LABELS = {
  organization_limit: 'Organizations',
  gallery_limit:      'Galleries per organization',
  storage_gb:         'Storage (GB)',
  collaborator_limit: 'Collaborators per organization',
};

export default function LicensePage() {
  const t = useT();
  const [info, setInfo] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getPlatformLicense()
      .then(setInfo)
      .catch(e => setError(e.message));
  }, []);

  if (error) return <div style={s.page}><p style={{ color: '#c00', padding: '2rem' }}>{error}</p></div>;
  if (!info)  return <div style={s.page}><p style={s.dim}>Loading…</p></div>;

  const isLicensed = info.source === 'license';
  const isExpired  = info.source === 'expired';
  const isFree     = !isLicensed && !isExpired;

  return (
    <div style={s.page}>
      <div style={s.header}>
        <Link to="/" style={s.back}>← {t('back')}</Link>
        <h1 style={s.title}>{t('license_page_title')}</h1>
      </div>

      <div style={s.card}>
        {/* Status badge */}
        <div style={{ ...s.statusBadge, ...(isLicensed ? s.badgeValid : isExpired ? s.badgeExpired : s.badgeFree) }}>
          {isLicensed ? t('license_status_valid') : isExpired ? t('license_status_expired') : t('license_status_free')}
        </div>

        {/* Free-tier notice */}
        {(isFree || isExpired) && (
          <div style={s.freeNotice}>
            <p style={{ margin: 0, fontWeight: 600 }}>
              {isExpired ? t('license_expired_heading') : t('license_free_heading')}
            </p>
            <p style={{ margin: '0.4rem 0 0', fontSize: '0.875rem', color: '#555' }}>
              {t('license_free_body')}
            </p>
            {info.error && <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: '#c00' }}>{info.error}</p>}
          </div>
        )}

        {/* Licensee */}
        {info.licensee && (
          <div style={s.section}>
            <h2 style={s.sectionTitle}>{t('license_licensee')}</h2>
            <div style={s.row}><span style={s.label}>{t('license_name')}</span><span>{info.licensee.name}</span></div>
            <div style={s.row}><span style={s.label}>{t('license_email')}</span><span>{info.licensee.email}</span></div>
          </div>
        )}

        {/* Dates */}
        {(info.issued_at || info.expires_at !== undefined) && (
          <div style={s.section}>
            <h2 style={s.sectionTitle}>{t('license_validity')}</h2>
            {info.issued_at && (
              <div style={s.row}>
                <span style={s.label}>{t('license_issued_at')}</span>
                <span>{new Date(info.issued_at).toLocaleDateString()}</span>
              </div>
            )}
            <div style={s.row}>
              <span style={s.label}>{t('license_expires_at')}</span>
              <span>{info.expires_at ? new Date(info.expires_at).toLocaleDateString() : t('license_never')}</span>
            </div>
          </div>
        )}

        {/* Features */}
        <div style={s.section}>
          <h2 style={s.sectionTitle}>{t('license_features')}</h2>
          {(info.features?.length ?? 0) === 0 ? (
            <p style={s.dim}>{t('license_no_features')}</p>
          ) : (
            <div style={s.chips}>
              {info.features.map(f => (
                <span key={f} style={s.chip}>{FEATURE_LABELS[f] ?? f}</span>
              ))}
            </div>
          )}
        </div>

        {/* Limits */}
        <div style={s.section}>
          <h2 style={s.sectionTitle}>{t('license_limits')}</h2>
          {Object.keys(info.limits ?? {}).length === 0 ? (
            <p style={s.dim}>{t('license_no_limits')}</p>
          ) : (
            <table style={s.table}>
              <tbody>
                {Object.entries(info.limits).map(([k, v]) => (
                  <tr key={k}>
                    <td style={s.tdLabel}>{LIMIT_LABELS[k] ?? k}</td>
                    <td style={s.tdValue}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Install instructions (free/expired mode) */}
        {(isFree || isExpired) && (
          <div style={s.instructions}>
            <h2 style={s.sectionTitle}>{t('license_install_title')}</h2>
            <ol style={{ margin: 0, paddingLeft: '1.25rem', lineHeight: 1.8, fontSize: '0.875rem', color: '#444' }}>
              <li>{t('license_install_step1')}</li>
              <li>{t('license_install_step2')}</li>
              <li>{t('license_install_step3')}</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  page:         { maxWidth: 680, margin: '0 auto', padding: '2rem 1.5rem' },
  header:       { display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' },
  back:         { color: '#888', textDecoration: 'none', fontSize: '0.875rem' },
  title:        { margin: 0, fontSize: '1.3rem', fontWeight: 700 },
  card:         { background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' },
  statusBadge:  { alignSelf: 'flex-start', padding: '0.3rem 0.9rem', borderRadius: 99, fontWeight: 700, fontSize: '0.8rem', letterSpacing: '0.02em' },
  badgeValid:   { background: '#dcfce7', color: '#166534' },
  badgeExpired: { background: '#fef9c3', color: '#713f12' },
  badgeFree:    { background: '#f3f4f6', color: '#374151' },
  freeNotice:   { background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '0.875rem 1rem' },
  section:      { borderTop: '1px solid #f0f0f0', paddingTop: '1rem' },
  sectionTitle: { margin: '0 0 0.6rem', fontSize: '0.875rem', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.04em' },
  row:          { display: 'flex', gap: '0.75rem', marginBottom: '0.3rem', fontSize: '0.9rem' },
  label:        { color: '#888', minWidth: 120 },
  chips:        { display: 'flex', flexWrap: 'wrap', gap: '0.4rem' },
  chip:         { background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', borderRadius: 99, padding: '0.2rem 0.7rem', fontSize: '0.8rem', fontWeight: 500 },
  table:        { width: '100%', borderCollapse: 'collapse' },
  tdLabel:      { padding: '0.25rem 0', fontSize: '0.875rem', color: '#555', width: '60%' },
  tdValue:      { padding: '0.25rem 0', fontSize: '0.875rem', fontWeight: 600, fontVariantNumeric: 'tabular-nums' },
  instructions: { borderTop: '1px solid #f0f0f0', paddingTop: '1rem' },
  dim:          { margin: 0, fontSize: '0.875rem', color: '#aaa' },
};
