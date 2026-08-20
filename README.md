# PFriends: Community Connect Initiative

Mockup microsite untuk **Breakthrough Project Divisi Corporate Secretary: Pertamina Foundation**.

PFriends adalah wadah alumni **Beasiswa Sobat Bumi (SOBI)** dan pelaku usaha **PFpreneur /
Womenpreneur** agar tetap terhubung setelah masa program selesai. Ruang publiknya bercerita tentang
program: dampak, cerita terpublikasi, kalender komunitas, dan gerakan bersama. Mekanik pengakuan
kontribusi (poin, jenjang, papan peringkat, lencana) hidup **di dalam area ter-login Awardee**, dan
agregatnya di dasbor Admin.

Dibangun dari `2026 Community Connect Initiative update as 29052026.pdf` (12 halaman): seluruh
angka poin, ambang jenjang, dan target KPI diambil persis dari dokumen tersebut.

**Versi ini adalah revisi V2.** Jejak perubahannya ada di `docs/13-SDLC-DELTA.md`; ketertelusuran
keputusan → berkas → gerbang ada di `docs/14-TRACEABILITY.md`.

---

## Menjalankan

### Prasyarat

Node.js 20+ dan npm. Pada Mac ini Node **sudah dipasang** di `~/.local/opt/node22` dan ditautkan ke
`~/.local/bin` (sudah ada di PATH). Cek dengan `node -v` → `v22.23.1`.

Di mesin lain (mis. Windows), pasang Node dari <https://nodejs.org> lalu:

```bash
npm install
npm run pb:serve     # terminal 1: PocketBase pada http://127.0.0.1:8090
npm run pb:seed      # sekali setelah superuser dibuat dan .env diisi
npm run dev          # buka http://localhost:5173
```

Fitur **Bukti Keaktifan** dan **Registrasi Awardee** memakai PocketBase. Unduh PocketBase v0.39.9 untuk Windows ke
`pocketbase/pocketbase.exe`, salin `.env.example` menjadi `.env`, lalu isi kredensial
superuser hanya untuk menjalankan seed. `PB_SUPERUSER_*` tidak pernah masuk bundle browser.
Panduan dasar ada di `docs/15-POCKETBASE-BUKTI-KEAKTIFAN.md`. Pelacakan status Awardee dan
riwayat keputusan Verifikator dijelaskan di `docs/16-RIWAYAT-DAN-PELACAKAN-BUKTI.md`.
Alur registrasi, klarifikasi, dan ACC akun dijelaskan di `docs/17-REGISTRASI-AWARDEE.md`.

### Perintah

```bash
npm run dev                  # server pengembangan
npm run build                # build produksi statis ke folder build/
npm run preview              # pratinjau hasil build
npm run pb:serve             # backend PocketBase lokal
npm run pb:seed              # seed akun, profil, poin, koin, 12 reward, dan 13 penukaran secara idempoten

npm run verify               # GERBANG UTAMA: compile + domain + seed + purity + build
npm run verify:compile       # kompilasi seluruh .svelte dengan compiler Svelte 5
npm run verify:domain        # 156 asersi aturan domain
npm run verify:seed          #  70 asersi konsistensi data seed
npm run verify:purity        #   6 aturan kemurnian zona publik (PO-2 & anti "terlalu AI")
npm run verify:registration  # 18 asersi registrasi dan gamifikasi pada PocketBase uji
npm run verify:directory     # 13 asersi Jejaring, privasi profil, filter, dan poin demo
npm run verify:rewards       # saldo, katalog, penukaran idempoten, RBAC Admin, dan refund
npm run verify:backend       # seluruh integration test PocketBase di atas
npm run verify:public-content # endpoint cerita publik dan leaderboard
npm run verify:public-impact  # agregat metode pengukuran PocketBase

# Gerbang peramban: server dev harus berjalan lebih dulu:
npm run dev -- --port 5177
npm run verify:e2e           # seluruh route dibuka di peramban sungguhan, lima fase (0-4)
npm run verify:gamification  # poin bertambah, tersimpan, dan tidak nol setelah muat ulang keras
npm run verify:browser       # keduanya berurutan
npm run screenshot           # regenerasi 15 tangkapan layar ke docs/screenshots/
```

