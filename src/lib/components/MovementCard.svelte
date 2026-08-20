<script>
	/**
	 * MovementCard: kartu gerakan bersama.
	 *
	 * Props:
	 * @prop {{id:string,slug?:string,title:string,description?:string,pillar?:'E'|'S'|'G',
	 *         sdgTags?:string[],targetParticipants?:number,joined?:number,
	 *         locations?:number,deadline?:string}} movement
	 * @prop {string} href
	 * @prop {(movement:any)=>void} onJoin
	 *
	 * Bahasa kartu ini sengaja kolektif: "248 dari 500 orang bergerak", bukan
	 * "Anda peserta ke-248". Gerakan bekerja karena orang merasa ikut serta dalam
	 * sesuatu yang lebih besar, dan angka individu justru mengecilkannya.
	 */
	import Button from './Button.svelte';
	import StatusBadge from './StatusBadge.svelte';
	import ProgressBar from './ProgressBar.svelte';
	import Icon from './Icon.svelte';
	import { ICONS } from '$lib/data/icons.js';
	import { formatAngka, formatTanggal } from '$lib/utils/format.js';
	import { gayaPilar, kelas } from './_visual.js';

	let { movement = { id: '', title: '' }, href = '', onJoin = undefined } = $props();

	const pilar = $derived(gayaPilar(movement?.pillar));

	const IKON_PILAR = { E: ICONS.leaf, S: ICONS.heart, G: ICONS.shield };
	const ikonPilar = $derived(IKON_PILAR[movement?.pillar] ?? ICONS.flag);

	const target = $derived(movement?.targetParticipants ?? 0);
	const bergabung = $derived(movement?.joined ?? 0);
	const tautan = $derived(href || (movement?.slug ? `/gerakan/${movement.slug}` : ''));
</script>

<div
	class="rounded-card border border-ink-100 bg-surface p-5 shadow-card transition-all hover:border-ink-200 hover:shadow-card-hover"
	style={pilar ? `border-left:2px solid ${pilar.color};` : ''}
>
	<div class="flex items-start gap-3">
		<span
			class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
			style={pilar
				? `background:${pilar.tint};color:${pilar.ink};`
				: 'background:var(--color-ink-100);color:var(--color-ink-600);'}
		>
			<Icon path={ikonPilar} size={20} />
		</span>

		<div class="min-w-0 flex-1">
			{#if pilar}
				<p class="label-micro" style="color:{pilar.ink};">{pilar.label}</p>
			{/if}
			<h3 class="mt-1 line-clamp-2 text-base font-semibold text-ink-800">
				{#if tautan}
					<a href={tautan} class="hover:text-pertamina-red-ink">{movement?.title}</a>
				{:else}
					{movement?.title}
				{/if}
			</h3>
		</div>
	</div>

	{#if movement?.description}
		<p class="mt-3 line-clamp-2 text-[13px] leading-relaxed text-ink-600">
			{movement.description}
		</p>
	{/if}

	{#if movement?.sdgTags?.length}
		<div class="mt-3 flex flex-wrap gap-1.5">
			{#each movement.sdgTags as tag (tag)}
				<StatusBadge label={tag} color="slate" size="sm" variant="outline" />
			{/each}
		</div>
	{/if}

	{#if target > 0}
		<div class="mt-4">
			<ProgressBar
				value={bergabung}
				max={target}
				size="sm"
				color={pilar ? pilar.color : 'var(--color-pertamina-blue)'}
				label="Partisipasi gerakan"
			/>
		</div>
	{/if}

	<div class="mt-3 grid grid-cols-2 divide-x divide-ink-100">
		<div class="pr-3">
			<p class="text-sm text-ink-700">
				<span class="numeric font-bold text-ink-900">{formatAngka(bergabung)}</span>
				<span class="text-ink-500">dari {formatAngka(target)}</span>
			</p>
			<p class="label-micro mt-0.5">Orang bergerak</p>
		</div>
		<div class="pl-3">
			<p class="numeric text-sm font-bold text-ink-900">{formatAngka(movement?.locations ?? 0)}</p>
			<p class="label-micro mt-0.5">Lokasi aksi</p>
		</div>
	</div>

	<div class="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-ink-100 pt-3">
		{#if movement?.deadline}
			<span class="inline-flex items-center gap-1 text-xs text-ink-600">
				<Icon path={ICONS.clock} size={14} />
				Sampai {formatTanggal(movement.deadline, 'pendek')}
			</span>
		{:else}
			<span></span>
		{/if}

		{#if onJoin}
			<Button variant="primary" size="sm" onclick={() => onJoin(movement)}>Ikut Gerakan</Button>
		{:else if tautan}
			<Button variant="ghost" size="sm" href={tautan} iconPath={ICONS.chevronRight} iconPosition="right">
				Selengkapnya
			</Button>
		{/if}
	</div>
</div>
