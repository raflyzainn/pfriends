/**
 * MODUL LOKAL ZONA VERIFIKATOR — registri keputusan editorial.
 *
 * Tanggung jawab: menerjemahkan STATUS TUJUAN yang sudah dinyatakan sah oleh peta
 * transisi domain menjadi satu tombol beserta masukan yang wajib menyertainya.
 *
 * Lima keputusan yang tidak terbaca dari kode:
 *
 * 1. **Daftar tombol TIDAK ditulis di sini.** Yang ditulis di sini hanyalah rupa
 *    sebuah tombol bila statusnya kebetulan muncul. Daftarnya selalu datang dari
 *    `allowedStoryTransitions(status, role)` / `allowedEventTransitions(...)`.
 *    Inilah yang membuat aturan alur editorial tidak dapat menyimpang diam-diam
 *    antara domain dan antarmuka: menambah transisi di domain langsung memunculkan
 *    tombolnya, dan menghapusnya langsung menghilangkan tombolnya
 *    (`docs/12` §3.5 WP-06 butir 2, `docs/10` §5.3).
 * 2. **Status tujuan yang tidak dikenal registri ini dilewati, bukan dirender
 *    sebagai tombol kosong.** Tombol tanpa label adalah kegagalan yang tetap dapat
 *    ditekan; melewatinya membuat kekeliruan itu terlihat sebagai tombol yang
 *    hilang, dan tombol yang hilang dicari orang.
 * 3. **Kewajiban catatan dinyatakan sebagai DATA (`input`), bukan sebagai
 *    percabangan di halaman.** `ContentReviewService` menolak keputusan tanpa
 *    catatan lewat `ReviewFailure.CATATAN_WAJIB`; registri ini memastikan
 *    penolakan itu dijelaskan SEBELUM permintaan dikirim, bukan sesudah pengguna
 *    menekan tombol dan gagal tanpa tahu sebabnya (`docs/12` §3.5 WP-06 butir 6).
 * 4. **`jalankan` menunjuk store editorial, bukan `ContentReviewService`.** Store
 *    adalah composition root satu-satunya bagi zona ini; merakit service kedua di
 *    dalam halaman akan melahirkan sumber kebenaran kedua atas antrean yang sama
 *    (`docs/12` §2.12, `stores/editorial.svelte.js` butir 1).
 * 5. **Transisi sah yang belum punya jalur eksekusi ditandai `jalankan: null`
 *    beserta alasannya, bukan dihapus dari registri.** Kontrak store editorial
 *    `docs/12` §2.12 tidak memuat `cancelEvent`, sedangkan `EVENT_TRANSITIONS`
 *    menyatakan `TERJADWAL → DIBATALKAN` sah bagi verifikator. Menghapus butirnya
 *    akan menyembunyikan selisih itu; menandainya membuat selisih tersebut terbaca
 *    di layar, dan begitu store melengkapinya cukup satu baris untuk menghidupkan.
 *
 * @see docs/12-BUILD-CONTRACT-V2.md — §3.5 WP-06 butir 2 & 6, §2.12 kontrak store editorial
 * @see docs/10-REVISION-SPEC.md — §5.3 tabel transisi cerita, §5.5 konflik kepentingan
 */

import {
	allowedEventTransitions,
	allowedStoryTransitions
} from '$lib/domain/constants/content-workflow.js';
import { STORY_ARCHIVE_REASON, STORY_STATUS } from '$lib/domain/constants/community.js';
import { EventStatus } from '$lib/domain/entities/CommunityEvent.js';
import { editorial } from '$lib/stores/editorial.svelte.js';

/**
 * Masukan yang wajib dikumpulkan sebelum sebuah keputusan dikirim ke domain.
 * @readonly
 * @enum {string}
 */
export const DecisionInput = Object.freeze({
	/** Cukup konfirmasi; tidak ada isian tambahan. */
	NONE: 'NONE',
	/** Catatan bebas wajib terisi. */
	NOTE: 'NOTE',
	/** Alasan arsip wajib dipilih dari `STORY_ARCHIVE_REASON`. */
	ARCHIVE_REASON: 'ARCHIVE_REASON',
	/** Checklist data sensitif wajib dinyatakan lolos seluruhnya. */
	SENSITIVITY: 'SENSITIVITY'
});

/**
 * Kalimat penolakan ketika catatan atau alasan wajib dibiarkan kosong.
 *
 * Satu kalimat untuk ketiga jalur — "Minta revisi", "Tolak usulan", dan
 * "Arsipkan naskah" — supaya penolakan yang sebabnya sama tidak berbunyi berbeda
 * di tiga halaman.
 * @type {string}
 */
