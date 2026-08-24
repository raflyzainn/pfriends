<script>
	import { onMount } from 'svelte';
	import { AdminGamificationNav, Button, Card, EmptyState, Modal, PageHeader, PointActionManagementPanel, StatTile } from '$lib/components';
	import TierDistributionChart from '$lib/charts/TierDistributionChart.svelte';
	import { adminGamificationRules, applyTierThresholds, previewTierThresholds } from '$lib/infrastructure/pocketbase/gamification-rules.js';
	import { toast } from '$lib/stores/toast.svelte.js';
	import { formatAngka } from '$lib/utils/format.js';

	let data = $state(null);
	let preview = $state(null);
	let thresholds = $state({});
	let loading = $state(true);
	let previewing = $state(false);
	let saving = $state(false);
	let confirming = $state(false);

	const tiers = $derived(data?.tiers ?? []);
	const proposedDistribution = $derived(tiers.map((tier) => ({ ...tier, count: preview?.impact?.after?.[tier.level] ?? 0 })));
	const currentDistribution = $derived(tiers.map((tier) => ({ ...tier, count: data?.impact?.before?.[tier.level] ?? 0 })));
	const changed = $derived(tiers.some((tier) => Number(thresholds[tier.level]) !== tier.threshold));
	const valid = $derived(tiers.every((tier, index) => Number.isInteger(Number(thresholds[tier.level])) && Number(thresholds[tier.level]) >= 0 && (index === 0 ? Number(thresholds[tier.level]) === 0 : Number(thresholds[tier.level]) > Number(thresholds[tiers[index - 1].level]))));

	async function load() {
		loading = true;
		try {
			data = await adminGamificationRules();
			thresholds = { ...data.thresholds };
			preview = null;
		} catch (error) { toast.error('Aturan gagal dimuat', error.message); }
		finally { loading = false; }
	}

	function resetCanonical() {
		thresholds = Object.fromEntries(tiers.map((tier) => [tier.level, tier.canonicalThreshold]));
		preview = null;
	}

	async function calculatePreview() {
		if (!valid) return;
		previewing = true;
		try { preview = await previewTierThresholds(thresholds); confirming = true; }
		catch (error) { toast.error('Pratinjau gagal', error.message); }
		finally { previewing = false; }
	}

	async function applyChanges() {
		saving = true;
		try {
			data = await applyTierThresholds(thresholds, data.version);
			thresholds = { ...data.thresholds };
			preview = null;
			confirming = false;
			toast.success('Ambang tier diterapkan', 'Tier seluruh Awardee dan bonus terkait sudah diselaraskan.');
			await load();
		} catch (error) { toast.error('Perubahan gagal diterapkan', error.message); }
		finally { saving = false; }
	}

	onMount(load);
</script>

<PageHeader title="Aturan & Simulasi" description="Kelola katalog aksi poin dan ambang tier berbasis PocketBase, lalu tinjau dampaknya sebelum diterapkan." />
<AdminGamificationNav />

