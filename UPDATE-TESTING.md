# Update dan Panduan Testing

Dokumen ini mencatat update terakhir dan cara melakukan pengecekan mandiri pada LPPM Press.

## Perubahan yang Sudah Dibuat

### 1. Perbaikan HTTP 500 saat login

- Port PostgreSQL disamakan dengan Docker Compose: `5433`.
- Konfigurasi yang diperbarui:
  - `.env.example`
  - `backend/.env.example`
  - `backend/src/config/configuration.ts`
  - `backend/src/database/migrate.ts`
  - `backend/src/database/seed.ts`
- Error dari backend sekarang menampilkan isi response, termasuk jika response bukan JSON.

### 2. Migrasi dan seed

- Migrasi tetap idempotent dan aman dijalankan berulang kali.
- Seed tidak lagi dilewati hanya karena tabel `users` sudah berisi data.
- Seed mengecek marker data demo sebelum membuat data ulang.
- Akun demo menggunakan password `Password123!`.
- Status refund disamakan antara database/backend dan frontend.

### 3. UI logout halfscreen

- Sidebar mobile/halfscreen sekarang memiliki area navigasi yang bisa scroll.
- Informasi akun dan tombol `Keluar` tetap dapat dijangkau pada layar pendek.

### 4. Kotak status, reviewer, dan editor

- Badge status, reviewer, dan editor di halaman `Manajemen Buku` memakai tinggi minimum yang sama.
- Reviewer dan editor sekarang tampil sebagai kotak/badge yang konsisten.

### 5. Aksi Cepat akun LPPM

- Bagian `Aksi Cepat` di dashboard tidak ditampilkan untuk role `LPPM`.
- Navigasi utama `Manajemen Buku` tetap tersedia di sidebar.

## Menjalankan Aplikasi

### 1. Nyalakan database

```bash
docker compose up -d
```

Docker PostgreSQL tersedia di `localhost:5433`.

### 2. Siapkan backend

```bash
cd backend
npm install
npm run migrate
npm run seed
npm run start:dev
```

Backend berjalan di:

```text
http://localhost:4000/api/v1
```

### 3. Siapkan frontend

Buka terminal baru:

```bash
cd frontend
npm install
npm run dev
```

Frontend berjalan di:

```text
http://localhost:3000
```

## Akun Demo

Password semua akun: `Password123!`

| Role | Email |
| --- | --- |
| LPPM | `lppm@upnvj.ac.id` |
| Reviewer | `reviewer@upnvj.ac.id` |
| Editor | `editor@upnvj.ac.id` |
| Author | `author@upnvj.ac.id` |

## Checklist Test Mandiri

### A. Test login berhasil

1. Buka `http://localhost:3000/auth/login`.
2. Masuk dengan `author@upnvj.ac.id` dan `Password123!`.
3. Pastikan diarahkan ke `/dashboard`.
4. Pastikan nama akun tampil.
5. Pastikan tidak muncul pesan HTTP 500.

### B. Test login gagal dan isi error

1. Buka halaman login.
2. Masukkan email demo dengan password yang salah.
3. Klik `Masuk`.
4. Pastikan pesan error tampil di bawah form.
5. Pastikan aplikasi tidak hanya menampilkan pesan umum jika backend mengirim detail error.

### C. Test migrasi dan seed

Jalankan dari folder `backend`:

```bash
npm run migrate
npm run seed
npm run seed
```

Hasil yang diharapkan:

- Migrasi selesai tanpa error.
- Seed pertama membuat data demo.
- Seed kedua menampilkan `Data demo sudah tersedia — seed dilewati.`.
- Tidak ada data demo duplikat.

### D. Test logout pada halfscreen/mobile

1. Login sebagai akun demo.
2. Kecilkan lebar browser atau gunakan responsive device mode.
3. Klik tombol menu.
4. Jika menu panjang, scroll area menu.
5. Pastikan tombol `Keluar` terlihat dan bisa diklik.
6. Klik `Keluar`.
7. Pastikan diarahkan ke halaman publik/login dan sesi akun terhapus.

### E. Test tampilan Manajemen Buku

1. Login sebagai `lppm@upnvj.ac.id`.
2. Buka `Manajemen Buku`.
3. Periksa kolom `Status` dan `Reviewer / Editor`.
4. Pastikan badge status dan kotak reviewer/editor terlihat konsisten ukurannya.
5. Pastikan nama reviewer/editor atau teks `Belum ditugaskan` tampil rapi.

### F. Test Aksi Cepat akun LPPM

1. Login sebagai akun LPPM.
2. Buka dashboard.
3. Pastikan bagian `Aksi Cepat` tidak tampil.
4. Pastikan menu `Manajemen Buku` tetap ada di sidebar dan masih bisa dibuka.

### G. Test role lain

1. Login sebagai author.
2. Pastikan menu `Pengajuan` tersedia.
3. Pastikan `Aksi Cepat` masih tampil untuk author.
4. Login sebagai reviewer/editor.
5. Pastikan menu `Booklist` tersedia.

## Typecheck dan Build

### Backend

```bash
cd backend
npm run typecheck
npm run build
```

### Frontend

```bash
cd frontend
npm run typecheck
npm run build
```

## Automated Test dengan Playwright

Pastikan backend dan frontend sedang berjalan, lalu dari folder `frontend`:

```bash
npm install
npx playwright install chromium
npm run test:e2e
```

Test yang tersedia memeriksa:

- Login memakai HttpOnly cookie.
- Author dapat masuk dan tidak bisa membuka Manajemen Buku.
- LPPM dapat memakai filter dan pagination Manajemen Buku.

Jika Chromium belum terpasang, Playwright akan meminta menjalankan `npx playwright install chromium`.

## Catatan Hasil Testing Terakhir

- Backend typecheck: berhasil.
- Frontend typecheck: berhasil.
- Backend build: berhasil.
- Migrasi: berhasil.
- Seed dan seed ulang: berhasil.
- Backend E2E belum dapat dijalankan karena `backend/test/e2e.test.js` sedang tidak ada di working tree.
- Playwright belum selesai jika download Chromium dari CDN mengalami timeout jaringan.
