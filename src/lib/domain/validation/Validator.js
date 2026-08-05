/**
 * VALIDASI — aturan formulir sebagai data yang dapat disusun ulang.
 *
 * Tanggung jawab: menyatakan syarat sebuah nilai sebagai objek `Rule` yang murni,
 * lalu menjalankan sekumpulan aturan atas sebuah objek nilai formulir.
 *
 * Tiga keputusan desain yang tidak terbaca dari kode:
 *
 * 1. **HANYA `required` yang menolak nilai kosong.** Aturan lain LOLOS bila
 *    nilainya kosong. Tanpa konvensi ini, sebuah field opsional yang diberi
 *    `Rule.email()` akan menyalakan galat "Format surel tidak sah" pada formulir
 *    yang belum disentuh siapa pun — dan pengguna melihat halaman merah sebelum
 *    ia sempat mengetik satu huruf pun. Kewajiban isi dan bentuk isi adalah dua
 *    pertanyaan berbeda, jadi dua aturan berbeda.
 * 2. **Pesan galat melekat pada aturan, bukan pada pemanggil.** Satu aturan
 *    membawa satu kalimat Bahasa Indonesia yang siap ditampilkan. Pesan yang
 *    disusun di komponen akan berbeda-beda antar halaman untuk syarat yang sama.
 * 3. **`Rule` dibekukan pada konstruksi.** Aturan yang sama dipakai lintas
 *    formulir; satu pemanggil yang menyunting `message` akan mengubah pesan di
 *    halaman lain tanpa jejak.
 *
 * @see docs/12-BUILD-CONTRACT-V2.md — §2.7 kontrak export
 */

/** Batas iterasi aman saat memeriksa panjang string yang sangat besar. */
const PANJANG_TAK_TERBATAS = Number.POSITIVE_INFINITY;

/**
 * Apakah sebuah nilai dianggap kosong.
 *
 * Angka `0` dan boolean `false` BUKAN kosong: keduanya jawaban yang sah, dan
 * memperlakukannya sebagai kosong membuat "jumlah peserta 0" mustahil dikirim.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
function kosong(value) {
	if (value === null || value === undefined) return true;
	if (typeof value === 'string') return value.trim() === '';
	if (Array.isArray(value)) return value.length === 0;
	return false;
}

/**
 * Panjang teks sebuah nilai sesudah dipangkas spasi tepi.
 * @param {unknown} value
 * @returns {number}
 */
function panjangTeks(value) {
	if (typeof value === 'string') return value.trim().length;
	if (Array.isArray(value)) return value.length;
	if (value === null || value === undefined) return 0;
	return String(value).trim().length;
}

/**
 * Nilai numerik sebuah masukan; `NaN` bila tidak dapat ditafsirkan.
 * @param {unknown} value
 * @returns {number}
 */
function keAngka(value) {
	if (typeof value === 'number') return value;
	if (typeof value === 'string' && value.trim() !== '') return Number(value.trim());
	return Number.NaN;
}

/** Bentuk surel yang diterima: ada satu `@`, ada titik pada domain, tanpa spasi. */
const POLA_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Nomor ponsel Indonesia: diawali `0`, `62`, atau `+62`, lalu `8`, total 9–14 digit.
 * Spasi, titik, dan tanda hubung dibuang lebih dulu karena orang menuliskan
 * nomornya dengan pemisah yang berbeda-beda dan itu bukan kesalahan pengisian.
 */
const POLA_TELEPON = /^(?:\+?62|0)8\d{7,11}$/;

export class Rule {
	/**
	 * @param {string} name Nama aturan; `'required'` diperlakukan khusus oleh `check`.
	 * @param {string} message Pesan Bahasa Indonesia yang ditampilkan saat gagal.
	 * @param {(value: unknown) => boolean} test Uji murni; `true` berarti lolos.
	 * @throws {TypeError} bila nama, pesan, atau uji tidak berbentuk yang benar.
	 */
	constructor(name, message, test) {
		if (typeof name !== 'string' || name.trim() === '') {
			throw new TypeError('Rule membutuhkan nama berupa string tidak kosong.');
		}
		if (typeof message !== 'string' || message.trim() === '') {
			throw new TypeError(`Rule "${name}" membutuhkan pesan galat Bahasa Indonesia.`);
		}
		if (typeof test !== 'function') {
			throw new TypeError(`Rule "${name}" membutuhkan fungsi uji.`);
		}
		this.name = name;
		this.message = message;
		this.test = test;
		Object.freeze(this);
	}

