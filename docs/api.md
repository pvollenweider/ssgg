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

## Studios

### `GET /api/studios/me`
Returns the current studio (resolved from host or session context).

### `PATCH /api/studios/me`
Update studio name, locale, country, or slug.
```json
{ "name": "Circus Studio", "locale": "fr", "country": "CH" }
```

### `GET /api/studios/members`
List studio members with their roles and gallery assignments.

### `PUT /api/studios/members/:userId`
Update a member's studio role.
```json
{ "role": "admin" }
```

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
Create an invitation.
```json
{
  "email": "photographer@example.com",
  "role": "photographer",
  "galleryId": "..."
}
```

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
List all studios.

### `POST /api/platform/studios`
Create a studio with optional owner invitation.
```json
{ "name": "New Studio", "slug": "new-studio", "plan": "free", "ownerEmail": "owner@example.com" }
```

### `PATCH /api/platform/studios/:id`
Update studio name, slug, or plan.

### `DELETE /api/platform/studios/:id`
Delete a studio and all its data.

### `POST /api/platform/studios/:id/set-default`
Make this studio the default (used in single-mode and as hostname fallback).

### `POST /api/platform/switch/:studioId`
Switch the current studio context (sets `studio_override` cookie).

### `DELETE /api/platform/switch`
Clear the studio override cookie and return to default.

### `GET /api/platform/users`
List all users across all studios.

### `PATCH /api/platform/users/:id`
Grant or revoke superadmin.
```json
{ "platformRole": "superadmin" }
```

---

## Public endpoints (no auth required)

### `GET /api/public/gallery/:slug`
Get gallery data for public display (respects access mode).

### `GET /api/health`
Returns `{ "ok": true }`.
