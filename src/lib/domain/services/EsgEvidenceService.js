/**
 * SERVICE: Bukti ESG.
 *
 * Tanggung jawab: menilai kesiapan sebuah cerita sebagai bukti ESG, dan menyusun
 * matriks bukti tiga pilar untuk konsol admin.
 *
 * Gerbang empat syarat Hal 12: *"Documented activity + outcome note + ESG/SDG
 * tag + evidence source"*: bersifat konjungtif. Bukti yang kehilangan salah
 * satunya tidak boleh masuk agregasi, dan tidak ada mekanisme di kelas ini untuk
 * melewatinya.
 *
 * Alasannya lebih dari kepatuhan. Hal 9 menuntut *"bukti pipeline before
 * dashboard"*: dasbor yang menampilkan klaim dampak tanpa bukti di belakangnya
 * justru merusak kredibilitas program yang hendak dibuktikannya. Karena itu
 * `matrix()` selalu memisahkan bukti yang siap dari yang belum, dan tidak pernah
 * menjumlahkan keduanya menjadi satu angka yang terdengar bagus.
 *
 * @see docs/00-SOURCE-BRIEF.md: Hal 10 ESG Measurement Hints, Hal 12 Minimum for ESG evidence
 * @see docs/04-ESG-GOVERNANCE.md: §1 model bukti tiga pilar
 */

import { ESG_EVIDENCE_GATE, ESG_PILLARS, EsgPillar, SDG_GOALS } from '../constants/esg-taxonomy.js';
import { Story } from '../entities/Story.js';

/**
 * Panjang minimum catatan hasil, dalam karakter (docs/03 §4.2).
 * Ambang ini ada untuk memaksa penulis menjelaskan PERUBAHAN yang terjadi, bukan
 * sekadar mengulang deskripsi acara dalam satu kalimat.
 */
export const MIN_KARAKTER_CATATAN_HASIL = 200;

/**
 * @typedef {object} EvidenceCheck
 * @property {string} key         Kunci gerbang, mis. 'outcome_note'.
 * @property {string} label       Label Bahasa Indonesia.
 * @property {string} labelSumber Rumusan Inggris asli Hal 12.
 * @property {boolean} passed
 * @property {string} hint        Apa yang harus dilengkapi bila belum terpenuhi.
 */

/**
 * @typedef {object} EvidenceChecklist
 * @property {boolean} ready
 * @property {readonly EvidenceCheck[]} checks
 * @property {readonly string[]} missing
 * @property {number} passedCount
 * @property {number} totalCount
 */

/**
 * @typedef {object} PillarSummary
 * @property {string} pillar        'E', 'S', atau 'G'.
 * @property {string} label
 * @property {number} total         Cerita yang membawa tag pilar ini.
 * @property {number} ready         Cerita yang lolos keempat gerbang.
 * @property {number} incomplete    Cerita yang masih kurang bukti.
 * @property {number} readinessRate Porsi siap terhadap total, dalam persen.
 * @property {readonly number[]} sdgGoals Nomor SDG yang benar-benar terbukti.
 * @property {string} token
 * @property {string} ink
 * @property {string} tint
 */

export class EsgEvidenceService {
	/** @type {import('../repositories/Repository.js').Repository} */
	#storyRepo;

	/**
	 * @param {object} deps
	 * @param {import('../repositories/Repository.js').Repository} deps.storyRepo
	 * @throws {TypeError} bila repository cerita tidak diberikan.
	 */
	constructor({ storyRepo } = {}) {
		if (!storyRepo) {
			throw new TypeError('EsgEvidenceService membutuhkan storyRepo.');
		}
		this.#storyRepo = storyRepo;
	}

	/**
	 * Apakah sebuah cerita sudah memenuhi keempat gerbang bukti ESG Hal 12.
	 * @param {import('../entities/Story.js').Story} story
	 * @returns {boolean}
	 */
	isEvidenceReady(story) {
		return this.evidenceChecklist(story).ready;
	}

