/**
 * REPOSITORY — Katalog Lencana Pengakuan.
 *
 * Tanggung jawab: akses definisi lencana untuk halaman penghargaan awardee.
 *
 * Tabel ini menyimpan KATALOG, bukan kepemilikan. Siapa memiliki lencana apa
 * tercatat pada `badgeCodes` milik awardee — sengaja begitu, karena kepemilikan
 * selalu dibaca bersamaan dengan data awardee-nya dan memisahkannya menjadi tabel
 * relasi hanya menambah satu kueri untuk setiap kali profil dibuka.
 *
 * Kunci primernya `code`, bukan `id`, mengikuti bentuk entity `Badge`.
 *
 * @see src/lib/domain/entities/Badge.js
 */

import { Badge } from '$lib/domain/entities/Badge.js';
import { TABLE } from '../db.js';
import { DexieRepository } from './DexieRepository.js';

export class BadgeRepository extends DexieRepository {
	constructor() {
		super({
			tableName: TABLE.BADGES,
			entity: Badge,
			keyPath: 'code',
			indexedFields: ['family', 'rarity']
		});
	}

	/**
	 * Seluruh lencana, diurutkan dari yang paling umum ke paling langka.
	 * @returns {Promise<Badge[]>}
	 */
	async catalog() {
		const badges = await this.getAll();
		return badges.sort(Badge.byRarity);
	}

	/**
	 * Katalog lencana bagi seorang awardee, menandai mana yang sudah terkumpul.
	 * Lencana yang belum terbuka tetap ditampilkan beserta kriterianya — daftar
	 * yang hanya memuat lencana terkumpul menghilangkan justru bagian yang memberi
	 * arah, yaitu apa yang perlu dilakukan untuk mendapat yang berikutnya.
	 * @param {import('$lib/domain/entities/Awardee.js').Awardee} awardee
	 * @returns {Promise<{badge: Badge, unlocked: boolean}[]>}
	 */
	async catalogFor(awardee) {
		const badges = await this.catalog();
		return badges
			.filter((badge) => badge.isOpenTo(awardee.community))
			.map((badge) => ({ badge, unlocked: badge.isUnlockedBy(awardee) }));
	}

	/**
	 * Lencana yang sudah dikumpulkan seorang awardee.
	 * @param {import('$lib/domain/entities/Awardee.js').Awardee} awardee
	 * @returns {Promise<Badge[]>}
	 */
	async unlockedBy(awardee) {
		const badges = await this.catalog();
		return badges.filter((badge) => badge.isUnlockedBy(awardee));
	}

	/**
	 * Lencana pada satu keluarga kontribusi.
	 * @param {string} family Salah satu BadgeFamily.
	 * @returns {Promise<Badge[]>}
	 */
	async byFamily(family) {
		return this.query({ family });
	}
}

/** Instans tunggal yang dipakai seluruh aplikasi. */
export const badgeRepository = new BadgeRepository();
