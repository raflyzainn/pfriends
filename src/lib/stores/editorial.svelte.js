/**
 * STORE: Alur Editorial.
 *
 * Tanggung jawab: menjadi satu-satunya jalan zona Awardee dan zona Verifikator
 * mengubah status cerita dan usulan kegiatan, serta memegang antrean yang mereka
 * lihat.
 *
 * Empat keputusan yang tidak terbaca dari kode:
 *
 * 1. **Store ini tidak pernah memutuskan legalitas sebuah transisi.** Setiap metode
 *    meneruskan permintaan ke `ContentReviewService` dan hanya menerjemahkan
 *    jawabannya menjadi toast. Menyalin sebagian aturan ke sini: sekadar untuk
 *    menyembunyikan tombol lebih awal: akan melahirkan matriks transisi kedua
 *    yang cepat menyimpang dari yang pertama, dan yang menyimpang selalu yang
 *    lebih longgar.
 * 2. **Aktor diambil dari `session.account`, bukan dari parameter.** Identitas
 *    pengambil keputusan adalah dasar pemeriksaan konflik kepentingan; nilai yang
 *    boleh dikirim pemanggil membuat pemeriksaan itu dapat dilewati hanya dengan
 *    mengetik id orang lain.
 * 3. **Tidak ada metode yang melempar.** Seluruhnya mengembalikan `{ok, reason}`.
 *    Penolakan kebijakan adalah jawaban yang sah, bukan kegagalan program, dan
 *    halaman tidak boleh perlu membungkus setiap tombol dengan `try`.
 * 4. **`pipeline` diisi saat pemuatan, bukan diturunkan di dalam komponen.**
 *    Rumusnya hidup di domain (`ContentReviewService.pipeline()`), dan satu-satunya
 *    alasan ia tidak dapat ditulis sebagai `$derived` murni adalah karena sumbernya
 *    membaca repository: perhitungannya tetap milik domain.
 * 5. **Pencabutan consent masuk lewat store ini, bukan lewat repository langsung.**
 *    Menariknya kembali dari publik adalah transisi status cerita, dan seluruh
 *    transisi status cerita hanya boleh lewat `ContentReviewService`. Halaman profil
 *    yang menulis `stories` sendiri akan menjadi jalur kedua yang melewati peta
 *    transisi, jejak audit, dan alasan arsip sekaligus.
 *
 * @see docs/12-BUILD-CONTRACT-V2.md: §2.12 kontrak store editorial, §2.9 ContentReviewService
 * @see docs/10-REVISION-SPEC.md: §5 state machine konten
 */

import { browser } from '$app/environment';
import {
	ContentReviewService,
	REVIEW_FAILURE_MESSAGE
} from '$lib/domain/services/ContentReviewService.js';
import {
	awardeeRepository,
	eventRepository,
	storyRepository
} from '$lib/infrastructure/repositories/index.js';
import { bootstrapDatabase } from '$lib/infrastructure/seed/bootstrap.js';
import { session } from './session.svelte.js';
import { toast } from './toast.svelte.js';

/** Judul toast untuk keputusan yang ditolak kebijakan. */
const JUDUL_DITOLAK = 'Tindakan tidak dapat diproses';

/**
 * Pesan ketika tidak ada akun aktif di sesi. Bukan kode `ReviewFailure`: ini
 * kegagalan di sisi antarmuka, sebelum permintaan sempat sampai ke domain.
 */
const PESAN_TANPA_SESI = 'Sesi Anda sudah berakhir. Masuk kembali untuk melanjutkan.';

/** Pesan ketika penyimpanan peramban menolak menyimpan keputusan. */
const PESAN_GALAT_PENYIMPANAN =
	'Keputusan gagal disimpan di peramban ini. Muat ulang halaman, lalu ulangi.';

/** Kode sebab yang dipakai ketika kegagalan datang dari luar domain. */
const SEBAB_LUAR_DOMAIN = 'GAGAL_TEKNIS';

