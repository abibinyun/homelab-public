#!/bin/bash

# Homelab Backup Script
# Backup docker-compose.yml, .env, databases, dan volumes

set -e

# Load .env
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="$BACKUP_DIR/backup_$TIMESTAMP"

echo "🔄 Starting backup..."
mkdir -p "$BACKUP_PATH"

# Backup config files
echo "📝 Backing up config files..."
cp docker-compose.yml "$BACKUP_PATH/"
cp .env "$BACKUP_PATH/"
cp -r logs "$BACKUP_PATH/" 2>/dev/null || true

# Backup databases
echo "💾 Backing up databases..."

# PostgreSQL
if docker ps --format '{{.Names}}' | grep -q postgres; then
    echo "  - PostgreSQL..."
    docker exec $(docker ps --filter "ancestor=postgres" --format "{{.Names}}" | head -1) \
        pg_dumpall -U postgres > "$BACKUP_PATH/postgres_dump.sql" 2>/dev/null || echo "    ⚠️  PostgreSQL backup failed"
fi

# MySQL
if docker ps --format '{{.Names}}' | grep -q mysql; then
    echo "  - MySQL..."
    docker exec $(docker ps --filter "ancestor=mysql" --format "{{.Names}}" | head -1) \
        mysqldump -u root -p"${MYSQL_ROOT_PASSWORD:-password}" --all-databases > "$BACKUP_PATH/mysql_dump.sql" 2>/dev/null || echo "    ⚠️  MySQL backup failed"
fi

# Backup data volumes
echo "📦 Backing up data volumes..."
if [ -d "data" ]; then
    tar -czf "$BACKUP_PATH/data_volumes.tar.gz" data/ 2>/dev/null || echo "  ⚠️  Data volumes backup failed"
fi

# Create archive
echo "🗜️  Creating archive..."
cd "$BACKUP_DIR"
tar -czf "backup_$TIMESTAMP.tar.gz" "backup_$TIMESTAMP"
rm -rf "backup_$TIMESTAMP"

# Keep only last 7 backups
echo "🧹 Cleaning old backups..."
ls -t backup_*.tar.gz | tail -n +8 | xargs rm -f 2>/dev/null || true

echo "✅ Backup completed: $BACKUP_DIR/backup_$TIMESTAMP.tar.gz"
echo "📊 Backup size: $(du -h "$BACKUP_DIR/backup_$TIMESTAMP.tar.gz" | cut -f1)"
