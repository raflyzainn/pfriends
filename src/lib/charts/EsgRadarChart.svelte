<script>
	/**
	 * EsgRadarChart: profil kesiapan bukti tiga pilar ESG.
	 *
	 * Props:
	 * @prop {{name:string,values:number[],color?:string}[]} series
	 * @prop {{name:string,max?:number}[]} indicators  Kosong → tiga pilar E/S/G.
	 * @prop {string} height
	 * @prop {number} max
	 * @prop {boolean} loading
	 *
	 * Radar dipilih hanya karena sumbunya memang tiga dan setara. Untuk lebih dari
	 * enam sumbu, bentuk ini berhenti terbaca dan bar horizontal lebih jujur.
	 *
	 * Tanpa seri, `option` bernilai `null`: radar dengan seluruh sumbu bernilai nol
	 * menyusut menjadi satu titik dan terbaca sebagai kegagalan render (CH-4).
	 */
	import EChart from '$lib/components/EChart.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import { ICONS } from '$lib/data/icons.js';
	import { ESG_PILLARS } from '$lib/domain/constants/esg-taxonomy.js';
	import { tip, legend, font, animasi, angka, series as paletSeri } from './_chartTheme.js';

	let {
		series = [],
		indicators = [],
		height = '320px',
		max = 100,
		loading = false
	} = $props();

	const sumbu = $derived(
		indicators.length > 0
			? indicators.map((i) => ({ name: i.name, max: i.max ?? max }))
			: ESG_PILLARS.map((p) => ({ name: p.label, max }))
	);

	/**
	 * `sumbu` jatuh ke `ESG_PILLARS` dan `series` biasanya dirakit dari ketiga
	 * pilar itu juga, sehingga keduanya tetap berisi walau belum ada satu pun
	 * bukti ESG tersimpan. Radar bersumbu penuh dengan seluruh titik di pusat
	 * adalah grafik nol (CH-4): penjagaannya harus pada nilai, bukan panjang.
	 */
	const adaData = $derived(
		sumbu.length > 0 &&
			series.some((s) => (s?.values ?? []).some((n) => Number(n) > 0))
	);

	const option = $derived.by(() => (!adaData ? null : {
		...animasi,
		tooltip: { ...tip, trigger: 'item' },
		legend: { ...legend, show: series.length > 1 },
		radar: {
			indicator: sumbu,
			radius: '66%',
			center: ['50%', '56%'],
			splitNumber: 4,
			axisName: { color: '#475569', fontSize: 11, fontWeight: 600, ...font },
			splitLine: { lineStyle: { color: '#e2e8f0' } },
			splitArea: { areaStyle: { color: ['#ffffff', '#f8fafc'] } },
			axisLine: { lineStyle: { color: '#e2e8f0' } }
		},
		series: [
			{
				type: 'radar',
				symbolSize: 5,
				data: series.map((seri, index) => {
					const warna = seri.color ?? paletSeri[index % paletSeri.length];
					return {
						name: seri.name,
						value: seri.values,
						lineStyle: { color: warna, width: 2.5 },
						itemStyle: { color: warna },
						areaStyle: { color: `${warna}22` }
					};
				})
			}
		]
	}));

	const ringkasan = $derived(
		series.map((seri) => ({
			name: seri.name,
			detail: sumbu
				.map((s, i) => `${s.name} ${angka(seri.values[i] ?? 0)}`)
				.join(' · ')
		}))
	);
</script>

{#if !adaData && !loading}
	<EmptyState
		title="Belum ada bukti ESG terkumpul"
		message="Profil pilar muncul setelah cerita pertama lolos gerbang bukti ESG."
		iconPath={ICONS.leaf}
		size="sm"
	/>
{:else}
	<EChart
		{option}
		{height}
		{loading}
		emptyMessage="Belum ada bukti ESG yang dapat dipetakan ke tiga pilar."
	/>

	{#if adaData}
		<ul class="mt-2 space-y-1">
			{#each ringkasan as baris (baris.name)}
				<li class="text-xs text-ink-600">
					<span class="font-semibold text-ink-800">{baris.name}</span>: {baris.detail}
				</li>
			{/each}
		</ul>
	{/if}
{/if}
