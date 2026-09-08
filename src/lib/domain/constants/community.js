/**
 * KONSTANTA KOMUNITAS: Hal 2, Hal 4, dan Hal 5 dokumen sumber.
 *
 * Tanggung jawab: mendefinisikan dua komunitas utama Pfriends, pembagian chapter,
 * serta enum siklus hidup yang dipakai lintas modul (status cerita, status
 * awardee, kategori penghargaan).
 *
 * Dua komunitas ini bukan sekadar label filter. Hal 4 menyebut alumni Sobat Bumi
 * sebagai "mitra muda/mentor" dan PFpreneur sebagai "mitra sekaligus entitas
 * bisnis binaan": hubungan mentor–mentee itulah alasan keduanya dipertemukan di
 * satu platform. Field `peran` dan `kebutuhan` menyimpan alasan tersebut agar
 * halaman publik dapat menjelaskannya tanpa mengarang narasi baru.
 *
 * @see docs/00-SOURCE-BRIEF.md: Hal 2 Background, Hal 4 Strategic Initiative, Hal 5 Aktivitas
 * @see docs/04-ESG-GOVERNANCE.md: §3 state machine cerita
 * @see docs/12-BUILD-CONTRACT-V2.md: §4.1 L3 rename AWARDEE_STATUS dan penambahan peranAktor
 */

import { UserRole } from './roles.js';

/**
 * Dua komunitas utama.
 * @readonly
 * @enum {string}
 */
export const CommunityType = Object.freeze({
	SOBI: 'SOBI',
	WOMENPRENEUR: 'WOMENPRENEUR'
});

/**
 * @typedef {object} CommunityDef
 * @property {string} id            Salah satu CommunityType.
 * @property {string} nama          Nama lengkap komunitas.
 * @property {string} akronim       Sebutan pendek yang dipakai anggota.
 * @property {string} programAsal   Program Pertamina Foundation yang melahirkan komunitas ini.
 * @property {string} peran         Peran komunitas dalam ekosistem (Hal 4).
 * @property {string} deskripsi     Penjelasan satu paragraf untuk halaman publik.
 * @property {string} tantangan     Masalah yang melatarbelakangi pembentukannya (Hal 2).
 * @property {readonly string[]} kebutuhan Kebutuhan konkret yang hendak dijawab platform.
 * @property {string} token         Nama token warna dasar (Tailwind).
 * @property {string} ink           Nama token warna aman untuk teks.
 * @property {string} tint          Nama token warna latar lembut.
 */

/**
 * Profil kedua komunitas. Urutan SOBI lebih dulu mengikuti urutan penyebutan Hal 4.
 * @type {readonly CommunityDef[]}
 */
export const COMMUNITIES = Object.freeze([
	Object.freeze({
		id: CommunityType.SOBI,
		nama: 'Sobat Bumi Indonesia',
		akronim: 'SOBI',
		programAsal: 'Beasiswa Sobat Bumi: PFprestasi',
		peran: 'Mitra muda dan mentor bagi ekosistem Pertamina Foundation',
		deskripsi:
			'Ribuan penerima Beasiswa Sobat Bumi yang telah menyelesaikan studi dan kini tersebar di berbagai kampus, kota, dan sektor pekerjaan. Mereka adalah sumber daya manusia unggul yang paling siap berperan sebagai duta energi dan mentor bagi komunitas binaan lain.',
		tantangan:
			'Interaksi pasca program cenderung menurun sehingga potensi alumni belum terutilisasi sebagai duta energi maupun mentor.',
		kebutuhan: Object.freeze([
			'Kanal yang tetap hidup setelah masa beasiswa berakhir',
			'Ruang berbagi keahlian dengan sesama alumni dan komunitas binaan',
			'Pengakuan atas kontribusi yang dapat ditunjukkan secara profesional'
		]),
		token: 'pertamina-green',
		ink: 'pertamina-green-ink',
		tint: 'pertamina-green-tint'
	}),
	Object.freeze({
		id: CommunityType.WOMENPRENEUR,
		nama: 'Womenpreneur Pertamina Foundation',
		akronim: 'Womenpreneur',
		programAsal: 'PFpreneur: UMKM binaan Pertamina Foundation',
		peran: 'Mitra sekaligus entitas bisnis binaan Pertamina Foundation',
		deskripsi:
			'Pelaku UMKM alumni PFpreneur yang masuk daftar unggulan UMKM binaan PT Pertamina (Persero). Usaha mereka sudah berjalan, namun pertumbuhannya tertahan oleh keterbatasan jaringan dan akses keahlian.',
		tantangan:
			'Kendala skalabilitas bisnis karena terbatasnya jaringan pemasaran, riset pasar, dan akses terhadap tenaga kerja ahli maupun digital.',
		kebutuhan: Object.freeze([
			'Jaringan pemasaran yang lebih luas dari lingkar usaha saat ini',
			'Riset pasar dan pendampingan strategi pertumbuhan',
			'Akses ke tenaga ahli digital, termasuk dari kalangan alumni beasiswa'
		]),
		token: 'pertamina-red',
		ink: 'pertamina-red-ink',
		tint: 'pertamina-red-tint'
	})
]);

