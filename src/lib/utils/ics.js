/**
 * UTILITAS iCalendar — satu kegiatan komunitas menjadi berkas `.ics` yang sah.
 *
 * Tanggung jawab: menerjemahkan `CommunityEvent` (atau hasil `toJSON()`-nya)
 * menjadi satu `VCALENDAR` berisi satu `VEVENT`, lalu menyerahkannya ke peramban
 * sebagai unduhan. Dipakai halaman `/kalender/[id]`.
 *
 * ENAM KEPUTUSAN YANG TIDAK TERBACA DARI KODE:
 *
 * 1. **Waktu ditulis sebagai jam dinding + `TZID=Asia/Jakarta`, BUKAN sebagai UTC
 *    (`…Z`).** Seluruh aplikasi memperlakukan komponen jam sebuah `Date` sebagai
 *    Waktu Indonesia Barat — `view-model.js` menempelkan suffiks "WIB" tetap, dan
 *    kalender bulan mengelompokkan tanggal memakai `getDate()` lokal. Bila berkas
 *    ini justru mengubah jam dinding itu menjadi instan UTC menurut zona laptop
 *    penyaji, kegiatan yang tertulis "19.00 WIB" di layar akan mendarat di jam
 *    yang berbeda di dalam aplikasi kalender penerima. Menyalin jam dinding apa
 *    adanya membuat berkas dan halaman selalu mengatakan hal yang sama.
 *
 * 2. **`VTIMEZONE` ikut ditulis, tidak hanya `TZID`.** RFC 5545 §3.2.19 menuntut
 *    setiap `TZID` yang dirujuk punya definisinya di dalam kalender yang sama.
 *    Aplikasi yang tidak mengenal basis data zona waktu IANA akan menolak — atau
 *    diam-diam menganggap waktunya mengambang — bila blok itu tidak ada.
 *    Asia/Jakarta tidak mengenal waktu musim panas sejak 1964, jadi satu komponen
 *    `STANDARD` +07:00 sudah menggambarkan zona ini secara utuh dan jujur.
 *
 * 3. **`DTSTAMP` tetap UTC.** Berbeda dengan `DTSTART`, properti ini WAJIB berupa
 *    waktu UTC menurut RFC 5545 §3.8.7.2 — ia menandai kapan berkasnya dibuat,
 *    bukan kapan acaranya berlangsung.
 *
 * 4. **Nol `ATTENDEE`, nol `ORGANIZER`, nol kuota.** Berkas `.ics` berpindah tangan
 *    lebih jauh daripada tautan halaman: ia menempel di aplikasi kalender penerima
 *    dan sering diteruskan sebagai lampiran surel. Daftar peserta dan identitas
 *    pengusul karena itu tidak pernah ikut, sama seperti pada halamannya
 *    (`docs/12` §3.5 WP-08 butir 3).
 *
 * 5. **Pelipatan baris dihitung per OKTET, bukan per karakter.** Batas 75 pada
 *    RFC 5545 §3.1 adalah batas oktet. Judul dan deskripsi berbahasa Indonesia
 *    memuat karakter non-ASCII (tanda kutip tipografis, "–", "é"), dan menghitung
 *    panjang dengan `String.length` menghasilkan baris yang lolos di sini tetapi
 *    ditolak parser yang ketat.
 *
 * 6. **Kegagalan dilempar, tidak dibungkam.** Berkas kalender yang cacat tidak
 *    memberi tanda apa pun kepada pengguna: aplikasi kalender hanya menolaknya
 *    tanpa penjelasan. Lebih baik pemanggil tahu lebih awal bahwa tanggalnya
 *    tidak sah.
 *
 * @see docs/12-BUILD-CONTRACT-V2.md — §2.13 kontrak `buatIcs` / `unduhIcs`
 * @see https://www.rfc-editor.org/rfc/rfc5545 — §3.1 pelipatan, §3.3.11 escaping TEXT
 */

import { browser } from '$app/environment';
import { EventStatus } from '$lib/domain/entities/CommunityEvent.js';

/** Pengenal produk pada header kalender; wajib ada menurut RFC 5545 §3.7.3. */
const PRODID = '-//Pertamina Foundation//Pfriends Kalender Komunitas//ID';

/** Zona waktu tunggal seluruh agenda Pfriends. */
const TZID = 'Asia/Jakarta';

/** Nama domain penyusun `UID`; tidak perlu dapat diakses, hanya perlu unik. */
const DOMAIN_UID = 'pfriends.pertaminafoundation.org';

