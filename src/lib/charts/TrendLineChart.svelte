<script>
	/**
	 * TrendLineChart: tren bulanan satu atau beberapa metrik.
	 *
	 * Props:
	 * @prop {string[]} categories  Label sumbu X (biasanya nama bulan).
	 * @prop {{name:string,data:number[],color?:string,area?:boolean}[]} series
	 * @prop {string} height
	 * @prop {string} unit          Satuan yang ditempel di tooltip.
	 * @prop {boolean} loading
	 * @prop {string} emptyMessage
	 *
	 * Area gradien hanya dinyalakan bila seri berjumlah maksimal dua; di atas itu
	 * area saling menutupi dan menyembunyikan data yang justru ingin dibandingkan.
	 *
	 * Tanpa data, `option` bernilai `null`: bukan sumbu bernilai nol. Chart yang
	 * menggambar garis datar di angka nol tidak dapat dibedakan dari chart yang
	 * datanya memang nol, dan keduanya menuntut tindakan yang berbeda (CH-4).
	 */
	import EChart from '$lib/components/EChart.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import { ICONS } from '$lib/data/icons.js';
	import {
		tip,
		legend,
		grid,
		valueAxis,
		categoryAxis,
		series as paletSeri,
		animasi,
		angka,
		areaGradien
	} from './_chartTheme.js';

	let {
		categories = [],
		series = [],
		height = '280px',
		unit = '',
		loading = false,
		emptyMessage = 'Belum ada data tren untuk periode ini'
	} = $props();

	const AMBANG_AREA = 2;
	const AMBANG_LEGENDA_GULIR = 5;

	const adaData = $derived(categories.length > 0 && series.length > 0);

	const option = $derived.by(() => {
		if (!adaData) return null;

		return {
			...animasi,
			tooltip: {
				...tip,
				trigger: 'axis',
				axisPointer: { type: 'line', lineStyle: { color: '#cbd5e1' } },
				valueFormatter: (nilai) => `${angka(nilai)}${unit ? ` ${unit}` : ''}`
			},
			legend: {
				...legend,
				show: series.length > 1,
				type: series.length >= AMBANG_LEGENDA_GULIR ? 'scroll' : 'plain'
			},
			grid: { ...grid, top: series.length > 1 ? 40 : 20 },
			xAxis: { ...categoryAxis, boundaryGap: false, data: categories },
			yAxis: { ...valueAxis },
			series: series.map((seri, index) => {
				const warna = seri.color ?? paletSeri[index % paletSeri.length];
				const pakaiArea =
					(seri.area ?? series.length <= AMBANG_AREA) && series.length <= AMBANG_AREA;
				return {
					name: seri.name,
					type: 'line',
					data: seri.data,
					smooth: 0.3,
					symbol: 'circle',
					symbolSize: 7,
					showSymbol: false,
					lineStyle: { color: warna, width: 2.5 },
					itemStyle: { color: warna, borderColor: '#ffffff', borderWidth: 2 },
					...(pakaiArea ? { areaStyle: { color: areaGradien(warna) } } : {}),
					emphasis: { focus: 'series' }
				};
			})
		};
	});
</script>

{#if !adaData && !loading}
	<EmptyState title={emptyMessage} iconPath={ICONS.trend} size="sm" />
{:else}
	<EChart {option} {height} {loading} {emptyMessage} />
{/if}
