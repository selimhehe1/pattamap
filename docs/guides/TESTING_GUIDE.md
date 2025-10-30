# 🧪 Employee Claim System - Guide de Testing

**Version**: v10.0.0-alpha
**Date**: 2025-10-11
**Status**: Ready for Testing

---

## 📋 Vue d'ensemble

Ce guide fournit des instructions détaillées pour tester complètement le système Employee Claim System de PattaMap.

**Fonctionnalités à tester:**
- ✅ User registration avec account_type selection
- ✅ Self-managed employee profile creation
- ✅ Claim existing employee profile
- ✅ Admin moderation panel pour claims
- ✅ Bidirectional user ↔ employee linking
- ✅ SQL helper functions (create/approve/reject)

---

## 🔧 Prérequis

1. ✅ Backend running sur http://localhost:8080
2. ✅ Frontend running sur http://localhost:3000
3. ✅ Compte admin actif pour tests modération
4. ✅ Accès Supabase SQL Editor
5. ✅ Token JWT valide (récupéré après login)

---

## Phase 1: SQL Migrations (15-20 min)

### Étape 1.1: Connexion Supabase

1. Ouvrir https://supabase.com/dashboard
2. Sélectionner le projet PattaMap
3. Aller dans **SQL Editor** (menu gauche, icône ⚡)

### Étape 1.2: Migration #1 - User Employee Link

**Fichier**: `backend/database/migrations/add_user_employee_link.sql`

1. Copier **TOUT** le contenu du fichier
2. Coller dans SQL Editor
3. Cliquer "Run" (ou Ctrl+Enter)
4. ✅ **Vérifier**: Aucune erreur rouge, toutes commandes vertes

**Ce que ça crée:**
- Colonne `users.account_type` (VARCHAR(20))
- Colonne `users.linked_employee_id` (UUID)
- Colonne `employees.user_id` (UUID)
- Colonne `employees.is_self_profile` (BOOLEAN)
- 7 indexes de performance
- Contraintes one-to-one bidirectionnelles

### Étape 1.3: Vérification Migration #1

Exécuter cette requête de vérification:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name IN ('users', 'employees')
AND column_name IN ('account_type', 'linked_employee_id', 'user_id', 'is_self_profile')
ORDER BY table_name, column_name;
```

**Résultat attendu:** 4 lignes

| column_name | table_name | data_type | is_nullable |
|-------------|------------|-----------|-------------|
| account_type | users | character varying | YES |
| linked_employee_id | users | uuid | YES |
| is_self_profile | employees | boolean | YES |
| user_id | employees | uuid | YES |

### Étape 1.4: Migration #2 - Moderation Queue Extension

**Fichier**: `backend/database/migrations/extend_moderation_queue.sql`

1. Copier **TOUT** le contenu du fichier
2. Coller dans SQL Editor
3. Cliquer "Run"
4. ✅ **Vérifier**: Aucune erreur, messages "CREATE FUNCTION" ×3

**Ce que ça crée:**
- Extension du type `item_type` avec 'employee_claim'
- Colonne `request_metadata` (JSONB)
- Colonne `verification_proof` (TEXT[])
- 3 indexes GIN/B-tree
- 3 SQL functions helper:
  - `create_employee_claim_request()`
  - `approve_employee_claim_request()`
  - `reject_employee_claim_request()`

### Étape 1.5: Vérification Migration #2

Exécuter:

```sql
SELECT proname, prosrc
FROM pg_proc
WHERE proname LIKE '%claim_request%'
ORDER BY proname;
```

**Résultat attendu:** 3 functions

| proname |
|---------|
| approve_employee_claim_request |
| create_employee_claim_request |
| reject_employee_claim_request |

✅ **Migrations complètes!**

---

## Phase 2: Backend API Testing (30 min)

### Setup: Récupérer Token JWT

1. Login via frontend ou API:
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login": "your_email", "password": "your_password"}'
```

2. Copier le `token` de la réponse
3. Remplacer `YOUR_TOKEN` dans les commandes ci-dessous

### Test 2.1: POST /api/employees/my-profile

**Objectif**: Créer un profil self-managed

