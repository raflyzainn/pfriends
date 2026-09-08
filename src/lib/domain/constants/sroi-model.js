/**
 * MODEL SROI: parameter kanonik perhitungan Social Return on Investment.
 *
 * Tanggung jawab: menjadi SATU-SATUNYA tempat angka penyesuaian SROI, nilai proxy
 * rupiah, dan ambang kelengkapan bukti boleh dituliskan.
 *
 * Berkas ini lahir dari satu temuan yang pantas membuat siapa pun berhenti sejenak:
 * seluruh model SROI: termasuk investasi program Rp450 juta dan rasio yang akan
 * dikutip ke luar organisasi: sebelumnya hidup sebagai konstanta lokal di dalam
 * satu komponen Svelte. Angka paling politis di aplikasi ini adalah satu-satunya
 * angka yang tidak dijaga oleh satu pun uji domain. Memindahkannya ke sini bukan
 * kerapian gaya; ini yang membuat angkanya dapat diuji, ditelusuri, dan diubah di
 * satu tempat ketika Corsec menetapkan nilai sebenarnya.
 *
 * PROVENANCE. Konvensi docs/02 dipertahankan: setiap nilai di bawah berstatus
 * **[ASUMSI]** sampai Corsec menetapkan sumber rujukannya. Tidak satu pun berasal
 * dari dokumen sumber Hal 3/Hal 6 sebagai angka jadi: yang berasal dari sana
 * hanyalah KUANTITAS-nya (jam kegiatan, peserta aksi, jangkauan), bukan nilai
 * rupiah yang dilekatkan padanya. Perbedaan itu wajib tetap terlihat.
 *
 * @see docs/00-SOURCE-BRIEF.md: Hal 3 SROI, Hal 6 dampak inisiatif, Hal 9 pipeline bukti
 * @see docs/02-KPI-MODEL.md: §7.1 empat penyesuaian, §7.2 nilai proxy
 * @see src/lib/domain/services/SroiCalculator.js: eksekusi perhitungannya
 */

/**
 * Ambang kelengkapan bukti ESG (persen) yang membuka pelaporan rasio SROI keluar.
 *
 * Hal 9 menuntut pipeline bukti berdiri lebih dulu sebelum dasbor dampak dipakai
 * sebagai klaim. Selama kelengkapan bukti belum mencapai ambang ini, rasio tetap
 * dihitung dan tetap ditampilkan: tetapi berlabel estimasi internal. Menyembunyikan
 * angkanya sama sekali justru mendorong orang mengarang angka sendiri di slide.
 *
 * [ASUMSI] docs/04 §8.3: menunggu penetapan Corsec.
 * @type {number}
 */
export const AMBANG_KELENGKAPAN_BUKTI = 85;

/**
 * @typedef {object} SroiAdjustment
 * @property {string} key        Kunci stabil, dipakai sebagai kunci `{#each}` dan kolom ekspor.
 * @property {string} label      Nama penyesuaian sebagaimana dikenal praktik SROI.
 * @property {string} pertanyaan Pertanyaan yang dijawab penyesuaian ini, untuk pembaca awam.
 * @property {number} faktor     Proporsi nilai yang dipotong, 0..1.
 */

/**
 * Empat penyesuaian standar SROI, DITERAPKAN BERURUTAN.
 *
 * Urutan larik ini bermakna: tiap penyesuaian memotong SISA dari penyesuaian
 * sebelumnya, bukan nilai kotor awal. Menerapkannya paralel (menjumlahkan keempat
 * faktor lalu memotong sekali) menghasilkan angka yang berbeda dan lebih rendah :
 * 0,2+0,3+0,25+0,1 = 85% terpotong, dibanding 62,2% pada penerapan berurutan.
 * Karena itu larik ini dibekukan dan kalkulator wajib menghormati urutannya.
 *
 * Tanpa keempatnya, angka yang muncul hanyalah penjumlahan manfaat dan tidak layak
 * disebut SROI sama sekali.
 *
 * Seluruh faktor [ASUMSI] docs/02 §7.1.
 * @type {readonly SroiAdjustment[]}
 */
export const SROI_ADJUSTMENTS = Object.freeze([
	Object.freeze({
		key: 'deadweight',
		label: 'Deadweight',
		pertanyaan: 'Berapa yang tetap terjadi tanpa Pfriends?',
		faktor: 0.2
	}),
	Object.freeze({
		key: 'atribusi',
		label: 'Atribusi',
		pertanyaan: 'Berapa bagian yang disebabkan pihak lain?',
		faktor: 0.3
	}),
	Object.freeze({
		key: 'dropoff',
		label: 'Drop-off',
		pertanyaan: 'Berapa peluruhan manfaat pada tahun berikutnya?',
		faktor: 0.25
	}),
	Object.freeze({
		key: 'displacement',
		label: 'Displacement',
		pertanyaan: 'Berapa yang sekadar berpindah, bukan tercipta?',
		faktor: 0.1
	})
]);

