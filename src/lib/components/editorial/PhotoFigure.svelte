<script>
	/**
	 * PhotoFigure — satu-satunya cara foto masuk ke zona publik.
	 *
	 * Tanggung jawab: `<figure>` bersemantik dengan `alt` wajib, `width`/`height`
	 * eksplisit (anti-CLS), keying rule opsional, kapsi, dan baris kredit.
	 *
	 * EMPAT KEPUTUSAN YANG TIDAK TERBACA DARI KODE:
	 *
	 * 1. **Kredit dibaca dari `PHOTOS`, bukan dari `photo-credits.json`.**
	 *    `docs/11` §8.1 menyuruh komponen ini membaca berkas kredit sendiri;
	 *    `docs/12` §8.2 MENCABUTNYA — JSON itu adalah masukan bagi `photos.js`, dan
	 *    tiga jalur kredit yang saling menduplikasi melanggar KP-3. Karena kontrak
	 *    props memberi `src` (jalur) dan bukan kunci manifes, pencarian dilakukan
	 *    terbalik lewat `src`. Peta dibangun sekali di tingkat modul: 28 entri,
	 *    dan membangunnya ulang per instance akan berjalan puluhan kali per halaman.
	 *
	 * 2. **`src` yang tidak dikenal tetap dirender — tanpa baris kredit.** Komponen
	 *    ini juga akan dipakai halaman yang memuat foto di luar manifes; menolak
	 *    merender akan mengubah kelalaian kecil menjadi halaman kosong.
	 *
	 * 3. **`src` kosong ATAU berkasnya gagal dimuat → BLOK TIPOGRAFIS.** Inilah
	 *    cabang yang dituntut `docs/12` §3.3(d) butir 4. Bukan gradien (D-08), bukan
	 *    satu foto default bersama. Dua pemicunya berbeda dan keduanya wajib ada:
	 *    `foto(key) === null` menutup kasus BUILD (slot tidak pernah terunduh),
	 *    `use:pantauGagalMuat` menutup kasus RUNTIME (berkas terhapus atau salah
	 *    nama setelah build). Tanpa yang kedua, gerbang butir 4 hanya benar selama
	 *    tidak ada yang menyentuh `static/img/` — dan itu bukan ketahanan.
	 *
	 * 4. **`priority` mengubah tiga atribut sekaligus.** `loading="lazy"` pada foto
	 *    LCP menunda elemen yang justru diukur; `fetchpriority="high"` tanpa
	 *    mencabut `lazy` tidak berpengaruh apa pun. Keduanya harus berpasangan,
	 *    jadi satu prop yang mengatur keduanya adalah satu-satunya bentuk yang
	 *    tidak bisa dipakai setengah.
	 *
	 * @see docs/12-BUILD-CONTRACT-V2.md — §2.13 kontrak props FINAL, §3.3(d) butir 2 & 4
	 * @see docs/11-VISUAL-DIRECTION.md — §4.1 rasio, §4.3 radius & keying rule, §4.4 kapsi, §4.5 alt
	 */
	import { PHOTOS } from '$lib/data/photos.js';
	import { gayaKeyline, kelas, pantauGagalMuat, rasioFoto } from '../_visual.js';
	import { dev } from '$app/environment';

	/**
	 * @typedef {object} PhotoFigureProps
	 * @property {string} src        Jalur `/img/*.jpg`. Kosong → blok tipografis.
	 * @property {string} alt        WAJIB non-kosong; Bahasa Indonesia; tanpa awalan "Foto/Gambar".
	 * @property {number} width      Piksel intrinsik — dipasang ke atribut `width`.
	 * @property {number} height     Piksel intrinsik — dipasang ke atribut `height`.
	 * @property {'4:5'|'3:2'|'16:9'|'21:9'|'1:1'} ratio
	 * @property {string} [caption]  Kapsi baris 1. Selama foto stok: WAJIB generik.
	 * @property {'red'|'navy'|'green'|'none'} [keyline]
	 * @property {'top'|'left'} [keylinePos]
	 * @property {boolean} [priority]  `true` hanya untuk foto LCP.
	 * @property {string} [srcMobile]  Sumber `<picture>` di bawah 640 px.
	 * @property {string} [class]
	 * @property {string} [fallbackLabel]  Kicker blok tipografis saat `src` kosong.
	 */

	/** @type {PhotoFigureProps} */
	let {
		src = '',
		alt = '',
		width = 0,
		height = 0,
		ratio = '16:9',
		caption = '',
		keyline = 'none',
		keylinePos = 'top',
		priority = false,
		srcMobile = '',
		class: className = '',
		fallbackLabel = 'Dokumentasi menyusul'
	} = $props();

	/**
	 * Peta jalur → entri manifes. Satu-satunya sumber baris kredit komponen ini.
	 * @type {Map<string, import('$lib/data/photos.js').Photo>}
	 */
	const MANIFES_PER_SRC = new Map(Object.values(PHOTOS).map((p) => [p.src, p]));

	/**
	 * Sumber yang terbukti gagal dimuat di peramban. Disimpan sebagai NILAI `src`,
	 * bukan sebagai boolean, supaya penggantian `src` otomatis memulihkan gambar
	 * tanpa efek samping — komponen yang dipakai ulang di dalam `{#each}` tidak
	 * terkunci di cabang tipografis gara-gara sampul sebelumnya yang hilang.
	 */
	let srcGagal = $state('');
	/** `true` bila berkas untuk `src` saat ini tidak dapat dirender peramban. */
	const gagalMuat = $derived(Boolean(src) && srcGagal === src);
	/** Gambar hanya dirender bila ada `src` DAN berkasnya benar-benar termuat. */
	const adaGambar = $derived(Boolean(src) && !gagalMuat);

	const entri = $derived(MANIFES_PER_SRC.get(src) ?? null);
	const credit = $derived(entri?.credit ?? '');
	const gayaRasio = $derived(`aspect-ratio:${rasioFoto(ratio)};`);
	const gayaBar = $derived(gayaKeyline(keyline));
	const adaKeyline = $derived(Boolean(gayaBar));
	// Kredit hanya dicetak bila gambarnya benar-benar tampil: menyebut fotografer
	// di bawah blok tipografis yang tidak memuat foto apa pun adalah keterangan palsu.
	const kreditTampil = $derived(adaGambar ? credit : '');
	const punyaKaki = $derived(Boolean(caption || kreditTampil));

	/**
	 * Bulan Bahasa Indonesia — dipakai mendeteksi kapsi yang mengklaim tanggal.
	 * Tidak diimpor dari `utils/date.js` karena yang dicari di sini adalah TEKS
	 * yang ditulis manusia, bukan tanggal yang diformat mesin.
	 */
	const POLA_BULAN =
		/\b(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+\d{4}\b/;

	$effect(() => {
		if (!dev) return;
		// Alt diwajibkan hanya ketika komponen ini benar-benar merender GAMBAR.
		//
		// Cabang tanpa `src` bukan foto berkapsi kosong: ia adalah blok tipografis
		// yang justru DIPERINTAHKAN keputusan 3 di kepala berkas ini, dan label
		// bacanya datang dari `fallbackLabel`, bukan dari `alt`. Versi sebelumnya
		// menyalakan galat untuk cabang itu juga, sehingga satu cerita yang sah
		// tampil tanpa foto memerahkan `e2e-routes.mjs` lewat galat konsol — gerbang
		// yang menghukum rancangan yang benar. Yang tetap dijaga tidak berubah:
		// begitu ada `src`, `alt` kosong tetap galat.
		if (src && !alt?.trim()) {
			console.error(
				`[PhotoFigure] Prop "alt" kosong untuk "${src}". ` +
					'Alt WAJIB non-kosong di zona publik — P-1 melarang foto dekoratif, jadi kasus ' +
					'alt="" seharusnya nol (docs/11 §4.5).'
			);
		}
		if (src && (!width || !height)) {
			console.error(
				`[PhotoFigure] "${src}" dirender tanpa width/height eksplisit. ` +
					'Keduanya wajib untuk mencegah pergeseran tata letak (docs/12 §3.3(d) butir 2); ' +
					'nilainya ada di manifes sebagai `foto(key).w` dan `.h`.'
			);
		}
		// Penegakan kejujuran stok: selama fotonya belum diganti dokumentasi asli,
		// kapsi DILARANG mengklaim tempat & bulan kegiatan PFfriends yang sesungguhnya.
		// "Cangkringan, Sleman, Juni 2026" pada foto stok adalah keterangan palsu —
		// masalah yang lebih besar daripada terlihat seperti AI (docs/11 §4.4).
		if (entri?.isStock && caption && POLA_BULAN.test(caption)) {
			console.error(
				`[PhotoFigure] Kapsi "${caption}" menyebut bulan & tahun, tetapi "${src}" masih foto stok. ` +
					'Kapsi bertempat-berbulan baru sah setelah berkasnya diganti dokumentasi asli ' +
					'(docs/11 §4.4).'
			);
		}
	});
</script>

<!-- `<figcaption>` WAJIB anak langsung `<figure>`; karena itu bar kiri dan gambar
     dibungkus satu <div> sendiri, bukan figure yang menjadi flex container. -->
<figure class={kelas('m-0', className)}>
	<div class={kelas('min-w-0', adaKeyline && keylinePos === 'left' && 'flex gap-4')}>
		{#if adaKeyline && keylinePos === 'left'}
			<!-- Potret memakai rule KIRI, lanskap memakai rule ATAS (docs/11 §4.3).
			     Bar ini murni dekoratif: maknanya selalu juga tertulis sebagai kata. -->
			<span class="w-1 shrink-0 self-stretch" style={gayaBar} aria-hidden="true"></span>
		{/if}

		<div class="min-w-0 flex-1">
			{#if adaKeyline && keylinePos === 'top'}
				<span class="keyline" style={gayaBar} aria-hidden="true"></span>
			{/if}

			{#if adaGambar}
				<picture>
					{#if srcMobile}
						<source media="(max-width: 639px)" srcset={srcMobile} />
					{/if}
					<img
						{src}
						{alt}
						{width}
						{height}
						class="block h-full w-full max-w-full rounded-photo object-cover"
						style={gayaRasio}
						loading={priority ? 'eager' : 'lazy'}
						fetchpriority={priority ? 'high' : 'auto'}
						decoding={priority ? 'sync' : 'async'}
						use:pantauGagalMuat={() => (srcGagal = src)}
					/>
				</picture>
			{:else}
				<!-- Slot foto kosong diisi TIPOGRAFI, bukan gradien (docs/11 §4.3 butir 4). -->
				<div
					class="flex items-end rounded-photo bg-ink-50 p-5"
					style={gayaRasio}
					role="img"
					aria-label={alt || fallbackLabel}
				>
					<p class="kicker">{fallbackLabel}</p>
				</div>
			{/if}
		</div>
	</div>

	{#if punyaKaki}
		<figcaption class="mt-2.5 border-t border-ink-200 pt-2">
			{#if caption}
				<span class="block text-[13px] leading-[1.45] text-ink-600">{caption}</span>
			{/if}
			{#if kreditTampil}
				<span class="mt-0.5 block text-[11px] leading-[1.4] text-ink-600">{kreditTampil}</span>
			{/if}
		</figcaption>
	{/if}
</figure>
