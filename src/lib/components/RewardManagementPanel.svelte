<script>
	import { onMount } from 'svelte';
	import { REWARD_CATEGORY_META } from '$lib/domain/constants/community.js';
	import { TIER_TABLE } from '$lib/domain/constants/tier-table.js';
	import { deleteStaffReward, saveStaffReward, staffRewards } from '$lib/infrastructure/pocketbase/achievements.js';
	import { toast, ToastType } from '$lib/stores/toast.svelte.js';
	import Button from './Button.svelte'; import Card from './Card.svelte'; import EmptyState from './EmptyState.svelte'; import Modal from './Modal.svelte'; import PointsChip from './PointsChip.svelte'; import StatusBadge from './StatusBadge.svelte';

	const empty = () => ({ name: '', category: 'MERCHANDISE', description: '', priceCoins: 1, minTierLevel: 'NEWCOMER', status: 'TERSEDIA', monthlyQuota: 0, requiresApproval: false, community: '', fulfillmentNote: '', image: '' });
	let rows = $state.raw([]); let loading = $state(true); let saving = $state(false); let editingId = $state(''); let form = $state(empty());
	const open = $derived(editingId !== '' || form.name !== '');

	async function load() { loading = true; try { rows = (await staffRewards()).rewards || []; } catch (error) { toast.error('Katalog gagal dimuat', error instanceof Error ? error.message : undefined); } finally { loading = false; } }
	onMount(load);
	function create() { editingId = 'NEW'; form = empty(); }
	function edit(row) { editingId = row.id; form = { ...empty(), ...row, monthlyQuota: row.monthlyQuota || 0 }; }
	function close() { if (!saving) { editingId = ''; form = empty(); } }
	async function submit() { saving = true; try { await saveStaffReward($state.snapshot(form), editingId === 'NEW' ? '' : editingId); toast.push({ type: ToastType.SUCCESS, title: 'Hadiah tersimpan' }); close(); await load(); } catch (error) { toast.error('Hadiah gagal disimpan', error instanceof Error ? error.message : undefined); } finally { saving = false; } }
	async function remove(row) { if (!confirm(`Hapus atau nonaktifkan hadiah “${row.name}”?`)) return; try { const result = await deleteStaffReward(row.id); toast.push({ type: ToastType.SUCCESS, title: result.archived ? 'Hadiah dinonaktifkan' : 'Hadiah dihapus', message: result.archived ? 'Riwayat pesanan dipertahankan.' : undefined }); await load(); } catch (error) { toast.error('Hadiah gagal dihapus', error instanceof Error ? error.message : undefined); } }
</script>

