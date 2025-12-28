# ADR-003: State Management

## Status
Accepted

## Context
We need a state management strategy that handles:
- Server state (API data)
- Client state (UI, authentication)
- Form state
- Caching and synchronization

## Decision
We use a split approach:

### 1. Server State: TanStack Query (React Query)
For all data fetched from the API:
- Establishments, employees, comments
- User data, favorites
- Dashboard statistics

Configuration:
```typescript
{
  staleTime: 5 * 60 * 1000,      // 5 minutes
  gcTime: 10 * 60 * 1000,        // 10 minutes cache
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
  retry: 3
}
```

### 2. Client State: React Context
For UI and auth state:
- `AuthContext` - User session, login/logout
- `ModalContext` - Modal management
- `ThemeContext` - Dark/light mode
- `CSRFContext` - CSRF token lifecycle
- `GamificationContext` - XP and badges

### 3. Form State: Custom Hook
`useFormValidation` hook with:
- Real-time validation
- Debounced onChange
- Touched field tracking
- Auto-save drafts

## Consequences

### Positive
- Clear separation of concerns
- Automatic caching and refetching
- Optimistic updates supported
- 70% reduction in API calls

### Negative
- Multiple patterns to learn
- Context depth can grow
- Query key management required

### Key Files
- `src/providers/QueryProvider.tsx`
- `src/contexts/*.tsx` (8 contexts)
- `src/hooks/useFormValidation.ts`
