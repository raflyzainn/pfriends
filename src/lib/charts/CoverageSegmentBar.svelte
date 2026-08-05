<script>
	/**
	 * CoverageSegmentBar (C-02) — segmen mana yang tertinggal dari target cakupan.
	 *
	 * Props:
	 * @prop {{id:string,label:string,kind:string,registered:number,total:number,percent:number}[]} data
	 *   Deret segmen dari store; kosong → pesan kosong.
	 * @prop {number} target Ambang cakupan dalam persen, dari `kpi-targets.js`.
	 * @prop {string} height
	 * @prop {boolean} loading
	 *
	 * Batang ditumpuk sampai 100% dengan sisa berwarna abu, bukan dibiarkan
	 * menggantung. Alasannya membaca: batang yang berhenti di 40% tanpa jejak sisa
	 * membuat mata membandingkan panjang antarsegmen; batang bertumpuk penuh
	 * memaksa mata membandingkan porsi terhadap keseluruhan — dan porsi itulah
	 * yang ditanyakan target cakupan.
	 *
	 * @see docs/10-REVISION-SPEC.md — §7.2 C-02, §7.5 CH-6
	 */
	import EChart from '$lib/components/EChart.svelte';
	import { tip, legend, grid, valueAxis, categoryAxis, animasi, angka, palette, garisTarget } from './_chartTheme.js';

	let { data = [], target = 0, height = '', loading = false } = $props();

	const TINGGI_PER_SEGMEN = 34;
	const TINGGI_DASAR = 80;
	const PENUH = 100;

	/** Bar horizontal ECharts menggambar dari bawah; urutan dibalik agar segmen pertama di atas. */
	const urut = $derived([...data].reverse());

	const adaData = $derived(data.some((s) => s.total > 0));

	const tinggiAkhir = $derived(height || `${data.length * TINGGI_PER_SEGMEN + TINGGI_DASAR}px`);

	const option = $derived.by(() => {
		if (!adaData) return null;

		return {
			...animasi,
			tooltip: {
				...tip,
				trigger: 'axis',
				axisPointer: { type: 'shadow' },
				formatter: (deret) => {
					const nama = deret[0]?.axisValue ?? '';
					const segmen = urut.find((s) => s.label === nama);
					if (!segmen) return nama;
					return `${nama}<br/><b>${angka(segmen.percent)}%</b> terdata dan ber-consent<br/>${angka(segmen.registered)} dari ${angka(segmen.total)} awardee`;
				}
			},
			legend: { ...legend, show: true },
			// Ruang atas dilebihkan: label garis target duduk di dalam grid, dan
			// tanpa jarak ini ia bertabrakan dengan legenda di atasnya.
			grid: { ...grid, top: 52 },
			xAxis: { ...valueAxis, max: PENUH, axisLabel: { ...valueAxis.axisLabel, formatter: '{value}%' } },
			yAxis: { ...categoryAxis, axisLine: { show: false }, data: urut.map((s) => s.label) },
			series: [
				{
					name: 'Terdata dan ber-consent',
					type: 'bar',
					stack: 'cakupan',
					barMaxWidth: 22,
					itemStyle: { color: palette.blue, borderRadius: [6, 0, 0, 6] },
					label: {
						show: true,
						position: 'insideLeft',
						formatter: (p) => `${angka(p.value)}%`,
						color: '#ffffff',
						fontSize: 10,
						fontWeight: 700
					},
					data: urut.map((s) => s.percent),
					...(target > 0 ? garisTarget(target, 'x', `Target ${angka(target)}%`) : {})
				},
				{
					name: 'Belum terdata',
					type: 'bar',
					stack: 'cakupan',
					barMaxWidth: 22,
					itemStyle: { color: palette.slateSoft, borderRadius: [0, 6, 6, 0] },
					data: urut.map((s) => PENUH - s.percent)
				}
			]
		};
	});
</script>

<EChart
	{option}
	height={tinggiAkhir}
	{loading}
	emptyMessage="Belum ada awardee terdata pada satu pun segmen. Cakupan per komunitas dan chapter muncul setelah registry terisi."
/>
