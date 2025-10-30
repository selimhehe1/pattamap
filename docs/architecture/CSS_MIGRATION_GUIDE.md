# 📘 GUIDE DE MIGRATION CSS - Nouvelle Architecture

**Date**: 2025-10-08
**Version**: 2.0.0
**Auteur**: Refactoring CSS Modulaire

---

## 🎯 OBJECTIF

Migrer progressivement de l'ancien système CSS monolithique (`nightlife-theme.css` 9,145 lignes) vers une architecture modulaire, maintenable et scalable.

---

## 📂 NOUVELLE STRUCTURE

```
src/styles/
├── design-system.css           ← NOUVEAU - Variables centralisées
├── base/
│   └── reset.css              ← NOUVEAU - Reset & base styles
├── components/
│   ├── buttons.css            ← À créer
│   ├── forms.css              ← À créer
│   └── modals.css             ← À créer
├── layout/
│   ├── header.css             ← À créer
│   └── page.css               ← À créer
├── features/
│   ├── maps.css               ← À créer
│   └── admin.css              ← À créer
├── themes/
│   ├── dark.css               ← À créer (overrides)
│   └── light.css              ← À créer (overrides)
├── utils/
│   └── overlays.css           ← NOUVEAU - Patterns réutilisables
│
├── theme-variables.css         ← ANCIEN - Sera remplacé par design-system.css
├── nightlife-theme.css         ← ANCIEN - Sera déprécié progressivement
└── theme-overrides.css         ← ANCIEN - Sera déprécié
```

---

## 🚀 MIGRATION PROGRESSIVE (4 PHASES)

### Phase 1: ✅ FONDATIONS (COMPLÉTÉE)

**Créé**:
- ✅ Structure de dossiers (`base/`, `components/`, `layout/`, `features/`, `themes/`, `utils/`)
- ✅ `design-system.css` - Variables CSS consolidées (z-index, colors, spacing, animations)
- ✅ `base/reset.css` - Reset CSS global
- ✅ `utils/overlays.css` - Patterns overlay/menu réutilisables

**Aucun changement au code existant** - Nouveau système fonctionne en parallèle.

---

### Phase 2: MIGRER LES OVERLAYS & MENUS (EN COURS)

#### A. Migrer le menu mobile carte (MobileMapMenu)

**Ancien code** (`mobile-map-menu.css`):
```css
.mobile-map-menu-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgb(0, 0, 0);
  z-index: 68;
}

.mobile-map-menu-container {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  width: 100vw;
  height: 100vh;
  background: linear-gradient(...);
  z-index: 69;
}
```

**Nouveau code** (utilisant `utils/overlays.css`):

1. **Importer** dans `MobileMapMenu.tsx`:
```tsx
// Supprimer:
// import './mobile-map-menu.css';

// Ajouter:
import '../../styles/utils/overlays.css';
import './mobile-map-menu-custom.css';  // Styles spécifiques seulement
```

2. **Modifier JSX**:
```tsx
// Ancien:
<div className="mobile-map-menu-overlay" onClick={onClose} />
<div className="mobile-map-menu-container">
  <div className="mobile-map-menu-header">...</div>
  <div className="mobile-map-menu-content">...</div>
</div>

// Nouveau:
<div className="overlay overlay--dark" onClick={onClose} />
<div className="menu menu--fullscreen is-open">
  <div className="menu__header">
    <div className="menu__header-content">
      <span>🗺️</span>
      <div>
        <h2 className="menu__title">Map Controls</h2>
        <p className="menu__subtitle">{currentZone.name}</p>
      </div>
    </div>
    <button className="menu__close" onClick={onClose}>✕</button>
  </div>
  <div className="menu__content">
    {/* Contenu zones/filtres */}
  </div>
</div>
```

3. **Créer** `mobile-map-menu-custom.css` (styles spécifiques seulement):
```css
/* Seulement les styles VRAIMENT spécifiques au menu carte */
.map-menu__zone-item {
  /* Styles spécifiques aux zones */
}

.map-menu__filters {
  /* Styles spécifiques aux filtres */
}
```

**Bénéfices**:
- ✅ Z-index standardisé (`var(--z-overlay)` au lieu de `68` hardcodé)
- ✅ Animations communes (plus de bugs opacity)
- ✅ Responsive automatique
- ✅ Cohérence avec autres menus

#### B. Vérifier que Header mobile menu utilise déjà les patterns

Le menu hamburger Header utilise `.mobile-menu-*-nightlife`. On peut le migrer vers les classes standardisées:

