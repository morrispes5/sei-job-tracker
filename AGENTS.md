# Sei — Job Tracker: Panduan untuk AI Coding Agent

Berkas ini adalah kontrak kerja untuk agen AI yang mengerjakan repository ini. Baca seluruhnya sebelum mengubah kode. Bila isi berkas ini bertentangan dengan `docs/`, ikuti `docs/` dan usulkan pembaruan berkas ini.

## 1. Gambaran proyek

**Sei — Job Tracker** adalah aplikasi personal untuk melacak lamaran kerja, magang, dan freelance dari peluang awal sampai hasil akhir. Aplikasi dibangun sebagai monorepo dengan tiga klien/server yang berbagi kontrak API:

- **API**: NestJS 11 modular monolith (TypeScript strict), REST JSON di bawah prefix global `/api/v1`, Drizzle ORM + PostgreSQL, autentikasi email/password dengan JWT access token berumur pendek + refresh token opaque yang berotasi.
- **Web**: Vite + React 19 dashboard dark, TanStack Router/Query, Tailwind CSS v4, komponen Radix/shadcn-style.
- **Mobile**: Expo (React Native) + Expo Router, TanStack Query; refresh token disimpan di `expo-secure-store`.
- **Shared**: `packages/shared` berisi Zod schemas, enum, tipe DTO, dan konstanta path API yang dipakai ketiga bagian.
- **Reminder engine**: Nest Schedule (tick tiap 5 menit) mengklaim due reminder dengan PostgreSQL row locking `SKIP LOCKED`; email via provider adapter (development no-send / Resend di production).

Status saat ini: milestone **M1–M9 sudah terimplementasi** (M9 = *production readiness*: validasi sender domain production fail-closed, smoke runner multi-target preview/production, workflow release gate manual, backup/restore runbook, release checklist). Gate eksternal yang masih terbuka: URL preview HTTPS nyata, migration ke Neon non-production, deploy production nyata, verifikasi domain email, dan restore drill Neon.

## 2. Sumber kebenaran

Sebelum mengubah kode, baca berkas ini berurutan:

1. `README.md`
2. `docs/ARCHITECTURE.md`
3. `docs/IMPLEMENTATION_ROADMAP.md`
4. Dokumen paling relevan dengan tugas: `DATA_MODEL.md`, `API_CONTRACT.md`, `UX_UI_DESIGN_SYSTEM.md`, `AUTH_SECURITY.md`, `REMINDER_EMAIL.md`, `DEPLOYMENT_RUNBOOK.md`, `BACKUP_RESTORE_RUNBOOK.md`, atau `RELEASE_CHECKLIST.md`.
5. `docs/HANDOFF_M2.md` sampai `docs/HANDOFF_M9.md` untuk konteks keputusan milestone sebelumnya.
6. `docs/TESTING_CHECKLIST.md` untuk definisi "selesai" dan bukti yang diwajibkan.

## 3. Struktur monorepo

```text
job-tracker/
├── apps/
│   ├── api/                  # @sei/api — NestJS REST API
│   │   ├── src/modules/      # auth, applications, reminders, health
│   │   │                     # pola per modul: *.module/controller/service/repository + *.spec.ts
│   │   ├── src/common/       # config environment, ApiExceptionFilter global
│   │   ├── src/drizzle/      # schema.ts, migrations/, seed.ts, migrate.ts, database module/service
│   │   ├── src/integration/  # harness E2E PostgreSQL disposable + database guard
│   │   ├── Dockerfile        # image production multi-stage
│   │   └── drizzle.config.ts
│   ├── web/                  # @sei/web — Vite React SPA
│   │   ├── src/app.tsx       # definisi route TanStack Router
│   │   ├── src/pages.tsx     # halaman dashboard/login/register/applications
│   │   ├── src/auth/         # auth provider (access token di memory, retry sekali setelah 401)
│   │   ├── src/lib/          # client API, helper presentasi
│   │   ├── src/components/   # app-shell, application-form, ui.tsx (komponen dasar)
│   │   └── Dockerfile + nginx.conf
│   └── mobile/               # @sei/mobile — Expo Router (RN)
│       ├── app/              # route file-based: login, register, (tabs)/dashboard, applications, application/*
│       └── src/              # auth (SecureStore), components, lib/api.ts, theme
├── packages/
│   ├── shared/               # @sei/shared — Zod schemas, enum, tipe, apiPaths (pure, tanpa query DB/secret)
│   └── config/               # tsconfig.base.json yang di-extend semua workspace
├── scripts/preview-smoke.mjs # smoke runner HTTPS-only untuk deployment preview
├── docs/                     # semua dokumen sumber kebenaran (bahasa Indonesia)
├── docker-compose.yml        # PostgreSQL 17 lokal saja (bukan seluruh stack)
├── .github/workflows/validate.yml
├── pnpm-workspace.yaml, turbo.json, eslint.config.mjs, package.json
└── tests/e2e/                # placeholder Playwright (belum terisi)
```

