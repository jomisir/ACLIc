#!/usr/bin/env bash
# Nightly backup: Postgres dump + Supabase Storage bucket, 30-day retention.
# Run via cron, e.g.: 0 2 * * * /opt/aclic/app/deploy/backup.sh >> /var/log/aclic-backup.log 2>&1
#
# Requires in the environment (source /opt/aclic/app/.env.production first,
# or export these directly in the crontab):
#   DATABASE_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_STORAGE_BUCKET
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/aclic}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"

mkdir -p "$BACKUP_DIR/db" "$BACKUP_DIR/storage"

echo "[$TIMESTAMP] Dumping database..."
pg_dump --format=custom --file="$BACKUP_DIR/db/aclic-$TIMESTAMP.dump" "$DATABASE_URL"

echo "[$TIMESTAMP] Archiving Supabase Storage bucket..."
# Requires the Supabase CLI (`npm install -g supabase`) authenticated, or
# swap this block for `aws s3 sync` if the bucket is proxied through S3.
if command -v supabase >/dev/null 2>&1; then
  supabase storage cp --recursive \
    "ss://${SUPABASE_STORAGE_BUCKET:-aclic-media}" \
    "$BACKUP_DIR/storage/$TIMESTAMP" || echo "WARNING: storage backup failed, check Supabase CLI auth."
else
  echo "WARNING: supabase CLI not found — skipping storage backup. Install it or adapt this script."
fi

echo "[$TIMESTAMP] Pruning backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR/db" -name "*.dump" -mtime "+$RETENTION_DAYS" -delete
find "$BACKUP_DIR/storage" -maxdepth 1 -type d -mtime "+$RETENTION_DAYS" -exec rm -rf {} +

echo "[$TIMESTAMP] Backup complete: $BACKUP_DIR"
