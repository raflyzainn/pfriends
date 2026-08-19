<script>
	/**
	 * ZoneGuard — penjaga tiga keadaan untuk zona ber-peran.
	 *
	 * @prop {string} zone   Salah satu `Zone` dari AccessPolicy.
	 * @prop {string} label  Sebutan zona pada panel penolakan, mis. 'zona awardee'.
	 * @prop {import('svelte').Snippet} children Isi zona; hanya dirender bila berhak.
	 *
	 * Tiga keadaan, tiga perlakuan yang berbeda — dan perbedaannya disengaja:
	 *
	 * 1. `!session.ready` → splash. TIDAK mengalihkan dan TIDAK merender isi. Pada
	 *    milidetik pertama sesudah muat ulang, jawaban "siapa yang masuk?" memang
	 *    belum ada; mengalihkan pada saat itu akan melempar setiap pengguna sah
	 *    keluar setiap kali ia menekan tombol muat ulang.
	 * 2. Tamu → dialihkan ke `/masuk?next=…` dengan `replaceState`. Halaman zona
	 *    tidak boleh tertinggal di riwayat peramban; tanpa `replaceState`, tombol
	 *    kembali sesudah masuk akan memantulkan pengguna ke gerbang yang sama.
	 * 3. Sudah masuk tetapi zonanya keliru → panel penjelasan, BUKAN pengalihan
	 *    senyap. Seseorang yang mendarat di zona yang bukan miliknya perlu tahu
	 *    mengapa ia berhenti dan ke mana ia harus pergi; memindahkannya diam-diam
	 *    hanya memindahkan kebingungan.
	 *
	 * Dua atribut data — `data-zone-splash` dan `data-zone-denied` — adalah kontrak
	 * dengan skrip e2e (§6.2). Keduanya ATRIBUT, bukan teks, supaya deteksi
	 * "terlempar keluar" tidak ikut basi ketika kalimatnya diperbaiki.
	 *
	 * Komponen ini adalah SATU-SATUNYA komponen bersama yang boleh mengimpor store
	 * sesi (pengecualian tersurat pada D-6): tugasnya memang membaca sesi, dan
	 * menerimanya lewat props hanya memindahkan kewajiban itu ke tujuh layout.
	 *
	 * @see docs/12-BUILD-CONTRACT-V2.md — §2.13 kontrak ZoneGuard, §6.4 matriks perilaku guard
	 */
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Icon from './Icon.svelte';
	import { ICONS } from '$lib/data/icons.js';
	import { AccessPolicy } from '$lib/domain/policies/AccessPolicy.js';
	import { session } from '$lib/stores/session.svelte.js';

	let { zone, label = 'zona ini', children } = $props();

	const jalurKini = $derived(page.url?.pathname ?? '/');

	/** Peran yang sedang aktif berhak memasuki zona ini. */
	const berhak = $derived(
		AccessPolicy.canEnter(session.role, zone) && session.canAccess(jalurKini)
	);

	/** Beranda peran yang sedang aktif — tujuan tombol jalan keluar. */
	const beranda = $derived(session.homePath());

	// Hidrasi dijalankan dari guard, bukan dari tiap layout: guard adalah komponen
	// pertama yang butuh jawabannya, dan `hydrate()` idempoten sehingga beberapa
	// guard yang tumpang tindih tetap menunggu satu janji yang sama.
	$effect(() => {
		void session.hydrate();
	});

	// Tamu dialihkan ke halaman masuk sambil membawa tujuan semula. Efek ini juga
	// berlaku SESUDAH `logout()` dari dalam zona — tanpa itu, pengguna yang menekan
	// keluar tetap menatap halaman milik sesi yang baru saja berakhir.
	$effect(() => {
		if (!session.ready || session.isAuthenticated) return;
		const tujuan = `/masuk?next=${encodeURIComponent(jalurKini)}`;
		void goto(tujuan, { replaceState: true });
	});
</script>

{#if !session.ready}
	<div
		data-zone-splash
		class="flex min-h-screen items-center justify-center bg-canvas px-4"
		aria-busy="true"
	>
		<div class="text-center">
			<span
				class="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-pertamina-red text-white"
				aria-hidden="true"
			>
				<Icon path={ICONS.shield} size={24} />
			</span>
			<p class="mt-3 text-sm font-semibold text-heading">Menyiapkan PFfriends</p>
			<p class="mt-1 text-xs text-ink-500">Memulihkan sesi Anda.</p>
		</div>
	</div>
{:else if !session.isAuthenticated}
	<div
		data-zone-splash
		class="flex min-h-screen items-center justify-center bg-canvas px-4"
		aria-busy="true"
	>
		<div class="text-center">
			<span
				class="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-pertamina-red text-white"
				aria-hidden="true"
			>
				<Icon path={ICONS.lock} size={24} />
			</span>
			<p class="mt-3 text-sm font-semibold text-heading">Mengarahkan ke halaman masuk</p>
			<p class="mt-1 text-xs text-ink-500">{label} membutuhkan sesi yang aktif.</p>
		</div>
	</div>
{:else if !berhak}
	<div class="flex min-h-screen items-center justify-center bg-canvas px-4 py-10">
		<div data-zone-denied class="card w-full max-w-md p-6 text-center">
			<span
				class="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-pertamina-red-tint text-pertamina-red-ink"
				aria-hidden="true"
			>
				<Icon path={ICONS.lock} size={26} />
			</span>

			<h1 class="mt-4 text-lg font-bold text-heading">Bukan peran Anda</h1>
			<p class="mt-2 text-sm leading-relaxed text-ink-600">
				Anda masuk sebagai <span class="font-semibold text-ink-800">{session.roleLabel}</span>,
				sedangkan {label} diperuntukkan bagi peran lain. Pembatasan ini bukan karena datanya
				rahasia, melainkan karena keputusan yang diambil di dalamnya mengikat orang lain.
			</p>

			<div class="mt-5 flex flex-col gap-2">
				<a
					href={beranda}
					class="inline-flex min-h-11 items-center justify-center rounded-control bg-pertamina-red px-4 text-sm font-semibold text-white transition-colors hover:bg-pertamina-red-dark"
				>
					Kembali ke beranda {session.roleLabel}
				</a>
				<a
					href="/"
					class="inline-flex min-h-11 items-center justify-center rounded-control border border-ink-200 px-4 text-sm font-semibold text-ink-700 transition-colors hover:bg-ink-50"
				>
					Buka halaman publik PFfriends
				</a>
			</div>

			<p class="mt-4 text-xs text-ink-500">
				Butuh akses ke {label}? Hubungi Corporate Secretary Pertamina Foundation — peran diberikan
				lewat akun, bukan lewat tautan.
			</p>
		</div>
	</div>
{:else}
	{@render children?.()}
{/if}
