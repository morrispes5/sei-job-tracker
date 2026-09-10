# Job Tracker — Execution Rules for Codex

## Source of truth

Before changing code, read these files in order:

1. `README.md`
2. `docs/ARCHITECTURE.md`
3. `docs/IMPLEMENTATION_ROADMAP.md`
4. The document most relevant to the requested milestone (`DATA_MODEL`, `API_CONTRACT`, `UX_UI_DESIGN_SYSTEM`, `AUTH_SECURITY`, or `REMINDER_EMAIL`).

## Fixed decisions

- pnpm workspaces + Turborepo monorepo.
- API: NestJS REST JSON, TypeScript strict, Drizzle ORM, PostgreSQL.
- Web: Vite + React 19 + TanStack Router/Query + Tailwind/shadcn/ui.
- Mobile: Expo Router + React Native + TanStack Query.
- Shared Zod schemas, types, enums, and API constants belong in `packages/shared`.
- Authentication is email/password plus access JWT and rotating refresh token.
- Reminder MVP is email only.
- Drizzle Studio is development-only and must never be deployed publicly.

## Guardrails

- Work on one milestone or explicitly requested task only.
- Do not introduce Prisma, Next.js, Redux, microservices, Redis, BullMQ, or a new dependency unless the user asks or the docs are updated first.
- Keep controllers thin; put business rules in services and database access in repositories/query layer.
- Enforce ownership in every resource query with `user_id`.
- Use Drizzle migrations for every schema change. Never alter production data/schema manually through Studio.
- Do not place secrets in client code, git, test fixtures, logs, or responses.
- Before finishing, run the relevant lint, typecheck, and tests; report changed files and results.
- If implementation requires changing a documented contract, stop and propose the documentation update before editing code.

## Initial task

Start only when asked with **M0 — Repository foundation** from `docs/IMPLEMENTATION_ROADMAP.md`. Do not scaffold later milestones early.
