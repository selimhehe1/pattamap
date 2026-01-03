# 🏗️ Structure du Projet - PattaMap

## Vue d'ensemble

PattaMap suit une architecture **monorepo simple** avec séparation claire frontend/backend, privilégiant la modularité et la maintenabilité.

---

## Structure Racine

```
pattaya-directory/
├── backend/                 # API Node.js/Express
├── src/                     # Frontend React
├── public/                  # Assets statiques
├── build/                   # Build production frontend
├── docs/                    # Documentation projet
├── scripts/                 # Scripts utilitaires
├── tools/                   # Outils développement
├── node_modules/            # Dépendances frontend
├── package.json             # Config frontend
├── tsconfig.json            # Config TypeScript frontend
├── claude.md                # Point d'entrée Claude Code
└── README.md                # Documentation publique
```

---

## 📁 Documentation (`docs/`)

```
docs/
├── versions/                # Historique versions
│   ├── CLAUDE-v9.1.0.md
│   ├── CLAUDE-v9.2.0.md
│   └── CLAUDE-v9.3.0.md
│
├── architecture/            # Architecture & design
│   ├── TECH_STACK.md        # Stack technique
│   ├── PROJECT_STRUCTURE.md # Ce fichier
│   ├── CSS_ARCHITECTURE.md
│   ├── CSS_MIGRATION_GUIDE.md
│   ├── CSS_REFACTORING_PROGRESS.md
│   └── AUDIT_CSS_ARCHITECTURE.md
│
├── features/                # Fonctionnalités
│   ├── FEATURES_OVERVIEW.md
│   ├── ROADMAP.md
│   ├── FEATURES_ROADMAP.md
│   ├── FEATURES_IMPLEMENTATION_GUIDE.md
│   └── FREELANCE_FEATURE.md
│
├── development/             # Guides développement
│   ├── GETTING_STARTED.md
│   ├── CODING_CONVENTIONS.md
│   └── TESTING.md
│
└── archive/                 # Docs obsolètes
    ├── PHASE_*.md
    ├── AUDIT_*.md
    └── CLEANUP_*.md
```

---

## 🎨 Frontend (`src/`)

```
src/
├── components/              # Composants React
│   ├── Map/                 # Système cartes zones
│   │   ├── Soi6Map.tsx
│   │   ├── WalkingStreetMap.tsx
│   │   ├── LKMetroMap.tsx
│   │   ├── TreetownMap.tsx
│   │   ├── SoiBuakhaoMap.tsx
│   │   ├── JomtienComplexMap.tsx
│   │   ├── BoyzTownMap.tsx
│   │   ├── Soi78Map.tsx
│   │   ├── BeachRoadCentralMap.tsx
│   │   └── RoadOverlay.tsx   # Canvas renderer routes
│   │
│   ├── Bar/                 # Pages établissements
│   │   ├── BarDetail.tsx
│   │   ├── BarGallery.tsx
│   │   └── BarMenu.tsx
│   │
│   ├── Employee/            # Pages employées
│   │   ├── EmployeeCard.tsx
│   │   ├── EmployeeDetail.tsx
│   │   └── EmployeeList.tsx
│   │
│   ├── Auth/                # Authentification
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   └── ProtectedRoute.tsx
│   │
│   ├── Forms/               # Formulaires ajout/édition
│   │   ├── AddEstablishment.tsx
│   │   ├── AddEmployee.tsx
│   │   └── EditProposal.tsx
│   │
│   ├── Admin/               # Dashboard admin
│   │   ├── AdminDashboard.tsx
│   │   ├── ProposalReview.tsx
│   │   ├── UserManagement.tsx
│   │   └── AuditLogs.tsx
│   │
│   ├── Search/              # Moteur recherche
│   │   ├── SearchBar.tsx
│   │   ├── SearchResults.tsx
│   │   └── AdvancedFilters.tsx
│   │
│   ├── Layout/              # Layout & navigation
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── Sidebar.tsx
│   │   └── Navigation.tsx
│   │
│   └── Common/              # Composants réutilisables
│       ├── Modal.tsx
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── Loader.tsx
│       └── ErrorBoundary.tsx
│
├── contexts/                # React Contexts
│   ├── AuthContext.tsx      # Authentification user
│   ├── ModalContext.tsx     # Gestion modals centralisée
│   ├── CSRFContext.tsx      # Tokens CSRF
│   └── ThemeContext.tsx     # Dark/Light mode
│
├── hooks/                   # Custom React Hooks
│   ├── useAuth.ts           # Hook authentification
│   ├── useSecureFetch.ts    # Fetch avec CSRF auto
│   ├── useContainerSize.ts  # Responsive containers
│   ├── useDebounce.ts       # Debounce inputs
│   └── useLocalStorage.ts   # Persistence localStorage
│
├── types/                   # Types TypeScript
│   ├── establishment.ts
│   ├── employee.ts
│   ├── user.ts
│   ├── comment.ts
│   └── api.ts
│
├── utils/                   # Utilitaires frontend
│   ├── api.ts               # Client API
│   ├── constants.ts         # Constantes globales
│   ├── validators.ts        # Validation formulaires
│   └── formatters.ts        # Formatage données
│
├── styles/                  # Styles globaux
│   ├── nightlife-theme.css  # Thème principal
│   ├── variables.css        # Variables CSS
│   └── globals.css          # Styles globaux
│
├── App.tsx                  # Composant racine
├── index.tsx                # Point d'entrée
└── setupTests.ts            # Configuration tests
```

