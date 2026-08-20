# Migrasi Halaman Komunitas ke PocketBase

Dokumen ini mencatat migrasi data operasional pada `/komunitas` yang selesai pada 20 Agustus 2026.

## Sumber data

Jumlah anggota aktif dan sebaran chapter dihitung oleh PocketBase dari collection `awardees`. Hanya record dengan status `AKTIF` yang masuk agregat. Agenda komunitas tetap dibaca dari endpoint kalender PocketBase yang sudah tersedia.

Nama komunitas, narasi profil, tantangan, kebutuhan, deskripsi chapter, dan foto tetap menjadi konfigurasi aplikasi. Bagian tersebut adalah konten editorial statis dan bukan data dummy operasional.

## Endpoint publik

`GET /api/pfriends/public/communities` mengirim jumlah anggota aktif, jumlah chapter aktif, ringkasan SOBI dan Womenpreneur, serta komposisi setiap chapter.

Endpoint hanya mengirim data agregat. Nama anggota, surel, WhatsApp, relasi akun, dan informasi profil pribadi tidak dikirim kepada pengunjung.

## Frontend

Store konten publik memuat ringkasan komunitas melalui proses terpisah dari blog dan leaderboard. Gangguan pada endpoint komunitas tidak mengosongkan data blog atau leaderboard.

Halaman `/komunitas` tidak lagi membaca `catalog.awardees` dan tidak memiliki fallback ke Dexie. Jika backend gagal diakses, halaman menampilkan pesan kegagalan tanpa mengganti angka menggunakan seed lokal.

Pemberitahuan `DUMMY` juga tidak lagi muncul pada halaman ini.

## Verifikasi

```powershell
npm run verify:public-content
npm run verify:compile
npm run verify:purity
npm run build
```

Integration test memeriksa konsistensi total anggota, komposisi komunitas dan chapter, penyaringan status aktif, serta ketiadaan data pribadi pada respons publik.