```bash
curl -X POST http://localhost:8080/api/employees/my-profile \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Employee Self",
    "nickname": "Testy",
    "age": 25,
    "nationality": "Thai",
    "photos": ["https://via.placeholder.com/300"],
    "description": "This is my self-managed employee profile for testing"
  }'
```

**✅ Résultat attendu:**
```json
{
  "message": "Your employee profile has been created and is pending approval",
  "employee": {
    "id": "uuid...",
    "name": "Test Employee Self",
    "user_id": "your-user-id",
    "is_self_profile": true,
    "status": "pending"
  },
  "linked": true
}
```

**❌ Erreurs possibles:**
- 401: Token manquant/invalide
- 409: "You already have a linked employee profile"
- 400: "Name and at least one photo are required"

### Test 2.2: GET /api/employees/my-linked-profile

**Objectif**: Récupérer son profil lié

```bash
curl http://localhost:8080/api/employees/my-linked-profile \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**✅ Résultat attendu:**
```json
{
  "employee": {
    "id": "uuid...",
    "name": "Test Employee Self",
    "user_id": "your-user-id",
    "is_self_profile": true,
    "current_employment": [...],
    "comments": [...]
  }
}
```

**❌ Erreurs possibles:**
- 404: "No linked employee profile found" (si pas encore lié)
- 401: Token manquant

### Test 2.3: POST /api/employees/claim/:employeeId

**Objectif**: Claim un profil existant

**Prérequis**: Avoir un employee ID valide (récupérer via GET /api/employees)

```bash
# D'abord, récupérer un employee_id existant
curl http://localhost:8080/api/employees?limit=1

# Puis claim avec l'ID récupéré
curl -X POST http://localhost:8080/api/employees/claim/EMPLOYEE_ID_HERE \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "This is my profile. I work at this establishment and can prove my identity with my social media accounts and work ID.",
    "verification_proof": [
      "https://instagram.com/my_profile",
      "https://facebook.com/my_profile"
    ]
  }'
```

**✅ Résultat attendu:**
```json
{
  "message": "Claim request submitted successfully. An administrator will review your request.",
  "claim_id": "uuid..."
}
```

**❌ Erreurs possibles:**
- 400: "Please provide a detailed message (min 10 characters)"
- 404: "Employee profile not found"
- 409: "You already have a linked employee profile"
- 409: "This employee profile is already linked"
- 409: "Claim request already pending for this profile"

### Test 2.4: GET /api/employees/claims (Admin Only)

**Objectif**: Lister les claims (admin/moderator)

```bash
curl "http://localhost:8080/api/employees/claims?status=pending" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**✅ Résultat attendu:**
```json
{
  "claims": [
    {
      "id": "uuid...",
      "item_type": "employee_claim",
      "status": "pending",
      "submitted_by_user": {
        "pseudonym": "user123",
        "email": "user@example.com"
      },
      "employee": {
        "name": "Employee Name",
        "nickname": "Nick",
        "photos": [...]
      },
      "request_metadata": {
        "message": "This is my profile...",
        "employee_id": "uuid...",
        "user_id": "uuid...",
        "claimed_at": "2025-10-11T..."
      },
      "verification_proof": ["url1", "url2"],
      "created_at": "2025-10-11T..."
    }
  ],
  "total": 1
}
```

**❌ Erreurs possibles:**
- 403: "Admin/moderator access required"
- 401: Token manquant

### Test 2.5: POST /api/employees/claims/:claimId/approve (Admin Only)

**Objectif**: Approuver un claim

```bash
curl -X POST http://localhost:8080/api/employees/claims/CLAIM_ID_HERE/approve \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"moderator_notes": "Identity verified. Claim approved."}'
```

**✅ Résultat attendu:**
```json
{
  "message": "Claim request approved successfully. User and employee are now linked.",
  "success": true
}
```

**Vérifier le lien bidirectionnel:**
```sql
SELECT
  u.pseudonym,
  u.account_type,
  u.linked_employee_id,
  e.name as employee_name,
  e.user_id,
  e.is_self_profile
FROM users u
JOIN employees e ON u.linked_employee_id = e.id
WHERE u.id = 'USER_ID_FROM_CLAIM';
```

✅ **Attendu**: `linked_employee_id` = `e.id` ET `e.user_id` = `u.id`

**❌ Erreurs possibles:**
- 403: "Admin access required" (role !== 'admin')
- 400: "Claim request not found or not pending"

