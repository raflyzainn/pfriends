# Gamifikasi Server-side

Status per 19 Agustus 2026: poin, tier, streak mingguan, badge, leaderboard, Koin Tukar, reward, penukaran, dan agregat gamifikasi dihitung atau diproses oleh PocketBase. Frontend hanya membaca hasil dan mengirim perintah.

## Sumber kebenaran

- `verified_point_activities`: ledger poin server dengan sumber `EVIDENCE` untuk bukti yang disetujui Verifikator dan `DEMO_SEED` untuk akun demo. Entri aktif berstatus `AWARDED`; pencabutan Admin mengubahnya menjadi `REVOKED` beserta alasan dan aktor.
- `gamification_profiles`: proyeksi total poin, tier, streak, dan identitas leaderboard per Awardee.
- `badges`: katalog 14 badge.
- `awardee_badges`: hasil evaluasi badge per Awardee.
- `coin_transactions` dan `coin_accounts`: ledger koin append-only dan proyeksi saldo.
- `rewards` dan `redemptions`: katalog, kuota, pesanan, status, serta audit Admin.

Endpoint yang digunakan UI:

- `GET /api/pfriends/gamification/me` untuk pencapaian Awardee, ledger, dan kuota harian sembilan aksi;
- `GET /api/pfriends/gamification/leaderboard` untuk global, komunitas, chapter, seluruh waktu, atau bulan berjalan;
- `GET /api/pfriends/verifier/dashboard` untuk angka poin, tier, badge, streak, distribusi, leaderboard, Cerita terbit bulanan, KPI resmi, laju peninjauan, dan rekam kerja Verifikator;
- `POST /api/pfriends/point-activities/{id}/revoke` untuk pencabutan poin oleh Admin.
- `GET /api/pfriends/achievements` dan `POST /api/pfriends/redemptions` untuk Pencapaian Awardee;
- `GET /api/pfriends/admin/redemptions` dan endpoint `transition` untuk pemrosesan Admin.

Tier dihitung pada ambang 0, 25, 50, 100, dan 150 poin. Pekan streak dimulai Selasa pukul 00.00 WIB. Profil dan badge direkonsiliasi dari ledger sehingga nilai agregat dapat dibangun ulang.

## Pusat Aksi

`/awardee/aksi` membaca ledger, katalog `actions`, dan `dailyUsage` dari endpoint gamifikasi. Katalog berasal dari `point_actions` berstatus aktif. `dailyUsage` memuat `actionId`, kode aksi, `used`, `cap`, `remaining`, `exhausted`, dan `periodKey`. Penggunaan dihitung dari `verified_point_activities` milik Awardee pada hari server yang sama dengan pemeriksaan cap.

Ambang tier tidak lagi hanya berasal dari konstanta frontend. Collection `gamification_tiers` menjadi sumber aktif dan dikirim melalui `GET /api/pfriends/gamification/me`. Admin mengubahnya melalui alur pratinjau dan konfirmasi di `/admin/gamifikasi/aturan`. Penerapan memperbarui tier seluruh profil tanpa mengubah total poin, lalu menyelaraskan lencana dan saldo bonus terkait.

Kartu Pusat Aksi hanya mengantar Awardee ke rumah operasional aksi. Kabar, Cerita, Calendar of Event, dan Gerakan membukukan poin melalui endpoint masing-masing. `KNOWLEDGE_QA`, `SPEAKER_MENTOR`, dan seluruh aksi kustom membuka formulir Bukti Keaktifan dengan aksi terpilih. Tidak ada kartu yang memberikan poin langsung dari browser. Rancangan CRUD dan audit dijelaskan di `docs/31-KATALOG-AKSI-DINAMIS-POCKETBASE.md`.

## Batas implementasi

Quest dan simulator konfigurasi Admin masih lokal serta ditandai `DUMMY` di UI. Rincian koin dan Pesanan Saya ada di `docs/20-KOIN-REWARD-DAN-PENUKARAN.md`.

Pengecualian terkontrol hanya berlaku untuk lingkungan demo: `npm run pb:seed` mengimpor aktivitas seed berstatus `AWARDED` secara idempoten dengan `legacyActivityId`. Hal ini membuat akun demo mempertahankan poin, tier, streak, badge, dan leaderboard yang sama setelah sumber pembacaan dipindah dari Dexie ke PocketBase. Ledger hasil registrasi/verifikasi tidak ditimpa.

## Verifikasi

Jalankan PocketBase terlebih dahulu, kemudian:

```powershell
npm run verify:backend
npm run verify:compile
npm run build
```

Tes registrasi membuat Awardee baru, menyetujui akun, mengirim dan menyetujui bukti, lalu memeriksa ledger, poin, tier, streak, badge, leaderboard, dan dasbor Verifikator.
