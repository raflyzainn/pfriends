<script>
	/**
	 * HALAMAN: Dasbor KPI Konsol Corporate Secretary.
	 *
	 * Tanggung jawab: satu layar yang menjawab dua pertanyaan pengelola program :
	 * **apakah aplikasinya berjalan sehat** dan **apakah publikasinya mencapai
	 * target**. Performa per-awardee sengaja TIDAK ada di sini; itu wilayah
	 * verifikator, dan mencampurnya membuat halaman ini berhenti menjadi dasbor
	 * program lalu berubah menjadi papan peringkat.
	 *
	 * ── Empat aturan tata letak yang bukan selera ────────────────────────────
	 *
	 * 1. **Satu baris kartu, empat chart, satu tabel: tidak lebih.** Versi
	 *    sebelumnya memakai empat tab berisi tiga belas chart. Dasbor yang perlu
	 *    diklik dulu sebelum menjawab apa pun bukan dasbor; ia katalog. Tab
	 *    dicabut, dan chart yang tersisa dipilih karena pertanyaannya, bukan
	 *    karena tersedia komponennya.
	 * 2. **Tidak ada satu angka pun yang lahir di berkas ini.** Seluruh deret
	 *    datang dari store `admin` (yang memanggil service domain) dan `catalog`.
	 *    Halaman hanya menyusun ulang dan memberi konteks.
	 * 3. **Setiap panel membawa satu kalimat pertanyaan yang dijawabnya.**
	 *    Kalimat itu bagian dari spesifikasi, bukan hiasan: chart tanpa
	 *    pertanyaan dibaca sebagai dekorasi, dan dekorasi tidak pernah
	 *    ditindaklanjuti siapa pun.
	 * 4. **Angka jangkauan selalu ditandai sebagai estimasi.** Ia hasil model,
	 *    bukan hasil pengukuran, dan satu-satunya tempat ia muncul adalah garis
	 *    putus-putus pada chart tren: bukan kartu angka besar yang mengundang
	 *    dikutip apa adanya di materi presentasi.
	 *
	 * Halaman ini MENYERAP inti dua halaman yang dicabut pada revisi 5 Agustus
	 * 2026: kesiapan bukti ESG (dulu `/admin/esg`) menjadi kartu angka kunci, dan
	 * rekap bulanan program (dulu `/admin/laporan`) menjadi tabel penutup. Yang
	 * hilang bersama kedua halaman itu hanyalah lapis rinciannya: pemetaan SDG,
	 * checklist bukti per naskah, dan perhitungan SROI: dan ketiganya memang
	 * bukan bahan yang dibaca sekali lihat di dasbor.
	 *
	 * @see docs/00-SOURCE-BRIEF.md: Hal 6 KPI dan Keluaran, Hal 10 ESG
	 */
	import { Card, EmptyState, PageHeader, StatTile, StatusBadge, ICONS } from '$lib/components';
	import AdminPublikasiTrend from '$lib/charts/AdminPublikasiTrend.svelte';
	import AdminSebaranChapter from '$lib/charts/AdminSebaranChapter.svelte';
	import EngagementFunnelArea from '$lib/charts/EngagementFunnelArea.svelte';
	import KpiRadarChart from '$lib/charts/KpiRadarChart.svelte';
	import { palette } from '$lib/charts/_chartTheme.js';
	import { CHAPTERS, COMMUNITIES } from '$lib/domain/constants/community.js';
	import { KPI_PARAMETERS, targetKpi } from '$lib/domain/constants/kpi-targets.js';
	import { accountRepository } from '$lib/infrastructure/repositories/index.js';
	import { bootstrapDatabase } from '$lib/infrastructure/seed/bootstrap.js';
	import { admin } from '$lib/stores/admin.svelte.js';
	import { catalog } from '$lib/stores/catalog.svelte.js';
	import { formatAngka, formatPersen, formatRingkas } from '$lib/utils/format.js';

	/**
	 * Warna komunitas untuk chart, disamakan dengan donat komunitas di zona lain.
	 * Heksadesimalnya tidak ditulis di sini: hanya dirujuk lewat tema chart.
	 */
	const WARNA_KOMUNITAS = Object.freeze({
		SOBI: palette.green,
		WOMENPRENEUR: palette.red
	});

	/** @type {import('$lib/domain/entities/UserAccount.js').UserAccount[]} */
	let akun = $state.raw([]);

	// Cacah akun dibaca langsung dari tabel `accounts`, bukan diturunkan dari
	// jumlah awardee ditambah angka tetap. Verifikator dan admin adalah baris akun
	// yang bisa bertambah, dan angka tetap yang ditulis di halaman akan diam-diam
	// salah pada hari pertama seseorang menambahkannya.
	$effect(() => {
		let dibatalkan = false;

		(async () => {
			await bootstrapDatabase();
			const baris = await accountRepository.getAll();
			if (!dibatalkan) akun = baris;
		})();

		return () => {
			dibatalkan = true;
		};
	});

	// ── Kartu angka kunci ────────────────────────────────────────────────────

	const naskahMasuk = $derived(catalog.stories.length);

	const akunAktif = $derived(akun.filter((baris) => baris.isActive).length);

	const rincianPeran = $derived(
		[
			{ jumlah: akun.filter((baris) => baris.isAwardee).length, label: 'awardee' },
			{ jumlah: akun.filter((baris) => baris.isVerifier).length, label: 'verifikator' },
			{ jumlah: akun.filter((baris) => baris.isAdmin).length, label: 'admin' }
		]
			.filter((baris) => baris.jumlah > 0)
			.map((baris) => `${formatAngka(baris.jumlah)} ${baris.label}`)
			.join(' · ')
	);

	/** Total konten unik dan hari diseminasi sepanjang tujuh bulan program. */
	const totalDiseminasi = $derived(
		admin.dissemination.reduce(
			(rekap, bulan) => ({
				konten: rekap.konten + bulan.contents,
				hari: rekap.hari + bulan.days
			}),
			{ konten: 0, hari: 0 }
		)
	);

	/**
	 * Kepatuhan SLA seluruh antrean tinjauan digabung. Median dihitung sebagai
	 * median terburuk antar-antrean, bukan rata-rata dari median: rata-rata dari
	 * median tidak bermakna secara statistik, dan yang perlu diketahui pengelola
	 * memang antrean yang paling lambat.
	 */
	const sla = $derived.by(() => {
		const dalam = admin.slaCompliance.reduce((jumlah, baris) => jumlah + baris.withinSla, 0);
		const lewat = admin.slaCompliance.reduce((jumlah, baris) => jumlah + baris.breachedSla, 0);
		const total = dalam + lewat;
		return {
			dalam,
			lewat,
			total,
			persen: total > 0 ? Math.round((dalam / total) * 100) : 0,
			medianTerburuk: admin.slaCompliance.reduce(
				(puncak, baris) => Math.max(puncak, baris.medianDays ?? 0),
				0
			)
		};
	});

	/** Rata-rata kesiapan bukti tiga pilar ESG: serapan dari halaman Bukti ESG. */
	const kesiapanEsg = $derived(
		admin.esgReadiness.length > 0
			? Math.round(
					admin.esgReadiness.reduce((jumlah, pilar) => jumlah + pilar.readinessRate, 0) /
						admin.esgReadiness.length
				)
			: 0
	);

	const pilarTerlemah = $derived(
		admin.esgReadiness.length > 0
			? [...admin.esgReadiness].sort((a, b) => a.readinessRate - b.readinessRate)[0]
			: null
	);

	// ── Deret chart ──────────────────────────────────────────────────────────

	/** Cacah naskah terbit per bulan program, dibaca dari tanggal terbitnya. */
	const terbitPerBulan = $derived.by(() => {
		/** @type {Map<string, number>} */
		const rekap = new Map(admin.programMonths.map((bulan) => [bulan.monthKey, 0]));
		for (const cerita of admin.publishedStories) {
			const pada = cerita.publishedAt;
			if (!(pada instanceof Date) || Number.isNaN(pada.getTime())) continue;
			const kunci = `${pada.getFullYear()}-${String(pada.getMonth() + 1).padStart(2, '0')}`;
			if (rekap.has(kunci)) rekap.set(kunci, (rekap.get(kunci) ?? 0) + 1);
		}
		return rekap;
	});

	/** Deret dicocokkan lewat `monthKey`, bukan lewat indeks larik. */
	const diseminasiPerBulan = $derived(
		new Map(admin.dissemination.map((bulan) => [bulan.monthKey, bulan]))
	);

	const jangkauanPerBulan = $derived(new Map(admin.reachBand.map((bulan) => [bulan.monthKey, bulan])));

	const amplifikasiPerBulan = $derived(
		new Map(admin.amplification.map((bulan) => [bulan.monthKey, bulan]))
	);

	const poinPerBulan = $derived(new Map(admin.monthlyTrend.map((bulan) => [bulan.monthKey, bulan])));

	/** Satu baris per bulan program: pemasok chart tren sekaligus tabel penutup. */
	const rekapBulanan = $derived(
		admin.programMonths.map((bulan) => ({
			id: bulan.monthKey,
			label: bulan.label,
			terbit: terbitPerBulan.get(bulan.monthKey) ?? 0,
			konten: diseminasiPerBulan.get(bulan.monthKey)?.contents ?? 0,
			hari: diseminasiPerBulan.get(bulan.monthKey)?.days ?? 0,
			amplifikasi: amplifikasiPerBulan.get(bulan.monthKey)?.activeRate ?? 0,
			poin: poinPerBulan.get(bulan.monthKey)?.points ?? 0,
			jangkauan: jangkauanPerBulan.get(bulan.monthKey)?.mid ?? 0
		}))
	);

	/** Sebaran anggota per chapter, dipecah per komunitas. */
	const sebaranChapter = $derived({
		kategori: CHAPTERS.map((chapter) => chapter.label),
		seri: COMMUNITIES.map((komunitas) => ({
			name: komunitas.akronim,
			color: WARNA_KOMUNITAS[komunitas.id],
			data: CHAPTERS.map(
				(chapter) =>
					catalog.awardees.filter(
						(awardee) => awardee.chapterId === chapter.id && awardee.community === komunitas.id
					).length
			)
		}))
	});

	const kpiTercapai = $derived(admin.kpi.filter((baris) => baris.percent >= 100).length);

	const KOLOM_REKAP = Object.freeze([
		{ key: 'label', label: 'Bulan' },
		{ key: 'terbit', label: 'Blog terbit', numeric: true },
		{ key: 'konten', label: 'Konten diseminasi', numeric: true },
		{ key: 'hari', label: 'Hari diseminasi', numeric: true },
		{ key: 'amplifikasi', label: 'Amplifikasi', numeric: true },
		{ key: 'poin', label: 'Poin kontribusi', numeric: true },
		{ key: 'jangkauan', label: 'Estimasi jangkauan', numeric: true }
	]);
