# 📝 Conventions de Code - PattaMap

## Principes Généraux

1. **TypeScript Strict Mode** - Typage obligatoire partout
2. **Functional Programming** - Privilégier fonctions pures, éviter mutations
3. **DRY (Don't Repeat Yourself)** - Factoriser code dupliqué
4. **KISS (Keep It Simple, Stupid)** - Solutions simples > complexes
5. **Self-documenting Code** - Noms explicites > commentaires

---

## TypeScript

### Configuration

```json
// tsconfig.json (Frontend & Backend)
{
  "compilerOptions": {
    "strict": true,              // Mode strict OBLIGATOIRE
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### Types

```typescript
// ✅ BON - Type explicite
interface User {
  id: string;
  email: string;
  role: 'user' | 'moderator' | 'admin';
}

function getUser(id: string): Promise<User> {
  // ...
}

// ❌ MAUVAIS - any
function getUser(id): any {
  // ...
}

// ✅ BON - Union types pour valeurs limitées
type Zone = 'soi6' | 'walking_street' | 'lk_metro';

// ❌ MAUVAIS - string trop permissif
let zone: string = 'invalid_zone'; // Pas d'erreur
```

### Interfaces vs Types

```typescript
// ✅ Interface pour objets extensibles
interface Establishment {
  id: string;
  name: string;
}

interface BarEstablishment extends Establishment {
  hasHappyHour: boolean;
}

// ✅ Type pour unions, tuples, primitives
type EstablishmentStatus = 'pending' | 'approved' | 'rejected';
type GridPosition = [row: number, col: number];
```

---

## Naming Conventions

### Variables & Functions

```typescript
// ✅ camelCase pour variables/fonctions
const userName = 'John';
const isAuthenticated = true;
const fetchUserData = async () => {};

// ❌ MAUVAIS
const UserName = 'John';        // PascalCase réservé aux classes
const is_authenticated = true;  // snake_case (Python style)
```

### Components React

```typescript
// ✅ PascalCase pour composants
const UserProfile: React.FC = () => {};
const EmployeeCard: React.FC<EmployeeCardProps> = ({ employee }) => {};

// ❌ MAUVAIS
const userProfile = () => {};   // camelCase
const employee_card = () => {};  // snake_case
```

### Constants

```typescript
// ✅ UPPER_SNAKE_CASE pour constantes globales
const API_BASE_URL = 'http://localhost:8080';
const MAX_UPLOAD_SIZE = 5 * 1024 * 1024; // 5MB

// ✅ camelCase pour constantes locales
const gridConfig = { rows: 2, cols: 20 };
```

### Files & Folders

```
✅ BON
components/
  UserProfile.tsx          // PascalCase pour composants
  EmployeeCard.tsx
utils/
  validators.ts            // camelCase pour utilitaires
  formatters.ts
hooks/
  useAuth.ts               // camelCase avec préfixe 'use'
  useSecureFetch.ts

❌ MAUVAIS
user-profile.tsx           // kebab-case
employee_card.tsx          // snake_case
UseAuth.ts                 // PascalCase pour hooks
```

---

## React Best Practices

### Functional Components

```typescript
// ✅ BON - Functional component avec TypeScript
interface EmployeeCardProps {
  employee: Employee;
  onEdit?: (id: string) => void;
}

export const EmployeeCard: React.FC<EmployeeCardProps> = ({ employee, onEdit }) => {
  return (
    <div className="employee-card">
      <h3>{employee.name}</h3>
      {onEdit && <button onClick={() => onEdit(employee.id)}>Edit</button>}
    </div>
  );
};

// ❌ MAUVAIS - Class component (deprecated)
class EmployeeCard extends React.Component {
  render() {
    return <div>...</div>;
  }
}
```

### Hooks

```typescript
// ✅ BON - Hooks au top level, ordre cohérent
const MyComponent: React.FC = () => {
  // 1. State hooks
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(false);

  // 2. Context hooks
  const { user } = useAuth();

  // 3. Custom hooks
  const secureFetch = useSecureFetch();

  // 4. Effects
  useEffect(() => {
    fetchData();
  }, []);

  // 5. Event handlers
  const handleClick = () => {};

  // 6. Render
  return <div>...</div>;
};

// ❌ MAUVAIS - Hooks conditionnels
const MyComponent = () => {
  if (condition) {
    const [data, setData] = useState(null); // ❌ Erreur React
  }
};
```

### Props Destructuring

```typescript
// ✅ BON - Destructure dans params
const UserProfile: React.FC<UserProfileProps> = ({ user, onUpdate }) => {
  return <div>{user.name}</div>;
};

// ❌ MAUVAIS - Accès via props.
const UserProfile: React.FC<UserProfileProps> = (props) => {
  return <div>{props.user.name}</div>;
};
```

---

## Backend Conventions

### Route Handlers

```typescript
// ✅ BON - Async/await + error handling
router.get('/establishments/:id',
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const { data, error } = await supabase
        .from('establishments')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) {
        return res.status(404).json({ error: 'Not found' });
      }

      res.json(data);
    } catch (error) {
      Sentry.captureException(error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ❌ MAUVAIS - Callbacks, pas de typing
router.get('/establishments/:id', function(req, res) {
  supabase.from('establishments').select('*').then(data => {
    res.json(data);
  });
});
```

### Middleware Order

```typescript
// ✅ BON - Ordre logique middleware
app.use(helmet());                    // 1. Security headers
app.use(cors(corsOptions));           // 2. CORS
app.use(compression());               // 3. Compression
app.use(express.json());              // 4. Body parser
app.use(cookieParser());              // 5. Cookie parser
app.use(session(sessionConfig));      // 6. Sessions

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/establishments', establishmentRoutes);

// Error handling (TOUJOURS en dernier)
app.use(errorHandler);
```

---

## Error Handling

### Frontend

```typescript
// ✅ BON - Try/catch + user feedback
const handleSubmit = async () => {
  try {
    setLoading(true);
    const result = await api.createEstablishment(data);
    toast.success('Establishment created!');
    navigate(`/establishments/${result.id}`);
  } catch (error) {
    console.error('Create establishment error:', error);
    toast.error(error.message || 'Failed to create establishment');
  } finally {
    setLoading(false);
  }
};

// ❌ MAUVAIS - Ignore errors
const handleSubmit = async () => {
  const result = await api.createEstablishment(data); // Peut crash
  navigate(`/establishments/${result.id}`);
};
```

### Backend

```typescript
// ✅ BON - Custom error types
class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Usage
if (!email || !password) {
  throw new ValidationError('Email and password required');
}

// Error middleware
app.use((err, req, res, next) => {
  Sentry.captureException(err);

  if (err instanceof ValidationError) {
    return res.status(400).json({ error: err.message });
  }

  res.status(500).json({ error: 'Internal server error' });
});
```

---

## Security Best Practices

### CSRF Protection

```typescript
// ✅ BON - CSRF pour mutations (POST/PUT/DELETE)
router.post('/comments',
  authenticateToken,
  csrfProtection,        // ✅ CSRF requis
  createComment
);

router.get('/comments',
  authenticateToken,     // ❌ Pas de CSRF pour GET (lecture)
  getComments
);
```

### Input Validation

```typescript
// ✅ BON - Validate & sanitize inputs
import validator from 'validator';

const createUser = async (req: Request, res: Response) => {
  const { email, username, password } = req.body;

  // Validate
  if (!validator.isEmail(email)) {
    return res.status(400).json({ error: 'Invalid email' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password too short' });
  }

  // Sanitize
  const sanitizedEmail = validator.normalizeEmail(email);
  const sanitizedUsername = validator.escape(username);

  // Create user...
};
```

### SQL Injection Prevention

```typescript
// ✅ BON - Parameterized queries (Supabase auto-escapes)
const { data } = await supabase
  .from('users')
  .select('*')
  .eq('email', userEmail);  // ✅ Safe

// ❌ MAUVAIS - String concatenation (si raw SQL)
const query = `SELECT * FROM users WHERE email = '${userEmail}'`; // ❌ SQL injection
```

---

## Performance

### Memoization

```typescript
// ✅ BON - Memo expensive computations
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);

// ✅ BON - Memo callbacks
const handleClick = useCallback(() => {
  doSomething(id);
}, [id]);

// ✅ BON - Memo components
const MemoizedComponent = React.memo(MyComponent);
```

### Lazy Loading

```typescript
// ✅ BON - Code splitting
const AdminDashboard = lazy(() => import('./components/Admin/AdminDashboard'));

const App = () => (
  <Suspense fallback={<Loader />}>
    <Routes>
      <Route path="/admin" element={<AdminDashboard />} />
    </Routes>
  </Suspense>
);
```

---

## Testing Conventions

### Test File Naming

```
src/
  components/
    UserProfile.tsx
    __tests__/
      UserProfile.test.tsx    ✅ BON
      UserProfile.spec.tsx    ✅ Acceptable
  utils/
    validators.ts
    validators.test.ts        ✅ BON
```

### Test Structure

```typescript
// ✅ BON - AAA Pattern (Arrange, Act, Assert)
describe('UserProfile', () => {
  it('should display user name', () => {
    // Arrange
    const user = { name: 'John', email: 'john@example.com' };

    // Act
    render(<UserProfile user={user} />);

    // Assert
    expect(screen.getByText('John')).toBeInTheDocument();
  });
});
```

---

## Git Commit Messages

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: Nouvelle fonctionnalité
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting, CSS
- `refactor`: Refactoring
- `test`: Ajout tests
- `chore`: Maintenance, deps

### Exemples

```bash
# ✅ BON
feat(map): add Walking Street topographic grid
fix(auth): resolve CSRF token expiration issue
docs(api): update Swagger authentication examples

# ❌ MAUVAIS
updated files
fix bug
WIP
```

---

## Code Comments

### Quand Commenter

```typescript
// ✅ BON - Expliquer "pourquoi", pas "quoi"
// Utiliser Brotli car 25% plus efficace que gzip pour JSON
app.use(compression({ level: 6 }));

// ❌ MAUVAIS - Évident
// Créer variable
const user = getUser();
```

### JSDoc pour Fonctions Complexes

```typescript
/**
 * Calcule position optimale établissement sur grille
 *
 * @param zone - Zone géographique (soi6, walking_street, etc.)
 * @param preferences - Préférences de position (proximité, visibilité)
 * @returns Position optimale { row, col } ou null si grille pleine
 */
function calculateOptimalPosition(
  zone: Zone,
  preferences: PositionPreferences
): GridPosition | null {
  // ...
}
```

---

## Import Organization

```typescript
// ✅ BON - Ordre standardisé
// 1. External libs
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

// 2. Internal modules
import { useAuth } from '@/contexts/AuthContext';
import { Employee } from '@/types/employee';

// 3. Components
import { Button } from '@/components/Common/Button';
import { Modal } from '@/components/Common/Modal';

// 4. Utils
import { formatDate } from '@/utils/formatters';
import { validateEmail } from '@/utils/validators';

// 5. Styles
import './EmployeeCard.css';
```

---

## React Best Practices (Audit Décembre 2025)

### Keys dans les listes

```typescript
// ❌ MAUVAIS - key={index} cause des bugs de re-render
{items.map((item, index) => (
  <Component key={index} data={item} />  // ❌ Problème si liste change
))}

// ✅ BON - key={uniqueId} garantit stabilité
{items.map((item) => (
  <Component key={item.id} data={item} />  // ✅ Unique et stable
))}

// ✅ BON - Alternative si pas d'id
{items.map((item) => (
  <Component key={item.url} data={item} />  // ✅ Autre prop unique
))}
```

**Pourquoi**: `key={index}` cause des problèmes quand:
- Éléments réordonnés (liste triée)
- Éléments supprimés/ajoutés au milieu
- État interne des composants perdu

**Composants corrigés (Audit Dec 2025)**:
- `AdminDashboard.tsx` → `key={card.title}`
- `EmployeeClaimsAdmin.tsx` → `key={url}`
- `EmployeeDetailModal.tsx` → `key={photo}`
- `EstablishmentEditModal.tsx` → `key={service}`
- `EstablishmentOwnersAdmin.tsx` → `key={url}`
- `VerificationsAdmin.tsx` → `key={stat.label}`

### Debounce pour inputs fréquents

```typescript
// ✅ BON - Hook useDebouncedValue réutilisable
const useDebouncedValue = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

// Usage
const MyComponent = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebouncedValue(searchQuery, 300); // 300ms

  // Utiliser debouncedQuery pour API calls
  useEffect(() => {
    if (debouncedQuery) {
      fetchResults(debouncedQuery);
    }
  }, [debouncedQuery]);
};
```

**Quand utiliser**: Autocomplete, recherche, filtres avec grandes listes

### useEffect vs setTimeout

```typescript
// ❌ MAUVAIS - setTimeout avec closures (valeurs périmées)
const handleLogin = async () => {
  await login(credentials);
  setTimeout(() => {
    // ⚠️ user peut avoir changé depuis!
    if (user?.account_type === 'employee') {
      getLinkedProfile();
    }
  }, 100);
};

// ✅ BON - useEffect avec dépendances explicites
useEffect(() => {
  // React s'assure que user est à jour
  if (user?.account_type === 'employee' && user?.linked_employee_id) {
    getLinkedProfile();
  }
}, [user?.account_type, user?.linked_employee_id]);
```

**Règle**: Si l'action dépend du state React, utiliser `useEffect`, pas `setTimeout`.

### Tests locale-indépendants

```typescript
// ❌ MAUVAIS - Format dépend de la locale système
expect(screen.getByText(/฿3,600/)).toBeInTheDocument();  // Fail si locale = fr-FR

// ✅ BON - Regex flexible pour séparateurs de milliers
expect(screen.getByText(/฿3[\s,.]?600/)).toBeInTheDocument();  // Accepte: 3,600 ou 3 600 ou 3.600

// ✅ BON - Alternative: tester le conteneur
const amount = document.querySelector('.total-value');
expect(amount?.textContent?.replace(/[\s,.]/g, '')).toContain('3600');
```

---

## Liens Connexes

- **Testing Guide**: [TESTING.md](TESTING.md)
- **Security**: [../../backend/docs/SECURITY.md](../../backend/docs/SECURITY.md)
- **Performance**: [../../backend/docs/PERFORMANCE.md](../../backend/docs/PERFORMANCE.md)

---

**Dernière mise à jour**: v10.4.0 (Décembre 2025)
