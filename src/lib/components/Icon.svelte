<script>
	/**
	 * Icon — SVG stroke sebaris bergaya Heroicons Outline.
	 *
	 * Props:
	 * @prop {string}  path        Atribut `d`, diambil dari `$lib/data/icons.js`.
	 * @prop {number}  size        Sisi ikon dalam piksel (14 | 16 | 18 | 20 | 24 | 40).
	 * @prop {number}  strokeWidth Ketebalan garis.
	 * @prop {string}  class       Kelas tambahan.
	 * @prop {string}  title       Bila diisi, ikon menjadi gambar bermakna dengan nama aksesibel.
	 *
	 * Ikon TIDAK PERNAH menetapkan warnanya sendiri — selalu mewarisi `currentColor`
	 * dari induk. Tanpa aturan ini, mustahil menjamin pasangan kontras teks/ikon.
	 */
	let { path = '', size = 20, strokeWidth = 1.8, class: className = '', title = '' } = $props();
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width={strokeWidth}
	stroke-linecap="round"
	stroke-linejoin="round"
	width={size}
	height={size}
	class={className}
	role={title ? 'img' : 'presentation'}
	aria-hidden={title ? undefined : 'true'}
	aria-label={title || undefined}
>
	{#if title}<title>{title}</title>{/if}
	<path d={path} />
</svg>
