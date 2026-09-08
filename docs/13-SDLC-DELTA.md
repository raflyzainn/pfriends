# 13: SDLC Delta: Jejak Revisi V2

> Dokumen ini adalah **catatan proses**, bukan spesifikasi. Ia menjawab satu pertanyaan:
> *apa yang terjadi antara versi pertama Pfriends dan versi yang diserahkan sekarang, dan mengapa
> keputusannya diambil seperti itu.* Spesifikasinya sendiri ada di `docs/10-REVISION-SPEC.md`
> (apa yang harus dibangun), `docs/11-VISUAL-DIRECTION.md` (bagaimana tampilannya), dan
> `docs/12-BUILD-CONTRACT-V2.md` (siapa memiliki berkas apa).
>
> Ketertelusuran keputusan → berkas → gerbang ada di `docs/14-TRACEABILITY.md`.

---

## 1. Latar: mengapa ada revisi sama sekali

Versi pertama Pfriends lolos sebagai bukti teknis dan gagal sebagai bukti produk. Dua umpan balik
memicu revisi ini, dan keduanya berasal dari orang yang berbeda.

### 1.1 Tujuh keputusan pemilik produk

| # | Keputusan | Masalah pada V1 |
|---|---|---|
| **PO-1** | Landing publik memuat dampak & angka agregat, blog terpublikasi, kalender komunitas + daftar event, gerakan + profil dua komunitas | Landing V1 memajang tangga jenjang dan sembilan cara memperoleh poin: mekanik internal, bukan cerita program |
| **PO-2** | Poin, tabel skor, jenjang, papan peringkat, lencana **dilarang** di zona publik; semuanya pindah ke area ter-login Awardee, agregatnya di dasbor Admin | Tidak ada garis pemisah. Pengunjung yang belum pernah dengar Pfriends disuguhi aturan permainannya lebih dulu |
| **PO-3** | Tiga peran: AWARDEE, VERIFIKATOR, ADMIN: dengan login surel + kata sandi dan route guard per zona | V1 memakai **pemilih peran**: satu klik "Masuk sebagai Admin" tanpa kredensial apa pun |
| **PO-4** | Awardee menulis → Verifikator meninjau → baru terbit ke publik. Event boleh digalakkan awardee maupun verifikator. Panel daftar event ada di sisi halaman blog | V1 punya status cerita, tetapi tidak punya aktor yang memindahkannya. Moderasi hanya panel baca di zona admin |
| **PO-5** | Dasbor statistik Admin memakai Apache ECharts | V1 memakai bar CSS dan angka besar; sulit dibaca sebagai dasbor |
| **PO-6** | Kritik "webnya terlalu AI" dijawab dengan foto asli + redesign editorial | Nol foto; seluruh visual berupa kartu, gradien, dan ikon |
| **PO-7** | SDLC terdokumentasi, Clean Code, OOP, komentar bermutu, seluruh perubahan **terintegrasi** | Dokumentasi V1 berhenti di `docs/09`; tidak ada jejak revisi |

### 1.2 Kritik "webnya terlalu AI"

Kritik atasan ini tidak menyebut satu pun elemen konkret, jadi langkah pertama revisi adalah
**menerjemahkannya menjadi gejala yang dapat diperiksa**. Hasil audit `docs/11` §1:

| Gejala | Wujudnya di V1 | Mengapa terbaca "AI" |
|---|---|---|
| D-01 | Nol foto manusia | Program tentang orang, dipajang tanpa satu pun wajah |
| D-04 | Setiap seksi punya ritme sama: `py-12`, judul `text-2xl md:text-3xl`, tiga kartu | Halaman terasa dihasilkan generator, bukan disusun editor |
| D-06 | Gradien dan blur dekoratif sebagai pengganti materi | Kosmetik menutupi ketiadaan konten |
| D-10 | Grid simetris 3×3 di mana-mana | Tidak ada hierarki: semua hal sama pentingnya, artinya tidak ada yang penting |

