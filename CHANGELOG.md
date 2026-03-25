# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

---

## [1.0.0] - 2026-03-26

### Added
- Initial public release
- Web UI for deploying Docker-based applications from Git repositories
- Traefik v3 reverse proxy integration
- Cloudflare Tunnel support — zero-trust, no exposed ports or public IP required
- GitHub & GitLab webhook support with HMAC signature verification
- Custom domain management via Cloudflare API
- SSH key management for private repositories
- Git token encryption (AES-256-CBC via `ENCRYPTION_KEY`)
- PostgreSQL + Redis support with automatic JSON file / in-memory fallback
- Resource limits per project — memory, CPU, restart policy
- Global default resource settings for new projects
- Demo mode — no domain or Cloudflare required, read-only UI
- `setup.sh` interactive setup script for production
- `setup-demo.sh` one-command demo setup
- `backup.sh` and `backup-auto.sh` for automated daily backups
- `cloudflare-route.sh` / `cloudflare-remove.sh` for auto DNS routing
- `security-hardening.sh` for host-level UFW + fail2ban setup
- Login rate limiting — 10 attempts per 15 minutes per IP
- `MAX_PROJECTS` env variable for configurable project limit
- `INTERNAL_WEBHOOK_TOKEN` env variable — replaces hardcoded internal token
- `ADMIN_PASSWORD` required at startup — app throws error if not set
- `ADMIN_EMAIL` configurable via env variable
- Healthcheck for deployer container
- Docker socket proxy — no direct socket mount
- Security headers via Traefik middleware
- `logrotate.conf` using `HOMELAB_DIR` env variable
