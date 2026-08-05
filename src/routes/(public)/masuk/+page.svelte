<script>
	/**
	 * MASUK — gerbang editorial: hero foto, formulir surel & kata sandi, panel akun
	 * peragaan.
	 *
	 * Pemilih peran sudah dicabut. Peran tidak lagi dipilih di layar; ia melekat
	 * pada akun, dan satu-satunya jalan berpindah peran adalah keluar lalu masuk
	 * dengan akun lain. Ini bukan kosmetik: selama peran dapat dipilih dari layar,
	 * seluruh matriks kewenangan hanyalah saran.
	 *
	 * ENAM KEPUTUSAN YANG TIDAK TERBACA DARI KODE:
	 *
	 * 1. **Satu pesan galat untuk semua kegagalan kredensial.** "Email atau kata
	 *    sandi tidak cocok" tidak pernah dipecah menjadi "email tidak terdaftar" dan
	 *    "sandi salah". Pesan yang membedakan keduanya mengubah formulir masuk
	 *    menjadi alat pemeriksa keanggotaan: siapa pun dapat menguji surel satu per
	 *    satu dan mengetahui siapa saja penerima manfaat Pertamina Foundation.
	 *    Kalimatnya sendiri hidup di `AUTH_FAILURE_MESSAGE`, bukan di berkas ini.
	 * 2. **Panel kredensial demo membaca `accountRepository.demoAccounts()`.** Surel
	 *    tidak ditulis ulang di komponen ini, dan kata sandinya sama sekali tidak
	 *    pernah lewat sini — panel hanya menerima surel, peran, nama, dan petunjuk.
	 *    Menyalin kredensial ke komponen akan melahirkan sumber kebenaran kedua yang
	 *    diam-diam basi begitu seed diubah di satu sisi saja. Ini satu-satunya berkas
	 *    zona publik yang menyentuh repository, dan ia melakukannya karena §3.2
	 *    butir 2 memerintahkannya secara tersurat.
	 * 3. **Sifat tiruan dinyatakan terbuka.** Peninjau yang mengira sedang melihat
	 *    autentikasi sungguhan akan menilai keamanan prototipe ini dengan tolok ukur
	 *    yang keliru — dan menyimpulkan hal yang salah tentang keduanya.
	 * 4. **Nol komponen gamifikasi di halaman ini.** Lencana jenjang yang dahulu
	 *    muncul pada daftar pemilih anggota sudah dicabut, beserta angka
	 *    kontribusinya: `/masuk` berada di zona publik, dan zona publik tidak
	 *    menampilkan mekanik skor (PO-2). Pemindai kemurnian publik mencari nama
	 *    komponennya sebagai teks, sehingga nama itu pun tidak boleh tertinggal di
	 *    komentar.
	 *
	 * ── DUA KEPUTUSAN BARU PADA GELOMBANG G5 ─────────────────────────────────
	 *
	 * 5. **Halaman ini memakai sistem editorial, bukan kartu formulir polos.**
	 *    Setiap tombol "Gabung Sekarang" dan setiap tautan "Masuk" di zona publik
	 *    bermuara ke sini dan ke `/daftar`. Sampai gelombang ini keduanya adalah
	 *    satu-satunya halaman publik yang belum tersentuh redesign: pengunjung
	 *    berpindah dari halaman bertipografi Fraunces berfoto lebar ke dua layar
	 *    berupa lama — patahan yang terasa persis pada halaman yang paling ingin
	 *    meyakinkan. Yang dipakai: `EditorialHero` pendek, `SectionRule` sebagai
	 *    kepala seksi, `PhotoFigure` untuk foto, dan panel formulir berkeyline
	 *    merah alih-alih kartu beradius.
	 *
	 *    Ritme sengaja RAPAT (`tight`/`snug`, bukan `loose`): ini halaman gerbang.
	 *    Orang datang ke sini untuk mengetik dua kolom dan pergi, bukan untuk
	 *    membaca. Hero memakai `height="short"` dengan alasan yang sama — pada
	 *    ponsel 375 px, hero `tall` akan mendorong kolom surel ke bawah lipatan.
	 *
	 * 6. **Pengguna yang sudah masuk TIDAK lagi dipantulkan diam-diam.** Versi
	 *    sebelumnya memanggil `goto(session.nextAfterLogin(...))` dari dalam efek,
	 *    sehingga siapa pun yang membuka `/masuk` dengan sesi aktif langsung
	 *    dilempar kembali ke berandanya. Digabung dengan zona Awardee yang saat itu
	 *    tidak punya kontrol keluar sama sekali, akibatnya fatal untuk peragaan:
	 *    begitu peraga masuk sebagai Awardee, ia terkurung — satu-satunya jalan ke
	 *    peran lain adalah menghapus data situs lewat DevTools, di depan ruang
	 *    rapat. Penggantinya panel tersurat: siapa yang sedang masuk, satu tombol
	 *    melanjutkan, satu tombol keluar. Keluar dari SINI tidak perlu berpindah
	 *    halaman — kita sudah berada di zona publik, dan formulirnya langsung
	 *    menggantikan panel, siap menerima akun peran berikutnya.
	 *
	 * @see docs/12-BUILD-CONTRACT-V2.md — §2.12 session.login, §3.2 kriteria selesai butir 2
	 * @see docs/07-UX-SITEMAP.md — §4.1 wireframe `/masuk`
	 * @see docs/11-VISUAL-DIRECTION.md — §6 E1 hero, §8.2 SectionRule, §4 perlakuan foto
	 */
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Icon, Skeleton, ICONS } from '$lib/components';
	import { EditorialHero, PhotoFigure, SectionRule } from '$lib/components/editorial';
	import { foto } from '$lib/data/photos.js';
	import { accountRepository } from '$lib/infrastructure/repositories/index.js';
	import { catalog } from '$lib/stores/catalog.svelte.js';
	import { session } from '$lib/stores/session.svelte.js';

	/** @type {string} */
	let email = $state('');

	/** @type {string} */
	let sandi = $state('');

	/** @type {string} Pesan galat tunggal; kosong berarti belum ada kegagalan. */
	let galat = $state('');

	/** @type {boolean} */
	let sedangMasuk = $state(false);

	/** @type {boolean} Kata sandi ditampilkan sebagai teks biasa. */
	let sandiTerlihat = $state(false);

	/**
	 * @type {{email: string, roleLabel: string, displayName: string, hint: string}[]}
	 * Kredensial demo — TANPA kata sandi, dibaca dari repository.
	 */
	let akunDemo = $state([]);

	/** @type {boolean} */
	let memuatAkunDemo = $state(true);

	/** Penanda agar panel bantuan tidak dimuat berulang kali oleh efek yang sama. */
	let sudahMemuatPanel = false;

	/** Jalur yang ingin dibuka pengguna sebelum ia diminta masuk. */
	const tujuanDiminta = $derived(page.url?.searchParams?.get('next') ?? '');

	const bolehKirim = $derived(email.trim() !== '' && sandi !== '' && !sedangMasuk);

	/** Tujuan yang aman bagi peran yang sedang aktif — dipakai panel "sesi aktif". */
	const tujuanAman = $derived(session.nextAfterLogin(tujuanDiminta));

	/**
	 * Props `PhotoFigure` dari satu kunci manifes foto.
	 *
	 * Nilai `width`/`height` WAJIB ikut dioper: `PhotoFigure` menulis galat konsol
	 * di mode dev bila keduanya kosong, dan galat konsol adalah kegagalan bagi
	 * `e2e-routes.mjs` — bukan sekadar catatan.
	 *
	 * @param {string} kunci
	 * @returns {{src:string, alt:string, width:number, height:number, caption:string}}
	 */
	function propsFoto(kunci) {
		const berkas = foto(kunci);
		return {
			src: berkas?.src ?? '',
			alt: berkas?.alt ?? '',
			width: berkas?.w ?? 0,
			height: berkas?.h ?? 0,
			caption: berkas?.caption ?? ''
		};
	}

	// Penyiapan halaman. Dua pekerjaan, satu efek, dan urutannya penting.
	//
	// `session.hydrate()` WAJIB dipanggil di sini. Zona publik tidak memasang
	// `ZoneGuard`, sehingga tidak ada pihak lain yang memulihkan sesi; tanpa
	// pemanggilan ini `session.ready` tetap `false` selamanya bagi pengunjung yang
	// punya sesi tersimpan, dan panel "sesi aktif" di bawah tidak pernah muncul —
	// pengguna yang sudah masuk akan menatap formulir masuk lagi setiap kali ia
	// membuka `/masuk` langsung dari bilah alamat.
	$effect(() => {
		if (sudahMemuatPanel) return;
		sudahMemuatPanel = true;
		void siapkanHalaman();
	});

	/**
	 * Memulihkan sesi, lalu memuat daftar akun demo untuk panel bantuan.
	 * @returns {Promise<void>}
	 */
	async function siapkanHalaman() {
		try {
			// `catalog.load()` memasang data demo; tanpa itu panel bantuan kosong di
			// peramban yang baru pertama kali membuka aplikasi.
			await catalog.load();
			await session.hydrate();
			akunDemo = await accountRepository.demoAccounts();
		} catch {
			// Panel bantuan adalah pelengkap; kegagalannya tidak boleh menghalangi
			// seseorang yang sudah hafal kredensialnya untuk masuk.
			akunDemo = [];
		} finally {
			memuatAkunDemo = false;
		}
	}

	/**
	 * Mengirim kredensial dan mengantar pengguna ke tujuannya.
	 * @param {SubmitEvent} peristiwa
	 * @returns {Promise<void>}
	 */
	async function kirim(peristiwa) {
		peristiwa.preventDefault();
		if (!bolehKirim) return;

		sedangMasuk = true;
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
			sedangMasuk = false;
		}
	}

	/**
	 * Mengakhiri sesi yang sedang berjalan tanpa meninggalkan halaman ini.
	 *
	 * Tidak ada `goto` di sini dengan sengaja: `/masuk` berada di zona publik, jadi
	 * tidak ada penjaga yang perlu dihindari, dan tetap tinggal berarti formulirnya
	 * langsung menggantikan panel — persis yang dibutuhkan peraga yang ingin masuk
	 * kembali sebagai peran lain. Kolom dikosongkan supaya surel peran sebelumnya
	 * tidak tertinggal di layar.
	 *
	 * @returns {void}
	 */
	function keluarDariSesi() {
		session.logout();
		email = '';
		sandi = '';
		galat = '';
	}

	/**
	 * Mengisi kolom surel dari panel bantuan.
	 *
	 * Hanya surel yang diisikan; kata sandi tetap harus diketik. Tombol yang
	 * langsung memasukkan seseorang ke dalam aplikasi akan menghidupkan kembali
	 * pemilih peran dengan nama lain.
	 * @param {string} surel
	 * @returns {void}
	 */
	function pakaiSurel(surel) {
		email = surel;
		galat = '';
	}

	/** Kelas bersama kedua kolom isian; ditulis sekali agar keduanya tidak menyimpang. */
	const KELAS_ISIAN =
		'block h-11 w-full rounded-control border border-ink-200 bg-surface px-3 text-[15px] text-ink-800 transition-colors outline-none placeholder:text-ink-400 focus:border-pertamina-red focus:ring-2 focus:ring-pertamina-red/20 disabled:bg-ink-50';
