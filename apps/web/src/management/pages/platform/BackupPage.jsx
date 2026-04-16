// Copyright (c) 2026 Philippe Vollenweider
//
// This file is part of the GalleryPack commercial platform.
// This source code is proprietary and confidential.
// Use, reproduction, or distribution requires a valid commercial license.
// Unauthorized use is strictly prohibited.

import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../../../lib/api.js';
import { useT } from '../../../lib/I18nContext.jsx';
import { AdminPage, AdminCard, AdminButton, AdminAlert, AdminInput, AdminSwitch } from '../../../components/ui/index.js';

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
  if (diff < 60)    return "à l'instant";
  if (diff < 3600)  return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  return `il y a ${Math.floor(diff / 86400)} j`;
}

const STATE_VARIANT = { success: 'success', running: 'primary', error: 'danger', pending: 'warning' };
const STATE_ICON    = { success: 'fas fa-check-circle', running: 'fas fa-spinner fa-spin', error: 'fas fa-times-circle', pending: 'fas fa-clock' };
const STATE_COLOR   = { success: 'var(--bs-success)', running: 'var(--bs-primary)', error: 'var(--bs-danger)', pending: 'var(--bs-warning)' };

const CFG_DEFAULTS = {
  remote: 'dropbox', remotePath: 'gallerypack',
  syncPrivate: true, syncPublic: true, syncInternal: true,
  dbRetentionDays: 7, bwlimit: '0',
  clientId: '', clientSecretSet: false,
};

// ── Disk usage bar ────────────────────────────────────────────────────────────

