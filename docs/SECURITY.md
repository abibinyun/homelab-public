# Security Hardening Guide

Security enhancements yang sudah diterapkan untuk homelab.

## ✅ Implemented Security Features

### 1. Docker Socket Proxy
**Status:** ✅ Active

**What it does:**
- Isolasi akses ke Docker socket
- Hanya expose API yang diperlukan
- Prevent container escape attacks

**Implementation:**
```yaml
docker-socket-proxy:
  image: tecnativa/docker-socket-proxy
  privileged: true
  environment:
    - CONTAINERS=1
    - NETWORKS=1
    - SERVICES=1
    - TASKS=1
    - IMAGES=1
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock:ro
  networks:
    - socket-proxy (internal network)
```

Traefik connect via TCP instead of direct socket mount.

### 2. Security Headers
**Status:** ✅ Active

**Headers applied:**
- `X-Frame-Options: DENY` - Prevent clickjacking
- `X-Content-Type-Options: nosniff` - Prevent MIME sniffing
- `X-XSS-Protection: 1; mode=block` - XSS protection
- `Referrer-Policy: strict-origin-when-cross-origin` - Privacy
- `Permissions-Policy` - Disable unnecessary features

**Test:**
```bash
curl -I http://localhost:80 -H "Host: whoami.yourdomain.com"
```

### 3. Network Segmentation
**Status:** ✅ Active

**Networks:**
- `web` - Public services (Traefik, apps)
- `socket-proxy` - Internal only (Docker socket proxy)

Internal networks cannot access internet.

### 4. Container Security
**Status:** ✅ Active

**Applied to all containers:**
- `no-new-privileges:true` - Prevent privilege escalation
- `read_only: true` - Read-only filesystem (where applicable)
- Non-root user (where applicable)

---

## 🔧 Additional Security (Run Script)

Run the security hardening script for system-level security:

```bash
sudo ./scripts/security-hardening.sh
```

**This will:**
1. ✅ Enable UFW firewall
2. ✅ Install & configure fail2ban
3. ✅ Enable auto-updates

---

## 📋 Security Checklist

### High Priority (Done)
- [x] Docker socket proxy
- [x] Security headers
- [x] Network segmentation
- [x] Container hardening
- [ ] UFW firewall (run script)
- [ ] fail2ban (run script)
- [ ] Auto-updates (run script)

### Medium Priority (Optional)
- [x] Change default passwords in `.env` — **ADMIN_PASSWORD wajib diisi, app throw error jika kosong**
- [ ] Setup Cloudflare Access for sensitive subdomains
- [ ] Enable Cloudflare WAF rules
- [ ] Regular security audits

### Low Priority (Future)
- [ ] Image vulnerability scanning
- [ ] Secrets management with Vault
- [ ] Intrusion detection (OSSEC/Wazuh)
- [ ] Log monitoring & alerting

---

## 🔐 Best Practices

### 1. Passwords
```bash
# Generate strong password
openssl rand -base64 32

# Update .env
nano .env
```

### 2. Regular Updates
```bash
# Update containers
docker compose pull
docker compose up -d

# Update system (if auto-updates not enabled)
sudo apt update && sudo apt upgrade -y
```

### 3. Monitor Logs
```bash
# Access logs
tail -f logs/access.log

# Container logs
docker compose logs -f

# System logs
sudo journalctl -f
```

### 4. Backup
```bash
# Regular backups
./scripts/backup.sh

# Test restore
./scripts/maintenance.sh
# Choose option 6
```

### 5. Security Audit
```bash
# Check open ports
sudo netstat -tulpn

# Check firewall status
sudo ufw status

# Check fail2ban status
sudo fail2ban-client status

# Check running containers
docker compose ps
```

---

## 🛡️ Security Headers Explained

### X-Frame-Options: DENY
Prevents your site from being embedded in iframe (clickjacking protection).

### X-Content-Type-Options: nosniff
Prevents browser from MIME-sniffing (security risk).

### X-XSS-Protection: 1; mode=block
Enables browser XSS filter and blocks page if attack detected.

### Referrer-Policy: strict-origin-when-cross-origin
Controls how much referrer information is sent with requests.

### Permissions-Policy
Disables unnecessary browser features (geolocation, camera, microphone).

---

## 🔍 Testing Security

### 1. Test Security Headers
```bash
curl -I https://whoami.yourdomain.com
```

### 2. Test Firewall
```bash
sudo ufw status verbose
```

### 3. Test fail2ban
```bash
sudo fail2ban-client status sshd
```

### 4. Test Docker Socket Isolation
```bash
# This should work (via proxy)
docker compose ps

# This should fail (direct socket access from container)
docker exec whoami ls /var/run/docker.sock
# Error: No such file or directory (good!)
```

### 5. Security Scan
```bash
# Scan with Trivy (install first)
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image traefik:v3
```

---

## 🚨 Incident Response

### If compromised:
1. **Isolate:** Stop affected containers
   ```bash
   docker compose stop <service>
   ```

2. **Investigate:** Check logs
   ```bash
   docker compose logs <service>
   tail -f logs/access.log
   ```

3. **Backup:** Save evidence
   ```bash
   ./scripts/backup.sh
   ```

4. **Restore:** From clean backup
   ```bash
   ./scripts/maintenance.sh
   # Option 6: Restore
   ```

5. **Update:** Change all passwords
   ```bash
   nano .env
   # Update all passwords
   ```

---

## 📚 Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Docker Security Best Practices](https://docs.docker.com/engine/security/)
- [Traefik Security](https://doc.traefik.io/traefik/https/overview/)
- [Cloudflare Security](https://www.cloudflare.com/learning/security/)

---

## ✅ Security Status

Current security level: **High** 🔐

- ✅ Network isolation
- ✅ Container hardening
- ✅ Security headers
- ✅ Docker socket protection
- ✅ Rate limiting
- ✅ DDoS protection (Cloudflare)
- ✅ Zero port forwarding
- ⏳ System hardening (run script)

**Next:** Run `sudo ./scripts/security-hardening.sh` for complete system-level security.
