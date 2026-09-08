/**
 * POLICY: Anti-Gaming & Anti-Spam.
 *
 * Tanggung jawab: memutuskan apakah satu aksi berpoin masih layak dihitung, atau
 * sudah melewati batas wajar untuk hari itu.
 *
 * Ini terjemahan teknis dari satu kalimat Hal 11: *"Points should reward
 * meaningful contribution, not spammy activity."* Kalimat itu bukan hiasan: ia
 * kendala desain. Tanpa batas harian, seseorang bisa mencapai tier Champion hanya
 * dengan menekan tombol bagikan ratusan kali dalam semalam, dan benefit Champion
 * (*"mentor / speaker / regional champion invitation"*) menjadi tidak koheren
 * dengan cara ia memperolehnya.
 *
 * Policy, bukan service: kelas ini murni fungsi keputusan tanpa I/O sama sekali.
 * Ia tidak tahu basis data, tidak tahu anggota, dan tidak menghitung apa pun
 * selain membandingkan dua angka yang diberikan pemanggil. Kalau sebuah kelas
 * butuh `await`, ia service: bukan policy.
 *
 * Batas harian TIDAK ditulis di sini melainkan dibaca dari `dailyCap` pada tabel
 * skor, agar seluruh angka gamifikasi tetap berada di satu berkas kanonik.
 *
 * @see docs/00-SOURCE-BRIEF.md: Hal 11 "reward meaningful contribution, not spammy activity"
 * @see docs/03-GAMIFICATION-SPEC.md: §5 Anti-Gaming & Anti-Spam
 */

/**
 * Kode alasan penolakan. Disediakan sebagai kode agar UI dapat memilih perlakuan
 * yang tepat (nada pesan, ikon, tombol lanjutan) tanpa mencocokkan teks bebas
 * yang sewaktu-waktu berubah.
 * @readonly
 * @enum {string}
 */
export const AntiGamingReason = Object.freeze({
	DAILY_CAP: 'DAILY_CAP',
	DUPLICATE: 'DUPLICATE'
});

/**
 * @typedef {object} AntiGamingVerdict
 * @property {boolean} allowed     Apakah aksi boleh memperoleh poin.
 * @property {string|null} reason  Penjelasan Bahasa Indonesia untuk anggota; null bila lolos.
 * @property {string|null} code     Salah satu AntiGamingReason; null bila lolos.
 * @property {number} remaining     Sisa kuota hari ini setelah aksi ini, bila lolos.
 */

/** Keputusan lolos: dipakai berulang, dibuat sekali agar tidak boros alokasi. */
const LOLOS_TANPA_BATAS = Object.freeze({
	allowed: true,
	reason: null,
	code: null,
	remaining: Number.POSITIVE_INFINITY
});

export class AntiGamingPolicy {
	/**
	 * Kelas ini murni statis: seluruh keputusannya hanya bergantung pada argumen.
	 * @throws {TypeError} bila diinstansiasi.
	 */
	constructor() {
		throw new TypeError('AntiGamingPolicy bersifat statis dan tidak perlu diinstansiasi.');
	}

	/**
	 * Memutuskan apakah sebuah aksi masih boleh memperoleh poin hari ini.
	 *
	 * @param {import('../constants/scoring-table.js').ScoringRule} rule Aturan skor aksi.
	 * @param {number} todayCount Jumlah aksi sejenis yang SUDAH dilakukan anggota hari ini.
	 * @returns {AntiGamingVerdict}
	 * @throws {TypeError} bila aturan tidak sah atau cacahan bukan angka.
	 */
	static check(rule, todayCount) {
		if (typeof rule?.dailyCap !== 'number') {
			throw new TypeError('AntiGamingPolicy.check membutuhkan aturan skor yang sah.');
		}
		if (!Number.isFinite(todayCount) || todayCount < 0) {
			throw new TypeError(
				`Jumlah aksi hari ini harus angka tak negatif, diterima: ${String(todayCount)}`
			);
		}

		// dailyCap 0 berarti tanpa batas harian: tidak ada aksi yang memakainya
		// saat ini, tetapi tabel skor mengizinkannya dan kontraknya harus dihormati.
		if (rule.dailyCap === 0) return LOLOS_TANPA_BATAS;

		if (todayCount >= rule.dailyCap) {
			return Object.freeze({
				allowed: false,
				reason: AntiGamingPolicy.#pesanBatasHarian(rule),
				code: AntiGamingReason.DAILY_CAP,
				remaining: 0
			});
		}

		return Object.freeze({
			allowed: true,
			reason: null,
			code: null,
			remaining: rule.dailyCap - todayCount - 1
		});
	}

	/**
	 * Sisa kuota harian sebuah aksi.
	 * Dipakai Pusat Aksi untuk menampilkan "sisa kuota hari ini" sebelum anggota
	 * menekan tombol: mencegah kekecewaan setelah aksi terlanjur dilakukan.
	 *
	 * @param {import('../constants/scoring-table.js').ScoringRule} rule
	 * @param {number} todayCount
	 * @returns {number} `Infinity` bila aksi tidak berbatas harian.
	 */
	static remainingQuota(rule, todayCount) {
		if (rule.dailyCap === 0) return Number.POSITIVE_INFINITY;
		return Math.max(0, rule.dailyCap - todayCount);
	}

	/**
	 * Keputusan penolakan atas klaim ganda terhadap objek yang sama.
	 * Dipisahkan dari `check` karena idempotensi diperiksa terhadap riwayat
	 * seumur hidup, bukan terhadap kuota hari ini.
	 *
	 * @param {import('../constants/scoring-table.js').ScoringRule} rule
	 * @returns {AntiGamingVerdict}
	 */
	static duplicateVerdict(rule) {
		return Object.freeze({
			allowed: false,
			reason: `Aksi "${rule.label}" untuk item ini sudah pernah dihitung sebelumnya.`,
			code: AntiGamingReason.DUPLICATE,
			remaining: 0
		});
	}

	/**
	 * Menyusun pesan batas harian yang jujur dan tidak menghakimi.
	 *
	 * Nada pesan disengaja: menyebut kapan kuota pulih ("besok") dan tetap
	 * mengakui aksinya. Pesan larangan yang buntu membuat anggota berhenti
	 * mencoba: persis kebalikan dari tujuan gamifikasi.
	 *
	 * @param {import('../constants/scoring-table.js').ScoringRule} rule
	 * @returns {string}
	 */
	static #pesanBatasHarian(rule) {
		const satuan = rule.dailyCap === 1 ? 'satu kali' : `${rule.dailyCap} kali`;
		return `Batas harian aksi "${rule.label}" (${satuan} per hari) sudah tercapai. Kuota poin kembali besok.`;
	}
}