Penting: kritik itu **bukan** kritik terhadap teknologi, melainkan terhadap *keseragaman*. Karena
itu jawabannya bukan "kurangi otomatisasi", melainkan foto asli, ritme seksi yang berbeda-beda,
tipografi editorial, dan grid asimetris: semuanya dapat diperiksa, dan tiga di antaranya
benar-benar dijadikan gerbang otomatis di `scripts/verify/public-purity.mjs`.

---

## 2. Fase yang dijalankan

SDLC yang dipakai adalah **inkremental berbasis kontrak**: setiap gelombang punya kontrak export
yang final sebelum satu baris kode ditulis, sehingga paket-paket dalam satu gelombang dapat
berjalan paralel tanpa saling menunggu.

| Fase | Keluaran | Berkas |
|---|---|---|
| **F0 · Audit & spesifikasi ulang** | Audit gejala "terlalu AI", 31 user story revisi, matriks RBAC, state machine konten | `docs/10-REVISION-SPEC.md` |
| **F1 · Arah visual** | Sistem tipografi editorial, aturan foto, ritme seksi, daftar gejala yang dilarang kembali | `docs/11-VISUAL-DIRECTION.md` |
| **F2 · Kontrak build** | Kepemilikan berkas per paket, kontrak export modul baru, rencana rename atomik, rencana verifikasi | `docs/12-BUILD-CONTRACT-V2.md` |
| **G1 · WP-01** | Fondasi peran & akun: `roles.js`, `content-workflow.js`, `PasswordHash`, `UserAccount`, tabel `accounts`, rename `Member` → `Awardee` | `src/lib/domain/**`, `src/lib/infrastructure/seed/**` |
| **G2 · WP-02** | Autentikasi, sesi, `AccessPolicy`, `ZoneGuard`, `AuthService`, `ContentReviewService`, `ProgramImpactService`, formulir `/masuk` | `src/lib/domain/**`, `src/lib/stores/session.svelte.js`, `src/lib/components/ZoneGuard.svelte` |
| **G3-A · WP-03** | 28 foto asli, 5 woff2 lokal, 8 komponen editorial, sistem visual | `static/img/**`, `static/fonts/**`, `src/lib/components/editorial/**` |
| **G3-B · WP-04…08** | Lima paket paralel: redesign zona publik, zona awardee, zona verifikator, dasbor ECharts, kalender publik | `src/routes/**`, `src/lib/charts/**` |
| **G4 · WP-09** | Dokumentasi SDLC, matriks ketertelusuran, gerbang verifikasi yang benar-benar menguji aturan baru | Dokumen ini, `docs/14`, `scripts/verify/**`, `README.md` |

Yang **tidak** dijalankan, dan itu disengaja: tidak ada tahap UAT dengan pengguna sungguhan, tidak
ada uji beban, tidak ada penetration test. Ketiganya tidak bermakna untuk mockup tanpa backend :
lihat §6.

---

## 3. Keputusan arsitektur beserta alasannya

Sembilan keputusan di bawah adalah yang paling mahal untuk dibalik. Masing-masing disertai
alternatif yang ditolak, karena keputusan tanpa alternatif yang tercatat akan digugat ulang setiap
kali ada anggota tim baru.

### K-1 · `UserAccount` terpisah dari `Awardee`, bukan field `role` pada `Awardee`

**Alternatif ditolak:** menambahkan `role` pada entity `Awardee` yang sudah ada.

**Alasan.** Invarian `Awardee` mustahil dipenuhi akun staf: `community`, `chapterId`, dan `joinedAt`
wajib terisi, sedangkan Verifikator dan Admin bukan penerima manfaat. Lebih buruk lagi, tiga
perhitungan langsung salah bila staf menjadi baris `Awardee`: cakupan KPI memakai cacah awardee
sebagai penyebut, papan peringkat menyaring lewat `visibleOnLeaderboard`, dan distribusi jenjang
akan menghitung staf sebagai jenjang terendah. Menambal ketiganya dengan filter peran menyebarkan
pengetahuan peran ke tiga tempat: persis yang hendak dicegah.

