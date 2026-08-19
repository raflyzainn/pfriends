# Checklist Migrasi Seluruh Halaman PFfriends

Audit kode per 19 Agustus 2026. Tanda `[x]` berarti data utama halaman sudah menggunakan PocketBase. Tanda `[~]` berarti campuran PocketBase dan data lokal. Tanda `[ ]` berarti belum dimigrasikan dan harus terlihat sebagai `DUMMY` di UI. Halaman statis informasional ditandai terpisah karena tidak membutuhkan backend.

## Publik dan autentikasi

- [ ] `/` — landing, sorotan, angka, dan konten masih berasal dari katalog/seed lokal (`DUMMY`).
- [ ] `/komunitas` — katalog komunitas masih lokal (`DUMMY`).
- [x] `/kalender` dan `/kalender/[id]` — event yang disetujui dibaca dari PocketBase; usulan mentah tidak tampil publik.
- [ ] `/gerakan` — gerakan publik masih lokal (`DUMMY`).
- [ ] `/cerita` dan `/cerita/[slug]` — cerita publik masih lokal (`DUMMY`).
- [ ] `/metode-pengukuran` — angka dampak masih store lokal (`DUMMY`).
- [x] `/daftar` — registrasi Awardee, data diri, consent snapshot, dan bukti memakai PocketBase.
- [x] `/pendaftaran/status` — status, klarifikasi, dan kirim ulang registrasi memakai PocketBase.
- [~] `/masuk` — autentikasi Awardee memakai PocketBase; login password staf hanya transisi lokal dan SSO masih `TODO`.
- [x] `/tentang` — halaman informasional statis; tidak memiliki data operasional untuk dimigrasikan.

## Awardee

- [~] `/awardee` — poin, tier, streak, badge, dan kegiatan dari PocketBase; kabar, cerita, serta ringkasan komunitas masih lokal (`DUMMY`).
- [x] `/awardee/bukti-keaktifan` dan `/awardee/bukti-keaktifan/[id]` — pengajuan, file terlindungi, status, revisi, dan riwayat memakai PocketBase.
- [~] `/awardee/aksi` — riwayat poin memakai ledger PocketBase; katalog aksi ringan dan interaksi langsung belum backend (`DUMMY`).
- [x] `/awardee/penghargaan` atau Pencapaian — poin, tier, streak, badge, saldo Koin Tukar, katalog reward, kuota, penukaran, dan Pesanan Saya memakai PocketBase. Quest belum ditampilkan sebagai data operasional pada halaman ini.
- [~] `/awardee/profil` — profil hasil approval dan gamifikasi terbaca dari PocketBase; edit profil umum, consent versioned, statistik konten, dan etalase masih hybrid/lokal (`DUMMY`).
- [x] `/awardee/direktori` atau Jejaring — profil Awardee aktif, pencarian, filter, statistik, pagination, dan gamifikasi ringkas memakai endpoint PocketBase tersanitasi.
- [ ] `/awardee/kabar` dan `/awardee/kabar/[id]` — broadcast, status baca, share, dan CTA masih lokal (`DUMMY`).
- [x] `/awardee/kalender` — usulan, status keputusan, agenda, pendaftaran, kapasitas, bukti hadir, revisi, dan poin memakai PocketBase.
- [ ] `/awardee/gerakan` — partisipasi serta laporan dampak masih lokal (`DUMMY`).
- [ ] `/awardee/cerita` dan `/awardee/cerita/tulis` — draft, submit, kurasi, dan publikasi masih lokal (`DUMMY`).
- [ ] `/awardee/forum` — state halaman belum mempunyai persistence backend (`DUMMY`).

## Verifikator

- [~] `/verifikator` — total poin, Awardee, tier, streak, badge, leaderboard, dan antrean kegiatan dari PocketBase; KPI konten, antrean cerita, laju review, serta rekam kerja lain masih lokal dan diberi label `DUMMY` per widget.
- [x] `/verifikator/pendaftaran` — antrean, preview bukti terlindungi, WhatsApp, klarifikasi, approve, reject, dan audit memakai PocketBase.
- [x] `/verifikator/bukti-keaktifan` dan `/verifikator/bukti-keaktifan/[id]` — antrean, preview bukti, review, revisi, approval, ledger poin, dan audit memakai PocketBase.
- [x] `/verifikator/gamifikasi` — melihat penukar, memproses seluruh status pesanan, refund, WhatsApp, serta CRUD katalog hadiah memakai PocketBase.
- [ ] `/verifikator/cerita` dan `/verifikator/cerita/[id]` — workflow kurasi cerita masih Dexie (`DUMMY`).
- [x] `/verifikator/kegiatan` — keputusan usulan, lifecycle agenda, penyuntingan, peserta, dan antrean bukti hadir memakai PocketBase.

## Admin

- [x] `/admin/pendaftaran` — monitoring registrasi memakai PocketBase; Admin tidak mengambil keputusan.
- [ ] `/admin` — KPI dan agregat operasional umum masih lokal (`DUMMY`).
- [ ] `/admin/awardee` — manajemen akun/Awardee masih lokal dan memakai akun demo (`DUMMY`).
- [~] `/admin/gamifikasi` — hub ringkasan gamifikasi memakai data PocketBase dan mengarahkan ke nested route agar tidak menjadi halaman panjang.
- [x] `/admin/gamifikasi/pesanan` dan `/admin/gamifikasi/hadiah` — pemantauan penukaran serta CRUD katalog hadiah memakai PocketBase; keputusan pesanan tetap milik Verifikator.
- [ ] `/admin/gamifikasi/aturan` — konfigurasi poin, tier, dan simulasi tetap dipertahankan dengan navigasi lompat, tetapi masih lokal (`DUMMY`).

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
- [ ] SSO OAuth Verifikator/Admin (`TODO`).
- [ ] Reset password, verifikasi email, MFA, dan notifikasi.
- [ ] Consent versioned, profil penuh, konten cerita, gerakan, forum, quest, dan KPI umum. Kegiatan/Calendar of Event sudah backend.

## Aturan label UI

- Area yang sudah membaca PocketBase tidak diberi label tambahan.
- Hanya area yang belum backend yang diberi badge atau pemberitahuan `DUMMY`.
- Pada halaman hybrid, label ditempel pada widget lokal, bukan pada seluruh data backend.
- Data/UI/grafik lokal tidak dihapus selama migrasi; tetap ditampilkan dengan label `DUMMY` sampai adapter PocketBase-nya selesai.
