# 🎯 VIP System Migration - Guide Simplifié

**Version**: SIMPLE (sans dépendances `establishment_owners`)
**Date**: 2025-01-18
**Statut**: Production-Ready ✅

---

## 📋 Vue d'ensemble

Cette migration crée le **VIP System** pour PattaMap avec des **RLS policies simplifiées** qui fonctionnent **IMMÉDIATEMENT** sans dépendances sur d'autres tables.

### Différences avec la version complète

| Aspect | Version SIMPLE (actuelle) | Version COMPLÈTE (future) |
|--------|---------------------------|---------------------------|
| **Dépendances** | ❌ Aucune | ✅ Nécessite `establishment_owners` |
| **RLS Policies** | 15 policies (admin + public read) | 17 policies (admin + owners) |
| **Ownership Access** | ❌ Pas implémenté | ✅ Owners peuvent gérer leurs VIP |
| **Prêt à utiliser** | ✅ Oui, immédiatement | ⏳ Après migration owners |

---

## 🚀 Migration en 4 Étapes

### Étape 0: Activer Extension btree_gist (PRÉREQUIS)

**Fichier**: `supabase_step0_enable_extensions.sql`

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;
```

**Pourquoi**: Nécessaire pour les contraintes `EXCLUDE USING gist` qui empêchent les overlapping VIP subscriptions.

**Exécution**:
1. Supabase Dashboard → SQL Editor
2. Copier/coller le contenu
3. Cliquer "Run" ▶️

---

### Étape 1: Créer Tables VIP

**Fichier**: `supabase_step1_vip_tables_SIMPLE.sql`

**Ce qui est créé**:
- ✅ 3 tables: `vip_payment_transactions`, `employee_vip_subscriptions`, `establishment_vip_subscriptions`
- ✅ 13 indexes de performance
- ✅ 15 RLS policies (admin full access + public read pour active subscriptions)
- ✅ 3 fonctions helper: `is_employee_vip()`, `is_establishment_vip()`, `expire_vip_subscriptions()`

**RLS Policies Incluses**:

| Policy | Table | Accès |
|--------|-------|-------|
| View active subscriptions | employee_vip_subscriptions | 👁️ Public (status='active') |
| Manage all | employee_vip_subscriptions | 🔑 Admin only |
| View active subscriptions | establishment_vip_subscriptions | 👁️ Public (status='active') |
| Manage all | establishment_vip_subscriptions | 🔑 Admin only |
| View own transactions | vip_payment_transactions | 👤 User (own) |
| Manage transactions | vip_payment_transactions | 🔑 Admin only |

**Exécution**:
1. Supabase Dashboard → SQL Editor → New Query
2. Copier/coller `supabase_step1_vip_tables_SIMPLE.sql`
3. Cliquer "Run" ▶️
4. ✅ Vérifier: "Success"

---

### Étape 2: Ajouter Colonnes VIP aux Entities

**Fichier**: `supabase_step2_vip_entity_columns.sql`

**Ce qui est créé**:
- ✅ Colonnes `is_vip`, `vip_expires_at` dans `establishments`
- ✅ Colonnes `is_vip`, `vip_expires_at` dans `employees`
- ✅ 6 partial indexes (performance)
- ✅ 2 triggers automatiques (sync VIP status quand subscription change)

**Triggers Automatiques**:

```sql
-- Trigger 1: Sync establishment VIP status
CREATE TRIGGER trigger_sync_establishment_vip
AFTER INSERT OR UPDATE ON establishment_vip_subscriptions
FOR EACH ROW EXECUTE FUNCTION sync_establishment_vip_status();