/**
 * @typedef {object} EditorialOutcome
 * @property {boolean} ok
 * @property {string} reason Kode `ReviewFailure`; `''` bila berhasil.
 */

class EditorialStore {
	/** @type {import('$lib/domain/entities/Story.js').Story[]} Naskah menunggu tindakan verifikator. */
	storyQueue = $state.raw([]);

	/** @type {import('$lib/domain/entities/CommunityEvent.js').CommunityEvent[]} Usulan kegiatan menunggu keputusan. */
	eventQueue = $state.raw([]);

	/** @type {import('$lib/domain/entities/Story.js').Story[]} Naskah milik awardee yang sedang masuk. */
	myStories = $state.raw([]);

	/** @type {import('$lib/domain/entities/CommunityEvent.js').CommunityEvent[]} Usulan kegiatan milik akun yang sedang masuk. */
	myEvents = $state.raw([]);

	/**
	 * @type {{stage: string, count: number, conversionFromPrev: number}[]}
	 * Corong editorial per tahap; pemasok chart konversi naskah.
	 */
	pipeline = $state.raw([]);

	/** @type {boolean} Antrean sedang dimuat. */
	loading = $state(false);

	/** @type {boolean} Sebuah keputusan sedang diproses: dipakai mematikan tombol. */
	working = $state(false);

	/** @type {string|null} Pesan galat pemuatan terakhir. */
	error = $state(null);

	/**
	 * @type {Date} Waktu acuan perhitungan SLA. Disimpan sebagai state, bukan
	 * dibaca ulang di setiap `$derived`: dua kartu yang menghitung "sudah berapa
	 * hari" dari dua `new Date()` berbeda akan sesekali menampilkan angka berbeda
	 * untuk baris yang sama.
	 */
	#asOf = $state(new Date());

	/** Banyaknya butir yang menunggu keputusan verifikator, dari kedua antrean. */
	reviewQueueCount = $derived(this.storyQueue.length + this.eventQueue.length);

