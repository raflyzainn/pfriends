<script>
	/**
	 * DETAIL KEGIATAN PUBLIK: satu agenda dibaca utuh, tanpa akun.
	 *
	 * Tiga keadaan yang wajib dibedakan halaman ini, dan sering tertukar:
	 *
	 * 1. katalog belum selesai dimuat → keterangan pemuatan, BUKAN "tidak ditemukan";
	 * 2. penciri tidak dikenal        → kegiatan memang tidak pernah ada;
	 * 3. kegiatan ada tetapi belum lolos gerbang publik (usulan yang masih ditinjau,
	 *    usulan yang ditolak, kegiatan yang dibatalkan) → jawabannya SAMA dengan
	 *    keadaan 2.
	 *
	 * Keadaan ketiga sengaja tidak dijelaskan kepada pembaca. Menjawab "kegiatan ini
	 * masih berupa usulan" tetap membocorkan keberadaan usulan itu beserta judulnya
	 * kepada siapa pun yang menebak alamat: kebocoran yang persis sama dengan
	 * menampilkannya di kalender, hanya lebih pelan.
	 *
	 * EMPAT KEPUTUSAN YANG TIDAK TERBACA DARI KODE:
	 *
	 * 1. **Rute bernama `[id]`, tetapi tautan yang beredar memuat SLUG.** `eventCardVM`
	 *    menyusun `href` dari slug, dan nama parameter rute adalah keputusan §2.14
	 *    yang tidak boleh diubah paket ini. `cariKegiatanPublik()` karena itu menerima
	 *    keduanya; alamat lama yang menyebut `EVT-07` tetap terbuka.
	 *
	 * 2. **Isi halaman berasal dari DAFTAR PUTIH `detailKegiatan()`.** Halaman ini
	 *    tidak pernah membaca entity langsung, sehingga field sensitif yang kelak
	 *    ditambahkan ke `CommunityEvent` tidak dapat menyelinap ke sini lewat
	 *    penyuntingan yang tampak tidak berbahaya.
	 *
	 * 3. **Nol daftar peserta, nol kuota, nol sisa kursi.** Kalender publik berhenti
	 *    pada informasi acara; pendaftaran hidup di ruang anggota. Menampilkan
	 *    "tersisa 3 kursi" pada halaman yang tidak punya tombol daftar hanya
	 *    menciptakan tekanan tanpa jalan keluar.
	 *
	 * 4. **Unduhan `.ics` disusun di peramban, bukan diminta dari server.** Aplikasi
	 *    ini SPA tanpa backend; `unduhIcs` merakit berkasnya dari data yang sudah ada
	 *    di memori dan menyerahkannya sebagai blob.
	 *
	 * @see docs/12-BUILD-CONTRACT-V2.md: §3.5 WP-08 kriteria selesai 3 & 5
	 */
	import { page } from '$app/state';
	import { EventListPanel, Icon, ICONS } from '$lib/components';
	import { catalog } from '$lib/stores/catalog.svelte.js';
	import { formatTanggal } from '$lib/utils/format.js';
	import { unduhIcs } from '$lib/utils/ics.js';
	import {
		cariKegiatanPublik,
		detailKegiatan,
		keAgenda,
		kegiatanPublik
	} from '../../_calendar-view-model.js';

	/** Banyaknya agenda lain yang ditawarkan di kaki halaman. */
	const JUMLAH_AGENDA_LAIN = 4;

	/** Lama pesan konfirmasi unduhan bertahan, dalam milidetik. */
	const DURASI_PESAN = 2600;

	const penciri = $derived(page.params.id ?? '');

	/**
	 * Sumber data halaman: `catalog.publishedEvents`, BUKAN daftar mentah
	 * `catalog.events`: usulan yang belum disetujui tidak pernah sampai ke berkas
	 * ini, bahkan sebelum `cariKegiatanPublik()` sempat menolaknya.
	 */
	const terbit = $derived(catalog.publishedEvents);

	/** Entity kegiatan, sudah lolos gerbang publik: atau `null`. */
	const kegiatan = $derived(cariKegiatanPublik(terbit, penciri));

	/** Bentuk siap render; `null` bila kegiatannya tidak ada atau tanggalnya rusak. */
	const detail = $derived.by(() => {
		if (!kegiatan) return null;
		try {
			return detailKegiatan(kegiatan);
		} catch (penyebab) {
			console.warn('[kalender] Detail kegiatan gagal disusun.', penyebab);
			return null;
		}
	});

	/** Agenda lain yang masih akan datang, di luar kegiatan yang sedang dibuka. */
	const agendaLain = $derived(
		keAgenda(kegiatanPublik(terbit))
			.filter((item) => item.id !== detail?.id && item.startsAt.getTime() >= Date.now())
			.slice(0, JUMLAH_AGENDA_LAIN)
	);

	/** Paragraf deskripsi; teks bebas dipisah baris kosong. */
	const paragraf = $derived(
		(detail?.description ?? '')
			.split(/\n\s*\n/)
			.map((bagian) => bagian.trim())
			.filter(Boolean)
	);

	const sedangMemuat = $derived(!catalog.loaded && catalog.loading);

	/** Pesan sementara di bawah tombol unduh; kosong berarti tidak ada pesan. */
	let pesanUnduh = $state('');

	/** @type {ReturnType<typeof setTimeout>|undefined} */
	let jedaPesan;

	/**
	 * Mengunduh berkas kalender kegiatan ini.
	 *
	 * Kegagalan ditangkap dan diubah menjadi kalimat, bukan dibiarkan menjadi galat
	 * konsol: pengguna yang menekan tombol dan tidak mendapat berkas apa pun berhak
	 * tahu bahwa yang gagal adalah aplikasinya, bukan penyimpanannya sendiri.
	 * @returns {void}
	 */
	function unduh() {
		if (!kegiatan) return;
		clearTimeout(jedaPesan);
		try {
			unduhIcs(kegiatan);
			pesanUnduh = 'Berkas kalender diunduh. Buka berkasnya untuk menambahkan ke aplikasi kalender.';
		} catch {
			pesanUnduh = 'Berkas kalender gagal disusun. Salin tanggalnya secara manual untuk sementara.';
		}
		jedaPesan = setTimeout(() => (pesanUnduh = ''), DURASI_PESAN);
	}

	// Pesan yang masih menunggu saat pembaca berpindah halaman tidak boleh menyalakan
	// state komponen yang sudah dibongkar.
	$effect(() => () => clearTimeout(jedaPesan));
