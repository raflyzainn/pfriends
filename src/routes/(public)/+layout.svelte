<script>
	/**
	 * LAYOUT ZONA PUBLIK — masthead terbitan, bukan bilah aplikasi.
	 *
	 * Zona ini tidak pernah menuntut sesi. Hal 4 dokumen sumber menempatkan
	 * microsite sebagai "rumah" komunitas yang dibuka dari kotak biru
	 * pertaminafoundation.org, dan setiap tautan yang dibagikan anggota harus dapat
	 * dibuka siapa pun. Gerbang login di depan mematikan dua fungsi sekaligus:
	 * rekrutmen anggota baru dan amplifikasi konten.
	 *
	 * EMPAT KEPUTUSAN YANG TIDAK TERBACA DARI KODE:
	 *
	 * 1. **`Header.svelte` sengaja TIDAK dipakai di sini.** Header bersama adalah
	 *    bilah aplikasi: satu baris, pil nav ber-tint, latar putih semitransparan
	 *    berpenapis buram, lonceng notifikasi, avatar. Zona publik memakai masthead
	 *    dua baris berlatar kanvas solid — tanpa penapis buram sama sekali
	 *    (`docs/11` §6 E0 dan prinsip P-4) — sehingga memaksakan keduanya menjadi satu
	 *    komponen berarti satu berkas dengan dua kepribadian yang saling menahan.
	 *    Header tetap dipakai apa adanya oleh tiga zona ter-login.
	 *
	 * 2. **Nav dibaca dari `navForZone(Zone.PUBLIC)`, bukan daftar tulis tangan.**
	 *    Berkas ini dulu memelihara `NAV` sendiri berisi lima destinasi, sementara
	 *    `navigation.js` memuat enam. Dua sumber kebenaran untuk satu menu adalah
	 *    alasan `/kalender` tidak pernah muncul di microsite.
	 *
	 * 3. **Tautan `/kalender` boleh 404 selama G3-B.** Halaman itu milik WP-08 dan
	 *    sedang dibangun paralel. Membuat versi tandingan "supaya tidak 404" adalah
	 *    pelanggaran KP-3 yang akan tertimpa tanpa jejak.
	 *
	 * 4. **`catalog` DAN `impact` dimuat sekali di sini.** Keduanya idempoten, dan
	 *    tujuh halaman publik membaca potret yang sama. Memuatnya per halaman
	 *    membuat setiap perpindahan menampilkan kerangka kosong lebih dulu.
	 *
	 * @see docs/11-VISUAL-DIRECTION.md — §6 E0 masthead dua baris, three-band tick
	 * @see docs/12-BUILD-CONTRACT-V2.md — §3.5 WP-04
	 */
	import { page } from '$app/state';
	import { Footer, Icon, ICONS } from '$lib/components';
	import { catalog } from '$lib/stores/catalog.svelte.js';
	import { impact } from '$lib/stores/impact.svelte.js';
	import { navForZone, isNavActive } from '$lib/data/navigation.js';
	import { Zone } from '$lib/domain/policies/AccessPolicy.js';

	let { children } = $props();

	/** Enam destinasi microsite — satu sumber kebenaran, lihat keputusan 2. */
	const NAV = navForZone(Zone.PUBLIC);

	let menuTerbuka = $state(false);

	const jalur = $derived(page.url?.pathname ?? '/');

	/**
	 * Menyalakan penanda aktif untuk satu butir navigasi.
	 *
	 * Beranda dibandingkan persis; tanpa itu setiap halaman akan menandai Beranda
	 * sebagai aktif karena seluruh jalur berawalan "/".
	 *
	 * @param {string} href
	 * @returns {boolean}
	 */
	function aktif(href) {
		return isNavActive(href, jalur, { exact: href === '/' });
	}

	$effect(() => {
		catalog.load();
		impact.load();
	});
</script>

