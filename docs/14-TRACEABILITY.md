# 14: Matriks Ketertelusuran V2

> Aturan tunggal dokumen ini: **kolom terakhir hanya boleh memuat perintah atau nama asersi yang
> benar-benar ada dan benar-benar dijalankan.** Bukan rencana, bukan janji. Setiap nama asersi di
> bawah muncul persis seperti tertulis pada **keluaran** gerbang yang disebut, dan sebagian besar
> juga dapat dicari persis (`grep`) di dalam berkas skripnya. Pengecualiannya adalah nama yang
> dirakit saat berjalan: mis. `` `${peran} mendarat di ${profil.home}` `` di `e2e-routes.mjs` dan
> `` `putaran ${n}: …` `` di `e2e-gamification.mjs`. Untuk yang seperti itu, cocokkan dengan keluaran
> perintahnya, bukan dengan isi berkasnya; cara memeriksanya ada di §4.
>
> Bila sebuah baris tidak punya gerbang otomatis, itu ditulis apa adanya sebagai **pemeriksaan
> manual** beserta alasannya: bukan disamarkan sebagai gerbang.

---

## 0. Perintah yang menjadi gerbang

| Kode | Perintah | Isi |
|---|---|---|
| **G-C** | `npm run verify:compile` | 112 komponen, 0 gagal, 0 warning |
| **G-D** | `npm run verify:domain` | 203 asersi domain (14 bagian) |
| **G-S** | `npm run verify:seed` | 73 asersi seed (9 bagian) |
| **G-P** | `npm run verify:purity` | 7 aturan kemurnian zona publik; 14 berkas route + 23 komponen bersama yang terjangkau |
| **G-B** | `npm run build` | Build produksi `adapter-static`, 0 error |
| **G-E** | `npm run verify:e2e` | 36 route di peramban sungguhan + 31 asersi guard & sesi, lima fase (0–4) |
| **G-G** | `npm run verify:gamification` | 22 asersi gamifikasi, termasuk anti-regresi hidrasi |
| **G-V** | `npm run screenshot` | 27 tangkapan layar empat zona; berkas usang dihapus |

`npm run verify` menjalankan **G-C → G-D → G-S → G-P → G-B** berurutan dan berhenti pada kegagalan
pertama. G-E, G-G, dan G-V memerlukan server dev berjalan, jadi keduanya di luar rantai itu dengan
sengaja: gerbang yang tidak dapat berjalan di lingkungan bersih akan diabaikan orang.

---

## 1. Keputusan pemilik produk PO-1…PO-7

