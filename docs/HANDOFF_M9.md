# M9 Handoff — Production readiness

## Status

Implementasi source M9 selesai dan seluruh gate lokal yang dapat dijalankan pada workstation ini lulus. Repository sekarang memiliki kontrak email sender production yang fail-closed, smoke runner multi-target (preview dan production), workflow release gate manual dengan GitHub environment protection, runbook backup/restore, jalur rollback terdokumentasi, dan release checklist sebagai artefak definition of done M9.

M9 belum boleh dinyatakan selesai secara operasional sampai release checklist disetujui dengan bukti eksternal: domain email terverifikasi di Resend, backup/export dan restore drill terhadap Neon, migration production lewat release command, serta `pnpm smoke:production` terhadap URL production nyata. Tidak ada credential production, DNS, atau resource provider nyata yang dibuat pada milestone ini.

Prasyarat M8 tetap berlaku: gate eksternal M8 (CI hijau pada branch, Neon non-production, smoke preview HTTPS nyata) harus ditutup lebih dahulu karena release production bergantung pada kandidat preview yang terbukti.

## Kontrak yang berubah (docs diperbarui lebih dahulu)

Sesuai guardrail, dokumen kontrak diperbarui sebelum kode diubah:

- `docs/DEPLOYMENT_RUNBOOK.md` — kontrak environment production tambahan, section domain email (§4), smoke production (§5), backup wajib sebelum migration (§6), rollback path (§7), dan checklist operasional yang menunjuk artefak baru.
- `docs/REMINDER_EMAIL.md` — validasi `EMAIL_FROM` saat boot untuk adapter Resend.
- `docs/TESTING_CHECKLIST.md` — section 5 M9 production readiness evidence; release gate menjadi section 6.

## Perubahan implementasi

### Validasi sender domain production (fail-closed)

`apps/api/src/modules/reminders/email.provider.ts`:

- `readSenderAddress(from)` memparsing `EMAIL_FROM` dalam format `Nama <alamat@domain>` maupun alamat polos; input yang tidak dapat diparse melempar error saat adapter dibuat.
- `assertVerifiedSenderDomain(from)` menolak domain placeholder — `example.com`, `example.org`, `example.net`, `localhost`, `invalid`, `test`, termasuk subdomainnya — sebelum instance Resend dibuat.
- Validasi berjalan pada `createEmailProvider` untuk `EMAIL_PROVIDER=development|resend` apa pun environment-nya, sehingga kesalahan konfigurasi sender terlihat saat boot, bukan saat reminder pertama gagal.
- Pesan error tidak memuat API key atau isi secret; hanya kontrak konfigurasi.

### Smoke runner multi-target

`scripts/preview-smoke.mjs` (nama file dipertahankan agar referensi existing tidak putus):

- Menerima tepat satu pasangan target: `PREVIEW_API_BASE_URL`+`PREVIEW_WEB_URL` atau `PRODUCTION_API_BASE_URL`+`PRODUCTION_WEB_URL`; nol atau dua pasangan sekaligus ditolak dengan pesan eksplisit.
- Validasi identik untuk kedua target: HTTPS wajib, tanpa credential/query/fragment, API base berakhir `/api/v1`, timeout 10 detik, penolakan redirect turun ke HTTP, respons health persis `{ "status": "ok" }`, dan shell HTML Sei.
- Pesan log memakai label target (`Preview`/`Production`) agar bukti smoke tidak ambigu.
- `package.json` menambah script `smoke:production`; `smoke:preview` dan `--validate-config` tidak berubah perilaku.

### Workflow release gate

`.github/workflows/release.yml` (manual `workflow_dispatch`, input `target: preview|production`):

- Berjalan pada GitHub `environment` sesuai target sehingga protection rules/reviewer environment berlaku.
- Menjalankan seluruh gate validasi: format, lint, typecheck, unit, integration, build, `db:check`, `smoke:check`, audit high, dan build kedua Docker image.
- Menolak target yang belum punya variable `API_BASE_URL`/`WEB_URL` pada environment-nya, lalu menjalankan smoke nyata: `pnpm smoke:preview` atau `pnpm smoke:production`.
- Workflow tidak melakukan deploy otomatis; deploy tetap manual mengikuti runbook agar release command migration tetap terkontrol.

### Dokumentasi baru

