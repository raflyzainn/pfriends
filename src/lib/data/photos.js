/**
 * MANIFEST FOTO — satu-satunya jalan komponen mengetahui foto mana yang ada, seberapa besar,
 * apa teks alternatifnya, dan siapa fotografernya.
 *
 * TIGA KEPUTUSAN YANG TIDAK TERBACA DARI KODE:
 *
 * 1. **Kredit hanya keluar lewat `foto(key).credit`.** `photo-credits.json` adalah MASUKAN bagi
 *    berkas ini, bukan sumber yang dibaca komponen. Tiga jalur kredit yang saling menduplikasi
 *    adalah pelanggaran KP-3 (`docs/11` §5.6), dan pada praktiknya dua di antaranya akan basi.
 *
 * 2. **Kehadiran berkas ditentukan oleh `photo-credits.json`, bukan oleh daftar di bawah.**
 *    `photo-credits.json` ditulis `scripts/assets/fetch-photos.mjs` HANYA setelah unduhan
 *    tervalidasi (magic bytes JPEG + ambang ukuran). Jadi slot yang gagal diunduh tidak pernah
 *    muncul di `PHOTOS`, dan `foto(key)` mengembalikan `null` — komponen jatuh ke blok tipografis
 *    alih-alih merender `<img>` rusak (`docs/12` §3.3(d) butir 4). Ini gerbang statis, dicek saat
 *    build, bukan penanganan galat saat runtime.
 *
 * 3. **`fotoCerita()` TIDAK pernah jatuh ke `cerita-default.jpg`.** `docs/11` §5.5 menyebut berkas
 *    itu "fallback StoryCard", tetapi `docs/12` §3.3(d) butir 4 melarang "satu foto default yang
 *    dipakai bersama seluruh kartu cerita" — dua belas kartu bersampul sama persis terbaca lebih
 *    otomatis daripada dua belas kartu tanpa sampul. Yang menang adalah doc 12 (§8.2). Karena itu
 *    slug yang tidak terpetakan mengembalikan `null`, dan `cerita-default` tetap tersedia lewat
 *    `foto('cerita-default')` bagi pemanggil yang memang meminta gambar netral secara sadar.
 *
 * 4. **Sampul yang membantah ceritanya DILEPAS, bukan diganti foto yang mirip.** Peninjau membuka
 *    dua belas sampul satu per satu dan menemukan enam yang salah negara atau salah subjek: alat
 *    tenun gendong Andes pada cerita tenun Sumba, koperasi pemulung Brasil pada cerita bank sampah
 *    Surabaya, butik Barat pada kelas pencatatan Balikpapan. Seluruh gerbang tetap hijau selama itu,
 *    karena tidak ada gerbang yang bisa melihat isi gambar.
 *
 *    Yang diperbaiki karena itu bukan cuma enam berkasnya, melainkan bentuk petanya. Peta 1:1 yang
 *    LENGKAP memaksa setiap cerita bernama tempat punya foto, dan tuntutan itulah yang menghasilkan
 *    foto "kira-kira mirip" — citra yang masuk akal tetapi salah fakta adalah wujud lain dari
 *    keluhan "webnya terlalu AI". Kini peta boleh bolong: tiga slot diganti foto yang subjeknya
 *    benar-benar cocok, lima slot dilepas sama sekali. `null` bukan kekurangan yang menunggu
 *    ditambal — `null` adalah jawaban yang benar ketika tidak ada foto jujur yang tersedia.
 *
 *    Uji kelayakan tiga pertanyaan sebelum satu ikatan ditambahkan: lihat `static/img/CREDITS.md`.
 *
 * SATU LUBANG YANG BELUM TERTUTUP DAN BUKAN MILIK BERKAS INI: `StoryCard.svelte` merender `<img>`
 * tanpa `<figcaption>`, sehingga `caption` — termasuk penanda "foto stok" — hanya terbaca di
 * halaman detail cerita, tidak di kartu. Selama itu berlaku, satu-satunya pengaman di kartu adalah
 * fotonya sendiri tidak boleh mengklaim apa pun; keputusan 4 di atas menegakkannya. Perbaikan
 * sesungguhnya ada di pemilik `StoryCard`.
 *
 * Seluruh berkas disajikan `adapter-static` dari `static/img/` sebagai `/img/<nama>.jpg`.
 * Dilarang `import` berkas gambar dan dilarang hotlink ke domain luar.
 *
 * @see docs/11-VISUAL-DIRECTION.md — §4 perlakuan foto, §4.4 kapsi & kredit, §4.5 alt, §5 manifest
 * @see docs/12-BUILD-CONTRACT-V2.md — §2.13 kontrak export, §3.3(d) kriteria selesai
 */
