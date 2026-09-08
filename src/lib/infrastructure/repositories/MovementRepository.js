/**
 * REPOSITORY: Gerakan Bersama (Hal 5 pilar 03).
 *
 * Tanggung jawab: akses data gerakan kolektif: aksi lingkungan, edukasi
 * masyarakat, dan pemberdayaan ekonomi: beserta progres partisipasinya.
 *
 * @see src/lib/domain/entities/Movement.js
 */

import { Movement, MovementStatus } from '$lib/domain/entities/Movement.js';
import { TABLE } from '../db.js';
import { DexieRepository } from './DexieRepository.js';

export class MovementRepository extends DexieRepository {
	constructor() {
		super({
			tableName: TABLE.MOVEMENTS,
			entity: Movement,
			indexedFields: ['slug', 'category', 'status']
		});
	}

	/**
	 * Gerakan berdasarkan slug: jalur baca halaman detail gerakan.
	 * @param {string} slug
	 * @returns {Promise<Movement|null>}
	 */
	async getBySlug(slug) {
		const hasil = await this.query({ slug });
		return hasil[0] ?? null;
	}

	/**
	 * Gerakan yang sedang berjalan, yang paling ramai lebih dulu. Urutan ini
	 * disengaja: gerakan yang sudah bergerak lebih mudah diikuti awardee baru
	 * daripada gerakan yang masih sepi.
	 * @returns {Promise<Movement[]>}
	 */
	async running() {
		const movements = await this.query({ status: MovementStatus.BERJALAN });
		return movements.sort((a, b) => b.participantCount - a.participantCount);
	}

	/**
	 * Gerakan yang sudah rampung, terbaru lebih dulu.
	 * @returns {Promise<Movement[]>}
	 */
	async completed() {
		const movements = await this.query({ status: MovementStatus.SELESAI });
		return movements.sort((a, b) => b.endsAt.getTime() - a.endsAt.getTime());
	}

	/**
	 * Gerakan yang diikuti seorang awardee, baik sebagai peserta maupun pemimpin.
	 * @param {string} awardeeId
	 * @returns {Promise<Movement[]>}
	 */
	async forAwardee(awardeeId) {
		const movements = await this.getAll();
		return movements.filter(
			(movement) => movement.hasJoined(awardeeId) || movement.isLedBy(awardeeId)
		);
	}

	/**
	 * Gerakan pada sebuah kategori.
	 * @param {string} category Salah satu MovementCategory.
	 * @returns {Promise<Movement[]>}
	 */
	async byCategory(category) {
		return this.query({ category });
	}
}

/** Instans tunggal yang dipakai seluruh aplikasi. */
export const movementRepository = new MovementRepository();
