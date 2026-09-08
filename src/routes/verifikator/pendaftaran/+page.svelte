<script>
	import { Card, EmptyState, PageHeader, ProofPreview, StatusBadge, WhatsappLink } from '$lib/components';
	import { REGISTRATION_STATUS_META, RegistrationStatus } from '$lib/domain/constants/registration.js';
	import { registration } from '$lib/stores/registration.svelte.js';
	import { toast } from '$lib/stores/toast.svelte.js';

	let initialized = false;
	let selected = $state(null);
	let files = $state([]);
	let filter = $state(RegistrationStatus.PENDING);
	let note = $state('');
	let decisionError = $state('');

	$effect(() => {
		if (initialized) return;
		initialized = true;
		void registration.loadQueue();
	});

	const shown = $derived(filter ? registration.items.filter((item) => item.status === filter) : registration.items);
	const counts = $derived(Object.fromEntries(Object.values(RegistrationStatus).map((status) => [status, registration.items.filter((item) => item.status === status).length])));

	async function open(item) {
		selected = item;
		note = item.reviewNote ?? '';
		decisionError = '';
		files = await registration.files(item);
	}

	async function decide(decision) {
		if (!selected) return;
		decisionError = '';
		if (decision !== 'APPROVE' && note.trim().length < 5) {
			decisionError = 'Tulis catatan keputusan minimal lima karakter sebelum melanjutkan.';
			return;
		}
		try {
			await registration.decide(selected.id, decision, note);
			toast.success('Keputusan tersimpan', 'Status registrasi dan audit telah diperbarui.');
			selected = registration.items.find((item) => item.id === selected.id) ?? null;
			note = '';
		} catch (error) {
			decisionError = error instanceof Error ? error.message : 'Keputusan gagal disimpan. Coba sekali lagi.';
			toast.error('Keputusan gagal', decisionError);
		}
	}
</script>

<svelte:head><title>Registrasi Awardee · Verifikator</title></svelte:head>

<PageHeader eyebrow="Verifikasi keanggotaan" title="Registrasi Awardee" subtitle="Periksa data diri dan bukti asal program sebelum akun memperoleh akses penuh." />

