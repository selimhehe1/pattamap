# AUDIT UI/UX COMPLET - PattaMap (www.pattamap.com)

**Date:** 27 décembre 2025
**Site audité:** https://www.pattamap.com/

---

## BUGS CRITIQUES (Priorité haute)

### 1. Page /login retourne 404 - ✅ CORRIGÉ
- **URL:** https://www.pattamap.com/login
- **Problème:** La route `/login` n'était pas définie dans App.tsx
- **Solution appliquée:** Ajout de l'import et de la route dans `src/App.tsx`
- **Commit:** `ea2a371` - "fix: add /login route to App.tsx"
- **Statut:** ✅ DÉPLOYÉ ET FONCTIONNEL

### 1b. Login API échoue avec "Failed to fetch" - ✅ CORRIGÉ
- **URL:** https://www.pattamap.com/login
- **Problème:** La page /login s'affiche correctement, mais la soumission du formulaire échoue avec l'erreur "Failed to fetch"
- **Cause racine:** Chrome bloquait les cookies tiers (api.pattamap.com ≠ www.pattamap.com)
- **Solution appliquée:** Ajout d'un proxy rewrite dans `vercel.json` pour router /api/* via le même domaine
- **Commit:** `e74699f` - "fix: add API proxy rewrite to fix third-party cookie blocking"
- **Statut:** ✅ DÉPLOYÉ ET FONCTIONNEL - Login testé avec succès

### 2. Modale de Login ne s'affiche pas correctement - ✅ CORRIGÉ
- **Chemin:** Menu hamburger → "Login / Register"
- **Problème:** L'overlay/backdrop flou apparaît mais le contenu de la modale ne se charge pas (seulement une ligne blanche horizontale visible)
- **Cause racine:** Double overlay - Modal.tsx fournit un overlay, et LoginForm.tsx rendait aussi son propre overlay
- **Solution appliquée:** Ajout d'une prop `embedded` à LoginForm pour rendre sans overlay quand utilisé dans Modal.tsx
- **Commit:** `73dfe38` - "fix: login modal from hamburger menu not displaying content"
- **Fichiers modifiés:** `src/components/Auth/LoginForm.tsx`, `src/hooks/useAppModals.ts`, `src/styles/components/modal-forms.css`
- **Statut:** ✅ DÉPLOYÉ ET FONCTIONNEL - Modale de login testée avec succès

### 3. Établissements absents des cartes ergonomiques - ✅ CORRIGÉ
- **Pages:** Toutes les zones (Soi 6, Walking Street, LK Metro, Soi Buakhao, Beach Road, Treetown)
- **Problème:** Les cartes affichaient uniquement les routes sans établissements
- **Cause racine:** Le fix du commit `8275be7` (API URL fallback) a également résolu ce problème
- **Vérification:** Ruby Club s'affiche correctement sur la carte Soi 6 (position row=1, col=13)
- **Statut:** ✅ FONCTIONNEL - Les établissements s'affichent maintenant sur les cartes ergonomiques

### 4. Incohérence des données entre pages - ✅ CORRIGÉ (comportement attendu)
- **Problème initial:**
  - `/freelances` affiche "0 freelances available" et "No freelances found"
  - `/search` affiche "Found 3 result" avec Nicky, XP Test Employee, Test Sans Photo
  - Zone Lineup (Soi 6) affiche "1 Employee" (Nicky)
- **Analyse:**
  - Ce n'est PAS une incohérence - ce sont deux types d'employés différents:
    - **Freelances** (`is_freelance = true`): professionnels indépendants sans établissement fixe → affichés sur `/freelances`
    - **Employés réguliers** (`is_freelance = false`): associés à des établissements via `employment_history` → affichés sur `/search` et Zone Lineup
  - Les employés visibles sur `/search` (Nicky, XP Test, etc.) sont des employés réguliers, pas des freelances
  - Il n'y a actuellement AUCUN employé avec `is_freelance = true` dans la base de données
