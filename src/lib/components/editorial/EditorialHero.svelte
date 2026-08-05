<script module>
	/**
	 * INVARIAN OVERLAY — konstanta modul, sengaja TIDAK dapat dioper lewat props.
	 *
	 * Opasitas navy tidak pernah turun di bawah 0.88 di mana pun teks putih berdiri.
	 * Kasus terburuk yang mungkin adalah foto putih polos di bawah teks; pada 0.88
	 * warna efektifnya `#1F507F` dan di atasnya putih 7.64:1, putih/88 6.34:1,
	 * putih/75 5.09:1 — ketiganya lolos AA untuk teks kecil (docs/11 §10.3).
	 * Menjadikannya prop berarti satu halaman mana pun bisa menurunkannya dan
	 * memecahkan kontras tanpa satu gerbang pun berubah merah — itulah sebabnya
	 * nilai ini hidup di sini, bukan di daftar props (docs/12 §2.13).
	 *
	 * KOREKSI GERBANG G3-A. Stop tengah versi pertama (`0.86` di 34%, `0.55` di 58%)
	 * MELANGGAR invarian yang ditulis kalimat pertama blok ini. Kolom teks adalah
	 * `lg:col-span-6` di dalam `max-w-7xl`, sehingga tepi kanannya mendarat di
	 * ~48–49% lebar viewport pada setiap lebar layar ≥1024 px — bukan di 34%.
	 * Rasio sungguhan di tepi itu: standfirst putih/88 3.75:1 dan byline putih/75
	 * 4.07:1, keduanya GAGAL AA. Stop dipindah ke `0.88` sampai 50% agar seluruh
	 * kolom teks berdiri di atas opasitas penuh; peluruhan ke 0.15 tetap terjadi
	 * di paruh kanan, tempat subjek foto berada.
	 *
	 * Gradasi horizontal E1: pekat di kiri (zona teks), nyaris bening di kanan —
	 * di sanalah subjek foto harus jatuh. Asimetri itu adalah rancangannya, bukan
	 * kelalaian. Bila crop meleset, GANTI FOTONYA; jangan menambah overlay.
	 * @type {string}
	 */
	const OVERLAY_GRADIENT =
		'linear-gradient(90deg, rgb(0 62 126 / 0.88) 0%, rgb(0 62 126 / 0.88) 50%, rgb(0 62 126 / 0.55) 66%, rgb(0 62 126 / 0.15) 100%)';

	/** Overlay rata untuk pita penutup dan latar CTA: teksnya di tengah, jadi tidak bergradasi. */
	const OVERLAY_FLAT = 'linear-gradient(90deg, rgb(0 62 126 / 0.88) 0%, rgb(0 62 126 / 0.88) 100%)';

	/**
	 * Overlay rata 0.86 untuk tata letak SATU KOLOM — pada satu kolom, gradasi
	 * horizontal memotong judul.
	 *
	 * KOREKSI GERBANG G3-A. Versi pertama menukar overlay ini dengan gradien di
	 * breakpoint `sm` (640 px), padahal grid baru berubah menjadi dua kolom di
	 * `lg` (1024 px). Di pita 640–1023 px teks karena itu melebar penuh DI ATAS
	 * gradien: standfirst putih/88 jatuh ke 2.87:1. Titik tukar overlay kini
	 * mengikuti titik tukar tata letak, `lg`, bukan `sm`.
	 */
	const OVERLAY_MOBILE = 'linear-gradient(90deg, rgb(0 62 126 / 0.86) 0%, rgb(0 62 126 / 0.86) 100%)';

	/**
	 * Ambang foto potret — SATU sumber kebenaran untuk `<source media>` dan untuk
	 * `matchMedia` yang menukar `alt`. Dua string yang harus selalu sama adalah
	 * cacat yang menunggu terjadi: begitu salah satu berubah, alt yang diumumkan
	 * tidak lagi menggambarkan foto yang tampil, dan tidak ada gerbang yang merah.
	 * @type {string}
	 */
	const MEDIA_POTRET = '(max-width: 639px)';
</script>

