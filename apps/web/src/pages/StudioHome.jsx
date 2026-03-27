// Copyright (c) 2026 Philippe Vollenweider
//
// This file is part of the GalleryPack commercial platform.
// This source code is proprietary and confidential.
// Use, reproduction, or distribution requires a valid commercial license.
// Unauthorized use is strictly prohibited.

// Page d'accueil d'un studio : projets + équipe
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { useT } from '../lib/I18nContext.jsx';
import { Toast } from '../components/Toast.jsx';

function slugify(str) {
  return str.toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const ROLE_BADGE = {
  owner:        'g-purple',
  admin:        'g-primary',
  collaborator: 'g-info',
  photographer: 'g-success',
};
const ROLE_COLOR = { owner: '#7c3aed', admin: '#2563eb', collaborator: '#0891b2', photographer: '#059669' };
const CAN_ADMIN  = ['admin', 'owner'];

export default function StudioHome() {
  const t                     = useT();
  const navigate              = useNavigate();
  const { user, setUser, logout } = useAuth();
  const isSuperadmin          = user?.platformRole === 'superadmin';
  const canAdmin              = CAN_ADMIN.includes(user?.studioRole) || isSuperadmin;

  // Projects
  const [projects,      setProjects]      = useState([]);
  const [projectsLoad,  setProjectsLoad]  = useState(true);
  const [creatingProj,  setCreatingProj]  = useState(false);
  const [projName,      setProjName]      = useState('');
  const [projSlug,      setProjSlug]      = useState('');
  const [projSlugTouched, setProjSlugTouched] = useState(false);

  // Team
  const [members,       setMembers]       = useState([]);
  const [membersLoad,   setMembersLoad]   = useState(true);
  const [invEmail,      setInvEmail]      = useState('');
  const [invRole,       setInvRole]       = useState('collaborator');
  const [inviting,      setInviting]      = useState(false);
  const [inviteLink,    setInviteLink]    = useState('');

  const [toast,         setToast]         = useState('');

  const ROLE_LABELS = {
    photographer: t('role_photographer'),
    collaborator: t('role_collaborator'),
    admin:        t('role_admin'),
    owner:        t('role_owner'),
  };

  const loadProjects = useCallback(async () => {
    setProjectsLoad(true);
    try { setProjects(await api.listProjects()); }
    catch (e) { setToast(e.message); }
    finally { setProjectsLoad(false); }
  }, []);

  const loadMembers = useCallback(async () => {
    if (!canAdmin) { setMembersLoad(false); return; }
    setMembersLoad(true);
    try { setMembers(await api.listStudioMembers()); }
    catch (e) { setToast(e.message); }
    finally { setMembersLoad(false); }
  }, [canAdmin]);

  useEffect(() => { loadProjects(); loadMembers(); }, [loadProjects, loadMembers]);

  function handleProjNameChange(v) {
    setProjName(v);
    if (!projSlugTouched) setProjSlug(slugify(v));
  }

  async function handleCreateProject(e) {
    e.preventDefault();
    try {
      const p = await api.createProject({ name: projName.trim(), slug: projSlug || slugify(projName) });
      setProjects(ps => [...ps, p]);
      setCreatingProj(false); setProjName(''); setProjSlug(''); setProjSlugTouched(false);
      navigate(`/projects/${p.id}`);
    } catch (err) { setToast(err.message); }
  }

  async function handleDeleteProject(id) {
    if (!confirm(t('projects_confirm_delete'))) return;
    try {
      await api.deleteProject(id);
      setProjects(ps => ps.filter(p => p.id !== id));
      setToast(t('projects_toast_deleted'));
    } catch (e) { setToast(e.message); }
  }

  async function handleRoleChange(userId, role) {
    try {
      await api.updateStudioMember(userId, role);
      setMembers(ms => ms.map(m => m.user.id === userId ? { ...m, role } : m));
    } catch (e) { setToast(e.message); }
  }

  async function handleRemoveMember(userId) {
    if (!confirm(t('team_confirm_remove'))) return;
    try {
      await api.removeStudioMember(userId);
      setMembers(ms => ms.filter(m => m.user.id !== userId));
      setToast(t('team_toast_member_removed'));
    } catch (e) { setToast(e.message); }
  }

  async function handleInvite(e) {
    e.preventDefault();
    setInviting(true); setInviteLink('');
    try {
      const inv = await api.createInvitation({ email: invEmail, role: invRole });
      setInviteLink(`${window.location.origin}/admin/invite/${inv.token}`);
      setInvEmail('');
      await loadMembers();
      setToast(t('team_toast_role_updated'));
    } catch (e) { setToast(e.message); }
    finally { setInviting(false); }
  }

  async function handleExitSwitch() {
    await api.exitStudioSwitch();
    const me = await api.me();
    setUser(me);
    navigate('/');
  }

  const ownerCount = members.filter(m => m.role === 'owner').length;

  return (
    <>
      {/* Content Header */}
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2 align-items-center">
            <div className="col-sm-6">
              <h1 className="m-0">
                {user?.studioName || t('studio_untitled')}
                <span className="text-muted ms-2" style={{ fontSize: '0.875rem' }}>
                  / {t('studio_projects_title')}
                </span>
              </h1>
            </div>
            <div className="col-sm-6 text-sm-end">
              {canAdmin && (
                <button className="btn btn-primary btn-sm" onClick={() => setCreatingProj(v => !v)}>
                  <i className="fas fa-plus me-1" />{t('projects_new')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">
          <div className="row">

            {/* ── Projects ── */}
            <div className="col-12">
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">
                    <i className="fas fa-folder me-2" />{t('studio_projects_title')}
                  </h3>
                </div>
                <div className="card-body">
                  {creatingProj && (
                    <form className="mb-4 p-3 bg-light rounded border" onSubmit={handleCreateProject}>
                      <div className="row align-items-center">
                        <div className="col">
                          <input
                            className="form-control form-control-sm"
                            placeholder={t('projects_name_placeholder')}
                            value={projName}
                            onChange={e => handleProjNameChange(e.target.value)}
                            autoFocus required
                          />
                        </div>
                        <div className="col-auto">
                          <input
                            className="form-control form-control-sm"
                            style={{ fontFamily: 'monospace', maxWidth: 160 }}
                            placeholder="slug"
                            value={projSlug}
                            onChange={e => { setProjSlug(e.target.value); setProjSlugTouched(true); }}
                          />
                        </div>
                        <div className="col-auto">
                          <button className="btn btn-primary btn-sm me-1" type="submit">{t('create')}</button>
                          <button className="btn btn-secondary btn-sm" type="button" onClick={() => setCreatingProj(false)}>{t('cancel')}</button>
                        </div>
                      </div>
                    </form>
                  )}

                  {projectsLoad ? (
                    <div className="text-center text-muted py-4">
                      <i className="fas fa-spinner fa-spin" /> {t('loading')}
                    </div>
                  ) : projects.length === 0 ? (
                    <div className="text-center py-4 text-muted">
                      <i className="fas fa-folder-open fa-3x mb-3 d-block" style={{ opacity: 0.3 }} />
                      <p>{t('studio_no_projects')}</p>
                      {canAdmin && (
                        <button className="btn btn-primary btn-sm" onClick={() => setCreatingProj(true)}>
                          {t('studio_create_first_project')}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="row">
                      {projects.map(p => (
                        <div key={p.id} className="col-sm-6 col-md-4 col-lg-3">
                          <div
                            className="card card-outline card-secondary mb-3"
                            style={{ cursor: 'pointer' }}
                            onClick={() => navigate(`/projects/${p.id}`)}
                          >
                            <div className="card-body py-3 px-3">
                              <div className="d-flex justify-content-between align-items-start">
                                <div>
                                  <div className="fw-bold">{p.name}</div>
                                  <small className="text-muted" style={{ fontFamily: 'monospace' }}>{p.slug}</small>
                                </div>
                                {canAdmin && (
                                  <button
                                    className="btn btn-xs btn-link text-danger p-0"
                                    onClick={e => { e.stopPropagation(); handleDeleteProject(p.id); }}
                                    title={t('delete')}
                                  ><i className="fas fa-times" /></button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>


          </div>
        </div>
      </section>
      <Toast message={toast} onDone={() => setToast('')} />
    </>
  );
}
