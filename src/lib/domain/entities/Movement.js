/**
 * ENTITY — Gerakan Bersama.
 *
 * Tanggung jawab: merepresentasikan satu gerakan kolektif pada pilar 03 Hal 5
 * (Movement-Based Program) — aksi lingkungan, edukasi masyarakat, atau
 * pemberdayaan ekonomi.
 *
 * Keputusan arsitektural yang dijaga di sini: gerakan WAJIB membawa tag ESG dan
 * SDG sebelum boleh berjalan, dan tag itu diwariskan ke setiap laporan aksi
 * turunannya. Dengan begitu gerbang ketiga bukti ESG Hal 12 ("ESG/SDG tag")
 * terpenuhi secara struktural — bukan bergantung pada kedisiplinan anggota
 * lapangan mengisi formulir sepulang aksi.
 *
 * @see docs/00-SOURCE-BRIEF.md — Hal 5 pilar 03, Hal 11 aksi LEAD_ACTION 50 pts
 * @see docs/04-ESG-GOVERNANCE.md — §2 pemetaan aktivitas ke tag ESG dan SDG
 */

import { EsgTag } from '../value-objects/EsgTag.js';

/**
 * Kategori gerakan, persis tiga fokus keberlanjutan yang disebut Hal 5 pilar 03.
 * @readonly
 * @enum {string}
 */
export const MovementCategory = Object.freeze({
	AKSI_LINGKUNGAN: 'AKSI_LINGKUNGAN',
	EDUKASI_MASYARAKAT: 'EDUKASI_MASYARAKAT',
	PEMBERDAYAAN_EKONOMI: 'PEMBERDAYAAN_EKONOMI'
});

/**
 * Metadata kategori gerakan untuk kartu dan penyaring.
 * @type {Readonly<Record<string, {code: string, label: string, deskripsi: string, pillar: string}>>}
 */
export const MOVEMENT_CATEGORY_META = Object.freeze({
	[MovementCategory.AKSI_LINGKUNGAN]: Object.freeze({
		code: MovementCategory.AKSI_LINGKUNGAN,
		label: 'Aksi lingkungan',
		deskripsi: 'Kerja lapangan yang memulihkan atau menjaga lingkungan sekitar.',
		pillar: 'E'
	}),
	[MovementCategory.EDUKASI_MASYARAKAT]: Object.freeze({
		code: MovementCategory.EDUKASI_MASYARAKAT,
		label: 'Edukasi masyarakat',
		deskripsi: 'Berbagi pengetahuan kepada warga di luar komunitas Pfriends.',
		pillar: 'S'
	}),
	[MovementCategory.PEMBERDAYAAN_EKONOMI]: Object.freeze({
		code: MovementCategory.PEMBERDAYAAN_EKONOMI,
		label: 'Pemberdayaan ekonomi',
		deskripsi: 'Mendorong pertumbuhan usaha dan kemandirian ekonomi anggota maupun warga.',
		pillar: 'S'
	})
});

/**
 * Status siklus hidup gerakan.
 * @readonly
 * @enum {string}
 */
export const MovementStatus = Object.freeze({
	DIUSULKAN: 'DIUSULKAN',
	BERJALAN: 'BERJALAN',
	SELESAI: 'SELESAI',
	DITOLAK: 'DITOLAK'
});

/**
 * Metadata status gerakan.
 * @type {Readonly<Record<string, {code: string, label: string, badgeColor: string}>>}
 */
export const MOVEMENT_STATUS_META = Object.freeze({
	[MovementStatus.DIUSULKAN]: Object.freeze({
		code: MovementStatus.DIUSULKAN,
		label: 'Menunggu persetujuan',
		badgeColor: 'amber'
	}),
	[MovementStatus.BERJALAN]: Object.freeze({
		code: MovementStatus.BERJALAN,
		label: 'Berjalan',
		badgeColor: 'green'
	}),
	[MovementStatus.SELESAI]: Object.freeze({
		code: MovementStatus.SELESAI,
		label: 'Selesai',
		badgeColor: 'blue'
	}),
	[MovementStatus.DITOLAK]: Object.freeze({
		code: MovementStatus.DITOLAK,
		label: 'Ditolak',
		badgeColor: 'slate'
	})
});

