# Deployer - Development Guide

## Quick Start

### Demo Mode (UI preview)
```bash
./scripts/setup-demo.sh
```
- No domain, Cloudflare, or Traefik required
- Login: `demo` / `demo1234`
- All actions disabled
- Access: `http://localhost:3000`

### Development Mode (hot reload)
```bash
npm install
cp .env.example .env  # fill in at least ADMIN_USER and ADMIN_PASSWORD
npm run dev
```
- Frontend: `http://localhost:5173`
- API: `http://localhost:3000`

### Production
```bash
./scripts/setup.sh
```
- Full setup: Traefik + Cloudflare + Postgres + Redis + Deployer
- Access: `https://deploy.yourdomain.com`

## Environment

| Mode | Database | Redis | Domain |
|------|----------|-------|--------|
| Demo | ❌ JSON file | ❌ memory | ❌ localhost |
| Dev | ✅ optional | ✅ optional | ❌ localhost |
| Production | ✅ PostgreSQL | ✅ Redis | ✅ domain |

## Private Repository

### Option 1: HTTPS Token (Recommended)
When creating a project, fill in the **Git Token** field with a Personal Access Token from GitHub/GitLab.
The token is encrypted with `ENCRYPTION_KEY` before being stored.

### Option 2: SSH Key
1. Go to **Settings → SSH Key** in the UI to view the public key
2. Add that public key to your GitHub/GitLab account (Settings → SSH Keys)
3. Use the SSH URL when creating a project: `git@github.com:user/repo.git`

> The SSH key is auto-generated when the container first starts, stored in a Docker volume.

## Troubleshooting

**Port already in use:**
```bash
lsof -i :3000
lsof -i :5173
```

**Database connection error:**
- Ensure `DATABASE_URL` in `.env` is correct
- If empty, the server automatically falls back to JSON file storage

**Hot reload not working:**
- Hard refresh: `Ctrl+Shift+R`
- Check the Vite terminal for errors
