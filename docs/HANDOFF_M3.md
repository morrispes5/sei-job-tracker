# Handoff M3 — Application API

## Status

M3 Application API sudah diimplementasikan di branch `main` di atas M2 Auth. Tidak ada perubahan schema/migration baru; tabel `applications`, `application_notes`, `application_contacts`, dan `application_activities` sudah tersedia dari M1.

## Yang dikerjakan

### Shared contract

- Menambah Zod schema create/update application, query list (filter, pagination, sort allowlist), note body, contact, UUID resource, dan HTTP URL `https?`.
- Menambah enum activity `CREATED`, `STATUS_CHANGED`, `UPDATED`, `ARCHIVED`, `RESTORED`, `DELETED`.
- Test shared untuk payload create, URL, activity type, default query, dan batas `limit`.

### API NestJS

- Menambah `ApplicationsModule` dengan controller, service, dan repository Drizzle.
- Endpoint di bawah global prefix `/api/v1`, semua memakai JWT Bearer:
  - `GET/POST /applications`
  - `GET/PATCH/DELETE /applications/:id`
  - `POST /applications/:id/archive`
  - `POST /applications/:id/restore`
  - `GET/POST /applications/:id/notes` dan `PATCH/DELETE .../notes/:noteId`
  - `GET/POST /applications/:id/contacts` dan `PATCH/DELETE .../contacts/:contactId`
  - `GET /applications/:id/activities`
- Setiap query resource memakai `user_id` dari JWT. Record milik user lain atau yang `deletedAt` terisi mengembalikan 404 generik.
- List default menyembunyikan archive; `archived=true` menampilkan arsip. Soft delete tidak muncul di list maupun detail.
- Create menulis application + activity `CREATED` dalam satu transaction.
- Perubahan status menulis tepat satu activity `STATUS_CHANGED`. Transisi ke `APPLIED` mengisi `appliedAt` (tanggal UTC) jika belum ada.
- Child resource selalu cek ownership parent terlebih dahulu. Activity bersifat immutable.

### Dokumentasi

- `docs/API_CONTRACT.md` memperjelas query list, pagination, sort, activity, dan ownership 404.
- README diperbarui ke status M3.

## File utama

```text
apps/api/src/modules/applications/applications.controller.ts
apps/api/src/modules/applications/applications.service.ts
apps/api/src/modules/applications/applications.repository.ts
apps/api/src/modules/applications/applications.service.spec.ts
apps/api/src/modules/applications/applications.module.ts
packages/shared/src/application.ts
```

## Verifikasi

| Check                                 | Hasil                                                                 |
| ------------------------------------- | --------------------------------------------------------------------- |
| `pnpm.cmd format:check`               | Lulus                                                                 |
| `pnpm.cmd lint`                       | Lulus                                                                 |
| `pnpm.cmd typecheck`                  | Lulus                                                                 |
| `pnpm.cmd test`                       | Lulus: shared 6 test, API 12 test (8 application + 4 auth)            |
| `pnpm.cmd build`                      | Lulus: API, web Vite, mobile Expo web, shared, config                 |
| `pnpm.cmd --filter @sei/api db:check` | Lulus (`Everything's fine`)                                           |

Test unit application memakai repository in-memory. Cakupannya: validasi create, ownership 404, filter type/status/search milik owner, satu activity `STATUS_CHANGED`, auto-fill `appliedAt`, archive/restore, soft delete, notes di belakang parent, dan UUID invalid.

## Runtime gate yang belum diverifikasi

- API tetap membutuhkan `DATABASE_URL` dan `JWT_ACCESS_SECRET` saat startup.
- Docker/PostgreSQL lokal belum tersedia di workspace ini, sehingga `db:migrate`, seed, dan smoke HTTP terhadap database belum diklaim lulus.
- Reminder email dan dashboard summary sengaja tidak dikerjakan; itu M6 dan M4.

## Next handoff — M4

Implementasikan web dashboard (Vite + React 19 + TanStack Router/Query + Tailwind/shadcn) yang memakai Auth API dan Application API nyata. Jangan scaffold reminder scheduler.
