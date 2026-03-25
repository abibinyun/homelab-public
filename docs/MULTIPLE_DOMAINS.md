# Multiple Domain Setup

Setup untuk menggunakan multiple domain (bukan hanya subdomain) di homelab yang sama.

## Konsep

```
Internet → Cloudflare Tunnel → Traefik → Routing by domain/subdomain → Container
```

**1 Tunnel, Multiple Domain:**
- `myapp.com` → Container A
- `another-domain.com` → Container B
- `subdomain.yourdomain.com` → Container C

Traefik routing berdasarkan `Host` header dari request.

---

## Setup Domain Baru

### 1. Tambahkan Domain ke Cloudflare

1. Login ke Cloudflare Dashboard
2. Add domain baru (myapp.com, another-domain.com, dll)
3. Update nameserver di registrar domain

### 2. Tambahkan ke Cloudflare Tunnel

Di Cloudflare Dashboard → Networks → Tunnels → homelab → Public Hostname:

**Untuk root domain:**
- Hostname: `myapp.com` (kosongkan subdomain)
- Service: `http://traefik:80`

**Untuk subdomain:**
- Subdomain: `www`
- Domain: `myapp.com`
- Service: `http://traefik:80`

**Untuk wildcard (opsional):**
- Subdomain: `*`
- Domain: `myapp.com`
- Service: `http://traefik:80`

### 3. Update docker-compose.yml

```yaml
  myapp:
    build: ./projects/myapp
    container_name: myapp
    restart: unless-stopped
    networks:
      - web
    labels:
      - "traefik.enable=true"
      # Root domain
      - "traefik.http.routers.myapp.rule=Host(`myapp.com`)"
      - "traefik.http.routers.myapp.entrypoints=web"
      - "traefik.http.services.myapp.loadbalancer.server.port=3000"

  another-app:
    build: ./projects/another-app
    container_name: another-app
    restart: unless-stopped
    networks:
      - web
    labels:
      - "traefik.enable=true"
      # Domain lain
      - "traefik.http.routers.another.rule=Host(`another-domain.com`)"
      - "traefik.http.routers.another.entrypoints=web"
      - "traefik.http.services.another.loadbalancer.server.port=8080"
```

### 4. Deploy

```bash
docker compose up -d
```

---

## Multiple Domain untuk 1 App

Jika 1 app perlu accessible dari multiple domain:

```yaml
  myapp:
    labels:
      - "traefik.enable=true"
      # Multiple domain dengan OR operator
      - "traefik.http.routers.myapp.rule=Host(`myapp.com`) || Host(`www.myapp.com`) || Host(`myapp.yourdomain.com`)"
      - "traefik.http.routers.myapp.entrypoints=web"
      - "traefik.http.services.myapp.loadbalancer.server.port=3000"
```

---

## Redirect www ke non-www (atau sebaliknya)

### Redirect www → non-www

```yaml
  myapp:
    labels:
      - "traefik.enable=true"
      
      # Router untuk www (redirect)
      - "traefik.http.routers.myapp-www.rule=Host(`www.myapp.com`)"
      - "traefik.http.routers.myapp-www.middlewares=redirect-to-non-www"
      - "traefik.http.middlewares.redirect-to-non-www.redirectregex.regex=^https://www\\.(.+)"
      - "traefik.http.middlewares.redirect-to-non-www.redirectregex.replacement=https://$${1}"
      - "traefik.http.middlewares.redirect-to-non-www.redirectregex.permanent=true"
      
      # Router untuk non-www (main)
      - "traefik.http.routers.myapp.rule=Host(`myapp.com`)"
      - "traefik.http.routers.myapp.entrypoints=web"
      - "traefik.http.services.myapp.loadbalancer.server.port=3000"
```

### Redirect non-www → www

```yaml
  myapp:
    labels:
      - "traefik.enable=true"
      
      # Router untuk non-www (redirect)
      - "traefik.http.routers.myapp-nonwww.rule=Host(`myapp.com`)"
      - "traefik.http.routers.myapp-nonwww.middlewares=redirect-to-www"
      - "traefik.http.middlewares.redirect-to-www.redirectregex.regex=^https://(?:www\\.)?(.+)"
      - "traefik.http.middlewares.redirect-to-www.redirectregex.replacement=https://www.$${1}"
      - "traefik.http.middlewares.redirect-to-www.redirectregex.permanent=true"
      
      # Router untuk www (main)
      - "traefik.http.routers.myapp.rule=Host(`www.myapp.com`)"
      - "traefik.http.routers.myapp.entrypoints=web"
      - "traefik.http.services.myapp.loadbalancer.server.port=3000"
```

