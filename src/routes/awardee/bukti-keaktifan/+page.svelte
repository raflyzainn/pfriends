<script>
	import { PageHeader, Button, Card, StatusBadge, EmptyState, ICONS } from '$lib/components';
	import { SCORING_TABLE } from '$lib/domain/constants/scoring-table.js';
	import { activitySubmissions, SUBMISSION_STATUS_META, SubmissionStatus } from '$lib/stores/activity-submissions.svelte.js';
	import { toast, ToastType } from '$lib/stores/toast.svelte.js';

	const TYPES = SCORING_TABLE.filter((rule) => rule.needsEvidence);
	let activityType = $state(TYPES[0]?.type ?? 'SHARE_PUBLIC');
	let activityDate = $state(new Date().toISOString().slice(0, 10));
	let title = $state(''); let description = $state(''); let externalUrl = $state('');
	let files = $state.raw([]); let editingId = $state(''); let formError = $state('');
	const selectedRule = $derived(TYPES.find((rule) => rule.type === activityType));

	function chooseFiles(event) { files = [...(event.currentTarget.files || [])]; }
	function edit(item) {
		editingId = item.id; activityType = item.activityType; activityDate = String(item.activityDate).slice(0, 10);
		title = item.title; description = item.description; externalUrl = item.externalUrl || ''; files = [];
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}
	function reset() { editingId = ''; title = ''; description = ''; externalUrl = ''; files = []; formError = ''; }
	async function send(event) {
		event.preventDefault(); formError = '';
		if (!editingId && files.length === 0) { formError = 'Pilih minimal satu file bukti.'; return; }
		if (files.length > 5 || files.some((file) => file.size > 5 * 1024 * 1024)) { formError = 'Maksimum 5 file dan 5 MB per file.'; return; }
		try {
			await activitySubmissions.submit({ activityType, activityDate: `${activityDate} 12:00:00.000Z`, title, description, externalUrl, files }, editingId);
			toast.push({ type: ToastType.SUCCESS, title: editingId ? 'Perbaikan dikirim' : 'Bukti keaktifan dikirim', message: 'Verifikator akan meninjau pengajuanmu.' }); reset();
		} catch { formError = activitySubmissions.error; }
	}
</script>

<svelte:head><title>Bukti Keaktifan · Awardee PFfriends</title></svelte:head>
<PageHeader eyebrow="Kontribusi" title="Bukti Keaktifan" description="Kirim dokumentasi aktivitasmu untuk ditinjau Verifikator dan memperoleh poin kontribusi." />

<div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
	<Card>
		<h2 class="text-lg font-semibold text-heading">{editingId ? 'Perbaiki pengajuan' : 'Unggah bukti baru'}</h2>
		<form class="mt-5 grid gap-4" onsubmit={send}>
			<label class="grid gap-1.5 text-sm font-medium text-ink-700">Jenis aktivitas
				<select bind:value={activityType} disabled={Boolean(editingId)} class="rounded-xl border border-ink-200 bg-white px-3 py-2.5">
					{#each TYPES as rule}<option value={rule.type}>{rule.label} · {rule.points} poin</option>{/each}
				</select>
			</label>
			<label class="grid gap-1.5 text-sm font-medium text-ink-700">Tanggal aktivitas<input bind:value={activityDate} type="date" required max={new Date().toISOString().slice(0, 10)} class="rounded-xl border border-ink-200 px-3 py-2.5" /></label>
			<label class="grid gap-1.5 text-sm font-medium text-ink-700">Judul<input bind:value={title} required minlength="3" maxlength="160" class="rounded-xl border border-ink-200 px-3 py-2.5" placeholder="Contoh: Menjadi mentor kelas UMKM" /></label>
			<label class="grid gap-1.5 text-sm font-medium text-ink-700">Keterangan<textarea bind:value={description} required minlength="20" maxlength="3000" rows="5" class="rounded-xl border border-ink-200 px-3 py-2.5" placeholder="Jelaskan kegiatan, peranmu, dan hasilnya."></textarea></label>
			<label class="grid gap-1.5 text-sm font-medium text-ink-700">Tautan pendukung (opsional)<input bind:value={externalUrl} type="url" class="rounded-xl border border-ink-200 px-3 py-2.5" placeholder="https://..." /></label>
			<label class="grid gap-1.5 text-sm font-medium text-ink-700">Lampiran JPG, PNG, WebP, atau PDF
				<input onchange={chooseFiles} type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" class="rounded-xl border border-dashed border-ink-300 p-3 text-sm" />
				<span class="text-xs font-normal text-ink-500">Maksimum 5 file, masing-masing 5 MB.{editingId ? ' Kosongkan bila lampiran lama tetap digunakan.' : ''}</span>
			</label>
			{#if formError}<p class="rounded-lg bg-danger-tint p-3 text-sm text-danger">{formError}</p>{/if}
			<div class="flex flex-wrap gap-2"><Button type="submit" loading={activitySubmissions.working} iconPath={ICONS.upload}>{editingId ? 'Kirim ulang' : `Kirim untuk diverifikasi · ${selectedRule?.points ?? 0} poin`}</Button>{#if editingId}<Button variant="secondary" onclick={reset}>Batal</Button>{/if}</div>
		</form>
	</Card>

	<section>
		<h2 class="mb-3 text-lg font-semibold text-heading">Riwayat pengajuan</h2>
		{#if activitySubmissions.items.length === 0}<EmptyState title="Belum ada bukti" message="Pengajuan pertamamu akan tampil di sini." />{:else}
			<div class="grid gap-3">{#each activitySubmissions.items as item}
				<Card>
					<div class="flex items-start justify-between gap-3"><div><p class="text-xs text-ink-500">{String(item.activityDate).slice(0,10)}</p><h3 class="mt-1 font-semibold text-heading">{item.title}</h3><p class="mt-1 text-sm text-ink-600">{TYPES.find((rule) => rule.type === item.activityType)?.label}</p></div><StatusBadge label={SUBMISSION_STATUS_META[item.status]?.label} color={SUBMISSION_STATUS_META[item.status]?.color} withDot /></div>
					{#if item.reviewNote}<p class="mt-3 rounded-lg bg-ink-50 p-3 text-sm text-ink-700"><strong>Catatan Verifikator:</strong> {item.reviewNote}</p>{/if}
					{#if item.status === SubmissionStatus.APPROVED}<p class="mt-3 text-sm font-semibold text-success">+{item.awardedPoints} poin dibukukan</p>{/if}
					{#if item.status === SubmissionStatus.NEEDS_REVISION}<div class="mt-3"><Button size="sm" variant="outline" onclick={() => edit(item)}>Perbaiki bukti</Button></div>{/if}
				</Card>
			{/each}</div>
		{/if}
	</section>
</div>
