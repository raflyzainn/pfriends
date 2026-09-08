<script>
	import { onMount } from 'svelte';
	import { EmptyState, Icon, PageHeader, StatTile, StatusBadge, ICONS } from '$lib/components';
	import { listMovements } from '$lib/infrastructure/pocketbase/movements.js';

	let items = $state.raw([]), loading = $state(true), error = $state('');
	onMount(async () => {
		try { items = await listMovements(); }
		catch (exception) { error = exception instanceof Error ? exception.message : 'Data Gerakan gagal dimuat.'; }
		finally { loading = false; }
	});

	const running = $derived(items.filter((item) => item.status === 'BERJALAN').length);
	const completed = $derived(items.filter((item) => item.status === 'SELESAI').length);
	const reports = $derived(items.reduce((sum, item) => sum + item.approvedReportCount, 0));
	function statusColor(status) {
		if (status === 'BERJALAN') return 'blue';
		if (status === 'SELESAI') return 'green';
		if (status === 'PERLU_REVISI') return 'amber';
		if (status === 'DITOLAK') return 'red';
		return 'slate';
	}
</script>

<svelte:head><title>Pemantauan Gerakan | PFriends</title></svelte:head>

<PageHeader eyebrow="Konsol Corporate Secretary" title="Gerakan" subtitle="Pantau perkembangan gerakan, partisipasi Awardee, dan laporan yang sudah disetujui Verifikator." />

{#if error}<div class="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>{/if}

<div class="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
	<StatTile label="Seluruh gerakan" value={items.length} unit="gerakan" loading={loading} iconPath={ICONS.flag} />
	<StatTile label="Sedang berjalan" value={running} unit="gerakan" loading={loading} iconPath={ICONS.bolt} />
	<StatTile label="Selesai" value={completed} unit="gerakan" loading={loading} iconPath={ICONS.checkCircle} />
	<StatTile label="Laporan disetujui" value={reports} unit="laporan" loading={loading} iconPath={ICONS.document} />
</div>

<section aria-labelledby="daftar-gerakan">
	<div class="mb-3 flex items-end justify-between gap-4">
		<div><p class="label-micro">Pemantauan program</p><h2 id="daftar-gerakan" class="mt-1 text-lg font-bold text-heading">Daftar gerakan</h2></div>
		<p class="hidden max-w-lg text-right text-xs leading-relaxed text-ink-500 sm:block">Keputusan usulan dan laporan tetap menjadi kewenangan Verifikator.</p>
	</div>

	{#if loading}
		<div class="rounded-card bg-surface p-8 text-center text-sm text-ink-500 shadow-card">Memuat data Gerakan...</div>
	{:else if items.length === 0}
		<EmptyState title="Belum ada gerakan" message="Gerakan yang diajukan dan diproses akan tampil di halaman ini." icon={ICONS.flag} />
	{:else}
		<div class="overflow-hidden rounded-card bg-surface shadow-card">
			<div class="hidden overflow-x-auto md:block">
				<table class="w-full text-left text-sm">
					<thead class="bg-canvas text-xs font-semibold text-ink-500"><tr><th class="px-5 py-3">Gerakan</th><th class="px-4 py-3">Status</th><th class="px-4 py-3">Wilayah</th><th class="px-4 py-3 text-right">Peserta</th><th class="px-5 py-3 text-right">Laporan</th></tr></thead>
					<tbody class="divide-y divide-ink-100">{#each items as item (item.id)}<tr class="transition-colors hover:bg-ink-50"><td class="px-5 py-4"><p class="font-semibold text-heading">{item.title}</p><p class="mt-0.5 text-xs text-ink-500">Dipimpin {item.leaderName}</p></td><td class="px-4 py-4"><StatusBadge label={item.status.replaceAll('_',' ')} color={statusColor(item.status)} size="sm" withDot /></td><td class="px-4 py-4 text-ink-600">{item.region || 'Belum ditentukan'}</td><td class="numeric px-4 py-4 text-right font-semibold text-ink-700">{item.participantCount}</td><td class="numeric px-5 py-4 text-right font-semibold text-ink-700">{item.approvedReportCount}</td></tr>{/each}</tbody>
				</table>
			</div>
			<ul class="divide-y divide-ink-100 md:hidden">{#each items as item (item.id)}<li class="p-4"><div class="flex items-start gap-3"><span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700"><Icon path={ICONS.flag} size={18} /></span><div class="min-w-0 flex-1"><div class="flex flex-wrap items-center justify-between gap-2"><p class="font-semibold text-heading">{item.title}</p><StatusBadge label={item.status.replaceAll('_',' ')} color={statusColor(item.status)} size="sm" withDot /></div><p class="mt-1 text-xs text-ink-500">{item.leaderName} · {item.region || 'Wilayah belum ditentukan'}</p><p class="mt-3 text-xs text-ink-600"><span class="font-semibold text-ink-800">{item.participantCount}</span> peserta · <span class="font-semibold text-ink-800">{item.approvedReportCount}</span> laporan disetujui</p></div></div></li>{/each}</ul>
		</div>
	{/if}
</section>
