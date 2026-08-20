/**
 * ADAPTER TAMPILAN: Kalender Komunitas publik (`/kalender`, `/kalender/[id]`).
 *
 * Tanggung jawab: menyaring, mengelompokkan, dan melengkapi agenda komunitas
 * untuk dua halaman publik. Berkas berawalan garis bawah dan tanpa `+`, sehingga
 * SvelteKit tidak pernah menjadikannya rute.
 *
 * LIMA KEPUTUSAN YANG TIDAK TERBACA DARI KODE:
 *
 * 1. **`eventCardVM` TIDAK ditulis ulang di sini.** Pemeta entity → kartu agenda
 *    hanya boleh ada satu di seluruh proyek (`docs/12` §2.13, KP-3); berkas ini
 *    memanggilnya dan MELENGKAPI hasilnya untuk halaman detail, bukan menyusun
 *    versi tandingannya. Bila kelak `EventCardVM` bertambah field, halaman
 *    kalender ikut mendapatkannya tanpa satu baris pun berubah di sini.
 *
 * 2. **Penyaring publik selalu berjalan LEBIH DULU dan hanya lewat satu gerbang.**
 *    Setiap fungsi yang mengembalikan kegiatan pada berkas ini memanggil
 *    `kegiatanTampilPublik(status)`: fungsi yang sama yang dipakai entity dan
 *    store. Menyusun perbandingan status sendiri di halaman adalah persis cara
 *    usulan mentah bocor sebagai agenda resmi (risiko R-09): kodenya tetap sah,
 *    tidak ada gerbang statis yang berubah merah, dan yang rugi adalah pengusul
 *    yang usulannya terbit sebelum disetujui siapa pun.
 *
 * 3. **Penyaringan dilakukan pada ENTITY, bukan pada view-model.** `EventCardVM`
 *    membawa `chapterLabel` yang sudah menjadi teks, bukan `chapterId`; menyaring
 *    di atasnya berarti membandingkan label yang dapat berubah kapan saja. Urutan
 *    yang benar: saring entity → petakan yang tersisa.
 *
 * 4. **Chapter dan komunitas menyaring secara INKLUSIF.** Kegiatan dengan
 *    `chapterId` kosong berarti terbuka untuk seluruh chapter, dan kegiatan dengan
 *    `community` kosong terbuka untuk kedua komunitas. Menyembunyikan keduanya
 *    saat seseorang memilih "Chapter PF 11" akan menyembunyikan justru sebagian
 *    besar agenda yang boleh ia hadiri: penyaring yang secara teknis benar dan
 *    secara praktis menyesatkan.
 *
 * 5. **Detail publik disusun dengan DAFTAR PUTIH.** `detailKegiatan()` menyebut
 *    satu per satu field yang boleh dibaca publik, bukan menyalin seluruh entity
 *    lalu menghapus yang sensitif. Field baru yang kelak ditambahkan ke entity
 *    karena itu berstatus tersembunyi sampai seseorang sengaja membukanya :
 *    arah kegagalan yang benar untuk daftar pendaftar dan identitas pengusul.
 *
 * @see docs/12-BUILD-CONTRACT-V2.md: §3.5 WP-08 kriteria selesai 2, 3, 4
 * @see docs/10-REVISION-SPEC.md: batas visibilitas kalender publik
 */

import {
	EVENT_STATUS_META,
	EVENT_TYPE_META,
	kegiatanTampilPublik
} from '$lib/domain/entities/CommunityEvent.js';
import { CHAPTERS, COMMUNITIES } from '$lib/domain/constants/community.js';
import { eventCardVM } from '$lib/components/editorial/view-model.js';
import { awalBulan, kunciBulan, hariSama, NAMA_BULAN } from '$lib/utils/date.js';
import { formatTanggal } from '$lib/utils/format.js';

/**
 * @typedef {import('$lib/components/editorial/view-model.js').EventCardVM} EventCardVM
 */

/** Nilai penyaring yang berarti "tanpa pembatasan". */
export const SEMUA = 'SEMUA';

/**
 * Cara kehadiran sebuah kegiatan. Model data hanya mengenal satu boolean
 * (`isOnline`); dua nilai ini adalah bacaan manusiawinya, bukan sumbu baru.
 * @readonly
 * @enum {string}
 */
export const ModeKehadiran = Object.freeze({
	DARING: 'DARING',
	LURING: 'LURING'
});

/**
 * @typedef {object} OpsiSaring
 * @property {string} value
 * @property {string} label
 */

/**
 * Pilihan jenis kegiatan, diturunkan dari `EVENT_TYPE_META`: bukan daftar tulis
 * tangan yang akan tertinggal begitu jenis keempat muncul.
 * @type {readonly OpsiSaring[]}
 */
