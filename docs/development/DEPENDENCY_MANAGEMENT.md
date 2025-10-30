# 📦 Dependency Management Guide

**Version**: 1.0.0
**Last Updated**: January 2025 (Phase 1.3)
**Audience**: Developers, DevOps, Security Team

This document provides comprehensive guidelines for managing npm dependencies across PattaMap's frontend and backend codebases.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Critical Dependencies](#critical-dependencies)
3. [Security Audit Process](#security-audit-process)
4. [Update Workflows](#update-workflows)
5. [Vulnerability Response](#vulnerability-response)
6. [Review Schedule](#review-schedule)
7. [Best Practices](#best-practices)
8. [Tooling](#tooling)

---

## 🎯 Overview

### Dependency Statistics (January 2025)

**Backend**:
- Total: 655 packages (267 prod, 386 dev, 29 optional)
- Vulnerabilities: 5 moderate (dev tooling only)
- Status: ✅ **Production Secure**

**Frontend**:
- Total: 1,418 packages (1,394 prod, 21 dev, 5 optional)
- Vulnerabilities: 6 high + 3 moderate (build tooling only)
- Status: ⚠️ **Runtime Secure, Build System Deprecated**

### Security Posture

✅ **Strengths**:
- All critical security packages up-to-date (JWT, bcrypt, helmet)
- Zero vulnerabilities in runtime dependencies
- Automated audit process established

⚠️ **Risks**:
- Frontend build system (Create React App) deprecated
- Backend swagger-jsdoc chain has moderate vulnerabilities
- Large dependency tree (2,073 total packages)

🔄 **Mitigation Plan**:
- Q2 2025: Migrate frontend to Vite (eliminates CRA vulnerabilities)
- Q1 2025: Monitor swagger-jsdoc v7 release
- Ongoing: Monthly security audits

---

## 🔴 Critical Dependencies

These packages handle **authentication, encryption, data integrity, and security-critical operations**. They require immediate attention when vulnerabilities are discovered.

### Backend Critical Packages

| Package | Current Version | Purpose | Update Frequency |
|---------|----------------|---------|------------------|
| `jsonwebtoken` | ^9.0.2 | JWT auth | Monthly check |
| `bcryptjs` | ^3.0.2 | Password hashing | Monthly check |
| `helmet` | ^8.1.0 | Security headers | Monthly check |
| `express-rate-limit` | ^8.1.0 | Rate limiting | Monthly check |
| `@supabase/supabase-js` | ^2.75.0 | Database client | Monthly check |
| `cloudinary` | ^2.7.0 | Image CDN | Quarterly check |
| `@sentry/node` | ^10.19.0 | Error monitoring | Quarterly check |
| `express` | ^4.18.2 | Web framework | Quarterly check |
| `cors` | ^2.8.5 | CORS policy | Quarterly check |

### Frontend Critical Packages

| Package | Current Version | Purpose | Update Frequency |
|---------|----------------|---------|------------------|
| `react` | ^19.2.0 | UI framework | Monthly check |
| `react-dom` | ^19.2.0 | DOM renderer | Monthly check |
| `react-router-dom` | ^7.9.4 | Routing | Monthly check |
| `@tanstack/react-query` | ^5.90.2 | State management | Monthly check |
| `axios` | ^1.12.2 | HTTP client | Monthly check |
| `@supabase/supabase-js` | ^2.75.0 | Database client | Monthly check |
| `@sentry/react` | ^10.19.0 | Error monitoring | Quarterly check |
| `framer-motion` | ^12.23.24 | Animations | Quarterly check |
| `i18next` | ^25.6.0 | i18n framework | Quarterly check |

### Non-Critical (Development/Tooling)

| Package | Current Version | Purpose | Update Frequency |
|---------|----------------|---------|------------------|
| `react-scripts` | 5.0.1 | Build system | **DEPRECATED** - Migrate to Vite Q2 2025 |
| `swagger-jsdoc` | ^6.2.8 | API docs | Check for v7+ quarterly |
| `jest` | ^30.2.0 | Testing | Quarterly check |
| `typescript` | ^5.9.3 | Type checking | Quarterly check |
| `nodemon` | ^3.1.10 | Dev server | As-needed |

---

## 🔒 Security Audit Process

### Monthly Audit (First Monday of Every Month)

**Time Required**: ~30 minutes

```bash
# 1. Backend Audit
cd backend
npm audit

# Review output:
# - 0 high/critical? ✅ Good
# - Moderate in prod deps? ⚠️ Investigate
# - Moderate in dev deps? 📝 Document, schedule fix

# 2. Frontend Audit
cd ..
npm audit

# Review output:
# - High/critical in runtime deps? 🚨 Immediate action
# - High in build tooling (CRA)? 📝 Expected, document

# 3. Update SECURITY_DEPENDENCIES.md files
# - backend/SECURITY_DEPENDENCIES.md
# - SECURITY_DEPENDENCIES.md (frontend)

# 4. Check Critical Packages
npm outdated | grep -E "(react|jsonwebtoken|bcryptjs|helmet|axios)"

# 5. Update this document's review log (bottom of file)
```

**Deliverables**:
- Updated vulnerability counts in SECURITY_DEPENDENCIES.md files
- Decision log for each new vulnerability (fix/defer/monitor)
- Next review date scheduled

### Quarterly Deep Audit (First Monday of Jan/Apr/Jul/Oct)

**Time Required**: ~2 hours

```bash
# 1. Full dependency analysis
cd backend
npm outdated > outdated-backend.txt
cd ..
npm outdated > outdated-frontend.txt

# 2. Identify major version updates
# Look for packages with "red" major versions available

# 3. Assess breaking changes
# For each major update candidate:
# - Read CHANGELOG.md in package repository
# - Assess migration effort
# - Check for TypeScript compatibility

# 4. Plan updates
# Prioritize:
# 1. Security-critical packages (JWT, bcrypt, helmet)
# 2. Packages with known vulnerabilities
# 3. Actively maintained packages
# 4. Low-risk updates

# 5. Create update branch
git checkout -b quarterly-deps-update-2025-Q1

# 6. Update packages one-by-one
# Test after each update!

# 7. Full test suite
cd backend && npm test
cd .. && npm test

# 8. Manual testing
npm start
cd backend && npm run dev
# → Test critical flows: auth, uploads, CSRF, rate limiting

# 9. Document changes
# Update CHANGELOG.md, SECURITY_DEPENDENCIES.md
```

**Deliverables**:
- Quarterly dependency update report
- Updated packages with test results
- Migration plan for major version bumps
- Updated documentation

---

## 🔄 Update Workflows

### Workflow 1: Patch/Minor Updates (Low Risk)

**When to Use**: Security patches, bug fixes, minor features

**Example**: `axios@1.12.2` → `axios@1.12.5`

```bash
# 1. Check what would be updated
npm outdated <package-name>

# 2. Update package
cd backend  # or stay in root for frontend
npm update <package-name>

# 3. Verify no breaking changes
git diff package.json package-lock.json

# 4. Run tests
npm test

# 5. Test manually (if security-related)
npm start  # or npm run dev for backend

# 6. Commit
git add package.json package-lock.json
git commit -m "chore(deps): update <package-name> to vX.Y.Z

Security patch for [brief description]
No breaking changes.

Tested:
- [x] All tests passing
- [x] Manual testing completed"

# 7. Push and deploy
git push origin main
```

### Workflow 2: Major Version Updates (High Risk)

**When to Use**: New features, breaking API changes

**Example**: `react@18.2.0` → `react@19.2.0`

```bash
# 1. Research breaking changes
# → Read migration guide (e.g., https://react.dev/blog/2024/12/05/react-19)
# → Check community discussions (GitHub issues, Reddit)

# 2. Create feature branch
git checkout -b feat/upgrade-react-19

# 3. Install new version
npm install react@19.2.0 react-dom@19.2.0

# 4. Fix TypeScript errors
npm run build
# → Address type errors one-by-one

# 5. Update code for breaking changes
# → Replace deprecated APIs
# → Update patterns (e.g., new hooks)

# 6. Run full test suite
npm test
npm run test:coverage

# 7. Extensive manual testing
npm start
# → Test ALL critical flows
# → Test on multiple browsers
# → Test mobile responsive

# 8. Performance testing
npm run build
npm run analyze
# → Compare bundle size before/after
# → Check Lighthouse scores

# 9. Update documentation
# → CHANGELOG.md
# → SECURITY_DEPENDENCIES.md
# → Migration notes in PR description

# 10. Create PR for review
git add .
git commit -m "feat: upgrade React to v19

BREAKING CHANGES:
- [List breaking changes]

Migration steps:
- [List changes made]

Performance impact:
- Bundle size: [before] → [after]
- Lighthouse: [before] → [after]

Testing:
- [x] All tests passing (150/150)
- [x] Manual testing completed
- [x] Cross-browser tested (Chrome, Firefox, Safari)
- [x] Mobile tested (iOS, Android)"

git push origin feat/upgrade-react-19
```

### Workflow 3: Vulnerability Response (Emergency)

**When to Use**: High/Critical CVE in production dependency

**Example**: Critical vulnerability in `jsonwebtoken`

```bash
# 1. Assess severity (within 1 hour of discovery)
npm audit
# → Read CVE details
# → Check if PattaMap is affected (usage patterns)
# → Determine exploitability

# 2. Immediate mitigation (if exploitable)
# Option A: Update package
cd backend
npm update jsonwebtoken
npm test

# Option B: Workaround (if update unavailable)
# → Implement input validation
# → Add rate limiting
# → Disable vulnerable feature temporarily

# 3. Fast-track testing (within 4 hours)
npm test
npm run test:coverage
# → Manual auth flow testing
# → Verify JWT generation/validation

# 4. Deploy urgently
git add package.json package-lock.json
git commit -m "security: patch jsonwebtoken CVE-XXXX-YYYY

CRITICAL: Patch high-severity vulnerability in JWT validation.
CVE Details: [link]

Changes:
- Updated jsonwebtoken ^9.0.2 → ^9.0.3
- No breaking changes
- All tests passing

Tested:
- [x] Unit tests (33/33)
- [x] Login flow
- [x] Token refresh
- [x] Protected routes"

git push origin main
# → Deploy to production immediately

# 5. Post-incident
# → Update SECURITY_DEPENDENCIES.md
# → Add to vulnerability response log
# → Notify team in Slack/email
```

---

## 🚨 Vulnerability Response Protocol

### Severity Classification

| Severity | CVSS Score | Response Time | Action |
|----------|-----------|---------------|--------|
| **Critical** | 9.0-10.0 | ≤4 hours | Immediate patch + deploy |
| **High** | 7.0-8.9 | ≤24 hours | Priority patch + test + deploy |
| **Moderate** | 4.0-6.9 | ≤7 days | Evaluate → Schedule fix |
| **Low** | 0.1-3.9 | ≤30 days | Batch with routine updates |

### Decision Matrix

**Question 1**: Does the vulnerability affect **production runtime** code?
- ✅ Yes (e.g., axios, react, jsonwebtoken) → **Follow severity protocol**
- ❌ No (e.g., webpack-dev-server, jest) → **Defer to next quarterly update**

**Question 2**: Is the vulnerability **exploitable** in PattaMap's usage?
- ✅ Yes → **Follow severity protocol**
- ❌ No (e.g., requires user to process malicious files) → **Document + defer**

**Question 3**: Is a **non-breaking fix** available?
- ✅ Yes → **Apply immediately**
- ❌ No (requires major version bump) → **Assess migration effort → Schedule**

### Example Scenarios

**Scenario 1**: Critical vulnerability in `axios` (CVSS 9.5)
→ **Action**: Immediate update (Workflow 3)
→ **Timeline**: Patch within 4 hours, deploy within 8 hours

**Scenario 2**: High vulnerability in `webpack-dev-server` (CVSS 7.5)
→ **Action**: Evaluate - dev server only, not in production
→ **Timeline**: Document in SECURITY_DEPENDENCIES.md, defer to Vite migration (Q2 2025)

**Scenario 3**: Moderate vulnerability in `swagger-jsdoc` (CVSS 6.1)
→ **Action**: Dev tooling only, API docs don't process untrusted data
→ **Timeline**: Monitor for v7 release, update when non-breaking

---

## 📅 Review Schedule

### Monthly Review (30 minutes)

**First Monday of Every Month** (January 6, February 3, March 3, etc.)

**Tasks**:
1. Run `npm audit` on backend + frontend
2. Check critical packages for updates (`npm outdated`)
3. Review new CVEs in GitHub Security Advisories
4. Update SECURITY_DEPENDENCIES.md files
5. Document decisions in this file's changelog

**Calendar Reminder**:
```
Title: PattaMap - Monthly Dependency Audit
Frequency: Monthly (First Monday)
Duration: 30 minutes
Assignee: [DevOps/Security Lead]
Checklist:
- [ ] npm audit (backend + frontend)
- [ ] npm outdated (critical packages)
- [ ] Update SECURITY_DEPENDENCIES.md
- [ ] Review CVEs
```

### Quarterly Deep Audit (2 hours)

**First Monday of Jan/Apr/Jul/Oct**

**Tasks**:
1. Full `npm outdated` analysis
2. Assess major version updates (breaking changes)
3. Create update branch + test updates
4. Plan migrations (e.g., Vite, React Server Components)
5. Update all documentation

**Calendar Reminder**:
```
Title: PattaMap - Quarterly Dependency Deep Audit
Frequency: Quarterly (Jan/Apr/Jul/Oct - First Monday)
Duration: 2 hours
Assignee: [DevOps/Security Lead]
Checklist:
- [ ] npm outdated (all packages)
- [ ] Assess major version bumps
- [ ] Test updates in feature branch
- [ ] Update documentation
- [ ] Plan next quarter's migrations
```

### On-Demand (As Needed)

**Triggers**:
- GitHub Security Advisory for critical package
- npm audit reveals new high/critical vulnerability
- Major framework release (e.g., React 20, Node.js 22)
- Breaking change announcement from vendor

**Action**: Follow Vulnerability Response Protocol (above)

---

## ✅ Best Practices

### 1. Prefer Semantic Versioning Ranges

**❌ Avoid**:
```json
{
  "dependencies": {
    "axios": "1.12.2"  // Exact version - misses patches
  }
}
```

**✅ Prefer**:
```json
{
  "dependencies": {
    "axios": "^1.12.2"  // Allows patches (1.12.x)
  }
}
```

**⚠️ Exception**: Pin exact versions for critical security packages in production:
```json
{
  "dependencies": {
    "jsonwebtoken": "9.0.2"  // Pin for audit trail
  }
}
```

### 2. Commit `package-lock.json`

**Always commit** both `package.json` and `package-lock.json` to ensure reproducible builds.

```bash
git add package.json package-lock.json
git commit -m "chore(deps): update axios to v1.12.5"
```

### 3. Test Before Merging

**Checklist before merging dependency updates**:
- [ ] All tests passing (`npm test`)
- [ ] No new TypeScript errors (`npm run build`)
- [ ] Critical flows tested manually
- [ ] No regressions in functionality
- [ ] Bundle size acceptable (frontend: `npm run analyze`)

### 4. Document Breaking Changes

**In `CHANGELOG.md`**:
```markdown
## [2.0.0] - 2025-02-01

### Changed
- **BREAKING**: Upgraded React from v18 to v19
  - `ReactDOM.render()` → `createRoot().render()`
  - See migration guide: docs/migrations/REACT_19.md

### Dependencies
- react@18.2.0 → 19.2.0
- react-dom@18.2.0 → 19.2.0
```

### 5. Monitor Changelogs

**Subscribe to release notifications** for critical packages:
- GitHub: Watch → Custom → Releases only
- npm: Follow package on npm website

**Critical packages to watch**:
- `react`, `react-dom`, `react-router-dom`
- `jsonwebtoken`, `bcryptjs`, `helmet`
- `@supabase/supabase-js`, `@sentry/node`

### 6. Avoid Automatic Updates

**❌ Don't use**: Dependabot auto-merge, Renovate auto-merge
**✅ Do use**: Automated PRs with manual review

**Rationale**: Dependency updates can introduce subtle bugs. Always review + test.

### 7. Batch Non-Critical Updates

**Instead of**:
```bash
git commit -m "chore: update lodash"
git commit -m "chore: update prettier"
git commit -m "chore: update eslint"
```

**Do**:
```bash
# Update all dev dependencies together
npm update --save-dev
git commit -m "chore(deps-dev): batch update development dependencies

- lodash@4.17.20 → 4.17.21
- prettier@2.8.0 → 2.8.8
- eslint@8.45.0 → 8.50.0

All tests passing. No breaking changes."
```

---

## 🛠️ Tooling

### npm Built-in Commands

```bash
# Check for vulnerabilities
npm audit

# Fix vulnerabilities (non-breaking)
npm audit fix

# Fix vulnerabilities (including breaking)
npm audit fix --force  # ⚠️ Use with caution!

# Check for outdated packages
npm outdated

# Update packages (respects semver ranges)
npm update

# Update specific package
npm update <package-name>

# Install specific version
npm install <package-name>@<version>

# View dependency tree
npm list
npm list --depth=0  # Top-level only
npm list <package-name>  # Specific package's dependencies
```

### External Tools

**Snyk** (Optional - Enhanced Security Scanning):
```bash
npm install -g snyk
snyk auth
snyk test  # Deep vulnerability scan
snyk monitor  # Continuous monitoring
```

**npm-check-updates** (Optional - Update Helper):
```bash
npm install -g npm-check-updates
ncu  # Check for updates
ncu -u  # Update package.json
npm install  # Install updates
```

**Bundle Analysis** (Frontend Only):
```bash
npm run analyze  # Already configured in package.json
# → Opens source-map-explorer in browser
```

**Audit CI** (CI/CD Integration):
```bash
# Fail build if high/critical vulnerabilities
npm audit --audit-level=high
```

---

## 📊 Metrics & Monitoring

### Key Metrics to Track

1. **Vulnerability Count**:
   - Target: 0 high/critical in production dependencies
   - Current: ✅ Backend 0, ✅ Frontend 0 (runtime)

2. **Outdated Packages**:
   - Target: <10% of packages more than 1 major version behind
   - Review: Quarterly

3. **Dependency Count**:
   - Backend: 655 packages
   - Frontend: 1,418 packages
   - Target: Reduce by 30% with Vite migration (Q2 2025)

4. **Update Frequency**:
   - Critical packages: Monthly check, quarterly update
   - Non-critical: Quarterly check, bi-annual update

### Alerting

**Set up alerts for**:
- GitHub Security Advisories (Watch → Security Alerts)
- npm audit in CI/CD (fail build on high/critical)
- Snyk alerts (optional)

---

## 📝 Review Log

### January 2025 - Phase 1.3 Audit
**Date**: 2025-01-14
**Auditor**: Claude Code (Automated)
**Findings**:
- Backend: 5 moderate (swagger-jsdoc chain) - **Deferred** (dev tooling)
- Frontend: 6 high + 3 moderate (react-scripts chain) - **Deferred** (CRA deprecation, Vite migration Q2 2025)
- All production runtime dependencies: ✅ Secure
**Actions**:
- ✅ Created backend/SECURITY_DEPENDENCIES.md
- ✅ Created SECURITY_DEPENDENCIES.md (frontend)
- ✅ Created docs/development/DEPENDENCY_MANAGEMENT.md (this file)
- ✅ Established monthly/quarterly review schedule
**Next Review**: February 3, 2025

### February 2025 - Monthly Review
**Date**: 2025-02-03
**Auditor**: TBD
**Findings**: TBD
**Actions**: TBD
**Next Review**: March 3, 2025

---

## 🔗 References

### Internal Documentation
- [Backend Security Dependencies](../../backend/SECURITY_DEPENDENCIES.md)
- [Frontend Security Dependencies](../../SECURITY_DEPENDENCIES.md)
- [Security Guide](../../backend/docs/SECURITY.md)
- [Getting Started](GETTING_STARTED.md)
- [Roadmap - Vite Migration](../features/ROADMAP.md#phase-4-technical-debt)

### External Resources
- [npm audit documentation](https://docs.npmjs.com/cli/v10/commands/npm-audit)
- [Semantic Versioning](https://semver.org/)
- [OWASP Dependency Check](https://owasp.org/www-project-dependency-check/)
- [Snyk Vulnerability Database](https://security.snyk.io/)
- [GitHub Advisory Database](https://github.com/advisories)

---

**Maintained by**: Development Team
**Last Updated**: January 2025
**Document Version**: 1.0.0
**Next Review**: February 3, 2025
