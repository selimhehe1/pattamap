# 🏮 PattaMap - Pattaya Directory Platform

> Collaborative platform for referencing entertainment venues and employees in Pattaya, Thailand.

**Version**: v10.4.1 (Post-Launch Hardening)
**Status**: ✅ Production-Ready with 1,691 tests, TypeScript strict, security hardening
**Last Updated**: February 2026

> **📖 For complete documentation, see [docs/CLAUDE.md](docs/CLAUDE.md) - Main entry point for developers and Claude Code**
>
> **🔍 Quality audit available in [AUDIT_QUALITE_CODE.md](docs/audits/AUDIT_QUALITE_CODE.md) - Code quality assessment and recommendations**

---

## 📋 Overview

PattaMap is the reference platform for Pattaya's nightlife districts, featuring comprehensive listings and community features.

### ✨ Key Features

- 🗺️ **9 Zones** - Soi 6, Walking Street, LK Metro, Treetown, etc.
- 👥 **76 Employee Profiles** - Photos, social media, work history
- 🏢 **151 Establishments** - Bars, Gogos, Nightclubs, Massage venues
- ⭐ **Community Reviews** - 52 ratings and comments
- 🔐 **Enterprise Security** - CSRF, httpOnly cookies, rate limiting, audit logs
- ⚡ **Performance** - Brotli compression (-75%), parallel queries (8x faster)
- 📱 **Responsive Design** - Mobile-first with nightlife theme

---

## 🚀 Quick Start

### For Users

Visit the live app at: [Your deployment URL]

### For Developers

**Prerequisites**: Node.js 18+, npm 8+, Supabase account, Cloudinary account

```bash
# 1. Clone & Install
git clone <repository-url>
cd pattaya-directory
npm install
cd backend && npm install

# 2. Configure (see docs/development/GETTING_STARTED.md)
# 3. Run
cd backend && npm run dev  # Terminal 1 → :8080
npm start                  # Terminal 2 → :3000
```

→ **Full Setup Guide**: [docs/development/GETTING_STARTED.md](docs/development/GETTING_STARTED.md)

---

## 🏗️ Tech Stack

- **Frontend**: React 19.2 + TypeScript + Vite + React Router + React Query
- **Backend**: Node.js + Express + TypeScript
- **Database**: Supabase (PostgreSQL + PostGIS)
- **Storage**: Cloudinary (images CDN)
- **Auth**: JWT + httpOnly cookies + CSRF protection
- **Monitoring**: Sentry (errors + performance tracing)
- **Testing**: Vitest (frontend) + Jest (backend) + Playwright (E2E) - 1,691 tests, 85%+ middleware coverage
- **Upload Security**: Magic bytes validation (MIME spoofing prevention)
- **Dev Tooling**: Husky + lint-staged pre-commit hooks

→ **Full Stack Details**: [docs/architecture/TECH_STACK.md](docs/architecture/TECH_STACK.md)

---

## 🔐 Security

- ✅ httpOnly Cookies (XSS protection)
- ✅ CSRF Protection (custom middleware)
- ✅ JWT Refresh Rotation (Access 7d / Refresh 30d)
- ✅ Rate Limiting (8 granular limiters)
- ✅ Helmet.js (HSTS, CSP, X-Frame-Options)
- ✅ Audit Logging (admin actions trail)
- ✅ Magic Bytes Validation (MIME spoofing prevention on uploads)

→ **Security Guide**: [backend/docs/SECURITY.md](backend/docs/SECURITY.md)

---

## ⚡ Performance

- **Compression**: Brotli (-75% bandwidth) ✅
- **Parallel Queries**: Dashboard 8x faster (800ms → 97ms) ✅
- **Redis Cache**: Ready (to activate if >100 users/day)
- **Cursor Pagination**: Ready (scalable pagination)
- **Database Indexes**: 30+ indexes documented

→ **Performance Guide**: [backend/docs/PERFORMANCE.md](backend/docs/PERFORMANCE.md)

---

## 📚 Documentation

### 🎯 Quick Links

