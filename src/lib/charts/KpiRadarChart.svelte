<script>
	/**
	 * KpiRadarChart (C-05): bentuk capaian program pada kelima Key Objective.
	 *
	 * Props:
	 * @prop {import('$lib/domain/services/KpiCalculator.js').KpiSnapshotRow[]} kpi
	 * @prop {string} height
	 * @prop {boolean} loading
	 *
	 * Sumbunya adalah PERSEN CAPAIAN, bukan nilai mentah. Kelima KPI Hal 6
	 * bersatuan berbeda: persen, konten per bulan, kali per bulan, kegiatan :
	 * dan meletakkannya pada satu radar tanpa dinormalkan akan membuat metrik
	 * bersatuan besar mendominasi bentuknya tanpa arti apa pun.
	 *
	 * Radar dipakai justru karena pertanyaannya soal BENTUK: sisi mana yang penyok.
	 * Untuk membandingkan besaran antar-KPI, kartu KPI di atasnya lebih jujur: dan
	 * itulah sebabnya keduanya ditampilkan berdampingan, bukan salah satu saja.
	 *
	 * @see docs/10-REVISION-SPEC.md: §7.2 C-05
	 */
	import EChart from '$lib/components/EChart.svelte';
	import { tip, legend, font, animasi, angka, palette } from './_chartTheme.js';

	let { kpi = [], height = '320px', loading = false } = $props();

	/** Batas sumbu radar: capaian dibaca sebagai persen terhadap target. */
	const MAKS_CAPAIAN = 100;

	/**
	 * `kpi.length` mencerminkan KATALOG Key Objective: lima baris selalu ada,
	 * bahkan pada basis data tanpa satu pun aktivitas. Menguji panjang larik saja
	 * membuat radar ini menggambar segi lima acuan dengan capaian yang menciut ke
	 * titik pusat, yaitu grafik nol yang dilarang CH-4. Penjagaannya harus pada
	 * ada-tidaknya capaian yang terukur.
	 */
	const adaData = $derived(kpi.length > 0 && kpi.some((baris) => baris.percent > 0));

	const option = $derived.by(() => {
		if (!adaData) return null;

		return {
			...animasi,
			tooltip: {
				...tip,
				trigger: 'item',
				formatter: (p) => {
					const baris = p.value
						.map((nilai, i) => `${kpi[i]?.shortLabel ?? ''} ${angka(nilai)}%`)
						.join('<br/>');
					return `<b>${p.name}</b><br/>${baris}`;
				}
			},
			legend: { ...legend, show: true },
			radar: {
				indicator: kpi.map((baris) => ({ name: baris.shortLabel, max: MAKS_CAPAIAN })),
				radius: '64%',
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
					data: [
						{
							name: 'Target program',
							value: kpi.map(() => MAKS_CAPAIAN),
							lineStyle: { color: palette.slate, width: 1.5, type: 'dashed' },
							itemStyle: { color: palette.slate },
							areaStyle: { color: 'transparent' }
						},
						{
							name: 'Capaian aktual',
							// Capaian dibatasi pada sumbu agar bentuk radar tetap terbaca;
							// angka sebenarnya tetap muncul utuh pada tooltip.
							value: kpi.map((baris) => Math.min(MAKS_CAPAIAN, baris.percent)),
							lineStyle: { color: palette.red, width: 2.5 },
							itemStyle: { color: palette.red },
							areaStyle: { color: `${palette.red}26` }
						}
					]
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
		emptyMessage="Potret KPI belum tersedia. Bentuk capaian muncul setelah kelima Key Objective dapat dihitung dari data komunitas."
	/>

	{#if adaData}
		<ul class="mt-2 flex flex-wrap gap-x-4 gap-y-1">
			{#each kpi as baris (baris.id)}
				<li class="text-xs text-ink-600">
					<span class="font-semibold text-ink-800">{baris.shortLabel}</span>
					<span class="numeric">{angka(baris.percent)}%</span>
				</li>
			{/each}
		</ul>
	{/if}
</div>
