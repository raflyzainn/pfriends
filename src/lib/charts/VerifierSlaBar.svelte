<script>
	/**
	 * VerifierSlaBar (C-20): berapa banyak antrean yang masih di dalam SLA.
	 *
	 * Props:
	 * @prop {{queue:string,withinSla:number,breachedSla:number,medianDays:number}[]} data
	 *   Hasil `ContentReviewService.slaCompliance()`, dialirkan lewat store.
	 * @prop {string} height
	 * @prop {boolean} loading
	 *
	 * Batas SLA setiap antrean dibaca dari `SLA_HARI_KERJA`, tidak pernah ditulis
	 * di sini. Label yang menyebut "2 hari kerja" sementara kebijakannya sudah
	 * berubah menjadi tiga adalah cara paling rapi untuk membuat papan SLA
	 * berbohong tanpa satu pun angka yang salah hitung.
	 *
	 * SATU antrean yang sedang kosong tetap digambar sebagai baris bernilai nol :
	 * bukan dihilangkan. Baris yang menghilang saat antreannya kosong membuat
	 * chart berubah bentuk dan terbaca sebagai data yang gagal dimuat.
	 *
	 * SELURUH antrean kosong adalah perkara lain: `slaCompliance()` selalu
	 * mengembalikan satu baris per antrean yang dikenal `SLA_HARI_KERJA`, jadi
	 * `data.length` mencerminkan katalog antrean, BUKAN keberadaan keputusan.
	 * Menguji panjang larik saja membuat papan ini menggambar empat batang nol
	 * lengkap dengan kalimat "seluruh antrean masih di dalam SLA" pada basis data
	 * yang belum memuat satu pun keputusan: persis grafik nol yang dilarang CH-4.
	 * Karena itu penjagaannya adalah jumlah keputusan, bukan jumlah baris.
	 *
	 * @see docs/12-BUILD-CONTRACT-V2.md: §2.9 `slaCompliance()`, §3.5 WP-07 butir 3
	 * @see docs/10-REVISION-SPEC.md: §5.6 SLA & eskalasi, §7.2 C-20
	 */
	import EChart from '$lib/components/EChart.svelte';
	import { SLA_HARI_KERJA } from '$lib/domain/constants/content-workflow.js';
	import { slaPalette, tip, legend, grid, valueAxis, categoryAxis, animasi, angka } from './_chartTheme.js';

	let { data = [], height = '280px', loading = false } = $props();

	/**
	 * Nama antrean dalam Bahasa Indonesia. Kunci mengikuti `SLA_HARI_KERJA`;
	 * kunci yang belum punya nama jatuh ke kuncinya sendiri, bukan ke string kosong.
	 * @type {Readonly<Record<string, string>>}
	 */
	const NAMA_ANTREAN = Object.freeze({
		STORY_DIAJUKAN: 'Naskah diajukan',
		STORY_REVIEW: 'Naskah sedang ditinjau',
		STORY_DISETUJUI: 'Naskah menunggu terbit',
		EVENT_DIUSULKAN: 'Usulan kegiatan'
	});

	const baris = $derived(
		data.map((antrean) => ({
			...antrean,
			label: NAMA_ANTREAN[antrean.queue] ?? antrean.queue,
			limit: SLA_HARI_KERJA[antrean.queue] ?? 0
		}))
	);

	/** Bar horizontal ECharts menggambar dari bawah; urutan dibalik agar baris pertama di atas. */
	const urut = $derived([...baris].reverse());

	/** Cacah seluruh keputusan yang tercatat di semua antrean. */
	const totalButir = $derived(
		baris.reduce((jumlah, b) => jumlah + b.withinSla + b.breachedSla, 0)
	);

	const adaData = $derived(data.length > 0 && totalButir > 0);

	const totalTertunggak = $derived(baris.reduce((jumlah, b) => jumlah + b.breachedSla, 0));

	const option = $derived.by(() => {
		if (!adaData) return null;

		return {
			...animasi,
			tooltip: {
				...tip,
				trigger: 'axis',
				axisPointer: { type: 'shadow' },
				formatter: (deret) => {
					const nama = deret[0]?.axisValue ?? '';
					const antrean = urut.find((b) => b.label === nama);
					if (!antrean) return nama;
					return [
						`<b>${nama}</b>`,
						`Batas SLA ${angka(antrean.limit)} hari kerja`,
						`Dalam SLA ${angka(antrean.withinSla)} butir`,
						`Lewat SLA ${angka(antrean.breachedSla)} butir`,
						`Usia median ${angka(antrean.medianDays)} hari kerja`
					].join('<br/>');
				}
			},
			legend: { ...legend, show: true },
			grid: { ...grid, top: 32 },
			xAxis: { ...valueAxis, minInterval: 1 },
			yAxis: {
				...categoryAxis,
				axisLine: { show: false },
				data: urut.map((b) => `${b.label} (${b.limit} hk)`)
			},
			series: [
				{
					name: 'Dalam SLA',
					type: 'bar',
					stack: 'sla',
					barMaxWidth: 24,
					itemStyle: { color: slaPalette.dalam, borderRadius: [6, 0, 0, 6] },
					label: {
						show: true,
						position: 'inside',
						formatter: (p) => (p.value > 0 ? angka(p.value) : ''),
						color: '#ffffff',
						fontSize: 10,
						fontWeight: 700
					},
					data: urut.map((b) => b.withinSla)
				},
				{
					name: 'Lewat SLA',
					type: 'bar',
					stack: 'sla',
					barMaxWidth: 24,
					itemStyle: { color: slaPalette.lewat, borderRadius: [0, 6, 6, 0] },
					label: {
						show: true,
						position: 'inside',
						formatter: (p) => (p.value > 0 ? angka(p.value) : ''),
						color: '#ffffff',
						fontSize: 10,
						fontWeight: 700
					},
					data: urut.map((b) => b.breachedSla)
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
		emptyMessage="Papan SLA belum dapat disusun. Angka muncul setelah antrean tinjauan terisi."
	/>

	{#if adaData}
		<p class="mt-2 text-xs leading-relaxed text-ink-600">
			{#if totalTertunggak > 0}
				<span class="numeric font-bold text-pertamina-red-ink">{angka(totalTertunggak)}</span> butir
				sudah melewati batas SLA-nya. Angka dalam kurung pada sumbu adalah batas SLA antrean
				bersangkutan dalam hari kerja.
			{:else}
				Seluruh antrean masih berada di dalam batas SLA-nya. Angka dalam kurung pada sumbu adalah
				batas SLA antrean bersangkutan dalam hari kerja.
			{/if}
		</p>
	{/if}
</div>
