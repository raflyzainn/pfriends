<script>
	/**
	 * TierProgress — rel perjalanan tier. Komponen paling penting di produk ini.
	 *
	 * Props:
	 * @prop {number} points        Poin aktif (kontrak 09 §5).
	 * @prop {number} activePk      Alias `points` (penamaan 08 §5.2).
	 * @prop {boolean} showLabels   Menampilkan angka ambang di bawah rel.
	 * @prop {string|null} currentTier   Menimpa tier sekarang bila store sudah menghitungnya.
	 * @prop {string|null} nextTier      Menimpa tier berikutnya.
	 * @prop {number|null} nextThreshold Menimpa ambang berikutnya.
	 * @prop {{label:string, done:boolean, hint?:string}[]} requirements Checklist gate fitur.
	 * @prop {boolean} locked       Menampilkan panel syarat yang belum terpenuhi.
	 * @prop {string}  class
	 *
	 * Dua keputusan desain yang membentuk komponen ini.
	 *
	 * Pertama, penanda ambang berjarak PROPORSIONAL terhadap nilainya, bukan sama
	 * rata. Selisih antar-ambang pada TIER_TABLE tidak seragam, sehingga rel yang
	 * meratakan jarak akan berbohong tentang seberapa jauh perjalanan yang
	 * tersisa. Posisi tiap penanda dihitung dari `threshold / AMBANG_TERTINGGI`,
	 * sehingga rel ikut menyesuaikan bila tabel tier berubah.
	 *
	 * Kedua, progres selalu dinyatakan sebagai JARAK, bukan sebagai status:
	 * "30 poin lagi menuju Contributor" mengalahkan "Anda Active Member", karena
	 * yang pertama menyebut langkah berikutnya dan yang kedua hanya mengumumkan
	 * keadaan.
	 *
	 * Seluruh ambang dan warna diturunkan dari `$lib/domain/constants/tier-table.js`.
	 */
	import TierBadge from './TierBadge.svelte';
	import PointsChip from './PointsChip.svelte';
	import Icon from './Icon.svelte';
	import { ICONS } from '$lib/data/icons.js';
	import { formatAngka } from '$lib/utils/format.js';
	import { tierUntukPoin, tierBerikutnya } from '$lib/domain/constants/tier-table.js';
	import { gayaTier, kelas, AMBANG_TERTINGGI, TIER_BERAMBANG } from './_visual.js';

	let {
		points = 0,
		activePk = undefined,
		showLabels = true,
		currentTier = null,
		nextTier = null,
		nextThreshold = null,
		requirements = [],
		locked = false,
		class: className = ''
	} = $props();

	/** Poin negatif atau tidak sah tidak boleh menjatuhkan render kartu dasbor. */
	const poin = $derived(
		(() => {
			const mentah = activePk === undefined ? points : activePk;
			return typeof mentah === 'number' && Number.isFinite(mentah) && mentah >= 0 ? mentah : 0;
		})()
	);

	const entriSekarang = $derived(currentTier ?? tierUntukPoin(poin));
	const entriBerikut = $derived(nextTier ?? tierBerikutnya(poin));

	const visualSekarang = $derived(gayaTier(entriSekarang));
	const visualBerikut = $derived(gayaTier(entriBerikut));

	const ambangBerikut = $derived(
		nextThreshold ?? (entriBerikut ? gayaTier(entriBerikut)?.threshold : null)
	);

	const sisaPoin = $derived(
		ambangBerikut === null || ambangBerikut === undefined ? 0 : Math.max(0, ambangBerikut - poin)
	);

	/** Panjang isian rel — dipetakan ke ambang tertinggi agar sebanding dengan penanda. */
	const persenRel = $derived(Math.min(100, (poin / AMBANG_TERTINGGI) * 100));

	/** @param {number} ambang */
	const posisi = (ambang) => (ambang / AMBANG_TERTINGGI) * 100;

	const warnaIsian = $derived(visualSekarang ? visualSekarang.color : 'var(--color-ink-400)');
