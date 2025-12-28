# Architecture Decision Records (ADRs)

This directory contains Architecture Decision Records for the PattaMap project.

## What is an ADR?

An ADR is a document that captures an important architectural decision made along with its context and consequences.

## ADR Index

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [001](001-monorepo-structure.md) | Monorepo Structure | Accepted | 2024-01 |
| [002](002-auth-strategy.md) | Authentication Strategy | Accepted | 2024-01 |
| [003](003-state-management.md) | State Management | Accepted | 2024-01 |
| [004](004-database-rls.md) | Database Row-Level Security | Accepted | 2025-12 |
| [005](005-token-refresh.md) | JWT Token Refresh Strategy | Accepted | 2025-12 |

## Template

When creating a new ADR, use this template:

```markdown
# ADR-XXX: Title

## Status
Proposed | Accepted | Deprecated | Superseded by ADR-YYY

## Context
What is the issue we're seeing that motivates this decision?

## Decision
What is the change we're making?

## Consequences
What are the trade-offs?
```