| PO | Keputusan | Berkas yang mewujudkannya | Gerbang yang membuktikannya |
|---|---|---|---|
| **PO-1** | Landing publik memuat dampak & angka agregat, blog terpublikasi, kalender + daftar event, gerakan + profil dua komunitas | `src/routes/(public)/+page.svelte` · `(public)/_view-model.js` · `(public)/kalender/**` · `(public)/_calendar-view-model.js` · `(public)/gerakan/+page.svelte` · `(public)/komunitas/+page.svelte` · `src/lib/components/editorial/MonthCalendar.svelte` · `src/lib/components/EventListPanel.svelte` · `src/lib/domain/services/ProgramImpactService.js` | **G-E** baris `/`, `/kalender`, `/kalender/EVT-…`, `/gerakan`, `/komunitas` (semua ✓, ≥400 chr, 0 galat konsol) · **G-S** asersi `≥6 kegiatan mendatang terhadap HARI INI (kalender publik tidak boleh kosong)` dan `kegiatan TERJADWAL terakhir ≥90 hari dari HARI INI` dan `≥10 cerita TERPUBLIKASI untuk mengisi blog publik` · **G-D** asersi `publicSnapshot() memuat upcomingEvents` |
| **PO-2** | Poin, tabel skor, jenjang, papan peringkat, lencana dilarang di zona publik; pindah ke area ter-login Awardee, agregat di dasbor Admin | `src/lib/domain/policies/AccessPolicy.js` (`canSeeScoring`, `canSeeLeaderboard`) · `src/lib/domain/services/ProgramImpactService.js` · `src/routes/awardee/**` · `src/routes/admin/gamifikasi/+page.svelte` · `scripts/verify/public-purity.mjs` | **G-P** tujuh aturan (kini juga memindai komponen bersama yang dirender zona publik): `Nol impor tabel nilai kontribusi & ambang jenjang` · `Nol komponen gamifikasi terimpor` · `Nol repository dibaca langsung dari zona publik` · `Nol kata terlarang pada teks yang dirender` · **G-D** asersi `canSeeScoring(tamu) = false`, `canSeeScoring(VERIFIER) = false`, `canSeeLeaderboard(ADMIN) = false`, `publicSnapshot() tanpa satu pun kunci berbau poin/tier/peringkat` |
| **PO-2 Tier Dinamis** | Admin meninjau dampak sebelum mengubah ambang; tier Awardee langsung diselaraskan tanpa mengubah total poin | `pocketbase/pb_migrations/1723968950_gamification_tiers.js` · `pocketbase/pb_hooks/gamification-rules.pb.js` · `src/routes/admin/gamifikasi/aturan/+page.svelte` · `src/lib/stores/gamification.svelte.js` | `npm run verify:gamification-rules` menguji RBAC, preview, transaksi, audit, optimistic concurrency, tier profil, dan invariansi poin |
| **Dasbor Verifikator** | KPI, produktivitas, laju peninjauan, antrean, dan rekam kerja berasal dari PocketBase serta dibatasi pada akun Verifikator aktif | `pocketbase/pb_hooks/verifier-dashboard-utils.js` · `src/routes/verifikator/+page.svelte` · `scripts/verify/verifier-dashboard-test.mjs` | `npm run verify:verifier-dashboard` menguji RBAC, kesamaan KPI Admin, deret bulanan, rekam kerja lintas workflow, keamanan DTO, dan pembacaan stabil |
| **PO-3** | Tiga peran AWARDEE/VERIFIKATOR/ADMIN dengan login surel + kata sandi dan route guard per zona | `src/lib/domain/constants/roles.js` · `entities/UserAccount.js` · `value-objects/PasswordHash.js` · `policies/AccessPolicy.js` · `services/AuthService.js` · `src/lib/stores/session.svelte.js` · `src/lib/components/ZoneGuard.svelte` · `src/routes/(public)/masuk/+page.svelte` · `src/lib/infrastructure/seed/accounts.js` | **G-D** matriks 16 asersi `canAccess(<peran>, "<jalur>") = <bool>` + `ADMIN tidak mewarisi zona VERIFIER` + §10 `akun VERIFIER ber-awardeeId ditolak` · **G-S** `63 akun (60 awardee + 2 verifikator + 1 admin)`, `SANDI_DEMO cocok untuk seluruh 63 akun` · **G-E** Fase 0 `penyimpanan origin kosong sebelum fase tamu` (1 asersi: tanpanya sisa sesi dari jalannya skrip sebelumnya membuat Fase 1–2 lulus karena kebetulan), Fase 2 `tamu di /admin dialihkan ke /masuk?next=/admin` (3 asersi), Fase 3 `<PERAN> mendarat di <beranda>` (3 asersi + 3 asersi `menyimpan sesi`), Fase 4 `ADMIN di /awardee/aksi melihat panel penolakan` (2 asersi) |
| **PO-4** | Awardee menulis → Verifikator meninjau → terbit ke publik; event boleh digalakkan awardee maupun verifikator; panel daftar event di sisi halaman blog | `src/lib/domain/constants/content-workflow.js` · `services/ContentReviewService.js` · `src/routes/awardee/cerita/tulis/+page.svelte` · `src/routes/verifikator/**` · `src/routes/awardee/_components/EventProposalForm.svelte` · `src/lib/components/EventListPanel.svelte` · `src/lib/stores/editorial.svelte.js` | **G-D** §7 (19 asersi transisi, mis. `REVIEW × VERIFIER -> [DISETUJUI, PERLU_REVISI, DIARSIPKAN]`, `kegiatan DIUSULKAN × ADMIN -> []`) dan §8 (13 asersi, mis. `pengusul menyetujui kegiatannya sendiri ditolak`, `menolak kegiatan tanpa catatan ditolak`) · **G-D** §12 gerbang consent (10 asersi, mis. `approveStory ditolak ketika consent PENULIS dicabut`, `publishStory ditolak ketika consent PENULIS dicabut`, `penulis yang tidak ditemukan di katalog BUKAN izin`, berpasangan dengan kendali `KENDALI: naskah ber-consent aktif dapat disetujui`) · **G-S** `ada usulan kegiatan yang berasal dari AWARDEE, bukan hanya staf`, `antrean verifikator tidak kosong (DIAJUKAN + REVIEW ≥ 3)` · **G-E** 6 route `/verifikator/**` hijau |
| **PO-5** | Dasbor statistik Admin memakai Apache ECharts | `src/lib/charts/**` (17 komponen + `_echarts.js` + `_chartTheme.js`) · `src/lib/components/EChart.svelte` · `src/routes/admin/+page.svelte` · `src/routes/admin/{esg,gamifikasi,laporan,broadcast}/+page.svelte` · `src/lib/stores/admin.svelte.js` | **G-C** 112 komponen kompilasi bersih (termasuk 17 chart) · **G-E** 7 route `/admin/**` hijau **dengan 0 error konsol**: kanvas ECharts yang gagal diinisialisasi selalu melempar ke konsol, jadi baris hijau di sini adalah bukti render · **G-V** `22-admin-dasbor-kpi.png`, `24-admin-esg.png`, `25-admin-gamifikasi.png`, `26-admin-laporan.png` |
| **PO-6** | Kritik "webnya terlalu AI" dijawab foto asli + redesign editorial | `static/img/**` (28 foto + `CREDITS.md`) · `static/fonts/**` (5 woff2) · `src/lib/components/editorial/**` (8 komponen) · `src/app.css` · `src/routes/(public)/**` | **G-P** aturan `Setiap <img> punya alt yang terisi` dan `Nol blur dekoratif; ritme seksi tidak metronomik` (menolak `py-12` berulang >2× dan pola judul `text-2xl … md:text-3xl` berulang >2× di landing) · **G-V** `01-publik-beranda.png` … `09-publik-masuk.png` sebagai bukti visual yang dapat ditinjau manusia |
| **PO-7** | SDLC terdokumentasi, Clean Code, OOP, komentar bermutu, seluruh perubahan terintegrasi | `docs/10-REVISION-SPEC.md` · `docs/11-VISUAL-DIRECTION.md` · `docs/12-BUILD-CONTRACT-V2.md` · `docs/13-SDLC-DELTA.md` · `docs/14-TRACEABILITY.md` · `README.md` · `scripts/verify/**` · seluruh `src/lib/domain/**` | **G-D** §11 `nol impor svelte/dexie/$app/$lib{stores,infrastructure} di src/lib/domain/**` (arah ketergantungan ditegakkan, bukan dipercaya) · **G-C** 0 warning · **G-B** build sukses · Dokumen: `docs/13-SDLC-DELTA.md` (jejak proses) dan berkas ini |

