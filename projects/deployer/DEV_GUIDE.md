# Deployer - Development Guide

## Quick Start

### Demo Mode (preview UI)
```bash
./scripts/setup-demo.sh
```
- Tidak butuh domain/Cloudflare/Traefik
- Login: `demo` / `demo1234`
- Semua action di-disable
- Akses: `http://localhost:3000`

### Development Mode (hot reload)
```bash
npm install
cp .env.example .env  # isi ADMIN_USER + ADMIN_PASSWORD minimal
npm run dev
```
- Frontend: `http://localhost:5173`
- API: `http://localhost:3000`

### Production
```bash
./scripts/setup.sh
```
- Full setup: Traefik + Cloudflare + Postgres + Redis + Deployer
- Akses: `https://deploy.yourdomain.com`

## Environment

| Mode | Database | Redis | Domain |
|------|----------|-------|--------|
| Demo | ❌ JSON file | ❌ memory | ❌ localhost |
| Dev | ✅ optional | ✅ optional | ❌ localhost |
| Production | ✅ PostgreSQL | ✅ Redis | ✅ domain |

## Private Repository

### Cara 1: HTTPS Token (Recommended)
Saat buat project, isi field **Git Token** dengan Personal Access Token dari GitHub/GitLab.
Token di-encrypt dengan `ENCRYPTION_KEY` sebelum disimpan.

### Cara 2: SSH Key
1. Buka **Settings → SSH Key** di UI untuk lihat public key
2. Tambahkan public key tersebut ke GitHub/GitLab account (Settings → SSH Keys)
3. Gunakan SSH URL saat buat project: `git@github.com:user/repo.git`

> SSH key di-generate otomatis saat container pertama kali jalan, disimpan di volume Docker.

## Troubleshooting

**Port already in use:**
```bash
lsof -i :3000
lsof -i :5173
```

**Database connection error:**
- Pastikan `DATABASE_URL` di `.env` sudah benar
- Jika kosong, server otomatis fallback ke JSON file storage

**Hot reload tidak jalan:**
- Hard refresh: `Ctrl+Shift+R`
- Cek terminal Vite untuk error