/**
 * Nilai proxy dan input eksternal model SROI. SELURUHNYA [ASUMSI]: docs/02 §7.2.
 *
 * Dikumpulkan dalam satu objek beku supaya derajat kepastiannya tetap terlihat
 * sebagai satu blok, dan supaya tabel asumsi di halaman laporan dapat dibangun dari
 * sumber yang sama dengan perhitungannya. Tabel asumsi yang disalin terpisah akan
 * basi pada perubahan pertama, dan yang basi justru daftar yang dipakai pembaca
 * untuk menilai kredibilitas angkanya.
 *
 * @type {Readonly<Record<string, number>>}
 */
export const SROI_PROXY = Object.freeze({
	/** Engagement rate akun brand Pertamina Foundation, sebagai basis pengali Hal 6. */
	engagementRateBrand: 0.02,
	/** Biaya per engagement berbayar di pasar, rupiah. */
	biayaPerEngagement: 2500,
	/** Nilai setara satu jam pelatihan komunitas per peserta, rupiah. */
	nilaiJamPelatihan: 75_000,
	/** Nilai setara partisipasi satu orang dalam aksi lingkungan, rupiah. */
	nilaiPesertaAksi: 120_000,
	/** Investasi program Pfriends sepanjang Januari–Juli 2026, rupiah. */
	investasiProgram: 450_000_000
});

/**
 * @typedef {object} SroiOutcomeDefinition
 * @property {string} id          Kunci stabil outcome.
 * @property {string} label       Nama outcome pada laporan.
 * @property {string} satuan      Satuan kuantitasnya.
 * @property {string} sumber      Asal-usul KUANTITAS: wajib menunjuk data nyata.
 * @property {string} proxyKey    Kunci pada `SROI_PROXY` yang menjadi nilai rupiah satuannya.
 * @property {string} satuanProxy Satuan nilai proxy, mis. 'per engagement'.
 */

/**
 * Tiga outcome berproxy yang membentuk nilai sosial kotor.
 *
 * Pemisahan `sumber` (kuantitas) dari `proxyKey` (nilai) adalah inti kejujuran
 * model ini: kuantitasnya berasal dari catatan yang benar-benar ada: daftar hadir,
 * durasi kegiatan, cerita yang lolos empat gerbang bukti: sedangkan nilai rupiah
 * per satuannya adalah asumsi. Menyatukan keduanya menjadi satu angka jadi akan
 * menghapus perbedaan itu, dan pembaca laporan akan memperlakukan seluruhnya
 * sebagai terukur.
 *
 * @type {readonly SroiOutcomeDefinition[]}
 */
export const SROI_OUTCOMES = Object.freeze([
	Object.freeze({
		id: 'amplifikasi',
		label: 'Amplifikasi konten Pertamina dan PF',
		satuan: 'engagement setara',
		sumber: 'Jangkauan neto × engagement rate brand × pengali komunitas Hal 6',
		proxyKey: 'biayaPerEngagement',
		satuanProxy: 'per engagement'
	}),
	Object.freeze({
		id: 'pelatihan',
		label: 'Transfer pengetahuan lewat kegiatan komunitas',
		satuan: 'jam peserta',
		sumber: 'Durasi kegiatan selesai × jumlah hadir tercatat',
		proxyKey: 'nilaiJamPelatihan',
		satuanProxy: 'per jam peserta'
	}),
	Object.freeze({
		id: 'aksi',
		label: 'Partisipasi aksi lingkungan berbukti',
		satuan: 'peserta',
		sumber: 'Cerita pilar lingkungan yang lolos empat gerbang bukti',
		proxyKey: 'nilaiPesertaAksi',
		satuanProxy: 'per peserta'
	})
]);

/**
 * Kunci kuantitas yang WAJIB disediakan pemanggil `SroiCalculator.hitung()`,
 * berpasangan satu-satu dengan `SROI_OUTCOMES`.
 *
 * Ditulis sebagai peta terpisah, bukan field pada definisi outcome, karena inilah
 * batas antara domain dan pemanggil: domain menetapkan kuantitas apa yang
 * dibutuhkan, pemanggil menyediakan angkanya dari repository.
 *
 * @type {Readonly<Record<string, string>>}
 */
export const SROI_QUANTITY_KEYS = Object.freeze({
	amplifikasi: 'engagementSetara',
	pelatihan: 'jamPelatihan',
	aksi: 'pesertaAksiLingkungan'
});

/**
 * Faktor gabungan seluruh penyesuaian bila diterapkan berurutan.
 *
 * Dipakai uji domain sebagai jangkar: satu penyesuaian yang tidak sengaja terhapus
 * dari `SROI_ADJUSTMENTS` akan langsung mengubah nilai ini, sehingga tidak dapat
 * lolos tanpa terlihat.
 *
 * @returns {number} Proporsi nilai kotor yang tersisa setelah keempat penyesuaian, 0..1.
 */
export function faktorSisaGabungan() {
	return SROI_ADJUSTMENTS.reduce((sisa, penyesuaian) => sisa * (1 - penyesuaian.faktor), 1);
}