---

## 🔧 Backend (`backend/`)

```
backend/
├── src/
│   ├── routes/              # Endpoints API
│   │   ├── auth.ts          # POST /api/auth/{login,register,logout}
│   │   ├── establishments.ts # CRUD établissements
│   │   ├── employees.ts     # CRUD employées
│   │   ├── comments.ts      # Système reviews
│   │   ├── favorites.ts     # Favoris user
│   │   ├── admin.ts         # Routes admin
│   │   ├── moderation.ts    # Routes modérateur
│   │   └── upload.ts        # Upload images Cloudinary
│   │
│   ├── controllers/         # Logique métier
│   │   ├── authController.ts
│   │   ├── establishmentController.ts
│   │   ├── employeeController.ts
│   │   ├── commentController.ts
│   │   └── adminController.ts
│   │
│   ├── middleware/          # Middleware Express
│   │   ├── auth.ts          # JWT authentication
│   │   ├── csrf.ts          # CSRF protection
│   │   ├── rateLimit.ts     # Rate limiting (8 limiters)
│   │   ├── cache.ts         # Redis cache middleware
│   │   ├── upload.ts        # Multer config
│   │   ├── errorHandler.ts  # Error handling
│   │   └── __tests__/       # Tests middleware
│   │       ├── auth.test.ts
│   │       └── csrf.test.ts
│   │
│   ├── config/              # Configuration services
│   │   ├── database.ts      # Supabase client
│   │   ├── cloudinary.ts    # Cloudinary config
│   │   ├── redis.ts         # Redis client + fallback
│   │   ├── swagger.ts       # OpenAPI spec
│   │   └── sentry.ts        # Sentry monitoring
│   │
│   ├── utils/               # Utilitaires backend
│   │   ├── validation.ts    # Schémas validation Joi
│   │   ├── pagination.ts    # Cursor pagination helpers
│   │   ├── logger.ts        # Custom logger
│   │   └── crypto.ts        # Hash, tokens
│   │
│   ├── types/               # Types TypeScript backend
│   │   ├── express.d.ts     # Augmentation Express types
│   │   └── models.ts        # Types database
│   │
│   └── server.ts            # Point d'entrée API
│
├── docs/                    # Documentation backend
│   ├── SECURITY.md          # Guide sécurité
│   ├── PERFORMANCE.md       # Optimisations
│   ├── DATABASE_INDEXES.md  # Indexes SQL
│   └── SENTRY_USAGE.md      # Monitoring
│
├── database/                # Schémas & migrations
│   ├── schema.sql           # Schéma PostgreSQL complet
│   └── migrations/          # Migrations SQL
│       ├── 001_initial.sql
│       ├── 002_add_csrf.sql
│       └── 003_add_indexes.sql
│
├── jest.config.js           # Configuration Jest
├── tsconfig.json            # Config TypeScript backend
├── package.json             # Dépendances backend
└── .env                     # Variables environnement (gitignored)
```

---

## 📊 Database Structure (Supabase)

### Tables Principales

```sql
-- Users & Auth
users (id, email, username, role, created_at)
refresh_tokens (id, user_id, token, expires_at)

-- Établissements
establishments (id, name, category_id, zone, grid_row, grid_col, status, ...)
establishment_categories (id, name, icon)
establishment_photos (id, establishment_id, photo_url, is_primary)

-- Employées
employees (id, name, age, nationality, gender, photo_url, status, ...)
employment_history (id, employee_id, establishment_id, is_current, start_date, end_date)

-- Reviews & Social
comments (id, user_id, establishment_id, employee_id, rating, text, status)
favorites (id, user_id, employee_id)
reports (id, user_id, content_type, content_id, reason)

-- Audit
audit_logs (id, user_id, action, entity_type, entity_id, changes, ip_address)
```

