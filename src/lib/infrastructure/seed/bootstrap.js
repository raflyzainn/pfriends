/**
 * PENGISIAN AWAL BASIS DATA DEMO.
 *
 * Tanggung jawab: memastikan Dexie berisi data demo tepat satu kali, dan aman
 * dipanggil berulang kali dari mana pun.
 *
 * Idempotensi ditegakkan lewat dua lapis. Lapis pertama adalah penanda
 * `seedVersion` di tabel `meta`: bila versinya sudah cocok, tidak ada satu pun
 * penulisan dilakukan. Lapis kedua adalah janji dalam memori: pemanggilan yang
 * terjadi bersamaan sebelum pemanggilan pertama selesai akan menunggu janji yang
 * sama, bukan memulai pengisian keduanya. Lapis kedua ini bukan kemewahan :
 * layout, halaman, dan store dapat memanggil `bootstrapDatabase()` hampir
 * bersamaan saat hidrasi, dan tanpanya data akan ditulis dua kali.
 *
 * Menaikkan `SEED_VERSION` adalah cara resmi memperbarui data demo: pengisian
 * berikutnya akan mengosongkan tabel lebih dulu lalu menulis ulang seluruhnya.
 *
 * @see docs/09-BUILD-CONTRACT.md: §6 "Bootstrap: isi Dexie sekali saja; idempoten"
 */

import { browser } from '$app/environment';
import { clearAllTables, getDb, getMeta, setMeta, TABLE } from '../db.js';
import { buildSeed } from './seed-data.js';

/**
 * Versi data demo. Naikkan setiap kali isi seed berubah supaya peramban yang sudah
 * menyimpan versi lama mengisi ulang, bukan menampilkan campuran dua versi.
 *
 * Naik ke 2 BERSAMAAN dengan `DB_VERSION` (`../db.js`), dan keduanya wajib naik
 * dalam satu langkah. Bila hanya `DB_VERSION` yang naik, tabel `accounts` terbentuk
 * tetapi tidak pernah terisi: pemeriksaan di bawah menemukan versi seed yang masih
 * cocok, tidak menulis apa pun, dan login menjadi mustahil TANPA satu pun pesan
 * galat: kueri hanya mengembalikan array kosong.
 * @type {number}
 */
export const SEED_VERSION = 2;

/** Kunci penanda versi pada tabel `meta`. */
const KUNCI_VERSI = 'seedVersion';

/** Kunci waktu pengisian terakhir pada tabel `meta`. */
const KUNCI_WAKTU = 'seededAt';

/** @type {Promise<{seeded: boolean, reason: string, stats?: Record<string, number>}>|null} */
let berjalan = null;

/**
 * Pemetaan koleksi seed ke tabel Dexie. Ditulis sebagai daftar, bukan rangkaian
 * pemanggilan terpisah, supaya penambahan tabel baru hanya menyentuh satu baris.
 *
 * Tabel baru wajib didaftarkan di TIGA tempat sekaligus: `TABLE` dan skema versi
 * pada `db.js`, lalu daftar ini. Transaksi tulis di bawah hanya membuka tabel yang
 * tercantum di sini: tabel yang lupa didaftarkan menghasilkan `NotFoundError` di
 * tengah transaksi, dan seluruh pengisian gagal, bukan hanya satu koleksi.
 * @type {readonly {table: string, key: keyof import('./seed-data.js').SeedBundle}[]}
 */
const PEMETAAN = Object.freeze([
	{ table: TABLE.AWARDEES, key: 'awardees' },
	{ table: TABLE.ACCOUNTS, key: 'accounts' },
	{ table: TABLE.ACTIVITIES, key: 'activities' },
	{ table: TABLE.STORIES, key: 'stories' },
	{ table: TABLE.EVENTS, key: 'events' },
	{ table: TABLE.MOVEMENTS, key: 'movements' },
	{ table: TABLE.BROADCASTS, key: 'broadcasts' },
	{ table: TABLE.REWARDS, key: 'rewards' },
	{ table: TABLE.BADGES, key: 'badges' },
	{ table: TABLE.CONSENTS, key: 'consents' },
	{ table: TABLE.REDEMPTIONS, key: 'redemptions' }
]);

/**
 * Mengisi basis data demo bila belum terisi.
 *
 * @param {{force?: boolean}} [opsi] `force: true` mengosongkan lalu mengisi ulang,
 *   dipakai tombol "muat ulang data demo" pada konsol admin.
 * @returns {Promise<{seeded: boolean, reason: string, stats?: Record<string, number>}>}
 *   `seeded: false` berarti data sudah ada dan tidak ada yang ditulis.
 */
export async function bootstrapDatabase({ force = false } = {}) {
	if (!browser) return { seeded: false, reason: 'Dijalankan di server; IndexedDB tidak tersedia.' };
	if (berjalan && !force) return berjalan;

	berjalan = (async () => {
		const database = await getDb();
		if (!database) {
			return { seeded: false, reason: 'Basis data tidak tersedia di lingkungan ini.' };
		}

		const versiTersimpan = await getMeta(KUNCI_VERSI);
		if (!force && versiTersimpan === SEED_VERSION) {
			return { seeded: false, reason: `Data demo versi ${SEED_VERSION} sudah terpasang.` };
		}

		// Versi berbeda berarti bentuk atau isi seed berubah. Menimpa sebagian di
		// atas data lama akan menyisakan baris yatim dari versi sebelumnya, jadi
		// tabel dikosongkan lebih dulu.
		if (versiTersimpan !== null || force) {
			await clearAllTables();
		}

		const bundle = buildSeed();
		/** @type {Record<string, number>} */
		const stats = {};

		// Satu transaksi tulis untuk seluruh tabel: bila salah satu gagal, tidak ada
		// yang tersisa setengah terisi. Basis data yang separuh ter-seed jauh lebih
		// membingungkan untuk ditelusuri daripada basis data yang kosong.
		await database.transaction(
			'rw',
			PEMETAAN.map(({ table }) => database.table(table)),
			async () => {
				for (const { table, key } of PEMETAAN) {
					const rows = bundle[key];
					await database.table(table).bulkPut(rows);
					stats[key] = rows.length;
				}
			}
		);

		await setMeta(KUNCI_VERSI, SEED_VERSION);
		await setMeta(KUNCI_WAKTU, new Date().toISOString());

		return { seeded: true, reason: `Data demo versi ${SEED_VERSION} berhasil dipasang.`, stats };
	})();

	try {
		return await berjalan;
	} finally {
		// Janji dilepas setelah selesai supaya `force` berikutnya benar-benar
		// mengerjakan ulang, bukan mengembalikan hasil pemanggilan sebelumnya.
		berjalan = null;
	}
}

/**
 * Apakah basis data sudah terisi data demo versi berjalan.
 * @returns {Promise<boolean>}
 */
export async function isDatabaseSeeded() {
	if (!browser) return false;
	return (await getMeta(KUNCI_VERSI)) === SEED_VERSION;
}

/**
 * Waktu pengisian terakhir, untuk ditampilkan pada panel data demo admin.
 * @returns {Promise<Date|null>}
 */
export async function lastSeededAt() {
	const nilai = await getMeta(KUNCI_WAKTU);
	return typeof nilai === 'string' ? new Date(nilai) : null;
}

/**
 * Mengosongkan lalu mengisi ulang seluruh data demo.
 * @returns {Promise<{seeded: boolean, reason: string, stats?: Record<string, number>}>}
 */
export async function resetDatabase() {
	return bootstrapDatabase({ force: true });
}

export default bootstrapDatabase;