	/** Naskah yang sudah melewati batas SLA. */
	storyOverdueCount = $derived(
		this.storyQueue.filter((story) => ContentReviewService.slaOf(story, this.#asOf).overdue).length
	);

	/** Usulan kegiatan yang sudah melewati batas SLA. */
	eventOverdueCount = $derived(
		this.eventQueue.filter((event) => ContentReviewService.slaOf(event, this.#asOf).overdue).length
	);

	/** @type {ContentReviewService|null} Dirakit malas; store ikut dievaluasi saat prerender. */
	#service = null;

	/** @type {Promise<void>|null} */
	#pemuatan = null;

	/**
	 * Memuat antrean, corong, dan daftar milik pengguna yang sedang masuk.
	 *
	 * Idempoten dan menahan pemanggilan serentak pada satu janji yang sama: layout
	 * zona dan halaman pertamanya dapat memanggilnya hampir bersamaan.
	 *
	 * @returns {Promise<void>}
	 */
	async load() {
		if (!browser) return;
		if (this.#pemuatan) return this.#pemuatan;

		this.#pemuatan = this.#muat();
		try {
			await this.#pemuatan;
		} finally {
			this.#pemuatan = null;
		}
	}

	/**
	 * Memuat ulang seluruh antrean. Dipanggil sesudah setiap keputusan yang berhasil.
	 * @returns {Promise<void>}
	 */
	async refresh() {
		if (!browser) return;
		await this.#muat();
	}

	// ------------------------------------------------------------------ cerita

	/**
	 * Penulis mengajukan naskahnya untuk ditinjau.
	 * @param {import('$lib/domain/entities/Story.js').Story|object} story
	 * @returns {Promise<EditorialOutcome>}
	 */
	async submitStory(story) {
		return this.#jalankan(
			(service, actor) => service.submitStory(story, actor),
			'Naskah dikirim ke antrean tinjauan.'
		);
	}

	/**
	 * Verifikator mengambil naskah dari antrean.
	 * @param {import('$lib/domain/entities/Story.js').Story|object} story
	 * @returns {Promise<EditorialOutcome>}
	 */
	async startReview(story) {
		return this.#jalankan(
			(service, actor) => service.startReview(story, actor),
			'Naskah masuk ke daftar tinjauan Anda.'
		);
	}

	/**
	 * Verifikator menyetujui naskah.
	 * @param {import('$lib/domain/entities/Story.js').Story|object} story
	 * @param {{sensitivityConfirmed: boolean, note?: string}} opsi Checklist data
	 *   sensitif wajib dinyatakan lolos secara eksplisit.
	 * @returns {Promise<EditorialOutcome>}
	 */
	async approve(story, opsi) {
		return this.#jalankan(
			(service, actor) => service.approveStory(story, actor, opsi),
			'Naskah disetujui dan siap diterbitkan.'
		);
	}

	/**
	 * Verifikator mengembalikan naskah untuk diperbaiki.
	 * @param {import('$lib/domain/entities/Story.js').Story|object} story
	 * @param {string} note Catatan terstruktur; wajib terisi.
	 * @returns {Promise<EditorialOutcome>}
	 */
	async requestRevision(story, note) {
		return this.#jalankan(
			(service, actor) => service.requestRevision(story, actor, note),
			'Catatan revisi terkirim ke penulis.'
		);
	}

	/**
	 * Verifikator menerbitkan naskah yang sudah disetujui.
	 * @param {import('$lib/domain/entities/Story.js').Story|object} story
	 * @returns {Promise<EditorialOutcome>}
	 */
	async publish(story) {
		return this.#jalankan(
			(service, actor) => service.publishStory(story, actor),
			'Naskah terbit di ruang publik.'
		);
	}

