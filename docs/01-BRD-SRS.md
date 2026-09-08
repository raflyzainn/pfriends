# BRD & SRS: Pfriends
### Microsite Community Connect Initiative: Divisi Corporate Secretary, Pertamina Foundation

| Atribut | Keterangan |
|---|---|
| Nama Produk | **Pfriends**: Microsite Komunitas Community Connect Initiative |
| Pemilik Produk | Divisi Corporate Secretary (Corsec): Pertamina Foundation |
| Co-brand | Danantara Indonesia · PERTAMINA |
| Dokumen | Business Requirements Document (BRD) + Software Requirements Specification (SRS) |
| Versi | 1.0 |
| Tanggal | 20 Juli 2026 |
| Status | Draft untuk review Divisi Corsec |
| Sumber Kebenaran | `docs/00-SOURCE-BRIEF.md` (ekstraksi 12 halaman `2026 Community Connect Initiative update as 29052026.pdf`) |
| Sifat Rilis | **Mockup / Prototipe fungsional**: tanpa backend produksi, arsitektur siap disambung API |

> **Catatan metodologis.** Seluruh angka pada dokumen ini (skor gamifikasi, ambang tier, persentase KPI) diambil **persis** dari dokumen sumber. Setiap pernyataan yang merupakan turunan analisis Business Analyst: dan bukan kutipan langsung dokumen sumber: ditandai dengan label *(turunan analisis)*.

---

## Daftar Isi

1. [Ringkasan Eksekutif](#1-ringkasan-eksekutif)
2. [Latar Belakang & Problem Statement](#2-latar-belakang--problem-statement)
3. [Tujuan Bisnis & Objective](#3-tujuan-bisnis--objective)
4. [Stakeholder Map](#4-stakeholder-map)
5. [Persona](#5-persona)
6. [User Stories](#6-user-stories)
7. [Use Case Utama](#7-use-case-utama)
8. [Functional Requirements](#8-functional-requirements-fr)
9. [Non-Functional Requirements](#9-non-functional-requirements-nfr)
10. [Requirement Traceability Matrix](#10-requirement-traceability-matrix-rtm)
11. [Scope MVP vs Future](#11-scope-mvp-vs-future)
12. [Asumsi, Batasan & Risiko](#12-asumsi-batasan--risiko)
13. [Glosarium](#13-glosarium)

---

## 1. Ringkasan Eksekutif

**Community Connect Initiative** adalah inisiatif strategis Divisi Corporate Secretary Pertamina Foundation untuk membangun **platform ekosistem** yang menghubungkan **alumni Beasiswa Sobat Bumi (SOBI) sebagai mitra muda/mentor** dengan **PFpreneur/Womenpreneur sebagai mitra sekaligus entitas bisnis binaan** Pertamina Foundation.

**Pfriends** adalah microsite yang menjadi "rumah digital" komunitas tersebut: diakses melalui *kotak biru* pada situs `pertaminafoundation.org`, dan berfungsi sebagai **instrumen kontrol Pertamina Foundation** atas komunitas yang dibangun. Kontrol yang dimaksud mencakup tiga hal spesifik sesuai dokumen sumber:

1. **Penyebaran informasi** (diseminasi terarah, bukan tercecer di grup WhatsApp);
2. **Tracking amplifikasi konten** (mengukur siapa membagikan apa, ke mana);
3. **Pengerjaan gamifikasi** (skor kontribusi, tier, dan recognition).

Landasan konseptual aktivitas komunitas adalah **Sense of Community Theory** (McMillan & Chavis, 1986): komunitas yang kuat terbentuk ketika anggota merasakan ikatan psikologis dan rasa memiliki terhadap komunitas. Gamifikasi pada Pfriends karenanya **bukan sekadar leaderboard**, melainkan mekanisme untuk mengubah *keanggotaan pasif* menjadi *kontribusi bermakna*: sejalan dengan prinsip eksplisit dokumen sumber: *"Points should reward meaningful contribution, not spammy activity."*

Ruang lingkup dokumen ini menghasilkan **46 user story** yang dikelompokkan ke dalam 6 pilar aktivitas + 1 kelompok fondasi lintas pilar, **12 use case utama**, **92 functional requirement** (FR-001 … FR-092), dan **32 non-functional requirement** (NFR-001 … NFR-032), seluruhnya tertelusur ke 5 KPI aktivitas, 3 KPI dampak, dan 3 KPI ESG pada halaman 6 dan 10 dokumen sumber.

---

## 2. Latar Belakang & Problem Statement

### 2.1 Konteks

Pertamina Foundation telah menyalurkan manfaat kepada ribuan penerima melalui program beasiswa (PFprestasi/Sobat Bumi) dan pemberdayaan UMKM (PFpreneur/Womenpreneur). Namun nilai dari relasi tersebut **berhenti pada saat program berakhir**. Aset relasional terbesar Pertamina Foundation: yaitu manusia yang pernah dibantunya: tidak dikelola sebagai ekosistem berkelanjutan.

### 2.2 Empat Problem Statement

#### PS-01: Fragmentasi Alumni

> *"Ribuan penerima Beasiswa Sobat Bumi yang telah lulus, namun interaksi pasca program cenderung menurun. Potensi SDM unggul ini belum terutilisasi sebagai duta energi atau mentor di ekosistem Pertamina."*: Hal. 2

**Dampak bisnis:** hilangnya kanal advokasi organik, hilangnya pipeline mentor internal, dan hilangnya bukti dampak sosial jangka panjang (SROI) karena jejak alumni tidak terekam.

| Aspek | Kondisi | Konsekuensi |
|---|---|---|
| Kurva interaksi | Menurun tajam pasca-kelulusan | Relasi mati suri, tidak dapat diaktivasi mendadak |
| Status utilisasi | Belum jadi duta energi / mentor | Aset SDM menganggur |
| Rekam jejak | Tidak terpusat | Tidak ada dasar untuk *TOP awardee dengan karir bagus* |

#### PS-02: Isolasi Womenpreneur

> *"Alumni PFpreneur merupakan UMKM yang masuk unggulan UMKM binaan PT Pertamina (Persero). Sering menghadapi kendala skalabilitas bisnis karena terbatasnya jaringan pemasaran, riset pasar, dan akses terhadap tenaga kerja ahli/digital."*: Hal. 2

**Dampak bisnis:** UMKM binaan berhenti tumbuh setelah pendampingan formal selesai; padahal di sisi lain terdapat alumni SOBI dengan kapabilitas digital/riset yang **belum dipertemukan** dengan kebutuhan itu. Inilah *supply–demand gap* internal yang menjadi justifikasi utama mempertemukan dua komunitas dalam satu platform.

| Kebutuhan Womenpreneur | Kapabilitas yang dimiliki alumni SOBI |
|---|---|
| Jaringan pemasaran | Jejaring sosial 25–500 orang per anggota |
| Riset pasar | Latar belakang akademik & riset |
| Tenaga kerja ahli/digital | Kompetensi digital lulusan muda |

#### PS-03: Silo Antar Pilar Program

> *"Program masih berjalan secara silo (terpisah secara fungsional) → target: Integrasi lintas pilar (PFprestasi × PFmuda × PFsains × PFlestari)"*: Hal. 3

**Dampak bisnis:** duplikasi aktivitas, biaya aktivasi berulang, dan ketidakmampuan menyusun narasi dampak terintegrasi. Penerima manfaat mengalami PF sebagai empat lembaga terpisah, bukan satu identitas.

#### PS-04: Platform Masih Berbasis WhatsApp & Media Sosial Umum

> *"Sebagian besar masih berbasis grup WhatsApp & sosial media umum"*: Hal. 3
> *"Aktivasi terbatas pada seremonial program berjalan."*: Hal. 3

**Dampak bisnis:** grup WhatsApp tidak menyediakan tiga hal yang justru menjadi tujuan inisiatif ini:

| Kebutuhan Kontrol PF | Tersedia di WA? | Konsekuensi |
|---|---|---|
| Penyebaran informasi terukur | Tidak: pesan tenggelam, tanpa metrik baca | Diseminasi tidak dapat dibuktikan |
| Tracking amplifikasi konten | Tidak: tidak ada jejak siapa membagikan ke mana | KPI amplifikasi 50% tidak terukur |
| Pengerjaan gamifikasi | Tidak: tidak ada sistem skor/tier | Tidak ada mekanisme recognition |
| Database terstruktur | Tidak: nomor telepon tanpa profil | KPI pendataan 75% tidak terverifikasi |

**Ringkasan problem statement:** Pertamina Foundation memiliki komunitas penerima manfaat yang besar namun **tidak terdata, tidak terhubung lintas pilar, tidak teraktivasi di luar seremoni, dan tidak terukur kontribusinya**: karena kanal yang digunakan (grup WhatsApp) secara struktural tidak mampu menyediakan pendataan, pelacakan amplifikasi, maupun gamifikasi.

### 2.3 Posisi Pfriends terhadap Problem

*(turunan analisis)*

| Problem | Respons Pfriends |
|---|---|
| PS-01 Fragmentasi Alumni | Profil alumni persisten, jalur karir terekam, tier Champion membuka undangan mentor/speaker |
| PS-02 Isolasi Womenpreneur | Direktori UMKM, etalase produk, permintaan kolaborasi/mentoring lintas komunitas |
| PS-03 Silo Antar Pilar | Satu identitas member dengan atribut pilar (PFprestasi/PFmuda/PFsains/PFlestari), kalender & movement lintas pilar |
| PS-04 Platform WA | Microsite sebagai *system of record*; WA tetap dipertahankan sebagai *broadcast-first channel* (Hal. 9), Pfriends sebagai lapisan pendataan, tracking, dan gamifikasi |

> **Prinsip arsitektur kanal (Hal. 9):** *"WA + microsite → Broadcast-first channel + pilot circle + story bank."* Pfriends **tidak menggantikan** WhatsApp. WhatsApp tetap menjadi kanal jangkauan; Pfriends menjadi kanal bukti.

---

## 3. Tujuan Bisnis & Objective

### 3.1 Objective Resmi (Hal. 4)

> *"Mengelola komunitas penerima manfaat Pertamina Foundation dan komunitas eksternal dengan lebih terarah, dan memudahkan diseminasi + amplifikasi informasi hal baik terkait Pertamina dan Pertamina Foundation."*

### 3.2 Business Goals → Business Objectives → KPI

| ID | Business Goal | Business Objective | KPI Terkait |
|---|---|---|---|
| BG-01 | Komunitas penerima manfaat terdata dan terkelola terarah | Membangun basis data komunitas tunggal yang tervalidasi lintas pilar | KPI-01 |
| BG-02 | Diseminasi informasi Pertamina/PF menjadi rutin dan terukur | Menjadikan microsite kanal resmi distribusi konten dengan ritme terjadwal | KPI-02, KPI-03 |
| BG-03 | Komunitas menjadi *organic brand amplifier* | Mendorong separuh anggota melakukan amplifikasi konten ke jaringan pribadi/publik | KPI-04, KPI-06, KPI-07, KPI-08 |
| BG-04 | Engagement melampaui seremoni program | Menyelenggarakan aktivitas engagement berkelanjutan (upskilling, sharing, movement) | KPI-05 |
| BG-05 | Kontribusi anggota terukur dan diapresiasi | Menerapkan *stage-based activation and contribution scoring* (Hal. 9) | KPI-04, KPI-05 |
| BG-06 | Program terbukti menciptakan nilai, bukan sekadar berjalan | Menghasilkan ESG evidence yang terdokumentasi dan dapat diaudit | KPI-ESG-01/02/03 |

### 3.3 Definisi KPI (Hal. 6: Key Objectives)

| ID KPI | Pernyataan KPI (persis dokumen sumber) | Satuan | Target | Periode | Sumber Data di Pfriends |
|---|---|---|---|---|---|
| **KPI-01** | 75% dari penerima manfaat Pertamina Foundation terdata dalam komunitas Pfriends | % | **75%** | Kumulatif | Rasio member terverifikasi ÷ master data penerima manfaat |
| **KPI-02** | 1–2 konten Pertamina dan/atau PF terdiseminasi di forum komunitas Pfriends dalam satu bulan | konten | **1–2** | Bulanan | Jumlah konten berstatus *published* |
| **KPI-03** | Melakukan diseminasi informasi ke komunitas minimal 2 kali dalam satu bulan | kali | **≥ 2** | Bulanan | Jumlah kampanye broadcast terkirim |
| **KPI-04** | 50% anggota komunitas ikut melakukan amplifikasi informasi Pertamina dan/atau PF | % | **50%** | Bulanan | Anggota dengan ≥1 aksi amplifikasi terverifikasi ÷ total anggota aktif |
| **KPI-05** | 2 aktivitas engagement komunitas terlaksana | aktivitas | **2** | Per periode | Event/movement berstatus *completed* |

### 3.4 Definisi KPI Dampak (Hal. 6: Dampak Inisiatif)

| ID KPI | Pernyataan | Angka Referensi | Implikasi Sistem |
|---|---|---|---|
| **KPI-06** | 1 anggota komunitas rata-rata memiliki 25–500 jaringan sosial (offline + online) | **25–500** per anggota | Sistem menyimpan estimasi jangkauan per anggota untuk kalkulasi potensi |
| **KPI-07** | Earned media dari komunitas menurunkan kebutuhan paid media hingga 5–20% | **5–20%** | Dashboard menampilkan estimasi konversi reputasi |
| **KPI-08** | Engagement rate konten yang dibagikan komunitas 2–3× lebih tinggi dibanding akun brand | **2–3×** | Dashboard membandingkan performa amplifikasi komunitas vs baseline brand |

> **Proyeksi jangkauan organik (Hal. 6):** komunitas aktif 100 orang → potensi jangkauan organik **250 – 50 ribu orang** tanpa biaya iklan.
> **Kesimpulan dokumen sumber:** *"Artinya: komunitas = organic brand amplifier."*

### 3.5 Definisi KPI ESG (Hal. 10)

> *"KPI Aktivitas membuktikan bahwa program berjalan. KPI ESG membuktikan bahwa program menciptakan nilai."*

| ID KPI | Pilar ESG | Cakupan | Bukti / Metrik |
|---|---|---|---|
| **KPI-ESG-01** | Environmental | Climate literacy, clean energy campaign, waste reduction, local environmental action | participants, locations, action reports, photos, outcomes |
| **KPI-ESG-02** | Social | Scholarship alumni, womenpreneur growth, mentoring, upskilling, social mobility | alumni progress, mentoring hours, business growth, event completion |
| **KPI-ESG-03** | Governance | Consent, approval, data quality, evidence integrity, escalation protocol | consent records, approved stories, metadata, audit trail, issue log |

**Ambang minimum ESG evidence (Hal. 12):** `Documented activity + outcome note + ESG/SDG tag + evidence source`.

### 3.6 Strategic Enhancement (Hal. 9) → Implikasi Produk

| Internal Direction | Strategic Enhancement | Implikasi pada Pfriends *(turunan analisis)* |
|---|---|---|
| Community Connect Initiative | Digital Community Ecosystem architecture | Model domain berbasis entitas (Member, Content, Contribution, Event, Story, Movement) |
| WA + microsite | Broadcast-first channel + pilot circle + story bank | Modul Broadcast, Chapter (pilot circle), dan Story Bank menjadi modul kelas satu |
| Gamification and recognition | Stage-Based Activation and contribution scoring | Tier bertingkat 25/50/100/150 poin dengan benefit berbeda per tahap |
| Amplification KPI | Engagement KPI + ESG evidence KPI | Dua dashboard terpisah: KPI Aktivitas dan KPI ESG |
| SROI dashboard | Bukti pipeline before dashboard | **Pipeline bukti dibangun lebih dulu**; dashboard SROI adalah fase lanjutan, bukan MVP |

---

## 4. Stakeholder Map

### 4.1 Daftar Stakeholder

| ID | Stakeholder | Kategori | Peran terhadap Pfriends | Kepentingan Utama |
|---|---|---|---|---|
| SH-01 | **Divisi Corporate Secretary (Corsec) PF** | Internal: Pemilik | Pemilik inisiatif, penentu arah konten & kebijakan komunitas, penerima laporan KPI | Kontrol narasi, pencapaian KPI, bukti reputasi |
| SH-02 | **Manajemen / Direksi Pertamina Foundation** | Internal: Sponsor | Penyetuju anggaran & arah strategis, konsumen dashboard SROI/ESG | Bukti dampak, efisiensi biaya komunikasi |
| SH-03 | **Fungsi IT Pertamina Foundation** | Internal: Pelaksana teknis | Integrasi microsite ke `pertaminafoundation.org`, hosting, keamanan, integrasi data | Kelayakan teknis, keamanan, maintainability |
| SH-04 | **Admin / PIC Komunitas PF** | Internal: Operator harian | Kurasi konten, verifikasi bukti amplifikasi, moderasi story, validasi member | Beban kerja operasional wajar, alat kerja jelas |
| SH-05 | **Alumni Beasiswa Sobat Bumi (SOBI)** | Eksternal: Member inti | Konsumen & amplifier konten, calon mentor/speaker, kontributor story | Manfaat nyata, jejaring, pengakuan, karir |
| SH-06 | **PFpreneur / Womenpreneur** | Eksternal: Member inti | Pelaku UMKM binaan, penerima manfaat jejaring & mentoring | Akses pasar, riset, tenaga ahli digital |
| SH-07 | **Mentor / Fasilitator / Narasumber** | Eksternal & Internal | Pengisi sharing session, upskilling, pendamping movement | Kemudahan penjadwalan, apresiasi, dampak |
| SH-08 | **Publik / Calon Member / Media** | Eksternal | Pembaca konten publik, calon pendaftar, penerima amplifikasi | Informasi kredibel dan mudah diakses |
| SH-09 | **PT Pertamina (Persero): Fungsi Komunikasi & TJSL** | Eksternal Grup | Pemilik agenda korporat yang diamplifikasi, pengguna UMKM binaan | Konsistensi pesan korporat, ESG korporat |
| SH-10 | **Danantara Indonesia** | Eksternal: Co-brand | Co-branding inisiatif | Visibilitas dan kesesuaian identitas |

### 4.2 Matriks Power–Interest

| | **Interest Rendah** | **Interest Tinggi** |
|---|---|---|
| **Power Tinggi** | SH-10 Danantara *(keep satisfied)* | **SH-01 Corsec PF**, SH-02 Manajemen PF, SH-03 Fungsi IT *(manage closely)* |
| **Power Rendah** | SH-08 Publik/Media *(monitor)* | SH-04 Admin/PIC, SH-05 Alumni SOBI, SH-06 PFpreneur, SH-07 Mentor, SH-09 Pertamina TJSL *(keep informed)* |

### 4.3 Peran Sistem (RBAC) *(turunan analisis)*

| Role | Pemetaan Stakeholder | Kewenangan Inti |
|---|---|---|
| `PUBLIC` | SH-08 | Melihat halaman publik, konten publik, story terpublikasi, formulir pendaftaran |
| `MEMBER_SOBI` | SH-05 | Profil, konsumsi konten, amplifikasi, event, story, poin, redeem |
| `MEMBER_PRENEUR` | SH-06 | Seluruh hak `MEMBER_SOBI` + profil usaha & etalase produk |
| `MENTOR` | SH-07 | Seluruh hak member + membuka slot mentoring & mengisi sesi |
| `ADMIN_KOMUNITAS` | SH-04 | Kurasi konten, verifikasi bukti, moderasi story, kelola event & chapter, validasi member |
| `CORSEC_MANAGER` | SH-01, SH-02 | Seluruh hak admin + persetujuan publikasi, dashboard KPI & ESG, ekspor laporan |

---

## 5. Persona

### Persona 1: Alumni Beasiswa Sobat Bumi yang Sudah Bekerja

| Atribut | Detail |
|---|---|
| **Nama** | **Raka Dwi Nugraha** |
| **Umur** | 29 tahun |
| **Domisili** | Jakarta Selatan (asal Cilacap, Jawa Tengah) |
| **Pekerjaan** | *Process Engineer* di perusahaan energi swasta, 5 tahun pengalaman |
| **Latar Belakang** | Penerima Beasiswa Sobat Bumi angkatan PF-10, lulus S1 Teknik Kimia. Selama kuliah aktif di komunitas lingkungan kampus dan pernah menjadi ketua panitia aksi bersih pantai. Setelah lulus, kontak dengan PF praktis terputus kecuali sesekali muncul di grup WhatsApp angkatan yang kini sepi. |
| **Perangkat & Kebiasaan Digital** | Android kelas menengah, kuota data terbatas di jam kerja. Aktif LinkedIn dan Instagram. Membuka WhatsApp puluhan kali sehari, membuka email pribadi 2–3 kali seminggu. |
| **Goal** | 1) Tetap terhubung dengan jaringan alumni untuk peluang profesional. 2) Berkontribusi balik kepada adik tingkat sebagai mentor. 3) Mendapat pengakuan formal yang dapat dicantumkan di profil profesional. |
| **Frustration** | • Grup WhatsApp angkatan hanya ramai saat ada kabar duka atau undangan seremoni. • Tidak tahu ada kebutuhan mentor di PF: tidak pernah ditawari. • Merasa "sudah lulus, sudah selesai" karena tidak ada peran yang jelas untuk alumni. • Waktu sangat terbatas; tidak sanggup komitmen besar. |
| **Trigger Keterlibatan** | Undangan personal yang menyebut namanya dan pencapaiannya; kesempatan menjadi *speaker* pada sharing session yang menambah kredibilitas profesional; badge/tier yang terlihat oleh sesama alumni; komitmen ringan berdurasi jelas (misalnya sesi 60 menit daring). |
| **Kontribusi yang Diharapkan** | Amplifikasi konten ke LinkedIn (**8 pts**), menjadi *speaker/mentor* (**30 pts**), menjawab pertanyaan bermanfaat (**15 pts**) |
| **Skenario Sukses** | Raka mencapai **150 pts (Champion)** dan menerima undangan sebagai *regional champion* untuk chapter Jabodetabek. |
| **Kutipan** | *"Saya mau bantu, tapi jangan sampai ganggu jam kerja. Kalau jelas kapan dan berapa lama, saya ikut."* |

---

### Persona 2: Fresh Graduate Alumni Beasiswa

| Atribut | Detail |
|---|---|
| **Nama** | **Salsabila Putri Ramadhani** |
| **Umur** | 23 tahun |
| **Domisili** | Yogyakarta |
| **Pekerjaan** | Baru lulus S1 Ilmu Komunikasi, sedang mencari kerja penuh waktu sambil menjadi *freelance content creator* |
| **Latar Belakang** | Penerima Beasiswa Sobat Bumi angkatan PF-12, baru diwisuda 4 bulan lalu. Masih merasa sangat dekat secara emosional dengan Pertamina Foundation. Aktif membuat konten video pendek tentang isu keberlanjutan di akun pribadinya (3.400 pengikut). |
| **Perangkat & Kebiasaan Digital** | Sepenuhnya *mobile-first*. Instagram dan TikTok setiap hari, WhatsApp sebagai kanal utama. Nyaris tidak pernah membuka laptop untuk urusan komunitas. |
| **Goal** | 1) Membangun portofolio dan relasi profesional. 2) Tetap merasa menjadi bagian dari "keluarga" PF. 3) Mendapat akses pelatihan/upskilling gratis. 4) Mendapat referensi atau eksposur yang membantu melamar kerja. |
| **Frustration** | • Merasa kehilangan identitas dan komunitas setelah wisuda. • Tidak tahu harus ke mana untuk tetap terlibat. • Informasi program tersebar di banyak grup dan mudah terlewat. • Merasa terlalu junior untuk dianggap berkontribusi. |
| **Trigger Keterlibatan** | Progres yang terlihat (poin naik, tier berubah warna); tantangan berdurasi pendek yang menyenangkan; kesempatan tampil di kanal resmi PF (*featured*); pelatihan gratis yang relevan dengan pencarian kerja; notifikasi ringan melalui WhatsApp. |
| **Kontribusi yang Diharapkan** | Membaca broadcast (**1 pt**), reaksi/balasan CTA (**2 pts**), amplifikasi ke media sosial publik (**8 pts**), submit story (**10 pts**), hadir sesi daring (**15 pts**) |
| **Skenario Sukses** | Salsabila mencapai **100 pts (Featured Candidate)**, story-nya lolos validasi PF dan tayang di kanal resmi: menjadi bahan portofolio pencarian kerja. |
| **Kutipan** | *"Aku masih ngerasa anak PF, cuma sekarang enggak tahu harus ngapain. Kasih aku sesuatu buat dikerjain."* |

---

### Persona 3: Pelaku UMKM PFpreneur / Womenpreneur

| Atribut | Detail |
|---|---|
| **Nama** | **Ibu Nurhayati Simanjuntak** |
| **Umur** | 42 tahun |
| **Domisili** | Medan, Sumatera Utara |
| **Usaha** | "Dapur Nurhayati": produksi bumbu masak kemasan & rendang siap saji. 6 karyawan perempuan, omzet ± Rp 45 juta/bulan |
| **Latar Belakang** | Alumni program PFpreneur/Womenpreneur, termasuk UMKM unggulan binaan PT Pertamina (Persero). Telah mengikuti pelatihan pembukuan dan sertifikasi halal melalui program PF. Pendampingan formal berakhir 1 tahun lalu. |
| **Perangkat & Kebiasaan Digital** | Satu ponsel Android untuk usaha dan pribadi. WhatsApp Business adalah pusat operasional (pesanan, pembayaran, koordinasi karyawan). Instagram usaha dikelola seadanya. Kurang nyaman dengan aplikasi baru yang banyak menu. |
| **Goal** | 1) Menaikkan skala penjualan ke luar Sumatera Utara. 2) Memahami preferensi pasar dan kemasan yang menjual. 3) Mendapat bantuan tenaga digital untuk konten dan marketplace. 4) Masuk ke rantai pengadaan Pertamina (contoh: pengadaan souvenir). |
| **Frustration** | • Jaringan pemasaran mentok di lingkaran lokal. • Tidak mampu membayar konsultan riset pasar atau *digital marketer*. • Setelah pendampingan selesai, tidak ada tempat bertanya. • Takut teknologi baru: khawatir salah pencet dan data usaha hilang. |
| **Trigger Keterlibatan** | Bukti nyata bahwa platform mendatangkan pesanan atau eksposur; alur sesederhana WhatsApp; ajakan personal dari admin/PIC yang sudah dikenal; kesempatan produknya dipajang di kanal resmi PF; adanya alumni SOBI yang bersedia membantu digitalisasi. |
| **Kontribusi yang Diharapkan** | Melengkapi profil usaha & etalase produk, submit story pertumbuhan usaha (**10 pts**), hadir sesi upskilling (**15 pts**), amplifikasi konten ke jaringan WA (**5 pts**) |
| **Skenario Sukses** | Ibu Nurhayati terhubung dengan alumni SOBI yang membantu menata etalase digital; profil usahanya menjadi bahan ESG evidence pilar *Social* (business growth). |
| **Kutipan** | *"Kalau caranya seperti WhatsApp, saya bisa. Tapi kalau harus install macam-macam, saya minta tolong anak saya dulu."* |

---

### Persona 4: Admin / PIC Komunitas Pertamina Foundation

| Atribut | Detail |
|---|---|
| **Nama** | **Fajar Hidayatullah** |
| **Umur** | 31 tahun |
| **Domisili** | Jakarta Pusat |
| **Jabatan** | Staf Divisi Corporate Secretary: PIC Community Connect Initiative |
| **Latar Belakang** | Bertanggung jawab atas operasional harian komunitas: memasukkan anggota ke WA Komunitas secara bertahap, menyiapkan konten diseminasi, dan menyusun laporan pencapaian KPI untuk manajemen. Saat ini bekerja dengan kombinasi spreadsheet, grup WhatsApp, dan folder cloud. |
| **Perangkat & Kebiasaan Digital** | Laptop kantor sebagai alat kerja utama; ponsel untuk moderasi cepat di luar jam kerja. Mahir spreadsheet, bukan teknisi. |
| **Goal** | 1) Membuktikan pencapaian 5 KPI dengan data, bukan estimasi. 2) Mengurangi kerja manual rekapitulasi. 3) Menjaga agar tidak ada konten/story bermasalah tayang atas nama PF. 4) Menyusun laporan bulanan dengan cepat. |
| **Frustration** | • Menghitung "50% anggota melakukan amplifikasi" secara manual nyaris mustahil: bukti hanya berupa tangkapan layar berserakan. • Data penerima manfaat tersebar di beberapa file dan tidak konsisten. • Tidak ada jejak audit ketika manajemen menanyakan dasar sebuah publikasi. • Beban moderasi meningkat seiring jumlah anggota, tanpa tambahan orang. |
| **Trigger Keterlibatan** | Dashboard yang langsung menjawab pertanyaan manajemen; antrean verifikasi yang terstruktur dan dapat diselesaikan dalam batch; ekspor laporan satu klik; jejak audit otomatis. |
| **Kebutuhan Sistem Utama** | Konsol admin, antrean verifikasi bukti amplifikasi, moderasi story dengan checklist consent, dashboard KPI real-time, ekspor ESG evidence |
| **Skenario Sukses** | Fajar menutup laporan bulanan dalam 30 menit dengan angka KPI yang tertelusur ke bukti individual. |
| **Kutipan** | *"Manajemen tanya angkanya dari mana. Saya butuh sistem yang bisa saya tunjuk, bukan folder screenshot."* |

