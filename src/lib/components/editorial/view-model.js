/**
 * PEMETA LINTAS PAKET: entity domain menjadi view-model siap render.
 *
 * Tanggung jawab: satu-satunya tempat `CommunityEvent` dan `Story` diterjemahkan
 * menjadi objek datar yang dikonsumsi `EventListPanel`, `MonthCalendar`,
 * `StorySpread`, dan `StoryCard`. Empat paket paralel (WP-04, WP-05, WP-06, WP-08)
 * membutuhkan bentuk yang sama; tanpa berkas ini masing-masing akan menulis
 * pemetanya sendiri dan keempatnya akan berbeda: pelanggaran KP-3 oleh kontrak.
 *
 * EMPAT KEPUTUSAN YANG TIDAK TERBACA DARI KODE:
 *
 * 1. **Nol field poin/tier/peringkat/lencana pada kedua VM.** Keputusan Pemilik
 *    Produk #2 ditegakkan pada BENTUK DATA, bukan pada disiplin pemanggil. Sebuah
 *    komponen publik tidak dapat membocorkan angka yang tidak pernah sampai
 *    kepadanya. Menambahkan satu saja field skor di sini membatalkan jaminan itu
 *    untuk kelima paket sekaligus.
 *
 * 2. **Masukan diterima sebagai entity MAUPUN objek datar.** Store menyimpan hasil
 *    `toJSON()` di beberapa jalur dan instance entity di jalur lain. Akses properti
 *    biasa bekerja untuk keduanya (getter kelas dan field objek dibaca identik),
 *    sehingga pemeta ini tidak perlu tahu mana yang sedang ia terima.
 *
 * 3. **Foto kegiatan dipilih per JENIS kegiatan, bukan per kegiatan.** Manifes foto
 *    tidak memuat satu berkas per agenda, dan memakai satu foto yang sama untuk
 *    semua kegiatan adalah persis cacat D-08 yang sedang diperbaiki. Tiga jenis
 *    kegiatan dipetakan ke tiga foto berbeda; sifatnya ilustrasi kategori, bukan
 *    dokumentasi acara: karena itu kapsinya tetap generik dan `isStock` tetap
 *    `true`. `EventListPanel` pun hanya menampilkan thumbnail pada SATU baris per
 *    halaman (`thumbnailAt`), sehingga tiga foto ini tidak pernah berjajar.
 *
 * 4. **`foto` boleh `null` dan itu keadaan yang sah.** Pemanggil WAJIB menyediakan
 *    cabang tipografis (`docs/12` §3.3(d) butir 4): bukan `<img>` rusak, bukan
 *    gradien, bukan satu foto default bersama.
 *
 * @see docs/12-BUILD-CONTRACT-V2.md: §2.13 typedef FINAL EventCardVM & StoryVM
 * @see docs/11-VISUAL-DIRECTION.md: §6 E4 baris agenda, §6 E5 hierarki cerita
 */

import { EVENT_TYPE_META, EventType } from '$lib/domain/entities/CommunityEvent.js';
import { chapter } from '$lib/domain/constants/community.js';
import { gayaPilar } from '../_visual.js';
import { foto, fotoCerita } from '$lib/data/photos.js';
import { formatTanggal } from '$lib/utils/format.js';
import { keTanggal } from '$lib/utils/date.js';

/**
 * @typedef {object} EventCardVM
 * @property {string} id
 * @property {string} slug
 * @property {string} title
 * @property {Date}   startsAt
 * @property {Date|null} endsAt
 * @property {string} typeLabel     Label dari `EVENT_TYPE_META`.
 * @property {string} typeCode      `EventType`: dipakai warna penanda kalender.
 * @property {string} chapterLabel  Nama chapter penyelenggara, atau 'Semua chapter'.
 * @property {string} modeLabel     'Daring' | 'Luring'.
 * @property {string} timeLabel     Sudah terformat WIB.
 * @property {string} href          `/kalender/<slug>`.
 * @property {import('$lib/data/photos.js').Photo|null} foto
 */

/**
 * @typedef {object} StoryVM
 * @property {string} id
 * @property {string} slug
 * @property {string} title
 * @property {string} excerpt
 * @property {string} pillarCode    Kode pilar ESG: dipakai fallback tipografis.
 * @property {string} pillarLabel
 * @property {string} authorName
 * @property {Date|null} publishedAt
 * @property {number} readMinutes
 * @property {string} href          `/cerita/<slug>`.
 * @property {import('$lib/data/photos.js').Photo|null} foto  `null` = fallback TIPOGRAFIS.
 */

/**
 * Foto ilustrasi per jenis kegiatan. Lihat keputusan 3 pada blok pembuka.
 * @type {Readonly<Record<string, string>>}
 */
const FOTO_PER_JENIS = Object.freeze({
	[EventType.UPSKILLING]: 'event-workshop',
	[EventType.PERTEMUAN]: 'chapter-pertemuan',
	[EventType.SHARING]: 'tentang-sosialisasi'
});