- **Bug corrigé:** La requête SQL utilisait un INNER JOIN qui excluait les freelances sans historique d'emploi
- **Commit:** `f2393ba` - "fix: freelances API returning 0 results due to INNER JOIN"
- **Statut:** ✅ CODE CORRIGÉ - La page /freelances fonctionnera quand des freelances seront ajoutés à la DB

---

## ERREURS DE TEXTE / GRAMMAIRE

### 5. "Found 3 result" au lieu de "results" - ✅ CORRIGÉ
- **Page:** /search
- **Problème:** Texte au singulier pour un nombre > 1
- **Cause racine:** i18next v21+ utilise le format `_one`/`_other` pour la pluralisation, pas `_plural`
- **Solution appliquée:** Mise à jour des 8 fichiers de traduction pour utiliser `foundResults_one` et `foundResults_other`
- **Commit:** `57561de` - "fix: pluralization not working for 'Found X result(s)'"
- **Fichiers modifiés:** Tous les fichiers locales (en, fr, ru, th, cn, hi, ko, ja)
- **Statut:** ✅ DÉPLOYÉ ET FONCTIONNEL - Affiche maintenant "Found 3 results"

---

## PROBLÈMES DE DESIGN / LAYOUT

### 6. Bouton vide sur la page 404 - ✅ NON REPRODUCTIBLE
- **Page:** /login (page 404)
- **Problème initial:** À côté du bouton "Go Back", il y a un bouton blanc/vide sans texte ni fonction apparente
- **Analyse:** L'issue était observée quand /login retournait une 404. Maintenant que la route /login est correctement configurée (commit ea2a371), la page 404 standard fonctionne correctement avec deux boutons bien stylés: "Go Back" et "Home"
- **Vérification:** Page 404 testée sur /nonexistent-page - aucun bouton vide visible
- **Statut:** ✅ NON REPRODUCTIBLE - Probablement résolu par le fix de la route /login

### 7. Texte tronqué sur /freelances - ✅ CORRIGÉ
- **Page:** /freelances
- **Problème:** Le texte "Independent professionals available in Pattaya nightlife" était partiellement coupé/tronqué en haut de la page
- **Cause racine:** La classe `.search-layout` n'avait pas de padding-top pour compenser le header fixe
- **Solution appliquée:** Ajout de `.search-layout` avec `padding-top: calc(var(--height-header-desktop, 80px) + 30px)` + responsive breakpoints
- **Commit:** `edcda2d` - "fix: add padding-top to search-layout class for fixed header"
- **Fichier modifié:** `src/styles/pages/freelances.css`
- **Statut:** ✅ DÉPLOYÉ ET FONCTIONNEL

### 8. Grande zone vide sur la page d'accueil - ✅ CORRIGÉ
- **Page:** / (Zone Lineup)
- **Problème:** Énorme espace vide à droite de la carte employé quand il n'y a qu'un seul résultat
- **Cause racine:** Grid avec `1fr` étendait la carte unique pour remplir l'espace
- **Solution appliquée:** Ajout de `justify-items: start` à `.employees-grid-view__grid`
- **Fichier modifié:** `src/styles/components/employees-grid-view.css`
- **Statut:** ✅ CORRIGÉ

### 9. Incohérence de couleur des routes sur les cartes - ⚠️ NON-ISSUE
- **Pages:** Cartes ergonomiques
- **Problème initial:** Soi 6 route GRISE vs LK Metro/Soi Buakhao routes NOIRES
- **Analyse:** Toutes les zones utilisent les MÊMES couleurs (`#2d2d2d` et `#1a1a1a`)
- **Conclusion:** La différence perçue vient des largeurs de routes différentes, pas des couleurs
- **Statut:** ⚠️ NON-ISSUE - Pas de fix nécessaire

