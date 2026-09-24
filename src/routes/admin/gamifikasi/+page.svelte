<script>
	import { onMount } from 'svelte';
	import { AdminGamificationNav, Card, Icon, PageHeader, StatTile, ICONS } from '$lib/components';
	import { adminRedemptions, staffRewards } from '$lib/infrastructure/pocketbase/achievements.js';

	let loading = $state(true); let rewards = $state.raw([]); let orders = $state.raw([]);
	onMount(async () => {
		try { const [rewardData, orderData] = await Promise.all([staffRewards(), adminRedemptions()]); rewards = rewardData.rewards || []; orders = orderData.redemptions || []; }
		finally { loading = false; }
	});
	const pending = $derived(orders.filter((row) => ['DIAJUKAN','DISETUJUI'].includes(row.status)).length);
	const spent = $derived(orders.filter((row) => row.status !== 'DITOLAK').reduce((sum, row) => sum + row.coins, 0));
	const sections = [
		{ title: 'Pemantauan Pesanan', description: 'Lihat Awardee yang menukar koin dan status pemenuhannya.', href: '/admin/gamifikasi/pesanan', icon: ICONS.inbox },
		{ title: 'Katalog Hadiah', description: 'Tambah, ubah, atau nonaktifkan hadiah tukar.', href: '/admin/gamifikasi/hadiah', icon: ICONS.gift },
		{ title: 'Aturan & Dampak', description: 'Atur nilai poin, ambang tier, dan tinjau dampak perubahan.', href: '/admin/gamifikasi/aturan', icon: ICONS.trophy }
	];
</script>

<PageHeader eyebrow="Konsol Corporate Secretary" title="Gamifikasi" subtitle="Pilih pekerjaan yang ingin dilakukan tanpa menelusuri satu halaman panjang." />
<AdminGamificationNav />

<div class="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
	<StatTile label="Hadiah tersedia" value={rewards.filter((row) => row.status === 'TERSEDIA').length} unit="item" loading={loading} iconPath={ICONS.gift} />
	<StatTile label="Seluruh pesanan" value={orders.length} unit="pesanan" loading={loading} iconPath={ICONS.inbox} />
	<StatTile label="Menunggu Verifikator" value={pending} unit="pesanan" loading={loading} iconPath={ICONS.clock} />
	<StatTile label="Koin digunakan" value={spent} unit="KT" loading={loading} iconPath={ICONS.coin} />
</div>

<div class="grid gap-4 lg:grid-cols-3">
	{#each sections as section}
		<a href={section.href} class="group block">
			<Card class="h-full transition group-hover:-translate-y-0.5 group-hover:border-brand-300 group-hover:shadow-card">
				<div class="flex items-start gap-3"><span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700"><Icon path={section.icon} size={20} /></span><div class="min-w-0 flex-1"><div class="flex flex-wrap items-center gap-2"><h2 class="font-bold text-heading">{section.title}</h2></div><p class="mt-1 text-sm leading-relaxed text-ink-600">{section.description}</p><p class="mt-4 text-sm font-semibold text-brand-700">Buka bagian →</p></div></div>
			</Card>
		</a>
	{/each}
</div>
