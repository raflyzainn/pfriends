<script>
	/**
	 * TENTANG INISIATIF: latar, tujuan, pilar aktivitas, dan lini masa 2026.
	 *
	 * Halaman ini menjawab pertanyaan pengelola program, bukan pertanyaan calon
	 * anggota: mengapa inisiatif ini ada, apa yang dikerjakannya, dan sudah sampai
	 * mana. Karena itu urutannya dimulai dari masalah, bukan dari fitur.
	 *
	 * Kedua blok latar belakang mengambil `tantangan` langsung dari konstanta
	 * komunitas. Menyalin ulang kalimatnya ke halaman ini berarti dua rumusan
	 * masalah yang harus dijaga tetap sama: dan cepat atau lambat keduanya
	 * berbeda tanpa ada yang menyadarinya.
	 *
	 * TIGA KEPUTUSAN YANG TIDAK TERBACA DARI KODE:
	 *
	 * 1. **Bagian "dampak yang diharapkan" tidak lagi memakai angka besar.** Ketiga
	 *    angkanya berkelas C: rujukan industri yang dikutip dokumen sumber, bukan
	 *    hasil pengukuran PFriends. Dicetak sebagai angka 24 px di dalam kartu, ia
	 *    menyatakan "capaian" tanpa satu kata pun (aturan D-02). Yang dipakai
	 *    sekarang adalah kalimat `BENCHMARK_RUJUKAN` dari domain, apa adanya.
	 *
	 * 2. **Pilar 05 disebut dengan nama aslinya, tetapi rinciannya tidak memuat
	 *    mekanik skor.** Keberadaan sistem pengakuan kontribusi memang bagian dari
	 *    rancangan program dan menyembunyikannya justru tidak jujur; yang dilarang
	 *    adalah memajang nilainya di ruang publik. Rinciannya ada di ruang anggota,
	 *    penjelasan metodenya di `/metode-pengukuran`.
	 *
	 * 3. **Enam pilar dirender sebagai daftar bernomor dua kolom, bukan enam kartu
	 *    seragam.** Enam kartu putih beradius identik adalah bentuk yang persis
	 *    dibuang diagnosis D-05.
	 *
	 * 4. **Antitesis "X, bukan Y" ditipiskan dari lima menjadi satu.** Konstruksi
	 *    yang sama sempat dipakai pada standfirst, ringkasan pilar 04, lead enam
	 *    pilar, label bagian dampak, dan paragraf penutupnya: lima kali pada satu
	 *    halaman, dan justru pengulangannya yang membuat teks terbaca seperti
	 *    keluaran mesin. Yang bertahan hanyalah kalimat yang menanggung beban:
	 *    penegasan bahwa angka rujukan bukan hasil pengukuran PFriends.
	 *    Menghapusnya berarti menghapus peringatannya sekalian.
	 *
	 * @see docs/00-SOURCE-BRIEF.md: Hal 2 Background, Hal 4 Objective, Hal 5, Hal 6, Hal 7
	 * @see docs/10-REVISION-SPEC.md: §4.4 kelas angka, §4.6 aturan bagian dampak
	 */
	import { Icon, ICONS, Timeline } from '$lib/components';
	import { EditorialHero, PhotoFigure, PullQuote, SectionRule } from '$lib/components/editorial';
	import { COMMUNITIES } from '$lib/domain/constants/community.js';
	import { BENCHMARK_RUJUKAN } from '$lib/domain/services/ProgramImpactService.js';
	import { foto } from '$lib/data/photos.js';

	/**
	 * Enam pilar aktivitas Hal 5. Isi tiap pilar adalah parafrase setia dari
	 * dokumen sumber: tidak ada pilar tambahan dan tidak ada yang dihilangkan.
	 */
	const PILAR = [
		{
			nomor: '01',
			nama: 'Open Community Ecosystem',
			ringkas: 'Pintu masuk yang terbuka dan aturan main yang jelas.',
			butir: [
				'Kanal komunikasi resmi komunitas melalui microsite',
				'Pendaftaran mandiri penerima manfaat',
				'Aturan keanggotaan beserta manfaat yang menyertainya'
			]
		},
		{
			nomor: '02',
			nama: 'Kalender Komunitas',
			ringkas: 'Agenda yang membuat komunitas punya alasan berkumpul.',
			butir: [
				'Kegiatan upskilling untuk menambah keahlian anggota',
				'Pertemuan komunitas dan sharing session antaranggota',
				'Pembagian chapter komunitas berbasis batch'
			]
		},
		{
			nomor: '03',
			nama: 'Movement-Based Program',
			ringkas: 'Gerakan bersama yang selaras fokus keberlanjutan Pertamina.',
			butir: [
				'Aksi lingkungan yang dikerjakan langsung di wilayah anggota',
				'Edukasi masyarakat oleh anggota yang menguasai bidangnya',
				'Pemberdayaan ekonomi lewat pendampingan usaha binaan'
			]
		},
		{
			nomor: '04',
			nama: 'Diseminasi dan Amplifikasi Informasi',
			ringkas: 'Kabar baik Pertamina dan PF sampai lewat orang yang mengalaminya sendiri.',
			butir: [
				'Penyebarluasan informasi terkait Pertamina dan Pertamina Foundation',
				'Amplifikasi oleh anggota ke jaringan pribadi dan media sosial',
				'Pelacakan jangkauan sebagai bahan evaluasi program'
			]
		},
		{
			nomor: '05',
			nama: 'Recognition',
			ringkas: 'Kontribusi yang tercatat, diapresiasi, dan tidak menguap.',
			butir: [
				'TOP Contribution bagi anggota paling aktif tiap periode',
				'Sorotan bagi alumni dengan capaian karier dan usaha yang baik',
				'Apresiasi kontribusi yang dapat ditukar dengan manfaat nyata di ruang anggota'
			]
		},
		{
			nomor: '06',
			nama: 'Community Journalism',
			ringkas: 'Anggota menuliskan sendiri apa yang mereka kerjakan.',
			butir: [
				'Tantangan bertema, seperti gerakan pengurangan sampah',
				'Kampanye energi bersih yang didokumentasikan anggota',
				'Program edukasi di masyarakat beserta catatan hasilnya'
			]
		}
	];

	/**
	 * Lini masa 2026 Hal 7. Tanggal memakai awal bulan sebagai penanda periode :
	 * dokumen sumber menyebut bulan, bukan tanggal pelaksanaan.
	 */
	const LINI_MASA = [
		{
			id: 'jan-2026',
			title: 'Januari: Pendataan penerima manfaat',
			description:
				'Pengumpulan database penerima manfaat PFpreneur dan PFprestasi, dilanjutkan validasi keabsahan datanya.',
			at: '2026-01-15T09:00:00+07:00',
			iconPath: ICONS.document,
			color: 'var(--color-pertamina-navy)'
		},
		{
			id: 'feb-2026',
			title: 'Februari: Perumusan konsep',
			description:
				'Pengajuan konsep Community Building & Engagement, serta diskusi bersama fungsi IT dan tim Corporate Secretary.',
			at: '2026-02-15T09:00:00+07:00',
			iconPath: ICONS.users,
			color: 'var(--color-pertamina-navy)'
		},
		{
			id: 'mar-2026',
			title: 'Maret: PFriends home dan sosialisasi',
			description:
				'Pembuatan "PFriends home" beserta konsep microsite, dibarengi sosialisasi kepada penerima manfaat untuk bergabung.',
			at: '2026-03-15T09:00:00+07:00',
			iconPath: ICONS.home,
			color: 'var(--color-pertamina-blue)'
		},
		{
			id: 'apr-2026',
			title: 'April: Pembentukan WA Komunitas',
			description:
				'Penerima manfaat diundang bergabung ke WA Komunitas secara bertahap, disertai komunikasi rutin mengenai program.',
			at: '2026-04-15T09:00:00+07:00',
			iconPath: ICONS.whatsapp,
			color: 'var(--color-pertamina-green)'
		},
		{
			id: 'mei-2026',
			title: 'Mei: Microsite dan onboarding',
			description:
				'Pembuatan microsite PFriends dan proses onboarding penerima manfaat ke dalamnya.',
			at: '2026-05-15T09:00:00+07:00',
			iconPath: ICONS.globe,
			color: 'var(--color-pertamina-green)'
		},
		{
			id: 'jun-2026',
			title: 'Juni: Pengakuan kontribusi mulai berjalan',
			description:
				'Pencatatan kontribusi anggota dan amplifikasi informasi dari komunitas mulai dijalankan, bersamaan dengan upskilling anggota.',
			at: '2026-06-15T09:00:00+07:00',
			iconPath: ICONS.bolt,
			color: 'var(--color-pertamina-green)'
		},
		{
			id: 'jul-2026',
			title: 'Juli: Agenda setting profil anggota',
			description:
				'Diseminasi konten PF yang berkaitan dengan profil anggota PFprestasi dan PFpreneur, ditambah kelanjutan amplifikasi dan upskilling.',
			at: '2026-07-15T09:00:00+07:00',
			iconPath: ICONS.megaphone,
			color: 'var(--color-pertamina-red)'
		}
	];

	/**
	 * Props `PhotoFigure` dari satu kunci manifes foto.
	 *
	 * `foto()` mengembalikan `null` untuk kunci yang berkasnya tidak tersedia;
	 * dalam hal itu `src` kosong dan komponen jatuh ke blok tipografis.
	 *
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
	<title>Tentang Inisiatif: PFriends</title>
	<meta
		name="description"
		content="Latar belakang, tujuan, enam pilar aktivitas, dan lini masa 2026 Community Connect Initiative Pertamina Foundation."
	/>
</svelte:head>

<EditorialHero
	image="tentang-hero"
	imageMobile="tentang-hero"
	alt="Sekelompok orang berdiskusi mengelilingi meja panjang dalam sebuah pertemuan kerja"
	kicker="Community Connect Initiative"
	title={'Mengelola komunitas\npenerima manfaat\ndengan lebih terarah'}
	standfirst="Pertamina Foundation sudah meluluskan ribuan penerima manfaat. Yang belum tergarap adalah apa yang terjadi kepada mereka setelah programnya berakhir."
	primary={{ label: 'Lihat komunitasnya', href: '/komunitas' }}
	secondary={{ label: 'Metode pengukuran', href: '/metode-pengukuran' }}
	overlay="flat"
	height="short"
	caption="Pertemuan kerja: foto stok"
/>

<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
	<!-- Latar belakang: dua persoalan, dikutip apa adanya dari konstanta komunitas. -->
	<SectionRule
		tone="red"
		scale="display"
		rhythm="loose"
		kicker="Latar belakang"
		label="Dua persoalan yang melatarbelakanginya"
	>
		<div class="grid grid-cols-1 gap-x-12 gap-y-12 md:grid-cols-2">
			{#each COMMUNITIES as profil (profil.id)}
				<div class="min-w-0">
					<p class="kicker">{profil.akronim} · {profil.programAsal}</p>
					<PullQuote
						quote={profil.tantangan}
						attribution="Rumusan masalah dokumen inisiatif, Hal 2"
						keyline={profil.id === COMMUNITIES[0].id ? 'green' : 'red'}
						variant="inline"
						class="mt-5"
					/>
					<p class="mt-6 max-w-[58ch] text-[16px] leading-[1.68] text-ink-700">
						{profil.deskripsi}
					</p>
				</div>
			{/each}
		</div>
	</SectionRule>

	<!-- Objective: satu kolom prosa + satu foto. -->
	<!-- Kicker wajib Bahasa Indonesia; "Objective" adalah judul bagian pada dokumen
	     sumber, bukan label antarmuka. -->
	<SectionRule tone="navy" scale="quiet" rhythm="snug" kicker="Tujuan" label="Yang hendak dicapai">
		<div class="grid grid-cols-1 gap-x-12 gap-y-10 lg:grid-cols-12">
			<div class="min-w-0 lg:col-span-7">
				<p class="display-editorial max-w-[24ch] text-[24px] leading-[1.20] text-heading">
					Mengelola komunitas penerima manfaat dengan lebih terarah, sekaligus memudahkan
					diseminasi dan amplifikasi informasi hal baik terkait Pertamina dan Pertamina
					Foundation.
				</p>
				<p class="mt-6 max-w-[62ch] text-[16px] leading-[1.68] text-ink-700">
					Wujudnya adalah platform ekosistem yang menghubungkan alumni Beasiswa Sobat Bumi sebagai
					mitra muda dan mentor dengan PFpreneur sebagai mitra sekaligus entitas bisnis binaan.
					Microsite ini menjadi rumah komunitas tersebut: tempat informasi disebarkan, agenda
					disusun, dan kerja lapangan didokumentasikan.
				</p>
				<p class="mt-6 max-w-[62ch] text-[15px] leading-[1.6] text-ink-600">
					Landasan konseptualnya adalah <span class="italic">Sense of Community Theory</span> :
					McMillan &amp; Chavis (1986): komunitas menjadi kuat ketika anggotanya merasakan ikatan
					psikologis dan rasa memiliki.
				</p>
			</div>

			<div class="min-w-0 lg:col-span-5">
				<PhotoFigure
					{...propsFoto('tentang-sosialisasi')}
					ratio="4:5"
					keyline="navy"
					keylinePos="left"
					fallbackLabel="Sosialisasi program"
				/>
			</div>
		</div>
	</SectionRule>

	<!-- Enam pilar sebagai daftar bernomor, bukan enam kartu seragam. -->
	<SectionRule
		scale="section"
		rhythm="base"
		kicker="Aktivitas"
		label="Enam pilar, semuanya berwujud di microsite ini"
		lead="Keenamnya sudah berwujud halaman atau alur kerja di microsite ini, lengkap dengan tempat hasilnya dicatat."
	>
		<ol class="grid grid-cols-1 gap-x-12 gap-y-10 border-t border-ink-200 pt-10 md:grid-cols-2">
			{#each PILAR as pilar (pilar.nomor)}
				<li class="min-w-0">
					<div class="flex items-baseline gap-4">
						<span class="figure-number shrink-0 text-[40px] text-ink-200" aria-hidden="true">
							{pilar.nomor}
						</span>
						<h3 class="min-w-0 text-[18px] leading-[1.35] font-bold text-heading">{pilar.nama}</h3>
					</div>
					<p class="mt-3 max-w-[52ch] text-[16px] leading-[1.68] text-ink-700">{pilar.ringkas}</p>
					<ul class="mt-4 space-y-2">
						{#each pilar.butir as butir (butir)}
							<li class="flex gap-3 text-[15px] leading-[1.6] text-ink-600">
								<span class="shrink-0" aria-hidden="true">:</span>
								<span>{butir}</span>
							</li>
						{/each}
					</ul>
				</li>
			{/each}
		</ol>
	</SectionRule>

	<!-- Lini masa: satu kolom, komponen bersama. -->
	<SectionRule
		tone="navy"
		scale="quiet"
		rhythm="snug"
		kicker="Perjalanan"
		label="Lini masa 2026"
	>
		<div class="max-w-[68ch]">
			<Timeline items={LINI_MASA} />
		</div>
	</SectionRule>

	<!-- Dampak yang diharapkan: kalimat rujukan, tanpa angka besar. -->
	<SectionRule
		scale="display"
		rhythm="loose"
		kicker="Dampak yang diharapkan"
		label="Acuan perencanaan yang belum kami ukur sendiri"
	>
		<div class="grid grid-cols-1 gap-x-12 gap-y-10 lg:grid-cols-12">
			<div class="min-w-0 lg:col-span-7">
				<ul class="border-t border-ink-200">
					{#each BENCHMARK_RUJUKAN as rujukan (rujukan.id)}
						<li class="border-b border-ink-200 py-6">
							<p class="max-w-[62ch] text-[18px] leading-[1.55] text-ink-700">
								{rujukan.kalimat}
							</p>
							<p class="mt-3 text-[13px] leading-[1.45] text-ink-600">Sumber: {rujukan.sumber}</p>
						</li>
					{/each}
				</ul>

				<p class="mt-6 max-w-[62ch] text-[15px] leading-[1.6] text-ink-600">
					Kedua kalimat itu adalah acuan perencanaan, bukan hasil pengukuran PFriends. Angka yang
					benar-benar terhitung dari catatan komunitas ditampilkan di beranda, lengkap dengan
					tanggal potretnya.
				</p>

				<a
					href="/metode-pengukuran"
					class="mt-6 inline-flex min-h-11 items-center gap-2 text-[15px] font-semibold text-pertamina-red-ink underline-offset-4 hover:underline"
				>
					Cara setiap angka diperoleh
					<Icon path={ICONS.arrowLongRight} size={18} />
				</a>
			</div>

			<div class="min-w-0 lg:col-span-5">
				<PhotoFigure
					{...propsFoto('tentang-amplifikasi')}
					ratio="3:2"
					keyline="green"
					keylinePos="top"
					fallbackLabel="Amplifikasi informasi"
				/>
			</div>
		</div>
	</SectionRule>
</div>

<!-- Penutup: pita, bukan kartu. -->
<section class="bg-pertamina-navy">
	<span class="keyline bg-pertamina-red" aria-hidden="true"></span>
	<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" style="padding-block:var(--rhythm-tight);">
		<div class="grid grid-cols-1 gap-x-12 gap-y-8 lg:grid-cols-12">
			<div class="min-w-0 lg:col-span-7">
				<!-- `display-editorial` berbaris 0.98: ukuran judul satu baris. Judul
				     yang dibatasi 22ch selalu pecah dua baris, dan leading itu membuat
				     ekor huruf baris pertama menyentuh kepala huruf baris kedua. -->
				<h2
					class="display-editorial max-w-[22ch] text-[clamp(24px,3vw,28px)] leading-[1.15] text-white"
				>
					Kamu bagian dari cerita ini
				</h2>
				<p class="mt-4 max-w-[52ch] text-[16px] leading-[1.68] text-white/88">
					Alumni Beasiswa Sobat Bumi dan binaan PFpreneur dapat masuk ke ruang anggotanya hari ini
					juga.
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
					href="/komunitas"
					class="text-[15px] text-white/88 underline underline-offset-4 transition-colors hover:text-white"
				>
					Lihat dua komunitasnya
				</a>
			</div>
		</div>
	</div>
</section>
