#!/bin/bash

# Homelab Deploy Helper
# Script untuk deploy project apapun ke homelab dengan Traefik + Cloudflare Tunnel

set -e

echo "🚀 Homelab Deploy Helper"
echo "========================"
echo ""

# Cek apakah di folder homelab
if [ ! -f "docker-compose.yml" ] || [ ! -f ".env" ]; then
    echo "❌ Error: Jalankan script ini di folder homelab (yang ada docker-compose.yml)"
    exit 1
fi

# Input dari user
read -p "📦 Nama project (contoh: myapp): " PROJECT_NAME
read -p "🌐 Subdomain (contoh: myapp): " SUBDOMAIN
read -p "📂 Path ke project (contoh: /path/to/project atau ./projects/myapp): " PROJECT_PATH

# Validasi input
if [ -z "$PROJECT_NAME" ] || [ -z "$SUBDOMAIN" ] || [ -z "$PROJECT_PATH" ]; then
    echo "❌ Error: Semua field harus diisi"
    exit 1
fi

# Expand path
PROJECT_PATH=$(realpath "$PROJECT_PATH" 2>/dev/null || echo "$PROJECT_PATH")

# Cek apakah project path ada
if [ ! -d "$PROJECT_PATH" ]; then
    echo "❌ Error: Folder $PROJECT_PATH tidak ditemukan"
    exit 1
fi

echo ""
echo "🔍 Mendeteksi tipe project..."

# Deteksi tipe project
PROJECT_TYPE=""
PORT=""

if [ -f "$PROJECT_PATH/package.json" ]; then
    PROJECT_TYPE="nodejs"
    PORT="3000"
    echo "✅ Terdeteksi: Node.js"
elif [ -f "$PROJECT_PATH/composer.json" ] || [ -f "$PROJECT_PATH/index.php" ]; then
    PROJECT_TYPE="php"
    PORT="80"
    echo "✅ Terdeteksi: PHP"
elif [ -f "$PROJECT_PATH/requirements.txt" ] || [ -f "$PROJECT_PATH/manage.py" ]; then
    PROJECT_TYPE="python"
    PORT="8000"
    echo "✅ Terdeteksi: Python"
elif [ -f "$PROJECT_PATH/Gemfile" ]; then
    PROJECT_TYPE="ruby"
    PORT="3000"
    echo "✅ Terdeteksi: Ruby"
elif [ -f "$PROJECT_PATH/pom.xml" ] || [ -f "$PROJECT_PATH/build.gradle" ]; then
    PROJECT_TYPE="java"
    PORT="8080"
    echo "✅ Terdeteksi: Java"
elif [ -f "$PROJECT_PATH/go.mod" ]; then
    PROJECT_TYPE="go"
    PORT="8080"
    echo "✅ Terdeteksi: Go"
else
    echo "⚠️  Tidak terdeteksi otomatis"
    echo ""
    echo "Pilih tipe project:"
    echo "1) Node.js"
    echo "2) PHP"
    echo "3) Python"
    echo "4) Ruby"
    echo "5) Java"
    echo "6) Go"
    echo "7) Static HTML"
    echo "8) Custom (sudah ada Dockerfile)"
    read -p "Pilih (1-8): " choice
    
    case $choice in
        1) PROJECT_TYPE="nodejs"; PORT="3000" ;;
        2) PROJECT_TYPE="php"; PORT="80" ;;
        3) PROJECT_TYPE="python"; PORT="8000" ;;
        4) PROJECT_TYPE="ruby"; PORT="3000" ;;
        5) PROJECT_TYPE="java"; PORT="8080" ;;
        6) PROJECT_TYPE="go"; PORT="8080" ;;
        7) PROJECT_TYPE="static"; PORT="80" ;;
        8) PROJECT_TYPE="custom"; read -p "Port aplikasi: " PORT ;;
        *) echo "❌ Pilihan tidak valid"; exit 1 ;;
    esac
fi

# Konfirmasi port
read -p "🔌 Port aplikasi [$PORT]: " CUSTOM_PORT
PORT=${CUSTOM_PORT:-$PORT}

echo ""
echo "📋 Ringkasan:"
echo "  Project: $PROJECT_NAME"
echo "  Tipe: $PROJECT_TYPE"
echo "  Path: $PROJECT_PATH"
echo "  Subdomain: $SUBDOMAIN.${DOMAIN}"
echo "  Port: $PORT"
echo ""
read -p "Lanjutkan? (y/n): " confirm

if [ "$confirm" != "y" ]; then
    echo "❌ Dibatalkan"
    exit 0
fi

# Buat Dockerfile jika belum ada
if [ ! -f "$PROJECT_PATH/Dockerfile" ] && [ "$PROJECT_TYPE" != "custom" ]; then
    echo ""
    echo "📝 Membuat Dockerfile..."
    
    case $PROJECT_TYPE in
        nodejs)
            cat > "$PROJECT_PATH/Dockerfile" <<'EOF'
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "index.js"]
EOF
            echo "✅ Dockerfile Node.js dibuat"
            echo "⚠️  Pastikan entry point di CMD sesuai (default: index.js)"
            ;;
            
        php)
            cat > "$PROJECT_PATH/Dockerfile" <<'EOF'
