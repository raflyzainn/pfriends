<script>
	/**
	 * VerifSebaranChapter: dari chapter dan komunitas mana kontribusi datang.
	 *
	 * Props:
	 * @prop {{label:string, value:number}[]} data
	 * @prop {string} height
	 * @prop {boolean} loading
	 *
	 * Tiga keputusan yang tidak terbaca dari kode:
	 *
	 * 1. **Donat, bukan pai penuh.** Lubang tengahnya dipakai memuat total, sehingga
	 *    pembaca tidak perlu menjumlahkan potongan sendiri untuk tahu "dari berapa".
	 * 2. **Label potongan dimatikan; keterangannya hidup sebagai daftar teks di
	 *    bawah chart.** Enam label yang menggantung di tepi donat saling bertindih
	 *    pada lebar ponsel, dan yang tertutup justru potongan terkecil: persis
	 *    chapter yang paling perlu diperhatikan.
	 * 3. **Palet kategorikal `series` dipakai apa adanya, tanpa heksadesimal baru.**
	 *    Urutannya tetap, sehingga warna sebuah chapter tidak berpindah ketika
	 *    angkanya berubah.
	 */
	import EChart from '$lib/components/EChart.svelte';
	import { animasi, angka, series, tip } from './_chartTheme.js';

	let { data = [], height = '260px', loading = false } = $props();

	const total = $derived(data.reduce((jumlah, d) => jumlah + (d.value ?? 0), 0));
	const adaData = $derived(total > 0);

	const option = $derived.by(() =>
		!adaData
			? null
			: {
					...animasi,
					color: series,
					tooltip: {
						...tip,
						trigger: 'item',
						formatter: (p) => `${p.name}<br/><b>${angka(p.value)}</b> kontribusi · ${p.percent}%`
					},
					series: [
						{
							type: 'pie',
							radius: ['62%', '86%'],
							center: ['50%', '50%'],
							padAngle: 2,
							itemStyle: { borderRadius: 4 },
							label: { show: false },
							labelLine: { show: false },
							data: data.map((d) => ({ name: d.label, value: d.value }))
						}
					]
				}
	);
</script>

<EChart {option} {height} {loading} emptyMessage="Belum ada kontribusi yang dapat disebar per chapter." />

{#if adaData}
	<p class="mt-2 text-center text-xs text-ink-600">
		Total <span class="numeric font-bold text-ink-900">{angka(total)}</span> kontribusi tercatat
	</p>

	<ul class="mt-3 grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
		{#each data as d, indeks (d.label)}
			<li class="flex items-center gap-1.5 text-xs text-ink-600">
				<span
					class="h-2 w-2 shrink-0 rounded-full"
					style="background:{series[indeks % series.length]};"
					aria-hidden="true"
				></span>
				<span class="min-w-0 flex-1 truncate">{d.label}</span>
				<span class="numeric font-semibold text-ink-800">{angka(d.value)}</span>
			</li>
		{/each}
	</ul>
{/if}
