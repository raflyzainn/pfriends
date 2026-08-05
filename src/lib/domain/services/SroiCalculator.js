/**
 * SERVICE — Kalkulator SROI sederhana.
 *
 * Tanggung jawab: mengubah tiga kuantitas nyata (jangkauan neto, jam pelatihan
 * terkumpul, peserta aksi lingkungan berbukti) menjadi nilai sosial neto dan rasio
 * SROI, lengkap dengan rantai penyesuaian yang dapat ditelusuri langkah demi
 * langkah.
 *
 * MENGAPA INI SEBUAH SERVICE, BUKAN BEBERAPA BARIS `$derived` DI HALAMAN.
 * Rasio SROI atas investasi Rp450 juta adalah angka yang akan dikutip ke luar
 * organisasi. Selama ia hidup di dalam komponen, ia tidak dapat dijalankan tanpa
 * peramban, tidak dapat diuji, dan tidak dapat dipanggil dari tempat kedua tanpa
 * disalin. Angka yang paling perlu dipertahankan saat diaudit justru menjadi angka
 * yang paling tidak terlindungi. Di sini ia menjadi fungsi murni atas angka murni —
 * dapat diuji dengan `node` polos, dan setiap langkah antaranya ikut dikembalikan
 * supaya laporan dapat menunjukkan JALANNYA, bukan cuma hasilnya.
 *
 * TIGA ATURAN YANG DITEGAKKAN KELAS INI.
 *
 * 1. **Penyesuaian diterapkan BERURUTAN, bukan dijumlahkan.** Tiap langkah memotong
 *    sisa langkah sebelumnya. Menjumlahkan keempat faktor lalu memotong sekali
 *    menghasilkan angka lain sama sekali (85% terpotong, bukan 62,2%), dan itulah
 *    kekeliruan paling sering pada perhitungan SROI buatan sendiri.
 * 2. **Kuantitas negatif ditolak, bukan dibulatkan ke nol.** Kuantitas negatif
 *    berarti pemanggilnya salah menghitung; menerima diam-diam akan menghasilkan
 *    rasio yang tampak wajar di atas data yang rusak.
 * 3. **Kelayakan pelaporan ikut dihitung di sini.** Rasio tidak pernah keluar
 *    sendirian — `layakDilaporkan` menyertainya, dan itulah yang menahan angka
 *    estimasi dibawa keluar sebagai klaim sebelum pipeline bukti berdiri (Hal 9).
 *
 * @see docs/00-SOURCE-BRIEF.md — Hal 3 SROI, Hal 6 dampak, Hal 9 pipeline bukti
 * @see docs/02-KPI-MODEL.md — §7 SROI sederhana
 * @see src/lib/domain/constants/sroi-model.js — seluruh angkanya
 */

import { REACH_PARAMETERS } from '../constants/kpi-targets.js';
import {
	AMBANG_KELENGKAPAN_BUKTI,
	SROI_ADJUSTMENTS,
	SROI_OUTCOMES,
	SROI_PROXY,
	SROI_QUANTITY_KEYS
} from '../constants/sroi-model.js';

/**
 * @typedef {object} SroiQuantities
 * @property {number} jangkauanNeto           Titik tengah jangkauan organik neto, orang.
 * @property {number} jamPelatihan            Jam-peserta kegiatan yang benar-benar terlaksana.
 * @property {number} pesertaAksiLingkungan   Peserta aksi lingkungan pada cerita berbukti.
 * @property {number} [kelengkapanBuktiPersen] Kelengkapan bukti ESG, 0..100; default 0.
 */

/**
 * @typedef {object} SroiOutcomeRow
 * @property {string} id
 * @property {string} label
 * @property {number} kuantitas
 * @property {string} satuan
 * @property {string} sumber
 * @property {number} proxy        Nilai rupiah per satuan — [ASUMSI].
 * @property {string} satuanProxy
 * @property {number} nilai        kuantitas × proxy, rupiah.
 */

/**
 * @typedef {object} SroiAdjustmentRow
 * @property {string} key
 * @property {string} label
 * @property {string} pertanyaan
 * @property {number} faktor
 * @property {number} potongan Rupiah yang dipotong pada langkah ini.
 * @property {number} sisa     Rupiah yang tersisa sesudah langkah ini.
 */

