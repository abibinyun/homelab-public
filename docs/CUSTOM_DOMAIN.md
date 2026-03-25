# 🌐 Custom Domain Feature - Documentation

## Overview

Users can now use their own custom domains instead of only subdomains from `yourdomain.com`.

**Example:**
- Before: `myapp.yourdomain.com` (subdomain only)
- After: `myapp.com` or `app.myapp.com` (custom domain)

---

## Features

### ✅ Implemented
1. **Add Custom Domain** - User can add any domain
2. **DNS Verification** - Verify ownership via TXT record
3. **Domain Management** - List, verify, delete domains
4. **Status Tracking** - Track verification and SSL status
5. **Multiple Domains** - Support multiple domains per project

### 🚧 TODO (Phase 2)
- Cloudflare Tunnel integration (auto-add domain)
- Auto SSL certificate provisioning
- CNAME/A record validation
- Domain health monitoring

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
System → Add to Cloudflare Tunnel (TODO)
System → Issue SSL certificate (TODO)
Domain → Active and accessible
```

---

## API Endpoints

### POST /api/domains
Add custom domain to project

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
      "status": "pending",
      ...
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
Verify domain ownership

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
Get all domains for a project

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "domain": "myapp.com",
      "verified": true,
      "sslStatus": "active",
      ...
    }
  ]
}
```

### GET /api/domains/:id/status
Check domain status

**Response:**
```json
{
  "success": true,
  "data": {
    "verified": true,
    "dnsRecords": {
      "a": ["1.2.3.4"],
      "txt": [["verification-token"]]
    },
    "sslStatus": "active"
  }
}
```

### DELETE /api/domains/:id
Remove custom domain

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

**Indexes:**
- `project_id` - Fast lookup by project
- `domain` - Unique constraint + fast lookup
- `verified` - Filter verified domains
- `status` - Filter by status

---

## Frontend Usage

### Open Custom Domain Modal
```tsx
import CustomDomainModal from '@/components/CustomDomainModal';

<CustomDomainModal
  projectId={project.id}
  projectName={project.name}
  onClose={() => setShowModal(false)}
/>
```

### Features in Modal
- ✅ Add new domain
- ✅ View verification instructions
- ✅ Copy DNS records to clipboard
- ✅ Verify domain ownership
- ✅ View all domains with status
- ✅ Delete domain

---

## User Flow

### Step 1: Add Domain
1. User clicks "Add Custom Domain" in project settings
2. Enter domain name (e.g., `myapp.com`)
3. Click "Add"

### Step 2: Verify Ownership
1. System shows DNS verification instructions:
   ```
   Type: TXT
   Name: _deployer-verify.myapp.com
   Value: abc123def456...
   ```
2. User adds TXT record to their DNS provider
3. Wait for DNS propagation (up to 48 hours)
4. Click "Verify" button

### Step 3: Domain Active
1. System verifies TXT record exists
2. Marks domain as verified
3. (TODO) Adds to Cloudflare Tunnel
4. (TODO) Issues SSL certificate
5. Domain is now active!

---

## DNS Verification

### How It Works
```
1. System generates random token (64 chars hex)
2. User adds TXT record: _deployer-verify.domain.com = token
3. System queries DNS for TXT record
4. If token matches → Verified ✅
5. If not found → Verification failed ❌
```

### DNS Propagation
- **Typical time**: 5-30 minutes
- **Maximum time**: 48 hours
- **Check status**: Use online DNS checkers

### Troubleshooting
- **Record not found**: Wait longer for propagation
- **Wrong value**: Double-check token matches exactly
- **Wrong name**: Must be `_deployer-verify.yourdomain.com`

---

## Security

### Domain Validation
- ✅ Format validation (valid domain syntax)
- ✅ Uniqueness check (no duplicate domains)
- ✅ Ownership verification (DNS TXT record)

### Protection Against
- ✅ Domain hijacking (requires DNS access)
- ✅ Duplicate domains (unique constraint)
- ✅ Invalid domains (format validation)

---

## Limitations (Current)

1. **Manual Cloudflare Setup** - Admin must manually add domain to Cloudflare Tunnel
2. **No Auto SSL** - SSL must be configured manually
3. **No CNAME Validation** - Only TXT record verification
4. **No Health Monitoring** - No automatic domain health checks

---

## Phase 2 Enhancements

### Cloudflare Integration
```typescript
// Auto-add domain to Cloudflare Tunnel
await cloudflareService.addPublicHostname({
  domain: 'myapp.com',
  service: 'http://traefik:80'
});

// Auto-issue SSL certificate
await cloudflareService.provisionSSL('myapp.com');
```

### Advanced Verification
- CNAME record verification
- A record validation
- Multiple verification methods

### Monitoring
- Domain health checks
- SSL expiry alerts
- DNS change detection

---

## Testing

### Manual Test Flow
1. Add domain: `test.example.com`
2. Get verification token
3. Add TXT record to DNS
4. Verify domain
5. Check status
6. Delete domain

### API Test
```bash
# Add domain
curl -X POST http://localhost:3000/api/domains \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"projectId": 1, "domain": "test.example.com"}'

# Verify domain
curl -X POST http://localhost:3000/api/domains/1/verify \
  -H "Authorization: Bearer $TOKEN"

# Get domains
curl http://localhost:3000/api/domains/project/1 \
  -H "Authorization: Bearer $TOKEN"

# Delete domain
curl -X DELETE http://localhost:3000/api/domains/1 \
  -H "Authorization: Bearer $TOKEN"
```

---

## Files Added/Modified

### Backend
- `api/types/index.ts` - CustomDomain interface
- `api/db/migrations.ts` - custom_domains table
- `api/repositories/customDomain.repository.ts` - Database operations
- `api/services/dns.service.ts` - DNS verification
- `api/services/customDomain.service.ts` - Business logic
- `api/routes/customDomain.routes.ts` - API endpoints
- `api/server.ts` - Register routes

### Frontend
- `src/types/index.ts` - CustomDomain types
- `src/lib/api.ts` - API client methods
- `src/components/CustomDomainModal.tsx` - UI component

---

## Status

✅ **Phase 1 Complete** - Core functionality working
- Add domain ✅
- DNS verification ✅
- Domain management ✅
- Status tracking ✅

🚧 **Phase 2 Pending** - Cloudflare integration
- Auto-add to Cloudflare Tunnel
- Auto SSL provisioning
- Advanced monitoring

---

## Next Steps

1. **Test with real domain** - Verify DNS verification works
2. **Cloudflare API integration** - Auto-add domains
3. **SSL automation** - Auto-provision certificates
4. **UI integration** - Add button to ProjectCard
5. **Documentation** - User guide for custom domains

**Ready for testing!** 🚀
