<script>
	/**
	 * LAYOUT ZONA VERIFIKATOR: kerangka ruang kerja peninjauan konten.
	 *
	 * Tanggung jawab: memasang `ZoneGuard`, menyediakan navigasi ketiga tujuan zona
	 * dari `navigation.js`, dan memuat sekali antrean editorial beserta katalog yang
	 * dibaca seluruh halamannya.
	 *
	 * Lima keputusan yang tidak terbaca dari kode:
	 *
	 * 1. **Penjagaan akses tidak ditulis di sini.** Ia milik `ZoneGuard`, yang
	 *    membedakan tiga keadaan: belum siap, tamu, dan peran keliru: dengan tiga
	 *    perlakuan berbeda, dan yang membawa `data-zone-splash`/`data-zone-denied`
	 *    sebagai satu-satunya detektor bagi skrip e2e. Layout yang menulis penjaga
	 *    sendiri berarti empat zona dengan empat penjaga yang perlahan berbeda.
	 * 2. **Daftar navigasi TIDAK ditulis tangan.** Ia datang dari
	 *    `navForZone(Zone.VERIFIER)`, dan angka lencananya ditempelkan `withBadges`
	 *    dari store: bukan disimpan di daftar menu. Ketiga tujuan zona ini
	 *    seluruhnya `primary`: verifikator bekerja di dalam antrean, dan tidak ada
	 *    tujuan yang hanya dapat dicapai dari desktop (`docs/10` §6.4).
	 * 3. **`Header` bersama sengaja TIDAK dipakai.** Komponen itu merender
	 *    `PointsChip` PK dan KT begitu prop `user` terisi: angka gamifikasi milik
	 *    akun yang sedang masuk. Verifikator dinilai pada mutu keputusan, bukan pada
	 *    capaian angka, sehingga bilah atas zona ini ditulis di sini supaya tidak ada
	 *    jalur bagi poin PRIBADI untuk sampai ke layar ini. Poin AWARDEE pada papan
	 *    peringkat dasbor adalah hal berbeda: itu data yang ditinjau, bukan capaian
	 *    peninjaunya.
	 * 4. **Pemuatan dikerjakan sekali di layout.** Seluruh halaman membaca antrean
	 *    yang sama, dan `editorial.load()` maupun `catalog.load()` idempoten :
	 *    memindahkannya ke tiap halaman hanya menambah tempat yang bisa lupa
	 *    memanggilnya, dan satu kedipan tiap kali berpindah antrean.
	 * 5. **Efek pemuatan berjalan di dalam `ZoneGuard`.** Karena guard tidak
	 *    merender isinya sebelum peran terbukti verifikator, tidak perlu ada
	 *    pemeriksaan peran kedua di sini: dan aplikasi tidak membaca seluruh tabel
	 *    untuk seseorang yang tidak akan pernah melihat hasilnya.
	 *
	 * @see docs/12-BUILD-CONTRACT-V2.md: §3.5 WP-06 butir 1, §2.13 ZoneGuard & navigation.js
	 * @see docs/10-REVISION-SPEC.md: §6.4 route zona verifikator, §3.7 matriks perilaku guard
	 */
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { BottomNav, Button, DummyRouteNotice, Icon, Sidebar, ToastHost, ZoneGuard, ICONS } from '$lib/components';
	import { isNavActive, navForZone, withBadges } from '$lib/data/navigation.js';
	import { Zone } from '$lib/domain/policies/AccessPolicy.js';
	import { catalog } from '$lib/stores/catalog.svelte.js';
	import { editorial } from '$lib/stores/editorial.svelte.js';
	import { session } from '$lib/stores/session.svelte.js';
	import { toast } from '$lib/stores/toast.svelte.js';
	import { activitySubmissions } from '$lib/stores/activity-submissions.svelte.js';
	import { registration } from '$lib/stores/registration.svelte.js';
	import { RegistrationStatus } from '$lib/domain/constants/registration.js';
	import { workflowBadges } from '$lib/stores/workflow-badges.svelte.js';

	let { children } = $props();

	/** Laci navigasi; hanya berpengaruh di bawah breakpoint lg. */
	let navTerbuka = $state(false);

	/**
	 * Penanda penyiapan. Sengaja BUKAN `$state`: nilainya hanya dibaca di dalam
	 * efek untuk mencegah pemuatan berjalan dua kali, dan menjadikannya reaktif
	 * justru akan memicu ulang efek yang barusan mengubahnya.
	 * @type {boolean}
	 */
	let sudahDisiapkan = false;

	$effect(() => {
		if (!browser || sudahDisiapkan) return;
		sudahDisiapkan = true;
		void catalog.load();
		void editorial.load();
		void activitySubmissions.load();
		void registration.loadQueue();
		void workflowBadges.loadMovements();
		void workflowBadges.loadRedemptions();
	});

	/** Ketiga tujuan zona verifikator, sudah bertanda lencana antrean. */
	const navZona = $derived(
		withBadges(navForZone(Zone.VERIFIER), {
			storyQueue: editorial.storyQueue.length,
			eventQueue: editorial.eventQueue.length,
			activityEvidenceQueue: activitySubmissions.queueCount,
			movementQueue: workflowBadges.verifierMovementQueue,
			registrationQueue: registration.items.filter((item) => item.status === RegistrationStatus.PENDING).length,
			redemptionQueue: workflowBadges.redemptionQueue
		})
	);

	/** Ketiga tujuan seluruhnya `primary`, jadi bilah ponsel memuat daftar yang sama. */
	const navPonsel = $derived(navZona.filter((item) => item.primary === true));

	const jalurKini = $derived(page.url?.pathname ?? '/verifikator');

	/** Label bagian yang sedang dibuka, untuk bilah atas ponsel. */
	const bagianKini = $derived(
		navZona.find((item) => isNavActive(item.href, jalurKini))?.label ?? 'Ruang kerja verifikator'
	);
