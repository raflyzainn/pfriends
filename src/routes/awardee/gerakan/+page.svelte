<script>
	import { onMount } from 'svelte';
	import { Button, Card, StatusBadge, EmptyState, Icon, StatTile, Tabs, Modal, ICONS } from '$lib/components';
	import { proposeMovement, joinMovement, submitMovementReport, resubmitMovement, resubmitMovementReport } from '$lib/infrastructure/pocketbase/movements.js';
	import { workflowBadges } from '$lib/stores/workflow-badges.svelte.js';

	const items = $derived(workflowBadges.movements);
	let loading = $state(true);
	let working = $state(false);
	let error = $state('');
	let success = $state('');
	let activeTab = $state('all');
	let proposalOpen = $state(false);
	let editingProposalId = $state('');
	let reportFor = $state(null);
	let proposal = $state({ title: '', category: 'LINGKUNGAN', objective: '', description: '', region: '', startsAt: '', endsAt: '', targetParticipants: 10 });
	const categoryOptions = [
		{ id: 'AKSI_LINGKUNGAN', label: 'Lingkungan' },
		{ id: 'EDUKASI_MASYARAKAT', label: 'Edukasi' },
		{ id: 'PEMBERDAYAAN_EKONOMI', label: 'Ekonomi' }
	];
	const statusMeta = {
		DIUSULKAN: { label: 'Diusulkan', color: 'amber' }, PERLU_REVISI: { label: 'Perlu revisi', color: 'red' },
		BERJALAN: { label: 'Berjalan', color: 'blue' }, SELESAI: { label: 'Selesai', color: 'green' }, DITOLAK: { label: 'Ditolak', color: 'slate' },
		SUBMITTED: { label: 'Sudah dikirim', color: 'amber' }, IN_REVIEW: { label: 'Sedang diperiksa', color: 'blue' }, NEEDS_REVISION: { label: 'Perlu revisi', color: 'red' }, APPROVED: { label: 'Disetujui', color: 'green' }, REJECTED: { label: 'Ditolak', color: 'slate' }
	};
	const joined = $derived(items.filter((item) => item.myParticipant));
	const proposed = $derived(items.filter((item) => item.proposedBy && !item.myParticipant && ['DIUSULKAN', 'PERLU_REVISI', 'DITOLAK'].includes(item.status)));
	const running = $derived(items.filter((item) => item.status === 'BERJALAN'));
	const needingReport = $derived(joined.filter((item) => item.status === 'BERJALAN' && !(item.reports || []).some((report) => report.status === 'SUBMITTED' || report.status === 'IN_REVIEW' || report.status === 'APPROVED')));
	const tabs = $derived([
		{ id: 'all', label: 'Semua Gerakan', count: items.length },
		{ id: 'joined', label: 'Gerakan saya', count: joined.length },
		{ id: 'proposed', label: 'Usulan saya', count: proposed.length },
		{ id: 'environment', label: 'Lingkungan', count: items.filter((item) => item.category === 'AKSI_LINGKUNGAN').length },
		{ id: 'education', label: 'Edukasi', count: items.filter((item) => item.category === 'EDUKASI_MASYARAKAT').length },
		{ id: 'economy', label: 'Ekonomi', count: items.filter((item) => item.category === 'PEMBERDAYAAN_EKONOMI').length }
	]);
	const shown = $derived(activeTab === 'joined' ? joined : activeTab === 'proposed' ? proposed : activeTab === 'environment' ? items.filter((item) => item.category === 'AKSI_LINGKUNGAN') : activeTab === 'education' ? items.filter((item) => item.category === 'EDUKASI_MASYARAKAT') : activeTab === 'economy' ? items.filter((item) => item.category === 'PEMBERDAYAAN_EKONOMI') : items);
	function date(value) { return String(value || '').slice(0, 10); }
	function categoryLabel(value) { return categoryOptions.find((item) => item.id === value)?.label || value; }
	async function load() { loading = true; error = ''; try { await workflowBadges.loadMovements(); } catch (exception) { error = exception.message; } finally { loading = false; } }
	function resetProposal() { editingProposalId = ''; proposal = { title: '', category: 'LINGKUNGAN', objective: '', description: '', region: '', startsAt: '', endsAt: '', targetParticipants: 10 }; }
	function openNewProposal() { resetProposal(); proposalOpen = true; }
	function openProposalRevision(movement) { const category = movement.category === 'AKSI_LINGKUNGAN' ? 'LINGKUNGAN' : movement.category === 'EDUKASI_MASYARAKAT' ? 'EDUKASI' : 'EKONOMI'; editingProposalId = movement.id; proposal = { title: movement.title, category, objective: movement.objective, description: movement.description, region: movement.region, startsAt: String(movement.startsAt).slice(0, 16), endsAt: String(movement.endsAt).slice(0, 16), targetParticipants: movement.targetParticipants }; proposalOpen = true; }
	async function propose() { working = true; error = ''; try { const body = { ...proposal, targetParticipants: Number(proposal.targetParticipants), startsAt: new Date(proposal.startsAt).toISOString(), endsAt: new Date(proposal.endsAt).toISOString() }; if (editingProposalId) await resubmitMovement(editingProposalId, body); else await proposeMovement(body); proposalOpen = false; success = editingProposalId ? 'Perbaikan usulan Gerakan berhasil dikirim.' : 'Usulan Gerakan berhasil dikirim kepada Verifikator.'; resetProposal(); await load(); } catch (exception) { error = exception.message; } finally { working = false; } }
	async function join(id) { working = true; error = ''; try { await joinMovement(id); success = 'Anda sudah terdaftar sebagai peserta Gerakan.'; await load(); } catch (exception) { error = exception.message; } finally { working = false; } }
	async function report(event) { working = true; error = ''; try { const data = new FormData(event.currentTarget); if (reportFor.report) await resubmitMovementReport(reportFor.report.id, data); else await submitMovementReport(reportFor.movement.id, data); reportFor = null; success = 'Laporan aksi berhasil dikirim kepada Verifikator.'; await load(); } catch (exception) { error = exception.message; } finally { working = false; } }
	onMount(load);