> `verify:public` adalah alias `verify:purity`, disediakan supaya nama yang tercantum di
> `docs/12-BUILD-CONTRACT-V2.md` §6.2 tetap dapat dipanggil.

Skrip peramban mencari Chromium di `/Applications/Brave Browser.app`; ganti lewat variabel
`BROWSER_BIN` bila memakai Chrome atau Edge. Seluruhnya memakai Chrome DevTools Protocol lewat
WebSocket bawaan Node: tanpa Playwright, Puppeteer, atau dependensi uji apa pun.

---

## Tiga peran & kredensial demo

Peran **melekat pada akun**, bukan dipilih dari daftar.

Pada mode demo lokal, masuk dapat dilakukan dengan mengklik kartu pengguna di `/masuk`. Kartu
tersebut hanya tampil ketika `VITE_ENABLE_DEMO_LOGIN=1`. Selama SSO belum tersedia, login password
staf tetap diterima backend. Awardee masuk dengan email dan password miliknya sendiri. Login
Verifikator/Admin akan diganti SSO OAuth; titik integrasinya ditandai `TODO(SSO)`. Setelah provider
SSO siap, set `PB_REQUIRE_STAFF_SSO=1` untuk mematikan login password staf.

Sebelumnya **masuk cukup dengan mengklik kartu pengguna** di `/masuk`: tidak
ada kolom sandi yang perlu diisi. Ini keringanan yang disengaja untuk tahap mockup: peragaan di
ruang rapat sering harus berpindah peran beberapa kali dalam semenit, dan mengetik surel panjang
setiap kali memakan waktu peragaan itu sendiri. Kata sandi demo tetap dipakai di balik layar dan
diverifikasi oleh PocketBase Auth. Setelah autentikasi berhasil, profil tampilan lama dimuat dari
IndexedDB melalui identitas penghubung.

| Peran | Surel | Kewenangan |
|---|---|---|
| **Admin PF** | `admin@pertaminafoundation.org` | Parameter program, agregat KPI, keanggotaan, diseminasi, consent, ekspor, jalur banding. **Bukan** pemutus konten |
| **Verifikator** | `verifikator@pertaminafoundation.org` | Meninjau, menyetujui, dan menerbitkan konten; mengesahkan bukti kontribusi. **Tidak** melihat poin maupun papan peringkat |
| **Verifikator kedua** | `verifikator2@pertaminafoundation.org` | Sama; ada supaya larangan menilai karya sendiri punya jalan keluar |
| **Awardee** | `zahra.kartawijaya@pfriends.id` | Menulis cerita, mengusulkan kegiatan, mengumpulkan poin, melihat papan peringkat. Profil ini sengaja yang paling terisi |

**Kata sandi seluruh akun demo: `pfriends2026`.**

Seed memuat **63 akun**: 60 Awardee (`nama.belakang@pfriends.id`), 2 Verifikator, 1 Admin. Panel
bantuan di halaman `/masuk` memperlihatkan surel demo dan mengisikannya dengan satu klik; kata
sandinya tidak pernah melewati komponen antarmuka.

### Matriks akses zona

| Keadaan | `/awardee/**` | `/verifikator/**` | `/admin/**` | Zona publik |
|---|---|---|---|---|
| Tamu | → `/masuk?next=…` | → `/masuk?next=…` | → `/masuk?next=…` | render |
| Awardee | render | panel "bukan peran Anda" | panel | render |
| Verifikator | panel | render | panel | render |
| Admin | panel | panel | render | render |

Peran **bukan** hierarki: Admin tidak mewarisi kewenangan Verifikator, dan sebaliknya. Aturannya
hidup di satu berkas: `src/lib/domain/policies/AccessPolicy.js`: dan diuji sebagai matriks
16 asersi oleh `npm run verify:domain`.

---

## Peta route

> Direvisi 4 Agustus 2026. Navigasi dipangkas tajam di seluruh zona; sejumlah
> halaman dicabut dan isinya dilebur. Beberapa route publik tetap hidup meski tidak
> lagi tercantum di navbar: masih ditautkan dari dalam halaman lain.

