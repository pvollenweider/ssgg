# Roles and permissions

GalleryPack has three independent role scopes. A user can hold roles at multiple levels simultaneously.

---

## Platform roles

Assigned to users at the platform level (across all studios).

| Role | What they can do |
|---|---|
| `superadmin` | Create/delete studios, switch studio context, manage all users |
| *(none)* | Regular studio member |

---

## Studio roles

Assigned per studio. Hierarchy from lowest to highest: `photographer < collaborator < admin < owner`.

| Role | Create galleries | Upload photos | Build & publish | Manage members | Manage settings |
|---|---|---|---|---|---|
| `photographer` | — | Own galleries only | — | — | — |
| `collaborator` | ✓ | ✓ | ✓ | — | — |
| `admin` | ✓ | ✓ | ✓ | ✓ | — |
| `owner` | ✓ | ✓ | ✓ | ✓ | ✓ |

---

## Project roles

Assigned per project. Used to give a user access to all galleries in a project without a full studio membership.

| Role | Read | Upload | Edit/build | Manage members |
|---|---|---|---|---|
| `contributor` | ✓ | ✓ | — | — |
| `editor` | ✓ | ✓ | ✓ | — |
| `manager` | ✓ | ✓ | ✓ | ✓ |

---

## Gallery roles

Assigned per gallery. Finest-grained access control.

| Role | View | Upload | Edit/build | Manage access |
|---|---|---|---|---|
| `viewer` | ✓ | — | — | — |
| `contributor` | ✓ | ✓ | — | — |
| `editor` | ✓ | ✓ | ✓ | ✓ |

---

## Access resolution

When a user requests a resource, GalleryPack checks permissions in this order and grants access if **any** check passes:

1. Is the user a **superadmin**? → full access
2. Does the user have a **studio role** ≥ required?
3. Does the user have a **project role** sufficient for this action?
4. Does the user have a **gallery role** sufficient for this action?
5. Is there a valid **viewer token** scoped to this gallery or project?
6. Is the gallery **public**?

---

## Viewer tokens

Viewer tokens grant read-only access to a private gallery or all galleries in a project without requiring a login. They are:
- Scoped to `gallery` or `project`
- Optionally expiring
- Revocable individually
- Tracked (last used timestamp)

Share a viewer token link with clients who should see the gallery but not log in.