### Test 2.6: POST /api/employees/claims/:claimId/reject (Admin Only)

**Objectif**: Rejeter un claim

```bash
curl -X POST http://localhost:8080/api/employees/claims/CLAIM_ID_HERE/reject \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"moderator_notes": "Insufficient proof of identity. Please provide more verification documents."}'
```

**✅ Résultat attendu:**
```json
{
  "message": "Claim request rejected successfully.",
  "success": true
}
```

**❌ Erreurs possibles:**
- 400: "Please provide a reason for rejection (min 10 characters)"
- 403: "Admin access required"

---

## Phase 3: E2E Frontend - Self-Profile (30 min)

### Setup
1. Ouvrir http://localhost:3000 en **mode navigation privée** (pour éviter session existante)
2. Ouvrir DevTools Console (F12) pour voir logs

### Étape 3.1: Registration as Employee

1. Cliquer sur "**Register**" (ou naviguer vers `/register`)
2. **✅ Vérifier**: Formulaire d'inscription visible
3. **✅ Vérifier**: Radio buttons présents:
   - ⚪ "Regular User"
   - ⚪ "I am an Employee"
4. Sélectionner **"I am an Employee"**
5. **✅ Vérifier**: Banner informatif apparaît en bleu avec texte:
   ```
   ℹ️ As an employee, after registration you'll be able to create your self-managed profile or claim an existing one.
   ```
6. Remplir le formulaire:
   - **Pseudonym**: `test_employee_123`
   - **Email**: `test.employee.123@example.com`
   - **Password**: `TestPass123!`
   - **Confirm Password**: `TestPass123!`
7. Cliquer **"Register"**
8. **✅ Vérifier**: Toast success "Registration successful as employee!"
9. **✅ Vérifier**: Redirection automatique ou modal apparaît

### Étape 3.2: Employee Profile Wizard

1. **✅ Vérifier**: Modal `EmployeeProfileWizard` s'affiche automatiquement
2. **✅ Vérifier**: Header:
   ```
   🏮 Welcome, Employee!
   Set up your profile to get started
   ```
3. **✅ Vérifier**: 2 cartes interactives visibles:

   **Carte A**: "🔗 I have an existing profile"
   - Texte: "Link your account to an existing employee profile"
   - Bouton: "Claim Existing Profile"

   **Carte B**: "✨ I don't have a profile yet"
   - Texte: "Create your own self-managed employee profile"
   - Bouton: "Create New Profile"

4. **✅ Vérifier**: Hover sur cartes → effet de scale et glow

### Étape 3.3: Create Self-Profile

1. Cliquer sur carte **"Create New Profile"** (Option B)
2. **✅ Vérifier**: Modal `EmployeeFormContent` s'ouvre
3. **✅ Vérifier**: Header montre **"✨ Create Your Profile"**
4. **✅ Vérifier**: Subtitle: "Set up your self-managed employee profile"
5. Remplir le formulaire:
   - **Name**: `John Test`
   - **Nickname**: `Johnny`
   - **Age**: `28`
   - **Nationality**: `Thai`
   - **Description**: `Professional dancer and entertainer`
   - **Photos**: Upload une image ou URL `https://via.placeholder.com/300`
   - **Social Media** (optionnel):
     - Instagram: `@johntest`
     - Line ID: `johntest123`
6. Cliquer **"Save Employee"** ou **"Create Profile"**
7. **✅ Vérifier**: Loading spinner apparaît
8. **✅ Vérifier**: Toast success: "Your employee profile has been created and is pending approval"
9. **✅ Vérifier**: Redirection vers dashboard ou profile page

### Étape 3.4: Vérifier dans Database

```sql
-- Vérifier que le profil est créé et lié
SELECT
  u.pseudonym,
  u.account_type,
  u.linked_employee_id,
  e.name as employee_name,
  e.user_id,
  e.is_self_profile,
  e.status
FROM users u
JOIN employees e ON u.linked_employee_id = e.id
WHERE u.pseudonym = 'test_employee_123';
```

**✅ Résultat attendu:**

| pseudonym | account_type | employee_name | is_self_profile | status |
|-----------|--------------|---------------|-----------------|--------|
| test_employee_123 | employee | John Test | true | pending |

