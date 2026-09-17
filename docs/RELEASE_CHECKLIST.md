# Release Checklist — Production

Checklist ini adalah definition of done M9. Production dinyatakan rilis hanya setelah seluruh item dicentang dan disetujui oleh pemilik repository. Item bertanda _(external)_ membutuhkan resource/provider nyata dan tidak dapat dibuktikan dari source repository.

## 1. Gate source dan CI

- [ ] Commit release berada pada branch yang direview dan CI `validate.yml` hijau penuh (format, lint, typecheck, unit, integration, build, `db:check`, smoke config, audit high, kedua Docker build).
- [ ] `pnpm smoke:preview -- --validate-config` dan `pnpm smoke:production -- --validate-config` lulus dengan URL target nyata.
- [ ] Tidak ada advisory dependency high/critical pada `pnpm audit --prod --audit-level high`.
- [ ] Tidak ada bug P0/P1 terbuka; bug P2 tercatat sebagai issue berprioritas.

## 2. Environment dan secret _(external)_

- [ ] `APP_ENV=production`, `NODE_ENV=production` pada runtime API production.
- [ ] Credential production (`DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `EMAIL_PROVIDER_API_KEY`) berbeda dari preview dan tersimpan hanya di secret manager provider.
- [ ] `WEB_ORIGIN` dan `APP_BASE_URL` memakai domain HTTPS production yang benar.
- [ ] Tidak ada secret di client code, git, log, atau response; hanya `VITE_*`/`EXPO_PUBLIC_*` yang masuk client.

## 3. Domain email _(external)_

- [ ] Subdomain pengirim khusus (misalnya `notify.morriztech.cloud`) berstatus `verified` di Resend.
- [ ] Record DKIM terpasang dan lolos verifikasi provider.
- [ ] Record SPF terpasang pada subdomain pengirim.
- [ ] Record DMARC (`_dmarc`) terpasang minimal `p=none` dengan alamat laporan agregat.
- [ ] `EMAIL_FROM` memakai domain terverifikasi; API production boot tanpa error validasi sender.
- [ ] Satu email reminder uji terkirim dari deployment production dan `providerMessageId` tersimpan.

## 4. Database dan migration _(external)_

- [ ] Database production adalah Neon database khusus `job_tracker`, terpisah dari non-production.
- [ ] Backup/export dijalankan sesuai [Backup & Restore Runbook](BACKUP_RESTORE_RUNBOOK.md) sebelum migration.
- [ ] Migration dijalankan satu kali lewat release command terkontrol (`node dist/drizzle/migrate.js`), lalu `GET /api/v1/health` mengembalikan `{ "status": "ok" }`.
- [ ] Restore drill pada database non-production sudah pernah lulus minimal satu kali.

## 5. Smoke dan observability _(external)_

- [ ] `pnpm smoke:production` lulus terhadap URL production nyata dan outputnya disimpan sebagai bukti.
- [ ] Workflow `release.yml` dijalankan dengan target `production` dan hijau.
- [ ] Log runtime tidak memuat password, token, header authorization, atau connection string.
- [ ] Log memiliki request ID dan masking credential.

## 6. Rollback readiness

- [ ] Image release sebelumnya tersimpan dengan tag yang dapat di-deploy ulang.
- [ ] Jalur rollback aplikasi (redeploy image sebelumnya) terdokumentasi di [Deployment Runbook §7](DEPLOYMENT_RUNBOOK.md).
- [ ] Jalur rollback database (PITR/branch Neon) terdokumentasi di [Backup & Restore Runbook](BACKUP_RESTORE_RUNBOOK.md).

## 7. Sign-off

| Peran | Nama | Tanggal | Keputusan |
| ----- | ---- | ------- | --------- |
| Pemilik repository | | | |
| Reviewer keamanan | | | |

Checklist dianggap **disetujui** hanya bila seluruh item non-external terbukti dari CI/source dan seluruh item external memiliki bukti tersimpan (output smoke, screenshot verifikasi domain, log release command).
