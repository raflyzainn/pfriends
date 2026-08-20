<script>
	import { onMount } from 'svelte';
	import { PageHeader, Card, StatusBadge, EmptyState, FilterChips, Button } from '$lib/components';
	import { listMovements, decideMovement, startMovementReportReview, decideMovementReport, completeMovement } from '$lib/infrastructure/pocketbase/movements.js';

	let items = $state([]);
	let loading = $state(true);
	let error = $state('');
	let success = $state('');
	let tab = $state('proposals');
	let query = $state('');
	let status = $state('');
	let action = $state(null);
	let note = $state('');
	let pillar = $state('E');
	let sdgGoal = $state('12');
	let saving = $state(false);

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
	const reports = $derived(items.flatMap((movement) => (movement.reports || []).map((report) => ({ ...report, movementTitle: movement.title }))));
	const normalizedQuery = $derived(query.trim().toLowerCase());
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
	const shownProposals = $derived(proposals.filter((item) => (!status || item.status === status) && (!normalizedQuery || `${item.title} ${item.leaderName} ${item.region}`.toLowerCase().includes(normalizedQuery))));
	const shownReports = $derived(reports.filter((item) => (!status || item.status === status) && (!normalizedQuery || `${item.movementTitle} ${item.awardeeName} ${item.location}`.toLowerCase().includes(normalizedQuery))));
	const shownMovements = $derived(items.filter((item) => (!status || item.status === status) && (!normalizedQuery || `${item.title} ${item.leaderName} ${item.region}`.toLowerCase().includes(normalizedQuery))));

	function changeTab(value) { tab = value; status = ''; query = ''; error = ''; success = ''; }
	function date(value) { return String(value || '').slice(0, 10); }
	async function load() { loading = true; error = ''; try { items = await listMovements(); } catch (exception) { error = exception.message; } finally { loading = false; } }
	function openAction(kind, record, decision) { action = { kind, record, decision }; note = ''; pillar = 'E'; sdgGoal = '12'; error = ''; success = ''; }
	async function submitAction() { if (!action) return; saving = true; error = ''; try { if (action.kind === 'MOVEMENT') await decideMovement(action.record.id, { decision: action.decision, note, esgTags: action.decision === 'APPROVE' ? [{ pillar, sdgGoal: Number(sdgGoal) }] : [] }); else await decideMovementReport(action.record.id, { decision: action.decision, note }); success = 'Keputusan berhasil disimpan.'; action = null; await load(); } catch (exception) { error = exception.message; } finally { saving = false; } }
	async function startReview(report) { try { await startMovementReportReview(report.id); success = 'Laporan sekarang sedang diperiksa.'; await load(); } catch (exception) { error = exception.message; } }
	async function finishMovement(movement) { try { await completeMovement(movement.id); success = 'Gerakan ditandai selesai.'; await load(); } catch (exception) { error = exception.message; } }
	onMount(load);
</script>

<svelte:head><title>Verifikasi Gerakan · PFriends</title></svelte:head>

<PageHeader eyebrow="Ruang verifikasi" title="Gerakan" description="Tangani usulan Gerakan, periksa laporan aksi, dan pantau pelaksanaan program." />

<div class="mb-5 flex gap-2 border-b border-ink-200">
	<button type="button" class={`px-4 py-3 text-sm font-semibold ${tab === 'proposals' ? 'border-b-2 border-pertamina-red text-heading' : 'text-ink-500'}`} onclick={() => changeTab('proposals')}>Usulan Gerakan</button>
	<button type="button" class={`px-4 py-3 text-sm font-semibold ${tab === 'reports' ? 'border-b-2 border-pertamina-red text-heading' : 'text-ink-500'}`} onclick={() => changeTab('reports')}>Laporan Aksi</button>
	<button type="button" class={`px-4 py-3 text-sm font-semibold ${tab === 'movements' ? 'border-b-2 border-pertamina-red text-heading' : 'text-ink-500'}`} onclick={() => changeTab('movements')}>Semua Gerakan</button>
