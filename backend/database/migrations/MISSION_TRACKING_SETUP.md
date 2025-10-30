# 🎯 Mission Tracking System - Setup Guide

**Date**: 2025-01-20
**Version**: v10.3
**Statut**: Phase 1 (Mission Tracking Service) - JOUR 1 Complet

---

## 📋 Fichiers Créés

### Backend Service
- ✅ `backend/src/services/missionTrackingService.ts` (~850 lignes)
  - 6 event listeners (check-in, review, vote, follow, helpful vote received, photo)
  - Mission processing logique spécifique par type
  - Progress tracking (update, set, completion detection)
  - Reward awarding (XP + badges)
  - Quest unlocking (narrative missions)
  - Counting helpers (check-ins, reviews, votes, etc.)
  - Reset mechanisms (daily/weekly)

### Database Functions
- ✅ `backend/database/migrations/add_mission_tracking_functions.sql` (~300 lignes)
  - **5 RPC Functions PostgreSQL**:
    1. `update_mission_progress()` - Atomic progress update + completion + XP award
    2. `check_mission_completion()` - Check if mission completed
    3. `reset_missions()` - Reset daily/weekly missions
    4. `initialize_mission_progress()` - Initialize quest step
    5. `get_user_active_missions()` - Optimized mission list with progress
  - **4 Performance Indexes**:
    - `idx_user_mission_progress_user_mission` (lookups)
    - `idx_user_mission_progress_mission` (reset operations)
    - `idx_user_mission_progress_completed` (leaderboards)
    - `idx_missions_type_active` (filtering)

---

## 🚀 Installation - Étape par Étape

### Étape 1: Appliquer Migration SQL (CRITIQUE)

**⚠️ IMPORTANT**: Les RPC functions doivent être créées dans Supabase AVANT d'utiliser le service.

```bash
# 1. Aller sur Supabase Dashboard
# 2. SQL Editor → New Query
# 3. Copier le contenu de add_mission_tracking_functions.sql
# 4. Coller dans SQL Editor
# 5. Cliquer "Run" ▶️
```

**Vérification**:
```sql
-- Vérifier que les 5 fonctions existent
SELECT proname, pg_get_function_arguments(oid)
FROM pg_proc
WHERE proname IN (
  'update_mission_progress',
  'check_mission_completion',
  'reset_missions',
  'initialize_mission_progress',
  'get_user_active_missions'
);

-- Devrait retourner 5 lignes
```

**Vérification indexes**:
```sql
-- Vérifier que les 4 indexes existent
SELECT indexname, tablename
FROM pg_indexes
WHERE indexname LIKE '%mission%';
```

---

### Étape 2: Intégration dans Controllers (JOUR 2)

**Fichiers à modifier**:

1. **`backend/src/controllers/gamificationController.ts`** (ligne ~443)
   ```typescript
   // Importer le service en haut du fichier
   import { missionTrackingService } from '../services/missionTrackingService';

   // Dans checkIn() après ligne 428 (après XP award)
   await missionTrackingService.onCheckIn(userId, establishmentId, establishment.zone, verified);
   ```

2. **`backend/src/controllers/commentsController.ts`** (après création review)
   ```typescript
   // Importer le service
   import { missionTrackingService } from '../services/missionTrackingService';

   // Après création review (calculer hasPhotos from review data)
   const reviewLength = review.comment?.length || 0;
   const hasPhotos = false; // TODO Phase 3: Check if review has photos
   await missionTrackingService.onReviewCreated(userId, review.id, reviewLength, hasPhotos);
   ```

3. **`backend/src/controllers/gamificationController.ts`** (ligne ~659 voteOnReview)
   ```typescript
   // Après ligne 683 (après XP award au review author)

   // IMPORTANT: Tracker vote CAST pour voter
   await missionTrackingService.onVoteCast(userId, reviewId, voteType);

   // IMPORTANT: Tracker HELPFUL VOTE RECEIVED pour review author
   if (voteType === 'helpful' && review && !reviewError) {
     await missionTrackingService.onHelpfulVoteReceived(review.user_id, reviewId);
   }
   ```

4. **`backend/src/controllers/gamificationController.ts`** (ligne ~579 followUser)
   ```typescript
   // Après ligne 586 (après création follow)
   await missionTrackingService.onFollowAction(followerId, followingId);
   ```

---

### Étape 3: Tests Manuels (JOUR 2)

**Avant de tester**, redémarrer backend:
```bash
cd backend
npm run dev
```