// Atribut `with { type: 'json' }` bukan hiasan: tanpanya modul ini hanya dapat dimuat lewat
// Vite, dan skrip verifikasi yang berjalan di Node murni akan gagal dengan galat impor —
// bukan dengan kegagalan uji yang bisa dibaca. Node 22 dan Vite 7 sama-sama mendukungnya.
import credits from './photo-credits.json' with { type: 'json' };

/**
 * Satu foto siap render.
 *
 * @typedef {object} Photo
 * @property {string} src      Jalur publik, selalu diawali `/img/`.
 * @property {string} alt      Teks alternatif Bahasa Indonesia. Tidak pernah diawali
 *                             "Gambar"/"Foto"/"Ilustrasi" — pembaca layar sudah mengumumkannya.
 * @property {string} caption  Kapsi `<figcaption>` baris 1. Selama `isStock` bernilai `true`,
 *                             kapsi WAJIB generik: dilarang menyebut tempat & bulan kegiatan
 *                             Pfriends yang sesungguhnya (`docs/11` §4.4).
 * @property {string} credit   Kapsi baris 2, bentuk `Foto: Unsplash / <nama fotografer>`.
 * @property {number} w        Lebar intrinsik piksel — dipasang ke atribut `width` (anti-CLS).
 * @property {number} h        Tinggi intrinsik piksel — dipasang ke atribut `height`.
 * @property {boolean} isStock `true` selama foto masih stok. Menjadi `false` hanya setelah
 *                             Corporate Secretary mengganti berkasnya dengan dokumentasi asli.
 */

/**
 * Bentuk entri sebelum digabung dengan kredit. Dipisah supaya alt & kapsi — satu-satunya bagian
 * yang ditulis manusia — tidak ikut ditimpa setiap kali skrip unduhan dijalankan ulang.
 *
 * @typedef {object} PhotoSeed
 * @property {string} file     Nama berkas di `static/img/`, sekaligus kunci `photo-credits.json`.
 * @property {string} alt
 * @property {string} caption
 * @property {number} w
 * @property {number} h
 */

/**
 * Sumber alt & kapsi, disusun manual mengikuti tabel §5.1–§5.5 `docs/11`. Ukuran w/h di sini
 * WAJIB sama dengan keluaran `scripts/assets/fetch-photos.mjs`; keduanya sengaja tidak dibaca
 * dari berkas gambar supaya modul ini tetap murni dan dapat dipakai saat prerender.
 * @type {Readonly<Record<string, PhotoSeed>>}
 */
