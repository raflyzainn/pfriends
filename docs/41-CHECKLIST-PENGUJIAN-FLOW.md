# Checklist Pengujian Flow PFriends

Tanggal pengujian: 26 Agustus 2026

Target aplikasi: `http://localhost:5173`

Metode: pengujian antarmuka end-to-end menggunakan Playwright MCP

## Keterangan Status

- `[x]` Sudah diuji dan hasil akhirnya OK.
- `[ ]` Belum diuji secara end-to-end atau pengujiannya belum lengkap.
- `Diperbaiki` berarti masalah ditemukan saat pengujian, perubahan kode sudah dibuat, lalu flow terkait diuji ulang.

## Sudah Diuji dan OK

### Autentikasi dan Navigasi Awardee

- [x] Login sebagai Awardee berhasil.
- [x] Dasbor Awardee dapat dibuka.
- [x] Halaman Aksi & Poin dapat dibuka.
- [x] Halaman Gerakan dapat dibuka.
- [x] Halaman Blog Saya dapat dibuka.
- [x] Halaman Forum dapat dibuka.
- [x] Halaman Calendar dapat dibuka.
- [x] Halaman Pencapaian dapat dibuka.
- [x] Halaman Kabar dapat dibuka.
- [x] Halaman Bukti Keaktifan dapat dibuka.
- [x] Halaman Jejaring dapat dibuka.
- [x] Halaman Profil dapat dibuka.

### Flow Gerakan

- [x] Awardee membuat Gerakan baru melalui formulir Gerakan.
- [x] Data Gerakan tersimpan dan masuk ke antrean Verifikator.
- [x] Login sebagai Verifikator berhasil.
- [x] Verifikator membuka detail Gerakan.
- [x] Verifikator menentukan klasifikasi Gerakan.
- [x] Verifikator menyetujui Gerakan.
- [x] Status Gerakan setelah disetujui berubah menjadi `Berjalan`.
- [x] Detail pemimpin, jumlah peserta, kategori, lokasi, target, dan periode Gerakan tampil.
- [x] Waktu Gerakan pada halaman Verifikator tampil dalam zona waktu WIB setelah perbaikan.

Data uji Gerakan:

- Judul: `Gerakan Uji E2E Literasi Digital 26 Agustus 2026`
- ID: `19lft2w7thjaj45`
- Klasifikasi: `S / SDG 4`
- Status akhir: `Berjalan`

### Flow Bukti Keaktifan dan Poin

- [x] Verifikator membuat katalog aksi `KNOWLEDGE QA`.
- [x] Katalog aksi aktif muncul sebagai pilihan pada formulir Bukti Keaktifan Awardee.
- [x] Awardee mengisi judul dan mengunggah gambar bukti.
- [x] Awardee berhasil mengirim Bukti Keaktifan.
- [x] Status awal pengajuan menjadi `SUBMITTED`.
- [x] Bukti terlindungi dapat dilihat oleh Verifikator.
- [x] Verifikator memulai pemeriksaan dan status berubah menjadi `IN_REVIEW`.
- [x] Verifikator menyetujui pengajuan dengan catatan.
- [x] Status akhir pengajuan menjadi `APPROVED`.
- [x] Poin Awardee bertambah dari 0 menjadi 15.
- [x] Riwayat Poin menampilkan transaksi `KNOWLEDGE QA` sebesar `+15`.
- [x] Pemakaian batas harian tampil `1 dari 2`.
- [x] Antrean dan badge Bukti Keaktifan Verifikator diperbarui setelah keputusan.

Data uji Bukti Keaktifan:

- Judul: `Dokumentasi Tanya Jawab Literasi Digital E2E`
- ID pengajuan: `30ul9k45u5k0byq`
- Kelas aksi: `C`
- Pilar: `Open Community Ecosystem`
- Poin: `15`
- Batas harian: `2`

### Flow Blog

