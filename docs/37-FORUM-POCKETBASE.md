# Forum PFriends dengan REST dan SSE

Implementasi V1 mempertahankan komposisi visual Forum lama, tetapi seluruh kanal, pesan, reaksi, dan daftar anggota daring kini berasal dari PocketBase. Operasi data memakai REST API. Pembaruan antarklien memakai Server-Sent Events bawaan PocketBase, bukan WebSocket khusus dan bukan message queue.

## Route dan akses

Komponen Forum yang sama dipakai oleh `/awardee/forum`, `/verifikator/forum`, dan `/admin/forum`.

- `pengumuman`: semua pengguna aktif dapat membaca; hanya Admin dan Verifikator dapat menulis.
- `sobi-alumni`: Awardee SOBI dan staf aktif.
- `pfpreneur`: Awardee WOMENPRENEUR dan staf aktif.
- `mangrove` serta `tanya-jawab`: seluruh role aktif.

Server mengambil identitas, role, komunitas, chapter, dan waktu dari sesi. Browser tidak dapat menentukan penulis atau melewati aturan kanal.

## Persistensi dan realtime

Migration `1723968990_forum.js` membuat `forum_channels`, `forum_messages`, `forum_reactions`, dan `forum_presences` dalam keadaan terkunci. Lima kanal dan satu pesan sambutan sistem per kanal dibuat saat migration. Percakapan peraga lama tidak dimigrasikan.

Initial load dan seluruh mutation memakai `/api/pfriends/forum/**`. Setelah penyimpanan berhasil, hook menerbitkan custom SSE pada topic kanal. Hak subscription diperiksa kembali oleh `onRealtimeSubscribeRequest`. Store mendeduplikasi respons REST dan event SSE agar satu pesan tidak tampil dua kali.

Pesan maksimal 600 karakter. Kombinasi penulis dan `requestKey` unik membuat retry aman. Server membatasi maksimal enam pesan per 30 detik dan 30 pesan per sepuluh menit. Konten identik pada kanal yang sama juga ditolak selama dua menit. Pembatasan memakai riwayat PocketBase sehingga tidak bergantung pada state browser. Migration `1723969000_forum_replies_emoji.js` menambahkan relasi `replyTo` dan mengubah nilai reaksi menjadi teks Unicode. Balasan menyimpan referensi ke pesan langsung pada kanal yang sama. Endpoint konteks memuat pesan di sekitar referensi bila pesan asal belum ada pada halaman aktif.

Reaksi bersifat desired-state melalui nilai `selected`, sehingga retry tidak membalik status dua kali. UI hanya menampilkan chip reaksi yang sudah dipakai. Reaksi baru dipilih dari menu tiga titik dan picker berisi 3.790 emoji Unicode beserta variasi warna kulit. Dataset picker dibundel oleh frontend, sedangkan hook memvalidasi input memakai allowlist yang dihasilkan dari versi dataset yang sama. Tidak ada pengambilan dataset dari CDN.

Presence diperbarui setiap 60 detik selama tab Forum terlihat. Heartbeat maksimal 90 detik ditampilkan `aktif`, antara 90 detik sampai lima menit ditampilkan `sibuk`, dan setelah itu tidak dikirim ke UI.

Migration `1723969010_forum_message_moderation.js` menambahkan indeks moderasi dan migration `1723969020_forum_hard_delete.js` menetapkan penghapusan langsung tanpa tombstone. Pengirim dapat menghapus pesan sendiri, sedangkan Admin dan Verifikator dapat menghapus pesan pengguna untuk moderasi. Pesan sistem tidak dapat dihapus. Pesan dan reaksi terkait langsung hilang dari database serta UI.

## Batas saat ini

Forum belum mencakup lampiran, tampilan thread bertingkat, mention/notifikasi, emoji gambar khusus, edit, hapus, moderasi, atau pengelolaan kanal. Reply dapat menunjuk pesan biasa maupun reply, tetapi selalu dirender satu tingkat agar alur kanal tetap ringkas. Karena tidak ada lampiran, integrasi Cloudflare R2 belum diperlukan. Queue baru diperlukan kelak untuk pekerjaan asinkron seperti pemindaian lampiran atau notifikasi pengguna offline.

## Verifikasi

Jalankan PocketBase yang sudah dimigrasikan dan di-seed, lalu:

```powershell
npm run verify:forum
npm run verify:compile
npm run build
```

Pengujian Forum mencakup RBAC lintas komunitas, pengumuman staf, identitas server, idempotensi, pembatasan pesan duplikat, reply, penolakan reply lintas kanal, endpoint konteks, hak hapus dan penghapusan langsung, validasi emoji Unicode, toggle reaksi, heartbeat, dan pengiriman event SSE.
