/**
 * REPOSITORY: Rekaman Persetujuan Data (Consent).
 *
 * Tanggung jawab: akses rekaman consent untuk pengaturan privasi awardee, gerbang
 * publikasi cerita, dan bukti pilar Governance Hal 10 ("consent records").
 *
 * Satu perbedaan penting dari repository lain: rekaman consent **tidak pernah
 * disunting di tempat**. Pencabutan menghasilkan rekaman baru lewat
 * `ConsentRecord.revoke()`, dan rekaman lamanya tetap tersimpan. Pasangan keduanya
 * itulah jejak audit yang perlu ditunjukkan bila persetujuan kelak dipersoalkan :
 * karena itu `delete()` menolak, sama seperti buku besar poin.
 *
 * @see src/lib/domain/value-objects/ConsentRecord.js
 * @see docs/04-ESG-GOVERNANCE.md: §4 Rancangan Consent Record
 */

import { ConsentRecord, ConsentStatus } from '$lib/domain/value-objects/ConsentRecord.js';
import { TABLE } from '../db.js';
import { DexieRepository } from './DexieRepository.js';

export class ConsentRepository extends DexieRepository {
	constructor() {
		super({
			tableName: TABLE.CONSENTS,
			entity: { from: (row) => (row instanceof ConsentRecord ? row : new ConsentRecord(row)) },
			indexedFields: ['awardeeId', 'consentType', 'status']
		});
	}

	/**
	 * Seluruh rekaman milik seorang awardee, terbaru lebih dulu.
	 * @param {string} awardeeId
	 * @returns {Promise<ConsentRecord[]>}
	 */
	async forAwardee(awardeeId) {
		const records = await this.query({ awardeeId });
		return records.sort((a, b) => b.grantedAt.getTime() - a.grantedAt.getTime());
	}

	/**
	 * Rekaman yang masih dapat diandalkan sebagai dasar publikasi pada waktu acuan.
	 * Kedaluwarsa ikut diperiksa di sini, bukan hanya status: consent yang lewat
	 * masa berlakunya tetap berstatus AKTIF sampai ada proses yang memutakhirkannya.
	 * @param {string} awardeeId
	 * @param {Date} pada Waktu acuan.
	 * @returns {Promise<ConsentRecord[]>}
	 */
	async activeFor(awardeeId, pada) {
		const records = await this.forAwardee(awardeeId);
		return records.filter((record) => record.isAktif(pada));
	}

	/**
	 * Apakah seorang awardee memiliki consent aktif untuk sebuah jenis dan objek.
	 * @param {string} awardeeId
	 * @param {string} consentType Salah satu ConsentType.
	 * @param {Date} pada Waktu acuan.
	 * @param {string} [objekId] Identitas cerita atau bukti yang hendak diterbitkan.
	 * @returns {Promise<boolean>}
	 */
	async hasActive(awardeeId, consentType, pada, objekId) {
		const records = await this.activeFor(awardeeId, pada);
		return records.some(
			(record) =>
				record.consentType === consentType &&
				(objekId === undefined || record.mencakup(objekId))
		);
	}

	/**
	 * Rekaman yang sudah dicabut: bahan kolom "consent dicabut" pada laporan ESG.
	 * @returns {Promise<ConsentRecord[]>}
	 */
	async revoked() {
		return this.query({ status: ConsentStatus.DICABUT });
	}

	/**
	 * Ringkasan cakupan consent untuk pilar Governance.
	 * @param {number} totalAwardees Jumlah awardee sebagai penyebut cakupan.
	 * @returns {Promise<{total: number, aktif: number, dicabut: number, awardeeTercakup: number, cakupanPersen: number}>}
	 */
	async coverageSummary(totalAwardees) {
		const records = await this.getAll();
		const aktif = records.filter((record) => record.status === ConsentStatus.AKTIF);
		const awardeeTercakup = new Set(aktif.map((record) => record.awardeeId)).size;
		return {
			total: records.length,
			aktif: aktif.length,
			dicabut: records.filter((record) => record.isDicabut).length,
			awardeeTercakup,
			cakupanPersen: totalAwardees > 0 ? Math.round((awardeeTercakup / totalAwardees) * 100) : 0
		};
	}

	/**
	 * Rekaman consent bersifat append-only.
	 * @param {string} id
	 * @returns {Promise<never>}
	 * @throws {TypeError} selalu.
	 */
	async delete(id) {
		throw new TypeError(
			`Rekaman consent tidak boleh dihapus (id "${id}"). ` +
				'Pencabutan dicatat sebagai rekaman baru berstatus DICABUT agar jejak auditnya utuh.'
		);
	}
}

/** Instans tunggal yang dipakai seluruh aplikasi. */
export const consentRepository = new ConsentRepository();
