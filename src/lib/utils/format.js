/**
 * UTILITAS FORMAT — mengubah nilai mentah menjadi teks Bahasa Indonesia.
 *
 * Satu-satunya tempat locale `id-ID` boleh disebut. Alasannya bukan kerapian
 * semata: angka `1.250` (Indonesia) dan `1,250` (Inggris) berarti hal berbeda,
 * dan campur aduk pemisah ribuan di satu layar membuat laporan tidak dapat
 * dipercaya. Semua angka yang dilihat pengguna wajib melewati file ini.
 *
 * Perhitungan kalender tinggal di `date.js`; file ini hanya menampilkan.
 *
 * @see docs/08-DESIGN-SYSTEM.md — §3.3 Aturan angka
 * @see docs/09-BUILD-CONTRACT.md — §4 WP-5, §7 butir 5
 */

import { keTanggal, selisihHari, NAMA_BULAN, NAMA_BULAN_PENDEK, NAMA_HARI } from './date.js';

/** Locale tunggal seluruh aplikasi. */
const LOCALE = 'id-ID';

/** Ditampilkan sebagai pengganti nilai yang tidak sah — lebih jujur daripada "0" palsu. */
const TANDA_KOSONG = '–';

const AMBANG_RIBUAN = 1_000;
const DETIK_PER_MENIT = 60;
const MENIT_PER_JAM = 60;
const HARI_PER_MINGGU = 7;
const HARI_PER_BULAN = 30;
const HARI_PER_TAHUN = 365;

/**
 * Angka dengan pemisah ribuan Indonesia: `1250` → `1.250`.
 *
 * @param {number|string|null|undefined} nilai
 * @param {{ desimal?: number, kosong?: string }} [opsi]
 * @param {number} [opsi.desimal] Jumlah angka di belakang koma. Default 0.
 * @param {string} [opsi.kosong] Teks pengganti bila nilai tidak sah.
 * @returns {string}
 */
export function formatAngka(nilai, opsi = {}) {
	const { desimal = 0, kosong = TANDA_KOSONG } = opsi;
	const angka = typeof nilai === 'string' ? Number(nilai) : nilai;
	if (typeof angka !== 'number' || !Number.isFinite(angka)) return kosong;
	return new Intl.NumberFormat(LOCALE, {
		minimumFractionDigits: desimal,
		maximumFractionDigits: desimal
	}).format(angka);
}

/**
 * Angka ringkas untuk ruang sempit: `12500` → `12,5 rb`, `2400000` → `2,4 jt`.
 * Dipakai pada kartu statistik dan label chart, bukan pada tabel — tabel selalu
 * menampilkan angka penuh agar dapat direkonsiliasi.
 *
 * @param {number|null|undefined} nilai
 * @returns {string}
 */
export function formatRingkas(nilai) {
	if (typeof nilai !== 'number' || !Number.isFinite(nilai)) return TANDA_KOSONG;
	const absolut = Math.abs(nilai);
	if (absolut < AMBANG_RIBUAN) return formatAngka(nilai);
	const satuan = [
		{ batas: 1_000_000_000, akhiran: ' m' },
		{ batas: 1_000_000, akhiran: ' jt' },
		{ batas: AMBANG_RIBUAN, akhiran: ' rb' }
	];
	for (const { batas, akhiran } of satuan) {
		if (absolut >= batas) {
			const hasil = nilai / batas;
			const desimal = Math.abs(hasil) >= 100 ? 0 : 1;
			return formatAngka(hasil, { desimal }) + akhiran;
		}
	}
	return formatAngka(nilai);
}

/**
 * Persentase: `62.4` → `62,4%`.
 *
 * @param {number|null|undefined} nilai Nilai sudah dalam satuan persen (bukan pecahan).
 * @param {number} [desimal]
 * @returns {string}
 */
export function formatPersen(nilai, desimal = 0) {
	if (typeof nilai !== 'number' || !Number.isFinite(nilai)) return TANDA_KOSONG;
	return `${formatAngka(nilai, { desimal })}%`;
}

/**
 * Angka bertanda eksplisit — dipakai untuk delta poin dan perubahan peringkat,
 * di mana arah perubahan sama pentingnya dengan besarannya.
 *
 * @param {number|null|undefined} nilai
 * @returns {string}
 */
export function formatBertanda(nilai) {
	if (typeof nilai !== 'number' || !Number.isFinite(nilai)) return TANDA_KOSONG;
	const tanda = nilai > 0 ? '+' : nilai < 0 ? '−' : '';
	return `${tanda}${formatAngka(Math.abs(nilai))}`;
}

/**
 * Rupiah tanpa sen: `1500000` → `Rp1.500.000`.
 * @param {number|null|undefined} nilai
 * @returns {string}
 */
