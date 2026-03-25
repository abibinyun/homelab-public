# Advanced Features - Homelab

## 📦 Backup & Restore

### Manual Backup
```bash
./scripts/backup.sh
```

Backup akan menyimpan:
- docker-compose.yml
- .env
- Database dumps (PostgreSQL, MySQL)
- Data volumes
- Logs

Backup disimpan di `./backups/backup_YYYYMMDD_HHMMSS.tar.gz`

### Auto Backup (Cron)
```bash
# Edit crontab
crontab -e

# Tambahkan (backup setiap hari jam 2 pagi)
0 2 * * * cd /home/abibinyun/data/homelab && ./scripts/backup.sh
```

### Restore
```bash
./scripts/maintenance.sh
# Pilih opsi 6 (Restore dari backup)
```

---

## 💾 Database Setup

### PostgreSQL
Uncomment di `docker-compose.yml`:
```yaml
postgres:
  image: postgres:15-alpine
  ...
```

Jalankan:
```bash
docker compose up -d postgres
```

Connect dari app:
```
DATABASE_URL=postgresql://postgres:changeme@postgres:5432/homelab
```

### MySQL
Uncomment di `docker-compose.yml`:
```yaml
mysql:
  image: mysql:8-oracle
  ...
```

Connect dari app:
```
DATABASE_URL=mysql://root:changeme@mysql:3306/homelab
```

### Redis
Uncomment di `docker-compose.yml`:
```yaml
redis:
  image: redis:7-alpine
  ...
```

Connect dari app:
```
REDIS_URL=redis://:changeme@redis:6379
```

### Backup Database Manual
```bash
# PostgreSQL
docker exec postgres pg_dumpall -U postgres > backup.sql

# MySQL
docker exec mysql mysqldump -u root -pchangeme --all-databases > backup.sql

# Restore PostgreSQL
cat backup.sql | docker exec -i postgres psql -U postgres

# Restore MySQL
cat backup.sql | docker exec -i mysql mysql -u root -pchangeme
```

---

## 📊 Monitoring dengan Uptime Kuma

Uncomment di `docker-compose.yml`:
```yaml
uptime-kuma:
  image: louislam/uptime-kuma:1
  ...
```

Jalankan:
```bash
docker compose up -d uptime-kuma
```

Tambahkan di Cloudflare Tunnel:
- Subdomain: `uptime`
- Service: `http://traefik:80`

Akses: https://uptime.yourdomain.com

Setup monitoring untuk:
- Semua subdomain (whoami, testapp, dll)
- Database health checks
- Server resources

---

## 🐳 Portainer (Docker Management UI)

Portainer sudah terinstall dan hanya accessible dari localhost untuk keamanan.

Akses:
```
http://localhost:9000
```

Setup pertama kali:
1. Buat admin user (password min 12 karakter)
2. Connect ke local Docker environment
3. Done!

Fitur:
- Manage containers (start/stop/restart)
- View logs real-time
- Monitor resource usage
- Deploy stacks
- Manage images & volumes
- Container console access

**Catatan:** Portainer tidak di-expose ke internet untuk keamanan. Hanya bisa diakses dari laptop/server langsung.

---

## 🔧 Maintenance

### Update Containers
```bash
./scripts/maintenance.sh
# Pilih opsi 1
```

### Cleanup
```bash
./scripts/maintenance.sh
# Pilih opsi 2
```

### Resource Usage
```bash
./scripts/maintenance.sh
# Pilih opsi 3
```

### View Logs
```bash
./scripts/maintenance.sh
# Pilih opsi 4
```

---

## 📝 Log Management

### Log Rotation
Otomatis rotate logs setiap hari, simpan 7 hari terakhir.

Manual:
```bash
./scripts/maintenance.sh
# Pilih opsi 7
```

### View Logs
```bash
# Semua services
docker compose logs -f

# Specific service
docker compose logs -f traefik

# Last 100 lines
docker compose logs --tail 100 traefik

# Access logs
tail -f logs/access.log
```

---

## 🚀 CI/CD - Auto Deploy dari Git

### Setup
```bash
./scripts/auto-deploy.sh myapp https://github.com/user/repo.git
```

Script akan:
1. Clone/pull repository ke `./projects/myapp`
2. Build Docker image
3. Deploy container
4. Show logs

### Webhook (GitHub/GitLab)
Setup webhook untuk auto-deploy saat push:

1. Install webhook handler:
```bash
# Tambahkan webhook service di docker-compose.yml
webhook:
  image: almir/webhook
  container_name: webhook
  restart: unless-stopped
  volumes:
    - ./hooks.json:/etc/webhook/hooks.json
    - ./scripts/auto-deploy.sh:/scripts/auto-deploy.sh
  networks:
    - web
  labels:
    - "traefik.enable=true"
    - "traefik.http.routers.webhook.rule=Host(`webhook.yourdomain.com`)"
```

2. Buat `hooks.json`:
```json
[
  {
    "id": "deploy-myapp",
    "execute-command": "/scripts/auto-deploy.sh",
    "command-working-directory": "/",
    "pass-arguments-to-command": [
      {
        "source": "string",
        "name": "myapp"
      },
      {
        "source": "string",
        "name": "https://github.com/user/repo.git"
      }
    ]
  }
]
```

3. Setup webhook di GitHub:
   - URL: `https://webhook.yourdomain.com/hooks/deploy-myapp`
   - Content type: `application/json`
   - Events: `push`

---

## 🔐 Environment Variables Management

### Generate Secure Passwords
```bash
# Random password
openssl rand -base64 32

# Update .env
nano .env
```

### Best Practices
- ✅ Gunakan password yang kuat (min 16 karakter)
- ✅ Berbeda untuk setiap service
- ✅ Backup .env secara terpisah
- ✅ Jangan commit .env ke Git

---

## 📁 Project Organization

```
homelab/
├── docker-compose.yml       # Main config
├── .env                     # Secrets
├── projects/                # Your projects
│   ├── myapp/
│   │   ├── Dockerfile
│   │   └── src/
│   └── another-app/
├── data/                    # Persistent data
│   ├── postgres/
│   ├── mysql/
│   ├── redis/
│   └── uptime-kuma/
├── backups/                 # Backups
├── logs/                    # Logs
└── scripts/
    ├── deploy.sh
    ├── backup.sh
    ├── maintenance.sh
    └── auto-deploy.sh
```

---

## 🔍 Troubleshooting

### Container tidak start
```bash
docker compose logs <service-name>
docker inspect <container-name>
```

### Database connection failed
```bash
# Cek database running
docker compose ps postgres

# Cek logs
docker compose logs postgres

# Test connection
docker exec -it postgres psql -U postgres
```

### Disk penuh
```bash
# Cleanup
docker system prune -af --volumes

# Cek usage
df -h
du -sh data/*
```

### Performance issues
```bash
# Resource usage
docker stats

# System resources
htop
```