</script>

<PageHeader
	eyebrow="Konsol Corporate Secretary"
	title="Dasbor KPI"
	subtitle="Kesehatan aplikasi dan capaian publikasi PFriends untuk periode program Januari–Juli 2026. Seluruh angka dihitung dari data komunitas yang tercatat: tidak satu pun lahir di halaman ini. Performa per-awardee tidak ditampilkan di sini; itu wilayah verifikator."
/>

<!-- ── Baris kartu angka kunci ─────────────────────────────────────────── -->
<section aria-label="Angka kunci program" class="mb-6">
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
		<StatTile
			label="Blog terpublikasi"
			value={admin.publishedStories.length}
			unit="naskah"
			hint="{formatAngka(admin.pendingCount)} menunggu tinjauan · {formatAngka(naskahMasuk)} naskah masuk"
			iconPath={ICONS.book}
			color="var(--color-pertamina-blue)"
		/>
		<StatTile
			label="Konten terdiseminasi"
			value={totalDiseminasi.konten}
			unit="konten"
			hint="{formatAngka(totalDiseminasi.hari)} hari diseminasi sepanjang program"
			iconPath={ICONS.megaphone}
			color="var(--color-pertamina-green)"
		/>
		<StatTile
			label="Akun terdaftar"
			value={akun.length}
			unit="akun"
			hint={rincianPeran || 'Membaca tabel akun'}
			iconPath={ICONS.users}
			color="var(--color-pertamina-navy)"
		/>
		<StatTile
			label="Kepatuhan SLA tinjauan"
			value={sla.total > 0 ? formatPersen(sla.persen) : ':'}
			hint={sla.total > 0
				? `${formatAngka(sla.lewat)} butir lewat batas · median terlama ${formatAngka(sla.medianTerburuk)} hari`
				: 'Belum ada butir tinjauan yang selesai'}
			iconPath={ICONS.clock}
			color="var(--color-tier-champion)"
		/>
		<StatTile
			label="Kesiapan bukti ESG"
			value={admin.esgReadiness.length > 0 ? formatPersen(kesiapanEsg) : ':'}
			hint={pilarTerlemah
				? `Rata-rata tiga pilar · terlemah ${pilarTerlemah.label}`
				: 'Menunggu matriks bukti tiga pilar'}
			iconPath={ICONS.leaf}
			color="var(--color-pertamina-red)"
		/>
	</div>
