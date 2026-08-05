<script>
	/**
	 * HALAMAN — Dasbor Awardee.
	 *
	 * Tanggung jawab: menjawab satu pertanyaan, *"apa yang perlu saya lakukan hari
	 * ini?"*, dan membuat jawabannya dapat dikerjakan tanpa berpindah halaman.
	 *
	 * Susunannya mengikuti urutan itu, bukan urutan kepentingan data. Saldo poin
	 * dan tier lebih dulu karena itu konteks yang membuat aksi berikutnya masuk
	 * akal; aksi cepat menyusul karena itulah satu-satunya bagian yang bisa
	 * *dikerjakan*; kabar dan ringkasan ESG terakhir karena keduanya bacaan.
	 *
	 * Tiga dari empat aksi cepat memberi poin SEKETIKA — bukan membuka formulir
	 * yang meminta bukti lebih dulu. Aksi cepat yang ternyata masih menuntut
	 * langkah lain bukan aksi cepat, dan kekecewaan itu terjadi setelah awardee
	 * terlanjur menekan. Aksi keempat memang membutuhkan tautan bukti, dan justru
	 * karena itu ia ditandai eksplisit dan mengantar ke tempat buktinya diisi.
	 *
	 * Tidak ada satu pun angka poin di berkas ini. Seluruhnya dibaca dari
	 * `aturanSkor()`, dan sisa kuota dibaca dari `gamification.usageFor()` yang
	 * bersumber pada AntiGamingPolicy.
	 *
	 * @see docs/00-SOURCE-BRIEF.md — Hal 11 tabel skor, Hal 12 tier
	 * @see docs/07-UX-SITEMAP.md — §5.2 wireframe dasbor awardee
	 */
	import { onMount } from 'svelte';
	import {
		Button,
		Card,
		EmptyState,
		EventListPanel,
		Icon,
		PointsChip,
		StatusBadge,
		TierProgress,
		ICONS
	} from '$lib/components';
	import { eventCardVM } from '$lib/components/editorial/view-model.js';
	import {
		ESG_ELIGIBLE_ACTIVITIES,
		ESG_PILLARS
	} from '$lib/domain/constants/esg-taxonomy.js';
	import { ActivityType, aturanSkor, poinUntuk } from '$lib/domain/constants/scoring-table.js';
	import { catalog } from '$lib/stores/catalog.svelte.js';
	import { editorial } from '$lib/stores/editorial.svelte.js';
	import { gamification } from '$lib/stores/gamification.svelte.js';
	import { session } from '$lib/stores/session.svelte.js';
	import { formatAngka, formatRelatif, formatTanggal, frasaHitung } from '$lib/utils/format.js';

	/** Banyaknya kabar terbaru yang diringkas di dasbor. */
	const JUMLAH_KABAR_SOROTAN = 3;

	/** Banyaknya baris agenda yang muat di dasbor tanpa mendorong kabar keluar layar. */
	const JUMLAH_AGENDA_SOROTAN = 4;

	/** Poin yang menunggu di tiap kabar yang belum diklaim — dari tabel kanonik. */
	const poinBaca = poinUntuk(ActivityType.BROADCAST_VIEW);

	const awardee = $derived(session.awardee);

	/** Kabar yang sudah pernah diklaim poin bacanya, dibaca dari buku besar. */
	const kabarSudahDiklaim = $derived(
		new Set(
			gamification.ledger
				.filter((entri) => entri.activityType === ActivityType.BROADCAST_VIEW)
				.map((entri) => entri.refId)
				.filter(Boolean)
		)
	);

	const kabarTerbaru = $derived(catalog.sentBroadcasts.slice(0, JUMLAH_KABAR_SOROTAN));

	/**
	 * Agenda terdekat sebagai view-model `EventListPanel`.
	 *
	 * Panelnya adalah komponen BERSAMA — yang sama dipakai beranda publik, dua
	 * halaman cerita, dan dasbor verifikator. Membuat kembarannya khusus zona ini
	 * berarti lima daftar agenda yang perlahan berbeda perilaku (KP-3).
	 *
	 * Pemetanya pun tunggal: `eventCardVM`, satu-satunya penerjemah entity kegiatan
	 * menjadi baris agenda di seluruh proyek.
	 * @type {import('$lib/components/editorial/view-model.js').EventCardVM[]}
	 */
	const agendaTerdekat = $derived(
		catalog.upcomingEvents(new Date(), JUMLAH_AGENDA_SOROTAN).map((kegiatan) => ({
			...eventCardVM(kegiatan),
			href: `/awardee/kalender`
		}))
	);

	/** Naskah yang dikembalikan verifikator dan menunggu diperbaiki penulisnya. */
	const naskahPerluRevisi = $derived(
		editorial.myStories.filter((cerita) => cerita.needsRevision)
	);

	/**
	 * Kabar yang menjadi sasaran aksi cepat.
	 *
	 * Yang dipilih adalah kabar terbaru yang poinnya BELUM diklaim, bukan sekadar
	 * yang paling baru. Menawarkan aksi pada kabar yang sudah selesai dikerjakan
	 * membuat tombol utama dasbor mati sejak dibuka — padahal masih ada kabar lain
	 * yang poinnya menunggu.
	 */
	const kabarSasaran = $derived(
		catalog.sentBroadcasts.find((kabar) => !kabarSudahDiklaim.has(kabar.id)) ??
			catalog.sentBroadcasts[0] ??
			null
	);

	const bacaSudahDiklaim = $derived(
		kabarSasaran !== null && kabarSudahDiklaim.has(kabarSasaran.id)
	);

	/**
	 * Empat aksi cepat beserta keadaan kuotanya.
	 *
	 * `mode` membedakan aksi yang langsung membukukan poin dari aksi yang menuntut
	 * bukti. Perbedaan itu ditampilkan apa adanya di kartu — awardee berhak tahu
	 * mana yang selesai dalam satu ketukan sebelum menekannya.
	 */
	const aksiCepat = $derived.by(() => {
		if (!kabarSasaran) return [];

		/** @type {{type: string, iconPath: string, cara: string, mode: 'langsung'|'bukti', href?: string, selesai?: boolean, catatan?: string}[]} */
		const daftar = [
			{
				type: ActivityType.BROADCAST_VIEW,
				iconPath: ICONS.book,
				cara: `Simak "${kabarSasaran.title}" lalu tandai sudah dibaca.`,
				mode: 'langsung',
				selesai: bacaSudahDiklaim,
				catatan: kabarSasaran.title
			},
			{
				type: ActivityType.CTA_REACT,
				iconPath: ICONS.sparkles,
				cara: kabarSasaran.hasCta
					? kabarSasaran.lightCta
					: 'Tanggapi ajakan ringan pada kabar terbaru komunitas.',
				mode: 'langsung',
				catatan: kabarSasaran.hasCta ? kabarSasaran.lightCta : kabarSasaran.title
			},
			{
				type: ActivityType.SHARE_PRIVATE,
				iconPath: ICONS.whatsapp,
				cara: 'Teruskan kabar ini ke grup WhatsApp atau jaringan pribadimu.',
				mode: 'langsung',
				catatan: `Dibagikan ke jaringan pribadi: ${kabarSasaran.title}`
			},
			{
				type: ActivityType.SHARE_PUBLIC,
				iconPath: ICONS.share,
				cara: 'Unggah ke media sosial publik, lalu lampirkan tautan unggahannya.',
				mode: 'bukti',
				href: `/awardee/kabar/${kabarSasaran.id}`
			}
		];

		return daftar.map((aksi) => ({
			...aksi,
			rule: aturanSkor(aksi.type),
			kuota: gamification.usageFor(aksi.type)
		}));
	});

	/**
	 * Ringkasan kontribusi ESG awardee.
	 *
	 * Hanya aksi yang memang layak naik menjadi bukti dampak yang dihitung — peta
	 * `ESG_ELIGIBLE_ACTIVITIES` yang memutuskan, bukan halaman ini. Menghitung
	 * seluruh aksi berpoin akan mengubah aktivitas amplifikasi menjadi klaim
	 * dampak, persis yang dilarang docs/04 §2.2.
	 */
	const ringkasanEsg = $derived.by(() => {
		/** @type {Map<string, number>} */
		const jumlahPerPilar = new Map(ESG_PILLARS.map((pilar) => [pilar.pillar, 0]));
		let total = 0;

		for (const entri of gamification.ledger) {
			if (!entri.isAwarded) continue;
			const pemetaan = ESG_ELIGIBLE_ACTIVITIES[entri.activityType];
			if (!pemetaan) continue;
			jumlahPerPilar.set(pemetaan.pillar, (jumlahPerPilar.get(pemetaan.pillar) ?? 0) + 1);
			total += 1;
		}

		return {
			total,
			baris: ESG_PILLARS.map((pilar) => ({
				pillar: pilar.pillar,
				label: pilar.label,
				ink: pilar.ink,
				tint: pilar.tint,
				jumlah: jumlahPerPilar.get(pilar.pillar) ?? 0
			}))
		};
	});

	// Antrean editorial dimuat di sini, bukan di layout: hanya dasbor dan dua
	// halaman yang membutuhkannya, dan store menahan pemanggilan serentak pada satu
	// janji yang sama sehingga pemanggilan ganda tidak berarti dua pembacaan.
	onMount(async () => {
		await editorial.load();
	});

	/**
	 * Membukukan sebuah aksi cepat.
	 * @param {{type: string, catatan?: string}} aksi
	 * @returns {Promise<void>}
	 */
	async function lakukan(aksi) {
		if (!kabarSasaran) return;
		await gamification.perform(aksi.type, {
			refId: aksi.type === ActivityType.BROADCAST_VIEW ? kabarSasaran.id : null,
			note: aksi.catatan ?? null
		});
	}

	/**
	 * Kalimat sisa kuota yang menjelaskan, bukan sekadar melarang.
	 * @param {import('$lib/domain/services/GamificationEngine.js').DailyUsageRow|null} kuota
	 * @returns {string}
	 */
	function kalimatKuota(kuota) {
		if (!kuota) return '';
		if (kuota.exhausted) return 'Kuota hari ini penuh — kembali besok';
		return `Sisa ${frasaHitung(kuota.remaining, 'kali')} hari ini`;
	}