### Zona publik: 10 route, tanpa sesi

Navbar hanya memuat tiga: **Beranda**, **Blog**, **Calendar of Event**.

| Route | Di navbar | Isi |
|---|---|---|
| `/` | ✓ Beranda | Hero, billboard event, papan peringkat peserta paling aktif, blog terbaru |
| `/cerita` | ✓ Blog | Blog komunitas |
| `/cerita/[slug]` |: | Satu tulisan terpublikasi |
| `/kalender` | ✓ Calendar of Event | Kalender komunitas |
| `/kalender/[id]` |: | Detail kegiatan + unduh `.ics` |

Calendar of Event memakai PocketBase dan sengaja tidak memiliki data event dari seeder. Awardee mengusulkan event, Verifikator menyetujui, lalu event tampil publik. Registrasi tidak berpoin; 15 poin kehadiran baru dibukukan setelah peserta mengunggah bukti dan Verifikator menyetujuinya. Lihat `docs/21-CALENDAR-OF-EVENT-POCKETBASE.md`.

Beranda, papan peringkat publik, daftar blog, dan detail blog juga membaca PocketBase. Seeder memasukkan seluruh status cerita, sedangkan endpoint publik hanya membuka cerita yang sudah terbit dan memiliki consent aktif. Workflow privat cerita masih memakai Dexie. Lihat `docs/23-LANDING-DAN-BLOG-POCKETBASE.md`.

Label `DUMMY` tidak ditampilkan pada landing dan blog karena data operasional kedua bagian tersebut sudah berasal dari PocketBase. Label tetap muncul pada halaman lain yang masih membaca data lokal.

Halaman komunitas membaca jumlah anggota aktif, komposisi komunitas, sebaran chapter, dan agenda dari PocketBase. Narasi serta foto tetap menjadi konfigurasi editorial statis. Lihat `docs/24-KOMUNITAS-POCKETBASE.md`.
| `/masuk` |: | Login email/password; kartu satu klik hanya pada mode demo lokal |
| `/daftar` |: | Registrasi Awardee dengan data diri dan bukti protected |
| `/pendaftaran/status` |: | Status terbatas dan pengiriman klarifikasi pendaftar |
| `/tentang` |: | Latar program dan tata kelola |
| `/komunitas` |: | Profil SOBI dan PFpreneur/Womenpreneur dengan agregat anggota PocketBase |
| `/gerakan` |: | Gerakan bersama yang sedang berjalan |
| `/metode-pengukuran` |: | Cara tiap angka dihitung dari agregat PocketBase |

### Zona Awardee: 12 route

Navbar: Beranda · Blog Saya · Forum · Calendar of Event · Pencapaian · Kabar · Direktori

Fitur Kabar menggunakan PocketBase: Admin menyusun/menjadwalkan/menerbitkan melalui `/admin/broadcast`, Awardee membaca dan melakukan amplifikasi dari `/awardee/kabar`, sedangkan bukti share publik diputuskan Verifikator.

`/awardee` · `/awardee/cerita` · `/awardee/cerita/tulis` · `/awardee/forum` (**baru**: forum
bergaya kanal) · `/awardee/kalender` · `/awardee/penghargaan` · `/awardee/kabar` ·
`/awardee/kabar/[id]` · `/awardee/direktori` · `/awardee/aksi` · `/awardee/gerakan` ·
`/awardee/profil` (tiga terakhir hidup tetapi di luar navbar)

`/awardee/papan-peringkat` **dicabut**: peserta melihat capaiannya sebagai pencapaian
pribadi, bukan sebagai peringkat antar-peserta. Papan peringkat hanya tampil di beranda
publik dan dasbor verifikator.

### Zona Verifikator

Navbar: Dasbor · Submission Blog · Konfigurasi Calendar of Event

`/verifikator` (dasbor performa awardee & dampaknya) · `/verifikator/cerita` (Submission
Blog) · `/verifikator/cerita/[id]` (tiga gerbang keputusan) · `/verifikator/kegiatan`
(Konfigurasi Calendar of Event) · `/verifikator/bukti-keaktifan/**` ·
`/verifikator/pendaftaran` (ACC, klarifikasi, tolak, dan buka kembali registrasi Awardee)