**Konsekuensi yang diterima:** relasi `UserAccount 1..0/1 Awardee`. Akun non-AWARDEE **wajib**
`awardeeId === null`, dan invarian itulah yang membuat pemeriksaan konflik kepentingan bermakna.
Diuji: `domain-test.mjs` §10.

### K-2 · `AccessPolicy` adalah satu-satunya tempat aturan otorisasi jalur

**Alternatif ditolak:** `pathname.startsWith('/admin')` di layout masing-masing zona.

**Alasan.** Pada V1 aturan yang sama sudah ditulis ulang di beberapa berkas. Dua salinan aturan
akses selalu berakhir berselisih, dan yang tertinggal justru yang longgar. `AccessPolicy` murni dan
sinkron: tanpa `await`, tanpa penyimpanan, tanpa `$app/*`: sehingga matriks perilaku guard dapat
diuji di `node` polos untuk zona yang halamannya bahkan belum dibuat. Itu jauh lebih murah daripada
membuktikannya lewat peramban, dan ia tetap benar saat halamannya berubah.

### K-3 · Tamu diwakili `null`, bukan peran bernama `GUEST`

**Alasan.** Peran bernama `GUEST` adalah peran yang sah, dan peran yang sah cepat atau lambat
mendapat kapabilitas. `null` tidak dapat diberi kapabilitas. Seluruh gerbang *fail-closed*: zona
tak dikenal, peran tak dikenal, dan kapabilitas tak dikenal semuanya dijawab `false`.

### K-4 · `canSeeScoring(null) === false` sebagai jangkar struktural PO-2

**Alternatif ditolak:** disiplin tinjauan kode ("jangan render poin di halaman publik").

**Alasan.** Larangan yang hanya hidup sebagai kesepakatan akan terlupa pada halaman berikutnya.
Dengan `canSeeScoring(null) === false`, zona publik **tidak pernah punya jawaban "boleh"** untuk
ditanyakan. Lapis kedua: `ProgramImpactService.publicSnapshot()` tidak memuat satu pun kunci berbau
poin/jenjang, sehingga tidak ada yang dapat dirender bahkan bila seseorang lupa satu penyaring.
Lapis ketiga: pemindai statis `scripts/verify/public-purity.mjs` menolak impor komponen gamifikasi
dan kata terlarang pada teks yang dirender.

Tiga lapis untuk satu aturan terdengar berlebihan sampai seseorang menambahkan halaman publik baru
pada bulan keenam.

### K-5 · Peta transisi konten adalah DATA, bukan tombol yang dirender

**Alternatif ditolak:** menentukan legalitas transisi dari tombol mana yang muncul di layar.

**Alasan.** Tombol yang tidak dirender tetap dapat dipanggil: itu bukan kontrol. `content-workflow.js`
menyatakan transisi sebagai peta `{from: [{to, by}]}` yang murni: tidak tahu siapa aktornya, tidak
menyentuh basis data. `allowedStoryTransitions()` dipakai untuk **merender** tombol sekaligus untuk
**memvalidasi**-nya, sehingga daftar tombol tidak pernah berbeda dari daftar transisi.

### K-6 · Gerbang entity dan konflik kepentingan diperiksa `ContentReviewService`, bukan peta transisi

**Alasan.** Memisahkan keduanya membuat peta transisi dapat diuji di `node` polos tanpa satu pun
tiruan, sementara pemeriksaan yang memang butuh identitas (`isSelfReview`) dan repositori
(`isPublishable`) tetap terkumpul di satu service. Urutan pemeriksaannya tetap: aktor → legalitas
transisi → konflik kepentingan → gerbang entity → catatan wajib.

### K-7 · Dua akun verifikator sejak seed, bukan satu

**Alasan.** Larangan self-review yang tidak punya jalan keluar akan dilanggar pada hari pertama
demo: satu verifikator saja membuat setiap kegiatan yang ia usulkan sendiri buntu permanen. Justru
**karena** jalan keluarnya selalu tersedia, larangan itu dapat ditegakkan tanpa pengecualian.
Diuji: `seed-test.mjs` §H (`≥2 akun berperan VERIFIER`) dan `domain-test.mjs` §8.

