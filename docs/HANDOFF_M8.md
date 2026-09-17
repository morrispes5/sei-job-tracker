# M8 Handoff — Preview deployment candidate

## Status

Implementasi source M8 selesai dan seluruh gate lokal yang dapat dijalankan pada workstation ini lulus. Repository sekarang memiliki kandidat container API/web yang provider-agnostic, health check yang membuktikan koneksi PostgreSQL, pemisahan intent environment `local|preview|production`, smoke runner HTTPS-only, serta gate CI untuk source, database, dependency, dan image build.

M8 belum boleh dinyatakan selesai secara operasional sampai image berhasil dibangun pada CI, resource Neon non-production dan hosting preview disetujui/dibuat, migration dijalankan pada database tersebut, lalu smoke test terhadap URL HTTPS nyata lulus. Tidak ada pekerjaan M9, production deploy, DNS, domain email, backup, atau credential production yang dilakukan.

## Catatan rekonsiliasi handoff Cloud

Handoff Cloud menyebut branch `codex/m8-implementation` dan commit `23c63697ff95502b706106c990d75b20b7e8c52c`, tetapi commit tersebut tidak tersedia pada checkout lokal maupun ref remote yang dapat diperiksa. Implementasi M8 karena itu direkonstruksi dan diaudit dari `main` commit `8c19a90`, bukan diasumsikan identik dengan artifact Cloud yang tidak dapat diambil.

## Kandidat deploy yang dibuat

### API container

- `apps/api/Dockerfile` memakai multi-stage Node 22 Debian slim.
- Build menjalankan compile API dan membuat production deploy package; runtime tidak membawa dependency development.
- Runtime memakai user/group non-root `sei`, membuka port `3000`, dan menjalankan `node dist/main.js`.
- Migration SQL yang sudah direview disalin ke `dist/drizzle/migrations`; release command adalah `node dist/drizzle/migrate.js`.
- Docker healthcheck memanggil `GET /api/v1/health`.
- Layout TypeScript production dibersihkan sehingga entrypoint stabil berada di `dist/main.js`; spec dan integration harness tidak ikut artifact production.

### Web container

