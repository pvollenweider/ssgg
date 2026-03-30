// Copyright (c) 2026 Philippe Vollenweider
//
// This file is part of the GalleryPack commercial platform.
// This source code is proprietary and confidential.
// Use, reproduction, or distribution requires a valid commercial license.
// Unauthorized use is strictly prohibited.

// apps/web/src/components/UploadZone.jsx
// UI-only component: delegates queue management to UploadContext.
// Displays items for a specific galleryId; navigation never interrupts uploads.

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { api } from '../lib/api.js';
import { useUpload } from '../management/context/UploadContext.jsx';

const IMG_EXTS = new Set(['jpg','jpeg','png','tiff','tif','heic','heif','avif','webp']);

const IS_IOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

function isImage(name) {
  return IMG_EXTS.has(name.split('.').pop().toLowerCase());
}

function collectEntry(entry) {
  return new Promise(resolve => {
    if (entry.isFile) {
      entry.file(f => resolve(isImage(f.name) ? [f] : []), () => resolve([]));
    } else if (entry.isDirectory) {
      const reader = entry.createReader();
      const all = [];
      const read = () => {
        reader.readEntries(async entries => {
          if (!entries.length) { resolve(all); return; }
          for (const e of entries) all.push(...await collectEntry(e));
          read();
        }, () => resolve(all));
      };
      read();
    } else {
      resolve([]);
    }
  });
}

const STATUS_BADGE = {
  queued:    { bg: '#f3f4f6', color: '#888',    label: 'Queued' },
  uploading: { bg: '#dbeafe', color: '#2563eb', label: 'Uploading…' },
  done:      { bg: '#dcfce7', color: '#16a34a', label: '✓ Done' },
  error:     { bg: '#fee2e2', color: '#dc2626', label: '✕ Failed' },
};

// Auto-append " (1)", " (2)"… until the name is not in the taken set.
function autoRename(filename, taken) {
  const dot  = filename.lastIndexOf('.');
  const base = dot >= 0 ? filename.slice(0, dot) : filename;
  const ext  = dot >= 0 ? filename.slice(dot)    : '';
  let i = 1;
  let candidate;
  do { candidate = `${base} (${i++})${ext}`; } while (taken.has(candidate));
  return candidate;
}

