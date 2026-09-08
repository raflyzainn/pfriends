/**
 * BASIS DATA LOKAL: Dexie (IndexedDB).
 *
 * Tanggung jawab: menyediakan satu instans Dexie bagi seluruh repository, dan
 * memastikan modul ini aman dipanggil saat prerender di server.
 *
 * Empat keputusan yang dijaga di sini:
 *
 * 1. **SSR-safe.** SvelteKit menjalankan modul yang sama di server saat prerender,
 *    sedangkan IndexedDB hanya ada di peramban. Karena itu `getDb()` mengembalikan
 *    `null` di server dan Dexie diimpor secara dinamis: supaya paketnya tidak
 *    ikut dievaluasi pada bundel server. Pemanggil WAJIB menangani `null`; itulah
 *    kontraknya, bukan kondisi error.
 * 2. **Hanya field terindeks yang dideklarasikan.** Dexie menyimpan seluruh isi
 *    objek apa adanya; daftar di `stores()` semata-mata menyatakan jalur kueri.
 *    Mendeklarasikan field yang tidak pernah dipakai menyaring hanya menambah
 *    beban tulis tanpa mempercepat apa pun.
 * 3. **Rantai versi bersifat APPEND.** `SCHEMA_V1` adalah rekaman sejarah dan tidak
 *    pernah disunting; perubahan bentuk selalu ditambahkan sebagai `.version(n+1)`.
 *    Menyunting skema lama di tempat memutus rantai warisan Dexie: tabel yang tidak
 *    lagi disebut pada versi lama dapat terhapus beserta isinya saat peramban lama
 *    melakukan lompatan versi.
 * 4. **Basis data dibuka di dalam `try`.** Tanpa `await instance.open()` yang
 *    eksplisit, Dexie membuka basis data secara malas pada operasi tabel pertama :
 *    di luar `try` mana pun: sehingga penanganan `VersionError` di bawah tidak
 *    pernah menyala dan seluruh aplikasi mati, bukan satu halaman.
 *
 * @see docs/12-BUILD-CONTRACT-V2.md: §2.11 bentuk `getDb()` wajib, R-02/R-03/R-04
 * @see docs/09-BUILD-CONTRACT.md: §4 WP-3 Infrastruktur & seed
 */

import { browser } from '$app/environment';

/** Nama basis data IndexedDB. */
export const DB_NAME = 'PfriendsDB';

/**
 * Versi skema Dexie.
 *
 * Naik ke 2 bersama `SEED_VERSION` (`seed/bootstrap.js`): tabel `members` berganti
 * menjadi `awardees` dan tabel `accounts` ditambahkan. Menaikkan salah satu saja
 * menghasilkan tabel `accounts` yang ada tetapi kosong selamanya: login mustahil,
 * tanpa satu pun pesan galat, karena kueri hanya mengembalikan array kosong.
 */
export const DB_VERSION = 2;

/**
 * Nama tabel sebagai konstanta agar repository tidak menuliskan string lepas :
 * salah ketik nama tabel di Dexie menghasilkan `undefined`, bukan error.
 * @readonly
 * @enum {string}
 */
export const TABLE = Object.freeze({
	AWARDEES: 'awardees',
	ACCOUNTS: 'accounts',
	ACTIVITIES: 'activities',
	STORIES: 'stories',
	EVENTS: 'events',
	MOVEMENTS: 'movements',
	BROADCASTS: 'broadcasts',
	REWARDS: 'rewards',
	BADGES: 'badges',
	CONSENTS: 'consents',
	REDEMPTIONS: 'redemptions',
	META: 'meta'
});

/**
 * Skema versi 1: REKAMAN SEJARAH, dilarang disunting.
 *
 * Tabel `'members'` ditulis sebagai literal, bukan `TABLE.MEMBERS`, karena kunci itu
 * sudah tidak ada lagi pada `TABLE`. Empat string indeks di bawah (`activities`,
 * `stories`, `consents`, `redemptions`) masih memakai nama kolom pemilik yang lama:
 * itu memang bentuk yang pernah dipasang di peramban pengguna, dan menuliskannya
 * ulang menjadi `awardeeId` akan membuat rantai upgrade Dexie tidak lagi cocok
 * dengan basis data yang sudah ada di lapangan.
 *
 * @type {Readonly<Record<string, string>>}
 */
const SCHEMA_V1 = Object.freeze({
	// Papan peringkat menyaring per komunitas/chapter dan mengurutkan per poin.
	members: 'id, community, chapterId, status, points, joinedAt',
	// Buku besar poin: hampir seluruh kueri bertumpu pada kunci pemilik dan waktu.
	[TABLE.ACTIVITIES]: 'id, memberId, activityType, status, occurredAt, idempotencyKey',
	// Cerita dicari lewat slug di zona publik dan lewat status di antrean moderasi.
	[TABLE.STORIES]: 'id, slug, memberId, status, community, publishedAt',
	[TABLE.EVENTS]: 'id, type, status, chapterId, startsAt',
	[TABLE.MOVEMENTS]: 'id, slug, category, status, startsAt',
	[TABLE.BROADCASTS]: 'id, status, channel, sentAt',
	[TABLE.REWARDS]: 'id, category, status, community',
	[TABLE.BADGES]: 'code, family, rarity',
	[TABLE.CONSENTS]: 'id, memberId, consentType, status',
	[TABLE.REDEMPTIONS]: 'id, memberId, rewardId, status, requestedAt',
	[TABLE.META]: 'key'
});