---

### 5.5 Ringkasan Kebutuhan Lintas Persona

| Kebutuhan | Raka | Salsabila | Nurhayati | Fajar |
|---|:--:|:--:|:--:|:--:|
| Mobile-first, ringan | ● | ●●● | ●●● | ● |
| Progres & pengakuan terlihat | ●● | ●●● | ● |: |
| Komitmen berdurasi jelas | ●●● | ● | ●● |: |
| Manfaat ekonomi langsung | ● | ●● | ●●● |: |
| Bukti & jejak audit |: |: |: | ●●● |
| Notifikasi via WhatsApp | ●● | ●●● | ●●● | ● |

---

## 6. User Stories

**Format:** `Sebagai <peran>, saya ingin <kebutuhan>, agar <manfaat>.`
**Acceptance Criteria:** format Given / When / Then.
**Prioritas:** MoSCoW: **M** (Must), **S** (Should), **C** (Could), **W** (Won't/Future).

**Rekapitulasi:**

| Pilar | Rentang ID | Jumlah |
|---|---|---:|
| 01: Open Community Ecosystem | US-001 … US-007 | 7 |
| 02: Kalender Komunitas | US-008 … US-013 | 6 |
| 03: Movement-Based Program | US-014 … US-019 | 6 |
| 04: Diseminasi & Amplifikasi Informasi | US-020 … US-026 | 7 |
| 05: Recognition & Gamifikasi | US-027 … US-034 | 8 |
| 06: Community Journalism | US-035 … US-040 | 6 |
| 00: Fondasi Lintas Pilar (Governance & Admin) | US-041 … US-046 | 6 |
| **Total** | | **46** |

---

### Pilar 01: Open Community Ecosystem
> *Kanal komunikasi melalui microsite; Pendaftaran; Rules keanggotaan dan manfaat* (Hal. 5)

#### US-001: Landing Page Microsite Pfriends `M`
**Sebagai** pengunjung publik / penerima manfaat PF,
**saya ingin** membuka microsite Pfriends dari kotak biru di `pertaminafoundation.org`,
**agar** saya memahami apa itu komunitas Pfriends dan bagaimana bergabung.

| # | Acceptance Criteria |
|---|---|
| AC-1 | **Given** saya pengunjung anonim, **When** saya membuka halaman utama Pfriends, **Then** sistem menampilkan penjelasan inisiatif, dua komunitas utama (Sobat Bumi Indonesia & Womenpreneur), dan tombol ajakan mendaftar. |
| AC-2 | **Given** saya membuka dari ponsel, **When** halaman dimuat, **Then** seluruh konten terbaca tanpa *horizontal scroll* pada lebar layar 360 px. |
| AC-3 | **Given** halaman utama tampil, **When** saya menggulir, **Then** saya melihat ringkasan 6 pilar aktivitas komunitas. |

#### US-002: Pendaftaran Anggota Baru `M`
**Sebagai** penerima manfaat PF (alumni SOBI atau PFpreneur),
**saya ingin** mendaftar menjadi anggota Pfriends melalui formulir daring,
**agar** saya resmi terdata dalam komunitas.

| # | Acceptance Criteria |
|---|---|
| AC-1 | **Given** saya di halaman pendaftaran, **When** saya mengisi nama, nomor WhatsApp, email, jenis komunitas (SOBI/PFpreneur), pilar program, dan angkatan/batch, **Then** sistem menerima pendaftaran dengan status `MENUNGGU_VERIFIKASI`. |
| AC-2 | **Given** saya mengisi formulir, **When** saya belum mencentang persetujuan pengolahan data pribadi, **Then** tombol kirim tetap nonaktif dan sistem menampilkan alasan. |
| AC-3 | **Given** nomor WhatsApp saya sudah terdaftar, **When** saya mengirim formulir, **Then** sistem menolak dengan pesan bahwa akun sudah ada beserta arahan masuk. |
| AC-4 | **Given** pendaftaran berhasil, **When** proses selesai, **Then** sistem menampilkan halaman konfirmasi berisi langkah berikutnya dan tautan bergabung ke WA Komunitas. |

#### US-003: Verifikasi Keanggotaan oleh Admin `M`
**Sebagai** admin komunitas PF,
**saya ingin** memverifikasi pendaftar terhadap master data penerima manfaat,
**agar** hanya penerima manfaat sah yang menjadi anggota dan angka KPI-01 dapat dipercaya.

| # | Acceptance Criteria |
|---|---|
| AC-1 | **Given** terdapat pendaftar berstatus `MENUNGGU_VERIFIKASI`, **When** saya membuka antrean verifikasi, **Then** sistem menampilkan daftar beserta hasil pencocokan otomatis terhadap master data. |
| AC-2 | **Given** data pendaftar cocok, **When** saya menekan Setujui, **Then** status berubah menjadi `AKTIF` dan anggota tercatat dalam perhitungan KPI-01. |
| AC-3 | **Given** data tidak cocok, **When** saya menekan Tolak dengan alasan, **Then** status berubah menjadi `DITOLAK` dan alasan tersimpan pada jejak audit. |

#### US-004: Halaman Rules Keanggotaan & Manfaat `M`
**Sebagai** anggota komunitas,
**saya ingin** membaca aturan keanggotaan dan daftar manfaat,
**agar** saya memahami hak, kewajiban, dan apa yang saya peroleh.

| # | Acceptance Criteria |
|---|---|
| AC-1 | **Given** saya anggota aktif, **When** saya membuka halaman Rules & Manfaat, **Then** sistem menampilkan aturan keanggotaan, kode etik, dan tabel manfaat per tier. |
| AC-2 | **Given** halaman tampil, **When** saya membaca bagian manfaat, **Then** benefit tiap tier ditampilkan sesuai ketentuan: 25 pts Active Member, 50 pts Contributor, 100 pts Featured Candidate, 150 pts Champion. |

#### US-005: Profil Anggota `M`
**Sebagai** anggota komunitas,
**saya ingin** memiliki dan mengelola halaman profil,
**agar** identitas, pilar program, dan kontribusi saya terekam.

| # | Acceptance Criteria |
|---|---|
| AC-1 | **Given** saya anggota aktif, **When** saya membuka profil, **Then** sistem menampilkan nama, foto, komunitas, pilar, angkatan, total poin, tier, dan riwayat kontribusi. |
| AC-2 | **Given** saya menyunting profil, **When** saya menyimpan perubahan, **Then** data tersimpan dan tercatat pada jejak audit. |
| AC-3 | **Given** saya mengatur visibilitas profil, **When** saya memilih *privat*, **Then** profil saya tidak muncul di direktori publik. |

#### US-006: Profil Usaha untuk PFpreneur `M`
**Sebagai** pelaku UMKM PFpreneur/Womenpreneur,
**saya ingin** melengkapi profil usaha dan etalase produk,
**agar** usaha saya dikenal dan berpeluang masuk jaringan pemasaran serta pengadaan Pertamina.

| # | Acceptance Criteria |
|---|---|
| AC-1 | **Given** saya anggota berjenis PFpreneur, **When** saya membuka profil, **Then** tersedia bagian tambahan: nama usaha, kategori, lokasi, deskripsi, kontak, dan hingga 5 produk. |
| AC-2 | **Given** profil usaha lengkap, **When** anggota lain membuka direktori UMKM, **Then** usaha saya tampil beserta kategori dan lokasi. |
| AC-3 | **Given** saya mengunggah foto produk, **When** ukuran berkas melebihi batas, **Then** sistem menolak dengan pesan jelas dan menyarankan kompresi. |

#### US-007: Direktori Anggota & Pencarian Lintas Pilar `S`
**Sebagai** anggota komunitas,
**saya ingin** mencari anggota lain berdasarkan pilar, keahlian, atau lokasi,
**agar** silo antar pilar terpecah dan kolaborasi lintas program terjadi.

| # | Acceptance Criteria |
|---|---|
| AC-1 | **Given** saya anggota aktif, **When** saya membuka direktori dan memfilter berdasarkan pilar (PFprestasi/PFmuda/PFsains/PFlestari), **Then** sistem menampilkan anggota yang sesuai. |
| AC-2 | **Given** saya mencari kata kunci keahlian, **When** hasil ditemukan, **Then** sistem menampilkan nama, tier, komunitas, dan keahlian anggota. |
| AC-3 | **Given** anggota memilih profil privat, **When** saya menelusuri direktori, **Then** anggota tersebut tidak muncul dalam hasil. |

---

### Pilar 02: Kalender Komunitas
> *Kalender kegiatan: upskilling, pertemuan komunitas, sharing session; Pembagian chapter komunitas* (Hal. 5)

#### US-008: Melihat Kalender Kegiatan `M`
**Sebagai** anggota komunitas,
**saya ingin** melihat kalender kegiatan komunitas,
**agar** saya tidak melewatkan upskilling, pertemuan, dan sharing session.

| # | Acceptance Criteria |
|---|---|
| AC-1 | **Given** saya anggota aktif, **When** saya membuka Kalender, **Then** sistem menampilkan kegiatan mendatang berurut tanggal beserta jenis kegiatan. |
| AC-2 | **Given** kalender tampil, **When** saya memfilter berdasarkan jenis (upskilling / pertemuan komunitas / sharing session), **Then** hanya kegiatan sesuai jenis yang tampil. |
| AC-3 | **Given** saya membuka dari ponsel, **When** kalender dimuat, **Then** tampilan beralih ke daftar vertikal yang dapat digulir. |

#### US-009: Detail & Pendaftaran Kegiatan `M`
**Sebagai** anggota komunitas,
**saya ingin** mendaftar pada sebuah kegiatan,
**agar** tempat saya terjamin dan panitia mengetahui jumlah peserta.

| # | Acceptance Criteria |
|---|---|
| AC-1 | **Given** kegiatan berstatus `TERBUKA`, **When** saya menekan Daftar, **Then** sistem mencatat pendaftaran dan menampilkan status `TERDAFTAR`. |
| AC-2 | **Given** kuota kegiatan penuh, **When** saya menekan Daftar, **Then** sistem menawarkan daftar tunggu. |
| AC-3 | **Given** saya sudah terdaftar, **When** saya membuka detail kegiatan, **Then** tersedia opsi membatalkan pendaftaran sebelum tenggat. |

#### US-010: Pencatatan Kehadiran Sesi Daring `M`
**Sebagai** anggota komunitas,
**saya ingin** kehadiran saya pada sesi daring tercatat,
**agar** saya memperoleh 15 poin sesuai skema kontribusi.

| # | Acceptance Criteria |
|---|---|
| AC-1 | **Given** saya terdaftar pada sesi daring, **When** saya melakukan konfirmasi kehadiran menggunakan kode sesi, **Then** sistem mencatat kehadiran dan memberikan **15 pts**. |
| AC-2 | **Given** saya sudah mengonfirmasi kehadiran pada sesi tersebut, **When** saya mencoba lagi, **Then** sistem menolak dan poin tidak bertambah. |
| AC-3 | **Given** sesi telah berakhir lebih dari batas waktu klaim, **When** saya mencoba konfirmasi, **Then** sistem menolak dengan pesan bahwa masa klaim telah lewat. |

#### US-011: Bergabung ke Chapter Komunitas `M`
**Sebagai** anggota komunitas,
**saya ingin** bergabung ke chapter sesuai wilayah atau minat,
**agar** saya berinteraksi dalam lingkup yang lebih relevan dan terasa dekat.

| # | Acceptance Criteria |
|---|---|
| AC-1 | **Given** saya anggota aktif, **When** saya membuka daftar chapter, **Then** sistem menampilkan chapter beserta wilayah, jumlah anggota, dan penanggung jawab. |
| AC-2 | **Given** saya memilih sebuah chapter, **When** saya menekan Gabung, **Then** keanggotaan chapter tercatat pada profil saya. |
| AC-3 | **Given** saya telah tergabung, **When** saya membuka Kalender, **Then** kegiatan chapter saya ditandai secara khusus. |

#### US-012: Admin Mengelola Kegiatan `M`
**Sebagai** admin komunitas PF,
**saya ingin** membuat dan mengelola kegiatan pada kalender,
**agar** target 2 aktivitas engagement komunitas terlaksana dapat dipenuhi dan dibuktikan.

| # | Acceptance Criteria |
|---|---|
| AC-1 | **Given** saya admin, **When** saya membuat kegiatan dengan judul, jenis, tanggal, kuota, chapter, dan narasumber, **Then** kegiatan tersimpan berstatus `TERBUKA`. |
| AC-2 | **Given** kegiatan telah berlangsung, **When** saya menandai `SELESAI` dan mengisi jumlah peserta serta catatan hasil, **Then** kegiatan dihitung sebagai aktivitas engagement pada KPI-05. |
| AC-3 | **Given** kegiatan berstatus `SELESAI`, **When** saya membuka detailnya, **Then** tersedia opsi melampirkan bukti (foto/laporan) untuk ESG evidence. |

#### US-013: Pengingat Kegiatan `S`
**Sebagai** anggota komunitas,
**saya ingin** menerima pengingat menjelang kegiatan yang saya ikuti,
**agar** saya tidak lupa hadir.

| # | Acceptance Criteria |
|---|---|
| AC-1 | **Given** saya terdaftar pada kegiatan, **When** waktu kegiatan kurang dari 24 jam, **Then** sistem menampilkan pengingat pada dasbor saya. |
| AC-2 | **Given** pengingat tampil, **When** saya menekan Tambah ke Kalender, **Then** sistem menyediakan berkas kalender (.ics) untuk diunduh. |

---

### Pilar 03: Movement-Based Program
> *Menginisiasi gerakan bersama selaras fokus keberlanjutan Pertamina: aksi lingkungan, edukasi masyarakat, pemberdayaan ekonomi* (Hal. 5)

#### US-014: Katalog Gerakan Bersama `M`
**Sebagai** anggota komunitas,
**saya ingin** melihat daftar gerakan bersama yang sedang berjalan,
**agar** saya dapat memilih gerakan yang sesuai minat dan lokasi saya.

| # | Acceptance Criteria |
|---|---|
| AC-1 | **Given** saya anggota aktif, **When** saya membuka halaman Gerakan, **Then** sistem menampilkan gerakan aktif beserta kategori: aksi lingkungan, edukasi masyarakat, atau pemberdayaan ekonomi. |
| AC-2 | **Given** daftar tampil, **When** saya memfilter berdasarkan kategori atau wilayah, **Then** hanya gerakan sesuai kriteria yang tampil. |
| AC-3 | **Given** saya membuka detail gerakan, **When** halaman dimuat, **Then** sistem menampilkan tujuan, periode, penanggung jawab, jumlah partisipan, dan tag ESG/SDG. |

#### US-015: Bergabung dalam Gerakan `M`
**Sebagai** anggota komunitas,
**saya ingin** mendaftarkan diri pada sebuah gerakan,
**agar** partisipasi saya tercatat sebagai kontribusi.

| # | Acceptance Criteria |
|---|---|
| AC-1 | **Given** gerakan berstatus `BERJALAN`, **When** saya menekan Ikut Serta, **Then** partisipasi tercatat dan gerakan muncul pada dasbor saya. |
| AC-2 | **Given** saya telah bergabung, **When** saya membuka gerakan tersebut, **Then** tersedia tombol untuk melaporkan aksi yang telah saya lakukan. |

#### US-016: Mengusulkan Gerakan Baru `S`
**Sebagai** anggota komunitas,
**saya ingin** mengusulkan gerakan baru di wilayah saya,
**agar** inisiatif tumbuh dari anggota, bukan hanya dari pusat.

| # | Acceptance Criteria |
|---|---|
| AC-1 | **Given** saya anggota aktif, **When** saya mengirim usulan berisi judul, kategori, tujuan, lokasi, dan rencana pelaksanaan, **Then** usulan tersimpan berstatus `MENUNGGU_PERSETUJUAN`. |
| AC-2 | **Given** usulan saya disetujui admin, **When** gerakan dipublikasikan, **Then** saya ditetapkan sebagai penggerak dan memperoleh **50 pts** *(lead local action / campaign)*. |
| AC-3 | **Given** usulan ditolak, **When** saya membuka usulan tersebut, **Then** alasan penolakan ditampilkan. |

#### US-017: Melaporkan Aksi Lapangan `M`
**Sebagai** anggota yang menjalankan aksi lokal,
**saya ingin** melaporkan pelaksanaan aksi beserta bukti,
**agar** aksi tersebut menjadi bukti dampak yang sah.

| # | Acceptance Criteria |
|---|---|
| AC-1 | **Given** saya peserta sebuah gerakan, **When** saya mengirim laporan berisi tanggal, lokasi, jumlah partisipan, foto, dan catatan hasil (*outcome note*), **Then** laporan tersimpan berstatus `MENUNGGU_VALIDASI`. |
| AC-2 | **Given** laporan tidak menyertakan catatan hasil, **When** saya mencoba mengirim, **Then** sistem menolak karena *outcome note* wajib untuk ESG evidence. |
| AC-3 | **Given** laporan divalidasi admin, **When** validasi selesai, **Then** laporan memenuhi syarat ESG evidence: *documented activity + outcome note + ESG/SDG tag + evidence source*. |

#### US-018: Penandaan ESG/SDG pada Gerakan `M`
**Sebagai** admin komunitas PF,
**saya ingin** menandai gerakan dan laporan dengan pilar ESG dan nomor SDG,
**agar** kontribusi komunitas dapat diagregasi menjadi KPI ESG.

| # | Acceptance Criteria |
|---|---|
| AC-1 | **Given** saya admin membuka sebuah gerakan, **When** saya menetapkan pilar ESG (Environmental/Social/Governance) dan tag SDG, **Then** penandaan tersimpan dan diwariskan ke laporan turunannya. |
| AC-2 | **Given** laporan telah bertanda ESG, **When** saya membuka dashboard ESG, **Then** laporan tersebut terhitung pada pilar yang sesuai. |

#### US-019: Papan Dampak Gerakan `C`
**Sebagai** anggota komunitas,
**saya ingin** melihat rekapitulasi dampak seluruh gerakan,
**agar** saya merasa menjadi bagian dari sesuatu yang berarti.

| # | Acceptance Criteria |
|---|---|
| AC-1 | **Given** saya anggota aktif, **When** saya membuka papan dampak, **Then** sistem menampilkan total gerakan, total partisipan, total lokasi, dan sebaran kategori. |
| AC-2 | **Given** papan dampak tampil, **When** saya memilih satu gerakan, **Then** sistem menampilkan rincian laporan tervalidasi dari gerakan tersebut. |

---

### Pilar 04: Diseminasi dan Amplifikasi Informasi
> *Penyebarluasan informasi terkait Pertamina dan/atau Pertamina Foundation* (Hal. 5)

#### US-020: Membaca Broadcast Mingguan `M`
**Sebagai** anggota komunitas,
**saya ingin** membaca broadcast mingguan berisi informasi Pertamina/PF,
**agar** saya selalu memperoleh informasi terbaru dan memperoleh 1 poin.

| # | Acceptance Criteria |
|---|---|
| AC-1 | **Given** terdapat broadcast berstatus `TERBIT`, **When** saya membuka dan membacanya, **Then** sistem mencatat *view/read* dan memberikan **1 pt**. |
| AC-2 | **Given** saya telah membaca broadcast tersebut, **When** saya membukanya kembali, **Then** poin tidak bertambah lagi. |
| AC-3 | **Given** saya anggota aktif, **When** saya membuka daftar broadcast, **Then** broadcast yang belum dibaca ditandai jelas. |

#### US-021: Merespons Light CTA `M`
**Sebagai** anggota komunitas,
**saya ingin** memberi reaksi atau balasan singkat pada ajakan ringan di sebuah konten,
**agar** saya terlibat tanpa beban dan memperoleh 2 poin.

| # | Acceptance Criteria |
|---|---|
| AC-1 | **Given** konten memiliki *light CTA*, **When** saya memberi reaksi atau balasan, **Then** sistem mencatat kontribusi dan memberikan **2 pts**. |
| AC-2 | **Given** saya sudah merespons CTA tersebut, **When** saya merespons ulang, **Then** poin tidak bertambah. |
| AC-3 | **Given** balasan saya terindikasi spam, **When** admin menandainya, **Then** poin dibatalkan dan tercatat pada jejak audit. |

#### US-022: Amplifikasi ke Jaringan WhatsApp / Privat `M`
**Sebagai** anggota komunitas,
**saya ingin** membagikan konten PF ke WhatsApp atau jaringan pribadi saya,
**agar** informasi menyebar dan saya memperoleh 5 poin.

| # | Acceptance Criteria |
|---|---|
| AC-1 | **Given** saya membuka sebuah konten, **When** saya menekan Bagikan ke WhatsApp, **Then** sistem menyiapkan pesan siap kirim beserta tautan berpenanda. |
| AC-2 | **Given** saya telah membagikan, **When** saya mengonfirmasi pembagian, **Then** sistem mencatat aksi amplifikasi jenis *private network* dan memberikan **5 pts**. |
| AC-3 | **Given** aksi tercatat, **When** admin meninjau, **Then** aksi tampil pada antrean verifikasi amplifikasi. |

#### US-023: Amplifikasi ke Media Sosial Publik `M`
**Sebagai** anggota komunitas,
**saya ingin** membagikan konten PF ke media sosial publik dan melampirkan buktinya,
**agar** jangkauan organik meningkat dan saya memperoleh 8 poin.

| # | Acceptance Criteria |
|---|---|
| AC-1 | **Given** saya membuka sebuah konten, **When** saya memilih Bagikan ke Media Sosial dan mengirimkan tautan unggahan atau tangkapan layar, **Then** sistem mencatat aksi berstatus `MENUNGGU_VERIFIKASI`. |
| AC-2 | **Given** bukti saya diverifikasi admin, **When** verifikasi disetujui, **Then** saya memperoleh **8 pts**. |
| AC-3 | **Given** bukti ditolak, **When** saya membuka riwayat kontribusi, **Then** alasan penolakan ditampilkan dan poin tidak diberikan. |
| AC-4 | **Given** saya mengirim bukti untuk konten yang sama dua kali, **When** sistem memeriksa, **Then** pengiriman kedua ditolak sebagai duplikat. |

#### US-024: Verifikasi Bukti Amplifikasi oleh Admin `M`
**Sebagai** admin komunitas PF,
**saya ingin** memverifikasi bukti amplifikasi anggota secara batch,
**agar** KPI 50% anggota melakukan amplifikasi terukur dan sah.

| # | Acceptance Criteria |
|---|---|
| AC-1 | **Given** terdapat aksi berstatus `MENUNGGU_VERIFIKASI`, **When** saya membuka antrean verifikasi, **Then** sistem menampilkan daftar beserta pratinjau bukti, nama anggota, dan konten terkait. |
| AC-2 | **Given** saya memilih beberapa aksi sekaligus, **When** saya menekan Setujui Terpilih, **Then** seluruh aksi terpilih disetujui dan poin masing-masing anggota dikreditkan. |
| AC-3 | **Given** saya menolak sebuah aksi, **When** saya mengisi alasan, **Then** alasan tersimpan dan dapat dilihat anggota bersangkutan. |
| AC-4 | **Given** verifikasi selesai, **When** saya membuka dashboard KPI, **Then** persentase anggota yang beramplifikasi diperbarui. |

#### US-025: Admin Menerbitkan Konten Diseminasi `M`
**Sebagai** admin komunitas PF,
**saya ingin** menyusun dan menerbitkan konten diseminasi terjadwal,
**agar** target 1–2 konten per bulan dan minimal 2 kali diseminasi per bulan tercapai.

| # | Acceptance Criteria |
|---|---|
| AC-1 | **Given** saya admin, **When** saya membuat konten dengan judul, isi, gambar, kategori, dan *light CTA*, **Then** konten tersimpan berstatus `DRAF`. |
| AC-2 | **Given** konten berstatus `DRAF`, **When** saya menerbitkannya, **Then** status menjadi `TERBIT`, tercatat pada hitungan KPI-02, dan tampil pada daftar broadcast anggota. |
| AC-3 | **Given** saya menjalankan kampanye diseminasi, **When** kampanye dikirim, **Then** sistem mencatat satu peristiwa diseminasi untuk KPI-03. |
| AC-4 | **Given** bulan berjalan, **When** saya membuka dashboard, **Then** sistem menampilkan jumlah konten terbit dan jumlah diseminasi bulan tersebut terhadap targetnya. |

#### US-026: Materi Siap Bagikan (Share Kit) `S`
**Sebagai** anggota komunitas,
**saya ingin** memperoleh materi siap bagikan berupa gambar dan teks yang sudah disiapkan,
**agar** saya dapat beramplifikasi dengan cepat tanpa menyusun sendiri.

| # | Acceptance Criteria |
|---|---|
| AC-1 | **Given** konten memiliki share kit, **When** saya membuka konten, **Then** sistem menampilkan pilihan teks siap salin dan gambar siap unduh. |
| AC-2 | **Given** saya menekan Salin Teks, **When** aksi selesai, **Then** teks tersalin ke papan klip dan sistem menampilkan konfirmasi. |
| AC-3 | **Given** saya menggunakan share kit, **When** saya melanjutkan ke aksi bagikan, **Then** alur amplifikasi (US-022/US-023) berjalan seperti biasa. |

---

### Pilar 05: Recognition & Gamifikasi
> *Penghargaan bagi member: TOP Contribution; TOP awardee dengan karir bagus; Peningkatan poin yang dapat ditukar* (Hal. 5)

> **Referensi skor (Hal. 11) dan tier (Hal. 12) bersifat mengikat: nilai tidak boleh diubah.**

#### US-027: Melihat Poin & Tier Saya `M`
**Sebagai** anggota komunitas,
**saya ingin** melihat total poin dan tier saya saat ini,
**agar** saya mengetahui posisi kontribusi saya.

| # | Acceptance Criteria |
|---|---|
| AC-1 | **Given** saya anggota aktif, **When** saya membuka dasbor, **Then** sistem menampilkan total poin dan tier saat ini. |
| AC-2 | **Given** total poin saya 25–49, **When** tier dihitung, **Then** tier saya **Active Member** (biru). |
| AC-3 | **Given** total poin saya 50–99, **When** tier dihitung, **Then** tier saya **Contributor** (hijau). |
| AC-4 | **Given** total poin saya 100–149, **When** tier dihitung, **Then** tier saya **Featured Candidate** (merah). |
| AC-5 | **Given** total poin saya ≥ 150, **When** tier dihitung, **Then** tier saya **Champion** (kuning). |
| AC-6 | **Given** total poin saya < 25, **When** tier dihitung, **Then** saya belum mencapai tier dan sistem menampilkan sisa poin menuju Active Member. |

#### US-028: Progres Menuju Tier Berikutnya `M`
**Sebagai** anggota komunitas,
**saya ingin** melihat berapa poin lagi yang saya butuhkan untuk naik tier,
**agar** saya termotivasi menambah kontribusi.

| # | Acceptance Criteria |
|---|---|
| AC-1 | **Given** saya memiliki poin di bawah 150, **When** saya membuka dasbor, **Then** sistem menampilkan indikator progres beserta selisih poin menuju ambang berikutnya. |
| AC-2 | **Given** saya telah mencapai Champion, **When** saya membuka dasbor, **Then** sistem menampilkan status tier tertinggi dan tidak menampilkan indikator progres. |
| AC-3 | **Given** progres ditampilkan, **When** saya menekannya, **Then** sistem menampilkan daftar aksi beserta nilai poin yang dapat saya lakukan. |

#### US-029: Katalog Aksi & Nilai Poin `M`
**Sebagai** anggota komunitas,
**saya ingin** melihat daftar seluruh aksi yang menghasilkan poin beserta nilainya,
**agar** saya memahami cara berkontribusi secara transparan.

| # | Acceptance Criteria |
|---|---|
| AC-1 | **Given** saya membuka halaman Cara Mendapat Poin, **When** halaman dimuat, **Then** sistem menampilkan seluruh aksi dengan nilai persis: view/read weekly broadcast **1**, react/reply light CTA **2**, share ke WA/jaringan privat **5**, share ke media sosial publik **8**, submit story/nomination/survey **10**, attend online session **15**, ask useful question/share useful answer **15**, become speaker/mentor/facilitator **30**, lead local action/campaign **50**. |
| AC-2 | **Given** halaman tampil, **When** saya membacanya, **Then** sistem menyertakan prinsip bahwa poin menghargai kontribusi bermakna, bukan aktivitas spam. |

#### US-030: Riwayat Perolehan Poin `M`
**Sebagai** anggota komunitas,
**saya ingin** melihat riwayat setiap perolehan poin saya,
**agar** perhitungan poin transparan dan dapat saya periksa.

| # | Acceptance Criteria |
|---|---|
| AC-1 | **Given** saya anggota aktif, **When** saya membuka riwayat poin, **Then** sistem menampilkan daftar transaksi berisi tanggal, jenis aksi, objek terkait, poin, dan status. |
| AC-2 | **Given** sebuah aksi masih menunggu verifikasi, **When** riwayat tampil, **Then** aksi tersebut ditandai `MENUNGGU_VERIFIKASI` dan poinnya belum dihitung ke total. |
| AC-3 | **Given** sebuah aksi dibatalkan admin, **When** riwayat tampil, **Then** aksi ditandai `DIBATALKAN` beserta alasannya. |

#### US-031: Leaderboard TOP Contribution `M`
**Sebagai** anggota komunitas,
**saya ingin** melihat peringkat kontributor teratas,
**agar** tumbuh apresiasi dan dorongan berkontribusi.

| # | Acceptance Criteria |
|---|---|
| AC-1 | **Given** saya anggota aktif, **When** saya membuka leaderboard, **Then** sistem menampilkan peringkat berdasarkan total poin beserta tier masing-masing. |
| AC-2 | **Given** leaderboard tampil, **When** saya memfilter berdasarkan periode (bulan berjalan / sepanjang waktu) atau komunitas, **Then** peringkat menyesuaikan. |
| AC-3 | **Given** saya tidak berada di 10 besar, **When** leaderboard tampil, **Then** sistem tetap menampilkan posisi saya secara terpisah. |
| AC-4 | **Given** seorang anggota memilih profil privat, **When** leaderboard tampil, **Then** namanya disamarkan namun peringkatnya tetap dihitung. |

#### US-032: Penghargaan TOP Awardee dengan Karir Bagus `S`
**Sebagai** admin komunitas PF,
**saya ingin** menetapkan penghargaan bagi alumni dengan pencapaian karir menonjol,
**agar** teladan alumni terlihat dan menjadi bahan agenda setting.

| # | Acceptance Criteria |
|---|---|
| AC-1 | **Given** saya admin, **When** saya menominasikan seorang alumni sebagai TOP Awardee beserta ringkasan pencapaian karir, **Then** nominasi tersimpan berstatus `MENUNGGU_PERSETUJUAN`. |
| AC-2 | **Given** nominasi disetujui Corsec, **When** penghargaan diterbitkan, **Then** lencana penghargaan tampil pada profil alumni dan halaman recognition. |
| AC-3 | **Given** alumni belum memberikan persetujuan publikasi, **When** admin mencoba menerbitkan, **Then** sistem menolak sampai consent terekam. |

#### US-033: Penukaran Poin `S`
**Sebagai** anggota komunitas,
**saya ingin** menukarkan poin saya dengan penghargaan yang tersedia,
**agar** kontribusi saya memberikan manfaat nyata.

| # | Acceptance Criteria |
|---|---|
| AC-1 | **Given** saya memiliki poin mencukupi, **When** saya membuka katalog penukaran, **Then** sistem menampilkan item beserta syarat poinnya dan menandai mana yang dapat saya tukar. |
| AC-2 | **Given** saya menukarkan sebuah item, **When** penukaran dikonfirmasi, **Then** poin saya berkurang, permintaan tercatat berstatus `DIPROSES`, dan tier saya dihitung dari **poin kumulatif seumur hidup**, bukan saldo tersisa. |
| AC-3 | **Given** poin saya tidak mencukupi, **When** saya mencoba menukar, **Then** sistem menolak dan menampilkan kekurangan poin. |
| AC-4 | **Given** penukaran tercatat, **When** admin memprosesnya, **Then** status berubah menjadi `SELESAI` dan tercatat pada jejak audit. |

#### US-034: Kelayakan Fitur Berdasarkan Tier `M`
**Sebagai** anggota komunitas,
**saya ingin** mengetahui manfaat apa yang terbuka pada tier saya,
**agar** saya memahami nilai dari kenaikan tier.

| # | Acceptance Criteria |
|---|---|
| AC-1 | **Given** tier saya **Active Member (25 pts)**, **When** saya membuka manfaat, **Then** sistem menyatakan saya *eligible for monthly digest mention*. |
| AC-2 | **Given** tier saya **Contributor (50 pts)**, **When** saya membuka manfaat, **Then** sistem menyatakan saya *eligible for community recognition*. |
| AC-3 | **Given** tier saya **Featured Candidate (100 pts)**, **When** saya membuka manfaat, **Then** sistem menyatakan saya *eligible for website or social media feature*. |
| AC-4 | **Given** tier saya **Champion (150 pts)**, **When** saya membuka manfaat, **Then** sistem menyatakan saya *eligible for mentor / speaker / regional champion invitation*. |
| AC-5 | **Given** saya belum memenuhi syarat sebuah manfaat, **When** manfaat ditampilkan, **Then** manfaat tersebut tampil terkunci beserta syarat pembukanya. |

---

### Pilar 06: Community Journalism
> *Tantangan seperti gerakan pengurangan sampah; kampanye energi bersih; program edukasi di masyarakat* (Hal. 5)

#### US-035: Mengikuti Tantangan Komunitas `M`
**Sebagai** anggota komunitas,
**saya ingin** mengikuti tantangan komunitas yang sedang berjalan,
**agar** kontribusi saya terarah pada tema yang sedang dikampanyekan.

| # | Acceptance Criteria |
|---|---|
| AC-1 | **Given** saya anggota aktif, **When** saya membuka halaman Tantangan, **Then** sistem menampilkan tantangan aktif beserta tema (pengurangan sampah / energi bersih / edukasi masyarakat), periode, dan ketentuan. |
| AC-2 | **Given** saya memilih sebuah tantangan, **When** saya menekan Ikuti, **Then** partisipasi tercatat dan tantangan muncul pada dasbor saya. |
| AC-3 | **Given** periode tantangan telah berakhir, **When** saya membuka halaman tersebut, **Then** tantangan ditandai `SELESAI` dan tidak dapat diikuti lagi. |

#### US-036: Mengirim Story / Liputan Komunitas `M`
**Sebagai** anggota komunitas,
**saya ingin** mengirimkan story atau liputan kegiatan saya,
**agar** cerita saya terdokumentasi dan saya memperoleh 10 poin.

| # | Acceptance Criteria |
|---|---|
| AC-1 | **Given** saya anggota aktif, **When** saya mengirim story berisi judul, narasi, foto, lokasi, tanggal, dan tantangan/gerakan terkait, **Then** story tersimpan berstatus `MENUNGGU_KURASI` dan saya memperoleh **10 pts**. |
| AC-2 | **Given** saya belum mencentang persetujuan publikasi (*consent*), **When** saya mencoba mengirim, **Then** sistem menolak pengiriman. |
| AC-3 | **Given** foto yang saya unggah memuat wajah pihak ketiga, **When** formulir tampil, **Then** sistem menampilkan pernyataan tanggung jawab persetujuan pihak ketiga yang harus disetujui. |

#### US-037: Kurasi Story oleh Admin `M`
**Sebagai** admin komunitas PF,
**saya ingin** mengurasi story yang masuk,
**agar** hanya cerita layak dan aman yang masuk ke story bank.

| # | Acceptance Criteria |
|---|---|
| AC-1 | **Given** terdapat story berstatus `MENUNGGU_KURASI`, **When** saya membuka antrean kurasi, **Then** sistem menampilkan story beserta checklist kelayakan. |
| AC-2 | **Given** saya menyetujui story, **When** kurasi selesai, **Then** status menjadi `TERVERIFIKASI` dan story masuk story bank. |
| AC-3 | **Given** story mengandung data sensitif, **When** saya menandainya, **Then** story ditolak dengan alasan *sensitive-data concern* dan tidak dapat dipublikasikan. |

#### US-038: Publikasi Featured Story `M`
**Sebagai** Corsec PF,
**saya ingin** memublikasikan story pilihan ke kanal publik,
**agar** narasi baik Pertamina/PF tersebar dengan kendali penuh.

| # | Acceptance Criteria |
|---|---|
| AC-1 | **Given** sebuah story hendak dipublikasikan, **When** sistem memeriksa kelayakan, **Then** publikasi hanya diizinkan bila terpenuhi seluruhnya: **100 poin + verified story + consent + validasi PF + tidak ada masalah data sensitif**. |
| AC-2 | **Given** salah satu syarat belum terpenuhi, **When** saya mencoba memublikasikan, **Then** sistem menolak dan menampilkan syarat yang belum terpenuhi. |
| AC-3 | **Given** story dipublikasikan, **When** halaman publik dimuat, **Then** story tampil beserta atribusi penulis sesuai preferensi consent-nya. |

#### US-039: Story Bank & Pencarian `S`
**Sebagai** admin komunitas PF,
**saya ingin** menelusuri story bank berdasarkan tema, pilar ESG, dan wilayah,
**agar** saya cepat menemukan bahan untuk kebutuhan komunikasi dan pelaporan.

| # | Acceptance Criteria |
|---|---|
| AC-1 | **Given** saya admin, **When** saya membuka story bank dan memfilter berdasarkan tema/pilar ESG/wilayah/periode, **Then** sistem menampilkan story yang sesuai. |
| AC-2 | **Given** hasil pencarian tampil, **When** saya memilih beberapa story, **Then** saya dapat mengekspornya sebagai bahan laporan. |

#### US-040: Tanya Jawab Bermanfaat `S`
**Sebagai** anggota komunitas,
**saya ingin** mengajukan pertanyaan atau membagikan jawaban bermanfaat,
**agar** pengetahuan mengalir antar anggota dan saya memperoleh 15 poin.

| # | Acceptance Criteria |
|---|---|
| AC-1 | **Given** saya anggota aktif, **When** saya mengajukan pertanyaan atau menuliskan jawaban, **Then** kontribusi tersimpan berstatus `MENUNGGU_VERIFIKASI`. |
| AC-2 | **Given** admin menandai kontribusi saya sebagai *bermanfaat*, **When** penandaan tersimpan, **Then** saya memperoleh **15 pts**. |
| AC-3 | **Given** kontribusi tidak ditandai bermanfaat, **When** saya membuka riwayat poin, **Then** kontribusi tercatat tanpa poin. |

---

### Pilar 00: Fondasi Lintas Pilar (Governance & Admin)
> Kelompok pendukung yang menopang keenam pilar. *(turunan analisis)*

#### US-041: Masuk ke Microsite `M`
**Sebagai** anggota komunitas,
**saya ingin** masuk ke microsite dengan cara sederhana,
**agar** saya dapat mengakses fitur anggota tanpa hambatan.

| # | Acceptance Criteria |
|---|---|
| AC-1 | **Given** saya anggota berstatus `AKTIF`, **When** saya memasukkan nomor WhatsApp/email terdaftar, **Then** sistem memberikan akses sesuai peran saya. |
| AC-2 | **Given** akun saya belum diverifikasi, **When** saya mencoba masuk, **Then** sistem menampilkan status pendaftaran saya. |
| AC-3 | **Given** saya sudah pernah masuk di perangkat ini, **When** saya membuka kembali microsite, **Then** sesi saya dipulihkan tanpa memasukkan ulang identitas. |

#### US-042: Dasbor Anggota `M`
**Sebagai** anggota komunitas,
**saya ingin** memiliki satu dasbor ringkas setelah masuk,
**agar** saya langsung tahu apa yang perlu saya lakukan.

| # | Acceptance Criteria |
|---|---|
| AC-1 | **Given** saya anggota aktif, **When** saya membuka dasbor, **Then** sistem menampilkan poin & tier, broadcast belum dibaca, kegiatan mendatang, tantangan berjalan, dan aksi yang disarankan. |
| AC-2 | **Given** saya membuka dari ponsel, **When** dasbor dimuat, **Then** informasi tersusun satu kolom dengan aksi utama terjangkau ibu jari. |

#### US-043: Persetujuan Data Pribadi & Consent `M`
**Sebagai** anggota komunitas,
**saya ingin** mengetahui dan mengendalikan persetujuan penggunaan data serta publikasi cerita saya,
**agar** privasi saya terlindungi.

| # | Acceptance Criteria |
|---|---|
| AC-1 | **Given** saya mendaftar, **When** formulir tampil, **Then** sistem meminta persetujuan eksplisit pengolahan data pribadi dengan tautan ke kebijakan privasi. |
| AC-2 | **Given** saya anggota aktif, **When** saya membuka pengaturan privasi, **Then** saya dapat mengubah izin publikasi nama, foto, dan cerita. |
| AC-3 | **Given** saya mencabut consent publikasi, **When** perubahan tersimpan, **Then** konten publik yang bergantung pada consent tersebut ditarik dari tampilan publik. |
| AC-4 | **Given** consent berubah, **When** perubahan tersimpan, **Then** sistem mencatat waktu, jenis, dan versi kebijakan pada catatan consent. |

#### US-044: Dashboard KPI Aktivitas `M`
**Sebagai** Corsec PF,
**saya ingin** melihat dashboard pencapaian KPI aktivitas,
**agar** saya dapat melaporkan kemajuan inisiatif dengan data.

| # | Acceptance Criteria |
|---|---|
| AC-1 | **Given** saya CORSEC_MANAGER, **When** saya membuka dashboard KPI, **Then** sistem menampilkan lima KPI: pendataan **75%**, konten terdiseminasi **1–2/bulan**, frekuensi diseminasi **≥2/bulan**, amplifikasi anggota **50%**, aktivitas engagement **2**. |
| AC-2 | **Given** sebuah KPI di bawah target, **When** dashboard tampil, **Then** KPI tersebut ditandai secara visual berbeda dari yang tercapai. |
| AC-3 | **Given** saya memilih sebuah KPI, **When** saya menelusurinya, **Then** sistem menampilkan data pendukung hingga tingkat kontribusi individual. |
| AC-4 | **Given** saya mengubah periode, **When** dashboard dimuat ulang, **Then** seluruh angka menyesuaikan periode terpilih. |

#### US-045: Dashboard ESG Evidence `S`
**Sebagai** Corsec PF,
**saya ingin** melihat rekapitulasi bukti ESG dari aktivitas komunitas,
**agar** saya dapat membuktikan bahwa program menciptakan nilai, bukan sekadar berjalan.

| # | Acceptance Criteria |
|---|---|
| AC-1 | **Given** saya CORSEC_MANAGER, **When** saya membuka dashboard ESG, **Then** sistem menampilkan tiga pilar: Environmental, Social, Governance beserta metriknya. |
| AC-2 | **Given** sebuah bukti belum memenuhi ambang minimum, **When** dashboard tampil, **Then** bukti tersebut tidak dihitung dan tercantum pada daftar bukti belum lengkap. |
| AC-3 | **Given** saya menekan Ekspor, **When** proses selesai, **Then** sistem menghasilkan berkas rekapitulasi bukti beserta sumbernya. |

#### US-046: Jejak Audit `S`
**Sebagai** Corsec PF,
**saya ingin** menelusuri jejak audit atas keputusan verifikasi dan publikasi,
**agar** integritas bukti dan tata kelola terjaga.

| # | Acceptance Criteria |
|---|---|
| AC-1 | **Given** terjadi aksi administratif (verifikasi, penolakan, publikasi, pembatalan poin), **When** aksi tersimpan, **Then** sistem mencatat aktor, waktu, objek, aksi, dan alasan. |
| AC-2 | **Given** saya membuka jejak audit, **When** saya memfilter berdasarkan aktor/objek/periode, **Then** sistem menampilkan catatan yang sesuai. |
| AC-3 | **Given** sebuah catatan audit telah tersimpan, **When** siapa pun mencoba mengubahnya, **Then** sistem menolak: catatan bersifat *append-only*. |

---

## 7. Use Case Utama

### UC-01: Registrasi & Onboarding Anggota Baru

| Atribut | Isi |
|---|---|
| **ID** | UC-01 |
| **Aktor Utama** | Penerima manfaat PF (calon anggota) |
| **Aktor Sekunder** | Admin Komunitas PF |
| **Pilar** | 01: Open Community Ecosystem |
| **Prekondisi** | Calon anggota memiliki nomor WhatsApp aktif; master data penerima manfaat tersedia; microsite dapat diakses |
| **Postkondisi** | Anggota berstatus `AKTIF` dan terhitung pada KPI-01 |
| **Pemicu** | Calon anggota membuka kotak biru Pfriends di `pertaminafoundation.org` atau menerima tautan undangan dari WA Komunitas |

**Main Flow**
1. Calon anggota membuka halaman utama Pfriends.
2. Calon anggota menekan Daftar Sekarang.
3. Sistem menampilkan formulir pendaftaran.
4. Calon anggota mengisi data diri dan memilih jenis komunitas (SOBI / PFpreneur).
5. Calon anggota memberikan persetujuan pengolahan data pribadi.
6. Sistem memvalidasi kelengkapan dan keunikan nomor WhatsApp.
7. Sistem menyimpan pendaftaran berstatus `MENUNGGU_VERIFIKASI` dan mencatat consent.
8. Sistem menampilkan halaman konfirmasi beserta tautan gabung WA Komunitas.
9. Admin membuka antrean verifikasi dan mencocokkan data terhadap master data.
10. Admin menyetujui pendaftaran.
11. Sistem mengubah status menjadi `AKTIF` dan membuka akses fitur anggota.

**Alternate Flow**
- **A1: Nomor sudah terdaftar (langkah 6).** Sistem menolak dan mengarahkan ke alur masuk. Use case berakhir.
- **A2: Consent tidak diberikan (langkah 5).** Tombol kirim tetap nonaktif; sistem menjelaskan bahwa consent wajib. Use case tertahan.
- **A3: Data tidak cocok master data (langkah 9).** Admin menandai `PERLU_KLARIFIKASI`, sistem menampilkan permintaan dokumen pendukung kepada calon anggota; alur kembali ke langkah 9 setelah dokumen diterima.
- **A4: Pendaftar bukan penerima manfaat (langkah 10).** Admin menolak dengan alasan; status menjadi `DITOLAK` dan tercatat pada jejak audit.

---

### UC-02: Masuk & Mengakses Dasbor Anggota

| Atribut | Isi |
|---|---|
| **ID** | UC-02 |
| **Aktor Utama** | Anggota komunitas |
| **Pilar** | 00: Fondasi |
| **Prekondisi** | Anggota berstatus `AKTIF` |
| **Postkondisi** | Sesi anggota aktif; dasbor personal tampil |
| **Pemicu** | Anggota membuka microsite dari tautan di WA Komunitas |

**Main Flow**
1. Anggota membuka microsite Pfriends.
2. Sistem memeriksa sesi tersimpan pada perangkat.
3. Sesi tidak ditemukan: sistem menampilkan halaman masuk.
4. Anggota memasukkan nomor WhatsApp atau email terdaftar.
5. Sistem memverifikasi identitas dan peran anggota.
6. Sistem membuat sesi dan mengarahkan ke dasbor.
7. Dasbor menampilkan poin & tier, broadcast belum dibaca, kegiatan mendatang, dan aksi yang disarankan.

**Alternate Flow**
- **A1: Sesi ditemukan (langkah 2).** Sistem langsung mengarahkan ke dasbor; lanjut ke langkah 7.
- **A2: Identitas tidak terdaftar (langkah 5).** Sistem menawarkan alur pendaftaran (UC-01).
- **A3: Status masih `MENUNGGU_VERIFIKASI` (langkah 5).** Sistem menampilkan halaman status pendaftaran, akses fitur anggota belum diberikan.
- **A4: Status `DITOLAK`/`NONAKTIF` (langkah 5).** Sistem menampilkan pemberitahuan dan kanal bantuan.

---

### UC-03: Diseminasi Konten oleh Admin

| Atribut | Isi |
|---|---|
| **ID** | UC-03 |
| **Aktor Utama** | Admin Komunitas PF |
| **Aktor Sekunder** | Corsec PF (penyetuju), anggota komunitas (penerima) |
| **Pilar** | 04: Diseminasi & Amplifikasi |
| **Prekondisi** | Admin memiliki materi konten Pertamina/PF; terdapat anggota aktif |
| **Postkondisi** | Konten berstatus `TERBIT`; peristiwa diseminasi tercatat untuk KPI-02 dan KPI-03 |
| **Pemicu** | Jadwal diseminasi bulanan atau instruksi Corsec |

**Main Flow**
1. Admin membuka konsol konten dan menekan Buat Konten.
2. Admin mengisi judul, isi, gambar, kategori, tag ESG/SDG, dan *light CTA*.
3. Admin menyiapkan share kit (teks siap salin dan gambar siap unduh).
4. Admin menyimpan konten berstatus `DRAF`.
5. Admin mengirim konten untuk persetujuan Corsec.
6. Corsec menyetujui konten.
7. Admin menerbitkan konten dan menjalankan kampanye diseminasi ke segmen anggota terpilih.
8. Sistem mengubah status menjadi `TERBIT`, mencatat 1 konten (KPI-02) dan 1 peristiwa diseminasi (KPI-03).
9. Konten tampil pada daftar broadcast anggota.

**Alternate Flow**
- **A1: Corsec meminta revisi (langkah 6).** Status kembali `DRAF` beserta catatan revisi; alur kembali ke langkah 2.
- **A2: Konten dijadwalkan (langkah 7).** Admin menetapkan waktu terbit; sistem menerbitkan otomatis pada waktu tersebut.
- **A3: Kuota KPI bulan berjalan telah terpenuhi (langkah 8).** Sistem tetap menerbitkan dan menampilkan indikator pencapaian melebihi target.

---

### UC-04: Amplifikasi Konten oleh Anggota

| Atribut | Isi |
|---|---|
| **ID** | UC-04 |
| **Aktor Utama** | Anggota komunitas |
| **Pilar** | 04: Diseminasi & Amplifikasi |
| **Prekondisi** | Terdapat konten berstatus `TERBIT`; anggota berstatus `AKTIF` |
| **Postkondisi** | Aksi amplifikasi tercatat; poin diberikan (5 pts privat / 8 pts publik setelah verifikasi) |
| **Pemicu** | Anggota membuka konten dan ingin membagikannya |

**Main Flow**
1. Anggota membuka detail konten.
2. Sistem menampilkan share kit dan pilihan kanal berbagi.
3. Anggota memilih kanal: WhatsApp/jaringan privat atau media sosial publik.
4. Sistem menyiapkan materi bagikan beserta tautan berpenanda.
5. Anggota membagikan konten di kanal terpilih.
6. Anggota kembali ke microsite dan mengonfirmasi pembagian; untuk kanal publik anggota melampirkan tautan unggahan atau tangkapan layar.
7. Sistem mencatat aksi amplifikasi: kanal privat langsung `TERVERIFIKASI` (**5 pts**); kanal publik berstatus `MENUNGGU_VERIFIKASI` (**8 pts** tertunda).
8. Sistem memperbarui riwayat kontribusi anggota.

**Alternate Flow**
- **A1: Bukti duplikat (langkah 7).** Sistem menolak karena anggota telah beramplifikasi untuk konten yang sama.
- **A2: Anggota tidak mengonfirmasi (langkah 6).** Aksi tidak tercatat dan poin tidak diberikan.
- **A3: Berkas bukti melebihi batas ukuran (langkah 6).** Sistem menolak unggahan dan menyarankan kompresi.
- **A4: Verifikasi ditolak admin (lanjutan langkah 7).** Aksi menjadi `DITOLAK`, poin batal, alasan tampil pada riwayat anggota.

---

### UC-05: Verifikasi Bukti Amplifikasi

| Atribut | Isi |
|---|---|
| **ID** | UC-05 |
| **Aktor Utama** | Admin Komunitas PF |
| **Pilar** | 04: Diseminasi & Amplifikasi |
| **Prekondisi** | Terdapat aksi amplifikasi berstatus `MENUNGGU_VERIFIKASI` |
| **Postkondisi** | Poin dikreditkan/dibatalkan; KPI-04 diperbarui; jejak audit tercatat |
| **Pemicu** | Admin membuka antrean verifikasi (rutin harian/mingguan) |

**Main Flow**
1. Admin membuka antrean verifikasi amplifikasi.
2. Sistem menampilkan daftar aksi tertunda beserta pratinjau bukti, nama anggota, konten, dan kanal.
3. Admin meninjau bukti satu per satu atau memilih beberapa sekaligus.
4. Admin menyetujui aksi yang sah.
5. Sistem mengkredit **8 pts** untuk setiap aksi publik yang disetujui dan memperbarui total poin serta tier anggota.
6. Sistem memperbarui perhitungan KPI-04.
7. Sistem mencatat keputusan pada jejak audit.

**Alternate Flow**
- **A1: Bukti tidak sah/tidak relevan (langkah 4).** Admin menolak dengan alasan; poin tidak dikreditkan; alasan tampil pada riwayat anggota.
- **A2: Bukti terindikasi spam berulang (langkah 3).** Admin menandai anggota untuk peninjauan; sistem menahan pemberian poin sesuai prinsip *reward meaningful contribution, not spammy activity*.
- **A3: Bukti perlu klarifikasi (langkah 3).** Admin mengembalikan aksi berstatus `PERLU_KLARIFIKASI` beserta catatan; anggota dapat mengunggah ulang bukti.
- **A4: Kenaikan tier terjadi (langkah 5).** Sistem menandai anggota telah melewati ambang (25/50/100/150) dan membuka manfaat tier terkait.

---

### UC-06: Penyelenggaraan Kegiatan & Pencatatan Kehadiran

| Atribut | Isi |
|---|---|
| **ID** | UC-06 |
| **Aktor Utama** | Admin Komunitas PF |
| **Aktor Sekunder** | Anggota komunitas, Mentor/Narasumber |
| **Pilar** | 02: Kalender Komunitas |
| **Prekondisi** | Admin memiliki rencana kegiatan; chapter komunitas telah terbentuk |
| **Postkondisi** | Kegiatan berstatus `SELESAI`; kehadiran tercatat; KPI-05 diperbarui |
| **Pemicu** | Rencana kegiatan bulanan (upskilling / pertemuan komunitas / sharing session) |

**Main Flow**
1. Admin membuat kegiatan pada kalender dengan judul, jenis, tanggal, kuota, chapter, dan narasumber.
2. Sistem menerbitkan kegiatan berstatus `TERBUKA`.
3. Anggota melihat kegiatan pada kalender dan mendaftar.
4. Sistem mencatat pendaftaran dan mengirim pengingat H-1.
5. Kegiatan berlangsung; admin membagikan kode sesi kepada peserta.
6. Peserta mengonfirmasi kehadiran menggunakan kode sesi.
7. Sistem mencatat kehadiran dan memberikan **15 pts** kepada tiap peserta.
8. Narasumber yang berperan sebagai *speaker/mentor/facilitator* memperoleh **30 pts**.
9. Admin menandai kegiatan `SELESAI`, mengisi jumlah peserta dan catatan hasil, serta melampirkan bukti.
10. Sistem menghitung kegiatan tersebut pada KPI-05 dan menyiapkan bahan ESG evidence.

**Alternate Flow**
- **A1: Kuota penuh (langkah 3).** Sistem menawarkan daftar tunggu; peserta dipromosikan otomatis bila ada pembatalan.
- **A2: Peserta terdaftar namun tidak hadir (langkah 6).** Kehadiran tidak tercatat; poin tidak diberikan.
- **A3: Kegiatan dibatalkan (langkah 5).** Admin menandai `DIBATALKAN` beserta alasan; seluruh pendaftar diberi tahu; kegiatan tidak dihitung pada KPI-05.
- **A4: Kode sesi digunakan di luar masa klaim (langkah 6).** Sistem menolak konfirmasi kehadiran.

---

### UC-07: Pengiriman Story Community Journalism

| Atribut | Isi |
|---|---|
| **ID** | UC-07 |
| **Aktor Utama** | Anggota komunitas |
| **Pilar** | 06: Community Journalism |
| **Prekondisi** | Anggota berstatus `AKTIF`; terdapat tantangan atau gerakan yang dapat dirujuk |
| **Postkondisi** | Story tersimpan berstatus `MENUNGGU_KURASI`; anggota memperoleh **10 pts** |
| **Pemicu** | Anggota menyelesaikan aksi dan ingin melaporkannya sebagai cerita |

**Main Flow**
1. Anggota membuka halaman Kirim Story.
2. Sistem menampilkan formulir beserta ketentuan consent.
3. Anggota mengisi judul, narasi, lokasi, tanggal, dan memilih tantangan/gerakan terkait.
4. Anggota mengunggah foto sebagai bukti.
5. Anggota memberikan persetujuan publikasi dan pernyataan persetujuan pihak ketiga atas foto.
6. Sistem memvalidasi kelengkapan dan ukuran berkas.
7. Sistem menyimpan story berstatus `MENUNGGU_KURASI` dan mencatat consent.
8. Sistem memberikan **10 pts** kepada anggota.

**Alternate Flow**
- **A1: Consent tidak diberikan (langkah 5).** Sistem menolak pengiriman story.
- **A2: Berkas foto melebihi batas (langkah 6).** Sistem menolak dan menyarankan kompresi; anggota mengunggah ulang.
- **A3: Anggota menyimpan sebagai draf (langkah 7).** Story berstatus `DRAF`; poin belum diberikan sampai dikirim.
- **A4: Story tidak merujuk tantangan/gerakan (langkah 3).** Sistem tetap menerima namun menandainya sebagai story umum tanpa tag ESG otomatis.

---

### UC-08: Kurasi & Publikasi Featured Story

| Atribut | Isi |
|---|---|
| **ID** | UC-08 |
| **Aktor Utama** | Admin Komunitas PF |
| **Aktor Sekunder** | Corsec PF (penyetuju akhir), anggota penulis story |
| **Pilar** | 06: Community Journalism |
| **Prekondisi** | Terdapat story berstatus `MENUNGGU_KURASI` |
| **Postkondisi** | Story `TERVERIFIKASI` masuk story bank; story terpilih berstatus `TERPUBLIKASI` |
| **Pemicu** | Antrean kurasi terisi atau kebutuhan bahan publikasi |

**Main Flow**
1. Admin membuka antrean kurasi story.
2. Sistem menampilkan story beserta checklist kelayakan.
3. Admin memeriksa kualitas narasi, keaslian foto, dan kelengkapan consent.
4. Admin memeriksa tidak adanya *sensitive-data concern*.
5. Admin menyetujui story: status menjadi `TERVERIFIKASI` dan masuk story bank.
6. Admin mengusulkan story sebagai *featured*.
7. Sistem memeriksa syarat publikasi publik: **100 poin + verified story + consent + validasi PF + tidak ada masalah data sensitif**.
8. Corsec memberikan validasi PF.
9. Sistem mengubah status menjadi `TERPUBLIKASI` dan menampilkannya pada halaman publik.
10. Sistem mencatat keputusan pada jejak audit.

**Alternate Flow**
- **A1: Consent belum lengkap (langkah 3).** Sistem menahan kurasi; admin meminta anggota melengkapi consent.
- **A2: Terdapat data sensitif (langkah 4).** Story ditolak dengan alasan *sensitive-data concern*; tidak dapat dipublikasikan meski poin mencukupi.
- **A3: Poin penulis di bawah 100 (langkah 7).** Publikasi ditolak; story tetap tersimpan di story bank sebagai bahan internal.
- **A4: Corsec menolak validasi (langkah 8).** Status kembali `TERVERIFIKASI` beserta catatan; story tidak dipublikasikan.
- **A5: Anggota mencabut consent setelah publikasi (setelah langkah 9).** Sistem menarik story dari tampilan publik dan mencatat penarikan pada jejak audit.

---

### UC-09: Perhitungan Poin & Kenaikan Tier

| Atribut | Isi |
|---|---|
| **ID** | UC-09 |
| **Aktor Utama** | Sistem (proses terotomasi) |
| **Aktor Sekunder** | Anggota komunitas, Admin Komunitas PF |
| **Pilar** | 05: Recognition & Gamifikasi |
| **Prekondisi** | Terdapat kontribusi berstatus `TERVERIFIKASI` |
| **Postkondisi** | Total poin dan tier anggota mutakhir; manfaat tier terbuka |
| **Pemicu** | Sebuah kontribusi berpindah status menjadi `TERVERIFIKASI` |

**Main Flow**
1. Sistem menerima peristiwa kontribusi terverifikasi.
2. Sistem menentukan nilai poin berdasarkan jenis aksi sesuai tabel skor resmi (1/2/5/8/10/15/15/30/50).
3. Sistem memeriksa aturan anti-duplikasi untuk jenis aksi tersebut.
4. Sistem mencatat transaksi poin pada buku besar kontribusi anggota.
5. Sistem menghitung ulang total poin kumulatif anggota.
6. Sistem menentukan tier berdasarkan ambang: ≥150 Champion, ≥100 Featured Candidate, ≥50 Contributor, ≥25 Active Member.
7. Bila tier berubah, sistem mencatat peristiwa kenaikan tier dan membuka manfaat terkait.
8. Sistem memperbarui tampilan dasbor, leaderboard, dan profil anggota.

**Alternate Flow**
- **A1: Aksi duplikat (langkah 3).** Transaksi ditolak; total poin tidak berubah.
- **A2: Kontribusi dibatalkan admin (setelah langkah 4).** Sistem mencatat transaksi pembalik, menghitung ulang total, dan menurunkan tier bila perlu.
- **A3: Tier tidak berubah (langkah 7).** Sistem hanya memperbarui total poin dan indikator progres.
- **A4: Anggota menukarkan poin (paralel).** Saldo poin berkurang namun **poin kumulatif untuk penentuan tier tidak berkurang**.

---

### UC-10: Penukaran Poin dengan Reward

| Atribut | Isi |
|---|---|
| **ID** | UC-10 |
| **Aktor Utama** | Anggota komunitas |
| **Aktor Sekunder** | Admin Komunitas PF |
| **Pilar** | 05: Recognition & Gamifikasi |
| **Prekondisi** | Anggota memiliki saldo poin; katalog penukaran tersedia |
| **Postkondisi** | Saldo poin berkurang; permintaan penukaran tercatat |
| **Pemicu** | Anggota membuka katalog penukaran |

**Main Flow**
1. Anggota membuka katalog penukaran.
2. Sistem menampilkan item beserta syarat poin dan menandai item yang dapat ditukar.
3. Anggota memilih sebuah item dan menekan Tukar.
4. Sistem menampilkan konfirmasi berisi poin yang akan dipotong dan sisa saldo.
5. Anggota mengonfirmasi.
6. Sistem memotong saldo poin dan mencatat permintaan berstatus `DIPROSES`.
7. Admin memproses penukaran dan menandainya `SELESAI`.
8. Sistem mencatat seluruh langkah pada jejak audit.

**Alternate Flow**
- **A1: Saldo tidak mencukupi (langkah 3).** Sistem menolak dan menampilkan kekurangan poin.
- **A2: Stok item habis (langkah 3).** Item ditandai tidak tersedia dan tidak dapat dipilih.
- **A3: Admin membatalkan penukaran (langkah 7).** Sistem mengembalikan poin ke saldo anggota dan mencatat alasan pembatalan.

---

### UC-11: Inisiasi & Pelaporan Movement-Based Program

| Atribut | Isi |
|---|---|
| **ID** | UC-11 |
| **Aktor Utama** | Anggota komunitas (penggerak) |
| **Aktor Sekunder** | Admin Komunitas PF, anggota peserta |
| **Pilar** | 03: Movement-Based Program |
| **Prekondisi** | Anggota berstatus `AKTIF`; kategori gerakan tersedia |
| **Postkondisi** | Gerakan berjalan; laporan aksi tervalidasi menjadi ESG evidence; penggerak memperoleh **50 pts** |
| **Pemicu** | Anggota mengusulkan gerakan atau bergabung pada gerakan yang berjalan |

**Main Flow**
1. Anggota mengusulkan gerakan baru berisi judul, kategori (aksi lingkungan / edukasi masyarakat / pemberdayaan ekonomi), tujuan, lokasi, dan rencana.
2. Sistem menyimpan usulan berstatus `MENUNGGU_PERSETUJUAN`.
3. Admin meninjau usulan dan menetapkan tag ESG/SDG.
4. Admin menyetujui: gerakan dipublikasikan berstatus `BERJALAN` dan pengusul ditetapkan sebagai penggerak.
5. Sistem memberikan **50 pts** kepada penggerak.
6. Anggota lain melihat dan bergabung ke gerakan.
7. Penggerak melaksanakan aksi lapangan.
8. Penggerak mengirim laporan berisi tanggal, lokasi, jumlah partisipan, foto, dan catatan hasil.
9. Admin memvalidasi laporan.
10. Sistem menandai laporan memenuhi syarat ESG evidence dan mengagregasinya pada dashboard ESG.

**Alternate Flow**
- **A1: Usulan ditolak (langkah 4).** Alasan ditampilkan kepada pengusul; poin tidak diberikan.
- **A2: Laporan tanpa catatan hasil (langkah 8).** Sistem menolak pengiriman karena *outcome note* wajib.
- **A3: Gerakan diinisiasi pusat (alternatif langkah 1).** Admin membuat gerakan langsung berstatus `BERJALAN`; poin penggerak tidak berlaku.
- **A4: Laporan ditolak validasi (langkah 9).** Laporan berstatus `PERLU_PERBAIKAN` beserta catatan; penggerak dapat memperbaiki dan mengirim ulang.

---

### UC-12: Monitoring KPI & Ekspor ESG Evidence

| Atribut | Isi |
|---|---|
| **ID** | UC-12 |
| **Aktor Utama** | Corsec PF (CORSEC_MANAGER) |
| **Aktor Sekunder** | Admin Komunitas PF |
| **Pilar** | 00: Fondasi / Lintas Pilar |
| **Prekondisi** | Terdapat data kontribusi, konten, kegiatan, dan story pada periode terpilih |
| **Postkondisi** | Laporan KPI dan berkas ESG evidence tersedia |
| **Pemicu** | Siklus pelaporan bulanan atau permintaan manajemen |

**Main Flow**
1. Corsec membuka dashboard KPI aktivitas.
2. Corsec memilih periode pelaporan.
3. Sistem menghitung dan menampilkan lima KPI beserta pencapaiannya terhadap target.
4. Corsec menelusuri KPI amplifikasi hingga daftar anggota dan bukti individual.
5. Corsec berpindah ke dashboard ESG evidence.
6. Sistem menampilkan agregasi tiga pilar ESG beserta metrik dan bukti pendukung.
7. Corsec menekan Ekspor Laporan.
8. Sistem menghasilkan berkas rekapitulasi berisi angka KPI, daftar bukti, dan sumber bukti.

**Alternate Flow**
- **A1: Data periode kosong (langkah 3).** Sistem menampilkan keadaan kosong beserta penjelasan, bukan angka nol tanpa konteks.
- **A2: Terdapat bukti belum lengkap (langkah 6).** Sistem menampilkan daftar bukti yang belum memenuhi ambang minimum ESG beserta unsur yang kurang.
- **A3: KPI di bawah target (langkah 3).** Sistem menandai KPI tersebut dan menampilkan rekomendasi aksi *(turunan analisis)*.
- **A4: Ekspor gagal (langkah 8).** Sistem menampilkan pesan kegagalan dan mempertahankan tampilan dashboard.

---

## 8. Functional Requirements (FR)

**Konvensi prioritas:** **M** = Must (MVP), **S** = Should (MVP bila memungkinkan), **C** = Could (opsional), **F** = Future (di luar mockup).

### 8.1 Modul A: Identitas, Keanggotaan & Ekosistem Terbuka

| ID | Requirement | Prioritas | US Terkait |
|---|---|:--:|---|
| FR-001 | Sistem menyediakan halaman utama microsite Pfriends berisi penjelasan inisiatif, dua komunitas utama, dan 6 pilar aktivitas. | M | US-001 |
| FR-002 | Sistem menyediakan formulir pendaftaran anggota dengan atribut: nama, nomor WhatsApp, email, jenis komunitas (SOBI/PFpreneur), pilar program (PFprestasi/PFmuda/PFsains/PFlestari), angkatan/batch, dan wilayah. | M | US-002 |
| FR-003 | Sistem memvalidasi keunikan nomor WhatsApp dan email pada saat pendaftaran. | M | US-002 |
| FR-004 | Sistem mewajibkan persetujuan pengolahan data pribadi sebelum pendaftaran dapat dikirim. | M | US-002, US-043 |
| FR-005 | Sistem mengelola siklus status keanggotaan: `MENUNGGU_VERIFIKASI` → `AKTIF` / `DITOLAK` / `PERLU_KLARIFIKASI` / `NONAKTIF`. | M | US-003 |
| FR-006 | Sistem menyediakan antrean verifikasi keanggotaan bagi admin dengan hasil pencocokan terhadap master data penerima manfaat. | M | US-003 |
| FR-007 | Sistem menyediakan halaman Rules Keanggotaan & Manfaat, termasuk tabel manfaat per tier. | M | US-004 |
| FR-008 | Sistem menyediakan halaman profil anggota berisi identitas, komunitas, pilar, angkatan, total poin, tier, dan riwayat kontribusi. | M | US-005 |
| FR-009 | Sistem memungkinkan anggota menyunting profil dan mengatur visibilitas profil (publik/privat). | M | US-005 |
| FR-010 | Sistem menyediakan atribut profil usaha bagi anggota PFpreneur: nama usaha, kategori, lokasi, deskripsi, kontak, dan hingga 5 produk. | M | US-006 |
| FR-011 | Sistem menyediakan direktori UMKM PFpreneur yang dapat difilter berdasarkan kategori dan lokasi. | S | US-006 |
| FR-012 | Sistem menyediakan direktori anggota dengan filter pilar, keahlian, komunitas, dan wilayah. | S | US-007 |
| FR-013 | Sistem menyediakan mekanisme masuk berbasis identitas terdaftar (nomor WhatsApp/email) dengan pemulihan sesi pada perangkat yang sama. | M | US-041 |
| FR-014 | Sistem menerapkan kontrol akses berbasis peran: `PUBLIC`, `MEMBER_SOBI`, `MEMBER_PRENEUR`, `MENTOR`, `ADMIN_KOMUNITAS`, `CORSEC_MANAGER`. | M | US-041, US-044 |
| FR-015 | Sistem menyediakan dasbor anggota berisi poin & tier, broadcast belum dibaca, kegiatan mendatang, tantangan berjalan, dan aksi yang disarankan. | M | US-042 |

### 8.2 Modul B: Kalender Komunitas & Chapter

| ID | Requirement | Prioritas | US Terkait |
|---|---|:--:|---|
| FR-016 | Sistem menyediakan kalender kegiatan komunitas dengan tampilan bulanan (desktop) dan daftar vertikal (mobile). | M | US-008 |
| FR-017 | Sistem mengklasifikasikan kegiatan ke dalam jenis: upskilling, pertemuan komunitas, dan sharing session. | M | US-008 |
| FR-018 | Sistem menyediakan filter kegiatan berdasarkan jenis, chapter, dan periode. | M | US-008 |
| FR-019 | Sistem menyediakan halaman detail kegiatan berisi deskripsi, waktu, kuota, narasumber, dan chapter penyelenggara. | M | US-009 |
| FR-020 | Sistem memungkinkan anggota mendaftar dan membatalkan pendaftaran kegiatan sebelum tenggat. | M | US-009 |
| FR-021 | Sistem menyediakan mekanisme daftar tunggu ketika kuota kegiatan penuh, dengan promosi otomatis saat ada pembatalan. | S | US-009 |
| FR-022 | Sistem menyediakan konfirmasi kehadiran sesi daring berbasis kode sesi dengan batas waktu klaim. | M | US-010 |
| FR-023 | Sistem mengelola chapter komunitas (wilayah/minat) beserta penanggung jawab dan daftar anggota. | M | US-011 |
| FR-024 | Sistem memungkinkan anggota bergabung dan keluar dari chapter. | M | US-011 |
| FR-025 | Sistem menyediakan konsol admin untuk membuat, menyunting, membatalkan, dan menyelesaikan kegiatan. | M | US-012 |
| FR-026 | Sistem memungkinkan admin menandai kegiatan `SELESAI` beserta jumlah peserta, catatan hasil, dan lampiran bukti. | M | US-012 |
| FR-027 | Sistem menampilkan pengingat kegiatan pada dasbor anggota mulai H-1 dan menyediakan unduhan berkas kalender (.ics). | S | US-013 |

### 8.3 Modul C: Movement-Based Program

| ID | Requirement | Prioritas | US Terkait |
|---|---|:--:|---|
| FR-028 | Sistem mengelola entitas Gerakan dengan kategori: aksi lingkungan, edukasi masyarakat, dan pemberdayaan ekonomi. | M | US-014 |
| FR-029 | Sistem menyediakan katalog gerakan dengan filter kategori dan wilayah. | M | US-014 |
| FR-030 | Sistem menampilkan detail gerakan berisi tujuan, periode, penanggung jawab, jumlah partisipan, dan tag ESG/SDG. | M | US-014 |
| FR-031 | Sistem memungkinkan anggota bergabung sebagai partisipan gerakan. | M | US-015 |
| FR-032 | Sistem memungkinkan anggota mengusulkan gerakan baru dengan alur persetujuan admin. | S | US-016 |
| FR-033 | Sistem menetapkan pengusul yang disetujui sebagai penggerak dan memberikan **50 pts**. | S | US-016 |
| FR-034 | Sistem menyediakan formulir laporan aksi lapangan berisi tanggal, lokasi, jumlah partisipan, foto, dan catatan hasil (*outcome note*). | M | US-017 |
| FR-035 | Sistem mewajibkan *outcome note* pada setiap laporan aksi sebagai syarat ESG evidence. | M | US-017 |
| FR-036 | Sistem memungkinkan admin memvalidasi laporan aksi dan mengembalikannya untuk perbaikan. | M | US-017 |
| FR-037 | Sistem memungkinkan penandaan pilar ESG (Environmental/Social/Governance) dan tag SDG pada gerakan, yang diwariskan ke laporan turunannya. | M | US-018 |
| FR-038 | Sistem menyediakan papan dampak berisi agregasi total gerakan, partisipan, lokasi, dan sebaran kategori. | C | US-019 |

### 8.4 Modul D: Diseminasi & Amplifikasi Informasi

| ID | Requirement | Prioritas | US Terkait |
|---|---|:--:|---|
| FR-039 | Sistem mengelola entitas Konten dengan siklus status `DRAF` → `MENUNGGU_PERSETUJUAN` → `TERBIT` → `ARSIP`. | M | US-025 |
| FR-040 | Sistem menyediakan konsol admin untuk menyusun konten berisi judul, isi, gambar, kategori, tag ESG/SDG, dan *light CTA*. | M | US-025 |
| FR-041 | Sistem mencatat setiap konten yang berstatus `TERBIT` sebagai capaian KPI-02 pada bulan berjalan. | M | US-025, US-044 |
| FR-042 | Sistem mencatat setiap kampanye diseminasi yang dijalankan sebagai satu peristiwa untuk KPI-03. | M | US-025, US-044 |
| FR-043 | Sistem menyediakan daftar broadcast bagi anggota dengan penanda konten yang belum dibaca. | M | US-020 |
| FR-044 | Sistem mencatat peristiwa baca broadcast dan memberikan **1 pt**, sekali per anggota per konten. | M | US-020 |
| FR-045 | Sistem menyediakan mekanisme *light CTA* (reaksi/balasan singkat) dan memberikan **2 pts**, sekali per anggota per CTA. | M | US-021 |
| FR-046 | Sistem menyediakan aksi berbagi ke WhatsApp/jaringan privat beserta tautan berpenanda, dan memberikan **5 pts** setelah konfirmasi anggota. | M | US-022 |
| FR-047 | Sistem menyediakan aksi berbagi ke media sosial publik dengan pengiriman bukti (tautan unggahan atau tangkapan layar), dan memberikan **8 pts** setelah verifikasi admin. | M | US-023 |
| FR-048 | Sistem menolak pengiriman bukti amplifikasi duplikat untuk pasangan anggota–konten yang sama. | M | US-023 |
| FR-049 | Sistem menyediakan antrean verifikasi bukti amplifikasi dengan dukungan persetujuan/penolakan secara batch beserta alasan. | M | US-024 |
| FR-050 | Sistem menyediakan status `PERLU_KLARIFIKASI` pada bukti amplifikasi agar anggota dapat mengunggah ulang bukti. | S | US-024 |
| FR-051 | Sistem menyediakan share kit per konten berisi teks siap salin dan gambar siap unduh. | S | US-026 |
| FR-052 | Sistem menyediakan segmentasi penerima kampanye diseminasi berdasarkan komunitas, pilar, chapter, dan tier. | S | US-025 |

### 8.5 Modul E: Gamifikasi, Tier & Recognition

| ID | Requirement | Prioritas | US Terkait |
|---|---|:--:|---|
| FR-053 | Sistem menerapkan tabel skor kontribusi persis sesuai ketentuan: baca broadcast **1**, reaksi/balasan CTA **2**, berbagi ke WA/jaringan privat **5**, berbagi ke media sosial publik **8**, kirim story/nominasi/survei **10**, hadir sesi daring **15**, tanya/jawab bermanfaat **15**, menjadi speaker/mentor/fasilitator **30**, memimpin aksi/kampanye lokal **50**. | M | US-029 |
| FR-054 | Sistem mencatat setiap perolehan poin sebagai transaksi ber-status (`MENUNGGU_VERIFIKASI`, `TERVERIFIKASI`, `DITOLAK`, `DIBATALKAN`) pada buku besar kontribusi. | M | US-030 |
| FR-055 | Sistem menghitung poin ke total anggota hanya untuk transaksi berstatus `TERVERIFIKASI`. | M | US-030 |
| FR-056 | Sistem menerapkan aturan anti-duplikasi per jenis aksi agar poin menghargai kontribusi bermakna, bukan aktivitas spam. | M | US-021, US-023 |
| FR-057 | Sistem menentukan tier berdasarkan poin kumulatif dengan ambang: **25 pts Active Member**, **50 pts Contributor**, **100 pts Featured Candidate**, **150 pts Champion**. | M | US-027 |
| FR-058 | Sistem menampilkan tier dengan kode warna: Active Member biru, Contributor hijau, Featured Candidate merah, Champion kuning. | M | US-027 |
| FR-059 | Sistem menampilkan indikator progres beserta selisih poin menuju ambang tier berikutnya. | M | US-028 |
| FR-060 | Sistem menampilkan manfaat per tier: Active Member *eligible for monthly digest mention*; Contributor *eligible for community recognition*; Featured Candidate *eligible for website or social media feature*; Champion *eligible for mentor / speaker / regional champion invitation*. | M | US-034 |
| FR-061 | Sistem menampilkan manfaat yang belum terbuka dalam keadaan terkunci beserta syarat pembukanya. | M | US-034 |
| FR-062 | Sistem menyediakan halaman katalog aksi & nilai poin yang transparan bagi seluruh anggota. | M | US-029 |
| FR-063 | Sistem menyediakan leaderboard TOP Contribution dengan filter periode dan komunitas, serta menampilkan posisi anggota yang sedang masuk meskipun di luar 10 besar. | M | US-031 |
| FR-064 | Sistem menyamarkan identitas anggota berprofil privat pada leaderboard tanpa mengeluarkannya dari perhitungan peringkat. | S | US-031 |
| FR-065 | Sistem menyediakan mekanisme nominasi dan penerbitan penghargaan TOP Awardee dengan karir bagus, dengan syarat consent anggota. | S | US-032 |
| FR-066 | Sistem menyediakan katalog penukaran poin beserta syarat poin dan ketersediaan stok. | S | US-033 |
| FR-067 | Sistem memisahkan **saldo poin** (berkurang saat penukaran) dari **poin kumulatif** (dasar penentuan tier, tidak berkurang). | S | US-033 |
| FR-068 | Sistem mencatat siklus penukaran: `DIPROSES` → `SELESAI` / `DIBATALKAN` dengan pengembalian poin pada pembatalan. | S | US-033 |

### 8.6 Modul F: Community Journalism & Story Bank

| ID | Requirement | Prioritas | US Terkait |
|---|---|:--:|---|
| FR-069 | Sistem mengelola entitas Tantangan Komunitas dengan tema pengurangan sampah, kampanye energi bersih, dan program edukasi masyarakat, beserta periode dan ketentuan. | M | US-035 |
| FR-070 | Sistem memungkinkan anggota mengikuti tantangan yang berstatus aktif dan menutup partisipasi setelah periode berakhir. | M | US-035 |
| FR-071 | Sistem menyediakan formulir pengiriman story berisi judul, narasi, foto, lokasi, tanggal, dan rujukan tantangan/gerakan, serta memberikan **10 pts** saat story dikirim. | M | US-036 |
| FR-072 | Sistem mewajibkan consent publikasi dan pernyataan persetujuan pihak ketiga atas foto sebelum story dapat dikirim. | M | US-036, US-043 |
| FR-073 | Sistem mengelola siklus status story: `DRAF` → `MENUNGGU_KURASI` → `TERVERIFIKASI` → `TERPUBLIKASI` / `DITOLAK`. | M | US-037 |
| FR-074 | Sistem menyediakan antrean kurasi story bagi admin dengan checklist kelayakan termasuk pemeriksaan *sensitive-data concern*. | M | US-037 |
| FR-075 | Sistem menegakkan syarat publikasi publik: **100 poin + verified story + consent + validasi PF + tidak ada masalah data sensitif**, dan menolak publikasi bila salah satu belum terpenuhi. | M | US-038 |
| FR-076 | Sistem menampilkan featured story pada halaman publik dengan atribusi penulis sesuai preferensi consent. | M | US-038 |
| FR-077 | Sistem menarik story dari tampilan publik secara otomatis ketika penulis mencabut consent. | M | US-043 |
| FR-078 | Sistem menyediakan story bank dengan pencarian berdasarkan tema, pilar ESG, wilayah, dan periode, serta ekspor terpilih. | S | US-039 |
| FR-079 | Sistem menyediakan modul tanya jawab bermanfaat dengan penandaan admin sebagai dasar pemberian **15 pts**. | S | US-040 |

### 8.7 Modul G: Governance, KPI & ESG Evidence

| ID | Requirement | Prioritas | US Terkait |
|---|---|:--:|---|
| FR-080 | Sistem menyimpan catatan consent berisi jenis persetujuan, waktu, dan versi kebijakan, serta riwayat perubahannya. | M | US-043 |
| FR-081 | Sistem menyediakan pengaturan privasi bagi anggota untuk mengatur izin publikasi nama, foto, dan cerita. | M | US-043 |
| FR-082 | Sistem mencatat jejak audit *append-only* berisi aktor, waktu, objek, aksi, dan alasan untuk setiap keputusan administratif. | M | US-046 |
| FR-083 | Sistem menyediakan dashboard KPI aktivitas yang menampilkan lima KPI resmi beserta pencapaiannya terhadap target: **75%** pendataan, **1–2** konten/bulan, **≥2** diseminasi/bulan, **50%** amplifikasi anggota, **2** aktivitas engagement. | M | US-044 |
| FR-084 | Sistem menandai secara visual KPI yang belum mencapai target. | M | US-044 |
| FR-085 | Sistem menyediakan penelusuran (*drill-down*) dari angka KPI hingga bukti kontribusi individual. | M | US-044 |
| FR-086 | Sistem menyediakan pemilihan periode pelaporan yang memengaruhi seluruh angka dashboard. | M | US-044 |
| FR-087 | Sistem menyediakan dashboard ESG evidence yang mengagregasi tiga pilar beserta metriknya: participants/locations/action reports/photos/outcomes (E); alumni progress/mentoring hours/business growth/event completion (S); consent records/approved stories/metadata/audit trail/issue log (G). | S | US-045 |
| FR-088 | Sistem menegakkan ambang minimum ESG evidence: **documented activity + outcome note + ESG/SDG tag + evidence source**, dan mengeluarkan bukti tidak lengkap dari agregasi. | S | US-045 |
| FR-089 | Sistem menyediakan ekspor laporan KPI dan ESG evidence beserta daftar bukti dan sumbernya. | S | US-045, US-044 |
| FR-090 | Sistem menyimpan estimasi jangkauan sosial per anggota (**25–500**) sebagai dasar kalkulasi potensi jangkauan organik komunitas. | C | US-044 |
| FR-091 | Sistem menampilkan proyeksi jangkauan organik komunitas berdasarkan jumlah anggota aktif dan estimasi jangkauan per anggota. | C | US-044 |
| FR-092 | Sistem menampilkan indikator konversi reputasi: potensi penurunan kebutuhan paid media **5–20%** dan perbandingan engagement rate **2–3×** terhadap baseline akun brand. | C | US-044 |

---

## 9. Non-Functional Requirements (NFR)

### 9.1 Performa & Efisiensi

| ID | Requirement | Ukuran Keberterimaan |
|---|---|---|
| NFR-001 | Halaman utama microsite dapat digunakan dengan cepat pada jaringan seluler kelas menengah. | *Largest Contentful Paint* ≤ 2,5 detik pada simulasi jaringan 4G lambat |
| NFR-002 | Interaksi antarmuka merespons tanpa jeda yang mengganggu. | *Interaction to Next Paint* ≤ 200 ms |
| NFR-003 | Ukuran muatan awal halaman ditekan agar hemat kuota, mengingat sebagian anggota memiliki kuota terbatas. | Bundel JavaScript awal ≤ 250 KB terkompresi |
| NFR-004 | Daftar berukuran besar (direktori anggota, riwayat poin, leaderboard) dimuat bertahap. | Paginasi/virtualisasi pada daftar > 50 baris |
| NFR-005 | Gambar diunggah dan ditampilkan dalam ukuran teroptimasi. | Kompresi otomatis; batas unggah 5 MB per berkas |
| NFR-006 | Perhitungan poin dan tier terlihat mutakhir segera setelah kontribusi terverifikasi. | Pembaruan tampilan ≤ 1 detik setelah peristiwa verifikasi |

### 9.2 Aksesibilitas

| ID | Requirement | Ukuran Keberterimaan |
|---|---|---|
| NFR-007 | Antarmuka memenuhi **WCAG 2.1 Level AA**. | Audit aksesibilitas tanpa temuan kategori *serious/critical* |
| NFR-008 | Rasio kontras teks memenuhi ambang AA. | ≥ 4,5:1 untuk teks normal; ≥ 3:1 untuk teks besar dan komponen antarmuka |
| NFR-009 | Warna tier tidak menjadi satu-satunya pembawa makna. | Setiap tier disertai label teks dan/atau ikon selain warna biru/hijau/merah/kuning |
| NFR-010 | Seluruh fungsi dapat dioperasikan dengan papan ketik. | Urutan fokus logis; indikator fokus terlihat; tanpa *keyboard trap* |
| NFR-011 | Struktur halaman terbaca oleh pembaca layar. | Hierarki heading benar, *landmark* semantik, label pada seluruh kolom isian |
| NFR-012 | Target sentuh berukuran memadai untuk penggunaan satu tangan. | Minimal 44 × 44 piksel |
| NFR-013 | Antarmuka menghormati preferensi pengurangan animasi. | Animasi non-esensial dinonaktifkan saat `prefers-reduced-motion` aktif |

### 9.3 Keamanan, Privasi & Kepatuhan Data Pribadi

| ID | Requirement | Ukuran Keberterimaan |
|---|---|---|
| NFR-014 | Pengumpulan data pribadi didasarkan pada persetujuan eksplisit dan terekam. | Tidak ada data pribadi tersimpan tanpa catatan consent yang bertanggal dan berversi |
| NFR-015 | Sistem menerapkan prinsip minimalisasi data. | Hanya atribut yang dibutuhkan KPI dan operasional komunitas yang dikumpulkan |
| NFR-016 | Anggota dapat mencabut consent dan meminta penghapusan data. | Pencabutan menarik konten publik terkait; permintaan penghapusan tercatat pada jejak audit |
| NFR-017 | Data sensitif tidak ditampilkan pada permukaan publik. | Nomor WhatsApp dan email tidak pernah tampil pada halaman publik atau direktori |
| NFR-018 | Akses fitur dibatasi sesuai peran. | Setiap rute dan aksi memeriksa peran; kegagalan otorisasi tidak membocorkan keberadaan data |
| NFR-019 | Keputusan administratif dapat diaudit. | Jejak audit *append-only*, tidak dapat disunting atau dihapus dari antarmuka |
| NFR-020 | Data mockup pada perangkat pengguna tidak menyimpan data pribadi nyata. | Basis data lokal hanya berisi data seed fiktif; tersedia mekanisme pengaturan ulang data |

### 9.4 Responsivitas & Kompatibilitas

| ID | Requirement | Ukuran Keberterimaan |
|---|---|---|
| NFR-021 | Antarmuka dirancang **mobile-first**, mengingat mayoritas anggota mengakses melalui tautan WhatsApp di ponsel. | Tata letak utuh mulai lebar 320 px; tanpa *horizontal scroll* pada seluruh titik henti |
| NFR-022 | Konten lebar (tabel, grafik, kalender) tidak merusak tata letak halaman. | Elemen lebar digulir di dalam wadahnya sendiri |
| NFR-023 | Antarmuka berfungsi pada peramban dalam aplikasi WhatsApp. | Uji pada WebView Android dan iOS; tanpa ketergantungan fitur peramban eksperimental |
| NFR-024 | Sistem mendukung dua versi terakhir peramban utama. | Chrome, Safari, Firefox, Edge: desktop dan mobile |

### 9.5 Kegunaan & Bahasa

| ID | Requirement | Ukuran Keberterimaan |
|---|---|---|
| NFR-025 | Seluruh antarmuka menggunakan **Bahasa Indonesia**. | Tidak ada teks antarmuka berbahasa Inggris kecuali istilah baku tier dan skema poin |
| NFR-026 | Alur inti dapat diselesaikan tanpa pelatihan, mengikuti tingkat literasi digital persona PFpreneur. | Pendaftaran ≤ 5 langkah; amplifikasi ≤ 3 ketukan dari halaman konten |
| NFR-027 | Pesan galat bersifat menjelaskan dan menyarankan tindakan. | Setiap galat menyebutkan penyebab dan langkah perbaikan |
| NFR-028 | Keadaan kosong memberi konteks, bukan sekadar tampilan hampa. | Setiap daftar kosong menampilkan penjelasan dan ajakan tindakan |

### 9.6 Arsitektur, Keterpeliharaan & Portabilitas

| ID | Requirement | Ukuran Keberterimaan |
|---|---|---|
| NFR-029 | Logika domain terpisah dari komponen antarmuka. | Aturan poin, tier, dan kelayakan publikasi berada pada lapisan domain, bukan pada komponen tampilan |
| NFR-030 | Akses data melalui abstraksi repository sehingga sumber data dapat ditukar tanpa mengubah domain. | Penggantian sumber data lokal ke API tidak mengubah entitas dan service domain |
| NFR-031 | Nilai skor dan ambang tier terpusat pada satu sumber konfigurasi. | Perubahan nilai cukup dilakukan pada satu berkas konfigurasi domain |
| NFR-032 | Sistem berjalan sebagai aplikasi statis tanpa backend pada tahap mockup. | Dapat dilayani sebagai berkas statis; persistensi lokal pada peramban |

---

## 10. Requirement Traceability Matrix (RTM)

### 10.1 KPI → Functional Requirement → User Story

| KPI | Target | Functional Requirement Pendukung | User Story Pendukung |
|---|---|---|---|
| **KPI-01**: 75% penerima manfaat terdata | 75% | FR-002, FR-003, FR-004, FR-005, FR-006, FR-008, FR-010, FR-013, FR-083, FR-085 | US-001, US-002, US-003, US-005, US-006, US-041, US-044 |
| **KPI-02**: 1–2 konten terdiseminasi/bulan | 1–2 | FR-039, FR-040, FR-041, FR-043, FR-052, FR-083, FR-086 | US-020, US-025, US-044 |
| **KPI-03**: Diseminasi ≥ 2 kali/bulan | ≥ 2 | FR-039, FR-042, FR-052, FR-083, FR-086 | US-025, US-044 |
| **KPI-04**: 50% anggota beramplifikasi | 50% | FR-044, FR-045, FR-046, FR-047, FR-048, FR-049, FR-050, FR-051, FR-053, FR-054, FR-055, FR-056, FR-083, FR-085 | US-020, US-021, US-022, US-023, US-024, US-026, US-029, US-030, US-044 |
| **KPI-05**: 2 aktivitas engagement terlaksana | 2 | FR-016, FR-017, FR-019, FR-020, FR-022, FR-025, FR-026, FR-028, FR-031, FR-034, FR-036, FR-069, FR-070, FR-083 | US-008, US-009, US-010, US-012, US-014, US-015, US-017, US-035, US-044 |
| **KPI-06**: 25–500 jaringan sosial/anggota | 25–500 | FR-090, FR-091 | US-044 |
| **KPI-07**: Penurunan paid media 5–20% | 5–20% | FR-092, FR-047, FR-049 | US-023, US-024, US-044 |
| **KPI-08**: Engagement rate 2–3× | 2–3× | FR-092, FR-046, FR-047 | US-022, US-023, US-044 |
| **KPI-ESG-01**: Environmental |: | FR-028, FR-030, FR-034, FR-035, FR-037, FR-069, FR-087, FR-088, FR-089 | US-014, US-017, US-018, US-035, US-036, US-045 |
| **KPI-ESG-02**: Social |: | FR-010, FR-011, FR-022, FR-026, FR-060, FR-065, FR-071, FR-087, FR-088 | US-006, US-010, US-012, US-032, US-034, US-036, US-045 |
| **KPI-ESG-03**: Governance |: | FR-004, FR-072, FR-074, FR-075, FR-077, FR-080, FR-081, FR-082, FR-087, FR-088 | US-037, US-038, US-043, US-046, US-045 |

### 10.2 Pilar Aktivitas → Functional Requirement → User Story

| Pilar | Functional Requirement | User Story | Jumlah US |
|---|---|---|---:|
| 01: Open Community Ecosystem | FR-001 … FR-012 | US-001 … US-007 | 7 |
| 02: Kalender Komunitas | FR-016 … FR-027 | US-008 … US-013 | 6 |
| 03: Movement-Based Program | FR-028 … FR-038 | US-014 … US-019 | 6 |
| 04: Diseminasi & Amplifikasi | FR-039 … FR-052 | US-020 … US-026 | 7 |
| 05: Recognition & Gamifikasi | FR-053 … FR-068 | US-027 … US-034 | 8 |
| 06: Community Journalism | FR-069 … FR-079 | US-035 … US-040 | 6 |
| 00: Fondasi Lintas Pilar | FR-013 … FR-015, FR-080 … FR-092 | US-041 … US-046 | 6 |
| **Total** | **92 FR** | **46 US** | **46** |

### 10.3 Use Case → User Story → Functional Requirement

| Use Case | User Story | Functional Requirement Inti |
|---|---|---|
| UC-01 Registrasi & Onboarding | US-001, US-002, US-003, US-043 | FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-080 |
| UC-02 Masuk & Dasbor | US-041, US-042 | FR-013, FR-014, FR-015 |
| UC-03 Diseminasi Konten | US-025, US-026 | FR-039, FR-040, FR-041, FR-042, FR-051, FR-052 |
| UC-04 Amplifikasi Konten | US-022, US-023, US-026 | FR-046, FR-047, FR-048, FR-051, FR-053, FR-054 |
| UC-05 Verifikasi Bukti | US-024 | FR-049, FR-050, FR-055, FR-056, FR-082, FR-083 |
| UC-06 Kegiatan & Kehadiran | US-008, US-009, US-010, US-012, US-013 | FR-016 … FR-027, FR-053 |
| UC-07 Pengiriman Story | US-036 | FR-071, FR-072, FR-073, FR-080 |
| UC-08 Kurasi & Publikasi Story | US-037, US-038, US-039 | FR-073, FR-074, FR-075, FR-076, FR-077, FR-078, FR-082 |
| UC-09 Poin & Tier | US-027, US-028, US-029, US-030, US-034 | FR-053 … FR-062 |
| UC-10 Penukaran Poin | US-033 | FR-066, FR-067, FR-068, FR-082 |
| UC-11 Movement & Pelaporan | US-014 … US-018 | FR-028 … FR-037 |
| UC-12 Monitoring KPI & ESG | US-044, US-045, US-046 | FR-083 … FR-092, FR-082 |

### 10.4 Persona → User Story Prioritas

| Persona | User Story Paling Relevan |
|---|---|
| Raka (alumni bekerja) | US-005, US-007, US-023, US-032, US-034, US-040, US-009 |
| Salsabila (fresh graduate) | US-020, US-021, US-023, US-027, US-028, US-036, US-038, US-042 |
| Nurhayati (PFpreneur) | US-006, US-011, US-022, US-036, US-010, US-033 |
| Fajar (admin/PIC) | US-003, US-012, US-024, US-025, US-037, US-044, US-045, US-046 |

---

## 11. Scope MVP vs Future

### 11.1 Prinsip Penentuan Scope

*(turunan analisis)*
Sesuai arahan **Strategic Enhancement** halaman 9: *"Bukti pipeline before dashboard"*: MVP memprioritaskan **pembangunan pipeline bukti** (pendataan, kontribusi, verifikasi, consent, audit) sebelum lapisan analitik lanjutan. Fitur yang tidak berkontribusi langsung pada 5 KPI aktivitas ditunda.

### 11.2 In Scope: MVP Mockup

| Modul | Cakupan MVP | FR Terkait |
|---|---|---|
| Landing & Ekosistem Terbuka | Halaman utama, pendaftaran, verifikasi admin, rules & manfaat, profil anggota, profil usaha PFpreneur, direktori | FR-001 … FR-012 |
| Identitas & Akses | Masuk berbasis identitas terdaftar, RBAC 6 peran, dasbor anggota | FR-013 … FR-015 |
| Kalender Komunitas | Kalender, detail & pendaftaran kegiatan, kehadiran berbasis kode sesi, chapter, konsol kegiatan admin, pengingat | FR-016 … FR-027 |
| Movement-Based Program | Katalog gerakan, bergabung, usulan gerakan, laporan aksi + outcome note, validasi, penandaan ESG/SDG | FR-028 … FR-037 |
| Diseminasi & Amplifikasi | Konsol konten, penerbitan, broadcast, light CTA, berbagi privat & publik, antrean verifikasi bukti, share kit | FR-039 … FR-052 |
| Gamifikasi & Recognition | Tabel skor 9 aksi, buku besar kontribusi, 4 tier dengan ambang & warna resmi, progres, manfaat per tier, leaderboard, penukaran poin | FR-053 … FR-068 |
| Community Journalism | Tantangan, pengiriman story + consent, kurasi, syarat publikasi publik, story bank, tanya jawab bermanfaat | FR-069 … FR-079 |
| Governance & KPI | Catatan consent, pengaturan privasi, jejak audit, dashboard KPI aktivitas, dashboard ESG evidence, ekspor | FR-080 … FR-089 |

**Karakter teknis MVP**

| Aspek | Ketentuan |
|---|---|
| Backend | Tidak ada: data dari seed + persistensi lokal peramban |
| Autentikasi | Simulasi berbasis identitas terdaftar, tanpa kata sandi produksi |
| Integrasi WhatsApp | Simulasi: tautan `wa.me` dan konfirmasi manual oleh anggota |
| Verifikasi bukti | Manual oleh admin melalui antrean, tanpa pemeriksaan otomatis media sosial |
| Notifikasi | Dalam aplikasi (dasbor), bukan *push* atau pesan WhatsApp otomatis |
| Data | Seluruhnya fiktif; tidak memuat data pribadi nyata |

### 11.3 Out of Scope: Future

| ID | Kapabilitas | Alasan Penundaan | Fase |
|---|---|---|---|
| FUT-01 | Integrasi WhatsApp Business API untuk broadcast dan notifikasi otomatis | Membutuhkan kontrak penyedia dan verifikasi bisnis | Fase 2 |
| FUT-02 | Verifikasi amplifikasi otomatis melalui API media sosial | Bergantung pada kebijakan platform pihak ketiga | Fase 2 |
| FUT-03 | Sinkronisasi otomatis master data penerima manfaat dari sistem PF | Membutuhkan koordinasi dengan Fungsi IT dan pemilik data | Fase 2 |
| FUT-04 | Dashboard SROI penuh | Dokumen sumber mensyaratkan pipeline bukti dibangun lebih dulu | Fase 3 |
| FUT-05 | Marketplace/etalase transaksional produk PFpreneur | Melibatkan pembayaran dan logistik di luar lingkup komunitas | Fase 3 |
| FUT-06 | Modul pengadaan (contoh: souvenir) yang menghubungkan UMKM ke rantai pasok Pertamina | Membutuhkan proses vendor management korporat | Fase 3 |
| FUT-07 | Aplikasi mobile native | Microsite responsif dinilai memadai untuk kebutuhan saat ini | Fase 3 |
| FUT-08 | Sistem pencocokan mentor–mentee otomatis | Membutuhkan basis data kompetensi yang matang lebih dulu | Fase 2 |
| FUT-09 | Notifikasi *push* dan surel transaksional | Bergantung pada infrastruktur pengiriman | Fase 2 |
| FUT-10 | Analitik prediktif churn anggota | Membutuhkan data historis minimal beberapa siklus | Fase 3 |
| FUT-11 | Dukungan multibahasa | Basis anggota berbahasa Indonesia | Fase 3 |
| FUT-12 | Single Sign-On dengan akun korporat Pertamina | Membutuhkan keputusan arsitektur identitas Fungsi IT | Fase 2 |

### 11.4 Definition of Done: MVP Mockup

| # | Kriteria |
|---|---|
| 1 | Seluruh FR berprioritas **M** terimplementasi dan dapat didemonstrasikan |
| 2 | Skor kontribusi dan ambang tier persis sesuai dokumen sumber, terpusat pada satu konfigurasi domain |
| 3 | Kelima KPI aktivitas tampil pada dashboard dengan data yang tertelusur hingga kontribusi individual |
| 4 | Alur end-to-end empat persona dapat didemonstrasikan tanpa jalan buntu |
| 5 | Antarmuka lolos audit aksesibilitas tanpa temuan *serious/critical* |
| 6 | Seluruh teks antarmuka berbahasa Indonesia |
| 7 | Tidak ada logika domain yang berada di dalam komponen tampilan |
| 8 | Tidak terdapat data pribadi nyata pada seed maupun penyimpanan lokal |

---

## 12. Asumsi, Batasan & Risiko

### 12.1 Asumsi

| ID | Asumsi | Dampak bila tidak terpenuhi |
|---|---|---|
| AS-01 | Master data penerima manfaat PFprestasi dan PFpreneur telah terkumpul dan tervalidasi (milestone Januari 2026) | KPI-01 tidak memiliki penyebut yang sah |
| AS-02 | WA Komunitas tetap beroperasi sebagai kanal jangkauan utama | Onboarding ke microsite kehilangan pintu masuk utamanya |
| AS-03 | Divisi Corsec menyediakan pasokan konten Pertamina/PF secara rutin | KPI-02 dan KPI-03 tidak dapat dipenuhi |
| AS-04 | Terdapat PIC komunitas yang menjalankan verifikasi bukti secara berkala | Antrean verifikasi menumpuk; poin tertunda; motivasi anggota turun |
| AS-05 | Anggota bersedia mengunggah bukti amplifikasi secara sukarela | KPI-04 tidak terukur meski amplifikasi terjadi |
| AS-06 | Fungsi IT menyediakan penempatan kotak biru Pfriends pada `pertaminafoundation.org` | Jalur akses publik ke microsite terbatas |

### 12.2 Batasan

| ID | Batasan |
|---|---|
| BT-01 | Rilis ini adalah **mockup**: tidak terhubung ke backend, basis data korporat, maupun sistem PF lainnya |
| BT-02 | Seluruh angka gamifikasi dan KPI mengikuti dokumen sumber dan tidak boleh diubah tanpa persetujuan Corsec |
| BT-03 | Verifikasi bukti amplifikasi dilakukan manual: kapasitas verifikasi membatasi skala komunitas aktif |
| BT-04 | Persistensi data mockup bersifat lokal per peramban dan per perangkat; data tidak tersinkronisasi antar pengguna |
| BT-05 | Bahasa antarmuka tunggal: Bahasa Indonesia |

### 12.3 Risiko

| ID | Risiko | Dampak | Kemungkinan | Mitigasi |
|---|---|---|---|---|
| RS-01 | Anggota memburu poin melalui aktivitas dangkal (*point farming*) | Kualitas kontribusi turun; KPI tampak baik namun tidak bermakna | Tinggi | Verifikasi manual, aturan anti-duplikasi, pembatalan poin oleh admin (FR-056, FR-049) |
| RS-02 | Beban verifikasi melampaui kapasitas admin seiring pertumbuhan anggota | Antrean menumpuk; poin tertunda; kepercayaan anggota turun | Tinggi | Persetujuan batch, prioritas antrean, kanal privat langsung terverifikasi (FR-046, FR-049) |
| RS-03 | Story dipublikasikan tanpa consent yang memadai | Risiko reputasi dan kepatuhan data pribadi | Sedang | Gerbang publikasi berlapis lima syarat (FR-075), catatan consent (FR-080), penarikan otomatis (FR-077) |
| RS-04 | Anggota tidak berpindah dari WhatsApp ke microsite | KPI-01 dan KPI-04 tidak tercapai | Sedang | Posisi microsite sebagai pelengkap, bukan pengganti; alur ringan; tautan langsung dari WA |
| RS-05 | Persona berliterasi digital terbatas gagal menyelesaikan pendaftaran | Segmen PFpreneur kurang terwakili | Sedang | Alur ≤ 5 langkah, mobile-first, pendampingan admin (NFR-026, NFR-021) |
| RS-06 | Data penerima manfaat tidak konsisten antar sumber | Verifikasi keanggotaan tersendat | Sedang | Status `PERLU_KLARIFIKASI` dan verifikasi manual berbasis dokumen (FR-005, FR-006) |
| RS-07 | Konten diseminasi tidak tersedia rutin | KPI-02 dan KPI-03 gagal | Sedang | Dashboard target bulanan dengan penanda visual (FR-083, FR-084) |
| RS-08 | Leaderboard memicu persaingan tidak sehat antar anggota | Iklim komunitas memburuk, berlawanan dengan *sense of community* | Rendah | Filter periode, penekanan pada tier (kolaboratif) bukan peringkat semata, penyamaran profil privat (FR-063, FR-064) |

---

## 13. Glosarium

| Istilah | Definisi |
|---|---|
| **Pfriends** | Nama microsite komunitas Community Connect Initiative; juga nama "kotak biru" pintu masuk pada `pertaminafoundation.org` |
| **SOBI / Sobat Bumi Indonesia** | Komunitas alumni penerima Beasiswa Sobat Bumi Pertamina Foundation |
| **PFpreneur / Womenpreneur** | Komunitas pelaku UMKM binaan Pertamina Foundation, termasuk UMKM unggulan binaan PT Pertamina (Persero) |
| **Pilar Program** | Empat lini program Pertamina Foundation: PFprestasi, PFmuda, PFsains, PFlestari |
| **Pilar Aktivitas** | Enam kelompok aktivitas komunitas pada halaman 5 dokumen sumber |
| **Chapter** | Pembagian komunitas berdasarkan wilayah atau minat |
| **Broadcast** | Konten informasi Pertamina/PF yang didistribusikan ke anggota komunitas |
| **Light CTA** | Ajakan bertindak ringan pada konten (reaksi atau balasan singkat) |
| **Amplifikasi** | Tindakan anggota membagikan konten Pertamina/PF ke jaringan pribadi atau media sosial publik |
| **Story Bank** | Kumpulan story komunitas terverifikasi sebagai bahan komunikasi dan pelaporan |
| **Featured Story** | Story terpilih yang dipublikasikan ke kanal publik setelah memenuhi lima syarat kelayakan |
| **Tier** | Tingkat kontribusi anggota: Active Member (25), Contributor (50), Featured Candidate (100), Champion (150) |
| **Poin Kumulatif** | Total poin yang pernah diperoleh anggota; menjadi dasar penentuan tier dan tidak berkurang oleh penukaran |
| **Saldo Poin** | Poin yang tersedia untuk ditukarkan; berkurang saat penukaran |
| **Outcome Note** | Catatan hasil yang wajib menyertai laporan aksi sebagai syarat ESG evidence |
| **ESG Evidence** | Bukti dampak yang memenuhi ambang: documented activity + outcome note + ESG/SDG tag + evidence source |
| **SROI** | Social Return on Investment: pengukuran nilai sosial atas investasi program |
| **Sense of Community Theory** | Teori McMillan & Chavis (1986) yang menjadi landasan konseptual aktivitas komunitas |
| **Organic Brand Amplifier** | Peran komunitas sebagai penguat pesan merek tanpa biaya iklan berbayar |

---

## Lampiran A: Ringkasan Nilai Mengikat dari Dokumen Sumber

> Nilai-nilai berikut **tidak boleh diubah** dalam implementasi. Setiap perubahan memerlukan persetujuan tertulis Divisi Corsec.

### A.1 Skema Poin Kontribusi (Hal. 11)

| Aksi | Poin |
|---|---:|
| View / read weekly broadcast | **1** |
| React or reply to light CTA | **2** |
| Share PF content to WA / private network | **5** |
| Share PF content to public social media | **8** |
| Submit story / nomination / survey | **10** |
| Attend online session | **15** |
| Ask useful question / share useful answer | **15** |
| Become speaker / mentor / facilitator | **30** |
| Lead local action / campaign | **50** |

> *Points should reward meaningful contribution, not spammy activity.*

### A.2 Tier & Ambang (Hal. 12)

| Threshold | Tier | Warna | Benefit |
|---:|---|---|---|
| **25 pts** | Active Member | Biru `#2E7CD6` | eligible for monthly digest mention |
| **50 pts** | Contributor | Hijau `#7CB342` | eligible for community recognition |
| **100 pts** | Featured Candidate | Merah `#E53935` | eligible for website or social media feature |
| **150 pts** | Champion | Kuning `#F0B429` | eligible for mentor / speaker / regional champion invitation |

### A.3 Gerbang Kelayakan (Hal. 12)

| Gerbang | Syarat |
|---|---|
| **Minimum for public feature** | 100 points + verified story + consent + PF validation + no sensitive-data concern |
| **Minimum for ESG evidence** | Documented activity + outcome note + ESG/SDG tag + evidence source |

### A.4 Target KPI (Hal. 6)

| KPI | Target |
|---|---|
| Pendataan penerima manfaat | **75%** |
| Konten terdiseminasi per bulan | **1–2** |
| Frekuensi diseminasi per bulan | **minimal 2 kali** |
| Anggota melakukan amplifikasi | **50%** |
| Aktivitas engagement terlaksana | **2** |
| Jaringan sosial per anggota | **25–500** |
| Potensi jangkauan (100 anggota aktif) | **250 – 50.000 orang** |
| Penurunan kebutuhan paid media | **5–20%** |
| Engagement rate vs akun brand | **2–3×** |

---

*Dokumen ini disusun berdasarkan `docs/00-SOURCE-BRIEF.md` sebagai satu-satunya sumber kebenaran. Setiap perbedaan interpretasi diselesaikan dengan merujuk kembali ke dokumen sumber.*
