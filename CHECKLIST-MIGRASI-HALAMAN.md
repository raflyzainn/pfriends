# Checklist Migrasi Seluruh Halaman PFfriends

Audit kode per 19 Agustus 2026. Tanda `[x]` berarti data utama halaman sudah menggunakan PocketBase. Tanda `[~]` berarti campuran PocketBase dan data lokal. Tanda `[ ]` berarti belum dimigrasikan dan harus terlihat sebagai `DUMMY` di UI. Halaman statis informasional ditandai terpisah karena tidak membutuhkan backend.

## Publik dan autentikasi

- [ ] `/` — landing, sorotan, angka, dan konten masih berasal dari katalog/seed lokal (`DUMMY`).
- [ ] `/komunitas` — katalog komunitas masih lokal (`DUMMY`).
- [ ] `/kalender` dan `/kalender/[id]` — kegiatan publik masih lokal (`DUMMY`).
- [ ] `/gerakan` — gerakan publik masih lokal (`DUMMY`).
- [ ] `/cerita` dan `/cerita/[slug]` — cerita publik masih lokal (`DUMMY`).
- [ ] `/metode-pengukuran` — angka dampak masih store lokal (`DUMMY`).
- [x] `/daftar` — registrasi Awardee, data diri, consent snapshot, dan bukti memakai PocketBase.
- [x] `/pendaftaran/status` — status, klarifikasi, dan kirim ulang registrasi memakai PocketBase.
- [~] `/masuk` — autentikasi Awardee memakai PocketBase; login password staf hanya transisi lokal dan SSO masih `TODO`.
- [x] `/tentang` — halaman informasional statis; tidak memiliki data operasional untuk dimigrasikan.

## Awardee

- [~] `/awardee` — poin, tier, streak, dan badge dari PocketBase; kabar, kegiatan, cerita, serta ringkasan komunitas masih lokal (`DUMMY`).
- [x] `/awardee/bukti-keaktifan` dan `/awardee/bukti-keaktifan/[id]` — pengajuan, file terlindungi, status, revisi, dan riwayat memakai PocketBase.
- [~] `/awardee/aksi` — riwayat poin memakai ledger PocketBase; katalog aksi ringan dan interaksi langsung belum backend (`DUMMY`).
- [~] `/awardee/penghargaan` atau Pencapaian — poin, tier, streak, dan badge memakai PocketBase; koin, reward, penukaran, pesanan, dan quest masih lokal (`DUMMY`).
- [~] `/awardee/profil` — profil hasil approval dan gamifikasi terbaca dari PocketBase; edit profil umum, consent versioned, statistik konten, dan etalase masih hybrid/lokal (`DUMMY`).
- [x] `/awardee/direktori` atau Jejaring — profil Awardee aktif, pencarian, filter, statistik, pagination, dan gamifikasi ringkas memakai endpoint PocketBase tersanitasi.
- [ ] `/awardee/kabar` dan `/awardee/kabar/[id]` — broadcast, status baca, share, dan CTA masih lokal (`DUMMY`).
- [ ] `/awardee/kalender` — kegiatan, pendaftaran, kapasitas, dan attendance masih lokal (`DUMMY`).
- [ ] `/awardee/gerakan` — partisipasi serta laporan dampak masih lokal (`DUMMY`).
- [ ] `/awardee/cerita` dan `/awardee/cerita/tulis` — draft, submit, kurasi, dan publikasi masih lokal (`DUMMY`).
- [ ] `/awardee/forum` — state halaman belum mempunyai persistence backend (`DUMMY`).

## Verifikator

- [~] `/verifikator` — total poin, Awardee terdaftar/aktif, tier, streak, badge, distribusi, tren poin, dan leaderboard dari PocketBase; KPI konten, antrean cerita/kegiatan, laju review, serta rekam kerja masih lokal dan diberi label `DUMMY` per widget.
- [x] `/verifikator/pendaftaran` — antrean, preview bukti terlindungi, WhatsApp, klarifikasi, approve, reject, dan audit memakai PocketBase.
- [x] `/verifikator/bukti-keaktifan` dan `/verifikator/bukti-keaktifan/[id]` — antrean, preview bukti, review, revisi, approval, ledger poin, dan audit memakai PocketBase.
- [ ] `/verifikator/cerita` dan `/verifikator/cerita/[id]` — workflow kurasi cerita masih Dexie (`DUMMY`).
- [ ] `/verifikator/kegiatan` — workflow kegiatan masih Dexie (`DUMMY`).

## Admin

- [x] `/admin/pendaftaran` — monitoring registrasi memakai PocketBase; Admin tidak mengambil keputusan.
- [ ] `/admin` — KPI dan agregat operasional umum masih lokal (`DUMMY`).
- [ ] `/admin/awardee` — manajemen akun/Awardee masih lokal dan memakai akun demo (`DUMMY`).
- [ ] `/admin/gamifikasi` — simulator konfigurasi, ledger administratif, reward, dan proyeksi masih lokal (`DUMMY`). Endpoint pencabutan poin server sudah tersedia, tetapi belum menggantikan keseluruhan halaman.

## Komponen lintas halaman yang sudah backend

- [x] Auth session Awardee dan RBAC route dasar.
- [x] Registrasi Awardee dan audit keputusan.
- [x] Protected file preview untuk bukti registrasi dan bukti keaktifan.
- [x] Tautan WhatsApp `wa.me` pada antrean registrasi.
- [x] Ledger poin dari bukti terverifikasi.
- [x] Ledger akun demo dimigrasikan idempoten ke PocketBase sehingga poin/tier/badge tidak kembali nol.
- [x] Tier, streak mingguan, 14 badge, leaderboard global/komunitas/chapter, serta agregat gamifikasi Verifikator.
- [ ] SSO OAuth Verifikator/Admin (`TODO`).
- [ ] Reset password, verifikasi email, MFA, dan notifikasi.
- [ ] Consent versioned, profil penuh, konten, kegiatan, gerakan, forum, reward/redemption, dan KPI umum.

## Aturan label UI

- Area yang sudah membaca PocketBase tidak diberi label tambahan.
- Hanya area yang belum backend yang diberi badge atau pemberitahuan `DUMMY`.
- Pada halaman hybrid, label ditempel pada widget lokal, bukan pada seluruh data backend.
- Data/UI/grafik lokal tidak dihapus selama migrasi; tetap ditampilkan dengan label `DUMMY` sampai adapter PocketBase-nya selesai.
