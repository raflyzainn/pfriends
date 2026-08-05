/**
 * ENTITY — Lencana Pengakuan.
 *
 * Tanggung jawab: mendefinisikan satu lencana beserta kriteria perolehannya dan
 * tingkat kelangkaannya.
 *
 * Aturan yang tidak boleh dilanggar: **badge tidak pernah memberi Poin
 * Kontribusi.** Ia hanya memberi Koin Tukar dan hak kosmetik. Alasannya menjaga
 * integritas angka Corsec — kalau badge ikut menambah PK, tabel Hal 11 berhenti
 * menjadi satu-satunya sumber poin dan muncul inflasi tersembunyi pada angka yang
 * kelak dilaporkan. Karena itu entitas ini hanya punya `bonusCoins`, dan tidak
 * ada field poin sama sekali.
 *
 * Kriteria wajib deterministik: dapat dihitung ulang dari buku besar kapan saja.
 * Tidak ada penilaian subjektif, sehingga tidak ada anggota yang perlu bertanya
 * "kenapa dia dapat dan saya tidak".
 *
 * @see docs/00-SOURCE-BRIEF.md — Hal 5 pilar 05 Recognition & Gamifikasi
 * @see docs/03-GAMIFICATION-SPEC.md — §6 sistem badge, §6.2 tingkat kelangkaan
 */

/**
 * Tingkat kelangkaan lencana (docs/03 §6.2).
 * @readonly
 * @enum {string}
 */
export const BadgeRarity = Object.freeze({
	UMUM: 'UMUM',
	LANGKA: 'LANGKA',
	EPIK: 'EPIK',
	LEGENDARIS: 'LEGENDARIS'
});

/**
 * Metadata kelangkaan. `bonusCoins` adalah Koin Tukar — bukan Poin Kontribusi.
 * `targetPopulasi` menjadi rambu bagi kurator katalog: badge Legendaris yang
 * dimiliki separuh anggota bukan lagi tanda kehormatan, melainkan basa-basi.
 * @type {Readonly<Record<string, {code: string, label: string, logam: string, bonusCoins: number, targetPopulasi: string, token: string, ink: string, urutan: number}>>}
 */
export const BADGE_RARITY_META = Object.freeze({
	[BadgeRarity.UMUM]: Object.freeze({
		code: BadgeRarity.UMUM,
		label: 'Umum',
		logam: 'Perunggu',
		bonusCoins: 25,
		targetPopulasi: 'Lebih dari 40% anggota aktif',
		token: 'rarity-umum',
		ink: 'rarity-umum-ink',
		urutan: 1
	}),
	[BadgeRarity.LANGKA]: Object.freeze({
		code: BadgeRarity.LANGKA,
		label: 'Langka',
		logam: 'Perak',
		bonusCoins: 75,
		targetPopulasi: '10–40% anggota aktif',
		token: 'rarity-langka',
		ink: 'rarity-langka-ink',
		urutan: 2
	}),
	[BadgeRarity.EPIK]: Object.freeze({
		code: BadgeRarity.EPIK,
		label: 'Epik',
		logam: 'Emas',
		bonusCoins: 200,
		targetPopulasi: '2–10% anggota aktif',
		token: 'rarity-epik',
		ink: 'rarity-epik-ink',
		urutan: 3
	}),
	[BadgeRarity.LEGENDARIS]: Object.freeze({
		code: BadgeRarity.LEGENDARIS,
		label: 'Legendaris',
		logam: 'Platina',
		bonusCoins: 500,
		targetPopulasi: 'Kurang dari 2% anggota aktif',
		token: 'rarity-legendaris',
		ink: 'rarity-legendaris-ink',
		urutan: 4
	})
});

/**
 * Keluarga lencana — mengelompokkan badge menurut jenis kontribusi yang diakui.
 * @readonly
 * @enum {string}
 */
export const BadgeFamily = Object.freeze({
	ONBOARDING: 'ONBOARDING',
	AMPLIFIKASI: 'AMPLIFIKASI',
	KONSISTENSI: 'KONSISTENSI',
	LINGKUNGAN: 'LINGKUNGAN',
	PENGETAHUAN: 'PENGETAHUAN',
	MENTORING: 'MENTORING',
	JURNALISME: 'JURNALISME',
	KEPEMIMPINAN: 'KEPEMIMPINAN',
	EKONOMI: 'EKONOMI',
	KEHORMATAN: 'KEHORMATAN'
});

/**
 * Label Bahasa Indonesia tiap keluarga lencana.
 * @type {Readonly<Record<string, string>>}
 */
export const BADGE_FAMILY_LABEL = Object.freeze({
	[BadgeFamily.ONBOARDING]: 'Langkah Awal',
	[BadgeFamily.AMPLIFIKASI]: 'Amplifikasi',
	[BadgeFamily.KONSISTENSI]: 'Konsistensi',
	[BadgeFamily.LINGKUNGAN]: 'Lingkungan',
	[BadgeFamily.PENGETAHUAN]: 'Pengetahuan',
	[BadgeFamily.MENTORING]: 'Mentoring',
	[BadgeFamily.JURNALISME]: 'Jurnalisme Warga',
	[BadgeFamily.KEPEMIMPINAN]: 'Kepemimpinan',
	[BadgeFamily.EKONOMI]: 'Pertumbuhan Ekonomi',
	[BadgeFamily.KEHORMATAN]: 'Kehormatan'
});

