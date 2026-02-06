# Changelog

All notable changes to PattaMap will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [10.4.1] - 2026-02-06 - Post-Launch Hardening

### Security
- **Magic Bytes Validation**: New middleware validates file content (JPEG, PNG, WebP, GIF, PDF) matches declared MIME type, prevents MIME spoofing attacks on all upload routes
- **Husky Pre-commit Hooks**: lint-staged runs ESLint on staged files before every commit

### Changed
- **Backend `any` Cleanup**: Removed all `(req as any).user` casts in production code, replaced with typed `req.user` via express.d.ts augmentation. Added generics to Supabase mock helpers (`MockData<T>`, `mockSuccess<T>`)
- Frontend tests: 21 → 40 test files, 372 → 513 tests
- Backend tests: 44 → 45 test suites, 1163 → 1178 tests

### Added
- **MONITORING.md**: Production monitoring guide (Sentry alerts, UptimeRobot, Core Web Vitals thresholds, env vars checklist)
- **19 new frontend test files**: 5 hooks (useSecureFetch, useFormValidation, useOnline, useMediaQuery, useInfiniteScroll), 4 pages (Establishments, NotFound, PrivacyPolicy, TermsOfService), 5 core components (Footer, Header, ErrorBoundary, CookieConsent, SEOHead), 5 feature components (BarDetailPage, EmptyState, LazyImage, OfflineBanner, SearchResults)
- **Magic bytes test**: 15 tests covering all file types and edge cases

---

## [10.4.0] - 2025-12-28 - Reviews Améliorées & Gamification Complete

### Added
- **Reviews Améliorées**: Photos dans reviews (1-3 photos par avis), réponses établissements (OwnerReviewsPanel)
- **Gamification Complete**: XP system, badges, missions, leaderboards, rewards system
- **Mode Hors Ligne (PWA)**: Offline-first avec Service Worker, background sync queue
- **i18n 8 langues**: Ajout Japonais (JA) et Coréen (KO) - total 1,100+ clés
- **Context Tests**: 105 nouveaux tests (SidebarContext, MapControlsContext, ThemeContext, ModalContext, CSRFContext, GamificationContext, AuthContext)
- **E2E Tests**: 67 tests Playwright (auth-integration, user-search, owner-management)

### Changed
- Tests: 162 → 622 tests passing (100%)
- Context coverage: 34% → 63.45%

---

## [10.3.0] - 2025-12-25 - VIP Subscriptions & Dark Mode

### Added
- **VIP Subscriptions Backend**: 3 tables, 22 indexes, 16 RLS policies, 7 API endpoints
- **Dark Mode**: ThemeContext avec toggle, détection préférences système, persistance localStorage
- **Historique Visites UI**: Dashboard complet avec timeline et stats
- **Freelance System**: FreelancesPage avec filtres et VIP priority sorting
- **Community Validation**: Vote weight system basé sur niveau XP

### Security
- 7/7 vulnérabilités résolues (CSRF, Password Policy, CSP, Rate Limiting)

---

## [10.2.0] - 2025-12-22 - Notifications PWA

### Added
- **PWA Push Notifications**: Service Worker, Web Push Protocol, VAPID keys
- **Enhanced NotificationBell UI**: 21 types, dual grouping (Type/Date), 6 category filters
- **Profile View Tracking**: Analytics complet avec timestamps
- **Consumables System**: Menu boissons avec pricing par établissement

### Changed
- 50+ tests notifications (NotificationBell, pushManager, pushController)

---

## [10.1.0] - 2025-12-20 - Establishment Owners

### Added
- **Establishment Owners System**: 5 API endpoints, permissions JSONB, middleware
- **Multilingue (i18n)**: 6 langues (EN/TH/RU/CN/FR/HI) - 1,046 clés
- **Photo Upload System**: Cloudinary CDN integration
- **Social Media Integration**: Formulaire réseaux sociaux établissements

---

## [10.0.0] - 2025-12-18 - Foundation v10

### Added
- **Employee Claims System**: Modal, dashboard, admin verification workflow
- **Edit Proposals**: Système de suggestions avec modération
- **Favorites System**: 13 tests, 100% coverage
- **Moderation System**: Queue avec workflow approval

### Changed
- Migration vers React 19.1 + TypeScript strict

---

## [2.1.0] - 2025-12-22

### Phase 5-7 Bug Fixes Release

This release addresses 11 bugs identified during the comprehensive security and performance audit across the Claim, Search, and Notification systems.

---

### Fixed

#### Phase 5: Claim System Fixes

- **C2 - Rejection Notification** - Users now receive a notification when their claim request is rejected, including the rejection reason and i18n support for multilingual messages (`employeeController.ts`)

