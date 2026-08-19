<script>
	import { page } from '$app/state';
	const items = [
		{ label: 'Ringkasan', href: '/admin/gamifikasi' },
		{ label: 'Pesanan', href: '/admin/gamifikasi/pesanan' },
		{ label: 'Katalog Hadiah', href: '/admin/gamifikasi/hadiah' },
		{ label: 'Aturan & Simulasi', href: '/admin/gamifikasi/aturan', dummy: true }
	];
	const path = $derived(page.url.pathname);
</script>

<nav class="sticky top-14 z-20 mb-6 overflow-x-auto border-b border-ink-200 bg-canvas/95 backdrop-blur" aria-label="Bagian gamifikasi Admin">
	<div class="flex min-w-max gap-1">
		{#each items as item}
			{@const active = path === item.href}
			<a href={item.href} aria-current={active ? 'page' : undefined} class="border-b-2 px-4 py-3 text-sm font-semibold transition {active ? 'border-brand-600 text-brand-700' : 'border-transparent text-ink-600 hover:border-ink-300 hover:text-heading'}">
				{item.label}{#if item.dummy}<span class="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">DUMMY</span>{/if}
			</a>
		{/each}
	</div>
</nav>