/** Dipakai saat kegiatan tidak terikat satu chapter pun. */
const LINTAS_CHAPTER = 'Semua chapter';

/**
 * Label chapter yang aman untuk id kosong maupun id yang tidak dikenal.
 *
 * `chapter()` sengaja melempar `RangeError` untuk id asing: perilaku yang benar
 * bagi domain, tetapi mematikan bagi satu baris daftar. Di sini kegagalan itu
 * diturunkan menjadi label netral.
 *
 * @param {string} chapterId
 * @returns {string}
 */
function labelChapter(chapterId) {
	if (!chapterId) return LINTAS_CHAPTER;
	try {
		return chapter(chapterId).label;
	} catch {
		return LINTAS_CHAPTER;
	}
}

/**
 * Rentang waktu satu kegiatan dalam Bahasa Indonesia, sudah bersuffiks WIB.
 *
 * Seluruh tanggal seed disimpan pada zona Asia/Jakarta, dan mockup ini tidak
 * pernah melayani zona lain: karena itu suffiks ditulis tetap, bukan dihitung
 * dari offset peramban yang akan berubah di laptop penyaji.
 *
 * @param {Date} mulai
 * @param {Date|null} selesai
 * @returns {string}
 */
function labelWaktu(mulai, selesai) {
	const awal = formatTanggal(mulai, 'waktu');
	if (!selesai) return `${awal} WIB`;
	const hariSamaPersis =
		mulai.getFullYear() === selesai.getFullYear() &&
		mulai.getMonth() === selesai.getMonth() &&
		mulai.getDate() === selesai.getDate();
	if (!hariSamaPersis) return `${awal} WIB – ${formatTanggal(selesai, 'waktu')} WIB`;
	return `${awal}–${formatTanggal(selesai, 'jam')} WIB`;
}

/**
 * Memetakan satu kegiatan komunitas menjadi baris agenda siap render.
 *
 * @param {any} event `CommunityEvent` atau hasil `toJSON()`-nya.
 * @returns {EventCardVM}
 * @throws {TypeError} bila `event` kosong atau `startsAt` bukan tanggal yang sah :
 *                     baris agenda tanpa tanggal tidak dapat ditempatkan di
 *                     kalender maupun diurutkan, jadi kegagalannya harus terlihat
 *                     di sini, bukan berubah menjadi sel kosong yang membingungkan.
 */
export function eventCardVM(event) {
	if (!event) throw new TypeError('eventCardVM(event): `event` wajib diisi.');

	const mulai = keTanggal(event.startsAt);
	if (!mulai) {
		throw new TypeError(
			`eventCardVM(event): "startsAt" tidak sah untuk kegiatan "${event.id ?? '(tanpa id)'}".`
		);
	}
	const selesai = keTanggal(event.endsAt);

	const typeCode = String(event.type ?? '');
	const meta = EVENT_TYPE_META[typeCode] ?? null;
	const slug = String(event.slug ?? '');

	return {
		id: String(event.id ?? ''),
		slug,
		title: String(event.title ?? ''),
		startsAt: mulai,
		endsAt: selesai,
		typeLabel: meta?.label ?? 'Kegiatan komunitas',
		typeCode,
		chapterLabel: labelChapter(String(event.chapterId ?? '')),
		// Model data hanya mengenal daring/luring; tidak ada sumbu hibrida pada entity.
		modeLabel: event.isOnline ? 'Daring' : 'Luring',
		timeLabel: labelWaktu(mulai, selesai),
		href: slug ? `/kalender/${slug}` : '/kalender',
		foto: foto(FOTO_PER_JENIS[typeCode] ?? '')
	};
}

/**
 * Memetakan satu cerita komunitas menjadi kartu siap render.
 *
 * @param {any} story `Story` atau hasil `toJSON()`-nya.
 * @returns {StoryVM}
 * @throws {TypeError} bila `story` kosong.
 */
export function storyVM(story) {
	if (!story) throw new TypeError('storyVM(story): `story` wajib diisi.');

	const slug = String(story.slug ?? '');
	// Pilar pertama adalah pilar utama cerita: seed menuliskannya di urutan pertama,
	// dan kartu hanya punya ruang untuk satu kicker.
	const pilarKode = String(story.esgTags?.[0]?.pillar ?? '');
	const pilar = gayaPilar(pilarKode);

	return {
		id: String(story.id ?? ''),
		slug,
		title: String(story.title ?? ''),
		excerpt: String(story.summary ?? ''),
		pillarCode: pilarKode,
		pillarLabel: pilar?.label ?? '',
		authorName: String(story.authorName ?? ''),
		publishedAt: keTanggal(story.publishedAt),
		readMinutes: Number(story.readMinutes ?? 0),
		href: slug ? `/cerita/${slug}` : '/cerita',
		foto: slug ? fotoCerita(slug) : null
	};
}
