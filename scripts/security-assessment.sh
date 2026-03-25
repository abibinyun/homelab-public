#!/bin/bash

# Security Self-Assessment Script
# Test your homelab security posture

set -e

echo "🔐 Security Self-Assessment"
echo "==========================="
echo ""
echo "This script will test your homelab security."
echo "Safe to run - no destructive tests."
echo ""
read -p "Continue? (y/n): " confirm

if [ "$confirm" != "y" ]; then
    echo "❌ Cancelled"
    exit 0
fi

RESULTS_FILE="security-assessment-$(date +%Y%m%d_%H%M%S).txt"
echo "📝 Results will be saved to: $RESULTS_FILE"
echo ""

# Start assessment
{
echo "🔐 SECURITY SELF-ASSESSMENT REPORT"
echo "Generated: $(date)"
echo "========================================"
echo ""

# Test 1: Firewall Status
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 1: Firewall Status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if command -v ufw &> /dev/null; then
    UFW_STATUS=$(sudo ufw status | grep -i "Status: active" || echo "inactive")
    if [ ! -z "$UFW_STATUS" ]; then
        echo "✅ PASS: UFW firewall is active"
        sudo ufw status numbered
    else
        echo "❌ FAIL: UFW firewall is not active"
        echo "   Fix: sudo ufw enable"
    fi
else
    echo "⚠️  WARNING: UFW not installed"
    echo "   Fix: sudo apt install ufw"
fi
echo ""

# Test 2: fail2ban Status
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 2: fail2ban Status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if command -v fail2ban-client &> /dev/null; then
    if sudo systemctl is-active --quiet fail2ban; then
        echo "✅ PASS: fail2ban is running"
        sudo fail2ban-client status
    else
        echo "❌ FAIL: fail2ban is not running"
        echo "   Fix: sudo systemctl start fail2ban"
    fi
else
    echo "⚠️  WARNING: fail2ban not installed"
    echo "   Fix: sudo apt install fail2ban"
fi
echo ""

# Test 3: Open Ports
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 3: Open Ports (Listening Services)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Expected: SSH (22), HTTP (80), Portainer (9000 on localhost)"
echo ""
sudo netstat -tulpn | grep LISTEN | grep -v "127.0.0.1\|::1" || echo "No external listening ports"
echo ""
EXTERNAL_PORTS=$(sudo netstat -tulpn | grep LISTEN | grep -v "127.0.0.1\|::1" | wc -l)
if [ "$EXTERNAL_PORTS" -le 3 ]; then
    echo "✅ PASS: Minimal external ports exposed"
else
    echo "⚠️  WARNING: More than expected ports exposed"
    echo "   Review: sudo netstat -tulpn | grep LISTEN"
fi
echo ""

# Test 4: Docker Socket Protection
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 4: Docker Socket Protection"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if docker ps | grep -q "docker-socket-proxy"; then
    echo "✅ PASS: Docker socket proxy is running"
    
    # Test if containers can access socket directly
    if docker exec whoami ls /var/run/docker.sock 2>/dev/null; then
        echo "❌ FAIL: Containers can access Docker socket directly"
        echo "   Fix: Remove docker.sock mount from containers"
    else
        echo "✅ PASS: Containers cannot access Docker socket directly"
    fi
else
    echo "⚠️  WARNING: Docker socket proxy not running"
    echo "   Fix: docker compose up -d docker-socket-proxy"
fi
echo ""

# Test 5: Container Security
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 5: Container Security Settings"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
CONTAINERS=$(docker ps --format "{{.Names}}")
for container in $CONTAINERS; do
    echo "Checking: $container"
    
    # Check no-new-privileges
    NO_NEW_PRIV=$(docker inspect $container --format '{{.HostConfig.SecurityOpt}}' | grep -o "no-new-privileges:true" || echo "")
    if [ ! -z "$NO_NEW_PRIV" ]; then
        echo "  ✅ no-new-privileges: enabled"
    else
        echo "  ⚠️  no-new-privileges: disabled"
    fi
    
    # Check if running as root
    USER=$(docker exec $container whoami 2>/dev/null || echo "unknown")
    if [ "$USER" = "root" ]; then
        echo "  ⚠️  Running as: root (consider non-root user)"
    else
        echo "  ✅ Running as: $USER"
    fi
done
echo ""

# Test 6: Security Headers
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 6: Security Headers"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if command -v curl &> /dev/null; then
    echo "Testing: http://localhost:80 (whoami service)"
    HEADERS=$(curl -s -I http://localhost:80 -H "Host: whoami.${DOMAIN}")
    
    if echo "$HEADERS" | grep -q "X-Frame-Options"; then
        echo "✅ PASS: X-Frame-Options header present"
    else
        echo "❌ FAIL: X-Frame-Options header missing"
    fi
    
    if echo "$HEADERS" | grep -q "X-Content-Type-Options"; then
        echo "✅ PASS: X-Content-Type-Options header present"
    else
        echo "❌ FAIL: X-Content-Type-Options header missing"
    fi
    
    if echo "$HEADERS" | grep -q "Referrer-Policy"; then
        echo "✅ PASS: Referrer-Policy header present"
    else
        echo "❌ FAIL: Referrer-Policy header missing"
    fi
else
    echo "⚠️  WARNING: curl not installed, skipping header test"
fi
echo ""

# Test 7: Secrets in Environment
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 7: Secrets Management"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -f .env ]; then
    echo "✅ PASS: .env file exists"
    
    # Check if .env is in .gitignore
    if [ -f .gitignore ] && grep -q ".env" .gitignore; then
        echo "✅ PASS: .env is in .gitignore"
    else
        echo "❌ FAIL: .env not in .gitignore"
        echo "   Fix: echo '.env' >> .gitignore"
    fi
    
    # Check for default passwords
    if grep -q "changeme" .env; then
        echo "⚠️  WARNING: Default passwords detected in .env"
        echo "   Fix: Change all 'changeme' passwords"
    else
        echo "✅ PASS: No obvious default passwords"
    fi
else
    echo "⚠️  WARNING: .env file not found"
fi
echo ""

# Test 8: Auto-updates
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 8: Auto-updates Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -f /etc/apt/apt.conf.d/20auto-upgrades ]; then
    echo "✅ PASS: Auto-updates configured"
    cat /etc/apt/apt.conf.d/20auto-upgrades
else
    echo "⚠️  WARNING: Auto-updates not configured"
    echo "   Fix: sudo ./security-hardening.sh"
fi
echo ""

# Test 9: Network Segmentation
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 9: Network Segmentation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
NETWORKS=$(docker network ls --format "{{.Name}}" | grep -v "bridge\|host\|none")
echo "Docker networks:"
for network in $NETWORKS; do
    echo "  - $network"
    INTERNAL=$(docker network inspect $network --format '{{.Internal}}')
    if [ "$INTERNAL" = "true" ]; then
        echo "    ✅ Internal network (no internet access)"
    else
        echo "    ℹ️  External network"
    fi
done
echo ""

# Test 10: Backup Status
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 10: Backup Status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -d backups ]; then
    BACKUP_COUNT=$(ls -1 backups/*.tar.gz 2>/dev/null | wc -l)
    if [ "$BACKUP_COUNT" -gt 0 ]; then
        echo "✅ PASS: $BACKUP_COUNT backup(s) found"
        echo "Latest backup:"
        ls -lht backups/*.tar.gz | head -1
    else
        echo "⚠️  WARNING: No backups found"
        echo "   Fix: ./backup.sh"
    fi
else
    echo "⚠️  WARNING: Backup directory not found"
    echo "   Fix: mkdir backups && ./backup.sh"
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Security Posture: Review results above"
echo ""
echo "Quick Fixes:"
echo "1. Change default passwords: nano .env"
echo "2. Run security hardening: sudo ./security-hardening.sh"
echo "3. Create backup: ./backup.sh"
echo "4. Review firewall rules: sudo ufw status verbose"
echo "5. Check fail2ban: sudo fail2ban-client status"
echo ""
echo "Advanced Testing (external tools):"
echo "- Port scan: nmap -sV -sC your-server-ip"
echo "- SSL test: testssl.sh https://your-domain.com"
echo "- Web scan: docker run -t owasp/zap2docker-stable zap-baseline.py -t https://your-domain.com"
echo "- Image scan: trivy image traefik:v3"
echo ""
echo "Professional Pentest:"
echo "- HackerOne: https://hackerone.com"
echo "- Bugcrowd: https://bugcrowd.com"
echo ""
echo "Report saved to: $RESULTS_FILE"
echo ""

} | tee "$RESULTS_FILE"

echo "✅ Assessment complete!"
echo ""
echo "📊 Security Score Estimation:"
echo ""

# Calculate rough score
SCORE=0
[ ! -z "$(sudo ufw status | grep -i 'Status: active')" ] && SCORE=$((SCORE + 15))
[ ! -z "$(sudo systemctl is-active fail2ban 2>/dev/null)" ] && SCORE=$((SCORE + 15))
[ ! -z "$(docker ps | grep docker-socket-proxy)" ] && SCORE=$((SCORE + 15))
[ -f .gitignore ] && grep -q ".env" .gitignore && SCORE=$((SCORE + 10))
[ -f /etc/apt/apt.conf.d/20auto-upgrades ] && SCORE=$((SCORE + 10))
[ ! -z "$(curl -s -I http://localhost:80 -H 'Host: whoami.${DOMAIN}' | grep X-Frame-Options)" ] && SCORE=$((SCORE + 10))
[ -d backups ] && [ "$(ls -1 backups/*.tar.gz 2>/dev/null | wc -l)" -gt 0 ] && SCORE=$((SCORE + 10))
[ "$EXTERNAL_PORTS" -le 3 ] && SCORE=$((SCORE + 15))

echo "Your Score: $SCORE/100"
echo ""

if [ "$SCORE" -ge 80 ]; then
    echo "🎉 EXCELLENT! Your homelab is well-secured."
elif [ "$SCORE" -ge 60 ]; then
    echo "✅ GOOD! Some improvements recommended."
elif [ "$SCORE" -ge 40 ]; then
    echo "⚠️  FAIR. Several security issues need attention."
else
    echo "❌ POOR. Immediate security improvements required!"
fi

echo ""
echo "📝 Full report: $RESULTS_FILE"
