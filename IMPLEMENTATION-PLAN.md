# Implementation Plan: Abi Solution (Multi-Tenant Platform)
# Base: homelab-public/projects/deployer/
# Status: FASE 1-4 DONE, FASE 5-6 PENDING
# Created: 2026-04-08

---

## FASE 1 — Foundation (Backend)

### 1.1 DB Migrations
- [x] Tambah tabel `clients` ke `api/db/migrations.ts`
- [x] Tambah tabel `client_permissions` ke `api/db/migrations.ts`
- [x] Tambah tabel `client_domains` ke `api/db/migrations.ts`
- [x] Tambah kolom `client_id`, `domain_id` ke tabel `projects`
- [x] Tambah tabel `deploy_logs` ke `api/db/migrations.ts`
- [x] Tambah tabel `audit_logs` ke `api/db/migrations.ts`
- [x] Tambah kolom `role` + `client_id` ke tabel `users`
- [x] Tambah kolom `git_branch` ke tabel `projects`

### 1.2 Types
- [x] Extend `api/types/index.ts` — tambah interface: `Client`, `ClientPermission`, `ClientDomain`, `DeployLog`, `AuditLog`
- [x] Update interface `User` — tambah field `role: UserRole`, `clientId`
- [x] Update interface `Project` — tambah field `clientId`, `domainId`, `gitBranch`

---

## FASE 2 — RBAC & Middleware

### 2.1 RBAC Middleware
- [x] Buat `api/middleware/rbac.ts` — `requireRole(...roles)` middleware
- [x] Buat `api/middleware/rbac.ts` — `requirePermission(permission)` middleware
- [x] Update `api/middleware/auth.ts` — attach `role` dan `clientId` ke `req.user`

### 2.2 Audit Middleware
- [x] Buat `api/middleware/audit.ts` — auto-insert ke `audit_logs` setelah setiap mutasi

---

## FASE 3 — Backend CRUD

### 3.1 Repositories
- [x] Buat `api/repositories/client.repository.ts`
- [x] Buat `api/repositories/clientPermission.repository.ts`
- [x] Buat `api/repositories/clientDomain.repository.ts`
- [x] Buat `api/repositories/auditLog.repository.ts`
- [x] Buat `api/repositories/deployLog.repository.ts`

### 3.2 Services
- [x] Buat `api/services/client.service.ts`
- [x] Buat `api/services/permission.service.ts`
- [x] Buat `api/services/domain.service.ts`

### 3.3 Controllers
- [x] Buat `api/controllers/client.controller.ts`
- [x] Buat `api/controllers/permission.controller.ts`
- [x] Buat `api/controllers/domain.controller.ts`
- [x] Buat `api/controllers/deployLog.controller.ts`
- [x] Buat `api/controllers/audit.controller.ts`

### 3.4 Routes
- [x] Buat `api/routes/clients.ts`
- [x] Buat `api/routes/audit.ts`
- [x] Update `api/server.ts` — register routes baru

---

## FASE 4 — Frontend

### 4.1 Types & Hooks
- [x] Tambah types di `src/types/index.ts` — Client, Permission, ClientDomain, DeployLog
- [x] Buat `src/hooks/useRole.ts`
- [x] Buat `src/hooks/usePermissions.ts`

### 4.2 Components
- [x] Buat `src/components/PermissionGate.tsx`
- [x] Buat `src/components/ClientCard.tsx`

### 4.3 Admin Pages
- [x] Buat `src/pages/admin/Dashboard.tsx`
- [x] Buat `src/pages/admin/Clients.tsx`
- [x] Buat `src/pages/admin/ClientDetail.tsx`
- [x] Buat `src/pages/admin/Projects.tsx`
- [x] Buat `src/pages/admin/AuditLog.tsx`

### 4.4 Client Portal Pages
- [x] Buat `src/pages/client/Dashboard.tsx`
- [x] Buat `src/pages/client/ProjectDetail.tsx`
- [x] Buat `src/pages/client/Logs.tsx`

### 4.5 Routing
- [x] Update `src/main.tsx` — tambah routes admin/* dan client/*
- [x] Guard routes berdasarkan role (superadmin/admin → admin/*, client → client/*)

---

## FASE 5 — Cloudflare Multi-Domain

- [x] Update `api/services/cloudflare.service.ts` — constructor terima `overrides` untuk config per-client
- [x] Update `api/services/domain.service.ts` — `setupDnsForProject()` support Managed + Unmanaged mode
- [x] Update `api/services/domain.service.ts` — `removeDnsForProject()` cleanup DNS saat delete
- [x] Update `api/services/deploy.ts` — pass `domainId` ke `setupCloudflareRoute`, fallback ke legacy mode
- [x] Update `api/controllers/project.controller.ts` — delete project pakai `domainService.removeDnsForProject` jika ada `domainId`
- [x] Update `api/repositories/postgres.repository.ts` — include `client_id`, `domain_id`, `git_branch` di semua queries

---

## FASE 6 — Testing & Hardening

- [x] TypeScript compile check backend — 0 errors
- [x] TypeScript compile check frontend — 0 errors
- [x] Fix `express.d.ts` — extend `req.user` dengan `role` dan `clientId`
- [x] Fix `User` interface — restore `verification_token`, tambah `role` required
- [x] Fix `auth.service.ts` — default admin dibuat dengan `role: 'superadmin'`
- [x] Fix `postgres.repository.ts` — `getUserByUsername` include kolom `role` dan `client_id`
- [x] Rapikan `.env` — hapus blok duplikat dari homelab-infra
- [x] Integration test 23/23 passed — `test-multitenant.sh`
  - Auth (login, token)
  - Client A managed (inovasimitrasudjarwo.com) — create, get, domain, list
  - Client B unmanaged (cube.my.id) — create, domain + CF token encrypted, list, mode tersimpan
  - Permissions CRUD — get, update, canTriggerDeploy per client
  - Summary (totalDomains)
  - List semua clients
  - Audit log (action tercatat)
  - Update & Delete client (RBAC superadmin)

---

## Urutan Prioritas

```
FASE 1 ✅ → FASE 2 ✅ → FASE 3 ✅ → FASE 4 ✅ → FASE 5 ⏳ → FASE 6 ⏳
```

---

## Catatan

- Jangan ubah: docker-compose.yml, scripts/, config/, Cloudflare routing
- Semua kolom sensitif (git_token, CF api_token) sudah encrypted via `utils/crypto.ts`
- Phase 1 fokus: Shared Server + Managed Cloudflare (Client Server mode di luar scope)
- `client_permissions` pakai UNIQUE constraint pada `client_id` untuk ON CONFLICT upsert