<div class="flex min-h-dvh flex-col bg-canvas">
	<!-- E0 baris 1 — pita institusi. Fakta penyelenggara, bukan slogan. -->
	<div class="bg-pertamina-navy">
		<div class="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2 sm:px-6 lg:px-8">
			<p
				class="min-w-0 truncate font-mono text-[11px] leading-none tracking-[0.08em] text-white/75 uppercase"
			>
				Divisi Corporate Secretary · Pertamina Foundation
			</p>
			<a
				href="/masuk"
				class="shrink-0 font-mono text-[11px] leading-none tracking-[0.08em] text-white/75 uppercase underline-offset-4 transition-colors hover:text-white hover:underline"
			>
				Masuk
			</a>
		</div>
	</div>

	<!-- E0 baris 2 — wordmark + navigasi teks polos. Tanpa blur, tanpa pil ber-tint. -->
	<header class="border-b border-ink-200 bg-canvas">
		<div class="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-4 sm:px-6 lg:px-8">
			<a href="/" class="min-w-0 shrink-0" aria-label="Pfriends — beranda">
				<span class="display-editorial block text-[26px] text-heading">Pfriends</span>
				<!-- Three-band tick: turunan tiga pita panah logo Pertamina. Muncul tepat
				     dua kali per halaman — di sini dan di atas footer. -->
				<span class="mt-1.5 flex h-1 w-[72px] overflow-hidden" aria-hidden="true">
					<span class="h-full basis-[40%] bg-pertamina-red"></span>
					<span class="h-full basis-[30%] bg-pertamina-green"></span>
					<span class="h-full basis-[30%] bg-pertamina-navy"></span>
				</span>
			</a>

			<nav class="hidden min-w-0 items-center gap-6 lg:flex" aria-label="Navigasi microsite">
				{#each NAV as item (item.id)}
					<a
						href={item.href}
						aria-current={aktif(item.href) ? 'page' : undefined}
						class="border-b-2 py-1 text-[15px] transition-colors
							{aktif(item.href)
							? 'border-pertamina-red font-semibold text-heading'
							: 'border-transparent text-ink-700 hover:border-ink-300 hover:text-heading'}"
					>
						{item.label}
					</a>
				{/each}
			</nav>

			<div class="flex shrink-0 items-center gap-2">
				<a
					href="/daftar"
					class="hidden min-h-11 items-center rounded-control bg-pertamina-red-ink px-5 text-sm font-semibold text-white transition-colors hover:bg-pertamina-red-dark sm:inline-flex"
				>
					Gabung
				</a>
				<button
					type="button"
					class="inline-flex h-11 w-11 items-center justify-center rounded-control text-ink-700 transition-colors hover:bg-ink-100 lg:hidden"
					aria-label="Buka menu navigasi"
					onclick={() => (menuTerbuka = true)}
				>
					<Icon path={ICONS.menu} size={22} />
				</button>
			</div>
		</div>
	</header>

	{#if menuTerbuka}
		<div class="fixed inset-0 z-40 lg:hidden">
			<button
				type="button"
				class="absolute inset-0 bg-ink-900/50"
				aria-label="Tutup menu navigasi"
				onclick={() => (menuTerbuka = false)}
			></button>

			<div class="relative ml-auto flex h-full w-72 max-w-[85vw] flex-col bg-canvas shadow-xl">
				<div class="flex h-16 shrink-0 items-center justify-between border-b border-ink-200 px-4">
					<span class="display-editorial text-[20px] text-heading">Pfriends</span>
					<button
						type="button"
						class="inline-flex h-11 w-11 items-center justify-center rounded-control text-ink-700 transition-colors hover:bg-ink-100"
						aria-label="Tutup menu navigasi"
						onclick={() => (menuTerbuka = false)}
					>
						<Icon path={ICONS.x} size={20} />
					</button>
				</div>

				<nav class="flex-1 overflow-y-auto px-4 py-3" aria-label="Navigasi microsite (ponsel)">
					<ul>
						{#each NAV as item (item.id)}
							<li class="border-b border-ink-200 last:border-b-0">
								<a
									href={item.href}
									aria-current={aktif(item.href) ? 'page' : undefined}
									onclick={() => (menuTerbuka = false)}
									class="flex min-h-12 items-center text-[15px] transition-colors
										{aktif(item.href)
										? 'font-semibold text-heading'
										: 'text-ink-700 hover:text-heading'}"
								>
									{item.label}
								</a>
							</li>
						{/each}
					</ul>
				</nav>

				<div class="shrink-0 space-y-2 border-t border-ink-200 p-4">
					<a
						href="/daftar"
						onclick={() => (menuTerbuka = false)}
						class="flex min-h-11 w-full items-center justify-center rounded-control bg-pertamina-red-ink px-4 text-sm font-semibold text-white transition-colors hover:bg-pertamina-red-dark"
					>
						Gabung Sekarang
					</a>
					<a
						href="/masuk"
						onclick={() => (menuTerbuka = false)}
						class="flex min-h-11 w-full items-center justify-center px-4 text-sm font-semibold text-ink-700 underline underline-offset-4 transition-colors hover:text-heading"
					>
						Sudah punya akun? Masuk
					</a>
				</div>
			</div>
		</div>
	{/if}

	<main class="flex-1">
		{@render children()}
	</main>

	<!-- Kemunculan kedua three-band tick. Tanda tangan harus langka agar tetap tanda tangan. -->
	<div class="mx-auto flex w-full max-w-7xl px-4 pb-2 sm:px-6 lg:px-8">
		<span class="flex h-1 w-[72px] overflow-hidden" aria-hidden="true">
			<span class="h-full basis-[40%] bg-pertamina-red"></span>
			<span class="h-full basis-[30%] bg-pertamina-green"></span>
			<span class="h-full basis-[30%] bg-pertamina-navy"></span>
		</span>
	</div>

	<Footer />
</div>
