# 🏮 PattaMap - Pattaya Directory Platform

> Collaborative platform for referencing entertainment venues and employees in Pattaya, Thailand, with innovative ergonomic maps.

**Version**: v9.3.0 (Production-Ready)
**Status**: ✅ Production-Ready with tests, API docs, performance & security hardening
**Last Updated**: October 2025

> **📖 For complete documentation, see [docs/CLAUDE.md](docs/CLAUDE.md) - Main entry point for developers and Claude Code**
>
> **🔍 Quality audit available in [AUDIT_QUALITE_CODE.md](AUDIT_QUALITE_CODE.md) - Code quality assessment and recommendations**

---

## 📋 Overview

PattaMap revolutionizes navigation in Pattaya's dense nightlife districts with **custom ergonomic maps** that prioritize readability over geographic accuracy.

### ✨ Key Features

- 🗺️ **9 Ergonomic Zone Maps** - Custom grids (Soi 6, Walking Street, LK Metro, Treetown, etc.)
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

- **Frontend**: React 19.1 + TypeScript + React Router + React Query
- **Backend**: Node.js + Express + TypeScript
- **Database**: Supabase (PostgreSQL + PostGIS)
- **Storage**: Cloudinary (images CDN)
- **Auth**: JWT + httpOnly cookies + CSRF protection
- **Monitoring**: Sentry (errors + performance tracing)
- **Testing**: Jest + Supertest (33 tests, 85%+ coverage)

→ **Full Stack Details**: [docs/architecture/TECH_STACK.md](docs/architecture/TECH_STACK.md)

---

## 🗺️ Map System (Innovation)

**Why Ergonomic Maps?**
- Traditional Google Maps = illegible in dense zones
- Custom grids = each venue has its own readable cell
- Topographic layouts = visual clarity

**9 Zones**: Soi 6 (2×20), Walking Street (12×5 topographic), LK Metro (L-shape), Treetown (U-shape), and more.

→ **Map System Details**: [docs/architecture/MAP_SYSTEM.md](docs/architecture/MAP_SYSTEM.md)

---

## 🔐 Security

- ✅ httpOnly Cookies (XSS protection)
- ✅ CSRF Protection (custom middleware)
- ✅ JWT Refresh Rotation (15min/7days)
- ✅ Rate Limiting (8 granular limiters)
- ✅ Helmet.js (HSTS, CSP, X-Frame-Options)
- ✅ Audit Logging (admin actions trail)

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

### 👨‍💻 For Developers

**📖 Main Entry Point**: [docs/CLAUDE.md](docs/CLAUDE.md) - Complete project guide for Claude Code

**Documentation Structure**:
```
docs/
├── architecture/     # Tech stack, structure, maps, CSS
├── development/      # Getting started, conventions, testing
├── features/         # Overview, roadmap, implementation
└── versions/         # Version history (CLAUDE-v9.x.0.md)
```

---

## 📊 Key Metrics (v9.3.0)

| Metric | Value |
|--------|-------|
| **Employees** | 76 profiles |
| **Establishments** | 151 venues |
| **Zones** | 9 ergonomic maps |
| **Grid Positions** | 322 total |
| **Reviews** | 52 community ratings |
| **Users** | 14 (user/moderator/admin) |
| **Tests** | 33 (85%+ coverage) |
| **Performance** | ~20ms P50 latency |

---

## 🗺️ Roadmap (v10.0+)

**Priorité Haute** 🔴:
1. **Multilingue (i18n)** - EN/TH/RU/CN → Audience ×10
2. **Vérification Profils** - Badge vérifié → Confiance +80%
3. **Notifications Push (PWA)** - Engagement → Rétention +40%
4. **Freemium Model** - Monétisation → Revenus récurrents

→ **Full Roadmap**: [docs/features/ROADMAP.md](docs/features/ROADMAP.md)

---

## 🧪 Testing

```bash
# Frontend
npm test                     # Run all tests
npm run build                # Production build

# Backend
cd backend
npm test                     # 33 tests (85%+ coverage)
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

**Version**: v9.3.0 | **Status**: Production-Ready | **October 2025**
