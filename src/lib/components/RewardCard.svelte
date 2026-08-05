<script>
	/**
	 * RewardCard — kartu katalog penukaran poin.
	 *
	 * Props:
	 * @prop {{id:string,name:string,category?:string,priceKt:number,minTier?:string,
	 *         quota?:number,remaining?:number,image?:string,description?:string}} reward
	 * @prop {number} points     Saldo Koin Tukar pengguna (kontrak 09 §5).
	 * @prop {number} balanceKt  Alias `points` (penamaan 08 §5.2).
	 * @prop {string|null} userTier
	 * @prop {(reward:any)=>void} onRedeem
	 *
	 * Tidak ada tombol mati tanpa penjelasan. Ketiga penghalang penukaran — tier
	 * kurang, saldo kurang, kuota habis — selalu dinyatakan eksplisit BESERTA
	 * angkanya, karena "kurang 120 KT" dapat ditindaklanjuti sedangkan tombol abu
	 * hanya membingungkan.
	 */
	import Button from './Button.svelte';
	import StatusBadge from './StatusBadge.svelte';
	import PointsChip from './PointsChip.svelte';
	import TierBadge from './TierBadge.svelte';
	import Icon from './Icon.svelte';
	import { ICONS } from '$lib/data/icons.js';
	import { formatAngka } from '$lib/utils/format.js';
	import { REWARD_CATEGORY_META, REWARD_CATEGORY } from '$lib/domain/constants/community.js';
	import { entriTier, kelas } from './_visual.js';

	let {
		reward = { id: '', name: '', priceKt: 0 },
		points = 0,
		balanceKt = undefined,
		userTier = null,
		onRedeem = undefined
	} = $props();

	const IKON_KATEGORI = {
		[REWARD_CATEGORY.MERCHANDISE]: ICONS.gift,
		[REWARD_CATEGORY.UPSKILLING]: ICONS.academic,
		[REWARD_CATEGORY.MENTORING]: ICONS.users,
		[REWARD_CATEGORY.PROFIL]: ICONS.star,
		[REWARD_CATEGORY.UNDANGAN]: ICONS.calendar,
		[REWARD_CATEGORY.SERTIFIKAT]: ICONS.document,
		[REWARD_CATEGORY.DAMPAK]: ICONS.heart
	};

	/** Ambang peringatan kuota menipis — murni aturan tampilan, bukan aturan domain. */
	const AMBANG_KUOTA_MENIPIS = 0.2;

	const saldo = $derived(balanceKt === undefined ? points : balanceKt);
	const kategori = $derived(reward?.category ? REWARD_CATEGORY_META[reward.category] : null);
	const ikon = $derived(IKON_KATEGORI[reward?.category] ?? ICONS.gift);

	const tierPengguna = $derived(entriTier(userTier));
	const tierMinimum = $derived(entriTier(reward?.minTier));
	const tierKurang = $derived(
		Boolean(tierMinimum) && (tierPengguna?.rank ?? 0) < (tierMinimum?.rank ?? 0)
	);

	const kurangKt = $derived(Math.max(0, (reward?.priceKt ?? 0) - saldo));
	const saldoKurang = $derived(kurangKt > 0);

	const kuota = $derived(reward?.quota ?? 0);
	const sisa = $derived(reward?.remaining ?? 0);
	const habis = $derived(kuota > 0 && sisa <= 0);
	const menipis = $derived(kuota > 0 && sisa > 0 && sisa / kuota < AMBANG_KUOTA_MENIPIS);

	const terkunci = $derived(tierKurang || saldoKurang || habis);

	const alasan = $derived.by(() => {
		if (habis) return 'Kuota penukaran periode ini sudah habis.';
		if (tierKurang) return `Perlu tier ${tierMinimum?.label} untuk menukar penghargaan ini.`;
		if (saldoKurang) return `Kurang ${formatAngka(kurangKt)} KT lagi untuk menukar.`;
		return '';
	});
</script>

<div
	class="flex h-full flex-col overflow-hidden rounded-card border border-ink-100 bg-surface shadow-card transition-all hover:border-ink-200 hover:shadow-card-hover"
>
	<div class="relative aspect-video w-full overflow-hidden bg-ink-100">
		{#if reward?.image}
			<img src={reward.image} alt="" class="h-full w-full object-cover" />
		{:else}
			<div
				class="flex h-full w-full items-center justify-center text-rarity-epik-ink"
				style="background:linear-gradient(135deg, var(--color-tier-champion-tint) 0%, var(--color-ink-50) 100%);"
			>
				<Icon path={ikon} size={40} strokeWidth={1.3} />
			</div>
		{/if}

		{#if menipis}
			<span class="absolute top-3 right-3">
				<StatusBadge label="Sisa {formatAngka(sisa)}" color="amber" size="sm" />
			</span>
		{:else if habis}
			<span class="absolute top-3 right-3">
				<StatusBadge label="Habis" color="slate" size="sm" />
			</span>
		{/if}
	</div>

	<div class="flex flex-1 flex-col p-4">
		{#if kategori}
			<p class="label-micro">{kategori.label}</p>
		{/if}

		<h3 class="mt-1 line-clamp-2 text-base font-semibold text-ink-800">{reward?.name}</h3>

		{#if reward?.description}
			<p class="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-ink-600">
				{reward.description}
			</p>
		{/if}

		<div class="mt-3 flex flex-wrap items-center gap-2">
			<PointsChip points={reward?.priceKt ?? 0} currency="KT" size="md" />
			{#if tierMinimum}
				<TierBadge tier={tierMinimum} size="sm" locked={tierKurang} />
			{/if}
		</div>

		{#if alasan}
			<p
				class={kelas(
					'mt-3 flex items-start gap-1.5 text-xs leading-relaxed',
					habis ? 'text-ink-600' : 'text-warning'
				)}
			>
				<Icon path={ICONS.lock} size={14} class="mt-px shrink-0" />
				{alasan}
			</p>
		{/if}

		<div class="mt-auto pt-4">
			<Button
				variant={terkunci ? 'secondary' : 'primary'}
				size="md"
				fullWidth
				disabled={terkunci || !onRedeem}
				onclick={onRedeem ? () => onRedeem(reward) : undefined}
			>
				{terkunci ? 'Belum bisa ditukar' : 'Tukar Sekarang'}
			</Button>
		</div>
	</div>
</div>
