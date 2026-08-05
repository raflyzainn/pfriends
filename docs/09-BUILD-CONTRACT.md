# 09 — BUILD CONTRACT (Kontrak Build) — Pfriends

> Dokumen ini **mengikat**. Seluruh agent implementasi wajib mematuhinya persis.
> Bila dokumen desain lain (01–08) bertentangan dengan dokumen ini, **dokumen ini yang menang**.
> Bila dokumen ini bertentangan dengan `00-SOURCE-BRIEF.md`, **sumber yang menang** (angka kanonik).

---

## 1. Keputusan Final (konflik yang diselesaikan)

| # | Konflik | Keputusan | Alasan |
|---|---|---|---|
| K-1 | Arsitektur mengusulkan 16 repository interface + implementasi memory/dexie/http + 6 mapper + DI container | **Dipangkas**: 1 abstract `Repository` + 7 repository konkret berbasis Dexie. Tanpa http impl, tanpa mapper, tanpa container. | Ini mockup. Indirection sebanyak itu menambah ±40 file plumbing tanpa menambah nilai demo, dan justru mengaburkan OOP yang ingin ditunjukkan. Dependency Inversion tetap terlihat lewat abstract base + injeksi repo ke service. |
| K-2 | Arsitektur mengusulkan 15 store | **Dipangkas jadi 6 store.** | Satu store per konteks pemakaian, bukan satu per entitas. |
| K-3 | Gamifikasi menambah syarat kualitatif pada **kenaikan tier** (mis. Contributor wajib ≥1 aksi Kelas C) | **Ditolak untuk tier.** Tier ditentukan **murni ambang poin** (25/50/100/150) sesuai Hal 12. Syarat kualitatif dipindah ke **gate fitur publik**, yang memang didefinisikan begitu oleh sumber. | Hal 12 menyebut tier sebagai ambang poin. Menambah syarat tersembunyi membuat demo ke Corsec sulit dijelaskan ("kenapa saya 50 poin tapi belum Contributor?"). |
| K-4 | UX memetakan ±45 route | **Dipangkas jadi 25 route.** Daftar final di §3. | Kualitas per halaman lebih penting daripada jumlah halaman. 25 route sudah menutup 6 pilar + governance. |
| K-5 | Penamaan campur Indonesia/Inggris | **Identifier kode = Inggris. Seluruh teks UI = Indonesia.** Pengecualian: fungsi helper domain yang sudah ditulis dalam Indonesia (`aturanSkor`, `poinUntuk`) dipertahankan. | Konsistensi; sudah ditetapkan di 05-ARCHITECTURE §5. |
| K-6 | Seed data diminta dienumerasi di dokumen | **Ditolak.** Seed dibangkitkan **secara kode** dan deterministik. | Data 60 anggota dalam markdown tidak dapat dieksekusi dan cepat basi. |

---

## 2. Angka kanonik (SATU-SATUNYA sumber di kode)

Sudah diimplementasikan di `src/lib/domain/constants/scoring-table.js` — **jangan ditulis ulang di tempat lain**.

- 9 aksi: 1 · 2 · 5 · 8 · 10 · 15 · 15 · 30 · 50
- 4 tier: 25 Active Member · 50 Contributor · 100 Featured Candidate · 150 Champion
- Gate fitur publik: 100 poin + cerita terverifikasi + consent + validasi PF + tanpa data sensitif
- Gate bukti ESG: aktivitas terdokumentasi + catatan hasil + tag ESG/SDG + sumber bukti
- 5 KPI: 75% terdata · 1–2 konten/bulan · ≥2 diseminasi/bulan · 50% amplifikasi · 2 aktivitas engagement

**Larangan keras:** tidak boleh ada angka poin/ambang tier yang ditulis literal di komponen, store, atau seed.
Selalu impor dari `$lib/domain/constants/`.

---

## 3. Route final (25)

### Zona Publik — tanpa login
| Path | Halaman | Isi inti |
|---|---|---|
| `/` | Beranda Pfriends | Hero, 2 komunitas, cara kerja poin, sorotan anggota, cerita terbaru, CTA daftar |
| `/tentang` | Tentang Inisiatif | Latar (fragmentasi alumni, isolasi womenpreneur), objective, 6 pilar, timeline 2026 |
| `/komunitas` | Dua Komunitas | SOBI & Womenpreneur, chapter/batch, statistik anggota |
| `/cerita` | Cerita Komunitas | Grid cerita **TERPUBLIKASI** saja |
| `/cerita/[slug]` | Detail Cerita | Isi cerita, penulis, tag ESG/SDG, dampak |
| `/gerakan` | Gerakan Bersama | Daftar movement + progres partisipasi |
| `/daftar` | Pendaftaran | Form onboarding + persetujuan consent |
| `/masuk` | Masuk | Pemilih peran demo (anggota / admin PF) |