/**
 * @typedef {object} SroiResult
 * @property {Record<string, number>} kuantitas Kuantitas terpakai, termasuk turunannya.
 * @property {SroiOutcomeRow[]} outcomes
 * @property {number} nilaiKotor
 * @property {SroiAdjustmentRow[]} penyesuaian
 * @property {number} nilaiNeto
 * @property {number} investasi
 * @property {number} rasio                    Nilai sosial neto / investasi program.
 * @property {number} kelengkapanBuktiPersen
 * @property {number} ambangKelengkapanBukti
 * @property {boolean} layakDilaporkan
 * @property {boolean} adaOutcome              `false` bila nilai kotor belum terbentuk.
 */

/**
 * Memastikan sebuah kuantitas layak masuk perhitungan.
 * @param {unknown} nilai
 * @param {string} nama
 * @returns {number}
 * @throws {RangeError} bila bukan bilangan terhingga tak negatif.
 */
function kuantitasSah(nilai, nama) {
	if (typeof nilai !== 'number' || !Number.isFinite(nilai) || nilai < 0) {
		throw new RangeError(
			`Kuantitas "${nama}" harus bilangan terhingga tak negatif, diterima: ${String(nilai)}`
		);
	}
	return nilai;
}

export class SroiCalculator {
	/** @type {readonly import('../constants/sroi-model.js').SroiAdjustment[]} */
	#adjustments;
	/** @type {Readonly<Record<string, number>>} */
	#proxy;
	/** @type {number} */
	#ambangBukti;
	/** @type {number} */
	#pengaliEngagement;

	/**
	 * Seluruh parameter dapat diganti lewat konstruktor — bukan demi kelenturan yang
	 * tidak diminta, melainkan supaya uji domain dapat menyuntikkan angka sederhana
	 * (mis. investasi 100 dan satu penyesuaian 50%) dan memeriksa aritmetikanya tanpa
	 * bergantung pada nilai produksi yang suatu saat akan diubah Corsec.
	 *
	 * @param {object} [opsi]
	 * @param {readonly import('../constants/sroi-model.js').SroiAdjustment[]} [opsi.adjustments]
	 * @param {Readonly<Record<string, number>>} [opsi.proxy]
	 * @param {number} [opsi.ambangKelengkapanBukti]
	 * @param {number} [opsi.pengaliEngagement] Pengali engagement komunitas Hal 6.
	 * @throws {RangeError} bila sebuah faktor penyesuaian berada di luar 0..1.
	 */
	constructor({
		adjustments = SROI_ADJUSTMENTS,
		proxy = SROI_PROXY,
		ambangKelengkapanBukti = AMBANG_KELENGKAPAN_BUKTI,
		pengaliEngagement = REACH_PARAMETERS.pengaliEngagementMin
	} = {}) {
		for (const penyesuaian of adjustments) {
			if (!(penyesuaian.faktor >= 0 && penyesuaian.faktor <= 1)) {
				throw new RangeError(
					`Faktor penyesuaian "${penyesuaian.key}" harus berada di rentang 0..1, diterima: ${String(penyesuaian.faktor)}`
				);
			}
		}
		this.#adjustments = Object.freeze([...adjustments]);
		this.#proxy = proxy;
		this.#ambangBukti = ambangKelengkapanBukti;
		this.#pengaliEngagement = pengaliEngagement;
		Object.freeze(this);
	}

	/** @returns {Readonly<Record<string, number>>} Nilai proxy yang sedang dipakai — [ASUMSI]. */
	get proxy() {
		return this.#proxy;
	}

	/** @returns {readonly import('../constants/sroi-model.js').SroiAdjustment[]} */
	get adjustments() {
		return this.#adjustments;
	}

	/** @returns {number} Ambang kelengkapan bukti yang membuka pelaporan keluar. */
	get ambangKelengkapanBukti() {
		return this.#ambangBukti;
	}