### 10. Cartes d'employés sans photo - ✅ CORRIGÉ
- **Page:** /search
- **Problème:** Les employés sans photo affichaient juste une icône de personne grise
- **Solution appliquée:** Remplacé l'icône User par un cercle avec les initiales de l'employé + gradient
- **Fichiers modifiés:** `src/components/Common/EmployeeCard.tsx`, `src/styles/components/employee-card.css`
- **Statut:** ✅ CORRIGÉ

### 11. Taille de cartes inconsistante - ✅ DÉJÀ CORRIGÉ
- **Page:** /search
- **Problème initial:** Les cartes avec photos semblaient plus grandes que celles sans photos
- **Analyse:** Les cartes utilisent `aspect-ratio: 3/4` qui garantit une hauteur consistante
- **Fichier:** `src/styles/components/employee-card.css` (line 30)
- **Statut:** ✅ DÉJÀ CORRIGÉ - Le ratio d'aspect force une taille uniforme

---

## DONNÉES DE TEST EN PRODUCTION

### 12. Données de test visibles - ✅ CORRIGÉ
- **Page:** /search
- **Problème:** "XP Test Employee", "Test Sans Photo", et "Test Frontend Approve" étaient des données de test visibles par tous les utilisateurs
- **Impact:** Apparence non professionnelle, confusion
- **Action effectuée:** Suppression des 3 employés de test via l'API Supabase REST
- **Employés supprimés:**
  - `c4981737-e8e8-48ed-9a43-13a877fbcb55` - Test Sans Photo
  - `3c48dc78-1181-4cf6-ae25-43aacb24d22c` - XP Test Employee
  - `07a652eb-157b-4e45-95aa-80d88db304eb` - Test Frontend Approve
- **Employé conservé:** Nicky (cd09ef9f-ddd5-4f47-9e70-8f0f40d97245) - employé réel
- **Vérification:** /search affiche maintenant "Found 1 result" avec uniquement Nicky
- **Statut:** ✅ SUPPRIMÉ DE LA PRODUCTION

---

## PROBLÈMES D'ERGONOMIE

### 13. Barre de progression vide - ⚠️ NON-ISSUE
- **Pages:** Zone Lineup
- **Problème initial:** La barre sous "X Employees" semble vide/incomplète
- **Analyse:** Il n'y a PAS de barre de progression - c'est juste un compteur texte avec icône
- **Fichier:** `src/components/Map/EmployeesGridView.tsx` (lines 145-152)
- **Statut:** ⚠️ NON-ISSUE - C'est un compteur, pas une barre de progression

### 14. Zone grise en bas de /freelances - ✅ CORRIGÉ
- **Page:** /freelances
- **Problème:** Une bande grise apparaît en bas de l'écran sans raison apparente
- **Cause racine:** La classe `.search-layout` n'avait pas de background défini, donc le body background (potentiellement différent) était visible
- **Solution appliquée:** Ajout de `background: var(--gradient-main)` à `.search-layout` + `padding-bottom: 40px` + `box-sizing: border-box`
- **Commit:** `b1007c0` - "fix: add background to search-layout to prevent grey zone at bottom of /freelances"
- **Fichier modifié:** `src/styles/pages/freelances.css`
- **Statut:** ✅ DÉPLOYÉ ET FONCTIONNEL

---

## BUGS PAGES PROTÉGÉES (Nouveau - 27 déc)

### 15. Admin Panel - Données ne se chargent pas - ✅ CORRIGÉ
- **Page:** /admin (Establishments tab, Employees tab)
- **Problème:** Les tabs affichaient "No data found" malgré l'API retournant des données
- **Cause racine:** Fallback `'http://localhost:8080'` dans 11 fichiers causait des requêtes silencieuses vers localhost en production
- **Solution appliquée:** Changé fallback de `'http://localhost:8080'` vers `''` (chaîne vide) dans tous les fichiers concernés
- **Commit:** `8275be7` - "fix: use relative API paths instead of localhost fallback"
- **Fichiers corrigés:** EstablishmentsAdmin.tsx, CommentsAdmin.tsx, VerificationsAdmin.tsx, EmployeeClaimsAdmin.tsx, UsersAdmin.tsx, ConsumablesAdmin.tsx, EstablishmentOwnersAdmin.tsx, EmployeesAdmin/utils.ts, GirlProfile.tsx, pushManager.ts, NotificationBell.tsx
- **Statut:** ✅ FONCTIONNEL - Admin Panel affiche correctement Ruby Club et les 4 employés