- `apps/web/Dockerfile` membangun Vite SPA dengan `VITE_API_BASE_URL` build arg yang wajib HTTPS, bebas credential/query/fragment, dan berakhir dengan `/api/v1`.
- Runtime memakai Nginx Alpine sebagai user non-root pada port `8080`.
- `apps/web/nginx.conf` menyediakan SPA fallback, `/health`, log stdout/stderr, temp path yang writable oleh non-root, dan security header dasar.
- Header mencakup CSP, `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `nosniff`, referrer policy, dan permissions policy.

## Health dan environment contract

`GET /api/v1/health` menjalankan query minimal `select 1` melalui `DatabaseService`. Respons sukses sengaja persis `{ "status": "ok" }`; connection string, versi database, latency, stack trace, dan detail internal tidak dikembalikan. Kegagalan database tetap memakai respons error generik API.

`APP_ENV` menerima hanya `local`, `preview`, atau `production`. Fallback kompatibilitas tetap fail-closed: bila variable tidak diisi, `NODE_ENV=production` dianggap production dan nilai lain dianggap local.

- Preview dapat berjalan optimized dengan `NODE_ENV=production`, `APP_ENV=preview`, dan email development/no-send.
- `APP_ENV=production` menolak email development/no-send dan mewajibkan provider production yang valid.
- Integration runner menetapkan `APP_ENV=local` secara eksplisit.

Tidak ada perubahan schema atau migration baru pada M8.

## Smoke runner

`pnpm smoke:preview` tidak membutuhkan akun pengguna atau credential eksternal. Runner:

1. menolak URL HTTP serta URL yang mengandung credential, query, atau fragment;
2. mewajibkan API base berakhir dengan `/api/v1`;
3. membatasi request masing-masing menjadi 10 detik dan menolak redirect turun ke HTTP;
4. memeriksa status/content type API dan respons exact `{ "status": "ok" }`;
5. memeriksa status/content type web serta application shell Sei.

`--validate-config` tersedia untuk memvalidasi kontrak URL di CI tanpa melakukan request jaringan.

## CI gate M8

Workflow validation menjalankan:

1. install frozen lockfile;
2. format, lint, typecheck, unit test, dan integration test PostgreSQL disposable;
3. build seluruh workspace dan Drizzle schema check;
4. syntax/config validation smoke runner;
5. production dependency audit dengan batas gagal high;
6. build image API dan web.

Docker CLI tidak tersedia pada workstation lokal ini. Karena itu build image bukan bukti lokal dan harus dibuktikan oleh workflow GitHub Actions setelah branch dipush.

## Bug yang ditemukan saat verifikasi

Integration run pertama menemukan `/api/v1/health` mengembalikan HTTP 500 walau migration dan query database langsung berhasil. Penyebabnya adalah dependency injection token implisit pada controller/service baru tidak konsisten dengan pola explicit token yang dipakai modul existing pada runtime test. `@Inject(HealthService)` dan `@Inject(DatabaseService)` ditambahkan; integration suite berikutnya lulus 5/5 termasuk health/database readiness.

## Security review

Review difokuskan pada secret boundary, environment fail-closed, health response, image privilege, build-time public variable, URL/redirect validation, production artifact scope, dan perubahan CI.

- Tidak ada credential provider atau production secret baru di source. Nilai PostgreSQL yang terdeteksi hanya contoh local/test sintetis yang sudah menjadi kontrak repository.
- Runtime API dan web tidak berjalan sebagai root.
- Health API tidak membocorkan metadata database atau detail internal.
- Secret server tidak dimasukkan ke image web; hanya public `VITE_API_BASE_URL` yang diterima saat build.
- Drizzle Studio tetap development-only dan tidak ada perintah untuk mempublikasikannya.
- `APP_ENV=production` gagal tertutup untuk provider email no-send.

Tidak ditemukan P0/P1 baru pada diff M8. Risiko P2 yang tetap terbuka:

- audit production melaporkan dua advisory moderate transitive Expo/mobile: `uuid` (`GHSA-w5hq-g745-h8pq`) dan `decode-uri-component` (`GHSA-vcc3-ghjq-m6fr`); gate high/critical tetap hijau dan override major tidak dipaksakan tanpa validasi kompatibilitas Expo;
- bundle web Vite sekitar 526 kB menghasilkan warning chunk-size non-blocking;
- temuan P2 M7 tentang auth enumeration, rate limiter process-local, dan observability masih berlaku dan bukan scope M8.

## Local gate evidence — 16 September 2026

| Gate | Result |
| --- | --- |
| format check dengan binary lock lokal | pass |
| `pnpm lint` equivalent fresh Turbo run | pass: 5/5 workspace tasks |
| `pnpm typecheck` equivalent fresh Turbo run | pass: 5/5 workspace tasks |
| `pnpm test` equivalent fresh Turbo run | pass: API 38, shared 9, web 3, mobile 6; 56 tests total |
| `pnpm test:integration` | pass: migration + 5 real PostgreSQL E2E, termasuk health query |
| `pnpm build` equivalent fresh Turbo run | pass: 5/5; Expo Android/iOS/web; Vite chunk warning only |
| `pnpm --filter @sei/api db:check` | pass |
| `pnpm smoke:check` | pass |
| `pnpm smoke:preview -- --validate-config` | pass dengan URL HTTPS sintetis |
| `pnpm audit --prod --audit-level high` | pass: 0 high/critical; 2 moderate transitive Expo advisories |
| secret-pattern review | pass: tidak ada credential nyata baru |
| `git diff --check` | pass |
| local Docker image build | unavailable: Docker CLI tidak terpasang; CI gate wajib |
| real preview migration dan HTTPS smoke | pending external gate |

Catatan lingkungan: pemanggilan wrapper `pnpm` pertama mendeteksi metadata `node_modules` dari instalasi sebelumnya dan mencoba purge noninteraktif. Untuk menghindari relink besar yang tidak relevan, gate format/lint/typecheck/test/build dijalankan melalui binary lock lokal dengan `CI=true`; command dan versi dependency yang diuji tetap berasal dari lockfile repository.

## External gate untuk menutup M8

1. Push branch dan pastikan GitHub Actions hijau, termasuk kedua Docker build.
2. Pilih serta setujui provider hosting preview dan Neon non-production.
3. Buat credential preview terpisah; simpan hanya pada secret manager provider.
4. Jalankan `node dist/drizzle/migrate.js` satu kali terhadap Neon non-production.
5. Deploy API dengan `APP_ENV=preview`, `NODE_ENV=production`, origin/secret preview, dan email no-send atau provider test yang disetujui.
6. Deploy web dengan API base HTTPS preview.
7. Jalankan `pnpm smoke:preview` terhadap kedua URL nyata dan simpan bukti hasilnya.
8. Bila semua hijau, tandai M8 operationally complete sebelum membuka scope M9.

## Readiness menuju M9

Source repository siap menjadi kandidat M8 dan seluruh gate lokal yang tersedia hijau. Namun readiness menuju M9 masih **conditional**, bukan final: CI container build serta migration/smoke pada Neon dan hosting preview nyata harus lulus lebih dahulu. M9 tidak boleh dimulai hanya berdasarkan build lokal atau dokumen ini.
