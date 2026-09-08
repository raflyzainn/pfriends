<script>
	/**
	 * Skeleton: kerangka pemuatan yang meniru tata letak akhir.
	 *
	 * Props:
	 * @prop {'text'|'title'|'avatar'|'card'|'chart'|'row'} variant
	 * @prop {number} lines  Jumlah baris untuk varian `text`.
	 * @prop {string} class
	 *
	 * Lebar baris sengaja bervariasi (100/85/60%) agar terbaca sebagai paragraf,
	 * bukan sebagai balok. Seluruh kerangka `aria-hidden`: pembaca layar cukup
	 * mendengar `aria-busy` pada kontainer pemanggil.
	 */
	import { kelas } from './_visual.js';

	let { variant = 'text', lines = 3, class: className = '' } = $props();

	const LEBAR_BARIS = ['w-full', 'w-[85%]', 'w-[60%]'];
	const daftarBaris = $derived(Array.from({ length: Math.max(1, lines) }, (_, i) => i));
</script>

<div class={className} aria-hidden="true">
	{#if variant === 'title'}
		<div class="skeleton h-6 w-1/3"></div>
	{:else if variant === 'avatar'}
		<div class="skeleton h-10 w-10 rounded-chip"></div>
	{:else if variant === 'chart'}
		<div class="skeleton h-[240px] w-full rounded-card"></div>
		<div class="mt-3 flex gap-3">
			<div class="skeleton h-2 w-16"></div>
			<div class="skeleton h-2 w-16"></div>
			<div class="skeleton h-2 w-16"></div>
		</div>
	{:else if variant === 'row'}
		<div class="flex items-center gap-3 py-3">
			<div class="skeleton h-8 w-8 rounded-chip"></div>
			<div class="flex-1 space-y-1.5">
				<div class="skeleton h-3 w-1/3"></div>
				<div class="skeleton h-2.5 w-1/5"></div>
			</div>
			<div class="skeleton h-5 w-16 rounded-chip"></div>
		</div>
	{:else if variant === 'card'}
		<div class="card p-5">
			<div class="flex items-center gap-3">
				<div class="skeleton h-10 w-10 rounded-chip"></div>
				<div class="flex-1 space-y-2">
					<div class="skeleton h-3 w-1/2"></div>
					<div class="skeleton h-2.5 w-1/4"></div>
				</div>
			</div>
			<div class="mt-4 space-y-2">
				<div class="skeleton h-2.5 w-full"></div>
				<div class="skeleton h-2.5 w-[85%]"></div>
			</div>
			<div class="mt-4 border-t border-ink-100 pt-4">
				<div class="skeleton h-2.5 w-1/3"></div>
			</div>
		</div>
	{:else}
		<div class="space-y-2">
			{#each daftarBaris as index (index)}
				<div class={kelas('skeleton h-3', LEBAR_BARIS[index % LEBAR_BARIS.length])}></div>
			{/each}
		</div>
	{/if}
</div>
