/**
 * SERVICE — Papan Peringkat.
 *
 * Tanggung jawab: menyusun peringkat awardee menurut lingkup dan periode yang
 * diminta, serta menemukan posisi seorang awardee di dalamnya.
 *
 * Dua keputusan desain yang dijaga di sini, keduanya bersumber dari docs/03 §9.2:
 *
 * 1. **Papan komunitas dipisah.** Bauran aksi SOBI (alumni beasiswa, banyak
 *    berbagi pengetahuan dan menjadi narasumber) berbeda secara struktural dari
 *    Womenpreneur (pelaku UMKM, banyak menghadiri kelas upskilling). Menggabungkan
 *    keduanya dalam satu papan bukan kompetisi yang adil.
 * 2. **Papan hanya menampilkan puncak, bukan dasar.** `top()` memang hanya
 *    mengembalikan yang teratas, dan posisi seorang awardee diambil terpisah lewat
 *    `rankOf()`. Tidak ada satu pun jalan di kelas ini untuk menghasilkan daftar
 *    peringkat terbawah — rasa malu publik tidak pernah menjadi motivator yang baik.
 *
 * Awardee yang tidak layak tampil (ditangguhkan, dorman, belum terverifikasi)
 * disaring lewat `visibleOnLeaderboard`, bukan lewat rangkaian if di sini.
 *
 * @see docs/00-SOURCE-BRIEF.md — Hal 4 dua komunitas dan chapter
 * @see docs/03-GAMIFICATION-SPEC.md — §9 leaderboard, §9.2 anti-demotivasi, §9.3 aturan tampilan
 */

import { Awardee } from '../entities/Awardee.js';
import { PointActivity } from '../entities/PointActivity.js';

/**
 * Lingkup papan peringkat.
 * @readonly
 * @enum {string}
 */
export const LeaderboardScope = Object.freeze({
	GLOBAL: 'global',
	COMMUNITY: 'community',
	CHAPTER: 'chapter'
});

/**
 * Periode perhitungan.
 * @readonly
 * @enum {string}
 */
export const LeaderboardPeriod = Object.freeze({
	MONTH: 'month',
	ALL: 'all'
});

/** Jumlah baris baku yang ditampilkan sebuah papan. */
export const BATAS_BARIS_BAKU = 20;

/**
 * @typedef {object} LeaderboardEntry
 * @property {number} rank      Peringkat mulai dari 1.
 * @property {Awardee} awardee    Awardee pada peringkat ini.
 * @property {number} points    Poin pada periode yang diminta.
 * @property {string} displayName Nama yang layak ditampilkan (menghormati pilihan anonim).
 */

/**
 * @typedef {object} TopQuery
 * @property {string} [scope]   Salah satu LeaderboardScope; default global.
 * @property {string} [key]     Nilai lingkup: kode komunitas atau id chapter.
 * @property {string} [period]  Salah satu LeaderboardPeriod; default all.
 * @property {number} [limit]   Jumlah baris; default BATAS_BARIS_BAKU.
 * @property {Date} [pada]      Bulan acuan untuk periode bulanan; default sekarang.
 */

export class LeaderboardService {
	/** @type {import('../repositories/Repository.js').Repository} */
	#awardeeRepo;
	/** @type {import('../repositories/Repository.js').Repository|null} */
	#activityRepo;
	/** @type {() => Date} */
	#clock;

	/**
	 * @param {object} deps
	 * @param {import('../repositories/Repository.js').Repository} deps.awardeeRepo
	 * @param {import('../repositories/Repository.js').Repository} [deps.activityRepo]
	 *   Buku besar poin. Opsional: tanpa ini papan bulanan jatuh kembali ke poin
	 *   musim yang tersimpan pada awardee, sehingga papan tetap tampil terisi
	 *   alih-alih kosong.
	 * @param {() => Date} [deps.clock]
	 * @throws {TypeError} bila repository awardee tidak diberikan.
	 */
	constructor({ awardeeRepo, activityRepo = null, clock } = {}) {
		if (!awardeeRepo) {
			throw new TypeError('LeaderboardService membutuhkan awardeeRepo.');
		}
		this.#awardeeRepo = awardeeRepo;
		this.#activityRepo = activityRepo;
		this.#clock = clock ?? (() => new Date());
	}

	/**
	 * Peringkat teratas sesuai lingkup dan periode.
	 * @param {TopQuery} [query]
	 * @returns {Promise<LeaderboardEntry[]>}
	 */
	async top(query = {}) {
		const {
			scope = LeaderboardScope.GLOBAL,
			key = '',
			period = LeaderboardPeriod.ALL,
			limit = BATAS_BARIS_BAKU,
			pada = this.#clock()
		} = query;

		const peringkat = await this.#rankedList({ scope, key, period, pada });
		return peringkat.slice(0, limit);
	}

	/**
	 * Posisi seorang awardee beserta ukuran papannya.
	 *
	 * Mengembalikan `percentile` supaya UI dapat menampilkan posisi relatif
	 * ("kamu di 35% teratas chapter PF11") alih-alih peringkat absolut yang besar.
	 * Angka "#412" bersifat demotivasi murni dan tidak memberi informasi yang
	 * dapat ditindaklanjuti.
	 *
	 * @param {string} awardeeId
	 * @param {TopQuery} [query]
	 * @returns {Promise<{rank: number, total: number, points: number, percentile: number}|null>}
	 *   null bila awardee tidak tampil di papan tersebut.
	 */
	async rankOf(awardeeId, query = {}) {
		const {
			scope = LeaderboardScope.GLOBAL,
			key = '',
			period = LeaderboardPeriod.ALL,
			pada = this.#clock()
		} = query;

		const peringkat = await this.#rankedList({ scope, key, period, pada });
		const posisi = peringkat.find((entry) => entry.awardee.id === awardeeId);
		if (!posisi) return null;

		return {
			rank: posisi.rank,
			total: peringkat.length,
			points: posisi.points,
			percentile: Math.max(1, Math.round((posisi.rank / peringkat.length) * 100))
		};
	}