/**
 * @typedef {object} MovementInput
 * @property {string} id
 * @property {string} slug
 * @property {string} title
 * @property {string} category      Salah satu MovementCategory.
 * @property {string} [status]      Salah satu MovementStatus; default DIUSULKAN.
 * @property {string} objective     Tujuan gerakan dalam satu kalimat.
 * @property {string} [description]
 * @property {string} [region]      Wilayah pelaksanaan.
 * @property {string} [leaderId]    Anggota yang memimpin gerakan.
 * @property {string} [leaderName]
 * @property {Date|string} startsAt
 * @property {Date|string} endsAt
 * @property {number} [targetParticipants] Target jumlah peserta.
 * @property {readonly string[]} [participantIds]
 * @property {readonly {pillar: string, sdgGoal: number}[]} [esgTags]
 * @property {readonly string[]} [reportIds]  Laporan aksi lapangan yang terkumpul.
 * @property {{metric: string, value: number, unit: string}|null} [impact] Dampak terukur.
 */

/**
 * Menormalkan tanggal wajib.
 * @param {Date|string} nilai
 * @param {string} namaField
 * @returns {Date}
 */
function keTanggal(nilai, namaField) {
	const tanggal = nilai instanceof Date ? new Date(nilai.getTime()) : new Date(nilai);
	if (Number.isNaN(tanggal.getTime())) {
		throw new TypeError(`Field "${namaField}" harus berupa Date atau string ISO 8601 yang sah.`);
	}
	return tanggal;
}

export class Movement {
	/** @type {Readonly<Record<string, any>>} */
	#data;

