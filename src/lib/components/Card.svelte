<script>
	/**
	 * Card: permukaan dasar seluruh konten.
	 *
	 * Props:
	 * @prop {'default'|'flush'|'interactive'|'highlight'} variant
	 * @prop {'none'|'sm'|'md'|'lg'} padding
	 * @prop {boolean} shadow
	 * @prop {string}  accent  Warna garis aksen kiri 2px (nilai CSS, mis. warna tier).
	 * @prop {string}  href    Bila terisi, kartu menjadi tautan.
	 * @prop {string}  class
	 * @prop {(e: MouseEvent) => void} onclick
	 * @prop {import('svelte').Snippet} children
	 */
	import { kelas } from './_visual.js';

	let {
		variant = 'default',
		padding = 'md',
		shadow = true,
		accent = '',
		href = '',
		class: className = '',
		onclick = undefined,
		children = undefined
	} = $props();

	const VARIAN = {
		default: 'bg-surface border border-ink-100 rounded-card',
		flush: 'bg-surface border border-ink-100 rounded-card overflow-hidden',
		interactive:
			'bg-surface border border-ink-100 rounded-card transition-all duration-200 hover:border-ink-200 hover:shadow-card-hover cursor-pointer',
		highlight: 'bg-pertamina-red-tint/30 border border-pertamina-red/30 rounded-card'
	};

	const PADDING = { none: '', sm: 'p-4', md: 'p-5', lg: 'p-6' };

	const gaya = $derived(
		kelas(
			VARIAN[variant] ?? VARIAN.default,
			PADDING[padding] ?? PADDING.md,
			shadow && variant !== 'flush' && 'shadow-card',
			className
		)
	);

	const gayaAksen = $derived(accent ? `border-left:2px solid ${accent};` : '');
</script>

{#if href}
	<a {href} class={kelas(gaya, 'block')} style={gayaAksen} {onclick}>
		{#if children}{@render children()}{/if}
	</a>
{:else if onclick}
	<button type="button" class={kelas(gaya, 'block w-full text-left')} style={gayaAksen} {onclick}>
		{#if children}{@render children()}{/if}
	</button>
{:else}
	<div class={gaya} style={gayaAksen}>
		{#if children}{@render children()}{/if}
	</div>
{/if}
