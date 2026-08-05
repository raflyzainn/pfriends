<script>
	/**
	 * BERANDA PFRIENDS — terbitan editorial, bukan etalase produk.
	 *
	 * Halaman ini ditulis ulang penuh untuk memenuhi dua keputusan pemilik produk
	 * sekaligus: PO-2 (nol mekanik skor di zona publik) dan PO-6 (redesign
	 * editorial). Tujuh seksi lama menjadi tujuh seksi baru, dan tidak ada dua di
	 * antaranya yang berbagi bentuk.
	 *
	 * ENAM KEPUTUSAN YANG TIDAK TERBACA DARI KODE:
	 *
	 * 1. **Nol angka dihitung di berkas ini.** Seluruh angka agregat datang dari
	 *    `impact.snapshot` — potret `ProgramImpactService.publicSnapshot()` yang
	 *    tidak memuat satu pun field skor. Beranda lama menghitung sendiri
	 *    (`activeAwardees.length`, `new Set(chapterId).size`, `.sort((a,b) =>
	 *    b.points - a.points)`), dan penyaring kedua itulah yang membuat angka
	 *    beranda berpotensi berbeda dari angka dasbor. Satu potret, satu definisi.
	 *
	 * 2. **Tidak ada blok "cara mengumpulkan skor", tangga tier, maupun sorotan
	 *    berperingkat.** Ketiganya pindah ke zona Awardee. Halaman muka korporat
	 *    yang memajang harga sebuah unggahan terbaca sebagai program yang MEMBELI
	 *    amplifikasi — dan itu membatalkan klaim "organic brand amplifier" yang
	 *    justru menjadi alasan inisiatif ini ada (`docs/10` §4.3 H-1…H-3).
	 *
	 * 3. **Angka kelas B tampil sebagai RENTANG.** Jangkauan organik adalah hasil
	 *    perkalian data terhitung dengan tiga parameter berasumsi. Satu angka
	 *    tunggal terbaca sebagai hasil ukur; rentang berlabel `Estimasi` berikut
	 *    asumsinya terbaca sebagai estimasi. Bedanya bukan kosmetik — pertanyaan
	 *    "diukur bagaimana?" harus punya jawaban di halaman yang sama.
	 *
	 * 4. **Sparkline pita data sengaja TIDAK diisi.** `PublicImpactSnapshot` adalah
	 *    potret satu titik waktu; deret delapan titik yang dibutuhkan sparkline
	 *    tidak ada di dalamnya. Mengarang deretnya berarti menggambar tren yang
	 *    tidak pernah diukur, tepat pada elemen yang paling terbaca sebagai bukti.
	 *
	 * 5. **Data kosong → keadaan kosong yang menjelaskan.** Aturan D-05: nol yang
	 *    dicetak 56 px membaca sebagai "program gagal", padahal yang terjadi hanya
	 *    potret belum tersusun.
	 *
	 * 6. **Seksi E4 menautkan `/kalender` yang boleh 404 selama G3-B.** Halaman itu
	 *    milik WP-08; membuat versi tandingan di sini melanggar KP-3.
	 *
	 * @see docs/11-VISUAL-DIRECTION.md — §6 rancangan beranda seksi E0–E7
	 * @see docs/10-REVISION-SPEC.md — §4 arsitektur informasi publik, §4.4 kelas angka
	 * @see docs/12-BUILD-CONTRACT-V2.md — §3.5 WP-04
	 */
	import { Icon, ICONS } from '$lib/components';
	import EventListPanel from '$lib/components/EventListPanel.svelte';
	import {
		DataBand,
		EditorialHero,
		MonthCalendar,
		PhotoFigure,
		SectionRule,
		StorySpread,
		storyVM
	} from '$lib/components/editorial';
	import { catalog } from '$lib/stores/catalog.svelte.js';
	import { impact } from '$lib/stores/impact.svelte.js';
	import { COMMUNITIES, CommunityType } from '$lib/domain/constants/community.js';
	import { MOVEMENT_CATEGORY_META, MOVEMENT_STATUS_META } from '$lib/domain/entities/Movement.js';
	import { REACH_PARAMETERS } from '$lib/domain/constants/kpi-targets.js';
	import { foto } from '$lib/data/photos.js';
	import { formatAngka, formatTanggal, frasaHitung, persenProgres } from '$lib/utils/format.js';
	import { awalBulan } from '$lib/utils/date.js';
	import { agendaPublik, barisGerakan, ringkasSemuaKomunitas } from './_view-model.js';

	/** Cerita yang muat pada hierarki E5: 1 unggulan + 2 sekunder + 4 ringkas. */
	const CERITA_LEAD = 1;
	const CERITA_SEKUNDER = 2;
	const CERITA_BRIEF = 4;

	/** Agenda yang tampil di E4; baris ketiga sengaja ber-thumbnail (penyimpangan P-3). */
	const AGENDA_TAMPIL = 4;
	const BARIS_THUMBNAIL = 3;

	/** Gerakan pendamping di bawah gerakan unggulan. */
	const GERAKAN_BARIS = 3;

	/** Foto per baris E3, sejajar urutan `COMMUNITIES`. */
	const FOTO_KOMUNITAS = Object.freeze({
		[CommunityType.SOBI]: 'sobi-alumni-kampus',
		[CommunityType.WOMENPRENEUR]: 'womenpreneur-umkm'
	});

	/** Keying rule per baris E3 — merah untuk baris A, navy untuk baris B. */
	const KEYLINE_KOMUNITAS = Object.freeze({
		[CommunityType.SOBI]: 'red',
		[CommunityType.WOMENPRENEUR]: 'navy'
	});

	const potret = $derived(impact.snapshot);

	/**
	 * Potret dianggap layak tampil hanya bila sudah tersusun DAN memuat sekurangnya
	 * satu anggota terdata. Pita data yang mencetak nol besar akan dibaca sebagai
	 * capaian nol, bukan sebagai data yang belum masuk (aturan D-05).
	 */
	const adaPotret = $derived(Boolean(potret) && potret.registeredAwardees > 0);

	const tanggalPotret = $derived(potret ? formatTanggal(potret.capturedAt, 'panjang') : '');

	/** Penyebut populasi penerima manfaat; `null` = registri belum tersedia. */
	const penyebutRegistri = $derived(
		potret?.beneficiaryRegistry?.value
			? `dari ${formatAngka(potret.beneficiaryRegistry.value)} penerima manfaat terdaftar`
			: 'anggota aktif yang menyetujui pendataan'
	);

	const komunitasRingkas = $derived(ringkasSemuaKomunitas(catalog.awardees));

	const ceritaVM = $derived(catalog.publishedStories.map((story) => storyVM(story)));
	const ceritaLead = $derived(ceritaVM[0] ?? null);
	const ceritaSekunder = $derived(ceritaVM.slice(CERITA_LEAD, CERITA_LEAD + CERITA_SEKUNDER));
	const ceritaBrief = $derived(
		ceritaVM.slice(CERITA_LEAD + CERITA_SEKUNDER, CERITA_LEAD + CERITA_SEKUNDER + CERITA_BRIEF)
	);

	/** Seluruh agenda publik — dipakai kalender; penandanya tersebar lintas bulan. */
	const agendaSemua = $derived(agendaPublik(catalog.publishedEvents));
	const agendaMendatang = $derived(agendaPublik(catalog.upcomingEvents()));

	/** Bulan yang sedang ditampilkan kalender; `null` = ikut agenda terdekat. */
	let bulanDipilih = $state(/** @type {Date|null} */ (null));

	/**
	 * Bulan kalender: agenda terdekat lebih dulu, bukan bulan berjalan.
	 *
	 * Kalender yang selalu membuka bulan berjalan akan sering tampil kosong padahal
	 * agenda berikutnya hanya berjarak beberapa hari di bulan setelahnya — dan
	 * kalender kosong di beranda terbaca sebagai komunitas yang berhenti.
	 */
	const bulanTampil = $derived(
		bulanDipilih ?? awalBulan(agendaMendatang[0]?.startsAt ?? new Date()) ?? new Date()
	);

	const gerakanBerjalan = $derived(catalog.movements.filter((gerakan) => gerakan.isRunning));

	/** Gerakan unggulan: yang partisipasinya paling banyak, bukan yang paling baru. */
	const gerakanUnggulan = $derived(
		[...gerakanBerjalan].sort((a, b) => b.participantCount - a.participantCount)[0] ?? null
	);

	const gerakanPendamping = $derived(
		gerakanBerjalan
			.filter((gerakan) => gerakan.id !== gerakanUnggulan?.id)
			.slice(0, GERAKAN_BARIS)
			.map((gerakan) => baris(gerakan))
	);

	const unggulanVM = $derived(gerakanUnggulan ? baris(gerakanUnggulan) : null);

	/**
	 * Baris gerakan siap render, lengkap dengan label kategori dan statusnya.
	 * @param {import('$lib/domain/entities/Movement.js').Movement} gerakan
	 * @returns {import('./_view-model.js').BarisGerakan}
	 */
	function baris(gerakan) {
		return barisGerakan(
			gerakan,
			MOVEMENT_CATEGORY_META[gerakan.category]?.label ?? 'Gerakan bersama',
			MOVEMENT_STATUS_META[gerakan.status]?.label ?? ''
		);
	}

	/**
	 * Props `PhotoFigure` dari satu kunci manifes foto.
	 *
	 * `foto()` mengembalikan `null` untuk kunci yang berkasnya tidak lolos validasi
	 * unduhan; dalam hal itu `src` kosong dan `PhotoFigure` jatuh ke blok tipografis
	 * alih-alih merender gambar rusak.
	 *
	 * @param {string} kunci Kunci manifes, mis. `'sobi-alumni-kampus'`.
	 * @returns {{src:string, alt:string, width:number, height:number, caption:string}}
	 */
	function propsFoto(kunci) {
		const berkas = foto(kunci);
		return {
			src: berkas?.src ?? '',
			alt: berkas?.alt ?? '',
			width: berkas?.w ?? 0,
			height: berkas?.h ?? 0,
			caption: berkas?.caption ?? ''
		};
	}

	/**
	 * Warna keying rule sebuah baris, dalam bentuk nilai CSS.
	 * @param {'red'|'navy'|'green'} nada
	 * @returns {string}
	 */
	function warnaKeyline(nada) {
		return `background:var(--color-pertamina-${nada});`;
	}