### Indexes Critiques

```sql
-- Performance queries
CREATE INDEX idx_establishments_status_zone ON establishments(status, zone);
CREATE INDEX idx_employees_status ON employees(status);
CREATE INDEX idx_employment_history_current ON employment_history(is_current) WHERE is_current = true;
CREATE INDEX idx_comments_status ON comments(status);

-- Full-text search
CREATE INDEX idx_establishments_name_gin ON establishments USING gin(to_tsvector('english', name));
CREATE INDEX idx_employees_name_gin ON employees USING gin(to_tsvector('english', name));
```

---

## 🚀 Build & Deploy

### Development

```bash
# Terminal 1 - Backend (port 8080)
cd backend
npm run dev

# Terminal 2 - Frontend (port 3000)
npm start
```

### Production Build

```bash
# Frontend
npm run build                # → build/

# Backend
cd backend
npm run build                # → dist/
npm start                    # Run compiled JS
```

### Deployment Structure

```
production/
├── frontend/                # Static files (Vercel/Netlify)
│   └── build/
│
└── backend/                 # API server (Railway/Render)
    ├── dist/                # Compiled TypeScript
    ├── node_modules/
    └── .env.production
```

---

## 🧪 Testing Structure

```
backend/
└── src/
    └── middleware/
        └── __tests__/
            ├── auth.test.ts          # 18 tests auth
            └── csrf.test.ts          # 15 tests CSRF

frontend/
└── src/
    └── components/
        └── __tests__/
            ├── Login.test.tsx
            ├── SearchBar.test.tsx
            └── EmployeeCard.test.tsx
```

### Test Commands

```bash
# Backend
cd backend
npm test                     # Run all tests
npm run test:watch           # Watch mode
npm run test:coverage        # Coverage report

# Frontend
npm test                     # Jest + React Testing Library
```

---

## 📦 Package Management

### Frontend Dependencies
- Production: `package.json` dependencies
- Development: `package.json` devDependencies
- Lock file: `package-lock.json`

### Backend Dependencies
- Production: `backend/package.json` dependencies
- Development: `backend/package.json` devDependencies
- Lock file: `backend/package-lock.json`

### Scripts Utiles

**Frontend (`package.json`)**:
```json
{
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "analyze": "npm run build && npx source-map-explorer 'build/static/js/*.js'"
  }
}
```

**Backend (`backend/package.json`)**:
```json
{
  "scripts": {
    "dev": "nodemon src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "jest",
    "test:coverage": "jest --coverage"
  }
}
```

---

## 🔒 Environment Files

### `.env` Files (gitignored)

```
pattaya-directory/
├── .env                     # Frontend env vars
└── backend/
    └── .env                 # Backend env vars
```

### `.gitignore` Structure

```
# Dependencies
node_modules/
backend/node_modules/

# Environment
.env
backend/.env
.env.local
.env.production

# Build outputs
build/
dist/
backend/dist/

# Logs
*.log
npm-debug.log*

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db
```

---

## 📈 Scalability Considerations

### Current Limits
- **Monolith Architecture**: Frontend + Backend séparés mais couplés
- **Single Database**: Supabase PostgreSQL (scalable jusqu'à 100k users)
- **No CDN**: Images via Cloudinary (CDN inclus)

### Future Evolution
1. **Microservices** (si >100k users)
   - Service Auth séparé
   - Service Media séparé
   - Service Notifications

2. **Monorepo Tools** (si équipe >3 dev)
   - Turborepo ou Nx
   - Shared packages (types, utils, UI components)

3. **Infrastructure as Code**
   - Docker containers
   - Kubernetes orchestration
   - Terraform IaC

---

## 🔗 Liens Connexes

- **Architecture Stack**: [TECH_STACK.md](TECH_STACK.md)
- **Guide Sécurité**: [../../backend/docs/SECURITY.md](../../backend/docs/SECURITY.md)
- **Guide Performance**: [../../backend/docs/PERFORMANCE.md](../../backend/docs/PERFORMANCE.md)

---

**Dernière mise à jour**: v9.3.0 (Octobre 2025)
