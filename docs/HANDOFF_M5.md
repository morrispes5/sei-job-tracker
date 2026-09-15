# M5 Handoff — Mobile app

## Status

M5 implementation is complete in the repository. The Expo application covers the authenticated mobile workflow required by `docs/IMPLEMENTATION_ROADMAP.md` and reuses the M2/M3 REST contract without adding endpoints or changing the documented data model.

A real device-to-database acceptance run is still externally gated: this workstation has no Docker command, no configured API/database/JWT environment, and no Android device or emulator attached. This is not replaced by a successful bundle or browser preview. HTTPS VPS deployment remains M8.

## Delivered scope

### Authentication and session security

- Login and registration use the shared Zod schemas and `/api/v1/auth` contract.
- Access JWT lives only in React memory.
- Native refresh token storage uses `expo-secure-store`; AsyncStorage is not used.
- The web-only Expo preview uses process memory because SecureStore is not a supported browser persistence layer.
- A protected request performs at most one retry after a serialized refresh.
- Successful refresh replaces the stored rotating token. A rejected refresh clears the session, while a transient network failure keeps the secure token for reconnect recovery.
- Logout invalidates the remote refresh session when reachable and always clears local session state.
- Mobile requests identify themselves with `X-Client-Platform: mobile`.

### Routes and workflows

| Route                    | Capability                                                                               |
| ------------------------ | ---------------------------------------------------------------------------------------- |
| `/login`                 | Email/password login and validation                                                      |
| `/register`              | Name/email/password registration and validation                                          |
| `/(tabs)/dashboard`      | Status totals and recent applications                                                    |
| `/(tabs)/applications`   | Search, status/type/archive filters, refresh, and paginated loading                      |
| `/application/new`       | Create an application using the shared schema                                            |
| `/application/[id]`      | Detail, status, source link, notes, contacts, activity, archive/restore, and soft delete |
| `/application/[id]/edit` | Edit the application and optional deadline                                               |
| `/(tabs)/profile`        | Account identity, API target, security summary, and logout                               |

The native UI uses the Sei abstract compass SVG mark and Lucide vector icons. It does not use emoji or generated human imagery.

### Offline behavior

- Network state is bridged from NetInfo to TanStack Query.
- Previously loaded query data remains readable during the current session.
- Mutations are disabled while offline and explain that a connection is required.
- No offline write queue or local database was introduced; that would require a separate documented contract and conflict strategy.

## Main implementation map

- `apps/mobile/app` — Expo Router screens and route layouts.
- `apps/mobile/src/auth` — session provider and secure refresh-token adapter.
- `apps/mobile/src/components` — branded UI, application cards, and shared forms.
- `apps/mobile/src/lib/api.ts` — typed REST client and one-retry auth integration surface.
- `apps/mobile/src/network.ts` — connectivity and query online state.
- `apps/mobile/src/theme.ts` — mobile design tokens.
- `packages/shared/src/auth.ts` — mobile auth response type containing the refresh token returned by the existing API contract.

## Bugs and risks found during M5

1. Expo SecureStore threw at runtime in the browser preview. Native storage is now isolated behind an adapter, with memory-only preview behavior on web.
2. Expo Router peer packages were missing. Constants, Linking, Safe Area Context, and Screens were added at Expo-compatible versions.
3. React Native was one patch behind the installed Expo SDK. It was aligned to `0.81.5`.
4. Initial React Hook Form, Lucide, and React DOM type versions produced peer conflicts. Compatible versions and a workspace type override now resolve cleanly.
5. Parsing a date-only value through UTC could display the previous calendar day in some time zones. Date-only presentation and form conversion now preserve the local calendar date.
6. The first list implementation loaded only the first 100 records. It now uses API cursor pagination through `useInfiniteQuery`.
7. A transient network failure during token refresh originally risked signing the user out. Only an authentication rejection now removes the stored refresh token.

## Verification evidence

Executed on 2026-09-15:

| Check                          | Result                                                                                         |
| ------------------------------ | ---------------------------------------------------------------------------------------------- |
| Mobile ESLint                  | Passed                                                                                         |
| Mobile TypeScript strict check | Passed                                                                                         |
| Mobile unit tests              | 3 passed                                                                                       |
| Peer dependency check          | No issues found                                                                                |
| Expo dependency version check  | Dependencies up to date                                                                        |
| Expo Doctor                    | 18/18 checks passed                                                                            |
| Expo production export         | Android, iOS, and web bundles exported                                                         |
| Browser smoke test             | Login and register navigation rendered at 390 x 844; fresh page had no console warnings/errors |

The smoke test also confirmed that the Sei vector mark, form fields, actions, and login/register navigation fit the mobile viewport without clipping.

## External acceptance gates

The following are not proven on this workstation and must remain open until infrastructure is available:

- Register on web, sign in on a native phone with the same account, and verify the same PostgreSQL-backed data in both clients.
- Verify refresh rotation and logout against the running NestJS API.
- Exercise application CRUD, notes, contacts, archive/restore, and delete against a real database.
- Validate SecureStore persistence across an actual Android/iOS app restart.
- Verify an HTTPS API hostname from a physical phone. Plain `localhost` on a phone points to the phone itself and cannot reach the workstation/VPS API.

## Running on a phone before deployment

Expo Go can open the UI during development. Configure a URL reachable from the phone, then start Expo:

```powershell
$env:EXPO_PUBLIC_API_BASE_URL = 'https://api.example.com/api/v1'
pnpm --filter @sei/mobile dev
```

Scan the Expo QR code from a phone on a compatible network. For login and shared data to work, the URL must serve the M2/M3 NestJS API over trusted HTTPS. The permanent VPS hostname, reverse proxy, TLS, secrets, migration, health checks, and mobile smoke test belong to M8.

## Recommended next milestone

M6 adds email reminders without changing the mobile authentication design:

- reminder CRUD under an owned application;
- scheduler that finds due reminders safely;
- provider adapter for development and production email delivery;
- retry up to the documented maximum;
- deduplication/idempotency so one reminder is sent once;
- reminder activity and a direct application link;
- timezone-safe scheduling and failure visibility.

Copy-paste continuation prompt:

```text
Lanjutkan Sei Job Tracker hanya untuk M6 — Reminder engine. Baca README.md, docs/ARCHITECTURE.md, docs/IMPLEMENTATION_ROADMAP.md, docs/REMINDER_EMAIL.md, docs/API_CONTRACT.md, docs/AUTH_SECURITY.md, docs/TESTING_CHECKLIST.md, dan docs/HANDOFF_M5.md sebelum mengubah kode. Implementasikan reminder CRUD yang ownership-scoped, scheduler yang aman, adapter email dev/production, retry sesuai kontrak, serta dedup/idempotency agar reminder tidak terkirim ganda. Jangan deploy, jangan memasukkan credential provider, dan jangan mengerjakan M7/M8. Tambahkan test untuk due/duplicate/retry/timezone, perbarui dokumentasi, jalankan lint/typecheck/test/build, scan regresi dan security issue, lalu commit dan push jika seluruh gate lokal hijau. Laporkan bukti serta external gate secara jujur.
```
