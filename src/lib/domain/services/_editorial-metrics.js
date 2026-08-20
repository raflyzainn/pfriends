/**
 * MODUL INTERNAL: perhitungan metrik alur editorial.
 *
 * Tanggung jawab: seluruh aritmetika di balik `ContentReviewService.slaOf()`,
 * `pipeline()`, dan `slaCompliance()`: usia antrean dalam hari kerja, median,
 * dan penentuan tahap corong dari bukti yang tersimpan pada naskah.
 *
 * Mengapa berkas terpisah, bukan method privat:
 *
 * 1. **Batas ukuran modul (U-3).** Kelas keputusan editorial sudah memikul
 *    sepuluh transisi berikut pembelaannya; menambahkan aritmetika metrik ke
 *    dalamnya membuat satu berkas menjawab dua pertanyaan yang tidak saling
 *    membutuhkan: "boleh atau tidak" dan "seberapa cepat".
 * 2. **Ini modul internal paket, bukan service kedua.** Namanya diawali garis
 *    bawah sesuai konvensi penamaan, dan ia TIDAK diekspor sebagai titik masuk:
 *    satu-satunya pemakainya adalah `ContentReviewService`. Antrean editorial
 *    tetap punya satu sumber kebenaran; yang dipecah hanyalah tempat rumusnya
 *    tinggal.
 * 3. **Seluruh isinya murni.** Tanpa repository, tanpa jam internal: waktu
 *    pemeriksaan selalu dioper pemanggil, sehingga kartu antrean dapat memanggil
 *    perhitungan SLA dua puluh kali tanpa satu pun pembacaan basis data.
 *
 * @see docs/12-BUILD-CONTRACT-V2.md: §2.9 pipeline & slaCompliance, §5.5 U-3 batas ukuran modul
 * @see docs/10-REVISION-SPEC.md: §5.6 SLA & eskalasi
 */

import { SLA_HARI_KERJA } from '../constants/content-workflow.js';
import { STORY_STATUS } from '../constants/community.js';
import { CommunityEvent } from '../entities/CommunityEvent.js';
import { Story } from '../entities/Story.js';

/** Batas iterasi penghitung hari kerja: pengaman gelang, bukan angka kebijakan. */
const MAKS_HARI_DIHITUNG = 3650;

/**
 * @typedef {object} SlaStatus
 * @property {boolean} overdue Sudah melewati batas SLA.
 * @property {number} days     Usia antrean dalam hari kerja.
 * @property {number} limit    Batas SLA dalam hari kerja; `0` bila status ini tidak ber-SLA.
 */

/**
 * Awal hari waktu lokal.
 * @param {Date} tanggal
 * @returns {Date}
 */
function awalHari(tanggal) {
	const salinan = new Date(tanggal.getTime());
	salinan.setHours(0, 0, 0, 0);
	return salinan;
}

/**
 * Jumlah hari kerja yang berlalu sejak sebuah tanggal.
 *
 * Hari kerja, bukan hari kalender: naskah yang diajukan Jumat sore belum melewati
 * SLA dua hari pada Senin pagi, dan menghitungnya sebagai terlambat akan menyalakan
 * penanda merah pada antrean yang sebenarnya sehat. Sabtu dan Minggu dikecualikan;
 * hari libur nasional tidak dikenal sistem ini dan itu batasan yang diketahui.
 *
 * @param {Date|null} sejak Tanggal acuan awal.
 * @param {Date} pada Waktu pemeriksaan.
 * @returns {number} `0` bila acuan kosong atau belum terlewati.
 */
export function hariKerjaSejak(sejak, pada) {
	if (!(sejak instanceof Date) || Number.isNaN(sejak.getTime())) return 0;
	const kursor = awalHari(sejak);
	const batas = awalHari(pada);
	let hari = 0;
	while (kursor < batas && hari < MAKS_HARI_DIHITUNG) {
		kursor.setDate(kursor.getDate() + 1);
		const hariPekan = kursor.getDay();
		if (hariPekan !== 0 && hariPekan !== 6) hari += 1;
	}
	return hari;
}

/**
 * Median sebuah deret angka.
 * @param {readonly number[]} deret
 * @returns {number} `0` untuk deret kosong.
 */
export function median(deret) {
	if (deret.length === 0) return 0;
	const urut = [...deret].sort((a, b) => a - b);
	const tengah = Math.floor(urut.length / 2);
	if (urut.length % 2 === 1) return urut[tengah];
	return Math.round((urut[tengah - 1] + urut[tengah]) / 2);
}

/**
 * Tanggal acuan dan batas SLA sebuah entity menurut statusnya.
 *
 * Naskah `REVIEW` dan `DISETUJUI` memakai `reviewedAt` sebagai acuan dan mundur ke
 * `submittedAt` bila kosong: yang diukur adalah lama antrean pada tahap SEKARANG,
 * bukan usia naskah sejak pertama kali ditulis.
 *
 * @param {Story|CommunityEvent|object} entity
 * @returns {{sejak: Date|null, limit: number}}
 */
