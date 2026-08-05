<script>
	/**
	 * AwardeeCard — kartu profil anggota untuk direktori dan sorotan.
	 *
	 * Props:
	 * @prop {{id:string,name:string,avatar?:string,community?:string,chapter?:string,
	 *         tier?:string,activePk?:number,badges?:number,city?:string,headline?:string}} awardee
	 * @prop {boolean} showScoring  Baku `false` — lihat catatan di bawah.
	 * @prop {(awardee:any)=>void} onclick
	 * @prop {'grid'|'list'} variant
	 * @prop {boolean} showActions
	 * @prop {string} href
	 *
	 * Komunitas selalu ditandai eksplisit. Seluruh nilai platform ini adalah
	 * mempertemukan alumni beasiswa dengan pelaku UMKM binaan, sehingga keduanya
	 * harus dapat dibedakan sekilas — bila tidak, direktori kehilangan gunanya.
	 *
	 * `showScoring` BAKU `false` menutup kebocoran struktural: kartu ini merender
	 * grid Poin/Badge/Chapter dan `TierBadge`, dan sebelum ada gerbang ini SEMUA
	 * pemakaiannya membocorkan mekanik gamifikasi — termasuk bila ia dipakai di
	 * sorotan zona publik. `true` hanya sah di `/awardee/direktori`,
	 * `/verifikator`, dan `/admin` (Keputusan Pemilik Produk #2).
	 * Cincin tier pada avatar ikut mati bersamanya: warna cincin adalah kanal
	 * skor yang sama, hanya tanpa angka.
	 *
	 * @see docs/12-BUILD-CONTRACT-V2.md — §2.13 AwardeeCard { awardee, showScoring, … }
	 * @see docs/11-VISUAL-DIRECTION.md — §9 baris MemberCard "bocor secara struktural"
	 */
	import Avatar from './Avatar.svelte';
	import TierBadge from './TierBadge.svelte';
	import StatusBadge from './StatusBadge.svelte';
	import Icon from './Icon.svelte';
	import { ICONS } from '$lib/data/icons.js';
	import { formatAngka } from '$lib/utils/format.js';
	import { gayaKomunitas, kelas } from './_visual.js';
	import { CommunityType } from '$lib/domain/constants/community.js';

	let {
		awardee = { id: '', name: '' },
		showScoring = false,
		onclick = undefined,
		variant = 'grid',
		showActions = false,
		href = ''
	} = $props();

	const komunitas = $derived(gayaKomunitas(awardee?.community));
	const warnaKomunitas = $derived(awardee?.community === CommunityType.SOBI ? 'navy' : 'purple');

	const dapatDiklik = $derived(Boolean(href || onclick));

	const kelasWadah = $derived(
		kelas(
			'block w-full rounded-card border border-ink-100 bg-surface shadow-card transition-all',
			dapatDiklik && 'cursor-pointer hover:border-ink-200 hover:shadow-card-hover',
			variant === 'grid' ? 'p-5 text-center' : 'p-4 text-left'
		)
	);
</script>

{#snippet isi()}
	{#if variant === 'grid'}
		<div class="flex justify-center">
			<Avatar
				name={awardee?.name}
				src={awardee?.avatar}
				size="lg"
				tier={showScoring ? awardee?.tier : ''}
				showRing={showScoring}
			/>
		</div>

		<p class="mt-3 truncate text-base font-semibold text-ink-800" title={awardee?.name}>
			{awardee?.name}
		</p>

		{#if awardee?.headline}
			<p class="mt-0.5 line-clamp-1 text-[13px] text-ink-600" title={awardee.headline}>
				{awardee.headline}
			</p>
		{/if}

		<div class="mt-3 flex flex-wrap items-center justify-center gap-1.5">
			{#if komunitas}
				<StatusBadge label={komunitas.akronim} color={warnaKomunitas} size="sm" />
			{/if}
			{#if showScoring}
				<TierBadge tier={awardee?.tier} size="sm" />
			{/if}
		</div>

		{#if showScoring}
			<div class="mt-4 grid grid-cols-3 divide-x divide-ink-100 border-t border-ink-100 pt-3">
				<div>
					<p class="numeric text-sm text-ink-900">{formatAngka(awardee?.activePk ?? 0)}</p>
					<p class="label-micro mt-0.5">Poin</p>
				</div>
				<div>
					<p class="numeric text-sm text-ink-900">{formatAngka(awardee?.badges ?? 0)}</p>
					<p class="label-micro mt-0.5">Badge</p>
				</div>
				<div>
					<p class="truncate text-sm font-semibold text-ink-900">{awardee?.chapter ?? '—'}</p>
					<p class="label-micro mt-0.5">Chapter</p>
				</div>
			</div>
		{:else}
			<!-- Tanpa skor, chapter tetap ditampilkan: ia identitas jejaring, bukan
			     capaian, dan tanpanya kartu direktori kehilangan penciri utamanya. -->
			<p class="mt-4 border-t border-ink-100 pt-3 text-sm text-ink-600">
				{awardee?.chapter ?? '—'}
			</p>
		{/if}

		{#if showActions && awardee?.city}
			<p class="mt-3 inline-flex items-center gap-1 text-xs text-ink-500">
				<Icon path={ICONS.mapPin} size={14} />
				{awardee.city}
			</p>
		{/if}
	{:else}
		<div class="flex items-center gap-3">
			<Avatar
				name={awardee?.name}
				src={awardee?.avatar}
				size="md"
				tier={showScoring ? awardee?.tier : ''}
			/>

			<div class="min-w-0 flex-1">
				<p class="truncate text-sm font-semibold text-ink-800">{awardee?.name}</p>
				<div class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
					{#if komunitas}
						<span class="text-xs font-medium" style="color:{komunitas.ink};">
							{komunitas.akronim}
						</span>
					{/if}
					{#if awardee?.chapter}<span class="text-xs text-ink-500">· {awardee.chapter}</span>{/if}
					{#if awardee?.city}<span class="text-xs text-ink-500">· {awardee.city}</span>{/if}
				</div>
			</div>

			{#if showScoring}
				<div class="flex shrink-0 flex-col items-end gap-1.5">
					<TierBadge tier={awardee?.tier} size="sm" />
					<span class="numeric text-xs text-ink-600">
						{formatAngka(awardee?.activePk ?? 0)} PK
					</span>
				</div>
			{/if}
		</div>
	{/if}
{/snippet}

{#if href}
	<a {href} class={kelasWadah}>
		{@render isi()}
	</a>
{:else if onclick}
	<button type="button" class={kelasWadah} onclick={() => onclick(awardee)}>
		{@render isi()}
	</button>
{:else}
	<div class={kelasWadah}>
		{@render isi()}
	</div>
{/if}
