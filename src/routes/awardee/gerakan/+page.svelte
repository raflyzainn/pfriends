<script>
	/**
	 * HALAMAN — Gerakan Bersama (`/awardee/gerakan`).
	 *
	 * Pilar 03 Hal 5: menginisiasi gerakan bersama selaras fokus keberlanjutan
	 * Pertamina — aksi lingkungan, edukasi masyarakat, pemberdayaan ekonomi.
	 *
	 * Halaman ini adalah tempat poin tertinggi Hal 11 benar-benar dapat diraih:
	 * memimpin aksi lapangan bernilai 50 poin. Yang perlu dijaga adalah agar 50 poin
	 * itu tidak berubah menjadi tombol yang bisa ditekan siapa saja kapan saja.
	 * Karena itu pelaporan aksi menuntut bukti yang sama dengan gerbang bukti ESG
	 * Hal 12, dan kelengkapannya diperlihatkan hidup di dalam formulir — awardee
	 * melihat apa yang masih kurang sebelum menekan kirim, bukan setelahnya.
	 *
	 * Satu syarat gerbang ESG sengaja sudah terpenuhi tanpa diisi ulang: tag ESG dan
	 * SDG diwarisi dari gerakan induknya. Itu keputusan `Movement` — gerakan tidak
	 * boleh berjalan tanpa tag — dan halaman ini hanya menampilkannya, bukan meminta
	 * awardee lapangan mengingat taksonomi.
	 *
	 * @see docs/00-SOURCE-BRIEF.md — Hal 5 pilar 03, Hal 11 Lead local action 50 pts, Hal 12 bukti ESG
	 * @see docs/12-BUILD-CONTRACT-V2.md — §2.14 route /awardee/gerakan
	 */

	import { onMount } from 'svelte';
	import {
		Button,
		Card,
		EmptyState,
		FilterChips,
		Icon,
		ICONS,
		Modal,
		MovementCard,
		PageHeader,
		PointsChip,
		ProgressBar,
		StatTile,
		StatusBadge
	} from '$lib/components';
	import { ESG_EVIDENCE_GATE } from '$lib/domain/constants/esg-taxonomy.js';
	import { ActivityType, poinUntuk } from '$lib/domain/constants/scoring-table.js';
	import { MOVEMENT_CATEGORY_META, MovementStatus } from '$lib/domain/entities/Movement.js';
	import { movementRepository } from '$lib/infrastructure/repositories/index.js';
	import { catalog, CatalogKind } from '$lib/stores/catalog.svelte.js';
	import { gamification } from '$lib/stores/gamification.svelte.js';
	import { session } from '$lib/stores/session.svelte.js';
	import { toast, ToastType } from '$lib/stores/toast.svelte.js';
	import { formatAngka, formatRentangTanggal, formatTanggal } from '$lib/utils/format.js';

	/** Nilai poin memimpin aksi lokal — dari tabel kanonik Hal 11. */
	const POIN_MEMIMPIN = poinUntuk(ActivityType.LEAD_ACTION);

	/** Nilai pil filter untuk "tanpa penyaringan kategori". */
	const SEMUA_KATEGORI = 'SEMUA';

	/** Dua peran yang mungkin dipegang seorang awardee dalam satu aksi lapangan. */
	const Peran = Object.freeze({
		MEMIMPIN: 'MEMIMPIN',
		PESERTA: 'PESERTA'
	});

	/** Panjang catatan hasil yang dianggap memadai sebagai bukti — pedoman tulis, bukan aturan domain. */
	const TARGET_KARAKTER_CATATAN = 200;

	/**
	 * Tanggal hari ini dalam format kolom `<input type="date">`, dihitung dari waktu
	 * lokal. `toISOString()` tidak dipakai karena ia menggeser tanggal ke UTC dan
	 * dapat memundurkan satu hari bagi awardee di zona WIB.
	 * @param {Date} tanggal
	 * @returns {string}
	 */
	function isoLokal(tanggal) {
		const dua = (/** @type {number} */ nilai) => String(nilai).padStart(2, '0');
		return `${tanggal.getFullYear()}-${dua(tanggal.getMonth() + 1)}-${dua(tanggal.getDate())}`;
	}

	const HARI_INI = isoLokal(new Date());

	/** @type {string} */
	let kategori = $state(SEMUA_KATEGORI);

	/** @type {string|null} Identitas gerakan yang tombolnya sedang bekerja. */
	let idSedangDiproses = $state(null);

	/** @type {import('$lib/domain/entities/Movement.js').Movement|null} Gerakan yang sedang dilaporkan. */
	let gerakanDilaporkan = $state.raw(null);

	/** @type {boolean} */
	let sedangMengirim = $state(false);

	// ── Isian formulir laporan aksi lapangan ────────────────────────────────
	let formTanggal = $state(HARI_INI);
	let formLokasi = $state('');
	let formPeserta = $state('');
	let formPeran = $state(Peran.MEMIMPIN);
	let formCatatan = $state('');
	let formBukti = $state('');

	const awardee = $derived(session.awardee);

	const opsiKategori = [
		{ id: SEMUA_KATEGORI, label: 'Semua kategori' },
		...Object.values(MOVEMENT_CATEGORY_META).map((meta) => ({ id: meta.code, label: meta.label }))
	];

	const terfilter = $derived(
		kategori === SEMUA_KATEGORI
			? catalog.movements
			: catalog.movements.filter((gerakan) => gerakan.category === kategori)
	);

	const gerakanSaya = $derived(
		awardee ? terfilter.filter((gerakan) => gerakan.hasJoined(awardee.id)) : []
	);

	const dapatDiikuti = $derived(
		terfilter.filter(
			(gerakan) => gerakan.isOpenForJoin && !(awardee && gerakan.hasJoined(awardee.id))
		)
	);

	const sudahSelesai = $derived(
		terfilter.filter((gerakan) => gerakan.isCompleted && !(awardee && gerakan.hasJoined(awardee.id)))
	);

	const jumlahUsulan = $derived(
		catalog.movements.filter((gerakan) => gerakan.status === MovementStatus.DIUSULKAN).length
	);

	const totalPartisipan = $derived(
		catalog.movements.reduce((jumlah, gerakan) => jumlah + gerakan.participantCount, 0)
	);

	const totalLaporan = $derived(
		catalog.movements.reduce((jumlah, gerakan) => jumlah + gerakan.reportCount, 0)
	);

	const gerakanBerjalan = $derived(
		catalog.movements.filter((gerakan) => gerakan.isRunning).length
	);

	const memimpin = $derived(formPeran === Peran.MEMIMPIN);

	/**
	 * Status keempat gerbang bukti ESG Hal 12 terhadap isian formulir saat ini.
	 * Gerbang ketiga dinilai dari gerakan induk, bukan dari isian — tag ESG/SDG
	 * memang diwariskan, dan menampilkannya sebagai pekerjaan awardee akan
	 * menyesatkan.
	 */
	const gerbang = $derived.by(() => {
		const gerakan = gerakanDilaporkan;
		const terpenuhi = {
			documented_activity:
				formTanggal !== '' && formLokasi.trim() !== '' && Number(formPeserta) > 0,
			outcome_note: formCatatan.trim() !== '',
			esg_sdg_tag: (gerakan?.esgTags.length ?? 0) > 0,
			evidence_source: formBukti.trim() !== ''
		};
		return ESG_EVIDENCE_GATE.map((syarat) => ({
			...syarat,
			terpenuhi: terpenuhi[/** @type {keyof typeof terpenuhi} */ (syarat.key)] === true
		}));
	});

	const gerbangLengkap = $derived(gerbang.every((syarat) => syarat.terpenuhi));

	onMount(async () => {
		if (!session.ready) await session.hydrate();
		await catalog.load();
		await gamification.refresh();
	});

	/**
	 * Menormalkan pilihan pil filter.
	 *
	 * `FilterChips` melepaskan pilihan menjadi string kosong ketika pil aktif ditekan
	 * lagi. Karena penyaring ini sudah menyediakan opsi "Semua kategori", string
	 * kosong hanya akan menghasilkan daftar kosong tanpa sebab yang terlihat.
	 *
	 * @param {string|string[]} nilai
	 * @returns {void}
	 */
	function pilihKategori(nilai) {
		kategori = typeof nilai === 'string' && nilai !== '' ? nilai : SEMUA_KATEGORI;
	}

	/**
	 * Bentuk yang dibaca `MovementCard`.
	 *
	 * `slug` sengaja tidak diikutkan: kartu akan menjadikan judulnya tautan ke
	 * halaman detail gerakan publik, dan rute itu tidak termasuk 25 rute final
	 * kontrak §3. Tautan yang menjanjikan halaman tidak ada lebih buruk daripada
	 * judul biasa.
	 *
	 * @param {import('$lib/domain/entities/Movement.js').Movement} gerakan
	 * @returns {Record<string, unknown>}
	 */
	function tampilanKartu(gerakan) {
		return {
			id: gerakan.id,
			title: gerakan.title,
			description: gerakan.objective,
			pillar: gerakan.pillars[0] ?? '',
			sdgTags: gerakan.sdgGoals.map((tujuan) => `SDG ${tujuan}`),
			targetParticipants: gerakan.targetParticipants,
			joined: gerakan.participantCount,
			locations: gerakan.reportCount,
			deadline: gerakan.endsAt
		};
	}

	/**
	 * @returns {boolean} true bila sesi awardee tersedia.
	 */
	function pastikanSesi() {
		if (awardee) return true;
		toast.push({
			type: ToastType.INFO,
			title: 'Belum ada sesi awardee',
			message: 'Masuk sebagai awardee Pfriends untuk ikut gerakan dan melaporkan aksi lapangan.'
		});
		return false;
	}

	/**
	 * Mendaftarkan awardee sebagai partisipan sebuah gerakan.
	 * @param {Record<string, unknown>} tampilan Objek tampilan dari `MovementCard`.
	 * @returns {Promise<void>}
	 */
	async function ikutSerta(tampilan) {
		if (!pastikanSesi()) return;
		const gerakan = catalog.byId(CatalogKind.MOVEMENT, /** @type {string} */ (tampilan.id));
		if (!gerakan || !awardee || gerakan.hasJoined(awardee.id)) return;

		idSedangDiproses = gerakan.id;
		try {
			await movementRepository.update(gerakan.id, {
				participantIds: [...gerakan.participantIds, awardee.id]
			});
			await catalog.refresh();
			toast.push({
				type: ToastType.SUCCESS,
				title: `Kamu bergabung dengan ${gerakan.title}`,
				message: `Langkah berikutnya: jalankan aksinya di ${gerakan.region || 'wilayahmu'}, lalu laporkan hasilnya. Memimpin pelaksanaan bernilai ${POIN_MEMIMPIN} poin.`
			});
		} finally {
			idSedangDiproses = null;
		}
	}

	/**
	 * Membuka formulir laporan dan mengosongkan isian sebelumnya.
	 * @param {import('$lib/domain/entities/Movement.js').Movement} gerakan
	 * @returns {void}
	 */
	function bukaLaporan(gerakan) {
		if (!pastikanSesi() || !awardee) return;
		gerakanDilaporkan = gerakan;
		formTanggal = HARI_INI;
		formLokasi = gerakan.region;
		formPeserta = '';
		formPeran = Peran.MEMIMPIN;
		formCatatan = '';
		formBukti = '';
	}

	/** @returns {void} */
	function tutupLaporan() {
		gerakanDilaporkan = null;
	}

	/**
	 * Mengirim laporan aksi lapangan.
	 *
	 * Poin hanya diajukan untuk peran memimpin, karena hanya itu yang disebut tabel
	 * Hal 11. Laporan seorang peserta tetap disimpan dan tetap menjadi bukti ESG
	 * gerakan — kontribusi yang tidak berpoin bukan kontribusi yang tidak berharga,
	 * dan halaman ini mengatakannya dengan jelas alih-alih diam.
	 *
	 * @returns {Promise<void>}
	 */
	async function kirimLaporan() {
		const gerakan = gerakanDilaporkan;
		if (!gerakan || !awardee || !gerbangLengkap) return;

		sedangMengirim = true;
		try {
			const terjadiPada = new Date(`${formTanggal}T09:00:00`);
			const waktuAksi = Number.isNaN(terjadiPada.getTime()) ? new Date() : terjadiPada;

			if (memimpin) {
				const hasil = await gamification.perform(ActivityType.LEAD_ACTION, {
					refId: gerakan.id,
					evidence: [formBukti.trim()],
					note: `${gerakan.title} — ${formLokasi.trim()}`,
					occurredAt: waktuAksi
				});
				// Kuota harian menolak aksi kedua di hari yang sama. Laporan tidak
				// disimpan pada keadaan itu supaya jumlah laporan gerakan tidak pernah
				// melampaui apa yang benar-benar dibukukan buku besar.
				if (!hasil.accepted) return;
			}

			const nomor = String(gerakan.reportCount + 1).padStart(2, '0');
			await movementRepository.update(gerakan.id, {
				reportIds: [...gerakan.reportIds, `RPT-${gerakan.id}-${nomor}`],
				participantIds: gerakan.hasJoined(awardee.id)
					? [...gerakan.participantIds]
					: [...gerakan.participantIds, awardee.id]
			});
			await catalog.refresh();

			if (!memimpin) {
				toast.push({
					type: ToastType.SUCCESS,
					title: 'Laporan aksi tersimpan',
					message: `Laporanmu melengkapi bukti ESG "${gerakan.title}". Poin ${POIN_MEMIMPIN} disediakan bagi yang memimpin pelaksanaan aksi di lapangan.`
				});
			}
			tutupLaporan();
		} finally {
			sedangMengirim = false;
		}
	}
