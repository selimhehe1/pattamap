# Structure du Projet - PattaMap

## Vue d'ensemble

PattaMap suit une architecture **monorepo simple** avec séparation claire frontend/backend, privilégiant la modularité et la maintenabilité.

---

## Structure Racine

```
pattaya-directory/
├── backend/                 # API Node.js/Express
├── src/                     # Frontend React
├── public/                  # Assets statiques
├── docs/                    # Documentation projet
│   ├── architecture/        # Tech stack, structure, CSS (4 fichiers)
│   ├── audits/              # Audits qualité et sécurité (4 fichiers)
│   ├── development/         # Getting started, conventions, testing (7 fichiers)
│   ├── features/            # Features overview, roadmap, systèmes (11 fichiers)
│   ├── guides/              # Guides utilisateur et admin (5 fichiers)
│   ├── adr/                 # Architecture Decision Records (5 fichiers)
│   ├── CLAUDE.md            # Point d'entrée principal Claude Code
│   ├── ARCHITECTURE.md      # Architecture déploiement
│   └── AUDIT_METIER.md      # Audit métier
├── scripts/                 # Scripts utilitaires & outils développement
├── tests/                   # Tests E2E (Playwright)
├── node_modules/            # Dépendances frontend
├── package.json             # Config frontend
├── tsconfig.json            # Config TypeScript frontend
├── vite.config.ts           # Config Vite (build tool)
├── eslint.config.js         # Config ESLint
├── playwright.config.ts     # Config Playwright E2E
├── vercel.json              # Config déploiement Vercel
├── purgecss.config.js       # Config PurgeCSS
└── README.md                # Documentation publique
```

---

## Frontend (`src/`)

```
src/
├── components/              # 226 composants React (voir détails ci-dessous)
├── pages/                   # 11 pages (LoginPage, EstablishmentsPage, etc.)
├── contexts/                # 14 contextes React (auth split en 6 + 7 globaux)
├── hooks/                   # 50+ hooks custom
├── providers/               # QueryProvider.tsx (React Query)
├── routes/                  # lazyComponents.ts (React.lazy imports)
├── stores/                  # notificationStore.ts (state management)
├── types/                   # api.ts, index.ts
├── utils/                   # 19 utilitaires (analytics, i18n, cloudinary, etc.)
├── styles/                  # Design system, CSS bundles, responsive
├── config/                  # sentry.ts, supabase.ts
├── constants/               # countries.ts
├── data/                    # sampleData.ts
├── locales/                 # Fichiers traduction i18n
├── animations/              # toastVariants.ts, variants.ts (Framer Motion)
├── __mocks__/               # Mocks pour tests (contexts, react-router-dom)
├── test-utils/              # test-helpers.tsx, a11y-setup.ts
├── App.tsx                  # Composant racine
└── buildTrigger.ts          # Trigger de build
```

### Composants par Feature (`src/components/`)