/**
 * @typedef {object} BadgeInput
 * @property {string} code           Kode lencana, mis. 'BDG_JURU_WARTA'.
 * @property {string} name           Nama lencana Bahasa Indonesia.
 * @property {string} family         Salah satu BadgeFamily.
 * @property {string} rarity         Salah satu BadgeRarity.
 * @property {string} criteria       Kriteria perolehan, ditulis agar dapat dibaca anggota.
 * @property {string} [icon]         Nama ikon SVG inline yang dipakai komponen.
 * @property {string} [community]    Khusus satu komunitas; kosong berarti terbuka.
 * @property {boolean} [seasonLimited] Hanya dapat diperoleh dalam musim tertentu.
 * @property {number} [holderCount]   Jumlah anggota yang sudah memilikinya.
 */

export class Badge {
	/** @type {Readonly<Record<string, any>>} */
	#data;

	/**
	 * @param {BadgeInput} input
	 * @throws {TypeError} bila field wajib kosong.
	 * @throws {RangeError} bila keluarga atau kelangkaan tidak dikenal.
	 */
	constructor(input) {
		const {
			code,
			name,
			family,
			rarity,
			criteria,
			icon = 'star',
			community = '',
			seasonLimited = false,
			holderCount = 0
		} = input ?? {};

		for (const [nama, nilai] of Object.entries({ code, name, family, rarity, criteria })) {
			if (typeof nilai !== 'string' || nilai.trim() === '') {
				throw new TypeError(`Field "${nama}" wajib berupa string tidak kosong.`);
			}
		}
		if (!Object.hasOwn(BADGE_FAMILY_LABEL, family)) {
			throw new RangeError(`Keluarga lencana tidak dikenal: "${family}".`);
		}
		if (!Object.hasOwn(BADGE_RARITY_META, rarity)) {
			throw new RangeError(`Tingkat kelangkaan lencana tidak dikenal: "${rarity}".`);
		}

		this.#data = Object.freeze({
			code,
			name,
			family,
			rarity,
			criteria,
			icon,
			community,
			seasonLimited,
			holderCount
		});
		Object.freeze(this);
	}

	/** @returns {string} */
	get code() {
		return this.#data.code;
	}

	/** @returns {string} */
	get name() {
		return this.#data.name;
	}

	/** @returns {string} Salah satu BadgeFamily. */
	get family() {
		return this.#data.family;
	}

	/** @returns {string} Salah satu BadgeRarity. */
	get rarity() {
		return this.#data.rarity;
	}

	/** @returns {string} */
	get criteria() {
		return this.#data.criteria;
	}

	/** @returns {string} */
	get icon() {
		return this.#data.icon;
	}

	/** @returns {string} */
	get community() {
		return this.#data.community;
	}

	/** @returns {boolean} */
	get seasonLimited() {
		return this.#data.seasonLimited;
	}

	/** @returns {number} */
	get holderCount() {
		return this.#data.holderCount;
	}

	/** @returns {string} Label keluarga untuk pengelompokan di halaman penghargaan. */
	get familyLabel() {
		return BADGE_FAMILY_LABEL[this.#data.family];
	}

	/** @returns {{code: string, label: string, logam: string, bonusCoins: number, targetPopulasi: string, token: string, ink: string, urutan: number}} */
	get rarityMeta() {
		return BADGE_RARITY_META[this.#data.rarity];
	}

	/** @returns {number} Bonus Koin Tukar — bukan Poin Kontribusi. */
	get bonusCoins() {
		return this.rarityMeta.bonusCoins;
	}

	/**
	 * Apakah lencana ini terbuka bagi sebuah komunitas.
	 * @param {string} community Salah satu CommunityType.
	 * @returns {boolean}
	 */
	isOpenTo(community) {
		return this.#data.community === '' || this.#data.community === community;
	}

	/**
	 * Apakah seorang awardee sudah memiliki lencana ini.
	 * @param {import('./Awardee.js').Awardee} awardee
	 * @returns {boolean}
	 */
	isUnlockedBy(awardee) {
		return awardee.hasBadge(this.#data.code);
	}

	/**
	 * Bentuk yang disimpan ke basis data.
	 * @returns {Record<string, unknown>}
	 */
	toJSON() {
		return {
			code: this.code,
			name: this.name,
			family: this.family,
			rarity: this.rarity,
			criteria: this.criteria,
			icon: this.icon,
			community: this.community,
			seasonLimited: this.seasonLimited,
			holderCount: this.holderCount
		};
	}

	/**
	 * Menerima instans apa adanya, atau membungkus objek polos dari repository.
	 * @param {Badge|BadgeInput} value
	 * @returns {Badge}
	 */
	static from(value) {
		return value instanceof Badge ? value : new Badge(value);
	}

	/**
	 * Pembanding untuk mengurutkan katalog: kelangkaan menaik, lalu nama.
	 * @param {Badge} a
	 * @param {Badge} b
	 * @returns {number}
	 */
	static byRarity(a, b) {
		const selisih = a.rarityMeta.urutan - b.rarityMeta.urutan;
		return selisih !== 0 ? selisih : a.name.localeCompare(b.name, 'id');
	}
}
