<script>
	/**
	 * HALAMAN — Penghargaan (`/awardee/penghargaan`).
	 *
	 * Pilar 05 Hal 5: *"Peningkatan poin yang dapat ditukar"*, dan tangga manfaat
	 * tier Hal 12.
	 *
	 * Halaman ini menutup lingkaran gamifikasi: poin yang dikumpulkan di halaman lain
	 * berubah menjadi sesuatu yang nyata. Dua keputusan menjaga agar lingkarannya
	 * tidak merusak dirinya sendiri.
	 *
	 * Pertama, **yang dibelanjakan adalah Koin Tukar, bukan Poin Kontribusi.** Bila
	 * keduanya disatukan, seorang Champion yang menukar hadiah akan turun menjadi
	 * Contributor, dan tier berhenti berarti sebagai pengakuan. Karena itu saldo yang
	 * berkurang saat penukaran hanya `coins`; `points` tidak pernah disentuh.
	 *
	 * Kedua, **lencana yang belum diraih tetap terlihat beserta kriterianya.**
	 * Katalog yang terlihat adalah pendorong utama rasa ingin melengkapi;
	 * menyembunyikannya menghapus seluruh daya tariknya dan menyisakan kejutan yang
	 * tidak dapat dikejar siapa pun.
	 *
	 * BATAS TANGGUNG JAWAB. Halaman ini TIDAK merakit penukaran. Dahulu ia memanggil
	 * pemotongan koin dan pencatatan baris sebagai dua langkah terpisah, menyusun
	 * nomor pesanan dari panjang daftar yang sedang tampil, dan sama sekali tidak
	 * menyentuh pencacah kuota bulanan. Kini seluruhnya menjadi satu pemanggilan
	 * `rewardRepository.redeem()` yang atomik; yang tersisa di sini hanyalah membuka
	 * dialog, menampilkan hasilnya, dan memuat ulang tampilan.
	 *
	 * @see docs/00-SOURCE-BRIEF.md — Hal 5 pilar 05, Hal 12 tier & benefit
	 * @see docs/03-GAMIFICATION-SPEC.md — §2.2 dua mata uang, §6 badge, §10 katalog penukaran
	 */

	import { onMount } from 'svelte';
	import {
		BadgeTile,
		Button,
		Card,
		EmptyState,
		FilterChips,
		Icon,
		ICONS,
		Modal,
		PageHeader,
		PointsChip,
		RewardCard,
		StatTile,
		StatusBadge,
		Tabs,
		TierBadge,
		TierProgress
	} from '$lib/components';
	import { REWARD_CATEGORY_META } from '$lib/domain/constants/community.js';
	import { TIER_TABLE } from '$lib/domain/constants/tier-table.js';
	import { Badge, BADGE_FAMILY_LABEL } from '$lib/domain/entities/Badge.js';
	import {
		REDEMPTION_STATUS_META,
		rewardRepository
	} from '$lib/infrastructure/repositories/index.js';
	import { catalog, CatalogKind } from '$lib/stores/catalog.svelte.js';
	import { gamification } from '$lib/stores/gamification.svelte.js';
	import { session } from '$lib/stores/session.svelte.js';
	import { toast, ToastCurrency, ToastType } from '$lib/stores/toast.svelte.js';
	import { formatAngka, formatTanggal } from '$lib/utils/format.js';

	const TAB_TIER = 'tier';
	const TAB_LENCANA = 'lencana';
	const TAB_TUKAR = 'tukar';
	const TAB_PESANAN = 'pesanan';

	/** Nilai pil filter untuk "tanpa penyaringan kategori". */
	const SEMUA_KATEGORI = 'SEMUA';

	/** @type {string} */
	let tabAktif = $state(TAB_TIER);

	/** @type {string} */
	let kategori = $state(SEMUA_KATEGORI);

	/** @type {import('$lib/domain/entities/Reward.js').Reward|null} */
	let rewardDipilih = $state.raw(null);

	/** @type {{badge: import('$lib/domain/entities/Badge.js').Badge, unlocked: boolean}|null} */
	let lencanaDipilih = $state.raw(null);

	/** @type {Record<string, any>[]} Riwayat penukaran awardee, terbaru lebih dulu. */
	let pesanan = $state.raw([]);

	/** @type {boolean} */
	let sedangMenukar = $state(false);

	const awardee = $derived(session.awardee);

	const lencanaTerkumpul = $derived(gamification.badges.filter((entri) => entri.unlocked).length);
	const lencanaTerkunci = $derived(gamification.badges.length - lencanaTerkumpul);

	/**
	 * Katalog lencana dikelompokkan per keluarga, tiap kelompok diurutkan dari
	 * kelangkaan terendah. Urutan itu membuat awardee melihat lencana yang paling
	 * mungkin diraih lebih dulu, bukan yang paling mustahil.
	 */
	const keluargaLencana = $derived.by(() => {
		/** @type {Map<string, {badge: import('$lib/domain/entities/Badge.js').Badge, unlocked: boolean}[]>} */
		const peta = new Map();
		for (const entri of gamification.badges) {
			const daftar = peta.get(entri.badge.family) ?? [];
			daftar.push(entri);
			peta.set(entri.badge.family, daftar);
		}
		return [...peta.entries()].map(([family, daftar]) => ({
			family,
			label: BADGE_FAMILY_LABEL[family] ?? family,
			daftar: daftar.sort((a, b) => Badge.byRarity(a.badge, b.badge))
		}));
	});

	/** Item katalog yang terbuka bagi komunitas awardee. */
	const rewardTerbuka = $derived(
		awardee ? catalog.rewards.filter((reward) => reward.isOpenTo(awardee.community)) : []
	);

	const opsiKategori = $derived([
		{ id: SEMUA_KATEGORI, label: 'Semua kategori' },
		...Object.values(REWARD_CATEGORY_META)
			.filter((meta) => rewardTerbuka.some((reward) => reward.category === meta.code))
			.sort((a, b) => a.urutan - b.urutan)
			.map((meta) => ({ id: meta.code, label: meta.label }))
	]);

	/**
	 * Katalog yang ditampilkan. Kategori Dampak diangkat ke depan karena itulah satu-
	 * satunya kategori yang mengubah poin menjadi kebaikan bagi orang lain — dan bagi
	 * komunitas Sobat Bumi justru itu yang paling layak ditonjolkan.
	 */
	const rewardTampil = $derived(
		rewardTerbuka
			.filter((reward) => kategori === SEMUA_KATEGORI || reward.category === kategori)
			.sort(
				(a, b) =>
					Number(b.isImpactReward) - Number(a.isImpactReward) || a.priceCoins - b.priceCoins
			)
	);

	const tabs = $derived([
		{ id: TAB_TIER, label: 'Manfaat tier' },
		{ id: TAB_LENCANA, label: 'Lencana', count: lencanaTerkumpul },
		{ id: TAB_TUKAR, label: 'Tukar koin', count: rewardTerbuka.length },
		{ id: TAB_PESANAN, label: 'Pesanan saya', count: pesanan.length }
	]);

	const saldoSesudah = $derived(
		rewardDipilih && awardee ? awardee.coins - rewardDipilih.priceCoins : 0
	);

	onMount(async () => {
		if (!session.ready) await session.hydrate();
		await catalog.load();
		await gamification.refresh();
		await muatPesanan();
	});

	/**
	 * Membaca ulang riwayat penukaran awardee dari basis data.
	 * @returns {Promise<void>}
	 */
	async function muatPesanan() {
		pesanan = awardee ? await rewardRepository.redemptionsFor(awardee.id) : [];
	}

	/**
	 * Menormalkan pilihan pil filter.
	 *
	 * `FilterChips` melepaskan pilihan menjadi string kosong ketika pil aktif ditekan
	 * lagi. Penyaring ini sudah punya opsi "Semua kategori", sehingga string kosong
	 * hanya akan mengosongkan katalog tanpa sebab yang terlihat awardee.
	 *
	 * @param {string|string[]} nilai
	 * @returns {void}
	 */
	function pilihKategori(nilai) {
		kategori = typeof nilai === 'string' && nilai !== '' ? nilai : SEMUA_KATEGORI;
	}

	/**
	 * Bentuk yang dibaca `RewardCard`. Harga sengaja bernama `priceKt` di lapisan
	 * tampilan agar mata uangnya tidak pernah tertukar dengan Poin Kontribusi.
	 *
	 * Sisa kuota dibaca terhadap BULAN BERJALAN, bukan terhadap bulan yang kebetulan
	 * tersimpan pada baris katalog. Keduanya berbeda tepat pada hari pergantian
	 * bulan — dan kartu yang masih menampilkan "kuota habis" pada tanggal 1 adalah
	 * kartu yang menahan anggota dari sesuatu yang sebenarnya sudah terbuka.
	 *
	 * @param {import('$lib/domain/entities/Reward.js').Reward} reward
	 * @returns {Record<string, unknown>}
	 */
	function tampilanReward(reward) {
		return {
			id: reward.id,
			name: reward.name,
			category: reward.category,
			priceKt: reward.priceCoins,
			minTier: reward.minTier.level,
			quota: reward.monthlyQuota ?? 0,
			remaining: reward.remainingQuotaOn() ?? 0,
			description: reward.description
		};
	}

	/**
	 * Membuka dialog konfirmasi penukaran.
	 * @param {Record<string, unknown>} tampilan Objek tampilan dari `RewardCard`.
	 * @returns {void}
	 */
	function bukaTukar(tampilan) {
		if (!awardee) {
			toast.push({
				type: ToastType.INFO,
				title: 'Belum ada sesi awardee',
				message: 'Masuk sebagai awardee Pfriends untuk menukarkan Koin Tukar.'
			});
			return;
		}
		rewardDipilih = catalog.byId(CatalogKind.REWARD, /** @type {string} */ (tampilan.id));
	}

	/** @returns {void} */
	function tutupTukar() {
		rewardDipilih = null;
	}

	/**
	 * Menukarkan Koin Tukar dengan satu item katalog.
	 *
	 * Kelayakan diperiksa ulang oleh entity tepat sebelum saldo dipotong, bukan
	 * hanya saat kartu dirender. Jeda antara membuka dialog dan menekan tukar cukup
	 * untuk membuat pemeriksaan pertama basi — saldo bisa saja sudah terpakai di tab
	 * lain, dan pemotongan ganda tidak akan pernah bisa dibatalkan.
	 *
	 * @returns {Promise<void>}
	 */
	async function tukar() {
		const reward = rewardDipilih;
		if (!reward || !awardee || sedangMenukar) return;

		sedangMenukar = true;
		try {
			const hasil = await rewardRepository.redeem({
				awardeeId: awardee.id,
				rewardId: reward.id
			});

			if (!hasil.ok || !hasil.awardee) {
				toast.push({
					type: ToastType.WARNING,
					title: 'Penukaran belum dapat diproses',
					message: hasil.reason ?? undefined
				});
				// Katalog dimuat ulang juga pada penolakan: alasan paling sering adalah
				// kuota yang baru saja habis, dan kartu yang masih menampilkan sisa lama
				// akan mengundang anggota mencoba lagi ke dinding yang sama.
				await catalog.refresh();
				return;
			}

			await session.refresh();
			await catalog.refresh();
			await gamification.refresh();
			await muatPesanan();

			toast.push({
				type: ToastType.SUCCESS,
				title: `${reward.name} berhasil ditukar`,
				message: reward.requiresApproval
					? `Pesananmu masuk antrean persetujuan Corsec. ${reward.fulfillmentNote}`
					: reward.fulfillmentNote,
				newTotal: hasil.awardee.coins,
				currency: ToastCurrency.KOIN
			});
			tutupTukar();
		} finally {
			sedangMenukar = false;
		}
	}
