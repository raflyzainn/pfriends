# Profil Awardee PocketBase

## Tujuan

Halaman `/awardee/profil` memakai PocketBase sebagai sumber tunggal untuk data profil, statistik Cerita, visibilitas Jejaring, consent, audit perubahan, dan etalase Womenpreneur. Gamifikasi tetap dibaca dari ledger server melalui `/api/pfriends/gamification/me`.

## Kontrak data

- `awardees` menyimpan identitas hasil approval dan field profil yang boleh diperbarui sendiri.
- `consent_policies` menyimpan teks dan versi kebijakan aktif.
- `profile_consents` adalah log append-only. Pemberian dan pencabutan selalu membuat baris baru.
- Policy aktif dari `consent_policies` tetap menjadi sumber utama saat Awardee memberi persetujuan. Bila data referensi tersebut belum tersedia, API memakai snapshot policy bawaan versi `PF-CONSENT-v1.0` agar persetujuan mandiri tetap tercatat lengkap dan tidak berakhir sebagai respons 404 generik.
- `profile_audits` mencatat perubahan profil serta produk dengan nilai sebelum dan sesudah.
- `profile_avatars` menyimpan avatar terlindungi tanpa membawa email atau data pribadi lain dari record `awardees`.
- `business_products` menyimpan maksimal lima produk Womenpreneur beserta foto terlindungi.

Field identitas terverifikasi seperti nama, email, komunitas, pilar, chapter, kampus, dan tahun lulus tidak dapat diubah melalui Profil Saya. Nomor WhatsApp usaha disimpan terpisah dari WhatsApp pribadi.

## Privasi dan consent

Profil hanya masuk Jejaring bila `profileVisibility` bernilai `DIRECTORY` dan consent publikasi nama aktif. Avatar muncul di header pemilik tanpa syarat consent publik, sedangkan Awardee lain hanya dapat melihatnya ketika consent publikasi foto wajah aktif. WhatsApp pribadi hanya dikirim kepada Awardee aktif ketika consent kontak mentoring aktif dan pemilik membuka mentoring. Profil usaha, produk, dan kontak usaha hanya ikut bila consent publikasi data usaha aktif. File avatar dan produk hanya dapat dibaca pemilik, staf, atau Awardee aktif yang memenuhi aturan visibilitas masing-masing.

Perubahan avatar memperbarui store profil bersama sehingga header dan halaman Profil memakai sumber yang sama tanpa login ulang. Pencabutan consent foto hanya menyembunyikan avatar dari Jejaring dan tidak menghapus file milik pengguna.

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

Pengujian integrasi memerlukan PocketBase yang sudah dimigrasikan dan diseed, serta `PB_SUPERUSER_EMAIL`, `PB_SUPERUSER_PASSWORD`, dan `VITE_PB_URL`. Skenario profil memeriksa avatar milik sendiri, pembacaan file oleh Awardee lain, serta grant dan revoke consent foto dan kontak mentoring.