/** Batas panjang satu baris konten menurut RFC 5545 §3.1, dalam oktet. */
const BATAS_OKTET = 75;

/** Akhir baris iCalendar; RFC 5545 tidak menerima LF tunggal. */
const CRLF = '\r\n';

/**
 * Karakter kontrol yang dilarang muncul di nilai TEXT. `\t` (U+0009) sengaja
 * dibiarkan lewat karena RFC 5545 mengizinkannya; sisanya dibuang.
 */
const KONTROL_TERLARANG = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;

/** Encoder tunggal — membuat satu instans per baris adalah pemborosan tanpa alasan. */
const ENCODER = new TextEncoder();

/**
 * Peta status kegiatan ke properti `STATUS` iCalendar (RFC 5545 §3.8.1.11).
 *
 * Hanya tiga status yang lolos gerbang publik yang benar-benar sampai ke sini;
 * `DIBATALKAN` tetap dipetakan supaya pembatalan yang dikirim ulang ke peserta
 * lama membawa penanda yang benar, bukan `CONFIRMED` yang menyesatkan.
 * @type {Readonly<Record<string, string>>}
 */
const STATUS_ICS = Object.freeze({
	[EventStatus.TERJADWAL]: 'CONFIRMED',
	[EventStatus.BERLANGSUNG]: 'CONFIRMED',
	[EventStatus.SELESAI]: 'CONFIRMED',
	[EventStatus.DIBATALKAN]: 'CANCELLED',
	[EventStatus.DRAFT]: 'TENTATIVE',
	[EventStatus.DIUSULKAN]: 'TENTATIVE',
	[EventStatus.DITOLAK]: 'CANCELLED'
});

/**
 * Menyalin teks bebas menjadi nilai TEXT iCalendar (RFC 5545 §3.3.11).
 *
 * Urutan penggantian tidak dapat ditukar: garis miring terbalik harus digandakan
 * LEBIH DULU, jika tidak garis miring yang baru saja disisipkan untuk koma akan
 * ikut digandakan pada langkah berikutnya. Titik dua sengaja TIDAK di-escape —
 * ia hanya bermakna khusus pada pemisah nama properti, bukan di dalam nilainya.
 *
 * @param {unknown} nilai
 * @returns {string}
 */
function escapeTeks(nilai) {
	return String(nilai ?? '')
		.replace(KONTROL_TERLARANG, '')
		.replace(/\\/g, '\\\\')
		.replace(/;/g, '\\;')
		.replace(/,/g, '\\,')
		.replace(/\r\n|\r|\n/g, '\\n');
}

/**
 * Melipat satu baris konten agar tidak melebihi 75 oktet, memakai CRLF + satu
 * spasi sebagai penanda sambungan.
 *
 * Baris sambungan membawa spasi pelipat yang ikut dihitung terhadap batas — itulah
 * sebabnya penghitung dimulai dari 1, bukan 0, setelah pemotongan pertama.
 * Pemotongan dilakukan pada batas titik kode (`for…of`), bukan unit UTF-16, supaya
 * pasangan pengganti emoji tidak terbelah menjadi dua oktet tak bermakna.
 *
 * @param {string} baris
 * @returns {string}
 */
function lipatBaris(baris) {
	if (ENCODER.encode(baris).length <= BATAS_OKTET) return baris;

	/** @type {string[]} */
	const potongan = [];
	let sekarang = '';
	let oktet = 0;

	for (const karakter of baris) {
		const lebar = ENCODER.encode(karakter).length;
		if (oktet + lebar > BATAS_OKTET) {
			potongan.push(sekarang);
			sekarang = '';
			oktet = 1; // spasi pelipat pada baris sambungan
		}
		sekarang += karakter;
		oktet += lebar;
	}
	potongan.push(sekarang);

	return potongan.join(`${CRLF} `);
}

/**
 * Dua digit dengan nol di depan.
 * @param {number} angka
 * @returns {string}
 */
function dua(angka) {
	return String(angka).padStart(2, '0');
}

/**
 * Cap waktu UTC berformat `YYYYMMDDTHHMMSSZ` — dipakai `DTSTAMP`.
 * @param {Date} tanggal
 * @returns {string}
 */
function stempelUtc(tanggal) {
	return (
		`${tanggal.getUTCFullYear()}${dua(tanggal.getUTCMonth() + 1)}${dua(tanggal.getUTCDate())}` +
		`T${dua(tanggal.getUTCHours())}${dua(tanggal.getUTCMinutes())}${dua(tanggal.getUTCSeconds())}Z`
	);
}

