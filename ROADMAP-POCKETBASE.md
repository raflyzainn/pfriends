# Roadmap Migrasi Data Dummy ke PocketBase — PFfriends

> Status 18 Agustus 2026: fondasi PocketBase Auth dan vertical slice **Bukti Keaktifan**
> (submission Awardee, review Verifikator, protected files, serta ledger poin gabungan)
> telah diimplementasikan. Detail operasional ada di `docs/15-POCKETBASE-BUKTI-KEAKTIFAN.md`.

Dokumen ini menjelaskan kondisi PFfriends saat ini dan rencana bertahap untuk memindahkan data demo dari IndexedDB/Dexie ke backend PocketBase tanpa menulis ulang domain dan tampilan yang sudah ada.

## 1. Ringkasan proyek

PFfriends adalah microsite **Community Connect Initiative** milik Corporate Secretary Pertamina Foundation. Produk ini menghubungkan alumni/awardee, komunitas Sobat Bumi dan PFpreneur/Womenpreneur, serta tim internal Pertamina Foundation dalam satu ekosistem.

Fitur utamanya meliputi:

- situs publik: landing page, profil komunitas, kalender, gerakan, cerita, dan metode pengukuran;
- area Awardee: profil, direktori, kalender, gerakan, aksi berpoin, kabar, cerita, forum, dan penghargaan;
- area Verifikator: antrean dan keputusan verifikasi cerita serta kegiatan;
- area Admin: KPI, pengelolaan awardee, dan konfigurasi gamifikasi;
- proses lintas fitur: autentikasi berbasis peran, consent, moderasi editorial, poin, tier, badge, leaderboard, reward, serta metrik dampak/ESG.

### Teknologi saat ini

| Lapisan | Teknologi/kondisi |
|---|---|
| Frontend | SvelteKit 2, Svelte 5 runes, Vite 7 |
| Styling | Tailwind CSS 4 dan komponen Svelte internal |
| Visualisasi | ECharts 6 |
| Data saat ini | Dexie 4 di IndexedDB per peramban |
| Backend | Belum ada |
| Autentikasi | Demo di sisi klien; password hash FNV-1a, tidak aman untuk produksi |
| Deploy saat ini | `@sveltejs/adapter-static`, SPA (`ssr = false`) |
| Pengujian | compile, domain, seed, public-purity, build, serta E2E berbasis browser |

### Arsitektur yang sudah baik untuk dipertahankan

```text
Presentation (src/routes, components)
             |
Application (src/lib/stores)
             |
Domain (entity, policy, service, repository contract)
             ^
Infrastructure (saat ini Dexie; target PocketBase)
```

UI dan store mayoritas sudah berbicara melalui repository. Titik sambung utama berada di `src/lib/infrastructure/repositories/`. Karena domain tidak mengimpor Dexie atau Svelte, migrasi dapat berfokus pada infrastructure, autentikasi, dan keamanan backend.

## 2. Kondisi data dummy sekarang

Saat aplikasi pertama kali dibuka, `bootstrapDatabase()` membangun seed deterministik lalu menulisnya ke IndexedDB. Data tersimpan hanya pada peramban tersebut. Peramban atau perangkat lain tidak berbagi perubahan.

Sebelas tabel data demo saat ini:

| Dexie | Isi | Repository saat ini |
|---|---|---|
| `accounts` | akun demo dan role | `AccountRepository` |
| `awardees` | profil, komunitas, chapter, poin, tier-related state | `AwardeeRepository` |
| `activities` | buku besar aktivitas/poin | `ActivityRepository` |
| `stories` | cerita dan alur moderasi | `StoryRepository` |
| `events` | kegiatan, peserta, dan alur persetujuan | `EventRepository` |
| `movements` | gerakan dan partisipasi | `MovementRepository` |
| `broadcasts` | kabar/diseminasi dan engagement | `BroadcastRepository` |
| `rewards` | katalog penghargaan dan kuota | `RewardRepository` |
| `badges` | katalog lencana | `BadgeRepository` |
| `consents` | persetujuan penggunaan data | `ConsentRepository` |
| `redemptions` | permintaan penukaran poin | saat ini ditangani melalui reward repository |

