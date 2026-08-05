/**
 * SERVICE — Alur Editorial Konten.
 *
 * Tanggung jawab: mengeksekusi transisi status cerita dan kegiatan beserta efek
 * sampingnya (jejak keputusan, cap waktu, penyimpanan), sesudah memastikan
 * transisinya sah menurut peta transisi domain.
 *
 * Lima keputusan desain yang tidak terbaca dari kode:
 *
 * 1. **Legalitas transisi TIDAK ditulis ulang di sini.** Setiap method bertanya
 *    kepada `canTransitionStory`/`canTransitionEvent`. Sebelum peta itu ada,
 *    aturannya hidup sebagai tombol yang dirender atau tidak dirender — dan
 *    tombol yang tidak dirender tetap dapat dipanggil lewat konsol peramban.
 * 2. **Urutan pemeriksaan dikunci:** (a) legalitas transisi, (b) konflik
 *    kepentingan, (c) gerbang entity, (d) argumen wajib. Urutan ini membuat pesan
 *    galat menjelaskan hambatan yang paling mendasar lebih dulu, bukan hambatan
 *    yang kebetulan diperiksa duluan.
 * 3. **Kegagalan aturan bisnis TIDAK dilempar.** Ia dikembalikan sebagai
 *    `{ ok:false, entity:null, reason }`. Yang dilempar hanyalah kesalahan
 *    pemrograman. Penolakan yang dilempar memaksa setiap pemanggil membungkus
 *    dirinya dengan `try/catch`, dan yang lupa akan merobohkan halaman karena
 *    verifikator menekan tombol yang memang sudah seharusnya ditolak.
 * 4. **Urutan argumen `(entity, actor, …argumenLain)` berlaku untuk SELURUH
 *    method, tanpa pengecualian.** Menukar dua argumen yang sama-sama "objek atau
 *    string" tidak melempar apa pun: `archiveStory(story, 'takedown', account)`
 *    akan menyimpan alasan arsip berisi objek akun dan memeriksa konflik
 *    kepentingan terhadap sebuah string. Rusaknya senyap.
 * 5. **`pipeline()` dan `slaCompliance()` adalah method kelas ini**, bukan service
 *    metrik keempat: agregasinya bertumpu pada repository yang sudah disuntik ke
 *    sini, dan kelas terpisah hanya akan melahirkan sumber kebenaran kedua atas
 *    antrean yang sama. Rumusnya sendiri tinggal di `_editorial-metrics.js` —
 *    pemecahan berkas karena batas ukuran modul, bukan pemecahan tanggung jawab.
 * 6. **Consent penulis adalah gerbang yang HIDUP, dan sumber kebenarannya satu.**
 *    Sumbernya adalah rekaman consent milik penulis; `Story.consentActive` hanyalah
 *    proyeksinya, dan `withdrawOnConsentRevoked()` satu-satunya yang menulis
 *    proyeksi itu. Setiap keputusan yang membuat naskah terlihat publik —
 *    `approveStory` dan `publishStory` — membaca ULANG penulisnya lewat
 *    `awardeeRepo` sebelum memutuskan. Persetujuan yang sah pekan lalu bukan
 *    persetujuan yang sah hari ini, dan pencabutan tidak pernah lewat meja
 *    verifikator.
 *
 * @see docs/12-BUILD-CONTRACT-V2.md — §2.9 kontrak export, §2.2 peta transisi wajib
 * @see docs/10-REVISION-SPEC.md — §5.3 tabel transisi cerita, §5.5 konflik kepentingan, §5.6 SLA
 */

import { canTransitionEvent, canTransitionStory } from '../constants/content-workflow.js';
import { STORY_ARCHIVE_REASON, STORY_STATUS } from '../constants/community.js';
import { CommunityEvent, EventStatus } from '../entities/CommunityEvent.js';
import { SensitivityScan, Story } from '../entities/Story.js';
import { AccessPolicy } from '../policies/AccessPolicy.js';
import { corongEditorial, kepatuhanSla, slaDari } from './_editorial-metrics.js';

/**
 * Sebab penolakan sebuah keputusan editorial.
 * @readonly
 * @enum {string}
 */
export const ReviewFailure = Object.freeze({
	TRANSISI_TERLARANG: 'TRANSISI_TERLARANG',
	PERAN_TIDAK_BERWENANG: 'PERAN_TIDAK_BERWENANG',
	KONFLIK_KEPENTINGAN: 'KONFLIK_KEPENTINGAN',
	BELUM_LAYAK_KIRIM: 'BELUM_LAYAK_KIRIM',
	BELUM_LAYAK_TERBIT: 'BELUM_LAYAK_TERBIT',
	CATATAN_WAJIB: 'CATATAN_WAJIB',
	SENSITIVITAS_BELUM_DICEK: 'SENSITIVITAS_BELUM_DICEK',
	CONSENT_DICABUT: 'CONSENT_DICABUT'
});

