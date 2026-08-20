# Migrasi Metode Pengukuran ke PocketBase

Dokumen ini mencatat migrasi angka operasional pada `/metode-pengukuran` yang selesai pada 20 Agustus 2026.

## Sumber potret

Halaman membaca `GET /api/pfriends/public/impact`. Endpoint menyusun potret langsung dari collection PocketBase setiap kali diminta dan tidak menyimpan salinan angka pada browser.

| Angka | Sumber dan penyaring |
| --- | --- |
| Anggota terdata | `awardees` dengan status `AKTIF` dan `consentActive` bernilai benar |
| Chapter aktif | Chapter unik milik Awardee aktif |
| Cerita terpublikasi | `stories` berstatus `TERPUBLIKASI` dengan consent publik aktif |
| Kegiatan terlaksana | `events` berstatus `SELESAI`, memiliki catatan hasil, dan sekurangnya sepuluh kehadiran disetujui |
| Gerakan berjalan | `movements` berstatus `BERJALAN` |
| Aksi tercatat | `verified_point_activities` berstatus `AWARDED` |
| Pengamplifikasi bulan ini | Awardee aktif unik dengan aktivitas `SHARE_PRIVATE` atau `SHARE_PUBLIC` pada bulan berjalan WIB |

Endpoint hanya mengirim angka agregat dan waktu potret. Identitas Awardee, bukti, serta aktivitas individual tidak dikirim.

## Data pendukung

Migration menambahkan `consentActive` pada `awardees` dan collection terkunci `movements`. Seeder menyimpan seluruh tujuh gerakan demo dengan semua status secara idempoten. Persetujuan registrasi baru juga mengaktifkan consent pengolahan data pada profil Awardee.

Collection gerakan dipakai untuk agregat metode pengukuran dan daftar `/gerakan` publik. Area Awardee untuk partisipasi serta laporan gerakan masih memakai Dexie sampai workflow privat dimigrasikan tersendiri.

## Frontend

Impact store membaca endpoint PocketBase tanpa mengakses repository Dexie. Jika backend gagal diakses, halaman menampilkan pesan kegagalan dan tidak mengganti angka menggunakan seed lokal.

Rumus, kelas angka, parameter jangkauan, dan benchmark tetap menjadi konfigurasi aplikasi karena merupakan definisi metode dan bukan data operasional.

Pemberitahuan `DUMMY` tidak lagi ditampilkan pada `/metode-pengukuran`.

## Verifikasi

```powershell
npm run verify:public-impact
npm run verify:public-content
npm run verify:compile
npm run verify:purity
npm run build
```

Integration test membandingkan potret publik dengan collection sumber, memeriksa penyaringan consent dan status, memastikan amplifikasi dihitung per orang unik, serta memastikan collection gerakan dan data pribadi tetap tertutup.