---

## Path-based Routing

Jika ingin routing berdasarkan path (bukan domain):

```yaml
  api:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.api.rule=Host(`myapp.com`) && PathPrefix(`/api`)"
      - "traefik.http.services.api.loadbalancer.server.port=3000"

  frontend:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.frontend.rule=Host(`myapp.com`) && PathPrefix(`/`)"
      - "traefik.http.services.frontend.loadbalancer.server.port=8080"
```

Request:
- `myapp.com/api/*` → Container API
- `myapp.com/*` → Container Frontend

---

## Contoh Lengkap: Multi-Domain Setup

```yaml
services:
  traefik:
    image: traefik:v3
    # ... (config sama seperti sebelumnya)

  # App 1: Domain sendiri
  myapp:
    build: ./projects/myapp
    container_name: myapp
    restart: unless-stopped
    networks:
      - web
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.myapp.rule=Host(`myapp.com`) || Host(`www.myapp.com`)"
      - "traefik.http.routers.myapp.entrypoints=web"
      - "traefik.http.services.myapp.loadbalancer.server.port=3000"

  # App 2: Domain lain
  shop:
    build: ./projects/shop
    container_name: shop
    restart: unless-stopped
    networks:
      - web
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.shop.rule=Host(`myshop.com`)"
      - "traefik.http.routers.shop.entrypoints=web"
      - "traefik.http.services.shop.loadbalancer.server.port=8080"

  # App 3: Subdomain dari domain utama
  blog:
    build: ./projects/blog
    container_name: blog
    restart: unless-stopped
    networks:
      - web
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.blog.rule=Host(`blog.yourdomain.com`)"
      - "traefik.http.routers.blog.entrypoints=web"
      - "traefik.http.services.blog.loadbalancer.server.port=80"

networks:
  web:
    driver: bridge
```

**Cloudflare Tunnel Public Hostname:**
- `myapp.com` → `http://traefik:80`
- `www.myapp.com` → `http://traefik:80`
- `myshop.com` → `http://traefik:80`
- `blog.yourdomain.com` → `http://traefik:80`

---

## Tips

### 1. Testing Lokal
Tambahkan di `/etc/hosts` untuk testing:
```bash
sudo nano /etc/hosts

# Tambahkan:
127.0.0.1 myapp.com
127.0.0.1 www.myapp.com
127.0.0.1 myshop.com
```

Test:
```bash
curl http://myapp.com
```

### 2. Cek Routing Traefik
```bash
# Lihat semua routers
curl http://localhost:8080/api/http/routers | jq

# Cek router spesifik
curl http://localhost:8080/api/http/routers | jq '.[] | select(.name=="myapp@docker")'
```

### 3. Debug
```bash
# Test dengan Host header
curl -H "Host: myapp.com" http://localhost:80

# Lihat logs
docker compose logs traefik | grep myapp
```

---

## Biaya

**Cloudflare Tunnel:**
- ✅ Gratis untuk unlimited domain
- ✅ Gratis untuk unlimited subdomain
- ✅ Gratis untuk unlimited traffic

**Domain:**
- Biaya registrasi domain per tahun (tergantung registrar)
- Cloudflare bisa jadi registrar (harga kompetitif)

---

## Kesimpulan

- ✅ 1 homelab bisa handle unlimited domain
- ✅ 1 Cloudflare Tunnel untuk semua domain
- ✅ Traefik routing otomatis berdasarkan Host header
- ✅ Tinggal ganti label di docker-compose.yml
- ✅ Tidak perlu ubah infrastruktur

**Workflow:**
1. Beli domain baru
2. Tambahkan ke Cloudflare
3. Tambahkan Public Hostname di Tunnel (service: `http://traefik:80`)
4. Update label di docker-compose.yml
5. Deploy: `docker compose up -d`
6. Done! Domain baru langsung jalan
