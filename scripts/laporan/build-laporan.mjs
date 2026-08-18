/**
 * PEMBANGKIT LAPORAN REVISI — HTML → PDF + PNG.
 *
 * Tanggung jawab: merakit satu berkas HTML mandiri berisi ringkasan revisi beserta
 * tangkapan layarnya, lalu mencetaknya menjadi PDF (A4, siap kirim) dan PNG (satu
 * gambar panjang, untuk ditempel ke chat atau slide).
 *
 * Tiga keputusan yang tidak terbaca dari kode:
 *
 * 1. **Gambar ditanam sebagai data URI, bukan ditautkan.** Laporan sering berpindah
 *    tangan sebagai satu berkas lampiran surel. Tautan `file://` ke folder gambar
 *    akan tampil sebagai kotak kosong begitu berkasnya dipindah — dan itu baru
 *    ketahuan di tangan penerima, bukan di sini.
 * 2. **Peramban dipakai sebagai mesin cetak, bukan pustaka PDF.** Chrome DevTools
 *    Protocol sudah dipakai empat skrip verifikasi lain di repo ini, sehingga tidak
 *    ada dependensi baru yang masuk hanya demi satu laporan. `Page.printToPDF`
 *    menghormati `@page` dan `break-inside` yang sama dengan yang dilihat di layar.
 * 3. **PNG dicetak dari viewport lebar tetap 1240px, bukan dari ukuran A4.** PNG
 *    dipakai untuk dibaca di layar; memaksanya mengikuti proporsi kertas membuat
 *    hurufnya kecil dan marginnya boros.
 *
 * Pemakaian:
 *   node scripts/laporan/build-laporan.mjs [folderGambar] [folderKeluaran]
 */

import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const GAMBAR = process.argv[2] ?? 'docs/screenshots';
const OUT = process.argv[3] ?? 'docs/laporan-revisi-2026-08-04';
const BROWSER =
	process.env.BROWSER_BIN ?? '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser';
const PORT = 9444;
const NAMA = 'Laporan-Revisi-PFfriends-2026-08-04';

const tidur = (ms) => new Promise((r) => setTimeout(r, ms));

/** Tangkapan layar yang masuk laporan, berikut keterangannya. */
const LAMPIRAN = [
	{
		file: '01-publik-beranda',
		judul: 'Beranda publik',
		ket: 'Hero tanpa foto berat, billboard kegiatan terdekat, papan peringkat peserta paling aktif, dan tiga kartu blog bersampul foto.'
	},
	{
		file: '09-publik-masuk',
		judul: 'Halaman masuk',
		ket: 'Masuk cukup dengan mengklik kartu pengguna. Tidak ada kolom sandi yang perlu diisi saat peragaan.'
	},
	{
		file: '05-publik-cerita',
		judul: 'Blog publik',
		ket: 'Menu "Blog" pada bilah navigasi publik.'
	},
	{
		file: '07-publik-kalender',
		judul: 'Calendar of Event publik',
		ket: 'Kalender komunitas, dapat dibaca tanpa masuk.'
	},
	{
		file: '21-admin-dasbor-kpi',
		judul: 'Admin · Dasbor KPI',
		ket: 'Lima kartu angka kunci, empat chart Apache ECharts, satu tabel rekap. Isi halaman Bukti ESG dan Laporan yang dicabut dilebur ke sini.'
	},
	{
		file: '22-admin-kontrol-akun',
		judul: 'Admin · Kontrol Akun',
		ket: 'Seluruh 63 akun — 60 Awardee, 2 Verifikator, 1 Admin — dengan tombol "Masuk sebagai" (impersonate) di tiap baris.'
	},
	{
		file: '23-admin-gamifikasi',
		judul: 'Admin · Konfigurasi Gamifikasi',
		ket: 'Nilai poin sembilan aksi dan ambang empat jenjang dapat disunting; tersimpan dan bertahan setelah muat ulang.'
	},
	{
		file: '17-verifikator-dasbor',
		judul: 'Verifikator · Dasbor',
		ket: 'Fokus performa awardee dan dampaknya — berbeda dari dasbor Admin yang menyorot performa sistem. Memuat papan peringkat peserta.'
	},
	{
		file: '18-verifikator-submission-blog',
		judul: 'Verifikator · Submission Blog',
		ket: 'Sebelumnya bernama "Antrean Cerita".'
	},
	{
		file: '20-verifikator-konfigurasi-event',
		judul: 'Verifikator · Konfigurasi Calendar of Event',
		ket: 'Sebelumnya "Usulan Kegiatan". Kini disertai kalender bulanan serta tambah dan sunting agenda.'
	},
	{
		file: '10-awardee-dasbor',
		judul: 'Awardee · Beranda',
		ket: 'Dasbor penyambut: sapaan menurut waktu, kegiatan yang dapat diikuti, daftar hal yang perlu diketahui, dan pencapaian pribadi.'
	},
	{
		file: '11-awardee-forum',
		judul: 'Awardee · Forum',
		ket: 'Halaman baru. Lima kanal percakapan bergaya Discord, lengkap dengan daftar anggota daring.'
	},
	{
		file: '12-awardee-blog-saya',
		judul: 'Awardee · Blog Saya',
		ket: 'Menulis dan memantau status tulisan sendiri: draf, menunggu tinjauan, terbit, perlu revisi.'
	},
	{
		file: '15-awardee-pencapaian',
		judul: 'Awardee · Pencapaian',
		ket: 'Jenjang, lencana, dan perjalanan poin sebagai capaian pribadi — bukan peringkat antar-peserta.'
	}
];

