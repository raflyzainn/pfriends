/**
 * PEMBANTU VISUAL KOMPONEN: menerjemahkan entri konstanta domain menjadi gaya CSS.
 *
 * Mengapa berkas ini ada. Tailwind menghasilkan kelas secara statis, sehingga
 * `bg-{entry.token}` tidak akan pernah muncul di bundel CSS. Bila komponen ingin
 * memakai warna yang *datang dari data* (tier, pilar ESG, komunitas), satu-satunya
 * cara yang benar adalah merujuk custom property yang sudah didefinisikan di
 * `app.css` lewat `var(--color-…)`. Dengan begitu tabel tier tetap menjadi
 * satu-satunya sumber warna dan ambang: komponen tidak pernah menuliskan
 * heksadesimal atau angka ambang apa pun.
 *
 * Berkas ini juga memuat perhitungan kontras. Polaritas teks pada chip tier solid
 * (putih untuk biru/merah, `ink-900` untuk hijau/kuning) tidak ditulis sebagai
 * daftar tetap, melainkan DIHITUNG dari luminansi warna tier. Hasilnya identik
 * dengan tabel 08-DESIGN-SYSTEM §2.4, tetapi tetap benar bila tabel tier berubah.
 *
 * Awalan garis bawah menandai berkas internal paket komponen: tidak diekspor
 * lewat barrel dan bukan bagian dari kontrak lintas paket.
 *
 * @see docs/08-DESIGN-SYSTEM.md: §0.1 warna identitas, §2 tabel kontras
 * @see src/lib/domain/constants/tier-table.js
 */

import { TIER_TABLE, TierLevel, tierUntukLevel } from '$lib/domain/constants/tier-table.js';
import { ESG_PILLARS } from '$lib/domain/constants/esg-taxonomy.js';
import { COMMUNITIES } from '$lib/domain/constants/community.js';

/** Warna teks gelap universal, sebagai token: dipakai saat merender. */
const TEKS_GELAP = 'var(--color-ink-900)';
/** Nilai heksadesimal `ink-900`, dibutuhkan karena perhitungan kontras tidak dapat membaca custom property. */
const TEKS_GELAP_HEX = '#0f1b2d';
/** Warna teks terang universal. */
const TEKS_TERANG = '#ffffff';

/**
 * Merujuk token warna app.css sebagai nilai CSS.
 * @param {string} token Nama token tanpa awalan, mis. `tier-champion-ink`.
 * @returns {string}
 */
export function warnaToken(token) {
	return `var(--color-${token})`;
}

/**
 * Kanal RGB 0–255 dari heksadesimal tiga atau enam digit.
 * @param {string} hex
 * @returns {[number, number, number]}
 */
function keRgb(hex) {
	const bersih = String(hex ?? '').replace('#', '');
	const penuh =
		bersih.length === 3
			? bersih
					.split('')
					.map((c) => c + c)
					.join('')
			: bersih;
	return [
		parseInt(penuh.slice(0, 2), 16) || 0,
		parseInt(penuh.slice(2, 4), 16) || 0,
		parseInt(penuh.slice(4, 6), 16) || 0
	];
}

/**
 * Luminansi relatif menurut rumus resmi WCAG 2.1.
 * @param {string} hex
 * @returns {number} 0 (hitam) sampai 1 (putih).
 */
