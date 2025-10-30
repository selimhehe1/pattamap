# 🔧 Troubleshooting: "No Profile Linked" Error

## Symptômes

Lorsqu'un utilisateur avec un compte employee (`account_type='employee'`) se connecte et accède à son dashboard (`/employee-dashboard`), il voit ce message d'erreur:

```
⚠️
No Profile Linked
There seems to be a technical issue with your profile setup.
Please contact an administrator for assistance.

Need help? Contact an administrator.
```

## Cause Racine

Le problème se produit lorsque la **liaison bidirectionnelle** entre le compte user et le profil employee est **incomplète ou manquante**.

### Architecture de la Liaison Bidirectionnelle

```
users table                    employees table
┌────────────────────┐        ┌────────────────────┐
│ id (UUID)          │◄───────│ user_id (FK)       │
│ account_type       │        │ id (UUID)          │
│ linked_employee_id │───────►│ name, nickname     │
└────────────────────┘        │ status, photos     │
                               └────────────────────┘

✅ Liaison correcte:
   users.linked_employee_id = employees.id
   employees.user_id = users.id

❌ Liaison incorrecte:
   users.linked_employee_id IS NULL (← PROBLÈME)
   employees.user_id = users.id
```

### Flux de Vérification (AuthContext)

```typescript
// src/contexts/AuthContext.tsx (ligne 51-53)
if (data.user.account_type === 'employee' && data.user.linked_employee_id) {
  setTimeout(() => getMyLinkedProfile(), 100);
}
```

Si `linked_employee_id` est NULL, le profil n'est **jamais récupéré** → Dashboard affiche l'erreur.

## Scénarios Problématiques

### Scénario A: Profil Créé AVANT la Migration v10.0

**Contexte**: Employee créé avant la migration `add_user_employee_link.sql` (2025-01-11)

**Problème**:
- Les colonnes `user_id` et `linked_employee_id` n'existaient pas
- La migration a ajouté les colonnes mais n'a PAS créé les liens rétroactivement
- Résultat: `employees.user_id = NULL` ET `users.linked_employee_id = NULL`

**Comment détecter**:
```sql
-- Employees créés avant migration sans liaison
SELECT e.id, e.name, e.created_at, e.user_id
FROM employees e
WHERE e.created_at < '2025-01-11'
  AND e.user_id IS NULL;
```

### Scénario B: Profil Créé par un Admin/User (Pas Self-Managed)

**Contexte**: Admin utilise `createEmployee()` pour créer un profil pour quelqu'un d'autre

**Problème**:
- Profil créé avec `employees.user_id = NULL` (pas lié)
- Profil approuvé par admin (`status='approved'`)
- L'employé crée son compte user → `users.linked_employee_id` reste NULL
- Résultat: Compte employee existe, profil employee existe, mais **aucune liaison**

**Comment détecter**:
```sql
-- Users employee sans liaison, mais un employee existe avec même email
SELECT u.id, u.email, u.linked_employee_id, e.id AS employee_id, e.name
FROM users u
LEFT JOIN employees e ON e.user_id = u.id
WHERE u.account_type = 'employee'
  AND u.linked_employee_id IS NULL
  AND e.id IS NOT NULL;
```

### Scénario C: Transaction Partielle Échouée

**Contexte**: `createOwnEmployeeProfile()` échoue partiellement

**Problème**:
- Employee créé (ligne 1116-1132 dans `employeeController.ts`)
- Update user échoue (ligne 1140-1153)
- Rollback employee échoue également
- Résultat: Employee orphelin, user sans liaison

**Comment détecter**:
```sql
-- Employees avec user_id mais user ne link pas en retour
SELECT e.id, e.name, e.user_id, u.email, u.linked_employee_id
FROM employees e
LEFT JOIN users u ON u.id = e.user_id
WHERE e.user_id IS NOT NULL
  AND (u.linked_employee_id IS NULL OR u.linked_employee_id != e.id);
```