	/**
	 * Papan kolektif antar-chapter, berbasis RATA-RATA poin per awardee.
	 *
	 * Sengaja rata-rata dan bukan total: chapter PF12 yang baru terbentuk akan
	 * selalu kalah dari PF10 yang besar bila dibandingkan lewat total — masalah
	 * klasik papan peringkat tim yang membuat awardee chapter kecil berhenti
	 * mencoba sejak hari pertama.
	 *
	 * @returns {Promise<{chapterId: string, awardeeCount: number, totalPoints: number, averagePoints: number}[]>}
	 */
	async byChapter() {
		const awardees = await this.#visibleAwardees();
		/** @type {Map<string, Awardee[]>} */
		const perChapter = new Map();
		for (const awardee of awardees) {
			const daftar = perChapter.get(awardee.chapterId) ?? [];
			daftar.push(awardee);
			perChapter.set(awardee.chapterId, daftar);
		}

		return [...perChapter.entries()]
			.map(([chapterId, daftar]) => {
				const totalPoints = daftar.reduce((total, awardee) => total + awardee.points, 0);
				return {
					chapterId,
					awardeeCount: daftar.length,
					totalPoints,
					averagePoints: Math.round(totalPoints / daftar.length)
				};
			})
			.sort((a, b) => b.averagePoints - a.averagePoints);
	}

	/**
	 * Daftar peringkat lengkap sesuai lingkup dan periode.
	 * @param {{scope: string, key: string, period: string, pada: Date}} query
	 * @returns {Promise<LeaderboardEntry[]>}
	 */
	async #rankedList({ scope, key, period, pada }) {
		const awardees = await this.#visibleAwardees();
		const tersaring = awardees.filter((awardee) => LeaderboardService.#cocokLingkup(awardee, scope, key));
		const skor = await this.#scoreMap(tersaring, period, pada);

		return tersaring
			.map((awardee) => ({ awardee, points: skor.get(awardee.id) ?? 0 }))
			.sort(LeaderboardService.#urutkan)
			.map((baris, index) => ({
				rank: index + 1,
				awardee: baris.awardee,
				points: baris.points,
				displayName: baris.awardee.displayName
			}));
	}

	/**
	 * Awardee yang layak tampil di papan mana pun.
	 * @returns {Promise<Awardee[]>}
	 */
	async #visibleAwardees() {
		const rows = await this.#awardeeRepo.getAll();
		return rows.map((row) => Awardee.from(row)).filter((awardee) => awardee.visibleOnLeaderboard);
	}

	/**
	 * Peta poin per awardee untuk periode yang diminta.
	 * @param {readonly Awardee[]} awardees
	 * @param {string} period
	 * @param {Date} pada
	 * @returns {Promise<Map<string, number>>}
	 */
	async #scoreMap(awardees, period, pada) {
		if (period !== LeaderboardPeriod.MONTH) {
			return new Map(awardees.map((awardee) => [awardee.id, awardee.points]));
		}
		if (!this.#activityRepo) {
			return new Map(awardees.map((awardee) => [awardee.id, awardee.seasonPoints]));
		}

		const monthKey = LeaderboardService.#monthKey(pada);
		const rows = await this.#activityRepo.getAll();
		/** @type {Map<string, number>} */
		const skor = new Map(awardees.map((awardee) => [awardee.id, 0]));

		for (const row of rows) {
			const entry = PointActivity.from(row);
			// Entri menunggu verifikasi tidak dihitung: peringkat yang berubah-ubah
			// setelah verifikasi membuat papan terasa tidak dapat dipercaya.
			if (!entry.isAwarded || entry.monthKey !== monthKey) continue;
			if (!skor.has(entry.awardeeId)) continue;
			skor.set(entry.awardeeId, (skor.get(entry.awardeeId) ?? 0) + entry.points);
		}
		return skor;
	}

	/**
	 * Apakah seorang awardee termasuk lingkup papan.
	 * @param {Awardee} awardee
	 * @param {string} scope
	 * @param {string} key
	 * @returns {boolean}
	 */
	static #cocokLingkup(awardee, scope, key) {
		if (scope === LeaderboardScope.COMMUNITY) return awardee.community === key;
		if (scope === LeaderboardScope.CHAPTER) return awardee.chapterId === key;
		return true;
	}

	/**
	 * Pengurutan papan: poin menurun, lalu nama menaik.
	 *
	 * Pemecah seri berupa nama — bukan waktu bergabung — disengaja: awardee lama
	 * tidak seharusnya otomatis mengungguli awardee baru yang berkontribusi sama
	 * banyak, dan urutan alfabet setidaknya netral dan dapat dijelaskan.
	 *
	 * @param {{awardee: Awardee, points: number}} a
	 * @param {{awardee: Awardee, points: number}} b
	 * @returns {number}
	 */
	static #urutkan(a, b) {
		const selisih = b.points - a.points;
		return selisih !== 0 ? selisih : a.awardee.fullName.localeCompare(b.awardee.fullName, 'id');
	}

	/**
	 * Kunci bulan kalender waktu lokal.
	 * @param {Date} pada
	 * @returns {string} mis. '2026-07'.
	 */
	static #monthKey(pada) {
		return `${pada.getFullYear()}-${String(pada.getMonth() + 1).padStart(2, '0')}`;
	}
}
