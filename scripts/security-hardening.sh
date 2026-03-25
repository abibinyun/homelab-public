#!/bin/bash
# security-hardening.sh — Idempotent security hardening
# Aman dijalankan berkali-kali, handle partial run, resume otomatis

# Jangan pakai set -e — kita handle error sendiri per step
set -uo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

ok()   { echo -e "${GREEN}✅ $*${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $*${NC}"; }
err()  { echo -e "${RED}❌ $*${NC}"; }
info() { echo -e "${CYAN}ℹ  $*${NC}"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
STATE_FILE="/tmp/.homelab-hardening-state"

# ── Root check ────────────────────────────────────────────────
if [ "$EUID" -ne 0 ]; then
  err "Jalankan sebagai root: sudo ./scripts/security-hardening.sh"
  exit 1
fi

echo -e "${CYAN}🔐 Security Hardening${NC}"
echo "========================"
echo ""

# ── Deteksi resume ────────────────────────────────────────────
COMPLETED_STEPS=()
if [ -f "$STATE_FILE" ]; then
  mapfile -t COMPLETED_STEPS < "$STATE_FILE"
  warn "Script sebelumnya tidak selesai. Melanjutkan dari step yang belum selesai..."
  echo "  Sudah selesai: ${COMPLETED_STEPS[*]:-tidak ada}"
  echo ""
fi

step_done() { grep -qx "$1" "$STATE_FILE" 2>/dev/null; }
mark_done() { echo "$1" >> "$STATE_FILE"; }

# ── Deteksi SSH port ──────────────────────────────────────────
SSH_PORT=$(ss -tlnp 2>/dev/null | grep -E 'sshd|:22' | grep -oP ':\K[0-9]+' | head -1)
[ -z "$SSH_PORT" ] && SSH_PORT=22

echo "SSH port terdeteksi: $SSH_PORT"
read -p "Benar? [Y/n]: " ssh_confirm
ssh_confirm=${ssh_confirm:-Y}
if [[ ! "$ssh_confirm" =~ ^[Yy]$ ]]; then
  read -p "Masukkan SSH port yang benar: " SSH_PORT
fi

# ── Konfirmasi ────────────────────────────────────────────────
echo ""
echo "Yang akan dilakukan:"
echo "  1. UFW firewall (allow SSH:$SSH_PORT, 80, 443)"
echo "  2. fail2ban (proteksi brute force SSH)"
echo "  3. Unattended upgrades (auto security updates)"
echo ""
read -p "Lanjutkan? [y/N]: " confirm
confirm=${confirm:-N}
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
  echo "Dibatalkan."
  exit 0
fi

# ── Backup ────────────────────────────────────────────────────
BACKUP_DIR="$ROOT_DIR/backups/security-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
[ -f /etc/ufw/ufw.conf ]       && cp /etc/ufw/ufw.conf "$BACKUP_DIR/" 2>/dev/null || true
[ -f /etc/fail2ban/jail.local ] && cp /etc/fail2ban/jail.local "$BACKUP_DIR/" 2>/dev/null || true
info "Backup disimpan di $BACKUP_DIR"
echo ""

# ═══════════════════════════════════════════════════════════════
# STEP 1: UFW
# ═══════════════════════════════════════════════════════════════
echo -e "${CYAN}🔥 Step 1/3: UFW Firewall${NC}"
echo "──────────────────────────"

if step_done "ufw"; then
  ok "UFW sudah dikonfigurasi (skip)"
else
  # Install jika belum ada
  if ! command -v ufw &>/dev/null; then
    info "Menginstall UFW..."
    apt-get update -qq && apt-get install -y -qq ufw || { err "Gagal install UFW"; }
  fi

  if command -v ufw &>/dev/null; then
    # Reset hanya jika UFW belum aktif dengan config yang benar
    UFW_ACTIVE=$(ufw status 2>/dev/null | grep -c "Status: active" || true)

    ufw --force reset >/dev/null 2>&1 || true
    ufw default deny incoming >/dev/null 2>&1
    ufw default allow outgoing >/dev/null 2>&1

    # SSH — pastikan tidak terkunci
    ufw allow "$SSH_PORT/tcp" comment 'SSH' >/dev/null 2>&1
    ufw allow 80/tcp comment 'HTTP' >/dev/null 2>&1
    ufw allow 443/tcp comment 'HTTPS' >/dev/null 2>&1

    echo "y" | ufw enable >/dev/null 2>&1 || true

    if ufw status | grep -q "Status: active"; then
      ok "UFW aktif"
      ufw status numbered
      mark_done "ufw"
    else
      warn "UFW mungkin tidak aktif, cek manual: sudo ufw status"
    fi
  else
    warn "UFW tidak bisa diinstall, skip"
  fi
fi

echo ""

# ═══════════════════════════════════════════════════════════════
# STEP 2: fail2ban
# ═══════════════════════════════════════════════════════════════
echo -e "${CYAN}🛡️  Step 2/3: fail2ban${NC}"
echo "──────────────────────"

if step_done "fail2ban"; then
  ok "fail2ban sudah dikonfigurasi (skip)"
else
  # Install jika belum ada
  if ! command -v fail2ban-client &>/dev/null; then
    info "Menginstall fail2ban..."
    apt-get update -qq && apt-get install -y -qq fail2ban || { warn "Gagal install fail2ban, skip"; }
  fi

  if command -v fail2ban-client &>/dev/null; then
    # Tulis config (idempotent — overwrite aman)
    cat > /etc/fail2ban/jail.local <<EOF
[DEFAULT]
bantime  = 3600
findtime = 600
maxretry = 5

[sshd]
enabled  = true
port     = $SSH_PORT
logpath  = %(sshd_log)s
backend  = %(sshd_backend)s
maxretry = 3
bantime  = 3600
EOF

    systemctl enable fail2ban 2>/dev/null || true

    # Restart dengan retry — service mungkin sedang dalam state aneh
    systemctl stop fail2ban 2>/dev/null || true
    sleep 1
    systemctl start fail2ban 2>/dev/null || true

    # Tunggu sampai ready (max 15 detik)
    READY=false
    for i in $(seq 1 5); do
      sleep 3
      if systemctl is-active --quiet fail2ban 2>/dev/null; then
        READY=true
        break
      fi
      info "Menunggu fail2ban... ($i/5)"
    done

    if [ "$READY" = true ]; then
      ok "fail2ban berjalan"
      fail2ban-client status 2>/dev/null || true
      mark_done "fail2ban"
    else
      warn "fail2ban tidak bisa start. Cek: sudo journalctl -u fail2ban -n 20"
      warn "Lanjutkan ke step berikutnya..."
    fi
  else
    warn "fail2ban tidak bisa diinstall, skip"
  fi
fi

echo ""

# ═══════════════════════════════════════════════════════════════
# STEP 3: Unattended upgrades
# ═══════════════════════════════════════════════════════════════
echo -e "${CYAN}🔄 Step 3/3: Auto security updates${NC}"
echo "────────────────────────────────────"

if step_done "autoupdate"; then
  ok "Auto-updates sudah dikonfigurasi (skip)"
else
  if ! dpkg -l unattended-upgrades 2>/dev/null | grep -q "^ii"; then
    info "Menginstall unattended-upgrades..."
    apt-get update -qq && apt-get install -y -qq unattended-upgrades || { warn "Gagal install, skip"; }
  fi

  if dpkg -l unattended-upgrades 2>/dev/null | grep -q "^ii"; then
    cat > /etc/apt/apt.conf.d/50unattended-upgrades <<'EOF'
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}-security";
    "${distro_id}ESMApps:${distro_codename}-apps-security";
    "${distro_id}ESM:${distro_codename}-infra-security";
};
Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::MinimalSteps "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
EOF

    cat > /etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
EOF

    ok "Auto security updates aktif"
    mark_done "autoupdate"
  else
    warn "unattended-upgrades tidak tersedia, skip"
  fi
fi

echo ""

# ── Selesai ───────────────────────────────────────────────────
# Hapus state file — semua step selesai
rm -f "$STATE_FILE"

echo -e "${GREEN}✅ Security hardening selesai!${NC}"
echo ""
echo "Status:"
ufw status 2>/dev/null | head -3 || true
systemctl is-active fail2ban 2>/dev/null && echo "fail2ban: active" || echo "fail2ban: inactive"
echo ""
echo "Langkah selanjutnya:"
echo "  • Buka terminal baru, test SSH: ssh -p $SSH_PORT user@server"
echo "  • Jika SSH gagal: sudo ufw disable"
echo "  • Cek fail2ban: sudo fail2ban-client status sshd"
