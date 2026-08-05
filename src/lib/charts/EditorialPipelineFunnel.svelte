<script>
	/**
	 * EditorialPipelineFunnel (C-19) — dari naskah yang masuk, berapa yang terbit.
	 *
	 * Props:
	 * @prop {{stage:string,count:number,conversionFromPrev:number}[]} data
	 *   Hasil `ContentReviewService.pipeline()`, dialirkan lewat store `editorial`.
	 * @prop {string} height
	 * @prop {boolean} loading
	 *
	 * Komponen ini TIDAK menghitung apa pun. Corong editorial dibaca dari bukti
	 * yang tersimpan pada tiap naskah — bukan dari status terakhirnya — dan
	 * perhitungan itu tinggal di domain. Menghitungnya di sini akan melahirkan
	 * sumber kebenaran kedua atas "naskah mana yang sedang menunggu", tepat cacat
	 * yang membuat satu halaman menampilkan angka berbeda dari halaman lain.
	 *
	 * Label tahap diambil dari `STORY_STATUS_META`, sehingga penamaan tahap di
	 * corong dijamin sama dengan penamaan status di kartu naskah.
	 *
	 * @see docs/12-BUILD-CONTRACT-V2.md — §2.9 `pipeline()`, §3.5 WP-07 butir 3
	 * @see docs/10-REVISION-SPEC.md — §7.2 C-19, §7.5 CH-8
	 */
	import EChart from '$lib/components/EChart.svelte';
	import { STORY_STATUS_META } from '$lib/domain/constants/community.js';
	import { funnelPalette, tip, legend, font, animasi, angka } from './_chartTheme.js';

	let { data = [], height = '320px', loading = false } = $props();

	const adaData = $derived(data.some((tahap) => tahap.count > 0));

	/** Tahap beserta label Indonesia-nya, urut dari yang terlebar. */
	const tahap = $derived(
		data.map((baris) => ({
			...baris,
			label: STORY_STATUS_META[baris.stage]?.label ?? baris.stage
		}))
	);

	const option = $derived.by(() => {
		if (!adaData) return null;
		const terbesar = Math.max(...tahap.map((t) => t.count), 1);

		return {
			...animasi,
			tooltip: {
				...tip,
				trigger: 'item',
				formatter: (p) => {
					const baris = tahap.find((t) => t.label === p.name);
					const konversi =
						baris && baris.conversionFromPrev > 0
							? `<br/>${angka(baris.conversionFromPrev)}% lolos dari tahap sebelumnya`
							: '';
					return `<b>${p.name}</b><br/>${angka(p.value)} naskah${konversi}`;
				}
			},
			legend: { ...legend, show: true, type: 'scroll' },
			series: [
				{
					name: 'Corong editorial',
					type: 'funnel',
					top: 36,
					bottom: 8,
					left: '8%',
					width: '84%',
					min: 0,
					max: terbesar,
					sort: 'none',
					gap: 3,
					label: {
						show: true,
						position: 'inside',
						formatter: (p) => `${p.name} · ${angka(p.value)}`,
						color: '#ffffff',
						fontSize: 11,
						fontWeight: 700,
						...font
					},
					itemStyle: { borderColor: '#ffffff', borderWidth: 2 },
					emphasis: { label: { fontSize: 12 } },
					data: tahap.map((t, i) => ({
						name: t.label,
						value: t.count,
						itemStyle: { color: funnelPalette[i % funnelPalette.length] }
					}))
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
		emptyMessage="Belum ada naskah di alur editorial. Corong muncul setelah awardee pertama menyimpan draf ceritanya."
	/>

	{#if adaData}
		<ul class="mt-2 flex flex-wrap gap-x-4 gap-y-1">
			{#each tahap.slice(1) as t (t.stage)}
				<li class="text-xs text-ink-600">
					<span class="font-semibold text-ink-800">{t.label}</span>
					<span class="numeric">{angka(t.conversionFromPrev)}%</span> dari tahap sebelumnya
				</li>
			{/each}
		</ul>
	{/if}
</div>
