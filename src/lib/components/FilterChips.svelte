<script>
	/**
	 * FilterChips: baris pil filter, tunggal atau ganda.
	 *
	 * Props:
	 * @prop {{id:string,label:string,count?:number}[]} options
	 * @prop {string|string[]} selected            Dapat di-`bind`.
	 * @prop {(selected:string|string[])=>void} onchange
	 * @prop {boolean} multiple
	 * @prop {boolean} showClear
	 * @prop {string}  label                       Nama aksesibel kelompok.
	 * @prop {string}  class
	 *
	 * Pil terpilih ditandai warna DAN ikon centang. Filter yang hanya berubah
	 * warna akan tak terbaca oleh pengguna dengan defisiensi penglihatan warna,
	 * padahal filter menentukan apa yang mereka lihat di seluruh halaman.
	 */
	import Icon from './Icon.svelte';
	import { ICONS } from '$lib/data/icons.js';
	import { formatAngka } from '$lib/utils/format.js';
	import { kelas } from './_visual.js';

	let {
		options = [],
		selected = $bindable(''),
		onchange = undefined,
		multiple = false,
		showClear = true,
		label = 'Filter',
		class: className = ''
	} = $props();

	const terpilih = $derived(
		multiple ? (Array.isArray(selected) ? selected : selected ? [selected] : []) : []
	);

	/** @param {string} id */
	const aktif = (id) => (multiple ? terpilih.includes(id) : selected === id);

	/** @param {string} id */
	function alihkan(id) {
		if (multiple) {
			const berikut = terpilih.includes(id)
				? terpilih.filter((x) => x !== id)
				: [...terpilih, id];
			selected = berikut;
			onchange?.(berikut);
			return;
		}
		// Menekan pil yang sudah aktif melepaskan filter: jalan keluar tercepat.
		const berikut = selected === id ? '' : id;
		selected = berikut;
		onchange?.(berikut);
	}

	function bersihkan() {
		const kosong = multiple ? [] : '';
		selected = kosong;
		onchange?.(kosong);
	}

	const adaTerpilih = $derived(multiple ? terpilih.length > 0 : Boolean(selected));
</script>

<div
	class={kelas(
		'flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
		className
	)}
	role="group"
	aria-label={label}
>
	{#each options as opsi (opsi.id)}
		{@const dipilih = aktif(opsi.id)}
		<button
			type="button"
			aria-pressed={dipilih}
			class={kelas(
				'inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-chip border px-3 text-xs font-semibold whitespace-nowrap transition-all',
				dipilih
					? 'border-pertamina-blue/40 bg-pertamina-navy-tint text-pertamina-navy'
					: 'border-ink-200 bg-surface text-ink-600 hover:border-ink-300 hover:text-ink-800'
			)}
			onclick={() => alihkan(opsi.id)}
		>
			{#if dipilih}
				<Icon path={ICONS.check} size={14} class="shrink-0" />
			{/if}
			{opsi.label}
			{#if opsi.count !== undefined && opsi.count !== null}
				<span class="numeric opacity-70">{formatAngka(opsi.count)}</span>
			{/if}
		</button>
	{/each}

	{#if showClear && adaTerpilih}
		<button
			type="button"
			class="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-chip px-2.5 text-xs font-semibold text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-800"
			onclick={bersihkan}
		>
			<Icon path={ICONS.x} size={14} />
			Hapus filter
		</button>
	{/if}
</div>