```tsx
// Header.tsx - Ancien:
<div className="mobile-menu-overlay-nightlife" onClick={...} />
<div className="mobile-menu-container-nightlife">...</div>

// Header.tsx - Nouveau:
<div className="overlay overlay--dark" onClick={...} />
<div className="menu menu--slide-right is-open">...</div>
```

---

### Phase 3: MIGRER COMPOSANTS CRITIQUES

#### A. Créer `components/buttons.css`

**Extraire de nightlife-theme.css** (lignes 822-909):

```css
/**
 * BUTTONS - Système de boutons réutilisables
 */

/* Base button */
.btn {
  min-height: var(--height-button);  /* 44px - WCAG */
  padding: var(--spacing-3) var(--spacing-6);
  font-size: var(--font-base);
  font-weight: var(--font-weight-semibold);
  border-radius: var(--border-radius-lg);
  border: 2px solid transparent;
  cursor: pointer;
  transition: all var(--duration-normal) var(--ease-in-out);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-2);
}

/* Primary button */
.btn--primary {
  background: var(--color-primary-button);
  border-color: var(--color-primary-button);
  color: var(--text-primary);
}

.btn--primary:hover {
  background: var(--color-primary);
  box-shadow: var(--shadow-glow-primary);
  transform: translateY(-2px);
}

/* Secondary button */
.btn--secondary {
  background: var(--color-secondary-button);
  border-color: var(--color-secondary-button);
  color: var(--text-primary);
}

.btn--secondary:hover {
  background: var(--color-secondary);
  box-shadow: var(--shadow-glow-secondary);
}

/* Etc... */
```

**Migration**:

```tsx
// Ancien:
<button className="btn-primary-nightlife">Click</button>

// Nouveau:
<button className="btn btn--primary">Click</button>
```

#### B. Créer `components/modals.css`

Extraire les styles modaux de nightlife-theme.css.

---

### Phase 4: NETTOYER L'ANCIEN CODE

**Après migration complète**:

1. **Supprimer fichiers obsolètes**:
   - `nightlife-theme.css` (remplacé par modules)
   - `theme-variables.css` (remplacé par design-system.css)
   - `theme-overrides.css` (intégré dans themes/)

2. **Supprimer backups**:
   - `nightlife-theme-backup.css`
   - `nightlife-theme-backup-20250927-121311.css`

3. **Mettre à jour App.tsx**:
```tsx
// Ancien:
import './styles/theme-variables.css';
import './App.css';
import './styles/nightlife-theme.css';
import './styles/theme-overrides.css';

// Nouveau:
import './styles/design-system.css';     // Variables
import './styles/base/reset.css';        // Reset
import './styles/utils/overlays.css';    // Patterns
import './styles/components/buttons.css'; // Boutons
import './styles/layout/header.css';     // Header
import './styles/themes/dark.css';       // Dark mode overrides
```

---

## 📋 CHECKLIST MIGRATION PAR COMPOSANT

Pour chaque composant à migrer:

- [ ] Identifier les classes CSS utilisées
- [ ] Chercher si pattern existe dans `utils/` ou `components/`
- [ ] Si oui: remplacer par classes standardisées
- [ ] Si non: extraire vers nouveau module CSS
- [ ] Remplacer valeurs hardcodées par variables (`var(--*)`)
- [ ] Remplacer z-index par variables (`var(--z-*)`)
- [ ] Tester en dark mode
- [ ] Tester en light mode
- [ ] Tester responsive (mobile, tablet, desktop)
- [ ] Vérifier accessibilité (focus, touch targets 44px)

---

## 🔧 UTILITAIRES DE MIGRATION

### Script grep pour trouver les classes à migrer:

```bash
# Trouver toutes les classes -nightlife
grep -r "className.*-nightlife" src/components/

# Trouver z-index hardcodés
grep -r "z-index:\s*[0-9]" src/

# Trouver rgba() hardcodés
grep -r "rgba\(" src/styles/
```

### Rechercher et remplacer patterns communs:

```bash
# Remplacer classes overlay
mobile-menu-overlay-nightlife  →  overlay overlay--dark
mobile-map-menu-overlay        →  overlay overlay--dark

# Remplacer classes container
mobile-menu-container-nightlife  →  menu menu--slide-right
mobile-map-menu-container        →  menu menu--fullscreen

# Remplacer z-index
z-index: 68  →  z-index: var(--z-map-menu)
z-index: 66  →  z-index: var(--z-menu-header)
```

