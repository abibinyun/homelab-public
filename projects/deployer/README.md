# Deployer — Self-Hosted Deploy UI

Web UI untuk deploy dan manage aplikasi di homelab. Deploy dari Git repo ke subdomain otomatis via Traefik + Cloudflare Tunnel.

## Stack

| Layer | Teknologi |
|-------|-----------|
| Frontend | React + Vite + Tailwind CSS + shadcn/ui |
| Backend | Express.js + TypeScript |
| Database | PostgreSQL 15 (opsional, fallback ke JSON) |
| Cache/Session | Redis 7 (opsional, fallback ke memory) |
| Container | Docker (via Dockerode) |

## Quick Start

### Demo Mode (preview UI saja)
```bash
./scripts/setup-demo.sh
```
- Tidak butuh domain, Cloudflare, atau Traefik
- Login: `demo` / `demo1234`
- Semua action di-disable — hanya untuk lihat-lihat UI
- Akses: `http://localhost:3000`

### Production (full setup)
> ⚠️ **Butuh domain yang sudah terdaftar di Cloudflare + Cloudflare Tunnel Token.**
> Baca [INSTALL.md](../../INSTALL.md) untuk panduan lengkap.

```bash
./scripts/setup.sh
```
- Setup Traefik + Postgres + Redis + Deployer sekaligus
- Akses: `https://deploy.yourdomain.com`

## Fitur

- Login dengan single owner account
- Deploy aplikasi dari Git repository (GitHub, GitLab, dll)
- Support private repo via HTTPS token atau SSH key
- Auto-generate Dockerfile berdasarkan tipe project
- Manage container — start, stop, restart, delete
- View logs real-time
- Edit environment variables per project
- **Resource limits per project** — memory, CPU, restart policy
- **Global default resources** — default untuk semua project baru
- Webhook untuk auto-deploy saat push ke Git (GitHub/GitLab, dengan HMAC signature)
- Custom domain per aplikasi (butuh Cloudflare API)
- SSH key management
- Login rate limiting (10 attempts/15 menit)

## Struktur

```
deployer/
├── api/                    # Backend Express (TypeScript)
│   ├── config/
│   ├── controllers/        # health, project, webhook
│   ├── db/                 # PostgreSQL, Redis, migrations
│   ├── middleware/         # auth, cors, errorHandler, validate
│   ├── repositories/       # customDomain, postgres, storage
│   ├── routes/             # auth, projects, webhook, customDomain
│   ├── services/           # auth, cloudflare, customDomain, deploy, docker, project
│   ├── types/
│   └── utils/
├── src/                    # Frontend React
│   ├── components/         # Layout, ProjectCard, modals
│   ├── hooks/              # useFeatureFlags, useSSEDeploy, dll
│   ├── lib/
│   └── pages/              # Dashboard, Login
├── Dockerfile
└── package.json
```

## API Endpoints

| Method | Path | Keterangan |
|--------|------|------------|
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Info user saat ini |
| GET | `/api/projects` | List semua projects |
| POST | `/api/projects` | Buat project baru |
| POST | `/api/projects/:name/deploy` | Deploy project (SSE) |
| POST | `/api/projects/:name/start\|stop\|restart` | Kontrol container |
| DELETE | `/api/projects/:name` | Hapus project |
| GET | `/api/projects/:name/logs` | Logs container |
| PUT | `/api/projects/:name/env` | Update env vars |
| PATCH | `/api/projects/:name/resources` | Update resource limits |
| POST | `/api/webhook/github/:name` | Webhook GitHub |
| POST | `/api/webhook/gitlab/:name` | Webhook GitLab |
| POST | `/api/webhook/deploy/:name` | Webhook generic |
| POST | `/api/domains` | Tambah custom domain |
| POST | `/api/domains/:id/verify` | Verifikasi domain |
| GET | `/api/domains/project/:name` | List domain per project |
| DELETE | `/api/domains/:id` | Hapus domain |
| GET | `/api/ssh-key` | Public SSH key server |
| GET | `/api/settings` | Global settings |
| PATCH | `/api/settings` | Update global settings |
| GET | `/health` | Health check |
| GET | `/health/config` | Status fitur (demo, cloudflare, dll) |

## Environment Variables

```env
# Owner credentials — ADMIN_PASSWORD wajib diisi, app tidak akan start jika kosong
ADMIN_USER=admin
ADMIN_PASSWORD=ganti-password-kuat
ADMIN_EMAIL=admin@yourdomain.com  # opsional

# App
NODE_ENV=production
PORT=3000
DOMAIN=yourdomain.com
VITE_DOMAIN=yourdomain.com

# Demo mode — disable semua action di UI
DEMO_MODE=false

# Batas jumlah project (0 atau kosong = unlimited)
MAX_PROJECTS=

# Database (opsional — fallback ke JSON file jika kosong)
DATABASE_URL=postgresql://postgres:password@postgres:5432/deployer

# Redis (opsional — fallback ke in-memory jika kosong)
REDIS_URL=redis://:password@redis:6379

# Auth secrets — generate dengan: openssl rand -hex 32
JWT_SECRET=random-string-panjang
SESSION_SECRET=random-string-lain
ENCRYPTION_KEY=random-string-untuk-enkripsi-git-token

# Internal webhook token — generate: openssl rand -hex 16
# Digunakan untuk internal self-call saat trigger deploy via webhook
INTERNAL_WEBHOOK_TOKEN=

# SSH Key
SSH_KEY_PATH=/app/.ssh/id_ed25519.pub

# Homelab path
HOMELAB_PATH=/homelab

# Docker network (sesuaikan jika nama folder bukan 'homelab')
DOCKER_NETWORK=homelab_web

# Cloudflare (opsional, untuk auto-route subdomain)
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_ZONE_ID=
CLOUDFLARE_TUNNEL_ID=
```

## Development

```bash
npm install
cp .env.example .env  # isi minimal ADMIN_USER dan ADMIN_PASSWORD
npm run dev
```

Frontend: `http://localhost:5173`
API: `http://localhost:3000`

## Build

```bash
npm run build
```

Di production dijalankan via Docker dari `docker-compose.yml` di root homelab.
