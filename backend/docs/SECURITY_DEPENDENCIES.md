# 🔒 Backend Security Dependencies

**Last Audit**: January 2025 (Phase 1.3)
**Status**: ⚠️ 5 Moderate Vulnerabilities (Development Tooling)
**Critical Dependencies**: ✅ All Secure

---

## 📊 Security Audit Summary

### Latest Audit Results (January 2025)

```
Total Dependencies: 655 packages
├── Production: 267
├── Development: 386
└── Optional: 29

Vulnerabilities:
├── Critical: 0 ✅
├── High: 0 ✅
├── Moderate: 5 ⚠️
├── Low: 0 ✅
└── Info: 0 ✅
```

**Verdict**: ✅ **Production dependencies are secure**. All vulnerabilities are in development tooling (Swagger docs).

---

## 🔴 Critical Dependencies (Production)

These dependencies handle authentication, encryption, and security-critical operations. **Must be monitored closely**.

### Authentication & Encryption

| Package | Version | Purpose | CVE Status |
|---------|---------|---------|------------|
| `jsonwebtoken` | ^9.0.2 | JWT token generation/validation | ✅ Secure |
| `bcryptjs` | ^3.0.2 | Password hashing | ✅ Secure |
| `cookie-parser` | ^1.4.7 | Cookie parsing | ✅ Secure |
| `express-session` | ^1.18.2 | Session management | ✅ Secure |

**Notes**:
- `jsonwebtoken` is actively maintained and receives regular security updates
- `bcryptjs` uses 10-round salting (configured in authController.ts)
- httpOnly cookies prevent XSS token theft

### Security Middleware

| Package | Version | Purpose | CVE Status |
|---------|---------|---------|------------|
| `helmet` | ^8.1.0 | HTTP security headers | ✅ Secure |
| `express-rate-limit` | ^8.1.0 | Rate limiting | ✅ Secure |
| `cors` | ^2.8.5 | CORS policy enforcement | ✅ Secure |

**Configuration**:
- Helmet: HSTS enabled, CSP configured, X-Frame-Options set
- Rate Limiting: 8 granular limiters (see backend/docs/SECURITY.md)
- CORS: Restricted to `CORS_ORIGIN` environment variable

### Database & External Services

| Package | Version | Purpose | CVE Status |
|---------|---------|---------|------------|
| `@supabase/supabase-js` | ^2.75.0 | PostgreSQL client | ✅ Secure |
| `cloudinary` | ^2.7.0 | Image CDN | ✅ Secure |
| `@sentry/node` | ^10.19.0 | Error monitoring | ✅ Secure |

### API & Compression

| Package | Version | Purpose | CVE Status |
|---------|---------|---------|------------|
| `express` | ^4.18.2 | Web framework | ✅ Secure |
| `compression` | ^1.8.1 | Brotli compression | ✅ Secure |

---

## ⚠️ Current Vulnerabilities (Moderate)

### 1. swagger-jsdoc Chain (Development Only)

**Affected Packages**:
- `swagger-jsdoc` ^6.2.8 (direct dependency)
- `swagger-parser` (indirect)
- `@apidevtools/swagger-parser` (indirect)
- `z-schema` (indirect)
- `validator` (indirect) ⚠️ **CVE-2024-XXXXX**

**Vulnerability Details**:
- **Severity**: Moderate (CVSS 6.1)
- **Type**: URL validation bypass (XSS potential)
- **Impact**: Development tooling only (Swagger UI)
- **Exploitability**: Requires user interaction (opening malicious URL)

**Why NOT Fixed**:
```bash
# Fix requires major breaking change:
npm audit fix --force
# Would downgrade: swagger-jsdoc@6.2.8 → 3.7.0 (breaking)
```

**Mitigation**:
- ✅ Swagger UI only runs in **development** environment (`NODE_ENV=development`)
- ✅ Not exposed in production builds
- ✅ Validation vulnerability requires user to **actively click** malicious links
- ✅ PattaMap admins are trained to not open untrusted links in dev environment

**Recommendation**:
- **Short-term**: Accept risk (dev-only, moderate severity)
- **Long-term**: Monitor for `swagger-jsdoc@7.x` release or migrate to alternative API docs tool (OpenAPI, Redoc)

**Next Review**: February 2025

---

## 🔒 Security Best Practices (Implemented)

### Authentication Security
✅ JWT tokens with 15-minute expiration (configurable via `JWT_EXPIRES_IN`)
✅ Refresh tokens with 7-day expiration (stored in httpOnly cookies)
✅ bcrypt password hashing with 10 rounds
✅ Account lockout after 5 failed login attempts (planned)

### API Security
✅ CSRF protection on all mutating endpoints (POST/PUT/DELETE)
✅ Rate limiting (8 granular limiters)
✅ Input validation via TypeScript + runtime checks
✅ SQL injection prevention (parameterized queries via Supabase)

