<script>
	/**
	 * PullQuote — kutipan tarik di dalam artikel.
	 *
	 * Tanggung jawab: pemecah ritme utama halaman panjang. Yang membedakan kutipan
	 * dari paragraf di sini adalah rule kiri 4 px, Fraunces 24 px, dan ruang putih —
	 * BUKAN glyph tanda kutip raksasa. Glyph dekoratif itu adalah tanda template
	 * yang setara dengan blob blur, dan `docs/11` §8.7 melarangnya secara eksplisit.
	 *
	 * DUA KEPUTUSAN YANG TIDAK TERBACA DARI KODE:
	 *
	 * 1. **`<blockquote>` + `<cite>`, bukan `<div>` bergaya.** Pembaca layar
	 *    mengumumkan kutipan sebagai kutipan, dan atribusinya terbaca sebagai
	 *    sumber. Gaya visual bisa ditiru; semantik tidak.
	 *
	 * 2. **`variant='pulled'` hanya keluar ke talang pada ≥1024 px.** Di bawah itu
	 *    tidak ada talang untuk ditempati, dan margin negatif akan memotong teks
	 *    di tepi layar.
	 *
	 * 3. **Setiap anak ditempatkan EKSPLISIT pada grid, dan barisnya dideklarasikan.**
	 *    Tanpa `grid-rows` eksplisit, `row-[1/-1]` pada rule kiri menciut menjadi
	 *    satu baris: di grid implisit, garis `-1` menunjuk tepi grid EKSPLISIT yang
	 *    saat itu belum ada. Penempatan otomatis lalu melempar `<figcaption>` ke sel
	 *    kosong berikutnya — kolom rule selebar 4 px — dan atribusi kutipan patah
	 *    satu kata per baris. Cacat ini lolos seluruh gerbang karena markup,
	 *    semantik, dan kontrak propsnya semua benar; yang salah hanya geometri
	 *    terender, dan tidak ada gerbang yang mengukurnya.
	 *
	 * @see docs/12-BUILD-CONTRACT-V2.md — §2.13 kontrak props FINAL
	 * @see docs/11-VISUAL-DIRECTION.md — §8.7 tanggung jawab & larangan
	 */
	import { gayaKeyline, kelas } from '../_visual.js';

	/**
	 * @typedef {object} PullQuoteProps
	 * @property {string} quote
	 * @property {string} [attribution]  Nama + keterangan orang; tanpa tier, tanpa poin.
	 * @property {'navy'|'red'|'green'} [keyline]
	 * @property {'inline'|'pulled'} [variant]
	 * @property {string} [class]
	 */

	/** @type {PullQuoteProps} */
	let {
		quote = '',
		attribution = '',
		keyline = 'navy',
		variant = 'inline',
		class: className = ''
	} = $props();

	const gayaBar = $derived(gayaKeyline(keyline) || gayaKeyline('navy'));
</script>

<!-- Grid dua baris eksplisit, bukan flex bersarang: `<figcaption>` wajib anak
     LANGSUNG `<figure>`, sementara rule 4 px harus membentang setinggi kutipan
     + atribusinya. Kolom & baris setiap anak ditulis tegas — lihat keputusan 3. -->
<figure
	class={kelas('my-10 grid grid-cols-[4px_minmax(0,1fr)] grid-rows-[auto_auto] gap-x-5', className)}
	class:kutipan-tertarik={variant === 'pulled'}
>
	<span class="col-start-1 row-[1/-1] self-stretch" style={gayaBar} aria-hidden="true"></span>

	<blockquote
		class="display-editorial col-start-2 row-start-1 min-w-0 max-w-[34ch] text-[24px] leading-[1.20] text-heading"
	>
		{quote}
	</blockquote>

	{#if attribution}
		<figcaption
			class="col-start-2 row-start-2 mt-4 min-w-0 max-w-[46ch] text-[14px] leading-[1.5] text-ink-600"
		>
			<cite class="not-italic">{attribution}</cite>
		</figcaption>
	{/if}
</figure>

<style>
	/**
	 * Tarikan ke talang, DIBATASI oleh talang yang sungguh-sungguh ada.
	 *
	 * Versi sebelumnya menarik 4rem tetap (`lg:-ml-16`) begitu lebar layar
	 * mencapai 1024 px. Padahal pada 1024–1408 px kolom teks zona publik belum
	 * punya talang selebar itu: kontainernya `max-w-7xl` (80rem) dengan padding
	 * `lg:px-8` (2rem), sehingga ruang kiri yang tersedia baru 2rem. Akibatnya
	 * kutipan meluber 32 px ke luar layar dan huruf pertama tiap barisnya
	 * terpotong — terukur pada 1024, 1100, dan 1280 px. Cacat itu lolos seluruh
	 * gerbang karena tidak ada yang mengukur geometri terender.
	 *
	 * Rumusnya: talang = padding kontainer + separuh sisa lebar di luar pagu
	 * 80rem, dikurangi 1rem kelonggaran batang gulir (batang gulir tidak ikut
	 * terhitung pada `100vw`, sehingga tanpa potongan ini titik peralihannya
	 * meleset beberapa piksel). `min()` membuat tarikan tidak pernah melampaui
	 * talangnya, dan efeknya tumbuh mulus sampai penuh 4rem pada layar lebar —
	 * bukan melompat di satu titik henti.
	 */
	@media (min-width: 1024px) {
		.kutipan-tertarik {
			--talang-kiri: max(0rem, calc((100vw - 80rem - 1rem) / 2));
			--tarikan: min(4rem, calc(2rem + var(--talang-kiri)));
			margin-left: calc(-1 * var(--tarikan));
			width: calc(100% + var(--tarikan));
		}
	}
</style>
