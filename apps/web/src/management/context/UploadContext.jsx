// Copyright (c) 2026 Philippe Vollenweider
//
// This file is part of the GalleryPack commercial platform.
// This source code is proprietary and confidential.
// Use, reproduction, or distribution requires a valid commercial license.
// Unauthorized use is strictly prohibited.

// apps/web/src/management/context/UploadContext.jsx
//
// Global upload queue backed by Uppy + @uppy/tus.
// Survives in-app navigation. Per-gallery item state exposed to UploadZone.
//
// tus endpoint: /api/tus  (single endpoint — galleryId in Upload-Metadata)
//
// Public API (identical to XHR version):
//   enqueue(galleryId, fileList)
//   retryItem(id), retryFailed(galleryId), clearDone(galleryId)
//   registerOnDone(galleryId, cb) / unregisterOnDone(galleryId)
//   items[], globalStats, toastMsg, dismissToast
//
// Vite env vars:
//   VITE_UPLOAD_CONCURRENCY     — max simultaneous tus uploads (default 6)
//   VITE_UPLOAD_CHUNK_SIZE_MB   — tus chunk size in MB         (default 8)
//   VITE_UPLOAD_MAX_RETRIES     — max automatic retries        (default 5)

import {
  createContext, useContext, useState, useRef,
  useCallback, useEffect, useMemo,
} from 'react';
import Uppy  from '@uppy/core';
import Tus   from '@uppy/tus';

// ── Config ─────────────────────────────────────────────────────────────────────

const MAX_CONCURRENT   = Number(import.meta.env.VITE_UPLOAD_CONCURRENCY   || 6);
const CHUNK_SIZE_BYTES = (Number(import.meta.env.VITE_UPLOAD_CHUNK_SIZE_MB || 8)) * 1024 * 1024;
const MAX_RETRIES      = Number(import.meta.env.VITE_UPLOAD_MAX_RETRIES    || 5);

// Build exponential-jitter retry delays: [1s, 2s, 4s, 8s, 16s, ...]
const RETRY_DELAYS = Array.from({ length: MAX_RETRIES }, (_, i) =>
  Math.min(1000 * Math.pow(2, i) + Math.random() * 500, 30_000)
);

const IMG_EXTS = new Set(['jpg','jpeg','png','tiff','tif','heic','heif','avif','webp']);
function isImage(name) {
  return IMG_EXTS.has(name.split('.').pop().toLowerCase());
}

const log = (...a) => console.log('[Upload]', ...a);

// ── Context ────────────────────────────────────────────────────────────────────

const UploadContext = createContext(null);

const EMPTY = {
  enqueue: () => {}, registerOnDone: () => {}, unregisterOnDone: () => {},
  retryItem: () => {}, retryFailed: () => {}, clearDone: () => {},
  items: [], globalStats: { uploading: 0, queued: 0, offline: false },
  toastMsg: null, dismissToast: () => {},
};

export const useUpload = () => useContext(UploadContext) ?? EMPTY;

// ── Uppy singleton ─────────────────────────────────────────────────────────────

function makeUppy() {
  const uppy = new Uppy({ autoProceed: true, allowMultipleUploadBatches: true });

  uppy.use(Tus, {
    endpoint:    '/api/tus',
    chunkSize:   CHUNK_SIZE_BYTES,
    retryDelays: RETRY_DELAYS,
    withCredentials: true,
    // allowedMetaFields tells @uppy/tus which meta fields to include in Upload-Metadata
    allowedMetaFields: ['filename', 'galleryId'],
    limit: MAX_CONCURRENT,         // max concurrent tus uploads
    // Remove the stored URL from localStorage after each successful upload so stale
    // fingerprints don't accumulate across sessions and trigger spurious HEAD 404s.
    removeFingerprintOnSuccess: true,
  });

  return uppy;
}

// ── Provider ───────────────────────────────────────────────────────────────────

