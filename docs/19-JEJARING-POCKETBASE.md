# Jejaring PocketBase

Halaman `/awardee/direktori` membaca profil Awardee aktif dari `GET /api/pfriends/directory`. Endpoint ini hanya mengembalikan data yang aman untuk sesama Awardee dan tidak pernah mengirim email atau WhatsApp.

Pencarian, filter komunitas/chapter/kota/keahlian/mentor, statistik, serta pagination dijalankan server. Poin, tier, streak, dan badge ringkas direkonsiliasi dari gamifikasi PocketBase. Profil Jejaring milik sendiri dapat diperbarui melalui `PATCH /api/pfriends/profile/me`.

Collection `awardees` tetap menyimpan profil lengkap tetapi akses record langsung dibatasi kepada pemilik, Verifikator, dan Admin. Seed lokal meng-upsert 60 profil demo dan ledger poinnya ke PocketBase secara idempoten; profil maupun ledger hasil registrasi/verifikasi tidak ditimpa karena memakai identitas dan sumber berbeda.

Verifikasi utama dijalankan dengan `npm run verify:directory` setelah PocketBase aktif dan seed selesai.
