<script>
	/**
	 * HALAMAN — Papan Peringkat (`/awardee/papan-peringkat`).
	 *
	 * Pilar 05 Hal 5: recognition atas TOP Contribution.
	 *
	 * Papan peringkat adalah fitur yang paling mudah merusak komunitas bila dibuat
	 * asal. Awardee baru yang membuka halaman ini dan melihat dirinya di peringkat
	 * 47 dari 60 tidak akan kembali. Karena itu empat mekanisme anti-demotivasi
	 * docs/03 §9.2 diwujudkan langsung di sini:
	 *
	 * - **Posisi relatif mendahului peringkat absolut.** Yang ditonjolkan adalah
	 *   "kamu di 30% teratas", bukan angka peringkat besar yang tidak dapat
	 *   ditindaklanjuti.
	 * - **Peringkat chapter selalu terlihat**, apa pun papan yang sedang dibuka.
	 *   Kolam yang lebih kecil memberi kemenangan yang masih masuk akal dikejar.
	 * - **Tidak pernah ada peringkat terbawah.** Papan hanya memuat puncaknya;
	 *   posisi seorang awardee hanya diperlihatkan kepada dirinya sendiri.
	 * - **Papan kolektif chapter** mengubah sebagian kompetisi menjadi kerja sama —
	 *   dan memakai rata-rata, bukan total, agar chapter baru tidak kalah sejak awal.
	 *
	 * Seluruh penyusunan peringkat milik `LeaderboardService`; halaman ini hanya
	 * memilih pertanyaan yang diajukan dan menyusun kalimatnya.
	 *
	 * @see docs/00-SOURCE-BRIEF.md — Hal 5 pilar 05
	 * @see docs/03-GAMIFICATION-SPEC.md — §9.2 mekanisme anti-demotivasi, §9.3 aturan tampilan
	 */

	import { onMount } from 'svelte';
	import {
		Card,
		EmptyState,
		Icon,
		ICONS,
		LeaderboardRow,
		PageHeader,
		PointsChip,
		ProgressBar,
		StatusBadge,
		Tabs,
		TierBadge
	} from '$lib/components';
	import { chapter } from '$lib/domain/constants/community.js';
	import {
		leaderboard,
		LeaderboardPeriod,
		LeaderboardScope
	} from '$lib/stores/leaderboard.svelte.js';
	import { session } from '$lib/stores/session.svelte.js';
	import { formatAngka, formatTanggal } from '$lib/utils/format.js';

	/**
	 * Masa perlindungan awardee baru (docs/03 §9.2 mekanisme 2). Bukan ambang
	 * gamifikasi: angka ini tidak memengaruhi poin, tier, maupun peringkat — ia
	 * hanya menentukan kapan halaman menyapa awardee dengan nada yang berbeda.
	 */
	const HARI_MASA_BINTANG_BARU = 60;

	/** @type {string} */
	let lingkup = $state(LeaderboardScope.GLOBAL);

	/** @type {string} */
	let periode = $state(LeaderboardPeriod.MONTH);

	/**
	 * Posisi awardee pada papan periode pembanding. Disimpan sebagai potret karena
	 * store hanya menampung satu hasil pada satu waktu.
	 * @type {{rank: number, total: number, points: number, percentile: number}|null}
	 */
	let posisiPembanding = $state.raw(null);

	/**
	 * Posisi awardee pada papan chapter-nya sendiri, dipertahankan meski papan yang
	 * sedang dibuka bukan papan chapter.
	 * @type {{rank: number, total: number, points: number, percentile: number}|null}
	 */
	let posisiChapterLain = $state.raw(null);

	/** @type {Date|null} Waktu papan terakhir dihitung ulang — transparansi §9.3. */
	let diperbaruiPada = $state.raw(null);

	const awardee = $derived(session.awardee);

	const tabsLingkup = $derived(
		awardee
			? [
					{ id: LeaderboardScope.GLOBAL, label: 'Global' },
					{ id: LeaderboardScope.COMMUNITY, label: `Komunitas ${awardee.communityDef.akronim}` },
					{ id: LeaderboardScope.CHAPTER, label: awardee.chapterDef.label }
				]
			: [{ id: LeaderboardScope.GLOBAL, label: 'Global' }]
	);

	const tabsPeriode = [
		{ id: LeaderboardPeriod.MONTH, label: 'Bulan ini' },
		{ id: LeaderboardPeriod.ALL, label: 'Sepanjang waktu' }
	];

	const labelPeriode = $derived(
		periode === LeaderboardPeriod.MONTH ? 'Bulan ini' : 'Sepanjang waktu'
	);

	const labelPeriodePembanding = $derived(
		periode === LeaderboardPeriod.MONTH ? 'Sepanjang waktu' : 'Bulan ini'
	);

	const labelLingkup = $derived(
		tabsLingkup.find((tab) => tab.id === lingkup)?.label ?? 'Global'
	);

	/** Peringkat chapter — dari papan aktif bila memang papan chapter, dari potret bila bukan. */
	const posisiChapter = $derived(
		lingkup === LeaderboardScope.CHAPTER ? leaderboard.myRank : posisiChapterLain
	);

	/**
	 * Selisih posisi antara papan periode berjalan dan papan pembandingnya.
	 * Angka positif berarti awardee berdiri lebih tinggi pada papan yang sedang
	 * dibuka. Ini perbandingan antar-papan, bukan perpindahan dari waktu ke waktu,
	 * dan kalimat di antarmuka menyebutkannya persis begitu.
	 */
	const pergerakan = $derived(
		leaderboard.myRank && posisiPembanding
			? posisiPembanding.rank - leaderboard.myRank.rank
			: null
	);

	const chapterTerurut = $derived(
		[...leaderboard.chapters].sort((a, b) => b.averagePoints - a.averagePoints)
	);

	const anggotaBaru = $derived(
		awardee !== null && awardee.tenureDays() < HARI_MASA_BINTANG_BARU
	);

	onMount(async () => {
		if (!session.ready) await session.hydrate();
		await muat();
	});

	/**
	 * Nilai lingkup yang dibutuhkan service untuk papan yang sedang dipilih.
	 * @param {string} pilihan Salah satu LeaderboardScope.
	 * @returns {string}
	 */
	function kunciLingkup(pilihan) {
		if (!awardee) return '';
		if (pilihan === LeaderboardScope.COMMUNITY) return awardee.community;
		if (pilihan === LeaderboardScope.CHAPTER) return awardee.chapterId;
		return '';
	}

	/**
	 * Memuat seluruh potret yang dibutuhkan halaman, lalu papan yang benar-benar
	 * ditampilkan.
	 *
	 * Papan tampilan sengaja dimuat PALING AKHIR. Store hanya menampung satu hasil
	 * pada satu waktu, sehingga urutan mana pun selain ini akan meninggalkan tabel
	 * berisi papan pembanding — awardee melihat daftar yang tidak sesuai dengan tab
	 * yang baru saja ditekannya.
	 *
	 * @returns {Promise<void>}
	 */
	async function muat() {
		const kunci = kunciLingkup(lingkup);
		const pembanding =
			periode === LeaderboardPeriod.MONTH ? LeaderboardPeriod.ALL : LeaderboardPeriod.MONTH;

		await leaderboard.load({ scope: lingkup, key: kunci, period: pembanding });
		posisiPembanding = leaderboard.myRank;

		if (lingkup !== LeaderboardScope.CHAPTER && awardee) {
			await leaderboard.load({
				scope: LeaderboardScope.CHAPTER,
				key: awardee.chapterId,
				period: periode
			});
			posisiChapterLain = leaderboard.myRank;
		} else {
			posisiChapterLain = null;
		}

		await leaderboard.load({ scope: lingkup, key: kunci, period: periode });
		diperbaruiPada = new Date();
	}

	/**
	 * Berpindah papan. Nilai lingkup ditetapkan dari argumen `onchange`, bukan
	 * disandarkan pada urutan penulisan `bind:active` — pemuatan yang salah papan
	 * jauh lebih sulit disadari daripada satu baris tambahan di sini.
	 * @param {string} pilihan Salah satu LeaderboardScope.
	 * @returns {void}
	 */
	function gantiLingkup(pilihan) {
		lingkup = pilihan;
		void muat();
	}

	/**
	 * Berpindah periode papan.
	 * @param {string} pilihan Salah satu LeaderboardPeriod.
	 * @returns {void}
	 */
	function gantiPeriode(pilihan) {
		periode = pilihan;
		void muat();
	}

	/**
	 * Bentuk yang dibaca `LeaderboardRow`.
	 * @param {import('$lib/domain/services/LeaderboardService.js').LeaderboardEntry} entri
	 * @returns {Record<string, unknown>}
	 */
	function tampilanBaris(entri) {
		return {
			id: entri.awardee.id,
			name: entri.displayName,
			community: entri.awardee.community,
			chapter: entri.awardee.chapterDef.label,
			tier: entri.awardee.tierLevel
		};
	}
