# Email Reminder Design

## 1. Keputusan MVP

Reminder dikirim lewat email saja. Mobile tetap bisa membuka daftar deadline, tetapi tidak mengirim push pada fase ini.

Email harus lewat abstraction `EmailProvider`; aplikasi tidak boleh mengikat business logic ke satu SDK vendor.

```ts
export interface EmailProvider {
  sendReminder(input: {
    idempotencyKey: string;
    to: string;
    subject: string;
    userDisplayName: string;
    applicationTitle?: string;
    organizationName?: string;
    dueAt: Date;
    timezone: string;
    applicationUrl?: string;
    reminderKind: "DEADLINE" | "FOLLOW_UP" | "INTERVIEW" | "CUSTOM";
  }): Promise<{ providerMessageId: string }>;
}
```

M6 menyediakan dua adapter: development adapter yang tidak mengirim email nyata dan Resend HTTP adapter untuk production. Pemilihan adapter memakai `EMAIL_PROVIDER=development|resend`. Resend memakai `EMAIL_PROVIDER_API_KEY` hanya di server dan meneruskan `idempotencyKey` sebagai header `Idempotency-Key`. Saat deploy, gunakan subdomain pengirim khusus, misalnya `notify.morriztech.cloud`; jangan memakai password Gmail pribadi sebagai SMTP credential aplikasi.

Idempotency key bersifat deterministik per reminder, dengan format `reminder:{reminderId}`. Saat attempt pertama di-claim, scheduler menyimpan snapshot payload minimum di `reminders.delivery_payload`; semua retry memakai snapshot yang sama. Reminder tidak dapat diedit setelah `attemptCount > 0`, tetapi masih dapat dibatalkan ketika kembali `PENDING`. Provider production wajib mendukung idempotency key; bila adapter baru tidak mendukungnya, adapter tersebut tidak boleh diaktifkan untuk scheduler.

## 2. Scheduler flow

```mermaid
flowchart TD
  Tick["Cron tiap 5 menit"] --> Claim["Claim reminder PENDING yang due"]
  Claim --> Lock["Set PROCESSING dalam transaction"]
  Lock --> Send["EmailProvider.sendReminder"]
  Send -->|success| Sent["Set SENT + sentAt + providerMessageId"]
  Send -->|failed| Retry{"attemptCount < 3?"}
  Retry -->|yes| Pending["Kembali PENDING + next retry"]
  Retry -->|no| Failed["Set FAILED + error code"]
```

## 3. Ketentuan penting

- Scheduler meng-claim record secara atomik agar dua instance API tidak mengirim email ganda.
- Scheduler hanya mengambil `PENDING`, melakukan row lock dengan `SKIP LOCKED`, membekukan payload delivery bila belum ada, lalu mengubahnya menjadi `PROCESSING` dan menaikkan `attemptCount` dalam transaction yang sama.
- Due time dan delivery dicatat UTC; template email menampilkan zona waktu user.
- Reminder `CANCELLED`, `SENT`, atau milik application terhapus tidak boleh dikirim.
- `attemptCount`, `lastErrorCode`, dan `providerMessageId` disimpan untuk debugging tanpa menyimpan isi email sensitif di log.
- Provider timeout atau error mengembalikan reminder ke `PENDING` selama `attemptCount < 3`; tick berikutnya melakukan retry dengan idempotency key yang sama. Percobaan ketiga yang gagal menjadi `FAILED`.
- Request provider dibatasi 10 detik agar satu koneksi yang menggantung tidak menahan seluruh batch scheduler.
- Create memakai advisory transaction lock per user dan menolak lebih dari 100 reminder aktif (`PENDING` + `PROCESSING`) agar database dan kuota provider tidak dapat diantrikan tanpa batas oleh satu akun.
- Histori reminder juga dibatasi 1.000 row per user, termasuk `SENT`, `FAILED`, dan `CANCELLED`. Check total dan active berjalan dalam transaction lock per user yang sama, sehingga cancel berulang tidak dapat dipakai untuk menumbuhkan tabel tanpa batas.
- Pada deployment satu instance, Nest Schedule cukup. Ketika API discale horizontal atau volume reminder meningkat, pindah ke BullMQ + Redis dengan idempotency key.

### Recovery `PROCESSING` yang stale (M7)

Status `PROCESSING` bersifat lease internal, bukan status yang boleh menggantung tanpa batas. Saat sebuah row di-claim, API mencatat `last_attempt_started_at`. Pada awal setiap tick scheduler, row `PROCESSING` dianggap stale ketika waktu claim terakhir sudah berumur **15 menit atau lebih**. Nilai 15 menit memberi jarak aman dari timeout provider 10 detik dan interval scheduler 5 menit.

Recovery memilih keselamatan no-duplicate dibanding pengiriman otomatis yang ambigu:

- row stale diubah atomik menjadi `FAILED` dengan `last_error_code=PROCESSING_STALE_DELIVERY_UNKNOWN`;
- row tersebut **tidak** otomatis dikembalikan ke `PENDING`, karena proses dapat mati setelah provider menerima email tetapi sebelum status `SENT` tersimpan;
- `attemptCount`, frozen `delivery_payload`, dan `last_attempt_started_at` dipertahankan untuk rekonsiliasi tanpa menyalin isi email ke log;
- row legacy `PROCESSING` tanpa timestamp dianggap stale dan ditutup dengan kebijakan yang sama;
- row `PROCESSING` yang belum berumur 15 menit tidak disentuh;
- update recovery wajib memakai predicate status dan cutoff di database agar dua instance scheduler tetap idempotent.

Pengguna dapat membuat reminder baru setelah row berstatus `FAILED`. Retry otomatis tetap hanya berlaku untuk kegagalan provider yang diketahui sebelum status kembali ke `PENDING`. Rekonsiliasi provider otomatis atau tombol retry manual merupakan perubahan kontrak di luar M7.

## 4. Template email minimal

Subject: `Reminder: {application title} {kind}`

Isi: nama user, judul role/proyek, organisasi, waktu deadline/follow-up, tautan langsung ke detail application. Tidak ada data password, token, atau catatan interview di body email.
