<script>
	import { PageHeader, Card, StatusBadge, EmptyState, FilterChips, Button } from '$lib/components';
	import { aturanSkor } from '$lib/domain/constants/scoring-table.js';
	import { activitySubmissions, SUBMISSION_STATUS_META } from '$lib/stores/activity-submissions.svelte.js';
	let status = $state('SUBMITTED');
	const filters = $derived([{ id: 'SUBMITTED', label: 'Menunggu', count: activitySubmissions.items.filter((x) => x.status === 'SUBMITTED').length }, { id: 'NEEDS_REVISION', label: 'Perlu revisi', count: activitySubmissions.items.filter((x) => x.status === 'NEEDS_REVISION').length }, { id: 'APPROVED', label: 'Disetujui', count: activitySubmissions.items.filter((x) => x.status === 'APPROVED').length }, { id: '', label: 'Semua', count: activitySubmissions.items.length }]);
	const shown = $derived(status ? activitySubmissions.items.filter((item) => item.status === status) : activitySubmissions.items);
</script>
<svelte:head><title>Verifikasi Bukti Keaktifan · PFfriends</title></svelte:head>
<PageHeader eyebrow="Antrean verifikasi" title="Bukti Keaktifan" description="Tinjau dokumentasi Awardee sebelum poin kontribusi dibukukan." />
<FilterChips items={filters} value={status} onchange={(value) => status = value} />
{#if shown.length === 0}<div class="mt-6"><EmptyState title="Antrean kosong" message="Tidak ada pengajuan pada status ini." /></div>{:else}
	<div class="mt-6 grid gap-3">{#each shown as item}<Card>
		<div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><div class="flex flex-wrap items-center gap-2"><StatusBadge label={SUBMISSION_STATUS_META[item.status]?.label} color={SUBMISSION_STATUS_META[item.status]?.color} withDot /><span class="text-xs text-ink-500">{String(item.submittedAt).slice(0,10)}</span></div><h2 class="mt-2 font-semibold text-heading">{item.title}</h2><p class="mt-1 text-sm text-ink-600">{item.expand?.owner?.displayName ?? item.awardeeId} · {aturanSkor(item.activityType).label} · {aturanSkor(item.activityType).points} poin</p></div><Button href={`/verifikator/bukti-keaktifan/${item.id}`} variant="outline">Lihat detail</Button></div>
	</Card>{/each}</div>
{/if}
