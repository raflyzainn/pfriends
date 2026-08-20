<script>
	/**
	 * AdminPublikasiTrend: ritme publikasi bulanan zona admin.
	 *
	 * Props:
	 * @prop {{label:string,terbit:number,konten:number,jangkauan:number}[]} data
	 * @prop {number} targetKonten  Batas bawah volume konten per bulan (M-02).
	 * @prop {string} height
	 * @prop {boolean} loading
	 *
	 * Dua batang untuk CACAH (blog terbit, konten terdiseminasi) dan satu garis
	 * untuk ESTIMASI jangkauan pada sumbu kanan. Skalanya memang tidak sebanding :
	 * belasan naskah berhadapan dengan puluhan ribu orang: dan memaksanya ke satu
	 * sumbu membuat kedua batang rata di dasar chart lalu berhenti terbaca.
	 *
	 * Garis jangkauan digambar PUTUS-PUTUS memakai `garisEstimasi` dari tema. Itu
	 * satu-satunya penanda yang terbaca tanpa legenda dan tanpa warna, dan angka
	 * jangkauan memang hasil model: bukan hasil pengukuran. Batang boleh dibaca
	 * sebagai fakta; garis tidak.
	 *
	 * Tanpa data, `option` bernilai `null`: bukan batang bernilai nol (CH-4).
	 */
	import EChart from '$lib/components/EChart.svelte';
	import {
		tip,
		legend,
		grid,
		valueAxis,
		categoryAxis,
		axisLabel,
		animasi,
		angka,
		palette,
		garisEstimasi,
		garisTarget
	} from './_chartTheme.js';

	let { data = [], targetKonten = 0, height = '320px', loading = false } = $props();

	/** Lebar minimum sebelum chart menggulir di dalam wadahnya sendiri. */
	const LEBAR_MINIMUM = '560px';

	const adaData = $derived(
		data.some((b) => b.terbit > 0 || b.konten > 0 || b.jangkauan > 0)
	);

	const option = $derived.by(() => {
		if (!adaData) return null;

		return {
			...animasi,
			tooltip: {
				...tip,
				trigger: 'axis',
				axisPointer: { type: 'shadow' }
			},
			legend: { ...legend, show: true, top: 0 },
			grid: { ...grid, top: 40, right: 8 },
			xAxis: { ...categoryAxis, data: data.map((b) => b.label) },
			yAxis: [
				{ ...valueAxis, name: 'Cacah', nameTextStyle: { ...axisLabel, align: 'left' } },
				{
					...valueAxis,
					name: 'Jangkauan',
					nameTextStyle: { ...axisLabel, align: 'right' },
					splitLine: { show: false },
					axisLabel: { ...axisLabel, formatter: (n) => (n >= 1000 ? `${Math.round(n / 1000)}rb` : angka(n)) }
				}
			],
			series: [
				{
					name: 'Blog terbit',
					type: 'bar',
					yAxisIndex: 0,
					barMaxWidth: 22,
					itemStyle: { color: palette.blue, borderRadius: [4, 4, 0, 0] },
					emphasis: { focus: 'series' },
					tooltip: { valueFormatter: (n) => `${angka(n)} naskah` },
					data: data.map((b) => b.terbit)
				},
				{
					name: 'Konten terdiseminasi',
					type: 'bar',
					yAxisIndex: 0,
					barMaxWidth: 22,
					itemStyle: { color: palette.cyan, borderRadius: [4, 4, 0, 0] },
					emphasis: { focus: 'series' },
					tooltip: { valueFormatter: (n) => `${angka(n)} konten` },
					...(targetKonten > 0 ? garisTarget(targetKonten, 'y', `Target ${targetKonten} konten/bulan`) : {}),
					data: data.map((b) => b.konten)
				},
				{
					name: 'Estimasi jangkauan organik',
					type: 'line',
					yAxisIndex: 1,
					smooth: 0.3,
					symbol: 'circle',
					symbolSize: 6,
					lineStyle: { color: palette.amber, ...garisEstimasi },
					itemStyle: { color: palette.amber, borderColor: '#ffffff', borderWidth: 2 },
					emphasis: { focus: 'series' },
					tooltip: { valueFormatter: (n) => `± ${angka(n)} orang` },
					data: data.map((b) => b.jangkauan)
				}
			]
		};
	});
</script>

<div class="-mx-1 overflow-x-auto px-1">
	<div style="min-width:{LEBAR_MINIMUM};">
		<EChart
			{option}
			{height}
			{loading}
			emptyMessage="Belum ada naskah terbit maupun kabar terkirim. Ritme publikasi muncul setelah konten pertama tayang di ruang publik."
		/>
	</div>
</div>