</script>

<svelte:head>
	<title>Penghargaan — Pfriends</title>
</svelte:head>

<PageHeader
	eyebrow="Pilar 05 · Recognition & Gamifikasi"
	title="Penghargaan"
	subtitle="Manfaat tier, koleksi lencana, dan katalog penukaran. Poin Kontribusi menentukan tier dan tidak pernah berkurang; yang dibelanjakan adalah Koin Tukar."
/>

<div class="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
	<StatTile
		label="Poin Kontribusi"
		value={gamification.points}
		unit="PK"
		hint="Penentu tier — tidak pernah berkurang"
		iconPath={ICONS.bolt}
		color="var(--color-pertamina-navy)"
	/>
	<StatTile
		label="Koin Tukar"
		value={gamification.coins}
		unit="KT"
		hint="Saldo yang dapat dibelanjakan"
		iconPath={ICONS.coin}
		color="var(--color-tier-champion-ink)"
	/>
	<StatTile
		label="Lencana terkumpul"
		value={lencanaTerkumpul}
		unit={`dari ${gamification.badges.length}`}
		hint="Kriteria yang belum terbuka tetap terlihat"
		iconPath={ICONS.badge}
		color="var(--color-rarity-epik-ink)"
	/>
	<StatTile
		label="Penukaran saya"
		value={pesanan.length}
		hint="Seluruh riwayat pesanan"
		iconPath={ICONS.gift}
		color="var(--color-pertamina-red-ink)"
	/>