	/**
	 * Checklist keempat gerbang beserta status masing-masing.
	 *
	 * Mengembalikan rincian, bukan sekadar boolean, karena inilah yang dilihat
	 * admin di antrean bukti: ia perlu tahu satu cerita kurang apa agar dapat
	 * meminta hal yang tepat kepada penulisnya.
	 *
	 * @param {import('../entities/Story.js').Story} story
	 * @returns {EvidenceChecklist}
	 * @throws {TypeError} bila cerita tidak diberikan.
	 */
	evidenceChecklist(story) {
		if (!story) {
			throw new TypeError('EsgEvidenceService.evidenceChecklist membutuhkan cerita.');
		}
		const cerita = Story.from(story);

		/** @type {Record<string, {passed: boolean, hint: string}>} */
		const hasil = {
			documented_activity: {
				passed: cerita.isActivityDocumented,
				hint: 'Lengkapi judul, tanggal, lokasi, dan jumlah peserta aktivitas.'
			},
			outcome_note: {
				passed: EsgEvidenceService.#catatanHasilMemadai(cerita),
				hint: `Tulis catatan hasil minimal ${MIN_KARAKTER_CATATAN_HASIL} karakter yang menjelaskan perubahan yang terjadi.`
			},
			esg_sdg_tag: {
				passed: cerita.hasEsgTag,
				hint: 'Pasang minimal satu pilar E/S/G beserta nomor SDG-nya.'
			},
			evidence_source: {
				passed: cerita.hasMedia,
				hint: 'Lampirkan minimal satu bukti: foto, laporan, tautan, atau daftar hadir.'
			}
		};

		const checks = Object.freeze(
			ESG_EVIDENCE_GATE.map((gate) =>
				Object.freeze({
					key: gate.key,
					label: gate.label,
					labelSumber: gate.labelSumber,
					passed: hasil[gate.key]?.passed === true,
					hint: hasil[gate.key]?.hint ?? gate.deskripsi
				})
			)
		);
		const lolos = checks.filter((check) => check.passed);

		return Object.freeze({
			ready: lolos.length === checks.length,
			checks,
			missing: Object.freeze(checks.filter((c) => !c.passed).map((c) => c.label)),
			passedCount: lolos.length,
			totalCount: checks.length
		});
	}

	/**
	 * Matriks bukti tiga pilar ESG.
	 * @returns {Promise<{E: PillarSummary, S: PillarSummary, G: PillarSummary}>}
	 */
	async matrix() {
		const stories = await this.#stories();

		/** @type {Record<string, PillarSummary>} */
		const matriks = {};
		for (const pilar of ESG_PILLARS) {
			const milikPilar = stories.filter((story) => story.pillars.includes(pilar.pillar));
			const siap = milikPilar.filter((story) => this.isEvidenceReady(story));
			const sdgTerbukti = [
				...new Set(siap.flatMap((story) => story.sdgGoals))
			].sort((a, b) => a - b);

			matriks[pilar.pillar] = {
				pillar: pilar.pillar,
				label: pilar.label,
				total: milikPilar.length,
				ready: siap.length,
				incomplete: milikPilar.length - siap.length,
				readinessRate:
					milikPilar.length > 0 ? Math.round((siap.length / milikPilar.length) * 100) : 0,
				sdgGoals: Object.freeze(sdgTerbukti),
				token: pilar.token,
				ink: pilar.ink,
				tint: pilar.tint
			};
		}

		return /** @type {{E: PillarSummary, S: PillarSummary, G: PillarSummary}} */ (
			Object.freeze(matriks)
		);
	}

	/**
	 * Antrean cerita yang sudah punya tag ESG namun buktinya belum lengkap,
	 * beserta apa yang kurang dari masing-masing. Ini pekerjaan konkret yang
	 * ditunggu admin: daftar "hampir jadi" jauh lebih berguna daripada angka
	 * persentase kesiapan.
	 *
	 * @returns {Promise<{story: Story, checklist: EvidenceChecklist}[]>}
	 */
	async incompleteQueue() {
		const stories = await this.#stories();
		return stories
			.filter((story) => story.hasEsgTag)
			.map((story) => ({ story, checklist: this.evidenceChecklist(story) }))
			.filter((baris) => !baris.checklist.ready)
			.sort((a, b) => b.checklist.passedCount - a.checklist.passedCount);
	}

	/**
	 * Cakupan SDG: nomor tujuan mana yang benar-benar terbukti oleh cerita siap.
	 * Tujuan yang tidak pernah terbukti tetap ditampilkan dengan cacah nol :
	 * justru kekosongan itulah informasi yang berguna, karena ia menunjukkan
	 * klaim mana yang belum boleh dibuat.
	 *
	 * @returns {Promise<{goal: number, label: string, color: string, count: number}[]>}
	 */
	async sdgCoverage() {
		const stories = await this.#stories();
		const siap = stories.filter((story) => this.isEvidenceReady(story));
		return SDG_GOALS.map((sdg) => ({
			goal: sdg.goal,
			label: sdg.label,
			color: sdg.color,
			count: siap.filter((story) => story.sdgGoals.includes(sdg.goal)).length
		}));
	}

	/**
	 * Cerita yang lolos gerbang bukti pada satu pilar tertentu.
	 * @param {string} pillar Salah satu EsgPillar.
	 * @returns {Promise<Story[]>}
	 */
	async readyEvidence(pillar = EsgPillar.E) {
		const stories = await this.#stories();
		return stories.filter(
			(story) => story.pillars.includes(pillar) && this.isEvidenceReady(story)
		);
	}

	/** @returns {Promise<Story[]>} */
	async #stories() {
		const rows = await this.#storyRepo.getAll();
		return rows.map((row) => Story.from(row));
	}

	/**
	 * Catatan hasil dianggap memadai bila cukup panjang untuk memuat penjelasan
	 * perubahan, bukan sekadar satu kalimat deskriptif.
	 * @param {Story} story
	 * @returns {boolean}
	 */
	static #catatanHasilMemadai(story) {
		const catatan = story.outcome?.note ?? '';
		return catatan.trim().length >= MIN_KARAKTER_CATATAN_HASIL;
	}
}
