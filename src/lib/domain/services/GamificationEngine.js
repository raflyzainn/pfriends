/**
 * SERVICE: Mesin Gamifikasi.
 *
 * Tanggung jawab: menjalankan pemberian poin dari ujung ke ujung dalam urutan
 * yang benar, dan menjadi satu-satunya jalan masuk poin ke sistem.
 *
 * Urutan langkahnya sendiri adalah pengetahuan bisnis: ambil aturan kanonik →
 * hitung pemakaian kuota hari ini → tanya policy anti-gaming → periksa
 * kelengkapan bukti → bukukan. Kalau urutan itu tersebar di beberapa pemanggil,
 * hasilnya pasti berbeda antar halaman dan tidak ada yang bisa menjelaskan
 * mengapa. Karena itu tidak ada komponen maupun store yang boleh membuat
 * `PointActivity` sendiri.
 *
 * Dependency Inversion: repository disuntik lewat konstruktor. Kelas ini tidak
 * pernah mengimpor Dexie dan tidak tahu data disimpan di mana: yang ia tahu
 * hanyalah kontrak `Repository`. Itulah yang membuat mesin ini dapat diuji dengan
 * repository in-memory dan kelak disambungkan ke API nyata tanpa satu baris pun
 * berubah di sini.
 *
 * @see docs/00-SOURCE-BRIEF.md: Hal 11 Gamification Scoring Model
 * @see docs/03-GAMIFICATION-SPEC.md: §5.7 pipeline pemberian poin
 * @see docs/09-BUILD-CONTRACT.md: §5 kontrak export
 */

import { aturanSkor, SCORING_TABLE } from '../constants/scoring-table.js';
import { ActivityStatus, CapReason, PointActivity } from '../entities/PointActivity.js';
import { AntiGamingPolicy } from '../policies/AntiGamingPolicy.js';

/**
 * @typedef {object} AwardOptions
 * @property {readonly string[]} [evidence]   Rujukan bukti yang dilampirkan awardee.
 * @property {string|null} [refId]            Objek yang dirujuk aksi (broadcastId, eventId, dst).
 * @property {Date} [occurredAt]              Waktu aksi; default waktu sekarang.
 * @property {string|null} [note]             Catatan singkat untuk riwayat poin.
 */

/**
 * @typedef {object} AwardResult
 * @property {boolean} accepted   Aksi tercatat di buku besar.
 * @property {number} points      Poin yang benar-benar dibukukan.
 * @property {string|null} reason Penjelasan Bahasa Indonesia; null bila poin penuh diberikan.
 * @property {import('../entities/PointActivity.js').PointActivity|null} activity
 */

/**
 * @typedef {object} DailyUsageRow
 * @property {string} type       Salah satu ActivityType.
 * @property {string} label      Label aksi Bahasa Indonesia.
 * @property {number} points     Nilai poin aksi.
 * @property {string} actionClass
 * @property {number} used       Jumlah aksi yang sudah dipakai hari ini.
 * @property {number} cap        Batas harian aksi.
 * @property {number} remaining  Sisa kuota hari ini.
 * @property {boolean} exhausted Kuota hari ini sudah habis.
 * @property {boolean} needsEvidence
 */

export class GamificationEngine {
	/** @type {import('../repositories/Repository.js').Repository} */
	#activityRepo;
	/** @type {typeof AntiGamingPolicy} */
	#antiGamingPolicy;
	/** @type {() => Date} */
	#clock;
	/** @type {() => string} */
	#nextId;

	/**
	 * @param {object} deps
	 * @param {import('../repositories/Repository.js').Repository} deps.activityRepo Buku besar poin.
	 * @param {typeof AntiGamingPolicy} [deps.antiGamingPolicy] Policy penjaga kuota; default AntiGamingPolicy.
	 * @param {() => Date} [deps.clock] Sumber waktu; disuntik agar hasil dapat diuji secara deterministik.
	 * @param {() => string} [deps.idGenerator] Pembangkit id entri.
	 * @throws {TypeError} bila repository tidak diberikan.
	 */
	constructor({ activityRepo, antiGamingPolicy = AntiGamingPolicy, clock, idGenerator } = {}) {
		if (!activityRepo) {
			throw new TypeError('GamificationEngine membutuhkan activityRepo.');
		}
		this.#activityRepo = activityRepo;
		this.#antiGamingPolicy = antiGamingPolicy;
		this.#clock = clock ?? (() => new Date());
		this.#nextId = idGenerator ?? GamificationEngine.#defaultIdGenerator();
	}

