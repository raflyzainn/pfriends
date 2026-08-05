# 08 — Design System (Pfriends)

> **Ruang lingkup:** bahasa visual + inventaris komponen untuk microsite Pfriends.
> **Turunan dari:** `00-SOURCE-BRIEF.md` (Hal 11–12 + Catatan Desain Visual), `03-GAMIFICATION-SPEC.md` (tier, badge, rarity),
> `04-ESG-GOVERNANCE.md` (pilar E/S/G).
> **Acuan gaya:** repo `Enduro` — `src/app.css`, `src/lib/components/*`, `src/lib/charts/_chartTheme.js`.
> **Aturan emas:** warna tier (`#2E7CD6` / `#7CB342` / `#E53935` / `#F0B429`) dan ambang (25/50/100/150)
> adalah **identitas kanonik dari Hal 12 — tidak boleh diganti**. Yang boleh ditambah adalah *turunan* untuk keterbacaan.

---

## 0. Tiga keputusan desain yang perlu diketahui lebih dulu

### 0.1 Warna slide dipakai sebagai **identitas**, bukan sebagai warna teks

Ini temuan terpenting dari dokumen ini, dan ia mengubah cara token disusun.

Keempat warna tier pada Hal 12 **semuanya gagal** rasio kontras WCAG AA (4.5:1) bila dipakai sebagai warna teks
di atas latar putih:

| Warna slide | Tier | Sebagai teks di putih | Teks putih di atasnya |
|---|---|---|---|
| `#2E7CD6` | Active Member | **4.23** ✗ | **4.23** ✗ |
| `#7CB342` | Contributor | **2.50** ✗ | **2.50** ✗ |
| `#E53935` | Featured Candidate | **4.23** ✗ | **4.23** ✗ |
| `#F0B429` | Champion | **1.86** ✗ | **1.86** ✗ |

Hal yang sama berlaku untuk dua warna brand Pertamina: merah `#ED1C24` = **4.38** ✗ dan hijau `#009B4C` = **3.63** ✗
sebagai teks di atas putih. (Perhatikan: Enduro memakai `text-pertamina-red` untuk teks kecil — itu **tidak** lolos AA
dan sebaiknya tidak ditiru.)

Menaikkan kontras dengan cara mengganti warna slide akan merusak identitas yang sudah disetujui Corsec.
Karena itu setiap warna beridentitas punya **tiga varian**:

| Sufiks | Fungsi | Boleh untuk teks? |
|---|---|---|
| *(polos)* — mis. `tier-champion` | **Identitas.** Fill chip, dot, bar progres, seri chart, garis aksen | **Tidak** |
| `-ink` — mis. `tier-champion-ink` | **Teks & ikon.** Versi gelap sehue, lolos AA di putih/tint/kanvas | **Ya** |
| `-tint` — mis. `tier-champion-tint` | **Latar lembut** chip & panel | Sebagai latar |

Aturan praktis: **warna polos tidak pernah menyentuh glyph.** Chip tier = latar `-tint` + teks `-ink` + dot warna polos.
Pola ini memberi warna slide porsi visual terbesar (dot + bar + chart) sekaligus membuat setiap huruf lolos AA.

### 0.2 Satu keluarga font: Plus Jakarta Sans

Slide menyebut "sans-serif geometric (Poppins/Inter-like)". Dipilih **Plus Jakarta Sans**, bukan Inter, dengan alasan:
karakternya geometrik-humanis (lebih dekat ke render slide daripada Inter yang lebih netral-grotesk), ia punya
rentang bobot 200–800 + tabular figures, dan asalnya Indonesia (Tokotype, ditugaskan Pemprov DKI Jakarta) —
relevan untuk produk komunitas Pertamina Foundation. Inter tetap ditaruh sebagai fallback pertama sehingga
bila font gagal dimuat, tampilan turun ke gaya Enduro, bukan ke Times.

### 0.3 Terang saja (light-only)

Mengikuti Enduro. Tidak ada dark mode di mockup ini. Token sudah dicek terhadap `ink-900` bila nanti dibutuhkan
(fill tier di atas `#0F1B2D`: 4.09 / 6.90 / 4.09 / 9.27 — biru & merah hanya lolos AA Large), tapi jangan
membangun dark mode sebelum diminta.

---

## 1. Palet warna — blok `@theme` siap tempel

Tempel apa adanya ke `src/app.css` (Tailwind 4). Setiap token menghasilkan utility otomatis
(`bg-tier-champion`, `text-tier-champion-ink`, `border-ink-200`, …).

```css
@import 'tailwindcss';

@plugin '@tailwindcss/forms';
@plugin '@tailwindcss/typography';

@theme {
	/* ══════════ BRAND PERTAMINA ══════════
	   -ink = varian teks lolos AA. Warna polos HANYA untuk fill/aksen. */
	--color-pertamina-red: #ed1c24;        /* fill saja — 4.38 sbg teks ✗   */
	--color-pertamina-red-ink: #b91820;    /* teks   — 6.53 ✓               */
	--color-pertamina-red-dark: #991b1b;   /* hover fill                    */
	--color-pertamina-red-tint: #fee2e2;

	--color-pertamina-blue: #0c4da2;       /* teks & fill — 8.08 ✓          */
	--color-pertamina-navy: #003e7e;       /* teks & fill — 10.55 ✓         */
	--color-pertamina-navy-dark: #002a55;
	--color-pertamina-navy-tint: #dbeafe;

	--color-pertamina-green: #009b4c;      /* fill saja — 3.63 sbg teks ✗   */
	--color-pertamina-green-ink: #0e7c52;  /* teks   — 5.22 ✓               */
	--color-pertamina-green-tint: #e3f5ec;

	--color-heading: #12355b;              /* judul  — 12.46 ✓ (warna slide) */

	/* ══════════ TIER — KANONIK HAL 12, JANGAN UBAH NILAI POLOSNYA ══════════ */
	--color-tier-active: #2e7cd6;          /* Active Member · 25 pts        */
	--color-tier-active-fill: #2c77cd;     /* chip solid + teks putih 4.54 ✓ */
	--color-tier-active-ink: #1c5fa8;      /* teks 6.46 ✓                   */
	--color-tier-active-tint: #e6effa;

	--color-tier-contributor: #7cb342;     /* Contributor · 50 pts          */
	--color-tier-contributor-ink: #4a6e28; /* teks 5.91 ✓                   */
	--color-tier-contributor-tint: #eff6e8;

	--color-tier-featured: #e53935;        /* Featured Candidate · 100 pts  */
	--color-tier-featured-fill: #d02f2b;   /* chip solid + teks putih 5.09 ✓ */
	--color-tier-featured-ink: #b3211e;    /* teks 6.66 ✓                   */
	--color-tier-featured-tint: #fce7e7;

	--color-tier-champion: #f0b429;        /* Champion · 150 pts            */
	--color-tier-champion-ink: #8a6410;    /* teks 5.37 ✓                   */
	--color-tier-champion-tint: #fdf6e5;

	/* ══════════ PILAR ESG ══════════ */
	--color-esg-e: #009b4c;                /* Environmental — hijau brand   */
	--color-esg-e-ink: #0e7c52;            /* 5.22 ✓                        */
	--color-esg-e-tint: #e3f5ec;

	--color-esg-s: #0c4da2;                /* Social — biru brand           */
	--color-esg-s-ink: #0c4da2;            /* 8.08 ✓ (polos sudah aman)     */
	--color-esg-s-tint: #e4edf8;

	--color-esg-g: #6d4aa8;                /* Governance — ungu             */
	--color-esg-g-ink: #6d4aa8;            /* 6.57 ✓ (polos sudah aman)     */
	--color-esg-g-tint: #ede7f6;

	/* ══════════ RARITY BADGE (03-GAMIFICATION-SPEC §6.2) ══════════ */
	--color-rarity-umum: #b08d57;          /* Perunggu                      */
	--color-rarity-umum-ink: #85693f;      /* 5.13 ✓                        */
	--color-rarity-langka: #9aa5b1;        /* Perak                         */
	--color-rarity-langka-ink: #5f6a75;    /* 5.52 ✓                        */
	--color-rarity-epik: #f0b429;          /* Emas                          */
	--color-rarity-epik-ink: #8a6410;      /* 5.37 ✓                        */
	--color-rarity-legendaris: #2e7cd6;    /* Platina                       */
	--color-rarity-legendaris-ink: #1c5fa8;/* 6.46 ✓                        */

	/* ══════════ SKALA NETRAL (ink) ══════════ */
	--color-ink-50: #f8fafc;
	--color-ink-100: #f1f5f9;
	--color-ink-200: #e2e8f0;   /* garis kartu, track progres            */
	--color-ink-300: #cbd5e1;   /* divider — dekoratif saja              */
	--color-ink-400: #94a3b8;   /* ikon dekoratif, placeholder — 2.56 ✗  */
	--color-ink-450: #7d8b9d;   /* batas kontrol form — 3.47 ✓ (1.4.11)  */
	--color-ink-500: #64748b;   /* teks sekunder di PUTIH — 4.76 ✓       */
	--color-ink-600: #475569;   /* teks sekunder di KANVAS — 7.00 ✓      */
	--color-ink-700: #334155;   /* body                — 10.35 ✓        */
	--color-ink-800: #1e293b;   /* judul               — 14.63 ✓        */
	--color-ink-900: #0f1b2d;   /* angka besar         — 17.28 ✓        */

	/* ══════════ SEMANTIK ══════════ */
	--color-success: #047857;   /* 5.48 ✓ */
	--color-success-tint: #d1fae5;
	--color-warning: #b45309;   /* 5.02 ✓ */
	--color-warning-tint: #fef3c7;
	--color-danger: #dc2626;    /* 4.83 ✓ */
	--color-danger-tint: #fee2e2;
	--color-info: #0369a1;      /* 5.93 ✓ */
	--color-info-tint: #e0f2fe;

	/* ══════════ PERMUKAAN ══════════ */
	--color-canvas: #f5f6f7;    /* latar aplikasi — persis catatan slide */
	--color-surface: #ffffff;

	/* ══════════ TIPOGRAFI ══════════ */
	--font-sans: 'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
	--font-display: 'Plus Jakarta Sans', 'Inter', system-ui, sans-serif;
	--font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, monospace;

	/* ══════════ RADIUS ══════════ */
	--radius-chip: 9999px;
	--radius-control: 0.625rem;  /* 10px — input, tombol sm/md */
	--radius-card: 1rem;         /* 16px — kartu standar       */
	--radius-panel: 1.25rem;     /* 20px — kartu besar, modal  */

	/* ══════════ SHADOW ══════════ */
	--shadow-card: 0 1px 2px 0 rgb(15 23 42 / 0.04);
	--shadow-card-hover: 0 4px 12px -2px rgb(15 23 42 / 0.08);
	--shadow-panel: 0 8px 24px -6px rgb(15 23 42 / 0.10);
	--shadow-modal: 0 20px 40px -12px rgb(15 23 42 / 0.22);
	--shadow-toast: 0 10px 28px -8px rgb(15 23 42 / 0.20);
}
```

