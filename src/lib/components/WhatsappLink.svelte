<script>
	let { number, label = 'Chat WhatsApp', compact = false } = $props();

	const digits = $derived(String(number || '').replace(/\D/g, ''));
	const international = $derived(digits.startsWith('0') ? `62${digits.slice(1)}` : digits);
	const href = $derived(`https://wa.me/${international}`);
</script>

<a
	class="inline-flex min-h-9 items-center gap-2 rounded-control border border-green-200 bg-green-50 px-3 text-sm font-semibold text-green-800 transition hover:border-green-400 hover:bg-green-100"
	{href}
	target="_blank"
	rel="noreferrer"
	aria-label={`${label} ${number}`}
>
	<svg aria-hidden="true" viewBox="0 0 24 24" class="h-4 w-4 fill-current">
		<path d="M12.04 2a9.84 9.84 0 0 0-8.49 14.8L2 22l5.33-1.52A9.96 9.96 0 1 0 12.04 2Zm0 18.18a8.1 8.1 0 0 1-4.13-1.13l-.3-.18-3.16.9.93-3.08-.2-.32a8.03 8.03 0 1 1 6.86 3.81Zm4.42-6.02c-.24-.12-1.43-.7-1.65-.79-.22-.08-.38-.12-.54.12-.16.24-.62.79-.76.95-.14.16-.28.18-.52.06-.24-.12-1.02-.37-1.94-1.2a7.24 7.24 0 0 1-1.34-1.67c-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.15.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.4-.54-.41h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.12 3.64.57.25 1.02.4 1.37.51.58.18 1.1.16 1.51.1.46-.07 1.43-.59 1.63-1.15.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28Z" />
	</svg>
	{#if !compact}<span>{label}</span>{/if}
</a>
