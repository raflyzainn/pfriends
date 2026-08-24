# Checklist Migrasi Seluruh Halaman PFriends

Audit kode diperbarui 24 Agustus 2026. Tanda `[x]` berarti data utama halaman sudah menggunakan PocketBase. Tanda `[~]` berarti campuran PocketBase dan data lokal. Tanda `[ ]` berarti belum dimigrasikan dan harus terlihat sebagai `DUMMY` di UI. Halaman statis informasional ditandai terpisah karena tidak membutuhkan backend.

## Publik dan autentikasi

- [x] `/`: hero bersifat statis, sedangkan event terdekat, leaderboard, dan blog terbaru dibaca dari PocketBase.
- [x] `/komunitas`: jumlah anggota aktif, ringkasan komunitas, sebaran chapter, dan agenda dibaca dari PocketBase; narasi serta foto adalah konfigurasi editorial statis.
- [x] `/kalender` dan `/kalender/[id]`: event yang disetujui dibaca dari PocketBase; usulan mentah tidak tampil publik.
- [x] `/gerakan`: gerakan berjalan dan selesai, jumlah peserta, jumlah laporan, target, wilayah, serta kategori dibaca melalui endpoint publik PocketBase.
- [x] `/cerita` dan `/cerita/[slug]`: cerita terbit, detail slug, consent aktif, dan media terkurasi dibaca melalui endpoint publik PocketBase.
- [x] `/metode-pengukuran`: angka anggota, chapter, cerita, kegiatan, gerakan, ledger, dan amplifikasi dihitung melalui endpoint agregat PocketBase.
- [x] `/daftar`: registrasi Awardee, data diri, consent snapshot, dan bukti memakai PocketBase.
- [x] `/pendaftaran/status`: status, klarifikasi, dan kirim ulang registrasi memakai PocketBase.
- [~] `/masuk`: autentikasi Awardee memakai PocketBase; login password staf hanya transisi lokal dan SSO masih `TODO`.
- [x] `/tentang`: halaman informasional statis; tidak memiliki data operasional untuk dimigrasikan.

## Awardee

- [~] `/awardee`: poin, tier, streak, badge, kegiatan, kabar, dan ringkasan Cerita dari PocketBase; sebagian ringkasan komunitas masih lokal (`DUMMY`).
- [x] `/awardee/bukti-keaktifan` dan `/awardee/bukti-keaktifan/[id]`: pengajuan, file terlindungi, status, revisi, dan riwayat memakai PocketBase.
- [x] `/awardee/aksi`: katalog aksi aktif, nilai poin, kuota harian, dan riwayat poin memakai PocketBase; aksi kustom buatan staf otomatis menuju Bukti Keaktifan dan tidak membukukan poin langsung dari browser.
- [x] `/awardee/penghargaan` atau Pencapaian: poin, tier, streak, badge, saldo Koin Tukar, katalog reward, kuota, penukaran, dan Pesanan Saya memakai PocketBase. Quest belum ditampilkan sebagai data operasional pada halaman ini.
- [~] `/awardee/profil`: profil hasil approval dan gamifikasi terbaca dari PocketBase; edit profil umum, consent versioned, statistik konten, dan etalase masih hybrid/lokal (`DUMMY`).
- [x] `/awardee/direktori` atau Jejaring: profil Awardee aktif, pencarian, filter, statistik, pagination, dan gamifikasi ringkas memakai endpoint PocketBase tersanitasi.
- [x] `/awardee/kabar` dan `/awardee/kabar/[id]`: broadcast, dwell/read, CTA, bukti share WhatsApp, bukti share publik, review Verifikator, dan ledger poin memakai PocketBase; membuka tab WhatsApp saja tidak berpoin.
- [x] `/awardee/kalender`: usulan, status keputusan, agenda, pendaftaran, kapasitas, bukti hadir, revisi, dan poin memakai PocketBase.
- [x] `/awardee/gerakan`: usulan, partisipasi, laporan aksi, bukti terlindungi, status pemeriksaan, dan poin pemimpin memakai PocketBase.
- [x] `/awardee/cerita` dan `/awardee/cerita/tulis`: draf, penyimpanan otomatis, unggah bukti, pengajuan, revisi, penerbitan ulang, dan status memakai PocketBase.
- [ ] `/awardee/forum`: state halaman belum mempunyai persistence backend (`DUMMY`).

## Verifikator

- [x] `/verifikator/kabar`: pemantauan read-only atas draf, jadwal, kabar terkirim, audiens, dan jumlah penerima memakai PocketBase; bukti share publik diputuskan melalui Bukti Keaktifan.
- [x] `/verifikator`: total poin, Awardee, tier, streak, badge, leaderboard, antrean, produktivitas bulanan, KPI resmi, laju peninjauan, dan rekam kerja seluruh workflow memakai PocketBase.
- [x] `/verifikator/pendaftaran`: antrean, preview bukti terlindungi, WhatsApp, klarifikasi, approve, reject, dan audit memakai PocketBase.
- [x] `/verifikator/bukti-keaktifan` dan `/verifikator/bukti-keaktifan/[id]`: antrean, preview bukti, review, revisi, approval, ledger poin, dan audit memakai PocketBase.
- [x] `/verifikator/gamifikasi`: memproses penukaran, CRUD katalog hadiah, dan CRUD katalog aksi poin beserta audit memakai PocketBase.
- [x] `/verifikator/cerita` dan `/verifikator/cerita/[id]`: antrean, seluruh status, bukti terlindungi, keputusan, revisi setelah publikasi, penerbitan, arsip, dan audit memakai PocketBase. Query seluruh Cerita memakai field tanggal schema dan sudah diuji agar tidak menghasilkan respons 400.
- [x] `/verifikator/kegiatan`: keputusan usulan, lifecycle agenda, penyuntingan, peserta, dan antrean bukti hadir memakai PocketBase.
- [x] `/verifikator/gerakan`: keputusan usulan, penetapan ESG dan SDG, pemeriksaan laporan aksi, serta penyelesaian Gerakan memakai PocketBase.