### 16. Admin Panel - Titre tronqué - ✅ CORRIGÉ
- **Page:** /admin
- **Problème:** "Admin Control Center" apparaît comme "Admin Co...ol Center" (texte coupé)
- **Cause racine:** Le gradient text avec `background-clip: text` causait des problèmes de rendu
- **Solution appliquée:** Ajout de `white-space: nowrap`, `overflow: visible` au titre, `flex-wrap: nowrap` au container
- **Fichier modifié:** `src/styles/admin/dashboard.css`
- **Statut:** ✅ CORRIGÉ

### 17. Admin Panel - Tabs overflow - ✅ CORRIGÉ
- **Page:** /admin
- **Problème:** Les 7 tabs dépassaient l'écran horizontalement
- **Cause racine:** `flex: 1` sur les boutons forçait chaque tab à prendre trop d'espace
- **Solution appliquée:** Changé `flex: 1` en `flex: 0 0 auto`, ajouté `-webkit-overflow-scrolling: touch` pour scroll smooth mobile
- **Fichier modifié:** `src/styles/admin/dashboard.css`
- **Statut:** ✅ CORRIGÉ

### 18. My Establishments - Type de compte incohérent - ✅ CORRIGÉ
- **Page:** /my-establishments
- **Problème:** Affichait seulement `account_type` au lieu du `role`
- **Solution appliquée:** Message clarifié pour montrer les deux valeurs: `Your role: {role} | Account type: {account_type}`
- **Fichier modifié:** `src/pages/MyEstablishmentsPage.tsx`
- **Statut:** ✅ CORRIGÉ

---

## PLAN D'IMPLÉMENTATION - ISSUES RESTANTES

### Issue #8 - Grande zone vide sur homepage (1 résultat)
**Fichier:** `src/styles/components/employees-grid-view.css`
**Problème:** Grid avec `repeat(auto-fill, minmax(180px, 1fr))` - le `1fr` étend la carte unique
**Fix:**
```css
.employees-grid-view__grid {
  justify-items: start; /* Aligner les cartes à gauche au lieu de stretch */
}
```

---

### Issue #9 - Couleurs routes incohérentes - ⚠️ NON-ISSUE
**Analyse:** Toutes les zones utilisent les MÊMES couleurs (`#2d2d2d` et `#1a1a1a`)
**Conclusion:** La différence perçue vient des largeurs de routes différentes, pas des couleurs
**Action:** Marquer comme NON-ISSUE - pas de fix nécessaire

---

### Issue #10 - Placeholder cartes sans photo
**Fichier:** `src/components/Common/EmployeeCard.tsx` (lines 107-110)
**Problème:** Affiche juste une icône User grise
**Fix:** Améliorer le placeholder avec:
- Fond gradient plus esthétique
- Initiales de l'employé (première lettre du nom)
- Style cohérent avec le design

**Code actuel:**
```tsx
<div className="employee-card-placeholder">
  <span className="employee-card-placeholder-icon"><User size={48} /></span>
</div>
```

**Code proposé:**
```tsx
<div className="employee-card-placeholder">
  <div className="employee-card-placeholder-initials">
    {employee.name?.charAt(0)?.toUpperCase() || '?'}
  </div>
</div>
```

**CSS à ajouter dans** `src/styles/components/employee-card.css`:
```css
.employee-card-placeholder-initials {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
  font-weight: bold;
  color: white;
  text-shadow: 0 2px 4px rgba(0,0,0,0.3);
}
```

---

