<script>
	/**
	 * HALAMAN: Forum Komunitas (`/awardee/forum`).
	 *
	 * Ruang percakapan harian PFriends: kanal bertema di kiri, aliran pesan di
	 * tengah, anggota yang sedang daring di kanan. Susunan tiga kolom ini sengaja
	 * meniru aplikasi obrolan yang sudah dipakai sehari-hari oleh alumni: bukan
	 * karena mengikuti tren, melainkan karena kanal bertema adalah satu-satunya
	 * cara membuat satu grup berisi ribuan alumni tetap terbaca. Grup WhatsApp
	 * tunggal yang kini mereka pakai menenggelamkan pertanyaan teknis PFpreneur di
	 * bawah undangan webinar dalam hitungan menit.
	 *
	 * TIGA KEPUTUSAN YANG TIDAK TERBACA DARI KODE:
	 *
	 * 1. **Percakapan hidup di state lokal, bukan di IndexedDB.** Forum belum punya
	 *    entity, repository, maupun aturan moderasi di lapisan domain: menuliskan
	 *    tabel Dexie sekarang berarti membekukan bentuk data sebelum satu pun
	 *    aturannya diputuskan, dan itu hutang yang jauh lebih mahal daripada pesan
	 *    peraga yang hilang saat halaman dimuat ulang.
	 * 2. **Nol poin, tier, dan peringkat.** Halaman ini tidak mengimpor satu pun
	 *    komponen gamifikasi. Percakapan yang diberi harga poin berubah menjadi
	 *    perlombaan mengetik, dan yang paling cepat menjadi sunyi justru kanal
	 *    tanya-jawab tempat orang seharusnya berani bertanya hal mendasar.
	 * 3. **Pesan berurutan dari orang yang sama DIGABUNG.** Tanpa penggabungan,
	 *    tiga baris balasan singkat menghasilkan tiga blok avatar+nama+waktu dan
	 *    aliran percakapan terbaca seperti daftar tabel. Ambangnya waktu, bukan
	 *    hanya identitas penulis: dua pesan dari orang yang sama berjarak dua jam
	 *    adalah dua percakapan berbeda.
	 */
	import { tick } from 'svelte';
	import { Avatar, Card, Icon, ICONS } from '$lib/components';
	import { session } from '$lib/stores/session.svelte.js';
	import { formatTanggal, frasaHitung, inisial } from '$lib/utils/format.js';

	/** Jarak maksimum dua pesan yang masih dianggap satu tarikan napas (menit). */
	const AMBANG_GABUNG_MENIT = 8;

	/** Panjang maksimum satu pesan; menahan tempelan naskah panjang di kanal obrolan. */
	const BATAS_KARAKTER = 600;

	/**
	 * Titik acuan seluruh cap waktu peraga.
	 *
	 * Dibekukan sekali saat modul dimuat, bukan dibaca ulang tiap render: cap waktu
	 * yang bergerak sendiri membuat urutan pesan berubah di tengah peragaan.
	 */
	const SEKARANG = new Date();

	/**
	 * Cap waktu relatif terhadap `SEKARANG`.
	 * @param {number} menit Berapa menit yang lalu.
	 * @returns {Date}
	 */
	function menitLalu(menit) {
		return new Date(SEKARANG.getTime() - menit * 60_000);
	}

	/**
	 * @typedef {object} Kanal
	 * @property {string} id
	 * @property {string} nama      Nama kanal tanpa tanda pagar.
	 * @property {string} topik     Satu kalimat yang menjelaskan isi kanal.
	 * @property {string} [catatan] Keterangan tambahan di kepala aliran pesan.
	 */

	/** @type {readonly Kanal[]} */
	const KANAL = Object.freeze([
		{
			id: 'pengumuman',
			nama: 'pengumuman',
			topik: 'Kabar resmi dari tim Corporate Secretary Pertamina Foundation.',
			catatan: 'Kanal searah: balasan dibuka di #tanya-jawab supaya pengumuman tetap mudah dicari.'
		},
		{
			id: 'sobi-alumni',
			nama: 'sobi-alumni',
			topik: 'Ruang santai alumni Beasiswa Sobat Bumi lintas angkatan dan kampus.'
		},
		{
			id: 'pfpreneur',
			nama: 'pfpreneur',
			topik: 'Obrolan pelaku UMKM binaan PFpreneur: pemasaran, produksi, dan permodalan.'
		},
		{
			id: 'mangrove',
			nama: 'mangrove',
			topik: 'Koordinasi aksi tanam dan perawatan mangrove tiap chapter.'
		},
		{
			id: 'tanya-jawab',
			nama: 'tanya-jawab',
			topik: 'Tempat bertanya apa saja. Tidak ada pertanyaan yang terlalu mendasar di sini.'
		}
	]);

	/**
	 * @typedef {object} Pesan
	 * @property {string} id
	 * @property {string} penulis
	 * @property {string} peran     Label pendek: komunitas, chapter, atau jabatan.
	 * @property {Date} waktu
	 * @property {string} isi
	 * @property {boolean} [saya]   Ditulis oleh anggota yang sedang masuk.
	 * @property {{emoji: string, jumlah: number}[]} [reaksi]
	 */

	/**
	 * Percakapan peraga per kanal, terlama lebih dulu.
	 *
	 * Isinya sengaja spesifik: nama kampus, nama produk, angka yang masuk akal.
	 * Percakapan peraga yang hanya berisi "halo semua" membuat forum terlihat mati
	 * justru pada layar yang seharusnya membuktikan bahwa ia hidup.
	 * @type {Record<string, Pesan[]>}
	 */
	let percakapan = $state({
		pengumuman: [
			{
				id: 'p1',
				penulis: 'Tim Corsec PF',
				peran: 'Corporate Secretary',
				waktu: menitLalu(600),
				isi: 'Halo PFriends! Pendaftaran PFriends Connect Batch 3 sudah dibuka. Kuota 120 peserta, ditutup 20 Agustus. Tautan pendaftaran ada di menu Calendar of Event ya.',
				reaksi: [
					{ emoji: '🎉', jumlah: 24 },
					{ emoji: '👍', jumlah: 11 }
				]
			},
			{
				id: 'p2',
				penulis: 'Tim Corsec PF',
				peran: 'Corporate Secretary',
				waktu: menitLalu(180),
				isi: 'Pengingat: naskah Blog untuk edisi laporan ESG triwulan ini paling lambat masuk antrean tinjauan hari Jumat. Yang sudah dapat catatan revisi, mohon segera ditindaklanjuti.',
				reaksi: [{ emoji: '📝', jumlah: 8 }]
			},
			{
				id: 'p3',
				penulis: 'Tim Corsec PF',
				peran: 'Corporate Secretary',
				waktu: menitLalu(42),
				isi: 'Sertifikat kehadiran Upskilling Series #7 sudah dikirim ke email masing-masing peserta. Kalau belum menerima sampai besok siang, kabari kami di #tanya-jawab.'
			}
		],
		'sobi-alumni': [
			{
				id: 's1',
				penulis: 'Wulan Panjaitan',
				peran: 'SOBI · Chapter Sumatera',
				waktu: menitLalu(320),
				isi: 'Selamat pagi semua! Ada yang alumni Unand angkatan 2019? Lagi cari teman untuk kolaborasi program literasi energi di sekolah-sekolah Padang.',
				reaksi: [{ emoji: '🙋', jumlah: 5 }]
			},
			{
				id: 's2',
				penulis: 'Rendra Sihombing',
				peran: 'SOBI · Chapter Sumatera',
				waktu: menitLalu(312),
				isi: 'Saya angkatan 2018 Unand, Kak. Masih di Padang dan lagi senggang akhir pekan. Boleh ikut kalau masih terbuka?'
			},
			{
				id: 's3',
				penulis: 'Wulan Panjaitan',
				peran: 'SOBI · Chapter Sumatera',
				waktu: menitLalu(309),
				isi: 'Boleh banget! Nanti saya kirim rancangan materinya. Rencananya empat sesi, tiap Sabtu pagi.'
			},
			{
				id: 's4',
				penulis: 'Bagus Nugroho',
				peran: 'SOBI · Chapter Jawa Timur',
				waktu: menitLalu(150),
				isi: 'Sekadar berbagi: kemarin saya isi sesi mentoring untuk teman-teman PFpreneur soal pembukuan sederhana. Ternyata pengalaman kerja di kantor bisa langsung kepakai. Kalau ada yang mau ikut jadi mentor, daftarnya lewat Calendar of Event.',
				reaksi: [
					{ emoji: '🔥', jumlah: 14 },
					{ emoji: '👏', jumlah: 6 }
				]
			},
			{
				id: 's5',
				penulis: 'Nadia Rahmawati',
				peran: 'SOBI · Chapter Jabodetabek',
				waktu: menitLalu(38),
				isi: 'Aku baru selesai nulis Blog tentang program bank sampah di RW-ku. Deg-degan nunggu tinjauan verifikator 😄',
				reaksi: [{ emoji: '💚', jumlah: 9 }]
			},
			{
				id: 's6',
				penulis: 'Bagus Nugroho',
				peran: 'SOBI · Chapter Jawa Timur',
				waktu: menitLalu(31),
				isi: 'Semangat Nadia! Biasanya tiga hari kerja sudah ada kabarnya.'
			}
		],
		pfpreneur: [
			{
				id: 'u1',
				penulis: 'Sari Handayani',
				peran: 'Womenpreneur · Keripik Talas Ambon',
				waktu: menitLalu(420),
				isi: 'Ibu-ibu, ada yang sudah pernah kirim produk makanan kering ke luar pulau? Saya baru dapat pesanan 200 pack ke Makassar tapi bingung pilih ekspedisi yang aman untuk kemasan.',
				reaksi: [{ emoji: '📦', jumlah: 4 }]
			},
			{
				id: 'u2',
				penulis: 'Melati Kusuma',
				peran: 'Womenpreneur · Batik Ecoprint Pekalongan',
				waktu: menitLalu(405),
				isi: 'Saya rutin kirim ke Sulawesi, Bu. Saran saya pakai kardus double wall dan bubble wrap dua lapis, lalu minta ekspedisi yang punya gudang transit ber-AC. Ongkosnya naik sedikit tapi retur karena remuk jadi nol.'
			},
			{
				id: 'u3',
				penulis: 'Sari Handayani',
				peran: 'Womenpreneur · Keripik Talas Ambon',
				waktu: menitLalu(398),
				isi: 'Terima kasih banyak! Nanti saya coba hitung ulang harga jualnya.'
			},
			{
				id: 'u4',
				penulis: 'Intan Latuconsina',
				peran: 'Womenpreneur · Abon Ikan Tual',
				waktu: menitLalu(120),
				isi: 'Numpang tanya juga: untuk izin edar PIRT, prosesnya di dinas kesehatan kabupaten atau kota ya? Saya sudah dua minggu bolak-balik.',
				reaksi: [{ emoji: '🙏', jumlah: 3 }]
			},
			{
				id: 'u5',
				penulis: 'Fitri Ramadhani',
				peran: 'Mentor PFpreneur',
				waktu: menitLalu(96),
				isi: 'Di dinas kesehatan kabupaten/kota sesuai domisili produksi, Bu Intan. Yang sering bikin lama biasanya berkas denah ruang produksi. Kalau mau, sesi pendampingan izin usaha ada tiap Rabu: jadwalnya di Calendar of Event.',
				reaksi: [{ emoji: '👍', jumlah: 7 }]
			}
		],
		mangrove: [
			{
				id: 'm1',
				penulis: 'Panji Wijaya',
				peran: 'SOBI · Chapter Kalimantan',
				waktu: menitLalu(500),
				isi: 'Update aksi tanam Muara Berau: 1.200 bibit sudah tertanam akhir pekan lalu. Tingkat hidup pantauan dua minggu ada di 87%.',
				reaksi: [
					{ emoji: '🌱', jumlah: 22 },
					{ emoji: '🎉', jumlah: 9 }
				]
			},
			{
				id: 'm2',
				penulis: 'Kartika Wanggai',
				peran: 'SOBI · Chapter Indonesia Timur',
				waktu: menitLalu(240),
				isi: 'Keren! Kami di Sorong baru mulai pembibitan. Boleh minta format catatan pemantauannya, Bang Panji? Biar datanya seragam waktu dilaporkan.'
			},
			{
				id: 'm3',
				penulis: 'Panji Wijaya',
				peran: 'SOBI · Chapter Kalimantan',
				waktu: menitLalu(232),
				isi: 'Boleh. Saya kirim lewat pesan pribadi ya, sekalian foto papan petak pemantauannya biar gampang ditiru.'
			},
			{
				id: 'm4',
				penulis: 'Teguh Alamsyah',
				peran: 'SOBI · Chapter Jawa Barat',
				waktu: menitLalu(58),
				isi: 'Ada yang punya kontak kelompok tani mangrove di pesisir Indramayu? Kami sedang siapkan aksi tanam bulan depan dan ingin melibatkan warga sejak perencanaan, bukan cuma hari-H.',
				reaksi: [{ emoji: '🤝', jumlah: 6 }]
			}
		],
		'tanya-jawab': [
			{
				id: 't1',
				penulis: 'Dimas Prasetyo',
				peran: 'SOBI · Chapter Jawa Tengah',
				waktu: menitLalu(260),
				isi: 'Maaf kalau pertanyaannya mendasar: Poin Kontribusi dan Koin Tukar itu bedanya apa ya?',
				reaksi: [{ emoji: '❓', jumlah: 2 }]
			},
			{
				id: 't2',
				penulis: 'Larasati Utami',
				peran: 'Moderator komunitas',
				waktu: menitLalu(254),
				isi: 'Sama sekali tidak apa-apa, ini pertanyaan paling sering kok. Poin Kontribusi menentukan jenjangmu dan tidak pernah berkurang. Koin Tukar adalah saldo yang bisa dibelanjakan di katalog Pencapaian. Jadi menukar hadiah tidak akan menurunkan jenjang.',
				reaksi: [
					{ emoji: '💡', jumlah: 12 },
					{ emoji: '🙏', jumlah: 4 }
				]
			},
			{
				id: 't3',
				penulis: 'Dimas Prasetyo',
				peran: 'SOBI · Chapter Jawa Tengah',
				waktu: menitLalu(250),
				isi: 'Jelas sekali, terima kasih Kak Laras!'
			},
			{
				id: 't4',
				penulis: 'Zahra Nasution',
				peran: 'Womenpreneur · Kopi Gayo',
				waktu: menitLalu(74),
				isi: 'Kalau naskah Blog saya dikembalikan untuk revisi, apakah poin yang sudah masuk hangus?'
			},
			{
				id: 't5',
				penulis: 'Larasati Utami',
				peran: 'Moderator komunitas',
				waktu: menitLalu(70),
				isi: 'Tidak hangus. Poin pengiriman tetap tercatat; revisi justru menambah peluang naskahnya terbit dan masuk laporan ESG.',
				reaksi: [{ emoji: '👍', jumlah: 5 }]
			}
		]
	});

	/**
	 * @typedef {object} AnggotaDaring
	 * @property {string} nama
	 * @property {string} peran
	 * @property {'aktif'|'sibuk'} keadaan
	 */

	/** @type {readonly AnggotaDaring[]} */
	const ANGGOTA_DARING = Object.freeze([
		{ nama: 'Larasati Utami', peran: 'Moderator komunitas', keadaan: 'aktif' },
		{ nama: 'Tim Corsec PF', peran: 'Corporate Secretary', keadaan: 'aktif' },
		{ nama: 'Bagus Nugroho', peran: 'SOBI · Jawa Timur', keadaan: 'aktif' },
		{ nama: 'Sari Handayani', peran: 'Womenpreneur · Ambon', keadaan: 'aktif' },
		{ nama: 'Nadia Rahmawati', peran: 'SOBI · Jabodetabek', keadaan: 'sibuk' },
		{ nama: 'Panji Wijaya', peran: 'SOBI · Kalimantan', keadaan: 'sibuk' },
		{ nama: 'Fitri Ramadhani', peran: 'Mentor PFpreneur', keadaan: 'sibuk' }
	]);

	/** @type {string} Kanal yang sedang dibuka. */
	let kanalAktif = $state(KANAL[1].id);

	/** @type {string} Isi kotak tulis. */
	let draf = $state('');

	/** @type {HTMLDivElement|null} Wadah aliran pesan; digulirkan ke bawah tiap pesan baru. */
	let wadahPesan = $state(null);

	const kanal = $derived(KANAL.find((item) => item.id === kanalAktif) ?? KANAL[0]);

	const namaSaya = $derived(session.user?.name ?? session.displayName ?? 'Kamu');

	/** Label singkat keanggotaan sendiri, untuk melabeli pesan yang baru dikirim. */
	const peranSaya = $derived.by(() => {
		const awardee = session.awardee;
		if (!awardee) return 'Anggota PFriends';
		return `${awardee.communityDef.akronim} · ${awardee.chapterDef.label}`;
	});

	/**
	 * Pesan kanal aktif, sudah ditandai mana yang boleh digabung dengan pesan di
	 * atasnya. Penggabungan adalah keputusan TATA LETAK: karena itu dihitung di
	 * sini, bukan disimpan pada datanya.
	 */
	const pesanTampil = $derived.by(() => {
		const daftar = percakapan[kanalAktif] ?? [];
		return daftar.map((pesan, indeks) => {
			const sebelum = daftar[indeks - 1];
			const jeda = sebelum ? (pesan.waktu.getTime() - sebelum.waktu.getTime()) / 60_000 : Infinity;
			return {
				...pesan,
				gabung: Boolean(sebelum) && sebelum.penulis === pesan.penulis && jeda < AMBANG_GABUNG_MENIT
			};
		});
	});

	const jumlahPesan = $derived((percakapan[kanalAktif] ?? []).length);

	const dapatKirim = $derived(draf.trim().length > 0);

	/**
	 * Menggulirkan aliran pesan ke baris terbaru.
	 *
	 * Dipanggil sesudah `tick()` supaya simpul pesan yang baru benar-benar sudah
	 * ada di DOM; tanpa itu tinggi wadah masih tinggi lama dan gulirannya meleset
	 * satu pesan.
	 * @returns {Promise<void>}
	 */
	async function gulirKeBawah() {
		await tick();
		if (wadahPesan) wadahPesan.scrollTop = wadahPesan.scrollHeight;
	}

	/**
	 * Penanda guliran awal. Sengaja BUKAN `$state`: ia hanya dibaca di dalam efek
	 * untuk mencegah guliran berjalan dua kali, dan menjadikannya reaktif justru
	 * akan memicu ulang efek yang barusan mengubahnya.
	 * @type {boolean}
	 */
	let sudahDigulir = false;

	// Aliran dibuka pada pesan TERBARU, bukan pada pesan tertua. Percakapan yang
	// terbuka di bagian atas menuntut pembacanya menggulir sendiri sebelum melihat
	// satu pun hal baru: dan tidak ada aplikasi obrolan yang berperilaku begitu.
	$effect(() => {
		if (sudahDigulir || !wadahPesan) return;
		sudahDigulir = true;
		void gulirKeBawah();
	});

	/**
	 * Berpindah kanal, lalu memposisikan aliran pada pesan terbaru.
	 * @param {string} id
	 * @returns {void}
	 */
	function bukaKanal(id) {
		kanalAktif = id;
		void gulirKeBawah();
	}

	/**
	 * Menambahkan pesan baru ke kanal yang sedang dibuka.
	 *
	 * Mockup: pesan hanya masuk ke state lokal. Lihat keputusan 1 pada blok pembuka.
	 * @returns {void}
	 */
	function kirim() {
		const isi = draf.trim();
		if (!isi) return;

		percakapan = {
			...percakapan,
			[kanalAktif]: [
				...(percakapan[kanalAktif] ?? []),
				{
					id: `saya-${Date.now()}`,
					penulis: namaSaya,
					peran: peranSaya,
					waktu: new Date(),
					isi: isi.slice(0, BATAS_KARAKTER),
					saya: true
				}
			]
		};

		draf = '';
		void gulirKeBawah();
	}

	/**
	 * Enter mengirim, Shift+Enter menambah baris.
	 *
	 * Perilaku ini yang sudah dikenal dari aplikasi obrolan mana pun; menuntut
	 * pengguna menekan tombol kirim untuk tiap balasan singkat akan terasa lambat
	 * justru pada kanal yang paling ramai.
	 * @param {KeyboardEvent} event
	 * @returns {void}
	 */
	function tekanTombol(event) {
		if (event.key !== 'Enter' || event.shiftKey) return;
		event.preventDefault();
		kirim();
	}
