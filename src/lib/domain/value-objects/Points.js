/**
 * VALUE OBJECT: Poin Kontribusi.
 *
 * Tanggung jawab: menjaga satu invarian yang tidak boleh dilanggar di mana pun :
 * poin selalu bilangan bulat tak negatif.
 *
 * Alasan keberadaan kelas ini alih-alih `number` biasa: perhitungan poin tersebar
 * di banyak tempat (pemberian poin, pengali streak, pemotongan kuota harian,
 * agregasi papan peringkat). Menaruh validasinya di satu tipe berarti poin negatif
 * atau pecahan gagal saat dibuat, bukan muncul diam-diam di dasbor anggota sebagai
 * "-3 poin" atau "12,4 poin".
 *
 * Immutable: setiap operasi mengembalikan instans baru, instans lama tidak pernah
 * berubah. Ini membuat objek Points aman dibagi ke banyak komponen sekaligus.
 *
 * @see docs/00-SOURCE-BRIEF.md: Hal 11 Gamification Scoring Model
 * @see docs/03-GAMIFICATION-SPEC.md: §13.2 Value Objects
 */

export class Points {
	/** @type {number} */
	#value;

	/**
	 * @param {number} value Nilai poin: wajib bilangan bulat >= 0.
	 * @throws {TypeError} bila bukan angka berhingga (termasuk NaN, string, null).
	 * @throws {RangeError} bila pecahan atau negatif.
	 */
	constructor(value) {
		if (typeof value !== 'number' || !Number.isFinite(value)) {
			throw new TypeError(`Points harus berupa angka berhingga, diterima: ${String(value)}`);
		}
		if (!Number.isInteger(value)) {
			throw new RangeError(`Points harus bilangan bulat, diterima: ${value}`);
		}
		if (value < 0) {
			throw new RangeError(`Points tidak boleh negatif, diterima: ${value}`);
		}
		this.#value = value;
		Object.freeze(this);
	}

	/** @returns {number} */
	get value() {
		return this.#value;
	}

	/**
	 * Penjumlahan poin.
	 * @param {Points|number} other
	 * @returns {Points} Instans baru.
	 */
	plus(other) {
		return new Points(this.#value + Points.from(other).value);
	}

	/**
	 * Pengurangan poin, ditahan di nol. Poin tidak pernah negatif: pembatalan
	 * entri yang melebihi saldo menghasilkan nol, bukan utang poin.
	 * @param {Points|number} other
	 * @returns {Points} Instans baru.
	 */
	minus(other) {
		return new Points(Math.max(0, this.#value - Points.from(other).value));
	}

	/**
	 * Penskalaan untuk pengali streak dan diminishing returns. Hasil dibulatkan ke
	 * bawah namun ditahan minimal satu selama pengali positif dan poin awal bukan
	 * nol: aksi yang benar-benar dilakukan tidak boleh berbuah nol poin, karena
	 * itu terbaca sebagai kegagalan sistem, bukan sebagai pengurangan insentif.
	 * @param {number} multiplier Pengali, mis. 0.5 atau 1.25.
	 * @returns {Points} Instans baru.
	 * @throws {TypeError} bila pengali bukan angka berhingga.
	 */
	scaledBy(multiplier) {
		if (typeof multiplier !== 'number' || !Number.isFinite(multiplier)) {
			throw new TypeError(`Pengali harus berupa angka berhingga, diterima: ${String(multiplier)}`);
		}
		if (multiplier <= 0 || this.#value === 0) return Points.zero();
		return new Points(Math.max(1, Math.floor(this.#value * multiplier)));
	}

	/**
	 * Memotong nilai poin oleh sisa kuota, dipakai saat cap harian hampir penuh.
	 * @param {number} remaining Sisa kuota poin.
	 * @returns {Points} Instans baru.
	 */
	clampTo(remaining) {
		if (typeof remaining !== 'number' || !Number.isFinite(remaining)) {
			throw new TypeError(`Sisa kuota harus berupa angka berhingga, diterima: ${String(remaining)}`);
		}
		return new Points(Math.max(0, Math.min(this.#value, Math.floor(remaining))));
	}

	/** @returns {boolean} */
	isZero() {
		return this.#value === 0;
	}

	/**
	 * Perbandingan berbasis nilai: dua Points dengan nilai sama dianggap sama,
	 * tanpa memandang identitas objeknya.
	 * @param {unknown} other
	 * @returns {boolean}
	 */
	equals(other) {
		return other instanceof Points && other.value === this.#value;
	}

	/**
	 * Perbandingan urutan untuk pengurutan papan peringkat.
	 * @param {Points|number} other
	 * @returns {number} Negatif bila lebih kecil, nol bila sama, positif bila lebih besar.
	 */
	compareTo(other) {
		return this.#value - Points.from(other).value;
	}

	/**
	 * Representasi teks polos tanpa pemformatan lokal. Pemformatan ribuan adalah
	 * urusan lapisan presentasi, bukan domain.
	 * @returns {string}
	 */
	toString() {
		return String(this.#value);
	}

	/**
	 * Bentuk yang disimpan ke basis data dan dikirim lewat JSON.
	 * @returns {number}
	 */
	toJSON() {
		return this.#value;
	}

	/** @returns {Points} Poin bernilai nol. */
	static zero() {
		return new Points(0);
	}

	/**
	 * Konversi longgar dari angka biasa atau instans Points. Berguna di batas
	 * lapisan, saat data mentah dari basis data masuk ke domain.
	 * @param {Points|number} value
	 * @returns {Points}
	 */
	static from(value) {
		return value instanceof Points ? value : new Points(value);
	}

	/**
	 * Menjumlahkan sederet poin, mis. saat menghitung total dari buku besar.
	 * @param {readonly (Points|number)[]} items
	 * @returns {Points}
	 */
	static sum(items) {
		return items.reduce((total, item) => total.plus(item), Points.zero());
	}
}
