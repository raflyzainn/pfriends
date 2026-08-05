<script>
	/**
	 * HALAMAN — Dasbor Statistik Konsol Pertamina Foundation (Apache ECharts).
	 *
	 * Tanggung jawab: menjadi tuan rumah katalog chart wajib, terbagi ke empat tab
	 * yang masing-masing menjawab satu pertanyaan pengelola program.
	 *
	 * ── Tiga aturan tata letak yang bukan selera ─────────────────────────────
	 *
	 * 1. **Chart pada tab non-aktif DILEPAS dari DOM**, bukan disembunyikan dengan
	 *    `display:none`. Instans ECharts yang tersembunyi tetap memegang canvas dan
	 *    listener, dan `ResizeObserver` pada wadah berlebar nol memicu penggambaran
	 *    ulang ke ukuran nol yang tidak dipulihkan ECharts dengan sendirinya —
	 *    chart tampil kosong saat tabnya dibuka kembali.
	 * 2. **Setiap chart dibungkus panel berjudul + satu kalimat pertanyaan yang
	 *    dijawabnya.** Kalimat itu bagian dari spesifikasi, bukan hiasan: chart
	 *    tanpa pertanyaan dibaca sebagai dekorasi, dan dekorasi tidak pernah
	 *    ditindaklanjuti siapa pun.
	 * 3. **Tidak ada satu angka pun yang lahir di berkas ini.** Seluruh deret
	 *    datang dari store `admin` (yang memanggil service domain) dan store
	 *    `editorial` (corong pipeline). Halaman hanya menyusun dan memberi konteks.
	 *
	 * @see docs/10-REVISION-SPEC.md — §7.2 katalog chart, §7.3 tata letak, §7.4 responsif
	 * @see docs/12-BUILD-CONTRACT-V2.md — §3.5 WP-07
	 * @see docs/00-SOURCE-BRIEF.md — Hal 6 KPI dan Keluaran, Hal 7 timeline, Hal 10
	 */
	import { Button, Card, EmptyState, Icon, KpiCard, PageHeader, Tabs, ICONS } from '$lib/components';
	import AmplificationBarChart from '$lib/charts/AmplificationBarChart.svelte';
	import AmplificationTrendLine from '$lib/charts/AmplificationTrendLine.svelte';
	import CommunityPieChart from '$lib/charts/CommunityPieChart.svelte';
	import CoverageGaugeChart from '$lib/charts/CoverageGaugeChart.svelte';
	import CoverageSegmentBar from '$lib/charts/CoverageSegmentBar.svelte';
	import DisseminationComboChart from '$lib/charts/DisseminationComboChart.svelte';
	import EditorialPipelineFunnel from '$lib/charts/EditorialPipelineFunnel.svelte';
	import EngagementFunnelArea from '$lib/charts/EngagementFunnelArea.svelte';
	import EsgEvidenceGateBar from '$lib/charts/EsgEvidenceGateBar.svelte';
	import EsgRadarChart from '$lib/charts/EsgRadarChart.svelte';
	import KpiGaugeChart from '$lib/charts/KpiGaugeChart.svelte';
	import KpiRadarChart from '$lib/charts/KpiRadarChart.svelte';
	import PointSourceStackedBar from '$lib/charts/PointSourceStackedBar.svelte';
	import ReachEstimateBand from '$lib/charts/ReachEstimateBand.svelte';
	import TierDistributionChart from '$lib/charts/TierDistributionChart.svelte';
	import TrendLineChart from '$lib/charts/TrendLineChart.svelte';
	import VerifierSlaBar from '$lib/charts/VerifierSlaBar.svelte';
	import { COMMUNITIES } from '$lib/domain/constants/community.js';
	import { KPI_PARAMETERS, targetKpi } from '$lib/domain/constants/kpi-targets.js';
	import { admin } from '$lib/stores/admin.svelte.js';
	import { catalog } from '$lib/stores/catalog.svelte.js';
	import { editorial } from '$lib/stores/editorial.svelte.js';
	import { formatAngka, formatRingkas } from '$lib/utils/format.js';

	/** Ikon per metrik, semata-mata penanda visual. */
	const IKON_KPI = {
		'M-01': ICONS.users,
		'M-02': ICONS.book,
		'M-03': ICONS.megaphone,
		'M-04': ICONS.share,
		'M-05': ICONS.calendar
	};

	/**
	 * Empat tab dasbor. Setiap tab adalah satu pertanyaan pengelola, bukan satu
	 * kumpulan chart yang kebetulan sejenis.
	 */
	const TAB = Object.freeze({
		RINGKASAN: 'ringkasan',
		AMPLIFIKASI: 'amplifikasi',
		KOMUNITAS: 'komunitas',
		ESG: 'esg'
	});

	const DAFTAR_TAB = Object.freeze([
		Object.freeze({ id: TAB.RINGKASAN, label: 'Ringkasan' }),
		Object.freeze({ id: TAB.AMPLIFIKASI, label: 'Amplifikasi' }),
		Object.freeze({ id: TAB.KOMUNITAS, label: 'Komunitas' }),
		Object.freeze({ id: TAB.ESG, label: 'ESG & Dampak' })
	]);

	let tabAktif = $state(TAB.RINGKASAN);

	// Corong pipeline datang dari store editorial — satu-satunya sumber kebenaran
	// atas antrean naskah. Dasbor hanya MEMBACA: keputusan editorial bukan
	// kewenangan Admin.
	$effect(() => {
		editorial.load();
	});

	const kpiById = $derived(new Map(admin.kpi.map((baris) => [baris.id, baris])));

	const kartuKpi = $derived(
		admin.kpi.map((baris) => ({ ...baris, iconPath: IKON_KPI[baris.id] ?? ICONS.chart }))
	);

	const kpiCoverage = $derived(kpiById.get('M-01') ?? null);

	/** Empat KPI selain coverage — dibaca berdampingan sebagai deret meteran ringkas. */
	const kpiPendamping = $derived(admin.kpi.filter((baris) => baris.id !== 'M-01'));

	const kpiTercapai = $derived(admin.kpi.filter((baris) => baris.percent >= 100).length);

	/** Rekap bulanan yang sudah dipetakan ke seluruh bulan program. */
	const trenBulanan = $derived.by(() => {
		const rekap = new Map(admin.monthlyTrend.map((baris) => [baris.monthKey, baris]));
		return admin.programMonths.map((bulan) => ({
			monthKey: bulan.monthKey,
			label: bulan.label,
			points: rekap.get(bulan.monthKey)?.points ?? 0,
			count: rekap.get(bulan.monthKey)?.count ?? 0
		}));
	});

	const seriTren = $derived([
		{ name: 'Poin kontribusi', data: trenBulanan.map((b) => b.points) },
		{ name: 'Aksi tercatat', data: trenBulanan.map((b) => b.count) }
	]);

	const adaTren = $derived(trenBulanan.some((bulan) => bulan.points > 0 || bulan.count > 0));

	/** Sebaran anggota per komunitas — pemasok chart donat tab Komunitas. */
	const sebaranKomunitas = $derived(
		COMMUNITIES.map((k) => ({
			id: k.id,
			label: k.akronim,
			value: catalog.awardees.filter((awardee) => awardee.community === k.id).length
		}))
	);

	/** Radar kesiapan bukti ESG, disusun dari matriks pilar di store. */
	const seriRadarEsg = $derived([
		{
			name: 'Kesiapan bukti aktual',
			values: admin.esgReadiness.map((pilar) => pilar.readinessRate)
		}
	]);

	const indikatorRadarEsg = $derived(
		admin.esgReadiness.map((pilar) => ({ name: pilar.label, max: 100 }))
	);
