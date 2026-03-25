# Panduan Menambahkan Project ke Homelab

Semua project (Node.js, Ruby, PHP, Java, dll) bisa ditambahkan dengan cara yang sama: buat Dockerfile, tambahkan ke docker-compose.yml, dan expose via Traefik.

## Template Umum

### 1. Struktur Folder

```
homelab/
├── docker-compose.yml
├── .env
├── projects/
│   ├── myapp-nodejs/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── src/
│   ├── myapp-php/
│   │   ├── Dockerfile
│   │   └── public/
│   └── myapp-java/
│       ├── Dockerfile
│       └── target/
```

### 2. Tambahkan ke docker-compose.yml

```yaml
  myapp:
    build: ./projects/myapp-nodejs
    container_name: myapp
    restart: unless-stopped
    # Tidak pakai profiles = auto-start production
    environment:
      - NODE_ENV=production
    networks:
      - web
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.myapp.rule=Host(`myapp.yourdomain.com`)"
      - "traefik.http.routers.myapp.entrypoints=web"
      - "traefik.http.services.myapp.loadbalancer.server.port=3000"  # Port app kamu
```

**Development service (manual start):**
```yaml
  myapp-dev:
    build: ./projects/myapp-nodejs
    container_name: myapp-dev
    restart: unless-stopped
    profiles:
      - dev  # Manual start dengan: docker compose --profile dev up -d
    environment:
      - NODE_ENV=development
    networks:
      - web
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.myapp-dev.rule=Host(`myapp-dev.yourdomain.com`)"
```

### 3. Tambahkan di Cloudflare Tunnel

Di Cloudflare Dashboard → Tunnels → homelab → Public Hostname:
- Subdomain: `myapp`
- Domain: `yourdomain.com`
- Service: `http://traefik:80`

**⚠️ Penting:** Service SELALU `http://traefik:80` untuk semua project. Traefik yang akan routing ke container yang benar berdasarkan subdomain.

Jadi workflow-nya:
```
Internet → Cloudflare Tunnel → traefik:80 → Traefik (routing by subdomain) → Container
```

Satu tunnel, satu entry point, unlimited subdomain!

### 4. Deploy

```bash
docker compose up -d myapp
```

---

## Contoh per Bahasa/Framework

### Node.js / Express

**Dockerfile:**
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "index.js"]
```

**docker-compose.yml:**
```yaml
  nodejs-app:
    build: ./projects/nodejs-app
    container_name: nodejs-app
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - PORT=3000
    networks:
      - web
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.nodejs.rule=Host(`nodejs.yourdomain.com`)"
      - "traefik.http.services.nodejs.loadbalancer.server.port=3000"
```

---

### PHP / Laravel

**Dockerfile:**
```dockerfile
FROM php:8.2-fpm-alpine
RUN docker-php-ext-install pdo pdo_mysql
WORKDIR /var/www/html
COPY . .
RUN chown -R www-data:www-data /var/www/html
```

**docker-compose.yml:**
```yaml
  php-app:
    build: ./projects/php-app
    container_name: php-app
    restart: unless-stopped
    networks:
      - web
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.php.rule=Host(`php.yourdomain.com`)"
      - "traefik.http.services.php.loadbalancer.server.port=80"
  
  nginx-php:
    image: nginx:alpine
    container_name: nginx-php
    restart: unless-stopped
    volumes:
      - ./projects/php-app:/var/www/html
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - php-app
    networks:
      - web
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.phpnginx.rule=Host(`php.yourdomain.com`)"
```

---

### Python / Flask / Django

**Dockerfile:**
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "app:app"]
```

**docker-compose.yml:**
```yaml
  python-app:
    build: ./projects/python-app
    container_name: python-app
    restart: unless-stopped
    environment:
      - PYTHONUNBUFFERED=1
    networks:
      - web
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.python.rule=Host(`python.yourdomain.com`)"
      - "traefik.http.services.python.loadbalancer.server.port=8000"
```

---

### Ruby / Rails

**Dockerfile:**
```dockerfile
FROM ruby:3.2-alpine
WORKDIR /app
COPY Gemfile Gemfile.lock ./
RUN bundle install --without development test
COPY . .
EXPOSE 3000
CMD ["rails", "server", "-b", "0.0.0.0"]
```

