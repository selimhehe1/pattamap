# 🛠️ Stack Technique - PattaMap

## Vue d'ensemble

PattaMap est construit avec une architecture moderne full-stack TypeScript, privilégiant la sécurité, la performance et la maintenabilité.

---

## Frontend

### Core Technologies
- **React** 19.1.1 - Bibliothèque UI moderne avec Concurrent Mode
- **TypeScript** 5.9.3 - Typage statique strict
- **React Router** 7.9.1 - Navigation SPA

### State Management & Data Fetching
- **React Query (TanStack Query)** 5.90.2 - Gestion état serveur, cache intelligent
- **React Context** - État global (Auth, Modal, CSRF)
- **Custom Hooks** - Logique réutilisable (useSecureFetch, useContainerSize)

### UI & Styling
- **CSS Modules** - Styles scopés par composant
- **Nightlife Theme** - Système de thème personnalisé (dark/light)
- **Framer Motion** 12.23.22 - Animations fluides
- **React Hot Toast** 2.6.0 - Notifications utilisateur

### Maps & Visualization
- **HTML5 Canvas** - Rendu des routes sur les cartes
- **React Zoom Pan Pinch** 3.7.0 - Interactions cartes tactiles
- **Custom Grid System** - 9 zones avec grilles ergonomiques

### Build & Dev Tools
- **React Scripts** 5.0.1 (Create React App)
- **Source Map Explorer** 2.5.3 - Analyse bundle size
- **Webpack Bundle Analyzer** 4.10.2 - Optimisation bundles

---

## Backend

### Core Technologies
- **Node.js** 18+ - Runtime JavaScript
- **Express** 4.18.2 - Framework web minimaliste
- **TypeScript** 5.9.2 - Typage statique strict
- **Nodemon** 3.1.10 - Hot reload développement

### Database & Storage
- **Supabase** 2.57.4 - PostgreSQL managed + Auth + Storage
- **PostGIS** - Extension géospatiale (zones, coordonnées)
- **Cloudinary** 2.7.0 - Storage images (CDN)

### Authentication & Security
- **JWT (jsonwebtoken)** 9.0.2 - Tokens accès/refresh
- **bcryptjs** 3.0.2 - Hashing mots de passe
- **express-session** 1.18.2 - Sessions CSRF
- **cookie-parser** 1.4.7 - Parsing cookies httpOnly
- **Helmet** 8.1.0 - HTTP security headers (HSTS, CSP, X-Frame-Options)
- **CORS** 2.8.5 - Configuration stricte origins

### Middleware & Utilities
- **Multer** 2.0.2 - Upload fichiers multipart
- **Express Rate Limit** 8.1.0 - Protection DDoS (8 limiters granulaires)
- **Compression** 1.8.1 - Compression Brotli/gzip réponses
- **Custom Middleware** - Auth, CSRF, Cache, Validation

### Monitoring & Logging
- **Sentry** 10.17.0 - Error tracking + Performance monitoring
  - **@sentry/node** - Backend monitoring
  - **@sentry/profiling-node** - CPU profiling (optionnel)
  - **@sentry/react** - Frontend monitoring
- **Custom Logger** - Logs structurés (winston-like)

### Testing
- **Jest** 30.2.0 - Test runner
- **Supertest** 7.1.4 - Tests API HTTP
- **ts-jest** 29.4.4 - Support TypeScript
- **@testing-library/react** 16.3.0 - Tests composants React
- **Coverage**: 85%+ sur middleware critiques

### API Documentation
- **Swagger (swagger-jsdoc)** 6.2.8 - Spécification OpenAPI 3.0
- **Swagger UI Express** 5.0.1 - Interface interactive `/api-docs`

### Caching & Performance
- **Redis (ioredis)** 5.8.0 - Cache distribué (prêt, pas encore actif)
- **Memory Cache** - Fallback si Redis indisponible
- **Custom Cache Middleware** - TTL configurables par endpoint

---

## DevOps & Infrastructure

### Environment Management
- **dotenv** 17.2.2 - Variables d'environnement
- **Fail-fast Validation** - Vérification vars critiques au démarrage

### Deployment (Ready)
- **PM2** - Process manager production (recommandé)
- **Environment-based Config** - Dev/staging/production
- **Health Check Endpoint** - `/api/health`

### CI/CD (Planned)
- GitHub Actions - Tests automatisés
- Pre-commit Hooks - Linting, formatting
- Automated Deployments

---

## Architecture Patterns

### Backend Patterns
- **MVC Architecture** - Controllers + Routes + Services
- **Middleware Chain** - Auth → CSRF → Rate Limit → Business Logic
- **Repository Pattern** - Abstraction database (Supabase client)
- **Error Handling** - Centralisé avec Sentry

