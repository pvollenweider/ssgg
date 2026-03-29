// Copyright (c) 2026 Philippe Vollenweider
//
// This file is part of the GalleryPack commercial platform.
// This source code is proprietary and confidential.
// Use, reproduction, or distribution requires a valid commercial license.
// Unauthorized use is strictly prohibited.

/**
 * Replace :param placeholders with actual route param values.
 */
export function interpolatePath(path, params = {}) {
  return path.replace(/:(\w+)/g, (_, key) => params[key] ?? `:${key}`);
}

/**
 * Detect the active management scope from the current pathname.
 * Hierarchy: gallery > project > organization > platform
 * @returns {'platform'|'organization'|'project'|'gallery'|null}
 */
export function detectScope(pathname) {
  if (pathname.startsWith('/admin/platform')) return 'platform';
  if (/^\/admin\/organizations\/[^/]+\/projects\/[^/]+\/galleries\/[^/]+/.test(pathname)) return 'gallery';
  if (/^\/admin\/organizations\/[^/]+\/projects\/[^/]+/.test(pathname)) return 'project';
  if (/^\/admin\/organizations\/[^/]+/.test(pathname)) return 'organization';
  return null;
}

/**
 * Extract all scope params from the hierarchical URL.
 * @returns {{ orgId?: string, projectId?: string, galleryId?: string }}
 */
export function extractScopeParams(pathname) {
  const gallery = pathname.match(/^\/admin\/organizations\/([^/]+)\/projects\/([^/]+)\/galleries\/([^/]+)/);
  if (gallery) return { orgId: gallery[1], projectId: gallery[2], galleryId: gallery[3] };

  const project = pathname.match(/^\/admin\/organizations\/([^/]+)\/projects\/([^/]+)/);
  if (project) return { orgId: project[1], projectId: project[2] };

  const org = pathname.match(/^\/admin\/organizations\/([^/]+)/);
  if (org) return { orgId: org[1] };

  return {};
}

/** Segment label overrides for breadcrumb generation */
const SEGMENT_LABELS = {
  admin:         null,
  platform:      'Platform',
  smtp:          'SMTP',
  license:       'License',
  branding:      'Branding',
  organizations: 'Organizations',
  projects:      'Projects',
  galleries:     'Galleries',
  general:       null,
  defaults:      null,
  access:        null,
  settings:      'Settings',
  team:          'Team',
  delivery:      null,
  downloads:     null,
  upload:        null,
  publish:       null,
  statistics:    'Statistics',
  insights:      null,
  overview:      null,
  photos:        'Photos',
  inbox:         null,
  jobs:          'Jobs',
  profile:       'Profile',
};

/**
 * Build a breadcrumb array from a pathname.
 */
export function buildBreadcrumb(pathname, entityNames = {}) {
  const segments = pathname.split('/').filter(Boolean);
  const crumbs = [];
  let path = '';

  for (const seg of segments) {
    path += '/' + seg;

    if (entityNames[seg]) {
      crumbs.push({ label: entityNames[seg], href: path });
      continue;
    }

    const label = SEGMENT_LABELS[seg];
    if (label === null || label === undefined && seg.length > 8) continue;
    if (label === undefined) {
      crumbs.push({ label: seg.slice(0, 8) + '…', href: path });
    } else {
      crumbs.push({ label, href: path });
    }
  }

  return crumbs;
}
