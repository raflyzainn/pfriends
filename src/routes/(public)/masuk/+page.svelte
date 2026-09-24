<script>
	/**
	 * MASUK: gerbang peragaan: satu klik pada kartu akun, tanpa mengetik apa pun.
	 *
	 * Ini MOCKUP. Autentikasinya tiruan, kata sandinya satu untuk seluruh akun, dan
	 * mengetiknya di depan ruang rapat hanya menambah langkah yang tidak menjelaskan
	 * apa pun tentang produk. Karena itu kartu akun langsung memanggil
	 * `session.login()` dengan `SANDI_DEMO` di balik layar.
	 *
	 * LIMA KEPUTUSAN YANG TIDAK TERBACA DARI KODE:
	 *
	 * 1. **Sandi diimpor dari `seed/accounts.js`, tidak ditulis ulang di sini.**
	 *    Menyalin nilainya ke komponen akan membuat seluruh kartu gagal diam-diam
	 *    begitu sandi seed diubah di satu sisi saja. Nilainya tidak pernah sampai ke
	 *    layar; ia hanya lewat sebagai argumen.
	 *
	 * 2. **Alur sesinya tetap alur yang sama.** `session.login()` memanggil
	 *    `bootstrapDatabase()` lebih dulu, memvalidasi kredensial lewat `AuthService`,
	 *    menyimpan potret sesi, lalu `session.nextAfterLogin()` yang memutuskan
	 *    tujuannya: bukan `homePath` yang ditebak di berkas ini. Yang dipangkas
	 *    hanyalah dua kolom isian, bukan penjagaannya.
	 *
	 * 3. **Daftar akun dirakit dari repository, bukan dari daftar tulis tangan.**
	 *    `accountRepository.demoAccounts()` hanya mengembalikan empat baris (satu
	 *    awardee sorotan, dua verifikator, satu admin), sementara peragaan menuntut
	 *    lima awardee dari komunitas dan chapter berbeda. Karena itu awardee-nya
	 *    diambil dari `awardeeRepository.getActive()`: awardee AKTIF dijamin punya
	 *    akun berstatus aktif, sehingga tidak ada kartu yang ditolak saat diklik.
	 *
	 * 4. **Pengguna yang sudah masuk tidak dipantulkan diam-diam.** Panelnya
	 *    tersurat: siapa yang sedang masuk, satu tombol melanjutkan, satu tombol
	 *    keluar. Tanpa itu peraga yang sudah masuk sebagai Awardee terkurung dan
	 *    satu-satunya jalan ke peran lain adalah menghapus data situs lewat DevTools.
	 *
	 * 5. **Formulir manual tetap ada, tetapi dilipat.** Ia dibutuhkan untuk
	 *    menunjukkan pesan galat kredensial dan tetap menjadi jalan masuk bagi akun
	 *    yang tidak dipajang sebagai kartu: hanya saja bukan lagi jalur utama.
	 */
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Icon, ICONS } from '$lib/components';
	import { UserRole } from '$lib/domain/constants/roles.js';
	import {
		accountRepository,
		awardeeRepository
	} from '$lib/infrastructure/repositories/index.js';
	import { SANDI_DEMO } from '$lib/infrastructure/seed/accounts.js';
	import { catalog } from '$lib/stores/catalog.svelte.js';
	import { session } from '$lib/stores/session.svelte.js';

	const DEMO_LOGIN = true;

	/** Banyaknya kartu awardee yang dipajang: enam, agar grid tiga kolom terisi rata. */
	const JUMLAH_AWARDEE = 6;

	/**
	 * @typedef {object} KartuAkun
	 * @property {string} email
	 * @property {string} nama
	 * @property {string} inisial
	 * @property {string} peran      Label peran Bahasa Indonesia.
	 * @property {string} keterangan Komunitas & chapter, atau unit kerja.
	 */

	/** @type {KartuAkun[]} */
	let kartuStaf = $state([]);

	/** @type {KartuAkun[]} */
	let kartuAwardee = $state([]);

	let memuatKartu = $state(true);

	/** Surel kartu yang sedang diproses; `''` berarti tidak ada. */
	let sedangMasuk = $state('');

	/** Pesan galat tunggal; kosong berarti belum ada kegagalan. */
	let galat = $state('');

	/** Formulir manual terbuka. */
	let manualTerbuka = $state(!DEMO_LOGIN);

	let email = $state('');
	let sandi = $state('');

	/** Penanda agar efek penyiapan tidak berjalan dua kali. */
	let sudahMenyiapkan = false;

	/** Jalur yang ingin dibuka pengguna sebelum ia diminta masuk. */
	const tujuanDiminta = $derived(page.url?.searchParams?.get('next') ?? '');

	/** Tujuan yang aman bagi peran yang sedang aktif: dipakai panel "sesi aktif". */
	const tujuanAman = $derived(session.nextAfterLogin(tujuanDiminta));

	const adaKartu = $derived(kartuStaf.length > 0 || kartuAwardee.length > 0);

	$effect(() => {
		if (sudahMenyiapkan) return;
		sudahMenyiapkan = true;
		void siapkanHalaman();
	});

	/**
	 * Memulihkan sesi, lalu merakit kartu akun peragaan.
	 *
	 * `session.hydrate()` WAJIB dipanggil di sini: zona publik tidak memasang
	 * `ZoneGuard`, sehingga tanpa pemanggilan ini `session.ready` tetap `false`
	 * selamanya bagi pengunjung yang punya sesi tersimpan.
	 *
	 * @returns {Promise<void>}
	 */
	async function siapkanHalaman() {
		try {
			await catalog.load();
			await session.hydrate();
			if (!DEMO_LOGIN) {
				kartuStaf = [];
				kartuAwardee = [];
				return;
			}

			const [admin, verifikator, awardee] = await Promise.all([
				accountRepository.byRole(UserRole.ADMIN),
				accountRepository.byRole(UserRole.VERIFIER),
				awardeeRepository.getActive()
			]);

			kartuStaf = [...admin, ...verifikator].map((akun) => ({
				email: akun.email,
				nama: akun.displayName,
				inisial: akun.initials,
				peran: akun.roleLabel,
				keterangan: akun.unit
			}));

			// Poin tertinggi lebih dulu, seri diputus oleh id: deterministik supaya
			// naskah peragaan dan tangkapan layar tidak basi tiap kali data dibangun.
			const terpilih = [...awardee]
				.sort((a, b) => b.points - a.points || a.id.localeCompare(b.id))
				.slice(0, JUMLAH_AWARDEE);

			const akunAwardee = await Promise.all(
				terpilih.map((orang) => accountRepository.byAwardeeId(orang.id))
			);

			kartuAwardee = terpilih
				.map((orang, index) => {
					const akun = akunAwardee[index];
					if (!akun) return null;
					return {
						email: akun.email,
						nama: orang.fullName,
						inisial: orang.initials,
						peran: akun.roleLabel,
						keterangan: `${orang.communityDef.akronim} · Chapter ${orang.chapterId}`
					};
				})
				.filter((kartu) => kartu !== null);
		} catch {
			// Daftar kartu adalah pelengkap; kegagalannya tidak boleh menghalangi
			// seseorang yang hafal kredensialnya untuk masuk lewat formulir manual.
			kartuStaf = [];
			kartuAwardee = [];
			manualTerbuka = true;
		} finally {
			memuatKartu = false;
		}
	}

	/**
	 * Masuk sebagai pemilik sebuah surel, memakai kata sandi peragaan bersama.
	 * @param {string} surel
	 * @returns {Promise<void>}
	 */
	async function masukSebagai(surel) {
		if (sedangMasuk !== '') return;

		sedangMasuk = surel;
		galat = '';
		try {
			const hasil = await session.login(surel, SANDI_DEMO);
			if (!hasil.success) {
				galat = hasil.error;
				return;
			}
			await goto(session.nextAfterLogin(tujuanDiminta));
		} finally {
			sedangMasuk = '';
		}
	}

	/**
	 * Mengirim kredensial yang diketik sendiri lewat formulir manual.
	 * @param {SubmitEvent} peristiwa
	 * @returns {Promise<void>}
	 */
	async function kirimManual(peristiwa) {
		peristiwa.preventDefault();
		if (email.trim() === '' || sandi === '' || sedangMasuk !== '') return;

		sedangMasuk = email.trim();
		galat = '';
		try {
			const hasil = await session.login(email, sandi);
			if (!hasil.success) {
				galat = hasil.error;
				sandi = '';
				return;
			}
			await goto(session.nextAfterLogin(tujuanDiminta));
		} finally {
			sedangMasuk = '';
		}
	}

	/**
	 * Mengakhiri sesi tanpa meninggalkan halaman ini: daftar kartu langsung
	 * menggantikan panel, siap menerima akun peran berikutnya.
	 * @returns {void}
	 */
	function keluarDariSesi() {
		session.logout();
		email = '';
		sandi = '';
		galat = '';
	}

	/** Kelas bersama kedua kolom isian; ditulis sekali agar keduanya tidak menyimpang. */
	const KELAS_ISIAN =
		'block h-11 w-full rounded-control border border-ink-450 bg-surface px-3 text-[15px] text-ink-800 outline-none transition-colors placeholder:text-ink-500 focus:border-brand-600 focus:ring-2 focus:ring-brand-300/40';
