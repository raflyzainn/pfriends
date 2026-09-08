<script>
	import { untrack } from 'svelte';
	import Icon from './Icon.svelte';
	import { ICONS } from '$lib/data/icons.js';
	import { CHAPTERS, COMMUNITIES, CommunityType } from '$lib/domain/constants/community.js';
	import {
		PASSWORD_REQUIREMENTS,
		isNewPasswordValid,
		passwordChecks
	} from '$lib/domain/constants/password-policy.js';
	import { PROGRAM_PILLARS, REGISTRATION_CONSENT_STATEMENT } from '$lib/domain/constants/registration.js';

	let {
		initial = {},
		create = true,
		busy = false,
		submit,
		submitLabel = create ? 'Kirim registrasi' : 'Kirim ulang klarifikasi'
	} = $props();

	const defaults = untrack(() => initial);
	let fullName = $state(defaults.fullName ?? '');
	let email = $state(defaults.email ?? '');
	let whatsapp = $state(defaults.whatsapp ?? '');
	let password = $state('');
	let passwordConfirm = $state('');
	let showPassword = $state(false);
	let showPasswordConfirm = $state(false);
	let community = $state(defaults.community ?? CommunityType.SOBI);
	let programPillar = $state(defaults.programPillar ?? PROGRAM_PILLARS[0].id);
	let batch = $state(defaults.batch ?? CHAPTERS[0].id);
	let region = $state(defaults.region ?? '');
	let university = $state(defaults.university ?? '');
	let graduationYear = $state(defaults.graduationYear || new Date().getFullYear());
	let businessName = $state(defaults.businessName ?? '');
	let businessSector = $state(defaults.businessSector ?? '');
	let businessCity = $state(defaults.businessCity ?? '');
	let consent = $state(false);
	let files = $state([]);
	let validationError = $state('');
	const passwordStatus = $derived(passwordChecks(password));

	const fieldClass =
		'mt-2 min-h-11 w-full rounded-control border border-ink-200 bg-white px-3 py-2 text-sm text-heading outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:bg-ink-50';
	const PASSWORD_PATTERN = '(?=.*[A-Z])(?=.*[0-9]).{8,}';

	function changedFiles(event) {
		files = [...(event.currentTarget?.files ?? [])];
	}

	async function send(event) {
		event.preventDefault();
		validationError = '';
		if (create && !isNewPasswordValid(password)) {
			validationError = 'Kata sandi harus minimal 8 karakter serta memiliki huruf kapital dan angka.';
			return;
		}
		if (create && password !== passwordConfirm) {
			validationError = 'Konfirmasi kata sandi tidak cocok.';
			return;
		}
		if (create && files.length === 0) {
			validationError = 'Unggah minimal satu berkas bukti.';
			return;
		}
		if (files.length > 3) {
			validationError = 'Maksimal tiga berkas bukti.';
			return;
		}
		if (files.some((file) => file.size > 5 * 1024 * 1024)) {
			validationError = 'Ukuran setiap berkas maksimal 5 MB.';
			return;
		}
		if (create && !consent) {
			validationError = 'Persetujuan pengolahan data wajib diberikan.';
			return;
		}

		const data = new FormData();
		for (const [key, value] of Object.entries({
			fullName,
			email,
			whatsapp,
			password,
			passwordConfirm,
			community,
			programPillar,
			batch,
			region,
			university,
			graduationYear: String(graduationYear),
			businessName,
			businessSector,
			businessCity,
			consent: String(consent)
		})) data.set(key, value);
		for (const file of files) data.append('proofs', file);
		await submit?.(data);
	}
</script>

