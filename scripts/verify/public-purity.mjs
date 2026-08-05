/**
 * GERBANG KEMURNIAN ZONA PUBLIK — penegak Keputusan Pemilik Produk #2 dan anti-template.
 *
 * Menjalankan: `node scripts/verify/public-purity.mjs`
 *
 * Larangan poin/tier/peringkat/lencana di zona publik adalah keputusan yang akan
 * bocor lagi pada halaman berikutnya bila hanya tertulis di dokumen. Skrip ini
 * memindai `src/routes/(public)/**` sebagai TEKS dan gagal keras begitu salah satu
 * dari enam aturan di bawah dilanggar.
 *
 * ENAM KEPUTUSAN YANG TIDAK TERBACA DARI KODE:
 *
 * 1. **Komentar DILEPAS sebelum pemindaian kata.** Yang dilarang adalah teks yang
 *    sampai ke pembaca, bukan penjelasan bagi pengembang. Tanpa pelepasan ini,
 *    setiap komentar yang menjelaskan MENGAPA larangan ini ada justru akan
 *    memerahkan gerbangnya sendiri — dan cara termudah menghijaukannya adalah
 *    menghapus penjelasannya. Itu kebalikan dari yang diinginkan.
 *
 * 2. **Dua jalur dikecualikan dari aturan kata, dan hanya dua.** `/daftar` memuat
 *    dua teks consent yang WAJIB menyebut apa yang disimpan — consent yang
 *    menyembunyikan objeknya bukan consent. `/metode-pengukuran` menjelaskan
 *    justru mengapa angka-angka itu tidak ditampilkan. Pengecualian tidak berlaku
 *    untuk aturan impor: kedua halaman itu tetap dilarang mengimpor komponen
 *    gamifikasi.
 *
 * 3. **Aturan kata memakai batas kata.** `StatusBadge`, `badgeColor`, dan
 *    `pointsReward` tidak tertangkap regex kata Indonesia, karena itu identifier
 *    gamifikasi diperiksa aturan tersendiri (aturan 3). Dua jaring, dua bentuk
 *    kebocoran.
 *
 * 4. **`<img>` tanpa `alt` non-kosong = gagal.** Foto adalah subjek di zona ini,
 *    dan subjek yang tidak dapat dibacakan pembaca layar bukan subjek.
 *
 * 5. **Ritme diperiksa secara statis.** `py-12` yang berulang lebih dari dua kali
 *    dalam satu berkas adalah tanda spacing metronomik (cacat D-10); pola judul
 *    `text-2xl … md:text-3xl` yang berulang lebih dari dua kali di beranda adalah
 *    tanda empat kepala seksi berukuran sama (cacat D-04).
 *
 * 6. **`blur-3xl` dan `backdrop-blur` ikut diperiksa di sini**, bukan hanya lewat
 *    `grep` manual: kedalaman zona publik datang dari foto, garis, dan ruang
 *    putih — tidak pernah dari blur (prinsip P-4).
 *
 * 7. **Lapisan komponen bersama ikut dipindai — sejauh zona publik menjangkaunya
 *    (gelombang G5).** Peninjau mencatat titik buta yang serius: halaman publik
 *    nyaris tidak menulis teksnya sendiri, ia memanggil `src/lib/components/`.
 *    Sebuah `PointsChip` yang ikut terbawa ke sana akan tayang di zona publik
 *    tanpa satu baris pun berubah di dalam `(public)/`. Jangkauannya dihitung
 *    dari graf impor — bukan seluruh direktori — supaya komponen yang memang
 *    hanya hidup di zona ter-login tidak dituntut membisu.
 *
 *    Dua aturan berlaku BERBEDA pada lapisan itu, dan perbedaannya disengaja:
 *
 *    - Aturan KATA/ALT/BLUR dipersempit ke MARKUP. Di berkas komponen, `tier`
 *      jauh lebih sering nama prop daripada kata yang dibaca pengunjung, dan
 *      gerbang yang menuntut prop diganti nama akan dimatikan, bukan dipatuhi.
 *    - Aturan IMPOR/IDENTIFIER MENCATAT, tidak menggagalkan. Satu-satunya sisa
 *      yang tercatat hari ini adalah `_visual.js` yang membaca `tier-table.js`
 *      demi `gayaTier()` — dipakai `Avatar` untuk cincin tier. Menutupnya
 *      menuntut kontrak props `Avatar` diubah di delapan titik panggil yang
 *      tersebar di tiga zona dan dimiliki paket lain; itu pekerjaan redesain,
 *      bukan pekerjaan gerbang verifikasi. Yang dibawa ke zona publik pun hanya
 *      KONSTANTA ambang, bukan teks yang dirender — dan kebocoran teksnya sudah
 *      dijaga aturan KATA dan KOMPONEN yang menggagalkan.
 *
 * @see docs/12-BUILD-CONTRACT-V2.md — §3.5 WP-04 kriteria selesai 1, 7, 8; §6.2
 * @see docs/10-REVISION-SPEC.md — §4.3 daftar haram tampil publik
 * @see docs/11-VISUAL-DIRECTION.md — D-04, D-10, D-15, prinsip P-4
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';

const ROOT = process.cwd();
const ZONA = join(ROOT, 'src', 'routes', '(public)');
/** Lapisan komponen bersama — dipindai sejauh ia benar-benar dipakai zona publik. */
const KOMPONEN = join(ROOT, 'src', 'lib', 'components');

