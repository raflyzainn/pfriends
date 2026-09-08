<script>
	/**
	 * VerifKpiAwardeeBar: capaian KPI awardee terhadap satu ambang bersama.
	 *
	 * Props:
	 * @prop {{label:string, capaian:number}[]} data  Capaian dalam persen.
	 * @prop {number} target   Ambang capaian, dalam persen yang sama.
	 * @prop {string} height
	 * @prop {boolean} loading
	 *
	 * Tiga keputusan yang tidak terbaca dari kode:
	 *
	 * 1. **Batang mendatar, bukan tegak.** Label KPI adalah frasa, dan frasa pada
	 *    sumbu tegak dimiringkan 45° sampai tidak lagi terbaca di lebar ponsel.
	 * 2. **Warna batang menyatakan posisi terhadap target, bukan identitas KPI.**
	 *    Pertanyaan yang dijawab chart ini biner: sudah lewat ambang atau belum :
	 *    sehingga warna kategorikal justru mengundang pembaca mencari makna pada
	 *    perbedaan rona yang tidak berarti apa-apa. Angka persennya tetap dicetak
	 *    di ujung batang, sehingga warna tidak pernah menjadi pembawa tunggal.
	 * 3. **Garis target dirakit `garisTarget()`,** bukan ditulis sebagai `markLine`
	 *    lepas: labelnya harus berada di DALAM grid, dan `rotate: 0` wajib eksplisit
	 *    supaya tulisan pada garis tegak tidak ikut berdiri.
	 */
	import EChart from '$lib/components/EChart.svelte';
	import { animasi, categoryAxis, garisTarget, grid, palette, tip, valueAxis } from './_chartTheme.js';

	let { data = [], target = 80, height = '300px', loading = false } = $props();

	/** Urut menaik supaya yang paling tertinggal berada di bawah: tempat mata berhenti. */
	const baris = $derived([...data].sort((a, b) => a.capaian - b.capaian));

	const adaData = $derived(baris.some((b) => b.capaian > 0));

	const option = $derived.by(() =>
		!adaData
			? null
			: {
					...animasi,
					tooltip: {
						...tip,
						trigger: 'axis',
						axisPointer: { type: 'shadow' },
						valueFormatter: (n) => `${n}% dari target`
					},
					grid: { ...grid, top: 16, right: 40 },
					xAxis: { ...valueAxis, max: 110, axisLabel: { color: '#64748b', fontSize: 10, formatter: '{value}%' } },
					yAxis: { ...categoryAxis, data: baris.map((b) => b.label) },
					series: [
						{
							type: 'bar',
							data: baris.map((b) => ({
								value: b.capaian,
								itemStyle: { color: b.capaian >= target ? palette.blue : palette.amber }
							})),
							barMaxWidth: 18,
							itemStyle: { borderRadius: [0, 6, 6, 0] },
							label: {
								show: true,
								position: 'right',
								formatter: '{c}%',
								color: '#334155',
								fontSize: 11,
								fontWeight: 600
							},
							...garisTarget(target, 'x', `Ambang ${target}%`, 'insideEndTop')
						}
					]
				}
	);
</script>

<EChart {option} {height} {loading} emptyMessage="Capaian KPI awardee belum terhitung." />
