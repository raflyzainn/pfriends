<script>
	/**
	 * HALAMAN — Pengawasan Moderasi & Consent (READ-ONLY bagi Admin).
	 *
	 * Tanggung jawab: memperlihatkan keadaan antrean editorial kepada Admin, dan
	 * menyediakan satu-satunya tindakan konten yang memang menjadi kewenangannya —
	 * takedown cerita yang sudah tayang.
	 *
	 * ── Mengapa halaman ini kehilangan tombol setujui dan minta revisi ────────
	 *
	 * Matriks kewenangan memberi ADMIN tanda silang pada `REVIEW_CONTENT` dan
	 * `PUBLISH_CONTENT`. Sampai gelombang sebelumnya, halaman ini tetap menyetujui
	 * naskah lewat store yang menulis status langsung ke repository — jalur yang
	 * tidak memeriksa legalitas transisi, tidak memeriksa konflik kepentingan, dan
	 * tidak pernah menyentuh `ContentReviewService`.
	 *
	 * Yang berbahaya dari jalur itu bukan tombolnya, melainkan bahwa ia
	 * BERFUNGSI: seorang Admin dapat menerbitkan naskah tanpa satu pun verifikator
	 * membacanya, dan tidak ada satu galat pun yang menandainya. Karena itu
	 * kewenangannya dicabut di store, bukan sekadar tombolnya disembunyikan di
	 * antarmuka.
	 *
	 * Yang tersisa di sini: agregat antrean, daftar naskah yang menunggu, dan
	 * tautan ke ruang kerja verifikator. Admin melihat beban antrean, bukan
	 * memutuskan isinya.
	 *
	 * **Takedown TETAP ADA.** `TERPUBLIKASI → DIARSIPKAN` memang milik Admin pada
	 * peta transisi — itulah jalur banding dan penarikan darurat ketika consent
	 * dicabut atau ditemukan data pribadi yang lolos. Ia berjalan lewat
	 * `ContentReviewService.archiveStory` dan menuntut alasan arsip yang sah.
	 *
	 * @see docs/12-BUILD-CONTRACT-V2.md — §2.1 matriks kewenangan, §3.5 WP-07 butir 8, R-23
	 * @see docs/00-SOURCE-BRIEF.md — Hal 10 Governance, Hal 12 gerbang publikasi
	 */
	import {
		Button,
		Card,
		EmptyState,
		Icon,
		PageHeader,
		StatTile,
		StatusBadge,
		ICONS
	} from '$lib/components';
	import { STORY_ARCHIVE_REASON, STORY_STATUS } from '$lib/domain/constants/community.js';
	import { SLA_HARI_KERJA } from '$lib/domain/constants/content-workflow.js';
	import { ContentReviewService } from '$lib/domain/services/ContentReviewService.js';
	import { admin } from '$lib/stores/admin.svelte.js';
	import { catalog } from '$lib/stores/catalog.svelte.js';
	import { formatAngka, formatTanggal } from '$lib/utils/format.js';

	/**
	 * Label Bahasa Indonesia untuk alasan arsip. Kunci mengikuti
	 * `STORY_ARCHIVE_REASON`; kunci tanpa label jatuh ke kuncinya sendiri, bukan
	 * ke string kosong — pemilih beropsi kosong tidak dapat dipertanggungjawabkan.
	 * @type {Readonly<Record<string, string>>}
	 */
	const LABEL_ALASAN = Object.freeze({
		[STORY_ARCHIVE_REASON.DITOLAK]: 'Ditolak setelah ditinjau ulang',
		[STORY_ARCHIVE_REASON.KEDALUWARSA]: 'Kedaluwarsa — tidak lagi relevan',
		[STORY_ARCHIVE_REASON.CONSENT_DICABUT]: 'Consent penulis dicabut',
		[STORY_ARCHIVE_REASON.PERMINTAAN_ANGGOTA]: 'Atas permintaan anggota',
		[STORY_ARCHIVE_REASON.IDLE_TIMEOUT]: 'Tidak ada tindak lanjut sampai batas waktu'
	});

	/** Waktu acuan perhitungan usia antrean, dibekukan sekali per pemuatan halaman. */
	const acuanSla = new Date();

	/** @type {string} Id cerita yang sedang disiapkan untuk ditarik. */
	let idTakedown = $state('');

	/** @type {string} Alasan arsip terpilih. */
	let alasanTakedown = $state(STORY_ARCHIVE_REASON.CONSENT_DICABUT);

	const antrean = $derived(admin.moderationQueue);

	const menungguRevisi = $derived(
		catalog.stories.filter((cerita) => cerita.status === STORY_STATUS.PERLU_REVISI)
	);

	const siapTerbit = $derived(
		catalog.stories.filter((cerita) => cerita.status === STORY_STATUS.DISETUJUI)
	);

	const tanpaConsentAntrean = $derived(antrean.filter((cerita) => !cerita.hasActiveConsent).length);

	/** Naskah antrean yang sudah melewati batas SLA-nya. */
	const lewatSla = $derived(
		antrean.filter((cerita) => ContentReviewService.slaOf(cerita, acuanSla).overdue)
	);

	const terpilihTakedown = $derived(
		admin.publishedStories.find((cerita) => cerita.id === idTakedown) ?? null
	);

	const daftarAlasan = $derived(
		Object.values(STORY_ARCHIVE_REASON).map((kode) => ({
			kode,
			label: LABEL_ALASAN[kode] ?? kode
		}))
	);

	/**
	 * Menarik cerita terpilih dari ruang publik.
	 * @returns {Promise<void>}
	 */
	async function tarikDariPublik() {
		if (!terpilihTakedown) return;
		const hasil = await admin.takedown(terpilihTakedown, alasanTakedown);
		if (hasil.ok) idTakedown = '';
	}
