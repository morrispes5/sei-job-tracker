# Testing Checklist

## 1. Automated test layers

| Layer           | Tool arahan                  | Contoh                                      |
| --------------- | ---------------------------- | ------------------------------------------- |
| Unit            | Vitest/Jest                  | status helper, auth service, date formatter |
| Integration API | Nest test + Postgres test DB | ownership, auth, CRUD, scheduler claim      |
| Web component   | Vitest + Testing Library     | form error, empty state, list filter        |
| E2E smoke       | Playwright / manual script   | register → create → edit → dashboard        |
| Mobile          | Expo/manual device checklist | login, list, form, secure session           |

## 2. Critical acceptance tests

### Auth

- [x] Register dengan email valid membuat user satu kali saja.
- [x] Password salah dan email tidak ada memberi respons generik yang sama.
- [x] Access token expired dapat refresh sekali; refresh revoked gagal.
- [x] Logout membuat refresh token tidak dapat dipakai lagi.
- [x] Web tidak menyimpan refresh token pada JavaScript-readable storage.
- [x] Mobile tidak menyimpan token di AsyncStorage.

### Applications

- [x] User A tidak dapat GET/PATCH/DELETE application User B.
- [x] Create dengan field wajib kosong ditolak oleh API.
- [x] Filter type/status/search hanya mengembalikan data pemilik.
- [x] Mengubah status membuat activity satu kali.
- [x] Wishlist → Applied mengisi `appliedAt` bila belum ada.
- [x] Archive tidak muncul di default list; restore mengembalikan data.

### Reminder email

- [x] Reminder due menjadi `PROCESSING` secara atomik sebelum send.
- [x] Job scheduler berulang tidak mengirim duplicate untuk reminder `SENT`.
- [x] Gagal send melakukan retry maksimal tiga kali lalu `FAILED`.
- [x] Cancel reminder sebelum due tidak mengirim email.
- [x] Isi email memakai timezone user dan direct link benar.

### UX

- [x] Loading, empty, success, offline/read-only, dan error state terlihat jelas (source/component review; login/register browser smoke).
- [x] Semua action destruktif membutuhkan confirmation (source review web dan mobile).
- [x] Form mempertahankan isi ketika API mengembalikan error (component/source review).
- [ ] Desktop, tablet, dan mobile tidak memotong data penting (mobile-width browser smoke lulus; real tablet/phone tetap external gate).
- [x] Kontras status dan focus state memenuhi aksesibilitas dasar (visual smoke dan focus styles source review).

## 4. M7 executable evidence

- `pnpm test:integration` memakai PostgreSQL 17 disposable nyata, bukan repository mock atau SQLite.
- Harness menolak target selain loopback database bernama `job_tracker_e2e`, lalu menjalankan migration sebelum E2E.
- E2E memakai fake email provider yang membedakan attempt dari accepted delivery untuk membuktikan retry dengan satu idempotency key dan tidak ada duplicate delivery.
- Browser smoke membuktikan halaman register/login merender, validasi required tampil, navigasi auth bekerja, dan route `/applications` tanpa session kembali ke login.
- Audit dependency dijalankan terhadap registry dengan gate `--audit-level high`; advisory high harus nol. Advisory moderate yang tersisa dicatat sebagai P2 di handoff.

## 3. Release gate

Sebuah milestone hanya selesai bila lint, typecheck, test relevan, migration check, dan manual smoke flow lulus. Bug P0/P1 harus diperbaiki sebelum production; P2 harus dicatat sebagai issue berprioritas.