### Étape 3.5: Admin Approval

1. **Logout** du compte employee
2. **Login** avec compte **admin**
3. Aller dans **Admin Panel** (icône ⚙️ en haut à droite)
4. Cliquer sur onglet **"🔗 Claims"**
5. **✅ Vérifier**: Liste des claims visible
6. **✅ Vérifier**: Filtre tabs: Pending | Approved | Rejected | All
7. **✅ Vérifier**: Claim de `test_employee_123` apparaît dans "Pending"
8. **✅ Vérifier**: Carte claim montre:
   - **User Info**: pseudonym, email
   - **Employee Profile**: name, nickname, photo
   - **Message**: justification text (si applicable)
   - **Status badge**: PENDING (orange)
   - **Timestamps**: Created date/time
9. Cliquer **"View Details"** ou **"Approve"**
10. Si modal détails → **✅ Vérifier**: Vue complète avec toutes infos
11. Cliquer **"Approve"**
12. **✅ Vérifier**: Toast "Claim approved successfully! User account is now linked to employee profile."
13. **✅ Vérifier**: Claim passe en tab "Approved" avec badge vert

### Étape 3.6: Vérifier Lien Final

```sql
SELECT
  u.pseudonym,
  u.account_type,
  u.linked_employee_id,
  e.id as employee_id,
  e.name,
  e.user_id,
  e.is_self_profile,
  e.status,
  (u.linked_employee_id = e.id) as forward_link_ok,
  (e.user_id = u.id) as reverse_link_ok
FROM users u
JOIN employees e ON u.linked_employee_id = e.id
WHERE u.pseudonym = 'test_employee_123';
```

**✅ Attendu:**
- `forward_link_ok`: **true**
- `reverse_link_ok`: **true**
- `is_self_profile`: **true**
- `status`: **approved** (si admin a approuvé le profil employee aussi)

---

## Phase 4: E2E Frontend - Claim Existing (30 min)

### Étape 4.1: Registration (Répéter 3.1)

1. Mode navigation privée, nouveau user
2. Register avec account_type = 'employee'
3. Credentials: `test_claimer_456@example.com` / `TestPass456!`

### Étape 4.2: Open Claim Modal

1. Dans `EmployeeProfileWizard`, cliquer carte **"I have an existing profile"** (Option A)
2. **✅ Vérifier**: Modal `ClaimEmployeeModal` s'ouvre
3. **✅ Vérifier**: Header: "🔗 Claim Your Profile"
4. **✅ Vérifier**: Subtitle: "Link your account to an existing employee profile"

### Étape 4.3: Search Employee

1. **✅ Vérifier**: Champ de recherche visible avec placeholder "Type your name or nickname..."
2. Taper un nom d'employé existant dans la DB (ex: `Nok`, `Som`, etc.)
3. **✅ Vérifier**: Après 2+ caractères, loading spinner apparaît pendant 300ms
4. **✅ Vérifier**: Dropdown suggestions apparaît sous le champ
5. **✅ Vérifier**: Suggestions affichent nom/nickname des employés
6. **✅ Vérifier**: Hover sur suggestion → fond change (rgba(0,229,255,0.1))

### Étape 4.4: Select Employee

1. Cliquer sur une suggestion
2. **✅ Vérifier**: Champ search se remplit avec le nom
3. **✅ Vérifier**: Carte "Selected Profile" apparaît avec:
   - ✅ Badge "✅ Selected Profile" (fond cyan)
   - Photo de l'employé (60×60px, coins arrondis)
   - Nom complet (bold, blanc)
   - Nickname (gris, "aka Nickname")
   - Age + Nationality (petit texte gris)
4. **✅ Vérifier**: Suggestions dropdown disparaît

### Étape 4.5: Submit Claim avec Preuves

1. **✅ Vérifier**: Section "💬 Why is this your profile? *"
2. Dans textarea, écrire (min 10 chars):
   ```
   This is my profile. I have been working at this establishment for 2 years.
   I can verify my identity with my social media accounts and work documents.
   ```
