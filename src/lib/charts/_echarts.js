/**
 * MODUL INTERNAL — satu-satunya titik masuk pustaka Apache ECharts.
 *
 * Tanggung jawab: merakit build ECharts yang di-*tree-shake* dan mengekspornya
 * sebagai satu objek siap pakai. Tidak ada komponen, halaman, maupun store lain
 * yang boleh menulis `import … from 'echarts'`.
 *
 * Tiga alasan berkas ini ada, dan mengapa satu pun tidak boleh ditawar:
 *
 * 1. **Ukuran bundel.** `import('echarts')` menarik seluruh pustaka — seluruh
 *    tipe chart, seluruh komponen koordinat, dua renderer — sekitar satu megabita.
 *    Aplikasi ini memakai enam tipe chart. Dengan `echarts/core` + `use()`, yang
 *    ikut terbundel hanya yang benar-benar didaftarkan di bawah.
 * 2. **Satu daftar registrasi.** Bila tiap komponen chart mendaftarkan modulnya
 *    sendiri, chart ke-12 akan lupa mendaftarkan `MarkLineComponent` dan garis
 *    targetnya hilang tanpa satu pun galat — ECharts mengabaikan option yang
 *    modulnya tidak terpasang, diam-diam.
 * 3. **Satu tempat untuk diaudit.** Gerbang WP-07 butir 1 memeriksa
 *    `grep -rn "from 'echarts'" src` hanya menemukan berkas ini.
 *
 * Berkas ini sengaja diawali garis bawah: ia modul internal paket `charts`,
 * bukan titik masuk publik. Pemakainya satu-satunya adalah `EChart.svelte`,
 * lewat impor dinamis, supaya halaman tanpa chart tidak membayar biayanya.
 *
 * @see docs/12-BUILD-CONTRACT-V2.md — §2.13 kontrak `_echarts.js`, §3.5 WP-07 butir 1, R-14
 * @see docs/10-REVISION-SPEC.md — §7.1 cacat E-2
 */

import * as echarts from 'echarts/core';
import {
	BarChart,
	FunnelChart,
	GaugeChart,
	LineChart,
	PieChart,
	RadarChart
} from 'echarts/charts';
import {
	GridComponent,
	LegendComponent,
	MarkLineComponent,
	RadarComponent,
	TitleComponent,
	TooltipComponent
} from 'echarts/components';
import { LabelLayout, LegacyGridContainLabel } from 'echarts/features';
import { CanvasRenderer } from 'echarts/renderers';

/**
 * Enam tipe chart yang benar-benar dipakai katalog `docs/10` §7.2 (C-01…C-20).
 * Menambah tipe baru berarti menambahnya di sini lebih dulu — bukan di komponen.
 */
const TIPE_CHART = [BarChart, LineChart, PieChart, RadarChart, GaugeChart, FunnelChart];

/**
 * Komponen penopang. `RadarComponent` adalah sistem koordinat radar dan terpisah
 * dari `RadarChart`; keduanya wajib ada. `MarkLineComponent` menopang seluruh
 * garis target (`markLine`) pada chart KPI — tanpanya garis target hilang diam-diam.
 */
const KOMPONEN = [
	GridComponent,
	TooltipComponent,
	LegendComponent,
	TitleComponent,
	RadarComponent,
	MarkLineComponent
];

/**
 * Fitur tambahan. `LegacyGridContainLabel` mengembalikan perilaku
 * `grid.containLabel` yang dipakai `_chartTheme.js`; sejak ECharts 6 fitur itu
 * tidak lagi terpasang secara baku pada build inti, dan tanpanya label sumbu Y
 * yang panjang terpotong di tepi kiri wadah.
 */
const FITUR = [LabelLayout, LegacyGridContainLabel];

echarts.use([...TIPE_CHART, ...KOMPONEN, ...FITUR, CanvasRenderer]);

/**
 * Instans ECharts yang sudah teregistrasi lengkap.
 * @type {typeof echarts}
 */
export default echarts;