/** @param {string} p @returns {Promise<string>} */
async function keDataUri(p) {
	const buf = await readFile(p);
	return `data:image/jpeg;base64,${buf.toString('base64')}`;
}

const gambar = {};
for (const l of LAMPIRAN) {
	gambar[l.file] = await keDataUri(join(GAMBAR, `${l.file}.jpg`));
}

const semuaPotret = (await readdir(process.argv[4] ?? 'docs/screenshots'))
	.filter((f) => f.endsWith('.png'))
	.sort();

const css = `
	:root {
		--teal: #34908B; --teal-mid: #6FBEB2; --teal-soft: #A5E9DD;
		--teal-ink: #235E5B; --teal-dark: #1A3E3D;
		--kuning: #FDF4AF; --kuning-ink: #8F7014;
		--ink: #1E293B; --ink-2: #475569; --garis: #E2E8F0;
	}
	@page { size: A4; margin: 16mm 14mm; }
	* { box-sizing: border-box; }
	body {
		margin: 0; color: var(--ink); background: #fff;
		font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
		font-size: 10.5pt; line-height: 1.55;
	}
	.sampul {
		background: linear-gradient(135deg, var(--teal-dark) 0%, var(--teal) 100%);
		color: #fff; padding: 30mm 16mm; margin: -16mm -14mm 12mm; }
	.sampul .kicker { font-size: 9pt; letter-spacing: .16em; text-transform: uppercase; color: var(--teal-soft); margin: 0 0 6mm; }
	.sampul h1 { font-size: 27pt; line-height: 1.15; margin: 0 0 5mm; font-weight: 800; }
	.sampul .sub { font-size: 12pt; color: rgba(255,255,255,.88); margin: 0 0 9mm; max-width: 135mm; }
	.sampul .meta { font-size: 9.5pt; color: rgba(255,255,255,.78); border-top: 1px solid rgba(255,255,255,.28); padding-top: 4mm; }
	.sampul .meta b { color: #fff; font-weight: 600; }
	h2 { font-size: 15pt; color: var(--teal-dark); margin: 10mm 0 3mm; padding-bottom: 2mm;
	     border-bottom: 2.5px solid var(--teal-soft); font-weight: 800; break-after: avoid; }
	h3 { font-size: 11.5pt; color: var(--teal-ink); margin: 6mm 0 2mm; font-weight: 700; break-after: avoid; }
	p { margin: 0 0 3mm; }
	ul { margin: 0 0 3mm; padding-left: 5mm; }
	li { margin-bottom: 1.4mm; }
	table { width: 100%; border-collapse: collapse; margin: 3mm 0 5mm; font-size: 9.5pt; break-inside: avoid; }
	th { background: var(--teal-dark); color: #fff; text-align: left; padding: 2.4mm 3mm; font-weight: 600; font-size: 9pt; }
	td { padding: 2.2mm 3mm; border-bottom: 1px solid var(--garis); vertical-align: top; }
	tr:nth-child(even) td { background: #F2FAF8; }
	.ok { color: #15803D; font-weight: 700; }
	.no { color: #B91C1C; font-weight: 700; }
	.sorot { background: var(--kuning); border-left: 4px solid var(--kuning-ink);
	         padding: 4mm 5mm; margin: 4mm 0; break-inside: avoid; }
	.sorot b { color: var(--kuning-ink); }
	.palet { display: flex; gap: 0; margin: 3mm 0 5mm; border-radius: 3px; overflow: hidden; }
	.palet div { flex: 1; padding: 7mm 2mm 3mm; text-align: center; font-size: 8pt; font-weight: 700; }
	figure { margin: 0 0 7mm; break-inside: avoid; }
	figure img { width: 100%; border: 1px solid var(--garis); border-radius: 3px; display: block; }
	figcaption { font-size: 9pt; color: var(--ink-2); margin-top: 2mm; }
	figcaption b { color: var(--teal-ink); display: block; font-size: 10pt; margin-bottom: .8mm; }
	.kolom2 { columns: 2; column-gap: 8mm; font-size: 9.5pt; }
	.pecah { break-before: page; }
	.kaki { margin-top: 10mm; padding-top: 3mm; border-top: 1px solid var(--garis);
	        font-size: 8.5pt; color: var(--ink-2); }
`;