export const PESAN_CATATAN_WAJIB =
	'Keputusan ini wajib disertai catatan tertulis. Tuliskan bagian mana yang bermasalah dan apa yang harus diperbaiki.';

/** Kalimat penolakan ketika alasan arsip belum dipilih. */
export const PESAN_ALASAN_WAJIB =
	'Pilih salah satu alasan arsip. Alasan berupa kalimat karangan tidak dapat dikelompokkan saat audit.';

/** Kalimat penolakan ketika checklist data sensitif belum tuntas. */
export const PESAN_SENSITIVITAS_WAJIB =
	'Seluruh butir checklist data sensitif wajib dikonfirmasi lolos sebelum naskah disetujui.';

/**
 * Kalimat konflik kepentingan pada usulan kegiatan. Kalimatnya menyebut jalan
 * keluarnya, bukan sekadar larangannya: seed menyediakan dua akun verifikator
 * justru supaya larangan ini tidak pernah menjadi jalan buntu.
 * @type {string}
 */
export const PESAN_KONFLIK_KEGIATAN =
	'Anda pengusul kegiatan ini — persetujuan harus dilakukan verifikator lain.';

/** Kalimat konflik kepentingan pada naskah cerita. */
export const PESAN_KONFLIK_CERITA =
	'Anda penulis naskah ini — peninjauan harus dilakukan verifikator lain.';

/**
 * Alasan yang ditampilkan untuk transisi sah yang belum punya jalur eksekusi di
 * konsol ini. Lihat butir 5 pada catatan berkas.
 * @type {string}
 */
const BELUM_TERSEDIA_KEGIATAN =
	'Perubahan status agenda yang sudah terjadwal belum tersedia di konsol verifikator. Kontrak store editorial belum memuat jalurnya.';

/**
 * @typedef {object} Decision
 * @property {string} to            Status tujuan; salah satu STORY_STATUS / EventStatus.
 * @property {string} label         Teks tombol.
 * @property {string} description   Satu kalimat akibat keputusan ini.
 * @property {'primary'|'secondary'|'danger'} tone  Bobot visual tombol.
 * @property {string} input         Salah satu `DecisionInput`.
 * @property {string} noteLabel     Label isian catatan; kosong bila tidak ada isian.
 * @property {string} notePlaceholder
 * @property {((entity: object, payload: DecisionPayload) => Promise<{ok: boolean, reason: string}>)|null} jalankan
 *   `null` berarti transisi sah tetapi belum punya jalur eksekusi di konsol ini.
 * @property {string} alasanTidakTersedia  Terisi hanya bila `jalankan === null`.
 */

/**
 * @typedef {object} DecisionPayload
 * @property {string} [note]                 Catatan bebas.
 * @property {string} [reason]               Kunci `STORY_ARCHIVE_REASON`.
 * @property {boolean} [sensitivityConfirmed] Checklist data sensitif dinyatakan lolos.
 */

/**
 * Membekukan satu entri registri sekaligus mengisi field opsionalnya, supaya
 * pemanggil tidak pernah menemukan `undefined` pada `noteLabel` maupun
 * `alasanTidakTersedia`.
 *
 * @param {Partial<Decision> & {to: string, label: string}} entri
 * @returns {Decision}
 */
function keputusan(entri) {
	return Object.freeze({
		description: '',
		tone: 'secondary',
		input: DecisionInput.NONE,
		noteLabel: '',
		notePlaceholder: '',
		jalankan: null,
		alasanTidakTersedia: '',
		...entri
	});
}

/**
 * Registri keputusan naskah cerita, berkunci STATUS TUJUAN.
 *
 * `DIAJUKAN` ikut terdaftar meski tidak pernah muncul di zona ini: transisinya
 * milik AWARDEE, sehingga `allowedStoryTransitions(…, VERIFIER)` tidak akan pernah
 * mengembalikannya. Ia tetap didaftarkan supaya registri ini utuh terhadap
 * `STORY_TRANSITIONS`, dan supaya ketidakhadirannya di layar terbukti berasal dari
 * peta transisi, bukan dari registri yang kebetulan tidak lengkap.
 * @type {Readonly<Record<string, Decision>>}
 */