export function luminansi(hex) {
	const [r, g, b] = keRgb(hex).map((kanal) => {
		const v = kanal / 255;
		return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Rasio kontras WCAG antara dua warna. Selalu ≥ 1.
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function kontras(a, b) {
	const terang = Math.max(luminansi(a), luminansi(b));
	const gelap = Math.min(luminansi(a), luminansi(b));
	return (terang + 0.05) / (gelap + 0.05);
}

/**
 * Warna teks berkontras terbaik di atas sebuah latar berwarna.
 *
 * Perbandingan dilakukan terhadap kedua kandidat NYATA, bukan lewat ambang
 * luminansi. Ambang 0,179 yang lazim dikutip hanya sahih ketika kandidat
 * gelapnya adalah hitam murni; `ink-900` (#0F1B2D) adalah navy sangat gelap
 * dengan luminansi ~0,011, sehingga titik potongnya bergeser. Memakai ambang
 * itu apa adanya membuat tier biru dan merah salah memilih teks gelap
 * (3,81 dan 3,39: gagal AA) padahal teks putih justru unggul di keduanya
 * (4,54 dan 5,09 di atas varian `-fill`).
 *
 * Hasil fungsi ini mereproduksi persis tabel 08-DESIGN-SYSTEM §2.4:
 * biru & merah → putih; hijau, kuning, dan abu → `ink-900`.
 *
 * @param {string} hex Warna latar.
 * @returns {string} Nilai CSS untuk `color`.
 */
export function teksKontras(hex) {
	return kontras(TEKS_TERANG, hex) >= kontras(TEKS_GELAP_HEX, hex) ? TEKS_TERANG : TEKS_GELAP;
}

/**
 * @typedef {object} GayaTier
 * @property {string} level     Level tier (TierLevel).
 * @property {string} label     Nama tier untuk teks: chip tier WAJIB memuatnya.
 * @property {number} threshold Ambang poin tier.
 * @property {string} benefit   Kalimat benefit resmi.
 * @property {string} color     Heksadesimal identitas untuk dot, ring, dan seri chart.
 * @property {string} gayaSoft  Deklarasi `style` untuk chip lembut (latar tint + teks ink).
 * @property {string} gayaSolid Deklarasi `style` untuk chip solid.
 * @property {string} gayaTeks  Deklarasi `style` untuk teks berwarna tier.
 * @property {string} gayaDot   Deklarasi `style` untuk titik identitas.
 */

/**
 * Menormalkan berbagai bentuk masukan tier menjadi entri TIER_TABLE.
 *
 * Komponen dapat menerima tier sebagai kode string (`'CHAMPION'`), sebagai entri
 * tabel, atau sebagai value object `Tier` yang punya `.level`. Ketiganya
 * diselesaikan di sini agar tiap komponen tidak mengulang penanganan yang sama.
 *
 * @param {string|{level?: string}|null|undefined} tier
 * @returns {import('$lib/domain/constants/tier-table.js').TierEntry|null}
 */
export function entriTier(tier) {
	if (!tier) return null;
	const level = typeof tier === 'string' ? tier : tier.level;
	if (!level) return null;
	try {
		return tierUntukLevel(level);
	} catch {
		return null;
	}
}

/**
 * Seluruh gaya yang dibutuhkan komponen untuk menggambar sebuah tier.
 *
 * @param {string|{level?: string}|null|undefined} tier
 * @returns {GayaTier|null} `null` bila tier tidak dikenal: pemanggil menampilkan keadaan netral.
 */
export function gayaTier(tier) {
	const entri = entriTier(tier);
	if (!entri) return null;

	const ink = warnaToken(entri.ink);
	const tint = warnaToken(entri.tint);
	// Varian `-fill` hanya ada untuk tier yang membutuhkannya (biru & merah).
	// Fallback CSS memakai warna kanonik untuk tier lain tanpa perlu percabangan.
	const isian = `var(--color-${entri.token}-fill, ${entri.color})`;

	return {
		level: entri.level,
		label: entri.label,
		threshold: entri.threshold,
		benefit: entri.benefit,
		color: entri.color,
		gayaSoft: `background:${tint};color:${ink};border-color:color-mix(in srgb, ${ink} 22%, transparent);`,
		gayaSolid: `background:${isian};color:${teksKontras(entri.color)};border-color:transparent;`,
		gayaTeks: `color:${ink};`,
		gayaDot: `background:${entri.color};`
	};
}

/**
 * Ambang tier tertinggi: dipakai `TierProgress` untuk menempatkan penanda rel
 * secara proporsional terhadap nilai, bukan berjarak sama rata.
 * @type {number}
 */
export const AMBANG_TERTINGGI = TIER_TABLE[TIER_TABLE.length - 1].threshold;

/**
 * Tier berambang (tanpa NEWCOMER): inilah empat penanda yang tampil di rel progres.
 * @type {readonly import('$lib/domain/constants/tier-table.js').TierEntry[]}
 */
export const TIER_BERAMBANG = TIER_TABLE.filter((entri) => entri.level !== TierLevel.NEWCOMER);

/**
 * Gaya pilar ESG berdasarkan kode satu huruf.
 * @param {string} pillar 'E' | 'S' | 'G'
 * @returns {{ pillar: string, label: string, color: string, ink: string, tint: string }|null}
 */
export function gayaPilar(pillar) {
	const entri = ESG_PILLARS.find((p) => p.pillar === pillar);
	if (!entri) return null;
	return {
		pillar: entri.pillar,
		label: entri.label,
		color: warnaToken(entri.token),
		ink: warnaToken(entri.ink),
		tint: warnaToken(entri.tint)
	};
}

/**
 * Gaya komunitas berdasarkan CommunityType.
 * @param {string} id 'SOBI' | 'WOMENPRENEUR'
 * @returns {{ id: string, nama: string, akronim: string, color: string, ink: string, tint: string }|null}
 */
export function gayaKomunitas(id) {
	const entri = COMMUNITIES.find((c) => c.id === id);
	if (!entri) return null;
	return {
		id: entri.id,
		nama: entri.nama,
		akronim: entri.akronim,
		color: warnaToken(entri.token),
		ink: warnaToken(entri.ink),
		tint: warnaToken(entri.tint)
	};
}

/**
 * Tingkat kelangkaan badge (03-GAMIFICATION-SPEC §6.2).
 *
 * Ini metadata TAMPILAN, bukan aturan domain: tidak ada ambang, poin, atau syarat
 * di sini: hanya nama tampil dan token warna yang sudah tersedia di app.css.
 *
 * @type {Readonly<Record<string, { label: string, token: string, ink: string, berkilau: boolean }>>}
 */
export const RARITY_VISUAL = Object.freeze({
	UMUM: Object.freeze({ label: 'Umum', token: 'rarity-umum', ink: 'rarity-umum-ink', berkilau: false }),
	LANGKA: Object.freeze({
		label: 'Langka',
		token: 'rarity-langka',
		ink: 'rarity-langka-ink',
		berkilau: false
	}),
	EPIK: Object.freeze({ label: 'Epik', token: 'rarity-epik', ink: 'rarity-epik-ink', berkilau: false }),
	LEGENDARIS: Object.freeze({
		label: 'Legendaris',
		token: 'rarity-legendaris',
		ink: 'rarity-legendaris-ink',
		berkilau: true
	})
});

/**
 * Metadata tampilan sebuah kelangkaan, dengan `UMUM` sebagai cadangan aman.
 * @param {string} rarity
 * @returns {{ label: string, color: string, ink: string, berkilau: boolean }}
 */
export function gayaRarity(rarity) {
	const entri = RARITY_VISUAL[String(rarity).toUpperCase()] ?? RARITY_VISUAL.UMUM;
	return {
		label: entri.label,
		color: warnaToken(entri.token),
		ink: warnaToken(entri.ink),
		berkilau: entri.berkilau
	};
}

/**
 * Menggabungkan daftar kelas menjadi satu string, mengabaikan nilai kosong.
 * @param {...(string|false|null|undefined)} bagian
 * @returns {string}
 */
export function kelas(...bagian) {
	return bagian.filter(Boolean).join(' ');
}

/* ══════════════════════════════════════════════════════════════════════════
   SISTEM VISUAL EDITORIAL: dipakai src/lib/components/editorial/**
   Ditaruh di sini, bukan di berkas kedua, karena seluruh isinya adalah
   penerjemah data → CSS yang persis menjadi alasan berkas ini ada.
   ═════════════════════════════════════════════════════════════════════════ */

/**
 * Warna keying rule. Ketiganya adalah warna POLOS Pertamina yang dilarang
 * menyentuh teks (`pertamina-red` 3.99 dan `pertamina-green` 3.30 di kanvas
 * hangat). Pada bar 4 px mereka sah: WCAG 1.4.11 menuntut 3.0:1 untuk elemen
 * non-teks, dan makna yang dibawanya SELALU juga ditulis sebagai kata di
 * sebelahnya: warna tidak pernah menjadi satu-satunya pembawa informasi.
 *
 * @type {Readonly<Record<string, string>>}
 */
export const WARNA_KEYLINE = Object.freeze({
	red: 'var(--color-pertamina-red)', // program & institusi
	navy: 'var(--color-pertamina-navy)', // orang & komunitas
	green: 'var(--color-pertamina-green)' // lingkungan & aksi lapangan
});

/**
 * Nilai `style` untuk sebuah keying rule.
 * @param {'red'|'navy'|'green'|'none'|string} tone
 * @returns {string} String kosong bila tone `none`/tak dikenal: pemanggil tidak merender bar.
 */
export function gayaKeyline(tone) {
	const warna = WARNA_KEYLINE[tone];
	return warna ? `background:${warna};` : '';
}

/**
 * Keying rule pilar ESG. Pemetaan sengaja eksplisit: hijau untuk lingkungan,
 * navy untuk sosial, merah untuk tata kelola: tiga warna keyline yang sudah
 * ada, bukan warna baru, sehingga kuota palet 90/7/3 tidak bertambah.
 *
 * @param {string} pillar 'E' | 'S' | 'G'
 * @returns {'red'|'navy'|'green'|'none'}
 */
export function keylinePilar(pillar) {
	if (pillar === 'E') return 'green';
	if (pillar === 'S') return 'navy';
	if (pillar === 'G') return 'red';
	return 'none';
}

/**
 * Rasio foto zona publik → nilai `aspect-ratio` CSS.
 *
 * Disimpan sebagai peta, bukan kelas Tailwind dinamis, karena `aspect-[${r}]`
 * tidak akan pernah ter-generate (aturan U-5: Tailwind 4 memindai kode sebagai teks).
 *
 * @type {Readonly<Record<string, string>>}
 */
export const RASIO_FOTO = Object.freeze({
	'21:9': '21 / 9',
	'16:9': '16 / 9',
	'3:2': '3 / 2',
	'4:5': '4 / 5',
	'1:1': '1 / 1'
});

/**
 * Nilai `aspect-ratio` untuk sebuah rasio manifes.
 * @param {string} ratio
 * @returns {string} `'16 / 9'` sebagai cadangan aman: rasio sampul cerita.
 */
export function rasioFoto(ratio) {
	return RASIO_FOTO[ratio] ?? RASIO_FOTO['16:9'];
}

/**
 * KETAHANAN RUNTIME: aksi Svelte yang melaporkan `<img>` yang berkasnya tidak ada.
 *
 * Mengapa ini dibutuhkan padahal `photos.js` sudah menyaring lewat `photo-credits.json`.
 * Penyaringan itu adalah gerbang STATIS: ia benar saat build, dan menjadi bohong begitu
 * seseorang menghapus, memindahkan, atau salah menamai satu berkas di `static/img/`
 * setelah build. Dalam keadaan itu `foto(key)` tetap mengembalikan entri lengkap dan
 * peramban merender ikon gambar rusak: persis yang dilarang `docs/12` §3.3(d) butir 4.
 * Aksi ini menutup celah tersebut: pemanggil mengganti `<img>` dengan blok tipografis
 * yang sudah ada di cabang `{:else}` masing-masing komponen.
 *
 * Dua sumber galat ditangani, bukan satu:
 *   1. event `error`: kasus normal, berkas gagal diunduh setelah listener terpasang;
 *   2. pemeriksaan `complete && naturalWidth === 0` saat aksi dipasang: kasus hidrasi,
 *      ketika galat sudah terjadi pada markup SSR SEBELUM listener sempat ada. Tanpa
 *      cabang kedua, halaman ter-prerender tetap menampilkan gambar rusak selamanya.
 *
 * @param {HTMLImageElement} node
 * @param {() => void} laporkan Dipanggil sekali saat gambar dipastikan gagal dimuat.
 * @returns {{ destroy(): void }}
 */
export function pantauGagalMuat(node, laporkan) {
	const saatGalat = () => laporkan();
	node.addEventListener('error', saatGalat);
	// `complete` true + lebar intrinsik 0 = unduhan selesai tanpa piksel, yaitu gagal.
	if (node.complete && node.naturalWidth === 0) laporkan();
	return {
		destroy() {
			node.removeEventListener('error', saatGalat);
		}
	};
}

/**
 * Padding-block seksi zona publik, dari token `--rhythm-*` (`app.css`).
 *
 * Ritmenya sengaja tidak rata. Lima nilai untuk lima peran, dan `SectionRule`
 * memperingatkan di mode dev bila dua seksi bersebelahan memakai kombinasi
 * skala + ritme yang sama: cacat D-10 lahir dari halaman yang berdetak.
 *
 * @param {'loose'|'base'|'snug'|'tight'|'flush'|string} rhythm
 * @returns {string} Nilai CSS siap pakai untuk `padding-block`.
 */
export function ritmeSeksi(rhythm) {
	const sah = ['loose', 'base', 'snug', 'tight', 'flush'].includes(rhythm) ? rhythm : 'base';
	return `var(--rhythm-${sah})`;
}
