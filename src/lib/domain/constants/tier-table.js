/**
 * TABEL TIER KANONIK: Hal 12 dokumen sumber ("Scoring Tiers and Feature Threshold").
 *
 * Tanggung jawab: satu-satunya tempat ambang tier, benefit, dan warna tier boleh
 * dituliskan. Komponen, store, dan seed WAJIB mengimpor dari sini: tidak ada
 * angka 25/50/100/150 yang boleh muncul sebagai literal di tempat lain.
 *
 * Keputusan yang mengikat (09-BUILD-CONTRACT K-3): tier ditentukan MURNI oleh
 * ambang poin. Syarat kualitatif (komposisi kontribusi) tidak ikut menentukan
 * tier, melainkan menjadi gate fitur publik yang dievaluasi terpisah oleh
 * FeatureEligibilityPolicy. Alasannya praktis: "kenapa saya 50 poin tapi belum
 * Contributor?" adalah pertanyaan yang tidak boleh muncul saat demo ke Corsec.
 *
 * NEWCOMER (ambang 0) tidak ada di Hal 12: Hal 12 hanya mendaftar empat tier
 * berambang. NEWCOMER ditambahkan sebagai keadaan awal agar setiap anggota selalu
 * punya tier yang dapat ditampilkan, dan benefitnya diambil dari Hal 5 pilar 01
 * ("Rules keanggotaan dan manfaat"), bukan dikarang. `benefitSumber` sengaja
 * `null` untuk menandai bahwa tidak ada teks Inggris asli yang menaunginya.
 *
 * @see docs/00-SOURCE-BRIEF.md: Hal 12 "Scoring Tiers and Feature Threshold"
 * @see docs/03-GAMIFICATION-SPEC.md: §3 Tier, Ambang, dan Benefit
 * @see docs/09-BUILD-CONTRACT.md: §2 Angka kanonik, K-3
 */

/**
 * Lima level tier. Kunci dipakai sebagai identitas lintas lapisan (entity,
 * repository, store, komponen).
 * @readonly
 * @enum {string}
 */
export const TierLevel = Object.freeze({
	NEWCOMER: 'NEWCOMER',
	ACTIVE_MEMBER: 'ACTIVE_MEMBER',
	CONTRIBUTOR: 'CONTRIBUTOR',
	FEATURED_CANDIDATE: 'FEATURED_CANDIDATE',
	CHAMPION: 'CHAMPION'
});

/**
 * @typedef {object} TierEntry
 * @property {string} level         Salah satu TierLevel.
 * @property {number} rank          Urutan menaik 0..4: dipakai untuk perbandingan tier.
 * @property {number} threshold     Ambang poin: KANONIK, dari Hal 12.
 * @property {string} label         Nama tier persis Hal 12 (istilah brand, tidak diterjemahkan).
 * @property {string} deskripsi     Penjelasan satu kalimat Bahasa Indonesia untuk UI.
 * @property {string} benefit       Benefit Hal 12 yang diterjemahkan ke Bahasa Indonesia.
 * @property {string|null} benefitSumber Teks Inggris asli Hal 12; null bila tier di luar Hal 12.
 * @property {string} color         Warna heksadesimal kanonik dari render slide Hal 12.
 * @property {string} token         Nama token warna dasar (Tailwind) untuk fill/aksen.
 * @property {string} ink           Nama token warna AMAN untuk teks.
 * @property {string} tint          Nama token warna latar lembut.
 */

/**
 * Tabel tier, urut menaik berdasarkan ambang. Urutan ini adalah kontrak :
 * `tierUntukPoin` dan `tierBerikutnya` mengandalkannya.
 *
 * Nilai `color` diambil persis dari catatan visual slide Hal 12. Nama token
 * `ink`/`tint` merujuk token yang sudah terdefinisi di `src/app.css`; varian
 * polos hanya aman untuk fill, varian `-ink` yang aman untuk teks.
 *
 * @type {readonly TierEntry[]}
 */