`/verifikator/bukti` dan `/verifikator/profil` **dicabut**.

### Zona Admin

Navbar: Dasbor KPI · Kontrol Akun · Gamifikasi

`/admin` (dasbor KPI publikasi & performa sistem) · `/admin/awardee` (Kontrol Akun, 63 akun,
dengan impersonate) · `/admin/gamifikasi` (nilai poin & ambang jenjang dapat disunting) ·
`/admin/pendaftaran` (pemantauan registrasi read-only)

`/admin/broadcast`, `/admin/moderasi`, `/admin/esg`, dan `/admin/laporan` **dicabut** -
dua yang terakhir isinya melebur ke Dasbor KPI.

---

## Alur editorial

Ruang publik tidak dapat diisi langsung. Setiap konten melewati alur yang aktornya jelas.

### Cerita

```
Awardee                     Verifikator                          Publik
───────                     ───────────                          ──────
DRAFT ──ajukan──► DIAJUKAN ──ambil──► REVIEW ──setujui──► DISETUJUI ──terbit──► TERPUBLIKASI
                     ▲                   │                                          │
                     └── ajukan ulang ───┴── minta revisi ──► PERLU_REVISI           │
                                         └── tolak permanen ──► DIARSIPKAN ◄── takedown
```

Aturan yang ditegakkan kode, bukan kesepakatan:

- **Penulis tidak meninjau naskahnya sendiri.** Kepengarangan hanya milik Awardee; akun Verifikator
  wajib ber-`awardeeId` kosong.
- **Persetujuan menuntut checklist data sensitif dinyatakan lolos secara eksplisit.**
- **Permintaan revisi, penolakan, dan pembatalan wajib disertai catatan tertulis.** Catatan berisi
  spasi saja dianggap kosong.
- **Admin bukan pemutus konten.** Ia hanya dapat mengarsipkan cerita yang sudah terbit (jalur
  takedown), dan memegang jalur banding.

### Kegiatan

```
DRAFT ──usulkan (Awardee ATAU Verifikator)──► DIUSULKAN ──setujui (Verifikator lain)──► TERJADWAL
                                                   └── tolak + alasan ──► DITOLAK
TERJADWAL ──► BERLANGSUNG ──► SELESAI    ·    TERJADWAL/BERLANGSUNG ──batal + alasan──► DIBATALKAN
```

`DIUSULKAN → TERJADWAL` **berarti** terbit ke kalender publik: tidak ada sumbu publikasi kedua.
Pengusul dilarang menyetujui usulannya sendiri; karena itulah seed menyediakan dua akun verifikator.

Tenggat tiap antrean (2 / 3 / 5 / 2 hari kerja) berasal dari satu konstanta, `SLA_HARI_KERJA` di
`src/lib/domain/constants/content-workflow.js`.

---

## Arsitektur

Clean architecture berlapis. Arah ketergantungan satu arah dan **diuji**, bukan dipercaya:
**Presentation → Application → Domain ← Infrastructure**.

```
src/lib/domain/           # murni, tanpa framework: dapat diuji dengan `node` polos
  constants/              # roles · content-workflow · scoring-table · tier-table · kpi-targets · esg-taxonomy
  value-objects/          # Points · Tier · EsgTag · ConsentRecord · PasswordHash (immutable, punya equals)
  entities/               # UserAccount · Awardee · Story · CommunityEvent · PointActivity · Movement · ...
  policies/               # AccessPolicy · AntiGamingPolicy · FeatureEligibilityPolicy
  services/               # AuthService · ContentReviewService · ProgramImpactService · GamificationEngine · KpiCalculator · ...
  validation/             # Validator
  repositories/           # kelas abstrak: Dependency Inversion
src/lib/infrastructure/   # Dexie + repository konkret + seed deterministik (63 akun, 60 awardee)
src/lib/stores/           # store runes: pembungkus tipis di atas domain
src/lib/components/       # UI kit + ZoneGuard + editorial/ (8 komponen)
src/lib/charts/           # 17 komponen ECharts; impor `echarts` terpusat di _echarts.js
src/routes/               # (public) · awardee · verifikator · admin
```

