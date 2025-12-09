# Architecture PattaMap

## Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────────┐
│                         GITHUB                                   │
│                   (Code source)                                  │
│                 github.com/selimhehe1/pattamap                   │
└─────────────────────┬───────────────────────────────────────────┘
                      │
         ┌────────────┴────────────┐
         │                         │
         ▼                         ▼
┌─────────────────┐       ┌─────────────────┐
│     VERCEL      │       │    RAILWAY      │
│   (Frontend)    │       │   (Backend)     │
│                 │       │                 │
│ - React/TS      │       │ - Node.js/TS    │
│ - Fichiers      │       │ - Express API   │
│   statiques     │       │ - Auth/CSRF     │
│ - CDN mondial   │       │ - Rate limiting │
└────────┬────────┘       └────────┬────────┘
         │                         │
         │    pattamap.com         │    api.pattamap.com
         │                         │
         └────────────┬────────────┘
                      │
                      ▼
         ┌─────────────────────────┐
         │       SUPABASE          │
         │    (Base de donnees)    │
         │                         │
         │ - PostgreSQL            │
         │ - Auth (JWT)            │
         │ - Storage (images)      │
         │ - RLS (securite)        │
         └─────────────────────────┘
```

## Services et roles

### GitHub
- **Role** : Stockage du code source + versioning
- **URL** : https://github.com/selimhehe1/pattamap
- **Branches** :
  - `main` → Production
  - `develop` → Preprod (a configurer)

### Vercel
- **Role** : Hebergement du frontend React
- **Deploiement** : Automatique a chaque push sur GitHub
- **URLs** :
  - Production : https://pattamap.com
  - Preprod : https://preprod.pattamap.com (a configurer)
- **Cout** : Gratuit (plan Hobby)

### Railway
- **Role** : Hebergement du backend Node.js/Express
- **Deploiement** : Automatique a chaque push sur GitHub
- **URLs** :
  - Production : https://api.pattamap.com
  - Preprod : https://api-preprod.pattamap.com (a configurer)
- **Cout** : ~5$/mois

### Supabase
- **Role** : Base de donnees PostgreSQL + Auth + Storage
- **URL** : https://lwxolewnvhdrcgjuptmb.supabase.co
- **Cout** : Gratuit (plan Free tier)

### Namecheap
- **Role** : Registrar du domaine + DNS
- **Domaine** : pattamap.com
- **Cout** : ~10$/an

## Flux de deploiement

### Production (main)
```
Code push → GitHub (main)
     ↓
     ├── Vercel detecte le push → Build frontend → pattamap.com
     │
     └── Railway detecte le push → Build backend → api.pattamap.com
```

### Preprod (develop) - Preview URLs automatiques
```
Code push → GitHub (develop)
     ↓
     ├── Vercel → pattamap-git-develop-selimhehes-projects.vercel.app
     │
     └── Railway → (meme instance, preview automatique)
```

### Workflow recommande
```
1. Developper sur la branche `develop`
2. Tester sur les preview URLs
3. Creer une Pull Request develop → main
4. Merger pour deployer en production
```

## Variables d'environnement

### Frontend (Vercel)

| Variable | Description |
|----------|-------------|
| `REACT_APP_SUPABASE_URL` | URL Supabase |
| `REACT_APP_SUPABASE_ANON_KEY` | Cle publique Supabase |
| `REACT_APP_API_URL` | URL du backend (api.pattamap.com) |

### Backend (Railway)

| Variable | Description |
|----------|-------------|
| `NODE_ENV` | `production` ou `development` |
| `PORT` | Port du serveur (8080) |
| `SUPABASE_URL` | URL Supabase |
| `SUPABASE_ANON_KEY` | Cle publique Supabase |
| `SUPABASE_SERVICE_KEY` | Cle service Supabase (privee) |
| `JWT_SECRET` | Secret pour les tokens JWT |
| `SESSION_SECRET` | Secret pour les sessions |
| `CORS_ORIGIN` | Domaines autorises (frontend) |

## Configuration DNS (Namecheap)

| Type | Host | Value |
|------|------|-------|
| A | @ | 216.198.79.1 (Vercel) |
| CNAME | www | xxx.vercel-dns-017.com |
| CNAME | api | fnrrlpfc.up.railway.app |
| CNAME | preprod | (a configurer) |
| CNAME | api-preprod | (a configurer) |

## Couts mensuels

| Service | Cout |
|---------|------|
| Vercel | Gratuit |
| Railway | ~5$/mois |
| Supabase | Gratuit |
| Namecheap | ~1$/mois (10$/an) |
| **Total** | **~6$/mois** |

## Commandes utiles

```bash
# Lancer en local
npm run dev                    # Frontend (localhost:3000)
cd backend && npm run dev      # Backend (localhost:8080)

# Tests
npm test                       # Tests unitaires frontend
npm run test:e2e               # Tests E2E Playwright
cd backend && npm test         # Tests unitaires backend

# Build
npm run build                  # Build frontend
cd backend && npm run build    # Build backend

# Deploiement
git push origin main           # Deploie en production
git push origin develop        # Deploie en preprod
```
