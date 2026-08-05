<script>
	/**
	 * LAYOUT ZONA AWARDEE — kerangka yang membungkus seluruh halaman awardee.
	 *
	 * Tanggung jawab: memasang `ZoneGuard`, menyiapkan data yang dibutuhkan hampir
	 * setiap halaman zona ini (katalog isi komunitas + keadaan gamifikasi), lalu
	 * menyediakan navigasi yang sesuai dengan perangkat.
	 *
	 * Penjagaan akses sudah TIDAK ditulis di sini. Sejak V2 ia milik `ZoneGuard`,
	 * yang membedakan tiga keadaan — belum siap, tamu, dan peran keliru — dengan
	 * tiga perlakuan berbeda. Layout yang menulis penjaganya sendiri berarti empat
	 * zona dengan empat penjaga yang perlahan berbeda perilaku.
	 *
	 * Karena `ZoneGuard` tidak merender isinya sebelum peran terbukti berhak,
	 * seluruh efek penyiapan di bawah baru berjalan setelah sesi sah — tidak perlu
	 * lagi ada pemeriksaan `isAuthenticated` di dalam fungsi penyiapan.
	 *
	 * Penyiapan data dikerjakan SEKALI di sini, bukan di tiap halaman. Awardee
	 * berpindah antar halaman berkali-kali dalam satu sesi; memuat ulang katalog di
	 * setiap halaman berarti membuka transaksi IndexedDB yang sama berulang kali
	 * untuk hasil yang identik, dan setiap perpindahan akan berkedip.
	 *
	 * Daftar navigasi datang dari `$lib/data/navigation.js`. Zona ini punya sepuluh
	 * tujuan; lima yang bertanda `primary` adalah yang muat di bilah ponsel. Awardee
	 * membuka microsite ini terutama dari ponsel lewat tautan WhatsApp, sehingga
	 * `BottomNav` adalah navigasi utama mereka — bukan pelengkap.
	 *
	 * @see docs/12-BUILD-CONTRACT-V2.md — §2.13 ZoneGuard & navigation.js, §2.14 route zona awardee
	 * @see docs/07-UX-SITEMAP.md — §1.2 poin dan tier sebagai lapisan persisten
	 */
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { BottomNav, Header, Icon, TierBadge, ToastHost, ZoneGuard } from '$lib/components';
	import { isNavActive, navForZone, withBadges } from '$lib/data/navigation.js';
	import { ActivityType } from '$lib/domain/constants/scoring-table.js';
	import { Zone } from '$lib/domain/policies/AccessPolicy.js';
	import { catalog } from '$lib/stores/catalog.svelte.js';
	import { gamification } from '$lib/stores/gamification.svelte.js';
	import { session } from '$lib/stores/session.svelte.js';
	import { toast } from '$lib/stores/toast.svelte.js';

	let { children } = $props();

	/** Banyaknya butir yang muat di bilah navigasi ponsel. */
	const BATAS_NAV_PONSEL = 5;

	/** @type {boolean} Data zona sudah siap ditampilkan. */
	let siap = $state(false);

	/**
	 * Penanda penyiapan. Sengaja BUKAN `$state`: nilainya hanya dibaca di dalam
	 * efek untuk mencegah penyiapan berjalan dua kali, dan menjadikannya reaktif
	 * justru akan memicu ulang efek yang barusan mengubahnya.
	 * @type {boolean}
	 */
	let sudahDisiapkan = false;

	/**
	 * Memuat data bersama zona awardee.
	 * @returns {Promise<void>}
	 */
	async function siapkanZona() {
		await Promise.all([catalog.load(), gamification.refresh()]);
		siap = true;
	}

	$effect(() => {
		if (!browser || sudahDisiapkan) return;
		sudahDisiapkan = true;
		void siapkanZona();
	});

	const jalurKini = $derived(page.url?.pathname ?? '');

	/**
	 * Kabar yang poin bacanya belum pernah diklaim awardee ini.
	 *
	 * Sumbernya buku besar poin, bukan penanda `openedBy` pada kabar. Yang ingin
	 * dijawab lencana ini adalah "masih ada poin yang menunggu di sini", dan hanya
	 * buku besar yang tahu jawabannya.
	 */
	const kabarBelumDiklaim = $derived.by(() => {
		const sudah = new Set(
			gamification.ledger
				.filter((entri) => entri.activityType === ActivityType.BROADCAST_VIEW)
				.map((entri) => entri.refId)
				.filter(Boolean)
		);
		return catalog.sentBroadcasts.filter((kabar) => !sudah.has(kabar.id)).length;
	});

	/** Naskah yang dikembalikan verifikator dan menunggu diperbaiki penulisnya. */
	const naskahPerluRevisi = $derived.by(() => {
		const awardeeId = session.awardeeId;
		if (!awardeeId) return 0;
		return catalog.storiesByAwardee(awardeeId).filter((cerita) => cerita.needsRevision).length;
	});

	/** Sepuluh tujuan zona awardee, sudah bertanda lencana. */
	const navZona = $derived(
		withBadges(navForZone(Zone.AWARDEE), {
			unreadBroadcasts: kabarBelumDiklaim,
			myStoriesNeedingRevision: naskahPerluRevisi
		})
	);

	/** Lima tujuan bertanda `primary` untuk bilah ponsel. */
	const navPonsel = $derived(
		navZona.filter((item) => item.primary === true).slice(0, BATAS_NAV_PONSEL)
	);

	/** Potret pengguna untuk header — poin dan koin dibaca langsung dari store. */
	const penggunaHeader = $derived(
		session.user
			? {
					name: session.user.name,
					tier: gamification.tier.level,
					activePk: gamification.points,
					balanceKt: gamification.coins
				}
			: null
	);
