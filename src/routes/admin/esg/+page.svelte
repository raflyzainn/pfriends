<script>
	/**
	 * HALAMAN — Bukti ESG.
	 *
	 * Tanggung jawab: menampilkan matriks bukti tiga pilar beserta cakupan
	 * aktivitas, pemetaan SDG, dan antrean bukti yang belum lengkap.
	 *
	 * Halaman ini dibangun di sekitar satu kalimat Hal 10: *KPI Aktivitas
	 * membuktikan bahwa program berjalan; KPI ESG membuktikan bahwa program
	 * menciptakan nilai.* Konsekuensinya tegas dan terlihat di tata letak —
	 * kedua jenis KPI ditampilkan berdampingan, berlabel jelas, dan TIDAK PERNAH
	 * dijumlahkan. Menggabungkan "jumlah share" dengan "kilogram sampah
	 * terkumpul" ke dalam satu skor komposit justru mengaburkan tepat perbedaan
	 * yang ditegaskan Hal 10.
	 *
	 * Gerbang empat syarat Hal 12 bersifat konjungtif penuh. Cerita yang
	 * kehilangan satu syarat tidak masuk agregasi, dan tidak ada mekanisme di
	 * halaman ini untuk melewatinya. Kesiapan yang belum penuh ditampilkan apa
	 * adanya — dasbor yang menampilkan klaim dampak tanpa bukti di belakangnya
	 * merusak kredibilitas program yang hendak dibuktikannya.
	 *
	 * @see docs/00-SOURCE-BRIEF.md — Hal 9 bukti pipeline, Hal 10 ESG, Hal 12 gerbang bukti
	 * @see docs/04-ESG-GOVERNANCE.md — §1 model bukti tiga pilar, §8.4 pemisahan dua jenis KPI
	 */
	import {
		Button,
		Card,
		EmptyState,
		Icon,
		PageHeader,
		ProgressBar,
		StatusBadge,
		ICONS
	} from '$lib/components';
	import EsgEvidenceGateBar from '$lib/charts/EsgEvidenceGateBar.svelte';
	import EsgRadarChart from '$lib/charts/EsgRadarChart.svelte';
	import { ESG_EVIDENCE_GATE, ESG_PILLARS } from '$lib/domain/constants/esg-taxonomy.js';
	import { admin } from '$lib/stores/admin.svelte.js';
	import { formatAngka, formatPersen, potongTeks } from '$lib/utils/format.js';

	/**
	 * Ambang kelengkapan bukti yang membuka Fase 5 (dasbor SROI) pada peta fase
	 * docs/04 §8.3. Berstatus [USUL] dan menunggu persetujuan Corsec.
	 */
	const AMBANG_KELENGKAPAN_FASE_LANJUT = 85;

	/**
	 * Perbedaan struktural dua jenis KPI (docs/02 §4.1). Ditampilkan sebagai
	 * tabel, bukan paragraf, karena inilah yang paling sering perlu dirujuk ulang
	 * saat menyusun laporan ke manajemen.
	 */
	const PERBEDAAN_KPI = Object.freeze([
		Object.freeze({
			dimensi: 'Membuktikan',
			aktivitas: 'Program berjalan',
			esg: 'Program menciptakan nilai'
		}),
		Object.freeze({
			dimensi: 'Unit analisis',
			aktivitas: 'Peristiwa — kiriman, klik, kehadiran',
			esg: 'Perubahan pada penerima manfaat atau lingkungan'
		}),
		Object.freeze({
			dimensi: 'Sumber angka',
			aktivitas: 'Log sistem, terkumpul otomatis',
			esg: 'Bukti terkurasi disertai validasi manusia'
		}),
		Object.freeze({
			dimensi: 'Syarat verifikasi',
			aktivitas: 'Tidak ada — sistem yang mencatat',
			esg: 'Wajib empat unsur Hal 12'
		}),
		Object.freeze({
			dimensi: 'Dapat dimanipulasi',
			aktivitas: 'Ya — volume mudah dinaikkan',
			esg: 'Sulit — menuntut bukti dan persetujuan'
		}),
		Object.freeze({
			dimensi: 'Mode kegagalan',
			aktivitas: 'Angka bagus, dampak nihil',
			esg: 'Dampak nyata tidak terdokumentasi'
		})
	]);

	const matriks = $derived(
		admin.esgMatrix
			? ESG_PILLARS.map((pilar) => ({
					definisi: pilar,
					ringkasan: admin.esgMatrix[pilar.pillar]
				})).filter((baris) => Boolean(baris.ringkasan))
			: []
	);

	const totalBukti = $derived(
		matriks.reduce((jumlah, baris) => jumlah + baris.ringkasan.total, 0)
	);

	const totalSiap = $derived(
		matriks.reduce((jumlah, baris) => jumlah + baris.ringkasan.ready, 0)
	);

	const kelengkapanKeseluruhan = $derived(
		totalBukti > 0 ? Math.round((totalSiap / totalBukti) * 100) : 0
	);

	const sdgTerbukti = $derived(admin.sdgCoverage.filter((sdg) => sdg.count > 0));

	const sdgBelumTerbukti = $derived(admin.sdgCoverage.filter((sdg) => sdg.count === 0));

	const seriRadar = $derived([
		{
			name: 'Kesiapan bukti aktual',
			values: matriks.map((baris) => baris.ringkasan.readinessRate)
		},
		{
			name: `Ambang gerbang fase lanjut (${AMBANG_KELENGKAPAN_FASE_LANJUT}%)`,
			values: matriks.map(() => AMBANG_KELENGKAPAN_FASE_LANJUT)
		}
	]);

	const indikatorRadar = $derived(matriks.map((baris) => ({ name: baris.definisi.label, max: 100 })));

	const fase4Terpenuhi = $derived(kelengkapanKeseluruhan >= AMBANG_KELENGKAPAN_FASE_LANJUT);

	const kpiAktivitas = $derived(admin.kpi);
