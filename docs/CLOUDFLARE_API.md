# Cloudflare API Automation

Otomatis create Cloudflare Tunnel public hostname via API, tidak perlu manual di dashboard.

## Setup

### 1. Dapatkan Cloudflare API Token

1. Login ke Cloudflare Dashboard
2. Buka: https://dash.cloudflare.com/profile/api-tokens
3. Klik **Create Token**
4. Pilih template **Edit Cloudflare Tunnel** atau buat custom dengan permissions:
   - Account → Cloudflare Tunnel → Edit
   - Zone → DNS → Edit
5. Klik **Continue to summary** → **Create Token**
6. Copy token yang muncul

### 2. Dapatkan IDs

**Account ID:**
1. Buka Cloudflare Dashboard
2. Klik domain kamu (yourdomain.com)
3. Scroll ke bawah di sidebar kanan
4. Copy **Account ID**

**Tunnel ID:**
1. Buka Networks → Tunnels
2. Klik tunnel kamu (homelab)
3. Copy ID dari URL: `https://one.dash.cloudflare.com/.../tunnels/[TUNNEL_ID]`

**Zone ID:**
1. Buka Cloudflare Dashboard
2. Klik domain kamu
3. Scroll ke bawah di sidebar kanan
4. Copy **Zone ID**

### 3. Update .env

```bash
nano .env
```

Tambahkan:
```bash
CLOUDFLARE_API_TOKEN=your_api_token_here
CLOUDFLARE_ACCOUNT_ID=your_account_id_here
CLOUDFLARE_TUNNEL_ID=f15a0196-b4ff-476b-a03a-8b2c594a0e60
CLOUDFLARE_ZONE_ID=your_zone_id_here
```

---

## Usage

### Manual Add Route

```bash
# Subdomain
./scripts/cloudflare-route.sh myapp.yourdomain.com

# Custom domain
./scripts/cloudflare-route.sh myapp.com

# Custom service (default: http://traefik:80)
./scripts/cloudflare-route.sh api.myapp.com http://traefik:80
```

### Integrated dengan Deploy Script

Setelah deploy, jalankan:
```bash
./scripts/deploy.sh
# Deploy project...

# Lalu otomatis add route
./scripts/cloudflare-route.sh myapp.yourdomain.com
```

---

## Fully Automated Deploy

Buat wrapper script untuk full automation:

**full-deploy.sh:**
```bash
#!/bin/bash

PROJECT_NAME=$1
SUBDOMAIN=$2
PROJECT_PATH=$3

if [ -z "$PROJECT_NAME" ] || [ -z "$SUBDOMAIN" ] || [ -z "$PROJECT_PATH" ]; then
    echo "Usage: ./scripts/full-deploy.sh <project-name> <subdomain> <project-path>"
    exit 1
fi

# 1. Deploy container
echo "🚀 Deploying container..."
echo -e "$PROJECT_NAME\n$SUBDOMAIN\n$PROJECT_PATH\n\ny" | ./scripts/deploy.sh

# 2. Wait for container to be ready
echo "⏳ Waiting for container..."
sleep 5

# 3. Auto-create Cloudflare route
echo "🌐 Creating Cloudflare route..."
source .env
./scripts/cloudflare-route.sh "$SUBDOMAIN.yourdomain.com"

echo ""
echo "✅ Full deployment complete!"
echo "🌐 Access: https://$SUBDOMAIN.yourdomain.com"
```

Usage:
```bash
chmod +x full-deploy.sh
./scripts/full-deploy.sh myapp myapp ./projects/myapp
```

**Zero manual steps!** 🚀

---

## Advanced: Terraform

Untuk infrastructure as code yang lebih robust:

**main.tf:**
```hcl
terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

variable "cloudflare_api_token" {
  type      = string
  sensitive = true
}

variable "account_id" {
  type = string
}

variable "tunnel_id" {
  type = string
}

variable "zone_id" {
  type = string
}

# Tunnel configuration
resource "cloudflare_tunnel_config" "homelab" {
  account_id = var.account_id
  tunnel_id  = var.tunnel_id

  config {
    # Whoami
    ingress_rule {
      hostname = "whoami.yourdomain.com"
      service  = "http://traefik:80"
    }

    # Traefik
    ingress_rule {
      hostname = "traefik.yourdomain.com"
      service  = "http://traefik:8080"
    }

    # Catch-all
    ingress_rule {
      service = "http_status:404"
    }
  }
}

# DNS records
resource "cloudflare_record" "whoami" {
  zone_id = var.zone_id
  name    = "whoami"
  value   = "${var.tunnel_id}.cfargotunnel.com"
  type    = "CNAME"
  proxied = true
}
```

Deploy:
```bash
terraform init
terraform plan
terraform apply
```

---

## Troubleshooting

### API Token tidak valid
```bash
# Test token
curl -X GET "https://api.cloudflare.com/client/v4/user/tokens/verify" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

### Hostname sudah ada
Script akan skip jika hostname sudah ada di tunnel config.

### DNS tidak resolve
Wait 1-2 menit untuk DNS propagation.

---

## Benefits

**Manual (sebelum):**
1. Deploy container
2. Buka Cloudflare Dashboard
3. Navigate ke Tunnels
4. Add public hostname
5. Fill form
6. Save

**Otomatis (sekarang):**
```bash
./scripts/cloudflare-route.sh myapp.yourdomain.com
```

**Hemat waktu 90%!** ⚡
