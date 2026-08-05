# 10 — REVISION SPEC (Spesifikasi Revisi) — Pfriends

> **Status:** Fase Requirement & Design SDLC · **Tanggal:** 22 Juli 2026
> **Kedudukan:** Dokumen ini adalah **Amandemen A-01** terhadap `docs/09-BUILD-CONTRACT.md`.
> Bila dokumen ini bertentangan dengan `00-SOURCE-BRIEF.md`, **sumber yang menang** (angka kanonik).
> Aturan `09` §2 (angka poin/tier hanya dari `src/lib/domain/constants/`) **tidak diubah dan tetap berlaku penuh.**
>
> ## ⚠ KOREKSI WAJIB DIBACA SEBELUM APA PUN
>
> **`docs/12-BUILD-CONTRACT-V2.md` MENGGANTIKAN dokumen ini** pada setiap titik yang bertentangan.
> Urutan kemenangan: `00-SOURCE-BRIEF` → **`12-BUILD-CONTRACT-V2`** → `11-VISUAL-DIRECTION` →
> **dokumen ini** → `09-BUILD-CONTRACT` → 01–08.
>
> Dokumen ini tetap normatif untuk **kebutuhan, alur kerja, matriks kewenangan C-01…C-51 & X-01…X-13,
> klasifikasi angka publik, dan daftar route** — **bukan** untuk:
> 1. **Kepemilikan berkas.** §11.1 (`WP-A…WP-K`) **DICABUT**; yang berlaku `12` §1.2 & §3 (`WP-01…WP-09`).
> 2. **Nama modul & signature export.** §3.6, §5.9, dan §11.2 **DIGANTI** oleh `12` §2:
>    `RouteAccessPolicy`→`AccessPolicy` · `Role`/`ROLE_META`→`UserRole`/`USER_ROLE_META` ·
>    `AuthenticationService`→`AuthService` · `ContentTransitionPolicy.allowedTransitions`→
>    `allowedStoryTransitions`/`allowedEventTransitions` · `snapshotAt`→`capturedAt` ·
>    `session.hydrated` **tidak ada** · urutan argumen `ContentReviewService` = `(entity, actor, …)`.
> 3. **Model status kegiatan.** §5.4/§5.8 (dua sumbu, `EventReviewStatus`, `reviewStatus`,
>    `createdById`/`createdByRole`) **DICABUT**; yang berlaku satu sumbu `EventStatus` + `DIUSULKAN`/
>    `DITOLAK` dan `proposedBy`/`proposedByRole` (`12` §2.2).
> 4. **C-10/C-11 (Verifikator menulis cerita).** **DICABUT** — kepengarangan cerita hanya Awardee
>    (`12` §2.1). Konflik kepentingan berpindah ke jalur kegiatan, dan **E-04 ikut dicabut**.
> 5. **Manifes & anggaran foto §9.2/§9.3.** **DIGANTI** oleh `docs/11` §5 (28 berkas, tanpa avatar).
>
> Daftar amandemen lengkap beserta alasannya: `12-BUILD-CONTRACT-V2.md` §8.1.

---

## 1. Ringkasan Revisi & Latar

### 1.1 Mengapa revisi ini ada

Mockup Pfriends versi pertama sudah selesai: 26 halaman, 25 file domain (7.788 baris), 6 store, 33 komponen bersama, 6 chart, seed deterministik 60 anggota. Struktur domainnya sehat — diverifikasi tidak ada satu pun impor Svelte/Dexie/`$app/*` di seluruh `src/lib/domain/`. Yang bermasalah bukan fondasinya, melainkan **apa yang dipajang ke publik**, **siapa yang boleh memutuskan apa**, dan **bagaimana halaman itu terlihat**.

### 1.2 Keputusan Pemilik Produk (final — dirancang untuk dipenuhi, bukan digugat)

| # | Keputusan | Kutipan |
|---|---|---|
| **PO-1** | Landing publik memuat empat blok | "(a) dampak & angka **AGREGAT level program** (anggota terdata, jangkauan organik, chapter aktif, jumlah aksi/gerakan), (b) blog/cerita komunitas yang sudah published, (c) kalender komunitas + daftar event, (d) gerakan bersama + profil dua komunitas (SOBI & Womenpreneur)." |
| **PO-2** | Larangan mutlak gamifikasi di publik | "PERHITUNGAN POIN, TABEL SKOR, TIER, LEADERBOARD, BADGE **DILARANG** tampil di zona publik. Semua pindah ke area ter-login peran Awardee. Admin melihat agregatnya di dashboard." |
| **PO-3** | Tiga peran + refactor penuh | "Tiga peran: AWARDEE, VERIFIKATOR, ADMIN. Refactor penuh: rename member -> awardee, route /awardee /verifikator /admin, login email+password (mock) menggantikan pemilih peran demo, lengkap dengan route guard per peran." |
| **PO-4** | Alur editorial | "Awardee menulis (blog/cerita & event) -> Verifikator meninjau -> baru publish ke publik. Event pada kalender komunitas boleh digalakkan oleh Awardee maupun Verifikator. Di sebelah navbar/halaman blog ADA panel daftar event." |
| **PO-5** | Dashboard admin | "Dashboard statistik di halaman ADMIN memakai Apache ECharts (echarts sudah terpasang di package.json)." |
| **PO-6** | Kritik atasan | "**webnya terlalu AI**. Perbaikan: foto asli (lisensi bebas, diunduh ke `static/img/`) + redesign editorial (grid asimetris, tipografi berkarakter, kurangi kartu seragam & gradient blur)." |
| **PO-7** | Mutu rekayasa | "SDLC terdokumentasi, Clean Code, OOP, komentar/JSDoc bermutu, penamaan konsisten (identifier Inggris, teks UI Indonesia), semua perubahan **TERINTEGRASI** dengan sistem yang ada (bukan halaman tempelan)." |

### 1.3 Sepuluh celah yang ditutup revisi ini

| ID | Celah | Bukti kondisi sekarang (`path:baris`) |
|---|---|---|
| **G-01** | Kalender komunitas hanya ada di zona ter-login; pilar 02 Hal 5 tidak terlihat publik | Hanya `src/routes/member/kalender/+page.svelte`; publik cuma cuplikan kartu di `src/routes/(public)/komunitas/+page.svelte` |
| **G-02** | Tidak ada panel daftar event di sisi halaman blog | `src/routes/(public)/cerita/+page.svelte` murni grid, tanpa `<aside>` |
| **G-03** | Zona publik memajang mekanik gamifikasi di 32 lokasi | `(public)/+page.svelte:28-29,39,80-82,337,343,405-406`; `komunitas:17,86,260`; `gerakan:21,130`; `cerita/[slug]:25,151,156`; `masuk:25,55,192,194`; `_view-model.js:109` |
| **G-04** | Hanya dua peran; `/masuk` adalah pemilih peran demo tanpa kata sandi | `src/lib/stores/session.svelte.js:49` `SessionRole = {MEMBER, ADMIN}`; `Member.js:26-28` menyatakan verifikator "tidak diwujudkan sebagai akun terpisah" |
| **G-05** | Rantai editorial putus di langkah terakhir — tidak ada transisi ke publikasi | `src/lib/stores/admin.svelte.js:164` berhenti di `STORY_STATUS.DISETUJUI`; `TERPUBLIKASI` hanya lahir dari `seed-data.js` |
| **G-06** | Kegiatan tidak punya pengusul maupun status peninjauan | `CommunityEvent.js:61-66` hanya `TERJADWAL/BERLANGSUNG/SELESAI/DIBATALKAN`; typedef `:96-114` tanpa satu pun field aktor |
| **G-07** | Angka dampak Hal 6 belum tampil publik, dan belum ada pembeda terhitung vs estimasi vs benchmark | `REACH_PARAMETERS` ada di `kpi-targets.js:169` tetapi tak dipakai zona publik |
| **G-08** | Dasbor admin hanya 2 chart, 2 chart menganggur | `admin/+page.svelte:237,284`; `CommunityPieChart.svelte` & `KpiGaugeChart.svelte` tidak dipakai di mana pun |
| **G-09** | Tidak ada `static/`; seluruh visual gradien & ikon SVG | `ls static` → *No such file or directory* (diverifikasi). `(public)/+page.svelte:106-113` blob `blur-3xl`; `src/app.css:129-132` aura radial |
| **G-10** | Penamaan `member` melekat di ±30 file / ±110 lokasi | `memberId` di 28 file; `entities/Member.js` diimpor 14 file; route `/member/**`; `loginAsMember()` |

### 1.4 Diagnosis "terlalu AI" — 14 ciri, diringkas

Kritik atasan bukan soal selera. Ia dapat dipetakan ke ciri konkret yang terbaca sebagai keluaran generator:

| Kelompok | Ciri | Bukti |
|---|---|---|
| **Dekorasi generik** | Blob gradien blur di sudut hero; aura radial di `body` | `(public)/+page.svelte:106-113`; `src/app.css:129-132` |
| **Bentuk SaaS** | Kolom kanan hero adalah *pricing table* (25/50/100/150 + manfaat) | `(public)/+page.svelte:154-182` |
| **Keseragaman** | Empat kepala seksi berpola identik; empat judul pada `text-2xl font-bold md:text-3xl` yang sama | `+page.svelte:227-234, 299-306, 386-392, 432-439` |
| **Kartu tanpa hierarki** | Tidak ada satu pun objek publik yang lebih besar/berat dari yang lain; 12 kartu cerita identik | `Card.svelte:28-34`, `StatTile.svelte:52`, `StoryCard.svelte:40-43` |
| **Ikon-di-kotak-tint** | Wadah `h-10/11 w-10/11 rounded-xl` + tint, muncul 20+ kali | `+page:242-250, 313-317`; `tentang:260-264`; `komunitas:115-120, 210-214` |
| **Nol foto manusia** | Program tentang 52 orang nyata, tanpa satu wajah pun | `static/` tidak ada; avatar semuanya inisial dua huruf |
| **Placeholder naik produksi** | Fallback gradien `StoryCard` dipakai oleh **seluruh** 12 cerita | `StoryCard.svelte:53-61` |
| **Tipografi datar** | `--font-sans` dan `--font-display` berisi stack **yang sama persis**; body publik 14px | `src/app.css:102-103` |
| **Spacing metronomik** | `py-10 → py-12 → py-14 → py-12 → py-12 → py-14`; `tentang` memakai `mt-12` di setiap batas seksi | `+page.svelte:188,225,297,383,429,471` |
| **Grid selalu simetris** | Tidak ada `col-span-2`, tidak ada bleed; satu-satunya asimetri `1.15fr/0.85fr` terlalu kecil untuk terlihat | `+page.svelte:190,237,309,397,450` vs `:328` |
| **Angka tanpa penyebut** | "52" dan "4" pada ukuran sama, tanpa denominator maupun tanggal potret | `+page.svelte:191-219` |
| **Tic bahasa** | Antitesis "X, bukan Y" muncul **8×** di zona publik | `+page:301,351`; `tentang:64,252,343`; `komunitas:184`; `gerakan:75,146` |
| **Penutup berulang** | Empat halaman berakhir dengan `Card variant="highlight"` yang identik | `tentang:349`, `komunitas:287`, `cerita:154`, `gerakan:155` |
| **Kebocoran skor** | Dua dari lima layar gulir beranda adalah mekanik poin | `+page.svelte:296-425` |

**Arah perbaikan (dirinci di §4.5 dan §9):** foto asli berkapsi di `static/img/`, grid asimetris, kontras tipografi display vs teks, dan pencabutan seluruh dekorasi blur. Token warna & radius tetap dari `src/app.css` — **redesign mengubah komposisi, bukan sistem desain.**

### 1.5 Prinsip yang mengikat seluruh revisi

| # | Prinsip | Konsekuensi teknis |
|---|---|---|
| P-1 | **Angka kanonik satu sumber** | Poin & ambang tier hanya dari `src/lib/domain/constants/`. Tidak ada literal di komponen, store, chart, atau seed. (`09` §2 — tidak diubah) |
| P-2 | **Domain murni** | `src/lib/domain/**` dilarang mengimpor Svelte, Dexie, atau `$app/*`. Diverifikasi bersih hari ini; wajib tetap bersih. |
| P-3 | **Arah ketergantungan** | Presentation → Application → Domain ← Infrastructure. Store adalah *composition root*; service menerima repository lewat konstruktor **tanpa nilai bawaan**. |
| P-4 | **Bahasa** | Identifier kode Inggris; seluruh teks UI Bahasa Indonesia. (`09` §1 K-5) |
| P-5 | **Terintegrasi, bukan tempelan** | Fitur baru wajib memakai komponen/store yang sudah ada. Satu `EventListPanel` dipakai empat zona; dilarang membuat komponen kembar. |
| P-6 | **Keputusan di domain, bukan di UI** | Transisi status dan hak akses ditegakkan di policy domain. Tombol yang disembunyikan CSS tetap dapat dipanggil. |
| P-7 | **Determinisme demo** | Dilarang `Math.random()` / `Date.now()` saat runtime. Seed memakai `mulberry32` seed `20260529` (`seed/rng.js:24`), acuan `TODAY = 2026-07-20` (`seed-data.js:77`). |
| P-8 | **Angka publik jujur** | Setiap angka di zona publik wajib berlabel kelasnya (terhitung / estimasi / benchmark) dan berpenyebut. Lihat §4.3. |

### 1.6 Catatan akurasi terhadap dokumen lama

| Temuan | Rincian |
|---|---|
| `09-BUILD-CONTRACT.md` §3 berjudul "Route final (25)" | Tabelnya sebenarnya mengenumerasi **26** route (8 publik + 11 member + 7 admin). Diverifikasi dengan `find src/routes -name "*.svelte"`. Amandemen A-01 memperbaiki hitungannya sekaligus menggantinya (§3). |
| `seed-data.js:574` | JSDoc menulis "Dua belas agenda" padahal `NASKAH_KEGIATAN` berisi **13** entri. Perbaiki saat menyentuh blok itu (WP-R3). |
| `src/app.html:5-6` | Merujuk `%sveltekit.assets%/favicon.svg` yang tidak pernah ada → 404 tiap muat halaman. `app.html` termasuk file "jangan diubah" (`09` §4), jadi solusinya **menyediakan `static/favicon.svg`**, bukan mengubah rujukannya. |
| `src/lib/infrastructure/db.js:93-102` | `pending = null` hanya dieksekusi pada jalur sukses (`:98`). Bila pembukaan DB gagal, setiap `getDb()` berikutnya mengembalikan promise ditolak yang sama selamanya. Perlu `finally { pending = null }` (WP-R3). |

---

## 2. Matriks RBAC — Peran × Kapabilitas

### 2.1 Definisi peran

| Peran | Kode (`domain/constants/roles.js`) | Definisi | Beranda |
|---|---|---|---|
| **Publik / Tamu** | `null` | Pengunjung tanpa sesi. Calon anggota, manajemen, mitra, wartawan. | `/` |
| **Awardee** | `Role.AWARDEE` | Penerima manfaat PF: alumni Beasiswa Sobat Bumi (SOBI) atau UMKM binaan PFpreneur (Womenpreneur). Penulis, pengaju, pemilik consent atas datanya sendiri. | `/awardee` |
| **Verifikator** | `Role.VERIFIER` | Petugas kendali mutu & kepatuhan konten. Memutuskan **apa yang boleh keluar** dari komunitas ke ruang publik, dan **kontribusi mana yang sah dihitung**. Bekerja pada tingkat *record*. Konsolidasi dari lima aktor `docs/04` §3.1 (Chapter Lead, PF Reviewer, Data Steward, ESG Analyst, PF Publisher). | `/verifikator` |
| **Admin** | `Role.ADMIN` | Pengelola program Corsec. Memegang parameter, agregat, keanggotaan, diseminasi, consent/PII, ekspor, dan jalur banding. Bukan penerima manfaat. Konsolidasi dari Auditor + Admin Komunitas `docs/04` §3.1. | `/admin` |

**Peran BUKAN hierarki.** `ADMIN` tidak "termasuk" `VERIFIER`. Setiap kewenangan didaftarkan eksplisit agar dapat diaudit satu per satu. Konsekuensinya sengaja: Admin **tidak** menyetujui cerita, dan Verifikator **tidak** melihat KPI program.

### 2.2 Legenda

| Simbol | Arti |
|---|---|
| **✓** | Boleh penuh |
| **◐** | Boleh bersyarat — syarat disebut di kolom Catatan |
| **✗** | Tidak boleh; ditegakkan di lapisan policy domain, bukan disembunyikan di UI |
| **—** | Tidak berlaku bagi peran itu |

### 2.3 Matriks kapabilitas (46 baris)

#### A. Konsumsi konten publik

| # | Kapabilitas | Publik | Awardee | Verifikator | Admin | Catatan |
|---|---|:--:|:--:|:--:|:--:|---|
| C-01 | Lihat blog/cerita berstatus `TERPUBLIKASI` | ✓ | ✓ | ✓ | ✓ | Penyaring tunggal `ceritaTampilPublik()` (`community.js:478`). Tidak ada penyaring kedua di komponen. |
| C-02 | Lihat detail cerita publik `/cerita/[slug]` | ✓ | ✓ | ✓ | ✓ | Byline mengikuti preferensi consent penulis. **Tanpa** tier/poin penulis (cabut `cerita/[slug]:151,156`). |
| C-03 | Lihat kalender komunitas publik | ✓ | ✓ | ✓ | ✓ | Hanya kegiatan `reviewStatus = DITERBITKAN` **dan** `status ≠ DIBATALKAN` (§6.4). |
| C-04 | Lihat detail kegiatan publik + unduh `.ics` | ✓ | ✓ | ✓ | ✓ | Tanpa daftar pendaftar/peserta, tanpa kuota tersisa, tanpa kode kehadiran. |
| C-05 | Lihat gerakan bersama + progres partisipasi | ✓ | ✓ | ✓ | ✓ | Progres = cacah peserta terhadap target. **Tanpa** poin (cabut `gerakan:128-131`). |
| C-06 | Lihat profil dua komunitas (SOBI & Womenpreneur) | ✓ | ✓ | ✓ | ✓ | Narasi dari `COMMUNITIES` (`community.js:47`), bukan teks yang dikarang di komponen. |
| C-07 | Lihat angka dampak **agregat level program** | ✓ | ✓ | ✓ | ✓ | Sumber tunggal `ProgramImpactService.publicSnapshot()` — struktur kembaliannya tanpa field poin/tier (§4.4). |
| C-08 | Lihat halaman metode pengukuran | ✓ | ✓ | ✓ | ✓ | Prasyarat menampilkan angka kelas B & C (§4.3). |
| C-09 | Mendaftar jadi anggota (`/daftar`) | ✓ | — | — | — | Wizard 3 langkah + consent. Peran ter-login diarahkan ke berandanya. |

#### B. Alur editorial cerita

| # | Kapabilitas | Publik | Awardee | Verifikator | Admin | Catatan |
|---|---|:--:|:--:|:--:|:--:|---|
| C-10 | Tulis & simpan draf cerita | ✗ | ✓ | **✗** | ✗ | **DIKOREKSI** (`12` §2.1): kepengarangan cerita hanya Awardee. `Story.authorId` menunjuk `Awardee`, sedangkan `UserAccount.awardeeId` **wajib `null`** untuk VERIFIER — verifikator tidak punya identitas kepengarangan yang sah, dan C-19 tidak akan pernah dapat menyala. |
| C-11 | Ajukan cerita untuk ditinjau (`DRAFT → DIAJUKAN`) | ✗ | ✓ | **✗** | ✗ | Gerbang `Story.isSubmittable` (`Story.js:446`) = ≥300 kata **&&** ada media **&&** ada tag ESG. Aktor: AWARDEE saja. |
| C-12 | Sunting isi naskah milik orang lain | ✗ | ✗ | ✗ | ✗ | Kepengarangan tetap pada penulis. Verifikator **meminta revisi**, tidak menulis ulang. |
| C-13 | Ambil naskah untuk ditinjau (`DIAJUKAN → REVIEW`) | ✗ | ✗ | ✓ | ✗ | Mengunci `reviewerId` + `reviewedAt`; antrean FIFO (tertua dulu). |
| C-14 | Setujui cerita (`REVIEW → DISETUJUI`) | ✗ | ✗ | ◐ | ✗ | ◐ = wajib checklist data sensitif dinyatakan lolos **eksplisit**, bukan sekadar tiadanya tanda bahaya. Mengisi `pfValidation`. |
| C-15 | Minta revisi (`REVIEW → PERLU_REVISI`) | ✗ | ✗ | ◐ | ✗ | ◐ = catatan revisi terstruktur **wajib** terisi (field mana, kenapa). |
| C-16 | **Terbitkan cerita** (`DISETUJUI → TERPUBLIKASI`) | ✗ | ✗ | ◐ | ✗ | ◐ = `Story.isPublishable` (`Story.js:432`) diperiksa **ulang pada detik penerbitan**, bukan mengandalkan hasil saat persetujuan. **Transisi ini hari ini belum ada di kode aplikasi mana pun.** |
| C-17 | Tarik cerita terbit / takedown (`TERPUBLIKASI → DIARSIPKAN`) | ✗ | ✗ | ◐ | ◐ | Keduanya boleh, alasan arsip wajib dipilih dari `STORY_ARCHIVE_REASON` (`community.js:236`). Verifikator: temuan konten. Admin: jalur banding & permintaan hukum. |
| C-18 | Tandai temuan data sensitif (`sensitivityScan = FLAGGED`) | ✗ | ✗ | ✓ | ✓ | Temuan melekat pada cerita, bukan hanya di catatan — supaya tidak lolos pada peninjauan berikutnya. |
| C-19 | **Meninjau/menerbitkan cerita tulisan sendiri** | ✗ | ✗ | **✗** | **✗** | Larangan mutlak. Ditegakkan `AccessPolicy` di domain (`story.authorId === actor.awardeeId` → blokir), bukan tombol yang disembunyikan. Percobaan tercatat `policy.overridden_attempt`. |
| C-20 | Telusuri story bank **semua status** + ekspor ringkasan | ✗ | ✗ | ✗ | ✓ | Hal 9 *story bank*. Admin membaca & mengekspor; **tidak** menyetujui/menerbitkan (C-14/C-16 = ✗). |
| C-21 | Pantau status naskah sendiri + baca catatan revisi | ✗ | ✓ | ✓ | — | Kartu naskah menampilkan status + siapa yang sedang memegang bola; **tanpa** poin/tier/peringkat. |

#### C. Kalender & kegiatan

| # | Kapabilitas | Publik | Awardee | Verifikator | Admin | Catatan |
|---|---|:--:|:--:|:--:|:--:|---|
| C-22 | Usulkan kegiatan (`DRAFT → DIAJUKAN`) | ✗ | ✓ | ✓ | ✗ | PO-4: "boleh digalakkan oleh Awardee maupun Verifikator". |
| C-23 | Terbitkan kegiatan **buatan sendiri** langsung | ✗ | ✗ | ◐ | ✗ | ◐ = hanya bila `createdByRole = VERIFIER`; tercatat swa-terbit di jejak audit. Asimetri terhadap C-19 dijelaskan §5.5. |
| C-24 | Setujui & terbitkan kegiatan usulan Awardee | ✗ | ✗ | ◐ | ✗ | ◐ = jadwal, lokasi/kanal, dan chapter wajib terisi; `endsAt > startsAt`. |
| C-25 | Tolak kegiatan (`DIAJUKAN → DITOLAK`) | ✗ | ✗ | ◐ | ✗ | ◐ = `reviewNote` wajib terisi. |
| C-26 | Batalkan kegiatan terbit (`status → DIBATALKAN`) | ✗ | ✗ | ✓ | ✓ | Sumbu eksekusi, terpisah dari sumbu publikasi (§5.4). |
| C-27 | Klaim kehadiran via kode kegiatan | ✗ | ✓ | ✗ | ✗ | Kode kehadiran **haram** tampil publik — mencegah klaim palsu (`docs/03` §5.2). |
| C-28 | Lihat daftar pendaftar & peserta kegiatan | ✗ | ◐ | ✓ | ✓ | ◐ = Awardee hanya melihat cacah, bukan nama. `registeredAwardeeIds`/`attendeeAwardeeIds` adalah data pribadi (`docs/04` §4.3). |

#### D. Poin, tier & gamifikasi

| # | Kapabilitas | Publik | Awardee | Verifikator | Admin | Catatan |
|---|---|:--:|:--:|:--:|:--:|---|
| C-29 | **Lihat poin & tier sendiri** | **✗** | ✓ | — | — | PO-2. Rumahnya `/awardee`. Verifikator & Admin bukan penerima manfaat, jadi tidak punya poin sama sekali (§2.4 argumen `UserAccount`). |
| C-30 | Lihat riwayat buku besar poin sendiri | ✗ | ✓ | — | — | `/awardee/aksi` tab riwayat. Sumber `ActivityRepository.ledgerFor`. |
| C-31 | **Lihat papan peringkat per orang** | **✗** | ✓ | ✗ | ✗ | PO-2. Admin hanya melihat **distribusi tier agregat** (C-33), bukan peringkat bernama. |
| C-32 | **Lihat tabel skor 9 aksi & ambang tier** | **✗** | ✓ | ✗ | ✓ | PO-2. Awardee di `/awardee/aksi`; Admin **read-only** di `/admin/gamifikasi`. Verifikator sengaja tidak — larangan X-03 (§2.5). |
| C-33 | Lihat distribusi tier **agregat** | ✗ | ✗ | ✗ | ✓ | Chart C-11 (§7.2). Agregat, tanpa nama. |
| C-34 | Lihat lencana (badge) terkumpul | ✗ | ✓ | — | — | `/awardee/penghargaan`. PO-2 mencabutnya dari publik. |
| C-35 | Sahkan bukti kontribusi (`UNDER_REVIEW → VERIFIED → AWARDED`) | ✗ | ✗ | ✓ | ✗ | Poin berubah `pending → settled`. SLA per kelas aksi (§5.6). |
| C-36 | Tolak bukti kontribusi | ✗ | ✗ | ◐ | ✗ | ◐ = alasan tertulis wajib; Awardee berhak **banding satu kali** (`docs/03` §5.6). |
| C-37 | **Ubah poin manual / bonus / clawback** | ✗ | ✗ | **✗** | ◐ | ◐ = hanya lewat mekanisme clawback tercatat; sanksi tingkat ≥3 wajib peninjauan dua orang (`docs/03` §5.9). |
| C-38 | Tukar koin dengan reward | ✗ | ✓ | — | — | Gerbang `Reward.canBeRedeemedBy` (`Reward.js:245`) = tier minimum + saldo koin. |
| C-39 | Kelola katalog reward & badge | ✗ | ✗ | ✗ | ✓ | Bukan domain konten — larangan X-10. |

#### E. Program, diseminasi & governance

