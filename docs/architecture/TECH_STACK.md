# Stack Technique - PattaMap

## Vue d'ensemble

PattaMap est construit avec une architecture moderne full-stack TypeScript, privilégiant la sécurité, la performance et la maintenabilité.

---

## Frontend

### Core Technologies
- **React** ^19.2.0 - Bibliothèque UI moderne avec Concurrent Mode
- **TypeScript** ^5.9.3 - Typage statique strict
- **React Router** ^7.9.4 - Navigation SPA
- **Vite** ^7.2.7 - Build tool ultra-rapide (HMR, ESM natif)

### State Management & Data Fetching
- **React Query (TanStack Query)** ^5.90.2 - Gestion état serveur, cache intelligent
- **React Context** - État global (Auth split en 6 sous-contextes, Modal, CSRF, Gamification, Sidebar, Theme, MapControls)
- **Custom Hooks** - 50+ hooks réutilisables (useSecureFetch, useContainerSize, useFocusTrap, etc.)

### UI & Styling
- **CSS Modules / SCSS Bundles** - Styles scopés, design system, responsive
- **Nightlife Theme** - Système de thème personnalisé (dark/light avec ThemeToggle)
- **Framer Motion** ^12.23.24 - Animations fluides
- **Lucide React** ^0.545.0 - Icônes SVG modernes
- **Recharts** ^3.5.1 - Graphiques et visualisations (XP History, analytics)

### Internationalization (i18n)
- **i18next** ^25.6.0 - Framework de traduction
- **react-i18next** ^16.0.0 - Intégration React
- **i18next-browser-languagedetector** ^8.2.0 - Détection langue navigateur
- **i18next-http-backend** ^3.0.2 - Chargement traductions
- **8 langues** : EN, TH, RU, CN, FR, HI, JA, KO (1,100+ clés, 42 composants)

### Maps & Visualization
- **HTML5 Canvas** - Rendu des routes sur les cartes
- **React Zoom Pan Pinch** 3.7.0 - Interactions cartes tactiles
- **Zone System** - 9 zones géographiques

### PWA & Offline
- **vite-plugin-pwa** ^1.2.0 - PWA intégration Vite
- **Workbox** ^7.4.0 (core, expiration, precaching, routing, strategies) - Service Worker
- **Offline-first** - Cache strategies, offline fallback pages, background sync

### HTTP & API
- **Axios** ^1.12.2 - Client HTTP
- **React GA4** ^2.1.0 - Google Analytics 4

### Security
- **DOMPurify** ^3.3.1 - Protection XSS (sanitize HTML)
- **@dr.pogodin/react-helmet** ^3.0.5 - SEO meta tags sécurisés

### Build & Dev Tools
- **Vite** ^7.2.7 - Dev server ultra-rapide (HMR), build optimisé
- **@vitejs/plugin-react** ^5.1.2 - Plugin React pour Vite
- **ESLint** ^9.39.1 + **typescript-eslint** ^8.49.0 - Linting
- **Source Map Explorer** ^2.5.3 - Analyse bundle size
- **Webpack Bundle Analyzer** ^4.10.2 - Visualisation bundles
- **PurgeCSS** ^7.0.2 - Purge CSS inutilisé
- **Sharp** ^0.34.5 - Optimisation images (build)

### Testing Frontend
- **Vitest** ^4.0.15 - Test runner (rapide, compatible Vite)
- **@vitest/coverage-v8** ^4.0.15 - Coverage
- **@testing-library/react** ^16.3.0 - Tests composants React
- **@testing-library/dom** ^10.4.1 - DOM utilities
- **@testing-library/user-event** ^13.5.0 - Simulation interactions
- **jsdom** ^27.3.0 - DOM virtuel pour tests
- **jest-axe** ^10.0.0 - Tests accessibilité
- **Playwright** ^1.56.1 - Tests E2E (67 tests)

### Monitoring Frontend
- **@sentry/react** ^10.19.0 - Error tracking + Performance monitoring
- **web-vitals** ^5.1.0 - Core Web Vitals

---

## Backend

### Core Technologies
- **Node.js** 18+ - Runtime JavaScript
- **Express** 4.18.2 - Framework web minimaliste
- **TypeScript** ^5.9.3 - Typage statique strict
- **Nodemon** ^3.1.10 - Hot reload développement

### Database & Storage
- **Supabase** ^2.75.0 - PostgreSQL managed + Auth + Storage
- **PostGIS** - Extension géospatiale (zones, coordonnées)
- **Cloudinary** ^2.7.0 - Storage images (CDN)

