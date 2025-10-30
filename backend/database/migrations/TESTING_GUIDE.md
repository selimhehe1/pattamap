# 🧪 Guide de Tests Complet - Système de Gamification

> **Version**: 1.0.0
> **Date**: Janvier 2025
> **Objectif**: Tester et valider le système de gamification PattaMap

---

## 📋 Table des Matières

1. [Vérifications SQL](#vérifications-sql)
2. [Tests API Backend](#tests-api-backend)
3. [Tests Frontend](#tests-frontend)
4. [Scénarios Utilisateur](#scénarios-utilisateur)
5. [Troubleshooting](#troubleshooting)

---

## ✅ Vérifications SQL

### Étape 1: Vérifier les Tables Créées

Exécutez dans **Supabase SQL Editor**:

```sql
-- Liste des tables gamification
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'user_points',
  'badges',
  'user_badges',
  'missions',
  'user_missions',
  'xp_transactions',
  'check_ins',
  'user_follows',
  'review_votes'
)
ORDER BY table_name;
```

**Résultat attendu**: 9 tables listées

---

### Étape 2: Vérifier les Vues Matérialisées

```sql
-- Liste des vues matérialisées
SELECT matviewname
FROM pg_matviews
WHERE schemaname = 'public'
AND matviewname IN ('leaderboard_global', 'leaderboard_monthly');
```

**Résultat attendu**: 2 vues (leaderboard_global, leaderboard_monthly)

---

### Étape 3: Vérifier les Fonctions PostgreSQL

```sql
-- Liste des fonctions RPC
SELECT proname, pg_get_function_arguments(oid) as arguments
FROM pg_proc
WHERE proname IN ('award_xp', 'reset_monthly_xp', 'update_streak', 'refresh_leaderboards');
```

**Résultat attendu**: 4 fonctions listées

---

### Étape 4: Compter les Badges Seedés

```sql
-- Total badges par catégorie
SELECT
  category,
  COUNT(*) as count
FROM badges
GROUP BY category
ORDER BY category;
```

**Résultat attendu**:
```
contribution  | 14
exploration   | 9
quality       | 6
secret        | 4
social        | 7
temporal      | 6
TOTAL         | 46
```

---

### Étape 5: Compter les Missions Seedées

```sql
-- Total missions par type
SELECT
  type,
  COUNT(*) as count
FROM missions
GROUP BY type
ORDER BY type;
```

**Résultat attendu**:
```
daily      | 6
event      | 2
narrative  | 18
weekly     | 6
TOTAL      | 32
```

---

## 🔌 Tests API Backend

### Prérequis

1. **Backend lancé**: `cd backend && npm run dev` (port 8080)
2. **User logged in**: Avoir un auth cookie valide
3. **Outil de test**: Thunder Client, Postman, ou curl

---

### Test 1: Récupérer Mon Progrès

**Endpoint**: `GET /api/gamification/my-progress`

**Headers**:
```
Cookie: auth_token=<votre-cookie>
Content-Type: application/json
```

**Commande curl**:
```bash
curl -X GET http://localhost:8080/api/gamification/my-progress \
  -H "Cookie: auth_token=<votre-cookie>" \
  -H "Content-Type: application/json"
```

**Résultat attendu** (200 OK):
```json
{
  "progress": {
    "user_id": "uuid",
    "total_xp": 0,
    "current_level": 1,
    "monthly_xp": 0,
    "current_streak_days": 0,
    "longest_streak_days": 0,
    "last_activity_date": "2025-01-XX",
    "created_at": "2025-01-XX"
  }
}
```

---

### Test 2: Attribuer XP (Test Critique)

**Endpoint**: `POST /api/gamification/award-xp`

**Headers**:
```
Cookie: auth_token=<votre-cookie>
X-CSRF-Token: <votre-csrf-token>
Content-Type: application/json
```

**Body**:
```json
{
  "userId": "<votre-user-id>",
  "xpAmount": 100,
  "reason": "test_award",
  "entityType": "test",
  "entityId": null
}
```

**Commande curl**:
```bash
curl -X POST http://localhost:8080/api/gamification/award-xp \
  -H "Cookie: auth_token=<votre-cookie>" \
  -H "X-CSRF-Token: <csrf-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "<user-id>",
    "xpAmount": 100,
    "reason": "test_award"
  }'
```

**Résultat attendu** (200 OK):
```json
{
  "message": "XP awarded successfully",
  "newProgress": {
    "total_xp": 100,
    "current_level": 2,  // Niveau augmenté (100+ XP = Level 2)
    "monthly_xp": 100
  }
}
```

**Vérification SQL**:
```sql
-- Vérifier transaction XP
SELECT * FROM xp_transactions
WHERE user_id = '<user-id>'
ORDER BY created_at DESC
LIMIT 1;

-- Vérifier progression
SELECT total_xp, current_level, monthly_xp
FROM user_points
WHERE user_id = '<user-id>';
```

---

### Test 3: Récupérer Tous les Badges

**Endpoint**: `GET /api/gamification/badges`

**Commande curl**:
```bash
curl -X GET http://localhost:8080/api/gamification/badges \
  -H "Cookie: auth_token=<votre-cookie>"
```

**Résultat attendu** (200 OK):
- Array de 46 badges
- Chaque badge avec: `id`, `name`, `description`, `icon_url`, `category`, `rarity`, `requirement_type`, `requirement_value`, `is_hidden`

---

### Test 4: Récupérer Mes Badges

**Endpoint**: `GET /api/gamification/my-badges`

**Résultat attendu** (200 OK):
```json
{
  "badges": [],  // Vide initialement (aucun badge obtenu)
  "totalBadges": 46,
  "earnedBadges": 0
}
```

---

### Test 5: Récupérer Toutes les Missions

**Endpoint**: `GET /api/gamification/missions?is_active=true`

**Résultat attendu** (200 OK):
- Array de 30 missions actives (daily + weekly + narrative, sans events désactivés)
- Chaque mission avec: `id`, `name`, `description`, `type`, `xp_reward`, `requirements`, `is_active`

---

### Test 6: Récupérer Mes Missions

**Endpoint**: `GET /api/gamification/my-missions`

**Résultat attendu** (200 OK):
```json
{
  "missions": [],  // Vide initialement (aucune progression)
  "totalMissions": 30
}
```

---

### Test 7: Leaderboard Global

**Endpoint**: `GET /api/gamification/leaderboard/global?limit=10`

**Résultat attendu** (200 OK):
```json
{
  "leaderboard": [
    {
      "rank": 1,
      "user_id": "uuid",
      "username": "votre-username",
      "total_xp": 100,
      "current_level": 2
    }
  ]
}
```

---

### Test 8: Leaderboard Monthly

**Endpoint**: `GET /api/gamification/leaderboard/monthly?limit=10`

**Résultat attendu**: Similaire au leaderboard global, mais basé sur `monthly_xp`

---

### Test 9: Check-in (Nécessite coordonnées GPS)

**Endpoint**: `POST /api/gamification/check-in`

**Body**:
```json
{
  "establishmentId": "<establishment-id>",
  "latitude": 12.9342,
  "longitude": 100.8844
}
```

**Résultat attendu**:
- Si distance ≤ 100m: `verified: true`, `xpAwarded: 15`
- Si distance > 100m: `verified: false`, `message: "Too far away"`

---

### Test 10: Follow User

**Endpoint**: `POST /api/gamification/follow/<other-user-id>`

**Résultat attendu** (200 OK):
```json
{
  "message": "Following user",
  "xpAwarded": 5
}
```

---

### Test 11: Vote on Review

**Endpoint**: `POST /api/gamification/reviews/<review-id>/vote`

**Résultat attendu** (200 OK):
```json
{
  "message": "Voted as helpful",
  "voteCount": 1,
  "xpAwarded": 5  // XP pour l'auteur du review
}
```

---

## 🎨 Tests Frontend

### Prérequis

1. **Frontend lancé**: `npm start` (port 3000)
2. **User logged in**: Se connecter avec un compte valide

---

### Test 1: Vérifier XP Progress Bar

**Étapes**:
1. Aller sur n'importe quelle page logged in
2. Chercher la XP bar dans le header (ou sidebar)

**Résultat attendu**:
- Barre de progression visible
- Affiche niveau actuel (ex: "Lv.2 Explorer")
- Affiche XP total et progression vers prochain niveau
- Si streak actif: badge "🔥 X jours"

---

### Test 2: Voir Mes Achievements

**Étapes**:
1. Naviguer vers `/achievements`
2. Vérifier les 4 tabs: Overview / Badges / Missions / Leaderboard

**Résultat attendu**:
- **Tab Overview**:
  - Stats cards (Total XP, Monthly XP, Streak, Badges)
  - XP bar détaillée
- **Tab Badges**:
  - Badge showcase avec filtres (All / Exploration / Contribution / etc.)
  - Badges locked affichés en gris
  - Badges earned affichés en couleur avec date
- **Tab Missions**:
  - Missions dashboard avec tabs (Daily / Weekly / Narrative)
  - Barres de progression pour chaque mission
  - Completed missions avec checkmark vert
- **Tab Leaderboard**:
  - Podium top 3 animé
  - Liste complète avec rangs, usernames, XP, niveaux

---

### Test 3: Notification Toast XP

**Étapes**:
1. Depuis Postman/Thunder Client, faire `POST /api/gamification/award-xp` avec 50 XP
2. Observer le frontend (rafraîchir si nécessaire)

**Résultat attendu**:
- Notification toast "+50 XP" apparaît (coin supérieur droit)
- Animation slide-in avec Framer Motion
- Raison affichée (ex: "Test Award")
- Toast disparaît après 3 secondes

---

### Test 4: Badge Showcase (Page Achievements)

**Étapes**:
1. Aller sur `/achievements` → Tab "Badges"
2. Cliquer sur les filtres de catégorie (All / Exploration / Contribution / etc.)

**Résultat attendu**:
- Filtrage fonctionne (seuls badges de catégorie sélectionnée affichés)
- Badges locked = grisés avec cadenas
- Badges earned = colorés avec glow effect selon rareté (common/rare/epic/legendary)
- Hover effect sur badges

---

### Test 5: Missions Dashboard

**Étapes**:
1. Aller sur `/achievements` → Tab "Missions"
2. Cliquer sur les tabs (Daily / Weekly / Narrative)

**Résultat attendu**:
- Tabs fonctionnent (change le contenu)
- Missions affichées avec:
  - Icône emoji
  - Nom et description
  - Barre de progression
  - Récompense XP (+bonus badge si applicable)
- Missions complétées = badge vert "✓"

---

### Test 6: Leaderboard avec Podium

**Étapes**:
1. Aller sur `/achievements` → Tab "Leaderboard"
2. Cliquer sur les tabs (Global / Monthly)

**Résultat attendu**:
- Podium top 3 affiché en haut (ordre: 2ème | 1er | 3ème)
- Trophées emoji (🥇🥈🥉)
- Liste complète en dessous avec rangs, avatars niveaux, usernames, XP
- Hover effect sur entrées

---

### Test 7: Profil Public Gamifié

**Étapes**:
1. Aller sur `/user/<user-id>/profile`

**Résultat attendu**:
- Header avec:
  - Avatar niveau (emoji dynamique)
  - Username
  - Badge niveau (ex: "Lv.2 Explorer")
  - Bouton "Follow" si pas soi-même
- XP bar détaillée
- Stats grid (8 cards):
  - Total XP
  - Monthly XP
  - Current Streak
  - Longest Streak
  - Badges Count
  - Followers
  - Following
  - Global Rank (si top 100)
- Badge showcase

---

## 🎯 Scénarios Utilisateur

### Scénario 1: Nouveau User Gagne Ses Premiers XP

**Étapes**:
1. Créer nouveau compte ou utiliser compte avec 0 XP
2. Via Postman, award 50 XP: `POST /api/gamification/award-xp`
3. Rafraîchir page `/achievements`

**Vérifications**:
- ✅ Total XP passe de 0 → 50
- ✅ Niveau reste 1 (Newbie, 0-99 XP)
- ✅ XP bar progresse visuellement (~50%)
- ✅ Toast "+50 XP" apparaît
- ✅ Leaderboard affiche user avec 50 XP

---

### Scénario 2: User Level Up

**Étapes**:
1. User avec 50 XP
2. Award 100 XP supplémentaires (total = 150 XP)

**Vérifications**:
- ✅ Niveau passe de 1 → 2 (Explorer, 100-299 XP)
- ✅ Avatar change (🌱 → 🗺️)
- ✅ Badge niveau mis à jour
- ✅ Toast "+100 XP" + éventuelle notification level up

---

### Scénario 3: User Complète Une Mission Daily

**Étapes**:
1. Identifier une mission daily (ex: "Daily Reviewer" = write 1 review)
2. Simuler action: Award XP pour "write_review"
3. Backend doit automatiquement incrémenter progression mission

**Vérifications**:
- ✅ Mission progress passe de 0/1 → 1/1
- ✅ Mission marquée "completed" (checkmark vert)
- ✅ XP reward de la mission ajouté (+20 XP)

---

### Scénario 4: User Obtient Premier Badge

**Étapes**:
1. User fait 1 check-in
2. Backend détecte condition badge "First Visit" (check_in_count >= 1)
3. Badge auto-attribué

**Vérifications**:
- ✅ Badge apparaît dans "My Badges"
- ✅ Badge coloré (plus grisé)
- ✅ Date "earned_at" affichée
- ✅ XP bonus badge (+50 XP common badge)

---

### Scénario 5: User Apparaît dans Leaderboard

**Étapes**:
1. User accumule 500 XP (niveau 4-5)
2. Vérifier leaderboard global

**Vérifications**:
- ✅ User dans top 100
- ✅ Rank assigné (ex: #5)
- ✅ XP et niveau visibles
- ✅ Si top 3: apparaît dans podium avec animation

---

## 🐛 Troubleshooting

### Problème 1: XP Bar Ne S'affiche Pas

**Symptômes**: Aucune barre XP visible dans header

**Solutions**:
1. Vérifier que `GamificationProvider` entoure l'app dans `App.tsx`
2. Check console: erreurs API `/api/gamification/my-progress`?
3. Vérifier user logged in (auth cookie valide)
4. Vérifier table `user_points` contient une entrée pour le user

**SQL Debug**:
```sql
SELECT * FROM user_points WHERE user_id = '<user-id>';
```

---

### Problème 2: Toast Notifications Ne S'affichent Pas

**Symptômes**: Award XP réussit mais pas de toast

**Solutions**:
1. Vérifier `<XPToastNotifications />` présent dans `App.tsx`
2. Check console: erreurs Framer Motion?
3. Vérifier fonction `addXPNotification()` appelée dans `awardXP()`

---

### Problème 3: Badges Tous Grisés (Locked)

**Symptômes**: Aucun badge coloré, tous affichés comme locked

**Solutions**:
1. Vérifier table `user_badges`: contient des entrées?
   ```sql
   SELECT * FROM user_badges WHERE user_id = '<user-id>';
   ```
2. Si vide: badges pas encore obtenus (normal)
3. Pour tester: Insérer badge manuellement:
   ```sql
   INSERT INTO user_badges (user_id, badge_id, earned_at)
   VALUES ('<user-id>', (SELECT id FROM badges WHERE name = 'First Visit'), NOW());
   ```

---

### Problème 4: Missions Ne S'affichent Pas

**Symptômes**: Tab "Missions" vide

**Solutions**:
1. Vérifier table `missions` contient 32 entrées
   ```sql
   SELECT COUNT(*) FROM missions;
   ```
2. Vérifier `is_active = true` pour daily/weekly/narrative
3. Check API `/api/gamification/missions`: retourne array?

---

### Problème 5: Leaderboard Vide

**Symptômes**: Tab "Leaderboard" n'affiche aucun user

**Solutions**:
1. Vérifier vues matérialisées créées:
   ```sql
   SELECT * FROM leaderboard_global LIMIT 5;
   ```
2. Si vide: Refresh manuel:
   ```sql
   REFRESH MATERIALIZED VIEW leaderboard_global;
   ```
3. Vérifier au moins 1 user avec XP > 0 dans `user_points`

---

### Problème 6: Niveau Ne Monte Pas

**Symptômes**: User gagne XP mais niveau reste 1

**Solutions**:
1. Vérifier fonction `award_xp()` existe et fonctionne
2. Test SQL:
   ```sql
   SELECT award_xp(
     '<user-id>'::UUID,
     200,
     'test',
     NULL,
     NULL
   );
   ```
3. Vérifier seuils niveaux dans fonction (100, 300, 600, 1200, 2500, 6000)

---

### Problème 7: Check-in Toujours "Not Verified"

**Symptômes**: Check-ins échouent même si sur place

**Solutions**:
1. Vérifier coordonnées GPS establishment dans DB
2. Vérifier formule Haversine dans `gamificationController.ts`
3. Test avec coordonnées exactes establishment ± 50m

---

### Problème 8: CSRF Token Error

**Symptômes**: Erreur 403 "Invalid CSRF token" sur POST requests

**Solutions**:
1. Vérifier cookie `XSRF-TOKEN` présent
2. Header `X-CSRF-Token` doit matcher cookie
3. Si problème persistant: Vérifier `csrfProtection` middleware dans routes

---

## ✅ Checklist Finale

Avant de considérer le système **production-ready**, cochez:

### Backend
- [ ] ✅ 9 tables créées et vérifiées
- [ ] ✅ 2 vues matérialisées créées
- [ ] ✅ 4 fonctions PostgreSQL fonctionnelles
- [ ] ✅ 46 badges seedés
- [ ] ✅ 32 missions seedées
- [ ] ✅ 15 API endpoints testés (réponses 200 OK)
- [ ] ✅ XP attribution fonctionne (test award_xp)
- [ ] ✅ Niveau calcul automatique fonctionne
- [ ] ✅ Leaderboards affichent données

### Frontend
- [ ] ✅ XP bar visible et fonctionnelle
- [ ] ✅ Toast notifications XP apparaissent
- [ ] ✅ Page /achievements charge sans erreur
- [ ] ✅ 4 tabs achievements fonctionnent
- [ ] ✅ Badge showcase affiche badges
- [ ] ✅ Missions dashboard affiche missions
- [ ] ✅ Leaderboard avec podium fonctionne
- [ ] ✅ Profil public gamifié accessible

### Intégration
- [ ] ✅ Award XP → Toast notification → XP bar update
- [ ] ✅ Award XP → Level up visible
- [ ] ✅ Badge obtenu → Apparaît dans showcase
- [ ] ✅ Mission complétée → Checkmark vert
- [ ] ✅ User dans leaderboard après XP gagné

---

## 🎉 Tests Réussis!

Si tous les tests passent, le système de gamification est **100% opérationnel** et prêt pour la production!

**Prochaines étapes**:
1. Créer données de test (voir `seed_test_data.sql`)
2. Tester avec plusieurs users simultanément
3. Configurer cron jobs (reset monthly, refresh leaderboards)
4. Monitoring Sentry activé pour tracker erreurs

**🎮 Bon jeu!**