### 1.1 Lapisan base + utility

```css
@layer base {
	html {
		scroll-behavior: smooth;
		font-family: var(--font-sans);
	}

	body {
		background: var(--color-canvas);
		/* Aura brand sangat halus — meniru Enduro, dijaga tetap tipis agar teks tetap lolos AA */
		background-image:
			radial-gradient(circle at 0% 0%, rgb(237 28 36 / 0.04) 0%, transparent 38%),
			radial-gradient(circle at 100% 100%, rgb(12 77 162 / 0.04) 0%, transparent 38%);
		background-attachment: fixed;
		color: var(--color-ink-700);
		min-height: 100vh;
		/* tnum = angka lebar sama; wajib agar poin & leaderboard tidak "goyang" */
		font-feature-settings: 'tnum', 'cv05';
		-webkit-font-smoothing: antialiased;
	}

	h1, h2, h3, h4 {
		color: var(--color-heading);
		font-family: var(--font-display);
		letter-spacing: -0.02em;
	}

	::selection {
		background: rgb(12 77 162 / 0.18);
		color: var(--color-ink-900);
	}

	/* Fokus terlihat di SEMUA kontrol — jangan pernah outline:none tanpa pengganti */
	:where(a, button, input, select, textarea, [tabindex]):focus-visible {
		outline: 2px solid var(--color-pertamina-blue);
		outline-offset: 2px;
		border-radius: 4px;
	}

	::-webkit-scrollbar { width: 10px; height: 10px; }
	::-webkit-scrollbar-track { background: transparent; }
	::-webkit-scrollbar-thumb {
		background: var(--color-ink-200);
		border-radius: 6px;
		border: 2px solid var(--color-surface);
	}
	::-webkit-scrollbar-thumb:hover { background: var(--color-ink-300); }

	@media (prefers-reduced-motion: reduce) {
		*, *::before, *::after {
			animation-duration: 0.01ms !important;
			animation-iteration-count: 1 !important;
			transition-duration: 0.01ms !important;
		}
	}
}

@utility card {
	background: var(--color-surface);
	border: 1px solid var(--color-ink-100);
	border-radius: var(--radius-card);
	box-shadow: var(--shadow-card);
	transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

@utility card-hover {
	background: var(--color-surface);
	border: 1px solid var(--color-ink-100);
	border-radius: var(--radius-card);
	box-shadow: var(--shadow-card);
	transition: border-color 0.2s ease, box-shadow 0.2s ease;

	&:hover {
		border-color: var(--color-ink-200);
		box-shadow: var(--shadow-card-hover);
	}
}

@utility surface-soft {
	background: var(--color-ink-50);
	border: 1px solid var(--color-ink-100);
}

/* Angka besar: tabular + rapat. Dipakai KpiCard, StatTile, PointsChip besar */
@utility numeric {
	font-family: var(--font-display);
	font-variant-numeric: tabular-nums;
	letter-spacing: -0.03em;
	font-weight: 700;
}

/* Label mikro uppercase — gaya khas portal Pertamina */
@utility label-micro {
	font-size: 0.625rem;      /* 10px */
	line-height: 1;
	text-transform: uppercase;
	letter-spacing: 0.1em;
	font-weight: 700;
	color: var(--color-ink-500);
}

/* Kilau tipis untuk kartu Champion — sekali pakai, jangan disebar */
@utility sheen-champion {
	background-image: linear-gradient(
		135deg,
		rgb(240 180 41 / 0.10) 0%,
		rgb(240 180 41 / 0) 55%
	);
}

@keyframes point-pop {
	0%   { transform: translateY(6px) scale(0.96); opacity: 0; }
	55%  { transform: translateY(-2px) scale(1.02); opacity: 1; }
	100% { transform: translateY(0) scale(1); opacity: 1; }
}
@utility point-pop { animation: point-pop 0.42s cubic-bezier(0.22, 1, 0.36, 1); }

@keyframes shimmer {
	100% { transform: translateX(100%); }
}
@utility skeleton {
	position: relative;
	overflow: hidden;
	background: var(--color-ink-100);
	border-radius: 6px;

	&::after {
		content: '';
		position: absolute;
		inset: 0;
		transform: translateX(-100%);
		background: linear-gradient(90deg, transparent, rgb(255 255 255 / 0.65), transparent);
		animation: shimmer 1.6s infinite;
	}
}
```

---

## 2. Tabel kontras terverifikasi (WCAG 2.1)

Dihitung dengan rumus relative-luminance resmi. **AA teks normal ≥ 4.5**, **AA teks besar ≥ 3.0**
(≥24px, atau ≥18.66px bold), **komponen non-teks ≥ 3.0** (1.4.11).

### 2.1 Pasangan yang WAJIB dipakai (semua lolos)

| Latar depan | Latar belakang | Rasio | Status |
|---|---|---:|---|
| `ink-900` #0F1B2D | putih | **17.28** | AAA |
| `ink-800` #1E293B | putih | **14.63** | AAA |
| `heading` #12355B | putih | **12.46** | AAA |
| `ink-700` #334155 | putih | **10.35** | AAA |
| `pertamina-navy` #003E7E | putih | **10.55** | AAA |
| `pertamina-blue` #0C4DA2 | putih | **8.08** | AAA |
| `ink-600` #475569 | putih | **7.58** | AAA |
| `tier-featured-ink` #B3211E | putih | **6.66** | AAA |
| `esg-g-ink` #6D4AA8 | putih | **6.57** | AAA |
| `pertamina-red-ink` #B91820 | putih | **6.53** | AAA |
| `tier-active-ink` #1C5FA8 | putih | **6.46** | AAA |
| `info` #0369A1 | putih | **5.93** | AA+ |
| `tier-contributor-ink` #4A6E28 | putih | **5.91** | AA+ |
| `rarity-langka-ink` #5F6A75 | putih | **5.52** | AA+ |
| `success` #047857 | putih | **5.48** | AA+ |
| `tier-champion-ink` #8A6410 | putih | **5.37** | AA+ |
| `esg-e-ink` #0E7C52 | putih | **5.22** | AA+ |
| `rarity-umum-ink` #85693F | putih | **5.13** | AA+ |
| `warning` #B45309 | putih | **5.02** | AA+ |
| `danger` #DC2626 | putih | **4.83** | AA |
| `ink-500` #64748B | putih | **4.76** | AA |

### 2.2 Teks `-ink` di atas `-tint` sewarna (chip tier)

| Chip | Teks | Latar | Rasio |
|---|---|---|---:|
| Active Member | `#1C5FA8` | `#E6EFFA` | **5.56** ✓ |
| Contributor | `#4A6E28` | `#EFF6E8` | **5.35** ✓ |
| Featured Candidate | `#B3211E` | `#FCE7E7` | **5.62** ✓ |
| Champion | `#8A6410` | `#FDF6E5` | **4.98** ✓ |

### 2.3 Teks `-ink` di atas kanvas `#F5F6F7`