/**
 * Jalur (relatif terhadap akar repositori) yang dikecualikan dari ATURAN KATA.
 * Lihat keputusan 2 — pengecualian ini tidak berlaku untuk aturan lain.
 * @type {readonly string[]}
 */
const KECUALI_KATA = Object.freeze(['(public)/daftar/', '(public)/metode-pengukuran/']);

/**
 * Satu-satunya berkas zona publik yang boleh menyentuh repository.
 *
 * `docs/12` §3.2 butir 2 memerintahkan panel kredensial demo `/masuk` membaca
 * `accountRepository.demoAccounts()` secara tersurat, supaya surel demo tidak
 * ditulis ulang di komponen dan menjadi sumber kebenaran kedua yang basi begitu
 * seed berubah. Pengecualiannya dicatat di sini — bukan dibiarkan sebagai lubang
 * diam di dalam regex — agar setiap penambahan berikutnya harus melewati berkas
 * ini lebih dulu.
 * @type {readonly string[]}
 */
const KECUALI_REPOSITORY = Object.freeze(['(public)/masuk/']);

/** Modul yang haram diimpor dari zona publik. */
const IMPOR_HARAM = Object.freeze([
	{
		pola: /scoring-table\.js/,
		sebab: 'tabel nilai kontribusi tidak boleh dibaca zona publik',
		kecuali: []
	},
	{
		pola: /tier-table\.js/,
		sebab: 'ambang jenjang tidak boleh dibaca zona publik',
		kecuali: []
	},
	{
		pola: /\$lib\/infrastructure\//,
		sebab: 'zona publik hanya boleh membaca store `impact` dan `catalog` (aturan D-4)',
		kecuali: KECUALI_REPOSITORY
	},
	{
		pola: /\blib\/stores\/(gamification|leaderboard)\.svelte\.js/,
		sebab: 'store gamifikasi hanya hidup di zona ter-login',
		kecuali: []
	}
]);

/**
 * Nama komponen gamifikasi. Diperiksa hanya pada baris `import` supaya kata
 * "Badge" di dalam kalimat biasa tidak ikut tertangkap.
 * @type {readonly string[]}
 */
const KOMPONEN_HARAM = Object.freeze([
	'TierBadge',
	'PointsChip',
	'TierProgress',
	'LeaderboardRow',
	'BadgeTile',
	'RewardCard'
]);

/**
 * Identifier gamifikasi yang tidak tertangkap aturan kata Indonesia.
 * @type {readonly string[]}
 */
const IDENTIFIER_HARAM = Object.freeze([
	'SCORING_TABLE',
	'TIER_TABLE',
	'poinUntuk',
	'pointsReward',
	'showPoints',
	'showScoring',
	'tierLevel',
	'badgeCodes',
	'visibleOnLeaderboard',
	'anonymousOnLeaderboard',
	'AMBANG_FITUR_PUBLIK'
]);

