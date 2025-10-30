# 🧪 Test du Fix: Employee Link Issue

**Objectif**: Réparer la liaison user ↔ employee manquante pour résoudre l'erreur "No Profile Linked"

**Temps estimé**: 5-10 minutes

---

## Prérequis

- Backend dev server arrêté (pour éviter conflits de connexion DB)
- Terminal dans le dossier `backend/`
- Email de l'employé affecté connu (ex: `employee@test.com`)

```bash
cd C:\Users\Selim\Documents\Projet\pattaya-directory\backend
```

---

## Étape 1: Diagnostic Individuel 🔍

**Objectif**: Vérifier l'état actuel de la liaison

```bash
npx ts-node diagnose-employee.ts employee@test.com
```

**Résultat attendu** (si problème):
```
❌ user.linked_employee_id est NULL
   → AuthContext ne fetchera pas le profil
   → Dashboard affichera "No Profile Linked"
✅ Employee existe avec user_id = user-123
```

---

## Étape 2: Dry-Run Réparation (Sans Modification) ⚠️

**Objectif**: Prévisualiser les changements qui seront effectués

```bash
npx ts-node repair-employee-link.ts --dry-run
```

**Résultat attendu**:
```
⚠️  MODE DRY-RUN: Aucune modification ne sera effectuée

📊 Étape 1: Recherche des users employee sans liaison...

⚠️  N user(s) employee trouvé(s) sans liaison

📝 Réparations qui seraient effectuées (DRY-RUN):

1. employee@test.com → Test Employee
   UPDATE users
   SET linked_employee_id = 'abc-123'
   WHERE id = 'user-456';

💡 Pour effectuer les réparations, exécutez: npx ts-node repair-employee-link.ts
```

**⚠️ Important**: Vérifier que les informations affichées sont correctes avant de continuer.

---

## Étape 3: Réparation Effective ✅

**Objectif**: Créer les liaisons manquantes

```bash
npx ts-node repair-employee-link.ts
```

**Résultat attendu**:
```
⚡ MODE RÉPARATION: Les liaisons manquantes seront créées

📊 Étape 1: Recherche des users employee sans liaison...

⚠️  N user(s) employee trouvé(s) sans liaison

🔧 Exécution des réparations...

🔗 Réparation: employee@test.com → Test Employee
   ✅ Liaison créée: user.linked_employee_id → abc-123

======================================================================

🎉 RÉPARATION TERMINÉE!

   ✅ Réussies: N
   ❌ Échouées: 0
```

**Si erreur**:
- Vérifier les variables d'environnement (`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`)
- Vérifier les permissions Supabase
- Consulter les logs pour plus de détails

---

## Étape 4: Vérification Post-Réparation 🔍

**Objectif**: Confirmer que la liaison est correcte

```bash
npx ts-node diagnose-employee.ts employee@test.com
```

**Résultat attendu** (après fix):
```
✅ Account type = "employee"
✅ user.linked_employee_id = abc-123
✅ Employee existe avec user_id = user-456
✅ Employee status = "approved"
✅ Liaison bidirectionnelle COHÉRENTE
   user.linked_employee_id → employee.id: abc-123
   employee.user_id → user.id: user-456

✅ Tout est correct ! Le dashboard devrait fonctionner.
```

---

## Étape 5: Test Dashboard Frontend 🌐

**Objectif**: Vérifier que l'erreur est résolue

1. **Démarrer le backend** (nouveau terminal):
```bash
cd C:\Users\Selim\Documents\Projet\pattaya-directory\backend
npm run dev
```

2. **Démarrer le frontend** (nouveau terminal):
```bash
cd C:\Users\Selim\Documents\Projet\pattaya-directory
npm start
```

3. **Se connecter**:
   - Naviguer vers http://localhost:3000/login
   - Email: `employee@test.com`
   - Password: `[mot de passe de l'employé]`

4. **Accéder au dashboard**:
   - Naviguer vers http://localhost:3000/employee-dashboard
   - OU cliquer sur le bouton "🏆 My Dashboard" dans le menu (☰)

5. **Vérifications**:
   - ✅ La page se charge sans erreur "No Profile Linked"
   - ✅ Le nom de l'employé s'affiche correctement
   - ✅ Les statistiques (views, reviews, rating) sont visibles
   - ✅ Les reviews récentes s'affichent
   - ✅ Le bouton "Edit My Profile" est fonctionnel

