# Vibe Coding Playbook

## 1. Aturan prompt tetap

Tempelkan konteks ini pada setiap sesi implementasi baru:

```text
Project: Job Tracker monorepo. Follow docs in /docs as source of truth.
Stack: pnpm + Turborepo; NestJS + Drizzle + PostgreSQL; Vite React; Expo.
Rules: TypeScript strict, no Prisma, no Next.js, no Redux, no microservices.
Do not change schema/API contract/architecture without proposing a docs update first.
Work only on the requested milestone. Inspect current files before editing.
Use migrations for schema changes. Run the relevant lint/test after edits.
At the end report: changed files, commands run, test results, and known follow-ups.
```

## 2. Prompt template per task

```text
Implement [MILESTONE/TASK] from docs/IMPLEMENTATION_ROADMAP.md.

Read first: [LIST DOCS].
Scope: [EXACT OUTCOME].
Out of scope: [WHAT MUST NOT CHANGE].
Acceptance criteria:
- [CRITERION]
- [CRITERION]

Before editing, give a short implementation plan. Then implement, test, and summarize.
```

## 3. Urutan prompt yang dianjurkan

1. “Scaffold M0 sesuai Architecture dan buat CI/lint/TS strict.”
2. “Implement M1 schema Drizzle dan migration local; jangan buat endpoint.”
3. “Implement M2 auth; sertakan unit/integration tests.”
4. “Implement M3 application domain satu subtask: CRUD, lalu notes/contacts, lalu activities.”
5. “Implement M4 web berdasarkan UX design system; gunakan API M3, bukan mock final.”
6. “Implement M5 mobile yang memakai contract sama.”
7. “Implement M6 reminder dan provider adapter.”

## 4. Prompt review sebelum merge

```text
Review perubahan milestone ini terhadap docs sebagai senior backend/frontend reviewer.
Cari: pelanggaran ownership, token insecure, drift schema/API, N+1 query,
missing validation, error handling, dan UI states yang belum ditangani.
Jangan ubah kode. Beri temuan P0/P1/P2 dengan file dan rekomendasi fix terkecil.
```

## 5. Hal yang dilarang dari AI

- Jangan memindahkan business logic ke client demi “lebih cepat”.
- Jangan memasang paket baru tanpa alasan dan catatan di README/PR.
- Jangan mengubah database langsung via Drizzle Studio atau SQL production.
- Jangan membuat email sending di controller.
- Jangan membocorkan `.env`, token, database URL, atau credential ke commit/log.