### Authentication & Security
- **JWT (jsonwebtoken)** ^9.0.2 - Tokens accès/refresh
- **bcryptjs** ^3.0.2 - Hashing mots de passe (NIST SP 800-63B compliant)
- **express-session** ^1.18.2 - Sessions CSRF
- **cookie-parser** ^1.4.7 - Parsing cookies httpOnly
- **Helmet** ^8.1.0 - HTTP security headers (HSTS, CSP conditionnel, X-Frame-Options)
- **CORS** ^2.8.5 - Configuration stricte origins

### Caching & Performance
- **Redis (ioredis)** ^5.8.1 - Cache distribué (actif, USE_REDIS=true)
- **@upstash/redis** ^1.36.0 - Redis serverless
- **connect-redis** ^8.1.0 - Store sessions Redis
- **Memory Cache** - Fallback si Redis indisponible
- **Custom Cache Middleware** - TTL configurables par endpoint

### Middleware & Utilities
- **Multer** ^2.0.2 - Upload fichiers multipart
- **Express Rate Limit** ^8.1.0 - Protection DDoS (8 limiters granulaires)
- **Compression** ^1.8.1 - Compression Brotli/gzip réponses
- **Custom Middleware** - Auth, CSRF, Cache, Validation, RefreshToken, AuditLog, AsyncHandler, SupabaseAuth

### Backend Services
- **node-cron** ^4.2.1 - Tâches planifiées (mission reset, VIP expiration)
- **nodemailer** ^7.0.12 - Envoi emails (PDPA compliance, notifications admin)
- **web-push** ^3.6.7 - Push notifications (VAPID, PWA)
- **promptpay-qr** ^0.5.0 - QR codes paiement PromptPay (VIP)
- **qrcode** ^1.5.4 - Génération QR codes

### Monitoring & Logging
- **@sentry/node** ^10.19.0 - Backend error tracking
- **@sentry/profiling-node** ^10.19.0 - CPU profiling (optionnel)
- **Sentry Performance** - Traces 50% sample rate
- **Custom Logger** - Logs structurés

### Testing Backend
- **Jest** ^30.2.0 - Test runner (322+ tests)
- **Supertest** ^7.1.4 - Tests API HTTP
- **ts-jest** ^29.4.5 - Support TypeScript
- **Coverage** : 85%+ sur middleware critiques

### API Documentation
- **Swagger (swagger-jsdoc)** ^6.2.8 - Spécification OpenAPI 3.0
- **Swagger UI Express** ^5.0.1 - Interface interactive `/api-docs`

---

## DevOps & Infrastructure

### Environment Management
- **dotenv** ^17.2.3 - Variables d'environnement
- **Fail-fast Validation** - Vérification vars critiques au démarrage

### Deployment
- **Vercel** - Frontend deployment (vercel.json configuré)
- **PM2** - Process manager production backend (recommandé)
- **Environment-based Config** - Dev/staging/production
- **Health Check Endpoint** - `/api/health`

### CI/CD
- Scripts CI intégrés : `npm run ci` (lint + typecheck + build)
- `npm run ci:full` (ci + E2E tests)
- Backend : `npm run ci` (lint + typecheck + test:coverage + build)
- Pre-commit hooks (à configurer avec Husky)

---

## Architecture Patterns

### Backend Patterns
- **MVC Architecture** - Controllers + Routes + Services
- **Middleware Chain** - Auth -> CSRF -> Rate Limit -> Business Logic
- **Repository Pattern** - Abstraction database (Supabase client)
- **Error Handling** - Centralisé avec Sentry + asyncHandler

### Frontend Patterns
- **Component Composition** - Composants réutilisables atomiques (226 composants)
- **Feature-based Organization** - Composants groupés par feature (Admin/, Auth/, Bar/, Search/, etc.)
- **Custom Hooks** - 50+ hooks logique métier partagée
- **Context Providers** - État global isolé par domaine (14 contextes)
- **Lazy Loading** - React.lazy pour routes admin

### Security Patterns
- **httpOnly Cookies** - Tokens inaccessibles JavaScript (XSS protection)
- **CSRF Double Submit** - Validation token session + header
- **JWT Legacy** - Access 7j (single token, refresh token system built but not connected)
- **Rate Limiting Granular** - Par type d'opération (auth, upload, admin)
- **Audit Logging** - Trail complet actions sensibles
- **CSP Conditionnel** - Strict par défaut, relaxé pour Swagger UI