</script>

<svelte:head>
	<title>Pfriends — Rumah Komunitas Penerima Manfaat Pertamina Foundation</title>
	<meta
		name="description"
		content="Pfriends menghubungkan alumni Beasiswa Sobat Bumi dengan pelaku UMKM binaan PFpreneur: agenda komunitas, gerakan bersama, dan cerita lapangan yang ditulis anggotanya sendiri."
	/>
</svelte:head>

<!-- ═══ E1 · Hero editorial — foto full-bleed, teks rata bawah ═══ -->
<EditorialHero
	image="hero-komunitas"
	imageMobile="hero-komunitas-mobile"
	alt="Puluhan orang berkumpul rapat sambil tertawa dalam satu potret bersama seusai kegiatan komunitas"
	altMobile="Kerumunan peserta berdesakan sambil tersenyum ke arah kamera dalam satu pertemuan komunitas"
	kicker="Community Connect Initiative"
	title={'Setelah programnya selesai,\nke mana perginya\norang-orang ini?'}
	standfirst="Pfriends menghubungkan alumni Beasiswa Sobat Bumi dengan pelaku UMKM binaan PFpreneur — dua kelompok yang selama ini berjalan sendiri-sendiri."
	primary={{ label: 'Gabung Sekarang', href: '/daftar' }}
	secondary={{ label: 'Lihat cerita komunitas', href: '/cerita' }}
	byline="Diselenggarakan Divisi Corporate Secretary — Pertamina Foundation"
	caption="Pertemuan komunitas — foto stok"
