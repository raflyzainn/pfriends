<script>
	/**
	 * Sidebar — navigasi utama zona admin Pertamina Foundation.
	 *
	 * Props (seluruhnya opsional):
	 * @prop {boolean} open      Dapat di-`bind`; mengendalikan laci di mobile.
	 * @prop {{id:string,label:string,href:string,iconPath:string,badge?:string|number,
	 *         children?:any[]}[]} nav  Kosong → memakai `navForZone(zone)`.
	 * @prop {string} version
	 * @prop {string} title
	 * @prop {string} zone      Salah satu `Zone`; menentukan daftar bawaan.
	 * @prop {string} homeHref  Tujuan logo di kepala sidebar.
	 * @prop {string} exitHref  Halaman publik tujuan sesudah keluar.
	 *
	 * DAFTAR MENU tetap datang dari props atau dari `$lib/data/navigation.js` —
	 * data, bukan state — sehingga tidak ada daftar tandingan yang diam-diam
	 * menyimpang dari daftar zona.
	 *
	 * ── PERUBAHAN G5 · KAKI SESI ─────────────────────────────────────────────
	 *
	 * 1. **Kaki sidebar kini menyebut SIAPA yang sedang masuk, lalu menawarkan
	 *    jalan keluarnya.** Empat peninjau menemukan hal yang sama pada aplikasi
	 *    yang berjalan: berpindah peran mustahil dilakukan tanpa menghapus data
	 *    situs. Dua konsol memang sudah punya tombol keluar, tetapi keduanya ikon
	 *    telanjang di pojok bilah atas — tidak ada kata "keluar" di layar mana pun.
	 *    Nama peran yang tercetak di kaki juga menjawab pertanyaan pertama peraga
	 *    di ruang rapat ("ini sedang login sebagai siapa?") tanpa membuka profil.
	 *
	 * 2. **Karena itu komponen ini mengimpor store sesi.** Aturan D-6 menetapkan
	 *    `ZoneGuard` sebagai satu-satunya komponen bersama yang boleh; Sidebar
	 *    menjadi pengecualian dengan alasan yang sama seperti `Header`: ia hanya
	 *    dipakai dua zona ter-login (`/verifikator`, `/admin`), tidak pernah oleh
	 *    zona publik, dan keluar adalah aksi sesi yang tidak boleh bergantung pada
	 *    layout yang ingat memasang propnya.
	 *
	 * 3. **Navigasi mendahului `logout()`.** Bila sesi dibersihkan lebih dulu,
	 *    efek `ZoneGuard` melempar pengguna ke `/masuk?next=…` milik zona yang
	 *    baru ia tinggalkan, dan dua pengalihan berlomba. Urutan yang benar:
	 *    pindah ke halaman publik sampai selesai, baru bersihkan sesi.
	 */
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Icon from './Icon.svelte';
	import { ICONS } from '$lib/data/icons.js';
	import { isNavActive, navForZone } from '$lib/data/navigation.js';
	import { Zone } from '$lib/domain/policies/AccessPolicy.js';
	import { session } from '$lib/stores/session.svelte.js';
	import { kelas } from './_visual.js';

	let {
		open = $bindable(false),
		nav = [],
		version = '0.1.0',
		title = 'Konsol Admin',
		zone = Zone.ADMIN,
		homeHref = '/admin',
		exitHref = '/'
	} = $props();

	/** @type {boolean} Proses keluar sedang berjalan; menahan tekanan ganda. */
	let sedangKeluar = $state(false);

	/**
	 * Mengakhiri sesi dan mengantar pengguna ke halaman publik.
	 *
	 * Laci ditutup lebih dulu supaya halaman publik tidak muncul dengan overlay
	 * navigasi zona yang sudah tidak ada isinya. `finally` menjamin sesi tetap
	 * bersih sekalipun navigasinya gagal.
	 *
	 * @returns {Promise<void>}
	 */
	async function keluar() {
		if (sedangKeluar) return;
		sedangKeluar = true;
		open = false;
		try {
			await goto(exitHref, { replaceState: true });
		} finally {
			session.logout();
			sedangKeluar = false;
		}
	}

	const menu = $derived(nav.length > 0 ? nav : navForZone(zone));
	const jalurKini = $derived(page.url?.pathname ?? '');

	/**
	 * Sebuah item aktif bila jalurnya sama persis, atau bila jalur saat ini adalah
	 * anaknya. Aturannya hidup di `navigation.js` supaya sidebar, bilah ponsel, dan
	 * navigasi desktop menyalakan butir yang sama pada jalur yang sama.
	 * @param {string} href
	 */
	function aktif(href) {
		return isNavActive(href, jalurKini);
	}

	/** @param {{children?: any[]}} item */
	const punyaAnak = (item) => Array.isArray(item.children) && item.children.length > 0;

	/** @param {{href:string, children?: any[]}} item */
	const anakAktif = (item) =>
		punyaAnak(item) && item.children.some((anak) => aktif(anak.href));

	/** @type {Record<string, boolean>} */
	let dilipat = $state({});

	/** @param {{id:string, href:string, children?: any[]}} item */
	const terbuka = (item) => dilipat[item.id] ?? anakAktif(item);
</script>

