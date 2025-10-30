# Employee Existence Votes Seed - Documentation

## 📋 Vue d'ensemble

Ce seed génère des votes d'existence variés pour visualiser les 3 types de badges ValidationBadge dans l'interface frontend PattaMap.

## 🎯 Objectif

Créer des données de test réalistes pour évaluer visuellement le système de validation communautaire des profils employées.

## 🏷️ Types de Badges Testés

| Badge Type | Condition | Apparence | Scénarios |
|------------|-----------|-----------|-----------|
| **"?"** (Under Review) | < 20 votes | Gris, neutre | 3 profils (5, 10, 15 votes) |
| **Neutral** (Trusted) | ≥ 20 votes + >50% validation | Vert, checkmark | 4 profils (20-50 votes, 75-90%) |
| **"⚠️"** (Warning) | ≥ 20 votes + ≤50% validation | Rouge, warning | 4 profils (20-30 votes, 35-50%) |

## 📊 Profils Testés

### Scenario 1: Under Review (< 20 votes)
- **Aiko Yamamoto**: 5 votes (80% exists) → Badge "?"
- **Amy**: 10 votes (70% exists) → Badge "?"
- **Anna Petrov**: 15 votes (60% exists) → Badge "?"

### Scenario 2: Positive Validation (≥ 20 votes, >50%)
- **Aom**: 20 votes (75% exists) → Badge Neutral ✅
- **Aomi**: 25 votes (80% exists) → Badge Neutral ✅
- **Apple**: 30 votes (85% exists) → Badge Neutral ✅
- **Benz**: 50 votes (90% exists) → Badge Neutral ✅ (highly trusted)

### Scenario 3: Contested/Warning (≥ 20 votes, ≤50%)
- **Bam**: 20 votes (45% exists) → Badge Warning ⚠️
- **Bee**: 25 votes (40% exists) → Badge Warning ⚠️
- **Beer**: 30 votes (35% exists) → Badge Warning ⚠️
- **Belle**: 20 votes (50% exists) → Badge Warning ⚠️ (edge case at threshold)

### Scenario 4: Edge Cases
- **Bob**: 0 votes → Badge "?" (nouveau profil, aucune donnée)

## 🚀 Installation

