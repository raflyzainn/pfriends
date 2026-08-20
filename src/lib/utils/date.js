/**
 * UTILITAS TANGGAL: operasi kalender murni, tanpa format tampilan.
 *
 * Pembagian tanggung jawab dengan `format.js`: file ini MENGHITUNG (selisih hari,
 * awal bulan, rentang bulan), `format.js` MENAMPILKAN (string berbahasa Indonesia).
 * Memisahkan keduanya membuat perhitungan dapat diuji tanpa bergantung pada locale.
 *
 * Seluruh fungsi bersifat murni dan tidak pernah mengubah argumennya: `Date` di
 * JavaScript mutable, dan mutasi diam-diam pada tanggal adalah sumber bug yang
 * sangat sulit dilacak. Setiap fungsi mengembalikan instans `Date` baru.
 *
 * @see docs/09-BUILD-CONTRACT.md: §4 WP-5
 */

/** Jumlah milidetik dalam satu hari kalender. */
export const MS_PER_HARI = 86_400_000;

/** Nama bulan Bahasa Indonesia, indeks 0 = Januari. */
export const NAMA_BULAN = Object.freeze([
	'Januari',
	'Februari',
	'Maret',
	'April',
	'Mei',
	'Juni',
	'Juli',
	'Agustus',
	'September',
	'Oktober',
	'November',
	'Desember'
]);

/** Singkatan bulan tiga huruf: dipakai sebagai label sumbu chart dan blok tanggal kartu. */
export const NAMA_BULAN_PENDEK = Object.freeze([
	'Jan',
	'Feb',
	'Mar',
	'Apr',
	'Mei',
	'Jun',
	'Jul',
	'Ags',
	'Sep',
	'Okt',
	'Nov',
	'Des'
]);

/** Nama hari Bahasa Indonesia, indeks 0 = Minggu (mengikuti `Date.getDay`). */
export const NAMA_HARI = Object.freeze([
	'Minggu',
	'Senin',
	'Selasa',
	'Rabu',
	'Kamis',
	'Jumat',
	'Sabtu'
]);

/**
 * Menormalkan masukan apa pun menjadi `Date`. Mengembalikan `null` bila nilainya
 * tidak dapat ditafsirkan: pemanggil di lapisan tampilan lebih suka menampilkan
 * tanda hubung daripada string "Invalid Date".
 *
 * @param {Date|string|number|null|undefined} input
 * @returns {Date|null}
 */
export function keTanggal(input) {
	if (input === null || input === undefined || input === '') return null;
	const tanggal = input instanceof Date ? new Date(input.getTime()) : new Date(input);
	return Number.isNaN(tanggal.getTime()) ? null : tanggal;
}

/**
 * Tengah malam pada hari yang sama: dipakai untuk membandingkan hari tanpa
 * terganggu komponen jam.
 * @param {Date|string|number} input
 * @returns {Date|null}
 */
export function awalHari(input) {
	const tanggal = keTanggal(input);
	if (!tanggal) return null;
	tanggal.setHours(0, 0, 0, 0);
	return tanggal;
}

/**
 * Tanggal 1 pada bulan yang sama, pukul 00:00.
 * @param {Date|string|number} input
 * @returns {Date|null}
 */
export function awalBulan(input) {
	const tanggal = keTanggal(input);
	if (!tanggal) return null;
	tanggal.setDate(1);
	tanggal.setHours(0, 0, 0, 0);
	return tanggal;
}

/**
 * Hari terakhir bulan yang sama, pukul 23:59:59.999.
 * @param {Date|string|number} input
 * @returns {Date|null}
 */
export function akhirBulan(input) {
	const tanggal = keTanggal(input);
	if (!tanggal) return null;
	tanggal.setMonth(tanggal.getMonth() + 1, 0);
	tanggal.setHours(23, 59, 59, 999);
	return tanggal;
}

/**
 * Menggeser tanggal sejumlah hari. Nilai negatif menggeser ke masa lalu.
 * @param {Date|string|number} input
 * @param {number} jumlah
 * @returns {Date|null}
 */
export function tambahHari(input, jumlah) {
	const tanggal = keTanggal(input);
	if (!tanggal) return null;
	tanggal.setDate(tanggal.getDate() + jumlah);
	return tanggal;
}

/**
 * Menggeser tanggal sejumlah bulan, menjaga tanggal tetap valid (31 Jan + 1 bulan
 * menjadi 28/29 Feb, bukan melompat ke Maret).
 * @param {Date|string|number} input
 * @param {number} jumlah
 * @returns {Date|null}
 */
export function tambahBulan(input, jumlah) {
	const tanggal = keTanggal(input);
	if (!tanggal) return null;
	const hari = tanggal.getDate();
	tanggal.setDate(1);
	tanggal.setMonth(tanggal.getMonth() + jumlah);
	const hariMaks = new Date(tanggal.getFullYear(), tanggal.getMonth() + 1, 0).getDate();
	tanggal.setDate(Math.min(hari, hariMaks));
	return tanggal;
}

