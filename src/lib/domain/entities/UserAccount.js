/**
 * ENTITY — Akun Pengguna.
 *
 * Tanggung jawab: memegang identitas LOGIN — surel, hash kata sandi, peran, status
 * akun — dan menjawab "akun ini boleh apa" dengan membaca matriks kewenangan.
 *
 * Mengapa akun terpisah dari `Awardee`, bukan sekadar menambah field `role` pada
 * penerima manfaat:
 *
 * 1. **Invarian `Awardee` mustahil dipenuhi akun staf.** `community`, `chapterId`,
 *    dan `joinedAt` wajib terisi dan tervalidasi. Verifikator dan Admin tidak punya
 *    komunitas, chapter, maupun tanggal bergabung sebagai penerima manfaat.
 * 2. **Tiga perhitungan langsung salah** bila staf menjadi baris `Awardee`:
 *    cakupan KPI memakai cacah awardee sebagai penyebut, papan peringkat menyaring
 *    hanya lewat `visibleOnLeaderboard`, dan distribusi tier akan menghitung staf
 *    sebagai tier terendah.
 * 3. Menambal ketiganya dengan filter peran akan menyebarkan pengetahuan peran ke
 *    tiga tempat berbeda — persis yang hendak dicegah oleh pemisahan ini.
 *
 * Relasi final: `UserAccount 1..0/1 Awardee`. Hanya akun berperan AWARDEE yang
 * menunjuk seorang awardee; peran lain wajib `awardeeId === null`, dan invarian
 * itulah yang membuat pemeriksaan konflik kepentingan pada jalur cerita bermakna.
 *
 * @see docs/12-BUILD-CONTRACT-V2.md — §2.4 kontrak export dan daftar invarian
 * @see docs/10-REVISION-SPEC.md — §2.4 mengapa UserAccount terpisah dari Awardee
 */

import { bolehkan, peranPengguna, USER_ROLE_META, UserRole } from '../constants/roles.js';
import { PasswordHash } from '../value-objects/PasswordHash.js';

/**
 * Status akun. Terpisah dari status keanggotaan (`AWARDEE_STATUS`) dengan sengaja:
 * seorang awardee dapat berstatus DORMAN sebagai penerima manfaat sementara akunnya
 * tetap AKTIF, dan sebaliknya akun dapat dikunci tanpa mengubah keanggotaannya.
 * @readonly
 * @enum {string}
 */
export const AccountStatus = Object.freeze({
	AKTIF: 'AKTIF',
	TERKUNCI: 'TERKUNCI',
	NONAKTIF: 'NONAKTIF'
});

/**
 * Metadata tampilan tiap status akun.
 * @type {Readonly<Record<string, {code: string, label: string, badgeColor: string, deskripsi: string}>>}
 */
export const ACCOUNT_STATUS_META = Object.freeze({
	[AccountStatus.AKTIF]: Object.freeze({
		code: AccountStatus.AKTIF,
		label: 'Aktif',
		badgeColor: 'green',
		deskripsi: 'Akun dapat masuk dan memakai seluruh kewenangan perannya.'
	}),
	[AccountStatus.TERKUNCI]: Object.freeze({
		code: AccountStatus.TERKUNCI,
		label: 'Terkunci',
		badgeColor: 'amber',
		deskripsi: 'Akses dihentikan sementara karena temuan yang sedang ditinjau.'
	}),
	[AccountStatus.NONAKTIF]: Object.freeze({
		code: AccountStatus.NONAKTIF,
		label: 'Nonaktif',
		badgeColor: 'slate',
		deskripsi: 'Dinonaktifkan pengelola program; akun tidak dapat masuk.'
	})
});

/**
 * @typedef {object} UserAccountInput
 * @property {string} id                  Identitas akun, mis. 'USR-014' atau 'PF-CORSEC-01'.
 * @property {string} email               Unik; disimpan dalam huruf kecil tanpa spasi tepi.
 * @property {string|PasswordHash} passwordHash
 * @property {string} role                Salah satu UserRole.
 * @property {string|null} [awardeeId]    Wajib terisi bila AWARDEE, wajib null selain itu.
 * @property {string} displayName         Nama yang ditampilkan antarmuka.
 * @property {string} [unit]              Unit kerja; diisi untuk VERIFIER dan ADMIN.
 * @property {string} [status]            Salah satu AccountStatus; default AKTIF.
 * @property {Date|string} createdAt
 * @property {Date|string|null} [lastLoginAt]
 */

