# Backup & Restore Runbook

Runbook ini mendefinisikan strategi backup, export, dan restore untuk database Neon `job_tracker` pada environment preview dan production. Lokal (Docker PostgreSQL) tidak dibackup; data lokal bersifat sintetis dan dapat dibuat ulang dari migration + seed.

## 1. Prinsip

- Backup production adalah tanggung jawab dua lapis: fitur bawaan Neon (point-in-time restore dan branch) ditambah export logis berkala.
- Backup/export **wajib** dijalankan sebelum migration material apa pun; tanpa bukti backup, release command migration tidak boleh dieksekusi.
- Restore tidak pernah dilakukan langsung ke database production tanpa drill pada database non-production terlebih dahulu.
- File export berisi data user nyata: simpan hanya di lokasi terenkripsi dengan akses terbatas, jangan pernah commit ke git atau kirim lewat channel tidak terenkripsi, dan hapus sesuai retensi di §4.

## 2. Backup bawaan Neon

- **Point-in-time restore (PITR)**: Neon menyimpan histori WAL; pulihkan branch ke titik waktu sebelum insiden. Catat retention window plan yang dipakai dan pastikan jendelanya menutupi interval antar export logis.
- **Branch snapshot**: sebelum migration, buat branch Neon baru dari branch production sebagai snapshot cepat. Branch ini menjadi titik pulih terdekat bila migration gagal.
- Verifikasi bulanan: cek di dashboard Neon bahwa PITR tersedia dan branch snapshot terakhir masih ada.

## 3. Export logis berkala

Export logis adalah salinan `pg_dump` yang dapat direstore ke PostgreSQL mana pun, independen dari fitur Neon.

```powershell
# Jalankan dari mesin operator yang memiliki PostgreSQL client 17.
# Jangan pernah menyimpan connection string di history shell bersama atau file yang ter-commit.
pg_dump "$env:DATABASE_URL" --format=custom --file="job_tracker_backup_$(Get-Date -Format yyyyMMdd_HHmmss).dump"
```

- Frekuensi production: sebelum setiap migration, plus mingguan sebagai baseline.
- Verifikasi export: `pg_restore --list <file>` harus menampilkan daftar tabel tanpa error.
- Simpan export di lokasi terenkripsi di luar repository; catat hanya nama file dan timestamp di log operasional, bukan isinya.

## 4. Retensi dan penghapusan

| Jenis | Retensi minimal |
| --- | --- |
| Neon PITR | sesuai window plan (minimal 7 hari) |
| Branch snapshot pre-migration | sampai release berikutnya terbukti stabil |
| Export logis pre-migration | 30 hari |
| Export logis mingguan | 4 generasi terakhir |

Hapus export yang melewati retensi dengan aman (overwrite/secure delete), karena file berisi data personal user.

## 5. Prosedur restore (drill)

Drill wajib dilakukan minimal sekali pada database **non-production** sebelum release production, dan diulang setelah setiap perubahan prosedur:

1. Buat database/branch Neon non-production kosong sebagai target restore.
2. Restore export logis: `pg_restore --dbname=<target-url> --clean --if-exists <file.dump>`, atau restore PITR/branch lewat dashboard Neon.
3. Jalankan `node dist/drizzle/migrate.js` terhadap target restore untuk memastikan schema konsisten dengan kode.
4. Jalankan smoke read-only: verifikasi jumlah row tabel utama (`users`, `applications`, `reminders`) masuk akal dan API preview yang menunjuk target restore lolos `pnpm smoke:preview`.
5. Catat hasil drill (tanggal, target, durasi, hasil) sebagai bukti pada [Release Checklist](RELEASE_CHECKLIST.md) item 4.
6. Hapus database/branch target drill setelah selesai.

## 6. Restore insiden production

1. Hentikan deploy/rollback aplikasi sesuai [Deployment Runbook §7](DEPLOYMENT_RUNBOOK.md) agar tidak ada penulisan baru.
2. Identifikasi titik waktu terakhir yang diketahui baik.
3. Pulihkan ke branch baru via PITR Neon; **jangan** menimpa branch production sebelum data hasil restore diverifikasi.
4. Verifikasi data pada branch hasil restore, lalu alihkan `DATABASE_URL` production ke branch tersebut melalui secret manager provider.
5. Jalankan health check dan `pnpm smoke:production`; catat bukti.
6. Investigasi akar masalah sebelum migration atau perubahan schema berikutnya.

## 7. Larangan

- Jangan restore sembarang waktu ke production tanpa verifikasi di branch terpisah.
- Jangan mengedit migration yang sudah dipakai untuk "memperbaiki" data; buat migration baru.
- Jangan menyimpan export di repository, artifact CI publik, atau chat/log.
