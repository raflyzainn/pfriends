# Gamifikasi Server-side

Status per 19 Agustus 2026: poin dari bukti keaktifan, tier, streak mingguan, badge, leaderboard, dan agregat gamifikasi dasbor Verifikator dihitung oleh PocketBase. Frontend hanya membaca hasilnya.

## Sumber kebenaran

- `verified_point_activities`: ledger poin server dengan sumber `EVIDENCE` untuk bukti yang disetujui Verifikator dan `DEMO_SEED` untuk akun demo. Entri aktif berstatus `AWARDED`; pencabutan Admin mengubahnya menjadi `REVOKED` beserta alasan dan aktor.
- `gamification_profiles`: proyeksi total poin, tier, streak, dan identitas leaderboard per Awardee.
- `badges`: katalog 14 badge.
- `awardee_badges`: hasil evaluasi badge per Awardee.

Endpoint yang digunakan UI:

- `GET /api/pfriends/gamification/me` untuk pencapaian Awardee;
- `GET /api/pfriends/gamification/leaderboard` untuk global, komunitas, chapter, seluruh waktu, atau bulan berjalan;
- `GET /api/pfriends/verifier/dashboard` untuk angka poin, tier, badge, streak, distribusi, dan leaderboard Verifikator;
- `POST /api/pfriends/point-activities/{id}/revoke` untuk pencabutan poin oleh Admin.

Tier dihitung pada ambang 0, 25, 50, 100, dan 150 poin. Pekan streak dimulai Selasa pukul 00.00 WIB. Profil dan badge direkonsiliasi dari ledger sehingga nilai agregat dapat dibangun ulang.

## Batas implementasi

Hanya aktivitas yang mempunyai bukti dan keputusan Verifikator yang menjadi sumber poin backend. Aksi ringan seperti membaca kabar atau menekan CTA belum mempunyai engagement backend dan tidak boleh menambah ledger dari browser. Reward, koin, penukaran, quest, simulator Admin, konten, cerita, kegiatan, gerakan, dan sebagian besar KPI masih memakai data lokal serta ditandai `DUMMY` di UI.

Pengecualian terkontrol hanya berlaku untuk lingkungan demo: `npm run pb:seed` mengimpor aktivitas seed berstatus `AWARDED` secara idempoten dengan `legacyActivityId`. Hal ini membuat akun demo mempertahankan poin, tier, streak, badge, dan leaderboard yang sama setelah sumber pembacaan dipindah dari Dexie ke PocketBase. Ledger hasil registrasi/verifikasi tidak ditimpa.

## Verifikasi

Jalankan PocketBase terlebih dahulu, kemudian:

```powershell
npm run verify:backend
npm run verify:compile
npm run build
```

Tes registrasi membuat Awardee baru, menyetujui akun, mengirim dan menyetujui bukti, lalu memeriksa ledger, poin, tier, streak, badge, leaderboard, dan dasbor Verifikator.
