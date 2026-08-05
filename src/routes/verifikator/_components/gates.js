/**
 * MODUL LOKAL ZONA VERIFIKATOR — ketiga gerbang keputusan, TERPISAH.
 *
 * Tanggung jawab: menyediakan ketiga checklist yang dibaca verifikator sebelum
 * memutuskan sebuah naskah — kelayakan fitur publik, kesiapan bukti ESG, dan
 * pemeriksaan data sensitif — masing-masing dalam bentuknya sendiri.
 *
 * Empat keputusan yang tidak terbaca dari kode:
 *
 * 1. **Tidak ada fungsi yang menggabungkan ketiganya.** `docs/12` §3.5 WP-06
 *    butir 5 melarangnya, dan alasannya bukan formalitas: ketiga gerbang bersifat
 *    konjungtif, sehingga satu angka gabungan bernilai "80%" akan terbaca sebagai
 *    "hampir lolos" padahal artinya "ada syarat yang tidak terpenuhi". Berkas ini
 *    sengaja tidak menyediakan jalan untuk menjumlahkannya.
 * 2. **Gerbang kelayakan fitur publik dan bukti ESG dipinjam dari domain apa
 *    adanya.** `FeatureEligibilityPolicy.evaluate` dan
 *    `EsgEvidenceService.evidenceChecklist` sudah mengembalikan daftar `checks`
 *    lengkap dengan `hint` — persis supaya konsol dapat menunjukkan syarat mana
 *    yang belum terpenuhi. Menyusun ulang daftarnya di zona ini berarti dua
 *    definisi kelayakan yang perlahan berbeda.
 * 3. **`EsgEvidenceService` dirakit di atas katalog yang SUDAH dimuat**, bukan di
 *    atas repository. Adapter di bawah hanya membaca `catalog.stories` — nol
 *    transaksi IndexedDB tambahan, dan zona ini tetap tidak menjadi composition
 *    root kedua atas basis data.
 * 4. **Gerbang data sensitif dihitung dari konfirmasi MANUSIA, bukan dari field
 *    `sensitivityScan`.** Nilai `CLEAR` pada sebuah naskah adalah rekaman
 *    keputusan yang PERNAH diambil seseorang; ia bukan pengganti pemeriksaan yang
 *    sedang berlangsung. `docs/04` §6.2 menegaskan deteksi otomatis hanya
 *    menyaring dan tidak pernah memutuskan.
 *
 * @see docs/12-BUILD-CONTRACT-V2.md — §3.5 WP-06 butir 5 tiga panel gerbang terpisah
 * @see docs/00-SOURCE-BRIEF.md — Hal 12 minimum for public feature & minimum for ESG evidence
 * @see docs/04-ESG-GOVERNANCE.md — §6 checklist data sensitif
 */

import { FeatureEligibilityPolicy } from '$lib/domain/policies/FeatureEligibilityPolicy.js';
import { EsgEvidenceService } from '$lib/domain/services/EsgEvidenceService.js';
import { catalog } from '$lib/stores/catalog.svelte.js';
import { SENSITIVITY_ITEMS, TOTAL_BUTIR_SENSITIF } from './sensitivity-checklist.js';

/**
 * Adapter baca-saja atas katalog yang sudah dimuat store.
 *
 * `EsgEvidenceService` hanya memanggil `getAll()`; memberinya katalog yang sudah
 * ada di memori membuat panel gerbang tidak pernah membuka transaksi basis data
 * saat verifikator membuka satu naskah.
 * @type {{getAll: () => Promise<import('$lib/domain/entities/Story.js').Story[]>}}
 */
const katalogSebagaiRepo = {
	getAll: async () => catalog.stories
};

/** Instans tunggal; kelasnya tidak menyimpan keadaan selain repository. */
const layananBukti = new EsgEvidenceService({ storyRepo: katalogSebagaiRepo });

/**
 * @typedef {object} GateResult
 * @property {boolean} ready   Seluruh syarat terpenuhi.
 * @property {readonly {key: string, label: string, labelSumber?: string, passed: boolean, hint: string}[]} checks
 * @property {number} passedCount
 * @property {number} totalCount
 */

/**
 * GERBANG 1 — kelayakan fitur publik (lima syarat Hal 12).
 *
 * Menilai PENULIS beserta naskahnya, bukan naskahnya saja: salah satu syaratnya
 * adalah capaian kontribusi penulis. Karena itu awardee wajib ditemukan lebih
 * dahulu; bila tidak ada, gerbang menjawab "belum dapat dinilai" alih-alih
 * menganggapnya lolos.
 *
 * @param {import('$lib/domain/entities/Awardee.js').Awardee|null} awardee Penulis naskah.
 * @param {import('$lib/domain/entities/Story.js').Story|null} story
 * @param {Date} pada Waktu acuan masa berlaku validasi PF.
 * @returns {GateResult|null} `null` bila penulisnya tidak ditemukan di katalog.
 */
export function gerbangFiturPublik(awardee, story, pada) {
	if (!awardee) return null;
	const hasil = FeatureEligibilityPolicy.evaluate(awardee, story, pada);
	return {
		ready: hasil.eligible,
		checks: hasil.checks,
		passedCount: hasil.passedCount,
		totalCount: hasil.totalCount
	};
}

/**
 * GERBANG 2 — kesiapan bukti ESG (empat syarat Hal 12).
 *
 * @param {import('$lib/domain/entities/Story.js').Story} story
 * @returns {GateResult}
 */
export function gerbangBuktiEsg(story) {
	const hasil = layananBukti.evidenceChecklist(story);
	return {
		ready: hasil.ready,
		checks: hasil.checks,
		passedCount: hasil.passedCount,
		totalCount: hasil.totalCount
	};
}

/**
 * Antrean naskah yang sudah bertag ESG namun buktinya belum lengkap, beserta apa
 * yang kurang dari masing-masing.
 *
 * Definisi antreannya milik domain (`incompleteQueue`), bukan disusun ulang di
 * halaman: daftar "hampir lengkap dahulu" adalah kebijakan, bukan tata letak.
 *
 * @returns {Promise<{story: import('$lib/domain/entities/Story.js').Story, checklist: object}[]>}
 */
export async function antreanBuktiBelumLengkap() {
	return layananBukti.incompleteQueue();
}

/**
 * GERBANG 3 — pemeriksaan data sensitif (21 butir `docs/04` §6.1).
 *
 * Sumber kelulusannya adalah konfirmasi manusia yang sedang membaca naskah, bukan
 * field pada entity. Lihat butir 4 pada catatan berkas.
 *
 * @param {ReadonlySet<number>} dikonfirmasi Nomor butir yang sudah dicentang verifikator.
 * @returns {GateResult}
 */
export function gerbangDataSensitif(dikonfirmasi) {
	const tercentang = dikonfirmasi ?? new Set();
	const checks = SENSITIVITY_ITEMS.map((butir) => ({
		key: `sensitif-${butir.no}`,
		label: `${butir.no}. ${butir.label}`,
		passed: tercentang.has(butir.no),
		hint: butir.aksi
	}));
	const lolos = checks.filter((check) => check.passed).length;
	return {
		ready: lolos === TOTAL_BUTIR_SENSITIF,
		checks,
		passedCount: lolos,
		totalCount: TOTAL_BUTIR_SENSITIF
	};
}
