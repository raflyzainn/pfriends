<script>
	/**
	 * KpiGaugeChart: meteran pencapaian satu KPI.
	 *
	 * Props:
	 * @prop {number} value
	 * @prop {number} target
	 * @prop {string} label
	 * @prop {string} unit
	 * @prop {string} status   HIJAU | KUNING | MERAH; kosong → diturunkan dari rasio.
	 * @prop {string} height
	 * @prop {boolean} loading
	 *
	 * Meteran sengaja dibatasi 100% dan tidak pernah melewati busurnya. Pencapaian
	 * di atas target tetap ditulis apa adanya sebagai angka di tengah: busur yang
	 * meluap justru membuat capaian sulit dibandingkan antar-KPI.
	 *
	 * Meteran ringkas ini melengkapi `CoverageGaugeChart` (C-01), bukan
	 * menggantikannya: yang itu meteran tunggal berzona warna untuk satu KPI
	 * unggulan, yang ini deret meteran kecil untuk membaca empat KPI sisanya
	 * berdampingan. Target yang tidak masuk akal (nol atau negatif) membuat
	 * `option` bernilai `null`: meteran tanpa penyebut bukan meteran (CH-4).
	 */
	import EChart from '$lib/components/EChart.svelte';
	import { KPI_STATUS } from '$lib/domain/constants/kpi-targets.js';
	import { font, animasi, angka, palette, statusPalette } from './_chartTheme.js';

	let {
		value = 0,
		target = 100,
		label = '',
		unit = '',
		status = '',
		height = '200px',
		loading = false
	} = $props();

	const AMBANG_KUNING = 0.8;

	const rasio = $derived(target > 0 ? value / target : 0);
	const persen = $derived(Math.min(100, Math.max(0, rasio * 100)));

	const statusAkhir = $derived(
		status ||
			(rasio >= 1 ? KPI_STATUS.HIJAU : rasio >= AMBANG_KUNING ? KPI_STATUS.KUNING : KPI_STATUS.MERAH)
	);

	const warna = $derived(statusPalette[statusAkhir] ?? palette.slate);

	const option = $derived.by(() => (!(target > 0) ? null : {
		...animasi,
		series: [
			{
				type: 'gauge',
				startAngle: 210,
				endAngle: -30,
				min: 0,
				max: 100,
				radius: '92%',
				center: ['50%', '62%'],
				progress: {
					show: true,
					width: 14,
					roundCap: true,
					itemStyle: { color: warna }
				},
				axisLine: { lineStyle: { width: 14, color: [[1, palette.track]] } },
				pointer: { show: false },
				axisTick: { show: false },
				splitLine: { show: false },
				axisLabel: { show: false },
				anchor: { show: false },
				title: {
					show: Boolean(label),
					offsetCenter: [0, '38%'],
					color: '#64748b',
					fontSize: 11,
					fontWeight: 600,
					...font
				},
				detail: {
					offsetCenter: [0, '2%'],
					formatter: () => `${angka(Math.round(persen))}%`,
					color: '#0F1B2D',
					fontSize: 28,
					fontWeight: 800,
					...font
				},
				data: [{ value: persen, name: label }]
			}
		]
	}));
</script>

<div>
	<EChart
		{option}
		{height}
		{loading}
		emptyMessage="Target metrik ini belum tersedia, sehingga capaiannya belum dapat dimeterkan."
	/>

	<p class="mt-1 text-center text-xs text-ink-600">
		<span class="numeric font-bold text-ink-900">{angka(value)}</span>
		{#if unit}<span class="text-ink-500">{unit}</span>{/if}
		<span class="text-ink-500">dari target {angka(target)}{unit ? ` ${unit}` : ''}</span>
	</p>
</div>
