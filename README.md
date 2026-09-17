# Sei — Job Tracker

<p align="center">
  <img src="apps/web/public/sei-mark.svg" width="96" alt="Sei abstract compass logo" />
</p>

> **Search. Evaluate. Iterate.**

**Sei** is the personal command center for tracking job, internship, and freelance applications. The name captures the loop behind a thoughtful job search: collect an opportunity, evaluate the next move, and improve with every outcome.

This repository currently contains the **M8 — Preview deployment candidate** on top of the M1–M7 API, web, mobile, reminder, and hardening foundation. Provider-agnostic API/web images, database-aware health checking, preview-safe environment policy, and an HTTPS smoke runner are implemented. A real preview URL and Neon non-production migration remain an explicit external gate until provider resources are approved and verified.

Blueprint untuk aplikasi personal yang membantu pengguna melacak lamaran **kerja, magang, dan freelance** dari peluang awal sampai hasil akhir.

## Keputusan yang sudah dikunci

| Area             | Pilihan                                                       |
| ---------------- | ------------------------------------------------------------- |
| Monorepo         | pnpm workspaces + Turborepo                                   |
| API              | NestJS, REST JSON, TypeScript strict                          |
| Database         | Neon PostgreSQL, database khusus `job_tracker`                |
| Data access      | Drizzle ORM + drizzle-kit + Drizzle Studio (development only) |
| Web              | Vite, React 19, TanStack Router/Query, shadcn/ui              |
| Mobile           | Expo React Native, Expo Router, TanStack Query                |
| Auth             | Email/password, JWT access token + rotating refresh token     |
| Reminder MVP     | Email reminder terjadwal                                      |
| Visual direction | Dark tech dashboard                                           |

## Peta dokumen

1. [PRD](docs/PRD.md) — masalah, sasaran, fitur, batas MVP.
2. [Architecture](docs/ARCHITECTURE.md) — koneksi aplikasi dan struktur monorepo.
3. [Data model](docs/DATA_MODEL.md) — ERD dan aturan data.
4. [API contract](docs/API_CONTRACT.md) — endpoint REST dan payload.
5. [UX/UI design system](docs/UX_UI_DESIGN_SYSTEM.md) — layar, wireframe, tokens, komponen.
6. [User flows](docs/USER_FLOWS.md) — alur pengguna dan state aplikasi.
7. [Auth & security](docs/AUTH_SECURITY.md) — batas keamanan yang wajib.
8. [Email reminders](docs/REMINDER_EMAIL.md) — desain scheduler dan provider email.
9. [Implementation roadmap](docs/IMPLEMENTATION_ROADMAP.md) — urutan milestone.
10. [Vibe coding playbook](docs/VIBE_CODING_PLAYBOOK.md) — prompt dan aturan kerja AI.
11. [Deployment runbook](docs/DEPLOYMENT_RUNBOOK.md) — environment, Neon, dan deploy.
12. [Testing checklist](docs/TESTING_CHECKLIST.md) — syarat selesai tiap milestone.

## Prinsip proyek

- Satu NestJS modular monolith; jangan membuat microservice pada MVP.
- Semua business rule ada di API, bukan tersebar di web/mobile.
- Web dan mobile berbagi schema Zod, type, serta API path constants dari `packages/shared`.
- Drizzle Studio hanya dibuka lokal untuk inspeksi data; tidak pernah dipublikasikan.
- Fitur baru harus punya: user flow, perubahan data model, endpoint, test, dan catatan migration.

## M1 database foundation

- Shared Zod enum contracts and REST path constants live in `packages/shared`.
- The Drizzle PostgreSQL schema, initial migration, and development-only seed live in `apps/api/src/drizzle`.
- Drizzle Studio is local/development-only; it must never be exposed publicly.

### Run the local database

Docker Engine is required to start the documented local PostgreSQL service. Then, in PowerShell:

```powershell
docker compose up -d
$env:DATABASE_URL = 'postgresql://job_tracker:job_tracker_dev@localhost:5432/job_tracker'
pnpm --filter @sei/api db:migrate
pnpm --filter @sei/api db:seed
pnpm --filter @sei/api db:studio
```

The seed contains synthetic development data only; it is not a login account. Create a real account through the M2 Auth API.

## M2 Auth API

- NestJS REST routes live under `/api/v1/auth`: register, login, refresh, logout, and `me`.
- Passwords and opaque refresh tokens use Argon2id; refresh sessions are stored hashed and rotated transactionally.
- Web uses the `sei_refresh_token` `httpOnly` cookie; mobile receives a JSON refresh token for Expo SecureStore.
- Access tokens are short-lived JWTs. Auth inputs and shared platform enums are defined in `packages/shared`.
- Register, login, refresh-rotation, logout, invalid-credential, lint, typecheck, test, and build checks are covered in the M2 handoff.

See [M2 handoff](docs/HANDOFF_M2.md) for auth session details.

## M3 Application API