</script>

<svelte:head>
	<title>Masuk — Pfriends</title>
	<meta name="description" content="Masuk ke portal komunitas Pfriends Pertamina Foundation." />
</svelte:head>

<EditorialHero
	image="chapter-pertemuan"
	imageMobile="hero-komunitas-mobile"
	alt="Sekelompok orang duduk berkumpul di teras kedai kopi sambil berbincang"
	altMobile="Kerumunan peserta berdesakan sambil tersenyum ke arah kamera dalam satu pertemuan komunitas"
	kicker="Ruang anggota"
	title={'Pintu masuk\nruang anggota'}
	standfirst="Satu gerbang untuk tiga peran: anggota yang menulis, verifikator yang meninjau, dan pengelola yang membaca hasilnya."
	height="short"
	caption="Temu komunitas — foto stok"
/>

<div class="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
	<SectionRule
		tone="red"
		scale="section"
		rhythm="tight"
		kicker="Masuk"
		label="Surel dan kata sandi akun Pfriends"
		lead="Peran melekat pada akun. Tidak ada yang perlu dipilih di layar ini — akun Anda sendiri yang menentukan ruang mana yang terbuka."
	>
		<div class="grid grid-cols-1 gap-x-12 gap-y-12 lg:grid-cols-12">
			<!-- Kolom formulir. Panel berkeyline merah, bukan kartu beradius: keying
			     rule menghubungkan, kartu mengotakkan (docs/11 §4.3). -->
			<div class="min-w-0 lg:col-span-7">
				<div class="border border-ink-200 bg-surface">
					<span
						class="keyline"
						style="background:var(--color-pertamina-red);"
						aria-hidden="true"
					></span>

					<div class="p-5 sm:p-7">
						{#if !session.ready}
							<div class="space-y-3" aria-busy="true">
								<p class="kicker">Memeriksa sesi</p>
								<Skeleton variant="row" />
								<Skeleton variant="row" />
								<span class="sr-only">Memulihkan sesi yang tersimpan di peramban ini</span>
							</div>
						{:else if session.isAuthenticated}
							<!-- Panel "sesi aktif" — pengganti pantulan senyap. Lihat keputusan 6. -->
							<p class="kicker">Sesi aktif</p>
							<h3 class="display-editorial mt-3 text-[24px] text-heading">
								Anda sudah masuk sebagai {session.displayName}
							</h3>
							<p class="mt-4 max-w-[54ch] text-[15px] leading-[1.65] text-ink-700">
								Peran yang sedang aktif adalah
								<span class="font-semibold text-ink-900">{session.roleLabel}</span>. Untuk menelusuri
								alur peran lain, akhiri sesi ini lebih dulu lalu masuk kembali dengan akun yang
								berbeda. Data peragaan di peramban Anda tidak perlu dihapus.
							</p>

							<div class="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
								<a
									href={tujuanAman}
									class="inline-flex min-h-11 items-center rounded-control bg-pertamina-red-ink px-5 text-[15px] font-semibold text-white transition-colors hover:bg-pertamina-red-dark"
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
						{:else}
							<form onsubmit={kirim} novalidate>
								{#if galat}
									<p
										class="mb-5 border-l-4 border-danger bg-danger-tint px-4 py-3 text-sm leading-relaxed text-ink-800"
										role="alert"
									>
										{galat}
									</p>
								{/if}

								<div class="space-y-5">
									<div>
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
											disabled={sedangMasuk}
											placeholder="nama@pertaminafoundation.org"
											class="mt-2 {KELAS_ISIAN}"
										/>
									</div>

									<div>
										<label for="masuk-sandi" class="block text-sm font-semibold text-ink-800">
											Kata sandi
										</label>
										<div class="relative mt-2">
											{#if sandiTerlihat}
												<input
													id="masuk-sandi"
													type="text"
													name="password"
													autocomplete="current-password"
													bind:value={sandi}
													disabled={sedangMasuk}
													class="{KELAS_ISIAN} pr-12"
												/>
											{:else}
												<input
													id="masuk-sandi"
													type="password"
													name="password"
													autocomplete="current-password"
													bind:value={sandi}
													disabled={sedangMasuk}
													class="{KELAS_ISIAN} pr-12"
												/>
											{/if}
											<button
												type="button"
												class="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center rounded-r-control text-ink-500 transition-colors hover:text-ink-800"
												aria-label={sandiTerlihat
													? 'Sembunyikan kata sandi'
													: 'Tampilkan kata sandi'}
												onclick={() => (sandiTerlihat = !sandiTerlihat)}
											>
												<Icon path={sandiTerlihat ? ICONS.eye : ICONS.lock} size={18} />
											</button>
										</div>
									</div>
								</div>

								<button
									type="submit"
									disabled={!bolehKirim}
									class="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-control bg-pertamina-red-ink px-6 text-[15px] font-semibold text-white transition-colors hover:bg-pertamina-red-dark disabled:bg-ink-200 disabled:text-ink-500"
								>
									{#if sedangMasuk}
										<svg
											class="animate-spin"
											width="18"
											height="18"
											viewBox="0 0 24 24"
											fill="none"
											aria-hidden="true"
										>
											<circle
												class="opacity-25"
												cx="12"
												cy="12"
												r="10"
												stroke="currentColor"
												stroke-width="3"
											/>
											<path
												class="opacity-90"
												fill="currentColor"
												d="M4 12a8 8 0 0 1 8-8V1C5.9 1 1 5.9 1 12h3Z"
											/>
										</svg>
										Memeriksa kredensial
									{:else}
										Masuk
									{/if}
								</button>

								<p class="mt-4 text-[13px] leading-relaxed text-ink-600">
									Belum terdaftar?
									<a
										href="/daftar"
										class="font-semibold text-pertamina-red-ink underline underline-offset-4 hover:text-pertamina-red-dark"
									>
										Daftar sebagai anggota
									</a>
								</p>
							</form>
						{/if}
					</div>
				</div>
			</div>

			<!-- Kolom kanan: foto + pernyataan jujur tentang sifat autentikasinya.
			     Daftar akunnya sendiri turun ke seksi berikutnya — empat baris akun di
			     kolom sempit membuat kolom kanan dua kali lebih tinggi daripada
			     formulirnya, dan sisi kiri berakhir sebagai bidang kosong sepanjang
			     layar. Di ponsel kolom ini tetap jatuh di bawah formulir, sehingga
			     kolom surel tetap yang pertama terlihat. -->
			<aside class="min-w-0 lg:col-span-5">
				<PhotoFigure
					{...propsFoto('sobi-mentoring')}
					ratio="3:2"
					keyline="navy"
					keylinePos="top"
					fallbackLabel="Ruang kerja komunitas"
				/>

				<p class="mt-8 text-[15px] leading-[1.65] text-ink-700">
					Prototipe ini memakai
					<span class="font-semibold text-ink-900">
						autentikasi tiruan, bukan mekanisme keamanan
					</span>. Data tersimpan di peramban Anda sendiri, dan kata sandi peragaan dibagikan
					terpisah oleh tim Corporate Secretary. Pada penerapan nyata, akun diterbitkan lewat
					direktori pengguna Pertamina Foundation.
				</p>

				<p class="mt-5 text-[15px] leading-[1.65] text-ink-700">
					Setiap ruang anggota memuat tombol
					<span class="font-semibold text-ink-900">Keluar</span> di bilah atasnya. Menekannya
					mengakhiri sesi, membersihkan jejaknya dari peramban, dan mengembalikan Anda ke halaman
					publik — tidak ada langkah manual sebelum masuk kembali dengan akun peran yang berbeda.
				</p>
			</aside>
		</div>
	</SectionRule>

	<SectionRule
		tone="navy"
		scale="quiet"
		rhythm="snug"
		kicker="Akun peragaan"
		label="Empat akun untuk menelusuri tiga peran"
	>
		{#if memuatAkunDemo}
			<div class="grid gap-4 sm:grid-cols-2" aria-busy="true">
				<Skeleton variant="row" />
				<Skeleton variant="row" />
				<span class="sr-only">Memuat daftar akun peragaan</span>
			</div>
		{:else if akunDemo.length > 0}
			<ul class="grid gap-x-10 gap-y-0 sm:grid-cols-2">
				{#each akunDemo as akun (akun.email)}
					<li class="border-t border-ink-200 last:border-b sm:[&:nth-last-child(-n+2)]:border-b">
						<button
							type="button"
							class="flex w-full flex-col gap-1.5 py-4 text-left transition-colors hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-60"
							disabled={sedangMasuk}
							onclick={() => pakaiSurel(akun.email)}
						>
							<span class="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
								<span class="text-[15px] font-bold text-heading">{akun.displayName}</span>
								<span class="kicker">{akun.roleLabel}</span>
							</span>
							<span class="truncate text-[13px] font-semibold text-pertamina-red-ink">
								{akun.email}
							</span>
							<span class="text-[13px] leading-[1.5] text-ink-600">{akun.hint}</span>
						</button>
					</li>
				{/each}
			</ul>
			<p class="mt-4 text-[13px] leading-relaxed text-ink-600">
				Menekan salah satu baris hanya mengisikan surelnya. Kata sandi tetap harus diketik —
				tombol yang langsung memasukkan seseorang ke dalam aplikasi adalah pemilih peran dengan
				nama lain.
			</p>
		{:else}
			<p class="text-[13px] leading-relaxed text-ink-600">
				Daftar akun peragaan belum tersedia di peramban ini. Muat ulang halaman untuk
				menyiapkannya, lalu panel ini akan terisi sendiri.
			</p>
		{/if}

		<p class="mt-8 max-w-[66ch] text-[16px] leading-[1.68] text-ink-700">
			Belum punya akun? Pendaftaran terbuka bagi alumni Beasiswa Sobat Bumi dan pelaku usaha binaan
			PFpreneur Pertamina Foundation.
			<a
				href="/daftar"
				class="font-semibold text-pertamina-red-ink underline underline-offset-4 hover:text-pertamina-red-dark"
			>
				Buka formulir pendaftaran
			</a>.
		</p>
	</SectionRule>
</div>
