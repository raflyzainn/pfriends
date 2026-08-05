/**
 * Menangkap tangkapan layar halaman-halaman kunci V2 untuk keperluan tinjauan
 * dan bahan presentasi ke Divisi Corporate Secretary.
 *
 * Daftarnya mencakup keempat zona — publik, awardee, verifikator, admin — karena
 * bukti visual yang hanya memotret dua zona tidak dapat menunjukkan PO-3 maupun
 * PO-4 kepada siapa pun yang tidak membuka aplikasinya sendiri.
 *
 * Berkas lama yang route-nya sudah tidak ada DIHAPUS, bukan dibiarkan menumpuk:
 * folder bukti yang memuat tangkapan layar `/member` di samping `/awardee`
 * membuat peninjau harus menebak mana yang berlaku.
 *
 * Prasyarat: server dev berjalan (`npm run dev -- --port 5177`).
 * Jalankan: node scripts/verify/screenshot.mjs [baseUrl] [outDir]
 *
 * @see docs/12-BUILD-CONTRACT-V2.md — §2.14 daftar route, §6.2 baris `screenshot.mjs`
 */

import { spawn } from 'node:child_process';
import { mkdir, readdir, unlink, writeFile } from 'node:fs/promises';

import { buildSeed } from '../../src/lib/infrastructure/seed/seed-data.js';
import { SANDI_DEMO } from '../../src/lib/infrastructure/seed/accounts.js';
import { STORY_STATUS } from '../../src/lib/domain/constants/community.js';
import { UserRole } from '../../src/lib/domain/constants/roles.js';

const BASE = process.argv[2] ?? 'http://localhost:5177';
const OUT = process.argv[3] ?? 'docs/screenshots';
const BROWSER =
	process.env.BROWSER_BIN ?? '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser';
const PORT = 9336;
const tidur = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Parameter route dinamis dibaca dari seed, bukan dituliskan literal ───────
const seed = buildSeed();
const ceritaTerbit = seed.stories.find((s) => s.status === STORY_STATUS.TERPUBLIKASI);
const naskahAntrean =
	seed.stories.find((s) => s.status === STORY_STATUS.REVIEW) ??
	seed.stories.find((s) => s.status === STORY_STATUS.DIAJUKAN);
if (!ceritaTerbit || !naskahAntrean) {
	console.error('Seed tidak menyediakan cerita terbit / naskah antrean.');
	process.exit(1);
}

/** @typedef {'publik'|'AWARDEE'|'VERIFIER'|'ADMIN'} ZonaPotret */

/** @type {{path: string, nama: string, zona: ZonaPotret}[]} */
const HALAMAN = [
	{ path: '/', nama: '01-publik-beranda', zona: 'publik' },
	{ path: '/tentang', nama: '02-publik-tentang', zona: 'publik' },
	{ path: '/komunitas', nama: '03-publik-komunitas', zona: 'publik' },
	{ path: '/gerakan', nama: '04-publik-gerakan', zona: 'publik' },
	{ path: '/cerita', nama: '05-publik-cerita', zona: 'publik' },
	{ path: `/cerita/${ceritaTerbit.slug}`, nama: '06-publik-cerita-detail', zona: 'publik' },
	{ path: '/kalender', nama: '07-publik-kalender', zona: 'publik' },
	{ path: '/metode-pengukuran', nama: '08-publik-metode-pengukuran', zona: 'publik' },
	{ path: '/masuk', nama: '09-publik-masuk', zona: 'publik' },

	{ path: '/awardee', nama: '10-awardee-dasbor', zona: 'AWARDEE' },
	{ path: '/awardee/aksi', nama: '11-awardee-pusat-aksi', zona: 'AWARDEE' },
	{ path: '/awardee/cerita/tulis', nama: '12-awardee-tulis-cerita', zona: 'AWARDEE' },
	{ path: '/awardee/kalender', nama: '13-awardee-kalender', zona: 'AWARDEE' },
	{ path: '/awardee/papan-peringkat', nama: '14-awardee-papan-peringkat', zona: 'AWARDEE' },
	{ path: '/awardee/penghargaan', nama: '15-awardee-penghargaan', zona: 'AWARDEE' },
	{ path: '/awardee/direktori', nama: '16-awardee-direktori', zona: 'AWARDEE' },

	{ path: '/verifikator', nama: '17-verifikator-beranda', zona: 'VERIFIER' },
	{ path: '/verifikator/cerita', nama: '18-verifikator-antrean-cerita', zona: 'VERIFIER' },
	{
		path: `/verifikator/cerita/${naskahAntrean.id}`,
		nama: '19-verifikator-naskah-detail',
		zona: 'VERIFIER'
	},
	{ path: '/verifikator/kegiatan', nama: '20-verifikator-usulan-kegiatan', zona: 'VERIFIER' },
	{ path: '/verifikator/bukti', nama: '21-verifikator-bukti-esg', zona: 'VERIFIER' },

	{ path: '/admin', nama: '22-admin-dasbor-kpi', zona: 'ADMIN' },
	{ path: '/admin/moderasi', nama: '23-admin-moderasi', zona: 'ADMIN' },
	{ path: '/admin/esg', nama: '24-admin-esg', zona: 'ADMIN' },
	{ path: '/admin/gamifikasi', nama: '25-admin-gamifikasi', zona: 'ADMIN' },
	{ path: '/admin/laporan', nama: '26-admin-laporan', zona: 'ADMIN' },
	{ path: '/admin/awardee', nama: '27-admin-kelola-awardee', zona: 'ADMIN' }
];

