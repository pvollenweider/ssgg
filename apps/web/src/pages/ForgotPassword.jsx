// Copyright (c) 2026 Philippe Vollenweider
//
// This file is part of the GalleryPack commercial platform.
// This source code is proprietary and confidential.
// Use, reproduction, or distribution requires a valid commercial license.
// Unauthorized use is strictly prohibited.

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useT } from '../lib/I18nContext.jsx';
import LoginLayout from '../components/LoginLayout.jsx';

export default function ForgotPassword() {
  const t = useT();
  const [email,     setEmail]     = useState('');
  const [mode,      setMode]      = useState('magic'); // 'magic' | 'reset'
  const [sent,      setSent]      = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error,     setError]     = useState('');
  const [loading,   setLoading]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = mode === 'magic'
        ? await api.requestMagicLink(email)
        : await api.forgotPassword(email);
      setEmailSent(res.emailSent !== false);
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <LoginLayout>
      {sent ? (
        <>
          {emailSent ? (
            <p className="text-muted text-center mb-3">
              {mode === 'magic' ? t('forgot_magic_sent', { email }) : t('forgot_reset_sent', { email })}
            </p>
          ) : (
            <p className="text-warning text-center mb-3">{t('forgot_no_smtp')}</p>
          )}
          <div className="text-center">
            <Link to="/login" className="btn btn-outline-secondary btn-sm">{t('back_to_login')}</Link>
          </div>
        </>
      ) : (
        <>
          {/* Mode toggle */}
          <div className="btn-group btn-group-sm d-flex mb-3" role="group">
            <button
              type="button"
              className={`btn ${mode === 'magic' ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => setMode('magic')}
            >{t('forgot_mode_magic')}</button>
            <button
              type="button"
              className={`btn ${mode === 'reset' ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => setMode('reset')}
            >{t('forgot_mode_reset')}</button>
          </div>

          <p className="text-muted mb-3" style={{ fontSize: '0.875rem' }}>
            {mode === 'magic' ? t('forgot_magic_desc') : t('forgot_reset_desc')}
          </p>

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <div className="input-group">
                <input
                  type="email"
                  className="form-control"
                  placeholder={t('login_email')}
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
                <span className="input-group-text"><i className="fas fa-envelope" /></span>
              </div>
            </div>
            {error && (
              <div className="alert alert-danger py-2 px-3 mb-3" style={{ fontSize: '0.85rem' }}>
                {error}
              </div>
            )}
            <button type="submit" className="btn btn-primary w-100" disabled={loading}>
              {loading ? t('sending') : t('forgot_send')}
            </button>
          </form>
          <p className="mt-3 mb-0 text-center">
            <Link to="/login" className="text-muted" style={{ fontSize: '0.875rem' }}>{t('back_to_login')}</Link>
          </p>
        </>
      )}
    </LoginLayout>
  );
}
