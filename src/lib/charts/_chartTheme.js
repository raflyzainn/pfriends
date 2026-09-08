/**
 * TEMA CHART: konstanta gaya yang di-*spread* ke setiap option ECharts.
 *
 * ECharts tidak melihat CSS, sehingga warna dan font harus dituliskan sebagai
 * nilai literal di sini. Inilah SATU-SATUNYA tempat itu boleh terjadi: setiap
 * chart konkret mengimpor dari berkas ini dan tidak pernah menuliskan heksadesimal
 * sendiri. Bila tidak begitu, warna tier di chart perlahan akan menyimpang dari
 * warna tier di badge, dan pembaca dasbor akan mengira keduanya hal berbeda.
 *
 * Palet beridentitas (`tierPalette`, `esgPalette`, `rarityPalette`) diturunkan
 * langsung dari konstanta domain, bukan disalin: sehingga warna seri chart tier
 * dijamin identik dengan warna chip tier.
 *
 * @see docs/08-DESIGN-SYSTEM.md: §7 Aturan chart ECharts
 */

import { SCORING_TABLE } from '$lib/domain/constants/scoring-table.js';
import { TIER_TABLE, TierLevel } from '$lib/domain/constants/tier-table.js';

/** Keluarga font aplikasi, dalam bentuk yang dimengerti ECharts. */
export const font = { fontFamily: 'Plus Jakarta Sans, Inter, system-ui, sans-serif' };

/** Gaya tooltip standar: kartu putih bertepi halus, sama dengan `shadow-panel`. */
export const tip = {
	backgroundColor: '#ffffff',
	borderColor: '#e2e8f0',
	borderWidth: 1,
	padding: [10, 14],
	textStyle: { color: '#334155', fontSize: 13, ...font },
	extraCssText: 'box-shadow: 0 8px 24px -6px rgba(15,23,42,0.10); border-radius: 12px;'
};

/** Label sumbu: `ink-500`, cukup redup untuk menjadi latar, cukup gelap untuk terbaca. */
export const axisLabel = { color: '#64748b', fontSize: 10, ...font };

/** Garis sumbu kategori. Sumbu nilai selalu menyembunyikan garisnya. */
export const axisLine = { lineStyle: { color: '#e2e8f0' } };

/** Garis bantu horizontal putus-putus, hanya pada sumbu nilai. */
export const splitLine = { lineStyle: { color: '#f1f5f9', type: 'dashed' } };

/** Legenda ringkas; sembunyikan bila chart hanya punya satu seri. */
export const legend = {
	icon: 'roundRect',
	itemWidth: 10,
	itemHeight: 4,
	itemGap: 16,
	top: 4,
	left: 'center',
	textStyle: { color: '#475569', fontSize: 11, ...font }
};

/** Grid standar. `containLabel` mengurus ruang label: jangan atur left/right sendiri. */
export const grid = { left: 8, right: 24, top: 36, bottom: 8, containLabel: true };

/** Animasi masuk yang tenang. Chart bukan tempat pamer gerak. */
export const animasi = { animationDuration: 600, animationEasing: 'cubicOut' };

/**
 * Palet seri kategorikal: delapan warna yang saling terbedakan, urutan tetap.
 * Dipakai bila kategorinya BUKAN tier, pilar, atau rarity.
 */
export const series = [
	'#34908B', // 1 teal utama
	'#D9B81F', // 2 kuning aksen
	'#6FBEB2', // 3 teal madya
	'#8F7014', // 4 kuning tua
	'#1E4B49', // 5 teal gelap
	'#A5E9DD', // 6 teal muda
	'#4AA79F', // 7 teal sedang
	'#94A3B8' // 8 abu netral
];

/**
 * Palet tier, diturunkan dari TIER_TABLE tanpa NEWCOMER: urut menaik sesuai
 * ambang, sehingga indeks palet selalu sejajar dengan urutan tier di UI.
 * @type {string[]}
 */
export const tierPalette = TIER_TABLE.filter((t) => t.level !== TierLevel.NEWCOMER).map(
	(t) => t.color
);

/** Warna tier lengkap termasuk NEWCOMER, dipetakan berdasarkan level. */
export const tierColorByLevel = Object.freeze(
	Object.fromEntries(TIER_TABLE.map((t) => [t.level, t.color]))
);

