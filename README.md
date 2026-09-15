# LPPM Press UPN Veteran Jakarta

Sistem Informasi Pelayanan Penerbitan Buku — platform fullstack untuk mengelola siklus penerbitan buku ilmiah & buku ajar sivitas akademika UPNVJ: pengajuan naskah → review substantif → editing → pembayaran → ISBN Perpusnas RI → terbit.

## Arsitektur

```
LPPM-Press-UPNVJ/
├── frontend/   Next.js 14 (App Router) + TypeScript + Tailwind CSS + Lucide
├── backend/    NestJS 10 + TypeScript + Knex.js + JWT + Multer + Nodemailer
├── docker-compose.yml   PostgreSQL 16
└── .env.example
```

## Prasyarat

- Node.js ≥ 20, npm
- PostgreSQL 16 (atau Docker untuk `docker compose up -d`)

## Instalasi & Menjalankan

```bash
# 1. Database
docker compose up -d            # atau gunakan PostgreSQL lokal Anda sendiri

# 2. Backend
cd backend
cp .env.example .env            # sesuaikan kredensial DB
npm install
npm run migrate                 # buat enum + tabel (idempotent)
npm run seed                    # data demo (akun + naskah berbagai status)
npm run start:dev               # http://localhost:4001/api/v1

# 3. Frontend (terminal baru)
cd frontend
cp ../.env.example .env.local   # cukup pastikan NEXT_PUBLIC_API_URL benar
npm install
npm run dev                     # http://localhost:3000
```

## Akun Demo (password semua: `Password123!`)

| Peran | Email |
|---|---|
| LPPM (admin) | lppm@upnvj.ac.id |
| Reviewer | reviewer@upnvj.ac.id |
| Editor | editor@upnvj.ac.id |
| Author | author@upnvj.ac.id / author2@upnvj.ac.id / author3@upnvj.ac.id |

## Pengujian

```bash
# Uji integrasi end-to-end (server backend harus berjalan):
cd backend && npm test
# mencakup: auth, RBAC 403, alur workflow penuh, integritas versi revisi,
# payment lock (upload revisi pasca PAYMENT_REQUIRED ditolak 403), impersonasi.
```

## Produksi

```bash
cd backend && npm run build && npm start
cd frontend && npm run build && npm start
```

## Catatan

- **Payment Lock**: sejak `PAYMENT_REQUIRED`, backend menolak segala perubahan berkas/evaluasi (403).
- **Revisi berversi**: setiap unggahan revisi menjadi v2, v3, dst. — berkas lama tidak pernah ditimpa.
- **Impersonasi ("See as...")**: bilah hijau di atas halaman untuk LPPM; token asli tidak diubah.
- **Email**: jika SMTP kosong, email dicatat ke console backend (mode development) — transaksi tidak pernah gagal karena email.
- **File storage**: berkas disimpan di `backend/uploads/` (lokal); sanitasi nama, validasi ekstensi+MIME, pembatas ukuran, dan anti path-traversal diterapkan.