	/**
	 * Memberikan poin atas sebuah aksi awardee.
	 *
	 * Alur keputusan:
	 *   1. Ambil aturan kanonik dari tabel Hal 11: jenis aksi tak dikenal gagal cepat.
	 *   2. Hitung berapa kali aksi sejenis sudah dilakukan awardee hari ini.
	 *   3. Tanyakan ke AntiGamingPolicy apakah masih dalam kuota.
	 *   4. Bila ditolak, kembalikan hasil tanpa membukukan poin.
	 *   5. Bila aksi menuntut bukti dan buktinya kosong, entri dicatat berstatus
	 *      PENDING: aksinya diakui, poinnya menunggu verifikasi.
	 *   6. Bila lolos, entri dibukukan berstatus AWARDED dengan poin penuh.
	 *
	 * Perhatikan langkah 5: aksinya tetap tercatat dan `accepted` tetap `true`.
	 * KPI Hal 6 menghitung jumlah aksi, bukan jumlah poin: menolak aksi yang
	 * sah hanya karena buktinya menyusul akan merusak pelaporan KPI sekaligus
	 * memberi kesan kepada awardee bahwa kontribusinya hilang.
	 *
	 * @param {string} awardeeId
	 * @param {string} activityType Salah satu ActivityType.
	 * @param {AwardOptions} [opts]
	 * @returns {Promise<AwardResult>}
	 * @throws {RangeError} bila jenis aksi tidak dikenal.
	 */
	async award(awardeeId, activityType, opts = {}) {
		const rule = aturanSkor(activityType);
		const occurredAt = opts.occurredAt ?? this.#clock();
		const evidence = opts.evidence ?? [];

		const todayCount = await this.#countToday(awardeeId, activityType, occurredAt);
		const verdict = this.#antiGamingPolicy.check(rule, todayCount);

		if (!verdict.allowed) {
			return Object.freeze({
				accepted: false,
				points: 0,
				reason: verdict.reason,
				activity: null
			});
		}

		const menungguBukti = rule.needsEvidence && evidence.length === 0;
		const activity = new PointActivity({
			id: this.#nextId(),
			awardeeId,
			activityType,
			points: menungguBukti ? 0 : rule.points,
			status: menungguBukti ? ActivityStatus.PENDING : ActivityStatus.AWARDED,
			idempotencyKey: this.#idempotencyKey(awardeeId, activityType, opts.refId, occurredAt),
			refId: opts.refId ?? null,
			evidence,
			capReason: menungguBukti ? CapReason.NEEDS_EVIDENCE : null,
			note: opts.note ?? null,
			occurredAt
		});

		await this.#activityRepo.save(activity);

		return Object.freeze({
			accepted: true,
			points: activity.points,
			reason: menungguBukti ? GamificationEngine.#pesanMenungguBukti(rule) : null,
			activity
		});
	}

	/**
	 * Total Poin Kontribusi seorang awardee, dihitung ulang dari buku besar.
	 *
	 * Sengaja dihitung dari entri, bukan dibaca dari field ringkasan di `Awardee`.
	 * Angka turunan yang disimpan terpisah cepat atau lambat akan menyimpang dari
	 * sumbernya, dan saat itu terjadi tidak ada cara memutuskan mana yang benar.
	 *
	 * @param {string} awardeeId
	 * @returns {Promise<number>}
	 */
	async totalPoints(awardeeId) {
		const entries = await this.ledger(awardeeId);
		return PointActivity.sumAwarded(entries);
	}

	/**
	 * Riwayat poin seorang awardee, terbaru lebih dulu.
	 * @param {string} awardeeId
	 * @returns {Promise<import('../entities/PointActivity.js').PointActivity[]>}
	 */
	async ledger(awardeeId) {
		const rows = await this.#activityRepo.query({ awardeeId });
		return rows
			.map((row) => PointActivity.from(row))
			.filter((entry) => entry.awardeeId === awardeeId)
			.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
	}

