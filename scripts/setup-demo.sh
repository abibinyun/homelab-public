#!/bin/bash
# setup-demo.sh — Preview UI deployer tanpa domain/Cloudflare/Traefik
# Idempotent: aman dijalankan berkali-kali

set -uo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; RED='\033[0;31m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✅ $*${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $*${NC}"; }
err()  { echo -e "${RED}❌ $*${NC}"; }
info() { echo -e "${CYAN}ℹ  $*${NC}"; }

cd "$(dirname "$0")/.."

echo -e "${CYAN}=== Deployer Demo Mode ===${NC}"
echo -e "${YELLOW}Mode ini hanya untuk preview UI. Semua action di-disable.${NC}\n"

# ── Prasyarat ─────────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
  err "Docker tidak ditemukan. Install dulu: https://docs.docker.com/get-docker/"
  exit 1
fi

if ! docker info &>/dev/null 2>&1; then
  err "Docker daemon tidak berjalan. Jalankan: sudo systemctl start docker"
  exit 1
fi

# ── Cek port ──────────────────────────────────────────────────
PORT=3000
while ss -tlnp 2>/dev/null | grep -q ":${PORT} " || lsof -i ":${PORT}" &>/dev/null 2>&1; do
  # Kecuali port dipakai container deployer sendiri
  CONTAINER_PORT=$(docker inspect deployer 2>/dev/null | grep -o '"HostPort": "[0-9]*"' | head -1 | grep -o '[0-9]*' || true)
  [ "$CONTAINER_PORT" = "$PORT" ] && break
  PORT=$((PORT + 1))
done
[ "$PORT" != "3000" ] && warn "Port 3000 dipakai, demo akan jalan di port $PORT" || info "Port $PORT tersedia"

# ── Deteksi status instalasi ──────────────────────────────────
ENV_EXISTS=false
CONTAINER_EXISTS=false
[ -f "projects/deployer/.env" ] && ENV_EXISTS=true
docker ps -a --format '{{.Names}}' 2>/dev/null | grep -q "^deployer$" && CONTAINER_EXISTS=true

if [ "$ENV_EXISTS" = true ] || [ "$CONTAINER_EXISTS" = true ]; then
  echo -e "\n${YELLOW}⚠ Demo sudah pernah diinstall.${NC}\n"
  echo "Pilih opsi:"
  echo "  [1] Update / restart (data tetap)"
  echo "  [2] Fresh install (hapus semua data)"
  echo "  [3] Uninstall"
  echo "  [4] Batal"
  echo ""
  read -p "Pilihan [1-4]: " CHOICE

  case "$CHOICE" in
    1)
      info "Restarting demo..."
      # Ambil port dari container yang ada jika masih running
      CONTAINER_PORT=$(docker inspect deployer 2>/dev/null | grep -o '"HostPort": "[0-9]*"' | head -1 | grep -o '[0-9]*' || true)
      [ -n "$CONTAINER_PORT" ] && PORT=$CONTAINER_PORT
      PORT=${PORT} docker compose -f docker-compose.demo.yml up -d --build 2>&1 || {
        err "Gagal restart. Coba: docker compose -f docker-compose.demo.yml logs"
        exit 1
      }
      ok "Demo updated!"
      echo -e "Buka:  ${CYAN}http://localhost:${PORT}${NC}"
      echo -e "Login: ${CYAN}demo${NC} / ${CYAN}demo1234${NC}"
      exit 0
      ;;
    2)
      info "Menghapus data lama..."
      docker compose -f docker-compose.demo.yml down -v 2>/dev/null || true
      sudo rm -f projects/deployer/data/projects.json \
                 projects/deployer/data/users.json \
                 projects/deployer/data/sessions.json \
                 projects/deployer/data/settings.json \
                 projects/deployer/.env 2>/dev/null || \
      rm -f projects/deployer/data/projects.json \
            projects/deployer/data/users.json \
            projects/deployer/data/sessions.json \
            projects/deployer/data/settings.json \
            projects/deployer/.env 2>/dev/null || true
      ok "Data lama dihapus"
      ;;
    3)
      info "Uninstalling demo..."
      docker compose -f docker-compose.demo.yml down -v 2>/dev/null || true
      sudo rm -f projects/deployer/data/projects.json \
                 projects/deployer/data/users.json \
                 projects/deployer/data/sessions.json \
                 projects/deployer/data/settings.json \
                 projects/deployer/.env 2>/dev/null || \
      rm -f projects/deployer/data/projects.json \
            projects/deployer/data/users.json \
            projects/deployer/data/sessions.json \
            projects/deployer/data/settings.json \
            projects/deployer/.env 2>/dev/null || true
      ok "Demo berhasil diuninstall."
      exit 0
      ;;
    4)
      echo "Dibatalkan."; exit 0 ;;
    *)
      err "Pilihan tidak valid."; exit 1 ;;
  esac
fi

# ── Fresh install ─────────────────────────────────────────────
info "Membuat konfigurasi demo..."

mkdir -p projects/deployer/data

JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || cat /proc/sys/kernel/random/uuid | tr -d '-')
SESSION_SECRET=$(openssl rand -hex 32 2>/dev/null || cat /proc/sys/kernel/random/uuid | tr -d '-')
ENCRYPTION_KEY=$(openssl rand -hex 32 2>/dev/null || cat /proc/sys/kernel/random/uuid | tr -d '-')

cat > projects/deployer/.env <<EOF
ADMIN_USER=demo
ADMIN_PASSWORD=demo1234
NODE_ENV=production
PORT=${PORT}
DOMAIN=localhost
VITE_DOMAIN=localhost
DEMO_MODE=true
DATABASE_URL=
REDIS_URL=
JWT_SECRET=${JWT_SECRET}
SESSION_SECRET=${SESSION_SECRET}
ENCRYPTION_KEY=${ENCRYPTION_KEY}
SSH_KEY_PATH=/app/.ssh/id_ed25519.pub
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_ZONE_ID=
CLOUDFLARE_TUNNEL_ID=
HOMELAB_PATH=/homelab
DOCKER_NETWORK=homelab-public_web
EOF

ok "projects/deployer/.env dibuat"

info "Menjalankan demo di port ${PORT}..."
PORT=${PORT} docker compose -f docker-compose.demo.yml up -d --build 2>&1 || {
  err "Gagal menjalankan demo."
  err "Cek: docker compose -f docker-compose.demo.yml logs"
  exit 1
}

# Tunggu container ready
info "Menunggu container ready..."
for i in $(seq 1 10); do
  sleep 2
  if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^deployer$"; then
    break
  fi
  [ "$i" = "10" ] && warn "Container belum ready, cek: docker compose -f docker-compose.demo.yml logs"
done

echo ""
ok "Demo siap!"
echo -e "Buka:  ${CYAN}http://localhost:${PORT}${NC}"
echo -e "Login: ${CYAN}demo${NC} / ${CYAN}demo1234${NC}"
echo ""
echo -e "${YELLOW}Ini mode demo — semua action di-disable.${NC}"
echo -e "${YELLOW}Untuk setup production: ${CYAN}./scripts/setup.sh${NC}"