</script>

<svelte:head>
	<title>Papan Peringkat — Pfriends</title>
</svelte:head>

<PageHeader
	eyebrow="Pilar 05 · Recognition & Gamifikasi"
	title="Papan Peringkat"
	subtitle="Apresiasi bagi kontribusi terbesar komunitas. Papan ini hanya menampilkan puncaknya — posisi seorang awardee adalah urusan dirinya sendiri, bukan tontonan."
/>

<div class="mt-6">
	<Tabs tabs={tabsLingkup} bind:active={lingkup} onchange={gantiLingkup} />
</div>

<div class="mt-4">
	<Tabs
		tabs={tabsPeriode}
		bind:active={periode}
		variant="pill"
		onchange={gantiPeriode}
		class="w-fit"
	/>
</div>

{#if awardee}
	<Card variant="highlight" class="mt-6">
		<div class="flex flex-wrap items-start justify-between gap-4">
			<div class="min-w-0">
				<p class="label-micro">Posisi saya · {labelLingkup} · {labelPeriode}</p>
				{#if leaderboard.myRank}
					<p class="mt-1.5 text-xl font-semibold text-heading">
						Kamu di
						<span class="numeric">{leaderboard.myRank.percentile}%</span> teratas
						{labelLingkup.toLowerCase()}
					</p>
					<p class="mt-1 text-[13px] text-ink-600">
						Peringkat <span class="numeric font-semibold text-ink-800"
							>{leaderboard.myRank.rank}</span
						>
						dari {formatAngka(leaderboard.myRank.total)} awardee yang tampil di papan ini.
					</p>
				{:else}
					<p class="mt-1.5 text-xl font-semibold text-heading">Belum masuk papan ini</p>
					<p class="mt-1 text-[13px] text-ink-600">
						Papan {labelPeriode.toLowerCase()} menghitung poin yang dibukukan pada periode itu. Satu
						aksi saja sudah cukup untuk mulai tercatat.
					</p>
				{/if}
			</div>

			<div class="flex flex-wrap items-center gap-2">
				<TierBadge tier={awardee.tierLevel} size="md" />
				<PointsChip points={leaderboard.myRank?.points ?? 0} currency="PK" size="md" />
			</div>
		</div>

		<div class="mt-4 grid gap-3 border-t border-ink-100 pt-4 sm:grid-cols-3">
			<div>
				<p class="label-micro">Peringkat di {awardee.chapterDef.label}</p>
				{#if posisiChapter}
					<p class="mt-1 text-sm text-ink-700">
						<span class="numeric font-bold text-ink-900">{posisiChapter.rank}</span>
						<span class="text-ink-600">dari {formatAngka(posisiChapter.total)} awardee chapter</span>
					</p>
				{:else}
					<p class="mt-1 text-sm text-ink-600">Belum tercatat pada periode ini</p>
				{/if}
			</div>

			<div>
				<p class="label-micro">Dibanding papan {labelPeriodePembanding.toLowerCase()}</p>
				{#if pergerakan === null}
					<p class="mt-1 text-sm text-ink-600">Belum dapat dibandingkan</p>
				{:else if pergerakan > 0}
					<p class="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-success">
						<Icon path={ICONS.arrowUp} size={16} />
						<span class="numeric">{pergerakan}</span> posisi lebih tinggi
					</p>
				{:else if pergerakan < 0}
					<p class="mt-1 inline-flex items-center gap-1.5 text-sm text-ink-700">
						<Icon path={ICONS.arrowDown} size={16} />
						<span class="numeric">{Math.abs(pergerakan)}</span> posisi lebih rendah
					</p>
				{:else}
					<p class="mt-1 text-sm text-ink-700">Posisi sama di kedua papan</p>
				{/if}
			</div>

			<div>
				<p class="label-micro">Streak mingguan</p>
				<p class="mt-1 text-sm text-ink-700">
					<span class="numeric font-bold text-ink-900">{awardee.streakWeeks}</span>
					<span class="text-ink-600">pekan berturut-turut</span>
				</p>
			</div>
		</div>

		{#if anggotaBaru}
			<p
				class="mt-4 flex items-start gap-2 rounded-xl bg-tier-active-tint px-3 py-2.5 text-[13px] leading-relaxed text-ink-700"
			>
				<Icon path={ICONS.sparkles} size={16} class="mt-px shrink-0" />
				<span>
					Kamu bergabung {formatAngka(awardee.tenureDays())} hari lalu. Papan global memuat awardee yang
					sudah aktif bertahun-tahun — jangan jadikan itu ukuran. Kejar dulu peringkat di
					{awardee.chapterDef.label} dan aksi harian di Pusat Aksi; keduanya bergerak jauh lebih cepat.
				</span>
			</p>
		{/if}
	</Card>
{/if}

<section class="mt-8">
	<div class="flex flex-wrap items-end justify-between gap-2">
		<div>
			<h2 class="text-lg font-semibold text-heading">Kontribusi teratas · {labelLingkup}</h2>
			<p class="mt-1 text-[13px] text-ink-600">
				Papan {labelPeriode.toLowerCase()}, dihitung dari poin yang sudah dibukukan.
			</p>
		</div>
		{#if diperbaruiPada}
			<p class="text-xs text-ink-600">
				Diperbarui {formatTanggal(diperbaruiPada, 'jam')} WIB
			</p>
		{/if}
	</div>

	{#if leaderboard.loading && leaderboard.isEmpty}
		<p class="mt-6 text-sm text-ink-600">Menghitung ulang papan peringkat…</p>
	{:else if leaderboard.isEmpty}
		<div class="mt-4">
			<EmptyState
				icon={ICONS.trophy}
				title="Belum ada kontribusi tercatat pada papan ini"
				message="Papan bulanan dimulai dari nol setiap tanggal 1. Aksi pertama bulan ini akan langsung muncul di sini."
			/>
		</div>
	{:else}
		<Card padding="none" class="mt-4 overflow-hidden">
			{#each leaderboard.entries as entri (entri.awardee.id)}
				<LeaderboardRow
					rank={entri.rank}
					awardee={tampilanBaris(entri)}
					points={entri.points}
					highlight={leaderboard.isMe(entri)}
				/>
			{/each}
		</Card>
		<p class="mt-3 flex items-start gap-1.5 text-xs leading-relaxed text-ink-600">
			<Icon path={ICONS.shield} size={14} class="mt-px shrink-0" />
			Papan ini berhenti di {formatAngka(leaderboard.entries.length)} teratas dan tidak pernah menampilkan
			peringkat terbawah. Awardee yang memilih tampil anonim muncul sebagai inisial dan chapter-nya.
		</p>
	{/if}
</section>

{#if chapterTerurut.length > 0}
	<section class="mt-10">
		<h2 class="text-lg font-semibold text-heading">Papan kolektif chapter</h2>
		<p class="mt-1 text-[13px] leading-relaxed text-ink-600">
			Diukur dengan rata-rata poin per awardee, bukan total. Dengan begitu chapter yang baru
			terbentuk tidak otomatis kalah dari chapter besar — dan naiknya peringkat menjadi kerja bersama
			satu batch, bukan perlombaan antarindividu.
		</p>

		<div class="mt-4 grid gap-3 md:grid-cols-3">
			{#each chapterTerurut as baris, indeks (baris.chapterId)}
				{@const milikSaya = awardee?.chapterId === baris.chapterId}
				{@const tertinggi = chapterTerurut[0].averagePoints}
				<Card padding="md" variant={milikSaya ? 'highlight' : 'default'}>
					<div class="flex items-center justify-between gap-2">
						<p class="text-sm font-semibold text-ink-800">
							{chapter(baris.chapterId).label}
						</p>
						{#if milikSaya}
							<StatusBadge label="Chapter saya" color="blue" size="sm" />
						{:else}
							<span class="numeric text-xs text-ink-600">#{indeks + 1}</span>
						{/if}
					</div>

					<p class="mt-2 text-sm text-ink-700">
						<span class="numeric text-xl font-bold text-ink-900">
							{formatAngka(baris.averagePoints)}
						</span>
						<span class="text-ink-600">poin rata-rata</span>
					</p>

					<div class="mt-3">
						<ProgressBar
							value={baris.averagePoints}
							max={tertinggi}
							size="xs"
							color="var(--color-pertamina-blue)"
							label="Rata-rata poin {chapter(baris.chapterId).label}"
						/>
					</div>

					<p class="mt-2 text-xs text-ink-600">
						{formatAngka(baris.awardeeCount)} awardee tampil · total
						<span class="numeric">{formatAngka(baris.totalPoints)}</span> poin
					</p>
				</Card>
			{/each}
		</div>
	</section>
{/if}