export const OPSI_JENIS = Object.freeze([
	Object.freeze({ value: SEMUA, label: 'Semua jenis' }),
	...Object.values(EVENT_TYPE_META).map((meta) =>
		Object.freeze({ value: meta.code, label: meta.label })
	)
]);

/**
 * Pilihan chapter penyelenggara, mengikuti urutan resmi `CHAPTERS`.
 * @type {readonly OpsiSaring[]}
 */
export const OPSI_CHAPTER = Object.freeze([
	Object.freeze({ value: SEMUA, label: 'Semua chapter' }),
	...[...CHAPTERS]
		.sort((a, b) => a.urutan - b.urutan)
		.map((def) => Object.freeze({ value: def.id, label: def.label }))
]);

/**
 * Pilihan komunitas sasaran.
 * @type {readonly OpsiSaring[]}
 */
export const OPSI_KOMUNITAS = Object.freeze([
	Object.freeze({ value: SEMUA, label: 'Semua komunitas' }),
	...COMMUNITIES.map((def) => Object.freeze({ value: def.id, label: def.akronim }))
]);

/**
 * Pilihan cara kehadiran.
 * @type {readonly OpsiSaring[]}
 */
export const OPSI_MODE = Object.freeze([
	Object.freeze({ value: SEMUA, label: 'Daring & luring' }),
	Object.freeze({ value: ModeKehadiran.DARING, label: 'Daring' }),
	Object.freeze({ value: ModeKehadiran.LURING, label: 'Luring' })
]);

/**
 * @typedef {object} FilterKalender
 * @property {string} jenis     Salah satu `EventType`, atau `SEMUA`.
 * @property {string} chapterId Salah satu id chapter, atau `SEMUA`.
 * @property {string} community Salah satu `CommunityType`, atau `SEMUA`.
 * @property {string} mode      Salah satu `ModeKehadiran`, atau `SEMUA`.
 */

/**
 * Keadaan penyaring saat halaman pertama dibuka: seluruh agenda terlihat.
 * @returns {FilterKalender}
 */
export function filterAwal() {
	return { jenis: SEMUA, chapterId: SEMUA, community: SEMUA, mode: SEMUA };
}

/**
 * Apakah ada penyaring yang sedang membatasi daftar.
 * @param {FilterKalender} filter
 * @returns {boolean}
 */
export function adaFilterAktif(filter) {
	return Object.values(filter ?? {}).some((nilai) => nilai !== SEMUA);
}

/**
 * Banyaknya penyaring yang sedang aktif: dipakai label tombol "Atur ulang".
 * @param {FilterKalender} filter
 * @returns {number}
 */
export function jumlahFilterAktif(filter) {
	return Object.values(filter ?? {}).filter((nilai) => nilai !== SEMUA).length;
}

/**
 * GERBANG TUNGGAL halaman kalender publik.
 *
 * Menerima instans `CommunityEvent` maupun objek datar: keduanya membawa `status`,
 * dan jawabannya diambil dari `kegiatanTampilPublik()`: bukan dari perbandingan
 * status yang disalin ke sini. Lihat keputusan 2.
 *
 * @param {any} event
 * @returns {boolean}
 */
export function bolehTampilPublik(event) {
	return Boolean(event) && kegiatanTampilPublik(String(event.status ?? ''));
}

/**
 * Seluruh kegiatan yang boleh dilihat siapa pun, paling awal lebih dulu.
 * @param {readonly any[]} events
 * @returns {any[]}
 */
export function kegiatanPublik(events) {
	return (Array.isArray(events) ? events : [])
		.filter(bolehTampilPublik)
		.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
}

/**
 * Apakah satu kegiatan lolos sebuah penyaring.
 *
 * Chapter dan komunitas dibaca inklusif (keputusan 4): nilai kosong pada entity
 * berarti "terbuka untuk semua", jadi ia lolos penyaring apa pun.
 *
 * @param {any} event
 * @param {FilterKalender} filter
 * @returns {boolean}
 */
function lolosFilter(event, filter) {
	const { jenis, chapterId, community, mode } = { ...filterAwal(), ...(filter ?? {}) };

	if (jenis !== SEMUA && String(event.type ?? '') !== jenis) return false;

	const chapterKegiatan = String(event.chapterId ?? '');
	if (chapterId !== SEMUA && chapterKegiatan !== '' && chapterKegiatan !== chapterId) return false;

	const komunitasKegiatan = String(event.community ?? '');
	if (community !== SEMUA && komunitasKegiatan !== '' && komunitasKegiatan !== community) {
		return false;
	}

	if (mode !== SEMUA) {
		const daring = event.isOnline === true;
		if (mode === ModeKehadiran.DARING && !daring) return false;
		if (mode === ModeKehadiran.LURING && daring) return false;
	}

	return true;
}