/**
 * Jam dinding berformat `YYYYMMDDTHHMMSS`, tanpa suffiks `Z`. Lihat keputusan 1.
 * @param {Date} tanggal
 * @returns {string}
 */
function jamDinding(tanggal) {
	return (
		`${tanggal.getFullYear()}${dua(tanggal.getMonth() + 1)}${dua(tanggal.getDate())}` +
		`T${dua(tanggal.getHours())}${dua(tanggal.getMinutes())}${dua(tanggal.getSeconds())}`
	);
}

/**
 * Menormalkan masukan tanggal menjadi `Date` yang sah.
 * @param {unknown} nilai
 * @param {string} namaField
 * @returns {Date}
 * @throws {TypeError} bila nilainya tidak dapat ditafsirkan sebagai tanggal.
 */
function keTanggalWajib(nilai, namaField) {
	const tanggal =
		nilai instanceof Date ? new Date(nilai.getTime()) : new Date(/** @type {any} */ (nilai));
	if (Number.isNaN(tanggal.getTime())) {
		throw new TypeError(`buatIcs(event): "${namaField}" bukan tanggal yang sah.`);
	}
	return tanggal;
}

/**
 * Definisi zona waktu Asia/Jakarta. Lihat keputusan 2.
 * @returns {string[]}
 */
function blokZonaWaktu() {
	return [
		'BEGIN:VTIMEZONE',
		`TZID:${TZID}`,
		`X-LIC-LOCATION:${TZID}`,
		'BEGIN:STANDARD',
		'DTSTART:19700101T000000',
		'TZOFFSETFROM:+0700',
		'TZOFFSETTO:+0700',
		'TZNAME:WIB',
		'END:STANDARD',
		'END:VTIMEZONE'
	];
}

/**
 * Menyusun isi `DESCRIPTION` dari bagian-bagian yang memang publik.
 *
 * Narasumber ikut karena ia informasi acara — pada data Pfriends ia ditulis
 * sebagai peran ("Tim komunikasi Pertamina Foundation"), bukan kontak pribadi.
 * Tidak ada nomor telepon, surel, maupun nama pendaftar yang boleh masuk ke sini.
 *
 * @param {any} event
 * @param {string} tautan Alamat halaman detail; kosong bila tidak dapat disusun.
 * @returns {string}
 */
function susunDeskripsi(event, tautan) {
	const bagian = [];
	const deskripsi = String(event.description ?? '').trim();
	const narasumber = String(event.speakerName ?? '').trim();

	if (deskripsi) bagian.push(deskripsi);
	if (narasumber) bagian.push(`Narasumber: ${narasumber}`);
	if (tautan) bagian.push(`Detail kegiatan: ${tautan}`);

	return bagian.join('\n\n');
}

/**
 * Alamat halaman detail kegiatan, bila asal situsnya dapat diketahui.
 * @param {any} event
 * @param {string} origin
 * @returns {string}
 */
function tautanDetail(event, origin) {
	const penciri = String(event.slug ?? event.id ?? '').trim();
	if (!origin || !penciri) return '';
	return `${origin.replace(/\/+$/, '')}/kalender/${penciri}`;
}

/**
 * @typedef {object} OpsiIcs
 * @property {Date} [sekarang] Waktu pembuatan berkas; dapat diisi agar hasilnya
 *   deterministik saat diuji.
 * @property {string} [origin] Asal situs untuk menyusun `URL` dan tautan di
 *   dalam deskripsi. Kosong di lingkungan tanpa peramban → kedua baris itu
 *   dilewati, bukan diisi alamat karangan.
 */

/**
 * Menyusun satu berkas iCalendar untuk sebuah kegiatan komunitas.
 *
 * Menerima instans `CommunityEvent` maupun objek datar hasil `toJSON()`: akses
 * properti biasa membaca getter kelas dan field objek dengan cara yang sama,
 * sehingga fungsi ini tidak perlu tahu bentuk mana yang sedang ia terima.
 *
 * Fungsi ini adalah PEMFORMAT, bukan gerbang visibilitas. Penyaring publik tunggal
 * tetap `CommunityEvent.isPubliclyVisible` di sisi pemanggil — menaruh gerbang
 * kedua di sini akan menghasilkan dua aturan yang harus dijaga sinkron.
 *
 * @param {any} event `CommunityEvent` atau hasil `toJSON()`-nya.
 * @param {OpsiIcs} [opsi]
 * @returns {string} Isi berkas `.ics`, sudah ber-CRLF dan terlipat.
 * @throws {TypeError} bila `event` kosong atau tanggalnya tidak sah.
 */
