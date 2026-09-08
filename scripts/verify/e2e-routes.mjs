/**
 * Uji asap end-to-end seluruh route utama memakai Chrome DevTools Protocol.
 *
 * Tanpa dependensi apa pun: memakai WebSocket bawaan Node 22 dan browser
 * berbasis Chromium yang sudah ada di mesin. Pfriends adalah SPA yang dirender
 * di klien, jadi `curl` tidak cukup: halaman harus benar-benar dijalankan.
 *
 * ── Mengapa setiap route ber-zona diuji DUA KALI ──────────────────────────────
 * Membuka `/admin` tanpa sesi lalu melihat pengalihan hanya membuktikan GUARD-nya
 * bekerja; ia tidak membuktikan halamannya hidup. Sebaliknya, menguji `/admin`
 * hanya dengan sesi Admin tidak membuktikan zona itu benar-benar tertutup bagi
 * orang lain. Karena itu skrip ini menjalankan dua fase:
 *
 *   (i)  sebagai TAMU : tiga pintu zona wajib mendarat di `/masuk?next=…`
 *   (ii) sebagai PERAN YANG BENAR: halaman wajib merender isi, tanpa galat
 *        konsol, dan tanpa panel penolakan guard.
 *
 * Ditambah satu fase silang: peran yang salah wajib melihat panel penolakan.
 *
 * ── Mengapa deteksi guard memakai ATRIBUT, bukan teks ─────────────────────────
 * Versi lama mencocokkan kalimat ("Pilih peran", "Konsol khusus pengelola").
 * Kalimat itu lenyap saat halaman masuk ditulis ulang menjadi formulir, sehingga
 * detektornya tidak akan pernah menyala lagi: dan skrip akan melaporkan 36 route
 * hijau bahkan bila SELURUH zona ter-login menampilkan panel "bukan peran Anda".
 * Penggantinya `[data-zone-denied]` dan `[data-zone-splash]`, dua atribut yang
 * dipasang `ZoneGuard.svelte` sebagai kontrak: atribut tidak ikut basi saat
 * salinan teks berubah.
 *
 * Prasyarat: server dev berjalan (`npm run dev -- --port 5177`).
 * Jalankan: node scripts/verify/e2e-routes.mjs [baseUrl]
 *
 * @see docs/12-BUILD-CONTRACT-V2.md: §2.14 daftar 36 route, §6.2 baris `e2e-routes.mjs`, §6.4 matriks guard
 */

import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { buildSeed } from '../../src/lib/infrastructure/seed/seed-data.js';
import { SANDI_DEMO } from '../../src/lib/infrastructure/seed/accounts.js';
import { STORY_STATUS } from '../../src/lib/domain/constants/community.js';
import { EventStatus } from '../../src/lib/domain/entities/CommunityEvent.js';
import { UserRole } from '../../src/lib/domain/constants/roles.js';

const BASE = process.argv[2] ?? 'http://localhost:5177';
const BROWSER =
	process.env.BROWSER_BIN ?? '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser';
const PORT = 9333;

// ── Parameter route dinamis, diambil dari seed yang sama dengan aplikasi ─────
// Menuliskan slug atau id secara literal membuat uji ini basi diam-diam pada hari
// data seed digeser satu baris; membacanya dari `buildSeed()` menjamin route
// dinamis selalu menunjuk record yang benar-benar ada.
const seed = buildSeed();

/** @param {string} pesan */
function wajibAda(pesan) {
	console.error(`Seed tidak menyediakan ${pesan}: uji route dinamis tidak dapat berjalan.`);
	process.exit(1);
}

const ceritaTerbit = seed.stories.find((s) => s.status === STORY_STATUS.TERPUBLIKASI);
if (!ceritaTerbit) wajibAda('cerita TERPUBLIKASI');
const kegiatanTerjadwal = seed.events.find((e) => e.status === EventStatus.TERJADWAL);
if (!kegiatanTerjadwal) wajibAda('kegiatan TERJADWAL');
const kabarTerkirim = seed.broadcasts.find((b) => b.sentAt) ?? seed.broadcasts[0];
if (!kabarTerkirim) wajibAda('kabar');
const naskahAntrean =
	seed.stories.find((s) => s.status === STORY_STATUS.REVIEW) ??
	seed.stories.find((s) => s.status === STORY_STATUS.DIAJUKAN);
