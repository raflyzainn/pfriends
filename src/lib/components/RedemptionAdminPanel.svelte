<script>
	let { canManage = true, title = 'Antrean penukaran hadiah' } = $props();
	import { onMount } from 'svelte';
	import { adminRedemptions, transitionRedemption } from '$lib/infrastructure/pocketbase/achievements.js';
	import { REDEMPTION_STATUS_META } from '$lib/infrastructure/repositories/redemption-status.js';
	import { toast, ToastType } from '$lib/stores/toast.svelte.js';
	import { formatAngka, formatTanggal } from '$lib/utils/format.js';
	import { workflowBadges } from '$lib/stores/workflow-badges.svelte.js';
	import Button from './Button.svelte';
	import Card from './Card.svelte';
	import EmptyState from './EmptyState.svelte';
	import Modal from './Modal.svelte';
	import PointsChip from './PointsChip.svelte';
	import StatusBadge from './StatusBadge.svelte';
	import WhatsappLink from './WhatsappLink.svelte';

	const filters = ['SEMUA','DIAJUKAN','DISETUJUI','DIKIRIM','SELESAI','DITOLAK'];
	let filter = $state('SEMUA'); let rows = $state.raw([]); let loading = $state(true);
	let selected = $state.raw(null); let target = $state(''); let note = $state(''); let saving = $state(false);

	async function load() {
		loading = true;
		try { rows = (await adminRedemptions(filter === 'SEMUA' ? '' : filter)).redemptions || []; if (filter === 'SEMUA') workflowBadges.redemptions = rows; }
		catch (error) { toast.error('Antrean gagal dimuat', error instanceof Error ? error.message : undefined); }
		finally { loading = false; }
	}

	onMount(load);

	function open(row, status) { selected = row; target = status; note = ''; }
	function close() { if (!saving) { selected = null; target = ''; note = ''; } }

	async function submit() {
		if (!selected || saving) return;
		saving = true;
		try {
			await transitionRedemption(selected.id, target, note);
			toast.push({ type: ToastType.SUCCESS, title: 'Status penukaran diperbarui', message: `${selected.rewardName} kini berstatus ${REDEMPTION_STATUS_META[target]?.label || target}.` });
			close(); await Promise.all([load(), workflowBadges.loadRedemptions()]);
		} catch (error) { toast.error('Status gagal diperbarui', error instanceof Error ? error.message : undefined); }
		finally { saving = false; }
	}
</script>

<Card class="mb-6" variant="highlight">
	<div class="flex flex-wrap items-start justify-between gap-3">
		<div>
			<h2 class="text-base font-bold text-heading">{title}</h2>
			<p class="mt-1 text-sm text-ink-600">{canManage ? 'Verifikator memproses persetujuan, pengiriman, penyelesaian, dan refund.' : 'Admin memantau penukaran; keputusan dan perubahan status dilakukan Verifikator.'}</p>
		</div>
		<Button variant="secondary" size="sm" loading={loading} onclick={load}>Muat ulang</Button>
	</div>
	<div class="mt-4 flex flex-wrap gap-2" aria-label="Filter status penukaran">
		{#each filters as value}
			<button type="button" class="min-h-10 rounded-full border px-3 text-xs font-semibold {filter === value ? 'border-brand-400 bg-brand-50 text-brand-800' : 'border-ink-200 bg-white text-ink-600'}" onclick={() => { filter = value; load(); }}>
				{value === 'SEMUA' ? 'Semua' : REDEMPTION_STATUS_META[value]?.label}
			</button>
		{/each}
	</div>
</Card>

{#if !loading && rows.length === 0}
	<EmptyState title="Tidak ada penukaran" message="Belum ada pesanan pada status yang dipilih." />
{:else}
	<div class="mb-8 grid gap-3 xl:grid-cols-2">
		{#each rows as row (row.id)}
			<Card padding="md">
				<div class="flex items-start justify-between gap-3">
					<div class="min-w-0"><p class="font-semibold text-heading">{row.rewardName}</p><p class="text-sm text-ink-600">{row.awardeeName} · {formatTanggal(row.requestedAt, 'pendek')}</p></div>
					<StatusBadge label={REDEMPTION_STATUS_META[row.status]?.label || row.status} color={REDEMPTION_STATUS_META[row.status]?.badgeColor || 'slate'} size="sm" withDot />
				</div>
				<div class="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-3">
					<div class="flex items-center gap-2"><PointsChip points={row.coins} currency="KT" size="sm" />{#if row.awardeeWhatsapp}<WhatsappLink number={row.awardeeWhatsapp} compact />{/if}</div>
					{#if canManage}<div class="flex flex-wrap gap-2">
						{#if row.status === 'DIAJUKAN'}<Button size="sm" variant="secondary" onclick={() => open(row, 'DITOLAK')}>Tolak</Button><Button size="sm" onclick={() => open(row, 'DISETUJUI')}>Setujui</Button>
						{:else if row.status === 'DISETUJUI'}<Button size="sm" onclick={() => open(row, 'DIKIRIM')}>Tandai dikirim</Button>
						{:else if row.status === 'DIKIRIM'}<Button size="sm" onclick={() => open(row, 'SELESAI')}>Tandai selesai</Button>{/if}
					</div>{/if}
				</div>
				{#if row.adminNote}<p class="mt-3 text-xs text-ink-600">Catatan admin: {row.adminNote}</p>{/if}
			</Card>
		{/each}
	</div>
{/if}

<Modal open={canManage && selected !== null} title="Perbarui status penukaran" size="sm" onclose={close}>
	{#if selected}<p class="text-sm text-ink-700"><span class="font-semibold">{selected.rewardName}</span> untuk {selected.awardeeName} ({formatAngka(selected.coins)} KT).</p>
		<label class="mt-4 block text-sm font-semibold text-heading" for="redemption-note">Catatan {target === 'DITOLAK' ? '(wajib)' : '(opsional)'}</label>
		<textarea id="redemption-note" bind:value={note} rows="4" class="mt-2 w-full rounded-control border border-ink-200 p-3 text-sm" placeholder={target === 'DITOLAK' ? 'Tuliskan alasan penolakan minimal lima karakter' : 'Catatan untuk Awardee'}></textarea>
	{/if}
	{#snippet footer()}<Button variant="ghost" onclick={close}>Batal</Button><Button loading={saving} disabled={target === 'DITOLAK' && note.trim().length < 5} onclick={submit}>Simpan status</Button>{/snippet}
</Modal>
