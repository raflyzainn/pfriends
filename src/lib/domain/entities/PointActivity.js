/**
 * ENTITY — Entri Buku Besar Poin.
 *
 * Tanggung jawab: merekam satu aksi berpoin secara utuh — apa yang dilakukan,
 * kapan, berapa poin yang dibukukan, dan mengapa poinnya sebesar itu.
 *
 * Ini objek terpenting di sistem. Tier, papan peringkat, badge, KPI amplifikasi
 * Hal 6, dan sebagian bukti ESG semuanya diturunkan dari kumpulan entri ini.
 * Konsekuensinya entri bersifat **append-only secara semantik**: aksi yang
 * ditolak pun tetap tersimpan, karena KPI Hal 6 menghitung JUMLAH AKSI dan bukan
 * jumlah poin. Menghapus entri berarti memalsukan laporan.
 *
 * Invarian yang dijaga: `points <= basePoints` selalu. Pengali dan pemotongan cap
 * hanya boleh mengurangi, tidak pernah menambah — dengan begitu tabel Hal 11
 * tetap menjadi batas atas yang tidak dapat dilampaui mekanisme apa pun.
 *
 * @see docs/00-SOURCE-BRIEF.md — Hal 11 Gamification Scoring Model
 * @see docs/03-GAMIFICATION-SPEC.md — §5.6 state machine entri poin
 * @see docs/05-ARCHITECTURE.md — §4.2 PointActivity
 */

import { aturanSkor } from '../constants/scoring-table.js';
import { Points } from '../value-objects/Points.js';

/**
 * Status siklus hidup entri poin (docs/03 §5.6).
 *
 * Mockup ini memakai empat status dari delapan yang dispesifikasikan. Empat yang
 * dipakai adalah yang benar-benar mengubah apa yang dilihat pengguna; sisanya
 * (`AUTO_CHECK`, `VERIFIED`, `EXPIRED`) adalah keadaan antara pada pipeline
 * verifikasi manusia yang tidak dijalankan di mockup. Menampilkan status yang
 * tidak pernah berpindah hanya menambah kebingungan saat demo.
 * @readonly
 * @enum {string}
 */
export const ActivityStatus = Object.freeze({
	PENDING: 'PENDING',
	AWARDED: 'AWARDED',
	REJECTED: 'REJECTED',
	REVOKED: 'REVOKED'
});

/**
 * Metadata tampilan tiap status entri poin.
 * @type {Readonly<Record<string, {code: string, label: string, deskripsi: string, badgeColor: string, countsPoints: boolean}>>}
 */
export const ACTIVITY_STATUS_META = Object.freeze({
	[ActivityStatus.PENDING]: Object.freeze({
		code: ActivityStatus.PENDING,
		label: 'Menunggu bukti',
		deskripsi: 'Aksi tercatat, poin dibukukan setelah bukti dilampirkan dan diverifikasi.',
		badgeColor: 'amber',
		countsPoints: false
	}),
	[ActivityStatus.AWARDED]: Object.freeze({
		code: ActivityStatus.AWARDED,
		label: 'Diberikan',
		deskripsi: 'Poin sudah dibukukan ke saldo kontribusi.',
		badgeColor: 'green',
		countsPoints: true
	}),
	[ActivityStatus.REJECTED]: Object.freeze({
		code: ActivityStatus.REJECTED,
		label: 'Ditolak',
		deskripsi: 'Aksi tidak memenuhi syarat. Tetap tersimpan sebagai jejak audit.',
		badgeColor: 'red',
		countsPoints: false
	}),
	[ActivityStatus.REVOKED]: Object.freeze({
		code: ActivityStatus.REVOKED,
		label: 'Ditarik',
		deskripsi: 'Poin ditarik kembali setelah audit menemukan bukti tidak sah.',
		badgeColor: 'slate',
		countsPoints: false
	})
});

/**
 * Alasan sebuah entri tidak memperoleh poin penuh. Disimpan sebagai kode agar UI
 * dapat menampilkan pesan yang tepat tanpa mencocokkan teks bebas.
 * @readonly
 * @enum {string}
 */
export const CapReason = Object.freeze({
	DAILY_CAP: 'DAILY_CAP',
	NEEDS_EVIDENCE: 'NEEDS_EVIDENCE',
	DUPLICATE: 'DUPLICATE'
});

