# Migrasi Workflow Cerita Privat ke PocketBase

Dokumen ini mencatat implementasi halaman Cerita milik Awardee dan ruang pemeriksaan Verifikator yang selesai pada 20 Agustus 2026.

## Cakupan selesai

| Area | Implementasi |
| --- | --- |
| Awardee | Daftar Cerita, draf, penyimpanan otomatis, unggah bukti, calon sampul, kirim, perbaiki, dan kirim ulang |
| Verifikator | Antrean, detail, mulai pemeriksaan, checklist data sensitif, minta revisi, setujui, terbitkan, dan arsipkan |
| Admin | Pemantauan metadata seluruh status, penanggung jawab verifikasi, keputusan, dan riwayat status tanpa membuka isi privat |
| Privasi | Bukti dan calon sampul terlindungi. Sampul publik dibuat sebagai berkas terpisah saat Cerita diterbitkan |
| Audit | Keputusan tersimpan di `story_reviews` dan perubahan status tersimpan di `story_status_events` |
| Poin | Pengiriman pertama membuat satu ledger `STORY_SUBMIT`. Pengiriman ulang tidak membuat ledger baru |
| Consent | Consent aktif diperiksa ketika mengirim, menyetujui, dan menerbitkan. Pencabutan consent menarik konten publik |

## Penyimpanan draf

Komposer menunggu 1,5 detik setelah perubahan terakhir sebelum menyimpan. Permintaan yang sedang berjalan tidak ditumpuk. Bila penulis kembali mengubah isian ketika penyimpanan berlangsung, satu penyimpanan lanjutan dijalankan setelah permintaan pertama selesai.

Respons backend memperbarui daftar Cerita dalam memori tanpa membaca ulang seluruh antrean. Perubahan internal seperti pengosongan pilihan berkas setelah unggahan berhasil tidak dianggap sebagai ketikan baru dan tidak memicu permintaan berulang.

Status penyimpanan tampil di bagian atas halaman dengan keadaan `Perubahan belum tersimpan`, `Menyimpan`, `Semua perubahan tersimpan`, atau `Gagal menyimpan`. Navigasi di dalam aplikasi menunggu perubahan terakhir tersimpan. Jika penyimpanan gagal, pengguna tetap berada di komposer. Penutupan tab ketika masih ada perubahan memakai peringatan bawaan peramban.

## Pemuatan Verifikator

Layout Verifikator menunggu pemulihan sesi selesai sebelum memuat antrean. Halaman Submission Blog juga menyegarkan antrean setelah sesi Verifikator tersedia. Kegagalan koneksi ditampilkan sebagai galat dengan tombol coba lagi dan tidak disamarkan sebagai antrean kosong.

Halaman Cerita Awardee dan Verifikator tidak lagi menampilkan pemberitahuan data dummy. Penanda tersebut tetap tersedia pada bagian lain yang memang masih memakai penyimpanan lokal.

## Collection

Migration `1723968820_story_workflow.js` menambahkan pemilik, berkas bukti, calon sampul, waktu simpan draf, dan poin pada `stories`. Migration yang sama membuat `story_reviews`, `story_status_events`, dan `story_public_covers`.

Collection utama tetap terkunci dari akses record langsung. Frontend memakai endpoint khusus yang memeriksa sesi dan peran pada server.

Berkas terlindungi mengikuti aturan baca khusus. Awardee hanya dapat membuka berkas dari Cerita miliknya. Verifikator dapat membuka bukti setelah Cerita dikirim dan tidak dapat membuka berkas draf. Hook record tetap menolak pembacaan record langsung sehingga izin berkas tidak membuka field internal collection.

## Endpoint Awardee

| Endpoint | Fungsi |
| --- | --- |
| `GET /api/pfriends/stories/mine` | Membaca seluruh Cerita milik akun aktif |
| `POST /api/pfriends/stories/drafts` | Membuat draf dan menerima berkas |
| `PATCH /api/pfriends/stories/{id}/draft` | Menyimpan perubahan pada record yang sama |
| `POST /api/pfriends/stories/{id}/submit` | Memvalidasi dan mengirim Cerita |
| `POST /api/pfriends/stories/consent/revoke` | Mencabut consent dan menarik konten terkait |

## Endpoint Verifikator

| Endpoint | Fungsi |
| --- | --- |
| `GET /api/pfriends/verifier/stories` | Membaca antrean pemeriksaan |
| `GET /api/pfriends/verifier/stories/{id}` | Membaca detail, keputusan, dan riwayat status |
| `POST /api/pfriends/verifier/stories/{id}/start-review` | Menetapkan Verifikator yang memeriksa |
| `POST /api/pfriends/verifier/stories/{id}/decision` | Meminta revisi atau menyetujui |
| `POST /api/pfriends/verifier/stories/{id}/publish` | Membuat sampul publik dan menerbitkan Cerita |
| `POST /api/pfriends/verifier/stories/{id}/archive` | Mengarsipkan dan menghapus sampul publik |

Parameter `scope=all` pada endpoint daftar Verifikator memuat seluruh Cerita selain draf. Nilai bawaan tetap memuat antrean aktif.

Verifikator dapat meminta revisi atas Cerita berstatus `TERPUBLIKASI`. Tindakan ini menghapus sampul publik, mengosongkan validasi penerbitan, dan memindahkan record yang sama ke `PERLU_REVISI`. Riwayat keputusan, slug, bukti, dan ledger poin tetap dipertahankan. Arsip tetap terminal dan tidak digunakan sebagai jalur revisi.

## Endpoint Admin

| Endpoint | Fungsi |
| --- | --- |
| `GET /api/pfriends/admin/stories` | Membaca metadata seluruh Cerita dengan pencarian, filter status, dan paginasi |
| `GET /api/pfriends/admin/stories/{id}` | Membaca metadata, keputusan Verifikator, dan riwayat status |

Endpoint Admin tidak mengirim body, ringkasan, outcome, nama berkas privat, maupun tautan berkas. Halaman `/admin/cerita` dan detailnya bersifat hanya baca.

## Seeder

Data demo berisi 32 Cerita. Tiga contoh baru mewakili status sedang diperiksa, perlu revisi, dan draf. Seeder juga menghubungkan pemilik PocketBase serta menambahkan berkas contoh pada status privat yang memerlukannya. Proses tetap idempoten karena upsert memakai `legacyId`.

## Verifikasi

Jalankan PocketBase, siapkan data demo, lalu jalankan perintah berikut.

```powershell
npm run pb:seed
npm run verify:stories
npm run verify:compile
npm run build
```

Tes integrasi Cerita mencakup persistensi berkas, akses bukti terlindungi oleh Verifikator, penolakan akses record langsung, privasi pemantauan Admin, antrean Verifikator, revisi sebelum dan sesudah publikasi pada record yang sama, checklist sensitif, promosi sampul publik, penghapusan dari katalog publik, penerbitan ulang, dan idempotensi ledger poin.

## Penyegaran Cerita Publik

Saat pengguna kembali dari ruang Verifikator atau Awardee menuju landing page, layout publik memuat ulang katalog publik. Penyegaran ini memastikan Cerita yang baru berubah ke status `TERPUBLIKASI` langsung muncul di `/cerita` tanpa bergantung pada cache store dari kunjungan sebelumnya.