| # | Kapabilitas | Publik | Awardee | Verifikator | Admin | Catatan |
|---|---|:--:|:--:|:--:|:--:|---|
| C-40 | **Lihat dashboard KPI agregat** & tren program | ✗ | ✗ | **✗** | ✓ | Larangan X-02. Verifikator dinilai pada **mutu keputusan**, bukan capaian angka. Memberinya target agregat menciptakan tekanan meloloskan naskah lemah demi menaikkan KPI. |
| C-41 | Kelola anggota / validasi keanggotaan (`MENUNGGU_VERIFIKASI → AKTIF`) | ✗ | ✗ | ✗ | ✓ | Larangan X-05. Keanggotaan menentukan penyebut KPI M-01 — keputusan program, bukan keputusan konten. |
| C-42 | Nonaktifkan / tangguhkan / hapus akun Awardee | ✗ | ✗ | ✗ | ✓ | Larangan X-06. Sanksi tingkat 4–5 (`docs/03` §5.9). |
| C-43 | Susun & kirim broadcast (diseminasi) | ✗ | ✗ | ✗ | ✓ | Larangan X-07. Pilar 04 adalah kewenangan penerbit program. |
| C-44 | Baca kabar & lakukan amplifikasi berbukti | ✗ | ✓ | ✗ | ✗ | Sumber poin `BROADCAST_VIEW`/`CTA_REACT`/`SHARE_PRIVATE`/`SHARE_PUBLIC`. |
| C-45 | Lihat **status** consent penulis (aktif/dicabut/kedaluwarsa) | ✗ | ◐ | ✓ | ✓ | ◐ = Awardee hanya consent miliknya sendiri. `docs/04` §5.4: reviewer melihat status, bukan isi. |
| C-46 | Lihat **isi** consent record & log akses PII | ✗ | ◐ | **✗** | ✓ | Larangan X-09. ◐ = Awardee atas dirinya sendiri. Admin memegang peran DPO/Auditor pasca konsolidasi (butir konfirmasi K-09, §11.4). |
| C-47 | Ekspor laporan / data anggota / bahan SROI | ✗ | ✗ | **✗** | ✓ | Larangan X-08. `docs/04` §5.4: reviewer tidak punya hak ekspor. |
| C-48 | Lihat jejak audit keputusan | ✗ | ◐ | ◐ | ✓ | ◐ = Awardee melihat jejak atas kontennya sendiri; Verifikator melihat riwayat peninjauan naskah yang ia tangani. |
| C-49 | Ubah keputusan final verifikator lain | ✗ | ✗ | **✗** | ◐ | Larangan X-13. ◐ = Admin hanya lewat jalur banding tercatat, bukan pembatalan diam-diam. |
| C-50 | **Override gerbang publikasi yang gagal** | ✗ | ✗ | **✗** | **✗** | Larangan X-11. `docs/04` §3.4: *"Sistem tidak menyediakan tombol override."* Tidak seorang pun. |
| C-51 | Lihat papan SLA & beban antrean sendiri | ✗ | ✗ | ✓ | ✓ | Verifikator melihat beban & ketepatan waktu — **bukan** KPI program (X-02 tetap berlaku). |
| C-52 | Muat ulang / reset data demo | ✗ | ✗ | ✗ | ✓ | `resetDatabase()` (`seed/bootstrap.js:145`). Jalan keluar satu klik bila IndexedDB pengguna telanjur aneh. |

### 2.4 Mengapa `UserAccount` terpisah dari `Awardee` (bukan menambah `role` di `Member`)

Keputusan arsitektur ini menentukan benar-tidaknya tiga perhitungan. Argumennya korektness, bukan estetika.

| # | Argumen | Bukti |
|---|---|---|
| 1 | **Invarian `Member` mustahil dipenuhi akun staf.** `community` & `chapterId` wajib string tidak kosong dan divalidasi ke `COMMUNITIES`/`CHAPTERS`; `joinedAt` wajib tanggal. Verifikator/Admin tidak punya komunitas, chapter, maupun tanggal bergabung sebagai penerima manfaat. | `Member.js:137-141`, `:149-150`, `:196` |
| 2 | **Kode sudah "memilih" pemisahan itu diam-diam.** `PROFIL_ADMIN` dibuat sebagai objek polos di luar basis data, dengan komentar *"admin adalah pengelola program, bukan penerima manfaat"*. Itu `UserAccount` yang belum diberi nama. | `session.svelte.js:61-76` |
| 3 | **Tiga perhitungan langsung salah bila verifikator jadi baris `Member`:** (a) `KpiCalculator.#coverage` memakai `members.length` sebagai penyebut M-01 → akun staf mengembungkan cakupan 75%; (b) `LeaderboardService.#visibleMembers` menyaring hanya lewat `visibleOnLeaderboard` → verifikator berstatus AKTIF muncul di papan; (c) `TierResolver.distribution` menghitung staf sebagai NEWCOMER → distribusi tier di dasbor admin bias. | `KpiCalculator.js:185-194`; `LeaderboardService.js:205-208`; `TierResolver.js:126-140` |
| 4 | **Menambal dengan filter `role !== 'VERIFIER'` menyebarkan pengetahuan peran ke tiga tempat berbeda** — persis yang dilarang oleh alasan keberadaan `MEMBER_STATUS_META`. | `community.js:245-247` |
| 5 | **Biaya pemindahan nyaris nol.** `MemberRole` diverifikasi **tidak pernah diimpor file lain**: seluruh 6 referensinya ada di dalam `Member.js` sendiri (baris 32, 58, 116, 145, 237, 367). | `grep -rn "MemberRole" src/ scripts/` |

**Relasi final:** `UserAccount 1..0/1 Awardee`. `UserAccount` memegang identitas login (email, hash, peran, status akun); `Awardee` tetap murni penerima manfaat **tanpa satu pun field auth**. Referensi konten pun terpisah maknanya: `Story.authorId` → `Awardee`, `Story.reviewerId` → `UserAccount`.

### 2.5 Larangan eksplisit Verifikator (batas dengan Admin)

Diturunkan dari `docs/04` §3.1 & §5.4 dan `docs/03` §5.9–5.10. Setiap larangan punya pemilik pengganti — tidak ada kewenangan yang menguap.

| # | Larangan | Pemilik | Alasan |
|---|---|---|---|
| X-01 | Meninjau/menyetujui/menerbitkan **karyanya sendiri** (cerita) | — (mutlak) | Pemisahan tugas `docs/04` §3.1; konflik kepentingan `docs/03` §5.10 |
| X-02 | Melihat dasbor KPI agregat, tren program, corong keterlibatan | Admin | Verifikator dinilai pada mutu keputusan, bukan capaian angka |
| X-03 | Melihat/mengubah parameter KPI, tabel skor, ambang tier, koefisien reach | Admin (baca) / tak seorang pun (ubah) | `09` §2: angka kanonik beku di `domain/constants/` |
| X-04 | Mengubah poin manual, memberi bonus, mengoreksi saldo | Admin (clawback tercatat) | `docs/03` §5.9 tingkat 3 wajib peninjauan dua orang |
| X-05 | Memvalidasi keanggotaan | Admin | Menentukan penyebut KPI M-01 |
| X-06 | Menonaktifkan / menangguhkan / menghapus akun | Admin | `docs/03` §5.9 sanksi tingkat 4–5 |
| X-07 | Menyusun & mengirim broadcast | Admin | Diseminasi (pilar 04) kewenangan penerbit program |
| X-08 | Mengekspor data anggota / laporan / bahan SROI | Admin | `docs/04` §5.4: reviewer tanpa hak ekspor |
| X-09 | Melihat isi consent record & log akses PII | Admin (DPO/Auditor) | `docs/04` §5.4: reviewer hanya melihat **status** |
| X-10 | Mengubah katalog reward/badge, menjalankan penukaran | Admin | Bukan domain konten |
| X-11 | Mengoverride gerbang publikasi yang gagal | tak seorang pun | `docs/04` §3.4 |
| X-12 | Menyunting isi naskah Awardee | hanya penulis | Kepengarangan tetap pada penulis |
| X-13 | Mengubah keputusan verifikator lain yang sudah final | Admin (jalur banding) | Mencegah pembatalan diam-diam antar peninjau |

### 2.6 Konsekuensi konsolidasi tujuh aktor → tiga peran

`docs/04` §3.1 mendefinisikan tujuh aktor. PO-3 memampatkannya jadi tiga. Pemetaannya wajib eksplisit:

| Aktor `docs/04` §3.1 | Peran baru | Catatan |
|---|---|---|
| Member | **AWARDEE** | Penulis, pengaju, pemilik consent |
| Chapter Lead | **VERIFIKATOR** | Saring kelengkapan (lapis 1) |
| PF Reviewer (Corsec) | **VERIFIKATOR** | Setujui substansi; pemberi `pfValidation` |
| Data Steward / DPO | **VERIFIKATOR** (checklist) + **ADMIN** (akses PII) | Checklist 21 butir di Verifikator; akses & ekspor PII di Admin (X-09) |
| ESG Analyst | **VERIFIKATOR** | Tetapkan tag ESG/SDG |
| PF Publisher | **VERIFIKATOR** | Eksekusi `DISETUJUI → TERPUBLIKASI` |
| Auditor (read-only) | **ADMIN** | Baca jejak audit, agregat, ekspor |

**Konsolidasi ini melemahkan pemisahan tugas** *"pengaju ≠ penyetuju ≠ penerbit"*. Itu harus diakui, bukan disembunyikan. Tiga mitigasi wajib ada:

1. **C-19 absolut** — Verifikator diblokir dari meninjau tulisannya sendiri, ditegakkan di lapisan policy.
2. **Jejak audit lengkap** — setiap keputusan mencatat `reviewerId` + `reviewedAt` + `note`.
3. **Minimal dua akun Verifikator sejak hari pertama** (`PF-CORSEC-01` & `PF-CORSEC-02`, §11.3) supaya C-19 punya jalan keluar dan kolom "ditinjau oleh" tidak seragam. Dengan satu akun saja, sebuah cerita yang ditulis verifikator tunggal menjadi *deadlock* permanen.

---

## 3. Peta Route v2 — Lengkap

> Menggantikan `docs/09-BUILD-CONTRACT.md` §3 seluruhnya (**Amandemen A-01**).
> Total: **11 publik + 12 awardee + 6 verifikator + 7 admin = 36 route**.
> Grup layout: `src/routes/(public)/`, `src/routes/awardee/`, `src/routes/verifikator/`, `src/routes/admin/`.
> `src/routes/+layout.svelte` dan `src/routes/+layout.js` **tidak disentuh** (`09` §4 — SPA murni, `ssr = false`).

### 3.1 Zona Publik — tanpa sesi

| Path | Peran | Isi | Status | Keputusan |
|---|---|---|---|---|
| `/` | Publik | Beranda editorial: hero berfoto, pita dampak agregat, dua komunitas, agenda komunitas (mini-kalender + daftar event), cerita terpublikasi, gerakan bersama, penutup | **UBAH** | Cabut `:106-113` (blob), `:154-182` (tangga tier), `:295-380` (tabel skor + tier), `:382-425` (sorotan anggota). Tambah 4 blok PO-1. |
| `/tentang` | Publik | Latar (fragmentasi alumni, isolasi womenpreneur), objective, 6 pilar, timeline 2026, dampak berlabel kelas | **UBAH** | Pertahankan pilar 05 "Recognition & Gamifikasi" sebagai **deskripsi program** (bukan mekanik). Cabut tipografi angka besar dari benchmark (§4.3 D-02). |
| `/komunitas` | Publik | Profil SOBI & Womenpreneur, jembatan antar komunitas, sebaran 3 chapter | **UBAH** | Cabut `:17` (impor `poinUntuk`), `:86` (`pointsReward`), `:258-261` ("bernilai 15 poin"). Agenda dipindah ke `/kalender`. |
| `/cerita` | Publik | Grid cerita `TERPUBLIKASI` + filter pilar ESG + **panel daftar event di kolom kanan** | **UBAH** | Tambah `<aside>` `EventListPanel` (PO-4, G-02). Cabut `:159-161` ("menambah poin kontribusi"). |
| `/cerita/[slug]` | Publik | Artikel penuh, byline ber-consent, tag ESG/SDG, kotak dampak, bagikan, cerita terkait, **panel event** | **UBAH** | Cabut `:25` (impor `TierBadge`), `:151` (`tier=`), `:156` (`<TierBadge>`), `:45` (muat member semata untuk tier). |
| `/gerakan` | Publik | Strip dampak, filter kategori, daftar gerakan + progres partisipasi | **UBAH** | Cabut `:21` (impor `poinUntuk`), `:128-131` ("bernilai 50 poin — nilai tertinggi"). |
| **`/kalender`** | Publik | Kalender komunitas: peralih Bulan ↔ Daftar, navigasi bulan, filter jenis/chapter/komunitas/mode | **BARU** | Mewujudkan pilar 02 Hal 5 sebagai destinasi publik (G-01). |
| **`/kalender/[id]`** | Publik | Detail kegiatan publik, unduh `.ics`, CTA `/masuk?next=/awardee/kalender/[id]` | **BARU** | Batas visibilitas §6.4 berlaku ketat. |
| **`/metode-pengukuran`** | Publik | Definisi tiap angka, rumus jangkauan organik, 6 asumsi `docs/02` §3.6, pernyataan benchmark eksternal | **BARU** | **Prasyarat** menampilkan angka kelas B & C. Tanpanya keduanya wajib dicabut dari landing (§4.3). |
| `/daftar` | Publik | Wizard 3 langkah (Identitas → Program → Persetujuan) + consent | **UBAH** | Pertahankan teks consent `:65`,`:70` (disclosure privasi yang sah). Cabut blok "Poin pertamamu" `:242-245`. |
| `/masuk` | Publik | **Formulir email + kata sandi**, panel kredensial demo bertanda "autentikasi tiruan", dukungan `?next=` | **UBAH (tulis ulang)** | Ganti total pemilih peran demo. Cabut `:25`,`:55`,`:178`,`:191-194`,`:203-205` (daftar 8 anggota berperingkat poin). |

**Dicabut dari zona publik:** tidak ada route publik yang dihapus. Yang dihapus adalah **isi**, dan seluruhnya **dipindahkan**, bukan dibuang (§4.6).

### 3.2 Zona Awardee — `Role.AWARDEE`

Seluruh route lama `/member/**` **di-rename**, bukan diduplikasi. Tidak ada route `/member/*` yang tersisa; tidak ada alias, tidak ada redirect permanen (data demo dibangkitkan ulang, tidak ada tautan lama yang beredar di luar).

| Path v2 | Peran | Isi | Status | Route lama |
|---|---|---|---|---|
| `/awardee` | Awardee | Dasbor: poin, tier, progres, streak, aksi cepat, kabar terbaru, **panel agenda terdekat** | **RENAME dari `/member`** | `src/routes/member/+page.svelte` |
| `/awardee/kabar` | Awardee | Daftar broadcast terkirim; tandai terbaca | **RENAME dari `/member/kabar`** | `member/kabar/+page.svelte` |
| `/awardee/kabar/[id]` | Awardee | Baca kabar + 3 jalur amplifikasi (WA, sosmed publik + bukti) | **RENAME dari `/member/kabar/[id]`** | `member/kabar/[id]/+page.svelte` |
| `/awardee/aksi` | Awardee | 9 jenis aksi, kuota harian, riwayat buku besar poin, **tabel skor & tangga tier** | **RENAME dari `/member/aksi`** + **UBAH** | Menerima pindahan `(public)/+page.svelte:329-377` |
| `/awardee/kalender` | Awardee | Kalender + klaim kehadiran via kode + **tab "Usulan saya"** | **RENAME dari `/member/kalender`** + **UBAH** | Tab usulan adalah kanal C-22 |
| `/awardee/gerakan` | Awardee | Ikut gerakan, lapor aksi lapangan | **RENAME dari `/member/gerakan`** | `member/gerakan/+page.svelte` |
| `/awardee/cerita` | Awardee | Cerita saya + status moderasi + catatan revisi verifikator | **RENAME dari `/member/cerita`** + **UBAH** | Formulir kirim dipisah ke `/tulis` |
| **`/awardee/cerita/tulis`** | Awardee | Komposer naskah: judul, ringkasan, naskah, tema, lokasi, tanggal, peserta, foto, tag ESG/SDG, catatan hasil, consent | **BARU** | Menutup G-05 sisi hulu |
| `/awardee/papan-peringkat` | Awardee | Podium + baris peringkat, lingkup global/komunitas/chapter, periode | **RENAME dari `/member/papan-peringkat`** | Menerima pindahan `(public)/+page.svelte:382-425` |
| `/awardee/penghargaan` | Awardee | Lencana terkumpul + katalog tukar koin | **RENAME dari `/member/penghargaan`** | `member/penghargaan/+page.svelte` |
| `/awardee/direktori` | Awardee | Cari/filter awardee, ajakan mentoring lintas komunitas | **RENAME dari `/member/direktori`** | `member/direktori/+page.svelte` |
| `/awardee/profil` | Awardee | Data diri, tier, kontribusi ESG, pengaturan consent | **RENAME dari `/member/profil`** | `member/profil/+page.svelte` |

### 3.3 Zona Verifikator — `Role.VERIFIER` (seluruhnya BARU)

| Path | Peran | Isi | Status |
|---|---|---|---|
| `/verifikator` | Verifikator | Papan antrean: cacah per jenis (cerita/kegiatan/bukti), usia antrean, jumlah lewat SLA, **panel agenda terdekat** | **BARU** |
| `/verifikator/cerita` | Verifikator | Antrean `DIAJUKAN ∪ REVIEW` urut FIFO (tertua dulu), usia hari kerja, penanda pelanggaran SLA | **BARU** |
| `/verifikator/cerita/[id]` | Verifikator | Detail peninjauan: naskah penuh + **tiga panel gerbang terpisah** (checklist sensitif 21 butir · kesiapan bukti ESG 4 syarat · kelayakan fitur publik 5 syarat) + tombol dari `allowedTransitions()` | **BARU** |
| `/verifikator/kegiatan` | Verifikator | Antrean kegiatan `DIAJUKAN` + formulir buat kegiatan sendiri | **BARU** |
| `/verifikator/bukti` | Verifikator | Antrean bukti kontribusi `UNDER_REVIEW` + skor risiko anti-gaming | **BARU** |
| `/verifikator/profil` | Verifikator | Identitas akun, riwayat keputusan, ganti kata sandi (mock) | **BARU** |

Zona ini punya **lima tujuan navigasi, seluruhnya `primary`** — verifikator bekerja dalam antrean, bukan menjelajah. `BottomNav` dan sidebar berisi daftar yang sama; tidak ada tujuan yang hanya dapat dicapai dari desktop.

### 3.4 Zona Admin — `Role.ADMIN`

| Path | Peran | Isi | Status | Keputusan |
|---|---|---|---|---|
| `/admin` | Admin | Dasbor KPI **4 tab** (Ringkasan · Amplifikasi · Komunitas · ESG & Dampak) dengan **17 chart ECharts** | **UBAH** | Dari 2 chart jadi 17: **11 baru** + 6 chart lama yang diperbaiki (§7.2; `12` §3.5 WP-07). PO-5. |
| `/admin/awardee` | Admin | Tabel awardee + filter + validasi keanggotaan | **RENAME dari `/admin/anggota`** | Konsistensi istilah PO-3 |
| `/admin/broadcast` | Admin | Susun kabar, lacak jangkauan & amplifikasi, chart peringkat | **UBAH** | Rename `memberId` → `awardeeId` |
| `/admin/moderasi` | Admin | **Consent & Jejak Audit** — read-only atas keputusan konten, kelola consent record, jalur banding | **UBAH (ubah peruntukan)** | Keputusan konten **pindah ke `/verifikator`** (C-14/C-16 = ✗ bagi Admin). Yang tersisa di sini adalah X-09 (PII/consent) + X-13 (banding) + C-48 (audit). |
| `/admin/gamifikasi` | Admin | Tabel skor read-only, distribusi tier agregat, komposisi poin, sinyal anomali | **UBAH** | C-32 & C-33 |
| `/admin/esg` | Admin | Matriks E/S/G, 4 gerbang bukti, radar, pemetaan SDG | **UBAH** | Chart C-17 ditambahkan |
| `/admin/laporan` | Admin | Rekap bulanan, ekspor, SROI, **tab Story Bank** | **UBAH** | C-20. Halaman ini 754 baris tanpa satu chart pun hari ini. |

### 3.5 Keputusan rename per route lama — daftar tuntas

Setiap route yang ada hari ini mendapat keputusan eksplisit. Tidak ada yang menggantung.

| Route lama | Keputusan | Route baru |
|---|---|---|
| `/member` | RENAME | `/awardee` |
| `/member/kabar` | RENAME | `/awardee/kabar` |
| `/member/kabar/[id]` | RENAME | `/awardee/kabar/[id]` |
| `/member/aksi` | RENAME + UBAH | `/awardee/aksi` |
| `/member/kalender` | RENAME + UBAH | `/awardee/kalender` |
| `/member/gerakan` | RENAME | `/awardee/gerakan` |
| `/member/cerita` | RENAME + UBAH | `/awardee/cerita` |
| `/member/papan-peringkat` | RENAME | `/awardee/papan-peringkat` |
| `/member/penghargaan` | RENAME | `/awardee/penghargaan` |
| `/member/direktori` | RENAME | `/awardee/direktori` |
| `/member/profil` | RENAME | `/awardee/profil` |
| `/admin/anggota` | RENAME | `/admin/awardee` |
| `/admin`, `/admin/broadcast`, `/admin/gamifikasi`, `/admin/esg`, `/admin/laporan` | UBAH (path tetap) | — |
| `/admin/moderasi` | UBAH peruntukan (path tetap) | — |
| Seluruh 8 route `(public)/**` | UBAH (path tetap) | — |
| — | **HAPUS** | **tidak ada route yang dihapus** |

**Beban rename terukur:** `entities/Member.js` diimpor **14 file**; token `memberId` muncul di **28 file** (5 entity, 3 service, `Repository.js`, `ConsentRecord.js`, `db.js`, 8 repository, `seed-data.js`, 3 store, 5 route); literal `/member` muncul di ±40 lokasi termasuk **dua** sumber navigasi (`routes/member/+layout.svelte:46-62` dan fallback `components/BottomNav.svelte:29-35`) dan skrip verifikasi (`scripts/verify/e2e-routes.mjs:34-43`, `e2e-gamification.mjs:153-209`, `screenshot.mjs:25-31`).

> **Aturan kerja:** rename `member → awardee` adalah **satu paket kerja atomik dan serial**. Dilarang diparalelkan dengan paket lain. Proyek ini bukan git repo — tidak ada worktree, tidak ada merge, tidak ada jalan mundur selain menulis ulang.

### 3.6 Route guard — satu keputusan, satu tempat

| Lapis | Berkas | Tanggung jawab |
|---|---|---|
| Domain | `src/lib/domain/policies/AccessPolicy.js` **(BARU)** *(eks `RouteAccessPolicy.js` — nama dikoreksi per `12` §2.6)* | `zoneOf(pathname)`, `canAccess(role, pathname)`, `homePathFor(role)`, `safeNext(next, role)`, `isSelfReview(actorId, authorId)`, plus `Zone`, `ZONE_PREFIX`, `ZONE_ROLES`. Murni, sinkron, dapat diuji `node` polos. |
| Domain | `src/lib/domain/constants/roles.js` **(BARU)** | `UserRole`, `USER_ROLE_META`, `RolePermission`, `ROLE_PERMISSIONS` *(eks `Role`/`ROLE_META`; `Zone`/`ZONE_PREFIX`/`ZONE_ROLES` **pindah** ke `AccessPolicy.js` — `12` §2.1 & §2.6)* |
| Store | `src/lib/stores/session.svelte.js` | **Mendelegasikan** ke policy — tidak menyalin logika. `session.canAccess()` memanggil `canAccess()`. |
| Komponen | `src/lib/components/ZoneGuard.svelte` **(BARU)** | Satu komponen, tiga layout zona. |

**Tiga keadaan, tiga perlakuan berbeda dan disengaja:**

| Keadaan | Perlakuan | Alasan |
|---|---|---|
| `session.ready === false` — sesi **belum diketahui** | Tampilkan penantian. **Tidak** mengalihkan, **tidak** merender isi. | `role === null` di sini berarti *"belum tahu"*, bukan *"tamu"*. Keduanya sama-sama `null` tetapi konsekuensinya berlawanan: yang satu harus ditunggu, yang satu harus diusir. Tanpa pembeda ini, **pengguna sah terlempar keluar setiap kali menekan F5**. |
| Tamu | Alihkan ke `/masuk?next=<jalur asal>` | Halaman masuk menjelaskan dirinya sendiri. |
| Masuk, zona keliru | **Jangan alihkan diam-diam.** Tampilkan panel penjelasan + tombol ke beranda perannya + tombol keluar. | Pengalihan senyap membuat pengguna mengira tautannya rusak, lalu ia mencoba lagi — dan gagal lagi. |

**Turunan wajib:** (a) `ready` juga di-set `true` di `login()`, bukan hanya di `hydrate()` — kalau tidak, login dari halaman tamu menghasilkan sesi valid dengan `ready === false` dan guard zona tujuan menggantung selamanya; (b) `logout()` **tidak** mengembalikan `ready` ke `false` — setelah keluar jawabannya diketahui pasti: tamu; (c) children tidak boleh dirender selama menunggu — komponen yang membaca `session.awardee.fullName` akan melempar sebelum redirect sempat terjadi.

**~~Dua flag, bukan satu~~ — DICABUT (`12` §2.12 & §8.1).** Yang berlaku: **satu** flag `ready` + `loading`.

| Flag | Sumber | Dipakai oleh |
|---|---|---|
| `session.ready` | localStorage (sinkron, dibaca di konstruktor store) | **Guard** — memutuskan dalam satu tick, tanpa `await` |
| `session.loading` | Dexie (async) | Indikator pemuatan entity |
| ~~`session.hydrated`~~ | — | **TIDAK ADA.** Halaman yang butuh entity memakai `session.awardee !== null` |

> **Alasan pencabutan.** `hydrated` tidak pernah masuk daftar state `12` §2.12. Sebuah flag yang tidak
> didefinisikan selalu bernilai `undefined`, sehingga `{#if session.hydrated}` selalu falsy dan halaman
> Awardee/Verifikator **tidak pernah merender isinya — tanpa satu pun error**. Kegagalan itu lolos
> `verify:compile` **dan** `npm run build` sekaligus, dan baru terlihat saat peragaan.

> **Aturan penyimpanan:** *localStorage menyimpan **penunjuk** siapa yang masuk; Dexie menyimpan **siapa** mereka.* Potret sesi boleh basi, boleh hilang, boleh dibuang — kehilangannya hanya berarti login ulang. `passwordHash` **tidak pernah** keluar dari `AccountRepository`, dan tidak pernah masuk localStorage.

### 3.7 Matriks perilaku guard — dipakai sebagai daftar uji `verify:e2e`

| Keadaan | `/awardee/aksi` | `/verifikator/cerita` | `/admin` | `/cerita` | `/kalender` |
|---|---|---|---|---|---|
| `ready === false` | penantian | penantian | penantian | render | render |
| Tamu | → `/masuk?next=/awardee/aksi` | → `/masuk?next=…` | → `/masuk?next=…` | render | render |
| Awardee | render | panel "bukan peran Anda" | panel | render | render |
| Verifikator | panel | render | panel | render | render |
| Admin | panel | panel | render | render | render |
| Baru `logout()` dari `/admin` | — | — | → `/masuk` seketika | render | render |
| Sudah masuk lalu membuka `/masuk` | — | — | — | → `session.homePath()` | — |

**`safeNext()` menutup dua serangan sekaligus:** jalur absolut ke host lain (*open redirect*, ditolak bila `startsWith('//')` atau tidak `startsWith('/')`), dan jalur yang tidak boleh dibuka peran itu — yang kedua akan memantul balik ke `/masuk` tepat setelah login dan membentuk gelang tak berujung.

### 3.8 Navigasi — dari empat sumber kebenaran menjadi satu

Hari ini daftar navigasi tertulis di **empat** tempat, dua di antaranya terduplikasi:

| # | Berkas | Konstanta | Isi | Aktif? |
|---|---|---|---|---|
| 1 | `src/routes/(public)/+layout.svelte:25-31` | `NAV` | 5 entri publik | ✓ (dipakai dua kali di file yang sama: desktop `:56`, drawer `:103`) |
| 2 | `src/routes/member/+layout.svelte:46-62` | `NAV_ANGGOTA` | 10 entri `/member/*` | ✓ desktop `:157` |
| 3 | `src/lib/components/BottomNav.svelte:29-35` | `NAV_MEMBER` | 5 entri `/member/*` | ✓ — `member/+layout.svelte:191` memanggil `<BottomNav />` **tanpa prop `items`**, jadi fallback internal yang dipakai. **Duplikasi #2.** |
| 4 | `src/lib/components/Sidebar.svelte:27-35` | `NAV_ADMIN` | 7 entri `/admin/*` | ✗ — `admin/+layout:134` mengoper `nav={NAV}`, fallback tidak aktif, tetapi tetap membusuk bila tidak di-rename |