### Performance Patterns
- **Parallel Queries (Promise.all)** - Réduction latence DB (-87%)
- **Compression Brotli** - Réduction bande passante (-75%)
- **Cursor Pagination** - Scalabilité pagination profonde
- **Database Indexes** - 30+ indexes optimisation queries
- **Redis Caching** - Réduction charge DB (-50%)
- **PWA Offline-First** - Service Worker + cache strategies

---

## Version Control & Dependencies

### Package Management
- **npm** 8+ - Gestionnaire paquets
- **package-lock.json** - Versions exactes reproductibles

### TypeScript Configuration
- **Strict Mode** - Vérification typage maximale
- **ES Modules** - Frontend (Vite), CommonJS - Backend
- **Source Maps** - Debug production

### Code Quality
- **ESLint** ^9.39.1 - Linting JavaScript/TypeScript
- **typescript-eslint** ^8.49.0 - Règles TypeScript
- **Prettier** - Formatage code (à configurer)
- **Husky** - Git hooks (à configurer)

---

## External Services

### Required Services
1. **Supabase** (Database + Auth)
   - PostgreSQL managed (32 tables)
   - Row Level Security (RLS)
   - Realtime subscriptions
   - RPC Functions (notifications)

2. **Cloudinary** (Images CDN)
   - Upload images établissements/employées
   - Transformation automatique (resize, crop)
   - Delivery optimisé (WebP, progressive JPEG)

3. **Sentry** (Monitoring)
   - Error tracking frontend/backend
   - Performance monitoring (traces 50%)
   - User context + breadcrumbs

### Optional Services
4. **Redis** (Cache - Actif)
   - Upstash (serverless) ou self-hosted
   - Cache API (categories, stats, listings)
   - USE_REDIS=true par défaut

---

## Environment Variables

### Backend (.env)

```bash
# Server
PORT=8080
NODE_ENV=development|production

# Database
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# Authentication
JWT_SECRET=min-32-chars-secret-key
JWT_EXPIRES_IN=7d
# JWT_REFRESH_EXPIRES_IN=7d  # Not currently used (refresh token system not connected to login)
SESSION_SECRET=session-secret-key

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud
CLOUDINARY_API_KEY=your-key
CLOUDINARY_API_SECRET=your-secret

# Sentry
SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_ENVIRONMENT=development|production
SENTRY_TRACES_SAMPLE_RATE=0.5
SENTRY_ENABLE_PROFILING=false

# Redis (actif)
USE_REDIS=true
REDIS_URL=redis://localhost:6379

# CORS
CORS_ORIGIN=http://localhost:3000

# Cookies
COOKIE_DOMAIN=.pattamap.com

# Push Notifications
VAPID_PUBLIC_KEY=your-public-key
VAPID_PRIVATE_KEY=your-private-key
VAPID_SUBJECT=mailto:your-email

# PromptPay (VIP)
PROMPTPAY_MERCHANT_ID=0812345678
```

### Frontend (.env)

```bash
# API
VITE_API_URL=http://localhost:8080

# Sentry
VITE_SENTRY_DSN=https://xxx@sentry.io/xxx
VITE_SENTRY_ENVIRONMENT=development

# Feature Flags
VITE_FEATURE_VIP_SYSTEM=false

# Supabase (Auth)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## Performance Metrics

### Current Performance (v10.4.0)
- **Dashboard Stats**: 800ms -> 97ms (8x faster with Promise.all)
- **Bandwidth**: -75% (Brotli compression)
- **Mobile Transfer Time**: -70%
- **Test Coverage**: 1,675 tests passing (513 frontend, 1,162 backend)
- **P50 Latency**: ~20ms
- **P95 Latency**: ~80ms

---

## Documentation

- **API Docs**: http://localhost:8080/api-docs (Swagger UI)
- **Security Guide**: [backend/docs/SECURITY.md](../../backend/docs/SECURITY.md)
- **Performance Guide**: [backend/docs/PERFORMANCE.md](../../backend/docs/PERFORMANCE.md)
- **Database Indexes**: [backend/docs/DATABASE_INDEXES.md](../../backend/docs/DATABASE_INDEXES.md)
- **Sentry Usage**: [backend/docs/SENTRY_USAGE.md](../../backend/docs/SENTRY_USAGE.md)

---

**Dernière mise à jour**: v10.4.0 (Février 2026)