---

## ⚡ QUICK WINS - Migrations rapides

### 1. Overlays & Menus (1h)

Migrer tous les overlays/menus vers `utils/overlays.css`:
- ✅ `MobileMapMenu.tsx`
- ✅ `Header.tsx` (menu hamburger)
- Modals (si existants)

**Impact**: Corrige bugs opacity, standardise z-index, améliore cohérence

### 2. Variables CSS (30min)

Remplacer imports:
```tsx
// Dans tous les fichiers TS/TSX
import './styles/theme-variables.css';  // SUPPRIMER
import './styles/design-system.css';    // AJOUTER en premier
```

**Impact**: Centralise variables, simplifie maintenance

### 3. Z-index (30min)

Remplacer tous z-index hardcodés par variables:
```css
/* Avant */
z-index: 68;

/* Après */
z-index: var(--z-map-menu);
```

**Impact**: Élimine conflits z-index

---

## 🎨 NOUVEAUX PATTERNS DISPONIBLES

### Overlay Variants

```tsx
<div className="overlay overlay--dark" />      {/* Standard */}
<div className="overlay overlay--light" />     {/* Subtle */}
<div className="overlay overlay--blur" />      {/* Blurred */}
<div className="overlay overlay--transparent" /> {/* No bg, only blur */}
```

### Menu Variants

```tsx
{/* Slide from right (Header style) */}
<div className="menu menu--slide-right is-open">...</div>

{/* Slide from left */}
<div className="menu menu--slide-left is-open">...</div>

{/* Slide from bottom (mobile sheet) */}
<div className="menu menu--slide-up is-open">...</div>

{/* Fullscreen (Map controls style) */}
<div className="menu menu--fullscreen is-open">...</div>
```

### Menu Structure

```tsx
<div className="menu menu--fullscreen is-open">
  {/* Header */}
  <div className="menu__header">
    <div className="menu__header-content">
      <span>🗺️</span>
      <div>
        <h2 className="menu__title">Title</h2>
        <p className="menu__subtitle">Subtitle</p>
      </div>
    </div>
    <button className="menu__close">✕</button>
  </div>

  {/* Content */}
  <div className="menu__content">
    {/* Contenu scrollable */}
  </div>

  {/* Footer (optional) */}
  <div className="menu__footer">
    <p>Footer content</p>
  </div>
</div>
```

---

## 📊 PROGRESS TRACKING

### Modules créés:
- ✅ `design-system.css` (500 lignes)
- ✅ `base/reset.css` (200 lignes)
- ✅ `utils/overlays.css` (400 lignes)
- ⏳ `components/buttons.css` (À créer)
- ⏳ `components/forms.css` (À créer)
- ⏳ `layout/header.css` (À créer)
- ⏳ `features/maps.css` (À créer)

### Composants migrés:
- ⏳ `MobileMapMenu.tsx` (Priorité #1)
- ⏳ `Header.tsx` mobile menu
- ⏳ Modals globaux
- ⏳ Boutons
- ⏳ Forms

### Anciennes lignes supprimées:
- 0 / 9,145 lignes de `nightlife-theme.css`
- Target: Réduire de 50% (4,500 lignes) en 2 semaines

---

## ❓ FAQ

### Q: Dois-je migrer tout d'un coup?
**R**: Non ! Migration progressive. Nouveau système fonctionne en parallèle de l'ancien.

### Q: Que faire si un pattern n'existe pas?
**R**: Créer nouveau module dans `components/` ou `utils/`. Documenter dans ce guide.

### Q: Comment tester la migration?
**R**:
1. Vérifier visuellement (dark/light mode)
2. Tester responsive (mobile/tablet/desktop)
3. Tester accessibilité (keyboard navigation, screen reader)
4. Vérifier DevTools (pas d'erreurs console, styles appliqués)

### Q: Quand supprimer nightlife-theme.css?
**R**: Quand 100% des composants sont migrés ET testés. Garder backup jusqu'à prod stable.

---

## 🔗 RESSOURCES

- [Audit CSS](./AUDIT_CSS_ARCHITECTURE.md) - Analyse complète de l'ancien système
- [Design System](../src/styles/design-system.css) - Variables de référence
- [Overlays Patterns](../src/styles/utils/overlays.css) - Patterns réutilisables

---

**Dernière mise à jour**: 2025-10-08
**Prochaine étape**: Migrer `MobileMapMenu.tsx` vers nouveaux patterns
