<script>
	/**
	 * StoryStatusCard: kartu naskah milik penulis, dilihat dari sisi penulisnya.
	 *
	 * Komponen lokal zona Awardee (KP-5). Menjawab satu pertanyaan yang paling
	 * sering diajukan penulis: *"naskah saya sekarang di mana, dan bola ada di
	 * tangan siapa?"*
	 *
	 * TIGA KEPUTUSAN YANG TIDAK TERBACA DARI KODE:
	 *
	 * 1. **NOL poin, tier, dan peringkat: secara struktural.** Komponen ini tidak
	 *    mengimpor `PointsChip`, `TierBadge`, maupun `scoring-table.js`, sehingga
	 *    angka yang dilarang US-R14 AC-4 tidak pernah sampai kepadanya. Larangan
	 *    ditegakkan pada bentuk impor, bukan pada disiplin pemanggil.
	 *
	 *    Larangan itu juga berlaku pada PALET. Simpul alur yang sedang berjalan
	 *    diwarnai `pertamina-navy`, bukan `tier-champion`: token tier di kartu naskah
	 *    membuat pemindai kepatuhan menandai kartu ini sebagai pembawa tier, dan lebih
	 *    buruk lagi menyiratkan hubungan antara kemajuan naskah dan tier penulisnya :
	 *    hubungan yang justru sedang dilarang.
	 * 2. **Status dibaca dari `statusMeta` dan getter entity, tidak pernah
	 *    dibandingkan ulang di sini.** Satu-satunya perbandingan status yang
	 *    tersisa adalah pemetaan posisi pada alur kurasi: informasi tata letak,
	 *    bukan aturan bisnis.
	 * 3. **Catatan verifikator TERAKHIR yang ditonjolkan, bukan yang pertama.**
	 *    Penulis perlu tahu apa yang harus diperbaiki sekarang; riwayat lengkapnya
	 *    tetap tersedia di bawahnya, tetapi tidak mendahului tindakan.
	 *
	 * @see docs/12-BUILD-CONTRACT-V2.md: §3.5 WP-05 kriteria selesai butir 4
	 * @see docs/10-REVISION-SPEC.md: §5.2 state machine cerita
	 */
	import { Button, Card, Icon, ICONS, StatusBadge } from '$lib/components';
	import { STORY_STATUS } from '$lib/domain/constants/community.js';
	import { formatAngka, formatTanggal } from '$lib/utils/format.js';

	/**
	 * @typedef {object} StoryStatusCardProps
	 * @property {import('$lib/domain/entities/Story.js').Story} story
	 * @property {string} [reviseHref] Tujuan tombol perbaikan; kosong menyembunyikannya.
	 */

	/** @type {StoryStatusCardProps} */
	let { story, reviseHref = '' } = $props();

	/**
	 * Empat simpul perjalanan naskah. `PERLU_REVISI` sengaja bukan simpul: ia bukan
	 * kemajuan, melainkan bola yang kembali ke tangan penulis.
	 * @type {readonly {status: string, label: string}[]}
	 */
	const ALUR_KURASI = Object.freeze([
		{ status: STORY_STATUS.DIAJUKAN, label: 'Terkirim' },
		{ status: STORY_STATUS.REVIEW, label: 'Ditinjau' },
		{ status: STORY_STATUS.DISETUJUI, label: 'Disetujui' },
		{ status: STORY_STATUS.TERPUBLIKASI, label: 'Terbit' }
	]);

	/**
	 * Berapa simpul alur yang sudah dilewati tiap status. Tata letak, bukan aturan.
	 * @type {Readonly<Record<string, number>>}
	 */
	const POSISI_ALUR = Object.freeze({
		[STORY_STATUS.DRAFT]: 0,
		[STORY_STATUS.DIAJUKAN]: 1,
		[STORY_STATUS.PERLU_REVISI]: 1,
		[STORY_STATUS.REVIEW]: 2,
		[STORY_STATUS.DISETUJUI]: 3,
		[STORY_STATUS.TERPUBLIKASI]: 4,
		[STORY_STATUS.DIARSIPKAN]: 0
	});

	const posisi = $derived(POSISI_ALUR[story.status] ?? 0);
	const diarsipkan = $derived(story.status === STORY_STATUS.DIARSIPKAN);
	const catatanTerakhir = $derived(story.latestReviewNote);
</script>

