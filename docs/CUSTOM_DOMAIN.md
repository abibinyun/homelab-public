# Custom Domain Feature

## Overview

Users can use their own custom domains instead of only subdomains from `yourdomain.com`.

**Example:**
- Before: `myapp.yourdomain.com` (subdomain only)
- After: `myapp.com` or `app.myapp.com` (custom domain)

---

## Features

1. **Add Custom Domain** - Add any domain to a project
2. **DNS Verification** - Verify ownership via TXT record
3. **Domain Management** - List, verify, and delete domains
4. **Status Tracking** - Track verification and SSL status
5. **Multiple Domains** - Support multiple domains per project

---

## How It Works

### 1. Add Domain
```
User → Add domain (e.g., myapp.com)
System → Generate verification token
System → Create DNS verification record
```

### 2. Verify Ownership
```
User → Add TXT record to DNS:
  Name: _deployer-verify.myapp.com
  Value: [verification token]

User → Click "Verify"
System → Check DNS TXT record
System → Mark as verified if found
```

### 3. Activate Domain
```
System → Add to Cloudflare Tunnel
System → Issue SSL certificate
Domain → Active and accessible
```

---

## API Endpoints

### POST /api/domains
Add a custom domain to a project.

**Request:**
```json
{
  "projectId": 1,
  "domain": "myapp.com"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "domain": {
      "id": 1,
      "projectId": 1,
      "domain": "myapp.com",
      "verified": false,
      "status": "pending"
    },
    "verificationInstructions": {
      "recordType": "TXT",
      "name": "_deployer-verify.myapp.com",
      "value": "abc123..."
    }
  }
}
```

### POST /api/domains/:id/verify
Verify domain ownership.

**Response:**
```json
{
  "success": true,
  "data": {
    "verified": true
  }
}
```

### GET /api/domains/project/:projectId
Get all domains for a project.

### DELETE /api/domains/:id
Remove a custom domain.

---

## Database Schema

```sql
CREATE TABLE custom_domains (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  domain VARCHAR(255) NOT NULL UNIQUE,
  verification_token VARCHAR(255) NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMP,
  ssl_status VARCHAR(50) DEFAULT 'pending',
  cloudflare_dns_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## User Flow

### Step 1: Add Domain
1. Click "Add Custom Domain" in project settings
2. Enter the domain name (e.g., `myapp.com`)
3. Click "Add"

### Step 2: Verify Ownership
1. The system shows DNS verification instructions:
   ```
   Type: TXT
   Name: _deployer-verify.myapp.com
   Value: abc123def456...
   ```
2. Add the TXT record to your DNS provider
3. Wait for DNS propagation (up to 48 hours)
4. Click "Verify"

### Step 3: Domain Active
1. System verifies the TXT record exists
2. Marks domain as verified
3. Adds to Cloudflare Tunnel
4. Domain is now active

---

## DNS Verification

### How It Works
```
1. System generates a random token (64 chars hex)
2. User adds TXT record: _deployer-verify.domain.com = token
3. System queries DNS for the TXT record
4. If token matches → Verified ✅
5. If not found → Verification failed ❌
```

### DNS Propagation
- **Typical time**: 5–30 minutes
- **Maximum time**: 48 hours

### Troubleshooting
- **Record not found**: Wait longer for propagation
- **Wrong value**: Double-check the token matches exactly
- **Wrong name**: Must be `_deployer-verify.yourdomain.com`

---

## Security

- ✅ Format validation (valid domain syntax)
- ✅ Uniqueness check (no duplicate domains)
- ✅ Ownership verification (DNS TXT record)
- ✅ Protection against domain hijacking (requires DNS access)

---

## Files

### Backend
- `api/repositories/customDomain.repository.ts` - Database operations
- `api/services/dns.service.ts` - DNS verification
- `api/services/customDomain.service.ts` - Business logic
- `api/routes/customDomain.routes.ts` - API endpoints

### Frontend
- `src/components/CustomDomainModal.tsx` - UI component