<script>
	/**
	 * EditorialHero — hero foto lebar penuh dengan overlay navy yang benar.
	 *
	 * Tanggung jawab: E1 beranda, pita penutup E7, hero `/tentang`, hero `/komunitas`.
	 * Menggantikan hero yang hari ini ditulis langsung di dalam `+page.svelte` dan
	 * karena itu tidak dapat dipakai ulang.
	 *
	 * LIMA KEPUTUSAN YANG TIDAK TERBACA DARI KODE:
	 *
	 * 1. **`image` dan `imageMobile` adalah KUNCI MANIFES, bukan jalur berkas.**
	 *    Kontrak §2.13 menyatakan kredit dibaca komponen lewat `foto(key).credit`
	 *    dan BUKAN dioper sebagai prop — itu hanya mungkin bila komponen memegang
	 *    kuncinya. Contoh: `image="hero-komunitas"`.
	 *
	 * 2. **`foto(image) === null` ATAU berkasnya gagal dimuat → hero TETAP TAMPIL,
	 *    sebagai pita navy tipografis.** Bukan `<img>` rusak, bukan gradien
	 *    dekoratif. Halaman harus tetap layak tanpa satu foto pun (risiko R-13
	 *    `docs/12` §7). Latar `bg-pertamina-navy` pada `<section>` membuat cabang
	 *    ini aman tanpa overlay: putih di atas `#003E7E` = 10.55:1.
	 *
	 * 3. **`alt` diwajibkan sebagai PROP walau manifes sudah memuatnya.** Foto yang
	 *    sama dipakai di dua konteks berbeda menuntut alt yang berbeda; nilai
	 *    manifes hanya menjadi cadangan bila prop dikosongkan.
	 *
	 * 4. **Kapsi berdiri di atas SCRIM LOKALNYA SENDIRI.** `docs/11` §6 E1
	 *    menempatkan kapsi di kanan bawah — tepat di zona overlay 0.15, tempat
	 *    teks putih apa pun GAGAL kontras. Scrim navy 0.88 di belakang blok kapsi
	 *    memulihkan penempatan yang dirancang tanpa mengorbankan keterbacaan:
	 *    putih/88 di atasnya 6.36:1 ✓.
	 *
	 * 5. **Foto hero adalah LCP.** `priority` di-hardcode `true` di sini —
	 *    `fetchpriority="high"`, tanpa `loading="lazy"`. Sebuah hero yang di-lazy
	 *    menunda persis elemen yang sedang diukur.
	 *
	 * @see docs/12-BUILD-CONTRACT-V2.md — §2.13 kontrak props FINAL
	 * @see docs/11-VISUAL-DIRECTION.md — §6 E1, §8.8, §4.2 nilai overlay, §10.3 kontras
	 */
	import { foto } from '$lib/data/photos.js';
	import { kelas, pantauGagalMuat } from '../_visual.js';

	/**
	 * @typedef {object} HeroAksi
	 * @property {string} label
	 * @property {string} href
	 */

	/**
	 * @typedef {object} EditorialHeroProps
	 * @property {string} image        Kunci manifes foto lanskap, mis. `'hero-komunitas'`.
	 * @property {string} imageMobile  Kunci manifes foto potret untuk <640 px.
	 * @property {string} alt          WAJIB non-kosong.
	 * @property {string} [altMobile]  Kosong → memakai `alt`.
	 * @property {string} kicker
	 * @property {string} title        Penggalan baris manual lewat `\n`.
	 * @property {string} standfirst
	 * @property {HeroAksi} primary    Tombol utama.
	 * @property {HeroAksi} [secondary]
	 * @property {string} [byline]
	 * @property {string} caption      Kapsi foto; selama stok WAJIB generik.
	 * @property {'gradient'|'flat'} [overlay]  Memilih ANTARA dua konstanta internal;
	 *                                          tidak dapat mengoper nilai opasitas.
	 * @property {'tall'|'short'} [height]
	 * @property {string} [class]
	 */

	/** @type {EditorialHeroProps} */
	let {
		image = '',
		imageMobile = '',
		alt = '',
		altMobile = '',
		kicker = '',
		title = '',
		standfirst = '',
		primary = undefined,
		secondary = undefined,
		byline = '',
		caption = '',
		overlay = 'gradient',
		height = 'tall',
		class: className = ''
	} = $props();

	const utama = $derived(foto(image));
	const mobil = $derived(foto(imageMobile));

	/**
	 * Ketahanan runtime (`docs/12` §3.3(d) butir 4). `foto(key) === null` menutup
	 * kasus build; nilai ini menutup kasus berkas yang hilang SETELAH build. Hero
	 * yang gagal memuat fotonya berubah menjadi pita navy tipografis — persis
	 * cabang yang sudah ada untuk `utama === null` — bukan ikon gambar rusak
	 * setinggi 640 px di puncak halaman.
	 */
	let srcGagal = $state('');
	/** `true` bila foto hero benar-benar dapat dirender. */
	const adaGambar = $derived(Boolean(utama) && srcGagal !== utama.src);

	const altUtama = $derived(alt || utama?.alt || '');
	const altMobil = $derived(altMobile || altUtama);

	/**
	 * KOREKSI GERBANG G3-A — `altMobile` tadinya prop mati.
	 *
	 * `<picture>` hanya memiliki SATU atribut `alt`, milik `<img>`-nya; `<source>`
	 * tidak menerima `alt`. Versi pertama menghitung `altMobil` lalu tidak pernah
	 * memakainya, sehingga prop yang dijanjikan kontrak §2.13 secara struktural
	 * tidak dapat berpengaruh: pembaca layar di ponsel mengumumkan deskripsi foto
	 * LANSKAP untuk foto POTRET yang sebenarnya tampil — dan tidak ada gerbang
	 * yang berubah merah karenanya.
	 *
	 * Dua `<img>` yang saling disembunyikan `hidden` bukan jalan keluarnya:
	 * peramban tetap mengunduh keduanya dan hero — satu-satunya elemen LCP
	 * halaman — membayar dua kali. Yang dipakai: tetap satu `<img>`, `alt`-nya
	 * ditukar mengikuti media query yang SAMA dengan `<source>` (`MEDIA_POTRET`).
	 *
	 * Nilai awal `false` sengaja: prerender adapter-static tidak punya viewport,
	 * dan alt lanskap adalah cadangan yang benar sampai hidrasi mengoreksinya.
	 */
	let potretAktif = $state(false);
	$effect(() => {
		if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
		const mq = window.matchMedia(MEDIA_POTRET);
		const sinkron = () => (potretAktif = mq.matches);
		sinkron();
		mq.addEventListener('change', sinkron);
		return () => mq.removeEventListener('change', sinkron);
	});

	/** Alt yang benar-benar dipasang: mengikuti berkas yang benar-benar dipilih peramban. */
	const altTampil = $derived(potretAktif && mobil ? altMobil : altUtama);

	const kapsi = $derived(adaGambar ? caption || utama?.caption || '' : '');
	const kredit = $derived(adaGambar ? (utama?.credit ?? '') : '');

	/** Judul digal baris manual: satu `\n` = satu baris, bukan pembungkusan otomatis. */
	const barisJudul = $derived(String(title).split('\n').filter(Boolean));

	const tinggi = $derived(
		height === 'short'
			? 'min-h-[clamp(280px,34vw,380px)]'
			: 'min-h-[clamp(440px,58vw,640px)]'
	);

	const gayaOverlay = $derived(overlay === 'flat' ? OVERLAY_FLAT : OVERLAY_GRADIENT);
