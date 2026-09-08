<script>
	/**
	 * EsgEvidenceGateBar (C-17): di gerbang mana bukti ESG paling banyak gugur.
	 *
	 * Props:
	 * @prop {{key:string,label:string,count:number}[]} data Tahap kumulatif dari store.
	 * @prop {string} height
	 * @prop {boolean} loading
	 *
	 * Batang menurun monoton karena tahapnya kumulatif: setiap batang menghitung
	 * naskah yang lolos gerbang itu DAN seluruh gerbang sebelumnya. Susut terbesar
	 * antardua batang adalah jawabannya: di situlah bukti paling banyak gugur, dan
	 * di situ pula permintaan kepada penulis paling berdampak.
	 *
	 * Selisih antarbatang ikut ditulis sebagai angka, bukan hanya disiratkan dari
	 * panjangnya. Membaca susutan dari perbedaan panjang batang adalah pekerjaan
	 * yang tidak perlu dibebankan kepada pembaca laporan.
	 *
	 * @see docs/10-REVISION-SPEC.md: §7.2 C-17, §7.5 CH-6
	 * @see docs/00-SOURCE-BRIEF.md: Hal 12 empat gerbang bukti ESG
	 */
	import EChart from '$lib/components/EChart.svelte';
	import { funnelPalette, tip, grid, valueAxis, categoryAxis, animasi, angka } from './_chartTheme.js';

	let { data = [], height = '280px', loading = false } = $props();

	/** Bar horizontal ECharts menggambar dari bawah; tahap dibalik agar yang pertama di atas. */
	const urut = $derived([...data].reverse());

	const adaData = $derived(data.some((t) => t.count > 0));

	/**
	 * Susutan antar tahap berurutan: dipakai ringkasan teks di bawah chart.
	 * @type {{label:string, gugur:number}[]}
	 */
	const susutan = $derived(
		data.slice(1).map((tahap, i) => ({
			label: tahap.label,
			gugur: Math.max(0, (data[i]?.count ?? 0) - tahap.count)
		}))
	);

	const terberat = $derived(
		susutan.reduce((puncak, baris) => (baris.gugur > (puncak?.gugur ?? -1) ? baris : puncak), null)
	);

	const option = $derived.by(() => {
		if (!adaData) return null;

		return {
			...animasi,
			tooltip: {
				...tip,
				trigger: 'axis',
				axisPointer: { type: 'shadow' },
				valueFormatter: (nilai) => `${angka(nilai)} naskah`
			},
			grid: { ...grid, top: 16 },
			xAxis: { ...valueAxis, minInterval: 1 },
			yAxis: { ...categoryAxis, axisLine: { show: false }, data: urut.map((t) => t.label) },
			series: [
				{
					name: 'Naskah lolos gerbang',
					type: 'bar',
					barMaxWidth: 26,
					data: urut.map((tahap, i) => ({
						value: tahap.count,
						itemStyle: {
							color: funnelPalette[(urut.length - 1 - i) % funnelPalette.length],
							borderRadius: [0, 6, 6, 0]
						}
					})),
					label: {
						show: true,
						position: 'right',
						formatter: (p) => angka(p.value),
						color: '#475569',
						fontSize: 10,
						fontWeight: 700
					}
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
		emptyMessage="Belum ada naskah yang dapat diuji terhadap gerbang bukti ESG. Corong muncul setelah cerita pertama tersimpan."
	/>

	{#if adaData && terberat && terberat.gugur > 0}
		<p class="mt-2 text-xs leading-relaxed text-ink-600">
			Susut terbesar terjadi pada gerbang
			<span class="font-semibold text-ink-800">{terberat.label}</span> :
			<span class="numeric font-semibold text-ink-800">{angka(terberat.gugur)}</span> naskah gugur di
			sana. Itulah permintaan yang paling berdampak bila diajukan kepada penulis.
		</p>
	{/if}
</div>
