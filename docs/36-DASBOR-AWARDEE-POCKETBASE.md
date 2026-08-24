# Migrasi Dasbor Awardee ke PocketBase

Dokumen ini mencatat implementasi penuh route `/awardee` per 24 Agustus 2026.

## Hasil migrasi

Dasbor tidak lagi memuat `catalog`, `editorial`, repository gabungan, Dexie, atau data seed sebagai fallback. Data yang tampil berasal dari sumber berikut:

| Bagian dasbor | Sumber |
|---|---|
| Poin, tier, streak, badge, leaderboard, dan ledger ringkas | `GET /api/pfriends/gamification/me` melalui store gamifikasi |
| Kegiatan komunitas | `GET /api/pfriends/events` |
| Kabar terbaru | `GET /api/pfriends/broadcasts` |
| Ringkasan Cerita milik Awardee | `GET /api/pfriends/stories/mine` |

`src/lib/stores/awardee-dashboard.svelte.js` menggabungkan tiga sumber konten PocketBase untuk halaman dan badge navigasi. Pengambilan paralel dideduplikasi agar layout dan halaman tidak mengirim permintaan ganda saat pertama dibuka. Jika PocketBase gagal, UI menampilkan kesalahan dan tidak menggantinya dengan konten peraga.

## Empty state dan label DUMMY

Awardee yang belum memiliki Cerita menerima daftar kosong dari endpoint `stories/mine`, lalu melihat empty state asli. Halaman `/awardee` dikecualikan dari `DummyRouteNotice` karena seluruh data operasionalnya telah dimigrasikan.

Tautan Forum di kartu komunitas tetap menuju `/awardee/forum`. Sejak migrasi Forum V1, kanal, pesan, reaksi, dan presence pada halaman tersebut sudah memakai PocketBase sebagaimana dicatat di `docs/37-FORUM-POCKETBASE.md`.

## Kompatibilitas halaman Kabar

Sebelumnya `/awardee/kabar` dan detailnya bergantung pada pemuatan katalog dari layout Awardee. Setelah layout memakai store dasbor PocketBase, kedua halaman Kabar memanggil `catalog.load()` di lifecycle halamannya sendiri. Ini menjaga halaman Kabar tetap dapat dibuka tanpa memasukkan katalog lama kembali ke dasbor.

## Verifikasi

Jalankan PocketBase yang sudah dimigrasikan dan di-seed, lalu:

```powershell
npm run verify:awardee-dashboard
npm run verify:compile
npm run build
```

`verify:awardee-dashboard` juga memindai source agar dependensi lokal tidak masuk kembali dan menguji akun Awardee aktif yang benar-benar belum mempunyai Cerita.
