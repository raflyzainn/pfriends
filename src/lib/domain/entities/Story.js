/**
 * ENTITY: Cerita Komunitas.
 *
 * Tanggung jawab: menyimpan satu naskah kontribusi awardee beserta seluruh
 * berkas yang menentukan boleh-tidaknya naskah itu tayang di ruang publik.
 *
 * Story adalah "story bank" Hal 9 sekaligus syarat kedua gerbang fitur publik
 * Hal 12. Ia juga satu-satunya entitas yang membawa risiko reputasi langsung bagi
 * Pertamina Foundation: sebuah cerita yang tayang tanpa consent, atau memuat NIK
 * seseorang, tidak bisa "ditarik kembali" dari internet. Karena itu `isPublishable`
 * bersifat konjungtif penuh dan tidak menyediakan jalur pintas untuk admin.
 *
 * Perhatikan pembagian tugas: entitas ini menjawab "apakah naskah ini siap
 * tayang". Pertanyaan "apakah PENULISNYA layak diangkat ke fitur publik"
 * melibatkan poin awardee dan dijawab FeatureEligibilityPolicy.
 *
 * @see docs/00-SOURCE-BRIEF.md: Hal 9 story bank, Hal 12 Minimum for public feature
 * @see docs/04-ESG-GOVERNANCE.md: §3 state machine cerita, §6 checklist data sensitif
 * @see docs/12-BUILD-CONTRACT-V2.md: §2.2 alur editorial, §4.1 L3 rename authorId dan field peninjauan
 */

import { ceritaTampilPublik, STORY_STATUS, STORY_STATUS_META } from '../constants/community.js';
import { EsgTag } from '../value-objects/EsgTag.js';

/**
 * Hasil pemindaian data sensitif (docs/04 §6). `MENUNGGU` adalah keadaan awal :
 * cerita yang belum dipindai tidak boleh dianggap aman hanya karena tidak
 * bertanda bahaya. Ketidaktahuan bukan izin.
 * @readonly
 * @enum {string}
 */
export const SensitivityScan = Object.freeze({
	MENUNGGU: 'MENUNGGU',
	CLEAR: 'CLEAR',
	FLAGGED: 'FLAGGED'
});

/** Panjang naskah minimum agar cerita layak diajukan (docs/03 §5.2). */
export const MIN_KATA_NASKAH = 300;

/**
 * @typedef {object} StoryOutcome
 * @property {string} note    Catatan hasil: perubahan yang terjadi, bukan deskripsi acara.
 * @property {string} metric  Nama metrik dampak, mis. 'Sampah terkumpul'.
 * @property {number} value   Nilai metrik.
 * @property {string} unit    Satuan metrik, mis. 'kg'.
 */

/**
 * @typedef {object} PfValidation
 * @property {string} validatorId Identitas validator Pertamina Foundation.
 * @property {Date|string} validatedAt
 */

/**
 * @typedef {object} StoryInput
 * @property {string} id
 * @property {string} slug
 * @property {string} authorId          Id Awardee penulis naskah.
 * @property {string} authorName
 * @property {string} title
 * @property {string} summary
 * @property {string} body
 * @property {string} [status]        Salah satu STORY_STATUS; default DRAFT.
 * @property {string} [community]     Komunitas asal penulis.
 * @property {string} [chapterId]
 * @property {readonly {pillar: string, sdgGoal: number}[]} [esgTags] Pasangan pilar dan SDG.
 * @property {readonly string[]} [mediaRefs]   Rujukan dokumentasi.
 * @property {StoryOutcome|null} [outcome]     Catatan hasil terukur.
 * @property {string} [location]               Lokasi aktivitas yang diceritakan.
 * @property {Date|string|null} [activityDate] Tanggal pelaksanaan aktivitas.
 * @property {number} [participantCount]       Jumlah peserta aktivitas.
 * @property {string} [sensitivityScan]        Salah satu SensitivityScan; default MENUNGGU.
 * @property {PfValidation|null} [pfValidation]
 * @property {boolean} [consentActive]         Consent publikasi penulis masih aktif.
 * @property {string|null} [consentId]
 * @property {readonly {reviewerId: string, note: string, at: string}[]} [reviewNotes]
 * @property {string|null} [reviewerId]        Id UserAccount verifikator yang memegang naskah.
 * @property {Date|string|null} [reviewedAt]   Waktu naskah diambil untuk ditinjau.
 * @property {string} [publishedById]          Id UserAccount yang mengeksekusi penerbitan.
 * @property {number} [revisionCount]          Berapa kali naskah dikembalikan untuk direvisi.
 * @property {Date|string|null} [submittedAt]
 * @property {Date|string|null} [publishedAt]
 * @property {Date|string|null} [archivedAt]
 * @property {string|null} [archiveReason]
 * @property {number} [views]
 */