3. **✅ Vérifier**: Compteur de caractères: "123/10 characters minimum" (cyan si ≥10)
4. **✅ Vérifier**: Section "📸 Verification Proof (Optional)"
5. **✅ Vérifier**: Champ URL avec placeholder "https://example.com/my-photo.jpg"
6. Ajouter preuves:
   - URL 1: `https://instagram.com/test_profile`
   - Cliquer **"+ Add Another Proof"**
   - URL 2: `https://facebook.com/test.profile`
   - Cliquer **"+ Add Another Proof"**
   - URL 3: `https://imgur.com/work-id-photo.jpg`
7. **✅ Vérifier**: Chaque URL a un bouton "×" rouge pour supprimer
8. **✅ Vérifier**: Section "ℹ️ What happens next?" avec 3 bullets explicatifs
9. Cliquer **"🚀 Submit Claim Request"**
10. **✅ Vérifier**: Bouton loading: "Submitting Claim..." avec spinner
11. **✅ Vérifier**: Toast success: "Claim request submitted! An administrator will review your request."
12. **✅ Vérifier**: Modal se ferme automatiquement

### Étape 4.6: Vérifier Claim en DB

```sql
SELECT
  mq.id,
  mq.item_type,
  mq.status,
  mq.request_metadata->>'message' as message,
  mq.request_metadata->>'employee_id' as employee_id,
  mq.request_metadata->>'user_id' as user_id,
  mq.verification_proof,
  mq.created_at,
  u.pseudonym as submitted_by,
  e.name as employee_name
FROM moderation_queue mq
JOIN users u ON mq.submitted_by = u.id
JOIN employees e ON (mq.request_metadata->>'employee_id')::uuid = e.id
WHERE mq.item_type = 'employee_claim'
AND mq.status = 'pending'
ORDER BY mq.created_at DESC
LIMIT 1;
```

**✅ Attendu:**
- `item_type`: `employee_claim`
- `status`: `pending`
- `message`: Contient le texte de justification
- `verification_proof`: Array de 3 URLs
- `submitted_by`: `test_claimer_456` (ou similaire)

### Étape 4.7: Admin Review Claims

1. **Login admin**
2. **Admin Panel** → **Claims tab**
3. **✅ Vérifier**: Nouveau claim visible dans liste
4. **✅ Vérifier**: Carte claim affiche:
   - **User avatar** + pseudonym + email
   - **Employee card**: photo + name + nickname + age
   - **Message section**: Justification complète (expandable si long)
   - **Verification Proofs**: Grid de thumbnails (3 images)
   - **Timestamps**: "Submitted 2 minutes ago"
   - **Status badge**: PENDING (orange, pulsating)
   - **Actions**: Approve (vert) | Reject (rouge)
5. **✅ Vérifier**: Cliquer sur thumbnail → ouvre image en full size
6. Cliquer **"Approve"**
7. **✅ Vérifier**: Toast "Claim approved successfully! User account is now linked to employee profile."
8. **✅ Vérifier**: Claim disparaît de "Pending" et apparaît dans "Approved"

### Étape 4.8: Test Reject Flow

1. Créer un 2ème claim (répéter 4.1-4.5 avec autre user)
2. Admin Panel → Claims → Cliquer **"Reject"**
3. **✅ Vérifier**: Modal "Reject Claim Request" s'ouvre
4. **✅ Vérifier**: Textarea "Reason for rejection *" (required, min 10 chars)
5. Écrire raison:
   ```
   Insufficient proof of identity. Please provide additional verification documents such as work ID or official social media profiles.
   ```
6. **✅ Vérifier**: Compteur caractères (>10 → cyan)
7. Cliquer **"Reject Claim"**
8. **✅ Vérifier**: Toast "Claim rejected successfully"
9. **✅ Vérifier**: Claim passe en tab "Rejected" avec badge rouge

### Étape 4.9: Vérifier Lien Bidirectionnel Final

```sql
SELECT
  u.id as user_id,
  u.pseudonym,
  u.account_type,
  u.linked_employee_id,
  e.id as employee_id,
  e.name,
  e.user_id as employee_user_link,
  e.is_self_profile,
  (u.linked_employee_id = e.id) as forward_link,
  (e.user_id = u.id) as reverse_link
FROM users u
JOIN employees e ON u.linked_employee_id = e.id
WHERE u.email LIKE 'test_claimer_%'
ORDER BY u.created_at DESC;
```

