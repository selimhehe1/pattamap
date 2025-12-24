# Architecture CSS - PattaMap

**Version**: 3.0.0
**Dernière mise à jour**: 2025-12-24
**Auteur**: Équipe Dev

---

## Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Structure des Fichiers](#structure-des-fichiers)
3. [Import Order (CRITIQUE)](#import-order-critique)
4. [Design System Variables](#design-system-variables)
5. [Modern CSS Features (2025)](#modern-css-features-2025)
6. [Component Patterns](#component-patterns)
7. [Dark/Light Mode](#darklight-mode)
8. [Accessibility Guidelines](#accessibility-guidelines)
9. [CSS Contribution Guide](#css-contribution-guide)
10. [Migration Legacy](#migration-legacy)

---

## Vue d'ensemble

L'architecture CSS de PattaMap est basée sur un **Design System centralisé** utilisant des variables CSS natives. Le système supporte le **Dark/Light Mode** et suit les principes **Mobile First** avec une approche **BEM** pour le nommage des classes.

### Principes Fondamentaux

- **Single Source of Truth**: Toutes les variables dans `design-system.css`
- **Mobile First**: Design responsive partant du mobile
- **BEM Naming**: Block__Element--Modifier
- **Component-Based**: Styles organisés par composant
- **Accessibility First**: WCAG 2.1 Level AAA compliance
- **Modern CSS (2025)**: Container Queries, Scroll Animations, View Transitions

---

## Structure des Fichiers

```
src/styles/
├── design-system.css           # Variables CSS (FICHIER MAITRE - 657 lignes)
├── nightlife-theme.css         # Legacy theme (migration en cours)
├── theme-overrides.css         # Overrides Dark/Light
│
├── base/
│   ├── reset.css               # Reset CSS global
│   └── accessibility.css       # WCAG AAA compliance (617 lignes)
│
├── components/
│   ├── buttons.css             # Système de boutons
│   ├── forms.css               # Formulaires & inputs
│   ├── modals.css              # Modales & dialogues
│   ├── dialog-modals.css       # Confirm/Prompt modals
│   ├── employee-card.css       # Employee cards
│   └── ...
│
├── layout/
│   ├── header.css              # Header fixe
│   └── page.css                # Layout pages
│
├── modern/                     # CSS 2025 Features
│   ├── container-queries.css   # Container queries (368 lignes)
│   └── scroll-animations.css   # Scroll-driven animations (410 lignes)
│
└── utils/
    └── overlays.css            # Patterns overlay/menu
```

---

## Import Order (CRITIQUE)

**L'ORDRE D'IMPORT EST CRITIQUE - NE PAS MODIFIER**

### Dans App.tsx

```tsx
/**
 * CSS IMPORT ORDER - DO NOT CHANGE
 */
import './styles/design-system.css';   // 1. Variables (z-index, colors, etc.)
import './App.css';                     // 2. App styles
import './styles/nightlife-theme.css'; // 3. Legacy theme
import './styles/theme-overrides.css'; // 4. Overrides Dark/Light
import './styles/base/accessibility.css'; // 5. Accessibility
import './styles/modern/container-queries.css'; // 6. Container queries
import './styles/modern/scroll-animations.css'; // 7. Scroll animations
```

### Pourquoi cet ordre?

1. **design-system.css** d'abord : Définit toutes les variables CSS
2. **App.css** : Utilise les variables du design system
3. **nightlife-theme.css** : Ancien système (legacy)
4. **theme-overrides.css** : Overrides finaux pour compatibilité thème
5. **accessibility.css** : WCAG AAA styles
6. **Modern CSS** : Container queries et scroll animations

---

## Design System Variables

Le fichier `design-system.css` contient **100+ variables CSS** organisées en 11 sections.

### 1. Z-Index Layers (Système hiérarchique)

```css
:root {
  /* Base layers (0-50) */
  --z-base: 0;
  --z-dropdown: 10;
  --z-sticky: 20;
  --z-floating: 30;

  /* Navigation layers (50-70) */
  --z-header: 65;
  --z-menu-header: 66;      /* Menu hamburger Header */
  --z-menu-map: 68;          /* Menu mobile carte (zones/filtres) */

  /* Overlay layers (70-100) */
  --z-overlay: 70;
  --z-sidebar: 80;
  --z-modal: 100;
  --z-modal-overlay: 99;

  /* Top layers (100+) */
  --z-tooltip: 200;
  --z-notification: 300;
  --z-debug: 9999;
}
```

**Usage:**
```css
/* Correct */
.my-modal { z-index: var(--z-modal); }

/* Incorrect - hardcoded */
.my-modal { z-index: 9999; }
```

### 2. Colors (Dark/Light Mode)

#### Dark Mode (Default)

```css
:root, :root[data-theme="dark"] {
  /* Brand Colors - Luxe Sophistiqué 2025 */
  --color-primary: #C19A6B;           /* Or rose champagne */
  --color-primary-button: #A67C52;    /* Or foncé (WCAG AA) */
  --color-secondary: #2C3E50;         /* Bleu marine élégant */
  --color-accent: #FF6B9D;            /* Rose vif */

  /* Semantic Colors */
  --color-success: #10B981;           /* Émeraude */
  --color-warning: #F59E0B;           /* Ambre */
  --color-error: #EF4444;             /* Rouge */
  --color-info: #3B82F6;              /* Bleu info */

  /* Backgrounds */
  --bg-primary: #1a1a2e;              /* Noir-bleu marine */
  --bg-secondary: #2d2d3d;            /* Gris anthracite */
  --bg-surface: #16213e;              /* Bleu marine très foncé */
  --bg-overlay: rgba(0, 0, 0, 0.6);   /* Modal overlay */

  /* Text Colors */
  --text-primary: #f5f5f5;            /* Blanc cassé */
  --text-secondary: #d0d0d0;          /* Gris clair */
  --text-muted: rgba(255, 255, 255, 0.7);

  /* Zone Colors (Maps) */
  --zone-soi6: rgba(193, 154, 107, 0.9);
  --zone-walkingstreet: rgba(255, 107, 157, 0.9);
  --zone-boyztown: rgba(16, 185, 129, 0.9);
  /* ... 9 zones total */
}
```

#### Light Mode (Dusk Twilight)

```css
body[data-theme="light"] {
  /* Brand Colors - Pastel */
  --color-primary: #A78BFA;           /* Violet pastel */
  --color-secondary: #93C5FD;         /* Bleu ciel pastel */
  --color-accent: #FDA4AF;            /* Rose pastel */

  /* Backgrounds - Lavande */
  --bg-primary: #E8E4F3;              /* Lavande très pâle */
  --bg-secondary: #D6D1E8;            /* Violet pastel clair */
  --bg-surface: #F5F3FA;              /* Lilas très pâle */

  /* Text Colors - Indigo */
  --text-primary: #1E1B4B;            /* Indigo très foncé */
  --text-secondary: #4C1D95;          /* Violet foncé */
}
```

### 3. Spacing & Sizing (4px Grid System)

```css
:root {
  --spacing-unit: 0.25rem;      /* 4px base */

  --spacing-0: 0;
  --spacing-1: 0.25rem;         /* 4px */
  --spacing-2: 0.5rem;          /* 8px */
  --spacing-3: 0.75rem;         /* 12px */
  --spacing-4: 1rem;            /* 16px */
  --spacing-5: 1.25rem;         /* 20px */
  --spacing-6: 1.5rem;          /* 24px */
  --spacing-8: 2rem;            /* 32px */
  --spacing-10: 2.5rem;         /* 40px */
  --spacing-12: 3rem;           /* 48px */
  --spacing-16: 4rem;           /* 64px */

  /* Component sizing - WCAG touch targets */
  --height-input: 2.75rem;      /* 44px */
  --height-button: 2.75rem;     /* 44px */
  --tap-target-min: 2.75rem;    /* 44px minimum */
}
```

### 4. Typography

```css
:root {
  /* Font families */
  --font-family-base: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-family-mono: 'Monaco', 'Consolas', monospace;

  /* Font sizes */
  --font-xs: 0.75rem;           /* 12px */
  --font-sm: 0.875rem;          /* 14px */
  --font-base: 1rem;            /* 16px */
  --font-lg: 1.125rem;          /* 18px */
  --font-xl: 1.25rem;           /* 20px */
  --font-2xl: 1.5rem;           /* 24px */
  --font-3xl: 1.875rem;         /* 30px */

  /* Font weights */
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;

  /* Line heights */
  --line-height-tight: 1.25;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.75;
}
```

### 5. Breakpoints (Mobile First)

```css
:root {
  --breakpoint-sm: 30rem;       /* 480px */
  --breakpoint-md: 48rem;       /* 768px */
  --breakpoint-lg: 64rem;       /* 1024px */
  --breakpoint-xl: 80rem;       /* 1280px */
  --breakpoint-2xl: 96rem;      /* 1536px */
}

/* Usage in media queries */
@media (min-width: 48rem) { /* Tablet+ */ }
@media (max-width: 47.9375rem) { /* Mobile only */ }
```

### 6. Animations

```css
:root {
  /* Durations */
  --duration-fast: 0.15s;
  --duration-normal: 0.3s;
  --duration-slow: 0.5s;

  /* Easing functions */
  --ease-linear: linear;
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
}
```

### 7. Shadows & Effects

```css
:root {
  /* Box shadows */
  --shadow-sm: 0 2px 5px rgba(0, 0, 0, 0.15);
  --shadow-md: 0 4px 15px rgba(0, 0, 0, 0.2);
  --shadow-lg: 0 10px 30px rgba(0, 0, 0, 0.25);
  --shadow-xl: 0 20px 50px rgba(0, 0, 0, 0.3);

  /* Glow effects */
  --shadow-glow-primary: 0 0 15px rgba(193, 154, 107, 0.4);
  --shadow-glow-success: 0 0 15px rgba(16, 185, 129, 0.3);
  --shadow-glow-error: 0 0 15px rgba(239, 68, 68, 0.3);

  /* Gradients */
  --gradient-primary: linear-gradient(45deg, #C19A6B, #FF6B9D);
  --gradient-main: linear-gradient(135deg, #0a0a1e, #1a1a2e, #0f2027);

  /* Glassmorphism */
  --glass-bg: rgba(255, 255, 255, 0.08);
  --glass-border: rgba(255, 255, 255, 0.18);
  --glass-blur: blur(20px) saturate(180%);
}
```

### 8. Border Radius

```css
:root {
  --border-radius-sm: 0.375rem;       /* 6px */
  --border-radius-md: 0.5rem;         /* 8px */
  --border-radius-lg: 0.75rem;        /* 12px */
  --border-radius-xl: 1rem;           /* 16px */
  --border-radius-2xl: 1.25rem;       /* 20px */
  --border-radius-full: 9999px;       /* Circle */
}
```

### 9. Focus & Accessibility

```css
:root {
  --focus-ring: 0 0 0 3px rgba(193, 154, 107, 0.5);
  --focus-ring-offset: 2px;
  --border-focus: #C19A6B;
}
```

### 10. Grid System

```css
:root {
  /* Grid Gaps */
  --grid-gap-desktop: 1.5rem;     /* 24px */
  --grid-gap-mobile: 1rem;        /* 16px */

  /* Grid Columns per breakpoint */
  --grid-cols-desktop-xl: 4;      /* >1400px */
  --grid-cols-desktop: 4;         /* 1200-1400px */
  --grid-cols-tablet: 3;          /* 768-992px */
  --grid-cols-mobile: 1;          /* <576px */
}
```

---

## Modern CSS Features (2025)

### Container Queries

Container queries allow components to adapt based on their container size, not viewport.

**File:** `src/styles/modern/container-queries.css`

**Browser Support (2025):** Chrome 105+, Firefox 110+, Safari 16+, Edge 105+

#### Container Definitions

```css
/* Define containers */
.employees-grid-view,
.establishments-grid-view {
  container-type: inline-size;
  container-name: card-grid;
}
```

#### Container Query Usage

```css
/* Adapt based on container width */
@container card-grid (min-width: 800px) {
  .cq-grid-auto {
    grid-template-columns: repeat(4, 1fr);
  }
}

@container card-grid (max-width: 399px) {
  .cq-grid-auto {
    grid-template-columns: 1fr;
  }
}
```

#### Available Container Query Classes

| Class | Description |
|-------|-------------|
| `.cq-gap-responsive` | Responsive gap (2-4 spacing units) |
| `.cq-padding-responsive` | Responsive padding |
| `.cq-grid-auto` | Auto-responsive grid columns |
| `.cq-hide-small` | Hide in small containers |
| `.cq-show-small` | Show only in small containers |

### Scroll-Driven Animations

Animations controlled by scroll position without JavaScript.

**File:** `src/styles/modern/scroll-animations.css`

**Browser Support:** Chrome 115+, Firefox 110+ (flag), Safari 16.4+, Edge 115+

#### Scroll Reveal Classes

```css
/* Basic scroll reveal */
.scroll-reveal {
  animation: scroll-fade-in-up linear both;
  animation-timeline: view();
  animation-range: entry 0% entry 100%;
}

/* Staggered reveal for lists */
.scroll-reveal-stagger > * {
  animation: scroll-fade-in-up linear both;
  animation-timeline: view();
  animation-range: entry 0% entry 100%;
}
```

#### Available Scroll Animation Classes

| Class | Effect |
|-------|--------|
| `.scroll-reveal` | Fade in from bottom |
| `.scroll-reveal-left` | Fade in from left |
| `.scroll-reveal-right` | Fade in from right |
| `.scroll-reveal-scale` | Scale in |
| `.scroll-reveal-stagger` | Staggered children animation |
| `.scroll-progress-bar` | Scroll progress indicator |
| `.scroll-progress-bar-gradient` | Gradient progress bar |
| `.scroll-parallax-slow` | Slow parallax |
| `.scroll-parallax-fast` | Fast parallax |

#### Usage Example

```tsx
// Add staggered animation to grid
<div className="establishment-listview-grid scroll-reveal-stagger">
  {establishments.map(est => <Card key={est.id} />)}
</div>

// Add scroll progress bar to detail page
<div className="scroll-progress-bar-gradient" aria-hidden="true" />
```

---

## Component Patterns

### BEM Naming Convention

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
```

### Buttons

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
```

### Forms

```tsx
<div className="form-group">
  <label className="form-label form-label--required">Email</label>
  <input type="email" className="form-control" />
  <span className="form-error">Error message</span>
</div>

// Validation states
<input className="form-control form-control--success" />
<input className="form-control form-control--error" />
```

### Modals

```tsx
<div className="modal-overlay modal-overlay--active">
  <div className="modal modal--md">
    <div className="modal__header">
      <h2 className="modal__title">Title</h2>
      <button className="modal__close">X</button>
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

## Dark/Light Mode

### Theme Toggle

The system uses `data-theme` attribute on `<html>`:

```html
<html data-theme="dark">  <!-- Dark mode (default) -->
<html data-theme="light"> <!-- Light mode -->
```

### Theme-Aware Styles

```css
/* Automatically adapts to theme */
.my-component {
  background: var(--bg-primary);
  color: var(--text-primary);
  border-color: var(--border-color);
}
```

### Theme Transition

```css
html.theme-transitioning * {
  transition: background-color 0.3s ease,
              color 0.3s ease,
              border-color 0.3s ease;
}
```

---

## Accessibility Guidelines

**File:** `src/styles/base/accessibility.css`

**Standard:** WCAG 2.1 Level AAA Compliance

### Focus Indicators

```css
/* All interactive elements must have visible focus */
button:focus-visible,
a:focus-visible,
input:focus-visible {
  outline: 3px solid var(--border-focus);
  outline-offset: 2px;
}

/* Remove focus for mouse users */
*:focus:not(:focus-visible) {
  outline: none;
}
```

### Skip to Content Link

```css
.skip-to-content-link {
  position: absolute;
  top: -6.25rem;
  /* ... becomes visible on focus */
}

.skip-to-content-link:focus {
  top: var(--spacing-5);
}
```

### Screen Reader Only

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

### Form Validation States

```css
/* Valid input */
input:valid:not(:placeholder-shown) {
  border-color: var(--color-success);
}

/* Invalid input (after user interaction) */
input:invalid:not(:placeholder-shown):not(:focus) {
  border-color: var(--color-error);
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15);
}
```

### Reduced Motion Support

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### High Contrast Mode

```css
@media (prefers-contrast: high) {
  button:focus-visible {
    outline: 4px solid #FFFF00;
    outline-offset: 3px;
  }
}
```

### Windows High Contrast (forced-colors)

```css
@media (forced-colors: active) {
  button {
    border: 2px solid ButtonText;
    background: ButtonFace;
    color: ButtonText;
  }

  a { color: LinkText; }
  a:visited { color: VisitedText; }
}
```

### ARIA Live Regions

Two options available for screen reader announcements:

**Option 1: React Hook (for components)**

```tsx
import { useLiveAnnouncer } from '../hooks/useLiveAnnouncer';

const MyComponent = () => {
  const { announcePolite, announceAssertive } = useLiveAnnouncer();

  // Polite (waits for user to finish)
  announcePolite('Item added to favorites');

  // Assertive (interrupts immediately)
  announceAssertive('Error: Failed to save');
};
```

**Option 2: Standalone Utility (for non-React contexts)** *(v10.4+)*

Use in mutation callbacks, event handlers, or anywhere outside React component lifecycle:

```ts
import { announcePolite, announceAssertive } from '../utils/announce';

// In React Query onSuccess/onError callbacks
onSuccess: () => {
  announcePolite('Added to favorites');
},
onError: () => {
  announceAssertive('Error: Failed to add to favorites');
}

// With options
import { announce } from '../utils/announce';
announce('Custom message', {
  politeness: 'polite', // 'polite' | 'assertive' | 'off'
  clearAfter: 2000      // Auto-clear after 2s (default: 1000ms)
});
```

**WCAG 2.1 Level AAA** (4.1.3 Status Messages): Both utilities create live regions that screen readers announce automatically without moving focus

---

## CSS Contribution Guide

### DO

- **Use CSS variables** for colors, spacing, z-index, shadows
- **Use BEM naming** for new components
- **Test Dark and Light modes**
- **Test with reduced motion preference**
- **Ensure 44px minimum touch targets**
- **Add focus-visible styles** for interactive elements
- **Document new patterns** in this file

### DON'T

- **Hardcode colors** (`#FF1B8D` vs `var(--color-primary)`)
- **Hardcode z-index** (`9999` vs `var(--z-modal)`)
- **Hardcode spacing** (`16px` vs `var(--spacing-4)`)
- **Use `!important`** unless absolutely necessary
- **Duplicate existing patterns**
- **Create new files** without consulting architecture

### Adding New Variables

1. Add to `design-system.css` in appropriate section
2. Add both Dark and Light mode values if color
3. Document in this file
4. Consider backward compatibility (legacy mapping)

### Code Review Checklist

- [ ] Uses CSS variables (no hardcoded values)
- [ ] Follows BEM naming convention
- [ ] Works in Dark and Light mode
- [ ] Respects `prefers-reduced-motion`
- [ ] Has focus-visible styles
- [ ] Touch targets >= 44px
- [ ] Tested on mobile viewport

---

## Migration Legacy

### Legacy Variables Mapping

| Legacy | Modern | Status |
|--------|--------|--------|
| `--nightlife-primary` | `var(--color-primary)` | Mapped |
| `--nightlife-secondary` | `var(--color-secondary)` | Mapped |
| `--bg-dark-primary` | `var(--bg-surface)` | Mapped |
| `.btn-nightlife-base` | `.btn` | Ready |
| `.btn-primary-nightlife` | `.btn .btn--primary` | Ready |
| `.input-nightlife` | `.form-control` | Ready |
| `.modal-overlay-nightlife` | `.modal-overlay` | Ready |

### Migration Progress

**Completed:**
- design-system.css (657 lines)
- base/accessibility.css (617 lines)
- modern/container-queries.css (368 lines)
- modern/scroll-animations.css (410 lines)

**In Progress:**
- components/*.css migration to BEM
- Removal of legacy nightlife-theme.css patterns

---

## Quick Reference

### Common Patterns

```css
/* Card with hover effect */
.my-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-4);
  transition: transform var(--duration-normal) var(--ease-out),
              box-shadow var(--duration-normal) var(--ease-out);
}

.my-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

/* Responsive grid */
.my-grid {
  display: grid;
  gap: var(--grid-gap-mobile);
  grid-template-columns: 1fr;
}

@media (min-width: 48rem) {
  .my-grid {
    gap: var(--grid-gap-desktop);
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 64rem) {
  .my-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* Accessible button */
.my-button {
  min-height: var(--tap-target-min);
  padding: var(--spacing-2) var(--spacing-4);
  background: var(--color-primary);
  color: var(--text-inverse);
  border: none;
  border-radius: var(--border-radius-md);
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-out);
}

.my-button:hover {
  background: var(--color-primary-button);
}

.my-button:focus-visible {
  outline: 3px solid var(--border-focus);
  outline-offset: 2px;
}
```

---

**Maintenu par**: Équipe Dev PattaMap
**Dernière révision**: 2025-12-24 | **Version**: 3.0.0