function patokanSla(entity) {
	if (entity instanceof Story) {
		if (entity.status === STORY_STATUS.DIAJUKAN) {
			return { sejak: entity.submittedAt, limit: SLA_HARI_KERJA.STORY_DIAJUKAN };
		}
		if (entity.status === STORY_STATUS.REVIEW) {
			return { sejak: entity.reviewedAt ?? entity.submittedAt, limit: SLA_HARI_KERJA.STORY_REVIEW };
		}
		if (entity.status === STORY_STATUS.DISETUJUI) {
			return {
				sejak: entity.reviewedAt ?? entity.submittedAt,
				limit: SLA_HARI_KERJA.STORY_DISETUJUI
			};
		}
		return { sejak: null, limit: 0 };
	}
	if (entity instanceof CommunityEvent && entity.isProposal) {
		return { sejak: entity.submittedAt, limit: SLA_HARI_KERJA.EVENT_DIUSULKAN };
	}
	return { sejak: null, limit: 0 };
}

/**
 * Status SLA sebuah entity pada waktu tertentu.
 * @param {Story|CommunityEvent|object} entity
 * @param {Date} pada Waktu pemeriksaan.
 * @returns {SlaStatus} `limit === 0` berarti status ini memang tidak ber-SLA.
 */
export function slaDari(entity, pada) {
	const acuan = pada instanceof Date ? pada : new Date();
	const { sejak, limit } = patokanSla(entity);
	if (limit === 0) return { overdue: false, days: 0, limit: 0 };
	const days = hariKerjaSejak(sejak, acuan);
	return { overdue: days > limit, days, limit };
}

/**
 * Tahap terjauh yang pernah dicapai sebuah naskah, dibaca dari BUKTI yang
 * tersimpan: bukan dari status terakhirnya.
 *
 * Naskah yang sudah diarsipkan tetap pernah melewati tahap-tahap sebelumnya.
 * Corong yang membaca status terakhir akan melaporkan naskah itu seolah tidak
 * pernah ditinjau siapa pun, dan konversi antar tahap menjadi tidak berarti.
 * @type {readonly {stage: string, tercapai: (story: Story) => boolean}[]}
 */
const TAHAP_CORONG = Object.freeze([
	Object.freeze({ stage: STORY_STATUS.DRAFT, tercapai: () => true }),
	Object.freeze({
		stage: STORY_STATUS.DIAJUKAN,
		tercapai: (story) => story.submittedAt !== null || story.status !== STORY_STATUS.DRAFT
	}),
	Object.freeze({
		stage: STORY_STATUS.REVIEW,
		tercapai: (story) =>
			story.reviewerId !== null || story.reviewedAt !== null || story.isVerified
	}),
	Object.freeze({
		stage: STORY_STATUS.DISETUJUI,
		tercapai: (story) => story.hasPfValidation || story.isVerified
	}),
	Object.freeze({
		stage: STORY_STATUS.TERPUBLIKASI,
		tercapai: (story) =>
			story.publishedAt !== null || story.status === STORY_STATUS.TERPUBLIKASI
	})
]);

/**
 * Corong editorial: berapa naskah mencapai tiap tahap, dan berapa persen yang
 * lolos dari tahap sebelumnya.
 *
 * @param {readonly Story[]} stories
 * @returns {{stage: string, count: number, conversionFromPrev: number}[]}
 */
export function corongEditorial(stories) {
	const cacah = TAHAP_CORONG.map((tahap) => stories.filter((story) => tahap.tercapai(story)).length);
	return TAHAP_CORONG.map((tahap, indeks) => {
		const sebelumnya = indeks === 0 ? cacah[indeks] : cacah[indeks - 1];
		return {
			stage: tahap.stage,
			count: cacah[indeks],
			conversionFromPrev: sebelumnya > 0 ? Math.round((cacah[indeks] / sebelumnya) * 100) : 0
		};
	});
}

/**
 * Kepatuhan SLA per antrean.
 *
 * Satu baris per kunci `SLA_HARI_KERJA`, termasuk antrean yang sedang kosong :
 * baris yang menghilang saat antreannya kosong membuat chart berubah bentuk dan
 * terbaca sebagai data yang gagal dimuat.
 *
 * @param {readonly Story[]} stories
 * @param {readonly CommunityEvent[]} events
 * @param {Date} pada Waktu pemeriksaan.
 * @returns {{queue: string, withinSla: number, breachedSla: number, medianDays: number}[]}
 */
export function kepatuhanSla(stories, events, pada) {
	/** @type {Record<string, (Story|CommunityEvent)[]>} */
	const isiAntrean = {
		STORY_DIAJUKAN: stories.filter((story) => story.status === STORY_STATUS.DIAJUKAN),
		STORY_REVIEW: stories.filter((story) => story.status === STORY_STATUS.REVIEW),
		STORY_DISETUJUI: stories.filter((story) => story.status === STORY_STATUS.DISETUJUI),
		EVENT_DIUSULKAN: events.filter((event) => event.isProposal)
	};

	return Object.keys(SLA_HARI_KERJA).map((queue) => {
		const status = (isiAntrean[queue] ?? []).map((entity) => slaDari(entity, pada));
		return {
			queue,
			withinSla: status.filter((sla) => !sla.overdue).length,
			breachedSla: status.filter((sla) => sla.overdue).length,
			medianDays: median(status.map((sla) => sla.days))
		};
	});
}
