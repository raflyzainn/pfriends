/**
 * STORE — Papan Peringkat.
 *
 * Tanggung jawab: menyimpan pilihan lingkup dan periode yang sedang dilihat, lalu
 * menampung hasil `LeaderboardService` untuk pilihan itu.
 *
 * Penyusunan peringkat sepenuhnya milik service — termasuk penyaringan anggota yang
 * tidak layak tampil, pemecah seri, dan pemisahan papan per komunitas. Store ini
 * hanya memilih pertanyaan mana yang diajukan dan menyimpan jawabannya.
 *
 * Perhatikan apa yang TIDAK disediakan di sini: tidak ada cara memuat peringkat
 * terbawah. `rankOf` sengaja terpisah dari `top` di service, dan pemisahan itu
 * dipertahankan — posisi seorang anggota adalah informasi pribadinya, sementara
 * papan hanya menampilkan puncaknya. Rasa malu publik tidak pernah menjadi
 * motivator yang baik (docs/03 §9.2).
 *
 * @see docs/03-GAMIFICATION-SPEC.md — §9 leaderboard
 * @see docs/09-BUILD-CONTRACT.md — §5 leaderboard
 */

import { browser } from '$app/environment';
import {
	BATAS_BARIS_BAKU,
	LeaderboardPeriod,
	LeaderboardScope,
	LeaderboardService
} from '$lib/domain/services/LeaderboardService.js';
import { activityRepository, awardeeRepository } from '$lib/infrastructure/repositories/index.js';
import { bootstrapDatabase } from '$lib/infrastructure/seed/bootstrap.js';
import { session } from './session.svelte.js';

export { LeaderboardPeriod, LeaderboardScope };

/**
 * Buku besar poin ikut disuntikkan agar papan bulanan dihitung dari entri yang
 * benar-benar terjadi pada bulan berjalan, bukan dari poin musim yang tersimpan
 * pada anggota.
 */
const service = new LeaderboardService({
	awardeeRepo: awardeeRepository,
	activityRepo: activityRepository
});

/** Jumlah baris yang ditampilkan sebagai podium. Tata letak, bukan aturan gamifikasi. */
export const UKURAN_PODIUM = 3;

class LeaderboardStore {
	/** @type {string} Salah satu LeaderboardScope. */
	scope = $state(LeaderboardScope.GLOBAL);

	/** @type {string} Nilai lingkup: kode komunitas atau id chapter. */
	key = $state('');

	/** @type {string} Salah satu LeaderboardPeriod. */
	period = $state(LeaderboardPeriod.ALL);

	/** @type {number} */
	limit = $state(BATAS_BARIS_BAKU);

	/** @type {import('$lib/domain/services/LeaderboardService.js').LeaderboardEntry[]} */
	entries = $state.raw([]);

	/** @type {{rank: number, total: number, points: number, percentile: number}|null} */
	myRank = $state.raw(null);

	/** @type {{chapterId: string, awardeeCount: number, totalPoints: number, averagePoints: number}[]} */
	chapters = $state.raw([]);

	/** @type {boolean} */
	loading = $state(false);

	/** @type {boolean} Papan sudah pernah dimuat dengan sukses. */
	loaded = $state(false);

	/** Papan tidak berisi siapa pun untuk pilihan saat ini. */
	isEmpty = $derived(this.entries.length === 0);

	/** Peringkat teratas — bahan podium pada halaman papan peringkat. */
	podium = $derived(this.entries.slice(0, UKURAN_PODIUM));

	/** Baris di bawah podium. Batasnya sama dengan `podium` supaya tidak ada baris yang terlewat maupun tampil dua kali. */
	rest = $derived(this.entries.slice(UKURAN_PODIUM));

	/**
	 * Memuat papan untuk lingkup dan periode yang diminta.
	 *
	 * Argumen yang diberikan menjadi pilihan aktif store, sehingga halaman cukup
	 * memanggil `load({ scope, key })` tanpa menyetel state lebih dulu.
	 *
	 * @param {{scope?: string, key?: string, period?: string, limit?: number}} [query]
	 * @returns {Promise<void>}
	 */
	async load(query = {}) {
		if (!browser) return;

		if (query.scope !== undefined) this.scope = query.scope;
		if (query.key !== undefined) this.key = query.key;
		if (query.period !== undefined) this.period = query.period;
		if (query.limit !== undefined) this.limit = query.limit;

		this.loading = true;
		try {
			await bootstrapDatabase();
			const pilihan = {
				scope: this.scope,
				key: this.key,
				period: this.period,
				limit: this.limit
			};

			const [entries, chapters] = await Promise.all([
				service.top(pilihan),
				service.byChapter()
			]);

			this.entries = entries;
			this.chapters = chapters;
			this.myRank = await this.#posisiSaya(pilihan);
			this.loaded = true;
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Mengganti lingkup papan lalu memuat ulang.
	 * @param {string} scope Salah satu LeaderboardScope.
	 * @param {string} [key] Kode komunitas atau id chapter; wajib untuk lingkup selain global.
	 * @returns {Promise<void>}
	 */
	async setScope(scope, key = '') {
		return this.load({ scope, key });
	}

	/**
	 * Mengganti periode papan lalu memuat ulang.
	 * @param {string} period Salah satu LeaderboardPeriod.
	 * @returns {Promise<void>}
	 */
	async setPeriod(period) {
		return this.load({ period });
	}

	/**
	 * Memuat ulang papan dengan pilihan yang sedang aktif. Dipanggil setelah anggota
	 * memperoleh poin, supaya posisinya ikut bergerak seketika.
	 * @returns {Promise<void>}
	 */
	async refresh() {
		return this.load();
	}

	/**
	 * Apakah sebuah baris adalah anggota yang sedang masuk — dipakai UI untuk
	 * menyorot barisnya sendiri di antara yang lain.
	 * @param {import('$lib/domain/services/LeaderboardService.js').LeaderboardEntry} entry
	 * @returns {boolean}
	 */
	isMe(entry) {
		return session.awardeeId !== null && entry.awardee.id === session.awardeeId;
	}

	/**
	 * Posisi anggota yang sedang masuk pada papan ini.
	 * Admin tidak punya posisi: ia pengelola program, bukan peserta.
	 * @param {{scope: string, key: string, period: string}} pilihan
	 * @returns {Promise<{rank: number, total: number, points: number, percentile: number}|null>}
	 */
	async #posisiSaya(pilihan) {
		const awardeeId = session.awardeeId;
		if (!awardeeId) return null;
		return service.rankOf(awardeeId, pilihan);
	}
}

/** Instans tunggal yang dipakai seluruh aplikasi. */
export const leaderboard = new LeaderboardStore();
