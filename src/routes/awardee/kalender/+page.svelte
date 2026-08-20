<script>
	/**
	 * HALAMAN: Kalender Komunitas (`/awardee/kalender`).
	 *
	 * Pilar 02 Hal 5: kalender kegiatan upskilling, pertemuan komunitas, dan sharing
	 * session, dibagi per chapter.
	 *
	 * Halaman ini memisahkan dua perbuatan yang sering dikira sama: **mendaftar** dan
	 * **hadir**. Mendaftar adalah niat, dan niat tidak berpoin. Hadir adalah
	 * kontribusi yang benar-benar terjadi, dan itulah yang dihargai Hal 11 dengan 15
	 * poin. Karena itu tab "Mendatang" hanya menawarkan pendaftaran, sedangkan tombol
	 * "Hadiri" baru muncul pada kegiatan yang waktunya sudah berjalan: sesuatu yang
	 * belum terjadi tidak dapat dihadiri.
	 *
	 * Bukti kehadiran diambil dari dokumentasi kegiatan itu sendiri (daftar hadir dan
	 * foto pelaksanaan yang dilampirkan panitia), bukan dikarang di sisi awardee.
	 * Kegiatan yang belum berdokumentasi tetap menerima klaim, tetapi poinnya
	 * menunggu: persis perilaku `GamificationEngine` untuk aksi berbukti, dan
	 * halaman ini menjelaskannya alih-alih menyembunyikannya.
	 *
	 * Sejak V2 halaman ini punya tab ketiga, **"Usulan saya"**. Awardee bukan lagi
	 * sekadar peserta agenda yang disusun orang lain: ia boleh mengusulkan kegiatan
	 * lewat `ContentReviewService.proposeEvent`, dan berhak melihat status usulannya
	 * beserta catatan verifikator: termasuk ketika usulannya ditolak. Usulan yang
	 * hilang tanpa kabar adalah cara tercepat menghentikan orang mengusulkan lagi.
	 *
	 * Perhatikan pemisahan sumber data: tab agenda membaca `catalog.publishedEvents`
	 * (sudah lewat gerbang `isPubliclyVisible`), tab usulan membaca
	 * `editorial.myEvents`. Keduanya sengaja tidak digabung: usulan mentah tidak
	 * boleh pernah ikut tampil sebagai agenda resmi (risiko R-09).
	 *
	 * @see docs/00-SOURCE-BRIEF.md: Hal 5 pilar 02, Hal 11 Attend online session 15 pts
	 * @see docs/12-BUILD-CONTRACT-V2.md: §2.14 route /awardee/kalender, §3.5 WP-05 butir 3
	 * @see docs/10-REVISION-SPEC.md: §5.4 alur usulan kegiatan
	 */

	import { onMount } from 'svelte';
	import {
		Button,
		Card,
		EmptyState,
		EventCard,
		FilterChips,
		Icon,
		ICONS,
		PageHeader,
		PointsChip,
		StatTile,
		StatusBadge,
		Tabs
	} from '$lib/components';
	import { chapter } from '$lib/domain/constants/community.js';
	import { ActivityType, poinUntuk } from '$lib/domain/constants/scoring-table.js';
	import { EVENT_TYPE_META } from '$lib/domain/entities/CommunityEvent.js';
	import { eventRepository } from '$lib/infrastructure/repositories/index.js';
	import { activitySubmissions } from '$lib/stores/activity-submissions.svelte.js';
	import { catalog, CatalogKind } from '$lib/stores/catalog.svelte.js';
	import { editorial } from '$lib/stores/editorial.svelte.js';
	import { gamification } from '$lib/stores/gamification.svelte.js';
	import { session } from '$lib/stores/session.svelte.js';
	import { toast, ToastType } from '$lib/stores/toast.svelte.js';
	import { bagianTanggal } from '$lib/utils/date.js';
	import { formatAngka, formatTanggal } from '$lib/utils/format.js';
	import EventProposalForm from '../_components/EventProposalForm.svelte';
	import ProposalStatusCard from '../_components/ProposalStatusCard.svelte';

	/** Nilai poin kehadiran: dibaca dari tabel kanonik, tidak pernah ditulis literal. */
	const POIN_HADIR = poinUntuk(ActivityType.SESSION_ATTEND);

	/**
	 * Waktu acuan pemisah "mendatang" dan "lampau", dibekukan sekali saat halaman
	 * dibuka. Membaca `new Date()` di dalam ekspresi turunan akan membuat daftar
	 * berpindah tab sendiri di tengah interaksi awardee.
	 */
	const SEKARANG = new Date();

	/** Nilai pil filter untuk "tanpa penyaringan jenis". */
	const SEMUA_JENIS = 'SEMUA';

	const TAB_MENDATANG = 'mendatang';
	const TAB_LAMPAU = 'lampau';
	const TAB_USULAN = 'usulan';

	/** @type {string} */
	let jenis = $state(SEMUA_JENIS);

	/** @type {string} */
	let tabAktif = $state(TAB_MENDATANG);

	/** @type {string|null} Identitas kegiatan yang tombolnya sedang bekerja. */
	let idSedangDiproses = $state(null);
	let fileBukti = $state({});

	const awardee = $derived(session.awardee);

	/** Sisa kuota klaim kehadiran hari ini: rancangan anti-spam, bukan hukuman. */
	const kuotaHadir = $derived(gamification.usageFor(ActivityType.SESSION_ATTEND));

	const opsiJenis = [
		{ id: SEMUA_JENIS, label: 'Semua jenis' },
		...Object.values(EVENT_TYPE_META).map((meta) => ({ id: meta.code, label: meta.label }))
	];

	/**
	 * Agenda resmi, sudah tersaring gerbang publik.
	 *
	 * Sumbernya `catalog.publishedEvents`: yang menerapkan `isPubliclyVisible` :
	 * BUKAN `catalog.events` mentah. Sejak kegiatan punya status `DIUSULKAN`, daftar
	 * mentah memuat usulan yang belum diputuskan siapa pun, dan menampilkannya di
	 * tab "Mendatang" berarti mengumumkan agenda yang belum tentu terjadi. Usulan
	 * milik sendiri punya tabnya sendiri.
	 */
	const agendaResmi = $derived(catalog.publishedEvents);

	const terfilter = $derived(
		jenis === SEMUA_JENIS
			? agendaResmi
			: agendaResmi.filter((kegiatan) => kegiatan.type === jenis)
	);

	const mendatang = $derived(
		terfilter
			.filter((kegiatan) => kegiatan.startsAt > SEKARANG)
			.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
	);

	const lampau = $derived(
		terfilter
			.filter((kegiatan) => kegiatan.startsAt <= SEKARANG)
			.sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime())
	);

	/**
	 * Usulan kegiatan milik akun yang sedang masuk, terbaru lebih dulu.
	 *
	 * Dibaca dari `editorial.myEvents`, yang menyaring lewat `proposedBy` pada
	 * repository: bukan dengan menyaring daftar katalog di sini. Usulan orang lain
	 * bukan urusan halaman ini, dan penyaring yang ditulis di antarmuka akan
	 * membocorkannya pada hari pertama seseorang mengubah urutan `{#each}`.
	 */
	const usulanSaya = $derived(
		[...editorial.myEvents].sort(
			(a, b) => (b.submittedAt?.getTime() ?? 0) - (a.submittedAt?.getTime() ?? 0)
		)
	);

	const usulanMenunggu = $derived(usulanSaya.filter((kegiatan) => kegiatan.isProposal).length);

	const tabs = $derived([
		{ id: TAB_MENDATANG, label: 'Mendatang', count: mendatang.length },
		{ id: TAB_LAMPAU, label: 'Sudah berlangsung', count: lampau.length },
		{ id: TAB_USULAN, label: 'Usulan saya', count: usulanSaya.length }
	]);

	const kehadiranSaya = $derived(
		awardee ? catalog.events.filter((kegiatan) => kegiatan.hasAttended(awardee.id)).length : 0
	);

	const pendaftaranSaya = $derived(
		awardee
			? mendatang.filter((kegiatan) => kegiatan.isRegistered(awardee.id)).length
			: 0
	);

	const belumDiklaim = $derived(
		awardee
			? lampau.filter(
					(kegiatan) =>
						!kegiatan.isCancelled &&
						!kegiatan.hasAttended(awardee.id) &&
						kegiatan.isRegistered(awardee.id)
				).length
			: 0
	);

	onMount(async () => {
		if (!session.ready) await session.hydrate();
		await Promise.all([catalog.load(), editorial.load(), gamification.refresh()]);
	});

	/**
	 * Menyegarkan agenda sesudah sebuah usulan diterima domain.
	 *
	 * Store editorial sudah memuat ulang dirinya sendiri; yang perlu ditarik ulang
	 * di sini hanyalah katalog, supaya usulan yang kelak disetujui muncul di tab
	 * agenda tanpa memuat ulang halaman.
	 * @returns {Promise<void>}
	 */
	async function sesudahUsulanTerkirim() {
		await catalog.refresh();
	}

	/**
	 * Menormalkan pilihan pil filter.
	 *
	 * `FilterChips` melepaskan pilihan menjadi string kosong ketika pil yang sedang
	 * aktif ditekan lagi. Bagi penyaring yang sudah menyediakan opsi "Semua", string
	 * kosong bukan keadaan yang sah: ia akan menyaring jenis kegiatan bernama ""
	 * dan menghasilkan daftar kosong tanpa sebab yang terlihat awardee.
	 *
	 * @param {string|string[]} nilai
	 * @returns {void}
	 */
	function pilihJenis(nilai) {
		jenis = typeof nilai === 'string' && nilai !== '' ? nilai : SEMUA_JENIS;
	}

	/**
	 * Nama chapter penyelenggara. Kegiatan tanpa chapter terbuka untuk semua batch,
	 * dan itu perlu dikatakan: bukan dibiarkan kosong.
	 * @param {import('$lib/domain/entities/CommunityEvent.js').CommunityEvent} kegiatan
	 * @returns {string}
	 */
	function labelChapter(kegiatan) {
		return kegiatan.chapterId ? chapter(kegiatan.chapterId).label : 'Lintas chapter';
	}

	/**
	 * Bentuk yang dibaca `EventCard`. Entity tidak dioper langsung karena komponen
	 * bersama sengaja memakai objek tampilan sederhana (kontrak §5).
	 * @param {import('$lib/domain/entities/CommunityEvent.js').CommunityEvent} kegiatan
	 * @returns {Record<string, unknown>}
	 */
	function tampilanKartu(kegiatan) {
		return {
			id: kegiatan.id,
			title: kegiatan.title,
			startAt: kegiatan.startsAt,
			endAt: kegiatan.endsAt,
			mode: kegiatan.isOnline ? 'ONLINE' : 'OFFLINE',
			location: kegiatan.location,
			chapter: labelChapter(kegiatan),
			quota: kegiatan.quota,
			registered: kegiatan.registeredCount,
			pointsReward: POIN_HADIR,
			status: 'UPCOMING'
		};
	}

	/**
	 * Memberi tahu awardee bahwa aksi memerlukan sesi. Dipakai dua handler sehingga
	 * kalimatnya tidak menyimpang di antara keduanya.
	 * @returns {boolean} true bila sesi awardee tersedia.
	 */
	function pastikanSesi() {
		if (awardee) return true;
		toast.push({
			type: ToastType.INFO,
			title: 'Belum ada sesi awardee',
			message: 'Masuk sebagai awardee PFriends untuk mendaftar dan mencatat kehadiran.'
		});
		return false;
	}

	/**
	 * Mendaftarkan awardee pada kegiatan mendatang.
	 *
	 * Pendaftaran tidak berpoin dengan sengaja: tabel Hal 11 menghargai kehadiran,
	 * bukan niat hadir. Menukar poin dengan pendaftaran akan membuat kuota kegiatan
	 * habis oleh orang yang tidak pernah datang.
	 *
	 * @param {Record<string, unknown>} tampilan Objek tampilan dari `EventCard`.
	 * @returns {Promise<void>}
	 */
	async function daftar(tampilan) {
		if (!pastikanSesi()) return;
		const kegiatan = catalog.byId(CatalogKind.EVENT, /** @type {string} */ (tampilan.id));
		if (!kegiatan || !awardee) return;

		if (kegiatan.isRegistered(awardee.id)) return;
		if (kegiatan.isFull) {
			toast.push({
				type: ToastType.WARNING,
				title: 'Kuota kegiatan sudah penuh',
				message: `Semua kursi "${kegiatan.title}" sudah terisi. Kegiatan sejenis biasanya dibuka kembali awal bulan berikutnya.`
			});
			return;
		}

		idSedangDiproses = kegiatan.id;
		try {
			await eventRepository.register(kegiatan.id);
			await catalog.refresh();
			toast.push({
				type: ToastType.SUCCESS,
				title: 'Kursimu sudah dipesan',
				message: `Sampai jumpa di "${kegiatan.title}" pada ${formatTanggal(kegiatan.startsAt, 'waktu')} WIB. Poin ${POIN_HADIR} diberikan setelah kehadiranmu tercatat.`
			});
		} finally {
			idSedangDiproses = null;
		}
	}

	/**
	 * Mencatat kehadiran awardee dan mengajukan poinnya.
	 *
	 * Urutannya disengaja: mesin gamifikasi memutuskan lebih dulu, dan daftar hadir
	 * kegiatan baru diperbarui bila aksinya benar-benar diterima. Membalik urutan itu
	 * akan menghasilkan awardee yang tercatat hadir pada kegiatan yang klaimnya
	 * ditolak kuota harian: dua halaman yang saling membantah.
	 *
	 * @param {import('$lib/domain/entities/CommunityEvent.js').CommunityEvent} kegiatan
	 * @returns {Promise<void>}
	 */
	async function hadiri(kegiatan) {
		if (!pastikanSesi() || !awardee) return;
		const participant = eventRepository.participantFor(kegiatan.id);
		if (!participant) { toast.push({ type: ToastType.WARNING, title: 'Belum terdaftar', message: 'Hanya peserta yang sudah mendaftar yang dapat mengirim bukti hadir.' }); return; }
		const files = fileBukti[kegiatan.id] ?? [];
		if (files.length === 0) { toast.push({ type: ToastType.WARNING, title: 'Bukti belum dipilih', message: 'Pilih minimal satu foto atau PDF bukti kehadiran.' }); return; }

		idSedangDiproses = kegiatan.id;
		try {
			const existing = activitySubmissions.items.find((row) => row.event === kegiatan.id);
			await activitySubmissions.submitAttendance(kegiatan, files, existing?.status === 'NEEDS_REVISION' ? existing.id : '');
			fileBukti[kegiatan.id] = [];
			await catalog.refresh();
			toast.push({ type: ToastType.SUCCESS, title: 'Bukti hadir terkirim', message: `${POIN_HADIR} poin diberikan setelah bukti disetujui Verifikator.` });
		} catch (error) {
			toast.push({ type: ToastType.ERROR, title: 'Bukti gagal dikirim', message: error?.response?.message || error?.message || 'PocketBase tidak dapat memproses bukti hadir.' });
		} finally {
			idSedangDiproses = null;
		}
	}
