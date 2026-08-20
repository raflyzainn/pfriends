<script>
	import { onMount } from 'svelte';
	import { PageHeader, Card, StatusBadge, EmptyState, FilterChips, Button } from '$lib/components';
	import { workflowBadges } from '$lib/stores/workflow-badges.svelte.js';

	const items = $derived(workflowBadges.movements);
	let loading = $state(true);
	let tab = $state('proposals');
	let status = $state('');

	const statusMeta = {
		DIUSULKAN: { label: 'Diusulkan', color: 'amber' },
		PERLU_REVISI: { label: 'Perlu revisi', color: 'red' },
		BERJALAN: { label: 'Berjalan', color: 'blue' },
		SELESAI: { label: 'Selesai', color: 'green' },
		DITOLAK: { label: 'Ditolak', color: 'slate' },
		SUBMITTED: { label: 'Sudah dikirim', color: 'amber' },
		IN_REVIEW: { label: 'Sedang diperiksa', color: 'blue' },
		NEEDS_REVISION: { label: 'Menunggu Awardee', color: 'red' },
		APPROVED: { label: 'Disetujui', color: 'green' },
		REJECTED: { label: 'Ditolak', color: 'slate' }
	};
	const proposals = $derived(items.filter((item) => item.status === 'DIUSULKAN' || item.status === 'PERLU_REVISI'));
	const reports = $derived(items.flatMap((movement) => (movement.reports || []).map((report) => ({ ...report, movementId: movement.id, movementTitle: movement.title }))));
	const pendingProposalCount = $derived(items.filter((item) => item.status === 'DIUSULKAN').length);
	const pendingReportCount = $derived(reports.filter((item) => item.status === 'SUBMITTED' || item.status === 'IN_REVIEW').length);
	const proposalFilters = $derived([
		{ id: 'DIUSULKAN', label: 'Diusulkan', count: proposals.filter((item) => item.status === 'DIUSULKAN').length },
		{ id: 'PERLU_REVISI', label: 'Perlu revisi', count: proposals.filter((item) => item.status === 'PERLU_REVISI').length }
	]);
	const reportFilters = $derived([
		{ id: 'SUBMITTED', label: 'Sudah dikirim', count: reports.filter((item) => item.status === 'SUBMITTED').length },
		{ id: 'IN_REVIEW', label: 'Sedang diperiksa', count: reports.filter((item) => item.status === 'IN_REVIEW').length },
		{ id: 'NEEDS_REVISION', label: 'Menunggu Awardee', count: reports.filter((item) => item.status === 'NEEDS_REVISION').length },
		{ id: 'APPROVED', label: 'Disetujui', count: reports.filter((item) => item.status === 'APPROVED').length }
	]);
	const movementFilters = $derived([
		{ id: 'BERJALAN', label: 'Berjalan', count: items.filter((item) => item.status === 'BERJALAN').length },
		{ id: 'SELESAI', label: 'Selesai', count: items.filter((item) => item.status === 'SELESAI').length },
		{ id: 'DITOLAK', label: 'Ditolak', count: items.filter((item) => item.status === 'DITOLAK').length }
	]);
	const shownProposals = $derived(status ? proposals.filter((item) => item.status === status) : proposals);
	const shownReports = $derived(status ? reports.filter((item) => item.status === status) : reports);
	const shownMovements = $derived(status ? items.filter((item) => item.status === status) : items);

	function changeTab(value) { tab = value; status = ''; }
	function date(value) { return String(value || '').slice(0, 10); }
	async function load() { loading = true; try { await workflowBadges.loadMovements(); } finally { loading = false; } }
	onMount(load);
</script>

<svelte:head><title>Verifikasi Gerakan · PFriends</title></svelte:head>

<PageHeader eyebrow="Ruang verifikasi" title="Gerakan" description="Tangani usulan Gerakan, periksa laporan aksi, dan pantau pelaksanaan program." />

