# Roadmap Migrasi Data Dummy ke PocketBase: PFriends

> Audit terakhir 19 Agustus 2026: backend sudah mencakup PocketBase Auth, **Registrasi
> Awardee**, vertical slice **Bukti Keaktifan**, serta **gamifikasi dan redemption server-side**. Sistem masih hybrid:
> profil Awardee, ledger poin, tier, streak, badge, leaderboard, Koin Tukar, reward, pesanan, dan agregat gamifikasi
> Verifikator sudah masuk PocketBase, sedangkan mayoritas katalog konten dan workflow lama masih memakai Dexie. Detail operasional
> ada di `docs/15-POCKETBASE-BUKTI-KEAKTIFAN.md`, `docs/16-RIWAYAT-DAN-PELACAKAN-BUKTI.md`,
> `docs/17-REGISTRASI-AWARDEE.md`, `docs/18-GAMIFIKASI-SERVER.md`, `docs/20-KOIN-REWARD-DAN-PENUKARAN.md`, serta
> `CHECKLIST-MIGRASI-HALAMAN.md`.

Dokumen ini menjelaskan kondisi PFriends saat ini dan rencana bertahap untuk memindahkan data demo dari IndexedDB/Dexie ke backend PocketBase tanpa menulis ulang domain dan tampilan yang sudah ada.

## 1. Ringkasan proyek

PFriends adalah microsite **Community Connect Initiative** milik Corporate Secretary Pertamina Foundation. Produk ini menghubungkan alumni/awardee, komunitas Sobat Bumi dan PFpreneur/Womenpreneur, serta tim internal Pertamina Foundation dalam satu ekosistem.

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
| Data saat ini | Hybrid: PocketBase untuk tiga vertical slice; Dexie 4 untuk fitur lainnya |
| Backend | PocketBase dengan migration versioned, API rules, protected files, dan JS hooks |
| Autentikasi | PocketBase Auth; password staf masih mode demo sampai SSO OAuth tersedia |
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

Masalah yang masih harus diselesaikan sebelum produksi:

1. API rules sudah melindungi slice PocketBase, tetapi fitur Dexie masih hanya memiliki proteksi UX di klien;
2. pengguna masih dapat memiliki salinan berbeda untuk data yang belum dimigrasikan;
3. keputusan registrasi dan bukti keaktifan sudah di server, tetapi workflow konten/kegiatan masih diproses di peramban;
4. perubahan multi-record (poin, saldo koin, kuota, redemption) belum atomik di server;
5. array ID seperti peserta, liker, reader, atau badge holder sulit diberi aturan akses dan audit;
6. audit trail baru tersedia pada registrasi dan bukti keaktifan; backup terjadwal, rate limiting, serta pemisahan dev/staging/production belum ada.

### 2.1 Audit cakupan backend aktual

Audit ini berdasarkan migration, hooks, adapter/repository, dan store yang dipakai aplikasi:bukan hanya berdasarkan keberadaan halaman.

