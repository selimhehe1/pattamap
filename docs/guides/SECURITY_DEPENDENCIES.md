# 🔒 Frontend Security Dependencies

**Last Audit**: January 2025 (Phase 1.3)
**Status**: ⚠️ 6 High + 3 Moderate Vulnerabilities (Development Tooling)
**Critical Dependencies**: ✅ All Production Dependencies Secure
**Build System**: ⚠️ Create React App (Deprecated - Migration Recommended)

---

## 📊 Security Audit Summary

### Latest Audit Results (January 2025)

```
Total Dependencies: 1,418 packages
├── Production: 1,394
├── Development: 21
└── Optional: 5

Vulnerabilities:
├── Critical: 0 ✅
├── High: 6 ⚠️ (Development tooling only)
├── Moderate: 3 ⚠️ (Development tooling only)
├── Low: 0 ✅
└── Info: 0 ✅
```

**Verdict**: ⚠️ **Production code is secure**, but **build system has known vulnerabilities**. All vulnerabilities are in Create React App's dependency tree (`react-scripts@5.0.1`), which is **no longer maintained**.

---

## 🔴 Critical Dependencies (Production Runtime)

These dependencies run in the **user's browser** and handle sensitive operations. **Must be monitored closely**.

### Core Framework

| Package | Version | Purpose | CVE Status |
|---------|---------|---------|------------|
| `react` | ^19.2.0 | UI framework | ✅ Secure |
| `react-dom` | ^19.2.0 | DOM renderer | ✅ Secure |
| `react-router-dom` | ^7.9.4 | Routing | ✅ Secure |

**Notes**:
- React 19 is the latest stable release with active security support
- Updated from React 18 in December 2024

### State Management & Data Fetching

| Package | Version | Purpose | CVE Status |
|---------|---------|---------|------------|
| `@tanstack/react-query` | ^5.90.2 | Server state management | ✅ Secure |
| `axios` | ^1.12.2 | HTTP client | ✅ Secure |

**Security Features**:
- React Query handles caching with stale-while-revalidate strategy
- Axios configured with CSRF token headers (see src/hooks/useSecureFetch.ts)

### Authentication & External Services

| Package | Version | Purpose | CVE Status |
|---------|---------|---------|------------|
| `@supabase/supabase-js` | ^2.75.0 | Database client | ✅ Secure |
| `@sentry/react` | ^10.19.0 | Error monitoring | ✅ Secure |

**Configuration**:
- Supabase: Row-Level Security (RLS) policies enabled
- Sentry: PII scrubbing enabled, 10% performance tracing

### UI & Animation

| Package | Version | Purpose | CVE Status |
|---------|---------|---------|------------|
| `framer-motion` | ^12.23.24 | Animations | ✅ Secure |
| `react-zoom-pan-pinch` | ^3.7.0 | Map interactions | ✅ Secure |
| `react-hot-toast` | ^2.6.0 | Notifications | ✅ Secure |

### Internationalization

| Package | Version | Purpose | CVE Status |
|---------|---------|---------|------------|
| `i18next` | ^25.6.0 | i18n framework | ✅ Secure |
| `react-i18next` | ^16.0.0 | React integration | ✅ Secure |
| `i18next-browser-languagedetector` | ^8.2.0 | Language detection | ✅ Secure |

---

## ⚠️ Current Vulnerabilities (Development Tooling)

### 🚨 Critical Issue: Create React App Deprecated

**Status**: ⚠️ **react-scripts@5.0.1 is no longer maintained**

