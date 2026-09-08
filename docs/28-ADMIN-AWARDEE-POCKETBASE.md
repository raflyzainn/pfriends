# Admin Awardee dengan PocketBase

## Tujuan

Halaman `/admin/awardee` menjadi pusat pengelolaan Awardee yang bersumber dari PocketBase. Halaman hanya memuat akun berperan Awardee. Akun Verifikator dan Admin tidak dicampur dengan penerima manfaat.

## Pemisahan status

Status akun dan status keanggotaan dikelola secara terpisah.

| Status | Dampak |
| --- | --- |
| Akun `AKTIF` | Pengguna dapat melakukan autentikasi |
| Akun `TERKUNCI` | Akses dihentikan sementara dan token lama dicabut |
| Akun `NONAKTIF` | Akses login dinonaktifkan dan token lama dicabut |
| Keanggotaan `AKTIF` | Awardee masuk direktori serta agregat anggota aktif |
| Keanggotaan `NONAKTIF` | Awardee dikeluarkan dari direktori, leaderboard, dan agregat anggota aktif tanpa otomatis mengubah akses login |

Setiap perubahan status membutuhkan alasan minimal 10 karakter. Tindakan disimpan pada collection `admin_awardee_actions` bersama Admin pelaksana, target, nilai sebelum, nilai sesudah, dan waktu kejadian.

## Endpoint

| Method | Endpoint | Fungsi |
| --- | --- | --- |
| `GET` | `/api/pfriends/admin/awardees` | Daftar, statistik, pencarian, filter, dan pagination |
| `GET` | `/api/pfriends/admin/awardees/{id}/history` | Riwayat tindakan pada satu Awardee |
| `POST` | `/api/pfriends/admin/awardees/{id}/account-status` | Mengubah status akun |
| `POST` | `/api/pfriends/admin/awardees/{id}/membership-status` | Mengubah status keanggotaan |
| `POST` | `/api/pfriends/admin/awardees/{id}/impersonate` | Membuka sesi sebagai Awardee |
| `POST` | `/api/pfriends/admin/impersonations/{id}/end` | Menutup dan mencatat akhir impersonasi |
| `GET` | `/api/pfriends/session/me` | Memvalidasi token statis ketika sesi dimuat ulang |

Endpoint daftar, riwayat, perubahan status, dan pembukaan impersonasi hanya menerima akun Admin berstatus aktif. Endpoint akhir impersonasi menerima Admin pemilik sesi atau Awardee target supaya tindakan logout tetap tercatat. Endpoint identitas menerima bearer token pengguna aktif dan hanya mengembalikan record pemilik token tersebut.

## Impersonasi

Fitur `Masuk sebagai` tidak memakai kata sandi demo. Server menerbitkan static auth token Awardee selama 30 menit. Token tersebut tidak dapat diperbarui.

Sebelum token Awardee dipasang, token dan record Admin disimpan pada `sessionStorage`. Banner pada seluruh zona Awardee menampilkan identitas target, sisa waktu, dan tombol kembali. Ketika kembali, token Admin dipulihkan lalu akhir sesi dicatat pada audit.

Muat ulang halaman memakai `/api/pfriends/session/me`, bukan `authRefresh`, karena static auth token memang tidak dapat diperbarui. Akun terkunci atau nonaktif tidak dapat menjadi target impersonasi.

## Seeder dan waktu masuk

Migration menambahkan `lastLoginAt` pada collection `users`. Hook autentikasi memperbarui field tersebut ketika login berhasil. Seeder mengisi nilai awal dari data demo dan tetap idempoten pada pengulangan.

## Verifikasi

```powershell
npm run pb:seed
npm run verify:admin-awardees
npm run verify:compile
npm run build
```

Tes integrasi memeriksa akses berbasis peran, bentuk DTO, statistik, alasan wajib, perubahan dua jenis status, pencabutan token lama, durasi impersonasi, akses token target, akhir sesi, dan riwayat audit.