if (!naskahAntrean) wajibAda('naskah di antrean verifikator');

/**
 * Route zona publik.
 *
 * `/daftar` kembali hidup untuk registrasi Awardee berbukti.
 * Empat route yang tidak lagi tercantum di navbar (`/tentang`, `/komunitas`,
 * `/gerakan`, `/metode-pengukuran`) tetap DIUJI: halamannya masih hidup dan masih
 * ditautkan dari dalam halaman lain, jadi kerusakannya tetap harus tertangkap.
 */
const RUTE_PUBLIK = [
	'/',
	'/tentang',
	'/komunitas',
	'/gerakan',
	'/cerita',
	`/cerita/${ceritaTerbit.slug}`,
	'/kalender',
	`/kalender/${kegiatanTerjadwal.id}`,
	'/metode-pengukuran',
	'/masuk',
	'/daftar'
];

/**
 * Dua belas route zona awardee.
 *
 * `/awardee/papan-peringkat` dicabut: peserta kini melihat capaiannya sebagai
 * pencapaian pribadi di `/awardee/penghargaan`, bukan sebagai peringkat.
 * `/awardee/forum` ditambahkan pada revisi yang sama.
 */
const RUTE_AWARDEE = [
	'/awardee',
	'/awardee/kabar',
	`/awardee/kabar/${kabarTerkirim.id}`,
	'/awardee/forum',
	'/awardee/aksi',
	'/awardee/kalender',
	'/awardee/gerakan',
	'/awardee/cerita',
	'/awardee/cerita/tulis',
	'/awardee/penghargaan',
	'/awardee/direktori',
	'/awardee/profil'
];

/**
 * Route zona verifikator.
 *
 * `/verifikator/bukti` dan `/verifikator/profil` dicabut pada revisi 4 Agustus 2026:
 * navbar dipangkas jadi Dasbor · Submission Blog · Konfigurasi Calendar of Event,
 * dan profil tidak lagi berdiri sebagai butir navigasi tersendiri.
 */
const RUTE_VERIFIKATOR = [
	'/verifikator',
	'/verifikator/cerita',
	`/verifikator/cerita/${naskahAntrean.id}`,
	'/verifikator/kegiatan',
	'/verifikator/bukti-keaktifan',
	'/verifikator/pendaftaran'
];

/**
 * Route zona admin.
 *
 * Diseminasi, Moderasi & Consent, Bukti ESG, dan Laporan dicabut pada revisi
 * 4 Agustus 2026; dua yang terakhir isinya melebur ke Dasbor KPI.
 */
const RUTE_ADMIN = ['/admin', '/admin/awardee', '/admin/gamifikasi', '/admin/pendaftaran'];

/**
 * Kredensial demo per peran. Kata sandinya satu untuk semua akun dan berasal dari
 * `SANDI_DEMO`: menyalinnya sebagai literal di sini akan membuat uji ini gagal
 * diam-diam pada hari sandi seed diubah.
 * @type {Record<string, {email: string, home: string, rute: string[]}>}
 */
const PERAN_UJI = {
	[UserRole.AWARDEE]: {
		email: String(seed.accounts.find((a) => a.role === UserRole.AWARDEE)?.email ?? ''),
		home: '/awardee',
		rute: RUTE_AWARDEE
	},
	[UserRole.VERIFIER]: {
		email: String(seed.accounts.find((a) => a.role === UserRole.VERIFIER)?.email ?? ''),
		home: '/verifikator',
		rute: RUTE_VERIFIKATOR
	},
	[UserRole.ADMIN]: {
		email: String(seed.accounts.find((a) => a.role === UserRole.ADMIN)?.email ?? ''),
		home: '/admin',
		rute: RUTE_ADMIN
	}
};

/** Panjang minimum teks halaman yang dianggap "berisi", bukan kerangka kosong. */
const AMBANG_ISI = 400;

const tidur = (ms) => new Promise((r) => setTimeout(r, ms));