```
components/
├── Admin/              # 57 fichiers - Dashboard admin complet
│   ├── AdminPanel.tsx, AdminDashboard.tsx, AdminCommandSidebar.tsx
│   ├── EmployeesAdmin/       # Sous-composants modulaires + hooks
│   ├── EstablishmentsAdmin/  # BulkActionBar, EditProposals, types
│   ├── EstablishmentOwnersAdmin/  # OwnerManagementModal, RequestCard
│   ├── VerificationsAdmin/   # VerificationCard, RevokeModal, Timeline
│   ├── CommentsAdmin.tsx, ConsumablesAdmin.tsx, UsersAdmin.tsx
│   ├── VIPVerificationAdmin.tsx, EmployeeClaimsAdmin.tsx
│   ├── shared/, types/, utils/  # Utilitaires admin partagés
│   └── ...
│
├── Auth/               # 25 fichiers - Authentification multi-step
│   ├── LoginForm.tsx, RegisterForm.tsx, ForgotPasswordForm.tsx
│   ├── MultiStepRegisterForm.tsx, ProtectedRoute.tsx, AuthHero.tsx
│   ├── hooks/          # usePhotoUpload, useRegistrationSubmit, useStepNavigation
│   ├── components/     # AvailabilityFeedback, DocumentUploadGrid, StepIndicator
│   ├── steps/          # AccountTypeSelection, Credentials, EmployeeCreate, OwnerCreate
│   └── __tests__/      # LoginForm.test.tsx
│
├── Bar/                # 15 fichiers - Pages établissements
│   ├── BarDetailPage/  # BarDetailContent, BarDetailHeader, hooks/
│   ├── GirlProfile/    # EmploymentSection, SocialMediaLinks, types
│   ├── BarInfoSidebar.tsx, GirlsGallery.tsx, TabNavigation.tsx
│   └── ...
│
├── Common/             # 61 fichiers - Composants réutilisables
│   ├── Modal.tsx, Modal/  # ModalCloseButton, ModalHeader, ModalFooter
│   ├── ModalRenderer.tsx, ConfirmModal.tsx, PromptModal.tsx
│   ├── ErrorBoundary.tsx, ErrorFallback.tsx, RouteErrorFallback.tsx
│   ├── LazyImage.tsx, SEOHead.tsx, StructuredData.tsx
│   ├── EmployeeCard.tsx, EstablishmentCard.tsx
│   ├── NotificationBell.tsx, OfflineBanner.tsx, SyncIndicator.tsx
│   ├── LanguageSelector.tsx, ThemeToggle.tsx, CookieConsent.tsx
│   ├── Skeleton/       # 8 composants skeleton loading
│   ├── StarRating.tsx, Pagination.tsx, ShareButton.tsx
│   ├── LiveRegion.tsx, SanitizedText.tsx, Tooltip.tsx, UserAvatar.tsx
│   └── __tests__/      # 7 fichiers tests
│
├── Employee/           # 10 fichiers - Dashboard employées
│   ├── EmployeeDashboard.tsx, EmployeeProfileWizard.tsx
│   ├── EditEmployeeModal.tsx, ValidationSection.tsx
│   ├── ClaimEmployeeModal.tsx, ClaimOrDeleteModal.tsx
│   ├── RequestVerificationModal.tsx, RequestSelfRemovalModal.tsx
│   └── DeletionRequestModal.tsx, EmployeeVerificationStatusCard.tsx
│
├── Forms/              # 38 fichiers - Formulaires
│   ├── EstablishmentForm.tsx, EstablishmentEditModal.tsx
│   ├── EstablishmentFormSections/  # BasicInfo, OpeningHours, Pricing, Services, SocialMedia
│   ├── EmployeeForm/              # BasicInfo, Employment, Photos, SocialMedia + hooks
│   ├── EmployeeFormContent/       # Sections modulaires + types
│   ├── RequestOwnershipModal/     # Multi-step (3 étapes) + hooks
│   ├── GenericTagsInput.tsx, LanguagesTagsInput.tsx, NationalityTagsInput.tsx
│   └── ...
│
├── Gamification/       # 13 fichiers - Système gamification
│   ├── XPProgressBar.tsx, XPHistoryGraph.tsx, XPToastNotifications.tsx
│   ├── BadgeShowcase.tsx, Leaderboard.tsx, MissionsDashboard.tsx
│   ├── RewardsShowcase.tsx, CheckInButton.tsx, FollowButton.tsx
│   ├── ReviewVoteButton.tsx
│   └── __tests__/      # 3 fichiers tests
│
├── Home/               # 1 fichier
│   └── ZoneGrid.tsx
│
├── Layout/             # 5 fichiers - Layout & navigation
│   ├── Header.tsx, HeaderMenuSections.tsx
│   ├── Footer.tsx, MobileMenu.tsx, SkipToContent.tsx
│
├── Map/                # Cartes des 9 zones
│   ├── Soi6Map.tsx, WalkingStreetMap.tsx, LKMetroMap.tsx
│   ├── TreetownMap.tsx, SoiBuakhaoMap.tsx, JomtienComplexMap.tsx
│   ├── BoyzTownMap.tsx, Soi78Map.tsx, BeachRoadCentralMap.tsx
│   └── RoadOverlay.tsx  # Canvas renderer routes
│
├── Notifications/      # 6 fichiers - Système toast
│   ├── NotificationProvider.tsx, NotificationContainer.tsx
│   ├── NeonToast.tsx, NeonToastIcon.tsx, NeonToastProgressBar.tsx
│   └── index.ts
│
├── Owner/              # 5 fichiers - Dashboard propriétaires
│   ├── MyEmployeesList.tsx, MyOwnershipRequests.tsx
│   ├── OwnerEstablishmentEditModal.tsx, OwnerReviewsPanel.tsx
│   └── VIPPurchaseModal.tsx
│
├── Review/             # 7 fichiers - Système reviews
│   ├── ReviewForm.tsx, ReviewsList.tsx, ReviewsModal.tsx
│   ├── ReviewsModalContent.tsx, ReviewPhotoGallery.tsx
│   ├── UserRating.tsx
│   └── __tests__/      # ReviewForm.test.tsx
│
├── Search/             # 16 fichiers - Moteur recherche avancé
│   ├── SearchPage.tsx, SearchHero.tsx, SearchFilters.tsx
│   ├── SearchResults.tsx, FilterSection.tsx
│   ├── MobileFilterDrawer.tsx, MobileFiltersChips.tsx
│   ├── filters/        # AgeRange, Gender, Language, Rating, SocialMedia, Toggle
│   └── __tests__/      # SearchFilters.test.tsx, SearchPage.test.tsx
│
├── SEO/                # 1 fichier
│   └── StructuredData.tsx
│
├── User/               # 6 fichiers - Dashboard utilisateur
│   ├── UserDashboard.tsx, UserInfoModal.tsx, AvatarEditModal.tsx
│   ├── DeleteAccountModal.tsx, PushNotificationSettings.tsx
│   └── __tests__/      # UserDashboard.test.tsx
│
└── App/                # 1 fichier
    └── AppRoutes.tsx
```