export function UploadZone({ galleryId, onDone, existingPhotos = [] }) {
  const { enqueue, registerOnDone, unregisterOnDone, retryItem, retryFailed, clearDone, items, globalStats } = useUpload();
  const [dragging,  setDragging]  = useState(false);
  const [notified,  setNotified]  = useState(false);
  const [conflict,  setConflict]  = useState(null);  // {fresh, dupes} | null
  const [resolving, setResolving] = useState(false);
  const fileRef   = useRef();
  const folderRef = useRef();

  // Map original_name → {file: uuid-filename, id} for existing gallery photos.
  const existingMap = useMemo(() => {
    const m = new Map();
    for (const p of existingPhotos) {
      if (p.original_name) m.set(p.original_name, p);
    }
    return m;
  }, [existingPhotos]);

  // Keep onDone callback current in the global context
  useEffect(() => {
    if (onDone) registerOnDone(galleryId, onDone);
    return () => unregisterOnDone(galleryId);
  }, [galleryId, onDone]); // eslint-disable-line

  const galleryItems = items.filter(x => x.galleryId === galleryId);
  const queued    = galleryItems.filter(x => x.status === 'queued').length;
  const uploading = galleryItems.filter(x => x.status === 'uploading').length;
  const done      = galleryItems.filter(x => x.status === 'done').length;
  const errors    = galleryItems.filter(x => x.status === 'error').length;
  const hasActive = queued > 0 || uploading > 0;

  const totalProgress = galleryItems.length > 0
    ? galleryItems.reduce((sum, x) => sum + (x.status === 'done' ? 1 : x.status === 'uploading' ? x.progress : 0), 0) / galleryItems.length
    : 0;
  const pct = Math.round(totalProgress * 100);

  const addFiles = useCallback(async (fileList) => {
    const files = Array.from(fileList).filter(f => isImage(f.name));
    const fresh = files.filter(f => !existingMap.has(f.name));
    const dupes = files.filter(f =>  existingMap.has(f.name));

    if (dupes.length === 0) {
      enqueue(galleryId, fresh);
    } else {
      setConflict({ fresh, dupes });
    }
  }, [galleryId, enqueue, existingMap]);

  // ── Conflict resolution ─────────────────────────────────────────────────────

  function resolveSkip() {
    enqueue(galleryId, conflict.fresh);
    setConflict(null);
  }

  function resolveRename() {
    // Build the full set of names already taken: gallery + current queue + fresh batch.
    const taken = new Set(existingMap.keys());
    items.filter(x => x.galleryId === galleryId).forEach(x => taken.add(x.displayName ?? x.file.name));
    conflict.fresh.forEach(f => taken.add(f.name));

    const renamed = conflict.dupes.map(file => {
      const name = autoRename(file.name, taken);
      taken.add(name);
      return { file, name };
    });
    enqueue(galleryId, [...conflict.fresh, ...renamed]);
    setConflict(null);
  }

  async function resolveOverwrite() {
    setResolving(true);
    try {
      // Delete existing photos that share the same original_name, then upload fresh.
      await Promise.all(
        conflict.dupes.map(f => {
          const existing = existingMap.get(f.name);
          return existing ? api.deletePhoto(galleryId, existing.file).catch(() => {}) : Promise.resolve();
        })
      );
    } finally {
      setResolving(false);
    }
    enqueue(galleryId, [...conflict.fresh, ...conflict.dupes]);
    setConflict(null);
  }

  async function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    const dataItems = Array.from(e.dataTransfer.items || []);
    if (dataItems.length && dataItems[0].webkitGetAsEntry) {
      const all = [];
      for (const item of dataItems) {
        const entry = item.webkitGetAsEntry();
        if (entry) all.push(...await collectEntry(entry));
      }
      addFiles(all);
    } else {
      addFiles(e.dataTransfer.files);
    }
  }

  async function handleDone() {
    try { await api.uploadDone(galleryId); setNotified(true); } catch {}
  }

  return (
    <div style={s.root}>

      {/* Offline banner */}
      {globalStats.offline && (
        <div style={{ background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: 6, padding: '0.5rem 0.75rem', fontSize: '0.82rem', color: '#92400e' }}>
          Waiting for network… uploads will resume automatically when you reconnect.
        </div>
      )}

      {/* Duplicate conflict dialog */}
      {conflict && (
        <div style={s.conflictBox}>
          <div style={s.conflictTitle}>
            <i className="fas fa-copy me-2" style={{ color: '#b45309' }} />
            {conflict.dupes.length === 1
              ? `1 fichier existe déjà dans cette galerie`
              : `${conflict.dupes.length} fichiers existent déjà dans cette galerie`}
            {conflict.fresh.length > 0 && (
              <span style={{ fontWeight: 400, color: '#78350f', marginLeft: '0.4em' }}>
                · {conflict.fresh.length} nouveau{conflict.fresh.length > 1 ? 'x' : ''}
              </span>
            )}
          </div>
          <div style={s.conflictNames}>
            {conflict.dupes.slice(0, 6).map(f => f.name).join(' · ')}
            {conflict.dupes.length > 6 && ` · +${conflict.dupes.length - 6} autres`}
          </div>
          <div style={s.conflictActions}>
            {conflict.fresh.length > 0 && (
              <button style={s.conflictBtn} onClick={resolveSkip} title="N'uploader que les nouvelles photos">
                <i className="fas fa-forward me-1" />
                Passer les doublons
                <span style={s.conflictCount}>{conflict.dupes.length}</span>
              </button>
            )}
            <button style={s.conflictBtn} onClick={resolveRename} title="Uploader avec un nouveau nom : photo (1).jpg">
              <i className="fas fa-tag me-1" />
              Renommer
              <span style={s.conflictCount}>{conflict.dupes.length}</span>
            </button>
            <button
              style={{ ...s.conflictBtn, borderColor: '#dc2626', color: '#dc2626' }}
              onClick={resolveOverwrite}
              disabled={resolving}
              title="Supprimer les originaux et uploader les nouveaux fichiers"
            >
              {resolving
                ? <i className="fas fa-spinner fa-spin me-1" />
                : <i className="fas fa-redo me-1" />}
              Écraser
              <span style={s.conflictCount}>{conflict.dupes.length}</span>
            </button>
            <button style={{ ...s.conflictBtn, marginLeft: 'auto' }} onClick={() => setConflict(null)}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Desktop: drag-and-drop zone */}
      <div
        className="d-none d-md-block"
        style={{ ...s.zone, ...(dragging ? s.zoneActive : {}) }}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        {dragging ? (
          <span style={s.zoneText}>Drop here</span>
        ) : (
          <div style={s.zoneActions}>
            <span style={s.zoneText}>Drag photos or folders here</span>
            <div style={s.zoneBtns}>
              <button type="button" style={s.zoneBtn} onClick={() => fileRef.current?.click()}>+ Photos</button>
              <button type="button" style={s.zoneBtn} onClick={() => folderRef.current?.click()}>+ Folder</button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile: tap-to-select button */}
      <div className="d-md-none">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          style={{
            width: '100%', padding: '1rem', background: '#f8f9fa',
            border: '2px dashed #ccc', borderRadius: 8, fontSize: '1rem',
            fontWeight: 600, color: '#555', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
          }}
        >
          <i className="fas fa-images" aria-hidden="true" />
          Add photos
        </button>
      </div>

      {/* Hidden file inputs */}
      <input ref={fileRef} type="file" multiple accept="image/*" style={s.hidden}
        onChange={e => addFiles(e.target.files)} />
      {!IS_IOS && (
        <input ref={folderRef} type="file" multiple style={s.hidden}
          webkitdirectory="true" mozdirectory="true"
          onChange={e => addFiles(e.target.files)} />
      )}

      {/* Stats bar */}
      {galleryItems.length > 0 && (
        <div style={s.statsBar}>
          {uploading > 0 && <span style={{ color: '#60a5fa' }}>{uploading} uploading</span>}
          {queued    > 0 && <span style={{ color: '#888' }}>{queued} queued</span>}
          {done      > 0 && <span style={{ color: '#4ade80' }}>{done} done</span>}
          {errors    > 0 && <span style={{ color: '#f87171' }}>{errors} failed</span>}
          {hasActive && pct > 0 && <span style={{ color: '#94a3b8', marginLeft: 'auto' }}>{pct}%</span>}
          <div style={{ marginLeft: hasActive && pct > 0 ? 0 : 'auto', display: 'flex', gap: '0.5rem' }}>
            {errors > 0 && (
              <button style={s.smallBtn} onClick={() => retryFailed(galleryId)}>Retry failed</button>
            )}
            {done > 0 && !hasActive && (
              <button style={s.smallBtn} onClick={() => clearDone(galleryId)}>Clear done</button>
            )}
          </div>
        </div>
      )}

      {/* File cards grid */}
      {galleryItems.length > 0 && (
        <div style={s.grid}>
          {galleryItems.map(item => (
            <div key={item.id} style={s.card}>
              <div style={s.thumbWrap}>
                <img src={item.preview} style={s.thumb} alt={item.file.name}
                  loading="lazy" decoding="async" />
                {item.status === 'uploading' && (
                  <div style={{ ...s.progressBar, width: `${Math.round(item.progress * 100)}%` }} />
                )}
              </div>
              <div style={s.cardMeta}>
                <span style={{ ...s.badge, background: STATUS_BADGE[item.status]?.bg, color: STATUS_BADGE[item.status]?.color }}>
                  {item.retryLabel ?? (item.status === 'uploading' ? `${Math.round(item.progress * 100)}%` : STATUS_BADGE[item.status]?.label)}
                </span>
                {item.status === 'error' && !item.noRetry && (
                  <button
                    style={{ ...s.smallBtn, marginTop: 2, minHeight: 28, width: '100%' }}
                    onClick={() => retryItem(item.id)}
                    aria-label={`Retry ${item.file.name}`}
                  >
                    Retry
                  </button>
                )}
                {item.errorMsg && (
                  <div style={{ fontSize: '0.6rem', color: '#dc2626', marginTop: 2, lineHeight: 1.3 }} title={item.errorMsg}>
                    {item.errorMsg}
                  </div>
                )}
              </div>
              <div style={s.cardName} title={item.file.name}>{item.file.name}</div>
            </div>
          ))}
        </div>
      )}

      {/* Upload done notification */}
      {done > 0 && !hasActive && !notified && (
        <div>
          <button style={s.doneBtn} onClick={handleDone}>
            ✓ J'ai terminé — notifier les éditeurs
          </button>
        </div>
      )}
      {notified && (
        <p style={{ fontSize: '0.82rem', color: '#059669', fontWeight: 500, margin: 0 }}>
          ✓ Éditeurs notifiés
        </p>
      )}
    </div>
  );
}

const s = {
  root:        { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  zone:        { border: '2px dashed #ccc', borderRadius: 8, padding: '1.5rem', textAlign: 'center', background: '#f8f9fa', transition: 'border-color 0.15s, background 0.15s' },
  zoneActive:  { borderColor: '#16a34a', background: '#f0fdf4' },
  zoneActions: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' },
  zoneText:    { color: '#888', fontSize: '0.875rem', userSelect: 'none' },
  zoneBtns:    { display: 'flex', gap: '0.5rem' },
  zoneBtn:     { padding: '0.35rem 0.85rem', background: '#fff', border: '1px solid #ddd', borderRadius: 5, cursor: 'pointer', fontSize: '0.82rem', color: '#555', fontWeight: 500 },
  hidden:      { display: 'none' },
  statsBar:    { display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.82rem', flexWrap: 'wrap' },
  smallBtn:    { padding: '0.25rem 0.6rem', background: 'none', border: '1px solid #333', borderRadius: 4, cursor: 'pointer', fontSize: '0.78rem', color: '#888' },
  grid:        { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '0.5rem' },
  card:        { position: 'relative', borderRadius: 6, overflow: 'hidden', background: '#fff', border: '1px solid #e5e7eb' },
  thumbWrap:   { position: 'relative', aspectRatio: '1', overflow: 'hidden' },
  thumb:       { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  progressBar: { position: 'absolute', bottom: 0, left: 0, height: 3, background: '#60a5fa', transition: 'width 0.2s' },
  cardMeta:    { padding: '0.25rem 0.35rem 0' },
  badge:       { display: 'inline-block', fontSize: '0.65rem', fontWeight: 600, padding: '0.1rem 0.35rem', borderRadius: 3 },
  cardName:    { padding: '0.15rem 0.35rem 0.35rem', fontSize: '0.65rem', color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  doneBtn:       { padding: '0.5rem 1.25rem', background: '#059669', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' },
  conflictBox:   { background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' },
  conflictTitle: { fontWeight: 600, color: '#92400e', fontSize: '0.875rem' },
  conflictNames: { color: '#78350f', fontSize: '0.78rem', lineHeight: 1.5, opacity: 0.85 },
  conflictActions: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem' },
  conflictBtn:   { display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.3rem 0.75rem', background: 'none', border: '1px solid #92400e', borderRadius: 5, cursor: 'pointer', fontSize: '0.8rem', color: '#92400e', fontWeight: 500, whiteSpace: 'nowrap' },
  conflictCount: { background: '#fde68a', color: '#92400e', borderRadius: 10, padding: '0 0.35rem', fontSize: '0.7rem', fontWeight: 700, marginLeft: '0.15rem' },
};
