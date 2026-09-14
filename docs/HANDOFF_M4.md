# Handoff M4 — Web dashboard dan application management

## Status

M4 selesai di atas API M1–M3: dashboard web `Sei` sekarang tersedia sebagai Vite + React 19 application. Implementasi tetap berada pada scope web dashboard/forms; tidak ada scheduler reminder, calendar screen, mobile implementation, perubahan database, ataupun endpoint API baru.

## Yang dikerjakan

### Fondasi web

- Menambahkan TanStack Router untuk route web dan TanStack Query untuk query/cache API.
- Menambahkan Tailwind CSS v4, komponen UI dark control-room, Lucide icons (tanpa emoji), dan dialog konfirmasi berbasis Radix.
- Menambahkan API client JSON ke `/api/v1` dengan `X-Client-Platform: web`, credentials cookie, error yang dapat ditindaklanjuti, dan Bearer access token.
- Access token hanya tersimpan di React state/memory. Saat aplikasi dimuat, web mencoba refresh token melalui cookie `sei_refresh_token`; pada respons `401`, satu request diulang setelah refresh. Jika gagal, user kembali anonymous/login. Tidak ada token di `localStorage` atau source code.
- Shared DTO untuk session web dan response application ditambahkan ke `packages/shared` agar UI tetap mengikuti contract API M2/M3.

### Route dan alur pengguna

| Route                    | Fungsi                                                                                                           |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `/login`                 | Login email/password dan tautan ke register.                                                                     |
| `/register`              | Membuat akun, lalu masuk ke dashboard.                                                                           |
| `/`                      | Dashboard: kartu count per status, deadline mendatang, dan application terbaru.                                  |
| `/applications`          | Daftar application dengan pencarian, filter status/jenis, archive view, dan pagination.                          |
| `/applications/new`      | Form create application dengan validasi Zod/RHF.                                                                 |
| `/applications/:id`      | Detail, update status, activity timeline, notes, contacts, archive/restore, serta soft delete dengan konfirmasi. |
| `/applications/:id/edit` | Form edit application.                                                                                           |

- Form memetakan nilai kosong ke `null` untuk field optional seperti work mode dan datetime agar sesuai API contract.
- Error API mempertahankan nilai form yang sedang diisi. Empty states menyertakan CTA membuat application.
- Navigasi desktop menggunakan sidebar dan mobile menggunakan bottom navigation; list dirancang menjadi kartu pada layar kecil agar tidak memerlukan horizontal scroll.

### Keputusan dashboard

M3 belum menyediakan `GET /dashboard/summary`, sehingga M4 menghitung kartu status dari `meta.total` hasil filter `GET /applications` yang sudah disediakan API. Deadline mendatang dan recent application juga memakai endpoint list yang sama. Keputusan ini mempertahankan scope M4 dan tidak memperkenalkan backend dashboard/reminder yang merupakan pekerjaan milestone berikutnya.

## File utama

```text
apps/web/src/app.tsx
apps/web/src/auth/auth-provider.tsx
apps/web/src/components/app-shell.tsx
apps/web/src/components/application-form.tsx
apps/web/src/components/ui.tsx
apps/web/src/lib/api.ts
apps/web/src/lib/presentation.ts
apps/web/src/pages.tsx
packages/shared/src/application.ts
packages/shared/src/auth.ts
```

## Verifikasi

| Check                   | Hasil                                                                                                                                                                                   |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm.cmd format:check` | Lulus                                                                                                                                                                                   |
| `pnpm.cmd lint`         | Lulus untuk seluruh monorepo                                                                                                                                                            |
| `pnpm.cmd typecheck`    | Lulus untuk seluruh monorepo                                                                                                                                                            |
| `pnpm.cmd test`         | Lulus: shared 6, API 12, web 3 test                                                                                                                                                     |
| `pnpm.cmd build`        | Lulus untuk API, web Vite, mobile Expo web, shared, dan config                                                                                                                          |
| MCP browser             | Local preview memverifikasi login desktop, route `/register`, serta formulir register pada viewport 390 × 844. API refresh gagal aman ke state anonymous saat API lokal belum berjalan. |

Build Vite memberi peringatan chunk JavaScript sekitar 526 kB setelah minify. Ini bukan kegagalan build; optimasi code splitting dapat dipertimbangkan setelah scope M4, bila kebutuhan performa memerlukannya.

## Runtime gate yang belum diklaim

- Docker/PostgreSQL lokal belum tersedia pada workspace sebelumnya. API memerlukan `DATABASE_URL` dan `JWT_ACCESS_SECRET`, sehingga register/login serta CRUD terhadap database nyata belum dapat diuji end-to-end di sesi ini.
- Karena itu, UI dan type contract telah tervalidasi, tetapi keberhasilan operasi data nyata baru dapat diklaim setelah menjalankan database, migration/seed, API, lalu smoke test web dengan akun baru.
- Calendar, reminder email, offline queue, dan dashboard API summary tidak ditambahkan; jangan menganggapnya selesai pada M4.

## Langkah berikutnya

1. Jalankan PostgreSQL dan API sesuai README, lalu lakukan smoke test register, create, edit/status, notes/contacts, archive/restore, dan soft delete dari web.
2. Lanjutkan M5 untuk mobile Expo Router dengan contract API yang sama.