---

## Étape 6: Vérification en Base de Données (Optionnel) 📊

**Objectif**: Confirmer manuellement la liaison en SQL

1. Ouvrir Supabase SQL Editor
2. Exécuter la requête de vérification:

```sql
-- Vérifier la liaison pour un employé spécifique
SELECT
  u.id AS user_id,
  u.email,
  u.pseudonym,
  u.account_type,
  u.linked_employee_id,
  e.id AS employee_id,
  e.name AS employee_name,
  e.user_id AS employee_user_link,
  CASE
    WHEN u.linked_employee_id = e.id AND e.user_id = u.id THEN '✅ Bidirectional link OK'
    ELSE '❌ Link issue'
  END AS link_status
FROM users u
LEFT JOIN employees e ON e.id = u.linked_employee_id
WHERE u.email = 'employee@test.com';
```

**Résultat attendu**:
```
user_id | email              | linked_employee_id | employee_id | employee_user_link | link_status
--------|--------------------|--------------------|-------------|--------------------|-----------------------
abc-123 | employee@test.com  | def-456            | def-456     | abc-123            | ✅ Bidirectional link OK
```

---

## Troubleshooting 🔧

### Problème: "Error fetching employees"

**Cause**: Variables d'environnement manquantes

**Solution**:
```bash
# Vérifier .env existe
ls backend/.env

# Vérifier contenu
cat backend/.env | grep SUPABASE

# Devrait afficher:
# SUPABASE_URL=https://...
# SUPABASE_KEY=...
# SUPABASE_SERVICE_KEY=...
```

### Problème: "No employee found with user_id = user.id"

**Cause**: L'employee n'a jamais été lié au user (Scénario B)

**Solution manuelle**:
1. Trouver l'ID de l'employee en base de données
2. Exécuter dans Supabase SQL Editor:
```sql
-- Trouver l'employee par nom
SELECT id, name, nickname, user_id
FROM employees
WHERE name ILIKE '%[nom de l'employé]%';

-- Si employee trouvé mais user_id IS NULL:
-- 1. Mettre à jour employee.user_id
UPDATE employees
SET user_id = '[ID du user]'
WHERE id = '[ID de l'employee]';

-- 2. Mettre à jour users.linked_employee_id
UPDATE users
SET linked_employee_id = '[ID de l'employee]',
    account_type = 'employee'
WHERE id = '[ID du user]';
```

### Problème: Script bloque sur "Loading..."

**Cause**: Backend dev server utilise la même connexion DB

**Solution**: Arrêter le backend dev server avant d'exécuter les scripts de réparation

```bash
# Trouver le process Node.js
# Windows:
netstat -ano | findstr :8080
taskkill /PID [PID] /F

# Linux/Mac:
lsof -ti:8080 | xargs kill -9
```

---

## Commandes Rapides (Copier-Coller) 📋

```bash
# Diagnostic
cd C:\Users\Selim\Documents\Projet\pattaya-directory\backend
npx ts-node diagnose-employee.ts employee@test.com

# Dry-run
npx ts-node repair-employee-link.ts --dry-run

# Réparation
npx ts-node repair-employee-link.ts

# Vérification
npx ts-node diagnose-employee.ts employee@test.com
```

---

## Résultats Attendus ✅

| Étape | Avant Fix | Après Fix |
|-------|-----------|-----------|
| **user.linked_employee_id** | NULL ❌ | employee-456 ✅ |
| **employee.user_id** | user-123 ✅ | user-123 ✅ |
| **Dashboard** | "No Profile Linked" ❌ | Dashboard complet ✅ |
| **AuthContext.linkedEmployeeProfile** | null ❌ | Employee object ✅ |

---

## Prochaines Étapes 🚀

1. ✅ Tester le fix avec le compte affecté
2. ✅ Documenter les résultats
3. ⏳ Implémenter le badge warning dans EmployeesAdmin (UI improvement)
4. ⏳ Créer un script de vérification périodique pour détecter les liaisons manquantes

---

**Version**: v10.0.2
**Date**: 2025-01-11
**Auteur**: PattaMap Development Team