### K-8 · Hash kata sandi tiruan (FNV-1a bergaram), bukan `crypto.subtle`

**Alasan jujur.** `buildSeed()` bersifat **sinkron** dan wajib berjalan di `node` polos untuk skrip
verifikasi, sedangkan `crypto.subtle` asinkron dan hanya tersedia di peramban. Menjadikan seed
asinkron demi hash yang **tetap saja tiruan** adalah pertukaran yang buruk.

**Ini bukan mekanisme keamanan** dan tidak pernah diklaim sebagai mekanisme keamanan: lihat
peringatan di kepala `src/lib/domain/value-objects/PasswordHash.js` dan §6 dokumen ini.

### K-9 · Satu sumbu status untuk kegiatan, bukan status + sumbu publikasi terpisah

**Alasan.** `DIUSULKAN`/`DITOLAK` hidup di `EventStatus` yang sama dengan `TERJADWAL`/`SELESAI`.
Dua sumbu menuntut dua peta metadata dan dua helper yang harus dijaga sinkron oleh banyak paket
sekaligus: biaya yang tidak sebanding dengan satu kasus tepi yang tidak muncul di data mana pun.
`DIUSULKAN → TERJADWAL` **berarti** "terbit ke kalender publik".

---

## 4. Apa yang berubah per lapisan

Arah ketergantungan tidak berubah: **Presentation → Application → Domain ← Infrastructure**.
Yang berubah adalah isinya.

### 4.1 Domain (`src/lib/domain/**`): murni, tanpa framework

| Berkas | Status | Isi |
|---|---|---|
| `constants/roles.js` | BARU | `UserRole`, `USER_ROLE_META`, `RolePermission`, `ROLE_PERMISSIONS`, `bolehkan()` |
| `constants/content-workflow.js` | BARU | `STORY_TRANSITIONS`, `EVENT_TRANSITIONS`, `SLA_HARI_KERJA`, empat helper transisi |
| `value-objects/PasswordHash.js` | BARU | Hash tiruan bergaram + `matches()` |
| `entities/UserAccount.js` | BARU | Identitas login, `AccountStatus`, `can()` |
| `entities/Awardee.js` | RENAME | dari `Member.js`; invarian tidak berubah |
| `policies/AccessPolicy.js` | BARU | `zoneOf`, `canEnter`, `canAccess`, `homePathFor`, `safeNext`, `canSeeScoring`, `isSelfReview` |
| `validation/Validator.js` | BARU | Validasi masukan formulir yang dipakai lintas zona |
| `services/AuthService.js` | BARU | Verifikasi kredensial; satu pesan galat untuk surel tak dikenal dan sandi salah |
| `services/ContentReviewService.js` | BARU | Seluruh keputusan editorial cerita & kegiatan |
| `services/ProgramImpactService.js` | BARU | Potret angka publik, kelas angka A/B/C, `BENCHMARK_RUJUKAN` |

Aturan lama tetap berlaku dan kini **diuji**: nol impor `svelte`/`dexie`/`$app`/`$lib/stores`/
`$lib/infrastructure` di seluruh lapisan domain: `domain-test.mjs` §11 memindai berkasnya, bukan
memercayai konvensi.

### 4.2 Infrastructure (`src/lib/infrastructure/**`)

- Tabel `accounts` ditambahkan lewat `SCHEMA_V2` **append**, bukan menyunting `SCHEMA_V1` di
  tempat: rantai warisan Dexie tidak boleh putus.
- `DB_VERSION` **dan** `SEED_VERSION` dinaikkan dalam satu langkah. Menaikkan salah satu saja
  menghasilkan kegagalan paling jahat di proyek ini: tabel `accounts` ada tetapi kosong selamanya,
  login mustahil, dan **tanpa pesan galat** karena `query()` hanya mengembalikan array kosong.
