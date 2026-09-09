# Panduan Customisasi Frontend

Gunakan file ini sebagai peta sebelum mengubah frontend. Folder `app` berisi halaman, sedangkan folder `lib` berisi komponen dan logika yang dipakai bersama.

## Aman untuk di-custom

| Kebutuhan | Lokasi |
| --- | --- |
| Nama aplikasi, singkatan logo, institusi, metadata | `lib/config/brand.ts` |
| Warna brand, radius, bayangan, dan token Tailwind | `tailwind.config.ts` |
| Warna dasar light/dark mode | `app/globals.css` |
| Tampilan komponen bersama: tombol, modal, badge, field, state | `lib/ui.tsx` |
| Sidebar, header, navigasi, label role | `lib/shell.tsx` |
| Tampilan halaman publik | `app/page.tsx` |
| Tampilan halaman per fitur | Folder halaman terkait di `app/` |
| Ikon, label, dan urutan menu berdasarkan role | Konstanta `NAV` di `lib/shell.tsx` |

Perubahan pada `app/` biasanya hanya memengaruhi tampilan halaman tersebut. Perubahan pada `lib/ui.tsx`, `lib/shell.tsx`, `tailwind.config.ts`, atau `app/globals.css` memengaruhi banyak halaman sekaligus.

## Jangan diubah sembarangan

| Bagian | Alasan |
| --- | --- |
| `lib/api.ts` | Kontrak komunikasi frontend dengan backend dan autentikasi request |
| `lib/auth.tsx` | Login, session, token, logout, dan impersonation role |
| `lib/types.ts` | Bentuk data dan status workflow yang harus cocok dengan backend |
| `middleware.ts` | Proteksi route dan pembatasan akses berdasarkan role |
| Pemanggilan `api.get`, `api.post`, `api.patch`, dan path endpoint | Harus tetap cocok dengan controller backend |
| Validasi form dan nama field API | Backend mengharapkan nama serta aturan field tertentu |
| `next.config.mjs`, `tsconfig.json`, dan `package.json` | Konfigurasi build dan dependency aplikasi |

## Struktur singkat

```text
app/          halaman dan route UI
lib/config/   konfigurasi yang sengaja dibuat mudah diubah
lib/ui.tsx    komponen visual bersama
lib/shell.tsx layout dashboard dan navigasi role
lib/api.ts    client backend
lib/auth.tsx  state autentikasi
lib/types.ts  kontrak data dan workflow
middleware.ts proteksi route
```

Setelah mengubah file inti, jalankan `npm run typecheck` dari folder `frontend`. Untuk perubahan tampilan yang besar, lanjutkan dengan `npm run build`.