</script>

<PageHeader
	eyebrow="Pengawasan Moderasi & Consent"
	title="Beban antrean editorial"
	subtitle="Keputusan atas naskah — menyetujui, meminta revisi, menerbitkan — adalah kewenangan Verifikator, bukan Admin. Halaman ini memperlihatkan beban antreannya supaya pengelola program tahu di mana alur tersendat, tanpa ikut memutuskan isinya."
>
	{#snippet actions()}
		<Button variant="primary" size="sm" iconPath={ICONS.checkCircle} href="/verifikator">
			Buka ruang kerja verifikator
		</Button>
	{/snippet}
</PageHeader>

<!-- ── Agregat antrean ─────────────────────────────────────────────────── -->
<div class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
	<StatTile
		label="Menunggu telaah"
		value={antrean.length}
		unit="cerita"
		hint="Berstatus diajukan atau sedang ditinjau verifikator"
		iconPath={ICONS.inbox}
		color="var(--color-pertamina-red)"
	/>
	<StatTile
		label="Dikembalikan ke penulis"
		value={menungguRevisi.length}
		unit="cerita"
		hint="Menunggu perbaikan sesuai catatan peninjau"
		iconPath={ICONS.edit}
		color="var(--color-tier-champion)"
	/>
	<StatTile
		label="Disetujui, menunggu terbit"
		value={siapTerbit.length}
		unit="cerita"
		hint="Consent diperiksa ulang tepat sebelum penerbitan"
		iconPath={ICONS.checkCircle}
		color="var(--color-pertamina-green)"
	/>
	<StatTile
		label="Sudah lewat SLA"
		value={lewatSla.length}
		unit="cerita"
		hint="Melewati batas hari kerja pada tahapnya saat ini"
		iconPath={ICONS.clock}
		color="var(--color-pertamina-navy)"
	/>
</div>

<!-- ── Batas kewenangan ────────────────────────────────────────────────── -->
<Card class="mb-6" accent="var(--color-pertamina-navy)">
	<div class="flex items-start gap-3">
		<Icon path={ICONS.shield} size={20} class="mt-0.5 shrink-0 text-pertamina-navy" />
		<div class="min-w-0">
			<h2 class="text-base font-bold text-heading">Batas kewenangan halaman ini</h2>
			<p class="mt-1 text-sm leading-relaxed text-ink-600">
				Admin tidak menyetujui, tidak meminta revisi, dan tidak menerbitkan naskah. Ketiganya milik
				Verifikator, dan pemisahan itu ditegakkan di lapisan domain — bukan sekadar dengan
				menyembunyikan tombol. Satu-satunya tindakan konten Admin adalah menarik cerita yang sudah
				tayang, dan tindakan itu pun menuntut alasan arsip yang tercatat.
			</p>
			<p class="mt-2 text-sm text-ink-600">
				Ada naskah yang perlu diputuskan?
				<a class="font-semibold text-pertamina-red-ink underline" href="/verifikator/cerita">
					Buka antrean tinjauan verifikator
				</a>.
			</p>
		</div>
	</div>
</Card>

<div class="grid grid-cols-1 gap-4 xl:grid-cols-12">
	<!-- ── Antrean yang sedang menunggu ────────────────────────────────── -->
	<section aria-labelledby="judul-antrean" class="xl:col-span-7">
		<h2 id="judul-antrean" class="mb-2 text-base font-bold text-heading">
			Naskah yang sedang menunggu keputusan ({antrean.length})
		</h2>

		{#if antrean.length === 0}
			<Card>
				<EmptyState
					title={admin.loading ? 'Memuat antrean' : 'Antrean tinjauan kosong'}
					message={admin.loading
						? 'Membaca naskah yang menunggu keputusan verifikator.'
						: 'Tidak ada naskah yang menunggu keputusan. Cerita baru masuk ke antrean begitu awardee menekan kirim di Ruang Cerita.'}
					iconPath={ICONS.checkCircle}
					actionLabel="Lihat cerita terpublikasi"
					actionHref="/cerita"
				/>
			</Card>
		{:else}
			<ul class="space-y-2">
				{#each antrean as cerita (cerita.id)}
					{@const sla = ContentReviewService.slaOf(cerita, acuanSla)}
					<li class="rounded-card border border-ink-100 bg-surface p-3">
						<div class="flex items-start justify-between gap-2">
							<p class="min-w-0 flex-1 text-sm leading-snug font-semibold text-ink-900">
								{cerita.title}
							</p>
							<StatusBadge
								label={cerita.statusMeta.label}
								color={cerita.statusMeta.badgeColor}
								size="sm"
							/>
						</div>

						<p class="mt-1 text-xs text-ink-600">
							{cerita.authorName} · {cerita.chapterId || 'Lintas chapter'}
						</p>

						<div class="mt-2 flex flex-wrap items-center gap-1.5">
							{#if !cerita.hasActiveConsent}
								<StatusBadge
									label="Consent tidak aktif"
									color="red"
									size="sm"
									iconPath={ICONS.lock}
								/>
							{/if}
							{#if sla.limit > 0}
								<StatusBadge
									label="{sla.days} dari {sla.limit} hari kerja"
									color={sla.overdue ? 'red' : 'green'}
									size="sm"
									iconPath={ICONS.clock}
								/>
							{/if}
							{#if cerita.submittedAt}
								<span class="text-xs text-ink-600">
									Diajukan {formatTanggal(cerita.submittedAt, 'ringkas')}
								</span>
							{/if}
						</div>
					</li>
				{/each}
			</ul>

			<p class="mt-3 text-xs leading-relaxed text-ink-600">
				Batas SLA per tahap: naskah diajukan {SLA_HARI_KERJA.STORY_DIAJUKAN} hari kerja, sedang
				ditinjau {SLA_HARI_KERJA.STORY_REVIEW} hari kerja, menunggu terbit
				{SLA_HARI_KERJA.STORY_DISETUJUI} hari kerja. Hari kerja, bukan hari kalender: naskah yang
				diajukan Jumat sore belum terlambat pada Senin pagi.
			</p>
		{/if}
	</section>

	<!-- ── Takedown cerita terpublikasi ────────────────────────────────── -->
	<section aria-labelledby="judul-takedown" class="xl:col-span-5">
		<h2 id="judul-takedown" class="mb-2 text-base font-bold text-heading">
			Tarik cerita dari ruang publik
		</h2>

		<Card accent="var(--color-pertamina-red)">
			<p class="text-sm leading-relaxed text-ink-600">
				Cerita adalah satu-satunya entitas yang membawa risiko reputasi langsung: naskah yang tayang
				tanpa consent tidak dapat ditarik kembali dari internet. Penarikan tidak menghapus apa pun —
				naskah berpindah ke arsip beserta alasannya, dan jejak persetujuannya tetap utuh.
			</p>

			{#if admin.publishedStories.length === 0}
				<div class="mt-3">
					<EmptyState
						title={admin.loading ? 'Memuat cerita terpublikasi' : 'Belum ada cerita tayang'}
						message="Penarikan hanya berlaku bagi cerita yang sudah terbit di ruang publik."
						iconPath={ICONS.book}
						size="sm"
					/>
				</div>
			{:else}
				<label class="mt-4 block">
					<span class="label-micro">Cerita terpublikasi</span>
					<select
						bind:value={idTakedown}
						class="mt-1 w-full rounded-control border border-ink-200 bg-surface px-3 py-2.5 text-sm text-ink-900 focus:border-pertamina-red focus:outline-none"
					>
						<option value="">Pilih cerita yang akan ditarik…</option>
						{#each admin.publishedStories as cerita (cerita.id)}
							<option value={cerita.id}>{cerita.title}</option>
						{/each}
					</select>
				</label>

				<label class="mt-3 block">
					<span class="label-micro">Alasan arsip</span>
					<select
						bind:value={alasanTakedown}
						class="mt-1 w-full rounded-control border border-ink-200 bg-surface px-3 py-2.5 text-sm text-ink-900 focus:border-pertamina-red focus:outline-none"
					>
						{#each daftarAlasan as alasan (alasan.kode)}
							<option value={alasan.kode}>{alasan.label}</option>
						{/each}
					</select>
				</label>

				{#if terpilihTakedown}
					<div class="mt-3 rounded-card border border-ink-100 bg-ink-50 p-3">
						<p class="text-sm font-semibold text-ink-900">{terpilihTakedown.title}</p>
						<p class="mt-1 text-xs text-ink-600">
							{terpilihTakedown.authorName} · terbit
							{terpilihTakedown.publishedAt
								? formatTanggal(terpilihTakedown.publishedAt, 'pendek')
								: 'tanggal tidak tercatat'}
							· {formatAngka(terpilihTakedown.views)} kali dibaca
						</p>
					</div>
				{/if}

				<div class="mt-4">
					<Button
						variant="primary"
						iconPath={ICONS.xCircle}
						disabled={!terpilihTakedown}
						loading={admin.working === terpilihTakedown?.id}
						onclick={tarikDariPublik}
					>
						Tarik dari ruang publik
					</Button>
				</div>

				<p class="mt-3 text-xs leading-relaxed text-ink-600">
					Penarikan bersifat terminal: naskah yang diarsipkan tidak dapat dihidupkan kembali dengan
					id yang sama. Naskah yang hidup kembali adalah naskah baru.
				</p>
			{/if}
		</Card>

		<Card class="mt-4">
			<h3 class="text-base font-bold text-heading">Antrean tanpa consent aktif</h3>
			<p class="mt-1 text-sm leading-relaxed text-ink-600">
				<span class="numeric font-bold text-ink-900">{tanpaConsentAntrean}</span>
				naskah pada antrean belum memiliki consent aktif dan karena itu tidak dapat disetujui siapa
				pun — termasuk oleh Verifikator. Consent dapat dicabut anggota kapan saja tanpa memberi
				alasan, dan pencabutan itu tidak pernah mengurangi poin maupun tier miliknya. Yang gugur
				hanyalah izin publikasi.
			</p>
		</Card>
	</section>
</div>
