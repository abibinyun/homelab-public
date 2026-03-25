#!/bin/bash
# setup.sh — Setup full homelab: Traefik + Cloudflare Tunnel + Deployer + DB + Redis
# Idempotent: aman dijalankan berkali-kali

set -uo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; RED='\033[0;31m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✅ $*${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $*${NC}"; }
err()  { echo -e "${RED}❌ $*${NC}"; }
info() { echo -e "${CYAN}ℹ  $*${NC}"; }

cd "$(dirname "$0")/.."

echo -e "${CYAN}=== Homelab Full Setup ===${NC}"
echo -e "${YELLOW}Butuh: domain di Cloudflare + Cloudflare Tunnel Token${NC}\n"

# ── Prasyarat ─────────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
  err "Docker tidak ditemukan. Install dulu: https://docs.docker.com/get-docker/"
  exit 1
fi

if ! docker info &>/dev/null 2>&1; then
  err "Docker daemon tidak berjalan. Jalankan: sudo systemctl start docker"
  exit 1
fi

if ! command -v openssl &>/dev/null; then
  err "openssl tidak ditemukan. Install: sudo apt install openssl"
  exit 1
fi

# ── Deteksi status instalasi ──────────────────────────────────
ENV_EXISTS=false
DEPLOYER_ENV_EXISTS=false
CONTAINER_EXISTS=false
[ -f ".env" ] && ENV_EXISTS=true
[ -f "projects/deployer/.env" ] && DEPLOYER_ENV_EXISTS=true
docker ps -a --format '{{.Names}}' 2>/dev/null | grep -q "^deployer$" && CONTAINER_EXISTS=true

if [ "$ENV_EXISTS" = true ] || [ "$DEPLOYER_ENV_EXISTS" = true ] || [ "$CONTAINER_EXISTS" = true ]; then
  echo -e "${YELLOW}⚠ Homelab sudah pernah diinstall.${NC}\n"
  echo "Pilih opsi:"
  echo "  [1] Update / restart (config tetap, data tetap)"
  echo "  [2] Fresh install (hapus semua data, mulai dari awal)"
  echo "  [3] Uninstall (hapus container, volume, dan .env)"
  echo "  [4] Batal"
  echo ""
  read -p "Pilihan [1-4]: " CHOICE

  case "$CHOICE" in
    1)
      info "Restarting semua services..."
      docker compose down 2>/dev/null || true
      docker compose up -d --build 2>&1 || {
        err "Gagal restart. Cek: docker compose logs"
        exit 1
      }
      DOMAIN=$(grep "^DOMAIN=" .env 2>/dev/null | cut -d= -f2 || echo "yourdomain.com")
      ok "Update selesai!"
      echo -e "Deployer: ${CYAN}https://deploy.${DOMAIN}${NC}"
      echo -e "Traefik:  ${CYAN}https://traefik.${DOMAIN}${NC}"
      echo -e "\n${YELLOW}Jika tidak bisa diakses, cek:${NC}"
      echo -e "  ${CYAN}docker compose logs deployer --tail=20${NC}"
      echo -e "  ${CYAN}docker compose logs cloudflared --tail=20${NC}"
      exit 0
      ;;
    2)
      info "Menghapus semua data lama..."
      docker compose down -v 2>/dev/null || true
      rm -f .env projects/deployer/.env 2>/dev/null || true
      sudo rm -rf data/postgres data/redis \
                  projects/deployer/data/projects.json \
                  projects/deployer/data/users.json \
                  projects/deployer/data/sessions.json \
                  projects/deployer/data/settings.json 2>/dev/null || \
      rm -rf data/postgres data/redis \
             projects/deployer/data/projects.json \
             projects/deployer/data/users.json \
             projects/deployer/data/sessions.json \
             projects/deployer/data/settings.json 2>/dev/null || true
      ok "Data lama dihapus"
      ;;
    3)
      info "Uninstalling homelab..."
      docker compose down -v 2>/dev/null || true
      rm -f .env projects/deployer/.env 2>/dev/null || true
      sudo rm -rf data/postgres data/redis \
                  projects/deployer/data/projects.json \
                  projects/deployer/data/users.json \
                  projects/deployer/data/sessions.json \
                  projects/deployer/data/settings.json 2>/dev/null || \
      rm -rf data/postgres data/redis \
             projects/deployer/data/projects.json \
             projects/deployer/data/users.json \
             projects/deployer/data/sessions.json \
             projects/deployer/data/settings.json 2>/dev/null || true
      ok "Homelab berhasil diuninstall."
      warn "Docker images tidak dihapus. Untuk hapus: docker image prune -a"
      exit 0
      ;;
    4)
      echo "Dibatalkan."; exit 0 ;;
    *)
      err "Pilihan tidak valid."; exit 1 ;;
  esac
