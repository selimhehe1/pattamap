# 🎨 Architecture CSS - PATTAMAP

**Version**: 2.0.0
**Date**: 2025-10-08

---

## 📂 STRUCTURE

```
styles/
├── design-system.css          ← ⭐ Variables centralisées (IMPORTER EN PREMIER)
│
├── base/
│   └── reset.css             ← Reset CSS global
│
├── components/
│   ├── buttons.css           ← Système de boutons
│   ├── forms.css             ← Inputs, selects, etc.
│   ├── modals.css            ← Modals génériques
│   └── cards.css             ← Cards
│
├── layout/
│   ├── header.css            ← Header & navigation
│   ├── footer.css            ← Footer
│   └── page.css              ← Page containers
│
├── features/
│   ├── maps.css              ← Map components
│   ├── admin.css             ← Admin dashboard
│   └── profiles.css          ← User profiles
│
├── themes/
│   ├── dark.css              ← Dark mode overrides
│   └── light.css             ← Light mode overrides
│
├── utils/
│   └── overlays.css          ← ⭐ Patterns overlay/menu réutilisables
│
└── [LEGACY]
    ├── nightlife-theme.css   ← À déprécier (9,145 lignes)
    ├── theme-variables.css   ← Remplacé par design-system.css
    └── theme-overrides.css   ← Remplacé par themes/
```

---

## 🚀 ORDRE D'IMPORT (CRITIQUE)

Dans `App.tsx`, **respecter cet ordre**:

```tsx
// 1. DESIGN SYSTEM (variables) - TOUJOURS EN PREMIER
import './styles/design-system.css';

// 2. BASE (reset, typography)
import './styles/base/reset.css';

// 3. UTILS (patterns réutilisables)
import './styles/utils/overlays.css';

// 4. LAYOUT
import './styles/layout/header.css';
import './styles/layout/page.css';

// 5. COMPONENTS
import './styles/components/buttons.css';
import './styles/components/forms.css';
import './styles/components/modals.css';

// 6. FEATURES (spécifiques)
import './styles/features/maps.css';
import './styles/features/admin.css';

// 7. THEMES (overrides dark/light)
import './styles/themes/dark.css';
```

---

## 💡 QUICK START

### 1. Utiliser les variables CSS

```css
/* ✅ CORRECT - Utilise les variables */
.my-component {
  color: var(--color-primary);
  background: var(--bg-primary);
  padding: var(--spacing-4);
  z-index: var(--z-modal);
  border-radius: var(--border-radius-lg);
}

/* ❌ INCORRECT - Valeurs hardcodées */
.my-component {
  color: #C19A6B;
  background: #0a0a2e;
  padding: 16px;
  z-index: 100;
  border-radius: 12px;
}
```

### 2. Utiliser les patterns overlay/menu

```tsx
// Overlay
<div className="overlay overlay--dark" onClick={onClose} />

// Menu fullscreen
<div className="menu menu--fullscreen is-open">
  <div className="menu__header">
    <div className="menu__header-content">
      <h2 className="menu__title">Title</h2>
    </div>
    <button className="menu__close">✕</button>
  </div>
  <div className="menu__content">
    {/* Content */}
  </div>
</div>
```

### 3. Utiliser les utilitaires

```css
/* Spacing */
padding: var(--spacing-4);     /* 16px */
margin: var(--spacing-8);      /* 32px */
gap: var(--spacing-2);         /* 8px */

/* Colors */
color: var(--text-primary);
background: var(--bg-secondary);
border-color: var(--border-primary);

/* Typography */
font-size: var(--font-lg);     /* 18px */
font-weight: var(--font-weight-bold);
line-height: var(--line-height-normal);

/* Shadows */
box-shadow: var(--shadow-lg);
box-shadow: var(--shadow-glow-primary);

/* Z-index */
z-index: var(--z-header);      /* 65 */
z-index: var(--z-modal);       /* 100 */
z-index: var(--z-overlay);     /* 70 */
```

