# Migrasi Landing dan Blog ke PocketBase

Dokumen ini mencatat implementasi halaman publik yang selesai pada 20 Agustus 2026. Ruang lingkupnya adalah beranda, daftar cerita, detail cerita, dan papan peringkat publik.

## Keputusan implementasi

| Bagian | Keputusan |
| --- | --- |
| Sumber cerita publik | Collection `stories` di PocketBase |
| Status yang masuk seed | Seluruh 29 cerita dengan semua status workflow |
| Cerita yang dapat dibaca tamu | Hanya `PUBLISHED`, consent aktif, dan memiliki tanggal publikasi |
| Identitas leaderboard | Nama lengkap Awardee aktif selalu ditampilkan sesuai keputusan produk |
| Gambar cerita | Aset editorial terkurasi tetap dibaca dari `static/` melalui referensi media |
| Workflow privat | Halaman Awardee dan Verifikator masih memakai Dexie sampai migrasi workflow berikutnya |

## Backend

Migration `1723968660_public_stories.js` membuat collection `stories` dalam keadaan terkunci. Akses publik tidak diberikan langsung kepada collection. Hook server menyediakan tiga endpoint yang hanya mengirim field aman.

| Endpoint | Fungsi |
| --- | --- |
| `GET /api/pfriends/public/stories` | Daftar cerita publik yang sudah terbit |
| `GET /api/pfriends/public/stories/{slug}` | Detail satu cerita publik |
| `GET /api/pfriends/public/leaderboard?limit=8` | Peringkat Awardee aktif berdasarkan ledger PocketBase |

Endpoint cerita tidak mengirim catatan review, pemeriksa, data consent privat, maupun metadata workflow internal. Detail cerita yang tidak terbit memberikan respons 404.

## Seeder

`scripts/pocketbase/seed-demo.mjs` melakukan upsert berdasarkan `legacyId`. Seeder memasukkan 29 cerita dan mempertahankan seluruh status supaya data siap dipakai ketika workflow privat dimigrasikan. Pengujian dua kali berturut turut menghasilkan jumlah record yang sama tanpa duplikasi.

## Frontend

Adapter `src/lib/infrastructure/pocketbase/publicContent.js` memetakan respons server menjadi entity domain. Store `src/lib/stores/publicContent.svelte.js` menjadi sumber data bersama untuk seluruh layout publik.

Beranda membaca leaderboard dan tiga cerita terbaru dari PocketBase. `/cerita` membaca daftar publik yang sama. `/cerita/[slug]` membaca detail berdasarkan slug dan tidak memakai fallback Dexie.

Layout publik tidak menampilkan pemberitahuan `DUMMY` pada `/`, `/cerita`, dan seluruh detail cerita. Pemberitahuan tersebut tetap dipakai oleh halaman publik lain yang sumber data operasionalnya masih lokal.

## Verifikasi

Jalankan perintah berikut dengan PocketBase aktif dan data demo sudah disiapkan.

```powershell
npm run verify:public-content
npm run verify:compile
npm run verify:purity
npm run build
```

Integration test memeriksa filter publikasi dan consent, urutan cerita, detail slug, respons 404, collection yang terkunci, urutan leaderboard, nama lengkap, dan ketiadaan field privat.

## Batas migrasi

Migrasi ini hanya memindahkan pembacaan konten publik. Pembuatan draft, pengajuan, review, revisi, penerbitan, pengarsipan, serta unggahan cover buatan pengguna masih menjadi pekerjaan tahap workflow cerita.
