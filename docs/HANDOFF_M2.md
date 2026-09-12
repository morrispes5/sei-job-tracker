# Handoff M2 — Auth API

## Status

M2 Auth API sudah diimplementasikan di branch `main` dan siap menjadi dasar M3 Application API. Tidak ada perubahan schema baru pada M2 karena tabel `users` dan `refresh_tokens` sudah tersedia dari migration M1.

## Yang dikerjakan

### Shared contract

- Menambah `packages/shared/src/auth.ts` untuk schema Zod register, login, refresh, password, email normalisasi lowercase, dan allowlist platform `web|mobile`.
- Menambah test shared untuk validasi platform dan normalisasi email.

### API NestJS

- Menambah `DatabaseModule` dan `DatabaseService` global untuk koneksi Drizzle/PostgreSQL dan graceful shutdown.
- Menambah `AuthModule` dengan controller, service, repository, JWT Passport strategy, dan rate limiter.
- Endpoint yang aktif di bawah global prefix `/api/v1`:
  - `POST /auth/register`
  - `POST /auth/login`
  - `POST /auth/refresh`
  - `POST /auth/logout`
  - `GET /auth/me`
- Password di-hash dengan Argon2id.
- Refresh token berupa token opaque dengan UUID session prefix. Hanya hash Argon2id yang disimpan di database.
- Refresh memakai transaksi: token lama di-revoke dan token baru dibuat atomik. Token lama tidak bisa dipakai ulang.
- Guard JWT memvalidasi access token bertipe `access` dan `/auth/me` mengambil user dari `sub` JWT.
- Web menerima refresh token melalui cookie `sei_refresh_token` (`httpOnly`, `sameSite=lax`, `secure` saat production); mobile menerima refresh token di JSON.
- Register/login/refresh diberi rate limit process-local 10 percobaan per IP/action per menit.
- Filter error menyatukan response validation, auth, conflict, rate-limit, dan internal error tanpa stack trace ke client.

### Dokumentasi kontrak

- `docs/API_CONTRACT.md` diperjelas untuk request register, header `X-Client-Platform`, cookie web, body mobile, dan aturan rotasi.
- `docs/AUTH_SECURITY.md` mencatat bahwa refresh token di-hash Argon2id dan dirotasi.
- README diperbarui ke status M2 dan menunjuk ke handoff ini.

## File utama

```text
apps/api/src/modules/auth/auth.controller.ts
apps/api/src/modules/auth/auth.service.ts
apps/api/src/modules/auth/auth.repository.ts
apps/api/src/modules/auth/auth.service.spec.ts
apps/api/src/modules/auth/jwt.strategy.ts
apps/api/src/modules/auth/auth.rate-limiter.ts
apps/api/src/common/filters/api-exception.filter.ts
apps/api/src/drizzle/database.module.ts
apps/api/src/drizzle/database.service.ts
packages/shared/src/auth.ts
```

## Verifikasi

| Check                                 | Hasil                                                              |
| ------------------------------------- | ------------------------------------------------------------------ |
| `pnpm.cmd format:check`               | Lulus                                                              |
| `pnpm.cmd lint`                       | Lulus                                                              |
| `pnpm.cmd typecheck`                  | Lulus                                                              |
| `pnpm.cmd test`                       | Lulus: shared 4 test, auth service 4 test, package tanpa test pass |
| `pnpm.cmd build`                      | Lulus: API, web Vite, mobile Expo web, shared, config              |
| `pnpm.cmd --filter @sei/api db:check` | Lulus                                                              |
| `pnpm.cmd install`                    | Lulus; lockfile diperbarui                                         |

Test unit auth menggunakan repository in-memory sehingga tidak menyimpan token atau secret nyata. Cakupannya register + normalisasi email, invalid credential, refresh rotation, dan logout revoke.

## Runtime gate yang belum diverifikasi

- API membutuhkan `DATABASE_URL` saat startup. Migration M1 harus sudah dijalankan ke PostgreSQL sebelum smoke test HTTP.
- Pada workspace ini Docker Engine tidak tersedia dan koneksi lokal `localhost:5432` belum aktif, sehingga `db:migrate`, seed, dan E2E HTTP terhadap database belum diklaim lulus.
- Rate limiter M2 masih in-memory per process; deployment multi-instance memerlukan hardening terkoordinasi di milestone keamanan berikutnya tanpa mengubah kontrak endpoint.
- `JWT_ACCESS_SECRET` dan `JWT_REFRESH_SECRET` minimal 32 karakter diwajibkan saat `NODE_ENV=production`; gunakan secret unik per environment dan jangan commit nilainya.

## Cara menjalankan setelah PostgreSQL tersedia

```powershell
docker compose up -d
$env:DATABASE_URL = 'postgresql://job_tracker:job_tracker_dev@localhost:5432/job_tracker'
$env:JWT_ACCESS_SECRET = 'local-only-use-a-long-random-value-here'
pnpm --filter @sei/api db:migrate
pnpm --filter @sei/api dev
```

Gunakan `X-Client-Platform: web` untuk browser atau `mobile` untuk Expo. Jangan menaruh refresh token mobile di AsyncStorage; gunakan Expo SecureStore sesuai kontrak.

## Next handoff — M3

Implementasikan Application API sesuai `docs/API_CONTRACT.md`: CRUD application, filter/pagination, notes, contacts, activities, serta ownership query dengan `user_id` dari JWT. Jangan mengubah schema atau kontrak M2 tanpa update docs dan migration yang sesuai.