export function formatRupiah(nilai) {
	if (typeof nilai !== 'number' || !Number.isFinite(nilai)) return TANDA_KOSONG;
	return new Intl.NumberFormat(LOCALE, {
		style: 'currency',
		currency: 'IDR',
		maximumFractionDigits: 0
	}).format(nilai);
}

/**
 * Tanggal Bahasa Indonesia dalam beberapa gaya.
 *
 * | gaya      | contoh                    |
 * |-----------|---------------------------|
 * | `panjang` | 20 Juli 2026              |
 * | `pendek`  | 20 Jul 2026               |
 * | `ringkas` | 20 Jul                    |
 * | `penuh`   | Senin, 20 Juli 2026       |
 * | `waktu`   | 20 Jul 2026, 14.30        |
 * | `jam`     | 14.30                     |
 *
 * @param {Date|string|number|null|undefined} input
 * @param {'panjang'|'pendek'|'ringkas'|'penuh'|'waktu'|'jam'} [gaya]
 * @returns {string}
 */
export function formatTanggal(input, gaya = 'panjang') {
	const tanggal = keTanggal(input);
	if (!tanggal) return TANDA_KOSONG;

	const hari = tanggal.getDate();
	const bulan = tanggal.getMonth();
	const tahun = tanggal.getFullYear();
	const jam = `${String(tanggal.getHours()).padStart(2, '0')}.${String(tanggal.getMinutes()).padStart(2, '0')}`;

	switch (gaya) {
		case 'pendek':
			return `${hari} ${NAMA_BULAN_PENDEK[bulan]} ${tahun}`;
		case 'ringkas':
			return `${hari} ${NAMA_BULAN_PENDEK[bulan]}`;
		case 'penuh':
			return `${NAMA_HARI[tanggal.getDay()]}, ${hari} ${NAMA_BULAN[bulan]} ${tahun}`;
		case 'waktu':
			return `${hari} ${NAMA_BULAN_PENDEK[bulan]} ${tahun}, ${jam}`;
		case 'jam':
			return jam;
		default:
			return `${hari} ${NAMA_BULAN[bulan]} ${tahun}`;
	}
}

/**
 * Rentang tanggal yang meringkas bagian yang sama: dua tanggal pada bulan yang
 * sama ditulis `12–14 Maret 2026`, bukan diulang dua kali penuh.
 *
 * @param {Date|string|number} mulai
 * @param {Date|string|number|null} [selesai]
 * @returns {string}
 */
export function formatRentangTanggal(mulai, selesai = null) {
	const a = keTanggal(mulai);
	const b = keTanggal(selesai);
	if (!a) return TANDA_KOSONG;
	if (!b) return formatTanggal(a, 'panjang');

	const tahunSama = a.getFullYear() === b.getFullYear();
	const bulanSama = tahunSama && a.getMonth() === b.getMonth();

	if (bulanSama && a.getDate() === b.getDate()) return formatTanggal(a, 'panjang');
	if (bulanSama) return `${a.getDate()}–${formatTanggal(b, 'panjang')}`;
	if (tahunSama) return `${formatTanggal(a, 'ringkas')} – ${formatTanggal(b, 'panjang')}`;
	return `${formatTanggal(a, 'panjang')} – ${formatTanggal(b, 'panjang')}`;
}

/**
 * Waktu relatif Bahasa Indonesia: "baru saja", "3 jam lalu", "dalam 2 hari".
 *
 * Tanggal yang lebih tua dari satu tahun dikembalikan sebagai tanggal absolut —
 * "428 hari lalu" tidak memberi informasi apa pun kepada pembaca.
 *
 * @param {Date|string|number|null|undefined} input
 * @param {Date} [acuan] Titik acuan "sekarang"; dapat diisi agar hasil deterministik saat diuji.
 * @returns {string}
 */
export function formatRelatif(input, acuan = new Date()) {
	const tanggal = keTanggal(input);
	if (!tanggal) return TANDA_KOSONG;

	const selisihDetik = Math.round((acuan.getTime() - tanggal.getTime()) / 1000);
	const lampau = selisihDetik >= 0;
	const detik = Math.abs(selisihDetik);
	const menit = Math.floor(detik / DETIK_PER_MENIT);
	const jam = Math.floor(menit / MENIT_PER_JAM);
	const hari = Math.abs(selisihHari(tanggal, acuan));

	/** @param {string} frasa */
	const arah = (frasa) => (lampau ? `${frasa} lalu` : `dalam ${frasa}`);

	if (menit < 1) return lampau ? 'baru saja' : 'sebentar lagi';
	if (jam < 1) return arah(`${menit} menit`);
	if (hari < 1) return arah(`${jam} jam`);
	if (hari === 1) return lampau ? 'kemarin' : 'besok';
	if (hari < HARI_PER_MINGGU) return arah(`${hari} hari`);
	if (hari < HARI_PER_BULAN) return arah(`${Math.floor(hari / HARI_PER_MINGGU)} minggu`);
	if (hari < HARI_PER_TAHUN) return arah(`${Math.floor(hari / HARI_PER_BULAN)} bulan`);
	return formatTanggal(tanggal, 'pendek');
}