</section>

<!-- ── Chart 1 · ritme publikasi ───────────────────────────────────────── -->
<Card class="mb-4">
	<div class="mb-3 flex flex-wrap items-start justify-between gap-3">
		<div class="min-w-0">
			<h2 class="text-base font-bold text-heading">Ritme publikasi per bulan</h2>
			<p class="mt-1 max-w-3xl text-sm text-ink-600">
				Apakah blog terbit dan kabar terdiseminasi mengalir setiap bulan, atau menumpuk di
				beberapa bulan saja?
			</p>
		</div>
		<StatusBadge label="Jangkauan = estimasi" color="amber" size="sm" iconPath={ICONS.info} />
	</div>

	<AdminPublikasiTrend
		data={rekapBulanan}
		targetKonten={targetKpi('M-02').target}
		loading={admin.loading}
	/>
</Card>

<!-- ── Chart 2 & 3 ─────────────────────────────────────────────────────── -->
<div class="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
	<Card>
		<div class="mb-3 flex flex-wrap items-baseline justify-between gap-2">
			<h2 class="text-base font-bold text-heading">Capaian KPI terhadap target</h2>
			<p class="text-xs text-ink-600">
				<span class="numeric font-semibold text-ink-700">{kpiTercapai}</span>
				dari
				<span class="numeric font-semibold text-ink-700">{admin.kpi.length}</span> metrik tercapai
			</p>
		</div>
		<p class="mb-3 text-sm text-ink-600">Sisi mana dari lima Key Objective yang penyok?</p>

		<KpiRadarChart kpi={admin.kpi} loading={admin.loading} />
	</Card>

	<Card>
		<h2 class="text-base font-bold text-heading">Corong keterlibatan</h2>
		<p class="mb-3 text-sm text-ink-600">
			Berapa yang terdaftar berubah menjadi aktif, lalu menjadi pengamplifikasi?
		</p>

		<EngagementFunnelArea
			data={admin.engagement}
			windowHari={KPI_PARAMETERS.windowAnggotaAktifHari}
			loading={admin.loading}
		/>
	</Card>