Data statis seperti navigasi, icon, konstanta skor, tier, SLA, taksonomi ESG, dan aturan domain **bukan data dummy operasional**. Data tersebut sebaiknya tetap menjadi kode karena merupakan konfigurasi bisnis yang version-controlled. Foto editorial yang benar-benar dikelola pengguna nantinya masuk PocketBase Files; aset desain tetap di `static/`.

Masalah yang harus diselesaikan sebelum produksi:

1. autentikasi dan route guard sekarang hanya proteksi UX di klien;
2. seluruh pengguna dapat memiliki salinan database berbeda;
3. password dan keputusan sensitif diproses di peramban;
4. perubahan multi-record (poin, saldo koin, kuota, redemption) belum atomik di server;
5. array ID seperti peserta, liker, reader, atau badge holder sulit diberi aturan akses dan audit;
6. belum ada backup, audit trail server, rate limiting, atau pemisahan lingkungan dev/staging/production.

## 3. Arsitektur target

Untuk bentuk aplikasi sekarang yang memang SPA, gunakan PocketBase sebagai backend HTTP, auth, file storage, realtime opsional, serta pusat aturan akses.

```text
Browser / SvelteKit SPA
  -> Svelte stores
  -> PocketBaseRepository + mapper
  -> PocketBase Web API
       -> Auth collection + API rules
       -> Base/View collections
       -> JS hooks untuk transaksi dan aturan kritis
       -> SQLite + file storage
```

Prinsip implementasi:

- gunakan SDK `pocketbase` melalui satu client factory, bukan dibuat ulang di setiap komponen;
- repository mengubah record PocketBase menjadi entity domain melalui mapper eksplisit;
- domain service dan konstanta bisnis tetap menjadi sumber aturan di sisi frontend untuk UX;
- aturan keamanan, validasi kritis, idempotensi, dan transaksi saldo **wajib diulangi di server** melalui API rules dan hooks;
- akun superuser hanya untuk administrasi/deployment, tidak pernah ditaruh pada variabel `VITE_*` atau bundle browser;
- skema disimpan sebagai `pocketbase/pb_migrations/` dan dikomit, bukan hanya dikonfigurasi manual lewat dashboard;
- Dexie tidak langsung dihapus: pertahankan sementara sebagai cache/read-only fallback selama fase transisi, lalu hapus setelah stabil.

> Catatan keputusan: PocketBase cocok dengan SPA proyek ini, tetapi dokumentasi resminya masih memperingatkan bahwa PocketBase belum direkomendasikan untuk aplikasi production-critical tanpa kesiapan mengikuti changelog dan migrasi manual. Keputusan go-live perlu menerima risiko operasional ini atau membandingkannya dengan backend yang lebih matang.

## 4. Rancangan koleksi PocketBase

Nama dan field final harus dikunci melalui workshop data dictionary. Rancangan awal berikut cukup untuk memulai migration spike.

| Koleksi | Tipe | Relasi/keterangan utama | Akses ringkas |
|---|---|---|---|
| `users` | Auth | email, role, status, relation opsional ke `awardees` | diri sendiri; admin mengelola sesuai aturan |
| `awardees` | Base | user, fullName, community, chapter, status, profil, statistik turunan | publik hanya field aman; lengkap untuk pemilik/internal |
| `point_activities` | Base | awardee, type, points, coins, status, occurredAt, idempotencyKey unik | pemilik membaca; server/internal membuat/memutuskan |
| `stories` | Base | author, reviewer, slug unik, status, body, consent/evidence, cover file | published untuk publik; draft milik penulis; review untuk internal |
| `events` | Base | proposer, reviewer, chapter, slug, status, waktu, kuota | scheduled/published untuk publik; mutasi sesuai workflow |
| `event_participants` | Base | event + awardee, status, attendance, timestamps; unique pair | peserta melihat milik sendiri; internal mengelola |
| `movements` | Base | slug, leader, status, ESG/SDG, periode | aktif untuk user/publik sesuai status |
| `movement_participants` | Base | movement + awardee + role + status | pemilik dan internal |
| `movement_reports` | Base | movement, reporter, evidence files, metrics, verification | reporter dan internal; publik hanya agregat disetujui |
| `broadcasts` | Base | status, channel, schedule/sent time, content | user melihat yang terkirim; internal mengelola |
| `broadcast_engagements` | Base | broadcast + awardee + action + evidence; unique sesuai aksi | pemilik/internal |
| `rewards` | Base | price, minTier, status, monthlyQuota | pengguna membaca katalog; admin mengubah |
| `redemptions` | Base | reward, awardee, priceSnapshot, status, request time | pemilik/internal; perubahan saldo lewat hook atomik |
| `badges` | Base | code unik, family, rarity, criteria | seluruh user membaca; admin mengelola |
| `awardee_badges` | Base | awardee + badge + awardedAt + source | pengguna membaca; server/internal memberi |
| `consents` | Base | awardee, type, scope, version, grantedAt, revokedAt | hanya pemilik dan internal berwenang |
| `audit_logs` | Base | actor, action, entityType/id, before/after, reason, timestamp | internal; append-only dari hook |
| `chapters` | Base | code, name, region, status | referensi publik/read-only |
| `app_settings` | Base | key unik, JSON value, version | baca selektif; admin mengubah |

