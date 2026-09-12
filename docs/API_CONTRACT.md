# REST API Contract

Base URL: `/api/v1`. Semua endpoint JSON. Error mengikuti format tunggal:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Input tidak valid",
    "fields": { "email": ["Format email tidak valid"] }
  }
}
```

## 1. Auth

| Method | Path             | Auth                 | Fungsi                                  |
| ------ | ---------------- | -------------------- | --------------------------------------- |
| POST   | `/auth/register` | No                   | Buat akun dan session pertama           |
| POST   | `/auth/login`    | No                   | Login dengan email/password             |
| POST   | `/auth/refresh`  | Refresh cookie/token | Rotasi refresh token, access token baru |
| POST   | `/auth/logout`   | Refresh cookie/token | Cabut session perangkat saat ini        |
| GET    | `/auth/me`       | Yes                  | Profil session aktif                    |

`POST /auth/login` request:

```json
{ "email": "morriz@example.com", "password": "min-12-karakter" }
```

Register request memakai field berikut:

```json
{
  "email": "morriz@example.com",
  "password": "min-12-karakter",
  "displayName": "Morriz",
  "timezone": "Asia/Jakarta"
}
```

Semua request auth yang membuat atau memakai session mengirim header `X-Client-Platform` bernilai `web` atau `mobile`.

- Web menerima refresh token sebagai cookie `sei_refresh_token` (`httpOnly`, `sameSite=lax`, `secure` pada production, path `/api/v1/auth`). Browser tidak menerima refresh token di JSON dan tidak menyimpannya pada JavaScript-readable storage. Refresh dan logout web tidak membutuhkan body.
- Mobile mengirim body `{ "refreshToken": "..." }` pada refresh/logout dan menerima refresh token baru di JSON. Client wajib menyimpannya di Expo SecureStore, bukan AsyncStorage.
- Register dan login mengembalikan `{ "accessToken": "...", "user": { "id", "email", "displayName", "timezone" } }`; mobile juga menerima `refreshToken` pada response. Access token berlaku singkat dan disimpan di memory client.
- Refresh selalu mencabut token lama dan mengeluarkan access token serta refresh token baru. Token lama tidak dapat dipakai ulang.

## 2. Applications

| Method | Path                        | Fungsi                          |
| ------ | --------------------------- | ------------------------------- |
| GET    | `/applications`             | Daftar dengan filter/pagination |
| POST   | `/applications`             | Buat application                |
| GET    | `/applications/:id`         | Detail lengkap milik user       |
| PATCH  | `/applications/:id`         | Edit field atau status          |
| POST   | `/applications/:id/archive` | Archive                         |
| POST   | `/applications/:id/restore` | Keluarkan dari archive          |
| DELETE | `/applications/:id`         | Soft delete                     |

Semua endpoint application membutuhkan Bearer access token. Resource milik user lain atau yang sudah di-soft-delete mengembalikan 404 generik.

Query daftar: `status`, `type`, `q`, `archived`, `deadlineFrom`, `deadlineTo`, `page`, `limit`, `sort`.

- `archived` default `false` (hanya application aktif). `true` menampilkan yang diarsip.
- `q` mencari `title` dan `organizationName`.
- `page` default 1; `limit` default 20, maksimum 100.
- `sort` allowlist: `updatedAt_desc` (default), `updatedAt_asc`, `deadlineAt_asc`, `deadlineAt_desc`, `createdAt_desc`, `createdAt_asc`.
- Response list: `{ "data": [...], "meta": { "page", "limit", "total", "hasNextPage" } }`.

Membuat application menyimpan record dan activity `CREATED` dalam satu transaction. Mengubah `status` menyimpan `STATUS_CHANGED` sekali per perubahan. Archive/restore/delete menulis activity `ARCHIVED`, `RESTORED`, atau `DELETED`. Timeline activity bersifat immutable (hanya GET).

`appliedAt` boleh kosong pada `WISHLIST` dan diisi otomatis (tanggal UTC) ketika status pertama kali menjadi `APPLIED` jika klien belum mengirim nilainya.

```json
{
  "title": "Backend Intern",
  "organizationName": "Contoh Teknologi",
  "type": "INTERNSHIP",
  "status": "WISHLIST",
  "sourceUrl": "https://example.com/jobs/123",
  "deadlineAt": "2026-10-05T16:59:00.000Z"
}
```

## 3. Children of an application

| Method       | Path                                    | Fungsi              |
| ------------ | --------------------------------------- | ------------------- |
| GET/POST     | `/applications/:id/notes`               | List/tambah catatan |
| PATCH/DELETE | `/applications/:id/notes/:noteId`       | Ubah/hapus catatan  |
| GET/POST     | `/applications/:id/contacts`            | List/tambah kontak  |
| PATCH/DELETE | `/applications/:id/contacts/:contactId` | Ubah/hapus kontak   |
| GET          | `/applications/:id/activities`          | Timeline immutable  |

## 4. Reminders dan dashboard

| Method       | Path                 | Fungsi                                                 |
| ------------ | -------------------- | ------------------------------------------------------ |
| GET/POST     | `/reminders`         | Daftar/buat reminder user                              |
| PATCH/DELETE | `/reminders/:id`     | Edit/batalkan reminder pending                         |
| GET          | `/dashboard/summary` | Counts per status, upcoming deadlines, recent activity |

## 5. Kontrak dan validasi

- Semua input menggunakan Zod shared; backend tetap parse ulang input.
- UUID parameter divalidasi sebelum query.
- Endpoint detail dan child resource selalu cek ownership parent application.
- Pagination menggunakan limit default 20, maksimum 100.
- Response list: `{ data, meta: { page, limit, total, hasNextPage } }`.

## 6. API flow

```mermaid
sequenceDiagram
  participant C as Web/Mobile
  participant A as API
  participant D as PostgreSQL
  C->>A: POST /applications + Bearer access token
  A->>A: Validate Zod + verify user
  A->>D: insert application + activity (transaction)
  D-->>A: committed record
  A-->>C: 201 application DTO
```