/**
 * Kegiatan publik yang lolos penyaring, paling awal lebih dulu.
 * @param {readonly any[]} events
 * @param {FilterKalender} filter
 * @returns {any[]}
 */
export function saringKegiatan(events, filter) {
	return kegiatanPublik(events).filter((event) => lolosFilter(event, filter));
}

/**
 * Memetakan kegiatan menjadi baris agenda siap render.
 *
 * Kegiatan yang tanggalnya tidak sah dilewati, bukan menjatuhkan halaman:
 * `eventCardVM` sengaja melempar untuk kasus itu, dan satu baris data rusak tidak
 * boleh mengosongkan seluruh kalender publik. Kejadiannya tetap dicatat ke konsol
 * supaya tidak lenyap tanpa jejak.
 *
 * @param {readonly any[]} events Sudah tersaring; fungsi ini tidak menyaring lagi.
 * @returns {EventCardVM[]}
 */
export function keAgenda(events) {
	/** @type {EventCardVM[]} */
	const hasil = [];
	for (const event of Array.isArray(events) ? events : []) {
		try {
			hasil.push(eventCardVM(event));
		} catch (penyebab) {
			console.warn('[kalender] Satu kegiatan dilewati karena tanggalnya tidak sah.', penyebab);
		}
	}
	return hasil;
}

/**
 * @typedef {object} KelompokBulan
 * @property {string} kunci          `YYYY-MM`.
 * @property {string} label          Mis. `Agustus 2026`.
 * @property {Date} bulan            Tanggal 1 bulan tersebut.
 * @property {EventCardVM[]} items
 */

/**
 * Mengelompokkan agenda per bulan, urut menaik.
 *
 * Bulan tanpa kegiatan tidak dibuatkan kelompok kosong: tampilan daftar hanya
 * menampilkan bulan yang benar-benar berisi, dan "September 2026: tidak ada
 * kegiatan" berulang tujuh kali bukan informasi, melainkan derau.
 *
 * @param {readonly EventCardVM[]} agenda
 * @returns {KelompokBulan[]}
 */
export function kelompokPerBulan(agenda) {
	/** @type {Map<string, KelompokBulan>} */
	const peta = new Map();

	for (const item of agenda ?? []) {
		const kunci = kunciBulan(item.startsAt);
		if (!kunci) continue;
		if (!peta.has(kunci)) {
			const bulan = awalBulan(item.startsAt) ?? new Date();
			peta.set(kunci, {
				kunci,
				label: `${NAMA_BULAN[bulan.getMonth()]} ${bulan.getFullYear()}`,
				bulan,
				items: []
			});
		}
		peta.get(kunci)?.items.push(item);
	}

	return [...peta.values()].sort((a, b) => a.bulan.getTime() - b.bulan.getTime());
}

/**
 * Agenda satu bulan tertentu.
 * @param {readonly EventCardVM[]} agenda
 * @param {Date} bulan
 * @returns {EventCardVM[]}
 */
export function agendaBulan(agenda, bulan) {
	const acuan = awalBulan(bulan);
	if (!acuan) return [];
	return (agenda ?? []).filter(
		(item) =>
			item.startsAt.getFullYear() === acuan.getFullYear() &&
			item.startsAt.getMonth() === acuan.getMonth()
	);
}

/**
 * Agenda satu tanggal tertentu.
 * @param {readonly EventCardVM[]} agenda
 * @param {Date|null} tanggal
 * @returns {EventCardVM[]}
 */
export function agendaTanggal(agenda, tanggal) {
	if (!tanggal) return [];
	return (agenda ?? []).filter((item) => hariSama(item.startsAt, tanggal));
}

/**
 * Batas navigasi bulan `MonthCalendar`: bulan kegiatan terawal sampai terakhir.
 *
 * Bulan berjalan selalu ikut masuk rentang walau kosong: kalender yang menolak
 * menampilkan bulan ini karena kebetulan tidak ada agenda terasa rusak, bukan
 * informatif.
 *
 * @param {readonly EventCardVM[]} agenda
 * @param {Date} [acuan] Waktu "sekarang".
 * @returns {{min: Date, max: Date}}
 */
export function rentangBulan(agenda, acuan = new Date()) {
	const bulanAcuan = awalBulan(acuan) ?? new Date();
	const daftar = (agenda ?? [])
		.map((item) => awalBulan(item.startsAt))
		.filter(/** @returns {tanggal is Date} */ (tanggal) => tanggal instanceof Date);

	const semua = [bulanAcuan, ...daftar];
	const waktu = semua.map((tanggal) => tanggal.getTime());

	return { min: new Date(Math.min(...waktu)), max: new Date(Math.max(...waktu)) };
}