Pertimbangan skema:

- Jangan menyimpan nilai `points`, `coins`, `holderCount`, `participantCount`, dan dashboard KPI sebagai sumber kebenaran ganda. Sumber kebenaran adalah ledger/record detail; nilai agregat boleh disimpan sebagai cache yang diperbarui atomik.
- Pertahankan ID lama saat impor jika formatnya diterima. Jika tidak, simpan `legacyId` unik untuk rekonsiliasi.
- Gunakan field PocketBase `file` untuk cover cerita dan bukti. Validasi MIME, ukuran, jumlah file, serta siapa yang boleh mengunduh.
- Pisahkan relasi many-to-many yang memiliki status, waktu, role, bukti, atau audit menjadi collection penghubung. Array relation hanya cocok untuk relasi sederhana dan kecil.
- Index minimal: slug, status, timestamps untuk sorting, foreign key yang sering difilter, serta unique composite untuk idempotensi/keikutsertaan.
- View collections dapat dipakai belakangan untuk leaderboard dan dashboard read-heavy, setelah correctness ledger terbukti.

## 5. Matriks keamanan minimum

API rules PocketBase adalah filter sekaligus access control. Semua collection harus dimulai dari kondisi locked, lalu dibuka satu per satu dengan rule yang diuji.

| Aktor | Boleh melakukan |
|---|---|
| Guest | membaca cerita published, kegiatan terjadwal, gerakan aktif, dan data publik yang sudah disanitasi |
| Awardee | membaca/mengubah profil sendiri; membuat draft/usulan; membaca aktivitas, consent, partisipasi, dan redemption sendiri |
| Verifikator | membaca antrean yang relevan dan menjalankan transisi workflow yang diizinkan; tidak boleh menyetujui usulan sendiri |
| Admin | mengelola akun, katalog, konfigurasi, laporan, serta jalur administratif; tidak otomatis menjadi pemutus editorial jika domain melarang |
| Superuser | operasi infrastruktur saja; jangan digunakan oleh aplikasi frontend |

Rule saja tidak cukup untuk proses berikut; gunakan server hook/custom endpoint dengan transaksi:

- pemberian poin dan koin, daily cap, anti-gaming, serta `idempotencyKey`;
- redeem reward: cek saldo, tier, stok/kuota, lalu kurangi saldo dan buat redemption sekaligus;
- transisi status cerita/kegiatan dan larangan self-approval;
- perhitungan/pembaruan agregat dan badge;
- audit log immutable dan pencabutan consent/takedown;
- validasi upload dan sanitasi field yang tidak boleh ditulis user.

## 6. Roadmap implementasi

Estimasi berikut memakai satu developer full-time sebagai patokan awal. Sesuaikan setelah data dictionary dan acceptance criteria disetujui.

### Fase 0 — Discovery dan baseline (2–3 hari)

- Bekukan daftar route, use case, repository method, entity field, enum, dan state transition yang sudah ada.
- Jalankan dan simpan baseline `npm run verify` serta tes browser yang relevan.
- Buat matriks: halaman -> store -> repository -> operasi baca/tulis -> role.
- Tandai field data pribadi/sensitif, kebutuhan retensi, dan siapa pemilik datanya.
- Putuskan lingkungan `local`, `staging`, dan `production`, domain, email, serta file storage.