/** Klien CDP minimal di atas WebSocket bawaan Node. */
class Cdp {
	#ws;
	#id = 0;
	#menunggu = new Map();
	/** @type {string[]} */
	konsol = [];

	constructor(ws) {
		this.#ws = ws;
		ws.addEventListener('message', (ev) => {
			const pesan = JSON.parse(ev.data);
			if (pesan.id && this.#menunggu.has(pesan.id)) {
				const { resolve, reject } = this.#menunggu.get(pesan.id);
				this.#menunggu.delete(pesan.id);
				pesan.error ? reject(new Error(JSON.stringify(pesan.error))) : resolve(pesan.result);
				return;
			}
			if (pesan.method === 'Runtime.consoleAPICalled' && pesan.params.type === 'error') {
				this.konsol.push(pesan.params.args.map((a) => a.value ?? a.description ?? '').join(' '));
			}
			if (pesan.method === 'Runtime.exceptionThrown') {
				const d = pesan.params.exceptionDetails;
				this.konsol.push(d.exception?.description ?? d.text ?? 'exception');
			}
		});
	}

	static async connect(url) {
		const ws = new WebSocket(url);
		await new Promise((resolve, reject) => {
			ws.addEventListener('open', resolve, { once: true });
			ws.addEventListener('error', reject, { once: true });
		});
		return new Cdp(ws);
	}

	kirim(method, params = {}) {
		const id = ++this.#id;
		return new Promise((resolve, reject) => {
			this.#menunggu.set(id, { resolve, reject });
			this.#ws.send(JSON.stringify({ id, method, params }));
		});
	}

	async evaluate(ekspresi) {
		const hasil = await this.kirim('Runtime.evaluate', {
			expression: ekspresi,
			returnByValue: true,
			awaitPromise: true
		});
		return hasil.result?.value;
	}

	tutup() {
		this.#ws.close();
	}
}

// ── Jalankan browser ────────────────────────────────────────────────────────
const proc = spawn(
	BROWSER,
	[
		'--headless=new',
		'--disable-gpu',
		'--no-sandbox',
		'--no-first-run',
		`--remote-debugging-port=${PORT}`,
		`--user-data-dir=${join(tmpdir(), `pffriends-e2e-profile-${process.pid}`)}`,
		'about:blank'
	],
	{ stdio: 'ignore' }
);

let target = null;
for (let percobaan = 0; percobaan < 40 && !target; percobaan++) {
	await tidur(250);
	try {
		const daftar = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) => r.json());
		target = daftar.find((t) => t.type === 'page');
	} catch {
		/* browser belum siap */
	}
}
if (!target) {
	console.error('Gagal menghubungi browser lewat CDP.');
	proc.kill();
	process.exit(1);
}

const cdp = await Cdp.connect(target.webSocketDebuggerUrl);
await cdp.kirim('Runtime.enable');
await cdp.kirim('Page.enable');

/**
 * Membuka satu route lalu melaporkan kesehatannya.
 *
 * @param {string} path Jalur yang dibuka.
 * @param {number} [jeda] Waktu tunggu hidrasi + pemuatan Dexie, dalam milidetik.
 */
async function periksa(path, jeda = 1400) {
	cdp.konsol.length = 0;
	await cdp.kirim('Page.navigate', { url: BASE + path });
	await tidur(jeda);

	const info = await cdp.evaluate(`(() => {
		const teks = document.body.innerText || '';
		return {
			url: location.pathname + location.search,
			panjang: teks.trim().length,
			judul: document.title,
			// Pola sengaja spesifik: angka telanjang seperti "500" muncul sah di konten
			// (mis. "25-500 jaringan"), jadi jangan dijadikan penanda galat.
			galat: /Internal Error|Error: |Cannot read propert|is not a function|is not defined|TypeError|ReferenceError/.test(teks),
			// Kontrak ZoneGuard: atribut, bukan kalimat. Lihat catatan berkas.
			ditolakGuard: !!document.querySelector('[data-zone-denied]'),
			masihSplash: !!document.querySelector('[data-zone-splash]'),
			cuplikan: teks.trim().slice(0, 70).replace(/\\s+/g, ' ')
		};
	})()`);

	const errorKonsol = cdp.konsol.filter(
		(baris) => !/favicon|fonts\.googleapis|Download the .* DevTools/i.test(baris)
	);

	return { path, ...info, errorKonsol };
}