/**
 * Pesan Bahasa Indonesia tiap sebab penolakan.
 *
 * Kalimatnya menyebut APA YANG HARUS DILAKUKAN, bukan sekadar apa yang gagal:
 * pesan penolakan yang tidak memberi langkah berikutnya membuat verifikator
 * mencoba tombol yang sama berulang kali.
 * @type {Readonly<Record<string, string>>}
 */
export const REVIEW_FAILURE_MESSAGE = Object.freeze({
	[ReviewFailure.TRANSISI_TERLARANG]:
		'Perpindahan status ini tidak tersedia dari keadaan naskah saat ini.',
	[ReviewFailure.PERAN_TIDAK_BERWENANG]: 'Peran Anda tidak berwenang melakukan tindakan ini.',
	[ReviewFailure.KONFLIK_KEPENTINGAN]:
		'Anda pengusul konten ini — keputusannya harus diambil verifikator lain.',
	[ReviewFailure.BELUM_LAYAK_KIRIM]:
		'Naskah belum memenuhi syarat pengiriman: panjang minimum, lampiran dokumentasi, dan tag ESG wajib terisi.',
	[ReviewFailure.BELUM_LAYAK_TERBIT]:
		'Naskah tidak lolos pemeriksaan ulang gerbang penerbitan. Periksa consent penulis, hasil pemindaian data sensitif, validasi PF, dan lampiran.',
	[ReviewFailure.CATATAN_WAJIB]: 'Keputusan ini wajib disertai catatan atau alasan tertulis.',
	[ReviewFailure.SENSITIVITAS_BELUM_DICEK]:
		'Checklist data sensitif wajib dinyatakan lolos secara eksplisit sebelum naskah disetujui.',
	[ReviewFailure.CONSENT_DICABUT]:
		'Penulis naskah ini sudah mencabut persetujuan publikasinya. Naskah tidak dapat disetujui maupun diterbitkan oleh siapa pun sampai penulis memberikan persetujuan itu kembali.'
});

/**
 * Catatan yang ditempelkan pada naskah yang ditarik karena consent dicabut.
 * Ditulis sekali di sini supaya jejak audit seluruh penarikan berbunyi sama dan
 * dapat dicari sebagai satu kelompok saat pemeriksaan tata kelola.
 * @type {string}
 */
export const CATATAN_PENARIKAN_CONSENT =
	'Ditarik dari publik secara otomatis: penulis mencabut persetujuan publikasi. Naskah diarsipkan, bukan dihapus.';

/**
 * @typedef {object} ReviewResult
 * @property {boolean} ok
 * @property {object|null} entity  Entity sesudah tersimpan; `null` bila ditolak.
 * @property {string} reason       Salah satu ReviewFailure; `''` bila berhasil.
 */

/**
 * Hasil kaskade pencabutan consent. Bentuknya sengaja BERBEDA dari `ReviewResult`:
 * ini bukan satu keputusan atas satu entity, melainkan satu operasi atas sekumpulan
 * naskah, dan memaksakan bentuk `entity` tunggal akan menyembunyikan berapa naskah
 * yang sebenarnya tersentuh — justru angka itulah yang harus dilaporkan ke penulis.
 *
 * @typedef {object} ConsentCascadeResult
 * @property {boolean} ok
 * @property {Story[]} withdrawn Naskah yang ditarik dari publik dan diarsipkan.
 * @property {Story[]} blocked   Naskah antrean yang kini berhenti dapat disetujui.
 * @property {string} reason     Salah satu ReviewFailure; `''` bila berhasil.
 */

/** Bentuk penolakan yang seragam. */
const DITOLAK = Object.freeze({ ok: false, entity: null });

/**
 * Apakah sebuah catatan atau alasan benar-benar terisi.
 * @param {unknown} teks
 * @returns {boolean}
 */
function adaCatatan(teks) {
	return typeof teks === 'string' && teks.trim() !== '';
}

export class ContentReviewService {
	/** @type {import('../repositories/Repository.js').Repository} */
	#storyRepo;
	/** @type {import('../repositories/Repository.js').Repository} */
	#eventRepo;
	/** @type {import('../repositories/Repository.js').Repository|null} */
	#awardeeRepo;
	/** @type {() => Date} */
	#clock;

