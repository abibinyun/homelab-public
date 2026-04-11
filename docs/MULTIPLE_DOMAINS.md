# Multiple Domain Setup

Setup for using multiple domains (not just subdomains) in the same homelab.

## Concept

```
Internet → Cloudflare Tunnel → Traefik → Routing by domain/subdomain → Container
```

**1 Tunnel, Multiple Domains:**
- `myapp.com` → Container A
- `another-domain.com` → Container B
- `subdomain.yourdomain.com` → Container C

Traefik routes based on the `Host` header of each request.

---

## Adding a New Domain

### 1. Add the Domain to Cloudflare

1. Log in to the Cloudflare Dashboard
2. Add the new domain (myapp.com, another-domain.com, etc.)
3. Update the nameservers at your domain registrar

### 2. Add to Cloudflare Tunnel

> ⚠️ **Do NOT create a new tunnel for a new domain.** Always add new domains to the existing running tunnel. Creating a new tunnel means you need a new cloudflared container — this causes conflicts if two containers use the same tunnel token.

In Cloudflare Dashboard → Networks → Tunnels → **homelab** (your existing tunnel) → Public Hostname:

**For root domain:**
- Hostname: `myapp.com` (leave subdomain empty)
- Service: `http://traefik:80`

**For wildcard subdomain (recommended):**
- Subdomain: `*`
- Domain: `myapp.com`
- Service: `http://traefik:80`

> Adding `*` means all subdomains of `myapp.com` automatically route through Traefik — no need to touch the tunnel config for every new project.

### 3. Update DNS Records

Ensure the DNS records for the new domain point to the **same tunnel** (`f15a0196...cfargotunnel.com` or whatever your tunnel ID is), not a different one.

Check in Cloudflare Dashboard → DNS:
- `myapp.com` → CNAME → `<tunnel-id>.cfargotunnel.com` (proxied)
- `*.myapp.com` → CNAME → `<tunnel-id>.cfargotunnel.com` (proxied)

> ⚠️ If DNS points to a different tunnel ID than the one running in your cloudflared container, the domain will be down even though everything else looks correct.

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
      # Another domain
      - "traefik.http.routers.another.rule=Host(`another-domain.com`)"
      - "traefik.http.routers.another.entrypoints=web"
      - "traefik.http.services.another.loadbalancer.server.port=8080"
```

### 4. Deploy

```bash
docker compose up -d
```

---

## Multiple Domains for One App

If one app needs to be accessible from multiple domains:

```yaml
  myapp:
    labels:
      - "traefik.enable=true"
      # Multiple domains with OR operator
      - "traefik.http.routers.myapp.rule=Host(`myapp.com`) || Host(`www.myapp.com`) || Host(`myapp.yourdomain.com`)"
      - "traefik.http.routers.myapp.entrypoints=web"
      - "traefik.http.services.myapp.loadbalancer.server.port=3000"
```

---

## Redirect www to non-www (or vice versa)

### Redirect www → non-www

```yaml
  myapp:
    labels:
      - "traefik.enable=true"
      
      # Router for www (redirect)
      - "traefik.http.routers.myapp-www.rule=Host(`www.myapp.com`)"
      - "traefik.http.routers.myapp-www.middlewares=redirect-to-non-www"
      - "traefik.http.middlewares.redirect-to-non-www.redirectregex.regex=^https://www\\.(.+)"
      - "traefik.http.middlewares.redirect-to-non-www.redirectregex.replacement=https://$${1}"
      - "traefik.http.middlewares.redirect-to-non-www.redirectregex.permanent=true"
      
      # Router for non-www (main)
      - "traefik.http.routers.myapp.rule=Host(`myapp.com`)"
      - "traefik.http.routers.myapp.entrypoints=web"
      - "traefik.http.services.myapp.loadbalancer.server.port=3000"
