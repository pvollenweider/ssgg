// Copyright (c) 2026 Philippe Vollenweider
//
// This file is part of the GalleryPack commercial platform.
// This source code is proprietary and confidential.
// Use, reproduction, or distribution requires a valid commercial license.
// Unauthorized use is strictly prohibited.

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useT } from '../lib/I18nContext.jsx';
import LoginLayout from '../components/LoginLayout.jsx';

export default function ResetPassword() {
  const { token }   = useParams();
  const navigate    = useNavigate();
  const t = useT();
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [password2, setPassword2] = useState('');
  const [error,     setError]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [checking,  setChecking]  = useState(true);
  const [invalid,   setInvalid]   = useState(false);

  useEffect(() => {
    api.checkResetToken(token)
      .then(d => setEmail(d.email))
      .catch(() => setInvalid(true))
      .finally(() => setChecking(false));
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password !== password2) return setError(t('profile_passwords_mismatch'));
    setLoading(true);
    try {
      await api.resetPassword(token, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (checking) return (
    <LoginLayout>
      <div className="text-center">
        <i className="fas fa-spinner fa-spin fa-2x text-muted" />
      </div>
    </LoginLayout>
  );

  return (
    <LoginLayout>
      {invalid ? (
        <>
          <p className="text-danger text-center mb-3">{t('reset_invalid')}</p>
          <p className="text-center mt-3 mb-0">
            <Link to="/login" className="text-muted" style={{ fontSize: '0.875rem' }}>
              {t('back_to_login')}
            </Link>
          </p>
        </>
      ) : (
        <>
          <p className="text-muted mb-3" style={{ fontSize: '0.875rem' }}>{t('reset_heading', { email })}</p>
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <div className="input-group">
                <input
                  type="password"
                  className="form-control"
                  placeholder={t('reset_new_placeholder')}
                  autoComplete="new-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  minLength={8}
                  required
                />
                <span className="input-group-text"><i className="fas fa-lock" /></span>
              </div>
            </div>
            <div className="mb-3">
              <div className="input-group">
                <input
                  type="password"
                  className="form-control"
                  placeholder={t('reset_confirm_placeholder')}
                  autoComplete="new-password"
                  value={password2}
                  onChange={e => setPassword2(e.target.value)}
                  minLength={8}
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
            <button type="submit" className="btn btn-primary w-100" disabled={loading}>
              {loading
                ? <><i className="fas fa-spinner fa-spin me-1" />{t('saving')}</>
                : t('reset_submit')}
            </button>
          </form>
        </>
      )}
    </LoginLayout>
  );
}