---

## 2. User story US-R01…US-R31

Judul dan penomoran mengikuti `docs/10-REVISION-SPEC.md` §8.

### A. Peran, autentikasi & route guard

| US-R | Judul | Berkas yang mewujudkannya | Gerbang yang membuktikannya |
|---|---|---|---|
| **US-R01** | Masuk dengan email dan kata sandi | `(public)/masuk/+page.svelte` · `domain/services/AuthService.js` · `stores/session.svelte.js` · `infrastructure/repositories/AccountRepository.js` | **G-E** Fase 3 asersi `AWARDEE mendarat di /awardee`, `VERIFIER mendarat di /verifikator`, `ADMIN mendarat di /admin` + `<PERAN> menyimpan sesi`: ketiganya lewat pengisian `#masuk-email` / `#masuk-sandi` dan `form.requestSubmit()`, bukan pintasan store |
| **US-R02** | Tiga peran dengan kewenangan berbeda | `domain/constants/roles.js` · `domain/entities/UserAccount.js` · `infrastructure/seed/accounts.js` | **G-D** `roleLabel VERIFIER = Verifikator`, `homePath ADMIN = /admin`, `akun TERKUNCI kehilangan seluruh kapabilitas` · **G-S** `60 akun berperan AWARDEE`, `≥2 akun berperan VERIFIER …`, `1 akun berperan ADMIN` |
| **US-R03** | Route guard per peran | `domain/policies/AccessPolicy.js` · `components/ZoneGuard.svelte` · `routes/{awardee,verifikator,admin}/+layout.svelte` | **G-D** 16 asersi matriks `canAccess(...)` + `zoneOf("/Admin/?x=1") ternormalkan = ADMIN` + `zoneOf("/adminstrasi") bukan ADMIN` + 5 asersi `safeNext(...)` · **G-E** Fase 2 (3 asersi tamu → `/masuk?next=…`) dan Fase 4 (2 asersi `melihat panel penolakan`, dideteksi lewat atribut `[data-zone-denied]`) |
| **US-R04** | Refactor penamaan member → awardee | `domain/entities/Awardee.js` · `src/routes/awardee/**` (12 route) · seluruh store & komponen | **G-E** 12 route `/awardee/**` hijau; nol route `/member/**` tersisa di daftar uji · **G-B** build sukses (impor menggantung akan menggagalkannya) |
| **US-R05** | Keluar dari sesi | `stores/session.svelte.js` (`logout()`) · `components/Header.svelte` · `components/Sidebar.svelte` (`[data-logout]`) · `components/ZoneGuard.svelte` | **G-D** `safeNext("/masuk") -> beranda` (menutup gelang login sesudah keluar) · **G-E** Fase 3, 18 asersi baru per tiga zona: `tombol keluar hadir di …`, `tombol keluar benar-benar terender, bukan nol piksel`, `label tombol keluar memuat kata "Keluar"`, `menekan tombol keluar menghapus sesi`, `keluar mendarat di zona publik, bukan tersangkut di zona`, `keluar TIDAK menghapus basis data situs`; ditutup Fase 4 `ADMIN dapat masuk kembali tanpa menghapus data situs`. Sejak G5 tidak ada lagi bagian yang bersandar pada pemeriksaan manual: kaitnya atribut `[data-logout]`, bukan bentuk menu yang berbeda tiap zona |
| **US-R06** | Verifikator bukan hakim atas karyanya sendiri | `domain/policies/AccessPolicy.js` (`isSelfReview`) · `domain/services/ContentReviewService.js` · `infrastructure/seed/accounts.js` (dua verifikator) | **G-D** `isSelfReview(id, id) = true`, `isSelfReview("", "") = false`, `pengusul menyetujui kegiatannya sendiri ditolak`, `penolakan konflik kepentingan tidak mengembalikan entity`, `verifikator kedua boleh menyetujui usulan itu` · **G-S** `≥2 akun berperan VERIFIER …` |
| **FR-008–FR-010, FR-080–FR-081** | Profil Awardee, avatar header dan Jejaring, kontak mentoring, visibilitas Jejaring, statistik konten, etalase Womenpreneur, dan consent berversi | `pocketbase/pb_hooks/awardee-profile.pb.js` · `src/routes/awardee/+layout.svelte` · `src/routes/awardee/direktori/+page.svelte` | **G-PROFILE** `npm run verify:profile`: DTO pribadi, aset avatar terlindungi, grant/revoke foto dan kontak, agregat Cerita, allowlist edit, audit, profil privat, consent append-only, etalase, pembatasan SOBI, dan RBAC |

