# REST API reference

All API routes are under `/api`. Authentication is via HTTP-only session cookie obtained from `POST /api/auth/login`.

---

## Authentication

### `POST /api/auth/login`
```json
{ "email": "admin@example.com", "password": "..." }
```
Returns the authenticated user object and sets a session cookie.

### `POST /api/auth/logout`
Clears the session cookie.

### `GET /api/auth/me`
Returns the current user with studio context, roles, and locale.

### `PATCH /api/auth/me`
Update name, locale, or password.
```json
{ "name": "Alice", "locale": "fr" }
{ "currentPassword": "old", "newPassword": "new" }
```

### `POST /api/auth/forgot`
Send a password reset email.
```json
{ "email": "user@example.com" }
```

### `POST /api/auth/magic`
Request a magic login link by email.

---

## Organizations

Organizations (also referred to as "studios" in legacy routes and the database) are the top-level tenant unit.

### `GET /api/organizations`
List organizations. Superadmins see all; regular users see only their own.

### `POST /api/organizations`
Create an organization (superadmin only).
```json
{ "name": "Circus Studio", "slug": "circus", "plan": "free", "locale": "fr", "country": "CH" }
```

### `GET /api/organizations/:id`
Get organization details including member list.

### `PATCH /api/organizations/:id`
Update name, slug, plan, locale, or country (admin+ role required).
```json
{ "name": "Circus Studio", "locale": "fr", "country": "CH" }
```

### `DELETE /api/organizations/:id`
Delete an organization (superadmin only; cannot delete the default organization).

### `GET /api/organizations/:id/members`
List members with their roles (admin+ only).

### `PUT /api/organizations/:id/members/:userId`
Upsert a member's role (admin+ required; only owners can assign the `owner` role).
```json
{ "role": "admin" }
```

### `DELETE /api/organizations/:id/members/:userId`
Remove a member (owner only).

### `GET /api/organizations/:id/domains`
List custom domains for this organization.

### `POST /api/organizations/:id/domains`
Add a custom domain (admin+).
```json
{ "domain": "photos.example.com", "isPrimary": true }
```

### `DELETE /api/organizations/:id/domains/:domain`
Remove a custom domain (admin+).

---

## Studios (legacy)

The `/api/studios` endpoints are a legacy alias for organization management. Prefer `/api/organizations` for new integrations.

### `GET /api/studios/me`
Returns the current studio (resolved from host or session context).

### `PATCH /api/studios/me`
Update studio name, locale, country, or slug.

### `GET /api/studios/members`
List studio members with their roles.

### `PUT /api/studios/members/:userId`
Update a member's studio role.

### `DELETE /api/studios/members/:userId`
Remove a member from the studio.

---

## Projects

### `GET /api/projects`
List projects in the current studio.

### `POST /api/projects`
Create a project.
```json
{ "name": "Summer 2025", "slug": "summer-2025" }
```

### `GET /api/projects/:id`
Get a project with its galleries.

### `PATCH /api/projects/:id`
Update project name or slug.

### `DELETE /api/projects/:id`
Delete a project and all its galleries.

---

## Galleries

### `GET /api/galleries`
List galleries accessible to the current user.

### `POST /api/galleries`
Create a gallery.
```json
{
  "title": "Select",
  "slug": "select",
  "projectId": "...",
  "access": "private"
}
```

### `GET /api/galleries/:id`
Get gallery details.

### `PATCH /api/galleries/:id`
Update gallery metadata (title, slug, access, author, description, etc.).

### `DELETE /api/galleries/:id`
Delete a gallery and its photos.

### `POST /api/galleries/:id/build`
Queue a build job for this gallery.

### `GET /api/galleries/:id/members`
List users with explicit gallery roles.

### `PUT /api/galleries/:id/members/:userId`
Set a gallery role for a user.
```json
{ "role": "contributor" }
```

### `DELETE /api/galleries/:id/members/:userId`
Remove a user's gallery role.

---

## Photos

### `GET /api/galleries/:id/photos`
List photos in a gallery.

### `POST /api/galleries/:id/photos`
Upload photos (multipart/form-data, field name `photos`).

### `DELETE /api/galleries/:id/photos/:photoId`
Delete a photo.

### `PATCH /api/galleries/:id/photos/:photoId`
Update photo metadata (caption, etc.).

---

## Build jobs

### `GET /api/jobs/:jobId`
Get job status and metadata.

