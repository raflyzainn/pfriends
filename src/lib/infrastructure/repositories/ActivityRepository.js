/**
 * REPOSITORY: Buku Besar Poin.
 *
 * Tanggung jawab: menyimpan dan membaca entri `PointActivity`. Ini repository
 * terpanas di sistem: tier, papan peringkat, badge, dan KPI amplifikasi Hal 6
 * seluruhnya diturunkan dari tabel ini.
 *
 * **Append-only.** `delete()` sengaja menolak: bukan lupa diimplementasikan.
 * Catatan pada kontrak `Repository` menyatakannya eksplisit: KPI Hal 6 menghitung
 * jumlah aksi, sehingga menghapus entri sama dengan memalsukan laporan. Entri yang
 * keliru dikoreksi dengan mengubah statusnya menjadi REVOKED, dan riwayat
 * koreksinya tetap terbaca.
 *
 * @see src/lib/domain/entities/PointActivity.js
 * @see docs/09-BUILD-CONTRACT.md: §4 WP-3
 */

import { ActivityStatus, PointActivity } from '$lib/domain/entities/PointActivity.js';
import { TABLE } from '../db.js';
import { DexieRepository } from './DexieRepository.js';

export class ActivityRepository extends DexieRepository {
	constructor() {
		super({
			tableName: TABLE.ACTIVITIES,
			entity: PointActivity,
			indexedFields: ['awardeeId', 'activityType', 'status']
		});
	}


	/**
	 * Buku besar seorang awardee, terbaru lebih dulu.
	 * @param {string} awardeeId
	 * @returns {Promise<PointActivity[]>}
	 */
	async ledgerFor(awardeeId) {
		const entries = await this.query({ awardeeId });
		return entries.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
	}

	/**
	 * Total Poin Kontribusi seorang awardee, dihitung ulang dari buku besar.
	 *
	 * Selalu dihitung dari entri, tidak pernah dibaca dari kolom `points` awardee.
	 * Kolom itu adalah cache; buku besar adalah kebenarannya. Bila keduanya
	 * berselisih, yang keliru adalah cache-nya.
	 *
	 * @param {string} awardeeId
	 * @returns {Promise<number>}
	 */
	async totalFor(awardeeId) {
		return PointActivity.sumAwarded(await this.query({ awardeeId }));
	}

	/**
	 * Jumlah kejadian satu jenis aksi milik seorang awardee pada satu hari kalender.
	 * Inilah masukan `AntiGamingPolicy.check` untuk menegakkan kuota harian.
	 *
	 * Entri yang ditolak tidak dihitung: `consumesQuota` sudah menyatakan aturan
	 * itu di entity, dan repository tinggal mematuhinya.
	 *
	 * @param {string} awardeeId
	 * @param {string} activityType Salah satu ActivityType.
	 * @param {Date} pada Hari acuan.
	 * @returns {Promise<number>}
	 */
	async dailyCount(awardeeId, activityType, pada) {
		const entries = await this.query({ awardeeId, activityType });
		return entries.filter((entry) => entry.consumesQuota && entry.occurredOnSameDay(pada)).length;
	}

	/**
	 * Rekap poin per bulan kalender untuk chart tren admin.
	 * @param {string} [awardeeId] Bila diisi, hanya awardee tersebut.
	 * @returns {Promise<Map<string, {points: number, count: number}>>} Kunci `'2026-07'`.
	 */
	async monthlyTotals(awardeeId) {
		const entries = awardeeId ? await this.query({ awardeeId }) : await this.getAll();
		/** @type {Map<string, {points: number, count: number}>} */
		const rekap = new Map();
		for (const entry of entries) {
			if (!entry.countsForKpi) continue;
			const bulan = rekap.get(entry.monthKey) ?? { points: 0, count: 0 };
			bulan.points += entry.points;
			bulan.count += 1;
			rekap.set(entry.monthKey, bulan);
		}
		return rekap;
	}

	/**
	 * Entri dengan jenis aksi tertentu pada satu bulan kalender.
	 * @param {string} activityType
	 * @param {string} monthKey mis. '2026-07'.
	 * @returns {Promise<PointActivity[]>}
	 */
	async byTypeInMonth(activityType, monthKey) {
		const entries = await this.query({ activityType });
		return entries.filter((entry) => entry.monthKey === monthKey);
	}

	/**
	 * Entri yang masih menunggu kelengkapan bukti: antrean verifikasi bukti.
	 * @returns {Promise<PointActivity[]>}
	 */
	async pending() {
		return this.query({ status: ActivityStatus.PENDING });
	}

	/**
	 * Buku besar poin bersifat append-only.
	 * @param {string} id
	 * @returns {Promise<never>}
	 * @throws {TypeError} selalu.
	 */
	async delete(id) {
		throw new TypeError(
			`Entri buku besar poin tidak boleh dihapus (id "${id}"). ` +
				'KPI Hal 6 menghitung jumlah aksi: koreksi dilakukan dengan status REVOKED, bukan penghapusan.'
		);
	}
}

/** Instans tunggal yang dipakai seluruh aplikasi. */
export const activityRepository = new ActivityRepository();