export function buatIcs(event, opsi = {}) {
	if (!event) throw new TypeError('buatIcs(event): `event` wajib diisi.');

	const { sekarang = new Date(), origin = browser ? window.location.origin : '' } = opsi;

	const mulai = keTanggalWajib(event.startsAt, 'startsAt');
	const selesai = keTanggalWajib(event.endsAt ?? event.startsAt, 'endsAt');
	const dibuat = keTanggalWajib(sekarang, 'sekarang');

	const penciri = String(event.slug ?? event.id ?? '').trim() || 'kegiatan';
	const tautan = tautanDetail(event, origin);
	const jenisLabel = String(event.typeMeta?.label ?? event.type ?? '').trim();
	const lokasi = String(event.location ?? '').trim();
	const daring = event.isOnline === true;

	/** @type {string[]} */
	const baris = [
		'BEGIN:VCALENDAR',
		'VERSION:2.0',
		`PRODID:${PRODID}`,
		'CALSCALE:GREGORIAN',
		'METHOD:PUBLISH',
		...blokZonaWaktu(),
		'BEGIN:VEVENT',
		`UID:${escapeTeks(penciri)}@${DOMAIN_UID}`,
		`DTSTAMP:${stempelUtc(dibuat)}`,
		`DTSTART;TZID=${TZID}:${jamDinding(mulai)}`,
		`DTEND;TZID=${TZID}:${jamDinding(selesai)}`,
		`SUMMARY:${escapeTeks(event.title)}`
	];

	const deskripsi = susunDeskripsi(event, tautan);
	if (deskripsi) baris.push(`DESCRIPTION:${escapeTeks(deskripsi)}`);

	if (lokasi) {
		// Penanda daring/luring menempel di LOKASI karena di situlah pengguna
		// mencarinya saat notifikasi kalender berbunyi lima belas menit sebelum acara.
		baris.push(`LOCATION:${escapeTeks(daring ? `${lokasi} (daring)` : lokasi)}`);
	}

	if (jenisLabel) baris.push(`CATEGORIES:${escapeTeks(jenisLabel)}`);
	if (tautan) baris.push(`URL:${tautan}`);

	baris.push(`STATUS:${STATUS_ICS[String(event.status ?? '')] ?? 'CONFIRMED'}`);
	// Agenda komunitas terbuka; menandainya OPAQUE akan membuat kalender penerima
	// menganggap pemiliknya sibuk untuk acara yang boleh saja ia lewatkan.
	baris.push('TRANSP:TRANSPARENT');
	baris.push('END:VEVENT', 'END:VCALENDAR');

	return `${baris.map(lipatBaris).join(CRLF)}${CRLF}`;
}

/**
 * Nama berkas unduhan yang aman untuk sistem berkas mana pun.
 * @param {any} event
 * @returns {string}
 */
function namaBerkas(event) {
	const penciri = String(event?.slug ?? event?.id ?? 'kegiatan')
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
	return `pfriends-${penciri || 'kegiatan'}.ics`;
}

/**
 * Mengunduh berkas `.ics` sebuah kegiatan lewat peramban.
 *
 * Tidak melakukan apa pun di luar peramban: fungsi ini menyentuh `document` dan
 * `URL.createObjectURL`, dan memanggilnya saat prerender akan menjatuhkan build
 * demi tombol yang saat itu belum dapat diklik siapa pun.
 *
 * `revokeObjectURL` dipanggil pada tick berikutnya, bukan segera setelah `click()`:
 * beberapa peramban membaca blob-nya secara asinkron dan mencabut URL terlalu
 * cepat menghasilkan unduhan kosong tanpa pesan galat apa pun.
 *
 * @param {any} event `CommunityEvent` atau hasil `toJSON()`-nya.
 * @param {OpsiIcs} [opsi]
 * @returns {void}
 * @throws {TypeError} bila `event` kosong atau tanggalnya tidak sah.
 */
export function unduhIcs(event, opsi = {}) {
	if (!browser) return;

	const isi = buatIcs(event, opsi);
	const blob = new Blob([isi], { type: 'text/calendar;charset=utf-8' });
	const alamat = URL.createObjectURL(blob);

	const tautan = document.createElement('a');
	tautan.href = alamat;
	tautan.download = namaBerkas(event);
	tautan.rel = 'noopener';
	tautan.style.display = 'none';

	document.body.appendChild(tautan);
	tautan.click();
	document.body.removeChild(tautan);

	setTimeout(() => URL.revokeObjectURL(alamat), 0);
}