- **🚀 Get Started**: [docs/development/GETTING_STARTED.md](docs/development/GETTING_STARTED.md)
- **🏗️ Architecture**: [docs/architecture/PROJECT_STRUCTURE.md](docs/architecture/PROJECT_STRUCTURE.md)
- **✨ Features**: [docs/features/FEATURES_OVERVIEW.md](docs/features/FEATURES_OVERVIEW.md)
- **🗺️ Roadmap**: [docs/features/ROADMAP.md](docs/features/ROADMAP.md)
- **🧪 Testing**: [docs/development/TESTING.md](docs/development/TESTING.md)
- **📡 Monitoring**: [MONITORING.md](MONITORING.md)

### 👨‍💻 For Developers

**📖 Main Entry Point**: [docs/CLAUDE.md](docs/CLAUDE.md) - Complete project guide for Claude Code

**Documentation Structure** (35 fichiers, nettoyée Dec 2025):
```
docs/
├── architecture/     # Tech stack, structure, maps, CSS (5 files)
├── development/      # Getting started, conventions, testing (7 files)
├── features/         # Overview, roadmap, VIP, i18n, gamification (11 files)
├── guides/           # User & admin guides (5 files)
└── audits/           # Quality & security audits (4 files)
```

---

## 📊 Key Metrics (v10.4.1)

| Metric | Value |
|--------|-------|
| **Employees** | 76 profiles |
| **Establishments** | 151 venues |
| **Zones** | 9 |
| **Reviews** | 52 community ratings |
| **Users** | 14 (user/moderator/admin/establishment_owner) |
| **Frontend Tests** | 513 (40 suites - hooks, pages, components, contexts) |
| **Backend Tests** | 1,178 (45 suites - middleware 85%+ coverage) |
| **Performance** | ~20ms P50 latency |

---

## 🗺️ Roadmap (v10.0+)

**Completed** ✅:
1. ~~**Multilingue (i18n)**~~ - EN/TH/RU/CN/FR/HI/JA/KO (8 languages, 1,100+ keys)
2. ~~**Notifications Push (PWA)**~~ - 21 types, grouping, filtering
3. ~~**VIP Subscriptions**~~ - Backend + Frontend complete (disabled via feature flag)
4. ~~**Establishment Owners**~~ - Full system with permissions
5. ~~**Gamification**~~ - XP, badges, missions, leaderboards
6. ~~**Reviews Améliorées**~~ - Photos, owner responses, i18n
7. ~~**Dark Mode**~~ - Theme toggle with system preference detection
8. ~~**Mode Hors Ligne**~~ - PWA offline-first

**Next Features** 🟡:
- **Système Tips** - Digital tipping (7 days)
- **Publicité Ciblée** - Sponsored listings (4 days)

→ **Full Roadmap**: [docs/features/ROADMAP.md](docs/features/ROADMAP.md)

---

## 🧪 Testing

```bash
# Frontend (513 tests, 40 suites)
npm test                     # Run all tests
npm run build                # Production build

# Key test suites:
# - src/contexts/__tests__/ (105 tests - 7 contexts)
# - src/hooks/__tests__/ (50 tests - secureFetch, formValidation, online, mediaQuery, infiniteScroll)
# - src/components/__tests__/ (200+ tests - pages, layout, common, feature)
# - tests/e2e/ (67 Playwright tests)

# Backend (1,178 tests, 45 suites)
cd backend
npm test                     # Run all tests (85%+ middleware coverage)
npm run build                # TypeScript compile
npm run test:coverage        # Coverage report
```

---

## 🛠️ API Documentation

- **Swagger UI**: http://localhost:8080/api-docs (dev only)
- **Health Check**: http://localhost:8080/api/health
- **API Spec**: http://localhost:8080/api-docs.json

---

## 🤝 Contributing

1. Read [docs/development/CODING_CONVENTIONS.md](docs/development/CODING_CONVENTIONS.md)
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Follow TypeScript strict mode & testing guidelines
4. Commit with conventional format (`feat:`, `fix:`, etc.)
5. Push and open Pull Request

---

## 📝 License

Private project - All rights reserved

---

## 📞 Support

- 📖 **Documentation**: [docs/CLAUDE.md](docs/CLAUDE.md) (main entry point)
- 🐛 **Issues**: Create GitHub issue
- 📧 **Contact**: [Your contact info]

---

**Built with ❤️ for the Pattaya nightlife community**

**Version**: v10.4.1 | **Status**: Production-Ready | **February 2026**
