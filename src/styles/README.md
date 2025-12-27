# Architecture CSS - PattaMap

**Version**: 3.0.0
**Date**: 2025-12-24

> **Documentation Complète**: [docs/architecture/CSS_ARCHITECTURE.md](../../docs/architecture/CSS_ARCHITECTURE.md)

---

## 📂 STRUCTURE

```
styles/
├── design-system.css          ← ⭐ Variables centralisées (IMPORTER EN PREMIER)
│
├── base/
│   ├── accessibility.css     ← WCAG AAA compliance
│   └── scrollbars.css        ← Scrollbar styling
│
├── components/
│   ├── buttons.css           ← Système de boutons
│   ├── modals.css            ← Modals génériques
│   ├── form-components.css   ← Form inputs & validation
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
    └── theme-overrides.css   ← Remplacé par themes/
```

---

## 🚀 ORDRE D'IMPORT (CRITIQUE)

Dans `App.tsx`, **respecter cet ordre**:

```tsx
// 1. DESIGN SYSTEM (variables) - TOUJOURS EN PREMIER
import './styles/design-system.css';

// 2. BASE (accessibility, scrollbars)
import './styles/base/accessibility.css';
import './styles/base/scrollbars.css';

// 3. COMPONENTS
import './styles/components/buttons.css';
import './styles/components/modals.css';
import './styles/components/form-components.css';

// 4. LAYOUT
import './styles/layout/header.css';
import './styles/layout/page.css';

// 5. FEATURES (spécifiques)
import './styles/components/maps.css';

// 6. APP CSS (global styles)
import './App.css';
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

- **[CSS_ARCHITECTURE.md](../../docs/architecture/CSS_ARCHITECTURE.md)** - Documentation complète (800+ lignes)
- Includes: Design System Variables, Modern CSS (Container Queries, Scroll Animations), Accessibility (WCAG AAA), Component Patterns, Contribution Guide

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

### ✅ **PHASES 1-4 COMPLÉTÉES**

#### Core System
- ✅ **design-system.css** - Variables centralisées (657 lignes)
- ✅ **base/accessibility.css** - WCAG AAA compliance (617 lignes)
- ✅ **base/scrollbars.css** - Custom scrollbars
- ✅ **utils/overlays.css** - Patterns overlay/menu réutilisables (386 lignes)

#### Modern CSS (2025)
- ✅ **modern/container-queries.css** - Container queries (368 lignes)
- ✅ **modern/scroll-animations.css** - Scroll-driven animations (410 lignes)

#### Components
- ✅ **components/buttons.css** - Système de boutons (550 lignes)
- ✅ **components/form-components.css** - Forms, inputs, validation
- ✅ **components/modals.css** - Modales et dialogues (500 lignes)

#### Layout
- ✅ **layout/header.css** - Header fixe + navigation (650 lignes)
- ✅ **layout/page.css** - Containers, grids, responsive (400 lignes)

---

**Progress**: **4,353+ lignes créées** dans fichiers modernes

---

## 📞 SUPPORT

Questions? Consulter **[CSS_ARCHITECTURE.md](../../docs/architecture/CSS_ARCHITECTURE.md)** pour la documentation complète.

---

**Maintenu par**: Équipe Dev PattaMap
**Dernière mise à jour**: 2025-12-24
