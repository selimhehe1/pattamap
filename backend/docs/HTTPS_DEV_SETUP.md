# HTTPS Development Setup Guide

## Overview

By default, PattaMap backend uses HTTP in development (`secure: false` cookies). This is a **security vulnerability** as cookies can be intercepted via Man-in-the-Middle (MITM) attacks on local networks.

**Recommended**: Use HTTPS even in development with self-signed certificates.

---

## Quick Setup (5 minutes)

### 1. Generate Self-Signed Certificate

```bash
cd backend

# Create certs directory
mkdir -p certs

# Generate private key and certificate (valid for 365 days)
openssl req -x509 -newkey rsa:4096 -keyout certs/localhost-key.pem -out certs/localhost-cert.pem -days 365 -nodes -subj "/CN=localhost"

# OR using mkcert (easier, auto-trusted)
# Install mkcert: https://github.com/FiloSottile/mkcert
mkcert -install
mkcert -key-file certs/localhost-key.pem -cert-file certs/localhost-cert.pem localhost 127.0.0.1 ::1
```

### 2. Update `.env`

```env
# Enable HTTPS in development
HTTPS_ENABLED=true
HTTPS_KEY_PATH=./certs/localhost-key.pem
HTTPS_CERT_PATH=./certs/localhost-cert.pem

# Force secure cookies even in development
COOKIES_SECURE=true
```

### 3. Start Server

```bash
npm run dev
```

Server will now run on `https://localhost:5001` instead of `http://localhost:5001`.

---

## Browser Trust Setup

### Option A: mkcert (Recommended - Auto-trusted)

```bash
# Install mkcert
brew install mkcert  # macOS
choco install mkcert # Windows
# OR download from: https://github.com/FiloSottile/mkcert/releases

# Install local CA
mkcert -install

# Generate cert (auto-trusted by system)
mkcert -key-file certs/localhost-key.pem -cert-file certs/localhost-cert.pem localhost 127.0.0.1 ::1
```

### Option B: Manual Trust (OpenSSL)

If using OpenSSL self-signed certs, browsers will show security warnings. You must manually trust the certificate:

**Chrome/Edge**:
1. Visit `https://localhost:5001`
2. Click "Advanced" → "Proceed to localhost (unsafe)"
3. OR: Settings → Privacy & Security → Manage Certificates → Import `localhost-cert.pem` to "Trusted Root Certification Authorities"

**Firefox**:
1. Visit `https://localhost:5001`
2. Click "Advanced" → "Accept the Risk and Continue"
3. OR: Settings → Privacy & Security → Certificates → View Certificates → Import

**Safari** (macOS):
1. Double-click `localhost-cert.pem`
2. Keychain Access opens → Add to "System" keychain
3. Right-click certificate → Get Info → Trust → "Always Trust"

---

## Frontend Configuration

Update frontend to use HTTPS endpoints:

```typescript
// src/config/api.ts
export const API_BASE_URL = process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === 'development'
    ? 'https://localhost:5001/api'  // Changed from http to https
    : 'https://api.pattaya.guide/api');
```

---

## Testing with Secure Cookies

### Curl

```bash
# Test with secure cookies
curl -k -X POST https://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"testuser","password":"password123"}' \
  --cookie-jar cookies.txt

# Verify cookie has Secure flag
cat cookies.txt
# Should show: #HttpOnly_localhost	FALSE	/	TRUE	...
#                                            ↑
#                                         Secure flag
```

### Postman

1. Settings → SSL Certificate Verification → OFF (for self-signed)
2. Use `https://localhost:5001` URLs
3. Cookies will automatically have `Secure` flag

---

## CI/CD Considerations

### GitHub Actions

CI tests run with HTTP (no certificates needed):

```yaml
# .github/workflows/test.yml
env:
  NODE_ENV: test
  COOKIES_SECURE: false  # Disable secure cookies in CI
```

### Docker

For Docker development with HTTPS:

```dockerfile
# Dockerfile.dev
FROM node:18
WORKDIR /app

# Copy certificates
COPY certs /app/certs

# Expose HTTPS port
EXPOSE 5001

CMD ["npm", "run", "dev"]
```

```yaml
# docker-compose.yml
services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    ports:
      - "5001:5001"
    environment:
      - HTTPS_ENABLED=true
      - HTTPS_KEY_PATH=./certs/localhost-key.pem
      - HTTPS_CERT_PATH=./certs/localhost-cert.pem
      - COOKIES_SECURE=true
    volumes:
      - ./backend/certs:/app/certs
```

---

## Troubleshooting

### "NET::ERR_CERT_AUTHORITY_INVALID"

**Cause**: Browser doesn't trust self-signed certificate.

**Solutions**:
1. Use `mkcert` (auto-trusted)
2. Manually trust certificate (see Browser Trust Setup)
3. Click "Advanced" → "Proceed" in browser (dev only!)

### "ENOENT: no such file or directory, open './certs/localhost-key.pem'"

**Cause**: Certificate files not generated.

**Solution**: Run certificate generation commands (Step 1).

### Frontend can't connect to backend

**Cause**: CORS or certificate issues.

**Solutions**:
1. Update frontend `API_BASE_URL` to HTTPS
2. Update CORS config in `server.ts`:
   ```typescript
   app.use(cors({
     origin: 'https://localhost:3000', // Frontend HTTPS URL
     credentials: true
   }));
   ```

### Tests failing with "certificate verification failed"

**Cause**: Test environment doesn't trust self-signed cert.

**Solution**: Disable cert verification in tests:

```typescript
// Jest setup
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // Disable for tests only!
```

---

## Production Deployment

**Production HTTPS** is handled by your hosting platform (Vercel, Railway, AWS, etc.).

**DO NOT**:
- Use self-signed certificates in production
- Commit `.pem` files to git (add to `.gitignore`)

**DO**:
- Use platform-provided SSL/TLS (free with Let's Encrypt)
- Set `COOKIES_SECURE=true` in production environment variables
- Verify HTTPS redirect is enabled

---

## Security Best Practices

### ✅ DO

- Use `mkcert` for local development (auto-trusted)
- Generate new certificates every 90 days
- Add `certs/` to `.gitignore`
- Use `HTTPS_ENABLED=true` in `.env`
- Set `COOKIES_SECURE=true` when HTTPS is enabled

### ❌ DON'T

- Commit private keys (`.pem`, `.key`) to git
- Use self-signed certs in production
- Disable certificate verification in production
- Share certificates between developers (generate per-machine)

---

## Alternative: Cloudflare Tunnel

For simpler HTTPS setup without certificates:

```bash
# Install cloudflared
brew install cloudflare/cloudflare/cloudflared

# Create tunnel to local backend
cloudflared tunnel --url http://localhost:5001

# Output: https://random-subdomain.trycloudflare.com
# Use this URL in frontend API_BASE_URL
```

**Pros**: No certificate management, public URL for testing
**Cons**: Requires internet, random URL changes on restart

---

## References

- [mkcert GitHub](https://github.com/FiloSottile/mkcert)
- [OpenSSL Documentation](https://www.openssl.org/docs/)
- [MDN: Secure Context](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts)
- [OWASP: Transport Layer Protection](https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Protection_Cheat_Sheet.html)

---

**Last Updated**: Phase 6 Stabilization Sprint - Day 1
**Maintainer**: Security Team