**✅ Pour claim approuvé, attendu:**
- `forward_link`: **true**
- `reverse_link`: **true**
- `is_self_profile`: **true** (marqué ainsi après claim approval)
- `account_type`: **employee**

---

## Phase 5: Edge Cases (20 min)

### Test 5.1: User Already Linked

**Objectif**: Vérifier qu'un user ne peut pas avoir 2 profils

1. Login avec un user qui a déjà `linked_employee_id` non NULL
2. Tenter API call:
```bash
curl -X POST http://localhost:8080/api/employees/claim/ANOTHER_EMPLOYEE_ID \
  -H "Authorization: Bearer TOKEN_OF_LINKED_USER" \
  -H "Content-Type: application/json" \
  -d '{"message": "Attempting second claim"}'
```

**✅ Attendu:**
```json
{
  "error": "You already have a linked employee profile",
  "code": "ALREADY_LINKED"
}
```

**Status Code**: 409 Conflict

### Test 5.2: Employee Already Linked

**Objectif**: Vérifier qu'un profil déjà lié ne peut pas être re-claimed

1. Identifier un employee avec `user_id` non NULL:
```sql
SELECT id, name, user_id FROM employees WHERE user_id IS NOT NULL LIMIT 1;
```

2. Tenter claim avec un autre user:
```bash
curl -X POST http://localhost:8080/api/employees/claim/LINKED_EMPLOYEE_ID \
  -H "Authorization: Bearer ANOTHER_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "Trying to claim already linked profile"}'
```

**✅ Attendu:**
```json
{
  "error": "This employee profile is already linked to another user account",
  "code": "ALREADY_LINKED"
}
```

**Status Code**: 409 Conflict

### Test 5.3: Duplicate Claim

**Objectif**: Vérifier qu'on ne peut pas submit 2 fois le même claim

1. Submit claim pour un profil (si pas déjà fait)
2. **Sans attendre approval**, re-submit le même claim:
```bash
curl -X POST http://localhost:8080/api/employees/claim/SAME_EMPLOYEE_ID \
  -H "Authorization: Bearer SAME_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "Second attempt to claim same profile"}'
```

**✅ Attendu:**
```json
{
  "error": "You already have a pending claim request for this profile",
  "code": "CLAIM_PENDING"
}
```

**Status Code**: 409 Conflict

### Test 5.4: Non-Admin Access Claims List

**Objectif**: Vérifier que seul admin/moderator peut voir claims

1. Login avec un **regular user** (pas admin/moderator)
2. Tenter accès:
```bash
curl http://localhost:8080/api/employees/claims \
  -H "Authorization: Bearer REGULAR_USER_TOKEN"
```

**✅ Attendu:**
```json
{
  "error": "Admin/moderator access required",
  "code": "FORBIDDEN"
}
```

**Status Code**: 403 Forbidden

### Test 5.5: Non-Admin Approve/Reject

**Objectif**: Vérifier que seul admin peut approuver/rejeter

1. Login avec **moderator** ou **regular user**
2. Tenter approve:
```bash
curl -X POST http://localhost:8080/api/employees/claims/CLAIM_ID/approve \
  -H "Authorization: Bearer NON_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"moderator_notes": "Trying to approve"}'
```

**✅ Attendu:**
```json
{
  "error": "Admin access required",
  "code": "FORBIDDEN"
}
```

**Status Code**: 403 Forbidden

**Note**: `requireAdmin` middleware bloque, mais `requireRole(['admin', 'moderator'])` sur GET /claims permet moderator de **voir** mais pas **approuver/rejeter**

### Test 5.6: Message trop Court

**Objectif**: Validation min 10 caractères

1. Frontend: Tenter submit claim avec message < 10 chars
2. **✅ Vérifier**: Bouton submit **désactivé** (opacity 0.5)
3. Backend: Tenter API call:
```bash
curl -X POST http://localhost:8080/api/employees/claim/EMPLOYEE_ID \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "Test"}'
```

**✅ Attendu:**
```json
{
  "error": "Please provide a detailed message (min 10 characters) explaining why this is your profile"
}
```

**Status Code**: 400 Bad Request

### Test 5.7: Reject sans Notes

**Objectif**: Admin doit fournir raison de rejet