FROM php:8.2-apache
RUN docker-php-ext-install pdo pdo_mysql
COPY . /var/www/html/
RUN chown -R www-data:www-data /var/www/html
EXPOSE 80
EOF
            echo "✅ Dockerfile PHP dibuat"
            ;;
            
        python)
            cat > "$PROJECT_PATH/Dockerfile" <<'EOF'
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "app:app"]
EOF
            echo "✅ Dockerfile Python dibuat"
            echo "⚠️  Pastikan entry point di CMD sesuai (default: app:app)"
            ;;
            
        ruby)
            cat > "$PROJECT_PATH/Dockerfile" <<'EOF'
FROM ruby:3.2-alpine
WORKDIR /app
COPY Gemfile Gemfile.lock ./
RUN bundle install --without development test
COPY . .
EXPOSE 3000
CMD ["rails", "server", "-b", "0.0.0.0"]
EOF
            echo "✅ Dockerfile Ruby dibuat"
            ;;
            
        java)
            cat > "$PROJECT_PATH/Dockerfile" <<'EOF'
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY target/*.jar app.jar
EXPOSE 8080
CMD ["java", "-jar", "app.jar"]
EOF
            echo "✅ Dockerfile Java dibuat"
            echo "⚠️  Pastikan JAR sudah di-build di folder target/"
            ;;
            
        go)
            cat > "$PROJECT_PATH/Dockerfile" <<'EOF'
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
EOF
            echo "✅ Dockerfile Go dibuat"
            ;;
            
        static)
            cat > "$PROJECT_PATH/Dockerfile" <<'EOF'
FROM nginx:alpine
COPY . /usr/share/nginx/html
EXPOSE 80
EOF
            echo "✅ Dockerfile Static HTML dibuat"
            ;;
    esac
fi

# Tambahkan ke docker-compose.yml
echo ""
echo "📝 Menambahkan ke docker-compose.yml..."

# Buat relative path jika di dalam homelab
if [[ "$PROJECT_PATH" == "$(pwd)"* ]]; then
    REL_PATH=".${PROJECT_PATH#$(pwd)}"
else
    REL_PATH="$PROJECT_PATH"
fi

# Cek apakah service sudah ada
if grep -q "  $PROJECT_NAME:" docker-compose.yml; then
    echo "⚠️  Service $PROJECT_NAME sudah ada di docker-compose.yml"
    read -p "Timpa? (y/n): " overwrite
    if [ "$overwrite" != "y" ]; then
        echo "❌ Dibatalkan"
        exit 0
    fi
    # Hapus service lama (simplified, might need improvement)
    echo "⚠️  Silakan hapus service lama secara manual dan jalankan script lagi"
    exit 1
fi

# Tambahkan service baru sebelum networks:
SERVICE_CONFIG="
  $PROJECT_NAME:
    build: $REL_PATH
    container_name: $PROJECT_NAME
    restart: unless-stopped
    security_opt:
      - no-new-privileges:true
    networks:
      - web
    labels:
      - \"traefik.enable=true\"
      - \"traefik.http.routers.$PROJECT_NAME.rule=Host(\\\`$SUBDOMAIN.${DOMAIN}\\\`)\"
      - \"traefik.http.routers.$PROJECT_NAME.entrypoints=web\"
      - \"traefik.http.services.$PROJECT_NAME.loadbalancer.server.port=$PORT\"
"

# Insert before networks: line
sed -i "/^networks:/i\\$SERVICE_CONFIG" docker-compose.yml

echo "✅ Service ditambahkan ke docker-compose.yml"

# Build dan jalankan
echo ""
echo "🔨 Building dan deploying..."
docker compose build "$PROJECT_NAME"
docker compose up -d "$PROJECT_NAME"

echo ""
echo "✅ Deploy selesai!"
echo ""
echo "📋 Langkah selanjutnya:"
echo ""
echo "1. Cek logs:"
echo "   docker compose logs -f $PROJECT_NAME"
echo ""
echo "2. Tambahkan Public Hostname di Cloudflare:"
echo ""
echo "   MANUAL:"
echo "   - Buka: https://one.dash.cloudflare.com/"
echo "   - Networks → Tunnels → homelab → Public Hostname"
echo "   - Subdomain: $SUBDOMAIN"
echo "   - Domain: ${DOMAIN}"
echo "   - Service: http://traefik:80"
echo ""
echo "   OTOMATIS (jika sudah setup Cloudflare API):"
echo "   ./cloudflare-route.sh $SUBDOMAIN.${DOMAIN}"
echo ""
echo "3. Test akses:"
echo "   https://$SUBDOMAIN.${DOMAIN}"
echo ""
echo "🎉 Happy deploying!"