Dengan tiga zona ter-login (bukan dua), ini menjadi enam tempat. **Keputusan:** seluruh definisi pindah ke `src/lib/data/navigation.js` **(BARU)** yang diimpor keempat layout; fallback internal komponen **dikosongkan**.

| Export | Bentuk |
|---|---|
| `NAV_BY_ZONE` | `Record<Zone, readonly NavItem[]>`; `NavItem = {id, label, href, iconPath, primary?, badgeKey?}` |
| `navForZone(zone)` | Seluruh butir zona; salinan baru, aman dimutasi pemanggil |
| `primaryNavForZone(zone)` | Butir `primary` untuk BottomNav ponsel; maksimum lima |
| `withBadges(items, counts)` | Menempelkan angka lencana dari peta hitungan milik store |
| `isNavActive(href, pathname, {exact})` | `/awardee/aksi/riwayat` menyalakan `/awardee/aksi`; `/awardee` tidak menyala di semua |

**Dua batas yang wajib dijaga:**
1. `navigation.js` berisi **data, bukan keputusan**. Ia tidak tahu siapa yang sedang masuk. Penjagaan akses tinggal di `AccessPolicy` (domain) dan `ZoneGuard` (komponen). Memindahkan salah satunya ke sini membuat *"menu tidak tampil"* dan *"halaman tidak boleh dibuka"* menjadi dua aturan terpisah yang cepat berselisih.
2. `badgeKey` hanya **kunci**, bukan angka. Jumlah antrean adalah keadaan reaktif milik store; menaruhnya di sini memaksa berkas data mengimpor store dan membuatnya tidak lagi dapat diuji sebagai modul polos.

`Sidebar.svelte:12-14` dan `BottomNav.svelte:15` sudah didokumentasikan "TIDAK mengimpor store apa pun" — arah dependensi itu **benar dan wajib dipertahankan**. Yang diperbaiki hanyalah daftar bawaannya.

**Sisa hard-code di luar array menu yang wajib ikut:** `Header.svelte:84` (`/member/kabar`), `:101` (`/member/profil`), `:109` (`/masuk`); `Footer.svelte:18-23` (4 tautan publik — **tambahkan `/kalender`**); `Sidebar.svelte:117` (`/admin`); `BroadcastRepository.js:26` (komentar).

---

## 4. Arsitektur Informasi Zona Publik

### 4.1 Pertanyaan yang harus dijawab halaman publik

Zona publik melayani empat pembaca sekaligus: **calon anggota** (haruskah saya bergabung?), **manajemen Pertamina/PF** (apakah program ini berjalan?), **mitra & wartawan** (apa buktinya?), dan **anggota lama** (apa yang sedang terjadi?). Susunan informasi di bawah dirancang menjawab keempatnya tanpa satu pun mekanik skoring.

### 4.2 Yang TAMPIL — pemetaan ke PO-1

| Blok PO-1 | Isi | Route | Sumber data | Komponen |
|---|---|---|---|---|
| **(a) Dampak & angka agregat** | Anggota terdata, chapter aktif, kegiatan terlaksana, cerita terpublikasi, gerakan berjalan, aksi tercatat, jangkauan organik (rentang) | `/` §Dampak, `/metode-pengukuran` | `ProgramImpactService.publicSnapshot()` **(BARU)** | `DataBand` **(BARU)** |
| **(b) Blog/cerita published** | Cerita `TERPUBLIKASI` saja, hierarki 1 lead + 2 sekunder + 4 brief | `/`, `/cerita`, `/cerita/[slug]` | `catalog.publishedStories` → `StoryRepository.published()` (menyaring lewat `story.isPublic`, bukan literal status) | `StorySpread` **(BARU)**, `StoryCard` (diubah) |
| **(c) Kalender + daftar event** | Mini-kalender bulan berjalan + daftar kegiatan; kalender penuh dengan filter; panel di sisi halaman blog | `/`, `/kalender`, `/kalender/[id]`, `/cerita`, `/cerita/[slug]` | `catalog.publishedEvents` **(BARU)** → `CommunityEvent.isPubliclyVisible` | `EventListPanel` **(BARU, dipakai 4 zona)** |
| **(d) Gerakan + dua komunitas** | Gerakan bersama + progres partisipasi; profil SOBI & Womenpreneur dari `COMMUNITIES` | `/`, `/gerakan`, `/komunitas` | `catalog.movements`, `COMMUNITIES` (`community.js:47`) | `MovementCard`, `PhotoFigure` **(BARU)** |

### 4.3 Yang HARAM TAMPIL — dan alasan branding, bukan sekadar aturan

PO-2 adalah larangan mutlak. Tetapi larangan yang tidak dipahami akan bocor lagi pada halaman berikutnya. Alasannya perlu tercatat:

| # | Haram di publik | Bukti lokasi sekarang | Alasan branding |
|---|---|---|---|
| H-1 | **Tabel skor 9 aksi + nilai poinnya** | `(public)/+page.svelte:329-353` — `{#each SCORING_TABLE}` + `<PointsChip points={aturan.points} />` | Halaman yang memajang *"bagikan ke sosial media = 8 poin"* membaca sebagai **program yang membeli amplifikasi**. Itu merusak klaim inti Hal 6: *"komunitas = organic brand amplifier"*. Amplifikasi berbayar bukan amplifikasi organik. |
| H-2 | **Tangga tier + ambang 25/50/100/150 + manfaat** | `+page.svelte:154-182` (hero) dan `:355-377` (kartu) | Susunannya identik dengan tabel paket *Starter/Pro/Business*. Sekali dikenali, **seluruh halaman ikut terbaca sebagai produk SaaS**, bukan program korporat Pertamina Foundation. |
| H-3 | **Papan peringkat / sorotan anggota berperingkat poin** | `+page.svelte:77-84` (`.sort((a,b) => b.points - a.points).slice(0,4)`), `:399-411` (`MemberCard` dengan `activePk`) | Menempatkan penerima manfaat dalam urutan kompetitif di halaman muka korporat. Sekali seorang anggota merasa dipermalukan peringkatnya, kepercayaan yang dibangun pilar 01 hilang. Juga: `masuk/+page.svelte:191-194` memajang poin 8 orang bernama **tanpa login sama sekali**. |
| H-4 | **Poin/tier/badge milik individu** | `cerita/[slug]:151,156` (byline penulis), `masuk:178,192,194` | Data pribadi. `docs/04` §4.3 menetapkan `publikasi_nama` default OFF; memajang *nama + skor* melampaui apa pun yang pernah disetujui anggota. |
| H-5 | **Chip poin pada kartu kegiatan** | `komunitas/+page.svelte:86` (`pointsReward`) → `EventCard.svelte:136-137` | Mengubah undangan kegiatan menjadi transaksi. Kalender komunitas adalah ajakan, bukan tawaran imbalan. |
| H-6 | **Agregat total poin komunitas** | `_view-model.js:109` (`totalPoin`) — belum dirender tetapi terekspos | Angka tanpa makna bagi pembaca luar; satu-satunya fungsinya adalah membocorkan bahwa sistem skor ada. |
| H-7 | **Nilai rupiah: EMV, penghematan paid media, rasio SROI** | belum ada di publik — **jangan ditambahkan** | `docs/02` §7.3 menempatkan SROI sebagai fitur paling akhir dan paling banyak asumsi. Nilai rupiah di landing = **risiko kredibilitas terbesar dengan manfaat komunikasi terkecil**. |
| H-8 | **Capaian-versus-target internal** (mis. "48% dari target 75%") | belum ada di publik | Angka tata kelola internal. Bagi publik ia tidak bermakna dan hanya mengundang salah tafsir bahwa program gagal. |
| H-9 | **Daftar pendaftar/peserta, kuota tersisa, kode kehadiran, `attendanceRate`** | akan muncul bila `/kalender` naif | Data pribadi + integritas kehadiran. *"Sisa 2 kursi"* di publik juga menciptakan tekanan palsu. |
| H-10 | **`outcomeNote` & `evidenceRefs` mentah** | `CommunityEvent` field | Bukti ESG diperiksa dulu (`docs/02` §4.2); mentah berarti belum terverifikasi. |

**Uji kepatuhan yang dapat dieksekusi:** tidak satu pun berkas di bawah `src/routes/(public)/` boleh mengimpor `PointsChip`, `TierBadge`, `TierProgress`, `LeaderboardRow`, `BadgeTile`, `scoring-table.js`, atau `tier-table.js`. Ditambahkan sebagai langkah `npm run verify` (§10.3).

**Jangkar domain, bukan konvensi:** `AccessPolicy.canSeeScoring(role)` **(BARU)** mengembalikan `false` untuk `null` (tamu). Larangan ini menjadi aturan yang **diuji**, bukan kesepakatan lisan yang akan lupa pada halaman ke-12.

### 4.4 Klasifikasi angka — empat kelas, aturan pemisah

Setiap angka pada zona publik **wajib** masuk tepat satu kelas, dan kelasnya **wajib terbaca oleh pengunjung** — bukan hanya diketahui developer.

| Kelas | Definisi | Perlakuan visual wajib | Boleh publik? |
|---|---|---|---|
| **A — TERHITUNG** | Cacah langsung dari record di sistem. Dapat ditelusuri ke baris data. | Angka tegas, tanpa kualifikasi, **dengan tanggal potret** (`per 22 Juli 2026`) dan **penyebut** | ✓ Ya |
| **B — ESTIMASI BERPARAMETER** | Dihitung dari data kelas A × parameter berasumsi (`N`, `α`, `δ`). | Disajikan sebagai **rentang**, berlabel `Estimasi`, dengan kontrol `ⓘ` ke daftar asumsi | ✓ Ya, **dengan syarat** `/metode-pengukuran` ada |
| **C — BENCHMARK EKSTERNAL** | Angka rujukan industri yang dikutip Hal 6. **Bukan hasil pengukuran Pfriends.** | Ditulis sebagai **kalimat rujukan**, berlabel `Benchmark komunikasi`. Tanpa angka besar, tanpa gauge, tanpa progress bar, tanpa ikon panah naik. | ⚠ Ya, **hanya sebagai rujukan** |
| **D — INTERNAL** | Target-vs-capaian, nilai rupiah, data per orang, seluruh mekanik gamifikasi. | — | ✗ **Tidak** |

### 4.5 Penempatan setiap angka Hal 6

| Angka | Kelas | Publik? | Definisi & alasan |
|---|:--:|:--:|---|
| Anggota terdata | **A** | ✓ | Cacah `Awardee` berstatus AKTIF **dan** ber-consent aktif. Sengaja **tidak** menghitung pendaftar belum terverifikasi — angka publik adalah klaim, dan klaim yang dibesarkan akan runtuh saat diaudit. |
| Chapter aktif | **A** | ✓ | Cacah chapter yang benar-benar terisi anggota, dari `CHAPTERS` (`community.js:110` — PF10/PF11/PF12). Ditulis `n dari 3`. Hal 5 pilar 02. |
| Kegiatan terlaksana 2026 | **A** | ✓ | Hanya `countsForEngagementKpi === true` (`CommunityEvent.js:355`) = selesai **&&** berbukti **&&** hadir ≥ `KPI_PARAMETERS.kuorumEngagement` (=10, `kpi-targets.js:200`). Kata Hal 6 adalah *"terlaksana"*, bukan *"terjadwal"*. |
| Cerita terpublikasi | **A** | ✓ | Cacah `TERPUBLIKASI`. **Setiap satuannya dapat diklik dan dibaca** — bukti terkuat di halaman ini. |
| Gerakan bersama berjalan | **A** | ✓ | Cacah `MovementStatus.BERJALAN` (`Movement.js:61`). Hal 5 pilar 03. |
| Aksi kontribusi tercatat | **A** | ✓ | Cacah `PointActivity` berstatus AWARDED — **tanpa** menampilkan poinnya (PO-2 / H-1). |
| Anggota yang mengamplifikasi bulan ini | **A** | ✓ | Pembilang M-04. Angka **orang**, bukan rasio terhadap target (itu kelas D). |
| **Jangkauan organik** | **B** | ✓ **sebagai rentang** | Hal 6: *"1 anggota rata-rata memiliki 25–500 jaringan sosial"*. Rumus `pengamplifikasi × N × α × (1 − δ)` dengan `N = 25..500` (**dari sumber**), `α = 0,1..1,0` dan `δ = 0,3` (**asumsi**) — seluruhnya sudah ada di `REACH_PARAMETERS` (`kpi-targets.js:169-190`) dan diberi komentar `[ASUMSI]` di kode. Wajib rentang, **tidak pernah angka tunggal**. |
| **Engagement 2–3× lebih tinggi** | **C** | ⚠ rujukan | Hal 6 menyebutnya *"benchmark komunikasi"*. Pfriends **tidak dapat membaca** engagement akun pribadi anggota (`docs/02` §5.1). Menampilkannya sebagai capaian adalah klaim yang tidak dapat dipertahankan saat ditanya *"diukur bagaimana?"*. |
| **Pengurangan paid media 5–20%** | **C** | ⚠ rujukan | Hal 6 memakai kata *"hingga"* = **batas atas**, bukan nilai harapan (`docs/02` §3.4). |
| Coverage 75% (capaian vs target) | **D** | ✗ | Angka tata kelola internal. |
| EMV (Rp), penghematan (Rp), SROI | **D** | ✗ | `docs/02` §7.3 F6. |
| Poin, tier, papan peringkat, badge, distribusi tier | **D** | ✗ | PO-2. |
| Nama + poin anggota individual | **D** | ✗ | PO-2 + `docs/04` §4.3. |

### 4.6 Aturan mengikat pada bagian "Dampak"

| # | Aturan | Alasan |
|---|---|---|
| D-01 | Angka kelas B **wajib rentang**, tidak pernah tunggal | Satu angka membaca sebagai hasil ukur; rentang membaca sebagai estimasi |
| D-02 | Angka kelas C **dilarang** memakai tipografi angka besar, gauge, progress bar, atau ikon panah naik | Bentuk visual itu menyatakan "capaian" tanpa satu kata pun |
| D-03 | Setiap angka wajib punya **tanggal potret** | Angka tanpa tanggal tidak dapat diverifikasi ulang |
| D-04 | Dilarang menjumlahkan angka kelas berbeda menjadi satu "skor dampak" | Menggabungkan terhitung + estimasi + benchmark menghasilkan angka yang tidak berarti apa pun |
| D-05 | Data kosong → keadaan kosong yang jujur, **bukan angka nol besar** | `docs/02` §6.3: nol yang di-render sebagai grafik menyesatkan |
| D-06 | Tidak ada nilai rupiah di zona publik | `docs/02` §7.3 F6 |
| D-07 | Angka publik memakai **penyaring yang sama** dengan KPI internal (`isActive && consent`) | Dua definisi untuk satu nama angka adalah cara tercepat kehilangan kepercayaan |
| D-08 | Setiap angka wajib membawa **penyebut atau periodenya** | Menutup ciri "AI" D12 — `52` tanpa *"dari berapa"* adalah angka yang tidak pernah ditanyai balik oleh manusia |

### 4.7 Sumber data tunggal — mengapa satu service baru, bukan tambal di komponen

Verifikasi penting: **tidak satu pun service/policy domain diimpor oleh `src/routes/(public)/`** hari ini. Seluruh kebocoran terjadi lewat *konstanta*, *getter `Member`*, dan *komponen*. Artinya perbaikannya presentasional + **satu service agregat baru**, bukan bedah service.

```
ProgramImpactService({ awardeeRepo, activityRepo, movementRepo, storyRepo, eventRepo, clock })
  await publicSnapshot()
  // -> { capturedAt, registeredAwardees, activeChapters, totalChapters,
  //      completedEvents, publishedStories, runningMovements, recordedActions,
  //      amplifiersThisMonth, organicReach: { min, max, basis } }
```

**Tanpa satu pun field poin/tier** — sehingga zona publik **secara struktural tidak bisa** membocorkannya. Ini bukan disiplin, ini bentuk data. `organicReach` mendelegasikan ke `REACH_PARAMETERS` / `KpiCalculator.organicReach()` (`KpiCalculator.js:141`), tidak menghitung ulang.

### 4.8 Redesign editorial — ringkas (rinci di `docs/08-DESIGN-SYSTEM.md` amandemen)

| Aspek | Sekarang | Menjadi |
|---|---|---|
| **Hero** | Blob blur + panel tangga tier | Foto full-bleed berkapsi; teks kolom 1–6 rata bawah; kolom 7–12 foto murni |
| **Angka agregat** | 4 `StatTile` identik | **Pita data** navy menempel dasar hero; kolom 1–4 metrik utama + 5–12 dibagi tiga; pemisah garis 1px, bukan border kartu; **baris ketiga wajib berisi penyebut** |
| **Dua komunitas** | `md:grid-cols-2` seragam | Dua *spread* bertumpuk bercermin, baris B `margin-top: -64px` terhadap baris A — saling mengunci, tidak berbaris rapi |
| **Cerita** | `lg:grid-cols-3`, 12 kartu identik | Hierarki **1 lead (kol 1–7) + 2 sekunder (kol 8–12) + 4 brief teks-murni** |
| **Gerakan** | Grid kartu | 1 unggulan foto 21:9 dengan panel teks menumpuk + 3 baris daftar ber-rule keying |
| **Penutup** | 4× `Card variant="highlight"` identik | Satu pita navy ber-rule merah; `variant="highlight"` **dicabut dari 4 halaman publik** |
| **Tipografi** | `--font-sans` = `--font-display` (stack sama); body 14px | Display serif (Fraunces/Instrument Serif) **≥24px saja**; body **16px/1.68**; kicker mono 11px `+0.08em`. Zona ter-login **tetap 14px** (konvensi produk). |
| **Foto** | Tidak ada | `static/img/` — 27 slot (§9.3); radius **2px** bukan 16px; **rule keying 4px** di satu tepi; **kapsi + kredit wajib** |
| **Dekorasi** | `blur-3xl`, `backdrop-blur`, aura radial `app.css:129-132` | **Dihapus dari zona publik.** Kedalaman dicapai lewat foto, garis pemisah, dan ruang putih. |
| **Ritme** | `py-10/12/14/12/12/14` metronomik | Token `--rhythm-*` sengaja tidak rata; **tidak ada seksi memakai jumlah kolom yang sama dengan tetangganya** |
| **Warna** | 6 objek merah per viewport | Rasio **90/7/3** (kertas+tinta / navy / merah); **maksimum satu objek merah per viewport**; latar tint dilarang di publik (tetap hidup di zona ter-login sebagai penanda keadaan) |

**Kapsi foto adalah alat anti-"AI" termurah di dokumen ini.** Format wajib: `Subjek — Tempat, Bulan Tahun · Foto: Unsplash/Nama`. Halaman hasil generate tidak pernah punya kapsi.

**Batas yang tidak boleh dilanggar:** `src/app.css`, `src/app.html`, `src/routes/+layout.svelte`, `src/routes/+layout.js` termasuk berkas "sudah selesai — jangan diubah" (`09` §4). Perubahan token warna/font yang benar-benar perlu diajukan sebagai **amandemen terpisah pada `08-DESIGN-SYSTEM.md`**, bukan disunting diam-diam. Kontras `--color-canvas` yang dihangatkan sudah dihitung ulang: seluruh pasangan teks yang lolos hari ini tetap lolos; `ink-500` yang memang sudah dilarang di kanvas tetap dilarang.

### 4.9 Microcopy — aturan redaksi

Delapan konstruksi *"X, bukan Y"* di zona publik adalah tic model bahasa, dan efeknya terbalik: teks terdengar **defensif terhadap tuduhan yang belum diajukan siapa pun**.

| # | Aturan |
|---|---|
| M-1 | Maksimum **satu** konstruksi "X, bukan Y" di seluruh zona publik |
| M-2 | Setiap angka wajib membawa penyebut atau periodenya |
| M-3 | Tidak ada kalimat yang menjelaskan proses internal kepada pembaca luar (mis. *"Semuanya bersedia namanya ditampilkan"*) |
| M-4 | Tidak ada daftar tiga kata kerja abstrak (*"terhubung, berbagi keahlian, dan menggerakkan"*). Ganti dengan satu kata kerja + satu objek konkret |
| M-5 | Setiap foto punya kapsi bertempat dan berbulan |
| M-6 | Footer adalah tempat **fakta** (pengelola, kontak), bukan tempat misi |

---

## 5. Alur Editorial Konten

### 5.1 Prinsip: legalitas transisi hidup di domain, bukan di tombol

Hari ini legalitas transisi tersebar di tiga tempat di lapisan atas — `src/lib/stores/admin.svelte.js:164` (→ `DISETUJUI`), `:215` (→ `PERLU_REVISI`), dan `src/routes/member/cerita/+page.svelte:254` (→ `DIAJUKAN`). Entity `Story` sendiri hanya punya `withChanges` (`Story.js:455-457`); ia tidak tahu transisi mana yang sah. Akibatnya dua hal:

1. **Transisi `TERPUBLIKASI` tidak ada di kode aplikasi mana pun.** Ia hanya lahir dari `seed-data.js`. Jadi langkah *"baru publish ke publik"* pada PO-4 benar-benar belum terimplementasi — bukan setengah jadi, melainkan tidak ada.
2. Apa pun yang menghalangi Awardee menerbitkan ceritanya sendiri hari ini berupa **tombol yang tidak dirender**. Tombol yang tidak dirender tetap dapat dipanggil.

**Keputusan:** peta transisi pindah ke domain sebagai data, dan tombol dirender **dari** peta itu.

| Berkas | Isi |
|---|---|
| `src/lib/domain/constants/content-workflow.js` **(BARU)** | `STORY_TRANSITIONS`, `EVENT_TRANSITIONS` — tiap entri `{ to, by: Role[] }` |
| `src/lib/domain/policies/ContentTransitionPolicy.js` **(BARU)** | `allowedTransitions(from, role)`, `canTransition(from, to, role)`, `isTerminal(status)`, `actorRoleFor(status)`, `assert(from, to, role)` |
| `src/lib/domain/services/ContentReviewService.js` **(BARU)** | Eksekusi transisi + efek samping (jejak audit, poin, timestamp). Repository disuntik lewat konstruktor. |

> **Konsekuensi yang harus terlihat di UI:** tombol keputusan di `/verifikator/cerita/[id]` dirender dari `allowedTransitions(story.status, session.role)` — bukan dari daftar tombol yang ditulis tangan per halaman. Inilah arti konkret "terintegrasi, bukan halaman tempelan" (PO-7).

### 5.2 State machine cerita — diagram

Tujuh status `STORY_STATUS` (`src/lib/domain/constants/community.js:150-158`) sudah lengkap dan **tidak ditambah**. Yang ditambahkan hanyalah peta transisi + kolom peran.

```
  [AWARDEE]              [VERIFIER]            [VERIFIER]              [VERIFIER]
    T-01                   T-02                  T-05                    T-06
DRAFT ─────────────▶ DIAJUKAN ───────────▶ REVIEW ─────────────▶ DISETUJUI ─────────────▶ TERPUBLIKASI
                         ▲                    │                                                  │
                         │ T-04               │ T-03                                             │ T-07
                         │ [AWARDEE]          │ [VERIFIER]                                       │ [VERIFIER|ADMIN]
                         │                    ▼                                                  ▼
                         └───────────── PERLU_REVISI                                       DIARSIPKAN
                                                                                          (terminal)
                                             │ T-08 [VERIFIER]                                   ▲
                                             └───────────────────────────────────────────────────┘
                                                        T-09 [SISTEM] consent dicabut / kedaluwarsa
                                                        dari status mana pun ────────────────────┘
```

Terminal tunggal `DIARSIPKAN` membawa `STORY_ARCHIVE_REASON` (`community.js:236-242`: `DITOLAK` · `KEDALUWARSA` · `CONSENT_DICABUT` · `PERMINTAAN_ANGGOTA` · `IDLE_TIMEOUT`). Menolak dan mencabut menghasilkan status yang sama karena perlakuan teknisnya identik — hilang dari publik, tetap ada di jejak audit. Perbedaannya hidup di `archiveReason`, bukan di status kedua.

### 5.3 Tabel transisi cerita

| # | Dari → Ke | Aktor | Prasyarat (ditegakkan domain) | Efek | Jejak audit |
|---|---|---|---|---|---|
| **T-01** | `DRAFT → DIAJUKAN` | AWARDEE | `Story.isSubmittable` (`Story.js:446-448`) = `wordCount ≥ MIN_KATA_NASKAH` (=300, `Story.js:38`) **&&** `hasMedia` **&&** `hasEsgTag`; **&&** consent publikasi tercentang | `submittedAt` terisi; **+10 poin** `poinUntuk(STORY_SUBMIT)` — poin diberikan pada **pengiriman**, bukan pada publikasi (Hal 11) | `story.submitted` |
| **T-02** | `DIAJUKAN → REVIEW` | VERIFIER | Bukan penulis sendiri (**C-19**) | `reviewerId` + `reviewedAt` terkunci; naskah keluar dari antrean bebas | `story.review_started` |
| **T-03** | `REVIEW → PERLU_REVISI` | VERIFIER | **Catatan terstruktur wajib** (field mana, kenapa). Kosong → transisi ditolak | `revisionCount++`; catatan masuk `reviewNotes[]` (`Story.js:76`) | `story.revision_requested` |
| **T-04** | `PERLU_REVISI → DIAJUKAN` | AWARDEE | `isSubmittable` diperiksa **ulang** | `submittedAt` diperbarui; **tanpa poin ulang** — `idempotencyKey` mencegah `STORY_SUBMIT` terhitung dua kali untuk satu naskah | `story.resubmitted` |
| **T-05** | `REVIEW → DISETUJUI` | VERIFIER | Checklist data sensitif 21 butir dinyatakan **lolos eksplisit** — bukan sekadar tiadanya tanda bahaya (`docs/04` §6.2); tag ESG/SDG sudah ditetapkan | `pfValidation{validatorId, at}` terisi; `sensitivityScan = CLEAR` | `story.approved` |
| **T-06** | `DISETUJUI → TERPUBLIKASI` | VERIFIER | **`Story.isPublishable` (`Story.js:432-440`) diperiksa ulang pada detik penerbitan** (§5.7) | `publishedAt` + `publishedById` terisi; cerita muncul di `/cerita` pada pemuatan berikutnya | `publish.executed` |
| **T-07** | `TERPUBLIKASI → DIARSIPKAN` | VERIFIER \| ADMIN | Alasan wajib dipilih dari `STORY_ARCHIVE_REASON` | Hilang dari zona publik seketika; isi tetap tersimpan | `takedown.completed` |
| **T-08** | `REVIEW → DIARSIPKAN` | VERIFIER | `archiveReason = DITOLAK` + alasan tertulis | Penolakan permanen; Awardee melihat alasannya | `story.rejected` |
| **T-09** | `* → DIARSIPKAN` | **SISTEM** | `hasActiveConsent === false` (dicabut **atau** kedaluwarsa; `MASA_BERLAKU_CONSENT_BULAN`, `ConsentRecord.js:179`) | `archiveReason = CONSENT_DICABUT`; berlaku juga pada `TERPUBLIKASI` | `consent.revoked_cascade` |

**Transisi yang sengaja TIDAK ADA:**