- [x] Awardee mengaktifkan consent `PUBLIKASI_CERITA` dari halaman Profil.
- [x] Awardee membuat draf Blog dengan naskah 368 kata.
- [x] Awardee mengisi klasifikasi ESG `S` dan `SDG 4`.
- [x] Awardee mengisi catatan hasil, metrik, lokasi, tanggal, dan jumlah peserta.
- [x] Awardee mengunggah berkas bukti terlindungi dan foto sampul publik.
- [x] Seluruh syarat pengiriman dan empat gerbang bukti ESG pada form dinyatakan terpenuhi.
- [x] Awardee mengirim Blog ke antrean Verifikator.
- [x] Status Blog berubah dari `DRAFT` menjadi `DIAJUKAN`.
- [x] Verifikator mengambil Blog untuk ditinjau dan status berubah menjadi `REVIEW`.
- [x] Berkas bukti terlindungi dapat dibuka oleh Verifikator.
- [x] Verifikator mengonfirmasi 21 dari 21 butir pemeriksaan data sensitif.
- [x] Verifikator menyetujui Blog dengan catatan audit.
- [x] Status Blog berubah menjadi `DISETUJUI`.
- [x] Verifikator menerbitkan Blog ke ruang publik.
- [x] Status akhir Blog menjadi `TERPUBLIKASI`.
- [x] Artikel tampil di indeks Blog publik dan halaman detail publik dapat dibuka.
- [x] Poin Awardee bertambah dari 15 menjadi 25.
- [x] Ledger menampilkan `STORY SUBMIT`, kelas C, sebesar `+10`.
- [x] Kuota harian `STORY SUBMIT` tampil penuh, yaitu `1 dari 1`.

Data uji Blog:

- Judul: `Belajar Memeriksa Informasi Digital Bersama Komunitas`
- ID: `myu7iysv6cbbwzk`
- Jumlah kata: `368`
- Pilar dan SDG: `S / SDG 4`
- Status akhir: `TERPUBLIKASI`
- Slug publik: `belajar-memeriksa-informasi-digital-bersama-komunitas-awd-dohehbnflzjee5p`
- Poin: `10`

### Perbaikan yang Sudah Diverifikasi

- [x] Diperbaiki: Awardee tidak lagi memanggil endpoint daftar seluruh Awardee yang terlarang sehingga error `403` pada halaman terkait hilang.
- [x] Diperbaiki: periode Gerakan ditampilkan eksplisit dalam zona waktu `Asia/Jakarta` dan diberi label WIB.
- [x] Diperbaiki: formulir Bukti Keaktifan memberi empty state dan menonaktifkan submit saat katalog aksi masih kosong.
- [x] Diperbaiki: pengiriman aksi katalog dinamis tidak lagi gagal karena validasi nilai legacy `activityType`.
- [x] Diperbaiki: daftar dan badge antrean Verifikator dimuat ulang setelah proses review.
- [x] Diperbaiki: aktivasi consent mandiri memakai snapshot policy bawaan saat referensi `consent_policies` belum tersedia, sehingga tidak lagi gagal dengan 404 `Data tidak ditemukan`.
- [x] Diperbaiki: katalog aksi `STORY_SUBMIT` dilengkapi dengan kelas C, 10 poin, dan batas satu kali per hari.
- [x] Diperbaiki: konfigurasi `STORY_SUBMIT` yang hilang kini menghasilkan pesan `Katalog aksi STORY_SUBMIT belum aktif` dan bukan 404 generik.

## Belum Diuji atau Belum Lengkap

### Bukti Keaktifan

- [ ] Verifikator meminta revisi Bukti Keaktifan.
- [ ] Awardee memperbaiki dan mengirim ulang Bukti Keaktifan.
- [ ] Verifikator menolak Bukti Keaktifan.
- [ ] Memastikan pengajuan yang ditolak tidak menambah poin.
- [ ] Menguji dua approval dalam satu hari hingga batas harian terpenuhi.
- [ ] Menguji pengajuan berikutnya setelah batas harian tercapai.
- [ ] Menguji tipe dan ukuran berkas bukti yang tidak valid.

### Gerakan

- [ ] Awardee lain bergabung ke Gerakan yang sudah disetujui.
- [ ] Pengelola Gerakan menerima atau menolak permintaan peserta, jika flow tersebut tersedia.
- [ ] Pemimpin mengirim laporan pelaksanaan Gerakan.
- [ ] Verifikator memeriksa laporan pelaksanaan Gerakan.
- [ ] Gerakan selesai dan poin pemimpin sebesar 50 masuk ke ledger.
- [ ] Flow revisi atau penolakan Gerakan oleh Verifikator.

### Blog

- [ ] Verifikator atau pengelola meminta revisi artikel.
- [ ] Awardee mengirim ulang artikel yang telah direvisi.
- [ ] Verifikator mengarsipkan atau menolak artikel.
- [ ] Memastikan Blog yang memenuhi batas harian berikutnya tidak memperoleh poin tambahan pada hari yang sama.

### Forum

- [ ] Awardee membuat topik atau mengirim pesan Forum.
- [ ] Awardee lain melihat dan membalas pesan.
- [ ] Validasi akses, moderasi, dan status pesan diuji.

### Calendar dan Event