	/**
	 * Apakah sebuah nilai lolos aturan ini.
	 *
	 * Nilai kosong dilewatkan untuk seluruh aturan selain `required` — lihat butir 1
	 * pada catatan berkas.
	 *
	 * @param {unknown} value
	 * @returns {boolean}
	 */
	check(value) {
		if (this.name !== 'required' && kosong(value)) return true;
		return this.test(value) === true;
	}

	/**
	 * Nilai wajib diisi. Satu-satunya aturan yang menolak nilai kosong.
	 * @param {string} [msg]
	 * @returns {Rule}
	 */
	static required(msg = 'Bagian ini wajib diisi.') {
		return new Rule('required', msg, (value) => !kosong(value));
	}

	/**
	 * Panjang minimum teks.
	 * @param {number} n Jumlah karakter minimum.
	 * @param {string} [msg]
	 * @returns {Rule}
	 */
	static minLength(n, msg = `Minimal ${n} karakter.`) {
		return new Rule('minLength', msg, (value) => panjangTeks(value) >= n);
	}

	/**
	 * Panjang maksimum teks.
	 * @param {number} n Jumlah karakter maksimum.
	 * @param {string} [msg]
	 * @returns {Rule}
	 */
	static maxLength(n, msg = `Maksimal ${n} karakter.`) {
		const batas = Number.isFinite(n) ? n : PANJANG_TAK_TERBATAS;
		return new Rule('maxLength', msg, (value) => panjangTeks(value) <= batas);
	}

	/**
	 * Bentuk alamat surel.
	 * @param {string} [msg]
	 * @returns {Rule}
	 */
	static email(msg = 'Format alamat email belum benar.') {
		return new Rule('email', msg, (value) => POLA_EMAIL.test(String(value).trim()));
	}

	/**
	 * Bentuk nomor ponsel Indonesia.
	 * @param {string} [msg]
	 * @returns {Rule}
	 */
	static phone(msg = 'Format nomor ponsel belum benar. Contoh: 081234567890.') {
		return new Rule('phone', msg, (value) =>
			POLA_TELEPON.test(String(value).replace(/[\s.-]/g, ''))
		);
	}

	/**
	 * Nilai dapat ditafsirkan sebagai tanggal.
	 * @param {string} [msg]
	 * @returns {Rule}
	 */
	static date(msg = 'Tanggal belum diisi dengan benar.') {
		return new Rule('date', msg, (value) => {
			const tanggal = value instanceof Date ? value : new Date(/** @type {any} */ (value));
			return !Number.isNaN(tanggal.getTime());
		});
	}

	/**
	 * Nilai numerik minimum.
	 * @param {number} n
	 * @param {string} [msg]
	 * @returns {Rule}
	 */
	static min(n, msg = `Nilai minimal ${n}.`) {
		return new Rule('min', msg, (value) => {
			const angka = keAngka(value);
			return !Number.isNaN(angka) && angka >= n;
		});
	}

	/**
	 * Nilai numerik maksimum.
	 * @param {number} n
	 * @param {string} [msg]
	 * @returns {Rule}
	 */
	static max(n, msg = `Nilai maksimal ${n}.`) {
		return new Rule('max', msg, (value) => {
			const angka = keAngka(value);
			return !Number.isNaN(angka) && angka <= n;
		});
	}

	/**
	 * Nilai cocok dengan sebuah pola.
	 *
	 * Bendera `g` dan `y` dibuang saat aturan dibentuk: keduanya membuat `test()`
	 * menyimpan posisi terakhir, sehingga aturan yang sama mengembalikan hasil
	 * berbeda pada pemanggilan kedua untuk masukan yang sama persis.
	 *
	 * @param {RegExp} re Pola yang harus cocok.
	 * @param {string} [msg]
	 * @returns {Rule}
	 */
	static pattern(re, msg = 'Format isian belum sesuai.') {
		const pola = new RegExp(re.source, re.flags.replace(/[gy]/g, ''));
		return new Rule('pattern', msg, (value) => pola.test(String(value)));
	}

