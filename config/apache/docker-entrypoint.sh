#!/bin/sh
set -e

CERT_DIR="/etc/letsencrypt/live/${DOMAIN}"
SELFSIGNED_DIR="/etc/apache2/ssl"
VHOST_DEST="/usr/local/apache2/conf/conf.d/vhost.conf"

# ── 1. Generate vhost from template ─────────────────────────────────────────
envsubst '${DOMAIN}' < /etc/apache2/vhost.conf.template > "${VHOST_DEST}"

# ── 2. SSL certificate ────────────────────────────────────────────────────────
if [ -f "${CERT_DIR}/fullchain.pem" ]; then
  echo "[entrypoint] Using Let's Encrypt certificate for ${DOMAIN}"
else
  echo "[entrypoint] No Let's Encrypt cert found — generating self-signed for ${DOMAIN}"
  mkdir -p "${SELFSIGNED_DIR}"
  openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout "${SELFSIGNED_DIR}/privkey.pem" \
    -out    "${SELFSIGNED_DIR}/fullchain.pem" \
    -subj   "/CN=${DOMAIN}"

  # Point the vhost at the self-signed cert so Apache can start
  sed -i \
    -e "s|/etc/letsencrypt/live/${DOMAIN}/fullchain.pem|${SELFSIGNED_DIR}/fullchain.pem|" \
    -e "s|/etc/letsencrypt/live/${DOMAIN}/privkey.pem|${SELFSIGNED_DIR}/privkey.pem|" \
    "${VHOST_DEST}"
fi

# ── 3. Start Apache ───────────────────────────────────────────────────────────
exec httpd-foreground
