# 02: Model Pengukuran KPI "Pfriends"

> **Turunan langsung dari** `00-SOURCE-BRIEF.md` (Hal 6, 9, 10, 11, 12).
> Semua angka target, poin, dan threshold di dokumen ini **identik** dengan sumber. Setiap angka yang
> *tidak* berasal dari sumber ditandai eksplisit dengan penanda **`[ASUMSI]`** dan wajib dikonfirmasi
> ke tim Corsec sebelum masuk produksi.

**Peran dokumen:** kontrak pengukuran antara Corsec (pemilik KPI) dan developer (implementor).
Setiap formula di sini dipetakan ke satu kelas domain dan satu sumber data di aplikasi.

---

## Daftar Isi

1. [Notasi & Registry Parameter](#1-notasi--registry-parameter)
2. [Lima Metrik Inti (Hal 6)](#2-lima-metrik-inti-hal-6)
3. [Model Dampak Inisiatif: Reach & Earned Media](#3-model-dampak-inisiatif-reach--earned-media)
4. [KPI Aktivitas vs KPI ESG (Hal 10)](#4-kpi-aktivitas-vs-kpi-esg-hal-10)
5. [Amplification Tracking](#5-amplification-tracking)
6. [Rancangan Admin Dashboard](#6-rancangan-admin-dashboard)
7. [SROI Sederhana & "Bukti Pipeline Before Dashboard" (Hal 9)](#7-sroi-sederhana--bukti-pipeline-before-dashboard-hal-9)
8. [Pemetaan ke Lapisan Domain](#8-pemetaan-ke-lapisan-domain)

---

## 1. Notasi & Registry Parameter

### 1.1 Notasi

| Simbol | Arti |
|---|---|
| `p` | Periode pengukuran (bulan kalender, kecuali disebut lain) |
| `B` | Registry penerima manfaat PF (master list hasil validasi Januari 2026, Hal 7) |
| `M` | Himpunan anggota Pfriends dengan status `verified` **dan** `consent = true` |
| `M_aktif(p)` | Anggota `M` yang melakukan ≥1 aksi terekam dalam 90 hari terakhir relatif ke akhir `p` |
| `C(p)` | Himpunan konten PF/Pertamina yang dipublikasikan ke forum pada periode `p` |
| `D(p)` | Himpunan event diseminasi (broadcast terkirim) pada periode `p` |
| `A(p)` | Himpunan event amplifikasi terhitung pada periode `p` |
| `E(p)` | Himpunan aktivitas engagement berstatus `completed` pada periode `p` |
| `‖X‖` | Kardinalitas (jumlah anggota) himpunan X |
| `ach` | Achievement ratio = `aktual / target` |

### 1.2 Aturan Warna Universal

Satu aturan dipakai untuk **semua** metrik rasio agar dashboard konsisten dan tidak ada threshold ad-hoc:

```
ach = aktual / target

HIJAU  : ach >= 1.00          (target tercapai)
KUNING : 0.80 <= ach < 1.00   (mendekati, perlu perhatian)
MERAH  : ach <  0.80          (intervensi diperlukan)
```

Untuk metrik berbasis **cacah bilangan kecil** (target 1–2 unit), aturan di atas dibulatkan ke bawah
menjadi tangga diskrit: dijabarkan per metrik di bagian 2.

### 1.3 Registry Parameter (satu tempat, tidak boleh hardcode di komponen)

Diimplementasikan sebagai `src/lib/domain/kpi/KpiParameters.js` (objek beku / `Object.freeze`).

| Parameter | Nilai | Sumber |
|---|---|---|
| `TARGET_COVERAGE` | `0.75` | Hal 6 |
| `TARGET_KONTEN_MIN` / `MAX` | `1` / `2` per bulan | Hal 6 |
| `TARGET_FREKUENSI_DISEMINASI` | `2` per bulan | Hal 6 |
| `TARGET_AMPLIFICATION_RATE` | `0.50` | Hal 6 |
| `TARGET_AKTIVITAS_ENGAGEMENT` | `2` | Hal 6 |
| `JARINGAN_SOSIAL_MIN` / `MAX` | `25` / `500` | Hal 6 |
| `PAID_MEDIA_REDUCTION_MIN` / `MAX` | `0.05` / `0.20` | Hal 6 |
| `ENGAGEMENT_MULTIPLIER_MIN` / `MAX` | `2.0` / `3.0` | Hal 6 |
| `TIER_THRESHOLDS` | `25 / 50 / 100 / 150` | Hal 12 |
| `POIN_AKSI` | 1/2/5/8/10/15/15/30/50 | Hal 11 |
| `WINDOW_ANGGOTA_AKTIF` | `90` hari | **`[ASUMSI]`** |
| `KUORUM_ENGAGEMENT` | `10` peserta | **`[ASUMSI]`** |
| `DEDUP_WINDOW_AMPLIFIKASI` | `24` jam | **`[ASUMSI]`** |
| `CAP_AMPLIFIKASI_HARIAN` | `5` event/anggota/hari | **`[ASUMSI]`**: turunan catatan anti-spam Hal 11 |
| `OVERLAP_JARINGAN` (δ) | `0.30` | **`[ASUMSI]`** |
| `SATURASI_KONTEN` | `>6` konten/bulan → flag spam | **`[ASUMSI]`**: turunan catatan anti-spam Hal 11 |

---

## 2. Lima Metrik Inti (Hal 6)

### M-01: Coverage Registrasi Penerima Manfaat

> *"75% dari penerima manfaat Pertamina Foundation terdata dalam komunitas Pfriends."*

| Aspek | Isi |
|---|---|
| **Definisi operasional** | Proporsi penerima manfaat pada master registry PF (hasil pengumpulan & validasi database PFpreneur + PFprestasi, Hal 7 Januari) yang telah memiliki akun Pfriends berstatus terverifikasi **dan** telah memberikan persetujuan data (consent). Akun tanpa consent **tidak dihitung**: konsekuensi langsung pilar Governance Hal 10. |
| **Numerator** | `‖{ m ∈ M : m.status = 'verified' ∧ m.consent = true }‖` |
| **Denominator** | `‖B‖`: total penerima manfaat pada master registry, snapshot awal periode |
| **Frekuensi refresh** | Harian (mockup: reaktif langsung dari Dexie) |
| **Sumber data** | Dexie `beneficiaryRegistry` (denominator), `members` (numerator) |
| **Granularitas irisan** | Segmen (SOBI / PFpreneur), batch (PF 10, PF 11, PF 12, …), provinsi |

```
CVG(p) = ‖{ m ∈ M : verified ∧ consent }‖ / ‖B‖ × 100%
```

| Warna | Rentang | Perhitungan |
|---|---|---|
| 🟢 Hijau | `CVG ≥ 75%` | `ach ≥ 1.00` |
| 🟡 Kuning | `60% ≤ CVG < 75%` | `0.80 ≤ ach < 1.00` |
| 🔴 Merah | `CVG < 60%` | `ach < 0.80` |

**Catatan integritas:** `‖B‖` harus dibekukan sebagai snapshot per periode. Jika denominator ikut
bertambah tiap kali data baru masuk, coverage akan terlihat stagnan meski numerator naik: jebakan
pengukuran yang umum. Simpan `registrySnapshotId` pada tiap hasil perhitungan.

---

### M-02: Volume Konten Terdiseminasi

> *"1–2 konten Pertamina dan/atau PF terdiseminasi di forum komunitas Pfriends dalam satu bulan."*

| Aspek | Isi |
|---|---|
| **Definisi operasional** | Cacah **item konten unik** bersumber Pertamina dan/atau Pertamina Foundation yang berstatus `published` ke forum komunitas dalam bulan berjalan. Menghitung *aset konten*, bukan peristiwa pengirimannya (lihat M-03 untuk peristiwa). Satu konten yang dikirim ulang 3 kali tetap dihitung **1**. |
| **Numerator** | `‖C(p)‖` |
| **Denominator** |: (metrik cacah absolut, bukan rasio) |
| **Frekuensi refresh** | Harian, akumulasi berjalan dalam bulan (`month-to-date`) |
| **Sumber data** | Dexie `contents`: filter `source ∈ {PERTAMINA, PF}`, `status = 'published'`, `publishedAt ∈ p` |

```
VKT(p) = ‖{ c ∈ contents : c.source ∈ {PERTAMINA, PF}
                          ∧ c.status = 'published'
                          ∧ c.publishedAt ∈ p }‖
```

| Warna | Rentang | Alasan |
|---|---|---|
| 🟢 Hijau | `VKT ≥ 2` | Batas atas band target tercapai |
| 🟡 Kuning | `VKT = 1` | Batas bawah band terpenuhi, belum optimal |
| 🔴 Merah | `VKT = 0` | Tidak ada diseminasi konten |

**Flag saturasi (indikator terpisah, bukan warna KPI):** bila `VKT > 6` **`[ASUMSI]`**, dashboard
menampilkan lencana peringatan *"risiko over-posting"*. Dasar: catatan Hal 11: *"Points should reward
meaningful contribution, not spammy activity."* Volume tinggi tanpa kenaikan `AR` (M-04) adalah sinyal
kelelahan audiens, bukan prestasi.

---

### M-03: Frekuensi Diseminasi

> *"Melakukan diseminasi informasi ke komunitas minimal 2 kali dalam satu bulan."*

| Aspek | Isi |
|---|---|
| **Definisi operasional** | Cacah **hari kalender unik** yang memiliki minimal satu broadcast berstatus `sent`. Dihitung per hari: bukan per broadcast: supaya satu batch berisi 5 pesan yang dikirim serentak dalam 10 menit tidak dihitung sebagai 5 kali diseminasi. Ini metrik **ritme komunikasi**, sedangkan M-02 metrik **stok konten**. |
| **Numerator** | `‖{ d ∈ hari(p) : ∃ b ∈ D(p), tanggal(b.sentAt) = d }‖` |
| **Denominator** |: (metrik cacah absolut) |
| **Frekuensi refresh** | Harian (`month-to-date`) |
| **Sumber data** | Dexie `broadcasts`: filter `status = 'sent'`, `sentAt ∈ p` |

```
FD(p) = ‖ { d ∈ hari(p) : ∃ b ∈ broadcasts,
                          b.status = 'sent' ∧ tanggal(b.sentAt) = d } ‖
```

| Warna | Rentang |
|---|---|
| 🟢 Hijau | `FD ≥ 2` |
| 🟡 Kuning | `FD = 1` |
| 🔴 Merah | `FD = 0` |

**Metrik pendamping: keteraturan ritme** (opsional, tampil sebagai teks kecil di kartu):

```
Jarak_rata2 = mean( selisih hari antar tanggal diseminasi berurutan )
```

Dua diseminasi pada 1 dan 2 Juli secara teknis memenuhi target, tetapi tidak membangun ritme
komunitas. Nilai `Jarak_rata2` mendekati 15 hari menandakan kadens yang sehat.

---

### M-04: Amplification Rate

> *"50% anggota komunitas ikut melakukan amplifikasi informasi Pertamina dan/atau PF."*

| Aspek | Isi |
|---|---|
| **Definisi operasional** | Proporsi anggota aktif yang melakukan **minimal satu** aksi amplifikasi terhitung (level L2 ke atas, lihat bagian 5) dalam periode. Dihitung berbasis **anggota unik**, bukan jumlah share: 1 anggota yang membagikan 20 kali tetap dihitung sebagai 1 amplifier. |
| **Numerator** | `‖{ u ∈ M_aktif(p) : ampCount(u, p) ≥ 1 }‖` |
| **Denominator** | `‖M_aktif(p)‖` |
| **Frekuensi refresh** | Harian (`month-to-date`) |
| **Sumber data** | Dexie `amplifications` (numerator), `members` + `activityLog` (denominator) |

```
AR(p) = ‖{ u ∈ M_aktif(p) : ampCount(u, p) >= 1 }‖ / ‖M_aktif(p)‖ × 100%
```

| Warna | Rentang |
|---|---|
| 🟢 Hijau | `AR ≥ 50%` |
| 🟡 Kuning | `40% ≤ AR < 50%` |
| 🔴 Merah | `AR < 40%` |

**Dua varian denominator: tampilkan keduanya, jangan pilih diam-diam:**

| Varian | Denominator | Penggunaan |
|---|---|---|
| `AR_aktif` | `‖M_aktif(p)‖` | **KPI utama**: mengukur kesehatan komunitas yang benar-benar hidup |
| `AR_total` | `‖M‖` (seluruh anggota terverifikasi) | **Angka tata kelola**: selalu ≤ `AR_aktif`; dilaporkan ke stakeholder eksternal agar tidak terkesan membesarkan hasil dengan memperkecil denominator |

Selisih besar antara keduanya adalah diagnosis penting: banyak anggota terdaftar yang sudah dorman.

---

### M-05: Aktivitas Engagement Terlaksana

> *"2 aktivitas engagement komunitas terlaksana."*

| Aspek | Isi |
|---|---|
| **Definisi operasional** | Cacah kegiatan komunitas (upskilling, sharing session, pertemuan komunitas, movement-based action: Hal 5) berstatus `completed` yang memenuhi **gerbang bukti**: minimal 1 lampiran dokumentasi **dan** jumlah hadir ≥ kuorum. Kegiatan yang dijadwalkan tetapi tidak terbukti terlaksana **tidak dihitung**: kata kunci pada sumber adalah *"terlaksana"*, bukan *"terjadwal"*. |
| **Numerator** | `‖{ e ∈ E(p) : status='completed' ∧ ‖e.evidence‖ ≥ 1 ∧ e.attendees ≥ KUORUM }‖` |
| **Denominator** |: (metrik cacah absolut) |
| **Frekuensi refresh** | Mingguan (kegiatan berdurasi; bukti sering menyusul beberapa hari) |
| **Sumber data** | Dexie `events`, `eventAttendance`, `evidences` |

```
AE(p) = ‖{ e ∈ events : e.status = 'completed'
                      ∧ ‖e.evidence‖ >= 1
                      ∧ e.attendees >= KUORUM_ENGAGEMENT }‖
```

| Warna | Rentang |
|---|---|
| 🟢 Hijau | `AE ≥ 2` |
| 🟡 Kuning | `AE = 1` |
| 🔴 Merah | `AE = 0` |

> **⚠ AMBIGUITAS SUMBER: wajib dikonfirmasi ke Corsec.**
> Hal 6 menulis *"2 aktivitas engagement komunitas terlaksana"* **tanpa menyebut periode**, sementara empat
> objective lainnya eksplisit bulanan. Dokumen ini **tidak menebak**. Implementasi memakai parameter
> `periodMode` dengan tiga mode terpilih di konfigurasi:
>
> | Mode | Arti | Konsekuensi |
> |---|---|---|
> | `PROGRAM` **(default)** | 2 aktivitas sepanjang periode program Jan–Jul 2026 (Hal 7) | Paling konservatif, paling sesuai bacaan literal |
> | `QUARTER` | 2 aktivitas per kuartal | Menengah |
> | `MONTH` | 2 aktivitas per bulan | Paling agresif; beban operasional tinggi |
>
> Dashboard menampilkan label periode aktif pada kartu agar pembaca tidak salah tafsir.

---

### 2.6 Ringkasan Lima Metrik Inti

| ID | Metrik | Target | Formula ringkas | Tipe | Refresh |
|---|---|---|---|---|---|
| M-01 | Coverage Registrasi | 75% | `verified∧consent / registry` | Rasio | Harian |
| M-02 | Volume Konten | 1–2 / bln | `count(content published)` | Cacah | Harian |
| M-03 | Frekuensi Diseminasi | ≥2 / bln | `count(distinct hari broadcast)` | Cacah | Harian |
| M-04 | Amplification Rate | 50% | `amplifier unik / anggota aktif` | Rasio | Harian |
| M-05 | Aktivitas Engagement | 2 | `count(event completed + bukti)` | Cacah | Mingguan |

---

## 3. Model Dampak Inisiatif: Reach & Earned Media

### 3.1 Rekonsiliasi Angka Sumber (penting: baca sebelum implementasi)

Hal 6 menyatakan:
- 1 anggota rata-rata memiliki **25–500** jaringan sosial;
- komunitas aktif **100 orang** → jangkauan organik **250 – 50.000** orang.

Perkalian langsung menghasilkan batas bawah yang **tidak sama** dengan yang tertulis:

| Batas | Perkalian langsung `A × N` | Tertulis di Hal 6 | Cocok? |
|---|---|---|---|
| Bawah | `100 × 25 = 2.500` | **250** | ❌ selisih 10× |
| Atas | `100 × 500 = 50.000` | **50.000** | ✅ |

Dokumen ini **tidak mengubah angka sumber**. Sebagai gantinya, model memperkenalkan **koefisien
eksposur** `α`: proporsi jaringan yang benar-benar melihat konten. Koefisien ini memang eksis di dunia
nyata (jangkauan organik media sosial jauh di bawah 100% pengikut), dan dengan `α` kedua angka Hal 6
tereproduksi **persis**:

```
Reach_bruto = A × N × α

Skenario pesimis : 100 × 25  × 0,10 = 250      ✅ sama dengan Hal 6
Skenario optimis : 100 × 500 × 1,00 = 50.000   ✅ sama dengan Hal 6
```

Artinya band Hal 6 membentang dari *(jaringan kecil × eksposur rendah)* hingga *(jaringan besar ×
eksposur penuh)*. **`[ASUMSI]`** `α ∈ [0,10 ; 1,00]`.

> **Tindakan yang diperlukan:** konfirmasi ke Corsec apakah "250" adalah (a) salah ketik dari "2.500",
> atau (b) memang sudah memperhitungkan eksposur parsial. Sampai ada jawaban, kode memakai konstanta
> `REACH_LOWER_BOUND_MODE = 'AS_DOCUMENTED'` sehingga output identik dengan dokumen sumber. Mengganti
> mode ke `'RAW_PRODUCT'` menghasilkan batas bawah 2.500 tanpa menyentuh kode lain.

### 3.2 Formula Estimasi Organic Reach

```
(1)  A(p)          = AR(p) × ‖M_aktif(p)‖          ← anggota yang benar-benar mengamplifikasi
(2)  Reach_bruto   = A(p) × N × α
(3)  Reach_neto    = Reach_bruto × (1 − δ)
(4)  Impresi       = Reach_neto × f
```

| Simbol | Arti | Nilai | Sumber |
|---|---|---|---|
| `A(p)` | Anggota pengamplifikasi aktual | Dari M-04 | Terhitung |
| `N` | Rata-rata ukuran jaringan sosial per anggota | `25 – 500` | **Hal 6** |
| `α` | Koefisien eksposur | `0,10 – 1,00` | **`[ASUMSI]`** |
| `δ` | Faktor tumpang tindih audiens | `0,30` | **`[ASUMSI]`** |
| `f` | Frekuensi paparan per orang | `1,0 – 1,5` | **`[ASUMSI]`** |

**Mengapa `δ` ada:** anggota satu komunitas saling mengikuti dan berbagi lingkaran sosial yang sama.
Menjumlahkan jaringan mereka tanpa diskon menghitung orang yang sama berkali-kali. Batas bawah
`δ = 0` hanya sah jika seluruh anggota punya audiens yang benar-benar terpisah.

**Aturan penyajian yang tegas: dua angka, dua fungsi berbeda:**

| Angka | Formula | Dipakai untuk |
|---|---|---|
| **Angka komunikasi** | `Reach_bruto` (2) | Materi presentasi ke stakeholder; identik dengan Hal 6 |
| **Angka perencanaan** | `Reach_neto` (3) | Perencanaan internal, input SROI, klaim penghematan biaya |

Dashboard menampilkan keduanya berdampingan dengan label jelas. Menyajikan `Reach_bruto` sebagai
angka perencanaan adalah kesalahan analitik yang paling sering terjadi pada laporan komunitas.

### 3.3 Earned Media Value (EMV)

Dua basis perhitungan. **Jangan pernah menjumlahkan keduanya**: keduanya mengukur peristiwa yang sama
dari sudut berbeda; menjumlahkannya adalah *double counting*.

**Basis A: nilai setara impresi (sekunder, batas atas optimistis):**

```
EMV_impresi = (Reach_neto / 1.000) × CPM_pasar
```

**Basis B: nilai setara engagement (PRIMER, direkomendasikan):**

```
ER_komunitas = ER_brand × k          , k ∈ [2 ; 3]        ← Hal 6
Engagement   = Reach_neto × ER_komunitas
EMV_engagement = Engagement × CPE_pasar
```

| Simbol | Arti | Nilai | Sumber |
|---|---|---|---|
| `k` | Pengali engagement komunitas vs akun brand | `2 – 3` | **Hal 6** |
| `ER_brand` | Engagement rate akun brand PF | Diisi dari data aktual | Input |
| `CPM_pasar` | Biaya per 1.000 impresi berbayar | Diisi dari rate card | Input |
| `CPE_pasar` | Biaya per engagement berbayar | Diisi dari rate card | Input |

Basis B direkomendasikan sebagai angka utama karena engagement adalah peristiwa terhitung yang dapat
diverifikasi, sedangkan impresi adalah estimasi di atas estimasi (`Reach` sendiri sudah hasil model).

### 3.4 Penghematan Paid Media

Hal 6: *"Earned media dari komunitas bisa menurunkan kebutuhan paid media hingga 5–20%."*

```
Penghematan = Belanja_paid_baseline × s          , s ∈ [0,05 ; 0,20]
```

**Aturan pembatas wajib (guardrail): mencegah klaim berlebih:**

```
Penghematan_klaim = min( Penghematan,
                         EMV_engagement,
                         Belanja_paid_baseline × 0,20 )
```

Penghematan tidak boleh diklaim melebihi nilai yang benar-benar dihasilkan komunitas (`EMV`), dan
tidak boleh melewati plafon 20% yang ditetapkan sumber. Kata *"hingga"* pada Hal 6 menandakan
**batas atas**, bukan nilai harapan: implementasi harus menghormati itu.

### 3.5 Skenario Referensi (validasi implementasi)

Uji regresi wajib: dengan `A = 100`, hasil berikut harus tereproduksi tepat.

| Skenario | `N` | `α` | `δ` | `Reach_bruto` | `Reach_neto` |
|---|---|---|---|---|---|
| Pesimis (sesuai Hal 6) | 25 | 0,10 | 0,30 | **250** | 175 |
| Perkalian langsung | 25 | 1,00 | 0,30 | 2.500 | 1.750 |
| Tengah | 150 | 0,50 | 0,30 | 7.500 | 5.250 |
| Optimis (sesuai Hal 6) | 500 | 1,00 | 0,30 | **50.000** | 35.000 |

### 3.6 Daftar Asumsi (tampilkan di UI)

Setiap kartu reach/EMV di dashboard **wajib** memiliki ikon informasi yang membuka panel asumsi berisi
tabel ini beserta nilai parameter yang sedang dipakai. Angka estimasi tanpa asumsi yang terlihat akan
diperlakukan pembaca sebagai fakta terukur: risiko kredibilitas yang tidak sepadan.

| # | Asumsi | Status |
|---|---|---|
| 1 | Ukuran jaringan `N` 25–500 berlaku merata untuk SOBI dan PFpreneur | Dari Hal 6, belum tervalidasi per segmen |
| 2 | Koefisien eksposur `α` | **`[ASUMSI]`** |
| 3 | Tumpang tindih audiens `δ = 0,30` | **`[ASUMSI]`** |
| 4 | Amplifikasi terkonfirmasi = benar-benar tayang | Lemah pada level L2, kuat pada L4 (bagian 5) |
| 5 | `CPM`/`CPE` pasar mewakili nilai yang setara | Input eksternal, perlu rate card |
| 6 | Reach organik tidak menurun seiring frekuensi posting | **Tidak realistis**: pantau lewat flag saturasi M-02 |

---

## 4. KPI Aktivitas vs KPI ESG (Hal 10)

> *"KPI Aktivitas membuktikan bahwa program **berjalan**. KPI ESG membuktikan bahwa program
> **menciptakan nilai**."*: Hal 10

Hal 9 mempertegas arah: **"Amplification KPI → Engagement KPI + ESG evidence KPI"**. Artinya KPI
amplifikasi tunggal dipecah menjadi dua lapis yang berbeda sifat.

### 4.1 Perbedaan Struktural

| Dimensi | **KPI Aktivitas** | **KPI ESG** |
|---|---|---|
| Membuktikan | Program **berjalan** | Program **menciptakan nilai** |
| Unit analisis | Peristiwa (event, klik, kiriman) | Perubahan (outcome pada penerima manfaat/lingkungan) |
| Sumber angka | Log sistem, otomatis | Bukti terkurasi + validasi manusia |
| Horizon waktu | Harian–bulanan | Kuartalan–tahunan |
| Syarat verifikasi | Tidak ada (sistem yang mencatat) | **Wajib 4 unsur** (lihat 4.2) |
| Bisa dimanipulasi? | **Ya**: volume mudah dinaikkan | Sulit: butuh bukti dan persetujuan |
| Konsumen | Tim operasional Corsec | Manajemen, auditor, pelaporan keberlanjutan |
| Mode kegagalan | Angka bagus, dampak nihil | Dampak nyata tidak terdokumentasi |
| Contoh | M-02, M-03, jumlah klik | Jam mentoring tervalidasi, aksi lingkungan berbukti |

**Konsekuensi desain:** M-01 sampai M-05 seluruhnya adalah **KPI Aktivitas**. Kelimanya tidak
membuktikan penciptaan nilai: dan dashboard tidak boleh menyiratkan sebaliknya. Karena itu dashboard
dipisah menjadi dua tab dengan judul eksplisit, bukan digabung dalam satu grid.

### 4.2 Gerbang Bukti ESG (Hal 12)

Hal 12 menetapkan syarat minimum sebagai bukti ESG. Empat unsur ini menjadi **validator wajib**;
sebuah record hanya masuk agregasi ESG bila keempatnya terpenuhi.

```
layakESG(r) = r.aktivitasTerdokumentasi
            ∧ r.outcomeNote != null
            ∧ r.esgSdgTag != null
            ∧ r.evidenceSource != null
```

| Unsur (Hal 12) | Bentuk di aplikasi | Validasi |
|---|---|---|
| Documented activity | Record `events` / `stories` status `completed` | Wajib ada |
| Outcome note | Teks bebas ≥ N karakter mendeskripsikan perubahan | Wajib terisi |
| ESG/SDG tag | Enum pilar E/S/G + nomor SDG | Wajib ≥1 tag |
| Evidence source | Lampiran (foto, laporan, tautan) + metadata | Wajib ≥1 lampiran |

Bandingkan dengan gerbang **public feature** Hal 12 yang berbeda dan lebih ketat:
`100 poin + verified story + consent + PF validation + no sensitive-data concern`.
Keduanya diimplementasi sebagai dua kelas policy terpisah: jangan digabung.

### 4.3 Katalog KPI ESG per Pilar

Diturunkan langsung dari kolom *Bukti/Metrik* Hal 10.

#### Environmental: *climate literacy, clean energy campaign, waste reduction, local environmental action*

| ID | KPI | Formula | Sumber data |
|---|---|---|---|
| E-01 | Aksi lingkungan terverifikasi | `count(action WHERE layakESG ∧ pilar='E')` | `esgRecords` |
| E-02 | Total peserta aksi | `Σ action.participants` | `eventAttendance` |
| E-03 | Sebaran lokasi | `count(distinct action.locationId)` | `esgRecords.location` |
| E-04 | Rasio laporan beroutcome | `count(action WITH outcomeNote) / count(action)` | `esgRecords` |
| E-05 | Kelengkapan dokumentasi foto | `count(action WITH ≥1 foto) / count(action)` | `evidences` |

#### Social: *alumni progress, mentoring hours, business growth, event completion*

| ID | KPI | Formula | Sumber data |
|---|---|---|---|
| S-01 | Jam mentoring terkumpul | `Σ session.durationHours` (status `completed`) | `mentoringSessions` |
| S-02 | Alumni dengan progres karier terlapor | `count(alumni WITH careerUpdate ∈ p) / ‖M_SOBI‖` | `members`, `careerUpdates` |
| S-03 | UMKM dengan pertumbuhan usaha terlapor | `count(umkm WITH growthReport) / ‖M_PFpreneur‖` | `businessReports` |
| S-04 | Event completion rate | `count(event completed) / count(event scheduled)` | `events` |
| S-05 | Rasio mentor aktif | `count(member sbg mentor ∈ p) / ‖M_aktif‖` | `mentoringSessions` |

#### Governance: *consent, approval, data quality, evidence integrity, escalation protocol*

| ID | KPI | Formula | Sumber data |
|---|---|---|---|
| G-01 | Consent coverage | `count(member WITH consent valid) / ‖M‖` | `consents` |
| G-02 | Story approval rate | `count(story approved) / count(story submitted)` | `stories` |
| G-03 | Kelengkapan metadata | `Σ field terisi / Σ field wajib` (seluruh record ESG) | `esgRecords` |
| G-04 | Cakupan audit trail | `count(aksi dgn entri audit) / count(aksi ter-audit)` | `auditLog` |
| G-05 | Waktu penyelesaian isu | `median(resolvedAt − reportedAt)` | `issueLog` |
| G-06 | Rasio bukti tertolak | `count(evidence rejected) / count(evidence submitted)` | `evidences` |

**G-06 adalah indikator kesehatan sistem, bukan indikator kegagalan.** Nilai mendekati nol justru
mencurigakan: itu menandakan validasi tidak benar-benar berjalan atau bersifat stempel.

---

## 5. Amplification Tracking

Hal 4 menyebut kontrol PF atas komunitas berupa *"penyebaran informasi, **tracking amplifikasi
konten**, dan pengerjaan gamifikasi"*. Bagian ini mendefinisikan mekanismenya.

### 5.1 Masalah Mendasar

Microsite **tidak dapat** membaca isi WhatsApp maupun akun media sosial pribadi anggota. Setiap sistem
tracking amplifikasi karena itu bersifat **inferensial**. Solusi jujur bukan berpura-pura punya
kepastian, melainkan **memberi tingkat keyakinan** pada tiap bukti dan menyatakannya terbuka.

### 5.2 Lima Tingkat Bukti

| Level | Peristiwa | Cara tangkap | Keyakinan | Hitung ke M-04? | Poin (Hal 11) |
|---|---|---|---|---|---|
| **L0** | Share intent | Klik tombol *Bagikan* di microsite | Sangat rendah | ❌ Tidak | 0 |
| **L1** | Outbound click | Redirect ber-token `/r/:token` + parameter UTM | Rendah–sedang | ❌ Tidak | 0 |
| **L2** | Konfirmasi mandiri | Anggota menekan *"Saya sudah membagikan"* + memilih kanal | Sedang | ✅ **Ya (KPI utama)** | Poin **pending** |
| **L3** | Bukti tangkapan layar | Unggah tangkapan layar + metadata otomatis | Tinggi | ✅ Ya | Poin **pending** |
| **L4** | Tervalidasi admin | Admin menyetujui bukti L3 | Sangat tinggi | ✅ **Ya (kelas ESG)** | Poin **settled** |

**Kebijakan poin (kelas `AmplificationPolicy`):**
- L2/L3 memberikan poin berstatus `pending`: terlihat oleh anggota, sudah masuk papan peringkat.
- L4 mengubah status menjadi `settled`: final, memenuhi syarat bukti ESG.
- Penolakan admin **membatalkan** poin dan mencatat alasan pada `auditLog`.
- Poin mengikuti Hal 11 apa adanya: **5 pts** share ke WA/jaringan privat, **8 pts** share ke media
  sosial publik. Tingkat bukti mengatur *kapan* poin diberikan, **bukan** besarnya.

### 5.3 Aturan Anti-Manipulasi

Diturunkan dari catatan Hal 11 (*"not spammy activity"*). Seluruhnya **`[ASUMSI]`** pada nilai
ambangnya, wajib pada keberadaannya.

| Aturan | Ketentuan | Alasan |
|---|---|---|
| Deduplikasi | 1 anggota × 1 konten × 1 kanal = 1 event terhitung per 24 jam | Mencegah klik berulang |
| Plafon harian | Maksimum 5 event terhitung per anggota per hari | Mencegah *farming* poin |
| Hash tangkapan layar | SHA-256 perceptual hash; berkas duplikat ditolak otomatis | Mencegah pemakaian ulang bukti |
| Jendela kedaluwarsa | Bukti harus diunggah ≤7 hari sejak `shareIntent` | Menjaga kredibilitas waktu |
| Wajib consent | Anggota tanpa consent aktif tidak menghasilkan event terhitung | Pilar Governance Hal 10 |
| Batas rasio | `event/anggota/bulan > 30` → tandai untuk peninjauan | Deteksi anomali |

### 5.4 Funnel Amplifikasi & Formula Turunan

```
Terkirim (delivered)
   ↓  r_open       = dibuka / terkirim
Dibuka (opened)
   ↓  r_intent     = share intent / dibuka
Share intent (L0)
   ↓  r_confirm    = dikonfirmasi / share intent
Dikonfirmasi (L2)
   ↓  r_evidence   = berbukti / dikonfirmasi
Berbukti (L3)
   ↓  r_validate   = tervalidasi / berbukti
Tervalidasi (L4)
```

**Metrik turunan:**

```
(a) Amplification Rate : KPI M-04, level L2+
    AR(p) = ‖{u : ampCount_L2+(u,p) >= 1}‖ / ‖M_aktif(p)‖ × 100%

(b) Amplification Rate tervalidasi: kelas ESG, level L4
    AR_verified(p) = ‖{u : ampCount_L4(u,p) >= 1}‖ / ‖M_aktif(p)‖ × 100%

(c) Kedalaman amplifikasi: rata-rata share per pengamplifikasi
    AD(p) = ‖A(p)‖ / ‖{u : ampCount(u,p) >= 1}‖

(d) Rasio amplifikasi per konten: mengurutkan konten terbaik
    CAR(c) = ‖amplifier unik konten c‖ / ‖penerima konten c‖ × 100%

(e) Indeks keyakinan: bagian bukti kuat dari total
    CI(p) = ‖event L3 ∪ L4‖ / ‖event L2 ∪ L3 ∪ L4‖ × 100%
```

**Metrik (e) adalah metrik integritas paling penting di bagian ini.** `AR` sebesar 60% dengan `CI`
sebesar 10% berarti KPI ditopang hampir seluruhnya oleh laporan mandiri tanpa bukti. Kedua angka
**harus** tampil pada kartu yang sama.

### 5.5 Skema Data (Dexie)

| Tabel | Field kunci |
|---|---|
| `contents` | `id, judul, source, status, publishedAt, esgTag[]` |
| `broadcasts` | `id, contentId[], channel, sentAt, status, recipientCount` |
| `broadcastRecipients` | `id, broadcastId, memberId, deliveredAt, openedAt` |
| `shareTokens` | `token, contentId, memberId, channel, createdAt, clickCount` |
| `amplifications` | `id, memberId, contentId, channel, level(L0–L4), occurredAt, pointsAwarded, pointStatus, dedupeKey` |
| `evidences` | `id, amplificationId, fileRef, perceptualHash, uploadedAt, reviewStatus, reviewerId, reviewedAt, rejectReason` |
| `auditLog` | `id, actorId, action, entityType, entityId, before, after, timestamp` |

`dedupeKey = hash(memberId + contentId + channel + tanggalHari)`: dijadikan indeks unik di Dexie
sehingga aturan deduplikasi ditegakkan di lapisan penyimpanan, bukan bergantung pada disiplin kode.

---

## 6. Rancangan Admin Dashboard

Empat tab, memisahkan secara tegas apa yang **terjadi** dari apa yang **bernilai** (bagian 4).

| Tab | Isi | Pertanyaan yang dijawab |
|---|---|---|
| **1. Ringkasan** | 5 kartu KPI inti + tren | Apakah program berjalan? |
| **2. Amplifikasi** | Funnel, kanal, performa konten | Apakah pesan menyebar? |
| **3. Komunitas** | Anggota, poin, tier, sebaran | Apakah komunitas hidup? |
| **4. ESG & Dampak** | Bukti ESG, reach, EMV, SROI | Apakah tercipta nilai? |

### 6.1 Kartu KPI: Tab Ringkasan

Komponen `KpiCard.svelte` (pola mengikuti Enduro).

| # | Judul kartu | Nilai utama | Sub-teks | Visual mini | Warna |
|---|---|---|---|---|---|
| K-01 | Coverage Registrasi | `CVG%` | `n dari N penerima manfaat` | Gauge mini | Aturan M-01 |
| K-02 | Konten Terdiseminasi | `VKT` | `target 1–2 / bulan` | Sparkline 7 bulan | Aturan M-02 |
| K-03 | Frekuensi Diseminasi | `FD` | `target min 2 / bulan · jarak rata-rata X hari` | Titik-titik kalender | Aturan M-03 |
| K-04 | Amplification Rate | `AR%` | `AR_total X% · indeks keyakinan Y%` | Sparkline | Aturan M-04 |
| K-05 | Aktivitas Engagement | `AE` | `target 2 · periode: [MODE]` | Ikon status | Aturan M-05 |

Kartu sekunder: Total Anggota Aktif · Total Poin Bulan Ini · Estimasi Reach Organik · Bukti ESG
Tervalidasi · Consent Coverage.

### 6.2 Spesifikasi Chart ECharts

Kolom **Sumbu X / Sumbu Y / Seri** dapat disalin langsung ke `option` ECharts. Seluruh chart
memakai wrapper `EChart.svelte` (`{ option, height }`) dan token dari `_chartTheme.js`
(`tip`, `legend`, `axisLabel`, `palette`) sesuai konvensi repo Enduro.

#### Tab 1: Ringkasan

| ID | Komponen | Tipe | Sumbu X | Sumbu Y | Seri | Metrik |
|---|---|---|---|---|---|---|
| C-01 | `CoverageGaugeChart.svelte` | **gauge** |: |: | 1 seri `gauge`, `value = CVG`, `min 0` `max 100`, `axisLine.lineStyle.color = [[0.60,merah],[0.75,kuning],[1,hijau]]`, `markLine` di 75 | M-01 |
| C-02 | `CoverageSegmentBar.svelte` | **bar** (horizontal) | `type:'value'`, 0–100 (%) | `type:'category'`: SOBI, PFpreneur, PF 10, PF 11, PF 12 | S1 `bar` Terdaftar %, S2 `bar` sisa (stack, abu), `markLine` vertikal di 75 | M-01 |
| C-03 | `DisseminationComboChart.svelte` | **bar + line** | `type:'category'`: Jan–Jul 2026 | Kiri `value` jumlah konten; kanan `value` jumlah hari | S1 `bar` Konten (M-02), S2 `line` Hari diseminasi (M-03, `yAxisIndex:1`), `markLine` di 2 | M-02, M-03 |
| C-04 | `AmplificationTrendLine.svelte` | **line** | `type:'category'`: bulan | `type:'value'` 0–100 (%) | S1 `line` `AR_aktif`, S2 `line` `AR_verified` (putus-putus), S3 `markLine` target 50% | M-04 |
| C-05 | `KpiRadarChart.svelte` | **radar** |: | `indicator`: 5 metrik inti, `max:100` (dinormalisasi ke % capaian) | S1 Target (100 semua, abu putus-putus), S2 Aktual (`areaStyle`) | M-01…M-05 |

#### Tab 2: Amplifikasi

| ID | Komponen | Tipe | Sumbu X | Sumbu Y | Seri | Metrik |
|---|---|---|---|---|---|---|
| C-06 | `AmplificationFunnelChart.svelte` | **funnel** |: |: | 1 seri `funnel`, `sort:'descending'`, data: Terkirim → Dibuka → Share intent → Dikonfirmasi → Berbukti → Tervalidasi; label menampilkan nilai + rasio konversi | 5.4 |
| C-07 | `ChannelSplitPie.svelte` | **pie** (donut, `radius:['45%','70%']`) |: |: | 1 seri `pie`: WA privat, WA komunitas, Instagram, LinkedIn, TikTok, Facebook/X; `center` menampilkan total share | 5.4 |
| C-08 | `ContentPerformanceScatter.svelte` | **scatter** | `type:'value'` Jangkauan penerima | `type:'value'` `CAR` per konten (%) | 1 seri `scatter`, `symbolSize` ∝ poin dihasilkan, warna per jenis konten, `markLine` rata-rata di kedua sumbu (kuadran) | 5.4(d) |
| C-09 | `EvidenceLevelStackedBar.svelte` | **bar bertumpuk** | `type:'category'`: bulan | `type:'value'` jumlah event | S1 L2 Dikonfirmasi, S2 L3 Berbukti, S3 L4 Tervalidasi (`stack:'ev'`); garis tambahan indeks keyakinan `CI` di sumbu kanan | 5.4(e) |
| C-10 | `AmplificationHeatmap.svelte` | **heatmap** | `type:'category'`: tanggal 1–31 | `type:'category'`: Sen–Min | 1 seri `heatmap`, `value = jumlah event`, `visualMap` kontinu, palet hijau | 5.4 |

#### Tab 3: Komunitas

| ID | Komponen | Tipe | Sumbu X | Sumbu Y | Seri | Metrik |
|---|---|---|---|---|---|---|
| C-11 | `TierDistributionBar.svelte` | **bar** | `type:'category'`: `0–24`, `25–49`, `50–99`, `100–149`, `150+` | `type:'value'` jumlah anggota | 1 seri `bar` dengan `itemStyle.color` per tier: abu, **biru `#2E7CD6`**, **hijau `#7CB342`**, **merah `#E53935`**, **kuning `#F0B429`** (Hal 12) | Hal 12 |
| C-12 | `TierFunnelChart.svelte` | **funnel** |: |: | 1 seri `funnel`: Active Member (25) → Contributor (50) → Featured Candidate (100) → Champion (150); label memuat manfaat tiap tier | Hal 12 |
| C-13 | `PointSourceStackedBar.svelte` | **bar bertumpuk** (horizontal) | `type:'value'` total poin | `type:'category'`: bulan | Satu seri per jenis aksi Hal 11 (9 seri: 1/2/5/8/10/15/15/30/50 pts), `stack:'poin'` | Hal 11 |
| C-14 | `MemberGrowthArea.svelte` | **line** (`areaStyle`) | `type:'category'`: bulan | `type:'value'` jumlah anggota | S1 Anggota kumulatif, S2 Anggota aktif, S3 Pengamplifikasi: bertumpuk sebagai corong keterlibatan | M-01, M-04 |
| C-15 | `MemberProvinceMap.svelte` | **map** (peta Indonesia) |: |: | 1 seri `map`, `visualMap` jumlah anggota per provinsi; pakai ulang `IndonesiaMap.svelte` dari Enduro | M-01 |

#### Tab 4: ESG & Dampak

| ID | Komponen | Tipe | Sumbu X | Sumbu Y | Seri | Metrik |
|---|---|---|---|---|---|---|
| C-16 | `EsgPillarRadar.svelte` | **radar** |: |: | `indicator`: Environmental, Social, Governance (`max:100`); S1 Target, S2 Aktual | Bagian 4.3 |
| C-17 | `EsgEvidenceGateBar.svelte` | **bar** (horizontal) | `type:'value'` jumlah record | `type:'category'`: Terdokumentasi, +Outcome note, +Tag ESG/SDG, +Evidence source, **Layak ESG** | 1 seri `bar` menurun: memperlihatkan penyusutan di tiap gerbang | Hal 12 |
| C-18 | `ReachEstimateBand.svelte` | **line** dengan pita | `type:'category'`: bulan | `type:'value'` estimasi orang terjangkau | S1 batas bawah (transparan), S2 selisih (`stack`, `areaStyle`) → membentuk pita pesimis–optimis, S3 `line` titik tengah tegas | Bagian 3.2 |
| C-19 | `EmvBarChart.svelte` | **bar + line** | `type:'category'`: bulan | Kiri `value` Rp | S1 `bar` `EMV_engagement`, S2 `line` plafon penghematan paid media, `markLine` batas 20% | Bagian 3.3–3.4 |
| C-20 | `SroiWaterfallChart.svelte` | **bar** (waterfall via `stack` + seri transparan) | `type:'category'`: Nilai kotor → −Deadweight → −Atribusi → −Drop-off → **Nilai neto** | `type:'value'` Rp | S1 seri pembantu transparan, S2 seri nilai berwarna | Bagian 7 |
| C-21 | `GovernanceComplianceBar.svelte` | **bar** | `type:'category'`: G-01…G-06 | `type:'value'` 0–100 (%) | 1 seri `bar` berwarna sesuai aturan warna universal | Bagian 4.3 |

### 6.3 Aturan Baku Chart

| Aturan | Ketentuan |
|---|---|
| Palet | `_chartTheme.js`; warna tier **wajib** dari Hal 12 (biru/hijau/merah/kuning), jangan diganti |
| Estimasi vs terukur | Chart berisi estimasi (C-18, C-19, C-20) memakai `lineStyle.type:'dashed'` + lencana "Estimasi" |
| Kondisi kosong | Semua chart menangani nol data dengan pesan kosong yang eksplisit, **bukan** grafik nol yang menyesatkan |
| Drill-down | Setiap `series.data` menyertakan `recordIds` supaya klik dapat membuka daftar bukti (lihat bagian 7.3) |
| Bahasa | Seluruh label, legenda, dan tooltip berbahasa Indonesia |
| Aksesibilitas | Jangan mengandalkan warna saja: sertakan angka pada label atau tooltip |

---

## 7. SROI Sederhana & "Bukti Pipeline Before Dashboard" (Hal 9)

### 7.1 Definisi SROI

Hal 3 menyebut fokus pada **SROI jangka panjang**; Hal 9 menetapkan arah **"SROI dashboard → bukti
pipeline before dashboard"**.

Bentuk dasar:

```
SROI = PV(Nilai Sosial yang Tercipta) / PV(Investasi)
```

Disajikan sebagai rasio (mis. **1 : 3,2**: setiap Rp1 menghasilkan Rp3,20 nilai sosial).

**Bentuk lengkap dengan penyesuaian standar:**

```
Nilai_neto = Σ [ Outcome_i × Proxy_i
                 × (1 − deadweight_i)
                 × (1 − atribusi_i)
                 × (1 − dropoff_i)
                 × (1 − displacement_i) ]

SROI = Nilai_neto / Total_Investasi
```

| Penyesuaian | Pertanyaan yang dijawab | Default **`[ASUMSI]`** |
|---|---|---|
| **Deadweight** | Berapa yang tetap terjadi tanpa Pfriends? | 0,20 |
| **Atribusi** | Berapa bagian yang disebabkan pihak lain? | 0,30 |
| **Drop-off** | Berapa peluruhan manfaat per tahun berikutnya? | 0,25 |
| **Displacement** | Berapa yang sekadar berpindah, bukan tercipta? | 0,10 |

**Tanpa keempat penyesuaian ini, angka SROI tidak layak dilaporkan**: inilah yang membedakan SROI
dari sekadar penjumlahan manfaat.

### 7.2 Proxy Nilai untuk Pfriends

| Outcome | Sumber metrik | Proxy keuangan | Pilar |
|---|---|---|---|
| Amplifikasi konten | `EMV_engagement` (3.3) | Nilai media setara | Komunikasi |
| Penghematan paid media | Bagian 3.4 | Belanja iklan yang dihindari | Komunikasi |
| Transfer pengetahuan | S-01 jam mentoring | Jam × tarif mentor pasar | Social |
| Pertumbuhan usaha UMKM | S-03 | Δ omzet teratribusi | Social |
| Aksi lingkungan | E-01, E-02 | Peserta × proxy nilai aksi | Environmental |
| Pengembangan karier alumni | S-02 | Δ pendapatan teratribusi | Social |

Seluruh **nilai proxy** adalah input eksternal: **`[ASUMSI]`** sampai Corsec menetapkan sumber
rujukannya. Mockup memakai nilai placeholder yang ditandai jelas di UI.

### 7.3 "Bukti Pipeline Before Dashboard": Arti Operasional

Frasa Hal 9 adalah **perintah urutan pengerjaan**: pipeline bukti dibangun **sebelum** dashboard,
bukan sesudahnya. Dashboard SROI yang dibangun di atas data yang tidak dapat ditelusuri menghasilkan
angka yang tidak dapat dipertahankan saat diaudit: dan justru merusak kredibilitas program yang
sebenarnya berkinerja baik.

**Prinsip yang mengikat:**

> Tidak ada satu pun angka di dashboard yang boleh tampil tanpa dapat ditelusuri ke baris bukti
> yang dapat diperiksa. Setiap agregat wajib punya jalur drill-down ke record aslinya.

**Urutan fitur yang mengikuti prinsip ini:**

| Fase | Yang dibangun | Membuka dashboard | Alasan urutan |
|---|---|---|---|
| **F0** | Registry anggota, consent, mutu data, `auditLog` | K-01, C-01, C-02, G-01 | Tanpa consent, seluruh angka tidak sah dipakai (Hal 10 Governance) |
| **F1** | Konten, broadcast, log pengiriman | K-02, K-03, C-03 | Tidak ada amplifikasi tanpa diseminasi |
| **F2** | Share token, konfirmasi, unggah bukti | K-04, C-04, C-06, C-07 | Inti tracking amplifikasi (Hal 4) |
| **F3** | Alur validasi admin, terima/tolak, alasan | C-09, C-17, G-02, G-06 | Mengubah laporan mandiri jadi bukti |
| **F4** | Tag ESG/SDG, outcome note, kegiatan | K-05, C-16, seluruh E-xx & S-xx | Gerbang bukti ESG Hal 12 |
| **F5** | Mesin agregasi + dashboard KPI | C-05, C-10…C-15, C-21 | Agregat baru bermakna bila masukannya sahih |
| **F6** | Model reach, EMV, **SROI** | C-18, C-19, **C-20** | **Terakhir**: paling banyak asumsi, paling butuh bukti kuat |

**Konsekuensi yang harus dipatuhi developer:**

1. **Kartu SROI adalah fitur paling akhir**, bukan yang paling awal: meski paling menarik secara visual.
2. Setiap tile dashboard mendeklarasikan `requiredPipelineStage`; bila tahapnya belum ada, tile
   menampilkan status *"Menunggu pipeline bukti"* alih-alih angka nol yang menyesatkan.
3. Gamifikasi (F2) memang berjalan lebih dulu dari ESG (F4): sesuai timeline Hal 7 (Juni: gamifikasi;
   Juli: diseminasi konten profil anggota). Yang dilarang adalah **melaporkan nilai ESG** sebelum
   pipeline bukti berdiri.
4. Kelas `SroiCalculator` **wajib** mengembalikan objek berisi `{ nilai, asumsi[], kelengkapanBukti% }`
  : bukan sekadar bilangan. UI **wajib** menampilkan `kelengkapanBukti%` bersanding dengan rasio SROI.

---

## 8. Pemetaan ke Lapisan Domain

Sesuai prinsip proyek: logika domain tidak boleh bocor ke komponen Svelte. Komponen hanya menerima
objek hasil yang sudah jadi dan me-render-nya.

```
src/lib/domain/kpi/
  KpiParameters.js          # Object.freeze: seluruh konstanta bagian 1.3
  MetricDefinition.js       # Entity: id, nama, target, unit, formula, periodMode
  MetricResult.js           # Value Object (immutable): nilai, numerator, denominator,
                            #   status warna, periode, registrySnapshotId
  ThresholdPolicy.js        # Policy: nilai + target → HIJAU | KUNING | MERAH (aturan 1.2)
  calculators/
    CoverageCalculator.js       # M-01
    ContentVolumeCalculator.js  # M-02
    DisseminationCalculator.js  # M-03
    AmplificationCalculator.js  # M-04 + turunan 5.4
    EngagementCalculator.js     # M-05
  AmplificationPolicy.js    # Level L0–L4, poin pending/settled, aturan anti-manipulasi 5.3
  EsgEvidencePolicy.js      # Gerbang 4 unsur Hal 12
  PublicFeaturePolicy.js    # Gerbang public feature Hal 12 (TERPISAH dari EsgEvidencePolicy)
  ReachEstimator.js         # Bagian 3.2: mengembalikan {bruto, neto, asumsi[]}
  EarnedMediaCalculator.js  # Bagian 3.3–3.4 termasuk guardrail
  SroiCalculator.js         # Bagian 7.1: mengembalikan {nilai, asumsi[], kelengkapanBukti}

src/lib/domain/repositories/   # Interface (dependency inversion)
  MemberRepository.js  ContentRepository.js  AmplificationRepository.js
  EvidenceRepository.js  EventRepository.js

src/lib/infrastructure/dexie/  # Implementasi konkret: satu-satunya lapisan yang tahu Dexie
```

**Aturan yang mengikat:**

| Aturan | Ketentuan |
|---|---|
| Kalkulator murni | Menerima data, mengembalikan `MetricResult`; tanpa I/O, tanpa impor Dexie |
| Repository = interface | Kalkulator bergantung pada abstraksi, bukan implementasi Dexie → siap disambung ke API nyata |
| Warna dari policy | Komponen **tidak boleh** menghitung warna sendiri; ambil dari `MetricResult.status` |
| Angka dari registry | Tidak ada angka literal di komponen; semua dari `KpiParameters` |
| Store = singleton runes | `KpiStore` sebagai kelas berbasis runes (pola `auth.svelte.js` Enduro) |

---

## Lampiran: Daftar Butir yang Perlu Konfirmasi Corsec

| # | Butir | Rujukan | Dampak |
|---|---|---|---|
| 1 | Batas bawah reach: **250** atau **2.500**? | Hal 6 / bagian 3.1 | Selisih 10× pada angka publikasi |
| 2 | Periode untuk "2 aktivitas engagement" | Hal 6 / M-05 | Menentukan lolos/tidaknya KPI |
| 3 | Denominator M-01: seluruh penerima manfaat atau hanya alumni? | Hal 6 / M-01 | Menggeser coverage secara signifikan |
| 4 | `AR` resmi memakai `M_aktif` atau `M` total? | Hal 6 / M-04 | Menggeser hasil beberapa puluh poin persen |
| 5 | Sumber rujukan `CPM`/`CPE`/`ER_brand` | Bagian 3.3 | Prasyarat EMV dapat dihitung |
| 6 | Nilai proxy SROI dan sumbernya | Bagian 7.2 | Prasyarat SROI dapat dihitung |
| 7 | Kuorum minimum peserta kegiatan | M-05 | Menentukan kegiatan mana yang terhitung |
| 8 | Ambang saturasi konten (usulan >6/bulan) | M-02 | Ambang peringatan anti-spam |