</script>

<section class={kelas('relative isolate w-full overflow-hidden bg-pertamina-navy', className)}>
	<!-- Keying rule merah tepi atas — penanda "program & institusi" (docs/11 §4.3). -->
	<span
		class="keyline absolute inset-x-0 top-0 z-20 bg-pertamina-red"
		aria-hidden="true"
	></span>

	{#if adaGambar}
		<picture>
			{#if mobil}
				<source media={MEDIA_POTRET} srcset={mobil.src} />
			{/if}
			<img
				src={utama.src}
				alt={altTampil}
				width={utama.w}
				height={utama.h}
				loading="eager"
				fetchpriority="high"
				decoding="sync"
				class="absolute inset-0 -z-10 h-full w-full max-w-full object-cover"
				use:pantauGagalMuat={() => (srcGagal = utama.src)}
			/>
		</picture>

		<!-- Overlay: multiply agar warna asli foto bertahan; tanpa duotone, tanpa blur.
		     Titik tukar `lg` mengikuti `lg:grid-cols-12` di bawah — selama tata
		     letaknya satu kolom, overlaynya WAJIB rata. -->
		<span
			class="absolute inset-0 -z-10 hidden lg:block"
			style={`background-image:${gayaOverlay};mix-blend-mode:multiply;`}
			aria-hidden="true"
		></span>
		<span
			class="absolute inset-0 -z-10 block lg:hidden"
			style={`background-image:${OVERLAY_MOBILE};mix-blend-mode:multiply;`}
			aria-hidden="true"
		></span>
	{/if}

	<!-- Hidden alt untuk kasus foto tidak tersedia: pita tetap punya makna,
	     tetapi tidak berpura-pura memuat gambar. -->
	<div class={kelas('mx-auto flex max-w-7xl px-4 sm:px-6 lg:px-8', tinggi)}>
		<div class="flex w-full flex-col justify-end pt-24 pb-16 sm:pb-[72px]">
			<div class="grid grid-cols-1 gap-8 lg:grid-cols-12">
				<div class="min-w-0 lg:col-span-6">
					{#if kicker}
						<p class="flex items-center gap-3">
							<span class="inline-block h-1 w-6 shrink-0 bg-pertamina-red" aria-hidden="true"></span>
							<span
								class="font-mono text-[11px] leading-none font-medium tracking-[0.08em] text-white uppercase"
							>
								{kicker}
							</span>
						</p>
					{/if}

					{#if barisJudul.length}
						<h1
							class={kelas(
								'display-editorial mt-6 text-white',
								height === 'short'
									? 'text-[clamp(28px,4.2vw,40px)]'
									: 'text-[clamp(32px,5.4vw,68px)]'
							)}
						>
							{#each barisJudul as baris (baris)}
								<span class="block">{baris}</span>
							{/each}
						</h1>
					{/if}

					{#if standfirst}
						<p class="mt-6 max-w-[46ch] text-[18px] leading-[1.55] text-white/88">
							{standfirst}
						</p>
					{/if}

					{#if primary || secondary}
						<div class="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
							{#if primary}
								<!-- Latar #B91820 (pertamina-red-ink), BUKAN #ED1C24: putih di atas
								     merah polos hanya 4.38 dan Button memakai 14–16px semibold, yang
								     belum memenuhi definisi "teks besar" WCAG (docs/11 §10.4). -->
								<a
									href={primary.href}
									class="inline-flex min-h-11 items-center rounded-control bg-pertamina-red-ink px-6 text-[15px] font-semibold text-white transition-colors hover:bg-pertamina-red-dark"
								>
									{primary.label}
								</a>
							{/if}
							{#if secondary}
								<a
									href={secondary.href}
									class="inline-flex min-h-11 items-center text-[15px] font-medium text-white underline underline-offset-4 transition-opacity hover:opacity-80"
								>
									{secondary.label}
								</a>
							{/if}
						</div>
					{/if}

					{#if byline}
						<p class="mt-8 max-w-[46ch] text-[13px] leading-[1.5] text-white/75">{byline}</p>
					{/if}
				</div>

				{#if kapsi || kredit}
					<!-- Kapsi di kanan bawah, di atas scrim lokalnya sendiri. Lihat keputusan 4. -->
					<div class="min-w-0 lg:col-span-5 lg:col-start-8 lg:self-end">
						<p
							class="inline-block max-w-[34ch] px-3 py-2 text-right text-[13px] leading-[1.45] text-white/88"
							style="background:rgb(0 62 126 / 0.88);"
						>
							{#if kapsi}<span class="block">{kapsi}</span>{/if}
							{#if kredit}<span class="mt-0.5 block text-[11px] leading-[1.4]">{kredit}</span>{/if}
						</p>
					</div>
				{/if}
			</div>
		</div>
	</div>
</section>