/**
 * @typedef {object} ChapterDef
 * @property {string} id          Identitas chapter.
 * @property {string} label       Nama chapter untuk UI.
 * @property {string} wagLabel    Nama grup WhatsApp batch sesuai penyebutan Hal 4.
 * @property {string} angkatan    Angkatan penerima manfaat yang dinaungi chapter.
 * @property {string} deskripsi   Penjelasan singkat cakupan chapter.
 * @property {number} urutan      Urutan tampil, menaik dari batch terlama.
 */

/**
 * Chapter komunitas. Hal 4 menyebut WA Komunitas utama berisi kumpulan WAG
 * masing-masing batch (PF 10, PF 11, PF 12, dst) dan Hal 5 menyebut "pembagian
 * chapter komunitas": keduanya dirujuk ke satu konsep yang sama di sini, yaitu
 * chapter berbasis batch. Memisahkan batch dan chapter menjadi dua entitas akan
 * menduplikasi keanggotaan tanpa menambah informasi.
 *
 * Deskripsi angkatan bersifat [RANCANGAN]: Hal 4 menyebut nama batch tetapi tidak
 * menyebut tahunnya, sehingga penamaan periode di sini perlu dikonfirmasi Corsec.
 *
 * @type {readonly ChapterDef[]}
 */
export const CHAPTERS = Object.freeze([
	Object.freeze({
		id: 'PF10',
		label: 'Chapter PF 10',
		wagLabel: 'WAG PF 10',
		angkatan: 'Angkatan 10',
		deskripsi:
			'Batch terlama yang aktif di Pfriends. Banyak anggotanya sudah mapan berkarier dan menjadi mentor bagi batch di bawahnya.',
		urutan: 1
	}),
	Object.freeze({
		id: 'PF11',
		label: 'Chapter PF 11',
		wagLabel: 'WAG PF 11',
		angkatan: 'Angkatan 11',
		deskripsi:
			'Batch tengah yang paling aktif menggerakkan kegiatan upskilling dan sharing session antarwilayah.',
		urutan: 2
	}),
	Object.freeze({
		id: 'PF12',
		label: 'Chapter PF 12',
		wagLabel: 'WAG PF 12',
		angkatan: 'Angkatan 12',
		deskripsi:
			'Batch terbaru yang baru saja menyelesaikan program dan sedang membangun jejaring pasca kelulusan.',
		urutan: 3
	})
]);

/**
 * Status siklus hidup cerita: state machine moderasi docs/04 §3.2.
 *
 * Penolakan permanen sengaja TIDAK dibuat sebagai status tersendiri. Cerita yang
 * ditolak, yang kedaluwarsa, dan yang ditarik karena consent dicabut mendapat
 * perlakuan teknis identik: hilang dari publik, tetap ada di jejak audit. Satu
 * terminal DIARSIPKAN dengan alasan arsip sudah memuat seluruh informasi itu.
 * @readonly
 * @enum {string}
 */
