/**
 * REPOSITORY — Akun Pengguna.
 *
 * Tanggung jawab: akses tabel `accounts` untuk autentikasi, penjagaan zona, dan
 * panel kredensial demo pada halaman masuk.
 *
 * Dua hal yang dijaga di sini:
 *
 * 1. **Surel selalu dinormalkan sebelum dicari.** Indeks `&email` bersifat unik dan
 *    menyimpan bentuk huruf kecil tanpa spasi tepi; kueri yang tidak dinormalkan
 *    akan mengembalikan `null` untuk kredensial yang sebenarnya benar — kegagalan
 *    login yang paling sulit dipercaya penggunanya karena ia yakin sudah mengetik
 *    dengan benar.
 * 2. **`demoAccounts()` tidak pernah mengembalikan kata sandi maupun hash.** Panel
 *    bantuan `/masuk` hanya menerima surel, label peran, nama, dan satu kalimat
 *    penjelasan. Nilai sandinya sendiri hidup satu kali sebagai `SANDI_DEMO` di
 *    `seed/accounts.js`; menyalinnya ke komponen akan melahirkan sumber kebenaran
 *    kedua yang diam-diam basi begitu sandi diubah di satu sisi saja.
 *
 * @see src/lib/domain/entities/UserAccount.js — entity yang dipetakan
 * @see docs/12-BUILD-CONTRACT-V2.md — §2.11 kontrak export AccountRepository, R-17
 */

import { UserAccount } from '$lib/domain/entities/UserAccount.js';
import { UserRole } from '$lib/domain/constants/roles.js';
import { getDb, TABLE } from '../db.js';
import { DexieRepository } from './DexieRepository.js';
import { akunSorotan } from '../seed/accounts.js';

/**
 * Penjelasan singkat tiap peran pada panel bantuan `/masuk`.
 *
 * Kalimatnya menyebut APA YANG DAPAT DILIHAT setelah masuk, bukan mengulang nama
 * perannya. Panel yang hanya menuliskan "Verifikator" tidak menolong siapa pun
 * memilih akun mana yang perlu dibuka lebih dulu saat peragaan.
 *
 * Kalimat ini dirender di `/masuk`, yang berada di ZONA PUBLIK. Karena itu ia
 * tunduk pada PO-2: dilarang menyebut poin, jenjang, papan peringkat, maupun
 * lencana. Larangan itu berlaku pada teks yang sampai ke layar, bukan pada letak
 * berkasnya — `scripts/verify/public-purity.mjs` hanya memindai
 * `src/routes/(public)/**`, sehingga kalimat yang masuk dari lapisan repository
 * seperti ini tidak akan tertangkap olehnya dan harus dijaga di sini.
 * @type {Readonly<Record<string, string>>}
 */
const PETUNJUK_PERAN = Object.freeze({
	[UserRole.AWARDEE]:
		'Zona awardee: pusat aksi, agenda komunitas, penghargaan, dan ruang cerita pribadi.',
	[UserRole.VERIFIER]:
		'Zona verifikator: antrean tinjauan cerita, usulan kegiatan, dan pemantauan SLA.',
	[UserRole.ADMIN]:
		'Zona admin: dasbor KPI program, agregat dampak, consent, dan ekspor data.'
});

export class AccountRepository extends DexieRepository {
	constructor() {
		super({
			tableName: TABLE.ACCOUNTS,
			entity: UserAccount,
			indexedFields: ['email', 'role', 'awardeeId', 'status']
		});
	}

	/**
	 * Akun berdasarkan surel.
	 * @param {string} email Boleh mengandung huruf besar dan spasi tepi.
	 * @returns {Promise<UserAccount|null>} `null` bila tidak ada.
	 */
	async byEmail(email) {
		const surel = typeof email === 'string' ? email.trim().toLowerCase() : '';
		if (surel === '') return null;
		const hasil = await this.query({ email: surel });
		return hasil[0] ?? null;
	}

	/**
	 * Akun milik seorang awardee.
	 *
	 * Relasinya satu lawan satu: hanya akun berperan AWARDEE yang menunjuk awardee,
	 * dan setiap awardee ter-seed punya tepat satu akun.
	 *
	 * @param {string} awardeeId
	 * @returns {Promise<UserAccount|null>} `null` bila tidak ada.
	 */
	async byAwardeeId(awardeeId) {
		if (typeof awardeeId !== 'string' || awardeeId.trim() === '') return null;
		const hasil = await this.query({ awardeeId });
		return hasil[0] ?? null;
	}

	/**
	 * Seluruh akun berperan tertentu, terurut id menaik.
	 * @param {string} role Salah satu UserRole.
	 * @returns {Promise<UserAccount[]>}
	 */
	async byRole(role) {
		const akun = await this.query({ role });
		return akun.sort((a, b) => a.id.localeCompare(b.id));
	}

	/**
	 * Kredensial demo untuk panel bantuan `/masuk` — TANPA hash, TANPA kata sandi.
	 *
	 * Satu baris per peran yang perlu diperagakan: satu awardee sorotan, seluruh
	 * verifikator (dua, supaya larangan meninjau usulan sendiri dapat ditunjukkan),
	 * dan satu admin. Enam puluh akun awardee tidak pernah dipajang — panel bantuan
	 * yang memuat seluruh daftar berhenti menjadi bantuan.
	 *
	 * Awardee sorotan dipilih lewat `akunSorotan()` dari `seed/accounts.js`, bukan
	 * dengan aturan tandingan di berkas ini: dua tempat yang sama-sama memutuskan
	 * "akun mana yang dipajang" akan menyimpang begitu salah satunya diperbaiki.
	 *
	 * @returns {Promise<{email: string, roleLabel: string, displayName: string, hint: string}[]>}
	 */
	async demoAccounts() {
		const akun = await this.getAll();
		if (akun.length === 0) return [];

		const database = await getDb();
		const barisAwardee = database ? await database.table(TABLE.AWARDEES).toArray() : [];
		const sorotan = akunSorotan(barisAwardee);

		// Cadangan id menaik dipakai bila tabel awardee belum terisi saat panel dibuka;
		// panel bantuan tanpa satu pun contoh akun awardee lebih buruk daripada panel
		// yang menunjuk akun awardee yang bukan pemuncak papan peringkat.
		const awardee =
			akun.find((baris) => baris.isAwardee && baris.email === sorotan.email) ??
			akun.filter((baris) => baris.isAwardee).sort((a, b) => a.id.localeCompare(b.id))[0];

		const terpilih = [
			...(awardee ? [awardee] : []),
			...akun.filter((baris) => baris.isVerifier).sort((a, b) => a.id.localeCompare(b.id)),
			...akun.filter((baris) => baris.isAdmin).sort((a, b) => a.id.localeCompare(b.id))
		];

		return terpilih.map((baris) => ({
			email: baris.email,
			roleLabel: baris.roleLabel,
			displayName: baris.displayName,
			hint: PETUNJUK_PERAN[baris.role] ?? ''
		}));
	}
}

/** Instans tunggal yang dipakai seluruh aplikasi. */
export const accountRepository = new AccountRepository();