/**
 * Masuk dengan MENGKLIK KARTU PENGGUNA: jalur yang sesungguhnya dipakai manusia.
 *
 * Sejak revisi 4 Agustus 2026 halaman `/masuk` tidak lagi menampilkan kolom surel
 * dan sandi; keduanya diganti daftar kartu yang tinggal diklik, dan sandi demo
 * dipakai di balik layar oleh komponen. Versi lama fungsi ini mengisi
 * `#masuk-email` + `#masuk-sandi` lalu menekan submit: sesudah revisi, kedua
 * selektor itu tidak pernah ada di DOM kecuali panel "masuk manual" dibuka, maka
 * `querySelector` mengembalikan `null`, pengisian gagal diam-diam, dan SELURUH
 * fase ter-login berjalan sebagai tamu. Route tetap dilaporkan "✓" karena memang
 * merender sesuatu: yang dirender halaman masuk, bukan halaman yang diuji.
 *
 * Kartu dicari lewat `[data-akun="surel"]`, bukan lewat urutan DOM: urutan kartu
 * berubah setiap kali seed disusun ulang.
 *
 * @param {string} email
 * @returns {Promise<{lokasi: string, sesiTersimpan: boolean, galat: string}>}
 */
async function masuk(email) {
	await cdp.kirim('Page.navigate', { url: BASE + '/masuk' });
	await tidur(2200); // muat Dexie + jalankan seed sebelum kartu terender

	const diklik = await cdp.evaluate(
		`(() => {
			const kartu = document.querySelector('[data-akun=' + ${JSON.stringify(JSON.stringify(email))} + ']');
			if (!kartu) return false;
			kartu.click();
			return true;
		})()`
	);

	// Halaman masuk hanya memajang SEBAGIAN akun demo: seluruh staf, tetapi cuma
	// enam dari 60 awardee. Akun uji dipilih dari urutan seed, jadi kartunya sering
	// tidak termasuk yang dipajang. Untuk kasus itu panel "masuk manual" dibuka dan
	// formulirnya diisi: jalur itu memang masih ada di antarmuka, dan memakainya
	// membuat gerbang tidak bergantung pada awardee mana yang kebetulan dipajang.
	if (diklik !== true) {
		await cdp.evaluate(
			`(() => {
				const pemicu = [...document.querySelectorAll('button')].find((b) =>
					/masuk manual/i.test(b.textContent || '')
				);
				pemicu?.click();
				return !!pemicu;
			})()`
		);
		await tidur(500);

		await cdp.evaluate(`(() => {
			const isi = (el, nilai) => {
				if (!el) return false;
				const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
				setter.call(el, nilai);
				el.dispatchEvent(new Event('input', { bubbles: true }));
				return true;
			};
			isi(document.querySelector('#masuk-email'), ${JSON.stringify(email)});
			isi(document.querySelector('#masuk-sandi'), ${JSON.stringify(SANDI_DEMO)});
			return true;
		})()`);
		await tidur(300);

		await cdp.evaluate(
			`document.querySelector('form')?.requestSubmit?.() ?? document.querySelector('button[type=submit]')?.click()`
		);
	}
	await tidur(3000); // pemanggilan pertama memuat Dexie + menjalankan seed

	return cdp.evaluate(`(() => ({
		lokasi: location.pathname,
		sesiTersimpan: !!localStorage.getItem('pfriends_session'),
		galat: (document.querySelector('[role=alert]')?.innerText || '').trim().slice(0, 90)
	}))()`);
}