fi

# ── Cek port 80 (hanya untuk fresh install) ───────────────────
if ss -tlnp 2>/dev/null | grep -q ":80 " || lsof -i ":80" &>/dev/null 2>&1; then
  err "Port 80 sudah dipakai. Traefik membutuhkan port 80."
  echo -e "   Cek: ${CYAN}sudo lsof -i :80${NC}"
  echo -e "   Hentikan service di port 80 lalu jalankan ulang."
  exit 1
fi
ok "Port 80 tersedia"

# ── Input ─────────────────────────────────────────────────────
echo ""
read -p "Domain kamu (contoh: example.com): " DOMAIN
[ -z "$DOMAIN" ] && { err "Domain wajib diisi"; exit 1; }

read -p "Cloudflare Tunnel Token: " TUNNEL_TOKEN
[ -z "$TUNNEL_TOKEN" ] && { err "Tunnel token wajib diisi"; exit 1; }

read -p "Admin username untuk Deployer [admin]: " ADMIN_USER
ADMIN_USER=${ADMIN_USER:-admin}

read -s -p "Admin password untuk Deployer (min 6 karakter): " ADMIN_PASSWORD
echo ""
[ ${#ADMIN_PASSWORD} -lt 6 ] && { err "Password minimal 6 karakter"; exit 1; }

echo -e "\n${YELLOW}Setup Traefik dashboard auth${NC}"
read -p "Traefik username [admin]: " TRAEFIK_USER
TRAEFIK_USER=${TRAEFIK_USER:-admin}
read -s -p "Traefik password: " TRAEFIK_PASS
echo ""
[ -z "$TRAEFIK_PASS" ] && { err "Traefik password wajib diisi"; exit 1; }

# Generate htpasswd — coba docker, fallback ke htpasswd langsung
TRAEFIK_AUTH=""
if docker run --rm httpd:alpine htpasswd -nb "$TRAEFIK_USER" "$TRAEFIK_PASS" &>/dev/null 2>&1; then
  TRAEFIK_AUTH=$(docker run --rm httpd:alpine htpasswd -nb "$TRAEFIK_USER" "$TRAEFIK_PASS" 2>/dev/null | sed 's/\$/\$\$/g')
elif command -v htpasswd &>/dev/null; then
  TRAEFIK_AUTH=$(htpasswd -nb "$TRAEFIK_USER" "$TRAEFIK_PASS" 2>/dev/null | sed 's/\$/\$\$/g')
else
  err "Tidak bisa generate htpasswd. Install: sudo apt install apache2-utils"
  exit 1
fi

# Generate secrets
POSTGRES_PASSWORD=$(openssl rand -hex 16)
REDIS_PASSWORD=$(openssl rand -hex 16)
JWT_SECRET=$(openssl rand -hex 32)
SESSION_SECRET=$(openssl rand -hex 32)
ENCRYPTION_KEY=$(openssl rand -hex 32)

# Cloudflare API (opsional)
echo ""
echo -e "${YELLOW}Cloudflare API — untuk auto-routing subdomain per project (opsional)${NC}"
read -p "Skip? [Y/n]: " SKIP_CF
SKIP_CF=${SKIP_CF:-Y}

CF_API_TOKEN="" CF_ZONE_ID="" CF_ACCOUNT_ID="" CF_TUNNEL_ID=""
if [[ "$SKIP_CF" =~ ^[Nn]$ ]]; then
  read -p "Cloudflare API Token: " CF_API_TOKEN
  read -p "Cloudflare Zone ID: " CF_ZONE_ID
  read -p "Cloudflare Account ID: " CF_ACCOUNT_ID
  read -p "Cloudflare Tunnel ID: " CF_TUNNEL_ID
fi

# ── Tulis .env files ──────────────────────────────────────────
info "Membuat konfigurasi..."

cat > .env <<EOF
DOMAIN=${DOMAIN}
TUNNEL_TOKEN=${TUNNEL_TOKEN}
TRAEFIK_AUTH=${TRAEFIK_AUTH}
POSTGRES_USER=postgres
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=deployer
REDIS_PASSWORD=${REDIS_PASSWORD}
CLOUDFLARE_API_TOKEN=${CF_API_TOKEN}
CLOUDFLARE_ZONE_ID=${CF_ZONE_ID}
CLOUDFLARE_ACCOUNT_ID=${CF_ACCOUNT_ID}
CLOUDFLARE_TUNNEL_ID=${CF_TUNNEL_ID}
EOF
ok ".env root dibuat"

mkdir -p projects/deployer/data

cat > projects/deployer/.env <<EOF
ADMIN_USER=${ADMIN_USER}
ADMIN_PASSWORD=${ADMIN_PASSWORD}
NODE_ENV=production
PORT=3000
DOMAIN=${DOMAIN}
VITE_DOMAIN=${DOMAIN}
DATABASE_URL=postgresql://postgres:${POSTGRES_PASSWORD}@postgres:5432/deployer
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379
JWT_SECRET=${JWT_SECRET}
SESSION_SECRET=${SESSION_SECRET}
ENCRYPTION_KEY=${ENCRYPTION_KEY}
SSH_KEY_PATH=/app/.ssh/id_ed25519.pub
CLOUDFLARE_API_TOKEN=${CF_API_TOKEN}
CLOUDFLARE_ZONE_ID=${CF_ZONE_ID}
CLOUDFLARE_TUNNEL_ID=${CF_TUNNEL_ID}
HOMELAB_PATH=/homelab
DOCKER_NETWORK=homelab-public_web
EOF
ok "projects/deployer/.env dibuat"

# ── Jalankan ──────────────────────────────────────────────────
info "Menjalankan semua services..."
docker compose up -d --build 2>&1 || {
  err "Gagal menjalankan services."
  err "Cek: docker compose logs"
  err "Jika ingin coba ulang: ./scripts/setup.sh → pilih [1] Update"
  exit 1
}

# Tunggu deployer ready
info "Menunggu deployer ready..."
for i in $(seq 1 15); do
  sleep 2
  if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^deployer$"; then
    break
  fi
  [ "$i" = "15" ] && warn "Deployer belum ready, cek: docker compose logs deployer"
done

echo ""
ok "Setup selesai!"
echo -e "Deployer: ${CYAN}https://deploy.${DOMAIN}${NC}"
echo -e "Traefik:  ${CYAN}https://traefik.${DOMAIN}${NC}"
echo ""
echo -e "${YELLOW}⏳ Tunggu 10-30 detik untuk Cloudflare Tunnel terhubung.${NC}"
echo -e "   Jika tidak bisa diakses:"
echo -e "   ${CYAN}docker compose logs deployer --tail=20${NC}"
echo -e "   ${CYAN}docker compose logs cloudflared --tail=20${NC}"
echo ""
if [[ "$SKIP_CF" =~ ^[Yy]$ ]]; then
  warn "Cloudflare API tidak dikonfigurasi — auto-routing subdomain tidak aktif."
  echo -e "  Tambahkan nanti di .env dan projects/deployer/.env, lalu jalankan opsi [1] Update."
fi
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}🔒 Lakukan security hardening sebelum digunakan di production:${NC}"
echo -e "   ${CYAN}sudo ./scripts/security-hardening.sh${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