export const STORY_STATUS = Object.freeze({
	DRAFT: 'DRAFT',
	DIAJUKAN: 'DIAJUKAN',
	REVIEW: 'REVIEW',
	PERLU_REVISI: 'PERLU_REVISI',
	DISETUJUI: 'DISETUJUI',
	TERPUBLIKASI: 'TERPUBLIKASI',
	DIARSIPKAN: 'DIARSIPKAN'
});

/**
 * @typedef {object} StatusDef
 * @property {string} code       Kode status.
 * @property {string} label      Label Bahasa Indonesia untuk UI.
 * @property {string} deskripsi  Arti status dan siapa yang sedang memegang bola.
 * @property {string} badgeColor Warna StatusBadge yang dipakai komponen.
 */

/**
 * Metadata tampilan tiap status cerita, termasuk siapa yang sedang memegang bola.
 *
 * Dua field berdampingan dengan sengaja:
 * - `aktor` adalah LABEL antarmuka Bahasa Indonesia. Kartu naskah menampilkannya
 *   apa adanya ("Bola ada di ..."), jadi ia tidak boleh dihapus.
 * - `peranAktor` adalah ENUM `UserRole`. Guard dan tombol keputusan membaca yang
 *   ini: prosa tidak dapat dibandingkan dengan peran sesi.
 *
 * `peranAktor` bernilai `null` pada status yang tidak menunggu tindakan siapa pun:
 * `TERPUBLIKASI` (naskah sudah tayang; arsip adalah tindakan baru, bukan antrean)
 * dan `DIARSIPKAN` (terminal).
 * @type {Readonly<Record<string, StatusDef & {aktor: string, peranAktor: string|null, publik: boolean}>>}
 */
export const STORY_STATUS_META = Object.freeze({
	[STORY_STATUS.DRAFT]: Object.freeze({
		code: STORY_STATUS.DRAFT,
		label: 'Draf',
		deskripsi: 'Masih disusun penulis dan hanya terlihat olehnya.',
		badgeColor: 'slate',
		aktor: 'Penulis',
		peranAktor: UserRole.AWARDEE,
		publik: false
	}),
	[STORY_STATUS.DIAJUKAN]: Object.freeze({
		code: STORY_STATUS.DIAJUKAN,
		label: 'Diajukan',
		deskripsi: 'Menunggu penyaringan kelengkapan oleh penanggung jawab chapter.',
		badgeColor: 'blue',
		aktor: 'Penanggung jawab chapter',
		peranAktor: UserRole.VERIFIER,
		publik: false
	}),
	[STORY_STATUS.REVIEW]: Object.freeze({
		code: STORY_STATUS.REVIEW,
		label: 'Review PF',
		deskripsi: 'Sedang ditinjau tim Pertamina Foundation terhadap lima gerbang publikasi.',
		badgeColor: 'purple',
		aktor: 'Reviewer Pertamina Foundation',
		peranAktor: UserRole.VERIFIER,
		publik: false
	}),
	[STORY_STATUS.PERLU_REVISI]: Object.freeze({
		code: STORY_STATUS.PERLU_REVISI,
		label: 'Perlu revisi',
		deskripsi: 'Ada catatan perbaikan yang harus ditindaklanjuti penulis.',
		badgeColor: 'amber',
		aktor: 'Penulis',
		peranAktor: UserRole.AWARDEE,
		publik: false
	}),
	[STORY_STATUS.DISETUJUI]: Object.freeze({
		code: STORY_STATUS.DISETUJUI,
		label: 'Disetujui',
		deskripsi: 'Lolos seluruh gerbang dan menunggu jadwal penerbitan.',
		badgeColor: 'green',
		aktor: 'Publisher Pertamina Foundation',
		peranAktor: UserRole.VERIFIER,
		publik: false
	}),
	[STORY_STATUS.TERPUBLIKASI]: Object.freeze({
		code: STORY_STATUS.TERPUBLIKASI,
		label: 'Terpublikasi',
		deskripsi: 'Sudah tayang dan dapat dibaca publik di microsite Pfriends.',
		badgeColor: 'green',
		aktor: 'Publik',
		peranAktor: null,
		publik: true
	}),
	[STORY_STATUS.DIARSIPKAN]: Object.freeze({
		code: STORY_STATUS.DIARSIPKAN,
		label: 'Diarsipkan',
		deskripsi: 'Tidak lagi tampil di publik, namun tetap tersimpan pada jejak audit.',
		badgeColor: 'slate',
		aktor: 'Sistem',
		peranAktor: null,
		publik: false
	})
});

