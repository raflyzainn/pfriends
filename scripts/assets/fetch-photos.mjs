/**
 * PENGUNDUH ASET FOTO: mengubah manifest §5 `docs/11-VISUAL-DIRECTION.md` menjadi berkas nyata
 * di `static/img/`, lalu menulis ulang `src/lib/data/photo-credits.json`.
 *
 * KEPUTUSAN YANG TIDAK TERBACA DARI KODE: kenapa skrip ini tidak memakai API Unsplash:
 * `docs/11` §5.6 mengandaikan `UNSPLASH_ACCESS_KEY` tersedia dan foto dicari ulang setiap kali
 * skrip berjalan. Kunci itu tidak ada di lingkungan proyek ini, dan pencarian ulang punya cacat
 * yang lebih dalam daripada sekadar butuh kunci: `search/photos` mengembalikan urutan yang
 * berubah dari hari ke hari, sehingga menjalankan ulang skrip akan MENGGANTI foto yang sudah
 * disetujui redaksi tanpa ada yang meminta. Karena itu skrip ini menempuh jalur manual §5.7
 * dalam bentuk yang dapat diulang: identitas foto DIPAKU di `MANIFEST` (id Unsplash + jalur CDN),
 * dan yang dikerjakan skrip hanya mengunduh, memotong, serta memvalidasi. Mengganti foto berarti
 * menyunting satu baris di sini: tindakan sadar, bukan efek samping.
 *
 * CDN `images.unsplash.com` melayani permintaan tanpa kunci API, jadi seluruh alur ini bekerja
 * pada mesin mana pun yang punya jaringan. Hasil unduhan IKUT DI-COMMIT; peragaan luring
 * (`docs/11` §3.2 alasan 1) bergantung padanya.
 *
 *   node scripts/assets/fetch-photos.mjs                    # seluruh manifest, lewati yang sudah valid
 *   node scripts/assets/fetch-photos.mjs hero-komunitas.jpg # satu berkas
 *   node scripts/assets/fetch-photos.mjs --force            # unduh ulang semuanya
 *
 * @see docs/11-VISUAL-DIRECTION.md: §4 perlakuan foto, §5 manifest, §5.7 jalur manual
 * @see docs/12-BUILD-CONTRACT-V2.md: §3.3(d) kriteria selesai WP-03
 */