/**
 * Skema versi 2: kosakata peran baru.
 *
 * Hanya tabel yang BERUBAH yang didaftarkan; sisanya (`movements`, `broadcasts`,
 * `rewards`, `badges`, `meta`) diwarisi apa adanya dari versi 1. Perubahannya:
 *
 *: `awardees` menggantikan `members`, dan `members: null` menghapus tabel lamanya.
 *   Isi tabel lama sengaja tidak dimigrasikan: seluruhnya data demo yang dibangkitkan
 *   ulang oleh `buildSeed()` pada bootstrap berikutnya, sehingga menulis fungsi
 *   migrasi hanya menambah kode yang tidak pernah menghadapi data sungguhan.
 *: `accounts` adalah tabel baru identitas login. `&email` menjadikan surel indeks
 *   UNIK: dua akun bersurel sama ditolak oleh basis data, bukan oleh disiplin
 *   pemanggil.
 *: `stories` bertambah indeks `reviewerId` dan memakai `authorId` sebagai kunci
 *   penulis; `events` bertambah `slug` dan `proposedBy` untuk antrean usulan.
 *
 * @type {Readonly<Record<string, string|null>>}
 */
const SCHEMA_V2 = Object.freeze({
	[TABLE.AWARDEES]: 'id, community, chapterId, status, points, joinedAt',
	[TABLE.ACCOUNTS]: 'id, &email, role, awardeeId, status',
	[TABLE.ACTIVITIES]: 'id, awardeeId, activityType, status, occurredAt, idempotencyKey',
	[TABLE.STORIES]: 'id, slug, authorId, reviewerId, status, community, publishedAt',
	[TABLE.EVENTS]: 'id, slug, type, status, chapterId, startsAt, proposedBy',
	[TABLE.CONSENTS]: 'id, awardeeId, consentType, status',
	[TABLE.REDEMPTIONS]: 'id, awardeeId, rewardId, status, requestedAt',
	members: null
});

/** @type {import('dexie').Dexie|null} */
let db = null;

/** @type {Promise<import('dexie').Dexie>|null} */
let pending = null;

/**
 * Merakit instans Dexie beserta seluruh rantai versinya.
 *
 * Diangkat menjadi fungsi tersendiri karena dipanggil dua kali: sekali pada jalur
 * biasa, dan sekali lagi setelah basis data yang tidak dapat dibuka dihapus.
 *
 * @param {any} Dexie Konstruktor Dexie hasil impor dinamis.
 * @returns {import('dexie').Dexie}
 */
function bangunInstans(Dexie) {
	const instance = new Dexie(DB_NAME);
	instance.version(1).stores(SCHEMA_V1);
	instance.version(2).stores(SCHEMA_V2);
	return instance;
}

/**
 * Instans Dexie tunggal untuk seluruh aplikasi.
 *
 * Pemanggilan serentak dari beberapa repository sekaligus diserialkan lewat
 * `pending`: tanpa itu, dua `await getDb()` yang berjalan berbarengan sebelum
 * impor dinamis selesai akan membuat dua instans Dexie atas basis data yang sama.
 *
 * Janji dilepas lewat `finally`, bukan hanya pada jalur sukses. Bila pelepasan
 * hanya terjadi ketika berhasil, satu kegagalan impor akan membuat SETIAP
 * `getDb()` berikutnya mengembalikan janji ditolak yang sama selamanya: aplikasi
 * tidak pernah pulih meski penyebabnya sudah hilang.
 *
 * @returns {Promise<import('dexie').Dexie|null>} `null` di lingkungan server.
 */
export async function getDb() {
	if (!browser) return null;
	if (db) return db;
	if (pending) return pending;

	const janji = (async () => {
		const Dexie = (await import('dexie')).default;
		let instance = bangunInstans(Dexie);
		try {
			// Pembukaan dilakukan eksplisit di dalam `try`. Tanpa baris ini Dexie
			// membuka basis data secara malas pada operasi tabel pertama, di luar
			// `try` mana pun, dan `catch` di bawah tidak pernah menyala.
			await instance.open();
		} catch (error) {
			const nama = /** @type {{name?: string}} */ (error)?.name ?? '';
			if (!/VersionError|UpgradeError|DatabaseClosedError/.test(nama)) throw error;
			// Peramban pernah membuka versi yang lebih baru, atau upgrade-nya gagal
			// di tengah jalan. Seluruh isinya data demo yang dapat dibangkitkan ulang,
			// jadi jalan keluar yang paling jujur adalah menghapus lalu membangun ulang
			//: bukan membiarkan aplikasi mati dengan basis data yang tidak terbuka.
			await Dexie.delete(DB_NAME);
			instance = bangunInstans(Dexie);
			await instance.open();
		}
		db = instance;
		return instance;
	})().finally(() => {
		pending = null;
	});

	pending = janji;
	return janji;
}

/**
 * Nilai metadata bernama dari tabel `meta`.
 * @param {string} key
 * @returns {Promise<unknown>} `null` bila tidak ada atau di lingkungan server.
 */
export async function getMeta(key) {
	const database = await getDb();
	if (!database) return null;
	const row = await database.table(TABLE.META).get(key);
	return row?.value ?? null;
}

/**
 * Menyimpan nilai metadata bernama.
 * @param {string} key
 * @param {unknown} value
 * @returns {Promise<void>}
 */
export async function setMeta(key, value) {
	const database = await getDb();
	if (!database) return;
	await database.table(TABLE.META).put({ key, value });
}

/**
 * Mengosongkan seluruh tabel. Dipakai tombol "muat ulang data demo" agar seed
 * dapat dibangun ulang tanpa menghapus basis data lewat DevTools.
 * @returns {Promise<void>}
 */
export async function clearAllTables() {
	const database = await getDb();
	if (!database) return;
	await Promise.all(Object.values(TABLE).map((name) => database.table(name).clear()));
}

export default getDb;