### B. Kalender & kegiatan komunitas

| US-R | Judul | Berkas yang mewujudkannya | Gerbang yang membuktikannya |
|---|---|---|---|
| **US-R07** | Melihat kalender komunitas tanpa login | `(public)/kalender/+page.svelte` · `(public)/_calendar-view-model.js` · `stores/catalog.svelte.js` (`publishedEvents`) | **G-E** Fase 1 baris `/kalender` hijau **sebagai tamu** (3.637 chr, 0 galat) · **G-S** `≥5 di antaranya berstatus TERJADWAL (tampil di /kalender)` |
| **US-R08** | Detail kegiatan publik | `(public)/kalender/[id]/+page.svelte` · `src/lib/utils/ics.js` | **G-E** Fase 1 baris `/kalender/EVT-…` hijau; id-nya diambil dari `buildSeed()` sehingga route dinamis tidak dapat basi diam-diam |
| **US-R09** | Panel daftar event di sisi halaman blog | `components/EventListPanel.svelte` · `(public)/cerita/+page.svelte` | **G-E** Fase 1 baris `/cerita` hijau · **G-P** `Nol kata terlarang pada teks yang dirender` (panel event tidak boleh menyelundupkan poin) |
| **US-R10** | Awardee mengusulkan kegiatan | `routes/awardee/_components/EventProposalForm.svelte` · `awardee/kalender/+page.svelte` · `ContentReviewService.proposeEvent()` | **G-D** `kegiatan DRAFT × AWARDEE -> [DIUSULKAN]` · **G-S** `ada usulan kegiatan yang berasal dari AWARDEE, bukan hanya staf`, `setiap usulan menunjuk pengusul yang punya akun` |
| **US-R11** | Verifikator mengelola antrean kegiatan | `routes/verifikator/kegiatan/+page.svelte` · `verifikator/_components/{DecisionBar,DecisionDialog,QueueRow}.svelte` · `ContentReviewService.{approveEvent,rejectEvent,cancelEvent}` | **G-D** `kegiatan DIUSULKAN × VERIFIER -> [TERJADWAL, DITOLAK]`, `persetujuan menaikkan status ke TERJADWAL`, `menolak kegiatan tanpa catatan ditolak`, `membatalkan kegiatan tanpa alasan ditolak` · **G-S** `≥2 kegiatan berstatus DIUSULKAN (antrean verifikator terisi)` · **G-E** `/verifikator/kegiatan` hijau |
| **US-R12** | Kalender & agenda pada landing | `(public)/+page.svelte` · `components/editorial/MonthCalendar.svelte` | **G-E** Fase 1 baris `/` hijau · **G-V** `01-publik-beranda.png` |