/**
 * Mengosongkan SELURUH penyimpanan origin: localStorage (sesi) dan IndexedDB
 * (buku besar Dexie).
 *
 * `localStorage.clear()` saja tidak cukup: profil peramban dipakai ulang antar
 * jalannya skrip, dan sesi yang tertinggal membuat fase tamu langsung gagal
 * karena `/masuk` mengalihkan pengguna yang dianggap masih masuk.
 *
 * ── Mengapa penghapusan dijalankan DARI DALAM origin ─────────────────────────
 * Versi sebelumnya hanya memanggil `Storage.clearDataForOrigin` dari `about:blank`.
 * Parameter `origin` pada perintah itu sudah usang (Chromium menggantinya dengan
 * `storageKey`) dan pada Brave/Chromium mutakhir ia tidak menyapu localStorage.
 * Akibatnya sesi ADMIN dari jalannya skrip sebelumnya bertahan di profil
 * `/tmp/pfriends-e2e-profile`, dan Fase 1-2 hanya lolos pada profil yang benar-benar
 * baru: gerbang yang hijau sekali lalu merah selamanya, atau lebih buruk: hijau
 * karena kebetulan. Karena itu penghapusan kini dilakukan dengan menjalankan
 * `localStorage.clear()` + `indexedDB.deleteDatabase()` di dalam dokumen origin,
 * dan hasilnya DIVERIFIKASI oleh `sisaPenyimpanan()`.
 *
 * `favicon.svg` dipakai sebagai dokumen tumpuan, bukan salah satu route: berkas
 * statis memberi konteks origin yang sama tanpa menjalankan aplikasi, sehingga
 * Dexie tidak dibuka ulang tepat ketika kita menghapusnya (delete yang `blocked`).
 */
