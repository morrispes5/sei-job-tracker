# M6 Handoff — Reminder engine

## Status

M6 is implemented without deployment or production credentials. It adds ownership-scoped reminder CRUD, a transaction-safe active-reminder quota, atomic due-reminder claiming and payload freezing, bounded retry, deterministic email idempotency, timezone-safe email content, and development/production provider adapters.

Migration `0001_lowly_moonstone.sql` adds nullable internal column `reminders.delivery_payload`. Existing rows remain valid and receive the minimum email snapshot only when first claimed. The snapshot never appears in public DTOs.

## Delivered API

All endpoints require a Bearer access token:

| Method   | Route                   | Behavior                                                                |
| -------- | ----------------------- | ----------------------------------------------------------------------- |
| `GET`    | `/api/v1/reminders`     | Owner-only list with status filter and pagination                       |
| `POST`   | `/api/v1/reminders`     | Create a future reminder within the 100-active-reminder per-user quota  |
| `PATCH`  | `/api/v1/reminders/:id` | Edit application, kind, or due time while `PENDING` and never attempted |
| `DELETE` | `/api/v1/reminders/:id` | Change a `PENDING` reminder to `CANCELLED`; preserve the row            |

Shared request schemas, query schemas, response DTOs, and pagination types live in `packages/shared/src/reminder.ts`. Clients cannot write delivery status, attempts, provider IDs, or error codes.

## Scheduler and deduplication

`ReminderSchedulerService` runs every five minutes with overlapping ticks disabled within one NestJS instance. Cross-instance safety is enforced in PostgreSQL:

1. select only due `PENDING` rows with fewer than three attempts;
2. exclude reminders linked to missing, cross-owner, or soft-deleted applications;
3. lock the reminder rows using `FOR UPDATE OF reminders SKIP LOCKED`;
4. freeze the minimum delivery payload if this is the first attempt;
5. change rows to `PROCESSING`, increment `attemptCount`, and clear the previous error in the same transaction;
6. send each email with `Idempotency-Key: reminder:{reminderId}` and the frozen payload;
7. record `SENT`, `sentAt`, and `providerMessageId` on success;
8. return provider failures to `PENDING` for the next tick, or mark the third failure `FAILED`.

`SENT`, `FAILED`, and `CANCELLED` rows are never claimed. A deterministic provider key plus immutable retry payload protects ordinary timeout/retry cases from duplicate email delivery. After the first attempt, edits are rejected but a `PENDING` row may still be cancelled.

`POST /reminders` serializes quota checks per user with a PostgreSQL transaction advisory lock, counts `PENDING` + `PROCESSING`, and returns `409 Conflict` at 100 active reminders. Terminal or cancelled rows release capacity.

## Email adapters

- `DevelopmentEmailProvider` performs no external send and returns a deterministic development message ID. It does not log email bodies, tokens, or credentials.
- `ResendEmailProvider` uses `POST https://api.resend.com/emails`, plain-text content, Bearer authorization, the provider's idempotency header, and a 10-second request timeout.
- Production refuses the development adapter and requires both `EMAIL_PROVIDER_API_KEY` and `EMAIL_FROM`.
- The API key remains server-side and is never added to DTOs, client variables, request logs, or fixtures.

The template contains the display name, reminder kind, localized due time, optional application/organization, and direct application URL. It intentionally excludes passwords, tokens, notes, and interview content. Invalid legacy timezone values safely fall back to UTC.

## Environment contract

```dotenv
EMAIL_PROVIDER=development
EMAIL_FROM=Sei <no-reply@notify.example.com>
EMAIL_PROVIDER_API_KEY=
APP_BASE_URL=http://localhost:5173
REMINDER_BATCH_SIZE=25
```

Valid values are `development` and `resend`. Production requires `resend`, an HTTPS `APP_BASE_URL`, a verified sender domain, and a real API key supplied only through the deployment environment. Batch size must be 1–100.

## Main implementation map

- `packages/shared/src/reminder.ts` — Zod request/query schemas and public DTOs.
- `apps/api/src/modules/reminders/reminders.controller.ts` — thin authenticated REST controller.
- `apps/api/src/modules/reminders/reminders.service.ts` — validation, ownership, pending-only rules, and DTO mapping.
- `apps/api/src/modules/reminders/reminders.repository.ts` — owner-scoped CRUD, transaction-safe quota, payload snapshot, and scheduler claim.
- `apps/api/src/modules/reminders/reminder-scheduler.service.ts` — cron orchestration, retry, direct links, and delivery transitions.
- `apps/api/src/modules/reminders/email.provider.ts` — provider interface, safe template, development adapter, and Resend adapter.
- `apps/api/src/modules/reminders/*.spec.ts` — CRUD, ownership, due, duplicate, retry, cancellation, provider, and timezone tests.

