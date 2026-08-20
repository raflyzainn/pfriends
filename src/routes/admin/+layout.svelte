<script>
	/**
	 * LAYOUT: Zona Admin Pertamina Foundation.
	 *
	 * Tanggung jawab: kerangka konsol pengelola: `ZoneGuard`, navigasi zona admin,
	 * dan pemuatan satu kali seluruh potret konsol.
	 *
	 * Penjaga peran sudah TIDAK ditulis di berkas ini. Panel penolakan yang dahulu
	 * tinggal di sini kini milik `ZoneGuard`, dipakai seluruh zona, dan
	 * membawa atribut `data-zone-denied` yang menjadi satu-satunya detektor
	 * "terlempar keluar" bagi skrip e2e. Panel per zona berarti empat salinan yang
	 * perlahan berbeda kalimat: dan tiga di antaranya akan lupa memasang atribut itu.
	 *
	 * Daftar tujuan dibaca apa adanya dari `navigation.js`, tanpa lencana. Sejak
	 * konsol dipangkas menjadi tiga tujuan (revisi 5 Agustus 2026) tidak satu pun
	 * butir memiliki `badgeKey`, dan memanggil `withBadges()` atas daftar yang tidak
	 * punya kunci lencana hanya menyalin larik tanpa mengubah apa pun: pekerjaan
	 * yang tampak berarti padahal tidak.
	 *
	 * Pemuatan data dilakukan di layout, bukan di masing-masing halaman. Ketiga
	 * route membaca potret yang sama, dan `admin.load()` bersifat idempoten :
	 * memindahkannya ke tiap halaman hanya menambah tempat yang bisa lupa
	 * memanggilnya. Efek pemuatan menunggu peran terbukti admin: bukan sebagai
	 * penjagaan akses (itu tugas `ZoneGuard`), melainkan supaya konsol tidak membaca
	 * seluruh tabel untuk seseorang yang tidak akan pernah melihat hasilnya.
	 *
	 * @see docs/12-BUILD-CONTRACT-V2.md: §2.13 ZoneGuard & navigation.js
	 * @see docs/04-ESG-GOVERNANCE.md: §3.1 pemisahan peran aktor
	 */
	import { page } from '$app/state';
	import { Button, DummyRouteNotice, Icon, Sidebar, ToastHost, ZoneGuard, ICONS } from '$lib/components';
	import { navForZone } from '$lib/data/navigation.js';
	import { Zone } from '$lib/domain/policies/AccessPolicy.js';
	import { admin } from '$lib/stores/admin.svelte.js';
	import { session } from '$lib/stores/session.svelte.js';

	let { children } = $props();

	/** Laci navigasi; hanya berpengaruh di bawah breakpoint lg. */
	let navTerbuka = $state(false);

	/** Seluruh tujuan zona Admin, termasuk Pemantauan Cerita. */
	const navZona = navForZone(Zone.ADMIN);

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
		void admin.load().catch(() => {});
	});
</script>

<svelte:head>
	<title>{bagianKini} · Konsol PFriends</title>
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

				{#if jalurKini === '/admin'}
					<Button
						variant="ghost"
						size="sm"
						iconPath={ICONS.refresh}
						loading={admin.loading}
						onclick={() => admin.reload().catch(() => {})}
					>
						<span class="hidden sm:inline">Muat ulang data</span>
						<span class="sr-only sm:hidden">Muat ulang data</span>
					</Button>
				{/if}

				<div class="hidden items-center gap-2 border-l border-ink-100 pl-3 md:flex">
					<span
						class="inline-flex h-9 w-9 items-center justify-center rounded-chip bg-brand-50 text-xs font-bold text-brand-700"
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
					<DummyRouteNotice />
					{@render children()}
				</div>
			</main>
		</div>
	</div>
</ZoneGuard>