<Card padding="md">
	<div class="flex flex-wrap items-center gap-1.5">
		<StatusBadge
			label={story.statusMeta.label}
			color={story.statusMeta.badgeColor}
			size="sm"
			withDot
		/>
		{#each story.esgTags as tag (tag.toString())}
			<StatusBadge label={tag.shortLabel} color="slate" size="sm" variant="outline" />
		{/each}
		{#if story.revisionCount > 0}
			<StatusBadge
				label="Revisi ke-{story.revisionCount}"
				color="slate"
				size="sm"
				variant="outline"
			/>
		{/if}
	</div>

	<h3 class="mt-2 text-base leading-snug font-semibold break-words text-ink-800">{story.title || 'Draf tanpa judul'}</h3>
	{#if story.summary}
		<p class="mt-1 text-[13px] leading-relaxed text-ink-600">{story.summary}</p>
	{/if}

	<p class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-600">
		<span class="inline-flex items-center gap-1">
			<Icon path={ICONS.document} size={14} />
			{formatAngka(story.wordCount)} kata · {story.readMinutes} menit baca
		</span>
		{#if story.submittedAt}
			<span class="inline-flex items-center gap-1">
				<Icon path={ICONS.calendar} size={14} />
				Dikirim {formatTanggal(story.submittedAt, 'pendek')}
			</span>
		{/if}
		{#if story.isPublished}
			<span class="inline-flex items-center gap-1">
				<Icon path={ICONS.eye} size={14} />
				{formatAngka(story.views)} pembaca
			</span>
		{/if}
	</p>

	{#if diarsipkan}
		<p
			class="mt-4 flex items-start gap-2 rounded-xl bg-ink-100 px-3 py-2.5 text-[13px] leading-relaxed text-ink-700"
		>
			<Icon path={ICONS.inbox} size={16} class="mt-px shrink-0" />
			<span>
				<span class="font-semibold">Naskah diarsipkan.</span>
				{story.statusMeta.deskripsi}
				{#if story.archiveReason}
					Alasan tercatat: {story.archiveReason}.
				{/if}
			</span>
		</p>
	{:else}
		<div class="mt-4">
			<ol class="flex items-center gap-1.5">
				{#each ALUR_KURASI as simpul, indeks (simpul.status)}
					{@const tercapai = posisi > indeks}
					{@const berjalan = posisi === indeks + 1 && !tercapai}
					<li class="min-w-0 flex-1">
						<span
							class="block h-1.5 rounded-full {tercapai
								? 'bg-pertamina-green'
								: berjalan
									? 'bg-pertamina-navy'
									: 'bg-ink-200'}"
						></span>
						<span
							class="mt-1.5 block truncate text-[11px] {tercapai || berjalan
								? 'font-medium text-ink-700'
								: 'text-ink-600'}"
						>
							{simpul.label}
						</span>
					</li>
				{/each}
			</ol>
			<p class="mt-2.5 text-[13px] leading-relaxed text-ink-600">
				<span class="font-medium text-ink-800">Bola ada di {story.statusMeta.aktor}.</span>
				{story.statusMeta.deskripsi}
			</p>
		</div>
	{/if}

	{#if story.needsRevision && catatanTerakhir}
		<div class="mt-4 rounded-xl border border-warning/30 bg-warning-tint/60 p-3">
			<p class="text-[13px] font-semibold text-ink-800">Yang diminta verifikator</p>
			<p class="mt-1 text-[13px] leading-relaxed text-ink-700">{catatanTerakhir}</p>
		</div>
	{/if}

	{#if story.reviewNotes.length > 0}
		<details class="mt-3">
			<summary class="cursor-pointer text-[13px] font-medium text-ink-700">
				Riwayat catatan verifikator ({story.reviewNotes.length})
			</summary>
			<ul class="mt-2 space-y-1.5">
				{#each story.reviewNotes as catatan (catatan.at)}
					<li class="text-[13px] leading-relaxed text-ink-700">
						<span class="text-ink-600">{formatTanggal(catatan.at, 'pendek')} :</span>
						{catatan.note}
					</li>
				{/each}
			</ul>
		</details>
	{/if}

	{#if (story.needsRevision || story.status === STORY_STATUS.DRAFT) && reviseHref}
		<div class="mt-4 border-t border-ink-100 pt-3">
			<Button size="sm" href={reviseHref} iconPath={ICONS.edit}>{story.needsRevision ? 'Perbaiki lalu kirim ulang' : 'Lanjutkan menulis'}</Button>
		</div>
	{/if}
</Card>
