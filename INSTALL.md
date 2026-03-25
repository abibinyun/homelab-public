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
| Requirement | Keterangan |
|-------------|------------|
| Semua di atas | ✅ |
| Domain | Domain aktif yang **sudah terdaftar di Cloudflare** |
| Cloudflare account | Free tier cukup |
| Cloudflare Tunnel | Gratis — [cara buat](#cloudflare-tunnel) |
| Port 80 | Harus bebas di server (untuk Traefik) |
| RAM | Min 1 GB (rekomendasi 2 GB+) |
| Disk | Min 10 GB |

> ⚠️ **Full setup TIDAK akan berjalan tanpa domain di Cloudflare.**
> Jika belum punya, gunakan [Demo Mode](#demo-mode-preview-ui) dulu.

---

## Cara Install

### Demo Mode (Preview UI)

Tidak butuh domain. Cocok untuk lihat-lihat fitur.

```bash
git clone https://github.com/abibinyun/homelab-public.git homelab
cd homelab
./scripts/setup-demo.sh
```

Buka `http://localhost:3000` — login `demo` / `demo1234`.

> Data disimpan di file JSON. Semua action di-disable (read-only UI).

---

### Full Production Setup

#### Prerequisites

**1. Domain di Cloudflare**

Domain kamu harus menggunakan Cloudflare sebagai nameserver:
1. Beli domain di registrar manapun (Namecheap, GoDaddy, dll)
2. Di registrar, ganti nameserver ke Cloudflare:
   - `xxx.ns.cloudflare.com`
   - `yyy.ns.cloudflare.com`
3. Tunggu propagasi (biasanya 5–30 menit)
4. Verifikasi di [dash.cloudflare.com](https://dash.cloudflare.com) — status harus **Active**

**2. Cloudflare Tunnel** {#cloudflare-tunnel}

1. Buka [Cloudflare Zero Trust](https://one.dash.cloudflare.com/)
2. **Networks → Tunnels → Create a tunnel**
3. Pilih **Cloudflared** → beri nama (contoh: `homelab`)
4. Copy **tunnel token** (format panjang dimulai `eyJ...`)
5. Di tab **Public Hostname**, tambahkan:

| Subdomain | Domain | Service |
|-----------|--------|---------|
| `deploy` | `yourdomain.com` | `http://traefik:80` |
| `traefik` | `yourdomain.com` | `http://traefik:80` |

> Semua subdomain selalu pakai `http://traefik:80` — Traefik yang handle routing.

**3. Server**

- Port 80 harus bebas: `sudo lsof -i :80`
- Docker terinstall: `docker --version`
- Docker Compose v2: `docker compose version`

#### Install

```bash
git clone https://github.com/abibinyun/homelab-public.git homelab
cd homelab
./scripts/setup.sh
```

Script akan menanyakan:
- Domain kamu
- Cloudflare Tunnel Token
- Username & password untuk Deployer UI
- Username & password untuk Traefik dashboard
- Cloudflare API (opsional — untuk auto-routing subdomain)

Setelah selesai:
```bash
docker compose up -d
docker compose ps   # pastikan semua container running
```

Akses Deployer di `https://deploy.yourdomain.com`.

---

## Cloudflare API (Opsional)

Tanpa Cloudflare API, subdomain untuk setiap project yang di-deploy **tidak akan otomatis terbuat**. Kamu harus tambah DNS record manual di Cloudflare setiap deploy project baru.

Untuk mengaktifkan auto-routing:

1. Buka [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. **Create Token → Custom Token**
3. Permissions:
   - `Zone → DNS → Edit`
   - `Zone → Zone → Read`
   - `Account → Cloudflare Tunnel → Edit`
4. Masukkan token, Zone ID, Account ID, dan Tunnel ID ke `.env` atau jalankan ulang `./scripts/setup.sh`

---

## Troubleshooting

**Container tidak mau start:**
```bash
docker compose logs cloudflared   # cek tunnel
docker compose logs traefik       # cek reverse proxy
docker compose logs deployer      # cek app
```

**Port 80 sudah dipakai:**
```bash
sudo lsof -i :80
sudo systemctl stop apache2   # atau nginx, dll
```

**Domain tidak bisa diakses:**
- Pastikan Public Hostname sudah ditambahkan di Cloudflare Tunnel
- Pastikan `DOMAIN` di `.env` sudah benar
- Tunggu beberapa menit untuk propagasi

**Login tidak bisa:**
- `ADMIN_PASSWORD` **wajib diisi** di `.env` sebelum pertama kali `docker compose up` — jika kosong, app tidak akan start sama sekali
- Jika sudah terlanjur jalan tanpa set: `rm -rf projects/deployer/data/ && docker compose restart deployer`
- Jika lupa password: `./scripts/reset-password.sh`

**Deployer terus restart / tidak bisa start:**
```bash
docker compose logs deployer --tail=30
```
Jika ada error `column does not exist` atau `relation does not exist`:
```bash
# Reset database deployer (data projects hilang)
docker compose exec postgres psql -U postgres -d deployer -c "DROP TABLE IF EXISTS projects CASCADE; DROP TABLE IF EXISTS users CASCADE;"
docker compose restart deployer
```

**Upgrade dari versi lama:**

Jika sebelumnya pernah install versi lain, jalankan fresh install:
```bash
./scripts/setup.sh   # pilih opsi [2] Fresh install
```
