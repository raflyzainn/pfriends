<script>
	import { onMount } from 'svelte';
	import emojiDataUrl from 'emoji-picker-element-data/en/emojibase/data.json?url';
	let { onselect, onclose } = $props();
	let host;
	onMount(() => {
		let picker;
		const closeOnEscape = (event) => { if (event.key === 'Escape') onclose?.(); };
		window.addEventListener('keydown', closeOnEscape);
		void import('emoji-picker-element/picker').then(({ default: Picker }) => {
			picker = new Picker({ dataSource: emojiDataUrl, locale: 'en' });
			picker.className = 'w-full';
			picker.addEventListener('emoji-click', (event) => onselect?.(event.detail.unicode));
			host?.append(picker);
		});
		return () => { window.removeEventListener('keydown', closeOnEscape); picker?.remove(); };
	});
</script>

<div class="absolute right-0 z-30 mt-1 w-[min(22rem,calc(100vw-3rem))] rounded-xl border border-ink-200 bg-surface p-1 shadow-xl" role="dialog" aria-label="Pilih emoji reaksi" tabindex="-1">
	<div bind:this={host}></div>
</div>