| Yang tidak ada | Alasan |
|---|---|
| `DIAJUKAN → DISETUJUI` (lompat review) | Menghapus satu-satunya titik tempat checklist dijalankan |
| `DISETUJUI → PERLU_REVISI` | Persetujuan sudah mengunci `pfValidation`. Bila ada temuan baru, jalannya `T-07` lalu naskah dikembalikan sebagai draf baru — supaya jejak persetujuan lama tidak terhapus |
| `ADMIN` sebagai aktor `T-02`/`T-05`/`T-06` | **C-14/C-16 = ✗ bagi Admin.** Keputusan konten milik Verifikator; Admin membaca, mengekspor, dan memegang jalur banding (X-13) |
| Transisi apa pun keluar dari `DIARSIPKAN` | Terminal. Naskah yang hidup kembali adalah naskah baru dengan `id` baru |

### 5.4 State machine kegiatan — ~~dua sumbu, bukan satu enum~~ **[DICABUT]**

> ## ⚠ SELURUH §5.4 DICABUT — yang berlaku `12-BUILD-CONTRACT-V2.md` §2.2
>
> Model **satu sumbu** yang berlaku: `EventStatus` diperluas dengan `DIUSULKAN` dan `DITOLAK`, keduanya
> **wajib** didaftarkan di `EVENT_STATUS_META` — yang berada di **`src/lib/domain/entities/CommunityEvent.js:72`**,
> **bukan** di `community.js`; konstruktor `:168` **melempar** untuk status yang tidak terdaftar di sana.
> Field: `proposedBy` / `proposedByRole` (bukan `createdById`/`createdByRole`, karena `SCHEMA_V2`
> mengindeks `proposedBy`). Helper: `kegiatanTampilPublik(status)` **berargumen tunggal**.
> `EventReviewStatus`, `EVENT_REVIEW_STATUS_META`, dan field `reviewStatus` **tidak dibuat**.
>
> **Alasan pencabutan.** Argumen korektness di bawah sahih, tetapi biayanya tidak sepadan: dua sumbu
> menuntut indeks Dexie kedua, dua peta META, dan dua helper yang harus dijaga sinkron oleh **lima paket
> yang berjalan paralel tanpa git** — dan bila WP-01 memilih `createdById` sementara `SCHEMA_V2`
> mengindeks `proposedBy`, indeksnya menunjuk field yang tidak pernah ada dan antrean verifikator kosong
> tanpa sebab (gejala R-07/R-08).
>
> **Tiga keberatan di bawah tetap ditangani, satu per satu:**
> 1. *"Satu enum tidak dapat menyatakan dua fakta"* — kasus "selesai tetapi pernah ditolak" tidak muncul
>    di seed maupun di PO-1…PO-7; jejaknya tetap tersimpan di `reviewedBy`/`reviewedAt`/`reviewNote`.
> 2. *"`countsForEngagementKpi` harus tetap utuh"* — ia bertumpu pada `isCompleted`, dan sebuah kegiatan
>    `DIUSULKAN` tidak dapat sekaligus `SELESAI` pada enum tunggal. Definisi KPI-05 **tidak diubah**.
> 3. *"`isUpcoming()` akan membocorkan usulan ke kalender publik"* — **keberatan ini benar dan ditangani
>    eksplisit**: `catalog.upcomingEvents()` **wajib** diturunkan dari `catalog.publishedEvents` (sudah
>    disaring `isPubliclyVisible`), bukan dari daftar mentah (`12` §2.2 & §2.12). `isUpcoming()` sendiri
>    tidak diubah — zona Awardee memakainya untuk menampilkan usulan miliknya sendiri.
>
> **`E-05` (`→ DIBATALKAN`) tetap ada**, dilayani `ContentReviewService.cancelEvent(event, actor, reason)`
> (`12` §2.9). **`E-04` DICABUT**: verifikator yang mengusulkan kegiatan **tidak boleh** menyetujui
> usulannya sendiri — dua akun verifikator sudah di-seed, sehingga jalur ini tidak menghambat operasi, dan
> `isSelfReview` menjadi kontrol yang benar-benar menyala.

Teks asli dipertahankan di bawah sebagai **rekaman keputusan**, bukan sebagai instruksi implementasi.

`EventStatus` hari ini (`CommunityEvent.js:61-66`) berisi **empat nilai eksekusi**: `TERJADWAL / BERLANGSUNG / SELESAI / DIBATALKAN`. Godaan yang jelas adalah menambahkan `DIUSULKAN` dan `DITOLAK` ke enum yang sama. **Ditolak.** Alasannya tiga, seluruhnya korektness:

1. **Satu enum tidak dapat menyatakan dua fakta.** Sebuah kegiatan bisa **sekaligus** sudah diterbitkan (sumbu publikasi) dan sudah selesai (sumbu eksekusi). Dengan satu enum, `SELESAI` menghapus informasi "pernah disetujui siapa".
2. **`countsForEngagementKpi` harus tetap utuh.** `CommunityEvent.js:355-359` = `isCompleted && hasEvidence && attendeeCount ≥ KPI_PARAMETERS.kuorumEngagement` (=10, `kpi-targets.js:200`). Menyisipkan status usulan ke enum yang sama membuat definisi KPI-05 bergantung pada urutan penulisan kondisi.
3. **`isUpcoming()` (`CommunityEvent.js:366-368`) hanya mengecualikan yang dibatalkan.** Kegiatan berstatus usulan akan **bocor ke kalender publik** kalau ia hidup di enum yang sama dan seseorang lupa menambah satu penyaring.

**Keputusan — dua sumbu ortogonal:**

| Sumbu | Enum | Nilai | Mengubah? |
|---|---|---|---|
| **Publikasi** | `EventReviewStatus` **(BARU)** | `DRAFT` · `DIAJUKAN` · `DITERBITKAN` · `DITOLAK` | Baru |
| **Eksekusi** | `EventStatus` | `TERJADWAL` · `BERLANGSUNG` · `SELESAI` · `DIBATALKAN` | **Tidak diubah** |

```
SUMBU PUBLIKASI (menentukan tampil/tidaknya di kalender publik)

        [AWARDEE|VERIFIER]            [VERIFIER]
   DRAFT ────────E-01────▶ DIAJUKAN ────E-02────▶ DITERBITKAN
     │                         │
     │ E-04 [VERIFIER, hanya   │ E-03 [VERIFIER]
     │ bila createdByRole =    ▼
     │ VERIFIER — §5.5]      DITOLAK (terminal)
     └──────────────────────────────────▶ DITERBITKAN

SUMBU EKSEKUSI (tidak menyentuh visibilitas)

   TERJADWAL ──▶ BERLANGSUNG ──▶ SELESAI          DIBATALKAN  ◀── E-05 [VERIFIER|ADMIN]
```

**Gerbang publik tunggal:**

```
CommunityEvent.isPubliclyVisible
  = reviewStatus === EventReviewStatus.DITERBITKAN   // sudah lolos peninjauan
 && status !== EventStatus.DIBATALKAN                // dan tidak dibatalkan
```

Helper `kegiatanTampilPublik(reviewStatus, status)` diletakkan **bersebelahan** dengan `ceritaTampilPublik()` (`community.js:478-480`) supaya kedua zona publik membaca pola yang sama. `EVENT_REVIEW_STATUS_META` membawa `{code, label, badgeColor, publik, peranAktor}` — menutup asimetri yang disorot survei: `STORY_STATUS_META` punya flag `publik`, `EVENT_STATUS_META` tidak, sehingga kalender publik hari ini tidak punya sumber kebenaran.

| # | Transisi | Aktor | Prasyarat | Jejak audit |
|---|---|---|---|---|
| **E-01** | `DRAFT → DIAJUKAN` | AWARDEE \| VERIFIER | Judul, jenis, jadwal, mode, lokasi/kanal, chapter terisi; `endsAt > startsAt` | `event.submitted` |
| **E-02** | `DIAJUKAN → DITERBITKAN` | VERIFIER | Bukan pengusul sendiri **kecuali** E-04; kelengkapan formal terpenuhi | `event.published` |
| **E-03** | `DIAJUKAN → DITOLAK` | VERIFIER | `reviewNote` **wajib** terisi | `event.rejected` |
| **E-04** | `DRAFT → DITERBITKAN` | VERIFIER | **Hanya bila `createdByRole === Role.VERIFIER`** (§5.5) | `event.self_published` |
| **E-05** | `status → DIBATALKAN` | VERIFIER \| ADMIN | Alasan tertulis; kegiatan tetap tampil di riwayat, hilang dari agenda mendatang | `event.cancelled` |

### 5.5 Konflik kepentingan — mengapa cerita mutlak dan kegiatan tidak

Aturan induk `docs/04` §3.1 berbunyi *"pengaju ≠ penyetuju ≠ penerbit; satu orang tidak boleh memegang dua peran pada satu cerita; di-enforce di layer policy, bukan di UI."* Konsolidasi tujuh aktor menjadi tiga peran (§2.6) melemahkannya. Karena itu dua aturan berikut **berbeda dengan sengaja**, dan perbedaannya harus tercatat — bukan ditemukan belakangan sebagai inkonsistensi.

> ## ⚠ §5.5 DIKOREKSI oleh `12-BUILD-CONTRACT-V2.md` §2.1 & §8.1
>
> **Verifikator tidak menulis cerita.** `WRITE_CONTENT` dicabut dari VERIFIER, sehingga C-19 pada jalur
> cerita menjadi **mustahil terjadi secara struktural**, bukan sekadar dilarang: `Story.authorId` menunjuk
> `Awardee`, dan `UserAccount.awardeeId` wajib `null` untuk VERIFIER (`12` §2.4). Guard `isSelfReview`
> tetap dipasang pada jalur cerita sebagai **pertahanan berlapis** dan diuji `domain-test.mjs` dengan
> aktor sintetis.
>
> **Konflik kepentingan berpindah ke jalur kegiatan — dan di sana ia DIPERKETAT, bukan dilonggarkan.**
> Kolom kanan tabel di bawah ("C-23: diizinkan, tercatat") dan transisi **E-04** **DICABUT**: verifikator
> yang mengusulkan kegiatan **tidak boleh** menyetujui usulannya sendiri
> (`isSelfReview(actor.id, event.proposedBy)`, `12` §2.2). Alasannya justru argumen operasional dokumen ini
> sendiri, dibalik: karena **dua** akun verifikator sudah wajib di-seed sejak hari pertama (§11.3), jalur
> "verifikator kedua" selalu tersedia, sehingga larangan ini tidak pernah memblokir agenda internal.
> Dengan itu K-04 terjawab: **tidak boleh**, dan aturan induk `docs/04` §3.1 (*pengaju ≠ penyetuju*)
> berlaku utuh untuk kedua jenis konten.

| Dimensi | Cerita (**C-19: mutlak dilarang**) | Kegiatan (~~C-23: diizinkan, tercatat~~ → **juga dilarang**) |
|---|---|---|
| Apa yang dipertaruhkan | Narasi atas nama Pertamina Foundation ke ruang publik; consent orang ketiga; data sensitif; klaim dampak | Undangan berjadwal berisi fakta yang dapat diverifikasi sendiri: tanggal, kanal, narasumber |
| Kerusakan bila keliru | Pelanggaran consent/PII yang **tidak dapat ditarik kembali** setelah tersebar | Agenda salah di kalender — dapat dikoreksi lewat `E-05` dalam hitungan menit |
| Gerbang | **Lima** syarat konjungtif `isPublishable` | **Tiga** kelengkapan formal |
| Operasional | Antrean naskah bisa menunggu peninjau kedua | Jadwal internal PF yang harus terbit hari itu juga; hari ini seed hanya punya **2 kegiatan mendatang** (§6.8) — menahan setiap agenda internal berarti kalender publik kosong |
| Keputusan | Verifikator **tidak pernah** menjadi hakim atas tulisannya sendiri | Verifikator boleh menerbitkan kegiatan buatannya, **tercatat** `createdByRole` + `event.self_published` |

Butir ini tetap dibuka untuk Corsec sebagai **K-04** (§11.4): bila jawabannya "tidak boleh", `E-04` dihapus dan `E-02` berlaku untuk semua — dan verifikator kedua menjadi wajib sejak hari pertama, bukan disarankan.

**Penegakan C-19 — tiga lapis, bukan satu:**

| Lapis | Bentuk |
|---|---|
| Domain | `AccessPolicy.canReviewContent(actor, story)` → `false` bila `story.authorId === actor.awardeeId`. Murni, sinkron, dapat diuji `node` polos. |
| Service | `ContentReviewService` memanggil policy **sebelum** transisi; kembalian `{ ok: false, reason: 'SELF_REVIEW' }` |
| UI | Tombol keputusan nonaktif + kalimat *"Anda penulis naskah ini — peninjauan harus dilakukan verifikator lain"* |

Permintaan yang tetap dikirim (mis. lewat konsol peramban) **ditolak service**, dan percobaannya tercatat sebagai `policy.overridden_attempt`. UI yang menyembunyikan tombol bukan kontrol keamanan; ia hanya menghemat satu klik dari orang yang memang tidak berniat menerobos.

**Konsekuensi operasional yang tidak boleh diabaikan:** dengan **satu** akun Verifikator, sebuah cerita yang ditulis verifikator tunggal menjadi *deadlock* permanen — tidak ada yang boleh meninjaunya, dan tidak ada tombol override (C-50). Karena itu §11.3 mewajibkan **dua** akun verifikator sejak seed.

### 5.6 SLA & eskalasi

Turunan `docs/04` §3.3 dan `docs/03` §5.10. SLA ditampilkan **kepada Awardee juga** — transparansi SLA mencegah persepsi *"naskah saya hilang"*.

| Antrean | SLA | Sumber | Perilaku saat terlampaui |
|---|---|---|---|
| Cerita `DIAJUKAN` (saring kelengkapan) | ≤ 2 hari kerja | `docs/04` §3.3 | Naik ke atas antrean, ditandai merah, Awardee dinotifikasi |
| Cerita `REVIEW` (keputusan) | ≤ 3 hari kerja | `docs/04` §3.3 | idem |
| Cerita `DISETUJUI` → terbit | ≤ 5 hari kerja | `docs/04` §3.3 | idem |
| Revisi oleh Awardee | ≤ 7 hari kalender | `docs/04` §3.3 | Lewat batas → kandidat `IDLE_TIMEOUT` |
| Kegiatan `DIAJUKAN` | ≤ 2 hari kerja `[USUL]` | selaras Kelas B | Naik ke atas antrean. **Tambahan wajib:** kegiatan yang `startsAt`-nya kurang dari 3 hari lagi naik ke prioritas tertinggi — SLA dua hari tidak berarti apa-apa bagi kegiatan yang berlangsung besok |
| Bukti kontribusi Kelas B / C / D | ≤ 2 / 3 / 5 hari kerja | `docs/03` §5.10 | Naik ke antrean prioritas + anggota dinotifikasi |

Perhitungan usia antrean memakai **hari kerja**, bukan hari kalender, dan tanggal acuannya `TODAY = 2026-07-20T00:00:00+07:00` (`seed-data.js:77`) pada mode demo — bukan `Date.now()` (`09` §6).

### 5.7 Lima gerbang publikasi — dan mengapa diperiksa dua kali

`Story.isPublishable` (`Story.js:432-440`) sudah **konjungtif penuh** dan tidak diubah:

```
isPublishable = isVerified            // DISETUJUI atau TERPUBLIKASI  (Story.js:361-366)
             && hasActiveConsent      // consent publikasi masih hidup
             && isSensitivityClear    // sensitivityScan === CLEAR
             && hasPfValidation       // pfValidation.validatorId terisi
             && hasMedia              // minimal satu lampiran
```

**Tanpa tombol override** (`docs/04` §3.4 — C-50/X-11). Tidak seorang pun, termasuk Admin.

Mengapa `T-06` wajib memeriksa **ulang**, bukan mempercayai hasil `T-05`:

| Perubahan yang bisa terjadi di antara persetujuan dan penerbitan | Akibat |
|---|---|
| Penulis mencabut consent | `hasActiveConsent` menjadi `false` — dan pencabutan itu **tidak melewati** verifikator |
| Consent **kedaluwarsa sendiri** setelah `MASA_BERLAKU_CONSENT_BULAN` (`ConsentRecord.js:179`) | Sama, **tanpa satu pun tindakan manusia**. Inilah kasus yang paling mudah terlewat: tidak ada peristiwa yang memicunya |
| Temuan sensitif baru dilaporkan | `sensitivityScan` menjadi `FLAGGED` |

Bila pemeriksaan ulang gagal karena consent, penerbitan **ditolak** dan cerita berpindah ke `DIARSIPKAN` dengan `archiveReason = CONSENT_DICABUT` (`docs/04` §4.5) — bukan dibiarkan menggantung di `DISETUJUI`, karena naskah yang menggantung akan dicoba lagi besok oleh verifikator lain.

### 5.8 Field baru pada entity — dan jebakan yang wajib diketahui

> **Peringatan teknis yang menentukan:** entity di proyek ini melakukan destructuring field tetap lalu `Object.freeze` (`CommunityEvent.js:139-198`, `Member.js:107-135`), dan `DexieRepository.toRow()` menyimpan hasil `toJSON()` (`DexieRepository.js:111-113`). Artinya **field baru yang tidak didaftarkan di konstruktor DAN di `toJSON()` akan hilang diam-diam pada penyimpanan pertama** — tanpa error, tanpa peringatan. Setiap field di bawah wajib ditambahkan ke entity domain, bukan hanya ke seed. Dan setiap field baru wajib punya **nilai bawaan** di konstruktor; field wajib tanpa bawaan akan melempar `TypeError` saat `toEntity()` membaca baris lama dan menjatuhkan seluruh halaman.

**`src/lib/domain/entities/Story.js`**

| Field / getter | Jenis | Alasan |
|---|---|---|
| `authorId` | rename dari `memberId` | Menunjuk `Awardee`. Maknanya berbeda dari `reviewerId` yang menunjuk `UserAccount` (§2.4) |
| `reviewerId`, `reviewedAt` | baru, `null` bawaan | Tanpa keduanya, kueri *"antrean yang sedang saya tinjau"* mustahil lewat indeks — indeks `stories` hari ini hanya `id, slug, memberId, status, community, publishedAt` (`db.js:62`) |
| `publishedById` | baru, `''` bawaan | `publishedAt` sudah ada; pemilik keputusannya belum |
| `revisionCount` | baru, `0` bawaan | Sumber chart C-19 dan sinyal naskah yang berputar-putar |
| `isAwaitingReview`, `needsRevision`, `latestReviewNote`, `reviewerRole` | getter baru | Dibaca kartu naskah Awardee dan antrean Verifikator |
| `isPublishable`, `isSubmittable`, `isPublic` | **tidak diubah** | Sudah benar; menyentuhnya berarti menyentuh gerbang |

**`src/lib/domain/entities/CommunityEvent.js`**

| Field / getter | Jenis | Alasan |
|---|---|---|
| `slug` | baru | `/kalender/[id]` butuh URL detail yang dapat dibagikan |
| **`proposedBy`, `proposedByRole`** *(eks `createdById`/`createdByRole` — nama dikoreksi per `12` §2.11; `SCHEMA_V2` mengindeks `proposedBy`)* | baru | PO-4. `proposedByRole` dicatat sebagai jejak audit; ia **tidak lagi** membuka `E-04`, yang sudah dicabut (§5.5) |
| ~~`reviewStatus`~~ | **TIDAK DIBUAT** | §5.4 dicabut. Yang berlaku: `EventStatus` + `DIUSULKAN`/`DITOLAK`, keduanya **wajib** didaftarkan di `EVENT_STATUS_META` (`CommunityEvent.js:72`); konstruktor `:168` melempar untuk status tak terdaftar. 13 kegiatan seed lama tetap tampil karena statusnya sudah `TERJADWAL`/`SELESAI` |
| `submittedAt`, `reviewedBy`, `reviewedAt`, `reviewNote`, `publishedAt` | baru, `null`/`''` bawaan | Jejak keputusan |
| `registeredAwardeeIds`, `attendeeAwardeeIds` | rename dari `registeredMemberIds`/`attendeeMemberIds` (`:110-111`) | PO-3 |
| `isProposal`, `isPubliclyVisible`, `monthKey`, `occursOn(date)` | getter baru | `monthKey`/`occursOn` mencegah grid bulan menghitung tanggal sendiri di komponen (CH-8 setara) |
| `countsForEngagementKpi` | **tidak diubah** | Definisi KPI-05; status usulan tidak boleh menyentuhnya |

**`src/lib/domain/constants/community.js`**

| Perubahan | Alasan |
|---|---|
| `STORY_STATUS_META[*].aktor` (teks bebas: *"Penanggung jawab chapter"*) → tambah **`peranAktor: UserRole`** (nama enum dikoreksi per `12` §2.1) | Route guard dan tombol harus membaca **enum**, bukan prosa Indonesia. Field `aktor` tetap dipertahankan sebagai label UI — dihapus akan memecah kartu naskah yang menampilkan *"siapa yang sedang memegang bola"* |
| `MEMBER_STATUS` → `AWARDEE_STATUS`, `MEMBER_STATUS_META` → `AWARDEE_STATUS_META` (`:251`, `:267`) | PO-3. **Breaking** — lihat §11.2 |
| ~~Tambah `EventReviewStatus`, `EVENT_REVIEW_STATUS_META`~~ | **DICABUT** (§5.4). `kegiatanTampilPublik(status)` **berargumen tunggal** ditambahkan; `EVENT_STATUS_META` + flag `publik` hidup di `CommunityEvent.js`, **bukan** di sini |

### 5.9 Kontrak service editorial

> **Tanda tangan di bawah DIGANTI oleh `12-BUILD-CONTRACT-V2.md` §2.9.** Dua perbedaan yang menentukan:
> (a) konstruktor **tanpa `idGenerator`**; (b) urutan argumen dikunci `(entity, actor, …argumenLain)`
> untuk **seluruh** method — versi lama menulis `archiveStory(story, reason, actor)`. Menukar dua argumen
> yang sama-sama "objek atau string" **tidak melempar**: `archiveStory(story, 'takedown', account)` akan
> menyimpan `archiveReason` berisi objek `UserAccount` dan memeriksa `isSelfReview` terhadap sebuah string.
> `E-04` dicabut (§5.4), sehingga `approveEvent` hanya melayani `E-02`.

```js
new ContentReviewService({ storyRepo, eventRepo, clock })
  // Setiap method mengembalikan { ok, entity, reason } — tidak melempar untuk
  // penolakan aturan bisnis. Melempar hanya untuk kesalahan pemrograman.
  await submitStory(story, actor)                                    // T-01
  await startReview(story, actor)                                    // T-02
  await requestRevision(story, actor, note)                          // T-03
  await approveStory(story, actor, { sensitivityConfirmed, note })   // T-05
  await publishStory(story, actor)                                   // T-06 — gate: story.isPublishable
  await archiveStory(story, actor, reason)                           // T-07 / T-08
  await proposeEvent(event, actor)                                   // E-01
  await approveEvent(event, actor)                                   // E-02 (E-04 dicabut)
  await rejectEvent(event, actor, note)                              // E-03
  await cancelEvent(event, actor, reason)                            // E-05
  await storyQueue() / await eventQueue()
  await pipeline() / await slaCompliance()   // pemasok C-19 & C-20; EditorialMetricsService TIDAK dibuat
```

Repository **disuntik lewat konstruktor tanpa nilai bawaan**. Memasang `storyRepository` sebagai default akan menyeret Dexie ke lapisan domain lewat pintu belakang dan memecah aturan arah ketergantungan yang justru sedang dijaga kelas ini. Perakitan terjadi satu tingkat di atas, di store — persis pola yang sudah dipakai `gamification.svelte.js` (`new GamificationEngine({ activityRepo: activityRepository })`). **Tidak ada `container.js`**: barrel `src/lib/infrastructure/repositories/index.js:13-24` sudah menjadi composition root, dan konstruktor berparameter sudah menjadi seam uji (`09` §1 K-1 tetap berlaku).

---

## 6. Spesifikasi Kalender Komunitas

### 6.1 Apa yang diminta sumber

**Hal 5, pilar 02 (verbatim):** *"Kalender Komunitas — Kalender kegiatan: upskilling, pertemuan komunitas, sharing session; Pembagian chapter komunitas"*

| # | Unsur | Bukti tekstual | Konsekuensi desain |
|---|---|---|---|
| 1 | **Kalender**, bukan sekadar daftar | kata *"Kalender kegiatan"* | Butuh representasi berbasis waktu (grid bulan), bukan hanya feed |
| 2 | **Tiga jenis** kegiatan eksplisit | *"upskilling, pertemuan komunitas, sharing session"* | Filter jenis dengan tiga nilai persis itu — sudah benar di `EventType` (`CommunityEvent.js:25-29`) |
| 3 | **Pembagian chapter** melekat pada kalender | berada di sel yang **sama** | Chapter bukan halaman terpisah; ia **dimensi penyaring kalender** |
| 4 | Kalender adalah wujud pilar | pilar 02 dari 6 | Harus punya destinasi sendiri, bukan cuplikan di halaman lain |

Penguat: **Hal 6** (*"2 aktivitas engagement komunitas terlaksana"* → kalender adalah satu-satunya sumber data KPI-05), **Hal 7** (Juni & Juli 2026 *"Upskilling anggota komunitas"* → berjalan pada periode demo), **Hal 4** (microsite sebagai *"rumah komunitas"*), dan **Hal 3** (*"aktivasi terbatas pada seremonial"* adalah kondisi yang ingin diperbaiki — kalender yang hanya terlihat anggota lama justru melestarikannya).

### 6.2 Route `/kalender` — tampilan

| Aspek | Ketentuan |
|---|---|
| **Peralih tampilan** | `Bulan` (grid 7 kolom) ↔ `Daftar` (lini masa berkelompok per bulan). Bawaan: **Daftar** pada < 768 px, **Bulan** pada ≥ 768 px |
| **Navigasi bulan** | Maju/mundur, dibatasi rentang program Hal 7 (Jan 2026) sampai 3 bulan ke depan dari `TODAY`. Di luar rentang, tombol nonaktif — bukan menampilkan bulan kosong tanpa henti |
| **Sel tanggal (Bulan)** | Angka tanggal + titik penanda berwarna `EVENT_TYPE_META.badgeColor`; maksimum 3 titik lalu `+n`. Sel diklik → panel daftar hari itu, bukan navigasi halaman |
| **Baris (Daftar)** | Blok tanggal (numeral besar + bulan singkat) │ judul │ baris meta `jenis · waktu WIB · chapter · daring/luring` │ status. Pemisah garis 1px — **tanpa shadow, tanpa radius, tanpa kartu** (§4.8) |
| **Isi kartu/baris** | Judul, jenis (chip `EVENT_TYPE_META`), waktu WIB, chapter penyelenggara, lokasi/kanal, nama narasumber, status |
| **Keadaan kosong** | *"Belum ada kegiatan terjadwal pada bulan ini. Agenda baru diumumkan tiap awal bulan."* — bukan grid kosong tanpa kata (D-05) |

### 6.3 Filter

| Filter | Nilai | Sumber |
|---|---|---|
| Jenis | Upskilling · Pertemuan komunitas · Sharing session | `EventType` (`CommunityEvent.js:25`) |
| Chapter | PF10 · PF11 · PF12 · Semua chapter | `CHAPTERS` (`community.js:110`) |
| Komunitas | SOBI · Womenpreneur · Lintas komunitas | `COMMUNITIES` (`community.js:47`) |
| Mode | Daring · Luring | `isOnline` |

Filter aktif wajib terlihat (chip terpilih) dan dapat dikosongkan satu klik. Filter **tidak** disimpan di URL pada rilis ini — kompleksitas sinkronisasi query-string tidak sepadan untuk mockup; bila ditambahkan kelak, ia satu-satunya sumber kebenaran, bukan cermin dari state komponen.

### 6.4 Batas visibilitas publik — inilah yang membuat kalender publik aman

