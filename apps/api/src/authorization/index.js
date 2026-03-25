// apps/api/src/authorization/index.js — centralized authorization engine
//
// Permission model:
//   Any studio member can read any gallery in their studio.
//   Write/publish/delete/upload are restricted by role.
//
// Studio roles (ascending):  photographer < collaborator < admin < owner
// Project roles (ascending): contributor  < editor < manager
// Gallery roles (ascending): viewer < contributor < editor
//
// See docs/permissions.md for the full matrix.

const STUDIO_ROLES  = ['photographer', 'collaborator', 'admin', 'owner'];
const PROJECT_ROLES = ['contributor', 'editor', 'manager'];
const GALLERY_ROLES = ['viewer', 'contributor', 'editor'];

function isPublic(gallery) {
  return gallery.access === 'public';
}

function hasStudioRole(studioRole, minRole) {
  if (!studioRole) return false;
  return STUDIO_ROLES.indexOf(studioRole) >= STUDIO_ROLES.indexOf(minRole);
}

function hasProjectRole(projectRole, minRole) {
  if (!projectRole) return false;
  return PROJECT_ROLES.indexOf(projectRole) >= PROJECT_ROLES.indexOf(minRole);
}

function isValidStudioRole(role) {
  return STUDIO_ROLES.includes(role);
}

function isValidGalleryRole(role) {
  return GALLERY_ROLES.includes(role);
}

/**
 * Centralized authorization check.
 *
 * @param {object} user     - The request user object ({ id, studio_id, role })
 * @param {string} action   - 'read' | 'write' | 'delete' | 'manage' | 'publish' | 'upload' | 'notify'
 * @param {string} resource - 'gallery' | 'photo' | 'studio' | 'member' | 'project'
 * @param {object} context  - { gallery?, studioRole?, projectRole?, galleryRole?, viewerToken? }
 * @returns {boolean}
 */
export function can(user, action, resource, context = {}) {
  const { gallery, studioRole, projectRole, galleryRole, viewerToken } = context;

  // ── Studio-level actions ─────────────────────────────────────────────────────

  if (resource === 'studio' && action === 'manage') {
    return studioRole === 'owner' || studioRole === 'admin';
  }

  if (resource === 'member' && action === 'manage') {
    return studioRole === 'owner' || studioRole === 'admin';
  }

  // ── Project-level actions ────────────────────────────────────────────────────

  if (resource === 'project' && action === 'read') {
    return isValidStudioRole(studioRole);
  }

  if (resource === 'project' && action === 'write') {
    return hasStudioRole(studioRole, 'admin') || hasProjectRole(projectRole, 'manager');
  }

  if (resource === 'project' && action === 'delete') {
    return studioRole === 'admin' || studioRole === 'owner';
  }

  if (resource === 'project' && action === 'manage') {
    return hasStudioRole(studioRole, 'admin') || hasProjectRole(projectRole, 'manager');
  }

  // ── Gallery-level actions ────────────────────────────────────────────────────

  if (resource === 'gallery' && action === 'read') {
    if (!gallery) return false;
    if (isPublic(gallery)) return true;
    if (viewerToken) return true;
    if (isValidStudioRole(studioRole)) return true; // Option A: any studio member reads all galleries
    if (isValidGalleryRole(galleryRole)) return true;
    return false;
  }

  if (resource === 'gallery' && action === 'write') {
    if (hasStudioRole(studioRole, 'collaborator')) return true;
    if (hasProjectRole(projectRole, 'editor')) return true;
    if (galleryRole === 'editor') return true;
    return false;
  }

  if (resource === 'gallery' && action === 'delete') {
    return studioRole === 'admin' || studioRole === 'owner';
  }

  if (resource === 'gallery' && action === 'publish') {
    if (hasStudioRole(studioRole, 'collaborator')) return true;
    if (hasProjectRole(projectRole, 'editor')) return true;
    if (galleryRole === 'editor') return true;
    return false;
  }

  // notify = photographer signals "photos are ready" to studio admins
  if (resource === 'gallery' && action === 'notify') {
    if (galleryRole === 'contributor' || galleryRole === 'editor') return true;
    if (isValidStudioRole(studioRole)) return true;
    return false;
  }

  // ── Photo-level actions ──────────────────────────────────────────────────────

  if (resource === 'photo' && action === 'upload') {
    if (hasStudioRole(studioRole, 'collaborator')) return true;
    if (hasProjectRole(projectRole, 'contributor')) return true;
    if (galleryRole === 'contributor' || galleryRole === 'editor') return true;
    return false;
  }

  if (resource === 'photo' && action === 'delete') {
    if (hasStudioRole(studioRole, 'collaborator')) return true;
    if (hasProjectRole(projectRole, 'editor')) return true;
    if (galleryRole === 'editor') return true;
    return false;
  }

  return false;
}
