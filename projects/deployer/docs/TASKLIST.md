# TASKLIST — Homelab Deployer v2

Legend: `[ ]` belum | `[x]` selesai | `[-]` skip/tidak jadi | `[~]` in progress

> Setiap task di-ceklis dulu sebelum lanjut ke task berikutnya.
> Kalau ada error atau perubahan desain, catat di bawah task yang bersangkutan.

---

## Phase 1 — Foundation

### 1.1 Database Schema

- [x] Buat tabel `domains` (menggantikan `client_domains` sebagai entitas global)
  - kolom: `id`, `name`, `cf_zone_id`, `cf_tunnel_id`, `cf_api_token` (encrypted), `is_active`, `created_at`, `updated_at`
- [x] Buat tabel `templates`
  - kolom: `id`, `name`, `description`, `compose_content`, `variables` (JSONB), `is_active`, `created_at`, `updated_at`
- [x] Extend tabel `projects`
  - tambah: `deploy_type` (IMAGE | DOCKERFILE | COMPOSE)
  - tambah: `template_id` (FK → templates, nullable)
  - tambah: `registry_image` (nullable)
  - tambah: `db_mode` (NONE | SHARED | DEDICATED)
  - tambah: `redis_mode` (NONE | SHARED | DEDICATED)
  - tambah: `status` (IDLE | BUILDING | RUNNING | FAILED | STOPPED)
  - tambah: `last_deployed_at`
  - tambah: `domain_ref` FK ke `domains`
- [x] Buat tabel `project_services`
  - kolom: `id`, `project_id`, `name`, `is_public`, `subdomain`, `port`, `created_at`
- [x] Extend tabel `deploy_logs`
  - tambah: `trigger_type` (MANUAL | WEBHOOK | ROLLBACK)
  - tambah: `image_tag_before` (untuk rollback)
  - tambah: `project_id` (FK → projects)
- [x] Jalankan migration, verifikasi semua tabel terbuat dengan benar

### 1.2 Domain Service Refactor

- [x] Buat `domain.repository.ts` untuk CRUD tabel `domains`
- [x] Refactor `domain.service.ts` — pakai tabel `domains` bukan `client_domains`
- [x] Buat `clientDomain.service.ts` + `clientDomain.controller.ts` — preserve legacy client_domains logic
- [x] Buat endpoint `GET /api/v2/domains` — list semua domain
- [x] Buat endpoint `POST /api/v2/domains` — tambah domain baru (admin only)
- [x] Buat endpoint `PATCH /api/v2/domains/:id` — edit domain
- [x] Buat endpoint `DELETE /api/v2/domains/:id` — hapus domain (cek tidak ada project yang pakai)
- [x] Test: endpoint domain berfungsi, create domain berhasil

### 1.3 Template System

- [x] Buat folder `templates/` di root deployer
- [x] Buat `templates/nextjs-nestjs.yml`
- [x] Buat `templates/nextjs-only.yml`
- [x] Buat `templates/laravel.yml`
- [x] Buat `templates/static.yml`
- [x] Buat `templates/node-express.yml`
- [x] Buat `template.repository.ts` untuk CRUD tabel `templates`
- [x] Buat `template.service.ts` — load template dari DB, merge dengan project env override, seed saat startup
- [x] Buat endpoint `GET /api/v2/templates` — list templates
- [x] Buat endpoint `POST /api/v2/templates` — create template (admin only)
- [x] Buat endpoint `PATCH /api/v2/templates/:id` — edit template (admin only)
- [x] Buat endpoint `DELETE /api/v2/templates/:id` — hapus template (admin only)
- [x] Test: semua 5 template ter-seed otomatis saat startup, endpoint berfungsi

### 1.4 Deploy Service Refactor