| Ditampilkan publik | Disembunyikan | Alasan |
|---|---|---|
| Judul, jenis, tanggal & jam WIB, lokasi/kanal | **Daftar nama pendaftar & peserta** (`registeredAwardeeIds`, `attendeeAwardeeIds`) | Data pribadi; `docs/04` §4.3 `publikasi_nama` bawaan OFF |
| Chapter penyelenggara, komunitas sasaran | **Kode kehadiran / QR** | Mencegah klaim kehadiran palsu (`docs/03` §5.2) |
| Nama narasumber — **menunggu K-02** (§11.4) | **Nilai poin kehadiran** dan tabel skor apa pun | PO-2 / H-5 |
| Status: Terjadwal / Berlangsung / Selesai | **Kuota tersisa dan `attendanceRate`** | Angka operasional. *"Sisa 2 kursi"* di publik menciptakan tekanan palsu |
| Cacah agregat *"12 kegiatan terlaksana pada 2026"* | **`outcomeNote` & `evidenceRefs` mentah** | Bukti ESG diperiksa dulu (`docs/02` §4.2) |
| Alamat lengkap kegiatan luring — **menunggu K-01** (§11.4) | | Alamat tempat berpotensi menjadi isu keamanan peserta |

### 6.5 `EventListPanel.svelte` — satu komponen, empat tempat

| Aspek | Ketentuan |
|---|---|
| **Penempatan publik** | `<aside>` kolom kanan pada `/cerita` **dan** `/cerita/[slug]`; lebar 320–360 px pada ≥ 1024 px |
| **Responsif** | < 1024 px: panel **turun ke bawah** konten sebagai satu blok. **Tidak disembunyikan** — kegiatan adalah alasan orang kembali, dan menyembunyikannya di ponsel berarti menyembunyikannya dari mayoritas pembaca yang datang dari tautan WhatsApp |
| **Isi** | `limit` kegiatan terdekat, urut menaik dari hari ini; tiap baris: pita tanggal (tgl + bulan singkat), judul (maks 2 baris), chip jenis, waktu WIB, chapter |
| **Kepala** | Judul panel + tautan `Lihat semua →` ke `/kalender` |
| **Keadaan kosong** | *"Belum ada kegiatan terjadwal. Kegiatan baru diumumkan tiap awal bulan."* — panel tetap tampil, tidak menghilang |
| **Props** | Kontrak final: `12-BUILD-CONTRACT-V2.md` §2.13. `variant` bernilai **`'panel'` \| `'rail'` \| `'strip'`** (baku `'panel'`). Nilai **`'list'`** adalah alias lama dan **DILARANG dipakai** — komponen tidak mengenalinya, jatuh ke baku tanpa error, dan panel `<aside>` di `/cerita` merender lebar penuh tanpa satu pun gerbang menyala. `events` bertipe `EventCardVM[]` (typedef §2.13). |
| **Larangan** | Tidak boleh memformat tanggal sendiri — wajib `$lib/utils/date.js` / `format.js`. Tidak boleh menerima `pointsReward` |

**Empat tempat pemakaian — satu komponen, bukan empat salinan (PO-7):**

| Zona | Route | `limit` | Catatan |
|---|---|---|---|
| Publik | `/` §Agenda Komunitas | 4 | Berdampingan dengan mini-kalender bulan berjalan |
| Publik | `/cerita`, `/cerita/[slug]` | 5 | Panel `<aside>` — memenuhi PO-4 |
| Awardee | `/awardee` (dasbor) | 3 | Kegiatan yang dapat diikuti |
| Verifikator | `/verifikator` (papan antrean) | 3 | Agenda terdekat + cacah usulan menunggu |

### 6.6 Sumber data tunggal

Kalender publik, panel event di blog, kalender Awardee, dan kartu di landing **wajib** membaca dari **satu** store dan **satu** penyaring domain:

```
catalog.publishedEvents  (BARU, derived di src/lib/stores/catalog.svelte.js)
    └─▶ EventRepository.publiclyVisible()
            └─▶ CommunityEvent.isPubliclyVisible   ← satu-satunya keputusan
```

Dilarang ada tiga tempat yang masing-masing memutuskan *"kegiatan mana yang boleh tampil"*. Itu cara paling umum sebuah kegiatan tampil di satu halaman dan tidak tampil di halaman lain — dan bug seperti itu baru ketahuan saat dipresentasikan. Pola yang ditiru sudah ada dan sudah benar: `StoryRepository.published()` menyaring lewat `story.isPublic`, **bukan** lewat literal status.

### 6.7 Pengusulan kegiatan

**Oleh Awardee — `/awardee/kalender` tab "Usulan saya"**

| # | Ketentuan |
|---|---|
| 1 | Formulir: judul, jenis, tanggal & jam mulai/selesai, mode (daring/luring), lokasi/kanal, chapter, komunitas sasaran, kuota, deskripsi, narasumber |
| 2 | Validasi domain: `endsAt > startsAt`; `startsAt` tidak boleh di masa lalu; judul & deskripsi tidak kosong. Ditolak dengan pesan yang menyebut **field mana** |
| 3 | Tersimpan `reviewStatus = DIAJUKAN`, `createdByRole = AWARDEE` — **belum** tampil di kalender publik |
| 4 | Tab "Usulan saya" menampilkan status + catatan verifikator bila `DITOLAK` |

**Oleh Verifikator — `/verifikator/kegiatan`**

| # | Ketentuan |
|---|---|
| 1 | Antrean usulan `DIAJUKAN` urut terlama dahulu, dengan usia antrean & penanda SLA 2 hari kerja (§5.6) |
| 2 | Formulir buat kegiatan sendiri → langsung `DITERBITKAN` lewat `E-04`, tercatat `event.self_published` (§5.5) |
| 3 | Menolak tanpa `reviewNote` → ditolak sistem |
| 4 | Kegiatan yang `startsAt`-nya < 3 hari lagi naik ke prioritas tertinggi |

### 6.8 Data seed yang wajib ditambah — dan mengapa aman

**Masalah terukur.** `NASKAH_KEGIATAN` (`seed-data.js:584`) berisi **13** entri dengan `day` = 44, 71, 98, 116, 133, 147, 158, 166, 174, 180, 190, 214, 228. `HARI_INI = 200` (`seed-data.js:89`). Jadi hanya **dua** kegiatan mendatang: `day 214` (3 Agustus 2026) dan `day 228` (17 Agustus 2026). Kalender publik dengan dua titik akan terasa kosong, dan panel `EventListPanel` berlimit 5 hanya akan terisi dua baris.

**Tindakan.**

| # | Tambahan | Ketentuan |
|---|---|---|
| 1 | **4–6 naskah** ber-`day` 205–260 (akhir Juli–September 2026) | Status otomatis `TERJADWAL` karena `day > HARI_INI` (`seed-data.js:1580`). Sertakan **minimal satu luring** (`luring: true`) agar variasi tampilan terlihat, dan sebar ketiga `EventType` |
| 2 | **2 naskah** ber-`reviewStatus: DIAJUKAN`, `createdById: 'MBR-0xx'`, `createdByRole: AWARDEE` | Mengisi antrean Verifikator sejak layar pertama — tanpa ini `/verifikator/kegiatan` kosong saat didemokan |
| 3 | Perbaiki JSDoc `seed-data.js:574` | Tertulis *"Dua belas agenda"* padahal isinya 13 (dan akan menjadi ≥19) |

**Analisis determinisme — diverifikasi dengan membaca generatornya, bukan diasumsikan:**

| Fungsi | Memakai `rng`? | Akibat penambahan naskah |
|---|---|---|
| `bangkitkanKegiatan(profiles)` (`seed-data.js:1576`) | **Tidak** — tanda tangannya tidak menerima `rng` sama sekali | Nol pergeseran |
| `tautkanKeikutsertaan(rng, …)` (`:2272`) | **Ya** — `intBetween`/`sample` dipanggil **per kegiatan**, termasuk `sample(rng, belumHadir, intBetween(rng, 3, 12))` yang jalan untuk **setiap** kegiatan tanpa memandang status | Menggeser aliran `rng` sesudahnya |
| `finalisasiAnggota(rng, profiles, activities)` (`:2154`) | **Ya**, tetapi **hanya untuk penukaran reward** (`chance`, `intBetween`, `sample`, `hariCondongBaru`, `jamAcak`) | Daftar `redemptions` berubah |

**Kesimpulan yang dapat dijamin:** `points`, `seasonPoints`, `streak`, `tier`, dan `badgeCodes` dihitung **murni dari buku besar aktivitas** di `finalisasiAnggota` (`:2167-2178`) — tanpa satu pun `rng`. Buku besar itu sendiri dibangkitkan **sebelum** `tautkanKeikutsertaan`. Karena itu:

> Menambah naskah kegiatan **tidak mengubah** total poin, distribusi tier, streak, maupun lencana. Yang berubah hanyalah daftar peserta kegiatan dan daftar penukaran reward. Distribusi tier yang diwajibkan `09` §6 (±22/16/12/7/3, mengerucut) **tetap utuh**, dan invarian *"jumlah `PointActivity` = total poin"* tidak tersentuh.

**Aturan tetap berlaku:** `SEED_VERSION` (`seed/bootstrap.js:30`) **wajib** naik bersamaan dengan penambahan ini, jika tidak peramban yang sudah pernah membuka aplikasi akan *early-return* di `bootstrap.js:77-80` dan tidak pernah melihat kegiatan baru — kegagalan senyap, tanpa pesan apa pun.

### 6.9 `/kalender/[id]` — detail kegiatan publik

| # | Ketentuan |
|---|---|
| 1 | Menampilkan judul, deskripsi, jenis, jadwal WIB penuh, lokasi/kanal, chapter, komunitas sasaran, narasumber |
| 2 | Tombol **"Tambah ke kalender"** → berkas `.ics` dibangun sebagai **string di klien** (`text/calendar`, Blob + `URL.createObjectURL`). **Tanpa dependensi npm baru** (`09` §8) |
| 3 | CTA `"Ikut kegiatan ini"` → `/masuk?next=/awardee/kalender/[id]` bagi tamu; langsung ke halaman kalender Awardee bila sudah masuk |
| 4 | `id` tidak dikenal **atau** `isPubliclyVisible === false` → halaman *"Kegiatan tidak ditemukan"*, bukan galat dan bukan isi kegiatan |

---

## 7. Spesifikasi Dashboard Admin — Apache ECharts

### 7.1 Prasyarat teknis: `EChart.svelte` harus diperbaiki lebih dulu

Pembungkus hari ini (`src/lib/components/EChart.svelte`, 75 baris) sudah benar pada empat hal yang didokumentasikannya sendiri (`browser` guard `:43`, impor dinamis `:50`, `ResizeObserver` `:60-61`, `dispose()` `:63-67`) dan punya satu keunggulan atas pola rujukan: penjagaan dispose ganda `if (chart && !chart.isDisposed())`. Tiga cacat harus ditutup sebelum jumlah chart naik dari 2 menjadi 12.

| # | Cacat | Bukti | Perbaikan |
|---|---|---|---|
| **E-1** | `option` dibaca **di dalam** efek siklus hidup (`EChart.svelte:45` `const opt = option;` di dalam `$effect` yang juga membuat & membongkar chart) | Setiap perubahan filter dasbor **membongkar canvas dan memuat ulang modul ECharts**: animasi hilang, ada kedipan putih, `import('echarts')` dijalankan berkali-kali | **Pisahkan menjadi tiga efek**: (1) siklus hidup — bergantung pada `container` saja; (2) data — `setOption(opt, { notMerge: true })`; (3) interaksi — `chart.on('click')` + `chart.off()` saat handler berganti |
| **E-2** | `import('echarts')` memuat bundel **utuh ±1 MB** | `EChart.svelte:50` | Berkas baru `src/lib/charts/_echarts.js` memakai `echarts/core` + `echarts.use([...])`. Enam tipe yang benar-benar dipakai: `BarChart, LineChart, PieChart, RadarChart, GaugeChart` + `GridComponent, TooltipComponent, LegendComponent, TitleComponent, RadarComponent` + `LabelLayout, CanvasRenderer`. **Dilarang** `import 'echarts'` di komponen chart mana pun |
| **E-3** | Tidak ada keadaan kosong — `option = {}` menghasilkan kotak kosong | `EChart.svelte:29`, `:52-55` | `option = null` → `chart.clear()` + pesan `emptyMessage` di tengah wadah. Memenuhi CH-4 dan DoD butir 7 |
| **E-4** | `ResizeObserver` menyala tanpa peredam dan tanpa penjagaan lebar 0 | `:60-61` | Peredam `requestAnimationFrame` + **lewati bila `contentRect.width === 0`**. Penting justru karena §7.4: tab non-aktif ber-`display:none` punya lebar 0, dan ECharts yang menggambar ulang pada ukuran nol **tidak pulih sendiri** |

Props yang bertambah (`emptyMessage`, `onclick`) bersifat **aditif** terhadap kontrak `09` §5 (`EChart {option, height, cls}`) — tidak ada pemanggil lama yang pecah.

`src/lib/charts/_chartTheme.js` (165 baris) **tidak diganti**. Ia lebih baik daripada pola rujukan karena `tierPalette` (`:78`) **diturunkan dari `TIER_TABLE`**, bukan disalin — sehingga warna tier di chart dijamin identik dengan warna chip tier. Menyalin heksadesimal ke berkas chart akan melanggar `09` §2 sekaligus memecah jaminan itu.

### 7.2 Katalog chart wajib (12 ID katalog · 17 berkas komponen)

> **Klarifikasi hitungan.** Dua belas **ID katalog** di bawah (C-01…C-20) diwujudkan sebagai **11 berkas
> komponen BARU** (`12` §3.5 WP-07) ditambah **6 berkas lama** yang diperbaiki
> (`TrendLineChart`, `TierDistributionChart`, `AmplificationBarChart`, `EsgRadarChart`,
> `CommunityPieChart`, `KpiGaugeChart`) — total **17 berkas** di `/admin`. Klaim "10 chart" pada §3.2
> dan §7.3 dikoreksi menjadi angka ini.

Penomoran mengikuti katalog `docs/02` §6.2 (C-01…C-21). Seluruhnya dapat diisi dari repository yang sudah ada.

| ID | Komponen | Tab | Jenis | Sumbu X / indikator | Sumbu Y | Seri | Sumber data | Pertanyaan yang dijawab |
|---|---|---|---|---|---|---|---|---|
| **C-01** | `CoverageGaugeChart.svelte` | Ringkasan | `gauge` | — | 0–100 % | 1 seri; `axisLine.lineStyle.color = [[0.60,merah],[0.75,kuning],[1,hijau]]`, `markLine` di 75 | `KpiCalculator.snapshot()` → `M-01` | *Berapa persen penerima manfaat sudah terdata dan ber-consent?* |
| **C-02** | `CoverageSegmentBar.svelte` | Komunitas | `bar` horizontal | 0–100 % | kategori: SOBI, Womenpreneur, PF10, PF11, PF12 | S1 terdaftar %, S2 sisa (`stack`, abu), `markLine` di 75 | `AwardeeRepository` di-`groupBy` community & chapter | *Segmen mana yang tertinggal dari target 75%?* |
| **C-03** | `DisseminationComboChart.svelte` | Ringkasan | `bar` + `line` | bulan Jan–Jul 2026 | kiri: jumlah konten · kanan: hari diseminasi | S1 `bar` konten (M-02), S2 `line` hari unik (M-03, `yAxisIndex:1`), `markLine` di 2 | `BroadcastRepository.sentInMonth`, `.disseminationDaysByMonth` | *Apakah ritme 1–2 konten & ≥2 hari per bulan terpenuhi?* |
| **C-04** | `AmplificationTrendLine.svelte` | Amplifikasi | `line` | bulan | 0–100 % | S1 `AR_aktif`, S2 `AR_total` (`lineStyle.type:'dashed'`), `markLine` target 50% | `ActivityRepository` aksi `SHARE_PRIVATE`/`SHARE_PUBLIC`, anggota unik | *Apakah 50% anggota ikut mengamplifikasi, dan apakah selisihnya melebar?* |
| **C-05** | `KpiRadarChart.svelte` | Ringkasan | `radar` | 5 indikator KPI, `max: 100` (% capaian ternormalisasi) | — | S1 Target (100 semua, abu putus-putus), S2 Aktual (`areaStyle`) | `KpiCalculator.snapshot()` | *Bentuk capaian program — sisi mana yang penyok?* |
| **C-11** | `TierDistributionChart.svelte` **(ada, `:1-124`)** | Komunitas | `bar` \| `donut` | `0–24`, `25–49`, `50–99`, `100–149`, `150+` | jumlah awardee | 1 seri, warna per tier dari `tierPalette` | `TierResolver.distribution()` (`TierResolver.js:126`) | *Komunitas mengerucut sehat, atau menumpuk di bawah 25 poin?* |
| **C-13** | `PointSourceStackedBar.svelte` | Komunitas | `bar` bertumpuk horizontal | total poin | bulan Jan–Jul | 9 seri, satu per `ActivityType` (Hal 11), `stack:'poin'` | `ActivityRepository.byTypeInMonth`, `.monthlyTotals` | *Poin datang dari jenis kontribusi apa — aksi ringan atau kontribusi bermakna?* |
| **C-14** | `EngagementFunnelArea.svelte` | Komunitas | `line` + `areaStyle` | bulan | jumlah orang | S1 awardee kumulatif, S2 aktif (90 hari, `KPI_PARAMETERS.windowAnggotaAktifHari`), S3 pengamplifikasi | `AwardeeRepository.joinedAt` + `ActivityRepository` | *Berapa yang terdaftar berubah menjadi aktif, lalu menjadi pengamplifikasi?* |
| **C-17** | `EsgEvidenceGateBar.svelte` | ESG & Dampak | `bar` horizontal | jumlah record | Terdokumentasi → +Catatan hasil → +Tag ESG/SDG → +Sumber bukti → **Layak ESG** | 1 seri **menurun monoton** | `EsgEvidenceService.evidenceChecklist`, `.incompleteQueue` | *Di gerbang mana bukti ESG paling banyak gugur?* |
| **C-18** | `ReachEstimateBand.svelte` | ESG & Dampak | `line` berpita | bulan | estimasi orang | S1 batas bawah (transparan), S2 selisih (`stack` + `areaStyle`) membentuk pita, S3 titik tengah | `KpiCalculator.organicReach()` (`:141`) | *Berapa jangkauan organik yang masuk akal — dan seberapa lebar ketidakpastiannya?* |
| **C-19** | `EditorialPipelineFunnel.svelte` **(BARU — PO-4)** | Ringkasan | `funnel` | — | cacah naskah | 1 seri: Draf → Diajukan → Review → Disetujui → Terpublikasi, + rasio konversi antar tahap | `ContentReviewService.pipeline()` (§7.2 koreksi) | *Dari naskah yang masuk, berapa yang benar-benar terbit — dan di tahap mana penyusutan terbesar?* |
| **C-20** | `VerifierSlaBar.svelte` **(BARU — PO-4)** | Ringkasan | `bar` bertumpuk | jenis antrean (cerita/kegiatan/bukti) | jumlah keputusan | S1 dalam SLA, S2 lewat SLA | `ContentReviewService.slaCompliance()` (§7.2 koreksi) — **bergantung pada `submittedAt` + `reviewedAt` (§5.8)** | *Berapa persen keputusan selesai dalam SLA 2/3/5 hari kerja?* |

**Aturan CH-8 ditegakkan:** C-19 dan C-20 memerlukan agregasi yang belum ada di service mana pun. Menghitungnya di komponen Svelte melanggar `docs/02` §8.

> **KOREKSI — `EditorialMetricsService` TIDAK dibangun (`12` §2.9 & §8.1).** Kedua agregasi pindah menjadi
> method `ContentReviewService`, yang **sudah** menerima `storyRepo` dan `eventRepo` lewat konstruktor:
>
> ```js
> await contentReview.pipeline()        // -> [{ stage, count, conversionFromPrev }]      C-19
> await contentReview.slaCompliance()   // -> [{ queue, withinSla, breachedSla, medianDays }]  C-20
> ```
>
> Alasan: kelas keempat yang membaca antrean yang sama menghasilkan **dua sumber kebenaran** atas
> "naskah mana yang sedang menunggu" (KP-3) — tepat cacat yang membuat satu halaman menampilkan angka
> berbeda dari halaman lain. CH-8 tetap terpenuhi: perhitungannya di lapisan **domain**, bukan di komponen.
> Komponen chart membaca hasilnya lewat store `editorial` (`12` §2.12). `VerifierSlaBar.svelte` (C-20)
> tercantum sebagai berkas milik **WP-07** (`12` §3.5), sehingga tidak lagi yatim.

**Chart cadangan** (bila data seed diperluas — jangan dipaksakan bila datanya belum ada, CH-9):

| ID | Komponen | Jenis | Prasyarat data yang belum ada |
|---|---|---|---|
| C-07 | `ChannelSplitPie.svelte` | `pie` donut | field `channel` pada aktivitas amplifikasi |
| C-06 | `AmplificationFunnelChart.svelte` | `funnel` | `broadcastRecipients` (delivered/opened) — belum di-seed |
| C-21 | `GovernanceComplianceBar.svelte` | `bar` | `ConsentRepository.coverageSummary` + rasio persetujuan cerita |
| C-15 | `AwardeeProvinceMap.svelte` | `map` | GeoJSON Indonesia — menambah **aset**, bukan dependensi npm |

**Dua chart menganggur yang harus dipakai atau dihapus:** `CommunityPieChart.svelte` (94 baris) dan `KpiGaugeChart.svelte` (97 baris) hari ini **tidak dipakai di mana pun**. `KpiGaugeChart` menjadi basis C-01; `CommunityPieChart` menjadi basis C-07 bila K-06 dijawab, atau dipakai untuk sebaran komunitas pada tab Komunitas. Komponen yang tidak dirujuk siapa pun adalah utang yang membusuk diam-diam.

### 7.3 Tata letak dasbor

Empat tab mengikuti `docs/02` §6. Halaman `/admin` hari ini memuat 2 chart (`TrendLineChart` `:237`, `TierDistributionChart` `:284`); ia menjadi tuan rumah 12.

| Tab | Chart | Pertanyaan tab |
|---|---|---|
| **1 · Ringkasan** | C-01, C-05, C-03, C-19, C-20 | *Apakah program berjalan, dan di mana ia tersendat?* |
| **2 · Amplifikasi** | C-04 (+ C-07 bila ada data) | *Apakah komunitas benar-benar menyebarkan konten?* |
| **3 · Komunitas** | C-02, C-11, C-13, C-14 | *Siapa yang tumbuh, siapa yang tertinggal?* |
| **4 · ESG & Dampak** | C-17, C-18 (+ C-21) | *Apakah bukti dampak layak dilaporkan?* |

**Susunan dalam tab:** baris pertama satu chart lebar penuh sebagai jangkar tab, di bawahnya grid 2 kolom. Setiap chart dibungkus panel berjudul + satu kalimat pertanyaan yang dijawabnya — kalimat itu bagian dari spesifikasi, bukan hiasan: chart tanpa pertanyaan akan dibaca sebagai dekorasi.

Halaman admin lain yang sudah memuat chart tidak dipindah: `admin/broadcast:283` (`AmplificationBarChart`), `admin/gamifikasi:399` & `:433`, `admin/esg:388` (`EsgRadarChart`). `admin/laporan` (754 baris, halaman terbesar) tetap **tanpa chart** — ia halaman ekspor & rekap; menambahkan chart di sana menduplikasi tab Ringkasan.

### 7.4 Perilaku responsif

| Lebar | Perilaku |
|---|---|
| ≥ 1280 px | Grid 2 kolom; tinggi chart 320 px; legend kanan |
| 768–1279 px | Satu kolom; tinggi 280 px; legend bawah |
| < 768 px | Satu kolom; tinggi 240 px; legend bawah; label sumbu X dimiringkan atau diringkas. Chart yang tetap terlalu padat (C-13 sembilan seri) **menggulir di dalam wadahnya sendiri** — halaman tidak boleh menggulir mendatar (DoD 8) |
| Tab | Bilah tab menjadi chip yang dapat digulir mendatar; **bukan** menyusut sampai tak terbaca |

**Aturan pemasangan tab yang wajib:** chart pada tab non-aktif **dilepas dari DOM** (`{#if}` per tab), bukan disembunyikan dengan `display:none`. Dua alasan: (a) instans ECharts yang tersembunyi tetap memegang canvas & listener; (b) `ResizeObserver` pada wadah berlebar 0 memicu `resize()` ke ukuran nol dan **ECharts tidak pulih sendiri** setelahnya — chart tampil kosong saat tab dibuka kembali. Penjagaan `contentRect.width === 0` (E-4) adalah jaring kedua, bukan pengganti.

### 7.5 Aturan baku chart (mengikat)

| # | Aturan | Rujukan |
|---|---|---|
| CH-1 | Semua chart lewat `EChart.svelte` `{ option, height }` dan token `_chartTheme.js` | `09` §5 |
| CH-2 | Warna tier **wajib** dari `tierPalette` yang diturunkan `TIER_TABLE`; tidak boleh diganti maupun disalin | `docs/02` §6.3 |
| CH-3 | Chart berisi estimasi (C-18) memakai `lineStyle.type:'dashed'` + lencana **"Estimasi"** | `docs/02` §6.3 |
| CH-4 | Nol data → pesan kosong eksplisit, **bukan** grafik nol | `docs/02` §6.3 |
| CH-5 | Seluruh label, legenda, dan tooltip **Bahasa Indonesia**; angka lewat `angka()` (`_chartTheme.js:124`, `toLocaleString('id-ID')`) | `09` §7.5 |
| CH-6 | Jangan mengandalkan warna saja — angka wajib ada di label atau tooltip | `docs/02` §6.3 aksesibilitas |
| CH-7 | Tidak ada angka poin/ambang tier literal di berkas chart; impor dari `domain/constants/` | `09` §2 |
| CH-8 | Data chart dihitung di **service domain**, bukan di komponen Svelte | `docs/02` §8 |
| CH-9 | Tab yang belum punya pipeline bukti menampilkan *"Menunggu pipeline bukti"*, bukan angka nol | `docs/02` §7.3 |
| CH-10 | Satu chart = satu berkas di `src/lib/charts/`; tidak ada `option` yang dirakit di dalam `+page.svelte` | `09` §4 WP-5 |

---

## 8. User Story Revisi — US-R01…US-R31

> Prefiks **US-R** = *Revisi*, agar tidak bertabrakan dengan US-001…US-045 pada `01-BRD-SRS.md` §6.
> Prioritas: **M** = Must · **S** = Should.
> Setiap cerita tertelusur ke **bagian dokumen ini** dan ke **halaman dokumen sumber** (`docs/00-SOURCE-BRIEF.md`, PDF 12 halaman).

### A. Peran, autentikasi & route guard

#### US-R01 — Masuk dengan email dan kata sandi · **M**
*Sebagai* pengguna terdaftar, *saya ingin* masuk memakai email dan kata sandi, *agar* identitas dan kewenangan saya jelas — bukan dipilih dari daftar peran.
**Tertelusur:** §2.1, §3.6 · Hal 10 (governance) · `docs/09` §5 (kontrak `session`)

| # | Acceptance Criteria |
|---|---|
| AC-1 | **Given** saya membuka `/masuk`, **When** halaman tampil, **Then** tersedia formulir email + kata sandi berlabel Bahasa Indonesia dan **tidak ada** pemilih peran (mengganti `(public)/masuk/+page.svelte:55-205` seluruhnya) |
| AC-2 | **Given** kredensial sah, **When** saya menekan Masuk, **Then** sesi terbentuk dan saya diarahkan ke `session.homePath()` sesuai peran: `/awardee`, `/verifikator`, atau `/admin` |
| AC-3 | **Given** kredensial keliru, **When** saya menekan Masuk, **Then** muncul pesan generik *"Email atau kata sandi tidak cocok"* — pesan **sama** untuk email tidak dikenal dan sandi salah, sehingga tidak membocorkan email mana yang terdaftar |
| AC-4 | **Given** saya sudah masuk lalu memuat ulang halaman, **When** aplikasi dihidrasi, **Then** sesi dan peran saya pulih tanpa perlu masuk kembali |
| AC-5 | **Given** ini mockup, **When** `/masuk` tampil, **Then** panel bantuan mencantumkan kredensial demo tiap peran **dengan penanda tegas bahwa autentikasi ini tiruan**, dan daftar itu dibaca dari **satu** sumber (`accountRepository.demoAccounts()` → `{email, roleLabel, hint}` **tanpa** kata sandi) — bukan disalin ke komponen |

