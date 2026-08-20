# Migrasi Workflow Cerita Privat ke PocketBase

Dokumen ini mencatat implementasi halaman Cerita milik Awardee dan ruang pemeriksaan Verifikator yang selesai pada 20 Agustus 2026.

## Cakupan selesai

| Area | Implementasi |
| --- | --- |
| Awardee | Daftar Cerita, draf, penyimpanan otomatis, unggah bukti, calon sampul, kirim, perbaiki, dan kirim ulang |
| Verifikator | Antrean, detail, mulai pemeriksaan, checklist data sensitif, minta revisi, setujui, terbitkan, dan arsipkan |
| Privasi | Bukti dan calon sampul terlindungi. Sampul publik dibuat sebagai berkas terpisah saat Cerita diterbitkan |
| Audit | Keputusan tersimpan di `story_reviews` dan perubahan status tersimpan di `story_status_events` |
| Poin | Pengiriman pertama membuat satu ledger `STORY_SUBMIT`. Pengiriman ulang tidak membuat ledger baru |
| Consent | Consent aktif diperiksa ketika mengirim, menyetujui, dan menerbitkan. Pencabutan consent menarik konten publik |

## Collection

Migration `1723968820_story_workflow.js` menambahkan pemilik, berkas bukti, calon sampul, waktu simpan draf, dan poin pada `stories`. Migration yang sama membuat `story_reviews`, `story_status_events`, dan `story_public_covers`.

Collection utama tetap terkunci dari akses record langsung. Frontend memakai endpoint khusus yang memeriksa sesi dan peran pada server.

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

Tes integrasi Cerita menjalankan dua belas pemeriksaan dari pembuatan draf sampai arsip. Tes mencakup persistensi berkas, antrean Verifikator, revisi pada record yang sama, checklist sensitif, promosi sampul publik, penghapusan dari katalog publik, dan idempotensi ledger poin.
