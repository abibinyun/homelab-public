# Homelab Setup — Traefik + Cloudflare Tunnel

[![Build](https://github.com/abibinyun/homelab-public/actions/workflows/build.yml/badge.svg)](https://github.com/abibinyun/homelab-public/actions/workflows/build.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker-required-2496ED?logo=docker)](https://docs.docker.com/get-docker/)
[![Node](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js)](https://nodejs.org)

Self-hosted homelab dengan Traefik reverse proxy, Cloudflare Tunnel, dan web UI untuk deploy aplikasi. Semua traffic dari internet masuk lewat Cloudflare tanpa expose port atau IP publik.

## Arsitektur

```
Internet → Cloudflare Tunnel → Traefik → Docker Services
```

## Quick Start

### Coba dulu (Demo Mode)
Tidak butuh domain. Tidak butuh Cloudflare. Langsung jalan.
```bash
git clone https://github.com/abibinyun/homelab-public.git homelab
cd homelab
./scripts/setup-demo.sh
```
Buka `http://localhost:3000` — login `demo` / `demo1234`.

### Production (Full Setup)
> ⚠️ **Butuh domain yang sudah terdaftar di Cloudflare.**
> Belum punya? Gunakan Demo Mode dulu, atau baca [INSTALL.md](INSTALL.md).

```bash
git clone https://github.com/abibinyun/homelab-public.git homelab
cd homelab
./scripts/setup.sh
docker compose up -d
```
Buka `https://deploy.yourdomain.com`.

📖 **Panduan lengkap & troubleshooting: [INSTALL.md](INSTALL.md)**

---

## Services

| Container | Image | Akses |
|-----------|-------|-------|
| `traefik` | traefik:v3 | `traefik.yourdomain.com` (basic auth) |
| `cloudflared` | cloudflare/cloudflared | tunnel ke Cloudflare |
| `docker-socket-proxy` | tecnativa/docker-socket-proxy | internal only |
| `whoami` | traefik/whoami | `whoami.yourdomain.com` |
| `deployer` | build lokal | `deploy.yourdomain.com` |
| `postgres` | postgres:15-alpine | internal only |
| `redis` | redis:7-alpine | internal only |
| `portainer` | portainer-ce | `localhost:9000` |

## Struktur Folder

```
homelab/
├── docker-compose.yml          # Full production stack
├── docker-compose.demo.yml     # Demo mode (deployer only)
├── .env                        # Secrets (jangan commit)
├── .env.example                # Template
├── config/
│   └── security-headers.yml
├── logs/
├── data/                       # Persistent volumes
├── backups/                    # Backup otomatis harian
├── projects/
│   └── deployer/               # Web UI untuk deploy aplikasi
├── scripts/
│   ├── setup.sh                # Full setup (production)
│   ├── setup-demo.sh           # Demo mode setup
│   ├── cloudflare-route.sh
│   ├── cloudflare-remove.sh
│   ├── backup.sh
│   ├── maintenance.sh
│   └── security-hardening.sh
└── docs/
```

---

## Instalasi

### Prasyarat

- Docker & Docker Compose
- Domain yang sudah terhubung ke Cloudflare
- Akun [Cloudflare Zero Trust](https://one.dash.cloudflare.com/) (gratis)

### 1. Clone repo

```bash
git clone https://github.com/abibinyun/homelab-public.git homelab
cd homelab
```

### 2. Buat Cloudflare Tunnel

1. Login ke [Cloudflare Zero Trust](https://one.dash.cloudflare.com/)
2. **Networks → Tunnels → Create a tunnel** → nama: `homelab`
3. Copy tunnel token

### 3. Tambahkan Public Hostname di Cloudflare

Di halaman tunnel → **Public Hostname**, tambahkan:

| Subdomain | Domain | Service |
|-----------|--------|---------|
| `whoami` | `yourdomain.com` | `http://traefik:80` |
| `traefik` | `yourdomain.com` | `http://traefik:80` |
| `deploy` | `yourdomain.com` | `http://traefik:80` |

> Semua service selalu pakai `http://traefik:80` — Traefik yang routing berdasarkan subdomain.

### 4. Konfigurasi `.env`

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Domain utama (tanpa subdomain)
DOMAIN=yourdomain.com

# Cloudflare Tunnel Token (dari step 2)
TUNNEL_TOKEN=eyJh...

# Traefik Dashboard Auth
# Generate: docker run --rm httpd:alpine htpasswd -nb admin passwordkamu
TRAEFIK_AUTH=admin:$apr1$...

# Database
POSTGRES_PASSWORD=ganti-password-kuat
REDIS_PASSWORD=ganti-password-kuat
```

### 5. Konfigurasi Deployer

```bash
cp projects/deployer/.env.example projects/deployer/.env
```

Edit `projects/deployer/.env`:

```env
DOMAIN=yourdomain.com
ADMIN_USER=admin
ADMIN_PASSWORD=ganti-password-kuat    # WAJIB — app tidak start jika kosong
ADMIN_EMAIL=admin@yourdomain.com      # Opsional

# Samakan dengan POSTGRES_PASSWORD di .env root
DATABASE_URL=postgresql://postgres:POSTGRES_PASSWORD@postgres:5432/deployer

# Samakan dengan REDIS_PASSWORD di .env root
REDIS_URL=redis://:REDIS_PASSWORD@redis:6379

# Generate: openssl rand -hex 32
JWT_SECRET=
SESSION_SECRET=
ENCRYPTION_KEY=

# Generate: openssl rand -hex 16
INTERNAL_WEBHOOK_TOKEN=
```

### 6. Jalankan

```bash
docker compose up -d
docker compose ps
```

Akses Deployer UI di `https://deploy.yourdomain.com` — login dengan `ADMIN_USER` dan `ADMIN_PASSWORD` yang sudah diset.

---

## Deployer — Web UI

Deployer adalah web UI untuk deploy dan manage aplikasi di homelab kamu.

### Fitur

- Deploy aplikasi dari Git repository (GitHub, GitLab, dll)
- Manage container (start, stop, restart, delete)
- View logs real-time
- Edit environment variables
- Webhook untuk auto-deploy saat push ke Git
- Custom domain per aplikasi
- SSH key management untuk private repo

### Cara Deploy Aplikasi Baru

1. Buka `https://deploy.yourdomain.com`
2. Login dengan credentials yang sudah diset
3. Klik **+ New Project**
4. Isi:
   - **Project Name** — nama unik (lowercase, dash)
   - **Git URL** — `https://github.com/user/repo.git`
   - **Subdomain** — akan jadi `subdomain.yourdomain.com`
   - **Port** — port yang dipakai aplikasi
   - **Environment Variables** — opsional
5. Klik **Create Project** → otomatis clone, build, dan deploy

### Auto-deploy via Webhook

Di halaman project → klik **🔗 Webhook** → copy URL → paste ke GitHub/GitLab webhook settings.

Setiap push ke repo akan otomatis trigger redeploy.

---

## Tambah Service Manual (tanpa Deployer UI)

Edit `docker-compose.yml`:

```yaml
  myapp:
    image: nginx:alpine
    networks:
      - web
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.myapp.rule=Host(`myapp.${DOMAIN}`)"
      - "traefik.http.routers.myapp.entrypoints=web"
```

Lalu:

```bash
docker compose up -d myapp
./scripts/cloudflare-route.sh myapp.yourdomain.com
```

Untuk hapus:

```bash
docker compose stop myapp && docker compose rm -f myapp
./scripts/cloudflare-remove.sh myapp.yourdomain.com
```

> `cloudflare-route.sh` butuh variabel tambahan di `.env`:
> ```env
> CLOUDFLARE_API_TOKEN=
> CLOUDFLARE_ACCOUNT_ID=
> CLOUDFLARE_TUNNEL_ID=
> CLOUDFLARE_ZONE_ID=
> ```

---

## Maintenance

```bash
# Update semua container
docker compose pull && docker compose up -d

# Backup manual
./scripts/backup.sh

# Menu maintenance (update, cleanup, logs, backup, restore)
./scripts/maintenance.sh

# Cek resource
docker stats
```

---

## Troubleshooting

```bash
# Cek status container
docker compose ps

# Cek logs
docker compose logs cloudflared
docker compose logs traefik
docker compose logs deployer

# Cek router Traefik
curl http://localhost:8080/api/http/routers | jq
```

**Deployer tidak bisa diakses / terus restart:**
```bash
docker compose logs deployer --tail=20
```
Jika ada error `column does not exist`:
```bash
docker compose exec postgres psql -U postgres -d deployer -c "DROP TABLE IF EXISTS projects CASCADE; DROP TABLE IF EXISTS users CASCADE;"
docker compose restart deployer
```

---

## Security

- Semua traffic dari internet lewat Cloudflare Tunnel (zero-trust)
- Traefik dashboard dilindungi basic auth
- Portainer hanya accessible dari `localhost:9000`
- Docker socket diakses via proxy (tidak langsung)
- Security headers aktif
- UFW + fail2ban direkomendasikan di host

Lihat [docs/SECURITY.md](docs/SECURITY.md) untuk panduan lengkap.

---

## Dokumentasi

- [docs/DEPLOY_GUIDE.md](docs/DEPLOY_GUIDE.md) — Deploy per bahasa (Node.js, PHP, Python, dll)
- [docs/ADVANCED.md](docs/ADVANCED.md) — Database, monitoring, CI/CD, backup
- [docs/SECURITY.md](docs/SECURITY.md) — Security hardening
- [docs/CLOUDFLARE_API.md](docs/CLOUDFLARE_API.md) — Cloudflare API automation
- [docs/MULTIPLE_DOMAINS.md](docs/MULTIPLE_DOMAINS.md) — Setup multiple domain
- [docs/CUSTOM_DOMAIN.md](docs/CUSTOM_DOMAIN.md) — Custom domain per project

---

## Lisensi

MIT License — bebas digunakan, dimodifikasi, dan didistribusikan. Lihat [LICENSE](LICENSE) untuk detail.

© 2026 Muhammad Bilal — jobs.muhammadbilal@gmail.com