</script>

<svelte:head>
	<title>Forum Komunitas: PFriends</title>
</svelte:head>

<div class="mb-4">
	<p class="label-micro">Ruang percakapan PFriends</p>
	<h1 class="mt-1 font-sans text-2xl font-bold tracking-[-0.02em] text-heading">Forum</h1>
	<p class="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-600">
		Tempat alumni Sobat Bumi dan pelaku usaha PFpreneur saling menyapa, bertanya, dan berbagi kabar
		: dipisah per kanal supaya percakapan yang kamu cari tidak tenggelam.
	</p>
</div>

<div
	class="grid gap-4 lg:h-[calc(100vh-11rem)] lg:min-h-[540px] lg:grid-cols-[15rem_minmax(0,1fr)] xl:grid-cols-[15rem_minmax(0,1fr)_14rem]"
>
	<!-- ── Kolom kiri · daftar kanal ───────────────────────────────────────────
	     Di bawah lg ia berubah menjadi deret pil mendatar: daftar vertikal berisi
	     lima kanal memakan separuh layar ponsel sebelum satu pesan pun terlihat. -->
	<nav aria-label="Daftar kanal forum" class="min-w-0">
		<div class="hidden h-full flex-col rounded-card border border-ink-100 bg-surface p-2 lg:flex">
			<p class="label-micro px-2 pt-2 pb-3">Kanal komunitas</p>
			<ul class="min-h-0 flex-1 space-y-1 overflow-y-auto">
				{#each KANAL as item (item.id)}
					{@const nyala = item.id === kanalAktif}
					<li>
						<button
							type="button"
							aria-current={nyala ? 'true' : undefined}
							class="flex min-h-11 w-full items-center gap-2 rounded-xl px-2.5 text-sm transition-colors {nyala
								? 'bg-pertamina-navy-tint font-semibold text-pertamina-navy'
								: 'font-medium text-ink-600 hover:bg-ink-50 hover:text-ink-800'}"
							onclick={() => bukaKanal(item.id)}
						>
							<span class="shrink-0 text-base leading-none opacity-70" aria-hidden="true">#</span>
							<span class="min-w-0 flex-1 truncate text-left">{item.nama}</span>
							{#if item.id === 'pengumuman'}
								<Icon path={ICONS.megaphone} size={14} />
							{/if}
						</button>
					</li>
				{/each}
			</ul>

			<div class="mt-2 shrink-0 border-t border-ink-100 px-2.5 pt-3 pb-1">
				<p class="text-[11px] leading-relaxed text-ink-600">
					Kanal baru dibuka atas usulan chapter. Sampaikan di #tanya-jawab bila komunitasmu
					membutuhkan ruangnya sendiri.
				</p>
			</div>
		</div>

		<!-- Pemilih kanal ponsel -->
		<ul class="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:hidden">
			{#each KANAL as item (item.id)}
				{@const nyala = item.id === kanalAktif}
				<li class="shrink-0">
					<button
						type="button"
						aria-current={nyala ? 'true' : undefined}
						class="inline-flex min-h-9 items-center rounded-chip border px-3 text-sm transition-colors {nyala
							? 'border-pertamina-navy bg-pertamina-navy-tint font-semibold text-pertamina-navy'
							: 'border-ink-200 bg-surface font-medium text-ink-600'}"
						onclick={() => bukaKanal(item.id)}
					>
						#{item.nama}
					</button>
				</li>
			{/each}
		</ul>
	</nav>

	<!-- ── Kolom tengah · aliran pesan ────────────────────────────────────────── -->
	<section
		class="flex min-w-0 flex-col overflow-hidden rounded-card border border-ink-100 bg-surface"
		aria-label="Percakapan kanal {kanal.nama}"
	>
		<header class="shrink-0 border-b border-ink-100 px-4 py-3">
			<h2 class="flex items-center gap-1.5 text-base font-bold text-heading">
				<span class="text-ink-400" aria-hidden="true">#</span>
				{kanal.nama}
			</h2>
			<p class="mt-0.5 text-[13px] leading-relaxed text-ink-600">{kanal.topik}</p>
		</header>

		<div
			bind:this={wadahPesan}
			class="max-h-[52vh] min-h-0 flex-1 space-y-1 overflow-y-auto px-4 py-4 lg:max-h-none"
		>
			<div class="mb-4 rounded-xl bg-brand-50 px-3.5 py-3">
				<p class="text-[13px] leading-relaxed text-brand-700">
					<span class="font-semibold">Selamat datang di #{kanal.nama}.</span>
					{kanal.catatan ?? 'Sapa dulu, sisanya mengalir. Tidak ada pertanyaan yang terlalu kecil.'}
				</p>
			</div>

			{#each pesanTampil as pesan (pesan.id)}
				<article class="flex gap-3 rounded-xl px-1.5 py-1 hover:bg-ink-50 {pesan.gabung ? '' : 'mt-3'}">
					<div class="w-9 shrink-0 pt-0.5">
						{#if pesan.gabung}
							<span class="sr-only">{pesan.penulis}</span>
						{:else}
							<Avatar name={pesan.penulis} size="sm" />
						{/if}
					</div>

					<div class="min-w-0 flex-1">
						{#if !pesan.gabung}
							<p class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
								<span class="text-sm font-bold {pesan.saya ? 'text-brand-700' : 'text-heading'}">
									{pesan.penulis}
								</span>
								<span class="text-[11px] text-ink-500">{pesan.peran}</span>
								<span class="numeric text-[11px] font-medium text-ink-500">
									{formatTanggal(pesan.waktu, 'jam')}
								</span>
							</p>
						{/if}

						<p class="mt-0.5 text-sm leading-relaxed break-words text-ink-700">{pesan.isi}</p>

						{#if pesan.reaksi && pesan.reaksi.length > 0}
							<ul class="mt-1.5 flex flex-wrap gap-1.5">
								{#each pesan.reaksi as reaksi (reaksi.emoji)}
									<li
										class="inline-flex items-center gap-1 rounded-chip border border-ink-200 bg-ink-50 px-2 py-0.5 text-[11px] text-ink-700"
									>
										<span aria-hidden="true">{reaksi.emoji}</span>
										<span class="numeric">{reaksi.jumlah}</span>
									</li>
								{/each}
							</ul>
						{/if}
					</div>
				</article>
			{/each}
		</div>

		<!-- Kotak tulis pesan -->
		<div class="shrink-0 border-t border-ink-100 bg-surface p-3">
			<form
				class="flex items-end gap-2 rounded-xl border border-ink-200 bg-canvas p-2 focus-within:border-brand-300"
				onsubmit={(event) => {
					event.preventDefault();
					kirim();
				}}
			>
				<label class="sr-only" for="kotak-pesan">Tulis pesan di kanal {kanal.nama}</label>
				<textarea
					id="kotak-pesan"
					rows="1"
					maxlength={BATAS_KARAKTER}
					bind:value={draf}
					onkeydown={tekanTombol}
					placeholder="Tulis pesan di #{kanal.nama}…"
					class="max-h-32 min-h-11 flex-1 resize-none border-0 bg-transparent px-2 py-2 text-sm leading-relaxed text-ink-800 placeholder:text-ink-500 focus:ring-0"
				></textarea>

				<button
					type="submit"
					disabled={!dapatKirim}
					class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-pertamina-red-ink text-white transition-colors hover:bg-pertamina-red-dark disabled:bg-ink-200 disabled:text-ink-500"
					aria-label="Kirim pesan"
				>
					<Icon path={ICONS.arrowRight} size={18} />
				</button>
			</form>

			<p class="mt-1.5 px-1 text-[11px] text-ink-500">
				Enter mengirim · Shift+Enter membuat baris baru · {frasaHitung(jumlahPesan, 'pesan')} di kanal
				ini
			</p>
		</div>
	</section>

	<!-- ── Kolom kanan · anggota daring ────────────────────────────────────────
	     Disembunyikan di bawah xl. Daftar anggota adalah konteks, bukan isi; di
	     layar sempit ia hanya mendorong percakapan keluar layar. -->
	<aside class="hidden min-w-0 xl:block" aria-label="Anggota yang sedang daring">
		<Card padding="none" class="flex h-full flex-col overflow-hidden">
			<p class="label-micro shrink-0 px-4 pt-4 pb-3">
				Daring · {ANGGOTA_DARING.filter((orang) => orang.keadaan === 'aktif').length}
			</p>

			<ul class="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-3">
				{#each ANGGOTA_DARING as orang (orang.nama)}
					<li class="flex items-center gap-2.5 rounded-xl px-2 py-1.5">
						<span class="relative shrink-0">
							<span
								class="inline-flex h-8 w-8 items-center justify-center rounded-chip bg-brand-100 text-[11px] font-bold text-brand-700"
								aria-hidden="true"
							>
								{inisial(orang.nama)}
							</span>
							<span
								class="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface {orang.keadaan ===
								'aktif'
									? 'bg-success'
									: 'bg-accent-400'}"
								aria-hidden="true"
							></span>
						</span>
						<span class="min-w-0">
							<span class="block truncate text-[13px] leading-tight font-semibold text-ink-800">
								{orang.nama}
							</span>
							<span class="block truncate text-[11px] leading-tight text-ink-500">{orang.peran}</span>
						</span>
					</li>
				{/each}
			</ul>

			<p class="shrink-0 border-t border-ink-100 px-4 py-3 text-[11px] leading-relaxed text-ink-600">
				Ingin menyapa seseorang secara langsung? Kontaknya ada di Jejaring anggota.
			</p>
		</Card>
	</aside>
</div>