## 4. Toolchain dan prasyarat

- **Node.js >= 22.0.0**, **pnpm 11.25.0** (ter-pin via `packageManager` di root; Docker memakai corepack).
- TypeScript 5.9 **strict** dengan `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride` (`packages/config/tsconfig.base.json`).
- ESLint 9 flat config (`eslint.config.mjs` di root); aturan `@typescript-eslint/no-explicit-any` = **error**.
- Prettier untuk format (hanya `format:check` di root; tidak ada auto-format script).
- Vitest untuk unit test; `tsx` untuk menjalankan script/migration/dev API.
- Drizzle Kit untuk schema/migration/Studio; `embedded-postgres` 17 untuk integration test.
- Dependency lifecycle scripts dibatasi via `onlyBuiltDependencies`/`allowBuilds` di `pnpm-workspace.yaml`; patch `patches/metro@0.83.3.patch` wajib ikut tersalin saat build Docker.

## 5. Perintah penting

Semua dijalankan dari root repository kecuali disebutkan lain.

| Perintah | Fungsi |
| --- | --- |
| `pnpm install` | Install workspace (CI memakai `--frozen-lockfile`) |
| `pnpm dev` | Jalankan semua dev server parallel via turbo (API `tsx watch`, web Vite, mobile Expo) |
| `pnpm build` | Build seluruh workspace via turbo |
| `pnpm lint` / `pnpm typecheck` | ESLint dan `tsc --noEmit` semua workspace |
| `pnpm test` | Unit test Vitest semua workspace (`--passWithNoTests`) |
| `pnpm test:integration` | E2E API + scheduler terhadap PostgreSQL 17 disposable (lihat §7) |
| `pnpm format:check` | Cek Prettier untuk `apps/`, `packages/`, `scripts/`, root config, `.github/` |
| `pnpm smoke:check` | Validasi syntax `scripts/preview-smoke.mjs` (`node --check`) |
| `pnpm smoke:preview` | Smoke test deployment preview via HTTPS (butuh `PREVIEW_API_BASE_URL` + `PREVIEW_WEB_URL`) |
| `pnpm smoke:production` | Smoke test production via HTTPS (butuh `PRODUCTION_API_BASE_URL` + `PRODUCTION_WEB_URL`) |

Database lokal (butuh Docker Engine):

```powershell
docker compose up -d   # postgres:17-alpine, port 5432, db/user/password: job_tracker
```

Perintah database API (`pnpm --filter @sei/api ...`):

| Script | Fungsi |
| --- | --- |
| `db:migrate` | Jalankan migration via `tsx src/drizzle/migrate.ts` |
| `db:migrate:prod` | Release command di container: `node dist/drizzle/migrate.js` |
| `db:generate` | Generate migration baru dari `schema.ts` via drizzle-kit |
| `db:check` | Validasi konsistensi schema vs migration files |
| `db:seed` | Seed data sintetis development (bukan akun login) |
| `db:studio` | Drizzle Studio — **lokal/development saja, jangan pernah dipublikasikan** |

