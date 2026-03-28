// Copyright (c) 2026 Philippe Vollenweider
//
// This file is part of the GalleryPack commercial platform.
// This source code is proprietary and confidential.
// Use, reproduction, or distribution requires a valid commercial license.
// Unauthorized use is strictly prohibited.

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../../lib/api.js';
import { useT } from '../../../lib/I18nContext.jsx';
import { slugify } from '../../../lib/i18n.js';
import { AdminPage, AdminCard, AdminButton, AdminAlert } from '../../../components/ui/index.js';

export default function GalleryGeneralPage() {
  const t = useT();
  const { galleryId } = useParams();
  const [form,       setForm]       = useState({ title: '', slug: '', author: '', authorEmail: '', locale: 'en', standalone: false });
  const [slugEdited, setSlugEdited] = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState('');
  const [error,      setError]      = useState('');
  const [flushConfirm, setFlushConfirm] = useState(false);
  const [flushing,     setFlushing]     = useState(false);
  const [flushError,   setFlushError]   = useState('');
  const navigate = useNavigate();

  // Delete gallery state
  const [photoCount,   setPhotoCount]   = useState(null);
  const [showDelete,   setShowDelete]   = useState(false);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [deleting,     setDeleting]     = useState(false);
  const [deleteError,  setDeleteError]  = useState('');

  useEffect(() => {
    api.getGallery(galleryId).then(g => {
      setForm({ title: g.title || '', slug: g.slug || '', author: g.author || '', authorEmail: g.authorEmail || '', locale: g.locale || 'en', standalone: !!g.standalone });
      setSlugEdited(true);
    }).catch(() => {});
    api.listPhotos(galleryId).then(photos => setPhotoCount(photos.length)).catch(() => {});
  }, [galleryId]);

  function handleTitleChange(e) {
    const title = e.target.value;
    setForm(f => ({
      ...f,
      title,
      slug: slugEdited ? f.slug : slugify(title),
    }));
  }

  function handleSlugChange(e) {
    setSlugEdited(true);
    setForm(f => ({ ...f, slug: e.target.value }));
  }

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }));
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true); setSaved(''); setError('');
    try {
      await api.updateGallery(galleryId, form);
      setSaved(t('changes_saved'));
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteGallery() {
    if (confirmTitle.trim() !== form.title) return;
    setDeleting(true); setDeleteError('');
    try {
      await api.deleteGallery(galleryId);
      navigate('/admin/galleries');
    } catch (err) {
      setDeleteError(err.message);
      setDeleting(false);
    }
  }

  const canDelete = confirmTitle.trim() === form.title;

  const flushDist = useCallback(async () => {
    setFlushing(true); setFlushError('');
    try {
      await api.flushGalleryDist(galleryId);
      setFlushConfirm(false);
      navigate(0); // reload
    } catch (err) {
      setFlushError(err.message);
    } finally {
      setFlushing(false);
    }
  }, [galleryId, navigate]);

  return (
    <AdminPage title={t('gal_general_title')}>
      <div className="row">
        <div className="col-lg-7">
          <form onSubmit={save}>
            <AdminCard title={t('branding_identity_section')}>
              <div className="mb-3">
                <label className="form-label">{t('field_title')}</label>
                <input className="form-control" value={form.title} onChange={handleTitleChange} required />
              </div>
              <div className="mb-3">
                <label className="form-label">{t('orgs_th_slug')}</label>
                <div className="input-group">
                  <span className="input-group-text text-muted">/</span>
                  <input className="form-control" value={form.slug} onChange={handleSlugChange} required pattern="[-a-z0-9]+" />
                </div>
              </div>
              <div className="mb-0">
                <label className="form-label">{t('field_locale')}</label>
                <input className="form-control" value={form.locale} onChange={set('locale')} placeholder="en" />
              </div>
            </AdminCard>

            <AdminCard title={t('gal_general_photographer_section')}>
              <div className="row">
                <div className="col-sm-6 mb-3">
                  <label className="form-label">{t('orgs_th_name')}</label>
                  <input className="form-control" value={form.author} onChange={set('author')} />
                </div>
                <div className="col-sm-6 mb-3">
                  <label className="form-label">{t('login_email')}</label>
                  <input className="form-control" type="email" value={form.authorEmail} onChange={set('authorEmail')} />
                </div>
              </div>
            </AdminCard>

            <AdminCard title={t('gal_general_build_section')}>
              <div className="form-check form-switch mb-0">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="standalone-toggle"
                  checked={form.standalone}
                  onChange={e => setForm(f => ({ ...f, standalone: e.target.checked }))}
                />
                <label className="form-check-label" htmlFor="standalone-toggle">
                  {t('gal_general_standalone_label')}
                </label>
                <div className="text-muted mt-1" style={{ fontSize: '0.8rem' }}>{t('gal_general_standalone_hint')}</div>
              </div>
            </AdminCard>

            <AdminAlert variant="success" message={saved} />
            <AdminAlert message={error} />
            <AdminButton type="submit" loading={saving} loadingLabel={t('saving')} className="mb-4">
              {t('save')}
            </AdminButton>
          </form>
        </div>
      </div>
          {/* Danger zone */}
      <div className="row mt-4">
        <div className="col-lg-7">
          <h6 className="text-danger fw-bold mb-2" style={{ letterSpacing: '0.04em', textTransform: 'uppercase', fontSize: '0.75rem' }}>
            <i className="fas fa-exclamation-triangle me-1" />{t('gal_general_danger_zone')}
          </h6>
          <div style={{ border: '1px solid #f87171', borderRadius: 8 }}>

            {/* Flush dist */}
            <div className="d-flex align-items-center justify-content-between gap-3 p-3">
              <div>
                <div className="fw-semibold" style={{ fontSize: '0.9rem' }}>{t('gal_general_flush_title')}</div>
                <div className="text-muted" style={{ fontSize: '0.8rem' }}>{t('gal_general_flush_desc')}</div>
              </div>
              <AdminButton variant="outline-danger" size="sm" onClick={() => setFlushConfirm(true)}>
                {t('gal_general_flush_btn')}
              </AdminButton>
            </div>
            {flushError && <div className="px-3 pb-2"><AdminAlert message={flushError} className="mb-0" /></div>}

            {/* Delete gallery */}
            <div style={{ borderTop: '1px solid #fca5a5' }}>
              <div className="d-flex align-items-center justify-content-between gap-3 p-3">
                <div>
                  <div className="fw-semibold" style={{ fontSize: '0.9rem' }}>{t('gal_delete_title')}</div>
                  <div className="text-muted" style={{ fontSize: '0.8rem' }}>{t('gal_delete_desc')}</div>
                </div>
                <AdminButton
                  variant="outline-danger"
                  size="sm"
                  onClick={() => { setShowDelete(v => !v); setConfirmTitle(''); setDeleteError(''); }}
                >
                  {t('gal_delete_btn')}
                </AdminButton>
              </div>

              {showDelete && (
                <div style={{ borderTop: '1px solid #fca5a5', background: '#fff5f5', borderRadius: '0 0 7px 7px', padding: '1rem 1.25rem' }}>
                  {photoCount > 0 && (
                    <div className="mb-3 fw-semibold" style={{ fontSize: '0.82rem', color: '#b91c1c' }}>
                      <i className="fas fa-images me-1" />
                      {t('gal_delete_photos_warning', { n: photoCount })}
                    </div>
                  )}
                  <label className="form-label fw-semibold" style={{ fontSize: '0.82rem' }}>
                    {t('gal_delete_confirm_label', { title: form.title })}
                  </label>
                  <input
                    className="form-control form-control-sm mb-2"
                    style={{ borderColor: '#f87171', maxWidth: 320 }}
                    value={confirmTitle}
                    onChange={e => setConfirmTitle(e.target.value)}
                    placeholder={form.title}
                    autoFocus
                  />
                  {deleteError && <div className="text-danger small mb-2">{deleteError}</div>}
                  <div className="d-flex gap-2">
                    <AdminButton
                      variant="danger"
                      size="sm"
                      disabled={!canDelete}
                      loading={deleting}
                      loadingLabel={t('gal_deleting')}
                      onClick={deleteGallery}
                    >
                      <i className="fas fa-trash me-1" />{t('gal_delete_confirm_btn')}
                    </AdminButton>
                    <AdminButton variant="outline-secondary" size="sm" onClick={() => setShowDelete(false)} disabled={deleting}>
                      {t('cancel')}
                    </AdminButton>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Flush confirmation modal */}
      {flushConfirm && (
        <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.5)', position: 'fixed', inset: 0, zIndex: 1055 }} onClick={() => !flushing && setFlushConfirm(false)}>
          <div className="modal-dialog modal-dialog-centered" onClick={e => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header border-0">
                <h5 className="modal-title">{t('gal_general_flush_confirm_title')}</h5>
              </div>
              <div className="modal-body">
                <p>{t('gal_general_flush_warning', { title: form.title })}</p>
              </div>
              <div className="modal-footer border-0">
                <AdminButton variant="secondary" onClick={() => setFlushConfirm(false)} disabled={flushing}>{t('cancel')}</AdminButton>
                <AdminButton variant="danger" loading={flushing} loadingLabel={t('gal_general_flushing')} onClick={flushDist}>
                  {t('gal_general_flush_title')}
                </AdminButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminPage>
  );
}