## Admin

- [x] `/admin/broadcast`: pembuatan, penyuntingan draf/jadwal, penerbitan, audiens, dan jumlah penerima Kabar memakai PocketBase.

- [x] `/admin/pendaftaran`: monitoring registrasi memakai PocketBase; Admin tidak mengambil keputusan.
- [x] `/admin`: KPI, agregat akun, Cerita, Kabar, SLA, ESG, keterlibatan, chapter, dan rekap bulanan memakai endpoint agregat PocketBase.
- [x] `/admin/awardee`: daftar, pencarian, filter, pagination, status akun, status keanggotaan, waktu masuk terakhir, riwayat audit, dan impersonasi Awardee selama 30 menit memakai PocketBase.
- [x] `/admin/gamifikasi`: hub ringkasan gamifikasi memakai data PocketBase dan mengarahkan ke nested route agar tidak menjadi halaman panjang.
- [x] `/admin/gamifikasi/pesanan` dan `/admin/gamifikasi/hadiah`: pemantauan penukaran serta CRUD katalog hadiah memakai PocketBase; keputusan pesanan tetap milik Verifikator.
- [x] `/admin/gerakan`: pemantauan status, peserta, dan jumlah laporan Gerakan memakai PocketBase tanpa kewenangan keputusan.
- [x] `/admin/cerita` dan `/admin/cerita/[id]`: pemantauan metadata seluruh status, penulis, Verifikator, keputusan, dan riwayat memakai PocketBase tanpa membuka isi atau berkas privat.
- [x] `/admin/gamifikasi/aturan`: CRUD katalog aksi poin, konfigurasi tier, pratinjau dampak, penerapan ulang tier Awardee, dan audit memakai PocketBase.

## Komponen lintas halaman yang sudah backend

- [x] Auth session Awardee dan RBAC route dasar.
- [x] Registrasi Awardee dan audit keputusan.
- [x] Protected file preview untuk bukti registrasi dan bukti keaktifan.
- [x] Tautan WhatsApp `wa.me` pada antrean registrasi.
- [x] Ledger poin dari bukti terverifikasi.
- [x] Ledger akun demo dimigrasikan idempoten ke PocketBase sehingga poin/tier/badge tidak kembali nol.
- [x] Tier, streak mingguan, 14 badge, leaderboard global/komunitas/chapter, serta agregat gamifikasi Verifikator.
- [x] Ledger Koin Tukar, bonus rarity lencana, katalog reward, kuota, redemption idempoten, Pesanan Saya, workflow Verifikator, pemantauan Admin, CRUD hadiah, dan refund.
- [x] Calendar of Event: usulan Awardee, keputusan Verifikator, kalender publik, registrasi, kuota, bukti hadir protected, revisi, dan ledger 15 PK.
- [x] Kabar: publikasi Admin, audiens, read 15 detik, CTA, share WhatsApp, bukti share publik, review Verifikator, serta ledger server.
- [ ] SSO OAuth Verifikator/Admin (`TODO`).
- [ ] Reset password, verifikasi email, MFA, dan notifikasi.
- [~] Consent versioned, profil penuh, forum, dan quest belum selesai. Workflow privat Cerita, Gerakan, pembacaan Cerita publik, serta KPI umum sudah backend.

## Aturan label UI

- Area yang sudah membaca PocketBase tidak diberi label tambahan.
- Hanya area yang belum backend yang diberi badge atau pemberitahuan `DUMMY`.
- Landing, daftar blog, dan detail blog tidak lagi menampilkan pemberitahuan `DUMMY` karena sumber data operasionalnya sudah PocketBase.
- Halaman komunitas tidak lagi menampilkan pemberitahuan `DUMMY` karena seluruh data operasionalnya sudah PocketBase.
- Halaman metode pengukuran tidak lagi menampilkan pemberitahuan `DUMMY` karena potret angka operasionalnya sudah PocketBase.
- Halaman gerakan publik tidak lagi menampilkan pemberitahuan `DUMMY` karena daftar dan agregatnya sudah PocketBase.
- Seluruh halaman publik sudah memakai PocketBase atau konfigurasi editorial statis. Pengecualian pada kelompok autentikasi adalah login staf di `/masuk` yang masih menunggu SSO.
- Pada halaman hybrid, label ditempel pada widget lokal, bukan pada seluruh data backend.
- Data/UI/grafik lokal tidak dihapus selama migrasi; tetap ditampilkan dengan label `DUMMY` sampai adapter PocketBase-nya selesai.