- `seed/accounts.js` [BARU]: 63 akun, nol pemanggilan `rng()`, `createdAt` diturunkan dari
  `joinedAt` awardee. Satu draw acak tambahan akan menggeser 60 profil, 639 entri buku besar, dan
  seluruh distribusi jenjang sekaligus.
- `AccountRepository` [BARU]: `findByEmail()` beserta `demoAccounts()` yang **tidak** mengembalikan
  kata sandi.

### 4.3 Store (`src/lib/stores/**`)

- `session.svelte.js` **ditulis ulang**: dari pemilih peran menjadi sesi berbasis akun dengan
  `login()`, `logout()`, `restore()`, `hydrate()`, dan pendelegasian otorisasi ke `AccessPolicy`.
- `catalog.svelte.js` mendapat `publishedEvents` dan `upcomingEvents`: halaman publik dilarang
  menyaring sendiri dari daftar mentah.
- `editorial.svelte.js` [BARU]: pembungkus `ContentReviewService` untuk zona verifikator.
- `impact.svelte.js` [BARU]: satu-satunya jalur angka publik.
- `gamification.svelte.js`: **perbaikan balapan hidrasi** (lihat §5, Pelajaran 3).

### 4.4 Presentasi (`src/routes/**`, `src/lib/components/**`)

| Sebelum | Sesudah |
|---|---|
| 2 zona: `(public)`, `member`/`admin` | 4 zona: `(public)`, `awardee`, `verifikator`, `admin` |
| Tanpa penjaga zona | `ZoneGuard.svelte` dengan kontrak atribut `data-zone-splash` / `data-zone-denied` |
| Pemilih peran di `/masuk` | Formulir surel + kata sandi, panel bantuan kredensial demo terpisah |
| Nol komponen editorial | 8: `EditorialHero`, `PhotoFigure`, `PullQuote`, `DataBand`, `StorySpread`, `ImpactFigure`, `SectionRule`, `MonthCalendar` |
| Bar CSS di dasbor admin | 17 komponen chart ECharts, 22 pemakaian di lima halaman admin; impor `echarts` terpusat di `src/lib/charts/_echarts.js` |
| Kalender hanya di zona anggota | `/kalender` + `/kalender/[id]` publik, dengan unduh `.ics` |
| Nol jalur penulisan cerita | `/awardee/cerita/tulis` → antrean `/verifikator/cerita` → terbit ke `/cerita` |

---

## 5. Sebelum & sesudah: tabel jujur

Angka di kolom "sesudah" berasal dari perintah yang benar-benar dijalankan
(`npm run verify`, `npm run verify:e2e`, `npm run verify:gamification`), bukan dari perkiraan.

| Aspek | V1 | V2 | Catatan jujur |
|---|---|---|---|
| Route | 24 | 36 | 11 publik · 12 awardee · 6 verifikator · 7 admin |
| Komponen `.svelte` dikompilasi | 69 | 112 | `verify:compile`, 0 gagal, 0 warning |
| Peran | 1 pemilih peran demo | 3 peran berbasis akun | Kewenangan didaftarkan eksplisit; peran BUKAN hierarki |
| Akun | 0 | 63 | 60 AWARDEE · 2 VERIFIER · 1 ADMIN |
| Autentikasi | klik "Masuk sebagai …" | surel + kata sandi | Hash **tiruan**: lihat §6 |
| Mekanik gamifikasi di zona publik | ada (tangga jenjang di landing) | nol | Dibuktikan `public-purity.mjs`, 6 aturan, 14 berkas dipindai |
| Foto asli | 0 | 28 | Lisensi tercatat di `static/img/CREDITS.md` |
| Font | dari CDN | 5 woff2 lokal | Tanpa permintaan pihak ketiga saat memuat |
| Chart | bar CSS | 17 komponen ECharts | 22 pemakaian di lima halaman admin |
| Alur editorial | status tanpa aktor | 7 status cerita × peran + SLA hari kerja | `ContentReviewService` menegakkannya |
| Asersi domain | 52 | **156** | +104 asersi baru |
| Asersi seed | 43 | **70** | +27 asersi baru |
| E2E route | 24 route, sesi via pemilih peran | 36 route + 11 asersi guard | Setiap zona diuji sebagai tamu **dan** sebagai peran yang benar |
| E2E gamifikasi | 9 asersi | **22 asersi** | Termasuk 9 asersi anti-regresi balapan hidrasi |
| Tangkapan layar | 16 | 27 | Empat zona; berkas usang dihapus otomatis |
| Dokumen SDLC | 12 berkas | 14 berkas | `docs/13` dan `docs/14` menutup PO-7 |