Dua aturan yang dijaga gerbang otomatis:

1. **Nol angka poin, ambang jenjang, atau SLA yang ditulis literal di luar `domain/constants/`.**
   Mengubah nilai di sana mengubah seluruh aplikasi secara konsisten.
2. **Nol impor `svelte`, `dexie`, `$app/*`, `$lib/stores/*`, atau `$lib/infrastructure/*` di dalam
   `src/lib/domain/**`.** Dipindai berkas per berkas oleh `verify:domain` bagian 11: sehingga
   logika bisnis tetap utuh saat backend sungguhan dipasang.

Rincian rancangan ada di `docs/05-ARCHITECTURE.md`; kepemilikan berkas dan kontrak export V2 ada di
`docs/12-BUILD-CONTRACT-V2.md`.

---

## Cara demo ke Divisi Corsec

Alur 10 menit yang menunjukkan tiga peran, dasbor ECharts, dan kalender publik. Jalankan
`npm run dev`, lalu ikuti urutannya: urutan ini disusun supaya tiap layar menjawab satu keputusan
pemilik produk.

**Babak 1 · Ruang publik (tanpa masuk): 3 menit**

1. **`/`**: Landing. Tunjukkan empat blok: dampak & angka agregat, cerita terpublikasi, kalender
   komunitas beserta agenda, lalu gerakan dan dua komunitas. Tegaskan: **tidak ada satu pun poin,
   jenjang, atau papan peringkat di layar ini**: itu keputusan, bukan kebetulan, dan ada gerbang
   otomatis yang menjaganya.
2. **`/metode-pengukuran`**: Jawaban untuk pertanyaan "angka ini dari mana?". Tiga kelas angka:
   terhitung (A), estimasi berparameter yang wajib disajikan sebagai rentang (B), dan benchmark
   industri yang bukan hasil ukur PFriends (C).
3. **`/kalender`** → klik satu kegiatan → **`/kalender/[id]`** → tombol unduh `.ics`. Kalender
   komunitas dapat dibaca siapa pun tanpa masuk.
4. **`/cerita`**: Blog cerita dampak dengan panel daftar event di sisi halaman. Buka satu cerita.

**Babak 2 · Awardee: 3 menit**

5. **`/masuk`** → `zahra.kartawijaya@pfriends.id` / `pfriends2026`.
6. **`/awardee`**: Di sinilah gamifikasi tinggal. Tunjukkan saldo poin, jenjang, dan sisa jarak ke
   jenjang berikutnya. **Klik "Lakukan sekarang"** pada aksi cepat → poin bertambah seketika, dan
   **muat ulang halaman** untuk membuktikan angkanya benar-benar tersimpan.
7. **`/awardee/aksi`**: Sisa kuota harian dan status tiap poin (diberikan / menunggu bukti / tidak
   dihitung). Ini jawaban atas *"reward meaningful contribution, not spammy activity"* (Hal 11).
8. **`/awardee/cerita/tulis`**: Tulis satu cerita dan ajukan. Naskah masuk antrean verifikator.
9. **`/awardee/papan-peringkat`**: Peringkat per komunitas dan per chapter. Tegaskan: halaman ini
   **tidak ada padanannya di zona publik**.

**Babak 3 · Verifikator: 2 menit**

10. Keluar → **`/masuk`** → `verifikator@pertaminafoundation.org` / `pfriends2026`.
11. **`/verifikator`**: Papan antrean tertua-dulu beserta tenggat tiap antrean dalam hari kerja.
12. **`/verifikator/cerita`** → buka satu naskah → tunjukkan **tiga gerbang**: kelayakan fitur
    publik, kesiapan bukti ESG, dan checklist data sensitif. Coba setujui tanpa mencentang
    checklist: sistem menolak. Coba minta revisi tanpa menulis catatan: sistem menolak.
13. **`/verifikator/kegiatan`**: Usulan kegiatan dari Awardee. Setujui satu, lalu kembali ke
    **`/kalender`** untuk memperlihatkan kegiatan itu kini tampil publik.

**Babak 4 · Admin: 2 menit**