-- Trigger 2: Sync employee VIP status
CREATE TRIGGER trigger_sync_employee_vip
AFTER INSERT OR UPDATE ON employee_vip_subscriptions
FOR EACH ROW EXECUTE FUNCTION sync_employee_vip_status();
```

**Avantage**: Quand une subscription devient active, les colonnes `is_vip` et `vip_expires_at` sont mises à jour AUTOMATIQUEMENT.

**Exécution**:
1. Supabase Dashboard → SQL Editor → New Query
2. Copier/coller `supabase_step2_vip_entity_columns.sql`
3. Cliquer "Run" ▶️
4. ✅ Vérifier: "Success"

---

### Étape 3: Vérifier Migration

**Fichier**: `supabase_step3_verify.sql`

**Vérifications**:

```sql
-- Vérifier tables créées (devrait retourner 3 lignes)
SELECT tablename FROM pg_tables WHERE tablename LIKE '%vip%';

-- Vérifier colonnes establishments
SELECT is_vip, vip_expires_at FROM establishments LIMIT 1;

-- Vérifier colonnes employees
SELECT is_vip, vip_expires_at FROM employees LIMIT 1;

-- Vérifier indexes (devrait retourner 19 indexes)
SELECT indexname FROM pg_indexes WHERE indexname LIKE '%vip%';

-- Vérifier triggers (devrait retourner 2 triggers)
SELECT trigger_name FROM information_schema.triggers WHERE trigger_name LIKE '%vip%';

-- Vérifier fonctions (devrait retourner 5 fonctions)
SELECT proname FROM pg_proc WHERE proname LIKE '%vip%';
```

**Exécution**:
1. Supabase Dashboard → SQL Editor → New Query
2. Copier/coller **chaque section séparément** de `supabase_step3_verify.sql`
3. Vérifier résultats attendus (commentés dans le fichier)

---

## ✅ Checklist Post-Migration

### Tables
- [ ] `vip_payment_transactions` créée (✅ verified via `\dt`)
- [ ] `employee_vip_subscriptions` créée (✅ verified via `\dt`)
- [ ] `establishment_vip_subscriptions` créée (✅ verified via `\dt`)

### Colonnes Entity
- [ ] `establishments.is_vip` existe (✅ `SELECT is_vip FROM establishments LIMIT 1`)
- [ ] `establishments.vip_expires_at` existe (✅ `SELECT vip_expires_at FROM establishments LIMIT 1`)
- [ ] `employees.is_vip` existe (✅ `SELECT is_vip FROM employees LIMIT 1`)
- [ ] `employees.vip_expires_at` existe (✅ `SELECT vip_expires_at FROM employees LIMIT 1`)

### Indexes
- [ ] 13 indexes subscriptions créés (✅ `SELECT COUNT(*) FROM pg_indexes WHERE indexname LIKE 'idx_%vip_%'`)
- [ ] 6 indexes entity créés (✅ `SELECT COUNT(*) FROM pg_indexes WHERE indexname LIKE 'idx_%_vip_%'`)

### Triggers
- [ ] `trigger_sync_establishment_vip` créé (✅ `\dft`)
- [ ] `trigger_sync_employee_vip` créé (✅ `\dft`)

### Fonctions
- [ ] `is_employee_vip()` créée (✅ test: `SELECT is_employee_vip((SELECT id FROM employees LIMIT 1))`)
- [ ] `is_establishment_vip()` créée (✅ test: `SELECT is_establishment_vip((SELECT id FROM establishments LIMIT 1))`)
- [ ] `expire_vip_subscriptions()` créée (✅ `\df`)
- [ ] `sync_establishment_vip_status()` créée (✅ `\df`)
- [ ] `sync_employee_vip_status()` créée (✅ `\df`)

### RLS Policies
- [ ] 15 policies créées (✅ `SELECT COUNT(*) FROM pg_policies WHERE tablename LIKE '%vip%'`)

---

## 🔒 RLS Policies Détaillées

### Employee VIP Subscriptions (5 policies)

1. **`Anyone can view active employee VIP subscriptions`**
   - Type: SELECT
   - Condition: `status = 'active'`
   - Permet: Tous les utilisateurs voient les subscriptions actives

2. **`Admins can view all employee VIP subscriptions`**
   - Type: SELECT
   - Condition: `role = 'admin'`
   - Permet: Admins voient TOUTES les subscriptions (active/expired/cancelled/pending)

3. **`Admins can insert employee VIP subscriptions`**
   - Type: INSERT
   - Condition: `role = 'admin'`
   - Permet: Seuls les admins peuvent créer des subscriptions

4. **`Admins can update employee VIP subscriptions`**
   - Type: UPDATE
   - Condition: `role = 'admin'`
   - Permet: Seuls les admins peuvent modifier (ex: approve payment)

5. **`Admins can delete employee VIP subscriptions`**
   - Type: DELETE
   - Condition: `role = 'admin'`
   - Permet: Seuls les admins peuvent supprimer

### Establishment VIP Subscriptions (5 policies)

Identiques aux employee policies, mais pour `establishment_vip_subscriptions`.

### VIP Payment Transactions (5 policies)

1. **`Users can view their own payment transactions`**
   - Type: SELECT
   - Condition: `user_id = auth.uid()`
   - Permet: Chaque user voit ses propres transactions

2. **`Admins can view all payment transactions`**
   - Type: SELECT
   - Condition: `role = 'admin'`
   - Permet: Admins voient toutes les transactions

3. **`Users can insert their own payment transactions`**
   - Type: INSERT
   - Condition: `user_id = auth.uid()`
   - Permet: Users peuvent créer leurs propres transactions (achat VIP)

4. **`Admins can update payment transactions`**
   - Type: UPDATE
   - Condition: `role = 'admin'`
   - Permet: Admins peuvent modifier status (verify cash payment)

5. **`Admins can delete payment transactions`**
   - Type: DELETE
   - Condition: `role = 'admin'`
   - Permet: Admins peuvent supprimer transactions

---

## 🔄 Workflow VIP (avec policies simplifiées)

### 1. Achat VIP (User)

```
User (logged in) → VIPPurchaseModal → Select tier/duration
                 → Frontend calls POST /api/vip/purchase
                 → Backend creates:
                    - vip_payment_transactions (status='pending')
                    - employee_vip_subscriptions (status='pending_payment')
                 → ✅ RLS Policy: "Users can insert their own payment transactions"