/** Surel akun demo per zona; kata sandinya satu untuk semua (`SANDI_DEMO`). */
const SUREL_ZONA = {
	AWARDEE: String(seed.accounts.find((a) => a.role === UserRole.AWARDEE)?.email ?? ''),
	VERIFIER: String(seed.accounts.find((a) => a.role === UserRole.VERIFIER)?.email ?? ''),
	ADMIN: String(seed.accounts.find((a) => a.role === UserRole.ADMIN)?.email ?? '')
};

class Cdp {
	#ws;
	#id = 0;
	#w = new Map();
	constructor(ws) {
		this.#ws = ws;
		ws.addEventListener('message', (ev) => {
			const p = JSON.parse(ev.data);
			if (p.id && this.#w.has(p.id)) {
				const { resolve, reject } = this.#w.get(p.id);
				this.#w.delete(p.id);
				p.error ? reject(new Error(JSON.stringify(p.error))) : resolve(p.result);
			}
		});
	}
	static async connect(u) {
		const ws = new WebSocket(u);
		await new Promise((r, j) => {
			ws.addEventListener('open', r, { once: true });
			ws.addEventListener('error', j, { once: true });
		});
		return new Cdp(ws);
	}
	kirim(m, p = {}) {
		const id = ++this.#id;
		return new Promise((res, rej) => {
			this.#w.set(id, { resolve: res, reject: rej });
			this.#ws.send(JSON.stringify({ id, method: m, params: p }));
		});
	}
	async ev(e) {
		const r = await this.kirim('Runtime.evaluate', {
			expression: e,
			returnByValue: true,
			awaitPromise: true
		});
		return r.result?.value;
	}
}

await mkdir(OUT, { recursive: true });

const proc = spawn(
	BROWSER,
	[
		'--headless=new',
		'--disable-gpu',
		'--no-sandbox',
		'--hide-scrollbars',
		`--remote-debugging-port=${PORT}`,
		'--user-data-dir=/tmp/pfriends-shot',
		'about:blank'
	],
	{ stdio: 'ignore' }
);

let target = null;
for (let i = 0; i < 40 && !target; i++) {
	await tidur(250);
	try {
		const list = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) => r.json());
		target = list.find((t) => t.type === 'page');
	} catch {
		/* browser belum siap */
	}
}
if (!target) {
	console.error('Gagal menghubungi browser.');
	proc.kill();
	process.exit(1);
}

const cdp = await Cdp.connect(target.webSocketDebuggerUrl);
await cdp.kirim('Runtime.enable');
await cdp.kirim('Page.enable');
/** Tinggi viewport saat menjelajah; potret memperbesarnya sementara (lihat `potretHalamanPenuh`). */
const TINGGI_VIEWPORT = 900;

await cdp.kirim('Emulation.setDeviceMetricsOverride', {
	width: 1440,
	height: TINGGI_VIEWPORT,
	deviceScaleFactor: 2,
	mobile: false
});

