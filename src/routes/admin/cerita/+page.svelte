<script>
	import { onMount } from 'svelte';
	import { Button, Card, EmptyState, FilterChips, PageHeader, StatusBadge } from '$lib/components';
	import { STORY_STATUS_META } from '$lib/domain/constants/community.js';
	import { adminStories } from '$lib/stores/admin-stories.svelte.js';
	import { session } from '$lib/stores/session.svelte.js';
	import { formatTanggal } from '$lib/utils/format.js';

	let status = $state('');
	let query = $state('');
	const statusFilters = $derived(Object.entries(adminStories.statusCounts).map(([id, count]) => ({ id, label: STORY_STATUS_META[id]?.label ?? id, count })));

	async function load(page = 1) { await adminStories.load({ page, status, query }); }
	async function applyFilters() { await load(1); }
	async function changeStatus(value) { status = value; await load(1); }

	onMount(async () => {
		if (!session.ready) await session.hydrate();
		if (session.isAdmin) await load();
	});
</script>

<svelte:head><title>Pemantauan Cerita · PFriends</title></svelte:head>

<PageHeader eyebrow="Konsol Admin" title="Pemantauan Cerita" subtitle="Pantau perjalanan setiap Cerita dari draf sampai publikasi melalui metadata dan jejak audit." />

<form class="mt-5 flex max-w-2xl gap-2" onsubmit={(event) => { event.preventDefault(); applyFilters(); }}>
	<label class="min-w-0 flex-1 text-sm font-semibold text-ink-700">Cari Cerita
		<input class="mt-2 w-full rounded-control border border-ink-200 bg-white px-3 py-2.5 font-normal" bind:value={query} placeholder="Cari judul, penulis, atau identitas Awardee" />
	</label>
	<div class="self-end"><Button type="submit">Cari</Button></div>
</form>

{#if statusFilters.length > 0}<div class="mt-5"><FilterChips options={statusFilters} bind:selected={status} onchange={changeStatus} label="Filter status Cerita" /></div>{/if}

<p class="mt-4 text-sm text-ink-500">{adminStories.page.totalItems} Cerita ditemukan.</p>

{#if adminStories.error}
	<div class="mt-5 rounded-card border border-red-200 bg-red-50 p-4 text-sm text-red-800">{adminStories.error}</div>
{:else if adminStories.loading && adminStories.items.length === 0}
	<p class="mt-6 text-sm text-ink-500">Memuat pemantauan Cerita.</p>
{:else if adminStories.items.length === 0}
	<div class="mt-6"><EmptyState title="Cerita tidak ditemukan" message="Tidak ada Cerita yang sesuai dengan pencarian atau filter ini." /></div>
{:else}
	<div class="mt-6 grid gap-3">
		{#each adminStories.items as story (story.id)}
			<Card>
				<div class="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
					<div class="min-w-0">
						<div class="flex flex-wrap items-center gap-2"><StatusBadge label={STORY_STATUS_META[story.status]?.label ?? story.status} color={STORY_STATUS_META[story.status]?.badgeColor ?? 'slate'} withDot /><span class="text-xs text-ink-500">Diperbarui {formatTanggal(story.draftSavedAt || story.submittedAt || story.createdAt, 'waktu')}</span></div>
						<h2 class="mt-2 font-semibold text-heading">{story.title}</h2>
						<p class="mt-1 text-sm text-ink-600">{story.authorName} · {story.community} · Chapter {story.chapterId}</p>
						<p class="mt-2 text-xs text-ink-500">Verifikator: {story.reviewerName || 'Belum ditetapkan'} · {story.revisionCount} revisi</p>
					</div>
					<Button href={`/admin/cerita/${story.id}`} variant="outline">Lihat audit</Button>
				</div>
			</Card>
		{/each}
	</div>

	{#if adminStories.page.totalPages > 1}<div class="mt-5 flex items-center justify-between"><Button variant="secondary" disabled={adminStories.page.page <= 1} onclick={() => load(adminStories.page.page - 1)}>Sebelumnya</Button><span class="text-sm text-ink-500">Halaman {adminStories.page.page} dari {adminStories.page.totalPages}</span><Button variant="secondary" disabled={adminStories.page.page >= adminStories.page.totalPages} onclick={() => load(adminStories.page.page + 1)}>Berikutnya</Button></div>{/if}
{/if}
