<script>
	/**
	 * PENDAFTARAN — onboarding penerima manfaat, tiga langkah, dalam bahasa visual
	 * editorial.
	 *
	 * Tiga langkah, dan urutannya bukan selera: identitas lebih dulu karena paling
	 * mudah dijawab, program berikutnya karena menuntut pengingatan, persetujuan
	 * terakhir karena harus dibaca dengan kepala tenang. Menaruh consent di depan
	 * membuat orang menyetujuinya sebelum tahu apa yang mereka daftarkan.
	 *
	 * Kotak persetujuan sengaja menjelaskan pemakaian data secara spesifik, bukan
	 * merujuk "syarat dan ketentuan" yang tak seorang pun buka. Governance pada
	 * Hal 10 dokumen sumber menuntut consent record sebagai bukti tata kelola —
	 * dan persetujuan yang tidak dipahami pemberinya bukan bukti apa pun.
	 *
	 * Formulir ini tidak menulis ke basis data. Pada mockup, keanggotaan sungguhan
	 * lahir dari data seed; menyisipkan pendaftar baru akan membuat angka KPI di
	 * konsol admin bergeser tanpa riwayat kontribusi yang menyertainya.
	 *
	 * ── TIGA KEPUTUSAN GELOMBANG G5 ──────────────────────────────────────────
	 *
	 * 1. **Halaman ini memakai sistem editorial.** `/daftar` adalah tujuan tombol
	 *    "Gabung Sekarang" di setiap halaman publik, dan sampai gelombang ini ia
	 *    satu-satunya halaman — bersama `/masuk` — yang belum tersentuh redesign.
	 *    Pengunjung berpindah dari halaman berfoto lebar bertipografi Fraunces ke
	 *    formulir berupa lama; patahan itu terasa persis pada layar yang paling
	 *    perlu meyakinkan. Yang dipakai: `EditorialHero` pendek, `SectionRule`
	 *    sebagai kepala seksi, `PhotoFigure` untuk foto, dan panel berkeyline
	 *    alih-alih tumpukan kartu beradius seragam (cacat D-05).
	 *
	 *    Kegunaan tidak dikorbankan untuk gaya: hero memakai `height="short"`,
	 *    ritme seksi memakai `tight`/`snug` (bukan `loose`), penanda langkah tetap
	 *    berada tepat di atas isian, dan bilah aksi tetap menempel di dasar layar
	 *    agar terjangkau ibu jari. Kolom kanan turun ke bawah formulir di ponsel,
	 *    sehingga isian pertama tetap yang pertama terlihat.
	 *
	 * 2. **Dua butir consent yang menyebut mekanik skor DIPERTAHANKAN apa adanya.**
	 *    `scripts/verify/public-purity.mjs` mengecualikan `/daftar` dari aturan kata
	 *    justru karena ini: consent yang menyembunyikan objeknya bukan consent, dan
	 *    memoles kalimatnya agar "aman" berarti meminta persetujuan atas sesuatu
	 *    yang tidak disebutkan. Kalimat kedua butir itu tidak boleh disunting demi
	 *    keseragaman gaya.
	 *
	 * 3. **Layar konfirmasi memakai hero-nya sendiri.** Hero berbunyi "Gabung ke
	 *    Pfriends" di atas layar yang menyatakan pendaftaran sudah terkirim adalah
	 *    ajakan yang datang terlambat. Dua keadaan, dua judul.
	 *
	 * @see docs/00-SOURCE-BRIEF.md — Hal 5 pilar 01, Hal 6 KPI-01, Hal 10 Governance
	 * @see docs/07-UX-SITEMAP.md — §4.1 wireframe `/daftar`
	 * @see docs/11-VISUAL-DIRECTION.md — §6 E1 hero, §8.2 SectionRule, §4 perlakuan foto
	 */
	import { Icon, ProgressBar, StatusBadge, ICONS } from '$lib/components';
	import { EditorialHero, PhotoFigure, SectionRule } from '$lib/components/editorial';
	import { foto } from '$lib/data/photos.js';
	import {
		CHAPTERS,
		COMMUNITIES,
		CommunityType,
		AWARDEE_STATUS,
		AWARDEE_STATUS_META,
		chapter
	} from '$lib/domain/constants/community.js';

	/** Tahun berjalan inisiatif — dipakai pada nomor pendaftaran. */
	const TAHUN_PROGRAM = 2026;

	/** Banyaknya digit acuan pada nomor pendaftaran. */
	const PANJANG_NOMOR = 4;

	const LANGKAH = [
		{ nomor: 1, label: 'Identitas' },
		{ nomor: 2, label: 'Program' },
		{ nomor: 3, label: 'Persetujuan' }
	];

	/** Ikon tiap komunitas pada kartu pilihan, sejajar urutan COMMUNITIES. */
	const IKON_KOMUNITAS = [ICONS.academic, ICONS.briefcase];

	/**
	 * Rincian pemakaian data yang ditandatangani pendaftar. Ditulis sebagai daftar
	 * terpisah, bukan satu paragraf panjang, supaya tiap butir benar-benar terbaca.
	 *
	 * Butir ketiga dan keempat menyebut mekanik skor secara tersurat. Itu DISENGAJA
	 * dan tidak boleh diperhalus — lihat keputusan 2 pada catatan berkas.
	 */
	const RINCIAN_CONSENT = [
		{
			iconPath: ICONS.checkCircle,
			judul: 'Mencocokkan keanggotaanmu',
			teks: 'Nama, email, dan nomor WhatsApp dicocokkan dengan daftar penerima manfaat Pertamina Foundation. Tanpa pencocokan ini keanggotaan tidak dapat disahkan.'
		},
		{
			iconPath: ICONS.whatsapp,
			judul: 'Memasukkanmu ke WA Komunitas',
			teks: 'Nomor WhatsApp dipakai untuk mengirim undangan grup chapter angkatanmu. Nomor tidak dibagikan ke pihak ketiga dan tidak dipakai untuk penawaran produk.'
		},
		{
			iconPath: ICONS.trophy,
			judul: 'Mencatat kontribusimu',
			teks: 'Aksi, poin, dan tier disimpan untuk menjalankan gamifikasi serta menyusun laporan program. Laporan yang keluar dari Pfriends berbentuk angka gabungan, bukan daftar nama.'
		},
		{
			iconPath: ICONS.lock,
			judul: 'Dapat kamu cabut kapan saja',
			teks: 'Persetujuan dapat dicabut lewat halaman profil. Setelah dicabut, cerita dan foto yang memuat identitasmu ditarik dari ruang publik, sementara catatan poin tetap tersimpan sebagai jejak audit tanpa dipublikasikan.'
		}
	];

	let langkah = $state(1);
	let dicobaLanjut = $state(false);
	let terkirim = $state(false);

	let form = $state({
		nama: '',
		whatsapp: '',
		email: '',
		kota: '',
		komunitas: '',
		chapterId: '',
		namaUsaha: ''
	});

	let consentData = $state(false);
	let consentPublikasi = $state(false);

	const perluProfilUsaha = $derived(form.komunitas === CommunityType.WOMENPRENEUR);

	const galat1 = $derived({
		nama: form.nama.trim().length < 3 ? 'Tulis nama lengkap sesuai data penerima manfaat.' : '',
		whatsapp: /^[0-9+][0-9\s+-]{8,}$/.test(form.whatsapp.trim())
			? ''
			: 'Tulis nomor WhatsApp aktif, minimal 9 digit.',
		email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
			? ''
			: 'Tulis alamat email yang masih kamu akses.',
		kota: form.kota.trim().length < 3 ? 'Tulis kota atau kabupaten domisilimu.' : ''
	});

	const galat2 = $derived({
		komunitas: form.komunitas === '' ? 'Pilih komunitas asalmu.' : '',
		chapterId: form.chapterId === '' ? 'Pilih chapter sesuai angkatanmu.' : '',
		namaUsaha: perluProfilUsaha && form.namaUsaha.trim().length < 2 ? 'Tulis nama usahamu.' : ''
	});

	const langkah1Sah = $derived(Object.values(galat1).every((pesan) => pesan === ''));
	const langkah2Sah = $derived(Object.values(galat2).every((pesan) => pesan === ''));
	const bolehKirim = $derived(langkah1Sah && langkah2Sah && consentData);

	const statusAwal = AWARDEE_STATUS_META[AWARDEE_STATUS.MENUNGGU_VERIFIKASI];

	/**
	 * Nomor pendaftaran yang stabil untuk satu pendaftar.
	 *
	 * Diturunkan dari isian, bukan dari waktu atau angka acak, supaya nomor yang
	 * ditunjukkan di layar konfirmasi tetap sama bila pengguna kembali ke halaman
	 * ini — nomor rujukan yang berubah setiap kali dilihat tidak berguna sebagai
	 * rujukan.
	 * @returns {string}
	 */
	const nomorPendaftaran = $derived.by(() => {
		const kunci = `${form.whatsapp.trim()}|${form.email.trim().toLowerCase()}`;
		let sidik = 0;
		for (let i = 0; i < kunci.length; i += 1) {
			sidik = (sidik * 31 + kunci.charCodeAt(i)) >>> 0;
		}
		const urut = String(sidik % 10 ** PANJANG_NOMOR).padStart(PANJANG_NOMOR, '0');
		return `PF-${TAHUN_PROGRAM}-${urut}`;
	});

	const chapterTerpilih = $derived(form.chapterId ? chapter(form.chapterId) : null);

	/**
	 * Props `PhotoFigure` dari satu kunci manifes foto.
	 *
	 * `width`/`height` WAJIB ikut dioper: `PhotoFigure` menulis galat konsol di mode
	 * dev bila keduanya kosong, dan galat konsol dihitung sebagai kegagalan oleh
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

	/**
	 * Maju satu langkah bila langkah berjalan sudah sah.
	 * @returns {void}
	 */
	function lanjut() {
		dicobaLanjut = true;
		const sah = langkah === 1 ? langkah1Sah : langkah2Sah;
		if (!sah) return;
		langkah += 1;
		dicobaLanjut = false;
	}

	/**
	 * Mundur satu langkah.
	 * @returns {void}
	 */
	function kembali() {
		dicobaLanjut = false;
		langkah -= 1;
	}

	/**
	 * Mengirim pendaftaran; hanya mengubah keadaan layar, tidak menulis basis data.
	 * @returns {void}
	 */
	function kirim() {
		dicobaLanjut = true;
		if (!bolehKirim) return;
		terkirim = true;
	}

	/** Kelas bersama seluruh kolom isian; ditulis sekali agar tidak saling menyimpang. */
	const KELAS_ISIAN =
		'block h-11 w-full rounded-control border border-ink-200 bg-surface px-3 text-[15px] text-ink-800 transition-colors outline-none placeholder:text-ink-400 focus:border-pertamina-red focus:ring-2 focus:ring-pertamina-red/20';
