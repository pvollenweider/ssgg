#!/usr/bin/env bash
# Copyright (c) 2026 Philippe Vollenweider
#
# This file is part of the GalleryPack commercial platform.
# This source code is proprietary and confidential.
# Use, reproduction, or distribution requires a valid commercial license.
# Unauthorized use is strictly prohibited.
#
# GalleryPack — Dropbox sync via rclone
#
# Usage:
#   ./sync-dropbox.sh                # full sync (all directories)
#   ./sync-dropbox.sh --db-only      # DB dump + sync only
#   ./sync-dropbox.sh --dry-run      # show what would be transferred, nothing sent
#
# Prerequisites:
#   1. Create rclone.conf in the same directory as this script (see README).
#   2. Schedule via Synology Task Scheduler or cron.
#
# Dropbox layout created:
#   <DROPBOX_ROOT>/
#     db/               ← timestamped .sql.gz, 7-day rotation
#     private/          ← mirror of data/private
#     public/           ← mirror of data/public
#     internal/         ← mirror of data/internal (tus/ excluded)

set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"

# Load .env (DB credentials, compose file name, etc.)
set -a; source "$ENV_FILE"; set +a

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.synology.yml}"
DATA_ROOT="${STORAGE_ROOT:-$SCRIPT_DIR/data}"

DROPBOX_REMOTE="${DROPBOX_REMOTE:-dropbox}"   # rclone remote name
DROPBOX_ROOT="${DROPBOX_PATH:-gallerypack}"   # root folder in Dropbox

RCLONE_CONF="$SCRIPT_DIR/rclone.conf"
RCLONE_IMAGE="rclone/rclone:latest"

DB_DUMP_DIR="$SCRIPT_DIR/db-dumps"
DB_RETENTION_DAYS=7

LOG_DIR="$SCRIPT_DIR/logs"
LOG_FILE="$LOG_DIR/sync-dropbox.log"
MAX_LOG_LINES=5000   # truncate log if it grows too large

# rclone transfer tuning — adjust to taste
TRANSFERS=4
CHECKERS=8
BWLIMIT="${RCLONE_BWLIMIT:-0}"   # 0 = unlimited; set e.g. "5M" in .env to throttle

# ── Parse args ────────────────────────────────────────────────────────────────

DB_ONLY=false
DRY_RUN=false
for arg in "$@"; do
  case $arg in
    --db-only)  DB_ONLY=true ;;
    --dry-run)  DRY_RUN=true ;;
  esac
done

# ── Helpers ───────────────────────────────────────────────────────────────────

log() {
  local msg="[$(date '+%Y-%m-%d %H:%M:%S')] $*"
  echo "$msg"
  echo "$msg" >> "$LOG_FILE"
}

die() { log "ERROR: $*"; exit 1; }

# Rotate log: keep last MAX_LOG_LINES lines
trim_log() {
  if [[ -f "$LOG_FILE" ]]; then
    local lines; lines=$(wc -l < "$LOG_FILE")
    if (( lines > MAX_LOG_LINES )); then
      tail -n "$MAX_LOG_LINES" "$LOG_FILE" > "$LOG_FILE.tmp" && mv "$LOG_FILE.tmp" "$LOG_FILE"
    fi
  fi
}

# Run rclone via Docker (no host install required)
rclone_run() {
  local dry_flag=""
  $DRY_RUN && dry_flag="--dry-run"

  docker run --rm \
    --network none \
    -v "$RCLONE_CONF:/config/rclone/rclone.conf:ro" \
    -v "$DATA_ROOT:/data:ro" \
    -v "$DB_DUMP_DIR:/db-dumps:ro" \
    "$RCLONE_IMAGE" \
    "$@" $dry_flag \
    --transfers="$TRANSFERS" \
    --checkers="$CHECKERS" \
    --bwlimit="$BWLIMIT" \
    --log-level=INFO \
    --stats=0
}

# ── Sanity checks ─────────────────────────────────────────────────────────────

[[ -f "$RCLONE_CONF" ]] || die "rclone.conf not found at $RCLONE_CONF — see setup instructions."
[[ -d "$DATA_ROOT"   ]] || die "DATA_ROOT not found: $DATA_ROOT"

mkdir -p "$DB_DUMP_DIR" "$LOG_DIR"
trim_log

$DRY_RUN && log "=== DRY RUN — nothing will be transferred ==="

log "=== GalleryPack → Dropbox sync started ==="

# ── 1. DB dump ────────────────────────────────────────────────────────────────

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
DUMP_FILE="$DB_DUMP_DIR/${TIMESTAMP}.sql.gz"

log "→ Dumping database (${DB_NAME:-gallerypack})..."

if ! $DRY_RUN; then
  docker compose -f "$SCRIPT_DIR/$COMPOSE_FILE" exec -T db \
    mariadb-dump -u"${DB_USER}" -p"${DB_PASS}" "${DB_NAME}" \
    | gzip > "$DUMP_FILE"
  log "  ✓ $(du -sh "$DUMP_FILE" | cut -f1) → $DUMP_FILE"
else
  log "  (dry-run) skipping DB dump"
fi

# Prune local dumps older than DB_RETENTION_DAYS
if ! $DRY_RUN; then
  find "$DB_DUMP_DIR" -name "*.sql.gz" -mtime +$DB_RETENTION_DAYS -delete
  local_count=$(find "$DB_DUMP_DIR" -name "*.sql.gz" | wc -l | tr -d ' ')
  log "  ✓ Local DB dump retention: $local_count file(s) kept (≤ ${DB_RETENTION_DAYS} days)"
fi

# Sync dump folder to Dropbox (mirrors local retention window)
log "→ Syncing DB dumps to Dropbox..."
rclone_run sync /db-dumps "${DROPBOX_REMOTE}:${DROPBOX_ROOT}/db" 2>>"$LOG_FILE" \
  && log "  ✓ DB dumps synced" \
  || die "DB dump sync failed"

$DB_ONLY && { log "=== --db-only done ==="; exit 0; }

# ── 2. private/ ───────────────────────────────────────────────────────────────

log "→ Syncing private/ (originals)..."
rclone_run sync /data/private "${DROPBOX_REMOTE}:${DROPBOX_ROOT}/private" 2>>"$LOG_FILE" \
  && log "  ✓ private/ synced" \
  || die "private/ sync failed"

# ── 3. public/ ────────────────────────────────────────────────────────────────

log "→ Syncing public/ (built galleries)..."
rclone_run sync /data/public "${DROPBOX_REMOTE}:${DROPBOX_ROOT}/public" 2>>"$LOG_FILE" \
  && log "  ✓ public/ synced" \
  || die "public/ sync failed"

# ── 4. internal/ (thumbnails + prerender cache, skip tus upload sessions) ─────

log "→ Syncing internal/ (thumbnails + cache, excluding tus/)..."
rclone_run sync /data/internal "${DROPBOX_REMOTE}:${DROPBOX_ROOT}/internal" \
  --exclude "tus/**" 2>>"$LOG_FILE" \
  && log "  ✓ internal/ synced" \
  || die "internal/ sync failed"

# ── Done ──────────────────────────────────────────────────────────────────────

log "=== Sync complete ==="
