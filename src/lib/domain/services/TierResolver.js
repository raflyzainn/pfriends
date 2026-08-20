/**
 * SERVICE: Penentu Tier.
 *
 * Tanggung jawab: menerjemahkan sejumlah poin menjadi tier dan progres menuju
 * tier berikutnya.
 *
 * Keputusan yang mengikat (kontrak build K-3): **tier ditentukan MURNI oleh
 * ambang poin** 25/50/100/150 dari Hal 12. Tidak ada syarat kualitatif apa pun
 * yang ikut menentukan tier: tidak komposisi kontribusi, tidak rasio verifikasi,
 * tidak jumlah aksi kelas tertentu. Godaan untuk menambahkannya besar dan
 * argumennya masuk akal, tetapi akibatnya fatal saat demo: seorang anggota dengan
 * 50 poin yang belum menjadi Contributor tidak punya penjelasan yang dapat
 * ditunjuk, dan gamifikasi yang tidak dapat dijelaskan berhenti memotivasi.
 * Penilaian kualitatif ditempatkan di FeatureEligibilityPolicy, tempat dokumen
 * sumber memang meletakkannya.
 *
 * Statis dan tanpa dependensi: penentuan tier hanya butuh satu angka, sehingga
 * tidak ada alasan kelas ini menyentuh repository atau menerima injeksi apa pun.
 *
 * @see docs/00-SOURCE-BRIEF.md: Hal 12 Scoring Tiers and Feature Threshold
 * @see docs/09-BUILD-CONTRACT.md: K-3
 */

import { TIER_TABLE } from '../constants/tier-table.js';
import { Points } from '../value-objects/Points.js';
import { Tier } from '../value-objects/Tier.js';

/**
 * @typedef {object} TierProgress
 * @property {Tier} current       Tier yang sedang dipegang.
 * @property {Tier|null} next     Tier berikutnya; null bila sudah di puncak.
 * @property {number} gained      Poin yang sudah terkumpul di dalam rentang tier berjalan.
 * @property {number} needed      Poin yang masih dibutuhkan untuk naik tier.
 * @property {number} percent     Progres 0..100 menuju tier berikutnya.
 * @property {number} points      Total poin yang dievaluasi.
 * @property {boolean} isTertinggi Sudah berada di tier tertinggi.
 */

/**
 * @typedef {object} TierDistributionRow
 * @property {string} level    Salah satu TierLevel.
 * @property {string} label    Nama tier.
 * @property {number} count    Jumlah anggota pada tier ini.
 * @property {number} percent  Porsi terhadap total anggota, dalam persen.
 * @property {string} color    Warna heksadesimal kanonik tier.
 */

/**
 * Menormalkan argumen poin yang boleh datang sebagai angka atau instans Points.
 * @param {Points|number} points
 * @returns {number}
 */
function nilaiPoin(points) {
	return points instanceof Points ? points.value : Points.from(points).value;
}

export class TierResolver {
	/**
	 * Kelas ini murni statis.
	 * @throws {TypeError} bila diinstansiasi.
	 */
	constructor() {
		throw new TypeError('TierResolver bersifat statis dan tidak perlu diinstansiasi.');
	}

	/**
	 * Tier yang dipegang oleh sejumlah poin.
	 * @param {Points|number} points
	 * @returns {Tier}
	 */
	static resolve(points) {
		return Tier.fromPoints(nilaiPoin(points));
	}

	/**
	 * Progres menuju tier berikutnya.
	 *
	 * `gained` dan `needed` dihitung relatif terhadap RENTANG tier berjalan, bukan
	 * terhadap nol. Anggota dengan 60 poin melihat "10 dari 50 poin menuju
	 * Featured Candidate", bukan "60 dari 100": bar yang selalu dimulai dari
	 * ambang tier saat ini terasa jujur dan tidak pernah terlihat mundur setelah
	 * naik tier.
	 *
	 * @param {Points|number} points
	 * @returns {TierProgress}
	 */
	static progress(points) {
		const total = nilaiPoin(points);
		const current = Tier.fromPoints(total);
		const next = Tier.nextFromPoints(total);

		if (next === null) {
			return Object.freeze({
				current,
				next: null,
				gained: total - current.threshold,
				needed: 0,
				percent: 100,
				points: total,
				isTertinggi: true
			});
		}

		const rentang = next.threshold - current.threshold;
		const gained = total - current.threshold;

		return Object.freeze({
			current,
			next,
			gained,
			needed: next.threshold - total,
			percent: rentang > 0 ? Math.min(100, Math.round((gained / rentang) * 100)) : 0,
			points: total,
			isTertinggi: false
		});
	}

	/**
	 * Sebaran awardee per tier, urut menaik. Dipakai konsol admin untuk melihat
	 * apakah komunitas benar-benar mengerucut: sebaran yang gemuk di tier atas
	 * adalah tanda ambangnya terlalu longgar, bukan tanda komunitas yang hebat.
	 *
	 * @param {readonly {points: number}[]} awardees Awardee yang dihitung.
	 * @returns {TierDistributionRow[]}
	 */
	static distribution(awardees) {
		const total = awardees.length;
		return TIER_TABLE.map((entry) => {
			const count = awardees.filter(
				(awardee) => Tier.fromPoints(awardee.points).level === entry.level
			).length;
			return {
				level: entry.level,
				label: entry.label,
				count,
				percent: total > 0 ? Math.round((count / total) * 100) : 0,
				color: entry.color
			};
		});
	}
}