| Teks | Rasio | | Teks | Rasio |
|---|---:|---|---|---:|
| `tier-featured-ink` | **6.16** ✓ | | `tier-contributor-ink` | **5.46** ✓ |
| `tier-active-ink` | **5.97** ✓ | | `tier-champion-ink` | **4.96** ✓ |
| `ink-700` | **9.57** ✓ | | `ink-600` | **7.00** ✓ |

### 2.4 Chip tier versi solid

| Kombinasi | Rasio | Catatan |
|---|---:|---|
| putih pada `tier-active-fill` #2C77CD | **4.54** ✓ | pakai `-fill`, bukan `#2E7CD6` (4.23 ✗) |
| putih pada `tier-featured-fill` #D02F2B | **5.09** ✓ | pakai `-fill`, bukan `#E53935` (4.23 ✗) |
| `ink-900` pada `tier-contributor` #7CB342 | **6.90** ✓ | hijau & kuning pakai **teks gelap** |
| `ink-900` pada `tier-champion` #F0B429 | **9.27** ✓ | idem |

> Hijau dan kuning tidak punya versi solid berteks putih — mustahil tanpa merusak warna. Solusinya bukan
> memaksa putih, tapi membalik polaritas: **fill terang + teks `ink-900`**. Hasilnya justru kontras terbaik
> di seluruh sistem (9.27).

### 2.5 Yang GAGAL — daftar larangan eksplisit

| Kombinasi | Rasio | Boleh dipakai untuk |
|---|---:|---|
| `pertamina-red` #ED1C24 sebagai teks | 4.38 ✗ | logo, fill tombol, garis aksen, dot |
| putih di atas `pertamina-red` | 4.38 ✗ | tombol **≥16px bold** saja (AA Large); teks kecil pakai `red-dark` |
| `pertamina-green` #009B4C sebagai teks | 3.63 ✗ | fill, dot, seri chart |
| `tier-*` polos sebagai teks | 1.86–4.23 ✗ | dot, bar, seri chart, garis aksen |
| `ink-400` #94A3B8 sebagai teks | 2.56 ✗ | ikon dekoratif, placeholder non-esensial |
| `ink-300` #CBD5E1 sebagai border kontrol | 1.48 ✗ | divider dekoratif saja |

> Untuk batas kontrol yang bermakna (input, checkbox kosong, tombol outline) gunakan **`ink-450` #7D8B9D
> = 3.47 ✓**. `ink-300` hanya untuk garis pemisah yang hilang pun tidak mengubah arti.

---

## 3. Tipografi

### 3.1 Pemuatan

```html
<!-- src/app.html — di dalam <head> -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
	href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
	rel="stylesheet"
/>
```

Lima bobot saja (400/500/600/700/800). `display=swap` wajib supaya teks tetap terbaca saat font dimuat.

### 3.2 Skala

Skala 1.200 (minor third) dibulatkan ke kelipatan yang enak dibaca. Kolom "Kelas" adalah utility Tailwind final.

| Peran | Ukuran | Bobot | Tracking | Warna | Kelas |
|---|---|---|---|---|---|
| Display (hero angka) | 40px / 1.0 | 800 | -0.03em | `ink-900` | `text-[40px] font-extrabold tracking-[-0.03em]` |
| H1 halaman | 24px→28px / 1.2 | 700 | -0.02em | `heading` | `text-2xl md:text-[28px] font-bold tracking-[-0.02em]` |
| H2 seksi | 20px / 1.3 | 700 | -0.02em | `heading` | `text-xl font-bold tracking-[-0.02em]` |
| H3 judul kartu | 16px / 1.4 | 600 | -0.01em | `ink-800` | `text-base font-semibold` |
| H4 sub-kartu | 14px / 1.4 | 600 | 0 | `ink-800` | `text-sm font-semibold` |
| Body | 14px / 1.6 | 400 | 0 | `ink-700` | `text-sm leading-relaxed` |
| Body kecil | 13px / 1.55 | 400 | 0 | `ink-600` | `text-[13px]` |
| Caption | 12px / 1.45 | 400 | 0 | `ink-500`¹ | `text-xs` |
| **Label mikro** | 10px / 1.0 | 700 | **+0.1em** | `ink-500`¹ | `label-micro` |
| Angka besar (KPI) | 30px / 1.0 | 700 | -0.03em | `ink-900` | `numeric text-3xl` |
| Angka sedang (stat) | 24px / 1.0 | 700 | -0.03em | `ink-900` | `numeric text-2xl` |
| Angka chip (poin) | 13px / 1.0 | 700 | -0.01em | kontekstual | `numeric text-[13px]` |
| Tombol | 14px / 1.0 | 600 | 0 | kontekstual | `text-sm font-semibold` |

¹ `ink-500` = 4.76 di **putih** tapi **4.40 di kanvas** `#F5F6F7` — gagal AA. Aturan: caption & label mikro
di atas kartu putih pakai `ink-500`; bila diletakkan langsung di kanvas, naikkan ke **`ink-600`**.

### 3.3 Aturan angka

Semua angka yang bisa berubah (poin, peringkat, saldo KT, persentase KPI, hitungan anggota) **wajib**
`font-variant-numeric: tabular-nums` — tersedia lewat utility `numeric` atau `tabular-nums`.
Tanpa ini, angka pada leaderboard dan timer akan bergeser horizontal setiap kali nilainya berubah.

Format lokal Indonesia di seluruh UI: `value.toLocaleString('id-ID')` → `1.250` bukan `1,250`.

---

## 4. Spacing, radius, shadow, border

### 4.1 Spacing

Basis **4px**. Gunakan hanya langkah berikut — jangan improvisasi nilai arbitrer.

| Token | px | Dipakai untuk |
|---|---|---|
| `1` | 4 | jarak ikon↔teks dalam chip |
| `1.5` | 6 | gap dalam badge |
| `2` | 8 | gap elemen sebaris |
| `3` | 12 | padding chip, gap grid rapat |
| `4` | 16 | **padding kartu default**, gap grid |
| `5` | 20 | padding kartu longgar |
| `6` | 24 | gap antar-blok, padding modal |
| `8` | 32 | jarak antar-seksi |
| `12` | 48 | jarak sebelum footer |

Ritme halaman: `PageHeader` → `mb-6`; antar seksi → `space-y-6`; grid kartu → `gap-4`.
Lebar konten maksimum `max-w-7xl` dengan `px-4 sm:px-6 lg:px-8`.

### 4.2 Radius

| Token | Nilai | Dipakai untuk |
|---|---|---|
| `rounded-chip` | 9999px | badge, chip poin, pil filter, avatar |
| `rounded-control` | 10px | input, tombol `sm`/`md` |
| `rounded-xl` | 12px | tombol `lg`, tile kecil, item nav |
| `rounded-card` | 16px | **kartu standar** |
| `rounded-panel` | 20px | kartu besar, modal, sheet |

Aturan bersarang: elemen anak selalu radius lebih kecil dari induk (kartu 16 → tile dalam 12 → chip 9999).

### 4.3 Shadow

Bayangan di sistem ini **halus dan berlapis satu** — bukan efek dramatis. Kedalaman terutama disampaikan
lewat border, bukan blur.

| Token | Dipakai untuk |
|---|---|
| `shadow-card` | kartu diam |
| `shadow-card-hover` | kartu interaktif saat hover |
| `shadow-panel` | dropdown, popover, kartu tersorot |
| `shadow-modal` | dialog |
| `shadow-toast` | toast poin |

Jangan menumpuk shadow pada elemen bersarang — hanya kontainer terluar yang boleh punya bayangan.

### 4.4 Border

| Konteks | Token | Alasan |
|---|---|---|
| Garis kartu | `border-ink-100` | tenang, sesuai catatan slide "border tipis abu" |
| Kartu hover | `border-ink-200` | umpan balik tanpa geser layout |
| Divider dekoratif | `border-ink-200` / `ink-300` | tidak membawa makna |
| **Batas kontrol form** | **`border-ink-450`** | 3.47 ✓ — wajib WCAG 1.4.11 |
| Garis aksen kiri kartu | `2px solid var(--color-tier-*)` | kanal warna identitas |
| Fokus | `outline 2px pertamina-blue` + offset 2px | 8.08 ✓ di semua latar terang |

Border selalu **1px** kecuali garis aksen kiri (2px) dan ring fokus (2px).

---

## 5. Inventaris komponen

Lokasi: `src/lib/components/`. Semua komponen **Svelte 5 runes**, JavaScript + JSDoc (bukan TypeScript).
Semua props lewat `$props()` dengan nilai default. Komponen bersifat **presentational** — tidak boleh
mengimpor repository/Dexie, tidak boleh menghitung aturan domain (tier, kelayakan, poin). Nilai
turunan dihitung di store/service, komponen hanya menerima dan menggambar.

Konvensi berulang: `class: className = ''` untuk override, `children` untuk slot utama,
snippet bernama untuk slot tambahan, `$bindable()` untuk two-way.

### 5.1 Primitif

