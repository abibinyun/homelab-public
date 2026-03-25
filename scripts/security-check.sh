#!/bin/bash
# Security hardening checklist

echo "🔒 Security Hardening Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

HOMELAB_DIR="/home/abibinyun/data/homelab"
ISSUES=0

# Check 1: .env file permissions
echo "1. Checking .env file permissions..."
if [ -f "$HOMELAB_DIR/.env" ]; then
    PERMS=$(stat -c "%a" "$HOMELAB_DIR/.env")
    if [ "$PERMS" != "600" ]; then
        echo "   ⚠️  .env permissions: $PERMS (should be 600)"
        chmod 600 "$HOMELAB_DIR/.env"
        echo "   ✅ Fixed: chmod 600 .env"
    else
        echo "   ✅ .env permissions OK"
    fi
else
    echo "   ⚠️  .env file not found"
    ((ISSUES++))
fi

# Check 2: Default passwords
echo "2. Checking for default passwords..."
if grep -q "changeme" "$HOMELAB_DIR/.env" 2>/dev/null; then
    echo "   ⚠️  Default password 'changeme' found in .env"
    echo "   ⚡ Action required: Change default passwords!"
    ((ISSUES++))
else
    echo "   ✅ No default passwords found"
fi

# Check 3: JWT Secret
echo "3. Checking JWT secret..."
if grep -q "JWT_SECRET=dev-secret" "$HOMELAB_DIR/projects/deployer/.env" 2>/dev/null; then
    echo "   ⚠️  Using development JWT secret in production"
    echo "   ⚡ Action required: Generate strong JWT secret"
    ((ISSUES++))
else
    echo "   ✅ JWT secret OK"
fi

# Check 4: Exposed ports
echo "4. Checking exposed ports..."
EXPOSED=$(docker ps --format "{{.Ports}}" | grep -E "0\.0\.0\.0:[0-9]+" | wc -l)
if [ "$EXPOSED" -gt 2 ]; then
    echo "   ⚠️  $EXPOSED ports exposed to 0.0.0.0"
    echo "   ⚡ Consider binding to 127.0.0.1 only"
    ((ISSUES++))
else
    echo "   ✅ Port exposure OK"
fi

# Check 5: UFW firewall
echo "5. Checking firewall status..."
if command -v ufw &> /dev/null; then
    if sudo ufw status | grep -q "Status: active"; then
        echo "   ✅ UFW firewall is active"
    else
        echo "   ⚠️  UFW firewall is inactive"
        ((ISSUES++))
    fi
else
    echo "   ⚠️  UFW not installed"
    ((ISSUES++))
fi

# Check 6: fail2ban
echo "6. Checking fail2ban..."
if systemctl is-active --quiet fail2ban 2>/dev/null; then
    echo "   ✅ fail2ban is running"
else
    echo "   ⚠️  fail2ban not running"
    ((ISSUES++))
fi

# Check 7: Docker socket permissions
echo "7. Checking Docker socket security..."
if docker ps --format "{{.Names}}" | grep -q "docker-socket-proxy"; then
    echo "   ✅ Docker socket proxy is running"
else
    echo "   ⚠️  Docker socket proxy not found"
    ((ISSUES++))
fi

# Check 8: Container security options
echo "8. Checking container security..."
NO_NEW_PRIV=$(docker inspect $(docker ps -q) 2>/dev/null | grep -c "no-new-privileges")
TOTAL_CONTAINERS=$(docker ps -q | wc -l)
if [ "$NO_NEW_PRIV" -eq "$TOTAL_CONTAINERS" ]; then
    echo "   ✅ All containers have no-new-privileges"
else
    echo "   ⚠️  Some containers missing no-new-privileges"
    ((ISSUES++))
fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ "$ISSUES" -eq 0 ]; then
    echo "✅ Security check passed! No issues found."
else
    echo "⚠️  Found $ISSUES security issue(s) that need attention."
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
