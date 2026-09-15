# M7 Handoff — Integration tests and hardening

## Status

M7 selesai secara lokal tanpa deploy, credential provider, atau pekerjaan M8/M9. Milestone ini menambahkan E2E HTTP + PostgreSQL disposable nyata, recovery reminder `PROCESSING` yang stale, hardening authorization/validation/transport/storage, dependency remediation, dan audit flow UI kritis.

## PostgreSQL disposable dan E2E nyata

`pnpm test:integration` menggunakan paket development-only `embedded-postgres` untuk menjalankan binary PostgreSQL 17 pada `127.0.0.1` dengan port acak dan data directory hasil `mkdtemp`. Runner:

1. membuat cluster temporary dengan credential sintetis;
2. membuat database exact `job_tracker_e2e`;
3. menetapkan `DATABASE_URL` dan `TEST_DATABASE_URL` yang sama;
4. menjalankan seluruh Drizzle migration;
5. menjalankan NestJS pada port lokal acak;
6. menjalankan lima kelompok E2E serial;
7. menghentikan PostgreSQL dan menghapus hanya temporary directory yang sudah diverifikasi berada di bawah system temp.

Sebelum Nest atau query destruktif berjalan, `assertDisposableDatabaseTarget` menolak URL yang berbeda, host non-loopback, protocol non-PostgreSQL, atau nama database selain `job_tracker_e2e`. Guard ini mencegah pemanggilan test langsung men-truncate database development/preview/production.

Coverage E2E nyata:

- auth validation, register, generic login failure, refresh rotation/reuse rejection, logout revocation, dan login-CSRF form rejection;
- owner-only application GET/PATCH/DELETE, create/update/status activity, archive/restore, soft delete;
- owner-only reminder create/list/update/cancel;
- dua scheduler bersamaan dengan `FOR UPDATE SKIP LOCKED`: tepat satu claim dan satu accepted delivery;
- dua provider failure lalu success pada attempt ketiga dengan idempotency key yang sama;
- tick setelah `SENT` tidak mengirim ulang;
- stale `PROCESSING` menjadi terminal `FAILED` tanpa blind resend;
- quota persisten application, note, contact, dan total reminder dengan PostgreSQL nyata.

## Recovery reminder stale

Kebijakan ditulis di `docs/REMINDER_EMAIL.md` dan diuji sebagai pure policy sebelum schema/migration diubah. Migration `0002_tiny_killer_shrike.sql` menambah nullable `last_attempt_started_at` serta index status/timestamp.

- Claim mencatat timestamp dan memulai lease 15 menit.
- `PROCESSING` pada atau melewati cutoff, termasuk row legacy tanpa timestamp, berubah atomik ke `FAILED` dengan `PROCESSING_STALE_DELIVERY_UNKNOWN`.
- Row fresh tidak disentuh.
- Stale row tidak kembali ke `PENDING`, karena crash setelah provider menerima email tetapi sebelum commit `SENT` adalah keadaan ambigu dan blind retry dapat menggandakan email.

## Hardening yang dilakukan

- Menambahkan explicit Nest injection token untuk provider class sehingga runtime `tsx`/Vitest sama aman dengan build metadata TypeScript.
- Exception filter tetap memberi detail field Zod yang aman dan menyembunyikan unknown exception/stack sebagai `INTERNAL_ERROR`.
- `X-Client-Platform` sekarang wajib pada seluruh endpoint pembuat/pemakai session; form lintas origin sederhana ditolak sebelum cookie dibuat.
- Release Expo membutuhkan API URL HTTPS eksplisit. HTTP hanya diizinkan pada build development untuk loopback/private IPv4 LAN.
- Quota persisten per user: 1.000 application, 5.000 note, 2.000 contact, 1.000 total reminder; quota check dan insert diserialisasi dengan advisory transaction lock.
- Direct `drizzle-orm` diperbarui ke versi patched. Override transitive patch menutup advisory high `image-size` dan `multer`; PostCSS memakai versi patched. Patch reproducible `patches/metro@0.83.3.patch` mengadaptasi Metro ke API file async `image-size` 2.x sehingga Expo Android/iOS/web tetap dapat diekspor.
- CI validation sekarang menjalankan `pnpm test:integration` setelah unit test.
- Web dan mobile menjalankan build `@sei/shared` pada `pretest`, sehingga test dari clean checkout tidak bergantung pada artifact `dist` yang kebetulan sudah ada secara lokal. Koreksi ini berasal dari bukti GitHub Actions pertama untuk M7 yang gagal saat package shared belum dibangun.

## Audit security

Audit mencakup validation, secret pattern, auth/ownership query, token storage, error exposure, scheduler/provider boundary, dependency advisory, dan UI sink/action kritis.

Temuan P1 yang diperbaiki selama M7:

1. cleartext API dapat salah dikonfigurasi pada release mobile;
2. authenticated tenant dapat menumbuhkan row application/note/contact/reminder tanpa total quota;
3. integration harness awal hanya memeriksa keberadaan `TEST_DATABASE_URL`, sementara query memakai `DATABASE_URL`;
4. dependency production memiliki advisory high pada Drizzle dan transitive build/runtime packages.