</script>

<svelte:head>
	<title>Gerakan Bersama — Pfriends</title>
</svelte:head>

<PageHeader
	eyebrow="Pilar 03 · Movement-Based Program"
	title="Gerakan Bersama"
	subtitle="Aksi lingkungan, edukasi masyarakat, dan pemberdayaan ekonomi yang digerakkan awardee Pfriends. Ikut serta, jalankan di wilayahmu, lalu laporkan hasilnya sebagai bukti ESG."
/>

<div class="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
	<StatTile
		label="Gerakan berjalan"
		value={gerakanBerjalan}
		hint="Masih menerima peserta baru"
		iconPath={ICONS.flag}
		color="var(--color-pertamina-green-ink)"
	/>
	<StatTile
		label="Gerakan saya"
		value={gerakanSaya.length}
		hint="Sesuai penyaring kategori aktif"
		iconPath={ICONS.heart}
		color="var(--color-pertamina-red-ink)"
	/>
	<StatTile
		label="Orang bergerak"
		value={totalPartisipan}
		hint="Total partisipan lintas gerakan"
		iconPath={ICONS.users}
		color="var(--color-pertamina-navy)"
	/>
	<StatTile
		label="Laporan aksi"
		value={totalLaporan}
		hint="Bukti lapangan yang terkumpul"
		iconPath={ICONS.camera}
		color="var(--color-esg-g-ink)"
	/>
