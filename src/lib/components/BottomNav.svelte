<script>
	/**
	 * BottomNav — navigasi utama zona ber-peran di ponsel.
	 *
	 * Props (seluruhnya opsional):
	 * @prop {{id:string,label:string,href:string,iconPath:string,badge?:number}[]} items
	 *       Kosong → memakai `primaryNavForZone(zone)`.
	 * @prop {string} activeId  Menimpa deteksi otomatis berbasis URL.
	 * @prop {string} zone      Salah satu `Zone`; menentukan daftar bawaan.
	 * @prop {string} ariaLabel Label aksesibilitas bilah navigasi.
	 *
	 * Awardee membuka microsite ini terutama dari ponsel lewat tautan WhatsApp,
	 * sehingga bilah ini adalah navigasi utama mereka — bukan pelengkap dari sidebar
	 * desktop. Maksimum lima butir, masing-masing bersasaran sentuh penuh 44px, dan
	 * setiap butir selalu memuat label teks selain ikon.
	 *
	 * Komponen ini tidak lagi menyimpan daftar menunya sendiri. Daftar bawaan datang
	 * dari `$lib/data/navigation.js` — satu-satunya tempat yang tahu zona mana punya
	 * tujuan apa. Daftar tandingan di dalam komponen adalah cara paling sunyi untuk
	 * membuat menu ponsel dan menu desktop menunjuk tempat yang berbeda.
	 *
	 * Seperti `Sidebar`, komponen ini tidak mengimpor store apa pun.
	 */
	import { page } from '$app/state';
	import Icon from './Icon.svelte';
	import { isNavActive, primaryNavForZone } from '$lib/data/navigation.js';
	import { Zone } from '$lib/domain/policies/AccessPolicy.js';
	import { formatAngka } from '$lib/utils/format.js';
	import { kelas } from './_visual.js';

	let {
		items = [],
		activeId = '',
		zone = Zone.AWARDEE,
		ariaLabel = 'Navigasi utama'
	} = $props();

	const BATAS_BUTIR = 5;
	const menu = $derived((items.length > 0 ? items : primaryNavForZone(zone)).slice(0, BATAS_BUTIR));
	const jalurKini = $derived(page.url?.pathname ?? '');

	/** @param {{id:string, href:string}} item */
	function aktif(item) {
		if (activeId) return item.id === activeId;
		return isNavActive(item.href, jalurKini);
	}
</script>

<nav
	class="fixed inset-x-0 bottom-0 z-40 border-t border-ink-100 bg-white/95 backdrop-blur-md lg:hidden"
	style="padding-bottom:env(safe-area-inset-bottom);"
	aria-label={ariaLabel}
>
	<ul class="mx-auto flex h-14 max-w-lg items-stretch">
		{#each menu as item (item.id)}
			{@const nyala = aktif(item)}
			<li class="flex-1">
				<a
					href={item.href}
					aria-current={nyala ? 'page' : undefined}
					class={kelas(
						'relative flex h-full min-h-11 flex-col items-center justify-center gap-0.5 transition-colors',
						nyala ? 'text-pertamina-red-ink' : 'text-ink-500 hover:text-ink-700'
					)}
				>
					{#if nyala}
						<span
							class="absolute top-1.5 h-1 w-1 rounded-full bg-pertamina-red"
							aria-hidden="true"
						></span>
					{/if}

					<span class="relative">
						<Icon path={item.iconPath} size={20} />
						{#if item.badge}
							<span
								class="numeric absolute -top-1.5 -right-2 inline-flex min-w-4 items-center justify-center rounded-full bg-pertamina-red px-1 text-[9px] leading-4 font-bold text-white"
							>
								{formatAngka(item.badge)}
							</span>
						{/if}
					</span>

					<span class={kelas('text-[10px] leading-none', nyala ? 'font-bold' : 'font-medium')}>
						{item.label}
					</span>
				</a>
			</li>
		{/each}
	</ul>
</nav>