export function UploadProvider({ children }) {
  const [items,    setItems]    = useState([]);
  const [offline,  setOffline]  = useState(!navigator.onLine);
  const [toastMsg, setToastMsg] = useState(null);

  const itemsMapRef  = useRef(new Map());  // uppyFileId → item
  const uppyRef      = useRef(null);
  const onDoneCbs    = useRef({});
  const wasActiveRef = useRef(false);

  // ── Lazy Uppy init ──────────────────────────────────────────────────────────

  function getUppy() {
    if (!uppyRef.current) {
      const uppy = makeUppy();

      uppy.on('upload-progress', (file, progress) => {
        const pct = progress.bytesTotal > 0
          ? progress.bytesUploaded / progress.bytesTotal : 0;
        patchItem(file.id, { status: 'uploading', progress: pct });
      });

      uppy.on('upload-success', (file) => {
        log(`✓ "${file.name}"`);
        patchItem(file.id, { status: 'done', progress: 1 });
        onDoneCbs.current[file.meta?.galleryId]?.();
      });

      uppy.on('upload-error', (file, error) => {
        const status = error?.request?.status;
        // 404 on HEAD = stale fingerprint from a previous session.
        // @uppy/tus will retry automatically and create a fresh upload — suppress UI error.
        if (status === 404) {
          log(`resume 404 for "${file.name}" — retrying fresh`);
          return;
        }
        const body   = error?.request?.responseText || '';
        const is422  = status === 422 || body.includes('"error"');
        log(`✗ "${file.name}" — ${error.message}`);
        patchItem(file.id, {
          status:   'error',
          noRetry:  is422,
          errorMsg: is422 ? tryParseError(body) || error.message : error.message,
        });
      });

      uppyRef.current = uppy;
    }
    return uppyRef.current;
  }

  function tryParseError(body) {
    try { return JSON.parse(body)?.error; } catch { return null; }
  }

  // ── Item state helpers ──────────────────────────────────────────────────────

  function patchItem(uppyId, patch) {
    const existing = itemsMapRef.current.get(uppyId);
    if (!existing) return;
    itemsMapRef.current.set(uppyId, { ...existing, ...patch });
    flushItems();
  }

  function flushItems() {
    setItems(Array.from(itemsMapRef.current.values()));
  }

  // ── Offline / online ────────────────────────────────────────────────────────

  useEffect(() => {
    const goOffline = () => { setOffline(true); };
    const goOnline  = () => { setOffline(false); };
    window.addEventListener('offline', goOffline);
    window.addEventListener('online',  goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online',  goOnline);
    };
  }, []);

  // ── Unload warning ──────────────────────────────────────────────────────────

  const hasActive = items.some(x => x.status === 'queued' || x.status === 'uploading');

  useEffect(() => {
    if (!hasActive) return;
    const h = e => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [hasActive]);

  // ── Toast on drain ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (wasActiveRef.current && !hasActive) {
      const n = items.filter(x => x.status === 'done').length;
      if (n > 0) setToastMsg(n === 1 ? '1 photo uploadée.' : `${n} photos uploadées.`);
    }
    wasActiveRef.current = hasActive;
  }, [hasActive]); // eslint-disable-line

  // ── Public API ──────────────────────────────────────────────────────────────

  // Accept File objects OR {file, name} pairs (for client-side rename support).
  const enqueue = useCallback((galleryId, filesOrPairs) => {
    const uppy  = getUppy();
    const pairs = Array.from(filesOrPairs).map(item =>
      item instanceof File ? { file: item, name: item.name } : item
    ).filter(({ name }) => isImage(name));

    // Dedup against items already in the queue for this gallery.
    // Use displayName (set when file was renamed) or fall back to file.name.
    const queued = new Set(
      Array.from(itemsMapRef.current.values())
        .filter(x => x.galleryId === galleryId)
        .map(x => x.displayName ?? x.file.name)
    );

    let added = 0;
    for (const { file, name } of pairs) {
      if (queued.has(name)) continue;
      let uppyId;
      try {
        uppyId = uppy.addFile({
          name,
          type: file.type || 'application/octet-stream',
          data: file,
          meta: { galleryId, filename: name },   // filename sent in Upload-Metadata
        });
      } catch (err) {
        log(`skip "${name}": ${err.message}`);
        continue;
      }
      itemsMapRef.current.set(uppyId, {
        id:          uppyId,
        galleryId,
        file,
        displayName: name,      // may differ from file.name when renamed
        status:      'queued',
        progress:    0,
        preview:     URL.createObjectURL(file),
        errorMsg:    null,
        noRetry:     false,
        retryLabel:  null,
      });
      added++;
    }
    if (added > 0) {
      log(`enqueue ${added} → gallery ${galleryId}`);
      flushItems();
    }
  }, []); // eslint-disable-line

  function registerOnDone(galleryId, cb)  { onDoneCbs.current[galleryId] = cb; }
  function unregisterOnDone(galleryId)    { delete onDoneCbs.current[galleryId]; }

  function retryItem(id) {
    const uppy = getUppy();
    patchItem(id, { status: 'queued', progress: 0, errorMsg: null, noRetry: false });
    try { uppy.retryUpload(id); } catch {}
  }

  function retryFailed(galleryId) {
    const uppy = getUppy();
    Array.from(itemsMapRef.current.values())
      .filter(x => x.galleryId === galleryId && x.status === 'error' && !x.noRetry)
      .forEach(item => {
        patchItem(item.id, { status: 'queued', progress: 0, errorMsg: null });
        try { uppy.retryUpload(item.id); } catch {}
      });
  }

  function clearDone(galleryId) {
    const uppy = getUppy();
    Array.from(itemsMapRef.current.values())
      .filter(x => x.galleryId === galleryId && x.status === 'done')
      .forEach(item => {
        URL.revokeObjectURL(item.preview);
        itemsMapRef.current.delete(item.id);
        try { uppy.removeFile(item.id); } catch {}
      });
    flushItems();
  }

  const globalStats = useMemo(() => ({
    uploading: items.filter(x => x.status === 'uploading').length,
    queued:    items.filter(x => x.status === 'queued').length,
    offline,
  }), [items, offline]);

  return (
    <UploadContext.Provider value={{
      enqueue, registerOnDone, unregisterOnDone,
      retryItem, retryFailed, clearDone,
      items, globalStats,
      toastMsg, dismissToast: () => setToastMsg(null),
    }}>
      {children}
    </UploadContext.Provider>
  );
}
