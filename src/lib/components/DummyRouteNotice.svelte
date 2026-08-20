<script>
	import { page } from '$app/state';
	import DummyBadge from './DummyBadge.svelte';
	let { outerClass = '' } = $props();

	const path = $derived(page.url.pathname);
	const message = $derived.by(() => {
		if (['/masuk', '/daftar', '/pendaftaran/status'].includes(path)) return '';
		if (path === '/' || path.startsWith('/cerita') || path.startsWith('/komunitas') || path.startsWith('/metode-pengukuran') || path.startsWith('/gerakan')) return '';
		if (path.startsWith('/awardee/bukti-keaktifan')) return '';
		if (path.startsWith('/awardee/direktori')) return '';
		if (path.startsWith('/awardee/penghargaan')) return '';
		if (path.startsWith('/awardee/kalender')) return '';
		if (path.startsWith('/verifikator/bukti-keaktifan') || path.startsWith('/verifikator/pendaftaran')) return '';
		if (path.startsWith('/verifikator/gamifikasi')) return '';
		if (path.startsWith('/admin/pendaftaran')) return '';
		if (path.startsWith('/admin/broadcast')) return '';
		if (path === '/verifikator') return ''; // Ditandai per-widget karena sumbernya campuran.
		if (path.startsWith('/verifikator/kegiatan')) return '';
		if (path.startsWith('/verifikator/kabar')) return '';
		if (path.startsWith('/verifikator/cerita')) return 'Antrean dan keputusan pada halaman ini masih memakai data lokal Dexie.';
		if (path.startsWith('/admin/gamifikasi')) return '';
		if (path.startsWith('/admin')) return 'Data KPI dan pengelolaan akun pada halaman ini masih memakai data lokal Dexie.';
		if (path.startsWith('/awardee')) return 'Konten komunitas pada halaman ini masih memakai seed lokal; poin, tier, streak, badge, dan bukti keaktifan tidak termasuk label ini.';
		if (path.startsWith('/kalender')) return '';
		return 'Konten dan angka pada halaman publik ini masih memakai seed lokal Dexie.';
	});
</script>

{#if message}
	<div class={outerClass}>
		<div class="mb-5 flex items-start gap-3 rounded-control border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950" data-dummy-notice>
			<DummyBadge title={message} />
			<p>{message}</p>
		</div>
	</div>
{/if}