/**
 * Menormalkan tanggal wajib.
 * @param {Date|string} nilai
 * @param {string} namaField
 * @returns {Date}
 * @throws {TypeError} bila tanggal tidak sah.
 */
function keTanggal(nilai, namaField) {
	const tanggal = nilai instanceof Date ? new Date(nilai.getTime()) : new Date(nilai ?? NaN);
	if (Number.isNaN(tanggal.getTime())) {
		throw new TypeError(`Field "${namaField}" harus berupa Date atau string ISO 8601 yang sah.`);
	}
	return tanggal;
}

/**
 * Menormalkan tanggal opsional.
 * @param {Date|string|null|undefined} nilai
 * @param {string} namaField
 * @returns {Date|null}
 */
function keTanggalOpsional(nilai, namaField) {
	if (nilai === null || nilai === undefined) return null;
	return keTanggal(nilai, namaField);
}

export class UserAccount {
	/** @type {Readonly<Record<string, any>>} */
	#data;

	/**
	 * @param {UserAccountInput} input Objek polos, umumnya berasal dari repository.
	 * @throws {TypeError} bila peran tidak dikenal, surel tidak sah, invarian
	 *   `awardeeId` dilanggar, atau `createdAt` bukan tanggal yang sah.
	 * @throws {RangeError} bila status akun tidak dikenal.
	 */
	constructor(input) {
		const {
			id,
			email,
			passwordHash,
			role,
			awardeeId = null,
			displayName,
			unit = '',
			status = AccountStatus.AKTIF,
			createdAt,
			lastLoginAt = null
		} = input ?? {};

		for (const [nama, nilai] of Object.entries({ id, displayName })) {
			if (typeof nilai !== 'string' || nilai.trim() === '') {
				throw new TypeError(`Field "${nama}" wajib berupa string tidak kosong.`);
			}
		}
		if (!Object.hasOwn(USER_ROLE_META, role)) {
			throw new TypeError(
				`Peran tidak dikenal: "${role}". Peran yang sah: ${Object.keys(USER_ROLE_META).join(', ')}`
			);
		}

		// Surel dinormalkan sebelum diperiksa supaya ' Rani@PF.id ' dan 'rani@pf.id'
		// tidak pernah menjadi dua akun berbeda pada indeks unik `&email`.
		const surel = typeof email === 'string' ? email.trim().toLowerCase() : '';
		if (surel === '' || !surel.includes('@')) {
			throw new TypeError(`Surel akun "${id}" tidak sah: "${email}".`);
		}

		const idAwardee = awardeeId === undefined ? null : awardeeId;
		if (role === UserRole.AWARDEE) {
			if (typeof idAwardee !== 'string' || idAwardee.trim() === '') {
				throw new TypeError(`Akun berperan AWARDEE ("${id}") wajib menunjuk awardeeId.`);
			}
		} else if (idAwardee !== null && idAwardee !== '') {
			throw new TypeError(
				`Akun berperan ${role} ("${id}") wajib ber-awardeeId null; diterima: "${idAwardee}".`
			);
		}

		if (!Object.hasOwn(ACCOUNT_STATUS_META, status)) {
			throw new RangeError(`Status akun tidak dikenal: "${status}".`);
		}

		this.#data = Object.freeze({
			id,
			email: surel,
			passwordHash:
				passwordHash instanceof PasswordHash
					? passwordHash
					: PasswordHash.fromStored(/** @type {string} */ (passwordHash)),
			role,
			awardeeId: role === UserRole.AWARDEE ? idAwardee : null,
			displayName,
			unit,
			status,
			createdAt: keTanggal(createdAt, 'createdAt'),
			lastLoginAt: keTanggalOpsional(lastLoginAt, 'lastLoginAt')
		});
		Object.freeze(this);
	}

	/** @returns {string} */
	get id() {
		return this.#data.id;
	}

	/** @returns {string} Surel dalam huruf kecil tanpa spasi tepi. */
	get email() {
		return this.#data.email;
	}

	/** @returns {PasswordHash} */
	get passwordHash() {
		return this.#data.passwordHash;
	}

	/** @returns {string} Salah satu UserRole. */
	get role() {
		return this.#data.role;
	}

	/** @returns {string|null} Id awardee yang ditunjuk; null untuk peran selain AWARDEE. */
	get awardeeId() {
		return this.#data.awardeeId;
	}

	/** @returns {string} */
	get displayName() {
		return this.#data.displayName;
	}

	/** @returns {string} Unit kerja; kosong untuk akun awardee. */
	get unit() {
		return this.#data.unit;
	}

	/** @returns {string} Salah satu AccountStatus. */
	get status() {
		return this.#data.status;
	}

	/** @returns {Date} */
	get createdAt() {
		return new Date(this.#data.createdAt.getTime());
	}

	/** @returns {Date|null} */
	get lastLoginAt() {
		return this.#data.lastLoginAt === null ? null : new Date(this.#data.lastLoginAt.getTime());
	}

	/** @returns {boolean} */
	get isAwardee() {
		return this.#data.role === UserRole.AWARDEE;
	}

	/** @returns {boolean} */
	get isVerifier() {
		return this.#data.role === UserRole.VERIFIER;
	}

	/** @returns {boolean} */
	get isAdmin() {
		return this.#data.role === UserRole.ADMIN;
	}

	/** @returns {boolean} Apakah akun boleh masuk dan bertindak. */
	get isActive() {
		return this.#data.status === AccountStatus.AKTIF;
	}

	/**
	 * Inisial untuk avatar, dibatasi dua huruf agar tetap terbaca pada ukuran kecil.
	 * @returns {string} mis. 'RA' untuk 'Rani Ayu Pertiwi'.
	 */
	get initials() {
		const kata = this.#data.displayName.trim().split(/\s+/);
		const dipakai = kata.length === 1 ? [kata[0]] : [kata[0], kata[kata.length - 1]];
		return dipakai.map((k) => k.charAt(0).toUpperCase()).join('');
	}

	/** @returns {import('../constants/roles.js').UserRoleDef} */
	get roleMeta() {
		return /** @type {import('../constants/roles.js').UserRoleDef} */ (
			peranPengguna(this.#data.role)
		);
	}

	/** @returns {string} Label peran Bahasa Indonesia, mis. 'Verifikator'. */
	get roleLabel() {
		return this.roleMeta.label;
	}

	/** @returns {string} Beranda peran, mis. '/verifikator'. */
	get homePath() {
		return this.roleMeta.homePath;
	}

	/**
	 * Apakah akun memegang sebuah kapabilitas.
	 *
	 * Akun yang tidak aktif kehilangan seluruh kapabilitasnya — penonaktifan yang
	 * hanya menghalangi login, tetapi membiarkan sesi lama tetap berwenang, bukan
	 * penonaktifan.
	 *
	 * @param {string} permission Salah satu RolePermission.
	 * @returns {boolean}
	 */
	can(permission) {
		if (!this.isActive) return false;
		return bolehkan(this.#data.role, permission);
	}

	/**
	 * Apakah kata sandi polos cocok. Sinkron — lihat peringatan `PasswordHash.js`.
	 * @param {string} plain
	 * @returns {boolean}
	 */
	matchesPassword(plain) {
		return this.#data.passwordHash.matches(plain);
	}

	/**
	 * Salinan dengan sebagian field diganti. Entitas ini immutable, sehingga setiap
	 * perubahan menghasilkan instans baru yang divalidasi ulang oleh konstruktor.
	 * @param {Partial<UserAccountInput>} changes
	 * @returns {UserAccount}
	 */
	withChanges(changes) {
		return new UserAccount({
			.../** @type {UserAccountInput} */ (this.toJSON()),
			...changes
		});
	}

	/**
	 * Bentuk yang disimpan ke basis data. `passwordHash` turun menjadi string agar
	 * baris tetap dapat diserialkan struktur klon IndexedDB.
	 * @returns {Record<string, unknown>}
	 */
	toJSON() {
		return {
			id: this.id,
			email: this.email,
			passwordHash: this.passwordHash.value,
			role: this.role,
			awardeeId: this.awardeeId,
			displayName: this.displayName,
			unit: this.unit,
			status: this.status,
			createdAt: this.createdAt.toISOString(),
			lastLoginAt: this.lastLoginAt?.toISOString() ?? null
		};
	}

	/**
	 * Menerima instans apa adanya, atau membungkus baris polos dari repository.
	 * @param {UserAccount|UserAccountInput} row
	 * @returns {UserAccount}
	 */
	static from(row) {
		return row instanceof UserAccount ? row : new UserAccount(row);
	}
}
