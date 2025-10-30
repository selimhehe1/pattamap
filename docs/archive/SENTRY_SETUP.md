# Sentry Setup Guide - Pattaya Directory

## 📋 Vue d'ensemble

Sentry est maintenant intégré sur **frontend (React)** et **backend (Express)** pour capturer automatiquement toutes les erreurs et monitorer les performances de votre plateforme.

## 🎯 Ce qui est capturé

### Frontend
- ✅ Erreurs JavaScript/TypeScript non gérées
- ✅ Erreurs React (composants, hooks, etc.)
- ✅ Erreurs API (fetch failures)
- ✅ Performance des pages (temps de chargement)
- ✅ Navigation (React Router tracking)
- ✅ Session replay (10% des sessions, 100% avec erreurs)
- ✅ Contexte utilisateur (id, pseudonym, role)

### Backend
- ✅ Exceptions non gérées (crashes serveur)
- ✅ Erreurs dans les routes Express
- ✅ Erreurs de base de données (Supabase)
- ✅ Performance des API endpoints
- ✅ Contexte utilisateur enrichi (depuis JWT)
- ✅ Profiling optionnel (performance CPU/mémoire)

## 🚀 Configuration (5 minutes)

### Étape 1: Créer un compte Sentry gratuit

1. Aller sur https://sentry.io/signup/
2. Créer un compte (gratuit jusqu'à 5000 erreurs/mois)
3. Créer **2 projets**:
   - Un projet **JavaScript/React** pour le frontend
   - Un projet **Node.js/Express** pour le backend

### Étape 2: Obtenir les DSN

Pour chaque projet:
1. Aller dans **Settings** → **Projects** → **[Nom du projet]** → **Client Keys (DSN)**
2. Copier le DSN (format: `https://xxx@xxx.ingest.sentry.io/xxx`)

### Étape 3: Configurer les variables d'environnement

#### Frontend (.env)
```bash
# Dans pattaya-directory/.env
REACT_APP_SENTRY_DSN=https://votre-frontend-dsn@sentry.io/123456
REACT_APP_SENTRY_ENVIRONMENT=development
REACT_APP_SENTRY_ENABLE_TRACING=false  # true en production pour monitoring performance
```

#### Backend (backend/.env)
```bash
# Dans pattaya-directory/backend/.env
SENTRY_DSN=https://votre-backend-dsn@sentry.io/789012
SENTRY_ENVIRONMENT=development
SENTRY_ENABLE_PROFILING=false  # true en production pour profiling avancé
SENTRY_TRACES_SAMPLE_RATE=0.1  # 10% des requêtes pour performance monitoring
```

### Étape 4: Redémarrer les serveurs

```bash
# Frontend
npm start

# Backend
cd backend
npm run dev
```

## ✅ Vérification

### Test Frontend
1. Ouvrir la console du navigateur
2. Vous devriez voir: `✅ Sentry initialized (development)`
3. Provoquer une erreur volontaire:
```javascript
// Dans la console du navigateur
throw new Error('Test Sentry Frontend');
```
4. Vérifier dans Sentry dashboard que l'erreur est capturée

### Test Backend
1. Vérifier les logs du serveur: `✅ Sentry initialized (development, traces: 10%)`
2. Créer une route de test temporaire ou provoquer une erreur
3. Vérifier dans Sentry dashboard

## 🔒 Sécurité & Confidentialité

### Données automatiquement filtrées

Les données sensibles sont **automatiquement supprimées** avant envoi à Sentry:

- ❌ Passwords
- ❌ JWT tokens
- ❌ CSRF tokens
- ❌ Cookies
- ❌ Authorization headers
- ❌ API keys/secrets
- ❌ Session IDs

### Configuration avancée

#### Frontend (src/config/sentry.ts)
- Breadcrumbs sanitisés
- Cookies redacted
- Authorization headers supprimés
- Erreurs navigateur ignorées (extensions, etc.)

#### Backend (backend/src/config/sentry.ts)
- Request body sanitisé
- Headers sensibles supprimés
- Données POST/PUT nettoyées
- SQL injection attempts ignorés

## 📊 Dashboard Sentry

### Ce que vous verrez

**Issues (Erreurs):**
- Liste des erreurs groupées
- Stack traces complètes
- Breadcrumbs (actions avant l'erreur)
- User context (qui a eu l'erreur)
- Browser/OS information
- Fréquence et impact

**Performance:**
- Temps de réponse API
- Temps de chargement pages
- Slow queries
- Transactions les plus lentes

**Releases:**
- Tracking des versions
- Nouvelles erreurs par version
- Regressions détectées

## 🎯 Utilisation dans le code

### Frontend

#### Capture manuelle d'erreur
```typescript
import { captureSentryException } from './config/sentry';

try {
  riskyOperation();
} catch (error) {
  captureSentryException(error, {
    component: 'MapComponent',
    action: 'loadEstablishments'
  });
  throw error;
}
```

#### Ajouter un breadcrumb
```typescript
import { addSentryBreadcrumb } from './config/sentry';

addSentryBreadcrumb(
  'User clicked on establishment',
  'user-action',
  { establishmentId: '123', zone: 'soi6' }
);
```

#### Le logger envoie automatiquement à Sentry
```typescript
import { logger } from './utils/logger';

// Automatiquement envoyé à Sentry en production
logger.error('Failed to load data', error);
```

### Backend

#### Le logger envoie automatiquement à Sentry
```typescript
import { logger } from './utils/logger';

// Automatiquement envoyé à Sentry en production
logger.error('Database query failed', error);

// TOUJOURS envoyé à Sentry (même en dev)
logger.critical('Security breach detected', {
  ip: req.ip,
  userId: req.user?.id
});
```

#### Capture manuelle
```typescript
import { captureSentryException } from '../config/sentry';

try {
  await complexOperation();
} catch (error) {
  captureSentryException(error, {
    endpoint: '/api/establishments',
    userId: req.user?.id
  });
  res.status(500).json({ error: 'Operation failed' });
}
```

## 🔧 Configuration Production

### Frontend (.env.production)
```bash
REACT_APP_SENTRY_DSN=https://votre-dsn@sentry.io/xxx
REACT_APP_SENTRY_ENVIRONMENT=production
REACT_APP_SENTRY_ENABLE_TRACING=true  # Active le monitoring performance
```

### Backend (.env.production)
```bash
SENTRY_DSN=https://votre-dsn@sentry.io/xxx
SENTRY_ENVIRONMENT=production
SENTRY_ENABLE_PROFILING=true  # Active le profiling CPU/mémoire
SENTRY_TRACES_SAMPLE_RATE=0.1  # 10% des requêtes
```

### Source Maps (pour stack traces lisibles)

#### Frontend
```bash
# Build avec source maps
npm run build

# Upload source maps à Sentry (nécessite sentry-cli)
npx @sentry/cli releases files <VERSION> upload-sourcemaps ./build
```

#### Backend
```bash
# Compiler TypeScript avec source maps
npm run build

# Source maps déjà générées par tsc
```

## 📈 Quotas & Limites

### Plan Gratuit
- **5,000 erreurs/mois**
- **10,000 performance events/mois**
- **50 MB de session replays**
- 1 utilisateur
- 30 jours de rétention

### Si vous dépassez
- Augmenter `tracesSampleRate` (réduire à 0.05 = 5%)
- Désactiver replay: `replaysSessionSampleRate: 0`
- Ignorer certaines erreurs non critiques
- Upgrade vers plan payant ($26/mois pour 50K erreurs)

## 🚨 Alertes

### Configurer des alertes

1. Aller dans **Alerts** → **Create Alert**
2. Exemples d'alertes utiles:
   - Nouvelle erreur détectée
   - Erreur vue par > 10 utilisateurs
   - Taux d'erreur > 5%
   - API endpoint > 2s de réponse

3. Notifications par:
   - Email
   - Slack
   - Discord
   - Webhook

## 🎓 Ressources

- [Documentation Sentry React](https://docs.sentry.io/platforms/javascript/guides/react/)
- [Documentation Sentry Node.js](https://docs.sentry.io/platforms/node/)
- [Best Practices](https://docs.sentry.io/platforms/javascript/best-practices/)
- [Dashboard Sentry](https://sentry.io/)

## ❓ FAQ

**Q: Sentry fonctionne en développement?**
A: Oui, mais certaines features sont désactivées (transactions) pour économiser le quota.

**Q: Les données utilisateur sont-elles sécurisées?**
A: Oui, tous les tokens/passwords/secrets sont automatiquement supprimés avant envoi.

**Q: Comment désactiver Sentry temporairement?**
A: Retirer le `SENTRY_DSN` du fichier `.env`.

**Q: Sentry ralentit-il l'application?**
A: Impact négligeable (<1ms par requête). Les captures sont asynchrones.

**Q: Puis-je voir les erreurs des utilisateurs en temps réel?**
A: Oui, le dashboard Sentry est mis à jour en temps réel.

## ✅ Checklist finale

- [ ] Compte Sentry créé
- [ ] 2 projets créés (frontend + backend)
- [ ] DSN configurés dans .env
- [ ] Serveurs redémarrés
- [ ] Tests effectués (erreur capturée)
- [ ] Dashboard Sentry vérifié
- [ ] Alertes configurées (optionnel)

---

**🎉 Votre plateforme est maintenant monitorée 24/7 avec Sentry!**