function DiskBar({ label, bytes, total, colorClass }) {
  const pct = total > 0 && bytes != null ? Math.round((bytes / total) * 100) : 0;
  return (
    <div className="mb-3">
      <div className="d-flex justify-content-between mb-1" style={{ fontSize: '0.82rem' }}>
        <span className="text-body">{label}</span>
        <span className="text-muted">{fmtBytes(bytes)} ({pct}%)</span>
      </div>
      <div className="progress" style={{ height: 6 }}>
        <div className={`progress-bar bg-${colorClass}`} style={{ width: `${pct}%`, transition: 'width 0.4s' }} />
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="d-flex gap-2 mb-1" style={{ fontSize: '0.82rem' }}>
      <span className="text-muted" style={{ minWidth: 90, flexShrink: 0 }}>{label}</span>
      <span className="text-body">{value}</span>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function BackupPage() {
  const t = useT();
  const [status, setStatus]   = useState(null);
  const [logs, setLogs]       = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const [error, setError]     = useState('');
  const logRef = useRef(null);

  // Sync config form
  const [cfg, setCfg]             = useState(CFG_DEFAULTS);
  const [cfgSaving, setCfgSaving] = useState(false);
  const [cfgSaved, setCfgSaved]   = useState('');
  const [cfgError, setCfgError]   = useState('');

  // Dropbox OAuth
  const [clientSecret, setClientSecret]       = useState('');
  const [rcloneConfigured, setRcloneConfigured] = useState(false);
  const [oauthConnecting, setOauthConnecting]   = useState(false);
  const [oauthMsg, setOauthMsg]                 = useState('');
  const [oauthError, setOauthError]             = useState('');

  const syncState = status?.triggerPending ? 'pending' : status?.lastSync?.state ?? null;
  const isActive  = syncState === 'running' || syncState === 'pending';

  const loadAll = useCallback(async () => {
    try {
      const [s, l] = await Promise.all([api.inspectorBackupStatus(), api.inspectorBackupLogs(150)]);
      setStatus(s);
      setLogs(l.log);
    } catch {}
  }, []);

  const loadConfig = useCallback(() => {
    api.inspectorBackupConfig().then(c => {
      setCfg({ ...CFG_DEFAULTS, ...c });
      setRcloneConfigured(!!c.rcloneConfigured);
    }).catch(() => {});
  }, []);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  // Poll status
  useEffect(() => {
    loadAll();
    const ms = isActive ? 5000 : 30000;
    const timer = setInterval(loadAll, ms);
    return () => clearInterval(timer);
  }, [loadAll, isActive]);

  // Auto-scroll log when active
  useEffect(() => {
    if (isActive && logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs, isActive]);

  // Listen for OAuth popup result
  useEffect(() => {
    function onMessage(ev) {
      if (ev.data?.type !== 'dropbox-oauth') return;
      setOauthConnecting(false);
      if (ev.data.ok) {
        setOauthMsg(t('backup_rclone_saved'));
        loadConfig();
      } else {
        setOauthError(t('backup_oauth_failed'));
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [t, loadConfig]);

  // Check ?oauth=success on mount (when not using popup)
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('oauth') === 'success') {
      setOauthMsg(t('backup_rclone_saved'));
      window.history.replaceState({}, '', window.location.pathname);
      loadConfig();
    }
  }, [t, loadConfig]);

  async function saveConfig(e) {
    e.preventDefault();
    setCfgSaving(true); setCfgSaved(''); setCfgError('');
    try {
      const payload = { ...cfg };
      if (clientSecret.trim()) payload.clientSecret = clientSecret.trim();
      const saved = await api.inspectorBackupSaveConfig(payload);
      setCfg(c => ({ ...c, ...saved }));
      if (clientSecret.trim()) setClientSecret('');
      setCfgSaved(t('settings_saved'));
    } catch (err) {
      setCfgError(err.message || 'Save failed');
    } finally {
      setCfgSaving(false);
    }
  }

  function setCfgField(field) {
    return e => setCfg(c => ({ ...c, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  }

  async function connectDropbox() {
    if (!cfg.clientId.trim()) { setOauthError(t('backup_oauth_need_appkey')); return; }
    setOauthConnecting(true); setOauthMsg(''); setOauthError('');
    try {
      const redirectUri = `${window.location.origin}/api/inspector/backup/oauth/callback`;
      const { authUrl } = await api.inspectorBackupOauthStart(redirectUri);
      const popup = window.open(authUrl, 'dropbox-oauth',
        'width=700,height=600,left=200,top=100,resizable,scrollbars');
      if (!popup) {
        // Fallback: redirect the current tab
        window.location.href = authUrl;
      } else {
        // Poll for popup closure in case postMessage is blocked
        const poll = setInterval(() => {
          if (popup.closed) { clearInterval(poll); setOauthConnecting(false); loadConfig(); }
        }, 1000);
      }
    } catch (err) {
      setOauthConnecting(false);
      setOauthError(err.message || 'Failed to start authorization');
    }
  }

  async function triggerSync(dbOnly = false) {
    setSyncing(true); setError(''); setSyncMsg('');
    try {
      await api.inspectorBackupSync(dbOnly);
      setSyncMsg(t('backup_sync_requested'));
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
  const redirectUri = `${window.location.origin}/api/inspector/backup/oauth/callback`;

  return (
    <AdminPage
      title={t('inspector_backup_title')}
      maxWidth="1200px"
      actions={
        <>
          <AdminButton variant="outline-secondary" size="sm" icon="fas fa-database"
            onClick={() => triggerSync(true)} disabled={syncing || isActive}>
            {t('inspector_backup_db_only')}
          </AdminButton>
          <AdminButton size="sm" onClick={() => triggerSync(false)} disabled={syncing || isActive}
            loading={syncing} loadingLabel={t('inspector_backup_syncing')}
            icon={syncing ? 'fas fa-spinner fa-spin' : 'fas fa-sync-alt'}>
            {t('inspector_backup_sync_now')}
          </AdminButton>
        </>
      }
    >
      <AdminAlert variant="success" message={syncMsg} />
      <AdminAlert message={error} />

      {/* ── Card 1: Sync Configuration ── */}
      <form onSubmit={saveConfig}>
        <AdminCard title={t('backup_config_title')} className="mb-3">
          <div className="row">
            {/* Left: destination + performance */}
            <div className="col-md-6">
              <div className="row">
                <div className="col-sm-5">
                  <AdminInput label={t('backup_config_remote')} value={cfg.remote}
                    onChange={setCfgField('remote')} placeholder="dropbox"
                    hint={t('backup_config_remote_hint')} />
                </div>
                <div className="col-sm-7">
                  <AdminInput label={t('backup_config_remote_path')} value={cfg.remotePath}
                    onChange={setCfgField('remotePath')} placeholder="gallerypack"
                    hint={t('backup_config_remote_path_hint')} />
                </div>
              </div>
              <div className="row">
                <div className="col-sm-5">
                  <AdminInput label={t('backup_config_bwlimit')} value={cfg.bwlimit}
                    onChange={setCfgField('bwlimit')} placeholder="0"
                    hint={t('backup_config_bwlimit_hint')} />
                </div>
                <div className="col-sm-7">
                  <AdminInput label={t('backup_config_db_retention')} type="number"
                    value={cfg.dbRetentionDays} onChange={setCfgField('dbRetentionDays')}
                    hint={t('backup_config_db_retention_hint')} />
                </div>
              </div>
            </div>
            {/* Right: directory toggles */}
            <div className="col-md-6">
              <p className="text-muted mb-2" style={{ fontSize: '0.82rem' }}>{t('backup_config_dirs')}</p>
              <AdminSwitch id="cfg-sync-private"
                label={<><code>private/</code> <span className="text-muted ms-1" style={{ fontSize: '0.78rem' }}>{t('backup_config_dir_private')}</span></>}
                checked={cfg.syncPrivate} onChange={setCfgField('syncPrivate')} />
              <AdminSwitch id="cfg-sync-public"
                label={<><code>public/</code> <span className="text-muted ms-1" style={{ fontSize: '0.78rem' }}>{t('backup_config_dir_public')}</span></>}
                checked={cfg.syncPublic} onChange={setCfgField('syncPublic')} />
              <AdminSwitch id="cfg-sync-internal"
                label={<><code>internal/</code> <span className="text-muted ms-1" style={{ fontSize: '0.78rem' }}>{t('backup_config_dir_internal')}</span></>}
                checked={cfg.syncInternal} onChange={setCfgField('syncInternal')} />
            </div>
          </div>
          <AdminAlert variant="success" message={cfgSaved} />
          <AdminAlert message={cfgError} />
          <AdminButton type="submit" loading={cfgSaving} loadingLabel={t('saving')} icon="fas fa-save">
            {t('save')}
          </AdminButton>
        </AdminCard>
      </form>

      {/* ── Card 2: Dropbox Authentication ── */}
      <AdminCard
        title={t('backup_rclone_title')}
        headerRight={
          rcloneConfigured
            ? <span className="badge bg-success"><i className="fas fa-check me-1" />{t('backup_rclone_ok')}</span>
            : <span className="badge bg-warning text-dark"><i className="fas fa-exclamation-triangle me-1" />{t('backup_rclone_missing')}</span>
        }
        className="mb-3"
      >
        <div className="row">
          {/* Left: setup steps + connect button */}
          <div className="col-md-7">
            <ol className="ps-3 mb-3" style={{ fontSize: '0.85rem', lineHeight: 1.8 }}>
              <li>
                {t('backup_oauth_step1')}{' '}
                <a href="https://www.dropbox.com/developers/apps/create" target="_blank" rel="noreferrer">
                  dropbox.com/developers/apps
                </a>
                {' '}— <em>{t('backup_oauth_step1_detail')}</em>
              </li>
              <li>
                {t('backup_oauth_step2')}{' '}
                <strong>{t('backup_oauth_step2_uri')}</strong>
                <br />
                <code style={{ fontSize: '0.75rem', userSelect: 'all' }}>{redirectUri}</code>
              </li>
              <li>{t('backup_oauth_step3')}</li>
            </ol>

            <form onSubmit={e => { e.preventDefault(); saveConfig(e); }}>
              <div className="row">
                <div className="col-sm-6">
                  <AdminInput
                    label={t('backup_oauth_app_key')}
                    value={cfg.clientId}
                    onChange={setCfgField('clientId')}
                    placeholder="xxxxxxxxxxxx"
                    hint={t('backup_oauth_app_key_hint')}
                    autoComplete="off"
                  />
                </div>
                <div className="col-sm-6">
                  <AdminInput
                    label={t('backup_oauth_app_secret')}
                    labelRight={cfg.clientSecretSet
                      ? <span className="badge bg-secondary" style={{ fontSize: '0.7rem' }}>{t('backup_oauth_secret_set')}</span>
                      : null}
                    type="password"
                    value={clientSecret}
                    onChange={e => setClientSecret(e.target.value)}
                    placeholder={cfg.clientSecretSet ? '••••••••' : 'xxxxxxxxxxxx'}
                    hint={t('backup_oauth_app_secret_hint')}
                    autoComplete="new-password"
                  />
                </div>
              </div>
              <div className="d-flex gap-2 align-items-center flex-wrap mb-2">
                <AdminButton type="submit" variant="outline-secondary" size="sm"
                  loading={cfgSaving} loadingLabel={t('saving')} icon="fas fa-save">
                  {t('backup_oauth_save_credentials')}
                </AdminButton>
                <AdminButton type="button" size="sm" icon="fas fa-dropbox"
                  onClick={connectDropbox}
                  disabled={oauthConnecting || !cfg.clientId.trim()}
                  loading={oauthConnecting}
                  loadingLabel={t('backup_oauth_connecting')}>
                  {t('backup_oauth_connect')}
                </AdminButton>
              </div>
            </form>

            <AdminAlert variant="success" message={oauthMsg} />
            <AdminAlert message={oauthError} />
          </div>

          {/* Right: info box */}
          <div className="col-md-5">
            <div className="p-3 rounded h-100" style={{ background: 'var(--bs-light)', fontSize: '0.8rem' }}>
              <p className="fw-semibold mb-2">
                <i className="fas fa-info-circle me-1 text-primary" />{t('backup_oauth_info_title')}
              </p>
              <ul className="ps-3 mb-0" style={{ lineHeight: 1.7 }}>
                <li>{t('backup_oauth_info_1')}</li>
                <li>{t('backup_oauth_info_2')}</li>
                <li>{t('backup_oauth_info_3')}</li>
                <li>{t('backup_oauth_info_4')}</li>
              </ul>
            </div>
          </div>
        </div>
      </AdminCard>

      {/* ── Status + log row ── */}
      <div className="row">

        <div className="col-lg-5">
          <AdminCard title={t('inspector_backup_status')} className="mb-3">
            {!lastSync && !status?.triggerPending ? (
              <p className="text-muted mb-0" style={{ fontSize: '0.82rem' }}>{t('inspector_backup_never')}</p>
            ) : (
              <>
                <div className="d-flex align-items-center gap-3 mb-3">
                  {syncState && (
                    <i className={STATE_ICON[syncState]}
                      style={{ fontSize: '1.5rem', color: STATE_COLOR[syncState] }} />
                  )}
                  <div>
                    <div className={`fw-semibold text-${STATE_VARIANT[syncState] ?? 'body'}`} style={{ fontSize: '0.95rem' }}>
                      {syncState === 'running' && t('inspector_backup_state_running')}
                      {syncState === 'success' && t('inspector_backup_state_success')}
                      {syncState === 'error'   && t('inspector_backup_state_error')}
                      {syncState === 'pending' && t('inspector_backup_state_pending')}
                    </div>
                    {lastSync?.started_at && (
                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>
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
                  <div className="alert alert-danger py-2 px-3 mb-0 mt-2" style={{ fontSize: '0.78rem' }}>
                    {lastSync.error}
                  </div>
                )}
                {status?.triggerPending && (
                  <div className="alert alert-warning py-2 px-3 mb-0 mt-2" style={{ fontSize: '0.78rem' }}>
                    <i className="fas fa-clock me-1" />{t('inspector_backup_trigger_pending')}
                  </div>
                )}
              </>
            )}
          </AdminCard>

          <AdminCard
            title={t('inspector_backup_storage')}
            headerRight={<span className="text-muted" style={{ fontSize: '0.75rem' }}>{fmtBytes(totalBytes || null)} total</span>}
            className="mb-3"
          >
            {!status ? (
              <p className="text-muted" style={{ fontSize: '0.82rem' }}>{t('loading')}</p>
            ) : (
              <>
                <DiskBar label="private/"  bytes={du.private}  total={totalBytes} colorClass="success" />
                <DiskBar label="public/"   bytes={du.public}   total={totalBytes} colorClass="primary" />
                <DiskBar label="internal/" bytes={du.internal} total={totalBytes} colorClass="info" />
              </>
            )}
          </AdminCard>

          <AdminCard title={t('inspector_backup_db_dumps')} noPadding className="mb-3">
            {!status?.dbDumps?.length ? (
              <p className="text-muted mb-0" style={{ fontSize: '0.82rem', padding: '0.75rem' }}>{t('inspector_backup_no_dumps')}</p>
            ) : (
              <table className="table table-sm table-hover mb-0">
                <tbody>
                  {status.dbDumps.map(d => (
                    <tr key={d.name}>
                      <td style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>{d.name}</td>
                      <td className="text-muted text-end" style={{ fontSize: '0.75rem' }}>{fmtBytes(d.size)}</td>
                      <td className="text-muted text-end" style={{ fontSize: '0.72rem' }}>{timeAgo(d.mtime)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </AdminCard>
        </div>

        <div className="col-lg-7">
          <AdminCard
            title={t('inspector_backup_log')}
            headerRight={
              isActive
                ? <span className="text-primary" style={{ fontSize: '0.72rem' }}>
                    <i className="fas fa-circle fa-beat me-1" style={{ fontSize: '0.5rem' }} />
                    {t('inspector_backup_live')}
                  </span>
                : <span className="text-muted" style={{ fontSize: '0.72rem' }}>{t('inspector_backup_log_hint')}</span>
            }
            className="mb-3"
          >
            <div ref={logRef} style={{
              height: 'calc(100vh - 260px)', overflowY: 'auto',
              fontFamily: 'ui-monospace, monospace', fontSize: '0.72rem',
              lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
              background: 'var(--bs-body-bg)', color: 'var(--bs-body-color)',
              padding: '0.5rem', borderRadius: 4, opacity: 0.9,
            }}>
              {logs || <span className="text-muted">{t('inspector_backup_no_log')}</span>}
            </div>
          </AdminCard>
        </div>

      </div>
    </AdminPage>
  );
}
