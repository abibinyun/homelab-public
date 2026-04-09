#!/usr/bin/env bash
# Test script: Abi Solution multi-tenant platform
# Tests: auth, client CRUD, permissions, domains (managed + unmanaged), audit log
# Usage: bash test-multitenant.sh [BASE_URL]

BASE_URL="${1:-http://localhost:3000}"
PASS=0
FAIL=0

# ── Helpers ────────────────────────────────────────────────────────────────────
green() { echo -e "\033[32m✓ $1\033[0m"; }
red()   { echo -e "\033[31m✗ $1\033[0m"; }

assert() {
  local label="$1" expected="$2" actual="$3"
  if echo "$actual" | grep -q "$expected"; then
    green "$label"
    ((PASS++))
  else
    red "$label (expected: '$expected', got: '$actual')"
    ((FAIL++))
  fi
}

api() {
  local method="$1" path="$2" body="$3"
  if [ -n "$body" ]; then
    curl -s -X "$method" "$BASE_URL$path" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -d "$body"
  else
    curl -s -X "$method" "$BASE_URL$path" \
      -H "Authorization: Bearer $TOKEN"
  fi
}

echo ""
echo "========================================"
echo " Abi Solution — Multi-Tenant Test Suite"
echo " Target: $BASE_URL"
echo "========================================"
echo ""

# ── 0. Cleanup data lama ───────────────────────────────────────────────────────
echo "── 0. Cleanup ──"
RESP=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123456"}')
TOKEN=$(echo "$RESP" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# Hapus semua client lama (cascade ke domains & permissions)
EXISTING=$(api GET /api/clients)
for id in $(echo "$EXISTING" | grep -o '"id":[0-9]*' | cut -d: -f2); do
  api DELETE /api/clients/$id > /dev/null 2>&1
done
sleep 1
echo "  Data lama dibersihkan"

# ── 1. Auth ────────────────────────────────────────────────────────────────────
echo "── 1. Auth ──"
RESP=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123456"}')
TOKEN=$(echo "$RESP" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
assert "Login berhasil" '"token"' "$RESP"
assert "Token tidak kosong" '.' "$TOKEN"

# ── 2. Client: inovasimitrasudjarwo.com (managed) ─────────────────────────────
echo ""
echo "── 2. Client A — managed (inovasimitrasudjarwo.com) ──"
RESP=$(api POST /api/clients '{"name":"Inovasi Mitra Sudjarwo","slug":"inovasimitrasudjarwo","contactEmail":"admin@inovasimitrasudjarwo.com"}')
assert "Buat client A" '"id"' "$RESP"
CLIENT_A_ID=$(echo "$RESP" | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)

RESP=$(api GET /api/clients/$CLIENT_A_ID)
assert "Get client A" '"inovasimitrasudjarwo"' "$RESP"

# Tambah domain managed
RESP=$(api POST /api/clients/$CLIENT_A_ID/domains \
  '{"domain":"inovasimitrasudjarwo.com","cfMode":"managed","isPrimary":true}')
assert "Tambah domain managed" '"id"' "$RESP"
DOMAIN_A_ID=$(echo "$RESP" | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)

RESP=$(api GET /api/clients/$CLIENT_A_ID/domains)
assert "List domain client A" '"inovasimitrasudjarwo.com"' "$RESP"

# ── 3. Client: cube.my.id (unmanaged) ─────────────────────────────────────────
echo ""
echo "── 3. Client B — unmanaged (cube.my.id) ──"
RESP=$(api POST /api/clients '{"name":"Cube","slug":"cube","contactEmail":"admin@cube.my.id"}')
assert "Buat client B" '"id"' "$RESP"
CLIENT_B_ID=$(echo "$RESP" | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)

# Tambah domain unmanaged dengan CF credentials client sendiri
RESP=$(api POST /api/clients/$CLIENT_B_ID/domains \
  "{\"domain\":\"cube.my.id\",\"cfMode\":\"unmanaged\",\"isPrimary\":true,\"cloudflareZoneId\":\"a8c4c7a864944f3f888d89c2b64f7c65\",\"cloudflareApiToken\":\"cfut_Bp5ptBY6RxCzfTXzgCqZHQe3Hmqj9tL086dT31xBabb854c6\",\"tunnelId\":\"d38b029e-b147-4d94-86f9-19f07b70d468\"}")
assert "Tambah domain unmanaged" '"id"' "$RESP"
DOMAIN_B_ID=$(echo "$RESP" | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)

RESP=$(api GET /api/clients/$CLIENT_B_ID/domains)
assert "List domain client B" '"cube.my.id"' "$RESP"
assert "Mode unmanaged tersimpan" '"unmanaged"' "$RESP"

# ── 4. Permissions ─────────────────────────────────────────────────────────────
echo ""
echo "── 4. Permissions ──"
RESP=$(api GET /api/clients/$CLIENT_A_ID/permissions)
assert "Get permissions client A" '"canViewProjects"' "$RESP"

RESP=$(api PUT /api/clients/$CLIENT_A_ID/permissions \
  '{"canViewProjects":true,"canViewLogs":true,"canRestart":false,"canStartStop":false,"canUpdateEnv":false,"canTriggerDeploy":true,"canManageDomains":false,"canViewMetrics":true}')
assert "Update permissions client A" '"canTriggerDeploy"' "$RESP"
assert "canTriggerDeploy=true tersimpan" '"canTriggerDeploy":true' "$RESP"

RESP=$(api PUT /api/clients/$CLIENT_B_ID/permissions \
  '{"canViewProjects":true,"canViewLogs":false,"canRestart":false,"canStartStop":false,"canUpdateEnv":false,"canTriggerDeploy":false,"canManageDomains":false,"canViewMetrics":false}')
assert "Update permissions client B (restricted)" '"canTriggerDeploy":false' "$RESP"

# ── 5. Client summary ──────────────────────────────────────────────────────────
echo ""
echo "── 5. Summary ──"
RESP=$(api GET /api/clients/$CLIENT_A_ID/summary)
assert "Summary client A" '"totalDomains"' "$RESP"
assert "totalDomains=1" '"totalDomains":1' "$RESP"

# ── 6. List semua clients ──────────────────────────────────────────────────────
echo ""
echo "── 6. List clients ──"
RESP=$(api GET /api/clients)
assert "List semua clients" '"inovasimitrasudjarwo"' "$RESP"
assert "Client B ada di list" '"cube"' "$RESP"

# ── 7. Audit log ───────────────────────────────────────────────────────────────
echo ""
echo "── 7. Audit Log ──"
RESP=$(api GET /api/audit-logs)
assert "Audit log tidak kosong" '"action"' "$RESP"
assert "Ada aksi client.create" '"client.create"' "$RESP"

# ── 8. Update & Delete ─────────────────────────────────────────────────────────
echo ""
echo "── 8. Update & Delete ──"
RESP=$(api PUT /api/clients/$CLIENT_A_ID '{"notes":"Updated via test"}')
assert "Update client A" '"Updated via test"' "$RESP"

RESP=$(api DELETE /api/clients/$CLIENT_B_ID)
assert "Delete client B" '"Deleted"' "$RESP"

RESP=$(api GET /api/clients)
assert "Client B sudah terhapus" '.' "$(echo "$RESP" | grep -v '"cube"' | head -1)"

# ── Hasil ──────────────────────────────────────────────────────────────────────
echo ""
echo "========================================"
echo " HASIL: $PASS passed, $FAIL failed"
echo "========================================"
echo ""
[ $FAIL -eq 0 ] && exit 0 || exit 1