### Zona Member — wajib sesi
| Path | Halaman | Isi inti |
|---|---|---|
| `/member` | Dasbor Anggota | Poin, tier + progres ke tier berikutnya, streak, aksi cepat, kabar terbaru |
| `/member/kabar` | Kabar Pfriends | Daftar broadcast; menandai terbaca = +1 |
| `/member/kabar/[id]` | Baca & Amplifikasi | Isi kabar, tombol bagikan WA (+5) / sosmed publik (+8, wajib bukti) |
| `/member/aksi` | Pusat Aksi & Poin | 9 jenis aksi, sisa kuota harian, riwayat poin (tab) |
| `/member/kalender` | Kalender Komunitas | Kegiatan upskilling/sharing; hadir = +15 |
| `/member/gerakan` | Gerakan Bersama | Ikut gerakan, lapor aksi lapangan (+50 bila memimpin) |
| `/member/cerita` | Ruang Cerita | Cerita saya + status moderasi; kirim cerita (+10) |
| `/member/papan-peringkat` | Papan Peringkat | Global / per komunitas / per chapter, bulanan & all-time |
| `/member/penghargaan` | Penghargaan | Lencana terkumpul + katalog tukar poin |
| `/member/direktori` | Direktori Alumni | Cari & filter anggota, ajakan mentoring SOBI × PFpreneur |
| `/member/profil` | Profil Saya | Data diri, tier, kontribusi ESG, pengaturan consent |

### Zona Admin PF
| Path | Halaman | Isi inti |
|---|---|---|
| `/admin` | Dasbor KPI | 5 kartu KPI + chart tren, corong keterlibatan, estimasi jangkauan organik |
| `/admin/anggota` | Kelola Anggota | Tabel anggota, filter, validasi keanggotaan |
| `/admin/broadcast` | Diseminasi | Susun broadcast, lacak jangkauan & amplifikasi |
| `/admin/moderasi` | Moderasi & Consent | Antrean cerita: review → setujui/revisi, checklist data sensitif |
| `/admin/gamifikasi` | Konfigurasi Gamifikasi | Tabel skor (read-only), distribusi tier, deteksi anomali |
| `/admin/esg` | Bukti ESG | Matriks E/S/G, pemetaan SDG, kesiapan bukti |
| `/admin/laporan` | Laporan | Ringkasan bulanan, ekspor, SROI sederhana |

Grup layout: `src/routes/(public)/`, `src/routes/member/`, `src/routes/admin/`.

---

## 4. Paket kerja & kepemilikan file (STRIKT)

> Satu file = satu pemilik. Agent **dilarang** menyentuh file milik paket lain.
> `src/app.css`, `src/app.html`, `package.json`, `vite.config.js`, `svelte.config.js`,
> `src/routes/+layout.svelte`, `src/routes/+layout.js` **sudah selesai — jangan diubah siapa pun.**

### WP-1 — Domain: konstanta & value object
```
src/lib/domain/constants/scoring-table.js      [SUDAH ADA — jangan diubah]
src/lib/domain/constants/tier-table.js
src/lib/domain/constants/esg-taxonomy.js
src/lib/domain/constants/kpi-targets.js
src/lib/domain/constants/community.js
src/lib/domain/value-objects/Points.js
src/lib/domain/value-objects/Tier.js
src/lib/domain/value-objects/EsgTag.js
src/lib/domain/value-objects/ConsentRecord.js
```

### WP-2 — Domain: entity, service, policy, repository
```
src/lib/domain/entities/{Member,PointActivity,Story,CommunityEvent,Movement,Reward,Badge,Broadcast}.js
src/lib/domain/services/{GamificationEngine,TierResolver,LeaderboardService,KpiCalculator,EsgEvidenceService}.js
src/lib/domain/policies/{AntiGamingPolicy,FeatureEligibilityPolicy}.js
src/lib/domain/repositories/Repository.js
```

### WP-3 — Infrastruktur & seed
```
src/lib/infrastructure/db.js
src/lib/infrastructure/repositories/*.js
src/lib/infrastructure/seed/{rng.js,names.js,seed-data.js,bootstrap.js}
```

### WP-4 — Store (runes)
```
src/lib/stores/{session,gamification,catalog,leaderboard,admin,toast}.svelte.js
```