| Area | Status | Sumber data aktual | Kekurangan utama |
|---|---|---|---|
| Auth login/logout/refresh dan RBAC dasar | **Backend** | PocketBase `users` | reset password, verifikasi email, MFA, dan SSO staf belum ada |
| Registrasi Awardee | **Backend** | `awardee_registrations`, `registration_reviews`, `awardees` | notifikasi, expiry/SLA, retensi bukti, dan email belum ada |
| Bukti keaktifan | **Backend** | `activity_submissions`, review, status events, protected files | expiry revisi dan notifikasi belum ada |
| Poin dan ledger | **Backend** | `verified_point_activities` dengan sumber `EVIDENCE`/`DEMO_SEED` | bukti terverifikasi dan akun demo sudah konsisten; sumber engagement nyata untuk tiga aksi ringan belum tersedia |
| Profil/direktori Awardee | **Backend untuk Jejaring** | profil aktif, field Jejaring, statistik, filter, dan gamifikasi ringkas dari endpoint PocketBase tersanitasi | consent versioned dan administrasi profil lanjutan belum backend penuh |
| Akun demo/admin awardee | **Hybrid** | sesi memakai PocketBase; `AccountRepository` masih Dexie | pengelolaan akun, lock/unlock, role, dan audit admin belum backend |
| Consent profil dan publikasi | **Belum backend** | Dexie `consents`; registrasi hanya menyimpan snapshot consent | grant/revoke/versioning dan dampak takedown belum server-side |
| Cerita/editorial | **Hybrid** | baca publik memakai PocketBase `stories`; workflow privat masih Dexie | draft, review, publish, file unggahan, dan audit workflow belum PocketBase |
| Kegiatan/kalender/attendance | **Backend** | `events`, `event_participants`, `activity_submissions`, ledger poin | event sengaja tanpa seed; reminder dan ekspor peserta belum ada |
| Gerakan dan laporan dampak | **Hybrid** | collection `movements` dan agregat metode pengukuran sudah PocketBase; UI gerakan masih Dexie | partisipasi, laporan, evidence, validasi ESG/SDG, dan workflow belum backend |
| Kabar/broadcast engagement | **Backend** | PocketBase `broadcasts`, `broadcast_engagements`, bukti dan ledger | notifikasi eksternal dan worker pengiriman email/WA belum tersedia |
| Badge, tier, streak, leaderboard | **Backend untuk ledger bukti** | `gamification_profiles`, `badges`, `awardee_badges` + endpoint server | sumber poin engagement/konten belum backend dan quest belum tersedia |
| Reward dan redemption | **Backend** | `coin_accounts`, `coin_transactions`, `rewards`, `redemptions` + endpoint transaksional | CRUD katalog tersedia untuk Admin/Verifikator; job expiry belum tersedia |
| Forum | **Belum persistence** | state lokal halaman | channel, thread/message, moderasi, realtime, dan akses belum dirancang sebagai collection |
| KPI/Admin dashboard | **Hybrid** | potret dampak publik dan agregat gamifikasi Verifikator dari PocketBase; widget lain Dexie | KPI admin, audit, snapshot historis, dan ekspor belum ada |
| Notifikasi | **Belum backend** | toast UI | inbox, email/WhatsApp, realtime, retry, dan preference belum ada |
| Operasional produksi | **Belum** | runtime lokal | staging/prod, backup/restore, monitoring, rate limit, secret rotation, dan runbook belum ada |

### 2.2 Collection PocketBase yang sudah nyata

Saat audit ini, migration sudah membuat atau memperluas collection berikut:

- `users`;
- `activity_submissions`, `submission_reviews`, `submission_status_events`, dan `verified_point_activities`;
- `awardee_registrations`, `registration_reviews`, dan `awardees`.
- `gamification_profiles`, `badges`, `awardee_badges`, `coin_accounts`, `coin_transactions`, `rewards`, dan `redemptions`.

Collection lain pada rancangan §4 masih merupakan target dan belum boleh dianggap tersedia hanya karena UI atau entity domainnya sudah ada.

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

### Status fase per 19 Agustus 2026

| Fase | Status audit | Catatan |
|---|---|---|
| 0: Discovery/baseline | **Sebagian** | dokumentasi dan gerbang verifikasi tersedia, tetapi matriks route → operasi → rule belum lengkap |
| 1: Fondasi PocketBase | **Selesai untuk lokal** | migration, hooks, client, seed, dan launcher tersedia; staging/production belum |
| 2: Auth/RBAC | **Sebagian besar** | auth/session/RBAC berjalan; reset password, email verification, dan SSO belum |
| 3: Referensi/read-only | **Sebagian** | cerita publik, kalender, leaderboard, agregat komunitas, dan beberapa katalog sudah PocketBase; katalog lain masih Dexie |
| 4: Profil/consent/upload | **Sebagian** | profil hasil registrasi dan protected evidence tersedia; edit profil/consent umum belum |
| 5: Workflow | **Sebagian** | registrasi, bukti keaktifan, kegiatan, peserta, attendance, dan poin hadir sudah server-side; cerita belum |
| 6: Gamifikasi/reward | **Sebagian** | ledger bukti, tier, streak, badge, leaderboard, dan agregat Verifikator sudah server-side; koin, reward/redemption, quest, dan sumber poin lain belum |
| 7: Migrasi/cutover | **Sebagian** | seed demo PocketBase sudah mencakup akun, gamifikasi, Kabar, dan 29 cerita; rekonsiliasi semua domain belum selesai |
| 8: Hardening produksi | **Belum** | belum ada deployment production, observability, rate limit, atau restore drill |