- **C3 - Filter 'all' Bug** - Fixed `getClaimRequests` returning empty results when `filter='all'` by conditionally applying the status filter only when a specific status is selected (`employeeController.ts`)

- **C4 - N+1 Query Optimization** - Replaced individual employee fetches with a batch `IN` query and `Map` lookup, reducing database calls from N+1 to 2 queries for claim requests (`employeeController.ts`)

- **C7 - Proof URL Limit** - Limited verification proof URLs to maximum 5 per claim request with validation on both frontend (disabled button) and backend (400 error with `TOO_MANY_PROOFS` code) (`ClaimEmployeeModal.tsx`, `employeeController.ts`)

#### Phase 6: Search System Fixes

- **S2 - LRU Cache Memory Leak** - Implemented cache size limit (max 1000 entries) with automatic eviction of oldest entries to prevent unbounded memory growth in autocomplete suggestions (`employeeController.ts`)

- **S3 - Pagination Validation** - Added server-side validation for pagination parameters:
  - `page` clamped to minimum 1 (prevents negative offset)
  - `limit` clamped to 1-100 range (prevents memory abuse)
  - Invalid values fall back to defaults (`employeeController.ts`)

- **S4 - Search Rate Limiting** - Added dedicated rate limiters for search endpoints:
  - `/employees/search`: 30 requests/minute
  - `/employees/suggestions/names`: 60 requests/minute
  - Both include user ID and IP in rate limit key (`rateLimit.ts`, `employees.ts`)

#### Phase 7: Notification System Fixes

- **N3 - Notification Rate Limiting** - Added dedicated rate limiters for notification endpoints:
  - Read operations (GET): 30 requests/minute
  - Mutation operations (PATCH/DELETE): 60 requests/minute
  - Applied to all notification routes (`rateLimit.ts`, `notifications.ts`)

- **N4 - Notification Limit Validation** - Validated `limit` parameter in `getMyNotifications` to 1-100 range, preventing excessive data fetches (`notificationController.ts`)

- **N5 - Push Subscription Limit** - Limited push subscriptions to 10 per user to prevent subscription spam, returning `SUBSCRIPTION_LIMIT_REACHED` error when exceeded (`pushController.ts`)

- **N6 - Exponential Backoff Polling** - Implemented exponential backoff for notification polling errors:
  - Base interval: 30 seconds
  - Doubles on each consecutive error (60s, 120s, 240s...)
  - Maximum interval: 5 minutes
  - Automatically resets to base interval on success (`NotificationBell.tsx`)

---

### Changed

- Rate limit middleware now exports additional limiters: `searchSuggestionsRateLimit`, `employeeSearchRateLimit`, `notificationRateLimit`, `notificationMutationRateLimit`

- Employee controller tests updated to mock new batch query pattern (C4) and notification insertion (C2)

---

### Security

- Control character regex in URL sanitization now uses ESLint-compliant Unicode escapes with explicit disable comment for intentional security check (`validation.ts`)

---

### Technical Details

#### Files Modified

| File | Changes |
|------|---------|
| `backend/src/controllers/employeeController.ts` | C2, C3, C4, C7, S2, S3 |
| `backend/src/controllers/notificationController.ts` | N4 |
| `backend/src/controllers/pushController.ts` | N5 |
| `backend/src/middleware/rateLimit.ts` | S4, N3 |
| `backend/src/routes/employees.ts` | S4 |
| `backend/src/routes/notifications.ts` | N3 |
| `backend/src/utils/validation.ts` | ESLint fix |
| `src/components/Common/NotificationBell.tsx` | N6 |
| `src/components/Employee/ClaimEmployeeModal.tsx` | C7 |

#### Commits

```
bbecc46 fix(lint): disable no-control-regex for security check
c16e058 fix(lint): use Unicode escapes for control chars regex
d8ea680 test: update employee controller tests for Phase 5 fixes
0b457c7 fix(phase5-7): claim, search & notification system fixes
```

---

### Deferred

- **S1 - Database-level Filtering** - Post-query filtering optimization deferred due to complexity (freelances without `employment_history` require complex UNION/LEFT JOINs with regression risk)

---

## [2.0.0-secure] - 2025-12-22

### Phase 1-4 Security & Performance Release

Previous release addressing critical security vulnerabilities, authentication improvements, map/establishment fixes, and UX polish.

#### Highlights
- CSRF protection on all auth endpoints
- Reduced rate limits for brute-force prevention
- N+1 query optimizations
- Session management improvements
- Password reset flow implementation
- Search debouncing

---

## [1.0.0] - Initial Release

Initial release of PattaMap - Pattaya Directory Application.