## Verification evidence

Targeted M6 checks cover:

- owner-only create/list/update/cancel and generic cross-owner not-found behavior;
- future-time validation and pending-only mutation;
- due claim and no repeat after `SENT`;
- provider retry on later ticks, capped at three attempts;
- cancelled, future, and deleted-application suppression;
- stable idempotency key across retries;
- exact frozen payload reuse even when the user profile or application changes between attempts;
- the 100-active-reminder quota, per-user isolation, quota release, and post-attempt edit lock;
- Asia/Jakarta rendering, invalid-timezone UTC fallback, and correct direct link;
- Resend authorization/idempotency headers without leaking the server key into the body.
- a bounded provider request signal.

Final local gates on 15 September 2026:

| Gate                                        | Result                                                                                                             |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `pnpm format:check`                         | pass                                                                                                               |
| `pnpm lint`                                 | 5/5 workspace tasks pass                                                                                           |
| `pnpm typecheck`                            | 5/5 workspace tasks pass                                                                                           |
| `pnpm test`                                 | pass: API 27, shared 9, web 3, mobile 3; 42 tests total                                                            |
| `pnpm build`                                | 5/5 workspace tasks pass; existing Vite chunk-size warning only                                                    |
| `pnpm --filter @sei/api db:check`           | pass, Drizzle schema and migration journal consistent                                                              |
| `git diff --check`                          | pass                                                                                                               |
| post-fix Codex Security diff scan           | complete coverage, 21/21 change items reviewed, zero reportable findings                                           |
| post-fix security scan ID / snapshot digest | `a13861a1-55d6-4abc-af9d-9f4a5c2271c5` / `sha256:091603fea3aed687f2801bfcdb0b494f2be892291cdf7c2352022147397f8d5e` |

The first formal security diff scan reviewed the pre-fix M6 implementation and reported one medium finding: an authenticated account could enqueue unbounded reminder work. M6 closes that path with the transaction-safe per-user active quota. The scan also identified the mutable retry payload and missing provider timeout as product reliability defects; both are corrected in the final code. The post-fix scan reviewed the final code snapshot and found no reportable security issue. Only this handoff evidence block was updated after that immutable scan snapshot; runtime code, migration, contracts, and tests were not changed afterward.

## Honest external gates

No email or infrastructure was deployed in M6. This workstation still has no running PostgreSQL environment configured for the project, so the real `FOR UPDATE SKIP LOCKED` concurrency path, advisory-lock quota under concurrent database transactions, migration execution, actual Nest cron tick against PostgreSQL, and authenticated HTTP reminder flow remain unproven locally. Resend delivery is also intentionally untested because no credential or verified sender domain was supplied.

An unclean process exit after a provider response but before the database records `SENT` leaves the row in `PROCESSING` for manual reconciliation. M6 intentionally does not blindly requeue that ambiguous state because doing so could duplicate an email after the provider's idempotency retention expires. Lease/reconciliation policy belongs in M7 hardening before horizontal production scale.

## Recommended next milestone

M7 should prove the combined system rather than add unrelated features:

- start a disposable PostgreSQL test database and run migrations;
- exercise web/mobile auth and application/reminder flows through the real API;
- run concurrent scheduler claims and prove one provider call;
- test refresh/logout, cross-user 404 behavior, validation, and destructive actions;
- define and test recovery for stale `PROCESSING` reminders;
- perform dependency, secret, authorization, and production-error review;
- preserve M8 deployment as a separate approval.

Copy-paste continuation prompt:

```text
Lanjutkan Sei Job Tracker hanya untuk M7 — integration tests dan hardening. Baca README.md, docs/ARCHITECTURE.md, docs/IMPLEMENTATION_ROADMAP.md, docs/API_CONTRACT.md, docs/AUTH_SECURITY.md, docs/REMINDER_EMAIL.md, docs/TESTING_CHECKLIST.md, docs/HANDOFF_M5.md, dan docs/HANDOFF_M6.md. Jalankan database PostgreSQL disposable, migration, lalu E2E nyata untuk auth, ownership, application CRUD, reminder CRUD, concurrent scheduler claim, retry, dan no-duplicate delivery menggunakan fake email provider. Definisikan dan uji kebijakan recovery reminder PROCESSING yang stale sebelum mengubah schema atau migration. Audit validation, secrets, authorization, error exposure, dependency, dan UI critical flows. Jangan deploy dan jangan mengerjakan M8/M9. Perbarui dokumentasi, jalankan seluruh lint/typecheck/test/build/db:check, perbaiki P0/P1, lalu commit dan push hanya jika gate hijau. Laporkan bukti serta gate eksternal dengan jujur.
```
