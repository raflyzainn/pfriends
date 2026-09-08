<script>
	/**
	 * AmplificationTrendLine (C-04): tren amplification rate, dua penyebut.
	 *
	 * Props:
	 * @prop {{monthKey:string,label:string,activeRate:number,totalRate:number,amplifiers:number}[]} data
	 * @prop {number} target Ambang amplifikasi dalam persen, dari `kpi-targets.js`.
	 * @prop {string} height
	 * @prop {boolean} loading
	 *
	 * Dua garis, satu utuh dan satu putus-putus. Garis utuh memakai penyebut
	 * anggota AKTIF: itulah definisi KPI Hal 6 dan angka yang dilaporkan. Garis
	 * putus-putus memakai penyebut SELURUH anggota terdaftar; ia bukan KPI, ia
	 * pengingat.
	 *
	 * Jarak antara keduanya adalah informasi utamanya: selisih yang melebar berarti
	 * registrasi bertambah tanpa diikuti keterlibatan, dan itu justru tidak terlihat
	 * pada angka KPI yang penyebutnya ikut menyusut bersama.
	 *
	 * @see docs/10-REVISION-SPEC.md: §7.2 C-04, §7.5 CH-3
	 */
	import EChart from '$lib/components/EChart.svelte';
	import {
		tip,
		legend,
		grid,
		valueAxis,
		categoryAxis,
		animasi,
		angka,
		areaGradien,
		palette,
		garisTarget
	} from './_chartTheme.js';

	let { data = [], target = 0, height = '300px', loading = false } = $props();

	const PENUH = 100;

	const adaData = $derived(data.some((b) => b.activeRate > 0 || b.totalRate > 0));

	const option = $derived.by(() => {
		if (!adaData) return null;

		return {
			...animasi,
			tooltip: {
				...tip,
				trigger: 'axis',
				axisPointer: { type: 'line', lineStyle: { color: '#cbd5e1' } },
				valueFormatter: (nilai) => `${angka(nilai)}%`
			},
			legend: { ...legend, show: true },
			grid: { ...grid, top: 40 },
			xAxis: { ...categoryAxis, boundaryGap: false, data: data.map((b) => b.label) },
			yAxis: {
				...valueAxis,
				max: PENUH,
				axisLabel: { ...valueAxis.axisLabel, formatter: '{value}%' }
			},
			series: [
				{
					name: 'Terhadap anggota aktif',
					type: 'line',
					smooth: 0.3,
					symbol: 'circle',
					symbolSize: 7,
					lineStyle: { color: palette.red, width: 2.5 },
					itemStyle: { color: palette.red, borderColor: '#ffffff', borderWidth: 2 },
					areaStyle: { color: areaGradien(palette.red) },
					data: data.map((b) => b.activeRate),
					...(target > 0 ? garisTarget(target, 'y', `Target ${angka(target)}%`) : {})
				},
				{
					name: 'Terhadap seluruh anggota terdaftar',
					type: 'line',
					smooth: 0.3,
					symbol: 'circle',
					symbolSize: 6,
					lineStyle: { color: palette.slate, width: 2, type: 'dashed' },
					itemStyle: { color: palette.slate, borderColor: '#ffffff', borderWidth: 2 },
					data: data.map((b) => b.totalRate)
				}
			]
		};
	});
</script>

<EChart
	{option}
	{height}
	{loading}
	emptyMessage="Belum ada aksi amplifikasi tercatat sepanjang rentang program. Tren muncul setelah anggota pertama membagikan konten Pertamina Foundation."
/>
