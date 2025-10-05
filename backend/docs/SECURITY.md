# 🔒 PattaMap API - Documentation Sécurité

## Vue d'ensemble

PattaMap API implémente une stratégie de sécurité en profondeur avec plusieurs couches de protection contre les menaces courantes (XSS, CSRF, injection, DDoS, etc.).

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

### Événements Tracés

- **Erreurs serveur**: Automatic capture + stack traces
- **Tentatives d'authentification**: Login failures, invalid tokens
- **CSRF violations**: Rejected requests avec contexte
- **Rate limit exceeded**: Abus détectés
- **Performance**: Slow queries, long requests

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

# Sentry
SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1

# Rate Limiting
RATE_LIMIT_WHITELIST=1.2.3.4,5.6.7.8
```

### Checklist de Déploiement

- [ ] Générer secrets forts (JWT_SECRET, SESSION_SECRET)
- [ ] Configurer CORS_ORIGIN avec domaines production
- [ ] Activer HTTPS (certificat SSL/TLS)
- [ ] Configurer Sentry avec DSN production
- [ ] Tester rate limiting en staging
- [ ] Audit sécurité avec OWASP ZAP
- [ ] Configurer Redis pour rate limiting (recommandé)
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

**Version**: 3.1
**Date**: 2025-01-05
**Auteur**: PattaMap Security Team
