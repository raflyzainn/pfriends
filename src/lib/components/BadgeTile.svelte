<script>
	/**
	 * BadgeTile — satu keping koleksi lencana.
	 *
	 * Props:
	 * @prop {{code:string,name:string,family?:string,rarity:string,criteria?:string}} badge
	 * @prop {boolean} unlocked  Sudah dimiliki (kontrak 09 §5).
	 * @prop {boolean} owned     Alias `unlocked` (penamaan 08 §5.2).
	 * @prop {'sm'|'md'} size
	 * @prop {string|null} awardedAt  Tanggal perolehan.
	 * @prop {(badge:any)=>void} onclick
	 *
	 * Lencana yang belum diraih TETAP TERLIHAT, hanya diredam. Katalog yang
	 * terlihat adalah pendorong utama rasa ingin melengkapi; menyembunyikannya
	 * menghapus seluruh daya tariknya. Kriteria unlock selalu ikut ditampilkan
	 * sebagai tooltip agar pengguna tahu langkah konkretnya.
	 *
	 * Hanya kelangkaan LEGENDARIS yang berkilau — kelangkaan harus terasa langka.
	 */
	import Icon from './Icon.svelte';
	import { ICONS } from '$lib/data/icons.js';
	import { formatTanggal } from '$lib/utils/format.js';
	import { gayaRarity, kelas } from './_visual.js';

	let {
		badge = { code: '', name: '', rarity: 'UMUM' },
		unlocked = false,
		owned = undefined,
		size = 'md',
		awardedAt = null,
		onclick = undefined
	} = $props();

	const dimiliki = $derived(owned === undefined ? unlocked : owned);
	const rarity = $derived(gayaRarity(badge?.rarity));

	const UKURAN = {
		sm: { wadah: 'p-3', medali: 32, nama: 'text-[11px]' },
		md: { wadah: 'p-4', medali: 40, nama: 'text-xs' }
	};
	const cfg = $derived(UKURAN[size] ?? UKURAN.md);

	const judul = $derived(
		dimiliki
			? `${badge?.name} — ${rarity.label}${awardedAt ? ` · diraih ${formatTanggal(awardedAt, 'pendek')}` : ''}`
			: `${badge?.name} — belum diraih. ${badge?.criteria ?? ''}`.trim()
	);

	const gayaWadah = $derived(
		dimiliki
			? `border-color:color-mix(in srgb, ${rarity.color} 35%, transparent);` +
					(rarity.berkilau
						? `box-shadow: 0 0 0 2px color-mix(in srgb, ${rarity.color} 30%, transparent);`
						: '')
			: ''
	);

	const kelasWadah = $derived(
		kelas(
			'flex aspect-square w-full flex-col items-center justify-center rounded-card border bg-surface text-center transition-all',
			cfg.wadah,
			dimiliki ? 'border-ink-100' : 'border-ink-100 opacity-45 grayscale',
			dimiliki && rarity.berkilau && 'sheen-champion',
			onclick && 'cursor-pointer hover:shadow-card-hover'
		)
	);
</script>

{#snippet isi()}
	<span
		class="inline-flex items-center justify-center"
		style={dimiliki ? `color:${rarity.color};` : 'color:var(--color-ink-300);'}
	>
		<Icon path={ICONS.badge} size={cfg.medali} strokeWidth={1.5} />
	</span>

	<span class={kelas('mt-2 line-clamp-2 font-semibold text-ink-800', cfg.nama)}>
		{badge?.name}
	</span>

	<span class="label-micro mt-1" style={dimiliki ? `color:${rarity.ink};` : ''}>
		{rarity.label}
	</span>

	{#if dimiliki && awardedAt}
		<span class="mt-1 text-[10px] text-ink-500">{formatTanggal(awardedAt, 'ringkas')}</span>
	{/if}
{/snippet}

{#if onclick}
	<button type="button" class={kelasWadah} style={gayaWadah} title={judul} onclick={() => onclick(badge)}>
		{@render isi()}
	</button>
{:else}
	<div class={kelasWadah} style={gayaWadah} title={judul}>
		{@render isi()}
	</div>
{/if}
