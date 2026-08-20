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

## Perluasan workflow privat

Migrasi lanjutan menambahkan collection `movement_participants`, `movement_reports`, dan `movement_decisions`. Awardee dapat mengajukan Gerakan, bergabung, serta mengirim laporan aksi dengan berkas bukti. Istilah laporan aksi dipakai karena alur ini tidak meminta laporan keuangan.

Verifikator memutuskan usulan dan laporan melalui `/verifikator/gerakan`. Saat usulan disetujui, Verifikator wajib menetapkan tag ESG dan SDG. Pengusul otomatis menjadi pemimpin. Gerakan hanya dapat diselesaikan setelah minimal satu laporan disetujui.

Admin membuka `/admin/gerakan` untuk memantau status, jumlah peserta, dan jumlah laporan disetujui. Admin tidak mempunyai tombol keputusan.

Poin `LEAD_ACTION` sebesar 50 dibuat oleh server hanya untuk laporan pemimpin yang disetujui. Indeks unik pada ledger mencegah pemberian poin lebih dari satu kali untuk pemimpin yang sama dalam satu Gerakan.

Halaman publik tetap hanya menampilkan Gerakan berjalan dan selesai. Jumlah peserta sekarang dihitung dari participant aktif, sedangkan jumlah laporan dihitung dari laporan yang sudah disetujui.
