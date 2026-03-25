# Deployer — Self-Hosted Deploy UI

Web UI for deploying and managing applications in your homelab. Deploy from a Git repo to a subdomain automatically via Traefik + Cloudflare Tunnel.

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | React + Vite + Tailwind CSS + shadcn/ui |
| Backend | Express.js + TypeScript |
| Database | PostgreSQL 15 (optional, falls back to JSON) |
| Cache/Session | Redis 7 (optional, falls back to memory) |
| Container | Docker (via Dockerode) |

## Quick Start

### Demo Mode (UI preview only)
```bash
./scripts/setup-demo.sh
```
- No domain, Cloudflare, or Traefik required
- Login: `demo` / `demo1234`
- All actions are disabled — UI preview only
- Access: `http://localhost:3000`

### Production (full setup)
> ⚠️ **Requires a domain registered with Cloudflare + a Cloudflare Tunnel Token.**
> Read [INSTALL.md](../../INSTALL.md) for the full guide.

```bash
./scripts/setup.sh
```
- Sets up Traefik + Postgres + Redis + Deployer in one go
- Access: `https://deploy.yourdomain.com`

## Features

- Single owner account login
- Deploy applications from Git repositories (GitHub, GitLab, etc.)
- Private repo support via HTTPS token or SSH key
- Auto-generates Dockerfile based on project type
- Manage containers — start, stop, restart, delete
- View real-time logs
- Edit environment variables per project
- **Resource limits per project** — memory, CPU, restart policy
- **Global default resources** — defaults for all new projects
- Webhook for auto-deploy on Git push (GitHub/GitLab, with HMAC signature)
- Custom domain per application (requires Cloudflare API)
- SSH key management
- Login rate limiting (10 attempts / 15 minutes)

## Structure

```
deployer/
├── api/                    # Express backend (TypeScript)
│   ├── config/
│   ├── controllers/        # health, project, webhook
│   ├── db/                 # PostgreSQL, Redis, migrations
│   ├── middleware/         # auth, cors, errorHandler, validate
│   ├── repositories/       # customDomain, postgres, storage
│   ├── routes/             # auth, projects, webhook, customDomain
│   ├── services/           # auth, cloudflare, customDomain, deploy, docker, project
│   ├── types/
│   └── utils/
├── src/                    # React frontend
│   ├── components/         # Layout, ProjectCard, modals
│   ├── hooks/              # useFeatureFlags, useSSEDeploy, etc.
│   ├── lib/
│   └── pages/              # Dashboard, Login
├── Dockerfile
└── package.json
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Current user info |
| GET | `/api/projects` | List all projects |
| POST | `/api/projects` | Create new project |
| POST | `/api/projects/:name/deploy` | Deploy project (SSE) |
| POST | `/api/projects/:name/start\|stop\|restart` | Control container |
| DELETE | `/api/projects/:name` | Delete project |
| GET | `/api/projects/:name/logs` | Container logs |
| PUT | `/api/projects/:name/env` | Update env vars |
| PATCH | `/api/projects/:name/resources` | Update resource limits |
| POST | `/api/webhook/github/:name` | GitHub webhook |
| POST | `/api/webhook/gitlab/:name` | GitLab webhook |
| POST | `/api/webhook/deploy/:name` | Generic webhook |
| POST | `/api/domains` | Add custom domain |
| POST | `/api/domains/:id/verify` | Verify domain |
| GET | `/api/domains/project/:name` | List domains per project |
| DELETE | `/api/domains/:id` | Delete domain |
| GET | `/api/ssh-key` | Server public SSH key |
| GET | `/api/settings` | Global settings |
| PATCH | `/api/settings` | Update global settings |
| GET | `/health` | Health check |
| GET | `/health/config` | Feature status (demo, cloudflare, etc.) |

## Environment Variables

```env
# Owner credentials — ADMIN_PASSWORD is required, app will not start if empty
ADMIN_USER=admin
ADMIN_PASSWORD=strong-password-here
ADMIN_EMAIL=admin@yourdomain.com  # optional

# App
NODE_ENV=production
PORT=3000
DOMAIN=yourdomain.com
VITE_DOMAIN=yourdomain.com

# Demo mode — disables all actions in the UI
DEMO_MODE=false

# Project limit (0 or empty = unlimited)
MAX_PROJECTS=

# Database (optional — falls back to JSON file if empty)
DATABASE_URL=postgresql://postgres:password@postgres:5432/deployer

# Redis (optional — falls back to in-memory if empty)
REDIS_URL=redis://:password@redis:6379

# Auth secrets — generate with: openssl rand -hex 32
JWT_SECRET=random-string
SESSION_SECRET=another-random-string
ENCRYPTION_KEY=random-string-for-git-token-encryption

# Internal webhook token — generate: openssl rand -hex 16
INTERNAL_WEBHOOK_TOKEN=

# SSH Key
SSH_KEY_PATH=/app/.ssh/id_ed25519.pub

# Homelab path
HOMELAB_PATH=/homelab

# Docker network (adjust if your folder name is not 'homelab')
DOCKER_NETWORK=homelab_web

# Cloudflare (optional, for auto-routing subdomains)
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_ZONE_ID=
CLOUDFLARE_TUNNEL_ID=
```

## Development

```bash
npm install
cp .env.example .env  # fill in at least ADMIN_USER and ADMIN_PASSWORD
npm run dev
```

Frontend: `http://localhost:5173`
API: `http://localhost:3000`

## Build

```bash
npm run build
```

In production, run via Docker from the `docker-compose.yml` in the homelab root.
