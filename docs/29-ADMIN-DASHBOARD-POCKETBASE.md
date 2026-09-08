# Dasbor Admin dengan PocketBase

## Tujuan

Halaman `/admin` menampilkan potret kesehatan program dari data operasional PocketBase. Halaman tidak lagi membuka Dexie, menjalankan bootstrap data demo, atau menghitung jumlah akun dari data browser.

Susunan antarmuka tetap terdiri dari lima kartu angka utama, empat grafik, dan rekap bulanan. Periode program mengikuti dokumen sumber, yaitu Januari sampai Juli 2026.

## Endpoint

`GET /api/pfriends/admin/dashboard`

Endpoint hanya menerima akun Admin berstatus `AKTIF`. Awardee, Verifikator, dan sesi tanpa autentikasi mendapat penolakan.

Respons berisi waktu pengambilan potret, periode, ringkasan akun dan Cerita, nilai aktual lima KPI, rekap bulanan, antrean SLA, kesiapan ESG, corong keterlibatan, serta sebaran chapter. Respons hanya membawa agregat dan tidak menyertakan identitas, isi Cerita, atau referensi berkas privat.

## Sumber angka

1. Akun berasal dari collection `users` dan dipisahkan menurut peran serta status.

2. Registrasi dan sebaran chapter berasal dari collection `awardees`.

3. Cerita terbit, antrean, SLA, dan kesiapan ESG berasal dari collection `stories`.

4. Volume serta hari diseminasi berasal dari `broadcasts` yang berstatus `TERKIRIM`.

5. Poin, anggota aktif, dan pengamplifikasi berasal dari `verified_point_activities` yang berstatus `AWARDED`.

6. Kegiatan engagement berasal dari `events` yang selesai, memiliki catatan hasil, dan mempunyai minimal sepuluh kehadiran berstatus `APPROVED` pada `event_participants`.

## Definisi pengukuran

Nilai bulanan KPI menggunakan Juli 2026 sebagai bulan penutup program. Cakupan registrasi dan kegiatan engagement dihitung secara kumulatif. Amplifikasi menghitung Awardee unik dengan aksi `SHARE_PRIVATE` atau `SHARE_PUBLIC`.

SLA memakai batas dua, tiga, lima, dan dua hari kerja untuk Cerita diajukan, Cerita dalam pemeriksaan, Cerita disetujui, dan kegiatan diusulkan. Sabtu serta Minggu tidak dihitung.

Bukti ESG dinyatakan siap jika aktivitas terdokumentasi, catatan hasil memiliki minimal dua ratus karakter, tag ESG dan SDG tersedia, serta terdapat bukti media.

Target KPI dan parameter estimasi jangkauan tetap menjadi konfigurasi metodologi pada frontend. Nilai aktual, jumlah pengamplifikasi, dan seluruh deret operasional tetap berasal dari PocketBase.

## Perilaku antarmuka

Store Admin membaca satu potret endpoint dan membentuk data yang siap dipakai komponen grafik. Tombol pada bilah atas memuat ulang potret PocketBase. Kegagalan jaringan menampilkan pesan serta tombol untuk mencoba kembali tanpa menghapus data pengguna.

Pemberitahuan `DUMMY` tidak lagi muncul pada `/admin` karena seluruh data operasional halaman sudah berasal dari backend.

## Verifikasi

```powershell
npm run pb:seed
npm run verify:admin-dashboard
npm run verify:compile
npm run verify:domain
npm run build
```

Tes integrasi memeriksa kewenangan peran, periode tujuh bulan, kesesuaian jumlah akun dan Cerita, poin ledger yang sah, kelengkapan KPI, SLA, ESG, keamanan DTO, serta kestabilan pembacaan berulang.

## Batasan

Hari libur nasional belum menjadi kalender khusus SLA. Volume konten memakai satu record Kabar terkirim sebagai satu materi karena schema Kabar saat ini belum memiliki identitas aset konten terpisah. Estimasi jangkauan tetap merupakan model dan tidak boleh dibaca sebagai hasil pengukuran langsung.