#### `Button.svelte`
```js
/**
 * @typedef {'primary'|'secondary'|'outline'|'ghost'|'danger'|'success'} ButtonVariant
 * @typedef {'sm'|'md'|'lg'} ButtonSize
 */
let {
	/** @type {ButtonVariant} */ variant = 'primary',
	/** @type {ButtonSize} */ size = 'md',
	/** @type {boolean} */ disabled = false,
	/** @type {boolean} */ loading = false,
	/** @type {boolean} */ fullWidth = false,
	/** @type {string} */ href = '',
	/** @type {'button'|'submit'|'reset'} */ type = 'button',
	/** @type {string} */ iconPath = '',
	/** @type {'left'|'right'} */ iconPosition = 'left',
	/** @type {string} */ class: className = '',
	/** @type {(e: MouseEvent) => void} */ onclick = undefined,
	children
} = $props();
```
**Varian.** `primary` = fill `pertamina-red`, teks putih **≥14px semibold** (4.38 → hanya sah sebagai AA Large,
karena itu ukuran `sm` memakai `pertamina-red-dark` sebagai fill, 6.53 ✓). `secondary` = putih + border
`ink-200` + teks `ink-700`. `outline` = border `pertamina-red` + teks `pertamina-red-ink`. `ghost` = transparan,
teks `ink-600`, hover `bg-ink-100`. `danger` = fill `danger`. `success` = fill `success`.
**Tampilan.** `inline-flex items-center justify-center gap-2 font-semibold`, `active:scale-[0.98]`,
transisi 150ms. Saat `loading`: spinner SVG 16px + konten tetap terpasang (lebar tidak melompat), tombol `disabled`.
Bila `href` terisi, render `<a>` bukan `<button>`.

#### `Card.svelte`
```js
/**
 * @typedef {'default'|'flush'|'interactive'|'highlight'} CardVariant
 * @typedef {'none'|'sm'|'md'|'lg'} CardPadding
 */
let {
	/** @type {CardVariant} */ variant = 'default',
	/** @type {CardPadding} */ padding = 'md',
	/** @type {boolean} */ shadow = true,
	/** @type {string} */ accent = '',      // hex garis aksen kiri, mis. var tier
	/** @type {string} */ href = '',
	/** @type {string} */ class: className = '',
	children
} = $props();
```
**Varian.** `default` putih + `border-ink-100` + `rounded-card`. `flush` sama tapi `overflow-hidden`
(untuk media/tabel mepet tepi). `interactive` menambah `card-hover` + `cursor-pointer`. `highlight`
memakai `border-pertamina-red/30` + latar `pertamina-red/[0.02]`.
**Tampilan.** Bila `accent` diisi → `style="border-left: 2px solid {accent}"`. Padding: `sm` 16px, `md` 20px, `lg` 24px.

#### `StatusBadge.svelte`
```js
/**
 * @typedef {'red'|'blue'|'navy'|'green'|'amber'|'slate'|'purple'} BadgeColor
 */
let {
	/** @type {string} */ label = '',
	/** @type {BadgeColor} */ color = 'slate',
	/** @type {'sm'|'md'} */ size = 'md',
	/** @type {'soft'|'solid'|'outline'} */ variant = 'soft',
	/** @type {boolean} */ withDot = false,
	/** @type {string} */ iconPath = ''
} = $props();
```
**Tampilan.** Pil `rounded-chip` `font-semibold`. `soft` (default) = latar `-tint` + teks `-ink` + border
`-ink/20`. `solid` = fill penuh + teks putih (hanya untuk warna yang lolos: red-dark, navy, success, danger).
`outline` = transparan + border + teks `-ink`. Ukuran `sm` = 10px/`px-2 py-0.5`, `md` = 12px/`px-2.5 py-1`.
Dot 6px memakai warna polos.

#### `Avatar.svelte`
```js
let {
	/** @type {string} */ name = '',
	/** @type {string} */ src = '',
	/** @type {'xs'|'sm'|'md'|'lg'|'xl'} */ size = 'md',
	/** @type {string} */ tier = '',         // 'CHAMPION' dst → warna ring
	/** @type {boolean} */ showRing = false,
	/** @type {'online'|'offline'|''} */ status = ''
} = $props();
```
**Tampilan.** Lingkaran; bila `src` kosong → inisial (maks 2 huruf) di atas latar `ink-100`, teks `ink-600`,
`font-semibold`. Ukuran: xs 24, sm 32, md 40, lg 56, xl 80 px. Bila `showRing` → `ring-2 ring-offset-2`
berwarna tier polos — ini salah satu tempat warna tier polos memang tepat karena tidak menyentuh teks.

#### `Icon.svelte`
```js
let {
	/** @type {string} */ path = '',          // 'd' dari registry ikon
	/** @type {14|16|18|20|24} */ size = 20,
	/** @type {number} */ strokeWidth = 1.8,
	/** @type {string} */ class: className = ''
} = $props();
```
**Tampilan.** `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round"
stroke-linejoin="round">`. Selalu mewarisi `currentColor` — tidak pernah punya warna sendiri.

### 5.2 Gamifikasi

#### `TierBadge.svelte`
```js
/**
 * @typedef {'ACTIVE_MEMBER'|'CONTRIBUTOR'|'FEATURED_CANDIDATE'|'CHAMPION'|null} TierCode
 */
let {
	/** @type {TierCode} */ tier = null,
	/** @type {'sm'|'md'|'lg'} */ size = 'md',
	/** @type {'soft'|'solid'|'minimal'} */ variant = 'soft',
	/** @type {boolean} */ honorary = false,   // Gelar Kehormatan (§3.1)
	/** @type {boolean} */ locked = false,     // status TIER_LOCKED (§3.2)
	/** @type {number|null} */ points = null
} = $props();
```
**Tampilan.** `soft` = latar `tier-*-tint` + teks `tier-*-ink` + dot `tier-*` polos (rasio 4.98–5.62 ✓).
`solid` = biru/merah pakai `-fill` + teks putih; hijau/kuning pakai fill polos + teks `ink-900`.
`minimal` = dot + teks `-ink` tanpa latar.
`tier = null` → "Belum Aktif", abu netral (`ink-100` / `ink-600`).
`honorary` → prefiks "Pernah: " + ikon perisai, opasitas 85%, tanpa dot berkedip.
`locked` → chip abu + ikon gembok 14px + teks `ink-600`; **jangan** pakai warna tier untuk tier terkunci,
karena akan membaca seolah sudah tercapai.

#### `PointsChip.svelte`
```js
let {
	/** @type {number} */ value = 0,
	/** @type {'PK'|'KT'} */ currency = 'PK',
	/** @type {number|null} */ delta = null,   // +5 → animasi masuk
	/** @type {'sm'|'md'|'lg'} */ size = 'md',
	/** @type {boolean} */ showLabel = true
} = $props();
```
**Tampilan.** Pil dengan ikon 14px + angka `numeric` + satuan. **PK** (Poin Kontribusi) memakai
`pertamina-navy` di latar `pertamina-navy-tint` dan ikon kilat — warna "prestasi". **KT** (Koin Tukar)
memakai `rarity-epik-ink` di latar `tier-champion-tint` dan ikon koin — warna "mata uang". Perbedaan
warna **dan** ikon ini penting: dua mata uang tidak boleh tertukar secara visual (§2.2 spec gamifikasi).
Bila `delta` diisi → superskrip `+N` hijau `success` dengan animasi `point-pop`.

#### `ProgressBar.svelte`
```js
let {
	/** @type {number} */ value = 0,
	/** @type {number} */ max = 100,
	/** @type {string} */ color = 'var(--color-pertamina-blue)',
	/** @type {'xs'|'sm'|'md'} */ size = 'sm',
	/** @type {boolean} */ showLabel = false,
	/** @type {string} */ label = '',
	/** @type {boolean} */ animated = true
} = $props();
```
**Tampilan.** Track `bg-ink-200` `rounded-chip`; tinggi xs 4, sm 6, md 10 px. Fill memakai warna identitas
+ **`box-shadow: inset 0 0 0 1px <warna -ink>`**. Cincin tipis itu bukan hiasan: fill `#F0B429` di atas track
`#E2E8F0` hanya 1.51:1 sehingga batas segmen terisi tak terlihat; cincin `-ink` memberi **4.36:1** terhadap
track dan memenuhi WCAG 1.4.11. Transisi `width 0.6s cubic-bezier(0.22,1,0.36,1)`.
ARIA wajib: `role="progressbar" aria-valuenow aria-valuemin aria-valuemax aria-label`.

#### `TierProgress.svelte`
```js
/**
 * @typedef {{ label: string, done: boolean, hint?: string }} TierRequirement
 */
let {
	/** @type {number} */ activePk = 0,
	/** @type {TierCode} */ currentTier = null,
	/** @type {TierCode} */ nextTier = null,
	/** @type {number} */ nextThreshold = 25,
	/** @type {TierRequirement[]} */ requirements = [],
	/** @type {boolean} */ locked = false
} = $props();
```
**Tampilan.** Komponen paling penting di produk ini. Susunan vertikal:
1. Baris atas: `TierBadge` tier sekarang + `PointsChip` poin aktif.
2. Rel bertanda 4 ambang **25 / 50 / 100 / 150** dengan jarak **proporsional terhadap nilai**
   (bukan jarak sama rata) — supaya jarak Featured→Champion terbaca sebagaimana adanya.
   Titik yang sudah lewat = warna tier terisi; yang belum = `ink-300` kosong.
