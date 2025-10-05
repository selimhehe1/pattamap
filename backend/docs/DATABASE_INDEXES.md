# 🗄️ Database Indexes - Performance Optimization Guide

## Vue d'ensemble

Ce document liste les indexes recommandés pour optimiser les performances des requêtes Supabase/PostgreSQL.

Les indexes améliorent considérablement la vitesse des queries, en particulier pour:
- Les filtres `WHERE` fréquents
- Les tris `ORDER BY`
- Les jointures `JOIN`
- Les recherches textuelles `ILIKE`

---

## 📊 Indexes recommandés par table

### 1. **establishments** (Établissements)

#### Indexes existants (vérifier dans Supabase Dashboard)
```sql
-- Primary key (déjà indexé automatiquement)
-- id (UUID, primary key)

-- Foreign keys (vérifier si indexés)
-- category_id
-- created_by
```

#### Indexes à créer

```sql
-- Status filter (très fréquent: status = 'approved')
CREATE INDEX IF NOT EXISTS idx_establishments_status
ON establishments(status);

-- Zone filter (map filtering: zone = 'walking_street')
CREATE INDEX IF NOT EXISTS idx_establishments_zone
ON establishments(zone);

-- Category filter (category browsing)
CREATE INDEX IF NOT EXISTS idx_establishments_category
ON establishments(category_id);

-- Composite index for common query: status + zone
CREATE INDEX IF NOT EXISTS idx_establishments_status_zone
ON establishments(status, zone);

-- Composite index for grid queries: zone + grid position
CREATE INDEX IF NOT EXISTS idx_establishments_grid
ON establishments(zone, grid_row, grid_col);

-- Created_at for ordering (recent establishments)
CREATE INDEX IF NOT EXISTS idx_establishments_created_at
ON establishments(created_at DESC);

-- Text search on name (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_establishments_name_gin
ON establishments USING gin(to_tsvector('english', name));
```

**Priorité**: ⭐⭐⭐⭐⭐ (queries très fréquentes)

---

### 2. **employees** (Employées)

#### Indexes à créer

```sql
-- Status filter
CREATE INDEX IF NOT EXISTS idx_employees_status
ON employees(status);

-- Nationality filter
CREATE INDEX IF NOT EXISTS idx_employees_nationality
ON employees(nationality);

-- Age range queries
CREATE INDEX IF NOT EXISTS idx_employees_age
ON employees(age);

-- Created_at for ordering
CREATE INDEX IF NOT EXISTS idx_employees_created_at
ON employees(created_at DESC);

-- Text search on name and nickname
CREATE INDEX IF NOT EXISTS idx_employees_name_gin
ON employees USING gin(to_tsvector('english', name || ' ' || COALESCE(nickname, '')));

-- Composite index for common query: status + nationality
CREATE INDEX IF NOT EXISTS idx_employees_status_nationality
ON employees(status, nationality);
```

**Priorité**: ⭐⭐⭐⭐ (queries fréquentes)

---

### 3. **employment_history** (Historique d'emploi)

#### Indexes à créer

```sql
-- Employee lookups
CREATE INDEX IF NOT EXISTS idx_employment_history_employee
ON employment_history(employee_id);

-- Establishment lookups
CREATE INDEX IF NOT EXISTS idx_employment_history_establishment
ON employment_history(establishment_id);

-- Current employment queries (is_current = true)
CREATE INDEX IF NOT EXISTS idx_employment_history_current
ON employment_history(is_current) WHERE is_current = true;

-- Composite for filtering current jobs at establishment
CREATE INDEX IF NOT EXISTS idx_employment_history_est_current
ON employment_history(establishment_id, is_current)
WHERE is_current = true;
```

**Priorité**: ⭐⭐⭐⭐⭐ (jointures critiques)

---

### 4. **comments** (Commentaires)

#### Indexes à créer

