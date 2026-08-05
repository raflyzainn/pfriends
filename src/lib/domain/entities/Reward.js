/**
 * ENTITY — Item Katalog Penukaran Poin.
 *
 * Tanggung jawab: mendefinisikan satu hadiah yang dapat ditukar anggota beserta
 * syarat penukarannya. Mandat langsung Hal 5 pilar 05: *"Peningkatan poin yang
 * dapat ditukar"*.
 *
 * Keputusan yang dijaga entitas ini: penukaran memakai **Koin Tukar**, bukan Poin
 * Kontribusi. Kalau keduanya disatukan, seorang Champion yang menukar hadiah akan
 * turun menjadi Contributor — dan makna "recognition" pada Hal 12 langsung rusak.
 * Karena itu `priceCoins` sengaja dinamai eksplisit, bukan sekadar `price`.
 *
 * Syarat `minTier` diperiksa terhadap tier aktif anggota, sehingga katalog ikut
 * menjadi tangga insentif: hadiah paling bermakna berada di ujung yang menuntut
 * kontribusi paling nyata.
 *
 * KUOTA BULANAN PUNYA DUA FIELD, BUKAN SATU. `redeemedThisMonth` menghitung, dan
 * `quotaMonthKey` menyatakan BULAN MANA yang dihitungnya. Tanpa field kedua, kata
 * "bulanan" pada `monthlyQuota` tidak dapat ditegakkan sama sekali: pencacahnya
 * tidak akan pernah tahu kapan harus kembali ke nol, dan katalog akan tampak habis
 * selamanya sejak bulan pertama yang ramai. Konsekuensinya, seluruh pembacaan kuota
 * menuntut sebuah bulan acuan — `remainingQuotaFor(monthKey)` — dan reset terjadi
 * dengan sendirinya begitu bulan acuannya berganti.
 *
 * @see docs/00-SOURCE-BRIEF.md — Hal 5 pilar 05 Recognition & Gamifikasi
 * @see docs/03-GAMIFICATION-SPEC.md — §2.2 dua mata uang, §10 katalog penukaran
 */

import { REWARD_CATEGORY_META } from '../constants/community.js';
import { TierLevel } from '../constants/tier-table.js';
import { Tier } from '../value-objects/Tier.js';

/** Selisih WIB terhadap UTC, dalam milidetik. Kuota bulanan dibaca menurut waktu Indonesia. */
const OFFSET_WIB_MS = 7 * 60 * 60 * 1000;

/**
 * Kunci bulan `YYYY-MM` menurut zona WIB.
 *
 * Sengaja dihitung dari komponen UTC yang sudah digeser, bukan dari `getMonth()`
 * lokal: peramban anggota di Jayapura dan di Jakarta harus sepakat tentang bulan
 * mana kuota sebuah penukaran dibebankan. Bila tidak, penukaran pada 1 Agustus dini
 * hari akan membebani Juli bagi sebagian anggota dan Agustus bagi sebagian lain —
 * dan kuota "15 per bulan" menjadi angka yang tidak dapat dipertanggungjawabkan.
 *
 * @param {Date|string|number} [pada] Waktu acuan; default waktu sekarang.
 * @returns {string} Mis. `'2026-07'`.
 * @throws {TypeError} bila waktu acuan tidak sah.
 */