	/**
	 * Verifikator mengarsipkan naskah.
	 * @param {import('$lib/domain/entities/Story.js').Story|object} story
	 * @param {string} reason Salah satu `STORY_ARCHIVE_REASON`, bukan kalimat bebas.
	 * @returns {Promise<EditorialOutcome>}
	 */
	async archive(story, reason) {
		return this.#jalankan(
			(service, actor) => service.archiveStory(story, actor, reason),
			'Naskah diarsipkan beserta alasannya.'
		);
	}

	// ---------------------------------------------------------------- kegiatan

	/**
	 * Mengusulkan kegiatan ke antrean verifikator.
	 * @param {import('$lib/domain/entities/CommunityEvent.js').CommunityEvent|object} input
	 * @returns {Promise<EditorialOutcome>}
	 */
	async proposeEvent(input) {
		return this.#jalankanEvent(() => eventRepository.propose(input), 'Usulan kegiatan terkirim ke verifikator.');
	}

	/**
	 * Menyetujui usulan sehingga terbit ke kalender publik.
	 * @param {import('$lib/domain/entities/CommunityEvent.js').CommunityEvent|object} event
	 * @returns {Promise<EditorialOutcome>}
	 */
	async approveEvent(event) {
		return this.#jalankanEvent(() => eventRepository.decision(event.id, 'APPROVE'), 'Kegiatan terjadwal dan tampil di kalender publik.');
	}

	/**
	 * Menolak usulan kegiatan.
	 * @param {import('$lib/domain/entities/CommunityEvent.js').CommunityEvent|object} event
	 * @param {string} note Alasan penolakan; wajib terisi.
	 * @returns {Promise<EditorialOutcome>}
	 */
	async rejectEvent(event, note) {
		return this.#jalankanEvent(() => eventRepository.decision(event.id, 'REJECT', note), 'Usulan ditolak beserta alasannya.');
	}

	/**
	 * Membatalkan kegiatan yang sudah terjadwal atau sedang berlangsung.
	 *
	 * Melengkapi siklus hidup kegiatan PO-4. Sebelum G5, `cancelEvent` sudah ada
	 * lengkap di domain tetapi tidak pernah dipanggil dari mana pun: agenda yang
	 * batal hanya dapat dicabut dengan menyunting basis data, sehingga kalender
	 * publik menampilkan acara yang sudah tidak ada.
	 *
	 * @param {import('$lib/domain/entities/CommunityEvent.js').CommunityEvent|object} event
	 * @param {string} reason Alasan pembatalan; wajib terisi dan terbaca peserta.
	 * @returns {Promise<EditorialOutcome>}
	 */
	async cancelEvent(event, reason) {
		return this.#jalankanEvent(() => eventRepository.transition(event.id, 'DIBATALKAN', reason), 'Kegiatan dibatalkan dan ditarik dari kalender publik.');
	}

	async transitionEvent(event, status, note = '') {
		return this.#jalankanEvent(() => eventRepository.transition(event.id, status, note), 'Status kegiatan diperbarui.');
	}

	// ------------------------------------------------------------------ consent

	/**
	 * Menarik seluruh naskah penulis dari publik setelah ia mencabut persetujuan
	 * publikasinya, dan menghentikan naskahnya yang masih di antrean.
	 *
	 * Dipanggil `/awardee/profil` tepat sesudah rekaman consent disimpan. Ia tidak
	 * memakai `#jalankan` karena bentuk hasilnya berbeda: yang perlu dilaporkan ke
	 * penulis adalah BERAPA naskahnya yang tersentuh, bukan sekadar berhasil atau
	 * tidak. Toast-nya pun dirakit halaman, bukan di sini: kalimatnya menyatu
	 * dengan kalimat pencabutan consent itu sendiri.
	 *
	 * @param {string} [awardeeId] Id penulis; default awardee yang sedang masuk.
	 * @returns {Promise<{ok: boolean, withdrawn: number, blocked: number, reason: string}>}
	 */
	async applyConsentRevocation(awardeeId) {
		const actor = session.account;
		const penulisId = awardeeId ?? session.awardeeId;
		if (!actor || !penulisId) {
			toast.error(JUDUL_DITOLAK, PESAN_TANPA_SESI);
			return { ok: false, withdrawn: 0, blocked: 0, reason: SEBAB_LUAR_DOMAIN };
		}

		this.working = true;
		try {
			const hasil = await this.#reviewService().withdrawOnConsentRevoked(penulisId, actor);
			if (!hasil.ok) {
				toast.error(JUDUL_DITOLAK, REVIEW_FAILURE_MESSAGE[hasil.reason] ?? PESAN_GALAT_PENYIMPANAN);
				return { ok: false, withdrawn: 0, blocked: 0, reason: hasil.reason };
			}
			await this.#muat();
			return {
				ok: true,
				withdrawn: hasil.withdrawn.length,
				blocked: hasil.blocked.length,
				reason: ''
			};
		} catch {
			toast.error(JUDUL_DITOLAK, PESAN_GALAT_PENYIMPANAN);
			return { ok: false, withdrawn: 0, blocked: 0, reason: SEBAB_LUAR_DOMAIN };
		} finally {
			this.working = false;
		}
	}

	// ------------------------------------------------------------------ internal

	/**
	 * Kerangka satu keputusan editorial: memastikan ada aktor, memanggil domain,
	 * menerjemahkan jawaban menjadi toast, lalu menyegarkan antrean bila berhasil.
	 *
	 * Ditulis sekali di sini, bukan diulang sebelas kali: sebelas salinan berarti
	 * sebelas kesempatan lupa menyegarkan antrean sesudah keputusan berhasil.
	 *
	 * @param {(service: ContentReviewService, actor: import('$lib/domain/entities/UserAccount.js').UserAccount) => Promise<{ok: boolean, entity: object|null, reason: string}>} tindakan
	 * @param {string} pesanSukses Kalimat toast ketika keputusan diterima.
	 * @returns {Promise<EditorialOutcome>}
	 */
	async #jalankan(tindakan, pesanSukses) {
		const actor = session.account;
		if (!actor) {
			toast.error(JUDUL_DITOLAK, PESAN_TANPA_SESI);
			return { ok: false, reason: SEBAB_LUAR_DOMAIN };
		}

		this.working = true;
		try {
			const hasil = await tindakan(this.#reviewService(), actor);
			if (!hasil.ok) {
				toast.error(JUDUL_DITOLAK, REVIEW_FAILURE_MESSAGE[hasil.reason] ?? PESAN_GALAT_PENYIMPANAN);
				return { ok: false, reason: hasil.reason };
			}
			toast.success('Tersimpan', pesanSukses);
			await this.#muat();
			return { ok: true, reason: '' };
		} catch {
			toast.error(JUDUL_DITOLAK, PESAN_GALAT_PENYIMPANAN);
			return { ok: false, reason: SEBAB_LUAR_DOMAIN };
		} finally {
			this.working = false;
		}
	}

	async #jalankanEvent(tindakan, pesanSukses) {
		if (!session.account) { toast.error(JUDUL_DITOLAK, PESAN_TANPA_SESI); return { ok: false, reason: SEBAB_LUAR_DOMAIN }; }
		this.working = true;
		try { await tindakan(); toast.success('Tersimpan', pesanSukses); await Promise.all([this.#muat(), import('./catalog.svelte.js').then(({ catalog }) => catalog.refresh())]); return { ok: true, reason: '' }; }
		catch (error) { const message = error instanceof Error ? error.message : PESAN_GALAT_PENYIMPANAN; toast.error(JUDUL_DITOLAK, message); return { ok: false, reason: SEBAB_LUAR_DOMAIN }; }
		finally { this.working = false; }
	}

	/**
	 * Pemuatan sesungguhnya. Seluruh sumber dibaca dalam satu gelombang paralel;
	 * tidak satu pun bergantung pada hasil yang lain.
	 * @returns {Promise<void>}
	 */
	async #muat() {
		this.loading = true;
		this.error = null;
		try {
			await bootstrapDatabase();
			const service = this.#reviewService();
			const awardeeId = session.awardeeId;
			const accountId = session.accountId;

			const [storyQueue, eventQueue, pipeline, myStories, myEvents] = await Promise.all([
				service.storyQueue(),
				eventRepository.proposalQueue(),
				service.pipeline(),
				awardeeId ? storyRepository.byAuthor(awardeeId) : Promise.resolve([]),
				accountId ? eventRepository.proposedBy(accountId) : Promise.resolve([])
			]);

			this.storyQueue = storyQueue;
			this.eventQueue = eventQueue;
			this.pipeline = pipeline;
			this.myStories = myStories;
			this.myEvents = myEvents;
			this.#asOf = new Date();
		} catch (penyebab) {
			this.error =
				penyebab instanceof Error
					? penyebab.message
					: 'Antrean editorial gagal dimuat dari penyimpanan peramban.';
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Service tinjauan konten, dirakit sekali pada pemanggilan pertama.
	 * Store adalah composition root; domain tidak pernah menyentuh repository konkret.
	 * @returns {ContentReviewService}
	 */
	#reviewService() {
		this.#service ??= new ContentReviewService({
			storyRepo: storyRepository,
			eventRepo: eventRepository,
			// Pemasok pembacaan ULANG consent penulis pada saat keputusan diambil.
			// Zona inilah yang menyetujui dan menerbitkan naskah, jadi zona inilah
			// yang wajib memikul biaya satu pembacaan tambahan per keputusan.
			awardeeRepo: awardeeRepository
		});
		return this.#service;
	}
}

/** Instans tunggal yang dipakai seluruh aplikasi. */
export const editorial = new EditorialStore();
