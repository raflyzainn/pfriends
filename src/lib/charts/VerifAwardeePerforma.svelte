<script>
	/**
	 * VerifAwardeePerforma — produktivitas awardee dan poin yang lahir darinya.
	 *
	 * Props:
	 * @prop {string[]} labels     Label bulan, urut menaik.
	 * @prop {number[]} postingan  Postingan blog yang TERBIT pada bulan itu.
	 * @prop {number[]} poin       Poin kontribusi awardee yang tercatat bulan itu.
	 * @prop {string} height
	 * @prop {boolean} loading
	 *
	 * Tiga keputusan yang tidak terbaca dari kode:
	 *
	 * 1. **Batang untuk postingan, garis untuk poin.** Keduanya bersatuan berbeda
	 *    dan berselisih dua orde besaran; satu sumbu bersama akan meratakan batang
	 *    postingan menjadi garis nol. Bentuk yang berbeda juga menjadi pembeda
	 *    kedua di samping warna, sehingga chart tetap terbaca saat dicetak abu-abu.
	 * 2. **Sumbu kanan tidak menggambar garis bantunya sendiri.** Dua kisi yang
	 *    tidak sejajar membuat pembaca mengira ada makna pada titik potongnya.
	 * 3. **Tanpa data, `option` bernilai `null` — bukan deret nol.** Bulan yang
	 *    seluruhnya nol tidak dapat dibedakan dari data yang gagal dimuat, padahal
	 *    keduanya menuntut tindakan berbeda.
	 */
	import EChart from '$lib/components/EChart.svelte';
	import {
		animasi,
		angka,
		areaGradien,
		categoryAxis,
		grid,
		legend,
		palette,
		tip,
		valueAxis
	} from './_chartTheme.js';

	let { labels = [], postingan = [], poin = [], height = '300px', loading = false } = $props();

	const adaData = $derived(
		labels.length > 0 && (postingan.some((n) => n > 0) || poin.some((n) => n > 0))
	);

	const option = $derived.by(() =>
		!adaData
			? null
			: {
					...animasi,
					tooltip: { ...tip, trigger: 'axis', axisPointer: { type: 'shadow' } },
					legend: { ...legend, data: ['Postingan terbit', 'Poin kontribusi'] },
					grid: { ...grid, right: 12 },
					xAxis: { ...categoryAxis, data: labels },
					yAxis: [
						{ ...valueAxis, name: 'Postingan', nameTextStyle: { color: '#64748b', fontSize: 10 } },
						{
							...valueAxis,
							name: 'Poin',
							nameTextStyle: { color: '#64748b', fontSize: 10 },
							splitLine: { show: false },
							axisLabel: { color: '#64748b', fontSize: 10, formatter: (n) => angka(n) }
						}
					],
					series: [
						{
							name: 'Postingan terbit',
							type: 'bar',
							yAxisIndex: 0,
							data: postingan,
							barMaxWidth: 26,
							itemStyle: { color: palette.blue, borderRadius: [6, 6, 0, 0] }
						},
						{
							name: 'Poin kontribusi',
							type: 'line',
							yAxisIndex: 1,
							data: poin,
							smooth: true,
							symbolSize: 7,
							lineStyle: { width: 2.5, color: palette.amber },
							itemStyle: { color: palette.amber },
							areaStyle: { color: areaGradien(palette.amber) }
						}
					]
				}
	);
</script>

<EChart
	{option}
	{height}
	{loading}
	emptyMessage="Belum ada postingan maupun poin tercatat pada rentang ini."
/>
