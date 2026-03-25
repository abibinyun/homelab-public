#!/bin/bash
# Automated backup script with retention policy

BACKUP_DIR="/home/abibinyun/data/homelab/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "🔄 Starting automated backup at $(date)"

# Backup PostgreSQL
echo "📦 Backing up PostgreSQL..."
docker exec postgres pg_dumpall -U postgres | gzip > "$BACKUP_DIR/postgres_$TIMESTAMP.sql.gz"

# Backup Redis
echo "📦 Backing up Redis..."
docker exec redis redis-cli --pass "${REDIS_PASSWORD:-changeme}" SAVE
docker cp redis:/data/dump.rdb "$BACKUP_DIR/redis_$TIMESTAMP.rdb"

# Backup deployer data
echo "📦 Backing up deployer data..."
tar -czf "$BACKUP_DIR/deployer_data_$TIMESTAMP.tar.gz" \
  -C /home/abibinyun/data/homelab \
  projects/deployer/data \
  data/postgres \
  data/redis \
  2>/dev/null || true

# Backup docker-compose and configs
echo "📦 Backing up configurations..."
tar -czf "$BACKUP_DIR/configs_$TIMESTAMP.tar.gz" \
  -C /home/abibinyun/data/homelab \
  docker-compose.yml \
  docker-compose.dev.yml \
  .env \
  config \
  scripts \
  2>/dev/null || true

# Calculate sizes
POSTGRES_SIZE=$(du -h "$BACKUP_DIR/postgres_$TIMESTAMP.sql.gz" | cut -f1)
REDIS_SIZE=$(du -h "$BACKUP_DIR/redis_$TIMESTAMP.rdb" | cut -f1)
DATA_SIZE=$(du -h "$BACKUP_DIR/deployer_data_$TIMESTAMP.tar.gz" | cut -f1)
CONFIG_SIZE=$(du -h "$BACKUP_DIR/configs_$TIMESTAMP.tar.gz" | cut -f1)

echo "✅ Backup completed!"
echo "   PostgreSQL: $POSTGRES_SIZE"
echo "   Redis: $REDIS_SIZE"
echo "   Data: $DATA_SIZE"
echo "   Configs: $CONFIG_SIZE"

# Cleanup old backups (retention policy)
echo "🧹 Cleaning up backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "*.rdb" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete

REMAINING=$(ls -1 "$BACKUP_DIR" | wc -l)
echo "✅ Cleanup done. $REMAINING backup files remaining."

# Create backup manifest
cat > "$BACKUP_DIR/latest_backup.txt" <<EOF
Timestamp: $(date)
PostgreSQL: postgres_$TIMESTAMP.sql.gz ($POSTGRES_SIZE)
Redis: redis_$TIMESTAMP.rdb ($REDIS_SIZE)
Data: deployer_data_$TIMESTAMP.tar.gz ($DATA_SIZE)
Configs: configs_$TIMESTAMP.tar.gz ($CONFIG_SIZE)
EOF

echo "📝 Backup manifest saved to $BACKUP_DIR/latest_backup.txt"
echo "🎉 All done!"
