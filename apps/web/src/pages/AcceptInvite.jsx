// Copyright (c) 2026 Philippe Vollenweider
//
// This file is part of the GalleryPack commercial platform.
// This source code is proprietary and confidential.
// Use, reproduction, or distribution requires a valid commercial license.
// Unauthorized use is strictly prohibited.

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { useT } from '../lib/I18nContext.jsx';
import LoginLayout from '../components/LoginLayout.jsx';

const ROLE_COLORS = { owner: '#7c3aed', admin: '#2563eb', editor: '#0891b2', photographer: '#059669' };

export default function AcceptInvite() {
  const { token }   = useParams();
  const navigate    = useNavigate();
  const { setUser } = useAuth();
  const t = useT();

  const [invite,    setInvite]    = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [password,  setPassword]  = useState('');
  const [password2, setPassword2] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.getInviteInfo(token)
      .then(setInvite)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (password !== password2) { setError(t('profile_passwords_mismatch')); return; }
    if (password.length < 8)    { setError(t('invite_error_min_length')); return; }
    setError('');
    setSubmitting(true);
    try {
      await api.acceptInvite(token, password);
      const me = await api.me();
      setUser(me);
      if (invite?.galleryId) {
        navigate(`/galleries/${invite.galleryId}`, { replace: true });
      } else if (me?.role === 'photographer') {
        const galleries = await api.myGalleries().catch(() => []);
        navigate(galleries[0] ? `/galleries/${galleries[0].id}` : '/', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (e) {
      setError(e.message);
      setSubmitting(false);
    }
  }

  const ROLE_LABELS = {
    owner:        t('role_owner'),
    admin:        t('role_admin'),
    editor:       t('role_editor'),
    photographer: t('role_photographer'),
  };

  if (loading) return (
    <LoginLayout>
      <div className="text-center">
        <i className="fas fa-spinner fa-spin fa-2x text-muted" />
      </div>
    </LoginLayout>
  );

  if (error && !invite) return (
    <LoginLayout>
      <div className="text-center">
        <div className="alert alert-danger py-2 px-3 mb-3" style={{ fontSize: '0.85rem' }}>
          {error || t('invite_invalid_link')}
        </div>
        <p className="mb-0">
          <a href="/login" className="text-muted" style={{ fontSize: '0.875rem' }}>
            {t('back_to_login')}
          </a>
        </p>
      </div>
    </LoginLayout>
  );

  if (invite?.alreadyAccepted) return (
    <LoginLayout>
      <div className="text-center">
        <p className="text-muted mb-3">{t('invite_already_accepted')}</p>
        <p className="mb-0">
          <a href="/login" className="text-muted" style={{ fontSize: '0.875rem' }}>
            {t('invite_go_login')}
          </a>
        </p>
      </div>
    </LoginLayout>
  );

  return (
    <LoginLayout maxWidth={420}>
      <p className="text-center fw-bold mb-1">{t('invite_title')}</p>
      <p className="text-center text-muted mb-1" style={{ fontSize: '0.875rem' }}>
        {t('invite_subtitle', { organization: invite?.organizationName || invite?.studioName || '...' })}{' '}
        <span
          className="badge"
          style={{
            background: (ROLE_COLORS[invite?.role] || '#888') + '22',
            color: ROLE_COLORS[invite?.role] || '#888',
            fontWeight: 600,
          }}
        >
          {ROLE_LABELS[invite?.role] || invite?.role}
        </span>
      </p>
      {invite?.galleryTitle && (
        <p className="text-center text-muted mb-1" style={{ fontSize: '0.875rem' }}>
          {t('invite_for_gallery', { gallery: invite.galleryTitle })}
        </p>
      )}
      <p className="text-center text-muted mb-3" style={{ fontSize: '0.82rem' }}>{invite?.email}</p>

      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <div className="input-group">
            <input
              type="password"
              className="form-control"
              placeholder={t('invite_password_placeholder')}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required minLength={8} autoFocus
            />
            <span className="input-group-text"><i className="fas fa-lock" /></span>
          </div>
        </div>
        <div className="mb-3">
          <div className="input-group">
            <input
              type="password"
              className="form-control"
              placeholder={t('invite_confirm_placeholder')}
              value={password2}
              onChange={e => setPassword2(e.target.value)}
              required
            />
            <span className="input-group-text"><i className="fas fa-lock" /></span>
          </div>
        </div>
        {error && (
          <div className="alert alert-danger py-2 px-3 mb-3" style={{ fontSize: '0.85rem' }}>
            {error}
          </div>
        )}
        <button type="submit" className="btn btn-primary w-100" disabled={submitting}>
          {submitting
            ? <><i className="fas fa-spinner fa-spin me-1" />{t('invite_creating')}</>
            : t('invite_create')}
        </button>
      </form>
    </LoginLayout>
  );
}
