<script>
	/**
	 * KALENDER KOMUNITAS — pilar 02 sebagai destinasi publik.
	 *
	 * Halaman ini memindahkan agenda komunitas keluar dari zona ter-login. Hal 5
	 * dokumen sumber menempatkan Kalender Komunitas sebagai salah satu dari empat
	 * pilar, dan sampai gelombang ini ia hanya dapat dilihat orang yang sudah punya
	 * akun — persis kebalikan dari fungsinya sebagai undangan.
	 *
	 * LIMA KEPUTUSAN YANG TIDAK TERBACA DARI KODE:
	 *
	 * 1. **Satu gerbang visibilitas, dan ia tidak tinggal di berkas ini.** Seluruh
	 *    daftar melewati `saringKegiatan()` yang memanggil `kegiatanTampilPublik()`.
	 *    Halaman ini tidak pernah membandingkan `status` sendiri; usulan yang belum
	 *    disetujui karena itu tidak punya jalan masuk, termasuk lewat penyaring
	 *    yang kelak ditambahkan orang lain di sini.
	 *
	 * 2. **Tampilan baku ditentukan LEBAR LAYAR, bukan preferensi tetap.** Grid
	 *    bulan berisi 35 sel; di 375 px ia menjadi kotak-kotak 45 px yang tidak
	 *    memuat apa pun selain angka. Ponsel karena itu membuka daftar, layar lebar
	 *    membuka grid — dan keduanya tetap dapat ditukar manual.
	 *
	 * 3. **Bulan yang ditampilkan adalah state MILIK HALAMAN, bukan milik kalender.**
	 *    `MonthCalendar` sengaja tidak menyimpan bulannya sendiri, sehingga grid dan
	 *    daftar di sebelahnya mustahil menunjuk bulan yang berbeda.
	 *
	 * 4. **Bulan awal dipilih dari DATA, bukan selalu bulan berjalan.** Kalender
	 *    yang terbuka pada bulan kosong membuat program terlihat mati padahal
	 *    agendanya ada di bulan berikutnya.
	 *
	 * 5. **Batas navigasi bulan dihitung dari SELURUH agenda publik, bukan dari hasil
	 *    penyaringan.** Bila batasnya ikut menyempit saat seseorang memilih satu
	 *    chapter, tombol bulan berikutnya mati tanpa penjelasan dan terbaca sebagai
	 *    kerusakan.
	 *
	 * @see docs/12-BUILD-CONTRACT-V2.md — §3.5 WP-08 kriteria selesai 1–6
	 * @see docs/00-SOURCE-BRIEF.md — Hal 5 pilar 02 Kalender Komunitas
	 */
	import { browser } from '$app/environment';
	import { EventListPanel, MonthCalendar, SectionRule, Icon, ICONS } from '$lib/components';
	import { catalog } from '$lib/stores/catalog.svelte.js';
	import { NAMA_BULAN } from '$lib/utils/date.js';
	import { formatTanggal, frasaHitung } from '$lib/utils/format.js';
	import {
		OPSI_CHAPTER,
		OPSI_JENIS,
		OPSI_KOMUNITAS,
		OPSI_MODE,
		SEMUA,
		adaFilterAktif,
		agendaBulan,
		agendaTanggal,
		bulanAwal,
		filterAwal,
		jumlahFilterAktif,
		keAgenda,
		kegiatanPublik,
		kelompokPerBulan,
		rentangBulan,
		saringKegiatan
	} from '../_calendar-view-model.js';

	/** Lebar minimum tempat grid bulan mulai memuat informasi, bukan sekadar angka. */
	const LEBAR_GRID = '(min-width: 768px)';

	/**
	 * Baris ber-thumbnail pada panel bulan pertama tampilan daftar. Satu penyimpangan
	 * ritme yang disengaja; kelompok bulan berikutnya tidak mengulanginya supaya
	 * "baris kedua selalu berfoto" tidak menjadi keseragaman baru (`docs/11` P-3).
	 */
	const BARIS_BERFOTO = 2;

	/** @type {'bulan'|'daftar'} */
	let tampilan = $state(
		browser && window.matchMedia(LEBAR_GRID).matches ? 'bulan' : 'daftar'
	);

	/** @type {import('../_calendar-view-model.js').FilterKalender} */
	let filter = $state(filterAwal());

	/** Bulan yang sedang dibuka; `null` berarti "ikuti pilihan otomatis dari data". */
	let bulanDipilih = $state(/** @type {Date|null} */ (null));

	/** Tanggal terpilih pada grid; `null` berarti panel menampilkan seluruh bulan. */
	let tanggalDipilih = $state(/** @type {Date|null} */ (null));

	/**
	 * Sumber data halaman: `catalog.publishedEvents`, BUKAN daftar mentah
	 * `catalog.events`.
	 *
	 * Keduanya bertanya kepada fungsi yang sama (`kegiatanTampilPublik`), jadi ini
	 * bukan aturan kedua yang harus dijaga sinkron — melainkan satu aturan yang
	 * ditegakkan dua kali, di batas store dan sekali lagi di `saringKegiatan()`.
	 * Halaman publik tidak punya alasan memegang daftar mentah sama sekali.
	 */
	const terbit = $derived(catalog.publishedEvents);

	/** Seluruh agenda publik, tanpa penyaring — sumber batas navigasi bulan. */
	const agendaLengkap = $derived(keAgenda(kegiatanPublik(terbit)));

	/** Agenda yang lolos penyaring dan boleh dilihat siapa pun. */
	const agenda = $derived(keAgenda(saringKegiatan(terbit, filter)));

	const batas = $derived(rentangBulan(agendaLengkap));
	const bulanTampil = $derived(bulanDipilih ?? bulanAwal(agenda));
	const labelBulan = $derived(`${NAMA_BULAN[bulanTampil.getMonth()]} ${bulanTampil.getFullYear()}`);

	const agendaBulanIni = $derived(agendaBulan(agenda, bulanTampil));
	const agendaHariIni = $derived(agendaTanggal(agenda, tanggalDipilih));
	const daftarPanel = $derived(tanggalDipilih ? agendaHariIni : agendaBulanIni);
	const kelompokBulan = $derived(kelompokPerBulan(agenda));

	const filterAktif = $derived(adaFilterAktif(filter));
	const banyakFilter = $derived(jumlahFilterAktif(filter));
	const sedangMemuat = $derived(!catalog.loaded && catalog.loading);

	/**
	 * Penjelasan aturan inklusif penyaring chapter & komunitas.
	 *
	 * Tanpa kalimat ini penyaring terbaca rusak: sebagian besar agenda PFfriends
	 * terbuka untuk seluruh chapter dan kedua komunitas, sehingga memilih satu
	 * chapter sering tidak mengurangi daftar sama sekali. Yang salah bukan
	 * penyaringnya, melainkan asumsi pembaca bahwa "Chapter PF 11" berarti "hanya
	 * PF 11" — dan asumsi itu hanya dapat diperbaiki dengan mengatakannya.
	 */
	const catatanInklusif = $derived.by(() => {
		const bagian = [];
		if (filter.chapterId !== SEMUA) bagian.push('kegiatan lintas chapter');
		if (filter.community !== SEMUA) bagian.push('kegiatan yang terbuka untuk kedua komunitas');
		return bagian.length > 0 ? `Termasuk ${bagian.join(' dan ')}.` : '';
	});

	/**
	 * Judul panel di samping grid: satu tanggal bila ada yang dipilih, selebihnya
	 * seluruh bulan yang sedang dibuka.
	 */
	const judulPanel = $derived(
		tanggalDipilih ? formatTanggal(tanggalDipilih, 'penuh') : `Agenda ${labelBulan}`
	);

	/**
	 * Berpindah bulan. Tanggal terpilih ikut dilepas: menyorot "12" di bulan lain
	 * adalah sisa keadaan yang membingungkan, bukan kenyamanan.
	 * @param {Date} bulan
	 * @returns {void}
	 */
	function pindahBulan(bulan) {
		bulanDipilih = bulan;
		tanggalDipilih = null;
	}

	/**
	 * Memilih atau melepas satu tanggal pada grid.
	 * @param {Date} tanggal
	 * @returns {void}
	 */
	function pilihTanggal(tanggal) {
		const sama = tanggalDipilih && tanggalDipilih.getTime() === tanggal.getTime();
		tanggalDipilih = sama ? null : tanggal;
	}

	/**
	 * Mengganti satu nilai penyaring.
	 * @param {keyof import('../_calendar-view-model.js').FilterKalender} kunci
	 * @param {string} nilai
	 * @returns {void}
	 */
	function ubahFilter(kunci, nilai) {
		filter = { ...filter, [kunci]: nilai };
		tanggalDipilih = null;
	}

	/**
	 * Mengembalikan seluruh penyaring ke keadaan awal.
	 * @returns {void}
	 */
	function aturUlang() {
		filter = filterAwal();
		tanggalDipilih = null;
		bulanDipilih = null;
	}

	/**
	 * Kelas satu tombol penyaring, dibedakan keadaan aktifnya.
	 * @param {boolean} aktif
	 * @returns {string}
	 */
	function kelasChip(aktif) {
		return aktif
			? 'border-pertamina-red bg-pertamina-red-tint text-pertamina-red-ink'
			: 'border-ink-200 text-ink-600 hover:border-ink-400 hover:text-ink-900';
	}
