<script>
	import { PageHeader, Card, StatusBadge, EmptyState, FilterChips, Button } from '$lib/components';
	import { aturanSkor } from '$lib/domain/constants/scoring-table.js';
	import { activitySubmissions, SUBMISSION_STATUS_META } from '$lib/stores/activity-submissions.svelte.js';
	let tab = $state('queue');
	let status = $state('');
	let decision = $state('');
	let historyStarted = false;
	const statusFilters = $derived([
		{ id: 'SUBMITTED', label: 'Sudah dikirim', count: activitySubmissions.items.filter((x) => x.status === 'SUBMITTED').length },
		{ id: 'IN_REVIEW', label: 'Sedang diperiksa', count: activitySubmissions.items.filter((x) => x.status === 'IN_REVIEW').length },
		{ id: 'NEEDS_REVISION', label: 'Menunggu Awardee', count: activitySubmissions.items.filter((x) => x.status === 'NEEDS_REVISION').length },
		{ id: 'APPROVED', label: 'Disetujui', count: activitySubmissions.items.filter((x) => x.status === 'APPROVED').length }
	]);
	const decisionFilters = [{ id: 'APPROVE', label: 'Disetujui' }, { id: 'REQUEST_REVISION', label: 'Diminta revisi' }];
	const shown = $derived(status ? activitySubmissions.items.filter((item) => item.status === status) : activitySubmissions.items);
	const dateTime = (value) => String(value || '').slice(0, 16).replace('T', ' ');
	async function openHistory() { tab = 'history'; if (!historyStarted) { historyStarted = true; await activitySubmissions.loadReviewHistory().catch(() => {}); } }
	async function filterDecision(value) { decision = value; await activitySubmissions.loadReviewHistory({ decision }).catch(() => {}); }
	async function historyPage(page) { await activitySubmissions.loadReviewHistory({ page, decision }).catch(() => {}); }
</script>

<svelte:head><title>Verifikasi Bukti Keaktifan · PFfriends</title></svelte:head>
<PageHeader eyebrow="Ruang verifikasi" title="Bukti Keaktifan" description="Tangani antrean pemeriksaan dan telusuri seluruh keputusan yang pernah dibuat." />
<div class="mb-5 flex gap-2 border-b border-ink-200"><button type="button" class={`px-4 py-3 text-sm font-semibold ${tab === 'queue' ? 'border-b-2 border-pertamina-red text-heading' : 'text-ink-500'}`} onclick={() => tab = 'queue'}>Antrean</button><button type="button" class={`px-4 py-3 text-sm font-semibold ${tab === 'history' ? 'border-b-2 border-pertamina-red text-heading' : 'text-ink-500'}`} onclick={openHistory}>Riwayat keputusan</button></div>

{#if tab === 'queue'}
	<FilterChips options={statusFilters} bind:selected={status} label="Filter status pengajuan" />
	{#if shown.length === 0}<div class="mt-6"><EmptyState title="Antrean kosong" message="Tidak ada pengajuan pada status ini." /></div>{:else}<div class="mt-6 grid gap-3">{#each shown as item}<Card><div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><div class="flex flex-wrap items-center gap-2"><StatusBadge label={SUBMISSION_STATUS_META[item.status]?.label} color={SUBMISSION_STATUS_META[item.status]?.color} withDot /><span class="text-xs text-ink-500">{dateTime(item.submittedAt)}</span></div><h2 class="mt-2 font-semibold text-heading">{item.title}</h2><p class="mt-1 text-sm text-ink-600">{item.expand?.owner?.displayName ?? item.awardeeId} · {aturanSkor(item.activityType).label} · {aturanSkor(item.activityType).points} poin</p></div><Button href={`/verifikator/bukti-keaktifan/${item.id}`} variant="outline">Lihat detail</Button></div></Card>{/each}</div>{/if}
{:else}
	<FilterChips options={decisionFilters} bind:selected={decision} onchange={filterDecision} label="Filter keputusan" />
	<p class="mt-3 text-sm text-ink-500">{activitySubmissions.reviewHistoryPage.totalItems} keputusan tercatat.</p>
	{#if activitySubmissions.reviewHistory.length === 0 && !activitySubmissions.loading}<div class="mt-6"><EmptyState title="Belum ada keputusan" message="Keputusan approve dan permintaan revisi akan muncul di sini." /></div>{:else}<div class="mt-5 grid gap-3">{#each activitySubmissions.reviewHistory as review}{@const submission = review.expand?.submission}<Card><div class="flex flex-col justify-between gap-4 lg:flex-row lg:items-start"><div><div class="flex flex-wrap items-center gap-2"><StatusBadge label={review.decision === 'APPROVE' ? 'Disetujui' : 'Diminta revisi'} color={review.decision === 'APPROVE' ? 'green' : 'red'} withDot /><span class="text-xs text-ink-500">{dateTime(review.decidedAt)}</span></div><h2 class="mt-2 font-semibold text-heading">{submission?.title ?? 'Pengajuan'}</h2><p class="mt-1 text-sm text-ink-600">{submission?.expand?.owner?.displayName ?? submission?.awardeeId} · {review.expand?.reviewer?.displayName ?? 'Verifikator'}</p>{#if review.note}<p class="mt-3 rounded-lg bg-ink-50 p-3 text-sm text-ink-700">{review.note}</p>{/if}</div>{#if submission}<div class="flex items-center gap-2"><StatusBadge label={SUBMISSION_STATUS_META[submission.status]?.label} color={SUBMISSION_STATUS_META[submission.status]?.color} /><Button href={`/verifikator/bukti-keaktifan/${submission.id}`} size="sm" variant="secondary">Detail</Button></div>{/if}</div></Card>{/each}</div>{/if}
	{#if activitySubmissions.reviewHistoryPage.totalPages > 1}<div class="mt-5 flex items-center justify-between"><Button variant="secondary" disabled={activitySubmissions.reviewHistoryPage.page <= 1} onclick={() => historyPage(activitySubmissions.reviewHistoryPage.page - 1)}>Sebelumnya</Button><span class="text-sm text-ink-500">Halaman {activitySubmissions.reviewHistoryPage.page} dari {activitySubmissions.reviewHistoryPage.totalPages}</span><Button variant="secondary" disabled={activitySubmissions.reviewHistoryPage.page >= activitySubmissions.reviewHistoryPage.totalPages} onclick={() => historyPage(activitySubmissions.reviewHistoryPage.page + 1)}>Berikutnya</Button></div>{/if}
{/if}
