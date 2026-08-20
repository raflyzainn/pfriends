# 11: ARAH VISUAL & MANIFEST FOTO

> **Ruang lingkup:** bahasa visual **zona publik** Pfriends (`src/routes/(public)/**`) + seluruh aset foto.
> **Pemicu:** kritik pemilik program: *"webnya terlalu AI"*.
> **Turunan dari:** `08-DESIGN-SYSTEM.md` (token & kontras), `09-BUILD-CONTRACT.md` (kepemilikan file),
> `10-REVISION-SPEC.md` (US-R19 · US-R21 · US-R28 · US-R29), Keputusan Pemilik Produk 22 Juli 2026.
> **Status:** normatif untuk **rupa, foto, tipografi, dan kontras**. Dieksekusi oleh **WP-03** (komponen,
> aset, token) dan **WP-04** (route publik) menurut penomoran `12-BUILD-CONTRACT-V2.md` §3.
> **Tanggal:** 22 Juli 2026.
>
> ## ⚠ KOREKSI WAJIB DIBACA SEBELUM APA PUN
>
> 1. **Penomoran "WP-5" dan "WP-6" di dokumen ini adalah penomoran LAMA (`09-BUILD-CONTRACT.md` §4) dan
>    DICABUT.** Baca **WP-5 → WP-03** dan **WP-6 → WP-04**. Pada `12-BUILD-CONTRACT-V2.md`, WP-05 adalah
>    **zona Awardee** dan WP-06 adalah **zona Verifikator**: dua paket yang berjalan **paralel** di G3-B.
>    Agen yang mengikuti nomor lama akan menyunting `app.css`, `app.html`, `editorial/**`, dan
>    `(public)/_view-model.js` milik paket lain, pada gelombang yang sama, **tanpa git**.
> 2. **Seluruh pernyataan kepemilikan berkas di dokumen ini BATAL.** Kepemilikan hanya di
>    `12-BUILD-CONTRACT-V2.md` §1.2 & §3.
> 3. **Nama dan props komponen di §8 DIGANTI** oleh `12-BUILD-CONTRACT-V2.md` §2.13, yang FINAL:
>    `EventRail`→`EventListPanel` · `MiniCalendar`→`MonthCalendar` (props `events:EventCardVM[]`, **bukan**
>    `markers`) · `ImpactBand`→`DataBand` · `EditorialSection`→`SectionRule`. `PhotoFigure`, `ImpactFigure`,
>    `PullQuote`, dan `EditorialHero` mempertahankan namanya, props mengikuti §2.13. **Svelte 5 mengabaikan
>    props tak dikenal tanpa error**: memakai nama props doc 11 terhadap komponen doc 12 menghasilkan hero
>    tanpa foto dan kalender tanpa penanda, dengan seluruh gerbang tetap hijau.
> 4. **§12 (Amandemen A-02) DIGANTI** oleh `12-BUILD-CONTRACT-V2.md` §3.3 & §3.4. Rujukan
>    "`09-BUILD-CONTRACT.md` §4" sudah kedaluwarsa.
>
> Daftar amandemen lengkap: `12-BUILD-CONTRACT-V2.md` §8.2.

**Satu kalimat arah.** Pfriends berhenti terlihat seperti *template produk* dan mulai terlihat seperti
**terbitan komunitas**: foto kegiatan sungguhan, tipografi yang punya suara, grid yang tidak pernah rata,
angka yang selalu membawa penyebutnya, dan **nol** angka poin di ruang publik.