</script>

<svelte:head>
	<title>Calendar of Event: PFriends</title>
</svelte:head>

<PageHeader
	eyebrow="Pilar 02 · Kalender Komunitas"
	title="Calendar of Event"
	subtitle="Upskilling, pertemuan chapter, dan sharing session PFriends. Daftar untuk mengamankan kursi, catat kehadiranmu setelah sesi berjalan: dan usulkan sendiri kegiatan yang belum ada."
/>

<div class="mt-5 flex flex-wrap items-center gap-3">
	<Button
		variant="outline"
		iconPath={ICONS.plus}
		onclick={() => (tabAktif = TAB_USULAN)}
	>
		Usulkan kegiatan
	</Button>
	{#if usulanMenunggu > 0}
		<p class="min-w-0 text-[13px] leading-relaxed text-ink-600">
			<span class="font-semibold text-ink-800">{formatAngka(usulanMenunggu)} usulanmu</span> sedang
			menunggu keputusan verifikator.
		</p>
	{/if}
</div>

<div class="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
	<StatTile
		label="Kegiatan mendatang"
		value={mendatang.length}
		hint="Sesuai penyaring jenis aktif"
		iconPath={ICONS.calendar}
		color="var(--color-pertamina-blue)"
	/>
	<StatTile
		label="Kursi saya pesan"
		value={pendaftaranSaya}
		hint="Pendaftaran yang belum berlangsung"
		iconPath={ICONS.check}
		color="var(--color-pertamina-navy)"
	/>
	<StatTile
		label="Kehadiran tercatat"
		value={kehadiranSaya}
		hint="Sepanjang keanggotaanmu"
		iconPath={ICONS.users}
		color="var(--color-success)"
	/>
	<StatTile
		label="Sisa klaim hari ini"
		value={kuotaHadir ? kuotaHadir.remaining : 0}
		unit={kuotaHadir ? `dari ${kuotaHadir.cap}` : ''}
		hint="Batas harian menjaga nilai poin"
		iconPath={ICONS.bolt}
		color="var(--color-tier-champion-ink)"
	/>
</div>

{#if belumDiklaim > 0}
	<Card variant="highlight" class="mt-4">
		<div class="flex flex-wrap items-center gap-3">
			<span
				class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tier-champion-tint text-tier-champion-ink"
			>
				<Icon path={ICONS.bell} size={20} />
			</span>
			<div class="min-w-0 flex-1">
				<p class="text-sm font-semibold text-ink-800">
					{formatAngka(belumDiklaim)} kegiatan menunggu konfirmasi kehadiranmu
				</p>
				<p class="mt-0.5 text-[13px] text-ink-600">
					Kamu terdaftar tetapi kehadiranmu belum tercatat. Buka tab “Sudah berlangsung” dan tekan
					Hadiri untuk mengklaim {POIN_HADIR} poin per sesi.
				</p>
			</div>
			<Button variant="outline" size="sm" onclick={() => (tabAktif = TAB_LAMPAU)}>
				Lihat sekarang
			</Button>
		</div>
	</Card>
{/if}

<div class="mt-6">
	<Tabs {tabs} bind:active={tabAktif} />
</div>

<!-- Penyaring jenis hanya bermakna pada dua tab agenda; tab usulan menampilkan
     seluruh usulan pengusulnya sendiri, dan menyaringnya justru menyembunyikan
     usulan yang sedang ia cari statusnya. -->
{#if tabAktif !== TAB_USULAN}
	<div class="mt-4">
		<FilterChips
			options={opsiJenis}
			bind:selected={jenis}
			onchange={pilihJenis}
			showClear={false}
			label="Penyaring jenis kegiatan"
		/>
	</div>
{/if}

{#if catalog.loading && agendaResmi.length === 0 && tabAktif !== TAB_USULAN}
	<p class="mt-8 text-sm text-ink-600">Memuat agenda komunitas…</p>
{:else if tabAktif === TAB_MENDATANG}
	{#if mendatang.length === 0}
		<div class="mt-6">
			<EmptyState
				icon={ICONS.calendar}
				title="Belum ada kegiatan terjadwal"
				message="Agenda baru biasanya diumumkan awal bulan lewat Kabar PFriends. Sementara menunggu, kamu bisa menelusuri kegiatan yang sudah berlangsung."
				actionLabel="Lihat kegiatan lampau"
				onAction={() => (tabAktif = TAB_LAMPAU)}
			/>
		</div>
	{:else}
		<!-- Dua penjaga lebar, keduanya pada butir grid: bukan di dalam `EventCard`,
		     yang komponen bersama dan bukan milik paket ini.

		     `min-w-0`: butir grid berbaku `min-width: auto`, sehingga kartu tidak pernah
		     menyusut di bawah lebar min-content-nya (422 px) dan halaman ikut menggulir
		     mendatar di 375 px.

		     `overflow-hidden`: `EventCard` merender lokasi sebagai `<span class="truncate">`
		     yang induk `inline-flex`-nya tidak ber-`min-w-0`, jadi pemotongannya tidak
		     pernah aktif dan nama tempat yang panjang tetap menjulur ~78 px. Menahannya di
		     tepi kartu membuat luberan itu tidak lagi merambat ke dokumen. Bayangan kartu
		     tidak terpotong: `overflow` hanya mengurung keturunan, bukan kotak elemennya
		     sendiri. Akar masalahnya dilaporkan ke pemilik `EventCard`. -->
		<div class="mt-6 grid gap-4 md:grid-cols-2 [&>*]:min-w-0 [&>*]:overflow-hidden">
			{#each mendatang as kegiatan (kegiatan.id)}
				<EventCard
					event={tampilanKartu(kegiatan)}
					isRegistered={awardee ? kegiatan.isRegistered(awardee.id) : false}
					onAttend={daftar}
				/>
			{/each}
		</div>
		<p class="mt-4 text-[13px] leading-relaxed text-ink-600">
			Pendaftaran mengamankan kursimu dan belum menambah poin. {POIN_HADIR} poin diberikan setelah
			kehadiranmu dikonfirmasi pada tab “Sudah berlangsung”.
		</p>
	{/if}
{:else if tabAktif === TAB_USULAN}
	<!-- Tab "Usulan saya": status tiap usulan + catatan verifikator, lalu formulir. -->
	<div class="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
		<div class="min-w-0">
			<div class="flex flex-wrap items-baseline justify-between gap-2">
				<h2 class="text-base font-bold text-heading">Status usulan saya</h2>
				{#if usulanMenunggu > 0}
					<StatusBadge
						label="{formatAngka(usulanMenunggu)} menunggu keputusan"
						color="purple"
						size="sm"
						withDot
					/>
				{/if}
			</div>

			{#if !awardee}
				<div class="mt-4">
					<EmptyState
						icon={ICONS.user}
						title="Sesi awardee belum termuat"
						message="Masuk sebagai awardee PFriends untuk mengusulkan kegiatan dan melihat status usulanmu."
						actionLabel="Ke halaman Masuk"
						actionHref="/masuk"
					/>
				</div>
			{:else if editorial.loading && usulanSaya.length === 0}
				<p class="mt-4 text-sm text-ink-600">Memuat usulanmu…</p>
			{:else if usulanSaya.length === 0}
				<div class="mt-4">
					<EmptyState
						icon={ICONS.calendar}
						title="Kamu belum pernah mengusulkan kegiatan"
						message="Kegiatan komunitas tidak harus datang dari Pertamina Foundation. Usulkan kelas, pertemuan, atau sharing session yang kamu butuhkan lewat formulir di samping: verifikator akan memutuskannya beserta alasannya."
						size="sm"
					/>
				</div>
			{:else}
				<div class="mt-4 space-y-4">
					{#each usulanSaya as kegiatan (kegiatan.id)}
						<ProposalStatusCard event={kegiatan} />
					{/each}
				</div>
			{/if}
		</div>

		<div class="min-w-0">
			<EventProposalForm {awardee} onsubmitted={sesudahUsulanTerkirim} />
		</div>
	</div>
{:else if lampau.length === 0}
	<div class="mt-6">
		<EmptyState
			icon={ICONS.clock}
			title="Belum ada kegiatan yang berlangsung"
			message="Kegiatan yang sudah lewat akan muncul di sini beserta tombol konfirmasi kehadiran."
			actionLabel="Lihat agenda mendatang"
			onAction={() => (tabAktif = TAB_MENDATANG)}
		/>
	</div>
{:else}
	<div class="mt-6 space-y-3">
		{#each lampau as kegiatan (kegiatan.id)}
			{@const sudahHadir = awardee ? kegiatan.hasAttended(awardee.id) : false}
			{@const tanggal = bagianTanggal(kegiatan.startsAt)}
			{@const participant = eventRepository.participantFor(kegiatan.id)}
			{@const attendanceSubmission = activitySubmissions.items.find((row) => row.event === kegiatan.id)}
			<Card padding="md">
				<div class="flex items-start gap-4">
					{#if tanggal}
						<div
							class="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-ink-100"
						>
							<span class="numeric text-2xl leading-none text-ink-800">{tanggal.tanggal}</span>
							<span class="label-micro mt-1">{tanggal.bulan}</span>
						</div>
					{/if}

					<div class="min-w-0 flex-1">
						<div class="flex flex-wrap items-center gap-1.5">
							<StatusBadge
								label={kegiatan.typeMeta.label}
								color={kegiatan.typeMeta.badgeColor}
								size="sm"
							/>
							<StatusBadge
								label={kegiatan.statusMeta.label}
								color={kegiatan.statusMeta.badgeColor}
								size="sm"
								withDot
							/>
							<span class="text-xs text-ink-600">{labelChapter(kegiatan)}</span>
						</div>

						<h3 class="mt-1.5 text-base font-semibold text-ink-800">{kegiatan.title}</h3>

						<div class="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-600">
							<span class="inline-flex items-center gap-1">
								<Icon path={ICONS.clock} size={14} />
								{formatTanggal(kegiatan.startsAt, 'waktu')} WIB
							</span>
							{#if kegiatan.location}
								<span class="inline-flex items-center gap-1">
									<Icon path={ICONS.mapPin} size={14} />
									{kegiatan.location}
								</span>
							{/if}
							{#if kegiatan.speakerName}
								<span class="inline-flex items-center gap-1">
									<Icon path={ICONS.user} size={14} />
									{kegiatan.speakerName}
								</span>
							{/if}
						</div>

						{#if kegiatan.outcomeNote}
							<p class="mt-2 text-[13px] leading-relaxed text-ink-600">{kegiatan.outcomeNote}</p>
						{/if}

						<p class="mt-2 text-xs text-ink-600">
							<span class="numeric font-semibold text-ink-700">
								{formatAngka(kegiatan.attendeeCount)}
							</span>
							awardee hadir dari {formatAngka(kegiatan.registeredCount)} yang mendaftar
						</p>
					</div>
				</div>

				<div
					class="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-3"
				>
					<div class="min-w-0">
						<PointsChip points={POIN_HADIR} currency="PK" size="sm" signed />
						{#if !kegiatan.hasEvidence && !kegiatan.isCancelled}
							<p class="mt-1.5 flex items-start gap-1.5 text-xs leading-relaxed text-warning">
								<Icon path={ICONS.info} size={14} class="mt-px shrink-0" />
								Dokumentasi pelaksanaan belum dilampirkan panitia. Klaimmu tetap tercatat, poinnya
								menyusul setelah bukti tersedia.
							</p>
						{/if}
					</div>

					{#if kegiatan.isCancelled}
						<StatusBadge label="Kegiatan dibatalkan" color="slate" />
					{:else if sudahHadir}
						<StatusBadge label="Kehadiran tercatat" color="green" withDot iconPath={ICONS.check} />
					{:else if !participant}
						<StatusBadge label="Tidak terdaftar" color="slate" />
					{:else}
						<div class="flex min-w-0 flex-col items-end gap-2">
							{#if attendanceSubmission && attendanceSubmission.status !== 'NEEDS_REVISION'}
								<StatusBadge label={attendanceSubmission.status === 'APPROVED' ? 'Bukti disetujui' : 'Bukti sedang diperiksa'} color={attendanceSubmission.status === 'APPROVED' ? 'green' : 'blue'} withDot />
							{:else}
								<input type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" class="max-w-64 text-xs" onchange={(e) => (fileBukti[kegiatan.id] = [...e.currentTarget.files])} />
								<Button size="sm" loading={idSedangDiproses === kegiatan.id} disabled={idSedangDiproses !== null || (fileBukti[kegiatan.id]?.length ?? 0) === 0} onclick={() => hadiri(kegiatan)}>{attendanceSubmission ? 'Kirim ulang bukti' : 'Upload bukti hadir'}</Button>
							{/if}
						</div>
					{/if}
				</div>
			</Card>
		{/each}
	</div>

	{#if kuotaHadir?.exhausted}
		<p class="mt-4 text-[13px] leading-relaxed text-ink-600">
			Kuota klaim kehadiran hari ini sudah penuh ({kuotaHadir.cap} sesi). Batas ini menjaga agar poin
			tetap menandai kontribusi yang sungguh terjadi: kegiatan lain dapat diklaim besok.
		</p>
	{/if}
{/if}