### Contextes (`src/contexts/`)

```
contexts/
├── auth/                    # Auth split en 6 sous-contextes
│   ├── index.tsx            # AuthProvider composé
│   ├── AuthCoreContext.tsx   # Core auth state
│   ├── SessionContext.tsx    # Session management
│   ├── UserContext.tsx       # User profile
│   ├── EmployeeContext.tsx   # Employee-specific auth
│   ├── OwnershipContext.tsx  # Ownership permissions
│   └── SupabaseAuthContext.tsx # Supabase auth integration
├── AuthContext.tsx           # Legacy auth context (compatibility)
├── CSRFContext.tsx           # Tokens CSRF
├── GamificationContext.tsx   # XP, badges, missions
├── ModalContext.tsx          # Gestion modals centralisée
├── SidebarContext.tsx        # Sidebar state
├── ThemeContext.tsx          # Dark/Light mode
└── index.ts                 # Re-exports
```

### Hooks (`src/hooks/` - 50+ hooks)

```
hooks/
├── modals/                  # Hooks modals spécialisés
│   ├── useAuthModals.ts, useEmployeeFormModal.ts
│   ├── useEstablishmentFormModal.ts, useProfileModals.ts
│   └── index.ts
├── useSecureFetch.ts        # Fetch avec CSRF auto
├── useFormValidation.ts     # Validation formulaires
├── useAutoSave.ts           # Persistence localStorage
├── useFocusTrap.ts          # Piège focus (accessibilité)
├── useLiveAnnouncer.ts      # ARIA live regions
├── useContainerSize.ts      # Responsive containers
├── useFavorites.ts          # Gestion favoris
├── useNotifications.ts      # Système notifications
├── useOfflineQueue.ts       # Queue offline (PWA)
├── useOnline.ts             # Détection connectivité
├── useInfiniteScroll.ts     # Scroll infini
├── useLazyLoad.ts           # Lazy loading images
├── useMediaQuery.ts         # Media queries programmatiques
├── useEmployees.ts, useEstablishments.ts, useFreelances.ts  # Data hooks
├── useGalleryGestures.ts, usePinchZoom.ts, useSwipeGesture.ts  # Gestures
├── useScrollAnimation.ts, useViewTransition.ts  # Animations
├── useSearchAutocomplete.ts # Autocomplete
├── useXPHistory.ts, useRewards.ts  # Gamification
├── useProfileViewTracking.ts  # Analytics
└── ... (50+ total)
```

### Pages (`src/pages/`)

