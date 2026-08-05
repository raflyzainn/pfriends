/**
 * STORE — Antrean Notifikasi.
 *
 * Tanggung jawab: menampung notifikasi yang menunggu dibaca, dan menutupnya
 * sendiri ketika waktunya habis.
 *
 * Satu keputusan yang dijaga di sini: **toast kenaikan tier tidak pernah menutup
 * otomatis.** Naik tier adalah peristiwa langka yang justru ingin dibaca sampai
 * selesai; menutupnya setelah empat detik memperlakukan momen paling membanggakan
 * dalam gamifikasi sama seperti konfirmasi rutin. Aturan yang sama sudah dipegang
 * `ToastHost`, dan store ini mematuhinya agar keduanya tidak berselisih.
 *
 * Antrean dibatasi: anggota yang menekan beberapa aksi beruntun akan melihat
 * notifikasi terbaru, bukan tumpukan yang menutupi layarnya sendiri. Yang terdorong
 * keluar selalu yang tertua dan tidak menetap.
 *
 * @see src/lib/components/ToastHost.svelte — komponen penampil
 * @see docs/09-BUILD-CONTRACT.md — §5 toast.push({type,title,message,points})
 */

import { browser } from '$app/environment';

/**
 * Jenis notifikasi. Nilainya persis yang dikenali `ToastHost`.
 * @readonly
 * @enum {string}
 */
export const ToastType = Object.freeze({
	SUCCESS: 'success',
	ERROR: 'error',
	WARNING: 'warning',
	INFO: 'info',
	POINTS: 'points'
});

/**
 * Satuan nilai yang dapat ditampilkan pada notifikasi.
 * PK = Poin Kontribusi (penentu tier), KT = Koin Tukar (dapat dibelanjakan).
 * @readonly
 * @enum {string}
 */
export const ToastCurrency = Object.freeze({
	POIN: 'PK',
	KOIN: 'KT'
});

/** Lama notifikasi biasa bertahan, dalam milidetik. Selaras dengan `ToastHost`. */
export const DURASI_TOAST_MS = 4000;

/** Jumlah notifikasi yang boleh tampak bersamaan. */
export const MAKS_TOAST_TAMPIL = 4;

/**
 * @typedef {object} ToastInput
 * @property {string} [type]      Salah satu ToastType; default INFO.
 * @property {string} [title]     Judul singkat.
 * @property {string} [message]   Kalimat penjelas.
 * @property {number} [points]    Poin yang diperoleh; ditampilkan besar di atas judul.
 * @property {string} [currency]  Salah satu ToastCurrency; default PK.
 * @property {number} [newTotal]  Saldo setelah aksi, ditampilkan sebagai chip.
 * @property {string} [tier]      Level tier baru; kehadirannya membuat toast menetap.
 * @property {string} [reason]    Alasan pengganti `message`.
 * @property {boolean} [sticky]   Paksa menetap sampai ditutup pengguna.
 * @property {number} [duration]  Lama tampil khusus, dalam milidetik.
 */

/**
 * @typedef {ToastInput & {id: string}} ToastItem
 */

class ToastStore {
	/**
	 * Antrean yang sedang tampil, terlama lebih dulu.
	 * @type {ToastItem[]}
	 */
	items = $state([]);

	/** @type {number} Penghitung id — bukan acak, agar keluaran tetap dapat ditelusuri. */
	#urutan = 0;

	/** @type {Map<string, ReturnType<typeof setTimeout>>} */
	#pewaktu = new Map();

	/** @returns {number} Jumlah notifikasi yang sedang tampil. */
	get count() {
		return this.items.length;
	}

	/** @returns {boolean} */
	get isEmpty() {
		return this.items.length === 0;
	}

