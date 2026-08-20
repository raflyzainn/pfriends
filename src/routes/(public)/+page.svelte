<script>
	/**
	 * BERANDA PFFRIENDS: versi ringkas untuk peragaan.
	 *
	 * Navigasi publik kini hanya tiga tujuan (Beranda, Blog, Calendar of Event),
	 * sehingga beranda pun dipangkas menjadi empat seksi yang masing-masing punya
	 * satu pekerjaan:
	 *
	 *   1. Hero       : menyatakan ini situs apa, satu kalimat, satu tombol.
	 *   2. Billboard  : kegiatan terdekat sebagai papan reklame lebar penuh.
	 *   3. Peringkat  : sepuluh peserta paling aktif beserta poinnya.
	 *   4. Blog       : tiga cerita terbaru.
	 *
	 * EMPAT KEPUTUSAN YANG TIDAK TERBACA DARI KODE:
	 *
	 * 1. **Papan peringkat SENGAJA tampil di zona publik.** Ini melanggar PO-2 (nol
	 *    mekanik skor di zona publik) dan karenanya `npm run verify:purity` akan
	 *    gagal pada berkas ini. Pelanggarannya diminta pemilik produk secara
	 *    tersurat: papan peringkat adalah pemikat utama microsite pada peragaan.
	 *    Skrip pemindainya sengaja TIDAK disunting: gerbang yang dilonggarkan
	 *    diam-diam akan melewatkan pelanggaran berikutnya yang tidak disengaja.
	 *
	 * 2. **Nol foto raster.** Hero lama memuat dua berkas (273 KB + 240 KB) yang
	 *    dimuat sebelum satu kata pun terbaca. Penggantinya gradien teal + bentuk
	 *    geometris SVG inline: nol permintaan jaringan, dan warnanya mengikuti
	 *    palet lewat token, bukan heksadesimal tulis tangan.
	 *
	 * 3. **Peringkat dibaca lewat `awardeeRepository.topByPoints()`,** bukan dengan
	 *    menyortir `catalog.awardees` di berkas ini. Repository sudah menyaring
	 *    akun yang ditangguhkan dan memutus seri secara deterministik; menyortir
	 *    sendiri di sini berarti papan peringkat beranda dapat berbeda isi dari
	 *    papan peringkat zona awardee.
	 *
	 * 4. **Billboard menampilkan SATU kegiatan.** Papan reklame yang memuat empat
	 *    agenda berhenti menjadi papan reklame. Daftar lengkapnya ada di
	 *    `/kalender`, dan tombolnya menunjuk ke sana.
	 */
	import { Icon, ICONS } from '$lib/components';
	import PublicLeaderboard from '$lib/components/PublicLeaderboard.svelte';
	import { storyVM } from '$lib/components/editorial/view-model.js';
	import { catalog } from '$lib/stores/catalog.svelte.js';
	import { publicContent } from '$lib/stores/publicContent.svelte.js';
	import { formatTanggal } from '$lib/utils/format.js';

	/** Banyaknya baris papan peringkat. */
	const JUMLAH_PERINGKAT = 8;

	/** Banyaknya kartu blog di beranda. */
	const JUMLAH_BLOG = 3;

	/** Kegiatan terdekat yang sudah disetujui verifikator; `null` bila belum ada. */
	const acara = $derived(catalog.upcomingEvents()[0] ?? null);

	const tanggalAcara = $derived(acara ? formatTanggal(acara.startsAt, 'penuh') : '');
	const jamAcara = $derived(acara ? formatTanggal(acara.startsAt, 'jam') : '');
	const tempatAcara = $derived(
		acara ? (acara.location || (acara.isOnline ? 'Daring' : 'Menyusul')) : ''
	);
	const tautanAcara = $derived(acara?.slug ? `/kalender/${acara.slug}` : '/kalender');

	/** Tiga cerita terbaru yang sudah terbit. */
	const blog = $derived(publicContent.stories.slice(0, JUMLAH_BLOG).map((s) => storyVM(s)));

	/**
	 * Geometri sampul tipografis per posisi kartu.
	 *
	 * Tiga kartu berdampingan yang memakai gambar identik terbaca sebagai template,
	 * bukan sebagai tiga cerita berbeda: cacat yang sama dengan memakai satu foto
	 * stok untuk semuanya. Variasinya minimal dan deterministik: posisi lingkaran
	 * dan lengkung garis, bukan warna, supaya ketiganya tetap satu keluarga.
	 * @type {readonly {cx:number, cy:number, r:number, d:string}[]}
	 */
	const SAMPUL = Object.freeze([
		{ cx: 288, cy: 20, r: 56, d: 'M0 108 Q 90 70 180 104 T 320 78' },
		{ cx: 44, cy: 104, r: 62, d: 'M0 46 Q 110 96 210 54 T 320 96' },
		{ cx: 232, cy: 116, r: 70, d: 'M0 82 Q 120 34 200 88 T 320 46' }
	]);
