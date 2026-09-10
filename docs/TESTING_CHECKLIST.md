# Testing Checklist

## 1. Automated test layers

| Layer | Tool arahan | Contoh |
| --- | --- | --- |
| Unit | Vitest/Jest | status helper, auth service, date formatter |
| Integration API | Nest test + Postgres test DB | ownership, auth, CRUD, scheduler claim |
| Web component | Vitest + Testing Library | form error, empty state, list filter |
| E2E smoke | Playwright / manual script | register → create → edit → dashboard |
| Mobile | Expo/manual device checklist | login, list, form, secure session |

## 2. Critical acceptance tests

### Auth

- [ ] Register dengan email valid membuat user satu kali saja.
- [ ] Password salah dan email tidak ada memberi respons generik yang sama.
- [ ] Access token expired dapat refresh sekali; refresh revoked gagal.
- [ ] Logout membuat refresh token tidak dapat dipakai lagi.
- [ ] Web tidak menyimpan refresh token pada JavaScript-readable storage.
- [ ] Mobile tidak menyimpan token di AsyncStorage.

### Applications

- [ ] User A tidak dapat GET/PATCH/DELETE application User B.
- [ ] Create dengan field wajib kosong ditolak oleh API.
- [ ] Filter type/status/search hanya mengembalikan data pemilik.
- [ ] Mengubah status membuat activity satu kali.
- [ ] Wishlist → Applied mengisi `appliedAt` bila belum ada.
- [ ] Archive tidak muncul di default list; restore mengembalikan data.

### Reminder email

- [ ] Reminder due menjadi `PROCESSING` secara atomik sebelum send.
- [ ] Job scheduler berulang tidak mengirim duplicate untuk reminder `SENT`.
- [ ] Gagal send melakukan retry maksimal tiga kali lalu `FAILED`.
- [ ] Cancel reminder sebelum due tidak mengirim email.
- [ ] Isi email memakai timezone user dan direct link benar.

### UX

- [ ] Loading, empty, success, offline/read-only, dan error state terlihat jelas.
- [ ] Semua action destruktif membutuhkan confirmation.
- [ ] Form mempertahankan isi ketika API mengembalikan error.
- [ ] Desktop, tablet, dan mobile tidak memotong data penting.
- [ ] Kontras status dan focus state memenuhi aksesibilitas dasar.

## 3. Release gate

Sebuah milestone hanya selesai bila lint, typecheck, test relevan, migration check, dan manual smoke flow lulus. Bug P0/P1 harus diperbaiki sebelum production; P2 harus dicatat sebagai issue berprioritas.