- `docs/RELEASE_CHECKLIST.md` — checklist release production dengan item gate source/CI, environment/secret, domain email, database/migration, smoke/observability, rollback readiness, dan tabel sign-off. Item external ditandai eksplisit.
- `docs/BACKUP_RESTORE_RUNBOOK.md` — strategi dua lapis (Neon PITR/branch snapshot + export logis `pg_dump`), frekuensi dan retensi, prosedur restore drill non-production, prosedur restore insiden production, dan larangan operasional.
- `README.md` — section M9 dan peta dokumen diperbarui.
- `AGENTS.md` — status milestone, perintah smoke, dan deskripsi CI/release gate diperbarui.
- `.env.example` — komentar kontrak email production ditambahkan tanpa mengubah nilai default local.

Tidak ada perubahan schema atau migration baru pada M9.

## Security review

Review difokuskan pada secret boundary, fail-closed behavior, bukti smoke, dan surface workflow baru.

- Tidak ada credential baru di source; `.env.example` hanya menambah komentar kontrak.
- Validasi sender production gagal tertutup saat boot dan tidak membocorkan secret pada pesan error.
- Smoke runner production memakai validasi URL yang sama ketatnya dengan preview; URL ber-credential tetap ditolak.
- `release.yml` hanya membaca URL dari GitHub environment variables (bukan secret), berjalan manual, dan tidak men-deploy; `permissions: contents: read` dipertahankan.
- Build arg web pada release gate memakai `vars.API_BASE_URL` environment target; Dockerfile tetap menolak nilai non-HTTPS.

Tidak ditemukan P0/P1 baru pada diff M9. Risiko P2 yang tetap terbuka sama dengan M8: dua advisory moderate transitive Expo (`uuid`, `decode-uri-component`), warning chunk-size bundle web, serta temuan P2 M7 (auth enumeration, rate limiter process-local, observability).

## Local gate evidence — 16 September 2026

| Gate | Result |
| --- | --- |
| `pnpm format:check` | pass |
| `pnpm lint` | pass: 5/5 workspace tasks |
| `pnpm typecheck` | pass: 5/5 workspace tasks |
| `pnpm test` | pass: 5/5 tasks; spec email provider 4/4 termasuk kasus placeholder/unparseable sender |
| `pnpm test:integration` | pass: migration + 5 real PostgreSQL E2E |
| `pnpm build` | pass: 5/5 workspace tasks |
| `pnpm --filter @sei/api db:check` | pass |
| `pnpm smoke:check` | pass |
| smoke validate-config preview | pass dengan URL HTTPS sintetis |
| smoke validate-config production | pass dengan URL HTTPS sintetis |
| smoke tanpa target / dua target sekaligus | pass: ditolak dengan pesan eksplisit |
| smoke production dengan URL HTTP | pass: ditolak (`must use HTTPS`) |
| `pnpm audit --prod --audit-level high` | pass: 0 high/critical; 2 moderate transitive Expo advisories (dikenal sejak M8) |
| `git diff --check` | pass |
| CI PR #2 (`codex/m9-production-readiness` → `main`) | pass: workflow Validate hijau (3m32s) termasuk kedua Docker build; merged ke `main` (`19a7f21`) |
| local Docker image build | pass via CI (Docker CLI tidak terpasang lokal) |
| verifikasi domain email, backup/restore drill, migration production, smoke production nyata | pending external gate |

## External gate untuk menutup M9

1. Tutup gate eksternal M8 lebih dahulu (CI hijau, Neon non-production, smoke preview HTTPS nyata).
2. Buat GitHub environments `preview` dan `production` dengan protection rules serta variable `API_BASE_URL`/`WEB_URL`; jalankan `release.yml` untuk preview.
3. Verifikasi subdomain pengirim di Resend (DKIM/SPF/DMARC) sesuai `DEPLOYMENT_RUNBOOK.md` §4.
4. Buat database Neon production `job_tracker` dengan credential terpisah dari preview.
5. Jalankan backup/export sesuai `BACKUP_RESTORE_RUNBOOK.md`, lalu release command migration production, lalu health check.
6. Deploy API (`APP_ENV=production`) dan web production; jalankan `pnpm smoke:production` dan `release.yml` target production.
7. Lakukan restore drill non-production dan simpan buktinya.
8. Isi dan setujui `RELEASE_CHECKLIST.md`; M9 selesai secara operasional hanya setelah sign-off.