### C. Alur editorial cerita

| US-R | Judul | Berkas yang mewujudkannya | Gerbang yang membuktikannya |
|---|---|---|---|
| **US-R13** | Awardee menulis cerita komunitas | `routes/awardee/cerita/tulis/+page.svelte` · `awardee/_components/RequirementList.svelte` · `ContentReviewService.submitStory()` | **G-D** `DRAFT × AWARDEE -> [DIAJUKAN]`, `DIAJUKAN × AWARDEE -> [] (penulis tidak meninjau dirinya)` · **G-E** `/awardee/cerita/tulis` hijau · **G-V** `12-awardee-tulis-cerita.png` |
| **US-R14** | Awardee memantau status naskahnya | `routes/awardee/cerita/+page.svelte` · `awardee/_components/StoryStatusCard.svelte` | **G-D** `PERLU_REVISI × AWARDEE -> [DIAJUKAN]` · **G-S** enam asersi `ada cerita berstatus <STATUS>` menjamin setiap tahap punya penghuni untuk ditampilkan |
| **US-R15** | Verifikator meninjau naskah | `routes/verifikator/cerita/[id]/+page.svelte` · `verifikator/_components/{SensitivityGate,GatePanel}.svelte` · `verifikator/_components/sensitivity-checklist.js` · `ContentReviewService.{startReview,requestRevision,approveStory}` | **G-D** `menyetujui naskah tanpa checklist sensitivitas ditolak`, `meminta revisi tanpa catatan ditolak`, `Awardee tidak boleh membuka review naskah`, `akun TERKUNCI kehilangan kewenangan memutus` · **G-E** `/verifikator/cerita/STR-…` hijau (6.846 chr) · **G-V** `19-verifikator-naskah-detail.png` |
| **US-R16** | Verifikator menerbitkan cerita ke publik | `ContentReviewService.publishStory()` · `verifikator/_components/decisions.js` | **G-D** `DISETUJUI × VERIFIER -> [TERPUBLIKASI, DIARSIPKAN]`, `menyetujui naskah dengan checklist lolos diterima` · **G-S** `setiap cerita terbit lolos gerbang publikasi` |
| **US-R17** | Story bank yang dapat ditelusuri | `routes/verifikator/cerita/+page.svelte` · `verifikator/_components/queue.js` | **G-E** `/verifikator/cerita` hijau · **G-V** `18-verifikator-antrean-cerita.png` |
| **US-R18** | Blog publik hanya memuat yang terpublikasi | `(public)/cerita/+page.svelte` · `(public)/cerita/[slug]/+page.svelte` · `stores/catalog.svelte.js` | **G-P** `Nol repository dibaca langsung dari zona publik` (halaman publik tidak dapat menyaring sendiri) · **G-E** Fase 1 baris `/cerita/<slug>` hijau: slug diambil dari cerita berstatus `TERPUBLIKASI` di seed |

### D. Kemurnian zona publik & dampak