**docker-compose.yml:**
```yaml
  ruby-app:
    build: ./projects/ruby-app
    container_name: ruby-app
    restart: unless-stopped
    environment:
      - RAILS_ENV=production
    networks:
      - web
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.ruby.rule=Host(`ruby.yourdomain.com`)"
      - "traefik.http.services.ruby.loadbalancer.server.port=3000"
```

---

### Java / Spring Boot

**Dockerfile:**
```dockerfile
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY target/*.jar app.jar
EXPOSE 8080
CMD ["java", "-jar", "app.jar"]
```

**docker-compose.yml:**
```yaml
  java-app:
    build: ./projects/java-app
    container_name: java-app
    restart: unless-stopped
    environment:
      - SPRING_PROFILES_ACTIVE=production
    networks:
      - web
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.java.rule=Host(`java.yourdomain.com`)"
      - "traefik.http.services.java.loadbalancer.server.port=8080"
```

---

### Go

**Dockerfile:**
```dockerfile
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY go.* ./
RUN go mod download
COPY . .
RUN go build -o main .

FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/main .
EXPOSE 8080
CMD ["./main"]
```

**docker-compose.yml:**
```yaml
  go-app:
    build: ./projects/go-app
    container_name: go-app
    restart: unless-stopped
    networks:
      - web
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.go.rule=Host(`go.yourdomain.com`)"
      - "traefik.http.services.go.loadbalancer.server.port=8080"
```

---

## Dengan Database

Jika app butuh database, tambahkan service database:

```yaml
  myapp:
    build: ./projects/myapp
    container_name: myapp
    restart: unless-stopped
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/mydb
    depends_on:
      - postgres
    networks:
      - web
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.myapp.rule=Host(`myapp.yourdomain.com`)"

  postgres:
    image: postgres:15-alpine
    container_name: myapp-postgres
    restart: unless-stopped
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
      - POSTGRES_DB=mydb
    volumes:
      - ./data/postgres:/var/lib/postgresql/data
    networks:
      - web
```

---

## Pakai Image Existing (Tanpa Build)

Jika sudah ada image di Docker Hub:

```yaml
  existing-app:
    image: username/myapp:latest
    container_name: existing-app
    restart: unless-stopped
    networks:
      - web
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.existing.rule=Host(`existing.yourdomain.com`)"
      - "traefik.http.services.existing.loadbalancer.server.port=8080"
```

---

## Tips Penting

1. **Port yang benar**: Pastikan `loadbalancer.server.port` sesuai dengan port yang di-EXPOSE di Dockerfile
2. **Network**: Semua service harus di network `web`
3. **Subdomain unik**: Setiap service harus punya subdomain berbeda
4. **Environment variables**: Simpan secrets di `.env` dan reference dengan `${VAR_NAME}`
5. **Health checks**: Tambahkan health check untuk production:
   ```yaml
   healthcheck:
     test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
     interval: 30s
     timeout: 10s
     retries: 3
   ```

---

## Workflow Deploy

```bash
# 1. Development di folder project sendiri
cd /home/user/myproject
# Kerja development seperti biasa

# 2. Ready production → Copy ke homelab
cp -r /home/user/myproject /home/abibinyun/data/homelab/projects/myproject

# 3. Buat Dockerfile (jika belum ada)
cd /home/abibinyun/data/homelab/projects/myproject
# Buat Dockerfile sesuai bahasa

# 4. Edit docker-compose.yml di homelab root, tambahkan service
cd /home/abibinyun/data/homelab
nano docker-compose.yml

# 5. Build dan jalankan
docker compose build myproject
docker compose up -d myproject

# 6. Cek logs
docker compose logs -f myproject

# 7. Tambahkan subdomain di Cloudflare Tunnel
# Subdomain: myproject
# Service: http://traefik:80

# 8. Test
curl https://myproject.yourdomain.com
```

**Atau pakai script otomatis:**
```bash
./scripts/deploy.sh
# Input: myproject, myproject, ./projects/myproject, 3000
```

Done! 🚀

---

## Troubleshooting

**Container restart terus:**
```bash
docker compose logs myapp
```

**Port salah:**
```bash
# Cek port yang di-expose container
docker inspect myapp | grep -A 5 ExposedPorts
```

**Traefik tidak routing:**
```bash
# Cek router terdaftar
curl http://localhost:8080/api/http/routers | jq
```