	/**
	 * Aturan buatan sendiri untuk syarat yang tidak umum.
	 *
	 * Nama selain `'required'` tetap mengikuti konvensi lolos-bila-kosong. Aturan
	 * kustom yang harus menolak kekosongan dipasangkan dengan `Rule.required()`,
	 * bukan dinamai `'required'`.
	 *
	 * @param {string} name Nama aturan, dipakai saat menelusuri kegagalan.
	 * @param {string} msg Pesan Bahasa Indonesia.
	 * @param {(value: unknown) => boolean} test
	 * @returns {Rule}
	 */
	static custom(name, msg, test) {
		return new Rule(name, msg, test);
	}
}

/**
 * @typedef {object} ValidationResult
 * @property {boolean} valid Seluruh field lolos.
 * @property {Record<string, string>} errors Pesan galat pertama per field yang gagal.
 */

export class Validator {
	/** @type {Readonly<Record<string, readonly Rule[]>>} */
	#schema;

	/**
	 * @param {Record<string, readonly Rule[]>} schema Peta nama field → daftar aturan.
	 * @throws {TypeError} bila skema bukan objek atau memuat entri yang bukan Rule.
	 */
	constructor(schema) {
		if (schema === null || typeof schema !== 'object') {
			throw new TypeError('Validator membutuhkan skema berupa objek field → daftar Rule.');
		}
		for (const [field, rules] of Object.entries(schema)) {
			if (!Array.isArray(rules) || rules.some((rule) => !(rule instanceof Rule))) {
				throw new TypeError(`Skema field "${field}" harus berupa array Rule.`);
			}
		}
		this.#schema = Object.freeze({ ...schema });
	}

	/**
	 * Memeriksa seluruh field pada skema.
	 *
	 * Field yang tidak ada di skema diabaikan — formulir kerap membawa nilai
	 * pendamping (mis. penanda langkah wizard) yang tidak perlu divalidasi.
	 *
	 * @param {Record<string, unknown>} values Nilai formulir.
	 * @returns {ValidationResult}
	 */
	validate(values) {
		const nilai = values ?? {};
		/** @type {Record<string, string>} */
		const errors = {};
		for (const field of Object.keys(this.#schema)) {
			const pesan = this.validateField(field, nilai[field]);
			if (pesan !== '') errors[field] = pesan;
		}
		return { valid: Object.keys(errors).length === 0, errors };
	}

	/**
	 * Memeriksa satu field.
	 *
	 * Mengembalikan pesan aturan PERTAMA yang gagal, bukan seluruhnya: memberi
	 * pengguna satu perbaikan konkret lebih menolong daripada menumpuk tiga
	 * kalimat galat di bawah satu kotak isian.
	 *
	 * @param {string} field Nama field pada skema.
	 * @param {unknown} value Nilai yang diperiksa.
	 * @returns {string} `''` bila lolos atau field tidak ada di skema.
	 */
	validateField(field, value) {
		const rules = this.#schema[field];
		if (!rules) return '';
		for (const rule of rules) {
			if (!rule.check(value)) return rule.message;
		}
		return '';
	}
}

/**
 * Menggabungkan beberapa hasil validasi menjadi satu.
 *
 * Dipakai formulir bertahap: tiap langkah punya `Validator` sendiri, dan tombol
 * kirim di langkah terakhir perlu satu jawaban atas seluruh langkah. Bila dua
 * hasil memuat field yang sama, pesan PERTAMA yang dipertahankan — hasil yang
 * lebih dekat dengan konteks pengisian biasanya diperiksa lebih dulu.
 *
 * @param {...ValidationResult} results
 * @returns {ValidationResult}
 */
export function mergeResults(...results) {
	/** @type {Record<string, string>} */
	const errors = {};
	for (const hasil of results) {
		if (!hasil || typeof hasil !== 'object') continue;
		for (const [field, pesan] of Object.entries(hasil.errors ?? {})) {
			if (!Object.hasOwn(errors, field) && pesan !== '') errors[field] = pesan;
		}
	}
	return { valid: Object.keys(errors).length === 0, errors };
}