</script>

<div class={kelas('w-full', className)}>
	<div class="flex flex-wrap items-center justify-between gap-2">
		<TierBadge tier={entriSekarang} size="md" />
		<PointsChip points={poin} currency="PK" size="md" />
	</div>

	<!-- Rel ambang: penanda ditempatkan proporsional terhadap nilainya. -->
	<div class="mt-5 px-1">
		<div
			class="relative h-1.5 w-full rounded-chip bg-ink-200"
			role="progressbar"
			aria-valuenow={poin}
			aria-valuemin="0"
			aria-valuemax={AMBANG_TERTINGGI}
			aria-label="Perjalanan tier: {formatAngka(poin)} dari {formatAngka(
				AMBANG_TERTINGGI
			)} poin kontribusi"
		>
			<div
				class="h-full rounded-chip transition-[width] duration-700 ease-out"
				style="width:{persenRel}%;background:{warnaIsian};box-shadow: inset 0 0 0 1px color-mix(in srgb, {warnaIsian} 62%, var(--color-ink-900));"
			></div>

			{#each TIER_BERAMBANG as entri (entri.level)}
				{@const tercapai = poin >= entri.threshold}
				<span
					class="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
					style="left:{posisi(entri.threshold)}%;background:{tercapai
						? entri.color
						: 'var(--color-ink-300)'};"
					title="{entri.label} · {formatAngka(entri.threshold)} PK — {entri.benefit}"
				></span>
			{/each}
		</div>

		{#if showLabels}
			<div class="relative mt-2 h-8">
				{#each TIER_BERAMBANG as entri (entri.level)}
					{@const tercapai = poin >= entri.threshold}
					<span
						class="absolute -translate-x-1/2 text-center leading-tight"
						style="left:{posisi(entri.threshold)}%;"
					>
						<span
							class={kelas(
								'numeric block text-[11px]',
								tercapai ? 'text-ink-800' : 'text-ink-500'
							)}>{formatAngka(entri.threshold)}</span
						>
						<span class="label-micro block whitespace-nowrap">{entri.label.split(' ')[0]}</span>
					</span>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Jarak tersisa, bukan status. -->
	<p class="mt-4 text-sm text-ink-600">
		{#if entriBerikut && visualBerikut}
			<span class="numeric font-bold text-ink-900">{formatAngka(sisaPoin)} poin lagi</span>
			menuju <span class="font-semibold" style={visualBerikut.gayaTeks}>{visualBerikut.label}</span>
			<span class="mt-1 block text-xs text-ink-500">{visualBerikut.benefit}</span>
		{:else if visualSekarang}
			<span class="font-semibold text-ink-800">Tier tertinggi tercapai.</span>
			<span class="mt-1 block text-xs text-ink-500">{visualSekarang.benefit}</span>
		{/if}
	</p>

	{#if locked && requirements.length > 0}
		<div class="mt-4 rounded-xl border border-warning/25 bg-warning-tint/60 p-4">
			<p class="flex items-center gap-1.5 text-sm font-semibold text-warning">
				<Icon path={ICONS.lock} size={16} />
				Syarat yang masih perlu dilengkapi
			</p>
			<ul class="mt-3 space-y-2.5">
				{#each requirements as syarat (syarat.label)}
					<li class="flex items-start gap-2.5">
						<span class="mt-0.5 shrink-0">
							{#if syarat.done}
								<Icon path={ICONS.checkCircle} size={16} class="text-success" />
							{:else}
								<Icon path={ICONS.xCircle} size={16} class="text-ink-450" />
							{/if}
						</span>
						<span class="min-w-0">
							<span
								class={kelas(
									'block text-sm',
									syarat.done ? 'text-ink-600 line-through' : 'font-medium text-ink-800'
								)}>{syarat.label}</span
							>
							{#if syarat.hint && !syarat.done}
								<span class="mt-0.5 block text-xs leading-relaxed text-ink-600">{syarat.hint}</span>
							{/if}
						</span>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</div>