**Test 1: Check-in Mission Tracking**
```bash
# 1. User fait check-in vérifié (POST /api/gamification/check-in)
# 2. Vérifier dans Supabase:
SELECT * FROM user_mission_progress
WHERE user_id = 'YOUR_USER_ID'
AND mission_id IN (
  SELECT id FROM missions WHERE name = 'Explorer'
);
# 3. ✅ Devrait voir progress = 1
```

**Test 2: Review Mission Tracking**
```bash
# 1. User écrit review (POST /api/comments)
# 2. Vérifier dans Supabase:
SELECT * FROM user_mission_progress
WHERE user_id = 'YOUR_USER_ID'
AND mission_id IN (
  SELECT id FROM missions WHERE name = 'Daily Reviewer'
);
# 3. ✅ Devrait voir progress = 1, completed = true si 1 review required
```

**Test 3: Mission Completion + XP Award**
```bash
# 1. Compléter une mission (ex: Daily Reviewer avec 1 review)
# 2. Vérifier XP awarded:
SELECT * FROM xp_transactions
WHERE user_id = 'YOUR_USER_ID'
AND reason = 'mission_completed'
ORDER BY created_at DESC LIMIT 1;
# 3. ✅ Devrait voir nouvelle transaction avec mission_id dans related_entity_id
```

---

## 🧪 Tests Automatisés (JOUR 3)

**Fichier à créer**: `backend/src/services/__tests__/missionTrackingService.test.ts`

**Coverage Goal**: ≥85%

**Test Suites** (20+ tests):
1. ✅ Event listeners (check-in, review, vote, follow)
2. ✅ Progress tracking (update, set, atomic operations)
3. ✅ Completion detection (threshold, XP award, badge award)
4. ✅ Quest unlocking (narrative missions, prerequisites)
5. ✅ Counting helpers (unique check-ins, zone counts, review counts)
6. ✅ Reset mechanisms (daily, weekly, idempotency)

---

## ⚙️ Cron Jobs (JOUR 3)

**Fichier à créer**: `backend/src/jobs/missionResetJobs.ts`

**Dependencies**:
```bash
cd backend
npm install node-cron @types/node-cron
```

**Cron Schedule**:
- **Daily Reset**: `0 0 * * *` (minuit tous les jours)
- **Weekly Reset**: `0 0 * * 1` (lundi minuit)

**Timezone**: UTC+7 (Thailand time)

---

## 📊 Métriques de Succès (JOUR 1)

✅ **missionTrackingService.ts** créé - 850 lignes
✅ **5 RPC Functions** créées - Performance optimisée
✅ **4 Indexes** créés - Query performance
✅ **Event listeners** - 6 types d'événements supportés
✅ **Mission types** - Daily, Weekly, Narrative, Event supportés
✅ **Reward system** - XP + badges automatiques

---

## 🔍 Debugging

**Logs à surveiller**:
```typescript
// Dans backend console
logger.debug('Mission tracking: check-in event', { userId, establishmentId, zone });
logger.info('Mission completed!', { userId, missionId });
logger.error('Failed to update mission progress:', error);
```

**Queries utiles**:
```sql
-- Voir toutes les missions progress d'un user
SELECT
  m.name,
  ump.progress,
  m.requirements->>'count' AS required,
  ump.completed
FROM user_mission_progress ump
JOIN missions m ON ump.mission_id = m.id
WHERE ump.user_id = 'YOUR_USER_ID';

-- Voir missions completed aujourd'hui
SELECT
  u.username,
  m.name,
  ump.completed_at
FROM user_mission_progress ump
JOIN missions m ON ump.mission_id = m.id
JOIN users u ON ump.user_id = u.id
WHERE ump.completed = TRUE
AND ump.completed_at >= CURRENT_DATE;
```

---

## 📝 Prochaines Étapes

**JOUR 2** (en cours):
- ✅ Intégrer service dans 4 controllers
- ✅ Tests manuels des intégrations

**JOUR 3**:
- ⏳ Créer tests automatisés (20+ tests)
- ⏳ Créer cron jobs reset
- ⏳ Initialiser cron jobs dans server.ts

**JOUR 4**:
- ⏳ Activer 22 missions sûres (migration SQL)
- ⏳ Tests end-to-end missions

---

**Questions?** Consulter:
- `backend/src/services/missionTrackingService.ts` - Code source commenté
- `backend/database/migrations/add_mission_tracking_functions.sql` - SQL functions

**Status**: ✅ JOUR 1 TERMINÉ - Infrastructure fondation créée