<div class="mt-6 flex flex-wrap gap-2">
	<button class="rounded-chip px-4 py-2 text-sm font-semibold {filter === '' ? 'bg-brand-600 text-white' : 'bg-white text-ink-700'}" onclick={() => (filter = '')}>Semua ({registration.items.length})</button>
	{#each Object.values(RegistrationStatus) as status}
		<button class="rounded-chip px-4 py-2 text-sm font-semibold {filter === status ? 'bg-brand-600 text-white' : 'bg-white text-ink-700'}" onclick={() => (filter = status)}>
			{REGISTRATION_STATUS_META[status].label} ({counts[status]})
		</button>
	{/each}
</div>

{#if registration.loading}
	<p class="mt-8 text-sm text-ink-600">Memuat antrean…</p>
{:else if registration.error}
	<Card class="mt-6"><p class="text-sm text-red-700">{registration.error}</p></Card>
{:else if shown.length === 0}
	<div class="mt-6"><EmptyState title="Antrean kosong" message="Tidak ada registrasi pada status ini." /></div>
{:else}
	<div class="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.85fr)]">
		<div class="space-y-3">
			{#each shown as item (item.id)}
				{@const meta = REGISTRATION_STATUS_META[item.status]}
				<button class="w-full rounded-card border bg-white p-5 text-left transition {selected?.id === item.id ? 'border-brand-500 ring-2 ring-brand-100' : 'border-ink-200 hover:border-brand-300'}" onclick={() => open(item)}>
					<div class="flex items-start justify-between gap-4">
						<div><h2 class="font-bold text-heading">{item.fullName}</h2><p class="mt-1 text-sm text-ink-600">{item.community} · {item.programPillar} · {item.batch}</p><p class="mt-1 text-xs text-ink-500">{item.region} · {item.email}</p></div>
						<StatusBadge label={meta.label} color={meta.color} size="sm" />
					</div>
				</button>
			{/each}
		</div>

		{#if selected}
			<Card padding="lg">
				<h2 class="text-xl font-bold text-heading">{selected.fullName}</h2>
				<dl class="mt-5 grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
					<div><dt class="text-ink-500">WhatsApp</dt><dd class="mt-1 flex flex-wrap items-center gap-2 font-semibold"><span>{selected.whatsapp}</span><WhatsappLink number={selected.whatsapp} /></dd></div>
					<div><dt class="text-ink-500">Wilayah</dt><dd class="font-semibold">{selected.region}</dd></div>
					<div><dt class="text-ink-500">Program</dt><dd class="font-semibold">{selected.programPillar}</dd></div>
					<div><dt class="text-ink-500">Batch</dt><dd class="font-semibold">{selected.batch}</dd></div>
					{#if selected.community === 'SOBI'}
						<div><dt class="text-ink-500">Kampus</dt><dd class="font-semibold">{selected.university}</dd></div>
						<div><dt class="text-ink-500">Tahun lulus</dt><dd class="font-semibold">{selected.graduationYear}</dd></div>
					{:else}
						<div><dt class="text-ink-500">Usaha</dt><dd class="font-semibold">{selected.businessName}</dd></div>
						<div><dt class="text-ink-500">Sektor/kota</dt><dd class="font-semibold">{selected.businessSector} · {selected.businessCity}</dd></div>
					{/if}
				</dl>

				<div class="mt-6">
					<p class="text-sm font-bold text-heading">Bukti protected</p>
					<ProofPreview {files} />
				</div>

				{#if selected.status === RegistrationStatus.PENDING || selected.status === RegistrationStatus.REJECTED}
					<label class="mt-6 block"><span class="text-sm font-bold text-heading">Catatan keputusan</span><textarea class="mt-2 min-h-24 w-full rounded-control border border-ink-200 p-3 text-sm" bind:value={note} oninput={() => (decisionError = '')} placeholder="Wajib untuk klarifikasi, penolakan, atau buka kembali"></textarea><span class="mt-1.5 block text-xs text-ink-500">Minimal lima karakter untuk klarifikasi, penolakan, dan buka kembali.</span></label>
					<div class="mt-4 flex flex-wrap gap-2">
						{#if selected.status === RegistrationStatus.PENDING}
							<button type="button" class="min-h-10 rounded-control bg-green-700 px-4 text-sm font-bold text-white" disabled={registration.working} onclick={() => decide('APPROVE')}>ACC akun</button>
							<button type="button" class="min-h-10 rounded-control bg-amber-600 px-4 text-sm font-bold text-white" disabled={registration.working} onclick={() => decide('REQUEST_CLARIFICATION')}>Minta klarifikasi</button>
							<button type="button" class="min-h-10 rounded-control bg-red-700 px-4 text-sm font-bold text-white" disabled={registration.working} onclick={() => decide('REJECT')}>Tolak</button>
						{:else}
							<button type="button" class="min-h-10 rounded-control bg-brand-600 px-4 text-sm font-bold text-white" disabled={registration.working} onclick={() => decide('REOPEN')}>Buka kembali</button>
						{/if}
					</div>
					{#if decisionError}<div class="mt-3 rounded-control border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert" aria-live="polite">{decisionError}</div>{/if}
				{:else if selected.reviewNote}
					<div class="mt-6 rounded-control bg-ink-50 p-4 text-sm text-ink-700"><strong>Catatan terakhir:</strong> {selected.reviewNote}</div>
				{/if}
			</Card>
		{:else}
			<Card><p class="text-sm text-ink-600">Pilih registrasi untuk melihat data dan bukti.</p></Card>
		{/if}
	</div>
{/if}
