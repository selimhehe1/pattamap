# ADR-001: Monorepo Structure

## Status
Accepted

## Context
PattaMap needs both a React frontend and a Node.js/Express backend. We needed to decide whether to use separate repositories or a monorepo structure.

## Decision
We use a monorepo structure with the following layout:

```
pattaya-directory/
├── /src                    # Frontend (React/Vite)
├── /backend               # Backend (Express/TypeScript)
│   └── /src
│       ├── /controllers
│       ├── /routes
│       ├── /middleware
│       ├── /services
│       └── /database
├── /tests                 # E2E tests (Playwright)
├── /docs                  # Documentation
└── package.json           # Frontend package (root)
```

Key points:
- Frontend uses Vite for fast development
- Backend has its own `package.json` in `/backend`
- Shared configuration files at root level
- E2E tests can access both frontend and backend

## Consequences

### Positive
- Atomic commits across frontend and backend
- Easier to maintain consistency
- Shared CI/CD pipeline
- Single repository to clone

### Negative
- Larger repository size
- Need to be careful with directory-specific commands
- npm install needs to be run in both root and /backend

### Mitigations
- Clear directory structure documentation
- Separate npm scripts for frontend vs backend
- CI workflow runs tests for both in parallel
