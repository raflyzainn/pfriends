<script>
	/**
	 * Header: bar atas aplikasi.
	 *
	 * Props (seluruhnya opsional):
	 * @prop {() => void} onMenuToggle
	 * @prop {{name:string,avatar?:string,tier?:string,activePk?:number,balanceKt?:number}|null} user
	 * @prop {number} notificationCount
	 * @prop {string} homeHref
	 * @prop {import('svelte').Snippet} actions
	 * @prop {string} profileHref       Jalur halaman profil zona yang sedang aktif.
	 * @prop {string} notificationHref  Jalur pusat kabar zona yang sedang aktif.
	 * @prop {string} roleLabel         Nama peran; kosong berarti tidak ditampilkan.
	 * @prop {string} exitHref          Halaman publik tujuan sesudah keluar.
	 *
	 * Saldo PK dan KT selalu terlihat di setiap halaman. Saldo yang terlihat
	 * adalah pengingat progres paling murah yang bisa dibangun: pengguna tidak
	 * perlu membuka halaman lain untuk tahu posisinya.
	 *
	 * TIGA PERUBAHAN V2:
	 *
	 * 1. **`profileHref` & `notificationHref` menjadi prop.** Sebelumnya keduanya
	 *    di-hard-code ke `/awardee/*`. Dengan tiga peran hidup, seorang verifikator
	 *    yang menekan lonceng atau avatarnya akan dilempar ke zona Awardee dan
	 *    ditolak `ZoneGuard`-nya sendiri: kegagalan yang tidak akan tertangkap
	 *    satu gerbang pun karena tautannya memang sah.
	 *
	 * 2. **`backdrop-blur-md` DICABUT.** Kedalaman datang dari foto, garis, dan
	 *    ruang putih: tidak pernah dari blur (prinsip P-4, cacat D-01).
	 *    Penggantinya latar putih penuh dengan hairline `ink-200`.
	 *
	 * 3. **Saldo PK/KT hanya muncul bila datanya dioper.** Zona publik memanggil
	 *    Header tanpa `user`, sehingga tidak ada jalur bagi angka gamifikasi untuk
	 *    sampai ke sana.
	 *
	 * ── PERUBAHAN G5 · KONTROL KELUAR ────────────────────────────────────────
	 *
	 * 4. **Header memegang satu-satunya kontrol keluar zona Awardee.** Sampai
	 *    gelombang ini, zona Awardee tidak punya jalan keluar sama sekali: tidak
	 *    di header, tidak di bilah ponsel, tidak di halaman profil. Peraga yang
	 *    masuk sebagai Awardee terkunci di sana sampai ia menghapus data situs
	 *    lewat DevTools: dan itu mematikan justru peragaan alur tiga peran
	 *    (PO-4), alur yang paling ingin ditunjukkan di ruang rapat. Tombol
	 *    "Keluar" karena itu BERLABEL dan BERBINGKAI, bukan ikon telanjang: yang
	 *    dicari orang pada layar asing adalah kata, bukan glyph.
	 *
	 * 5. **Komponen ini kini mengimpor store sesi: pengecualian yang disengaja.**
	 *    Aturan D-6 menetapkan `ZoneGuard` sebagai satu-satunya komponen bersama
	 *    yang boleh menyentuh `session`. Header adalah pengecualian kedua, dengan
	 *    dua alasan yang keduanya harus benar sebelum aturan itu ditawar:
	 *    (a) `src/routes/(public)/+layout.svelte` menyatakan tersurat bahwa
	 *        Header TIDAK dipakai di zona publik: komponen ini hanya hidup di
	 *        zona ter-login, jadi tidak ada pemakai yang "tanpa sesi";
	 *    (b) keluar adalah aksi sesi. Mengopernya lewat prop berarti tiga layout
	 *        zona harus mengingat memasangnya, dan zona yang lupa akan kembali
	 *        menjadi zona tanpa jalan keluar: persis cacat yang sedang ditutup.
	 *    Prop `user` tetap yang menentukan tombolnya dirender atau tidak, jadi
	 *    pemanggil tanpa sesi tetap mendapat header tanpa kontrol sesi.
	 *
	 * 6. **Navigasi mendahului `logout()`, bukan sebaliknya.** `ZoneGuard` punya
	 *    efek yang melempar tamu ke `/masuk?next=…` begitu sesi berakhir. Bila
	 *    sesi dibersihkan lebih dulu, kedua pengalihan berlomba dan pengguna
	 *    mendarat di gerbang login dengan `?next=` milik zona yang baru saja ia
	 *    tinggalkan: bukan di halaman publik. Karena itu urutannya: pindah ke
	 *    halaman publik sampai selesai, baru bersihkan sesi. `replaceState`
	 *    dipakai supaya tombol kembali tidak menuntun ke zona yang sudah tertutup.
	 *
	 * 7. **Wordmark boleh menyusut.** Dulu `shrink-0`; dengan tombol berlabel
	 *    tambahan, bilah selebar 360 px akan melebihi lebar layar dan memunculkan
	 *    gulir horizontal. Yang menyusut adalah tanda identitas yang sudah
	 *    ber-`truncate`, bukan kontrol yang harus tetap dapat ditekan.
	 *
	 * @see docs/12-BUILD-CONTRACT-V2.md: §2.13 Header { …, profileHref, notificationHref, roleLabel }
	 * @see docs/11-VISUAL-DIRECTION.md: §9 baris Header
	 */
	import { goto } from '$app/navigation';
	import Avatar from './Avatar.svelte';
	import PointsChip from './PointsChip.svelte';
	import Icon from './Icon.svelte';
	import { ICONS } from '$lib/data/icons.js';
	import { session } from '$lib/stores/session.svelte.js';
	import { formatAngka } from '$lib/utils/format.js';

	let {
		onMenuToggle = undefined,
		user = null,
		notificationCount = 0,
		homeHref = '/',
		actions = undefined,
		profileHref = '/awardee/profil',
		notificationHref = '/awardee/kabar',
		roleLabel = '',
		exitHref = '/'
	} = $props();

	/** Lencana notifikasi tidak pernah menampilkan angka tiga digit. */
	const BATAS_LENCANA = 99;
	const teksLencana = $derived(
		notificationCount > BATAS_LENCANA ? `${BATAS_LENCANA}+` : formatAngka(notificationCount)
	);

	/** @type {boolean} Proses keluar sedang berjalan; menahan tekanan ganda. */
	let sedangKeluar = $state(false);

	/**
	 * Mengakhiri sesi dan mengantar pengguna ke halaman publik.
	 *
	 * Urutannya disengaja: lihat butir 6 pada catatan berkas. `finally` dipakai
	 * agar sesi tetap dibersihkan sekalipun navigasinya gagal: sesi yang tertinggal
	 * setelah seseorang menekan "Keluar" adalah kegagalan yang jauh lebih buruk
	 * daripada mendarat di halaman yang keliru.
	 *
	 * @returns {Promise<void>}
	 */
	async function keluar() {
		if (sedangKeluar) return;
		sedangKeluar = true;
		try {
			await goto(exitHref, { replaceState: true });
		} finally {
			session.logout();
			sedangKeluar = false;
		}
	}
