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

Konsol Verifikator membagi pekerjaan menjadi tiga tab. Tab Usulan Gerakan memuat proposal yang membutuhkan keputusan. Tab Laporan Aksi memuat laporan pemimpin dan peserta sebagai antrean mandiri. Tab Semua Gerakan dipakai untuk melihat status program dan menyelesaikan Gerakan. Tampilan daftar mengikuti pola Bukti Keaktifan dengan kartu ringkas dan satu tombol detail. Pemeriksaan, catatan keputusan, tag ESG, serta penyelesaian Gerakan dipindahkan ke `/verifikator/gerakan/[id]` agar antrean mudah dipindai dan keputusan memiliki ruang yang jelas.

Tab Usulan Gerakan menampilkan badge untuk jumlah usulan berstatus `DIUSULKAN`. Tab Laporan Aksi menampilkan badge untuk jumlah laporan berstatus `SUBMITTED` atau `IN_REVIEW`. Badge disembunyikan saat jumlahnya nol. Status yang sedang menunggu tindak lanjut Awardee atau sudah mendapat keputusan tidak dihitung sebagai pekerjaan aktif Verifikator.

Sidebar Verifikator menghitung usulan `DIUSULKAN` serta laporan `SUBMITTED` dan `IN_REVIEW` pada menu Verifikasi Gerakan. Sidebar Awardee menghitung usulan milik sendiri berstatus `PERLU_REVISI` dan laporan milik sendiri berstatus `NEEDS_REVISION` pada menu Gerakan. Nilainya dibaca dari store workflow bersama dan disegarkan setelah setiap perubahan status.

Awardee memperbaiki usulan melalui `POST /api/pfriends/movements/{id}/resubmit` dan laporan melalui `POST /api/pfriends/movement-reports/{id}/resubmit`. Kedua endpoint hanya menerima pemilik record pada status revisi. Pengajuan ulang memperbarui record lama, menaikkan jumlah revisi, mengembalikan status ke antrean, dan menulis audit `RESUBMIT`. Bukti laporan lama dipertahankan jika Awardee tidak memilih berkas pengganti.

Sidebar lain memakai aturan pekerjaan aktif yang sama. Registrasi Verifikator menghitung `PENDING`. Penukaran hadiah menghitung `DIAJUKAN`, `DISETUJUI`, dan `DIKIRIM`. Calendar of Event Awardee menghitung kegiatan lampau yang sudah didaftarkan tetapi belum memiliki pengajuan bukti kehadiran atau bukti tersebut berstatus `NEEDS_REVISION`. Badge nol tidak ditampilkan.

Pada halaman Calendar of Event, kegiatan yang membutuhkan bukti kehadiran ditempatkan paling atas pada tab Sudah berlangsung. Kartunya memakai latar sorotan, label Perlu tindakan, dan ajakan upload yang jelas. Bukti berstatus `NEEDS_REVISION` memakai penanda perbaikan serta menampilkan catatan Verifikator. Bukti yang sudah dikirim dan sedang diperiksa tidak lagi dihitung sebagai pekerjaan Awardee.

Data usulan lama dari seeder belum memiliki relasi akun pengusul. Migration lanjutan menghubungkannya dengan Awardee aktif agar persetujuan tidak gagal pada field `owner`, `awardeeId`, dan `awardeeName`.

Admin membuka `/admin/gerakan` untuk memantau status, jumlah peserta, dan jumlah laporan disetujui. Admin tidak mempunyai tombol keputusan.

Poin `LEAD_ACTION` sebesar 50 dibuat oleh server hanya untuk laporan pemimpin yang disetujui. Indeks unik pada ledger mencegah pemberian poin lebih dari satu kali untuk pemimpin yang sama dalam satu Gerakan.

Halaman publik tetap hanya menampilkan Gerakan berjalan dan selesai. Jumlah peserta sekarang dihitung dari participant aktif, sedangkan jumlah laporan dihitung dari laporan yang sudah disetujui.
