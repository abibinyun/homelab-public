# Homelab Setup — Traefik + Cloudflare Tunnel

[![Build](https://github.com/abibinyun/homelab-public/actions/workflows/build.yml/badge.svg)](https://github.com/abibinyun/homelab-public/actions/workflows/build.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker-required-2496ED?logo=docker)](https://docs.docker.com/get-docker/)
[![Node](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js)](https://nodejs.org)

Self-hosted homelab with Traefik reverse proxy, Cloudflare Tunnel, and a web UI for deploying applications. All traffic from the internet goes through Cloudflare without exposing any ports or public IP.

## Architecture

```
Internet → Cloudflare Tunnel → Traefik → Docker Services
```

## Quick Start

### Try it out (Demo Mode)
No domain required. No Cloudflare required. Runs immediately.
```bash
git clone https://github.com/abibinyun/homelab-public.git homelab
cd homelab
./scripts/setup-demo.sh
```
Open `http://localhost:3000` — login `demo` / `demo1234`.

### Production (Full Setup)
> ⚠️ **Requires a domain registered with Cloudflare.**
> Don't have one? Use Demo Mode first, or read [INSTALL.md](INSTALL.md).

```bash
git clone https://github.com/abibinyun/homelab-public.git homelab
cd homelab
./scripts/setup.sh
docker compose up -d
```
Open `https://deploy.yourdomain.com`.

📖 **Full guide & troubleshooting: [INSTALL.md](INSTALL.md)**

---

## Services

| Container | Image | Access |
|-----------|-------|--------|
| `traefik` | traefik:v3 | `traefik.yourdomain.com` (basic auth) |
| `cloudflared` | cloudflare/cloudflared | Cloudflare tunnel |
| `docker-socket-proxy` | tecnativa/docker-socket-proxy | internal only |
| `whoami` | traefik/whoami | `whoami.yourdomain.com` |
| `deployer` | local build | `deploy.yourdomain.com` |
| `postgres` | postgres:15-alpine | internal only |
| `redis` | redis:7-alpine | internal only |
| `portainer` | portainer-ce | `localhost:9000` |

## Folder Structure

```
homelab/
├── docker-compose.yml          # Full production stack
├── docker-compose.demo.yml     # Demo mode (deployer only)
├── .env                        # Secrets (do not commit)
├── .env.example                # Template
├── config/
│   └── security-headers.yml
├── logs/
├── data/                       # Persistent volumes
├── backups/                    # Automated daily backups
├── projects/
│   └── deployer/               # Web UI for deploying applications
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

## Installation

### Prerequisites

- Docker & Docker Compose
- A domain connected to Cloudflare
- [Cloudflare Zero Trust](https://one.dash.cloudflare.com/) account (free)

### 1. Clone the repo

```bash
git clone https://github.com/abibinyun/homelab-public.git homelab
cd homelab
```

### 2. Create a Cloudflare Tunnel

1. Log in to [Cloudflare Zero Trust](https://one.dash.cloudflare.com/)
2. **Networks → Tunnels → Create a tunnel** → name: `homelab`
3. Copy the tunnel token

### 3. Add Public Hostnames in Cloudflare

In the tunnel page → **Public Hostname**, add:

| Subdomain | Domain | Service |
|-----------|--------|---------|
| (empty) | `yourdomain.com` | `http://traefik:80` |
| `*` | `yourdomain.com` | `http://traefik:80` |
| `traefik` | `yourdomain.com` | `http://traefik:80` |

> All services always use `http://traefik:80` — Traefik handles routing based on subdomain.

> ⚠️ **Adding a new domain later?** Do NOT create a new tunnel. Just add the new domain's hostnames to this same tunnel. One tunnel handles all domains.

> ⚠️ **Wildcard subdomain** (`*`) is recommended so every new project subdomain works automatically without touching the tunnel config.

### 4. Configure `.env`

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Primary domain (without subdomain)
DOMAIN=yourdomain.com

# Deployer domain — IMPORTANT
# Default: deploy.${DOMAIN} → deployer runs at https://deploy.yourdomain.com
# Set this if you want deployer at the root domain or a different subdomain:
#   DEPLOYER_DOMAIN=yourdomain.com        → https://yourdomain.com
#   DEPLOYER_DOMAIN=panel.yourdomain.com  → https://panel.yourdomain.com
# ⚠️ This MUST match the URL you use to open the deployer in the browser.
#    If it doesn't match, login will fail with a 500 CORS error.
DEPLOYER_DOMAIN=

# Cloudflare Tunnel Token (from step 2)
# ⚠️ Use the token from the tunnel that is actually running (the one in docker-compose).
#    Do NOT create a new tunnel just for a new domain — add the new domain to the
#    existing tunnel's Public Hostnames instead.
TUNNEL_TOKEN=eyJh...

# Traefik Dashboard Auth
# Generate: docker run --rm httpd:alpine htpasswd -nb admin yourpassword
# Replace every $ with $$ in the value
TRAEFIK_AUTH=admin:$$apr1$$...

# Database — change before production!
POSTGRES_PASSWORD=strong-password-here
REDIS_PASSWORD=strong-password-here
# ⚠️ POSTGRES_PASSWORD cannot be changed after the first run without resetting the database.
#    Write it down somewhere safe.
```

### 5. Configure Deployer

```bash
cp projects/deployer/.env.example projects/deployer/.env
```

Edit `projects/deployer/.env`:

```env
DOMAIN=yourdomain.com
ADMIN_USER=admin
ADMIN_PASSWORD=strong-password-here    # REQUIRED — app will not start if empty
ADMIN_EMAIL=admin@yourdomain.com       # Optional

# Must match POSTGRES_PASSWORD in root .env
DATABASE_URL=postgresql://postgres:POSTGRES_PASSWORD@postgres:5432/deployer

# Must match REDIS_PASSWORD in root .env
REDIS_URL=redis://:REDIS_PASSWORD@redis:6379

# Generate: openssl rand -hex 32
JWT_SECRET=
SESSION_SECRET=
ENCRYPTION_KEY=

# Generate: openssl rand -hex 16
INTERNAL_WEBHOOK_TOKEN=
```

### 6. Run

```bash
docker compose up -d
docker compose ps
```

Access the Deployer UI at `https://deploy.yourdomain.com` — log in with the `ADMIN_USER` and `ADMIN_PASSWORD` you configured.

---

## Deployer — Web UI

Deployer is a web UI for deploying and managing applications in your homelab.

### Features

- Deploy applications from Git repositories (GitHub, GitLab, etc.)
- Manage containers (start, stop, restart, delete)
- View real-time logs
- Edit environment variables
- Webhook for auto-deploy on Git push
- Custom domain per application
- SSH key management for private repos

### Deploying a New Application

1. Open `https://deploy.yourdomain.com`
2. Log in with your credentials
3. Click **+ New Project**
4. Fill in:
   - **Project Name** — unique name (lowercase, dashes)
   - **Git URL** — `https://github.com/user/repo.git`
   - **Subdomain** — becomes `subdomain.yourdomain.com`
   - **Port** — the port your application listens on
   - **Environment Variables** — optional
5. Click **Create Project** → automatically clones, builds, and deploys

### Auto-deploy via Webhook

In the project page → click **🔗 Webhook** → copy the URL → paste it into your GitHub/GitLab webhook settings.

Every push to the repo will automatically trigger a redeploy.

---

## Adding a Service Manually (without Deployer UI)

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

Then:

```bash
docker compose up -d myapp
./scripts/cloudflare-route.sh myapp.yourdomain.com
```

To remove:

```bash
docker compose stop myapp && docker compose rm -f myapp
./scripts/cloudflare-remove.sh myapp.yourdomain.com
```

> `cloudflare-route.sh` requires additional variables in `.env`:
> ```env
> CLOUDFLARE_API_TOKEN=
> CLOUDFLARE_ACCOUNT_ID=
> CLOUDFLARE_TUNNEL_ID=
> CLOUDFLARE_ZONE_ID=
> ```

---

## Maintenance

```bash
# Update all containers
docker compose pull && docker compose up -d

# Manual backup
./scripts/backup.sh

# Maintenance menu (update, cleanup, logs, backup, restore)
./scripts/maintenance.sh

# Check resource usage
docker stats
```

---

## Troubleshooting

```bash
# Check container status
docker compose ps

# Check logs
docker compose logs cloudflared
docker compose logs traefik
docker compose logs deployer

# Check Traefik routers
curl http://localhost:8080/api/http/routers | jq
```

**Deployer not accessible / keeps restarting:**
```bash
docker compose logs deployer --tail=20
```
If you see `column does not exist`:
```bash
docker compose exec postgres psql -U postgres -d deployer -c "DROP TABLE IF EXISTS projects CASCADE; DROP TABLE IF EXISTS users CASCADE;"
docker compose restart deployer
```

---

## Security

- All internet traffic goes through Cloudflare Tunnel (zero-trust)
- Traefik dashboard protected by basic auth
- Portainer only accessible from `localhost:9000`
- Docker socket accessed via proxy (not directly)
- Security headers enabled
- UFW + fail2ban recommended on the host

See [docs/SECURITY.md](docs/SECURITY.md) for the full guide.

---

## Documentation

- [docs/DEPLOY_GUIDE.md](docs/DEPLOY_GUIDE.md) — Deploy by language (Node.js, PHP, Python, etc.)
- [docs/ADVANCED.md](docs/ADVANCED.md) — Database, monitoring, CI/CD, backup
- [docs/SECURITY.md](docs/SECURITY.md) — Security hardening
- [docs/CLOUDFLARE_API.md](docs/CLOUDFLARE_API.md) — Cloudflare API automation
- [docs/MULTIPLE_DOMAINS.md](docs/MULTIPLE_DOMAINS.md) — Multiple domain setup + deploying external projects
- [docs/CUSTOM_DOMAIN.md](docs/CUSTOM_DOMAIN.md) — Custom domain per project

---

## License

MIT License — free to use, modify, and distribute. See [LICENSE](LICENSE) for details.

© 2026 Muhammad Bilal — jobs.muhammadbilal@gmail.com