<form class="space-y-6" onsubmit={send}>
	{#if validationError}
		<div class="rounded-control border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
			{validationError}
		</div>
	{/if}

	<div class="grid gap-5 sm:grid-cols-2">
		<label class="block sm:col-span-2">
			<span class="text-sm font-semibold text-ink-800">Nama lengkap</span>
			<input class={fieldClass} bind:value={fullName} required minlength="3" autocomplete="name" />
		</label>
		<label class="block">
			<span class="text-sm font-semibold text-ink-800">Email</span>
			<input class={fieldClass} type="email" bind:value={email} required disabled={!create} autocomplete="email" />
		</label>
		<label class="block">
			<span class="text-sm font-semibold text-ink-800">Nomor WhatsApp</span>
			<input class={fieldClass} bind:value={whatsapp} required inputmode="tel" placeholder="08xxxxxxxxxx" />
		</label>
		{#if create}
			<div class="block">
				<label for="registration-password" class="text-sm font-semibold text-ink-800">Kata sandi</label>
				<div class="relative">
					<input
						id="registration-password"
						class="{fieldClass} pr-12"
						type={showPassword ? 'text' : 'password'}
						bind:value={password}
						required
						minlength="8"
						pattern={PASSWORD_PATTERN}
						autocomplete="new-password"
						aria-describedby="password-requirements"
					/>
					<button
						type="button"
						class="absolute top-2 right-1 inline-flex h-9 w-10 items-center justify-center rounded-control text-ink-500 transition-colors hover:bg-ink-50 hover:text-heading focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-500"
						aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
						aria-pressed={showPassword}
						onclick={() => (showPassword = !showPassword)}
					>
						<Icon path={ICONS.eye} size={19} />
						{#if showPassword}
							<span class="absolute h-px w-5 rotate-45 bg-current" aria-hidden="true"></span>
						{/if}
					</button>
				</div>
				<ul id="password-requirements" class="mt-3 flex flex-col gap-2" aria-live="polite">
					{#each PASSWORD_REQUIREMENTS as requirement (requirement.id)}
						{@const fulfilled = passwordStatus[requirement.id]}
						<li class="flex items-center gap-2 text-xs font-medium {fulfilled ? 'text-green-700' : 'text-ink-500'}">
							{#if fulfilled}
								<Icon path={ICONS.checkCircle} size={17} />
							{:else}
								<span class="h-[17px] w-[17px] shrink-0 rounded-full border border-ink-300" aria-hidden="true"></span>
							{/if}
							<span>{requirement.label}</span>
						</li>
					{/each}
				</ul>
			</div>
			<div class="block">
				<label for="registration-password-confirm" class="text-sm font-semibold text-ink-800">Konfirmasi kata sandi</label>
				<div class="relative">
					<input
						id="registration-password-confirm"
						class="{fieldClass} pr-12"
						type={showPasswordConfirm ? 'text' : 'password'}
						bind:value={passwordConfirm}
						required
						minlength="8"
						autocomplete="new-password"
						aria-describedby="password-match-status"
					/>
					<button
						type="button"
						class="absolute top-2 right-1 inline-flex h-9 w-10 items-center justify-center rounded-control text-ink-500 transition-colors hover:bg-ink-50 hover:text-heading focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-500"
						aria-label={showPasswordConfirm ? 'Sembunyikan konfirmasi kata sandi' : 'Tampilkan konfirmasi kata sandi'}
						aria-pressed={showPasswordConfirm}
						onclick={() => (showPasswordConfirm = !showPasswordConfirm)}
					>
						<Icon path={ICONS.eye} size={19} />
						{#if showPasswordConfirm}
							<span class="absolute h-px w-5 rotate-45 bg-current" aria-hidden="true"></span>
						{/if}
					</button>
				</div>
				<p
					id="password-match-status"
					class="mt-3 flex items-center gap-2 text-xs font-medium {passwordConfirm === ''
						? 'text-ink-500'
						: password === passwordConfirm
							? 'text-green-700'
							: 'text-red-700'}"
					aria-live="polite"
				>
					{#if passwordConfirm === ''}
						<span class="h-[17px] w-[17px] shrink-0 rounded-full border border-ink-300" aria-hidden="true"></span>
						<span>Konfirmasi password belum diisi</span>
					{:else if password === passwordConfirm}
						<Icon path={ICONS.checkCircle} size={17} />
						<span>Password sama</span>
					{:else}
						<Icon path={ICONS.xCircle} size={17} />
						<span>Password belum sama</span>
					{/if}
				</p>
			</div>
		{/if}
		<label class="block">
			<span class="text-sm font-semibold text-ink-800">Komunitas</span>
			<select class={fieldClass} bind:value={community}>
				{#each COMMUNITIES as item}
					<option value={item.id}>{item.akronim}: {item.nama}</option>
				{/each}
			</select>
		</label>
		<label class="block">
			<span class="text-sm font-semibold text-ink-800">Program asal</span>
			<select class={fieldClass} bind:value={programPillar}>
				{#each PROGRAM_PILLARS as item}<option value={item.id}>{item.label}</option>{/each}
			</select>
		</label>
		<label class="block">
			<span class="text-sm font-semibold text-ink-800">Batch / chapter</span>
			<select class={fieldClass} bind:value={batch}>
				{#each CHAPTERS as item}<option value={item.id}>{item.label}</option>{/each}
			</select>
		</label>
		<label class="block">
			<span class="text-sm font-semibold text-ink-800">Wilayah domisili</span>
			<input class={fieldClass} bind:value={region} required />
		</label>
	</div>

	<div class="rounded-control border border-ink-200 bg-ink-50 p-4">
		<h3 class="font-bold text-heading">Data khusus {community === CommunityType.SOBI ? 'SOBI' : 'PFpreneur'}</h3>
		<div class="mt-4 grid gap-5 sm:grid-cols-2">
			{#if community === CommunityType.SOBI}
				<label class="block">
					<span class="text-sm font-semibold text-ink-800">Kampus asal</span>
					<input class={fieldClass} bind:value={university} required />
				</label>
				<label class="block">
					<span class="text-sm font-semibold text-ink-800">Tahun kelulusan</span>
					<input class={fieldClass} type="number" min="1980" max="2100" bind:value={graduationYear} required />
				</label>
			{:else}
				<label class="block sm:col-span-2">
					<span class="text-sm font-semibold text-ink-800">Nama usaha</span>
					<input class={fieldClass} bind:value={businessName} required />
				</label>
				<label class="block">
					<span class="text-sm font-semibold text-ink-800">Sektor usaha</span>
					<input class={fieldClass} bind:value={businessSector} required />
				</label>
				<label class="block">
					<span class="text-sm font-semibold text-ink-800">Kota usaha</span>
					<input class={fieldClass} bind:value={businessCity} required />
				</label>
			{/if}
		</div>
	</div>

	<label class="block">
		<span class="text-sm font-semibold text-ink-800">Bukti sebagai Awardee</span>
		<input
			class="mt-2 block w-full rounded-control border border-ink-200 bg-white p-3 text-sm"
			type="file"
			accept="image/jpeg,image/png,image/webp,application/pdf"
			multiple
			required={create}
			onchange={changedFiles}
		/>
		<span class="mt-2 block text-xs text-ink-500">1–3 berkas JPG, PNG, WebP, atau PDF. Maksimal 5 MB per berkas.</span>
	</label>

	{#if create}
		<label class="flex items-start gap-3 rounded-control border border-ink-200 p-4">
			<input class="mt-1 h-4 w-4" type="checkbox" bind:checked={consent} required />
			<span class="text-sm leading-relaxed text-ink-700">
				{REGISTRATION_CONSENT_STATEMENT}
			</span>
		</label>
	{/if}

	<button type="submit" disabled={busy} class="inline-flex min-h-11 w-full items-center justify-center rounded-control bg-brand-600 px-6 text-sm font-bold text-white hover:bg-brand-700 disabled:bg-ink-300">
		{busy ? 'Memproses…' : submitLabel}
	</button>
</form>
