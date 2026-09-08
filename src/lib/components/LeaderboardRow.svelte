<script>
	/**
	 * LeaderboardRow: satu baris papan peringkat.
	 *
	 * Props:
	 * @prop {number} rank
	 * @prop {{id:string,name:string,avatar?:string,community?:string,chapter?:string,tier?:string}} awardee
	 * @prop {number} points
	 * @prop {boolean} highlight       Menyorot baris pengguna (kontrak 09 §5).
	 * @prop {boolean} isCurrentUser   Alias `highlight` (penamaan 08 §5.2).
	 * @prop {number|null} delta       Perubahan peringkat sejak periode lalu.
	 * @prop {'compact'|'full'} variant
	 * @prop {string} href
	 *
	 * Penurunan peringkat TIDAK diwarnai merah. Turun peringkat bukan kesalahan,
	 * dan mewarnainya merah mengubah papan peringkat dari pendorong menjadi
	 * sumber rasa malu. Panah turun cukup memakai warna netral.
	 */
	import Avatar from './Avatar.svelte';
	import TierBadge from './TierBadge.svelte';
	import PointsChip from './PointsChip.svelte';
	import Icon from './Icon.svelte';
	import { ICONS } from '$lib/data/icons.js';
	import { formatAngka } from '$lib/utils/format.js';
	import { gayaKomunitas, kelas } from './_visual.js';

	let {
		rank = 0,
		awardee = { id: '', name: '' },
		points = 0,
		highlight = false,
		isCurrentUser = undefined,
		delta = null,
		variant = 'full',
		href = ''
	} = $props();

	const disorot = $derived(isCurrentUser === undefined ? highlight : isCurrentUser);
	const komunitas = $derived(gayaKomunitas(awardee?.community));

	/** Podium tiga besar memakai lencana bundar; sisanya angka polos. */
	const PODIUM = {
		1: 'var(--color-rarity-epik)',
		2: 'var(--color-rarity-langka)',
		3: 'var(--color-rarity-umum)'
	};
	const warnaPodium = $derived(PODIUM[rank] ?? '');
</script>

<svelte:element
	this={href ? 'a' : 'div'}
	href={href || undefined}
	class={kelas(
		'flex items-center gap-3 border-b border-ink-100 px-3 py-3 transition-colors',
		disorot ? 'border-l-2 border-l-pertamina-blue bg-pertamina-navy-tint' : 'hover:bg-ink-50',
		href && 'cursor-pointer'
	)}
	aria-current={disorot ? 'true' : undefined}
>
	<span class="w-8 shrink-0 text-right">
		{#if warnaPodium}
			<span
				class="numeric inline-flex h-7 w-7 items-center justify-center rounded-full text-xs text-ink-900"
				style="background:{warnaPodium};"
				title="Peringkat {rank}"
			>
				{rank}
			</span>
		{:else}
			<span class="numeric text-sm text-ink-500">{rank}</span>
		{/if}
	</span>

	<Avatar
		name={awardee?.name}
		src={awardee?.avatar}
		size="sm"
		tier={awardee?.tier}
		showRing={disorot}
	/>

	<span class="min-w-0 flex-1">
		<span class="block truncate text-sm font-semibold text-ink-800">
			{awardee?.name}
			{#if disorot}<span class="ml-1 text-xs font-medium text-pertamina-blue">(Anda)</span>{/if}
		</span>
		{#if variant === 'full'}
			<span class="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
				{#if komunitas}
					<span class="text-xs" style="color:{komunitas.ink};">{komunitas.akronim}</span>
				{/if}
				{#if awardee?.chapter}
					<span class="text-xs text-ink-500">· {awardee.chapter}</span>
				{/if}
				{#if awardee?.tier}
					<TierBadge tier={awardee.tier} size="sm" variant="minimal" />
				{/if}
			</span>
		{/if}
	</span>

	{#if delta !== null && delta !== undefined && delta !== 0}
		<span
			class={kelas('inline-flex items-center gap-0.5 text-xs', delta > 0 ? 'text-success' : 'text-ink-500')}
			title="{delta > 0 ? 'Naik' : 'Turun'} {formatAngka(Math.abs(delta))} peringkat"
		>
			<Icon path={delta > 0 ? ICONS.arrowUp : ICONS.arrowDown} size={14} />
			<span class="numeric">{formatAngka(Math.abs(delta))}</span>
		</span>
	{/if}

	<PointsChip {points} currency="PK" size="sm" showLabel={variant === 'full'} />
</svelte:element>