| US-R | Judul | Berkas yang mewujudkannya | Gerbang yang membuktikannya |
|---|---|---|---|
| **US-R19** | Mencabut mekanik gamifikasi dari zona publik | `AccessPolicy.canSeeScoring()` · `ProgramImpactService.publicSnapshot()` · `scripts/verify/public-purity.mjs` · seluruh `(public)/**` | **G-P** tujuh aturan, 14 berkas route + 23 komponen bersama terjangkau, 0 pelanggaran · **G-D** `canSeeScoring(tamu) = false`, `publicSnapshot() tanpa satu pun kunci berbau poin/tier/peringkat`, `recordedActions adalah CACAH aksi, bukan jumlah poin` |
| **US-R20** | Bagian "Dampak" yang jujur di landing | `domain/services/ProgramImpactService.js` (`IMPACT_FIGURE_CLASS`, `BENCHMARK_RUJUKAN`) · `(public)/metode-pengukuran/+page.svelte` · `components/editorial/ImpactFigure.svelte` | **G-D** `organicReach disajikan sebagai rentang, bukan angka tunggal` · **G-E** Fase 1 baris `/metode-pengukuran` hijau (6.458 chr) · **G-V** `08-publik-metode-pengukuran.png` |
| **US-R21** | Landing memuat empat blok pemilik produk | `(public)/+page.svelte` · `(public)/_view-model.js` | **G-E** Fase 1 baris `/` hijau · **G-P** aturan ritme seksi (D-04/D-10) berlaku khusus pada berkas ini · **G-V** `01-publik-beranda.png` |

### E. Zona ter-login: gamifikasi & pengakuan

| US-R | Judul | Berkas yang mewujudkannya | Gerbang yang membuktikannya |
|---|---|---|---|
| **US-R22** | Dasbor Awardee sebagai rumah gamifikasi | `routes/awardee/+page.svelte` · `stores/{gamification,awardee-dashboard}.svelte.js` · `infrastructure/pocketbase/awardeeDashboard.js` · `components/{PointsChip,TierProgress,TierBadge}.svelte` | `npm run verify:awardee-dashboard` menguji kegiatan, Kabar terkirim, Cerita milik pengguna, profil gamifikasi, empty state Cerita asli, larangan store/repository lokal pada dasbor, dan penghapusan label `DUMMY`; **G-G** tetap menguji pembukuan poin dan kestabilan saldo sesudah muat ulang |
| **Forum PFriends** | Forum persisten lintas Awardee, Verifikator, dan Admin dengan antispam, hard delete, picker seluruh emoji Unicode, serta reply inline | `pocketbase/pb_hooks/forum.pb.js` · `src/lib/stores/forum.svelte.js` · `routes/{awardee,verifikator,admin}/forum/+page.svelte` | `npm run verify:forum` menguji pembatasan komunitas, rate limit, hak hapus, kanal pengumuman, identitas server, idempotensi, reply dan konteks, allowlist reaksi, heartbeat presence, dan SSE |
| **US-R23** | Papan peringkat hanya untuk Awardee | `routes/awardee/papan-peringkat/+page.svelte` · `AccessPolicy.canSeeLeaderboard()` · `domain/services/LeaderboardService.js` | **G-D** `canSeeLeaderboard(AWARDEE) = true`, `canSeeLeaderboard(ADMIN) = false`, `canSeeLeaderboard(tamu) = false` · **G-P** `Nol komponen gamifikasi terimpor` (mis. `LeaderboardRow`) |
| **US-R24** | Verifikator mengesahkan bukti kontribusi | `routes/verifikator/bukti/+page.svelte` · `verifikator/_components/gates.js` · `domain/services/EsgEvidenceService.js` | **G-E** `/verifikator/bukti` hijau (8.431 chr) · **G-V** `21-verifikator-bukti-esg.png` |
| **US-R25** | Papan SLA & beban antrean verifikator | `routes/verifikator/+page.svelte` · `verifikator/_components/SlaBadge.svelte` · `domain/services/_editorial-metrics.js` · `constants/content-workflow.js` (`SLA_HARI_KERJA`) | **G-E** `/verifikator` hijau · **G-V** `17-verifikator-beranda.png` (memperlihatkan tenggat 2/3/5/2 hari kerja yang seluruhnya berasal dari `SLA_HARI_KERJA`) |

### F. Dasbor Admin

| US-R | Judul | Berkas yang mewujudkannya | Gerbang yang membuktikannya |
|---|---|---|---|
| **US-R26** | Dasbor KPI dengan ECharts | `routes/admin/+page.svelte` · `src/lib/charts/**` · `stores/admin.svelte.js` · `pocketbase/pb_hooks/admin-dashboard.pb.js` | **G-C** `verify:compile` · **G-B** `verify:admin-dashboard` memeriksa RBAC, KPI, agregat, keamanan DTO, dan pembacaan berulang · **G-E** `/admin` diverifikasi tanpa label `DUMMY` |
| **US-R27** | Corong pipeline editorial di dasbor Admin | `charts/EditorialPipelineFunnel.svelte` · `ContentReviewService.pipeline()` · `domain/services/_editorial-metrics.js` | **G-E** `/admin/moderasi` hijau · **G-V** `23-admin-moderasi.png` |

