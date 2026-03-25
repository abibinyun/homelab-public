#!/bin/bash

# Cloudflare Tunnel Route Removal
# Remove hostname from Cloudflare Tunnel and DNS

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
    exit 1
fi

# Get hostname from argument
HOSTNAME=$1

if [ -z "$HOSTNAME" ]; then
    echo "Usage: ./cloudflare-remove.sh <hostname>"
    echo ""
    echo "Example:"
    echo "  ./cloudflare-remove.sh deploy.${DOMAIN}"
    exit 1
fi

echo "🗑️  Removing Cloudflare configuration..."
echo "  Hostname: $HOSTNAME"
echo ""

# Remove DNS record
echo "📝 Removing DNS record..."
DNS_RECORD_ID=$(curl -s -X GET \
    "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/dns_records?name=$HOSTNAME" \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" | jq -r '.result[0].id // empty')

if [ -n "$DNS_RECORD_ID" ] && [ "$DNS_RECORD_ID" != "null" ]; then
    DNS_RESPONSE=$(curl -s -X DELETE \
        "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/dns_records/$DNS_RECORD_ID" \
        -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN")
    
    if echo "$DNS_RESPONSE" | jq -e '.success' > /dev/null; then
        echo "✅ DNS record removed"
    else
        echo "⚠️  Failed to remove DNS record"
    fi
else
    echo "⚠️  DNS record not found"
fi

# Remove tunnel route
echo "📤 Removing tunnel route..."
CURRENT_CONFIG=$(curl -s -X GET \
    "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/cfd_tunnel/$CLOUDFLARE_TUNNEL_ID/configurations" \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    -H "Content-Type: application/json")

INGRESS=$(echo "$CURRENT_CONFIG" | jq -r '.result.config.ingress')
UPDATED_INGRESS=$(echo "$INGRESS" | jq "del(.[] | select(.hostname == \"$HOSTNAME\"))")

RESPONSE=$(curl -s -X PUT \
    "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/cfd_tunnel/$CLOUDFLARE_TUNNEL_ID/configurations" \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"config\":{\"ingress\":$UPDATED_INGRESS}}")

if echo "$RESPONSE" | jq -e '.success' > /dev/null; then
    echo "✅ Tunnel route removed"
else
    echo "⚠️  Failed to remove tunnel route"
fi

echo ""
echo "✅ Cleanup complete!"
echo "   Hostname: $HOSTNAME"