```
pages/
├── LoginPage.tsx            # Page de connexion
├── ResetPasswordPage.tsx    # Reset mot de passe
├── AuthCallbackPage.tsx     # Callback auth Supabase
├── EstablishmentsPage.tsx   # Liste établissements
├── MyEstablishmentsPage.tsx # Dashboard propriétaires
├── MyAchievementsPage.tsx   # Achievements gamification
├── GamifiedUserProfile.tsx  # Profil utilisateur gamifié
├── AdminHealthDashboard.tsx # Dashboard santé admin
├── NotFoundPage.tsx         # Page 404
├── PrivacyPolicyPage.tsx    # Politique confidentialité
└── TermsOfServicePage.tsx   # CGU
```

### Utils (`src/utils/` - 19 fichiers)

```
utils/
├── analytics.ts             # Google Analytics 4
├── announce.ts              # ARIA announcements
├── cloudinary.ts            # Helpers Cloudinary
├── constants.ts             # Constantes globales
├── cookieConsent.ts         # Gestion consentement cookies
├── featureFlags.ts          # Feature flags (VIP, etc.)
├── haptics.ts               # Retour haptique mobile
├── i18n.ts                  # Configuration i18next
├── imageValidation.ts       # Validation images upload
├── logger.ts                # Logger frontend
├── notification.ts          # Helpers notifications
├── offlineQueue.ts          # Queue hors-ligne (PWA)
├── pushManager.ts           # Push notifications manager
├── routePreloader.ts        # Préchargement routes
├── slugify.ts               # URL slugification
├── toast.ts                 # Helpers toast notifications
└── __tests__/               # 3 fichiers tests
```

### Types (`src/types/`)

```
types/
├── api.ts                   # Types API (responses, requests)
└── index.ts                 # Types métier (Establishment, Employee, User, etc.)
```

---

## Backend (`backend/`)

