/**
 * DATA CONTOH DASBOR VERIFIKATOR — angka performa awardee untuk mockup demo.
 *
 * Tanggung jawab: menjadi SATU-SATUNYA tempat angka contoh dasbor verifikator
 * hidup, supaya halaman dasbor tidak menjadi campuran antara tata letak dan
 * bilangan yang ditulis lepas di sela-sela markup.
 *
 * Empat keputusan yang tidak terbaca dari kode:
 *
 * 1. **Angka di sini SALING KONSISTEN, bukan acak.** Jumlah `POSTINGAN_TERBIT`
 *    sama persis dengan jumlah `SEBARAN_CHAPTER`, dan `POIN_BULANAN` naik
 *    seiring postingan yang terbit. Dasbor demo yang totalnya tidak berjodoh
 *    adalah hal pertama yang ditangkap pemirsa di ruang rapat, dan sesudah itu
 *    tidak ada satu pun angka lain yang mereka percayai.
 * 2. **Turunan dihitung, bukan diketik.** "KPI tercapai 3 dari 5" lahir dari
 *    `kpiTercapai()`, bukan dari angka 3 yang ditulis tangan — supaya menyunting
 *    satu baris KPI tidak diam-diam membuat kartu ringkasannya berbohong.
 * 3. **Papan peringkat punya cadangan.** `PESERTA_TERAKTIF` dipakai hanya bila
 *    katalog awardee belum termuat; begitu data seed hadir, dasbor memakai nama
 *    sungguhan. Papan peringkat kosong pada saat demo lebih buruk daripada papan
 *    berisi contoh yang jujur ditandai.
 * 4. **Nilai antrean TIDAK ada di berkas ini.** Cacah naskah dan usulan yang
 *    menunggu datang dari store `editorial` — itu pekerjaan nyata verifikator,
 *    dan menggantinya dengan angka contoh akan membuat tautan "buka antrean"
 *    membawa pengguna ke daftar yang isinya berbeda dari lencananya.
 */

import { CommunityType } from '$lib/domain/constants/community.js';

/** Delapan bulan program berjalan, urut menaik. */
export const BULAN = Object.freeze(['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags']);

/** Postingan blog awardee yang TERBIT tiap bulan. Jumlahnya 205. */
export const POSTINGAN_TERBIT = Object.freeze([12, 18, 21, 24, 27, 31, 34, 38]);

/**
 * Poin kontribusi awardee yang tercatat tiap bulan. Jumlahnya 57.700.
 *
 * Naik seiring `POSTINGAN_TERBIT` dan bukan kebetulan: poin lahir dari kontribusi
 * yang terbit, sehingga dua deret yang bergerak berlawanan arah akan langsung
 * ditanyakan pemirsa — dan tidak akan ada jawabannya.
 */
export const POIN_BULANAN = Object.freeze([3800, 5200, 6100, 6900, 7400, 8600, 9500, 10200]);

/** Ambang capaian KPI awardee, dalam persen. */
export const AMBANG_KPI = 80;

/**
 * Capaian KPI awardee terhadap `AMBANG_KPI`, dalam persen.
 * @type {readonly {label: string, capaian: number}[]}
 */
export const KPI_AWARDEE = Object.freeze([
	Object.freeze({ label: 'Publikasi cerita dampak', capaian: 96 }),
	Object.freeze({ label: 'Kelengkapan bukti ESG', capaian: 84 }),
	Object.freeze({ label: 'Kehadiran sesi upskilling', capaian: 81 }),
	Object.freeze({ label: 'Mentoring lintas komunitas', capaian: 71 }),
	Object.freeze({ label: 'Kolaborasi antar-chapter', capaian: 62 })
]);

/**
 * Asal kontribusi per komunitas dan chapter. Jumlahnya 205 — sama dengan jumlah
 * `POSTINGAN_TERBIT`, karena keduanya menghitung hal yang sama dari dua sisi.
 * @type {readonly {label: string, value: number}[]}
 */
export const SEBARAN_CHAPTER = Object.freeze([
	Object.freeze({ label: 'SOBI · PF 11', value: 58 }),
	Object.freeze({ label: 'SOBI · PF 10', value: 46 }),
	Object.freeze({ label: 'SOBI · PF 12', value: 34 }),
	Object.freeze({ label: 'Womenpreneur · PF 11', value: 28 }),
	Object.freeze({ label: 'Womenpreneur · PF 10', value: 22 }),
	Object.freeze({ label: 'Womenpreneur · PF 12', value: 17 })
]);