<Card class="mb-6" variant="flush" padding="none">
	<div class="flex flex-wrap items-start justify-between gap-3 p-4"><div><h2 class="text-base font-bold text-heading">Kelola hadiah tukar</h2><p class="mt-1 text-sm text-ink-600">Admin dan Verifikator dapat mengelola katalog yang dilihat Awardee.</p></div><Button size="sm" onclick={create}>Tambah hadiah</Button></div>
	{#if !loading && rows.length === 0}<div class="p-4"><EmptyState title="Katalog hadiah kosong" message="Tambahkan hadiah pertama untuk Awardee." /></div>
	{:else}<div class="overflow-x-auto"><table class="w-full min-w-[760px] text-left text-sm"><thead class="bg-ink-50"><tr><th class="px-4 py-3">Hadiah</th><th class="px-4 py-3">Kategori</th><th class="px-4 py-3">Harga</th><th class="px-4 py-3">Tier</th><th class="px-4 py-3">Status</th><th class="px-4 py-3 text-right">Aksi</th></tr></thead><tbody>
		{#each rows as row (row.id)}<tr class="border-t border-ink-100"><td class="px-4 py-3"><p class="font-semibold text-heading">{row.name}</p><p class="line-clamp-1 text-xs text-ink-500">{row.description}</p></td><td class="px-4 py-3">{REWARD_CATEGORY_META[row.category]?.label || row.category}</td><td class="px-4 py-3"><PointsChip points={row.priceCoins} currency="KT" size="sm" /></td><td class="px-4 py-3">{TIER_TABLE.find((tier) => tier.level === row.minTierLevel)?.label}</td><td class="px-4 py-3"><StatusBadge label={row.status} color={row.status === 'TERSEDIA' ? 'green' : 'slate'} size="sm" /></td><td class="px-4 py-3"><div class="flex justify-end gap-2"><Button size="sm" variant="secondary" onclick={() => edit(row)}>Ubah</Button><Button size="sm" variant="ghost" onclick={() => remove(row)}>Hapus</Button></div></td></tr>{/each}
	</tbody></table></div>{/if}
</Card>

<Modal open={open} title={editingId === 'NEW' ? 'Tambah hadiah' : 'Ubah hadiah'} size="lg" onclose={close}>
	<div class="grid gap-4 sm:grid-cols-2">
		<label class="sm:col-span-2 text-sm font-semibold text-heading">Nama hadiah<input bind:value={form.name} class="mt-1 w-full rounded-control border border-ink-200 p-3 font-normal" /></label>
		<label class="text-sm font-semibold text-heading">Kategori<select bind:value={form.category} class="mt-1 w-full rounded-control border border-ink-200 p-3 font-normal">{#each Object.values(REWARD_CATEGORY_META) as item}<option value={item.code}>{item.label}</option>{/each}</select></label>
		<label class="text-sm font-semibold text-heading">Harga KT<input type="number" min="1" bind:value={form.priceCoins} class="mt-1 w-full rounded-control border border-ink-200 p-3 font-normal" /></label>
		<label class="text-sm font-semibold text-heading">Tier minimum<select bind:value={form.minTierLevel} class="mt-1 w-full rounded-control border border-ink-200 p-3 font-normal">{#each TIER_TABLE as tier}<option value={tier.level}>{tier.label}</option>{/each}</select></label>
		<label class="text-sm font-semibold text-heading">Status<select bind:value={form.status} class="mt-1 w-full rounded-control border border-ink-200 p-3 font-normal"><option value="TERSEDIA">Tersedia</option><option value="HABIS">Habis</option><option value="SEGERA">Segera</option></select></label>
		<label class="text-sm font-semibold text-heading">Kuota bulanan<input type="number" min="0" bind:value={form.monthlyQuota} class="mt-1 w-full rounded-control border border-ink-200 p-3 font-normal" /><span class="mt-1 block text-xs font-normal text-ink-500">0 berarti tanpa batas.</span></label>
		<label class="text-sm font-semibold text-heading">Komunitas<select bind:value={form.community} class="mt-1 w-full rounded-control border border-ink-200 p-3 font-normal"><option value="">Semua komunitas</option><option value="SOBI">Sobat Bumi</option><option value="WOMENPRENEUR">Womenpreneur</option></select></label>
		<label class="sm:col-span-2 text-sm font-semibold text-heading">Deskripsi<textarea rows="3" bind:value={form.description} class="mt-1 w-full rounded-control border border-ink-200 p-3 font-normal"></textarea></label>
		<label class="sm:col-span-2 text-sm font-semibold text-heading">Catatan pemenuhan<textarea rows="2" bind:value={form.fulfillmentNote} class="mt-1 w-full rounded-control border border-ink-200 p-3 font-normal"></textarea></label>
		<label class="sm:col-span-2 flex items-center gap-2 text-sm font-semibold text-heading"><input type="checkbox" bind:checked={form.requiresApproval} /> Perlu persetujuan Verifikator</label>
	</div>
	{#snippet footer()}<Button variant="ghost" onclick={close}>Batal</Button><Button loading={saving} disabled={form.name.trim().length < 3 || form.priceCoins < 1} onclick={submit}>Simpan hadiah</Button>{/snippet}
</Modal>
