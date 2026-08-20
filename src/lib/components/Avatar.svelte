<script>
	/**
	 * Avatar: potret anggota, atau inisial bila tidak ada foto.
	 *
	 * Props:
	 * @prop {string} name    Dipakai untuk inisial dan teks alternatif.
	 * @prop {string} src     URL gambar; kosong → inisial.
	 * @prop {'xs'|'sm'|'md'|'lg'|'xl'} size
	 * @prop {string} tier    Kode tier untuk warna cincin.
	 * @prop {boolean} showRing
	 * @prop {'online'|'offline'|''} status
	 * @prop {string} class
	 *
	 * Cincin tier adalah salah satu dari sedikit tempat warna tier polos memang
	 * tepat: ia tidak pernah menyentuh glyph, sehingga tidak terikat syarat kontras teks.
	 *
	 * KEPUTUSAN V2: INISIAL DIPERTAHANKAN, DAN ITU BUKAN KEKURANGAN.
	 *
	 * Usulan enam `avatar-0X.jpg` sebagai placeholder byline DITOLAK di
	 * `docs/11` §4.6, dan manifes foto karena itu sengaja tidak memuat satu pun
	 * berkas wajah. Alasannya bukan estetika: byline "Wulan Panjaitan" dengan foto
	 * orang asing adalah pernyataan palsu tentang manusia yang dapat
	 * diidentifikasi, dan tangkapan layar mockup SELALU bocor ke deck presentasi :
	 * penanda `isPlaceholderPhoto` tidak ikut terbawa ke dalam PNG. Koran cetak
	 * juga memakai nama tanpa foto. Kemanusiaan halaman dibawa oleh foto KEGIATAN,
	 * tempat tidak ada satu nama pun yang ditempelkan.
	 *
	 * Prop `src` tetap ada dan tetap dihormati: ia menunggu dokumentasi asli
	 * beserta persetujuan tertulis publikasi nama + wajah
	 * (`docs/04-ESG-GOVERNANCE.md` §4.3, `publikasi_nama` default OFF).
	 *
	 * `font-sans` dipasang eksplisit pada inisial. Setelah `--font-display`
	 * berganti menjadi Fraunces, inisial dua huruf pada 10–20 px adalah persis
	 * ukuran tempat serif display terbaca sebagai kesalahan, bukan sebagai pilihan.
	 *
	 * @see docs/11-VISUAL-DIRECTION.md: §4.6 keputusan avatar
	 */
	import { inisial } from '$lib/utils/format.js';
	import { gayaTier, kelas, pantauGagalMuat } from './_visual.js';

	let {
		name = '',
		src = '',
		size = 'md',
		tier = '',
		showRing = false,
		status = '',
		class: className = ''
	} = $props();

	const UKURAN = {
		xs: 'h-6 w-6 text-[10px]',
		sm: 'h-8 w-8 text-xs',
		md: 'h-10 w-10 text-sm',
		lg: 'h-14 w-14 text-base',
		xl: 'h-20 w-20 text-xl'
	};

	/**
	 * Sisi kotak dalam piksel untuk setiap ukuran: angka yang sama dengan kelas
	 * `h-*`/`w-*` di atas. Dipasang sebagai atribut `width`/`height` supaya avatar
	 * berfoto tidak menggeser tata letak sebelum gambarnya tiba, sesuai gerbang
	 * `docs/12` §3.3(d) butir 2 yang berlaku untuk SETIAP `<img>`, bukan hanya
	 * untuk foto manifes.
	 * @type {Readonly<Record<string, number>>}
	 */
	const SISI_PX = Object.freeze({ xs: 24, sm: 32, md: 40, lg: 56, xl: 80 });

	const UKURAN_STATUS = {
		xs: 'h-1.5 w-1.5',
		sm: 'h-2 w-2',
		md: 'h-2.5 w-2.5',
		lg: 'h-3 w-3',
		xl: 'h-3.5 w-3.5'
	};

	const visual = $derived(gayaTier(tier));
	const huruf = $derived(inisial(name));
	const gayaCincin = $derived(
		showRing && visual ? `box-shadow:0 0 0 2px var(--color-surface),0 0 0 4px ${visual.color};` : ''
	);
	const sisi = $derived(SISI_PX[size] ?? SISI_PX.md);

	/**
	 * Ketahanan runtime: avatar yang berkasnya hilang jatuh ke inisial: cabang
	 * yang sudah ada di bawah: bukan ke ikon gambar rusak berbentuk lingkaran.
	 */
	let srcGagal = $state('');
	const adaGambar = $derived(Boolean(src) && srcGagal !== src);
</script>

<span class={kelas('relative inline-flex shrink-0', className)}>
	{#if adaGambar}
		<!-- Alt tanpa awalan "Foto": pembaca layar sudah mengumumkan elemennya
		     sebagai gambar (docs/11 §4.5). -->
		<img
			{src}
			alt={name || ''}
			width={sisi}
			height={sisi}
			loading="lazy"
			decoding="async"
			class={kelas(
				'max-w-full rounded-chip object-cover bg-ink-100',
				UKURAN[size] ?? UKURAN.md,
				showRing && 'm-1'
			)}
			style={gayaCincin}
			use:pantauGagalMuat={() => (srcGagal = src)}
		/>
	{:else}
		<span
			class={kelas(
				'inline-flex items-center justify-center rounded-chip bg-ink-100 font-sans font-semibold text-ink-600 select-none',
				UKURAN[size] ?? UKURAN.md,
				showRing && 'm-1'
			)}
			style={gayaCincin}
			aria-hidden={name ? undefined : 'true'}
			title={name || undefined}
		>
			{huruf}
		</span>
	{/if}

	{#if status}
		<span
			class={kelas(
				'absolute right-0 bottom-0 rounded-full ring-2 ring-white',
				UKURAN_STATUS[size] ?? UKURAN_STATUS.md,
				status === 'online' ? 'bg-pertamina-green' : 'bg-ink-400'
			)}
			title={status === 'online' ? 'Sedang aktif' : 'Tidak aktif'}
		></span>
	{/if}
</span>
