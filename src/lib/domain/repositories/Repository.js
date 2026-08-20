/**
 * KONTRAK REPOSITORY: abstract base class.
 *
 * Tanggung jawab: menjadi satu-satunya bentuk akses data yang dikenal lapisan
 * domain. Service bergantung pada kelas ini, bukan pada Dexie: inilah wujud
 * konkret Dependency Inversion pada proyek ini (kontrak build K-1).
 *
 * Kelas ini sengaja tidak punya implementasi apa pun. Setiap method melempar
 * `NotImplemented` alih-alih mengembalikan `undefined`, karena repository yang
 * diam-diam mengembalikan `undefined` menghasilkan bug yang muncul jauh dari
 * penyebabnya: dasbor kosong tanpa satu pun pesan error. Gagal keras di titik
 * panggil jauh lebih murah untuk ditelusuri.
 *
 * Kontrak yang WAJIB dipenuhi implementasi konkret (WP-3):
 *
 * 1. `getAll()` dan `getById()` mengembalikan **instans entity**, bukan baris
 *    mentah basis data. Pemetaan baris ke entity adalah tugas infrastruktur;
 *    domain tidak boleh tahu bentuk tabel.
 * 2. `getById()` mengembalikan `null` bila tidak ditemukan: bukan melempar.
 *    "Tidak ada" adalah jawaban yang sah, bukan kegagalan.
 * 3. `query(criteria)` menerima objek kriteria polos dan mengembalikan array.
 *    Kriteria yang dipakai lapisan domain saat ini:
 *     : `{ awardeeId }`    : seluruh entri milik satu awardee (GamificationEngine)
 *     : `{ status }`       : penyaringan berdasarkan status siklus hidup
 *     : `{ email }`        : pencarian akun berdasarkan surel (AuthService)
 *     : `{ role }`         : penyaringan akun berdasarkan peran
 *     : `{ authorId }`     : naskah milik satu penulis (Awardee)
 *     : `{ reviewerId }`   : naskah yang sedang ditangani satu verifikator
 *    Kriteria yang tidak dikenal implementasi harus diabaikan, bukan melempar,
 *    agar penambahan kriteria baru tidak memecah repository lama.
 * 4. Seluruh method bersifat asinkron dan mengembalikan Promise.
 *
 * @see docs/05-ARCHITECTURE.md: §Repository, Dependency Inversion
 * @see docs/09-BUILD-CONTRACT.md: K-1 (satu abstract Repository, tanpa container)
 */

/**
 * Error yang dilempar ketika method abstrak dipanggil tanpa implementasi.
 * Dipisahkan menjadi kelas tersendiri agar pemanggil dapat membedakannya dari
 * kegagalan I/O biasa saat menangani error.
 */
export class NotImplementedError extends Error {
	/**
	 * @param {string} method Nama method yang belum diimplementasikan.
	 */
	constructor(method) {
		super(`NotImplemented: ${method}`);
		this.name = 'NotImplementedError';
		this.method = method;
	}
}

export class Repository {
	/**
	 * @throws {TypeError} bila kelas abstrak ini diinstansiasi langsung.
	 */
	constructor() {
		if (new.target === Repository) {
			throw new TypeError(
				'Repository bersifat abstrak dan tidak dapat diinstansiasi. Turunkan menjadi repository konkret.'
			);
		}
	}

	/**
	 * Seluruh entity dalam koleksi ini.
	 * @returns {Promise<object[]>}
	 * @throws {NotImplementedError}
	 */
	async getAll() {
		throw new NotImplementedError('getAll');
	}

	/**
	 * Satu entity berdasarkan identitasnya.
	 * @param {string} id
	 * @returns {Promise<object|null>} `null` bila tidak ditemukan.
	 * @throws {NotImplementedError}
	 */
	async getById(id) {
		throw new NotImplementedError('getById');
	}

	/**
	 * Menyimpan entity baru.
	 * @param {object} entity
	 * @returns {Promise<object>} Entity yang tersimpan.
	 * @throws {NotImplementedError}
	 */
	async save(entity) {
		throw new NotImplementedError('save');
	}

	/**
	 * Memperbarui entity yang sudah ada.
	 * @param {string} id
	 * @param {object} changes Field yang berubah.
	 * @returns {Promise<object>} Entity setelah pembaruan.
	 * @throws {NotImplementedError}
	 */
	async update(id, changes) {
		throw new NotImplementedError('update');
	}

	/**
	 * Menghapus entity.
	 *
	 * Catatan penting: `PointActivity` dan `AuditLog` bersifat append-only :
	 * repository keduanya WAJIB menolak method ini. KPI Hal 6 dihitung dari
	 * jumlah aksi, sehingga menghapus entri sama dengan memalsukan laporan.
	 *
	 * @param {string} id
	 * @returns {Promise<void>}
	 * @throws {NotImplementedError}
	 */
	async delete(id) {
		throw new NotImplementedError('delete');
	}

	/**
	 * Pencarian berdasarkan kriteria. Lihat butir 3 pada catatan kontrak di atas.
	 * @param {Record<string, unknown>} [criteria]
	 * @returns {Promise<object[]>}
	 * @throws {NotImplementedError}
	 */
	async query(criteria) {
		throw new NotImplementedError('query');
	}
}