<div class="mb-5 flex gap-2 border-b border-ink-200">
	<button type="button" aria-label={`Usulan Gerakan, ${pendingProposalCount} antrean aktif`} class={`flex items-center gap-2 px-4 py-3 text-sm font-semibold ${tab === 'proposals' ? 'border-b-2 border-pertamina-red text-heading' : 'text-ink-500'}`} onclick={() => changeTab('proposals')}>Usulan Gerakan{#if pendingProposalCount > 0}<span class="numeric inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-pertamina-red px-1.5 text-[11px] font-bold leading-none text-white">{pendingProposalCount}</span>{/if}</button>
	<button type="button" aria-label={`Laporan Aksi, ${pendingReportCount} antrean aktif`} class={`flex items-center gap-2 px-4 py-3 text-sm font-semibold ${tab === 'reports' ? 'border-b-2 border-pertamina-red text-heading' : 'text-ink-500'}`} onclick={() => changeTab('reports')}>Laporan Aksi{#if pendingReportCount > 0}<span class="numeric inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-pertamina-red px-1.5 text-[11px] font-bold leading-none text-white">{pendingReportCount}</span>{/if}</button>
	<button type="button" class={`px-4 py-3 text-sm font-semibold ${tab === 'movements' ? 'border-b-2 border-pertamina-red text-heading' : 'text-ink-500'}`} onclick={() => changeTab('movements')}>Semua Gerakan</button>
</div>

{#if tab === 'proposals'}
	<FilterChips options={proposalFilters} bind:selected={status} label="Filter status usulan" />
	{#if loading}<p class="mt-6 text-sm text-ink-500">Memuat antrean...</p>{:else if shownProposals.length === 0}<div class="mt-6"><EmptyState title="Antrean usulan kosong" message="Tidak ada usulan Gerakan pada pilihan ini." /></div>{:else}<div class="mt-6 grid gap-3">{#each shownProposals as movement}<Card><div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><div class="flex flex-wrap items-center gap-2"><StatusBadge label={statusMeta[movement.status].label} color={statusMeta[movement.status].color} withDot /><span class="text-xs text-ink-500">{date(movement.submittedAt)}</span></div><h2 class="mt-2 font-semibold text-heading">{movement.title}</h2><p class="mt-1 text-sm text-ink-600">{movement.leaderName || 'Pengusul belum terhubung'} · {movement.region}</p></div><Button href={`/verifikator/gerakan/${movement.id}`} variant="outline">Lihat detail</Button></div></Card>{/each}</div>{/if}
{:else if tab === 'reports'}
	<FilterChips options={reportFilters} bind:selected={status} label="Filter status laporan" />
	{#if loading}<p class="mt-6 text-sm text-ink-500">Memuat antrean...</p>{:else if shownReports.length === 0}<div class="mt-6"><EmptyState title="Antrean laporan kosong" message="Belum ada laporan aksi pada pilihan ini." /></div>{:else}<div class="mt-6 grid gap-3">{#each shownReports as report}<Card><div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><div class="flex flex-wrap items-center gap-2"><StatusBadge label={statusMeta[report.status].label} color={statusMeta[report.status].color} withDot /><span class="text-xs text-ink-500">{date(report.submittedAt)}</span></div><h2 class="mt-2 font-semibold text-heading">{report.movementTitle}</h2><p class="mt-1 text-sm text-ink-600">{report.awardeeName || 'Laporan data lama'} · {report.location} · {report.participantCount} peserta</p></div><Button href={`/verifikator/gerakan/${report.movementId}?laporan=${report.id}`} variant="outline">Lihat detail</Button></div></Card>{/each}</div>{/if}
{:else}
	<FilterChips options={movementFilters} bind:selected={status} label="Filter status Gerakan" />
	{#if loading}<p class="mt-6 text-sm text-ink-500">Memuat Gerakan...</p>{:else if shownMovements.length === 0}<div class="mt-6"><EmptyState title="Gerakan tidak ditemukan" message="Tidak ada Gerakan pada pilihan ini." /></div>{:else}<div class="mt-6 grid gap-3">{#each shownMovements as movement}<Card><div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><div class="flex flex-wrap items-center gap-2"><StatusBadge label={statusMeta[movement.status]?.label || movement.status} color={statusMeta[movement.status]?.color || 'slate'} withDot /></div><h2 class="mt-2 font-semibold text-heading">{movement.title}</h2><p class="mt-1 text-sm text-ink-600">{movement.region} · {movement.participantCount} peserta · {movement.approvedReportCount} laporan disetujui</p></div><Button href={`/verifikator/gerakan/${movement.id}`} variant="outline">Lihat detail</Button></div></Card>{/each}</div>{/if}
{/if}
