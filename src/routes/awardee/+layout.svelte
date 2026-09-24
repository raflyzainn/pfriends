<script>
	/**
	 * LAYOUT ZONA AWARDEE: kerangka yang membungkus seluruh halaman awardee.
	 *
	 * Tanggung jawab: memasang `ZoneGuard`, menyiapkan data yang dibutuhkan hampir
	 * setiap halaman zona ini (katalog isi komunitas + keadaan gamifikasi), lalu
	 * menyediakan navigasi yang sesuai dengan perangkat.
	 *
	 * ── PERUBAHAN: KERANGKA DISAMAKAN DENGAN ADMIN & VERIFIKATOR ────────────────
	 *
	 * Sebelumnya zona ini memakai `Header` + bilah tab mendatar, sementara dua zona
	 * ter-login lainnya memakai `Sidebar` + bilah atas. Tiga kerangka untuk tiga
	 * zona berarti tiga tempat yang perlahan berbeda perilaku: dan peraga yang
	 * berpindah dari layar admin ke layar awardee melihat dua aplikasi berbeda.
	 * Kini polanya satu: `Sidebar` bersama untuk desktop, laci yang sama untuk
	 * ponsel, `BottomNav` sebagai pelengkap sentuh.
	 *
	 * `BottomNav` DIPERTAHANKAN meski Sidebar sudah punya laci. Awardee membuka
	 * microsite ini terutama dari tautan WhatsApp di ponsel, dan navigasi utamanya
	 * harus terjangkau ibu jari tanpa membuka laci lebih dulu: itu perbedaan nyata
	 * dengan admin/verifikator yang bekerja di depan laptop.
	 *
	 * Penjagaan akses TIDAK ditulis di sini. Sejak V2 ia milik `ZoneGuard`, yang
	 * membedakan tiga keadaan: belum siap, tamu, dan peran keliru: dengan tiga
	 * perlakuan berbeda. Layout yang menulis penjaganya sendiri berarti empat zona
	 * dengan empat penjaga yang perlahan berbeda perilaku.
	 *
	 * Penyiapan data dikerjakan SEKALI di sini, bukan di tiap halaman. Awardee
	 * berpindah antar halaman berkali-kali dalam satu sesi; memuat ulang katalog di
	 * setiap halaman berarti membuka transaksi IndexedDB yang sama berulang kali
	 * untuk hasil yang identik, dan setiap perpindahan akan berkedip.
	 *
	 * @see docs/12-BUILD-CONTRACT-V2.md: §2.13 ZoneGuard & navigation.js, §2.14 route zona awardee
	 * @see docs/07-UX-SITEMAP.md: §1.2 poin dan tier sebagai lapisan persisten
	 */
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import {
		BottomNav,
		Avatar,
		Icon,
		PointsChip,
		Sidebar,
		TierBadge,
		ToastHost,
		ZoneGuard,
		ICONS
	} from '$lib/components';
	import { isNavActive, navForZone, withBadges } from '$lib/data/navigation.js';
	import { ActivityType } from '$lib/domain/constants/scoring-table.js';
	import { Zone } from '$lib/domain/policies/AccessPolicy.js';
	import { awardeeDashboard } from '$lib/stores/awardee-dashboard.svelte.js';
	import { gamification } from '$lib/stores/gamification.svelte.js';
	import { awardeeProfile } from '$lib/stores/profile.svelte.js';
	import { session } from '$lib/stores/session.svelte.js';
	import { toast } from '$lib/stores/toast.svelte.js';
	import { activitySubmissions, SubmissionStatus } from '$lib/stores/activity-submissions.svelte.js';
	import { workflowBadges } from '$lib/stores/workflow-badges.svelte.js';

	let { children } = $props();

	/** Banyaknya butir yang muat di bilah navigasi ponsel. */
	const BATAS_NAV_PONSEL = 5;

	/** Laci navigasi; hanya berpengaruh di bawah breakpoint lg. */
	let navTerbuka = $state(false);

	/** @type {boolean} Data zona sudah siap ditampilkan. */
	let siap = $state(false);

	/**
	 * Penanda penyiapan. Sengaja BUKAN `$state`: nilainya hanya dibaca di dalam
	 * efek untuk mencegah penyiapan berjalan dua kali, dan menjadikannya reaktif
	 * justru akan memicu ulang efek yang barusan mengubahnya.
	 * @type {boolean}
	 */
	let sudahDisiapkan = false;
	let kembaliBekerja = $state(false);
	let sisaImpersonasi = $state('');

	async function kembaliKeAdmin() {
		kembaliBekerja = true;
		try { await session.endImpersonation(); await goto('/admin/awardee'); }
		finally { kembaliBekerja = false; }
	}

	$effect(() => {
		if (!browser || !session.impersonation) return;
		const tick = () => {
			const remaining = new Date(session.impersonation.expiresAt).getTime() - Date.now();
			if (remaining <= 0) { void kembaliKeAdmin(); return; }
			sisaImpersonasi = `${Math.ceil(remaining / 60000)} menit`;
		};
		tick(); const interval = setInterval(tick, 30000); return () => clearInterval(interval);
	});

	/**
	 * Memuat data bersama zona awardee.
	 * @returns {Promise<void>}
	 */
	async function siapkanZona() {
		await Promise.all([awardeeDashboard.load(), gamification.refresh(), awardeeProfile.load(), activitySubmissions.load({ mine: true }), workflowBadges.loadMovements()]);
		siap = true;
	}

	$effect(() => {
		if (!browser || sudahDisiapkan) return;
		sudahDisiapkan = true;
		void siapkanZona();
	});

	const jalurKini = $derived(page.url?.pathname ?? '/awardee');

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
		return awardeeDashboard.broadcasts.filter((kabar) => kabar.isSent && !sudah.has(kabar.id)).length;
	});

	/** Naskah yang dikembalikan verifikator dan menunggu diperbaiki penulisnya. */
	const naskahPerluRevisi = $derived.by(() => {
		return awardeeDashboard.stories.filter((cerita) => cerita.needsRevision).length;
	});

	const kehadiranPerluDikirim = $derived.by(() => {
		const awardeeId = session.awardeeId;
		if (!awardeeId) return 0;
		const pengajuanPerKegiatan = new Map(activitySubmissions.items.filter((item) => item.event).map((item) => [item.event, item]));
		return awardeeDashboard.events.filter((event) => {
			const pengajuan = pengajuanPerKegiatan.get(event.id);
			return event.startsAt <= new Date() && !event.isCancelled && event.isRegistered(awardeeId) && !event.hasAttended(awardeeId) && (!pengajuan || pengajuan.status === SubmissionStatus.NEEDS_REVISION);
		}).length;
	});

	/** Tujuh tujuan zona awardee, sudah bertanda lencana. */
	const navZona = $derived(
		withBadges(navForZone(Zone.AWARDEE), {
			unreadBroadcasts: kabarBelumDiklaim,
			myStoriesNeedingRevision: naskahPerluRevisi,
			activityEvidenceRevision: activitySubmissions.items.filter((item) => item.status === SubmissionStatus.NEEDS_REVISION).length,
			movementRevision: workflowBadges.awardeeMovementRevision,
			attendanceAction: kehadiranPerluDikirim
		})
	);

	/** Lima tujuan bertanda `primary` untuk bilah ponsel. */
	const navPonsel = $derived(
		navZona.filter((item) => item.primary === true).slice(0, BATAS_NAV_PONSEL)
	);

	/**
	 * Label bagian yang sedang dibuka, untuk bilah atas.
	 *
	 * Butir dengan `href` terpanjang menang supaya `/awardee/cerita/tulis` tidak
	 * dilabeli keliru hanya karena butir lain diperiksa lebih dulu.
	 */
	const bagianKini = $derived(
		[...navZona]
			.sort((a, b) => b.href.length - a.href.length)
			.find((item) => isNavActive(item.href, jalurKini))?.label ?? 'Ruang anggota'
	);