#### US-R02 — Tiga peran dengan kewenangan berbeda · **M**
*Sebagai* pemilik program, *saya ingin* sistem mengenal AWARDEE, VERIFIKATOR, dan ADMIN, *agar* pemisahan tugas governance benar-benar berjalan.
**Tertelusur:** §2.1–2.6 · Hal 10 · `docs/04` §3.1

| # | Acceptance Criteria |
|---|---|
| AC-1 | **Given** kode dijalankan, **Then** `Role` (`domain/constants/roles.js`) memuat persis tiga nilai; `MemberRole` di `Member.js:32-35` **dihapus** (diverifikasi nol importir eksternal) |
| AC-2 | **Given** saya masuk sebagai peran mana pun, **Then** navigasi hanya menampilkan destinasi yang berhak saya buka, dibaca dari `navForZone(zone)` |
| AC-3 | **Given** peran ditambah atau kewenangan berubah, **Then** tidak ada komponen yang perlu disunting — kewenangan dibaca dari `AccessPolicy` + `ROLE_PERMISSIONS`, bukan dari rangkaian `if` yang tersebar |
| AC-4 | **Given** akun Verifikator dan Admin ada, **Then** keduanya **tidak** menjadi baris pada tabel awardee, sehingga `KpiCalculator.#coverage`, `LeaderboardService.#visibleMembers`, dan `TierResolver.distribution` tidak terkontaminasi (§2.4) |

#### US-R03 — Route guard per peran · **M**
*Sebagai* pemilik program, *saya ingin* setiap zona menolak peran yang tidak berhak, *agar* kewenangan tidak sekadar disembunyikan di menu.
**Tertelusur:** §3.6, §3.7 · Hal 10

| # | Acceptance Criteria |
|---|---|
| AC-1 | **Given** saya belum masuk, **When** saya membuka `/awardee`, `/verifikator`, atau `/admin`, **Then** saya dialihkan ke `/masuk?next=<jalur asal>` |
| AC-2 | **Given** saya masuk sebagai AWARDEE, **When** saya mengetik `/admin` di bilah alamat, **Then** tampil panel penjelasan *"Halaman ini bukan untuk peran Anda"* dengan tombol ke beranda peran saya — **bukan** pengalihan senyap |
| AC-3 | **Given** saya masuk sebagai VERIFIKATOR, **When** saya membuka `/admin/laporan`, **Then** akses ditolak (larangan X-08) |
| AC-4 | **Given** saya berhasil masuk setelah dialihkan, **Then** saya mendarat di halaman yang semula saya tuju — kecuali jalur itu di luar kewenangan peran saya, yang oleh `safeNext()` diarahkan ke beranda peran agar tidak terbentuk gelang pantul tak berujung |
| AC-5 | **Given** `session.ready === false`, **When** guard dijalankan, **Then** ia **menunggu** dan tidak mengalihkan — `role === null` di sini berarti *belum tahu*, bukan *tamu* |
| AC-6 | **Given** guard dijalankan, **Then** logika keputusannya berada di **satu** fungsi domain (`canAccess()`) yang dipanggil `ZoneGuard.svelte`, dipakai ketiga layout zona — bukan disalin tiga kali |

#### US-R04 — Refactor penamaan member → awardee · **M**
*Sebagai* pengembang, *saya ingin* seluruh sistem memakai istilah `Awardee`, *agar* kode, UI, dan dokumen berbicara dalam satu bahasa.
**Tertelusur:** §3.2, §3.5, §11.1 · PO-3

| # | Acceptance Criteria |
|---|---|
| AC-1 | **Given** kode dicari untuk `member`/`Member` sebagai identitas peran, **Then** tidak ada hasil di luar catatan riwayat — mencakup entity, repository, store, komponen, props, nama berkas, dan tabel Dexie |
| AC-2 | **Given** route dibuka, **Then** `/member/*` tidak ada lagi; penggantinya `/awardee/*`. Tidak ada alias dan tidak ada redirect — tidak ada tautan lama yang beredar di luar |
| AC-3 | **Given** identifier ditinjau, **Then** seluruhnya Inggris (`Awardee`, `awardeeId`, `AwardeeRepository`) dan seluruh teks UI Indonesia (`09` §1 K-5) |
| AC-4 | **Given** `npm run verify` dijalankan, **Then** `compile-all` 0 gagal, build sukses, dan tidak ada import menggantung. Skrip verifikasi ikut di-rename: `e2e-routes.mjs:34-43`, `e2e-gamification.mjs:153-209`, `screenshot.mjs:25-31` |
| AC-5 | **Given** basis data demo lama ada di peramban, **When** aplikasi dimuat, **Then** `DB_VERSION` **dan** `SEED_VERSION` sama-sama naik dan data dibangun ulang tanpa galat — menaikkan salah satu saja menghasilkan tabel yang ada tetapi kosong selamanya, tanpa pesan apa pun |
| AC-6 | **Given** dua sumber navigasi hari ini (`routes/member/+layout.svelte:46-62` dan fallback `components/BottomNav.svelte:29-35`), **Then** keduanya digantikan `src/lib/data/navigation.js` dan fallback komponen dikosongkan |

#### US-R05 — Keluar dari sesi · **S**
*Sebagai* pengguna, *saya ingin* keluar dari sesi, *agar* perangkat bersama tidak menyisakan akses saya.
**Tertelusur:** §3.6 · Hal 10

| # | Acceptance Criteria |
|---|---|
| AC-1 | **Given** saya masuk, **Then** tombol Keluar tersedia di header setiap zona ter-login |
| AC-2 | **Given** saya menekan Keluar, **Then** sesi terhapus dari memori **dan** localStorage (`pfriends_session`), dan saya mendarat di `/` |
| AC-3 | **Given** saya menekan tombol Kembali peramban setelah keluar, **Then** halaman ter-login tidak tampil — `ready` **tetap** `true` sehingga guard menolak seketika, bukan menunggu |

#### US-R06 — Verifikator bukan hakim atas karyanya sendiri · **M**
*Sebagai* pemilik program, *saya ingin* verifikator diblokir dari meninjau tulisannya sendiri, *agar* kontrol governance paling dasar tidak bocor.
**Tertelusur:** §5.5, C-19 · Hal 10 · `docs/04` §3.1 · `docs/03` §5.10

| # | Acceptance Criteria |
|---|---|
| AC-1 | **Given** sebuah cerita ditulis oleh Verifikator yang sedang masuk, **When** ia membuka detail peninjauan, **Then** seluruh tombol keputusan nonaktif disertai alasan tertulis |
| AC-2 | **Given** permintaan tetap dikirim (mis. lewat konsol peramban), **Then** `ContentReviewService` menolaknya dengan `{ ok: false, reason: 'SELF_REVIEW' }` — bukan hanya UI yang menyembunyikan |
| AC-3 | **Given** percobaan itu terjadi, **Then** entri jejak audit `policy.overridden_attempt` tercatat |
| AC-4 | **Given** ada ≥2 akun Verifikator (§11.3), **Then** naskah tersebut tetap dapat ditinjau verifikator lain — sehingga larangan ini tidak menciptakan *deadlock* permanen |

### B. Kalender komunitas publik

#### US-R07 — Melihat kalender komunitas tanpa login · **M**
*Sebagai* pengunjung publik, *saya ingin* melihat kalender kegiatan, *agar* saya tahu apa yang sedang berjalan sebelum memutuskan bergabung.
**Tertelusur:** §6.2, §6.3, §6.4 · **Hal 5 pilar 02** · Hal 3 · Hal 4

| # | Acceptance Criteria |
|---|---|
| AC-1 | **Given** saya belum masuk, **When** saya membuka `/kalender`, **Then** kegiatan ber-`isPubliclyVisible` tampil tanpa diminta masuk |
| AC-2 | **Given** lebar ≥ 768 px, **Then** tampilan bawaan adalah grid bulan; **Given** < 768 px, **Then** tampilan bawaan adalah daftar vertikal |
| AC-3 | **Given** kalender tampil, **When** saya menyaring jenis (upskilling / pertemuan komunitas / sharing session) atau chapter, **Then** hanya kegiatan yang cocok tersisa dan filter aktif terlihat jelas |
| AC-4 | **Given** kegiatan tampil, **Then** **tidak ada** nama pendaftar, nama peserta, kuota tersisa, kode kehadiran, maupun nilai poin (§6.4) |
| AC-5 | **Given** bulan terpilih tidak punya kegiatan, **Then** tampil keadaan kosong yang menjelaskan kapan agenda berikutnya diumumkan — bukan grid kosong tanpa kata |
| AC-6 | **Given** kegiatan berstatus usulan atau ditolak ada di basis data, **Then** ia **tidak pernah** muncul di `/kalender` — dijamin oleh satu penyaring `isPubliclyVisible`, bukan oleh penyaring yang ditulis ulang di halaman |

#### US-R08 — Detail kegiatan publik · **S**
**Tertelusur:** §6.9 · Hal 5 pilar 02 · `docs/07` US-013

| # | Acceptance Criteria |
|---|---|
| AC-1 | **Given** saya menekan sebuah kegiatan, **Then** `/kalender/[id]` menampilkan judul, deskripsi, jenis, jadwal WIB penuh, lokasi/kanal, chapter, komunitas sasaran, dan narasumber |
| AC-2 | **Given** halaman detail tampil, **When** saya menekan "Tambah ke kalender", **Then** berkas `.ics` terunduh — dibangun sebagai string di klien, tanpa dependensi npm baru |
| AC-3 | **Given** saya belum masuk, **When** saya menekan "Ikut kegiatan ini", **Then** saya diarahkan ke `/masuk?next=/awardee/kalender/[id]` |
| AC-4 | **Given** `id` tidak dikenal **atau** kegiatan tidak terbit, **Then** tampil halaman "Kegiatan tidak ditemukan", bukan galat dan bukan isi kegiatan |

#### US-R09 — Panel daftar event di sisi halaman blog · **M**
**Tertelusur:** §6.5 · **PO-4** · Hal 5 pilar 02 + pilar 06

| # | Acceptance Criteria |
|---|---|
| AC-1 | **Given** saya membuka `/cerita` pada lebar ≥ 1024 px, **Then** panel "Kalender Komunitas" tampil di kolom kanan berisi maksimal 5 kegiatan terdekat urut menaik |
| AC-2 | **Given** lebar < 1024 px, **Then** panel **turun ke bawah** daftar cerita dan tetap tampil utuh — tidak disembunyikan |
| AC-3 | **Given** saya membuka `/cerita/[slug]`, **Then** panel yang sama tampil dengan **komponen yang sama** — satu `EventListPanel`, bukan dua salinan |
| AC-4 | **Given** panel tampil, **Then** tersedia tautan "Lihat semua →" ke `/kalender` |
| AC-5 | **Given** tidak ada kegiatan mendatang, **Then** panel menampilkan pesan kosong, bukan menghilang |
| AC-6 | **Given** peninjauan kode, **Then** komponen yang sama juga dipakai di `/` , `/awardee`, dan `/verifikator` dengan `limit` berbeda (§6.5) |

#### US-R10 — Awardee mengusulkan kegiatan · **M**
**Tertelusur:** §5.4 (E-01), §6.7 · **PO-4** · Hal 5 pilar 02

| # | Acceptance Criteria |
|---|---|
| AC-1 | **Given** saya Awardee aktif, **When** saya mengisi judul, jenis, jadwal, mode, lokasi/kanal, chapter, dan deskripsi lalu mengirim, **Then** kegiatan tersimpan `reviewStatus = DIAJUKAN` dan **belum** tampil di kalender publik |
| AC-2 | **Given** `endsAt ≤ startsAt` **atau** `startsAt` di masa lalu, **Then** pengiriman ditolak dengan pesan yang menyebut field mana yang salah |
| AC-3 | **Given** kegiatan saya ditinjau, **When** saya membuka `/awardee/kalender` tab "Usulan saya", **Then** status dan catatan verifikator terlihat |
| AC-4 | **Given** usulan saya ditolak, **Then** `reviewNote` tampil utuh dan saya dapat mengajukan versi perbaikannya |

#### US-R11 — Verifikator mengelola antrean kegiatan · **M**
**Tertelusur:** §5.4, §5.6, §6.7 · **PO-4** · `docs/03` §5.10

| # | Acceptance Criteria |
|---|---|
| AC-1 | **Given** ada kegiatan `DIAJUKAN`, **When** saya membuka `/verifikator/kegiatan`, **Then** antrean tampil urut terlama dengan usia antrean (hari kerja) dan penanda SLA 2 hari kerja |
| AC-2 | **Given** saya menerbitkan, **Then** `reviewStatus = DITERBITKAN`, `publishedAt` terisi, dan kegiatan muncul di `/kalender` **serta** panel blog pada pemuatan berikutnya |
| AC-3 | **Given** saya menolak tanpa mengisi catatan, **Then** sistem menolak aksi tersebut |
| AC-4 | **Given** saya membuat kegiatan sendiri, **Then** kegiatan itu langsung `DITERBITKAN` (E-04) dan tercatat `createdByRole = VERIFIER` + `event.self_published` |
| AC-5 | **Given** sebuah usulan berlangsung < 3 hari lagi, **Then** ia naik ke prioritas tertinggi meskipun usianya di antrean belum melewati SLA |

#### US-R12 — Kalender & agenda pada landing · **S**
**Tertelusur:** §4.2 blok (c), §6.5 · **PO-1(c)** · Hal 5 pilar 02

| # | Acceptance Criteria |
|---|---|
| AC-1 | **Given** saya membuka `/`, **Then** bagian "Agenda Komunitas" menampilkan mini-kalender bulan berjalan dengan penanda pada tanggal ber-kegiatan |
| AC-2 | **Given** bagian itu tampil, **Then** di sebelahnya ada 4 kegiatan terdekat (`EventListPanel limit=4`) dan CTA ke `/kalender` |
| AC-3 | **Given** tidak ada kegiatan bulan ini, **Then** bagian tetap tampil dengan pesan kosong yang jujur |

### C. Alur editorial cerita

#### US-R13 — Awardee menulis cerita komunitas · **M**
**Tertelusur:** §5.3 (T-01) · **Hal 5 pilar 06** · Hal 9 (*story bank*) · Hal 11 (*Submit story — 10 pts*)

| # | Acceptance Criteria |
|---|---|
| AC-1 | **Given** saya masuk sebagai Awardee, **When** saya membuka `/awardee/cerita/tulis`, **Then** tersedia formulir: judul, ringkasan, naskah, tema (pengurangan sampah / energi bersih / edukasi masyarakat), lokasi, tanggal aktivitas, jumlah peserta, unggahan foto, tag ESG + SDG, catatan hasil |
| AC-2 | **Given** naskah < 300 kata **atau** tanpa foto **atau** tanpa tag ESG, **When** saya menekan Kirim, **Then** sistem menolak dan **menyebutkan syarat mana** yang belum terpenuhi (`Story.isSubmittable`, ambang dari `MIN_KATA_NASKAH`, bukan literal) |
| AC-3 | **Given** saya belum mencentang persetujuan publikasi, **When** saya menekan Kirim, **Then** pengiriman ditolak dengan pesan bahwa consent wajib |
| AC-4 | **Given** seluruh syarat terpenuhi, **When** saya menekan Kirim, **Then** cerita tersimpan `DIAJUKAN`, `submittedAt` terisi, dan saya menerima poin `poinUntuk(STORY_SUBMIT)` — **tanpa angka literal di komponen** |
| AC-5 | **Given** saya menyimpan tanpa mengirim, **When** saya kembali ke `/awardee/cerita`, **Then** cerita muncul berstatus `Draf` dan dapat dilanjutkan |
| AC-6 | **Given** saya mengirim ulang naskah `PERLU_REVISI`, **Then** poin `STORY_SUBMIT` **tidak** diberikan dua kali (idempotensi lewat `idempotencyKey`) |

#### US-R14 — Awardee memantau status naskahnya · **M**
**Tertelusur:** §5.2, §5.6 · Hal 10 · `docs/04` §3.3

| # | Acceptance Criteria |
|---|---|
| AC-1 | **Given** saya punya naskah, **When** saya membuka `/awardee/cerita`, **Then** tiap naskah menampilkan label status Indonesia dari `STORY_STATUS_META` beserta **siapa yang sedang memegang bola** |
| AC-2 | **Given** naskah `PERLU_REVISI`, **When** saya membukanya, **Then** catatan revisi verifikator tampil utuh dan tombol "Perbaiki & kirim ulang" aktif |
| AC-3 | **Given** naskah `TERPUBLIKASI`, **When** saya membukanya, **Then** tersedia tautan langsung ke `/cerita/[slug]` versi publiknya |
| AC-4 | **Given** naskah berstatus apa pun, **When** halaman tampil, **Then** **tidak ada** poin, tier, atau peringkat pada kartu naskah — riwayat poin tinggal di `/awardee/aksi` |
| AC-5 | **Given** SLA antrean terlampaui, **Then** saya melihat penandanya — transparansi SLA mencegah persepsi *"naskah saya hilang"* |

#### US-R15 — Verifikator meninjau naskah · **M**
**Tertelusur:** §5.3 (T-02/T-03/T-05), §5.7 · Hal 10 · Hal 12 (gate 5 syarat) · `docs/04` §3.3, §6.2

| # | Acceptance Criteria |
|---|---|
| AC-1 | **Given** ada naskah `DIAJUKAN`, **When** saya membuka `/verifikator/cerita`, **Then** antrean tampil **FIFO (terlama dahulu)** lengkap dengan usia antrean dalam hari kerja dan penanda pelanggaran SLA |
| AC-2 | **Given** saya membuka satu naskah, **Then** **tiga panel gerbang tampil terpisah dan tidak digabung menjadi satu skor**: (a) checklist data sensitif 21 butir, (b) kesiapan bukti ESG 4 syarat, (c) kelayakan fitur publik 5 syarat |
| AC-3 | **Given** naskah adalah tulisan saya sendiri, **Then** seluruh tombol keputusan nonaktif dengan penjelasan, dan penolakan ditegakkan di lapisan policy (US-R06) |
| AC-4 | **Given** saya menekan "Minta revisi" tanpa mengisi catatan, **Then** sistem menolak — catatan revisi wajib |
| AC-5 | **Given** saya menyetujui, **Then** status menjadi `DISETUJUI`, `pfValidation` terisi id + waktu saya, `sensitivityScan = CLEAR`, dan `story.approved` tercatat |
| AC-6 | **Given** tombol keputusan dirender, **Then** ia berasal dari `allowedTransitions(story.status, session.role)` — bukan dari daftar tombol yang ditulis tangan |

#### US-R16 — Verifikator menerbitkan cerita ke publik · **M**
**Tertelusur:** §5.3 (T-06), §5.7 · **PO-4** · Hal 12 · `docs/04` §3.4, §4.5

| # | Acceptance Criteria |
|---|---|
| AC-1 | **Given** cerita `DISETUJUI`, **When** saya menekan Terbitkan, **Then** sistem **memeriksa ulang `story.isPublishable` pada detik itu** — bukan mengandalkan hasil pemeriksaan saat persetujuan |
| AC-2 | **Given** consent penulis telah dicabut **atau kedaluwarsa** sejak persetujuan, **When** saya menekan Terbitkan, **Then** penerbitan ditolak dan cerita berpindah ke `DIARSIPKAN` dengan `archiveReason = CONSENT_DICABUT` |
| AC-3 | **Given** seluruh gerbang lolos, **When** penerbitan dieksekusi, **Then** status menjadi `TERPUBLIKASI`, `publishedAt` + `publishedById` terisi, cerita muncul di `/cerita` pada pemuatan berikutnya, dan `publish.executed` tercatat |
| AC-4 | **Given** cerita sudah `TERPUBLIKASI`, **When** saya menekan Tarik, **Then** saya wajib memilih alasan arsip, cerita hilang dari zona publik, dan `takedown.completed` tercatat |
| AC-5 | **Given** satu gerbang gagal, **Then** **tidak ada** tombol override di mana pun bagi peran mana pun (C-50 / X-11) |

#### US-R17 — Story bank yang dapat ditelusuri · **S**
**Tertelusur:** C-20, §3.4 · **Hal 9** (*story bank*)

| # | Acceptance Criteria |
|---|---|
| AC-1 | **Given** saya Admin, **When** saya membuka `/admin/laporan` tab Story Bank dan memasang filter (tema, pilar ESG, SDG, komunitas, chapter, periode), **Then** hasil menampilkan cerita **semua status** dengan penanda statusnya |
| AC-2 | **Given** hasil tampil, **When** saya memilih beberapa cerita, **Then** tersedia ekspor ringkasan (judul, penulis, tanggal, tag ESG/SDG, outcome, status) |
| AC-3 | **Given** saya membuka satu cerita dari story bank, **Then** saya dapat membaca dan mengekspor, tetapi **tidak** dapat menyetujui, menolak, atau menerbitkan (C-14/C-16 = ✗ bagi Admin) |

#### US-R18 — Blog publik hanya memuat yang terpublikasi · **M**
**Tertelusur:** §4.2 blok (b), C-01 · **PO-1(b)** · Hal 5 pilar 06

| # | Acceptance Criteria |
|---|---|
| AC-1 | **Given** saya belum masuk, **When** saya membuka `/cerita`, **Then** hanya cerita `TERPUBLIKASI` tampil — `ceritaTampilPublik()` sebagai satu-satunya penyaring |
| AC-2 | **Given** halaman blog tampil pada lebar ≥ 1024 px, **Then** panel daftar event tampil di kolom kanan (US-R09) |
| AC-3 | **Given** saya membuka `/cerita/[slug]` sebuah cerita yang baru saja diarsipkan, **Then** tampil halaman *"Cerita tidak lagi tersedia"* — bukan galat 500 dan bukan isi cerita |
| AC-4 | **Given** cerita tampil, **Then** atribusi penulis mengikuti preferensi consent-nya, dan **tidak ada** poin, tier, maupun peringkat penulis (cabut `cerita/[slug]:25,151,156`) |

### D. Zona publik bersih dari gamifikasi + dampak jujur

#### US-R19 — Mencabut mekanik gamifikasi dari zona publik · **M**
**Tertelusur:** §4.3, §2.3 (C-29…C-34) · **PO-2** · Hal 4

| # | Acceptance Criteria |
|---|---|
| AC-1 | **Given** saya menelusuri seluruh halaman `(public)/*` tanpa masuk, **Then** tidak ada tabel 9 aksi & poin, tidak ada tangga tier beserta ambang 25/50/100/150, tidak ada papan peringkat, tidak ada lencana |
| AC-2 | **Given** halaman publik dimuat, **Then** tidak ada satu pun angka poin milik individu yang tampil (termasuk `masuk:191-194` yang hari ini memajang poin 8 orang bernama **tanpa login**) |
| AC-3 | **Given** landing perlu menjelaskan mengapa orang bergabung, **Then** penjelasannya bersifat **manfaat naratif** (jejaring, upskilling, mentoring, pengakuan) — bukan mekanik skoring |
| AC-4 | **Given** materi yang dipindahkan, **Then** seluruhnya muncul utuh di `/awardee/aksi`, `/awardee/papan-peringkat`, dan `/awardee/penghargaan` — **dipindahkan, bukan dibuang** |
| AC-5 | **Given** peninjauan kode, **Then** `TierBadge`, `PointsChip`, `TierProgress`, `LeaderboardRow`, `BadgeTile`, `scoring-table.js`, dan `tier-table.js` **tidak diimpor** oleh satu pun berkas di bawah `src/routes/(public)/`, diuji otomatis (§10.3) |
| AC-6 | **Given** `EventCard` dipakai di zona publik, **Then** ia menerima `showPoints = false` (bawaan) sehingga chip poin (`EventCard.svelte:136-137`) tidak dirender |

#### US-R20 — Bagian "Dampak" yang jujur di landing · **M**
**Tertelusur:** §4.4, §4.5, §4.6 · **PO-1(a)** · **Hal 6** · `docs/02` §3.2, §3.6, §7.3

| # | Acceptance Criteria |
|---|---|
| AC-1 | **Given** bagian Dampak tampil, **Then** angka kelas A (anggota terdata, kegiatan terlaksana, chapter aktif, cerita terpublikasi, gerakan berjalan, aksi tercatat) tampil sebagai angka tegas **dengan tanggal potret dan penyebutnya** |
| AC-2 | **Given** jangkauan organik ditampilkan, **Then** ia berbentuk **rentang** berlabel `Estimasi`, disertai kontrol `ⓘ` yang membuka rumus dan daftar asumsi (`REACH_PARAMETERS`) |
| AC-3 | **Given** angka engagement 2–3× dan paid media 5–20% ditampilkan, **Then** keduanya ditulis sebagai kalimat rujukan berlabel `Benchmark komunikasi` dengan pernyataan eksplisit *"bukan hasil pengukuran Pfriends"* — tanpa angka besar, gauge, progress bar, atau ikon panah naik |
| AC-4 | **Given** bagian Dampak tampil, **Then** tidak ada nilai rupiah (EMV, penghematan, SROI) dan tidak ada capaian-versus-target internal |
| AC-5 | **Given** saya menekan tautan metode, **Then** `/metode-pengukuran` menjelaskan definisi tiap angka, rumusnya, dan enam asumsi `docs/02` §3.6 |
| AC-6 | **Given** data kosong, **Then** tampil keadaan kosong yang menjelaskan, bukan angka nol berukuran besar |
| AC-7 | **Given** peninjauan kode, **Then** seluruh angka publik berasal dari **satu** `ProgramImpactService.publicSnapshot()` yang bentuk kembaliannya tidak memuat field poin/tier sama sekali |

#### US-R21 — Landing memuat empat blok pemilik produk · **M**
**Tertelusur:** §4.2 · **PO-1** · Hal 4, Hal 5

| # | Acceptance Criteria |
|---|---|
| AC-1 | **Given** saya membuka `/`, **Then** keempat blok PO-1 ada — dampak agregat, cerita terpublikasi, kalender + daftar event, gerakan bersama + dua profil komunitas — dan setiap blok punya tautan ke halaman pendalamannya |
| AC-2 | **Given** blok cerita tampil, **Then** hanya cerita `TERPUBLIKASI` yang muncul |
| AC-3 | **Given** blok komunitas tampil, **Then** SOBI dan Womenpreneur diceritakan lewat `COMMUNITIES` (`community.js:47`) — bukan salinan teks baru yang dikarang di komponen |
| AC-4 | **Given** blok gerakan tampil, **Then** progres partisipasi ditampilkan sebagai cacah peserta terhadap target, **tanpa** poin |

### E. Area Awardee

#### US-R22 — Dasbor Awardee sebagai rumah gamifikasi · **M**
**Tertelusur:** §2.3 (C-29…C-34), §3.2 · **PO-2** · Hal 11, Hal 12

| # | Acceptance Criteria |
|---|---|
| AC-1 | **Given** saya masuk sebagai Awardee, **When** saya membuka `/awardee`, **Then** poin, tier saat ini, progres ke tier berikutnya, dan lencana terbaru saya tampil |
| AC-2 | **Given** dasbor tampil, **Then** tersedia panel agenda terdekat memakai `EventListPanel` **yang sama** dengan zona publik |
| AC-3 | **Given** dasbor tampil, **Then** seluruh angka poin/ambang berasal dari `domain/constants/`, tanpa literal di komponen |
| AC-4 | **Given** tabel skor 9 aksi dan tangga tier dipindahkan dari landing, **Then** keduanya tampil utuh di `/awardee/aksi` — termasuk penjelasan kebijakan kapan nilai dapat berubah |

