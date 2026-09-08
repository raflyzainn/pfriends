<script>
	import { AdminGamificationNav, PageHeader, RedemptionAdminPanel } from '$lib/components';
</script>

<PageHeader eyebrow="Konsol Gamifikasi" title="Pemantauan Pesanan" subtitle="Pantau seluruh penukaran Koin Tukar. Perubahan status dan keputusan pesanan dilakukan oleh Verifikator." />
<AdminGamificationNav />
<RedemptionAdminPanel canManage={false} title="Pemantauan penukaran hadiah" />