```

### 2. Vérification Admin

```
Admin → VIPVerificationAdmin → View pending payments
      → ✅ RLS Policy: "Admins can view all payment transactions"
      → Click "Verify" → Backend calls PUT /api/vip/verify
      → Updates:
         - vip_payment_transactions (status='completed')
         - employee_vip_subscriptions (status='active', starts_at, expires_at)
      → ✅ RLS Policy: "Admins can update payment transactions"
      → ✅ RLS Policy: "Admins can update employee VIP subscriptions"
```

### 3. Trigger Automatique

```
UPDATE employee_vip_subscriptions SET status='active'
→ TRIGGER: trigger_sync_employee_vip
→ FUNCTION: sync_employee_vip_status()
→ UPDATE employees SET is_vip=TRUE, vip_expires_at='2025-02-18'
```

### 4. Affichage Frontend

```
CustomMapSoi6.tsx → fetchEstablishments()
                  → Supabase query: SELECT * FROM establishments WHERE zone='soi6'
                  → Returns: { id, name, is_vip: true, vip_expires_at: '2025-02-18' }
                  → Frontend checks: NOW() < vip_expires_at ? showVIPEffects() : null
                  → Renders: Gold border + Crown icon ✅
```

---

## 🔮 Future: Ajouter Ownership Policies

Si vous migrez `establishment_owners` plus tard, vous pouvez ajouter ces policies:

```sql
-- Policy avancée: Establishment owners peuvent voir leurs employees VIP
CREATE POLICY "Establishment owners can view their employees VIP subscriptions"
  ON employee_vip_subscriptions FOR SELECT
  USING (
    employee_id IN (
      SELECT e.id
      FROM employees e
      JOIN employment_history eh ON e.id = eh.employee_id
      JOIN establishment_owners eo ON eh.establishment_id = eo.establishment_id
      WHERE eo.user_id = auth.uid()
        AND eh.is_current = TRUE
    )
  );

