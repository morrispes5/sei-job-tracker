# Sei — Job Tracker

<p align="center">
  <img src="apps/web/public/sei-mark.svg" width="96" alt="Sei abstract compass logo" />
</p>

> **Search. Evaluate. Iterate.**

**Sei** is the personal command center for tracking job, internship, and freelance applications. The name captures the loop behind a thoughtful job search: collect an opportunity, evaluate the next move, and improve with every outcome.

This repository currently implements **M0 — Repository foundation**. Product features begin only in their assigned milestones.

Blueprint untuk aplikasi personal yang membantu pengguna melacak lamaran **kerja, magang, dan freelance** dari peluang awal sampai hasil akhir.

## Keputusan yang sudah dikunci

| Area | Pilihan |
| --- | --- |
| Monorepo | pnpm workspaces + Turborepo |
| API | NestJS, REST JSON, TypeScript strict |
| Database | Neon PostgreSQL, database khusus `job_tracker` |
| Data access | Drizzle ORM + drizzle-kit + Drizzle Studio (development only) |
| Web | Vite, React 19, TanStack Router/Query, shadcn/ui |
| Mobile | Expo React Native, Expo Router, TanStack Query |
| Auth | Email/password, JWT access token + rotating refresh token |
| Reminder MVP | Email reminder terjadwal |
| Visual direction | Dark tech dashboard |

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
