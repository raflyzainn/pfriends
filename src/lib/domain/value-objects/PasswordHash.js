/**
 * VALUE OBJECT — Hash kata sandi MOCK (FNV-1a 32-bit bergaram).
 *
 * ============================ PERINGATAN JUJUR ============================
 * INI BUKAN MEKANISME KEAMANAN. FNV-1a adalah fungsi hash NON-KRIPTOGRAFIS
 * berkeluaran 32 bit: ia cepat, tanpa peregangan kunci, dan dapat dibalik dengan
 * pencarian kasar dalam hitungan detik. Garam di sini hanya mencegah dua akun
 * berkata sandi sama menghasilkan nilai identik — bukan melindungi apa pun.
 * Jangan pernah menaruh kata sandi sungguhan pada mekanisme ini.
 *
 * Alasan ia tetap dipakai pada mockup: `buildSeed()` bersifat SINKRON dan wajib
 * berjalan di `node` polos untuk skrip verifikasi, sedangkan `crypto.subtle`
 * bersifat asinkron dan hanya tersedia di peramban. Menjadikan seed asinkron demi
 * hash yang tetap saja tiruan adalah pertukaran yang buruk.
 *
 * PENGGANTINYA SAAT BACKEND NYATA DIPASANG: verifikasi kata sandi pindah
 * SELURUHNYA ke sisi server dengan Argon2id (atau bcrypt/scrypt bila Argon2 tidak
 * tersedia), kata sandi tidak pernah menyeberang ke peramban dalam bentuk apa pun,
 * dan kelas ini dihapus bersama seluruh pemanggilnya. Yang tersisa di klien
 * hanyalah token sesi yang diterbitkan server.
 * =========================================================================
 *
 * @see docs/12-BUILD-CONTRACT-V2.md — §2.3 kontrak export, §5.6 S-3 determinisme seed
 */

/** Penanda algoritma pada nilai tersimpan. Ikut disimpan agar migrasi kelak dapat mengenali baris lama. */
export const HASH_PREFIX = 'fnv1a';

/** Basis offset FNV-1a 32-bit (konstanta algoritma, bukan parameter produk). */
const FNV_OFFSET_BASIS = 2166136261;

/** Bilangan prima FNV 32-bit (konstanta algoritma). */
const FNV_PRIME = 16777619;

/** Panjang keluaran heksadesimal 32 bit. */
const PANJANG_HEX = 8;

/**
 * FNV-1a 32-bit atas sebuah string, dikembalikan sebagai heksadesimal 8 digit.
 *
 * `Math.imul` dipakai agar perkalian tetap 32-bit — perkalian biasa akan melewati
 * batas presisi bilangan JavaScript dan menghasilkan nilai yang berbeda antar
 * mesin, sehingga seed berhenti deterministik.
 *
 * @param {string} teks
 * @returns {string} Delapan digit heksadesimal huruf kecil.
 */
function fnv1a(teks) {
	let hash = FNV_OFFSET_BASIS;
	for (let i = 0; i < teks.length; i += 1) {
		hash ^= teks.charCodeAt(i);
		hash = Math.imul(hash, FNV_PRIME);
	}
	return (hash >>> 0).toString(16).padStart(PANJANG_HEX, '0');
}

export class PasswordHash {
	/** @type {string} */
	#salt;
	/** @type {string} */
	#digest;

	/**
	 * Konstruktor privat secara konvensi — pakai `PasswordHash.of()` atau
	 * `PasswordHash.fromStored()`. Keduanya menjamin bentuk nilai yang sah.
	 *
	 * @param {string} salt   Garam; dilarang memuat titik dua karena ia pemisah format.
	 * @param {string} digest Delapan digit heksadesimal.
	 * @throws {TypeError} bila garam atau digest tidak berbentuk sah.
	 */
	constructor(salt, digest) {
		if (typeof salt !== 'string' || salt.includes(':')) {
			throw new TypeError('Garam kata sandi wajib berupa string tanpa karakter ":".');
		}
		if (typeof digest !== 'string' || !new RegExp(`^[0-9a-f]{${PANJANG_HEX}}$`).test(digest)) {
			throw new TypeError(`Digest wajib berupa ${PANJANG_HEX} digit heksadesimal huruf kecil.`);
		}
		this.#salt = salt;
		this.#digest = digest;
		Object.freeze(this);
	}

	/**
	 * Membentuk hash dari kata sandi polos.
	 *
	 * @param {string} plain Kata sandi polos.
	 * @param {string} [salt] Garam; pada proyek ini selalu id akun.
	 * @returns {PasswordHash}
	 * @throws {TypeError} bila kata sandi bukan string.
	 */
	static of(plain, salt = '') {
		if (typeof plain !== 'string') {
			throw new TypeError('Kata sandi wajib berupa string.');
		}
		return new PasswordHash(salt, fnv1a(`${salt}:${plain}`));
	}

	/**
	 * Membaca kembali nilai yang tersimpan di basis data.
	 *
	 * @param {string} stored Format `'fnv1a:<salt>:<hex8>'`.
	 * @returns {PasswordHash}
	 * @throws {TypeError} bila format salah — baris yang rusak harus terlihat saat
	 *   dibaca, bukan menjadi akun yang diam-diam tidak dapat masuk.
	 */
	static fromStored(stored) {
		if (typeof stored !== 'string') {
			throw new TypeError('Nilai hash tersimpan wajib berupa string.');
		}
		const bagian = stored.split(':');
		if (bagian.length !== 3 || bagian[0] !== HASH_PREFIX) {
			throw new TypeError(
				`Nilai hash tersimpan tidak sah: "${stored}". Format wajib '${HASH_PREFIX}:<salt>:<hex${PANJANG_HEX}>'.`
			);
		}
		return new PasswordHash(bagian[1], bagian[2]);
	}

	/** @returns {string} Nilai lengkap yang disimpan, `'fnv1a:<salt>:<hex8>'`. */
	get value() {
		return `${HASH_PREFIX}:${this.#salt}:${this.#digest}`;
	}

	/** @returns {string} Garam yang dipakai. */
	get salt() {
		return this.#salt;
	}

	/**
	 * Apakah sebuah kata sandi polos cocok. Sinkron — lihat peringatan berkas.
	 * @param {string} plain
	 * @returns {boolean}
	 */
	matches(plain) {
		if (typeof plain !== 'string') return false;
		return PasswordHash.of(plain, this.#salt).value === this.value;
	}

	/**
	 * Kesetaraan nilai, bukan identitas objek.
	 * @param {PasswordHash|null|undefined} other
	 * @returns {boolean}
	 */
	equals(other) {
		return other instanceof PasswordHash && other.value === this.value;
	}

	/** @returns {string} */
	toString() {
		return this.value;
	}

	/** @returns {string} Bentuk yang disimpan ke basis data. */
	toJSON() {
		return this.value;
	}
}