/**
 * Alasan sebuah cerita masuk ke terminal DIARSIPKAN (docs/04 §3.2).
 * @readonly
 * @enum {string}
 */
export const STORY_ARCHIVE_REASON = Object.freeze({
	DITOLAK: 'DITOLAK',
	KEDALUWARSA: 'KEDALUWARSA',
	CONSENT_DICABUT: 'CONSENT_DICABUT',
	PERMINTAAN_ANGGOTA: 'PERMINTAAN_ANGGOTA',
	IDLE_TIMEOUT: 'IDLE_TIMEOUT'
});

/**
 * Status seorang awardee (penerima manfaat). Field `canEarnPoints` dan
 * `visibleOnLeaderboard` menyatukan aturan "siapa boleh dapat poin dan siapa tampil
 * di papan" di satu tempat, supaya kondisi itu tidak tersebar sebagai rangkaian if
 * di store maupun komponen.
 *
 * **Nama konstanta berubah, NILAI STRING-nya sengaja tidak.** Yang direname hanya
 * identifier modul (`MEMBER_STATUS` → `AWARDEE_STATUS`); nilai `'AKTIF'`,
 * `'DORMAN'`, dan seterusnya tetap sama persis karena ia dipakai sebagai KUNCI
 * PENYIMPANAN: kolom `status` adalah indeks tabel `awardees`, dan setiap baris
 * seed serta setiap basis data peramban yang sudah terisi menyimpan nilai lama itu.
 * Mengganti nilainya akan membuat seluruh kueri berbasis status mengembalikan
 * daftar kosong: tanpa satu pun galat, karena Dexie hanya menemukan nol baris.
 *
 * Jangan bingungkan dengan `AccountStatus` (`entities/UserAccount.js`): yang ini
 * status penerima manfaat, yang itu status akses login.
 * @readonly
 * @enum {string}
 */
export const AWARDEE_STATUS = Object.freeze({
	TERDAFTAR: 'TERDAFTAR',
	MENUNGGU_VERIFIKASI: 'MENUNGGU_VERIFIKASI',
	AKTIF: 'AKTIF',
	PERLU_KLARIFIKASI: 'PERLU_KLARIFIKASI',
	DITOLAK: 'DITOLAK',
	DORMAN: 'DORMAN',
	DITANGGUHKAN: 'DITANGGUHKAN',
	NONAKTIF: 'NONAKTIF',
	KELUAR: 'KELUAR'
});

/**
 * Metadata dan kemampuan tiap status awardee.
 * @type {Readonly<Record<string, StatusDef & {canEarnPoints: boolean, visibleOnLeaderboard: boolean}>>}
 */