```
backend/
├── src/
│   ├── routes/              # 26 fichiers routes API + 6 tests
│   │   ├── auth.ts          # POST /api/auth/{login,register,logout,refresh}
│   │   ├── establishments.ts # CRUD établissements
│   │   ├── employees.ts     # CRUD employées
│   │   ├── comments.ts      # Système reviews
│   │   ├── favorites.ts     # Favoris user
│   │   ├── admin.ts         # Routes admin (index)
│   │   ├── adminComments.ts, adminConsumables.ts, adminEmployees.ts
│   │   ├── adminEstablishments.ts, adminUsers.ts, adminUtils.ts
│   │   ├── moderation.ts    # Routes modérateur
│   │   ├── upload.ts        # Upload images Cloudinary
│   │   ├── users.ts         # Profils utilisateurs
│   │   ├── notifications.ts # CRUD notifications
│   │   ├── push.ts          # Push notifications (VAPID)
│   │   ├── gamification.ts  # XP, badges, missions
│   │   ├── vip.ts           # VIP subscriptions
│   │   ├── verifications.ts # Vérification employées
│   │   ├── ownershipRequests.ts  # Demandes propriété
│   │   ├── editProposals.ts # Propositions d'édition
│   │   ├── employeeValidation.ts # Validation communautaire
│   │   ├── freelances.ts    # Employées freelance
│   │   ├── consumables.ts   # Consommables
│   │   ├── public.ts        # Routes publiques (stats)
│   │   ├── export.ts        # Export données
│   │   └── __tests__/       # 6 fichiers tests intégration
│   │
│   ├── controllers/         # 30+ controllers + 16 tests
│   │   ├── authController.ts
│   │   ├── employeeController.ts, employeeSearchController.ts
│   │   ├── employeeStatsController.ts, employeeValidationController.ts
│   │   ├── employeeClaimController.ts
│   │   ├── establishmentController.ts, establishmentGridController.ts
│   │   ├── establishmentOwnerController.ts
│   │   ├── commentController.ts, consumableController.ts
│   │   ├── favoriteController.ts, freelanceController.ts
│   │   ├── moderationController.ts, notificationController.ts
│   │   ├── ownershipRequestController.ts, uploadController.ts
│   │   ├── userController.ts, verificationController.ts
│   │   ├── editProposalController.ts, deletionRequestController.ts
│   │   ├── exportController.ts, gridMoveController.ts
│   │   ├── gamificationController.ts, leaderboardController.ts
│   │   ├── rewardsController.ts, pushController.ts
│   │   ├── vipController.ts
│   │   ├── vip/             # VIP modulaire (admin, pricing, purchase, subscription)
│   │   └── __tests__/       # 16 fichiers tests
│   │
│   ├── middleware/          # 9 middleware + 6 tests
│   │   ├── auth.ts          # JWT authentication
│   │   ├── csrf.ts          # CSRF protection
│   │   ├── rateLimit.ts     # Rate limiting (8 limiters)
│   │   ├── cache.ts         # Redis cache middleware
│   │   ├── upload.ts        # Multer config
│   │   ├── refreshToken.ts  # JWT refresh rotation
│   │   ├── supabaseAuth.ts  # Supabase auth middleware
│   │   ├── auditLog.ts      # Audit trail
│   │   ├── asyncHandler.ts  # Async error wrapper
│   │   └── __tests__/       # 6 fichiers tests (auth, csrf, cache, rateLimit, auditLog, refreshToken)
│   │
│   ├── services/            # 6 services + 5 tests
│   │   ├── gamificationService.ts
│   │   ├── badgeAwardService.ts
│   │   ├── missionTrackingService.ts
│   │   ├── pushService.ts
│   │   ├── emailService.ts
│   │   ├── promptpayService.ts
│   │   └── __tests__/
│   │
│   ├── jobs/                # 1 job + 1 test
│   │   ├── missionResetJobs.ts  # Cron job reset missions
│   │   └── __tests__/
│   │
│   ├── config/              # 9 fichiers configuration
│   │   ├── supabase.ts      # Supabase client (données)
│   │   ├── supabaseAuth.ts  # Supabase client (auth)
│   │   ├── cloudinary.ts    # Cloudinary config
│   │   ├── redis.ts         # Redis client + fallback
│   │   ├── swagger.ts       # OpenAPI spec
│   │   ├── sentry.ts        # Sentry monitoring
│   │   ├── verification.ts  # Config vérification
│   │   ├── vipPricing.ts    # Config pricing VIP
│   │   └── __mocks__/       # Mock supabase pour tests
│   │
│   ├── utils/               # 36+ fichiers utilitaires
│   │   ├── validation.ts    # Schémas validation
│   │   ├── pagination.ts    # Cursor pagination helpers
│   │   ├── logger.ts        # Custom logger
│   │   ├── passwordSecurity.ts  # NIST compliant password validation
│   │   ├── commentHelpers.ts, employeeHelpers.ts, establishmentHelpers.ts
│   │   ├── employeeSearchHelpers.ts, freelanceValidation.ts
│   │   ├── gamificationHelpers.ts, vipHelpers.ts
│   │   ├── notificationHelper.ts
│   │   ├── employees/       # Sous-modules (filters, sorting, validation, ratings, etc.)
│   │   ├── establishments/  # Sous-modules (coordinates, mutations, queries)
│   │   ├── notifications/   # Sous-modules (admin, core, database, social, etc.)
│   │   └── __tests__/       # 4 fichiers tests
│   │
│   ├── types/               # Types TypeScript backend
│   │   ├── express.d.ts     # Augmentation Express types
│   │   └── index.ts         # Types métier database
│   │
│   ├── test-helpers/        # Utilitaires tests partagés
│   │   ├── supabaseMockChain.ts
│   │   ├── createDefaultChain.ts
│   │   └── mockOwnership.ts
│   │
│   ├── __tests__/           # Tests root (security, VIP)
│   │   ├── security/        # sqlInjection.test.ts
│   │   └── vip/             # 4 fichiers tests VIP
│   │
│   ├── scripts/             # Scripts utilitaires
│   │   └── migrateUsersToSupabaseAuth.ts
│   │
│   └── server.ts            # Point d'entrée API
│
├── docs/                    # Documentation backend
│   ├── SECURITY.md          # Guide sécurité
│   ├── PERFORMANCE.md       # Optimisations
│   ├── DATABASE_INDEXES.md  # 30+ indexes SQL
│   ├── SENTRY_USAGE.md      # Monitoring
│   └── HTTPS_DEV_SETUP.md   # Setup HTTPS dev
│
├── database/                # Schémas & migrations
│   ├── PROD_SCHEMA_INIT.sql # Schéma PostgreSQL complet (32 tables)
│   ├── migrations/          # 64 fichiers migration SQL
│   ├── seeds/               # 15 fichiers seed SQL
│   ├── scripts/             # Scripts migration
│   ├── test-data/           # Données de test
│   ├── verification/        # Scripts vérification schéma
│   └── README.md
│
├── jest.config.js           # Configuration Jest
├── tsconfig.json            # Config TypeScript backend
├── package.json             # Dépendances backend
└── .env.example             # Template variables environnement
```

