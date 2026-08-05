<script>
	/**
	 * LAYOUT — Zona Admin Pertamina Foundation.
	 *
	 * Tanggung jawab: kerangka konsol pengelola — `ZoneGuard`, navigasi tujuh route
	 * admin, dan pemuatan satu kali seluruh potret konsol.
	 *
	 * Penjaga peran sudah TIDAK ditulis di berkas ini. Panel penolakan yang dahulu
	 * tinggal di sini kini milik `ZoneGuard`, dipakai seluruh zona, dan
	 * membawa atribut `data-zone-denied` yang menjadi satu-satunya detektor
	 * "terlempar keluar" bagi skrip e2e. Panel per zona berarti empat salinan yang
	 * perlahan berbeda kalimat — dan tiga di antaranya akan lupa memasang atribut itu.
	 *
	 * Tombol "Masuk sebagai Admin PF" pada panel lama juga dicabut: sejak V2 tidak
	 * ada lagi pemilih peran, dan satu-satunya jalan berganti peran adalah keluar
	 * lalu masuk dengan akun lain di `/masuk`.
	 *
	 * Pemuatan data dilakukan di layout, bukan di masing-masing halaman. Ketujuh
	 * route membaca potret yang sama, dan `admin.load()` bersifat idempoten —
	 * memindahkannya ke tiap halaman hanya menambah tujuh tempat yang bisa lupa
	 * memanggilnya. Efek pemuatan menunggu peran terbukti admin — bukan sebagai
	 * penjagaan akses (itu tugas `ZoneGuard`), melainkan supaya konsol tidak membaca
	 * seluruh tabel untuk seseorang yang tidak akan pernah melihat hasilnya.
	 *
	 * @see docs/12-BUILD-CONTRACT-V2.md — §2.13 ZoneGuard & navigation.js, §2.14 route zona admin
	 * @see docs/04-ESG-GOVERNANCE.md — §3.1 pemisahan peran aktor
	 */
	import { page } from '$app/state';
	import { Button, Icon, Sidebar, ToastHost, ZoneGuard, ICONS } from '$lib/components';
	import { navForZone, withBadges } from '$lib/data/navigation.js';
	import { Zone } from '$lib/domain/policies/AccessPolicy.js';
	import { admin } from '$lib/stores/admin.svelte.js';
	import { catalog } from '$lib/stores/catalog.svelte.js';
	import { session } from '$lib/stores/session.svelte.js';

	let { children } = $props();

	/** Laci navigasi; hanya berpengaruh di bawah breakpoint lg. */
	let navTerbuka = $state(false);

	/**
	 * Tujuh tujuan zona admin, sudah bertanda lencana antrean.
	 *
	 * Lencana moderasi menempel di navigasi dengan sengaja: banyaknya naskah yang
	 * menunggu keputusan adalah hal pertama yang perlu diketahui pengelola begitu
	 * konsol dibuka, bukan sesuatu yang baru terlihat setelah membuka halamannya.
	 */
	const navZona = $derived(
		withBadges(navForZone(Zone.ADMIN), { moderationQueue: admin.pendingCount })
	);

	const jalurKini = $derived(page.url?.pathname ?? '/admin');

	/** Label bagian yang sedang dibuka, untuk bilah atas mobile. */
	const bagianKini = $derived(
		[...navZona]
			.sort((a, b) => b.href.length - a.href.length)
			.find((item) => jalurKini === item.href || jalurKini.startsWith(`${item.href}/`))?.label ??
			'Konsol Admin'
	);

	$effect(() => {
		if (!session.isAdmin) return;
		catalog.load();
		admin.load();
	});
</script>

<svelte:head>
	<title>{bagianKini} · Konsol Pfriends</title>
</svelte:head>

<ToastHost />

<ZoneGuard zone={Zone.ADMIN} label="Konsol admin Pertamina Foundation">
	<div class="flex min-h-screen bg-canvas">
		<Sidebar
			bind:open={navTerbuka}
			nav={navZona}
			zone={Zone.ADMIN}
			homeHref="/admin"
			title="Konsol Corsec"
		/>

		<div class="flex min-w-0 flex-1 flex-col">
			<header
				class="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-ink-100 bg-surface/90 px-4 backdrop-blur"
			>
				<button
					type="button"
					class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-ink-600 hover:bg-ink-100 hover:text-ink-900 lg:hidden"
					aria-label="Buka menu navigasi"
					onclick={() => (navTerbuka = true)}
				>
					<Icon path={ICONS.menu} size={20} />
				</button>

				<div class="min-w-0 flex-1">
					<p class="label-micro leading-tight">Pertamina Foundation</p>
					<p class="truncate text-sm leading-tight font-semibold text-heading">{bagianKini}</p>
				</div>

				<Button
					variant="ghost"
					size="sm"
					iconPath={ICONS.refresh}
					loading={admin.loading}
					onclick={() => admin.reloadDemoData()}
				>
					<span class="hidden sm:inline">Muat ulang data demo</span>
					<span class="sr-only sm:hidden">Muat ulang data demo</span>
				</Button>

				<div class="hidden items-center gap-2 border-l border-ink-100 pl-3 md:flex">
					<span
						class="inline-flex h-9 w-9 items-center justify-center rounded-chip bg-pertamina-navy-tint text-xs font-bold text-pertamina-navy"
						aria-hidden="true"
					>
						{session.user?.initials ?? 'CS'}
					</span>
					<span class="min-w-0">
						<span class="block truncate text-xs leading-tight font-semibold text-heading">
							{session.displayName}
						</span>
						<span class="label-micro leading-tight">{session.roleLabel}</span>
					</span>
				</div>

				<Button
					variant="ghost"
					size="sm"
					iconPath={ICONS.logout}
					ariaLabel="Keluar dari konsol"
					onclick={() => session.logout()}
				/>
			</header>

			<main class="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
				<div class="mx-auto w-full max-w-[1400px]">
					{@render children()}
				</div>
			</main>
		</div>
	</div>
</ZoneGuard>