### Yang **tidak** membaik, dan sebaiknya diakui

| Hal | Keadaan | Mengapa dibiarkan |
|---|---|---|
| Ukuran `seed-data.js` | ±186 KB dalam satu berkas | Memecahnya berisiko menggeser urutan draw RNG dan merusak determinisme; pemecahan menuntut refaktor generator, bukan sekadar memindahkan blok |
| `view-model.js` zona publik | chunk build 350 KB | Sebagian besar adalah teks editorial, bukan logika; belum dipecah per-halaman |
| Uji E2E | berbasis jeda waktu (`tidur`) | Tanpa dependensi tambahan tidak tersedia penantian berbasis kondisi; jedanya dilebihkan supaya stabil, dengan biaya durasi |
| Aksesibilitas | belum diaudit menyeluruh | `verify:compile` menahan warning a11y compiler pada nol, tetapi itu bukan audit WCAG |
| Tombol merah ukuran kecil | memakai merah lebih gelap | Putih di atas `#ED1C24` hanya 4,38: belum lolos AA untuk teks kecil |

---

## 6. Batasan yang melekat pada mockup ini

Ditulis di sini supaya tidak perlu ditanyakan saat demo.

1. **Tidak ada backend.** Seluruh data tinggal di IndexedDB peramban masing-masing pengguna.
   Menghapus data situs mengembalikan seed awal.
2. **Autentikasi tiruan.** Verifikasi kata sandi terjadi di klien dengan hash non-kriptografis.
   Siapa pun yang membuka DevTools dapat melewatinya. Penggantinya saat backend nyata dipasang:
   verifikasi pindah **seluruhnya** ke server dengan Argon2id, kata sandi tidak pernah menyeberang
   ke peramban, dan `PasswordHash.js` dihapus bersama seluruh pemanggilnya.
3. **Route guard adalah pengalaman pengguna, bukan keamanan.** Tanpa server, tidak ada otorisasi
   yang tidak dapat dilewati. `ZoneGuard` mencegah kekeliruan, bukan penyerang.
4. **Data sintetis.** 60 nama awardee, 29 cerita, 20 kegiatan, dan 639 entri aktivitas dibangkitkan
   deterministik untuk keperluan demo: bukan data penerima manfaat sungguhan.
5. **Foto adalah stok berlisensi bebas**, bukan dokumentasi kegiatan Pertamina Foundation. Kredit
   dan lisensinya tercatat di `static/img/CREDITS.md`.
6. **Angka kelas B dan C bukan hasil ukur.** Jangkauan organik adalah estimasi berparameter yang
   wajib disajikan sebagai rentang; benchmark komunikasi adalah rujukan industri. Keduanya
   dijelaskan di `/metode-pengukuran`.

---

## 7. Pelajaran

**1 · Gerbang yang tidak dapat gagal bukan gerbang.**
Detektor guard versi lama mencocokkan kalimat `/Pilih peran|Masuk ke Pfriends|Konsol khusus
pengelola/`. Ketiga kalimat itu lenyap saat `/masuk` ditulis ulang menjadi formulir dan
`admin/+layout.svelte` diganti `ZoneGuard`. Efeknya: detektor tidak akan pernah menyala lagi, dan
skrip akan melaporkan 36 route hijau **bahkan bila seluruh zona ter-login menampilkan panel "bukan
peran Anda"**. Penggantinya `[data-zone-denied]` dan `[data-zone-splash]`: **atribut, bukan teks**,
karena atribut adalah kontrak sedangkan salinan teks adalah pilihan editorial yang boleh berubah.

