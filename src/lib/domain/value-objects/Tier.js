/**
 * VALUE OBJECT: Tier Kontribusi.
 *
 * Tanggung jawab: membungkus satu entri TIER_TABLE menjadi objek yang dapat
 * dibandingkan, dan menyediakan satu jalan resmi dari poin ke tier.
 *
 * Kelas ini sengaja TIDAK menyimpan ambangnya sendiri. Seluruh angkanya dibaca
 * dari `tier-table.js` sehingga tetap ada satu sumber kebenaran; kelas ini hanya
 * menambahkan perilaku (perbandingan, kesetaraan, progres) di atas data itu.
 *
 * Sesuai keputusan K-3 pada kontrak build, penentuan tier murni berdasarkan ambang
 * poin. Syarat kualitatif seperti komposisi kontribusi tidak dievaluasi di sini :
 * itu milik FeatureEligibilityPolicy, dan memisahkannya menjaga jawaban atas
 * pertanyaan "kenapa tier saya segini?" tetap sesederhana satu angka.
 *
 * @see docs/00-SOURCE-BRIEF.md: Hal 12 Scoring Tiers and Feature Threshold
 * @see docs/09-BUILD-CONTRACT.md: K-3
 */

import {
	TIER_TABLE,
	TierLevel,
	tierBerikutnya,
	tierUntukLevel,
	tierUntukPoin
} from '../constants/tier-table.js';
import { Points } from './Points.js';

/**
 * Menormalkan argumen poin yang bisa datang sebagai angka atau instans Points.
 * @param {Points|number} points
 * @returns {number}
 */
function nilaiPoin(points) {
	return points instanceof Points ? points.value : Points.from(points).value;
}

export class Tier {
	/** @type {import('../constants/tier-table.js').TierEntry} */
	#entry;

	/**
	 * Konstruktor menerima entri TIER_TABLE. Untuk pemakaian sehari-hari pakai
	 * `Tier.fromPoints` atau `Tier.fromLevel`: keduanya menjamin entri yang sah.
	 * @param {import('../constants/tier-table.js').TierEntry} entry
	 * @throws {TypeError} bila entri bukan salah satu anggota TIER_TABLE.
	 */
	constructor(entry) {
		if (!TIER_TABLE.includes(entry)) {
			throw new TypeError(
				'Tier hanya boleh dibangun dari entri TIER_TABLE. Gunakan Tier.fromPoints atau Tier.fromLevel.'
			);
		}
		this.#entry = entry;
		Object.freeze(this);
	}

	/** @returns {string} Salah satu TierLevel. */
	get level() {
		return this.#entry.level;
	}

	/** @returns {string} Nama tier persis Hal 12. */
	get label() {
		return this.#entry.label;
	}

	/** @returns {number} Ambang poin tier ini. */
	get threshold() {
		return this.#entry.threshold;
	}

	/** @returns {string} Warna heksadesimal kanonik. */
	get color() {
		return this.#entry.color;
	}

	/** @returns {string} Nama token warna dasar untuk fill dan aksen. */
	get token() {
		return this.#entry.token;
	}

	/** @returns {string} Nama token warna aman untuk teks. */
	get ink() {
		return this.#entry.ink;
	}

	/** @returns {string} Nama token warna latar lembut. */
	get tint() {
		return this.#entry.tint;
	}

	/** @returns {string} Benefit Hal 12 dalam Bahasa Indonesia. */
	get benefit() {
		return this.#entry.benefit;
	}

	/** @returns {string|null} Teks Inggris asli Hal 12; null untuk tier di luar Hal 12. */
	get benefitSumber() {
		return this.#entry.benefitSumber;
	}

	/** @returns {string} Penjelasan satu kalimat untuk UI. */
	get deskripsi() {
		return this.#entry.deskripsi;
	}

	/** @returns {number} Urutan menaik 0..4. */
	get rank() {
		return this.#entry.rank;
	}

	/** @returns {boolean} Apakah ini tier tertinggi. */
	get isTertinggi() {
		return this.#entry.rank === TIER_TABLE.length - 1;
	}

	/**
	 * Apakah tier ini setara atau lebih tinggi dari pembanding. Dipakai untuk gate
	 * benefit dan syarat tier minimum pada katalog penukaran poin.
	 * @param {Tier|string} other Instans Tier atau salah satu TierLevel.
	 * @returns {boolean}
	 */
	isAtLeast(other) {
		const pembanding = other instanceof Tier ? other : Tier.fromLevel(other);
		return this.#entry.rank >= pembanding.rank;
	}

	/**
	 * Tier setingkat di atas tier ini, atau null bila sudah tertinggi.
	 * @returns {Tier|null}
	 */
	next() {
		const entry = TIER_TABLE[this.#entry.rank + 1];
		return entry ? new Tier(entry) : null;
	}

	/**
	 * Perbandingan berbasis nilai.
	 * @param {unknown} other
	 * @returns {boolean}
	 */
	equals(other) {
		return other instanceof Tier && other.level === this.#entry.level;
	}

	/** @returns {string} */
	toString() {
		return this.#entry.label;
	}

	/** @returns {string} Level tier: bentuk yang disimpan ke basis data. */
	toJSON() {
		return this.#entry.level;
	}

	/**
	 * Jalan resmi dari poin ke tier.
	 * @param {Points|number} points
	 * @returns {Tier}
	 */
	static fromPoints(points) {
		return new Tier(tierUntukPoin(nilaiPoin(points)));
	}

	/**
	 * Membangun tier dari kode levelnya, mis. saat memuat data dari basis data.
	 * @param {string} level Salah satu TierLevel.
	 * @returns {Tier}
	 * @throws {RangeError} bila level tidak dikenal.
	 */
	static fromLevel(level) {
		return new Tier(tierUntukLevel(level));
	}

	/**
	 * Tier berikutnya yang belum tercapai oleh sejumlah poin, atau null bila
	 * anggota sudah berada di tier tertinggi.
	 * @param {Points|number} points
	 * @returns {Tier|null}
	 */
	static nextFromPoints(points) {
		const entry = tierBerikutnya(nilaiPoin(points));
		return entry ? new Tier(entry) : null;
	}

	/**
	 * Seluruh tier, urut menaik. Dipakai halaman penghargaan untuk menampilkan
	 * tangga tier lengkap beserta benefitnya.
	 * @returns {readonly Tier[]}
	 */
	static all() {
		return Object.freeze(TIER_TABLE.map((entry) => new Tier(entry)));
	}

	/** @returns {Tier} Tier awal setiap anggota baru. */
	static awal() {
		return Tier.fromLevel(TierLevel.NEWCOMER);
	}
}
