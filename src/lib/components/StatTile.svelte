<script>
	/**
	 * StatTile — ubin statistik ringkas untuk baris ringkasan dasbor.
	 *
	 * Props:
	 * @prop {string} label
	 * @prop {string|number} value
	 * @prop {string} unit
	 * @prop {string} hint      Keterangan satu baris di bawah angka.
	 * @prop {string} color     Warna aksen (kontrak 09 §5).
	 * @prop {string} accent    Alias `color` (penamaan 08 §5.2).
	 * @prop {string} iconPath
	 * @prop {number|null} trend
	 * @prop {'sm'|'md'} size
	 * @prop {string} href
	 * @prop {string} class
	 *
	 * Lebih ringan daripada `KpiCard`: dipakai 4–6 buah sebaris di puncak halaman,
	 * untuk angka yang menjelaskan konteks — bukan untuk metrik yang dinilai.
	 */
	import Icon from './Icon.svelte';
	import { formatAngka, formatBertanda } from '$lib/utils/format.js';
	import { kelas } from './_visual.js';

	let {
		label = '',
		value = 0,
		unit = '',
		hint = '',
		color = 'var(--color-pertamina-blue)',
		accent = undefined,
		iconPath = '',
		trend = null,
		size = 'md',
		href = '',
		class: className = ''
	} = $props();

	const warna = $derived(accent ?? color);
	const teksNilai = $derived(typeof value === 'number' ? formatAngka(value) : String(value ?? ''));

	const UKURAN = {
		sm: { wadah: 'p-4', kotak: 'h-8 w-8', ikon: 16, angka: 'text-xl' },
		md: { wadah: 'p-5', kotak: 'h-9 w-9', ikon: 20, angka: 'text-2xl' }
	};
	const cfg = $derived(UKURAN[size] ?? UKURAN.md);
</script>

<svelte:element
	this={href ? 'a' : 'div'}
	href={href || undefined}
	class={kelas('card block', cfg.wadah, href && 'card-hover', className)}
>
	<div class="flex items-start gap-3">
		{#if iconPath}
			<span
				class={kelas('inline-flex shrink-0 items-center justify-center rounded-xl', cfg.kotak)}
				style="background:color-mix(in srgb, {warna} 12%, transparent);color:{warna};"
			>
				<Icon path={iconPath} size={cfg.ikon} />
			</span>
		{/if}

		<div class="min-w-0 flex-1">
			<p class="label-micro truncate" title={label}>{label}</p>

			<p class="mt-1.5 flex items-baseline gap-1.5">
				<span class={kelas('numeric text-ink-900', cfg.angka)}>{teksNilai}</span>
				{#if unit}<span class="text-xs font-medium text-ink-500">{unit}</span>{/if}
				{#if trend !== null && trend !== undefined && trend !== 0}
					<span
						class={kelas('numeric text-[11px] font-bold', trend > 0 ? 'text-success' : 'text-ink-500')}
						title="Perubahan dibanding periode sebelumnya"
					>
						{formatBertanda(trend)}
					</span>
				{/if}
			</p>

			{#if hint}
				<p class="mt-1 truncate text-xs text-ink-500" title={hint}>{hint}</p>
			{/if}
		</div>
	</div>
</svelte:element>
