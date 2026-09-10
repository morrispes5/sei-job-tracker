# Product Requirements Document — Job Tracker

## 1. Ringkasan produk

Job Tracker adalah aplikasi web dan mobile untuk menyimpan serta mengelola proses pencarian **kerja, magang, dan freelance**. Pengguna dapat mencatat peluang, menyimpan deadline, melihat progres pipeline, menulis catatan, dan menerima pengingat lewat email sebelum tenggat.

Produk ini bukan job board, ATS perusahaan, atau platform rekrutmen. Ia adalah ruang kendali pribadi pengguna.

## 2. Masalah yang diselesaikan

- Lamaran tersebar di chat, tab browser, spreadsheet, dan email.
- Deadline tes, follow-up, dan interview mudah terlewat.
- Pengguna sulit menjawab: “sudah melamar ke mana saja dan tahapnya apa?”
- Catatan kontak dan hasil interview tidak terhubung ke lamaran yang relevan.

## 3. Sasaran dan non-sasaran

| Sasaran MVP | Bukan sasaran MVP |
| --- | --- |
| Satu akun mengelola peluang pribadi | Marketplace atau pencarian lowongan otomatis |
| Pipeline dan deadline yang jelas | Kolaborasi tim atau recruiter portal |
| Data konsisten di web dan mobile | Parsing CV/AI scoring otomatis |
| Reminder email yang bisa dipercaya | Push notification, WhatsApp, kalender eksternal |

## 4. Persona utama

**Mahasiswa / early-career applicant.** Melamar magang dan kerja sambil kuliah; memakai HP untuk input cepat dan web untuk merapikan data.

**Freelancer pemula.** Memantau proposal, client, scope singkat, deadline follow-up, serta hasil penawaran.

## 5. Fitur MVP

### A. Akun

- Register, login, refresh session, logout dari perangkat ini.
- Profile dasar: nama tampilan dan zona waktu.
- Satu user hanya dapat membaca atau mengubah datanya sendiri.

### B. Application tracking

- Membuat, melihat, mencari, mengubah, mengarsipkan, dan menghapus lamaran.
- Jenis: `JOB`, `INTERNSHIP`, `FREELANCE`.
- Status: `WISHLIST`, `APPLIED`, `INTERVIEW`, `OFFER`, `REJECTED`.
- Menyimpan perusahaan/client, judul role, sumber/link, salary/rate opsional, tanggal apply, deadline, dan catatan.

### C. Detail dan aktivitas

- Catatan bebas yang terikat pada sebuah lamaran.
- Kontak opsional: nama, peran, email, LinkedIn/URL.
- Activity log otomatis saat status berubah; catatan manual boleh ditambah.

### D. Reminder email

- Pengguna membuat reminder untuk deadline atau follow-up.
- Scheduler backend memproses reminder yang due.
- Email dikirim sekali dan status delivery dicatat.
- Jika email gagal, aplikasi menyimpan kegagalan dan mencoba kembali secara terbatas.

### E. Dashboard

- Ringkasan total active application per status.
- Daftar deadline mendatang dan recent activity.
- Filter berdasarkan type, status, company, serta tanggal deadline.

## 6. Aturan bisnis

1. Semua application wajib memiliki `title`, `organizationName`, `type`, dan `status`.
2. `appliedAt` boleh kosong saat masih wishlist; diisi otomatis ketika status pertama kali berubah ke `APPLIED` jika user belum menetapkannya.
3. `deadlineAt` harus berada setelah tanggal dibuat; timezone disimpan sebagai timestamp UTC dan ditampilkan sesuai timezone user.
4. Application yang `archivedAt` terisi tidak muncul pada daftar aktif, kecuali filter archive dipilih.
5. Reminder wajib merujuk user pemilik dan boleh merujuk satu application. Reminder tidak boleh dikirim ulang setelah `sentAt` terisi.
6. Status boleh berubah ke mana pun pada MVP (karena proses rekrutmen nyata tidak selalu linear), tetapi setiap perubahan dicatat di activity.
7. Hapus application adalah soft delete terlebih dahulu; data dipulihkan hanya lewat API internal/admin di masa depan, bukan UI MVP.

## 7. Definisi sukses MVP

- User dapat register dan login dari web maupun mobile menggunakan akun sama.
- User dapat membuat lamaran di satu klien dan melihatnya di klien lain setelah refresh.
- User dapat menemukan deadline mendatang dalam maksimal dua tap/klik dari dashboard.
- Reminder due hanya mengirim satu email untuk satu reminder.
- Tidak ada endpoint data yang dapat membaca milik user lain.

## 8. Fase setelah MVP

- Push notification Expo dan integrasi Google Calendar.
- Custom pipeline/status, template follow-up, attachment CV, dan email thread logging.
- Analytics pribadi: conversion rate, durasi per tahap, sumber peluang terbaik.
- Import/export CSV dan backup mandiri.
