// Copyright (c) 2026 Philippe Vollenweider
//
// This file is part of the GalleryPack commercial platform.
// This source code is proprietary and confidential.
// Use, reproduction, or distribution requires a valid commercial license.
// Unauthorized use is strictly prohibited.

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../../lib/api.js';
import { useT } from '../../../lib/I18nContext.jsx';
import { AdminPage, AdminCard, AdminButton, AdminAlert } from '../../../components/ui/index.js';

export default function GalleryUploadPage() {
  const t = useT();
  const { galleryId } = useParams();
  const [links,    setLinks]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [creating, setCreating] = useState(false);
  const [label,    setLabel]    = useState('');
  const [error,    setError]    = useState('');
  const [copied,   setCopied]   = useState('');

  // Maintenance
  const [reconciling,   setReconciling]   = useState(false);
  const [reconcileResult, setReconcileResult] = useState(null);
  const [deduping,      setDeduping]      = useState(false);
  const [dupeResult,    setDupeResult]    = useState(null);
  const [dupeConfirm,   setDupeConfirm]   = useState(false);
  const [maintError,    setMaintError]    = useState('');

  // Reanalyze
  const [reanalyzeStatus,  setReanalyzeStatus]  = useState(null); // { total, missingThumbs, missingExif }
  const [reanalyzing,      setReanalyzing]      = useState(false);
  const [reanalyzeResult,  setReanalyzeResult]  = useState(null);
  const [reanalyzeToast,   setReanalyzeToast]   = useState(null);
  const toastTimerRef = useRef(null);

  function load() {
    setLoading(true);
    api.listUploadLinks(galleryId)
      .then(setLinks)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, [galleryId]);

  useEffect(() => {
    api.reanalyzeStatus(galleryId).then(setReanalyzeStatus).catch(() => {});
  }, [galleryId]);

  async function create(e) {
    e.preventDefault();
    setCreating(true); setError('');
    try {
      await api.createUploadLink(galleryId, { label: label.trim() || undefined });
      setLabel('');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function revoke(linkId) {
    try { await api.revokeUploadLink(galleryId, linkId); load(); } catch {}
  }

  async function reconcile() {
    setReconciling(true); setMaintError(''); setReconcileResult(null);
    try {
      const r = await api.reconcilePhotos(galleryId);
      setReconcileResult(r);
    } catch (err) {
      setMaintError(err.message);
    } finally {
      setReconciling(false);
    }
  }

  async function dryRunDedupe() {
    setDeduping(true); setMaintError(''); setDupeResult(null);
    try {
      const r = await api.deduplicatePhotos(galleryId, true);
      setDupeResult(r);
      if (r.totalDuplicates > 0) setDupeConfirm(true);
    } catch (err) {
      setMaintError(err.message);
    } finally {
      setDeduping(false);
    }
  }

  async function reanalyze() {
    setReanalyzing(true); setMaintError(''); setReanalyzeResult(null);
    try {
      const r = await api.reanalyzePhotos(galleryId);
      setReanalyzeResult(r);
      // Build toast summary
      const parts = [];
      if (r.thumbsGenerated > 0) parts.push(`${r.thumbsGenerated} thumbnail(s) générés`);
      if (r.exifExtracted   > 0) parts.push(`${r.exifExtracted} EXIF extraits`);
      if (r.deleted?.length > 0) parts.push(`${r.deleted.length} fichier(s) corrompu(s) supprimés`);
      const msg = parts.length > 0 ? parts.join(' · ') : 'Analyse terminée — tout est à jour';
      setReanalyzeToast({ msg, variant: r.deleted?.length > 0 ? 'warning' : 'success' });
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => setReanalyzeToast(null), 6000);
      // Refresh status counter
      api.reanalyzeStatus(galleryId).then(setReanalyzeStatus).catch(() => {});
    } catch (err) {
      setMaintError(err.message);
    } finally {
      setReanalyzing(false);
    }
  }

  async function runDedupe() {
    setDeduping(true); setMaintError('');
    try {
      const r = await api.deduplicatePhotos(galleryId, false);
      setDupeResult(r);
      setDupeConfirm(false);
    } catch (err) {
      setMaintError(err.message);
    } finally {
      setDeduping(false);
    }
  }

  function copy(url) {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(url);
      setTimeout(() => setCopied(''), 2000);
    });
  }

  return (
    <AdminPage title={t('gal_upload_title')}>
      <div className="row">
        <div className="col-lg-8">

          {/* Active links */}
          <AdminCard title={t('gal_upload_links_section')} noPadding>
            {loading ? (
              <div className="text-center py-4 text-muted"><i className="fas fa-spinner fa-spin" /></div>
            ) : links.length === 0 ? (
              <div className="text-center py-4 text-muted">
                <i className="fas fa-link fa-2x mb-2" style={{ display: 'block' }} />
                <p className="mb-0">{t('gal_upload_no_links')}</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm table-hover mb-0">
                  <thead className="table-light">
                    <tr><th>{t('gal_upload_th_label')}</th><th>{t('gal_upload_th_token')}</th><th>{t('gal_upload_th_created')}</th><th></th></tr>
                  </thead>
                  <tbody>
                    {links.map(l => {
                      const uploadUrl = l.uploadUrl || '';
                      const tokenPreview = uploadUrl ? uploadUrl.split('/').pop().slice(0, 12) : '—';
                      return (
                        <tr key={l.id}>
                          <td>{l.label || <em className="text-muted">{t('gal_upload_unnamed')}</em>}</td>
                          <td>
                            <code style={{ fontSize: '0.78rem' }}>{tokenPreview}…</code>
                          </td>
                          <td className="text-muted" style={{ fontSize: '0.8rem' }}>
                            {new Date(l.created_at).toLocaleDateString()}
                          </td>
                          <td className="text-end">
                            <AdminButton
                              variant="outline-secondary"
                              size="sm"
                              className="me-1"
                              onClick={() => copy(uploadUrl)}
                              aria-label="Copy upload URL"
                            >
                              <i className={`fas ${copied === uploadUrl ? 'fa-check text-success' : 'fa-copy'}`} aria-hidden="true" />
                            </AdminButton>
                            <AdminButton variant="outline-danger" size="sm" onClick={() => revoke(l.id)} aria-label="Revoke link">
                              <i className="fas fa-times" aria-hidden="true" />
                            </AdminButton>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </AdminCard>

          {/* Create link */}
          <AdminCard title={t('gal_upload_create_section')}>
            <AdminAlert message={error} />
            <form onSubmit={create} className="d-flex gap-2 align-items-end">
              <div style={{ flex: 1 }}>
                <label className="form-label">{t('gal_upload_th_label')} <span className="text-muted">{t('gal_upload_label_optional')}</span></label>
                <input className="form-control" value={label} onChange={e => setLabel(e.target.value)}
                  placeholder={t('gal_upload_placeholder')} />
              </div>
              <AdminButton type="submit" loading={creating} icon="fas fa-plus">
                {t('create')}
              </AdminButton>
            </form>
            <div className="form-text mt-2">{t('gal_upload_hint')}</div>
          </AdminCard>

          {/* Maintenance tools */}
          <AdminCard title={t('gal_upload_maintenance_section')}>
            <AdminAlert message={maintError} className="mb-3" />

            <div className="d-flex flex-column gap-3">
              {/* Reconcile */}
              <div className="d-flex align-items-start gap-3">
                <div style={{ flex: 1 }}>
                  <div className="fw-semibold" style={{ fontSize: '0.9rem' }}>{t('gal_upload_reconcile_title')}</div>
                  <div className="text-muted" style={{ fontSize: '0.8rem' }}>
                    {t('gal_upload_reconcile_desc')}
                  </div>
                  {reconcileResult && (
                    <div className="mt-1 text-success small">
                      {t('gal_upload_reconcile_result', { added: reconcileResult.added, alreadyPresent: reconcileResult.alreadyPresent, total: reconcileResult.total })}
                    </div>
                  )}
                </div>
                <AdminButton variant="outline-secondary" size="sm" loading={reconciling} loadingLabel={t('gal_upload_scanning')} onClick={reconcile}>
                  {t('gal_upload_reconcile_btn')}
                </AdminButton>
              </div>

              <hr className="my-0" />

              {/* Reanalyze */}
              <div className="d-flex align-items-start gap-3">
                <div style={{ flex: 1 }}>
                  <div className="fw-semibold" style={{ fontSize: '0.9rem' }}>
                    {t('gal_upload_reanalyze_title')}
                  </div>
                  <div className="text-muted" style={{ fontSize: '0.8rem' }}>
                    {t('gal_upload_reanalyze_desc')}
                  </div>
                  {reanalyzeStatus && (reanalyzeStatus.missingThumbs > 0 || reanalyzeStatus.missingExif > 0) ? (
                    <div className="mt-1 text-warning small">
                      <i className="fas fa-exclamation-triangle me-1" />
                      {reanalyzeStatus.missingThumbs > 0 && `${reanalyzeStatus.missingThumbs} thumbnail(s) missing`}
                      {reanalyzeStatus.missingThumbs > 0 && reanalyzeStatus.missingExif > 0 && ' · '}
                      {reanalyzeStatus.missingExif > 0 && `${reanalyzeStatus.missingExif} EXIF missing`}
                    </div>
                  ) : reanalyzeStatus ? (
                    <div className="mt-1 text-success small">
                      <i className="fas fa-check-circle me-1" />
                      All {reanalyzeStatus.total} photos are fully analyzed
                    </div>
                  ) : null}
                  {reanalyzing && (
                    <div className="mt-2 d-flex align-items-center gap-2 text-primary small">
                      <div className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                      Analyse en cours… cela peut prendre quelques secondes.
                    </div>
                  )}
                  {reanalyzeResult && !reanalyzing && reanalyzeResult.deleted?.length > 0 && (
                    <div className="mt-1 small text-warning">
                      <i className="fas fa-exclamation-triangle me-1" />
                      {reanalyzeResult.deleted.length} fichier(s) corrompu(s) supprimé(s) — à ré-uploader :
                      {reanalyzeResult.deleted.map(f => (
                        <span key={f} className="d-block ms-2 font-monospace" style={{ fontSize: '0.72rem' }}>{f}</span>
                      ))}
                    </div>
                  )}
                  {reanalyzeResult && !reanalyzing && reanalyzeResult.errors?.length > 0 && (
                    <div className="mt-1 small text-danger">
                      <i className="fas fa-times-circle me-1" />
                      {reanalyzeResult.errors.length} erreur(s) — voir les logs serveur.
                    </div>
                  )}
                </div>
                <AdminButton
                  variant={reanalyzeStatus && (reanalyzeStatus.missingThumbs > 0 || reanalyzeStatus.missingExif > 0) ? 'outline-warning' : 'outline-secondary'}
                  size="sm"
                  loading={reanalyzing}
                  loadingLabel={t('gal_upload_scanning')}
                  onClick={reanalyze}
                  disabled={reanalyzeStatus && reanalyzeStatus.missingThumbs === 0 && reanalyzeStatus.missingExif === 0}
                >
                  {t('gal_upload_reanalyze_btn')}
                </AdminButton>
              </div>

              <hr className="my-0" />

              {/* Deduplicate */}
              <div className="d-flex align-items-start gap-3">
                <div style={{ flex: 1 }}>
                  <div className="fw-semibold" style={{ fontSize: '0.9rem' }}>{t('gal_upload_dedupe_title')}</div>
                  <div className="text-muted" style={{ fontSize: '0.8rem' }}>
                    {t('gal_upload_dedupe_desc')}
                  </div>
                  {dupeResult && !dupeConfirm && (
                    <div className={`mt-1 small ${dupeResult.totalDuplicates > 0 ? 'text-warning' : 'text-success'}`}>
                      {dupeResult.dryRun
                        ? t('gal_upload_dedupe_found', { n: dupeResult.totalDuplicates })
                        : t('gal_upload_dedupe_removed', { n: dupeResult.deleted })
                      }
                    </div>
                  )}
                </div>
                <AdminButton variant="outline-secondary" size="sm" loading={deduping} loadingLabel={t('gal_upload_scanning')} onClick={dryRunDedupe}>
                  {t('gal_upload_dedupe_btn')}
                </AdminButton>
              </div>
            </div>
          </AdminCard>

        </div>
      </div>

      {/* Dedupe confirmation modal */}
      {dupeConfirm && dupeResult && (
        <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.5)', position: 'fixed', inset: 0, zIndex: 1055 }} onClick={() => !deduping && setDupeConfirm(false)}>
          <div className="modal-dialog modal-dialog-centered" onClick={e => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header border-0">
                <h5 className="modal-title">{t('gal_upload_dedupe_confirm_title', { n: dupeResult.totalDuplicates })}</h5>
              </div>
              <div className="modal-body" style={{ maxHeight: 300, overflowY: 'auto' }}>
                {dupeResult.duplicateSets.map(set => (
                  <div key={set.hash} className="mb-2 small">
                    <span className="text-success fw-semibold">{t('gal_upload_dedupe_keep')}</span> {set.keep} &nbsp;
                    <span className="text-danger fw-semibold">{t('gal_upload_dedupe_delete')}</span> {set.dupes.join(', ')}
                  </div>
                ))}
              </div>
              <div className="modal-footer border-0">
                <AdminButton variant="secondary" onClick={() => setDupeConfirm(false)} disabled={deduping}>{t('cancel')}</AdminButton>
                <AdminButton variant="danger" loading={deduping} loadingLabel={t('gal_upload_dedupe_removing')} onClick={runDedupe}>
                  {t('gal_upload_dedupe_confirm_btn')}
                </AdminButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reanalyze toast */}
      {reanalyzeToast && (
        <div className="toast-container position-fixed bottom-0 end-0 p-3" style={{ zIndex: 1100 }}>
          <div className={`toast show align-items-center text-bg-${reanalyzeToast.variant} border-0`} role="alert" aria-live="assertive" aria-atomic="true">
            <div className="d-flex">
              <div className="toast-body d-flex align-items-center gap-2">
                <i className={`fas ${reanalyzeToast.variant === 'warning' ? 'fa-exclamation-triangle' : 'fa-check-circle'}`} />
                {reanalyzeToast.msg}
              </div>
              <button type="button" className="btn-close btn-close-white me-2 m-auto" onClick={() => setReanalyzeToast(null)} aria-label="Close" />
            </div>
          </div>
        </div>
      )}
    </AdminPage>
  );
}