/**
 * Bulan yang paling masuk akal ditampilkan lebih dulu: bulan berjalan bila ada
 * agendanya, jika tidak bulan kegiatan mendatang terdekat, jika tidak bulan
 * berjalan apa adanya.
 *
 * @param {readonly EventCardVM[]} agenda
 * @param {Date} [acuan]
 * @returns {Date}
 */
export function bulanAwal(agenda, acuan = new Date()) {
	const bulanAcuan = awalBulan(acuan) ?? new Date();
	if (agendaBulan(agenda, bulanAcuan).length > 0) return bulanAcuan;

	const mendatang = (agenda ?? [])
		.filter((item) => item.startsAt.getTime() >= acuan.getTime())
		.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())[0];

	return mendatang ? (awalBulan(mendatang.startsAt) ?? bulanAcuan) : bulanAcuan;
}

/**
 * Mencari satu kegiatan publik berdasarkan slug ATAU id.
 *
 * Keduanya diterima karena `eventCardVM` menyusun tautan detail dari slug,
 * sedangkan rute bernama `[id]`: dan tautan lama yang menyebut id sungguhan
 * tetap harus terbuka alih-alih menjadi halaman "tidak ditemukan" yang keliru.
 *
 * Kegiatan yang belum lolos gerbang publik dikembalikan sebagai `null`, sehingga
 * usulan yang belum disetujui tidak dapat dibuka lewat tebakan alamat sekalipun.
 *
 * @param {readonly any[]} events
 * @param {string} penciri Slug atau id.
 * @returns {any|null}
 */
export function cariKegiatanPublik(events, penciri) {
	const kunci = String(penciri ?? '').trim();
	if (!kunci) return null;
	return (
		kegiatanPublik(events).find(
			(event) => String(event.slug ?? '') === kunci || String(event.id ?? '') === kunci
		) ?? null
	);
}

/**
 * Label komunitas sasaran yang aman untuk id kosong maupun asing.
 * @param {string} id
 * @returns {string}
 */
function labelKomunitas(id) {
	if (!id) return 'Terbuka untuk kedua komunitas';
	return COMMUNITIES.find((def) => def.id === id)?.nama ?? 'Terbuka untuk kedua komunitas';
}

/**
 * @typedef {EventCardVM & {
 *   statusLabel: string,
 *   tanggalLengkap: string,
 *   description: string,
 *   speakerName: string,
 *   locationLabel: string,
 *   communityLabel: string,
 *   outcomeNote: string,
 *   sudahBerlangsung: boolean
 * }} DetailKegiatanVM
 */

/**
 * Melengkapi kartu agenda menjadi tampilan halaman detail publik.
 *
 * DAFTAR PUTIH (keputusan 5). Yang sengaja TIDAK ikut, dan alasannya:
 * `registeredAwardeeIds` & `attendeeAwardeeIds` (identitas peserta),
 * `quota` & sisa kursi (mengundang perlombaan kursi pada halaman yang tidak
 * punya tombol daftar), `proposedBy` & `proposedByRole` & `reviewedBy` &
 * `reviewNote` (jejak audit internal: publik tidak perlu tahu siapa menyetujui
 * agenda siapa), `evidenceRefs` (nama berkas dokumentasi internal).
 *
 * @param {any} event Kegiatan yang SUDAH lolos `cariKegiatanPublik`.
 * @returns {DetailKegiatanVM}
 * @throws {TypeError} bila `event` kosong atau tanggalnya tidak sah.
 */
export function detailKegiatan(event) {
	const kartu = eventCardVM(event);
	const status = String(event.status ?? '');
	const daring = event.isOnline === true;
	const lokasi = String(event.location ?? '').trim();

	return {
		...kartu,
		statusLabel: EVENT_STATUS_META[status]?.label ?? 'Terjadwal',
		tanggalLengkap: formatTanggal(kartu.startsAt, 'penuh'),
		description: String(event.description ?? ''),
		speakerName: String(event.speakerName ?? ''),
		locationLabel: lokasi || (daring ? 'Kanal daring diumumkan menjelang hari-H' : 'Menyusul'),
		communityLabel: labelKomunitas(String(event.community ?? '')),
		// Catatan hasil hanya terisi pada kegiatan yang sudah selesai; ia bagian
		// dari pertanggungjawaban publik, bukan data internal.
		outcomeNote: String(event.outcomeNote ?? ''),
		sudahBerlangsung: kartu.startsAt.getTime() < Date.now()
	};
}
