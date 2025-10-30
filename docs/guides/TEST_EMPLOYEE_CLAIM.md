# 🧪 Test Manuel - Employee Claim System Fix

## Contexte

Le bug CSRF "token mismatch" lors de l'inscription employee + claim a été corrigé :

**Changements effectués** :
1. ✅ **Backend** (`auth Controller.ts`) - Retourne CSRF token dans la réponse register
2. ✅ **Frontend** (`AuthContext.tsx`) - Utilise le token de la réponse register directement
3. ✅ **CSRF Middleware** (`csrf.ts`) - Attend que la session soit sauvegardée avant next()

## ⚠️ Important

Le test automatisé avec axios **ne peut pas** valider ce fix car axios ne gère pas automatiquement les cookies comme un navigateur. Le test **doit être fait manuellement** dans l'interface web.

---

## 📋 Procédure de Test

### Prérequis
- ✅ Backend actif sur http://localhost:8080
- ✅ Frontend actif sur http://localhost:3000
- ✅ Ouvrir DevTools (F12) > Console + Network

### Test 1: Inscription Employee + Claim Profile

#### Étape 1: Ouvrir l'interface
```
http://localhost:3000
```

#### Étape 2: Cliquer sur "Login / Register"

#### Étape 3: Aller sur l'onglet "Register"

#### Étape 4: Sélectionner "Employee Account"
- Type de compte: **Employee**
- Option: **Claim existing profile**

#### Étape 5: Remplir le formulaire
- **Pseudonym**: `testemployee_[timestamp]`
- **Email**: `test_[timestamp]@example.com`
- **Password**: `TestPassword123` (min 8 chars, maj+min+chiffre)

#### Étape 6: Sélectionner une employée existante
- Choisir n'importe quelle employée dans la liste
- Ajouter un message de claim: "Test claim - validating CSRF fix"

#### Étape 7: Soumettre le formulaire
- Cliquer sur "Register & Claim"

#### Résultats Attendus ✅

**Console (DevTools)**:
```
✅ CSRF token received from register response
🔐 Claiming employee profile
✅ Claim request submitted!
```

**Network Tab**:
- ✅ POST /api/auth/register → 201 Created
- ✅ POST /api/employees/claim/[id] → 201 Created (pas 403!)

**UI**:
- ✅ Toast success: "Claim request submitted!"
- ✅ Modale se ferme automatiquement

**Backend Logs**:
```
✅ CSRF token generated and session saved
✅ CSRF validation successful
✅ Claim request created by user [id] for employee [id]
```

#### Résultats NON ATTENDUS ❌

**Si le bug persiste**:
- ❌ Console: `CSRF token mismatch`
- ❌ Network: POST /api/employees/claim → 403 Forbidden
- ❌ Toast error: "CSRF token mismatch"

---

### Test 2: Vérification Admin

#### Étape 1: Se connecter en tant qu'admin

#### Étape 2: Aller sur "Admin Dashboard"

#### Étape 3: Onglet "Claim Requests"

#### Étape 4: Vérifier la claim request
- ✅ La claim request doit apparaître dans la liste
- ✅ Status: "Pending"
- ✅ User: Le pseudonym du test
- ✅ Employee: L'employée sélectionnée
- ✅ Message: "Test claim - validating CSRF fix"

---

## 📊 Checklist de Validation

### Fonctionnalités Testées
- [ ] Inscription avec `account_type='employee'`
- [ ] Sélection d'une employée existante
- [ ] Soumission du formulaire de claim
- [ ] Pas d'erreur CSRF token mismatch
- [ ] Claim request créée en base de données
- [ ] Claim request visible dans Admin Dashboard

### Cas Limites à Tester (Optionnel)
- [ ] Claim avec message vide
- [ ] Claim d'une employée déjà claimed
- [ ] Claim avec employée inexistante
- [ ] Double soumission rapide (spam)

---

## 🐛 En Cas d'Échec

### Si le bug CSRF persiste encore

1. **Vérifier les logs backend**
   - Regarder dans la console backend pour les logs CSRF
   - Chercher "CSRF validation failed"
   - Noter le `sessionId` dans les logs

2. **Vérifier les cookies**
   - DevTools > Application > Cookies
   - Vérifier que `connect.sid` existe et change après register
   - Vérifier que `auth-token` est créé après register

3. **Vérifier le Network**
   - Onglet Network > Filter: "Fetch/XHR"
   - Regarder les headers de POST /api/employees/claim
   - Vérifier que `X-CSRF-Token` header est présent
   - Vérifier que `Cookie` header contient `connect.sid`

4. **Capturer un screenshot**
   ```bash
   node scripts/screenshot.js
   ```

5. **Reporter le bug avec**:
   - Screenshot de l'erreur
   - Console logs (frontend)
   - Backend logs (CSRF lines)
   - Network tab (requêtes register + claim)

---

## ✅ Résolution Attendue

**Avant le fix**:
```
POST /api/auth/register → 201 ✅
POST /api/employees/claim → 403 ❌ (CSRF token mismatch)
```

**Après le fix**:
```
POST /api/auth/register → 201 ✅
POST /api/employees/claim → 201 ✅ (Claim created)
```

---

## 📝 Notes Techniques

### Pourquoi le test automatisé ne fonctionne pas ?

Le test axios échoue car **axios ne maintient pas un jar de cookies** entre les requêtes comme un navigateur. Même avec `withCredentials: true`, chaque requête est indépendante.

### Architecture du Fix

1. **Backend crée le token** lors de POST /api/auth/register
2. **Backend retourne le token** dans la réponse JSON
3. **Frontend utilise ce token** immédiatement pour POST /api/employees/claim
4. **Middleware CSRF attend** que la session soit sauvegardée avant de continuer

### Sessions & Cookies

- **Session Cookie** (`connect.sid`): Identifie la session utilisateur
- **Auth Cookie** (`auth-token`): JWT pour l'authentification
- **CSRF Token**: Stocké dans la session, validé dans les headers

Le token CSRF doit être dans **la même session** que celle utilisée pour la requête. C'est pourquoi les cookies doivent être correctement propagés entre register et claim.

---

**Date du fix**: 2025-10-12
**Version**: v10.0
**Status**: ⏳ En attente de validation manuelle