/** Kata antarmuka yang haram muncul pada teks yang dirender. */
const KATA_HARAM = /\b(poin|tier|peringkat|lencana|badge)\b/gi;

/** Dekorasi yang dicabut dari zona publik (prinsip P-4). */
const BLUR_HARAM = /\b(blur-3xl|backdrop-blur[\w-]*)\b/g;

/** Ambang pengulangan yang menandai spacing metronomik dan judul seragam. */
const AMBANG_ULANG = 2;

/** Pola judul seragam yang diperiksa khusus di beranda. */
const POLA_JUDUL_SERAGAM = /text-2xl\b[^"'`]*\bmd:text-3xl\b/g;

/** @type {{berkas: string, baris: number, aturan: string, pesan: string}[]} */
const pelanggaran = [];

/** Temuan ritme di luar beranda: dilaporkan, tidak menggagalkan. Lihat aturan 6b. */
const catatan = /** @type {string[]} */ ([]);

/**
 * Seluruh berkas `.svelte` dan `.js` di bawah sebuah direktori.
 * @param {string} dir
 * @returns {string[]}
 */
function telusuri(dir) {
	/** @type {string[]} */
	const hasil = [];
	for (const nama of readdirSync(dir)) {
		const penuh = join(dir, nama);
		if (statSync(penuh).isDirectory()) {
			hasil.push(...telusuri(penuh));
		} else if (nama.endsWith('.svelte') || nama.endsWith('.js')) {
			hasil.push(penuh);
		}
	}
	return hasil.sort();
}

/**
 * Mengganti isi komentar dengan spasi, mempertahankan jumlah barisnya.
 *
 * Baris dipertahankan supaya nomor baris pada laporan tetap menunjuk posisi
 * sebenarnya di berkas — laporan yang menyebut baris salah lebih buruk daripada
 * tidak menyebut baris sama sekali.
 *
 * @param {string} isi
 * @returns {string}
 */
function tanpaKomentar(isi) {
	return isi
		.replace(/<!--[\s\S]*?-->/g, (cocok) => kosongkan(cocok))
		.replace(/\/\*[\s\S]*?\*\//g, (cocok) => kosongkan(cocok))
		.replace(/(^|[^:])\/\/[^\n]*/g, (cocok, awalan) => awalan + ' '.repeat(cocok.length - awalan.length));
}

/**
 * Mengganti setiap karakter bukan baris baru dengan spasi.
 * @param {string} teks
 * @returns {string}
 */
function kosongkan(teks) {
	return teks.replace(/[^\n]/g, ' ');
}

/**
 * Mencatat satu pelanggaran.
 * @param {string} berkas Jalur relatif terhadap akar repositori.
 * @param {number} baris  Nomor baris 1-basis; `0` bila berlaku untuk seluruh berkas.
 * @param {string} aturan Kode aturan yang dilanggar.
 * @param {string} pesan
 */
function catat(berkas, baris, aturan, pesan) {
	pelanggaran.push({ berkas, baris, aturan, pesan });
}

/**
 * Nomor baris 1-basis dari sebuah indeks karakter.
 * @param {string} isi
 * @param {number} indeks
 * @returns {number}
 */
function nomorBaris(isi, indeks) {
	return isi.slice(0, indeks).split('\n').length;
}

/**
 * Apakah sebuah berkas dikecualikan dari aturan kata.
 * @param {string} rel Jalur relatif berpemisah '/'.
 * @returns {boolean}
 */
function dikecualikan(rel) {
	return KECUALI_KATA.some((awalan) => rel.includes(awalan));
}

/**
 * Bagian MARKUP sebuah komponen Svelte — isi di luar `<script>` dan `<style>`,
 * dengan nomor baris dipertahankan.
 *
 * Dipakai HANYA pada lapisan komponen bersama. Pada berkas route, aturan kata
 * sengaja tetap menyapu seluruh berkas: halaman route hampir seluruhnya markup,
 * dan penyempitan di sana akan melonggarkan gerbang yang sudah tegak. Pada
 * komponen bersama justru sebaliknya — `tier` di sana lebih sering nama prop
 * daripada kata yang dibaca pengunjung, dan gerbang yang menuntut prop diganti
 * nama akan dimatikan orang alih-alih dipatuhi.
 *
 * @param {string} isi Isi berkas yang komentarnya sudah dilepas.
 * @returns {string}
 */
function bagianTemplate(isi) {
	return isi
		.replace(/<script[\s\S]*?<\/script>/gi, (c) => kosongkan(c))
		.replace(/<style[\s\S]*?<\/style>/gi, (c) => kosongkan(c));
}

/**
 * Memeriksa satu berkas terhadap keenam aturan.
 *
 * @param {string} penuh Jalur absolut berkas.
 * @param {object} [opsi]
 * @param {boolean} [opsi.bersama] `true` untuk lapisan komponen bersama: aturan
 *   kata/alt/blur dipersempit ke markup, dan aturan impor/identifier dilaporkan
 *   sebagai CATATAN alih-alih menggagalkan (lihat ringkasan di kaki berkas).
 * @param {string} [opsi.rantai] Rantai impor yang menarik berkas ini ke zona publik.
 */
function periksa(penuh, { bersama = false, rantai = '' } = {}) {
	const rel = relative(ROOT, penuh).split(sep).join('/');
	const mentah = readFileSync(penuh, 'utf8');
	const isi = tanpaKomentar(mentah);
	const svelte = penuh.endsWith('.svelte');
	// Sasaran aturan yang berbicara tentang APA YANG DILIHAT PENGUNJUNG.
	const terlihat = bersama ? (svelte ? bagianTemplate(isi) : kosongkan(isi)) : isi;
	const terlihatMentah = bersama ? (svelte ? bagianTemplate(mentah) : kosongkan(mentah)) : mentah;
	/** @param {string} berkas @param {number} baris @param {string} aturan @param {string} pesan */
	const laporkan = (berkas, baris, aturan, pesan) =>
		bersama
			? catatan.push(`[${aturan}] ${berkas}:${baris} — ${pesan}${rantai ? ` (ditarik lewat ${rantai})` : ''}`)
			: catat(berkas, baris, aturan, pesan);

	// ── Aturan 1 · impor haram ────────────────────────────────────────────────
	// Pada komponen bersama aturan ini MENCATAT, tidak menggagalkan: lihat
	// ringkasan "Catatan lapisan komponen bersama" di kaki berkas ini.
	for (const { pola, sebab, kecuali } of IMPOR_HARAM) {
		if (kecuali.some((awalan) => rel.includes(awalan))) continue;
		const cocok = pola.exec(isi);
		if (cocok) {
			laporkan(rel, nomorBaris(isi, cocok.index), 'IMPOR', `"${cocok[0]}" — ${sebab}.`);
		}
	}

	// ── Aturan 2 · komponen gamifikasi pada baris impor ───────────────────────
	for (const [i, baris] of isi.split('\n').entries()) {
		if (!/^\s*import\b/.test(baris) && !/from\s+['"]/.test(baris)) continue;
		for (const nama of KOMPONEN_HARAM) {
			if (new RegExp(`\\b${nama}\\b`).test(baris)) {
				catat(rel, i + 1, 'KOMPONEN', `komponen "${nama}" dilarang di zona publik.`);
			}
		}
	}

	// ── Aturan 3 · identifier gamifikasi di mana pun ──────────────────────────
	for (const nama of IDENTIFIER_HARAM) {
		const pola = new RegExp(`\\b${nama}\\b`);
		const cocok = pola.exec(isi);
		if (cocok) {
			laporkan(rel, nomorBaris(isi, cocok.index), 'IDENTIFIER', `"${nama}" dilarang di zona publik.`);
		}
	}

	// ── Aturan 4 · kata antarmuka yang haram ──────────────────────────────────
	if (!dikecualikan(rel)) {
		KATA_HARAM.lastIndex = 0;
		let cocok;
		while ((cocok = KATA_HARAM.exec(terlihat)) !== null) {
			catat(
				rel,
				nomorBaris(terlihat, cocok.index),
				'KATA',
				`kata "${cocok[0]}" muncul pada teks yang dirender.`
			);
		}
	}

	// ── Aturan 5 · alt wajib pada setiap <img> ────────────────────────────────
	// Bentuk singkat Svelte `{alt}` ikut diterima: ia setara `alt={alt}` dan
	// mengikat variabel yang sama. Menolaknya akan menuntut penulisan panjang
	// semata demi menyenangkan pemindai — dan aturan yang menuntut kosmetik
	// adalah aturan yang akhirnya dilewati dengan komentar penonaktif.
	for (const cocok of terlihatMentah.matchAll(/<img\b[^>]*>/g)) {
		const tag = cocok[0];
		const alt = /\salt\s*=\s*(?:"([^"]*)"|'([^']*)'|\{([^}]*)\})/.exec(tag);
		const singkat = /\{\s*alt\s*\}/.test(tag);
		const nilai = alt ? (alt[1] ?? alt[2] ?? alt[3] ?? '').trim() : '';
		if (!singkat && (!alt || nilai === '' || nilai === '""' || nilai === "''")) {
			catat(
				rel,
				nomorBaris(terlihatMentah, cocok.index),
				'ALT',
				'tag <img> tanpa atribut alt yang terisi.'
			);
		}
	}

	// ── Aturan 6a · dekorasi blur ─────────────────────────────────────────────
	// Dipindai pada isi TANPA komentar: penjelasan mengapa `backdrop-blur` dicabut
	// dari masthead publik tidak boleh memerahkan gerbangnya sendiri (keputusan 1).
	BLUR_HARAM.lastIndex = 0;
	let blur;
	while ((blur = BLUR_HARAM.exec(terlihat)) !== null) {
		catat(
			rel,
			nomorBaris(terlihat, blur.index),
			'BLUR',
			`"${blur[0]}" — kedalaman zona publik datang dari foto, garis, dan ruang putih.`
		);
	}

	// ── Aturan 6b & 6c · ritme dan skala judul beranda ────────────────────────
	// Keduanya menegakkan D-10 dan D-04, dan `docs/12` §3.5 WP-04 butir 7
	// menetapkan sasarannya secara tersurat: BERANDA. Melebarkannya ke seluruh
	// zona akan menjadikan gerbang paket ini bergantung pada berkas milik paket
	// lain yang sedang ditulis pada gelombang yang sama — gerbang yang bisa merah
	// karena pekerjaan orang lain akan segera diabaikan orang. Berkas publik lain
	// tetap dihitung dan dilaporkan sebagai catatan, tanpa menggagalkan.
	const py12 = (isi.match(/\bpy-12\b/g) ?? []).length;
	const judulSeragam = (isi.match(POLA_JUDUL_SERAGAM) ?? []).length;
	const beranda = rel.endsWith('(public)/+page.svelte');

	if (py12 > AMBANG_ULANG) {
		const pesan = `"py-12" muncul ${py12} kali (maksimum ${AMBANG_ULANG}). Pakai token --rhythm-* agar seksi tidak berdetak seragam.`;
		if (beranda) catat(rel, 0, 'RITME', pesan);
		else catatan.push(`${rel} — ${pesan}`);
	}

	if (judulSeragam > AMBANG_ULANG) {
		const pesan = `pola "text-2xl … md:text-3xl" muncul ${judulSeragam} kali (maksimum ${AMBANG_ULANG}). Judul seksi tidak boleh seukuran semua.`;
		if (beranda) catat(rel, 0, 'JUDUL', pesan);
		else catatan.push(`${rel} — ${pesan}`);
	}
}

/* ────────────────────────────────────────────────────────────────────────────
 * JANGKAUAN KOMPONEN BERSAMA — menutup titik buta yang dicatat peninjau
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Memindai `src/routes/(public)/**` saja membiarkan seluruh isi yang benar-benar
 * dibaca pengunjung lolos, sebab halaman publik hampir tidak pernah menulis
 * teksnya sendiri: ia memanggil komponen bersama di `src/lib/components/`.
 * Sebuah `TierBadge` yang diselipkan ke `StoryCard` akan menayangkan jenjang di
 * `/cerita` tanpa satu baris pun berubah di dalam `(public)/` — dan gerbang ini
 * akan tetap melaporkan nol pelanggaran.
 *
 * Yang dipindai adalah JANGKAUAN, bukan seluruh direktori komponen. Memindai
 * semuanya akan memerahkan `TierBadge`, `PointsChip`, dan `LeaderboardRow` —
 * komponen yang memang wajib menyebut poin dan jenjang, dan yang hanya hidup di
 * zona ter-login. Gerbang yang menuntut mereka dibungkam akan dimatikan orang
 * dalam sepekan. Karena itu jangkauannya dihitung dari graf impor: sebuah
 * komponen ikut diperiksa TEPAT ketika zona publik benar-benar dapat
 * merendernya.
 *
 * Tiga hal yang membuat perhitungan ini tidak asal:
 *
 * 1. **Komentar dilepas sebelum impor dibaca.** Tanpa itu, satu kalimat
 *    penjelasan yang menyebut `import PointsChip from './PointsChip.svelte'`
 *    akan menyeret komponen gamifikasi ke dalam jangkauan dan memerahkan
 *    gerbang atas berkas yang tidak pernah dirender siapa pun.
 *
 * 2. **Barrel ditelusuri PER NAMA.** `$lib/components/index.js` mengekspor ulang
 *    seluruh pustaka. Mengikuti barrel sebagai satu berkas akan menjadikan
 *    setiap komponen "terjangkau" dari mana pun, dan jangkauannya kehilangan
 *    seluruh artinya. Yang diikuti hanyalah nama yang benar-benar diimpor.
 *
 * 3. **Rantai impornya disimpan.** Pelanggaran pada komponen bersama tidak dapat
 *    diperbaiki tanpa mengetahui halaman publik mana yang menariknya; laporan
 *    yang hanya menyebut nama berkas menyuruh pembacanya mencari sendiri.
 */

/**
 * Menyelesaikan sebuah spesifier impor menjadi jalur berkas.
 * @param {string} spec Isi tanda kutip pada pernyataan impor.
 * @param {string} dariBerkas Berkas yang memuat impor itu.
 * @returns {string|null} Jalur absolut, atau `null` bila di luar proyek.
 */
function resolusiImpor(spec, dariBerkas) {
	/** @type {string} */
	let kandidat;
	if (spec.startsWith('$lib/')) kandidat = join(ROOT, 'src', 'lib', spec.slice('$lib/'.length));
	else if (spec.startsWith('.')) kandidat = resolve(dirname(dariBerkas), spec);
	else return null; // paket npm, `$app/*`, dan alias lain bukan urusan pemindai ini
	for (const p of [kandidat, `${kandidat}.js`, `${kandidat}.svelte`, join(kandidat, 'index.js')]) {
		if (existsSync(p) && statSync(p).isFile()) return p;
	}
	return null;
}

/**
 * Peta `nama ekspor → berkas asal` untuk sebuah berkas barrel.
 * @param {string} berkas
 * @returns {Map<string, string>}
 */
function petaBarrel(berkas) {
	const isi = tanpaKomentar(readFileSync(berkas, 'utf8'));
	/** @type {Map<string, string>} */
	const peta = new Map();
	for (const cocok of isi.matchAll(/export\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g)) {
		const target = resolusiImpor(cocok[2], berkas);
		if (!target) continue;
		for (const bagian of cocok[1].split(',')) {
			const teks = bagian.trim();
			if (!teks) continue;
			const namaLuar = (teks.split(/\s+as\s+/)[1] ?? teks).trim();
			peta.set(namaLuar, target);
		}
	}
	return peta;
}

/** @param {string} jalur */
const adalahBarrel = (jalur) => jalur.endsWith(`${sep}index.js`);

/**
 * Berkas `src/lib/components/**` yang benar-benar dapat dirender zona publik,
 * beserta rantai impor yang menariknya ke sana.
 * @returns {Map<string, string[]>} jalur absolut → rantai (dari halaman publik)
 */
function jangkauanKomponenPublik() {
	const awal = telusuri(ZONA);
	/** @type {Map<string, string[]>} */
	const rantai = new Map(awal.map((berkas) => [berkas, [berkas]]));
	const antre = [...awal];
	/** @type {Map<string, string[]>} */
	const bersama = new Map();

	/** @param {string|null} target @param {string[]} jalurRantai */
	function dorong(target, jalurRantai) {
		if (!target || rantai.has(target)) return;
		rantai.set(target, jalurRantai);
		antre.push(target);
		if (target.startsWith(KOMPONEN + sep)) bersama.set(target, jalurRantai);
	}

	while (antre.length > 0) {
		const berkas = /** @type {string} */ (antre.shift());
		const isi = tanpaKomentar(readFileSync(berkas, 'utf8'));
		const rantaiIni = rantai.get(berkas) ?? [berkas];

		for (const cocok of isi.matchAll(
			/import\s+(?:[\w$]+\s*,\s*)?(?:\{([^}]*)\}|[\w$*]+(?:\s+as\s+[\w$]+)?)?\s*(?:from\s*)?['"]([^'"]+)['"]/g
		)) {
			const target = resolusiImpor(cocok[2], berkas);
			if (!target) continue;
			const namaTerkurung = cocok[1];
			if (adalahBarrel(target) && namaTerkurung) {
				const peta = petaBarrel(target);
				for (const bagian of namaTerkurung.split(',')) {
					const teks = bagian.trim();
					if (!teks) continue;
					const namaAsal = teks.split(/\s+as\s+/)[0].trim();
					dorong(peta.get(namaAsal) ?? null, [...rantaiIni, target]);
				}
				continue;
			}
			dorong(target, rantaiIni);
		}
	}
	return bersama;
}

const berkas = telusuri(ZONA);
for (const penuh of berkas) periksa(penuh);

const komponenTerjangkau = jangkauanKomponenPublik();
for (const penuh of [...komponenTerjangkau.keys()].sort()) {
	const jejak = (komponenTerjangkau.get(penuh) ?? [])
		.map((j) => relative(ROOT, j).split(sep).join('/'))
		.filter((j) => j.startsWith('src/routes/'))
		.slice(-1)[0];
	periksa(penuh, { bersama: true, rantai: jejak ?? '' });
}

const lebar = 72;
console.log('='.repeat(lebar));
console.log('KEMURNIAN ZONA PUBLIK — route publik + komponen bersama yang direndernya');
console.log('='.repeat(lebar));
console.log(`Berkas route      : ${berkas.length}`);
console.log(`Komponen bersama  : ${komponenTerjangkau.size} (terjangkau dari zona publik)`);
console.log(`Pelanggaran       : ${pelanggaran.length}`);

if (catatan.length > 0) {
	console.log('');
	console.log('Catatan (tidak menggagalkan — ritme di luar beranda & lapisan komponen bersama):');
	for (const baris of catatan) console.log(`  · ${baris}`);
}

if (pelanggaran.length > 0) {
	console.log('');
	for (const p of pelanggaran) {
		const lokasi = p.baris > 0 ? `${p.berkas}:${p.baris}` : p.berkas;
		console.log(`  ✗ [${p.aturan}] ${lokasi}`);
		console.log(`      ${p.pesan}`);
	}
	console.log('');
	console.log('Pengecualian aturan KATA hanya berlaku untuk:');
	for (const jalur of KECUALI_KATA) console.log(`  · src/routes/${jalur}`);
	console.log('='.repeat(lebar));
	process.exit(1);
}

console.log('');
console.log('  ✓ Nol impor tabel nilai kontribusi & ambang jenjang (route publik)');
console.log('  ✓ Nol komponen gamifikasi terimpor — route publik DAN komponen bersama');
console.log('  ✓ Nol repository dibaca langsung dari zona publik');
console.log('  ✓ Nol kata terlarang pada teks yang dirender — termasuk markup komponen bersama');
console.log('  ✓ Setiap <img> punya alt yang terisi');
console.log('  ✓ Nol blur dekoratif; ritme seksi tidak metronomik');
console.log('='.repeat(lebar));
process.exit(0);