3. Teks sisa: "**30 poin lagi** menuju Contributor" — angka `numeric font-bold`, sisanya `ink-600`.
4. Bila `locked`: panel `warning-tint` + checklist `requirements`. Setiap baris memakai ikon centang
   (`success`) atau lingkaran kosong (`ink-450`) + label + `hint` sebagai baris kedua `text-xs ink-600`.
   **Checklist selalu menyatakan apa yang kurang dan tindakan konkretnya**, tidak pernah sekadar
   "belum memenuhi syarat" (mandat §3.2).

#### `BadgeTile.svelte`
```js
/**
 * @typedef {'UMUM'|'LANGKA'|'EPIK'|'LEGENDARIS'} Rarity
 */
let {
	/** @type {{code:string,name:string,family:string,rarity:Rarity,criteria:string}} */ badge,
	/** @type {boolean} */ owned = false,
	/** @type {'sm'|'md'} */ size = 'md',
	/** @type {string|null} */ awardedAt = null,
	/** @type {(badge:any)=>void} */ onclick = undefined
} = $props();
```
**Tampilan.** Kotak `rounded-card` `aspect-square` berisi medali SVG 40px + nama badge 12px semibold +
label rarity `label-micro` berwarna `rarity-*-ink`.
**Dimiliki:** latar putih, border `rarity-*` 20% opasitas, medali berwarna penuh.
**Belum:** `grayscale opacity-45`, medali `ink-300`, kriteria unlock tampil sebagai `title`/tooltip —
badge terkunci **tetap terlihat**, karena katalog yang terlihat adalah pendorong utama Core Drive #4.
Hanya `LEGENDARIS` yang memperoleh `sheen-champion` + ring 2px. Rarity lain tidak berkilau — kelangkaan
harus terasa langka.

#### `LeaderboardRow.svelte`
```js
let {
	/** @type {number} */ rank = 0,
	/** @type {{id:string,name:string,avatar?:string,community:string,tier:TierCode}} */ member,
	/** @type {number} */ points = 0,
	/** @type {number|null} */ delta = null,     // perubahan peringkat
	/** @type {boolean} */ isCurrentUser = false,
	/** @type {'compact'|'full'} */ variant = 'full'
} = $props();
```
**Tampilan.** Baris `flex items-center gap-3 py-3`, dipisah `border-b border-ink-100`.
Kolom peringkat lebar tetap 32px, `numeric text-right`. Peringkat 1–3 memakai lencana bundar
(emas `rarity-epik`, perak `rarity-langka`, perunggu `rarity-umum`) dengan **angka `ink-900` di dalamnya**,
bukan teks berwarna. Peringkat ≥4 = angka `ink-500` polos.
Lalu `Avatar sm` → nama (`text-sm font-semibold ink-800`) + baris kedua komunitas & `TierBadge minimal` →
`PointsChip` di ujung kanan.
`isCurrentUser` → latar `pertamina-navy-tint`, border kiri 2px `pertamina-blue`, dan **row menempel
(`sticky`) di bawah daftar** bila posisinya di luar viewport, supaya pengguna selalu tahu posisinya sendiri.
`delta` → panah kecil ↑ `success` / ↓ `ink-500`. Penurunan peringkat **tidak** diwarnai merah — memalukan
dan bukan kesalahan.

#### `RewardCard.svelte`
```js
let {
	/** @type {{id:string,name:string,category:string,priceKt:number,minTier:TierCode,quota:number,remaining:number,image?:string}} */ reward,
	/** @type {number} */ balanceKt = 0,
	/** @type {TierCode} */ userTier = null,
	/** @type {(reward:any)=>void} */ onRedeem = undefined
} = $props();
```
**Tampilan.** Kartu `flush`: gambar 16:9 (fallback = blok gradien lembut + ikon kategori), lalu padding 16px
berisi nama, `PointsChip KT` sebagai harga, dan baris syarat. Bila `userTier` di bawah `minTier` → tombol
nonaktif + `TierBadge locked` + teks "Perlu tier Contributor". Bila `balanceKt < priceKt` → tombol nonaktif +
"Kurang **120 KT**". Sisa kuota rendah (<20%) → `StatusBadge amber` "Sisa 3". Ketiga penghalang ini
dinyatakan **eksplisit dengan angkanya** — tidak pernah tombol mati tanpa penjelasan.

### 5.3 Kartu domain

#### `MemberCard.svelte`
```js
let {
	/** @type {{id:string,name:string,avatar?:string,community:'SOBI'|'WOMENPRENEUR',chapter:string,tier:TierCode,activePk:number,badges:number,city?:string,headline?:string}} */ member,
	/** @type {'grid'|'list'} */ variant = 'grid',
	/** @type {boolean} */ showActions = false
} = $props();
```
**Tampilan.** `grid` = kartu tegak: `Avatar lg` di tengah, nama, headline 1 baris (`line-clamp-1`),
`TierBadge soft`, lalu strip statistik 3 kolom (Poin / Badge / Chapter) dipisah `divide-x divide-ink-100`.
`list` = baris horizontal ringkas untuk direktori. Komunitas ditandai `StatusBadge`: SOBI `navy`,
Womenpreneur `purple` — **dua komunitas harus selalu bisa dibedakan sekilas** karena seluruh nilai
platform ini adalah mempertemukan keduanya.

#### `StoryCard.svelte`
```js
let {
	/** @type {{id:string,title:string,excerpt:string,author:{name:string,avatar?:string,tier:TierCode},cover?:string,esgPillar:'E'|'S'|'G',status:'DRAFT'|'SUBMITTED'|'VERIFIED'|'PUBLISHED',publishedAt?:string,readMinutes?:number}} */ story,
	/** @type {'grid'|'feature'|'compact'} */ variant = 'grid',
	/** @type {boolean} */ showStatus = false
} = $props();
```
**Tampilan.** Sampul 16:9 dengan **pita pilar ESG** 3px di tepi bawah gambar (`esg-*`), judul 16px semibold
`line-clamp-2`, kutipan 13px `ink-600` `line-clamp-2`, kaki: `Avatar xs` + nama + tanggal + "· 4 mnt baca".
`feature` = lebar penuh, sampul 21:9, judul 20px. `compact` = tanpa sampul.
`showStatus` (tampilan pengurus) → `StatusBadge`: DRAFT `slate`, SUBMITTED `amber`, VERIFIED `blue`,
PUBLISHED `green`.

#### `EventCard.svelte`
```js
let {
	/** @type {{id:string,title:string,startAt:string,endAt?:string,mode:'ONLINE'|'OFFLINE'|'HYBRID',location?:string,chapter?:string,quota:number,registered:number,pointsReward:number,status:'UPCOMING'|'ONGOING'|'DONE'}} */ event,
	/** @type {'grid'|'list'} */ variant = 'grid',
	/** @type {boolean} */ isRegistered = false,
	/** @type {(event:any)=>void} */ onRegister = undefined
} = $props();
```
**Tampilan.** Blok tanggal kiri (`rounded-xl bg-pertamina-navy-tint`, tanggal `numeric text-2xl`
`pertamina-navy`, bulan `label-micro`) + isi kanan: judul, baris meta ikon (waktu · mode · lokasi),
`ProgressBar xs` kuota, dan `PointsChip` hadiah poin. `mode` ditandai `StatusBadge`: ONLINE `blue`,
OFFLINE `green`, HYBRID `purple`. Kuota penuh → tombol berubah "Daftar Tunggu", bukan mati.

#### `MovementCard.svelte`
```js
let {
	/** @type {{id:string,title:string,pillar:'E'|'S'|'G',sdgTags:string[],targetParticipants:number,joined:number,locations:number,deadline?:string,cover?:string}} */ movement,
	/** @type {(m:any)=>void} */ onJoin = undefined
} = $props();
```
**Tampilan.** Kartu berkarakter paling "gerakan": garis aksen kiri 2px `esg-*`, ikon pilar dalam kotak
`rounded-xl` berlatar `esg-*-tint`, judul, deret chip SDG (`StatusBadge sm outline`), lalu **dua metrik
berdampingan** — peserta bergabung dan jumlah lokasi — dengan `ProgressBar` menuju target.
Bahasa mengedepankan kolektif ("**248** dari 500 orang bergerak"), bukan individu.

#### `KpiCard.svelte`
```js
let {
	/** @type {{id:string,name:string,actual:number,target:number,unit:string,category:string,change?:number,invertChange?:boolean,iconPath?:string}} */ kpi
} = $props();
```
**Tampilan.** Mengikuti Enduro agar konsisten dengan portal lain: garis aksen kiri 2px berwarna kategori,
`label-micro` nama KPI, angka `numeric text-3xl` + satuan, baris target + persentase pencapaian,
`ProgressBar xs` di bawah. Delta perubahan sebagai chip mungil `success-tint`/`danger-tint` di kanan atas;
hormati `invertChange` untuk KPI yang "turun = bagus".