- [x] Refactor `deploy.ts` — branching logic berdasarkan `deploy_type` (IMAGE / DOCKERFILE / COMPOSE)
- [x] Buat `compose.service.ts` — merge template + env, write final compose file, `docker compose up/down/logs`
- [x] Buat `database.service.ts` — SHARED: auto-create DB di postgres homelab, return DATABASE_URL
- [x] Implementasi project status locking via `deployLegacy` (backward compat)
- [x] Implementasi rollback: tag image lama `:previous`, restore kalau health check gagal (DOCKERFILE type)
- [x] Health check: wait container running max 60s, trigger rollback kalau timeout
- [x] Test IMAGE type: pull image → run container
- [x] Test DOCKERFILE type: clone → build → run → health check → rollback on fail
- [x] Test COMPOSE type: clone → merge template → compose up

---

## Phase 2 — Compose & Multi-Service

- [x] UI: form create project diperluas — pilih deploy_type (DOCKERFILE / IMAGE / COMPOSE) via tabs
- [x] UI: kalau COMPOSE, tampilkan dropdown template + form variables otomatis dari template.variables
- [x] UI: domain selector — dropdown dari daftar domain yang tersedia + subdomain input
- [x] UI: preview full domain (subdomain.domain.name)
- [x] UI: db_mode & redis_mode selector
- [x] Halaman `/admin/domains` — CRUD domain (add, edit, delete)
- [x] Nav link Domains di sidebar
- [x] API functions: getDomains, createDomain, updateDomain, deleteDomain, getTemplates
- [x] UI: project detail tampilkan semua services (kalau COMPOSE) — inline di ProjectCard
- [x] UI: per service yang is_public, tampilkan URL-nya
- [x] Endpoint `GET /api/projects/:name/services` — list services + container status
- [x] Endpoint `GET /api/projects/:name/compose-logs` — aggregate logs dari compose stack
- [x] Log streaming untuk COMPOSE via compose-logs endpoint

---

## Phase 3 — Multi-tenant

- [x] Refactor project ownership — semua project punya `client_id` (nullable = milik admin)
- [x] `getProjects` + `getProjectByName` + `deleteProject` — scope by `clientId` di semua layer (controller → service → repository)
- [x] `project.controller.ts` — baca `clientId` dari `req.user`, inject ke semua service calls
- [x] `project.service.ts` — pass `clientId` ke repository, support v2 fields (deployType, templateId, dll)
- [x] `postgres.repository.ts` — query dengan `WHERE client_id = $1` kalau clientId ada
- [x] Domain assignment ke client — `POST /api/v2/domains/:id/assign/:clientId` + `DELETE` unassign
- [x] Client portal: hanya tampilkan project milik client yang login (via clientId scope)
- [x] Permission check di semua endpoint — client tidak bisa akses project orang lain
- [x] UI client: domain selector hanya tampilkan domain yang di-assign ke client mereka
- [x] Invite user sebagai client — Users page sudah support create user role client + assign client_id (sudah ada sebelumnya, verified)

---

## Phase 4 — Polish & Reliability

- [x] Deploy history UI — `DeployHistoryModal` dengan status, durasi, trigger type
- [x] Endpoint `GET /api/projects/:name/history` — list deploy history
- [x] Rollback UI — tombol rollback di ProjectCard menu
- [x] Endpoint `POST /api/projects/:name/rollback` — SSE rollback ke image :previous
- [x] Resource monitoring — `GET /api/projects/:name/stats` → docker stats (CPU, RAM, Net, Block I/O)
- [x] Stats panel di ProjectCard — toggle show/hide
- [x] Backup script `scripts/backup-projects.sh` — backup semua proj_* DB + deployer DB, retention 7 hari
- [ ] Notifikasi deploy (Telegram/Slack webhook kalau deploy sukses/gagal)
- [ ] Rate limit webhook endpoint (verifikasi sudah ada)

---

## Catatan & Keputusan Desain

- `client_domains` lama → digantikan `domains` (global, tidak terikat client). Client assignment ke domain dilakukan di Phase 3.
- Template disimpan di DB (bukan hanya file), supaya bisa di-edit via UI tanpa SSH ke server.
- File compose final disimpan di `data/stacks/{slug}/docker-compose.yml` — persistent, bisa di-inspect manual kalau perlu debug.
- Encrypted fields pakai AES-256-GCM dengan `ENCRYPTION_KEY` dari env (sudah ada di codebase).
