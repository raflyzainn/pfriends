<script>
	/**
	 * AwardeePointTrend: perjalanan Poin Kontribusi SEORANG anggota, bukan
	 * perbandingan antar-anggota.
	 *
	 * Dipakai hanya di zona awardee. Awalan nama `Awardee` menjaga agar chart ini
	 * tidak diambil begitu saja oleh dasbor pengelola: bentuknya sengaja tidak
	 * mampu menampung seri kedua, sehingga tidak ada jalan untuk menempelkan garis
	 * "rata-rata komunitas" di sebelahnya. Perbandingan diam-diam adalah papan
	 * peringkat yang menyamar, dan zona ini memang dirancang tanpa papan peringkat.
	 *
	 * Props:
	 * @prop {string[]} categories  Label sumbu X, mis. nama pekan.
	 * @prop {number[]} values      Poin kumulatif pada tiap titik.
	 * @prop {string} height
	 * @prop {boolean} loading
	 * @prop {string} emptyMessage
	 *
	 * Tanpa data, `option` bernilai `null`: bukan garis datar di angka nol. Garis
	 * nol tidak dapat dibedakan dari "belum ada aksi sama sekali", padahal yang
	 * pertama menuntut penjelasan dan yang kedua menuntut ajakan memulai (CH-4).
	 */
	import EChart from '$lib/components/EChart.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import { ICONS } from '$lib/data/icons.js';
	import {
		angka,
		animasi,
		areaGradien,
		categoryAxis,
		grid,
		palette,
		tip,
		valueAxis
	} from './_chartTheme.js';

	let {
		categories = [],
		values = [],
		height = '190px',
		loading = false,
		emptyMessage = 'Perjalanan poinmu mulai tergambar setelah aksi pertama tercatat'
	} = $props();

	const adaData = $derived(categories.length > 0 && values.length > 0);

	const option = $derived.by(() => {
		if (!adaData) return null;

		return {
			...animasi,
			tooltip: {
				...tip,
				trigger: 'axis',
				axisPointer: { type: 'line', lineStyle: { color: '#cbd5e1' } },
				valueFormatter: (nilai) => `${angka(nilai)} poin`
			},
			grid: { ...grid, top: 16, right: 12 },
			xAxis: { ...categoryAxis, boundaryGap: false, data: categories },
			yAxis: { ...valueAxis, minInterval: 1 },
			series: [
				{
					name: 'Poin Kontribusi',
					type: 'line',
					data: values,
					smooth: 0.3,
					symbol: 'circle',
					symbolSize: 7,
					showSymbol: false,
					lineStyle: { color: palette.blue, width: 2.5 },
					itemStyle: { color: palette.blue, borderColor: '#ffffff', borderWidth: 2 },
					areaStyle: { color: areaGradien(palette.blue) },
					emphasis: { focus: 'series' }
				}
			]
		};
	});
</script>

{#if !adaData && !loading}
	<EmptyState title={emptyMessage} iconPath={ICONS.trend} size="sm" />
{:else}
	<EChart {option} {height} {loading} {emptyMessage} />
{/if}