</script>

<svelte:head>
	<title>{bagianKini} · Verifikator PFriends</title>
</svelte:head>

<ZoneGuard zone={Zone.VERIFIER} label="ruang kerja verifikator">
	<div class="flex min-h-screen bg-canvas">
		<Sidebar
			bind:open={navTerbuka}
			nav={navZona}
			zone={Zone.VERIFIER}
			homeHref="/verifikator"
			title="Ruang kerja verifikator"
		/>

		<div class="flex min-w-0 flex-1 flex-col">
			<header
				class="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-ink-200 bg-surface px-4"
			>
				<button
					type="button"
					class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-ink-600 hover:bg-ink-100 hover:text-ink-800 lg:hidden"
					aria-label="Buka menu navigasi"
					onclick={() => (navTerbuka = true)}
				>
					<Icon path={ICONS.menu} size={20} />
				</button>

				<div class="min-w-0 flex-1">
					<p class="label-micro leading-tight">Pertamina Foundation · PFriends</p>
					<p class="truncate text-sm leading-tight font-semibold text-heading">{bagianKini}</p>
				</div>

				<!--
					Nol lencana poin dan nol tier untuk akun yang sedang masuk.
					Blok identitas ini disembunyikan pada `lg`: di lebar itu sidebar sudah
					berdiri permanen dan menampilkan identitas yang sama di kakinya, dan dua
					salinan nama pengguna dalam satu layar hanyalah dua kali kesempatan bagi
					keduanya untuk berselisih.
				-->
				<div class="hidden min-w-0 items-center gap-2 border-l border-ink-100 pl-3 sm:flex lg:hidden">
					<span
						class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-chip bg-pertamina-navy-tint text-xs font-bold text-pertamina-navy"
						aria-hidden="true"
					>
						{session.user?.initials ?? 'PF'}
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
					ariaLabel="Keluar dari ruang kerja verifikator"
					onclick={() => session.logout()}
				/>
			</header>

			<main class="min-w-0 flex-1 px-4 pt-5 pb-24 sm:px-6 lg:px-8 lg:pb-10">
				<div class="mx-auto w-full max-w-6xl">
					<DummyRouteNotice />
					{@render children()}
				</div>
			</main>
		</div>

		<BottomNav items={navPonsel} zone={Zone.VERIFIER} ariaLabel="Navigasi zona verifikator" />
		<ToastHost toasts={toast.items} ondismiss={(id) => toast.dismiss(id)} />
	</div>
</ZoneGuard>