</script>

<!-- Judul dokumen sengaja TIDAK ditulis di sini. Berbeda dengan zona admin dan
     verifikator, setiap halaman zona ini sudah punya `<svelte:head><title>`
     sendiri yang lebih spesifik daripada label navigasinya ("Perbaiki tulisan"
     vs "Blog Saya"). Menambahkan judul layout hanya akan menyisipkan elemen
     `<title>` kedua di dalam `<head>` yang sama. -->
<ZoneGuard zone={Zone.AWARDEE} label="Zona awardee">
	<div class="flex min-h-screen bg-canvas">
		<Sidebar
			bind:open={navTerbuka}
			nav={navZona}
			zone={Zone.AWARDEE}
			homeHref="/awardee"
			title="Ruang anggota"
		/>

		<div class="flex min-w-0 flex-1 flex-col">
			{#if session.impersonation}
				<div class="flex flex-wrap items-center justify-between gap-3 bg-pertamina-navy px-4 py-2 text-white sm:px-6 lg:px-8">
					<p class="text-sm font-semibold">Anda sedang masuk sebagai {session.impersonation.awardeeName}. Sesi berakhir dalam {sisaImpersonasi}.</p>
					<button type="button" class="rounded-control bg-white px-3 py-1.5 text-xs font-bold text-pertamina-navy disabled:opacity-60" disabled={kembaliBekerja} onclick={kembaliKeAdmin}>{kembaliBekerja ? 'Mengembalikan sesi...' : 'Kembali ke Admin'}</button>
				</div>
			{/if}
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

				<!-- Poin dan jenjang menetap di bilah atas: keduanya konteks yang membuat
				     setiap halaman zona ini masuk akal, bukan isi satu halaman tertentu. -->
				<div class="hidden items-center gap-2 sm:flex">
					<PointsChip points={gamification.points} currency="PK" size="sm" showLabel={false} />
					<TierBadge tier={gamification.tier.level} size="sm" />
				</div>

				<a
					href="/awardee/kabar"
					class="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900"
					aria-label="Kabar komunitas"
				>
					<Icon path={ICONS.bell} size={20} />
					{#if kabarBelumDiklaim > 0}
						<span
							class="numeric absolute top-1.5 right-1.5 inline-flex min-w-4 items-center justify-center rounded-full bg-pertamina-red-ink px-1 text-[10px] leading-4 text-white"
						>
							{kabarBelumDiklaim}
						</span>
					{/if}
				</a>

				<!-- Kartu nama menjadi satu-satunya jalan menuju `/awardee/profil` sejak butir
				     itu dicabut dari navigasi. Routenya tetap hidup dan tetap dirujuk komposer
				     Blog ("Buka pengaturan consent"); tanpa tautan ini, satu-satunya jalan ke
				     sana adalah mengetik alamatnya sendiri. -->
				<a
					href="/awardee/profil"
					class="hidden min-w-0 items-center gap-2 rounded-control border-l border-ink-100 py-1 pr-1 pl-3 transition-colors hover:bg-ink-50 md:flex"
				>
					<Avatar name={session.displayName} src={awardeeProfile.data?.profile?.avatarUrl || ''} size="sm" />
					<span class="min-w-0">
						<span class="block truncate text-xs leading-tight font-semibold text-heading">
							{session.displayName}
						</span>
						<span class="label-micro leading-tight">Profil saya</span>
					</span>
				</a>
			</header>

			<main class="min-w-0 flex-1 px-4 pt-5 pb-24 sm:px-6 lg:px-8 lg:pb-10">
				<div class="mx-auto w-full max-w-6xl">
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
				</div>
			</main>
		</div>

		<BottomNav items={navPonsel} zone={Zone.AWARDEE} ariaLabel="Navigasi zona awardee" />
		<ToastHost toasts={toast.items} ondismiss={(id) => toast.dismiss(id)} />
	</div>
</ZoneGuard>