**Batas yang tidak bisa ditawar (Keputusan Pemilik Produk #2).** Perhitungan poin, tabel skor, tier, papan
peringkat, dan badge **tidak boleh muncul di zona publik**. Seluruh rancangan di dokumen ini disusun tanpa
mereka: bukan disembunyikan dengan CSS, melainkan **tidak dipanggil sama sekali**. Komponen `PointsChip`,
`TierBadge`, `TierProgress`, `LeaderboardRow`, `BadgeTile` tidak boleh diimpor oleh satu pun berkas di bawah
`src/routes/(public)/`.

---

## Daftar isi

1. [Diagnosis: 14 ciri "terbaca AI", dengan bukti berkas](#1-diagnosis--14-ciri-terbaca-ai-dengan-bukti-berkas)
2. [Tujuh prinsip desain (DO / DON'T)](#2-tujuh-prinsip-desain-do--dont)
3. [Sistem tipografi](#3-sistem-tipografi)
4. [Perlakuan foto](#4-perlakuan-foto)
5. [Manifest foto: tabel eksekusi](#5-manifest-foto--tabel-eksekusi)
6. [Rancangan ulang beranda, seksi demi seksi](#6-rancangan-ulang-beranda-seksi-demi-seksi)
7. [Halaman blog + panel event di sisinya](#7-halaman-blog--panel-event-di-sisinya)
8. [Komponen visual baru](#8-komponen-visual-baru)
9. [Komponen lama: diubah, dipensiunkan, dipindah](#9-komponen-lama-diubah-dipensiunkan-dipindah)
10. [Kontras WCAG AA untuk kombinasi baru](#10-kontras-wcag-aa-untuk-kombinasi-baru)
11. [Checklist penerimaan visual](#11-checklist-penerimaan-visual)
12. [Amandemen A-02 ke Build Contract](#12-amandemen-a-02-ke-build-contract)

---

## 1. Diagnosis: 14 ciri "terbaca AI", dengan bukti berkas

Setiap butir diperiksa langsung pada kode dan tangkapan layar `docs/screenshots/`, bukan diperkirakan.
Format bukti: `path:baris`.

---

### D-01 · Gradient blur blob di hero + aura radial di seluruh badan halaman

**Bukti**
- `src/routes/(public)/+page.svelte:107`: `absolute -top-24 -right-24 h-72 w-72 rounded-full bg-pertamina-red/25 blur-3xl`
- `src/routes/(public)/+page.svelte:111`: kembarannya, `bg-pertamina-green/20 blur-3xl`
- `src/app.css:129-132`: dua `radial-gradient` merah & biru 4 % dipasang `background-attachment: fixed` pada `<body>`

**Kenapa terbaca mesin.** Blob blur di sudut hero adalah *default* landing page 2022–2024 dan tanda template
paling dikenali. Pada `docs/screenshots/01-beranda.png` efeknya bahkan tidak terbaca sebagai desain: hanya
kabut keunguan kotor di sudut kanan-atas panel navy. Uji tegasnya: hapus, dan **tidak ada informasi yang
hilang**. Dekorasi yang bisa dihapus tanpa kehilangan adalah definisi dekorasi yang tidak pernah diedit
siapa pun.

**Tindakan.** Hapus `:106-113`. Hapus `app.css:129-132` (butuh Amandemen A-02, §12).

---

### D-02 · Kolom kanan hero adalah *pricing table* SaaS

**Bukti**
- `+page.svelte:154`: `rounded-panel border border-white/15 bg-white/10 p-5 backdrop-blur-sm`
- `:166`: baris `flex items-center gap-3 rounded-control bg-white/95 px-3 py-2.5`, empat kali
- Isi: `25 / 50 / 100 / 150` + nama tier + satu baris manfaat (jelas terlihat di `01-beranda.png`)

**Kenapa terbaca mesin.** Susunan "angka besar · nama paket · satu baris manfaat", empat kali, adalah tabel
Starter / Pro / Business. Sekali dikenali, seluruh halaman ikut terbaca sebagai produk berlangganan, bukan
program korporat. Masalahnya ganda: **salah bentuk dan salah isi**: panel ini juga melanggar Keputusan #2.

**Tindakan.** Cabut `:154-182`. Materinya pindah ke `/awardee`: dipindahkan, bukan dibuang.

---

### D-03 · Empat kepala seksi berturut-turut identik strukturnya

**Bukti**: pola `label-micro` → `<h2 class="mt-2 text-2xl … md:text-3xl">` → `<p class="mt-3 …">` diulang di
`+page.svelte:227-234`, `:299-306`, `:386-392`, `:432-439`.

**Kenapa terbaca mesin.** Ini pola *output model*, bukan pola editorial. Redaktur manusia memvariasikan kepala
seksi: kadang ada kicker, kadang tidak; kadang dek dua baris, kadang langsung masuk isi; kadang rata kiri,
kadang di tengah. Di sini ritmenya identik empat kali, sehingga mata berhenti membaca setelah seksi kedua.

---

### D-04 · Judul empat seksi berbeda dipasang pada ukuran & bobot yang sama persis

**Bukti**: `+page.svelte:228`, `:300`, `:387`, `:433`: keempatnya `text-2xl font-bold tracking-[-0.02em] md:text-3xl`.

**Kenapa terbaca mesin.** Hierarki tipografi hanya punya dua tingkat efektif (judul & body). Halaman
berkarakter menyatakan *mana yang paling penting*; halaman ini menyatakan semuanya setara: persis yang
terjadi ketika tidak ada seorang pun yang memutuskan prioritas.

---

### D-05 · Semua isi adalah kartu putih radius 16 tanpa satu pun *lead item*

**Bukti**
- `src/app.css:188-196`: `@utility card` = `bg-surface` + `border ink-100` + `rounded-card` (`--radius-card: 1rem`) + `shadow-card`
- `src/lib/components/Card.svelte:29-34`: empat varian; `default`, `flush`, `interactive` identik secara visual
- `src/lib/components/StatTile.svelte:52`: `card block`
- `src/lib/components/StoryCard.svelte:40-41`: `rounded-card border border-ink-100 bg-surface shadow-card`
- `01-beranda.png`: 4 StatTile identik → 2 kartu komunitas identik → 4 kartu langkah identik → 2 kartu
  gamifikasi → 4 MemberCard identik → 3 StoryCard identik. `04-cerita.png`: 12 kartu identik.

**Kenapa terbaca mesin.** Tidak ada satu pun objek di zona publik yang lebih besar, lebih gelap, atau lebih
berat daripada yang lain. Layar terbaca sebagai **daftar**, bukan sebagai halaman yang diedit.

---

### D-06 · Ikon outline seragam di dalam kotak tint membulat: 20+ kejadian

**Bukti**
- `+page.svelte:242-250` (`h-11 w-11 rounded-xl` + tint), `:313-317` (`h-10 w-10 rounded-xl bg-pertamina-navy-tint`)
- `tentang/+page.svelte:260-264`, `komunitas/+page.svelte:115-120` & `:210-214`: pola yang sama persis
- `StatTile.svelte:56-61`: `rounded-xl` + `background:color-mix(in srgb, {warna} 12%, transparent)`
- Seluruh ikon satu keluarga, satu bobot garis (`Icon.svelte` default `strokeWidth 1.8`)

**Kenapa terbaca mesin.** "Ikon garis di dalam kotak pastel membulat" adalah *single most recognizable tell*.
Yang menghitung bukan ikonnya, melainkan **keseragaman wadahnya** yang muncul lebih dari dua puluh kali dalam
empat halaman.

---

### D-07 · Nol foto manusia di seluruh zona publik: direktori `static/` bahkan belum ada

**Bukti**
- `ls static` → `No such file or directory` (diverifikasi 22 Juli 2026)
- Tidak ada satu pun `<img>` bersumber nyata di lima halaman publik
- `src/lib/components/Avatar.svelte:54-64` punya cabang `{#if src}`, tetapi seed tidak pernah mengisinya →
  semua avatar jatuh ke inisial dua huruf (`01-beranda.png`: "ZK / MS / SW / AS"; `04-cerita.png`: "WP / BL / AF / SW")
- `src/app.html:5-6` merujuk `%sveltekit.assets%/favicon.svg` yang **tidak pernah ada** → 404 di setiap muat halaman

**Kenapa terbaca mesin.** Ini program tentang orang-orang nyata di tiga chapter, dan tidak ada satu wajah pun.
Model bahasa memang tidak bisa memotret. Ketiadaan foto adalah bukti paling telak bahwa halaman ini tidak
pernah disentuh manusia yang punya arsip.

---

### D-08 · Placeholder gradien dipromosikan menjadi "desain"

**Bukti**
- `src/lib/components/StoryCard.svelte:53-61`: fallback
  `background:linear-gradient(135deg, ${pilar.tint} 0%, var(--color-ink-50) 100%)` + `<Icon size={48} strokeWidth={1.2}>`
- `src/routes/(public)/_view-model.js:32-44`: **`kartuCerita()` tidak memetakan `cover` sama sekali**,
  sehingga `story.cover` selalu `undefined` dan **100 %** kartu cerita memakai fallback
- `src/routes/(public)/cerita/[slug]/+page.svelte:128`: sampul artikel juga gradien pilar → navy
- `04-cerita.png`: seluruh 12 kartu memakai fallback; kartu unggulan menjadi persegi panjang hijau pucat
  selebar ±900 px dengan satu daun kecil di tengah

**Kenapa terbaca mesin.** Itu bukan sampul, itu keadaan "aset belum ada" yang naik ke produksi. Halaman cerita
membaca seperti wireframe berwarna. Perbaikan termurah di seluruh dokumen ini adalah **satu baris** di
`_view-model.js`: lihat §9.

---

### D-09 · Satu keluarga font, satu suara, skala yang berdempet

**Bukti**
- `src/app.css:102-103`: `--font-sans` dan `--font-display` berisi **stack yang sama persis**
  (`'Plus Jakarta Sans', 'Inter', system-ui, …`)
- `docs/08-DESIGN-SYSTEM.md:44` menyatakannya sebagai keputusan: "Satu keluarga font"
- Skala §3.2 dokumen desain: 40/28/24/20/16/14/13/12/10: sembilan langkah, mayoritas berdempet di 12–16 px
- Body zona publik 14 px

**Kenapa terbaca mesin.** Tanpa kontras keluarga (serif display vs sans teks), tidak ada *suara*. Body 14 px
adalah konvensi dasbor produk, bukan konvensi editorial (16–19 px). Hasilnya: halaman korporat yang terbaca
seperti panel admin.

---

### D-10 · Spacing metronomik: halaman berdetak, bukan berirama

**Bukti**: padding vertikal seksi beranda berurutan:
`py-10` (`:188`) → `py-12` (`:225`) → `py-14` (`:297`) → `py-12` (`:383`) → `py-12` (`:429`) → `py-14` (`:471`).
Halaman `tentang` memakai `mt-12` di **setiap** batas seksi (`:224`, `:247`, `:286`, `:300`, `:349`).
Gap grid nyaris selalu `gap-4` / `gap-5`.

**Kenapa terbaca mesin.** Tidak ada seksi yang sengaja dipadatkan, tidak ada yang sengaja diberi napas.
Editor manusia mengatur tempo; generator mengulang token.

---

### D-11 · Grid selalu simetris dan selalu habis dibagi

**Bukti**: `+page.svelte:190` `lg:grid-cols-4` · `:237` `md:grid-cols-2` · `:309` `sm:grid-cols-2 lg:grid-cols-4`
· `:397` `lg:grid-cols-4` · `:450` `sm:grid-cols-2 lg:grid-cols-3` · `tentang:256` `lg:grid-cols-3`
· `tentang:305` `sm:grid-cols-3`.
Satu-satunya grid asimetris di seluruh zona publik ada di `:328`
(`lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]`), dan selisih 1.15 : 0.85 terlalu kecil untuk terlihat.

**Kenapa terbaca mesin.** Tidak ada item yang pernah `col-span-2`, tidak ada foto yang *bleed*, tidak ada
kolom yang di-offset. Kolom seragam adalah cara tercepat membuat halaman terlihat di-generate.

---

### D-12 · Angka statistik tanpa penyebut, tanpa periode, tanpa sumber

**Bukti**: `+page.svelte:191-219`: empat `StatTile` identik berisi `52 / 3 / 12 / 4`.
`tentang:305-340`: `25–500 / 2–3× / 5–20%` dalam tiga kartu identik.

**Kenapa terbaca mesin.** "52" dan "4" diketik pada ukuran yang sama, jadi desain menyatakan keduanya sama
pentingnya. Angka tanpa penyebut ("52 dari berapa?") dan tanpa tanggal potret adalah tanda konten yang tidak
pernah ditanyai balik oleh manusia.

---

### D-13 · Antitesis "X, bukan Y" muncul delapan kali

**Bukti**: `+page:301` "tercatat, bukan yang terlupakan" · `+page:351` "bermakna, bukan … sekadar ramai" ·
`tentang:64` "lewat orang, bukan iklan" · `tentang:252` "bukan sekadar kategori" · `tentang:343` "bukan
capaian yang sudah terukur" · `komunitas:184` "bukan penggabungan administratif" · `gerakan:75` "Bukan acara
sekali jalan" · `gerakan:146` "bukan dari atas".
Ditambah pasangan over-reassurance yang berdempetan: `+page:332-333` "Tidak ada aksi tersembunyi dan tidak ada
nilai yang berubah diam-diam" dan `:358` "Tidak ada syarat tersembunyi."

**Kenapa terbaca mesin.** Satu antitesis itu bagus. Delapan adalah tic model bahasa. Efeknya justru terbalik:
teks terdengar defensif terhadap tuduhan yang belum diajukan siapa pun.

---

### D-14 · Empat halaman berakhir dengan kartu CTA merah muda yang identik

**Bukti**: `tentang:349-361`, `komunitas:287-299`, `cerita:154-167`, `gerakan:155-168`:
`<Card variant="highlight" padding="lg" class="mt-12">` + flex row + `<h2>` + `<p>` + tombol `Gabung Sekarang`.
`Card.svelte:33`: `highlight: 'bg-pertamina-red-tint/30 border border-pertamina-red/30 rounded-card'`.
Ditambah `Footer.svelte:64-75`: dua pil berbingkai "PT Pertamina (Persero)" / "Danantara Indonesia" yang
terbaca sebagai chip placeholder.

**Kenapa terbaca mesin.** Ini loop template yang **terlihat** sebagai loop template. Pembaca yang membuka dua
halaman langsung tahu halaman ketiga akan berakhir bagaimana.

---

### D-15 · (kepatuhan) Skor bocor ke zona publik di delapan titik

Bukan soal estetika, tetapi ikut membuat microsite korporat terbaca sebagai *gamified app*:

| Lokasi | Kebocoran |
|---|---|
| `(public)/+page.svelte:24`, `:28-29`, `:39` | impor `PointsChip`, `SCORING_TABLE`, `TIER_TABLE`; konstanta `TIER_CAPAIAN` |
| `(public)/+page.svelte:154-182` | tangga tier di hero |
| `(public)/+page.svelte:296-425` | tabel 9 aksi + tabel 4 tier + papan "Sorotan kontribusi" (≈2 dari 5 layar gulir) |
| `(public)/komunitas/+page.svelte:17`, `:86`, `:258-261` | `poinUntuk(SESSION_ATTEND)` ditayangkan "+15 poin" |
| `(public)/gerakan/+page.svelte:21`, `:128-131` | "bernilai 50 poin: nilai tertinggi dalam tabel kontribusi" |
| `(public)/cerita/+page.svelte:159-161` | "menambah poin kontribusi" |
| `(public)/cerita/[slug]/+page.svelte:25`, `:151`, `:156` | cincin tier + `<TierBadge>` pada byline penulis |
| `src/lib/components/EventCard.svelte:136-137` | chip `+15 PK` (terlihat pada `03-komunitas.png`) |

Semua **pindah** ke `/awardee`; agregatnya (tanpa poin) ke `/admin`.

---

## 2. Tujuh prinsip desain (DO / DON'T)

Prinsip ini mengikat seluruh zona publik. Zona `/awardee`, `/verifikator`, `/admin` **tetap** memakai bahasa
produk yang sekarang (kartu, chip, 14 px): di sana keseragaman justru benar, karena yang dikerjakan adalah
tugas berulang, bukan bacaan.

---

### P-1 · Foto adalah subjek, bukan latar

Setiap seksi yang bercerita tentang orang harus memuat foto orang. Foto tidak pernah diperlakukan sebagai
tekstur di belakang teks; ia punya ruang sendiri, kapsi sendiri, dan kredit sendiri.

| | |
|---|---|
| **DO** | `<PhotoFigure>` dengan foto 4:5 di kolom 1–5, teks di kolom 7–12, kapsi di bawah foto dengan hairline 1 px di atasnya. |
| **DON'T** | Foto dipasang `absolute inset-0 opacity-20` di belakang paragraf, atau di-`blur` supaya teks terbaca. Kalau teks butuh fotonya diburamkan, foto itu salah dipilih. |
| **DON'T** | Ikon garis 48 px di tengah kotak gradien sebagai pengganti foto (`StoryCard.svelte:53-61`). |

---

### P-2 · Setiap angka membawa penyebutnya dan tanggal potretnya

| | |
|---|---|
| **DO** | `52` (Fraunces 56 px) · `ANGGOTA TERDATA` (mono 11 px) · `{{penyebut registri}} · per 22 Juli 2026` (14 px). |
| **PERINGATAN** | Angka **"1.240 penerima manfaat"** yang beredar di draf sebelumnya **DILARANG dipakai**: ia tidak ada di `00-SOURCE-BRIEF.md` maupun di kode: satu-satunya kemunculan `1.240` di repositori adalah *"1.240 batang sabun cuci"* (`seed-data.js:950`). Penyebut populasi **hanya** boleh dibaca dari `snapshot.beneficiaryRegistry` (`12-BUILD-CONTRACT-V2.md` §2.10), yang bersumber dari `kpi-targets.js` / injeksi `#registrySize` (`KpiCalculator.js:186`). Bila `beneficiaryRegistry.value === null`, `context` diisi **periode** (*"per 22 Juli 2026"*), bukan penyebut karangan. Mengarang penyebut lalu melabelinya bertanggal adalah reproduksi persis cacat D-12 yang sedang diperbaiki, dan melanggar §5.3 A-2 doc 12. |
| **DO** | Estimasi selalu **rentang** + lencana `Estimasi` + kontrol `ⓘ` yang membuka rumus dan asumsinya. |
| **DON'T** | `<StatTile value={52} label="Anggota terdata" />` berdiri sendiri di dalam kartu. |
| **DON'T** | Menyamakan ukuran angka yang berbeda bobot maknanya (`52` dan `4` pada 28 px yang sama). |
| **DON'T** | Nilai rupiah (EMV, penghematan paid media, SROI) di zona publik: apa pun bentuknya. |

---

### P-3 · Ritme dipatahkan dengan sengaja

Aturan operasional: **tidak ada dua seksi bersebelahan yang memakai jumlah kolom yang sama**, dan **tidak ada
rentetan lebih dari tiga objek berukuran identik**.

| | |
|---|---|
| **DO** | E3 memakai 5/7 bercermin → E4 memakai 5/7 sticky → E5 memakai 7/5 lalu 4×1 teks murni → E6 memakai 1 unggulan + 3 baris. |
| **DO** | Ritme vertikal sengaja tidak rata: `0 · 0 · 128 · 88 · 128 · 112 · 72` px pada ≥1024. |
| **DO** | Satu penyimpangan yang disengaja per daftar: hanya baris ke-3 `EventListPanel` yang punya thumbnail: dan indeksnya ditentukan PEMANGGIL per lokasi (`thumbnailAt`), bukan oleh nilai bawaan komponen. |
| **DON'T** | `py-12` di enam seksi berturut-turut (`+page.svelte:188…471`). |
| **DON'T** | `lg:grid-cols-4` dipakai di seksi ke-2 lalu diulang di seksi ke-5 (`:190` dan `:397`). |

---

### P-4 · Kedalaman datang dari foto, garis, dan ruang putih: tidak pernah dari blur

| | |
|---|---|
| **DO** | Pemisah = hairline 1 px `ink-200`. Penekanan = keying rule solid 4 px. Kedalaman = foto full-bleed + panel putih yang menumpuknya (`margin-top: -80px`). |
| **DON'T** | `blur-3xl`, `backdrop-blur-*` di zona publik, `linear-gradient` sebagai isian permukaan, aura `radial-gradient` pada `<body>`. |
| **DON'T** | Duotone. Duotone kini justru tanda template, dan ia merusak warna kulit: persis hal yang sedang kita tambahkan. |

---

### P-5 · Warna dipakai hemat: 90 / 7 / 3

90 % kertas + tinta · 7 % navy (hanya pita full-bleed dan overlay foto) · 3 % merah (hanya tombol primer,
keying rule, garis bawah nav aktif).

| | |
|---|---|
| **DO** | **Maksimum satu ISIAN merah (tombol primer ber-latar `pertamina-red-ink`) per viewport.** Keying rule, garis bawah nav aktif, dan penanda tanggal **tidak dihitung**: ketiganya bar/garis yang tidak menyentuh glyph, sesuai aturan emas `08-DESIGN-SYSTEM.md §0.1`. Konsekuensi konkret pada viewport pertama beranda: tombol `[ Gabung ]` di masthead menjadi **outline**, dan satu-satunya isian merah adalah `[ Gabung Sekarang ]` di E1. |
| **DO** | Aturan emas `08-DESIGN-SYSTEM.md §0.1` tetap utuh: **warna polos tidak pernah menyentuh glyph.** Keying rule adalah bar, bukan huruf. |
| **DON'T** | Panel berlatar `-tint` di zona publik (`Card variant="highlight"` = `bg-pertamina-red-tint/30`, `bg-pertamina-navy-tint`, `esg-*-tint`). Kotak pastel adalah tanda template. Tint **tetap hidup** di zona ter-login, karena di sana ia membawa makna keadaan. |
| **DON'T** | Enam objek merah dalam satu viewport seperti sekarang (logo, tombol outline, tombol fill, ikon flag, border kutipan, baris tier Featured). |

---

### P-6 · Tipografi punya dua suara, dan keduanya tidak pernah bertukar tugas

| | |
|---|---|
| **DO** | Fraunces (serif) **hanya** untuk display ≥24 px dan angka data. Plus Jakarta Sans untuk seluruh teks berjalan dan UI. JetBrains Mono untuk kicker/label. |
| **DO** | Body zona publik **16 px / 1.68**, measure 58–68 karakter. |
| **DON'T** | Fraunces di bawah 24 px: terbaca sebagai teks badan yang salah pilih font. |
| **DON'T** | Plus Jakarta Sans di atas 24 px pada zona publik (mengembalikan D-09). |
| **DON'T** | Judul yang berbeda kepentingannya dipasang pada ukuran yang sama. |

---

### P-7 · Teks menyatakan fakta yang dapat diperiksa

Lima aturan redaksi, masuk sebagai lampiran `08-DESIGN-SYSTEM.md`:

1. Maksimum **satu** konstruksi "X, bukan Y" di seluruh zona publik.
2. Setiap angka membawa penyebut atau periodenya.
3. Tidak ada kalimat yang menjelaskan proses internal kepada pembaca luar
   ("Semuanya bersedia namanya ditampilkan", `+page:391`).
4. Tidak ada daftar tiga kata kerja abstrak ("terhubung, berbagi keahlian, dan menggerakkan",
   `Footer.svelte:37-40`). Ganti dengan satu kata kerja + satu objek konkret.
5. Setiap foto punya kapsi bertempat dan berbulan.

**Contoh penerapan: 7 perbaikan wajib:**

| # | Sekarang | Ganti dengan |
|--:|---|---|
| 1 | "Sekali jadi Sobat Bumi, selamanya jadi keluarga." `+page:126-127` | **"Setelah programnya selesai, ke mana perginya orang-orang ini?"**: pertanyaan sungguhan; itulah rumusan masalahnya. |
| 2 | "rumah bersama … Tempat keahlianmu bertemu orang yang membutuhkannya, dan kontribusi sekecil apa pun tetap tercatat serta dihargai." `:131-134` | **"Pfriends menghubungkan alumni Beasiswa Sobat Bumi dengan pelaku UMKM binaan PFpreneur. Sejak Mei 2026: 52 orang bergabung di tiga chapter, 11 cerita lapangan terbit, 4 gerakan berjalan di 3 provinsi."** |
| 3 | "Kontribusi yang tercatat, bukan yang terlupakan" `:301` | Seksi pindah ke `/awardee`. Penggantinya kepala E4: **"Agenda Agustus"** / dek **"Tiga kelas dan satu temu nasional. Dua di antaranya daring, bisa diikuti dari mana saja."** |
| 4 | "Tidak ada aksi tersembunyi…" `:332-333` + "Tidak ada syarat tersembunyi." `:358` | Pindah ke `/awardee/aksi` sebagai kebijakan: **"Sembilan jenis kontribusi. Nilainya tetap sejak 1 Juni 2026. Perubahan diumumkan lewat Kabar Pfriends paling lambat 14 hari sebelum berlaku."** |
| 5 | "Anggota dengan kontribusi terbanyak sepanjang 2026. Semuanya bersedia namanya ditampilkan." `:391` | Seksi dihapus dari publik. Penggantinya **byline** di E5: **"Wulan Panjaitan: alumni PF 11, guru fisika di SMA Negeri 3 Palu."** Satu nama + satu angkatan + satu pekerjaan mengalahkan satu papan peringkat. |
| 6 | "…bukan sekadar kategori pada dokumen perencanaan." `tentang:252-253` | **"Enam pilar dari dokumen inisiatif Februari 2026. Empat sudah berjalan, dua dijadwalkan kuartal keempat."** |
| 7 | "…untuk tetap terhubung, berbagi keahlian, dan menggerakkan aksi keberlanjutan…" `Footer.svelte:37-40` | **"Dikelola Divisi Corporate Secretary, Pertamina Foundation. Pertanyaan: pfriends@pertaminafoundation.org."** Footer adalah tempat fakta. |

---

## 3. Sistem tipografi

### 3.1 Pasangan font: tiga keluarga, semuanya SIL OFL 1.1, nol biaya lisensi

| Peran | Keluarga | Lisensi & sumber | Kenapa |
|---|---|---|---|
| **Display & angka data** | **Fraunces** | SIL OFL 1.1 · `github.com/undercasetype/Fraunces` | Serif variabel dengan sumbu `SOFT` dan **`WONK`**. Sumbu WONK secara harfiah membuat beberapa huruf sedikit "salah" (ekor *g*, terminal *y*): kebalikan langsung dari kerataan yang membuat halaman terbaca otomatis. Sumbu `opsz` menjaga ukuran besar tidak terlihat gemuk. |
| **Teks, UI, angka tabel** | **Plus Jakarta Sans** | SIL OFL 1.1 · `github.com/tokotype/PlusJakartaSans` | **Sudah dipakai** (`app.css:102`). Mempertahankannya = nol regresi pada 33 komponen dan tiga zona ter-login. Dirancang Tokotype untuk Pemprov DKI Jakarta: asal Indonesia adalah argumen yang bisa dibawa ke rapat. |
| **Kicker, label, meta** | **JetBrains Mono** | SIL OFL 1.1 · `github.com/JetBrains/JetBrainsMono` | **Sudah dipakai** (`app.css:104`), tetapi baru sebagai `--font-mono` pasif. Dinaikkan pangkat menjadi keluarga kicker: mono uppercase ber-tracking langsung terbaca redaksional/teknikal, bukan SaaS. |

**Alternatif bila bundel harus lebih kecil:** ganti Fraunces dengan **Instrument Serif** (SIL OFL, satu bobot,
±28 KB woff2). Kehilangan sumbu WONK, tetapi kontras keluarganya tetap didapat. Jangan pernah jatuh ke
`Georgia` / `Times New Roman` sebagai pilihan pertama: keduanya membawa asosiasi dokumen Word.

### 3.2 Pemuatan LOKAL: wajib, bukan opsional

Tiga alasan, berurutan dari yang paling operasional:

1. **Peragaan sering terjadi tanpa internet stabil.** `app.html:14-19` memuat Google Fonts dari CDN. Satu demo
   di ruang rapat dengan Wi-Fi tamu yang memblokir `fonts.gstatic.com` = seluruh tipografi jatuh ke
   `system-ui`, dan seluruh dokumen ini batal dengan sendirinya.
2. **Dua handshake DNS + TLS tambahan** sebelum teks pertama tergambar.
3. `svelte.config.js` memakai `adapter-static` dengan `assets: 'build'` → isi `static/` disalin apa adanya ke
   `build/`. Font lokal adalah jalur dengan bagian paling sedikit yang bisa gagal.

**Berkas yang harus ada** (`static/fonts/`, total ±232 KB):

| Berkas | Isi | Perkiraan |
|---|---|---|
| `Fraunces-Variable.woff2` | roman; sumbu `opsz 9–144`, `wght 400–700`, `SOFT`, `WONK`; subset `latin` + `latin-ext` | ±118 KB |
| `PlusJakartaSans-Variable.woff2` | `wght 400–800`; subset `latin` + `latin-ext` | ±86 KB |
| `JetBrainsMono-Medium.woff2` | satu bobot 500; subset `latin` | ±28 KB |

**Cara memperoleh: dua jalur, tanpa dependensi npm baru:**

```bash
# JALUR A: google-webfonts-helper (paling cepat; sudah woff2 dan tersubset)
#   https://gwfh.mranftl.com/fonts → pilih family → charsets: latin, latin-ext
#   → pilih styles → "Download files"
#
# JALUR B: repositori resmi (variabel penuh, tanpa perantara)
#   Fraunces          : github.com/undercasetype/Fraunces   → fonts/variable/*.ttf
#   Plus Jakarta Sans : github.com/tokotype/PlusJakartaSans → fonts/variable/*.ttf
#   JetBrains Mono    : github.com/JetBrains/JetBrainsMono/releases → webfonts/*.woff2
#
# Konversi ttf → woff2 tanpa menambah dependensi npm:
brew install woff2 && woff2_compress "Fraunces[SOFT,WONK,opsz,wght].ttf"
#
# Salin lisensinya. Ini KEWAJIBAN OFL, bukan kesopanan:
#   static/fonts/OFL-Fraunces.txt · OFL-PlusJakartaSans.txt · OFL-JetBrainsMono.txt
```

**Deklarasi `@font-face`**: masuk ke `src/app.css` **di atas blok `@theme`**. Jalur ini **sah dan sudah
dibuka**: `static/fonts/*.woff2` + `static/fonts/OFL-*.txt` tercantum sebagai berkas milik **WP-03**
(`12-BUILD-CONTRACT-V2.md` §3.3(a)), dan blok `@font-face` masuk daftar putih §3.4 butir (1) di dokumen yang
sama, bersama penghapusan tiga `<link>` Google Fonts pada `app.html:14-19`. Tidak ada lagi ketegangan antara
"wajib lokal" di sini dan daftar putih di sana.

```css
/* ============================================================================
   FONT LOKAL: static/fonts/, disajikan adapter-static dari /fonts/*
   Dimuat lokal supaya peragaan tanpa internet tetap utuh; lihat 11-VISUAL §3.2.
   `font-display: swap` dipilih daripada `optional` karena teks Indonesia yang
   panjang lebih baik tampil dengan fallback lalu berganti, ketimbang tidak
   pernah memakai Fraunces sama sekali pada koneksi lambat.
   ========================================================================== */
@font-face {
	font-family: 'Fraunces';
	src: url('/fonts/Fraunces-Variable.woff2') format('woff2-variations');
	font-weight: 400 700;
	font-style: normal;
	font-display: swap;
	unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+2000-206F, U+2122, U+2212;
}
@font-face {
	font-family: 'Plus Jakarta Sans';
	src: url('/fonts/PlusJakartaSans-Variable.woff2') format('woff2-variations');
	font-weight: 400 800;
	font-style: normal;
	font-display: swap;
	unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+2000-206F, U+2122, U+2212;
}
@font-face {
	font-family: 'JetBrains Mono';
	src: url('/fonts/JetBrainsMono-Medium.woff2') format('woff2');
	font-weight: 500;
	font-style: normal;
	font-display: swap;
	unicode-range: U+0000-00FF, U+2000-206F;
}
```

**Token yang berubah di `app.css` `@theme`:**

```css
/* GANTI app.css:102-103 */
--font-display: 'Fraunces', 'Instrument Serif', Georgia, serif;
--font-sans: 'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
--font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, monospace;
```

> **Jebakan regresi: satu-satunya di seluruh dokumen ini.**
> `app.css:140-147` sudah menetapkan `h1…h4 { font-family: var(--font-display) }`. Mengganti nilai token saja
> **langsung** memindahkan seluruh judul ke Fraunces di **semua** zona, termasuk `/awardee` dan `/admin` yang
> justru harus tetap sans. Mitigasi wajib dalam paket kerja yang sama: `PageHeader.svelte` dan `KpiCard.svelte`
> memasang `font-sans` secara eksplisit. Lihat §3.4.

### 3.3 Skala: zona publik

Lompatan 68 → 44 → 30 → 24 → 18 → 16 → 13 → 11 adalah hierarki sungguhan. Skala lama
(28/24/20/16/14/13/12/10) berdempet, dan itulah D-04 dan D-09.

| Peran | Keluarga | Ukuran | LH | Bobot | Tracking | Dipakai di |
|---|---|---|---|---|---|---|
| Hero display | Fraunces | `clamp(38px, 5.4vw, 68px)` | 0.98 | 700 | −0.025em | E1; hero `/tentang`, `/komunitas` |
| H1 halaman | Fraunces | `clamp(30px, 3.2vw, 44px)` | 1.06 | 700 | −0.02em | judul artikel `/cerita/[slug]`, kepala `/cerita` |
| H2 seksi | Fraunces | 30px | 1.12 | 600 | −0.015em | kepala E3–E7 |
| H3 lead | Fraunces | 24px | 1.20 | 600 | −0.01em | cerita unggulan, gerakan unggulan, PullQuote |
| H4 item daftar | Plus Jakarta | 18px | 1.35 | 700 | −0.01em | judul baris event, cerita sekunder |
| Standfirst / dek | Plus Jakarta | 18px | 1.55 | 400 | 0 | dek hero, dek seksi |
| **Body** | Plus Jakarta | **16px** | **1.68** | 400 | 0 | seluruh teks berjalan publik |
| Body kecil / meta | Plus Jakarta | 14px | 1.50 | 400–500 | 0 | baris meta, byline |
| Kapsi foto | Plus Jakarta | 13px | 1.45 | 400 | 0 | `<figcaption>` baris 1 |
| Kredit foto | Plus Jakarta | 11px | 1.40 | 400 | 0 | `<figcaption>` baris 2 |
| Kicker / label | JetBrains Mono | 11px | 1.0 | 500 | +0.08em | `kicker` (pengganti `label-micro` di publik) |
| Angka data besar | Fraunces `tnum` | 56px | 1.0 | 700 | −0.02em | ImpactFigure `primary` |
| Angka data kecil | Fraunces `tnum` | 40px | 1.0 | 700 | −0.02em | ImpactFigure `secondary` |
| Angka inline dalam prosa | Fraunces `tnum` | 28px | 1.0 | 700 | −0.02em | "**34** anggota aktif tercatat" |

### 3.4 Batas zona: aturan yang mencegah regresi

| Aturan | Konsekuensi bila dilanggar |
|---|---|
| Fraunces **tidak pernah** di bawah 24 px | Terbaca sebagai teks badan yang salah pilih font; seluruh kontras keluarganya hilang |
| Plus Jakarta **tidak pernah** di atas 24 px **pada zona publik** | Kembali ke D-09 |
| Zona `/awardee`, `/verifikator`, `/admin`: body **tetap 14 px**, judul **tetap Plus Jakarta** | Panel kerja ber-serif display terbaca lambat dan boros ruang. `PageHeader.svelte` + `KpiCard.svelte` wajib `font-sans` eksplisit setelah token berubah |
| `label-micro` (`app.css:227-234`) **tetap ada dan tidak diubah** untuk zona ter-login (41 berkas); publik memakai `kicker` ber-mono | Kicker uppercase-sans-tracked adalah pola SaaS; mono adalah pola redaksional |
| **`numeric` (`app.css:219-224`) WAJIB diubah menjadi `font-family: var(--font-sans)`** dalam paket kerja yang sama; publik memakai `figure-number` | Lihat koreksi di bawah: tanpa perubahan ini, mengganti `--font-display` memindahkan **seluruh angka dasbor** ke serif |

> **KOREKSI atas dokumen ini sendiri.** Baris `numeric` di atas sebelumnya berbunyi *"tetap dipakai
> `KpiCard`/`StatTile`; dua utility, dua zona, **nol tabrakan**"*. **Klaim itu salah dan dicabut.**
> `app.css:219-224` berbunyi `@utility numeric { font-family: var(--font-display); … }`: ia **membaca
> token yang sedang diganti**. `numeric` dipakai **167 kali di 47 berkas**: `PointsChip`, `TierBadge`,
> `TierProgress`, `LeaderboardRow`, `StatTile`, `KpiCard`, `ProgressBar`, `DataTable`, `Tabs`, `BottomNav`,
> `Header`, `ToastHost`, seluruh `routes/admin/**` dan `routes/awardee/**`. Menambahkan `font-sans` di
> sebelah `numeric` **tidak** menolong: `numeric` menetapkan `font-family` sendiri, sehingga pemenangnya
> bergantung urutan utility Tailwind 4: itu taruhan, bukan mitigasi. Satu-satunya perbaikan yang benar
> adalah mengubah `numeric` di `app.css`; ini sudah masuk daftar putih `12-BUILD-CONTRACT-V2.md` §3.4
> butir (7). Setelah itu, satu-satunya sisa rambatan adalah `app.css:139-147` (`h1…h4`), yang ditangani
> butir (8) daftar putih yang sama: mempersempit selektornya: **ditambah** mitigasi `PageHeader.svelte`
> dan `KpiCard.svelte` yang keduanya sudah dimasukkan ke daftar berkas WP-03 (§3.3(a) doc 12) supaya tidak
> lagi yatim.

### 3.5 Utility & token baru di `app.css`

```css
/* Display editorial: Fraunces dengan sumbu WONK aktif.
   WONK sengaja dinyalakan: sedikit "kesalahan" pada terminal huruf adalah yang
   membedakan halaman yang dipilihkan fontnya dari halaman yang di-generate. */
@utility display-editorial {
	font-family: var(--font-display);
	font-variation-settings: 'SOFT' 0, 'WONK' 1, 'opsz' 72;
	font-weight: 700;
	letter-spacing: -0.025em;
	line-height: 0.98;
}

/* Kicker publik: menggantikan label-micro di zona publik.
   ink-600 (6.90 di kanvas hangat ✓), BUKAN ink-500 (4.33 ✗). Lihat §10.1. */
@utility kicker {
	font-family: var(--font-mono);
	font-size: 0.6875rem; /* 11px */
	line-height: 1;
	font-weight: 500;
	letter-spacing: 0.08em;
	text-transform: uppercase;
	color: var(--color-ink-600);
}

/* Angka data: tabular, serif, rapat. WONK MATI: angka harus stabil. */
@utility figure-number {
	font-family: var(--font-display);
	font-variation-settings: 'SOFT' 0, 'WONK' 0, 'opsz' 72;
	font-variant-numeric: tabular-nums;
	font-weight: 700;
	letter-spacing: -0.02em;
	line-height: 1;
}

/* Keying rule: bar solid 4px. Mengambil alih pekerjaan yang sekarang
   dikerjakan border kartu, tetapi MENGHUBUNGKAN alih-alih MENGOTAKKAN. */
@utility keyline {
	display: block;
	block-size: 4px;
	inline-size: 100%;
	border-radius: 0;
}

@theme {
	/* Ritme vertikal yang sengaja tidak rata: dipakai sebagai padding-block seksi. */
	--rhythm-flush: 0;
	--rhythm-tight: 4.5rem; /* 72px : penutup */
	--rhythm-snug: 5.5rem; /* 88px : kalender */
	--rhythm-base: 7rem; /* 112px: gerakan */
	--rhythm-loose: 8rem; /* 128px: komunitas, cerita */

	--radius-photo: 2px; /* foto nyaris persegi; lihat §4.3 */
	--color-canvas: #f6f4f1; /* kertas hangat, menggantikan #F5F6F7 */
}
```

---

## 4. Perlakuan foto

### 4.1 Rasio & crop

| Konteks | Rasio | Crop | Alasan |
|---|---|---|---|
| Hero full-bleed (E1; hero `/tentang`, `/komunitas`) | **21:9** | `faces,entropy` | Subjek harus jatuh di **paruh kanan** bingkai; paruh kiri adalah ruang teks. Verifikasi manual setelah unduh. |
| Hero mobile (<640 px) | **4:5** | `faces`: **berkas terpisah** | Memotong 21:9 menjadi potret lewat `object-position` akan memenggal kepala. Sediakan berkas kedua. |
| Potret komunitas (E3) | **4:5** | `faces` | Format potret memberi berat visual pada orang, bukan pada ruangan. |
| Sampul cerita (`StoryCard`, `/cerita/[slug]`) | **16:9** | `entropy` | Satu rasio untuk seluruh 11 cerita → grid tetap rapi meski fotonya beragam. |
| Cerita unggulan (E5 lead) | **3:2** | `entropy` | Sedikit lebih tinggi supaya lead terbaca lebih berat daripada sekunder. |
| Thumbnail baris event | **1:1** | `entropy` | Kotak 72 px; rasio lain menyisakan celah. |
| Latar CTA / penutup | **21:9** | `entropy`, **hindari wajah** | Overlay pekat akan menutupi wajah: memotret orang lalu menutupinya adalah pemborosan. |
| Avatar orang bernama |: | **tidak dipakai** | Lihat §4.6. |

### 4.2 Overlay: nilai persis, diambil dari token `app.css`

**Tidak ada duotone.** Warna asli dipertahankan. Yang dipakai hanya satu teknik:

```css
/* Overlay hero: HANYA di E1 dan E7. Tidak di tempat lain. */
.photo-overlay {
	background-color: #003e7e; /* = var(--color-pertamina-navy), app.css:22 */
	background-blend-mode: multiply;
}
```

Gradasi opasitas hero E1, dari kiri ke kanan:

| Posisi | Opasitas navy | Fungsi |
|---|---|---|
| 0 % | 0.88 | tepi kiri, di belakang kicker |
| 34 % | 0.86 | zona teks judul + standfirst |
| 58 % | 0.55 | transisi |
| 100 % | 0.15 | foto nyaris murni: di sinilah subjek harus berada |

**Ambang mengikat: opasitas tidak pernah turun di bawah `0.82` di mana pun teks putih berdiri.**
Verifikasi kasus terburuk (foto putih polos di bawah teks) ada di §10.3.

Untuk penutup E7 dan latar CTA, overlay **rata `0.88`**: tidak bergradasi, karena teksnya di tengah.

### 4.3 Radius, keying rule, dan larangan

1. **`border-radius: 2px`** (`--radius-photo`), bukan 16 px. Foto membulat 16 px adalah sinyal "kartu template"
   terkuat. Foto zona publik nyaris persegi.
2. **Keying rule 4 px** flush di satu tepi foto yang **membawa makna pilar atau seksi**: **kiri** untuk
   potret, **atas** untuk lanskap. **Kuota maksimum 3 keying rule per halaman**, dan `keyline='none'`
   adalah nilai yang sah: dipasang pada **setiap** foto, ia berubah menjadi ornamen seragam yang sama
   seringnya dengan "ikon dalam kotak tint" yang dibuang di D-06, dan resep anti-template menyalakan
   keseragaman baru. Warna membawa makna seksi:

   | Warna | Token `app.css` | Makna |
   |---|---|---|
   | `#ED1C24` | `--color-pertamina-red` (`:16`) | program & institusi |
   | `#003E7E` | `--color-pertamina-navy` (`:22`) | orang & komunitas |
   | `#009B4C` | `--color-pertamina-green` (`:26`) | lingkungan & aksi lapangan |

   Warna polos hanya menyentuh bar, tidak pernah glyph → aturan emas `08-DESIGN-SYSTEM §0.1` tetap utuh.
   Ini juga memberi tempat yang sah bagi `pertamina-red` dan `pertamina-green` yang **dilarang** sebagai warna
   teks (4.38 dan 3.63 di atas putih).
3. **Larangan keras:** duotone · `filter: grayscale/sepia` · `blur` di atas foto · `backdrop-blur` di atas foto ·
   foto dekoratif tanpa kapsi · gradien sebagai pengganti foto.
4. **Bila slot foto tidak terisi**, isi dengan **tipografi**, bukan gradien. Fallback `StoryCard` diganti:
   kicker pilar di-set besar dengan Fraunces di atas `ink-50`, ditambah keying rule pilar 4 px.

### 4.4 Kapsi & kredit: wajib pada setiap foto

Kapsi adalah senjata anti-AI termurah di seluruh dokumen ini. Halaman hasil generate tidak pernah punya kapsi,
karena generator tidak tahu di mana dan kapan foto itu diambil.

```html
<figure>
	<img … />
	<figcaption>
		<span class="caption">Kelas literasi iklim untuk guru SD: Cangkringan, Sleman, Juni 2026</span>
		<span class="credit">Foto: Unsplash / Nama Fotografer</span>
	</figcaption>
</figure>
```

- **Format kapsi (mengikat):** `Subjek: Tempat, Bulan Tahun`
- **Format kredit (mengikat):** `Foto: Unsplash / <nama>` atau `Foto: Pexels / <nama>`
- Kapsi 13 px `ink-600`, dengan hairline 1 px `ink-200` di atasnya. Kredit 11 px `ink-600`, baris terpisah.
- Lisensi Unsplash & Pexels **tidak mewajibkan** atribusi. Kita tetap mencetaknya, karena kredit adalah bagian
  dari strategi visual: bukan kepatuhan hukum.

> **Kejujuran wajib: jangan dilewati.**
> Selama foto masih stok, kapsi **tidak boleh** mengklaim tempat & bulan kegiatan Pfriends yang sesungguhnya.
> Pada tahap mockup, kapsi memakai bentuk generik + penanda: `Ilustrasi kegiatan komunitas: foto stok`,
> dan `photo-credits.json` menyimpan `isStock: true`. Kapsi bertempat-berbulan baru dipasang **setelah** foto
> diganti dokumentasi asli. Menempelkan "Cangkringan, Sleman, Juni 2026" pada foto stok adalah keterangan
> palsu: masalah yang lebih besar daripada terlihat seperti AI.

### 4.5 Aksesibilitas: aturan alt text

| Aturan | Contoh |
|---|---|
| **Jangan** mulai dengan "Gambar", "Foto", "Ilustrasi": pembaca layar sudah mengumumkannya | ✗ `alt="Foto kegiatan komunitas"` |
| Deskripsikan **apa yang penting di konteks itu**, bukan seluruh isi bingkai | ✓ `alt="Sekelompok peserta muda duduk melingkar saat pertemuan komunitas berlangsung"` |
| Maksimal ±125 karakter; bila butuh lebih, informasinya milik kapsi | |
| Bila `<figcaption>` sudah menjelaskan penuh, `alt` **melengkapi**, tidak mengulang | Kapsi: "Kelas literasi iklim: Sleman, Juni 2026" · Alt: "Peserta menulis di buku catatan sambil menyimak papan tulis" |
| Foto murni dekoratif → `alt=""` + `role="presentation"`. P-1 melarang foto dekoratif, jadi kasus ini seharusnya **nol** di zona publik | |
| Alt berbahasa **Indonesia** (K-5: identifier Inggris, teks UI Indonesia) | |
| **Jangan** menyebut nama orang pada foto stok | ✗ `alt="Wulan Panjaitan sedang mengajar"` |
| `<img>` wajib `width` + `height` eksplisit → mencegah CLS | |
| Foto LCP (hero E1): `fetchpriority="high"`, **tanpa** `loading="lazy"`. Sisanya `loading="lazy" decoding="async"` | |

### 4.6 Keputusan: **tidak ada wajah stok yang ditempelkan ke nama orang**

Usulan enam `avatar-0X.jpg` sebagai placeholder byline dengan penanda `isPlaceholderPhoto: true`
**ditolak** di dokumen ini. Penggantinya lebih sederhana dan lebih aman:

- **Alasan.** Byline "Wulan Panjaitan" dengan foto orang asing menciptakan pernyataan palsu tentang manusia
  yang dapat diidentifikasi. Tangkapan layar mockup **selalu** bocor ke deck presentasi, dan penanda
  `isPlaceholderPhoto` tidak ikut terbawa ke dalam PNG. Risikonya tidak sebanding dengan manfaat visualnya.
- **Ganti dengan.** `Avatar.svelte` versi inisial **tetap dipakai** untuk byline: dan itu baik-baik saja:
  koran cetak juga memakai nama tanpa foto. Kemanusiaan halaman dibawa oleh **foto kegiatan** (orang banyak,
  tangan bekerja, ruang kelas) di mana tidak ada satu nama pun yang ditempelkan.
- **Konsekuensi manifest.** Tidak ada slot potret ber-nama di §5. Yang ada adalah foto aktivitas.
- **Kapan berubah.** Saat Corsec menyediakan dokumentasi anggota asli **beserta persetujuan tertulis
  publikasi nama + wajah** (`docs/04-ESG-GOVERNANCE.md §4.3`, `publikasi_nama` default OFF).

---

## 5. MANIFEST FOTO: tabel eksekusi

**Seluruh berkas diletakkan di `static/img/`** dan dirujuk sebagai `/img/<nama>.jpg`: bukan `$lib`, bukan
`import`. Direktori `static/` **belum ada** dan harus dibuat; sekaligus menutup bug 404 favicon
(`app.html:5-6`) dengan menambahkan `static/favicon.svg`.

**Sumber:** Unsplash (lisensi Unsplash, komersial, tanpa kewajiban atribusi) atau Pexels (lisensi Pexels).
**Jangan hotlink.** Semua diunduh ke repositori dan ikut di-commit.

**Anggaran ukuran (DIREVISI):** hero (21:9 & 1.91:1) ≤ **400 KB** per berkas · foto lain ≤ **250 KB** ·
total `static/img/` ≤ **5 MB**.

> **KOREKSI aritmetika.** Anggaran lama: hero ≤260 KB · lain ≤180 KB · total ≤3,5 MB: **mustahil dipenuhi
> secara aritmetika**: 5 hero × 260 KB = 1,30 MB, ditambah 12 sampul 16:9 × 180 KB = 2,16 MB, sudah 3,46 MB
> **sebelum** 10 berkas sisanya. Lebih jauh, `&w=2400&h=1030&q=78` (§5.6) ≈ 0,11 byte/piksel, sedangkan JPEG
> foto orang pada q=78 realistisnya 0,25–0,40 byte/piksel: hero akan mendarat 600 KB–1 MB, bukan 260 KB.
> Anggaran baru selaras dengan `docs/10` §9.2 P-01/P-02 (400/250 KB) dan tetap di bawah plafon 8 MB di sana.
> Bila total tetap terlampaui, **kurangi jumlah sampul cerita** (sisanya jatuh ke fallback tipografis F-2) :
> jangan menaikkan kompresi sampai wajah rusak.

---

### 5.1 Beranda: `src/routes/(public)/+page.svelte`

| # | Berkas | Subjek yang dicari | Kata kunci pencarian | Rasio · px | Dipakai di | Alt text (Bahasa Indonesia) |
|--:|---|---|---|---|---|---|
| 1 | `hero-komunitas.jpg` | Kumpulan orang muda Indonesia dalam pertemuan komunitas luring; subjek di paruh kanan bingkai | `indonesian community gathering young people` | 21:9 · **1800×772** | E1 hero, ≥640 px | Sekelompok peserta muda duduk melingkar saat pertemuan komunitas berlangsung |
| 2 | `hero-komunitas-mobile.jpg` | Crop potret dari suasana yang sama | `indonesian youth community meeting` | 4:5 · 1200×1500 | E1 hero, <640 px (`<picture>`) | Peserta muda berbincang dalam lingkaran kecil pertemuan komunitas |
| 3 | `sobi-alumni-kampus.jpg` | Mahasiswa/alumni Indonesia, suasana kampus, membawa buku atau tas | `indonesian university students campus` | 4:5 · 1200×1500 | E3 Baris A: Sobat Bumi Indonesia | Dua mahasiswa berjalan sambil berbincang di koridor kampus |
| 4 | `womenpreneur-umkm.jpg` | Perempuan pengusaha kecil Indonesia bersama produk dagangannya | `indonesian woman small business owner` | 4:5 · 1200×1500 | E3 Baris B: Womenpreneur | Seorang perempuan menata produk usahanya di meja kerja |
| 5 | `event-workshop.jpg` | Kelas atau workshop; orang menulis di meja panjang | `workshop training class indonesia` | 1:1 · 600×600 | E4, thumbnail baris event ke-3 | Peserta menulis catatan di meja panjang selama sesi kelas |
| 6 | `gerakan-mangrove.jpg` | Penanaman mangrove / kerja bakti pesisir, beberapa orang, lumpur | `mangrove planting volunteers coastal` | 21:9 · 2400×1030 | E6 gerakan unggulan | Relawan menanam bibit mangrove di lahan berlumpur tepi pantai |
| 7 | `cta-penutup.jpg` | Kerumunan hangat tanpa wajah dominan, cocok ditutup overlay pekat | `crowd people back view outdoor event` | 21:9 · 2000×858 | E7 pita penutup (latar di balik overlay navy 0.88) | Sekelompok orang berdiri berdekatan di acara komunitas luar ruang |
| 8 | `og-pfriends.jpg` | Sama dengan #1, crop untuk kartu berbagi | `indonesian community gathering` | 1.91:1 · 1200×630 | `app.html` meta `og:image` (Amandemen A-02) |: (tidak dirender sebagai `<img>`) |

### 5.2 `/tentang`: `src/routes/(public)/tentang/+page.svelte`

| # | Berkas | Subjek | Kata kunci | Rasio · px | Dipakai di | Alt text |
|--:|---|---|---|---|---|---|
| 9 | `tentang-hero.jpg` | Diskusi tim kerja; papan tulis atau tembok penuh catatan tempel | `team discussion whiteboard office` | 21:9 · 2400×1030 | hero `/tentang` | Tim kerja berdiskusi di depan papan tulis berisi catatan tempel |
| 10 | `tentang-sosialisasi.jpg` | Sesi sosialisasi/presentasi kepada peserta duduk | `presentation audience seminar indonesia` | 3:2 · 1600×1067 | blok lini masa (Mei–Juni 2026) | Pembicara menjelaskan materi kepada peserta yang duduk berbaris |
| 11 | `tentang-amplifikasi.jpg` | Tangan memegang ponsel; layar menampilkan unggahan | `hands smartphone social media scrolling` | 3:2 · 1600×1067 | blok dampak & jangkauan organik | Sepasang tangan memegang ponsel yang menampilkan unggahan media sosial |

### 5.3 `/komunitas`: `src/routes/(public)/komunitas/+page.svelte`

| # | Berkas | Subjek | Kata kunci | Rasio · px | Dipakai di | Alt text |
|--:|---|---|---|---|---|---|
| 12 | `komunitas-hero.jpg` | Dua kelompok berbeda dalam satu ruang, suasana berbaur | `community meeting circle people talking` | 21:9 · 2400×1030 | hero `/komunitas` | Dua kelompok peserta berbaur dan berbincang dalam satu ruang pertemuan |
| 13 | `sobi-mentoring.jpg` | Mentoring satu-lawan-satu di depan laptop | `mentoring one on one laptop` | 3:2 · 1600×1067 | profil SOBI | Dua orang menelaah layar laptop bersama dalam sesi pendampingan |
| 14 | `womenpreneur-produk.jpg` | Produk UMKM tertata di meja atau lapak pasar | `handmade products market stall indonesia` | 3:2 · 1600×1067 | profil Womenpreneur | Aneka produk kerajinan tertata rapi di lapak pasar |
| 15 | `chapter-pertemuan.jpg` | Pertemuan kecil 8–12 orang, meja bundar | `small group meeting indonesia` | 3:2 · 1600×1067 | blok sebaran chapter | Sekitar sepuluh orang duduk mengelilingi meja dalam pertemuan chapter |

### 5.4 Sampul cerita: 12 slug terbit, dipetakan 1:1 ke seed

Sumber slug: `CERITA_TERBIT`, `src/lib/infrastructure/seed/seed-data.js`: diverifikasi ulang dengan
menjalankan seed: **12 entri** berstatus `TERPUBLIKASI` (bukan 11; klaim lama keliru dan dikoreksi).
Dipakai oleh `StoryCard.svelte` (`/cerita`, E5 beranda) dan `src/routes/(public)/cerita/[slug]/+page.svelte`.
Jalur pasang: tambahkan `foto: fotoCerita(story.slug)` pada `kartuCerita()` (`_view-model.js:32-44`) :
lihat §9.

| # | Berkas | Slug cerita | Kata kunci | Rasio · px | Alt text |
|--:|---|---|---|---|---|
| 16 | `cerita-lampu-surya-enggros.jpg` | `lampu-surya-kampung-enggros` | `solar panel village installation roof` | 16:9 · 1600×900 | Panel surya terpasang di atap rumah kampung pesisir |
| 17 | `cerita-paving-plastik.jpg` | `sampah-plastik-menjadi-paving-blok` | `recycled plastic bricks paving blocks` | 16:9 · 1600×900 | Paving blok hasil olahan sampah plastik tersusun di halaman |
| 18 | `cerita-literasi-iklim-merapi.jpg` | `literasi-iklim-guru-lereng-merapi` | `teacher training rural school classroom` | 16:9 · 1600×900 | Guru-guru mengikuti pelatihan di ruang kelas sekolah desa |
| 19 | `cerita-mangrove-belawan.jpg` | `mangrove-kembali-di-belawan` | `mangrove seedlings mud coastal planting` | 16:9 · 1600×900 | Bibit mangrove muda tertanam di lahan lumpur pesisir |
| 20 | `cerita-tenun-sumba.jpg` | `tenun-ikat-sumba-naik-kelas` | `indonesian woven textile weaving loom` | 16:9 · 1600×900 | Kain tenun ikat sedang dikerjakan di atas alat tenun kayu |
| 21 | `cerita-pendampingan-harga.jpg` | `sepuluh-jam-pendampingan-harga-pokok` | `mentor coaching small business owner notebook` | 16:9 · 1600×900 | Pendamping dan pelaku usaha menghitung biaya di atas buku catatan |
| 22 | `cerita-kopi-gayo.jpg` | `kopi-gayo-perempuan-ekspor-pertama` | `coffee farmers women sorting beans` | 16:9 · 1600×900 | Perempuan petani kopi memilah biji kopi hasil panen |
| 23 | `cerita-pencatatan-balikpapan.jpg` | `kelas-malam-excel-balikpapan` | `bookkeeping laptop small shop owner evening` | 16:9 · 1600×900 | Pelaku usaha mencatat penjualan di laptop pada kelas malam |
| 24 | `cerita-sabun-jelantah.jpg` | `sabun-minyak-jelantah-cilincing` | `handmade soap making process` | 16:9 · 1600×900 | Adonan sabun dicetak dalam wadah persegi di meja kerja |
| 25 | `cerita-bank-sampah-kenjeran.jpg` | `bank-sampah-sekolah-kenjeran` | `waste sorting recycling students school` | 16:9 · 1600×900 | Siswa memilah sampah ke dalam wadah terpisah di halaman sekolah |
| 26 | `cerita-kelas-energi-palu.jpg` | `kelas-energi-sma-palu` | `high school classroom science lesson` | 16:9 · 1600×900 | Siswa SMA menyimak penjelasan di depan kelas |
| 26b | `cerita-bibit-trembesi-cikadu.jpg` | `bibit-trembesi-desa-cikadu` | `tree seedlings nursery volunteers planting` | 16:9 · 1600×900 | Relawan menyiapkan bibit pohon di persemaian desa |

### 5.5 Cadangan & sistem

| # | Berkas | Subjek | Kata kunci | Rasio · px | Dipakai di | Alt text |
|--:|---|---|---|---|---|---|
| 27 | `cerita-default.jpg` | Netral: tangan, buku catatan, meja kerja: tanpa wajah | `hands notebook pen desk workspace` | 16:9 · 1600×900 | Fallback `StoryCard` untuk cerita yang belum bersampul | Tangan menulis di buku catatan di atas meja kerja |
| 28 | `favicon.svg` | Wordmark "P" Pfriends, satu warna `#ED1C24` |: (dibuat sendiri, bukan diunduh) | 32×32 SVG | `static/favicon.svg`: menutup 404 dari `app.html:5-6` |: |

**Total: 27 foto + 1 favicon = 28 berkas** (`static/img/*.jpg` = 27; `static/favicon.svg` = 1).
Sampul cerita = **12** (#16–#26 + #26b), satu per cerita `TERPUBLIKASI`.

Cakupan yang diminta terpenuhi: hero beranda (#1, #2) · dua komunitas (#3, #4, #13, #14) · cerita/blog
(#16–#26b, #27) · event & kalender (#5) · gerakan (#6) · tentang (#9, #10, #11) · latar CTA (#7).

**Manifes ini adalah satu-satunya manifes foto yang berlaku.** `docs/10` §9.3 ("27 entri / 32 berkas",
termasuk baris **Avatar** 6 berkas) **DICABUT**: §4.6 dokumen ini sudah memutuskan tidak ada wajah stok
yang ditempelkan ke nama orang, sehingga `avatar-*.jpg` sengaja tidak dibuat dan gerbang
`isPlaceholderPhoto: true` ikut dicabut (`12-BUILD-CONTRACT-V2.md` §3.3 & §8.1).

---

### 5.6 Skrip unduh: `scripts/assets/fetch-photos.mjs`

Berkas **baru**, milik **WP-03**. Menulis ke `static/img/` dan menghasilkan
`src/lib/data/photo-credits.json`, yang menjadi **masukan bagi `src/lib/data/photos.js`**. Komponen
**tidak pernah** membaca `photo-credits.json` sendiri: kredit hanya keluar lewat `foto(key).credit`
(`12-BUILD-CONTRACT-V2.md` §2.13). Tiga jalur kredit yang saling menduplikasi adalah pelanggaran KP-3.

```js
/**
 * PENGUNDUH ASET FOTO: mengubah manifest §5 docs/11-VISUAL-DIRECTION.md menjadi berkas nyata.
 *
 * Dijalankan MANUAL, bukan bagian dari `npm run build`: build harus tetap jalan di
 * mesin tanpa kunci API dan tanpa jaringan. Hasil unduhan ikut di-commit: itulah
 * yang membuat peragaan luring tetap utuh (§3.2 alasan 1).
 *
 *   UNSPLASH_ACCESS_KEY=xxx node scripts/assets/fetch-photos.mjs
 *   UNSPLASH_ACCESS_KEY=xxx node scripts/assets/fetch-photos.mjs hero-komunitas.jpg
 *
 * Tanpa kunci API: lihat §5.7 (jalur manual). Skrip berhenti dengan satu pesan,
 * bukan dengan tumpukan galat.
 */
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

/**
 * @typedef {object} PhotoSlot
 * @property {string} berkas   Nama berkas keluaran di static/img/.
 * @property {string} query    Kata kunci pencarian (kolom "kata kunci" pada manifest).
 * @property {'landscape'|'portrait'|'squarish'} orientation
 * @property {number} w
 * @property {number} h
 * @property {'faces'|'entropy'|'faces,entropy'} [crop='entropy']
 * @property {boolean} [hero=false]  true -> anggaran 400 KB; false -> 250 KB.
 * @property {string}  [sameAs]      Nama berkas slot rujukan. Bila diisi, JANGAN mencari ulang:
 *                                   unduh ulang `urls.raw` MILIK FOTO SLOT ITU dengan w/h/crop slot ini.
 *                                   Tanpa ini, `hero-komunitas-mobile.jpg` dan `og-pfriends.jpg`
 *                                   menjadi ADEGAN YANG BERBEDA dari hero desktop: halaman berganti
 *                                   foto saat perangkat diputar, dan kartu berbagi WhatsApp menampilkan
 *                                   foto yang tidak pernah ada di situs.
 */

/** Salinan langsung tabel §5. Menambah foto = menambah satu baris di sini. @type {PhotoSlot[]} */
const MANIFEST = [
	{ berkas: 'hero-komunitas.jpg', query: 'indonesian community gathering young people', orientation: 'landscape', w: 1800, h: 772, crop: 'faces,entropy', hero: true },
	{ berkas: 'hero-komunitas-mobile.jpg', sameAs: 'hero-komunitas.jpg', orientation: 'portrait', w: 1200, h: 1500, crop: 'faces' },
	{ berkas: 'og-pfriends.jpg', sameAs: 'hero-komunitas.jpg', orientation: 'landscape', w: 1200, h: 630, crop: 'faces,entropy' },
	{ berkas: 'sobi-alumni-kampus.jpg', query: 'indonesian university students campus', orientation: 'portrait', w: 1200, h: 1500, crop: 'faces' },
	{ berkas: 'womenpreneur-umkm.jpg', query: 'indonesian woman small business owner', orientation: 'portrait', w: 1200, h: 1500, crop: 'faces' }
	// … 22 baris sisanya, salin apa adanya dari tabel §5.1–§5.5.
	// Sampul cerita 16:9 memakai w:1200 h:675 (bukan 1600×900) agar muat anggaran 250 KB.
];

const KEY = process.env.UNSPLASH_ACCESS_KEY;
const OUT = 'static/img';
const KREDIT = 'src/lib/data/photo-credits.json';
/** Dua ambang, bukan satu: anggaran §5 membedakan hero dari foto konten. */
const BATAS_HERO = 400 * 1024;
const BATAS_KONTEN = 250 * 1024;
/** Kualitas awal; skrip MENURUNKANNYA dan mengunduh ulang sampai lolos, bukan sekadar memperingatkan. */
const Q_AWAL = 76;
const Q_MINIMAL = 62;

if (!KEY) {
	console.error('UNSPLASH_ACCESS_KEY belum diisi. Lihat docs/11-VISUAL-DIRECTION.md §5.7 untuk jalur manual.');
	process.exit(1);
}

const hanya = process.argv.slice(2);
const antrean = hanya.length ? MANIFEST.filter((slot) => hanya.includes(slot.berkas)) : MANIFEST;

await mkdir(OUT, { recursive: true });
/** Kredit lama dipertahankan supaya menjalankan ulang satu slot tidak menghapus sisanya. */
const kredit = existsSync(KREDIT) ? JSON.parse(await readFile(KREDIT, 'utf8')) : {};

/** Foto yang sudah dipilih per berkas: dipakai `sameAs` agar tidak mencari ulang. @type {Map<string, object>} */
const terpilih = new Map();

for (const slot of antrean) {
	let foto;

	if (slot.sameAs) {
		// Satu adegan, beberapa crop. Slot rujukan WAJIB sudah diproses lebih dulu di MANIFEST.
		foto = terpilih.get(slot.sameAs);
		if (!foto) {
			console.warn(`LEWAT ${slot.berkas}: slot rujukan "${slot.sameAs}" belum diunduh pada proses ini`);
			continue;
		}
	} else {
		const cari = new URL('https://api.unsplash.com/search/photos');
		cari.searchParams.set('query', slot.query);
		cari.searchParams.set('orientation', slot.orientation);
		cari.searchParams.set('per_page', '1');
		cari.searchParams.set('content_filter', 'high');

		const res = await fetch(cari, { headers: { Authorization: `Client-ID ${KEY}` } });
		if (!res.ok) {
			console.warn(`LEWAT ${slot.berkas}: API menjawab ${res.status}`);
			continue;
		}
		const { results } = await res.json();
		foto = results?.[0];
		if (!foto) {
			console.warn(`LEWAT ${slot.berkas}: kueri "${slot.query}" tidak menghasilkan foto`);
			continue;
		}
		terpilih.set(slot.berkas, foto);
	}

	// Turunkan kualitas dan unduh ulang sampai lolos anggaran. Memperingatkan lalu tetap menulis
	// berkas kegemukan membuat gerbang `du -sh static/img` mustahil hijau: dan gerbang yang
	// mustahil hijau akan dilewati diam-diam.
	const batas = slot.hero ? BATAS_HERO : BATAS_KONTEN;
	let q = Q_AWAL;
	let biner;
	for (;;) {
		const unduh = `${foto.urls.raw}&w=${slot.w}&h=${slot.h}&fit=crop&crop=${slot.crop ?? 'entropy'}&q=${q}&fm=jpg`;
		biner = Buffer.from(await (await fetch(unduh)).arrayBuffer());
		if (biner.byteLength <= batas || q <= Q_MINIMAL) break;
		q -= 6;
	}
	if (biner.byteLength > batas) {
		console.warn(`  ⚠ ${slot.berkas} = ${(biner.byteLength / 1024).toFixed(0)} KB pada q=${q}: masih melewati ${(batas / 1024).toFixed(0)} KB; kecilkan w/h di MANIFEST`);
	}
	await writeFile(`${OUT}/${slot.berkas}`, biner);

	kredit[slot.berkas] = {
		fotografer: foto.user.name,
		profil: foto.user.links.html,
		sumber: 'Unsplash',
		unsplashId: foto.id,
		isStock: true // kapsi WAJIB generik selama nilai ini true: lihat §4.4
	};
	console.log(`OK  ${slot.berkas}  ${slot.w}×${slot.h}  q=${q}  ${(biner.byteLength / 1024).toFixed(0)} KB  © ${foto.user.name}`);
}

await writeFile(KREDIT, `${JSON.stringify(kredit, null, '\t')}\n`);
console.log(`\nKredit ditulis ke ${KREDIT}. Periksa hasil crop secara manual sebelum commit.`);
```

### 5.7 Jalur manual: tanpa kunci API

Kunci Unsplash gratis tetapi butuh pendaftaran aplikasi. Bila tidak tersedia:

1. Buka `https://unsplash.com/s/photos/<kata-kunci>` atau `https://www.pexels.com/search/<kata-kunci>/`.
2. Unduh ukuran **Large** / **Original**.
3. Potong ke rasio pada kolom `Rasio · px`: Preview (macOS) → *Tools → Adjust Size / Crop*, atau
   `sips -Z 2400 nama.jpg` lalu crop.
4. Simpan sebagai `static/img/<nama sesuai manifest>.jpg`, kualitas 78–82.
5. Isi `src/lib/data/photo-credits.json` manual dengan bentuk yang sama seperti keluaran skrip.
6. Tulis `static/img/CREDITS.md`: tabel berkas · fotografer · tautan profil · sumber · lisensi.

**Verifikasi anggaran sebelum commit:**

```bash
du -sh static/img && find static/img -size +260k -exec ls -lh {} \;
```

---

## 6. Rancangan ulang beranda, seksi demi seksi

### 6.0 Kerangka grid

```
--page-max  : 1240px
kolom       : 12
gutter      : 24px
padding tepi: 24px (<640) · 40px (≥768) · 64px (≥1024)
```

**Aturan mengikat:** tidak ada seksi yang memakai jumlah kolom yang sama dengan seksi tetangganya.

**Ritme vertikal (`padding-block`, ≥1024 px):**

| Seksi | Token | px |
|---|---|--:|
| E1 Hero | `--rhythm-flush` | 0 (foto full-bleed) |
| E2 Pita data | `--rhythm-flush` | 0 (menempel ke dasar hero) |
| E3 Dua komunitas | `--rhythm-loose` | 128 |
| E4 Kalender + event | `--rhythm-snug` | 88 |
| E5 Cerita | `--rhythm-loose` | 128 |
| E6 Gerakan | `--rhythm-base` | 112 |
| E7 Penutup | `--rhythm-tight` | 72 |

Di bawah 768 px, ritme dikompres ke `56 / 64 / 56 / 64 / 48`: tetap tidak rata.

---

### E0 · Masthead (menggantikan `Header.svelte` untuk zona publik)

Dua baris, bukan satu bar pil.

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ▓ NAVY · 28px                                                             │
│ DIVISI CORPORATE SECRETARY · PERTAMINA FOUNDATION            Masuk        │  mono 11px, putih/75
├──────────────────────────────────────────────────────────────────────────┤
│ ░ KANVAS · 68px                                                           │
│ Pfriends        Beranda  Tentang  Komunitas  Cerita  Kalender  Gerakan    │
│ ▬▬▬▭▭▬▬                 ‾‾‾‾‾‾‾ aktif = garis bawah 2px merah  [ Gabung ] │
│ ↑ three-band tick 72×4px                                                  │
└──────────────────────────────────────────────────────────────────────────┘
   hairline 1px ink-200
```

- Nav sebagai **teks polos** `ink-700` 15 px; aktif = `border-bottom: 2px solid var(--color-pertamina-red)`.
  **Bukan** pil `bg-pertamina-red-tint` seperti sekarang (`(public)/+layout.svelte:60-63`).
- **Tanpa `backdrop-blur`.** `Header.svelte:42` memakai `bg-white/85 backdrop-blur-md`; masthead publik
  memakai `bg-canvas` solid.
- Satu tombol merah `Gabung`; `Masuk` naik ke baris navy sebagai tautan teks
  → memenuhi P-5 "maksimum satu objek merah per viewport".
- `/kalender` masuk sebagai destinasi keenam (Keputusan #1c).
- **Three-band tick**: satu bar 72×4 px terbagi merah 40 % / hijau 30 % / navy 30 %, turunan tiga pita panah
  logo Pertamina. Dipakai **tepat dua kali per halaman**: di bawah wordmark dan di atas footer. Tanda tangan
  harus langka agar tetap tanda tangan.

---

### E1 · Hero editorial: foto full-bleed, teks 6/12, rata bawah

```
┌══════════════════════════════════════════════════════════════════════════════┐
│ FOTO hero-komunitas.jpg · full-bleed · tinggi clamp(440px, 58vw, 640px)       │
│ overlay navy multiply: 0.88 → 0.86 (34%) → 0.55 (58%) → 0.15 (100%)           │
│                                                                               │
│ ┌── kol 1–6 ─────────────────────────┐        ┌── kol 7–12 ────────────────┐ │
│ │ ▬ COMMUNITY CONNECT INITIATIVE     │        │                            │ │
│ │   (rule merah 24×4px + mono 11px)  │        │   F O T O   M U R N I      │ │
│ │                                     │        │   subjek ADA DI SINI       │ │
│ │  Setelah programnya                 │        │   (zona terang 0.15)       │ │
│ │  selesai, ke mana                   │        │                            │ │
│ │  perginya orang-orang ini?          │        │                            │ │
│ │  (Fraunces clamp 38–68px / 0.98,    │        │                            │ │
│ │   penggalan baris MANUAL)           │        │                            │ │
│ │                                     │        │                            │ │
│ │  Pfriends menghubungkan alumni      │        │                            │ │
│ │  Beasiswa Sobat Bumi dengan pelaku  │        │                            │ │
│ │  UMKM binaan PFpreneur.             │        │                            │ │
│ │  (18px/1.55 · max-width 46ch ·      │        │                            │ │
│ │   hanya kol 1–5)                    │        │                            │ │
│ │                                     │        │                            │ │
│ │  [ Gabung Sekarang ]  Lihat cerita →│        │                            │ │
│ │                                     │        │                            │ │
│ │  Diselenggarakan Divisi Corporate   │        │    Ilustrasi kegiatan      │ │
│ │  Secretary: Pertamina Foundation   │        │    komunitas: foto stok   │ │
│ │  (12px putih/70)                    │        │    Foto: Unsplash / Nama   │ │
│ └─────────────────────────────────────┘        └────────────────────────────┘ │
│              align-self: end · padding-bottom 72px       kapsi rata kanan     │
└══════════════════════════════════════════════════════════════════════════════┘
```

**Peran foto.** Subjek, bukan latar. Sisi kanan sengaja dibiarkan foto murni: **itulah asimetrinya**. Wajah
subjek harus jatuh di zona 55–100 % (terang); verifikasi manual setelah unduh, dan bila crop meleset,
**ganti fotonya: jangan menambah overlay**.

**Mobile (<640 px).** `<picture>` beralih ke `hero-komunitas-mobile.jpg` (4:5), overlay rata `0.86`, teks
memenuhi lebar, judul turun ke `clamp(32px, 8vw, 40px)`.

**Yang dihapus:** `+page.svelte:106-113` (blob blur) dan `:154-182` (panel tangga tier).

---

### E2 · Pita data: bukan empat kartu

Menempel ke dasar hero (`gap: 0`) sehingga pita adalah **alas** hero, bukan seksi terpisah.

```
┌══════════════════════════════════════════════════════════════════════════════┐
│ ▓ NAVY #003E7E · tinggi 148px · TANPA kartu · TANPA ikon · TANPA kotak tint   │
│                                                                               │
│  kol 1–4 (metrik utama)   ┊  kol 5–7      ┊  kol 8–10     ┊  kol 11–12       │
│  ┈┈┈ sparkline 8 titik    ┊               ┊               ┊                  │
│  3.200 – 64.000           ┊  52           ┊  3            ┊  4               │
│  (Fraunces 56px tnum)     ┊  (40px)       ┊  (40px)       ┊  (40px)          │
│  ORANG TERJANGKAU         ┊  ANGGOTA      ┊  CHAPTER      ┊  GERAKAN         │
│  [Estimasi] ⓘ             ┊  TERDATA      ┊  AKTIF        ┊  BERJALAN        │
│  30 hari terakhir         ┊  {{registri}} ┊  3 dari 3     ┊  di 3 provinsi   │
│                           ┊  penerima     ┊  chapter      ┊                  │
│                           ┊  manfaat      ┊               ┊                  │
│                                                                               │
│  ┊ = garis vertikal 1px putih/20: BUKAN border kartu                        │
│                                                                               │
│  Angka dihitung dari catatan komunitas per 22 Juli 2026. Metode pengukuran →  │
└══════════════════════════════════════════════════════════════════════════════┘
```

**Aturan yang mengikat di sini:**

- **Empat angka agregat level program saja** (Keputusan #1a): jangkauan organik (estimasi), anggota terdata,
  chapter aktif, gerakan berjalan. **Nol** poin, tier, badge, peringkat.
- Angka estimasi **wajib rentang** + lencana `Estimasi` + kontrol `ⓘ` yang membuka rumus & asumsi.
- **Baris ketiga wajib berisi konteks/penyebut.** Inilah yang memperbaiki D-12.
- Sparkline SVG datar 8 titik, tinggi 40 px, `pertamina-green` 35 %: **tanpa** area fill, **tanpa** gradien.
- Warna teks konteks: **putih/70 (5.98 ✓)**. Bukan putih/55: lihat koreksi §10.2.
- Sumber data: `ProgramImpactService.publicSnapshot()`, satu-satunya sumber angka zona publik dan **tanpa satu
  pun field poin/tier**, sehingga kebocoran menjadi mustahil secara struktural.

---

### E3 · Dua komunitas: dua *spread* bertumpuk yang saling mengunci

Menggantikan `md:grid-cols-2` (`+page.svelte:237`). Dua baris penuh, bercermin, **sengaja tidak sejajar**.

```
BARIS A: Sobat Bumi Indonesia                                padding-top 128px
┌── kol 1–5 ───────────────┐   ┌── kol 7–12 ──────────────────────────────────┐
│▌ FOTO 4:5                │   │                        01                     │
│▌ sobi-alumni-kampus.jpg  │   │  ← numeral Fraunces 96px ink-100,             │
│▌ keying rule 4px MERAH   │   │    margin-top −40px, z-index −1               │
│▌ flush tepi kiri         │   │                                                │
│▌ radius 2px              │   │  Sobat Bumi Indonesia   (Fraunces 30px/1.12)  │
│                          │   │                                                │
│                          │   │  Alumni Beasiswa Sobat Bumi yang telah         │
│                          │   │  menyelesaikan studi dan kini tersebar di      │
│                          │   │  berbagai kampus, kota, dan sektor pekerjaan.  │
│                          │   │  (16px/1.68 ink-700 · measure 58ch)            │
│                          │   │                                                │
│                          │   │ : Kanal lanjut hidup setelah masa beasiswa    │
│                          │   │ : Ruang berbagi keahlian dengan UMKM binaan   │
│                          │   │ : Pengakuan atas kontribusi profesional       │
│                          │   │    ↑ em-dash, BUKAN ikon centang di kotak      │
│                          │   │                                                │
│                          │   │  34 anggota aktif tercatat      Pelajari →     │
│                          │   │  ↑ numeral Fraunces 28px INLINE dalam prosa,   │
│                          │   │    bukan kotak statistik                       │
├──────────────────────────┤   └────────────────────────────────────────────────┘
│ ┈┈ hairline 1px ink-200  │
│ Ilustrasi kegiatan       │  ← kapsi 13px ink-600
│ komunitas: foto stok    │
│ Foto: Unsplash / Nama    │  ← kredit 11px ink-600
└──────────────────────────┘

BARIS B: Womenpreneur Pertamina Foundation        margin-top: −64px  ← KUNCI
┌── kol 1–6 ────────────────────────────────┐   ┌── kol 8–12 ──────────────┐
│                     02                     │   │▌ FOTO 4:5                │
│  Womenpreneur Pertamina Foundation         │   │▌ womenpreneur-umkm.jpg   │
│  … (struktur bercermin dari Baris A)       │   │▌ keying rule 4px NAVY    │
│  18 anggota aktif tercatat    Pelajari →   │   │▌ flush tepi kiri         │
└────────────────────────────────────────────┘   └──────────────────────────┘
```

**`margin-top: -64px` pada Baris B adalah asimetri yang paling terasa dan paling murah di dokumen ini.**
Kedua baris saling mengunci alih-alih berbaris rapi. Di bawah 1024 px, `margin-top` dinolkan dan setiap baris
runtuh menjadi foto → teks, satu kolom.

**Sumber teks.** Ambil dari `COMMUNITIES` (`src/lib/domain/constants/community.js:47`): peran, tantangan,
kebutuhan. **Jangan** menulis salinan baru di komponen (US-R21 AC-3).

---

### E4 · Kalender komunitas + daftar event (Keputusan #1c)

```
                                                            padding-top 88px
┌── kol 1–5 (sticky, top: 96px) ───┐  ┌── kol 6–12 ─────────────────────────┐
│                                   │  │ AGENDA AGUSTUS            (kicker)  │
│  Agustus 2026         ‹    ›      │  │ Tiga kelas dan satu temu nasional.  │
│  (Fraunces 28px + chevron polos)  │  │ Dua di antaranya daring, bisa       │
│                                   │  │ diikuti dari mana saja.   (dek 18px)│
│  Sen Sel Rab Kam Jum Sab Min      │  │                                      │
│  ─── ─── ─── ─── ─── ─── ───      │  │ ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈ │
│              1   2   3•  4   5    │  │  03 │ Temu Nasional Pfriends 2026   │
│    6   7   8   9  10  11  12      │  │  AGU│ Luring · Jakarta · Semua ch.  │
│   13  14  15  16  17•  18  19     │  │     │                  Terjadwal    │
│   20  21  22  23  24• 25  26      │  │ ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈ │
│   27  28  29  30  31•             │  │  17 │ Sharing: Ekspor Kriya ke Asia │
│                                   │  │  AGU│ Daring · Zoom · Womenpreneur  │
│  • merah = gerakan                │  │     │                  Terjadwal    │
│  • navy  = temu chapter           │  │ ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈ │
│  • hijau = kelas                  │  │ ┌──┐ 24 │ Kelas Penulisan Cerita    │
│                                   │  │ │▣ │ AGU│ Daring · Chapter PF 12   │
│  garis grid 1px ink-200           │  │ └──┘    │              Terjadwal   │
│  tanggal ber-event: angka w700    │  │  ↑ HANYA baris ke-3 punya thumbnail │
│  + kotak isi 6px                  │  │    72×72: satu penyimpangan dalam  │
│                                   │  │    lima baris (P-3)                 │
│                                   │  │ ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈ │
│                                   │  │             Lihat kalender penuh →  │
└───────────────────────────────────┘  └─────────────────────────────────────┘
```

**Baris event adalah baris tabel, bukan kartu.** Struktur satu baris:
`blok tanggal (numeral Fraunces 32px + bulan mono 11px)` │ `hairline 1px` │
`judul 18px w700 + baris meta "mode · lokasi · chapter" 14px ink-600` │ `status di kanan`.
Pemisah antarbaris: hairline 1 px `ink-200`. Hover: `background: #EFECE6`.
**Tanpa shadow, tanpa radius, tanpa border kotak.**

**Kepatuhan Keputusan #2 & FR-KAL-03: yang TIDAK boleh tampil publik:**

| Dilarang publik | Bukti kode yang harus dihindari |
|---|---|
| Nilai poin kehadiran | `EventCard.svelte:136-137` `<PointsChip>` |
| Kuota tersisa / "sisa N kursi" | `EventCard.svelte:125-130` |
| Nama pendaftar & peserta | `registeredAwardeeIds`, `attendeeAwardeeIds` |
| Kode kehadiran / QR |: |

`EventCard` **tidak dipakai sama sekali** di zona publik; digantikan `EventListPanel`. Bila `EventCard` tetap
dipakai di tempat lain, tambahkan prop `showPoints = false` sebagai baku.
Tombol "Daftar hadir" mengarah ke `/masuk?next=/awardee/kalender/<id>`.

**Pemakaian ulang.** Komponen yang sama, `variant="rail"` (satu kolom, 4 butir, tanpa kalender), dipasang
sebagai panel samping `/cerita`: memenuhi Keputusan #4 tanpa membuat komponen tempelan.

---

### E5 · Cerita komunitas (Keputusan #1b): hierarki 1 + 2 + 4

Menggantikan `sm:grid-cols-2 lg:grid-cols-3` (`+page.svelte:450`).

```
                                                           padding-top 128px
CERITA DARI LAPANGAN  (kicker mono)
Ditulis anggota, ditinjau verifikator, lalu terbit.  (dek 18px)
                                                        Lihat semua cerita →

┌── kol 1–7 · LEAD ────────────────────────┐  ┌── kol 8–12 · SEKUNDER ───────┐
│ FOTO 3:2 cerita-mangrove-belawan.jpg     │  │ ┌───────┐ Kelas Literasi      │
│ ▔ keying rule 4px HIJAU (tepi atas)      │  │ │ 16:9  │ Iklim untuk Guru    │
│                                           │  │ │ 200px │ SD di Lereng        │
│ LINGKUNGAN                                │  │ │ float │ Merapi              │
│ ↑ kicker teks polos: BUKAN chip di pil   │  │ └───────┘ (H4 18px w700)     │
│                                           │  │ Cangkringan · 12 peserta     │
│ Mangrove Kembali di Pesisir               │  ├─ hairline 1px ink-200 ───────┤
│ Belawan, dan Kali Ini Kami                │  │ ┌───────┐ Tenun Ikat Sumba   │
│ Merawatnya          (Fraunces 24px H3)    │  │ │ 16:9  │ Naik Kelas Lewat    │
│                                           │  │ │       │ Foto Produk yang    │
│ Standfirst 17px/1.55, dua baris.          │  │ └───────┘ Benar              │
│                                           │  │ Waingapu · 9 peserta         │
│ (BL) Bayu Lubis: alumni PF 10,           │  └──────────────────────────────┘
│      fasilitator pesisir                  │
│      14 Jun 2026 · 9 menit baca           │
│  ↑ Avatar INISIAL 32px (§4.6),            │
│    TANPA cincin tier, TANPA TierBadge     │
└───────────────────────────────────────────┘

════════════ hairline 1px ink-200, lebar penuh ════════════

┌── kol 1–12 · grid-cols-4 · BRIEF · TEKS MURNI, TANPA GAMBAR ──────────────┐
│ SOSIAL           │ EKONOMI         │ LINGKUNGAN      │ SOSIAL              │
│ Sepuluh Jam      │ Kopi Gayo       │ Bank Sampah     │ Alumni Sobat Bumi   │
│ Pendampingan…    │ Perempuan dan…  │ Sekolah di…     │ Mengisi Kelas…      │
│ 18 Jun 2026      │ 28 Mei 2026     │ 16 Jun 2026     │ 12 Jul 2026         │
└───────────────────────────────────────────────────────────────────────────┘
```

**Ketiadaan gambar pada empat brief adalah kontras yang disengaja**: halaman jadi punya pasang surut, bukan
tekanan rata. Ini memperbaiki D-05 dan D-11 sekaligus.

**Kepatuhan Keputusan #2.** Byline **tidak** memuat `TierBadge` maupun cincin tier
(`cerita/[slug]/+page.svelte:151`, `:156` dicabut). Yang menggantikannya adalah keterangan orang yang
sesungguhnya: nama + angkatan + pekerjaan.

---

### E6 · Gerakan bersama (Keputusan #1d): satu unggulan + tiga baris

```
                                                           padding-top 112px
┌═══ FOTO 21:9 full-bleed · gerakan-mangrove.jpg ═══════════════════════════┐
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
┌── kol 1–6 · panel putih MENUMPUK foto · margin-top −80px · radius 2px ──┐
│ GERAKAN BERSAMA  (kicker)                                                │
│ Tanam dan Rawat Mangrove Pesisir            (Fraunces 30px)              │
│ Enam wilayah pesisir, satu kesepakatan perawatan dua tahun.              │
│                                                                          │
│ 248 orang bergerak  ·  6 wilayah   ← numeral 28px INLINE dalam prosa     │
│ ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬░░░░░░░  248 dari 300 peserta sasaran               │
│  ↑ rule progres 4px PERSEGI, bukan ProgressBar membulat                  │
└──────────────────────────────────────────────────────────────────────────┘

┌── kol 1–12 · tiga baris · TANPA MovementCard · TANPA kartu ──────────────┐
│▌ Pilah Sampah dari Rumah         Lingkungan · 5 kota · 412 peserta       │
│▌ (keying rule 4px hijau)                                     Berjalan    │
├──────────────────────────────────────────────────────────────────────────┤
│▌ Satu Alumni, Satu Usaha Binaan  Ekonomi · 3 provinsi · 96 peserta       │
│▌ (keying rule 4px navy)                                      Berjalan    │
├──────────────────────────────────────────────────────────────────────────┤
│▌ Kelas Iklim untuk Sekolah       Sosial · 8 sekolah · 187 peserta        │
│▌ (keying rule 4px navy)                                      Selesai     │
└──────────────────────────────────────────────────────────────────────────┘
```

**Yang dihapus:** `gerakan/+page.svelte:128-131`: "Memimpin aksi lapangan bernilai 50 poin: nilai tertinggi
dalam tabel kontribusi." Progres partisipasi ditampilkan sebagai **cacah peserta terhadap target**, tanpa
poin (US-R21 AC-4).

---

### E7 · Penutup: pita, bukan kartu merah muda

```
┌══════════════════════════════════════════════════════════════════════════┐
│ ▬▬▬▬▬▬▬▬▬▬▬▬ keying rule 4px MERAH · tepi atas · lebar penuh ▬▬▬▬▬▬▬▬▬▬▬ │
│ ▓ latar cta-penutup.jpg · overlay navy #003E7E multiply 0.88 RATA         │
│                                                                           │
│  kol 1–7                                     kol 8–12                     │
│  Pernah menerima Beasiswa Sobat Bumi         [ Gabung Sekarang ]          │
│  atau menjadi binaan PFpreneur?              Sudah punya akun? Masuk      │
│  (Fraunces 28px, putih)                                                   │
│  Pendaftarannya singkat dan kamu bisa                                     │
│  mulai berkontribusi hari itu juga.                                       │
│  (16px putih/88)                                                          │
└══════════════════════════════════════════════════════════════════════════┘
```

**Satu pola penutup, satu bentuk.** `<Card variant="highlight">` dicabut dari **keempat** halaman publik:
`tentang:349-361`, `komunitas:287-299`, `cerita:154-167`, `gerakan:155-168`.

**Footer.** Tiga kolom tautan **teks polos**, baris organisasi + kontak, dan lockup "Didukung oleh"
**monokrom**. Dua pil berbingkai di `Footer.svelte:64-75` dihapus: mereka terbaca sebagai chip placeholder.
Tambahkan `/kalender` ke `tautan[]` (`Footer.svelte:18-23`). Three-band tick muncul kedua kalinya di sini.

---

### 6.8 Ringkasan: apa yang hilang dari beranda

| Sekarang | Nasib |
|---|---|
| Blob blur hero `:106-113` | **Hapus** |
| Tangga tier hero `:154-182` | Pindah → `/awardee` |
| Strip 4 `StatTile` `:187-222` | Ganti pita data E2 |
| 4 kartu langkah `LANGKAH` `:42-63`, `:309-326` | Pindah → `/daftar` |
| Tabel 9 cara poin `:329-353` | Pindah → `/awardee/aksi` |
| Kartu 4 tier `:355-377` | Pindah → `/awardee/aksi` |
| Sorotan `MemberCard` `:382-425` | Pindah → `/awardee/papan-peringkat`; agregatnya → `/admin` (ECharts) |
| Impor `PointsChip`, `SCORING_TABLE`, `TIER_TABLE` `:24`, `:28-29` | **Hapus** |

Dari tujuh seksi lama, empat dicabut dan tiga dipertahankan dalam bentuk yang berbeda. Beranda baru juga punya
tujuh seksi: tetapi **tidak ada dua di antaranya yang berbagi bentuk**.

---

## 7. Halaman blog + panel event di sisinya

### 7.1 `/cerita`: indeks (Keputusan #4: panel event di sebelah halaman blog)

```
┌── MASTHEAD ───────────────────────────────────────────────────────────────┐

┌── kol 1–12 · kepala halaman · TANPA foto ─────────────────────────────────┐
│ COMMUNITY JOURNALISM  (kicker mono)                                        │
│ Cerita dari lapangan                       (Fraunces H1 clamp 30–44px)     │
│ Sebelas cerita terbit sejak Mei 2026. Semuanya ditulis anggota,            │
│ ditinjau verifikator, lalu diterbitkan.    (dek 18px · max 60ch)           │
└────────────────────────────────────────────────────────────────────────────┘

┌── kol 1–8 · DAFTAR CERITA ────────────┐  ┌── kol 9–12 · <aside> sticky ───┐
│ [ Cari cerita…      ]  Semua ▾ E S G  │  │ ▬▬▬▬ keying rule 4px merah     │
│  ↑ SearchInput + FilterChips:        │  │ KALENDER KOMUNITAS  (kicker)   │
│    komponen lama, dipakai apa adanya  │  │                                 │
│                                        │  │ 03 │ Temu Nasional Pfriends    │
│ ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈ │  │ AGU│ Luring · Jakarta         │
│ ┌────────────────────────────────────┐│  │ ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈ │
│ │ FOTO 3:2 · ▔ keying rule pilar     ││  │ 17 │ Sharing: Ekspor Kriya     │
│ │ cerita-mangrove-belawan.jpg        ││  │ AGU│ Daring · Zoom             │
│ └────────────────────────────────────┘│  │ ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈ │
│ LINGKUNGAN                             │  │ 24 │ Kelas Penulisan Cerita    │
│ Mangrove Kembali di Pesisir Belawan   │  │ AGU│ Daring · Chapter PF 12    │
│ (Fraunces 24px)                        │  │ ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈ │
│ Standfirst dua baris                   │  │ 31 │ Klinik Bisnis: HPP        │
│ (BL) Bayu Lubis · 14 Jun · 9 mnt       │  │ AGU│ Luring · Balikpapan       │
│ ══════════ hairline penuh ═══════════ │  │                                 │
│                                        │  │             Lihat semua →      │
│ grid-cols-2 · 10 cerita sisanya:       │  │ ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈ │
│ FOTO 16:9 + kicker + judul 20px +      │  │ Punya cerita dari lapangan?    │
│ tanggal. TANPA kartu; dipisah          │  │ [ Masuk untuk menulis ]        │
│ hairline vertikal 1px di talang.       │  └─────────────────────────────────┘
└────────────────────────────────────────┘      position: sticky; top: 96px
```

**Perilaku responsif panel (FR-KAL-06):**

| Lebar | Perilaku |
|---|---|
| ≥1024 px | `<aside>` kolom kanan, lebar 320–360 px, `sticky top: 96px` |
| 768–1023 px | Panel **turun ke bawah** daftar cerita sebagai satu blok penuh, `EventListPanel variant="strip"` (baris horizontal yang dapat digulir) |
| <768 px | Panel turun ke bawah, satu kolom, maksimal 3 butir |

**Panel tidak pernah disembunyikan.** Event adalah alasan orang kembali (US-R09 AC-2).
**Keadaan kosong** menampilkan: *"Belum ada kegiatan terjadwal. Agenda baru diumumkan tiap awal bulan."* :
bukan panel kosong, bukan panel yang hilang (US-R09 AC-5).

**Yang dihapus dari `/cerita`:** `:159-161` ("setiap cerita yang masuk menambah poin kontribusi") dan
`<Card variant="highlight">` di `:154-167`.

### 7.2 `/cerita/[slug]`: artikel

```
┌── kol 1–12 · FOTO SAMPUL 21:9 full-bleed ─────────────────────────────────┐
│  cerita-mangrove-belawan.jpg: foto asli, TANPA overlay, TANPA gradien     │
│  ▔ keying rule 4px warna pilar ESG, tepi atas                             │
└────────────────────────────────────────────────────────────────────────────┘
  ┈ hairline ┈  Ilustrasi kegiatan komunitas: foto stok
                Foto: Unsplash / Nama                          (rata kanan)

┌── kol 2–8 · ARTIKEL ──────────────────┐  ┌── kol 9–12 · <aside> sticky ───┐
│ LINGKUNGAN · SDG 13, 14   (kicker)    │  │ TENTANG CERITA INI             │
│                                        │  │ Lokasi    Belawan, Medan      │
│ Mangrove Kembali di Pesisir            │  │ Peserta   64 orang            │
│ Belawan, dan Kali Ini Kami             │  │ Terbit    14 Jun 2026         │
│ Merawatnya                             │  │ Pilar     Lingkungan          │
│ (Fraunces H1 clamp 30–44px / 1.06)     │  │ ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈ │
│                                        │  │ KALENDER KOMUNITAS            │
│ (BL) Bayu Lubis: alumni PF 10,        │  │ EventListPanel variant="rail",│
│      fasilitator pesisir               │  │ limit 3: komponen yang SAMA  │
│      14 Jun 2026 · 9 menit baca        │  │ dengan /cerita, bukan salinan │
│ ↑ TANPA cincin tier, TANPA TierBadge   │  │ ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈ │
│                                        │  │ Bagikan   WA · Salin tautan   │
│ Body 18px/1.75 · measure 66ch ·        │  └─────────────────────────────────┘
│ paragraf pertama 20px (drop-in lead).  │
│                                        │
│ ┃ "Yang paling berkesan bukan saat     │ ← PullQuote: rule kiri 4px navy,
│ ┃  lampu pertama menyala."             │   Fraunces 24px, TANPA glyph
│ ┃ : Bayu Lubis                        │   tanda kutip raksasa
│                                        │
│ ┈┈ Kotak dampak: hairline atas+bawah, │
│    BUKAN kartu berlatar tint ┈┈        │
│    64 peserta · 1.200 bibit ·          │
│    kesepakatan perawatan 2 tahun       │
└────────────────────────────────────────┘

════════════ hairline penuh ════════════
CERITA LAIN: tiga judul teks murni · kol 1–12 · grid-cols-3 · TANPA gambar
```

**Yang dihapus:** `cerita/[slug]/+page.svelte:25` (impor `TierBadge`), `:151` (`tier={penulis?.tierLevel}`),
`:156` (`<TierBadge>`), `:126-129` (sampul gradien), dan `:45`
(`catalog.byId('member', cerita.memberId)` yang dimuat semata-mata untuk tier).

---

## 8. Komponen visual baru

Setiap usulan diperiksa terhadap **33 komponen** yang sudah ada di `src/lib/components/index.js`.
Kolom "Kenapa bukan komponen lama" wajib: tanpa itu, ini hanya menambah kembaran (US-R31 AC-6).

Lokasi: **`src/lib/components/editorial/`** (subdirektori baru; barrel `index.js` me-reexport).
Milik **WP-03**.

> **Nama & props di §8.1–§8.9 DIGANTI oleh `12-BUILD-CONTRACT-V2.md` §2.13** (lihat koreksi di kepala
> dokumen). Yang tetap berlaku dari §8 adalah **tanggung jawab, perilaku wajib, aksesibilitas, dan alasan
> "kenapa bukan komponen lama"**: bukan nama berkas maupun nama props.
> Peta: `EventRail`→`EventListPanel` · `MiniCalendar`→`MonthCalendar` (`markers:{date,type,color}[]` →
> `events:EventCardVM[]`, **beda bentuk data**) · `ImpactBand`→`DataBand` (`primary`/`secondary[3]` →
> `lead`/`items`) · `EditorialSection`→`SectionRule` (props `scale`/`rhythm` ikut pindah, penegak ritme
> tidak hilang). `PhotoFigure`, `ImpactFigure`, `PullQuote`, `EditorialHero` tetap bernama sama.
> `PhotoFigure` dan `EditorialHero` **wajib** ber-`alt`, dan `PhotoFigure` **wajib** ber-`width`/`height`.

---

### 8.1 `PhotoFigure.svelte`

**Tanggung jawab.** Satu-satunya cara foto masuk ke zona publik: `<figure>` + keying rule + kapsi + kredit +
`alt` wajib + atribut `loading`/`width`/`height` yang benar.

```js
/**
 * @typedef {object} PhotoFigureProps
 * @property {string}  src            Jalur ke /img/*.jpg: bukan URL eksternal.
 * @property {string}  alt            WAJIB. String kosong hanya sah bila decorative=true.
 * @property {number}  width          Piksel intrinsik: mencegah CLS.
 * @property {number}  height
 * @property {'21:9'|'16:9'|'3:2'|'4:5'|'1:1'} ratio
 * @property {string}  [caption]      "Subjek: Tempat, Bulan Tahun". Lihat §4.4.
 * @property {'red'|'navy'|'green'|'none'} [keyline='none']
 * @property {'top'|'left'} [keylinePos='top']
 * @property {boolean} [priority=false]  true → fetchpriority=high, tanpa lazy. HANYA untuk LCP.
 * @property {string}  [srcMobile]       Sumber <picture> alternatif di bawah 640px.
 * @property {boolean} [decorative=false] Melepas kewajiban alt; dilarang di zona publik (P-1).
 * @property {string}  [class]
 */
```

**Perilaku wajib.** Membaca `src/lib/data/photo-credits.json` untuk mencetak baris kredit. Bila
`isStock: true` **dan** `caption` mengandung nama tempat spesifik, komponen melempar peringatan konsol di
mode dev: penegakan §4.4.

**Kenapa bukan komponen lama.** Tidak ada komponen `<img>` bersemantik `<figure>` di seluruh proyek.
`Avatar.svelte` adalah potret bulat berukuran tetap. `StoryCard`/`RewardCard` menempelkan `<img>` di dalam
kartu tanpa kapsi, kredit, maupun keying rule.

---

### 8.2 `SectionRule.svelte`  *(eks `EditorialSection`: nama final doc 12 §2.13)*

**Tanggung jawab.** Kepala seksi yang **memaksa variasi**: obat langsung untuk D-03 dan D-04, sekaligus
penegak ritme `--rhythm-*` untuk D-10.

```js
/**
 * @typedef {object} SectionRuleProps
 * @property {string}  title
 * @property {string}  [kicker]    Mono 11px. Sengaja OPSIONAL: tidak semua seksi punya.
 * @property {string}  [lead]      Dek 18px.
 * @property {'display'|'section'|'quiet'} [scale='section']
 *           display = Fraunces 44px · section = 30px · quiet = 24px tanpa dek.
 * @property {'loose'|'base'|'snug'|'tight'|'flush'} [rhythm='base']   → --rhythm-*
 * @property {'start'|'wide'|'split'} [align='start']
 *           split = judul kiri, aksi kanan (dipakai E5).
 * @property {import('svelte').Snippet} [action]    Tautan "Lihat semua →".
 * @property {import('svelte').Snippet} children
 */
```

**Perilaku wajib.** Melempar peringatan dev bila dua `SectionRule` bersebelahan memakai kombinasi
`scale` + `rhythm` yang identik. Aturan yang tidak ditegakkan akan dilanggar dalam dua sprint.

**Kenapa bukan komponen lama.** `PageHeader.svelte` adalah kepala **halaman** (punya `backHref`, dipakai zona
ter-login), bukan kepala **seksi**, dan tidak punya konsep skala maupun ritme.

---

### 8.3 `ImpactFigure.svelte`

**Tanggung jawab.** Satu angka agregat dengan penyebutnya: penegak P-2 dan obat D-12.

```js
/**
 * @typedef {object} ImpactFigureProps
 * @property {string|number} value      "3.200 – 64.000" atau 52. Sudah terformat.
 * @property {string}  label            Mono 11px uppercase.
 * @property {string}  context          WAJIB. Penyebut/periode. Penyebut HANYA dari
 *                                      `snapshot.beneficiaryRegistry`; bila null, isi periode.
 * @property {'primary'|'secondary'} [size='secondary']   56px | 40px.
 * @property {'counted'|'estimated'} [kind='counted']     estimated → lencana "Estimasi" + ⓘ.
 * @property {number[]} [sparkline]     8 titik. Hanya sah pada size='primary'.
 * @property {'navy'|'canvas'} [surface='navy']           Menentukan token warna teks.
 * @property {import('svelte').Snippet} [methodology]     Isi popover ⓘ.
 */
```

**Invarian.** `context` wajib tidak kosong. Penegakannya: **`console.warn` di mode dev + render label
periode sebagai pengganti**: **bukan** `TypeError`. Melempar dari komponen presentasi merobohkan seluruh
halaman, bukan satu kartu, dan sebuah penyebut yang belum tersedia bukan alasan yang sepadan untuk itu
(`12-BUILD-CONTRACT-V2.md` §8.2). `kind='estimated'` **wajib** disertai `methodology`.

**Kenapa bukan komponen lama.** `StatTile.svelte` adalah kartu (`card block`, `:52`) dengan ikon di kotak tint
(`:56-61`): dua ciri yang justru sedang dibuang (D-05, D-06): dan tidak punya slot konteks maupun konsep
terhitung-vs-estimasi. `StatTile` **tetap dipakai** di zona ter-login; ia hanya pensiun dari publik.

---

### 8.4 `DataBand.svelte`  *(eks `ImpactBand`: props `lead`/`items`, doc 12 §2.13)*

**Tanggung jawab.** Pita navy full-bleed E2: satu metrik utama + tiga sekunder, dipisah garis vertikal
1 px putih/20, plus baris kaki tanggal potret & tautan metode.

```js
/**
 * @typedef {object} DataBandProps
 * @property {import('./ImpactFigure.svelte').ImpactFigureProps}   primary
 * @property {import('./ImpactFigure.svelte').ImpactFigureProps[]} secondary  Tepat 3.
 * @property {string} asOf                              "22 Juli 2026": tanggal potret, WAJIB.
 * @property {string} [methodHref='/metode-pengukuran']
 */
```

**Sumber data.** `ProgramImpactService.publicSnapshot()`: tanpa satu pun field poin/tier, sehingga kebocoran
menjadi mustahil secara struktural, bukan secara konvensi.

**Kenapa bukan komponen lama.** Tidak ada komponen pita full-bleed di proyek. Alternatifnya adalah empat
`StatTile` dalam `grid-cols-4`: persis yang sedang dibuang.

---

### 8.5 `EventListPanel.svelte`  *(eks `EventRail`: nama final doc 12 §2.13)*

**Tanggung jawab.** Daftar event sebagai **baris tabel**, bukan kartu. Satu komponen, empat tempat:
E4 beranda · panel `/cerita` · panel `/cerita/[slug]` · dasbor `/awardee`.

```js
/**
 * @typedef {object} EventListPanelProps
 * @property {object[]} events
 * @property {'list'|'rail'|'strip'} [variant='list']
 *           list  = E4, lebar penuh, boleh ber-thumbnail
 *           rail  = <aside> sempit satu kolom, tanpa thumbnail
 *           strip = tablet, baris horizontal yang dapat digulir
 * @property {number}  [limit=5]
 * @property {string}  [title='Kalender Komunitas']
 * @property {string}  [href='/kalender']
 * @property {number}  [thumbnailAt=0]  Indeks 1-basis baris ber-thumbnail; 0 = tidak ada.
 *                                       BAKU 0 dan DITENTUKAN PEMANGGIL per lokasi
 *                                       (beranda 3 · /cerita 1 · /cerita/[slug] 0 · /awardee 2).
 *                                       Penyimpangan P-3 adalah keputusan editor; nilai bawaan 3 akan
 *                                       menjadikan "baris ketiga selalu berbeda" sebagai keseragaman
 *                                       BARU di empat halaman sekaligus: persis yang P-3 hindari.
 * @property {string}  [emptyMessage='Belum ada kegiatan terjadwal. Agenda baru diumumkan tiap awal bulan.']
 * @property {boolean} [showPoints=false]   DILARANG true di zona publik (Keputusan #2).
 */
```

**Kenapa bukan komponen lama.** `EventCard.svelte` adalah kartu setinggi ±200 px dengan `<PointsChip>`
(`:136-137`), tombol daftar, dan indikator "sisa N kursi" (`:125-130`): tiga hal yang dilarang publik.
`EventListPanel` adalah baris 64 px tanpa satu pun di antaranya. `EventCard` **tetap dipakai** di
`/awardee/kalender`. `Timeline.svelte` adalah lini masa vertikal ber-titik untuk peristiwa historis, bukan
daftar agenda mendatang yang dapat diklik.

---

### 8.6 `MonthCalendar.svelte`  *(eks `MiniCalendar`; `markers` -> `events:EventCardVM[]`, doc 12 §2.13)*

**Tanggung jawab.** Grid bulan 7×5 dengan penanda tanggal ber-kegiatan (E4 kolom kiri, dan halaman
`/kalender`).

```js
/**
 * @typedef {object} MonthCalendarProps
 * @property {Date}    month                                Bulan yang ditampilkan.
 * @property {{date:Date, type:string, color:string}[]} markers
 * @property {Date}    [selected]
 * @property {(d:Date)=>void} [onSelect]
 * @property {Date}    [min]        Batas navigasi mundur (Jan 2026).
 * @property {Date}    [max]        Batas navigasi maju (+3 bulan dari hari ini).
 * @property {boolean} [compact=false]   true → sel 28px, untuk <aside>.
 */
```

**Aksesibilitas.** `<table>` dengan `<caption>` bulan; sel tanggal ber-kegiatan memakai
`aria-label="3 Agustus, 1 kegiatan: Temu Nasional Pfriends"`. Penanda **tidak boleh** hanya berupa warna
(WCAG 1.4.1): angka tanggal juga `font-weight: 700`, dan daftar teks ada di sebelahnya.
Target sentuh sel ≥44×44 px.

**Kenapa bukan komponen lama.** Tidak ada apa pun yang menyerupai kalender di proyek;
`member/kalender/+page.svelte` (501 baris) menghitung grid bulan langsung di dalam halaman: komponen ini
justru mengeluarkannya dari sana.

---

### 8.7 `PullQuote.svelte`

**Tanggung jawab.** Kutipan tarik di dalam artikel: pemecah ritme utama halaman panjang.

```js
/**
 * @typedef {object} PullQuoteProps
 * @property {string} quote
 * @property {string} [attribution]
 * @property {'navy'|'red'|'green'} [keyline='navy']
 * @property {'inline'|'pulled'} [variant='inline']   pulled = keluar 64px ke talang kiri (≥1024px).
 */
```

**Larangan.** Tanpa glyph tanda kutip raksasa dekoratif: itu tanda template yang setara dengan blob blur.
Yang membedakan kutipan dari paragraf: rule kiri 4 px, Fraunces 24 px, dan ruang putih.

**Kenapa bukan komponen lama.** `Card variant="highlight"` adalah kotak tint (dilarang, P-5).
`Timeline` tidak berhubungan.

---

### 8.8 `EditorialHero.svelte`

**Tanggung jawab.** Hero full-bleed dengan gradasi overlay yang benar, teks rata bawah 6/12, `<picture>`
mobile, kapsi di kanan bawah. Dipakai E1, pita penutup E7, hero `/tentang`, hero `/komunitas`.

```js
/**
 * @typedef {object} EditorialHeroProps
 * @property {string} src
 * @property {string} srcMobile
 * @property {string} alt
 * @property {string} kicker
 * @property {string} title                 Penggalan baris manual lewat \n.
 * @property {string} [standfirst]
 * @property {string} [caption]
 * @property {string} [byline]
 * @property {'gradient'|'flat'} [overlay='gradient']
 *           gradient = 0.88→0.86→0.55→0.15 (E1) · flat = 0.88 rata (E7, CTA)
 * @property {'tall'|'short'} [height='tall']
 *           tall = clamp(440,58vw,640) · short = clamp(280,34vw,380)
 * @property {import('svelte').Snippet} [actions]
 */
```

**Invarian yang ditegakkan.** Opasitas overlay di zona teks tidak pernah di bawah `0.82`. Nilai gradasi adalah
**konstanta internal komponen** dan **tidak** dapat dioper lewat props: supaya tidak ada halaman yang bisa
menurunkannya dan memecahkan kontras (§10.3). Ini satu-satunya cara aturan bertahan setelah orang lain
menyunting halaman.

**Kenapa bukan komponen lama.** `Header.svelte` adalah bar navigasi. `PageHeader.svelte` adalah judul teks
tanpa foto. Hero sekarang ditulis langsung di dalam `+page.svelte:105-186` dan tidak dapat dipakai ulang.

---

### 8.9 Ringkasan komponen baru

**Nama berkas di bawah adalah nama FINAL `12-BUILD-CONTRACT-V2.md` §2.13.** Kolom kedua mencantumkan nama
lama yang masih muncul di prosa §2, §6, §7, dan §10 dokumen ini: bacalah sebagai sinonim, jangan sebagai
nama berkas.

| Berkas (FINAL) | Nama lama di prosa doc 11 | Baris (perkiraan) | Dipakai di |
|---|---|--:|---|
| `editorial/PhotoFigure.svelte` |: | 95 | E1, E3, E5, E6, `/tentang`, `/komunitas`, `/cerita/[slug]` |
| `editorial/SectionRule.svelte` | `EditorialSection` | 80 | seluruh seksi zona publik |
| `editorial/ImpactFigure.svelte` |: | 90 | E2, `/tentang` |
| `editorial/DataBand.svelte` | `ImpactBand` | 70 | E2 |
| `editorial/StorySpread.svelte` | *(baru di doc 12 §2.13)* | 110 | E5, `/cerita` |
| `editorial/PullQuote.svelte` |: | 55 | `/cerita/[slug]`, `/tentang` |
| `editorial/EditorialHero.svelte` |: | 120 | E1, E7, hero `/tentang`, hero `/komunitas` |
| `editorial/MonthCalendar.svelte` | `MiniCalendar` | 140 | E4, `/kalender` |
| `editorial/view-model.js` | *(baru di doc 12 §2.13)* | 70 | `eventCardVM()`, `storyVM()` |
| `components/EventListPanel.svelte` | `EventRail` | 130 | E4, `/cerita`, `/cerita/[slug]`, `/awardee`, `/verifikator` |

**Delapan komponen editorial + `EventListPanel` + satu pemeta, ±960 baris.** Tidak ada satu pun yang
menduplikasi 33 komponen yang sudah ada. `EventListPanel` hidup di `src/lib/components/`, **bukan** di
`editorial/`, karena ia juga dipakai tiga zona ter-login.

---

## 9. Komponen lama: diubah, dipensiunkan, dipindah

| Komponen | Tindakan | Rincian |
|---|---|---|
| `Header.svelte` | **Ubah** | Varian `masthead` dua baris untuk zona publik; cabut `backdrop-blur-md` (`:42`). `:84` dan `:101` yang hard-code `/member/*` ikut di-rename ke `/awardee/*`. |
| `Footer.svelte` | **Ubah** | Hapus dua pil `:64-75`; tambah `/kalender` ke `tautan[]` `:18-23`; ganti misi tiga-kata-kerja `:37-40` dengan baris fakta (P-7 #7). |
| `StoryCard.svelte` | **Ubah** | Fallback gradien `:53-61` → fallback **tipografis** (kicker pilar besar Fraunces di atas `ink-50` + keying rule 4 px). **Slot sampul WAJIB diubah**, bukan dipertahankan: `:48-52` hari ini merender `<img src={story.cover} alt="" …>`: `alt` kosong keras, tanpa `width`/`height`, tanpa `loading="lazy"`, melanggar §4.5 dokumen ini sendiri. Kontrak baru (`12-BUILD-CONTRACT-V2.md` §2.13): prop `foto: Photo\|null`, meneruskan `alt`/`width`/`height`/`loading`, dan `foto === null` → cabang tipografis. |
| `EventCard.svelte` | **Ubah** | Tambah prop `showPoints = false`; `:136-137` dibungkus `{#if showPoints}`. Hanya `true` di zona Awardee. |
| `Avatar.svelte` | **Tetap** | Inisial adalah keputusan sadar (§4.6), bukan kekurangan. Yang dicabut hanya `tier` + `showRing` pada pemakaian publik. |
| `Card.svelte` | **Pensiun dari publik** | `variant="highlight"` (`:33`) dicabut dari empat halaman publik. Komponen tetap hidup di zona ter-login. |
| `StatTile.svelte` | **Pensiun dari publik** | Digantikan `ImpactFigure` + `DataBand`. Tetap dipakai `/admin`. |
| `MemberCard.svelte` | **Pensiun dari publik** | Merender grid Poin/Badge/Chapter (`:71-84`) + `TierBadge` (`:68`, `:110`): bocor secara struktural. Tetap dipakai `/awardee/direktori`. |
| `PointsChip` · `TierBadge` · `TierProgress` · `LeaderboardRow` · `BadgeTile` | **Dilarang di publik** | Nol impor di bawah `src/routes/(public)/` (US-R19 AC-5). |
| `SearchInput` · `FilterChips` · `EmptyState` · `Button` · `Icon` · `StatusBadge` | **Tetap apa adanya** | Sudah netral; dipakai ulang dalam rancangan baru. |

**Perbaikan satu baris yang paling menguntungkan di seluruh dokumen ini:**

```js
// src/routes/(public)/_view-model.js: kartuCerita(), sisipkan setelah baris :36
foto: fotoCerita(story.slug),          // -> Photo | null   (src/lib/data/photos.js)
```

Tanpa baris ini, ke-27 foto yang diunduh tidak akan pernah tampil di kartu cerita, karena `_view-model.js`
`kartuCerita()` (`:32-44`) tidak memetakan sampul sama sekali (D-08). Kepemilikan: **WP-04**.

> **KOREKSI.** Versi sebelumnya menulis `cover: story.coverImage ?? '/img/cerita-default.jpg'`.
> **Dicabut**, karena dua sebab yang saling menguatkan:
> (a) **`Story` tidak punya field `coverImage` maupun `cover`**: diverifikasi ke `Story.js` typedef
> `StoryInput` `:57-79` dan ke `seed-data.js`. Ekspresi itu **selalu** `undefined`, sehingga fallback
> **selalu** terpakai dan **seluruh** kartu cerita memakai satu foto yang sama: reproduksi persis cacat
> D-08 ("placeholder dipromosikan menjadi desain"), hanya berganti dari gradien ke foto.
> (b) Karena fallback selalu terisi, cabang `{#if story?.cover}` (`StoryCard.svelte:47`) **selalu** benar,
> sehingga fallback tipografis F-2 menjadi **kode mati** dan kegagalan unduh menghasilkan `<img>` rusak :
> persis yang R-13 `12-BUILD-CONTRACT-V2.md` §7 larang.
> Pemetaan slug→foto hidup di **satu** tempat, `src/lib/data/photos.js` (`fotoCerita(slug)`, doc 12 §2.13),
> dan `null` adalah nilai yang sah: ia memicu fallback tipografis, bukan foto default bersama.

---

## 10. Kontras WCAG AA untuk kombinasi baru

Seluruh nilai di bawah **dihitung**, bukan diperkirakan, memakai formula luminansi relatif WCAG 2.1.
Ambang: **4.5:1** teks normal · **3.0:1** teks besar (≥24 px, atau ≥18.66 px bold) & komponen UI.

### 10.1 Kanvas hangat `#F6F4F1` menggantikan `#F5F6F7`

| Token | di `#FFFFFF` | di `#F5F6F7` (lama) | di **`#F6F4F1`** (baru) | Status |
|---|--:|--:|--:|---|
| `ink-900` `#0F1B2D` | 17.28 | 15.97 | **15.74** | AAA ✓ |
| `ink-800` `#1E293B` | 14.63 | 13.52 | **13.33** | AAA ✓ |
| `heading` `#12355B` | 12.46 | 11.51 | **11.35** | AAA ✓ |
| `ink-700` `#334155` | 10.35 | 9.57 | **9.43** | AAA ✓ |
| `ink-600` `#475569` | 7.58 | 7.00 | **6.90** | AAA ✓ |
| `ink-500` `#64748B` | 4.76 | 4.40 ✗ | **4.33** ✗ | **tetap dilarang di kanvas** |
| `pertamina-red-ink` `#B91820` | 6.53 | 6.04 | **5.95** | AA+ ✓ |
| `pertamina-navy` `#003E7E` | 10.55 | 9.75 | **9.61** | AAA ✓ |
| `pertamina-blue` `#0C4DA2` | 8.08 | 7.47 | **7.36** | AAA ✓ |
| `esg-e-ink` `#0E7C52` | 5.22 | 4.82 | **4.75** | AA ✓ |
| `esg-g-ink` `#6D4AA8` | 6.57 | 6.07 | **5.99** | AA+ ✓ |
| `tier-champion-ink` `#8A6410` | 5.37 | 4.96 | **4.89** | AA ✓ |

**Kesimpulan.** Tidak ada satu pun pasangan yang jatuh dari lolos ke gagal. Larangan lama tidak berubah:
`ink-500` sudah gagal di kanvas lama (4.40) dan tetap gagal di kanvas baru (4.33).
**Teks sekunder di kanvas publik wajib `ink-600` (6.90 ✓)**; `ink-500` hanya sah di atas `surface` putih
(4.76 ✓). Itulah sebabnya `@utility kicker` (§3.5) memakai `ink-600`, sementara `label-micro` lama
(`app.css:233`) memakai `ink-500`.

> **Koreksi kecil, tanpa dampak rusak.** Klaim *"`label-micro` hanya dipakai di atas kartu putih"* **tidak
> benar**: ia juga dipakai langsung di atas kanvas pada `(public)/+page.svelte:227, :299, :432`,
> `gerakan:85-103`, dan `tentang:226`. Kontrasnya sudah gagal **sebelum** perubahan kanvas (4.40) dan hanya
> sedikit memburuk (4.33): jadi ini **bukan regresi baru**, melainkan utang lama. Konsekuensi praktisnya:
> zona publik pindah ke `kicker` (`ink-600`) sesuai rencana, dan pemakaian `label-micro` **di zona
> ter-login** ikut diaudit: di sana ia harus berdiri di atas `surface` putih, bukan di atas kanvas.

Baris hover `EventListPanel` `#EFECE6`: `ink-900` = **14.66 ✓**, `ink-600` = **6.43 ✓**.

### 10.2 Teks putih di atas pita navy `#003E7E`

| Opasitas putih | Warna efektif | Rasio | Status | Dipakai untuk |
|---|---|--:|---|---|
| 100 % | `#FFFFFF` | **10.55** | AAA ✓ | angka data, judul |
| 88 % | ≈`#E0E5EC` | **8.30** | AAA ✓ | body |
| 75 % | ≈`#BFCFDF` | **6.64** | AA+ ✓ | baris navy masthead |
| 70 % | ≈`#B3C5D8` | **5.98** | AA ✓ | **baris konteks/penyebut pita data** |
| 65 % | ≈`#A6BBD1` | **5.35** | AA ✓ | kredit foto di atas navy |
| 60 % | ≈`#99B1CB` | **4.78** | AA ✓ | **batas bawah mutlak untuk teks normal** |
| 55 % | ≈`#8CA7C4` | **4.24** | ✗ **GAGAL** |: |
| 50 % | ≈`#809EBE` | 3.79 | ✗ | hanya garis pemisah dekoratif |

> **KOREKSI terhadap audit visual.** Audit mengusulkan baris konteks pita data memakai `putih/55`.
> Nilai itu **gagal AA (4.24)**. Rancangan E2 pada dokumen ini memakai **`putih/70` (5.98 ✓)**.
> Garis pemisah vertikal `putih/20` tetap sah: ia dekoratif dan bukan pembawa informasi: batas kolom juga
> dinyatakan oleh jarak, sehingga WCAG 1.4.11 tidak terlanggar.

### 10.3 Teks putih di atas foto ber-overlay navy

Kasus terburuk yang mungkin: foto **putih polos** di bawah teks, overlay `#003E7E` dengan `multiply`.

| Opasitas overlay | Warna efektif terburuk | Rasio teks putih | Status |
|---|---|--:|---|
| 0.70 | `#4D78A5` | 4.62 | AA ✓ tetapi marginnya terlalu tipis |
| 0.75 | `#406E9E` | 5.33 | AA ✓ |
| 0.80 | `#336598` | 6.08 | AA+ ✓ |
| **0.82** | `#2E6195` | **6.44** | **AA+ ✓: ambang mengikat** |
| 0.85 | `#265B91` | 7.03 | AAA ✓ |
| **0.88** | `#1F558D` | **7.66** | AAA ✓: tepi kiri E1 & seluruh E7 |
| 0.90 | `#19518B` | 8.10 | AAA ✓ |

**Aturan mengikat.** Opasitas overlay **tidak pernah** di bawah `0.82` di mana pun teks putih berdiri.
Nilai ini di-hardcode di `EditorialHero.svelte` dan **tidak** dapat dioper lewat props (§8.8).

Standfirst `putih/88` di atas overlay 0.86 (posisi 34 %): efektif ≈`#E0E5EC` di atas ≈`#22588F` →
**6.61 ✓**.

### 10.4 Keying rule, sparkline, dan elemen non-teks

WCAG 1.4.11 menuntut **3.0:1** untuk komponen UI dan grafik yang membawa informasi.

| Elemen | Warna | Latar | Rasio | Status |
|---|---|---|--:|---|
| Keying rule merah | `#ED1C24` | `#F6F4F1` | 4.16 | ✓ |
| Keying rule navy | `#003E7E` | `#F6F4F1` | 9.61 | ✓ |
| Keying rule hijau | `#009B4C` | `#F6F4F1` | 3.15 | ✓ (marginal: **jangan** dipakai <4 px) |
| Hairline `ink-200` `#E2E8F0` |: | `#F6F4F1` | 1.11 | dekoratif murni; **tidak boleh** menjadi satu-satunya pembawa makna |
| Garis grid kalender `ink-200` |: | `#F6F4F1` | 1.11 | idem: penanda kegiatan juga memakai bobot huruf 700 + daftar teks |
| Penanda tanggal (kotak isi 6 px) | `#ED1C24` / `#003E7E` / `#009B4C` | `#F6F4F1` | 4.16 / 9.61 / 3.15 | ✓ semua |
| Sparkline hijau 35 % di atas navy | ≈`#3A7A6F` | `#003E7E` | 1.87 | **dekoratif**: angka utamanya tetap tercetak penuh, jadi nol informasi hilang |
| Garis bawah nav aktif 2 px | `#ED1C24` | `#F6F4F1` | 4.16 | ✓: status aktif juga dinyatakan `aria-current="page"` |
| Tombol primer: putih di `#ED1C24` | `#FFFFFF` | `#ED1C24` | **4.38** | ✗ teks normal |

> **Catatan tombol primer: penting.** `4.38` di bawah ambang 4.5, dan `Button.svelte` memakai
> `font-semibold` pada 14–16 px, yang **belum** memenuhi definisi "teks besar" WCAG (18.66 px bold).
> **Solusi yang dipakai:** tombol primer zona publik memakai latar `--color-pertamina-red-ink` `#B91820`
> → putih = **6.53 ✓** pada ukuran berapa pun. Warna `#ED1C24` tetap dipakai untuk keying rule dan garis
> bawah nav, di mana ia **tidak menyentuh glyph**: konsisten dengan aturan emas
> `08-DESIGN-SYSTEM.md §0.1` dan dengan komentar `app.css:16` yang sudah menandainya "fill saja".

### 10.5 Aturan yang tidak berubah

1. **Warna polos tidak pernah menyentuh glyph.** `pertamina-red`, `pertamina-green`, `tier-*`, dan `ink-400`
   tetap terlarang sebagai warna teks. Keying rule adalah bar, bukan huruf.
2. **Fokus terlihat.** `app.css:155-159` (`outline: 2px solid var(--color-pertamina-blue)`) tidak diubah.
   Komponen editorial baru **tidak boleh** memasang `outline: none`.
3. **`prefers-reduced-motion`** (`app.css:177-185`) berlaku juga untuk transisi hover baris `EventListPanel` dan
   `scale` pada foto.
4. **Jangan mengandalkan warna saja** (WCAG 1.4.1): kicker pilar ESG adalah **teks**, bukan hanya chip
   berwarna; penanda kalender disertai bobot huruf dan daftar teks; status event ditulis sebagai kata.
5. **Target sentuh ≥44×44 px** untuk baris `EventListPanel` dan sel `MonthCalendar` pada layar sentuh.
6. **`font-feature-settings: 'tnum'`** (`app.css:136`) tetap aktif; `figure-number` menegaskannya kembali
   supaya angka pita data tidak "goyang" saat berganti.

---

## 11. Checklist penerimaan visual

Gerbang penerimaan **WP-03** (aset, token, komponen) dan **WP-04** (route publik). Setiap butir dapat
diperiksa objektif: tidak ada "terasa lebih baik".

### 11.1 Kepatuhan Keputusan Pemilik Produk #2 (mutlak)

**Gerbang resmi adalah `node scripts/verify/public-purity.mjs`** (`12-BUILD-CONTRACT-V2.md` §6.2).
Tiga `grep` di bawah hanyalah pemeriksaan cepat dan **tunduk pada daftar pengecualian yang sama**.

```bash
# Ketiganya HARUS mengembalikan nol hasil:
grep -rn "PointsChip\|TierBadge\|TierProgress\|LeaderboardRow\|BadgeTile" "src/routes/(public)/"
grep -rn "SCORING_TABLE\|TIER_TABLE\|poinUntuk\|tierLevel" "src/routes/(public)/"
grep -rniE "\bpoin\b|\btier\b|papan peringkat|leaderboard|lencana" "src/routes/(public)/" \
  --exclude-dir=daftar --exclude-dir=metode-pengukuran
```

> **Dua pengecualian yang WAJIB, bukan kelonggaran.**
> (a) **`/daftar`**: dua teks consent `daftar/+page.svelte:65` (*"Aksi, poin, dan tier disimpan…"*) dan
> `:70` (*"…catatan poin tetap tersimpan sebagai jejak audit…"*) adalah **disclosure privasi**, bukan
> display skor. Mencabutnya membuat consent tidak jujur: dan berkas itu milik WP-02, **beku** bagi WP-04
> selama G3-B (`12-BUILD-CONTRACT-V2.md` §3.2 butir 6 & §3.7). Yang **dihapus** dari `/daftar` hanyalah
> blok "Poin pertamamu" (`:242-245`), dan itu sudah dikerjakan WP-02 di G2.
> (b) **`/metode-pengukuran`**: halaman yang seluruh isinya menjelaskan metode pengukuran akan gagal grep
> yang sama secara definisi.

- [ ] Menelusuri seluruh halaman publik tanpa login: **nol** tabel skor, **nol** tangga tier
      (25/50/100/150), **nol** papan peringkat, **nol** lencana, **nol** angka poin milik individu.
- [ ] `_view-model.js:109` `totalPoin` diganti cacah aksi/gerakan.
- [ ] Materi yang dipindahkan muncul **utuh** di `/awardee/aksi`, `/awardee/papan-peringkat`,
      `/awardee/penghargaan`: dipindahkan, bukan dibuang.

### 11.2 Foto & aset

- [ ] `static/img/` berisi **27 foto** sesuai manifest §5, dengan nama berkas persis, tiap berkas **>20 KB**.
- [ ] `du -sh static/img` ≤ **5 MB**; `find static/img -size +400k` kosong; foto non-hero `-size +250k` kosong.
- [ ] `photo-credits.json[hero-komunitas-mobile].unsplashId === photo-credits.json[hero-komunitas].unsplashId`,
      dan hal yang sama untuk `og-pfriends`: satu adegan, tiga crop (§5.6 `sameAs`).
- [ ] `src/lib/data/photo-credits.json` lengkap; `static/img/CREDITS.md` mencantumkan fotografer, tautan,
      sumber, dan lisensi tiap berkas.
- [ ] Setiap `<img>` punya `alt` bermakna berbahasa Indonesia yang **tidak** dimulai dengan
      "Gambar/Foto/Ilustrasi", plus `width` + `height` eksplisit dan `loading="lazy"` kecuali hero.
- [ ] Setiap `PhotoFigure` mencetak kapsi **dan** kredit.
- [ ] Selama `isStock: true`, **tidak ada** kapsi yang mengklaim tempat & bulan kegiatan Pfriends nyata.
- [ ] **Nol** wajah stok yang ditempelkan pada nama orang (§4.6): karena itu **tidak ada** berkas
      `avatar-*.jpg` di manifest; `Avatar.svelte` tetap memakai inisial.
- [ ] `static/favicon.svg` ada: 404 dari `app.html:5-6` hilang.
- [ ] `static/fonts/` berisi tiga `.woff2` + tiga berkas lisensi OFL.
- [ ] **Uji mode pesawat:** matikan jaringan, buka `build/` → tipografi tetap Fraunces + Plus Jakarta,
      seluruh foto tampil.

### 11.3 Struktur & ritme

- [ ] `grep -rn "blur-3xl\|backdrop-blur" "src/routes/(public)/" src/lib/components/editorial/` → **nol**.
- [ ] `app.css:129-132` (aura radial `body`) dihapus.
- [ ] **Tidak ada dua seksi bersebelahan** dengan jumlah kolom yang sama pada beranda.
- [ ] **Minimal dua** bagian memakai grid asimetris nyata (5/7, 7/5, 6/12): bukan 1.15fr/0.85fr.
- [ ] `padding-block` seksi beranda mengikuti `0 / 0 / 128 / 88 / 128 / 112 / 72`, bukan `py-12` berulang.
- [ ] **Tidak ada rentetan >3 objek berukuran identik** di mana pun zona publik.
- [ ] `Card variant="highlight"` **nol** kejadian di bawah `src/routes/(public)/`.
- [ ] `StatTile` **nol** kejadian di bawah `src/routes/(public)/`.
- [ ] Wadah "ikon-di-kotak-tint-membulat" **nol** kejadian di zona publik.
- [ ] **Isian** merah ≤1 per viewport pada beranda dan keempat halaman publik (P-5: keying rule, garis
      bawah nav aktif, dan penanda tanggal tidak dihitung).
- [ ] Ketiga butir struktur di §11.3 juga menjadi **kriteria selesai WP-04** di
      `12-BUILD-CONTRACT-V2.md` §3.5 butir 7, dan dua di antaranya diperiksa statis oleh
      `public-purity.mjs`: supaya D-03/D-04/D-10 punya penegak, bukan hanya daftar centang.

### 11.4 Tipografi

- [ ] `--font-display` ≠ `--font-sans` di `app.css`.
- [ ] Body zona publik **16 px**; zona ter-login tetap 14 px.
- [ ] Fraunces **tidak muncul** di bawah 24 px; Plus Jakarta **tidak muncul** di atas 24 px di zona publik.
- [ ] `PageHeader.svelte` dan `KpiCard.svelte` memasang `font-sans` eksplisit → zona admin tidak berubah
      wujud setelah token `--font-display` diganti.
- [ ] Kicker publik memakai mono, bukan sans-uppercase.
- [ ] Judul empat seksi beranda **tidak** semuanya berukuran sama.

### 11.5 Kontras & aksesibilitas

- [ ] Audit otomatis (axe / Lighthouse) pada `/`, `/cerita`, `/cerita/[slug]`, `/kalender`, `/komunitas`,
      `/tentang`, `/gerakan`: **nol** pelanggaran kontras.
- [ ] `ink-500` **nol** kejadian sebagai warna teks di atas `bg-canvas`.
- [ ] Uji overlay: ganti sementara foto hero dengan JPEG putih polos: teks putih harus tetap terbaca
      (≥6.44).
- [ ] Tombol primer publik memakai `pertamina-red-ink` (6.53), bukan `pertamina-red` (4.38).
- [ ] Navigasi keyboard: fokus terlihat di seluruh baris `EventListPanel` dan sel `MonthCalendar`.
- [ ] Zoom 200 % pada 1280 px: tidak ada teks terpotong, tidak ada scroll horizontal.
- [ ] `MonthCalendar` punya `<caption>` dan `aria-label` per sel ber-kegiatan.

### 11.6 Responsif

- [ ] Pada **375 px**: nol scroll horizontal di seluruh halaman publik.
- [ ] Seluruh grid asimetris runtuh menjadi satu kolom yang terbaca.
- [ ] Panel event **tetap tampil** di semua lebar: berpindah posisi, tidak pernah `display: none`.
- [ ] Hero mobile memakai `hero-komunitas-mobile.jpg`, bukan `object-position` dari berkas 21:9.
- [ ] `margin-top: -64px` E3 Baris B dinolkan di bawah 1024 px.
- [ ] Target sentuh baris event dan sel kalender ≥44×44 px.

### 11.7 Microcopy

- [ ] Konstruksi "X, bukan Y" ≤ **1 kejadian** di seluruh zona publik (dari 8 sekarang).
- [ ] Setiap angka publik membawa penyebut atau periode.
- [ ] Tanggal potret tercetak pada pita data.
- [ ] Angka estimasi tampil sebagai **rentang** + lencana `Estimasi` + kontrol `ⓘ`.
- [ ] Angka benchmark (2–3×, 5–20 %) ditulis sebagai **kalimat rujukan**: tanpa tipografi angka besar,
      tanpa gauge, tanpa progress bar: dengan pernyataan *"bukan hasil pengukuran Pfriends"*.
- [ ] **Nol** nilai rupiah di zona publik.
- [ ] **Nol** kalimat yang menjelaskan proses internal kepada pembaca luar.

### 11.8 Uji penutup: "apakah masih terasa AI"

Diajukan ke tiga orang yang belum pernah melihat proyek ini:

1. **"Tunjukkan satu hal di halaman ini yang mustahil dibuat tanpa ada orang yang benar-benar mengerjakan
   programnya."** Jawaban yang sah: kapsi foto bertempat-berbulan, penyebut angka, nama + angkatan +
   pekerjaan pada byline, keterangan jujur bahwa foto masih stok. Bila tidak ada jawaban → belum lulus.
2. **"Bagian mana yang paling penting di halaman ini?"** Bila jawabannya berbeda-beda atau "semuanya sama"
   → hierarki masih gagal (D-04, D-05).
3. **"Ini situs apa?"** Bila ada yang menjawab "aplikasi" atau "produk berlangganan" → D-02 belum sembuh.

---

## 12. Amandemen A-02 ke Build Contract

`09-BUILD-CONTRACT.md:84` menyatakan:

> `src/app.css`, `src/app.html`, `package.json`, `vite.config.js`, `svelte.config.js`,
> `src/routes/+layout.svelte`, `src/routes/+layout.js` **sudah selesai: jangan diubah siapa pun.**

Dokumen ini **membutuhkan** perubahan pada `app.css` dan `app.html`. Perubahannya diajukan sebagai amandemen
resmi, bukan penyimpangan diam-diam (US-R30 AC-2).

> **§12 seluruhnya DIGANTI** oleh `12-BUILD-CONTRACT-V2.md` §3.3(a) (daftar berkas WP-03) dan §3.4
> (daftar putih `app.css`/`app.html`). Tabel di bawah dipertahankan sebagai **rasional**, bukan sebagai
> daftar perubahan yang mengikat. Dua koreksi yang wajib diketahui: (a) daftar putih §3.4 doc 12
> **menambahkan** butir yang tidak ada di sini: `@utility numeric` diubah ke `var(--font-sans)`, dan
> selektor `h1…h4` dipersempit; (b) butir A-02.1 nomor 7 yang menyatakan `numeric` "tidak diubah"
> **DICABUT**: lihat §3.4 koreksi.

### A-02.1 · `src/app.css`: pemilik **WP-03**, satu paket kerja atomik

| # | Perubahan | Baris |
|--:|---|---|
| 1 | **Tambah** blok `@font-face` (3 keluarga) sebelum `@theme` | baru, di atas `:14` |
| 2 | **Ganti** `--font-display` → `'Fraunces', 'Instrument Serif', Georgia, serif` | `:103` |
| 3 | **Ganti** `--color-canvas: #f5f6f7` → `#f6f4f1` | `:98` |
| 4 | **Hapus** `body { background-image: radial-gradient(…) ×2 }` + `background-attachment: fixed` | `:129-132` |
| 5 | **Tambah** token `--rhythm-flush/tight/snug/base/loose` dan `--radius-photo: 2px` | dalam `@theme` |
| 6 | **Tambah** `@utility display-editorial`, `kicker`, `figure-number`, `keyline` | setelah `:234` |
| 7 | **Ubah** `@utility numeric` (`:219-224`) → `font-family: var(--font-sans)` **[KOREKSI: sebelumnya tertulis "tidak diubah"]** dan persempit selektor `h1…h4` (`:139-147`) agar `--font-display` tidak merambat ke zona ter-login | `:219-224`, `:139-147` |
| 8 | **Tidak diubah:** seluruh token warna brand/tier/ESG/rarity, skala `ink`, radius, shadow, `@utility card`, `card-hover`, `surface-soft`, **`label-micro`**, `sheen-champion`, animasi, dan `@layer base` selain butir 4 & 7 |: |

**Risiko yang harus disadari.** Butir 2 memindahkan **seluruh** `h1…h4` ke Fraunces di semua zona, karena
`app.css:140-147` sudah memakai `var(--font-display)`. Mitigasi wajib dalam paket yang sama: `PageHeader.svelte`
dan `KpiCard.svelte` memasang `font-sans` eksplisit (§3.4).

### A-02.2 · `src/app.html`: pemilik **WP-03**

| # | Perubahan | Baris | Wajib? |
|--:|---|---|---|
| 1 | **Hapus** `<link>` Google Fonts + dua `preconnect` (font sudah lokal) | `:14-19` | opsional |
| 2 | **Tambah** `<link rel="preload" as="font" type="font/woff2" crossorigin>` untuk Fraunces + Plus Jakarta | menggantikan `:14-19` | opsional |
| 3 | **Tambah** meta Open Graph: `og:title`, `og:description`, `og:image` → `/img/og-pfriends.jpg`, `og:type`, `twitter:card` | setelah `:13` | **wajib** |
| 4 | **Tidak diubah:** `lang="id"`, charset, viewport, `theme-color`, `%sveltekit.head%`, `%sveltekit.body%`, `data-sveltekit-preload-data` |: |: |

**Catatan.** Butir 1–2 opsional secara teknis: `@font-face` di `app.css` sudah cukup untuk memuat font lokal,
dan bila `app.html` sama sekali tidak boleh disentuh, akibatnya hanya dua permintaan CDN yang mubazir.
Butir 3 **tidak punya jalur alternatif**: tanpanya, tautan Pfriends yang dibagikan di WhatsApp (kanal utama
program, Hal 9 dokumen sumber) tampil tanpa gambar sama sekali.

### A-02.3 · Berkas baru di luar `src/`

```
static/favicon.svg
static/img/*.jpg                        (27 foto, manifest §5.1–§5.5)
static/img/CREDITS.md
static/fonts/*.woff2                    (3 berkas)
static/fonts/OFL-*.txt                  (3 berkas lisensi)
scripts/assets/fetch-photos.mjs
src/lib/data/photos.js
src/lib/data/photo-credits.json
src/lib/components/editorial/*.svelte   (8 komponen, §8: nama per doc 12 §2.13)
src/lib/components/editorial/view-model.js   (eventCardVM, storyVM: doc 12 §2.13)
```

Ditambahkan ke daftar berkas **WP-03** pada `12-BUILD-CONTRACT-V2.md` §3.3(a), yang menggantikan
`09-BUILD-CONTRACT.md` §4. Tidak ada satu pun yang bertabrakan dengan kepemilikan paket kerja lain.
`static/fonts/**` sudah dicantumkan di sana, sehingga §3.2 dokumen ini dapat dieksekusi tanpa melanggar
KP-2: dan daftar putih §3.4 doc 12 sudah mengizinkan blok `@font-face` di `app.css`.

### A-02.4 · Yang **tidak** diminta oleh dokumen ini

- Tidak ada paket npm baru: Fraunces dimuat sebagai aset statis, bukan dependensi.
- Tidak ada perubahan pada `package.json`, `vite.config.js`, `svelte.config.js`.
- Tidak ada perubahan pada `src/routes/+layout.svelte` maupun `+layout.js`.
- Tidak ada perubahan pada lapisan domain, infrastruktur, atau store: kecuali satu baris `cover:` di
  `src/routes/(public)/_view-model.js`, yang merupakan milik WP-6.

---

## Lampiran: ketertelusuran

| Butir dokumen ini | Menjawab | Sumber |
|---|---|---|
| §1 D-01…D-14 | Kritik "webnya terlalu AI" | Keputusan PO #6 |
| §2 P-1, §4, §5 | Foto asli berlisensi bebas, diunduh ke `static/img/` | US-R28 |
| §2 P-3/P-6, §3, §6, §7 | Redesign editorial: grid asimetris, tipografi berkarakter, kurangi kartu seragam & gradient blur | US-R29 · Keputusan PO #6 |
| §6 E2, §8.3–8.4 | Dampak & angka agregat level program di landing | Keputusan PO #1a · US-R20 |
| §6 E5, §7 | Blog/cerita komunitas yang sudah published | Keputusan PO #1b · US-R18 |
| §6 E4, §7.1, §8.5–8.6 | Kalender komunitas + daftar event; panel di sisi halaman blog | Keputusan PO #1c & #4 · US-R07, US-R09 |
| §6 E3, E6 | Gerakan bersama + profil dua komunitas (SOBI & Womenpreneur) | Keputusan PO #1d · US-R21 |
| §1 D-15, §6.8, §9, §11.1 | Larangan poin/tier/leaderboard/badge di zona publik | Keputusan PO #2 · US-R19 |
| §8, §9 | Terintegrasi dengan sistem yang ada, bukan halaman tempelan | Keputusan PO #7 · US-R31 AC-6 |
| §4.5, §10 | Kontras WCAG AA & aksesibilitas tetap terjaga | `08-DESIGN-SYSTEM.md` §0.1, §2 |
| §12 | SDLC terdokumentasi; amandemen resmi, bukan penyimpangan | Keputusan PO #7 · US-R30 AC-2 |