export const AWARDEE_STATUS_META = Object.freeze({
	[AWARDEE_STATUS.TERDAFTAR]: Object.freeze({
		code: AWARDEE_STATUS.TERDAFTAR,
		label: 'Terdaftar',
		deskripsi: 'Sudah mengisi formulir pendaftaran, belum melengkapi persetujuan data.',
		badgeColor: 'slate',
		canEarnPoints: false,
		visibleOnLeaderboard: false
	}),
	[AWARDEE_STATUS.MENUNGGU_VERIFIKASI]: Object.freeze({
		code: AWARDEE_STATUS.MENUNGGU_VERIFIKASI,
		label: 'Menunggu verifikasi',
		deskripsi: 'Data sedang dicocokkan dengan registry penerima manfaat Pertamina Foundation.',
		badgeColor: 'amber',
		canEarnPoints: false,
		visibleOnLeaderboard: false
	}),
	[AWARDEE_STATUS.AKTIF]: Object.freeze({
		code: AWARDEE_STATUS.AKTIF,
		label: 'Aktif',
		deskripsi: 'Keanggotaan terverifikasi dan berhak mengikuti seluruh aktivitas komunitas.',
		badgeColor: 'green',
		canEarnPoints: true,
		visibleOnLeaderboard: true
	}),
	[AWARDEE_STATUS.PERLU_KLARIFIKASI]: Object.freeze({
		code: AWARDEE_STATUS.PERLU_KLARIFIKASI,
		label: 'Perlu klarifikasi',
		deskripsi: 'Ada data yang perlu dikonfirmasi sebelum keanggotaan disahkan.',
		badgeColor: 'amber',
		canEarnPoints: false,
		visibleOnLeaderboard: false
	}),
	[AWARDEE_STATUS.DITOLAK]: Object.freeze({
		code: AWARDEE_STATUS.DITOLAK,
		label: 'Ditolak',
		deskripsi: 'Data tidak ditemukan pada registry penerima manfaat.',
		badgeColor: 'red',
		canEarnPoints: false,
		visibleOnLeaderboard: false
	}),
	[AWARDEE_STATUS.DORMAN]: Object.freeze({
		code: AWARDEE_STATUS.DORMAN,
		label: 'Dorman',
		deskripsi: 'Tidak ada aktivitas dalam rentang pemantauan; poin tetap utuh dan dapat aktif kembali.',
		badgeColor: 'slate',
		canEarnPoints: true,
		visibleOnLeaderboard: false
	}),
	[AWARDEE_STATUS.DITANGGUHKAN]: Object.freeze({
		code: AWARDEE_STATUS.DITANGGUHKAN,
		label: 'Ditangguhkan',
		deskripsi: 'Dihentikan sementara karena temuan anomali kontribusi yang sedang ditinjau.',
		badgeColor: 'red',
		canEarnPoints: false,
		visibleOnLeaderboard: false
	}),
	[AWARDEE_STATUS.NONAKTIF]: Object.freeze({
		code: AWARDEE_STATUS.NONAKTIF,
		label: 'Nonaktif',
		deskripsi: 'Dinonaktifkan admin; akses komunitas ditutup sampai diaktifkan kembali.',
		badgeColor: 'slate',
		canEarnPoints: false,
		visibleOnLeaderboard: false
	}),
	[AWARDEE_STATUS.KELUAR]: Object.freeze({
		code: AWARDEE_STATUS.KELUAR,
		label: 'Keluar',
		deskripsi: 'Mengundurkan diri atas permintaan sendiri.',
		badgeColor: 'slate',
		canEarnPoints: false,
		visibleOnLeaderboard: false
	})
});

/**
 * Kategori katalog penukaran poin (docs/03 §10.1, mandat Hal 5 pilar 05
 * "Peningkatan poin yang dapat ditukar").
 * @readonly
 * @enum {string}
 */
export const REWARD_CATEGORY = Object.freeze({
	MERCHANDISE: 'MERCHANDISE',
	UPSKILLING: 'UPSKILLING',
	MENTORING: 'MENTORING',
	PROFIL: 'PROFIL',
	UNDANGAN: 'UNDANGAN',
	SERTIFIKAT: 'SERTIFIKAT',
	DAMPAK: 'DAMPAK'
});

/**
 * Metadata kategori penghargaan. Kategori DAMPAK sengaja diberi urutan terakhir
 * dan penanda `sorotan`: ini satu-satunya kategori yang mengubah poin menjadi
 * kebaikan bagi orang lain, dan bagi komunitas Sobat Bumi kategori inilah yang
 * paling bermakna untuk ditonjolkan.
 * @type {Readonly<Record<string, {code: string, label: string, deskripsi: string, urutan: number, sorotan: boolean}>>}
 */