### Scénario D: Approbation Manuelle Sans Liaison

**Contexte**: Admin approuve manuellement le status d'un employee (`'pending' → 'approved'`)

**Problème**:
- Admin change `employees.status` directement en SQL ou via UI
- Ne crée jamais la liaison `user_id ↔ linked_employee_id`
- Résultat: Profil approuvé mais non lié

## Solutions

### Solution 1: Script de Réparation TypeScript (Recommandé)

**Usage**:
```bash
# Diagnostic (dry-run - ne modifie rien)
cd backend
npx ts-node repair-employee-link.ts --dry-run

# Réparation effective
npx ts-node repair-employee-link.ts
```

**Fonctionnement**:
1. Trouve tous les users avec `account_type='employee'` et `linked_employee_id IS NULL`
2. Pour chaque user, cherche si un employee existe avec `user_id = user.id`
3. Si trouvé, crée la liaison: `users.linked_employee_id = employees.id`
4. Log toutes les réparations effectuées

**Avantages**:
- ✅ Mode dry-run pour prévisualiser les changements
- ✅ Détection automatique des orphelins (users sans employee)
- ✅ Logs détaillés de toutes les opérations
- ✅ Gestion d'erreurs robuste

### Solution 2: Migration SQL (Alternative)

**Fichier**: `backend/database/migrations/repair_existing_employee_links.sql`

**Usage**:
1. Ouvrir Supabase SQL Editor
2. Copier le contenu de la migration
3. Exécuter STEP 1 (Diagnostic Query) pour voir l'impact
4. Décommenter STEP 2 (Repair Query) et exécuter
5. Exécuter STEP 3 (Verification Query) pour vérifier

**Requête de réparation**:
```sql
UPDATE users
SET
  linked_employee_id = employees.id,
  updated_at = NOW()
FROM employees
WHERE employees.user_id = users.id
  AND users.account_type = 'employee'
  AND users.linked_employee_id IS NULL;
```

**Avantages**:
- ✅ Idempotente (peut être exécutée plusieurs fois sans danger)
- ✅ Requêtes de diagnostic et vérification incluses
- ✅ Détecte aussi les employees orphelins
- ✅ Documentation complète dans le fichier SQL

### Solution 3: Script de Diagnostic Individuel

**Usage**:
```bash
# Diagnostiquer un employé spécifique par email
cd backend
npx ts-node diagnose-employee.ts employee@email.com
```

**Fonctionnement**:
1. Vérifie le user par email
2. Vérifie si `linked_employee_id` est NULL
3. Cherche un employee avec `user_id = user.id`
4. Détecte l'incohérence de la liaison
5. Propose la requête SQL pour fixer manuellement

**Avantages**:
- ✅ Diagnostic détaillé pour un cas spécifique
- ✅ Affiche les informations complètes (user + employee)
- ✅ Génère la requête SQL de réparation

## Prévention Future

### Amélioration du Flux d'Approbation Admin

**Modification de `EmployeesAdmin.tsx`**:
- Détecter les employees approuvés sans liaison (`user_id IS NULL`)
- Afficher un warning: "⚠️ No linked user account"
- Ajouter un bouton "Link User" pour créer la liaison manuellement

**Exemple d'UI**:
```tsx
{employee.status === 'approved' && !employee.user_id && (
  <div className="warning-badge">
    <span>⚠️ No linked user account</span>
    <button onClick={() => linkUserToEmployee(employee.id)}>
      Link User
    </button>
  </div>
)}
```

### Validation Renforcée dans le Backend

**Ajout de vérifications**:
1. Dans `approveClaimRequest()`: Vérifier que la liaison est bien créée
2. Dans `createOwnEmployeeProfile()`: Rollback complet si update user échoue
3. Dans `createEmployee()`: Avertir l'admin qu'une liaison manuelle sera nécessaire

## Tests

### Test Unitaire: Scénario de Réparation

