# Deploying GalleryPack with Apache + Let's Encrypt

This guide covers deploying GalleryPack in production using the Apache-based
Docker Compose stack (`docker-compose.apache.yml`). Apache handles:

- Serving built galleries as static files
- Reverse-proxying `/api/*`, `/admin/*`, and `/upload/*` to the Node API
- TLS termination via Let's Encrypt (Certbot) certificates
- Automatic certificate renewal

## Architecture

```
Internet
   │
   ▼ :80 / :443
┌──────────────────────────────────────────────────────────┐
│  apache  (httpd:2.4 + mod_proxy + mod_ssl)               │
│   • :80  → ACME challenge or redirect to HTTPS           │
│   • :443 → static /srv/galleries  +  proxy to api:4000   │
└──────────────┬───────────────────────────────────────────┘
               │ internal Docker network
       ┌───────┴────────┐
       ▼                ▼
   api:4000         certbot (renewal daemon)
       │
   worker  ─────  db (MariaDB 11)
```

## Prerequisites

- A server with Docker + Docker Compose v2 installed
- Ports 80 and 443 open in your firewall / security group
- A DNS A record pointing your domain to the server's public IP

## First-time setup

### 1. Clone the repository

```bash
git clone https://github.com/your-org/gallerypack.git
cd gallerypack
```

### 2. Create your environment file

```bash
cp .env.apache.example .env.apache
chmod 600 .env.apache
nano .env.apache
```

Fill in at minimum:

| Variable | Description |
|---|---|
| `DOMAIN` | Your public domain, e.g. `galleries.example.com` |
| `LETSENCRYPT_EMAIL` | Email for expiry notices |
| `DB_ROOT_PASSWORD` | MariaDB root password |
| `DB_PASS` | MariaDB app user password |
| `SESSION_SECRET` | Random secret (`openssl rand -hex 32`) |
| `ADMIN_EMAIL` | First superadmin email |
| `ADMIN_PASSWORD` | First superadmin password |

### 3. Start the stack (HTTP only, no cert yet)

```bash
docker compose -f docker-compose.apache.yml --env-file .env.apache up -d
```

Apache starts with a self-signed certificate so it can serve the ACME
webroot challenge even before a real cert exists.

### 4. Obtain the Let's Encrypt certificate

```bash
bash scripts/init-letsencrypt.sh
```

This script:
1. Ensures Apache is running
2. Runs `certbot certonly --webroot` inside the `certbot` container
3. Reloads Apache with the new certificate

> **Staging test:** Set `LETSENCRYPT_STAGING=1` in `.env.apache` for a
> dry-run that uses the Let's Encrypt staging CA (no rate limits).

### 5. Restart Apache to load the real certificate

```bash
docker compose -f docker-compose.apache.yml --env-file .env.apache restart apache
```

Your site is now live at `https://your-domain.com`.

## Day-to-day operations

### Start / stop

```bash
docker compose -f docker-compose.apache.yml --env-file .env.apache up -d
docker compose -f docker-compose.apache.yml --env-file .env.apache down
```

### View logs

```bash
docker compose -f docker-compose.apache.yml --env-file .env.apache logs -f apache
docker compose -f docker-compose.apache.yml --env-file .env.apache logs -f api
```

### Update the application

```bash
git pull
docker compose -f docker-compose.apache.yml --env-file .env.apache build api worker
docker compose -f docker-compose.apache.yml --env-file .env.apache up -d
```

## Certificate renewal

The `certbot` container runs a renewal loop automatically (checks every 12 h,
renews when < 30 days remain). After renewal you must reload Apache:

```bash
docker compose -f docker-compose.apache.yml --env-file .env.apache exec apache apachectl graceful
```

To automate this, add a cron job on the host:

```cron
0 3 * * * cd /path/to/gallerypack && \
  docker compose -f docker-compose.apache.yml --env-file .env.apache \
  exec -T apache apachectl graceful >> /var/log/apache-reload.log 2>&1
```

## Routing reference

| Path | Handled by |
|---|---|
| `/.well-known/acme-challenge/*` | Certbot webroot (via Apache) |
| `/api/*` | Proxied → `api:4000` |
| `/admin/*` | Proxied → `api:4000` (serves the admin SPA) |
| `/upload/*` | Proxied → `api:4000` |
| `/*` | Static files from `/srv/galleries` (built galleries) |

## Volumes

| Volume | Content |
|---|---|
| `db_data` | MariaDB data |
| `src_data` | Uploaded source photos |
| `galleries_dist` | Built gallery output (served by Apache) |
| `app_data` | License file, persistent server data |
| `letsencrypt` | Let's Encrypt certificates |
| `certbot_webroot` | ACME challenge files (shared Apache ↔ Certbot) |

## Troubleshooting

### "Connection refused" on port 443

Verify Apache is listening:

```bash
docker compose -f docker-compose.apache.yml --env-file .env.apache logs apache
```

If it shows `AH00489: Apache ... configured`, Apache is running. Check your
firewall rules allow port 443 inbound.

### Certificate not renewing

Check Certbot logs:

```bash
docker compose -f docker-compose.apache.yml --env-file .env.apache logs certbot
```

Ensure port 80 is accessible from the internet (required for HTTP-01 challenge).

### Reset everything (wipe all data)

```bash
docker compose -f docker-compose.apache.yml --env-file .env.apache down -v
```

> **Warning:** this deletes all volumes including the database and galleries.