- NestJS REST routes live under `/api/v1/applications` for CRUD, archive/restore, soft delete, notes, contacts, and immutable activities.
- Every query is scoped by the JWT `userId`. Missing or cross-user resources return a generic 404.
- List supports `status`, `type`, `q`, `archived`, deadline range, pagination, and an allowlisted `sort`.
- Status changes write one `STATUS_CHANGED` activity; create writes `CREATED` in the same transaction.
- Moving from `WISHLIST` to `APPLIED` fills `appliedAt` when the client did not send it.

See [M3 handoff](docs/HANDOFF_M3.md) for files, verification evidence, and the remaining database/runtime gate.

## M4 Web dashboard

- Vite + React 19 dashboard memakai TanStack Router dan TanStack Query dengan dark control-room design, Lucide icon, serta komponen aksesibel berbasis Radix.
- Session web menyimpan access token hanya di memori; refresh memakai cookie `httpOnly` dan request API mengulang satu kali setelah respons `401`.
- Dashboard mengambil metrik status, deadline terdekat, dan application terbaru dari endpoint Application API yang sudah ada. Ia belum menambah endpoint summary atau reminder di luar scope M4.
- Application dapat dibuat, dicari/filter, dibuka, diubah, diarsipkan/dipulihkan, dihapus secara soft delete, serta diberi note dan contact dari UI web.

See [M4 handoff](docs/HANDOFF_M4.md) for route coverage, validation, and the database/API runtime gate.

## M5 Mobile app

- Expo Router provides native login/register, dashboard, application list/detail/create/edit, and profile routes.
- Mobile access tokens stay in React memory. Rotating refresh tokens use Expo SecureStore on native devices and are never written to AsyncStorage.
- TanStack Query shares the existing NestJS API contract, retries one request after a successful refresh, and preserves cached read-only data while offline without queueing writes.
- Application management includes search, filters, pagination, status changes, archive/restore, soft delete, notes, contacts, source links, and activity history.
- The Expo export is verified for Android, iOS, and web. A real shared-account/data run still requires a reachable API, PostgreSQL, secrets, and a phone or emulator.

See [M5 handoff](docs/HANDOFF_M5.md) for route coverage, security decisions, validation evidence, known external gates, and the M6 continuation prompt.

## M6 Reminder engine

- Authenticated reminder CRUD is ownership-scoped. A transaction-safe per-user quota limits active reminder work; pending reminders can be cancelled, and can be edited only before delivery starts.
- Nest Schedule runs every five minutes. PostgreSQL row locking with `SKIP LOCKED` claims due reminders and freezes a minimum delivery payload atomically before delivery.
- Failed sends return to `PENDING` for the next tick and stop as `FAILED` after three attempts.
- Development uses a no-send adapter. Production uses the Resend HTTP adapter with a server-only key, a 10-second request timeout, and deterministic `Idempotency-Key` per reminder.
- Email content uses the user's timezone, contains no interview notes or tokens, and links directly to the related application when present.

See [M6 handoff](docs/HANDOFF_M6.md) for the implementation map, tests, security findings, environment contract, and remaining runtime gates.

## M7 Integration tests and hardening

- `pnpm test:integration` starts an ephemeral local PostgreSQL 17 cluster, applies all Drizzle migrations, runs authenticated HTTP and scheduler E2E, then removes the isolated temporary cluster.
- The destructive E2E setup refuses any database target that is not the exact loopback `job_tracker_e2e` database and requires `DATABASE_URL` to equal `TEST_DATABASE_URL`.
- Auth, owner isolation, application/reminder CRUD, concurrent claim, retry, provider idempotency, stale `PROCESSING` recovery, and transaction-safe storage quotas are covered against real PostgreSQL.
- Release mobile builds require an explicit HTTPS API URL. Private-LAN HTTP remains available only for development builds.
- Session-creating auth requests require the documented `X-Client-Platform` header, blocking simple cross-site form login attempts.

See [M7 handoff](docs/HANDOFF_M7.md) for exact evidence, security decisions, known P2 items, and external gates.

## M8 Preview deployment candidate

- The API image is multi-stage, runs as a non-root user, contains production dependencies only, and includes the reviewed Drizzle migrations for a controlled release command.
- `GET /api/v1/health` performs a minimal PostgreSQL query and returns only `{ "status": "ok" }` when the API and database are ready.
- `APP_ENV=local|preview|production` separates deployment intent from optimized `NODE_ENV=production` builds. Preview may use the no-send email adapter; production rejects it.
- The web image builds against an explicit HTTPS API base URL and serves the SPA from non-root Nginx with fallback routing, a container health response, and baseline security headers.
- `pnpm smoke:preview` checks the deployed API/database and web shell over HTTPS without requiring an account.
- CI runs formatting, lint, typecheck, unit/integration tests, build, Drizzle check, smoke validation, dependency audit, and both container builds.

See [M8 handoff](docs/HANDOFF_M8.md) for local evidence, deployment commands, security notes, and the remaining external preview gate.
