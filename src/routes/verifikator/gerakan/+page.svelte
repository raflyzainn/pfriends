<script>
	import { onMount } from 'svelte';
	import { listMovements, decideMovement, startMovementReportReview, decideMovementReport, completeMovement } from '$lib/infrastructure/pocketbase/movements.js';

	const tabs = [
		{ id: 'PROPOSALS', label: 'Usulan Gerakan' },
		{ id: 'REPORTS', label: 'Laporan Aksi' },
		{ id: 'ALL', label: 'Semua Gerakan' }
	];
	let items = $state([]);
	let loading = $state(true);
	let error = $state('');
	let success = $state('');
	let query = $state('');
	let tab = $state('PROPOSALS');
	let action = $state(null);
	let note = $state('');
	let pillar = $state('E');
	let sdgGoal = $state('12');
	let saving = $state(false);

	const proposals = $derived(items.filter((item) => item.status === 'DIUSULKAN' || item.status === 'PERLU_REVISI'));
	const reports = $derived(items.flatMap((movement) => (movement.reports || []).map((report) => ({ ...report, movementTitle: movement.title, movementStatus: movement.status }))));
	const pendingReports = $derived(reports.filter((report) => report.status === 'SUBMITTED' || report.status === 'IN_REVIEW'));
	const normalizedQuery = $derived(query.trim().toLowerCase());
	const visibleProposals = $derived(proposals.filter((item) => !normalizedQuery || `${item.title} ${item.leaderName} ${item.region}`.toLowerCase().includes(normalizedQuery)));
	const visibleReports = $derived(reports.filter((item) => !normalizedQuery || `${item.movementTitle} ${item.awardeeName} ${item.location}`.toLowerCase().includes(normalizedQuery)));
	const visibleMovements = $derived(items.filter((item) => !normalizedQuery || `${item.title} ${item.leaderName} ${item.region} ${item.status}`.toLowerCase().includes(normalizedQuery)));

	async function load() {
		loading = true;
		error = '';
		try { items = await listMovements(); }
		catch (exception) { error = exception.message; }
		finally { loading = false; }
	}

	function openAction(kind, record, decision = '') {
		action = { kind, record, decision };
		note = '';
		pillar = 'E';
		sdgGoal = '12';
		error = '';
		success = '';
	}

	async function submitAction() {
		if (!action) return;
		saving = true;
		error = '';
		try {
			if (action.kind === 'MOVEMENT') await decideMovement(action.record.id, { decision: action.decision, note, esgTags: action.decision === 'APPROVE' ? [{ pillar, sdgGoal: Number(sdgGoal) }] : [] });
			if (action.kind === 'REPORT') await decideMovementReport(action.record.id, { decision: action.decision, note });
			success = 'Keputusan berhasil disimpan.';
			action = null;
			await load();
		} catch (exception) { error = exception.message; }
		finally { saving = false; }
	}

	async function startReview(report) {
		try { await startMovementReportReview(report.id); success = 'Laporan sekarang sedang diperiksa.'; await load(); }
		catch (exception) { error = exception.message; }
	}

	async function finishMovement(movement) {
		try { await completeMovement(movement.id); success = 'Gerakan ditandai selesai.'; await load(); }
		catch (exception) { error = exception.message; }
	}

	onMount(load);
</script>

<svelte:head><title>Verifikasi Gerakan | PFriends</title></svelte:head>

