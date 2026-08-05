/**
 * SERVICE — Autentikasi.
 *
 * Tanggung jawab: memeriksa kredensial, menolak akun yang tidak berhak masuk, dan
 * menyatukan akun dengan entitas awardee-nya menjadi satu jawaban tunggal yang
 * dipakai store sesi.
 *
 * Empat keputusan desain yang tidak terbaca dari kode:
 *
 * 1. **Repository disuntik lewat konstruktor tanpa nilai bawaan.** Memasang
 *    `accountRepository` sebagai default akan menyeret Dexie ke lapisan domain
 *    lewat pintu belakang — dan justru arah ketergantungan itulah yang sedang
 *    dijaga kelas ini. Perakitan terjadi satu tingkat di atas, di store.
 * 2. **Satu pesan untuk surel salah dan sandi salah.** Membedakan keduanya
 *    memberi tahu penyerang bahwa sebuah surel terdaftar. Perbedaan itu tidak
 *    menolong pengguna sah, yang tetap harus mencoba ulang.
 * 3. **Urutan pemeriksaan: kredensial dulu, status akun kemudian.** Menyebut
 *    "akun dinonaktifkan" sebelum sandi terbukti benar akan membocorkan status
 *    akun kepada siapa pun yang menebak surel.
 * 4. **Kelas ini tidak menyentuh basis data selain lewat repository, dan tidak
 *    tahu apa pun tentang penyimpanan sesi.** localStorage, bootstrap basis data,
 *    dan pengalihan halaman adalah urusan store — bukan urusan domain.
 *
 * @see docs/12-BUILD-CONTRACT-V2.md — §2.8 kontrak export, §5.4 arah ketergantungan D-2/D-3
 * @see docs/10-REVISION-SPEC.md — §3.6 aturan penyimpanan sesi
 */

import { Awardee } from '../entities/Awardee.js';
import { UserAccount } from '../entities/UserAccount.js';

/**
 * Sebab kegagalan masuk.
 * @readonly
 * @enum {string}
 */
export const AuthFailure = Object.freeze({
	KREDENSIAL_SALAH: 'KREDENSIAL_SALAH',
	AKUN_NONAKTIF: 'AKUN_NONAKTIF',
	AWARDEE_HILANG: 'AWARDEE_HILANG'
});

/**
 * Pesan Bahasa Indonesia tiap sebab kegagalan.
 *
 * `KREDENSIAL_SALAH` sengaja tidak menyebut mana yang keliru — lihat butir 2 pada
 * catatan berkas.
 * @type {Readonly<Record<string, string>>}
 */
export const AUTH_FAILURE_MESSAGE = Object.freeze({
	[AuthFailure.KREDENSIAL_SALAH]: 'Email atau kata sandi tidak cocok.',
	[AuthFailure.AKUN_NONAKTIF]: 'Akun ini sedang dinonaktifkan. Hubungi Corporate Secretary.',
	[AuthFailure.AWARDEE_HILANG]: 'Data awardee untuk akun ini tidak ditemukan.'
});

/**
 * @typedef {object} LoginResult
 * @property {boolean} ok
 * @property {UserAccount|null} account  Akun yang berhasil masuk.
 * @property {Awardee|null} awardee      Entitas awardee; `null` untuk peran non-AWARDEE.
 * @property {string} reason             Salah satu AuthFailure; `''` bila berhasil.
 */

export class AuthService {
	/** @type {import('../repositories/Repository.js').Repository} */
	#accountRepo;
	/** @type {import('../repositories/Repository.js').Repository} */
	#awardeeRepo;
	/** @type {() => Date} */
	#clock;

	/**
	 * @param {object} deps
	 * @param {import('../repositories/Repository.js').Repository} deps.accountRepo
	 * @param {import('../repositories/Repository.js').Repository} deps.awardeeRepo
	 * @param {() => Date} [deps.clock] Sumber waktu; disuntik agar uji bersifat deterministik.
	 * @throws {TypeError} bila ada repository yang tidak diberikan.
	 */
	constructor({ accountRepo, awardeeRepo, clock } = {}) {
		for (const [nama, repo] of Object.entries({ accountRepo, awardeeRepo })) {
			if (!repo) throw new TypeError(`AuthService membutuhkan ${nama}.`);
		}
		this.#accountRepo = accountRepo;
		this.#awardeeRepo = awardeeRepo;
		this.#clock = clock ?? (() => new Date());
	}