{#if loading}
	<Card><p class="text-sm text-ink-600">Memuat aturan gamifikasi...</p></Card>
{:else if !data}
	<EmptyState title="Aturan belum tersedia" message="PocketBase belum mengembalikan konfigurasi gamifikasi." />
{:else}
	<div class="grid gap-4 md:grid-cols-3">
		<StatTile label="Profil dihitung" value={formatAngka(data.impact.totalProfiles)} helper="Semua profil gamifikasi" />
		<StatTile label="Tier tersedia" value={formatAngka(tiers.length)} helper="Ambang berurutan" />
		<StatTile label="Estimasi contoh bulanan" value={`${formatAngka(data.sample.total)} PK`} helper="Berdasarkan katalog aksi aktif" />
	</div>

	<section class="mt-6"><PointActionManagementPanel /></section>

	<div class="mt-6 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
		<Card>
			<div class="flex flex-wrap items-start justify-between gap-3">
				<div><h2 class="text-lg font-bold text-heading">Ambang tier</h2><p class="mt-1 text-sm text-ink-600">Perubahan berlaku langsung untuk seluruh Awardee setelah konfirmasi.</p></div>
				<Button variant="secondary" size="sm" onclick={resetCanonical}>Kembalikan kanonik</Button>
			</div>
			<div class="mt-5 space-y-3">
				{#each tiers as tier, index (tier.level)}
					<label class="grid gap-2 rounded-control border border-ink-200 p-3 sm:grid-cols-[1fr_9rem] sm:items-center">
						<span><span class="block font-semibold text-heading">{tier.label}</span><span class="text-xs text-ink-500">Kanonik {formatAngka(tier.canonicalThreshold)} PK</span></span>
						<input type="number" min={index === 0 ? 0 : Number(thresholds[tiers[index - 1].level]) + 1} disabled={index === 0} class="w-full rounded-control border border-ink-200 px-3 py-2 text-right" bind:value={thresholds[tier.level]} oninput={() => preview = null} />
					</label>
				{/each}
			</div>
			{#if !valid}<p class="mt-3 text-sm text-danger">Ambang wajib berupa bilangan bulat, dimulai dari 0, dan meningkat pada setiap tier.</p>{/if}
			<div class="mt-5 flex justify-end"><Button disabled={!changed || !valid} loading={previewing} onclick={calculatePreview}>Tinjau dampak</Button></div>
		</Card>

		<Card><h2 class="text-lg font-bold text-heading">Sebaran tier saat ini</h2><p class="mt-1 text-sm text-ink-600">Dihitung dari total poin aktif di PocketBase.</p><div class="mt-4"><TierDistributionChart data={currentDistribution} /></div></Card>
	</div>

	<Card class="mt-6">
		<h2 class="text-lg font-bold text-heading">Audit perubahan tier</h2>
		{#if data.audits.length === 0}<p class="mt-3 text-sm text-ink-500">Belum ada perubahan ambang tier.</p>{:else}
			<div class="mt-4 space-y-3">{#each data.audits as audit (audit.id)}<article class="rounded-control border border-ink-200 p-3"><p class="text-sm font-semibold text-heading">{audit.actorName || 'Admin'} mengubah ambang</p><p class="mt-1 text-xs text-ink-500">{new Date(audit.occurredAt).toLocaleString('id-ID')} · {formatAngka(audit.impact?.moved ?? 0)} profil berpindah tier</p></article>{/each}</div>
		{/if}
	</Card>
{/if}

<Modal open={confirming} title="Konfirmasi perubahan ambang tier" size="xl" onclose={() => confirming = false}>
	{#if preview}
		<p class="text-sm text-ink-600">Perubahan ini memindahkan <strong>{formatAngka(preview.impact.moved)}</strong> dari {formatAngka(preview.impact.totalProfiles)} profil. Saldo poin tidak dihitung ulang.</p>
		<div class="mt-5 grid gap-5 lg:grid-cols-2">
			<div><h3 class="font-semibold text-heading">Sebaran setelah diterapkan</h3><TierDistributionChart data={proposedDistribution} height="230px" /></div>
			<div><h3 class="font-semibold text-heading">Contoh aktivitas bulanan</h3><div class="mt-3 space-y-2">{#each preview.sample.rows as row (row.code)}<div class="flex justify-between gap-3 text-sm"><span>{row.label} × {row.occurrences}</span><strong>{formatAngka(row.subtotal)} PK</strong></div>{/each}</div><p class="mt-4 border-t border-ink-200 pt-3 text-sm">Total <strong>{formatAngka(preview.sample.total)} PK</strong>, masuk tier <strong>{preview.sample.tier}</strong>.</p></div>
		</div>
		{#if Object.keys(preview.impact.transitions).length > 0}<div class="mt-5"><h3 class="font-semibold text-heading">Perpindahan profil</h3><ul class="mt-2 flex flex-wrap gap-2">{#each Object.entries(preview.impact.transitions) as [transition, count]}<li class="rounded-chip bg-ink-100 px-3 py-1 text-xs">{transition}: {count}</li>{/each}</ul></div>{/if}
		<div class="mt-6 flex justify-end gap-2"><Button variant="secondary" disabled={saving} onclick={() => confirming = false}>Batal</Button><Button loading={saving} onclick={applyChanges}>Terapkan sekarang</Button></div>
	{/if}
</Modal>
