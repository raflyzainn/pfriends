/**
 * IMPLEMENTASI DASAR REPOSITORY DI ATAS DEXIE.
 *
 * Tanggung jawab: menerjemahkan kontrak `Repository` (WP-2) menjadi operasi Dexie,
 * dan memetakan baris mentah basis data menjadi instans entity.
 *
 * Kelas ini ada supaya tujuh repository konkret tidak menyalin plumbing yang sama
 * tujuh kali. Yang berbeda antar-repository hanyalah tiga hal — nama tabel, kelas
 * entity, dan nama kolom kunci — sehingga ketiganya diangkat menjadi parameter
 * konstruktor dan sisanya diwarisi.
 *
 * Dua perilaku yang perlu diketahui pemanggil:
 *
 * 1. **Aman di server.** Saat prerender, `getDb()` mengembalikan `null`. Repository
 *    lalu mengembalikan koleksi kosong, bukan melempar. Halaman yang diprerender
 *    tetap terbentuk dengan empty state yang layak, dan terisi setelah hidrasi.
 * 2. **Kriteria tak dikenal diabaikan.** Sesuai butir 3 catatan kontrak Repository,
 *    `query({ tidakDikenal: 1 })` mengembalikan seluruh data, bukan melempar —
 *    supaya penambahan kriteria baru di masa depan tidak memecah repository lama.
 *
 * @see src/lib/domain/repositories/Repository.js — kontrak yang diimplementasikan
 * @see docs/09-BUILD-CONTRACT.md — K-1 (tanpa mapper, tanpa DI container)
 */

import { Repository } from '$lib/domain/repositories/Repository.js';
import { getDb } from '../db.js';

/**
 * @typedef {object} EntityFactory
 * @property {(value: any) => any} from Membungkus baris polos menjadi entity.
 */

export class DexieRepository extends Repository {
	/** @type {string} */
	#tableName;
	/** @type {EntityFactory|null} */
	#entity;
	/** @type {string} */
	#keyPath;
	/** @type {readonly string[]} */
	#indexedFields;

	/**
	 * @param {object} config
	 * @param {string} config.tableName Nama tabel pada skema `db.js`.
	 * @param {EntityFactory|null} config.entity Kelas entity ber-`from()`; `null` untuk baris polos.
	 * @param {string} [config.keyPath] Nama kolom kunci primer; default `'id'`.
	 * @param {readonly string[]} [config.indexedFields] Field yang punya indeks Dexie —
	 *   dipakai `query()` untuk memilih jalur kueri tercepat.
	 * @throws {TypeError} bila nama tabel kosong.
	 */
	constructor({ tableName, entity, keyPath = 'id', indexedFields = [] }) {
		super();
		if (typeof tableName !== 'string' || tableName.trim() === '') {
			throw new TypeError('DexieRepository membutuhkan tableName.');
		}
		this.#tableName = tableName;
		this.#entity = entity ?? null;
		this.#keyPath = keyPath;
		this.#indexedFields = Object.freeze([...indexedFields]);
	}

	/** @returns {string} Nama tabel yang dikelola repository ini. */
	get tableName() {
		return this.#tableName;
	}

	/** @returns {string} Nama kolom kunci primer. */
	get keyPath() {
		return this.#keyPath;
	}

