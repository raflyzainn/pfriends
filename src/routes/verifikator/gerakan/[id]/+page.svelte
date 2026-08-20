<script>
	import { page } from '$app/state';
	import { PageHeader, Card, StatusBadge, Button, EmptyState } from '$lib/components';
	import { listMovements, decideMovement, startMovementReportReview, decideMovementReport, completeMovement } from '$lib/infrastructure/pocketbase/movements.js';

	let movement = $state(null);
	let loading = $state(true);
	let error = $state('');
	let success = $state('');
	let note = $state('');
	let pillar = $state('E');
	let sdgGoal = $state('12');
	let saving = $state(false);
	let started = false;

	const report = $derived(movement?.reports?.find((item) => item.id === page.url.searchParams.get('laporan')) ?? null);
	const statusMeta = {
		DIUSULKAN: { label: 'Diusulkan', color: 'amber' }, PERLU_REVISI: { label: 'Perlu revisi', color: 'red' },
		BERJALAN: { label: 'Berjalan', color: 'blue' }, SELESAI: { label: 'Selesai', color: 'green' }, DITOLAK: { label: 'Ditolak', color: 'slate' },
		SUBMITTED: { label: 'Sudah dikirim', color: 'amber' }, IN_REVIEW: { label: 'Sedang diperiksa', color: 'blue' }, NEEDS_REVISION: { label: 'Menunggu Awardee', color: 'red' }, APPROVED: { label: 'Disetujui', color: 'green' }, REJECTED: { label: 'Ditolak', color: 'slate' }
	};
	const date = (value) => String(value || '').slice(0, 16).replace('T', ' ');

	async function load() {
		loading = true;
		error = '';
		try { movement = (await listMovements()).find((item) => item.id === page.params.id) ?? null; }
		catch (exception) { error = exception.message; }
		finally { loading = false; }
	}
	async function decideProposal(decision) {
		saving = true; error = '';
		try { await decideMovement(movement.id, { decision, note, esgTags: decision === 'APPROVE' ? [{ pillar, sdgGoal: Number(sdgGoal) }] : [] }); success = 'Keputusan usulan berhasil disimpan.'; note = ''; await load(); }
		catch (exception) { error = exception.message; }
		finally { saving = false; }
	}
	async function beginReportReview() {
		saving = true; error = '';
		try { await startMovementReportReview(report.id); success = 'Pemeriksaan laporan dimulai.'; await load(); }
		catch (exception) { error = exception.message; }
		finally { saving = false; }
	}
	async function decideReport(decision) {
		saving = true; error = '';
		try { await decideMovementReport(report.id, { decision, note }); success = 'Keputusan laporan berhasil disimpan.'; note = ''; await load(); }
		catch (exception) { error = exception.message; }
		finally { saving = false; }
	}
	async function finish() {
		saving = true; error = '';
		try { await completeMovement(movement.id); success = 'Gerakan berhasil ditandai selesai.'; await load(); }
		catch (exception) { error = exception.message; }
		finally { saving = false; }
	}

	$effect(() => { if (!started && page.params.id) { started = true; void load(); } });
</script>

<svelte:head><title>Detail Gerakan · Verifikator PFriends</title></svelte:head>

<PageHeader eyebrow={report ? 'Verifikasi laporan aksi' : 'Verifikasi Gerakan'} title={movement?.title ?? 'Memuat Gerakan...'} description={report ? 'Periksa hasil aksi, jumlah peserta, dan bukti yang dikirim Awardee.' : 'Periksa rincian usulan, pelaksanaan, serta status Gerakan.'} />