Environment contract ada di `.env.example` dan `docs/DEPLOYMENT_RUNBOOK.md`. Nilai default lokal: `DATABASE_URL=postgresql://job_tracker:job_tracker_dev@localhost:5432/job_tracker`, API port 3000, web port 5173.

## 6. Konvensi kode

- **Controller tipis**: controller hanya menerima HTTP dan mendelegasi; business rules di service; query Drizzle hanya di repository/query layer (`*.repository.ts`) atau `src/drizzle/database.service.ts`.
- **Pola modul Nest konsisten**: tiap module memiliki `*.module.ts`, controller, service, repository, konstanta, dan spec. Gunakan **explicit `@Inject(Token)`** pada constructor injection (keputusan M8; injection implisit pernah menyebabkan bug health check).
- **Ownership wajib**: setiap query resource di-scope dengan `user_id` dari JWT `userId`. Resource milik user lain atau tidak ada mengembalikan **404 generik** (bukan 403), agar tidak membocorkan keberadaan data.
- **Validasi final di API** memakai Zod schema dari `@sei/shared`; body request diterima sebagai `unknown` lalu diparse di service. Web/mobile hanya melakukan validasi UX awal.
- **Kontrak shared**: Zod schema, enum, DTO type, dan `apiPaths` hanya di `packages/shared`. Tidak boleh ada query database, secret, atau kode Node/DOM di sana.
- **Format error tunggal**: `{ "error": { "code", "message", "fields"? } }` via `ApiExceptionFilter` global.
- **Auth**: semua request auth yang membuat/memakai session wajib header `X-Client-Platform: web|mobile`. Web menerima refresh token via cookie `httpOnly` `sei_refresh_token` (path `/api/v1/auth`, `secure` di production); mobile menerima JSON dan menyimpan di SecureStore. Access token hanya di memory.
- **Style**: TypeScript strict tanpa `any`; komentar kode dalam bahasa Inggris; dokumentasi dalam bahasa Indonesia (ikut gaya berkas yang ada). Test kolokasi dengan kode: `*.spec.ts` untuk service API, `*.test.ts` untuk shared/lib.
- **Commit**: `feat(applications): add create and list endpoints` (conventional commits, scope nama module).
- **Migration tidak pernah diedit setelah dipakai** — buat migration baru via `db:generate`.

## 7. Strategi testing

- **Unit (Vitest)**: service API (`auth.service.spec.ts`, `applications.service.spec.ts`, `reminders.*.spec.ts`, `health.service.spec.ts`), shared (`application.test.ts`, `reminder.test.ts`), helper presentasi web/mobile. Jalankan `pnpm test`.
- **Integration/E2E (`pnpm test:integration`)**: harness `apps/api/src/integration/run-postgres-e2e.ts` men-start cluster **embedded PostgreSQL 17** sementara, menerapkan seluruh migration Drizzle, menjalankan E2E HTTP terautentikasi (`api-postgres.e2e.ts`) dan skenario scheduler, lalu menghapus cluster. Guard `disposable-database.guard.ts` **menolak target selain database loopback persis bernama `job_tracker_e2e`** dan mewajibkan `DATABASE_URL` = `TEST_DATABASE_URL`. E2E memakai fake email provider yang membedakan attempt vs accepted delivery untuk membuktikan retry dan idempotency.
- **Smoke deployment**: `scripts/preview-smoke.mjs` menerima tepat satu pasangan target — `PREVIEW_API_BASE_URL`+`PREVIEW_WEB_URL` (`pnpm smoke:preview`) atau `PRODUCTION_API_BASE_URL`+`PRODUCTION_WEB_URL` (`pnpm smoke:production`). Runner menolak URL HTTP dan URL ber-credential/query/fragment, mewajibkan API base berakhir `/api/v1`, membatasi timeout 10 detik, dan memeriksa respons health persis `{ "status": "ok" }` + shell HTML Sei. Mode `--validate-config` memvalidasi konfigurasi tanpa request jaringan.
- **Definisi selesai sebuah milestone** (`docs/TESTING_CHECKLIST.md`): lint, typecheck, test relevan, migration check, dan manual smoke flow lulus; bug P0/P1 diperbaiki, P2 dicatat sebagai issue berprioritas. Setelah semua hijau, laporkan: berkas yang berubah, perintah yang dijalankan, hasil test, dan known follow-ups.