</script>

<svelte:head>
	<title>PFriends: Rumah Komunitas Penerima Manfaat Pertamina Foundation</title>
	<meta
		name="description"
		content="PFriends menghubungkan alumni Beasiswa Sobat Bumi dengan pelaku UMKM binaan PFpreneur: kalender kegiatan, cerita lapangan, dan peserta paling aktif."
	/>
</svelte:head>

<!-- ═══ 1 · HERO: gradien teal + bentuk geometris SVG, tanpa satu pun foto ═══ -->
<section class="relative overflow-hidden bg-brand-700">
	<div
		class="absolute inset-0"
		style="background-image: linear-gradient(135deg, var(--color-brand-800) 0%, var(--color-brand-600) 55%, var(--color-brand-500) 100%);"
		aria-hidden="true"
	></div>

	<!-- Bentuk geometris: dua lingkaran besar dan satu bujur sangkar miring.
	     Diletakkan di lapis terpisah supaya teks tidak pernah ikut transparan. -->
	<svg
		class="pointer-events-none absolute inset-0 h-full w-full"
		viewBox="0 0 1200 420"
		preserveAspectRatio="xMidYMid slice"
		aria-hidden="true"
		focusable="false"
	>
		<circle cx="1010" cy="90" r="190" fill="var(--color-brand-200)" opacity="0.16" />
		<circle cx="1130" cy="330" r="120" fill="var(--color-accent-200)" opacity="0.22" />
		<circle cx="120" cy="380" r="150" fill="var(--color-brand-200)" opacity="0.10" />
		<rect
			x="820"
			y="180"
			width="150"
			height="150"
			rx="10"
			fill="none"
			stroke="var(--color-accent-200)"
			stroke-width="2"
			opacity="0.5"
			transform="rotate(18 895 255)"
		/>
		<path
			d="M0 400 Q 300 320 600 392 T 1200 340"
			fill="none"
			stroke="var(--color-brand-200)"
			stroke-width="2"
			opacity="0.35"
		/>
	</svg>

	<div class="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
		<p
			class="font-mono text-[11px] leading-none font-medium tracking-[0.08em] text-accent-200 uppercase"
		>
			Community Connect Initiative
		</p>

		<h1
			class="display-editorial mt-5 max-w-[16ch] text-[clamp(34px,5vw,60px)] leading-[1.04] text-white"
		>
			Rumah komunitas penerima manfaat
		</h1>

		<p class="mt-6 max-w-[56ch] text-[17px] leading-[1.65] text-white/90">
			Satu tempat bagi alumni Beasiswa Sobat Bumi dan pelaku usaha binaan PFpreneur untuk
			menemukan kegiatan berikutnya dan membaca cerita dari sesama anggota.
		</p>

		<a
			href="/kalender"
			class="mt-9 inline-flex min-h-12 items-center gap-2 rounded-control bg-accent-200 px-7 text-[15px] font-bold text-brand-800 transition-colors hover:bg-accent-300"
		>
			Lihat Calendar of Event
			<Icon path={ICONS.arrowLongRight} size={18} />
		</a>
	</div>
</section>