Status **selesai** di tabel ini tidak berarti aplikasi siap produksi; artinya lingkup fase tersebut sudah tersedia untuk runtime lokal sesuai acceptance criteria yang telah diuji.

### Fase 0: Discovery dan baseline (2–3 hari)

- Bekukan daftar route, use case, repository method, entity field, enum, dan state transition yang sudah ada.
- Jalankan dan simpan baseline `npm run verify` serta tes browser yang relevan.
- Buat matriks: halaman -> store -> repository -> operasi baca/tulis -> role.
- Tandai field data pribadi/sensitif, kebutuhan retensi, dan siapa pemilik datanya.
- Putuskan lingkungan `local`, `staging`, dan `production`, domain, email, serta file storage.

**Definition of done:** inventaris operasi lengkap; tidak ada aksi UI yang belum memiliki pemilik data dan aturan akses.

### Fase 1: Fondasi PocketBase dan skema versioned (3–5 hari)

- Satukan binary dan runtime lokal di `pocketbase/`; commit `pocketbase/pb_migrations/` dan `pocketbase/pb_hooks/`, tetapi abaikan binary serta `pb_data/` dari Git.
- Buat migration untuk collection, field, index, dan API rules awal dalam kondisi locked.
- Tambahkan dependency `pocketbase` dan `.env.example`, misalnya `VITE_PB_URL=http://127.0.0.1:8090`.
- Buat `src/lib/infrastructure/pocketbase/client.js`, mapper, error normalization, dan repository composition root.
- Tambahkan health check dan aturan CORS/origin sesuai alamat frontend.

**Definition of done:** instance baru bisa dibangun hanya dari migration; tidak bergantung pada klik manual dashboard.

### Fase 2: Autentikasi dan RBAC nyata (4–6 hari)

- Migrasikan `accounts` menjadi auth collection `users`; gunakan password PocketBase, bukan `PasswordHash` demo.
- Implementasikan login, logout, refresh auth, pemulihan password, locked/inactive account, dan session hydration.
- Hubungkan `users` dengan `awardees` dan pertahankan empat zona akses: publik, Awardee, Verifikator, Admin.
- Jadikan `ZoneGuard` lapisan UX saja; keamanan sesungguhnya berada pada collection rules/hooks.
- Hapus kredensial demo dari UI production; bila demo masih diperlukan, aktifkan hanya pada seed/environment lokal.

**Definition of done:** manipulasi state browser tidak dapat membuka record yang tidak berhak melalui API.

### Fase 3: Data referensi dan fitur read-only (3–5 hari)

- Migrasikan chapter, badges, rewards, broadcasts, movements, events published, stories published, dan awardee directory.
- Implementasikan repository PocketBase untuk `getAll`, `getById`, `query`, pagination, filter, sort, dan expand relation.
- Migrasikan halaman publik terlebih dahulu, kemudian katalog pada zona login.
- Tambahkan loading, empty, unauthorized, offline, timeout, dan retry state.

**Definition of done:** seluruh halaman read-only membaca data bersama dari PocketBase; dua browser melihat hasil yang sama.

### Fase 4: Profil, consent, dan upload (4–6 hari)

- Migrasikan edit profil dengan ownership rule dan allowlist field.
- Implementasikan versioned consent, revoke flow, dan dampaknya terhadap publikasi.
- Pindahkan cover/evidence buatan user ke PocketBase Files; aset desain tetap lokal.
- Tambahkan validasi file, batas ukuran, format, serta penghapusan file yatim.

**Definition of done:** user hanya dapat mengubah field miliknya yang diizinkan; file sensitif tidak dapat diakses publik.

### Fase 5: Workflow editorial dan kegiatan (5–8 hari)

- Implementasikan create/update draft cerita, submit, review, revisi, approve, publish, reject, archive/takedown.
- Implementasikan proposal dan persetujuan kegiatan, pendaftaran peserta, attendance, pembatalan, dan SLA.
- Pindahkan state transition kritis ke hooks/custom endpoint dengan validasi role, status asal, alasan, checklist sensitivitas, dan self-approval.
- Catat setiap keputusan ke `audit_logs`.

**Definition of done:** seluruh positive/negative test workflow lama lulus terhadap backend; tidak ada status yang bisa dilompati lewat request manual.

### Fase 6: Gamifikasi, ledger, leaderboard, dan reward (6–10 hari)