	/**
	 * @param {object} deps
	 * @param {import('../repositories/Repository.js').Repository} deps.storyRepo
	 * @param {import('../repositories/Repository.js').Repository} deps.eventRepo
	 * @param {import('../repositories/Repository.js').Repository} [deps.awardeeRepo]
	 *   Sumber pembacaan ulang consent penulis. Opsional karena pemakai yang tidak
	 *   pernah menyetujui maupun menerbitkan naskah (mis. konsol arsip admin) tidak
	 *   perlu memikulnya. Tanpa repo ini gerbang consent TIDAK melemah: ia jatuh ke
	 *   proyeksi `Story.consentActive` yang dijaga `withdrawOnConsentRevoked()`,
	 *   sehingga hasilnya tetap menolak — yang hilang hanyalah pembacaan ulang
	 *   lapis kedua.
	 * @param {() => Date} [deps.clock] Sumber waktu; disuntik agar uji bersifat deterministik.
	 * @throws {TypeError} bila ada repository wajib yang tidak diberikan.
	 */
	constructor({ storyRepo, eventRepo, awardeeRepo, clock } = {}) {
		for (const [nama, repo] of Object.entries({ storyRepo, eventRepo })) {
			if (!repo) throw new TypeError(`ContentReviewService membutuhkan ${nama}.`);
		}
		this.#storyRepo = storyRepo;
		this.#eventRepo = eventRepo;
		this.#awardeeRepo = awardeeRepo ?? null;
		this.#clock = clock ?? (() => new Date());
	}

	// ---------------------------------------------------------------- cerita

