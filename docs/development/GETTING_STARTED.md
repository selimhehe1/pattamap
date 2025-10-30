# 🚀 Guide de Démarrage - PattaMap

## Prérequis

### Obligatoire
- **Node.js** ≥ 18.0.0 ([Download](https://nodejs.org/))
- **npm** ≥ 8.0.0 (inclus avec Node.js)
- **Git** ([Download](https://git-scm.com/))

### Comptes Externes Requis
1. **Supabase** - Database & Auth ([supabase.com](https://supabase.com))
2. **Cloudinary** - Image storage ([cloudinary.com](https://cloudinary.com))
3. **Sentry** - Error monitoring ([sentry.io](https://sentry.io)) *(optionnel en dev)*

### Vérification Installation

```bash
node --version    # doit afficher v18+
npm --version     # doit afficher v8+
git --version     # doit afficher v2+
```

---

## Installation

### 1. Clone Repository

```bash
git clone <repository-url>
cd pattaya-directory
```

### 2. Installation Frontend

```bash
# À la racine du projet
npm install
```

### 3. Installation Backend

```bash
cd backend
npm install
```

---

## Configuration

### 1. Supabase Setup

#### a) Créer Projet Supabase
1. Aller sur [supabase.com](https://supabase.com)
2. Créer nouveau projet
3. Attendre provisioning (~2 min)

#### b) Récupérer Credentials
1. **Dashboard Supabase** → Settings → API
2. Copier:
   - `Project URL` → `SUPABASE_URL`
   - `anon public key` → `SUPABASE_KEY`

#### c) Créer Database Schema
1. **Dashboard Supabase** → SQL Editor
2. Exécuter le fichier: `backend/database/schema.sql`

```sql
-- Le schema.sql contient:
-- - Tables (users, establishments, employees, etc.)
-- - Indexes
-- - Row Level Security (RLS)
-- - Functions & Triggers
```

### 2. Cloudinary Setup

#### a) Créer Compte Cloudinary
1. Aller sur [cloudinary.com](https://cloudinary.com)
2. Sign up (gratuit jusqu'à 25GB)

#### b) Récupérer Credentials
1. **Dashboard Cloudinary** → Dashboard
2. Copier:
   - `Cloud Name` → `CLOUDINARY_CLOUD_NAME`
   - `API Key` → `CLOUDINARY_API_KEY`
   - `API Secret` → `CLOUDINARY_API_SECRET`

### 3. Variables d'Environnement

#### Backend `.env`

Créer fichier `backend/.env`:

```bash
# Database (Supabase)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=your-anon-key-here

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
SESSION_SECRET=your-session-secret-key

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Server Config
PORT=8080
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000,http://localhost:5173

# Sentry (optionnel en dev)
SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_ENVIRONMENT=development
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_ENABLE_PROFILING=false

# Redis (optionnel, non utilisé en dev)
# REDIS_URL=redis://localhost:6379
```

#### Frontend `.env` (optionnel)

Créer fichier `.env` à la racine:

```bash
# API Backend
REACT_APP_API_URL=http://localhost:8080

# Sentry (optionnel)
REACT_APP_SENTRY_DSN=https://xxx@sentry.io/xxx
REACT_APP_SENTRY_ENVIRONMENT=development
```

### 4. Générer JWT Secret

```bash
# Méthode 1: OpenSSL (Linux/Mac/Git Bash)
openssl rand -base64 32

# Méthode 2: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Copier le résultat dans JWT_SECRET
```

---

## Démarrage Développement

### Méthode Recommandée (2 terminaux)

#### Terminal 1 - Backend

```bash
cd backend
npm run dev
```

✅ **Backend démarré sur**: http://localhost:8080
- API disponible: http://localhost:8080/api/*
- Health check: http://localhost:8080/api/health
- Swagger UI: http://localhost:8080/api-docs

#### Terminal 2 - Frontend

```bash
# À la racine du projet
npm start
```

✅ **Frontend démarré sur**: http://localhost:3000
- Ouverture automatique navigateur
- Hot reload activé

### Vérification

1. **Frontend**: Ouvrir http://localhost:3000
   - Devrait afficher la landing page
   - Pas d'erreurs console (F12)

2. **Backend**: Tester http://localhost:8080/api/health
   ```json
   {
     "status": "ok",
     "timestamp": "2025-10-10T00:00:00.000Z"
   }
   ```

---

## Premiers Pas

### 1. Créer Compte Admin

#### Option A: Via API

```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@pattamap.com",
    "username": "admin",
    "password": "your-password"
  }'
```

#### Option B: Via Frontend

1. Aller sur http://localhost:3000/register
2. Remplir formulaire
3. Soumettre

#### Promouvoir en Admin

```sql
-- Dans Supabase SQL Editor
UPDATE users
SET role = 'admin'
WHERE email = 'admin@pattamap.com';
```

### 2. Ajouter Données Test

#### Catégories Établissements

```sql
-- Dans Supabase SQL Editor
INSERT INTO establishment_categories (name, icon) VALUES
  ('Bar', '🍺'),
  ('Gogo', '💃'),
  ('Nightclub', '🎵'),
  ('Massage', '💆');
```

#### Premier Établissement

1. Login avec compte admin
2. Aller sur http://localhost:3000/admin
3. "Add Establishment"
4. Remplir formulaire:
   - Name: "Test Bar"
   - Category: "Bar"
   - Zone: "soi6"
   - Address: "Soi 6, Pattaya"

---

## Commandes Utiles

### Development

```bash
# Frontend
npm start              # Démarrer dev server (port 3000)
npm run build          # Build production
npm test               # Run tests
npm run analyze        # Analyser bundle size

# Backend
cd backend
npm run dev            # Démarrer dev server (port 8080)
npm run build          # Compiler TypeScript → dist/
npm start              # Run compiled JS (production)
npm test               # Run Jest tests
npm run test:coverage  # Tests avec coverage
```

### Database

```bash
# Backup Supabase
# Via Supabase Dashboard → Database → Backups

# Run migrations
# Exécuter fichiers .sql dans Supabase SQL Editor
```

### Debugging

```bash
# Backend logs
cd backend
npm run dev    # Affiche logs console

# Frontend logs
# Ouvrir DevTools (F12) → Console
```

---

## Troubleshooting

### Port 8080 déjà utilisé

```bash
# Windows
netstat -ano | findstr :8080
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:8080 | xargs kill -9
```

### Port 3000 déjà utilisé

```bash
# Le frontend proposera automatiquement port 3001
# Accepter avec 'Y'
```

### Erreur CORS

Vérifier `backend/.env`:
```bash
CORS_ORIGIN=http://localhost:3000
```

Si frontend sur autre port (ex: 3001):
```bash
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
```

### Erreur Supabase "Invalid API key"

1. Vérifier `SUPABASE_URL` et `SUPABASE_KEY` dans `backend/.env`
2. Régénérer anon key dans Supabase Dashboard → Settings → API

### Erreur Cloudinary Upload

1. Vérifier credentials dans `backend/.env`
2. Tester upload:
   ```bash
   curl -X POST http://localhost:8080/api/upload/test
   ```

### TypeScript Errors Frontend

```bash
# Supprimer node_modules et réinstaller
rm -rf node_modules package-lock.json
npm install
```

### TypeScript Errors Backend

```bash
cd backend
rm -rf node_modules package-lock.json
npm install
npm run build  # Vérifier compilation
```

---

## Structure Dev Workflow

### 1. Nouvelle Feature

```bash
# 1. Créer branche
git checkout -b feature/ma-feature

# 2. Développer
# ... code frontend + backend

# 3. Tester
npm test                  # Frontend
cd backend && npm test    # Backend

# 4. Commit
git add .
git commit -m "feat: ajouter ma feature"

# 5. Push
git push origin feature/ma-feature
```

### 2. Fix Bug

```bash
git checkout -b fix/mon-bug
# ... fix code
git commit -m "fix: corriger mon bug"
git push origin fix/mon-bug
```

### 3. Update Dependencies

```bash
# Frontend
npm outdated              # Voir versions disponibles
npm update                # Update minor/patch
npm install <pkg>@latest  # Update major

# Backend
cd backend
npm outdated
npm update
```

---

## Tests

### Frontend Tests

```bash
# Run all tests
npm test

# Watch mode (auto-rerun on changes)
npm test -- --watch

# Coverage report
npm test -- --coverage
```

### Backend Tests

```bash
cd backend

# Run all tests (33 tests)
npm test

# Run specific test file
npm test -- auth.test.ts

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

---

## Build Production

### Frontend

```bash
# Build optimized bundle
npm run build

# Output: build/
# - build/static/js/*.js (minified)
# - build/static/css/*.css
# - build/index.html

# Test production build locally
npx serve -s build -p 3000
```

### Backend

```bash
cd backend

# Compile TypeScript
npm run build

# Output: dist/
# - dist/server.js (compiled)
# - dist/routes/*.js
# - dist/controllers/*.js

# Run production server
NODE_ENV=production npm start
```

---

## API Documentation

### Swagger UI (Dev Only)

Accessible sur: http://localhost:8080/api-docs

**Endpoints documentés**:
- Authentication (`POST /api/auth/login`, `/register`, `/logout`)
- Establishments (CRUD)
- Employees (CRUD)
- Comments (reviews)
- Admin routes

### Tester Endpoints

```bash
# Health check
curl http://localhost:8080/api/health

# Get establishments
curl http://localhost:8080/api/establishments

# Login
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@pattamap.com","password":"password"}'
```

---

## Performance Monitoring

### Sentry Setup (Optionnel)

1. Créer compte sur [sentry.io](https://sentry.io)
2. Créer projet "pattamap-backend"
3. Créer projet "pattamap-frontend"
4. Copier DSN dans `.env`

### Vérifier Monitoring

1. **Backend**: http://localhost:8080/api/test-error (devrait logger erreur dans Sentry)
2. **Frontend**: Ouvrir console erreurs → Vérifier Sentry breadcrumbs

---

## Ressources

### Documentation
- **Architecture**: [docs/architecture/](../architecture/)
- **Features**: [docs/features/](../features/)
- **Backend Docs**: [backend/docs/](../../backend/docs/)

### External Docs
- React: https://react.dev/
- TypeScript: https://www.typescriptlang.org/docs/
- Express: https://expressjs.com/
- Supabase: https://supabase.com/docs
- Cloudinary: https://cloudinary.com/documentation

---

## Prochaines Étapes

Une fois le projet démarré:

1. 📚 **Lire**: [CODING_CONVENTIONS.md](CODING_CONVENTIONS.md) - Conventions de code
2. 🧪 **Lire**: [TESTING.md](TESTING.md) - Guide tests
3. ✨ **Lire**: [docs/features/FEATURES_OVERVIEW.md](../features/FEATURES_OVERVIEW.md) - Fonctionnalités
4. 🗺️ **Explorer**: Système de cartes sur http://localhost:3000

---

**Besoin d'aide ?** Consulter [claude.md](../../claude.md) pour le guide complet du projet.

---

**Dernière mise à jour**: v9.3.0 (Octobre 2025)