export function kunciBulanKuota(pada = new Date()) {
	const waktu = pada instanceof Date ? pada : new Date(pada);
	if (Number.isNaN(waktu.getTime())) {
		throw new TypeError(`Waktu acuan kuota tidak sah: ${String(pada)}`);
	}
	const wib = new Date(waktu.getTime() + OFFSET_WIB_MS);
	return `${wib.getUTCFullYear()}-${String(wib.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * Status ketersediaan item katalog.
 * @readonly
 * @enum {string}
 */
export const RewardStatus = Object.freeze({
	TERSEDIA: 'TERSEDIA',
	HABIS: 'HABIS',
	SEGERA: 'SEGERA'
});

/**
 * Metadata status ketersediaan.
 * @type {Readonly<Record<string, {code: string, label: string, badgeColor: string}>>}
 */
export const REWARD_STATUS_META = Object.freeze({
	[RewardStatus.TERSEDIA]: Object.freeze({
		code: RewardStatus.TERSEDIA,
		label: 'Tersedia',
		badgeColor: 'green'
	}),
	[RewardStatus.HABIS]: Object.freeze({
		code: RewardStatus.HABIS,
		label: 'Kuota habis',
		badgeColor: 'slate'
	}),
	[RewardStatus.SEGERA]: Object.freeze({
		code: RewardStatus.SEGERA,
		label: 'Segera hadir',
		badgeColor: 'amber'
	})
});

/**
 * @typedef {object} RewardInput
 * @property {string} id
 * @property {string} name
 * @property {string} category         Salah satu REWARD_CATEGORY.
 * @property {string} [description]
 * @property {number} priceCoins       Harga dalam Koin Tukar.
 * @property {string} [minTierLevel]   Tier minimum; default NEWCOMER (tanpa syarat).
 * @property {string} [status]         Salah satu RewardStatus; default TERSEDIA.
 * @property {number|null} [monthlyQuota] Kuota bulanan; null berarti tanpa batas.
 * @property {number} [redeemedThisMonth] Jumlah yang sudah ditukar pada `quotaMonthKey`.
 * @property {string} [quotaMonthKey]   Bulan `YYYY-MM` yang dicacah `redeemedThisMonth`.
 * @property {boolean} [requiresApproval] Perlu persetujuan admin sebelum dipenuhi.
 * @property {string} [community]      Dibatasi untuk satu komunitas; kosong berarti terbuka.
 * @property {string} [fulfillmentNote] Cara hadiah diserahkan kepada anggota.
 */

export class Reward {
	/** @type {Readonly<Record<string, any>>} */
	#data;

	/**
	 * @param {RewardInput} input
	 * @throws {TypeError} bila field wajib kosong.
	 * @throws {RangeError} bila enum tidak dikenal atau harga negatif.
	 */
	constructor(input) {
		const {
			id,
			name,
			category,
			description = '',
			priceCoins,
			minTierLevel = TierLevel.NEWCOMER,
			status = RewardStatus.TERSEDIA,
			monthlyQuota = null,
			redeemedThisMonth = 0,
			quotaMonthKey = '',
			requiresApproval = false,
			community = '',
			fulfillmentNote = ''
		} = input ?? {};

		for (const [nama, nilai] of Object.entries({ id, name, category })) {
			if (typeof nilai !== 'string' || nilai.trim() === '') {
				throw new TypeError(`Field "${nama}" wajib berupa string tidak kosong.`);
			}
		}
		if (!Object.hasOwn(REWARD_CATEGORY_META, category)) {
			throw new RangeError(`Kategori penghargaan tidak dikenal: "${category}".`);
		}
		if (!Object.hasOwn(REWARD_STATUS_META, status)) {
			throw new RangeError(`Status penghargaan tidak dikenal: "${status}".`);
		}
		if (!Number.isInteger(priceCoins) || priceCoins < 0) {
			throw new RangeError(
				`Harga Koin Tukar harus bilangan bulat tak negatif, diterima: ${String(priceCoins)}`
			);
		}
		if (monthlyQuota !== null && (!Number.isInteger(monthlyQuota) || monthlyQuota < 0)) {
			throw new RangeError(
				`Kuota bulanan harus null atau bilangan bulat tak negatif, diterima: ${String(monthlyQuota)}`
			);
		}
		if (!Number.isInteger(redeemedThisMonth) || redeemedThisMonth < 0) {
			throw new RangeError(
				`Pencacah penukaran bulan ini harus bilangan bulat tak negatif, diterima: ${String(redeemedThisMonth)}`
			);
		}
		// Melempar RangeError bila level tier tidak dikenal.
		const minTier = Tier.fromLevel(minTierLevel);

		this.#data = Object.freeze({
			id,
			name,
			category,
			description,
			priceCoins,
			minTier,
			status,
			monthlyQuota,
			redeemedThisMonth,
			quotaMonthKey,
			requiresApproval,
			community,
			fulfillmentNote
		});
		Object.freeze(this);
	}

	/** @returns {string} */
	get id() {
		return this.#data.id;
	}

	/** @returns {string} */
	get name() {
		return this.#data.name;
	}

	/** @returns {string} Salah satu REWARD_CATEGORY. */
	get category() {
		return this.#data.category;
	}

	/** @returns {string} */
	get description() {
		return this.#data.description;
	}

	/** @returns {number} Harga dalam Koin Tukar. */
	get priceCoins() {
		return this.#data.priceCoins;
	}

	/** @returns {Tier} Tier minimum yang boleh menukar. */
	get minTier() {
		return this.#data.minTier;
	}

	/** @returns {string} Salah satu RewardStatus. */
	get status() {
		return this.#data.status;
	}

	/** @returns {number|null} */
	get monthlyQuota() {
		return this.#data.monthlyQuota;
	}

	/** @returns {number} Jumlah penukaran tercatat pada bulan `quotaMonthKey`. */
	get redeemedThisMonth() {
		return this.#data.redeemedThisMonth;
	}

	/** @returns {string} Bulan `YYYY-MM` yang dicacah `redeemedThisMonth`; kosong bila belum pernah. */
	get quotaMonthKey() {
		return this.#data.quotaMonthKey;
	}

	/** @returns {boolean} */
	get requiresApproval() {
		return this.#data.requiresApproval;
	}

	/** @returns {string} */
	get community() {
		return this.#data.community;
	}

	/** @returns {string} */
	get fulfillmentNote() {
		return this.#data.fulfillmentNote;
	}

	/** @returns {{code: string, label: string, deskripsi: string, urutan: number, sorotan: boolean}} */
	get categoryMeta() {
		return REWARD_CATEGORY_META[this.#data.category];
	}

	/** @returns {{code: string, label: string, badgeColor: string}} */
	get statusMeta() {
		return REWARD_STATUS_META[this.#data.status];
	}

	/** @returns {boolean} Item ini menukar poin menjadi manfaat bagi orang lain. */
	get isImpactReward() {
		return this.categoryMeta.sorotan;
	}

	/**
	 * Jumlah penukaran yang membebani sebuah bulan.
	 *
	 * Pencacah hanya berlaku bagi bulan yang tercatat pada `quotaMonthKey`. Bulan
	 * lain mulai dari nol — itulah wujud "reset bulanan"-nya, dan ia terjadi tanpa
	 * satu pun pekerjaan terjadwal. Sistem demo tanpa cron tidak dapat mengandalkan
	 * proses malam hari untuk mengosongkan pencacah, dan pencacah yang menunggu
	 * proses yang tidak pernah datang akan menutup katalog selamanya.
	 *
	 * @param {string} monthKey Kunci bulan `YYYY-MM`.
	 * @returns {number}
	 */
	redeemedIn(monthKey) {
		return this.#data.quotaMonthKey === monthKey ? this.#data.redeemedThisMonth : 0;
	}

	/**
	 * Sisa kuota pada sebuah bulan; `null` bila item ini tanpa batas kuota.
	 * @param {string} monthKey Kunci bulan `YYYY-MM`.
	 * @returns {number|null}
	 */
	remainingQuotaFor(monthKey) {
		if (this.#data.monthlyQuota === null) return null;
		return Math.max(0, this.#data.monthlyQuota - this.redeemedIn(monthKey));
	}

	/**
	 * Masih dapat ditukar pada sebuah bulan, dilihat dari status dan kuota.
	 * @param {string} monthKey Kunci bulan `YYYY-MM`.
	 * @returns {boolean}
	 */
	isAvailableFor(monthKey) {
		return this.#data.status === RewardStatus.TERSEDIA && this.remainingQuotaFor(monthKey) !== 0;
	}

	/**
	 * Sisa kuota pada bulan sebuah waktu acuan.
	 * @param {Date|string|number} [pada] Default waktu sekarang.
	 * @returns {number|null}
	 */
	remainingQuotaOn(pada = new Date()) {
		return this.remainingQuotaFor(kunciBulanKuota(pada));
	}

	/**
	 * Ketersediaan pada bulan sebuah waktu acuan.
	 * @param {Date|string|number} [pada] Default waktu sekarang.
	 * @returns {boolean}
	 */
	isAvailableOn(pada = new Date()) {
		return this.isAvailableFor(kunciBulanKuota(pada));
	}

	/** @returns {number|null} Sisa kuota pada bulan yang sedang dicacah; null bila tanpa batas. */
	get remainingQuota() {
		return this.remainingQuotaFor(this.#data.quotaMonthKey);
	}

	/** @returns {boolean} Ketersediaan pada bulan yang sedang dicacah. */
	get isAvailable() {
		return this.isAvailableFor(this.#data.quotaMonthKey);
	}

	/**
	 * Salinan dengan satu penukaran tercatat pada sebuah bulan.
	 *
	 * INILAH satu-satunya jalan tulis ke pencacah kuota, dan ia sengaja berada di
	 * entitas: keputusan "penukaran ke-16 pada kuota 15 ditolak" adalah aturan
	 * bisnis, bukan urusan basis data. Sebelum method ini ada, `redeemedThisMonth`
	 * hanya pernah DIBACA — tidak satu pun baris di seluruh aplikasi menaikkannya —
	 * sehingga kuota bulanan sekadar hiasan pada kartu penghargaan dan anggota dapat
	 * menukar melampaui kuotanya sebanyak yang ia mau.
	 *
	 * Bulan yang berbeda dari `quotaMonthKey` MENGGANTI pencacah menjadi 1, bukan
	 * menambahi — itu titik reset bulanannya.
	 *
	 * @param {string} monthKey Kunci bulan `YYYY-MM` yang dibebani penukaran ini.
	 * @returns {Reward} Instans baru; instans lama tidak berubah.
	 * @throws {RangeError} bila kuota bulan tersebut sudah habis.
	 */
	withRedemptionRecorded(monthKey) {
		const sisa = this.remainingQuotaFor(monthKey);
		if (sisa === 0) {
			throw new RangeError(
				`Kuota bulanan "${this.#data.name}" untuk ${monthKey} sudah habis; penukaran tidak dapat dicatat.`
			);
		}
		return new Reward({
			.../** @type {RewardInput} */ (this.toJSON()),
			redeemedThisMonth: this.redeemedIn(monthKey) + 1,
			quotaMonthKey: monthKey
		});
	}

	/** @returns {boolean} Terbuka untuk semua tier. */
	get isOpenToAllTiers() {
		return this.#data.minTier.level === TierLevel.NEWCOMER;
	}

	/**
	 * Apakah item ini terbuka bagi sebuah komunitas.
	 * @param {string} community Salah satu CommunityType.
	 * @returns {boolean}
	 */
	isOpenTo(community) {
		return this.#data.community === '' || this.#data.community === community;
	}

	/**
	 * Apakah seorang awardee dapat menukar item ini, beserta alasan bila tidak.
	 *
	 * Mengembalikan alasan — bukan sekadar boolean — supaya kartu penghargaan
	 * dapat menjelaskan apa yang kurang. Tombol nonaktif tanpa keterangan adalah
	 * jalan buntu yang membuat awardee berhenti mencoba.
	 *
	 * Bulan acuan wajib ikut diserahkan supaya kuota diperiksa terhadap bulan yang
	 * BENAR-BENAR akan dibebani penukaran, bukan terhadap bulan terakhir yang
	 * kebetulan tersimpan di baris basis data. Keduanya berbeda tepat pada hari
	 * pergantian bulan — hari ketika kesalahan semacam ini paling mahal.
	 *
	 * @param {import('./Awardee.js').Awardee} awardee
	 * @param {string} [monthKey] Kunci bulan `YYYY-MM`; default bulan berjalan WIB.
	 * @returns {{allowed: boolean, reason: string|null}}
	 */
	canBeRedeemedBy(awardee, monthKey = kunciBulanKuota()) {
		// Kuota habis dan status non-TERSEDIA dibedakan dengan sengaja: yang pertama
		// akan terbuka lagi bulan depan, yang kedua belum tentu. Menyatukan keduanya
		// menjadi "sedang tidak tersedia" membuat anggota berhenti menunggu sesuatu
		// yang sebenarnya tinggal beberapa hari lagi.
		if (this.remainingQuotaFor(monthKey) === 0) {
			return { allowed: false, reason: 'Kuota penukaran bulan ini sudah habis. Coba lagi bulan depan.' };
		}
		if (!this.isAvailableFor(monthKey)) {
			return { allowed: false, reason: 'Penghargaan ini sedang tidak tersedia.' };
		}
		if (!this.isOpenTo(awardee.community)) {
			return { allowed: false, reason: 'Penghargaan ini khusus untuk komunitas lain.' };
		}
		if (!awardee.tier.isAtLeast(this.#data.minTier)) {
			return {
				allowed: false,
				reason: `Perlu tier ${this.#data.minTier.label} untuk menukar penghargaan ini.`
			};
		}
		if (awardee.coins < this.#data.priceCoins) {
			const kurang = this.#data.priceCoins - awardee.coins;
			return { allowed: false, reason: `Koin Tukar kurang ${kurang}.` };
		}
		return { allowed: true, reason: null };
	}

	/**
	 * Bentuk yang disimpan ke basis data.
	 * @returns {Record<string, unknown>}
	 */
	toJSON() {
		return {
			id: this.id,
			name: this.name,
			category: this.category,
			description: this.description,
			priceCoins: this.priceCoins,
			minTierLevel: this.minTier.level,
			status: this.status,
			monthlyQuota: this.monthlyQuota,
			redeemedThisMonth: this.redeemedThisMonth,
			quotaMonthKey: this.quotaMonthKey,
			requiresApproval: this.requiresApproval,
			community: this.community,
			fulfillmentNote: this.fulfillmentNote
		};
	}

	/**
	 * Menerima instans apa adanya, atau membungkus objek polos dari repository.
	 * @param {Reward|RewardInput} value
	 * @returns {Reward}
	 */
	static from(value) {
		return value instanceof Reward ? value : new Reward(value);
	}
}
