/**
 * MODUL LOKAL ZONA VERIFIKATOR — penyuntingan detail sebuah event kalender.
 *
 * Tanggung jawab: satu jalur tulis untuk mengubah DETAIL DESKRIPTIF sebuah
 * kegiatan yang sudah ada — judul, jenis, deskripsi, lokasi, waktu, dan kuota.
 *
 * Empat keputusan yang tidak terbaca dari kode, dan satu di antaranya adalah
 * penyimpangan yang harus dibaca sebelum berkas ini disalin ke tempat lain:
 *
 * 1. **Modul ini menulis lewat `eventRepository`, BUKAN lewat store `editorial`.**
 *    Itu penyimpangan dari aturan "seluruh perubahan kegiatan lewat
 *    `ContentReviewService`", dan alasannya tunggal: kontrak domain hari ini hanya
 *    mengenal transisi STATUS (usulkan, setujui, tolak, batalkan) — tidak ada satu
 *    pun jalur untuk memperbaiki salah ketik pada judul atau menggeser jam mulai.
 *    Menambahkannya berarti menyunting `src/lib/domain/**`, yang dikerjakan paket
 *    lain pada gelombang yang sama. Penyimpangan ini sengaja dikurung di satu
 *    berkas berukuran kecil di dalam zona verifikator, supaya ia mudah dicabut
 *    begitu `ContentReviewService.updateEvent()` ada.
 * 2. **`status` TIDAK pernah ikut dikirim.** Batas penyimpangan di butir 1 ditarik
 *    tepat di sini: status adalah satu-satunya field yang dijaga peta transisi,
 *    konflik kepentingan, dan jejak audit. Membiarkannya lewat jalur ini akan
 *    menjadikan formulir sunting sebagai pintu belakang yang meloloskan usulan
 *    menjadi "terjadwal" tanpa satu pun pemeriksaan. Persetujuan tetap hanya lewat
 *    `editorial.approveEvent()`.
 * 3. **Invarian entity tetap ditegakkan.** `DexieRepository.update()` merakit ulang
 *    `CommunityEvent` dari baris tergabung sebelum menyimpannya, sehingga waktu
 *    selesai yang mendahului waktu mulai — atau jenis kegiatan yang tidak dikenal —
 *    ditolak konstruktor entity, bukan diterima diam-diam.
 * 4. **Tidak melempar.** Seperti store editorial, hasilnya `{ok, reason}`: penolakan
 *    validasi adalah jawaban yang sah, dan halaman tidak boleh perlu membungkus
 *    setiap tombol simpan dengan `try`.
 */

import { EventType, EVENT_TYPE_META } from '$lib/domain/entities/CommunityEvent.js';
import { eventRepository } from '$lib/infrastructure/repositories/index.js';

/**
 * @typedef {object} EventFormValue
 * @property {string} title
 * @property {string} type
 * @property {string} description
 * @property {string} location
 * @property {boolean} isOnline
 * @property {string} startsAt  Nilai `datetime-local`.
 * @property {string} endsAt    Nilai `datetime-local`.
 * @property {number} quota
 */

/**
 * @typedef {object} ConfigOutcome
 * @property {boolean} ok
 * @property {string} reason Kalimat penolakan; `''` bila berhasil.
 */

/** Isian formulir kosong, untuk mode "tambah event". */
export function formulirKosong() {
	return {
		title: '',
		type: EventType.PERTEMUAN,
		description: '',
		location: '',
		isOnline: true,
		startsAt: '',
		endsAt: '',
		quota: 0
	};
}

/**
 * Mengubah sebuah `Date` menjadi nilai yang dimengerti `<input type="datetime-local">`.
 *
 * Sengaja TIDAK memakai `toISOString()`: metode itu menggeser nilai ke UTC, dan
 * kegiatan pukul 09.00 WIB akan muncul di formulir sebagai pukul 02.00 — kesalahan
 * yang baru ketahuan setelah agendanya terlanjur tersimpan.
 *
 * @param {Date|null|undefined} tanggal
 * @returns {string} Kosong bila tanggalnya tidak sah.
 */
export function keNilaiInput(tanggal) {
	if (!(tanggal instanceof Date) || Number.isNaN(tanggal.getTime())) return '';
	const dua = (n) => String(n).padStart(2, '0');
	return (
		`${tanggal.getFullYear()}-${dua(tanggal.getMonth() + 1)}-${dua(tanggal.getDate())}` +
		`T${dua(tanggal.getHours())}:${dua(tanggal.getMinutes())}`
	);
}

/**
 * Mengisi formulir dari sebuah kegiatan yang sudah ada.
 * @param {object} event
 * @returns {EventFormValue}
 */
export function formulirDariEvent(event) {
	return {
		title: event.title ?? '',
		type: event.type ?? EventType.PERTEMUAN,
		description: event.description ?? '',
		location: event.location ?? '',
		isOnline: Boolean(event.isOnline),
		startsAt: keNilaiInput(event.startsAt),
		endsAt: keNilaiInput(event.endsAt),
		quota: Number(event.quota) || 0
	};
}

/**
 * Memeriksa kelengkapan isian sebelum apa pun dikirim ke penyimpanan.
 *
 * Dipakai jalur "tambah" maupun "sunting" — satu pemeriksaan untuk dua jalur,
 * supaya event yang ditambahkan dan event yang disunting mustahil tunduk pada
 * dua standar kelengkapan yang berbeda.
 *
 * @param {EventFormValue} form
 * @returns {string} Kalimat penolakan; kosong berarti lengkap.
 */
export function periksaFormulirEvent(form) {
	if (form.title.trim() === '') return 'Judul event wajib diisi.';
	if (!EVENT_TYPE_META[form.type]) return 'Jenis event tidak dikenal.';
	if (form.startsAt === '' || form.endsAt === '') {
		return 'Waktu mulai dan waktu selesai wajib diisi.';
	}
	const mulai = new Date(form.startsAt);
	const selesai = new Date(form.endsAt);
	if (Number.isNaN(mulai.getTime()) || Number.isNaN(selesai.getTime())) {
		return 'Waktu mulai atau waktu selesai tidak terbaca sebagai tanggal yang sah.';
	}
	if (selesai < mulai) return 'Waktu selesai tidak boleh mendahului waktu mulai.';
	if (form.location.trim() === '') {
		return 'Isi lokasi atau kanal daring agar peserta tahu harus ke mana.';
	}
	return '';
}

/**
 * Menyimpan perubahan detail sebuah event yang sudah ada.
 *
 * `status`, `proposedBy`, `reviewedBy`, dan seluruh jejak keputusan sengaja tidak
 * termasuk — lihat keputusan 2 di kepala berkas.
 *
 * @param {string} id Identitas event yang disunting.
 * @param {EventFormValue} form
 * @returns {Promise<ConfigOutcome>}
 */
export async function simpanPerubahanEvent(id, form) {
	const salah = periksaFormulirEvent(form);
	if (salah !== '') return { ok: false, reason: salah };

	try {
		await eventRepository.update(id, {
			title: form.title.trim(),
			type: form.type,
			description: form.description.trim(),
			location: form.location.trim(),
			isOnline: form.isOnline,
			startsAt: new Date(form.startsAt),
			endsAt: new Date(form.endsAt),
			quota: Number(form.quota) || 0
		});
		return { ok: true, reason: '' };
	} catch (penyebab) {
		return {
			ok: false,
			reason:
				penyebab instanceof Error
					? penyebab.message
					: 'Perubahan gagal disimpan ke penyimpanan peramban.'
		};
	}
}
