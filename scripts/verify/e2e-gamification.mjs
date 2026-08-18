/**
 * Uji interaksi gamifikasi end-to-end di zona AWARDEE.
 *
 * Ini memverifikasi janji utama mockup: menekan tombol aksi benar-benar menambah
 * poin, poin itu tersimpan (Dexie), dan tetap ada setelah halaman dimuat ulang.
 * Tanpa uji ini, "interaktif penuh" hanya klaim.
 *
 * ── Mengapa ada asersi "poin TIDAK nol setelah muat ulang keras" ──────────────
 * `session.restore()` mengembalikan `awardeeId` dari localStorage SEKETIKA,
 * sedangkan entity `session.awardee` baru terisi oleh `hydrate()` yang asinkron.
 * `gamification.refresh()` yang tiba di antara dua saat itu melihat
 * `awardee === null` padahal orangnya jelas masih masuk — dan versi lama menyamakan
 * keadaan itu dengan "tidak ada sesi", lalu memanggil `reset()`. Akibatnya poin,
 * jenjang, dan lencana terkunci pada NOL sampai ada yang memicu penyegaran ulang.
 *
 * Bug itu sudah diperbaiki di `src/lib/stores/gamification.svelte.js` (`refresh()`
 * menunggu `hydrate()` selesai lebih dulu). Regresi seperti ini kembali diam-diam:
 * halaman tetap merender, tidak ada galat konsol, hanya angkanya yang salah.
 * Karena itu uji ini memakai anggota yang saldo seed-nya BUKAN nol, dan mengulang
 * muat ulang keras beberapa kali — satu kali muat ulang bisa saja menang balapan.
 *
 * Prasyarat: server dev berjalan (`npm run dev -- --port 5177`).
 * Jalankan: node scripts/verify/e2e-gamification.mjs [baseUrl]
 *
 * @see docs/12-BUILD-CONTRACT-V2.md — §6.2 baris `e2e-gamification.mjs`
 */

import { spawn } from 'node:child_process';

import { buildSeed } from '../../src/lib/infrastructure/seed/seed-data.js';
import { SANDI_DEMO } from '../../src/lib/infrastructure/seed/accounts.js';
import { UserRole } from '../../src/lib/domain/constants/roles.js';
import { SCORING_TABLE } from '../../src/lib/domain/constants/scoring-table.js';

const BASE = process.argv[2] ?? 'http://localhost:5177';
const BROWSER =
	process.env.BROWSER_BIN ?? '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser';
const PORT = 9334;

/** Berapa kali muat ulang keras diulang untuk memancing balapan hidrasi. */
const ULANGAN_MUAT_ULANG = 3;

/** Nilai poin kanonik — dibaca dari tabel skor, bukan ditulis ulang sebagai literal. */
const NILAI_POIN_SAH = SCORING_TABLE.map((aturan) => aturan.points);

const tidur = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Pilih anggota uji: saldo seed WAJIB bukan nol ───────────────────────────
// Menguji "poin tidak nol" pada anggota yang memang bersaldo nol akan hijau
// selamanya tanpa membuktikan apa pun.
const seed = buildSeed();
const anggotaUji = [...seed.awardees].sort((a, b) => b.points - a.points)[0];
const akunUji = seed.accounts.find(
	(a) => a.role === UserRole.AWARDEE && a.awardeeId === anggotaUji?.id
);
if (!anggotaUji || anggotaUji.points <= 0 || !akunUji) {
	console.error('Seed tidak menyediakan awardee bersaldo poin > 0 beserta akunnya.');
	process.exit(1);
}

