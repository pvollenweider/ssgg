// Copyright (c) 2026 Philippe Vollenweider
//
// This file is part of the GalleryPack commercial platform.
// This source code is proprietary and confidential.
// Use, reproduction, or distribution requires a valid commercial license.
// Unauthorized use is strictly prohibited.

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { api } from '../lib/api.js';
import { useT } from '../lib/I18nContext.jsx';
import LoginLayout from '../components/LoginLayout.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const t = useT();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      if (user?.role === 'photographer') {
        const galleries = await api.myGalleries().catch(() => []);
        navigate(galleries[0] ? `/galleries/${galleries[0].id}` : '/');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.message || t('login_failed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <LoginLayout title={t('login_sign_in')}>
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
        <div className="mb-3">
          <div className="input-group">
            <input
              type="password"
              className="form-control"
              placeholder={t('login_password')}
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
            <span className="input-group-text"><i className="fas fa-lock" /></span>
          </div>
        </div>
        {error && (
          <div className="alert alert-danger py-2 px-3 mb-3" role="alert" style={{ fontSize: '0.85rem' }}>
            {error}
          </div>
        )}
        <button type="submit" className="btn btn-primary w-100" disabled={loading}>
          {loading ? <><i className="fas fa-spinner fa-spin me-1" />{t('login_signing_in')}</> : t('login_sign_in')}
        </button>
      </form>
      <p className="mt-3 mb-0 text-center">
        <Link to="/forgot-password" className="text-muted" style={{ fontSize: '0.875rem' }}>
          {t('login_forgot_password')}
        </Link>
      </p>
    </LoginLayout>
  );
}
