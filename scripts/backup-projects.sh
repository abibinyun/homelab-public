#!/bin/bash
# backup-projects.sh — Backup all project databases (shared + dedicated)
# Usage: ./scripts/backup-projects.sh
# Cron: 0 2 * * * /path/to/homelab/scripts/backup-projects.sh

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups/projects}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
DATE=$(date +%Y%m%d_%H%M%S)
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-postgres}"

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting project database backup..."

# 1. Backup all proj_* databases (shared mode projects)
DATABASES=$(docker exec "$POSTGRES_CONTAINER" psql -U postgres -t -c \
  "SELECT datname FROM pg_database WHERE datname LIKE 'proj_%' AND datistemplate = false;" 2>/dev/null | tr -d ' ')

for DB in $DATABASES; do
  [ -z "$DB" ] && continue
  FILE="$BACKUP_DIR/${DB}_${DATE}.sql.gz"
  docker exec "$POSTGRES_CONTAINER" pg_dump -U postgres "$DB" | gzip > "$FILE"
  echo "  ✓ Backed up: $DB → $FILE"
done

# 2. Backup deployer system database
DEPLOYER_FILE="$BACKUP_DIR/deployer_${DATE}.sql.gz"
docker exec "$POSTGRES_CONTAINER" pg_dump -U postgres deployer | gzip > "$DEPLOYER_FILE"
echo "  ✓ Backed up: deployer → $DEPLOYER_FILE"

# 3. Remove old backups
find "$BACKUP_DIR" -name "*.sql.gz" -mtime "+${RETENTION_DAYS}" -delete
echo "  ✓ Cleaned up backups older than ${RETENTION_DAYS} days"

echo "[$(date)] Backup complete."
