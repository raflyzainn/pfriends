<script>
	/**
	 * HALAMAN GALAT — satu-satunya pendaratan untuk jalur yang tidak dikenal.
	 *
	 * Tanggung jawab: menjawab tautan lama `/member/**` yang SENGAJA tidak
	 * dialihkan, dan menjawab salah ketik jalur apa pun, dengan kalimat Bahasa
	 * Indonesia yang menyebut langkah berikutnya.
	 *
	 * Mengapa `/member/**` tidak dialihkan. Pengalihan diam-diam membuat tautan lama
	 * tetap "berfungsi" di WhatsApp selama bertahun-tahun, dan selama itu pula tidak
	 * seorang pun memperbaikinya di sumbernya. Halaman ini memilih memberi tahu
	 * bahwa alamatnya berubah — sekali, dengan jelas — lalu menunjukkan alamat baru
	 * yang setara. Ini keputusan §2.14, bukan kelalaian rute.
	 *
	 * Tautan keluar sengaja hanya menuju zona publik. Halaman galat tidak tahu siapa
	 * yang membukanya, dan menawarkan "kembali ke dasbor Anda" kepada tamu berarti
	 * mengantarnya ke gerbang yang akan menolaknya lagi.
	 *
	 * @see docs/12-BUILD-CONTRACT-V2.md — §2.14 route final V2, `/member/**` hilang tanpa pengalihan
	 */
	import { page } from '$app/state';
	import { Icon, ICONS } from '$lib/components';

	/** Jalur yang gagal dibuka; dipakai mengenali tautan warisan. */
	const jalurKini = $derived(page.url?.pathname ?? '');

	/** Kode status HTTP yang dilaporkan SvelteKit. */
	const kode = $derived(page.status ?? 404);

	/**
	 * Tautan lama zona anggota memakai awalan `/member`. Sejak V2 zonanya bernama
	 * `/awardee` — kata "member" dicabut sebagai identitas peran, bukan sekadar
	 * diganti demi selera penamaan.
	 */
	const tautanWarisan = $derived(jalurKini === '/member' || jalurKini.startsWith('/member/'));

	/** Padanan jalur baru untuk tautan warisan. */
	const jalurPengganti = $derived(
		tautanWarisan ? jalurKini.replace(/^\/member/, '/awardee') : '/awardee'
	);

	const JUDUL = 'Halaman tidak ditemukan';

	/** Tiga tujuan publik yang paling sering dicari orang yang tersesat. */
	const TUJUAN = [
		{ label: 'Beranda PFfriends', href: '/', iconPath: ICONS.home },
		{ label: 'Cerita komunitas', href: '/cerita', iconPath: ICONS.book },
		{ label: 'Masuk ke akun', href: '/masuk', iconPath: ICONS.lock }
	];
</script>

<svelte:head>
	<title>{JUDUL} — PFfriends</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="mx-auto flex min-h-[70vh] max-w-2xl flex-col justify-center px-4 py-12 sm:px-6 lg:px-8">
	<p class="numeric text-sm font-bold tracking-wide text-pertamina-red-ink">Galat {kode}</p>
	<h1 class="mt-2 text-2xl font-extrabold text-heading sm:text-3xl">{JUDUL}</h1>

	{#if tautanWarisan}
		<p class="mt-3 text-sm leading-relaxed text-ink-600">
			Alamat <span class="font-medium text-ink-800">{jalurKini}</span> sudah tidak dipakai. Zona
			anggota kini bernama zona awardee, dan seluruh halamannya pindah ke awalan
			<span class="font-medium text-ink-800">/awardee</span>. Perbarui tautan yang Anda simpan —
			alamat lama tidak akan dialihkan.
		</p>
		<div class="mt-5">
			<a
				href={jalurPengganti}
				class="inline-flex min-h-11 items-center gap-2 rounded-control bg-pertamina-red px-5 text-sm font-semibold text-white transition-colors hover:bg-pertamina-red-dark"
			>
				<Icon path={ICONS.arrowRight} size={18} />
				Buka {jalurPengganti}
			</a>
		</div>
	{:else}
		<p class="mt-3 text-sm leading-relaxed text-ink-600">
			Alamat <span class="font-medium text-ink-800">{jalurKini}</span> tidak ada di PFfriends. Mungkin
			tautannya salah ketik, atau halamannya sudah dipindahkan.
		</p>
	{/if}

	<div class="mt-8 border-t border-ink-100 pt-6">
		<p class="text-sm font-semibold text-ink-800">Coba salah satu ini</p>
		<ul class="mt-3 grid gap-2 sm:grid-cols-3">
			{#each TUJUAN as tujuan (tujuan.href)}
				<li>
					<a
						href={tujuan.href}
						class="flex min-h-11 items-center gap-2 rounded-control border border-ink-100 px-3 text-sm font-medium text-ink-700 transition-colors hover:border-ink-300 hover:bg-ink-50"
					>
						<Icon path={tujuan.iconPath} size={18} />
						<span class="min-w-0 truncate">{tujuan.label}</span>
					</a>
				</li>
			{/each}
		</ul>
	</div>
</div>