**Definition of done:** inventaris operasi lengkap; tidak ada aksi UI yang belum memiliki pemilik data dan aturan akses.

### Fase 1 — Fondasi PocketBase dan skema versioned (3–5 hari)

- Satukan binary dan runtime lokal di `pocketbase/`; commit `pocketbase/pb_migrations/` dan `pocketbase/pb_hooks/`, tetapi abaikan binary serta `pb_data/` dari Git.
- Buat migration untuk collection, field, index, dan API rules awal dalam kondisi locked.
- Tambahkan dependency `pocketbase` dan `.env.example`, misalnya `VITE_PB_URL=http://127.0.0.1:8090`.
- Buat `src/lib/infrastructure/pocketbase/client.js`, mapper, error normalization, dan repository composition root.
- Tambahkan health check dan aturan CORS/origin sesuai alamat frontend.

**Definition of done:** instance baru bisa dibangun hanya dari migration; tidak bergantung pada klik manual dashboard.

### Fase 2 — Autentikasi dan RBAC nyata (4–6 hari)

- Migrasikan `accounts` menjadi auth collection `users`; gunakan password PocketBase, bukan `PasswordHash` demo.
- Implementasikan login, logout, refresh auth, pemulihan password, locked/inactive account, dan session hydration.
- Hubungkan `users` dengan `awardees` dan pertahankan empat zona akses: publik, Awardee, Verifikator, Admin.
- Jadikan `ZoneGuard` lapisan UX saja; keamanan sesungguhnya berada pada collection rules/hooks.
- Hapus kredensial demo dari UI production; bila demo masih diperlukan, aktifkan hanya pada seed/environment lokal.

**Definition of done:** manipulasi state browser tidak dapat membuka record yang tidak berhak melalui API.

### Fase 3 — Data referensi dan fitur read-only (3–5 hari)

- Migrasikan chapter, badges, rewards, broadcasts, movements, events published, stories published, dan awardee directory.
- Implementasikan repository PocketBase untuk `getAll`, `getById`, `query`, pagination, filter, sort, dan expand relation.
- Migrasikan halaman publik terlebih dahulu, kemudian katalog pada zona login.
- Tambahkan loading, empty, unauthorized, offline, timeout, dan retry state.

**Definition of done:** seluruh halaman read-only membaca data bersama dari PocketBase; dua browser melihat hasil yang sama.

### Fase 4 — Profil, consent, dan upload (4–6 hari)

- Migrasikan edit profil dengan ownership rule dan allowlist field.
- Implementasikan versioned consent, revoke flow, dan dampaknya terhadap publikasi.
- Pindahkan cover/evidence buatan user ke PocketBase Files; aset desain tetap lokal.
- Tambahkan validasi file, batas ukuran, format, serta penghapusan file yatim.

**Definition of done:** user hanya dapat mengubah field miliknya yang diizinkan; file sensitif tidak dapat diakses publik.

### Fase 5 — Workflow editorial dan kegiatan (5–8 hari)

- Implementasikan create/update draft cerita, submit, review, revisi, approve, publish, reject, archive/takedown.
- Implementasikan proposal dan persetujuan kegiatan, pendaftaran peserta, attendance, pembatalan, dan SLA.
- Pindahkan state transition kritis ke hooks/custom endpoint dengan validasi role, status asal, alasan, checklist sensitivitas, dan self-approval.
- Catat setiap keputusan ke `audit_logs`.

**Definition of done:** seluruh positive/negative test workflow lama lulus terhadap backend; tidak ada status yang bisa dilompati lewat request manual.

### Fase 6 — Gamifikasi, ledger, leaderboard, dan reward (6–10 hari)

- Jadikan `point_activities` ledger immutable dan `idempotencyKey` unik.
- Jalankan scoring, cap, streak, tier, dan pemberian badge di server; frontend hanya menampilkan hasil/preview.
- Implementasikan transaksi redemption yang atomik dan aman dari double-click/concurrent request.
- Buat query/view leaderboard dan KPI dari data backend; ukur performa sebelum menambah cache agregat.
- Buat job berkala bila diperlukan untuk reset kuota bulanan, expiry, atau rekalkulasi.

