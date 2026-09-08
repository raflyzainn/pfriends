<script>
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { Card, EmptyState, PageHeader, StatusBadge } from '$lib/components';
	import { STORY_STATUS_META } from '$lib/domain/constants/community.js';
	import { adminStories } from '$lib/stores/admin-stories.svelte.js';
	import { session } from '$lib/stores/session.svelte.js';
	import { formatTanggal } from '$lib/utils/format.js';

	const id = $derived(page.params.id ?? '');
	const story = $derived(adminStories.selected?.id === id ? adminStories.selected : null);
	const when = (value) => value ? formatTanggal(value, 'waktu') : 'Belum tercatat';
	const statusLabel = (value) => value ? (STORY_STATUS_META[value]?.label ?? value) : 'Awal';

	onMount(async () => {
		if (!session.ready) await session.hydrate();
		if (session.isAdmin) await adminStories.loadDetail(id);
	});
</script>

<svelte:head><title>Audit Cerita · PFriends</title></svelte:head>

{#if adminStories.loading && !story}
	<p class="mt-6 text-sm text-ink-500">Memuat audit Cerita.</p>
{:else if !story}
	<PageHeader eyebrow="Konsol Admin" title="Audit Cerita tidak ditemukan" backHref="/admin/cerita" backLabel="Kembali ke Pemantauan Cerita" />
	<div class="mt-5"><EmptyState title="Audit tidak tersedia" message={adminStories.error || 'Cerita tidak ditemukan.'} /></div>
{:else}
	<PageHeader eyebrow="Konsol Admin · audit editorial" title={story.title} subtitle="Pemantauan metadata dan keputusan tanpa membuka isi maupun berkas privat." backHref="/admin/cerita" backLabel="Kembali ke Pemantauan Cerita" />
	<div class="mt-4"><StatusBadge label={STORY_STATUS_META[story.status]?.label ?? story.status} color={STORY_STATUS_META[story.status]?.badgeColor ?? 'slate'} withDot /></div>

	<div class="mt-6 grid gap-5 lg:grid-cols-2">
		<Card><h2 class="font-semibold text-heading">Metadata Cerita</h2><dl class="mt-4 grid gap-4 sm:grid-cols-2"><div><dt class="label-micro">Penulis</dt><dd class="mt-1 text-sm text-ink-700">{story.authorName}</dd></div><div><dt class="label-micro">Identitas Awardee</dt><dd class="mt-1 text-sm text-ink-700">{story.authorId}</dd></div><div><dt class="label-micro">Komunitas</dt><dd class="mt-1 text-sm text-ink-700">{story.community}</dd></div><div><dt class="label-micro">Chapter</dt><dd class="mt-1 text-sm text-ink-700">{story.chapterId}</dd></div><div><dt class="label-micro">Verifikator</dt><dd class="mt-1 text-sm text-ink-700">{story.reviewerName || 'Belum ditetapkan'}</dd></div><div><dt class="label-micro">Jumlah revisi</dt><dd class="mt-1 text-sm text-ink-700">{story.revisionCount}</dd></div></dl></Card>
		<Card><h2 class="font-semibold text-heading">Waktu proses</h2><dl class="mt-4 grid gap-4 sm:grid-cols-2"><div><dt class="label-micro">Dibuat</dt><dd class="mt-1 text-sm text-ink-700">{when(story.createdAt)}</dd></div><div><dt class="label-micro">Draf tersimpan</dt><dd class="mt-1 text-sm text-ink-700">{when(story.draftSavedAt)}</dd></div><div><dt class="label-micro">Diajukan</dt><dd class="mt-1 text-sm text-ink-700">{when(story.submittedAt)}</dd></div><div><dt class="label-micro">Ditinjau</dt><dd class="mt-1 text-sm text-ink-700">{when(story.reviewedAt)}</dd></div><div><dt class="label-micro">Diterbitkan</dt><dd class="mt-1 text-sm text-ink-700">{when(story.publishedAt)}</dd></div><div><dt class="label-micro">Diarsipkan</dt><dd class="mt-1 text-sm text-ink-700">{when(story.archivedAt)}</dd></div></dl></Card>
	</div>

	<Card class="mt-5"><h2 class="font-semibold text-heading">Riwayat status</h2>{#if adminStories.events.length === 0}<p class="mt-3 text-sm text-ink-600">Belum ada perubahan status tercatat.</p>{:else}<ol class="mt-4 space-y-4">{#each adminStories.events as event (event.id)}<li class="border-l-2 border-ink-200 pl-4"><p class="text-sm font-semibold text-heading">{statusLabel(event.fromStatus)} menuju {statusLabel(event.toStatus)}</p><p class="mt-1 text-xs text-ink-500">{event.actorName || 'Sistem'} · {when(event.occurredAt)}</p>{#if event.note}<p class="mt-2 text-sm text-ink-700">{event.note}</p>{/if}</li>{/each}</ol>{/if}</Card>

	<Card class="mt-5"><h2 class="font-semibold text-heading">Keputusan Verifikator</h2>{#if adminStories.reviews.length === 0}<p class="mt-3 text-sm text-ink-600">Belum ada keputusan tercatat.</p>{:else}<div class="mt-4 space-y-3">{#each adminStories.reviews as review (review.id)}<div class="rounded-lg bg-ink-50 p-3"><p class="text-sm font-semibold text-heading">{review.decision}</p><p class="mt-1 text-xs text-ink-500">{review.reviewerName || 'Verifikator'} · {when(review.decidedAt)}</p>{#if review.note}<p class="mt-2 text-sm text-ink-700">{review.note}</p>{/if}</div>{/each}</div>{/if}</Card>
{/if}
