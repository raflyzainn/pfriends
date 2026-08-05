<script>
	/**
	 * HALAMAN — Konfigurasi Gamifikasi.
	 *
	 * Tanggung jawab: memperlihatkan aturan skor yang berlaku, sebaran tier yang
	 * dihasilkannya, dan sinyal anomali yang perlu ditinjau manusia.
	 *
	 * Tabel skor di halaman ini BACA SAJA dengan sengaja. Sembilan nilai poin dan
	 * empat ambang tier adalah angka kanonik Hal 11 dan Hal 12; mengubahnya lewat
	 * antarmuka akan membuat poin yang sudah dibukukan tidak lagi dapat
	 * dijelaskan asalnya. Perubahan aturan skor adalah keputusan program, bukan
	 * pengaturan aplikasi — tempatnya di `domain/constants/scoring-table.js`.
	 *
	 * Daftar anomali menerjemahkan satu kalimat Hal 11 — *"Points should reward
	 * meaningful contribution, not spammy activity"* — menjadi pemeriksaan
	 * konkret. Yang ditampilkan adalah SINYAL, bukan vonis: tidak ada akun yang
	 * dibekukan otomatis di sini. Sistem yang menghukum berdasarkan heuristik akan
	 * salah menghukum anggota paling aktif, yaitu orang yang paling tidak layak
	 * dihukum.
	 *
	 * @see docs/00-SOURCE-BRIEF.md — Hal 11 tabel skor, Hal 12 ambang tier
	 * @see docs/02-KPI-MODEL.md — §5.3 aturan anti-manipulasi
	 */
	import {
		Button,
		Card,
		DataTable,
		EmptyState,
		Icon,
		PageHeader,
		StatTile,
		StatusBadge,
		ICONS
	} from '$lib/components';
	import AmplificationBarChart from '$lib/charts/AmplificationBarChart.svelte';
	import TierDistributionChart from '$lib/charts/TierDistributionChart.svelte';
	import { KPI_PARAMETERS } from '$lib/domain/constants/kpi-targets.js';
	import { ActionClass, ActivityType, SCORING_TABLE } from '$lib/domain/constants/scoring-table.js';
	import { TIER_TABLE } from '$lib/domain/constants/tier-table.js';
	import { ActivityStatus, CapReason } from '$lib/domain/entities/PointActivity.js';
	import { activityRepository } from '$lib/infrastructure/repositories/index.js';
	import { bootstrapDatabase } from '$lib/infrastructure/seed/bootstrap.js';
	import { admin } from '$lib/stores/admin.svelte.js';
	import { catalog } from '$lib/stores/catalog.svelte.js';
	import { formatAngka, formatPersen } from '$lib/utils/format.js';

	/**
	 * Batas peristiwa terhitung per anggota per bulan yang memicu peninjauan.
	 * Nilai dari docs/02 §5.3 ("event/anggota/bulan > 30 → tandai untuk
	 * peninjauan") dan berstatus [ASUMSI] sampai dikonfirmasi Corsec.
	 */
	const BATAS_AKSI_BULANAN = 30;

	/**
	 * Porsi poin dari aksi kelas A yang dianggap tidak wajar. Kelas A adalah aksi
	 * yang terverifikasi otomatis — membaca kabar dan menanggapi ajakan ringan.
	 * Poin yang hampir seluruhnya berasal dari sana menandakan kehadiran tanpa
	 * kontribusi. [ASUMSI], turunan catatan anti-spam Hal 11.
	 */
	const AMBANG_DOMINASI_KELAS_A = 0.8;

	/** Aksi yang dihitung sebagai amplifikasi (Hal 11 aksi 5 dan 8 poin). */
	const AKSI_AMPLIFIKASI = Object.freeze([ActivityType.SHARE_PRIVATE, ActivityType.SHARE_PUBLIC]);

	/** Label kelas verifikasi aksi. */
	const LABEL_KELAS = Object.freeze({
		[ActionClass.A]: 'A — terverifikasi otomatis',
		[ActionClass.B]: 'B — bukti ringan',
		[ActionClass.C]: 'C — perlu bukti',
		[ActionClass.D]: 'D — perlu validasi PF'
	});

	/** @type {import('$lib/domain/entities/PointActivity.js').PointActivity[]} */
	let aktivitas = $state.raw([]);
	let memuatAktivitas = $state(true);

	$effect(() => {
		let dibatalkan = false;

		(async () => {
			try {
				await bootstrapDatabase();
				const rows = await activityRepository.getAll();
				if (!dibatalkan) aktivitas = rows;
			} finally {
				if (!dibatalkan) memuatAktivitas = false;
			}
		})();

		return () => {
			dibatalkan = true;
		};
	});

	const namaAnggota = $derived(
		new Map(catalog.awardees.map((awardee) => [awardee.id, awardee.fullName]))
	);

	const barisSkor = $derived(
		SCORING_TABLE.map((aturan) => ({ id: aturan.type, aturan }))
	);

	const KOLOM_SKOR = Object.freeze([
		{ key: 'aksi', label: 'Aksi berpoin' },
		{ key: 'points', label: 'Poin', numeric: true },
		{ key: 'kelas', label: 'Kelas verifikasi' },
		{ key: 'cap', label: 'Batas harian', numeric: true },
		{ key: 'bukti', label: 'Wajib bukti' },
		{ key: 'pilar', label: 'Pilar aktivitas' }
	]);

	/** Poin komunitas per kelas verifikasi — konteks utama menilai mutu kontribusi. */
	const poinPerKelas = $derived.by(() => {
		/** @type {Map<string, number>} */
		const rekap = new Map();
		for (const entri of aktivitas) {
			if (!entri.isAwarded) continue;
			rekap.set(entri.actionClass, (rekap.get(entri.actionClass) ?? 0) + entri.points);
		}
		return Object.values(ActionClass).map((kelas) => ({
			label: LABEL_KELAS[kelas] ?? kelas,
			value: rekap.get(kelas) ?? 0
		}));
	});

	const totalPoinDibukukan = $derived(
		poinPerKelas.reduce((jumlah, baris) => jumlah + baris.value, 0)
	);

	const poinKelasTinggi = $derived(
		poinPerKelas
			.filter((baris) => baris.label.startsWith('C') || baris.label.startsWith('D'))
			.reduce((jumlah, baris) => jumlah + baris.value, 0)
	);

	const entriTertahanCap = $derived(
		aktivitas.filter((entri) => entri.capReason === CapReason.DAILY_CAP).length
	);

	const entriMenungguBukti = $derived(
		aktivitas.filter((entri) => entri.status === ActivityStatus.PENDING).length
	);

	/**
	 * Rekap per anggota yang menjadi bahan seluruh aturan deteksi.
	 * Dihitung sekali dalam satu lintasan; menghitungnya ulang di tiap aturan akan
	 * menelusuri seluruh buku besar lima kali untuk pertanyaan yang mirip.
	 */
	const rekapAnggota = $derived.by(() => {
		/** @type {Map<string, {total: number, poin: number, poinKelasA: number, puncakAmplifikasiHarian: number, puncakAksiBulanan: number, tertahanCap: number, menungguBukti: number}>} */
		const rekap = new Map();
		/** @type {Map<string, number>} */
		const amplifikasiHarian = new Map();
		/** @type {Map<string, number>} */
		const aksiBulanan = new Map();

		const ambil = (awardeeId) => {
			if (!rekap.has(awardeeId)) {
				rekap.set(awardeeId, {
					total: 0,
					poin: 0,
					poinKelasA: 0,
					puncakAmplifikasiHarian: 0,
					puncakAksiBulanan: 0,
					tertahanCap: 0,
					menungguBukti: 0
				});
			}
			return rekap.get(awardeeId);
		};

		for (const entri of aktivitas) {
			const baris = ambil(entri.awardeeId);
			baris.total += 1;
			if (entri.isAwarded) {
				baris.poin += entri.points;
				if (entri.actionClass === ActionClass.A) baris.poinKelasA += entri.points;
			}
			if (entri.capReason === CapReason.DAILY_CAP) baris.tertahanCap += 1;
			if (entri.status === ActivityStatus.PENDING) baris.menungguBukti += 1;

			if (AKSI_AMPLIFIKASI.includes(entri.activityType)) {
				const kunci = `${entri.awardeeId}|${entri.dayKey}`;
				amplifikasiHarian.set(kunci, (amplifikasiHarian.get(kunci) ?? 0) + 1);
			}
			const kunciBulan = `${entri.awardeeId}|${entri.monthKey}`;
			aksiBulanan.set(kunciBulan, (aksiBulanan.get(kunciBulan) ?? 0) + 1);
		}

		for (const [kunci, jumlah] of amplifikasiHarian) {
			const awardeeId = kunci.slice(0, kunci.indexOf('|'));
			const baris = ambil(awardeeId);
			baris.puncakAmplifikasiHarian = Math.max(baris.puncakAmplifikasiHarian, jumlah);
		}
		for (const [kunci, jumlah] of aksiBulanan) {
			const awardeeId = kunci.slice(0, kunci.indexOf('|'));
			const baris = ambil(awardeeId);
			baris.puncakAksiBulanan = Math.max(baris.puncakAksiBulanan, jumlah);
		}

		return rekap;
	});

	/**
	 * Sinyal anomali. Setiap baris menyebut aturan yang memicunya beserta angka
	 * pemicunya, supaya peninjau dapat menilai sendiri apakah temuan ini wajar —
	 * bukan sekadar menerima label "mencurigakan" tanpa dasar.
	 */
	const anomali = $derived.by(() => {
		/** @type {{id: string, awardeeId: string, nama: string, sinyal: string, rincian: string, tingkat: string, warna: string}[]} */
		const temuan = [];

		for (const [awardeeId, baris] of rekapAnggota) {
			const nama = namaAnggota.get(awardeeId) ?? awardeeId;

			if (baris.puncakAmplifikasiHarian > KPI_PARAMETERS.capAmplifikasiHarian) {
				temuan.push({
					id: `${awardeeId}-amplifikasi`,
					awardeeId,
					nama,
					sinyal: 'Lonjakan amplifikasi harian',
					rincian: `${baris.puncakAmplifikasiHarian} amplifikasi pada satu hari, melewati plafon ${KPI_PARAMETERS.capAmplifikasiHarian} per anggota per hari.`,
					tingkat: 'Tinggi',
					warna: 'red'
				});
			}

			if (baris.puncakAksiBulanan > BATAS_AKSI_BULANAN) {
				temuan.push({
					id: `${awardeeId}-volume`,
					awardeeId,
					nama,
					sinyal: 'Volume aksi bulanan tak wajar',
					rincian: `${baris.puncakAksiBulanan} aksi pada satu bulan, melewati batas rasio ${BATAS_AKSI_BULANAN} aksi per anggota per bulan.`,
					tingkat: 'Sedang',
					warna: 'amber'
				});
			}

			if (
				baris.poin > 0 &&
				baris.poinKelasA / baris.poin >= AMBANG_DOMINASI_KELAS_A &&
				baris.poin >= TIER_TABLE[1].threshold
			) {
				temuan.push({
					id: `${awardeeId}-kelas-a`,
					awardeeId,
					nama,
					sinyal: 'Poin didominasi aksi kelas rendah',
					rincian: `${formatPersen((baris.poinKelasA / baris.poin) * 100)} dari ${formatAngka(baris.poin)} poin berasal dari aksi kelas A yang terverifikasi otomatis.`,
					tingkat: 'Sedang',
					warna: 'amber'
				});
			}

			if (baris.tertahanCap > 0) {
				temuan.push({
					id: `${awardeeId}-cap`,
					awardeeId,
					nama,
					sinyal: 'Entri tertahan plafon harian',
					rincian: `${baris.tertahanCap} entri tidak memperoleh poin penuh karena batas harian aksi sejenis sudah terpakai.`,
					tingkat: 'Rendah',
					warna: 'slate'
				});
			}

			if (baris.menungguBukti > 0) {
				temuan.push({
					id: `${awardeeId}-bukti`,
					awardeeId,
					nama,
					sinyal: 'Poin menunggu bukti',
					rincian: `${baris.menungguBukti} entri berstatus menunggu bukti dan belum dibukukan ke saldo kontribusi.`,
					tingkat: 'Rendah',
					warna: 'slate'
				});
			}
		}

		const urutan = { Tinggi: 0, Sedang: 1, Rendah: 2 };
		return temuan.sort(
			(a, b) => (urutan[a.tingkat] ?? 9) - (urutan[b.tingkat] ?? 9) || a.nama.localeCompare(b.nama)
		);
	});

	const anomaliTinggi = $derived(anomali.filter((baris) => baris.tingkat === 'Tinggi').length);

	const KOLOM_ANOMALI = Object.freeze([
		{ key: 'nama', label: 'Anggota' },
		{ key: 'sinyal', label: 'Sinyal terdeteksi' },
		{ key: 'rincian', label: 'Dasar temuan' },
		{ key: 'tingkat', label: 'Tingkat', align: 'right' }
	]);
