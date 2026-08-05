/**
 * KONSTANTA ALUR EDITORIAL — peta transisi cerita dan kegiatan sebagai DATA.
 *
 * Tanggung jawab: menyatakan transisi status mana yang sah, dan oleh peran apa.
 * Sebelum berkas ini ada, legalitas transisi tersebar di store dan di halaman —
 * artinya ia hidup sebagai tombol yang dirender atau tidak dirender. Tombol yang
 * tidak dirender tetap dapat dipanggil, sehingga itu bukan kontrol.
 *
 * Keputusan desain yang tidak terbaca dari kode:
 *
 * 1. **Peta ini murni.** Ia tidak tahu siapa aktornya, tidak menyentuh basis data,
 *    dan tidak memeriksa gerbang entity (`isSubmittable`, `isPublishable`) maupun
 *    konflik kepentingan. Ketiganya diperiksa `ContentReviewService` SESUDAH peta
 *    ini menyatakan transisinya sah. Memisahkan keduanya membuat peta transisi
 *    dapat diuji di `node` polos tanpa satu pun tiruan.
 * 2. **Kegiatan memakai SATU sumbu status.** Usulan `DIUSULKAN`/`DITOLAK` hidup di
 *    `EventStatus` yang sama dengan `TERJADWAL`/`SELESAI`, bukan pada sumbu
 *    publikasi terpisah. Dua sumbu menuntut dua peta metadata dan dua helper yang
 *    harus dijaga sinkron oleh banyak paket sekaligus — biaya yang tidak sebanding
 *    dengan satu kasus tepi yang tidak muncul di data mana pun.
 * 3. **Angka SLA hanya ada di sini.** Komponen dan service dilarang menulis
 *    literal hari kerja.
 *
 * @see docs/12-BUILD-CONTRACT-V2.md — §2.2 kontrak export dan peta transisi wajib
 * @see docs/10-REVISION-SPEC.md — §5.2 state machine cerita, §5.3 tabel transisi, §5.6 SLA
 */

import { EventStatus } from '../entities/CommunityEvent.js';
import { STORY_STATUS } from './community.js';
import { UserRole } from './roles.js';

/**
 * @typedef {object} Transition
 * @property {string} to                Status tujuan.
 * @property {readonly string[]} by     Peran yang berwenang menjalankannya.
 */

/**
 * Peta transisi naskah cerita.
 *
 * Yang sengaja TIDAK ada, beserta alasannya:
 * - `DIAJUKAN → DISETUJUI` (melompati review) — menghapus satu-satunya titik
 *   tempat checklist data sensitif benar-benar dijalankan.
 * - `DISETUJUI → PERLU_REVISI` — persetujuan sudah mengunci validasi PF. Temuan
 *   baru ditangani lewat arsip, supaya jejak persetujuan lama tidak terhapus.
 * - ADMIN sebagai aktor review/persetujuan/penerbitan — keputusan konten milik
 *   Verifikator; Admin membaca, mengekspor, dan memegang jalur banding.
 * - Transisi apa pun keluar dari `DIARSIPKAN` — terminal. Naskah yang hidup
 *   kembali adalah naskah baru dengan id baru.
 * @type {Readonly<Record<string, readonly Transition[]>>}
 */
export const STORY_TRANSITIONS = Object.freeze({
	[STORY_STATUS.DRAFT]: Object.freeze([
		Object.freeze({ to: STORY_STATUS.DIAJUKAN, by: Object.freeze([UserRole.AWARDEE]) })
	]),
	[STORY_STATUS.DIAJUKAN]: Object.freeze([
		Object.freeze({ to: STORY_STATUS.REVIEW, by: Object.freeze([UserRole.VERIFIER]) })
	]),
	[STORY_STATUS.REVIEW]: Object.freeze([
		Object.freeze({ to: STORY_STATUS.DISETUJUI, by: Object.freeze([UserRole.VERIFIER]) }),
		Object.freeze({ to: STORY_STATUS.PERLU_REVISI, by: Object.freeze([UserRole.VERIFIER]) }),
		// Penolakan permanen: statusnya sama dengan takedown, bedanya pada archiveReason.
		Object.freeze({ to: STORY_STATUS.DIARSIPKAN, by: Object.freeze([UserRole.VERIFIER]) })
	]),
	[STORY_STATUS.PERLU_REVISI]: Object.freeze([
		Object.freeze({ to: STORY_STATUS.DIAJUKAN, by: Object.freeze([UserRole.AWARDEE]) })
	]),
	[STORY_STATUS.DISETUJUI]: Object.freeze([
		Object.freeze({ to: STORY_STATUS.TERPUBLIKASI, by: Object.freeze([UserRole.VERIFIER]) }),
		Object.freeze({ to: STORY_STATUS.DIARSIPKAN, by: Object.freeze([UserRole.VERIFIER]) })
	]),
	[STORY_STATUS.TERPUBLIKASI]: Object.freeze([
		Object.freeze({
			to: STORY_STATUS.DIARSIPKAN,
			by: Object.freeze([UserRole.VERIFIER, UserRole.ADMIN])
		})
	]),
	[STORY_STATUS.DIARSIPKAN]: Object.freeze([])
});

/**
 * Peta transisi kegiatan komunitas.
 *
 * `DIUSULKAN → TERJADWAL` berarti "terbit ke kalender publik": tidak ada sumbu
 * publikasi kedua. Pengusul dilarang menyetujui usulannya sendiri; pemeriksaan itu
 * milik `ContentReviewService`, bukan peta ini, karena peta ini tidak mengenal
 * identitas aktor.
 * @type {Readonly<Record<string, readonly Transition[]>>}
 */
