# Database - PattaMap Backend

## Structure

```
database/
├── migrations/         # SQL migrations (schema changes)
├── seeds/              # SQL seeds (initial data)
└── scripts/
    └── archive/        # Temporary scripts (fixes, checks, migrations)
```

---

## Migrations (`migrations/`)

SQL files pour les changements de schéma database (contraintes, indexes, colonnes).

**Fichiers**:
- `add-unique-constraint.sql` - Contrainte unicité positions
- `create_indexes.sql` - Indexes performance
- `migrate_*.sql` - Migrations grilles (beachroad, soibuakhao)
- `update_*.sql` - Updates contraintes zones
- `redistribute_walking_street.sql` - Redistribution Walking Street

**Utilisation**:
1. Ouvrir Supabase SQL Editor
2. Copier/coller contenu du fichier .sql
3. Exécuter

---

## Seeds (`seeds/`)

SQL files pour données initiales (établissements, catégories).

**Fichiers**:
- `seed_beachroad_establishments.sql` - Établissements Beach Road
- `seed_lkmetro_establishments.sql` - Établissements LK Metro
- `seed_soibuakhao_establishments.sql` - Établissements Soi Buakhao
- `insert_treetown_bars.sql` - Bars Treetown

**Utilisation**:
1. Ouvrir Supabase SQL Editor
2. Copier/coller contenu du fichier .sql
3. Exécuter

---

## Scripts Archive (`scripts/archive/`)

Scripts temporaires utilisés pour fixes, checks, migrations one-time.

**Catégories**:
- `check_*.js` - Scripts vérification data
- `fix_*.js` - Scripts correction data
- `run_*.js` - Scripts exécution seeds/migrations
- `redistribute_*.js` - Scripts redistribution positions
- `apply_*.js` - Scripts application changements
- `debug_*.js` - Scripts debug
- `logo-*.js` - Scripts tests upload logo

**Note**: Ces scripts sont archivés et ne doivent **pas être exécutés en production**. Ils ont été utilisés pendant le développement pour des migrations/fixes ponctuels.

---

## Schema Principal

Le schéma database principal est dans:
- **Production**: Géré via Supabase Dashboard
- **Doc**: Voir `backend/docs/DATABASE_INDEXES.md` pour les indexes recommandés

### Tables Principales

```sql
-- Users & Auth
users (id, email, username, role, created_at)
refresh_tokens (id, user_id, token, expires_at)

-- Établissements
establishments (id, name, category_id, zone, grid_row, grid_col, status, ...)
establishment_categories (id, name, icon)
establishment_photos (id, establishment_id, photo_url, is_primary)

-- Employées
employees (id, name, age, nationality, gender, photo_url, status, ...)
employment_history (id, employee_id, establishment_id, is_current, start_date, end_date)

-- Reviews & Social
comments (id, user_id, establishment_id, employee_id, rating, text, status)
favorites (id, user_id, employee_id)
reports (id, user_id, content_type, content_id, reason)

-- Audit
audit_logs (id, user_id, action, entity_type, entity_id, changes, ip_address)
```

---

## Workflow Migrations

### 1. Créer Migration

```sql
-- Fichier: database/migrations/YYYY-MM-DD_description.sql

-- Add description
-- Migration: Description of changes

BEGIN;

-- Your changes here

COMMIT;
```

### 2. Exécuter Migration

1. Supabase Dashboard → SQL Editor
2. Copier contenu migration
3. Exécuter
4. Vérifier résultat

### 3. Documenter

Ajouter entrée dans ce README.md si nécessaire.

---

## Indexes Performance

Voir: `backend/docs/DATABASE_INDEXES.md`

**Indexes critiques**:
```sql
-- Establishments
CREATE INDEX idx_establishments_zone ON establishments(zone);
CREATE INDEX idx_establishments_status_zone ON establishments(status, zone);

-- Employees
CREATE INDEX idx_employees_status ON employees(status);

-- Employment History
CREATE INDEX idx_employment_history_current ON employment_history(is_current) WHERE is_current = true;

-- Comments
CREATE INDEX idx_comments_status ON comments(status);
```

---

## Backup

**Supabase Auto-Backup**: Configuré via Supabase Dashboard → Database → Backups

**Manuel**: Export SQL via Supabase Dashboard si nécessaire

---

**Dernière mise à jour**: Octobre 2025 (v9.3.0)
