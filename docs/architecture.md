# Architecture

## Principles

- Feature-first boundaries for product areas.
- Clean API layers: route -> controller -> validation -> service -> repository.
- Strict DTOs shared through `packages/types`.
- RBAC as a first-class domain concern.
- Realtime events are emitted from services after persistence succeeds.
- Frontend state is split between server cache, URL state and local UI state.

## Backend

```txt
src/
  app.ts
  server.ts
  config/
  modules/
    auth/
    users/
    projects/
    agile/
    notifications/
    audit/
    ai/
  middleware/
  lib/
```

## Frontend

```txt
src/
  app/
  components/
  features/
  hooks/
  lib/
  routes/
  styles/
  stores/
```

## API Contract

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/users/me`
- `GET /api/projects`
- `GET /api/agile/board`
- `GET /api/analytics/overview`
- `GET /api/notifications`

## Security

Passwords are hashed with BCrypt. Access tokens are short-lived; refresh tokens are stored hashed. Helmet, CORS, rate limiting, Zod validation and request sanitization are enabled at the edge.