export const EVENT_TRANSITIONS = Object.freeze({
	[EventStatus.DRAFT]: Object.freeze([
		Object.freeze({
			to: EventStatus.DIUSULKAN,
			by: Object.freeze([UserRole.AWARDEE, UserRole.VERIFIER])
		})
	]),
	[EventStatus.DIUSULKAN]: Object.freeze([
		Object.freeze({ to: EventStatus.TERJADWAL, by: Object.freeze([UserRole.VERIFIER]) }),
		Object.freeze({ to: EventStatus.DITOLAK, by: Object.freeze([UserRole.VERIFIER]) })
	]),
	[EventStatus.TERJADWAL]: Object.freeze([
		Object.freeze({
			to: EventStatus.BERLANGSUNG,
			by: Object.freeze([UserRole.VERIFIER, UserRole.ADMIN])
		}),
		Object.freeze({
			to: EventStatus.DIBATALKAN,
			by: Object.freeze([UserRole.VERIFIER, UserRole.ADMIN])
		})
	]),
	[EventStatus.BERLANGSUNG]: Object.freeze([
		Object.freeze({
			to: EventStatus.SELESAI,
			by: Object.freeze([UserRole.VERIFIER, UserRole.ADMIN])
		}),
		// Pembatalan mendadak saat kegiatan sudah berjalan tetap harus mungkin —
		// `cancelEvent` melayani TERJADWAL maupun BERLANGSUNG.
		Object.freeze({
			to: EventStatus.DIBATALKAN,
			by: Object.freeze([UserRole.VERIFIER, UserRole.ADMIN])
		})
	]),
	[EventStatus.SELESAI]: Object.freeze([]),
	[EventStatus.DITOLAK]: Object.freeze([]),
	[EventStatus.DIBATALKAN]: Object.freeze([])
});

/**
 * SLA dalam hari kerja. Satu-satunya sumber angka SLA — dilarang literal di
 * komponen maupun service.
 * @type {Readonly<Record<string, number>>}
 */
export const SLA_HARI_KERJA = Object.freeze({
	STORY_DIAJUKAN: 2,
	STORY_REVIEW: 3,
	STORY_DISETUJUI: 5,
	EVENT_DIUSULKAN: 2
});

/**
 * Mencari transisi yang sah dari sebuah status untuk sebuah peran.
 * @param {Readonly<Record<string, readonly Transition[]>>} peta
 * @param {string} from
 * @param {string|null} role
 * @returns {string[]}
 */
function transisiSah(peta, from, role) {
	if (typeof from !== 'string' || typeof role !== 'string') return [];
	const daftar = peta[from];
	if (!daftar) return [];
	return daftar.filter((transisi) => transisi.by.includes(role)).map((transisi) => transisi.to);
}

/**
 * Status tujuan cerita yang boleh dituju seorang peran dari status tertentu.
 *
 * Dipakai untuk MERENDER tombol keputusan, bukan hanya untuk memvalidasinya —
 * dengan begitu daftar tombol tidak pernah berbeda dari daftar transisi.
 *
 * @param {string} from Status cerita saat ini.
 * @param {string|null} role Peran aktor; `null` untuk tamu.
 * @returns {string[]} Kosong bila tidak ada transisi yang sah.
 */
export function allowedStoryTransitions(from, role) {
	return transisiSah(STORY_TRANSITIONS, from, role);
}

/**
 * Status tujuan kegiatan yang boleh dituju seorang peran dari status tertentu.
 * @param {string} from Status kegiatan saat ini.
 * @param {string|null} role Peran aktor; `null` untuk tamu.
 * @returns {string[]} Kosong bila tidak ada transisi yang sah.
 */
export function allowedEventTransitions(from, role) {
	return transisiSah(EVENT_TRANSITIONS, from, role);
}

/**
 * Apakah sebuah transisi cerita sah bagi sebuah peran.
 * @param {string} from Status asal.
 * @param {string} to Status tujuan.
 * @param {string|null} role Peran aktor.
 * @returns {boolean}
 */
export function canTransitionStory(from, to, role) {
	return allowedStoryTransitions(from, role).includes(to);
}

/**
 * Apakah sebuah transisi kegiatan sah bagi sebuah peran.
 * @param {string} from Status asal.
 * @param {string} to Status tujuan.
 * @param {string|null} role Peran aktor.
 * @returns {boolean}
 */
export function canTransitionEvent(from, to, role) {
	return allowedEventTransitions(from, role).includes(to);
}

/**
 * Apakah sebuah status terdaftar pada peta dan tidak punya transisi keluar.
 * @param {Readonly<Record<string, readonly Transition[]>>} peta
 * @param {string} status
 * @returns {boolean}
 */
function terminal(peta, status) {
	// Status yang tidak terdaftar dijawab `false`, bukan `true`: ia adalah
	// kesalahan pemrograman, dan menyebutnya terminal akan menyembunyikannya
	// sebagai "alur yang memang sudah berakhir".
	if (typeof status !== 'string' || !Object.hasOwn(peta, status)) return false;
	return peta[status].length === 0;
}

/**
 * Apakah status cerita ini terminal — tidak ada lagi transisi keluar bagi peran mana pun.
 * @param {string} status Salah satu STORY_STATUS.
 * @returns {boolean}
 */
export function isStoryTerminal(status) {
	return terminal(STORY_TRANSITIONS, status);
}

/**
 * Apakah status kegiatan ini terminal — tidak ada lagi transisi keluar bagi peran mana pun.
 * @param {string} status Salah satu EventStatus.
 * @returns {boolean}
 */
export function isEventTerminal(status) {
	return terminal(EVENT_TRANSITIONS, status);
}