</script>

<svelte:head>
	<title>{detail ? `${detail.title} · Kalender PFriends` : 'Kegiatan tidak ditemukan · PFriends'}</title>
</svelte:head>

<div class="mx-auto w-full max-w-7xl px-5 sm:px-8">
	{#if sedangMemuat}
		<p class="py-24 text-[16px] text-ink-600">Kegiatan sedang dimuat…</p>
	{:else if !detail}
		<!-- Keadaan 2 & 3 dijawab identik. Lihat blok pembuka. -->
		<div class="max-w-[56ch] py-24">
			<p class="kicker">Kalender Komunitas</p>
			<h1 class="display-editorial mt-4 text-[clamp(30px,4vw,44px)] leading-[1.08] text-heading">
				Kegiatan tidak ditemukan
			</h1>
			<p class="mt-6 text-[16px] leading-[1.7] text-ink-600">
				Alamat yang dibuka tidak menunjuk kegiatan mana pun pada kalender publik. Kemungkinannya
				tautan sudah kedaluwarsa, atau agendanya belum terbit.
			</p>
			<a
				href="/kalender"
				class="mt-8 inline-flex min-h-11 items-center gap-2 rounded-control bg-pertamina-red-ink px-5 text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
			>
				<Icon path={ICONS.arrowLeft} size={16} />
				Kembali ke kalender
			</a>
		</div>
	{:else}
		<nav class="pt-10" aria-label="Remah jejak">
			<a
				href="/kalender"
				class="inline-flex min-h-11 items-center gap-2 text-[14px] font-medium text-ink-600 transition-colors hover:text-pertamina-red-ink"
			>
				<Icon path={ICONS.arrowLeft} size={16} />
				Kalender Komunitas
			</a>
		</nav>

		<!-- ── Kepala kegiatan ─────────────────────────────────────────────── -->
		<header class="grid gap-10 pb-12 lg:grid-cols-12 lg:gap-14">
			<div class="lg:col-span-7">
				<p class="kicker">{detail.typeLabel} · {detail.statusLabel}</p>
				<h1
					class="display-editorial mt-4 max-w-[20ch] text-[clamp(30px,4.6vw,52px)] leading-[1.06] text-heading"
				>
					{detail.title}
				</h1>

				<span class="keyline mt-8 max-w-24 bg-pertamina-navy" aria-hidden="true"></span>

				<dl class="mt-8 grid gap-x-8 gap-y-6 sm:grid-cols-2">
					<div>
						<dt
							class="font-mono text-[11px] leading-none font-medium tracking-[0.08em] text-ink-600 uppercase"
						>
							Waktu
						</dt>
						<dd class="mt-2 text-[16px] leading-[1.5] text-ink-900">
							{detail.tanggalLengkap}
							<span class="mt-1 block text-[14px] text-ink-600">{detail.timeLabel}</span>
						</dd>
					</div>

					<div>
						<dt
							class="font-mono text-[11px] leading-none font-medium tracking-[0.08em] text-ink-600 uppercase"
						>
							Tempat
						</dt>
						<dd class="mt-2 text-[16px] leading-[1.5] text-ink-900">
							{detail.locationLabel}
							<span class="mt-1 block text-[14px] text-ink-600">{detail.modeLabel}</span>
						</dd>
					</div>

					<div>
						<dt
							class="font-mono text-[11px] leading-none font-medium tracking-[0.08em] text-ink-600 uppercase"
						>
							Penyelenggara
						</dt>
						<dd class="mt-2 text-[16px] leading-[1.5] text-ink-900">{detail.chapterLabel}</dd>
					</div>

					<div>
						<dt
							class="font-mono text-[11px] leading-none font-medium tracking-[0.08em] text-ink-600 uppercase"
						>
							Sasaran
						</dt>
						<dd class="mt-2 text-[16px] leading-[1.5] text-ink-900">{detail.communityLabel}</dd>
					</div>

					{#if detail.speakerName}
						<div class="sm:col-span-2">
							<dt
								class="font-mono text-[11px] leading-none font-medium tracking-[0.08em] text-ink-600 uppercase"
							>
								Narasumber
							</dt>
							<dd class="mt-2 text-[16px] leading-[1.5] text-ink-900">{detail.speakerName}</dd>
						</div>
					{/if}
				</dl>

				<div class="mt-10">
					<button
						type="button"
						onclick={unduh}
						class="inline-flex min-h-11 items-center gap-2 rounded-control bg-pertamina-red-ink px-5 text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
					>
						<Icon path={ICONS.calendarDownload} size={16} />
						Tambahkan ke kalender (.ics)
					</button>
					<p class="mt-3 max-w-[46ch] text-[13px] leading-[1.5] text-ink-600" aria-live="polite">
						{#if pesanUnduh}
							{pesanUnduh}
						{:else}
							Berkas standar iCalendar; waktunya ditulis pada zona Asia/Jakarta (WIB).
						{/if}
					</p>
				</div>
			</div>

			<!-- Kolom foto: ilustrasi KATEGORI kegiatan, bukan dokumentasi acara ini.
			     `foto === null` menjatuhkan halaman ke blok tipografis, bukan gambar rusak. -->
			<div class="lg:col-span-5">
				{#if detail.foto}
					<figure>
						<img
							src={detail.foto.src}
							alt={detail.foto.alt}
							width={detail.foto.w}
							height={detail.foto.h}
							loading="lazy"
							decoding="async"
							class="block aspect-[4/5] w-full rounded-photo object-cover"
						/>
						<figcaption class="mt-3 text-[13px] leading-[1.5] text-ink-600">
							{detail.foto.caption}
							{#if detail.foto.credit}
								<span class="mt-1 block text-ink-600">{detail.foto.credit}</span>
							{/if}
						</figcaption>
					</figure>
				{:else}
					<div class="border-t border-ink-200 pt-6">
						<p class="kicker">{detail.typeLabel}</p>
						<p class="display-editorial mt-4 text-[28px] leading-[1.15] text-heading">
							{detail.chapterLabel}
						</p>
						<p class="mt-4 text-[14px] leading-[1.6] text-ink-600">
							Dokumentasi kegiatan ini belum tersedia.
						</p>
					</div>
				{/if}
			</div>
		</header>

		<!-- ── Uraian ──────────────────────────────────────────────────────── -->
		{#if paragraf.length > 0}
			<!-- Ketiga seksi di bawah memakai ritme yang BERBEDA (`--rhythm-*`), bukan
			     satu nilai berulang: tiga blok berjarak identik membaca sebagai daftar,
			     bukan sebagai uraian → catatan → tawaran (`docs/11` P-3, D-10). -->
			<section
				class="border-t border-ink-200"
				style="padding-block:var(--rhythm-snug);"
				aria-label="Uraian kegiatan"
			>
				<div class="grid gap-8 lg:grid-cols-12">
					<h2
						class="font-mono text-[11px] leading-none font-medium tracking-[0.08em] text-ink-600 uppercase lg:col-span-3"
					>
						Tentang kegiatan
					</h2>
					<div class="max-w-[66ch] lg:col-span-8">
						{#each paragraf as bagian, i (i)}
							<p class="mt-5 text-[17px] leading-[1.75] text-ink-700 first:mt-0">{bagian}</p>
						{/each}
					</div>
				</div>
			</section>
		{/if}

		<!-- ── Hasil pelaksanaan, hanya untuk kegiatan yang sudah berjalan ─── -->
		{#if detail.outcomeNote}
			<section
				class="border-t border-ink-200"
				style="padding-block:var(--rhythm-tight);"
				aria-label="Hasil pelaksanaan"
			>
				<div class="grid gap-8 lg:grid-cols-12">
					<h2
						class="font-mono text-[11px] leading-none font-medium tracking-[0.08em] text-ink-600 uppercase lg:col-span-3"
					>
						Yang dihasilkan
					</h2>
					<div class="lg:col-span-8">
						<span class="keyline max-w-24 bg-pertamina-green" aria-hidden="true"></span>
						<p class="mt-5 max-w-[62ch] text-[19px] leading-[1.6] text-ink-900">
							{detail.outcomeNote}
						</p>
						<p class="mt-4 text-[13px] text-ink-600">
							Dilaporkan setelah kegiatan berlangsung pada {formatTanggal(
								detail.startsAt,
								'panjang'
							)}.
						</p>
					</div>
				</div>
			</section>
		{/if}

		<!-- ── Agenda lain ─────────────────────────────────────────────────── -->
		<section class="border-t border-ink-200" style="padding-block:var(--rhythm-base);">
			{#if agendaLain.length > 0}
				<EventListPanel
					events={agendaLain}
					title="Agenda berikutnya"
					limit={agendaLain.length}
					href="/kalender"
					thumbnailAt={0}
				/>
			{:else}
				<p class="text-[14px] leading-[1.6] text-ink-600">
					Belum ada agenda lain setelah kegiatan ini.
					<a href="/kalender" class="font-medium text-pertamina-red-ink hover:opacity-80">
						Lihat kalender penuh
					</a>
				</p>
			{/if}
		</section>
	{/if}
</div>
