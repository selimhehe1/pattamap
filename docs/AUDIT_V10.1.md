# 📊 AUDIT COMPLET - PattaMap v10.1.0

> Audit technique complet du projet PattaMap avec plan d'action priorisé

**Version analysée** : v10.1.0 (Production-Ready)
**Date audit** : Janvier 2025
**Contexte** : Développement solo local (sans infrastructure cloud)
**Dernière mise à jour** : 2025-01-15
**Lignes de code analysées** : ~100,000+ (backend + frontend)
**Documentation analysée** : 15+ fichiers (1,500+ lignes)

---

## 📋 Table des matières

1. [Executive Summary](#-executive-summary)
2. [Scores par catégorie](#-scores-par-catégorie)
3. [État des lieux détaillé](#-état-des-lieux-détaillé)
4. [Phase 1 : Fondations Critiques](#-phase-1--fondations-critiques-6j)
5. [Phase 2 : Features Business](#-phase-2--features-business-17j)
6. [Phase 3 : Qualité UX](#-phase-3--qualité-ux-7j)
7. [À ignorer (contexte local)](#-à-ignorer-contexte-solo-local)
8. [Setup infrastructure future](#-setup-infrastructure-future-quand-prêt)
9. [Annexes](#-annexes)
10. [Références](#-références)

---

## 🎯 Executive Summary

### Score Global : **6.8/10** (Bon, améliorations ciblées recommandées)

**Forces majeures** ✅ :
- Architecture solide et scalable (TypeScript strict, modularité)
- Sécurité enterprise-grade (CSRF, JWT httpOnly, Rate Limiting, Helmet)
- Documentation exceptionnelle (15+ fichiers, 1,500+ lignes)
- Performance optimisée (Compression Brotli -75%, parallel queries 8x)
- Innovation UX (système cartes ergonomiques unique)

**Faiblesses critiques** ⚠️ :
- Tests incomplets (4/10) - Seulement middleware backend testés
- i18n partiel (5/10) - Seulement 9/45 composants traduits
- Features roadmap non implémentées (11 features planifiées)
- Accessibilité basique (6/10) - WCAG partiellement respecté

### Top 5 Priorités

| # | Priorité | Effort | Impact Business |
|---|----------|--------|-----------------|
| 1 | **Tests Backend** (controllers + routes) | 5j | Qualité code, filet sécurité |
| 2 | **i18n Complet** (36 composants restants) | 4j | Audience ×10 (EN/TH/RU/CN) |
| 3 | **Dark Mode** | 2j | Confort utilisateur +40% |
| 4 | **Vérification Profils** | 2j | Confiance +80% |
| 5 | **Reviews Améliorées** | 3j | Engagement +60% |

**Effort total estimé** : 30 jours (~6 semaines)

---

## 📊 Scores par catégorie

| Catégorie | Score | Status | Commentaire |
|-----------|-------|--------|-------------|
| **Backend Architecture** | 8.5/10 | ✅ Excellent | TypeScript, modularité, separation of concerns |
| **Frontend Architecture** | 8/10 | ✅ Très bon | React 19, hooks customs, contexts bien structurés |
| **Sécurité** | 8.5/10 | ✅ Robuste | CSRF, JWT, Rate Limiting, Helmet, Audit logs |
| **Performance** | 8/10 | ✅ Optimisé | Brotli, parallel queries, React Query cache |
| **Tests** | 4/10 | ⚠️ Critique | 33 tests middleware, 0 tests controllers/routes |
| **Documentation** | 9/10 | ✅ Excellente | CLAUDE.md, ROADMAP.md, 15+ docs techniques |
| **Database** | 6/10 | 🟡 Moyen | 30+ indexes, mais migrations manuelles |
| **Monitoring** | 6/10 | 🟡 Moyen | Sentry configuré, mais logs basiques |
| **CSS/Styles** | 6/10 | 🟡 En migration | Migration nightlife-theme en cours (Phase 3A/4) |
| **i18n** | 5/10 | 🟡 Partiel | Infra OK, mais 9/45 composants traduits (20%) |
| **Accessibilité** | 6/10 | 🟡 Basique | SkipToContent, LiveRegion, mais keyboard incomplet |
| **SEO** | 5/10 | 🟡 Basique | SEOHead, StructuredData, mais robots.txt manquant |
| **Analytics** | 4/10 | 🟡 Limité | GA4 configuré, mais tracking events limité |

### Légende
- ✅ **8-10** : Excellent, maintenir
- 🟡 **5-7** : Moyen, améliorations recommandées
- ⚠️ **0-4** : Critique, action immédiate requise

---

## 🔍 État des lieux détaillé

### ✅ Ce qui EST déjà implémenté (À conserver)

#### Backend

**Architecture** :
- ✅ TypeScript strict mode (tsconfig strict: true)
- ✅ Structure modulaire (routes → controllers → services)
- ✅ Error handling middleware
- ✅ Input validation helpers (validateTextInput, validateNumericInput)
- ✅ Logger custom (logger.ts avec niveaux debug/info/warn/error)

**Sécurité** :
- ✅ CSRF Protection (middleware csrf.ts avec session tokens)
- ✅ JWT httpOnly cookies (authenticateToken middleware)
- ✅ 8 Rate Limiters granulaires (auth 20req/5min, upload 10req/1min, etc.)
- ✅ Helmet.js configuré (CSP, HSTS, X-Frame-Options)
- ✅ Audit logs complets (audit_logs table)
- ✅ CORS strict whitelist

**Performance** :
- ✅ Compression Brotli active (backend/server.ts:107-122)
- ✅ Parallel queries (Dashboard 800ms → 97ms)
- ✅ 30+ Database indexes documentés (backend/docs/DATABASE_INDEXES.md)
- ✅ Redis system prêt (backend/config/redis.ts) - non activé

**API** :
- ✅ Swagger UI interactive (http://localhost:8080/api-docs)
- ✅ OpenAPI 3.0 spec complète (backend/config/swagger.ts)
- ✅ Health check endpoint (/api/health)

**Tests** :
- ✅ 33 tests backend (middleware auth + csrf)
- ✅ Coverage 85%+ middleware critiques
- ✅ Jest + Supertest configurés

**Monitoring** :
- ✅ Sentry frontend + backend (config/sentry.ts)
- ✅ Performance traces (10% sampling)
- ✅ Custom spans database queries
- ✅ Breadcrumbs contexte utilisateur

#### Frontend

**Architecture** :
- ✅ TypeScript strict mode
- ✅ React 19 + React Router 7
- ✅ Contexts (Auth, CSRF, Modal, Theme)
- ✅ Custom hooks (useSecureFetch, useEstablishments, useEmployees, etc.)
- ✅ Error boundaries (ErrorBoundary component)
- ✅ Lazy loading routes admin (React.lazy)

**Features** :
- ✅ Système cartes ergonomiques (9 zones, 322 positions)
- ✅ Drag & drop admin pour positionnement
- ✅ HTML5 Canvas pour routes
- ✅ CRUD complet (employées, établissements, reviews)
- ✅ Recherche avancée multi-critères
- ✅ Favoris utilisateurs
- ✅ Upload images Cloudinary
- ✅ Establishment Owners System (v10.1)
- ✅ Employee Claim System (v10.0)

**Performance** :
- ✅ React Query cache intelligent
- ✅ Lazy loading images (LazyImage component)
- ✅ Code splitting routes

**i18n** :
- ✅ react-i18next configuré (utils/i18n.ts)
- ✅ 4 langues (EN, TH, RU, CN)
- ✅ LanguageSelector component (dropdown + inline modes)
- ✅ Détection auto langue navigateur
- ✅ Persistance localStorage
- ✅ 9 composants traduits : Header, MapSidebar, PattayaMap, MobileMapMenu, LoadingFallback, SearchPage, SearchFilters, SearchResults, LoginForm

**Accessibilité** :
- ✅ SkipToContent component
- ✅ LiveRegion pour annonces
- ✅ aria-label sur composants interactifs
- ✅ Focus management dans modals

**SEO** :
- ✅ SEOHead component (react-helmet-async)
- ✅ StructuredData component (JSON-LD)
- ✅ Meta tags dynamiques

**Analytics** :
- ✅ Google Analytics 4 configuré (utils/analytics.ts)
- ✅ PageTracker component

**Documentation** :
- ✅ CLAUDE.md (850 lignes, guide complet)
- ✅ README.md à jour
- ✅ ROADMAP.md détaillé (11 features)
- ✅ 15+ fichiers docs techniques

---

### ❌ Ce qui MANQUE (À implémenter)

#### Tests

**Backend (Priorité critique)** :
- ❌ 0 tests controllers (establishmentController, employeeController, authController, etc.)
- ❌ 0 tests routes integration (GET/POST/PUT/DELETE endpoints)
- ❌ 0 tests services (Supabase queries, Cloudinary uploads)
- ❌ 0 tests helpers (validation, pagination, logger)

**Frontend** :
- ❌ 0 tests composants React
- ❌ 0 tests hooks (useSecureFetch, useEstablishments, etc.)
- ❌ 0 tests contexts (AuthContext, CSRFContext, etc.)
- ❌ 0 tests E2E (Playwright installé mais non utilisé)

**Coverage actuel** :
- Backend : ~30% (seulement middleware)
- Frontend : ~0%

**Objectif** :
- Backend : 70%+
- Frontend : 50%+
- E2E : 20 scenarios critiques

#### i18n (Priorité haute)

**Composants NON traduits** (36/45) :

**Authentification** (3) :
- ❌ RegisterForm (src/components/Auth/RegisterForm.tsx)
- ❌ MultiStepRegisterForm (src/components/Auth/MultiStepRegisterForm.tsx)
- ❌ [ForgotPassword/ResetPassword si existants]

**Profils** (5) :
- ❌ EmployeeProfileWizard (src/components/Employee/EmployeeProfileWizard.tsx)
- ❌ EditMyProfileModal (src/components/Employee/EditMyProfileModal.tsx)
- ❌ ClaimEmployeeModal (src/components/Employee/ClaimEmployeeModal.tsx)
- ❌ BarDetailPage (src/components/Bar/BarDetailPage.tsx)
- ❌ UserDashboard (src/components/User/UserDashboard.tsx)
- ❌ MyEstablishmentsPage (src/components/MyEstablishmentsPage.tsx) - v10.1 Owner Dashboard

**Admin Panel** (8) :
- ❌ AdminDashboard (src/components/Admin/AdminDashboard.tsx)
- ❌ AdminPanel (src/components/Admin/AdminPanel.tsx)
- ❌ UsersAdmin (src/components/Admin/UsersAdmin.tsx)
- ❌ EmployeesAdmin (src/components/Admin/EmployeesAdmin.tsx)
- ❌ EstablishmentsAdmin (src/components/Admin/EstablishmentsAdmin.tsx)
- ❌ EstablishmentOwnersAdmin (src/components/Admin/EstablishmentOwnersAdmin.tsx) - v10.1
- ❌ CommentsAdmin (src/components/Admin/CommentsAdmin.tsx)
- ❌ ConsumablesAdmin (src/components/Admin/ConsumablesAdmin.tsx)
- ❌ EmployeeClaimsAdmin (src/components/Admin/EmployeeClaimsAdmin.tsx)

**Formulaires** (6) :
- ❌ EmployeeForm (src/components/Forms/EmployeeForm.tsx)
- ❌ EmployeeFormContent (src/components/Forms/EmployeeFormContent.tsx)
- ❌ EstablishmentForm (src/components/Forms/EstablishmentForm.tsx)
- ❌ EstablishmentEditModal (src/components/Forms/EstablishmentEditModal.tsx)
- ❌ OwnerEstablishmentEditModal (src/components/OwnerEstablishmentEditModal.tsx) - v10.1
- ❌ ReviewForm (src/components/Review/ReviewForm.tsx)

**Reviews** (3) :
- ❌ ReviewsList (src/components/Review/ReviewsList.tsx)
- ❌ ReviewsModal (src/components/Review/ReviewsModal.tsx)
- ❌ UserRating (src/components/Review/UserRating.tsx)

**Layout & Common** (7) :
- ❌ Modal (src/components/Common/Modal.tsx)
- ❌ PhotoGalleryModal (src/components/Common/PhotoGalleryModal.tsx)
- ❌ ErrorFallback (src/components/Common/ErrorFallback.tsx)
- ❌ Toast notifications (react-hot-toast messages)
- ❌ Breadcrumb (src/components/Common/Breadcrumb.tsx)
- ❌ [Footer si existe]
- ❌ Error pages (404, 500 si existent)

**Map** (4) :
- ❌ ZoneSelector (src/components/Map/ZoneSelector.tsx)
- ❌ EstablishmentListView (src/components/Map/EstablishmentListView.tsx)
- ❌ EmployeesGridView (src/components/Map/EmployeesGridView.tsx)
- ❌ EmployeesListModal (src/components/Map/EmployeesListModal.tsx)

**Estimation effort** : 4 jours (0.5j par composant × 36 = 18j → optimisé 4j avec patterns réutilisables)

#### Features Roadmap (11 features non implémentées)

**Priorité Haute** 🔴 :
1. ❌ **Dark Mode** (2j) - Toggle thème sombre
2. ❌ **Vérification Profils** (2j) - Badge "✓ Vérifié"
3. ❌ **Notifications Push PWA** (5j) - Service Worker + Firebase
4. ❌ **Freemium Model** (5j) - Plans FREE/PREMIUM, Stripe

**Priorité Moyenne** 🟡 :
5. ❌ **Historique Visites** (2j) - Timeline bars visités
6. ❌ **Mode Hors Ligne** (3j) - Service Worker cache
7. ❌ **Système Tips** (7j) - Pourboires digitaux (vérifier légalité)
8. ❌ **Gamification** (4j) - Points, badges, niveaux
9. ❌ **Reviews Améliorées** (3j) - Photos, votes utile
10. ❌ **Publicité Ciblée** (4j) - Featured listings, bannières

**Priorité Basse** 🟢 :
11. ❌ **Dark Mode UI Polish** (optionnel après implémentation basique)

**Effort total roadmap** : 41 jours (voir docs/features/ROADMAP.md)

#### Accessibilité

- ❌ Tests keyboard navigation complets
- ❌ Contrast ratios vérifiés (theme nightlife sombre)
- ❌ Screen reader testing (NVDA, JAWS, VoiceOver)
- ❌ Focus visible styles cohérents
- ❌ ARIA labels complets sur tous composants

**Estimation effort** : 3 jours

#### SEO

- ❌ robots.txt (public/robots.txt)
- ❌ sitemap.xml généré dynamiquement
- ❌ Meta tags Open Graph complets
- ❌ Twitter Cards
- ❌ Canonical URLs
- ❌ hreflang tags (i18n SEO)

**Estimation effort** : 2 jours

#### Performance

- ❌ Bundle analysis régulier (npm run analyze)
- ❌ Lazy load images systématique (react-lazyload)
- ❌ Service Worker cache (PWA)
- ❌ Preload/prefetch ressources critiques
- ❌ Core Web Vitals monitoring continu

**Estimation effort** : 2 jours

#### Monitoring & Logs

- ❌ Winston logger au lieu de console.log (6 occurrences trouvées)
- ❌ Niveaux logs standardisés (debug/info/warn/error)
- ❌ Rotation logs
- ❌ Uptime monitoring (UptimeRobot, Pingdom)

**Estimation effort** : 1 jour

#### Database

- ❌ Système migrations versionné (Prisma, Knex, Flyway)
- ❌ Seeds automatisés par environnement
- ❌ Stratégie backup documentée
- ❌ Test restore régulier
- ❌ RLS policies Supabase documentées

**Estimation effort** : 2 jours (low priority, Supabase gère)

#### Analytics

- ❌ Event tracking complet (registration, favorite, review, etc.)
- ❌ Funnel analysis (conversion tracking)
- ❌ Heatmaps (Hotjar, Clarity)
- ❌ User session recording

**Estimation effort** : 2 jours

---

## 🔴 PHASE 1 : Fondations Critiques (6j)

### Objectif
Établir filet de sécurité qualité code pour développement solo.

### 1.1 Tests Backend - Controllers (3j)

#### Pourquoi c'est critique ?
- Développement solo = risque régression élevé
- 0 tests controllers actuellement
- Controllers = business logic critique

#### Tests à créer

**backend/src/controllers/__tests__/establishmentController.test.ts** (1j)

```typescript
// Tests à implémenter :
- [ ] GET /api/establishments - Liste tous établissements
- [ ] GET /api/establishments/:id - Récupère établissement par ID
- [ ] POST /api/establishments - Crée nouvel établissement (admin)
- [ ] PUT /api/establishments/:id - Update établissement (admin)
- [ ] DELETE /api/establishments/:id - Supprime établissement (admin)
- [ ] GET /api/establishments?zone=soi6 - Filtre par zone
- [ ] GET /api/establishments?category=bar - Filtre par catégorie
- [ ] POST /api/establishments/:id/photos - Upload photo
- [ ] DELETE /api/establishments/:id/photos/:photoId - Supprime photo
- [ ] Validation : champs requis (name, zone, category)
- [ ] Validation : grid_row/grid_col dans limites zone
- [ ] Authorization : seul admin peut créer/modifier
- [ ] Error handling : 404 si établissement inexistant
- [ ] Error handling : 400 si validation échoue
```

**backend/src/controllers/__tests__/employeeController.test.ts** (1j)

```typescript
// Tests à implémenter :
- [ ] GET /api/employees - Liste toutes employées
- [ ] GET /api/employees/:id - Récupère employée par ID
- [ ] POST /api/employees - Crée nouvelle employée
- [ ] POST /api/employees/my-profile - Crée profil self-claimed
- [ ] PUT /api/employees/:id - Update employée
- [ ] DELETE /api/employees/:id - Supprime employée (admin)
- [ ] GET /api/employees?status=approved - Filtre par status
- [ ] GET /api/employees?nationality=thai - Filtre par nationalité
- [ ] POST /api/employees/:id/claim - Claim profil employée (v10.0)
- [ ] Validation : âge entre 18-99
- [ ] Validation : photo_url format URL valide
- [ ] Authorization : user peut créer profil, admin peut tout
- [ ] Error handling : 403 si pas autorisé
```

**backend/src/controllers/__tests__/authController.test.ts** (0.5j)

```typescript
// Tests à implémenter :
- [ ] POST /api/auth/register - Inscription utilisateur
- [ ] POST /api/auth/login - Connexion utilisateur
- [ ] POST /api/auth/logout - Déconnexion
- [ ] POST /api/auth/refresh - Refresh token JWT
- [ ] Validation : email format valide
- [ ] Validation : password minimum 8 caractères
- [ ] Hash password bcrypt
- [ ] JWT token généré correctement
- [ ] httpOnly cookie set
- [ ] Rate limiting respecté (20 req/5min)
- [ ] Error handling : 401 si credentials invalides
- [ ] Error handling : 409 si email déjà existant
```

**backend/src/controllers/__tests__/commentController.test.ts** (0.5j)

```typescript
// Tests à implémenter :
- [ ] GET /api/comments - Liste tous commentaires
- [ ] GET /api/comments?establishment_id=xxx - Filtre par établissement
- [ ] POST /api/comments - Crée nouveau commentaire
- [ ] PUT /api/comments/:id - Update commentaire (owner)
- [ ] DELETE /api/comments/:id - Supprime commentaire (owner/admin)
- [ ] Validation : rating entre 1-5
- [ ] Validation : text minimum 10 caractères
- [ ] Authorization : user connecté uniquement
- [ ] Moderation : status pending par défaut
- [ ] Error handling : 403 si pas owner
```

### 1.2 Tests Backend - Routes Integration (2j)

#### Pourquoi c'est critique ?
- Tests middleware (auth, CSRF) existent ✅
- Tests endpoints end-to-end manquants

#### Tests à créer

**backend/src/routes/__tests__/establishments.integration.test.ts** (0.5j)

```typescript
// Tests à implémenter :
- [ ] GET /api/establishments - 200 OK, retourne array
- [ ] GET /api/establishments/:id - 200 OK avec établissement
- [ ] GET /api/establishments/invalid-uuid - 400 Bad Request
- [ ] POST /api/establishments (sans auth) - 401 Unauthorized
- [ ] POST /api/establishments (user) - 403 Forbidden
- [ ] POST /api/establishments (admin) - 201 Created
- [ ] POST /api/establishments (sans CSRF token) - 403 Forbidden
- [ ] PUT /api/establishments/:id (admin) - 200 OK
- [ ] DELETE /api/establishments/:id (admin) - 204 No Content
```

**backend/src/routes/__tests__/employees.integration.test.ts** (0.5j)

```typescript
// Tests similaires pour employees routes
```

**backend/src/routes/__tests__/auth.integration.test.ts** (0.5j)

```typescript
// Tests flow complet auth
- [ ] Register → Login → Access protected route
- [ ] Login avec mauvais credentials → 401
- [ ] Refresh token workflow
- [ ] Logout → Cookie cleared
```

**backend/src/routes/__tests__/admin.integration.test.ts** (0.5j)

```typescript
// Tests routes admin
- [ ] /api/admin/* (sans auth) - 401
- [ ] /api/admin/* (user) - 403
- [ ] /api/admin/* (admin) - 200
- [ ] /api/admin/stats - Dashboard stats
```

### 1.3 Sécurité Dépendances (1j)

#### Checklist

```bash
# Backend
- [ ] cd backend && npm audit
- [ ] npm audit fix (si pas de breaking changes)
- [ ] Documenter versions critiques dans backend/package.json
- [ ] Vérifier vulnérabilités high/critical (0 tolérance)
- [ ] Créer fichier backend/SECURITY_DEPENDENCIES.md

# Frontend
- [ ] npm audit
- [ ] npm audit fix
- [ ] Documenter versions critiques dans package.json
- [ ] Vérifier vulnérabilités high/critical
- [ ] Créer fichier SECURITY_DEPENDENCIES.md

# Documentation
- [ ] Créer docs/development/DEPENDENCY_MANAGEMENT.md
- [ ] Documenter process update dépendances
- [ ] Lister dépendances critiques (jwt, bcrypt, helmet, etc.)
- [ ] Établir calendrier review (mensuel)
```

#### Dépendances critiques à surveiller

**Backend** :
- `jsonwebtoken` (auth)
- `bcryptjs` (passwords)
- `helmet` (security headers)
- `express-rate-limit` (rate limiting)
- `@supabase/supabase-js` (database)

**Frontend** :
- `react`, `react-dom` (core)
- `react-router-dom` (routing)
- `@tanstack/react-query` (data fetching)
- `axios` (HTTP client)

### Checklist Phase 1

```
Tests Backend Controllers (3j)
- [ ] establishmentController.test.ts (1j)
- [ ] employeeController.test.ts (1j)
- [ ] authController.test.ts (0.5j)
- [ ] commentController.test.ts (0.5j)

Tests Backend Routes Integration (2j)
- [ ] establishments.integration.test.ts (0.5j)
- [ ] employees.integration.test.ts (0.5j)
- [ ] auth.integration.test.ts (0.5j)
- [ ] admin.integration.test.ts (0.5j)

Sécurité Dépendances (1j)
- [ ] npm audit backend + fix
- [ ] npm audit frontend + fix
- [ ] Documenter versions critiques
- [ ] Créer SECURITY_DEPENDENCIES.md

Métriques succès Phase 1:
- [ ] Coverage backend : 70%+ (actuellement ~30%)
- [ ] 0 vulnérabilités high/critical
- [ ] Documentation dépendances à jour
```

---

## 🟡 PHASE 2 : Features Business (17j)

### Objectif
Implémenter features roadmap haute priorité pour ROI business immédiat.

### 2.1 i18n Complet (4j)

#### État actuel
- ✅ Infrastructure i18next configurée (utils/i18n.ts)
- ✅ 4 langues (EN, TH, RU, CN)
- ✅ LanguageSelector component
- ✅ 9 composants traduits (20%)
- ❌ 36 composants restants (80%)

#### Stratégie
1. Créer patterns traduction réutilisables
2. Traduire par ordre priorité (fréquence utilisation)
3. Tester chaque langue après traduction

#### Checklist traduction (36 composants)

**Jour 1 : Authentification & Forms (10 composants - 1j)**

```
Auth (3)
- [ ] MultiStepRegisterForm.tsx
  - [ ] Ajouter clés auth.register.* dans locales/*.json
  - [ ] Remplacer "Create account" par t('auth.register.title')
  - [ ] Traduire steps wizard, labels, placeholders

- [ ] RegisterForm.tsx
  - [ ] Migrer vers MultiStep ou harmoniser

- [ ] [ForgotPassword si existe]

Forms (7)
- [ ] EmployeeForm.tsx + EmployeeFormContent.tsx
  - [ ] Clés forms.employee.* (name, age, nationality, etc.)
  - [ ] Traduire labels, placeholders, validation errors

- [ ] EstablishmentForm.tsx
  - [ ] Clés forms.establishment.* (name, address, category, etc.)

- [ ] EstablishmentEditModal.tsx
  - [ ] Réutiliser clés forms.establishment.*

- [ ] OwnerEstablishmentEditModal.tsx (v10.1)
  - [ ] Clés forms.ownerEstablishment.*

- [ ] ReviewForm.tsx
  - [ ] Clés forms.review.* (rating, comment, submit)

- [ ] BasicInfoForm, PricingForm, ServicesForm, SocialMediaForm, OpeningHoursForm
  - [ ] Clés forms.sections.*
```

**Jour 2 : Admin Panel (9 composants - 1j)**

```
Admin Core (2)
- [ ] AdminPanel.tsx
  - [ ] Clés admin.nav.* (dashboard, users, employees, etc.)

- [ ] AdminDashboard.tsx
  - [ ] Clés admin.dashboard.* (stats, charts, recent activity)

Admin Sections (7)
- [ ] UsersAdmin.tsx
  - [ ] Clés admin.users.* (list, edit, roles, ban)

- [ ] EmployeesAdmin.tsx
  - [ ] Clés admin.employees.* (approve, reject, edit)

- [ ] EstablishmentsAdmin.tsx
  - [ ] Clés admin.establishments.*

- [ ] EstablishmentOwnersAdmin.tsx (v10.1)
  - [ ] Clés admin.owners.* (assign, permissions, roles)

- [ ] CommentsAdmin.tsx
  - [ ] Clés admin.comments.* (moderate, approve, delete)

- [ ] ConsumablesAdmin.tsx
  - [ ] Clés admin.consumables.*

- [ ] EmployeeClaimsAdmin.tsx (v10.0)
  - [ ] Clés admin.claims.* (pending, approve, reject)
```

**Jour 3 : Profils & Reviews (8 composants - 1j)**

```
Profils (5)
- [ ] EmployeeProfileWizard.tsx
  - [ ] Clés profile.wizard.* (steps, welcome, instructions)

- [ ] EditMyProfileModal.tsx
  - [ ] Clés profile.editMy.* (edit fields, save, cancel)

- [ ] ClaimEmployeeModal.tsx
  - [ ] Clés profile.claim.* (claim process, verification)

- [ ] BarDetailPage.tsx
  - [ ] Clés establishment.detail.* (info, menu, photos, reviews)

- [ ] UserDashboard.tsx
  - [ ] Clés user.dashboard.* (favorites, history, settings)

- [ ] MyEstablishmentsPage.tsx (v10.1)
  - [ ] Clés owner.dashboard.* (my establishments, stats, edit)

Reviews (3)
- [ ] ReviewsList.tsx
  - [ ] Clés reviews.list.* (sort, filter, empty state)

- [ ] ReviewsModal.tsx
  - [ ] Clés reviews.modal.* (title, close, submit)

- [ ] UserRating.tsx
  - [ ] Clés reviews.rating.* (your rating, average, count)
```

**Jour 4 : Common & Map (9 composants - 1j)**

```
Common (7)
- [ ] Modal.tsx
  - [ ] Clés common.modal.* (close, cancel, confirm)

- [ ] PhotoGalleryModal.tsx
  - [ ] Clés common.gallery.* (previous, next, close)

- [ ] ErrorFallback.tsx
  - [ ] Clés common.error.* (title, message, reload)

- [ ] Toast notifications
  - [ ] Remplacer toast.success("Success!") par t('toast.success')
  - [ ] Créer clés toast.* pour tous messages

- [ ] Breadcrumb.tsx
  - [ ] Clés common.breadcrumb.* (home, back)

- [ ] Error pages (404, 500 si existent)
  - [ ] Clés errors.404.*, errors.500.*

Map (4)
- [ ] ZoneSelector.tsx
  - [ ] Clés map.zones.* (déjà partiellement fait, vérifier)

- [ ] EstablishmentListView.tsx
  - [ ] Clés map.listView.* (sort, grid/list toggle)

- [ ] EmployeesGridView.tsx
  - [ ] Clés map.employeesGrid.*

- [ ] EmployeesListModal.tsx
  - [ ] Clés map.employeesList.*
```

#### Tests traduction

```
- [ ] Tester changement langue Header
- [ ] Vérifier toutes pages en EN
- [ ] Vérifier toutes pages en TH
- [ ] Vérifier toutes pages en RU
- [ ] Vérifier toutes pages en CN
- [ ] Vérifier persistance localStorage
- [ ] Vérifier détection auto navigateur
- [ ] Screenshot chaque page chaque langue (documentation)
```

#### Documentation

```
- [ ] Mettre à jour docs/features/I18N_IMPLEMENTATION.md
- [ ] Ajouter section "Composants traduits" avec checklist 45/45 ✅
- [ ] Créer guide traduction pour contributeurs futurs
```

### 2.2 Dark Mode (2j)

#### État actuel
- ✅ ThemeContext existe (src/contexts/ThemeContext.tsx)
- ✅ ThemeToggle component existe (src/components/Common/ThemeToggle.tsx)
- ❌ Thème dark non implémenté (seulement infrastructure)

#### Implémentation

**Jour 1 : Variables CSS Dark Mode (1j)**

```
- [ ] Créer src/styles/themes/dark.css
  - [ ] Variables colors dark (backgrounds, text, borders)
  - [ ] Variables nightlife-dark (cyan/violet avec moins de luminosité)
  - [ ] Variables glassmorphism dark (backdrop-filter)

Exemple:
:root[data-theme="dark"] {
  /* Backgrounds */
  --color-bg-primary: #0a0a2e;
  --color-bg-secondary: #16213e;
  --color-bg-tertiary: #240046;

  /* Text */
  --color-text-primary: #ffffff;
  --color-text-secondary: #b8b8d4;
  --color-text-muted: #8e8ea9;

  /* Nightlife accents (moins lumineux) */
  --color-primary: #00b8d4; /* cyan moins intense */
  --color-secondary: #7b3caf; /* violet moins intense */
  --color-accent: #d81b60; /* rose moins intense */
}

- [ ] Modifier src/contexts/ThemeContext.tsx
  - [ ] Ajouter state theme: 'light' | 'dark'
  - [ ] Ajouter fonction toggleTheme()
  - [ ] Persistance localStorage 'pattamap_theme'
  - [ ] Appliquer data-theme sur <html>

- [ ] Tester tous composants en dark mode
  - [ ] Vérifier contraste texte/background (WCAG AA minimum)
  - [ ] Ajuster si nécessaire
```

**Jour 2 : UI Polish & Tests (1j)**

```
- [ ] Améliorer ThemeToggle component
  - [ ] Icône 🌙 (dark) / ☀️ (light)
  - [ ] Animation smooth transition
  - [ ] Tooltip "Switch to dark/light mode"

- [ ] Ajouter dans Header desktop (users non-connectés)
  - [ ] Position: à côté LanguageSelector

- [ ] Ajouter dans User Menu (users connectés)
  - [ ] Position: avant "Language"

- [ ] Ajouter dans Mobile Menu (tous users)
  - [ ] Section "Preferences"

- [ ] Tests
  - [ ] Toggle dark/light plusieurs fois
  - [ ] Vérifier persistance localStorage
  - [ ] Vérifier tous composants lisibles
  - [ ] Screenshot avant/après pour documentation

- [ ] Documentation
  - [ ] Ajouter section dans docs/features/DARK_MODE.md
  - [ ] Screenshots light vs dark
```

### 2.3 Vérification Profils (2j)

#### Objectif
Badge "✓ Vérifié" sur employées authentifiées → Confiance +80%

#### Implémentation

**Jour 1 : Backend + Database (1j)**

```
Database
- [ ] Ajouter colonne is_verified BOOLEAN DEFAULT false à table employees
- [ ] Migration SQL:
  ALTER TABLE employees ADD COLUMN is_verified BOOLEAN DEFAULT false;
  ALTER TABLE employees ADD COLUMN verified_at TIMESTAMP WITH TIME ZONE;
  ALTER TABLE employees ADD COLUMN verified_by UUID REFERENCES users(id);

- [ ] Créer table verification_requests (optionnel, pour workflow)
  CREATE TABLE verification_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES employees(id),
    user_id UUID REFERENCES users(id),
    status TEXT CHECK (status IN ('pending', 'approved', 'rejected')),
    proof_photo_url TEXT, -- Document ID flouté
    submitted_at TIMESTAMP DEFAULT NOW(),
    reviewed_at TIMESTAMP,
    reviewed_by UUID REFERENCES users(id)
  );

Backend
- [ ] Route POST /api/employees/:id/verify-request
  - [ ] Upload photo ID floutée (Cloudinary)
  - [ ] Créer verification_request status pending
  - [ ] Notification admin

- [ ] Route POST /api/admin/employees/:id/verify (admin only)
  - [ ] Update is_verified = true
  - [ ] Set verified_at, verified_by
  - [ ] Notification employée

- [ ] Route POST /api/admin/verification-requests/:id/approve
  - [ ] Approve verification request
  - [ ] Update employee is_verified

- [ ] Route GET /api/admin/verification-requests
  - [ ] Liste pending requests
  - [ ] Filtre status
```

**Jour 2 : Frontend UI (1j)**

```
Components
- [ ] Badge "✓ Vérifié" component
  - [ ] Créer src/components/Common/VerifiedBadge.tsx
  - [ ] Icône checkmark + texte "Verified"
  - [ ] Tooltip "This profile has been verified by PattaMap team"
  - [ ] Styles: gradient cyan/vert, glow effect

- [ ] Ajouter badge dans EmployeeCard
  - [ ] Position: coin supérieur droit photo

- [ ] Ajouter badge dans EmployeeProfile
  - [ ] Position: à côté du nom

- [ ] Bouton "Request Verification" (EditMyProfileModal)
  - [ ] Si is_verified = false
  - [ ] Modal upload photo ID
  - [ ] Instructions flouter infos sensibles

- [ ] Admin: VerificationRequestsAdmin.tsx
  - [ ] Liste pending requests
  - [ ] Prévisualiser photo ID
  - [ ] Boutons Approve/Reject
  - [ ] Raison rejet (textarea)

Filters
- [ ] Ajouter filtre "Verified only" dans SearchFilters
  - [ ] Checkbox "Show verified profiles only"
  - [ ] Filter API query: ?verified=true

- [ ] Ajouter indicateur dans EstablishmentsAdmin
  - [ ] Colonne "Verified employees: 12/45 (27%)"

Documentation
- [ ] Créer docs/features/PROFILE_VERIFICATION.md
  - [ ] Workflow admin
  - [ ] Workflow user
  - [ ] Critères vérification
```

### 2.4 Historique Visites (2j)

#### Objectif
Timeline des bars visités → Fidélisation +30%

#### Implémentation

**Jour 1 : Backend + Database (1j)**

```
Database
- [ ] Créer table visit_history
  CREATE TABLE visit_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
    visited_at DATE NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    private_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, establishment_id, visited_at)
  );

- [ ] Index pour performance
  CREATE INDEX idx_visit_history_user ON visit_history(user_id);
  CREATE INDEX idx_visit_history_establishment ON visit_history(establishment_id);
  CREATE INDEX idx_visit_history_date ON visit_history(visited_at DESC);

Backend Routes
- [ ] POST /api/visit-history
  - [ ] Body: { establishment_id, visited_at, rating?, private_notes? }
  - [ ] Auth required
  - [ ] CSRF protection

- [ ] GET /api/visit-history/me
  - [ ] Query: ?sort=date&order=desc&limit=50
  - [ ] Auth required
  - [ ] Return user's visit history avec establishment details

- [ ] PUT /api/visit-history/:id
  - [ ] Update rating/notes
  - [ ] Auth + ownership check

- [ ] DELETE /api/visit-history/:id
  - [ ] Auth + ownership check

- [ ] GET /api/establishments/:id/visit-count
  - [ ] Count visits par établissement (public)
  - [ ] Metric pour popularité
```

**Jour 2 : Frontend UI (1j)**

```
Components
- [ ] VisitHistoryPage.tsx
  - [ ] Timeline view (liste chronologique)
  - [ ] Card par visite: date, établissement, rating, notes
  - [ ] Filtres: date range, zone, rating
  - [ ] Sort: date (desc/asc), rating
  - [ ] Export CSV button (future)

- [ ] Bouton "Mark as visited" sur BarDetailPage
  - [ ] Position: près du bouton "Favorite"
  - [ ] Modal: date picker + rating + notes (optionnel)
  - [ ] Confirmation toast

- [ ] Section "Recent visits" dans UserDashboard
  - [ ] 5 dernières visites
  - [ ] Link "View all history"

- [ ] Badge "X visits" sur EstablishmentCard
  - [ ] Afficher nombre total visites community
  - [ ] Tooltip "12 users visited this place"

Styles
- [ ] Timeline vertical avec ligne connectant cards
- [ ] Animations fade-in cards
- [ ] Empty state: "No visits yet. Start exploring!"

i18n
- [ ] Créer clés visitHistory.* dans locales/*.json
  - [ ] visitHistory.title: "Visit History"
  - [ ] visitHistory.markVisited: "Mark as visited"
  - [ ] visitHistory.privateNotes: "Private notes (only you can see)"
  - [ ] etc.
```

### 2.5 Reviews Améliorées (3j)

#### Objectif
Photos + votes utile → Confiance +60%

#### Implémentation

**Jour 1 : Photos dans avis (1j)**

```
Database
- [ ] Créer table comment_photos
  CREATE TABLE comment_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
  );

- [ ] Index
  CREATE INDEX idx_comment_photos_comment ON comment_photos(comment_id);

- [ ] Ajouter limite 3 photos max par avis (constraint business logic)

Backend
- [ ] Route POST /api/comments/:id/photos
  - [ ] Upload photo Cloudinary
  - [ ] Auth + ownership check
  - [ ] Max 3 photos

- [ ] Route DELETE /api/comments/:id/photos/:photoId
  - [ ] Auth + ownership check
  - [ ] Delete from Cloudinary

Frontend
- [ ] Modifier ReviewForm
  - [ ] Ajouter ImageUploadPreview (réutiliser existant)
  - [ ] Max 3 photos
  - [ ] Preview avant submit

- [ ] Afficher photos dans ReviewsList
  - [ ] Gallery thumbnails (3 max)
  - [ ] Click → PhotoGalleryModal
```

**Jour 2 : Vote "Utile" (1j)**

```
Database
- [ ] Créer table comment_votes
  CREATE TABLE comment_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vote_type TEXT CHECK (vote_type IN ('helpful', 'not_helpful')),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(comment_id, user_id)
  );

- [ ] Ajouter colonnes à comments table
  ALTER TABLE comments ADD COLUMN helpful_count INTEGER DEFAULT 0;
  ALTER TABLE comments ADD COLUMN not_helpful_count INTEGER DEFAULT 0;

- [ ] Index
  CREATE INDEX idx_comment_votes_comment ON comment_votes(comment_id);

Backend
- [ ] Route POST /api/comments/:id/vote
  - [ ] Body: { vote_type: 'helpful' | 'not_helpful' }
  - [ ] Auth required
  - [ ] Update comment helpful_count
  - [ ] UPSERT: change vote si déjà voté

- [ ] Route DELETE /api/comments/:id/vote
  - [ ] Remove vote
  - [ ] Update counts

Frontend
- [ ] Boutons 👍 Helpful / 👎 Not helpful
  - [ ] Position: bas de chaque review
  - [ ] Display count: "42 found this helpful"
  - [ ] Highlight si user a voté
  - [ ] Disable si user = author review
```

**Jour 3 : Badge "Visite vérifiée" (1j)**

```
Backend
- [ ] Ajouter colonne verified_visit à comments
  ALTER TABLE comments ADD COLUMN verified_visit BOOLEAN DEFAULT false;

- [ ] Logic: verified_visit = true si user a visit_history pour cet établissement
  - [ ] Check lors de POST /api/comments
  - [ ] Vérifier date visite récente (< 30 jours recommandé)

Frontend
- [ ] Badge "✓ Verified visit" sur ReviewCard
  - [ ] Position: à côté nom auteur
  - [ ] Tooltip: "This user visited [Establishment] recently"
  - [ ] Icône checkmark + texte

- [ ] Filtre "Verified visits only" dans ReviewsList
  - [ ] Checkbox filter

i18n
- [ ] Ajouter clés reviews.verified.*
  - [ ] reviews.verified.badge: "Verified visit"
  - [ ] reviews.verified.tooltip: "This user visited this place recently"
```

### 2.6 Gamification (4j)

#### Objectif
Points, badges, niveaux → Engagement +50%

#### Implémentation

**Jour 1-2 : Système de points (2j)**

```
Database
- [ ] Créer table user_points
  CREATE TABLE user_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    points INTEGER NOT NULL,
    entity_type TEXT, -- 'comment', 'employee', 'establishment', etc.
    entity_id UUID,
    created_at TIMESTAMP DEFAULT NOW()
  );

- [ ] Ajouter colonne total_points à users
  ALTER TABLE users ADD COLUMN total_points INTEGER DEFAULT 0;
  ALTER TABLE users ADD COLUMN level TEXT DEFAULT 'bronze';

- [ ] Index
  CREATE INDEX idx_user_points_user ON user_points(user_id);

Backend
- [ ] Service pointsService.ts
  - [ ] Function awardPoints(userId, action, points, entityType, entityId)
  - [ ] Trigger après actions:
    * +10 pts: Écrire review
    * +5 pts: Ajouter photo review
    * +50 pts: Ajouter profil employée approved
    * +100 pts: 10 visites
    * +20 pts: Inviter ami (future)
    * +3 pts: Vote helpful

  - [ ] Function calculateLevel(totalPoints)
    * 0-99 pts: Bronze 🥉
    * 100-499 pts: Silver 🥈
    * 500-1499 pts: Gold 🥇
    * 1500-4999 pts: Diamond 💎
    * 5000+ pts: VIP 👑

  - [ ] Function updateUserLevel(userId)
    * Recalcule level selon total_points
    * Update users table

- [ ] Routes
  - [ ] GET /api/users/me/points - Historique points
  - [ ] GET /api/leaderboard?limit=100 - Top users

Frontend
- [ ] PointsBadge component
  - [ ] Display: "🥇 Gold - 742 pts"
  - [ ] Position: User menu dropdown

- [ ] PointsNotification toast
  - [ ] Afficher quand user gagne points
  - [ ] Animation: +10 pts ⬆️

- [ ] Section Points dans UserDashboard
  - [ ] Barre progression vers prochain niveau
  - [ ] Historique gains récents
  - [ ] Boutons "Ways to earn points"
```

**Jour 3-4 : Badges & Achievements (2j)**

```
Database
- [ ] Créer table badges
  CREATE TABLE badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT, -- emoji ou URL
    requirement_type TEXT, -- 'points', 'actions_count', 'streak', etc.
    requirement_value INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
  );

- [ ] Seed badges
  INSERT INTO badges (name, description, icon, requirement_type, requirement_value) VALUES
  ('Explorer', 'Visit 10 different establishments', '🌟', 'visit_count', 10),
  ('Critic', 'Write 20 reviews', '📝', 'review_count', 20),
  ('Photographer', 'Upload 50 photos', '📸', 'photo_count', 50),
  ('Ambassador', 'Reach Gold level', '🏆', 'level', 3),
  ('Early Adopter', 'Registered in first 100 users', '🚀', 'user_rank', 100),
  ('Consistent', 'Login 7 days in a row', '🔥', 'streak', 7);

- [ ] Créer table user_badges
  CREATE TABLE user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    badge_id UUID REFERENCES badges(id),
    earned_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, badge_id)
  );

Backend
- [ ] Service badgesService.ts
  - [ ] Function checkAndAwardBadges(userId)
    * Vérifie tous badges
    * Award si requirements met

  - [ ] Trigger après actions importantes

- [ ] Routes
  - [ ] GET /api/badges - Liste tous badges
  - [ ] GET /api/users/me/badges - Badges user
  - [ ] GET /api/users/:id/badges - Badges public

Frontend
- [ ] BadgesList component
  - [ ] Grid badges earned + locked
  - [ ] Locked: grayscale + padlock icon
  - [ ] Tooltip: requirement to unlock

- [ ] BadgeNotification modal
  - [ ] Animation quand badge unlocked
  - [ ] "Congratulations! You earned [Badge Name]"
  - [ ] Share social media button (future)

- [ ] Section Badges dans UserDashboard
  - [ ] Display earned badges
  - [ ] Progress bars pour badges en cours

- [ ] BadgesDisplay mini dans Header user menu
  - [ ] Top 3 badges
  - [ ] Count: "+12 more"

i18n
- [ ] Créer clés gamification.* dans locales/*.json
  - [ ] gamification.points.earned: "You earned {points} points!"
  - [ ] gamification.level.bronze: "Bronze"
  - [ ] gamification.badge.unlocked: "Badge unlocked!"
  - [ ] etc.
```

### Checklist Phase 2

```
i18n Complet (4j)
- [ ] Jour 1: Auth & Forms (10 composants)
- [ ] Jour 2: Admin Panel (9 composants)
- [ ] Jour 3: Profils & Reviews (8 composants)
- [ ] Jour 4: Common & Map (9 composants)
- [ ] Tests changement langue
- [ ] Documentation I18N_IMPLEMENTATION.md

Dark Mode (2j)
- [ ] Jour 1: Variables CSS + ThemeContext
- [ ] Jour 2: UI Polish + Tests
- [ ] Documentation DARK_MODE.md

Vérification Profils (2j)
- [ ] Jour 1: Backend + Database
- [ ] Jour 2: Frontend UI + Admin
- [ ] Documentation PROFILE_VERIFICATION.md

Historique Visites (2j)
- [ ] Jour 1: Backend + Database
- [ ] Jour 2: Frontend UI
- [ ] i18n visitHistory.*

Reviews Améliorées (3j)
- [ ] Jour 1: Photos dans avis
- [ ] Jour 2: Vote "Utile"
- [ ] Jour 3: Badge "Visite vérifiée"
- [ ] i18n reviews.verified.*

Gamification (4j)
- [ ] Jour 1-2: Système points + levels
- [ ] Jour 3-4: Badges & achievements
- [ ] i18n gamification.*

Métriques succès Phase 2:
- [ ] i18n: 45/45 composants traduits (100%)
- [ ] Dark mode fonctionnel 4 langues
- [ ] Vérification profils active avec workflow admin
- [ ] Historique visites utilisé par beta testers
- [ ] Reviews avec photos + votes
- [ ] Gamification: points + badges actifs
```

---

## 🟢 PHASE 3 : Qualité UX (7j)

### Objectif
Améliorer accessibilité, SEO et performance pour lancement public.

### 3.1 Accessibilité WCAG 2.1 AA (3j)

#### État actuel
- ✅ SkipToContent component
- ✅ LiveRegion pour annonces
- ✅ aria-label basiques
- ✅ Focus management modals
- ❌ Tests keyboard navigation incomplets
- ❌ Contrast ratios non vérifiés (theme nightlife)
- ❌ Screen reader testing manquant

#### Checklist

**Jour 1 : Keyboard Navigation (1j)**

```
Tests manuels
- [ ] Tab navigation tous composants
- [ ] Shift+Tab navigation reverse
- [ ] Enter/Space activation boutons
- [ ] Escape fermeture modals
- [ ] Arrow keys navigation listes/grids
- [ ] Focus visible sur tous éléments interactifs

Corrections
- [ ] Ajouter tabindex où nécessaire
- [ ] Améliorer focus-visible styles
- [ ] Trap focus dans modals (useFocusTrap hook existe ✅)
- [ ] Skip links additionnels (skip to map, skip to filters)

Tests composants critiques
- [ ] Header navigation (menu hamburger, user menu)
- [ ] SearchFilters (tous filtres accessibles clavier)
- [ ] PattayaMap (navigation zones clavier)
- [ ] Modals (LoginForm, ReviewForm, etc.)
- [ ] Forms (tous champs focusables)
```

**Jour 2 : Contrast & Visual (1j)**

```
Audit Lighthouse
- [ ] Run Lighthouse Accessibility audit
- [ ] Fix tous issues contrast ratio
- [ ] Fix tous missing alt text
- [ ] Fix tous missing labels

Contrast ratios WCAG AA
- [ ] Text normal: minimum 4.5:1
- [ ] Text large (18pt+): minimum 3:1
- [ ] UI components: minimum 3:1
- [ ] Focus indicators: minimum 3:1

Problèmes potentiels theme nightlife
- [ ] Cyan (#00E5FF) sur fond sombre: vérifier contrast
- [ ] Violet (#9B5DE5) sur fond sombre: vérifier contrast
- [ ] Rose (#FF1B8D) sur fond sombre: vérifier contrast
- [ ] Ajuster luminosité si nécessaire

Visual indicators
- [ ] Errors visuels + text (pas que couleur rouge)
- [ ] Loading states clairs
- [ ] Success/error messages descriptifs
- [ ] Hover states distincts de focus states
```

**Jour 3 : Screen Readers (1j)**

```
Tests manuels
- [ ] NVDA (Windows) - gratuit
- [ ] JAWS (Windows) - trial ou payant
- [ ] VoiceOver (macOS) - natif
- [ ] TalkBack (Android) - natif

Tests critiques
- [ ] Header navigation annoncée correctement
- [ ] Map zones annoncées avec context
- [ ] Forms labels associés inputs
- [ ] Modals annoncent ouverture/fermeture
- [ ] Dynamic content changes annoncés (LiveRegion)
- [ ] Images alt text descriptifs

ARIA améliorations
- [ ] aria-live regions pour notifications
- [ ] aria-describedby pour hints/errors
- [ ] aria-expanded pour dropdowns
- [ ] aria-controls pour tabs
- [ ] role="region" pour sections importantes
- [ ] Landmarks (main, nav, aside, footer)

Documentation
- [ ] Créer docs/development/ACCESSIBILITY.md
- [ ] Documenter keyboard shortcuts
- [ ] Documenter ARIA patterns utilisés
- [ ] Checklist WCAG 2.1 AA compliance
```

### 3.2 SEO Basique (2j)

#### État actuel
- ✅ SEOHead component (react-helmet-async)
- ✅ StructuredData component (JSON-LD)
- ✅ Meta tags dynamiques
- ❌ robots.txt manquant
- ❌ sitemap.xml manquant
- ❌ Open Graph incomplet

#### Checklist

**Jour 1 : Fichiers SEO (1j)**

```
public/robots.txt
- [ ] Créer robots.txt
  User-agent: *
  Allow: /
  Disallow: /admin
  Disallow: /api

  Sitemap: https://pattamap.com/sitemap.xml

public/sitemap.xml (manuel ou généré)
- [ ] Option 1: Sitemap statique manuel
  <?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
      <loc>https://pattamap.com/</loc>
      <lastmod>2025-01-15</lastmod>
      <priority>1.0</priority>
    </url>
    <url>
      <loc>https://pattamap.com/search</loc>
      <lastmod>2025-01-15</lastmod>
      <priority>0.8</priority>
    </url>
    <!-- etc. -->
  </urlset>

- [ ] Option 2: Sitemap dynamique (recommandé)
  - [ ] Backend route GET /api/sitemap.xml
  - [ ] Générer XML avec tous établissements
  - [ ] Mettre à jour automatiquement
  - [ ] Cache 24h

public/humans.txt (optionnel mais sympa)
- [ ] Créer humans.txt
  /* TEAM */
  Developer: [Ton nom]
  Site: pattamap.com
  Location: Thailand

  /* THANKS */
  Contributors: PattaMap community

  /* SITE */
  Last update: 2025-01-15
  Language: English, Thai, Russian, Chinese
  Standards: HTML5, CSS3, React
  Components: Node.js, Supabase, Cloudinary
  Software: VS Code, Claude Code
```

**Jour 2 : Meta Tags & Schema (1j)**

```
Open Graph (Facebook/LinkedIn)
- [ ] Vérifier SEOHead.tsx contient:
  <meta property="og:title" content="..." />
  <meta property="og:description" content="..." />
  <meta property="og:image" content="..." />
  <meta property="og:url" content="..." />
  <meta property="og:type" content="website" />
  <meta property="og:locale" content="en_US" />
  <meta property="og:site_name" content="PattaMap" />

Twitter Cards
- [ ] Ajouter dans SEOHead.tsx:
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@pattamap" />
  <meta name="twitter:title" content="..." />
  <meta name="twitter:description" content="..." />
  <meta name="twitter:image" content="..." />

Canonical URLs
- [ ] Ajouter dans SEOHead.tsx:
  <link rel="canonical" href={window.location.href} />

hreflang (i18n SEO)
- [ ] Ajouter dans SEOHead.tsx:
  <link rel="alternate" hreflang="en" href="https://pattamap.com/en" />
  <link rel="alternate" hreflang="th" href="https://pattamap.com/th" />
  <link rel="alternate" hreflang="ru" href="https://pattamap.com/ru" />
  <link rel="alternate" hreflang="zh" href="https://pattamap.com/cn" />
  <link rel="alternate" hreflang="x-default" href="https://pattamap.com" />

Schema.org améliorations
- [ ] Vérifier StructuredData.tsx contient:
  * Organization schema ✅
  * WebSite schema ✅
  * BreadcrumbList schema (à ajouter)
  * LocalBusiness schema pour établissements (à ajouter)
  * Person schema pour employées (optionnel)

- [ ] Créer createBreadcrumbSchema() dans StructuredData.tsx
- [ ] Créer createEstablishmentSchema(establishment) dans StructuredData.tsx

Tests
- [ ] Google Rich Results Test
- [ ] Facebook Sharing Debugger
- [ ] Twitter Card Validator
- [ ] LinkedIn Post Inspector
```

### 3.3 Performance Bundle (2j)

#### État actuel
- ✅ React.lazy() routes admin
- ✅ Compression Brotli backend
- ✅ React Query cache
- ❌ Bundle analysis régulier
- ❌ Images lazy load systématique
- ❌ Service Worker cache

#### Checklist

**Jour 1 : Bundle Analysis & Optimization (1j)**

```
Bundle analysis
- [ ] npm run analyze
- [ ] Identifier top 10 plus gros bundles
- [ ] Vérifier pas de duplicates libraries

Optimisations code splitting
- [ ] Lazy load Map components (CustomSoi6Map, etc.)
  const CustomSoi6Map = React.lazy(() => import('./CustomSoi6Map'));

- [ ] Lazy load heavy libraries
  * react-zoom-pan-pinch (3.7.0) - seulement si utilisé
  * framer-motion (12.23.24) - lazy load animations

- [ ] Route-based splitting amélioré
  * Séparer SearchPage en chunks
  * Séparer BarDetailPage en chunks

Images optimization
- [ ] Lazy load toutes images (react-lazyload)
  npm install react-lazyload
  import LazyLoad from 'react-lazyload';

  <LazyLoad height={200} offset={100}>
    <img src="..." alt="..." />
  </LazyLoad>

- [ ] Utiliser Picture component (existe déjà ✅)
  * WebP format priority
  * Fallback JPEG

- [ ] Cloudinary transformations
  * Auto format (f_auto)
  * Auto quality (q_auto)
  * Responsive sizing (w_auto, c_scale)

Fonts optimization
- [ ] Preload fonts critiques
  <link rel="preload" href="/fonts/..." as="font" crossorigin />

- [ ] font-display: swap pour éviter FOIT
```

**Jour 2 : Core Web Vitals (1j)**

```
Mesures baseline
- [ ] Lighthouse audit (Performance)
- [ ] WebPageTest.org
- [ ] Chrome DevTools Performance tab
- [ ] Documenter métriques actuelles

Objectifs Core Web Vitals
- [ ] LCP (Largest Contentful Paint) < 2.5s
- [ ] FID (First Input Delay) < 100ms
- [ ] CLS (Cumulative Layout Shift) < 0.1
- [ ] TTFB (Time to First Byte) < 600ms
- [ ] FCP (First Contentful Paint) < 1.8s

Optimisations LCP
- [ ] Preload image hero (si existe)
- [ ] Prioritize critical CSS
- [ ] Defer non-critical CSS
- [ ] Minimize render-blocking resources

Optimisations FID
- [ ] Code splitting pour réduire JS initial
- [ ] Defer JavaScript non-critique
- [ ] Break up long tasks (>50ms)

Optimisations CLS
- [ ] Définir width/height sur toutes images
- [ ] Réserver espace pour dynamic content
- [ ] Éviter injections content au-dessus fold
- [ ] Web fonts avec font-display: swap

Monitoring continu
- [ ] Créer script performance.js
  - [ ] Mesurer Core Web Vitals
  - [ ] Envoyer à analytics (GA4 ou custom)
  - [ ] Alert si dégradation

Documentation
- [ ] Créer docs/development/PERFORMANCE_OPTIMIZATION.md
- [ ] Documenter métriques baseline vs optimisé
- [ ] Checklist optimizations futures
```

### Checklist Phase 3

```
Accessibilité WCAG (3j)
- [ ] Jour 1: Keyboard Navigation
  - [ ] Tests manuels tab navigation
  - [ ] Fix focus-visible styles
  - [ ] Trap focus modals

- [ ] Jour 2: Contrast & Visual
  - [ ] Lighthouse audit
  - [ ] Fix contrast ratios WCAG AA
  - [ ] Ajuster theme nightlife si nécessaire

- [ ] Jour 3: Screen Readers
  - [ ] Tests NVDA/JAWS/VoiceOver
  - [ ] Améliorations ARIA
  - [ ] Documentation ACCESSIBILITY.md

SEO Basique (2j)
- [ ] Jour 1: Fichiers SEO
  - [ ] robots.txt
  - [ ] sitemap.xml
  - [ ] humans.txt (optionnel)

- [ ] Jour 2: Meta Tags & Schema
  - [ ] Open Graph complet
  - [ ] Twitter Cards
  - [ ] Canonical URLs
  - [ ] hreflang i18n
  - [ ] Schema.org améliorations
  - [ ] Tests Google Rich Results

Performance Bundle (2j)
- [ ] Jour 1: Bundle Analysis
  - [ ] npm run analyze
  - [ ] Lazy load components lourds
  - [ ] Images lazy load systématique
  - [ ] Fonts optimization

- [ ] Jour 2: Core Web Vitals
  - [ ] Mesures baseline
  - [ ] Optimisations LCP/FID/CLS
  - [ ] Monitoring script
  - [ ] Documentation PERFORMANCE_OPTIMIZATION.md

Métriques succès Phase 3:
- [ ] Lighthouse Accessibility score: 95+
- [ ] WCAG 2.1 AA compliance: 100%
- [ ] Lighthouse SEO score: 95+
- [ ] Lighthouse Performance score: 90+
- [ ] Core Web Vitals: tous "Good" (vert)
```

---

## ❌ À IGNORER (Contexte Solo Local)

### Pourquoi ignorer maintenant ?

Ces éléments n'ont **aucun sens sans infrastructure cloud** :
- Pas de serveurs à déployer
- Pas de collaboration équipe
- Pas de Git remote
- Tout en développement local

### Quand les ajouter ?

➡️ **Lorsque tu auras** :
1. Repo Git remote (GitHub/GitLab)
2. Serveur production (VPS, Vercel, Railway)
3. Besoin collaboration (équipe, contributeurs)
4. Utilisateurs réels (>10 beta testers)

### Liste à ignorer

#### CI/CD Pipeline
- ❌ GitHub Actions / GitLab CI
- ❌ Tests automatisés sur PR
- ❌ Deployment automatique
- ❌ Environnements multiples (dev/staging/prod)
- ❌ Rollback strategy

**Temps économisé** : 10 jours

#### Containerization
- ❌ Docker / docker-compose
- ❌ Kubernetes (overkill)
- ❌ Container registry

**Temps économisé** : 2 jours

#### Infrastructure Monitoring
- ❌ Prometheus + Grafana
- ❌ Logs centralisés (ELK, Datadog)
- ❌ Alerting infrastructure (PagerDuty)
- ❌ APM (Application Performance Monitoring)

**Temps économisé** : 5 jours

#### Dependency Management Automation
- ❌ Dependabot / Renovate
- ❌ Auto-update dépendances
- ❌ Security scanning automatisé

**Temps économisé** : 1 jour (audit manuel suffisant)

#### Backup Automation
- ❌ Scripts backup automatisés
- ❌ Test restore régulier
- ❌ Disaster recovery plan

**Note** : Supabase gère backups automatiquement ✅

**Total temps économisé** : **18 jours** (sur 30j plan)

---

## 🎁 Setup Infrastructure (Quand prêt)

### Signaux qu'il est temps

1. ✅ Tu as des **utilisateurs réels** (>10 beta testers)
2. ✅ Tu veux **partager** le projet (portfolio, recrutement)
3. ✅ Tu as besoin de **backups automatiques** fiables
4. ✅ Tu veux **tester sur mobile réel** (pas localhost)
5. ✅ Tu cherches **feedback externe** (amis, communauté)

### Quick Setup (1 jour total)

#### Étape 1 : Git Remote (15 min)

```bash
# Initialiser Git (si pas déjà fait)
git init
git add .
git commit -m "Initial commit - PattaMap v10.1.0"

# GitHub (recommandé - gratuit)
# 1. Créer repo sur github.com
# 2. Connecter
git remote add origin https://github.com/ton-username/pattamap.git
git branch -M main
git push -u origin main

# Gitignore
- [ ] Vérifier .gitignore inclut:
  node_modules/
  .env
  .env.local
  build/
  dist/
  *.log
  .DS_Store
```

#### Étape 2 : Hosting Frontend (30 min)

**Option A : Vercel (recommandé - gratuit)**

```bash
# 1. Créer compte vercel.com
# 2. Installer CLI
npm install -g vercel

# 3. Deploy
vercel

# 4. Configurer
- [ ] Environment variables (REACT_APP_API_URL)
- [ ] Custom domain (optionnel)
- [ ] Auto-deploy sur push GitHub main branch
```

**Option B : Netlify (alternatif - gratuit)**

```bash
# 1. Créer compte netlify.com
# 2. Connect GitHub repo
# 3. Configure build settings:
  Build command: npm run build
  Publish directory: build
# 4. Environment variables
```

#### Étape 3 : Hosting Backend (30 min)

**Option A : Railway (recommandé - gratuit tier)**

```bash
# 1. Créer compte railway.app
# 2. New Project → Deploy from GitHub
# 3. Sélectionner repo + backend/
# 4. Environment variables:
  NODE_ENV=production
  PORT=8080
  JWT_SECRET=...
  SUPABASE_URL=...
  SUPABASE_ANON_KEY=...
  CORS_ORIGIN=https://ton-app.vercel.app

# 5. Custom domain (optionnel)
```

**Option B : Render (alternatif - gratuit tier)**

```bash
# Similaire à Railway
# 1. render.com → New Web Service
# 2. Connect GitHub
# 3. Build command: npm run build
# 4. Start command: npm start
# 5. Environment variables
```

#### Étape 4 : CI/CD Basique (1h)

**GitHub Actions (recommandé)**

```yaml
# .github/workflows/ci.yml
- [ ] Créer fichier workflow
  name: CI
  on: [push, pull_request]
  jobs:
    test-backend:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v3
        - uses: actions/setup-node@v3
          with:
            node-version: '18'
        - name: Install dependencies
          run: cd backend && npm ci
        - name: Run tests
          run: cd backend && npm test
        - name: Run lint
          run: cd backend && npm run lint (si existe)

    test-frontend:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v3
        - uses: actions/setup-node@v3
          with:
            node-version: '18'
        - name: Install dependencies
          run: npm ci
        - name: Run tests
          run: npm test
        - name: Build
          run: npm run build

# GitHub Secrets
- [ ] Ajouter secrets dans repo settings:
  * SUPABASE_URL
  * SUPABASE_ANON_KEY
  * JWT_SECRET
```

#### Étape 5 : Monitoring Production (30 min)

```bash
# Sentry (déjà configuré ✅)
- [ ] Vérifier SENTRY_DSN production
- [ ] Activer performance monitoring
- [ ] Configurer alerts email

# Uptime Monitoring (gratuit)
- [ ] UptimeRobot: uptimerobot.com
  * Créer monitor HTTP(s)
  * URL: https://ton-api.railway.app/api/health
  * Interval: 5 minutes
  * Alerts: email/SMS si down

# Analytics (déjà configuré ✅)
- [ ] Vérifier GA4 tracking code production
- [ ] Configurer goals/conversions
```

#### Étape 6 : Docker (Optionnel - 2h)

**Si tu veux containeriser quand même**

```dockerfile
# Dockerfile (backend)
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 8080
CMD ["npm", "start"]

# Dockerfile (frontend)
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

# docker-compose.yml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "8080:8080"
    env_file:
      - ./backend/.env
    depends_on:
      - redis

  frontend:
    build: .
    ports:
      - "3000:80"
    environment:
      - REACT_APP_API_URL=http://localhost:8080

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

### Checklist Setup Infrastructure

```
Git Remote (15 min)
- [ ] git init + commit
- [ ] Créer repo GitHub
- [ ] git push origin main
- [ ] Vérifier .gitignore

Hosting Frontend (30 min)
- [ ] Créer compte Vercel/Netlify
- [ ] Connect GitHub repo
- [ ] Configure build settings
- [ ] Environment variables
- [ ] Test deploy

Hosting Backend (30 min)
- [ ] Créer compte Railway/Render
- [ ] Deploy from GitHub
- [ ] Environment variables production
- [ ] Test API endpoints
- [ ] Custom domain (optionnel)

CI/CD Basique (1h)
- [ ] Créer .github/workflows/ci.yml
- [ ] Configure tests backend
- [ ] Configure tests frontend
- [ ] Configure GitHub Secrets
- [ ] Test workflow on push

Monitoring Production (30 min)
- [ ] Vérifier Sentry production
- [ ] Configure UptimeRobot
- [ ] Vérifier GA4 production
- [ ] Configure email alerts

Docker (Optionnel - 2h)
- [ ] Dockerfile backend
- [ ] Dockerfile frontend
- [ ] docker-compose.yml
- [ ] Test local
- [ ] Documentation

Total: ~3h30 (hors Docker)
```

---

## 📚 ANNEXES

### A. Estimation Effort Détaillée

| Phase | Tâches | Jours | Semaines |
|-------|--------|-------|----------|
| **Phase 1 : Fondations** | Tests + Sécurité | 6j | 1.5 sem |
| **Phase 2 : Features** | i18n, Dark Mode, etc. | 17j | 3.5 sem |
| **Phase 3 : Qualité UX** | A11y, SEO, Perf | 7j | 1.5 sem |
| **TOTAL** | **Développement Solo** | **30j** | **~6 semaines** |
| | | | |
| **Setup Infra (futur)** | Git, Hosting, CI/CD | 1j | 0.25 sem |
| **TOTAL COMPLET** | **Avec Infrastructure** | **31j** | **~6.5 semaines** |

### B. Métriques de Succès

#### Phase 1 : Fondations

| Métrique | Baseline | Objectif | Status |
|----------|----------|----------|--------|
| Coverage backend | ~30% | 70%+ | ⏳ |
| Coverage frontend | ~0% | 50%+ | ⏳ |
| Tests E2E | 0 | 20 scenarios | ⏳ |
| Vulnérabilités high/critical | ? | 0 | ⏳ |

#### Phase 2 : Features

| Feature | Status | Impact attendu |
|---------|--------|----------------|
| i18n complet (45/45) | ⏳ | Audience ×10 |
| Dark Mode | ⏳ | Confort +40% |
| Vérification Profils | ⏳ | Confiance +80% |
| Historique Visites | ⏳ | Fidélisation +30% |
| Reviews Améliorées | ⏳ | Engagement +60% |
| Gamification | ⏳ | Engagement +50% |

#### Phase 3 : Qualité UX

| Métrique | Baseline | Objectif | Status |
|----------|----------|----------|--------|
| Lighthouse Accessibility | ? | 95+ | ⏳ |
| Lighthouse SEO | ? | 95+ | ⏳ |
| Lighthouse Performance | ? | 90+ | ⏳ |
| LCP (Largest Contentful Paint) | ? | <2.5s | ⏳ |
| FID (First Input Delay) | ? | <100ms | ⏳ |
| CLS (Cumulative Layout Shift) | ? | <0.1 | ⏳ |

### C. Priorisation Roadmap (v10.0+)

**Rappel : 11 features planifiées dans docs/features/ROADMAP.md**

#### Inclus dans cet audit (6/11) ✅

1. ✅ Dark Mode (Phase 2.2 - 2j)
2. ✅ Vérification Profils (Phase 2.3 - 2j)
3. ✅ Historique Visites (Phase 2.4 - 2j)
4. ✅ Reviews Améliorées (Phase 2.5 - 3j)
5. ✅ Gamification (Phase 2.6 - 4j)
6. ✅ i18n Complet (Phase 2.1 - 4j)

#### Non inclus - À planifier séparément (5/11)

7. ❌ **Notifications Push PWA** (5j)
   - Service Worker
   - Firebase Cloud Messaging
   - Push notifications
   - Offline mode

8. ❌ **Freemium Model** (5j)
   - Stripe integration
   - Plans FREE/PREMIUM
   - Gating features
   - Dashboard billing

9. ❌ **Mode Hors Ligne** (3j)
   - Service Worker cache
   - Offline fallback
   - Sync queue

10. ❌ **Système Tips** (7j)
    - Stripe Connect
    - Pourboires digitaux
    - Payout automatique
    - ⚠️ Vérifier légalité Thaïlande

11. ❌ **Publicité Ciblée** (4j)
    - Featured listings
    - Bannières sponsorisées
    - Dashboard annonceurs

**Total features restantes** : 24 jours (~5 semaines)

**Recommandation** : Implémenter après Phase 3 (qualité UX)

### D. Checklist Post-Audit

#### Immédiat (Cette semaine)

```
- [ ] Lire audit complet
- [ ] Identifier priorités personnelles
- [ ] Créer branche git feature/tests-backend
- [ ] Commencer Phase 1.1 (Tests controllers)
```

#### Court terme (2 semaines)

```
- [ ] Terminer Phase 1 (Fondations - 6j)
- [ ] npm audit + fix
- [ ] Documentation dépendances
- [ ] Démarrer Phase 2.1 (i18n)
```

#### Moyen terme (1 mois)

```
- [ ] Terminer Phase 2 (Features - 17j)
- [ ] i18n 45/45 composants
- [ ] Dark mode actif
- [ ] Vérification profils workflow complet
```

#### Long terme (2 mois)

```
- [ ] Terminer Phase 3 (Qualité UX - 7j)
- [ ] Lighthouse scores 90+
- [ ] Core Web Vitals "Good"
- [ ] Setup infrastructure si prêt
```

### E. Ressources Utiles

#### Documentation Interne

- **Guide principal** : [CLAUDE.md](CLAUDE.md)
- **Architecture** : [docs/architecture/](architecture/)
- **Développement** : [docs/development/](development/)
- **Features** : [docs/features/](features/)
- **Roadmap complet** : [docs/features/ROADMAP.md](features/ROADMAP.md)

#### Tests

- **Jest Documentation** : https://jestjs.io/
- **React Testing Library** : https://testing-library.com/react
- **Supertest** : https://github.com/ladjs/supertest
- **Playwright** : https://playwright.dev/

#### Accessibilité

- **WCAG 2.1** : https://www.w3.org/WAI/WCAG21/quickref/
- **axe DevTools** : https://www.deque.com/axe/devtools/
- **WAVE** : https://wave.webaim.org/
- **A11y Project** : https://www.a11yproject.com/

#### SEO

- **Google Search Central** : https://developers.google.com/search
- **Schema.org** : https://schema.org/
- **Open Graph** : https://ogp.me/
- **Rich Results Test** : https://search.google.com/test/rich-results

#### Performance

- **Web.dev** : https://web.dev/metrics/
- **Lighthouse** : https://developer.chrome.com/docs/lighthouse/
- **WebPageTest** : https://www.webpagetest.org/
- **Bundle Phobia** : https://bundlephobia.com/

---

## 🔗 RÉFÉRENCES

### Documentation Projet

- [CLAUDE.md](CLAUDE.md) - Guide complet projet (850 lignes)
- [README.md](../README.md) - Quick start et overview
- [ROADMAP.md](features/ROADMAP.md) - Features v10.0+ détaillées
- [FEATURES_OVERVIEW.md](features/FEATURES_OVERVIEW.md) - Fonctionnalités actuelles
- [TECH_STACK.md](architecture/TECH_STACK.md) - Stack technique détaillée
- [PROJECT_STRUCTURE.md](architecture/PROJECT_STRUCTURE.md) - Architecture codebase
- [MAP_SYSTEM.md](architecture/MAP_SYSTEM.md) - Système cartes ergonomiques
- [SECURITY.md](../backend/docs/SECURITY.md) - Sécurité backend
- [PERFORMANCE.md](../backend/docs/PERFORMANCE.md) - Optimisations performance
- [TESTING.md](development/TESTING.md) - Guide tests
- [CODING_CONVENTIONS.md](development/CODING_CONVENTIONS.md) - Standards code

### Backend Docs

- [DATABASE_INDEXES.md](../backend/docs/DATABASE_INDEXES.md) - 30+ indexes
- [SENTRY_USAGE.md](../backend/docs/SENTRY_USAGE.md) - Monitoring
- [DATABASE Structure](../backend/database/README.md) - Migrations, seeds

### Features Docs

- [I18N_IMPLEMENTATION.md](features/I18N_IMPLEMENTATION.md) - Système multilingue
- [ESTABLISHMENT_OWNERS.md](features/ESTABLISHMENT_OWNERS.md) - v10.1 Owners
- [FREELANCE_FEATURE.md](features/FREELANCE_FEATURE.md) - Employées freelance
- [FEATURES_ROADMAP.md](features/FEATURES_ROADMAP.md) - Planification détaillée
- [FEATURES_IMPLEMENTATION_GUIDE.md](features/FEATURES_IMPLEMENTATION_GUIDE.md) - Guides techniques

### Versions Historiques

- [CLAUDE-v9.3.0.md](versions/CLAUDE-v9.3.0.md) - Version actuelle
- [CLAUDE-v9.2.0.md](versions/CLAUDE-v9.2.0.md) - Tests + CSRF
- [CLAUDE-v9.1.0.md](versions/CLAUDE-v9.1.0.md) - Maps refactor

---

## 📝 Suivi Progression

### Comment utiliser cet audit

1. **Lecture complète** (1h) - Comprendre scope complet
2. **Priorisation** (30min) - Choisir ordre phases
3. **Exécution par phase** - Cocher checkboxes au fur et à mesure
4. **Mise à jour régulière** - Documenter progression
5. **Review post-phase** - Vérifier métriques succès

### Format checklist

```markdown
- [ ] Tâche à faire
- [x] Tâche terminée
- [~] Tâche en cours
```

### Tracking temps

Ajouter dans chaque section :

```markdown
**Temps estimé** : Xj
**Temps réel** : Yj
**Écart** : +/-Zj
**Blockers** : [Description si applicable]
```

### Commits Git suggérés

```bash
# Phase 1
git commit -m "test(backend): add establishmentController tests"
git commit -m "test(backend): add integration tests for establishments routes"
git commit -m "chore(deps): npm audit fix + document critical versions"

# Phase 2
git commit -m "i18n: translate AdminPanel components (9/36)"
git commit -m "feat(theme): implement dark mode"
git commit -m "feat(profiles): add verification system with badge"

# Phase 3
git commit -m "a11y: improve keyboard navigation and focus management"
git commit -m "seo: add robots.txt, sitemap.xml and Open Graph tags"
git commit -m "perf: lazy load images and optimize bundle size"
```

---

## ✅ Validation Finale

Avant de considérer l'audit terminé, vérifier :

**Phase 1 : Fondations** ✅
- [ ] Coverage backend ≥ 70%
- [ ] Coverage frontend ≥ 50%
- [ ] 20+ tests E2E Playwright
- [ ] 0 vulnérabilités high/critical

**Phase 2 : Features** ✅
- [ ] i18n : 45/45 composants traduits
- [ ] Dark mode fonctionnel
- [ ] Vérification profils workflow admin actif
- [ ] Historique visites utilisé
- [ ] Reviews avec photos + votes
- [ ] Gamification points + badges actifs

**Phase 3 : Qualité UX** ✅
- [ ] Lighthouse Accessibility ≥ 95
- [ ] Lighthouse SEO ≥ 95
- [ ] Lighthouse Performance ≥ 90
- [ ] WCAG 2.1 AA compliance 100%
- [ ] Core Web Vitals tous "Good"

**Documentation** ✅
- [ ] Audit mis à jour avec progression
- [ ] Nouveaux docs créés (ACCESSIBILITY.md, PERFORMANCE_OPTIMIZATION.md, etc.)
- [ ] CLAUDE.md mis à jour si nécessaire
- [ ] README.md reflète nouvelles features

---

**FIN DE L'AUDIT v10.1.0**

**Date création** : 2025-01-15
**Auteur** : Claude Code
**Version** : 1.0
**Prochaine review** : Après Phase 1 (estimation +2 semaines)

Pour questions ou clarifications, se référer à [CLAUDE.md](CLAUDE.md).

**Bon courage pour la suite ! 🚀**
