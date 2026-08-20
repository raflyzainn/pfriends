<script>
	/**
	 * CoverageGaugeChart (C-01): meteran cakupan registrasi penerima manfaat.
	 *
	 * Props:
	 * @prop {import('$lib/domain/services/KpiCalculator.js').KpiSnapshotRow|null} kpi
	 *   Satu baris potret KPI. `null` → pesan kosong, bukan meteran nol.
	 * @prop {string} height
	 * @prop {boolean} loading
	 *
	 * Busur dibagi tiga zona warna yang DITURUNKAN dari target dan ambang kuning
	 * KPI-nya (`zonaMeteran`), bukan dari tiga angka yang ditulis di sini. Bila
	 * target coverage kelak direvisi, batas zona ikut bergeser dengan sendirinya :
	 * meteran yang batas warnanya dipatok manual akan terus menghijau pada capaian
	 * yang sebenarnya sudah di bawah target baru.
	 *
	 * Garis target digambar terpisah dari zona warna. Zona menjawab "sedang di
	 * mana", garis menjawab "harus sampai mana"; menggabungkan keduanya menjadi
	 * satu isyarat membuat pembaca menebak batasnya dari perubahan rona.
	 *
	 * @see docs/10-REVISION-SPEC.md: §7.2 C-01, §7.5 CH-4/CH-6/CH-7
	 */
	import EChart from '$lib/components/EChart.svelte';
	import { targetKpi } from '$lib/domain/constants/kpi-targets.js';
	import { animasi, angka, font, palette, statusPalette, zonaMeteran } from './_chartTheme.js';

	let { kpi = null, height = '260px', loading = false } = $props();

	/** Nilai maksimum busur: meteran persen selalu berhenti di 100. */
	const MAKS_BUSUR = 100;

	const definisi = $derived(kpi ? targetKpi(kpi.id) : null);

	const zona = $derived(
		definisi ? zonaMeteran(definisi.target, MAKS_BUSUR, definisi.ambangKuning) : []
	);

	const warnaJarum = $derived(kpi ? (statusPalette[kpi.status] ?? palette.slate) : palette.slate);

	const option = $derived.by(() => {
		if (!kpi || !definisi) return null;
		const nilai = Math.min(MAKS_BUSUR, Math.max(0, kpi.actual));

		return {
			...animasi,
			series: [
				{
					name: kpi.shortLabel,
					type: 'gauge',
					startAngle: 210,
					endAngle: -30,
					min: 0,
					max: MAKS_BUSUR,
					radius: '90%',
					center: ['50%', '62%'],
					axisLine: { lineStyle: { width: 16, color: zona } },
					progress: { show: false },
					pointer: {
						show: true,
						length: '62%',
						width: 5,
						itemStyle: { color: warnaJarum }
					},
					anchor: { show: true, size: 12, itemStyle: { color: warnaJarum } },
					axisTick: { distance: -16, length: 4, lineStyle: { color: '#ffffff', width: 1 } },
					splitLine: { distance: -16, length: 10, lineStyle: { color: '#ffffff', width: 2 } },
					axisLabel: { distance: -30, color: '#64748b', fontSize: 10, ...font },
					title: {
						offsetCenter: [0, '36%'],
						color: '#64748b',
						fontSize: 11,
						fontWeight: 600,
						...font
					},
					detail: {
						offsetCenter: [0, '8%'],
						formatter: () => `${angka(nilai)}%`,
						color: '#0F1B2D',
						fontSize: 30,
						fontWeight: 800,
						...font
					},
					data: [{ value: nilai, name: kpi.shortLabel }]
				},
				// Penanda target sebagai seri kedua, bukan `markLine`: meteran ECharts
				// tidak punya sumbu kartesian, sehingga `markLine` di atasnya diabaikan
				// diam-diam: garis targetnya hilang tanpa satu pun galat.
				{
					name: 'Target',
					type: 'gauge',
					startAngle: 210,
					endAngle: -30,
					min: 0,
					max: MAKS_BUSUR,
					radius: '90%',
					center: ['50%', '62%'],
					silent: true,
					axisLine: { show: false },
					axisTick: { show: false },
					splitLine: { show: false },
					axisLabel: { show: false },
					anchor: { show: false },
					title: { show: false },
					detail: { show: false },
					pointer: {
						icon: 'rect',
						width: 3,
						length: '18%',
						offsetCenter: [0, '-78%'],
						itemStyle: { color: palette.ink }
					},
					data: [{ value: definisi.target }]
				}
			]
		};
	});
</script>

<div>
	<EChart
		{option}
		{height}
		{loading}
		emptyMessage="Cakupan registrasi belum dapat dihitung. Angka muncul setelah registry penerima manfaat terisi dan minimal satu consent aktif tercatat."
	/>

	{#if kpi && definisi}
		<p class="mt-1 text-center text-xs leading-relaxed text-ink-600">
			<span class="numeric font-bold text-ink-900">{angka(kpi.numerator)}</span>
			dari
			<span class="numeric font-bold text-ink-900">{angka(kpi.denominator)}</span>
			penerima manfaat terdata dan ber-consent aktif · target
			<span class="numeric font-semibold">{angka(definisi.target)}%</span>
		</p>
	{/if}
</div>
