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

In Cloudflare Dashboard → Networks → Tunnels → homelab → Public Hostname:

**For root domain:**
- Hostname: `myapp.com` (leave subdomain empty)
- Service: `http://traefik:80`

**For subdomain:**
- Subdomain: `www`
- Domain: `myapp.com`
- Service: `http://traefik:80`

**For wildcard (optional):**
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
