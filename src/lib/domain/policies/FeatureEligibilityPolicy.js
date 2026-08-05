/**
 * POLICY — Gerbang Fitur Publik.
 *
 * Tanggung jawab: mengevaluasi lima syarat Hal 12 yang harus dipenuhi sebelum
 * seorang anggota dan ceritanya boleh diangkat ke ruang publik.
 *
 * > *"Minimum for public feature: 100 points + verified story + consent +
 * > PF validation + no sensitive-data concern."* — Hal 12
 *
 * Kelima syarat bersifat **konjungtif**: satu saja tidak terpenuhi berarti tidak
 * layak. Tidak ada pembobotan, tidak ada skor gabungan, dan tidak ada jalur
 * pintas untuk admin. Alasannya bukan kekakuan prosedural — publikasi adalah satu
 * dari sedikit tindakan di sistem ini yang tidak dapat dibatalkan setelah
 * terjadi.
 *
 * Di sinilah syarat kualitatif yang ditolak untuk tier (keputusan K-3) menemukan
 * tempatnya yang benar. Tier tetap murni ambang poin sehingga mudah dijelaskan;
 * penilaian kualitatif dipindahkan ke gerbang ini, yang memang didefinisikan
 * demikian oleh dokumen sumber.
 *
 * Mengembalikan daftar `checks` — bukan sekadar boolean — supaya konsol moderasi
 * dapat menunjukkan persis syarat mana yang belum terpenuhi. Penolakan tanpa
 * penjelasan hanya memindahkan pertanyaan ke luar sistem.
 *
 * @see docs/00-SOURCE-BRIEF.md — Hal 12 "Minimum for public feature"
 * @see docs/03-GAMIFICATION-SPEC.md — §4.1 gate kelayakan
 * @see docs/09-BUILD-CONTRACT.md — K-3
 */

import { AMBANG_FITUR_PUBLIK } from '../constants/tier-table.js';

/** Masa berlaku validasi Pertamina Foundation, dalam hari (docs/03 §4.1). */
export const MASA_BERLAKU_VALIDASI_PF_HARI = 90;

/**
 * @typedef {object} EligibilityCheck
 * @property {string} key      Kunci syarat, stabil untuk dipakai kode.
 * @property {string} label    Label Bahasa Indonesia untuk checklist UI.
 * @property {string} labelSumber Rumusan Inggris asli Hal 12.
 * @property {boolean} passed  Apakah syarat terpenuhi.
 * @property {string} hint     Apa yang harus dilakukan bila belum terpenuhi.
 */

/**
 * @typedef {object} EligibilityResult
 * @property {boolean} eligible               Seluruh syarat terpenuhi.
 * @property {readonly EligibilityCheck[]} checks
 * @property {readonly string[]} missing      Label syarat yang belum terpenuhi.
 * @property {number} passedCount
 * @property {number} totalCount
 */

const MILIDETIK_PER_HARI = 86_400_000;

export class FeatureEligibilityPolicy {
	/**
	 * Kelas ini murni statis — keputusannya hanya bergantung pada argumen.
	 * @throws {TypeError} bila diinstansiasi.
	 */
	constructor() {
		throw new TypeError('FeatureEligibilityPolicy bersifat statis dan tidak perlu diinstansiasi.');
	}

	/**
	 * Mengevaluasi kelima syarat Hal 12.
	 *
	 * @param {import('../entities/Awardee.js').Awardee} awardee Awardee yang dinilai.
	 * @param {import('../entities/Story.js').Story|null} story Cerita yang diajukan; boleh null.
	 * @param {Date} [pada] Waktu acuan untuk masa berlaku validasi PF; default sekarang.
	 * @returns {EligibilityResult}
	 * @throws {TypeError} bila awardee tidak diberikan.
	 */
	static evaluate(awardee, story, pada = new Date()) {
		if (!awardee) {
			throw new TypeError('FeatureEligibilityPolicy.evaluate membutuhkan awardee.');
		}

		/** @type {EligibilityCheck[]} */
		const checks = [
			{
				key: 'minimum_points',
				label: `Minimal ${AMBANG_FITUR_PUBLIK} poin kontribusi`,
				labelSumber: '100 points',
				passed: awardee.points >= AMBANG_FITUR_PUBLIK,
				hint: `Kumpulkan ${Math.max(0, AMBANG_FITUR_PUBLIK - awardee.points)} poin lagi lewat Pusat Aksi.`
			},
			{
				key: 'verified_story',
				label: 'Cerita sudah terverifikasi',
				labelSumber: 'verified story',
				passed: story?.isVerified === true,
				hint: 'Kirim cerita dan tunggu peninjauan tim Pertamina Foundation.'
			},
			{
				key: 'consent',
				label: 'Persetujuan publikasi aktif',
				labelSumber: 'consent',
				passed: FeatureEligibilityPolicy.#consentTerpenuhi(awardee, story),
				hint: 'Aktifkan persetujuan publikasi pada halaman Profil Saya.'
			},
			{
				key: 'pf_validation',
				label: 'Validasi Pertamina Foundation berlaku',
				labelSumber: 'PF validation',
				passed: FeatureEligibilityPolicy.#validasiPfBerlaku(story, pada),
				hint: `Validasi PF berlaku ${MASA_BERLAKU_VALIDASI_PF_HARI} hari dan perlu diperbarui bila kedaluwarsa.`
			},
			{
				key: 'no_sensitive_data',
				label: 'Tanpa temuan data sensitif',
				labelSumber: 'no sensitive-data concern',
				passed: story?.isSensitivityClear === true,
				hint: 'Hapus data pribadi seperti NIK, nomor rekening, atau alamat lengkap dari naskah.'
			}
		];

		const beku = Object.freeze(checks.map((check) => Object.freeze(check)));
		const lolos = beku.filter((check) => check.passed);

		return Object.freeze({
			eligible: lolos.length === beku.length,
			checks: beku,
			missing: Object.freeze(beku.filter((c) => !c.passed).map((c) => c.label)),
			passedCount: lolos.length,
			totalCount: beku.length
		});
	}

	/**
	 * Consent dianggap terpenuhi bila cerita membawa consent aktif miliknya
	 * sendiri. Consent tingkat awardee dipakai sebagai penopang ketika cerita
	 * belum ada — sehingga awardee tanpa consent apa pun tetap gagal di syarat ini
	 * alih-alih lolos karena ketiadaan data.
	 *
	 * @param {import('../entities/Awardee.js').Awardee} awardee
	 * @param {import('../entities/Story.js').Story|null} story
	 * @returns {boolean}
	 */
	static #consentTerpenuhi(awardee, story) {
		if (story) return story.hasActiveConsent;
		return awardee.consentActive === true;
	}

	/**
	 * Validasi PF sah bila ada dan belum melewati masa berlakunya. Validasi yang
	 * kedaluwarsa diperlakukan sama dengan tidak ada — bukan karena formalitas,
	 * melainkan karena keadaan seorang anggota bisa berubah dalam tiga bulan.
	 *
	 * @param {import('../entities/Story.js').Story|null} story
	 * @param {Date} pada
	 * @returns {boolean}
	 */
	static #validasiPfBerlaku(story, pada) {
		const validatedAt = story?.pfValidation?.validatedAt ?? null;
		if (!validatedAt) return false;
		const umurHari = (pada.getTime() - validatedAt.getTime()) / MILIDETIK_PER_HARI;
		return umurHari >= 0 && umurHari <= MASA_BERLAKU_VALIDASI_PF_HARI;
	}
}
