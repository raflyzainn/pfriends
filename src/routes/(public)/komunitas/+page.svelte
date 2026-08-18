<script>
	/**
	 * DUA KOMUNITAS & CHAPTER — profil SOBI, Womenpreneur, dan pembagian chapter.
	 *
	 * Halaman ini memikul satu beban argumen yang tidak dipikul halaman lain:
	 * menjelaskan mengapa alumni beasiswa dan pelaku UMKM binaan ditempatkan di
	 * satu platform. Tanpa bagian "mengapa dipertemukan", halaman ini hanya menjadi
	 * dua profil yang kebetulan bersebelahan.
	 *
	 * TIGA KEPUTUSAN YANG TIDAK TERBACA DARI KODE:
	 *
	 * 1. **`EventCard` tidak dipakai sama sekali di zona publik.** Kartu itu
	 *    menampilkan sisa kuota dan nilai kehadiran — keduanya haram publik. Yang
	 *    dipakai adalah `EventListPanel`, komponen bersama yang bentuk datanya
	 *    (`EventCardVM`) memang tidak memuat keduanya. Larangan ditegakkan pada
	 *    bentuk data, bukan pada disiplin pemanggil.
	 *
	 * 2. **Cuplikan agenda mengambil `catalog.upcomingEvents()`, bukan daftar
	 *    mentah.** Sejak V2 kegiatan punya status "diusulkan", dan usulan mentah
	 *    bertanggal masa depan akan lolos penyaring naif — lalu tampil di halaman
	 *    publik sebagai agenda resmi.
	 *
	 * 3. **Sebaran chapter dirender sebagai baris tabel, bukan tiga kartu.** Tiga
	 *    kartu berukuran identik berjajar adalah bentuk yang dibuang diagnosis
	 *    D-05; barisnya membaca lebih cepat justru karena angkanya sejajar.
	 *
	 * @see docs/00-SOURCE-BRIEF.md — Hal 2 Background, Hal 4 dua komunitas, Hal 5 pilar 02
	 * @see docs/11-VISUAL-DIRECTION.md — §6 E3 spread komunitas, §6 E4 baris agenda
	 */
	import { Icon, ICONS } from '$lib/components';
	import EventListPanel from '$lib/components/EventListPanel.svelte';
	import { EditorialHero, PhotoFigure, PullQuote, SectionRule } from '$lib/components/editorial';
	import { catalog } from '$lib/stores/catalog.svelte.js';
	import { CHAPTERS, COMMUNITIES, CommunityType } from '$lib/domain/constants/community.js';
	import { foto } from '$lib/data/photos.js';
	import { formatAngka, frasaHitung } from '$lib/utils/format.js';
	import { agendaPublik, ringkasSemuaKomunitas } from '../_view-model.js';

	/** Jumlah kegiatan yang ditampilkan sebagai cuplikan kalender komunitas. */
	const AGENDA_LIMIT = 4;

	/** Baris agenda yang sengaja ber-thumbnail — satu penyimpangan dalam empat baris. */
	const BARIS_THUMBNAIL = 2;

	/** Foto & penekanan naratif tiap komunitas, sejajar urutan `COMMUNITIES`. */
	const RAGAM = Object.freeze({
		[CommunityType.SOBI]: Object.freeze({
			fotoKunci: 'sobi-mentoring',
			memberiLabel: 'Yang mereka bawa',
			keyline: 'green'
		}),
		[CommunityType.WOMENPRENEUR]: Object.freeze({
			fotoKunci: 'womenpreneur-produk',
			memberiLabel: 'Yang mereka butuhkan',
			keyline: 'red'
		})
	});

	const komunitasRingkas = $derived(ringkasSemuaKomunitas(catalog.awardees));
	const anggotaAktif = $derived(catalog.activeAwardees);
	const agenda = $derived(agendaPublik(catalog.upcomingEvents()));

	/** Sebaran anggota aktif per chapter, lengkap dengan komposisi dua komunitas. */
	const sebaranChapter = $derived(
		CHAPTERS.map((def) => {
			const anggota = anggotaAktif.filter((awardee) => awardee.chapterId === def.id);
			return {
				def,
				jumlah: anggota.length,
				jumlahSobi: anggota.filter((awardee) => awardee.community === CommunityType.SOBI).length,
				jumlahWomenpreneur: anggota.filter(
					(awardee) => awardee.community === CommunityType.WOMENPRENEUR
				).length
			};
		})
	);

	const adaAnggota = $derived(anggotaAktif.length > 0);

	/**
	 * Props `PhotoFigure` dari satu kunci manifes foto.
	 * @param {string} kunci
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
</script>

<svelte:head>
	<title>Dua Komunitas — PFfriends</title>
	<meta
		name="description"
		content="Profil Sobat Bumi Indonesia dan Womenpreneur Pertamina Foundation, pembagian chapter berbasis batch, serta agenda komunitas terdekat."
	/>
</svelte:head>

<EditorialHero
	image="komunitas-hero"
	imageMobile="komunitas-hero"
	alt="Sekelompok orang duduk melingkar sambil berbincang di ruang terbuka"
	kicker="Open community ecosystem"
	title={'Dua kelompok berbeda\nyang saling melengkapi'}
	standfirst="Alumni Beasiswa Sobat Bumi dan pelaku usaha Womenpreneur binaan Pertamina Foundation, dipertemukan di satu meja."
	primary={{ label: 'Masuk ke ruang anggota', href: '/masuk' }}
	secondary={{ label: 'Lihat agenda komunitas', href: '/kalender' }}
	overlay="flat"
	height="short"
	caption="Perbincangan komunitas — foto stok"
/>

<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
	<!-- Profil: dua spread bercermin, tidak berbaris rapi. -->
	<SectionRule
		tone="red"
		scale="display"
		rhythm="loose"
		kicker="Profil komunitas"
		label="Siapa yang ada di dalamnya"
	>
		{#each COMMUNITIES as profil, index (profil.id)}
			{@const ringkasan = komunitasRingkas[index]}
			{@const ragam = RAGAM[profil.id]}
			{@const berbalik = index % 2 === 1}
			<div
				class="grid grid-cols-1 gap-x-10 gap-y-8 lg:grid-cols-12 {index > 0 ? 'mt-16' : ''}"
			>
				<div class={berbalik ? 'lg:order-2 lg:col-span-5 lg:col-start-8' : 'lg:col-span-5'}>
					<PhotoFigure
						{...propsFoto(ragam.fotoKunci)}
						ratio="4:5"
						keyline={ragam.keyline}
						keylinePos="left"
						fallbackLabel={profil.akronim}
					/>
				</div>

				<div
					class="min-w-0 {berbalik
						? 'lg:order-1 lg:col-span-6 lg:col-start-1'
						: 'lg:col-span-6 lg:col-start-7'}"
				>
					<p class="kicker">{profil.programAsal}</p>
					<h3 class="display-editorial mt-3 text-[30px] leading-[1.12] text-heading">
						{profil.nama}
					</h3>
					<p class="mt-3 text-[16px] leading-[1.6] font-medium text-ink-800">{profil.peran}</p>

					<p class="mt-5 max-w-[58ch] text-[16px] leading-[1.68] text-ink-700">
						{profil.deskripsi}
					</p>

					<div class="mt-8 grid grid-cols-1 gap-x-8 gap-y-6 border-t border-ink-200 pt-6 sm:grid-cols-2">
						<div class="min-w-0">
							<p class="kicker">Tantangan yang dihadapi</p>
							<p class="mt-3 text-[15px] leading-[1.6] text-ink-700">{profil.tantangan}</p>
						</div>
						<div class="min-w-0">
							<p class="kicker">{ragam.memberiLabel}</p>
							<ul class="mt-3 space-y-2">
								{#each profil.kebutuhan as butir (butir)}
									<li class="flex gap-3 text-[15px] leading-[1.6] text-ink-700">
										<span class="shrink-0 text-ink-600" aria-hidden="true">—</span>
										<span>{butir}</span>
									</li>
								{/each}
							</ul>
						</div>
					</div>

					{#if ringkasan.jumlahAnggota > 0}
						<p class="mt-8 text-[16px] leading-[1.6] text-ink-700">
							<span class="figure-number text-[28px] text-ink-900">
								{formatAngka(ringkasan.jumlahAnggota)}
							</span>
							anggota aktif tercatat, tersebar di
							{frasaHitung(ringkasan.jumlahChapter, 'chapter')}
						</p>
					{:else}
						<p class="mt-8 text-[16px] leading-[1.6] text-ink-600">
							Keanggotaan komunitas ini sedang disusun. Angkanya muncul di sini begitu anggota
							pertama terverifikasi.
						</p>
					{/if}
				</div>
			</div>
		{/each}
	</SectionRule>

	<!-- Jembatan: satu kolom prosa. Argumen halaman ini, bukan daftar fitur. -->
	<SectionRule
		tone="navy"
		scale="quiet"
		rhythm="snug"
		kicker="Mengapa keduanya dipertemukan"
		label="Yang satu punya keahlian, yang lain punya usaha yang siap tumbuh"
	>
		<div class="max-w-[66ch]">
			<p class="text-[16px] leading-[1.68] text-ink-700">
				Alumni Sobat Bumi keluar dari program dengan bekal pendidikan, keahlian digital, dan
				jejaring kampus yang luas — tetapi sering tidak tahu ke mana keahlian itu bisa disalurkan
				setelah kelulusan.
			</p>
			<p class="mt-5 text-[16px] leading-[1.68] text-ink-700">
				Womenpreneur binaan PFpreneur berada pada posisi sebaliknya: usahanya sudah berjalan dan
				produknya sudah punya pembeli, namun pertumbuhannya tertahan karena jaringan pemasaran,
				riset pasar, dan akses tenaga ahli digital yang terbatas.
			</p>

			<PullQuote
				quote="Mempertemukan keduanya adalah pertukaran yang sama-sama menguntungkan: satu pihak menemukan tempat berkontribusi, pihak lain menemukan kapasitas yang selama ini harus dibeli mahal di luar."
				attribution="Rancangan Community Connect Initiative, Hal 4"
				keyline="navy"
				variant="pulled"
				class="mt-8"
			/>
		</div>
	</SectionRule>

	<!-- Chapter: foto + baris tabel, bukan tiga kartu seragam. -->
	<SectionRule
		scale="section"
		rhythm="base"
		kicker="Pembagian chapter"
		label="Chapter mengikuti batch, sama seperti grup WhatsApp-nya"
		lead="Anggota baru otomatis masuk chapter angkatannya sendiri, sejalan dengan pembagian grup yang sudah berjalan lebih dulu."
	>
		<div class="grid grid-cols-1 gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
			<div class="min-w-0">
				<PhotoFigure
					{...propsFoto('chapter-pertemuan')}
					ratio="4:5"
					keyline="navy"
					keylinePos="top"
					fallbackLabel="Pertemuan chapter"
				/>
			</div>

			<div class="min-w-0">
				<ul class="border-t border-ink-200">
					{#each sebaranChapter as entri (entri.def.id)}
						<li class="border-b border-ink-200 py-6">
							<div class="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
								<div class="min-w-0">
									<h3 class="text-[18px] leading-[1.35] font-bold text-heading">
										{entri.def.label}
									</h3>
									<p class="mt-1 text-[13px] leading-[1.45] text-ink-600">{entri.def.wagLabel}</p>
								</div>

								{#if entri.jumlah > 0}
									<p class="shrink-0 text-right text-[14px] leading-[1.5] text-ink-600">
										<span class="figure-number block text-[28px] text-ink-900">
											{formatAngka(entri.jumlah)}
										</span>
										{formatAngka(entri.jumlahSobi)} Sobat Bumi ·
										{formatAngka(entri.jumlahWomenpreneur)} Womenpreneur
									</p>
								{:else}
									<p class="shrink-0 text-[14px] leading-[1.5] text-ink-600">
										Menunggu anggota pertamanya
									</p>
								{/if}
							</div>

							<p class="mt-3 max-w-[58ch] text-[15px] leading-[1.6] text-ink-700">
								{entri.def.deskripsi}
							</p>
						</li>
					{/each}
				</ul>

				{#if !adaAnggota}
					<p class="mt-6 max-w-[58ch] text-[16px] leading-[1.68] text-ink-700">
						Belum ada chapter yang terisi di peramban ini. Chapter dibuka mengikuti batch penerima
						manfaat — daftar lebih dulu, dan kamu akan langsung ditautkan ke chapter angkatanmu.
					</p>
				{/if}
			</div>
		</div>
	</SectionRule>

	<!-- Agenda: komponen bersama, satu kolom lebar. -->
	<SectionRule
		tone="navy"
		scale="quiet"
		rhythm="snug"
		kicker="Kalender komunitas"
		label="Yang akan terjadi berikutnya"
	>
		<EventListPanel
			events={agenda}
			limit={AGENDA_LIMIT}
			thumbnailAt={BARIS_THUMBNAIL}
			variant="panel"
			title="Agenda terdekat"
			href="/kalender"
			emptyMessage="Belum ada kegiatan terjadwal. Kalender diperbarui tiap awal bulan, dan anggota mendapat kabar lebih dulu lewat WA Komunitas."
		/>
		<p class="mt-6 max-w-[58ch] text-[15px] leading-[1.6] text-ink-600">
			Pendaftaran kehadiran hanya terbuka bagi anggota yang sudah masuk.
		</p>
	</SectionRule>
</div>

<!-- Penutup: pita, bukan kartu. -->
<section class="bg-pertamina-navy">
	<span class="keyline bg-pertamina-red" aria-hidden="true"></span>
	<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" style="padding-block:var(--rhythm-tight);">
		<div class="grid grid-cols-1 gap-x-12 gap-y-8 lg:grid-cols-12">
			<div class="min-w-0 lg:col-span-7">
				<h2 class="display-editorial max-w-[22ch] text-[clamp(24px,3vw,28px)] text-white">
					Komunitasmu sudah menunggu
				</h2>
				<p class="mt-4 max-w-[52ch] text-[16px] leading-[1.68] text-white/88">
					Setiap anggota sudah tertaut ke chapter asalnya begitu masuk ke ruang anggota.
				</p>
			</div>
			<div class="flex flex-col items-start gap-3 lg:col-span-5 lg:items-end lg:justify-center">
				<a
					href="/masuk"
					class="inline-flex min-h-11 items-center rounded-control bg-accent-200 px-6 text-sm font-bold text-brand-800 transition-colors hover:bg-accent-300"
				>
					Masuk ke ruang anggota
				</a>
				<a
					href="/cerita"
					class="inline-flex items-center gap-2 text-[15px] text-white/88 underline underline-offset-4 transition-colors hover:text-white"
				>
					Baca cerita anggotanya
					<Icon path={ICONS.arrowLongRight} size={18} />
				</a>
			</div>
		</div>
	</div>
</section>