#### US-R23 — Papan peringkat hanya untuk Awardee · **M**
**Tertelusur:** C-31, C-33 · **PO-2** · Hal 12

| # | Acceptance Criteria |
|---|---|
| AC-1 | **Given** saya Awardee, **When** saya membuka `/awardee/papan-peringkat`, **Then** papan global / per komunitas / per chapter tampil |
| AC-2 | **Given** saya belum masuk, **When** saya membuka jalur itu, **Then** guard mengalihkan saya ke `/masuk?next=…` |
| AC-3 | **Given** saya Verifikator atau Admin, **Then** saya tidak melihat papan peringkat per orang; Admin hanya melihat **distribusi tier agregat** (chart C-11) |
| AC-4 | **Given** seorang awardee memilih anonim, **Then** `displayName` menghormatinya (`Member.js:407-411`) bahkan di zona ter-login |

### F. Verifikator

#### US-R24 — Verifikator mengesahkan bukti kontribusi · **M**
**Tertelusur:** C-35, C-36, §5.6 · `docs/03` §5.6, §5.8, §5.10 · Hal 11

| # | Acceptance Criteria |
|---|---|
| AC-1 | **Given** ada entri `UNDER_REVIEW`, **When** saya membuka `/verifikator/bukti`, **Then** entri tampil beserta jenis aksi, kelas aksi, bukti terlampir, dan skor risiko anti-gaming |
| AC-2 | **Given** saya menyetujui, **Then** entri menjadi `VERIFIED → AWARDED` dan poinnya berubah dari `pending` menjadi `settled` |
| AC-3 | **Given** saya menolak, **Then** alasan wajib diisi, poin dibatalkan, dan Awardee melihat tombol Banding satu kali |
| AC-4 | **Given** entri melewati SLA kelasnya (B 2 / C 3 / D 5 hari kerja), **Then** entri naik ke antrean prioritas dan ditandai |
| AC-5 | **Given** buku besar bersifat *append-only* (`ActivityRepository.delete()` melempar, `:116-121`), **Then** pembatalan dilakukan sebagai entri koreksi, bukan penghapusan |

#### US-R25 — Papan SLA & beban antrean verifikator · **S**
**Tertelusur:** C-51, X-02, §5.6 · `docs/03` §5.10

| # | Acceptance Criteria |
|---|---|
| AC-1 | **Given** saya membuka `/verifikator`, **Then** tampil cacah antrean per jenis (cerita, kegiatan, bukti) dan jumlah yang melewati SLA |
| AC-2 | **Given** papan tampil, **Then** yang ditampilkan adalah **beban dan ketepatan waktu**, bukan KPI program — larangan X-02 tetap berlaku |
| AC-3 | **Given** saya mencoba membuka `/admin`, **Then** akses ditolak dengan panel penjelasan |

### G. Dashboard Admin

#### US-R26 — Dasbor KPI dengan ECharts · **M**
**Tertelusur:** §7.1–7.5 · **PO-5** · Hal 6 · `docs/02` §6.2, §6.3

| # | Acceptance Criteria |
|---|---|
| AC-1 | **Given** saya membuka `/admin`, **Then** 12 chart §7.2 tersedia, terbagi ke tab Ringkasan / Amplifikasi / Komunitas / ESG & Dampak |
| AC-2 | **Given** sebuah chart tidak punya data, **Then** ia menampilkan pesan kosong eksplisit, bukan grafik nol |
| AC-3 | **Given** chart estimasi (C-18) tampil, **Then** ia bergaris putus-putus dan berlencana "Estimasi" |
| AC-4 | **Given** seluruh chart tampil, **Then** semua label, legenda, dan tooltip berbahasa Indonesia, dan angka diformat `id-ID` |
| AC-5 | **Given** kode ditinjau, **Then** tiap chart adalah komponen sendiri di `src/lib/charts/`, memakai `EChart.svelte` dan `_chartTheme.js`, **tanpa menghitung metrik sendiri** |
| AC-6 | **Given** filter dasbor diubah, **Then** chart memperbarui datanya **tanpa** membongkar canvas dan **tanpa** mengunduh ulang modul ECharts (perbaikan E-1) |
| AC-7 | **Given** saya berpindah tab lalu kembali, **Then** chart tergambar dengan ukuran benar — tidak kosong akibat pernah di-*resize* ke lebar nol (perbaikan E-4 + pelepasan DOM per tab) |
| AC-8 | **Given** lebar 375 px, **Then** tidak ada scroll horizontal pada halaman; chart lebar menggulir di dalam wadahnya sendiri |

#### US-R27 — Corong pipeline editorial di dasbor Admin · **S**
**Tertelusur:** C-19, §7.2 · **PO-4** · Hal 9

| # | Acceptance Criteria |
|---|---|
| AC-1 | **Given** dasbor tampil, **Then** corong menampilkan cacah tiap status Draf → Diajukan → Review → Disetujui → Terpublikasi beserta rasio konversi antar tahap |
| AC-2 | **Given** ada tahap dengan penyusutan terbesar, **Then** tahap itu ditandai |
| AC-3 | **Given** Admin membukanya, **Then** ia hanya dapat membaca — keputusan tetap milik Verifikator (X-13) |

### H. Redesign editorial & foto asli

#### US-R28 — Foto asli berlisensi bebas · **M**
**Tertelusur:** §4.8, §9.2, §9.3 · **PO-6**

| # | Acceptance Criteria |
|---|---|
| AC-1 | **Given** aset disiapkan, **Then** foto berlisensi bebas diunduh ke `static/img/` — **bukan** di-hotlink ke domain luar. Direktori `static/` **belum ada** dan harus dibuat |
| AC-2 | **Given** foto dipakai, **Then** temanya relevan: kegiatan komunitas Indonesia, UMKM, aksi lingkungan, sesi belajar — bukan stok korporat generik |
| AC-3 | **Given** setiap foto, **Then** ada `alt` deskriptif Bahasa Indonesia dan atribusi lisensi tercatat pada `static/img/CREDITS.md` |
| AC-4 | **Given** halaman dimuat, **Then** foto memakai `loading="lazy"` (kecuali foto LCP hero), `width`/`height` eksplisit, dan `max-width:100%` |
| AC-5 | **Given** `static/favicon.svg` disediakan, **Then** rujukan `%sveltekit.assets%/favicon.svg` di `src/app.html:5-6` berhenti menghasilkan 404 — **`app.html` tidak disunting**, berkasnya yang disediakan (`09` §4) |
| AC-6 | **Given** avatar orang memakai foto stok, **Then** ia ditandai `isPlaceholderPhoto: true` di seed dan **tidak boleh** dibawa ke presentasi eksternal — menautkan wajah stok ke nama orang tertentu hanya sah di lingkungan mockup internal |

#### US-R29 — Redesign editorial · **M**
**Tertelusur:** §4.8, §4.9 · **PO-6**

| # | Acceptance Criteria |
|---|---|
| AC-1 | **Given** landing dan halaman blog ditinjau, **Then** setidaknya dua bagian memakai grid asimetris (mis. 7fr/5fr, 8fr/4fr), bukan kolom seragam |
| AC-2 | **Given** tipografi ditinjau, **Then** ada hierarki jelas dengan kontras ukuran tegas antara judul bagian, judul kartu, dan teks isi; body zona publik naik ke 16px sementara zona ter-login tetap 14px |
| AC-3 | **Given** CSS ditinjau, **Then** `blur-3xl` / `backdrop-blur` dekoratif dan aura radial dihapus dari zona publik; kedalaman dicapai lewat foto, garis pemisah, dan ruang putih |
| AC-4 | **Given** halaman ditinjau, **Then** tidak ada rentetan > 3 kartu berukuran identik berturut-turut; ritme dipatahkan oleh blok kutipan, foto lebar, atau angka tipografis |
| AC-5 | **Given** perubahan visual, **Then** token warna dan radius tetap dari `app.css`/`08-DESIGN-SYSTEM` — redesign mengubah **komposisi**, bukan sistem desain. Perubahan token diajukan sebagai amandemen `08` yang terpisah |
| AC-6 | **Given** lebar 375 px, **Then** tidak ada scroll horizontal dan seluruh grid asimetris runtuh menjadi satu kolom yang terbaca |
| AC-7 | **Given** setiap foto ditinjau, **Then** ia punya kapsi berformat `Subjek — Tempat, Bulan Tahun · Foto: <kredit>` |

### I. SDLC, clean code & ketertelusuran

#### US-R30 — Dokumentasi SDLC delta · **M**
**Tertelusur:** kepala dokumen, §11 · **PO-7**

| # | Acceptance Criteria |
|---|---|
| AC-1 | **Given** revisi ini disahkan, **Then** dokumen ini menjadi `docs/10-REVISION-SPEC.md` dan dirujuk dari `01-BRD-SRS.md` §6 & §8 |
| AC-2 | **Given** `09-BUILD-CONTRACT.md` bertentangan, **Then** perubahan route (§3), peran (§2), dan kontrak export (§11.2) dinyatakan **eksplisit sebagai Amandemen A-01** — bukan menyimpang diam-diam |
| AC-3 | **Given** matriks ketertelusuran ditinjau, **Then** tiap US-R terpetakan ke bagian dokumen ini, halaman sumber, dan berkas implementasi (§8.J) |
| AC-4 | **Given** butir yang belum dapat diputuskan sendiri, **Then** ia terdaftar sebagai butir konfirmasi Corsec (§11.4), bukan diputuskan diam-diam lalu disebut final |

#### US-R31 — Mutu kode · **M**
**Tertelusur:** §5.9, §7.1, §11.1 · **PO-7** · `09` §1 K-1, K-5

| # | Acceptance Criteria |
|---|---|
| AC-1 | **Given** kelas domain baru (`UserAccount`, `PasswordHash`, `AccessPolicy`, `Validator`, `AuthService`, `ContentReviewService`, `ProgramImpactService`), **Then** value object immutable, service menerima repository lewat konstruktor **tanpa nilai bawaan**, dan **tidak ada** impor Svelte/Dexie/`$app/*` di seluruh `src/lib/domain/` |
| AC-2 | **Given** berkas baru, **Then** tiap berkas dibuka blok JSDoc yang menyatakan tanggung jawab, keputusan desain yang tidak jelas dari kode, dan `@see` ke halaman sumber |
| AC-3 | **Given** identifier ditinjau, **Then** seluruhnya Inggris; seluruh teks UI Indonesia |
| AC-4 | **Given** angka poin/ambang tier dicari di luar `domain/constants/`, **Then** tidak ada hasil |
| AC-5 | **Given** `npm run verify` dijalankan, **Then** `compile-all` 0 gagal dan `build` sukses |
| AC-6 | **Given** fitur baru ditambahkan, **Then** ia memakai komponen dan store yang sudah ada bila tersedia — dilarang membuat komponen kembar (`EventListPanel` **satu**, dipakai empat tempat) |
| AC-7 | **Given** field baru ditambahkan ke entity, **Then** ia terdaftar di konstruktor **dan** `toJSON()` dengan nilai bawaan — jika tidak, ia hilang diam-diam saat disimpan (§5.8) |

### J. Matriks ketertelusuran ringkas

| Kelompok | US-R | Bagian dokumen ini | Halaman sumber | Berkas utama yang tersentuh |
|---|---|---|---|---|
| Peran & auth | R01–R06 | §2, §3.6, §5.5 | Hal 10, Hal 12 | `domain/constants/roles.js`, `domain/policies/AccessPolicy.js`, `domain/entities/UserAccount.js`, `domain/services/AuthService.js`, `stores/session.svelte.js`, `components/ZoneGuard.svelte`, `data/navigation.js` |
| Kalender publik | R07–R12 | §6 | **Hal 5 pilar 02**, Hal 3, Hal 4, Hal 6 | `routes/(public)/kalender/**`, `components/EventListPanel.svelte`, `domain/entities/CommunityEvent.js`, `stores/catalog.svelte.js`, `seed/seed-data.js` |
| Editorial cerita | R13–R18 | §5 | **Hal 5 pilar 06**, Hal 9, Hal 11, Hal 12 | `routes/awardee/cerita/**`, `routes/verifikator/cerita/**`, `domain/constants/content-workflow.js`, `domain/policies/ContentTransitionPolicy.js`, `domain/services/ContentReviewService.js`, `domain/entities/Story.js` |
| Publik bersih + dampak | R19–R21 | §4 | **Hal 6**, Hal 4, Hal 5 | `routes/(public)/**`, `routes/(public)/metode-pengukuran/`, `domain/services/ProgramImpactService.js`, `(public)/_view-model.js` |
| Area Awardee | R22–R23 | §2.3, §3.2 | Hal 11, Hal 12 | `routes/awardee/**` |
| Verifikator | R24–R25 | §2.5, §5.6 | Hal 10, Hal 11 | `routes/verifikator/**` |
| Dashboard admin | R26–R27 | §7 | Hal 6, Hal 11, Hal 12 | `components/EChart.svelte`, `charts/_echarts.js`, `charts/*.svelte`, `routes/admin/+page.svelte`, `domain/services/ContentReviewService.js` (pipeline & SLA) |
| Visual | R28–R29 | §4.8, §9.2, §9.3 | — (PO-6) | `static/img/**`, `routes/(public)/**`, `components/editorial/**` |
| SDLC & mutu | R30–R31 | §11, §10 | — (PO-7) | `docs/10-REVISION-SPEC.md`, `docs/09-BUILD-CONTRACT.md` §9 |

---

## 9. Kebutuhan Non-Fungsional yang Terdampak

Empat NFR berubah karena revisi ini, dan hanya empat. Sisanya (`08-DESIGN-SYSTEM` §aksesibilitas dasar, `05-ARCHITECTURE` §performa SPA) tetap berlaku apa adanya.

### 9.1 Aksesibilitas

| # | Kebutuhan | Dipicu oleh | Ketentuan |
|---|---|---|---|
| A-01 | **Kontras teks pada kanvas yang dihangatkan** | §4.8 (`--color-canvas` → nada kertas) | Sudah dihitung ulang: `ink-900` 15,74 · `ink-800` 13,33 · `heading` 11,35 · `ink-700` 9,43 · `ink-600` 6,90 · `pertamina-red-ink` 5,95 — seluruhnya lolos AA/AAA. **`ink-500` (4,34) tetap dilarang di atas kanvas** — larangan lama tidak berubah, tidak ada pasangan yang jatuh dari lolos ke gagal |
| A-02 | **Grid kalender dapat dioperasikan papan ketik** | §6.2 | Grid bulan memakai *roving tabindex*: satu sel fokusabel, panah ←↑→↓ memindah fokus, `Enter`/`Space` membuka daftar hari itu, `PageUp`/`PageDown` berpindah bulan. Tiap sel ber-`aria-label` tanggal lengkap Bahasa Indonesia + cacah kegiatan (mis. *"3 Agustus 2026, 2 kegiatan"*) — titik warna saja tidak terbaca pembaca layar |
| A-03 | **Target sentuh** | §6.2, §7.4 | Sel tanggal dan kontrol filter minimal 44×44 px pada ponsel |
| A-04 | **Chart tidak boleh mengandalkan warna saja** | §7.2 (12 chart) | CH-6: angka wajib ada di label atau tooltip. **Tambahan:** setiap panel chart menyertakan satu kalimat ringkasan temuan berbahasa Indonesia — ia sekaligus menjawab kolom *"pertanyaan yang dijawab"* (§7.2), jadi satu kalimat mengerjakan dua tugas |
| A-05 | **Gerak yang dapat dikurangi** | §7 (animasi chart 600 ms `cubicOut`, `_chartTheme.js:56`) | Pada `prefers-reduced-motion: reduce`, animasi chart dimatikan (`animation: false`) dan transisi halaman dinonaktifkan |
| A-06 | **Keadaan menunggu diumumkan** | §3.6 `ZoneGuard` | Layar penantian ber-`aria-busy="true"` dan berteks — bukan spinner tanpa teks. Panel "bukan peran Anda" adalah **teks yang dapat dibaca**, bukan pengalihan senyap (itu juga alasan aksesibilitas, bukan hanya UX) |
| A-07 | **Galat formulir tertaut ke fieldnya** | §6.7, US-R13 | `aria-describedby` ke pesan galat; pesan menyebut **field mana**; galat tidak disampaikan lewat warna saja |
| A-08 | **Setiap foto punya `alt` deskriptif Indonesia** | §9.3 | Zona publik tidak punya foto dekoratif-saja (§4.8), sehingga tidak ada foto ber-`alt=""` |
| A-09 | **Bahasa dokumen** | — | `src/app.html:2` sudah `lang="id"` — **jangan diubah**, cukup dipertahankan |
| A-10 | **Fokus terlihat** | §4.8 (redesign) | Redesign editorial mengubah komposisi, **tidak boleh** menghapus `:focus-visible` yang sudah ada di `app.css` |

### 9.2 Kinerja — foto adalah risiko baru terbesar

Sampai hari ini seluruh visual adalah SVG dan gradien: **nol foto raster**. Menambahkan 27 slot foto adalah perubahan kinerja terbesar dalam revisi ini, dan `svelte.config.js:11-17` memakai `adapter-static` dengan `assets: 'build'` sehingga isi `static/` disalin **apa adanya** ke `build/` — beratnya nyata, bukan teoretis.

| # | Anggaran / aturan | Nilai |
|---|---|---|
| P-01 | Foto hero (2400×1030) | ≤ **400 KB** per berkas, JPEG q≈82 |
| P-02 | Foto konten (1600×900 / 1600×1067 / 1200×1500) | ≤ **250 KB** |
| P-03 | Thumbnail (600×600) & avatar (480×480) | ≤ **60 KB** |
| P-04 | Total `static/img/` | ≤ **8 MB**; bila terlampaui, kurangi jumlah sampul cerita — jangan menaikkan kompresi sampai wajah rusak |
| P-05 | `loading="lazy"` pada semua foto **kecuali** hero halaman (kandidat LCP), yang justru memakai `fetchpriority="high"` | wajib |
| P-06 | `width`/`height` eksplisit pada setiap `<img>` | wajib — mencegah *layout shift* saat foto masuk |
| P-07 | Hero punya varian ponsel (`hero-komunitas-mobile.jpg`, 1200×1500) lewat `<picture>`/`srcset` | wajib — menyajikan 2400 px ke layar 375 px membuang ±90% byte |
| P-08 | Foto dirujuk sebagai jalur absolut `/img/nama.jpg` | bukan `$lib`, bukan `import` — `static/` adalah root aset |
| P-09 | Bundel ECharts di-*tree-shake* lewat `src/lib/charts/_echarts.js` | §7.1 E-2 — halaman publik tidak boleh ikut membayar ±1 MB |
| P-10 | Chart tetap diimpor **dinamis** di dalam `$effect` | `EChart.svelte:50`; jangan diubah menjadi impor statis saat memperbaiki E-1 |
| P-11 | **Tanpa dependensi npm baru** | `09` §8. `.ics` dibangun sebagai string; hash kata sandi ditulis tangan; tidak ada pustaka kalender |

**Konflik yang harus diselesaikan sebelum implementasi — tipografi vs berkas beku.** PO-6 menuntut *"tipografi berkarakter"*, sedangkan `src/app.html` dan `src/app.css` termasuk berkas **"sudah selesai — jangan diubah"** (`09` §4). Keduanya tidak dapat benar sekaligus:

| Opsi | Konsekuensi |
|---|---|
| Tidak menyentuh keduanya | `--font-sans` dan `--font-display` tetap **stack yang sama persis** (`app.css:102-103`), sehingga "tipografi berkarakter" hanya dapat dicapai lewat ukuran & bobot — bukan lewat kontras keluarga |
| Menyunting diam-diam | Melanggar `09` §4 dan aturan kepemilikan berkas (§11.1) |
| **Amandemen A-01 membuka pengecualian tercatat** | **Dipilih.** Dua baris, disebut satu per satu: (a) satu `<link>` Google Fonts di `src/app.html:15-18` untuk menambah keluarga display; (b) blok `@theme` tipografi di `src/app.css` untuk `--font-display`. Perubahan lain pada kedua berkas tetap terlarang. Konsekuensi kinerja wajib dihitung: keluarga ketiga menambah ±1 permintaan font; `display=swap` dan `preconnect` yang sudah ada (`app.html:13-14`) dipertahankan |

