/**
 * TABEL SKOR KANONIK — Hal 11 dokumen sumber.
 *
 * Ini satu-satunya tempat nilai poin boleh dituliskan di seluruh aplikasi.
 * Tidak ada angka poin yang boleh di-hardcode di komponen, store, atau seed.
 * Mengubah nilai di sini mengubah perilaku seluruh sistem — dan itu memang
 * satu-satunya cara yang benar untuk mengubahnya.
 *
 * @see docs/00-SOURCE-BRIEF.md — Hal 11 "Gamification Scoring Model"
 */

/**
 * Kelas aksi menentukan seberapa ketat verifikasi yang dibutuhkan.
 * A = otomatis, B = perlu bukti ringan, C = perlu bukti, D = perlu validasi PF.
 * @readonly
 * @enum {string}
 */
export const ActionClass = Object.freeze({
	A: 'A',
	B: 'B',
	C: 'C',
	D: 'D'
});

/**
 * Sembilan jenis aksi berpoin. Kunci dipakai sebagai identitas di seluruh sistem.
 * @readonly
 * @enum {string}
 */
export const ActivityType = Object.freeze({
	BROADCAST_VIEW: 'BROADCAST_VIEW',
	CTA_REACT: 'CTA_REACT',
	SHARE_PRIVATE: 'SHARE_PRIVATE',
	SHARE_PUBLIC: 'SHARE_PUBLIC',
	STORY_SUBMIT: 'STORY_SUBMIT',
	SESSION_ATTEND: 'SESSION_ATTEND',
	KNOWLEDGE_QA: 'KNOWLEDGE_QA',
	SPEAKER_MENTOR: 'SPEAKER_MENTOR',
	LEAD_ACTION: 'LEAD_ACTION'
});

/**
 * @typedef {object} ScoringRule
 * @property {string} type          Salah satu ActivityType.
 * @property {number} points        Nilai poin — KANONIK, dari Hal 11.
 * @property {string} label         Label Bahasa Indonesia untuk UI.
 * @property {string} labelSumber   Teks asli dokumen sumber (untuk telusur balik).
 * @property {string} actionClass   Kelas verifikasi (ActionClass).
 * @property {number} dailyCap      Maksimum kejadian dihitung per hari. 0 = tanpa batas harian.
 * @property {boolean} needsEvidence Wajib melampirkan bukti sebelum poin diberikan.
 * @property {string} pillar        Pilar aktivitas Hal 5 yang diwakili.
 */

/**
 * Tabel skor. Urutan sengaja dari poin terkecil ke terbesar seperti di slide.
 * `dailyCap` adalah rancangan anti-spam (Hal 11: "reward meaningful contribution,
 * not spammy activity") — bukan angka dari dokumen sumber, tetapi turunan sah darinya.
 * @type {readonly ScoringRule[]}
 */
export const SCORING_TABLE = Object.freeze([
	Object.freeze({
		type: ActivityType.BROADCAST_VIEW,
		points: 1,
		label: 'Membaca kabar mingguan',
		labelSumber: 'View / read weekly broadcast',
		actionClass: ActionClass.A,
		dailyCap: 3,
		needsEvidence: false,
		pillar: 'Diseminasi & Amplifikasi'
	}),
	Object.freeze({
		type: ActivityType.CTA_REACT,
		points: 2,
		label: 'Menanggapi ajakan ringan',
		labelSumber: 'React or reply to light CTA',
		actionClass: ActionClass.A,
		dailyCap: 5,
		needsEvidence: false,
		pillar: 'Diseminasi & Amplifikasi'
	}),
	Object.freeze({
		type: ActivityType.SHARE_PRIVATE,
		points: 5,
		label: 'Membagikan konten ke WA / jaringan pribadi',
		labelSumber: 'Share PF content to WA / private network',
		actionClass: ActionClass.B,
		dailyCap: 3,
		needsEvidence: false,
		pillar: 'Diseminasi & Amplifikasi'
	}),
	Object.freeze({
		type: ActivityType.SHARE_PUBLIC,
		points: 8,
		label: 'Membagikan konten ke media sosial publik',
		labelSumber: 'Share PF content to public social media',
		actionClass: ActionClass.B,
		dailyCap: 2,
		needsEvidence: true,
		pillar: 'Diseminasi & Amplifikasi'
	}),
	Object.freeze({
		type: ActivityType.STORY_SUBMIT,
		points: 10,
		label: 'Mengirim cerita / nominasi / survei',
		labelSumber: 'Submit story / nomination / survey',
		actionClass: ActionClass.C,
		dailyCap: 1,
		needsEvidence: true,
		pillar: 'Community Journalism'
	}),
	Object.freeze({
		type: ActivityType.SESSION_ATTEND,
		points: 15,
		label: 'Menghadiri sesi daring',
		labelSumber: 'Attend online session',
		actionClass: ActionClass.C,
		dailyCap: 2,
		needsEvidence: true,
		pillar: 'Kalender Komunitas'
	}),
	Object.freeze({
		type: ActivityType.KNOWLEDGE_QA,
		points: 15,
		label: 'Bertanya / menjawab dengan bermanfaat',
		labelSumber: 'Ask useful question / share useful answer',
		actionClass: ActionClass.C,
		dailyCap: 2,
		needsEvidence: true,
		pillar: 'Open Community Ecosystem'
	}),
	Object.freeze({
		type: ActivityType.SPEAKER_MENTOR,
		points: 30,
		label: 'Menjadi narasumber / mentor / fasilitator',
		labelSumber: 'Become speaker / mentor / facilitator',
		actionClass: ActionClass.D,
		dailyCap: 1,
		needsEvidence: true,
		pillar: 'Recognition & Gamifikasi'
	}),
	Object.freeze({
		type: ActivityType.LEAD_ACTION,
		points: 50,
		label: 'Memimpin aksi / kampanye lokal',
		labelSumber: 'Lead local action / campaign',
		actionClass: ActionClass.D,
		dailyCap: 1,
		needsEvidence: true,
		pillar: 'Movement-Based Program'
	})
]);

/** @type {ReadonlyMap<string, ScoringRule>} */
const RULE_BY_TYPE = new Map(SCORING_TABLE.map((rule) => [rule.type, rule]));

/**
 * Mengambil aturan skor untuk sebuah jenis aksi.
 * @param {string} type
 * @returns {ScoringRule}
 * @throws {RangeError} bila jenis aksi tidak dikenal — gagal cepat, jangan diam-diam memberi 0 poin.
 */
export function aturanSkor(type) {
	const rule = RULE_BY_TYPE.get(type);
	if (!rule) {
		throw new RangeError(
			`Jenis aksi tidak dikenal: "${type}". Jenis yang sah: ${[...RULE_BY_TYPE.keys()].join(', ')}`
		);
	}
	return rule;
}

/**
 * Nilai poin untuk sebuah jenis aksi.
 * @param {string} type
 * @returns {number}
 */
export function poinUntuk(type) {
	return aturanSkor(type).points;
}
