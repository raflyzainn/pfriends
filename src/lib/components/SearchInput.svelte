<script>
	/**
	 * SearchInput — kolom pencarian dengan debounce internal.
	 *
	 * Props:
	 * @prop {string} value                Dapat di-`bind`.
	 * @prop {string} placeholder
	 * @prop {(q:string)=>void} oninput    Kontrak 09 §5 — dipanggil setiap ketikan.
	 * @prop {(q:string)=>void} onSearch   Dipanggil setelah debounce.
	 * @prop {number} debounceMs
	 * @prop {'sm'|'md'} size
	 * @prop {string} label                Nama aksesibel kolom.
	 * @prop {string} class
	 *
	 * Debounce hidup di dalam komponen supaya setiap halaman tidak perlu menulis
	 * ulang timer yang sama — dan supaya tidak ada halaman yang lupa memasangnya
	 * lalu menyaring 60 anggota pada setiap penekanan tombol.
	 */
	import Icon from './Icon.svelte';
	import { ICONS } from '$lib/data/icons.js';
	import { kelas } from './_visual.js';

	let {
		value = $bindable(''),
		placeholder = 'Cari...',
		oninput = undefined,
		onSearch = undefined,
		debounceMs = 250,
		size = 'md',
		label = 'Pencarian',
		class: className = ''
	} = $props();

	const UKURAN = {
		sm: 'h-10 pl-9 pr-9 text-sm',
		md: 'h-11 pl-10 pr-10 text-sm'
	};

	/** @type {ReturnType<typeof setTimeout>|undefined} */
	let timer;

	/** @param {string} teks */
	function jadwalkan(teks) {
		clearTimeout(timer);
		timer = setTimeout(() => onSearch?.(teks), debounceMs);
	}

	/** @param {Event} e */
	function padaKetik(e) {
		const teks = /** @type {HTMLInputElement} */ (e.currentTarget).value;
		value = teks;
		oninput?.(teks);
		jadwalkan(teks);
	}

	function bersihkan() {
		clearTimeout(timer);
		value = '';
		oninput?.('');
		onSearch?.('');
	}

	$effect(() => () => clearTimeout(timer));
</script>

<div class={kelas('relative', className)}>
	<span
		class={kelas(
			'pointer-events-none absolute top-1/2 -translate-y-1/2 text-ink-450',
			size === 'sm' ? 'left-2.5' : 'left-3'
		)}
	>
		<Icon path={ICONS.search} size={18} />
	</span>

	<input
		type="search"
		{value}
		{placeholder}
		aria-label={label}
		oninput={padaKetik}
		class={kelas(
			'w-full rounded-control border border-ink-450 bg-surface text-ink-800 transition-colors placeholder:text-ink-450 focus:border-pertamina-blue',
			'[&::-webkit-search-cancel-button]:hidden',
			UKURAN[size] ?? UKURAN.md
		)}
	/>

	{#if value}
		<button
			type="button"
			class={kelas(
				'absolute top-1/2 -translate-y-1/2 rounded-full p-1.5 text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-800',
				size === 'sm' ? 'right-1.5' : 'right-2'
			)}
			aria-label="Hapus kata kunci pencarian"
			onclick={bersihkan}
		>
			<Icon path={ICONS.x} size={16} />
		</button>
	{/if}
</div>
