<script>
	/**
	 * ReachEstimateBand (C-18): pita estimasi jangkauan organik per bulan.
	 *
	 * Props:
	 * @prop {{monthKey:string,label:string,min:number,max:number,mid:number}[]} data
	 * @prop {string} height
	 * @prop {boolean} loading
	 *
	 * Ini satu-satunya chart dasbor yang TIDAK menggambarkan pengukuran. Angkanya
	 * hasil perkalian jumlah pengamplifikasi dengan rentang ukuran jaringan sosial
	 * Hal 6: bukan jumlah orang yang terbukti melihat konten. Karena itu ia
	 * memakai dua penanda sekaligus, dan keduanya wajib:
	 *
	 *   1. Garis titik tengah PUTUS-PUTUS (CH-3).
	 *   2. Lencana "Estimasi" tercetak di sisi chart.
	 *
	 * Satu penanda saja tidak cukup: garis putus-putus hilang pada cetakan hitam
	 * putih beresolusi rendah, dan lencana sendirian tidak menjelaskan garis mana
	 * yang diestimasi bila kelak chart ini memuat deret terukur.
	 *
	 * Pita dibentuk dari dua seri bertumpuk: batas bawah transparan, lalu
	 * selisihnya berarea. Menggambar dua garis lalu "mengisi di antaranya" tidak
	 * mungkin pada ECharts tanpa trik `stack` ini.
	 *
	 * @see docs/10-REVISION-SPEC.md: §7.2 C-18, §7.5 CH-3
	 * @see docs/00-SOURCE-BRIEF.md: Hal 6 Dampak Inisiatif
	 */
	import EChart from '$lib/components/EChart.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { ICONS } from '$lib/data/icons.js';
	import {
		tip,
		legend,
		grid,
		valueAxis,
		categoryAxis,
		animasi,
		angka,
		palette,
		garisEstimasi
	} from './_chartTheme.js';

	let { data = [], height = '320px', loading = false } = $props();

	const adaData = $derived(data.some((b) => b.max > 0));

	const option = $derived.by(() => {
		if (!adaData) return null;

		return {
			...animasi,
			tooltip: {
				...tip,
				trigger: 'axis',
				axisPointer: { type: 'line', lineStyle: { color: '#cbd5e1' } },
				formatter: (deret) => {
					const nama = deret[0]?.axisValue ?? '';
					const bulan = data.find((b) => b.label === nama);
					if (!bulan) return nama;
					return `${nama}<br/>Estimasi <b>${angka(bulan.min)}</b> – <b>${angka(bulan.max)}</b> orang<br/>Titik tengah ${angka(bulan.mid)} orang`;
				}
			},
			legend: {
				...legend,
				show: true,
				data: ['Rentang estimasi', 'Titik tengah estimasi']
			},
			grid: { ...grid, top: 40 },
			xAxis: { ...categoryAxis, boundaryGap: false, data: data.map((b) => b.label) },
			yAxis: { ...valueAxis },
			series: [
				{
					// Batas bawah pita: tidak terlihat, hanya menggeser tumpukan.
					name: 'Batas bawah',
					type: 'line',
					stack: 'pita',
					silent: true,
					symbol: 'none',
					lineStyle: { opacity: 0 },
					areaStyle: { opacity: 0 },
					tooltip: { show: false },
					data: data.map((b) => b.min)
				},
				{
					name: 'Rentang estimasi',
					type: 'line',
					stack: 'pita',
					symbol: 'none',
					lineStyle: { opacity: 0 },
					areaStyle: { color: `${palette.amber}33` },
					tooltip: { show: false },
					data: data.map((b) => Math.max(0, b.max - b.min))
				},
				{
					name: 'Titik tengah estimasi',
					type: 'line',
					smooth: 0.3,
					symbol: 'circle',
					symbolSize: 6,
					lineStyle: { color: palette.amber, ...garisEstimasi },
					itemStyle: { color: palette.amber, borderColor: '#ffffff', borderWidth: 2 },
					data: data.map((b) => b.mid)
				}
			]
		};
	});
</script>

<div>
	<div class="mb-2 flex justify-end">
		<span
			class="inline-flex items-center gap-1.5 rounded-chip bg-warning-tint px-2.5 py-1 text-xs font-semibold text-warning"
			title="Angka pada chart ini adalah hasil pemodelan, bukan jumlah orang yang terbukti melihat konten."
		>
			<Icon path={ICONS.info} size={14} />
			Estimasi
		</span>
	</div>

	<EChart
		{option}
		{height}
		{loading}
		emptyMessage="Estimasi jangkauan belum dapat dihitung. Pita muncul setelah minimal satu anggota aktif tercatat mengamplifikasi konten."
	/>

	<p class="mt-2 text-xs leading-relaxed text-ink-600">
		Pita menunjukkan rentang jangkauan yang masuk akal setelah didiskon tumpang tindih audiens :
		bukan jumlah orang yang terbukti melihat konten. Lebar pita adalah ketidakpastiannya, dan
		lebarnya memang disengaja.
	</p>
</div>