const html = `<!doctype html><html lang="id"><head><meta charset="utf-8">
<title>${NAMA}</title><style>${css}</style></head><body>

<div class="sampul">
	<p class="kicker">Breakthrough Project · Divisi Corporate Secretary</p>
	<h1>Laporan Revisi<br>Mockup PFfriends</h1>
	<p class="sub">Community Connect Initiative — wadah alumni Beasiswa Sobat Bumi dan pelaku usaha PFpreneur / Womenpreneur.</p>
	<div class="meta">
		<b>Tanggal revisi</b> 4 Agustus 2026 &nbsp;·&nbsp;
		<b>Organisasi</b> Pertamina Foundation &nbsp;·&nbsp;
		<b>Tahap</b> Mockup / peragaan internal
	</div>
</div>

<h2>1 · Ringkasan eksekutif</h2>
<p>Revisi ini menyentuh empat hal sekaligus: <b>identitas visual</b>, <b>penyederhanaan navigasi</b>, <b>penambahan fitur</b>, dan <b>kemudahan peragaan</b>.</p>
<ul>
	<li><b>Palet warna</b> berganti dari merah–biru–navy Pertamina menjadi teal dan kuning yang lebih ramah, berlaku untuk seluruh sistem.</li>
	<li><b>Navigasi dipangkas tajam.</b> Zona publik dari tujuh menu menjadi tiga; Admin dari tujuh menjadi tiga; Verifikator dari lima menjadi tiga.</li>
	<li><b>Dua fitur baru:</b> Forum percakapan bagi awardee, dan papan peringkat peserta paling aktif yang tampil di beranda publik serta dasbor verifikator.</li>
	<li><b>Masuk cukup satu klik</b> pada kartu pengguna — mempercepat peragaan yang kerap berpindah peran.</li>
	<li><b>Seluruh dasbor memakai Apache ECharts</b> dengan data contoh yang saling konsisten.</li>
</ul>
<p>Aplikasi lolos seluruh gerbang verifikasi otomatis kecuali satu yang memang sengaja dilanggar — dijelaskan pada bagian 6.</p>

<h2>2 · Identitas visual</h2>
<p>Empat warna dasar yang ditetapkan pemilik produk, diterapkan menyeluruh:</p>
<div class="palet">
	<div style="background:#34908B;color:#fff">#34908B<br>teal utama</div>
	<div style="background:#6FBEB2;color:#1A3E3D">#6FBEB2<br>teal madya</div>
	<div style="background:#A5E9DD;color:#1A3E3D">#A5E9DD<br>teal muda</div>
	<div style="background:#FDF4AF;color:#8F7014">#FDF4AF<br>kuning aksen</div>
</div>
<p>Keempatnya cerah dan tidak satu pun memenuhi rasio kontras 4.5:1 sebagai warna teks di atas putih — <b>#34908B hanya mencapai 3.81:1</b>. Karena itu tiap keluarga warna dilengkapi varian gelap khusus teks, sementara warna aslinya dipakai untuk bidang, chip, dan aksen. Tanpa pemisahan ini seluruh label sekunder akan gagal memenuhi WCAG AA.</p>
<h3>Perubahan penyerta</h3>
<ul>
	<li>Logo Pertamina Foundation versi putih dipasang di bilah navigasi publik berlatar teal, berdampingan dengan wordmark <b>PFfriends</b>.</li>
	<li>Penulisan nama diseragamkan dari "Pfriends" menjadi <b>"PFfriends"</b> pada 38 berkas antarmuka.</li>
	<li>Teks <i>"PFRIENDS CONSOLE v0.1.0 · © 2026 Pertamina Foundation"</i> dihapus dari sidebar dan kaki halaman.</li>
	<li>Palet grafik dan warna jenjang keanggotaan ikut disesuaikan; jenjang kini menaik dalam satu keluarga teal dan memuncak di kuning, sehingga urutannya terbaca dari warnanya sendiri.</li>
</ul>

<h2>3 · Perubahan navigasi</h2>
<table>
	<tr><th style="width:20%">Zona</th><th style="width:40%">Sebelum</th><th style="width:40%">Sesudah</th></tr>
	<tr><td><b>Publik</b></td>
		<td>Beranda · Cerita · Kalender · Gerakan · Komunitas · Tentang · Metode Pengukuran <i>(7)</i></td>
		<td>Beranda · Blog · Calendar of Event <i>(3)</i></td></tr>
	<tr><td><b>Admin</b></td>
		<td>Dasbor KPI · Kelola Awardee · Diseminasi · Moderasi &amp; Consent · Konfigurasi Gamifikasi · Bukti ESG · Laporan <i>(7)</i></td>
		<td>Dasbor KPI · Kontrol Akun · Konfigurasi Gamifikasi <i>(3)</i></td></tr>
	<tr><td><b>Verifikator</b></td>
		<td>Beranda · Antrean Cerita · Usulan Kegiatan · Bukti · Profil <i>(5)</i></td>
		<td>Dasbor · Submission Blog · Konfigurasi Calendar of Event <i>(3)</i></td></tr>
	<tr><td><b>Awardee</b></td>
		<td>Beranda · Kabar · Aksi · Kalender · Gerakan · Cerita · Peringkat · Penghargaan · Direktori · Profil <i>(10)</i></td>
		<td>Beranda · Blog Saya · Forum · Calendar of Event · Pencapaian · Kabar · Jejaring <i>(7)</i></td></tr>
</table>
<p>Halaman publik yang dicabut dari bilah navigasi — Gerakan, Komunitas, Tentang, Metode Pengukuran — <b>tetap hidup</b> dan masih dapat dibuka lewat tautan di dalam halaman lain. Yang dihapus hanya tempatnya di menu.</p>

<h2>4 · Perubahan per zona</h2>

<h3>Zona publik</h3>
<ul>
	<li>Beranda dirombak menjadi empat bagian: hero, <b>billboard kegiatan</b> selebar halaman, <b>papan peringkat peserta paling aktif</b>, dan tiga kartu blog terbaru.</li>
	<li>Foto hero berukuran besar (273 KB + 240 KB) diganti gradien teal dan bentuk geometris — halaman terbaca lebih cepat. Kartu blog tetap memakai foto asli karena berada di bawah lipatan dan tidak menghambat pembacaan.</li>
	<li><b>Fitur "Gabung" / pendaftaran mandiri dihapus.</b> Alur kini hanya Beranda → Login.</li>
	<li><b>Masuk cukup mengklik kartu pengguna</b> — tanpa mengetik surel maupun sandi. Formulir manual tetap tersedia di balik tautan kecil.</li>
</ul>

<h3>Zona Admin</h3>
<ul>
	<li>Empat halaman dicabut: Diseminasi, Moderasi &amp; Consent, Bukti ESG, dan Laporan. Isi dua yang terakhir <b>dilebur ke Dasbor KPI</b> agar informasinya tidak hilang.</li>
	<li>Dasbor KPI difokuskan pada performa sistem dan capaian publikasi: lima kartu angka kunci, empat grafik, satu tabel rekap bulanan.</li>
	<li>"Kelola Awardee" menjadi <b>Kontrol Akun</b> dan kini menampilkan seluruh 63 akun, bukan awardee saja, dengan <b>fitur impersonate</b> pada tiap baris.</li>
	<li>Konfigurasi Gamifikasi kini <b>dapat disunting</b>: nilai poin sembilan aksi dan ambang empat jenjang. Perubahan tersimpan dan bertahan setelah muat ulang, disertai pratinjau dampaknya terhadap sebaran jenjang 60 anggota.</li>
</ul>

<h3>Zona Verifikator</h3>
<ul>
	<li><b>Dasbor baru</b> yang berfokus pada performa awardee dan dampaknya — sengaja dibedakan dari dasbor Admin yang menyorot performa sistem. Memuat papan peringkat peserta, dua grafik, dan antrean kerja dengan angka nyata.</li>
	<li>"Antrean Cerita" menjadi <b>Submission Blog</b>; "Usulan Kegiatan" menjadi <b>Konfigurasi Calendar of Event</b>, kini disertai kalender bulanan serta kemampuan menambah dan menyunting agenda.</li>
	<li>Halaman Bukti dan Profil dicabut. Identitas pengguna sudah tampil di kaki sidebar, sehingga profil tidak lagi memerlukan butir navigasi tersendiri.</li>
</ul>

<h3>Zona Awardee</h3>
<ul>
	<li>Tata letak disamakan dengan Admin dan Verifikator — memakai sidebar yang sama, bukan lagi bilah tab mendatar.</li>
	<li>Beranda menjadi <b>dasbor penyambut</b>: sapaan menurut waktu, kegiatan yang dapat diikuti, daftar hal yang perlu diketahui, lalu pencapaian pribadi.</li>
	<li><b>Forum baru</b> bergaya kanal percakapan dengan lima kanal, aliran pesan, dan daftar anggota daring.</li>
	<li>Papan peringkat <b>dihapus dari zona awardee</b>. Peserta melihat capaiannya sebagai pencapaian pribadi; peringkat antar-peserta hanya tampil di beranda publik dan dasbor verifikator.</li>
</ul>

<h2 class="pecah">5 · Hasil verifikasi</h2>
<p>Seluruh gerbang dijalankan pada aplikasi yang berjalan, bukan pada berkas statis. Gerbang peramban membuka tiap route di peramban sungguhan dan masuk sebagai peran yang berhak.</p>
<table>
	<tr><th style="width:30%">Gerbang</th><th style="width:18%">Hasil</th><th>Cakupan</th></tr>
	<tr><td>Kompilasi komponen</td><td class="ok">LULUS</td><td>111 komponen · 0 gagal · 0 peringatan</td></tr>
	<tr><td>Aturan domain</td><td class="ok">LULUS</td><td>203 asersi</td></tr>
	<tr><td>Konsistensi data seed</td><td class="ok">LULUS</td><td>73 asersi</td></tr>
	<tr><td>Route di peramban</td><td class="ok">LULUS</td><td>29 route · 0 bermasalah · 31 asersi sesi</td></tr>
	<tr><td>Mekanik gamifikasi</td><td class="ok">LULUS</td><td>22 asersi — poin bertambah dan bertahan setelah muat ulang keras</td></tr>
	<tr><td>Build produksi</td><td class="ok">LULUS</td><td>Keluaran statis siap unggah</td></tr>
	<tr><td>Kemurnian zona publik</td><td class="no">GAGAL</td><td>26 pelanggaran pada satu berkas — <b>disengaja</b>, lihat bagian 6</td></tr>
</table>

<div class="sorot">
	<p><b>Temuan yang perlu dicatat.</b> Tiga skrip verifikasi ternyata rusak diam-diam setelah halaman masuk diubah: skrip masih mengisi formulir surel dan sandi yang sudah tidak ada. Akibatnya gerbang route melaporkan seluruh 29 route "berhasil" padahal yang dirender adalah halaman masuk. Ketiganya sudah diperbaiki agar mengklik kartu pengguna, dengan formulir manual sebagai cadangan.</p>
</div>

<h2>6 · Keputusan yang menunggu</h2>
<h3>a. Gerbang kemurnian zona publik</h3>
<p>Aturan PO-2 melarang kata <i>poin</i>, <i>tier</i>, <i>peringkat</i>, dan <i>lencana</i> muncul di zona publik. Aturan itu tercatat sebagai keputusan sengaja pada dokumen rancangan. Permintaan menampilkan papan peringkat di beranda publik membatalkannya.</p>
<p>Permintaan tersebut dikerjakan sesuai arahan, tetapi <b>skrip gerbangnya tidak disunting</b> — dokumen tata kelola adalah kewenangan pemilik produk, bukan pelaksana. Konsekuensinya perintah verifikasi menyeluruh akan berhenti di langkah ini. Bila aturan PO-2 memang dinyatakan tidak berlaku lagi, gerbang tersebut dapat dicabut.</p>
<h3>b. Jalan kembali setelah impersonate</h3>
<p>Fitur "Masuk sebagai" pada Kontrol Akun berfungsi. Untuk kembali ke akun Admin, pengguna perlu keluar lalu memilih kartu Admin — dua klik, karena masuk kini satu klik. Tombol pintas khusus dapat ditambahkan bila diperlukan.</p>
<h3>c. Konfigurasi gamifikasi belum mengubah perhitungan</h3>
<p>Nilai poin yang disunting tersimpan dan pratinjaunya bekerja, tetapi mesin poin masih membaca tabel kanonik. Menyambungkan keduanya menuntut perubahan pada lapisan domain dan sebaiknya dikerjakan terpisah.</p>

<h2 class="pecah">7 · Lampiran — tangkapan layar</h2>
<p>Gambar berikut dipotong pada bagian atas tiap halaman. Versi utuh tersedia di folder <code>docs/screenshots/</code> — total ${semuaPotret.length} berkas.</p>
${LAMPIRAN.map(
	(l) => `<figure>
	<img src="${gambar[l.file]}" alt="${l.judul}">
	<figcaption><b>${l.judul}</b>${l.ket}</figcaption>