-- Policy avancée: Establishment owners peuvent voir leurs establishments VIP
CREATE POLICY "Establishment owners can view their establishments VIP subscriptions"
  ON establishment_vip_subscriptions FOR SELECT
  USING (
    establishment_id IN (
      SELECT establishment_id
      FROM establishment_owners
      WHERE user_id = auth.uid()
    )
  );
```

**Ajout**: Après avoir créé `establishment_owners`, exécutez ces 2 policies dans Supabase SQL Editor.

---

## 📊 Tables Créées

### vip_payment_transactions

```sql
id UUID PRIMARY KEY
subscription_type TEXT ('employee' | 'establishment')
subscription_id UUID
user_id UUID REFERENCES users(id)
amount DECIMAL(10, 2)
currency TEXT (default 'THB')
payment_method TEXT ('promptpay' | 'cash' | 'admin_grant')
payment_status TEXT ('pending' | 'completed' | 'failed' | 'refunded')
promptpay_qr_code TEXT
promptpay_reference TEXT
admin_verified_by UUID
admin_verified_at TIMESTAMP
admin_notes TEXT
metadata JSONB
created_at TIMESTAMP
updated_at TIMESTAMP
```

### employee_vip_subscriptions

```sql
id UUID PRIMARY KEY
employee_id UUID REFERENCES employees(id)
status TEXT ('active' | 'expired' | 'cancelled' | 'pending_payment')
tier TEXT ('basic' | 'premium')
duration INTEGER (7 | 30 | 90 | 365)
starts_at TIMESTAMP
expires_at TIMESTAMP
cancelled_at TIMESTAMP
payment_method TEXT
payment_status TEXT
price_paid DECIMAL(10, 2)
transaction_id UUID REFERENCES vip_payment_transactions(id)
admin_verified_by UUID
admin_verified_at TIMESTAMP
admin_notes TEXT
created_at TIMESTAMP
updated_at TIMESTAMP
```

### establishment_vip_subscriptions

Identique à `employee_vip_subscriptions` mais avec `establishment_id` au lieu de `employee_id`.

---

## 🎯 Prochaines Étapes

1. ✅ **Migration complète** - Exécuter Steps 0, 1, 2
2. ✅ **Vérification** - Exécuter Step 3
3. ⏳ **Test Backend** - Tester endpoints API VIP
4. ⏳ **Test Frontend** - Tester VIPPurchaseModal + VIPVerificationAdmin
5. ⏳ **Test Complet** - Workflow achat → verify → visual effects
6. 🔮 **Future** - Migrer `establishment_owners` + ajouter ownership policies

---

## 🆘 Troubleshooting

### Erreur: "relation already exists"

**Solution**: Normal si vous réexécutez. Les scripts utilisent `IF NOT EXISTS`.

### Erreur: "permission denied"

**Solution**: Vérifiez que vous êtes admin dans Supabase (Settings → Database → Roles).

### Erreur: "extension btree_gist does not exist"

**Solution**: Exécutez d'abord `supabase_step0_enable_extensions.sql`.

### Triggers ne se déclenchent pas

**Vérification**:
```sql
-- Vérifier triggers existent
SELECT trigger_name FROM information_schema.triggers WHERE trigger_name LIKE '%vip%';

-- Vérifier fonctions existent
SELECT proname FROM pg_proc WHERE proname LIKE '%sync%vip%';
```

**Solution**: Réexécutez Step 2 si triggers manquants.

---

## 📚 Ressources

- **Documentation VIP complète**: `docs/features/VIP_AUDIT_FIXES.md`
- **Backend API**: `backend/src/controllers/vipController.ts`
- **Frontend Components**: `src/components/Owner/VIPPurchaseModal.tsx`
- **Pricing Config**: `backend/src/config/vipPricing.ts`

---

**Migration créée**: 2025-01-18
**Version**: SIMPLE (sans dépendances)
**Statut**: ✅ Production-Ready