</script>

<svelte:head>
	<title>Dasbor Awardee · Pfriends</title>
</svelte:head>

{#if !awardee}
	<EmptyState
		title="Data awardee belum termuat"
		message="Sesi kamu sedang dipulihkan. Bila keadaan ini bertahan, masuk ulang lewat halaman Masuk."
		iconPath={ICONS.user}
		actionLabel="Ke halaman Masuk"
		actionHref="/masuk"
	/>
{:else}
	<!-- S1 · Sapaan -->
	<header class="mb-5">
		<h1 class="text-xl font-extrabold text-heading sm:text-2xl">
			Halo, {awardee.fullName.split(' ')[0]}!
		</h1>
		<p class="mt-1 text-sm text-ink-600">
			{awardee.communityDef.akronim} · {awardee.chapterDef.label}
			{#if awardee.city}· {awardee.city}{/if}
		</p>
	</header>

	<div class="grid gap-4 lg:grid-cols-3">
		<!-- S2 · Kartu poin & tier — bagian paling menonjol di halaman ini. -->
		<Card padding="lg" class="lg:col-span-2">
			<div class="flex flex-wrap items-start justify-between gap-4">
				<div>
					<p class="label-micro">Poin Kontribusi</p>
					<p class="numeric mt-1 text-5xl leading-none font-extrabold text-heading">
						{formatAngka(gamification.points)}
					</p>
					<p class="mt-2 text-xs text-ink-600">
						Terkumpul dari {frasaHitung(gamification.ledger.length, 'aksi')} yang tercatat
					</p>
				</div>

				<div class="flex flex-col items-end gap-2">
					<PointsChip points={gamification.coins} currency="KT" size="sm" />
					<span
						class="inline-flex items-center gap-1.5 rounded-chip bg-warning-tint px-2.5 py-1 text-xs font-semibold text-warning"
					>
						<Icon path={ICONS.fire} size={14} />
						Streak {frasaHitung(gamification.streakWeeks, 'minggu')}
					</span>
				</div>
			</div>

			<div class="mt-6 border-t border-ink-100 pt-5">
				<TierProgress points={gamification.points} />
			</div>
		</Card>

		<!-- Kontribusi ESG -->
		<Card padding="lg">
			<div class="flex items-center gap-2">
				<Icon path={ICONS.leaf} size={18} class="text-esg-e-ink" />
				<h2 class="text-sm font-bold text-heading">Kontribusi ESG</h2>
			</div>
			<p class="mt-1 text-xs text-ink-600">
				Aksi yang layak diangkat menjadi bukti dampak Pertamina Foundation.
			</p>

			{#if ringkasanEsg.total === 0}
				<p class="mt-4 rounded-xl bg-surface-soft p-3 text-xs leading-relaxed text-ink-600">
					Belum ada aksi yang masuk kategori bukti ESG. Mengirim cerita, menghadiri sesi, menjadi
					narasumber, atau memimpin aksi lokal akan mengisi bagian ini.
				</p>
			{:else}
				<ul class="mt-4 space-y-2.5">
					{#each ringkasanEsg.baris as pilar (pilar.pillar)}
						<li class="flex items-center justify-between gap-3">
							<span class="flex items-center gap-2 text-sm text-ink-700">
								<span
									class="inline-flex h-6 w-6 items-center justify-center rounded-lg text-[11px] font-bold"
									style="background:var(--color-{pilar.tint});color:var(--color-{pilar.ink});"
								>
									{pilar.pillar}
								</span>
								{pilar.label}
							</span>
							<span class="numeric text-sm font-bold text-ink-900">{formatAngka(pilar.jumlah)}</span>
						</li>
					{/each}
				</ul>
				<p class="mt-4 border-t border-ink-100 pt-3 text-xs text-ink-600">
					Total {frasaHitung(ringkasanEsg.total, 'aksi')} berpotensi menjadi bukti ESG.
				</p>
			{/if}
		</Card>
	</div>

	<!-- S3 · Aksi cepat -->
	<section class="mt-6" aria-labelledby="judul-aksi-cepat">
		<div class="mb-3 flex flex-wrap items-baseline justify-between gap-2">
			<h2 id="judul-aksi-cepat" class="text-base font-bold text-heading">Aksi cepat hari ini</h2>
			<a
				href="/awardee/aksi"
				class="text-sm font-semibold text-pertamina-red-ink transition-colors hover:text-pertamina-red"
			>
				Lihat 9 jenis aksi
			</a>
		</div>

		{#if aksiCepat.length === 0}
			<EmptyState
				title="Belum ada kabar yang dapat ditindaklanjuti"
				message="Kabar mingguan Pfriends terbit setiap Selasa pagi. Begitu terbit, aksi cepat akan muncul di sini."
				iconPath={ICONS.megaphone}
				size="sm"
			/>
		{:else}
			<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
				{#each aksiCepat as aksi (aksi.type)}
					{@const habis = Boolean(aksi.kuota?.exhausted)}
					{@const terkunci = habis || aksi.selesai === true}
					<Card padding="md" class="flex h-full flex-col">
						<div class="flex items-start justify-between gap-2">
							<span
								class="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-pertamina-navy-tint text-pertamina-navy"
								aria-hidden="true"
							>
								<Icon path={aksi.iconPath} size={18} />
							</span>
							<PointsChip points={aksi.rule.points} currency="PK" size="sm" showLabel={false} />
						</div>

						<h3 class="mt-3 text-sm font-bold text-heading">{aksi.rule.label}</h3>
						<p class="mt-1 flex-1 text-xs leading-relaxed text-ink-600">{aksi.cara}</p>

						<p class="mt-3 text-[11px] {habis ? 'text-warning' : 'text-ink-600'}">
							{#if aksi.selesai}
								Poin kabar ini sudah kamu klaim
							{:else if aksi.mode === 'bukti'}
								Poin cair setelah tautan bukti dilampirkan
							{:else}
								{kalimatKuota(aksi.kuota)}
							{/if}
						</p>

						<div class="mt-3">
							{#if aksi.mode === 'bukti'}
								<Button variant="outline" size="sm" fullWidth href={aksi.href}>
									Lampirkan bukti
								</Button>
							{:else}
								<Button
									variant={terkunci ? 'ghost' : 'primary'}
									size="sm"
									fullWidth
									disabled={terkunci}
									loading={gamification.busy === aksi.type}
									onclick={() => lakukan(aksi)}
								>
									{#if aksi.selesai}
										Sudah diklaim
									{:else if habis}
										Kuota penuh
									{:else}
										Lakukan sekarang
									{/if}
								</Button>
							{/if}
						</div>
					</Card>
				{/each}
			</div>

			<p class="mt-3 text-xs leading-relaxed text-ink-600">
				Batas harian tiap aksi adalah rancangan anti-spam yang menjaga nilai poin, bukan hukuman.
				Kuota yang penuh selalu pulih keesokan harinya.
			</p>
		{/if}
	</section>

	<!-- S4 · Agenda terdekat & ruang cerita. Dua kolom yang tidak seukuran: agenda
	     adalah bacaan, ruang cerita adalah ajakan bertindak. -->
	<section class="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
		<div class="min-w-0">
			<EventListPanel
				events={agendaTerdekat}
				limit={JUMLAH_AGENDA_SOROTAN}
				title="Agenda terdekat"
				href="/awardee/kalender"
				thumbnailAt={2}
				emptyMessage="Belum ada agenda terjadwal. Kegiatan baru diumumkan tiap awal bulan — dan kamu boleh mengusulkan sendiri lewat tab “Usulan saya” di Kalender."
			/>
		</div>

		<Card padding="lg" class="min-w-0">
			<p class="label-micro">Ruang Cerita</p>
			{#if naskahPerluRevisi.length > 0}
				<h2 class="mt-1.5 text-base font-bold text-heading">
					{frasaHitung(naskahPerluRevisi.length, 'naskah')} menunggu perbaikanmu
				</h2>
				<p class="mt-1.5 text-[13px] leading-relaxed text-ink-600">
					Verifikator sudah menuliskan apa yang perlu diubah. Catatannya menyertai tiap naskah di
					Ruang Cerita.
				</p>
				<div class="mt-4">
					<Button size="sm" fullWidth href="/awardee/cerita" iconPath={ICONS.edit}>
						Baca catatan verifikator
					</Button>
				</div>
			{:else}
				<h2 class="mt-1.5 text-base font-bold text-heading">Ada yang layak diceritakan?</h2>
				<p class="mt-1.5 text-[13px] leading-relaxed text-ink-600">
					Satu aksi kecil bulan ini sudah cukup menjadi cerita. Naskah yang lolos tinjauan tayang di
					ruang publik dan menjadi bahan laporan ESG Pertamina Foundation.
				</p>
				<div class="mt-4 space-y-2">
					<Button size="sm" fullWidth href="/awardee/cerita/tulis" iconPath={ICONS.edit}>
						Tulis cerita
					</Button>
					<Button variant="secondary" size="sm" fullWidth href="/awardee/cerita">
						Lihat naskah saya
					</Button>
				</div>
			{/if}
		</Card>
	</section>

	<!-- S5 · Kabar terbaru -->
	<section class="mt-8" aria-labelledby="judul-kabar">
		<div class="mb-3 flex flex-wrap items-baseline justify-between gap-2">
			<h2 id="judul-kabar" class="text-base font-bold text-heading">Kabar terbaru</h2>
			<a
				href="/awardee/kabar"
				class="text-sm font-semibold text-pertamina-red-ink transition-colors hover:text-pertamina-red"
			>
				Semua kabar
			</a>
		</div>

		{#if kabarTerbaru.length === 0}
			<EmptyState
				title="Belum ada kabar baru"
				message="Kabar mingguan Pfriends terbit setiap Selasa pagi."
				iconPath={ICONS.megaphone}
				size="sm"
			/>
		{:else}
			<ul class="grid gap-3 lg:grid-cols-3">
				{#each kabarTerbaru as kabar (kabar.id)}
					{@const belumDiklaim = !kabarSudahDiklaim.has(kabar.id)}
					<li>
						<Card variant="interactive" padding="md" href="/awardee/kabar/{kabar.id}" class="h-full">
							<div class="flex items-center justify-between gap-2">
								<span class="label-micro">{kabar.channelLabel}</span>
								{#if belumDiklaim}
									<StatusBadge label="+{poinBaca} poin menunggu" color="amber" size="sm" withDot />
								{:else}
									<StatusBadge label="Sudah dibaca" color="green" size="sm" />
								{/if}
							</div>
							<h3 class="mt-2 line-clamp-2 text-sm font-bold text-heading">{kabar.title}</h3>
							<p class="mt-1 line-clamp-2 text-xs leading-relaxed text-ink-600">{kabar.summary}</p>
							<p class="mt-3 text-[11px] text-ink-600">
								{formatTanggal(kabar.sentAt, 'pendek')} · {formatRelatif(kabar.sentAt)}
							</p>
						</Card>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
{/if}