export const STORY_DECISIONS = Object.freeze({
	[STORY_STATUS.DIAJUKAN]: keputusan({
		to: STORY_STATUS.DIAJUKAN,
		label: 'Kirim ke antrean tinjauan',
		description: 'Naskah masuk ke antrean verifikator dan menunggu diambil.',
		tone: 'primary',
		jalankan: (story) => editorial.submitStory(story)
	}),
	[STORY_STATUS.REVIEW]: keputusan({
		to: STORY_STATUS.REVIEW,
		label: 'Ambil untuk ditinjau',
		description: 'Naskah tercatat atas nama Anda dan keluar dari antrean bersama.',
		tone: 'primary',
		jalankan: (story) => editorial.startReview(story)
	}),
	[STORY_STATUS.DISETUJUI]: keputusan({
		to: STORY_STATUS.DISETUJUI,
		label: 'Setujui naskah',
		description:
			'Menyatakan naskah lolos checklist data sensitif dan siap dijadwalkan terbit.',
		tone: 'primary',
		input: DecisionInput.SENSITIVITY,
		noteLabel: 'Catatan persetujuan (opsional)',
		notePlaceholder: 'Catatan untuk jejak audit, misalnya butir yang sempat diredaksi.',
		jalankan: (story, payload) =>
			editorial.approve(story, {
				sensitivityConfirmed: payload.sensitivityConfirmed === true,
				note: payload.note ?? ''
			})
	}),
	[STORY_STATUS.PERLU_REVISI]: keputusan({
		to: STORY_STATUS.PERLU_REVISI,
		label: 'Minta revisi',
		description: 'Naskah kembali ke penulis beserta catatan perbaikan Anda.',
		tone: 'secondary',
		input: DecisionInput.NOTE,
		noteLabel: 'Catatan revisi (wajib)',
		notePlaceholder:
			'Sebutkan bagian mana yang harus diperbaiki dan mengapa, agar penulis tidak menebak.',
		jalankan: (story, payload) => editorial.requestRevision(story, payload.note ?? '')
	}),
	[STORY_STATUS.TERPUBLIKASI]: keputusan({
		to: STORY_STATUS.TERPUBLIKASI,
		label: 'Terbitkan ke ruang publik',
		description:
			'Gerbang penerbitan diperiksa ulang saat tombol ditekan, termasuk consent penulis.',
		tone: 'primary',
		jalankan: (story) => editorial.publish(story)
	}),
	[STORY_STATUS.DIARSIPKAN]: keputusan({
		to: STORY_STATUS.DIARSIPKAN,
		label: 'Arsipkan naskah',
		description: 'Naskah berhenti tampil di publik namun tetap tersimpan pada jejak audit.',
		tone: 'danger',
		input: DecisionInput.ARCHIVE_REASON,
		noteLabel: 'Alasan arsip (wajib)',
		notePlaceholder: '',
		jalankan: (story, payload) => editorial.archive(story, payload.reason ?? '')
	})
});

/**
 * Registri keputusan usulan kegiatan, berkunci STATUS TUJUAN.
 * @type {Readonly<Record<string, Decision>>}
 */
export const EVENT_DECISIONS = Object.freeze({
	[EventStatus.DIUSULKAN]: keputusan({
		to: EventStatus.DIUSULKAN,
		label: 'Ajukan usulan',
		description: 'Usulan masuk ke antrean dan menunggu keputusan verifikator lain.',
		tone: 'primary',
		jalankan: (event) => editorial.proposeEvent(event)
	}),
	[EventStatus.TERJADWAL]: keputusan({
		to: EventStatus.TERJADWAL,
		label: 'Setujui usulan',
		description: 'Kegiatan terbit ke kalender publik pada saat itu juga.',
		tone: 'primary',
		jalankan: (event) => editorial.approveEvent(event)
	}),
	[EventStatus.DITOLAK]: keputusan({
		to: EventStatus.DITOLAK,
		label: 'Tolak usulan',
		description: 'Usulan ditutup beserta alasannya, dan pengusul dapat membacanya.',
		tone: 'danger',
		input: DecisionInput.NOTE,
		noteLabel: 'Alasan penolakan (wajib)',
		notePlaceholder: 'Jelaskan apa yang membuat usulan ini belum dapat dijadwalkan.',
		jalankan: (event, payload) => editorial.rejectEvent(event, payload.note ?? '')
	}),
	[EventStatus.BERLANGSUNG]: keputusan({
		to: EventStatus.BERLANGSUNG,
		label: 'Tandai sedang berlangsung',
		description: 'Menandai agenda yang sudah dimulai.',
		alasanTidakTersedia: BELUM_TERSEDIA_KEGIATAN
	}),
	[EventStatus.SELESAI]: keputusan({
		to: EventStatus.SELESAI,
		label: 'Tandai selesai',
		description: 'Menutup agenda yang sudah dilaksanakan.',
		alasanTidakTersedia: BELUM_TERSEDIA_KEGIATAN
	}),
	[EventStatus.DIBATALKAN]: keputusan({
		to: EventStatus.DIBATALKAN,
		label: 'Batalkan kegiatan',
		description: 'Agenda dicabut dari kalender beserta alasan pembatalannya.',
		tone: 'danger',
		input: DecisionInput.NOTE,
		noteLabel: 'Alasan pembatalan (wajib)',
		notePlaceholder: 'Jelaskan sebab pembatalan agar peserta yang sudah mendaftar memahaminya.',
		alasanTidakTersedia: BELUM_TERSEDIA_KEGIATAN
	})
});