</script>

<PageHeader
	eyebrow="Bukti ESG"
	title="Matriks bukti tiga pilar"
	subtitle="Cerita hanya masuk agregasi ESG setelah lolos keempat gerbang Hal 12. Kesiapan yang belum penuh ditampilkan apa adanya — klaim dampak tanpa bukti di belakangnya merusak kredibilitas program yang hendak dibuktikannya."
>
	{#snippet actions()}
		<Button variant="secondary" size="sm" iconPath={ICONS.shield} href="/admin/moderasi">
			Antrean moderasi
		</Button>
		<Button variant="primary" size="sm" iconPath={ICONS.document} href="/admin/laporan">
			Susun laporan
		</Button>
	{/snippet}
</PageHeader>

<!-- ── Pemisahan dua jenis KPI (Hal 10) ────────────────────────────────── -->
<section aria-labelledby="judul-pemisahan" class="mb-8">
	<Card>
		<h2 id="judul-pemisahan" class="text-base font-bold text-heading">
			KPI Aktivitas dan KPI ESG adalah dua hal berbeda
		</h2>
		<p class="mt-1 max-w-4xl text-sm leading-relaxed text-ink-600">
			Hal 9 mengarahkan KPI amplifikasi tunggal dipecah menjadi dua lapis: Engagement KPI dan ESG
			evidence KPI. Keduanya dilaporkan berdampingan namun tidak pernah dijumlahkan menjadi satu
			skor komposit.
		</p>

		<div class="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
			<div class="rounded-card border border-pertamina-blue/25 bg-info-tint/30 p-4">
				<div class="flex items-start justify-between gap-2">
					<div>
						<p class="label-micro">Lapis pertama</p>
						<p class="mt-0.5 text-sm font-bold text-heading">KPI Aktivitas</p>
					</div>
					<Icon path={ICONS.bolt} size={20} class="shrink-0 text-pertamina-blue" />
				</div>
				<p class="mt-2 text-2xl">
					<span class="numeric text-ink-900">
						{kpiAktivitas.filter((baris) => baris.percent >= 100).length}
					</span>
					<span class="text-sm text-ink-500">dari {kpiAktivitas.length} metrik tercapai</span>
				</p>
				<p class="mt-1.5 text-xs leading-relaxed text-ink-600">
					Lima Key Objective Hal 6, terkumpul otomatis dari log sistem. Membuktikan program
					berjalan.
				</p>
				<a
					class="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-pertamina-red-ink"
					href="/admin"
				>
					Buka dasbor KPI Aktivitas
					<Icon path={ICONS.arrowRight} size={13} />
				</a>
			</div>

			<div class="rounded-card border border-pertamina-green/25 bg-pertamina-green-tint/30 p-4">
				<div class="flex items-start justify-between gap-2">
					<div>
						<p class="label-micro">Lapis kedua</p>
						<p class="mt-0.5 text-sm font-bold text-heading">KPI ESG Evidence</p>
					</div>
					<Icon path={ICONS.leaf} size={20} class="shrink-0 text-pertamina-green" />
				</div>
				<p class="mt-2 text-2xl">
					<span class="numeric text-ink-900">{formatAngka(totalSiap)}</span>
					<span class="text-sm text-ink-500">dari {formatAngka(totalBukti)} bukti lolos gerbang</span>
				</p>
				<p class="mt-1.5 text-xs leading-relaxed text-ink-600">
					Hanya record yang memenuhi keempat unsur Hal 12. Membuktikan program menciptakan nilai.
				</p>
				<p class="numeric mt-2 text-xs font-semibold text-pertamina-green-ink">
					Kelengkapan bukti {formatPersen(kelengkapanKeseluruhan)}
				</p>
			</div>
		</div>

		<details class="mt-4">
			<summary class="cursor-pointer text-sm font-semibold text-heading">
				Perbedaan struktural keduanya
			</summary>
			<div class="mt-3 overflow-x-auto">
				<table class="w-full min-w-max border-collapse text-left text-sm">
					<caption class="sr-only">
						Perbandingan enam dimensi antara KPI Aktivitas dan KPI ESG
					</caption>
					<thead>
						<tr class="border-b border-ink-200">
							<th scope="col" class="label-micro py-2 pr-4">Dimensi</th>
							<th scope="col" class="label-micro py-2 pr-4">KPI Aktivitas</th>
							<th scope="col" class="label-micro py-2">KPI ESG</th>
						</tr>
					</thead>
					<tbody>
						{#each PERBEDAAN_KPI as baris (baris.dimensi)}
							<tr class="border-b border-ink-100 last:border-b-0">
								<th scope="row" class="py-2 pr-4 text-xs font-semibold text-ink-700">
									{baris.dimensi}
								</th>
								<td class="py-2 pr-4 text-xs text-ink-600">{baris.aktivitas}</td>
								<td class="py-2 text-xs text-ink-600">{baris.esg}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</details>
	</Card>
</section>

<!-- ── Empat gerbang bukti ─────────────────────────────────────────────── -->
<section aria-labelledby="judul-gerbang" class="mb-8">
	<h2 id="judul-gerbang" class="mb-1 text-base font-bold text-heading">
		Empat gerbang minimum bukti ESG
	</h2>
	<p class="mb-3 max-w-4xl text-sm text-ink-600">
		Hal 12 menuliskannya sebagai satu baris: <em
			>documented activity + outcome note + ESG/SDG tag + evidence source</em
		>. Keempatnya bersifat konjungtif — record yang kehilangan salah satunya berhenti di status
		belum lengkap.
	</p>

	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
		{#each ESG_EVIDENCE_GATE as gerbang, index (gerbang.key)}
			<Card padding="sm">
				<div class="flex items-start gap-2.5">
					<span
						class="numeric inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-chip bg-pertamina-navy-tint text-xs font-bold text-pertamina-navy"
						aria-hidden="true"
					>
						{index + 1}
					</span>
					<div class="min-w-0">
						<p class="text-sm font-semibold text-ink-900">{gerbang.label}</p>
						<p class="text-xs text-ink-400">{gerbang.labelSumber}</p>
						<p class="mt-1.5 text-xs leading-relaxed text-ink-600">{gerbang.deskripsi}</p>
					</div>
				</div>
			</Card>
		{/each}
	</div>
</section>

<!-- ── Matriks tiga pilar ──────────────────────────────────────────────── -->
<section aria-labelledby="judul-matriks" class="mb-8">
	<h2 id="judul-matriks" class="mb-3 text-base font-bold text-heading">
		Matriks bukti per pilar
	</h2>

	{#if matriks.length === 0}
		<Card>
			<EmptyState
				title={admin.loading ? 'Menyusun matriks bukti' : 'Matriks bukti belum tersedia'}
				message="Matriks terisi setelah cerita pertama membawa tag pilar E, S, atau G."
				iconPath={ICONS.leaf}
			/>
		</Card>
	{:else}
		<div class="grid grid-cols-1 gap-4 xl:grid-cols-3">
			{#each matriks as baris (baris.definisi.pillar)}
				{@const pilar = baris.definisi}
				{@const ringkasan = baris.ringkasan}
				<Card accent="var(--color-{pilar.token})">
					<div class="flex items-start justify-between gap-2">
						<div class="min-w-0">
							<p class="label-micro">{pilar.labelSumber}</p>
							<h3 class="text-base font-bold text-heading">{pilar.label}</h3>
						</div>
						<span
							class="numeric inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold"
							style="background:var(--color-{pilar.tint});color:var(--color-{pilar.ink});"
							aria-hidden="true"
						>
							{pilar.pillar}
						</span>
					</div>

					<p class="mt-2 text-xs leading-relaxed text-ink-600">{pilar.deskripsi}</p>

					<div class="mt-3">
						<div class="mb-1 flex items-baseline justify-between text-xs">
							<span class="text-ink-600">Bukti lolos gerbang</span>
							<span class="numeric font-semibold text-ink-800">
								{formatAngka(ringkasan.ready)} dari {formatAngka(ringkasan.total)}
							</span>
						</div>
						<ProgressBar
							value={ringkasan.readinessRate}
							max={100}
							color="var(--color-{pilar.token})"
							label="Kesiapan bukti pilar {pilar.label}"
						/>
						<p class="mt-1 text-xs text-ink-500">
							{formatPersen(ringkasan.readinessRate)} siap ·
							{formatAngka(ringkasan.incomplete)} masih kurang bukti
						</p>
					</div>

					<div class="mt-3">
						<p class="label-micro mb-1.5">Cakupan aktivitas</p>
						<ul class="flex flex-wrap gap-1.5">
							{#each pilar.cakupan as cakupan (cakupan.key)}
								<li
									class="rounded-chip px-2 py-0.5 text-[11px] font-medium"
									style="background:var(--color-{pilar.tint});color:var(--color-{pilar.ink});"
									title={cakupan.labelSumber}
								>
									{cakupan.label}
								</li>
							{/each}
						</ul>
					</div>

					<div class="mt-3">
						<p class="label-micro mb-1.5">SDG terbukti pilar ini</p>
						{#if ringkasan.sdgGoals.length > 0}
							<ul class="flex flex-wrap gap-1.5">
								{#each ringkasan.sdgGoals as goal (goal)}
									<li
										class="numeric rounded-chip bg-ink-100 px-2 py-0.5 text-[11px] font-bold text-ink-700"
									>
										SDG {goal}
									</li>
								{/each}
							</ul>
						{:else}
							<p class="text-xs text-ink-500">
								Belum ada SDG yang benar-benar terbukti pada pilar ini — klaim SDG belum boleh
								dibuat.
							</p>
						{/if}
					</div>

					<details class="mt-3">
						<summary class="cursor-pointer text-xs font-semibold text-ink-700">
							Bukti dan metrik yang diminta Hal 10
						</summary>
						<ul class="mt-2 space-y-1.5">
							{#each pilar.buktiField as bukti (bukti.key)}
								<li class="text-xs leading-relaxed text-ink-600">
									<span class="font-semibold text-ink-800">{bukti.label}</span> — {bukti.deskripsi}
								</li>
							{/each}
						</ul>
					</details>
				</Card>
			{/each}
		</div>
	{/if}
</section>

<!-- ── Radar dan cakupan SDG ───────────────────────────────────────────── -->
<section aria-labelledby="judul-radar" class="mb-8 grid grid-cols-1 gap-4 xl:grid-cols-2">
	<Card>
		<h2 id="judul-radar" class="mb-1 text-base font-bold text-heading">
			Profil kesiapan tiga pilar
		</h2>
		<p class="mb-3 text-sm text-ink-600">
			Sumbu radar menampilkan porsi bukti yang lolos keempat gerbang pada tiap pilar, dibandingkan
			ambang kelengkapan yang membuka pelaporan dampak.
		</p>

		<EsgRadarChart series={seriRadar} indicators={indikatorRadar} loading={admin.loading} />

		<div
			class="mt-3 rounded-card border p-3 {fase4Terpenuhi
				? 'border-pertamina-green/25 bg-pertamina-green-tint/40'
				: 'border-warning/25 bg-warning-tint/40'}"
		>
			<p class="flex items-center gap-2 text-sm font-semibold text-heading">
				<Icon path={fase4Terpenuhi ? ICONS.checkCircle : ICONS.clock} size={16} />
				{fase4Terpenuhi
					? 'Ambang kelengkapan bukti terpenuhi'
					: 'Menunggu pipeline bukti mencapai ambang'}
			</p>
			<p class="mt-1 text-xs leading-relaxed text-ink-600">
				Kelengkapan keseluruhan {formatPersen(kelengkapanKeseluruhan)} terhadap ambang
				{AMBANG_KELENGKAPAN_FASE_LANJUT}%. Hal 9 menuntut bukti pipeline berdiri lebih dulu sebelum
				dasbor dampak — urutan itu prasyarat kredibilitas, bukan preferensi teknis.
			</p>
		</div>

		<!--
			Corong gerbang bukti dipasang tepat di bawah radar, bukan di halaman lain:
			radar menjawab "pilar mana yang siap", corong menjawab "mengapa yang lain
			belum". Dua pertanyaan itu selalu ditanyakan berurutan, dan memisahkannya
			ke dua halaman memaksa pembaca mengingat angka sambil berpindah.
		-->
		<div class="mt-4 border-t border-ink-100 pt-4">
			<h3 class="text-base font-bold text-heading">Di gerbang mana bukti gugur</h3>
			<p class="mb-3 text-sm text-ink-600">
				Tahapnya kumulatif, sehingga batangnya menurun monoton. Susut terbesar antardua batang
				adalah permintaan yang paling berdampak bila diajukan kepada penulis.
			</p>
			<EsgEvidenceGateBar data={admin.esgGate} height="260px" loading={admin.loading} />
		</div>
	</Card>

	<Card>
		<h2 class="mb-1 text-base font-bold text-heading">Pemetaan SDG</h2>
		<p class="mb-3 text-sm text-ink-600">
			Hanya tujuan yang benar-benar dibuktikan cerita siap yang tercatat. Tujuan tanpa bukti tetap
			ditampilkan — justru kekosongan itulah yang menunjukkan klaim mana yang belum boleh dibuat.
		</p>

		{#if sdgTerbukti.length > 0}
			<ul class="space-y-2">
				{#each sdgTerbukti as sdg (sdg.goal)}
					<li class="flex items-center gap-2.5">
						<span
							class="numeric inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
							style="background:{sdg.color};"
							aria-hidden="true"
						>
							{sdg.goal}
						</span>
						<span class="min-w-0 flex-1">
							<span class="block truncate text-sm font-medium text-ink-800">{sdg.label}</span>
						</span>
						<span class="numeric shrink-0 text-sm font-bold text-ink-900">
							{formatAngka(sdg.count)}
						</span>
					</li>
				{/each}
			</ul>
		{:else}
			<EmptyState
				title="Belum ada SDG terbukti"
				message="Nomor SDG tercatat setelah cerita bertag lolos keempat gerbang bukti."
				iconPath={ICONS.globe}
				size="sm"
			/>
		{/if}

		{#if sdgBelumTerbukti.length > 0}
			<div class="mt-4 border-t border-ink-100 pt-3">
				<p class="label-micro mb-1.5">Belum terbukti ({sdgBelumTerbukti.length} tujuan)</p>
				<ul class="flex flex-wrap gap-1.5">
					{#each sdgBelumTerbukti as sdg (sdg.goal)}
						<li
							class="numeric rounded-chip bg-ink-100 px-2 py-0.5 text-[11px] font-semibold text-ink-500"
							title={sdg.label}
						>
							SDG {sdg.goal}
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</Card>
</section>

<!-- ── Antrean bukti belum lengkap ─────────────────────────────────────── -->
<section aria-labelledby="judul-antrean">
	<div class="mb-3">
		<h2 id="judul-antrean" class="text-base font-bold text-heading">
			Bukti hampir lengkap ({formatAngka(admin.esgIncomplete.length)})
		</h2>
		<p class="mt-1 max-w-4xl text-sm text-ink-600">
			Cerita yang sudah membawa tag ESG namun belum memenuhi seluruh gerbang, diurutkan dari yang
			paling dekat selesai. Daftar pekerjaan konkret seperti ini jauh lebih berguna daripada satu
			angka persentase kesiapan.
		</p>
	</div>

	{#if admin.esgIncomplete.length === 0}
		<Card>
			<EmptyState
				title={admin.loading ? 'Memeriksa kelengkapan bukti' : 'Seluruh bukti bertag sudah lengkap'}
				message="Setiap cerita bertag ESG telah memenuhi keempat gerbang Hal 12 dan masuk agregasi."
				iconPath={ICONS.checkCircle}
				size="sm"
			/>
		</Card>
	{:else}
		<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
			{#each admin.esgIncomplete as baris (baris.story.id)}
				{@const cerita = baris.story}
				{@const checklist = baris.checklist}
				<Card padding="sm">
					<div class="flex items-start justify-between gap-2">
						<div class="min-w-0">
							<p class="text-sm leading-snug font-semibold text-ink-900">
								{potongTeks(cerita.title, 80)}
							</p>
							<p class="mt-0.5 text-xs text-ink-500">
								{cerita.authorName} · {cerita.statusMeta.label}
							</p>
						</div>
						<StatusBadge
							label="{checklist.passedCount}/{checklist.totalCount}"
							color={checklist.passedCount === checklist.totalCount - 1 ? 'amber' : 'slate'}
							size="sm"
						/>
					</div>

					<div class="mt-2.5 flex flex-wrap gap-1.5">
						{#each cerita.pillars as pilar (pilar)}
							<span
								class="rounded-chip px-2 py-0.5 text-[11px] font-bold"
								style="background:var(--color-esg-{pilar.toLowerCase()}-tint);color:var(--color-esg-{pilar.toLowerCase()}-ink);"
							>
								Pilar {pilar}
							</span>
						{/each}
						{#each cerita.sdgGoals as goal (goal)}
							<span class="numeric rounded-chip bg-ink-100 px-2 py-0.5 text-[11px] font-semibold text-ink-600">
								SDG {goal}
							</span>
						{/each}
					</div>

					<ul class="mt-3 space-y-1.5">
						{#each checklist.checks as syarat (syarat.key)}
							<li class="flex items-start gap-2">
								<Icon
									path={syarat.passed ? ICONS.checkCircle : ICONS.xCircle}
									size={14}
									class="mt-0.5 shrink-0 {syarat.passed ? 'text-pertamina-green-ink' : 'text-ink-400'}"
								/>
								<span class="min-w-0 text-xs {syarat.passed ? 'text-ink-500' : 'text-ink-700'}">
									{syarat.label}
									{#if !syarat.passed}
										<span class="block text-ink-500">{syarat.hint}</span>
									{/if}
								</span>
							</li>
						{/each}
					</ul>
				</Card>
			{/each}
		</div>
	{/if}
</section>
