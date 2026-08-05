/**
 * STORE — Katalog Isi Komunitas.
 *
 * Tanggung jawab: memuat seluruh koleksi yang dibaca banyak halaman sekaligus —
 * kabar, kegiatan, gerakan, cerita, penghargaan, anggota — dan menyediakannya
 * sebagai satu sumber bersama.
 *
 * Satu store untuk enam koleksi, bukan enam store, karena hampir setiap halaman
 * membutuhkan lebih dari satu di antaranya: beranda menampilkan cerita dan anggota,
 * dasbor anggota menampilkan kabar dan kegiatan. Memisahkannya per entitas hanya
 * memindahkan pekerjaan menggabungkan ke setiap halaman (keputusan K-2).
 *
 * `load()` bersifat idempoten dan menahan pemanggilan serentak pada satu janji yang
 * sama. Ini bukan kemewahan: layout dan beberapa halaman dapat memanggilnya hampir
 * bersamaan saat hidrasi, dan tanpa penahan itu seluruh tabel akan dibaca berkali-
 * kali untuk hasil yang identik.
 *
 * @see docs/09-BUILD-CONTRACT.md — §5 catalog.load / storyBySlug / byId
 */

import { browser } from '$app/environment';
import {
	broadcastRepository,
	eventRepository,
	awardeeRepository,
	movementRepository,
	rewardRepository,
	storyRepository
} from '$lib/infrastructure/repositories/index.js';
import { bootstrapDatabase } from '$lib/infrastructure/seed/bootstrap.js';

/**
 * Jenis koleksi yang dapat dirujuk `byId()`.
 * @readonly
 * @enum {string}
 */
export const CatalogKind = Object.freeze({
	BROADCAST: 'broadcast',
	EVENT: 'event',
	MOVEMENT: 'movement',
	STORY: 'story',
	REWARD: 'reward',
	AWARDEE: 'awardee'
});

class CatalogStore {
	/** @type {import('$lib/domain/entities/Broadcast.js').Broadcast[]} */
	broadcasts = $state.raw([]);

	/** @type {import('$lib/domain/entities/CommunityEvent.js').CommunityEvent[]} */
	events = $state.raw([]);

	/** @type {import('$lib/domain/entities/Movement.js').Movement[]} */
	movements = $state.raw([]);

	/** @type {import('$lib/domain/entities/Story.js').Story[]} */
	stories = $state.raw([]);

	/** @type {import('$lib/domain/entities/Reward.js').Reward[]} */
	rewards = $state.raw([]);

	/** @type {import('$lib/domain/entities/Awardee.js').Awardee[]} */
	awardees = $state.raw([]);

	/** @type {boolean} Katalog sudah pernah dimuat dengan sukses. */
	loaded = $state(false);

	/** @type {boolean} */
	loading = $state(false);

	/** @type {string|null} Pesan galat pemuatan terakhir. */
	error = $state(null);

	/** @type {Promise<void>|null} */
	#pemuatan = null;

	/**
	 * Cerita yang boleh tampil di zona publik, terbaru lebih dulu.
	 * Penyaringnya `isPublic` milik entity, bukan perbandingan status di sini —
	 * aturan "status mana yang terlihat publik" hanya boleh hidup di satu tempat.
	 */
	publishedStories = $derived(
		this.stories
			.filter((story) => story.isPublic)
			.sort((a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0))
	);

	/** Kabar yang sudah dikirim, terbaru lebih dulu. */
	sentBroadcasts = $derived(
		this.broadcasts
			.filter((broadcast) => broadcast.isSent)
			.sort((a, b) => (b.sentAt?.getTime() ?? 0) - (a.sentAt?.getTime() ?? 0))
	);

	/** Penghargaan yang masih dapat ditukar, termurah lebih dulu. */
	availableRewards = $derived(
		this.rewards
			.filter((reward) => reward.isAvailable)
			.sort((a, b) => a.priceCoins - b.priceCoins)
	);

	/**
	 * Kegiatan yang boleh dilihat siapa pun, paling awal lebih dulu.
	 *
	 * Gerbang publiknya tunggal dan tinggal di entity (`isPubliclyVisible`), bukan
	 * perbandingan status yang disalin ke sini. Sejak V2 kegiatan punya status
	 * `DIUSULKAN`, dan usulan mentah tidak boleh pernah tampil sebagai agenda resmi
	 * (risiko R-09).
	 */
	publishedEvents = $derived(
		this.events
			.filter((event) => event.isPubliclyVisible)
			.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
	);

	/** Anggota berstatus aktif. */
	activeAwardees = $derived(this.awardees.filter((awardee) => awardee.isActive));

	/** Katalog kosong sama sekali — dipakai halaman untuk memilih empty state. */
	isEmpty = $derived(this.awardees.length === 0 && this.stories.length === 0);

