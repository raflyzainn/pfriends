<script>
	/**
	 * PageHeader: kepala halaman standar seluruh zona.
	 *
	 * Props:
	 * @prop {string} title
	 * @prop {string} subtitle
	 * @prop {string} eyebrow   Label mikro di atas judul.
	 * @prop {string} backHref
	 * @prop {string} backLabel
	 * @prop {import('svelte').Snippet} actions  Tombol aksi di sisi kanan.
	 *
	 * Satu `<h1>` per halaman berasal dari sini: halaman tidak boleh menuliskan
	 * `<h1>` kedua, agar hierarki heading tetap berurutan.
	 *
	 * MITIGASI WAJIB `--font-display`: jangan dihapus tanpa membaca ini.
	 *
	 * Komponen ini adalah kepala halaman SELURUH zona ter-login: `/awardee`,
	 * `/verifikator`, `/admin`. Setelah `app.css` mengganti `--font-display`
	 * menjadi Fraunces (daftar putih `docs/12` §3.4 butir 4), setiap `<h1>` yang
	 * mewarisi token itu akan berpindah ke serif: dan `docs/11` §3.4 menetapkan
	 * judul ketiga zona itu TETAP Plus Jakarta: panel kerja ber-serif display
	 * terbaca lambat dan boros ruang.
	 *
	 * `app.css` sudah mencabut `font-family` dari selektor `h1…h4` global
	 * (butir 8), jadi pewarisan itu tidak lagi terjadi lewat jalur mana pun. Kelas
	 * `font-sans` di bawah adalah lapis kedua yang disengaja: ia membuat komponen
	 * ini benar sendiri, tanpa bergantung pada satu baris di berkas lain yang
	 * dapat berubah tanpa satu gerbang pun berubah merah.
	 *
	 * @see docs/12-BUILD-CONTRACT-V2.md: §3.3(a) baris PageHeader, §3.3(d) butir 8
	 * @see docs/11-VISUAL-DIRECTION.md: §3.2 "jebakan regresi", §3.4 batas zona
	 */
	import Icon from './Icon.svelte';
	import { ICONS } from '$lib/data/icons.js';

	let {
		title = '',
		subtitle = '',
		eyebrow = '',
		backHref = '',
		backLabel = 'Kembali',
		actions = undefined
	} = $props();
</script>

<div class="mb-6">
	{#if backHref}
		<a
			href={backHref}
			class="mb-3 inline-flex min-h-11 items-center gap-1.5 text-sm text-ink-600 transition-colors hover:text-pertamina-red-ink"
		>
			<Icon path={ICONS.arrowLeft} size={16} />
			{backLabel}
		</a>
	{/if}

	<div class="flex flex-wrap items-start justify-between gap-3 sm:gap-4">
		<div class="min-w-0 flex-1">
			{#if eyebrow}
				<p class="label-micro mb-1.5">{eyebrow}</p>
			{/if}
			<h1 class="font-sans text-2xl font-bold tracking-[-0.02em] md:text-[28px]">{title}</h1>
			{#if subtitle}
				<p class="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-600">{subtitle}</p>
			{/if}
		</div>

		{#if actions}
			<div class="flex w-full shrink-0 flex-wrap gap-2 sm:w-auto">
				{@render actions()}
			</div>
		{/if}
	</div>
</div>