	/**
	 * Memeriksa kredensial dan menyusun bekal sesi.
	 *
	 * Tidak melempar untuk kredensial yang salah: gagal masuk adalah jawaban yang
	 * sah, bukan kegagalan program. Yang melempar hanyalah kesalahan pemrograman
	 * (mis. repository yang tidak memenuhi kontraknya).
	 *
	 * @param {string} email
	 * @param {string} password Kata sandi apa adanya; hash tidak pernah keluar dari repository.
	 * @returns {Promise<LoginResult>}
	 */
	async login(email, password) {
		const account = await this.accountByEmail(email);
		if (account === null || !account.matchesPassword(String(password ?? ''))) {
			return AuthService.#gagal(AuthFailure.KREDENSIAL_SALAH);
		}
		if (!account.isActive) {
			return AuthService.#gagal(AuthFailure.AKUN_NONAKTIF);
		}

		const awardee = await this.awardeeOf(account);
		// Akun awardee tanpa baris awardee adalah keadaan rusak, bukan tamu: seluruh
		// halaman zona awardee membaca entitas ini. Menolak di sini jauh lebih mudah
		// ditelusuri daripada membiarkan halaman pertama melempar karena `null`.
		if (account.isAwardee && awardee === null) {
			return AuthService.#gagal(AuthFailure.AWARDEE_HILANG);
		}

		const tercatat = await this.touchLastLogin(account);
		return { ok: true, account: tercatat, awardee, reason: '' };
	}

	/**
	 * Akun berdasarkan surel.
	 *
	 * Surel dinormalkan lebih dulu — indeks tabel menyimpan bentuk huruf kecil tanpa
	 * spasi tepi, dan kueri yang tidak dinormalkan mengembalikan `null` untuk
	 * kredensial yang sebenarnya benar.
	 *
	 * @param {string} email
	 * @returns {Promise<UserAccount|null>}
	 */
	async accountByEmail(email) {
		const surel = typeof email === 'string' ? email.trim().toLowerCase() : '';
		if (surel === '') return null;
		const hasil = await this.#accountRepo.query({ email: surel });
		const baris = hasil?.[0] ?? null;
		return baris === null ? null : UserAccount.from(baris);
	}

	/**
	 * Entitas awardee milik sebuah akun.
	 *
	 * @param {UserAccount|null} account
	 * @returns {Promise<Awardee|null>} `null` untuk akun verifikator dan admin —
	 *   keduanya bukan penerima manfaat, jadi ketiadaan awardee di sini normal.
	 */
	async awardeeOf(account) {
		const awardeeId = account?.awardeeId ?? null;
		if (typeof awardeeId !== 'string' || awardeeId.trim() === '') return null;
		const baris = await this.#awardeeRepo.getById(awardeeId);
		return baris === null || baris === undefined ? null : Awardee.from(baris);
	}

	/**
	 * Mencatat waktu masuk terakhir dan menyimpannya.
	 *
	 * Mengembalikan akun hasil penyimpanan, bukan akun masukan: entity bersifat
	 * imutabel, sehingga akun lama tidak pernah ikut berubah dan store yang
	 * menyimpan yang lama akan menampilkan waktu masuk yang basi.
	 *
	 * @param {UserAccount} account
	 * @returns {Promise<UserAccount>} Akun sesudah tersimpan.
	 */
	async touchLastLogin(account) {
		const diperbarui = account.withChanges({ lastLoginAt: this.#clock() });
		const tersimpan = await this.#accountRepo.save(diperbarui);
		return tersimpan ? UserAccount.from(tersimpan) : diperbarui;
	}

	/**
	 * Bentuk kegagalan yang seragam.
	 * @param {string} reason Salah satu AuthFailure.
	 * @returns {LoginResult}
	 */
	static #gagal(reason) {
		return { ok: false, account: null, awardee: null, reason };
	}
}