/**
 * Selisih hari kalender antara dua tanggal (b − a), diukur dari tengah malam ke
 * tengah malam. Dihitung per hari kalender dan bukan per 24 jam, supaya "kemarin
 * pukul 23.00" tetap terbaca 1 hari meski jaraknya baru beberapa jam.
 *
 * @param {Date|string|number} a
 * @param {Date|string|number} b
 * @returns {number} Positif bila `b` lebih baru dari `a`.
 */
export function selisihHari(a, b) {
	const mulai = awalHari(a);
	const selesai = awalHari(b);
	if (!mulai || !selesai) return 0;
	return Math.round((selesai.getTime() - mulai.getTime()) / MS_PER_HARI);
}

/**
 * Selisih bulan kalender (b − a).
 * @param {Date|string|number} a
 * @param {Date|string|number} b
 * @returns {number}
 */
export function selisihBulan(a, b) {
	const mulai = keTanggal(a);
	const selesai = keTanggal(b);
	if (!mulai || !selesai) return 0;
	return (
		(selesai.getFullYear() - mulai.getFullYear()) * 12 + (selesai.getMonth() - mulai.getMonth())
	);
}

/**
 * Apakah dua tanggal jatuh pada hari kalender yang sama.
 * @param {Date|string|number} a
 * @param {Date|string|number} b
 * @returns {boolean}
 */
export function hariSama(a, b) {
	const x = awalHari(a);
	const y = awalHari(b);
	return Boolean(x && y && x.getTime() === y.getTime());
}

/**
 * Apakah tanggal berada di dalam rentang inklusif [mulai, selesai].
 * Batas yang bernilai `null` diperlakukan sebagai tak terbatas.
 *
 * @param {Date|string|number} input
 * @param {Date|string|number|null} mulai
 * @param {Date|string|number|null} selesai
 * @returns {boolean}
 */
export function dalamRentang(input, mulai, selesai) {
	const tanggal = keTanggal(input);
	if (!tanggal) return false;
	const batasBawah = mulai === null ? null : keTanggal(mulai);
	const batasAtas = selesai === null ? null : keTanggal(selesai);
	if (batasBawah && tanggal.getTime() < batasBawah.getTime()) return false;
	if (batasAtas && tanggal.getTime() > batasAtas.getTime()) return false;
	return true;
}

/**
 * Apakah tanggal sudah lewat dibanding acuan.
 * @param {Date|string|number} input
 * @param {Date} [acuan]
 * @returns {boolean}
 */
export function sudahLewat(input, acuan = new Date()) {
	const tanggal = keTanggal(input);
	return Boolean(tanggal && tanggal.getTime() < acuan.getTime());
}

/**
 * Kunci bulan berformat `YYYY-MM`: dipakai untuk mengelompokkan aktivitas per
 * bulan sebelum digambar sebagai deret chart.
 * @param {Date|string|number} input
 * @returns {string} String kosong bila tanggal tidak sah.
 */
export function kunciBulan(input) {
	const tanggal = keTanggal(input);
	if (!tanggal) return '';
	return `${tanggal.getFullYear()}-${String(tanggal.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Deret bulan berurutan yang berakhir pada bulan `acuan`, berguna untuk menyiapkan
 * sumbu X chart tren tanpa lubang bulan kosong.
 *
 * @param {number} jumlah Banyaknya bulan yang dikembalikan, termasuk bulan acuan.
 * @param {Date|string|number} [acuan]
 * @returns {{ kunci: string, label: string, labelPanjang: string, tahun: number, bulan: number }[]}
 */
export function deretBulan(jumlah, acuan = new Date()) {
	const akhir = awalBulan(acuan);
	if (!akhir || jumlah <= 0) return [];
	const hasil = [];
	for (let i = jumlah - 1; i >= 0; i--) {
		const bulan = tambahBulan(akhir, -i);
		if (!bulan) continue;
		hasil.push({
			kunci: kunciBulan(bulan),
			label: NAMA_BULAN_PENDEK[bulan.getMonth()],
			labelPanjang: NAMA_BULAN[bulan.getMonth()],
			tahun: bulan.getFullYear(),
			bulan: bulan.getMonth()
		});
	}
	return hasil;
}

/**
 * Memecah tanggal menjadi bagian-bagian siap tampil untuk blok tanggal kartu
 * kegiatan (angka besar + bulan singkat + hari).
 *
 * @param {Date|string|number} input
 * @returns {{ hari: string, tanggal: string, bulan: string, tahun: string, jam: string }|null}
 */
export function bagianTanggal(input) {
	const tanggal = keTanggal(input);
	if (!tanggal) return null;
	return {
		hari: NAMA_HARI[tanggal.getDay()],
		tanggal: String(tanggal.getDate()),
		bulan: NAMA_BULAN_PENDEK[tanggal.getMonth()],
		tahun: String(tanggal.getFullYear()),
		jam: `${String(tanggal.getHours()).padStart(2, '0')}.${String(tanggal.getMinutes()).padStart(2, '0')}`
	};
}