```sql
-- Status filter (moderation)
CREATE INDEX IF NOT EXISTS idx_comments_status
ON comments(status);

-- Employee comments
CREATE INDEX IF NOT EXISTS idx_comments_employee
ON comments(employee_id);

-- User comments
CREATE INDEX IF NOT EXISTS idx_comments_user
ON comments(user_id);

-- Created_at for ordering
CREATE INDEX IF NOT EXISTS idx_comments_created_at
ON comments(created_at DESC);

-- Composite for filtering approved comments by employee
CREATE INDEX IF NOT EXISTS idx_comments_employee_status
ON comments(employee_id, status)
WHERE status = 'approved';
```

**Priorité**: ⭐⭐⭐⭐ (comments listing fréquent)

---

### 5. **users** (Utilisateurs)

#### Indexes à créer

```sql
-- Email lookup (login, unique constraint should create index automatically)
-- Verify: SELECT * FROM pg_indexes WHERE tablename = 'users' AND indexname LIKE '%email%';

-- Role filter (admin queries)
CREATE INDEX IF NOT EXISTS idx_users_role
ON users(role);

-- Created_at for user management
CREATE INDEX IF NOT EXISTS idx_users_created_at
ON users(created_at DESC);
```

**Priorité**: ⭐⭐⭐ (moins critique, peu de queries)

---

### 6. **reports** (Signalements)

#### Indexes à créer

```sql
-- Status filter (moderation queue)
CREATE INDEX IF NOT EXISTS idx_reports_status
ON reports(status);

-- Comment lookups
CREATE INDEX IF NOT EXISTS idx_reports_comment
ON reports(comment_id);

-- Reported by user
CREATE INDEX IF NOT EXISTS idx_reports_reporter
ON reports(reported_by);

-- Created_at for ordering
CREATE INDEX IF NOT EXISTS idx_reports_created_at
ON reports(created_at DESC);
```

**Priorité**: ⭐⭐⭐ (moderation tools)

---

### 7. **favorites** (Favoris)

#### Indexes à créer

```sql
-- User favorites lookup
CREATE INDEX IF NOT EXISTS idx_favorites_user
ON favorites(user_id);

-- Establishment favorites count
CREATE INDEX IF NOT EXISTS idx_favorites_establishment
ON favorites(establishment_id);

-- Employee favorites count
CREATE INDEX IF NOT EXISTS idx_favorites_employee
ON favorites(employee_id);

-- Composite for checking if user favorited item
CREATE INDEX IF NOT EXISTS idx_favorites_user_establishment
ON favorites(user_id, establishment_id)
WHERE establishment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_favorites_user_employee
ON favorites(user_id, employee_id)
WHERE employee_id IS NOT NULL;
```

**Priorité**: ⭐⭐ (feature nice-to-have)

---

## 🚀 Script SQL complet

Créer un fichier `create_indexes.sql` pour exécution en batch:

```sql
-- ========================================
-- PATTAMAP - Performance Indexes
-- ========================================

-- 1. ESTABLISHMENTS
CREATE INDEX IF NOT EXISTS idx_establishments_status ON establishments(status);
CREATE INDEX IF NOT EXISTS idx_establishments_zone ON establishments(zone);
CREATE INDEX IF NOT EXISTS idx_establishments_category ON establishments(category_id);
CREATE INDEX IF NOT EXISTS idx_establishments_status_zone ON establishments(status, zone);
CREATE INDEX IF NOT EXISTS idx_establishments_grid ON establishments(zone, grid_row, grid_col);
CREATE INDEX IF NOT EXISTS idx_establishments_created_at ON establishments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_establishments_name_gin ON establishments USING gin(to_tsvector('english', name));

-- 2. EMPLOYEES
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_nationality ON employees(nationality);
CREATE INDEX IF NOT EXISTS idx_employees_age ON employees(age);
CREATE INDEX IF NOT EXISTS idx_employees_created_at ON employees(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_employees_name_gin ON employees USING gin(to_tsvector('english', name || ' ' || COALESCE(nickname, '')));
CREATE INDEX IF NOT EXISTS idx_employees_status_nationality ON employees(status, nationality);

-- 3. EMPLOYMENT_HISTORY
CREATE INDEX IF NOT EXISTS idx_employment_history_employee ON employment_history(employee_id);
CREATE INDEX IF NOT EXISTS idx_employment_history_establishment ON employment_history(establishment_id);
CREATE INDEX IF NOT EXISTS idx_employment_history_current ON employment_history(is_current) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_employment_history_est_current ON employment_history(establishment_id, is_current) WHERE is_current = true;

-- 4. COMMENTS
CREATE INDEX IF NOT EXISTS idx_comments_status ON comments(status);
CREATE INDEX IF NOT EXISTS idx_comments_employee ON comments(employee_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_employee_status ON comments(employee_id, status) WHERE status = 'approved';

-- 5. USERS
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- 6. REPORTS
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_comment ON reports(comment_id);
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reported_by);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);

-- 7. FAVORITES
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_establishment ON favorites(establishment_id);
CREATE INDEX IF NOT EXISTS idx_favorites_employee ON favorites(employee_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user_establishment ON favorites(user_id, establishment_id) WHERE establishment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_favorites_user_employee ON favorites(user_id, employee_id) WHERE employee_id IS NOT NULL;

-- Verify indexes created
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

---

## 📝 Comment appliquer les indexes

### Méthode 1: Supabase SQL Editor

1. Ouvrir Supabase Dashboard → SQL Editor
2. Créer nouvelle query
3. Copier-coller le script SQL complet
4. Exécuter
5. Vérifier la création avec la query de vérification

### Méthode 2: Migration Supabase

```bash
# Créer une migration
npx supabase migration new create_performance_indexes

