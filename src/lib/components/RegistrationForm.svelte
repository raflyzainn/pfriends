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
	let currentStep = $state(1);
	const passwordStatus = $derived(passwordChecks(password));
	const STEPS = Object.freeze([
		{ number: 1, label: 'Akun' },
		{ number: 2, label: 'Data diri' },
		{ number: 3, label: 'Data program' },
		{ number: 4, label: 'Bukti & tinjau' }
	]);

	const fieldClass =
		'mt-2 min-h-11 w-full rounded-control border border-ink-200 bg-white px-3 py-2 text-sm text-heading outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:bg-ink-50';
	const PASSWORD_PATTERN = '(?=.*[A-Z])(?=.*[0-9]).{8,}';

	function changedFiles(event) {
		files = [...(event.currentTarget?.files ?? [])];
	}

	function validateStep(step) {
		validationError = '';
		if (step === 1 && create) {
			if (!/^\S+@\S+\.\S+$/.test(email.trim())) validationError = 'Masukkan alamat email yang sah.';
			else if (!isNewPasswordValid(password)) validationError = 'Lengkapi seluruh persyaratan kata sandi.';
			else if (password !== passwordConfirm) validationError = 'Konfirmasi kata sandi belum sama.';
		}
		if (step === 2) {
			if (fullName.trim().length < 3) validationError = 'Nama lengkap minimal tiga karakter.';
			else if (whatsapp.replace(/\D/g, '').length < 10 || whatsapp.replace(/\D/g, '').length > 15) validationError = 'Masukkan nomor WhatsApp yang sah.';
			else if (region.trim().length < 2) validationError = 'Wilayah domisili wajib diisi.';
		}
		if (step === 3) {
			if (community === CommunityType.SOBI) {
				if (university.trim().length < 2) validationError = 'Kampus asal wajib diisi.';
				else if (!Number.isInteger(Number(graduationYear)) || Number(graduationYear) < 1980 || Number(graduationYear) > 2100) validationError = 'Tahun kelulusan tidak sah.';
			} else if (businessName.trim().length < 2 || businessSector.trim().length < 2 || businessCity.trim().length < 2) {
				validationError = 'Lengkapi nama, sektor, dan kota usaha.';
			}
		}
		if (step === 4) {
			if (create && files.length === 0) validationError = 'Unggah minimal satu berkas bukti.';
			else if (files.length > 3) validationError = 'Maksimal tiga berkas bukti.';
			else if (files.some((file) => file.size > 5 * 1024 * 1024)) validationError = 'Ukuran setiap berkas maksimal 5 MB.';
			else if (files.some((file) => !['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type))) validationError = 'Format bukti harus JPG, PNG, WebP, atau PDF.';
			else if (create && !consent) validationError = 'Persetujuan pengolahan data wajib diberikan.';
		}
		return validationError === '';
	}

	function nextStep() {
		if (!validateStep(currentStep)) return;
		currentStep = Math.min(4, currentStep + 1);
	}

	function previousStep() {
		validationError = '';
		currentStep = Math.max(1, currentStep - 1);
	}

	function goToStep(step) {
		validationError = '';
		currentStep = step;
	}

	async function send(event) {
		event.preventDefault();
		const stepsToValidate = create ? [1, 2, 3, 4] : [2, 3, 4];
		for (const step of stepsToValidate) {
			if (validateStep(step)) continue;
			if (create) currentStep = step;
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

<form class="space-y-6" onsubmit={send} novalidate>
	{#if create}
		<div aria-label="Progres registrasi">
			<div class="mb-3 flex items-center justify-between gap-4">
				<p class="text-sm font-bold text-heading">Langkah {currentStep} dari 4</p>
				<p class="text-xs font-medium text-ink-500">{STEPS[currentStep - 1].label}</p>
			</div>
			<div class="flex items-start" aria-hidden="true">
				{#each STEPS as step, index (step.number)}
					<div class="flex min-w-0 {index < STEPS.length - 1 ? 'flex-1' : ''} items-start">
						<div class="flex w-8 shrink-0 flex-col items-center">
							<span class="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold {step.number < currentStep ? 'bg-green-600 text-white' : step.number === currentStep ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-500'}">
								{#if step.number < currentStep}<Icon path={ICONS.check} size={16} />{:else}{step.number}{/if}
							</span>
							<span class="mt-2 hidden whitespace-nowrap text-[11px] font-medium sm:block {step.number === currentStep ? 'text-brand-700' : 'text-ink-500'}">{step.label}</span>
						</div>
						{#if index < STEPS.length - 1}
							<span class="mt-4 h-0.5 flex-1 {step.number < currentStep ? 'bg-green-500' : 'bg-ink-200'}"></span>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{/if}

	{#if create}
		<section class={currentStep === 1 ? '' : 'hidden'} aria-labelledby="step-account-title">
			<p class="kicker">Langkah 1</p>
			<h2 id="step-account-title" class="mt-2 text-xl font-bold text-heading">Buat akses akun</h2>
			<p class="mt-2 text-sm leading-relaxed text-ink-600">Gunakan email aktif dan kata sandi yang mudah Anda ingat.</p>
			<div class="mt-6 grid gap-5 sm:grid-cols-2">
				<label class="block sm:col-span-2">
					<span class="text-sm font-semibold text-ink-800">Email <span class="text-red-600" aria-hidden="true">*</span><span class="sr-only"> (wajib)</span></span>
					<input class={fieldClass} type="email" bind:value={email} required autocomplete="email" />
				</label>
			<div class="block">
				<label for="registration-password" class="text-sm font-semibold text-ink-800">Kata sandi <span class="text-red-600" aria-hidden="true">*</span><span class="sr-only"> (wajib)</span></label>
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
				<label for="registration-password-confirm" class="text-sm font-semibold text-ink-800">Konfirmasi kata sandi <span class="text-red-600" aria-hidden="true">*</span><span class="sr-only"> (wajib)</span></label>
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
			</div>
		</section>
	{/if}

	<section class={create && currentStep !== 2 ? 'hidden' : ''} aria-labelledby={create ? 'step-personal-title' : undefined}>
		{#if create}
			<p class="kicker">Langkah 2</p>
			<h2 id="step-personal-title" class="mt-2 text-xl font-bold text-heading">Lengkapi data diri</h2>
			<p class="mt-2 text-sm leading-relaxed text-ink-600">Informasi ini membantu Verifikator mengenali keanggotaan Anda.</p>
		{/if}
		<div class="mt-6 grid gap-5 sm:grid-cols-2">
			<label class="block sm:col-span-2">
				<span class="text-sm font-semibold text-ink-800">Nama lengkap <span class="text-red-600" aria-hidden="true">*</span><span class="sr-only"> (wajib)</span></span>
				<input class={fieldClass} bind:value={fullName} required minlength="3" autocomplete="name" />
			</label>
			{#if !create}
				<label class="block">
					<span class="text-sm font-semibold text-ink-800">Email</span>
					<input class={fieldClass} type="email" bind:value={email} disabled autocomplete="email" />
				</label>
			{/if}
			<label class="block">
				<span class="text-sm font-semibold text-ink-800">Nomor WhatsApp <span class="text-red-600" aria-hidden="true">*</span><span class="sr-only"> (wajib)</span></span>
				<input class={fieldClass} bind:value={whatsapp} required inputmode="tel" placeholder="08xxxxxxxxxx" />
			</label>
		<label class="block">
			<span class="text-sm font-semibold text-ink-800">Komunitas <span class="text-red-600" aria-hidden="true">*</span><span class="sr-only"> (wajib)</span></span>
			<select class={fieldClass} bind:value={community} required>
				{#each COMMUNITIES as item}
					<option value={item.id}>{item.akronim}: {item.nama}</option>
				{/each}
			</select>
		</label>
		<label class="block">
			<span class="text-sm font-semibold text-ink-800">Program asal <span class="text-red-600" aria-hidden="true">*</span><span class="sr-only"> (wajib)</span></span>
			<select class={fieldClass} bind:value={programPillar} required>
				{#each PROGRAM_PILLARS as item}<option value={item.id}>{item.label}</option>{/each}
			</select>
		</label>
		<label class="block">
			<span class="text-sm font-semibold text-ink-800">Batch / chapter <span class="text-red-600" aria-hidden="true">*</span><span class="sr-only"> (wajib)</span></span>
			<select class={fieldClass} bind:value={batch} required>
				{#each CHAPTERS as item}<option value={item.id}>{item.label}</option>{/each}
			</select>
		</label>
		<label class="block">
			<span class="text-sm font-semibold text-ink-800">Wilayah domisili <span class="text-red-600" aria-hidden="true">*</span><span class="sr-only"> (wajib)</span></span>
			<input class={fieldClass} bind:value={region} required />
		</label>
		</div>
	</section>

	<section class={create && currentStep !== 3 ? 'hidden' : ''} aria-labelledby={create ? 'step-program-title' : undefined}>
		{#if create}
			<p class="kicker">Langkah 3</p>
			<h2 id="step-program-title" class="mt-2 text-xl font-bold text-heading">Ceritakan latar program Anda</h2>
			<p class="mt-2 text-sm leading-relaxed text-ink-600">Pertanyaan menyesuaikan komunitas yang dipilih pada langkah sebelumnya.</p>
		{/if}
	<div class="mt-6 rounded-control border border-ink-200 bg-ink-50 p-4">
		<h3 class="font-bold text-heading">Data khusus {community === CommunityType.SOBI ? 'SOBI' : 'PFpreneur'}</h3>
		<div class="mt-4 grid gap-5 sm:grid-cols-2">
			{#if community === CommunityType.SOBI}
				<label class="block">
					<span class="text-sm font-semibold text-ink-800">Kampus asal <span class="text-red-600" aria-hidden="true">*</span><span class="sr-only"> (wajib)</span></span>
					<input class={fieldClass} bind:value={university} required />
				</label>
				<label class="block">
					<span class="text-sm font-semibold text-ink-800">Tahun kelulusan <span class="text-red-600" aria-hidden="true">*</span><span class="sr-only"> (wajib)</span></span>
					<input class={fieldClass} type="number" min="1980" max="2100" bind:value={graduationYear} required />
				</label>
			{:else}
				<label class="block sm:col-span-2">
					<span class="text-sm font-semibold text-ink-800">Nama usaha <span class="text-red-600" aria-hidden="true">*</span><span class="sr-only"> (wajib)</span></span>
					<input class={fieldClass} bind:value={businessName} required />
				</label>
				<label class="block">
					<span class="text-sm font-semibold text-ink-800">Sektor usaha <span class="text-red-600" aria-hidden="true">*</span><span class="sr-only"> (wajib)</span></span>
					<input class={fieldClass} bind:value={businessSector} required />
				</label>
				<label class="block">
					<span class="text-sm font-semibold text-ink-800">Kota usaha <span class="text-red-600" aria-hidden="true">*</span><span class="sr-only"> (wajib)</span></span>
					<input class={fieldClass} bind:value={businessCity} required />
				</label>
			{/if}
		</div>
	</div>
	</section>

	<section class={create && currentStep !== 4 ? 'hidden' : ''} aria-labelledby={create ? 'step-proof-title' : undefined}>
		{#if create}
			<p class="kicker">Langkah 4</p>
			<h2 id="step-proof-title" class="mt-2 text-xl font-bold text-heading">Bukti dan tinjau data</h2>
			<p class="mt-2 text-sm leading-relaxed text-ink-600">Periksa ringkasan sebelum mengirim registrasi untuk diverifikasi.</p>
			<div class="mt-6 rounded-control border border-ink-200 bg-ink-50 p-4 sm:p-5">
				<div class="flex items-center justify-between gap-4">
					<h3 class="font-bold text-heading">Ringkasan registrasi</h3>
					<button type="button" class="text-xs font-bold text-brand-700 underline underline-offset-4" onclick={() => goToStep(2)}>Ubah data diri</button>
				</div>
				<dl class="mt-4 grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
					<div><dt class="text-ink-500">Email</dt><dd class="mt-1 break-all font-semibold text-heading">{email}</dd></div>
					<div><dt class="text-ink-500">Nama lengkap</dt><dd class="mt-1 font-semibold text-heading">{fullName}</dd></div>
					<div><dt class="text-ink-500">WhatsApp</dt><dd class="mt-1 font-semibold text-heading">{whatsapp}</dd></div>
					<div><dt class="text-ink-500">Komunitas</dt><dd class="mt-1 font-semibold text-heading">{COMMUNITIES.find((item) => item.id === community)?.akronim ?? community}</dd></div>
					<div><dt class="text-ink-500">Program</dt><dd class="mt-1 font-semibold text-heading">{PROGRAM_PILLARS.find((item) => item.id === programPillar)?.label ?? programPillar}</dd></div>
					<div><dt class="text-ink-500">Batch / chapter</dt><dd class="mt-1 font-semibold text-heading">{CHAPTERS.find((item) => item.id === batch)?.label ?? batch}</dd></div>
					<div class="sm:col-span-2"><dt class="text-ink-500">Data program</dt><dd class="mt-1 font-semibold text-heading">{community === CommunityType.SOBI ? `${university}, lulus ${graduationYear}` : `${businessName}, ${businessSector}, ${businessCity}`}</dd></div>
				</dl>
				<button type="button" class="mt-4 text-xs font-bold text-brand-700 underline underline-offset-4" onclick={() => goToStep(3)}>Ubah data program</button>
			</div>
		{/if}

	<label class="mt-6 block">
		<span class="text-sm font-semibold text-ink-800">Bukti sebagai Awardee {#if create}<span class="text-red-600" aria-hidden="true">*</span><span class="sr-only"> (wajib)</span>{/if}</span>
		<input
			class="mt-2 block w-full rounded-control border border-ink-200 bg-white p-3 text-sm"
			type="file"
			accept="image/jpeg,image/png,image/webp,application/pdf"
			multiple
			required={create}
			onchange={changedFiles}
		/>
		<span class="mt-2 block text-xs text-ink-500">1–3 berkas JPG, PNG, WebP, atau PDF. Maksimal 5 MB per berkas.</span>
		{#if files.length > 0}
			<span class="mt-3 block rounded-control bg-green-50 px-3 py-2 text-xs font-medium text-green-700">
				{files.length} berkas dipilih: {files.map((file) => file.name).join(', ')}
			</span>
		{/if}
	</label>

	{#if create}
		<label class="mt-5 flex items-start gap-3 rounded-control border border-ink-200 p-4">
			<input class="mt-1 h-4 w-4" type="checkbox" bind:checked={consent} required />
			<span class="text-sm leading-relaxed text-ink-700">
				{REGISTRATION_CONSENT_STATEMENT} <span class="text-red-600" aria-hidden="true">*</span><span class="sr-only"> (wajib)</span>
			</span>
		</label>
	{/if}
	</section>

	{#if validationError}
		<div class="rounded-control border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{validationError}</div>
	{/if}

	{#if create && currentStep < 4}
		<div class="flex flex-col-reverse gap-3 border-t border-ink-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
			{#if currentStep > 1}
				<button type="button" class="inline-flex min-h-11 items-center justify-center rounded-control border border-ink-300 px-6 text-sm font-bold text-ink-700 transition-colors hover:bg-ink-50" onclick={previousStep}>Kembali</button>
			{:else}<span></span>{/if}
			<button type="button" class="inline-flex min-h-11 items-center justify-center gap-2 rounded-control bg-brand-600 px-6 text-sm font-bold text-white transition-colors hover:bg-brand-700" onclick={nextStep}>Lanjutkan <Icon path={ICONS.arrowLongRight} size={17} /></button>
		</div>
	{:else}
		<div class="flex flex-col-reverse gap-3 border-t border-ink-200 pt-5 sm:flex-row sm:items-center {create ? 'sm:justify-between' : ''}">
			{#if create}<button type="button" class="inline-flex min-h-11 items-center justify-center rounded-control border border-ink-300 px-6 text-sm font-bold text-ink-700 transition-colors hover:bg-ink-50" onclick={previousStep}>Kembali</button>{/if}
	<button type="submit" disabled={busy} class="inline-flex min-h-11 {create ? '' : 'w-full'} items-center justify-center rounded-control bg-brand-600 px-6 text-sm font-bold text-white hover:bg-brand-700 disabled:bg-ink-300">
		{busy ? 'Memproses…' : submitLabel}
	</button>
		</div>
	{/if}
</form>