- Jadikan `point_activities` ledger immutable dan `idempotencyKey` unik.
- Jalankan scoring, cap, streak, tier, dan pemberian badge di server; frontend hanya menampilkan hasil/preview.
- Implementasikan transaksi redemption yang atomik dan aman dari double-click/concurrent request.
- Buat query/view leaderboard dan KPI dari data backend; ukur performa sebelum menambah cache agregat.
- Buat job berkala bila diperlukan untuk reset kuota bulanan, expiry, atau rekalkulasi.

**Definition of done:** concurrent request tidak menggandakan poin/redemption; total awardee selalu dapat direkonsiliasi dengan ledger.

### Fase 7: Migrasi seed, rekonsiliasi, dan cutover (3–5 hari)

- Ubah generator seed menjadi import script satu kali yang hanya boleh berjalan di local/staging.
- Import collection dalam urutan dependency: referensi -> users/awardees -> consent -> konten/kegiatan/gerakan -> partisipasi -> ledger -> badge/redemption.
- Simpan mapping legacy ID, log kegagalan per record, dan buat script yang aman dijalankan ulang.
- Bandingkan jumlah record, total poin, distribusi tier, status workflow, dan relasi yatim.
- Sediakan feature flag adapter (`dexie`/`pocketbase`) untuk rollback singkat; hentikan write ke Dexie saat cutover.

**Definition of done:** rekonsiliasi 100%, tidak ada orphan/duplikat, dan hasil seed staging konsisten dengan baseline yang disetujui.

### Fase 8: Hardening dan produksi (4–7 hari)

- Uji API rules per role dengan request langsung, bukan hanya klik UI.
- Tambahkan rate limiting, log, monitoring uptime/error, backup terjadwal, dan uji restore.
- Batasi superuser berdasarkan IP bila operasional memungkinkan, aktifkan MFA, dan enkripsi settings/secrets.
- Jalankan performance test untuk directory, public story, dashboard, dan leaderboard.
- Buat runbook deploy, migration, backup/restore, rollback, incident, rotasi secret, dan upgrade PocketBase.
- Setelah masa stabil, hapus bootstrap seed otomatis, password demo, repository Dexie, dependency Dexie, dan tombol reset data demo.

**Definition of done:** restore drill berhasil, security checklist lulus, observability aktif, dan pemilik operasional menyetujui go-live.

### Estimasi sisa setelah audit

Estimasi awal seluruh migrasi adalah **34–55 hari kerja developer**. Fondasi lokal dan dua workflow backend utama sudah tersedia, tetapi fase katalog, workflow konten/kegiatan, konsolidasi gamifikasi, cutover, dan hardening masih besar. Estimasi kasar pekerjaan tersisa adalah **25–42 hari kerja developer**, belum termasuk keputusan bisnis, cleansing data nyata, desain email/SSO, legal/privacy review, atau penyediaan infrastruktur perusahaan. Estimasi harus dihitung ulang setelah scope forum, notifikasi, dan data dictionary profil dikunci.

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

### Terminal 1: PocketBase

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

### Terminal 2: SvelteKit

```powershell
npm install
npm run dev
```

Target akhirnya sebaiknya memiliki satu perintah orchestration, misalnya `npm run dev:all`, tetapi implementasinya baru dilakukan setelah lokasi binary/container PocketBase disepakati lintas OS.

## 11. Urutan implementasi berikutnya berdasarkan audit

Fondasi dan vertical slice pertama sudah selesai, sehingga “sprint pertama” lama tidak lagi relevan. Urutan berikut memprioritaskan penghapusan sumber kebenaran ganda sebelum menambah fitur baru.

### Prioritas 1: Selesaikan profil dan consent

1. Kunci data dictionary profil Awardee dan matriks visibilitas field.
2. Tambahkan endpoint edit profil dengan allowlist field dan ownership rule.
3. Migrasikan `consents` menjadi ledger versioned yang mendukung grant/revoke.
4. Terapkan dampak revoke terhadap publikasi, direktori, dan konten terkait.
5. Ubah `AwardeeRepository` dari merge PocketBase + Dexie menjadi PocketBase sebagai sumber utama; Dexie hanya fallback sementara.

**Alasan:** auth dan registrasi sudah membuat profil backend, tetapi setelah approval pengguna masih kembali ke data profil hybrid. Ini celah konsistensi terdekat pada journey yang baru selesai dibangun.