/**
 * @typedef {object} PointActivityInput
 * @property {string} id
 * @property {string} awardeeId       Awardee pemilik entri buku besar ini.
 * @property {string} activityType   Salah satu ActivityType.
 * @property {number} [points]       Poin yang dibukukan; default poin dasar aturan.
 * @property {string} [status]       Salah satu ActivityStatus; default AWARDED.
 * @property {string} [idempotencyKey] Kunci unik anti klaim ganda.
 * @property {string|null} [refId]   Objek yang dirujuk aksi ini (broadcastId, eventId, dst).
 * @property {readonly string[]} [evidence] Rujukan bukti yang dilampirkan.
 * @property {string|null} [capReason]      Salah satu CapReason bila poin tidak penuh.
 * @property {string|null} [note]           Catatan singkat untuk riwayat anggota.
 * @property {Date|string} occurredAt
 */

/**
 * Menormalkan tanggal yang boleh datang sebagai Date maupun string ISO 8601.
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

export class PointActivity {
	/** @type {Readonly<Record<string, any>>} */
	#data;

	/**
	 * @param {PointActivityInput} input
	 * @throws {TypeError} bila field wajib kosong.
	 * @throws {RangeError} bila status/jenis aksi tidak dikenal atau invarian poin dilanggar.
	 */
	constructor(input) {
		const {
			id,
			awardeeId,
			activityType,
			points,
			status = ActivityStatus.AWARDED,
			idempotencyKey,
			refId = null,
			evidence = [],
			capReason = null,
			note = null,
			occurredAt
		} = input ?? {};

		for (const [nama, nilai] of Object.entries({ id, awardeeId, activityType })) {
			if (typeof nilai !== 'string' || nilai.trim() === '') {
				throw new TypeError(`Field "${nama}" wajib berupa string tidak kosong.`);
			}
		}
		if (!Object.hasOwn(ACTIVITY_STATUS_META, status)) {
			throw new RangeError(`Status entri poin tidak dikenal: "${status}".`);
		}
		if (capReason !== null && !Object.hasOwn(CapReason, capReason)) {
			throw new RangeError(`Alasan pemotongan poin tidak dikenal: "${capReason}".`);
		}

		// Melempar RangeError bila jenis aksi tidak dikenal — poin dasar wajib kanonik.
		const rule = aturanSkor(activityType);
		const base = new Points(rule.points);
		const awarded = new Points(points === undefined ? rule.points : points);
		if (awarded.value > base.value) {
			throw new RangeError(
				`Poin dibukukan (${awarded.value}) melebihi poin dasar Hal 11 (${base.value}) untuk aksi ${activityType}.`
			);
		}
		if (!ACTIVITY_STATUS_META[status].countsPoints && awarded.value > 0) {
			throw new RangeError(
				`Entri berstatus ${status} tidak boleh membukukan poin, diterima: ${awarded.value}.`
			);
		}

		this.#data = Object.freeze({
			id,
			awardeeId,
			activityType,
			basePoints: base,
			points: awarded,
			status,
			idempotencyKey: idempotencyKey ?? `${awardeeId}:${activityType}:${refId ?? id}`,
			refId,
			evidence: Object.freeze([...evidence]),
			capReason,
			note,
			occurredAt: keTanggal(occurredAt, 'occurredAt')
		});
		Object.freeze(this);
	}

	/** @returns {string} */
	get id() {
		return this.#data.id;
	}

	/** @returns {string} */
	get awardeeId() {
		return this.#data.awardeeId;
	}

	/** @returns {string} Salah satu ActivityType. */
	get activityType() {
		return this.#data.activityType;
	}

	/** @returns {number} Poin yang benar-benar dibukukan. */
	get points() {
		return this.#data.points.value;
	}

	/** @returns {number} Poin dasar Hal 11 untuk jenis aksi ini. */
	get basePoints() {
		return this.#data.basePoints.value;
	}

	/** @returns {string} Salah satu ActivityStatus. */
	get status() {
		return this.#data.status;
	}

	/** @returns {string} */
	get idempotencyKey() {
		return this.#data.idempotencyKey;
	}

	/** @returns {string|null} */
	get refId() {
		return this.#data.refId;
	}

	/** @returns {readonly string[]} */
	get evidence() {
		return this.#data.evidence;
	}

	/** @returns {string|null} Salah satu CapReason. */
	get capReason() {
		return this.#data.capReason;
	}

	/** @returns {string|null} */
	get note() {
		return this.#data.note;
	}

	/** @returns {Date} */
	get occurredAt() {
		return new Date(this.#data.occurredAt.getTime());
	}

	/** @returns {import('../constants/scoring-table.js').ScoringRule} */
	get rule() {
		return aturanSkor(this.#data.activityType);
	}

	/** @returns {string} Label aksi Bahasa Indonesia untuk riwayat poin. */
	get label() {
		return this.rule.label;
	}

	/** @returns {string} Kelas verifikasi aksi: A, B, C, atau D. */
	get actionClass() {
		return this.rule.actionClass;
	}

	/** @returns {string} Pilar aktivitas Hal 5 yang diwakili aksi ini. */
	get pillar() {
		return this.rule.pillar;
	}

	/** @returns {{code: string, label: string, deskripsi: string, badgeColor: string, countsPoints: boolean}} */
	get statusMeta() {
		return ACTIVITY_STATUS_META[this.#data.status];
	}

	/** @returns {boolean} Apakah poin entri ini sudah dibukukan. */
	get isAwarded() {
		return this.#data.status === ActivityStatus.AWARDED;
	}

	/** @returns {boolean} Apakah entri masih menunggu kelengkapan bukti. */
	get isPending() {
		return this.#data.status === ActivityStatus.PENDING;
	}

	/**
	 * Apakah entri ini dihitung sebagai aksi pada KPI Hal 6.
	 *
	 * Entri berpoin nol karena cap TETAP dihitung (docs/03 §5.5): KPI mengukur
	 * apakah anggota melakukan aksinya, bukan apakah ia mendapat poin. Hanya
	 * entri yang ditolak dan ditarik yang tidak dihitung, sebab keduanya berarti
	 * aksinya memang tidak sah.
	 * @returns {boolean}
	 */
	get countsForKpi() {
		return this.#data.status === ActivityStatus.AWARDED || this.#data.status === ActivityStatus.PENDING;
	}

	/**
	 * Apakah entri ini memakai jatah kuota harian. Entri yang ditolak tidak
	 * memakan kuota — menolak aksi lalu tetap membebankan kuotanya adalah hukuman
	 * ganda yang tidak dijelaskan di mana pun kepada anggota.
	 * @returns {boolean}
	 */
	get consumesQuota() {
		return this.#data.status !== ActivityStatus.REJECTED;
	}

	/**
	 * Kunci hari kalender, dipakai untuk mengelompokkan riwayat dan menghitung
	 * kuota harian. Memakai komponen tanggal waktu lokal, bukan UTC, agar batas
	 * hari sesuai zona waktu anggota (WIB) dan bukan bergeser tengah malam.
	 * @returns {string} mis. '2026-07-20'.
	 */
	get dayKey() {
		const d = this.#data.occurredAt;
		const bulan = String(d.getMonth() + 1).padStart(2, '0');
		const tanggal = String(d.getDate()).padStart(2, '0');
		return `${d.getFullYear()}-${bulan}-${tanggal}`;
	}

	/** @returns {string} Kunci bulan kalender, mis. '2026-07'. */
	get monthKey() {
		return this.dayKey.slice(0, 7);
	}

	/**
	 * Apakah entri terjadi pada hari kalender yang sama dengan waktu acuan.
	 * @param {Date} pada
	 * @returns {boolean}
	 */
	occurredOnSameDay(pada) {
		const d = this.#data.occurredAt;
		return (
			d.getFullYear() === pada.getFullYear() &&
			d.getMonth() === pada.getMonth() &&
			d.getDate() === pada.getDate()
		);
	}

	/**
	 * Bentuk yang disimpan ke basis data.
	 * @returns {Record<string, unknown>}
	 */
	toJSON() {
		return {
			id: this.id,
			awardeeId: this.awardeeId,
			activityType: this.activityType,
			points: this.points,
			status: this.status,
			idempotencyKey: this.idempotencyKey,
			refId: this.refId,
			evidence: [...this.evidence],
			capReason: this.capReason,
			note: this.note,
			occurredAt: this.occurredAt.toISOString()
		};
	}

	/**
	 * Menerima instans apa adanya, atau membungkus objek polos dari repository.
	 * @param {PointActivity|PointActivityInput} value
	 * @returns {PointActivity}
	 */
	static from(value) {
		return value instanceof PointActivity ? value : new PointActivity(value);
	}

	/**
	 * Menjumlahkan poin dari sederet entri, hanya yang berstatus AWARDED.
	 * @param {readonly (PointActivity|PointActivityInput)[]} entries
	 * @returns {number}
	 */
	static sumAwarded(entries) {
		return entries
			.map((entry) => PointActivity.from(entry))
			.filter((entry) => entry.isAwarded)
			.reduce((total, entry) => total + entry.points, 0);
	}
}