/** Awardee terdaftar dan yang berkontribusi minimal sekali pada 90 hari terakhir. */
export const AWARDEE_TERDAFTAR = 214;
export const AWARDEE_AKTIF = 168;

/**
 * Mutu kerja peninjauan — dipakai kartu antrean, bukan chart.
 *
 * `waktuTanggapHari` ditulis sebagai TEKS, bukan bilangan: pemisah desimal
 * Bahasa Indonesia adalah koma, sedangkan `1.8` yang dirender apa adanya akan
 * terbaca sebagai angka berbahasa lain di layar yang seluruhnya berbahasa
 * Indonesia. Nilainya tidak pernah dihitung, hanya ditampilkan.
 */
export const LAJU_PENINJAUAN = Object.freeze({
	keputusanPekanIni: 24,
	waktuTanggapHari: '1,8',
	submissionLangsungSetuju: 62
});

/**
 * Papan peringkat cadangan, dipakai hanya saat katalog awardee belum termuat.
 * @type {readonly {id: string, name: string, community: string, chapter: string, points: number, delta: number}[]}
 */
export const PESERTA_TERAKTIF = Object.freeze([
	Object.freeze({ id: 'AWD-C01', name: 'Rahmania Salsabila', community: CommunityType.SOBI, chapter: 'PF 11', points: 2480, delta: 2 }),
	Object.freeze({ id: 'AWD-C02', name: 'Dwi Anggara Putra', community: CommunityType.SOBI, chapter: 'PF 10', points: 2145, delta: -1 }),
	Object.freeze({ id: 'AWD-C03', name: 'Nurul Hidayanti', community: CommunityType.WOMENPRENEUR, chapter: 'PF 12', points: 1980, delta: 3 }),
	Object.freeze({ id: 'AWD-C04', name: 'Bagas Prakoso', community: CommunityType.SOBI, chapter: 'PF 12', points: 1760, delta: 0 }),
	Object.freeze({ id: 'AWD-C05', name: 'Siti Maharani', community: CommunityType.WOMENPRENEUR, chapter: 'PF 11', points: 1615, delta: 1 }),
	Object.freeze({ id: 'AWD-C06', name: 'Yoga Ardiansyah', community: CommunityType.SOBI, chapter: 'PF 10', points: 1480, delta: -2 }),
	Object.freeze({ id: 'AWD-C07', name: 'Lestari Wijayanti', community: CommunityType.WOMENPRENEUR, chapter: 'PF 10', points: 1325, delta: 0 }),
	Object.freeze({ id: 'AWD-C08', name: 'Fajar Ramadhan', community: CommunityType.SOBI, chapter: 'PF 11', points: 1190, delta: 4 })
]);

/** Banyaknya baris papan peringkat yang ditampilkan dasbor. */
export const BARIS_PAPAN = 8;

/**
 * Menjumlahkan sebuah deret angka.
 * @param {readonly number[]} deret
 * @returns {number}
 */
export function jumlah(deret) {
	return deret.reduce((total, n) => total + n, 0);
}

/**
 * Banyaknya KPI awardee yang sudah melewati ambang.
 * @returns {number}
 */
export function kpiTercapai() {
	return KPI_AWARDEE.filter((kpi) => kpi.capaian >= AMBANG_KPI).length;
}

/**
 * Pertumbuhan bulan terakhir terhadap bulan sebelumnya, dalam persen bulat.
 *
 * Dikembalikan sebagai bilangan supaya `StatTile` dapat memilih rupa panah
 * sendiri; halaman tidak perlu tahu bagaimana tren digambar.
 *
 * @param {readonly number[]} deret
 * @returns {number} 0 bila deret terlalu pendek atau pembandingnya nol.
 */
export function trenTerakhir(deret) {
	if (deret.length < 2) return 0;
	const kini = deret[deret.length - 1];
	const lalu = deret[deret.length - 2];
	if (!(lalu > 0)) return 0;
	return Math.round(((kini - lalu) / lalu) * 100);
}