#### `StatTile.svelte`
```js
let {
	/** @type {string} */ label = '',
	/** @type {string|number} */ value = 0,
	/** @type {string} */ unit = '',
	/** @type {string} */ iconPath = '',
	/** @type {string} */ accent = 'var(--color-pertamina-blue)',
	/** @type {number|null} */ trend = null,
	/** @type {'sm'|'md'} */ size = 'md',
	/** @type {string} */ href = ''
} = $props();
```
**Tampilan.** Ubin ringkas untuk baris ringkasan: ikon 20px dalam kotak 36px `rounded-xl` berlatar
`accent` 10% opasitas, `label-micro`, angka `numeric text-2xl`. Lebih ringan dari `KpiCard` — dipakai
4–6 buah sebaris di puncak dashboard.

### 5.4 Navigasi & kerangka

#### `Header.svelte`
```js
let {
	/** @type {() => void} */ onMenuToggle = undefined,
	/** @type {{name:string,avatar?:string,tier:TierCode,activePk:number,balanceKt:number}|null} */ user = null,
	/** @type {number} */ notificationCount = 0
} = $props();
```
**Tampilan.** Bar tinggi 56px, `bg-white/85 backdrop-blur border-b border-ink-100 sticky top-0 z-30`.
Kiri: tombol menu (mobile) + logo. Kanan: `PointsChip PK` + `PointsChip KT` (**selalu terlihat di semua
halaman** — saldo yang terlihat adalah pengingat progres paling murah), lonceng notifikasi dengan titik
`pertamina-red`, lalu `Avatar sm` bertier-ring yang membuka menu.

#### `Sidebar.svelte`
```js
/**
 * @typedef {{id:string,label:string,href:string,iconPath:string,badge?:string|number,children?:NavItem[]}} NavItem
 */
let {
	/** @type {boolean} */ open = $bindable(false),
	/** @type {NavItem[]} */ nav = [],
	/** @type {string} */ version = '0.1.0'
} = $props();
```
**Tampilan.** Lebar 288px, gradien putih→`#FDFBF9` seperti Enduro, `fixed` + geser di mobile dengan
backdrop `ink-900/50`. Item: tinggi 40px, `rounded-xl`, ikon dalam kotak 32px. Aktif → latar putih +
`shadow-card` + border + pita kiri 3px `pertamina-red` + ikon `pertamina-red-ink`. Induk dengan anak
bisa dilipat dan **otomatis terbuka** bila salah satu anaknya aktif. Kaki: versi + hak cipta.

#### `BottomNav.svelte`
```js
let {
	/** @type {{id:string,label:string,href:string,iconPath:string,badge?:number}[]} */ items = [],
	/** @type {string} */ activeId = ''
} = $props();
```
**Tampilan.** Khusus mobile (`lg:hidden`), `fixed bottom-0`, tinggi 56px + `env(safe-area-inset-bottom)`,
`bg-white/95 backdrop-blur border-t border-ink-100`. Maksimum **5 item**. Item aktif: ikon `pertamina-red-ink`
+ label 10px semibold + titik 4px di atas ikon. Non-aktif `ink-500`. Sasaran sentuh minimum 44×44px.
Anggota komunitas mengakses microsite ini terutama dari ponsel lewat tautan WhatsApp — `BottomNav`
adalah navigasi utama, bukan pelengkap.

#### `Footer.svelte`
```js
let {
	/** @type {boolean} */ compact = false
} = $props();
```
**Tampilan.** Garis atas `border-ink-200`, kiri: logo Pertamina Foundation + baris "Pfriends · Community
Connect Initiative" dan "Divisi Corporate Secretary". Kanan: `label-micro` "Didukung oleh" + kotak logo
Pertamina & Danantara Indonesia. Pada mobile menumpuk dan berjarak `mb-16` agar tidak tertutup `BottomNav`.

#### `PageHeader.svelte`
```js
let {
	/** @type {string} */ title = '',
	/** @type {string} */ subtitle = '',
	/** @type {string} */ eyebrow = '',
	/** @type {string} */ backHref = '',
	/** @type {string} */ backLabel = 'Kembali',
	/** @type {import('svelte').Snippet} */ actions = null
} = $props();
```
**Tampilan.** Identik pola Enduro: tautan kembali opsional, `eyebrow` sebagai `label-micro`, H1, subjudul
`text-sm ink-500 max-w-2xl`, slot `actions` di kanan yang membungkus ke bawah di mobile. `mb-6`.

#### `Tabs.svelte`
```js
let {
	/** @type {{id:string,label:string,count?:number}[]} */ tabs = [],
	/** @type {string} */ active = $bindable(''),
	/** @type {'underline'|'pill'} */ variant = 'underline',
	/** @type {boolean} */ fullWidth = false
} = $props();
```
**Tampilan.** `underline` (default) = teks `ink-500`, aktif `heading` + garis bawah 2px `pertamina-red`,
kontainer `border-b border-ink-200`. `pill` = latar `ink-100 rounded-chip p-1`, aktif putih + `shadow-card`.
`count` tampil sebagai angka mungil `ink-500`. Wajib `role="tablist"`, navigasi panah kiri/kanan,
dan `overflow-x-auto` tanpa scrollbar di mobile.

### 5.5 Masukan & data

#### `SearchInput.svelte`
```js
let {
	/** @type {string} */ value = $bindable(''),
	/** @type {string} */ placeholder = 'Cari...',
	/** @type {number} */ debounceMs = 250,
	/** @type {(q:string)=>void} */ onSearch = undefined,
	/** @type {'sm'|'md'} */ size = 'md'
} = $props();
```
**Tampilan.** Ikon kaca pembesar 18px `ink-450` di kiri, `rounded-control border-ink-450`, fokus →
border `pertamina-blue` + ring. Tombol silang muncul saat ada isi. Debounce di dalam komponen;
`onSearch` menerima nilai final. `type="search"` + `aria-label`.

#### `FilterChips.svelte`
```js
let {
	/** @type {{id:string,label:string,count?:number}[]} */ options = [],
	/** @type {string|string[]} */ selected = $bindable(''),
	/** @type {boolean} */ multiple = false,
	/** @type {boolean} */ showClear = true
} = $props();
```
**Tampilan.** Baris pil bergulir horizontal. Tidak terpilih: putih + `border-ink-200` + teks `ink-600`.
Terpilih: `pertamina-navy-tint` + border `pertamina-blue/40` + teks `pertamina-navy` + centang 14px.
`multiple` → tombol "Hapus filter" muncul di ujung saat ada yang aktif.

#### `DataTable.svelte`
```js
/**
 * @typedef {{key:string,label:string,align?:'left'|'right'|'center',width?:string,sortable?:boolean,numeric?:boolean}} Column
 */
let {
	/** @type {Column[]} */ columns = [],
	/** @type {any[]} */ rows = [],
	/** @type {string} */ sortKey = $bindable(''),
	/** @type {'asc'|'desc'} */ sortDir = $bindable('asc'),
	/** @type {boolean} */ loading = false,
	/** @type {string} */ emptyMessage = 'Belum ada data',
	/** @type {(row:any)=>void} */ onRowClick = undefined,
	/** @type {import('svelte').Snippet<[any, Column]>} */ cell = null
} = $props();
```
**Tampilan.** Kepala `bg-ink-50` + `label-micro` + `sticky top-0`. Baris tinggi 48px, `border-b border-ink-100`,
hover `bg-ink-50`. Kolom `numeric` otomatis rata kanan + `tabular-nums`. Kolom sortable menampilkan panah
saat aktif. `loading` → 5 baris `Skeleton`. Kosong → `EmptyState` di dalam badan tabel.
Di mobile membungkus dalam `overflow-x-auto` — **halaman tidak boleh bergulir horizontal**, hanya tabelnya.

#### `Timeline.svelte`
```js
let {
	/** @type {{id:string,title:string,description?:string,at:string,iconPath?:string,color?:string,points?:number}[]} */ items = [],
	/** @type {'default'|'compact'} */ variant = 'default'
} = $props();
```
**Tampilan.** Garis vertikal 2px `ink-200` di kiri; tiap butir punya titik 10px berwarna `color`
(default `pertamina-blue`) dengan cincin putih 2px. Konten: judul 14px semibold, deskripsi 13px `ink-600`,
waktu relatif `text-xs ink-500` ("2 hari lalu"). Bila `points` ada → `PointsChip sm` di kanan.
Dipakai untuk riwayat poin dan jejak audit ESG.

### 5.6 Umpan balik