Temuan P2 yang tidak memblokir gate M7:

- register masih mengembalikan conflict spesifik untuk email existing dan login belum memakai dummy Argon2 hash pada user missing; ini adalah tradeoff enumeration/privacy yang perlu keputusan produk;
- rate limiter auth masih process-local dan memerlukan shared/proxy-aware limiter sebelum horizontal production;
- dua advisory moderate tersisa berada pada dependency transitive Expo toolchain (`uuid` dan `decode-uri-component`); tidak ada source-to-sink runtime aplikasi yang tervalidasi, sehingga major override tidak dipaksakan pada M7;
- request ID masih dapat berasal dari header client dan belum ada logging middleware terstruktur; production observability tetap pekerjaan readiness terpisah.

Tidak ditemukan hardcoded production credential, raw HTML/eval sink, SQL injection pada query dinamis aplikasi, cross-user IDOR pada endpoint yang diimplementasikan, refresh token di localStorage/AsyncStorage, atau stack trace pada unknown error response.

Formal Codex Security scan `5b07f534-516b-4065-8083-6102d6e0cf7f` disegel terhadap snapshot awal M7 `cb90d13cf142f4df31609a53397b03c1d524e087`. Karena source berubah selama remediation, report immutable itu tetap menampilkan tiga high, satu medium, dan satu low pada snapshot lama. Focused post-fix review kemudian memvalidasi quota, transport mobile, login-CSRF, dan destructive test guard pada worktree final serta tidak menemukan P0/P1 tersisa. Ini sengaja dibedakan dari klaim bahwa report snapshot lama otomatis berubah menjadi hijau.

## UI critical-flow evidence

Browser lokal pada mobile-width membuktikan `/register` dan `/login` merender tanpa blank/error overlay, validasi required muncul tanpa menghapus form, navigasi antar-auth page bekerja, dan akses anonymous ke `/applications` kembali ke `/login`. Source/component review memverifikasi loading/empty/error/offline states, React text escaping, `rel=noreferrer` untuk outbound link, serta confirmation pada action destruktif web/mobile.

Real authenticated UI against the disposable API tidak dijalankan sebagai satu browser session karena database/API integration runner sengaja hidup hanya selama test. Kontrak dan behavior gabungannya dibuktikan oleh HTTP E2E, unit/component test, dan browser smoke terpisah.

## Local gate evidence — 15 September 2026

| Gate                                   | Result                                                          |
| -------------------------------------- | --------------------------------------------------------------- |
| `pnpm test:integration`                | pass: migration + 5 real PostgreSQL E2E                         |
| `pnpm audit --prod --audit-level high` | pass: zero high; two moderate transitive Expo advisories remain |
| browser smoke                          | pass: register/login/validation/auth redirect at mobile width   |
| `pnpm format:check`                    | pass                                                            |
| `pnpm lint`                            | pass: 5/5 workspace tasks                                       |
| `pnpm typecheck`                       | pass: 5/5 workspace tasks                                       |
| `pnpm test`                            | pass: API 37, shared 9, web 3, mobile 6; 55 tests total         |
| `pnpm build`                           | pass: 5/5; Expo Android/iOS/web; Vite chunk warning only        |
| `pnpm --filter @sei/api db:check`      | pass                                                            |
| `git diff --check`                     | pass                                                            |
| Codex Security baseline scan           | complete: 5 findings on pre-fix snapshot; M7 remediated P0/P1   |
| focused post-fix security review       | pass: no P0/P1 in changed hardening and E2E guard paths         |

## Honest external gates

- Tidak ada deploy preview/production, perubahan VPS/DNS, Neon/Supabase resource, atau provider email.
- Tidak ada Resend credential, verified sender domain, atau email nyata; provider fake hanya membuktikan kontrak attempt/idempotency secara lokal.
- Tidak ada real phone/tablet/emulator E2E pada M7; mobile release transport policy diuji sebagai unit dan Expo export/build gate.
- PostgreSQL concurrency sudah terbukti pada cluster lokal disposable, tetapi belum membuktikan latency/failover/topology database production.
- GitHub Actions baru menjadi bukti eksternal setelah commit dipush dan workflow selesai; local green gate bukan bukti CI remote.
- Push M7 pertama (`e3ca180`) mencapai GitHub Actions tetapi gagal pada `pnpm test` karena web/mobile belum membangun entry package shared dari clean checkout. Ini diperbaiki melalui `pretest`; status run koreksi harus diperiksa terpisah dan tidak diasumsikan dari gate lokal.

## Next milestone boundary

M8 tetap belum dimulai. Langkah berikutnya adalah memilih preview environment/database yang tidak menyentuh production, menyiapkan secret melalui provider environment, menjalankan migration satu kali, lalu smoke test web/mobile terhadap URL HTTPS preview. Itu membutuhkan approval terpisah dan tidak dikerjakan dalam M7.