/**
 * Keputusan naskah yang boleh diambil sebuah peran dari status tertentu.
 *
 * Daftarnya berasal dari peta transisi domain; registri hanya memberinya rupa.
 * Status tujuan yang tidak dikenal registri dilewati (butir 2 catatan berkas).
 *
 * @param {string} status Status naskah saat ini.
 * @param {string|null} role Peran aktor; `null` untuk tamu.
 * @returns {Decision[]} Kosong bila tidak ada transisi yang sah.
 */
export function keputusanCerita(status, role) {
	return allowedStoryTransitions(status, role)
		.map((tujuan) => STORY_DECISIONS[tujuan])
		.filter((entri) => entri !== undefined);
}

/**
 * Keputusan kegiatan yang boleh diambil sebuah peran dari status tertentu.
 *
 * @param {string} status Status kegiatan saat ini.
 * @param {string|null} role Peran aktor; `null` untuk tamu.
 * @returns {Decision[]} Kosong bila tidak ada transisi yang sah.
 */
export function keputusanKegiatan(status, role) {
	return allowedEventTransitions(status, role)
		.map((tujuan) => EVENT_DECISIONS[tujuan])
		.filter((entri) => entri !== undefined);
}

/**
 * Memeriksa kelengkapan masukan sebuah keputusan SEBELUM ia dikirim ke domain.
 *
 * Pemeriksaan yang sama dijalankan ulang `ContentReviewService`; yang ini ada
 * supaya penolakan menjelaskan syarat yang kurang pada saat pengguna masih menatap
 * isian yang bersangkutan, bukan sesudah dialog tertutup.
 *
 * @param {Decision} decision
 * @param {DecisionPayload} payload
 * @returns {{ok: boolean, message: string}} `message` kosong bila lengkap.
 */
export function periksaMasukan(decision, payload) {
	const isi = payload ?? {};
	if (decision.input === DecisionInput.NOTE) {
		const catatan = typeof isi.note === 'string' ? isi.note.trim() : '';
		if (catatan === '') return { ok: false, message: PESAN_CATATAN_WAJIB };
	}
	if (decision.input === DecisionInput.ARCHIVE_REASON) {
		const alasan = typeof isi.reason === 'string' ? isi.reason : '';
		if (!Object.hasOwn(STORY_ARCHIVE_REASON, alasan)) {
			return { ok: false, message: PESAN_ALASAN_WAJIB };
		}
	}
	if (decision.input === DecisionInput.SENSITIVITY && isi.sensitivityConfirmed !== true) {
		return { ok: false, message: PESAN_SENSITIVITAS_WAJIB };
	}
	return { ok: true, message: '' };
}

/**
 * Label Bahasa Indonesia tiap alasan arsip, untuk pemilih pada dialog keputusan.
 * @type {Readonly<Record<string, string>>}
 */
export const ARCHIVE_REASON_LABEL = Object.freeze({
	[STORY_ARCHIVE_REASON.DITOLAK]: 'Ditolak permanen setelah peninjauan',
	[STORY_ARCHIVE_REASON.KEDALUWARSA]: 'Kedaluwarsa — tidak lagi relevan',
	[STORY_ARCHIVE_REASON.CONSENT_DICABUT]: 'Consent penulis dicabut',
	[STORY_ARCHIVE_REASON.PERMINTAAN_ANGGOTA]: 'Atas permintaan penulis',
	[STORY_ARCHIVE_REASON.IDLE_TIMEOUT]: 'Tidak ditindaklanjuti hingga batas waktu'
});