```

### Redirect non-www → www

```yaml
  myapp:
    labels:
      - "traefik.enable=true"
      
      # Router for non-www (redirect)
      - "traefik.http.routers.myapp-nonwww.rule=Host(`myapp.com`)"
      - "traefik.http.routers.myapp-nonwww.middlewares=redirect-to-www"
      - "traefik.http.middlewares.redirect-to-www.redirectregex.regex=^https://(?:www\\.)?(.+)"
      - "traefik.http.middlewares.redirect-to-www.redirectregex.replacement=https://www.$${1}"
      - "traefik.http.middlewares.redirect-to-www.redirectregex.permanent=true"
      
      # Router for www (main)
      - "traefik.http.routers.myapp.rule=Host(`www.myapp.com`)"
      - "traefik.http.routers.myapp.entrypoints=web"
      - "traefik.http.services.myapp.loadbalancer.server.port=3000"
```

---

## Path-based Routing

To route based on path (not domain):

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

Requests:
- `myapp.com/api/*` → API container
- `myapp.com/*` → Frontend container

---

## Full Example: Multi-Domain Setup

```yaml
services:
  traefik:
    image: traefik:v3
    # ... (same config as before)

  # App 1: Own domain
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

  # App 2: Another domain
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

  # App 3: Subdomain of primary domain
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

**Cloudflare Tunnel Public Hostnames:**
- `myapp.com` → `http://traefik:80`
- `www.myapp.com` → `http://traefik:80`
- `myshop.com` → `http://traefik:80`
- `blog.yourdomain.com` → `http://traefik:80`

---

## Tips

### 1. Local Testing
Add to `/etc/hosts` for local testing:
```bash
sudo nano /etc/hosts

# Add:
127.0.0.1 myapp.com
127.0.0.1 www.myapp.com
127.0.0.1 myshop.com
```

Test:
```bash
curl http://myapp.com
```

### 2. Check Traefik Routing
```bash
# List all routers
curl http://localhost:8080/api/http/routers | jq

# Check a specific router
curl http://localhost:8080/api/http/routers | jq '.[] | select(.name=="myapp@docker")'
```

### 3. Debug
```bash
# Test with Host header
curl -H "Host: myapp.com" http://localhost:80

# View logs
docker compose logs traefik | grep myapp
```

---

## Cost

**Cloudflare Tunnel:**
- ✅ Free for unlimited domains
- ✅ Free for unlimited subdomains
- ✅ Free for unlimited traffic

**Domains:**
- Annual domain registration fee (varies by registrar)
- Cloudflare can act as your registrar (competitive pricing)

---

## Summary

- ✅ One homelab can handle unlimited domains
- ✅ One Cloudflare Tunnel for all domains
- ✅ Traefik routes automatically based on Host header
- ✅ Just update labels in docker-compose.yml
- ✅ No infrastructure changes needed

**Workflow:**
1. Buy a new domain
2. Add it to Cloudflare
3. Add Public Hostname in Tunnel (service: `http://traefik:80`)
4. Update labels in docker-compose.yml
5. Deploy: `docker compose up -d`
6. Done! New domain is live immediately

---

## Deploying an External Project (e.g. digitor.id)

For projects that live outside the homelab-public folder but want to use the same Traefik + Cloudflare Tunnel:

### Requirements

The project's `docker-compose` must:
1. Join the `homelab-public_web` network (external)
2. Use Traefik labels for routing
3. NOT include its own postgres/redis if using the shared ones from homelab-public

```yaml
services:
  myapp:
    build: .
    container_name: myapp
    networks:
      - web
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.myapp.rule=Host(`myapp.cube.my.id`)"
      - "traefik.http.routers.myapp.entrypoints=web"
      - "traefik.http.services.myapp.loadbalancer.server.port=3000"

networks:
  web:
    external: true
    name: homelab-public_web
```

### Shared Database

To use homelab-public's postgres/redis, set the connection string to the container name:

```env
DATABASE_URL=postgresql://postgres:POSTGRES_PASSWORD@postgres:5432/mydb?schema=public
REDIS_URL=redis://:REDIS_PASSWORD@redis:6379
```

> `POSTGRES_PASSWORD` and `REDIS_PASSWORD` must match the values in `homelab-public/.env`.

### Deploy

```bash
cd /path/to/myproject
docker compose -f docker-compose.homelab-public.yml --env-file .env.homelab-public up -d --build
```

No changes needed to homelab-public itself — Traefik auto-discovers the new containers via Docker labels.
