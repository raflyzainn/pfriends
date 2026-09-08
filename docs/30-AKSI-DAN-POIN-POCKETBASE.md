# Pusat Aksi dan Poin dengan PocketBase

## Status implementasi

Halaman `/awardee/aksi` sudah memakai PocketBase untuk katalog aksi aktif, ledger, dan kuota harian. Menu **Aksi & Poin** tersedia pada sidebar desktop dan laci navigasi Awardee. Lima menu utama pada BottomNav ponsel tidak berubah.

## Sumber data

`GET /api/pfriends/gamification/me` mengembalikan profil gamifikasi, dompet Koin Tukar, katalog `actions`, ledger, badge, dan `dailyUsage`. Setiap baris `dailyUsage` berisi:

- `actionId` dan `type`: identitas serta kode aksi aktif;
- `used` dan `cap`: penggunaan serta batas harian;
- `remaining` dan `exhausted`: sisa dan keadaan kuota;
- `periodKey`: tanggal server yang dipakai untuk perhitungan.

Kuota dihitung dari `verified_point_activities` milik Awardee. Submission yang masih menunggu keputusan belum mengurangi kuota karena belum menghasilkan ledger. PocketBase tetap memeriksa cap ketika poin benar-benar dibukukan.

## Alur kartu aksi

- Baca, CTA, dan share Kabar menuju `/awardee/kabar`.
- Cerita menuju komposer `/awardee/cerita/tulis`.
- Kehadiran menuju `/awardee/kalender`.
- Memimpin aksi menuju `/awardee/gerakan`.
- `KNOWLEDGE_QA`, `SPEAKER_MENTOR`, dan aksi kustom menuju `/awardee/bukti-keaktifan` dengan aksi yang sudah dipilih.

Parameter lama `activityType` tetap didukung untuk aksi inti. Aksi kustom memakai parameter `action` berisi id `point_actions`. Nilai tidak dikenal diabaikan dan formulir kembali ke pilihan aktif pertama. Kartu katalog tidak pernah membuat ledger atau memberi poin langsung dari browser. CRUD staf dan audit dijelaskan di `docs/31-KATALOG-AKSI-DINAMIS-POCKETBASE.md`.

## Verifikasi

```powershell
npm run verify:compile
npm run verify:domain
npm run verify:rewards
npm run build
```

Tes reward memeriksa bahwa endpoint mengembalikan sembilan kuota unik dengan `used`, `cap`, `remaining`, `exhausted`, dan `periodKey` yang konsisten untuk Awardee aktif. Tes domain menjaga menu Aksi tetap tersedia tanpa mengubah lima tujuan BottomNav.