### WP-5 — Komponen bersama & chart
```
src/lib/components/*.svelte   (+ index.js barrel)
src/lib/charts/*.svelte       (+ _chartTheme.js)
src/lib/utils/{format.js,date.js}
```

### WP-6 — Route publik   ### WP-7 — Route member   ### WP-8 — Route admin
Sesuai §3.

**Urutan:** WP-1 → WP-2 → WP-3 → WP-4 → WP-5 → (WP-6 ‖ WP-7 ‖ WP-8)

---

## 5. Kontrak export lintas paket (WAJIB dipatuhi persis)

### Konstanta
```js
// $lib/domain/constants/scoring-table.js  [SUDAH ADA]
export const ActivityType, ActionClass, SCORING_TABLE;
export function aturanSkor(type), poinUntuk(type);

// $lib/domain/constants/tier-table.js
export const TierLevel = { NEWCOMER, ACTIVE_MEMBER, CONTRIBUTOR, FEATURED_CANDIDATE, CHAMPION };
export const TIER_TABLE;   // [{ level, threshold, label, benefit, color, tint, ink }]
export function tierUntukPoin(points);        // -> entri TIER_TABLE
export function tierBerikutnya(points);       // -> entri | null

// $lib/domain/constants/kpi-targets.js
export const KPI_TARGETS;  // [{ id, label, target, unit, formula, source }]

// $lib/domain/constants/esg-taxonomy.js
export const EsgPillar = { E, S, G };
export const ESG_PILLARS, SDG_GOALS, ESG_ACTIVITY_MAP;

// $lib/domain/constants/community.js
export const CommunityType = { SOBI, WOMENPRENEUR };
export const COMMUNITIES, CHAPTERS, STORY_STATUS, MEMBER_STATUS, REWARD_CATEGORY;
```

### Value object (immutable, punya `equals`)
```js
new Points(value)            // .value .plus(p) .minus(p) .toString() .equals(o)  — tolak negatif
Tier.fromPoints(points)      // .level .label .threshold .color .benefit .isAtLeast(level)
new EsgTag(pillar, sdgGoal)  // .pillar .sdgGoal .label
new ConsentRecord({...})     // immutable; .revoke() -> instans BARU
```

### Service (menerima repository lewat konstruktor — Dependency Inversion)
```js
new GamificationEngine({ activityRepo, antiGamingPolicy })
  await award(memberId, activityType, { evidence, refId, occurredAt }) // -> { accepted, points, reason, activity }
  await totalPoints(memberId)
  await ledger(memberId)

TierResolver.resolve(points)          // statis -> Tier
TierResolver.progress(points)         // -> { current, next, gained, needed, percent }

new LeaderboardService({ memberRepo })
  await top({ scope:'global'|'community'|'chapter', key, period:'month'|'all', limit })

new KpiCalculator({ memberRepo, activityRepo, broadcastRepo, eventRepo })
  await snapshot()   // -> [{ id, label, actual, target, percent, status }]
  await organicReach()

new EsgEvidenceService({ storyRepo })
  await matrix()     // -> { E:{...}, S:{...}, G:{...} }
  isEvidenceReady(story)  // gate 4 syarat

AntiGamingPolicy.check(rule, todayCount)   // -> { allowed, reason }
FeatureEligibilityPolicy.evaluate(member, story) // -> { eligible, checks:[{label,passed}] }
```

### Store (singleton, runes)
```js
import { session }      from '$lib/stores/session.svelte.js';
  session.user, session.role, session.isAuthenticated
  session.loginAsMember(id?), session.loginAsAdmin(), session.logout(), session.homePath()

import { gamification } from '$lib/stores/gamification.svelte.js';
  gamification.points, gamification.tier, gamification.progress, gamification.ledger,
  gamification.dailyUsage, gamification.badges
  await gamification.perform(activityType, payload)   // memicu toast + refresh
  await gamification.refresh()

import { catalog }      from '$lib/stores/catalog.svelte.js';
  catalog.broadcasts, catalog.events, catalog.movements, catalog.stories,
  catalog.rewards, catalog.members
  await catalog.load(), catalog.storyBySlug(slug), catalog.byId(kind, id)

import { leaderboard }  from '$lib/stores/leaderboard.svelte.js';
import { admin }        from '$lib/stores/admin.svelte.js';   // kpi, esgMatrix, moderationQueue
import { toast }        from '$lib/stores/toast.svelte.js';   // toast.push({type,title,message,points})
```