	/**
	 * T-01 & T-04 — penulis mengajukan naskahnya untuk ditinjau.
	 *
	 * Pengajuan ulang dari `PERLU_REVISI` menaikkan `revisionCount`: angka itu
	 * adalah sinyal naskah yang berputar-putar, dan ia hanya bermakna bila dihitung
	 * pada saat naskah benar-benar kembali ke antrean.
	 *
	 * @param {Story|object} story
	 * @param {import('../entities/UserAccount.js').UserAccount} actor
	 * @returns {Promise<ReviewResult>}
	 */
	async submitStory(story, actor) {
		const naskah = Story.from(story);
		const salah = ContentReviewService.#periksaAktor(actor);
		if (salah) return ContentReviewService.#tolak(salah);
		const sah = canTransitionStory(naskah.status, STORY_STATUS.DIAJUKAN, actor.role);
		if (!sah) return ContentReviewService.#tolak(ReviewFailure.TRANSISI_TERLARANG);
		// Kepemilikan, bukan konflik kepentingan: pada jalur pengajuan, aktor JUSTRU
		// harus penulisnya sendiri. Pemeriksaan yang sama dibalik arahnya.
		if (!AccessPolicy.isSelfReview(actor.awardeeId, naskah.authorId)) {
			return ContentReviewService.#tolak(ReviewFailure.PERAN_TIDAK_BERWENANG);
		}
		if (!naskah.isSubmittable) {
			return ContentReviewService.#tolak(ReviewFailure.BELUM_LAYAK_KIRIM);
		}

		const pengajuanUlang = naskah.status === STORY_STATUS.PERLU_REVISI;
		return this.#simpanCerita(
			naskah.withChanges({
				status: STORY_STATUS.DIAJUKAN,
				submittedAt: this.#clock(),
				revisionCount: pengajuanUlang ? naskah.revisionCount + 1 : naskah.revisionCount
			})
		);
	}

	/**
	 * T-02 — verifikator mengambil naskah dari antrean.
	 *
	 * @param {Story|object} story
	 * @param {import('../entities/UserAccount.js').UserAccount} actor
	 * @returns {Promise<ReviewResult>}
	 */
	async startReview(story, actor) {
		const naskah = Story.from(story);
		const salah = this.#periksaKeputusanCerita(naskah, actor, STORY_STATUS.REVIEW);
		if (salah) return ContentReviewService.#tolak(salah);

		return this.#simpanCerita(
			naskah.withChanges({
				status: STORY_STATUS.REVIEW,
				reviewerId: actor.id,
				reviewedAt: this.#clock()
			})
		);
	}

	/**
	 * T-05 — verifikator menyetujui naskah.
	 *
	 * `sensitivityConfirmed` wajib dinyatakan `true` secara eksplisit. Tiadanya
	 * tanda bahaya bukan pernyataan aman: checklist data sensitif harus dijalankan
	 * seseorang, dan persetujuan inilah satu-satunya titik tempat itu tercatat.
	 *
	 * Consent penulis diperiksa DI SINI, bukan hanya saat penerbitan. Persetujuan
	 * adalah pernyataan bahwa naskah ini lolos dan siap tayang; menyetujui naskah
	 * yang penulisnya sudah mencabut persetujuan berarti menaruh naskah itu satu
	 * tombol saja dari ruang publik, dan tombol itu dapat ditekan orang lain yang
	 * tidak pernah membaca riwayat consent-nya.
	 *
	 * @param {Story|object} story
	 * @param {import('../entities/UserAccount.js').UserAccount} actor
	 * @param {{sensitivityConfirmed: boolean, note?: string}} opsi
	 * @returns {Promise<ReviewResult>}
	 */
	async approveStory(story, actor, { sensitivityConfirmed, note = '' } = {}) {
		const naskah = Story.from(story);
		const salah = this.#periksaKeputusanCerita(naskah, actor, STORY_STATUS.DISETUJUI);
		if (salah) return ContentReviewService.#tolak(salah);
		if (!(await this.#consentPenulisAktif(naskah))) {
			return ContentReviewService.#tolak(ReviewFailure.CONSENT_DICABUT);
		}
		if (sensitivityConfirmed !== true) {
			return ContentReviewService.#tolak(ReviewFailure.SENSITIVITAS_BELUM_DICEK);
		}

		const sekarang = this.#clock();
		return this.#simpanCerita(
			naskah.withChanges({
				status: STORY_STATUS.DISETUJUI,
				sensitivityScan: SensitivityScan.CLEAR,
				pfValidation: { validatorId: actor.id, validatedAt: sekarang },
				reviewerId: actor.id,
				reviewedAt: sekarang,
				reviewNotes: ContentReviewService.#denganCatatan(naskah, actor, note, sekarang)
			})
		);
	}

	/**
	 * T-03 — verifikator mengembalikan naskah untuk diperbaiki.
	 *
	 * @param {Story|object} story
	 * @param {import('../entities/UserAccount.js').UserAccount} actor
	 * @param {string} note Catatan terstruktur: bagian mana dan mengapa. Wajib terisi.
	 * @returns {Promise<ReviewResult>}
	 */
	async requestRevision(story, actor, note) {
		const naskah = Story.from(story);
		const salah = this.#periksaKeputusanCerita(naskah, actor, STORY_STATUS.PERLU_REVISI);
		if (salah) return ContentReviewService.#tolak(salah);
		if (!adaCatatan(note)) return ContentReviewService.#tolak(ReviewFailure.CATATAN_WAJIB);

		const sekarang = this.#clock();
		return this.#simpanCerita(
			naskah.withChanges({
				status: STORY_STATUS.PERLU_REVISI,
				reviewerId: actor.id,
				reviewedAt: sekarang,
				reviewNotes: ContentReviewService.#denganCatatan(naskah, actor, note, sekarang)
			})
		);
	}

	/**
	 * T-06 — verifikator menerbitkan naskah ke ruang publik.
	 *
	 * Gerbang `isPublishable` diperiksa ULANG di sini, bukan dipercayakan pada hasil
	 * saat persetujuan. Consent dapat dicabut penulisnya, atau kedaluwarsa sendiri,
	 * di antara persetujuan dan penerbitan — dan keduanya terjadi tanpa satu pun
	 * peristiwa yang melewati verifikator.
	 *
	 * Consent diperiksa TERPISAH dari `isPublishable` meski `isPublishable` juga
	 * memuatnya: sebab penolakan yang berbunyi "periksa consent, pemindaian,
	 * validasi PF, dan lampiran" tidak memberi tahu verifikator yang mana. Naskah
	 * yang tertahan karena pencabutan hak oleh penulisnya bukan naskah yang kurang
	 * lampiran, dan tindakan berikutnya bagi keduanya sama sekali berbeda.
	 *
	 * @param {Story|object} story
	 * @param {import('../entities/UserAccount.js').UserAccount} actor
	 * @returns {Promise<ReviewResult>}
	 */
	async publishStory(story, actor) {
		const naskah = Story.from(story);
		const salah = this.#periksaKeputusanCerita(naskah, actor, STORY_STATUS.TERPUBLIKASI);
		if (salah) return ContentReviewService.#tolak(salah);
		if (!(await this.#consentPenulisAktif(naskah))) {
			return ContentReviewService.#tolak(ReviewFailure.CONSENT_DICABUT);
		}
		if (!naskah.isPublishable) {
			return ContentReviewService.#tolak(ReviewFailure.BELUM_LAYAK_TERBIT);
		}

		return this.#simpanCerita(
			naskah.withChanges({
				status: STORY_STATUS.TERPUBLIKASI,
				publishedAt: this.#clock(),
				publishedById: actor.id
			})
		);
	}

	/**
	 * T-07 & T-08 — penarikan naskah dari publik atau penolakan permanen.
	 *
	 * Alasan wajib dipilih dari `STORY_ARCHIVE_REASON`, bukan teks bebas: arsip
	 * adalah catatan tata kelola yang dibaca kembali saat audit, dan alasan berupa
	 * kalimat karangan tidak dapat dikelompokkan maupun dihitung.
	 *
	 * @param {Story|object} story
	 * @param {import('../entities/UserAccount.js').UserAccount} actor
	 * @param {string} reason Salah satu STORY_ARCHIVE_REASON.
	 * @returns {Promise<ReviewResult>}
	 */
	async archiveStory(story, actor, reason) {
		const naskah = Story.from(story);
		const salah = this.#periksaKeputusanCerita(naskah, actor, STORY_STATUS.DIARSIPKAN);
		if (salah) return ContentReviewService.#tolak(salah);
		if (!adaCatatan(reason) || !Object.hasOwn(STORY_ARCHIVE_REASON, reason)) {
			return ContentReviewService.#tolak(ReviewFailure.CATATAN_WAJIB);
		}

		const sekarang = this.#clock();
		return this.#simpanCerita(
			naskah.withChanges({
				status: STORY_STATUS.DIARSIPKAN,
				archivedAt: sekarang,
				archiveReason: reason
			})
		);
	}

	/**
	 * T-09 — KASKADE PENCABUTAN CONSENT.
	 *
	 * Menarik seluruh naskah seorang penulis dari ruang publik dan menghentikan
	 * naskahnya yang masih di antrean, karena penulis mencabut persetujuan
	 * publikasinya. Inilah yang membuat janji di `/awardee/profil` benar-benar
	 * ditepati, bukan sekadar tertulis di layar.
	 *
	 * Empat keputusan yang tidak terbaca dari kode:
	 *
	 * 1. **Ini SATU-SATUNYA penulis proyeksi `Story.consentActive`.** Sumber
	 *    kebenarannya adalah rekaman consent penulis; naskah hanya memantulkannya.
	 *    Satu penulis berarti proyeksi tidak dapat menyimpang dari sumbernya.
	 * 2. **Peran aktor sengaja TIDAK diperiksa terhadap peta transisi.** Penarikan
	 *    ini bukan keputusan editorial — ia konsekuensi otomatis dari hak subjek
	 *    data atas datanya sendiri. Menundukkannya pada `TERPUBLIKASI → DIARSIPKAN
	 *    oleh VERIFIER` berarti awardee harus menunggu verifikator sebelum haknya
	 *    berlaku, dan penundaan itu persis yang dilarang docs/04 §4.5. Yang tetap
	 *    diperiksa adalah kelayakan aktor sebagai identitas (`#periksaAktor`), dan
	 *    lingkupnya dikunci mati: hanya naskah milik `authorId` ini, hanya menuju
	 *    `DIARSIPKAN`, hanya dengan alasan `CONSENT_DICABUT`.
	 * 3. **Naskah DIARSIPKAN, tidak dihapus.** Arsip beserta alasannya adalah bukti
	 *    tata kelola bahwa pencabutan benar-benar dieksekusi; menghapus barisnya
	 *    justru memusnahkan bukti kepatuhan yang diminta pilar Governance Hal 10.
	 * 4. **Naskah di antrean tidak diarsipkan, hanya dimatikan consent-nya.** Draf
	 *    dan naskah yang sedang ditinjau belum pernah terlihat publik, jadi tidak ada
	 *    yang perlu ditarik. Yang perlu dijamin hanyalah bahwa ia tidak dapat
	 *    disetujui maupun diterbitkan — dan itu dijamin `approveStory`/`publishStory`.
	 *    Mengarsipkannya akan menghanguskan naskah yang penulisnya mungkin ingin
	 *    ajukan lagi setelah memberikan persetujuan kembali.
	 *
	 * @param {import('../entities/Awardee.js').Awardee|{id: string}|string} author
	 *   Penulis yang mencabut persetujuan, atau id Awardee-nya.
	 * @param {import('../entities/UserAccount.js').UserAccount} actor Akun yang
	 *   mengeksekusi pencabutan; tercatat pada catatan peninjauan naskah.
	 * @returns {Promise<ConsentCascadeResult>}
	 * @throws {TypeError} bila id penulis tidak dapat ditentukan — itu kesalahan
	 *   pemrograman, bukan penolakan kebijakan.
	 */
	async withdrawOnConsentRevoked(author, actor) {
		const authorId = typeof author === 'string' ? author : (author?.id ?? '');
		if (typeof authorId !== 'string' || authorId.trim() === '') {
			throw new TypeError('withdrawOnConsentRevoked membutuhkan Awardee penulis atau id-nya.');
		}
		const salah = ContentReviewService.#periksaAktor(actor);
		if (salah) return { ok: false, withdrawn: [], blocked: [], reason: salah };

		const sekarang = this.#clock();
		const seluruh = await this.#cerita();
		/** @type {Story[]} */
		const withdrawn = [];
		/** @type {Story[]} */
		const blocked = [];

		for (const naskah of seluruh) {
			if (naskah.authorId !== authorId) continue;
			// Naskah yang sudah tayang ATAU sudah disetujui adalah dua-duanya risiko:
			// yang pertama sedang terlihat, yang kedua tinggal satu tombol dari terlihat.
			const perluArsip =
				naskah.status === STORY_STATUS.TERPUBLIKASI || naskah.status === STORY_STATUS.DISETUJUI;
			const perluBlokir = naskah.consentActive === true;
			if (!perluArsip && !perluBlokir) continue;

			const perubahan = perluArsip
				? {
						consentActive: false,
						status: STORY_STATUS.DIARSIPKAN,
						archivedAt: sekarang,
						archiveReason: STORY_ARCHIVE_REASON.CONSENT_DICABUT,
						reviewNotes: ContentReviewService.#denganCatatan(
							naskah,
							actor,
							CATATAN_PENARIKAN_CONSENT,
							sekarang
						)
					}
				: { consentActive: false };

			const hasil = await this.#simpanCerita(naskah.withChanges(perubahan));
			(perluArsip ? withdrawn : blocked).push(/** @type {Story} */ (hasil.entity));
		}

		return { ok: true, withdrawn, blocked, reason: '' };
	}

	// -------------------------------------------------------------- kegiatan

	/**
	 * E-01 — mengusulkan kegiatan ke antrean verifikator.
	 *
	 * Pengusul dicatat dari aktor, bukan dari masukan pemanggil: `proposedBy` adalah
	 * dasar pemeriksaan konflik kepentingan pada persetujuan, dan nilai yang boleh
	 * dikirim dari luar membuat pemeriksaan itu dapat dilewati hanya dengan mengetik
	 * id orang lain.
	 *
	 * @param {CommunityEvent|object} event
	 * @param {import('../entities/UserAccount.js').UserAccount} actor
	 * @returns {Promise<ReviewResult>}
	 */
	async proposeEvent(event, actor) {
		const kegiatan = CommunityEvent.from(event);
		const salah = ContentReviewService.#periksaAktor(actor);
		if (salah) return ContentReviewService.#tolak(salah);
		const sah = canTransitionEvent(kegiatan.status, EventStatus.DIUSULKAN, actor.role);
		if (!sah) return ContentReviewService.#tolak(ReviewFailure.TRANSISI_TERLARANG);
		// Draf milik orang lain tidak boleh diajukan atas namanya.
		const drafOrangLain =
			kegiatan.proposedBy !== '' && !AccessPolicy.isSelfReview(actor.id, kegiatan.proposedBy);
		if (drafOrangLain) return ContentReviewService.#tolak(ReviewFailure.PERAN_TIDAK_BERWENANG);

		return this.#simpanKegiatan(
			kegiatan.withChanges({
				status: EventStatus.DIUSULKAN,
				proposedBy: actor.id,
				proposedByRole: actor.role,
				submittedAt: this.#clock()
			})
		);
	}

	/**
	 * E-02 — menyetujui usulan sehingga terbit ke kalender publik.
	 *
	 * Pengusul dilarang menyetujui usulannya sendiri. Larangan ini tidak pernah
	 * memblokir agenda internal karena dua akun verifikator wajib ada sejak seed —
	 * dan justru karena jalan keluarnya selalu tersedia, larangan ini dapat
	 * ditegakkan tanpa pengecualian.
	 *
	 * @param {CommunityEvent|object} event
	 * @param {import('../entities/UserAccount.js').UserAccount} actor
	 * @returns {Promise<ReviewResult>}
	 */
	async approveEvent(event, actor) {
		const kegiatan = CommunityEvent.from(event);
		const salah = this.#periksaKeputusanKegiatan(kegiatan, actor, EventStatus.TERJADWAL);
		if (salah) return ContentReviewService.#tolak(salah);

		const sekarang = this.#clock();
		return this.#simpanKegiatan(
			kegiatan.withChanges({
				status: EventStatus.TERJADWAL,
				reviewedBy: actor.id,
				reviewedAt: sekarang,
				publishedAt: sekarang
			})
		);
	}

	/**
	 * E-03 — menolak usulan kegiatan.
	 *
	 * @param {CommunityEvent|object} event
	 * @param {import('../entities/UserAccount.js').UserAccount} actor
	 * @param {string} note Alasan penolakan; wajib terisi.
	 * @returns {Promise<ReviewResult>}
	 */
	async rejectEvent(event, actor, note) {
		const kegiatan = CommunityEvent.from(event);
		const salah = this.#periksaKeputusanKegiatan(kegiatan, actor, EventStatus.DITOLAK);
		if (salah) return ContentReviewService.#tolak(salah);
		if (!adaCatatan(note)) return ContentReviewService.#tolak(ReviewFailure.CATATAN_WAJIB);

		return this.#simpanKegiatan(
			kegiatan.withChanges({
				status: EventStatus.DITOLAK,
				reviewedBy: actor.id,
				reviewedAt: this.#clock(),
				reviewNote: note.trim()
			})
		);
	}

	/**
	 * E-05 — membatalkan kegiatan yang sudah terjadwal atau sedang berlangsung.
	 *
	 * Pembatalan sengaja TIDAK diperiksa terhadap konflik kepentingan: membatalkan
	 * kegiatan sendiri bukan menguntungkan diri sendiri, dan agenda yang batal harus
	 * dapat dicabut dalam hitungan menit oleh siapa pun yang berwenang.
	 *
	 * @param {CommunityEvent|object} event
	 * @param {import('../entities/UserAccount.js').UserAccount} actor
	 * @param {string} reason Alasan pembatalan; wajib terisi dan tersimpan pada catatan keputusan.
	 * @returns {Promise<ReviewResult>}
	 */
	async cancelEvent(event, actor, reason) {
		const kegiatan = CommunityEvent.from(event);
		const salah = ContentReviewService.#periksaAktor(actor);
		if (salah) return ContentReviewService.#tolak(salah);
		const sah = canTransitionEvent(kegiatan.status, EventStatus.DIBATALKAN, actor.role);
		if (!sah) return ContentReviewService.#tolak(ReviewFailure.TRANSISI_TERLARANG);
		if (!adaCatatan(reason)) return ContentReviewService.#tolak(ReviewFailure.CATATAN_WAJIB);

		return this.#simpanKegiatan(
			kegiatan.withChanges({
				status: EventStatus.DIBATALKAN,
				reviewedBy: actor.id,
				reviewedAt: this.#clock(),
				reviewNote: reason.trim()
			})
		);
	}

	// ------------------------------------------------------- antrean & metrik

	/**
	 * Antrean naskah yang menunggu tindakan verifikator, tertua lebih dulu.
	 *
	 * Urutan tertua-dulu disengaja: antrean yang menampilkan naskah terbaru di
	 * puncak membuat naskah yang paling lama menunggu tidak pernah tersentuh — dan
	 * justru itulah yang paling dekat melewati SLA.
	 * @returns {Promise<Story[]>}
	 */
	async storyQueue() {
		const naskah = await this.#cerita();
		return naskah
			.filter((story) => story.isInModeration)
			.sort((a, b) => (a.submittedAt?.getTime() ?? 0) - (b.submittedAt?.getTime() ?? 0));
	}

	/**
	 * Antrean usulan kegiatan yang menunggu keputusan, tertua lebih dulu.
	 * @returns {Promise<CommunityEvent[]>}
	 */
	async eventQueue() {
		const kegiatan = await this.#kegiatan();
		return kegiatan
			.filter((event) => event.isProposal)
			.sort(
				(a, b) =>
					(a.submittedAt?.getTime() ?? a.startsAt.getTime()) -
					(b.submittedAt?.getTime() ?? b.startsAt.getTime())
			);
	}

	/**
	 * Status SLA sebuah entity pada waktu tertentu.
	 *
	 * Statis dan murni supaya kartu antrean dapat memanggilnya tanpa menyentuh
	 * repository — sebuah daftar dua puluh baris tidak boleh berarti dua puluh
	 * pembacaan basis data.
	 *
	 * @param {Story|CommunityEvent|object} entity
	 * @param {Date} pada Waktu pemeriksaan.
	 * @returns {import('./_editorial-metrics.js').SlaStatus} `limit === 0` berarti
	 *   status ini memang tidak ber-SLA.
	 */
	static slaOf(entity, pada) {
		return slaDari(entity, pada);
	}

	/**
	 * Corong editorial pemasok chart konversi naskah: berapa naskah mencapai tiap
	 * tahap, dan berapa persen yang lolos dari tahap sebelumnya.
	 *
	 * @returns {Promise<{stage: string, count: number, conversionFromPrev: number}[]>}
	 */
	async pipeline() {
		return corongEditorial(await this.#cerita());
	}

	/**
	 * Kepatuhan SLA per antrean, pemasok papan beban verifikator.
	 *
	 * @returns {Promise<{queue: string, withinSla: number, breachedSla: number, medianDays: number}[]>}
	 */
	async slaCompliance() {
		const [naskah, kegiatan] = await Promise.all([this.#cerita(), this.#kegiatan()]);
		return kepatuhanSla(naskah, kegiatan, this.#clock());
	}

	// ------------------------------------------------------------- internal

	/**
	 * Memeriksa kelayakan aktor sebagai pengambil keputusan.
	 * @param {import('../entities/UserAccount.js').UserAccount} actor
	 * @returns {string} Kode ReviewFailure, atau `''` bila aktor layak.
	 */
	static #periksaAktor(actor) {
		if (!actor || typeof actor.role !== 'string' || typeof actor.id !== 'string') {
			return ReviewFailure.PERAN_TIDAK_BERWENANG;
		}
		// Akun terkunci atau nonaktif tetap dapat memegang objek akun di memori store
		// yang belum disegarkan; keputusannya ditolak di sini, bukan di antarmuka.
		if (actor.isActive === false) return ReviewFailure.PERAN_TIDAK_BERWENANG;
		return '';
	}

	/**
	 * Pemeriksaan berurutan untuk keputusan atas naskah: aktor, legalitas transisi,
	 * lalu konflik kepentingan.
	 * @param {Story} story
	 * @param {import('../entities/UserAccount.js').UserAccount} actor
	 * @param {string} tujuan Status tujuan.
	 * @returns {string} Kode ReviewFailure, atau `''` bila lolos.
	 */
	#periksaKeputusanCerita(story, actor, tujuan) {
		const salahAktor = ContentReviewService.#periksaAktor(actor);
		if (salahAktor) return salahAktor;
		if (!canTransitionStory(story.status, tujuan, actor.role)) return ReviewFailure.TRANSISI_TERLARANG;
		// Pertahanan berlapis: akun verifikator wajib ber-`awardeeId` null, sehingga
		// perbandingan ini tidak dapat menyala pada data yang sah. Ia dipasang untuk
		// menangkap data yang TIDAK sah — akun yang lolos invarian karena kekeliruan
		// migrasi kelak.
		if (AccessPolicy.isSelfReview(actor.awardeeId, story.authorId)) {
			return ReviewFailure.KONFLIK_KEPENTINGAN;
		}
		return '';
	}

	/**
	 * Pemeriksaan berurutan untuk keputusan atas usulan kegiatan.
	 * @param {CommunityEvent} event
	 * @param {import('../entities/UserAccount.js').UserAccount} actor
	 * @param {string} tujuan Status tujuan.
	 * @returns {string} Kode ReviewFailure, atau `''` bila lolos.
	 */
	#periksaKeputusanKegiatan(event, actor, tujuan) {
		const salahAktor = ContentReviewService.#periksaAktor(actor);
		if (salahAktor) return salahAktor;
		if (!canTransitionEvent(event.status, tujuan, actor.role)) return ReviewFailure.TRANSISI_TERLARANG;
		if (AccessPolicy.isSelfReview(actor.id, event.proposedBy)) {
			return ReviewFailure.KONFLIK_KEPENTINGAN;
		}
		return '';
	}

	/**
	 * Apakah persetujuan publikasi yang mendasari sebuah naskah masih hidup PADA
	 * SAAT INI.
	 *
	 * Konjungtif atas dua pembacaan yang berbeda tingkatannya, dan keduanya wajib
	 * setuju:
	 * - `awardeeRepo` — keadaan penulis yang dibaca ulang detik ini juga. Inilah
	 *   pembacaan yang membuat gerbang ini hidup, bukan potret beku.
	 * - `story.hasActiveConsent` — proyeksi pada naskah itu sendiri, yang juga
	 *   menjawab pertanyaan berbeda: apakah naskah INI ditulis di atas sebuah
	 *   rekaman consent (`consentId`), atau tidak pernah punya dasar sama sekali.
	 *
	 * Keduanya tidak saling menggantikan, dan tidak boleh dijadikan "yang paling
	 * baru menang": penulis yang consent-nya aktif tetap tidak boleh menerbitkan
	 * naskah yang tidak pernah punya rekaman consent, dan naskah yang proyeksinya
	 * masih menyala tidak boleh terbit bila penulisnya sudah mencabut.
	 *
	 * @param {Story} story
	 * @returns {Promise<boolean>}
	 */
	async #consentPenulisAktif(story) {
		if (!story.hasActiveConsent) return false;
		if (!this.#awardeeRepo) return true;
		const penulis = await this.#awardeeRepo.getById(story.authorId);
		// Penulis yang tidak ditemukan bukan izin. Ia berarti kita tidak dapat
		// membuktikan consent-nya, dan naskah yang tidak dapat dibuktikan dasarnya
		// tidak boleh tayang.
		if (!penulis) return false;
		return penulis.consentActive === true;
	}

	/**
	 * Menyusun daftar catatan peninjauan dengan satu catatan baru di ujungnya.
	 * @param {Story} story
	 * @param {import('../entities/UserAccount.js').UserAccount} actor
	 * @param {string} note
	 * @param {Date} pada
	 * @returns {{reviewerId: string, note: string, at: string}[]}
	 */
	static #denganCatatan(story, actor, note, pada) {
		const lama = story.reviewNotes.map((catatan) => ({ ...catatan }));
		if (!adaCatatan(note)) return lama;
		return [...lama, { reviewerId: actor.id, note: note.trim(), at: pada.toISOString() }];
	}

	/** @returns {Promise<Story[]>} */
	async #cerita() {
		const baris = await this.#storyRepo.getAll();
		return baris.map((row) => Story.from(row));
	}

	/** @returns {Promise<CommunityEvent[]>} */
	async #kegiatan() {
		const baris = await this.#eventRepo.getAll();
		return baris.map((row) => CommunityEvent.from(row));
	}

	/**
	 * Menyimpan naskah dan membungkusnya sebagai hasil berhasil.
	 * @param {Story} story
	 * @returns {Promise<ReviewResult>}
	 */
	async #simpanCerita(story) {
		const tersimpan = await this.#storyRepo.save(story);
		return { ok: true, entity: tersimpan ? Story.from(tersimpan) : story, reason: '' };
	}

	/**
	 * Menyimpan kegiatan dan membungkusnya sebagai hasil berhasil.
	 * @param {CommunityEvent} event
	 * @returns {Promise<ReviewResult>}
	 */
	async #simpanKegiatan(event) {
		const tersimpan = await this.#eventRepo.save(event);
		return { ok: true, entity: tersimpan ? CommunityEvent.from(tersimpan) : event, reason: '' };
	}

	/**
	 * Bentuk penolakan yang seragam.
	 * @param {string} reason Salah satu ReviewFailure.
	 * @returns {ReviewResult}
	 */
	static #tolak(reason) {
		return { ...DITOLAK, reason };
	}
}
