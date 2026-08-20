/**
 * PRNG DETERMINISTIK: mulberry32.
 *
 * Tanggung jawab: menjadi satu-satunya sumber keacakan pada seluruh proses seed.
 *
 * Kontrak build §6 melarang `Math.random()` dan `Date.now()` di seed. Alasannya
 * bukan kerapian: data demo yang berubah tiap muat ulang membuat dasbor KPI
 * menampilkan angka berbeda pada dua kali demo berturut-turut, dan tidak ada cara
 * membuktikan sebuah bug seed dapat direproduksi. Dengan seed tetap, keluaran
 * seluruh generator identik di setiap mesin dan setiap kali dijalankan.
 *
 * mulberry32 dipilih karena berstatus 32-bit tunggal, cukup baik sebarannya untuk
 * data demo, dan pendek: seluruh algoritmanya terbaca dalam satu layar sehingga
 * tidak ada bagian yang perlu dipercaya begitu saja.
 *
 * @see docs/09-BUILD-CONTRACT.md: §6 Aturan seed data
 */

/**
 * Seed tetap seluruh data demo. Angka ini adalah tanggal dokumen sumber
 * (29 Mei 2026): dipilih agar asal-usulnya jelas, bukan konstanta ajaib.
 * @type {number}
 */
export const SEED = 20260529;

/**
 * @callback Rng
 * @returns {number} Bilangan pecahan pada rentang [0, 1).
 */

/**
 * Membuat generator acak deterministik.
 * @param {number} seed Benih 32-bit.
 * @returns {Rng}
 * @throws {TypeError} bila benih bukan bilangan bulat.
 */
export function mulberry32(seed) {
	if (!Number.isInteger(seed)) {
		throw new TypeError(`Seed harus bilangan bulat, diterima: ${String(seed)}`);
	}
	let state = seed >>> 0;
	return function next() {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/**
 * Satu elemen acak dari sebuah array.
 * @template T
 * @param {Rng} rng
 * @param {readonly T[]} items
 * @returns {T}
 * @throws {RangeError} bila array kosong: memilih dari himpunan kosong adalah bug
 *   pemanggil, dan mengembalikan `undefined` diam-diam akan muncul jauh kemudian.
 */
export function pick(rng, items) {
	if (!Array.isArray(items) || items.length === 0) {
		throw new RangeError('pick() membutuhkan array berisi minimal satu elemen.');
	}
	return items[Math.floor(rng() * items.length)];
}

/**
 * Bilangan bulat acak pada rentang tertutup [min, max].
 * @param {Rng} rng
 * @param {number} min
 * @param {number} max
 * @returns {number}
 * @throws {RangeError} bila rentang terbalik.
 */
export function intBetween(rng, min, max) {
	if (min > max) {
		throw new RangeError(`Rentang terbalik: intBetween(${min}, ${max}).`);
	}
	return min + Math.floor(rng() * (max - min + 1));
}

/**
 * Salinan acak sebuah array (Fisher–Yates). Array asal tidak diubah: generator
 * seed memakai ulang daftar nama dan kota berkali-kali, sehingga mengacak di
 * tempat akan membuat urutan pemanggilan berikutnya bergantung pada yang sebelumnya.
 * @template T
 * @param {Rng} rng
 * @param {readonly T[]} items
 * @returns {T[]}
 */
export function shuffle(rng, items) {
	const hasil = [...items];
	for (let i = hasil.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		[hasil[i], hasil[j]] = [hasil[j], hasil[i]];
	}
	return hasil;
}

/**
 * Beberapa elemen unik dari sebuah array.
 * @template T
 * @param {Rng} rng
 * @param {readonly T[]} items
 * @param {number} count Jumlah yang diambil; dibatasi panjang array.
 * @returns {T[]}
 */
export function sample(rng, items, count) {
	return shuffle(rng, items).slice(0, Math.max(0, Math.min(count, items.length)));
}

/**
 * Keputusan ya/tidak dengan peluang tertentu.
 * @param {Rng} rng
 * @param {number} probability Peluang bernilai `true`, pada rentang [0, 1].
 * @returns {boolean}
 */
export function chance(rng, probability) {
	return rng() < probability;
}

/**
 * Memilih satu elemen berdasarkan bobot. Dipakai agar aksi berpoin rendah jauh
 * lebih sering muncul daripada aksi berpoin tinggi: persis seperti perilaku
 * komunitas sungguhan, dan itulah yang membuat distribusi tier mengerucut.
 * @template T
 * @param {Rng} rng
 * @param {readonly {item: T, weight: number}[]} entries
 * @returns {T}
 * @throws {RangeError} bila daftar kosong atau seluruh bobot nol.
 */
export function pickWeighted(rng, entries) {
	const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
	if (entries.length === 0 || total <= 0) {
		throw new RangeError('pickWeighted() membutuhkan minimal satu entri berbobot positif.');
	}
	let ambang = rng() * total;
	for (const entry of entries) {
		ambang -= entry.weight;
		if (ambang < 0) return entry.item;
	}
	return entries[entries.length - 1].item;
}