import { mkdir, writeFile, readFile, stat, readdir, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { readFileSync } from 'node:fs';

/**
 * Satu slot foto pada manifest.
 *
 * @typedef {object} PhotoSlot
 * @property {string} berkas          Nama berkas keluaran di `static/img/`. WAJIB persis manifest §5.
 * @property {string} [unsplashId]    Id foto Unsplash (potongan terakhir URL halaman foto).
 * @property {string} [cdnPath]       Jalur berkas di `images.unsplash.com`, mis. `photo-1611087802810-046bb671e644`.
 * @property {string} [photographer]  Nama fotografer sebagaimana ditulis Unsplash.
 * @property {string} [profile]       URL profil fotografer.
 * @property {number} w               Lebar keluaran (piksel).
 * @property {number} h               Tinggi keluaran (piksel).
 * @property {'faces'|'entropy'|'faces,entropy'} [crop]  Strategi crop imgix; bawaan `entropy`.
 * @property {boolean} [hero]         `true` -> anggaran 400 KB; `false` -> 250 KB.
 * @property {string} [sameAs]        Nama berkas slot rujukan. Bila diisi, memakai foto YANG SAMA
 *                                    dengan crop berbeda. Tanpa ini `hero-komunitas-mobile.jpg` dan
 *                                    `og-pfriends.jpg` menjadi adegan yang berbeda dari hero desktop :
 *                                    halaman berganti foto saat perangkat diputar, dan kartu berbagi
 *                                    WhatsApp menampilkan foto yang tidak pernah ada di situs.
 */

/**
 * Salinan tabel §5.1–§5.5 `docs/11-VISUAL-DIRECTION.md`, dengan identitas foto sudah dipaku.
 * Menambah foto = menambah satu baris di sini DAN satu entri di `src/lib/data/photos.js`.
 * @type {PhotoSlot[]}
 */
const MANIFEST = [
	// ── §5.1 Beranda ───────────────────────────────────────────────────────────
	{
		berkas: 'hero-komunitas.jpg',
		unsplashId: 'Nb__Sl4Biz0',
		cdnPath: 'photo-1611087802810-046bb671e644',
		photographer: 'Rendy Novantino',
		profile: 'https://unsplash.com/@novantino',
		w: 1800,
		h: 772,
		crop: 'faces,entropy',
		hero: true
	},
	{ berkas: 'hero-komunitas-mobile.jpg', sameAs: 'hero-komunitas.jpg', w: 960, h: 1200, crop: 'faces' },
	{ berkas: 'og-pfriends.jpg', sameAs: 'hero-komunitas.jpg', w: 1200, h: 630, crop: 'faces,entropy', hero: true },
	{
		berkas: 'sobi-alumni-kampus.jpg',
		unsplashId: 'Zfee_GUBs_k',
		cdnPath: 'photo-1709029363815-f49bd2fa1dd6',
		photographer: 'Mardanafin',
		profile: 'https://unsplash.com/@mardanafin',
		w: 960,
		h: 1200,
		crop: 'faces'
	},
	{
		berkas: 'womenpreneur-umkm.jpg',
		unsplashId: 'Vh6AU3YW9u0',
		cdnPath: 'photo-1746010114944-75c04f221da4',
		photographer: 'setengah limasore',
		profile: 'https://unsplash.com/@ahmadfarisandy',
		w: 1080,
		h: 1350,
		crop: 'faces'
	},
	{
		berkas: 'event-workshop.jpg',
		unsplashId: '3kc_75Rdgyk',
		cdnPath: 'photo-1646579886135-068c73800308',
		photographer: 'Herlambang Tinasih Gusti',
		profile: 'https://unsplash.com/@tinasihgusti',
		w: 600,
		h: 600
	},
	// T-5: foto sebelumnya (`_1j7_atc0z8`) menampilkan tujuh relawan berkaus seragam
	// "OCEAN CLEANUP GROUP". Logo organisasi lain yang terbaca jelas pada foto unggulan
	// /gerakan membuat gerakan Pfriends tampak diselenggarakan pihak ketiga. Penggantinya
	// adalah petak mangrove hasil penanaman: subjek yang sama, tanpa merek siapa pun.
	{
		berkas: 'gerakan-mangrove.jpg',
		unsplashId: 'L-9WhJITub8',
		cdnPath: 'photo-1709857835974-4b3e0cd144d6',
		photographer: 'Muhammad Naufal',
		profile: 'https://unsplash.com/@naufalscpt',
		w: 1600,
		h: 686,
		hero: true
	},
	{
		berkas: 'cta-penutup.jpg',
		unsplashId: 'AsPbtcPqgfY',
		cdnPath: 'photo-1747778148316-4a8eeb132d48',
		photographer: 'Fajar Herlambang STUDIO',
		profile: 'https://unsplash.com/@hng21',
		w: 1600,
		h: 686,
		hero: true
	},

	// ── §5.2 /tentang ──────────────────────────────────────────────────────────
	{
		berkas: 'tentang-hero.jpg',
		unsplashId: 'sPo5tHN64Q4',
		cdnPath: 'photo-1616992954106-9c97fdc71f0c',
		photographer: 'Akeyodia, Business Coaching Firm',
		profile: 'https://unsplash.com/@akeyodia',
		w: 1700,
		h: 729,
		hero: true
	},
	{
		berkas: 'tentang-sosialisasi.jpg',
		unsplashId: 'zJkMJooI3cQ',
		cdnPath: 'photo-1722643882339-7a6c9cb080db',
		photographer: 'Fajar Herlambang STUDIO',
		profile: 'https://unsplash.com/@hng21',
		w: 1100,
		h: 733
	},
	{
		berkas: 'tentang-amplifikasi.jpg',
		unsplashId: 'GYRA3E1hOuE',
		cdnPath: 'photo-1728484690397-009bbf7fabec',
		photographer: 'Defrino Maasy',
		profile: 'https://unsplash.com/@defrino',
		w: 1400,
		h: 933
	},

	// ── §5.3 /komunitas ────────────────────────────────────────────────────────
	{
		berkas: 'komunitas-hero.jpg',
		unsplashId: 'gEq2hHEHRqI',
		cdnPath: 'photo-1685522115836-547a16b624ee',
		photographer: 'Falaq Lazuardi',
		profile: 'https://unsplash.com/@falaqkun',
		w: 1800,
		h: 772,
		hero: true
	},
	{
		berkas: 'sobi-mentoring.jpg',
		unsplashId: 'wK7ODR2MjEY',
		cdnPath: 'photo-1616992510024-f1293eb00e41',
		photographer: 'Akeyodia, Business Coaching Firm',
		profile: 'https://unsplash.com/@akeyodia',
		w: 1400,
		h: 933
	},
	{
		berkas: 'womenpreneur-produk.jpg',
		unsplashId: 'urpQa-AMad0',
		cdnPath: 'photo-1760192038759-15244482f836',
		photographer: 'hartono subagio',
		profile: 'https://unsplash.com/@hsbg99',
		w: 1150,
		h: 767
	},
	{
		berkas: 'chapter-pertemuan.jpg',
		unsplashId: 'aGZdHORF9bY',
		cdnPath: 'photo-1745487383873-4c0a1b403e1f',
		photographer: 'setengah limasore',
		profile: 'https://unsplash.com/@ahmadfarisandy',
		w: 1400,
		h: 933
	},

	// ── §5.4 Sampul cerita: HANYA slug yang fotonya benar-benar cocok ─────────
	// Lebar 1200×675 (bukan 1600×900) mengikuti catatan §5.6: rasio 16:9 dipertahankan,
	// tetapi 1200 px cukup untuk kartu terlebar sekalipun dan muat anggaran 250 KB.
	//
	// GELOMBANG REVISI: kenapa daftar ini menyusut dari 12 menjadi 7:
	//
	// Peninjau membuka berkasnya satu per satu dan menemukan enam sampul yang
	// BERTENTANGAN dengan ceritanya: alat tenun gendong Andes untuk cerita tenun Sumba,
	// koperasi pemulung Brasil untuk bank sampah Surabaya, butik Barat untuk kelas
	// pencatatan Balikpapan, dan seterusnya. `CREDITS.md` sudah melarang menempelkan
	// tempat kegiatan yang sesungguhnya pada foto stok; mengikat foto stok ke satu
	// cerita BERNAMA TEMPAT adalah persis pelanggaran itu.
	//
	// Slot yang kosong MEMAKSA kebohongan: selama barisnya ada, seseorang akan
	// mengisinya dengan foto yang "kira-kira mirip". Karena itu slot yang tidak dapat
	// dicocokkan DIHAPUS, bukan diisi ulang: `fotoCerita()` mengembalikan `null` dan
	// kartunya jatuh ke blok tipografis yang memang dinilai baik. Tidak ada foto lebih
	// baik daripada foto yang bohong.
	{
		// Diganti (dulu `ZkwGGu8T1qs`: jalan batu cobble Eropa lama: bukan paving blok,
		// bukan Indonesia). Pengganti memperlihatkan pekerjaan yang sesungguhnya
		// diceritakan: paving blok sedang dipasang, di Yogyakarta.
		berkas: 'cerita-paving-plastik.jpg',
		unsplashId: 'D0H_u817oJ8',
		cdnPath: 'photo-1725586660046-0c2bea151543',
		photographer: 'Hilman Lutfi',
		profile: 'https://unsplash.com/@hilmanlutfi',
		w: 1200,
		h: 675
	},
	{
		berkas: 'cerita-mangrove-belawan.jpg',
		unsplashId: 'FyaIuDIacTs',
		cdnPath: 'photo-1773589227464-30293abb0a36',
		photographer: 'Sara Aurora Cimminiello',
		profile: 'https://unsplash.com/@sara_thaundrdawg',
		w: 1100,
		h: 619
	},
	{
		// Diganti (dulu `78r9uA4dmrI`: alat tenun gendong Andes, palet Amerika Latin :
		// temuan utama peninjau). Pengganti berjudul "Sumba Pattern 4" dan dipotret DI
		// Sumba Barat, NTT: motif kuda dan ayam jantan pada hinggi Sumba Timur. Satu-
		// satunya slot pada gelombang ini yang fotonya benar-benar dari tempat ceritanya.
		berkas: 'cerita-tenun-sumba.jpg',
		unsplashId: 'OyPdgxlVSKQ',
		cdnPath: 'photo-1749369216788-d51ff0bd963a',
		photographer: 'Fadhil Abhimantra',
		profile: 'https://unsplash.com/@fabhimantra',
		w: 1200,
		h: 675
	},
	{
		berkas: 'cerita-kopi-gayo.jpg',
		unsplashId: '_nNkzoC2QTo',
		cdnPath: 'photo-1746623691136-afb227ca4229',
		photographer: 'Luba Glazunova',
		profile: 'https://unsplash.com/@l_glazunova',
		w: 1100,
		h: 619
	},
	{
		berkas: 'cerita-sabun-jelantah.jpg',
		unsplashId: 'fVJM-78TGU4',
		cdnPath: 'photo-1711207354771-8a52847af385',
		photographer: 'Scott Precious',
		profile: 'https://unsplash.com/@scottsalchemy',
		w: 1200,
		h: 675
	},
	{
		berkas: 'cerita-kelas-energi-palu.jpg',
		unsplashId: 'SZW4OQA_lME',
		cdnPath: 'photo-1764720572799-9b441b6cdfbe',
		photographer: 'Fajar Herlambang STUDIO',
		profile: 'https://unsplash.com/@hng21',
		w: 1200,
		h: 675
	},
	{
		berkas: 'cerita-bibit-trembesi-cikadu.jpg',
		unsplashId: 'MKO4ndq55uI',
		cdnPath: 'photo-1721978128124-5a7aef8fcb00',
		photographer: 'Numeralia Vita Zein',
		profile: 'https://unsplash.com/@zeinicon',
		w: 1200,
		h: 675
	},

	// ── §5.5 Cadangan ──────────────────────────────────────────────────────────
	{
		berkas: 'cerita-default.jpg',
		unsplashId: 's9CC2SKySJM',
		cdnPath: 'photo-1434030216411-0b793f4b4173',
		photographer: 'Unseen Studio',
		profile: 'https://unsplash.com/@uns__nstudio',
		w: 1200,
		h: 675
	}
];

const OUT = 'static/img';
const KREDIT = 'src/lib/data/photo-credits.json';

/** Dua ambang, bukan satu: anggaran §5 membedakan hero dari foto konten. */
const BATAS_HERO = 400 * 1024;
const BATAS_KONTEN = 250 * 1024;
/** Berkas di bawah ambang ini pasti bukan JPEG utuh (biasanya badan galat HTML). */
const BATAS_MINIMAL = 20 * 1024;
/** Plafon seluruh direktori, `docs/12` §3.3(d) butir 6. */
const BATAS_TOTAL = 5 * 1024 * 1024;
/** Kualitas awal; skrip MENURUNKANNYA dan mengunduh ulang sampai lolos, bukan sekadar memperingatkan. */
const Q_AWAL = 78;
const Q_MINIMAL = 58;
const Q_LANGKAH = 6;

/**
 * Memastikan buffer benar-benar JPEG. Server CDN yang sedang bermasalah menjawab HTTP 200
 * dengan badan HTML; tanpa pemeriksaan ini berkas `.jpg` berisi `<!doctype html>` lolos ke
 * repositori dan baru ketahuan sebagai gambar rusak di peramban.
 *
 * @param {Buffer} biner
 * @returns {boolean}
 */
function isJpeg(biner) {
	return biner.length > 3 && biner[0] === 0xff && biner[1] === 0xd8 && biner[2] === 0xff;
}

/**
 * Menyusun URL unduhan CDN. Tidak ada kunci API yang terlibat: `images.unsplash.com`
 * adalah endpoint imgix publik.
 *
 * @param {string} cdnPath
 * @param {PhotoSlot} slot
 * @param {number} q
 * @returns {string}
 */
function urlUnduh(cdnPath, slot, q) {
	const crop = slot.crop ?? 'entropy';
	return `https://images.unsplash.com/${cdnPath}?w=${slot.w}&h=${slot.h}&fit=crop&crop=${crop}&q=${q}&fm=jpg`;
}

/**
 * Memeriksa apakah berkas yang sudah ada layak dilewati: ada, JPEG sungguhan, dan
 * di atas ambang minimal. Inilah yang membuat skrip idempoten.
 *
 * @param {string} jalur
 * @returns {Promise<boolean>}
 */
async function sudahValid(jalur) {
	if (!existsSync(jalur)) return false;
	const info = await stat(jalur);
	if (info.size < BATAS_MINIMAL) return false;
	return isJpeg(readFileSync(jalur).subarray(0, 4));
}

/**
 * Mengunduh satu slot dengan penurunan kualitas bertahap sampai muat anggaran.
 * Memperingatkan lalu tetap menulis berkas kegemukan membuat gerbang `du -sh static/img`
 * mustahil hijau: dan gerbang yang mustahil hijau akan dilewati diam-diam.
 *
 * @param {string} cdnPath
 * @param {PhotoSlot} slot
 * @returns {Promise<{biner: Buffer, q: number}>}
 */
async function unduhSampaiMuat(cdnPath, slot) {
	const batas = slot.hero ? BATAS_HERO : BATAS_KONTEN;
	let q = Q_AWAL;
	let biner = Buffer.alloc(0);
	for (;;) {
		const res = await fetch(urlUnduh(cdnPath, slot, q));
		if (!res.ok) throw new Error(`CDN menjawab ${res.status}`);
		biner = Buffer.from(await res.arrayBuffer());
		if (!isJpeg(biner)) throw new Error('balasan bukan JPEG (magic bytes tidak cocok)');
		if (biner.byteLength <= batas || q <= Q_MINIMAL) break;
		q -= Q_LANGKAH;
	}
	return { biner, q };
}

/**
 * Menulis ulang `static/img/CREDITS.md` dari MANIFEST + berkas kredit.
 *
 * Dibangkitkan, bukan diketik tangan: tabel kredit yang disunting manual selalu tertinggal
 * satu revisi di belakang foto yang benar-benar ada di direktori, dan atribusi yang salah
 * lebih buruk daripada tidak ada atribusi. Lisensi Unsplash tidak MEWAJIBKAN atribusi, tetapi
 * `docs/12` §3.3(d) butir 3 mewajibkannya sebagai gerbang paket ini.
 *
 * @returns {Promise<void>}
 */
async function tulisCredits() {
	const baris = MANIFEST.map((slot) => {
		const k = kredit[slot.berkas];
		if (!k) return `| \`${slot.berkas}\` |: |: |: |: |: | ${slot.w}×${slot.h} | belum diunduh |`;
		const halaman = `https://unsplash.com/photos/${k.unsplashId}`;
		return `| \`${slot.berkas}\` | ${k.fotografer} | [profil](${k.profil}) | ${k.sumber} | ${k.lisensi} | [\`${k.unsplashId}\`](${halaman}) | ${slot.w}×${slot.h} | ${k.isStock ? 'stok' : 'dokumentasi'} |`;
	});

	const isi = [
		'# Kredit foto: `static/img/`',
		'',
		'> Dibangkitkan oleh `node scripts/assets/fetch-photos.mjs`. **Jangan disunting tangan** :',
		'> jalankan ulang skripnya. Sumber kebenaran identitas foto ada di `MANIFEST` skrip tersebut.',
		'',
		'Seluruh berkas diunduh ke repositori; **tidak ada hotlink** ke domain luar',
		'(`docs/12-BUILD-CONTRACT-V2.md` §3.3(d) butir 1).',
		'',
		'**Lisensi Unsplash** mengizinkan pemakaian komersial tanpa kewajiban atribusi. Kredit tetap',
		'dicetak di sini dan di `<figcaption>` karena kredit adalah bagian dari bahasa visual terbitan,',
		'bukan sekadar kepatuhan (`docs/11-VISUAL-DIRECTION.md` §4.4).',
		'',
		'**Semua entri berstatus `stok`.** Selama status itu bertahan, kapsi di antarmuka WAJIB generik:',
		'dilarang menempelkan tempat dan bulan kegiatan Pfriends yang sesungguhnya pada foto stok',
		'(`docs/11` §4.4, "Kejujuran wajib"). Kapsi bertempat-berbulan baru sah setelah foto diganti',
		'dokumentasi asli Corporate Secretary.',
		'',
		'## Uji kelayakan sampul: tiga pertanyaan sebelum satu baris MANIFEST ditambahkan',
		'',
		'Aturan kapsi di atas ternyata tidak cukup. Aturan itu menjaga TEKS, sementara yang berbohong',
		'adalah GAMBARNYA: enam sampul cerita pernah lolos seluruh gerbang sambil menampilkan alat tenun',
		'Andes untuk cerita tenun Sumba dan koperasi pemulung Brasil untuk bank sampah Surabaya. Kapsinya',
		'generik dan patuh; fotonya tetap salah fakta. Karena itu setiap slot kini harus lulus tiga hal:',
		'',
		'1. **Tidak membantah ceritanya.** Foto yang isinya bertentangan dengan judul di sebelahnya lebih',
		'   buruk daripada tidak ada foto: pembaca Indonesia mengenali tenun Sumba, dan yang tertangkap',
		'   bukan cuma satu gambar yang keliru melainkan bahwa tidak ada manusia yang pernah melihatnya.',
		'2. **Tidak memuat merek, teks asing, atau tanggal yang terbaca.** Logo organisasi pihak ketiga',
		'   pada foto unggulan membuat kegiatan Pfriends tampak milik orang lain, dan tanggal yang terbaca',
		'   adalah klaim dokumentasi yang tidak dapat kita dukung.',
		'3. **Benar sebagai gambar UMUM, bukan sebagai bukti.** Sampul melekat pada cerita bernama tempat,',
		'   sedangkan foto stok tidak pernah diambil di tempat itu. Yang boleh ditampilkan hanyalah',
		'   subjeknya: kain tenun, paving blok yang dipasang: bukan kejadian yang diceritakan.',
		'',
		'Slot yang tidak lulus **dihapus dari MANIFEST**, tidak diisi foto yang "kira-kira mirip".',
		'`fotoCerita()` lalu mengembalikan `null` dan kartunya jatuh ke blok tipografis. Slot kosong yang',
		'dibiarkan menganga selalu berakhir diisi paksa: itulah yang terjadi pada gelombang sebelumnya.',
		'',
		'| Berkas | Fotografer | Profil | Sumber | Lisensi | Id foto | Ukuran | Status |',
		'|---|---|---|---|---|---|---|---|',
		...baris,
		'',
		`Total ${MANIFEST.length} berkas.`,
		''
	].join('\n');

	await writeFile(`${OUT}/CREDITS.md`, isi);
}

const argumen = process.argv.slice(2);
const paksa = argumen.includes('--force');
const hanya = argumen.filter((a) => !a.startsWith('--'));
const antrean = hanya.length ? MANIFEST.filter((slot) => hanya.includes(slot.berkas)) : MANIFEST;

await mkdir(OUT, { recursive: true });

/** Kredit lama dipertahankan supaya menjalankan ulang satu slot tidak menghapus sisanya. */
const kredit = existsSync(KREDIT) ? JSON.parse(await readFile(KREDIT, 'utf8')) : {};
/** Foto yang sudah dipilih per berkas: dipakai `sameAs` agar tidak mencari ulang. @type {Map<string, PhotoSlot>} */
const terpilih = new Map();

let gagal = 0;
let dilewati = 0;
let diunduh = 0;

for (const slot of antrean) {
	const rujukan = slot.sameAs ? MANIFEST.find((s) => s.berkas === slot.sameAs) : slot;
	if (!rujukan?.cdnPath) {
		console.error(`GAGAL ${slot.berkas}: slot rujukan "${slot.sameAs}" tidak ada di MANIFEST`);
		gagal += 1;
		continue;
	}
	terpilih.set(slot.berkas, rujukan);

	const jalur = `${OUT}/${slot.berkas}`;
	if (!paksa && (await sudahValid(jalur))) {
		const info = await stat(jalur);
		console.log(`LEWAT  ${slot.berkas.padEnd(34)} sudah ada & valid  ${(info.size / 1024).toFixed(0)} KB`);
		dilewati += 1;
		continue;
	}

	try {
		const { biner, q } = await unduhSampaiMuat(rujukan.cdnPath, slot);
		if (biner.byteLength < BATAS_MINIMAL) throw new Error(`hanya ${biner.byteLength} byte`);
		await writeFile(jalur, biner);
		diunduh += 1;

		const batas = slot.hero ? BATAS_HERO : BATAS_KONTEN;
		const tanda = biner.byteLength > batas ? ' ⚠ melewati anggaran' : '';
		console.log(
			`OK     ${slot.berkas.padEnd(34)} ${slot.w}×${slot.h}  q=${q}  ${(biner.byteLength / 1024).toFixed(0)} KB  © ${rujukan.photographer}${tanda}`
		);
	} catch (galat) {
		console.error(`GAGAL  ${slot.berkas}: ${galat instanceof Error ? galat.message : galat}`);
		gagal += 1;
		continue;
	}

	kredit[slot.berkas] = {
		fotografer: rujukan.photographer,
		profil: rujukan.profile,
		sumber: 'Unsplash',
		lisensi: 'Unsplash License',
		unsplashId: rujukan.unsplashId,
		// Kapsi WAJIB generik selama nilai ini true: lihat docs/11 §4.4.
		isStock: true
	};
}

// ── Pemangkasan: direktori dan kredit WAJIB sama persis dengan MANIFEST ──────
// Menghapus satu baris MANIFEST sebelumnya hanya membuat berkasnya yatim: gambarnya
// tetap di `static/img/`, kreditnya tetap di JSON, dan `photos.js` masih bisa
// menyajikannya. Begitulah sampul yang sudah dipensiunkan bisa hidup terus tanpa satu
// pun gerbang berubah merah. Sekarang MANIFEST benar-benar menjadi satu-satunya sumber
// kebenaran: apa pun di luarnya dibuang. Pemangkasan hanya berjalan pada proses penuh :
// menjalankan satu berkas (`node ... hero-komunitas.jpg`) tidak boleh menyapu sisanya.
if (!hanya.length) {
	const sah = new Set(MANIFEST.map((slot) => slot.berkas));

	for (const kunci of Object.keys(kredit)) {
		if (sah.has(kunci)) continue;
		delete kredit[kunci];
		console.log(`PANGKAS kredit  ${kunci.padEnd(34)} tidak ada di MANIFEST`);
	}

	for (const nama of await readdir(OUT)) {
		if (!nama.endsWith('.jpg') || sah.has(nama)) continue;
		await unlink(`${OUT}/${nama}`);
		console.log(`PANGKAS berkas  ${nama.padEnd(34)} tidak ada di MANIFEST`);
	}
}

await writeFile(KREDIT, `${JSON.stringify(kredit, null, '\t')}\n`);
await tulisCredits();

// Laporan anggaran. Angka ini adalah gerbang `docs/12` §3.3(d) butir 6, jadi skrip
// yang mengunduh tetapi tidak melaporkannya hanya memindahkan pekerjaan ke manusia.
let total = 0;
let terbesar = { berkas: ':', ukuran: 0 };
for (const slot of MANIFEST) {
	const jalur = `${OUT}/${slot.berkas}`;
	if (!existsSync(jalur)) continue;
	const { size } = await stat(jalur);
	total += size;
	if (size > terbesar.ukuran) terbesar = { berkas: slot.berkas, ukuran: size };
}

console.log(`\nKredit ditulis ke ${KREDIT}.`);
console.log(`Slot: ${MANIFEST.length} · diunduh ${diunduh} · dilewati ${dilewati} · gagal ${gagal}`);
console.log(
	`Anggaran ${OUT}: ${(total / 1024 / 1024).toFixed(2)} MB dari ${(BATAS_TOTAL / 1024 / 1024).toFixed(0)} MB · terbesar ${terbesar.berkas} ${(terbesar.ukuran / 1024).toFixed(0)} KB`
);
if (total > BATAS_TOTAL) console.error('⚠ Anggaran total terlampaui: kurangi jumlah sampul cerita, jangan naikkan kompresi.');
console.log('Periksa hasil crop secara manual sebelum commit: subjek hero harus jatuh di paruh kanan bingkai.');

process.exit(gagal > 0 ? 1 : 0);