#### `Modal.svelte`
```js
let {
	/** @type {boolean} */ open = false,
	/** @type {'sm'|'md'|'lg'|'xl'} */ size = 'md',
	/** @type {string} */ title = '',
	/** @type {boolean} */ closeOnBackdrop = true,
	/** @type {() => void} */ onClose = undefined,
	/** @type {import('svelte').Snippet} */ footer = null,
	children
} = $props();
```
**Tampilan.** Backdrop `ink-900/40 backdrop-blur-sm`. Panel putih `rounded-panel shadow-modal`,
`max-h-[calc(100vh-2rem)]` dengan badan bergulir dan kepala/kaki tetap. Tutup dengan Esc & klik backdrop.
Wajib: `role="dialog" aria-modal="true"`, fokus terperangkap di dalam, dan fokus kembali ke pemicu saat ditutup.
Di mobile (<640px) tampil sebagai **sheet** yang menempel di bawah dengan sudut atas membulat.

#### `Toast.svelte` + `PointToast.svelte`
```js
// Toast.svelte — generik, digerakkan store
let {
	/** @type {{id:string,type:'success'|'error'|'info'|'warning',message:string,description?:string}[]} */ toasts = [],
	/** @type {(id:string)=>void} */ onDismiss = undefined
} = $props();

// PointToast.svelte — khusus perolehan poin
let {
	/** @type {number} */ points = 0,
	/** @type {string} */ reason = '',
	/** @type {number|null} */ newTotal = null,
	/** @type {TierCode|null} */ tierUnlocked = null,
	/** @type {{code:string,name:string,rarity:Rarity}|null} */ badgeUnlocked = null
} = $props();
```
**Tampilan.** Menumpuk di kanan bawah desktop / atas mobile, lebar maks 380px, `rounded-card shadow-toast`,
auto-tutup 4 detik (**tidak** auto-tutup bila memuat kenaikan tier atau badge — momen itu layak dibaca).
`PointToast`: "**+15 PK**" `numeric text-2xl` `pertamina-navy` dengan animasi `point-pop`, alasan di
bawahnya, dan total baru. Bila `tierUnlocked` → kartu melebar menampilkan `TierBadge solid` + kalimat
benefit persis Hal 12. Bila `badgeUnlocked` → `BadgeTile sm`.
Aksesibilitas: kontainer `aria-live="polite"` (bukan `assertive` — perolehan poin bukan darurat).

#### `EmptyState.svelte`
```js
let {
	/** @type {string} */ iconPath = '',
	/** @type {string} */ title = '',
	/** @type {string} */ description = '',
	/** @type {string} */ actionLabel = '',
	/** @type {string} */ actionHref = '',
	/** @type {() => void} */ onAction = undefined,
	/** @type {'sm'|'md'|'lg'} */ size = 'md'
} = $props();
```
**Tampilan.** Lihat §9.

#### `Skeleton.svelte`
```js
let {
	/** @type {'text'|'title'|'avatar'|'card'|'chart'|'row'} */ variant = 'text',
	/** @type {number} */ lines = 3,
	/** @type {string} */ class: className = ''
} = $props();
```
**Tampilan.** Lihat §9.

#### `EChart.svelte`
```js
let {
	/** @type {Record<string, any>} */ option = {},
	/** @type {string} */ height = '280px',
	/** @type {boolean} */ loading = false,
	/** @type {string} */ class: className = ''
} = $props();
```
**Tampilan.** Pembungkus tipis, sama seperti Enduro: impor `echarts` dinamis di dalam `$effect`,
`ResizeObserver` untuk resize, `dispose()` saat dibongkar, `backgroundColor: 'transparent'`.
Saat `loading` → `Skeleton variant="chart"`. Tidak boleh ada logika chart apa pun di sini —
setiap chart konkret tinggal di `src/lib/charts/`.

---

## 6. Pola visual gamifikasi

Ketegangan yang harus diselesaikan: gamifikasi perlu terasa memberi imbalan, tetapi ini produk BUMN yang
dilihat pemangku kepentingan Pertamina — ia tidak boleh terlihat seperti gim ponsel. Tujuh aturan berikut
adalah cara menyelesaikannya secara konkret.

**1. Warna beridentitas, bentuk yang menenangkan.**
Warna tier boleh cerah (memang begitu di slide), tapi bentuk yang membawanya selalu tenang: pil,
kotak membulat, garis 2px. Tidak ada bintang meledak, tidak ada gradien pelangi, tidak ada bevel 3D.
Kecerahan datang dari warna; ketenangan datang dari geometri.

**2. Satu kejutan per layar, maksimal.**
Hanya elemen berperingkat tertinggi di suatu layar yang boleh bergerak atau berkilau. Bila `PointToast`
sedang tampil, kartu tier tidak ikut beranimasi. Kilau (`sheen-champion`) hanya untuk Champion dan badge
Legendaris. Bila semuanya menonjol, tidak ada yang menonjol — dan halaman terlihat murahan.

**3. Progres selalu dinyatakan sebagai jarak, bukan sebagai status.**
"**30 poin lagi** menuju Contributor" mengalahkan "Anda Active Member". Yang pertama menyebut langkah
berikutnya; yang kedua hanya mengumumkan keadaan. Setiap tampilan tier wajib memuat kalimat "berapa lagi".

**4. Terkunci ≠ ditolak.**
Tier atau reward terkunci selalu tampil dengan (a) apa syaratnya, (b) sejauh mana progresnya, (c) satu
tindakan konkret yang bisa diambil hari ini. Chip abu + gembok, **bukan** merah. Warna merah dicadangkan
untuk kesalahan; tidak memenuhi syarat bukan kesalahan.

**5. Angka mendapat perlakuan tipografis, bukan perlakuan dekoratif.**
Poin terlihat penting karena besar, tebal, tabular, dan rapat (`numeric`) — bukan karena diberi bayangan
neon. Ini juga yang membuatnya konsisten dengan `KpiCard` di portal Pertamina lain.

**6. Dua mata uang tidak boleh tertukar.**
PK biru-navy + ikon kilat; KT emas + ikon koin. Berbeda **warna dan bentuk** sekaligus — bukan warna saja,
karena ±8% pria mengalami defisiensi penglihatan warna. Aturan yang sama berlaku untuk tier: setiap chip
tier selalu memuat **nama tier sebagai teks**, tidak pernah hanya dot berwarna.

**7. Perayaan sebanding dengan kelangkaan.**
Poin rutin (+1, +2) → toast kecil, otomatis hilang. Aksi bermakna (+15, +30) → toast dengan alasan.
Kenaikan tier atau badge Epik/Legendaris → modal dengan tombol tutup manual, satu animasi masuk, dan
kalimat benefit resmi dari Hal 12. Tidak pernah confetti — tepat di sinilah batas antara "dihargai secara
profesional" dan "gim ponsel".

**Yang tidak boleh dibangun:** confetti, maskot, suara, emoji sebagai ikon UI utama, bilah XP berkilau,
countdown mendesak berwarna merah, animasi berulang tanpa henti (kecuali skeleton), dan **peringkat
terbawah yang disorot** — leaderboard hanya menampilkan 20 teratas plus posisi pengguna sendiri, tidak
pernah "juru kunci".

---

## 7. Aturan chart ECharts

Bentuk file mengikuti Enduro persis: `src/lib/charts/_chartTheme.js` diekspor sebagai konstanta yang
di-*spread* ke setiap `option`, sedangkan tiap chart konkret adalah komponen sendiri yang membungkus `EChart`.

```js
// src/lib/charts/_chartTheme.js
export const font = { fontFamily: 'Plus Jakarta Sans, Inter, system-ui, sans-serif' };

export const tip = {
	backgroundColor: '#ffffff',
	borderColor: '#e2e8f0',
	borderWidth: 1,
	padding: [10, 14],
	textStyle: { color: '#334155', fontSize: 13, ...font },
	extraCssText: 'box-shadow: 0 8px 24px -6px rgba(15,23,42,0.10); border-radius: 12px;'
};

export const axisLabel = { color: '#64748b', fontSize: 10, ...font };
export const axisLine = { lineStyle: { color: '#e2e8f0' } };
export const splitLine = { lineStyle: { color: '#f1f5f9', type: 'dashed' } };

export const legend = {
	icon: 'roundRect',
	itemWidth: 10,
	itemHeight: 4,
	itemGap: 16,
	textStyle: { color: '#475569', fontSize: 11, ...font }
};

export const grid = { left: 8, right: 24, top: 36, bottom: 8, containLabel: true };

/** Palet seri kategorikal — urutan tetap, 8 hue yang saling terbedakan */
export const series = [
	'#0C4DA2', // 1 biru Pertamina
	'#ED1C24', // 2 merah Pertamina
	'#009B4C', // 3 hijau Pertamina
	'#F0B429', // 4 kuning
	'#6D4AA8', // 5 ungu
	'#0284C7', // 6 cyan
	'#DB2777', // 7 magenta
	'#64748B'  // 8 abu
];

/** Palet beridentitas — pakai HANYA bila kategorinya memang tier/pilar/rarity */
export const tierPalette = ['#2E7CD6', '#7CB342', '#E53935', '#F0B429'];
export const esgPalette  = { E: '#009B4C', S: '#0C4DA2', G: '#6D4AA8' };
export const rarityPalette = ['#B08D57', '#9AA5B1', '#F0B429', '#2E7CD6'];

export const palette = {
	red: '#ED1C24', navy: '#003E7E', blue: '#0C4DA2',
	green: '#009B4C', amber: '#F0B429', purple: '#6D4AA8',
	cyan: '#0284C7', slate: '#94A3B8', slateSoft: '#F1F5F9'
};
```