	/**
	 * @param {MovementInput} input
	 * @throws {TypeError} bila field wajib kosong.
	 * @throws {RangeError} bila enum tidak dikenal, rentang terbalik, atau gerakan
	 *   berjalan tanpa tag ESG.
	 */
	constructor(input) {
		const {
			id,
			slug,
			title,
			category,
			status = MovementStatus.DIUSULKAN,
			objective,
			description = '',
			region = '',
			leaderId = '',
			leaderName = '',
			startsAt,
			endsAt,
			targetParticipants = 0,
			participantIds = [],
			esgTags = [],
			reportIds = [],
			impact = null
		} = input ?? {};

		for (const [nama, nilai] of Object.entries({ id, slug, title, category, objective })) {
			if (typeof nilai !== 'string' || nilai.trim() === '') {
				throw new TypeError(`Field "${nama}" wajib berupa string tidak kosong.`);
			}
		}
		if (!Object.hasOwn(MOVEMENT_CATEGORY_META, category)) {
			throw new RangeError(`Kategori gerakan tidak dikenal: "${category}".`);
		}
		if (!Object.hasOwn(MOVEMENT_STATUS_META, status)) {
			throw new RangeError(`Status gerakan tidak dikenal: "${status}".`);
		}

		const mulai = keTanggal(startsAt, 'startsAt');
		const selesai = keTanggal(endsAt, 'endsAt');
		if (selesai < mulai) {
			throw new RangeError(`Gerakan "${id}" berakhir sebelum dimulai.`);
		}

		const tags = Object.freeze(esgTags.map((tag) => EsgTag.fromJSON(tag)));
		const sudahDisetujui = status === MovementStatus.BERJALAN || status === MovementStatus.SELESAI;
		if (sudahDisetujui && tags.length === 0) {
			throw new RangeError(
				`Gerakan "${id}" tidak boleh berjalan tanpa tag ESG/SDG — tag diwariskan ke seluruh laporan aksinya.`
			);
		}

		this.#data = Object.freeze({
			id,
			slug,
			title,
			category,
			status,
			objective,
			description,
			region,
			leaderId,
			leaderName,
			startsAt: mulai,
			endsAt: selesai,
			targetParticipants,
			participantIds: Object.freeze([...participantIds]),
			esgTags: tags,
			reportIds: Object.freeze([...reportIds]),
			impact: impact === null ? null : Object.freeze({ ...impact })
		});
		Object.freeze(this);
	}

	/** @returns {string} */
	get id() {
		return this.#data.id;
	}

	/** @returns {string} */
	get slug() {
		return this.#data.slug;
	}

	/** @returns {string} */
	get title() {
		return this.#data.title;
	}

	/** @returns {string} Salah satu MovementCategory. */
	get category() {
		return this.#data.category;
	}

	/** @returns {string} Salah satu MovementStatus. */
	get status() {
		return this.#data.status;
	}

	/** @returns {string} */
	get objective() {
		return this.#data.objective;
	}

	/** @returns {string} */
	get description() {
		return this.#data.description;
	}

	/** @returns {string} */
	get region() {
		return this.#data.region;
	}

	/** @returns {string} */
	get leaderId() {
		return this.#data.leaderId;
	}

	/** @returns {string} */
	get leaderName() {
		return this.#data.leaderName;
	}

	/** @returns {Date} */
	get startsAt() {
		return new Date(this.#data.startsAt.getTime());
	}

	/** @returns {Date} */
	get endsAt() {
		return new Date(this.#data.endsAt.getTime());
	}

	/** @returns {number} */
	get targetParticipants() {
		return this.#data.targetParticipants;
	}

	/** @returns {readonly string[]} */
	get participantIds() {
		return this.#data.participantIds;
	}

	/** @returns {readonly EsgTag[]} */
	get esgTags() {
		return this.#data.esgTags;
	}

	/** @returns {readonly string[]} */
	get reportIds() {
		return this.#data.reportIds;
	}

	/** @returns {{metric: string, value: number, unit: string}|null} */
	get impact() {
		return this.#data.impact;
	}

	/** @returns {{code: string, label: string, deskripsi: string, pillar: string}} */
	get categoryMeta() {
		return MOVEMENT_CATEGORY_META[this.#data.category];
	}

	/** @returns {{code: string, label: string, badgeColor: string}} */
	get statusMeta() {
		return MOVEMENT_STATUS_META[this.#data.status];
	}

	/** @returns {number} */
	get participantCount() {
		return this.#data.participantIds.length;
	}

	/** @returns {number} Jumlah laporan aksi lapangan yang masuk. */
	get reportCount() {
		return this.#data.reportIds.length;
	}

	/**
	 * Progres partisipasi terhadap target, dalam persen, dibatasi di 100.
	 * Dibatasi karena bar progres yang melewati 100% terbaca sebagai bug, bukan
	 * sebagai prestasi.
	 * @returns {number} 0 bila gerakan tidak menetapkan target.
	 */
	get participationPercent() {
		if (this.#data.targetParticipants <= 0) return 0;
		return Math.min(100, Math.round((this.participantCount / this.#data.targetParticipants) * 100));
	}

	/** @returns {boolean} */
	get isRunning() {
		return this.#data.status === MovementStatus.BERJALAN;
	}

	/** @returns {boolean} */
	get isCompleted() {
		return this.#data.status === MovementStatus.SELESAI;
	}

	/** @returns {boolean} Masih menerima peserta baru. */
	get isOpenForJoin() {
		return this.isRunning;
	}

	/** @returns {readonly string[]} Kode pilar ESG unik yang dibawa gerakan ini. */
	get pillars() {
		return Object.freeze([...new Set(this.#data.esgTags.map((tag) => tag.pillar))]);
	}

	/** @returns {readonly number[]} Nomor SDG unik yang dibawa gerakan ini. */
	get sdgGoals() {
		return Object.freeze([...new Set(this.#data.esgTags.map((tag) => tag.sdgGoal))]);
	}

	/**
	 * Apakah seorang anggota sudah bergabung dengan gerakan ini.
	 * @param {string} awardeeId
	 * @returns {boolean}
	 */
	hasJoined(awardeeId) {
		return this.#data.participantIds.includes(awardeeId);
	}

	/**
	 * Apakah seorang anggota memimpin gerakan ini — pemimpinlah yang berhak atas
	 * aksi `LEAD_ACTION` (50 poin, Hal 11).
	 * @param {string} awardeeId
	 * @returns {boolean}
	 */
	isLedBy(awardeeId) {
		return this.#data.leaderId === awardeeId;
	}

	/**
	 * Salinan dengan sebagian field diganti.
	 * @param {Partial<MovementInput>} changes
	 * @returns {Movement}
	 */
	withChanges(changes) {
		return new Movement({ .../** @type {MovementInput} */ (this.toJSON()), ...changes });
	}

	/**
	 * Bentuk yang disimpan ke basis data.
	 * @returns {Record<string, unknown>}
	 */
	toJSON() {
		return {
			id: this.id,
			slug: this.slug,
			title: this.title,
			category: this.category,
			status: this.status,
			objective: this.objective,
			description: this.description,
			region: this.region,
			leaderId: this.leaderId,
			leaderName: this.leaderName,
			startsAt: this.startsAt.toISOString(),
			endsAt: this.endsAt.toISOString(),
			targetParticipants: this.targetParticipants,
			participantIds: [...this.participantIds],
			esgTags: this.esgTags.map((tag) => tag.toJSON()),
			reportIds: [...this.reportIds],
			impact: this.impact === null ? null : { ...this.impact }
		};
	}

	/**
	 * Menerima instans apa adanya, atau membungkus objek polos dari repository.
	 * @param {Movement|MovementInput} value
	 * @returns {Movement}
	 */
	static from(value) {
		return value instanceof Movement ? value : new Movement(value);
	}
}