**2 · Menguji zona tanpa sesi hanya menguji guardnya.**
`e2e-routes.mjs` V1 membuka `/admin` tanpa sesi, melihat pengalihan, dan menghitungnya hijau.
Yang terbukti hanyalah guard bekerja; halamannya sendiri bisa saja rusak total. V2 menjalankan
empat fase: publik sebagai tamu, pintu zona sebagai tamu (wajib mendarat di `/masuk?next=…`),
setiap zona dengan peran yang benar (wajib merender isi, nol galat konsol, nol panel penolakan),
dan penolakan lintas zona (peran salah wajib melihat panel).

**3 · Bug yang paling mahal adalah yang tidak menimbulkan galat.**
`session.restore()` mengembalikan `awardeeId` dari localStorage seketika, sedangkan
`session.awardee` baru terisi oleh `hydrate()` yang asinkron. `gamification.refresh()` yang tiba di
antara dua saat itu melihat `awardee === null` padahal orangnya jelas masih masuk: lalu memanggil
`reset()`. Akibatnya poin, jenjang, dan lencana terkunci pada **nol** setelah muat ulang keras.
Halaman tetap merender, tidak ada galat konsol, hanya angkanya yang salah. Perbaikannya satu
kondisi; pencegah regresinya adalah tiga asersi × tiga putaran muat ulang keras di
`e2e-gamification.mjs`, memakai anggota yang saldo seed-nya **bukan nol**: menguji "poin tidak nol"
pada anggota bersaldo nol akan hijau selamanya tanpa membuktikan apa pun.

**4 · Larangan butuh jalan keluar, atau ia akan dilanggar.**
Self-review dilarang. Bila hanya ada satu akun verifikator, larangan itu membuntukan antrean pada
demo pertama, dan orang pertama yang terhalang akan meminta pengecualian. Dua akun verifikator sejak
seed membuat larangan itu dapat ditegakkan tanpa pengecualian.

**5 · Kontrak export sebelum kode membuat paralelisme mungkin.**
Lima paket G3-B berjalan bersamaan tanpa bentrok karena `docs/12` §3.7 memetakan setiap berkas ke
tepat satu pemilik dan menyatakan sisanya beku. Proyek ini bukan repositori git: tidak ada undo,
dan tidak ada `git diff` untuk membuktikan siapa mengubah apa. Kepemilikan berkas menggantikan
keduanya.

**6 · "Terlalu AI" adalah keluhan tentang keseragaman.**
Setelah diterjemahkan menjadi gejala (nol foto, ritme seksi metronomik, gradien dekoratif, grid
simetris), tiga di antaranya dapat dijadikan gerbang otomatis. `public-purity.mjs` menolak
`py-12` berulang lebih dari dua kali dan pola judul `text-2xl … md:text-3xl` berulang lebih dari dua
kali di landing. Kritik selera yang berhasil diubah menjadi asersi tidak akan kembali diam-diam.

**7 · Angka yang tidak dapat dipertahankan lebih buruk daripada tidak ada angka.**
Klasifikasi A/B/C memaksa setiap angka publik menyatakan asal-usulnya: terhitung, estimasi
berparameter, atau benchmark eksternal. Jangkauan organik **wajib** rentang: satu angka tunggal
akan terbaca sebagai hasil ukur, dan klaim itu runtuh pada pertanyaan pertama: "diukur bagaimana?"

---

## 8. Gerbang yang berlaku sejak V2

```bash
npm run verify              # compile + domain + seed + purity + build  (satu perintah, seluruh gerbang statis)
npm run verify:e2e          # 36 route di peramban sungguhan, empat fase
npm run verify:gamification # poin bertambah, tersimpan, dan TIDAK nol setelah muat ulang keras
npm run screenshot          # regenerasi bukti visual empat zona
```

`verify:public` disediakan sebagai alias `verify:purity` supaya nama yang tercantum di
`docs/12` §6.2 tetap dapat dipanggil.

Hasil sungguhan pada serah terima ini tercatat di `README.md` §Verifikasi.