</script>

<PageHeader
	eyebrow="Konsol Corporate Secretary"
	title="Dasbor statistik program"
	subtitle="Empat tab, empat pertanyaan: apakah program berjalan, apakah komunitas benar-benar menyebarkannya, siapa yang tumbuh dan siapa tertinggal, dan apakah bukti dampaknya layak dilaporkan. Seluruh angka dihitung dari data komunitas yang tercatat — tidak satu pun lahir di halaman ini."
>
	{#snippet actions()}
		<Button variant="secondary" size="sm" iconPath={ICONS.leaf} href="/admin/esg">Bukti ESG</Button>
		<Button variant="primary" size="sm" iconPath={ICONS.document} href="/admin/laporan">
			Susun laporan
		</Button>
	{/snippet}
</PageHeader>

<!-- ── Lima KPI inti Hal 6 ─────────────────────────────────────────────── -->
<section aria-labelledby="judul-kpi" class="mb-6">
	<div class="mb-3 flex flex-wrap items-baseline justify-between gap-2">
		<h2 id="judul-kpi" class="text-base font-bold text-heading">Lima Key Objective</h2>
		<p class="text-xs text-ink-600">
			<span class="numeric font-semibold text-ink-700">{kpiTercapai}</span> dari
			<span class="numeric font-semibold text-ink-700">{admin.kpi.length}</span> metrik mencapai target
		</p>
	</div>

	{#if admin.kpi.length === 0}
		<Card>
			<EmptyState
				title={admin.loading ? 'Menghitung capaian KPI' : 'Potret KPI belum tersedia'}
				message={admin.loading
					? 'Membaca registry anggota, kabar terkirim, dan riwayat aksi komunitas.'
					: 'Muat ulang data demo dari bilah atas untuk memasang kembali basis data komunitas.'}
				iconPath={ICONS.chart}
				size="sm"
			/>
		</Card>
	{:else}
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
			{#each kartuKpi as kpi (kpi.id)}
				<KpiCard {kpi} />
			{/each}
		</div>
	{/if}
</section>

<!-- ── Bilah tab ───────────────────────────────────────────────────────── -->
<Tabs tabs={DAFTAR_TAB} bind:active={tabAktif} class="mb-5" />

{#if tabAktif === TAB.RINGKASAN}
	<!-- ── Tab 1 · Ringkasan ───────────────────────────────────────────── -->
	<section aria-label="Ringkasan program" class="space-y-4">
		<Card>
			<h3 class="text-base font-bold text-heading">Ritme diseminasi konten</h3>
			<p class="mb-3 text-sm text-ink-600">
				Apakah ritme satu sampai dua konten dan minimal dua hari diseminasi per bulan terpenuhi?
			</p>
			<DisseminationComboChart
				data={admin.dissemination}
				targetKonten={targetKpi('M-02').target}
				targetHari={targetKpi('M-03').target}
				loading={admin.loading}
			/>
		</Card>

		<div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
			<Card>
				<h3 class="text-base font-bold text-heading">Coverage registrasi penerima manfaat</h3>
				<p class="mb-3 text-sm text-ink-600">
					Berapa persen penerima manfaat sudah terdata dan memberi consent?
				</p>
				<CoverageGaugeChart kpi={kpiCoverage} loading={admin.loading} />
			</Card>

			<Card>
				<h3 class="text-base font-bold text-heading">Bentuk capaian lima Key Objective</h3>
				<p class="mb-3 text-sm text-ink-600">Sisi mana dari program yang penyok?</p>
				<KpiRadarChart kpi={admin.kpi} loading={admin.loading} />
			</Card>

			<Card>
				<h3 class="text-base font-bold text-heading">Corong editorial</h3>
				<p class="mb-3 text-sm text-ink-600">
					Dari naskah yang masuk, berapa yang benar-benar terbit — dan di tahap mana penyusutan
					terbesar?
				</p>
				<EditorialPipelineFunnel data={editorial.pipeline} loading={editorial.loading} />
			</Card>

			<Card>
				<h3 class="text-base font-bold text-heading">Kepatuhan SLA antrean tinjauan</h3>
				<p class="mb-3 text-sm text-ink-600">
					Berapa butir antrean yang masih berada di dalam batas SLA verifikator?
				</p>
				<VerifierSlaBar data={admin.slaCompliance} loading={admin.loading} />
			</Card>
		</div>

		{#if kpiPendamping.length > 0}
			<Card>
				<h3 class="text-base font-bold text-heading">Meteran empat metrik pendamping</h3>
				<p class="mb-3 text-sm text-ink-600">
					Metrik mana yang sudah menyentuh targetnya, dan seberapa jauh sisanya?
				</p>
				<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
					{#each kpiPendamping as baris (baris.id)}
						<div class="rounded-card border border-ink-100 p-2">
							<KpiGaugeChart
								value={baris.actual}
								target={baris.target}
								label={baris.shortLabel}
								unit={baris.unit}
								status={baris.status}
								height="170px"
								loading={admin.loading}
							/>
						</div>
					{/each}
				</div>
			</Card>
		{/if}
	</section>
{:else if tabAktif === TAB.AMPLIFIKASI}
	<!-- ── Tab 2 · Amplifikasi ─────────────────────────────────────────── -->
	<section aria-label="Amplifikasi komunitas" class="space-y-4">
		<Card>
			<h3 class="text-base font-bold text-heading">Tren amplification rate</h3>
			<p class="mb-3 text-sm text-ink-600">
				Apakah separuh anggota ikut mengamplifikasi, dan apakah jaraknya terhadap seluruh anggota
				terdaftar melebar?
			</p>
			<AmplificationTrendLine
				data={admin.amplification}
				target={targetKpi('M-04').target}
				loading={admin.loading}
			/>
		</Card>

		<div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
			<Card>
				<h3 class="text-base font-bold text-heading">Amplifikasi per chapter</h3>
				<p class="mb-3 text-sm text-ink-600">
					Chapter mana yang paling menggerakkan penyebaran konten pada bulan terakhir program?
				</p>
				<AmplificationBarChart
					data={admin.amplificationByChapter}
					unit="%"
					target={targetKpi('M-04').target}
					loading={admin.loading}
				/>
			</Card>

			<Card>
				<h3 class="text-base font-bold text-heading">Tren kontribusi sepanjang program</h3>
				<p class="mb-3 text-sm text-ink-600">
					Apakah volume aksi komunitas ikut naik, atau hanya nilai poinnya yang membesar?
				</p>
				{#if adaTren}
					<TrendLineChart
						categories={trenBulanan.map((b) => b.label)}
						series={seriTren}
						height="300px"
						loading={admin.loading}
					/>
				{:else}
					<EmptyState
						title="Belum ada aksi berpoin tercatat"
						message="Tren muncul setelah anggota pertama membaca kabar, membagikan konten, atau menghadiri kegiatan komunitas."
						iconPath={ICONS.trend}
						size="sm"
					/>
				{/if}
			</Card>
		</div>
	</section>
{:else if tabAktif === TAB.KOMUNITAS}
	<!-- ── Tab 3 · Komunitas ───────────────────────────────────────────── -->
	<section aria-label="Pertumbuhan komunitas" class="space-y-4">
		<Card>
			<h3 class="text-base font-bold text-heading">Sumber poin per bulan</h3>
			<p class="mb-3 text-sm text-ink-600">
				Poin datang dari jenis kontribusi apa — aksi ringan, atau kontribusi bermakna?
			</p>
			<PointSourceStackedBar
				months={admin.programMonths}
				series={admin.pointSources}
				loading={admin.loading}
			/>
		</Card>

		<div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
			<Card>
				<h3 class="text-base font-bold text-heading">Cakupan registrasi per segmen</h3>
				<p class="mb-3 text-sm text-ink-600">Segmen mana yang tertinggal dari target cakupan?</p>
				<CoverageSegmentBar
					data={admin.coverageSegments}
					target={targetKpi('M-01').target}
					loading={admin.loading}
				/>
			</Card>

			<Card>
				<h3 class="text-base font-bold text-heading">Sebaran tier</h3>
				<p class="mb-3 text-sm text-ink-600">
					Komunitas mengerucut sehat, atau menumpuk di ambang paling bawah?
				</p>
				<TierDistributionChart data={admin.tierDistribution} height="280px" loading={admin.loading} />
			</Card>

			<Card>
				<h3 class="text-base font-bold text-heading">Corong keterlibatan</h3>
				<p class="mb-3 text-sm text-ink-600">
					Berapa yang terdaftar berubah menjadi aktif, lalu menjadi pengamplifikasi?
				</p>
				<EngagementFunnelArea
					data={admin.engagement}
					windowHari={KPI_PARAMETERS.windowAnggotaAktifHari}
					loading={admin.loading}
				/>
			</Card>

			<Card>
				<h3 class="text-base font-bold text-heading">Komposisi dua komunitas</h3>
				<p class="mb-3 text-sm text-ink-600">
					Seberapa berimbang keanggotaan SOBI dan Womenpreneur di dalam Pfriends?
				</p>
				<CommunityPieChart
					data={sebaranKomunitas}
					centerLabel="Awardee"
					height="280px"
					loading={catalog.loading}
				/>
			</Card>
		</div>
	</section>
{:else}
	<!-- ── Tab 4 · ESG & Dampak ────────────────────────────────────────── -->
	<section aria-label="Bukti ESG dan dampak" class="space-y-4">
		<Card>
			<h3 class="text-base font-bold text-heading">Estimasi jangkauan organik</h3>
			<p class="mb-3 text-sm text-ink-600">
				Berapa jangkauan organik yang masuk akal — dan seberapa lebar ketidakpastiannya?
			</p>
			<ReachEstimateBand data={admin.reachBand} loading={admin.loading} />
		</Card>

		<div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
			<Card>
				<h3 class="text-base font-bold text-heading">Gerbang bukti ESG</h3>
				<p class="mb-3 text-sm text-ink-600">Di gerbang mana bukti ESG paling banyak gugur?</p>
				<EsgEvidenceGateBar data={admin.esgGate} loading={admin.loading} />
			</Card>

			<Card>
				<h3 class="text-base font-bold text-heading">Profil kesiapan tiga pilar</h3>
				<p class="mb-3 text-sm text-ink-600">
					Pilar mana yang buktinya paling siap dilaporkan, dan mana yang belum boleh diklaim?
				</p>
				<EsgRadarChart series={seriRadarEsg} indicators={indikatorRadarEsg} loading={admin.loading} />
			</Card>
		</div>

		{#if admin.reach}
			<Card>
				<div class="mb-3 flex flex-wrap items-start justify-between gap-3">
					<div class="min-w-0">
						<h3 class="text-base font-bold text-heading">Angka komunikasi dan angka perencanaan</h3>
						<p class="mt-1 max-w-3xl text-sm text-ink-600">
							Keduanya ditampilkan berdampingan supaya tidak perlu ada yang memilih diam-diam.
							Angka bruto identik dengan cara Hal 6 menyajikannya; angka neto sudah didiskon
							tumpang tindih audiens, dan itulah yang dipakai untuk perencanaan.
						</p>
					</div>
					<span
						class="inline-flex shrink-0 items-center gap-1.5 rounded-chip bg-warning-tint px-2.5 py-1 text-xs font-semibold text-warning"
					>
						<Icon path={ICONS.info} size={14} />
						Estimasi bermodel
					</span>
				</div>

				<div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
					<div class="rounded-card border border-ink-100 bg-ink-50 p-4">
						<p class="label-micro">Anggota mengamplifikasi</p>
						<p class="numeric mt-1.5 text-3xl text-ink-900">
							{formatAngka(admin.reach.amplifiers)}
						</p>
						<p class="mt-1 text-xs text-ink-600">
							Basis perhitungan — anggota unik dengan minimal satu amplifikasi terhitung bulan ini.
						</p>
					</div>

					<div class="rounded-card border border-pertamina-blue/25 bg-info-tint/40 p-4">
						<p class="label-micro">Angka komunikasi (bruto)</p>
						<p class="numeric mt-1.5 text-2xl text-ink-900">
							{formatRingkas(admin.reach.pesimis.bruto)} – {formatRingkas(admin.reach.optimis.bruto)}
						</p>
						<p class="mt-1 text-xs text-ink-600">
							{formatAngka(admin.reach.pesimis.bruto)} sampai {formatAngka(admin.reach.optimis.bruto)}
							orang. Dipakai untuk materi presentasi.
						</p>
					</div>

					<div class="rounded-card border border-pertamina-green/25 bg-pertamina-green-tint/40 p-4">
						<p class="label-micro">Angka perencanaan (neto)</p>
						<p class="numeric mt-1.5 text-2xl text-ink-900">
							{formatRingkas(admin.reach.pesimis.neto)} – {formatRingkas(admin.reach.optimis.neto)}
						</p>
						<p class="mt-1 text-xs text-ink-600">
							Inilah angka yang dipakai untuk perencanaan dan klaim penghematan paid media.
						</p>
					</div>
				</div>

				<div class="mt-4 rounded-card border border-ink-100 p-4">
					<p class="text-sm font-semibold text-heading">Asumsi yang menopang angka di atas</p>
					<ul class="mt-2 space-y-1.5">
						{#each admin.reach.asumsi as asumsi (asumsi)}
							<li class="flex items-start gap-2 text-xs leading-relaxed text-ink-600">
								<Icon path={ICONS.info} size={14} class="mt-0.5 shrink-0 text-ink-400" />
								<span>{asumsi}</span>
							</li>
						{/each}
					</ul>
				</div>
			</Card>
		{/if}
	</section>
{/if}

<p class="mt-6 text-xs leading-relaxed text-ink-600">
	KPI Aktivitas membuktikan bahwa program berjalan. KPI ESG membuktikan bahwa program menciptakan
	nilai (Hal 10). Keduanya dilaporkan berdampingan namun tidak pernah dijumlahkan —
	<a class="font-semibold text-pertamina-red-ink underline" href="/admin/esg">buka Bukti ESG</a>
	untuk lapisan kedua.
</p>