/** Palet pilar ESG: sama dengan token `esg-e/s/g` di app.css. */
export const esgPalette = Object.freeze({ E: '#6FBEB2', S: '#34908B', G: '#D9B81F' });

/** Palet kelangkaan badge: perunggu, perak, emas, platina. */
export const rarityPalette = ['#A5E9DD', '#6FBEB2', '#D9B81F', '#34908B'];

/**
 * Warna brand bernama, untuk chart satu seri.
 *
 * Kunci-kuncinya masih bernama warna lama (`red`, `navy`, `blue`, …) karena
 * dipakai belasan komponen chart; yang dipetakan ulang adalah NILAI-nya ke palet
 * teal/kuning. Mengganti kuncinya berarti menyunting setiap pemanggil sekaligus.
 */
export const palette = Object.freeze({
	red: '#D9B81F', // → kuning aksen
	navy: '#1A3E3D', // → teal paling gelap
	blue: '#34908B', // → teal utama
	green: '#6FBEB2', // → teal madya
	amber: '#D9B81F',
	purple: '#8F7014', // → kuning tua
	cyan: '#A5E9DD', // → teal muda
	slate: '#94A3B8',
	slateSoft: '#F1F5F9',
	ink: '#0F1B2D',
	track: '#E2E8F0'
});

/** Warna status KPI: hijau tercapai, kuning mendekati, merah tertinggal. */
export const statusPalette = Object.freeze({
	HIJAU: palette.green,
	KUNING: palette.amber,
	MERAH: palette.red
});

/**
 * Format angka Indonesia untuk label dan tooltip chart.
 * Digandakan tipis dari `$lib/utils/format.js` karena ECharts memanggil formatter
 * dalam konteks tanpa komponen; menjaganya sebagai fungsi murni membuatnya aman
 * dipakai di dalam string template formatter.
 *
 * @param {number} n
 * @returns {string}
 */
export function angka(n) {
	return typeof n === 'number' && Number.isFinite(n) ? n.toLocaleString('id-ID') : '–';
}

/**
 * Gradien vertikal lembut untuk area di bawah garis. Hanya dipakai bila chart
 * memuat maksimal dua seri: lebih dari itu, area saling menutupi dan justru
 * menyembunyikan data.
 *
 * @param {string} warna Heksadesimal enam digit.
 * @returns {Record<string, any>}
 */
export function areaGradien(warna) {
	return {
		type: 'linear',
		x: 0,
		y: 0,
		x2: 0,
		y2: 1,
		colorStops: [
			{ offset: 0, color: `${warna}30` },
			{ offset: 1, color: `${warna}00` }
		]
	};
}

/** Sumbu nilai standar: tanpa garis sumbu, tanpa tick, dengan garis bantu putus-putus. */
export const valueAxis = {
	type: 'value',
	axisLine: { show: false },
	axisTick: { show: false },
	splitLine,
	axisLabel
};

/** Sumbu kategori standar. */
export const categoryAxis = {
	type: 'category',
	axisLine,
	axisTick: { show: false },
	axisLabel: { ...axisLabel, fontWeight: 600 }
};

// ─────────────────────────────────────────────────────────────────────────────
// Tambahan G3-B (WP-07): palet corong, meteran, sumber poin, dan pita estimasi.
// Seluruhnya ADITIF: tidak satu pun nilai di atas diubah, sehingga enam chart
// yang sudah ada tetap tampil persis seperti sebelumnya.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Palet corong editorial: satu gradasi biru yang MENUA ke arah terbit.
 *
 * Sengaja bukan lima warna kategorikal: tahap corong adalah satu perjalanan,
 * bukan lima hal berbeda. Warna kategorikal pada corong membuat pembaca mencari
 * makna pada perbedaan rona yang sebenarnya tidak berarti apa-apa.
 * @type {readonly string[]}
 */
export const funnelPalette = Object.freeze([
	'#BFD3EC',
	'#93B4DE',
	'#5C8CC9',
	'#2A66B0',
	'#0C4DA2'
]);

/**
 * Palet biner kepatuhan SLA: hijau untuk yang selesai dalam batas, merah untuk
 * yang lewat. Dua warna saja, karena pertanyaannya memang biner.
 */
export const slaPalette = Object.freeze({ dalam: '#009B4C', lewat: '#ED1C24' });

