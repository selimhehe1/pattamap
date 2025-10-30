# Guide de Migration : Social Media Links (v10.1)

## 📋 Vue d'ensemble

Cette migration remplace la colonne `services` (inutilisée) par 3 colonnes de liens social media :
- `instagram` (VARCHAR 255)
- `twitter` (VARCHAR 255)
- `tiktok` (VARCHAR 255)

**Fichier de migration**: `backend/database/migrations/add_social_media_to_establishments.sql`

---

## ⚠️ Prérequis

Avant d'exécuter cette migration :

1. ✅ **Backend mis à jour** - Le code backend doit déjà être déployé (ne plus référencer `services`)
2. ✅ **Frontend mis à jour** - Le code frontend doit déjà être déployé (formulaires + sidebar)
3. 🔐 **Accès Supabase** - Vous devez avoir accès à la console Supabase SQL Editor

---

## 🚀 Étapes d'exécution

### Option A : Migration complète (Recommandée)

Cette option ajoute les colonnes social media ET supprime la colonne `services`.

1. **Ouvrir Supabase SQL Editor**
   - Aller sur https://supabase.com
   - Sélectionner votre projet PattaMap
   - Cliquer sur "SQL Editor" dans le menu latéral

2. **Copier le contenu du fichier de migration**
   - Ouvrir `backend/database/migrations/add_social_media_to_establishments.sql`
   - Copier TOUT le contenu (lignes 1 à 102)

3. **Exécuter la migration**
   - Coller le SQL dans l'éditeur Supabase
   - Cliquer sur "Run" (ou Ctrl+Enter)
   - ✅ Vérifier que toutes les commandes s'exécutent sans erreur

4. **Vérifier la migration**
   - Exécuter les requêtes de vérification (voir section ci-dessous)

---

### Option B : Migration sans suppression de services (Sécuritaire)

Si vous voulez garder la colonne `services` pour rollback :

1. Ouvrir le fichier `backend/database/migrations/add_social_media_to_establishments.sql`
2. **Commenter** la ligne 25 :
```sql
-- ALTER TABLE establishments DROP COLUMN IF EXISTS services;
```
3. Suivre les étapes de l'Option A

---

## ✅ Vérification de la migration

### 1. Vérifier les colonnes

```sql
SELECT column_name, data_type, character_maximum_length, is_nullable
FROM information_schema.columns
WHERE table_name = 'establishments'
AND column_name IN ('instagram', 'twitter', 'tiktok', 'services')
ORDER BY ordinal_position;
```

**Résultat attendu** :
| column_name | data_type | character_maximum_length | is_nullable |
|-------------|-----------|-------------------------|-------------|
| instagram   | character varying | 255           | YES         |
| twitter     | character varying | 255           | YES         |
| tiktok      | character varying | 255           | YES         |

**Note** : `services` ne devrait PAS apparaître si Option A exécutée.

---

### 2. Vérifier les contraintes de validation

```sql
SELECT constraint_name, constraint_type, check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'establishments'
AND (tc.constraint_name LIKE '%instagram%' OR tc.constraint_name LIKE '%twitter%' OR tc.constraint_name LIKE '%tiktok%')
ORDER BY constraint_name;
```

**Résultat attendu** : 3 contraintes CHECK pour validation URL (instagram, twitter, tiktok).

---

### 3. Vérifier les indexes

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'establishments'
AND (indexname LIKE '%instagram%' OR indexname LIKE '%twitter%' OR indexname LIKE '%tiktok%')
ORDER BY indexname;
```

**Résultat attendu** : 3 index (idx_establishments_instagram, idx_establishments_twitter, idx_establishments_tiktok).

---

### 4. Tester l'ajout de données

```sql
-- Test 1 : Ajouter des liens social media (devrait réussir)
UPDATE establishments
SET
  instagram = 'https://instagram.com/test',
  twitter = 'https://x.com/test',
  tiktok = 'https://tiktok.com/@test'
WHERE id = (SELECT id FROM establishments LIMIT 1);

