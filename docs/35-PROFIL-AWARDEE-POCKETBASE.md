# Profil Awardee PocketBase

## Tujuan

Halaman `/awardee/profil` memakai PocketBase sebagai sumber tunggal untuk data profil, statistik Cerita, visibilitas Jejaring, consent, audit perubahan, dan etalase Womenpreneur. Gamifikasi tetap dibaca dari ledger server melalui `/api/pfriends/gamification/me`.

## Kontrak data

- `awardees` menyimpan identitas hasil approval dan field profil yang boleh diperbarui sendiri.
- `consent_policies` menyimpan teks dan versi kebijakan aktif.
- `profile_consents` adalah log append-only. Pemberian dan pencabutan selalu membuat baris baru.
- `profile_audits` mencatat perubahan profil serta produk dengan nilai sebelum dan sesudah.
- `business_products` menyimpan maksimal lima produk Womenpreneur beserta foto terlindungi.

Field identitas terverifikasi seperti nama, email, komunitas, pilar, chapter, kampus, dan tahun lulus tidak dapat diubah melalui Profil Saya. Nomor WhatsApp usaha disimpan terpisah dari WhatsApp pribadi.

## Privasi dan consent

Profil hanya masuk Jejaring bila `profileVisibility` bernilai `DIRECTORY` dan consent publikasi nama aktif. Profil usaha, produk, dan kontak usaha hanya ikut bila consent publikasi data usaha aktif. File produk hanya dapat dibaca pemilik, staf, atau Awardee aktif yang memenuhi aturan visibilitas tersebut.

Consent publikasi Cerita diperiksa langsung dari riwayat efektif sebelum pengiriman, approval, dan publikasi. Pencabutan mengarsipkan Cerita terbit dalam transaksi yang sama. Pemberian ulang tidak menerbitkan kembali Cerita lama. Proses berkala merekonsiliasi consent yang kedaluwarsa.

## Statistik

Endpoint profil menghitung total Cerita, draf, sedang diproses, terbit, diarsipkan, dan total tayangan langsung dari collection `stories`. Kontribusi ESG pada UI dihitung dari ledger terverifikasi PocketBase yang sudah dimuat oleh store gamifikasi.

## Verifikasi

Jalankan:

```powershell
npm run verify:profile
npm run verify:directory
npm run verify:compile
```

Pengujian integrasi memerlukan PocketBase yang sudah dimigrasikan dan diseed, serta `PB_SUPERUSER_EMAIL`, `PB_SUPERUSER_PASSWORD`, dan `VITE_PB_URL`.
