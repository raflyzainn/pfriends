# Migrasi Gerakan Publik ke PocketBase

Dokumen ini mencatat migrasi `/gerakan` yang selesai pada 20 Agustus 2026.

## Sumber data

Halaman membaca `GET /api/pfriends/public/movements`. Endpoint mengambil collection `movements` dan hanya mengirim gerakan berstatus `BERJALAN` atau `SELESAI`. Gerakan diurutkan berdasarkan waktu mulai terbaru.

Collection tetap terkunci bagi pengunjung. Endpoint hanya mengirim identitas gerakan, judul, kategori, status, tujuan, wilayah, tanggal, target peserta, jumlah peserta, dan jumlah laporan. Identitas peserta, identitas pemimpin, rincian laporan, dampak mentah, serta data workflow tidak dikirim.

## Frontend

Public content store mempunyai state gerakan terpisah dari cerita, leaderboard, dan komunitas. Kegagalan pemuatan gerakan tidak mengosongkan konten publik lain.

Halaman mempertahankan gerakan unggulan, penyaring kategori, ringkasan peserta, ringkasan laporan, dan tampilan editorial yang sudah ada. Saat PocketBase gagal diakses, halaman menampilkan pesan kesalahan dan tidak memakai fallback Dexie.

Pemberitahuan `DUMMY` tidak lagi ditampilkan pada `/gerakan`.

## Verifikasi

Jalankan perintah berikut dengan PocketBase aktif dan seed sudah tersedia.

```powershell
npm run verify:public-content
npm run verify:compile
npm run verify:purity
npm run build
```

Pengujian memastikan status nonpublik disembunyikan, urutan gerakan benar, agregat peserta serta laporan sesuai sumber, data privat tidak dikirim, dan collection tidak dapat dibaca langsung.

## Batas migrasi

Migrasi ini hanya mencakup halaman publik. Partisipasi, pengajuan gerakan, laporan dampak, evidence, dan workflow pada `/awardee/gerakan` masih menjadi pekerjaan terpisah.
