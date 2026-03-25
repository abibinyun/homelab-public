#!/bin/bash

# Full Deploy - Zero Manual Steps
# Deploy container + Auto-create Cloudflare route

set -e

PROJECT_NAME=$1
SUBDOMAIN=$2
PROJECT_PATH=$3
PORT=${4:-3000}

if [ -z "$PROJECT_NAME" ] || [ -z "$SUBDOMAIN" ] || [ -z "$PROJECT_PATH" ]; then
    echo "🚀 Full Deploy - Zero Manual Steps"
    echo "=================================="
    echo ""
    echo "Usage: ./full-deploy.sh <project-name> <subdomain> <project-path> [port]"
    echo ""
    echo "Examples:"
    echo "  ./full-deploy.sh myapp myapp ./projects/myapp"
    echo "  ./full-deploy.sh myapp myapp ./projects/myapp 8080"
    echo "  ./full-deploy.sh myapp myapp /home/user/myproject"
    echo ""
    exit 1
fi

echo "🚀 Full Deploy Starting..."
echo "=========================="
echo ""
echo "  Project: $PROJECT_NAME"
echo "  Subdomain: $SUBDOMAIN"
echo "  Path: $PROJECT_PATH"
echo "  Port: $PORT"
echo ""

# Load .env
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Check if Cloudflare API is configured
if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
    echo "⚠️  Cloudflare API not configured"
    echo "   Will deploy container only (manual Cloudflare setup needed)"
    echo ""
    AUTO_ROUTE=false
else
    AUTO_ROUTE=true
fi

read -p "Continue? (y/n): " confirm
if [ "$confirm" != "y" ]; then
    echo "❌ Cancelled"
    exit 0
fi

echo ""
echo "📦 Step 1/3: Deploying container..."
echo "===================================="

# Run deploy script with auto-input
echo -e "$PROJECT_NAME\n$SUBDOMAIN\n$PROJECT_PATH\n$PORT\ny" | ./deploy.sh

echo ""
echo "⏳ Step 2/3: Waiting for container to be ready..."
echo "=================================================="
sleep 5

# Check if container is running
if docker compose ps | grep -q "$PROJECT_NAME.*Up"; then
    echo "✅ Container is running"
else
    echo "❌ Container failed to start"
    echo "Check logs: docker compose logs $PROJECT_NAME"
    exit 1
fi

echo ""
echo "🌐 Step 3/3: Creating Cloudflare route..."
echo "=========================================="

if [ "$AUTO_ROUTE" = true ]; then
    ./cloudflare-route.sh "$SUBDOMAIN.${DOMAIN}"
    
    echo ""
    echo "✅ FULL DEPLOY COMPLETE!"
    echo "======================="
    echo ""
    echo "🎉 Your app is now live!"
    echo ""
    echo "🌐 URL: https://$SUBDOMAIN.${DOMAIN}"
    echo ""
    echo "📋 Next steps:"
    echo "  - Test: curl https://$SUBDOMAIN.${DOMAIN}"
    echo "  - Logs: docker compose logs -f $PROJECT_NAME"
    echo "  - Stop: docker compose stop $PROJECT_NAME"
    echo ""
else
    echo "⚠️  Cloudflare API not configured"
    echo ""
    echo "Manual step required:"
    echo "1. Buka: https://one.dash.cloudflare.com/"
    echo "2. Networks → Tunnels → homelab → Public Hostname"
    echo "3. Add public hostname:"
    echo "   - Subdomain: $SUBDOMAIN"
    echo "   - Domain: ${DOMAIN}"
    echo "   - Service: http://traefik:80"
    echo ""
    echo "Or setup Cloudflare API for full automation:"
    echo "  See: CLOUDFLARE_API.md"
    echo ""
fi
