<script>
	import { page } from '$app/state';
	const items = [
		{ label: 'Ringkasan', href: '/admin/gamifikasi' },
		{ label: 'Pesanan', href: '/admin/gamifikasi/pesanan' },
		{ label: 'Katalog Hadiah', href: '/admin/gamifikasi/hadiah' },
		{ label: 'Aturan & Dampak', href: '/admin/gamifikasi/aturan' }
	];
	const path = $derived(page.url.pathname);
</script>

<nav class="sticky top-14 z-20 mb-6 overflow-x-auto border-b border-ink-200 bg-canvas/95 backdrop-blur" aria-label="Bagian gamifikasi Admin">
	<div class="flex min-w-max gap-1">
		{#each items as item}
			{@const active = path === item.href}
			<a href={item.href} aria-current={active ? 'page' : undefined} class="border-b-2 px-4 py-3 text-sm font-semibold transition {active ? 'border-brand-600 text-brand-700' : 'border-transparent text-ink-600 hover:border-ink-300 hover:text-heading'}">
				{item.label}
			</a>
		{/each}
	</div>
</nav>