### `GET /api/jobs/:jobId/stream`
SSE stream of build log events. Event types: `log`, `done`, `error`, `close`.

```
event: log
data: {"data":"Processing photo 3/12"}

event: done
data: {"data":"{\"photoCount\":12,\"distName\":\"project/gallery\",\"durationMs\":8432}"}

event: close
data: {"status":"done"}
```

---

## Invitations

### `GET /api/invitations`
List pending invitations for the current studio.

### `POST /api/invitations`
Create an invitation. An invite email is sent if SMTP is configured; the token is also returned in the response for copyable-link sharing.
```json
{
  "email": "photographer@example.com",
  "name": "Jane Smith",
  "role": "photographer",
  "galleryId": "...",
  "galleryRole": "contributor"
}
```
Valid roles: `owner`, `admin`, `collaborator`, `photographer`. `name` is optional (pre-fills the invitee's display name). `galleryId` + `galleryRole` optionally assign the new member directly to a gallery.

### `DELETE /api/invitations/:id`
Cancel a pending invitation.

### `GET /api/invitations/accept/:token`
Get invitation details (public — validates token without consuming).

### `POST /api/invitations/accept/:token`
Accept an invitation, create account, and join the studio.
```json
{ "password": "newpassword" }
```

---

## Settings

### `GET /api/settings`
Get studio-level settings (defaults for new galleries, SMTP config, etc.).

### `PUT /api/settings`
Save studio settings.

### `POST /api/settings/smtp/test`
Send a test email using the current SMTP configuration.

---

## Viewer tokens

### `GET /api/access/viewer-tokens`
List viewer tokens for the current studio.

### `POST /api/access/viewer-tokens`
Create a viewer token.
```json
{
  "scopeType": "gallery",
  "scopeId": "...",
  "expiresAt": 1800000000000
}
```

### `DELETE /api/access/viewer-tokens/:id`
Revoke a viewer token.

---

## Platform (superadmin only)

### `GET /api/platform/studios`
List all studios (organizations).

### `POST /api/platform/studios`
Create a studio with optional owner invitation.
```json
{ "name": "New Studio", "slug": "new-studio", "plan": "free", "ownerEmail": "owner@example.com" }
```
Enforces the `organization_limit` from the active license.

### `PATCH /api/platform/studios/:id`
Update studio name, slug, or plan.

### `DELETE /api/platform/studios/:id`
Delete a studio and all its data. Cannot delete the default studio.

### `POST /api/platform/studios/:id/set-default`
Make this studio the default (used in single-mode and as hostname fallback).

### `POST /api/platform/switch/:studioId`
Switch the current studio context (sets `studio_override` cookie, valid 8 hours).

### `DELETE /api/platform/switch`
Clear the studio override cookie and return to default.

### `GET /api/platform/users`
List all users across all studios.

### `PATCH /api/platform/users/:id`
Grant or revoke superadmin.
```json
{ "platformRole": "superadmin" }
```

### `GET /api/platform/license`
Returns current license status (source, plan, limits, features).

### `GET /api/platform/license/usage`
Returns current usage vs. quota limits (orgs, galleries, collaborators, storage GB).

### `POST /api/platform/license`
Install a new license from its JSON string.
```json
{ "licenseJson": "{ ... signed license payload ... }" }
```

---

## Personal upload tokens

### `GET /api/tokens`
List the current user's personal upload tokens.

### `POST /api/tokens`
Create a personal upload token.
```json
{ "name": "My CLI token", "scopeType": "gallery", "scopeId": "...", "expiresAt": 1800000000000 }
```

### `DELETE /api/tokens/:id`
Revoke a personal upload token.

---

## Insights

### `GET /api/galleries/:id/focal-stats`
Returns focal-length distribution statistics and AI-generated lens insights for all photos in a gallery. Requires read access to the gallery.

### `GET /api/galleries/:id/insights`
Returns aggregated photo statistics (camera, aperture, ISO, shutter speed) for the gallery.

---

## Gallery maintenance

### `POST /api/galleries/:id/maintenance/bootstrap-thumbnails`
Re-queue thumbnail generation for all photos in the gallery that are missing thumbnails. Requires admin access.

---

## Public endpoints (no auth required)

### `GET /api/public/gallery/:slug`
Get gallery data for public display (respects access mode).

### `GET /api/health`
Returns `{ "ok": true, "db": "connected", "storage": "ok", "worker": "idle|running" }`.
