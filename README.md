# GalleryPack

A self-hosted photo gallery platform for photographers and studios. Build beautiful, fast, static galleries from a web admin panel — no cloud dependency, full control over your data.

## What it does

- Photographers **upload photos** via a web interface or invitation link
- Admins **organize** photos into galleries, inside projects, inside studios
- A **build engine** generates a fully static gallery (HTML + optimized images)
- **Caddy serves** the result — zero server-side rendering at runtime

## Quick start

```bash
cp .env.example .env       # fill in SESSION_SECRET and ADMIN_PASSWORD at minimum
docker compose -f docker-compose.saas.yml up -d
```

Open `http://localhost` → log in with the email/password you set in `.env`.

## Architecture

```
Browser
  └── Caddy (reverse proxy + static file server)
        ├── /api/*     → API server  (Node.js / Express 5)
        ├── /admin/*   → Admin SPA   (React / Vite, built into API image)
        └── /<slug>/*  → Galleries   (pure static files from dist/)

API        apps/api/          Auth, studios, projects, galleries, photos, jobs
Worker     workers/builder/   Polls job queue → calls engine → writes dist/
Engine     packages/engine/   Resizes photos, generates HTML (pure functions)
Database   MariaDB            Migrations in apps/api/src/db/migrations/mariadb/
Storage    Local or S3        Abstracted in packages/shared/src/storage/
```

### Data hierarchy

```
Platform
  └── Studio
        └── Project
              └── Gallery (photos + static build output)
```

## Docker Compose stacks

| File | Purpose |
|---|---|
| `docker-compose.saas.yml` | Full stack — production or local dev |
| `docker-compose.test.yml` | CI / ephemeral testing |
| `deploy/docker-compose.prod.yml` | Apache-based self-hosted (advanced) |

## Docs

- [docs/install.md](docs/install.md) — setup and configuration
- [docs/how-it-works.md](docs/how-it-works.md) — concepts and workflows
- [docs/roles.md](docs/roles.md) — permission model
- [docs/api.md](docs/api.md) — REST API reference
- [docs/faq.md](docs/faq.md) — common questions

## License

MIT