### Komponen (props persis)
```
Button           {variant:'primary'|'secondary'|'ghost'|'outline'|'danger', size:'sm'|'md'|'lg',
                  href, type, disabled, loading, fullWidth, onclick, children}
Card             {variant:'default'|'interactive'|'highlight', padding:'none'|'sm'|'md'|'lg', class, children}
PageHeader       {title, subtitle, eyebrow, backHref, backLabel, actions?}
StatusBadge      {label, color:'blue'|'green'|'red'|'amber'|'slate'|'purple', size, withDot}
TierBadge        {tier, size:'sm'|'md'|'lg', showLabel}
PointsChip       {points, size, signed}
TierProgress     {points, showLabels}
ProgressBar      {value, max, color, height}
EmptyState       {title, message, icon, action?}
Avatar           {name, src, size}
MemberCard       {member, onclick}
StoryCard        {story, href}
EventCard        {event, onAttend}
MovementCard     {movement, href}
RewardCard       {reward, points, onRedeem}
BadgeTile        {badge, unlocked}
LeaderboardRow   {rank, member, points, highlight}
KpiCard          {kpi}
StatTile         {label, value, unit, hint, color}
Modal            {open, title, size, onclose, children}
Tabs             {tabs, active, onchange}
SearchInput      {value, placeholder, oninput}
FilterChips      {options, selected, onchange}
DataTable        {columns, rows, empty}
Timeline         {items}
EChart           {option, height, cls}
Sidebar / BottomNav / Header / Footer / ToastHost   (tanpa props wajib)
```

Semua ikon = **inline SVG stroke**, tanpa dependensi ikon eksternal.

---

## 6. Aturan seed data (WP-3)

- **Deterministik.** Dilarang `Math.random()` dan `Date.now()` saat runtime.
  Pakai PRNG `mulberry32` dengan seed tetap `20260529` di `rng.js`.
- Tanggal acuan tetap: `const TODAY = new Date('2026-07-20T00:00:00+07:00')`.
- **60 anggota**: nama Indonesia wajar (bukan "User 1"), 2 komunitas (SOBI ±40, Womenpreneur ±20),
  chapter PF10/PF11/PF12, universitas & kota Indonesia nyata, tahun lulus 2018–2025.
- **Distribusi tier realistis** (mengerucut): ±22 Newcomer (<25), ±16 Active, ±12 Contributor,
  ±7 Featured, ±3 Champion.
- **Konsistensi mutlak**: `PointActivity` tiap anggota **harus berjumlah persis** sama dengan total poinnya.
  Bangkitkan riwayat dulu, lalu jumlahkan — jangan menetapkan total lalu mengarang riwayat.
- Rentang tanggal aktivitas: Januari–Juli 2026 (sesuai timeline sumber), agar chart admin terisi 7 bulan.
- Lainnya: ≥12 broadcast, ≥20 cerita (tersebar di semua status), ≥10 kegiatan, ≥6 gerakan,
  ≥10 reward, ≥12 badge, catatan consent untuk tiap anggota.
- Bootstrap: isi Dexie sekali saja (tandai `seedVersion` di tabel meta); idempoten.

---

## 7. Definition of Done

Setiap paket kerja dianggap selesai bila:

1. `npm run build` **sukses tanpa error**.
2. `node scripts/verify/compile-all.mjs` — 0 gagal kompilasi.
3. Tidak ada import menggantung, tidak ada komponen/фungsi yang dirujuk tapi tidak ada.
4. Tidak ada teks placeholder (`Lorem ipsum`, `TODO`, `Coming soon`, `User 1`).
5. Seluruh teks yang dilihat pengguna **Bahasa Indonesia**.
6. Tidak ada angka poin/tier literal di luar `domain/constants/`.
7. Setiap halaman punya kondisi kosong (empty state) yang layak, bukan halaman blank.
8. Mobile-first: tidak ada scroll horizontal pada lebar 375px.

---

## 8. Aturan anti-bentrok untuk agent paralel

- Jangan mengedit file di luar paket kerjamu. Bila butuh sesuatu dari paket lain,
  **asumsikan kontrak §5 dan panggil apa adanya** — jangan membuat versi tandinganmu sendiri.
- Jangan menambah dependensi npm apa pun. Yang tersedia: `svelte`, `@sveltejs/kit`, `tailwindcss`,
  `dexie`, `echarts`. Titik.
- Jangan mengubah `app.css` / `app.html` / config / layout root.
- Bila menemukan kontrak §5 keliru, **tetap ikuti kontrak** dan laporkan di ringkasan akhirmu.
