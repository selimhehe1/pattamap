# Migration des Catégories d'Établissements

## Contexte
Ce script migre la base de données pour simplifier les catégories d'établissements de 7 à 4 types principaux.

## Catégories après migration
1. **Bar** (ID: 1)
2. **GoGo Bar** (ID: 2)
3. **Massage Salon** (ID: 3)
4. **Nightclub** (ID: 4)

## Mapping des anciennes catégories
- Beer Bar (ID 5) → **Bar** (ID 1)
- Club (ID 6) → **Nightclub** (ID 4)
- Restaurant Bar (ID 7) → **Bar** (ID 1)
- Sports Bar (ID 8) → **Bar** (ID 1)
- Coyote Bar (ID 9) → **GoGo Bar** (ID 2)

## Comment exécuter la migration

### Option 1: Via Supabase Dashboard (Recommandé)
1. Ouvrez votre projet Supabase
2. Allez dans **SQL Editor**
3. Créez une nouvelle requête
4. Copiez-collez le contenu du fichier `migrate-categories.sql`
5. Exécutez la requête (Run)
6. Vérifiez les résultats avec les requêtes de vérification en bas du script

### Option 2: Via CLI Supabase (si installé)
```bash
supabase db push --db-url "your-database-url" < migrate-categories.sql
```

## Vérification post-migration

Exécutez ces requêtes dans le SQL Editor pour vérifier :

```sql
-- Vérifier les catégories
SELECT * FROM establishment_categories ORDER BY id;

-- Vérifier la distribution des établissements par catégorie
SELECT category_id, COUNT(*) as count
FROM establishments
GROUP BY category_id
ORDER BY category_id;
```

Vous devriez voir :
- Exactement 4 catégories (IDs 1-4)
- Aucun établissement avec category_id 5, 6, ou 7

## Important
⚠️ Cette migration est **irréversible**. Les anciennes catégories (Beer Bar, Club, Restaurant Bar) seront définitivement supprimées après la migration.

## Rollback
Si vous devez annuler la migration, vous devrez :
1. Recréer les anciennes catégories manuellement
2. Restaurer les category_id des établissements depuis une sauvegarde

Il est recommandé de faire un backup de votre base avant d'exécuter la migration.
