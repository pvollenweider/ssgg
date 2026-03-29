// Copyright (c) 2026 Philippe Vollenweider
//
// This file is part of the GalleryPack commercial platform.
// This source code is proprietary and confidential.
// Use, reproduction, or distribution requires a valid commercial license.
// Unauthorized use is strictly prohibited.

// Global upload queue — survives in-app navigation.
// UploadZone registers per-gallery onDone callbacks; the queue runs in the background.

import { createContext, useContext, useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { api } from '../../lib/api.js';

const UploadContext = createContext(null);

const EMPTY = {
  enqueue: () => {}, registerOnDone: () => {}, unregisterOnDone: () => {},
  retryItem: () => {}, retryFailed: () => {}, clearDone: () => {},
  items: [], globalStats: { uploading: 0, queued: 0, offline: false },
  toastMsg: null, dismissToast: () => {},
};

export const useUpload = () => useContext(UploadContext) ?? EMPTY;

const IMG_EXTS      = new Set(['jpg','jpeg','png','tiff','tif','heic','heif','avif','webp']);
const MAX_CONCURRENT  = 15;
const MAX_RETRIES     = 3;
const RETRY_DELAYS_MS = [1000, 2000, 4000];
const log = (...args) => console.log('[Upload]', ...args);

function isImage(name) {
  return IMG_EXTS.has(name.split('.').pop().toLowerCase());
}

export function UploadProvider({ children }) {
  const [items,     setItems]     = useState([]);
  const [offline,   setOffline]   = useState(!navigator.onLine);
  const [toastMsg,  setToastMsg]  = useState(null);  // string | null
  const running     = useRef(0);
  const itemsRef    = useRef([]);
  const pausedRef   = useRef(false);
  const onDoneCbs   = useRef({});  // galleryId → cb
  const wasActiveRef = useRef(false);

  useEffect(() => { itemsRef.current = items; }, [items]);

  // Offline / online detection
  useEffect(() => {
    const goOffline = () => { log('offline — queue paused'); setOffline(true);  pausedRef.current = true; };
    const goOnline  = () => { log('online — resuming');      setOffline(false); pausedRef.current = false; drainQueue(); };
    window.addEventListener('offline', goOffline);
    window.addEventListener('online',  goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online',  goOnline);
    };
  }, []); // eslint-disable-line

  const hasActive = items.some(x => x.status === 'queued' || x.status === 'uploading');

  // Toast when the queue fully drains
  useEffect(() => {
    if (wasActiveRef.current && !hasActive) {
      const n = items.filter(x => x.status === 'done').length;
      if (n > 0) setToastMsg(n === 1 ? '1 photo uploadée avec succès.' : `${n} photos uploadées avec succès.`);
    }
    wasActiveRef.current = hasActive;
  }, [hasActive]); // eslint-disable-line

  // Warn if closing tab while uploads are in flight
  useEffect(() => {
    if (!hasActive) return;
    const h = e => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [hasActive]);

  const drainQueue = useCallback(() => {
    const tick = () => {
      if (pausedRef.current || running.current >= MAX_CONCURRENT) return;
      const next = itemsRef.current.find(x => x.status === 'queued');
      if (!next) {
        if (running.current === 0 && itemsRef.current.length > 0) {
          const d = itemsRef.current.filter(x => x.status === 'done').length;
          const e = itemsRef.current.filter(x => x.status === 'error').length;
          log(`drained — ${d} done, ${e} failed`);
        }
        return;
      }

      running.current += 1;
      log(`→ start "${next.file.name}" (${(next.file.size/1024/1024).toFixed(2)} MB) slot ${running.current}/${MAX_CONCURRENT}`);
      setItems(prev => prev.map(x => x.id === next.id ? { ...x, status: 'uploading' } : x));

      const t0 = performance.now();
      api.uploadPhotos(next.galleryId, [next.file], pct => {
        setItems(prev => prev.map(x => x.id === next.id ? { ...x, progress: pct } : x));
      }).then(() => {
        const elapsed = ((performance.now() - t0) / 1000).toFixed(1);
        const kbps    = (next.file.size / 1024 / elapsed).toFixed(0);
        log(`✓ done  "${next.file.name}" in ${elapsed}s (${kbps} KB/s)`);
        running.current -= 1;
        setItems(prev => prev.map(x => x.id === next.id ? { ...x, status: 'done', progress: 1 } : x));
        onDoneCbs.current[next.galleryId]?.();
        tick();
      }).catch(err => {
        running.current -= 1;
        // 422 = server-side validation error (corrupt file, unsupported format) — never retry
        if (err?.httpStatus === 422) {
          log(`✗ rejected "${next.file.name}" — ${err.message}`);
          setItems(prev => prev.map(x => x.id === next.id
            ? { ...x, status: 'error', retryLabel: null, errorMsg: err.message, noRetry: true }
            : x));
          tick();
          return;
        }
        const retries = itemsRef.current.find(x => x.id === next.id)?.retries ?? 0;
        if (retries < MAX_RETRIES) {
          const delay = RETRY_DELAYS_MS[retries] ?? 4000;
          log(`✗ error "${next.file.name}" — retry ${retries + 1}/${MAX_RETRIES} in ${delay}ms`, err?.message);
          setItems(prev => prev.map(x => x.id === next.id
            ? { ...x, status: 'queued', retries: retries + 1, progress: 0, retryLabel: `Retrying (${retries+1}/${MAX_RETRIES})…` }
            : x));
          setTimeout(tick, delay);
        } else {
          log(`✗ failed "${next.file.name}" — max retries`, err?.message);
          setItems(prev => prev.map(x => x.id === next.id ? { ...x, status: 'error', retryLabel: null } : x));
          tick();
        }
      });

      if (running.current < MAX_CONCURRENT) tick();
    };
    tick();
  }, []); // eslint-disable-line

  useEffect(() => { drainQueue(); }, [items.length, drainQueue]);

  // ── Public API ──────────────────────────────────────────────────────────────

  function enqueue(galleryId, fileList) {
    const images = Array.from(fileList).filter(f => isImage(f.name));
    log(`enqueue: ${images.length} image(s) for gallery ${galleryId}`);
    setItems(prev => {
      const existing = new Set(prev.filter(x => x.galleryId === galleryId).map(x => x.file.name));
      const fresh = images
        .filter(f => !existing.has(f.name))
        .map(f => ({
          id: Math.random().toString(36).slice(2),
          galleryId,
          file:     f,
          status:   'queued',
          progress: 0,
          preview:  URL.createObjectURL(f),
          retries:  0,
        }));
      if (images.length - fresh.length > 0) log(`  skipped ${images.length - fresh.length} duplicate(s)`);
      return [...prev, ...fresh];
    });
  }

  // Called by UploadZone on mount/unmount so the callback stays current
  function registerOnDone(galleryId, cb)   { onDoneCbs.current[galleryId] = cb; }
  function unregisterOnDone(galleryId)     { delete onDoneCbs.current[galleryId]; }

  function retryItem(id) {
    setItems(prev => prev.map(x => x.id === id ? { ...x, status: 'queued', progress: 0, retries: 0 } : x));
  }
  function retryFailed(galleryId) {
    setItems(prev => prev.map(x =>
      (x.galleryId === galleryId && x.status === 'error' && !x.noRetry)
        ? { ...x, status: 'queued', progress: 0, retries: 0 }
        : x
    ));
  }
  function clearDone(galleryId) {
    setItems(prev => {
      prev.filter(x => x.galleryId === galleryId && x.status === 'done').forEach(x => URL.revokeObjectURL(x.preview));
      return prev.filter(x => !(x.galleryId === galleryId && x.status === 'done'));
    });
  }

  // Aggregated stats consumed by the sidebar indicator
  const globalStats = useMemo(() => ({
    uploading: items.filter(x => x.status === 'uploading').length,
    queued:    items.filter(x => x.status === 'queued').length,
    offline,
  }), [items, offline]);

  return (
    <UploadContext.Provider value={{ enqueue, registerOnDone, unregisterOnDone, retryItem, retryFailed, clearDone, items, globalStats, toastMsg, dismissToast: () => setToastMsg(null) }}>
      {children}
    </UploadContext.Provider>
  );
}