```bash
curl -X POST http://localhost:8080/api/employees/claims/CLAIM_ID/reject \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"moderator_notes": "Short"}'
```

**✅ Attendu:**
```json
{
  "error": "Please provide a reason for rejection (min 10 characters)"
}
```

**Status Code**: 400 Bad Request

### Test 5.8: Claim Profil Inexistant

```bash
curl -X POST http://localhost:8080/api/employees/claim/00000000-0000-0000-0000-000000000000 \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "This is my fake profile test"}'
```

**✅ Attendu:**
```json
{
  "error": "Employee profile not found"
}
```

**Status Code**: 404 Not Found

---

## 📊 Checklist Finale

### Backend ✅

- [ ] ✅ Migration #1 exécutée (add_user_employee_link.sql)
- [ ] ✅ Migration #2 exécutée (extend_moderation_queue.sql)
- [ ] ✅ 3 SQL functions créées et testées
- [ ] ✅ POST /api/employees/my-profile → 201 Created
- [ ] ✅ GET /api/employees/my-linked-profile → 200 OK
- [ ] ✅ POST /api/employees/claim/:id → 201 Created
- [ ] ✅ GET /api/employees/claims → 200 OK (admin)
- [ ] ✅ POST /api/employees/claims/:id/approve → 200 OK
- [ ] ✅ POST /api/employees/claims/:id/reject → 200 OK

### Frontend ✅

- [ ] ✅ RegisterForm affiche account type selector
- [ ] ✅ Banner informatif pour employees
- [ ] ✅ EmployeeProfileWizard apparaît post-registration
- [ ] ✅ Option A: "Claim existing" → ClaimEmployeeModal
- [ ] ✅ Option B: "Create new" → EmployeeFormContent
- [ ] ✅ ClaimEmployeeModal autocomplete fonctionne
- [ ] ✅ Submit claim avec proofs → Success toast
- [ ] ✅ Admin Panel → Claims tab visible
- [ ] ✅ Claims list affiche pending/approved/rejected
- [ ] ✅ Approve flow → Toast + claim passe approved
- [ ] ✅ Reject flow → Modal notes → Toast + rejected

### Database ✅

- [ ] ✅ users.account_type existe et populated
- [ ] ✅ users.linked_employee_id bidirectional link OK
- [ ] ✅ employees.user_id bidirectional link OK
- [ ] ✅ employees.is_self_profile = true pour self-managed
- [ ] ✅ moderation_queue.item_type = 'employee_claim'
- [ ] ✅ request_metadata JSONB contient message + IDs
- [ ] ✅ verification_proof array contient URLs
- [ ] ✅ Indexes de performance installés (7 indexes)
- [ ] ✅ Contraintes one-to-one respectées

### Edge Cases ✅

- [ ] ✅ User already linked → 409 error
- [ ] ✅ Employee already linked → 409 error
- [ ] ✅ Duplicate claim → 409 error
- [ ] ✅ Non-admin access claims → 403 error
- [ ] ✅ Non-admin approve/reject → 403 error
- [ ] ✅ Message < 10 chars → 400 error
- [ ] ✅ Reject notes < 10 chars → 400 error
- [ ] ✅ Claim inexistant employee → 404 error

---

## 🎯 Critères de Succès Final

**✅ Feature 100% Fonctionnelle si:**

1. ✅ Migrations SQL exécutées sans erreur
2. ✅ Tous les 6 endpoints API retournent status codes corrects
3. ✅ Flow Self-Profile: Register → Create → Approve → Link OK
4. ✅ Flow Claim: Register → Claim → Approve → Link OK
5. ✅ Admin panel gère claims (view/approve/reject)
6. ✅ Tous edge cases retournent erreurs appropriées
7. ✅ Lien bidirectionnel vérifié en DB
8. ✅ Audit trail complet (created_by, reviewed_by, timestamps)

---

## 📝 Notes de Test

**Environnement:**
- Backend: http://localhost:8080
- Frontend: http://localhost:3000
- Database: Supabase PostgreSQL

**Durée estimée totale:** 2-2.5 heures

**Prochaine étape après tests:** Mettre à jour IMPLEMENTATION_STATUS.md à 100%

---

**🏮 PattaMap v10.0 - Employee Self-Management System Testing Guide**