</div>

<!-- ── Chart 4 · sebaran chapter ───────────────────────────────────────── -->
<Card class="mb-6">
	<h2 class="text-base font-bold text-heading">Sebaran anggota per chapter</h2>
	<p class="mb-3 text-sm text-ink-600">
		Chapter mana yang paling besar, dan bagaimana komposisi kedua komunitas di dalamnya?
	</p>

	<AdminSebaranChapter
		categories={sebaranChapter.kategori}
		series={sebaranChapter.seri}
		loading={catalog.loading}
	/>
</Card>

<!-- ── Tabel penutup · rekap bulanan ───────────────────────────────────── -->
<section aria-labelledby="judul-rekap">
	<div class="mb-3">
		<h2 id="judul-rekap" class="text-base font-bold text-heading">Rekap bulanan program</h2>
		<p class="mt-1 max-w-3xl text-sm text-ink-600">
			Angka yang sama dengan chart di atas, dalam bentuk yang dapat disalin ke laporan bulanan.
			Kolom estimasi jangkauan memakai angka neto: sudah didiskon tumpang tindih audiens.
		</p>
	</div>

	{#if rekapBulanan.length === 0}
		<Card>
			<EmptyState
				title={admin.loading ? 'Menyusun rekap bulanan' : 'Rekap bulanan belum tersedia'}
				message={admin.loading
					? 'Membaca registry anggota, kabar terkirim, dan riwayat aksi komunitas.'
					: 'Muat ulang data demo dari bilah atas untuk memasang kembali basis data komunitas.'}
				iconPath={ICONS.chart}
				size="sm"
			/>
		</Card>
	{:else}
		<div class="overflow-hidden rounded-card border border-ink-100 bg-surface shadow-card">
			<div class="overflow-x-auto">
				<table class="w-full min-w-max border-collapse text-left">
					<caption class="sr-only">
						Rekap bulanan program Januari–Juli 2026: blog terbit, konten terdiseminasi, hari
						diseminasi, amplification rate, poin kontribusi, dan estimasi jangkauan organik.
					</caption>

					<thead>
						<tr class="bg-ink-50">
							{#each KOLOM_REKAP as kolom (kolom.key)}
								<th
									scope="col"
									class="label-micro px-4 py-3 whitespace-nowrap {kolom.numeric
										? 'text-right'
										: 'text-left'}"
								>
									{kolom.label}
								</th>
							{/each}
						</tr>
					</thead>

					<tbody>
						{#each rekapBulanan as baris (baris.id)}
							<tr class="border-b border-ink-100 transition-colors last:border-b-0 hover:bg-ink-50">
								<th scope="row" class="px-4 py-2.5 text-sm font-semibold text-ink-900">
									{baris.label}
								</th>
								<td class="numeric h-12 px-4 py-2.5 text-right text-sm tabular-nums text-ink-700">
									{formatAngka(baris.terbit)}
								</td>
								<td class="numeric h-12 px-4 py-2.5 text-right text-sm tabular-nums text-ink-700">
									{formatAngka(baris.konten)}
								</td>
								<td class="numeric h-12 px-4 py-2.5 text-right text-sm tabular-nums text-ink-700">
									{formatAngka(baris.hari)}
								</td>
								<td class="numeric h-12 px-4 py-2.5 text-right text-sm tabular-nums text-ink-700">
									{formatPersen(baris.amplifikasi)}
								</td>
								<td class="numeric h-12 px-4 py-2.5 text-right text-sm tabular-nums text-ink-700">
									{formatAngka(baris.poin)}
								</td>
								<td class="numeric h-12 px-4 py-2.5 text-right text-sm tabular-nums text-ink-500">
									± {formatRingkas(baris.jangkauan)}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}

	<p class="mt-3 text-xs leading-relaxed text-ink-600">
		KPI Aktivitas membuktikan bahwa program berjalan; kesiapan bukti ESG membuktikan bahwa program
		menciptakan nilai. Keduanya dilaporkan berdampingan dan tidak pernah dijumlahkan.
	</p>
</section>