Butir yang sama berlaku untuk `og:image` (slot #7): `app.html` belum memuat meta OG sama sekali. Bila kartu berbagi WhatsApp diinginkan, ia masuk ke pengecualian yang sama — bila tidak, slot #7 **dicoret dari manifest**, bukan diunduh lalu tidak dipakai.

### 9.3 Manifest foto — **DIGANTI oleh `docs/11` §5 (28 berkas)**

> **Manifes tunggal yang berlaku adalah `docs/11-VISUAL-DIRECTION.md` §5.1–§5.5: 27 foto + 1 favicon =
> 28 berkas.** Tabel di bawah dipertahankan sebagai rekaman, dengan **dua koreksi mengikat**:
> 1. **Baris "Avatar" (1 entri / 6 berkas) DICABUT.** `docs/11` §4.6 memutuskan **tidak ada wajah stok yang
>    ditempelkan ke nama orang**; `Avatar.svelte` tetap memakai inisial sebagai keputusan sadar. Karena itu
>    `avatar-*.jpg` sengaja tidak dibuat, dan aturan **F-4** serta **US-R28 AC-6** (`isPlaceholderPhoto`)
>    ikut dicabut — keduanya menuntut aset yang memang tidak akan ada.
> 2. **Sampul cerita = 12**, dan angka itu benar: seed memuat **12** cerita `TERPUBLIKASI` (diverifikasi
>    dengan menjalankan `seed-test.mjs`). Klaim "11 entri" di `docs/11` §5.4 sudah dikoreksi.
>
> **Anggaran (P-01…P-04 §9.2) diselaraskan:** hero ≤400 KB · foto lain ≤250 KB · total `static/img/`
> ≤ **5 MB** (turun dari 8 MB, naik dari 3,5 MB di `docs/11` — anggaran 3,5 MB mustahil secara aritmetika).
> **DoD-10** karenanya merujuk `docs/11` §5, bukan §9.3 ini.

Semua unduhan ke `static/img/`. Direktori `static/` **belum ada** dan harus dibuat; membuat `static/favicon.svg` sekaligus menutup 404 yang terjadi pada setiap muat halaman akibat `app.html:5-6`.

| Kelompok | Entri | Berkas | Rasio / ukuran | Dipakai di |
|---|---|---|---|---|
| **Beranda** | 7 | `hero-komunitas.jpg` · `hero-komunitas-mobile.jpg` · `sobi-alumni-kampus.jpg` · `womenpreneur-umkm.jpg` · `event-workshop.jpg` · `gerakan-mangrove.jpg` · `og-pfriends.jpg` | 21:9 2400×1030 · 4:5 1200×1500 · 4:5 · 4:5 · 1:1 600×600 · 21:9 · 1.91:1 1200×630 | `/` hero, dua komunitas, agenda, gerakan unggulan, meta OG |
| **`/tentang`** | 3 | `tentang-hero.jpg` · `tentang-sosialisasi.jpg` · `tentang-dampak.jpg` | 21:9 · 3:2 1600×1067 · 3:2 | hero, lini masa, blok dampak |
| **`/komunitas`** | 4 | `komunitas-hero.jpg` · `sobi-mentoring.jpg` · `womenpreneur-produk.jpg` · `chapter-pertemuan.jpg` | 21:9 · 3:2 · 3:2 · 3:2 | hero, dua profil, blok chapter |
| **Sampul cerita** | 12 | `cerita-*.jpg` — satu per cerita `TERPUBLIKASI` ter-seed (kelas energi Palu, sabun jelantah, pendampingan harga, literasi iklim, bank sampah, paving plastik, pencatatan digital, kopi Gayo, lampu surya, tenun Sumba, bibit trembesi, mangrove Belawan) | 16:9 1600×900 (satu 3:2) | `StoryCard.cover`, `/cerita`, `/cerita/[slug]` |
| **Avatar** | 1 entri / 6 berkas | `avatar-01.jpg` … `avatar-06.jpg` | 1:1 480×480 | byline, `Avatar.src` |

**Empat aturan yang mengikat manifest ini:**

| # | Aturan |
|---|---|
| F-1 | **Titik masuk foto sudah ada di kontrak komponen** — `StoryCard.svelte:47-51` (`story.cover`), `Avatar.svelte:55` (`src`), `RewardCard.svelte:82` (`reward.image`), `MemberCard`/`LeaderboardRow` (`member.avatar`). **Tidak perlu komponen baru untuk memasang foto.** Yang kurang hanyalah pemetaan: `(public)/_view-model.js:32-44` **tidak memetakan `cover`**, sehingga seluruh 12 kartu cerita hari ini memakai fallback gradien |
| F-2 | **Fallback gradien diganti fallback tipografis** (`StoryCard.svelte:53-61`) — kicker pilar diset besar di atas `ink-50` + rule pilar 4px. Placeholder yang dipromosikan menjadi "desain" adalah salah satu ciri "terlalu AI" yang paling terbaca |
| F-3 | **Kredit tercatat** di `static/img/CREDITS.md`; kapsi bertempat dan berbulan pada setiap foto (M-5) |
| ~~F-4~~ | **DICABUT.** Tidak ada berkas avatar berfoto; `Avatar.svelte` memakai inisial (`docs/11` §4.6). US-R28 AC-6 ikut dicabut. |

### 9.4 Privasi & consent

| # | Kebutuhan | Ketentuan | Rujukan |
|---|---|---|---|
| V-01 | **Identitas tanpa consent tidak tampil publik** | `publikasi_nama` bawaan **OFF**. Byline cerita publik mengikuti preferensi consent penulis; bila tidak ber-consent, atribusi memakai bentuk yang disepakati (chapter/komunitas), bukan nama | `docs/04` §4.3 |
| V-02 | **Nama pendaftar & peserta kegiatan tidak pernah publik** | `registeredAwardeeIds` / `attendeeAwardeeIds` haram di zona publik; Awardee hanya melihat **cacah**, bukan nama (C-28) | §6.4 |
| V-03 | **Nama narasumber** | Menunggu **K-02** (§11.4). Sampai dijawab, tampilkan nama hanya bila narasumber adalah pihak PF atau consent tercatat | `docs/04` §4.3 |
| V-04 | **Alamat kegiatan luring** | Menunggu **K-01**. Sampai dijawab, tampilkan kota/kanal, bukan alamat lengkap | §6.4 |
| V-05 | **Poin & tier bukan data publik** | PO-2 sekaligus alasan privasi: memajang *nama + skor* melampaui apa pun yang pernah disetujui anggota (`masuk:191-194` hari ini melakukannya **tanpa login**) | §4.3 H-3, H-4 |
| V-06 | **Kredensial tidak pernah meninggalkan repository** | `passwordHash` tidak pernah keluar dari `AccountRepository` dan **tidak pernah** masuk localStorage. Potret sesi di localStorage berisi seminimal mungkin: `{accountId, role, awardeeId, displayName, initials}` | §3.6 |
| V-07 | **Pesan galat login tidak membocorkan keberadaan email** | Satu pesan untuk email tidak dikenal dan sandi salah (US-R01 AC-3) | — |
| V-08 | **Verifikator melihat status consent, bukan isinya** | X-09 / C-45–C-46. Akses & ekspor PII milik Admin | `docs/04` §5.4 |
| V-09 | **Pencabutan consent merambat** | `T-09` menarik cerita `TERPUBLIKASI` ke `DIARSIPKAN` dengan `CONSENT_DICABUT`; berlaku juga saat consent **kedaluwarsa sendiri** | §5.7 |
| V-10 | **Kredensial demo di `/masuk`** | Menunggu **K-08**. Bila mockup dipresentasikan ke pihak luar, panel bantuan disembunyikan lewat satu flag — bukan dihapus dari kode lalu ditambahkan lagi | US-R01 AC-5 |

### 9.5 Determinisme demo

Aturan `09` §6 tidak berubah dan tidak dilonggarkan. Revisi ini menambah tiga hal yang berpotensi merusaknya; ketiganya dijinakkan di bawah.

| # | Risiko baru | Ketentuan |
|---|---|---|
| D-1 | **Hash kata sandi** | `buildSeed()` **sinkron** dan harus berjalan di `node` polos untuk `npm run verify`. `crypto.subtle.digest` **asinkron** dan hanya ada di peramban → **tidak dapat dipakai di dalam seed**. **Keputusan:** hash mock **sinkron & pure-JS** (FNV-1a atau djb2) di `src/lib/infrastructure/auth/password.js`, dengan JSDoc yang menyatakan tegas ini **mock, bukan kriteria keamanan**, dan diganti Argon2id di sisi server pada penerapan nyata. Satu fungsi hash untuk seed dan untuk verifikasi login — dua implementasi berbeda adalah cara termudah membuat login gagal hanya di produksi |
| D-2 | **Kata sandi demo** | Konstanta literal tunggal (mis. `SANDI_DEMO`), **bukan** hasil acak, dideklarasikan **satu kali** di `seed/accounts.js`. `/masuk` membacanya lewat `accountRepository.demoAccounts()` yang mengembalikan `{email, roleLabel, hint}` **tanpa** kata sandi — mencegah anti-pola dua sumber kebenaran kredensial |
| D-3 | **Pembangkitan akun** | **Nol pemakaian `rng`.** Akun adalah pemetaan murni dari daftar awardee, diletakkan sebagai **langkah terakhir** `buildSeed()`. Menyisipkan satu draw `rng` sebelum generator yang sudah ada akan menggeser seluruh urutan sesudahnya. `createdAt` diturunkan dari `awardee.joinedAt`, **bukan** `new Date()` |
| D-4 | **Penambahan naskah kegiatan** | Diverifikasi aman untuk poin/tier (§6.8): `bangkitkanKegiatan` tidak menerima `rng`; pergeseran hanya terjadi di `tautkanKeikutsertaan` → `finalisasiAnggota`, yang bagian ber-`rng`-nya **hanya** membangkitkan penukaran reward. `points`, `seasonPoints`, `streak`, `tier`, `badgeCodes` dihitung murni dari buku besar (`seed-data.js:2167-2178`) |
| D-5 | **Kredensial "sorot" di halaman masuk** | Dipilih **deterministik** (mis. awardee berpoin tertinggi berstatus AKTIF, tie-break `id` menaik) — bukan hasil `rng` |
| D-6 | **Invarian yang wajib tetap benar setelah seluruh perubahan** | (a) jumlah `PointActivity` tiap awardee **persis** sama dengan totalnya; (b) distribusi tier tetap mengerucut ±22/16/12/7/3; (c) 60 email awardee tetap unik — ia menjadi kunci login dan `&email` adalah indeks unik |

### 9.6 Ketahanan basis data demo

Menaikkan versi Dexie adalah operasi paling mudah gagal **senyap** dalam revisi ini.

| # | Risiko | Bukti | Penangkal |
|---|---|---|---|
| DB-1 | **`DB_VERSION` naik tetapi `SEED_VERSION` tidak** | `bootstrap.js:77-80` *early-return* begitu `meta.seedVersion === SEED_VERSION` | Naikkan **keduanya dalam satu perubahan**. Tanpa itu peramban lama memperoleh tabel `accounts` yang **ada tetapi kosong selamanya** → login mustahil, dan `query()` hanya mengembalikan array kosong sehingga **tidak ada pesan galat sama sekali** |
| DB-2 | Menyunting `SCHEMA_V1` di tempat | `db.js:56-71` | **Append** `.version(2).stores(SCHEMA_V2)`; `SCHEMA_V1` tidak disentuh. `stores()` kumulatif — tabel yang tidak disebut di v2 mewarisi definisi v1 |
| DB-3 | Tabel baru tidak terdaftar lengkap | `db.js:37-49` `TABLE`; `bootstrap.js:46-57` `PEMETAAN` | Daftarkan di **tiga** tempat: `TABLE`, `PEMETAAN`, `SCHEMA_V2`. Konsekuensi otomatis: `clearAllTables()` (`db.js:134-138`) mengiterasi `Object.values(TABLE)` sehingga tabel baru ikut terbersihkan; transaksi seed (`bootstrap.js:96-106`) hanya mencakup tabel di `PEMETAAN` — menulis di luar daftar itu melempar `NotFoundError` **di dalam** transaksi |
| DB-4 | **`VersionError`** saat kode versi lama membuka DB versi 2 | `getDb()` (`db.js:88-103`) **tanpa satu pun try/catch** → seluruh aplikasi mati, bukan satu halaman | Bungkus pembukaan dengan try/catch; pada kegagalan versi `await Dexie.delete(DB_NAME)` lalu buka ulang dan seed ulang. Data ini 100% demo yang dapat dibangkitkan ulang dari benih tetap — menghapusnya tidak menghilangkan apa pun, sedangkan aplikasi yang mati total menghilangkan demonya |
| DB-5 | **Bug laten `pending`** | `db.js:93-102` — `pending = null` hanya dieksekusi pada jalur sukses (`:98`) | Bila impor Dexie atau pembukaan DB gagal, `pending` tetap memegang promise ditolak dan **setiap `getDb()` berikutnya mengembalikan promise ditolak yang sama selamanya**. Tambahkan `finally { pending = null }` |
| DB-6 | Baris lama tanpa field baru | pola `CommunityEvent.js:140-158` | Setiap field baru **wajib punya nilai bawaan** di konstruktor. Field wajib tanpa bawaan melempar `TypeError` saat `toEntity()` dan menjatuhkan halaman |
| DB-7 | Tombol pemulihan hilang setelah refactor peran | `resetDatabase()` (`seed/bootstrap.js:145-147`), dipakai konsol admin | Pastikan tetap terjangkau di `/admin` setelah refactor (C-52) — itulah jalan keluar manual satu klik bila IndexedDB pengguna telanjur aneh |

---

## 10. Definition of Done Revisi Ini

### 10.1 DoD lama tetap berlaku

Delapan butir `09` §7 tidak diganti dan tidak dilonggarkan: build sukses · `compile-all` 0 gagal · tanpa import menggantung · tanpa teks placeholder · seluruh teks UI Indonesia · tanpa angka poin/tier literal di luar `domain/constants/` · setiap halaman punya keadaan kosong · tanpa scroll horizontal pada 375 px.

### 10.2 DoD tambahan — per keputusan pemilik produk

| # | Butir | Cara memeriksa | Sumber |
|---|---|---|---|
| **DoD-01** | Landing memuat empat blok PO-1, masing-masing bertautan ke halaman pendalamannya | Telusuri `/` sebagai tamu | PO-1 |
| **DoD-02** | **Nol** mekanik gamifikasi di `src/routes/(public)/**` | Uji otomatis §10.3 butir 1 | PO-2 |
| **DoD-03** | Setiap angka publik berlabel kelasnya (terhitung / estimasi / benchmark) dan bertanggal potret; `/metode-pengukuran` ada | Telusuri `/` + `/metode-pengukuran` | PO-1, §4.4 |
| **DoD-04** | Tiga peran hidup; `/masuk` adalah formulir email+sandi; ketiga zona dijaga `ZoneGuard`; matriks §3.7 lulus seluruhnya | `npm run verify:e2e` diperluas | PO-3 |
| **DoD-05** | **Nol** kemunculan `/member` dan `Member` sebagai identitas peran di `src/` dan `scripts/` | Uji otomatis §10.3 butir 2 | PO-3 |
| **DoD-06** | Rantai editorial lengkap dapat diperagakan **ujung ke ujung** dalam satu sesi: Awardee menulis → kirim → Verifikator meninjau → setujui → terbitkan → cerita tampil di `/cerita` | Peragaan manual, dicatat sebagai skenario demo | PO-4 |
| **DoD-07** | Kegiatan dapat diusulkan Awardee **dan** Verifikator; usulan tidak pernah bocor ke kalender publik | Peragaan manual + uji `isPubliclyVisible` | PO-4 |
| **DoD-08** | Panel daftar event tampil di sisi `/cerita` dan `/cerita/[slug]`, memakai **komponen yang sama** (`EventListPanel`) dengan `/`, `/awardee`, `/verifikator` — **lima** tempat, satu berkas | `grep -rn "EventListPanel" src \| wc -l` ≥ 5 dan hanya satu berkas definisi | PO-4 |
| **DoD-09** | **17 chart** ECharts hidup di `/admin` dalam 4 tab (11 baru `12` §3.5 WP-07 + 6 chart lama yang diperbaiki); tiap chart punya keadaan kosong; `EChart.svelte` sudah diperbaiki (E-1…E-4) | Telusuri tiap tab dengan data kosong & penuh | PO-5 |
| **DoD-10** | `static/img/` terisi sesuai manifest **`docs/11` §5** (27 foto, tiap berkas >20 KB), ber-`CREDITS.md`, ber-kapsi, ber-`alt`, ber-`width`/`height`; `static/fonts/` berisi 3 `.woff2` + 3 lisensi OFL; `static/favicon.svg` ada sehingga 404 `app.html:5-6` tertutup | Telusuri + periksa direktori | PO-6 |
| **DoD-11** | Zona publik bebas `blur-3xl`/`backdrop-blur` dekoratif; minimal dua bagian bergrid asimetris; tidak ada > 3 kartu identik berturut-turut | Tinjauan visual + `grep` kelas | PO-6 |
| **DoD-12** | Seluruh kelas domain baru bebas impor Svelte/Dexie/`$app`; repository disuntik lewat konstruktor tanpa nilai bawaan; setiap berkas baru ber-JSDoc kepala | Uji otomatis §10.3 butir 3 + tinjauan kode | PO-7 |
| **DoD-13** | `DB_VERSION` dan `SEED_VERSION` naik bersamaan; peramban dengan data lama ter-seed ulang tanpa galat | Buka aplikasi dengan IndexedDB versi lama | §9.6 |
| **DoD-14** | Invarian seed tetap benar: jumlah aktivitas = total poin; distribusi tier mengerucut; 60 email unik | `npm run verify:domain` diperluas | §9.5 D-6 |

### 10.3 Uji kepatuhan yang dapat dieksekusi

Empat pemeriksaan ditambahkan ke `npm run verify`. Aturan yang hanya hidup di dokumen akan bocor pada halaman ke-12; aturan yang gagal di CI tidak.

| # | Pemeriksaan | Bentuk |
|---|---|---|
| 1 | **Zona publik bersih** | Pindai seluruh berkas di bawah `src/routes/(public)/`; gagal bila ditemukan impor `PointsChip`, `TierBadge`, `TierProgress`, `LeaderboardRow`, `BadgeTile`, `domain/constants/scoring-table.js`, atau `domain/constants/tier-table.js` |
| 2 | **Rename tuntas** | Pindai `src/` dan `scripts/`; gagal bila ditemukan `/member`, `MemberRepository`, `memberId`, `loginAsMember`, atau `SessionRole.MEMBER` |
| 3 | **Kemurnian domain** | Pindai `src/lib/domain/**`; gagal bila ditemukan impor `svelte`, `dexie`, atau `$app/` |
| 4 | **Kebijakan akses & transisi diuji** | Tambahkan ke `scripts/verify/domain-test.mjs`: `canAccess()` untuk 4 peran × 5 zona; `safeNext()` menolak `//evil.com` dan jalur di luar kewenangan; `canTransition()` menolak `DRAFT → TERPUBLIKASI` bagi peran mana pun; `AccessPolicy.canSeeScoring(null) === false`; `canReviewContent` menolak penulis sendiri |

Butir 4 dapat berjalan di `node` polos justru karena kebijakan ditempatkan di domain — itu manfaat konkret dari keputusan §3.6 dan §5.1, bukan kemurnian arsitektur demi dirinya sendiri.

### 10.4 Yang **tidak** termasuk lingkup revisi ini

Menyatakannya penting agar tidak dianggap terlupakan.

| # | Di luar lingkup | Alasan |
|---|---|---|
| 1 | Autentikasi sungguhan (server, sesi ber-token, reset kata sandi lewat surel) | Ini mockup SPA tanpa backend; hash bersifat mock dan dinyatakan begitu di JSDoc |
| 2 | Migrasi data pengguna nyata | Tidak pernah ada data nyata; seluruh isi Dexie hasil seed yang dapat dibangkitkan ulang |
| 3 | Notifikasi surel/WhatsApp sungguhan saat SLA terlampaui | Diperagakan sebagai penanda di UI |
| 4 | Dual-control `docs/03` §5.10 untuk aksi ≥30 poin | Menunggu **K-03** (berapa akun verifikator akan ada) |
| 5 | Nilai rupiah, EMV, SROI di zona publik | H-7 — permanen, bukan ditunda |
| 6 | Peta provinsi (C-15), corong penerima broadcast (C-06) | Menunggu aset GeoJSON dan pipeline data yang belum ada (CH-9) |
| 7 | Sinkronisasi filter kalender ke query-string | §6.3 — kompleksitas tidak sepadan untuk mockup |

---

## 11. Lampiran — Dampak Kontrak Build & Butir Terbuka

### 11.1 Kepemilikan berkas & urutan kerja

> Proyek ini **bukan git repo**: tidak ada worktree, tidak ada branch, tidak ada merge, tidak ada jalan mundur selain menulis ulang. Karena itu kepemilikan berkas harus dipartisi **ketat** dan sebagian paket kerja **wajib serial**.

| WP | Pemilik berkas | Ketergantungan | Paralel? |
|---|---|---|---|
| **WP-A** | `domain/constants/roles.js`, `domain/constants/content-workflow.js` | — | Boleh mulai lebih dulu |
| **WP-B** | `domain/policies/AccessPolicy.js`, `domain/constants/content-workflow.js`, `domain/entities/UserAccount.js`, `domain/value-objects/PasswordHash.js`, `domain/services/{AuthService,ContentReviewService,ProgramImpactService}.js` | WP-A | Setelah WP-A |
| **WP-C** ⚠ | **Rename `member → awardee`**: `domain/entities/Member.js` → `Awardee.js` (14 importir), token `memberId` (**28 berkas**), `db.js`, `seed-data.js`, `bootstrap.js`, seluruh repository, seluruh store, seluruh route, seluruh `scripts/verify/*` | WP-A, WP-B | **TIDAK. Atomik & serial.** Dilarang diparalelkan dengan paket mana pun |
| **WP-D** | `infrastructure/auth/password.js`, `infrastructure/repositories/AccountRepository.js`, `infrastructure/seed/accounts.js`, `db.js` (v2 + tabel `accounts`), `bootstrap.js` (`SEED_VERSION`), naskah kegiatan baru | WP-C | Setelah WP-C |
| **WP-E** | `stores/session.svelte.js`, `stores/catalog.svelte.js` (`publishedEvents`), `components/ZoneGuard.svelte`, `data/navigation.js` | WP-B, WP-D | Setelah WP-D |
| **WP-F** | `components/EChart.svelte`, `charts/_echarts.js`, `charts/*.svelte` (6 lama + 6 baru) | WP-B | Paralel dengan WP-E |
| **WP-G** | `components/EventListPanel.svelte`, `components/editorial/*`, `StoryCard`/`EventCard`/`Header`/`Footer` | WP-E | Setelah WP-E |
| **WP-H** | `routes/(public)/**`, `static/img/**`, `static/favicon.svg` | WP-G | Paralel dengan WP-I/J/K |
| **WP-I** | `routes/awardee/**` | WP-E | Paralel |
| **WP-J** | `routes/verifikator/**` | WP-E | Paralel |
| **WP-K** | `routes/admin/**` | WP-E, WP-F | Paralel |

**Tiga berkas yang tidak boleh disentuh dua pihak** — `db.js`, `bootstrap.js`, `seed-data.js` — karena ketiganya memuat angka versi yang harus naik serentak. Seluruhnya milik **WP-D**, titik.

> **§11.1 seluruhnya DIGANTI oleh `12-BUILD-CONTRACT-V2.md` §1.2 & §3.** Penomoran `WP-A…WP-K` di atas
> **DICABUT**; yang berlaku `WP-01…WP-09`. Daftar berkas beku juga digantikan §1.2 di sana.

**~~Berkas beku~~ (`09` §4):** `src/app.css`, `src/app.html`, `package.json`, `vite.config.js`, `svelte.config.js`, `src/routes/+layout.svelte`, `src/routes/+layout.js`.

> **KOREKSI.** Prasyarat *"hanya setelah amandemen `08-DESIGN-SYSTEM.md` disahkan"* **DICABUT** — prasyarat
> itu tidak akan pernah terpenuhi, karena `12` §1.2 membekukan `docs/00…09` dan menetapkan dokumen baru
> mulai nomor 13. Yang berlaku: `app.css` dan `app.html` **dicabut dari daftar beku**, dimiliki **WP-03
> saja**, dengan daftar putih perubahan di `12` §3.4 — yang jauh lebih luas dari "dua baris tipografi":
> ia mencakup blok `@font-face` lokal, empat `@utility` baru, perubahan `@utility numeric` ke
> `var(--font-sans)`, penghapusan `<link>` Google Fonts, dan meta Open Graph.

### 11.2 Delta kontrak export terhadap `09-BUILD-CONTRACT.md` §5

> **§11.2 DIGANTI oleh `12-BUILD-CONTRACT-V2.md` §2.** Blok di bawah sudah dikoreksi agar memakai nama
> final; bila masih ada selisih, **§2 doc 12 yang menang** (KP-4).

```js
// ── §5 Konstanta — TAMBAH ──────────────────────────────────────────────────
export const UserRole = { AWARDEE, VERIFIER, ADMIN };        // domain/constants/roles.js
export const USER_ROLE_META;                                 // eks ROLE_META
export const RolePermission, ROLE_PERMISSIONS;
export const Zone, ZONE_PREFIX, ZONE_ROLES;                  // domain/policies/AccessPolicy.js (BUKAN roles.js)
export const STORY_TRANSITIONS, EVENT_TRANSITIONS;           // domain/constants/content-workflow.js
export const SLA_HARI_KERJA;
// entities/CommunityEvent.js — SATU sumbu:
//   EventStatus + DIUSULKAN/DITOLAK   (didaftarkan JUGA di EVENT_STATUS_META, :72)
export function kegiatanTampilPublik(status);                // SATU argumen
//   EventReviewStatus / EVENT_REVIEW_STATUS_META  -> TIDAK DIBUAT (§5.4 dicabut)
// BREAKING — community.js
//   MEMBER_STATUS       -> AWARDEE_STATUS
//   MEMBER_STATUS_META  -> AWARDEE_STATUS_META
//   STORY_STATUS_META[*] + peranAktor: UserRole   (field `aktor` TETAP, sebagai label UI —
//     satu-satunya konsumennya `awardee/cerita/+page.svelte:445`; menghapusnya merender
//     "Bola ada di undefined." dan lolos compile, build, dan verify:domain sekaligus)
// DIHAPUS — entities/Member.js
//   MemberRole                                    (nol importir eksternal; aman)

// ── §5 Value object — TAMBAH ───────────────────────────────────────────────
PasswordHash.of(plain) / PasswordHash.fromStored(hash)       // .matches(plain) .equals(o)
//   Sinkron & pure-JS. BUKAN batas keamanan — lihat §9.5 D-1.

// ── §5 Entity — TAMBAH / UBAH ──────────────────────────────────────────────
new UserAccount({ id, email, passwordHash, role, awardeeId, displayName, status,
                  createdAt, lastLoginAt })
  // .isAwardee .isVerifier .isAdmin .isActive .roleMeta .homePath
  // .can(permission) .matchesPassword(plain) .withChanges(patch)
Awardee            // eks Member; field `role`/`isAdmin` DIHAPUS (pindah ke UserAccount)
Story              // + authorId (eks memberId), reviewerId, reviewedAt,
                   //   publishedById, revisionCount
CommunityEvent     // + slug, proposedBy, proposedByRole, submittedAt,
                   //   reviewedBy, reviewedAt, reviewNote, publishedAt
                   //   (reviewStatus / createdById / createdByRole -> TIDAK DIBUAT)
                   //   registeredMemberIds -> registeredAwardeeIds
                   //   attendeeMemberIds   -> attendeeAwardeeIds

// ── §5 Policy & Service — TAMBAH ───────────────────────────────────────────
AccessPolicy.zoneOf(pathname) / canAccess(role, pathname) / homePathFor(role) / safeNext(next, role)
AccessPolicy.canSeeScoring(role) / canReviewContent(role) / canPublishContent(role)
AccessPolicy.isSelfReview(actorId, authorId)
allowedStoryTransitions(from, role) / allowedEventTransitions(from, role)   // content-workflow.js
canTransitionStory(from, to, role)  / canTransitionEvent(from, to, role)
new AuthService({ accountRepo, awardeeRepo, clock })       // eks AuthenticationService
  await login(email, password)        // -> { ok, account, awardee, reason }
new ContentReviewService({ storyRepo, eventRepo, clock })  // TANPA idGenerator
  await publishStory(story, actor)    // gate: story.isPublishable — diperiksa ULANG
  await archiveStory(story, actor, reason)   // urutan (entity, actor, …) untuk SEMUA method
  await cancelEvent(event, actor, reason)
  await pipeline() / await slaCompliance()   // C-19 & C-20
new ProgramImpactService({ awardeeRepo, activityRepo, movementRepo, storyRepo, eventRepo })
  await publicSnapshot()              // TANPA poin/tier — satu-satunya sumber angka publik
                                      // .capturedAt (BUKAN .snapshotAt) · .beneficiaryRegistry
// EditorialMetricsService            // TIDAK DIBUAT — lihat §7.2 koreksi

// ── §5 Store — UBAH ────────────────────────────────────────────────────────
session.loginAsMember(id) / session.loginAsAdmin()   // DIHAPUS
session.login(email, password)  // -> { success, error }; WAJIB bootstrapDatabase() lebih dulu
session.role: UserRole | null · session.ready · session.loading   // TANPA `hydrated`
session.canAccess(pathname) · session.homePath() · session.nextAfterLogin(next)
catalog.publishedEvents · catalog.upcomingEvents(pada, limit)   // BARU (derived dari publishedEvents)

// ── §5 Komponen — TAMBAH / UBAH ────────────────────────────────────────────
ZoneGuard        {zone, label, children}   // WAJIB data-zone-splash & data-zone-denied
EventListPanel   {events:EventCardVM[], limit, title, href, variant:'panel'|'rail'|'strip', thumbnailAt}
MonthCalendar    {month, events:EventCardVM[], selected, min, max, compact, onselect, onstep}
DataBand · SectionRule · StorySpread · EditorialHero · PhotoFigure · ImpactFigure · PullQuote  // §2.13
eventCardVM(event) / storyVM(story)        // components/editorial/view-model.js
EChart           {option, height, cls, loading, emptyMessage, onclick}   // aditif
EventCard        {..., showPoints = false}                              // aditif
StoryCard        {story, foto: Photo|null, …}   // `foto`, BUKAN string `cover`
Header           {..., profileHref, notificationHref, roleLabel}         // aditif
MemberCard       -> AwardeeCard {awardee, showScoring = false, variant}  // varian publik TANPA poin/badge/tier
```

Selain itu **§3 (daftar route)** `09` diganti seluruhnya oleh §3 dokumen ini: 8 → 11 route publik, `/member/*` → `/awardee/*`, zona `/verifikator/*` baru, total 25 → 36.

### 11.3 Delta seed & akun demo

| Koleksi | Sekarang | Menjadi |
|---|---|---|
| `members` → `awardees` | 60 | 60 (rename tabel; isi tidak berubah) |
| `accounts` **(BARU)** | — | **63** = 60 Awardee + 2 Verifikator + 1 Admin |
| `events` | 13 (hanya **2** mendatang) | **≥19** — +4–6 mendatang (`day` 205–260, minimal satu luring) + 2 usulan `DIAJUKAN` |
| `stories` | 22 (12 `TERPUBLIKASI`) | 22 — **cukup**; pastikan `authorId` cerita non-publik menunjuk akun yang dapat dilogin |
| Tabel Dexie | 11 | 12 (`accounts: 'id, &email, role, awardeeId, status'`) |
| `DB_VERSION` / `SEED_VERSION` | 1 / 1 | **2 / 2** — naik bersamaan |

**Akun verifikator memakai id yang sudah tertanam di data:** `PF-CORSEC-01` sudah menjadi `validatorId` dan `reviewerId` pada cerita ter-seed (`seed-data.js:1743`, `:1751`). Memakai id yang sama membuat jejak review historis **langsung punya pemilik**, bukan menunjuk string yatim. Verifikator kedua `PF-CORSEC-02` ditambahkan agar kolom "ditinjau oleh" tidak seragam **dan** agar C-19 punya jalan keluar (§5.5). Admin `PF-CORSEC` dipindahkan dari objek konstanta `session.svelte.js:69-76` menjadi baris `accounts` — store berhenti menjadi sumber identitas.

### 11.4 Butir yang perlu dikonfirmasi Corsec

Melengkapi lampiran `docs/02` (8 butir) dan `docs/04` §10. Butir ini **tidak** diputuskan sendiri; masing-masing punya perilaku sementara yang aman sampai dijawab.

| # | Butir | Perilaku sementara | Dampak bila salah |
|---|---|---|---|
| **K-01** | Apakah kalender publik menampilkan kegiatan **luring** beserta alamat lengkap? | Tampilkan kota/kanal saja | Alamat tempat kegiatan berpotensi menjadi isu keamanan peserta |
| **K-02** | Apakah nama narasumber boleh tampil publik tanpa consent terpisah? | Tampilkan hanya bila narasumber pihak PF | Publikasi nama tanpa dasar = pelanggaran consent |
| **K-03** | Berapa akun Verifikator yang akan ada? Bila satu, dual-control `docs/03` §5.10 mustahil | Seed dengan **dua** | Pemisahan tugas melemah tanpa mitigasi; C-19 menjadi deadlock |
| **K-04** | Apakah Verifikator boleh menerbitkan kegiatan buatannya sendiri (E-04)? | **Boleh**, tercatat `event.self_published` | Bila tidak, verifikator kedua wajib sejak hari pertama |
| **K-05** | Cacah "anggota terdata" publik memakai penyebut registry, atau angka absolut? | Angka absolut + penyebut chapter | Menentukan apakah 75% muncul di publik |
| **K-06** | Nilai `α` (koefisien eksposur) untuk rentang jangkauan publik | `0,1–1,0` dari `REACH_PARAMETERS`, berlabel `[ASUMSI]` | Menggeser rentang publik hingga 10× |
| **K-07** | Rentang publik memakai `Reach_bruto` (angka komunikasi) atau `Reach_neto` (angka perencanaan)? | **Bruto**, dilabeli tegas | Selisih ±30%; keduanya sudah dikembalikan berdampingan oleh `KpiCalculator.organicReach()` dan **harus dilabeli berbeda** |
| **K-08** | Apakah kredensial demo boleh dipajang di `/masuk`? | Dipajang dengan penanda "tiruan" | Bila mockup dipresentasikan ke pihak luar, perlu disembunyikan |
| **K-09** | Siapa pemegang peran DPO/Data Steward setelah konsolidasi ke 3 peran? | **Admin** (X-09) | Akses PII dan consent penuh tidak punya pemilik yang jelas |
| **K-10** | Apakah Admin boleh membatalkan keputusan Verifikator lewat jalur banding? | Boleh, **tercatat** (X-13 ◐) | Menentukan ada/tidaknya alur banding di `/admin` |

---

> **Akhir dokumen.** Perubahan atas dokumen ini diperlakukan sebagai amandemen bernomor, bukan suntingan diam-diam.
