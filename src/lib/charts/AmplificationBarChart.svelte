<script>
	/**
	 * AmplificationBarChart — peringkat amplifikasi per kanal, chapter, atau komunitas.
	 *
	 * Props:
	 * @prop {{label:string,value:number,color?:string}[]} data
	 * @prop {string} height        Kosong → tinggi dihitung dari jumlah kategori.
	 * @prop {'horizontal'|'vertical'} orientation
	 * @prop {string} unit
	 * @prop {number|null} target   Garis target opsional (mis. KPI amplifikasi 50%).
	 * @prop {boolean} loading
	 *
	 * Bar horizontal adalah bentuk yang benar untuk kategori berlabel panjang:
	 * label terbaca mendatar tanpa dimiringkan, dan urutan peringkat terbaca dari
	 * atas ke bawah seperti daftar.
	 *
	 * Garis target memakai pembantu bersama `garisTarget` dari tema, bukan salinan
	 * lokal: bila gaya garis target diubah, seluruh chart berubah bersamaan.
	 * Tanpa data, `option` bernilai `null` — bukan batang bernilai nol (CH-4).
	 */
	import EChart from '$lib/components/EChart.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import { ICONS } from '$lib/data/icons.js';
	import {
		tip,
		grid,
		valueAxis,
		categoryAxis,
		animasi,
		angka,
		garisTarget,
		series as paletSeri
	} from './_chartTheme.js';

	let {
		data = [],
		height = '',
		orientation = 'horizontal',
		unit = '',
		target = null,
		loading = false
	} = $props();

	const TINGGI_PER_KATEGORI = 28;
	const TINGGI_DASAR = 60;

	const mendatar = $derived(orientation === 'horizontal');

	/**
	 * Pemanggil lazim menurunkan `data` dari daftar KATEGORI (chapter, komunitas,
	 * kanal) yang selalu lengkap, lalu mengisi nilainya dari aktivitas. Panjang
	 * lariknya karena itu tidak pernah nol, bahkan pada basis data tanpa satu pun
	 * aktivitas — dan penjagaan berbasis panjang menggambar deret batang bernilai
	 * nol yang dilarang CH-4. Yang menentukan adalah adanya nilai terukur.
	 */
	const adaData = $derived(data.length > 0 && data.some((d) => Number(d.value) > 0));

	const tinggiAkhir = $derived(
		height || `${data.length * TINGGI_PER_KATEGORI + TINGGI_DASAR}px`
	);

	/** Bar horizontal ECharts menggambar dari bawah, jadi urutan dibalik agar terbesar di atas. */
	const urut = $derived(mendatar ? [...data].reverse() : data);

	const penandaTarget = $derived.by(() => {
		if (target === null || target === undefined) return {};
		return garisTarget(
			target,
			mendatar ? 'x' : 'y',
			`Target ${angka(target)}${unit ? ` ${unit}` : ''}`
		);
	});

	const option = $derived.by(() => {
		if (!adaData) return null;

		return {
			...animasi,
			tooltip: {
				...tip,
				trigger: 'axis',
				axisPointer: { type: 'shadow' },
				valueFormatter: (nilai) => `${angka(nilai)}${unit ? ` ${unit}` : ''}`
			},
			grid: { ...grid, top: 16 },
			xAxis: mendatar ? { ...valueAxis } : { ...categoryAxis, data: urut.map((d) => d.label) },
			yAxis: mendatar
				? { ...categoryAxis, axisLine: { show: false }, data: urut.map((d) => d.label) }
				: { ...valueAxis },
			series: [
				{
					type: 'bar',
					barMaxWidth: 28,
					data: urut.map((d, index) => ({
						value: d.value,
						itemStyle: {
							color: d.color ?? paletSeri[index % paletSeri.length],
							borderRadius: mendatar ? [0, 6, 6, 0] : [6, 6, 0, 0]
						}
					})),
					label: {
						show: true,
						position: mendatar ? 'right' : 'top',
						formatter: (p) => `${angka(p.value)}${unit ? ` ${unit}` : ''}`,
						color: '#475569',
						fontSize: 10,
						fontWeight: 600
					},
					...penandaTarget
				}
			]
		};
	});
</script>

{#if !adaData && !loading}
	<EmptyState
		title="Belum ada amplifikasi tercatat"
		message="Angka muncul setelah anggota membagikan konten Pertamina Foundation ke jaringannya."
		iconPath={ICONS.share}
		size="sm"
	/>
{:else}
	<EChart
		{option}
		height={tinggiAkhir}
		{loading}
		emptyMessage="Belum ada amplifikasi tercatat pada rentang ini."
	/>
{/if}
