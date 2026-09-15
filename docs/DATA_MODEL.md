# Data Model and ERD

## 1. ERD

```mermaid
erDiagram
  USERS ||--o{ REFRESH_TOKENS : owns
  USERS ||--o{ APPLICATIONS : owns
  USERS ||--o{ REMINDERS : receives
  APPLICATIONS ||--o{ APPLICATION_NOTES : has
  APPLICATIONS ||--o{ APPLICATION_CONTACTS : has
  APPLICATIONS ||--o{ APPLICATION_ACTIVITIES : records
  APPLICATIONS ||--o{ REMINDERS : schedules

  USERS {
    uuid id PK
    varchar email UK
    varchar password_hash
    varchar display_name
    varchar timezone
    timestamptz created_at
  }
  APPLICATIONS {
    uuid id PK
    uuid user_id FK
    varchar title
    varchar organization_name
    enum type
    enum status
    varchar source_url
    date applied_at
    timestamptz deadline_at
    timestamptz archived_at
    timestamptz deleted_at
  }
  APPLICATION_NOTES {
    uuid id PK
    uuid application_id FK
    text body
    timestamptz created_at
  }
  APPLICATION_CONTACTS {
    uuid id PK
    uuid application_id FK
    varchar name
    varchar role
    varchar email
    varchar profile_url
  }
  APPLICATION_ACTIVITIES {
    uuid id PK
    uuid application_id FK
    varchar type
    jsonb metadata
    timestamptz created_at
  }
  REMINDERS {
    uuid id PK
    uuid user_id FK
    uuid application_id FK
    varchar kind
    timestamptz due_at
    timestamptz sent_at
    int attempt_count
    varchar delivery_status
    jsonb delivery_payload
  }
```

## 2. Enum yang dibagi melalui `packages/shared`

```ts
export const applicationType = ["JOB", "INTERNSHIP", "FREELANCE"] as const;
export const applicationStatus = [
  "WISHLIST",
  "APPLIED",
  "INTERVIEW",
  "OFFER",
  "REJECTED",
] as const;
export const reminderKind = [
  "DEADLINE",
  "FOLLOW_UP",
  "INTERVIEW",
  "CUSTOM",
] as const;
export const reminderDeliveryStatus = [
  "PENDING",
  "PROCESSING",
  "SENT",
  "FAILED",
  "CANCELLED",
] as const;
```

## 3. Data detail application

Selain field inti di ERD, application menyimpan `location`, `workMode` (REMOTE/HYBRID/ONSITE), `salaryMin`, `salaryMax`, `currency`, `sourceName`, `description`, dan `nextStepAt`. Semua field selain inti bersifat opsional.

`reminders.delivery_payload` adalah snapshot internal, nullable, yang dibuat atomik saat delivery attempt pertama di-claim. Snapshot menyimpan hanya field minimum yang diperlukan untuk membentuk email (recipient, display name, timezone, kind, due time, judul/organisasi, dan direct URL), tidak pernah dikembalikan lewat API, serta dipakai kembali tanpa perubahan pada retry berikutnya. Ini menjaga payload provider konsisten dengan idempotency key tetap `reminder:{id}`.

## 4. Index wajib

| Tabel          | Index                                 | Alasan                              |
| -------------- | ------------------------------------- | ----------------------------------- |
| users          | unique lower(email)                   | Login konsisten tanpa duplikat case |
| applications   | `(user_id, status, updated_at desc)`  | Dashboard/pipeline cepat            |
| applications   | `(user_id, deadline_at)` where active | Deadline mendatang cepat            |
| reminders      | `(delivery_status, due_at)`           | Scheduler hanya scan data due       |
| refresh_tokens | `(user_id, expires_at)`               | Logout/revoke dan cleanup           |

## 5. Aturan migration

1. Schema Drizzle adalah source of truth; jangan mengubah tabel production manual lewat Studio.
2. Setiap perubahan schema dibuat dengan `drizzle-kit generate`, direview, lalu dijalankan berurutan.
3. Migration destructive harus melalui pola expand → migrate/backfill → cutover → contract.
4. Seed hanya untuk local/preview dan tidak boleh membawa credential nyata.
