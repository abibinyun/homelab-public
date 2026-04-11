# BLUEPRINT — Homelab Deployer v2

> Sumber kebenaran arsitektur. Update file ini setiap ada perubahan desain.

---

## Vision

Platform self-hosted untuk deploy dan manage aplikasi client, dengan:
- Multi-domain & multi-subdomain dari 1 server
- Support berbagai jenis project (single container, monorepo, compose)
- Multi-tenant: admin full access, client akses scope miliknya
- Idempotent deploy dengan rollback otomatis
- Semua secrets terenkripsi

---

## Architecture Overview

```
Internet
  └── Cloudflare (DNS + Tunnel)
        └── Traefik (reverse proxy, routing by Host header)
              ├── deployer.domain.com  → Deployer UI + API
              ├── app.client-a.com     → Stack client-a / service web
              ├── api.client-a.com     → Stack client-a / service api
              └── shop.client-b.id    → Stack client-b / service web
```

---

## Core Concepts

### Deploy Type
| Type | Deskripsi |
|------|-----------|
| `IMAGE` | Pull image dari registry (ghcr.io, Docker Hub, private) |
| `DOCKERFILE` | Build dari repo, 1 Dockerfile di root |
| `COMPOSE` | docker compose dengan template + env override |

### Database Mode (per project)
| Mode | Deskripsi |
|------|-----------|
| `NONE` | Tidak butuh DB |
| `SHARED` | Auto-create database di postgres instance homelab |
| `DEDICATED` | Spawn postgres container dalam stack project |

### Redis Mode (per project)
| Mode | Deskripsi |
|------|-----------|
| `NONE` | Tidak butuh Redis |
| `SHARED` | Pakai Redis instance homelab, prefix key otomatis |
| `DEDICATED` | Spawn Redis container dalam stack project |

---

## Data Model

### Domain
```
domains
  id, name (digitor.id)
  cf_zone_id, cf_tunnel_id, cf_api_token (encrypted)
  is_active
  created_at, updated_at
```
> Menggantikan `client_domains`. Domain adalah entitas global, bisa di-assign ke client nanti.

### Template
```
templates
  id, name (nextjs-nestjs, laravel, wordpress, static)
  description
  compose_content  (base compose yaml — TEXT)
  variables        (JSONB: [{key, description, required, default}])
  is_active
  created_at, updated_at
```

### Project (extended)
```
projects
  id, name, slug (unique)
  client_id (nullable)
  deploy_type: IMAGE | DOCKERFILE | COMPOSE
  template_id (nullable, FK → templates)
  git_url, git_token (encrypted, nullable)
  git_branch (default: main)
  registry_image (nullable, untuk IMAGE type)
  domain_id (FK → domains), subdomain
  db_mode: NONE | SHARED | DEDICATED
  redis_mode: NONE | SHARED | DEDICATED
  env (encrypted JSONB)
  resources: {memory, cpu, restart_policy}
  status: IDLE | BUILDING | RUNNING | FAILED | STOPPED
  last_deployed_at
  created_at, updated_at
```

### Service (child of Project, untuk COMPOSE)
```
project_services
  id, project_id (FK → projects)
  name (web, api, worker)
  is_public (boolean)
  subdomain (nullable — kalau is_public, dapat subdomain sendiri)
  port
  created_at
```

### Deploy Log (extended)
```
deploy_logs
  id, project_id (FK → projects)
  triggered_by (user_id, nullable)
  trigger_type: MANUAL | WEBHOOK | ROLLBACK
  status: RUNNING | SUCCESS | FAILED
  log_output (TEXT, streaming)
  image_tag_before (untuk rollback)
  started_at, finished_at
```

---

## Deploy Flow

```
1. VALIDATE
   - Domain tersedia?
   - Template valid? Semua required vars ada?
   - Env vars lengkap?
   - Tidak ada deploy lain yang sedang BUILDING?

2. LOCK
   - Set project.status = BUILDING
   - Buat deploy_log entry (status: RUNNING)

3. PREPARE
   - Clone/pull repo (kalau DOCKERFILE atau COMPOSE)
   - Pull image (kalau IMAGE)
   - Tag image lama sebagai :previous (untuk rollback)

4. BUILD
   - DOCKERFILE: docker build
   - COMPOSE: merge template + override → generate final compose file
   - IMAGE: skip

5. PROVISION DB/REDIS
   - SHARED: CREATE DATABASE IF NOT EXISTS {slug}
   - DEDICATED: sudah ada di compose file
   - Inject DATABASE_URL / REDIS_URL ke env

6. DEPLOY
   - DOCKERFILE/IMAGE: docker run dengan Traefik labels
   - COMPOSE: docker compose up -d --build

7. HEALTH CHECK
   - Tunggu container healthy (max 60s)
   - Kalau gagal → trigger ROLLBACK

8. FINALIZE
   - Set project.status = RUNNING
   - Set deploy_log.status = SUCCESS
   - Update last_deployed_at

ROLLBACK (kalau step 7 gagal):
   - Stop container baru
   - Restore image :previous
   - Set project.status = FAILED
   - Set deploy_log.status = FAILED + catat error
```

---

## Security

- Git token, CF API token, env vars → encrypted AES-256-GCM sebelum disimpan ke DB
- Setiap stack punya Docker network sendiri (isolated)
- Template hanya bisa dibuat/edit oleh admin
- Client hanya bisa akses project miliknya (scope by client_id)
- Docker socket diakses via proxy (sudah ada), bukan langsung

---

## Templates (built-in)

| Template | Services | Notes |
|----------|----------|-------|
| `nextjs-nestjs` | web (Next.js), api (NestJS) | Monorepo Turborepo |
| `nextjs-only` | web (Next.js) | Single service |
| `laravel` | app (PHP-FPM + Nginx) | |
| `static` | web (Nginx) | HTML/CSS/JS statis |
| `node-express` | app (Node.js) | Generic Node |
| `custom` | bebas | Admin only, upload compose sendiri |

---

## Multi-tenant Scope

```
Admin
  └── Full access semua domain, project, client, template

Client
  └── Hanya lihat project miliknya (client_id match)
  └── Permission granular (lihat log, restart, trigger deploy, dll)
  └── Domain yang di-assign ke mereka
```

---

## Folder Structure (target)

```
projects/deployer/
├── api/
│   ├── services/
│   │   ├── deploy.ts          ← refactor: branching per deploy_type
│   │   ├── compose.ts         ← NEW: template merge + compose management
│   │   ├── database.ts        ← NEW: shared/dedicated DB provisioning
│   │   ├── domain.service.ts  ← refactor: pakai domains table
│   │   └── ...
│   ├── db/
│   │   └── migrations.ts      ← tambah tabel baru
│   └── ...
├── templates/                 ← NEW: base compose templates
│   ├── nextjs-nestjs.yml
│   ├── nextjs-only.yml
│   ├── laravel.yml
│   ├── static.yml
│   └── node-express.yml
└── docs/
    ├── BLUEPRINT.md           ← file ini
    └── TASKLIST.md            ← progress tracking
```