	/**
	 * Potret pemakaian kuota harian untuk seluruh jenis aksi.
	 * Dipakai Pusat Aksi agar awardee melihat sisa kuota SEBELUM menekan tombol.
	 *
	 * @param {string} awardeeId
	 * @param {Date} [pada] Hari acuan; default hari ini.
	 * @returns {Promise<DailyUsageRow[]>}
	 */
	async dailyUsage(awardeeId, pada = this.#clock()) {
		const entries = await this.ledger(awardeeId);
		const hariIni = entries.filter(
			(entry) => entry.consumesQuota && entry.occurredOnSameDay(pada)
		);

		return SCORING_TABLE.map((rule) => {
			const used = hariIni.filter((entry) => entry.activityType === rule.type).length;
			const remaining = this.#antiGamingPolicy.remainingQuota(rule, used);
			return {
				type: rule.type,
				label: rule.label,
				points: rule.points,
				actionClass: rule.actionClass,
				used,
				cap: rule.dailyCap,
				remaining,
				exhausted: remaining === 0,
				needsEvidence: rule.needsEvidence
			};
		});
	}

	/**
	 * Pratinjau hasil aksi tanpa menulis apa pun. Dipakai UI untuk menonaktifkan
	 * tombol dan menjelaskan alasannya lebih dulu.
	 *
	 * @param {string} awardeeId
	 * @param {string} activityType
	 * @param {Date} [pada]
	 * @returns {Promise<{allowed: boolean, points: number, reason: string|null, remaining: number}>}
	 */
	async preview(awardeeId, activityType, pada = this.#clock()) {
		const rule = aturanSkor(activityType);
		const todayCount = await this.#countToday(awardeeId, activityType, pada);
		const verdict = this.#antiGamingPolicy.check(rule, todayCount);
		return {
			allowed: verdict.allowed,
			points: verdict.allowed ? rule.points : 0,
			reason: verdict.reason,
			remaining: this.#antiGamingPolicy.remainingQuota(rule, todayCount)
		};
	}

	/**
	 * Berapa kali sebuah aksi sudah dilakukan awardee pada hari kalender tertentu.
	 * Entri yang ditolak tidak ikut dihitung: menolak aksi lalu tetap membebankan
	 * kuotanya adalah hukuman ganda yang tidak pernah dijelaskan kepada awardee.
	 *
	 * @param {string} awardeeId
	 * @param {string} activityType
	 * @param {Date} pada
	 * @returns {Promise<number>}
	 */
	async #countToday(awardeeId, activityType, pada) {
		const entries = await this.ledger(awardeeId);
		return entries.filter(
			(entry) =>
				entry.activityType === activityType &&
				entry.consumesQuota &&
				entry.occurredOnSameDay(pada)
		).length;
	}

	/**
	 * Kunci idempotensi. Aksi yang merujuk objek tertentu (kabar, kegiatan,
	 * gerakan) memakai id objek itu sehingga klaim ganda atas objek yang sama
	 * dapat ditolak lapisan penyimpanan lewat indeks unik.
	 *
	 * @param {string} awardeeId
	 * @param {string} activityType
	 * @param {string|null|undefined} refId
	 * @param {Date} occurredAt
	 * @returns {string}
	 */
	#idempotencyKey(awardeeId, activityType, refId, occurredAt) {
		const penciri = refId ?? occurredAt.toISOString();
		return `${awardeeId}:${activityType}:${penciri}`;
	}

	/**
	 * Pesan untuk aksi yang menunggu bukti. Menyebut apa yang kurang dan berapa
	 * poin yang menanti, supaya menunggu terasa sebagai langkah berikutnya dan
	 * bukan sebagai penolakan.
	 *
	 * @param {import('../constants/scoring-table.js').ScoringRule} rule
	 * @returns {string}
	 */
	static #pesanMenungguBukti(rule) {
		return `Aksi tercatat. Lampirkan bukti untuk mencairkan ${rule.points} poin setelah diverifikasi.`;
	}

	/**
	 * Pembangkit id berurutan. Berbasis penghitung, bukan `Math.random()`, agar
	 * seluruh keluaran aplikasi tetap deterministik seperti yang dituntut aturan
	 * seed pada kontrak build.
	 * @returns {() => string}
	 */
	static #defaultIdGenerator() {
		let urutan = 0;
		return () => {
			urutan += 1;
			return `act-live-${String(urutan).padStart(5, '0')}`;
		};
	}
}