</script>

<svelte:head><title>Gerakan · Awardee PFriends</title></svelte:head>

<div class="mb-5">
	<p class="label-micro">Pilar 03 · Aksi Bersama</p>
	<h1 class="mt-1 font-sans text-2xl font-bold tracking-[-0.02em] text-heading md:text-[28px]">Gerakan</h1>
	<p class="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-600">Tempat Awardee mengubah gagasan menjadi aksi lapangan. Bergabunglah pada Gerakan yang berjalan atau ajukan aksi baru untuk ditinjau Verifikator.</p>
</div>

<section class="rounded-card border border-brand-200 bg-brand-50 px-5 py-5 sm:px-6" aria-labelledby="movement-action-title">
	<div class="flex flex-wrap items-center justify-between gap-4">
		<div class="min-w-0 flex-1"><h2 id="movement-action-title" class="flex items-center gap-2 text-base font-bold text-heading"><Icon path={ICONS.flag} size={18} class="text-brand-700" />{needingReport.length > 0 ? `${needingReport.length} Gerakan menunggu laporan aksimu` : 'Punya gagasan aksi untuk komunitas?'}</h2><p class="mt-1.5 max-w-xl text-[13px] leading-relaxed text-ink-700">{needingReport.length > 0 ? 'Kirim hasil dan bukti lapangan agar Verifikator dapat mencatat dampak Gerakan.' : 'Tentukan tujuan, wilayah, waktu, dan target peserta. Verifikator akan menilai kesesuaian ESG sebelum Gerakan dibuka.'}</p></div>
		<div class="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row"><Button size="lg" iconPath={ICONS.plus} onclick={openNewProposal}>Ajukan Gerakan Baru</Button>{#if needingReport.length > 0}<Button size="lg" variant="secondary" onclick={() => activeTab = 'joined'}>Lihat Gerakan saya</Button>{/if}</div>
	</div>
</section>

<div class="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
	<StatTile label="Gerakan tersedia" value={items.length} hint="Seluruh Gerakan yang dapat kamu lihat" iconPath={ICONS.flag} color="var(--color-pertamina-navy)" />
	<StatTile label="Sedang berjalan" value={running.length} hint="Terbuka untuk aksi dan partisipasi" iconPath={ICONS.bolt} color="var(--color-esg-e-ink)" />
	<StatTile label="Gerakan saya" value={joined.length} hint="Sebagai pemimpin atau peserta" iconPath={ICONS.users} color="var(--color-pertamina-blue)" />
	<StatTile label="Usulan saya" value={proposed.length} hint="Menunggu atau sudah diputuskan" iconPath={ICONS.clock} color="var(--color-warning)" />
</div>

{#if error}<p class="mb-5 rounded-control border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>{/if}
{#if success}<p class="mb-5 rounded-control border border-green-200 bg-green-50 p-3 text-sm text-green-800">{success}</p>{/if}

<div class="mt-6"><Tabs {tabs} bind:active={activeTab} /></div>

{#if loading}
	<p class="mt-6 text-sm text-ink-600">Memuat Gerakan...</p>
{:else if shown.length === 0}
	<div class="mt-6"><EmptyState title="Gerakan belum tersedia" message="Belum ada Gerakan pada kategori ini." /></div>
{:else}
	<div class="mt-6 space-y-4">
		{#each shown as movement}
			<Card>
				<div class="flex items-start justify-between gap-3"><div><p class="text-xs font-semibold text-ink-500">{categoryLabel(movement.category)}</p><h2 class="mt-1 font-semibold text-heading">{movement.title}</h2></div><StatusBadge label={statusMeta[movement.status]?.label || movement.status} color={statusMeta[movement.status]?.color || 'slate'} withDot /></div>
				<p class="mt-3 text-sm leading-relaxed text-ink-700">{movement.description}</p>
				<div class="mt-3 flex flex-wrap gap-3 text-xs text-ink-500"><span>{movement.region}</span><span>{movement.participantCount} dari target {movement.targetParticipants} peserta</span><span>{movement.approvedReportCount} laporan disetujui</span></div>
				<p class="mt-2 text-sm text-ink-600">Pemimpin: {movement.leaderName || 'Menunggu persetujuan'}</p>
				{#if movement.reviewNote}<p class="mt-3 rounded-lg bg-ink-50 p-3 text-sm text-ink-700"><strong>Catatan Verifikator:</strong> {movement.reviewNote}</p>{/if}
				<div class="mt-4 flex flex-wrap items-center gap-2">{#if movement.status === 'PERLU_REVISI'}<Button size="sm" onclick={() => openProposalRevision(movement)}>Perbaiki usulan</Button>{/if}{#if movement.status === 'BERJALAN' && !movement.myParticipant}<Button size="sm" onclick={() => join(movement.id)} disabled={working}>Gabung Gerakan</Button>{/if}{#if movement.status === 'BERJALAN' && movement.myParticipant}<Button size="sm" onclick={() => reportFor = { movement, report: null }}>Kirim laporan aksi</Button><StatusBadge label={movement.myParticipant.role === 'LEADER' ? 'Pemimpin' : 'Peserta'} color="navy" />{/if}</div>
				{#if movement.reports?.length}<div class="mt-4 border-t border-ink-100 pt-4"><h3 class="text-sm font-semibold text-heading">Riwayat laporan saya</h3><div class="mt-3 grid gap-2">{#each movement.reports as report}<div class="flex items-center justify-between gap-3 rounded-lg bg-ink-50 p-3"><div><p class="text-sm font-medium text-heading">Aksi {date(report.activityDate)}</p><p class="text-xs text-ink-500">{report.location}{#if report.awardedPoints} · {report.awardedPoints} poin{/if}</p></div><div class="flex items-center gap-2"><StatusBadge label={statusMeta[report.status]?.label || report.status} color={statusMeta[report.status]?.color || 'slate'} />{#if report.status === 'NEEDS_REVISION'}<Button size="sm" variant="secondary" onclick={() => reportFor = { movement, report }}>Perbaiki</Button>{/if}</div></div>{/each}</div></div>{/if}
			</Card>
		{/each}
	</div>
{/if}

<Modal open={proposalOpen} title={editingProposalId ? 'Perbaiki usulan Gerakan' : 'Ajukan Gerakan'} size="lg" onclose={() => proposalOpen = false}>
	<form class="grid gap-4 md:grid-cols-2" onsubmit={(event) => { event.preventDefault(); propose(); }}>
		<label class="grid gap-1.5 text-sm font-medium text-ink-700 md:col-span-2">Judul<input class="rounded-xl border border-ink-200 px-3 py-2.5" required minlength="10" bind:value={proposal.title}></label>
		<label class="grid gap-1.5 text-sm font-medium text-ink-700">Kategori<select class="rounded-xl border border-ink-200 bg-white px-3 py-2.5" bind:value={proposal.category}><option value="LINGKUNGAN">Lingkungan</option><option value="EDUKASI">Edukasi</option><option value="EKONOMI">Ekonomi</option></select></label>
		<label class="grid gap-1.5 text-sm font-medium text-ink-700">Target peserta<input class="rounded-xl border border-ink-200 px-3 py-2.5" type="number" min="1" bind:value={proposal.targetParticipants}></label>
		<label class="grid gap-1.5 text-sm font-medium text-ink-700 md:col-span-2">Tujuan<input class="rounded-xl border border-ink-200 px-3 py-2.5" required minlength="20" bind:value={proposal.objective}></label>
		<label class="grid gap-1.5 text-sm font-medium text-ink-700 md:col-span-2">Deskripsi<textarea class="rounded-xl border border-ink-200 px-3 py-2.5" rows="5" required minlength="40" bind:value={proposal.description}></textarea></label>
		<label class="grid gap-1.5 text-sm font-medium text-ink-700 md:col-span-2">Wilayah<input class="rounded-xl border border-ink-200 px-3 py-2.5" required bind:value={proposal.region}></label>
		<label class="grid gap-1.5 text-sm font-medium text-ink-700">Mulai<input class="rounded-xl border border-ink-200 px-3 py-2.5" type="datetime-local" required bind:value={proposal.startsAt}></label>
		<label class="grid gap-1.5 text-sm font-medium text-ink-700">Selesai<input class="rounded-xl border border-ink-200 px-3 py-2.5" type="datetime-local" required bind:value={proposal.endsAt}></label>
		<div class="flex flex-wrap gap-2 md:col-span-2"><Button type="submit" loading={working}>{editingProposalId ? 'Kirim perbaikan' : 'Kirim ke Verifikator'}</Button><Button variant="secondary" onclick={() => proposalOpen = false}>Batal</Button></div>
	</form>
</Modal>

<Modal open={Boolean(reportFor)} title="Kirim laporan aksi" size="md" onclose={() => reportFor = null}>
	{#if reportFor}<form class="grid gap-4" onsubmit={(event) => { event.preventDefault(); report(event); }}><p class="text-sm text-ink-600">Gerakan: <strong>{reportFor.movement.title}</strong></p>{#if reportFor.report?.reviewNote}<p class="rounded-lg bg-amber-50 p-3 text-sm text-amber-900"><strong>Catatan Verifikator:</strong> {reportFor.report.reviewNote}</p>{/if}<label class="grid gap-1.5 text-sm font-medium text-ink-700">Tanggal aksi<input class="rounded-xl border border-ink-200 px-3 py-2.5" name="activityDate" type="date" value={date(reportFor.report?.activityDate)} required></label><label class="grid gap-1.5 text-sm font-medium text-ink-700">Lokasi<input class="rounded-xl border border-ink-200 px-3 py-2.5" name="location" value={reportFor.report?.location || ''} required></label><label class="grid gap-1.5 text-sm font-medium text-ink-700">Jumlah peserta<input class="rounded-xl border border-ink-200 px-3 py-2.5" name="participantCount" type="number" min="1" value={reportFor.report?.participantCount || 1} required></label><label class="grid gap-1.5 text-sm font-medium text-ink-700">Hasil aksi<textarea class="rounded-xl border border-ink-200 px-3 py-2.5" name="outcomeNote" rows="5" minlength="40" required>{reportFor.report?.outcomeNote || ''}</textarea></label><label class="grid gap-1.5 text-sm font-medium text-ink-700">Bukti foto atau PDF<input class="rounded-xl border border-dashed border-ink-300 p-3 text-sm" name="evidenceFiles" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" required={!reportFor.report} multiple><span class="text-xs font-normal text-ink-500">{reportFor.report ? 'Kosongkan jika tetap memakai bukti sebelumnya.' : 'Maksimum 5 file, masing masing 5 MB.'}</span></label><div class="flex flex-wrap gap-2"><Button type="submit" loading={working}>{reportFor.report ? 'Kirim perbaikan' : 'Kirim laporan'}</Button><Button variant="secondary" onclick={() => reportFor = null}>Batal</Button></div></form>{/if}
</Modal>
