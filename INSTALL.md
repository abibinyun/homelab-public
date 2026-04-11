# Installation Guide

## Requirements

### Minimum (Demo Mode)
| Requirement | Minimum |
|-------------|---------|
| OS | Linux / macOS / Windows (WSL2) |
| Docker | 20.10+ |
| Docker Compose | v2.0+ |
| RAM | 512 MB |
| Disk | 2 GB |

### Full Production Setup
| Requirement | Notes |
|-------------|-------|
| All of the above | ✅ |
| Domain | Active domain **registered with Cloudflare** |
| Cloudflare account | Free tier is sufficient |
| Cloudflare Tunnel | Free — [how to create](#cloudflare-tunnel) |
| Port 80 | Must be free on the server (for Traefik) |
| RAM | Min 1 GB (2 GB+ recommended) |
| Disk | Min 10 GB |

> ⚠️ **Full setup will NOT work without a domain on Cloudflare.**
> If you don't have one, use [Demo Mode](#demo-mode-preview-ui) first.

---

## How to Install

### Demo Mode (Preview UI)

No domain required. Great for exploring features.

```bash
git clone https://github.com/abibinyun/homelab-public.git homelab
cd homelab
./scripts/setup-demo.sh
```

Open `http://localhost:3000` — login `demo` / `demo1234`.

> Data is stored in a JSON file. All actions are disabled (read-only UI).

---

### Full Production Setup

#### Prerequisites

**1. Domain on Cloudflare**

Your domain must use Cloudflare as its nameserver:
1. Buy a domain from any registrar (Namecheap, GoDaddy, etc.)
2. At the registrar, change the nameservers to Cloudflare:
   - `xxx.ns.cloudflare.com`
   - `yyy.ns.cloudflare.com`
3. Wait for propagation (usually 5–30 minutes)
4. Verify at [dash.cloudflare.com](https://dash.cloudflare.com) — status must be **Active**

**2. Cloudflare Tunnel** {#cloudflare-tunnel}

1. Open [Cloudflare Zero Trust](https://one.dash.cloudflare.com/)
2. **Networks → Tunnels → Create a tunnel**
3. Select **Cloudflared** → give it a name (e.g. `homelab`)
4. Copy the **tunnel token** (long string starting with `eyJ...`)
5. In the **Public Hostname** tab, add:

| Subdomain | Domain | Service |
|-----------|--------|---------|
| (empty) | `yourdomain.com` | `http://traefik:80` |
| `*` | `yourdomain.com` | `http://traefik:80` |
| `traefik` | `yourdomain.com` | `http://traefik:80` |

> All hostnames always use `http://traefik:80` — Traefik handles routing.

> ⚠️ **One tunnel for everything.** When adding a new domain later, add its hostnames to **this same tunnel** — do not create a new one. Two cloudflared containers using the same tunnel token will conflict.

> ⚠️ **Wildcard (`*`) is important.** Without it, new project subdomains won't be reachable until you manually add each one to the tunnel.

**3. Server**

- Port 80 must be free: `sudo lsof -i :80`
- Docker installed: `docker --version`
- Docker Compose v2: `docker compose version`

#### Install

```bash
git clone https://github.com/abibinyun/homelab-public.git homelab
cd homelab
./scripts/setup.sh
```

The script will ask for:
- Your domain
- Cloudflare Tunnel Token
- Username & password for the Deployer UI
- Username & password for the Traefik dashboard
- Cloudflare API credentials (optional — for auto-routing subdomains)

After completion:
```bash
docker compose up -d
docker compose ps   # verify all containers are running
```

Access Deployer at `https://deploy.yourdomain.com`.

---

## Cloudflare API (Optional)

Without the Cloudflare API, subdomains for each deployed project **will not be created automatically**. You will need to add DNS records manually in Cloudflare for every new project.

To enable auto-routing:

1. Open [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. **Create Token → Custom Token**
3. Permissions:
   - `Zone → DNS → Edit`
   - `Zone → Zone → Read`
   - `Account → Cloudflare Tunnel → Edit`
4. Add the token, Zone ID, Account ID, and Tunnel ID to `.env` or re-run `./scripts/setup.sh`

---

## Troubleshooting

**Container won't start:**
```bash
docker compose logs cloudflared   # check tunnel
docker compose logs traefik       # check reverse proxy
docker compose logs deployer      # check app
```

**Port 80 already in use:**
```bash
sudo lsof -i :80
sudo systemctl stop apache2   # or nginx, etc.
```

**Domain not accessible:**
- Ensure the Public Hostname has been added in the Cloudflare Tunnel
- Ensure `DOMAIN` in `.env` is correct
- Wait a few minutes for propagation

**Cannot login (500 error):**
- Check deployer logs: `docker compose logs deployer --tail=20`
- Common cause: CORS error — ensure `DEPLOYER_DOMAIN` in `.env` matches the actual URL you use to access the deployer
  - If deployer runs at `https://cube.my.id` → set `DEPLOYER_DOMAIN=cube.my.id`
  - If deployer runs at `https://deploy.yourdomain.com` → leave `DEPLOYER_DOMAIN` empty (default)
- After changing `.env`, rebuild and restart: `docker compose up -d --build deployer`

**Cannot login (wrong password):**
- `ADMIN_PASSWORD` is **required** in `.env` before the first `docker compose up` — if empty, the app will not start
- If already running without it set: `rm -rf projects/deployer/data/ && docker compose restart deployer`
- If you forgot your password: `./scripts/reset-password.sh`

**Deployer keeps restarting / won't start:**
```bash
docker compose logs deployer --tail=30
```
If you see `password authentication failed for user "postgres"`:
- Your `POSTGRES_PASSWORD` in `.env` does not match the password used when the database was first created
- Fix: set `POSTGRES_PASSWORD` back to the original value, then restart

If you see `column does not exist` or `relation does not exist`:
```bash
# Reset deployer database (project data will be lost)
docker compose exec postgres psql -U postgres -d deployer -c "DROP TABLE IF EXISTS projects CASCADE; DROP TABLE IF EXISTS users CASCADE;"
docker compose restart deployer
```

**Upgrading from an older version:**

If you previously installed an older version, run a fresh install:
```bash
./scripts/setup.sh   # choose option [2] Fresh install
```