## 8. CI dan deployment

- **CI** (`.github/workflows/validate.yml`, berjalan di PR dan push ke `main`): `format:check` → `lint` → `typecheck` → `test` → `test:integration` → `build` → `db:check` → `smoke:check` → `smoke:preview --validate-config` → `pnpm audit --prod --audit-level high` → `docker build` image API dan web.
- **Release gate** (`.github/workflows/release.yml`, manual `workflow_dispatch` dengan input target `preview|production`): menjalankan seluruh gate validasi di atas plus build image dan smoke nyata terhadap target; URL target diambil dari variable `API_BASE_URL`/`WEB_URL` pada GitHub environment yang bersangkutan (protection rules berlaku) dan gate gagal bila URL belum diisi.
- **Image API** (`apps/api/Dockerfile`): multi-stage Node 22 slim, production deps only, user non-root `sei`, port 3000, healthcheck `GET /api/v1/health`, migration tersalin ke `dist/drizzle/migrations`. Release command: `node dist/drizzle/migrate.js`; start command: `node dist/main.js`.
- **Image web** (`apps/web/Dockerfile`): build arg `VITE_API_BASE_URL` **wajib HTTPS, tanpa credential/query/fragment, berakhir `/api/v1`**; runtime nginx non-root port 8080 dengan `/health`, SPA fallback, dan security headers (CSP, `frame-ancestors 'none'`, `nosniff`, dll).
- **Environment intent**: `APP_ENV=local|preview|production`, terpisah dari `NODE_ENV`. `APP_ENV=production` **fail-closed**: menolak email provider development/no-send dan mewajibkan provider production (Resend) + key server-side + `APP_BASE_URL` HTTPS. Preview boleh `NODE_ENV=production` + `APP_ENV=preview` + email no-send.
- Database: lokal Docker PostgreSQL, preview/production Neon. Migration production dijalankan satu kali oleh release command terkontrol, lalu health check; jangan pernah drop table/rollback SQL sembarangan.
- Mobile: release build mewajibkan HTTPS API URL; HTTP LAN privat hanya untuk development build (`expo export`).

## 9. Keamanan

- Jangan pernah menaruh secret di client code, git, test fixture, log, atau response. Hanya variable `VITE_*` dan `EXPO_PUBLIC_*` yang boleh masuk client; database URL, JWT secret, dan email API key hanya di runtime API. `.env` di-gitignore; `.env.example` adalah kontrak publiknya.
- Password dan refresh token di-hash **Argon2id**; refresh token berotasi transactional dan disimpan sebagai hash. Jangan log password, token, header authorization, atau connection string.
- `GET /api/v1/health` mengembalikan persis `{ "status": "ok" }` — tanpa connection string, versi DB, latency, atau stack trace.
- Drizzle Studio hanya untuk inspeksi lokal/development; jangan tambahkan cara mengeksposnya.
- Semua action destruktif di UI wajib konfirmasi; form mempertahankan isi saat API error.

## 10. Guardrails tetap

- Kerjakan **satu milestone atau satu tugas eksplisit** saja; jangan scaffold milestone berikutnya lebih awal, jangan mencampur refactor besar antar-milestone.
- **Jangan memperkenalkan** Prisma, Next.js, Redux, microservices, Redis, BullMQ, atau dependency baru tanpa diminta user atau tanpa pembaruan docs terlebih dahulu.
- Bila implementasi menuntut perubahan kontrak terdokumentasi (schema, API, arsitektur): **stop, usulkan pembaruan docs dulu**, baru ubah kode.
- Bila menemukan ambiguity: update docs terlebih dahulu sebelum mengubah kode.
- Jangan memindahkan business logic ke client, jangan mengirim email dari controller, jangan mengubah data/schema production langsung via Studio atau SQL.
- Sebelum selesai: jalankan lint, typecheck, dan test yang relevan; laporkan hasilnya secara eksplisit.
