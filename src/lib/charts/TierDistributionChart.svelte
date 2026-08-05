<script>
	/**
	 * TierDistributionChart — sebaran anggota per tier.
	 *
	 * Props:
	 * @prop {{level?:string,label?:string,count:number}[]} data
	 * @prop {string} height
	 * @prop {'bar'|'donut'} variant
	 * @prop {boolean} loading
	 *
	 * Wajib memakai palet beridentitas: batang tier di sini harus berwarna persis
	 * sama dengan chip tier di seluruh aplikasi. Bila berbeda, pembaca dasbor akan
	 * menghabiskan waktu mencocokkan legenda alih-alih membaca sebarannya.
	 *
	 * Chart didampingi ringkasan teks di bawahnya — chart tidak pernah menjadi
	 * satu-satunya sumber informasi.
	 *
	 * Tanpa data, kedua varian `option` bernilai `null` — bukan batang bernilai
	 * nol. Sebaran tier yang seluruhnya nol tidak dapat dibedakan dari sebaran
	 * yang gagal dimuat, padahal keduanya menuntut tindakan berbeda (CH-4).
	 */
	import EChart from '$lib/components/EChart.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import { ICONS } from '$lib/data/icons.js';
	import { TIER_TABLE } from '$lib/domain/constants/tier-table.js';
	import { tip, grid, valueAxis, categoryAxis, animasi, angka, palette } from './_chartTheme.js';

	let { data = [], height = '280px', variant = 'bar', loading = false } = $props();

	/** @type {Map<string, {label:string,color:string}>} */
	const META = new Map(TIER_TABLE.map((t) => [t.level, { label: t.label, color: t.color }]));

	const baris = $derived(
		data.map((d) => {
			const meta = d.level ? META.get(d.level) : null;
			return {
				label: meta?.label ?? d.label ?? d.level ?? '—',
				color: meta?.color ?? palette.slate,
				count: d.count ?? 0
			};
		})
	);

	const total = $derived(baris.reduce((jumlah, b) => jumlah + b.count, 0));
	const adaData = $derived(total > 0);

	const optionBar = $derived.by(() => (!adaData ? null : {
		...animasi,
		tooltip: {
			...tip,
			trigger: 'axis',
			axisPointer: { type: 'shadow' },
			valueFormatter: (nilai) => `${angka(nilai)} anggota`
		},
		grid: { ...grid, top: 16 },
		xAxis: { ...categoryAxis, data: baris.map((b) => b.label) },
		yAxis: { ...valueAxis },
		series: [
			{
				type: 'bar',
				data: baris.map((b) => ({ value: b.count, itemStyle: { color: b.color } })),
				barMaxWidth: 28,
				itemStyle: { borderRadius: [6, 6, 0, 0] }
			}
		]
	}));

	const optionDonut = $derived.by(() => (!adaData ? null : {
		...animasi,
		tooltip: {
			...tip,
			trigger: 'item',
			formatter: (p) => `${p.name}<br/><b>${angka(p.value)}</b> anggota · ${p.percent}%`
		},
		series: [
			{
				type: 'pie',
				radius: ['58%', '80%'],
				padAngle: 2,
				itemStyle: { borderRadius: 4 },
				label: {
					show: true,
					formatter: '{b}\n{c}',
					color: '#475569',
					fontSize: 11,
					lineHeight: 15
				},
				labelLine: { length: 10, length2: 10, lineStyle: { color: '#cbd5e1' } },
				data: baris.map((b) => ({
					name: b.label,
					value: b.count,
					itemStyle: { color: b.color }
				}))
			}
		]
	}));
</script>

{#if !adaData && !loading}
	<EmptyState
		title="Belum ada anggota bertier"
		message="Sebaran tier muncul setelah anggota pertama mengumpulkan poin kontribusi."
		iconPath={ICONS.trophy}
		size="sm"
	/>
{:else}
	<EChart
		option={variant === 'donut' ? optionDonut : optionBar}
		height={variant === 'donut' ? '260px' : height}
		{loading}
		emptyMessage="Belum ada anggota bertier pada rentang ini."
	/>

	{#if adaData}
		<ul class="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
			{#each baris as b (b.label)}
				<li class="inline-flex items-center gap-1.5 text-xs text-ink-600">
					<span
						class="h-2 w-2 shrink-0 rounded-full"
						style="background:{b.color};"
						aria-hidden="true"
					></span>
					{b.label}
					<span class="numeric font-semibold text-ink-800">{angka(b.count)}</span>
				</li>
			{/each}
		</ul>
	{/if}
{/if}