**Definition of done:** concurrent request tidak menggandakan poin/redemption; total awardee selalu dapat direkonsiliasi dengan ledger.

### Fase 7 — Migrasi seed, rekonsiliasi, dan cutover (3–5 hari)

- Ubah generator seed menjadi import script satu kali yang hanya boleh berjalan di local/staging.
- Import collection dalam urutan dependency: referensi -> users/awardees -> consent -> konten/kegiatan/gerakan -> partisipasi -> ledger -> badge/redemption.
- Simpan mapping legacy ID, log kegagalan per record, dan buat script yang aman dijalankan ulang.
- Bandingkan jumlah record, total poin, distribusi tier, status workflow, dan relasi yatim.
- Sediakan feature flag adapter (`dexie`/`pocketbase`) untuk rollback singkat; hentikan write ke Dexie saat cutover.

**Definition of done:** rekonsiliasi 100%, tidak ada orphan/duplikat, dan hasil seed staging konsisten dengan baseline yang disetujui.

### Fase 8 — Hardening dan produksi (4–7 hari)

- Uji API rules per role dengan request langsung, bukan hanya klik UI.
- Tambahkan rate limiting, log, monitoring uptime/error, backup terjadwal, dan uji restore.
- Batasi superuser berdasarkan IP bila operasional memungkinkan, aktifkan MFA, dan enkripsi settings/secrets.
- Jalankan performance test untuk directory, public story, dashboard, dan leaderboard.
- Buat runbook deploy, migration, backup/restore, rollback, incident, rotasi secret, dan upgrade PocketBase.
- Setelah masa stabil, hapus bootstrap seed otomatis, password demo, repository Dexie, dependency Dexie, dan tombol reset data demo.

**Definition of done:** restore drill berhasil, security checklist lulus, observability aktif, dan pemilik operasional menyetujui go-live.

### Estimasi total

Sekitar **34–55 hari kerja developer**, belum termasuk keputusan bisnis, pembersihan data nyata, desain email, legal/privacy review, atau infrastruktur perusahaan. Fase 1–3 dapat menghasilkan vertical slice awal dalam kurang lebih 2–3 minggu.

## 7. Strategi implementasi repository

Jangan mengganti seluruh aplikasi sekaligus. Pertahankan kontrak domain dan buat adapter baru:

```text
Repository (kontrak domain)
  |- DexieRepository       # adapter lama, sementara
  `- PocketBaseRepository  # adapter baru
       |- mapper record <-> entity
       |- filter/sort/pagination
       `- error normalization
```

Urutan migrasi repository yang disarankan:

1. `Badge`, `Reward`, `Broadcast`, `Movement` (read-heavy, risiko rendah);
2. `Story`, `Event`, `Awardee` (read + workflow/ownership);
3. `Consent` dan `Account` (sensitif);
4. `Activity` dan `Redemption` (transaksi dan konsistensi tertinggi).

Catatan kompatibilitas kontrak:

- `save()` Dexie saat ini berperilaku upsert, sedangkan create/update PocketBase adalah operasi terpisah; buat semantics eksplisit agar bug tidak tersembunyi.
- `query()` Dexie saat ini mengabaikan criteria tidak dikenal. Adapter baru sebaiknya menolak criteria yang tidak didukung saat development agar filter keamanan tidak diam-diam hilang.
- `getAll()` tidak boleh dipakai untuk koleksi besar. Tambahkan kontrak pagination sebelum data produksi masuk.
- Timestamp PocketBase perlu dipetakan konsisten ke ISO string/`Date` yang diharapkan entity.
- Error `400/401/403/404/409/429/5xx` dipetakan ke error aplikasi yang dapat ditampilkan dan dites.

## 8. Pengujian dan acceptance criteria

Pertahankan seluruh gerbang sekarang dan tambahkan:

- unit test mapper PocketBase <-> entity untuk semua collection;
- contract test yang dijalankan terhadap adapter Dexie dan PocketBase;
- integration test pada instance PocketBase sementara yang dibangun dari migration;
- API rule test untuk setiap pasangan role x collection x CRUD;
- negative test: IDOR, perubahan role, mass assignment, self-approval, status jump, file tanpa izin;
- concurrency test untuk poin, cap harian, kuota reward, redemption, dan idempotensi;
- migration/reconciliation test atas jumlah record, foreign key, total poin, tier, dan status;
- E2E login/session refresh/logout dan seluruh critical user journey;
- backup-and-restore drill sebelum production.

Perintah frontend yang tetap dijaga:

```powershell
npm run verify:compile
npm run verify:domain
npm run verify:seed       # dipertahankan sampai seed demo dipensiunkan
npm run verify:purity
npm run build
npm run verify:e2e
npm run verify:gamification
```

## 9. Cara menjalankan proyek saat ini

### Prasyarat

- Node.js 20 LTS atau versi yang kompatibel dengan Vite 7;
- npm;
- browser modern dengan IndexedDB aktif.

### Menjalankan development

```powershell
npm install
npm run dev
```

Buka URL yang dicetak Vite, umumnya `http://localhost:5173`. Data demo dipasang otomatis ke IndexedDB browser. Kredensial demo tercantum di halaman `/masuk` dan `README.md`.

### Build dan preview

```powershell
npm run build
npm run preview
```

Frontend memakai `.env` untuk alamat PocketBase; kredensial superuser hanya dibutuhkan oleh proses seed.

## 10. Cara menjalankan fondasi PocketBase

### Terminal 1 — PocketBase

```powershell
npm run pb:serve
```

Pertama kali, buat superuser melalui dashboard. Migration di `pocketbase/pb_migrations/` terpasang otomatis ketika server berjalan.

### Konfigurasi frontend

Salin `.env.example` menjadi `.env`:

```dotenv
VITE_PB_URL=http://127.0.0.1:8090
```

Jangan menaruh password, token superuser, encryption key, atau secret SMTP pada `VITE_*` karena seluruh nilai tersebut dapat masuk bundle browser.

### Terminal 2 — SvelteKit

```powershell
npm install
npm run dev
```

Target akhirnya sebaiknya memiliki satu perintah orchestration, misalnya `npm run dev:all`, tetapi implementasinya baru dilakukan setelah lokasi binary/container PocketBase disepakati lintas OS.

## 11. Urutan kerja paling aman untuk sprint pertama

1. Buat matriks repository/use case dan data dictionary final.
2. Buat migration `users`, `awardees`, `badges`, dan `rewards` beserta API rules locked-by-default.
3. Tambahkan PocketBase client, mapper, dan adapter read-only.
4. Migrasikan login serta satu halaman katalog sebagai vertical slice.
5. Tambahkan integration/API-rule test pada slice tersebut.
6. Demo dengan dua browser untuk membuktikan data dan sesi benar-benar berasal dari backend.
7. Review hasil sebelum memperluas ke workflow dan gamifikasi.

## 12. Keputusan yang perlu dikonfirmasi sebelum coding penuh

- Apakah PocketBase diterima untuk beban dan tingkat kritikalitas produksi PFfriends?
- Siapa sumber data awardee nyata dan bagaimana proses cleansing/import-nya?
- Apakah user boleh mendaftar sendiri atau seluruh akun dibuat/diundang admin?
- Field profil mana yang publik, sesama awardee, verifikator, dan admin?
- Berapa kebijakan retensi untuk PII, consent, bukti, audit log, dan akun nonaktif?
- Apakah file disimpan lokal PocketBase atau object storage S3-compatible?
- Apakah email verifikasi/reset/notification memakai SMTP perusahaan?
- Apakah admin dan verifikator satu auth collection dengan field role atau dipisah?
- Apakah forum akan menjadi fitur nyata? Saat ini belum tampak sebagai tabel persistence tersendiri.
- Siapa yang memegang deployment, backup, restore, upgrade, dan incident response?

Roadmap ini sengaja memprioritaskan autentikasi, ownership, workflow, dan ledger sebelum dashboard. Dashboard yang terlihat benar tetapi dibangun di atas data yang belum aman dan belum dapat diaudit akan memberi rasa aman palsu.