	/**
	 * Tabel Dexie, atau `null` bila dijalankan di server.
	 * @protected
	 * @returns {Promise<import('dexie').Table|null>}
	 */
	async table() {
		const database = await getDb();
		return database ? database.table(this.#tableName) : null;
	}

	/**
	 * Membungkus satu baris menjadi entity.
	 * @protected
	 * @param {any} row
	 * @returns {any}
	 */
	toEntity(row) {
		return this.#entity ? this.#entity.from(row) : row;
	}

	/**
	 * Membungkus sederet baris menjadi entity.
	 * @protected
	 * @param {readonly any[]} rows
	 * @returns {any[]}
	 */
	toEntities(rows) {
		return rows.map((row) => this.toEntity(row));
	}

	/**
	 * Bentuk yang layak disimpan Dexie. Entity dibekukan dan memakai field privat,
	 * sehingga wajib melewati `toJSON()` sebelum masuk IndexedDB — structured clone
	 * tidak dapat menyalin instans kelas beserta field privatnya.
	 * @protected
	 * @param {any} entity
	 * @returns {Record<string, unknown>}
	 */
	toRow(entity) {
		return typeof entity?.toJSON === 'function' ? entity.toJSON() : { ...entity };
	}

	/**
	 * Seluruh entity dalam koleksi ini.
	 * @returns {Promise<any[]>}
	 */
	async getAll() {
		const table = await this.table();
		if (!table) return [];
		return this.toEntities(await table.toArray());
	}

	/**
	 * Satu entity berdasarkan kunci primernya.
	 * @param {string} id
	 * @returns {Promise<any|null>} `null` bila tidak ditemukan.
	 */
	async getById(id) {
		const table = await this.table();
		if (!table) return null;
		const row = await table.get(id);
		return row ? this.toEntity(row) : null;
	}

	/**
	 * Menyimpan entity. Memakai `put` — bukan `add` — supaya penyimpanan bersifat
	 * idempoten: menyimpan ulang entity yang sudah ada memperbaruinya alih-alih
	 * melempar ConstraintError. Seed dan aksi awardee sama-sama mengandalkan ini.
	 * @param {any} entity
	 * @returns {Promise<any>} Entity yang tersimpan.
	 */
	async save(entity) {
		const table = await this.table();
		const tersimpan = this.toEntity(entity);
		if (table) await table.put(this.toRow(tersimpan));
		return tersimpan;
	}

	/**
	 * Menyimpan banyak entity sekaligus. Dipakai proses seed; satu transaksi massal
	 * jauh lebih murah daripada ratusan `put` berurutan.
	 * @param {readonly any[]} entities
	 * @returns {Promise<number>} Jumlah baris yang ditulis.
	 */
	async saveMany(entities) {
		const table = await this.table();
		if (!table || entities.length === 0) return 0;
		await table.bulkPut(entities.map((entity) => this.toRow(this.toEntity(entity))));
		return entities.length;
	}

	/**
	 * Memperbarui entity yang sudah ada.
	 *
	 * Perubahan digabungkan ke bentuk JSON lalu dikonstruksi ulang menjadi entity
	 * sebelum disimpan. Konstruksi ulang itu disengaja: seluruh invarian entity
	 * (mis. "poin musim tidak melebihi total poin") ikut diperiksa, sehingga
	 * pembaruan tidak dapat menyelundupkan keadaan tidak sah ke basis data.
	 *
	 * @param {string} id
	 * @param {Record<string, unknown>} changes
	 * @returns {Promise<any>} Entity setelah pembaruan.
	 * @throws {RangeError} bila entity tidak ditemukan.
	 */
	async update(id, changes) {
		const table = await this.table();
		if (!table) throw new RangeError(`Tabel "${this.#tableName}" tidak tersedia di lingkungan ini.`);
		const row = await table.get(id);
		if (!row) {
			throw new RangeError(`${this.#tableName}: entity dengan kunci "${id}" tidak ditemukan.`);
		}
		const diperbarui = this.toEntity({ ...row, ...changes });
		await table.put(this.toRow(diperbarui));
		return diperbarui;
	}

	/**
	 * Menghapus entity.
	 * @param {string} id
	 * @returns {Promise<void>}
	 */
	async delete(id) {
		const table = await this.table();
		if (!table) return;
		await table.delete(id);
	}

	/**
	 * Pencarian berdasarkan kriteria kesetaraan.
	 *
	 * Satu kriteria terindeks dipakai sebagai jalur kueri Dexie, sisanya disaring di
	 * memori. Pemilahan ini yang membuat `query({ awardeeId })` — kueri terpanas di
	 * sistem, dipanggil setiap kali buku besar poin dibaca — tidak pernah memindai
	 * seluruh tabel.
	 *
	 * Kriteria yang dikenal lapisan domain hari ini: `{ awardeeId }`, `{ status }`,
	 * `{ email }`, `{ role }`, `{ authorId }`, `{ reviewerId }`.
	 *
	 * @param {Record<string, unknown>} [criteria]
	 * @returns {Promise<any[]>}
	 */
	async query(criteria = {}) {
		const table = await this.table();
		if (!table) return [];

		const entries = Object.entries(criteria).filter(([, value]) => value !== undefined);
		if (entries.length === 0) return this.toEntities(await table.toArray());

		const terindeks = entries.find(([key]) => this.#indexedFields.includes(key));
		const rows = terindeks
			? await table.where(terindeks[0]).equals(/** @type {any} */ (terindeks[1])).toArray()
			: await table.toArray();

		const sisa = entries.filter(([key]) => key !== terindeks?.[0]);
		const cocok = rows.filter((row) => sisa.every(([key, value]) => this.#matches(row, key, value)));
		return this.toEntities(cocok);
	}

	/**
	 * Jumlah baris pada koleksi ini.
	 * @returns {Promise<number>}
	 */
	async count() {
		const table = await this.table();
		if (!table) return 0;
		return table.count();
	}

	/**
	 * Mencocokkan satu kriteria terhadap satu baris.
	 *
	 * Field yang tidak dimiliki baris dianggap COCOK, bukan tidak cocok. Ini
	 * penegakan butir 3 kontrak Repository: kriteria yang belum dikenal repository
	 * ini harus diabaikan, bukan menghasilkan daftar kosong yang menyesatkan.
	 *
	 * @param {Record<string, unknown>} row
	 * @param {string} key
	 * @param {unknown} value
	 * @returns {boolean}
	 */
	#matches(row, key, value) {
		if (!Object.hasOwn(row, key)) return true;
		if (Array.isArray(value)) return value.includes(row[key]);
		return row[key] === value;
	}
}