</script>

<svelte:head>
	<title>Masuk: PFriends</title>
	<meta name="description" content="Masuk ke portal komunitas PFriends Pertamina Foundation." />
</svelte:head>

<div class="mx-auto w-full max-w-5xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
	<header class="text-center">
		<p class="kicker">Ruang anggota</p>
		<h1 class="display-editorial mt-4 text-[clamp(28px,4vw,42px)] leading-[1.08] text-heading">
			{DEMO_LOGIN ? 'Pilih akun untuk masuk' : 'Masuk ke PFriends'}
		</h1>
		<p class="mx-auto mt-5 max-w-[58ch] text-[16px] leading-[1.65] text-ink-700">
			{DEMO_LOGIN
				? 'Mode demo lokal aktif. Pilih kartu akun atau gunakan email dan kata sandi.'
				: 'Awardee dapat masuk setelah mengirim registrasi. Akun yang belum disetujui hanya membuka portal status.'}
		</p>
	</header>

	{#if !session.ready}
		<p class="mt-10 text-center text-[15px] text-ink-600" aria-busy="true">Memeriksa sesi…</p>
	{:else if session.isAuthenticated}
		<!-- Panel "sesi aktif": pengganti pantulan senyap. Lihat keputusan 4. -->
		<div class="mx-auto mt-10 max-w-2xl rounded-card border border-ink-200 bg-surface p-6 sm:p-8">
			<p class="kicker">Sesi aktif</p>
			<h2 class="display-editorial mt-3 text-[24px] text-heading">
				Anda sudah masuk sebagai {session.displayName}
			</h2>
			<p class="mt-4 text-[15px] leading-[1.65] text-ink-700">
				Peran yang sedang aktif adalah
				<span class="font-semibold text-ink-900">{session.roleLabel}</span>. Untuk menelusuri alur
				peran lain, akhiri sesi ini lebih dulu lalu pilih kartu akun yang berbeda.
			</p>

			<div class="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
				<a
					href={tujuanAman}
					class="inline-flex min-h-11 items-center rounded-control bg-brand-600 px-5 text-[15px] font-semibold text-white transition-colors hover:bg-brand-700"
				>
					Lanjut ke ruang {session.roleLabel}
				</a>
				<button
					type="button"
					data-logout
					class="inline-flex min-h-11 items-center gap-2 rounded-control border border-ink-200 px-5 text-[15px] font-semibold text-ink-700 transition-colors hover:border-ink-300 hover:bg-ink-50 hover:text-heading"
					onclick={keluarDariSesi}
				>
					<Icon path={ICONS.logout} size={18} />
					Keluar dari sesi ini
				</button>
			</div>
		</div>
	{:else if memuatKartu}
		<p class="mt-10 text-center text-[15px] text-ink-600" aria-busy="true">
			Menyiapkan akun peragaan…
		</p>
	{:else}
		{#if adaKartu}
		<!-- ── Pengelola & verifikator ─────────────────────────────────────── -->
		<section class="mt-12" aria-labelledby="staf-judul">
			<h2 id="staf-judul" class="kicker">Pengelola program</h2>
			<ul class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
				{#each kartuStaf as akun (akun.email)}
					<li>
						<!-- `data-akun` adalah kait bagi gerbang peramban (scripts/verify/e2e-routes.mjs).
						     Sejak masuk dilakukan dengan mengklik kartu, tidak ada lagi kolom surel
						     yang dapat diisi skrip; tanpa kait ini gerbang hanya bisa menebak kartu
						     lewat urutan DOM, dan urutan itu berubah setiap seed disusun ulang. -->
						<button
							type="button"
							data-akun={akun.email}
							class="flex h-full w-full flex-col items-start gap-3 rounded-card border border-ink-200 bg-surface p-5 text-left transition-colors hover:border-brand-300 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60"
							disabled={sedangMasuk !== ''}
							onclick={() => masukSebagai(akun.email)}
						>
							<span
								class="inline-flex h-11 w-11 items-center justify-center rounded-full bg-brand-600 text-[14px] font-bold text-white"
								aria-hidden="true"
							>
								{akun.inisial}
							</span>
							<span class="min-w-0">
								<span class="block text-[15px] font-bold text-heading">{akun.nama}</span>
								<span class="mt-1 block text-[12px] font-semibold tracking-[0.04em] text-brand-700 uppercase">
									{akun.peran}
								</span>
								<span class="mt-2 block text-[13px] leading-[1.5] text-ink-600">
									{akun.keterangan}
								</span>
							</span>
							{#if sedangMasuk === akun.email}
								<span class="text-[13px] font-semibold text-brand-700">Memasukkan…</span>
							{/if}
						</button>
					</li>
				{/each}
			</ul>
		</section>

		<!-- ── Awardee ──────────────────────────────────────────────────────── -->
		<section class="mt-12" aria-labelledby="awardee-judul">
			<h2 id="awardee-judul" class="kicker">Anggota komunitas</h2>
			<ul class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each kartuAwardee as akun (akun.email)}
					<li>
						<button
							type="button"
							data-akun={akun.email}
							class="flex h-full w-full items-center gap-4 rounded-card border border-ink-200 bg-surface p-4 text-left transition-colors hover:border-brand-300 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60"
							disabled={sedangMasuk !== ''}
							onclick={() => masukSebagai(akun.email)}
						>
							<span
								class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[14px] font-bold text-brand-700"
								aria-hidden="true"
							>
								{akun.inisial}
							</span>
							<span class="min-w-0 flex-1">
								<span class="block truncate text-[15px] font-bold text-heading">{akun.nama}</span>
								<span class="mt-0.5 block text-[13px] text-ink-600">{akun.keterangan}</span>
								{#if sedangMasuk === akun.email}
									<span class="mt-1 block text-[12px] font-semibold text-brand-700">
										Memasukkan…
									</span>
								{:else}
									<span class="mt-0.5 block text-[12px] tracking-[0.04em] text-ink-500 uppercase">
										{akun.peran}
									</span>
								{/if}
							</span>
						</button>
					</li>
				{/each}
			</ul>
		</section>

		<!-- ── Masuk manual ─────────────────────────────────────────────────── -->
		{/if}
		<div class="mt-14 border-t border-ink-200 pt-6 text-center">
			{#if manualTerbuka}
				<form class="mx-auto max-w-sm text-left" onsubmit={kirimManual} novalidate>
					<label for="masuk-email" class="block text-sm font-semibold text-ink-800">
						Alamat surel
					</label>
					<input
						id="masuk-email"
						type="email"
						name="email"
						autocomplete="username"
						inputmode="email"
						bind:value={email}
						disabled={sedangMasuk !== ''}
						placeholder="nama@pertaminafoundation.org"
						class="mt-2 {KELAS_ISIAN}"
					/>

					<label for="masuk-sandi" class="mt-5 block text-sm font-semibold text-ink-800">
						Kata sandi
					</label>
					<input
						id="masuk-sandi"
						type="password"
						name="password"
						autocomplete="current-password"
						bind:value={sandi}
						disabled={sedangMasuk !== ''}
						class="mt-2 {KELAS_ISIAN}"
					/>

					{#if galat}
						<p
							class="mt-4 rounded-control border-l-4 border-danger bg-danger-tint px-4 py-3 text-sm leading-relaxed text-ink-800"
							role="alert"
						>
							{galat}
						</p>
					{/if}

					<button
						type="submit"
						disabled={email.trim() === '' || sandi === '' || sedangMasuk !== ''}
						class="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-control bg-brand-600 px-6 text-[15px] font-semibold text-white transition-colors hover:bg-brand-700 disabled:bg-ink-200 disabled:text-ink-500"
					>
						Masuk
					</button>

					<button
						type="button"
						class="mt-4 w-full text-[13px] text-ink-600 underline underline-offset-4 hover:text-heading"
						onclick={() => (manualTerbuka = false)}
					>
						Tutup formulir manual
					</button>
				</form>
			{:else}
				{#if galat}
					<p
						class="mx-auto mb-4 max-w-sm rounded-control border-l-4 border-danger bg-danger-tint px-4 py-3 text-left text-sm leading-relaxed text-ink-800"
						role="alert"
					>
						{galat}
					</p>
				{/if}
				<button
					type="button"
					class="text-[13px] text-ink-600 underline underline-offset-4 hover:text-heading"
					onclick={() => (manualTerbuka = true)}
				>
					Masuk manual dengan surel dan kata sandi
				</button>
			{/if}
		</div>
	{/if}

	<div class="mx-auto mt-10 max-w-xl rounded-card border border-ink-200 bg-surface p-6 text-center">
		<h2 class="text-lg font-bold text-heading">Belum punya akun Awardee?</h2>
		<p class="mt-2 text-sm leading-relaxed text-ink-600">Daftarkan data diri dan bukti keanggotaan untuk diperiksa Verifikator.</p>
		<a href="/daftar" class="mt-5 inline-flex min-h-11 items-center rounded-control bg-brand-600 px-6 text-sm font-bold text-white">Daftar sebagai Awardee</a>
	</div>

	<div class="mx-auto mt-6 max-w-xl rounded-control bg-ink-50 p-4 text-center text-sm text-ink-600">
		<strong class="text-heading">Login Verifikator dan Admin</strong>
		<p class="mt-1">SSO OAuth sedang dipersiapkan. Akun password staf hanya tersedia ketika mode demo lokal diaktifkan.</p>
		<!-- TODO(SSO): ganti pesan ini dengan tombol authWithOAuth2 setelah provider dan pemetaan claim disepakati. -->
	</div>
</div>