The React team [announced in 2023](https://github.com/facebook/create-react-app/issues/13072) that Create React App is **deprecated** and will no longer receive updates. This has led to accumulating security vulnerabilities in its dependency tree.

### Vulnerability Breakdown

All 9 vulnerabilities are in the **build toolchain** (webpack, webpack-dev-server, CSS processors). They do **NOT affect production builds** but pose risks during development.

#### 1. nth-check (High Severity - CVSS 7.5)

**Affected Package**: `nth-check` <2.0.1 (via svgo → css-select)
**Vulnerability**: [GHSA-rp65-9cf3-cjxr](https://github.com/advisories/GHSA-rp65-9cf3-cjxr)
**Type**: ReDoS (Regular Expression Denial of Service)
**Impact**: Development builds only (CSS optimization)
**Exploitability**: Requires processing malicious CSS

**Mitigation**:
- ✅ Does NOT affect production builds (CSS is pre-compiled)
- ✅ Developers should not process untrusted CSS files

#### 2. webpack-dev-server (Moderate Severity - CVSS 6.5 & 5.3)

**Affected Package**: `webpack-dev-server` ≤5.2.0
**Vulnerabilities**:
- [GHSA-9jgg-88mc-972h](https://github.com/advisories/GHSA-9jgg-88mc-972h) - Source code theft via malicious site
- [GHSA-4v9v-hfq4-rm2v](https://github.com/advisories/GHSA-4v9v-hfq4-rm2v) - CORS bypass

**Type**: Development server vulnerabilities
**Impact**: Local development environment only
**Exploitability**: Requires developer to visit malicious website while dev server is running

**Mitigation**:
- ✅ Dev server only runs on `localhost:3000` (not exposed to internet)
- ✅ Production builds use static hosting (no webpack-dev-server)
- ⚠️ Developers should avoid untrusted websites while dev server is active

#### 3. PostCSS (Moderate Severity - CVSS 5.3)

**Affected Package**: `postcss` <8.4.31
**Vulnerability**: [GHSA-7fh5-64p2-3v2j](https://github.com/advisories/GHSA-7fh5-64p2-3v2j)
**Type**: Line return parsing error
**Impact**: Build process only
**Exploitability**: Low (requires malicious CSS input)

**Mitigation**:
- ✅ PostCSS processes trusted source files only
- ✅ No user-supplied CSS processed during build

#### 4. svgo Chain (High Severity)

**Affected Packages**:
- `svgo` 1.0.0 - 1.3.2
- `@svgr/plugin-svgo` ≤5.5.0
- `@svgr/webpack` 4.0.0 - 5.5.0

**Impact**: SVG optimization during build
**Exploitability**: Requires malicious SVG files in source code

**Mitigation**:
- ✅ All SVG files are trusted (version-controlled source)
- ✅ No user-uploaded SVGs processed during build

### Why NOT Fixed Automatically

```bash
npm audit fix --force
# Would attempt to fix react-scripts but:
# → react-scripts is UNMAINTAINED (no updates available)
# → npm suggests downgrading to react-scripts@0.0.0 (non-existent version)
# → Breaking changes would occur without solving vulnerabilities
```

---

## 🔄 Migration Path: Vite (Recommended)

### Why Migrate from Create React App?

**Problems with CRA**:
- ⚠️ No longer maintained (deprecated 2023)
- ⚠️ Accumulating security vulnerabilities
- ⚠️ Slow build times (Webpack)
- ⚠️ Large dependency tree (1,418 packages)
- ⚠️ No built-in support for modern features (React Server Components)

**Benefits of Vite**:
- ✅ **10x faster** dev server (esbuild-based)
- ✅ **Actively maintained** (60k+ stars, weekly updates)
- ✅ **Secure** (modern, maintained dependencies)
- ✅ **Smaller bundle** (~1/3 of dependencies)
- ✅ **Better DX** (instant HMR, built-in TypeScript)
- ✅ **React 19 optimized** (concurrent features, automatic batching)

### Migration Estimate

**Effort**: 2-3 days
**Complexity**: Medium (straightforward, mostly config changes)
**Risk**: Low (well-documented migration path)

**Steps**:
1. Install Vite + plugins (`@vitejs/plugin-react`, `vite-tsconfig-paths`)
2. Create `vite.config.ts` (replace `webpack.config.js`)
3. Update `index.html` (move to root, add `<script type="module">`)
4. Update `package.json` scripts
5. Migrate environment variables (`REACT_APP_*` → `VITE_*`)
6. Test all features (especially Sentry, React Query, i18n)

**Resources**:
- [Vite Migration Guide](https://vitejs.dev/guide/migration-from-cra)
- [PattaMap Migration Plan](../docs/features/ROADMAP.md#phase-4-technical-debt) (future)

### Timeline

**Phase 4 (Technical Debt)** - Estimated Q2 2025:
- Week 1: Vite setup + basic migration
- Week 2: Test all features + fix edge cases
- Week 3: Performance optimization + bundle analysis
- Week 4: Deploy to production

---

## 🔒 Security Best Practices (Implemented)

### Client-Side Security
✅ CSRF tokens fetched on app load and included in all mutations
✅ httpOnly cookies for JWT storage (XSS-proof)
✅ React Router guards for protected routes (`ProtectedRoute.tsx`)
✅ Input sanitization on all forms (via React controlled components)

### Third-Party Integrations
✅ Sentry PII scrubbing configured (`beforeSend` hook)
✅ Supabase RLS policies enforced on all tables
✅ Cloudinary transformations validated (prevent injection)
✅ Google Analytics anonymized IP tracking

### Build Security
✅ Environment variable validation at build time
✅ No secrets in frontend code (all sensitive data in backend)
✅ CSP headers configured (Helmet.js in backend)
✅ Subresource Integrity (SRI) for CDN resources (planned)

---

## 📅 Dependency Review Schedule

### Monthly (First Monday)
- [ ] Run `npm audit` and review new vulnerabilities
- [ ] Check critical packages for updates (React, React Router, Sentry)
- [ ] Review Sentry alerts for security-related errors
- [ ] Update this document with latest audit results

### Quarterly (First Monday of Jan/Apr/Jul/Oct)
- [ ] Run `npm outdated` and evaluate major version updates
- [ ] Review Supabase, Sentry for breaking changes
- [ ] Test critical security flows (auth, CSRF, protected routes)
- [ ] Update docs/development/DEPENDENCY_MANAGEMENT.md

### On CVE Alert
- [ ] Assess severity and exploitability
- [ ] Determine if vulnerability affects production builds
- [ ] Apply patches within 24h for critical/high severity in **runtime dependencies**
- [ ] Schedule dev tooling updates for next sprint
- [ ] Document incident in this file

---

## 🚨 Vulnerability Response Protocol

### Runtime Dependencies (React, Axios, Supabase, etc.)

**Critical/High Severity (CVSS ≥7.0)**:
1. **Immediate Response** (within 24 hours)
   - Assess impact on production application
   - Apply `npm update <package>` or manual patch
   - Test in development environment
   - Run full test suite (`npm test`)
   - Deploy to production after validation
   - Document in SECURITY_DEPENDENCIES.md

**Moderate Severity (CVSS 4.0-6.9)**:
1. **Standard Response** (within 7 days)
   - Evaluate exploitability and user impact
   - Check if vulnerability is exploitable in PattaMap's usage
   - Apply fix if no breaking changes
   - Schedule fix in next sprint if breaking changes required

### Build Tooling (react-scripts, webpack, etc.)

**High Severity**:
1. **Evaluated Response** (within 14 days)
   - Determine if vulnerability affects production builds
   - If production-affecting: follow runtime protocol above
   - If dev-only: assess developer risk (malicious sites, files)
   - Implement workarounds (e.g., avoid untrusted files)
   - **Long-term**: Schedule Vite migration (Q2 2025)

**Moderate/Low Severity**:
1. **Routine Maintenance**
   - Document in this file
   - Include in Vite migration (eliminates all CRA vulnerabilities)

---

## 🛠️ Updating Dependencies

### Safe Updates (Patch/Minor)

```bash
# Check for outdated packages
npm outdated

# Update specific package (patch/minor)
npm update <package-name>

# Run tests
npm test

# Verify build
npm run build

# Verify security
npm audit
```

### Major Version Updates

```bash
# Update to specific major version
npm install <package-name>@<version>

# Run full test suite
npm test

# Manual testing
npm start
# → Test critical flows: login, map interactions, image uploads

# Build production bundle
npm run build

# Analyze bundle size
npm run analyze

# Update docs
# → SECURITY_DEPENDENCIES.md
# → CHANGELOG.md
```

**Pre-deployment Checklist**:
- [ ] All tests passing (`npm test`)
- [ ] Production build successful (`npm run build`)
- [ ] Bundle size acceptable (<500 KB gzipped)
- [ ] Critical flows tested manually
- [ ] No new security vulnerabilities in runtime deps
- [ ] CHANGELOG.md updated

---

## 📦 Package Version History

### January 2025 (v10.1.0)
```json
{
  "react": "^19.2.0",
  "react-dom": "^19.2.0",
  "react-router-dom": "^7.9.4",
  "@tanstack/react-query": "^5.90.2",
  "axios": "^1.12.2",
  "@supabase/supabase-js": "^2.75.0",
  "@sentry/react": "^10.19.0",
  "framer-motion": "^12.23.24",
  "i18next": "^25.6.0",
  "react-scripts": "5.0.1"
}
```

**Security Status**:
- ✅ 0 critical/high vulnerabilities in **runtime dependencies**
- ⚠️ 6 high + 3 moderate in **build tooling** (CRA deprecation)

---

## 🔗 References

- **Migration Guide**: [docs/features/ROADMAP.md](docs/features/ROADMAP.md#phase-4-technical-debt)
- **Dependency Management**: [docs/development/DEPENDENCY_MANAGEMENT.md](docs/development/DEPENDENCY_MANAGEMENT.md)
- **CRA Deprecation**: https://github.com/facebook/create-react-app/issues/13072
- **Vite Migration**: https://vitejs.dev/guide/migration-from-cra
- **npm audit docs**: https://docs.npmjs.com/cli/v10/commands/npm-audit

---

## 📝 Changelog

### January 2025 - Phase 1.3 Audit
- ✅ Initial security audit completed
- ⚠️ 9 vulnerabilities identified (all in react-scripts chain)
- ✅ All runtime dependencies secure
- 📄 SECURITY_DEPENDENCIES.md created
- 📅 Monthly review schedule established
- 🔄 Vite migration recommended for Q2 2025

**Next Review**: February 2025 (First Monday)

---

**Maintained by**: Development Team
**Last Updated**: January 2025
**Document Version**: 1.0.0