</div>

{#if error}<p class="mb-5 rounded-control border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>{/if}
{#if success}<p class="mb-5 rounded-control border border-green-200 bg-green-50 p-3 text-sm text-green-800">{success}</p>{/if}

<label class="mb-5 block max-w-xl text-sm font-semibold text-ink-700" for="movement-search">Cari antrean<input id="movement-search" class="mt-2 w-full rounded-control border border-ink-200 bg-white px-3 py-2.5 text-sm font-normal" bind:value={query} placeholder="Cari judul, Awardee, atau wilayah"></label>

{#if tab === 'proposals'}
	<FilterChips options={proposalFilters} bind:selected={status} label="Filter status usulan" />
	{#if loading}<p class="mt-6 text-sm text-ink-500">Memuat antrean...</p>{:else if shownProposals.length === 0}<div class="mt-6"><EmptyState title="Antrean usulan kosong" message="Tidak ada usulan Gerakan pada pilihan ini." /></div>{:else}<div class="mt-6 grid gap-3">{#each shownProposals as movement}<Card><div class="flex flex-col justify-between gap-4 lg:flex-row lg:items-start"><div class="min-w-0"><div class="flex flex-wrap items-center gap-2"><StatusBadge label={statusMeta[movement.status].label} color={statusMeta[movement.status].color} withDot /><span class="text-xs text-ink-500">{date(movement.submittedAt)}</span></div><h2 class="mt-2 font-semibold text-heading">{movement.title}</h2><p class="mt-1 text-sm text-ink-600">{movement.leaderName || 'Pengusul belum terhubung'} · {movement.region}</p><p class="mt-3 text-sm leading-relaxed text-ink-700">{movement.description}</p>{#if movement.reviewNote}<p class="mt-3 rounded-lg bg-ink-50 p-3 text-sm text-ink-700">{movement.reviewNote}</p>{/if}</div><div class="flex shrink-0 flex-wrap gap-2"><Button size="sm" onclick={() => openAction('MOVEMENT', movement, 'APPROVE')}>Setujui</Button><Button size="sm" variant="secondary" onclick={() => openAction('MOVEMENT', movement, 'REQUEST_REVISION')}>Minta revisi</Button><Button size="sm" variant="danger" onclick={() => openAction('MOVEMENT', movement, 'REJECT')}>Tolak</Button></div></div></Card>{/each}</div>{/if}
{:else if tab === 'reports'}
	<FilterChips options={reportFilters} bind:selected={status} label="Filter status laporan" />
	{#if loading}<p class="mt-6 text-sm text-ink-500">Memuat antrean...</p>{:else if shownReports.length === 0}<div class="mt-6"><EmptyState title="Antrean laporan kosong" message="Belum ada laporan aksi pada pilihan ini." /></div>{:else}<div class="mt-6 grid gap-3">{#each shownReports as report}<Card><div class="flex flex-col justify-between gap-4 lg:flex-row lg:items-start"><div class="min-w-0"><div class="flex flex-wrap items-center gap-2"><StatusBadge label={statusMeta[report.status].label} color={statusMeta[report.status].color} withDot /><span class="text-xs text-ink-500">{date(report.submittedAt)}</span></div><h2 class="mt-2 font-semibold text-heading">{report.movementTitle}</h2><p class="mt-1 text-sm text-ink-600">{report.awardeeName || 'Laporan data lama'} · {report.role} · {report.location}</p><p class="mt-3 text-sm leading-relaxed text-ink-700">{report.outcomeNote}</p><div class="mt-2 flex flex-wrap gap-3 text-xs text-ink-500"><span>{report.participantCount} peserta</span><span>{report.evidenceFiles.length} berkas bukti</span><span>Aksi {date(report.activityDate)}</span></div>{#if report.reviewNote}<p class="mt-3 rounded-lg bg-ink-50 p-3 text-sm text-ink-700">{report.reviewNote}</p>{/if}</div>{#if report.status === 'SUBMITTED' || report.status === 'IN_REVIEW'}<div class="flex shrink-0 flex-wrap gap-2">{#if report.status === 'SUBMITTED'}<Button size="sm" variant="outline" onclick={() => startReview(report)}>Mulai periksa</Button>{/if}<Button size="sm" onclick={() => openAction('REPORT', report, 'APPROVE')}>Setujui</Button><Button size="sm" variant="secondary" onclick={() => openAction('REPORT', report, 'REQUEST_REVISION')}>Minta revisi</Button><Button size="sm" variant="danger" onclick={() => openAction('REPORT', report, 'REJECT')}>Tolak</Button></div>{/if}</div></Card>{/each}</div>{/if}
{:else}
	<FilterChips options={movementFilters} bind:selected={status} label="Filter status Gerakan" />
	{#if loading}<p class="mt-6 text-sm text-ink-500">Memuat Gerakan...</p>{:else if shownMovements.length === 0}<div class="mt-6"><EmptyState title="Gerakan tidak ditemukan" message="Tidak ada Gerakan pada pilihan ini." /></div>{:else}<div class="mt-6 grid gap-3">{#each shownMovements as movement}<Card><div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><div class="flex flex-wrap items-center gap-2"><StatusBadge label={statusMeta[movement.status]?.label || movement.status} color={statusMeta[movement.status]?.color || 'slate'} withDot /></div><h2 class="mt-2 font-semibold text-heading">{movement.title}</h2><p class="mt-1 text-sm text-ink-600">{movement.region} · {movement.participantCount} peserta · {movement.approvedReportCount} laporan disetujui</p></div>{#if movement.status === 'BERJALAN' && movement.approvedReportCount > 0}<Button variant="outline" onclick={() => finishMovement(movement)}>Tandai selesai</Button>{/if}</div></Card>{/each}</div>{/if}
{/if}

{#if action}
	<div class="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
		<div class="w-full max-w-lg rounded-card bg-white p-6 shadow-xl">
			<p class="text-xs font-bold tracking-wide text-pertamina-red">KONFIRMASI KEPUTUSAN</p>
			<h2 class="mt-1 text-xl font-semibold text-heading">{action.decision === 'APPROVE' ? 'Setujui' : action.decision === 'REQUEST_REVISION' ? 'Minta revisi' : 'Tolak'} {action.kind === 'MOVEMENT' ? 'usulan Gerakan' : 'laporan aksi'}</h2>
			{#if action.kind === 'MOVEMENT' && action.decision === 'APPROVE'}<div class="mt-5 grid grid-cols-2 gap-3"><label class="text-sm font-semibold text-ink-700">Pilar ESG<select class="mt-1 w-full rounded-control border border-ink-200 p-2 font-normal" bind:value={pillar}><option>E</option><option>S</option><option>G</option></select></label><label class="text-sm font-semibold text-ink-700">Tujuan SDG<input class="mt-1 w-full rounded-control border border-ink-200 p-2 font-normal" type="number" min="1" max="17" bind:value={sdgGoal}></label></div>{/if}
			<label class="mt-4 block text-sm font-semibold text-ink-700">Catatan keputusan<textarea class="mt-1 w-full rounded-control border border-ink-200 p-3 font-normal" rows="4" bind:value={note} placeholder={action.decision === 'APPROVE' ? 'Catatan opsional' : 'Jelaskan hal yang perlu diperbaiki'}></textarea></label>
			<div class="mt-5 flex gap-2"><Button disabled={saving || (action.decision !== 'APPROVE' && note.trim().length < 5)} onclick={submitAction}>{saving ? 'Menyimpan...' : 'Simpan keputusan'}</Button><Button variant="secondary" disabled={saving} onclick={() => action = null}>Batal</Button></div>
		</div>
	</div>
{/if}