{#snippet tautanMenu(item, anak = false)}
	{@const nyala = aktif(item.href)}
	<a
		href={item.href}
		aria-current={nyala ? 'page' : undefined}
		class={kelas(
			'group flex min-h-11 items-center gap-2.5 rounded-xl px-2.5 text-sm font-medium transition-all',
			anak && 'ml-3',
			nyala
				? 'border border-ink-100 bg-surface font-semibold text-heading shadow-card'
				: 'text-ink-600 hover:bg-white/70 hover:text-ink-800'
		)}
		style={nyala ? 'box-shadow: inset 3px 0 0 0 var(--color-pertamina-red), var(--shadow-card);' : ''}
		onclick={() => (open = false)}
	>
		<span
			class={kelas(
				'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
				nyala ? 'text-pertamina-red-ink' : 'text-ink-500 group-hover:text-ink-700'
			)}
		>
			<Icon path={item.iconPath} size={18} />
		</span>
		<span class="min-w-0 flex-1 truncate">{item.label}</span>
		{#if item.badge !== undefined && item.badge !== null}
			<span
				class="numeric shrink-0 rounded-chip bg-pertamina-red-tint px-1.5 py-0.5 text-[10px] font-bold text-pertamina-red-ink"
			>
				{item.badge}
			</span>
		{/if}
	</a>
{/snippet}

{#if open}
	<button
		type="button"
		class="fixed inset-0 z-40 bg-ink-900/50 lg:hidden"
		aria-label="Tutup menu navigasi"
		onclick={() => (open = false)}
	></button>
{/if}

<aside
	class={kelas(
		'fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-ink-100 transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0',
		open ? 'translate-x-0' : '-translate-x-full'
	)}
	style="background:linear-gradient(180deg, var(--color-surface) 0%, #fdfbf9 100%);"
	aria-label="Navigasi {title}"
>
	<div class="flex h-14 shrink-0 items-center justify-between gap-2 px-4">
		<a href={homeHref} class="flex min-w-0 items-center gap-2">
			<span
				class="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-pertamina-red text-white"
				aria-hidden="true"
			>
				<Icon path={ICONS.shield} size={18} />
			</span>
			<span class="min-w-0">
				<span class="block truncate text-sm leading-tight font-extrabold text-heading">Pfriends</span>
				<span class="label-micro leading-tight">{title}</span>
			</span>
		</a>

		<button
			type="button"
			class="inline-flex h-11 w-11 items-center justify-center rounded-control text-ink-500 hover:bg-ink-100 hover:text-ink-800 lg:hidden"
			aria-label="Tutup menu navigasi"
			onclick={() => (open = false)}
		>
			<Icon path={ICONS.x} size={20} />
		</button>
	</div>

	<nav class="flex-1 space-y-1 overflow-y-auto px-3 py-2">
		{#each menu as item (item.id)}
			{#if punyaAnak(item)}
				<button
					type="button"
					class="flex min-h-11 w-full items-center gap-2.5 rounded-xl px-2.5 text-sm font-medium text-ink-600 transition-colors hover:bg-white/70 hover:text-ink-800"
					aria-expanded={terbuka(item)}
					onclick={() => (dilipat[item.id] = !terbuka(item))}
				>
					<span class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-500">
						<Icon path={item.iconPath} size={18} />
					</span>
					<span class="min-w-0 flex-1 truncate text-left">{item.label}</span>
					<Icon path={terbuka(item) ? ICONS.chevronUp : ICONS.chevronDown} size={14} />
				</button>

				{#if terbuka(item)}
					<div class="space-y-1 py-1">
						{#each item.children as anak (anak.id)}
							{@render tautanMenu(anak, true)}
						{/each}
					</div>
				{/if}
			{:else}
				{@render tautanMenu(item)}
			{/if}
		{/each}
	</nav>

	<div class="shrink-0 border-t border-ink-100 px-3 py-3">
		{#if session.isAuthenticated}
			<div class="flex min-w-0 items-center gap-2 px-1.5">
				<span
					class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-chip bg-pertamina-navy-tint text-[11px] font-bold text-pertamina-navy"
					aria-hidden="true"
				>
					{session.user?.initials ?? 'PF'}
				</span>
				<span class="min-w-0">
					<span class="block truncate text-xs leading-tight font-semibold text-heading">
						{session.displayName}
					</span>
					<span class="label-micro block truncate leading-tight">{session.roleLabel}</span>
				</span>
			</div>

			<!-- `data-logout` adalah kaitan e2e: atribut, bukan kalimat. -->
			<button
				type="button"
				data-logout
				class="mt-2.5 flex min-h-11 w-full items-center gap-2.5 rounded-xl border border-ink-200 bg-surface px-2.5 text-sm font-semibold text-ink-700 transition-colors hover:border-ink-300 hover:bg-ink-50 hover:text-heading disabled:opacity-60"
				disabled={sedangKeluar}
				onclick={keluar}
			>
				<span
					class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-500"
					aria-hidden="true"
				>
					<Icon path={ICONS.logout} size={18} />
				</span>
				<span class="min-w-0 flex-1 truncate text-left">Keluar dari Pfriends</span>
			</button>
		{/if}

		<p class="label-micro mt-3 px-1.5">Pfriends Console</p>
		<p class="numeric mt-1 px-1.5 text-xs text-ink-500">
			v{version} · © 2026 Pertamina Foundation
		</p>
	</div>
</aside>
