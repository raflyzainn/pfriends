<script>
	import { PageHeader, RedemptionAdminPanel, RewardManagementPanel } from '$lib/components';
</script>

<svelte:head><title>Hadiah & Penukaran · Verifikator PFfriends</title></svelte:head>

<PageHeader
	eyebrow="Ruang kerja Verifikator"
	title="Hadiah & Penukaran"
	subtitle="Periksa orang yang menukar Koin Tukar, proses status pesanannya, dan kelola katalog hadiah bersama Admin."
/>

<RedemptionAdminPanel canManage title="Antrean penukaran hadiah" />
<RewardManagementPanel />
