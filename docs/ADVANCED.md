# Advanced Features - Homelab

## 📦 Backup & Restore

### Manual Backup
```bash
./scripts/backup.sh
```

Backup includes:
- docker-compose.yml
- .env
- Database dumps (PostgreSQL, MySQL)
- Data volumes
- Logs

Backups are stored in `./backups/backup_YYYYMMDD_HHMMSS.tar.gz`

### Auto Backup (Cron)
```bash
# Edit crontab
crontab -e

# Add (daily backup at 2am)
0 2 * * * cd /home/user/homelab && ./scripts/backup.sh
```

### Restore
```bash
./scripts/maintenance.sh
# Choose option 6 (Restore from backup)
```

---

## 💾 Database Setup

### PostgreSQL
Uncomment in `docker-compose.yml`:
```yaml
postgres:
  image: postgres:15-alpine
  ...
```

Run:
```bash
docker compose up -d postgres
```

Connect from app:
```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@postgres:5432/homelab
```

### MySQL
Uncomment in `docker-compose.yml`:
```yaml
mysql:
  image: mysql:8-oracle
  ...
```

Connect from app:
```
DATABASE_URL=mysql://root:YOUR_PASSWORD@mysql:3306/homelab
```

### Redis
Uncomment in `docker-compose.yml`:
```yaml
redis:
  image: redis:7-alpine
  ...
```

Connect from app:
```
REDIS_URL=redis://:YOUR_PASSWORD@redis:6379
```

### Manual Database Backup
```bash
# PostgreSQL
docker exec postgres pg_dumpall -U postgres > backup.sql

# MySQL
docker exec mysql mysqldump -u root -pYOUR_PASSWORD --all-databases > backup.sql

# Restore PostgreSQL
cat backup.sql | docker exec -i postgres psql -U postgres

# Restore MySQL
cat backup.sql | docker exec -i mysql mysql -u root -pYOUR_PASSWORD
```

---

## 📊 Monitoring with Uptime Kuma

Uncomment in `docker-compose.yml`:
```yaml
uptime-kuma:
  image: louislam/uptime-kuma:1
  ...
```

Run:
```bash
docker compose up -d uptime-kuma
```

Add in Cloudflare Tunnel:
- Subdomain: `uptime`
- Service: `http://traefik:80`

Access: https://uptime.yourdomain.com

Set up monitoring for:
- All subdomains (whoami, apps, etc.)
- Database health checks
- Server resources

---

## 🐳 Portainer (Docker Management UI)

Portainer is installed and only accessible from localhost for security.

Access:
```
http://localhost:9000
```

Initial setup:
1. Create an admin user (password min 12 characters)
2. Connect to the local Docker environment
3. Done!

Features:
- Manage containers (start/stop/restart)
- View real-time logs
- Monitor resource usage
- Deploy stacks
- Manage images & volumes
- Container console access

**Note:** Portainer is not exposed to the internet for security. It can only be accessed directly from the server.

---

## 🔧 Maintenance

### Update Containers
```bash
./scripts/maintenance.sh
# Choose option 1
```

### Cleanup
```bash
./scripts/maintenance.sh
# Choose option 2
```

### Resource Usage
```bash
./scripts/maintenance.sh
# Choose option 3
```

### View Logs
```bash
./scripts/maintenance.sh
# Choose option 4
```

---

## 📝 Log Management

### Log Rotation
Logs are automatically rotated daily, keeping the last 7 days.

Manual:
```bash
./scripts/maintenance.sh
# Choose option 7
```

### View Logs
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f traefik

# Last 100 lines
docker compose logs --tail 100 traefik

# Access logs
tail -f logs/access.log
```

---

## 🚀 CI/CD — Auto Deploy from Git

### Setup
```bash
./scripts/auto-deploy.sh myapp https://github.com/user/repo.git
```

The script will:
1. Clone/pull the repository to `./projects/myapp`
2. Build the Docker image
3. Deploy the container
4. Show logs

### Webhook (GitHub/GitLab)
Set up a webhook for auto-deploy on push:

1. Add a webhook service in `docker-compose.yml`:
```bash
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

2. Create `hooks.json`:
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

3. Set up the webhook in GitHub:
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
- ✅ Use strong passwords (min 16 characters)
- ✅ Different password for each service
- ✅ Back up .env separately
- ✅ Do not commit .env to Git

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

### Container won't start
```bash
docker compose logs <service-name>
docker inspect <container-name>
```

### Database connection failed
```bash
# Check database is running
docker compose ps postgres

# Check logs
docker compose logs postgres

# Test connection
docker exec -it postgres psql -U postgres
```

### Disk full
```bash
# Cleanup
docker system prune -af --volumes

# Check usage
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
