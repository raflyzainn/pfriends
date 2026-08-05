/**
 * REPOSITORY — Cerita Komunitas (story bank Hal 9).
 *
 * Tanggung jawab: akses data cerita untuk zona publik, ruang cerita awardee,
 * antrean tinjauan verifikator, dan agregasi bukti ESG.
 *
 * Satu hal yang dijaga di sini: `published()` menyaring lewat `isPublic` milik
 * entity, bukan lewat perbandingan status di tempat ini. Aturan "status mana yang
 * boleh terlihat publik" hanya boleh ada di satu tempat — bila ia tersalin ke
 * repository, penambahan status baru kelak akan membocorkan cerita yang seharusnya
 * belum tayang.
 *
 * @see src/lib/domain/entities/Story.js
 * @see docs/04-ESG-GOVERNANCE.md — §3 state machine cerita
 */

import { Story } from '$lib/domain/entities/Story.js';
import { STORY_STATUS } from '$lib/domain/constants/community.js';
import { TABLE } from '../db.js';
import { DexieRepository } from './DexieRepository.js';

export class StoryRepository extends DexieRepository {
	constructor() {
		super({
			tableName: TABLE.STORIES,
			entity: Story,
			indexedFields: ['slug', 'authorId', 'reviewerId', 'status', 'community']
		});
	}

	/**
	 * Cerita berdasarkan slug — jalur baca halaman `/cerita/[slug]`.
	 * @param {string} slug
	 * @returns {Promise<Story|null>}
	 */
	async getBySlug(slug) {
		const hasil = await this.query({ slug });
		return hasil[0] ?? null;
	}

	/**
	 * Cerita yang boleh tampil di zona publik, terbaru lebih dulu.
	 * @returns {Promise<Story[]>}
	 */
	async published() {
		const stories = await this.getAll();
		return stories
			.filter((story) => story.isPublic)
			.sort((a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0));
	}

	/**
	 * Cerita milik seorang awardee penulis, terbaru lebih dulu.
	 * @param {string} authorId Id Awardee penulis naskah.
	 * @returns {Promise<Story[]>}
	 */
	async byAuthor(authorId) {
		const stories = await this.query({ authorId });
		return stories.sort(
			(a, b) => (b.submittedAt?.getTime() ?? 0) - (a.submittedAt?.getTime() ?? 0)
		);
	}

	/**
	 * Antrean tinjauan: cerita yang sedang menunggu tindakan verifikator.
	 * Diurutkan dari yang paling lama menunggu — antrean yang diurutkan terbaru
	 * lebih dulu membuat cerita tertua tidak pernah tersentuh.
	 * @returns {Promise<Story[]>}
	 */
	async moderationQueue() {
		const stories = await this.getAll();
		return stories
			.filter((story) => story.isInModeration)
			.sort((a, b) => (a.submittedAt?.getTime() ?? 0) - (b.submittedAt?.getTime() ?? 0));
	}

	/**
	 * Naskah yang sedang dipegang seorang verifikator, tertua lebih dulu.
	 *
	 * Perhatikan bedanya dengan `byAuthor()`: `authorId` menunjuk seorang `Awardee`,
	 * sedangkan `reviewerId` menunjuk sebuah `UserAccount`. Keduanya tidak pernah
	 * bernilai sama — akun verifikator wajib ber-`awardeeId: null` — dan justru
	 * ketidaksamaan itulah yang membuat pemeriksaan konflik kepentingan bermakna.
	 *
	 * @param {string} reviewerId Id `UserAccount` verifikator.
	 * @returns {Promise<Story[]>}
	 */
	async byReviewer(reviewerId) {
		const stories = await this.query({ reviewerId });
		return stories.sort((a, b) => (a.reviewedAt?.getTime() ?? 0) - (b.reviewedAt?.getTime() ?? 0));
	}

	/**
	 * Cerita yang sudah lolos review dan layak dihitung sebagai bukti ESG.
	 * @returns {Promise<Story[]>}
	 */
	async verified() {
		const stories = await this.getAll();
		return stories.filter((story) => story.isVerified);
	}

	/**
	 * Cerita yang menunggu revisi penulis.
	 * @returns {Promise<Story[]>}
	 */
	async needsRevision() {
		return this.query({ status: STORY_STATUS.PERLU_REVISI });
	}

	/**
	 * Cerita yang membawa sebuah pilar ESG.
	 * @param {string} pillar 'E', 'S', atau 'G'.
	 * @returns {Promise<Story[]>}
	 */
	async byPillar(pillar) {
		const stories = await this.getAll();
		return stories.filter((story) => story.pillars.includes(pillar));
	}
}

/** Instans tunggal yang dipakai seluruh aplikasi. */
export const storyRepository = new StoryRepository();