# Éditer le fichier migration
# supabase/migrations/XXXXXX_create_performance_indexes.sql
# (coller le script SQL)

# Appliquer la migration
npx supabase db push
```

---

## 🔍 Analyser l'impact des indexes

### Avant/Après avec EXPLAIN ANALYZE

```sql
-- Sans index
EXPLAIN ANALYZE
SELECT * FROM establishments
WHERE status = 'approved' AND zone = 'walking_street'
ORDER BY created_at DESC
LIMIT 50;

-- Après avoir créé les indexes, relancer la même query
-- Comparer:
-- - Planning time
-- - Execution time
-- - Rows scanned vs rows returned
-- - Index Scan vs Seq Scan
```

### Exemple de résultat amélioré

```
AVANT (Sequential Scan):
Planning Time: 0.5ms
Execution Time: 45.2ms
→ Seq Scan on establishments (rows=10000, loops=1)

APRÈS (Index Scan):
Planning Time: 0.3ms
Execution Time: 2.1ms  ⭐ 20x plus rapide!
→ Index Scan using idx_establishments_status_zone (rows=50, loops=1)
```

---

## ⚠️ Considérations importantes

### Quand créer un index?
✅ **OUI** si:
- Query exécutée fréquemment (>100 fois/jour)
- Table contient >1000 rows
- Query scanne >10% de la table
- Filter sur colonne avec haute cardinalité

❌ **NON** si:
- Table très petite (<100 rows)
- Colonne peu sélective (ex: boolean with 50/50 split)
- Trop d'indexes = ralentit les INSERT/UPDATE

### Maintenance

```sql
-- Vérifier la taille des indexes
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexname::regclass)) AS index_size
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexname::regclass) DESC;

-- Reconstruire un index fragmenté
REINDEX INDEX idx_establishments_status;

-- Analyser la table après changements massifs
ANALYZE establishments;
```

---

## 📈 Gains de performance attendus

| Query | Avant | Après | Amélioration |
|-------|-------|-------|--------------|
| **Establishments list (approved)** | 45ms | 2ms | **22x** |
| **Zone filter (walking_street)** | 30ms | 3ms | **10x** |
| **Employee search by nationality** | 25ms | 4ms | **6x** |
| **Comment listing by establishment** | 20ms | 2ms | **10x** |
| **Current employment lookup** | 35ms | 3ms | **11x** |

**Moyenne**: 10-20x plus rapide pour queries indexées

---

## 🔗 Ressources

- [PostgreSQL Index Types](https://www.postgresql.org/docs/current/indexes-types.html)
- [Supabase Performance Tips](https://supabase.com/docs/guides/database/performance)
- [Using EXPLAIN](https://www.postgresql.org/docs/current/using-explain.html)

---

**Dernière mise à jour**: 2025-01-15
**Auteur**: PattaMap Performance Team
