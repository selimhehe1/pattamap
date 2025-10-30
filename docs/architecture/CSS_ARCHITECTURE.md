# Architecture CSS - PattaMap

**Version**: 2.1.0
**Dernière mise à jour**: 2025-01-08
**Auteur**: Équipe Dev

---

## 📋 Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Structure des Fichiers](#structure-des-fichiers)
3. [Import Order (CRITIQUE)](#import-order-critique)
4. [Design System](#design-system)
5. [Naming Conventions](#naming-conventions)
6. [Component Patterns](#component-patterns)
7. [Dark/Light Mode](#darklight-mode)
8. [Migration Legacy](#migration-legacy)
9. [Best Practices](#best-practices)

---

## 🎯 Vue d'ensemble

L'architecture CSS de PattaMap est basée sur un **Design System centralisé** utilisant des variables CSS natives. Le système supporte le **Dark/Light Mode** et suit les principes **Mobile First** avec une approche **BEM** pour le nommage des classes.

### Principes Fondamentaux

- ✅ **Single Source of Truth**: Toutes les variables dans `design-system.css`
- ✅ **Mobile First**: Design responsive partant du mobile
- ✅ **BEM Naming**: Block__Element--Modifier
- ✅ **Component-Based**: Styles organisés par composant
- ✅ **Accessibility First**: WCAG 2.1 Level AAA compliance

---

## 📁 Structure des Fichiers

```
src/
├── index.css                      # Reset React CRA
├── App.css                        # Styles App globaux
├── styles/
│   ├── design-system.css         # ⭐ FICHIER MAÎTRE - Variables CSS
│   ├── nightlife-theme.css       # 🔶 Legacy theme (migration en cours)
│   ├── theme-overrides.css       # Overrides Dark/Light
│   ├── base/
│   │   └── reset.css             # Reset CSS global
│   ├── components/
│   │   ├── buttons.css           # Système de boutons
│   │   ├── forms.css             # Formulaires & inputs
│   │   └── modals.css            # Modales & dialogues
│   ├── layout/
│   │   ├── header.css            # Header fixe
│   │   └── page.css              # Layout pages
│   └── utils/
│       └── overlays.css          # Patterns overlay/menu
└── components/
    └── [Component]/
        └── Component.css          # Styles spécifiques composant
```

---

## 🔴 Import Order (CRITIQUE)

**⚠️ L'ORDRE D'IMPORT EST CRITIQUE - NE PAS MODIFIER**

### Dans App.tsx

```tsx
/**
 * CSS IMPORT ORDER - DO NOT CHANGE
 */
import './styles/design-system.css';   // 1️⃣ Variables (z-index, colors, etc.)
import './App.css';                     // 2️⃣ App styles
import './styles/nightlife-theme.css'; // 3️⃣ Legacy theme
import './styles/theme-overrides.css'; // 4️⃣ Overrides Dark/Light
```

### Pourquoi cet ordre?

1. **design-system.css** d'abord → Définit toutes les variables CSS utilisées partout
2. **App.css** ensuite → Utilise les variables du design system
3. **nightlife-theme.css** → Ancien système (legacy) qui override certains styles
4. **theme-overrides.css** → Overrides finaux pour compatibilité thème

**❌ ERREUR COMMUNE**: Importer nightlife-theme.css avant design-system.css → Variables undefined

---

## 🎨 Design System

Le fichier `design-system.css` est le **fichier maître** contenant TOUTES les variables CSS.

### Sections du Design System

```css
/* 1. Z-index Layers */
--z-header: 65;
--z-modal: 100;
--z-tooltip: 200;

/* 2. Colors (Dark/Light Mode) */
--color-primary: #FF1B8D;
--color-secondary: #0088AA;
--bg-primary: #0a0a2e;
--text-primary: #ffffff;

/* 3. Spacing & Sizing (4px grid) */
--spacing-1: 0.25rem;  /* 4px */
--spacing-4: 1rem;     /* 16px */

/* 4. Typography */
--font-base: 1rem;
--font-xl: 1.25rem;

/* 5. Breakpoints */
--breakpoint-md: 48rem;  /* 768px */

/* 6. Animations */
--duration-normal: 0.3s;
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);

/* 7. Shadows & Effects */
--shadow-lg: 0 10px 30px rgba(0, 0, 0, 0.5);
--gradient-primary: linear-gradient(45deg, #FF1B8D, #FFD700);

/* 8. Accessibility */
--focus-ring: 0 0 0 3px rgba(255, 27, 141, 0.5);

/* 9. Theme Transition */
/* Gestion du switch Dark/Light */

/* 10. Utility Variables */
--aspect-video: 16 / 9;

/* 11. Legacy Compatibility */
--nightlife-primary: var(--color-primary);
```

### Usage des Variables

```css
/* ✅ CORRECT */
.my-button {
  background: var(--color-primary);
  padding: var(--spacing-4);
  border-radius: var(--border-radius-lg);
}

/* ❌ INCORRECT - Hardcoded values */
.my-button {
  background: #FF1B8D;
  padding: 16px;
  border-radius: 12px;
}
```

---

## 🏷️ Naming Conventions

### BEM (Block Element Modifier)

```css
/* Block */
.btn { }

/* Element */
.btn__icon { }
.btn__text { }

/* Modifier */
.btn--primary { }
.btn--large { }
.btn--disabled { }

/* Combined */
.btn--primary.btn--large { }
```

### Exemples Pratiques

```tsx
// Bouton primaire large avec icône
<button className="btn btn--primary btn--large">
  <span className="btn__icon">🚀</span>
  <span className="btn__text">Launch</span>
</button>

// Modal avec header
<div className="modal modal--lg">
  <div className="modal__header">
    <h2 className="modal__title">Title</h2>
    <button className="modal__close">✕</button>
  </div>
  <div className="modal__body">Content</div>
</div>
```

### Classes Legacy (à éviter)

```css
/* ❌ Ancien système - À MIGRER */
.btn-nightlife-base
.btn-primary-nightlife
.input-nightlife

/* ✅ Nouveau système - À UTILISER */
.btn
.btn--primary
.form-control
```

---

## 🧩 Component Patterns

### 1. Boutons

**Fichier**: `src/styles/components/buttons.css`

```tsx
// Base button
<button className="btn">Click</button>

// Variants
<button className="btn btn--primary">Primary</button>
<button className="btn btn--secondary">Secondary</button>
<button className="btn btn--success">Save</button>
<button className="btn btn--danger">Delete</button>

// Sizes
<button className="btn btn--sm">Small</button>
<button className="btn btn--lg">Large</button>

// Shapes
<button className="btn btn--pill">Pill</button>
<button className="btn btn--circle">○</button>

// States
<button className="btn btn--loading">Loading...</button>
<button className="btn" disabled>Disabled</button>
```

### 2. Formulaires

**Fichier**: `src/styles/components/forms.css`

```tsx
<div className="form-group">
  <label className="form-label form-label--required">Email</label>
  <input type="email" className="form-control" />
  <span className="form-error">Error message</span>
</div>

// Variants
<input className="form-control form-control--success" />
<input className="form-control form-control--error" />
<select className="form-control">...</select>
<textarea className="form-control">...</textarea>
```

### 3. Modales

**Fichier**: `src/styles/components/modals.css`

```tsx
<div className="modal-overlay modal-overlay--active">
  <div className="modal modal--md">
    <div className="modal__header">
      <h2 className="modal__title">Title</h2>
      <button className="modal__close">✕</button>
    </div>
    <div className="modal__body">Content</div>
    <div className="modal__footer">
      <button className="btn btn--secondary">Cancel</button>
      <button className="btn btn--primary">Confirm</button>
    </div>
  </div>
</div>
```

---

## 🌓 Dark/Light Mode

### Comment ça marche?

Le système utilise l'attribut `data-theme` sur `<html>`:

```html
<!-- Dark Mode (default) -->
<html data-theme="dark">

<!-- Light Mode -->
<html data-theme="light">
```

### Définition des Couleurs

```css
/* Dark Mode */
:root,
:root[data-theme="dark"] {
  --color-primary: #FF1B8D;
  --bg-primary: #0a0a2e;
  --text-primary: #ffffff;
}

/* Light Mode */
:root[data-theme="light"] {
  --color-primary: #D91875;
  --bg-primary: #ffffff;
  --text-primary: #0a0a2e;
}
```

### Transition Automatique

Le système gère automatiquement les transitions lors du switch:

```css
html.theme-transitioning * {
  transition: background-color 0.3s ease,
              color 0.3s ease;
}
```

---

## 🔄 Migration Legacy

### Variables Legacy

Ces variables sont **dépréciées** mais maintenues pour compatibilité:

```css
/* 🔶 Legacy - À REMPLACER */
--nightlife-primary
--nightlife-secondary
--bg-dark-primary

/* ✅ Moderne - À UTILISER */
--color-primary
--color-secondary
--bg-surface
```

### Mapping Legacy → Moderne

| Ancien | Nouveau | Status |
|--------|---------|--------|
| `.btn-nightlife-base` | `.btn` | ✅ Prêt |
| `.btn-primary-nightlife` | `.btn .btn--primary` | ✅ Prêt |
| `.input-nightlife` | `.form-control` | ✅ Prêt |
| `.modal-overlay-nightlife` | `.modal-overlay` | ✅ Prêt |

**Voir**: `docs/migrations/LEGACY_TO_MODERN_MAPPING.md` (sera créé en Phase 2)

---

## ✅ Best Practices

### 1. Toujours Utiliser les Variables

```css
/* ✅ GOOD */
.my-class {
  color: var(--color-primary);
  margin: var(--spacing-4);
}

/* ❌ BAD */
.my-class {
  color: #FF1B8D;
  margin: 16px;
}
```

### 2. Mobile First

```css
/* ✅ GOOD - Mobile first */
.container {
  padding: var(--spacing-4);  /* Mobile */
}

@media (min-width: 48rem) {
  .container {
    padding: var(--spacing-8);  /* Tablet+ */
  }
}

/* ❌ BAD - Desktop first */
.container {
  padding: var(--spacing-8);
}

@media (max-width: 48rem) {
  .container {
    padding: var(--spacing-4);
  }
}
```

### 3. Accessibility

```css
/* Touch targets WCAG 2.1 Level AAA */
.btn {
  min-height: var(--tap-target-min);  /* 44px */
  min-width: var(--tap-target-min);
}

/* Focus visible */
.btn:focus-visible {
  outline: 2px solid var(--border-focus);
  outline-offset: var(--focus-ring-offset);
}
```

### 4. Component Scoping

```css
/* ✅ GOOD - Scoped to component */
.user-card { }
.user-card__avatar { }
.user-card__name { }

/* ❌ BAD - Too generic */
.card { }
.avatar { }
.name { }
```

### 5. Avoid !important

```css
/* ✅ GOOD - Proper specificity */
.modal__close:hover {
  background: var(--bg-hover);
}

/* ❌ BAD - Using !important */
.modal__close {
  background: red !important;
}
```

---

## 📚 Ressources Additionnelles

### Documentation

- **Migrations**: `docs/migrations/`
- **Changelog CSS**: `docs/CHANGELOG_CSS.md` (sera créé)
- **Component READMEs**: `src/styles/components/README.md` (sera créé)

### Outils

- **PurgeCSS**: Remove unused CSS
- **PostCSS**: CSS processing
- **Autoprefixer**: Browser compatibility

---

## 🏁 Conclusion

Cette architecture CSS est conçue pour être:

- ✅ **Maintenable** - Structure claire et documentée
- ✅ **Scalable** - Facile d'ajouter de nouveaux composants
- ✅ **Performante** - Variables CSS natives, pas de préprocesseur
- ✅ **Accessible** - WCAG 2.1 Level AAA compliance
- ✅ **Moderne** - Dark/Light mode, responsive, mobile first

**Questions?** Consultez `docs/migrations/` ou l'équipe dev.

---

**Dernière révision**: 2025-01-08 | **Version**: 2.1.0
