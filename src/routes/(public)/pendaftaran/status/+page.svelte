<script>
	import { goto } from '$app/navigation';
	import { Card, ProofPreview, RegistrationForm, StatusBadge, WhatsappLink } from '$lib/components';
	import { REGISTRATION_STATUS_META, RegistrationStatus } from '$lib/domain/constants/registration.js';
	import { registration } from '$lib/stores/registration.svelte.js';
	import { session } from '$lib/stores/session.svelte.js';

	let initialized = false;
	let notice = $state('');

	$effect(() => {
		if (initialized) return;
		initialized = true;
		void load();
	});

	async function load() {
		await session.hydrate();
		if (!session.isAuthenticated) {
			await goto('/masuk?next=/pendaftaran/status', { replaceState: true });
			return;
		}
		await registration.loadMine();
	}

	async function resubmit(formData) {
		notice = '';
		try {
			await registration.resubmit(formData);
			notice = 'Klarifikasi berhasil dikirim dan kembali masuk antrean Verifikator.';
		} catch {
			// Pesan rinci sudah tersedia pada store.
		}
	}

	function logout() {
		session.logout();
		void goto('/masuk');
	}
</script>

<svelte:head><title>Status registrasi · PFfriends</title></svelte:head>

<section class="mx-auto max-w-3xl px-4 py-12 sm:px-6">
	<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
		<div>
			<p class="kicker">Portal pendaftar</p>
			<h1 class="display-editorial mt-2 text-4xl text-heading">Status registrasi</h1>
		</div>
		<button class="min-h-10 rounded-control border border-ink-200 px-4 text-sm font-semibold text-ink-700" onclick={logout}>Keluar</button>
	</div>

	{#if registration.loading}
		<Card class="mt-8"><p class="text-sm text-ink-600">Memuat status registrasi…</p></Card>
	{:else if registration.error}
		<Card class="mt-8"><p class="text-sm text-red-700">{registration.error}</p></Card>
	{:else if registration.current}
		{@const item = registration.current}
		{@const meta = REGISTRATION_STATUS_META[item.status] ?? REGISTRATION_STATUS_META.PENDING}
		<Card class="mt-8" padding="lg">
			<div class="flex flex-wrap items-start justify-between gap-4">
				<div>
					<p class="text-sm text-ink-500">Diajukan oleh</p>
					<h2 class="mt-1 text-xl font-bold text-heading">{item.fullName}</h2>
					<p class="mt-1 text-sm text-ink-600">{item.community} · {item.programPillar} · {item.batch}</p>
				</div>
				<StatusBadge label={meta.label} color={meta.color} />
			</div>

			{#if item.reviewNote}
				<div class="mt-6 rounded-control border border-amber-200 bg-amber-50 p-4">
					<p class="text-xs font-bold tracking-wide text-amber-800 uppercase">Catatan Verifikator</p>
					<p class="mt-2 text-sm leading-relaxed text-amber-900">{item.reviewNote}</p>
				</div>
			{/if}

			<div class="mt-6 grid gap-4 text-sm sm:grid-cols-2">
				<div><span class="block text-ink-500">Email</span><strong>{item.email}</strong></div>
				<div><span class="block text-ink-500">WhatsApp</span><strong class="mr-2">{item.whatsapp}</strong><WhatsappLink number={item.whatsapp} compact /></div>
				<div><span class="block text-ink-500">Wilayah</span><strong>{item.region}</strong></div>
				<div><span class="block text-ink-500">Revisi</span><strong>{item.revisionCount || 0} kali</strong></div>
			</div>

			<div class="mt-6">
				<p class="text-sm font-bold text-heading">Bukti Awardee</p>
				<ProofPreview files={registration.proofs} />
			</div>

			{#if item.status === RegistrationStatus.APPROVED}
				<div class="mt-6 rounded-control bg-green-50 p-4 text-sm text-green-900">
					Akun telah disetujui. Keluar lalu masuk kembali untuk membuka dasbor Awardee.
				</div>
			{:else if item.status === RegistrationStatus.REJECTED}
				<div class="mt-6 rounded-control bg-red-50 p-4 text-sm text-red-900">
					Registrasi ditolak dan tidak dapat diubah. Verifikator dapat membuka kembali aplikasi jika diperlukan.
				</div>
			{/if}
		</Card>

		{#if item.status === RegistrationStatus.CLARIFICATION}
			<Card class="mt-6" padding="lg">
				<h2 class="text-xl font-bold text-heading">Perbaiki data dan bukti</h2>
				<p class="mt-2 text-sm text-ink-600">Email tidak dapat diganti. Unggah bukti baru hanya jika bukti sebelumnya perlu diganti.</p>
				{#if notice}<p class="mt-4 rounded-control bg-green-50 p-3 text-sm text-green-800">{notice}</p>{/if}
				{#if registration.error}<p class="mt-4 rounded-control bg-red-50 p-3 text-sm text-red-800">{registration.error}</p>{/if}
				<div class="mt-6">
					<RegistrationForm initial={item} create={false} busy={registration.working} submit={resubmit} />
				</div>
			</Card>
		{/if}
	{:else}
		<Card class="mt-8"><p class="text-sm text-ink-600">Tidak ada registrasi yang terhubung dengan akun ini.</p></Card>
	{/if}
</section>