</script>

<PageHeader
	eyebrow="Konfigurasi Gamifikasi"
	title="Aturan skor dan sinyal integritas"
	subtitle="Sembilan aksi berpoin Hal 11 dan empat ambang tier Hal 12 berlaku apa adanya dan tidak dapat diubah dari antarmuka. Yang dapat ditindaklanjuti di sini adalah sinyal anomali — bahan pertimbangan manusia, bukan keputusan otomatis."
>
	{#snippet actions()}
		<Button variant="secondary" size="sm" iconPath={ICONS.users} href="/admin/awardee">
			Kelola anggota
		</Button>
	{/snippet}
</PageHeader>

<div class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
	<StatTile
		label="Poin dibukukan"
		value={totalPoinDibukukan}
		unit="poin"
		hint="Seluruh entri berstatus diberikan"
		iconPath={ICONS.coin}
		color="var(--color-pertamina-blue)"
	/>
	<StatTile
		label="Porsi kontribusi bermakna"
		value={totalPoinDibukukan > 0
			? formatPersen((poinKelasTinggi / totalPoinDibukukan) * 100)
			: '—'}
		hint="Poin dari aksi kelas C dan D yang menuntut bukti"
		iconPath={ICONS.sparkles}
		color="var(--color-pertamina-green)"
	/>
	<StatTile
		label="Entri tertahan plafon"
		value={entriTertahanCap}
		unit="entri"
		hint="Batas harian bekerja sebagaimana mestinya"
		iconPath={ICONS.shield}
		color="var(--color-tier-champion)"
	/>
	<StatTile
		label="Sinyal keparahan tinggi"
		value={anomaliTinggi}
		unit="temuan"
		hint="{formatAngka(anomali.length)} sinyal keseluruhan · {formatAngka(entriMenungguBukti)} entri menunggu bukti"
		iconPath={ICONS.warning}
		color="var(--color-pertamina-red)"
	/>
</div>

<!-- ── Tabel skor kanonik ──────────────────────────────────────────────── -->
<section aria-labelledby="judul-skor" class="mb-8">
	<div class="mb-3 flex flex-wrap items-baseline justify-between gap-2">
		<h2 id="judul-skor" class="text-base font-bold text-heading">
			Tabel skor — sembilan aksi berpoin
		</h2>
		<StatusBadge label="Baca saja" color="slate" size="sm" iconPath={ICONS.lock} />
	</div>

	<DataTable
		columns={KOLOM_SKOR}
		rows={barisSkor}
		caption="Sembilan aksi berpoin Pfriends beserta nilai poin, kelas verifikasi, batas harian, kewajiban bukti, dan pilar aktivitas yang diwakilinya"
	>
		{#snippet cell(row, kolom)}
			{@const aturan = row.aturan}

			{#if kolom.key === 'aksi'}
				<span class="block min-w-0">
					<span class="block font-semibold text-ink-900">{aturan.label}</span>
					<span class="block text-xs text-ink-500">{aturan.labelSumber}</span>
				</span>
			{:else if kolom.key === 'points'}
				<span class="numeric font-bold text-ink-900">{aturan.points}</span>
			{:else if kolom.key === 'kelas'}
				<span class="whitespace-nowrap text-xs">{LABEL_KELAS[aturan.actionClass] ?? aturan.actionClass}</span>
			{:else if kolom.key === 'cap'}
				{aturan.dailyCap > 0 ? `${aturan.dailyCap}/hari` : 'Tanpa batas'}
			{:else if kolom.key === 'bukti'}
				{#if aturan.needsEvidence}
					<StatusBadge label="Wajib" color="amber" size="sm" iconPath={ICONS.camera} />
				{:else}
					<StatusBadge label="Otomatis" color="slate" size="sm" />
				{/if}
			{:else if kolom.key === 'pilar'}
				<span class="whitespace-nowrap text-xs">{aturan.pillar}</span>
			{:else}
				—
			{/if}
		{/snippet}
	</DataTable>

	<p class="mt-2 text-xs leading-relaxed text-ink-500">
		Batas harian bukan angka dokumen sumber melainkan turunan sah dari catatan Hal 11: poin harus
		menghargai kontribusi bermakna, bukan aktivitas spam. Tanpa batas itu, tier tertinggi dapat
		dicapai hanya dengan menekan tombol bagikan ratusan kali dalam semalam.
	</p>
</section>

<!-- ── Tier dan komposisi poin ─────────────────────────────────────────── -->
<section aria-labelledby="judul-tier" class="mb-8 grid grid-cols-1 gap-4 xl:grid-cols-2">
	<Card>
		<h2 id="judul-tier" class="mb-3 text-base font-bold text-heading">Sebaran tier komunitas</h2>

		<TierDistributionChart data={admin.tierDistribution} height="260px" loading={admin.loading} />

		<ul class="mt-4 space-y-2">
			{#each TIER_TABLE as tier (tier.level)}
				{@const baris = admin.tierDistribution.find((row) => row.level === tier.level)}
				<li class="flex items-start gap-2.5 rounded-card border border-ink-100 p-2.5">
					<span
						class="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
						style="background:{tier.color};"
						aria-hidden="true"
					></span>
					<span class="min-w-0 flex-1">
						<span class="flex flex-wrap items-baseline gap-x-2">
							<span class="text-sm font-semibold text-ink-900">{tier.label}</span>
							<span class="numeric text-xs text-ink-500">ambang {tier.threshold} poin</span>
						</span>
						<span class="block text-xs leading-relaxed text-ink-600">{tier.benefit}</span>
					</span>
					<span class="numeric shrink-0 text-sm font-bold text-ink-800">
						{formatAngka(baris?.count ?? 0)}
					</span>
				</li>
			{/each}
		</ul>
	</Card>

	<Card>
		<h2 class="mb-1 text-base font-bold text-heading">Komposisi poin per kelas verifikasi</h2>
		<p class="mb-3 text-sm text-ink-600">
			Ini indikator mutu gamifikasi yang paling jujur. Komunitas yang sehat mengumpulkan sebagian
			besar poinnya dari aksi kelas C dan D — aksi yang menuntut bukti dan validasi.
		</p>

		{#if totalPoinDibukukan > 0}
			<AmplificationBarChart data={poinPerKelas} unit="poin" loading={memuatAktivitas} />
		{:else}
			<EmptyState
				title={memuatAktivitas ? 'Membaca buku besar poin' : 'Belum ada poin dibukukan'}
				message="Komposisi muncul setelah anggota pertama memperoleh poin dari aksi komunitas."
				iconPath={ICONS.coin}
				size="sm"
			/>
		{/if}
	</Card>
</section>

<!-- ── Sinyal anomali ──────────────────────────────────────────────────── -->
<section aria-labelledby="judul-anomali">
	<div class="mb-3 flex flex-wrap items-start justify-between gap-3">
		<div class="min-w-0">
			<h2 id="judul-anomali" class="text-base font-bold text-heading">
				Sinyal anti-gaming ({formatAngka(anomali.length)})
			</h2>
			<p class="mt-1 max-w-3xl text-sm text-ink-600">
				Lima aturan deteksi berjalan atas seluruh buku besar poin. Setiap baris menyebut angka
				pemicunya agar peninjau dapat menilai sendiri — anggota paling aktif memang akan sering
				muncul di sini, dan itu bukan pelanggaran.
			</p>
		</div>
	</div>

	{#if anomali.length === 0}
		<Card>
			<EmptyState
				title={memuatAktivitas ? 'Memeriksa buku besar poin' : 'Tidak ada sinyal anomali'}
				message={memuatAktivitas
					? 'Menelusuri seluruh entri poin terhadap lima aturan deteksi.'
					: 'Seluruh entri poin berada dalam batas wajar. Nilai nol yang bertahan lama justru layak dicurigai — periksa apakah aturan deteksi masih relevan dengan pola aktivitas sekarang.'}
				iconPath={ICONS.checkCircle}
				size="sm"
			/>
		</Card>
	{:else}
		<DataTable
			columns={KOLOM_ANOMALI}
			rows={anomali}
			loading={memuatAktivitas}
			caption="Sinyal anomali gamifikasi beserta anggota terkait, dasar temuan, dan tingkat keparahannya"
			empty="Tidak ada sinyal anomali pada periode ini."
		>
			{#snippet cell(row, kolom)}
				{#if kolom.key === 'nama'}
					<span class="block min-w-0">
						<span class="block font-semibold text-ink-900">{row.nama}</span>
						<span class="numeric block text-xs text-ink-500">{row.awardeeId}</span>
					</span>
				{:else if kolom.key === 'sinyal'}
					<span class="whitespace-nowrap font-medium text-ink-800">{row.sinyal}</span>
				{:else if kolom.key === 'rincian'}
					<span class="block max-w-lg text-xs leading-relaxed text-ink-600">{row.rincian}</span>
				{:else if kolom.key === 'tingkat'}
					<StatusBadge label={row.tingkat} color={row.warna} size="sm" withDot />
				{:else}
					—
				{/if}
			{/snippet}
		</DataTable>
	{/if}

	<div class="card mt-3 p-4">
		<p class="flex items-center gap-2 text-sm font-semibold text-heading">
			<Icon path={ICONS.info} size={16} />
			Aturan deteksi yang sedang berjalan
		</p>
		<ul class="mt-2 space-y-1.5 text-xs leading-relaxed text-ink-600">
			<li>
				<span class="font-semibold text-ink-800">Lonjakan amplifikasi harian</span> — lebih dari
				{KPI_PARAMETERS.capAmplifikasiHarian} amplifikasi terhitung per anggota per hari.
			</li>
			<li>
				<span class="font-semibold text-ink-800">Volume aksi bulanan</span> — lebih dari
				{BATAS_AKSI_BULANAN} aksi per anggota per bulan.
			</li>
			<li>
				<span class="font-semibold text-ink-800">Dominasi aksi kelas rendah</span> — minimal
				{formatPersen(AMBANG_DOMINASI_KELAS_A * 100)} poin berasal dari aksi kelas A.
			</li>
			<li>
				<span class="font-semibold text-ink-800">Entri tertahan plafon harian</span> — bukti langsung
				bahwa batas harian pada tabel skor sedang bekerja.
			</li>
			<li>
				<span class="font-semibold text-ink-800">Poin menunggu bukti</span> — aksi wajib bukti yang
				belum dilengkapi lampirannya.
			</li>
		</ul>
		<p class="mt-3 text-xs leading-relaxed text-ink-500">
			Ketiga ambang pertama berstatus asumsi dan menunggu konfirmasi Corsec. Ambang yang terlalu
			ketat akan menandai anggota paling produktif sebagai pelaku manipulasi — kesalahan yang jauh
			lebih mahal daripada melewatkan satu kasus.
		</p>
	</div>
</section>