const SEED = Object.freeze({
	// ── Beranda ────────────────────────────────────────────────────────────────
	'hero-komunitas': {
		file: 'hero-komunitas.jpg',
		alt: 'Puluhan orang berkumpul rapat sambil tertawa dalam satu potret bersama seusai kegiatan komunitas',
		caption: 'Pertemuan komunitas — foto stok',
		w: 1800,
		h: 772
	},
	'hero-komunitas-mobile': {
		file: 'hero-komunitas-mobile.jpg',
		alt: 'Kerumunan peserta berdesakan sambil tersenyum ke arah kamera dalam satu pertemuan komunitas',
		caption: 'Pertemuan komunitas — foto stok',
		w: 960,
		h: 1200
	},
	'og-pfriends': {
		file: 'og-pfriends.jpg',
		alt: 'Puluhan orang berkumpul rapat dalam satu potret bersama seusai kegiatan komunitas',
		caption: 'Pertemuan komunitas — foto stok',
		w: 1200,
		h: 630
	},
	'sobi-alumni-kampus': {
		file: 'sobi-alumni-kampus.jpg',
		alt: 'Barisan wisudawan bertoga merah duduk menghadap panggung upacara di lapangan terbuka',
		caption: 'Prosesi wisuda — foto stok',
		w: 960,
		h: 1200
	},
	'womenpreneur-umkm': {
		file: 'womenpreneur-umkm.jpg',
		alt: 'Seorang perempuan berhijab menunggui gerobak minuman miliknya di tepi jalan',
		caption: 'Usaha mikro perempuan — foto stok',
		w: 1080,
		h: 1350
	},
	'event-workshop': {
		file: 'event-workshop.jpg',
		alt: 'Peserta menyimak paparan di layar proyektor dari deretan kursi kelas',
		caption: 'Sesi kelas — foto stok',
		w: 600,
		h: 600
	},
	// T-5: foto lama memperlihatkan relawan berkaus seragam organisasi lain yang
	// terbaca jelas — dan alt-nya menyebut "penanaman" padahal yang terjadi di gambar
	// adalah pemungutan sampah. Keduanya diperbaiki sekaligus.
	'gerakan-mangrove': {
		file: 'gerakan-mangrove.jpg',
		alt: 'Ratusan bibit mangrove muda tertanam berbaris di hamparan lumpur pesisir saat air surut',
		caption: 'Petak penanaman mangrove — foto stok',
		w: 1600,
		h: 686
	},
	'cta-penutup': {
		file: 'cta-penutup.jpg',
		alt: 'Beberapa orang berdiri di halaman terbuka menyaksikan kegiatan yang sedang berlangsung',
		caption: 'Kegiatan luar ruang — foto stok',
		w: 1600,
		h: 686
	},

	// ── /tentang ───────────────────────────────────────────────────────────────
	'tentang-hero': {
		file: 'tentang-hero.jpg',
		alt: 'Peserta pelatihan duduk melingkar di lantai aula mengikuti sesi kelas',
		caption: 'Sesi pelatihan — foto stok',
		w: 1700,
		h: 729
	},
	'tentang-sosialisasi': {
		file: 'tentang-sosialisasi.jpg',
		alt: 'Peserta duduk berbaris di kursi kayu mengikuti sesi sosialisasi',
		caption: 'Sesi sosialisasi — foto stok',
		w: 1100,
		h: 733
	},
	'tentang-amplifikasi': {
		file: 'tentang-amplifikasi.jpg',
		alt: 'Sepasang tangan memegang ponsel sambil menggulir layar',
		caption: 'Aktivitas daring — foto stok',
		w: 1400,
		h: 933
	},

	// ── /komunitas ─────────────────────────────────────────────────────────────
	'komunitas-hero': {
		file: 'komunitas-hero.jpg',
		alt: 'Ratusan orang duduk berdekatan mengikuti satu pertemuan besar di ruang terbuka',
		caption: 'Pertemuan besar — foto stok',
		w: 1800,
		h: 772
	},
	'sobi-mentoring': {
		file: 'sobi-mentoring.jpg',
		alt: 'Peserta duduk berjajar di meja panjang sambil membaca lembar materi',
		caption: 'Sesi pendampingan — foto stok',
		w: 1400,
		h: 933
	},
	'womenpreneur-produk': {
		file: 'womenpreneur-produk.jpg',
		alt: 'Seorang perempuan menunggui dagangan ikan segar yang tertata dalam baskom di lapak tepi jalan',
		caption: 'Lapak pedagang — foto stok',
		w: 1150,
		h: 767
	},
	'chapter-pertemuan': {
		file: 'chapter-pertemuan.jpg',
		alt: 'Sekelompok orang duduk berkumpul di teras kedai kopi sambil berbincang',
		caption: 'Temu komunitas — foto stok',
		w: 1400,
		h: 933
	},

	// ── Sampul cerita ──────────────────────────────────────────────────────────
	// Tujuh, bukan dua belas. Lima slot dihapus pada gelombang revisi karena fotonya
	// membantah ceritanya; lihat keputusan 4 pada blok pembuka berkas ini.
	'cerita-paving-plastik': {
		file: 'cerita-paving-plastik.jpg',
		alt: 'Seorang pekerja berjongkok memasang paving blok satu per satu di atas hamparan pasir',
		caption: 'Pemasangan paving blok — foto stok',
		w: 1200,
		h: 675
	},
	'cerita-mangrove-belawan': {
		file: 'cerita-mangrove-belawan.jpg',
		alt: 'Bibit mangrove muda tumbuh rapat di lahan lumpur pesisir',
		caption: 'Bibit mangrove — foto stok',
		w: 1100,
		h: 619
	},
	'cerita-tenun-sumba': {
		file: 'cerita-tenun-sumba.jpg',
		alt: 'Tiga lembar kain tenun ikat bermotif kuda dan ayam jantan berwarna nila, putih, dan merah bata',
		caption: 'Kain tenun ikat Sumba — foto stok',
		w: 1200,
		h: 675
	},
	'cerita-kopi-gayo': {
		file: 'cerita-kopi-gayo.jpg',
		alt: 'Perempuan petani memetik dan memilah buah kopi di kebun',
		caption: 'Panen kopi — foto stok',
		w: 1100,
		h: 619
	},
	'cerita-sabun-jelantah': {
		file: 'cerita-sabun-jelantah.jpg',
		alt: 'Adonan sabun cair dituang ke dalam cetakan persegi di atas meja kerja',
		caption: 'Pembuatan sabun — foto stok',
		w: 1200,
		h: 675
	},
	'cerita-kelas-energi-palu': {
		file: 'cerita-kelas-energi-palu.jpg',
		alt: 'Siswa berseragam putih duduk di bangku kelas mengikuti pelajaran',
		caption: 'Kelas sekolah menengah — foto stok',
		w: 1200,
		h: 675
	},
	'cerita-bibit-trembesi-cikadu': {
		file: 'cerita-bibit-trembesi-cikadu.jpg',
		alt: 'Deretan bibit pohon dalam polibag tersusun rapi di persemaian',
		caption: 'Persemaian bibit pohon — foto stok',
		w: 1200,
		h: 675
	},

	// ── Cadangan ───────────────────────────────────────────────────────────────
	'cerita-default': {
		file: 'cerita-default.jpg',
		alt: 'Seseorang menulis di buku catatan di atas meja kayu',
		caption: 'Meja kerja — foto stok',
		w: 1200,
		h: 675
	}
});