- [x] Awardee mengusulkan event `Kelas Literasi Digital Komunitas E2E 26 Agustus 2026` dan status awal tersimpan sebagai `DIUSULKAN`.
- [x] Verifikator menyetujui usulan; status berubah menjadi `TERJADWAL` dan event tampil pada kalender Awardee.
- [x] Awardee mendaftar ke event; status pendaftaran tersimpan dan jumlah kursi terpesan berubah menjadi 1 tanpa pemberian poin.
- [x] Verifikator menjalankan lifecycle event dari `TERJADWAL` menjadi `BERLANGSUNG`, lalu `SELESAI`.
- [x] Awardee mengirim bukti kehadiran event; pengajuan `d5rppp62qkt1inj` tersimpan dan masuk antrean pemeriksaan.
- [x] Verifikator memulai pemeriksaan dan menyetujui bukti kehadiran.
- [x] Kehadiran berubah menjadi tercatat, jumlah peserta hadir menjadi 1 dari 1 pendaftar, dan saldo Awardee naik dari 25 menjadi 40 PK.
- [x] Ledger mencatat `SESSION_ATTEND`, kelas C, sebesar `+15` PK pada 26 Agustus 2026.
- [x] Kuota harian berubah menjadi terpakai 1 dari 2 dan tidak ada console error pada pemeriksaan akhir.
- [ ] Flow penolakan atau permintaan revisi bukti kehadiran diuji.
- [ ] Pembatalan event dan pencegahan registrasi setelah batas waktu diuji.
- [ ] Batas harian `SESSION_ATTEND` diuji sampai menghasilkan ledger 0 dengan alasan `DAILY_CAP`.

### Kabar dan Aktivitas Lain

- [x] Awardee membuka Kabar minimal 15 detik dan klaim `BROADCAST_VIEW` berhasil memberikan 1 PK tanpa respons 404.
- [x] Awardee mengirim tanggapan bermakna dan `CTA_REACT` berhasil memberikan 2 PK tanpa respons 404.
- [x] Dialog bagikan WhatsApp menampilkan WhatsApp sebagai platform, membuka pemilih file, menampilkan nama file terpilih, dan berhasil mengirim bukti untuk diperiksa.
- [x] Dialog bagikan media sosial menampilkan pilihan platform publik dan pemilih file berhasil dibuka.
- [ ] Flow interaksi Kabar yang memerlukan bukti diuji sampai keputusan Verifikator.
- [ ] Poin `SHARE_PRIVATE` atau `SHARE_PUBLIC` diverifikasi pada ledger setelah keputusan Verifikator.
- [ ] Flow Jejaring yang memiliki aksi atau poin diuji end-to-end.
- [ ] Flow Pencapaian diuji setelah beberapa transaksi poin dan perubahan tier.
- [x] Homepage publik menghitung tier leaderboard dari 43 PK dan tabel tier PocketBase sehingga Achmad Rafly tampil sebagai `Active Member`, bukan snapshot `Newcomer` yang sudah kedaluwarsa.

### Reward

- [ ] Penukaran reward dengan saldo mencukupi.
- [ ] Pengurangan saldo setelah penukaran diverifikasi pada ledger.
- [ ] Reward berstatus belum tersedia, habis, atau kuota nol tidak dapat ditukar.
- [ ] Percobaan penukaran dengan saldo tidak mencukupi ditolak dengan benar.

### Profil dan Persetujuan

- [ ] Awardee mengubah data profil dan memastikan perubahan tersimpan setelah login ulang.
- [ ] Upload atau penggantian foto profil diuji.
- [ ] Perubahan persetujuan atau consent diuji tanpa memberikan akses yang tidak semestinya.

## Verifikasi Teknis yang Sudah Dijalankan

- [x] `npm run verify:compile`, 143 komponen, 0 gagal, 0 peringatan.
- [x] `npm run verify:domain`, 210 pengujian lulus.
- [x] `npm run build`, build berhasil.
- [x] `git diff --check`, tidak ditemukan masalah whitespace.

## Catatan Batas Pengujian

- Checklist ini mencatat hasil yang benar-benar dicapai pada sesi pengujian 26 Agustus 2026.
- Flow yang halamannya hanya berhasil dibuka belum dianggap lolos end-to-end jika belum ada aksi, perubahan status, dan verifikasi data akhir.
- `verify:movements` belum dinyatakan lulus karena skrip mengarah ke backend remote dan kredensial skrip tidak berhasil. Seeder tidak dijalankan terhadap backend remote.
- Data, status, dan saldo dapat berubah setelah dokumen ini dibuat. Lakukan pengujian ulang sebelum rilis produksi.