</script>

<ZoneGuard zone={Zone.AWARDEE} label="Zona awardee">
	<div class="min-h-screen bg-canvas">
		<Header user={penggunaHeader} notificationCount={kabarBelumDiklaim} homeHref="/awardee">
			{#snippet actions()}
				<TierBadge tier={gamification.tier.level} size="sm" />
			{/snippet}
		</Header>

		<!-- Navigasi desktop. Di ponsel tempatnya diambil alih BottomNav. -->
		<nav
			class="sticky top-14 z-20 hidden border-b border-ink-100 bg-white/85 backdrop-blur-md lg:block"
			aria-label="Navigasi zona awardee"
		>
			<ul class="mx-auto flex max-w-7xl items-stretch gap-1 overflow-x-auto px-4 sm:px-6 lg:px-8">
				{#each navZona as item (item.id)}
					{@const nyala = isNavActive(item.href, jalurKini)}
					<li class="shrink-0">
						<a
							href={item.href}
							aria-current={nyala ? 'page' : undefined}
							class="flex min-h-11 items-center gap-1.5 border-b-2 px-3 text-sm transition-colors {nyala
								? 'border-pertamina-red font-semibold text-pertamina-red-ink'
								: 'border-transparent font-medium text-ink-600 hover:text-ink-900'}"
						>
							<Icon path={item.iconPath} size={16} />
							{item.label}
							{#if item.badge}
								<span
									class="numeric ml-0.5 inline-flex min-w-4 items-center justify-center rounded-full bg-pertamina-red px-1 text-[10px] leading-4 font-bold text-white"
								>
									{item.badge}
								</span>
							{/if}
						</a>
					</li>
				{/each}
			</ul>
		</nav>

		<main class="mx-auto w-full max-w-7xl px-4 pt-5 pb-24 sm:px-6 lg:px-8 lg:pb-12">
			{#if siap}
				{@render children()}
			{:else}
				<div class="space-y-4" aria-busy="true" aria-label="Menyiapkan data komunitas">
					<div class="skeleton h-8 w-56 rounded-control"></div>
					<div class="skeleton h-44 w-full rounded-card"></div>
					<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
						{#each ['a', 'b', 'c', 'd'] as kunci (kunci)}
							<div class="skeleton h-28 rounded-card"></div>
						{/each}
					</div>
				</div>
			{/if}
		</main>

		<BottomNav items={navPonsel} zone={Zone.AWARDEE} ariaLabel="Navigasi zona awardee" />
		<ToastHost toasts={toast.items} ondismiss={(id) => toast.dismiss(id)} />
	</div>
</ZoneGuard>