### Étape 1 : Ouvrir Supabase SQL Editor
1. Aller sur [https://supabase.com](https://supabase.com)
2. Sélectionner votre projet PattaMap
3. Ouvrir le **SQL Editor** (menu gauche)

### Étape 2 : Exécuter le seed
1. Ouvrir le fichier `seed_employee_existence_votes.sql`
2. Copier **tout le contenu**
3. Coller dans le SQL Editor de Supabase
4. Cliquer sur **Run** ou **Ctrl+Enter**

### Étape 3 : Vérifier les résultats

Exécuter cette requête pour voir les stats :

```sql
SELECT
  e.name,
  COUNT(v.id) as total_votes,
  COUNT(CASE WHEN v.vote_type = 'exists' THEN 1 END) as exists_votes,
  COUNT(CASE WHEN v.vote_type = 'not_exists' THEN 1 END) as not_exists_votes,
  ROUND((COUNT(CASE WHEN v.vote_type = 'exists' THEN 1 END)::numeric / NULLIF(COUNT(v.id), 0) * 100), 2) as validation_percentage,
  CASE
    WHEN COUNT(v.id) < 20 THEN '?'
    WHEN COUNT(v.id) >= 20 AND (COUNT(CASE WHEN v.vote_type = 'exists' THEN 1 END)::numeric / COUNT(v.id) * 100) > 50 THEN 'neutral'
    ELSE 'warning'
  END as badge_type
FROM employees e
LEFT JOIN employee_existence_votes v ON v.employee_id = e.id
WHERE e.name IN ('Aiko Yamamoto', 'Amy', 'Anna Petrov', 'Aom', 'Aomi', 'Apple', 'Bam', 'Bee', 'Beer', 'Belle', 'Benz', 'Bob')
GROUP BY e.id, e.name
ORDER BY total_votes DESC;
```

### Résultat attendu :

```
| name           | total_votes | exists_votes | not_exists_votes | validation_percentage | badge_type |
|----------------|-------------|--------------|------------------|-----------------------|------------|
| Benz           | 50          | 45           | 5                | 90.00                 | neutral    |
| Apple          | 30          | 26           | 4                | 86.67                 | neutral    |
| Beer           | 30          | 11           | 19               | 36.67                 | warning    |
| Aomi           | 25          | 20           | 5                | 80.00                 | neutral    |
| Bee            | 25          | 10           | 15               | 40.00                 | warning    |
| Aom            | 20          | 15           | 5                | 75.00                 | neutral    |
| Bam            | 20          | 9            | 11               | 45.00                 | warning    |
| Belle          | 20          | 10           | 10               | 50.00                 | warning    |
| Anna Petrov    | 15          | 9            | 6                | 60.00                 | ?          |
| Amy            | 10          | 7            | 3                | 70.00                 | ?          |
| Aiko Yamamoto  | 5           | 4            | 1                | 80.00                 | ?          |
| Bob            | 0           | 0            | 0                | NULL                  | ?          |
```

## 🎨 Test Visuel Frontend

### Étape 1 : Lancer l'application
```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
npm start
```

### Étape 2 : Naviguer vers les profils

Visiter les profils des employées testées :
- http://localhost:3000/employees/{employee_id}

Ou chercher par nom dans la recherche.

### Étape 3 : Observer les badges

Vous devriez voir :

1. **Badge "?" gris** : Aiko Yamamoto, Amy, Anna Petrov, Bob
   - Affichage simple : `✓ 4 | ✗ 1` (exemple)

2. **Badge Neutral vert** : Aom, Aomi, Apple, Benz
   - Affichage : `✓ 20 | ✗ 5` (exemple)
   - Signifie : Profil trusté par la communauté

3. **Badge Warning rouge ⚠️** : Bam, Bee, Beer, Belle
   - Affichage : `✓ 10 | ✗ 15` (exemple)
   - Signifie : Profil contesté, possible fake

### Étape 4 : Tester les boutons de vote

- **Si non connecté** : Affiche "🔒 Login to vote"
- **Si connecté** : Affiche 2 boutons
  - `✓ Profile exists`
  - `✗ Fake profile`
- **Après avoir voté** : Affiche "✅ You have already voted"

## 🔄 Réinitialisation

Pour supprimer les votes seed et recommencer :

```sql
-- Option 1: Supprimer tous les votes test (depuis 2025-01-19)
DELETE FROM employee_existence_votes
WHERE created_at >= '2025-01-19';

-- Option 2: Supprimer uniquement les votes des 10 test users
DELETE FROM employee_existence_votes
WHERE user_id IN (
  '3f152ccd-1002-423c-9f7f-d9fcaacce3df',
  'c23c165c-cbdf-43a2-a867-6bba4ea3a7af',
  '529be887-53ee-4594-99d5-eb3583b48b75',
  '74c25871-ce55-4aae-bbdc-764ecbd9682b',
  'de6ce2f3-722b-4a12-8537-ae8d362a27b9',
  'bacfc056-4fcc-44e3-8148-b2884bfd167f',
  '1d1f7bf2-9391-490a-8164-823acc57b9c4',
  '549aa67f-5546-432f-9d4b-61d7d79db30e',
  'a000d746-ba55-4be8-9383-464d3cfa82d9',
  'da104705-299e-4751-b397-94f001aa065c'
);
```

## 📝 Notes Importantes

### Idempotence
Le seed est **idempotent** : exécuter plusieurs fois ne crée pas de duplicates.
Le DELETE au début nettoie les votes existants avant d'insérer les nouveaux.

### Votes Réels Préservés
Les votes de vraies users (non-test accounts) ne sont **jamais supprimés**.
Seuls les votes des 10 test users sont touchés par le DELETE.

### Unique Constraint
La contrainte UNIQUE (employee_id, user_id) empêche les duplicates :
- Un user ne peut voter qu'une seule fois par profil
- Si vous essayez d'insérer un duplicate → erreur SQL (comportement attendu)

### Timestamps
Les votes sont datés avec `NOW() - INTERVAL 'X days'` pour simuler :
- Votes étalés sur plusieurs semaines (réalisme)
- Ordre chronologique (premiers votes = plus anciens)

## 🐛 Troubleshooting

### Erreur : "duplicate key value violates unique constraint"
**Cause** : Les votes existent déjà dans la DB.
**Solution** : Exécuter le DELETE au début du seed, puis réessayer.

### Erreur : "foreign key constraint"
**Cause** : Les employee_id ou user_id n'existent pas.
**Solution** : Vérifier que les profils employées et users test existent dans la DB.

### Badge n'apparaît pas
**Cause** : Cache React Query.
**Solution** : Rafraîchir la page (F5) ou vider le cache navigateur.

### Compteurs incorrects
**Cause** : Seed exécuté partiellement.
**Solution** : Supprimer tous les votes test et réexécuter le seed complet.

## 🎯 Cas d'Usage

### Développement UI/UX
- Tester les 3 types de badges visuellement
- Vérifier les couleurs, icônes, tooltips
- Tester le responsive design

### Démonstration Client
- Montrer le système de validation communautaire
- Expliquer les badges avec exemples concrets
- Démontrer le workflow de vote

### Testing QA
- Tester les seuils (20 votes, 50% validation)
- Vérifier les edge cases (50% exact, 0 votes)
- Valider les performances avec volume élevé (50 votes)

## 📚 Références

- **Controller Backend** : `backend/src/controllers/employeeValidationController.ts`
- **Routes API** : `backend/src/routes/employeeValidation.ts`
- **Badge Component** : `src/components/Employee/ValidationBadge.tsx`
- **Vote Buttons** : `src/components/Employee/ValidationVoteButtons.tsx`

## ✅ Checklist Validation

- [ ] Seed exécuté sans erreur dans Supabase SQL Editor
- [ ] Query de vérification retourne 12 profils avec stats correctes
- [ ] Badge "?" visible sur profils avec < 20 votes
- [ ] Badge Neutral visible sur profils avec ≥ 20 votes + >50%
- [ ] Badge Warning visible sur profils avec ≥ 20 votes + ≤50%
- [ ] Boutons de vote fonctionnent (voter → cache invalidé → badge updated)
- [ ] Toast XP apparaît après vote (+2 XP)
- [ ] "Already voted" empêche double vote

---

**Version** : v10.3
**Date** : 2025-01-19
**Auteur** : Claude Code
**Status** : ✅ Ready for Testing
