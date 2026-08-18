<script>
	/**
	 * HALAMAN — Pencapaian (`/awardee/penghargaan`).
	 *
	 * Pilar 05 Hal 5 (*"Peningkatan poin yang dapat ditukar"*) dan tangga manfaat
	 * jenjang Hal 12.
	 *
	 * ── DARI "PENGHARGAAN" MENJADI "PENCAPAIAN" ────────────────────────────────
	 *
	 * Judul lama menempatkan anggota sebagai penerima: sesuatu diberikan kepadanya
	 * oleh pihak lain. Judul baru menempatkannya sebagai pelaku — yang ditampilkan
	 * di sini adalah apa yang SUDAH IA KERJAKAN. Perbedaannya bukan sekadar kata:
	 * seluruh susunan halaman ikut berubah. Yang pertama terlihat kini jenjang yang
	 * sedang dipegang dan seberapa dekat jenjang berikutnya, bukan empat ubin angka
	 * yang berdiri sendiri tanpa cerita.
	 *
	 * TIGA KEPUTUSAN YANG TIDAK TERBACA DARI KODE:
	 *
	 * 1. **NOL perbandingan antar-anggota.** Halaman ini tidak mengimpor store
	 *    papan peringkat maupun `LeaderboardRow`. Satu-satunya angka pembanding
	 *    yang muncul adalah jarak menuju jenjang BERIKUTNYA — perbandingan anggota
	 *    dengan dirinya sendiri, bukan dengan orang lain.
	 * 2. **Yang dibelanjakan adalah Koin Tukar, bukan Poin Kontribusi.** Bila
	 *    keduanya disatukan, seorang Champion yang menukar hadiah akan turun
	 *    menjadi Contributor, dan jenjang berhenti berarti sebagai pengakuan.
	 *    Karena itu saldo yang berkurang saat penukaran hanya `coins`; `points`
	 *    tidak pernah disentuh.
	 * 3. **Lencana yang belum diraih tetap terlihat beserta kriterianya.** Katalog
	 *    yang terlihat adalah pendorong utama rasa ingin melengkapi;
	 *    menyembunyikannya menghapus daya tariknya dan menyisakan kejutan yang
	 *    tidak dapat dikejar siapa pun.
	 *
	 * BATAS TANGGUNG JAWAB. Halaman ini TIDAK merakit penukaran — seluruhnya satu
	 * pemanggilan `rewardRepository.redeem()` yang atomik; yang tersisa di sini
	 * hanyalah membuka dialog, menampilkan hasilnya, dan memuat ulang tampilan.
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
		PointsChip,
		ProgressBar,
		RewardCard,
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
	import { formatAngka, formatRelatif, formatTanggal, frasaHitung } from '$lib/utils/format.js';

	const TAB_PERJALANAN = 'perjalanan';
	const TAB_LENCANA = 'lencana';
	const TAB_TUKAR = 'tukar';
	const TAB_PESANAN = 'pesanan';

	/** Nilai pil filter untuk "tanpa penyaringan kategori". */
	const SEMUA_KATEGORI = 'SEMUA';

	/** Banyaknya baris riwayat poin yang ditampilkan sekaligus. */
	const BATAS_RIWAYAT = 12;

	/** @type {string} */
	let tabAktif = $state(TAB_PERJALANAN);

	/** @type {string} */
	let kategori = $state(SEMUA_KATEGORI);

	/** @type {import('$lib/domain/entities/Reward.js').Reward|null} */
	let rewardDipilih = $state.raw(null);

	/** @type {{badge: import('$lib/domain/entities/Badge.js').Badge, unlocked: boolean}|null} */
	let lencanaDipilih = $state.raw(null);

	/** @type {Record<string, any>[]} Riwayat penukaran anggota, terbaru lebih dulu. */
	let pesanan = $state.raw([]);

	/** @type {boolean} */
	let sedangMenukar = $state(false);

	const awardee = $derived(session.awardee);

	const lencanaTerkumpul = $derived(gamification.badges.filter((entri) => entri.unlocked).length);
	const lencanaTerkunci = $derived(gamification.badges.length - lencanaTerkumpul);

	/** Jenjang berikutnya beserta jarak yang tersisa; `null` bila sudah di puncak. */
	const jenjangBerikut = $derived.by(() => {
		const berikutnya = TIER_TABLE.find((tier) => tier.threshold > gamification.points);
		if (!berikutnya) return null;
		return { tier: berikutnya, kurang: berikutnya.threshold - gamification.points };
	});

	/**
	 * Riwayat poin terbaru, terbaru lebih dulu.
	 *
	 * Entri yang poinnya nol tetap ditampilkan. Aksi yang tercatat tanpa poin —
	 * karena kuota harian penuh atau karena buktinya belum lengkap — adalah bagian
	 * jujur dari perjalanan, dan menyembunyikannya membuat anggota mengira aksinya
	 * hilang.
	 */
	const riwayatPoin = $derived(gamification.ledger.slice(0, BATAS_RIWAYAT));

	/**
	 * Berapa aksi yang tercatat bulan ini — konteks hangat untuk kepala riwayat.
	 *
	 * Kunci bulan disusun dari komponen tanggal LOKAL, bukan dari `toISOString()`:
	 * entity menghitung `monthKey`-nya dengan waktu lokal (WIB), dan versi UTC akan
	 * meleset satu bulan penuh pada tujuh jam pertama tiap tanggal 1.
	 */
	const aksiBulanIni = $derived.by(() => {
		const kini = new Date();
		const kunci = `${kini.getFullYear()}-${String(kini.getMonth() + 1).padStart(2, '0')}`;
		return gamification.ledger.filter((entri) => entri.monthKey === kunci).length;
	});

	/**
	 * Katalog lencana dikelompokkan per keluarga, tiap kelompok diurutkan dari
	 * kelangkaan terendah. Urutan itu membuat anggota melihat lencana yang paling
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

	/** Item katalog yang terbuka bagi komunitas anggota ini. */
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
		{ id: TAB_PERJALANAN, label: 'Perjalananku' },
		{ id: TAB_LENCANA, label: 'Lencana saya', count: lencanaTerkumpul },
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
	 * Membaca ulang riwayat penukaran anggota dari basis data.
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
	 * hanya akan mengosongkan katalog tanpa sebab yang terlihat anggota.
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
				title: 'Belum ada sesi anggota',
				message: 'Masuk sebagai anggota PFfriends untuk menukarkan Koin Tukar.'
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
	<title>Pencapaian — PFfriends</title>