class Cdp {
	#ws;
	#id = 0;
	#menunggu = new Map();
	/** @type {string[]} */
	konsol = [];
	constructor(ws) {
		this.#ws = ws;
		ws.addEventListener('message', (ev) => {
			const p = JSON.parse(ev.data);
			if (p.id && this.#menunggu.has(p.id)) {
				const { resolve, reject } = this.#menunggu.get(p.id);
				this.#menunggu.delete(p.id);
				p.error ? reject(new Error(JSON.stringify(p.error))) : resolve(p.result);
				return;
			}
			if (p.method === 'Runtime.exceptionThrown') {
				this.konsol.push(p.params.exceptionDetails?.exception?.description ?? 'exception');
			}
		});
	}
	static async connect(url) {
		const ws = new WebSocket(url);
		await new Promise((res, rej) => {
			ws.addEventListener('open', res, { once: true });
			ws.addEventListener('error', rej, { once: true });
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
	async evaluate(e) {
		const r = await this.kirim('Runtime.evaluate', {
			expression: e,
			returnByValue: true,
			awaitPromise: true
		});
		if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? 'eval error');
		return r.result?.value;
	}
	tutup() {
		this.#ws.close();
	}
}

const proc = spawn(
	BROWSER,
	[
		'--headless=new',
		'--disable-gpu',
		'--no-sandbox',
		'--no-first-run',
		`--remote-debugging-port=${PORT}`,
		'--user-data-dir=/tmp/pfriends-e2e-gami',
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

let lulus = 0;
let gagal = 0;
/** @type {string[]} */
const catatan = [];
/** @param {string} nama @param {boolean} kondisi @param {string} [detail] */
function cek(nama, kondisi, detail = '') {
	if (kondisi) {
		lulus++;
		console.log(`  ✓ ${nama}`);
	} else {
		gagal++;
		console.log(`  ✗ ${nama}${detail ? ` — ${detail}` : ''}`);
		catatan.push(nama);
	}
}

/** Membaca total poin anggota aktif langsung dari Dexie (sumber kebenaran). */
async function poinDariDb() {
	return cdp.evaluate(`(async () => {
		const sesi = JSON.parse(localStorage.getItem('pfriends_session') || '{}');
		const id = sesi.awardeeId ?? sesi.id ?? sesi.awardee?.id;
		const db = await new Promise((resolve) => {
			const req = indexedDB.open('PfriendsDB');
			req.onsuccess = () => resolve(req.result);
			req.onerror = () => resolve(null);
		});
		if (!db) return { error: 'db tidak terbuka' };
		const namaTabel = [...db.objectStoreNames];
		const tabelAktivitas = namaTabel.find((n) => /activit|aktivit/i.test(n));
		if (!tabelAktivitas) return { error: 'tabel aktivitas tidak ditemukan', namaTabel };
		const rows = await new Promise((resolve) => {
			const tx = db.transaction(tabelAktivitas, 'readonly');
			const req = tx.objectStore(tabelAktivitas).getAll();
			req.onsuccess = () => resolve(req.result);
			req.onerror = () => resolve([]);
		});
		const milik = rows.filter((r) => r.awardeeId === id);
		const total = milik
			.filter((r) => !r.status || /AWARDED|DIBERIKAN/i.test(r.status))
			.reduce((s, r) => s + (r.points ?? 0), 0);
		return { id, jumlahAktivitas: milik.length, total };
	})()`);
}

/**
 * Membaca angka poin yang BENAR-BENAR TERPAJANG di kartu dasbor.
 *
 * Sengaja dibaca dari DOM, bukan dari store: balapan hidrasi yang diuji di sini
 * persisnya adalah keadaan ketika buku besar benar (Dexie) tetapi yang dirender
 * nol. Membaca store akan melewatkan bug itu.
 *
 * @returns {Promise<number|null>} `null` bila kartu poinnya tidak ditemukan.
 */
async function poinDiLayar() {
	// Bendera `i` wajib: label kartu ditulis "Poin Kontribusi" di sumber, tetapi
	// `text-transform: uppercase` membuat `innerText` mengembalikannya kapital.
	//
	// `[^0-9]*` — bukan `\s*` — karena dasbor awardee yang dirombak 4 Agustus 2026
	// menulis "Poin Kontribusi terkumpul" lalu angkanya di baris berikutnya. Pola
	// lama menuntut angka menempel langsung sesudah label, sehingga cocoknya gagal
	// dan seluruh asersi saldo membaca `null` — bukan karena poinnya salah,
	// melainkan karena satu kata sisipan.
	return cdp.evaluate(`(() => {
		const teks = document.body.innerText || '';
		const cocok = teks.match(/Poin Kontribusi[^0-9]*([0-9.,]+)/i);
		if (!cocok) return null;
		return Number(cocok[1].replace(/[.,]/g, ''));
	})()`);
}

console.log(
	`\n── 1. Masuk lewat formulir sebagai ${akunUji.email} (saldo seed ${anggotaUji.points} poin) ──`
);
// Profil peramban dipakai ulang antar-jalannya skrip. Dua sisa yang merusak uji
// ini bila tidak dibersihkan: (a) sesi di localStorage membuat `/masuk` langsung
// mengalihkan ke beranda peran sehingga formulirnya tidak pernah ada untuk diisi;
// (b) IndexedDB berisi aksi dari jalannya skrip sebelumnya, sehingga saldo awal
// tidak lagi sama dengan seed dan kuota harian aksi cepat sudah terpakai.
// `Storage.clearDataForOrigin` menghapus keduanya sekaligus, termasuk koneksi
// Dexie yang masih terbuka — `indexedDB.deleteDatabase()` dari dalam halaman akan
// tersangkut `blocked`.
await cdp.kirim('Page.navigate', { url: 'about:blank' });
await tidur(400);
await cdp.kirim('Storage.clearDataForOrigin', {
	origin: new URL(BASE).origin,
	storageTypes: 'all'
});
await tidur(400);

await cdp.kirim('Page.navigate', { url: BASE + '/masuk' });
await tidur(2200); // muat Dexie + jalankan seed sebelum kartu terender

// Sejak revisi 4 Agustus 2026 halaman `/masuk` memajang kartu yang tinggal diklik,
// bukan formulir surel + sandi. Kartu dicoba lebih dulu karena itulah jalur yang
// dipakai manusia; formulir manual dipakai sebagai cadangan, sebab hanya enam dari
// 60 awardee yang dipajang dan akun uji dipilih dari urutan seed.
const lewatKartu = await cdp.evaluate(
	`(() => {
		const kartu = document.querySelector('[data-akun=' + ${JSON.stringify(JSON.stringify(akunUji.email))} + ']');
		if (!kartu) return false;
		kartu.click();
		return true;
	})()`
);

let terisi = lewatKartu === true;
if (!terisi) {
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

	terisi = await cdp.evaluate(`(() => {
		const isi = (el, nilai) => {
			if (!el) return false;
			const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
			setter.call(el, nilai);
			el.dispatchEvent(new Event('input', { bubbles: true }));
			return true;
		};
		return (
			isi(document.querySelector('#masuk-email'), ${JSON.stringify(akunUji.email)}) &&
			isi(document.querySelector('#masuk-sandi'), ${JSON.stringify(SANDI_DEMO)})
		);
	})()`);
	await tidur(300);
	await cdp.evaluate(`document.querySelector('form')?.requestSubmit()`);
}
cek('jalan masuk tersedia dan dijalankan (kartu atau formulir manual)', terisi === true);
await tidur(3200);

cek('berhasil masuk ke /awardee', (await cdp.evaluate('location.pathname')) === '/awardee');
cek(
	'sesi menunjuk awardee yang benar',
	(await cdp.evaluate(`JSON.parse(localStorage.getItem('pfriends_session')||'{}').awardeeId`)) ===
		anggotaUji.id
);

const awal = await poinDariDb();
console.log(`     poin awal dari IndexedDB: ${JSON.stringify(awal)}`);
cek('poin anggota terbaca dari Dexie', typeof awal?.total === 'number', JSON.stringify(awal));
cek(
	'saldo Dexie sama dengan saldo seed',
	awal.total === anggotaUji.points,
	`dexie=${awal.total} seed=${anggotaUji.points}`
);
const layarAwal = await poinDiLayar();
cek(
	'dasbor memajang saldo yang sama, bukan nol',
	layarAwal === anggotaUji.points,
	`layar=${layarAwal} seed=${anggotaUji.points}`
);

// Aksi berpoin PINDAH dari dasbor pada revisi 4 Agustus 2026. Dasbor sengaja tidak
// lagi memajangnya: susunannya dibalik supaya halaman terbaca sebagai sambutan dan
// agenda, bukan sebagai papan skor dengan empat tombol poin.
//
// Sasarannya adalah klaim baca di detail kabar, BUKAN tombol di /awardee/aksi.
// Seluruh tombol di halaman itu berlabel sama ("Ajukan untuk verifikasi") padahal
// akibatnya berbeda — aksi yang menuntut bukti dibukukan PENDING dengan 0 poin —
// dan tiga aksi yang `needsEvidence: false` justru tampil sebagai tautan ke
// halaman lain, tanpa tombol yang dapat ditekan. Yang tersisa di sana karena itu
// hanya aksi bernilai 0 poin saat ditekan: benar menurut domain, tetapi tidak
// membuktikan apa pun tentang pembukuan poin.
console.log('\n── 2. Mengklaim poin baca di detail kabar ──');
await cdp.kirim('Page.navigate', { url: BASE + '/awardee/kabar' });
await tidur(2400);

const dibuka = await cdp.evaluate(`(() => {
	const tautan = [...document.querySelectorAll('a[href*="/awardee/kabar/"]')];
	if (tautan.length === 0) return false;
	tautan[0].click();
	return true;
})()`);
console.log(`     detail kabar dibuka: ${dibuka}`);
await tidur(2200);

// Sasaran dipilih dari LABELNYA yang mencantumkan nilai poin ("· +5"), bukan dari
// satu kalimat tetap. Klaim baca hanya berlaku sekali per kabar sepanjang
// keanggotaan, jadi pada kabar yang poinnya sudah pernah diklaim tombol itu
// nonaktif — sementara tombol berbagi di halaman yang sama tetap membukukan poin.
// Mengikat uji ke satu kalimat membuatnya bergantung pada kabar mana yang kebetulan
// berada di urutan teratas.
const ditekan = await cdp.evaluate(`(() => {
	const BERPOIN = /·\\s*\\+\\s*\\d+/;
	const tombol = [...document.querySelectorAll('button')].filter((b) => !b.disabled);
	const sasaran =
		tombol.find((b) => /sudah dibaca/i.test(b.innerText || '') && BERPOIN.test(b.innerText || '')) ??
		tombol.find((b) => BERPOIN.test(b.innerText || ''));
	if (!sasaran) return { ok:false, tersedia: tombol.map(b=>(b.innerText||'').trim()).slice(0,15) };
	sasaran.click();
	return { ok:true, teks:(sasaran.innerText||'').trim().replace(/\\s+/g,' ').slice(0,60) };
})()`);
console.log(`     ditekan: ${JSON.stringify(ditekan)}`);
cek('menemukan tombol aksi yang bisa ditekan', ditekan.ok === true, JSON.stringify(ditekan.tersedia ?? []));

await tidur(2500);

// Kembali ke dasbor sebelum fase muat ulang: hanya di sanalah saldo poin tercetak
// sebagai TEKS. Di halaman lain saldo hidup di `PointsChip`, yang menaruh kata
// "Poin Kontribusi" pada atribut `title` — tidak terjangkau `innerText`, sehingga
// `poinDiLayar()` akan mengembalikan `null` dan setiap putaran gagal tanpa sebab
// yang ada hubungannya dengan hidrasi.
await cdp.kirim('Page.navigate', { url: BASE + '/awardee' });
await tidur(2400);
const sesudah = await poinDariDb();
console.log(`     poin sesudah aksi: ${JSON.stringify(sesudah)}`);

cek(
	'jumlah aktivitas bertambah setelah aksi',
	sesudah.jumlahAktivitas > awal.jumlahAktivitas,
	`sebelum=${awal.jumlahAktivitas} sesudah=${sesudah.jumlahAktivitas}`
);
cek('total poin bertambah setelah aksi', sesudah.total > awal.total, `sebelum=${awal.total} sesudah=${sesudah.total}`);

const selisih = sesudah.total - awal.total;
cek(
	`penambahan poin sesuai salah satu nilai kanonik (${NILAI_POIN_SAH.join('/')})`,
	NILAI_POIN_SAH.includes(selisih),
	`selisih=${selisih}`
);

console.log(`\n── 3. Muat ulang KERAS × ${ULANGAN_MUAT_ULANG} — regresi balapan hidrasi ──`);
for (let putaran = 1; putaran <= ULANGAN_MUAT_ULANG; putaran++) {
	// `Page.reload` memuat ulang dokumen sepenuhnya: konteks JS baru, store kosong,
	// sesi dipulihkan dari localStorage. Inilah jalur tempat balapan itu terjadi —
	// navigasi SPA tidak pernah memicunya.
	await cdp.kirim('Page.reload', { ignoreCache: true });
	await tidur(2800);

	const dbSetelah = await poinDariDb();
	const layarSetelah = await poinDiLayar();

	cek(
		`putaran ${putaran}: buku besar utuh setelah muat ulang keras`,
		dbSetelah.total === sesudah.total,
		`sesudahAksi=${sesudah.total} setelahReload=${dbSetelah.total}`
	);
	cek(
		`putaran ${putaran}: poin di layar BUKAN nol`,
		layarSetelah !== 0 && layarSetelah !== null,
		`layar=${layarSetelah} — gejala klasik reset() akibat balapan hidrasi`
	);
	cek(
		`putaran ${putaran}: poin di layar sama dengan buku besar`,
		layarSetelah === dbSetelah.total,
		`layar=${layarSetelah} dexie=${dbSetelah.total}`
	);
}

console.log('\n── 4. Zona awardee tidak tersandera guard ──');
const guard = await cdp.evaluate(
	`({ ditolak: !!document.querySelector('[data-zone-denied]'), splash: !!document.querySelector('[data-zone-splash]') })`
);
cek('tanpa panel penolakan ZoneGuard', guard.ditolak === false);
cek('tidak tersangkut splash ZoneGuard', guard.splash === false);

console.log('\n── 5. Tidak ada exception runtime ──');
cek('tanpa exception JavaScript', cdp.konsol.length === 0, cdp.konsol.slice(0, 2).join(' | '));

console.log(`\n${'='.repeat(60)}`);
console.log(`LULUS : ${lulus}`);
console.log(`GAGAL : ${gagal}`);
if (catatan.length) console.log(`Gagal pada: ${catatan.join(', ')}`);
console.log('='.repeat(60));

cdp.tutup();
proc.kill();
process.exit(gagal > 0 ? 1 : 0);