/**
 * Mengosongkan seluruh penyimpanan origin sebelum berpindah peran.
 *
 * Penghapusan dijalankan DARI DALAM origin (lewat `favicon.svg`, berkas statis
 * yang tidak menjalankan aplikasi), bukan lewat `Storage.clearDataForOrigin` dari
 * `about:blank`: parameter `origin` perintah itu sudah usang dan pada Chromium
 * mutakhir tidak menyapu localStorage. Akibatnya sesi jalannya skrip sebelumnya
 * bertahan di profil `/tmp/pfriends-shot`, dan potret zona publik — `09-publik-masuk`
 * yang paling kentara — terekam dengan kerangka konsol admin di dalamnya.
 */
async function bersihkanOrigin() {
	await cdp.kirim('Page.navigate', { url: BASE + '/favicon.svg' });
	await tidur(500);
	await cdp.ev(`(async () => {
		try { localStorage.clear(); sessionStorage.clear(); } catch { /* origin belum siap */ }
		const daftar = (await indexedDB.databases?.()) ?? [];
		await Promise.all(
			daftar
				.filter((db) => db.name)
				.map((db) => new Promise((selesai) => {
					const permintaan = indexedDB.deleteDatabase(db.name);
					permintaan.onsuccess = permintaan.onerror = permintaan.onblocked = () => selesai();
				}))
		);
		return true;
	})()`);
	await cdp.kirim('Page.navigate', { url: 'about:blank' });
	await tidur(400);
}

/**
 * Masuk lewat formulir surel + kata sandi.
 * @param {string} email
 */
async function login(email) {
	await cdp.kirim('Page.navigate', { url: BASE + '/masuk' });
	await tidur(1800);
	await cdp.ev(`(() => {
		const isi = (el, nilai) => {
			if (!el) return false;
			const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
			setter.call(el, nilai);
			el.dispatchEvent(new Event('input', { bubbles: true }));
			return true;
		};
		return isi(document.querySelector('#masuk-email'), ${JSON.stringify(email)}) &&
			isi(document.querySelector('#masuk-sandi'), ${JSON.stringify(SANDI_DEMO)});
	})()`);
	await tidur(300);
	await cdp.ev(`document.querySelector('form')?.requestSubmit()`);
	await tidur(3200);
}

// ── Tangkap ─────────────────────────────────────────────────────────────────

/**
 * Memicu pemuatan gambar `loading="lazy"` sebelum halaman dipotret.
 *
 * `captureBeyondViewport` memperbesar kanvas potret sampai seluruh tinggi
 * dokumen, tetapi TIDAK menggulir halaman — sehingga `IntersectionObserver`
 * bawaan peramban tidak pernah menganggap gambar di bawah lipatan terlihat, dan
 * gambar itu tidak pernah diminta. Hasilnya potret penuh dengan lubang putih
 * besar tepat di tempat foto seharusnya berada: bukan cacat halaman, tetapi
 * cacat potretnya — dan potret inilah yang dibaca orang di `docs/screenshots/`.
 *
 * Karena itu halaman digulir dengan laju pembaca sungguhan lebih dulu, lalu
 * dikembalikan ke puncak, lalu ditunggu sampai setiap gambar benar-benar
 * terdekode. Batas waktu menjaga skrip tetap selesai walau ada satu berkas yang
 * tidak dapat dimuat — potret yang kurang satu foto lebih berguna daripada
 * skrip yang menggantung.
 *
 * @param {number} [batasMs] Tenggat menunggu seluruh gambar terdekode.
 * @returns {Promise<{total: number, gagal: number}>} Cacah gambar dan yang gagal dimuat.
 */
async function picuLazyLoad(batasMs = 8000) {
	const hasil = await cdp.ev(
		`(async () => {
			const jeda = (ms) => new Promise((r) => setTimeout(r, ms));
			const tinggi = document.body.scrollHeight;
			for (let y = 0; y < tinggi; y += 500) {
				window.scrollTo(0, y);
				await jeda(120);
			}
			window.scrollTo(0, 0);
			await jeda(300);

			const tenggat = Date.now() + ${batasMs};
			const belum = () => [...document.images].filter((img) => !img.complete || img.naturalWidth === 0);
			while (belum().length > 0 && Date.now() < tenggat) await jeda(150);

			return { total: document.images.length, gagal: belum().length };
		})()`
	);
	return hasil ?? { total: 0, gagal: 0 };
}