	/**
	 * Menambahkan notifikasi ke antrean.
	 *
	 * @param {ToastInput} input
	 * @returns {string} Id notifikasi — dipakai bila pemanggil ingin menutupnya lebih awal.
	 */
	push(input = {}) {
		this.#urutan += 1;
		const id = `toast-${this.#urutan}`;

		/** @type {ToastItem} */
		const item = {
			id,
			type: input.type ?? ToastType.INFO,
			title: input.title,
			message: input.message,
			points: input.points,
			currency: input.currency ?? ToastCurrency.POIN,
			newTotal: input.newTotal,
			tier: input.tier,
			reason: input.reason,
			sticky: Boolean(input.sticky || input.tier),
			duration: input.duration ?? DURASI_TOAST_MS
		};

		this.items = [...this.items, item];
		this.#pangkas();

		if (!item.sticky) this.#jadwalkanTutup(item);
		return id;
	}

	/**
	 * Notifikasi keberhasilan.
	 * @param {string} title
	 * @param {string} [message]
	 * @returns {string}
	 */
	success(title, message) {
		return this.push({ type: ToastType.SUCCESS, title, message });
	}

	/**
	 * Notifikasi kegagalan yang menuntut perhatian.
	 * @param {string} title
	 * @param {string} [message]
	 * @returns {string}
	 */
	error(title, message) {
		return this.push({ type: ToastType.ERROR, title, message });
	}

	/**
	 * Notifikasi peringatan — sesuatu belum lengkap, tetapi belum gagal.
	 * @param {string} title
	 * @param {string} [message]
	 * @returns {string}
	 */
	warning(title, message) {
		return this.push({ type: ToastType.WARNING, title, message });
	}

	/**
	 * Notifikasi informatif.
	 * @param {string} title
	 * @param {string} [message]
	 * @returns {string}
	 */
	info(title, message) {
		return this.push({ type: ToastType.INFO, title, message });
	}

	/**
	 * Menutup satu notifikasi. Aman dipanggil berulang untuk id yang sama —
	 * `ToastHost` juga memiliki pewaktunya sendiri, sehingga keduanya dapat menutup
	 * item yang sama tanpa saling merusak keadaan.
	 * @param {string} id
	 * @returns {void}
	 */
	dismiss(id) {
		this.#batalkanPewaktu(id);
		this.items = this.items.filter((item) => item.id !== id);
	}

	/**
	 * Mengosongkan antrean. Dipakai saat berpindah peran atau keluar sesi, supaya
	 * notifikasi milik sesi sebelumnya tidak ikut terbawa.
	 * @returns {void}
	 */
	clear() {
		for (const id of [...this.#pewaktu.keys()]) this.#batalkanPewaktu(id);
		this.items = [];
	}

	/**
	 * Menjadwalkan penutupan otomatis.
	 * Dijalankan hanya di peramban — `setTimeout` yang tertinggal di server akan
	 * menahan proses render tetap hidup tanpa ada yang membacanya.
	 * @param {ToastItem} item
	 * @returns {void}
	 */
	#jadwalkanTutup(item) {
		if (!browser) return;
		const pewaktu = setTimeout(() => this.dismiss(item.id), item.duration);
		this.#pewaktu.set(item.id, pewaktu);
	}

	/**
	 * @param {string} id
	 * @returns {void}
	 */
	#batalkanPewaktu(id) {
		const pewaktu = this.#pewaktu.get(id);
		if (pewaktu !== undefined) clearTimeout(pewaktu);
		this.#pewaktu.delete(id);
	}

	/**
	 * Menjaga antrean tetap sependek batas tampil. Item menetap dipertahankan —
	 * ia menunggu dibaca, bukan menunggu kedaluwarsa.
	 * @returns {void}
	 */
	#pangkas() {
		if (this.items.length <= MAKS_TOAST_TAMPIL) return;
		const kelebihan = this.items.length - MAKS_TOAST_TAMPIL;
		const terbuang = this.items.filter((item) => !item.sticky).slice(0, kelebihan);
		for (const item of terbuang) this.dismiss(item.id);
	}
}

/** Instans tunggal yang dipakai seluruh aplikasi. */
export const toast = new ToastStore();
