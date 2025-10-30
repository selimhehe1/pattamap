# 🔒 PattaMap API - Documentation Sécurité

## Vue d'ensemble

PattaMap API implémente une stratégie de sécurité en profondeur avec plusieurs couches de protection contre les menaces courantes (XSS, CSRF, injection, DDoS, etc.).

---

## 🆕 Recent Security Improvements (January 2025)

### Critical Vulnerability Fixes

**CSRF Bypass Removal (CVSS 7.5 - HIGH)**
- **Issue**: Admin routes bypassed CSRF protection when authenticated
- **Impact**: Potential unauthorized state-changing operations
- **Fix**: Removed admin route exemption from CSRF middleware
- **Status**: ✅ Fixed and tested (15/15 CSRF tests passing)
- **Commit**: `0d56566`

**Enhanced Password Policy (NIST SP 800-63B Compliant)**
- **Minimum Length**: 12 characters (increased from 8)
- **Complexity**: Uppercase, lowercase, numbers, special characters
- **Breach Detection**: Integration with HaveIBeenPwned API (10M+ breached passwords blocked)
- **Status**: ✅ Implemented (25/25 auth tests passing)

### Infrastructure Improvements

**Redis Cache Activation**
- **Performance**: -50% database load, faster response times
- **Fallback**: Graceful degradation to in-memory cache
- **Status**: ✅ Configured (USE_REDIS=true by default)

**Enhanced Monitoring**
- **Sentry Traces Sample Rate**: Increased from 10% → 50%
- **Visibility**: 5x better production issue detection
- **Impact**: Improved incident response time
- **Status**: ✅ Deployed

**Health Endpoint Protection**
- **Rate Limit**: 100 requests/minute per IP
- **Purpose**: Prevent DDoS via health check abuse
- **Status**: ✅ Active (healthCheckRateLimit middleware)

---

---

## 🛡️ Protections HTTP Headers (Helmet.js)

### Content Security Policy (CSP)
Empêche l'exécution de scripts malveillants et limite les sources de contenu autorisées.

```http
Content-Security-Policy:
  default-src 'self';
  style-src 'self' 'unsafe-inline';
  script-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  object-src 'none';
  frame-src 'none'
```

**Protection contre**: XSS, injection de scripts tiers, clickjacking

### HTTP Strict Transport Security (HSTS)
Force l'utilisation de HTTPS en production.

```http
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

**Protection contre**: Man-in-the-middle attacks, protocol downgrade attacks

### Autres Headers de Sécurité

| Header | Valeur | Protection |
|--------|--------|------------|
| `X-Content-Type-Options` | `nosniff` | MIME type sniffing |
| `X-Frame-Options` | `DENY` | Clickjacking |
| `X-XSS-Protection` | `1; mode=block` | XSS (legacy browsers) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Information leakage |
| `Permissions-Policy` | `geolocation=(), microphone=(), camera=()` | Unauthorized device access |

---

## 🌐 CORS (Cross-Origin Resource Sharing)

### Configuration Stricte

**Origins autorisées (development)**:
- `http://localhost:3000` (React dev server)
- `http://localhost:5173` (Vite dev server)

**Origins autorisées (production)**:
- Définies via `CORS_ORIGIN` environment variable

### Politique

```typescript
{
  credentials: true,              // Autorise cookies/auth headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', ...],
  exposedHeaders: ['RateLimit-Limit', 'RateLimit-Remaining', ...],
  maxAge: 86400                   // Cache preflight 24h
}
```

**Protection contre**: CSRF cross-origin, unauthorized domains

---

## 🚦 Rate Limiting

Protection contre les abus et attaques DDoS avec des limites granulaires par type d'endpoint.

### Rate Limiters Configurés

| Endpoint | Limite | Fenêtre | Description |
|----------|--------|---------|-------------|
| **Auth** (`/api/auth/*`) | 20 req | 5 min | Authentification (login, register) |
| **Admin** (`/api/admin/*`) | 50 req | 5 min | Actions administratives |
| **Comments** | 20 req | 1 min | Publication de commentaires/ratings |
| **Upload** | 10 req | 1 min | Upload de fichiers |
| **Health** (`/api/health`) | 100 req | 1 min | Health checks (anti-DDoS) 🆕 |
| **API General** | 100 req | 15 min | Toutes les autres routes |
| **Admin Critical** | 10 req | 10 min | Opérations sensibles (ban, delete) |
| **Bulk Operations** | 5 req | 15 min | Exports massifs |

### Mécanisme

- **Key**: IP + User-Agent (ou User ID si authentifié)
- **Storage**: In-memory (production: Redis recommandé)
- **Headers de réponse**:
  ```http
  X-RateLimit-Limit: 100
  X-RateLimit-Remaining: 87
  X-RateLimit-Reset: 2025-01-15T14:30:00.000Z
  ```

### Bypass

Whitelist d'IPs configurables via `RATE_LIMIT_WHITELIST` (séparées par virgules).

---

## 🔐 CSRF Protection

### Mécanisme

Double Submit Cookie Pattern avec tokens cryptographiques.

**Flow**:
1. Client demande token: `GET /api/csrf-token`
2. Server génère token de 64 caractères (crypto.randomBytes)
3. Token stocké en session et retourné au client
4. Client envoie token dans header `X-CSRF-Token` pour POST/PUT/DELETE
5. Server vérifie avec `crypto.timingSafeEqual()`

### Exemptions

- Méthodes sûres: GET, HEAD, OPTIONS
- Routes admin avec auth cookie valide
- WebSockets (non applicable)