/>

{#snippet metodeJangkauan()}
	Cacah anggota yang mengamplifikasi bulan ini dikalikan rata-rata jaringan sosial per orang
	({formatAngka(REACH_PARAMETERS.jaringanSosialMin)}–{formatAngka(
		REACH_PARAMETERS.jaringanSosialMax
	)} orang, angka rujukan), lalu dikoreksi tingkat keterlihatan dan irisan jaringan antaranggota.
	<a href="/metode-pengukuran" class="underline underline-offset-4 hover:text-white">
		Rincian rumus dan seluruh asumsinya
	</a>
	terbuka di halaman metode pengukuran.
{/snippet}

<!-- ═══ E2 · Pita data — alas hero, bukan seksi terpisah ═══ -->
{#if adaPotret}
	<DataBand
		asOf={tanggalPotret}
		lead={{
			value: `${formatAngka(potret.organicReach.min)} – ${formatAngka(potret.organicReach.max)}`,
			label: 'Orang terjangkau',
			context: `Estimasi 30 hari terakhir, dari ${frasaHitung(potret.organicReach.basis, 'anggota')} yang mengamplifikasi`,
			kind: 'estimated',
			methodology: metodeJangkauan
		}}
		items={[
			{
				value: formatAngka(potret.registeredAwardees),
				label: 'Anggota terdata',
				context: penyebutRegistri
			},
			{
				value: formatAngka(potret.activeChapters),
				label: 'Chapter aktif',
				context: `dari ${frasaHitung(potret.totalChapters, 'chapter')} berbasis batch penerima manfaat`
			},
			{
				value: formatAngka(potret.runningMovements),
				label: 'Gerakan berjalan',
				context: `bersama ${frasaHitung(potret.publishedStories, 'cerita')} lapangan yang sudah terbit`
			}
		]}
	/>
{:else}
	<section
		class="bg-pertamina-navy"
		style="padding-block:var(--rhythm-tight);"
		aria-label="Angka program Pfriends"
	>
		<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
			<p class="kicker text-white/70">Angka program</p>
			<p class="mt-4 max-w-[52ch] text-[18px] leading-[1.55] text-white/88">
				Potret angka program belum tersusun di peramban ini. Angka baru ditampilkan setelah catatan
				komunitas selesai dibaca — kami memilih tidak mencetak angka nol yang akan salah dibaca
				sebagai capaian.
			</p>
			<a
				href="/metode-pengukuran"
				class="mt-6 inline-flex items-center gap-2 text-[15px] text-white/88 underline underline-offset-4 transition-colors hover:text-white"
			>
				Cara setiap angka diperoleh
				<Icon path={ICONS.arrowLongRight} size={18} />
			</a>
		</div>
	</section>
{/if}

<!-- ═══ E3 · Dua komunitas — dua spread bercermin yang saling mengunci ═══ -->
<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
	<SectionRule
		tone="red"
		scale="display"
		rhythm="loose"
		kicker="Untuk siapa Pfriends dibuat"
		label="Dua komunitas, satu meja"
		lead="Alumni Sobat Bumi punya keahlian dan waktu luang. Womenpreneur punya usaha yang siap tumbuh tetapi kekurangan jaringan. Selama ini keduanya berjalan terpisah."
	>
		{#each COMMUNITIES as profil, index (profil.id)}
			{@const ringkasan = komunitasRingkas[index]}
			{@const berbalik = index % 2 === 1}
			<div class="grid grid-cols-1 gap-x-10 gap-y-8 lg:grid-cols-12 {index > 0 ? 'mt-14 lg:mt-20' : ''}">
				<!-- Yang naik 64 px hanyalah KOLOM FOTO baris B, mengisi ruang kosong di
				     bawah kolom teks baris A — dua baris yang saling mengunci, sementara
				     tidak ada satu pun teks yang saling menimpa.

				     Sebelumnya seluruh BARIS B yang dinaikkan (`lg:-mt-16` pada grid).
				     Kolom teks baris B menempati kolom 1–6, tepat di bawah kolom foto
				     baris A yang menempati kolom 1–5: angka "02" setinggi 96 px mendarat
				     persis di atas kapsi foto baris A pada SELURUH lebar desktop
				     1024–1920 px. Kolom foto baris B duduk di kolom 8–12, di bawah kolom
				     teks baris A yang selalu berakhir jauh lebih tinggi daripada foto di
				     sebelahnya — di sanalah ruang kosongnya, dan hanya di sana lift ini
				     aman. Dinolkan di bawah lg, tempat gridnya menjadi satu kolom. -->
				<div
					class={berbalik
						? 'lg:order-2 lg:col-span-5 lg:col-start-8 lg:-mt-16'
						: 'lg:col-span-5'}
				>
					<PhotoFigure
						{...propsFoto(FOTO_KOMUNITAS[profil.id])}
						ratio="4:5"
						keyline={KEYLINE_KOMUNITAS[profil.id]}
						keylinePos="left"
						fallbackLabel={profil.akronim}
					/>
				</div>

				<div
					class="min-w-0 {berbalik
						? 'lg:order-1 lg:col-span-6 lg:col-start-1'
						: 'lg:col-span-6 lg:col-start-7'}"
				>
					<p class="figure-number text-[96px] text-ink-200" aria-hidden="true">
						{String(index + 1).padStart(2, '0')}
					</p>

					<h3 class="display-editorial mt-2 text-[30px] leading-[1.12] text-heading">
						{profil.nama}
					</h3>

					<p class="mt-4 max-w-[58ch] text-[16px] leading-[1.68] text-ink-700">
						{profil.deskripsi}
					</p>

					<ul class="mt-6 space-y-2.5">
						{#each profil.kebutuhan as butir (butir)}
							<li class="flex gap-3 text-[16px] leading-[1.6] text-ink-700">
								<span class="shrink-0 text-ink-600" aria-hidden="true">—</span>
								<span>{butir}</span>
							</li>
						{/each}
					</ul>

					<div class="mt-8 flex flex-wrap items-baseline justify-between gap-4">
						{#if ringkasan.jumlahAnggota > 0}
							<p class="text-[16px] leading-[1.6] text-ink-700">
								<span class="figure-number text-[28px] text-ink-900">
									{formatAngka(ringkasan.jumlahAnggota)}
								</span>
								anggota aktif tercatat di
								{frasaHitung(ringkasan.jumlahChapter, 'chapter')}
							</p>
						{:else}
							<p class="text-[16px] leading-[1.6] text-ink-600">
								Keanggotaan komunitas ini sedang disusun bersama tim Corporate Secretary.
							</p>
						{/if}

						<a
							href="/komunitas"
							class="inline-flex min-h-11 items-center gap-2 text-[15px] font-semibold text-pertamina-red-ink underline-offset-4 hover:underline"
						>
							Pelajari
							<Icon path={ICONS.arrowLongRight} size={18} />
						</a>
					</div>
				</div>
			</div>
		{/each}
	</SectionRule>
</div>

<!-- ═══ E4 · Kalender komunitas + daftar agenda ═══ -->
<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
	<SectionRule
		tone="navy"
		scale="quiet"
		rhythm="snug"
		kicker="Kalender komunitas"
		label="Alasan untuk berkumpul"
	>
		<div class="grid grid-cols-1 gap-x-12 gap-y-10 lg:grid-cols-[320px_minmax(0,1fr)]">
			<div class="min-w-0 lg:sticky lg:top-24 lg:self-start">
				<MonthCalendar
					month={bulanTampil}
					events={agendaSemua}
					compact
					onstep={(bulan) => (bulanDipilih = bulan)}
				/>
			</div>

			<div class="min-w-0">
				<EventListPanel
					events={agendaMendatang}
					limit={AGENDA_TAMPIL}
					thumbnailAt={BARIS_THUMBNAIL}
					title="Agenda terdekat"
					href="/kalender"
					variant="panel"
					emptyMessage="Belum ada kegiatan terjadwal. Agenda baru diumumkan tiap awal bulan lewat WA Komunitas, lalu terbit di kalender ini."
				/>
			</div>
		</div>
	</SectionRule>
</div>

<!-- ═══ E5 · Cerita komunitas — 1 unggulan + 2 sekunder + 4 ringkas ═══ -->
<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
	<SectionRule
		scale="section"
		rhythm="loose"
		kicker="Cerita dari lapangan"
		label="Ditulis anggota, ditinjau verifikator, lalu terbit"
	>
		{#snippet action()}
			<a
				href="/cerita"
				class="inline-flex min-h-11 items-center gap-2 text-[15px] font-semibold text-pertamina-red-ink underline-offset-4 hover:underline"
			>
				Lihat semua cerita
				<Icon path={ICONS.arrowLongRight} size={18} />
			</a>
		{/snippet}

		{#if ceritaLead}
			<StorySpread lead={ceritaLead} secondary={ceritaSekunder} briefs={ceritaBrief} />
		{:else}
			<div class="max-w-[60ch]">
				<p class="text-[18px] leading-[1.55] text-ink-700">
					Cerita pertama komunitas belum terbit. Setiap naskah ditulis anggota, ditinjau
					verifikator, dan baru tayang setelah penulisnya menyetujui — karena itu ruang ini
					sengaja dibiarkan kosong sampai ada yang benar-benar siap dibaca.
				</p>
				<a
					href="/daftar"
					class="mt-6 inline-flex min-h-11 items-center gap-2 text-[15px] font-semibold text-pertamina-red-ink underline-offset-4 hover:underline"
				>
					Jadi anggota yang menulis pertama
					<Icon path={ICONS.arrowLongRight} size={18} />
				</a>
			</div>
		{/if}
	</SectionRule>
</div>

<!-- ═══ E6 · Gerakan bersama — satu unggulan + tiga baris ═══ -->
<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
	<!-- Kicker berbahasa Indonesia. "Movement-based program" adalah nama pilar pada
	     dokumen sumber, dan tempatnya di daftar pilar halaman /tentang — bukan
	     sebagai label antarmuka di zona publik, tempat seluruh teks wajib Bahasa
	     Indonesia. -->
	<SectionRule tone="navy" scale="display" rhythm="base" kicker="Gerakan bersama">
		{#if unggulanVM}
			<!-- `gerakan-mangrove` DICABUT dari seluruh zona publik: berkasnya memajang
			     kaus berlogo satu organisasi pihak ketiga pada tujuh orang sekaligus,
			     dan barisan kreditnya pun menyebut nama organisasi itu. Halaman
			     Pertamina Foundation tidak boleh mengiklankan lembaga lain, sekalipun
			     lisensinya sah. `cta-penutup` sudah berasio 21:9 intrinsik (1600×686),
			     alt-nya cocok dengan isi gambarnya, dan tidak memuat merek siapa pun. -->
			<PhotoFigure {...propsFoto('cta-penutup')} ratio="21:9" fallbackLabel="Gerakan bersama" />

			<!-- Panel menumpuk foto: kedalaman dari tumpukan dan garis, tanpa blur.

			     DIGANTUNG DI TEPI KANAN pada ≥1024 px. Sebelumnya panel rata kiri dan
			     dinaikkan 80 px, sementara kapsi + baris kredit foto berada tepat di
			     bawah gambar dan SELALU rata kiri: latar `bg-surface` yang pejal
			     menutupinya rapat-rapat pada 375–1920 px, tanpa sisa. Akibatnya foto
			     terbesar halaman ini tampil tanpa label "foto stok" dan tanpa nama
			     fotografernya — dua keterangan yang justru wajib ada (`docs/11` §4.4).
			     Talang kiri yang tersisa (≥320 px pada 1024 px) jauh melampaui teks
			     kredit terpanjang di manifes (220 px). Di bawah 1024 px tumpukannya
			     dilepas: tidak ada talang untuk digantungi, dan menumpuk di sana hanya
			     mengulang cacat yang sama. -->
			<div
				class="relative z-10 mt-6 max-w-[46rem] bg-surface p-6 sm:p-8 lg:-mt-20 lg:ml-auto lg:max-w-[40rem]"
			>
				<span class="keyline" style={warnaKeyline(unggulanVM.keyline)} aria-hidden="true"></span>

				<!-- Kicker seksi kini berbunyi "Gerakan bersama"; kicker panel menyebut
				     DASAR pemilihannya supaya keduanya tidak mengulang kata yang sama. -->
				<p class="kicker mt-5">Paling banyak diikuti · {unggulanVM.kategoriLabel}</p>
				<h3 class="display-editorial mt-3 text-[clamp(24px,3vw,30px)] leading-[1.12] text-heading">
					{unggulanVM.judul}
				</h3>
				<p class="mt-4 max-w-[58ch] text-[16px] leading-[1.68] text-ink-700">
					{unggulanVM.tujuan}
				</p>

				<p class="mt-6 text-[16px] leading-[1.6] text-ink-700">
					<span class="figure-number text-[28px] text-ink-900">
						{formatAngka(unggulanVM.peserta)}
					</span>
					orang bergerak di
					{frasaHitung(unggulanVM.wilayah, 'wilayah')}
				</p>

				{#if unggulanVM.target > 0}
					<div class="mt-4 max-w-[26rem]">
						<!-- Rule progres 4 px PERSEGI — bukan progress bar membulat. -->
						<div class="h-1 w-full bg-ink-200">
							<div
								class="h-1 bg-pertamina-green"
								style="width:{persenProgres(unggulanVM.peserta, unggulanVM.target)}%;"
							></div>
						</div>
						<p class="mt-2 text-[13px] leading-[1.45] text-ink-600">
							{formatAngka(unggulanVM.peserta)} dari {formatAngka(unggulanVM.target)} peserta sasaran
						</p>
					</div>
				{/if}
			</div>

			{#if gerakanPendamping.length > 0}
				<ul class="mt-12 border-t border-ink-200">
					{#each gerakanPendamping as gerakan (gerakan.id)}
						<li class="border-b border-ink-200">
							<div class="flex flex-wrap items-baseline gap-x-6 gap-y-2 py-5">
								<span
									class="h-6 w-1 shrink-0 self-center"
									style={warnaKeyline(gerakan.keyline)}
									aria-hidden="true"
								></span>
								<p class="min-w-0 flex-1 text-[18px] leading-[1.35] font-bold text-heading">
									{gerakan.judul}
								</p>
								<p class="text-[14px] leading-[1.5] text-ink-600">
									{gerakan.kategoriLabel} · {frasaHitung(gerakan.wilayah, 'wilayah')} ·
									{frasaHitung(gerakan.peserta, 'peserta')}
								</p>
								<p class="kicker shrink-0">{gerakan.statusLabel}</p>
							</div>
						</li>
					{/each}
				</ul>
			{/if}

			<div class="mt-8">
				<a
					href="/gerakan"
					class="inline-flex min-h-11 items-center gap-2 text-[15px] font-semibold text-pertamina-red-ink underline-offset-4 hover:underline"
				>
					Seluruh gerakan bersama
					<Icon path={ICONS.arrowLongRight} size={18} />
				</a>
			</div>
		{:else}
			<div class="max-w-[60ch]">
				<h3 class="display-editorial text-[30px] leading-[1.12] text-heading">
					Gerakan pertama sedang disiapkan
				</h3>
				<p class="mt-4 text-[18px] leading-[1.55] text-ink-700">
					Gerakan bersama selalu berawal dari usulan anggota sendiri. Belum ada yang berjalan
					saat ini — begitu satu usulan disetujui verifikator, wilayah dan target pesertanya
					muncul di sini.
				</p>
			</div>
		{/if}
	</SectionRule>
</div>

<!-- ═══ E7 · Penutup — pita, bukan kartu ═══ -->
<section class="bg-pertamina-navy">
	<!-- Keying rule merah lebar penuh di tepi atas: satu-satunya objek merah pada
	     viewport ini, sesuai rasio warna 90/7/3. -->
	<span class="keyline bg-pertamina-red" aria-hidden="true"></span>
	<div
		class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
		style="padding-block:var(--rhythm-tight);"
	>
		<div class="grid grid-cols-1 gap-x-12 gap-y-8 lg:grid-cols-12">
			<div class="min-w-0 lg:col-span-7">
				<!-- `leading-[1.15]` wajib ditulis: `display-editorial` berbaris 0.98 —
				     ukuran untuk judul SATU baris. Judul ini dibatasi 20ch, jadi selalu
				     pecah dua baris, dan pada 0.98 ekor huruf baris pertama menyentuh
				     kepala huruf baris kedua. -->
				<h2
					class="display-editorial max-w-[20ch] text-[clamp(24px,3vw,28px)] leading-[1.15] text-white"
				>
					Pernah menerima Beasiswa Sobat Bumi atau menjadi binaan PFpreneur?
				</h2>
				<p class="mt-4 max-w-[52ch] text-[16px] leading-[1.68] text-white/88">
					Pendaftarannya singkat, dan kamu bisa mulai ikut agenda komunitas hari itu juga.
				</p>
			</div>

			<div class="flex flex-col items-start gap-3 lg:col-span-5 lg:items-end lg:justify-center">
				<a
					href="/daftar"
					class="inline-flex min-h-11 items-center rounded-control bg-pertamina-red px-6 text-sm font-semibold text-white transition-colors hover:bg-pertamina-red-dark"
				>
					Gabung Sekarang
				</a>
				<a
					href="/masuk"
					class="text-[15px] text-white/88 underline underline-offset-4 transition-colors hover:text-white"
				>
					Sudah punya akun? Masuk
				</a>
			</div>
		</div>
	</div>
</section>