### Aturan pemakaian

| Aspek | Aturan |
|---|---|
| **Tinggi default** | 280px. Donat/pie 260px, radar 320px, bar horizontal `28px × jumlah kategori + 60`. Selalu lewat prop `height`. |
| **Urutan warna** | Ikuti `series[]` berurutan. Bila kategorinya tier/pilar/rarity, **wajib** pakai palet beridentitas agar warna di chart sama dengan warna di badge. |
| **Maks seri** | 8 pada satu chart. Lebih dari itu → kelompokkan "Lainnya" atau ganti ke bar. |
| **Tooltip** | Selalu `...tip`. Angka diformat `toLocaleString('id-ID')`. Line/bar pakai `trigger: 'axis'`, pie pakai `'item'`. |
| **Legend** | Sembunyikan bila hanya 1 seri. ≥5 seri → `type: 'scroll'`. Posisi `top: 4, left: 'center'`. |
| **Sumbu** | `axisLine.show: false` pada sumbu nilai, `axisTick.show: false` di mana-mana, `splitLine` putus-putus hanya pada sumbu nilai. |
| **Grid** | `...grid` + `containLabel: true`. Jangan atur `left/right` numerik sendiri. |
| **Garis** | `width: 2.5`, `smooth: 0.3`, `showSymbol: false`, simbol muncul saat hover. Area gradien hanya bila seri ≤2. |
| **Bar** | `barMaxWidth: 28`, `borderRadius: [6, 6, 0, 0]` (vertikal) atau `[0, 6, 6, 0]` (horizontal). |
| **Pie/donat** | Selalu donat (`radius: ['58%', '80%']`), `padAngle` kecil, label di luar dengan garis penunjuk. Jangan pie penuh. |
| **Animasi** | `animationDuration: 600`, `animationEasing: 'cubicOut'`. Nonaktifkan bila `prefers-reduced-motion`. |
| **Kosong** | Bila tak ada data, **jangan** render chart — tampilkan `EmptyState sm`. |
| **Aksesibilitas** | Chart tidak boleh jadi satu-satunya sumber informasi. Setiap chart didampingi ringkasan teks atau tabel yang bisa dibuka. |

---

## 8. Ikon & ilustrasi

**Inline SVG stroke bergaya Heroicons Outline. Tanpa dependensi ikon eksternal.**

- `viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"`, `stroke-width="1.8"`,
  `stroke-linecap="round"`, `stroke-linejoin="round"`.
- Ikon **selalu** mewarisi warna dari induk lewat `currentColor` — jangan pernah menetapkan `stroke` literal.

| Ukuran | Dipakai untuk |
|---|---|
| 14px | ikon dalam chip/badge |
| 16px | ikon dalam tombol `sm`, meta baris |
| **18px** | **ikon nav & tombol standar (default)** |
| 20px | ikon `StatTile`, kepala kartu |
| 24px | ikon aksi mandiri, tombol tutup |
| 40px | ikon `EmptyState` (dalam lingkaran 72px) |
| 48px+ | ilustrasi spot |

Simpan seluruh `d` di **`src/lib/data/icons.js`** sebagai `export const ICONS = { home: 'M3 12l...', ... }`,
lalu pakai `<Icon path={ICONS.home} />`. Satu tempat, mudah diaudit, nol dependensi.

Ikon wajib: `home, users, calendar, megaphone, trophy, gift, badge, chart, book, leaf, heart, shield,
bolt, coin, search, filter, plus, check, x, chevron-down, chevron-right, arrow-left, arrow-up, arrow-down,
bell, lock, upload, camera, link, whatsapp, share, star, map-pin, clock, sparkles, document, logout`.

**Ilustrasi.** Tidak ada karakter atau maskot. Ilustrasi spot dibuat dari bentuk geometris sederhana
dengan garis 1.5px dalam warna brand pada opasitas rendah — sekadar memberi ruang bernapas pada
empty state, bukan menarik perhatian.

**Emoji.** Boleh untuk konten buatan pengguna. **Tidak boleh** sebagai ikon UI — emoji tampil berbeda
di tiap platform dan langsung menurunkan kesan profesional.

---

## 9. Empty state & loading skeleton

### 9.1 Empty state

Tiga bagian wajib: **ikon → judul → satu kalimat penjelas**, ditambah satu tombol aksi bila memang ada
yang bisa dilakukan. Judul menyatakan keadaan tanpa menyalahkan; kalimat penjelas menyatakan langkah
berikutnya.

Susunan: rata tengah, `py-12`, ikon 40px `ink-400` di dalam lingkaran 72px `bg-ink-100`, judul
`text-base font-semibold ink-800` (`mt-4`), penjelas `text-sm ink-600 max-w-sm mx-auto` (`mt-1.5`),
tombol `mt-5`.

| Konteks | Judul | Penjelas | Aksi |
|---|---|---|---|
| Belum ada aktivitas | Belum ada aktivitas | Poin pertama Anda menunggu — mulai dari membaca broadcast minggu ini. | Lihat Broadcast |
| Badge kosong | Koleksi badge masih kosong | Ada 20 badge yang bisa dikumpulkan. "Salam Kenal" bisa diraih hari ini dengan melengkapi profil. | Lengkapi Profil |
| Pencarian nihil | Tidak ada hasil untuk "{q}" | Coba kata kunci lain atau hapus sebagian filter. | Hapus Filter |
| Belum ada story | Belum ada cerita di sini | Cerita Anda bisa jadi yang pertama tayang di kanal Pertamina Foundation. | Tulis Cerita |
| Reward terkunci | Belum ada reward yang bisa ditukar | Kumpulkan **{n} KT** lagi untuk membuka pilihan pertama. | Cara Dapat Poin |
| Galat muat | Data gagal dimuat | Sambungan terputus. Coba muat ulang. | Coba Lagi |

Perhatikan pola pada baris "Badge kosong" dan "Reward terkunci": empty state di produk bergamifikasi
adalah **peluang aktivasi**, bukan sekadar pemberitahuan. Selalu sebut langkah termudah berikutnya
beserta angkanya.

### 9.2 Skeleton

Skeleton dipakai untuk pemuatan **>300ms**. Di bawah itu tidak usah — kedipannya justru terasa lebih lambat.

- Latar `ink-100`, kilau `shimmer` 1.6s, `rounded-6px` (atau mengikuti radius elemen aslinya).
- Skeleton harus **meniru tata letak akhir**: jumlah baris, tinggi, dan lebar yang sama. Pergeseran
  layout saat data tiba adalah cacat, bukan detail kecil.
- Lebar baris teks bervariasi (100% / 85% / 60%) supaya terbaca sebagai paragraf.
- Angka & KPI: blok `w-20 h-8`. Avatar: lingkaran seukuran aslinya. Chart: persegi panjang setinggi
  chart + 3 balok sumbu di bawah.
- Maksimum **6 baris** skeleton pada satu daftar, sisanya biarkan kosong.
- `aria-hidden="true"` pada skeleton, dan kontainer diberi `aria-busy="true"`.

Varian `Skeleton.svelte`: `text` (n baris), `title` (satu blok 24px), `avatar`, `card`
(kartu penuh: avatar + 2 baris + garis), `chart`, `row` (baris tabel).

---

## 10. Checklist aksesibilitas

Diperiksa sebelum setiap komponen dianggap selesai.

- [ ] Setiap pasangan teks/latar ≥ **4.5:1** (≥3.0 untuk teks ≥24px atau ≥18.66px bold) — pakai tabel §2.
- [ ] Tidak ada warna polos `tier-*`, `pertamina-red`, `pertamina-green`, atau `ink-400` yang menyentuh teks.
- [ ] Batas kontrol form memakai `ink-450` (3.47 ✓), bukan `ink-300`.
- [ ] Fokus terlihat pada semua elemen interaktif; `outline` tidak pernah dihapus tanpa pengganti.
- [ ] Informasi tidak pernah disampaikan lewat warna saja — selalu ada teks, ikon, atau pola pendamping.
- [ ] Sasaran sentuh ≥ 44×44px di mobile.
- [ ] `ProgressBar` punya `role="progressbar"` + `aria-valuenow/min/max` + label teks.
- [ ] Modal: fokus terperangkap, Esc menutup, fokus kembali ke pemicu.
- [ ] Toast dalam kontainer `aria-live="polite"`.
- [ ] `prefers-reduced-motion` menonaktifkan animasi poin, shimmer, dan animasi chart.
- [ ] Chart didampingi ringkasan teks atau tabel alternatif.
- [ ] Hierarki heading berurutan (satu `h1` per halaman, tidak melompat).
- [ ] Semua gambar punya `alt`; gambar dekoratif `alt=""`.
- [ ] Halaman tidak bergulir horizontal di 320px; tabel/chart bergulir di dalam kontainernya sendiri.
