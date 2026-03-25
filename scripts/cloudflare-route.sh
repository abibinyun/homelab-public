#!/bin/bash

# Cloudflare Tunnel Auto-Route
# Automatically add public hostname to Cloudflare Tunnel

set -e

# Load .env
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Configuration
CLOUDFLARE_API_TOKEN="${CLOUDFLARE_API_TOKEN}"
CLOUDFLARE_ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID}"
CLOUDFLARE_TUNNEL_ID="${CLOUDFLARE_TUNNEL_ID}"
CLOUDFLARE_ZONE_ID="${CLOUDFLARE_ZONE_ID}"

if [ -z "$CLOUDFLARE_API_TOKEN" ] || [ -z "$CLOUDFLARE_ACCOUNT_ID" ] || [ -z "$CLOUDFLARE_TUNNEL_ID" ] || [ -z "$CLOUDFLARE_ZONE_ID" ]; then
    echo "❌ Error: Missing Cloudflare credentials in .env"
    echo ""
    echo "Tambahkan di .env:"
    echo "CLOUDFLARE_API_TOKEN=your_api_token"
    echo "CLOUDFLARE_ACCOUNT_ID=your_account_id"
    echo "CLOUDFLARE_TUNNEL_ID=your_tunnel_id"
    echo "CLOUDFLARE_ZONE_ID=your_zone_id"
    echo ""
    echo "Cara dapat credentials:"
    echo "1. API Token: https://dash.cloudflare.com/profile/api-tokens"
    echo "   - Create Token → Edit Cloudflare Tunnel"
    echo "2. Account ID: Dashboard → klik domain → Overview (sidebar kanan)"
    echo "3. Tunnel ID: Networks → Tunnels → klik tunnel → copy ID dari URL"
    echo "4. Zone ID: Dashboard → klik domain → Overview (sidebar kanan)"
    exit 1
fi

# Input
HOSTNAME=$1
SERVICE=${2:-http://traefik:80}

if [ -z "$HOSTNAME" ]; then
    echo "Usage: ./cloudflare-route.sh <hostname> [service]"
    echo ""
    echo "Examples:"
    echo "  ./cloudflare-route.sh myapp.${DOMAIN}"
    echo "  ./cloudflare-route.sh api.myapp.com http://traefik:80"
    echo ""
    exit 1
fi

echo "🌐 Adding Cloudflare Tunnel route..."
echo "  Hostname: $HOSTNAME"
echo "  Service: $SERVICE"
echo ""

# Get current tunnel config
echo "📥 Getting current tunnel configuration..."
CURRENT_CONFIG=$(curl -s -X GET \
    "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/cfd_tunnel/$CLOUDFLARE_TUNNEL_ID/configurations" \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    -H "Content-Type: application/json")

# Check if hostname already exists
if echo "$CURRENT_CONFIG" | grep -q "\"hostname\":\"$HOSTNAME\""; then
    echo "⚠️  Hostname already exists in tunnel configuration"
    exit 0
fi

# Extract current ingress rules
INGRESS=$(echo "$CURRENT_CONFIG" | jq -r '.result.config.ingress')

# Add new rule before catch-all
NEW_RULE="{\"hostname\":\"$HOSTNAME\",\"service\":\"$SERVICE\"}"
UPDATED_INGRESS=$(echo "$INGRESS" | jq --argjson new "$NEW_RULE" '. | .[0:-1] + [$new] + .[-1:]')

# Update tunnel config
echo "📤 Updating tunnel configuration..."
RESPONSE=$(curl -s -X PUT \
    "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/cfd_tunnel/$CLOUDFLARE_TUNNEL_ID/configurations" \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"config\":{\"ingress\":$UPDATED_INGRESS}}")

# Check response
if echo "$RESPONSE" | jq -e '.success' > /dev/null; then
    echo "✅ Tunnel route added successfully!"
    echo ""
    
    # Create DNS record
    echo "📝 Creating DNS record..."
    SUBDOMAIN=$(echo "$HOSTNAME" | cut -d'.' -f1)
    
    # Check if DNS record exists
    DNS_CHECK=$(curl -s -X GET \
        "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/dns_records?name=$HOSTNAME" \
        -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN")
    
    if echo "$DNS_CHECK" | jq -e '.result | length > 0' > /dev/null; then
        echo "⚠️  DNS record already exists"
    else
        DNS_RESPONSE=$(curl -s -X POST \
            "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/dns_records" \
            -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
            -H "Content-Type: application/json" \
            -d "{\"type\":\"CNAME\",\"name\":\"$SUBDOMAIN\",\"content\":\"$CLOUDFLARE_TUNNEL_ID.cfargotunnel.com\",\"ttl\":1,\"proxied\":true}")
        
        if echo "$DNS_RESPONSE" | jq -e '.success' > /dev/null; then
            echo "✅ DNS record created!"
        else
            echo "⚠️  DNS record creation failed (might already exist)"
        fi
    fi
    
    echo ""
    echo "🌐 Hostname: https://$HOSTNAME"
    echo "🔗 Service: $SERVICE"
    echo ""
    echo "⏳ Wait 10-30 seconds for DNS propagation, then test:"
    echo "   curl https://$HOSTNAME"
else
    echo "❌ Failed to add route"
    echo "$RESPONSE" | jq -r '.errors[]?.message // .errors'
    exit 1
fi