</script>

<svelte:head>
	<title>Pendaftaran — Pfriends</title>
	<meta
		name="description"
		content="Formulir pendaftaran anggota Pfriends bagi alumni Beasiswa Sobat Bumi dan pelaku usaha binaan PFpreneur Pertamina Foundation."
	/>
</svelte:head>

{#if terkirim}
	<EditorialHero
		image="cta-penutup"
		imageMobile="sobi-alumni-kampus"
		alt="Beberapa orang berdiri di halaman terbuka menyaksikan kegiatan yang sedang berlangsung"
		altMobile="Barisan wisudawan bertoga merah duduk menghadap panggung upacara di lapangan terbuka"
		kicker="Pendaftaran terkirim"
		title={'Selamat datang\nkembali di komunitas'}
		standfirst="Tim Pertamina Foundation akan mencocokkan datamu dengan daftar penerima manfaat. Nomor rujukanmu ada di bawah."
		height="short"
		overlay="flat"
		caption="Kegiatan luar ruang — foto stok"
	/>
{:else}
	<EditorialHero
		image="gerakan-mangrove"
		imageMobile="sobi-alumni-kampus"
		alt="Sekelompok relawan berdiri di hamparan lumpur pesisir saat kegiatan penanaman berlangsung"
		altMobile="Barisan wisudawan bertoga merah duduk menghadap panggung upacara di lapangan terbuka"
		kicker="Open community ecosystem"
		title={'Gabung ke\nPfriends'}
		standfirst="Tiga langkah singkat. Yang kami minta hanya data yang benar-benar dipakai untuk memverifikasi keanggotaan dan menghubungkanmu ke komunitas."
		secondary={{ label: 'Sudah punya akun? Masuk', href: '/masuk' }}
		height="short"
		caption="Kerja bakti pesisir — foto stok"
	/>
{/if}

<div class="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
	{#if terkirim}
		<!-- ── KONFIRMASI ──────────────────────────────────────────────────── -->
		<SectionRule
			tone="green"
			scale="section"
			rhythm="tight"
			kicker="Nomor rujukan"
			label="Pendaftaranmu sudah kami terima"
			lead="Simpan nomor di bawah. Sebutkan bila kamu perlu menanyakan perkembangan pendaftaran kepada tim komunitas."
		>
			<div class="grid grid-cols-1 gap-x-12 gap-y-10 lg:grid-cols-12">
				<div class="min-w-0 lg:col-span-7">
					<div class="border border-ink-200 bg-surface">
						<span
							class="keyline"
							style="background:var(--color-pertamina-green);"
							aria-hidden="true"
						></span>
						<div class="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-7">
							<div class="min-w-0">
								<p class="kicker">Nomor pendaftaran</p>
								<p class="figure-number mt-2 text-[34px] text-heading">{nomorPendaftaran}</p>
								<p class="mt-2 text-[13px] leading-relaxed text-ink-600">
									Atas nama {form.nama.trim() || 'pendaftar'} · {form.email.trim()}
								</p>
							</div>
							<StatusBadge label={statusAwal.label} color={statusAwal.badgeColor} withDot />
						</div>
					</div>

					<h3 class="display-editorial mt-10 text-[24px] text-heading">Yang terjadi berikutnya</h3>
					<ol class="mt-5 divide-y divide-ink-200 border-y border-ink-200">
						<li class="flex gap-4 py-4">
							<span class="figure-number shrink-0 text-[20px] text-pertamina-red-ink">01</span>
							<div class="min-w-0">
								<p class="text-[15px] font-bold text-heading">Verifikasi keanggotaan</p>
								<p class="mt-1 text-[13px] leading-[1.6] text-ink-600">
									Data dicocokkan dengan daftar penerima manfaat PFprestasi dan PFpreneur. Umumnya
									selesai dalam 3–5 hari kerja.
								</p>
							</div>
						</li>
						<li class="flex gap-4 py-4">
							<span class="figure-number shrink-0 text-[20px] text-pertamina-red-ink">02</span>
							<div class="min-w-0">
								<p class="text-[15px] font-bold text-heading">Undangan WA Komunitas</p>
								<p class="mt-1 text-[13px] leading-[1.6] text-ink-600">
									Begitu keanggotaan sah, tautan undangan
									{#if chapterTerpilih}
										<span class="font-semibold text-ink-800">{chapterTerpilih.wagLabel}</span>
									{:else}
										grup chapter angkatanmu
									{/if}
									dikirim ke nomor WhatsApp yang kamu daftarkan.
								</p>
							</div>
						</li>
						<li class="flex gap-4 py-4">
							<span class="figure-number shrink-0 text-[20px] text-pertamina-red-ink">03</span>
							<!--
								Langkah ketiga sengaja berbicara tentang APA YANG DAPAT KAMU LAKUKAN,
								bukan tentang mekanik skor. Ruang publik Pfriends tidak menampilkan
								angka kontribusi (PO-2); menjanjikannya di halaman pendaftaran berarti
								menjadikan angka sebagai alasan bergabung, padahal alasannya adalah
								komunitasnya.
							-->
							<div class="min-w-0">
								<p class="text-[15px] font-bold text-heading">Langkah pertamamu di komunitas</p>
								<p class="mt-1 text-[13px] leading-[1.6] text-ink-600">
									Masuk ke microsite, baca kabar komunitas minggu itu, lalu pilih satu kegiatan
									chapter terdekat. Dari situ kamu bertemu alumni seangkatan dan tahu gerakan apa
									yang sedang berjalan di kotamu.
								</p>
							</div>
						</li>
					</ol>

					<div class="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3">
						<a
							href="/cerita"
							class="inline-flex min-h-11 items-center rounded-control bg-pertamina-red-ink px-5 text-[15px] font-semibold text-white transition-colors hover:bg-pertamina-red-dark"
						>
							Baca cerita komunitas
						</a>
						<a
							href="/"
							class="inline-flex min-h-11 items-center text-[15px] font-medium text-ink-700 underline underline-offset-4 transition-colors hover:text-heading"
						>
							Kembali ke beranda
						</a>
					</div>
				</div>

				<aside class="min-w-0 lg:col-span-5">
					<PhotoFigure
						{...propsFoto('chapter-pertemuan')}
						ratio="4:5"
						keyline="green"
						keylinePos="left"
						fallbackLabel="WA Komunitas"
					/>

					<div class="mt-8">
						<p class="kicker">WA Komunitas</p>
						<h3 class="display-editorial mt-3 text-[24px] text-heading">
							Grup angkatanmu menunggu
						</h3>
						<p class="mt-4 text-[15px] leading-[1.65] text-ink-700">
							WA Komunitas Pfriends menaungi grup tiap batch — tempat kabar dibagikan lebih dulu
							dan anggota saling meminta bantuan. Undangannya dikirim langsung ke
							<span class="numeric font-semibold text-ink-900">{form.whatsapp.trim()}</span>
							setelah verifikasi selesai, jadi tidak ada yang perlu kamu cari sendiri.
						</p>
					</div>
				</aside>
			</div>
		</SectionRule>
	{:else}
		<!-- ── FORMULIR ────────────────────────────────────────────────────── -->
		<SectionRule
			tone="red"
			scale="section"
			rhythm="tight"
			kicker="Formulir keanggotaan"
			label="Tiga langkah, lalu selesai"
			lead="Isian ini tidak menulis apa pun ke basis data peragaan. Ia memperlihatkan alur pendaftaran sebagaimana akan berjalan pada penerapan nyata."
		>
			<div class="grid grid-cols-1 gap-x-12 gap-y-12 lg:grid-cols-12">
				<div class="min-w-0 lg:col-span-7">
					<!-- Penanda langkah berdiri TEPAT di atas isian: pengguna harus tahu
					     posisinya tanpa menggulir ke tempat lain. -->
					<div class="mb-6">
						<div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
							<p class="kicker">
								Langkah {langkah} dari {LANGKAH.length} · {LANGKAH[langkah - 1].label}
							</p>
							<ol class="hidden gap-4 sm:flex" aria-hidden="true">
								{#each LANGKAH as tahap (tahap.nomor)}
									<li
										class="flex items-center gap-1.5 text-[13px] font-semibold
											{tahap.nomor === langkah
											? 'text-pertamina-red-ink'
											: tahap.nomor < langkah
												? 'text-success'
												: 'text-ink-450'}"
									>
										{#if tahap.nomor < langkah}
											<Icon path={ICONS.check} size={14} />
										{/if}
										{tahap.label}
									</li>
								{/each}
							</ol>
						</div>
						<div class="mt-3">
							<ProgressBar
								value={langkah}
								max={LANGKAH.length}
								color="var(--color-pertamina-red)"
								label="Progres pengisian formulir"
							/>
						</div>
					</div>

					<div class="border border-ink-200 bg-surface">
						<span
							class="keyline"
							style="background:var(--color-pertamina-red);"
							aria-hidden="true"
						></span>

						<div class="p-5 sm:p-7">
							{#if langkah === 1}
								<h3 class="display-editorial text-[24px] text-heading">Siapa kamu</h3>
								<p class="mt-2 text-[14px] leading-relaxed text-ink-600">
									Tulis persis seperti yang tercatat saat kamu menerima program.
								</p>

								<div class="mt-6 space-y-5">
									<div>
										<label for="nama" class="block text-sm font-semibold text-ink-800">
											Nama lengkap
										</label>
										<input
											id="nama"
											type="text"
											autocomplete="name"
											bind:value={form.nama}
											class="mt-2 {KELAS_ISIAN}"
										/>
										{#if dicobaLanjut && galat1.nama}
											<p class="mt-2 text-xs text-danger" role="alert">{galat1.nama}</p>
										{/if}
									</div>

									<div>
										<label for="whatsapp" class="block text-sm font-semibold text-ink-800">
											Nomor WhatsApp
										</label>
										<input
											id="whatsapp"
											type="tel"
											inputmode="tel"
											autocomplete="tel"
											placeholder="08xxxxxxxxxx"
											bind:value={form.whatsapp}
											class="numeric mt-2 {KELAS_ISIAN}"
										/>
										{#if dicobaLanjut && galat1.whatsapp}
											<p class="mt-2 text-xs text-danger" role="alert">{galat1.whatsapp}</p>
										{:else}
											<p class="mt-2 text-xs text-ink-600">
												Dipakai untuk mengirim undangan grup chapter angkatanmu.
											</p>
										{/if}
									</div>

									<div>
										<label for="email" class="block text-sm font-semibold text-ink-800">
											Email
										</label>
										<input
											id="email"
											type="email"
											autocomplete="email"
											bind:value={form.email}
											class="mt-2 {KELAS_ISIAN}"
										/>
										{#if dicobaLanjut && galat1.email}
											<p class="mt-2 text-xs text-danger" role="alert">{galat1.email}</p>
										{/if}
									</div>

									<div>
										<label for="kota" class="block text-sm font-semibold text-ink-800">
											Kota atau kabupaten domisili
										</label>
										<input
											id="kota"
											type="text"
											autocomplete="address-level2"
											bind:value={form.kota}
											class="mt-2 {KELAS_ISIAN}"
										/>
										{#if dicobaLanjut && galat1.kota}
											<p class="mt-2 text-xs text-danger" role="alert">{galat1.kota}</p>
										{:else}
											<p class="mt-2 text-xs text-ink-600">
												Membantu kami menautkanmu ke kegiatan dan gerakan terdekat.
											</p>
										{/if}
									</div>
								</div>
							{:else if langkah === 2}
								<h3 class="display-editorial text-[24px] text-heading">Dari program mana</h3>
								<p class="mt-2 text-[14px] leading-relaxed text-ink-600">
									Pilih komunitas asalmu supaya kami tahu peran apa yang paling cocok untukmu.
								</p>

								<fieldset class="mt-6">
									<legend class="block text-sm font-semibold text-ink-800">Komunitas asal</legend>
									<div class="mt-3 grid gap-3 sm:grid-cols-2">
										{#each COMMUNITIES as profil, index (profil.id)}
											{@const terpilih = form.komunitas === profil.id}
											<label
												class="flex cursor-pointer gap-3 rounded-control border p-4 transition-colors
													{terpilih
													? 'border-pertamina-red bg-pertamina-red-tint/30'
													: 'border-ink-200 hover:border-ink-300 hover:bg-ink-50'}"
											>
												<input
													type="radio"
													name="komunitas"
													value={profil.id}
													bind:group={form.komunitas}
													class="sr-only"
												/>
												<span
													class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
													style="background:var(--color-{profil.tint});color:var(--color-{profil.ink});"
												>
													<Icon path={IKON_KOMUNITAS[index]} size={20} />
												</span>
												<span class="min-w-0">
													<span class="block text-sm font-bold text-heading">{profil.akronim}</span>
													<span class="mt-1 block text-xs leading-relaxed text-ink-600">
														{profil.programAsal}
													</span>
												</span>
											</label>
										{/each}
									</div>
									{#if dicobaLanjut && galat2.komunitas}
										<p class="mt-2 text-xs text-danger" role="alert">{galat2.komunitas}</p>
									{/if}
								</fieldset>

								<div class="mt-6">
									<label for="chapter" class="block text-sm font-semibold text-ink-800">
										Chapter angkatan
									</label>
									<select id="chapter" bind:value={form.chapterId} class="mt-2 {KELAS_ISIAN}">
										<option value="">Pilih chapter</option>
										{#each CHAPTERS as def (def.id)}
											<option value={def.id}>{def.label} — {def.angkatan}</option>
										{/each}
									</select>
									{#if dicobaLanjut && galat2.chapterId}
										<p class="mt-2 text-xs text-danger" role="alert">{galat2.chapterId}</p>
									{:else}
										<p class="mt-2 text-xs text-ink-600">
											Chapter mengikuti batch penerima manfaat, sama dengan pembagian grup
											WhatsApp.
										</p>
									{/if}
								</div>

								{#if perluProfilUsaha}
									<div class="mt-6">
										<label for="usaha" class="block text-sm font-semibold text-ink-800">
											Nama usaha
										</label>
										<input
											id="usaha"
											type="text"
											autocomplete="organization"
											bind:value={form.namaUsaha}
											class="mt-2 {KELAS_ISIAN}"
										/>
										{#if dicobaLanjut && galat2.namaUsaha}
											<p class="mt-2 text-xs text-danger" role="alert">{galat2.namaUsaha}</p>
										{:else}
											<p class="mt-2 text-xs text-ink-600">
												Usahamu bisa tampil di direktori komunitas agar alumni menemukanmu.
											</p>
										{/if}
									</div>
								{/if}
							{:else}
								<h3 class="display-editorial text-[24px] text-heading">
									Ringkasan dan persetujuan
								</h3>

								<dl class="mt-5 divide-y divide-ink-200 border-y border-ink-200">
									<div class="flex justify-between gap-4 py-2.5">
										<dt class="text-[13px] text-ink-600">Nama</dt>
										<dd class="min-w-0 truncate text-[13px] font-semibold text-ink-800">
											{form.nama}
										</dd>
									</div>
									<div class="flex justify-between gap-4 py-2.5">
										<dt class="text-[13px] text-ink-600">WhatsApp</dt>
										<dd class="numeric min-w-0 truncate text-[13px] font-semibold text-ink-800">
											{form.whatsapp}
										</dd>
									</div>
									<div class="flex justify-between gap-4 py-2.5">
										<dt class="text-[13px] text-ink-600">Email</dt>
										<dd class="min-w-0 truncate text-[13px] font-semibold text-ink-800">
											{form.email}
										</dd>
									</div>
									<div class="flex justify-between gap-4 py-2.5">
										<dt class="text-[13px] text-ink-600">Domisili</dt>
										<dd class="min-w-0 truncate text-[13px] font-semibold text-ink-800">
											{form.kota}
										</dd>
									</div>
									<div class="flex justify-between gap-4 py-2.5">
										<dt class="text-[13px] text-ink-600">Komunitas</dt>
										<dd class="min-w-0 truncate text-[13px] font-semibold text-ink-800">
											{form.komunitas
												? COMMUNITIES.find((c) => c.id === form.komunitas)?.akronim
												: '—'}
										</dd>
									</div>
									<div class="flex justify-between gap-4 py-2.5">
										<dt class="text-[13px] text-ink-600">Chapter</dt>
										<dd class="min-w-0 truncate text-[13px] font-semibold text-ink-800">
											{chapterTerpilih ? chapterTerpilih.label : '—'}
										</dd>
									</div>
									{#if perluProfilUsaha}
										<div class="flex justify-between gap-4 py-2.5">
											<dt class="text-[13px] text-ink-600">Usaha</dt>
											<dd class="min-w-0 truncate text-[13px] font-semibold text-ink-800">
												{form.namaUsaha}
											</dd>
										</div>
									{/if}
								</dl>

								<button
									type="button"
									class="mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-pertamina-red-ink underline underline-offset-4 hover:text-pertamina-red-dark"
									onclick={() => (langkah = 1)}
								>
									<Icon path={ICONS.edit} size={15} />
									Perbaiki isian
								</button>

								<!-- Rincian pemakaian data. Butir 3 dan 4 menyebut mekanik skor secara
								     tersurat dan itu WAJIB dipertahankan: consent yang menyembunyikan
								     objeknya bukan consent (keputusan 2). -->
								<div class="mt-7 border-l-4 border-pertamina-navy bg-pertamina-navy-tint/40 p-5">
									<p class="kicker">Apa yang kami lakukan dengan datamu</p>
									<ul class="mt-4 space-y-4">
										{#each RINCIAN_CONSENT as butir (butir.judul)}
											<li class="flex gap-3">
												<span class="mt-0.5 shrink-0 text-pertamina-navy" aria-hidden="true">
													<Icon path={butir.iconPath} size={17} />
												</span>
												<span class="min-w-0">
													<span class="block text-[13px] font-bold text-ink-900">
														{butir.judul}
													</span>
													<span class="mt-1 block text-[13px] leading-[1.6] text-ink-700">
														{butir.teks}
													</span>
												</span>
											</li>
										{/each}
									</ul>
								</div>

								<div class="mt-6 space-y-3">
									<label
										class="flex cursor-pointer gap-3 rounded-control border p-4 transition-colors
											{consentData
											? 'border-pertamina-red bg-pertamina-red-tint/30'
											: 'border-ink-200 hover:border-ink-300'}"
									>
										<input
											type="checkbox"
											bind:checked={consentData}
											class="mt-0.5 h-4 w-4 shrink-0 accent-pertamina-red"
										/>
										<span class="min-w-0 text-[13px] leading-[1.6] text-ink-700">
											<span class="font-bold text-ink-900">Wajib.</span>
											Saya menyetujui pengolahan data pribadi saya untuk keperluan verifikasi
											keanggotaan, komunikasi komunitas, dan pencatatan kontribusi seperti
											dijelaskan di atas.
										</span>
									</label>

									<label
										class="flex cursor-pointer gap-3 rounded-control border p-4 transition-colors
											{consentPublikasi
											? 'border-pertamina-red bg-pertamina-red-tint/30'
											: 'border-ink-200 hover:border-ink-300'}"
									>
										<input
											type="checkbox"
											bind:checked={consentPublikasi}
											class="mt-0.5 h-4 w-4 shrink-0 accent-pertamina-red"
										/>
										<span class="min-w-0 text-[13px] leading-[1.6] text-ink-700">
											<span class="font-bold text-ink-900">Opsional.</span>
											Saya mengizinkan nama dan foto saya ditampilkan pada cerita, sorotan
											anggota, dan kanal resmi Pertamina Foundation. Tanpa centang ini kamu tetap
											dapat menjadi anggota penuh — hanya profilmu yang tidak diangkat ke ruang
											publik.
										</span>
									</label>
								</div>

								{#if dicobaLanjut && !consentData}
									<p class="mt-3 text-xs text-danger" role="alert">
										Persetujuan pengolahan data wajib dicentang sebelum pendaftaran dapat dikirim.
									</p>
								{/if}
							{/if}
						</div>
					</div>

					<!-- Aksi langkah; menempel di dasar layar agar selalu terjangkau ibu jari -->
					<div class="sticky bottom-0 z-10 mt-5 bg-canvas py-4">
						<div class="flex gap-3">
							{#if langkah > 1}
								<button
									type="button"
									class="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-control border border-ink-200 bg-surface px-5 text-[15px] font-semibold text-ink-700 transition-colors hover:border-ink-300 hover:bg-ink-50 hover:text-heading"
									onclick={kembali}
								>
									<Icon path={ICONS.arrowLeft} size={18} />
									Kembali
								</button>
							{/if}

							{#if langkah < LANGKAH.length}
								<button
									type="button"
									class="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-control bg-pertamina-red-ink px-6 text-[15px] font-semibold text-white transition-colors hover:bg-pertamina-red-dark"
									onclick={lanjut}
								>
									Lanjut
									<Icon path={ICONS.arrowRight} size={18} />
								</button>
							{:else}
								<button
									type="button"
									disabled={!bolehKirim}
									class="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-control bg-pertamina-red-ink px-6 text-[15px] font-semibold text-white transition-colors hover:bg-pertamina-red-dark disabled:bg-ink-200 disabled:text-ink-500"
									onclick={kirim}
								>
									<Icon path={ICONS.checkCircle} size={18} />
									Kirim pendaftaran
								</button>
							{/if}
						</div>

						{#if langkah === LANGKAH.length && !bolehKirim}
							<p class="mt-2 text-center text-xs text-ink-600">
								Tombol aktif setelah persetujuan wajib dicentang.
							</p>
						{/if}
					</div>
				</div>

				<!-- Kolom kanan: konteks, bukan isian. Di ponsel ia turun ke bawah
				     formulir sehingga kolom pertama tetap yang pertama terlihat. -->
				<aside class="min-w-0 lg:col-span-5">
					<PhotoFigure
						{...propsFoto('womenpreneur-produk')}
						ratio="4:5"
						keyline="red"
						keylinePos="left"
						fallbackLabel="Anggota komunitas"
					/>

					<div class="mt-8">
						<p class="kicker">Siapa yang dapat mendaftar</p>
						<h3 class="display-editorial mt-3 text-[24px] text-heading">
							Dua kelompok, satu keanggotaan
						</h3>
						<dl class="mt-5 divide-y divide-ink-200 border-y border-ink-200">
							{#each COMMUNITIES as profil (profil.id)}
								<div class="py-4">
									<dt class="text-[15px] font-bold text-heading">{profil.akronim}</dt>
									<dd class="mt-1 text-[13px] leading-[1.6] text-ink-600">
										{profil.programAsal}
									</dd>
								</div>
							{/each}
						</dl>
						<p class="mt-5 text-[15px] leading-[1.65] text-ink-700">
							Sudah pernah mendaftar sebelumnya?
							<a
								href="/masuk"
								class="font-semibold text-pertamina-red-ink underline underline-offset-4 hover:text-pertamina-red-dark"
							>
								Masuk dengan akun Pfriends-mu
							</a>.
						</p>
					</div>
				</aside>
			</div>
		</SectionRule>
	{/if}
</div>