### G. Visual & mutu

| US-R | Judul | Berkas yang mewujudkannya | Gerbang yang membuktikannya |
|---|---|---|---|
| **US-R28** | Foto asli berlisensi bebas | `static/img/**` (28 berkas) · `static/img/CREDITS.md` · `components/editorial/PhotoFigure.svelte` · `src/lib/data/photos.js` | **G-P** `Setiap <img> punya alt yang terisi`: foto tanpa alt gagal, sehingga menambah foto tidak dapat menurunkan aksesibilitas · **G-V** seluruh `01-…` sampai `09-publik-masuk.png` |
| **US-R29** | Redesign editorial | `components/editorial/**` (8 komponen) · `src/app.css` · `static/fonts/**` (5 woff2) · seluruh `(public)/**` | **G-P** `Nol blur dekoratif; ritme seksi tidak metronomik` · **G-C** 0 warning · **Pemeriksaan manual:** 375 px tanpa scroll horizontal (`docs/12-BUILD-CONTRACT-V2.md` §6.3 butir 9): belum otomatis karena menuntut emulasi perangkat berulang di seluruh 36 route |
| **US-R30** | Dokumentasi SDLC delta | `docs/13-SDLC-DELTA.md` · `docs/14-TRACEABILITY.md` · `README.md` | Dokumen ini. Konsistensinya dijaga oleh aturan kolom terakhir: setiap nama asersi dapat dicari persis di skrip yang disebut |
| **US-R31** | Mutu kode | seluruh `src/**` · `scripts/verify/**` | **G-D** `nol impor svelte/dexie/$app/$lib{stores,infrastructure} di src/lib/domain/**` dan `pemindai benar-benar membaca lapisan domain` (menjaga pemindainya sendiri tidak berubah menjadi asersi kosong) · **G-C** 112 komponen, 0 gagal, 0 warning · **G-B** build sukses |


### H. Penutupan temuan tinjauan adversarial (gelombang G5)

Empat peninjau memeriksa aplikasi yang **berjalan** dan menemukan cacat yang lolos seluruh gerbang
sebelumnya. Baris di bawah menunjuk asersi yang kini menahannya agar tidak kembali diam-diam.

| Temuan | Berkas yang diperbaiki | Gerbang yang membuktikannya |
|---|---|---|
| Consent yang dicabut tidak menahan persetujuan & penerbitan | `domain/services/ContentReviewService.js` · `domain/entities/Story.js` (`hasActiveConsent` kini menolak rujukan consent kosong) | **G-D** §12, 10 asersi: termasuk `approveStory ditolak ketika consent PENULIS dicabut`, `approveStory ditolak ketika rujukan consent naskah string kosong`, `sebab consent menang atas sebab sensitivitas`, berpasangan dengan kendali `KENDALI: naskah ber-consent aktif dapat disetujui` |
| Rasio SROI rawan salah rantai dan pembagi nol | `domain/services/SroiCalculator.js` · `domain/constants/sroi-model.js` | **G-D** §13: `penyesuaian DIRANTAI, bukan dijumlahkan`, `investasi nol -> rasio 0, bukan Infinity`, `kuantitas negatif ditolak, bukan dibulatkan ke nol` |
| Kuota reward hanya pernah dibaca, tidak pernah berkurang | `domain/entities/Reward.js` (`withRedemptionRecorded`) | **G-D** §14: `penukaran ke-1 menurunkan sisa menjadi 1`, `penukaran ke-3 DITOLAK saat kuota habis`, `bulan berikutnya sisa kuotanya penuh kembali` |
| Kalender dapat kosong tanpa satu gerbang pun berubah warna | `infrastructure/seed/seed-data.js` (agenda bergulir) · `scripts/verify/seed-test.mjs` | **G-S** `kegiatan TERJADWAL terakhir ≥90 hari dari HARI INI`, `acuan uji kalender BUKAN konstanta TODAY yang beku`, `agenda mendatang tersebar pada ≥3 bulan berbeda` |
| Tidak ada jalan keluar dari zona ter-login | `components/Sidebar.svelte` · `components/Header.svelte` (kait `[data-logout]`) | **G-E** Fase 3, 18 asersi lintas tiga zona + Fase 4 `ADMIN dapat masuk kembali tanpa menghapus data situs` |
| Komponen bersama menjadi titik buta kemurnian publik | `components/Timeline.svelte` (lepas dari `PointsChip`; pesan kosong dibuat netral zona) · `scripts/verify/public-purity.mjs` | **G-P** 23 komponen bersama ikut dipindai; `Nol komponen gamifikasi terimpor: route publik DAN komponen bersama` |
| Kutipan tarik terpotong tepi kiri pada 1024–1280 px | `components/editorial/PullQuote.svelte` (tarikan dibatasi `min()` terhadap talang yang benar-benar ada) | **Pengukuran G5:** `getBoundingClientRect()` pada 1024/1100/1280/1440/1920: tepi kiri `<figure>` tidak pernah negatif. Belum menjadi asersi otomatis; lihat §3 |
| Peringatan `alt` PhotoFigure menyala pada blok tipografis yang sah | `components/editorial/PhotoFigure.svelte` | **G-E** seluruh `/cerita/…` hijau tanpa galat konsol (sebelumnya 1 route bermasalah) |
---

