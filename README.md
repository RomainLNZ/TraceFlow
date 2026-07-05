# TraceFlow

TraceFlow is a premium Agile project management SaaS foundation inspired by the polish of Linear, Vercel, Notion, Raycast, ClickUp, Jira, Monday and Trello, without cloning any of them.

The project is built incrementally. This first milestone establishes the architecture, design system, authentication surface, dashboards, kanban board, API structure, RBAC model and database schema.

## Stack

- Frontend: React 19, TypeScript, Vite, TailwindCSS, Framer Motion, React Router, Zustand, TanStack Query, React Hook Form, Zod, React DnD
- Backend: Node.js, Express, TypeScript
- Database: PostgreSQL, Prisma ORM
- Realtime: Socket.io
- Auth: JWT, refresh tokens, BCrypt, Helmet, rate limiting, validation, sanitization, CORS

## Workspace

```txt
apps/
  api/      Express API with controller/service/repository layers
  web/      React SaaS application
packages/
  config/   Shared TypeScript config
  types/    Shared DTOs and domain types
docs/
  architecture.md
  roadmap.md
```

## Default Admin

The seed script removes demo projects, teams, workspaces, tokens and non-admin users, then keeps or creates the default admin:

- Email: `admin@qualis.local`
- Password: `Admin123!`

## Commands

```bash
npm install
npm run dev
npm run build
npm run lint
npm run prisma:generate
npm run prisma:migrate
npm run seed
```

## Environment

Copy `.env.example` to `.env` and set production-grade secrets before deploying.

## Incremental Delivery

Each milestone must compile before the next one starts. No unused screens, services or dependencies should be added without a product path.
