# Katalog Aksi Dinamis PocketBase

## Status

Katalog aksi poin tidak lagi dibatasi pada data statis di halaman Awardee. PocketBase menjadi sumber nilai poin, kuota harian, kelas, pilar, status, dan alur aksi yang sedang berlaku.

Admin dan Verifikator aktif memiliki hak yang sama untuk membuat, membaca, mengubah, serta menghapus atau menonaktifkan aksi melalui panel **Kelola katalog aksi**. Aksi inti mempertahankan kode dan alurnya agar integrasi serta riwayat lama tetap dapat ditelusuri. Aksi kustom memperoleh kode `CUSTOM_*` dari server dan selalu memakai alur Bukti Keaktifan.

## Penyimpanan dan API

- `point_actions` menyimpan katalog aktif dan nonaktif.
- `point_action_audits` menyimpan pelaku, peran, operasi, nilai sebelum, nilai sesudah, dan waktu perubahan.
- `activity_submissions.pointAction` menghubungkan bukti ke aturan yang dipilih.
- `verified_point_activities` menyimpan relasi aksi serta snapshot `actionCode`, `actionLabel`, dan `points`. Perubahan aturan tidak menghitung ulang poin lama.
- `GET /api/pfriends/point-actions` memberikan katalog aktif kepada Awardee dan seluruh katalog kepada staf.
- Endpoint `/api/pfriends/staff/point-actions` menangani CRUD dan riwayat audit untuk Admin serta Verifikator.

Aksi inti atau aksi yang sudah dirujuk tidak dihapus fisik. Operasi hapus mengubah statusnya menjadi `INACTIVE`. Aksi kustom yang belum pernah dipakai dapat dihapus.

## Alur Awardee

`GET /api/pfriends/gamification/me` mengirim `actions` dan `dailyUsage` dari tabel yang sama. `/awardee/aksi` hanya menampilkan aksi berstatus aktif. Aksi kustom diarahkan ke `/awardee/bukti-keaktifan?action=<id>`, lalu poin dan kuota dibaca kembali saat Verifikator menyetujui bukti.

## Verifikasi

- Migrasi `1723968900_point_actions.js` berhasil pada database PocketBase baru.

Halaman `/admin/gamifikasi/aturan` memakai panel katalog ini sebagai satu-satunya editor nilai dan batas aksi. Editor tier serta simulator pada halaman yang sama memakai `gamification_tiers` dan `gamification_tier_audits`, bukan lagi meta Dexie.
- `npm run verify:point-actions` memeriksa seed aksi inti, pembuatan oleh Admin, perubahan oleh Verifikator, audit, penghapusan aksi kustom, dan pengarsipan aksi inti.
- `npm run verify:compile`, `verify:domain`, `verify:seed`, dan `verify:purity` tetap lulus.

Pengujian integrasi memakai server PocketBase terpisah pada database sementara.