</div>

<div class="mt-6">
	<FilterChips
		options={opsiKategori}
		bind:selected={kategori}
		onchange={pilihKategori}
		showClear={false}
		label="Penyaring kategori gerakan"
	/>
</div>

{#if catalog.loading && catalog.movements.length === 0}
	<p class="mt-8 text-sm text-ink-600">Memuat gerakan komunitas…</p>
{:else}
	<section class="mt-8">
		<h2 class="text-lg font-semibold text-heading">Gerakan yang saya ikuti</h2>
		<p class="mt-1 text-[13px] text-ink-600">
			Setiap aksi yang kamu jalankan di lapangan dapat dilaporkan di sini. Laporan yang lengkap
			langsung memenuhi empat syarat bukti ESG Hal 12.
		</p>

		{#if gerakanSaya.length === 0}
			<div class="mt-4">
				<EmptyState
					icon={ICONS.flag}
					title="Kamu belum bergabung dengan gerakan mana pun"
					message="Pilih satu gerakan di bawah yang paling dekat dengan wilayah dan keahlianmu. Bergabung tidak menuntut komitmen besar — cukup satu aksi nyata untuk memulai."
					size="sm"
				/>
			</div>
		{:else}
			<div class="mt-4 space-y-4">
				{#each gerakanSaya as gerakan (gerakan.id)}
					{@const penggerak = awardee ? gerakan.isLedBy(awardee.id) : false}
					<Card padding="md">
						<div class="flex flex-wrap items-start justify-between gap-3">
							<div class="min-w-0 flex-1">
								<div class="flex flex-wrap items-center gap-1.5">
									<StatusBadge label={gerakan.categoryMeta.label} color="blue" size="sm" />
									<StatusBadge
										label={gerakan.statusMeta.label}
										color={gerakan.statusMeta.badgeColor}
										size="sm"
										withDot
									/>
									{#if penggerak}
										<StatusBadge
											label="Kamu penggerak"
											color="amber"
											size="sm"
											iconPath={ICONS.star}
										/>
									{/if}
								</div>
								<h3 class="mt-1.5 text-base font-semibold text-ink-800">{gerakan.title}</h3>
								<p class="mt-1 text-[13px] leading-relaxed text-ink-600">{gerakan.objective}</p>
							</div>
						</div>

						<div class="mt-4">
							<ProgressBar
								value={gerakan.participantCount}
								max={gerakan.targetParticipants}
								size="sm"
								label="Partisipasi gerakan"
								showLabel
								color="var(--color-pertamina-green)"
							/>
							<p class="mt-1.5 text-xs text-ink-600">
								<span class="numeric font-semibold text-ink-800">
									{formatAngka(gerakan.participantCount)}
								</span>
								dari {formatAngka(gerakan.targetParticipants)} orang bergerak ·
								{formatAngka(gerakan.reportCount)} laporan aksi terkumpul
							</p>
						</div>

						<div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-600">
							<span class="inline-flex items-center gap-1">
								<Icon path={ICONS.mapPin} size={14} />
								{gerakan.region || 'Lintas wilayah'}
							</span>
							<span class="inline-flex items-center gap-1">
								<Icon path={ICONS.calendar} size={14} />
								{formatRentangTanggal(gerakan.startsAt, gerakan.endsAt)}
							</span>
							{#if gerakan.leaderName}
								<span class="inline-flex items-center gap-1">
									<Icon path={ICONS.user} size={14} />
									Penggerak: {gerakan.leaderName}
								</span>
							{/if}
						</div>

						{#if gerakan.esgTags.length > 0}
							<!-- `shortLabel` ('E · SDG 12'), bukan `label` lengkap: `StatusBadge`
							     memakai `whitespace-nowrap`, sehingga nama SDG yang panjang menjadi
							     satu chip selebar 352 px yang melebarkan halaman di 375 px. Nama
							     penuh tidak hilang — ia pindah ke atribut `title`. -->
							<div class="mt-3 flex flex-wrap gap-1.5">
								{#each gerakan.esgTags as tag (tag.toString())}
									<StatusBadge
										label={tag.shortLabel}
										title={tag.label}
										color="slate"
										size="sm"
										variant="outline"
									/>
								{/each}
							</div>
						{/if}

						{#if gerakan.impact}
							<p class="mt-3 rounded-xl bg-pertamina-green-tint px-3 py-2 text-[13px] text-ink-700">
								<span class="font-semibold">Dampak tercatat:</span>
								{gerakan.impact.metric}
								<span class="numeric font-semibold">{formatAngka(gerakan.impact.value)}</span>
								{gerakan.impact.unit}
							</p>
						{/if}

						<div
							class="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-3"
						>
							<PointsChip points={POIN_MEMIMPIN} currency="PK" size="sm" signed />
							{#if gerakan.isCompleted}
								<StatusBadge label="Gerakan sudah ditutup" color="slate" />
							{:else}
								<Button
									size="sm"
									iconPath={ICONS.upload}
									disabled={idSedangDiproses !== null}
									onclick={() => bukaLaporan(gerakan)}
								>
									Lapor aksi lapangan
								</Button>
							{/if}
						</div>
					</Card>
				{/each}
			</div>
		{/if}
	</section>

	<section class="mt-10">
		<h2 class="text-lg font-semibold text-heading">Gerakan yang bisa kamu ikuti</h2>
		<p class="mt-1 text-[13px] text-ink-600">
			Bahasa gerakan selalu kolektif: yang dihitung adalah berapa orang bergerak, bukan siapa yang
			paling banyak.
		</p>

		{#if dapatDiikuti.length === 0}
			<div class="mt-4">
				<EmptyState
					icon={ICONS.search}
					title="Tidak ada gerakan yang cocok"
					message="Coba pilih kategori lain, atau tengok gerakan yang sudah selesai untuk melihat bentuk aksi yang pernah dijalankan komunitas."
					size="sm"
				/>
			</div>
		{:else}
			<div class="mt-4 grid gap-4 md:grid-cols-2">
				{#each dapatDiikuti as gerakan (gerakan.id)}
					<MovementCard movement={tampilanKartu(gerakan)} onJoin={ikutSerta} />
				{/each}
			</div>
		{/if}

		{#if jumlahUsulan > 0}
			<p class="mt-4 inline-flex items-start gap-1.5 text-[13px] leading-relaxed text-ink-600">
				<Icon path={ICONS.info} size={16} class="mt-px shrink-0" />
				{formatAngka(jumlahUsulan)} usulan gerakan dari awardee sedang menunggu persetujuan Corsec. Gerakan
				baru muncul di daftar ini setelah tag ESG dan SDG-nya ditetapkan.
			</p>
		{/if}
	</section>

	{#if sudahSelesai.length > 0}
		<section class="mt-10">
			<h2 class="text-lg font-semibold text-heading">Gerakan yang sudah selesai</h2>
			<p class="mt-1 text-[13px] text-ink-600">
				Arsip aksi komunitas beserta dampak yang tercatat — bahan bukti untuk laporan ESG Pertamina
				Foundation.
			</p>
			<div class="mt-4 grid gap-4 md:grid-cols-2">
				{#each sudahSelesai as gerakan (gerakan.id)}
					<MovementCard movement={tampilanKartu(gerakan)} />
				{/each}
			</div>
		</section>
	{/if}
{/if}

<Modal
	open={gerakanDilaporkan !== null}
	title="Lapor aksi lapangan"
	size="lg"
	onclose={tutupLaporan}
>
	{#if gerakanDilaporkan}
		<p class="text-sm text-ink-600">
			Gerakan <span class="font-semibold text-ink-800">{gerakanDilaporkan.title}</span> ·
			{formatTanggal(gerakanDilaporkan.startsAt, 'pendek')} – {formatTanggal(
				gerakanDilaporkan.endsAt,
				'pendek'
			)}
		</p>

		<div class="mt-5 space-y-4">
			<div class="grid gap-4 sm:grid-cols-2">
				<label class="block">
					<span class="label-micro">Tanggal aksi</span>
					<input
						type="date"
						bind:value={formTanggal}
						max={HARI_INI}
						class="mt-1.5 w-full rounded-xl border border-ink-450 bg-surface px-3 py-2 text-sm text-ink-800"
					/>
				</label>
				<label class="block">
					<span class="label-micro">Jumlah peserta</span>
					<input
						type="number"
						min="1"
						inputmode="numeric"
						bind:value={formPeserta}
						placeholder="Contoh: 24"
						class="mt-1.5 w-full rounded-xl border border-ink-450 bg-surface px-3 py-2 text-sm text-ink-800"
					/>
				</label>
			</div>

			<label class="block">
				<span class="label-micro">Lokasi aksi</span>
				<input
					type="text"
					bind:value={formLokasi}
					placeholder="Kelurahan, kota, atau provinsi pelaksanaan"
					class="mt-1.5 w-full rounded-xl border border-ink-450 bg-surface px-3 py-2 text-sm text-ink-800"
				/>
			</label>

			<fieldset class="rounded-xl border border-ink-200 p-3">
				<legend class="label-micro px-1">Peran saya dalam aksi ini</legend>
				<label class="flex items-start gap-2.5 py-1.5">
					<input
						type="radio"
						bind:group={formPeran}
						value={Peran.MEMIMPIN}
						class="mt-0.5 h-4 w-4 shrink-0"
					/>
					<span class="text-[13px] leading-relaxed text-ink-700">
						<span class="font-semibold text-ink-800">Memimpin pelaksanaan di lokasi</span>
						— saya mengorganisasi aksi ini, mengumpulkan peserta, dan bertanggung jawab atas
						hasilnya.
						<span class="font-semibold text-pertamina-navy">Bernilai {POIN_MEMIMPIN} poin.</span>
					</span>
				</label>
				<label class="flex items-start gap-2.5 py-1.5">
					<input
						type="radio"
						bind:group={formPeran}
						value={Peran.PESERTA}
						class="mt-0.5 h-4 w-4 shrink-0"
					/>
					<span class="text-[13px] leading-relaxed text-ink-700">
						<span class="font-semibold text-ink-800">Ikut serta sebagai peserta</span>
						— laporan tetap tersimpan sebagai bukti ESG gerakan, tanpa poin kepemimpinan.
					</span>
				</label>
			</fieldset>

			<label class="block">
				<span class="label-micro">Catatan hasil</span>
				<textarea
					bind:value={formCatatan}
					rows="4"
					placeholder="Jelaskan perubahan yang terjadi, bukan jalannya acara. Contoh: 180 kg sampah plastik terpilah dan 12 warga mulai memilah di rumah."
					class="mt-1.5 w-full rounded-xl border border-ink-450 bg-surface px-3 py-2 text-sm leading-relaxed text-ink-800"
				></textarea>
				<span class="mt-1 block text-xs text-ink-600">
					{formatAngka(formCatatan.trim().length)} karakter · sasaran {TARGET_KARAKTER_CATATAN} agar
					kurator tidak perlu meminta perbaikan
				</span>
			</label>

			<label class="block">
				<span class="label-micro">Sumber bukti</span>
				<input
					type="text"
					bind:value={formBukti}
					placeholder="Nama berkas dokumentasi atau tautan album, mis. aksi-mangrove-cilacap.jpg"
					class="mt-1.5 w-full rounded-xl border border-ink-450 bg-surface px-3 py-2 text-sm text-ink-800"
				/>
				<span class="mt-1 block text-xs text-ink-600">
					Foto, daftar hadir, atau laporan tertulis. Tanpa bukti, poin tetap dicatat namun ditahan
					sampai bukti masuk.
				</span>
			</label>
		</div>

		<div class="mt-5 rounded-card border border-ink-200 bg-ink-50 p-4">
			<p class="text-sm font-semibold text-ink-800">Kelengkapan bukti ESG</p>
			<p class="mt-0.5 text-xs text-ink-600">
				Empat syarat Hal 12. Semuanya harus terpenuhi sebelum laporan dapat dikirim.
			</p>
			<ul class="mt-3 space-y-2">
				{#each gerbang as syarat (syarat.key)}
					<li class="flex items-start gap-2">
						<span
							class="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full {syarat.terpenuhi
								? 'bg-success-tint text-success'
								: 'bg-ink-200 text-ink-600'}"
						>
							<Icon path={syarat.terpenuhi ? ICONS.check : ICONS.x} size={14} />
						</span>
						<span class="text-[13px] leading-relaxed text-ink-700">
							<span class="font-medium text-ink-800">{syarat.label}</span>
							<span class="text-ink-600"> — {syarat.deskripsi}</span>
						</span>
					</li>
				{/each}
			</ul>
			{#if gerakanDilaporkan.esgTags.length > 0}
				<p class="mt-3 text-xs leading-relaxed text-ink-600">
					Tag diwarisi dari gerakan induk:
					{gerakanDilaporkan.esgTags.map((tag) => tag.shortLabel).join(' · ')}
				</p>
			{/if}
		</div>
	{/if}

	{#snippet footer()}
		<Button variant="ghost" onclick={tutupLaporan}>Batal</Button>
		<Button
			disabled={!gerbangLengkap}
			loading={sedangMengirim}
			iconPath={ICONS.upload}
			onclick={kirimLaporan}
		>
			{memimpin ? `Kirim laporan · +${POIN_MEMIMPIN} poin` : 'Kirim laporan'}
		</Button>
	{/snippet}
</Modal>