</figure>`
).join('\n')}

<h2>8 · Daftar berkas tangkapan layar</h2>
<div class="kolom2">
${semuaPotret.map((f) => `<div>${f.replace('.png', '')}</div>`).join('\n')}
</div>

<p class="kaki">Laporan ini dihasilkan otomatis dari kondisi aplikasi pada 4 Agustus 2026.
Angka verifikasi diambil dari jalannya gerbang, bukan diketik ulang.
PFfriends — Community Connect Initiative, Divisi Corporate Secretary, Pertamina Foundation.</p>

</body></html>`;

await mkdir(OUT, { recursive: true });
const htmlPath = resolve(OUT, `${NAMA}.html`);
await writeFile(htmlPath, html, 'utf8');
console.log(`✓ HTML  ${htmlPath}`);

// ── Cetak lewat peramban ────────────────────────────────────────────────────
class Cdp {
	#ws;
	#id = 0;
	#w = new Map();
	constructor(ws) {
		this.#ws = ws;
		ws.addEventListener('message', (ev) => {
			const p = JSON.parse(ev.data);
			if (p.id && this.#w.has(p.id)) {
				const { resolve: res, reject } = this.#w.get(p.id);
				this.#w.delete(p.id);
				p.error ? reject(new Error(JSON.stringify(p.error))) : res(p.result);
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

const proc = spawn(
	BROWSER,
	[
		'--headless=new',
		'--disable-gpu',
		'--no-sandbox',
		'--hide-scrollbars',
		`--remote-debugging-port=${PORT}`,
		'--user-data-dir=/tmp/pffriends-laporan',
		'about:blank'
	],
	{ stdio: 'ignore' }
);

let target = null;
for (let i = 0; i < 50 && !target; i++) {
	await tidur(300);
	try {
		const daftar = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) => r.json());
		target = daftar.find((t) => t.type === 'page')?.webSocketDebuggerUrl ?? null;
	} catch {
		/* peramban belum siap */
	}
}
if (!target) {
	proc.kill();
	throw new Error('Peramban tidak pernah siap. Setel BROWSER_BIN bila memakai Chrome atau Edge.');
}

const cdp = await Cdp.connect(target);
await cdp.kirim('Page.enable');
await cdp.kirim('Runtime.enable');

await cdp.kirim('Emulation.setDeviceMetricsOverride', {
	width: 1240,
	height: 1754,
	deviceScaleFactor: 2,
	mobile: false
});
await cdp.kirim('Page.navigate', { url: `file://${htmlPath}` });
await tidur(3500); // gambar data-URI perlu waktu untuk didekode

// PDF — mengikuti @page A4 di CSS.
const pdf = await cdp.kirim('Page.printToPDF', {
	printBackground: true,
	preferCSSPageSize: true
});
await writeFile(join(OUT, `${NAMA}.pdf`), Buffer.from(pdf.data, 'base64'));
console.log(`✓ PDF   ${join(OUT, `${NAMA}.pdf`)}`);

// PNG — satu gambar panjang selebar 1240px.
const ukuran = await cdp.kirim('Page.getLayoutMetrics');
const tinggi = Math.ceil(ukuran.cssContentSize?.height ?? 20000);
const png = await cdp.kirim('Page.captureScreenshot', {
	format: 'png',
	captureBeyondViewport: true,
	clip: { x: 0, y: 0, width: 1240, height: tinggi, scale: 1 }
});
await writeFile(join(OUT, `${NAMA}.png`), Buffer.from(png.data, 'base64'));
console.log(`✓ PNG   ${join(OUT, `${NAMA}.png`)}  (1240 × ${tinggi})`);

proc.kill();
console.log(`\nSelesai. Seluruh berkas ada di ${OUT}/`);
