/**
 * REPOSITORY — Kalender Komunitas (Hal 5 pilar 02).
 *
 * Tanggung jawab: akses data kegiatan upskilling, pertemuan komunitas, dan
 * sharing session — sumber langsung KPI-05 Hal 6, pemasok aksi SESSION_ATTEND,
 * sekaligus antrean usulan kegiatan bagi verifikator.
 *
 * Satu perilaku yang berubah sejak V2 dan perlu diketahui pemanggil: `upcoming()`
 * kini menyaring `isPubliclyVisible` LEBIH DULU, baru `isUpcoming()`. Sejak
 * `DIUSULKAN` masuk ke `EventStatus`, `isUpcoming()` sendirian tidak lagi cukup —
 * ia hanya mengecualikan yang dibatalkan, sehingga usulan mentah bertanggal masa
 * depan akan lolos dan tampil di kalender publik sebagai agenda resmi. Usulan
 * milik sendiri dibaca lewat `proposedBy()`, bukan dengan melonggarkan penyaring
 * publik.
 *
 * @see src/lib/domain/entities/CommunityEvent.js
 * @see docs/12-BUILD-CONTRACT-V2.md — R-09 penyaring publik tunggal `isPubliclyVisible`
 */

import { CommunityEvent, EventStatus } from '$lib/domain/entities/CommunityEvent.js';
import { TABLE } from '../db.js';
import { DexieRepository } from './DexieRepository.js';

export class EventRepository extends DexieRepository {
	constructor() {
		super({
			tableName: TABLE.EVENTS,
			entity: CommunityEvent,
			indexedFields: ['slug', 'type', 'status', 'chapterId', 'proposedBy']
		});
	}

	/**
	 * Kegiatan berdasarkan slug — jalur baca halaman `/kalender/[slug]`.
	 * @param {string} slug
	 * @returns {Promise<CommunityEvent|null>}
	 */
	async getBySlug(slug) {
		const hasil = await this.query({ slug });
		return hasil[0] ?? null;
	}

	/**
	 * Kegiatan yang boleh tampil di zona publik, paling awal lebih dulu.
	 * @returns {Promise<CommunityEvent[]>}
	 */
	async published() {
		const events = await this.getAll();
		return events
			.filter((event) => event.isPubliclyVisible)
			.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
	}

	/**
	 * Kegiatan publik yang akan datang, paling dekat lebih dulu.
	 * @param {Date} pada Waktu acuan.
	 * @returns {Promise<CommunityEvent[]>}
	 */
	async upcoming(pada) {
		const events = await this.published();
		return events.filter((event) => event.isUpcoming(pada));
	}

	/**
	 * Kegiatan yang sudah lewat, terbaru lebih dulu.
	 * @param {Date} pada Waktu acuan.
	 * @returns {Promise<CommunityEvent[]>}
	 */
	async past(pada) {
		const events = await this.getAll();
		return events
			.filter((event) => event.startsAt <= pada)
			.sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime());
	}

	/**
	 * Kegiatan yang diikuti seorang awardee, baik terdaftar maupun sudah hadir.
	 * @param {string} awardeeId
	 * @returns {Promise<CommunityEvent[]>}
	 */
	async forAwardee(awardeeId) {
		const events = await this.getAll();
		return events
			.filter((event) => event.isRegistered(awardeeId) || event.hasAttended(awardeeId))
			.sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime());
	}

	/**
	 * Antrean usulan kegiatan: yang menunggu keputusan verifikator, tertua lebih
	 * dulu. Urutan tertua-dulu disengaja — antrean yang menampilkan usulan terbaru
	 * di puncak membuat usulan yang paling lama menunggu tidak pernah tersentuh,
	 * dan justru itulah yang paling dekat melewati SLA.
	 * @returns {Promise<CommunityEvent[]>}
	 */
	async proposalQueue() {
		const events = await this.query({ status: EventStatus.DIUSULKAN });
		return events.sort(
			(a, b) =>
				(a.submittedAt?.getTime() ?? a.startsAt.getTime()) -
				(b.submittedAt?.getTime() ?? b.startsAt.getTime())
		);
	}

	/**
	 * Kegiatan yang diusulkan sebuah akun — tab "Usulan saya", termasuk yang masih
	 * draf, ditolak, atau belum terbit.
	 * @param {string} accountId Id `UserAccount` pengusul.
	 * @returns {Promise<CommunityEvent[]>}
	 */
	async proposedBy(accountId) {
		const events = await this.query({ proposedBy: accountId });
		return events.sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime());
	}

	/**
	 * Kegiatan yang sah dihitung pada KPI-05 Hal 6 ("2 aktivitas engagement
	 * terlaksana") — selesai, berbukti, dan mencapai kuorum kehadiran.
	 * @returns {Promise<CommunityEvent[]>}
	 */
	async countedForKpi() {
		const events = await this.getAll();
		return events.filter((event) => event.countsForEngagementKpi);
	}

	/**
	 * Kegiatan yang sudah selesai diselenggarakan.
	 * @returns {Promise<CommunityEvent[]>}
	 */
	async completed() {
		return this.query({ status: EventStatus.SELESAI });
	}
}

/** Instans tunggal yang dipakai seluruh aplikasi. */
export const eventRepository = new EventRepository();