	/**
	 * Memasang data demo bila perlu, lalu memuat seluruh koleksi ke state.
	 *
	 * @param {{force?: boolean}} [opsi] `force: true` memuat ulang meski katalog
	 *   sudah terisi — dipakai setelah data berubah, mis. cerita disetujui admin.
	 * @returns {Promise<void>}
	 */
	async load({ force = false } = {}) {
		if (!browser) return;
		if (this.loaded && !force) return;
		if (this.#pemuatan && !force) return this.#pemuatan;

		this.#pemuatan = this.#muat();
		try {
			await this.#pemuatan;
		} finally {
			this.#pemuatan = null;
		}
	}

	/**
	 * Memuat ulang seluruh koleksi.
	 * @returns {Promise<void>}
	 */
	async refresh() {
		return this.load({ force: true });
	}

	/**
	 * Cerita berdasarkan slug — jalur baca halaman `/cerita/[slug]`.
	 * @param {string} slug
	 * @returns {import('$lib/domain/entities/Story.js').Story|null}
	 */
	storyBySlug(slug) {
		return this.stories.find((story) => story.slug === slug) ?? null;
	}

	/**
	 * Gerakan berdasarkan slug.
	 * @param {string} slug
	 * @returns {import('$lib/domain/entities/Movement.js').Movement|null}
	 */
	movementBySlug(slug) {
		return this.movements.find((movement) => movement.slug === slug) ?? null;
	}

	/**
	 * Satu entity dari koleksi mana pun berdasarkan identitasnya.
	 * @param {string} kind Salah satu CatalogKind.
	 * @param {string} id
	 * @returns {any|null} null bila koleksi atau identitasnya tidak dikenal.
	 */
	byId(kind, id) {
		const koleksi = this.#koleksi(kind);
		return koleksi.find((entry) => entry.id === id) ?? null;
	}

	/**
	 * Cerita milik seorang anggota, terbaru lebih dulu.
	 * @param {string} awardeeId
	 * @returns {import('$lib/domain/entities/Story.js').Story[]}
	 */
	storiesByAwardee(awardeeId) {
		return this.stories
			.filter((story) => story.authorId === awardeeId)
			.sort((a, b) => (b.submittedAt?.getTime() ?? 0) - (a.submittedAt?.getTime() ?? 0));
	}

	/**
	 * Kegiatan yang akan datang dan boleh dilihat publik, paling dekat lebih dulu.
	 *
	 * Waktu acuan menjadi parameter — bukan `new Date()` yang tersembunyi di dalam —
	 * supaya halaman dapat memakai tanggal acuan yang sama dengan data demo.
	 *
	 * Sumbernya WAJIB `publishedEvents`, bukan daftar mentah `events`. `isUpcoming()`
	 * hanya mengecualikan kegiatan yang dibatalkan; tanpa penyaring publik yang
	 * mendahuluinya, usulan mentah bertanggal masa depan akan tampil di halaman
	 * publik sebagai agenda resmi (risiko R-09).
	 *
	 * @param {Date} [pada] Waktu acuan.
	 * @param {number} [limit] Banyaknya butir teratas; `0` berarti seluruhnya.
	 * @returns {import('$lib/domain/entities/CommunityEvent.js').CommunityEvent[]}
	 */
	upcomingEvents(pada = new Date(), limit = 0) {
		const mendatang = this.publishedEvents.filter((event) => event.isUpcoming(pada));
		return limit > 0 ? mendatang.slice(0, limit) : mendatang;
	}

	/**
	 * Anggota sebuah komunitas.
	 * @param {string} community Salah satu CommunityType.
	 * @returns {import('$lib/domain/entities/Awardee.js').Awardee[]}
	 */
	awardeesByCommunity(community) {
		return this.awardees.filter((awardee) => awardee.community === community);
	}

	/**
	 * Koleksi yang dinaungi sebuah jenis.
	 * @param {string} kind
	 * @returns {readonly any[]}
	 */
	#koleksi(kind) {
		const peta = {
			[CatalogKind.BROADCAST]: this.broadcasts,
			[CatalogKind.EVENT]: this.events,
			[CatalogKind.MOVEMENT]: this.movements,
			[CatalogKind.STORY]: this.stories,
			[CatalogKind.REWARD]: this.rewards,
			[CatalogKind.AWARDEE]: this.awardees
		};
		return peta[kind] ?? [];
	}

	/**
	 * Pemuatan sesungguhnya. Seluruh koleksi dibaca dalam satu gelombang paralel;
	 * membacanya berurutan akan menumpuk enam kali waktu buka transaksi IndexedDB
	 * tanpa alasan, karena tidak satu pun bergantung pada hasil yang lain.
	 * @returns {Promise<void>}
	 */
	async #muat() {
		this.loading = true;
		this.error = null;
		try {
			await bootstrapDatabase();
			const [broadcasts, events, movements, stories, rewards, awardees] = await Promise.all([
				broadcastRepository.getAll(),
				eventRepository.getAll(),
				movementRepository.getAll(),
				storyRepository.getAll(),
				rewardRepository.getAll(),
				awardeeRepository.getAll()
			]);

			this.broadcasts = broadcasts;
			this.events = events;
			this.movements = movements;
			this.stories = stories;
			this.rewards = rewards;
			this.awardees = awardees;
			this.loaded = true;
		} catch (penyebab) {
			this.error =
				penyebab instanceof Error
					? penyebab.message
					: 'Data komunitas gagal dimuat dari penyimpanan peramban.';
		} finally {
			this.loading = false;
		}
	}
}

/** Instans tunggal yang dipakai seluruh aplikasi. */
export const catalog = new CatalogStore();