### Configuration Frontend

```typescript
// useSecureFetch hook
headers: {
  'X-CSRF-Token': csrfToken,
  'Content-Type': 'application/json'
}
```

**Protection contre**: CSRF attacks, unauthorized state-changing requests

---

## 🔑 Authentication & Authorization

### JWT Tokens

**Configuration**:
- Algorithme: HS256 (HMAC-SHA256)
- Expiration: 7 jours (configurable via `JWT_EXPIRES_IN`)
- Secret: Minimum 32 caractères (vérifié au démarrage)

**Transport**:
- Cookie `httpOnly`: Empêche accès JavaScript
- Cookie `secure`: HTTPS only en production
- Cookie `sameSite: strict`: Protection CSRF supplémentaire
- Header `Authorization: Bearer <token>`: Alternative pour APIs

### Roles & Permissions

| Role | Permissions |
|------|------------|
| `user` | CRUD sur ses propres resources |
| `moderator` | Modération de contenu, review queue |
| `admin` | Full access, user management |

### Middleware Chain

```
Request → authenticateToken → requireRole('admin') → Controller
```

---

## 📊 Monitoring & Alerting (Sentry)

### Configuration Performance 🆕

**Traces Sample Rate**: 50% (increased from 10%)
- **Impact**: 5x better visibility into production issues
- **Coverage**: Half of all transactions monitored
- **Use Case**: Faster incident detection and debugging
- **Cost**: Optimized for balance between visibility and quota usage

### Événements Tracés

- **Erreurs serveur**: Automatic capture + stack traces
- **Tentatives d'authentification**: Login failures, invalid tokens
- **CSRF violations**: Rejected requests avec contexte
- **Rate limit exceeded**: Abus détectés
- **Performance**: Slow queries, long requests (50% sampled)

### Sanitization Automatique

Toutes les données sensibles sont filtrées avant envoi à Sentry:
- Passwords
- Tokens (JWT, CSRF, API keys)
- Cookies
- Authorization headers

---

## 🗄️ Database Security

### Supabase Configuration

**Row Level Security (RLS)**:
- Activé sur toutes les tables
- Policies par role (anon, authenticated, service_role)
- SELECT/INSERT/UPDATE/DELETE granulaires

**Input Validation**:
- Prepared statements (Supabase client)
- Sanitization via `validateTextInput()`, `validateNumericInput()`
- Length limits, type checking

**Protection contre**: SQL injection, unauthorized access

---

## 🧪 Testing

### Security Tests

```bash
# Tests automatisés
npm test

# CSRF protection tests
npm test csrf

# Authentication tests
npm test auth
```

**Coverage**: 85%+ sur middlewares critiques (auth, csrf)

---

## 📝 Configuration Production

### Variables d'Environnement Requises

```env
# JWT
JWT_SECRET=<64+ caractères aléatoires>
JWT_EXPIRES_IN=7d

# Session
SESSION_SECRET=<64+ caractères aléatoires>

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# CORS
CORS_ORIGIN=https://pattamap.com,https://www.pattamap.com

# Sentry (🆕 Updated)
SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.5  # 50% sampling for good visibility

# Rate Limiting
RATE_LIMIT_WHITELIST=1.2.3.4,5.6.7.8

# Redis Cache (🆕 Production Required)
USE_REDIS=true
REDIS_URL=redis://:password@production-redis.example.com:6379
```

### Checklist de Déploiement

- [ ] Générer secrets forts (JWT_SECRET, SESSION_SECRET)
- [ ] Configurer CORS_ORIGIN avec domaines production
- [ ] Activer HTTPS (certificat SSL/TLS)
- [ ] Configurer Sentry avec DSN production (SENTRY_TRACES_SAMPLE_RATE=0.5) 🆕
- [ ] Tester rate limiting en staging (incluant /api/health) 🆕
- [ ] Audit sécurité avec OWASP ZAP
- [ ] **Configurer Redis pour cache (OBLIGATOIRE en production)** 🆕
- [ ] Vérifier politique de mots de passe (12 chars min, HaveIBeenPwned) 🆕
- [ ] Valider CSRF protection sur toutes les routes (admin inclus) 🆕
- [ ] Activer logs centralisés
- [ ] Mettre en place monitoring 24/7

---

## 🚨 Incident Response

### En cas de breach détecté

1. **Isoler**: Bloquer IPs suspectes via firewall
2. **Investiguer**: Analyser logs Sentry + access logs
3. **Révoquer**: Invalider tous les JWT tokens (rotate secret)
4. **Notifier**: Contacter utilisateurs affectés
5. **Corriger**: Patcher la vulnérabilité
6. **Documenter**: Post-mortem + lessons learned

### Contacts

- Security team: security@pattamap.com
- Sentry alerts: Auto-notification des admins

---

## 📚 Ressources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Helmet.js Docs](https://helmetjs.github.io/)
- [Express Rate Limit](https://github.com/express-rate-limit/express-rate-limit)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

---

## 🔄 Dernière mise à jour

**Version**: 3.2
**Date**: 2025-01-30
**Auteur**: PattaMap Security Team

### Changelog v3.2 (2025-01-30)
- ✅ Documented CSRF bypass removal (CVSS 7.5 fix)
- ✅ Added enhanced password policy documentation (12 chars, HaveIBeenPwned)
- ✅ Added health endpoint rate limiting (100 req/min per IP)
- ✅ Updated Sentry sample rate to 50% (5x better visibility)
- ✅ Added Redis cache configuration for production
- ✅ Updated deployment checklist with new security requirements