export const REWARD_CATEGORY_META = Object.freeze({
	[REWARD_CATEGORY.MERCHANDISE]: Object.freeze({
		code: REWARD_CATEGORY.MERCHANDISE,
		label: 'Merchandise',
		deskripsi: 'Perlengkapan resmi komunitas, termasuk edisi khusus tiap chapter.',
		urutan: 1,
		sorotan: false
	}),
	[REWARD_CATEGORY.UPSKILLING]: Object.freeze({
		code: REWARD_CATEGORY.UPSKILLING,
		label: 'Kuota upskilling',
		deskripsi: 'Voucher kelas daring, kelas intensif, dan sertifikasi profesional bersubsidi.',
		urutan: 2,
		sorotan: false
	}),
	[REWARD_CATEGORY.MENTORING]: Object.freeze({
		code: REWARD_CATEGORY.MENTORING,
		label: 'Slot mentoring',
		deskripsi: 'Sesi bersama alumni Champion, praktisi mitra, dan klinik bisnis womenpreneur.',
		urutan: 3,
		sorotan: false
	}),
	[REWARD_CATEGORY.PROFIL]: Object.freeze({
		code: REWARD_CATEGORY.PROFIL,
		label: 'Fitur profil',
		deskripsi: 'Sorotan profil, bingkai musiman, dan tautan usaha di direktori komunitas.',
		urutan: 4,
		sorotan: false
	}),
	[REWARD_CATEGORY.UNDANGAN]: Object.freeze({
		code: REWARD_CATEGORY.UNDANGAN,
		label: 'Undangan acara',
		deskripsi: 'Kursi sesi premium, townhall, dan acara seremonial Pertamina Foundation.',
		urutan: 5,
		sorotan: false
	}),
	[REWARD_CATEGORY.SERTIFIKAT]: Object.freeze({
		code: REWARD_CATEGORY.SERTIFIKAT,
		label: 'Sertifikat',
		deskripsi: 'Bukti kontribusi yang dapat ditunjukkan secara profesional.',
		urutan: 6,
		sorotan: false
	}),
	[REWARD_CATEGORY.DAMPAK]: Object.freeze({
		code: REWARD_CATEGORY.DAMPAK,
		label: 'Dampak',
		deskripsi: 'Menukar poin menjadi manfaat nyata bagi orang lain dan lingkungan.',
		urutan: 7,
		sorotan: true
	})
});

/** @type {ReadonlyMap<string, CommunityDef>} */
const COMMUNITY_BY_ID = new Map(COMMUNITIES.map((c) => [c.id, c]));

/** @type {ReadonlyMap<string, ChapterDef>} */
const CHAPTER_BY_ID = new Map(CHAPTERS.map((c) => [c.id, c]));

/**
 * Profil sebuah komunitas.
 * @param {string} id Salah satu CommunityType.
 * @returns {CommunityDef}
 * @throws {RangeError} bila komunitas tidak dikenal.
 */
export function komunitas(id) {
	const def = COMMUNITY_BY_ID.get(id);
	if (!def) {
		throw new RangeError(
			`Komunitas tidak dikenal: "${id}". Komunitas yang sah: ${[...COMMUNITY_BY_ID.keys()].join(', ')}`
		);
	}
	return def;
}

/**
 * Profil sebuah chapter.
 * @param {string} id Identitas chapter, mis. 'PF11'.
 * @returns {ChapterDef}
 * @throws {RangeError} bila chapter tidak dikenal.
 */
export function chapter(id) {
	const def = CHAPTER_BY_ID.get(id);
	if (!def) {
		throw new RangeError(
			`Chapter tidak dikenal: "${id}". Chapter yang sah: ${[...CHAPTER_BY_ID.keys()].join(', ')}`
		);
	}
	return def;
}

/**
 * Apakah awardee berstatus tertentu boleh memperoleh poin.
 * @param {string} status Salah satu AWARDEE_STATUS.
 * @returns {boolean}
 */
export function bolehMemperolehPoin(status) {
	return AWARDEE_STATUS_META[status]?.canEarnPoints ?? false;
}

/**
 * Apakah awardee berstatus tertentu tampil di papan peringkat.
 * @param {string} status Salah satu AWARDEE_STATUS.
 * @returns {boolean}
 */
export function tampilDiPapanPeringkat(status) {
	return AWARDEE_STATUS_META[status]?.visibleOnLeaderboard ?? false;
}

/**
 * Apakah cerita berstatus tertentu boleh tampil di zona publik.
 * @param {string} status Salah satu STORY_STATUS.
 * @returns {boolean}
 */
export function ceritaTampilPublik(status) {
	return STORY_STATUS_META[status]?.publik ?? false;
}