</script>

<header class="sticky top-0 z-30 h-14 border-b border-ink-200 bg-surface">
	<div class="mx-auto flex h-full max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
		{#if onMenuToggle}
			<button
				type="button"
				class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-800 lg:hidden"
				aria-label="Buka menu navigasi"
				onclick={onMenuToggle}
			>
				<Icon path={ICONS.menu} size={20} />
			</button>
		{/if}

		<!-- `shrink-0` DICABUT: lihat butir 7. Tanda identitas yang menyusut lebih
		     baik daripada bilah yang meluber keluar layar. -->
		<a href={homeHref} class="flex min-w-0 items-center gap-2.5">
			<!-- Keying rule merah tegak menggantikan ikon dalam kotak membulat (D-06):
			     bar warna polos, tidak pernah menyentuh glyph. -->
			<span class="block h-7 w-1 shrink-0 bg-pertamina-red" aria-hidden="true"></span>
			<span class="min-w-0">
				<!-- Wordmark tetap SANS. Fraunces dilarang di bawah 24 px (docs/11 §3.4):
				     pada 17 px ia terbaca sebagai teks badan yang salah pilih font, dan
				     seluruh kontras keluarganya justru hilang. -->
				<span
					class="block truncate font-sans text-[17px] leading-none font-extrabold tracking-[-0.02em] text-heading"
				>
					PFriends
				</span>
				<span class="label-micro mt-1 hidden leading-tight sm:block">
					{roleLabel || 'Pertamina Foundation'}
				</span>
			</span>
		</a>

		<div class="flex-1"></div>

		{#if actions}
			{@render actions()}
		{/if}

		{#if user}
			<div class="hidden items-center gap-1.5 sm:flex">
				<PointsChip points={user.activePk ?? 0} currency="PK" size="sm" showLabel={false} />
				<PointsChip points={user.balanceKt ?? 0} currency="KT" size="sm" showLabel={false} />
			</div>

			<a
				href={notificationHref}
				class="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-800"
				aria-label={notificationCount > 0
					? `Kabar PFriends, ${teksLencana} belum dibaca`
					: 'Kabar PFriends'}
			>
				<Icon path={ICONS.bell} size={20} />
				{#if notificationCount > 0}
					<!-- Latar #B91820 (pertamina-red-ink), BUKAN #ED1C24. Angka lencana ini
					     adalah TEKS 10 px, dan putih di atas merah polos hanya 4.38:1 :
					     gagal AA. #ED1C24 tetap sah untuk bar dan isian, tidak untuk glyph
					     (docs/11 §10.4, aturan emas docs/08 §0.1). -->
					<span
						class="numeric absolute top-1.5 right-1.5 inline-flex min-w-4 items-center justify-center rounded-full bg-pertamina-red-ink px-1 text-[10px] leading-4 font-bold text-white"
					>
						{teksLencana}
					</span>
				{/if}
			</a>

			<a href={profileHref} class="shrink-0 rounded-chip" aria-label="Profil {user.name}">
				<Avatar name={user.name} src={user.avatar} size="sm" tier={user.tier} showRing />
			</a>

			<!-- Kontrak G5: setiap zona ter-login punya jalan keluar yang berlabel dan
			     berada di tempat yang sama. `data-logout` adalah kaitan bagi skrip e2e :
			     atribut, bukan kalimat, supaya deteksinya tidak basi saat teksnya
			     diperbaiki (pola yang sama dipakai `ZoneGuard`). -->
			<button
				type="button"
				data-logout
				class="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-control border border-ink-200 bg-surface px-2.5 text-sm font-semibold text-ink-700 transition-colors hover:border-ink-300 hover:bg-ink-50 hover:text-heading disabled:opacity-60"
				aria-label="Keluar dari PFriends"
				disabled={sedangKeluar}
				onclick={keluar}
			>
				<Icon path={ICONS.logout} size={18} />
				<span aria-hidden="true">Keluar</span>
			</button>
		{:else}
			<!-- Latar #B91820 (pertamina-red-ink), BUKAN #ED1C24: putih di atas merah
			     polos hanya 4.38 pada teks 14px semibold: di bawah ambang AA
			     (docs/11 §10.4). #ED1C24 tetap dipakai untuk bar, bukan untuk glyph. -->
			<a
				href="/masuk"
				class="inline-flex min-h-9 items-center rounded-control bg-pertamina-red-ink px-4 text-sm font-semibold text-white transition-colors hover:bg-pertamina-red-dark"
			>
				Masuk
			</a>
		{/if}
	</div>
</header>
