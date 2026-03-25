#!/bin/bash
# reset-password.sh — Reset password owner deployer
# Usage: ./scripts/reset-password.sh [new-password]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Load env
if [ -f "$ROOT_DIR/projects/deployer/.env" ]; then
  export $(grep -v '^#' "$ROOT_DIR/projects/deployer/.env" | xargs)
fi

NEW_PASSWORD="${1:-}"

if [ -z "$NEW_PASSWORD" ]; then
  read -s -p "New password (min 6 chars): " NEW_PASSWORD
  echo
fi

if [ ${#NEW_PASSWORD} -lt 6 ]; then
  echo "❌ Password must be at least 6 characters"
  exit 1
fi

# Hash password menggunakan node (bcrypt)
HASHED=$(docker exec deployer node -e "
const bcrypt = require('bcrypt');
bcrypt.hash('$NEW_PASSWORD', 10).then(h => process.stdout.write(h));
" 2>/dev/null)

if [ -z "$HASHED" ]; then
  echo "❌ Failed to hash password. Is the deployer container running?"
  echo "   Run: docker compose ps"
  exit 1
fi

USERNAME="${ADMIN_USER:-admin}"

# Update di database jika ada, atau di JSON file
if docker exec deployer sh -c 'test -n "$DATABASE_URL"' 2>/dev/null; then
  docker exec deployer node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query(\"UPDATE users SET password = \\\$1 WHERE username = \\\$2\", ['$HASHED', '$USERNAME'])
  .then(() => { console.log('✅ Password updated in database'); pool.end(); })
  .catch(e => { console.error('❌', e.message); pool.end(); process.exit(1); });
"
else
  # JSON file storage
  DATA_FILE="$ROOT_DIR/projects/deployer/data/users.json"
  if [ -f "$DATA_FILE" ]; then
    node -e "
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('$DATA_FILE', 'utf8'));
const user = data.find(u => u.username === '$USERNAME');
if (!user) { console.error('❌ User not found'); process.exit(1); }
user.password = '$HASHED';
fs.writeFileSync('$DATA_FILE', JSON.stringify(data, null, 2));
console.log('✅ Password updated in JSON storage');
"
  else
    echo "❌ No database and no JSON file found. Try restarting the container."
    exit 1
  fi
fi

echo "✅ Password for '$USERNAME' has been reset. Please restart the container:"
echo "   docker compose restart deployer"