---

## 📚 DOCUMENTATION

- [Guide de Migration](../../docs/CSS_MIGRATION_GUIDE.md) - Comment migrer l'ancien code
- [Audit CSS](../../docs/AUDIT_CSS_ARCHITECTURE.md) - Analyse de l'ancien système

---

## 🔑 VARIABLES CLÉS

### Z-index Layers
```css
--z-base: 0
--z-header: 65
--z-menu-header: 66      /* Menu hamburger Header */
--z-menu-map: 68         /* Menu mobile carte */
--z-overlay: 70
--z-modal: 100
--z-tooltip: 200
```

### Colors
```css
--color-primary: #C19A6B         /* Pink */
--color-secondary: #0088AA       /* Cyan */
--color-accent: #FFD700          /* Gold */
--color-success: #00CC55
--color-warning: #FFA500
--color-error: #FF4757
```

### Spacing (4px grid)
```css
--spacing-1: 0.25rem   (4px)
--spacing-2: 0.5rem    (8px)
--spacing-3: 0.75rem   (12px)
--spacing-4: 1rem      (16px)
--spacing-6: 1.5rem    (24px)
--spacing-8: 2rem      (32px)
```

### Breakpoints
```css
--breakpoint-sm: 30rem    (480px)
--breakpoint-md: 48rem    (768px)
--breakpoint-lg: 64rem    (1024px)
```

---

## 🎯 BONNES PRATIQUES

### ✅ DO

- Utiliser variables CSS pour couleurs, spacing, z-index
- Utiliser patterns réutilisables (`overlay`, `menu`, etc.)
- Respecter l'ordre d'import des CSS
- Documenter les nouveaux composants
- Tester dark & light mode

### ❌ DON'T

- Hardcoder couleurs ou z-index
- Dupliquer patterns (overlay, menu, etc.)
- Créer nouveaux fichiers sans consulter cette structure
- Importer CSS dans le mauvais ordre
- Utiliser `!important` (sauf nécessité absolue)

---

## 🔄 MIGRATION STATUS

### ✅ **PHASE 1 & 2 COMPLÉTÉES** (5,200+ lignes)

#### Design System & Base
- ✅ **design-system.css** - Variables centralisées (410 lignes)
- ✅ **base/reset.css** - Reset global (215 lignes)
- ✅ **utils/overlays.css** - Patterns overlay/menu réutilisables (386 lignes)

#### Components (1,650 lignes)
- ✅ **components/buttons.css** - Système de boutons complet (550 lignes)
- ✅ **components/forms.css** - Forms, inputs, validation (600 lignes)
- ✅ **components/modals.css** - Modales et dialogues (500 lignes)

#### Layout (1,050 lignes)
- ✅ **layout/header.css** - Header fixe + navigation + mobile menu (650 lignes)
- ✅ **layout/page.css** - Containers, grids, responsive (400 lignes)

#### Features
- ⏳ **features/maps.css** - À créer
- ⏳ **features/admin.css** - À créer
- ⏳ **features/profiles.css** - À créer

#### Migrations
- ✅ **MobileMapMenu.tsx** - Migré vers nouveaux patterns
- ⏳ Header mobile menu - À migrer
- ⏳ Autres composants - À migrer

---

**Progress**: **5,200+ lignes créées** / 9,145 anciennes lignes à migrer (**~57%**)

**Lignes économisées** : ~300 lignes de duplication éliminée

---

## 📞 SUPPORT

Questions? Consulter:
1. [Guide de Migration](../../docs/CSS_MIGRATION_GUIDE.md)
2. [Audit CSS](../../docs/AUDIT_CSS_ARCHITECTURE.md)
3. Commentaires inline dans les fichiers CSS

---

**Maintenu par**: Équipe Dev PattaMap
**Dernière mise à jour**: 2025-10-08