/**
 * Peta slug cerita seed -> kunci foto. Salah satu nama di sini berarti satu kartu cerita
 * kehilangan sampulnya tanpa satu pun gerbang berubah merah — karena itu slug ditulis lengkap,
 * bukan diturunkan dengan pemotongan awalan.
 *
 * **Tujuh dari dua belas slug TERPUBLIKASI, bukan dua belas.** Lima ikatan sengaja DILEPAS pada
 * gelombang revisi (lihat keputusan 4 di blok pembuka). Kelengkapan bukan tujuan peta ini:
 * ikatan hanya sah bila fotonya lulus uji kelayakan di `static/img/CREDITS.md`. Slug yang tidak
 * ada di sini jatuh ke blok tipografis, dan itu memang hasil yang diinginkan — bukan cacat yang
 * menunggu diperbaiki dengan menambah baris. Jangan melengkapi peta ini tanpa foto yang benar.
 *
 * @type {Readonly<Record<string, string>>}
 */
const STORY_PHOTO_BY_SLUG = Object.freeze({
	'sampah-plastik-menjadi-paving-blok': 'cerita-paving-plastik',
	'mangrove-kembali-di-belawan': 'cerita-mangrove-belawan',
	'tenun-ikat-sumba-naik-kelas': 'cerita-tenun-sumba',
	'kopi-gayo-perempuan-ekspor-pertama': 'cerita-kopi-gayo',
	'sabun-minyak-jelantah-cilincing': 'cerita-sabun-jelantah',
	'kelas-energi-sma-palu': 'cerita-kelas-energi-palu',
	'bibit-trembesi-desa-cikadu': 'cerita-bibit-trembesi-cikadu'
});

/**
 * Menggabungkan seed dengan kredit hasil unduhan. Entri tanpa kredit DIBUANG — itulah cara
 * modul ini melaporkan "berkasnya tidak ada" tanpa menyentuh sistem berkas saat runtime.
 *
 * @returns {Readonly<Record<string, Photo>>}
 */
function bangunPhotos() {
	/** @type {Record<string, Photo>} */
	const hasil = {};
	for (const [key, seed] of Object.entries(SEED)) {
		const kredit = /** @type {Record<string, {fotografer?:string, sumber?:string, isStock?:boolean}>} */ (
			credits
		)[seed.file];
		if (!kredit) continue;
		hasil[key] = Object.freeze({
			src: `/img/${seed.file}`,
			alt: seed.alt,
			caption: seed.caption,
			credit: `Foto: ${kredit.sumber ?? 'Unsplash'} / ${kredit.fotografer ?? 'tanpa nama'}`,
			w: seed.w,
			h: seed.h,
			isStock: kredit.isStock !== false
		});
	}
	return Object.freeze(hasil);
}

/**
 * Seluruh foto yang benar-benar ada di `static/img/`, terkunci.
 * @type {Readonly<Record<string, Photo>>}
 */
export const PHOTOS = bangunPhotos();

/**
 * Mengambil satu foto berdasarkan kuncinya (nama berkas tanpa ekstensi).
 *
 * @param {string} key Kunci manifest, mis. `'hero-komunitas'`.
 * @returns {Photo|null} `null` bila kunci tidak dikenal atau berkasnya tidak pernah terunduh —
 *                       pemanggil WAJIB menyediakan blok tipografis, bukan `<img>` kosong,
 *                       bukan gradien (`docs/12` §3.3(d) butir 4).
 */
export function foto(key) {
	return PHOTOS[key] ?? null;
}

/**
 * Mengambil sampul cerita berdasarkan slug seed.
 *
 * @param {string} slug Slug cerita, mis. `'kopi-gayo-perempuan-ekspor-pertama'`.
 * @returns {Photo|null} `null` untuk cerita yang belum bersampul. Sengaja TIDAK jatuh ke
 *                       `cerita-default` — lihat keputusan 3 pada blok pembuka berkas ini.
 */
export function fotoCerita(slug) {
	const key = STORY_PHOTO_BY_SLUG[slug];
	return key ? foto(key) : null;
}