14. Keluar → **`/masuk`** → `admin@pertaminafoundation.org` / `pfriends2026`.
15. **`/admin`**: Dasbor KPI dengan Apache ECharts: lima KPI Hal 6 dihitung langsung dari data
    komunitas, lengkap dengan corong keterlibatan dan estimasi jangkauan organik (bruto vs neto).
16. **`/admin/moderasi`**: Corong pipeline editorial dan papan beban verifikator.
17. **`/admin/esg`**: Pemetaan E/S/G dan SDG. Tegaskan pembedaan Hal 10: KPI Aktivitas membuktikan
    program *berjalan*, KPI ESG membuktikan program *menciptakan nilai*.
18. **`/admin/gamifikasi`**: Agregat gamifikasi: distribusi jenjang tanpa nama, sumber perolehan
    poin. Papan peringkat bernama **tidak ada di sini**: itu milik Awardee.

**Penutup: 30 detik**

19. Buka terminal, jalankan `npm run verify`. Empat gerbang plus build, seluruhnya hijau. Tunjukkan
    `docs/14-TRACEABILITY.md`: setiap keputusan pemilik produk menunjuk berkas yang mewujudkannya
    dan perintah yang membuktikannya.

> Tombol **"Muat ulang data demo"** di konsol admin mengembalikan seluruh data ke kondisi awal bila
> demo perlu diulang. Alternatifnya: hapus data situs di peramban.

---

## Dokumentasi SDLC

| Berkas | Isi |
|---|---|
| `00-SOURCE-BRIEF.md` | Ekstraksi lengkap 12 halaman PDF sumber: **rujukan kebenaran** |
| `01-BRD-SRS.md` | Latar, persona, 46 user story, use case, FR/NFR, matriks telusur |
| `02-KPI-MODEL.md` | Formula tiap KPI, definisi operasional, rancangan dasbor |
| `03-GAMIFICATION-SPEC.md` | Skoring, jenjang, anti-gaming, lencana, quest, papan peringkat, reward |
| `04-ESG-GOVERNANCE.md` | Model bukti E/S/G, alur moderasi, consent, audit trail |
| `05-ARCHITECTURE.md` | Rancangan clean architecture & OOP |
| `07-UX-SITEMAP.md` | Sitemap, route map, wireframe, user flow, microcopy |
| `08-DESIGN-SYSTEM.md` | Token warna (dengan rasio kontras), tipografi, komponen |
| `09-BUILD-CONTRACT.md` | Kontrak build V1 |
| **`10-REVISION-SPEC.md`** | Spesifikasi revisi V2: audit "terlalu AI", 31 user story US-R, matriks RBAC, state machine konten |
| **`11-VISUAL-DIRECTION.md`** | Arah visual editorial: tipografi, foto, ritme seksi, gejala yang dilarang kembali |
| **`12-BUILD-CONTRACT-V2.md`** | Kontrak build V2: kepemilikan berkas, kontrak export, rencana verifikasi |
| **`13-SDLC-DELTA.md`** | Jejak proses revisi: latar, fase, 9 keputusan arsitektur beserta alasannya, tabel sebelum/sesudah, pelajaran |
| **`14-TRACEABILITY.md`** | Matriks PO-1…PO-7 dan US-R01…US-R31 → berkas → gerbang yang membuktikannya |
| `screenshots/` | 15 tangkapan layar empat zona |

---

## Verifikasi

Mockup ini tidak diserahkan berdasarkan asumsi. Berikut yang benar-benar dijalankan pada serah
terima ini, beserta hasilnya:

```
npm run verify:compile        112 komponen · 0 gagal · 0 warning
npm run verify:domain         156 asersi  · 0 gagal            (11 bagian)
npm run verify:seed            70 asersi  · 0 gagal            (9 bagian)
npm run verify:purity          14 berkas dipindai · 0 pelanggaran (6 aturan)
npm run build                 sukses · adapter-static · 0 error
────────────────────────────────────────────────────────────────────────────
npm run verify:e2e             seluruh route · 0 bermasalah · 12 asersi guard lulus
npm run verify:gamification    22 asersi · 0 gagal
npm run screenshot             15 tangkapan layar · 0 berkas usang tersisa
```