---

## Database Structure (Supabase - 32 tables)

### Tables Principales

```sql
-- Users & Auth
users (id, email, username, role, account_type, avatar_url, supabase_auth_id, ...)
refresh_tokens (id, user_id, token, expires_at)

-- Établissements
establishments (id, name, category_id, zone, grid_row, grid_col, status, is_vip, vip_expires_at, ...)
establishment_categories (id, name, icon)
establishment_consumables (id, establishment_id, template_id, ...)
consumable_templates (id, name, category, ...)

-- Employées
employees (id, name, age, nationality, gender, sex, photo_url, status, is_vip, vip_expires_at, ...)
employment_history (id, employee_id, establishment_id, is_current, start_date, end_date)
independent_positions (id, employee_id, zone, grid_row, grid_col)

-- Reviews & Social
comments (id, user_id, establishment_id, employee_id, rating, text, status)
review_votes (id, user_id, comment_id, vote_type)
reports (id, user_id, content_type, content_id, reason)
user_favorites (id, user_id, employee_id)
user_followers (id, follower_id, following_id)

-- Ownership
establishment_owners (id, user_id, establishment_id, owner_role, permissions)
establishment_ownership_requests (id, user_id, establishment_id, status, documents)

-- VIP Subscriptions
vip_payment_transactions (id, subscription_type, user_id, amount, payment_method, payment_status)
employee_vip_subscriptions (id, employee_id, status, duration, starts_at, expires_at)
establishment_vip_subscriptions (id, establishment_id, status, duration, starts_at, expires_at)

-- Gamification
user_points (id, user_id, total_xp, level)
user_badges (id, user_id, badge_id, earned_at)
badges (id, name, description, icon, xp_required)
missions (id, name, type, target_count, xp_reward)
user_mission_progress (id, user_id, mission_id, progress, completed_at)
xp_transactions (id, user_id, amount, reason, created_at)
check_ins (id, user_id, establishment_id, created_at)

-- Notifications
notifications (id, user_id, type, title, message, link, is_read, metadata)
push_subscriptions (id, user_id, endpoint, p256dh_key, auth_key)

-- Moderation & Audit
moderation_queue (id, content_type, content_id, action, status)
edit_proposals (id, user_id, entity_type, entity_id, changes, status)
audit_logs (id, user_id, action, entity_type, entity_id, changes, ip_address)

-- Verification
employee_verifications (id, employee_id, status, proof_photos)
employee_existence_votes (id, user_id, employee_id, vote)

-- Analytics
profile_views (id, employee_id, viewer_id, viewed_at)
user_photo_uploads (id, user_id, photo_url, entity_type, entity_id)
```

### Indexes Critiques

```sql
-- Performance queries
CREATE INDEX idx_establishments_status_zone ON establishments(status, zone);
CREATE INDEX idx_employees_status ON employees(status);
CREATE INDEX idx_employment_history_current ON employment_history(is_current) WHERE is_current = true;
CREATE INDEX idx_comments_status ON comments(status);

-- Full-text search
CREATE INDEX idx_establishments_name_gin ON establishments USING gin(to_tsvector('english', name));
CREATE INDEX idx_employees_name_gin ON employees USING gin(to_tsvector('english', name));

-- VIP (22 indexes)
-- Gamification, Notifications, Ownership indexes (30+ total)
```

---

## Build & Deploy

### Development

```bash
# Terminal 1 - Backend (port 8080)
cd backend
npm run dev

# Terminal 2 - Frontend (port 3000)
npm run dev     # ou npm start
```

### Production Build

```bash
# Frontend (Vite)
npm run build                # → tsc && vite build

# Backend
cd backend
npm run build                # → tsc → dist/
npm start                    # Run compiled JS
```

### Deployment Structure

```
production/
├── frontend/                # Static files (Vercel)
│   └── dist/
│
└── backend/                 # API server (Railway/Render)
    ├── dist/                # Compiled TypeScript
    ├── node_modules/
    └── .env.production
```

---

## Testing Structure

