#!/bin/bash

# Homelab Maintenance Script
# Update containers, cleanup, dan monitoring

set -e

echo "🔧 Homelab Maintenance"
echo "====================="
echo ""

# Menu
echo "Pilih operasi:"
echo "1) Update semua containers"
echo "2) Cleanup unused images/volumes"
echo "3) Show resource usage"
echo "4) Show logs"
echo "5) Backup sekarang"
echo "6) Restore dari backup"
echo "7) Rotate logs"
read -p "Pilih (1-7): " choice

case $choice in
    1)
        echo "🔄 Updating containers..."
        docker compose pull
        docker compose up -d
        echo "✅ Update selesai"
        ;;
    2)
        echo "🧹 Cleaning up..."
        docker system prune -af --volumes
        echo "✅ Cleanup selesai"
        ;;
    3)
        echo "📊 Resource Usage:"
        echo ""
        docker stats --no-stream
        echo ""
        echo "💾 Disk Usage:"
        df -h /home/abibinyun/data/homelab
        ;;
    4)
        read -p "Service name (kosongkan untuk semua): " service
        if [ -z "$service" ]; then
            docker compose logs --tail 50
        else
            docker compose logs --tail 50 "$service"
        fi
        ;;
    5)
        echo "💾 Starting backup..."
        ./backup.sh
        ;;
    6)
        echo "📦 Available backups:"
        ls -lh backups/*.tar.gz 2>/dev/null || echo "Tidak ada backup"
        read -p "Nama file backup: " backup_file
        if [ -f "backups/$backup_file" ]; then
            echo "⚠️  Restore akan menimpa config yang ada!"
            read -p "Lanjutkan? (yes/no): " confirm
            if [ "$confirm" = "yes" ]; then
                tar -xzf "backups/$backup_file" -C backups/
                backup_dir=$(basename "$backup_file" .tar.gz)
                cp "backups/$backup_dir/docker-compose.yml" .
                cp "backups/$backup_dir/.env" .
                echo "✅ Restore selesai. Jalankan: docker compose up -d"
            fi
        else
            echo "❌ File tidak ditemukan"
        fi
        ;;
    7)
        echo "🔄 Rotating logs..."
        logrotate -f logrotate.conf
        echo "✅ Log rotation selesai"
        ;;
    *)
        echo "❌ Pilihan tidak valid"
        exit 1
        ;;
esac
