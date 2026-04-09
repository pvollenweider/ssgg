// Copyright (c) 2026 Philippe Vollenweider
//
// This file is part of the GalleryPack commercial platform.
// This source code is proprietary and confidential.
// Use, reproduction, or distribution requires a valid commercial license.
// Unauthorized use is strictly prohibited.

import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import MDEditor from '@uiw/react-md-editor';
import { api } from '../../../lib/api.js';
import { useT, useLocale } from '../../../lib/I18nContext.jsx';
import { useAuth } from '../../../lib/auth.jsx';
import { AdminPage, AdminCard, AdminInput, AdminAlert, AdminToast, AdminButton } from '../../../components/ui/index.js';

const LOCALE_CODES = ['en', 'fr', 'de', 'es', 'it', 'pt', 'nl', 'ja'];

function getLocaleOptions(uiLocale) {
  try {
    const dn = new Intl.DisplayNames([uiLocale], { type: 'language' });
    return LOCALE_CODES.map(code => ({ value: code, label: dn.of(code) || code }));
  } catch {
    return LOCALE_CODES.map(code => ({ value: code, label: code }));
  }
}

export default function OrganizationGeneralPage() {
  const t = useT();
  const { locale } = useLocale();
  const { orgId } = useParams();
  const { user } = useAuth();
  const LOCALES = useMemo(() => getLocaleOptions(locale), [locale]);

  const canManage = ['admin', 'owner'].includes(user?.organizationRole) || user?.platformRole === 'superadmin';

  const [identity,    setIdentity]    = useState({ name: '', slug: '', description: '', locale: 'en', country: '', hostname: '' });
  const [identityErr, setIdentityErr] = useState('');
  const [defaults,    setDefaults]    = useState({ defaultAccess: 'public', defaultDownloadMode: 'display', defaultPwa: false, defaultPwaThemeColor: '#000000', defaultPwaBgColor: '#000000' });
  const [defaultsErr, setDefaultsErr] = useState('');
  const [toast,       setToast]       = useState('');

  // Ref so blur handlers always read the latest state, avoiding stale-closure saves
  const identityRef = useRef(identity);
  identityRef.current = identity;

  useEffect(() => {
    api.getOrganization(orgId).then(org => {
      setIdentity({ name: org.name || '', slug: org.slug || '', description: org.description || '', locale: org.locale || 'en', country: org.country || '', hostname: org.hostname || '' });
    }).catch(() => {});
    api.getSettings().then(s => {
      setDefaults({
        defaultAccess:        s?.defaultAccess        || 'public',
        defaultDownloadMode:  s?.defaultDownloadMode  || 'display',
        defaultPwa:           !!s?.defaultPwa,
        defaultPwaThemeColor: s?.defaultPwaThemeColor || '#000000',
        defaultPwaBgColor:    s?.defaultPwaBgColor    || '#000000',
      });
    }).catch(() => {});
  }, [orgId]);

  async function saveIdentity(patch) {
    if (!patch.name) return; // never save with an empty name
    setIdentityErr('');
    try {
      await api.updateOrganization(orgId, patch);
      setToast(t('changes_saved'));
    } catch (err) { setIdentityErr(err.message); }
  }

  async function saveDefaults(patch) {
    setDefaultsErr('');
    try {
      await api.saveSettings(patch);
      setToast(t('changes_saved'));
    } catch (err) { setDefaultsErr(err.message); }
  }

  // Always reads from ref to avoid stale closures
  function handleBlur() {
    saveIdentity(identityRef.current);
  }

  function setId(field) {
    return e => setIdentity(f => ({ ...f, [field]: e.target.value }));
  }

  function setDef(field) {
    return e => {
      const val = e.target.value;
      const next = { ...defaults, [field]: val };
      setDefaults(next);
      saveDefaults(next);
    };
  }

  function setDefBool(field) {
    return e => {
      const next = { ...defaults, [field]: e.target.checked };
      setDefaults(next);
      saveDefaults(next);
    };
  }

  function setDefColor(field) {
    return e => {
      const next = { ...defaults, [field]: e.target.value };
      setDefaults(next);
    };
  }

  function saveDefColor(field) {
    return () => saveDefaults({ ...defaults, [field]: defaults[field] });
  }

  if (!canManage) return <Navigate to={`/admin/organizations/${orgId}`} replace />;

  return (
    <AdminPage title={identity.name ? t('org_settings_title', { name: identity.name }) : '…'} maxWidth="100%">
      <AdminToast message={toast} onDone={() => setToast('')} />

      <div className="row">
        <div className="col-lg-7">

          {/* Identity */}
          <AdminCard title={t('branding_identity_section')}>
            <AdminInput label={t('orgs_th_name')} value={identity.name}
              onChange={setId('name')} onBlur={handleBlur} required />
            <AdminInput
              label={t('orgs_th_slug')} prefix="/" value={identity.slug}
              onChange={setId('slug')} onBlur={handleBlur}
              pattern="[-a-z0-9]+" title={t('orgs_slug_hint')} required hint={t('org_slug_hint')}
            />
          </AdminCard>
          <AdminAlert message={identityErr} />

          <AdminCard title={t('field_description')}>
            <MDEditor
              value={identity.description}
              onChange={val => setIdentity(f => ({ ...f, description: val ?? '' }))}
              preview="edit"
              height={200}
            />
            <div className="d-flex justify-content-end mt-2">
              <AdminButton size="sm" onClick={() => saveIdentity(identityRef.current)}>{t('save')}</AdminButton>
            </div>
          </AdminCard>

          <AdminCard title={t('org_locale_label')}>
            <div className="row">
              <div className="col-sm-6 mb-3">
                <label className="form-label">{t('field_language')}</label>
                <select className="form-select" value={identity.locale}
                  onChange={e => {
                    const next = { ...identityRef.current, locale: e.target.value };
                    setIdentity(next);
                    saveIdentity(next);
                  }}>
                  {LOCALES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>
              <div className="col-sm-6 mb-3">
                <AdminInput
                  label={t('org_country_label')} value={identity.country}
                  onChange={setId('country')} onBlur={handleBlur}
                  placeholder={t('org_country_placeholder')} maxLength={2}
                  style={{ textTransform: 'uppercase' }} hint={t('org_country_hint')} className="mb-0"
                />
              </div>
            </div>
          </AdminCard>

          {/* Hostname */}
          <AdminCard title={t('field_hostname')}>
            <p className="text-muted mb-3" style={{ fontSize: '0.875rem' }}>{t('field_hostname_hint')}</p>
            <AdminInput
              label={t('field_hostname')}
              value={identity.hostname}
              onChange={setId('hostname')}
              onBlur={handleBlur}
              placeholder={`${identity.slug || 'my-org'}.gallerypack.app`}
              style={{ fontFamily: 'monospace' }}
            />
          </AdminCard>

          {/* Gallery Defaults */}
          <AdminCard title={t('org_defaults_title')}>
            <p className="text-muted mb-4" style={{ fontSize: '0.875rem' }}>{t('org_defaults_hint')}</p>

            <h6 className="fw-semibold mb-3" style={{ fontSize: '0.85rem' }}>{t('org_defaults_access_section')}</h6>
            <div className="row mb-0">
              <div className="col-sm-6 mb-3">
                <label className="form-label">{t('org_defaults_access_label')}</label>
                <select className="form-select" value={defaults.defaultAccess} onChange={setDef('defaultAccess')}>
                  <option value="public">{t('access_public')}</option>
                  <option value="private">{t('access_private')}</option>
                  <option value="password">{t('access_password_full')}</option>
                </select>
              </div>
              <div className="col-sm-6 mb-3">
                <label className="form-label">{t('download_mode_label')}</label>
                <select className="form-select" value={defaults.defaultDownloadMode} onChange={setDef('defaultDownloadMode')}>
                  <option value="none">{t('download_mode_none')}</option>
                  <option value="display">{t('download_mode_display')}</option>
                  <option value="original">{t('download_mode_original')}</option>
                </select>
              </div>
            </div>
            <h6 className="fw-semibold mt-3 mb-3" style={{ fontSize: '0.85rem' }}>{t('field_pwa')}</h6>
            <div className="row mb-0">
              <div className="col-sm-12 mb-3">
                <div className="form-check form-switch mb-1">
                  <input type="checkbox" className="form-check-input" id="orgDefPwa"
                    checked={defaults.defaultPwa} onChange={setDefBool('defaultPwa')} />
                  <label className="form-check-label" htmlFor="orgDefPwa">{t('field_pwa_hint')}</label>
                </div>
                {defaults.defaultPwa && (
                  <div className="d-flex gap-3 mt-2">
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.82rem', color: '#555' }}>
                      {t('field_pwa_theme_color')}
                      <input type="color" value={defaults.defaultPwaThemeColor}
                        onChange={setDefColor('defaultPwaThemeColor')}
                        onBlur={saveDefColor('defaultPwaThemeColor')}
                        style={{ width: 48, height: 32, border: 'none', cursor: 'pointer' }} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.82rem', color: '#555' }}>
                      {t('field_pwa_bg_color')}
                      <input type="color" value={defaults.defaultPwaBgColor}
                        onChange={setDefColor('defaultPwaBgColor')}
                        onBlur={saveDefColor('defaultPwaBgColor')}
                        style={{ width: 48, height: 32, border: 'none', cursor: 'pointer' }} />
                    </label>
                  </div>
                )}
              </div>
            </div>
          </AdminCard>
          <AdminAlert message={defaultsErr} />

        </div>
      </div>
    </AdminPage>
  );
}