/**
 * Menormalkan tanggal opsional.
 * @param {Date|string|null|undefined} nilai
 * @param {string} namaField
 * @returns {Date|null}
 */
function keTanggalOpsional(nilai, namaField) {
	if (nilai === null || nilai === undefined) return null;
	const tanggal = nilai instanceof Date ? new Date(nilai.getTime()) : new Date(nilai);
	if (Number.isNaN(tanggal.getTime())) {
		throw new TypeError(`Field "${namaField}" harus berupa Date atau string ISO 8601 yang sah.`);
	}
	return tanggal;
}

export class Story {
	/** @type {Readonly<Record<string, any>>} */
	#data;

	/**
	 * @param {StoryInput} input
	 * @throws {TypeError} bila field wajib kosong.
	 * @throws {RangeError} bila status atau hasil pemindaian tidak dikenal.
	 */
	constructor(input) {
		const {
			id,
			slug,
			authorId,
			authorName,
			title,
			summary,
			body,
			status = STORY_STATUS.DRAFT,
			community = '',
			chapterId = '',
			esgTags = [],
			mediaRefs = [],
			outcome = null,
			location = '',
			activityDate = null,
			participantCount = 0,
			sensitivityScan = SensitivityScan.MENUNGGU,
			pfValidation = null,
			consentActive = false,
			consentId = null,
			reviewNotes = [],
			reviewerId = null,
			reviewedAt = null,
			publishedById = '',
			revisionCount = 0,
			submittedAt = null,
			publishedAt = null,
			archivedAt = null,
			archiveReason = null,
			views = 0
		} = input ?? {};

		for (const [nama, nilai] of Object.entries({ id, slug, authorId, authorName, title, body })) {
			if (typeof nilai !== 'string' || nilai.trim() === '') {
				throw new TypeError(`Field "${nama}" wajib berupa string tidak kosong.`);
			}
		}
		if (!Object.hasOwn(STORY_STATUS_META, status)) {
			throw new RangeError(`Status cerita tidak dikenal: "${status}".`);
		}
		if (!Object.hasOwn(SensitivityScan, sensitivityScan)) {
			throw new RangeError(`Hasil pemindaian data sensitif tidak dikenal: "${sensitivityScan}".`);
		}

		this.#data = Object.freeze({
			id,
			slug,
			authorId,
			authorName,
			title,
			summary,
			body,
			status,
			community,
			chapterId,
			// Membangun EsgTag menegakkan validasi pilar dan SDG sejak konstruksi:
			// tag setengah terisi menjadi keadaan yang tidak mungkin terbentuk.
			esgTags: Object.freeze(esgTags.map((tag) => EsgTag.fromJSON(tag))),
			mediaRefs: Object.freeze([...mediaRefs]),
			outcome: outcome === null ? null : Object.freeze({ ...outcome }),
			location,
			activityDate: keTanggalOpsional(activityDate, 'activityDate'),
			participantCount,
			sensitivityScan,
			pfValidation:
				pfValidation === null
					? null
					: Object.freeze({
							validatorId: pfValidation.validatorId,
							validatedAt: keTanggalOpsional(pfValidation.validatedAt, 'pfValidation.validatedAt')
						}),
			consentActive,
			consentId,
			reviewNotes: Object.freeze(reviewNotes.map((note) => Object.freeze({ ...note }))),
			reviewerId,
			reviewedAt: keTanggalOpsional(reviewedAt, 'reviewedAt'),
			publishedById,
			revisionCount,
			submittedAt: keTanggalOpsional(submittedAt, 'submittedAt'),
			publishedAt: keTanggalOpsional(publishedAt, 'publishedAt'),
			archivedAt: keTanggalOpsional(archivedAt, 'archivedAt'),
			archiveReason,
			views
		});
		Object.freeze(this);
	}

	/** @returns {string} */
	get id() {
		return this.#data.id;
	}

	/** @returns {string} */
	get slug() {
		return this.#data.slug;
	}

	/** @returns {string} */
	get authorId() {
		return this.#data.authorId;
	}

	/** @returns {string} */
	get authorName() {
		return this.#data.authorName;
	}

	/** @returns {string} */
	get title() {
		return this.#data.title;
	}

	/** @returns {string} */
	get summary() {
		return this.#data.summary;
	}

	/** @returns {string} */
	get body() {
		return this.#data.body;
	}

	/** @returns {string} Salah satu STORY_STATUS. */
	get status() {
		return this.#data.status;
	}

	/** @returns {string} */
	get community() {
		return this.#data.community;
	}

	/** @returns {string} */
	get chapterId() {
		return this.#data.chapterId;
	}

	/** @returns {readonly EsgTag[]} */
	get esgTags() {
		return this.#data.esgTags;
	}

	/** @returns {readonly string[]} */
	get mediaRefs() {
		return this.#data.mediaRefs;
	}

	/** @returns {StoryOutcome|null} */
	get outcome() {
		return this.#data.outcome;
	}

	/** @returns {string} */
	get location() {
		return this.#data.location;
	}

	/** @returns {Date|null} */
	get activityDate() {
		return this.#data.activityDate === null ? null : new Date(this.#data.activityDate.getTime());
	}

	/** @returns {number} */
	get participantCount() {
		return this.#data.participantCount;
	}

	/** @returns {string} Salah satu SensitivityScan. */
	get sensitivityScan() {
		return this.#data.sensitivityScan;
	}

	/** @returns {PfValidation|null} */
	get pfValidation() {
		return this.#data.pfValidation;
	}

	/** @returns {string|null} */
	get consentId() {
		return this.#data.consentId;
	}

	/** @returns {boolean} Status mentah consent; gunakan `hasActiveConsent` untuk keputusan. */
	get consentActive() {
		return this.#data.consentActive;
	}

	/** @returns {readonly {reviewerId: string, note: string, at: string}[]} */
	get reviewNotes() {
		return this.#data.reviewNotes;
	}

	/**
	 * Id `UserAccount` verifikator yang sedang memegang naskah.
	 *
	 * Perhatikan bedanya dengan `authorId`, yang menunjuk seorang `Awardee`.
	 * Keduanya berjenis string dan mudah tertukar, padahal menunjuk tabel berbeda :
	 * penulis adalah penerima manfaat, peninjau adalah akun staf.
	 * @returns {string|null}
	 */
	get reviewerId() {
		return this.#data.reviewerId;
	}

	/** @returns {Date|null} Waktu naskah diambil dari antrean untuk ditinjau. */
	get reviewedAt() {
		return this.#data.reviewedAt === null ? null : new Date(this.#data.reviewedAt.getTime());
	}

	/** @returns {string} Id UserAccount yang mengeksekusi penerbitan; kosong bila belum terbit. */
	get publishedById() {
		return this.#data.publishedById;
	}

	/** @returns {number} Berapa kali naskah dikembalikan untuk direvisi. */
	get revisionCount() {
		return this.#data.revisionCount;
	}

	/** @returns {Date|null} */
	get submittedAt() {
		return this.#data.submittedAt === null ? null : new Date(this.#data.submittedAt.getTime());
	}

	/** @returns {Date|null} */
	get publishedAt() {
		return this.#data.publishedAt === null ? null : new Date(this.#data.publishedAt.getTime());
	}

	/** @returns {Date|null} */
	get archivedAt() {
		return this.#data.archivedAt === null ? null : new Date(this.#data.archivedAt.getTime());
	}

	/** @returns {string|null} */
	get archiveReason() {
		return this.#data.archiveReason;
	}

	/** @returns {number} */
	get views() {
		return this.#data.views;
	}

	/** @returns {import('../constants/community.js').StatusDef} */
	get statusMeta() {
		return STORY_STATUS_META[this.#data.status];
	}

	/** @returns {number} Jumlah kata naskah. */
	get wordCount() {
		return this.#data.body.trim().split(/\s+/).filter(Boolean).length;
	}

	/**
	 * Perkiraan waktu baca dalam menit, minimum satu menit.
	 * Memakai 200 kata per menit: laju baca teks non-teknis Bahasa Indonesia.
	 * @returns {number}
	 */
	get readMinutes() {
		const kataPerMenit = 200;
		return Math.max(1, Math.round(this.wordCount / kataPerMenit));
	}

	/**
	 * Apakah cerita tampil di zona publik.
	 *
	 * Konjungsi status DAN consent, bukan status saja. Sebelum G5, gerbang ini hanya
	 * membaca status: sehingga naskah yang penulisnya sudah mencabut persetujuan
	 * tetap tayang di `/cerita` selama statusnya masih TERPUBLIKASI. Kaskade
	 * `ContentReviewService.withdrawOnConsentRevoked()` memang mengarsipkan naskah itu,
	 * tetapi kaskade adalah rangkaian tulisan yang dapat terputus di tengah (tab
	 * ditutup, penyimpanan peramban penuh). Syarat kedua di sini membuat naskah yang
	 * belum sempat terarsipkan tetap TIDAK terlihat publik: kegagalan setengah jalan
	 * berakhir pada keadaan yang aman, bukan pada keadaan yang bocor.
	 *
	 * @returns {boolean}
	 */
	get isPublic() {
		return ceritaTampilPublik(this.#data.status) && this.hasActiveConsent;
	}

	/** @returns {boolean} */
	get isPublished() {
		return this.#data.status === STORY_STATUS.TERPUBLIKASI;
	}

	/** @returns {boolean} Apakah cerita masih dalam antrean moderasi. */
	get isInModeration() {
		return (
			this.#data.status === STORY_STATUS.DIAJUKAN || this.#data.status === STORY_STATUS.REVIEW
		);
	}

	/** @returns {boolean} Sudah diajukan dan belum ada verifikator yang mengambilnya. */
	get isAwaitingReview() {
		return this.#data.status === STORY_STATUS.DIAJUKAN;
	}

	/** @returns {boolean} Bola ada di penulis: ada catatan perbaikan yang harus ditindaklanjuti. */
	get needsRevision() {
		return this.#data.status === STORY_STATUS.PERLU_REVISI;
	}

	/**
	 * Catatan peninjauan terakhir, atau string kosong bila belum pernah ada.
	 *
	 * Kartu naskah menampilkan yang TERAKHIR, bukan yang pertama: penulis perlu tahu
	 * apa yang harus diperbaiki sekarang, bukan apa yang pernah diperbaiki dulu.
	 * @returns {string}
	 */
	get latestReviewNote() {
		const catatan = this.#data.reviewNotes;
		return catatan.length === 0 ? '' : (catatan[catatan.length - 1].note ?? '');
	}

	/**
	 * Peran yang berwenang menindaklanjuti naskah pada status saat ini.
	 *
	 * Dibaca tombol keputusan dan kartu antrean. `null` berarti naskah tidak sedang
	 * menunggu tindakan siapa pun (sudah tayang atau sudah diarsipkan).
	 * @returns {string|null} Salah satu UserRole, atau null.
	 */
	get reviewerRole() {
		return STORY_STATUS_META[this.#data.status]?.peranAktor ?? null;
	}

	/**
	 * Apakah cerita sudah lolos review Pertamina Foundation: syarat kedua gerbang
	 * fitur publik Hal 12 ("verified story").
	 * @returns {boolean}
	 */
	get isVerified() {
		return (
			this.#data.status === STORY_STATUS.DISETUJUI ||
			this.#data.status === STORY_STATUS.TERPUBLIKASI
		);
	}

	/** @returns {boolean} */
	get hasMedia() {
		return this.#data.mediaRefs.length > 0;
	}

	/** @returns {boolean} Punya minimal satu pasangan tag pilar ESG dan tujuan SDG. */
	get hasEsgTag() {
		return this.#data.esgTags.length > 0;
	}

	/** @returns {boolean} Catatan hasil terisi, bukan sekadar deskripsi acara. */
	get hasOutcomeNote() {
		return typeof this.#data.outcome?.note === 'string' && this.#data.outcome.note.trim() !== '';
	}

	/**
	 * Kelengkapan dokumentasi aktivitas: judul, tanggal, lokasi, dan jumlah peserta.
	 * Gerbang pertama bukti ESG Hal 12.
	 * @returns {boolean}
	 */
	get isActivityDocumented() {
		return (
			this.#data.title.trim() !== '' &&
			this.#data.activityDate !== null &&
			this.#data.location.trim() !== '' &&
			this.#data.participantCount > 0
		);
	}

	/**
	 * Apakah naskah ini masih berdiri di atas persetujuan publikasi yang hidup.
	 *
	 * **`consentActive` di sini adalah PROYEKSI, bukan sumber kebenaran.** Sumber
	 * kebenarannya tunggal dan tinggal di tabel `consents`: rekaman `ConsentRecord`
	 * milik penulis. Entity ini sengaja TIDAK membaca rekaman itu sendiri: Story
	 * adalah objek murni yang dibangun dari satu baris tabel, dan memberinya
	 * kemampuan membaca consent penulis berarti menyuntikkan data penulis ke setiap
	 * titik konstruksi: termasuk `StoryRepository.published()` yang memetakan
	 * puluhan baris sekaligus, dan setiap halaman publik yang merender daftar. Yang
	 * lahir dari sana bukan satu sumber kebenaran, melainkan puluhan titik yang
	 * masing-masing bisa lupa menyuntik.
	 *
	 * Karena itu arah alirannya dibalik: PENCABUTAN yang berkaskade.
	 * `ContentReviewService.withdrawOnConsentRevoked()` adalah SATU-SATUNYA penulis
	 * proyeksi ini, dan ia menyapu seluruh naskah penulis dalam satu operasi. Dengan
	 * begitu proyeksi tidak pernah punya penulis kedua yang dapat menyimpang, dan
	 * naskah tetap dapat dinilai tanpa satu pun pembacaan tabel lain.
	 *
	 * Keputusan editorial (`approveStory`, `publishStory`) tetap MEMBACA ULANG
	 * penulisnya lewat repository sebelum memutuskan: proyeksi dipakai untuk
	 * menyaring dan menampilkan, tidak pernah sebagai satu-satunya dasar keputusan
	 * yang tidak dapat ditarik kembali.
	 *
	 * Rujukan consent diuji sebagai STRING BERISI, bukan sekadar bukan-`null`.
	 * `consentId: ''` datang dari baris basis data yang kolomnya pernah kosong dan
	 * dari formulir yang mengirim kolom tak terisi; keduanya berarti naskah ini
	 * tidak menunjuk rekaman consent mana pun. Uji `!== null` meluluskan keduanya,
	 * dan naskah tanpa dasar persetujuan akan lolos gerbang terbit: lubang yang
	 * tidak terlihat karena seed selalu mengisi id yang sah.
	 *
	 * @returns {boolean}
	 */
	get hasActiveConsent() {
		return this.#data.consentActive === true && String(this.#data.consentId ?? '').trim() !== '';
	}

	/** @returns {boolean} Hasil pemindaian data sensitif bersih. */
	get isSensitivityClear() {
		return this.#data.sensitivityScan === SensitivityScan.CLEAR;
	}

	/** @returns {boolean} Sudah divalidasi Pertamina Foundation. */
	get hasPfValidation() {
		return this.#data.pfValidation !== null && this.#data.pfValidation.validatedAt !== null;
	}

	/** @returns {readonly string[]} Kode pilar ESG unik yang dibawa cerita ini. */
	get pillars() {
		return Object.freeze([...new Set(this.#data.esgTags.map((tag) => tag.pillar))]);
	}

	/** @returns {readonly number[]} Nomor SDG unik yang dibawa cerita ini. */
	get sdgGoals() {
		return Object.freeze([...new Set(this.#data.esgTags.map((tag) => tag.sdgGoal))]);
	}

	/**
	 * Apakah naskah ini boleh diterbitkan ke ruang publik.
	 *
	 * Konjungtif penuh dan tanpa pengecualian: sudah lolos review, consent penulis
	 * masih aktif pada saat ini, pemindaian data sensitif bersih, ada validasi PF,
	 * dan dokumentasinya lengkap. Consent diperiksa ulang di sini: bukan hanya
	 * saat disetujui: karena consent yang sah minggu lalu bisa saja sudah dicabut
	 * hari ini, dan penerbitan adalah momen terakhir yang masih bisa dibatalkan.
	 * @returns {boolean}
	 */
	get isPublishable() {
		return (
			this.isVerified &&
			this.hasActiveConsent &&
			this.isSensitivityClear &&
			this.hasPfValidation &&
			this.hasMedia
		);
	}

	/**
	 * Apakah naskah memenuhi syarat panjang dan kelengkapan untuk diajukan.
	 * @returns {boolean}
	 */
	get isSubmittable() {
		return this.wordCount >= MIN_KATA_NASKAH && this.hasMedia && this.hasEsgTag;
	}

	/**
	 * Salinan dengan sebagian field diganti.
	 * @param {Partial<StoryInput>} changes
	 * @returns {Story}
	 */
	withChanges(changes) {
		return new Story({ .../** @type {StoryInput} */ (this.toJSON()), ...changes });
	}

	/**
	 * Bentuk yang disimpan ke basis data.
	 * @returns {Record<string, unknown>}
	 */
	toJSON() {
		return {
			id: this.id,
			slug: this.slug,
			authorId: this.authorId,
			authorName: this.authorName,
			title: this.title,
			summary: this.summary,
			body: this.body,
			status: this.status,
			community: this.community,
			chapterId: this.chapterId,
			esgTags: this.esgTags.map((tag) => tag.toJSON()),
			mediaRefs: [...this.mediaRefs],
			outcome: this.outcome === null ? null : { ...this.outcome },
			location: this.location,
			activityDate: this.activityDate?.toISOString() ?? null,
			participantCount: this.participantCount,
			sensitivityScan: this.sensitivityScan,
			pfValidation:
				this.pfValidation === null
					? null
					: {
							validatorId: this.pfValidation.validatorId,
							validatedAt: this.pfValidation.validatedAt?.toISOString() ?? null
						},
			consentActive: this.consentActive,
			consentId: this.consentId,
			reviewNotes: this.reviewNotes.map((note) => ({ ...note })),
			reviewerId: this.reviewerId,
			reviewedAt: this.reviewedAt?.toISOString() ?? null,
			publishedById: this.publishedById,
			revisionCount: this.revisionCount,
			submittedAt: this.submittedAt?.toISOString() ?? null,
			publishedAt: this.publishedAt?.toISOString() ?? null,
			archivedAt: this.archivedAt?.toISOString() ?? null,
			archiveReason: this.archiveReason,
			views: this.views
		};
	}

	/**
	 * Menerima instans apa adanya, atau membungkus objek polos dari repository.
	 * @param {Story|StoryInput} value
	 * @returns {Story}
	 */
	static from(value) {
		return value instanceof Story ? value : new Story(value);
	}
}