Yang sudah terbukti: bukan diklaim:

- 9 nilai poin dan 4 ambang jenjang **persis** sama dengan Hal 11–12 dokumen sumber, benar di setiap
  titik batas (0/24/25/49/50/99/100/149/150)
- Matriks akses 4 peran × 4 zona berperilaku persis seperti tabel di atas, termasuk penolakan
  *open redirect* (`//situs-lain.com`) dan gelang login
- Zona publik **nol** mekanik gamifikasi: diperiksa lewat impor, komponen, teks yang dirender, dan
  bentuk kembalian `ProgramImpactService.publicSnapshot()`
- Alur editorial menolak: menyetujui tanpa checklist sensitivitas, memutus tanpa catatan, menyetujui
  usulan sendiri, dan bertindak dengan akun terkunci
- Total poin tiap awardee seed **benar-benar** merupakan jumlah aktivitasnya, bukan angka tempelan;
  seed deterministik: tampilan demo identik setiap kali dibuka
- Seluruh route benar-benar merender isi **sebagai peran yang berhak**, dan benar-benar tertutup bagi
  peran lain: keduanya diuji terpisah
- Menekan aksi menambah poin sesuai nilai kanonik, tetap ada setelah muat ulang keras, dan **tidak
  jatuh ke nol** akibat balapan hidrasi (tiga putaran muat ulang, sembilan asersi)
- Batas harian anti-spam benar-benar menolak aksi berlebih

---

## Catatan jujur & batasan

Ditulis di sini supaya tidak perlu ditanyakan saat presentasi.

- **Migrasi backend masih bertahap.** Autentikasi, bukti keaktifan, riwayat review, dan poin hasil
  verifikasi sudah berada di PocketBase. Pembacaan cerita publik dan kegiatan juga sudah memakai
  PocketBase. Workflow privat cerita serta beberapa modul mockup lama masih memakai IndexedDB
  (Dexie), sehingga perubahan pada modul tersebut belum tersinkron antarperamban.
- **Keamanan fitur baru ditegakkan di PocketBase.** Collection rules dan hook server membatasi
  kepemilikan submission serta keputusan verifikator. `ZoneGuard` di antarmuka tetap hanya lapisan
  pengalaman pengguna; data backend tidak mengandalkannya sebagai otorisasi.
- **Nama, cerita, dan riwayat kontribusi adalah data sintetis** yang dibangkitkan deterministik
  untuk keperluan demo: bukan data penerima manfaat sungguhan. 60 awardee, 29 cerita, 20 kegiatan,
  639 entri aktivitas.
- **Foto adalah stok berlisensi bebas**, bukan dokumentasi kegiatan Pertamina Foundation. Kredit dan
  lisensi tiap berkas tercatat di `static/img/CREDITS.md`.
- **Angka kelas B dan C bukan hasil ukur.** Jangkauan organik adalah estimasi berparameter yang
  wajib disajikan sebagai rentang; benchmark komunikasi adalah rujukan industri. Keduanya dijelaskan
  di `/metode-pengukuran`.
- **Titik sambung backend** ada di `src/lib/infrastructure/repositories/`. Mengganti implementasi
  Dexie dengan pemanggilan REST tidak menyentuh lapisan domain sama sekali: dan itu diuji, bukan
  diasumsikan.
- **Tombol merah gelap pada aksi berukuran kecil disengaja.** Putih di atas `#ED1C24` hanya mencapai
  rasio 4,38: belum lolos WCAG AA untuk teks kecil: sehingga varian `sm` memakai merah yang lebih
  gelap (6,53). Bila tim desain memilih konsistensi visual di atas kepatuhan AA, ubah di
  `src/lib/components/Button.svelte`.
- **Yang belum tertutup gerbang otomatis** didaftar terbuka di `docs/14-TRACEABILITY.md` §3: keluar
  sesi lewat menu profil, uji lebar 375 px, audit WCAG menyeluruh, dan mutu tulisan Bahasa
  Indonesia. Semuanya diperiksa manual.

---

Dibangun untuk Divisi Corporate Secretary: Pertamina Foundation · 2026