/**
 * Palet sembilan jenis aksi berpoin, diturunkan dari urutan `SCORING_TABLE`
 * (poin menaik): bukan disalin sebagai daftar lepas.
 *
 * Turunan, bukan salinan, supaya jumlah warna dijamin sama dengan jumlah jenis
 * aksi: bila Hal 11 kelak menambah satu jenis aksi, chart tidak diam-diam
 * mengulang warna aksi pertama untuk aksi kesepuluh.
 * @type {readonly string[]}
 */
export const activityPalette = Object.freeze(
	[
		'#DCE7F5',
		'#B9CFEC',
		'#8FB2DF',
		'#6295CF',
		'#3A78BE',
		'#0C4DA2',
		'#0A3E85',
		'#083168',
		'#06244B'
	].slice(0, SCORING_TABLE.length)
);

/**
 * Zona warna busur meteran, DITURUNKAN dari target dan ambang kuning sebuah KPI.
 *
 * Angka batasnya tidak pernah ditulis literal: zona merah berakhir di
 * `target x ambangKuning`, zona kuning berakhir di `target`, sisanya hijau.
 * Untuk M-01 (target 75, ambang 0,80) ini menghasilkan tepat 0,60 / 0,75 / 1,00
 * seperti diminta katalog chart: dan ikut berubah dengan sendirinya bila
 * targetnya direvisi.
 *
 * @param {number} target Nilai target KPI dalam satuan yang sama dengan sumbu.
 * @param {number} maks Nilai maksimum busur (biasanya 100).
 * @param {number} ambangKuning Rasio pencapaian batas kuning, mis. 0,80.
 * @returns {[number, string][]} Pasangan `[porsi, warna]` untuk `axisLine.lineStyle.color`.
 */
export function zonaMeteran(target, maks, ambangKuning) {
	if (!(maks > 0)) return [[1, palette.track]];
	const batasMerah = Math.min(1, Math.max(0, (target * ambangKuning) / maks));
	const batasKuning = Math.min(1, Math.max(batasMerah, target / maks));
	return [
		[batasMerah, palette.red],
		[batasKuning, palette.amber],
		[1, palette.green]
	];
}

/**
 * Gaya garis untuk seri yang berisi ESTIMASI, bukan pengukuran.
 *
 * Putus-putus adalah satu-satunya penanda visual yang terbaca tanpa legenda dan
 * tanpa warna: syarat CH-3 dan CH-6 sekaligus. Komponen yang memakainya WAJIB
 * juga memasang lencana "Estimasi" di sisi judulnya; garis saja tidak cukup bagi
 * pembaca yang mencetak dasbornya.
 * @type {Readonly<Record<string, any>>}
 */
export const garisEstimasi = Object.freeze({ type: 'dashed', width: 2, cap: 'round' });

/**
 * Garis target standar: putus-putus, abu, dengan label yang menyebut angkanya.
 *
 * Label ditempatkan DI DALAM grid (`insideEndTop`), bukan pada posisi baku
 * ECharts yang menggantung di luar tepi. Label di luar grid terpotong tepat pada
 * lebar wadah yang sempit: dan yang terpotong justru angka targetnya, sehingga
 * garis yang tersisa tidak lagi mengatakan sedang membandingkan dengan apa.
 *
 * @param {number} nilai Nilai target pada sumbu.
 * @param {'x'|'y'} sumbu Sumbu tempat garis digambar.
 * @param {string} teks Label garis; kosong → "Target <angka>".
 * @param {string} posisi Posisi label ECharts.
 * @returns {Record<string, any>} Objek `markLine` siap di-spread ke seri.
 */
export function garisTarget(nilai, sumbu = 'y', teks = '', posisi = 'insideEndTop') {
	return {
		markLine: {
			silent: true,
			symbol: 'none',
			lineStyle: { color: palette.slate, type: 'dashed', width: 1.5 },
			label: {
				formatter: teks || `Target ${angka(nilai)}`,
				position: posisi,
				// `rotate: 0` WAJIB eksplisit: ECharts memutar label markLine mengikuti
				// arah garisnya, sehingga garis target vertikal menghasilkan tulisan
				// yang berdiri: terbaca hanya bila kepala pembaca dimiringkan.
				rotate: 0,
				color: '#475569',
				fontSize: 10,
				fontWeight: 600
			},
			data: [sumbu === 'x' ? { xAxis: nilai } : { yAxis: nilai }]
		}
	};
}
