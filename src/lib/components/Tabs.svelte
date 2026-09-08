<script>
	/**
	 * Tabs: pemilih tampilan dalam satu halaman.
	 *
	 * Props:
	 * @prop {{id:string,label:string,count?:number}[]} tabs
	 * @prop {string} active                  Dapat di-`bind`.
	 * @prop {(id:string)=>void} onchange     Kontrak 09 §5.
	 * @prop {'underline'|'pill'} variant
	 * @prop {boolean} fullWidth
	 * @prop {string} class
	 *
	 * Mengikuti pola tablist WAI-ARIA: hanya tab aktif yang masuk urutan tab, dan
	 * panah kiri/kanan berpindah antar tab. Tanpa ini, daftar dengan delapan tab
	 * memaksa pengguna keyboard menekan Tab delapan kali untuk melewatinya.
	 */
	import { kelas } from './_visual.js';

	let {
		tabs = [],
		active = $bindable(''),
		onchange = undefined,
		variant = 'underline',
		fullWidth = false,
		class: className = ''
	} = $props();

	/** @type {HTMLButtonElement[]} */
	let tombol = $state([]);

	const aktifKini = $derived(active || tabs[0]?.id || '');

	/** @param {string} id */
	function pilih(id) {
		active = id;
		onchange?.(id);
	}

	/**
	 * @param {KeyboardEvent} e
	 * @param {number} index
	 */
	function padaTombol(e, index) {
		const arah = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
		if (arah === 0) return;
		e.preventDefault();
		const berikut = (index + arah + tabs.length) % tabs.length;
		pilih(tabs[berikut].id);
		tombol[berikut]?.focus();
	}
</script>

<div
	role="tablist"
	class={kelas(
		'flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
		variant === 'underline' ? 'border-b border-ink-200' : 'rounded-chip bg-ink-100 p-1',
		className
	)}
>
	{#each tabs as tab, index (tab.id)}
		{@const aktif = tab.id === aktifKini}
		<button
			bind:this={tombol[index]}
			type="button"
			role="tab"
			id="tab-{tab.id}"
			aria-selected={aktif}
			aria-controls="panel-{tab.id}"
			tabindex={aktif ? 0 : -1}
			class={kelas(
				'inline-flex min-h-11 shrink-0 items-center gap-1.5 px-3 text-sm font-semibold whitespace-nowrap transition-all',
				fullWidth && 'flex-1 justify-center',
				variant === 'underline'
					? aktif
						? 'border-b-2 border-pertamina-red text-heading'
						: 'border-b-2 border-transparent text-ink-600 hover:text-ink-700'
					: aktif
						? 'rounded-chip bg-surface text-heading shadow-card'
						: 'rounded-chip text-ink-600 hover:text-ink-700'
			)}
			onclick={() => pilih(tab.id)}
			onkeydown={(e) => padaTombol(e, index)}
		>
			{tab.label}
			{#if tab.count !== undefined && tab.count !== null}
				<span class={kelas('numeric text-xs', aktif ? 'text-ink-700' : 'text-ink-600')}>
					{tab.count}
				</span>
			{/if}
		</button>
	{/each}
</div>
