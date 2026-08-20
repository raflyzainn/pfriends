<script>
	/**
	 * ProgressBar: bilah progres beraksesibilitas penuh.
	 *
	 * Props:
	 * @prop {number} value
	 * @prop {number} max
	 * @prop {string} color    Nilai CSS warna isian (identitas: tier, pilar, brand).
	 * @prop {'xs'|'sm'|'md'} size
	 * @prop {number|string} height  Alias tinggi eksplisit; menang atas `size`.
	 * @prop {boolean} showLabel     Menampilkan label + persentase di atas bilah.
	 * @prop {string}  label         Teks label; juga menjadi nama aksesibel.
	 * @prop {boolean} animated
	 * @prop {string}  class
	 *
	 * Cincin `inset` 1px pada isian bukan hiasan. Isian kuning `#F0B429` di atas
	 * track `#E2E8F0` hanya berkontras 1,51 sehingga batas segmen terisi tidak
	 * terlihat sama sekali. Cincin sehue yang lebih gelap mengembalikan batas itu
	 * dan memenuhi WCAG 1.4.11 tanpa mengubah warna identitas.
	 */
	import { formatAngka, persenProgres } from '$lib/utils/format.js';
	import { kelas } from './_visual.js';

	let {
		value = 0,
		max = 100,
		color = 'var(--color-pertamina-blue)',
		size = 'sm',
		height = '',
		showLabel = false,
		label = '',
		animated = true,
		class: className = ''
	} = $props();

	const TINGGI = { xs: '4px', sm: '6px', md: '10px' };

	const tinggiAkhir = $derived(
		height === '' || height === undefined
			? (TINGGI[size] ?? TINGGI.sm)
			: typeof height === 'number'
				? `${height}px`
				: height
	);

	const persen = $derived(persenProgres(value, max));

	const gayaIsian = $derived(
		`width:${persen}%;background:${color};` +
			`box-shadow: inset 0 0 0 1px color-mix(in srgb, ${color} 62%, var(--color-ink-900));` +
			(animated ? 'transition: width 0.6s cubic-bezier(0.22,1,0.36,1);' : '')
	);

	const namaAksesibel = $derived(label || 'Progres');
</script>

<div class={className}>
	{#if showLabel}
		<div class="mb-1.5 flex items-baseline justify-between gap-2">
			<span class="text-xs font-medium text-ink-600">{namaAksesibel}</span>
			<span class="numeric text-xs text-ink-700">
				{formatAngka(value)}<span class="text-ink-500">/{formatAngka(max)}</span>
			</span>
		</div>
	{/if}

	<div
		class="w-full overflow-hidden rounded-chip bg-ink-200"
		style="height:{tinggiAkhir};"
		role="progressbar"
		aria-valuenow={Math.round(persen)}
		aria-valuemin="0"
		aria-valuemax="100"
		aria-label="{namaAksesibel}: {Math.round(persen)} persen"
	>
		<div class={kelas('h-full rounded-chip')} style={gayaIsian}></div>
	</div>
</div>