```
# Frontend (Vitest - 300+ tests)
src/
├── components/
│   ├── __tests__/VIP/       # VIPPurchaseModal, VIPVerificationAdmin
│   ├── Auth/__tests__/      # LoginForm
│   ├── Common/__tests__/    # Modal, NotificationBell, Pagination, etc.
│   ├── Gamification/__tests__/ # Leaderboard, Rewards, XPHistory
│   ├── Review/__tests__/    # ReviewForm
│   ├── Search/__tests__/    # SearchFilters, SearchPage
│   └── User/__tests__/      # UserDashboard
├── contexts/__tests__/      # 7 contextes testés (105 tests, 63% coverage)
├── hooks/__tests__/         # useFormValidation, useAutoSave
└── utils/__tests__/         # cloudinary, offlineQueue, pushManager

# Backend (Jest - 322+ tests)
backend/src/
├── middleware/__tests__/    # auth, csrf, cache, rateLimit, auditLog, refreshToken
├── controllers/__tests__/   # 16 fichiers tests controllers
├── services/__tests__/      # gamification, badges, missions, push, promptpay
├── jobs/__tests__/          # missionResetJobs
├── utils/__tests__/         # pagination, search, freelance, notifications
├── __tests__/security/      # SQL injection (100+ payloads)
└── __tests__/vip/           # 4 fichiers tests VIP
└── routes/__tests__/        # 6 fichiers tests intégration

# E2E (Playwright - 67 tests)
tests/e2e/
├── user-search, owner-management, admin-vip
├── map-performance, auth-integration
```

### Test Commands

```bash
# Frontend (Vitest)
npm test                     # Run all tests
npm run test:ci              # Coverage report

# Backend (Jest)
cd backend
npm test                     # Run all tests
npm run test:watch           # Watch mode
npm run test:coverage        # Coverage report

# E2E (Playwright)
npm run test:e2e             # Run all E2E
npm run test:e2e:headed      # Headed mode
npm run test:e2e:ui          # UI mode
```

---

## Package Management

### Frontend Dependencies
- Production: `package.json` dependencies
- Development: `package.json` devDependencies
- Lock file: `package-lock.json`

### Backend Dependencies
- Production: `backend/package.json` dependencies
- Development: `backend/package.json` devDependencies
- Lock file: `backend/package-lock.json`

### Scripts Utiles

**Frontend (`package.json`)**:
```json
{
  "scripts": {
    "dev": "vite",
    "start": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:ci": "vitest run --coverage",
    "test:e2e": "playwright test",
    "lint": "eslint src --max-warnings 100",
    "typecheck": "tsc --noEmit",
    "ci": "npm run lint && npm run typecheck && npm run build",
    "ci:full": "npm run ci && npm run test:e2e:ci"
  }
}
```

**Backend (`backend/package.json`)**:
```json
{
  "scripts": {
    "dev": "nodemon src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "jest",
    "test:coverage": "jest --coverage",
    "lint": "eslint src --max-warnings 100",
    "typecheck": "tsc --noEmit",
    "ci": "npm run lint && npm run typecheck && npm run test:coverage && npm run build"
  }
}
```

---

## Environment Files

### `.env` Files (gitignored)

```
pattaya-directory/
├── .env                     # Frontend env vars (VITE_*)
├── .env.local               # Overrides locales
└── backend/
    └── .env                 # Backend env vars
```

---

## Scalability Considerations

### Current Limits
- **Monolith Architecture**: Frontend + Backend séparés mais couplés
- **Single Database**: Supabase PostgreSQL (scalable jusqu'à 100k users)
- **Cloudinary CDN**: Images optimisées globalement

### Future Evolution
1. **Microservices** (si >100k users)
   - Service Auth séparé
   - Service Media séparé
   - Service Notifications

2. **Monorepo Tools** (si équipe >3 dev)
   - Turborepo ou Nx
   - Shared packages (types, utils, UI components)

3. **Infrastructure as Code**
   - Docker containers
   - Kubernetes orchestration

---

## Liens Connexes

- **Architecture Stack**: [TECH_STACK.md](TECH_STACK.md)
- **Guide Sécurité**: [../../backend/docs/SECURITY.md](../../backend/docs/SECURITY.md)
- **Guide Performance**: [../../backend/docs/PERFORMANCE.md](../../backend/docs/PERFORMANCE.md)

---

**Dernière mise à jour**: v10.4.0 (Février 2026)