export const TIER_TABLE = Object.freeze([
	Object.freeze({
		level: TierLevel.NEWCOMER,
		rank: 0,
		threshold: 0,
		label: 'Newcomer',
		deskripsi: 'Anggota baru yang sudah terdaftar dan sedang mengumpulkan kontribusi pertamanya.',
		benefit: 'Akses penuh kanal komunitas, kalender kegiatan, dan pusat aksi poin',
		benefitSumber: null,
		color: '#CBD5E1',
		token: 'ink-400',
		ink: 'ink-600',
		tint: 'ink-100'
	}),
	Object.freeze({
		level: TierLevel.ACTIVE_MEMBER,
		rank: 1,
		threshold: 25,
		label: 'Active Member',
		deskripsi: 'Anggota yang rutin membaca dan menanggapi kabar komunitas.',
		benefit: 'Berhak disebut dalam ringkasan bulanan komunitas',
		benefitSumber: 'eligible for monthly digest mention',
		color: '#6FBEB2',
		token: 'tier-active',
		ink: 'tier-active-ink',
		tint: 'tier-active-tint'
	}),
	Object.freeze({
		level: TierLevel.CONTRIBUTOR,
		rank: 2,
		threshold: 50,
		label: 'Contributor',
		deskripsi: 'Anggota yang aktif berbagi konten dan ikut menghidupkan diskusi komunitas.',
		benefit: 'Berhak menerima pengakuan komunitas',
		benefitSumber: 'eligible for community recognition',
		color: '#34908B',
		token: 'tier-contributor',
		ink: 'tier-contributor-ink',
		tint: 'tier-contributor-tint'
	}),
	Object.freeze({
		level: TierLevel.FEATURED_CANDIDATE,
		rank: 3,
		threshold: 100,
		label: 'Featured Candidate',
		deskripsi:
			'Anggota yang layak diangkat profilnya: ambang poin untuk gate fitur publik terpenuhi.',
		benefit: 'Berhak ditampilkan di situs web atau media sosial',
		benefitSumber: 'eligible for website or social media feature',
		color: '#1E4B49',
		token: 'tier-featured',
		ink: 'tier-featured-ink',
		tint: 'tier-featured-tint'
	}),
	Object.freeze({
		level: TierLevel.CHAMPION,
		rank: 4,
		threshold: 150,
		label: 'Champion',
		deskripsi: 'Penggerak komunitas yang memimpin aksi dan membimbing anggota lain.',
		benefit: 'Berhak diundang sebagai mentor / narasumber / champion regional',
		benefitSumber: 'eligible for mentor / speaker / regional champion invitation',
		color: '#D9B81F',
		token: 'tier-champion',
		ink: 'tier-champion-ink',
		tint: 'tier-champion-tint'
	})
]);

/**
 * Ambang minimum poin untuk gate fitur publik (Hal 12: "Minimum for public feature").
 * Nilainya sengaja diturunkan dari TIER_TABLE, bukan ditulis ulang, agar tidak
 * mungkin lepas sinkron bila ambang tier berubah.
 * @type {number}
 */
export const AMBANG_FITUR_PUBLIK = TIER_TABLE[3].threshold;

/** @type {ReadonlyMap<string, TierEntry>} */
const ENTRY_BY_LEVEL = new Map(TIER_TABLE.map((entry) => [entry.level, entry]));

/**
 * Memastikan argumen poin layak dihitung. Gagal cepat: poin yang tidak sah
 * tidak boleh diam-diam dianggap 0, karena itu menyembunyikan bug hitung.
 * @param {number} points
 * @returns {void}
 * @throws {TypeError} bila bukan angka berhingga.
 * @throws {RangeError} bila negatif.
 */
function pastikanPoinSah(points) {
	if (typeof points !== 'number' || !Number.isFinite(points)) {
		throw new TypeError(`Poin harus berupa angka berhingga, diterima: ${String(points)}`);
	}
	if (points < 0) {
		throw new RangeError(`Poin tidak boleh negatif, diterima: ${points}`);
	}
}

/**
 * Tier yang sedang dipegang oleh sejumlah poin: entri berambang tertinggi
 * yang masih terpenuhi.
 * @param {number} points
 * @returns {TierEntry}
 */
export function tierUntukPoin(points) {
	pastikanPoinSah(points);
	let hasil = TIER_TABLE[0];
	for (const entry of TIER_TABLE) {
		if (points >= entry.threshold) hasil = entry;
	}
	return hasil;
}

/**
 * Tier berikutnya yang belum tercapai. `null` bila sudah di tier tertinggi :
 * pemanggil wajib menangani kasus ini (kartu progres menampilkan keadaan
 * "sudah di puncak", bukan bar kosong).
 * @param {number} points
 * @returns {TierEntry|null}
 */
export function tierBerikutnya(points) {
	pastikanPoinSah(points);
	return TIER_TABLE.find((entry) => points < entry.threshold) ?? null;
}

/**
 * Entri tier berdasarkan level.
 * @param {string} level Salah satu TierLevel.
 * @returns {TierEntry}
 * @throws {RangeError} bila level tidak dikenal.
 */
export function tierUntukLevel(level) {
	const entry = ENTRY_BY_LEVEL.get(level);
	if (!entry) {
		throw new RangeError(
			`Level tier tidak dikenal: "${level}". Level yang sah: ${[...ENTRY_BY_LEVEL.keys()].join(', ')}`
		);
	}
	return entry;
}
