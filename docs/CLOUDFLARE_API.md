# Cloudflare API Automation

Automatically create Cloudflare Tunnel public hostnames via API — no manual dashboard steps needed.

## Setup

### 1. Get a Cloudflare API Token

1. Log in to the Cloudflare Dashboard
2. Go to: https://dash.cloudflare.com/profile/api-tokens
3. Click **Create Token**
4. Select the **Edit Cloudflare Tunnel** template, or create a custom token with:
   - Account → Cloudflare Tunnel → Edit
   - Zone → DNS → Edit
5. Click **Continue to summary** → **Create Token**
6. Copy the token

### 2. Get Your IDs

**Account ID:**
1. Open the Cloudflare Dashboard
2. Click your domain (yourdomain.com)
3. Scroll down in the right sidebar
4. Copy the **Account ID**

**Tunnel ID:**
1. Go to Networks → Tunnels
2. Click your tunnel (homelab)
3. Copy the ID from the URL: `https://one.dash.cloudflare.com/.../tunnels/[TUNNEL_ID]`

**Zone ID:**
1. Open the Cloudflare Dashboard
2. Click your domain
3. Scroll down in the right sidebar
4. Copy the **Zone ID**

### 3. Update `.env`

```bash
nano .env
```

Add:
```bash
CLOUDFLARE_API_TOKEN=your_api_token_here
CLOUDFLARE_ACCOUNT_ID=your_account_id_here
CLOUDFLARE_TUNNEL_ID=f15a0196-b4ff-476b-a03a-8b2c594a0e60
CLOUDFLARE_ZONE_ID=your_zone_id_here
```

---

## Usage

### Add a Route Manually

```bash
# Subdomain
./scripts/cloudflare-route.sh myapp.yourdomain.com

# Custom domain
./scripts/cloudflare-route.sh myapp.com

# Custom service (default: http://traefik:80)
./scripts/cloudflare-route.sh api.myapp.com http://traefik:80
```

### Integrated with Deploy Script

After deploying, run:
```bash
./scripts/deploy.sh
# Deploy project...

# Then automatically add route
./scripts/cloudflare-route.sh myapp.yourdomain.com
```

---

## Fully Automated Deploy

Use `full-deploy.sh` for a single command that deploys and routes:

```bash
./scripts/full-deploy.sh <project-name> <subdomain> <project-path> [port]
# Example:
./scripts/full-deploy.sh myapp myapp ./projects/myapp 3000
```

---

## Advanced: Terraform

For more robust infrastructure as code:

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
    ingress_rule {
      hostname = "whoami.yourdomain.com"
      service  = "http://traefik:80"
    }

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

### API token invalid
```bash
# Test token
curl -X GET "https://api.cloudflare.com/client/v4/user/tokens/verify" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

### Hostname already exists
The script will skip if the hostname already exists in the tunnel config.

### DNS not resolving
Wait 1–2 minutes for DNS propagation.

---

## Before vs After

**Manual (before):**
1. Deploy container
2. Open Cloudflare Dashboard
3. Navigate to Tunnels
4. Add public hostname
5. Fill in the form
6. Save

**Automated (now):**
```bash
./scripts/cloudflare-route.sh myapp.yourdomain.com
```

**90% time saved!** ⚡