### Frontend Patterns
- **Component Composition** - Composants réutilisables atomiques
- **Container/Presentational** - Séparation logique/UI
- **Custom Hooks** - Logique métier partagée
- **Context Providers** - État global isolé par domaine

### Security Patterns
- **httpOnly Cookies** - Tokens inaccessibles JavaScript (XSS protection)
- **CSRF Double Submit** - Validation token session + header
- **JWT Refresh Rotation** - Tokens courte durée (15min access, 7j refresh)
- **Rate Limiting Granular** - Par type d'opération (auth, upload, admin)
- **Audit Logging** - Trail complet actions sensibles

### Performance Patterns
- **Parallel Queries (Promise.all)** - Réduction latence DB (-87%)
- **Compression Brotli** - Réduction bande passante (-75%)
- **Cursor Pagination** - Scalabilité pagination profonde
- **Database Indexes** - Optimisation queries WHERE/JOIN
- **Redis Caching** - Réduction charge DB (-80% attendu)

---

## Version Control & Dependencies

### Package Management
- **npm** 8+ - Gestionnaire paquets
- **package-lock.json** - Versions exactes reproductibles

### TypeScript Configuration
- **Strict Mode** - Vérification typage maximale
- **ES Modules** - Import/export modern JavaScript
- **Source Maps** - Debug production

### Code Quality
- **ESLint** - Linting JavaScript/TypeScript
- **Prettier** - Formatage code (à configurer)
- **Husky** - Git hooks (à configurer)

---

## External Services

### Required Services
1. **Supabase** (Database + Auth)
   - PostgreSQL managed
   - Row Level Security (RLS)
   - Realtime subscriptions (non utilisé actuellement)

2. **Cloudinary** (Images CDN)
   - Upload images établissements/employées
   - Transformation automatique (resize, crop)
   - Delivery optimisé (WebP, progressive JPEG)

3. **Sentry** (Monitoring)
   - Error tracking frontend/backend
   - Performance monitoring (traces 10%)
   - User context + breadcrumbs

### Optional Services
4. **Redis** (Cache)
   - Upstash (serverless) ou self-hosted
   - Utilisé pour cache API (categories, stats, listings)

---

## Environment Variables

### Backend (.env)

```bash
# Database
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=your-anon-key

# Authentication
JWT_SECRET=min-32-chars-secret-key
SESSION_SECRET=session-secret-key

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud
CLOUDINARY_API_KEY=your-key
CLOUDINARY_API_SECRET=your-secret

# Sentry
SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_ENVIRONMENT=development|production
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_ENABLE_PROFILING=false

# Redis (optional)
REDIS_URL=redis://localhost:6379

# Server
PORT=8080
NODE_ENV=development|production
CORS_ORIGIN=http://localhost:3000
```

### Frontend (.env)

```bash
# API
REACT_APP_API_URL=http://localhost:8080

# Sentry
REACT_APP_SENTRY_DSN=https://xxx@sentry.io/xxx
REACT_APP_SENTRY_ENVIRONMENT=development
```

---

## Performance Metrics

### Current Performance (v9.3.0)
- **Dashboard Stats**: 800ms → 97ms (8x faster with Promise.all)
- **Bandwidth**: -75% (Brotli compression)
- **Mobile Transfer Time**: -70%
- **Test Coverage**: 85%+ (33 tests passed)

### Expected Performance (with all optimizations)
- **DB Queries**: -80% (with Redis cache)
- **P50 Latency**: 150ms → 20ms
- **P95 Latency**: 800ms → 100ms
- **Infrastructure Costs**: -60%

---

## Migration Path

### Recommended Upgrades
1. **Migrate to Vite** (from Create React App)
   - Faster dev server (HMR)
   - Better tree-shaking
   - Native ESM support

2. **Add Turborepo** (monorepo management)
   - Shared packages (types, utils)
   - Parallel builds

3. **Implement GraphQL** (optional)
   - Remplacer REST par GraphQL
   - Resolver-based architecture
   - Better type safety

---

## Documentation

- **API Docs**: http://localhost:8080/api-docs (Swagger UI)
- **Security Guide**: [backend/docs/SECURITY.md](../../backend/docs/SECURITY.md)
- **Performance Guide**: [backend/docs/PERFORMANCE.md](../../backend/docs/PERFORMANCE.md)
- **Database Indexes**: [backend/docs/DATABASE_INDEXES.md](../../backend/docs/DATABASE_INDEXES.md)
- **Sentry Usage**: [backend/docs/SENTRY_USAGE.md](../../backend/docs/SENTRY_USAGE.md)

---

**Dernière mise à jour**: v9.3.0 (Octobre 2025)
