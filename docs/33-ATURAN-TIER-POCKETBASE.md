# Aturan Tier dan Simulasi PocketBase

## Cakupan

Halaman `/admin/gamifikasi/aturan` sudah sepenuhnya meninggalkan konfigurasi Dexie. Katalog aksi tetap dikelola melalui `point_actions`, sedangkan ambang tier disimpan pada `gamification_tiers`. Setiap penerapan dicatat pada `gamification_tier_audits`.

## Alur Admin

1. Halaman memuat aturan, distribusi profil, contoh aktivitas bulanan, dan audit dari PocketBase.
2. Admin mengubah ambang atau mengembalikannya ke nilai kanonik 0, 25, 50, 100, 150.
3. Tombol **Tinjau dampak** hanya menghitung usulan. Database belum berubah.
4. Dialog konfirmasi menampilkan jumlah profil yang berpindah, sebaran baru, dan hasil simulasi.
5. Setelah dikonfirmasi, backend menerapkan semua tier dalam satu transaksi, mempertahankan total poin, menyelaraskan lencana serta bonus koin, lalu menulis audit.

`expectedVersion` mencegah Admin menimpa perubahan dari sesi lain. Bila versi sudah berubah, halaman harus dimuat ulang dan dampak ditinjau kembali.

## Konsumen Awardee

`GET /api/pfriends/gamification/me` menyertakan katalog `tiers`. Store Awardee, rel progres, tangga penghargaan, dan ambang fitur publik memakai nilai tersebut. Konstanta frontend hanya menjadi fallback saat respons belum tersedia.

## Verifikasi

- `npm run verify:gamification-rules`
- `npm run verify:compile`
- `npm run verify:domain`
- `npm run verify:seed`
- `npm run verify:purity`
- `npm run build`

Tes integrasi mencakup otorisasi Admin, larangan Verifikator, pratinjau tanpa mutasi, penerapan atomik, penjagaan versi, audit, konsistensi tier seluruh profil, saldo poin yang tidak berubah, dan pemulihan konfigurasi awal.