## 3. Cakupan gerbang: apa yang TIDAK tertutup otomatis

Ditulis eksplisit supaya tidak ada yang menyimpulkan "hijau" berarti "sempurna".

| Hal | Status | Alasan |
|---|---|---|
| Keluar dari sesi lewat menu profil (US-R05) | **otomatis sejak G5** | Kaitnya kini atribut `[data-logout]`, bukan bentuk menu. G-E Fase 3 menguji kehadiran, keterlihatan, label berkata "Keluar", penghapusan sesi, pendaratan di zona publik, dan keutuhan basis data: di ketiga zona |
| Geometri terender di luar dua pengukuran G5 | manual | Tepi kiri kutipan tarik dan tabrakan angka seksi × kapsi diukur di gelombang G5 pada 1024/1280/1440/1920, tetapi belum dijadikan skrip: menuntut peramban berjalan DAN daftar elemen yang harus diukur per halaman. Yang sudah otomatis hanyalah kompilasi dan galat konsol |
| Lebar 375 px tanpa scroll horizontal | manual | Menuntut emulasi perangkat berulang di 36 route; biayanya melebihi manfaatnya untuk mockup |
| Audit WCAG menyeluruh | manual | `verify:compile` hanya menahan warning a11y compiler pada nol: itu bukan audit |
| Mutu tulisan Bahasa Indonesia di seluruh UI | manual | Tidak dapat diasersikan; diperiksa saat tinjauan |
| Keamanan autentikasi | **tidak berlaku** | Autentikasi bersifat tiruan dan tidak pernah diklaim aman: lihat `docs/13-SDLC-DELTA.md` §6 dan peringatan di `src/lib/domain/value-objects/PasswordHash.js` |
| Uji beban / penetration test | **tidak berlaku** | Tidak ada backend untuk dibebani atau ditembus |

---

## 4. Cara memverifikasi ulang dokumen ini

```bash
npm run verify                       # G-C, G-D, G-S, G-P, G-B
npm run dev -- --port 5177 &         # server dev untuk gerbang peramban
npm run verify:e2e                   # G-E
npm run verify:gamification          # G-G
npm run screenshot                   # G-V
```

Untuk memeriksa satu baris matriks: salin nama asersinya, lalu

```bash
grep -n "<nama asersi>" scripts/verify/*.mjs          # nama yang ditulis literal di skrip
npm run verify:e2e | grep "<nama asersi>"             # nama yang dirakit saat berjalan
npm run verify:gamification | grep "<nama asersi>"
```

Perintah kedua dan ketiga dibutuhkan karena tujuh nama pada matriks ini dibentuk dari template :
`AWARDEE mendarat di /awardee`, `VERIFIER mendarat di /verifikator`, `ADMIN mendarat di /admin`,
`tamu di /admin dialihkan ke /masuk?next=/admin`, `ADMIN di /awardee/aksi melihat panel penolakan`,
`SANDI_DEMO cocok untuk seluruh 63 akun`, dan `putaran 1: poin di layar BUKAN nol`. Mencarinya di
berkas skrip akan nihil meskipun asersinya benar-benar berjalan.

Bila nama itu tidak muncul di berkas skrip **maupun** di keluaran gerbangnya, baris itu **melanggar
aturan dokumen ini** dan harus diperbaiki: bukan dibiarkan sebagai janji.