/** Lebar viewport potret, sama dengan `Emulation.setDeviceMetricsOverride` di atas. */
const LEBAR_POTRET = 1440;

/**
 * Memotret seluruh tinggi halaman TANPA merusak elemen `position: sticky`.
 *
 * `captureScreenshot({ captureBeyondViewport: true })` terlihat seperti jalan
 * pintas yang benar, tetapi ia memperbesar kanvas tanpa memperbesar viewport —
 * sehingga header `sticky top-0` dan sidebar `fixed` dihitung terhadap viewport
 * lama dan mendarat di tengah halaman, menimpa isi. Pada zona ter-login efeknya
 * paling parah: bilah header menutupi judul halaman, dan potret terbaca seolah
 * antarmukanya rusak padahal halaman aslinya baik-baik saja (diperiksa langsung:
 * `h1` berada di `top: 96`, tepat di bawah header setinggi 56).
 *
 * Yang dilakukan di sini adalah memperbesar VIEWPORT-nya sampai setinggi
 * dokumen, memotret, lalu mengembalikannya. Dengan begitu posisi elemen sticky
 * dihitung pada gulir nol — persis seperti yang dilihat pembaca.
 *
 * @returns {Promise<string>} Data PNG terkode base64.
 */
async function potretHalamanPenuh() {
	const metrik = await cdp.kirim('Page.getLayoutMetrics');
	const tinggi = Math.ceil(
		metrik.cssContentSize?.height ?? metrik.contentSize?.height ?? TINGGI_VIEWPORT
	);

	await cdp.kirim('Emulation.setDeviceMetricsOverride', {
		width: LEBAR_POTRET,
		height: tinggi,
		deviceScaleFactor: 2,
		mobile: false
	});
	// Satu frame untuk menata ulang tata letak pada viewport baru sebelum dipotret.
	await tidur(400);

	const { data } = await cdp.kirim('Page.captureScreenshot', { format: 'png' });

	await cdp.kirim('Emulation.setDeviceMetricsOverride', {
		width: LEBAR_POTRET,
		height: TINGGI_VIEWPORT,
		deviceScaleFactor: 2,
		mobile: false
	});
	return data;
}

/** @type {string[]} */
const berkasBaru = [];
/** @type {ZonaPotret|null} */
let zonaSaatIni = null;

// Zona publik harus dipotret sebagai TAMU. Tanpa pembersihan awal, sesi yang
// tertinggal di profil peramban membuat `/masuk` mengalihkan ke beranda peran dan
// seluruh potret publik memakai kerangka navigasi ter-login.
await bersihkanOrigin();

for (const h of HALAMAN) {
	if (h.zona !== 'publik' && h.zona !== zonaSaatIni) {
		await bersihkanOrigin();
		await login(SUREL_ZONA[h.zona]);
		zonaSaatIni = h.zona;
	}
	await cdp.kirim('Page.navigate', { url: BASE + h.path });
	await tidur(2400);
	const gambar = await picuLazyLoad();
	const data = await potretHalamanPenuh();
	const namaBerkas = `${h.nama}.png`;
	await writeFile(`${OUT}/${namaBerkas}`, Buffer.from(data, 'base64'));
	berkasBaru.push(namaBerkas);
	const catatan = gambar.gagal > 0 ? ` ⚠ ${gambar.gagal}/${gambar.total} gambar gagal dimuat` : '';
	console.log(`✓ ${OUT}/${namaBerkas}${catatan}`);
}

// ── Buang tangkapan layar yang route-nya sudah tidak ada ────────────────────
const dikenal = new Set(berkasBaru);
const isiFolder = await readdir(OUT);
const usang = isiFolder.filter((nama) => nama.endsWith('.png') && !dikenal.has(nama));
for (const nama of usang) {
	await unlink(`${OUT}/${nama}`);
	console.log(`✗ dihapus (route sudah tidak ada): ${OUT}/${nama}`);
}

console.log(`\n${berkasBaru.length} tangkapan layar diperbarui · ${usang.length} berkas usang dihapus.`);

cdp.kirim('Browser.close').catch(() => {});
proc.kill();
process.exit(0);