{#if error}<p class="mb-5 rounded-control border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>{/if}
{#if success}<p class="mb-5 rounded-control border border-green-200 bg-green-50 p-3 text-sm text-green-800">{success}</p>{/if}

{#if movement}
	<div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
		<div class="grid gap-5">
			<Card>
				<div class="flex flex-wrap items-center gap-2"><StatusBadge label={statusMeta[(report || movement).status]?.label || (report || movement).status} color={statusMeta[(report || movement).status]?.color || 'slate'} withDot /><span class="text-xs text-ink-500">{date((report || movement).submittedAt)}</span></div>
				<h2 class="mt-5 font-semibold text-heading">{report ? 'Rincian laporan aksi' : 'Rincian Gerakan'}</h2>
				{#if report}
					<dl class="mt-4 grid gap-4 sm:grid-cols-2"><div><dt class="text-xs text-ink-500">Awardee</dt><dd class="font-semibold">{report.awardeeName || 'Laporan data lama'}</dd></div><div><dt class="text-xs text-ink-500">Peran</dt><dd>{report.role}</dd></div><div><dt class="text-xs text-ink-500">Tanggal aksi</dt><dd>{date(report.activityDate)}</dd></div><div><dt class="text-xs text-ink-500">Lokasi</dt><dd>{report.location}</dd></div><div><dt class="text-xs text-ink-500">Jumlah peserta</dt><dd>{report.participantCount}</dd></div><div><dt class="text-xs text-ink-500">Berkas bukti</dt><dd>{report.evidenceFiles?.length || 0}</dd></div></dl>
					<p class="mt-5 whitespace-pre-wrap text-sm leading-6 text-ink-700">{report.outcomeNote}</p>
				{:else}
					<dl class="mt-4 grid gap-4 sm:grid-cols-2"><div><dt class="text-xs text-ink-500">Pengusul</dt><dd class="font-semibold">{movement.leaderName || 'Pengusul belum terhubung'}</dd></div><div><dt class="text-xs text-ink-500">Wilayah</dt><dd>{movement.region}</dd></div><div><dt class="text-xs text-ink-500">Periode</dt><dd>{date(movement.startsAt)} sampai {date(movement.endsAt)}</dd></div><div><dt class="text-xs text-ink-500">Target peserta</dt><dd>{movement.targetParticipants}</dd></div></dl>
					<p class="mt-5 whitespace-pre-wrap text-sm leading-6 text-ink-700">{movement.description}</p>
				{/if}
				{#if (report || movement).reviewNote}<p class="mt-4 rounded-lg bg-ink-50 p-3 text-sm text-ink-700"><strong>Catatan terakhir:</strong> {(report || movement).reviewNote}</p>{/if}
			</Card>
		</div>
		<aside>
			<Card>
				<h2 class="font-semibold text-heading">Keputusan</h2>
				{#if report}
					{#if report.status === 'SUBMITTED'}<p class="mt-3 text-sm text-ink-600">Mulai pemeriksaan sebelum memberi keputusan.</p><Button class="mt-4" fullWidth loading={saving} onclick={beginReportReview}>Mulai periksa</Button>
					{:else if report.status === 'IN_REVIEW'}<label class="mt-4 grid gap-1.5 text-sm font-medium">Catatan<textarea bind:value={note} rows="5" class="rounded-xl border border-ink-200 p-3" placeholder="Wajib saat meminta revisi atau menolak."></textarea></label><div class="mt-4 grid gap-2"><Button loading={saving} variant="success" onclick={() => decideReport('APPROVE')}>Setujui laporan</Button><Button loading={saving} variant="outline" disabled={note.trim().length < 5} onclick={() => decideReport('REQUEST_REVISION')}>Minta revisi</Button><Button loading={saving} variant="danger" disabled={note.trim().length < 5} onclick={() => decideReport('REJECT')}>Tolak laporan</Button></div>
					{:else}<p class="mt-3 text-sm text-ink-600">Laporan ini tidak sedang menunggu keputusan.</p>{/if}
				{:else if movement.status === 'DIUSULKAN' || movement.status === 'PERLU_REVISI'}
					<div class="mt-4 grid grid-cols-2 gap-3"><label class="text-sm font-semibold text-ink-700">Pilar ESG<select class="mt-1 w-full rounded-control border border-ink-200 p-2 font-normal" bind:value={pillar}><option>E</option><option>S</option><option>G</option></select></label><label class="text-sm font-semibold text-ink-700">Tujuan SDG<input class="mt-1 w-full rounded-control border border-ink-200 p-2 font-normal" type="number" min="1" max="17" bind:value={sdgGoal}></label></div>
					<label class="mt-4 grid gap-1.5 text-sm font-medium">Catatan<textarea bind:value={note} rows="5" class="rounded-xl border border-ink-200 p-3" placeholder="Wajib saat meminta revisi atau menolak."></textarea></label><div class="mt-4 grid gap-2"><Button loading={saving} variant="success" onclick={() => decideProposal('APPROVE')}>Setujui usulan</Button><Button loading={saving} variant="outline" disabled={note.trim().length < 5} onclick={() => decideProposal('REQUEST_REVISION')}>Minta revisi</Button><Button loading={saving} variant="danger" disabled={note.trim().length < 5} onclick={() => decideProposal('REJECT')}>Tolak usulan</Button></div>
				{:else if movement.status === 'BERJALAN' && movement.approvedReportCount > 0}<p class="mt-3 text-sm text-ink-600">Gerakan memiliki laporan yang sudah disetujui dan dapat diselesaikan.</p><Button class="mt-4" fullWidth loading={saving} onclick={finish}>Tandai selesai</Button>
				{:else}<p class="mt-3 text-sm text-ink-600">Gerakan ini tidak sedang menunggu keputusan.</p>{/if}
			</Card>
			<Button class="mt-4" href="/verifikator/gerakan" variant="secondary" fullWidth>Kembali ke daftar</Button>
		</aside>
	</div>
{:else if !loading}
	<EmptyState title="Gerakan tidak ditemukan" message={error || 'Data Gerakan tidak tersedia.'} />
{/if}
