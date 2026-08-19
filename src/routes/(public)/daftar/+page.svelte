<script>
	import { goto } from '$app/navigation';
	import { Card, RegistrationForm } from '$lib/components';
	import { registration } from '$lib/stores/registration.svelte.js';
	import { session } from '$lib/stores/session.svelte.js';

	let success = $state(false);
	let error = $state('');

	async function submit(formData) {
		error = '';
		try {
			const email = String(formData.get('email') || '');
			const password = String(formData.get('password') || '');
			await registration.register(formData);
			const login = await session.login(email, password);
			if (login.success) {
				await goto('/pendaftaran/status', { replaceState: true });
				return;
			}
			success = true;
			window.scrollTo({ top: 0, behavior: 'smooth' });
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'Registrasi gagal dikirim.';
		}
	}
</script>

<svelte:head>
	<title>Daftar Awardee · PFfriends</title>
	<meta name="description" content="Registrasi Awardee Sobat Bumi dan PFpreneur di PFfriends." />
</svelte:head>

<section class="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
	<p class="kicker">Keanggotaan PFfriends</p>
	<h1 class="display-editorial mt-3 text-4xl text-heading sm:text-5xl">Registrasi Awardee</h1>
	<p class="mt-4 max-w-2xl text-base leading-relaxed text-ink-600">
		Isi data diri dan lampirkan bukti bahwa Anda merupakan alumni Sobat Bumi atau penerima manfaat PFpreneur. Verifikator akan memeriksa data sebelum akun memperoleh akses penuh.
	</p>

	<Card class="mt-8" padding="lg">
		{#if success}
			<div class="py-8 text-center" data-registration-success>
				<div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-2xl text-green-700">✓</div>
				<h2 class="mt-5 text-2xl font-bold text-heading">Registrasi berhasil dikirim</h2>
				<p class="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-ink-600">
					Masuk dengan email dan kata sandi yang baru dibuat untuk melihat status pemeriksaan. Sebelum disetujui, akun hanya dapat membuka portal status registrasi.
				</p>
				<button class="mt-6 min-h-11 rounded-control bg-brand-600 px-6 text-sm font-bold text-white" onclick={() => goto('/masuk')}>
					Masuk dan lihat status
				</button>
			</div>
		{:else}
			{#if error}
				<div class="mb-5 rounded-control border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}</div>
			{/if}
			<RegistrationForm busy={registration.working} {submit} />
		{/if}
	</Card>

	<p class="mt-6 text-center text-sm text-ink-600">
		Sudah memiliki akun? <a class="font-semibold text-brand-700 underline" href="/masuk">Masuk ke PFfriends</a>
	</p>
</section>
