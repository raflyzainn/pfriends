<script>
	/**
	 * PointSourceStackedBar (C-13) — poin datang dari jenis kontribusi apa.
	 *
	 * Props:
	 * @prop {{monthKey:string,label:string}[]} months
	 * @prop {{type:string,label:string,points:number[]}[]} series Satu seri per baris tabel skor.
	 * @prop {string} height
	 * @prop {boolean} loading
	 *
	 * Sembilan seri adalah batas atas yang masih terbaca, dan hanya karena
	 * paletnya satu gradasi terurut: warna termuda untuk aksi paling ringan,
	 * tergelap untuk kontribusi paling bermakna. Pembaca tidak perlu menghafal
	 * sembilan warna — ia cukup membaca arah gradasinya, dan pertanyaannya
	 * ("aksi ringan atau kontribusi bermakna?") terjawab dari situ.
	 *
	 * Pada layar sempit chart MENGGULIR di dalam wadahnya sendiri. Sembilan seri
	 * yang dipaksa muat pada 375 px akan menumpuk labelnya menjadi bubur, dan
	 * membiarkan halaman ikut menggulir mendatar merusak seluruh tata letak
	 * dasbor, bukan hanya chart ini.
	 *
	 * @see docs/10-REVISION-SPEC.md — §7.2 C-13, §7.4 perilaku responsif
	 */
	import EChart from '$lib/components/EChart.svelte';
	import { activityPalette, tip, legend, grid, valueAxis, categoryAxis, animasi, angka } from './_chartTheme.js';

	let { months = [], series = [], height = '340px', loading = false } = $props();

	/** Lebar minimum agar sembilan label legenda tetap terbaca sebelum digulir. */
	const LEBAR_MINIMUM = '620px';

	/** Bar horizontal ECharts menggambar dari bawah; bulan dibalik agar Januari di atas. */
	const bulanUrut = $derived([...months].reverse());

	const adaData = $derived(series.some((s) => s.points.some((n) => n > 0)));

	const option = $derived.by(() => {
		if (!adaData) return null;

		return {
			...animasi,
			tooltip: {
				...tip,
				trigger: 'axis',
				axisPointer: { type: 'shadow' },
				valueFormatter: (nilai) => `${angka(nilai)} poin`,
				order: 'valueDesc'
			},
			legend: { ...legend, show: true, type: 'scroll', top: 0 },
			grid: { ...grid, top: 56 },
			xAxis: { ...valueAxis },
			yAxis: { ...categoryAxis, axisLine: { show: false }, data: bulanUrut.map((b) => b.label) },
			series: series.map((seri, index) => ({
				name: seri.label,
				type: 'bar',
				stack: 'poin',
				barMaxWidth: 24,
				itemStyle: { color: activityPalette[index % activityPalette.length] },
				emphasis: { focus: 'series' },
				data: [...seri.points].reverse()
			}))
		};
	});
</script>

<div class="-mx-1 overflow-x-auto px-1">
	<div style="min-width:{LEBAR_MINIMUM};">
		<EChart
			{option}
			{height}
			{loading}
			emptyMessage="Belum ada aksi berpoin tercatat. Sumber poin muncul setelah anggota pertama membaca kabar, membagikan konten, atau menghadiri kegiatan."
		/>
	</div>
</div>
