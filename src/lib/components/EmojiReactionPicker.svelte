<script>
	import { onMount } from 'svelte';
	import emojiDataUrl from 'emoji-picker-element-data/en/emojibase/data.json?url';
	let { onselect, onclose } = $props();
	let host, panel;
	onMount(() => {
		let picker;
		const closeOnEscape = (event) => { if (event.key === 'Escape') onclose?.(); };
		const closeOnOutsideClick = (event) => { if (panel && !panel.contains(event.target)) onclose?.(); };
		window.addEventListener('keydown', closeOnEscape);
		document.addEventListener('pointerdown', closeOnOutsideClick);
		void import('emoji-picker-element/picker').then(({ default: Picker }) => {
			picker = new Picker({ dataSource: emojiDataUrl, locale: 'en' });
			picker.className = 'w-full';
			picker.addEventListener('emoji-click', (event) => onselect?.(event.detail.unicode));
			host?.append(picker);
		});
		return () => { window.removeEventListener('keydown', closeOnEscape); document.removeEventListener('pointerdown', closeOnOutsideClick); picker?.remove(); };
	});
</script>

<div bind:this={panel} class="absolute right-0 z-30 mt-1 w-[min(22rem,calc(100vw-3rem))] rounded-xl border border-ink-200 bg-surface p-1 shadow-xl" role="dialog" aria-label="Pilih emoji reaksi" tabindex="-1">
	<div class="flex items-center justify-between px-2 py-1.5"><span class="text-xs font-semibold text-ink-700">Pilih reaksi</span><button type="button" class="inline-flex h-7 w-7 items-center justify-center rounded-lg text-lg leading-none text-ink-500 hover:bg-ink-50 hover:text-heading" aria-label="Tutup pemilih emoji" onclick={()=>onclose?.()}>×</button></div>
	<div bind:this={host}></div>
</div>