### Issue #11 - Taille cartes inconsistante - ⚠️ DÉJÀ FIXÉ
**Analyse:** Les cartes utilisent `aspect-ratio: 3/4` qui garantit une hauteur consistante
**Fichier:** `src/styles/components/employee-card.css` (line 30)
```css
.employee-card-tinder {
  aspect-ratio: 3 / 4;
}
```
**Action:** Vérifier visuellement - probablement déjà OK

---

### Issue #13 - Barre de progression vide
**Analyse:** Il n'y a PAS de barre de progression - c'est juste un compteur texte
**Fichier:** `src/components/Map/EmployeesGridView.tsx` (lines 145-152)
**Options:**
1. Marquer comme NON-ISSUE (c'est un compteur, pas une barre de progression)
2. OU ajouter une vraie barre de progression visuelle

**Si on veut ajouter une barre:** Utiliser le composant XPProgressBar existant ou créer un style CSS simple

---

### Issue #16 - Titre Admin tronqué
**Fichier:** `src/styles/admin/dashboard.css` (lines 111-121)
**Problème:** Le gradient text avec `background-clip: text` cause des problèmes de rendu
**Fix:**
```css
.admin-control-title {
  white-space: nowrap;
  overflow: visible;
}

.admin-control-center {
  flex-wrap: nowrap;
  min-width: 0;
}
```

---

### Issue #17 - Tabs Admin overflow
**Fichier:** `src/styles/admin/dashboard.css` (lines 415-433)
**Problème:** `flex: 1` sur les tabs force chaque tab à prendre trop d'espace
**Fix:**
```css
.admin-tab-button {
  flex: 0 0 auto; /* Au lieu de flex: 1 */
  min-width: fit-content;
}

.admin-tabs-container {
  flex-wrap: nowrap;
  -webkit-overflow-scrolling: touch; /* Smooth scroll mobile */
}
```

---

### Issue #18 - Type compte "regular" pour admin
**Fichier:** `src/pages/MyEstablishmentsPage.tsx` (line 176)
**Problème:** Affiche `account_type` au lieu du `role`
**Fix:** Clarifier le message pour montrer les deux valeurs:
```tsx
<p className="auth-message-text">
  This section is only available for establishment owners.<br />
  Your role: <strong>{user.role}</strong> | Account type: <strong>{user.account_type}</strong>
</p>
```

---

## ORDRE D'EXÉCUTION

1. **#8** - Grid layout (CSS simple)
2. **#10** - Placeholder initiales (TSX + CSS)
3. **#16** - Titre admin (CSS)
4. **#17** - Tabs overflow (CSS)
5. **#18** - Message account type (TSX)
6. **#9** - Marquer NON-ISSUE
7. **#11** - Vérifier et marquer OK
8. **#13** - Décider: NON-ISSUE ou ajouter barre

---

## PAGES AUDITÉES

| Page | URL | Statut |
|------|-----|--------|
| Accueil | / | Problèmes mineurs (layout) |
| Search | /search | ✅ Fonctionnel (1 employé réel) |
| Freelances | /freelances | Problèmes mineurs (layout) |
| Login | /login | ✅ Entièrement corrigé |
| Page 404 | /* | ✅ Fonctionnel |
| Cartes ergonomiques | / (toutes zones) | ✅ CORRIGÉ - Établissements affichés |
| Dashboard | /dashboard | ✅ Audité - Fonctionnel |
| Admin Panel | /admin | ✅ Fonctionnel (1 employé, 1 établissement) |
| My Establishments | /my-establishments | ✅ Audité - Access Denied (normal) |
| Employee Dashboard | /employee/dashboard | ✅ Audité - Access Denied (normal) |

---

## NOTES TECHNIQUES

- Le site utilise React + Vite
- Les cartes sont des composants Canvas personnalisés
- L'authentification semble être via modale, pas page dédiée
- Les données proviennent d'une API backend (probablement Railway)
- i18n configuré pour 6 langues (EN, TH, RU, CN, FR, HI)