```typescript
describe('Employee Link Repair', () => {
  it('should repair user with missing linked_employee_id', async () => {
    // 1. Create user with account_type='employee' but linked_employee_id=NULL
    const { data: user } = await supabase
      .from('users')
      .insert({ account_type: 'employee', linked_employee_id: null })
      .select()
      .single();

    // 2. Create employee with user_id = user.id
    const { data: employee } = await supabase
      .from('employees')
      .insert({ user_id: user.id, name: 'Test' })
      .select()
      .single();

    // 3. Run repair script
    await repairEmployeeLinks();

    // 4. Verify link was created
    const { data: repairedUser } = await supabase
      .from('users')
      .select('linked_employee_id')
      .eq('id', user.id)
      .single();

    expect(repairedUser.linked_employee_id).toBe(employee.id);
  });
});
```

### Test E2E: Dashboard Access

```typescript
describe('Employee Dashboard - Link Repair', () => {
  it('should display dashboard after link repair', async () => {
    // 1. Login as employee@test.com
    await page.goto('http://localhost:3000/login');
    await page.fill('input[name="email"]', 'employee@test.com');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');

    // 2. Before repair: should see error
    await page.goto('http://localhost:3000/employee-dashboard');
    await expect(page.locator('text=No Profile Linked')).toBeVisible();

    // 3. Run repair script
    execSync('cd backend && npx ts-node repair-employee-link.ts');

    // 4. After repair: should see dashboard
    await page.reload();
    await expect(page.locator('text=My Dashboard')).toBeVisible();
    await expect(page.locator('text=No Profile Linked')).not.toBeVisible();
  });
});
```

## Références

- **Migration originale**: `backend/database/migrations/add_user_employee_link.sql`
- **Script de diagnostic**: `backend/diagnose-employee.ts`
- **Script de réparation**: `backend/repair-employee-link.ts`
- **Migration de réparation**: `backend/database/migrations/repair_existing_employee_links.sql`
- **AuthContext**: `src/contexts/AuthContext.tsx` (lignes 50-70)
- **Dashboard**: `src/components/Employee/EmployeeDashboard.tsx` (lignes 243-268)
- **API endpoint**: `backend/src/controllers/employeeController.ts` (`getMyLinkedProfile`, lignes 1333-1425)

## FAQ

### Q: Pourquoi ce problème existe-t-il?

**R**: Le système de liaison bidirectionnelle a été ajouté en v10.0 (2025-01-11). Les profils créés avant cette date n'ont pas de liaison automatique. De plus, certains workflows (profil créé par admin) ne créent pas automatiquement la liaison.

### Q: Est-ce que la réparation est sécuritaire?

**R**: Oui, le script de réparation et la migration SQL sont **idempotents** (peuvent être exécutés plusieurs fois sans danger) et ne modifient que les liaisons manquantes. Aucune suppression n'est effectuée.

### Q: Que faire si un user n'a pas de profil employee?

**R**: Ces users sont appelés "orphelins". Ils ont `account_type='employee'` mais aucun employee avec `user_id = user.id`. Solution:
1. L'user doit créer son profil via `/employee-claim`
2. Ou l'admin doit créer manuellement la liaison en SQL

### Q: Peut-on rollback la réparation?

**R**: Techniquement oui (voir la section ROLLBACK dans la migration SQL), mais **ce n'est PAS recommandé**. La réparation corrige une erreur de données, la rollback recréerait le problème.

### Q: Comment éviter ce problème à l'avenir?

**R**:
1. Toujours utiliser `createOwnEmployeeProfile()` pour les profils self-managed
2. Utiliser `claimEmployeeProfile()` + approbation admin pour les claims
3. NE JAMAIS modifier `employees.status` directement sans vérifier la liaison
4. Améliorer `EmployeesAdmin.tsx` pour détecter les liaisons manquantes

---

**Version**: v10.0.2
**Dernière mise à jour**: 2025-01-11
**Auteur**: PattaMap Development Team
