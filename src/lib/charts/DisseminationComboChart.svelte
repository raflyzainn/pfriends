<script>
	/**
	 * DisseminationComboChart (C-03) — ritme diseminasi konten per bulan.
	 *
	 * Props:
	 * @prop {{monthKey:string,label:string,contents:number,days:number}[]} data
	 * @prop {number} targetKonten Batas bawah volume konten per bulan (M-02).
	 * @prop {number} targetHari   Batas bawah hari diseminasi per bulan (M-03).
	 * @prop {string} height
	 * @prop {boolean} loading
	 *
	 * Dua sumbu nilai, dan itu disengaja. Volume konten dan hari diseminasi
	 * menjawab pertanyaan yang berbeda — "berapa banyak yang dikirim" versus
	 * "seberapa sering ritmenya" — dan skalanya memang tidak sebanding.
	 * Memaksanya ke satu sumbu akan membuat salah satu deret rata di dasar chart
	 * dan berhenti terbaca.
	 *
	 * Batang untuk cacah, garis untuk ritme: batang mengundang perbandingan
	 * antarbulan, garis mengundang pembacaan arah. Keduanya sesuai dengan
	 * pertanyaannya masing-masing.
	 *
	 * @see docs/10-REVISION-SPEC.md — §7.2 C-03
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
		palette,
		garisTarget
	} from './_chartTheme.js';

	let { data = [], targetKonten = 0, targetHari = 0, height = '300px', loading = false } = $props();

	const adaData = $derived(data.some((b) => b.contents > 0 || b.days > 0));

	const option = $derived.by(() => {
		if (!adaData) return null;

		return {
			...animasi,
			tooltip: {
				...tip,
				trigger: 'axis',
				axisPointer: { type: 'shadow' }
			},
			legend: { ...legend, show: true },
			grid: { ...grid, top: 40, right: 32 },
			xAxis: { ...categoryAxis, data: data.map((b) => b.label) },
			yAxis: [
				{
					...valueAxis,
					name: 'Konten',
					nameTextStyle: { color: '#64748b', fontSize: 10 },
					minInterval: 1
				},
				{
					...valueAxis,
					name: 'Hari kirim',
					nameTextStyle: { color: '#64748b', fontSize: 10 },
					splitLine: { show: false },
					minInterval: 1
				}
			],
			series: [
				{
					name: 'Konten terdiseminasi',
					type: 'bar',
					barMaxWidth: 28,
					itemStyle: { color: palette.blue, borderRadius: [6, 6, 0, 0] },
					label: {
						show: true,
						position: 'top',
						formatter: (p) => (p.value > 0 ? angka(p.value) : ''),
						color: '#475569',
						fontSize: 10,
						fontWeight: 600
					},
					data: data.map((b) => b.contents),
					...(targetKonten > 0
						? garisTarget(
								targetKonten,
								'y',
								`Minimum ${angka(targetKonten)} konten`,
								'insideStartTop'
							)
						: {})
				},
				{
					name: 'Hari diseminasi unik',
					type: 'line',
					yAxisIndex: 1,
					smooth: 0.3,
					symbol: 'circle',
					symbolSize: 7,
					lineStyle: { color: palette.green, width: 2.5 },
					itemStyle: { color: palette.green, borderColor: '#ffffff', borderWidth: 2 },
					data: data.map((b) => b.days),
					...(targetHari > 0
						? garisTarget(
								targetHari,
								'y',
								`Minimum ${angka(targetHari)} hari kirim`,
								'insideEndBottom'
							)
						: {})
				}
			]
		};
	});
</script>

<EChart
	{option}
	{height}
	{loading}
	emptyMessage="Belum ada kabar terkirim sepanjang rentang program. Ritme diseminasi muncul setelah broadcast pertama dikirim ke komunitas."
/>
