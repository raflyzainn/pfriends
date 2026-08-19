<script>
	import { Card, EmptyState, PageHeader, ProofPreview, StatusBadge, WhatsappLink } from '$lib/components';
	import { REGISTRATION_STATUS_META } from '$lib/domain/constants/registration.js';
	import { registration } from '$lib/stores/registration.svelte.js';

	let initialized = false;
	let selected = $state(null);
	let files = $state([]);
	$effect(() => {
		if (initialized) return;
		initialized = true;
		void registration.loadQueue();
	});

	async function showProofs(item) {
		selected = item;
		files = await registration.files(item);
	}
</script>

<svelte:head><title>Pemantauan registrasi · Admin</title></svelte:head>

<PageHeader eyebrow="Konsol Corporate Secretary" title="Pemantauan registrasi" subtitle="Tampilan read-only untuk memantau antrean dan hasil verifikasi keanggotaan. Keputusan hanya tersedia bagi Verifikator." />

{#if registration.loading}
	<p class="mt-8 text-sm text-ink-600">Memuat registrasi…</p>
{:else if registration.error}
	<Card class="mt-6"><p class="text-sm text-red-700">{registration.error}</p></Card>
{:else if registration.items.length === 0}
	<div class="mt-6"><EmptyState title="Belum ada registrasi" message="Registrasi Awardee akan muncul di sini setelah formulir pertama dikirim." /></div>
{:else}
	<div class="mt-6 overflow-x-auto rounded-card border border-ink-200 bg-white">
		<table class="w-full min-w-[760px] text-left text-sm">
			<thead class="bg-ink-50 text-xs tracking-wide text-ink-600 uppercase"><tr><th class="px-4 py-3">Pendaftar</th><th class="px-4 py-3">Asal</th><th class="px-4 py-3">Status</th><th class="px-4 py-3">Verifikator</th><th class="px-4 py-3">Catatan</th><th class="px-4 py-3">Bukti</th></tr></thead>
			<tbody class="divide-y divide-ink-100">
				{#each registration.items as item (item.id)}
					{@const meta = REGISTRATION_STATUS_META[item.status]}
					<tr><td class="px-4 py-4"><strong class="block text-heading">{item.fullName}</strong><span class="block text-xs text-ink-500">{item.email}</span><span class="mt-1 flex items-center gap-2 text-xs text-ink-500">{item.whatsapp}<WhatsappLink number={item.whatsapp} compact /></span></td><td class="px-4 py-4">{item.community}<span class="block text-xs text-ink-500">{item.programPillar} · {item.batch}</span></td><td class="px-4 py-4"><StatusBadge label={meta?.label ?? item.status} color={meta?.color ?? 'slate'} size="sm" /></td><td class="px-4 py-4">{item.reviewerName || '—'}</td><td class="max-w-xs px-4 py-4 text-ink-600">{item.reviewNote || '—'}</td><td class="px-4 py-4"><button class="rounded-control border border-brand-200 px-3 py-2 text-xs font-semibold text-brand-700" onclick={() => showProofs(item)}>Tampilkan</button></td></tr>
				{/each}
			</tbody>
		</table>
	</div>
	{#if selected}
		<Card class="mt-6" padding="lg">
			<div class="flex items-center justify-between gap-4">
				<div><p class="text-sm text-ink-500">Bukti protected</p><h2 class="text-xl font-bold text-heading">{selected.fullName}</h2></div>
				<button class="rounded-control border border-ink-200 px-3 py-2 text-sm" onclick={() => { selected = null; files = []; }}>Tutup</button>
			</div>
			<ProofPreview {files} />
		</Card>
	{/if}
{/if}
