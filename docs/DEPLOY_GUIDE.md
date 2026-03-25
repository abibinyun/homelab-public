# Adding Projects to Homelab

All projects (Node.js, Ruby, PHP, Java, etc.) can be added the same way: create a Dockerfile, add it to docker-compose.yml, and expose it via Traefik.

## General Template

### 1. Folder Structure

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

### 2. Add to docker-compose.yml

```yaml
  myapp:
    build: ./projects/myapp-nodejs
    container_name: myapp
    restart: unless-stopped
    # No profiles = auto-start in production
    environment:
      - NODE_ENV=production
    networks:
      - web
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.myapp.rule=Host(`myapp.yourdomain.com`)"
      - "traefik.http.routers.myapp.entrypoints=web"
      - "traefik.http.services.myapp.loadbalancer.server.port=3000"  # Your app's port
```

**Development service (manual start):**
```yaml
  myapp-dev:
    build: ./projects/myapp-nodejs
    container_name: myapp-dev
    restart: unless-stopped
    profiles:
      - dev  # Manual start with: docker compose --profile dev up -d
    environment:
      - NODE_ENV=development
    networks:
      - web
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.myapp-dev.rule=Host(`myapp-dev.yourdomain.com`)"
```

### 3. Add to Cloudflare Tunnel

In Cloudflare Dashboard → Tunnels → homelab → Public Hostname:
- Subdomain: `myapp`
- Domain: `yourdomain.com`
- Service: `http://traefik:80`

**⚠️ Important:** The service is ALWAYS `http://traefik:80` for all projects. Traefik handles routing to the correct container based on subdomain.

The flow:
```
Internet → Cloudflare Tunnel → traefik:80 → Traefik (routing by subdomain) → Container
```

One tunnel, one entry point, unlimited subdomains!

### 4. Deploy

```bash
docker compose up -d myapp
```

---

## Examples by Language/Framework

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

## With a Database

If your app needs a database, add a database service:

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

## Using an Existing Image (No Build)

If you already have an image on Docker Hub:

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

## Important Tips

1. **Correct port**: Ensure `loadbalancer.server.port` matches the port EXPOSEd in your Dockerfile
2. **Network**: All services must be on the `web` network
3. **Unique subdomain**: Each service must have a different subdomain
4. **Environment variables**: Store secrets in `.env` and reference them with `${VAR_NAME}`
5. **Health checks**: Add health checks for production:
   ```yaml
   healthcheck:
     test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
     interval: 30s
     timeout: 10s
     retries: 3
   ```

---

## Deploy Workflow

```bash
# 1. Develop in your project folder
cd /home/user/myproject
# Work on development as usual

# 2. Ready for production → copy to homelab
cp -r /home/user/myproject /path/to/homelab/projects/myproject

# 3. Create a Dockerfile (if not already present)
cd /path/to/homelab/projects/myproject
# Create Dockerfile for your language

# 4. Edit docker-compose.yml in homelab root, add the service
cd /path/to/homelab
nano docker-compose.yml

# 5. Build and run
docker compose build myproject
docker compose up -d myproject

# 6. Check logs
docker compose logs -f myproject

# 7. Add subdomain in Cloudflare Tunnel
# Subdomain: myproject
# Service: http://traefik:80

# 8. Test
curl https://myproject.yourdomain.com
```

**Or use the automated script:**
```bash
./scripts/deploy.sh
# Input: myproject, myproject, ./projects/myproject, 3000
```

Done! 🚀

---

## Troubleshooting

**Container keeps restarting:**
```bash
docker compose logs myapp
```

**Wrong port:**
```bash
# Check the port exposed by the container
docker inspect myapp | grep -A 5 ExposedPorts
```

**Traefik not routing:**
```bash
# Check registered routers
curl http://localhost:8080/api/http/routers | jq
```