</div>

<div class="mt-6">
	<Tabs {tabs} bind:active={tabAktif} />
</div>

{#if tabAktif === TAB_TIER}
	<!-- Skala tier dibungkus Card yang berpadding, sama seperti pemakaiannya di
	     dasbor. Label ambang pada `TierProgress` diletakkan absolut dan berpusat
	     pada titiknya, sehingga label terakhir menjulur setengah lebarnya melewati
	     100%. Tanpa padding pembungkus, julurannya melebarkan dokumen dan halaman
	     ikut menggulir mendatar di 375 px. -->
	<Card padding="lg" class="mt-6">
		<TierProgress points={gamification.points} />
	</Card>

	<div class="mt-6 space-y-3">
		{#each TIER_TABLE as tier (tier.level)}
			{@const tercapai = gamification.points >= tier.threshold}
			<Card padding="md" accent={tercapai ? tier.color : ''}>
				<div class="flex flex-wrap items-start justify-between gap-3">
					<div class="min-w-0 flex-1">
						<div class="flex flex-wrap items-center gap-2">
							<TierBadge tier={tier.level} size="md" locked={!tercapai} />
							<span class="numeric text-xs text-ink-600">
								{tier.threshold === 0 ? 'Tanpa ambang' : `${formatAngka(tier.threshold)} poin`}
							</span>
						</div>
						<p class="mt-2 text-[13px] leading-relaxed text-ink-600">{tier.deskripsi}</p>
						<p class="mt-1.5 text-sm text-ink-800">
							<span class="font-semibold">Manfaat:</span>
							{tier.benefit}
						</p>
					</div>

					<div class="shrink-0">
						{#if tercapai}
							<StatusBadge label="Terbuka" color="green" size="sm" iconPath={ICONS.checkCircle} />
						{:else}
							<StatusBadge
								label="Kurang {formatAngka(tier.threshold - gamification.points)} poin"
								color="slate"
								size="sm"
								iconPath={ICONS.lock}
							/>
						{/if}
					</div>
				</div>
			</Card>
		{/each}
	</div>

	<p class="mt-4 flex items-start gap-1.5 text-xs leading-relaxed text-ink-600">
		<Icon path={ICONS.info} size={14} class="mt-px shrink-0" />
		Tier ditentukan murni oleh ambang poin. Tidak ada syarat tersembunyi, dan menukar Koin Tukar
		tidak pernah menurunkan tier yang sudah kamu raih.
	</p>
{:else if tabAktif === TAB_LENCANA}
	{#if gamification.badges.length === 0}
		<div class="mt-6">
			<EmptyState
				icon={ICONS.badge}
				title="Katalog lencana belum tersedia"
				message="Katalog dimuat bersama data komunitas. Coba muat ulang halaman bila keadaan ini bertahan."
			/>
		</div>
	{:else}
		<p class="mt-6 text-[13px] leading-relaxed text-ink-600">
			<span class="font-semibold text-ink-800">{formatAngka(lencanaTerkumpul)} terkumpul</span> ·
			{formatAngka(lencanaTerkunci)} masih terkunci. Ketuk lencana mana pun untuk melihat kriteria
			lengkap dan bonus Koin Tukar-nya.
		</p>

		<div class="mt-5 space-y-8">
			{#each keluargaLencana as kelompok (kelompok.family)}
				<section>
					<h2 class="text-base font-semibold text-heading">{kelompok.label}</h2>
					<div class="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
						{#each kelompok.daftar as entri (entri.badge.code)}
							<div>
								<BadgeTile
									badge={entri.badge}
									unlocked={entri.unlocked}
									onclick={() => (lencanaDipilih = entri)}
								/>
								{#if !entri.unlocked}
									<p class="mt-1.5 line-clamp-2 text-[11px] leading-snug text-ink-600">
										{entri.badge.criteria}
									</p>
								{/if}
							</div>
						{/each}
					</div>
				</section>
			{/each}
		</div>
	{/if}
{:else if tabAktif === TAB_TUKAR}
	<Card variant="highlight" class="mt-6">
		<div class="flex flex-wrap items-center justify-between gap-3">
			<div class="min-w-0">
				<p class="label-micro">Saldo Koin Tukar</p>
				<div class="mt-1.5">
					<PointsChip points={gamification.coins} currency="KT" size="lg" />
				</div>
				<p class="mt-1.5 text-[13px] text-ink-600">
					Koin bertambah seiring Poin Kontribusi dan bonus lencana. Menukarnya tidak menyentuh
					tier-mu.
				</p>
			</div>
			{#if awardee}
				<TierBadge tier={awardee.tierLevel} size="md" />
			{/if}
		</div>
	</Card>

	<div class="mt-5">
		<FilterChips
			options={opsiKategori}
			bind:selected={kategori}
			onchange={pilihKategori}
			showClear={false}
			label="Penyaring kategori penghargaan"
		/>
	</div>

	{#if !awardee}
		<div class="mt-6">
			<EmptyState
				icon={ICONS.user}
				title="Belum ada sesi awardee"
				message="Masuk sebagai awardee Pfriends untuk melihat katalog penukaran beserta saldo Koin Tukar-mu."
				actionLabel="Masuk sebagai awardee"
				actionHref="/masuk"
			/>
		</div>
	{:else if rewardTampil.length === 0}
		<div class="mt-6">
			<EmptyState
				icon={ICONS.gift}
				title="Belum ada penghargaan pada kategori ini"
				message="Katalog diperbarui tiap awal musim. Coba pilih kategori lain untuk melihat yang sedang tersedia."
			/>
		</div>
	{:else}
		<div class="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each rewardTampil as reward (reward.id)}
				<RewardCard
					reward={tampilanReward(reward)}
					points={gamification.coins}
					userTier={awardee.tierLevel}
					onRedeem={bukaTukar}
				/>
			{/each}
		</div>
	{/if}
{:else if pesanan.length === 0}
	<div class="mt-6">
		<EmptyState
			icon={ICONS.inbox}
			title="Belum ada penukaran"
			message="Setiap penghargaan yang kamu tukar tercatat di sini beserta status pemenuhannya."
			actionLabel="Lihat katalog penukaran"
			onAction={() => (tabAktif = TAB_TUKAR)}
		/>
	</div>
{:else}
	<div class="mt-6 space-y-3">
		{#each pesanan as item (item.id)}
			{@const status = REDEMPTION_STATUS_META[item.status]}
			<Card padding="md">
				<div class="flex flex-wrap items-start justify-between gap-3">
					<div class="min-w-0 flex-1">
						<p class="text-sm font-semibold text-ink-800">{item.rewardName}</p>
						<p class="mt-1 text-xs text-ink-600">
							Diajukan {formatTanggal(item.requestedAt, 'pendek')}
							{#if item.fulfilledAt}
								· dipenuhi {formatTanggal(item.fulfilledAt, 'pendek')}
							{/if}
						</p>
						{#if item.note}
							<p class="mt-1.5 text-[13px] leading-relaxed text-ink-600">{item.note}</p>
						{/if}
					</div>
					<div class="flex shrink-0 flex-col items-end gap-2">
						{#if status}
							<StatusBadge label={status.label} color={status.badgeColor} size="sm" withDot />
						{/if}
						<PointsChip points={item.coins} currency="KT" size="sm" />
					</div>
				</div>
			</Card>
		{/each}
	</div>
{/if}

<Modal open={rewardDipilih !== null} title="Konfirmasi penukaran" size="sm" onclose={tutupTukar}>
	{#if rewardDipilih && awardee}
		<p class="text-base font-semibold text-ink-800">{rewardDipilih.name}</p>
		{#if rewardDipilih.description}
			<p class="mt-1 text-[13px] leading-relaxed text-ink-600">{rewardDipilih.description}</p>
		{/if}

		<dl class="mt-4 space-y-2.5 border-t border-ink-100 pt-4 text-sm">
			<div class="flex items-center justify-between gap-3">
				<dt class="text-ink-600">Harga</dt>
				<dd><PointsChip points={rewardDipilih.priceCoins} currency="KT" size="sm" /></dd>
			</div>
			<div class="flex items-center justify-between gap-3">
				<dt class="text-ink-600">Saldo sekarang</dt>
				<dd class="numeric font-semibold text-ink-800">{formatAngka(awardee.coins)} KT</dd>
			</div>
			<div class="flex items-center justify-between gap-3">
				<dt class="text-ink-600">Saldo setelah penukaran</dt>
				<dd class="numeric font-semibold text-ink-900">{formatAngka(saldoSesudah)} KT</dd>
			</div>
			<div class="flex items-center justify-between gap-3">
				<dt class="text-ink-600">Poin Kontribusi</dt>
				<dd class="text-sm font-medium text-success">Tidak berubah</dd>
			</div>
		</dl>

		{#if rewardDipilih.fulfillmentNote}
			<p class="mt-4 rounded-xl bg-ink-50 px-3 py-2.5 text-[13px] leading-relaxed text-ink-700">
				{rewardDipilih.fulfillmentNote}
			</p>
		{/if}

		{#if rewardDipilih.requiresApproval}
			<p class="mt-3 flex items-start gap-1.5 text-xs leading-relaxed text-warning">
				<Icon path={ICONS.info} size={14} class="mt-px shrink-0" />
				Penghargaan ini menunggu persetujuan Corsec sebelum dipenuhi. Koin sudah dipotong saat
				pengajuan dan dikembalikan bila pengajuan ditolak.
			</p>
		{/if}
	{/if}

	{#snippet footer()}
		<Button variant="ghost" onclick={tutupTukar}>Batal</Button>
		<Button loading={sedangMenukar} iconPath={ICONS.gift} onclick={tukar}>Tukar sekarang</Button>
	{/snippet}
</Modal>

<Modal
	open={lencanaDipilih !== null}
	title="Detail lencana"
	size="sm"
	onclose={() => (lencanaDipilih = null)}
>
	{#if lencanaDipilih}
		<div class="flex items-start gap-4">
			<div class="w-28 shrink-0">
				<BadgeTile badge={lencanaDipilih.badge} unlocked={lencanaDipilih.unlocked} />
			</div>
			<div class="min-w-0 flex-1">
				<p class="text-base font-semibold text-ink-800">{lencanaDipilih.badge.name}</p>
				<p class="mt-0.5 text-xs text-ink-600">
					{lencanaDipilih.badge.familyLabel} · {lencanaDipilih.badge.rarityMeta.label} ({lencanaDipilih
						.badge.rarityMeta.logam})
				</p>
				<div class="mt-2">
					{#if lencanaDipilih.unlocked}
						<StatusBadge label="Sudah kamu raih" color="green" size="sm" iconPath={ICONS.check} />
					{:else}
						<StatusBadge label="Belum terbuka" color="slate" size="sm" iconPath={ICONS.lock} />
					{/if}
				</div>
			</div>
		</div>

		<div class="mt-4 border-t border-ink-100 pt-4">
			<p class="label-micro">Kriteria perolehan</p>
			<p class="mt-1.5 text-[13px] leading-relaxed text-ink-700">{lencanaDipilih.badge.criteria}</p>
		</div>

		<dl class="mt-4 space-y-2 text-[13px]">
			<div class="flex items-center justify-between gap-3">
				<dt class="text-ink-600">Bonus saat diraih</dt>
				<dd><PointsChip points={lencanaDipilih.badge.bonusCoins} currency="KT" size="sm" /></dd>
			</div>
			<div class="flex items-center justify-between gap-3">
				<dt class="text-ink-600">Sasaran kelangkaan</dt>
				<dd class="text-right text-ink-700">{lencanaDipilih.badge.rarityMeta.targetPopulasi}</dd>
			</div>
			<div class="flex items-center justify-between gap-3">
				<dt class="text-ink-600">Sudah dimiliki</dt>
				<dd class="numeric text-ink-700">
					{formatAngka(lencanaDipilih.badge.holderCount)} awardee
				</dd>
			</div>
		</dl>

		<p class="mt-4 text-xs leading-relaxed text-ink-600">
			Lencana memberi Koin Tukar dan hak kosmetik, tidak pernah Poin Kontribusi. Dengan begitu tabel
			skor Hal 11 tetap menjadi satu-satunya sumber poin.
		</p>
	{/if}
</Modal>
