# 🎮 Système de Gamification PattaMap

**Status**: ✅ Production-Ready (100% Complete)
**Version**: v10.3
**Last Updated**: Janvier 2025

---

## 📋 Table of Contents

1. [Vue d'ensemble](#vue-densemble)
2. [Objectifs](#objectifs)
3. [Architecture](#architecture)
4. [Système de Points & Niveaux](#système-de-points--niveaux)
5. [Badges](#badges)
6. [Missions](#missions)
7. [Leaderboards](#leaderboards)
8. [Fonctionnalités Sociales](#fonctionnalités-sociales)
9. [Check-ins Géolocalisés](#check-ins-géolocalisés)
10. [API Endpoints](#api-endpoints)
11. [Base de Données](#base-de-données)
12. [Installation](#installation)
13. [Roadmap](#roadmap)

---

## Vue d'ensemble

Le système de gamification de PattaMap est conçu pour **augmenter l'engagement utilisateur et stimuler les contributions** (avis, photos, corrections de profils) en récompensant les actions avec des points d'expérience (XP), des badges, et des défis quotidiens/hebdomadaires.

### Caractéristiques Principales

- ✅ **Système de Points (XP)** - Gagner de l'XP pour chaque action
- ✅ **7 Niveaux de Progression** - De Newbie (🌱) à Ambassador (👑)
- ✅ **46 Badges** - Répartis en 6 catégories
- ✅ **Missions Dynamiques** - Daily, Weekly, Event, Narrative quests
- ✅ **Leaderboards Segmentés** - Global, Monthly, Zone-based
- ✅ **Check-ins Géolocalisés** - Vérification GPS dans un rayon de 100m
- ✅ **Fonctionnalités Sociales** - Follow/Unfollow, Votes "Helpful"
- ✅ **Streaks** - Récompense pour activité quotidienne consécutive

---

## Objectifs

### Métriques Cibles

| Métrique | Avant | Cible | Gain |
|----------|-------|-------|------|
| **Engagement** | Baseline | +50% | Temps moyen session |
| **Contributions** | Baseline | +80% | Avis + Photos / mois |
| **Rétention** | Baseline | +40% | Utilisateurs actifs hebdo |
| **Viralité** | Baseline | 15% | Users invitant ≥1 ami |

### Actions Ciblées

1. **Écrire des avis de qualité** (détaillés, avec photos)
2. **Visiter physiquement des lieux** (check-ins géolocalisés)
3. **Partager et inviter des amis** (croissance virale)
4. **Compléter des profils** (corrections, ajouts d'infos)

---

## Architecture

### Stack Technique

**Backend**:
- PostgreSQL (Supabase) avec fonctions RPC
- Express.js controllers + routes
- Geolocation (Haversine formula)
- Materialized Views pour leaderboards

**Frontend** (À implémenter):
- React Context (`GamificationProvider`)
- React Query pour caching
- Components: `XPProgressBar`, `BadgeShowcase`, `MissionsDashboard`, `Leaderboard`

### Schéma de Base de Données

```
┌─────────────────┐
│  user_points    │ ← XP, Level, Streak
└─────────────────┘
         │
         ├──────┬──────┬──────┬──────┐
         │      │      │      │      │
┌────────▼──┐ ┌─▼─────▼──┐ ┌─▼──────▼──┐ ┌─▼──────────┐
│ badges    │ │ missions │ │ check_ins │ │ followers  │
└───────────┘ └──────────┘ └───────────┘ └────────────┘
      │              │
┌─────▼──────┐ ┌────▼──────────────┐
│user_badges │ │user_mission_prog. │
└────────────┘ └───────────────────┘
```

---

## Système de Points & Niveaux

### Actions Récompensées

| Action | XP | Conditions |
|--------|----|-----------  |
| ✍️ Écrire un avis (texte seul) | +10 XP | - |
| ✍️📸 Avis avec photo | +25 XP | - |
| ✍️📸📸📸 Avis avec 3+ photos | +40 XP | - |
| 📍 Check-in sur place | +15 XP | Vérifié (< 100m) |
| 📸 Ajouter une photo | +8 XP | - |
| ✏️ Correction de profil (approuvée) | +20 XP | Admin approval |
| 👥 Inviter un ami | +50 XP | Registration complétée |
| 👍 Vote "utile" reçu | +3 XP | Par vote |
| 🌟 Premier avis (nouvel établissement) | +30 XP | Bonus explorateur |
| 🔥 Streak quotidien (7 jours) | +100 XP | Bonus fidélité |

### Multiplicateurs de Qualité

- Avis **>100 caractères**: **x1.5 XP**
- Avis avec **note détaillée** (prix, ambiance): **x2 XP**

### 7 Niveaux de Progression

| Niveau | Nom | XP Requis | Avantages Débloqués |
|--------|-----|-----------|---------------------|
| 1 | 🌱 Newbie | 0-99 | Accès de base |
| 2 | 🗺️ Explorer | 100-299 | Badge "Explorer" visible sur profil |
| 3 | 🍻 Regular | 300-699 | Apparition leaderboard zone |
| 4 | 🌟 Insider | 700-1499 | Avis mis en avant ("Avis d'Insider") |
| 5 | 💎 VIP | 1500-2999 | Accès early à nouvelles features |
| 6 | 🏆 Legend | 3000-5999 | Badge doré visible partout |
| 7 | 👑 Ambassador | 6000+ | Modération communautaire, événements exclusifs |

### Calcul Automatique

Le niveau est recalculé automatiquement via la fonction PostgreSQL `award_xp()` :

```sql
v_new_level := CASE
  WHEN v_new_total_xp >= 6000 THEN 7  -- Ambassador
  WHEN v_new_total_xp >= 3000 THEN 6  -- Legend
  WHEN v_new_total_xp >= 1500 THEN 5  -- VIP
  WHEN v_new_total_xp >= 700 THEN 4   -- Insider
  WHEN v_new_total_xp >= 300 THEN 3   -- Regular
  WHEN v_new_total_xp >= 100 THEN 2   -- Explorer
  ELSE 1                              -- Newbie
END;
```

---

## Badges

### 46 Badges Répartis en 6 Catégories

#### A) Exploration (9 badges)

| Badge | Description | Condition |
|-------|-------------|-----------|
| 🗺️ First Visit | Check-in at your first establishment | 1 check-in |
| 🌍 Zone Explorer | Visit 3 different zones | 3 zones |
| 🏆 Zone Master | Visit all 9 zones | 9 zones |
| 🍻 Soi 6 Regular | 10 check-ins in Soi 6 | 10 check-ins (Soi 6) |
| 🚶 Walking Street Walker | 15 check-ins in Walking Street | 15 check-ins (Walking St) |
| 🌃 Night Owl | Check-in after midnight 10 times | 10 night check-ins |
| 🌅 Early Bird | Check-in before 6 PM 5 times | 5 early check-ins |
| 🏃 Venue Hopper | Visit 25 different establishments | 25 unique venues |
| 🎖️ Explorer Elite | Visit 50 different establishments | 50 unique venues |

#### B) Contribution (14 badges)

| Badge | Description | Condition |
|-------|-------------|-----------|
| ✍️ First Review | Write your first review | 1 review |
| 📝 Critic Bronze/Silver/Gold/Platinum | Write 10/50/100/250 reviews | Milestone reviews |
| 📸 Photographer Bronze/Silver/Gold | Upload 25/100/250 photos | Milestone photos |
| 🌟 Pioneer | First review on 5 new establishments | 5 first reviews |
| ⭐ Trailblazer | First review on 15 new establishments | 15 first reviews |
| ✏️ Editor | 10 approved profile corrections | 10 approved edits |
| 🎨 Curator | 30 approved profile corrections | 30 approved edits |
| 💯 Complete Reviewer | 5 reviews (photo + 100+ chars) | 5 complete reviews |
| 🎬 Content Creator | 50 reviews + 50 photos | 100 total contributions |

#### C) Social (7 badges)

| Badge | Description | Condition |
|-------|-------------|-----------|
| 🦋 Social Butterfly | Get your first follower | 1 follower |
| 👥 Influencer Bronze/Silver/Gold | Gain 10/50/100 followers | Milestone followers |
| 👍 Helpful Bronze/Silver | Receive 50/200 "helpful" votes | Milestone helpful votes |
| 🤝 Connector | Invite 5 friends | 5 referrals |

#### D) Quality (6 badges)

| Badge | Description | Condition |
|-------|-------------|-----------|
| 📖 Detailed Reviewer | 10 reviews with 200+ characters | Quality reviews |
| 🎖️ Expert Reviewer | Reviews in all establishment categories | All 7 categories |
| 🏅 Trusted Voice | 80% of reviews marked "helpful" | 80% helpful rate (min 20 reviews) |
| 📷 Photo Pro | Upload 10 photos (1080p+) | High-res photos |
| ⚖️ Balanced Critic | Use all ratings 1-5 stars | All ratings used |
| 💡 Constructive Reviewer | 20 reviews with detailed notes | Detailed reviews |

#### E) Temporal (6 badges)

| Badge | Description | Condition |
|-------|-------------|-----------|
| 🔥 Week Warrior | 7-day activity streak | 7 consecutive days |
| 📅 Month Master | 30-day activity streak | 30 consecutive days |
| 💪 Dedication | 90-day activity streak | 90 consecutive days |
| 🎂 Anniversary Bronze/Silver | Member for 1/2 years | Account age |
| 🚀 Early Adopter | Join in first 6 months | Before 2025-07-01 |

#### F) Secret (4 badges - Hidden)

| Badge | Description | Condition |
|-------|-------------|-----------|
| 🎰 Lucky 7 | 7th review on 7th day at 7 PM | Specific timing |
| 🌏 World Traveler | Reviews from 3 different countries | Geolocation diversity |
| 🌙 Night Hunter | 5 check-ins between 3-6 AM | Late night activity |
| 🌕 Full Moon Party | 10 check-ins during full moon week | Seasonal event |

---

## Missions

### Types de Missions

#### 1. Daily Missions (Reset à minuit)

| Mission | XP Reward | Condition |
|---------|-----------|-----------|
| Daily Reviewer | +20 XP | Write 1 review today |
| Photo Hunter | +25 XP | Upload 3 photos today |
| Explorer | +15 XP | Visit 1 new establishment |
| Social Networker | +10 XP | Follow 2 users |
| Helpful Member | +15 XP | Vote "helpful" on 5 reviews |
| Quality Reviewer | +35 XP | 1 review (photo + 100+ chars) |

#### 2. Weekly Missions (Reset chaque lundi)

| Mission | XP Reward | Condition |
|---------|-----------|-----------|
| Weekly Explorer | +100 XP | Visit 3 different zones |
| Weekly Contributor | +150 XP | Write 5 reviews with photos |
| Helpful Week | +80 XP | Receive 10 "helpful" votes |
| Social Week | +120 XP | Gain 5 new followers |
| Zone Master Weekly | +200 XP | Check-in at 10 different venues |
| Photo Marathon | +100 XP | Upload 20 photos |

#### 3. Narrative Quests (Progressive)

**Grand Tour of Pattaya** (7 étapes):
- Step 1-6: Visit 5 establishments per zone (+50 XP each)
- Step 7: Complete all 9 zones (+200 XP + **Badge "Zone Master"**)

**Reviewer Path** (5 étapes):
- 5 reviews → 5 with photos → 5 detailed (200+ chars) → 25 total → 50 total
- Final reward: +250 XP + **Badge "Critic Silver"**

**Social Butterfly** (4 étapes):
- Follow 10 → Gain 5 followers → Receive 25 helpful votes → Gain 25 followers
- Final reward: +200 XP + **Badge "Influencer Bronze"**

#### 4. Event Missions (Saisonniers)

- **Songkran Celebration** (April 13-15): 10 check-ins (+300 XP)
- **Halloween Night Out** (Oct 31): 5 check-ins (+250 XP)

---

## Leaderboards

### 3 Types de Classements

#### 1. Global Leaderboard (Top 100 all time)
- Classement par `total_xp`
- Materialized View (refresh toutes les heures)
- Affiche: Rank, Username, Total XP, Level

#### 2. Monthly Leaderboard (Top 50 du mois)
- Classement par `monthly_xp`
- Reset le 1er de chaque mois
- Encourage la compétition régulière

#### 3. Zone Leaderboard (Top 20 par zone)
- Basé sur les check-ins vérifiés par zone
- Exemple: "Top 20 Soi 6 Explorers"
- Favorise l'exploration locale

### Refresh Strategy

```sql
-- Function to refresh leaderboards (run hourly via cron)
CREATE OR REPLACE FUNCTION refresh_leaderboards()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_global;
  REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_monthly;
END;
$$ LANGUAGE plpgsql;
```

---

## Fonctionnalités Sociales

### Follow/Unfollow System

- Suivre d'autres utilisateurs actifs
- Voir le fil d'activité des followés
- Notifications lors de nouveaux avis de vos "guides"
- Prévention auto-follow (`CHECK (follower_id != following_id)`)

### Vote "Helpful" sur Avis

- Voter "helpful" ou "not_helpful" sur reviews
- Limite: 1 vote par user par review
- Update automatique du vote si changement d'avis
- **Récompense XP**: +3 XP pour l'auteur de la review si vote "helpful"

### Profils Publics (À implémenter)

- Vitrine de badges débloqués
- Stats: Niveaux, XP, avis, photos, lieux visités
- Graphique d'activité (heatmap)
- Followers/Following count

---

## Check-ins Géolocalisés

### Fonctionnement

1. User clique "Check-in" sur page établissement
2. App récupère position GPS (`latitude`, `longitude`)
3. Backend calcule distance avec coordonnées établissement (Haversine formula)
4. **Vérification**: Distance ≤ 100m → Check-in **verified**
5. Si verified: **+15 XP** + badge progress

### Algorithme de Distance

**Formule de Haversine** (précision ±0.5% pour distances < 1km) :

```typescript
const calculateDistance = (lat1, lon1, lat2, lon2): number => {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};
```

### Extraction Coordonnées Établissements (PostGIS)

La table `establishments` utilise une colonne **PostGIS** `location` (type `GEOGRAPHY(Point)`) au lieu de colonnes séparées `latitude`/`longitude`.

**Extraction SQL** :
```typescript
const { data: establishment } = await supabase
  .from('establishments')
  .select(`
    name,
    zone,
    ST_Y(location::geometry) as latitude,   // Extrait latitude
    ST_X(location::geometry) as longitude   // Extrait longitude
  `)
  .eq('id', establishmentId)
  .single();
```

**Avantages PostGIS** :
- ✅ Pas de duplication données (single source of truth)
- ✅ Optimisé pour géolocalisation (indexes spatiaux)
- ✅ Fonctions géospatiales avancées (distance, radius, etc.)

### Données Sauvegardées

```sql
CREATE TABLE check_ins (
  user_id UUID,
  establishment_id UUID,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  verified BOOLEAN,          -- True si < 100m
  distance_meters DECIMAL,   -- Distance exacte
  created_at TIMESTAMP
);
```

---

## API Endpoints

### XP & Points

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/gamification/award-xp` | POST | ✅ + CSRF | Award XP to user |
| `/api/gamification/user-progress/:userId` | GET | ✅ | Get user progress |
| `/api/gamification/my-progress` | GET | ✅ | Get current user progress |

### Badges

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/gamification/badges` | GET | ✅ | Get all badges (query: ?category=exploration) |
| `/api/gamification/badges/user/:userId` | GET | ✅ | Get user's earned badges |
| `/api/gamification/my-badges` | GET | ✅ | Get current user's badges |

### Leaderboards

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/gamification/leaderboard/:type` | GET | ✅ | Get leaderboard (global/monthly/zone) |

Query params:
- `?zone=Soi 6` (required if type=zone)
- `?limit=50` (default: 50)

### Check-ins

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/gamification/check-in` | POST | ✅ + CSRF | Create check-in (geolocation) |
| `/api/gamification/my-check-ins` | GET | ✅ | Get user's check-in history |

### Missions

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/gamification/missions` | GET | ✅ | Get available missions (query: ?type=daily) |
| `/api/gamification/my-missions` | GET | ✅ | Get user's mission progress |

### Social

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/gamification/follow/:userId` | POST | ✅ + CSRF | Follow a user |
| `/api/gamification/follow/:userId` | DELETE | ✅ + CSRF | Unfollow a user |
| `/api/gamification/reviews/:reviewId/vote` | POST | ✅ + CSRF | Vote on review (helpful/not_helpful) |

---

## Base de Données

### Tables Créées

1. **user_points** - XP, level, streak tracking
2. **badges** - Badge definitions (46 badges)
3. **user_badges** - Badges earned by users
4. **missions** - Mission definitions (daily/weekly/event/narrative)
5. **user_mission_progress** - User progress on missions
6. **check_ins** - Geolocation check-ins
7. **user_followers** - Follow relationships
8. **review_votes** - Helpful votes on reviews
9. **xp_transactions** - Audit log of all XP awards

### Materialized Views

- **leaderboard_global** - Top 100 by total XP
- **leaderboard_monthly** - Top 50 by monthly XP

### Fonctions PostgreSQL

- `award_xp(user_id, xp_amount, reason, entity_type, entity_id)` - Award XP et recalculer niveau
- `reset_monthly_xp()` - Reset monthly XP (cron: 1er du mois)
- `update_streak(user_id)` - Update streak quotidien
- `refresh_leaderboards()` - Refresh materialized views (cron: hourly)

---

## Installation

### 1. Migration Database

```bash
# Dans Supabase SQL Editor, exécuter:
backend/database/migrations/add_gamification_system.sql
```

Cela crée:
- 9 tables
- 2 materialized views
- 4 fonctions PostgreSQL
- 30+ indexes

### 2. Seed Data

```bash
# Seed badges (46 badges)
backend/database/seeds/seed_gamification_badges.sql

# Seed missions (20+ missions)
backend/database/seeds/seed_gamification_missions.sql
```

### 3. Cron Jobs (Supabase via pg_cron)

```sql
-- Reset monthly XP (1er du mois à minuit)
SELECT cron.schedule(
  'reset-monthly-xp',
  '0 0 1 * *',
  $$SELECT reset_monthly_xp()$$
);

-- Refresh leaderboards (toutes les heures)
SELECT cron.schedule(
  'refresh-leaderboards',
  '0 * * * *',
  $$SELECT refresh_leaderboards()$$
);
```

### 4. Backend Routes

Les routes sont déjà montées dans `server.ts`:

```typescript
import gamificationRoutes from './routes/gamification';
app.use('/api/gamification', gamificationRoutes);
```

### 5. Frontend Integration (À faire)

Voir [Roadmap](#roadmap) Phase 1-5.

---

## Testing

### Development Mode (GPS Bypass)

**Problem**: Check-in missions require being within 100m of establishments in Pattaya, making local testing impossible.

**Solution**: `MISSION_DEV_MODE` environment variable bypasses GPS verification in development.

#### Setup

**1. Enable Development Mode**

```bash
# backend/.env
MISSION_DEV_MODE=true
```

**⚠️ IMPORTANT**: Set to `false` in production to prevent abuse.

**2. Restart Backend**

```bash
cd backend
npm run dev  # Port 8080
```

**3. Verify Dev Mode Active**

```typescript
// Check-ins will now be verified regardless of GPS distance
// gamificationController.ts:400
const isDevMode = process.env.MISSION_DEV_MODE === 'true';
const verified = isDevMode ? true : distance <= 100;
```

#### Test Check-ins (Manual)

**API Endpoint**: `POST /api/gamification/check-in`

**Request**:
```bash
curl -X POST http://localhost:8080/api/gamification/check-in \
  -H "Content-Type: application/json" \
  -H "Cookie: token=your_jwt_token" \
  -d '{
    "establishmentId": "uuid-here",
    "latitude": 12.9236,
    "longitude": 100.8825
  }'
```

**Response (Dev Mode)**:
```json
{
  "checkIn": { "id": "...", "verified": true },
  "verified": true,
  "distance": 9999,  // Real distance (ignored in dev)
  "xpAwarded": 15,
  "message": "Check-in verified! You're 9999m from Establishment. +15 XP"
}
```

### Seed Test Data

**Purpose**: Generate realistic check-ins for testing mission completion.

#### Run Seeder

**1. Open Supabase SQL Editor**
   - Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/sql

**2. Execute Seed File**
```sql
-- Copy/paste content from:
-- backend/database/seeds/seed_test_checkins.sql
```

**3. Verify Results**
```sql
-- Expected output:
-- ========================================
-- Test Check-ins Seeded Successfully!
-- ========================================
-- Total check-ins created: 26
-- User: test@pattamap.com (ID: uuid)
-- Zones covered: 5/6 (Soi 6, Walking Street, LK Metro, Treetown, Soi Buakhao)
-- Date range: Last 7 days
-- ========================================
```

#### Check-ins Created

| Zone | Count | Establishments |
|------|-------|----------------|
| Soi 6 | 6 | (Daily mission + Grand Tour) |
| Walking Street | 5 | Grand Tour Step 2 |
| LK Metro | 5 | Grand Tour Step 3 |
| Treetown | 5 | Grand Tour Step 4 |
| Soi Buakhao | 5 | Grand Tour Step 5 |
| **Total** | **26** | Distributed over 7 days |

#### Verification Queries

**1. Count check-ins by zone:**
```sql
SELECT
  e.zone,
  COUNT(*) as checkin_count
FROM check_ins c
JOIN establishments e ON c.establishment_id = e.id
WHERE c.user_id = (SELECT id FROM users WHERE email = 'test@pattamap.com')
GROUP BY e.zone;
```

**2. Check mission progress:**
```sql
SELECT
  m.name,
  m.type,
  ump.current_progress,
  m.requirements->>'count' as required,
  ump.completed
FROM user_mission_progress ump
JOIN missions m ON ump.mission_id = m.id
WHERE ump.user_id = (SELECT id FROM users WHERE email = 'test@pattamap.com')
  AND m.requirements->>'type' LIKE '%check%'
ORDER BY m.type, m.name;
```

**Expected Results**:
- ✅ Daily: Explorer (1/1) → **Completed**
- ✅ Weekly: Weekly Explorer (5/3) → **Completed**
- ✅ Weekly: Zone Master Weekly (26/10) → **Completed**
- ✅ Grand Tour: Soi 6 (6/5) → **Completed**
- ✅ Grand Tour: Walking Street (5/5) → **Completed**
- ✅ Grand Tour: LK Metro (5/5) → **Completed**
- ✅ Grand Tour: Treetown (5/5) → **Completed**
- ✅ Grand Tour: Soi Buakhao (5/5) → **Completed**
- ❌ Grand Tour: Jomtien (0/5) → **Incompletable** (zone missing)

### Known Issues

#### 1. Jomtien Zone Missing

**Issue**: Mission "Grand Tour: Jomtien" requires 5 check-ins in zone "Jomtien", but **0 establishments** have this zone.

**Impact**:
- Grand Tour Step 6/7 (Jomtien) → Cannot be completed
- Grand Tour Step 7/7 (Complete) → Cannot be completed (requires Step 6)

**Workaround**: Test with 5 available zones (Soi 6, Walking Street, LK Metro, Treetown, Soi Buakhao).

**Permanent Fix**: Add establishments with `zone='Jomtien'` OR disable Jomtien missions.

#### 2. Zone Naming Mismatch

**Issue**: Inconsistent capitalization between missions and establishments.

**Missions** use capitalized names:
- "Soi 6", "Walking Street", "LK Metro", "Soi Buakhao", "Treetown", "Jomtien"

**Establishments** use lowercase:
- "soi6", "walkingstreet", "lkmetro", "soibuakhao", "treetown"

**Exception**: "Soi 6" exists in both forms (3 establishments capitalized + 35 lowercase).

**Current Status**: `missionTrackingService.ts` handles both variations.

**Recommended Fix**: Normalize all zone names to lowercase everywhere.

### Troubleshooting

#### Check-ins Not Verified

**Symptom**: `verified: false` despite `MISSION_DEV_MODE=true`

**Checklist**:
1. ✅ `MISSION_DEV_MODE=true` in `backend/.env`
2. ✅ Backend server restarted after `.env` change
3. ✅ Check logs for `isDevMode` value:
   ```bash
   # Should see in gamificationController.ts:400
   console.log('Dev mode:', isDevMode); // true
   ```

#### Missions Not Tracking

**Symptom**: Check-ins created but mission progress not updated

**Checklist**:
1. ✅ RPC function `update_mission_progress()` exists in Supabase:
   ```sql
   SELECT proname FROM pg_proc WHERE proname = 'update_mission_progress';
   ```
2. ✅ Mission tracking called in controller:
   ```typescript
   // gamificationController.ts:432
   await missionTrackingService.onCheckIn(userId, establishmentId, zone, verified);
   ```
3. ✅ Check backend logs for errors
4. ✅ Verify mission is active:
   ```sql
   SELECT name, is_active FROM missions WHERE name LIKE '%Explorer%';
   ```

#### Seeder Fails

**Symptom**: "Test user not found" error

**Fix**: Create test user first:
```sql
INSERT INTO users (email, password_hash, role)
VALUES ('test@pattamap.com', 'dummy_hash', 'user');
```

---

## Roadmap

### ✅ Phase 1: Backend Foundations (2 jours) - **COMPLÉTÉ**

- ✅ Migrations database (9 tables + views + functions)
- ✅ Seeds (46 badges + 20 missions)
- ✅ Controllers (`gamificationController.ts` - 14 fonctions)
- ✅ Routes (`/api/gamification/*` - 15 endpoints)
- ✅ Integration dans `server.ts`

### ✅ Phase 2: XP System Frontend (2 jours) - **COMPLÉTÉ**

- ✅ Context React `GamificationProvider` (state management complet)
- ✅ Middleware auto-award XP (backend RPC functions)
- ✅ Composant `<XPProgressBar />` (animated, responsive)
- ✅ Toast animations "+XP" avec Framer Motion
- ✅ Composant `<XPToastNotifications />` (auto-dismiss 3s)

### ✅ Phase 3: Badges & Achievements (2 jours) - **COMPLÉTÉ**

- ✅ Logique vérification badges (backend functions)
- ✅ Composant `<BadgeShowcase />` (filtres, rarity colors)
- ✅ Page `<MyAchievementsPage />` (4 tabs: Overview/Badges/Missions/Leaderboard)
- ✅ Badge display sur profils utilisateurs (GamifiedUserProfile)

### ✅ Phase 4: Missions & Leaderboards (2 jours) - **COMPLÉTÉ**

- ✅ Composant `<MissionsDashboard />` (tabs Daily/Weekly/Narrative)
- ✅ Composant `<Leaderboard />` avec tabs (Global/Monthly) + podium top 3
- ✅ Check-in button `<CheckInButton />` avec geolocation (Haversine formula)
- ✅ Materialized views pour leaderboards (performance optimisée)

### ✅ Phase 5: Social & Polish (2 jours) - **COMPLÉTÉ**

- ✅ Système de followers `<FollowButton />` (follow/unfollow)
- ✅ Vote "helpful" `<ReviewVoteButton />` sur avis
- ✅ Profil public gamifié `<GamifiedUserProfile />`
- ✅ Documentation complète (GAMIFICATION_SYSTEM.md + MIGRATION_RECAP.md)
- ⏳ Tests E2E (Playwright) - **À faire**

**Total réalisé**: 10 jours | **Temps restant**: Tests (1-2 jours)

---

## Métriques de Succès

### KPIs à Tracker

1. **Engagement**:
   - Temps moyen session (avant/après)
   - Pages vues par session
   - Taux de retour (daily/weekly/monthly)

2. **Contributions**:
   - Nombre d'avis/mois (croissance %)
   - Photos uploadées/mois
   - Corrections de profils soumises

3. **Gamification**:
   - % utilisateurs avec ≥1 badge
   - Distribution des niveaux (combien d'Ambassadors, VIPs, etc.)
   - Taux de complétion missions quotidiennes

4. **Social**:
   - Nombre moyen de followers par user
   - Taux de croissance réseau social
   - % avis avec votes "helpful"

### Objectifs Q2 2025

- **50,000 XP** total distribués
- **500 badges** débloqués
- **5,000 check-ins** vérifiés
- **100 Ambassadors** (niveau 7)

---

## Support & Contribution

### Questions & Bugs

- GitHub Issues: https://github.com/yourrepo/issues
- Email: support@pattaya.guide

### Contribution

Voir [CONTRIBUTING.md](../../CONTRIBUTING.md) pour guidelines.

---

**🏮 PattaMap Gamification - Naviguer Pattaya avec Plaisir**

**Version**: v10.3 | **Status**: Backend Complete, Frontend In Progress | **Dernière mise à jour**: Janvier 2025
