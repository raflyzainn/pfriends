/**
 * VALUE OBJECT — Tag ESG.
 *
 * Tanggung jawab: memasangkan satu pilar ESG dengan satu tujuan SDG sebagai satu
 * kesatuan yang tervalidasi.
 *
 * Hal 12 mensyaratkan "ESG/SDG tag" sebagai satu dari empat gerbang bukti ESG.
 * Menyimpannya sebagai dua field lepas (`pillar` dan `sdgGoal`) membuka peluang
 * kombinasi tak bermakna dan tag setengah terisi lolos ke agregasi. Memasangkannya
 * di satu value object membuat "tag yang tidak lengkap" menjadi keadaan yang tidak
 * mungkin dibentuk.
 *
 * Validasi sengaja ketat: nomor SDG harus termasuk daftar SDG relevan Pfriends,
 * bukan sekadar 1–17. Mengizinkan SDG yang tidak pernah dibuktikan aktivitas
 * komunitas ini akan menghasilkan laporan ESG yang mengklaim lebih dari yang
 * benar-benar terjadi.
 *
 * @see docs/00-SOURCE-BRIEF.md — Hal 10 ESG Measurement Hints, Hal 12 Minimum for ESG evidence
 * @see docs/04-ESG-GOVERNANCE.md — §2 Pemetaan Aktivitas ke Tag ESG dan SDG
 */

import { pilarEsg, tujuanSdg } from '../constants/esg-taxonomy.js';

export class EsgTag {
	/** @type {string} */
	#pillar;
	/** @type {number} */
	#sdgGoal;

	/**
	 * @param {string} pillar Salah satu EsgPillar ('E', 'S', atau 'G').
	 * @param {number} sdgGoal Nomor tujuan SDG yang relevan bagi Pfriends.
	 * @throws {TypeError} bila tipe argumen salah.
	 * @throws {RangeError} bila pilar atau tujuan SDG tidak dikenal.
	 */
	constructor(pillar, sdgGoal) {
		if (typeof pillar !== 'string') {
			throw new TypeError(`Pilar ESG harus berupa string, diterima: ${String(pillar)}`);
		}
		if (!Number.isInteger(sdgGoal)) {
			throw new TypeError(`Nomor SDG harus bilangan bulat, diterima: ${String(sdgGoal)}`);
		}
		// Kedua pemanggilan di bawah melempar RangeError bila nilainya tidak dikenal.
		pilarEsg(pillar);
		tujuanSdg(sdgGoal);

		this.#pillar = pillar;
		this.#sdgGoal = sdgGoal;
		Object.freeze(this);
	}

	/** @returns {string} Kode pilar: 'E', 'S', atau 'G'. */
	get pillar() {
		return this.#pillar;
	}

	/** @returns {number} Nomor tujuan SDG. */
	get sdgGoal() {
		return this.#sdgGoal;
	}

	/** @returns {string} Nama pilar Bahasa Indonesia, mis. 'Lingkungan'. */
	get pillarLabel() {
		return pilarEsg(this.#pillar).label;
	}

	/** @returns {string} Nama tujuan SDG Bahasa Indonesia. */
	get sdgLabel() {
		return tujuanSdg(this.#sdgGoal).label;
	}

	/**
	 * Label lengkap untuk tooltip dan teks alternatif aksesibilitas.
	 * @returns {string} mis. 'Lingkungan · SDG 13 Penanganan Perubahan Iklim'.
	 */
	get label() {
		return `${this.pillarLabel} · SDG ${this.#sdgGoal} ${this.sdgLabel}`;
	}

	/**
	 * Label ringkas untuk chip pada kartu cerita dan tabel bukti.
	 * @returns {string} mis. 'E · SDG 13'.
	 */
	get shortLabel() {
		return `${this.#pillar} · SDG ${this.#sdgGoal}`;
	}

	/** @returns {string} Nama token warna dasar pilar. */
	get token() {
		return pilarEsg(this.#pillar).token;
	}

	/** @returns {string} Nama token warna aman untuk teks. */
	get ink() {
		return pilarEsg(this.#pillar).ink;
	}

	/** @returns {string} Nama token warna latar lembut. */
	get tint() {
		return pilarEsg(this.#pillar).tint;
	}

	/** @returns {string} Warna resmi SDG PBB untuk chip nomor tujuan. */
	get sdgColor() {
		return tujuanSdg(this.#sdgGoal).color;
	}

	/**
	 * Perbandingan berbasis nilai — dua tag dengan pilar dan SDG sama dianggap
	 * identik, sehingga deduplikasi daftar tag dapat mengandalkannya.
	 * @param {unknown} other
	 * @returns {boolean}
	 */
	equals(other) {
		return (
			other instanceof EsgTag && other.pillar === this.#pillar && other.sdgGoal === this.#sdgGoal
		);
	}

	/** @returns {string} */
	toString() {
		return this.shortLabel;
	}

	/**
	 * Bentuk yang disimpan ke basis data.
	 * @returns {{pillar: string, sdgGoal: number}}
	 */
	toJSON() {
		return { pillar: this.#pillar, sdgGoal: this.#sdgGoal };
	}

	/**
	 * Membangun ulang tag dari bentuk tersimpan.
	 * @param {{pillar: string, sdgGoal: number}} data
	 * @returns {EsgTag}
	 */
	static fromJSON(data) {
		return new EsgTag(data.pillar, data.sdgGoal);
	}

	/**
	 * Membangun seluruh tag untuk satu pemetaan aktivitas komunitas — satu tag per
	 * SDG yang dapat diklaim aktivitas tersebut.
	 * @param {import('../constants/esg-taxonomy.js').EsgActivityMapping} mapping
	 * @returns {readonly EsgTag[]}
	 */
	static dariPemetaanAktivitas(mapping) {
		return Object.freeze(mapping.sdgGoals.map((goal) => new EsgTag(mapping.pillar, goal)));
	}

	/**
	 * Membuang tag kembar dari sebuah daftar, mempertahankan urutan kemunculan.
	 * @param {readonly EsgTag[]} tags
	 * @returns {readonly EsgTag[]}
	 */
	static unik(tags) {
		/** @type {EsgTag[]} */
		const hasil = [];
		for (const tag of tags) {
			if (!hasil.some((sudahAda) => sudahAda.equals(tag))) hasil.push(tag);
		}
		return Object.freeze(hasil);
	}
}
