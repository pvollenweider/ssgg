#!/usr/bin/env bash
# init-letsencrypt.sh
# Obtains a Let's Encrypt certificate for the first time.
# Run this ONCE after the stack is up (HTTP must be reachable on port 80).
#
# Usage:
#   bash scripts/init-letsencrypt.sh
#
# Reads .env.prod for DOMAIN and LETSENCRYPT_EMAIL.
# Set LETSENCRYPT_STAGING=1 in .env.prod to use the staging CA for testing.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "${SCRIPT_DIR}")"

# Load .env.prod if present
if [ -f "${ROOT_DIR}/.env.prod" ]; then
  # shellcheck disable=SC1090
  set -a && source "${ROOT_DIR}/.env.prod" && set +a
fi

: "${DOMAIN:?DOMAIN must be set (in .env.prod or environment)}"
: "${LETSENCRYPT_EMAIL:?LETSENCRYPT_EMAIL must be set}"

STAGING="${LETSENCRYPT_STAGING:-0}"
STAGING_ARG=""
if [ "${STAGING}" = "1" ]; then
  STAGING_ARG="--staging"
  echo "[init-letsencrypt] Using Let's Encrypt STAGING CA"
fi

echo "[init-letsencrypt] Requesting certificate for: ${DOMAIN}"
echo "[init-letsencrypt] Contact email:              ${LETSENCRYPT_EMAIL}"

# Ensure apache is running (for HTTP-01 webroot challenge)
docker compose -f docker-compose.prod.yml up -d apache

echo "[init-letsencrypt] Waiting for Apache to become ready…"
for i in $(seq 1 15); do
  if docker compose -f docker-compose.prod.yml exec -T apache \
      httpd -t -D DUMP_MODULES 2>/dev/null | grep -q proxy_module; then
    break
  fi
  sleep 2
done

# Run certbot
docker compose -f docker-compose.prod.yml run --rm certbot \
  certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email "${LETSENCRYPT_EMAIL}" \
  --agree-tos \
  --no-eff-email \
  ${STAGING_ARG} \
  -d "${DOMAIN}"

echo "[init-letsencrypt] Certificate obtained. Reloading Apache…"
docker compose -f docker-compose.prod.yml exec apache apachectl graceful

echo "[init-letsencrypt] Done. Your site is now served over HTTPS."