<section class="space-y-6">
	<header>
		<p class="font-semibold text-emerald-700">Kendali mutu aksi lapangan</p>
		<h1 class="text-3xl font-bold">Verifikasi Gerakan</h1>
		<p class="mt-2 max-w-3xl text-slate-600">Usulan Gerakan dan laporan aksi mempunyai antrean terpisah. Verifikator menyetujui usulan terlebih dahulu, lalu memeriksa laporan dari pemimpin maupun peserta.</p>
	</header>

	<div class="grid gap-4 sm:grid-cols-3">
		<div class="rounded-2xl bg-white p-5 shadow-sm"><strong class="text-3xl text-amber-700">{proposals.length}</strong><p class="text-slate-600">Usulan menunggu keputusan</p></div>
		<div class="rounded-2xl bg-white p-5 shadow-sm"><strong class="text-3xl text-blue-700">{pendingReports.length}</strong><p class="text-slate-600">Laporan menunggu pemeriksaan</p></div>
		<div class="rounded-2xl bg-white p-5 shadow-sm"><strong class="text-3xl text-emerald-700">{items.filter((item) => item.status === 'BERJALAN').length}</strong><p class="text-slate-600">Gerakan sedang berjalan</p></div>
	</div>

	{#if error}<p class="rounded-xl bg-red-50 p-4 text-red-800">{error}</p>{/if}
	{#if success}<p class="rounded-xl bg-emerald-50 p-4 text-emerald-800">{success}</p>{/if}

	<div class="rounded-2xl bg-white p-4 shadow-sm">
		<label class="block text-sm font-semibold text-slate-700" for="movement-search">Cari antrean</label>
		<input id="movement-search" class="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3" bind:value={query} placeholder="Cari judul Gerakan, Awardee, atau wilayah">
	</div>

	<nav class="flex flex-wrap gap-2" aria-label="Jenis antrean">
		{#each tabs as item}
			<button class={tab === item.id ? 'rounded-full bg-emerald-800 px-4 py-2 font-semibold text-white' : 'rounded-full bg-white px-4 py-2 font-semibold text-slate-700 shadow-sm'} onclick={() => tab = item.id}>{item.label}{#if item.id === 'PROPOSALS'} ({proposals.length}){:else if item.id === 'REPORTS'} ({reports.length}){/if}</button>
		{/each}
	</nav>

	{#if loading}
		<p class="rounded-2xl bg-white p-6 shadow-sm">Memuat antrean Gerakan...</p>
	{:else if tab === 'PROPOSALS'}
		<div class="space-y-4">
			{#each visibleProposals as movement}
				<article class="rounded-2xl bg-white p-5 shadow-sm">
					<div class="flex flex-wrap items-start justify-between gap-3"><div><p class="text-xs font-bold text-emerald-700">USULAN GERAKAN</p><h2 class="text-xl font-bold">{movement.title}</h2><p class="mt-1 text-sm text-slate-600">Pengusul {movement.leaderName || 'Belum terhubung'} • {movement.region}</p></div><span class="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">{movement.status}</span></div>
					<p class="mt-4 text-slate-700">{movement.description}</p>
					{#if movement.reviewNote}<p class="mt-4 rounded-xl bg-amber-50 p-3 text-sm">Catatan sebelumnya: {movement.reviewNote}</p>{/if}
					<div class="mt-5 flex flex-wrap gap-2"><button class="rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white" onclick={() => openAction('MOVEMENT', movement, 'APPROVE')}>Setujui usulan</button><button class="rounded-lg bg-amber-600 px-4 py-2 font-semibold text-white" onclick={() => openAction('MOVEMENT', movement, 'REQUEST_REVISION')}>Minta revisi</button><button class="rounded-lg bg-red-700 px-4 py-2 font-semibold text-white" onclick={() => openAction('MOVEMENT', movement, 'REJECT')}>Tolak</button></div>
				</article>
			{:else}<p class="rounded-2xl bg-white p-6 text-slate-600 shadow-sm">Tidak ada usulan yang cocok dengan pencarian.</p>{/each}
		</div>
	{:else if tab === 'REPORTS'}
		<div class="space-y-4">
			{#each visibleReports as report}
				<article class="rounded-2xl bg-white p-5 shadow-sm">
					<div class="flex flex-wrap items-start justify-between gap-3"><div><p class="text-xs font-bold text-blue-700">LAPORAN AKSI</p><h2 class="text-xl font-bold">{report.movementTitle}</h2><p class="mt-1 text-sm text-slate-600">Pelapor {report.awardeeName || 'Data lama'} • Peran {report.role}</p></div><span class="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800">{report.status}</span></div>
					<div class="mt-4 grid gap-3 text-sm sm:grid-cols-3"><div><p class="text-slate-500">Tanggal aksi</p><b>{report.activityDate.slice(0, 10)}</b></div><div><p class="text-slate-500">Lokasi</p><b>{report.location}</b></div><div><p class="text-slate-500">Jumlah peserta</p><b>{report.participantCount}</b></div></div>
					<p class="mt-4 rounded-xl bg-slate-50 p-4 text-sm">{report.outcomeNote}</p><p class="mt-3 text-sm font-semibold">{report.evidenceFiles.length} berkas bukti</p>
					{#if report.reviewNote}<p class="mt-3 rounded-xl bg-amber-50 p-3 text-sm">Catatan pemeriksaan: {report.reviewNote}</p>{/if}
					{#if report.status === 'SUBMITTED'}<button class="mt-4 rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white" onclick={() => startReview(report)}>Mulai periksa</button>{/if}
					{#if report.status === 'SUBMITTED' || report.status === 'IN_REVIEW'}<div class="mt-4 flex flex-wrap gap-2"><button class="rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white" onclick={() => openAction('REPORT', report, 'APPROVE')}>Setujui laporan</button><button class="rounded-lg bg-amber-600 px-4 py-2 font-semibold text-white" onclick={() => openAction('REPORT', report, 'REQUEST_REVISION')}>Minta revisi</button><button class="rounded-lg bg-red-700 px-4 py-2 font-semibold text-white" onclick={() => openAction('REPORT', report, 'REJECT')}>Tolak</button></div>{/if}
				</article>
			{:else}<p class="rounded-2xl bg-white p-6 text-slate-600 shadow-sm">Belum ada laporan aksi yang cocok dengan pencarian.</p>{/each}
		</div>
	{:else}
		<div class="space-y-4">{#each visibleMovements as movement}<article class="rounded-2xl bg-white p-5 shadow-sm"><div class="flex flex-wrap justify-between gap-3"><div><h2 class="text-xl font-bold">{movement.title}</h2><p class="text-sm text-slate-600">{movement.region} • {movement.participantCount} peserta • {movement.approvedReportCount} laporan disetujui</p></div><span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{movement.status}</span></div>{#if movement.status === 'BERJALAN' && movement.approvedReportCount > 0}<button class="mt-4 rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white" onclick={() => finishMovement(movement)}>Tandai selesai</button>{/if}</article>{:else}<p class="rounded-2xl bg-white p-6 text-slate-600 shadow-sm">Tidak ada Gerakan yang cocok dengan pencarian.</p>{/each}</div>
	{/if}
</section>

{#if action}
	<div class="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
		<div class="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
			<p class="text-sm font-bold text-emerald-700">KONFIRMASI KEPUTUSAN</p><h2 class="mt-1 text-xl font-bold">{action.decision === 'APPROVE' ? 'Setujui' : action.decision === 'REQUEST_REVISION' ? 'Minta revisi' : 'Tolak'} {action.kind === 'MOVEMENT' ? 'usulan Gerakan' : 'laporan aksi'}</h2>
			{#if action.kind === 'MOVEMENT' && action.decision === 'APPROVE'}<div class="mt-5 grid grid-cols-2 gap-3"><label>Pilar ESG<select class="mt-1 w-full rounded-lg border p-2" bind:value={pillar}><option>E</option><option>S</option><option>G</option></select></label><label>Tujuan SDG<input class="mt-1 w-full rounded-lg border p-2" type="number" min="1" max="17" bind:value={sdgGoal}></label></div>{/if}
			<label class="mt-4 block">Catatan keputusan<textarea class="mt-1 w-full rounded-lg border p-3" rows="4" bind:value={note} placeholder={action.decision === 'APPROVE' ? 'Catatan opsional' : 'Jelaskan hal yang perlu diperbaiki'}></textarea></label>
			<div class="mt-5 flex gap-2"><button class="rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white disabled:opacity-50" disabled={saving || (action.decision !== 'APPROVE' && note.trim().length < 5)} onclick={submitAction}>{saving ? 'Menyimpan...' : 'Simpan keputusan'}</button><button class="rounded-lg bg-slate-100 px-4 py-2 font-semibold" disabled={saving} onclick={() => action = null}>Batal</button></div>
		</div>
	</div>
{/if}