	/**
	 * Engagement setara dari jangkauan neto.
	 *
	 * Pengali memakai BATAS BAWAH rentang Hal 6 dengan sengaja: kata "hingga" pada
	 * dokumen sumber menandakan batas atas sebuah rentang, bukan nilai harapan.
	 * Memakai batas atas akan melipatgandakan outcome terbesar model ini di atas
	 * dasar yang paling lemah.
	 *
	 * @param {number} jangkauanNeto
	 * @returns {number} Dibulatkan ke bilangan bulat terdekat.
	 * @throws {RangeError} bila jangkauan neto negatif.
	 */
	engagementSetara(jangkauanNeto) {
		const neto = kuantitasSah(jangkauanNeto, 'jangkauanNeto');
		return Math.round(neto * this.#proxy.engagementRateBrand * this.#pengaliEngagement);
	}

	/**
	 * Tiga outcome berproxy beserta nilai rupiahnya.
	 * @param {Record<string, number>} kuantitas Berkunci `SROI_QUANTITY_KEYS`.
	 * @returns {SroiOutcomeRow[]}
	 * @throws {RangeError} bila salah satu kuantitas tidak sah.
	 */
	outcomes(kuantitas) {
		return SROI_OUTCOMES.map((definisi) => {
			const kunci = SROI_QUANTITY_KEYS[definisi.id];
			const jumlah = kuantitasSah(kuantitas[kunci], kunci);
			const proxy = this.#proxy[definisi.proxyKey];
			return {
				id: definisi.id,
				label: definisi.label,
				kuantitas: jumlah,
				satuan: definisi.satuan,
				sumber: definisi.sumber,
				proxy,
				satuanProxy: definisi.satuanProxy,
				nilai: jumlah * proxy
			};
		});
	}

	/**
	 * Rantai penyesuaian berurutan atas nilai sosial kotor.
	 *
	 * Tiap baris membawa nilai potongannya DAN sisa sesudahnya, supaya laporan dapat
	 * memperlihatkan penurunan langkah demi langkah. Rantai yang hanya menampilkan
	 * hasil akhir menuntut pembaca memercayai aritmetika yang tidak dapat dilihatnya.
	 *
	 * @param {number} nilaiKotor
	 * @returns {SroiAdjustmentRow[]}
	 * @throws {RangeError} bila nilai kotor negatif.
	 */
	adjustmentChain(nilaiKotor) {
		let berjalan = kuantitasSah(nilaiKotor, 'nilaiKotor');
		return this.#adjustments.map((penyesuaian) => {
			const potongan = berjalan * penyesuaian.faktor;
			berjalan -= potongan;
			return {
				key: penyesuaian.key,
				label: penyesuaian.label,
				pertanyaan: penyesuaian.pertanyaan,
				faktor: penyesuaian.faktor,
				potongan,
				sisa: berjalan
			};
		});
	}

	/**
	 * Perhitungan SROI lengkap.
	 *
	 * @param {SroiQuantities} kuantitas
	 * @returns {SroiResult}
	 * @throws {RangeError} bila salah satu kuantitas tidak sah.
	 */
	hitung({ jangkauanNeto, jamPelatihan, pesertaAksiLingkungan, kelengkapanBuktiPersen = 0 }) {
		const engagementSetara = this.engagementSetara(jangkauanNeto);
		const terpakai = {
			jangkauanNeto: kuantitasSah(jangkauanNeto, 'jangkauanNeto'),
			engagementSetara,
			jamPelatihan: kuantitasSah(jamPelatihan, 'jamPelatihan'),
			pesertaAksiLingkungan: kuantitasSah(pesertaAksiLingkungan, 'pesertaAksiLingkungan')
		};

		const outcomes = this.outcomes(terpakai);
		const nilaiKotor = outcomes.reduce((jumlah, baris) => jumlah + baris.nilai, 0);
		const penyesuaian = this.adjustmentChain(nilaiKotor);
		const nilaiNeto = penyesuaian.at(-1)?.sisa ?? nilaiKotor;
		const investasi = this.#proxy.investasiProgram;
		const persenBukti = kuantitasSah(kelengkapanBuktiPersen, 'kelengkapanBuktiPersen');

		return {
			kuantitas: terpakai,
			outcomes,
			nilaiKotor,
			penyesuaian,
			nilaiNeto,
			investasi,
			// Investasi nol berarti angkanya belum ditetapkan Corsec; rasio tak hingga
			// jauh lebih berbahaya di layar daripada nol yang jelas-jelas kosong.
			rasio: investasi > 0 ? nilaiNeto / investasi : 0,
			kelengkapanBuktiPersen: persenBukti,
			ambangKelengkapanBukti: this.#ambangBukti,
			layakDilaporkan: persenBukti >= this.#ambangBukti,
			adaOutcome: nilaiKotor > 0
		};
	}

	/**
	 * Daftar asumsi yang dipakai perhitungan, siap ditampilkan apa adanya.
	 *
	 * Dibangun dari objek proxy yang sama dengan yang dipakai menghitung — bukan
	 * disalin ulang di halaman — supaya tabel asumsi tidak dapat menjadi basi tanpa
	 * ada yang menyadarinya. Tabel asumsi yang basi persis merusak hal yang hendak
	 * dijaganya: kepercayaan pembaca pada angkanya.
	 *
	 * @returns {{key: string, nilai: number}[]}
	 */
	asumsi() {
		return Object.entries(this.#proxy).map(([key, nilai]) => ({ key, nilai }));
	}
}

/** Instans dengan parameter produksi; dipakai halaman laporan. */
export const sroiCalculator = new SroiCalculator();