<!-- ═══ 2 · BILLBOARD EVENT: panel lebar penuh, kontras tertinggi di halaman ═══ -->
<section class="bg-brand-900" aria-labelledby="billboard-judul">
	<span class="keyline bg-accent-200" aria-hidden="true"></span>

	<div class="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
		{#if acara}
			<div class="grid grid-cols-1 gap-x-12 gap-y-8 lg:grid-cols-12 lg:items-center">
				<!-- Blok tanggal: satu-satunya elemen kuning pejal di viewport ini. -->
				<div class="lg:col-span-3">
					<div
						class="inline-flex w-full max-w-[220px] flex-col items-center rounded-control bg-accent-200 px-6 py-6 text-brand-900"
					>
						<span class="figure-number text-[64px] leading-none">
							{acara.startsAt.getDate()}
						</span>
						<span
							class="mt-2 font-mono text-[12px] leading-none font-medium tracking-[0.14em] uppercase"
						>
							{formatTanggal(acara.startsAt, 'ringkas').split(' ')[1]}
							{acara.startsAt.getFullYear()}
						</span>
					</div>
				</div>

				<div class="min-w-0 lg:col-span-9">
					<p
						class="font-mono text-[11px] leading-none font-medium tracking-[0.08em] text-accent-200 uppercase"
					>
						Kegiatan terdekat · {acara.typeMeta.label}
					</p>

					<h2
						id="billboard-judul"
						class="display-editorial mt-4 max-w-[22ch] text-[clamp(28px,4vw,48px)] leading-[1.06] text-white"
					>
						{acara.title}
					</h2>

					<ul class="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3">
						<li class="flex items-center gap-2.5 text-[15px] text-white/90">
							<Icon path={ICONS.clock} size={18} />
							{tanggalAcara} · {jamAcara} WIB
						</li>
						<li class="flex items-center gap-2.5 text-[15px] text-white/90">
							<Icon path={ICONS.mapPin} size={18} />
							{tempatAcara}
						</li>
					</ul>

					<div class="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
						<a
							href={tautanAcara}
							class="inline-flex min-h-12 items-center gap-2 rounded-control bg-accent-200 px-7 text-[15px] font-bold text-brand-900 transition-colors hover:bg-accent-300"
						>
							Lihat detail kegiatan
							<Icon path={ICONS.arrowLongRight} size={18} />
						</a>
						<a
							href="/kalender"
							class="text-[15px] text-white/85 underline underline-offset-4 transition-colors hover:text-white"
						>
							Seluruh agenda komunitas
						</a>
					</div>
				</div>
			</div>
		{:else}
			<h2 id="billboard-judul" class="display-editorial text-[clamp(24px,3vw,34px)] text-white">
				Agenda berikutnya sedang disusun
			</h2>
			<p class="mt-4 max-w-[58ch] text-[16px] leading-[1.68] text-white/85">
				Kegiatan baru diumumkan tiap awal bulan lewat WA Komunitas, lalu terbit di Calendar of
				Event begitu disetujui verifikator.
			</p>
			<a
				href="/kalender"
				class="mt-7 inline-flex min-h-12 items-center gap-2 rounded-control bg-accent-200 px-7 text-[15px] font-bold text-brand-900 transition-colors hover:bg-accent-300"
			>
				Buka Calendar of Event
				<Icon path={ICONS.arrowLongRight} size={18} />
			</a>
		{/if}
	</div>
</section>

<PublicLeaderboard
	entries={publicContent.leaderboard.slice(0, JUMLAH_PERINGKAT)}
	loading={publicContent.leaderboardLoading}
	error={publicContent.leaderboardError}
/>

<!-- ═══ 4 · BLOG TERBARU: maksimum tiga kartu ═══ -->
<section class="bg-surface" aria-labelledby="blog-judul">
	<div class="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
		<div class="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
			<div>
				<p class="kicker">Blog komunitas</p>
				<h2 id="blog-judul" class="display-editorial mt-3 text-[clamp(26px,3vw,36px)] text-heading">
					Cerita terbaru dari lapangan
				</h2>
			</div>
			<a
				href="/cerita"
				class="inline-flex min-h-11 items-center gap-2 text-[15px] font-semibold text-brand-700 underline-offset-4 hover:underline"
			>
				Lihat semua cerita
				<Icon path={ICONS.arrowLongRight} size={18} />
			</a>
		</div>

		{#if blog.length > 0}
			<ul class="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
				{#each blog as cerita, i (cerita.id)}
					{@const sampul = SAMPUL[i % SAMPUL.length]}
					<li class="flex flex-col overflow-hidden rounded-card border border-ink-200">
						<!-- Sampul FOTO bila cerita punya, blok tipografis bila tidak.
						     Larangan "nol foto raster" pada berkas ini ditulis untuk HERO :
						     dua berkas 273 KB + 240 KB yang dimuat sebelum satu kata pun
						     terbaca. Kartu blog bukan kasus yang sama: fotonya 167–270 KB
						     dan berada di bawah lipatan, jadi tidak pernah menghalangi
						     pembacaan paragraf pertama.
						     `loading="lazy"` sengaja TIDAK dipakai. Halaman ini hanya empat
						     seksi: bukan umpan panjang: sehingga ketiga foto praktis selalu
						     jadi terlihat, sementara pemuatan malas membuat kartu sempat
						     memajang teks alt di atas kotak kosong. Itu terlihat sebagai
						     gambar rusak, dan tangkapan layar penuh halaman merekamnya
						     persis begitu.
						     Cerita tanpa sampul TIDAK jatuh ke foto default: enam cerita
						     memang sengaja dilepas sampulnya karena foto stoknya salah fakta
						     (alat tenun Andes untuk tenun Sumba). Blok tipografis di bawah
						     adalah jawaban resminya, bukan tambalan. -->
						<a href={cerita.href} class="relative block h-32 shrink-0 overflow-hidden bg-brand-600">
							{#if cerita.foto}
								<img
									src={cerita.foto.src}
									alt={cerita.foto.alt}
									width={cerita.foto.w}
									height={cerita.foto.h}
									decoding="async"
									class="absolute inset-0 h-full w-full object-cover"
								/>
								<!-- Gradien gelap di kaki foto: chip pilar berlatar putih 90%
								     akan hilang di atas foto yang kebetulan terang. -->
								<span
									class="absolute inset-x-0 bottom-0 h-16"
									style="background-image: linear-gradient(to top, rgb(26 62 61 / 0.55), transparent);"
									aria-hidden="true"
								></span>
							{:else}
								<span
									class="absolute inset-0"
									style="background-image: linear-gradient(120deg, var(--color-brand-700) 0%, var(--color-brand-500) 100%);"
									aria-hidden="true"
								></span>
								<svg
									class="absolute inset-0 h-full w-full"
									viewBox="0 0 320 128"
									preserveAspectRatio="none"
									aria-hidden="true"
									focusable="false"
								>
									<circle
										cx={sampul.cx}
										cy={sampul.cy}
										r={sampul.r}
										fill="var(--color-accent-200)"
										opacity="0.18"
									/>
									<path
										d={sampul.d}
										fill="none"
										stroke="var(--color-brand-200)"
										stroke-width="2"
										opacity="0.5"
									/>
								</svg>
							{/if}
							{#if cerita.pillarLabel}
								<span
									class="absolute bottom-3 left-4 rounded-chip bg-white/90 px-3 py-1 text-[11px] font-semibold text-brand-700"
								>
									{cerita.pillarLabel}
								</span>
							{/if}
						</a>

						<div class="flex flex-1 flex-col p-5">
							<h3 class="text-[18px] leading-[1.3] font-bold text-heading">
								<a href={cerita.href} class="hover:underline">{cerita.title}</a>
							</h3>
							<p class="mt-3 line-clamp-3 flex-1 text-[15px] leading-[1.6] text-ink-700">
								{cerita.excerpt}
							</p>
							<p class="mt-4 text-[13px] text-ink-600">
								{cerita.authorName}
								{#if cerita.publishedAt}
									· {formatTanggal(cerita.publishedAt, 'pendek')}
								{/if}
								· {cerita.readMinutes} menit baca
							</p>
						</div>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="mt-8 max-w-[60ch] text-[16px] leading-[1.68] text-ink-700">
				Cerita pertama komunitas belum terbit. Setiap naskah ditulis anggota, ditinjau verifikator,
				dan baru tayang setelah penulisnya menyetujui.
			</p>
		{/if}
	</div>
</section>
