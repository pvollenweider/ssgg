// Copyright (c) 2026 Philippe Vollenweider
//
// This file is part of the GalleryPack commercial platform.
// This source code is proprietary and confidential.
// Use, reproduction, or distribution requires a valid commercial license.
// Unauthorized use is strictly prohibited.

// apps/web/src/inspector/InspectorBackup.jsx — Backup & Dropbox sync UI
import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../lib/api.js';
import { useT } from '../lib/I18nContext.jsx';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtBytes(b) {
  if (b == null) return '—';
  if (b < 1024) return `${b} B`;
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(1)} MB`;
  return `${(b / 1024 ** 3).toFixed(2)} GB`;
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

function timeAgo(iso) {
  if (!iso) return '—';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)   return 'à l'instant';
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  return `il y a ${Math.floor(diff / 86400)} j`;
}

const STATE_COLOR = {
  success: '#4ade80',
  running: '#60a5fa',
  error:   '#f87171',
  pending: '#fbbf24',
};

const STATE_ICON = {
  success: 'fas fa-check-circle',
  running: 'fas fa-spinner fa-spin',
  error:   'fas fa-times-circle',
  pending: 'fas fa-clock',
};

// ── Disk usage bar ────────────────────────────────────────────────────────────

function DiskBar({ label, bytes, total, color }) {
  const pct = total > 0 && bytes != null ? Math.round((bytes / total) * 100) : 0;
  return (
    <div className="mb-3">
      <div className="d-flex justify-content-between mb-1" style={{ fontSize: '0.82rem' }}>
        <span style={{ color: '#ccc' }}>{label}</span>
        <span style={{ color: '#888' }}>{fmtBytes(bytes)} ({pct}%)</span>
      </div>
      <div style={{ height: 6, background: '#2a2a3e', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.4s' }} />
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function InspectorBackup() {
  const t = useT();
  const [status, setStatus]     = useState(null);
  const [logs, setLogs]         = useState('');
  const [syncing, setSyncing]   = useState(false);
  const [syncMsg, setSyncMsg]   = useState('');
  const [error, setError]       = useState('');
  const logRef = useRef(null);

  const syncState = status?.triggerPending
    ? 'pending'
    : status?.lastSync?.state ?? null;

  const isActive = syncState === 'running' || syncState === 'pending';

  const loadAll = useCallback(async () => {
    try {
      const [s, l] = await Promise.all([
        api.inspectorBackupStatus(),
        api.inspectorBackupLogs(150),
      ]);
      setStatus(s);
      setLogs(l.log);
    } catch {}
  }, []);

  // Poll fast when active, slow when idle
  useEffect(() => {
    loadAll();
    const ms = isActive ? 5000 : 30000;
    const timer = setInterval(loadAll, ms);
    return () => clearInterval(timer);
  }, [loadAll, isActive]);

  // Auto-scroll log when active
  useEffect(() => {
    if (isActive && logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs, isActive]);

  async function triggerSync(dbOnly = false) {
    setSyncing(true); setError(''); setSyncMsg('');
    try {
      await api.inspectorBackupSync(dbOnly);
      setSyncMsg('Sync demandé — démarrage dans les 5 prochaines minutes.');
      await loadAll();
    } catch (e) {
      setError(e.message || 'Erreur lors du déclenchement');
    } finally {
      setSyncing(false);
    }
  }

  const du = status?.diskUsage ?? {};
  const totalBytes = (du.private ?? 0) + (du.public ?? 0) + (du.internal ?? 0);
  const lastSync = status?.lastSync;

  return (
    <>
      {/* ── Header ── */}
      <div className="content-header" style={{ background: '#0f1117', borderBottom: '1px solid #1e1e2e' }}>
        <div className="container-fluid">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 py-1">
            <h1 className="m-0" style={{ color: '#eee', fontSize: '1.3rem' }}>
              <i className="fas fa-cloud-upload-alt me-2" style={{ color: '#60a5fa' }} />
              {t('inspector_backup_title')}
            </h1>
            <div className="d-flex gap-2">
              <button
                className="btn btn-sm btn-outline-info"
                onClick={() => triggerSync(true)}
                disabled={syncing || isActive}
                style={{ fontSize: '0.8rem' }}
              >
                <i className="fas fa-database me-1" />
                {t('inspector_backup_db_only')}
              </button>
              <button
                className="btn btn-sm btn-primary"
                onClick={() => triggerSync(false)}
                disabled={syncing || isActive}
                style={{ fontSize: '0.8rem' }}
              >
                {syncing
                  ? <><i className="fas fa-spinner fa-spin me-1" />{t('inspector_backup_syncing')}</>
                  : <><i className="fas fa-sync-alt me-1" />{t('inspector_backup_sync_now')}</>
                }
              </button>
            </div>
          </div>
          {syncMsg && <div className="alert alert-info py-1 mb-2 mt-2" style={{ fontSize: '0.82rem' }}>{syncMsg}</div>}
          {error   && <div className="alert alert-danger py-1 mb-2 mt-2" style={{ fontSize: '0.82rem' }}>{error}</div>}
        </div>
      </div>

      <section className="content">
        <div className="container-fluid pt-3">
          <div className="row">

            {/* ── Left column ── */}
            <div className="col-lg-5">

              {/* Status card */}
              <div className="card mb-3" style={s.card}>
                <div className="card-header" style={s.cardHeader}>
                  <h3 className="card-title" style={s.cardTitle}>{t('inspector_backup_status')}</h3>
                </div>
                <div className="card-body" style={{ padding: '1rem' }}>
                  {!lastSync && !status?.triggerPending ? (
                    <p style={{ color: '#555', fontSize: '0.82rem', margin: 0 }}>{t('inspector_backup_never')}</p>
                  ) : (
                    <>
                      <div className="d-flex align-items-center gap-3 mb-3">
                        {syncState && (
                          <i className={STATE_ICON[syncState]}
                            style={{ fontSize: '1.5rem', color: STATE_COLOR[syncState] }} />
                        )}
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.95rem', color: syncState ? STATE_COLOR[syncState] : '#ccc' }}>
                            {syncState === 'running' && t('inspector_backup_state_running')}
                            {syncState === 'success' && t('inspector_backup_state_success')}
                            {syncState === 'error'   && t('inspector_backup_state_error')}
                            {syncState === 'pending' && t('inspector_backup_state_pending')}
                          </div>
                          {lastSync?.started_at && (
                            <div style={{ fontSize: '0.75rem', color: '#666' }}>
                              {t('inspector_backup_started')} {fmtDate(lastSync.started_at)}
                            </div>
                          )}
                        </div>
                      </div>
                      {lastSync?.finished_at && (
                        <Row label={t('inspector_backup_finished')} value={`${fmtDate(lastSync.finished_at)} (${timeAgo(lastSync.finished_at)})`} />
                      )}
                      {lastSync?.trigger && (
                        <Row label={t('inspector_backup_trigger')}
                          value={lastSync.trigger === 'ui' ? t('inspector_backup_trigger_ui') : t('inspector_backup_trigger_scheduled')} />
                      )}
                      {lastSync?.error && (
                        <div style={{ marginTop: '0.5rem', padding: '0.5rem 0.75rem', background: '#2a0000', border: '1px solid #5a1a1a', borderRadius: 4, color: '#f87171', fontSize: '0.78rem' }}>
                          {lastSync.error}
                        </div>
                      )}
                      {status?.triggerPending && (
                        <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: '#1a1a00', border: '1px solid #3a3a00', borderRadius: 4, color: '#fbbf24', fontSize: '0.78rem' }}>
                          <i className="fas fa-clock me-1" />{t('inspector_backup_trigger_pending')}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Storage usage card */}
              <div className="card mb-3" style={s.card}>
                <div className="card-header" style={s.cardHeader}>
                  <h3 className="card-title" style={s.cardTitle}>{t('inspector_backup_storage')}</h3>
                  <span className="ms-auto" style={{ fontSize: '0.75rem', color: '#555' }}>{fmtBytes(totalBytes || null)} total</span>
                </div>
                <div className="card-body" style={{ padding: '1rem' }}>
                  {!status ? (
                    <p style={{ color: '#555', fontSize: '0.82rem' }}>{t('loading')}</p>
                  ) : (
                    <>
                      <DiskBar label="private/" bytes={du.private}   total={totalBytes} color="#4ade80" />
                      <DiskBar label="public/"  bytes={du.public}    total={totalBytes} color="#60a5fa" />
                      <DiskBar label="internal/" bytes={du.internal} total={totalBytes} color="#a78bfa" />
                    </>
                  )}
                </div>
              </div>

              {/* DB dumps card */}
              <div className="card mb-3" style={s.card}>
                <div className="card-header" style={s.cardHeader}>
                  <h3 className="card-title" style={s.cardTitle}>{t('inspector_backup_db_dumps')}</h3>
                </div>
                <div className="card-body p-0">
                  {!status?.dbDumps?.length ? (
                    <p style={{ color: '#555', fontSize: '0.82rem', padding: '0.75rem', margin: 0 }}>{t('inspector_backup_no_dumps')}</p>
                  ) : (
                    <table className="table table-sm mb-0" style={{ background: 'transparent' }}>
                      <tbody>
                        {status.dbDumps.map(d => (
                          <tr key={d.name} style={{ borderColor: '#1e1e2e' }}>
                            <td style={s.td}>
                              <span style={{ color: '#ccc', fontSize: '0.8rem', fontFamily: 'monospace' }}>{d.name}</span>
                            </td>
                            <td style={{ ...s.td, textAlign: 'right', color: '#666', fontSize: '0.75rem' }}>
                              {fmtBytes(d.size)}
                            </td>
                            <td style={{ ...s.td, textAlign: 'right', color: '#555', fontSize: '0.72rem' }}>
                              {timeAgo(d.mtime)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>

            {/* ── Right column — Log ── */}
            <div className="col-lg-7">
              <div className="card" style={{ ...s.card, height: 'calc(100vh - 180px)', display: 'flex', flexDirection: 'column' }}>
                <div className="card-header d-flex align-items-center" style={s.cardHeader}>
                  <h3 className="card-title" style={s.cardTitle}>{t('inspector_backup_log')}</h3>
                  {isActive && (
                    <span style={{ marginLeft: '0.75rem', fontSize: '0.7rem', color: '#60a5fa' }}>
                      <i className="fas fa-circle fa-beat me-1" style={{ fontSize: '0.5rem' }} />
                      {t('inspector_backup_live')}
                    </span>
                  )}
                  <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#555' }}>
                    {t('inspector_backup_log_hint')}
                  </span>
                </div>
                <div ref={logRef} style={{
                  flex: 1, overflowY: 'auto', padding: '0.75rem',
                  fontFamily: 'ui-monospace, monospace', fontSize: '0.72rem',
                  lineHeight: 1.6, color: '#aaa', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                }}>
                  {logs || <span style={{ color: '#555' }}>{t('inspector_backup_no_log')}</span>}
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>
    </>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Row({ label, value }) {
  return (
    <div className="d-flex gap-2 mb-1" style={{ fontSize: '0.8rem' }}>
      <span style={{ color: '#666', minWidth: 90, flexShrink: 0 }}>{label}</span>
      <span style={{ color: '#ccc' }}>{value}</span>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = {
  card: { background: '#1a1a2e', border: '1px solid #2a2a3e' },
  cardHeader: { background: '#1a1a2e', borderBottom: '1px solid #2a2a3e', display: 'flex', alignItems: 'center' },
  cardTitle: { color: '#eee', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 },
  td: { border: 'none', borderBottom: '1px solid #1e1e2e', padding: '0.45rem 0.75rem' },
};
