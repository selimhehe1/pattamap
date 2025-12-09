# Guide de Deploiement PattaMap

## Pre-requis

- Compte GitHub (deja fait: https://github.com/selimhehe1/pattamap)
- Compte Vercel (gratuit)
- Compte Railway (~5$/mois)
- Domaine Namecheap + WhoisGuard

---

## Etape 1: Deployer le Backend sur Railway

### 1.1 Creer un compte Railway
1. Aller sur https://railway.app
2. Se connecter avec GitHub

### 1.2 Creer le projet
1. Cliquer "New Project"
2. Selectionner "Deploy from GitHub repo"
3. Choisir `selimhehe1/pattamap`
4. Railway detecte automatiquement le dossier `backend/`

### 1.3 Configurer les variables d'environnement
Dans Railway > Variables, ajouter:

```
NODE_ENV=production
PORT=8080
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...
JWT_SECRET=(generer avec: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
SESSION_SECRET=(generer une autre cle)
CORS_ORIGIN=https://votredomaine.com,https://www.votredomaine.com
```

### 1.4 Configurer le domaine
1. Railway > Settings > Domains
2. Ajouter un domaine custom: `api.votredomaine.com`
3. Copier les DNS records pour Namecheap

---

## Etape 2: Deployer le Frontend sur Vercel

### 2.1 Creer un compte Vercel
1. Aller sur https://vercel.com
2. Se connecter avec GitHub

### 2.2 Importer le projet
1. Cliquer "Add New" > "Project"
2. Importer `selimhehe1/pattamap`
3. Framework: Create React App (auto-detecte)
4. Root Directory: `.` (racine)

### 2.3 Configurer les variables d'environnement
Dans Vercel > Settings > Environment Variables:

```
REACT_APP_SUPABASE_URL=https://votre-projet.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJ...
REACT_APP_API_URL=https://api.votredomaine.com
```

### 2.4 Configurer le domaine
1. Vercel > Settings > Domains
2. Ajouter: `votredomaine.com` et `www.votredomaine.com`
3. Copier les DNS records pour Namecheap

---

## Etape 3: Configurer les DNS sur Namecheap

### 3.1 Aller dans Namecheap
1. Domain List > Manage > Advanced DNS

### 3.2 Ajouter les records

| Type | Host | Value | TTL |
|------|------|-------|-----|
| A | @ | 76.76.21.21 (Vercel) | Auto |
| CNAME | www | cname.vercel-dns.com | Auto |
| CNAME | api | xxx.up.railway.app | Auto |

### 3.3 Activer WhoisGuard
- Domain List > Manage > WhoisGuard > Enable

---

## Etape 4: Verification

### 4.1 Tester le backend
```bash
curl https://api.votredomaine.com/api/health
```

### 4.2 Tester le frontend
Ouvrir https://votredomaine.com dans un navigateur

### 4.3 Verifier le SSL
Les deux devraient avoir un cadenas vert (HTTPS automatique)

---

## Secrets a generer

Pour generer des secrets securises:

```bash
# JWT_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## Troubleshooting

### Backend ne demarre pas
- Verifier les logs Railway
- Verifier que toutes les variables sont definies
- Verifier que SUPABASE_SERVICE_KEY est correct

### CORS errors
- Verifier CORS_ORIGIN dans Railway
- Le domaine doit correspondre exactement (avec https://)

### Frontend 404 sur refresh
- Le fichier vercel.json gere les rewrites SPA

---

## Couts estimes

| Service | Cout |
|---------|------|
| Domaine (Namecheap) | ~12$/an |
| Frontend (Vercel) | Gratuit |
| Backend (Railway) | ~5$/mois |
| **Total** | **~6$/mois** |