-- Test 2 : Vérifier que la contrainte URL fonctionne (devrait échouer)
UPDATE establishments
SET instagram = 'not_a_valid_url'
WHERE id = (SELECT id FROM establishments LIMIT 1);
-- ❌ Expected error: "violates check constraint check_instagram_url"
```

---

## 🔄 Rollback (si nécessaire)

### Si migration Option A (services supprimé)

⚠️ **ATTENTION** : Rollback impossible si colonne `services` déjà supprimée et données perdues.

**Solution** :
1. Recréer la colonne :
```sql
ALTER TABLE establishments
ADD COLUMN IF NOT EXISTS services TEXT[];
```

2. Supprimer les colonnes social media :
```sql
ALTER TABLE establishments
DROP COLUMN IF EXISTS instagram CASCADE;
ALTER TABLE establishments
DROP COLUMN IF EXISTS twitter CASCADE;
ALTER TABLE establishments
DROP COLUMN IF EXISTS tiktok CASCADE;
```

---

### Si migration Option B (services conservé)

Beaucoup plus simple :

```sql
-- Supprimer les colonnes social media
ALTER TABLE establishments
DROP COLUMN IF EXISTS instagram CASCADE;
ALTER TABLE establishments
DROP COLUMN IF EXISTS twitter CASCADE;
ALTER TABLE establishments
DROP COLUMN IF EXISTS tiktok CASCADE;

-- Services est toujours là, aucune perte de données
```

---

## 📊 Post-migration : Analytics

Après quelques jours, vous pouvez vérifier l'adoption :

```sql
-- Compter les établissements avec social media
SELECT
  COUNT(*) as total_establishments,
  COUNT(*) FILTER (WHERE instagram IS NOT NULL) as has_instagram,
  COUNT(*) FILTER (WHERE twitter IS NOT NULL) as has_twitter,
  COUNT(*) FILTER (WHERE tiktok IS NOT NULL) as has_tiktok,
  COUNT(*) FILTER (WHERE instagram IS NOT NULL OR twitter IS NOT NULL OR tiktok IS NOT NULL) as has_any_social
FROM establishments;
```

---

## 🐛 Troubleshooting

### Erreur : "column already exists"
**Cause** : Migration déjà exécutée partiellement
**Solution** : Vérifier quelles colonnes existent déjà avec la requête de vérification #1

### Erreur : "constraint already exists"
**Cause** : Contraintes déjà créées
**Solution** : Supprimer les contraintes existantes avant de relancer :
```sql
ALTER TABLE establishments DROP CONSTRAINT IF EXISTS check_instagram_url;
ALTER TABLE establishments DROP CONSTRAINT IF EXISTS check_twitter_url;
ALTER TABLE establishments DROP CONSTRAINT IF EXISTS check_tiktok_url;
```

### Erreur : "index already exists"
**Cause** : Index déjà créés
**Solution** : Supprimer les index existants avant de relancer :
```sql
DROP INDEX IF EXISTS idx_establishments_instagram;
DROP INDEX IF EXISTS idx_establishments_twitter;
DROP INDEX IF EXISTS idx_establishments_tiktok;
```

---

## ✅ Checklist finale

Après migration réussie, vérifier :

- [ ] Les 3 colonnes social media existent dans `establishments`
- [ ] Les 3 contraintes CHECK de validation URL fonctionnent
- [ ] Les 3 index de performance existent
- [ ] Le frontend peut créer/éditer des établissements avec social media
- [ ] Les liens social media s'affichent dans `BarInfoSidebar`
- [ ] Les liens sont cliquables et ouvrent les pages en nouvel onglet
- [ ] (Option A uniquement) La colonne `services` n'existe plus

---

## 📞 Support

Si vous rencontrez des problèmes :
1. Vérifier les logs Supabase SQL Editor
2. Vérifier la console browser pour erreurs frontend
3. Vérifier les logs backend (console serveur)

**Version de la migration** : v10.1.0
**Date** : Janvier 2025