async function keluarBersih() {
	await cdp.kirim('Page.navigate', { url: BASE + '/favicon.svg' });
	await tidur(500);
	await cdp.evaluate(`(async () => {
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
 * Melaporkan apa yang MASIH tersisa di penyimpanan origin.
 *
 * Dipakai untuk membuktikan bahwa `keluarBersih()` sungguh bekerja; tanpa
 * pembuktian ini fase tamu bisa "lulus" hanya karena kebetulan profilnya bersih.
 *
 * @returns {Promise<{kunci: number, basisData: number}>}
 */
async function sisaPenyimpanan() {
	await cdp.kirim('Page.navigate', { url: BASE + '/favicon.svg' });
	await tidur(400);
	const sisa = await cdp.evaluate(`(async () => ({
		kunci: localStorage.length,
		basisData: ((await indexedDB.databases?.()) ?? []).length
	}))()`);
	await cdp.kirim('Page.navigate', { url: 'about:blank' });
	await tidur(200);
	return sisa ?? { kunci: -1, basisData: -1 };
}

// ── Akumulator hasil ────────────────────────────────────────────────────────
/** @type {{path: string, [k: string]: any}[]} */
const laporan = [];
let lulusAsersi = 0;
let gagalAsersi = 0;
/** @type {string[]} */
const kegagalan = [];

/** @param {string} nama @param {boolean} kondisi @param {string} [detail] */
function cek(nama, kondisi, detail = '') {
	if (kondisi) {
		lulusAsersi++;
		console.log(`   ✓ ${nama}`);
	} else {
		gagalAsersi++;
		kegagalan.push(`${nama}${detail ? `: ${detail}` : ''}`);
		console.log(`   ✗ ${nama}${detail ? `: ${detail}` : ''}`);
	}
}

// ── Fase 0 · Membuktikan titik awal benar-benar "tamu" ──────────────────────
// Seluruh Fase 1-2 tidak berarti apa-apa bila profil peramban masih menyimpan
// sesi dari jalannya skrip sebelumnya. Asersi ini membuat kegagalan pembersihan
// tampak sebagai kegagalan, bukan menyamar sebagai kelulusan.
console.log('\n── Fase 0 · Titik awal bersih ──');
await keluarBersih();
const sisaAwal = await sisaPenyimpanan();
cek(
	'penyimpanan origin kosong sebelum fase tamu',
	sisaAwal.kunci === 0 && sisaAwal.basisData === 0,
	`localStorage=${sisaAwal.kunci} kunci · indexedDB=${sisaAwal.basisData} basis data`
);

// ── Fase 1 · Zona publik sebagai tamu ───────────────────────────────────────
console.log('\n── Fase 1 · Zona publik (tamu) ──');
for (const rute of RUTE_PUBLIK) laporan.push(await periksa(rute));

// ── Fase 2 · Pintu zona sebagai tamu: WAJIB mendarat di /masuk?next=… ───────
console.log('\n── Fase 2 · Guard zona sebagai tamu ──');
for (const pintu of ['/awardee/aksi', '/verifikator/cerita', '/admin']) {
	const hasil = await periksa(pintu, 2200);
	const mendarat = String(hasil.url);
	cek(
		`tamu di ${pintu} dialihkan ke /masuk?next=${pintu}`,
		mendarat.startsWith('/masuk') && decodeURIComponent(mendarat).includes(`next=${pintu}`),
		`mendarat di ${mendarat}`
	);
}

// ── Fase 3 · Tiap zona dengan peran yang benar ──────────────────────────────
for (const [peran, profil] of Object.entries(PERAN_UJI)) {
	console.log(`\n── Fase 3 · Masuk sebagai ${peran} (${profil.email}) ──`);
	await keluarBersih();
	const sesi = await masuk(profil.email);
	cek(`${peran} mendarat di ${profil.home}`, sesi.lokasi === profil.home, `lokasi=${sesi.lokasi} galat="${sesi.galat}"`);
	cek(`${peran} menyimpan sesi`, sesi.sesiTersimpan === true);

	// ── Tombol keluar WAJIB hadir, terlihat, dan berlabel kata ──────────────
	// Empat peninjau menemukan hal yang sama: satu-satunya cara keluar dari zona
	// ter-login adalah menghapus data situs lewat DevTools. Dua konsol memang
	// sudah punya tombolnya, tetapi keduanya ikon telanjang tanpa satu pun kata
	// "keluar" di layar. Karena itu asersi ini memeriksa TIGA hal sekaligus:
	// kaitnya ada (`[data-logout]`), kotaknya benar-benar terender, dan labelnya
	// terbaca sebagai kata: bukan hanya glyph yang harus ditebak.
	const tombolKeluar = await cdp.evaluate(`(() => {
		const t = document.querySelector('[data-logout]');
		if (!t) return { ada: false };
		const r = t.getBoundingClientRect();
		const gaya = getComputedStyle(t);
		return {
			ada: true,
			teks: (t.innerText || t.getAttribute('aria-label') || '').replace(/\\s+/g, ' ').trim(),
			terlihat: gaya.display !== 'none' && gaya.visibility !== 'hidden' && r.width > 0 && r.height > 0,
			lebar: Math.round(r.width),
			tinggi: Math.round(r.height)
		};
	})()`);
	cek(
		`${peran}: tombol keluar hadir di ${profil.home} ([data-logout])`,
		tombolKeluar?.ada === true,
		JSON.stringify(tombolKeluar)
	);
	cek(
		`${peran}: tombol keluar benar-benar terender, bukan nol piksel`,
		tombolKeluar?.terlihat === true,
		`${tombolKeluar?.lebar}×${tombolKeluar?.tinggi} px`
	);
	cek(
		`${peran}: label tombol keluar memuat kata "Keluar"`,
		/keluar/i.test(String(tombolKeluar?.teks ?? '')),
		`teks="${tombolKeluar?.teks}"`
	);

	console.log(`   · ${profil.rute.length} route zona ${peran}`);
	for (const rute of profil.rute) laporan.push(await periksa(rute, 2000));

	// ── Tombol itu HARUS benar-benar mengeluarkan pengguna ──────────────────
	// Tombol yang ada tapi tidak bekerja meninggalkan pengguna persis di tempat
	// keluhan bermula. Sesi dibangun ulang sesudahnya untuk peran berikutnya,
	// dan pemulihan itu sekaligus membuktikan pergantian peran dapat dilakukan
	// TANPA menghapus data situs secara manual.
	await cdp.evaluate(`document.querySelector('[data-logout]')?.click()`);
	await tidur(2600);
	const sesudahKeluar = await cdp.evaluate(`(async () => ({
		lokasi: location.pathname,
		sesiTersisa: !!localStorage.getItem('pfriends_session'),
		basisData: ((await indexedDB.databases?.()) ?? []).length
	}))()`);
	cek(
		`${peran}: menekan tombol keluar menghapus sesi`,
		sesudahKeluar?.sesiTersisa === false,
		JSON.stringify(sesudahKeluar)
	);
	cek(
		`${peran}: keluar mendarat di zona publik, bukan tersangkut di zona`,
		!/^\/(awardee|verifikator|admin)\b/.test(String(sesudahKeluar?.lokasi ?? '')),
		`lokasi=${sesudahKeluar?.lokasi}`
	);
	cek(
		`${peran}: keluar TIDAK menghapus basis data situs`,
		Number(sesudahKeluar?.basisData ?? 0) > 0,
		`${sesudahKeluar?.basisData} basis data tersisa`
	);
}

// ── Fase 4 · Peran silang: zona yang bukan miliknya WAJIB ditolak ───────────
// Fase 3 kini menutup setiap peran dengan menekan tombol keluar, jadi sesi ADMIN
// dibangun ULANG di sini: tanpa `keluarBersih()`, langsung di atas basis data
// yang sama. Pemulihan itu sekaligus menjadi buktinya sendiri: berpindah peran
// tidak menuntut siapa pun menghapus data situs lebih dulu.
console.log('\n── Fase 4 · Penolakan lintas zona (sesi ADMIN) ──');
const sesiAdminUlang = await masuk(String(PERAN_UJI[UserRole.ADMIN].email));
cek(
	'ADMIN dapat masuk kembali tanpa menghapus data situs',
	sesiAdminUlang.lokasi === '/admin' && sesiAdminUlang.sesiTersimpan === true,
	`lokasi=${sesiAdminUlang.lokasi} galat="${sesiAdminUlang.galat}"`
);
for (const asing of ['/awardee/aksi', '/verifikator/cerita']) {
	const hasil = await periksa(asing, 2200);
	cek(
		`ADMIN di ${asing} melihat panel penolakan`,
		hasil.ditolakGuard === true,
		`ditolakGuard=${hasil.ditolakGuard} url=${hasil.url}`
	);
}

// ── Ringkasan ───────────────────────────────────────────────────────────────
console.log(`\n${'='.repeat(78)}`);
let bermasalah = 0;
for (const b of laporan) {
	const kurus = b.panjang < AMBANG_ISI;
	// Route mana pun yang berakhir pada panel guard atau splash berarti halamannya
	// TIDAK hidup untuk peran yang seharusnya berhak: itu kegagalan, bukan bukti
	// bahwa guard bekerja. Bukti guard dikumpulkan terpisah di Fase 2 dan 4.
	const tersandera = b.ditolakGuard || b.masihSplash;
	const buruk = b.galat || b.errorKonsol.length > 0 || kurus || tersandera;
	if (buruk) bermasalah++;
	const tanda = buruk ? '✗' : '✓';
	console.log(`${tanda} ${b.path.padEnd(40)} ${String(b.panjang).padStart(6)} chr  ${b.cuplikan}`);
	if (b.galat) console.log(`    ! penanda galat di DOM`);
	if (kurus) console.log(`    ! konten terlalu sedikit (mungkin blank/redirect)`);
	if (b.ditolakGuard) console.log(`    ! panel "bukan peran Anda": sesi tidak berlaku untuk zona ini`);
	if (b.masihSplash) console.log(`    ! tersangkut splash ZoneGuard: sesi tidak selesai dipulihkan`);
	for (const e of b.errorKonsol.slice(0, 3)) console.log(`    ! konsol: ${e.slice(0, 150)}`);
}
console.log('='.repeat(78));
console.log(
	`Route diperiksa : ${laporan.length}` +
		`  (publik ${RUTE_PUBLIK.length} · awardee ${RUTE_AWARDEE.length} · ` +
		`verifikator ${RUTE_VERIFIKATOR.length} · admin ${RUTE_ADMIN.length})`
);
console.log(`Route bermasalah: ${bermasalah}`);
console.log(`Asersi guard    : ${lulusAsersi} lulus, ${gagalAsersi} gagal`);
for (const k of kegagalan) console.log(`  ✗ ${k}`);
console.log('='.repeat(78));

cdp.tutup();
proc.kill();
process.exit(bermasalah > 0 || gagalAsersi > 0 ? 1 : 0);