/**
 * Bentuk kata benda yang tepat untuk sebuah jumlah.
 *
 * Bahasa Indonesia tidak mengenal infleksi jamak, sehingga secara baku fungsi ini
 * mengembalikan kata yang sama untuk berapa pun jumlahnya — `pluralId(5,'cerita')`
 * tetap `'cerita'`, bukan `'cerita-cerita'` yang justru salah bila didahului
 * numeralia. Argumen ketiga disediakan untuk kata yang memang punya bentuk jamak
 * lazim (`'orang'` → `'orang-orang'` saat tanpa numeralia).
 *
 * @param {number} jumlah
 * @param {string} tunggal Bentuk dasar kata.
 * @param {string} [jamak] Bentuk jamak eksplisit bila diperlukan.
 * @returns {string} Kata bendanya saja, tanpa angka.
 */
export function pluralId(jumlah, tunggal, jamak = '') {
	if (!jamak) return tunggal;
	return Math.abs(jumlah) === 1 ? tunggal : jamak;
}

/**
 * Frasa hitung lengkap: `frasaHitung(3, 'cerita')` → `'3 cerita'`.
 * Pembungkus tipis di atas `formatAngka` + `pluralId` supaya pemanggil tidak
 * perlu menggabungkan keduanya secara manual di setiap template.
 *
 * @param {number} jumlah
 * @param {string} tunggal
 * @param {string} [jamak]
 * @returns {string}
 */
export function frasaHitung(jumlah, tunggal, jamak = '') {
	return `${formatAngka(jumlah)} ${pluralId(jumlah, tunggal, jamak)}`;
}

/**
 * Inisial nama untuk avatar tanpa foto — maksimal dua huruf, mengambil kata
 * pertama dan terakhir sehingga "Siti Nurhaliza Putri" menjadi "SP".
 *
 * @param {string} nama
 * @param {number} [maks]
 * @returns {string}
 */
export function inisial(nama, maks = 2) {
	const kata = String(nama ?? '')
		.trim()
		.split(/\s+/)
		.filter(Boolean);
	if (kata.length === 0) return '';
	const dipilih = kata.length === 1 ? [kata[0]] : [kata[0], kata[kata.length - 1]];
	return dipilih
		.slice(0, maks)
		.map((k) => k[0].toUpperCase())
		.join('');
}

/**
 * Memotong teks pada batas kata dan menambahkan elipsis. Dipakai untuk kutipan
 * yang tidak dapat diandalkan pada `line-clamp` (mis. atribut `title`).
 *
 * @param {string} teks
 * @param {number} maks
 * @returns {string}
 */
export function potongTeks(teks, maks = 120) {
	const bersih = String(teks ?? '').trim();
	if (bersih.length <= maks) return bersih;
	const potongan = bersih.slice(0, maks);
	const spasiTerakhir = potongan.lastIndexOf(' ');
	return `${(spasiTerakhir > 0 ? potongan.slice(0, spasiTerakhir) : potongan).trimEnd()}…`;
}

/**
 * Estimasi lama baca dalam menit, dibulatkan ke atas dengan minimum satu menit.
 * Kecepatan baca 200 kata/menit adalah angka rujukan umum untuk teks non-teknis
 * berbahasa Indonesia.
 *
 * @param {string} teks
 * @returns {number}
 */
export function menitBaca(teks) {
	const KATA_PER_MENIT = 200;
	const jumlahKata = String(teks ?? '')
		.trim()
		.split(/\s+/)
		.filter(Boolean).length;
	return Math.max(1, Math.ceil(jumlahKata / KATA_PER_MENIT));
}

/**
 * Persentase progres yang dijamin berada di rentang 0–100, aman untuk lebar bar
 * dan `aria-valuenow`. Pembagi nol menghasilkan 0, bukan `NaN`.
 *
 * @param {number} nilai
 * @param {number} maks
 * @returns {number}
 */
export function persenProgres(nilai, maks) {
	if (typeof nilai !== 'number' || typeof maks !== 'number' || !Number.isFinite(nilai)) return 0;
	if (!Number.isFinite(maks) || maks <= 0) return 0;
	return Math.min(100, Math.max(0, (nilai / maks) * 100));
}
