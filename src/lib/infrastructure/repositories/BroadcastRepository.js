/**
 * REPOSITORY: Kabar Pfriends (Hal 5 pilar 04).
 *
 * Tanggung jawab: akses data peristiwa diseminasi informasi, sumber KPI-02
 * (volume konten) dan KPI-03 (frekuensi diseminasi) Hal 6.
 *
 * @see src/lib/domain/entities/Broadcast.js
 * @see docs/02-KPI-MODEL.md: M-02, M-03
 */

import { Broadcast, BroadcastStatus } from '$lib/domain/entities/Broadcast.js';
import { listBroadcasts } from '../pocketbase/broadcasts.js';
import { getPocketBase } from '../pocketbase/client.js';

export class BroadcastRepository {
	async getAll() {
		if (getPocketBase()?.authStore?.record?.role !== 'AWARDEE') return [];
		const rows = await listBroadcasts();
		return rows.map((row) => new Broadcast({ ...row, contentIds: [row.id], openedBy: row.read ? ['ME'] : [], amplifiedBy: row.privateShares ? ['ME'] : [] }));
	}

	/**
	 * Kabar yang sudah terkirim, terbaru lebih dulu: inilah daftar yang dilihat
	 * awardee di `/awardee/kabar`.
	 * @returns {Promise<Broadcast[]>}
	 */
	async sent() {
		const broadcasts = await this.query({ status: BroadcastStatus.TERKIRIM });
		return broadcasts.sort((a, b) => (b.sentAt?.getTime() ?? 0) - (a.sentAt?.getTime() ?? 0));
	}

	/**
	 * Kabar terkirim pada sebuah bulan kalender.
	 * @param {string} monthKey mis. '2026-07'.
	 * @returns {Promise<Broadcast[]>}
	 */
	async sentInMonth(monthKey) {
		const broadcasts = await this.sent();
		return broadcasts.filter((broadcast) => broadcast.countsForDisseminationKpi(monthKey));
	}

	/**
	 * Kabar yang belum dibuka seorang awardee: kandidat aksi BROADCAST_VIEW.
	 * @param {string} awardeeId
	 * @returns {Promise<Broadcast[]>}
	 */
	async unreadFor(awardeeId) {
		const broadcasts = await this.sent();
		return broadcasts.filter((broadcast) => !broadcast.hasOpened(awardeeId));
	}

	/**
	 * Kabar yang belum terkirim: draf dan yang terjadwal, untuk konsol diseminasi
	 * admin. Terjadwal lebih dulu karena itu yang butuh perhatian terdekat.
	 * @returns {Promise<Broadcast[]>}
	 */
	async pipeline() {
		const broadcasts = await this.getAll();
		return broadcasts
			.filter((broadcast) => !broadcast.isSent)
			.sort((a, b) => (a.scheduledAt?.getTime() ?? Infinity) - (b.scheduledAt?.getTime() ?? Infinity));
	}

	/**
	 * Rekap jumlah hari kirim unik per bulan: bentuk mentah chart tren diseminasi.
	 * @returns {Promise<Map<string, number>>} Kunci `'2026-07'`, nilai jumlah hari unik.
	 */
	async disseminationDaysByMonth() {
		const broadcasts = await this.sent();
		/** @type {Map<string, Set<string>>} */
		const hariPerBulan = new Map();
		for (const broadcast of broadcasts) {
			const bulan = broadcast.sentMonthKey;
			const hari = broadcast.sentDayKey;
			if (!bulan || !hari) continue;
			if (!hariPerBulan.has(bulan)) hariPerBulan.set(bulan, new Set());
			hariPerBulan.get(bulan)?.add(hari);
		}
		return new Map([...hariPerBulan].map(([bulan, hari]) => [bulan, hari.size]));
	}
}

/** Instans tunggal yang dipakai seluruh aplikasi. */
export const broadcastRepository = new BroadcastRepository();
