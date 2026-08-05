<script>
	/**
	 * StatusBadge — pil status semantik.
	 *
	 * Props:
	 * @prop {string} label
	 * @prop {'red'|'blue'|'navy'|'green'|'amber'|'slate'|'purple'} color
	 * @prop {'sm'|'md'} size
	 * @prop {'soft'|'solid'|'outline'} variant
	 * @prop {boolean} withDot
	 * @prop {string}  iconPath
	 * @prop {string}  title  Penjelasan tambahan sebagai tooltip.
	 *
	 * Warna polos hanya menyentuh titik penanda; seluruh glyph memakai varian
	 * `-ink` yang lolos AA. Varian `solid` sengaja hanya disediakan untuk warna
	 * yang mampu menopang teks putih.
	 */
	import Icon from './Icon.svelte';
	import { kelas } from './_visual.js';

	let {
		label = '',
		color = 'slate',
		size = 'md',
		variant = 'soft',
		withDot = false,
		iconPath = '',
		title = ''
	} = $props();

	const WARNA = {
		red: {
			soft: 'bg-pertamina-red-tint text-pertamina-red-ink border-pertamina-red/25',
			solid: 'bg-pertamina-red-dark text-white border-transparent',
			outline: 'bg-transparent text-pertamina-red-ink border-pertamina-red/50',
			dot: 'bg-pertamina-red'
		},
		blue: {
			soft: 'bg-info-tint text-info border-info/25',
			solid: 'bg-info text-white border-transparent',
			outline: 'bg-transparent text-info border-info/50',
			dot: 'bg-info'
		},
		navy: {
			soft: 'bg-pertamina-navy-tint text-pertamina-navy border-pertamina-navy/25',
			solid: 'bg-pertamina-navy text-white border-transparent',
			outline: 'bg-transparent text-pertamina-navy border-pertamina-navy/50',
			dot: 'bg-pertamina-navy'
		},
		green: {
			soft: 'bg-pertamina-green-tint text-pertamina-green-ink border-pertamina-green/25',
			solid: 'bg-success text-white border-transparent',
			outline: 'bg-transparent text-pertamina-green-ink border-pertamina-green/50',
			dot: 'bg-pertamina-green'
		},
		amber: {
			soft: 'bg-warning-tint text-warning border-warning/25',
			solid: 'bg-warning text-white border-transparent',
			outline: 'bg-transparent text-warning border-warning/50',
			dot: 'bg-tier-champion'
		},
		slate: {
			soft: 'bg-ink-100 text-ink-600 border-ink-200',
			solid: 'bg-ink-600 text-white border-transparent',
			outline: 'bg-transparent text-ink-600 border-ink-450',
			dot: 'bg-ink-400'
		},
		purple: {
			soft: 'bg-esg-g-tint text-esg-g-ink border-esg-g/25',
			solid: 'bg-esg-g text-white border-transparent',
			outline: 'bg-transparent text-esg-g-ink border-esg-g/50',
			dot: 'bg-esg-g'
		}
	};

	const UKURAN = {
		sm: 'text-[10px] px-2 py-0.5 gap-1',
		md: 'text-xs px-2.5 py-1 gap-1.5'
	};

	const cfg = $derived(WARNA[color] ?? WARNA.slate);
	const gaya = $derived(
		kelas(
			'inline-flex items-center rounded-chip border font-semibold whitespace-nowrap',
			UKURAN[size] ?? UKURAN.md,
			cfg[variant] ?? cfg.soft
		)
	);
</script>

<span class={gaya} title={title || undefined}>
	{#if withDot}
		<span
			class={kelas('h-1.5 w-1.5 shrink-0 rounded-full', variant === 'solid' ? 'bg-white' : cfg.dot)}
		></span>
	{/if}
	{#if iconPath}
		<Icon path={iconPath} size={14} class="shrink-0" />
	{/if}
	{label}
</span>
