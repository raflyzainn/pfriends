<script>
	/**
	 * CommunityPieChart — komposisi anggota antara dua komunitas.
	 *
	 * Props:
	 * @prop {{id?:string,label?:string,value:number,color?:string}[]} data
	 * @prop {string} height
	 * @prop {string} centerLabel  Teks kecil di lubang donat.
	 * @prop {boolean} loading
	 *
	 * Selalu donat, tidak pernah pie penuh: lubang di tengah memberi tempat untuk
	 * total, dan total itulah angka yang paling sering dicari pembaca.
	 * Warna diambil dari konstanta komunitas agar sama dengan penanda komunitas di
	 * kartu anggota dan direktori.
	 *
	 * Tanpa data, `option` bernilai `null` — donat berjumlah nol hanya menghasilkan
	 * cincin kosong yang tidak mengatakan apa pun (CH-4).
	 */
	import EChart from '$lib/components/EChart.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import { ICONS } from '$lib/data/icons.js';
	import { COMMUNITIES } from '$lib/domain/constants/community.js';
	import { tip, legend, animasi, angka, palette } from './_chartTheme.js';

	let { data = [], height = '260px', centerLabel = 'Anggota', loading = false } = $props();

	/** Warna komunitas dipetakan dari token domain ke heksadesimal chart. */
	const WARNA_KOMUNITAS = {
		SOBI: palette.green,
		WOMENPRENEUR: palette.red
	};

	/** @type {Map<string, string>} */
	const NAMA = new Map(COMMUNITIES.map((c) => [c.id, c.akronim]));

	const irisan = $derived(
		data.map((d, index) => ({
			name: d.label ?? (d.id ? (NAMA.get(d.id) ?? d.id) : `Kelompok ${index + 1}`),
			value: d.value ?? 0,
			color: d.color ?? (d.id ? WARNA_KOMUNITAS[d.id] : undefined) ?? palette.slate
		}))
	);

	const total = $derived(irisan.reduce((jumlah, i) => jumlah + i.value, 0));
	const adaData = $derived(total > 0);

	const option = $derived.by(() => (!adaData ? null : {
		...animasi,
		tooltip: {
			...tip,
			trigger: 'item',
			formatter: (p) => `${p.name}<br/><b>${angka(p.value)}</b> anggota · ${p.percent}%`
		},
		legend: { ...legend, show: true, bottom: 0, top: undefined },
		series: [
			{
				type: 'pie',
				radius: ['58%', '80%'],
				center: ['50%', '46%'],
				padAngle: 2,
				itemStyle: { borderRadius: 4 },
				label: {
					show: true,
					formatter: '{d}%',
					color: '#475569',
					fontSize: 11,
					fontWeight: 600
				},
				labelLine: { length: 8, length2: 10, lineStyle: { color: '#cbd5e1' } },
				data: irisan.map((i) => ({ name: i.name, value: i.value, itemStyle: { color: i.color } }))
			}
		]
	}));
</script>

{#if !adaData && !loading}
	<EmptyState
		title="Belum ada anggota terdata"
		message="Komposisi komunitas muncul setelah pendaftaran pertama terverifikasi."
		iconPath={ICONS.users}
		size="sm"
	/>
{:else}
	<div class="relative">
		<EChart
			{option}
			{height}
			{loading}
			emptyMessage="Belum ada anggota terdata pada komunitas mana pun."
		/>

		{#if adaData && !loading}
			<div
				class="pointer-events-none absolute inset-x-0 top-[46%] -translate-y-1/2 text-center"
				aria-hidden="true"
			>
				<p class="numeric text-2xl text-ink-900">{angka(total)}</p>
				<p class="label-micro mt-0.5">{centerLabel}</p>
			</div>
		{/if}
	</div>
{/if}
