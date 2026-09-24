# Mode dummy lokal

Versi 24 September 2026 mempertahankan halaman terbaru dan memakai data contoh
di browser. Tidak membutuhkan PocketBase, kredensial backend, maupun server API.

## Menjalankan

```sh
npm install
npm run dev
```

Buka alamat Vite, lalu `/masuk`. Kartu login menyediakan Awardee, dua Verifikator,
dan Admin. Pilih kartu untuk masuk langsung. Form login manual tetap tersedia.

| Peran | Akun |
|---|---|
| Awardee | Pilih salah satu kartu Awardee di `/masuk` |
| Verifikator | `verifikator@pertaminafoundation.org` |
| Verifikator kedua | `verifikator2@pertaminafoundation.org` |
| Admin | `admin@pertaminafoundation.org` |

Sandi seluruh akun seed adalah `pfriends2026`. Akun yang dibuat melalui formulir
registrasi lokal memakai sandi yang diisikan pada formulir tersebut.

## Penyimpanan dan cakupan

Data awal memakai seed proyek, ditambah contoh percakapan Forum, produk usaha,
dan registrasi. Halaman publik, profil/direktori, cerita, kalender, gerakan,
kabar, bukti keaktifan, poin, reward, penukaran, moderasi, dan dasbor memakai
handler lokal di `src/lib/infrastructure/local/`.

Data serta unggahan disimpan di IndexedDB `PfriendsDummyDB`. Sesi demo memakai
kunci `pfriends_dummy_auth` dan `pfriends_dummy_session`. Perubahan bertahan
setelah refresh pada browser dan alamat situs yang sama. Browser atau port
berbeda memiliki data sendiri. Ini simulasi akun lokal, bukan autentikasi produksi.

`apiRequest` memanggil handler JavaScript lokal tanpa `fetch`. Nama adapter
`pocketbase/` dipertahankan untuk kompatibilitas impor halaman, tetapi client
aktifnya adalah client lokal. URL PocketBase dari `.env` tidak digunakan oleh UI.
Endpoint `/api/` ditutup oleh hook saat development. Adapter build memakai
`adapter-static` dengan fallback `index.html`, tanpa Functions backend.
Kode backend terdahulu masih disimpan sebagai referensi dan tidak dipakai UI.

Untuk mengembalikan data awal, hapus penyimpanan situs demo melalui pengaturan
browser. Tanggal contoh lama tetap mengikuti seed proyek.

## Status pengerjaan

Branch pengiriman: `production`, ke remote GitLab `origin` dan GitHub `github`.
`npm run build` berhasil pada 24 September 2026 dan menghasilkan situs statis
di folder `build`. QA browser dan tes lainnya belum dijalankan sesuai lingkup
permintaan pengguna. Build berhasil belum merupakan klaim lolos QA fungsional.
