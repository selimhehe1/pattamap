# Sentry Performance Monitoring - Guide d'utilisation

## Configuration actuelle

- **Tracing**: 10% de sampling par défaut
- **Profiling**: Désactivé par défaut (activer avec `SENTRY_ENABLE_PROFILING=true`)
- **Sampling intelligent**: Adapté par type de route

### Sampling rates par type de route

```typescript
- Routes avec erreurs: 100%
- Routes `/api/admin/*`: 50%
- Health checks + docs: 1%
- Autres routes: 10% (défaut)
```

## Utilisation des Custom Spans

### 1. Tracer une opération database

```typescript
import { withSentrySpan } from '../config/sentry';

export const getUserById = async (userId: string) => {
  return await withSentrySpan(
    'database.get_user',
    { user_id: userId },
    async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data;
    }
  );
};
```

### 2. Tracer un appel API externe

```typescript
import { createChildSpan } from '../config/sentry';

export const fetchExternalData = async () => {
  return await createChildSpan(
    'api.external_service',
    { service: 'supabase', endpoint: 'users' },
    async () => {
      const response = await supabase.from('users').select();
      return response.data;
    }
  );
};
```

### 3. Mesurer les performances d'une fonction

```typescript
import { measurePerformance } from '../config/sentry';

export const processHeavyOperation = async () => {
  return await measurePerformance('process_images', async () => {
    // Opération coûteuse
    const results = await Promise.all(
      images.map(img => processImage(img))
    );
    return results;
  });
};
```

## Exemple complet dans un contrôleur

```typescript
import { Request, Response } from 'express';
import { withSentrySpan, setSentryUserFromRequest } from '../config/sentry';
import { supabase } from '../config/supabase';

export const getEstablishments = async (req: Request, res: Response) => {
  try {
    // Set user context for better error tracking
    setSentryUserFromRequest(req);

    // Trace the database query
    const establishments = await withSentrySpan(
      'database.get_establishments',
      {
        status: req.query.status,
        zone: req.query.zone,
      },
      async () => {
        const { data, error } = await supabase
          .from('establishments')
          .select('*')
          .eq('status', 'approved');

        if (error) throw error;
        return data;
      }
    );

    res.json({ establishments });
  } catch (error) {
    // Error is automatically captured by sentryErrorMiddleware
    res.status(500).json({ error: 'Internal server error' });
  }
};
```

## Breadcrumbs personnalisés

```typescript
import { addSentryBreadcrumb } from '../config/sentry';

// Ajouter un breadcrumb pour tracer une action utilisateur
addSentryBreadcrumb(
  'User rated employee',
  'user_action',
  {
    employee_id: employeeId,
    rating: 5,
  }
);
```

## Variables d'environnement

```env
# Required
SENTRY_DSN=your-sentry-dsn-here
SENTRY_ENVIRONMENT=development  # or production

# Optional Performance
SENTRY_TRACES_SAMPLE_RATE=0.1      # 10% des transactions
SENTRY_PROFILES_SAMPLE_RATE=0.1    # 10% de profiling
SENTRY_ENABLE_PROFILING=false      # Activer le profiling CPU
```

## Visualisation dans Sentry

Une fois configuré, tu verras dans Sentry:

1. **Performance → Transactions**: Toutes les requêtes HTTP tracées
2. **Performance → Spans**: Détail des opérations (DB, API externes)
3. **Issues → Errors**: Erreurs capturées avec contexte complet
4. **Breadcrumbs**: Historique des actions avant l'erreur

## Best Practices

✅ **DO**
- Utiliser `withSentrySpan` pour les opérations database importantes
- Tracer les appels API externes avec `createChildSpan`
- Ajouter des breadcrumbs pour les actions utilisateur critiques
- Utiliser `setSentryUserFromRequest` dans les routes authentifiées

❌ **DON'T**
- Ne pas tracer chaque petite fonction (trop de bruit)
- Ne pas logger les données sensibles (mots de passe, tokens)
- Ne pas mettre un sampling rate trop élevé en production (coût)

## Sécurité

Toutes les données sensibles sont automatiquement filtrées:
- Passwords
- Tokens (JWT, CSRF, API keys)
- Cookies
- Headers d'autorisation

Voir `beforeSend` dans `src/config/sentry.ts` pour les détails.