</svelte:head>

<div class="mb-5">
	<p class="label-micro">Perjalanan kontribusimu</p>
	<h1 class="mt-1 font-sans text-2xl font-bold tracking-[-0.02em] text-heading md:text-[28px]">
		Pencapaian
	</h1>
	<p class="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-600">
		Semua yang kamu kumpulkan sejauh ini — jenjang, lencana, dan poin — beserta hadiah yang bisa
		kamu tukar. Halaman ini hanya membandingkanmu dengan dirimu sendiri.
	</p>
</div>

<!-- ══ Kartu jenjang · pembuka yang hangat ═══════════════════════════════════
     Menggantikan empat ubin angka yang dulu berdiri sendiri tanpa cerita. Yang
     pertama dibaca anggota kini adalah "kamu di mana" dan "berapa jauh lagi". -->
<section
	class="rounded-card border border-brand-200 bg-brand-50 px-5 py-5 sm:px-6"
	aria-labelledby="judul-jenjang"
>
	<div class="flex flex-wrap items-start justify-between gap-5">
		<div class="min-w-0">
			<p class="label-micro">Jenjang kamu sekarang</p>
			<div class="mt-2 flex flex-wrap items-center gap-3">
				<TierBadge tier={gamification.tier.level} size="lg" />
				<span class="numeric text-3xl leading-none text-heading">
					{formatAngka(gamification.points)}
					<span class="text-sm font-semibold text-ink-600">poin</span>
				</span>
			</div>
			<h2 id="judul-jenjang" class="mt-3 max-w-xl text-sm leading-relaxed text-ink-700">
				{gamification.tier.deskripsi}
			</h2>
			<p class="mt-1.5 max-w-xl text-[13px] leading-relaxed text-ink-600">
				<span class="font-semibold text-brand-700">Yang terbuka untukmu:</span>
				{gamification.tier.benefit}
			</p>
		</div>

		<div class="w-full max-w-xs shrink-0 rounded-xl border border-brand-200 bg-surface p-4">
			{#if jenjangBerikut}
				<p class="label-micro">Menuju {jenjangBerikut.tier.label}</p>
				<p class="numeric mt-1.5 text-2xl leading-none text-heading">
					{formatAngka(jenjangBerikut.kurang)}
					<span class="text-xs font-semibold text-ink-600">poin lagi</span>
				</p>
				<div class="mt-3">
					<ProgressBar
						value={gamification.points}
						max={jenjangBerikut.tier.threshold}
						color={jenjangBerikut.tier.color}
						label="Progres menuju {jenjangBerikut.tier.label}"
					/>
				</div>
				<p class="mt-2 text-[11px] leading-relaxed text-ink-600">
					Kira-kira {frasaHitung(Math.max(1, Math.ceil(jenjangBerikut.kurang / 5)), 'aksi')} lagi. Kamu
					lebih dekat daripada yang kamu kira.
				</p>
			{:else}
				<p class="label-micro">Jenjang tertinggi</p>
				<p class="mt-1.5 text-sm leading-relaxed font-semibold text-brand-700">
					Kamu sudah di puncak tangga jenjang PFfriends. 🎉
				</p>
				<p class="mt-2 text-[11px] leading-relaxed text-ink-600">
					Poin yang kamu kumpulkan sekarang menjadi Koin Tukar dan bahan pertimbangan undangan
					sebagai narasumber.
				</p>
			{/if}
		</div>
	</div>

	<div class="mt-5 grid grid-cols-2 gap-3 border-t border-brand-200 pt-4 sm:grid-cols-4">
		<div>
			<p class="numeric text-xl text-heading">{formatAngka(gamification.coins)}</p>
			<p class="label-micro mt-1">Koin Tukar</p>
		</div>
		<div>
			<p class="numeric text-xl text-heading">{formatAngka(lencanaTerkumpul)}</p>
			<p class="label-micro mt-1">Lencana diraih</p>
		</div>
		<div>
			<p class="numeric text-xl text-heading">{formatAngka(gamification.ledger.length)}</p>
			<p class="label-micro mt-1">Aksi tercatat</p>
		</div>
		<div>
			<p class="numeric text-xl text-heading">{formatAngka(pesanan.length)}</p>
			<p class="label-micro mt-1">Hadiah ditukar</p>
		</div>
	</div>
</section>

<div class="mt-6">
	<Tabs {tabs} bind:active={tabAktif} />
</div>

{#if tabAktif === TAB_PERJALANAN}
	<!-- Skala jenjang dibungkus Card berpadding: label ambang pada `TierProgress`
	     diletakkan absolut dan berpusat pada titiknya, sehingga label terakhir
	     menjulur setengah lebarnya melewati 100%. Tanpa padding pembungkus,
	     julurannya melebarkan dokumen dan halaman ikut menggulir mendatar di 375px. -->
	<Card padding="lg" class="mt-6">
		<TierProgress points={gamification.points} />
	</Card>

	<div class="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
		<!-- Tangga jenjang -->
		<section aria-labelledby="judul-tangga">
			<h2 id="judul-tangga" class="mb-3 text-base font-bold text-heading">Tangga jenjang</h2>
			<div class="space-y-3">
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
									<StatusBadge
										label="Sudah kamu raih"
										color="green"
										size="sm"
										iconPath={ICONS.checkCircle}
									/>
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
				Jenjang ditentukan murni oleh ambang poin. Tidak ada syarat tersembunyi, dan menukar Koin
				Tukar tidak pernah menurunkan jenjang yang sudah kamu raih.
			</p>
		</section>

		<!-- Riwayat poin -->
		<section aria-labelledby="judul-riwayat">
			<h2 id="judul-riwayat" class="mb-3 text-base font-bold text-heading">Riwayat poinmu</h2>

			{#if riwayatPoin.length === 0}
				<EmptyState
					iconPath={ICONS.bolt}
					title="Belum ada aksi yang tercatat"
					message="Menyimak kabar mingguan, hadir di kegiatan, atau menulis Blog akan mengisi riwayat ini. Aksi pertama biasanya yang paling mudah."
					size="sm"
					actionLabel="Lihat kabar komunitas"
					actionHref="/awardee/kabar"
				/>
			{:else}
				<Card padding="none" class="overflow-hidden">
					<p class="border-b border-ink-100 px-4 py-3 text-[13px] leading-relaxed text-ink-600">
						<span class="font-semibold text-ink-800">
							{frasaHitung(aksiBulanIni, 'aksi')} bulan ini.
						</span>
						Setiap baris di bawah adalah satu langkah yang kamu ambil sendiri.
					</p>

					<ul class="divide-y divide-ink-100">
						{#each riwayatPoin as entri (entri.id)}
							<li class="flex items-start gap-3 px-4 py-3">
								<span
									class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700"
									aria-hidden="true"
								>
									<Icon path={ICONS.bolt} size={16} />
								</span>

								<div class="min-w-0 flex-1">
									<p class="text-[13px] leading-snug font-semibold text-ink-800">{entri.label}</p>
									<p class="mt-0.5 text-[11px] text-ink-600">
										{formatTanggal(entri.occurredAt, 'pendek')} · {formatRelatif(entri.occurredAt)}
									</p>
									{#if entri.note}
										<p class="mt-1 line-clamp-2 text-[12px] leading-relaxed text-ink-600">
											{entri.note}
										</p>
									{/if}
								</div>

								<div class="flex shrink-0 flex-col items-end gap-1">
									{#if entri.isAwarded && entri.points > 0}
										<PointsChip points={entri.points} currency="PK" size="sm" signed />
									{:else}
										<StatusBadge
											label={entri.statusMeta.label}
											color={entri.statusMeta.badgeColor}
											size="sm"
										/>
									{/if}
								</div>
							</li>
						{/each}
					</ul>

					{#if gamification.ledger.length > BATAS_RIWAYAT}
						<p class="border-t border-ink-100 px-4 py-3 text-[11px] text-ink-600">
							Menampilkan {BATAS_RIWAYAT} aksi terbaru dari {formatAngka(gamification.ledger.length)} yang
							tercatat.
						</p>
					{/if}
				</Card>
			{/if}
		</section>
	</div>
{:else if tabAktif === TAB_LENCANA}
	{#if gamification.badges.length === 0}
		<div class="mt-6">
			<EmptyState
				iconPath={ICONS.badge}
				title="Katalog lencana belum tersedia"
				message="Katalog dimuat bersama data komunitas. Coba muat ulang halaman bila keadaan ini bertahan."
			/>
		</div>
	{:else}
		<Card padding="md" class="mt-6">
			<p class="text-[13px] leading-relaxed text-ink-700">
				<span class="font-semibold text-brand-700">
					{formatAngka(lencanaTerkumpul)} lencana sudah kamu raih
				</span>
				· {formatAngka(lencanaTerkunci)} lainnya masih menunggu. Yang belum terbuka tetap terlihat
				lengkap dengan kriterianya — supaya kamu tahu persis langkah berikutnya, bukan menebak-nebak.
			</p>
		</Card>

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
					jenjangmu.
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
			label="Penyaring kategori hadiah"
		/>
	</div>

	{#if !awardee}
		<div class="mt-6">
			<EmptyState
				iconPath={ICONS.user}
				title="Belum ada sesi anggota"
				message="Masuk sebagai anggota PFfriends untuk melihat katalog penukaran beserta saldo Koin Tukar-mu."
				actionLabel="Masuk sebagai anggota"
				actionHref="/masuk"
			/>
		</div>
	{:else if rewardTampil.length === 0}
		<div class="mt-6">
			<EmptyState
				iconPath={ICONS.gift}
				title="Belum ada hadiah pada kategori ini"
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
			iconPath={ICONS.inbox}
			title="Belum ada penukaran"
			message="Setiap hadiah yang kamu tukar tercatat di sini beserta status pemenuhannya."
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
				Hadiah ini menunggu persetujuan Corsec sebelum dipenuhi. Koin sudah dipotong saat pengajuan
				dan dikembalikan bila pengajuan ditolak.
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
					{formatAngka(lencanaDipilih.badge.holderCount)} anggota
				</dd>
			</div>
		</dl>

		<p class="mt-4 text-xs leading-relaxed text-ink-600">
			Lencana memberi Koin Tukar dan hak kosmetik, tidak pernah Poin Kontribusi. Dengan begitu tabel
			skor Hal 11 tetap menjadi satu-satunya sumber poin.
		</p>
	{/if}
</Modal>