</script>

<svelte:head>
	<title>Kalender Komunitas · PFfriends</title>
	<meta
		name="description"
		content="Agenda upskilling, pertemuan komunitas, dan sharing session PFfriends yang terbuka untuk umum."
	/>
</svelte:head>

<div class="mx-auto w-full max-w-7xl px-5 sm:px-8">
	<!-- ── Masthead halaman ────────────────────────────────────────────────── -->
	<header class="grid gap-8 pt-14 pb-10 lg:grid-cols-12 lg:gap-12 lg:pt-20">
		<div class="lg:col-span-7">
			<p class="kicker">Calendar of Event</p>
			<h1
				class="display-editorial mt-4 max-w-[16ch] text-[clamp(34px,6vw,60px)] leading-[1.04] text-heading"
			>
				Kalender Komunitas
			</h1>
			<p class="mt-6 max-w-[52ch] text-[18px] leading-[1.6] text-ink-600">
				Upskilling, pertemuan chapter, dan sharing session yang dijalankan anggota PFfriends. Terbuka
				untuk siapa pun yang ingin menyimak — tanpa akun, tanpa pendaftaran di halaman ini.
			</p>
		</div>

		<div class="lg:col-span-4 lg:col-start-9 lg:self-end">
			<span class="keyline max-w-24 bg-pertamina-red" aria-hidden="true"></span>
			<p class="mt-5 text-[14px] leading-[1.6] text-ink-600">
				{#if sedangMemuat}
					Agenda sedang dimuat.
				{:else if agendaLengkap.length > 0}
					<span class="figure-number text-[28px] text-ink-900">{agendaLengkap.length}</span>
					kegiatan tercatat pada kalender publik. Pendaftaran peserta dan daftar hadir hanya ada di
					ruang anggota.
				{:else}
					Belum ada kegiatan yang terbit ke kalender publik.
				{/if}
			</p>
		</div>
	</header>

	<!-- ── Penyaring & pemilih tampilan ────────────────────────────────────── -->
	<section
		class="border-y border-ink-200 py-6"
		aria-label="Penyaring dan tampilan kalender"
	>
		<div class="flex flex-col gap-5">
			<div class="flex flex-wrap items-center gap-2" role="group" aria-label="Jenis kegiatan">
				{#each OPSI_JENIS as opsi (opsi.value)}
					<button
						type="button"
						aria-pressed={filter.jenis === opsi.value}
						onclick={() => ubahFilter('jenis', opsi.value)}
						class="inline-flex min-h-11 items-center rounded-control border px-4 text-[14px] font-medium transition-colors {kelasChip(
							filter.jenis === opsi.value
						)}"
					>
						{opsi.label}
					</button>
				{/each}
			</div>

			<div class="flex flex-wrap items-end gap-x-4 gap-y-5">
				<div class="flex flex-wrap items-center gap-2" role="group" aria-label="Cara kehadiran">
					{#each OPSI_MODE as opsi (opsi.value)}
						<button
							type="button"
							aria-pressed={filter.mode === opsi.value}
							onclick={() => ubahFilter('mode', opsi.value)}
							class="inline-flex min-h-11 items-center rounded-control border px-4 text-[14px] font-medium transition-colors {kelasChip(
								filter.mode === opsi.value
							)}"
						>
							{opsi.label}
						</button>
					{/each}
				</div>

				<div class="min-w-0 flex-1 basis-40">
					<label
						for="saring-chapter"
						class="mb-1.5 block font-mono text-[11px] leading-none font-medium tracking-[0.08em] text-ink-600 uppercase"
					>
						Chapter
					</label>
					<select
						id="saring-chapter"
						value={filter.chapterId}
						onchange={(e) => ubahFilter('chapterId', e.currentTarget.value)}
						class="min-h-11 w-full rounded-control border border-ink-200 bg-surface px-3 text-[14px] text-ink-900"
					>
						{#each OPSI_CHAPTER as opsi (opsi.value)}
							<option value={opsi.value}>{opsi.label}</option>
						{/each}
					</select>
				</div>

				<div class="min-w-0 flex-1 basis-40">
					<label
						for="saring-komunitas"
						class="mb-1.5 block font-mono text-[11px] leading-none font-medium tracking-[0.08em] text-ink-600 uppercase"
					>
						Komunitas
					</label>
					<select
						id="saring-komunitas"
						value={filter.community}
						onchange={(e) => ubahFilter('community', e.currentTarget.value)}
						class="min-h-11 w-full rounded-control border border-ink-200 bg-surface px-3 text-[14px] text-ink-900"
					>
						{#each OPSI_KOMUNITAS as opsi (opsi.value)}
							<option value={opsi.value}>{opsi.label}</option>
						{/each}
					</select>
				</div>
			</div>

			<div class="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
				<p class="min-w-0 text-[14px] leading-[1.6] text-ink-600">
					{#if sedangMemuat}
						Memuat agenda…
					{:else}
						Menampilkan {frasaHitung(agenda.length, 'kegiatan')}
						{#if filterAktif}
							dari {agendaLengkap.length} agenda publik.
						{:else}
							pada kalender publik.
						{/if}
					{/if}
					{#if filterAktif}
						<button
							type="button"
							onclick={aturUlang}
							class="ml-1 inline-flex min-h-11 items-center gap-1.5 text-[14px] font-medium text-brand-700 transition-opacity hover:opacity-80"
						>
							<Icon path={ICONS.x} size={14} />
							Atur ulang {banyakFilter} penyaring
						</button>
					{/if}
					{#if catatanInklusif}
						<span class="mt-1 block text-[13px] text-ink-600">{catatanInklusif}</span>
					{/if}
				</p>

				<div class="flex items-center gap-2" role="group" aria-label="Bentuk tampilan kalender">
					<button
						type="button"
						aria-pressed={tampilan === 'bulan'}
						onclick={() => (tampilan = 'bulan')}
						class="inline-flex min-h-11 items-center gap-2 rounded-control border px-4 text-[14px] font-medium transition-colors {kelasChip(
							tampilan === 'bulan'
						)}"
					>
						<Icon path={ICONS.calendar} size={16} />
						Bulan
					</button>
					<button
						type="button"
						aria-pressed={tampilan === 'daftar'}
						onclick={() => (tampilan = 'daftar')}
						class="inline-flex min-h-11 items-center gap-2 rounded-control border px-4 text-[14px] font-medium transition-colors {kelasChip(
							tampilan === 'daftar'
						)}"
					>
						<Icon path={ICONS.menu} size={16} />
						Daftar
					</button>
				</div>
			</div>
		</div>
	</section>

	<!-- ── Isi kalender ────────────────────────────────────────────────────── -->
	{#if sedangMemuat}
		<p class="py-20 text-[16px] text-ink-600">Agenda komunitas sedang dimuat…</p>
	{:else if catalog.error}
		<div class="py-20">
			<h2 class="display-editorial text-[24px] text-heading">Agenda gagal dimuat</h2>
			<p class="mt-3 max-w-[52ch] text-[15px] leading-[1.6] text-ink-600">{catalog.error}</p>
		</div>
	{:else if agendaLengkap.length === 0}
		<div class="py-20">
			<h2 class="display-editorial text-[24px] text-heading">Kalender masih kosong</h2>
			<p class="mt-3 max-w-[56ch] text-[15px] leading-[1.6] text-ink-600">
				Belum ada kegiatan yang terbit ke kalender publik. Agenda baru diumumkan setelah disetujui
				verifikator, biasanya pada awal bulan.
			</p>
		</div>
	{:else if agenda.length === 0}
		<div class="py-20">
			<h2 class="display-editorial text-[24px] text-heading">
				Tidak ada kegiatan yang cocok dengan penyaring ini
			</h2>
			<p class="mt-3 max-w-[56ch] text-[15px] leading-[1.6] text-ink-600">
				Kombinasi jenis, chapter, komunitas, dan cara kehadiran yang dipilih belum punya agenda.
				Longgarkan salah satunya untuk melihat kembali seluruh kalender.
			</p>
			<button
				type="button"
				onclick={aturUlang}
				class="mt-6 inline-flex min-h-11 items-center gap-2 rounded-control bg-brand-600 px-5 text-[14px] font-semibold text-white transition-colors hover:bg-brand-700"
			>
				Tampilkan seluruh agenda
			</button>
		</div>
	{:else if tampilan === 'bulan'}
		<SectionRule
			label="Satu bulan sekaligus"
			kicker="Tampilan grid"
			tone="navy"
			scale="display"
			rhythm="snug"
		>
			<div class="mt-10 grid gap-10 lg:grid-cols-12 lg:gap-14">
				<div class="min-w-0 lg:col-span-7">
					<MonthCalendar
						month={bulanTampil}
						events={agenda}
						selected={tanggalDipilih ?? undefined}
						min={batas.min}
						max={batas.max}
						onstep={pindahBulan}
						onselect={pilihTanggal}
					/>
				</div>

				<div class="min-w-0 lg:col-span-5">
					{#if daftarPanel.length > 0}
						<EventListPanel
							events={daftarPanel}
							title={judulPanel}
							limit={daftarPanel.length}
							href=""
							thumbnailAt={0}
						/>
						{#if tanggalDipilih}
							<p class="pt-2">
								<button
									type="button"
									onclick={() => (tanggalDipilih = null)}
									class="inline-flex min-h-11 items-center gap-1.5 text-[14px] font-medium text-brand-700 transition-opacity hover:opacity-80"
								>
									<Icon path={ICONS.x} size={14} />
									Tampilkan seluruh {labelBulan}
								</button>
							</p>
						{/if}
					{:else}
						<h2
							class="font-mono text-[11px] leading-none font-medium tracking-[0.08em] text-ink-600 uppercase"
						>
							{judulPanel}
						</h2>
						<p class="mt-5 border-t border-ink-200 pt-5 text-[14px] leading-[1.6] text-ink-600">
							{#if tanggalDipilih}
								Tidak ada kegiatan pada tanggal ini. Tanggal yang berkegiatan ditandai tebal pada
								grid di sebelah.
							{:else}
								Tidak ada kegiatan pada {labelBulan}. Gunakan panah bulan di atas grid untuk
								menelusuri bulan lain — kegiatan terdekat ada di
								{formatTanggal(agenda[0].startsAt, 'panjang')}.
							{/if}
						</p>
					{/if}
				</div>
			</div>
		</SectionRule>
	{:else}
		<SectionRule
			label="Seluruh agenda, bulan demi bulan"
			kicker="Tampilan daftar"
			tone="red"
			scale="section"
			rhythm="base"
		>
			<div class="mt-10 flex flex-col gap-12">
				{#each kelompokBulan as kelompok, i (kelompok.kunci)}
					<EventListPanel
						events={kelompok.items}
						title={kelompok.label}
						limit={kelompok.items.length}
						href=""
						thumbnailAt={i === 0 ? BARIS_BERFOTO : 0}
					/>
				{/each}
			</div>
		</SectionRule>
	{/if}

	<!-- ── Penutup ─────────────────────────────────────────────────────────── -->
	<SectionRule scale="quiet" rhythm="tight" tone="ink">
		<div class="grid gap-6 lg:grid-cols-12">
			<p class="max-w-[60ch] text-[15px] leading-[1.7] text-ink-600 lg:col-span-8">
				Halaman ini memuat agenda yang sudah disetujui verifikator. Usulan kegiatan yang masih
				ditinjau tidak pernah tampil di sini. Pendaftaran peserta, daftar hadir, dan dokumentasi
				pelaksanaan berada di ruang anggota — kalender publik sengaja berhenti pada informasi acara.
			</p>
			<p class="lg:col-span-4 lg:justify-self-end">
				<a
					href="/masuk"
					class="inline-flex min-h-11 items-center gap-2 rounded-control bg-brand-600 px-5 text-[14px] font-semibold text-white transition-colors hover:bg-brand-700"
				>
					Masuk ke ruang anggota
					<Icon path={ICONS.arrowLongRight} size={16} />
				</a>
			</p>
		</div>
	</SectionRule>
</div>
