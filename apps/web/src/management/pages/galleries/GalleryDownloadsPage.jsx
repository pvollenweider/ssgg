// Copyright (c) 2026 Philippe Vollenweider
//
// This file is part of the GalleryPack commercial platform.
// This source code is proprietary and confidential.
// Use, reproduction, or distribution requires a valid commercial license.
// Unauthorized use is strictly prohibited.

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../../lib/api.js';
import { useT } from '../../../lib/I18nContext.jsx';
import { AdminPage, AdminCard, AdminButton, AdminAlert } from '../../../components/ui/index.js';

export default function GalleryDownloadsPage() {
  const t = useT();
  const { galleryId } = useParams();

  const [gallery,   setGallery]   = useState(null);
  const [form,      setForm]      = useState({ downloadMode: 'display', apacheProtection: false });
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState('');
  const [error,     setError]     = useState('');
  const [stripping, setStripping] = useState(false);
  const [stripResult, setStripResult] = useState(null);
  const [stripError,  setStripError]  = useState('');

  useEffect(() => {
    api.getGallery(galleryId).then(g => {
      setGallery(g);
      setForm({ downloadMode: g.downloadMode || 'display', apacheProtection: !!g.apacheProtection });
    }).catch(() => {});
  }, [galleryId]);

  async function save(e) {
    e.preventDefault();
    setSaving(true); setSaved(''); setError('');
    try {
      await api.updateGallery(galleryId, form);
      setSaved(t('download_saved'));
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const stripOriginals = useCallback(async () => {
    setStripping(true); setStripError(''); setStripResult(null);
    try {
      const r = await api.stripDistOriginals(galleryId);
      setStripResult(r);
    } catch (err) {
      setStripError(err.message);
    } finally {
      setStripping(false);
    }
  }, [galleryId]);

  const downloadsDisabled = form.downloadMode === 'none';
  const showApacheToggle  = gallery?.standalone && gallery?.access === 'password';

  return (
    <AdminPage title={t('gal_downloads_title')}>
      <div className="row">
        <div className="col-lg-6">
          <form onSubmit={save}>
            <AdminCard title={t('gal_downloads_section')}>
              <label className="form-label">{t('download_mode_label')}</label>
              <select
                className="form-select mb-0"
                value={form.downloadMode}
                onChange={e => setForm(f => ({ ...f, downloadMode: e.target.value }))}
              >
                <option value="none">{t('download_mode_none')}</option>
                <option value="display">{t('download_mode_display')}</option>
                <option value="original">{t('download_mode_original')}</option>
              </select>
              <div className="text-muted mt-2" style={{ fontSize: '0.8rem' }}>
                {form.downloadMode === 'none'     && t('download_mode_none_hint')}
                {form.downloadMode === 'display'  && t('download_mode_display_hint')}
                {form.downloadMode === 'original' && t('download_mode_original_hint')}
              </div>
            </AdminCard>

            {showApacheToggle && (
              <AdminCard title={t('gal_downloads_apache_section')}>
                <div className="form-check form-switch mb-0">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="apacheProtection"
                    checked={form.apacheProtection}
                    onChange={e => setForm(f => ({ ...f, apacheProtection: e.target.checked }))}
                  />
                  <label className="form-check-label" htmlFor="apacheProtection">
                    {t('gal_downloads_apache_label')}
                  </label>
                  <div className="text-muted mt-1" style={{ fontSize: '0.8rem' }}>
                    {t('gal_downloads_apache_hint')}
                  </div>
                </div>
              </AdminCard>
            )}

            <AdminAlert variant="success" message={saved} />
            <AdminAlert message={error} />

            {downloadsDisabled && (
              <div className="alert alert-warning d-flex align-items-start gap-3 mt-3" role="alert">
                <i className="fas fa-exclamation-triangle mt-1" />
                <div style={{ flex: 1 }}>
                  <strong>{t('gal_downloads_disabled')}</strong>
                  <div className="mt-1" style={{ fontSize: '0.85rem' }}>
                    {t('gal_downloads_strip_hint')}
                  </div>
                  {stripResult && <div className="mt-1 text-success small">{stripResult.message}</div>}
                  {stripError  && <div className="mt-1 text-danger  small">{stripError}</div>}
                </div>
                <AdminButton variant="outline-warning" size="sm" loading={stripping} loadingLabel={t('gal_downloads_stripping')} onClick={stripOriginals}>
                  {t('gal_downloads_strip_btn')}
                </AdminButton>
              </div>
            )}

            <AdminButton type="submit" loading={saving} loadingLabel={t('saving')} className="mb-4">
              {t('save')}
            </AdminButton>
          </form>
        </div>
      </div>
    </AdminPage>
  );
}