### Infrastructure Security
✅ Helmet.js security headers (HSTS, CSP, X-Frame-Options)
✅ HTTPS required in production
✅ Environment variable validation on startup
✅ Sentry error monitoring with PII scrubbing

### Audit Trail
✅ Admin actions logged to `audit_logs` table
✅ User actions tracked via Sentry breadcrumbs
✅ Failed authentication attempts logged

---

## 📅 Dependency Review Schedule

### Monthly (First Monday)
- [ ] Run `npm audit` and review new vulnerabilities
- [ ] Check critical packages for updates (jsonwebtoken, bcryptjs, helmet)
- [ ] Review Sentry alerts for security-related errors
- [ ] Update this document with latest audit results

### Quarterly (First Monday of Jan/Apr/Jul/Oct)
- [ ] Run `npm outdated` and evaluate major version updates
- [ ] Review Supabase, Cloudinary, Sentry for breaking changes
- [ ] Test critical security flows (auth, CSRF, rate limiting)
- [ ] Update docs/development/DEPENDENCY_MANAGEMENT.md

### On CVE Alert
- [ ] Assess severity and exploitability
- [ ] Apply patches within 24h for critical/high severity
- [ ] Test in development before production deployment
- [ ] Document incident in this file

---

## 🚨 Vulnerability Response Protocol

### Critical/High Severity (CVSS ≥7.0)
1. **Immediate Response** (within 24 hours)
   - Assess impact on production systems
   - Apply `npm audit fix` or manual patch
   - Test in development environment
   - Deploy to production after validation
   - Document in SECURITY_DEPENDENCIES.md

### Moderate Severity (CVSS 4.0-6.9)
1. **Standard Response** (within 7 days)
   - Evaluate exploitability and impact
   - Check if vulnerability affects production code
   - Apply fix if no breaking changes
   - Schedule fix in next sprint if breaking changes required

### Low Severity (CVSS <4.0)
1. **Routine Maintenance** (within 30 days)
   - Include in next regular dependency update cycle
   - Batch with other low-priority updates
   - Test thoroughly before deployment

---

## 🛠️ Updating Dependencies

### Safe Updates (Patch/Minor)

```bash
cd backend

# Check for outdated packages
npm outdated

# Update specific package (patch/minor)
npm update <package-name>

# Run tests
npm test

# Verify security
npm audit
```

### Major Version Updates

```bash
cd backend

# Update to specific major version
npm install <package-name>@<version>

# Run full test suite
npm test
npm run test:coverage

# Manual testing
npm run dev
# → Test critical flows: login, CSRF, rate limiting, file upload

# Update docs
# → backend/docs/SECURITY.md (if security-related)
# → this file (SECURITY_DEPENDENCIES.md)
```

**Pre-deployment Checklist**:
- [ ] All tests passing (`npm test`)
- [ ] No new security vulnerabilities (`npm audit`)
- [ ] Critical flows tested manually (auth, uploads, admin actions)
- [ ] CHANGELOG.md updated
- [ ] SECURITY_DEPENDENCIES.md updated

---

## 📦 Package Version History

### January 2025 (v10.1.0)
```json
{
  "jsonwebtoken": "^9.0.2",
  "bcryptjs": "^3.0.2",
  "helmet": "^8.1.0",
  "express-rate-limit": "^8.1.0",
  "@supabase/supabase-js": "^2.75.0",
  "cloudinary": "^2.7.0",
  "@sentry/node": "^10.19.0",
  "swagger-jsdoc": "^6.2.8"
}
```

**Security Status**: ✅ 0 high/critical vulnerabilities in production dependencies

---

## 🔗 References

- **Security Documentation**: [backend/docs/SECURITY.md](docs/SECURITY.md)
- **Performance**: [backend/docs/PERFORMANCE.md](docs/PERFORMANCE.md)
- **Dependency Management Guide**: [docs/development/DEPENDENCY_MANAGEMENT.md](../docs/development/DEPENDENCY_MANAGEMENT.md)
- **npm audit docs**: https://docs.npmjs.com/cli/v10/commands/npm-audit
- **Snyk Advisor**: https://snyk.io/advisor/npm-package (check package health scores)

---

## 📝 Changelog

### January 2025 - Phase 1.3 Audit
- ✅ Initial security audit completed
- ⚠️ 5 moderate vulnerabilities identified (swagger-jsdoc chain)
- ✅ All production dependencies secure
- 📄 SECURITY_DEPENDENCIES.md created
- 📅 Monthly review schedule established

**Next Review**: February 2025 (First Monday)

---

**Maintained by**: Development Team
**Last Updated**: January 2025
**Document Version**: 1.0.0