### Prioritas 2: Migrasikan katalog read-only

1. Buat collection referensi `chapters`, `badges`, `rewards`, dan setting publik yang benar-benar dibutuhkan.
2. Migrasikan `stories`, `events`, `movements`, dan `broadcasts` berstatus publik sebagai read-only lebih dulu.
3. Tambahkan pagination, filter, mapper, dan API-rule test.
4. Pindahkan halaman publik dan katalog Awardee dari Dexie ke adapter PocketBase.

**Alasan:** dua browser saat ini masih dapat melihat katalog berbeda karena seed Dexie per perangkat.

### Prioritas 3: Workflow cerita dan kegiatan

1. Pindahkan draft/submit/review/publish cerita ke endpoint transaksional dan audit server.
2. ~~Pindahkan proposal/approval/cancel kegiatan serta peserta dan attendance ke collection terpisah.~~ Selesai melalui `events`, `event_participants`, dan bukti hadir terhubung.
3. Tegakkan self-approval, status transition, checklist sensitivitas, dan SLA di hook:bukan hanya UI.
4. Simpan cover/dokumentasi sebagai protected/public file sesuai status konten.

### Prioritas 4: Lanjutkan gamifikasi server-side ke reward dan sumber poin lain

1. Pertahankan `verified_point_activities` sebagai sumber kebenaran bukti keaktifan dan perluas menjadi ledger tunggal saat konten/engagement backend tersedia.
2. Tier, streak, 14 badge, rekonsiliasi, leaderboard, dan agregat gamifikasi Verifikator sudah server-side.
3. Reward/redemption atomik, koin, saldo, kuota, idempotensi, Pesanan Saya, workflow Verifikator, pemantauan Admin, CRUD katalog, dan refund sudah selesai; berikutnya tambahkan job expiry bila dibutuhkan.
4. Migrasikan sumber poin konten/engagement dengan idempotency dan cap server; setelah itu pensiunkan simulator serta repository gamifikasi Dexie yang tersisa.

### Prioritas 5: Auth staf dan hardening produksi

1. Implementasikan SSO OAuth Verifikator/Admin dan pemetaan claim role.
2. Tambahkan reset password/verifikasi email Awardee, notifikasi, dan kebijakan akun terkunci.
3. Buat staging, backup/restore teruji, monitoring, rate limit, rotasi secret, serta runbook deployment.
4. Lakukan cutover dan hapus seed/password demo serta Dexie setelah rekonsiliasi 100%.

## 12. Keputusan arsitektur dan pertanyaan terbuka

### Sudah diputuskan/diimplementasikan

- Awardee boleh mendaftar mandiri dan wajib diverifikasi sebelum mendapat akses penuh.
- Awardee, Verifikator, dan Admin sementara memakai satu auth collection `users` dengan field role.
- Bukti registrasi dan bukti keaktifan disimpan sebagai protected PocketBase Files.
- Admin hanya memantau registrasi; keputusan registrasi tetap milik Verifikator.
- Login password staf hanya transisi lokal; targetnya SSO OAuth.

### Masih perlu keputusan bisnis/operasional

- Apakah PocketBase diterima untuk beban dan tingkat kritikalitas produksi PFriends?
- Siapa sumber data awardee nyata dan bagaimana proses cleansing/import-nya?
- Field profil mana yang publik, sesama Awardee, Verifikator, dan Admin?
- Berapa kebijakan retensi untuk PII, consent, bukti, audit log, dan akun nonaktif?
- Apakah file produksi disimpan lokal PocketBase atau object storage S3-compatible?
- Apakah email verifikasi/reset/notifikasi memakai SMTP perusahaan?
- Provider SSO, domain yang diterima, dan claim apa yang menjadi sumber role staf?
- Apakah forum menjadi fitur persistence/realtime nyata atau tetap dikeluarkan dari scope backend?
- Kanal notifikasi apa yang resmi: inbox aplikasi, email, WhatsApp, atau kombinasi?
- Siapa yang memegang deployment, backup, restore, upgrade, dan incident response?

Roadmap ini sengaja memprioritaskan autentikasi, ownership, workflow, dan ledger sebelum dashboard. Dashboard yang terlihat benar tetapi dibangun di atas data yang belum aman dan belum dapat diaudit akan memberi rasa aman palsu.
