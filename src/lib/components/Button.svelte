<script>
	/**
	 * Button: tombol dasar seluruh aplikasi.
	 *
	 * Props:
	 * @prop {'primary'|'secondary'|'outline'|'ghost'|'danger'|'success'} variant
	 * @prop {'sm'|'md'|'lg'} size
	 * @prop {boolean}  disabled
	 * @prop {boolean}  loading      Menampilkan spinner dan menonaktifkan tombol.
	 * @prop {boolean}  fullWidth
	 * @prop {string}   href         Bila terisi, dirender sebagai <a>.
	 * @prop {'button'|'submit'|'reset'} type
	 * @prop {string}   iconPath     Path ikon dari $lib/data/icons.js.
	 * @prop {'left'|'right'} iconPosition
	 * @prop {string}   ariaLabel    Wajib bila tombol hanya berisi ikon.
	 * @prop {string}   class
	 * @prop {(e: MouseEvent) => void} onclick
	 * @prop {import('svelte').Snippet} children
	 */
	import Icon from './Icon.svelte';
	import { kelas } from './_visual.js';

	let {
		variant = 'primary',
		size = 'md',
		disabled = false,
		loading = false,
		fullWidth = false,
		href = '',
		type = 'button',
		iconPath = '',
		iconPosition = 'left',
		ariaLabel = '',
		class: className = '',
		onclick = undefined,
		children = undefined
	} = $props();

	const DASAR =
		'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100';

	/**
	 * Varian `primary` memakai `pertamina-red-ink` (#B91820), bukan merah brand polos.
	 *
	 * Putih di atas #ED1C24 hanya mencapai 4,38: lolos AA hanya untuk teks besar,
	 * sedangkan ketiga ukuran tombol memakai teks 12–14px yang tergolong teks kecil
	 * dan menuntut 4,5. Sebelumnya hanya ukuran `sm` yang digelapkan, sehingga tombol
	 * `md` dan `lg`: termasuk ajakan utama di halaman publik: tetap di bawah ambang.
	 * `pertamina-red-ink` mencapai 6,53 dan berlaku seragam untuk semua ukuran.
	 *
	 * @see docs/11-VISUAL-DIRECTION.md §9: koreksi kontras tombol primer publik
	 */
	const VARIAN = {
		primary:
			'bg-pertamina-red-ink text-white hover:bg-pertamina-red-dark disabled:bg-ink-200 disabled:text-ink-500',
		secondary:
			'bg-surface border border-ink-200 text-ink-700 hover:bg-ink-50 hover:border-ink-300 disabled:bg-ink-100 disabled:text-ink-450',
		outline:
			'bg-surface border border-pertamina-red text-pertamina-red-ink hover:bg-pertamina-red-tint disabled:border-ink-200 disabled:text-ink-450',
		ghost:
			'text-ink-600 hover:text-heading hover:bg-ink-100 disabled:text-ink-450 disabled:hover:bg-transparent',
		danger: 'bg-danger text-white hover:brightness-95 disabled:bg-ink-200 disabled:text-ink-500',
		success: 'bg-success text-white hover:brightness-95 disabled:bg-ink-200 disabled:text-ink-500'
	};

	/** Tinggi minimum 44px pada `md` dan `lg` memenuhi sasaran sentuh mobile. */
	const UKURAN = {
		sm: 'min-h-9 px-3 py-1.5 text-xs rounded-control',
		md: 'min-h-11 px-4 py-2.5 text-sm rounded-control',
		lg: 'min-h-12 px-6 py-3 text-sm rounded-xl'
	};

	const UKURAN_IKON = { sm: 16, md: 18, lg: 18 };

	const gaya = $derived(
		kelas(
			DASAR,
			VARIAN[variant] ?? VARIAN.primary,
			UKURAN[size] ?? UKURAN.md,
			fullWidth && 'w-full',
			className
		)
	);

	const takAktif = $derived(disabled || loading);
</script>

{#snippet isi()}
	{#if loading}
		<svg
			class="animate-spin"
			width={UKURAN_IKON[size] ?? 18}
			height={UKURAN_IKON[size] ?? 18}
			viewBox="0 0 24 24"
			fill="none"
			aria-hidden="true"
		>
			<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" />
			<path
				class="opacity-90"
				fill="currentColor"
				d="M4 12a8 8 0 0 1 8-8V1C5.9 1 1 5.9 1 12h3Z"
			/>
		</svg>
	{:else if iconPath && iconPosition === 'left'}
		<Icon path={iconPath} size={UKURAN_IKON[size] ?? 18} />
	{/if}

	{#if children}{@render children()}{/if}

	{#if !loading && iconPath && iconPosition === 'right'}
		<Icon path={iconPath} size={UKURAN_IKON[size] ?? 18} />
	{/if}
{/snippet}

{#if href && !takAktif}
	<a {href} class={gaya} aria-label={ariaLabel || undefined} {onclick}>
		{@render isi()}
	</a>
{:else}
	<button
		{type}
		class={gaya}
		disabled={takAktif}
		aria-busy={loading || undefined}
		aria-label={ariaLabel || undefined}
		{onclick}
	>
		{@render isi()}
	</button>
{/if}
