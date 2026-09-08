/**
 * KONSTANTA PERAN: tiga peran Pfriends dan matriks kewenangannya.
 *
 * Tanggung jawab: menjadi satu-satunya sumber kebenaran atas (a) daftar peran yang
 * sah, (b) metadata tampilannya, dan (c) kapabilitas apa yang melekat pada tiap
 * peran. Guard route, tombol keputusan, dan service editorial semuanya membaca
 * berkas ini: bukan menulis ulang daftar `if (role === ...)` masing-masing.
 *
 * Tiga keputusan desain yang tidak terbaca dari kode:
 *
 * 1. **Peran BUKAN hierarki.** `ADMIN` tidak "termasuk" `VERIFIER`. Setiap
 *    kewenangan didaftarkan eksplisit supaya dapat diaudit satu per satu, dan
 *    supaya konsekuensi yang memang disengaja tetap terlihat: Admin tidak
 *    menyetujui cerita, dan Verifikator tidak melihat KPI program.
 * 2. **`WRITE_CONTENT` dicabut dari VERIFIER.** Kepengarangan cerita hanya milik
 *    Awardee. `Story.authorId` menunjuk seorang `Awardee`, sedangkan
 *    `UserAccount.awardeeId` wajib `null` untuk peran selain AWARDEE: verifikator
 *    karenanya tidak punya identitas kepengarangan yang sah, dan pemeriksaan
 *    konflik kepentingan pada jalur cerita tidak akan pernah dapat menyala.
 *    Kontrol governance yang tidak dapat menyala bukan kontrol.
 * 3. **Identitas peran hidup di akun, bukan di penerima manfaat.** Tidak ada
 *    field peran pada `Awardee`; lihat JSDoc `entities/UserAccount.js`.
 *
 * @see docs/12-BUILD-CONTRACT-V2.md: §2.1 kontrak export dan matriks kewenangan
 * @see docs/10-REVISION-SPEC.md: §2 matriks RBAC, §2.5 larangan eksplisit Verifikator
 */

/**
 * Tiga peran Pfriends. Identifier Inggris; label Indonesia dipakai antarmuka.
 * Tamu tanpa sesi diwakili `null`, bukan anggota enum ini: supaya "tidak punya
 * peran" tidak dapat tersamar sebagai "punya peran bernama tamu".
 * @readonly
 * @enum {string}
 */
export const UserRole = Object.freeze({
	AWARDEE: 'AWARDEE',
	VERIFIER: 'VERIFIER',
	ADMIN: 'ADMIN'
});

/**
 * @typedef {object} UserRoleDef
 * @property {string} code       Kode peran, sama dengan kunci UserRole.
 * @property {string} label      Label Bahasa Indonesia untuk antarmuka.
 * @property {string} deskripsi  Penjelasan singkat batas kewenangan peran.
 * @property {string} badgeColor Nama token warna badge yang dipakai komponen.
 * @property {string} homePath   Beranda peran sesudah masuk.
 */

/**
 * Metadata tiap peran. `homePath` tinggal di sini: bukan di store sesi: supaya
 * guard, menu, dan pengalihan sesudah masuk membaca jalur yang sama persis.
 * @type {Readonly<Record<string, UserRoleDef>>}
 */
export const USER_ROLE_META = Object.freeze({
	[UserRole.AWARDEE]: Object.freeze({
		code: UserRole.AWARDEE,
		label: 'Awardee',
		deskripsi:
			'Penerima manfaat Pertamina Foundation: alumni Beasiswa Sobat Bumi atau UMKM binaan PFpreneur. Penulis cerita, pengusul kegiatan, dan pemilik consent atas datanya sendiri.',
		badgeColor: 'blue',
		homePath: '/awardee'
	}),
	[UserRole.VERIFIER]: Object.freeze({
		code: UserRole.VERIFIER,
		label: 'Verifikator',
		deskripsi:
			'Petugas kendali mutu dan kepatuhan konten. Memutuskan apa yang boleh keluar ke ruang publik dan kontribusi mana yang sah dihitung. Bekerja pada tingkat record, bukan pada angka agregat program.',
		badgeColor: 'amber',
		homePath: '/verifikator'
	}),
	[UserRole.ADMIN]: Object.freeze({
		code: UserRole.ADMIN,
		label: 'Admin PF',
		deskripsi:
			'Pengelola program Corporate Secretary. Memegang parameter, agregat, keanggotaan, diseminasi, consent, ekspor, dan jalur banding. Bukan penerima manfaat dan bukan pemutus konten.',
		badgeColor: 'navy',
		homePath: '/admin'
	})
});

/**
 * Kapabilitas yang dapat dilekatkan pada peran.
 *
 * Daftar ini sengaja kasar (sembilan butir), bukan salinan 52 baris matriks
 * `docs/10` §2.3. Kapabilitas di sini adalah kewenangan yang benar-benar dipakai
 * sebagai gerbang di kode; sisanya adalah turunan yang dijawab entitas, kebijakan
 * zona, atau kepemilikan record: bukan oleh peran semata.
 * @readonly
 * @enum {string}
 */
export const RolePermission = Object.freeze({
	WRITE_CONTENT: 'WRITE_CONTENT',
	PROPOSE_EVENT: 'PROPOSE_EVENT',
	REVIEW_CONTENT: 'REVIEW_CONTENT',
	PUBLISH_CONTENT: 'PUBLISH_CONTENT',
	VERIFY_EVIDENCE: 'VERIFY_EVIDENCE',
	VIEW_SCORING: 'VIEW_SCORING',
	VIEW_LEADERBOARD: 'VIEW_LEADERBOARD',
	MANAGE_PROGRAM: 'MANAGE_PROGRAM',
	EXPORT_DATA: 'EXPORT_DATA'
});

/**
 * Matriks kewenangan peran × kapabilitas.
 *
 * Catatan yang wajib dibaca sebelum menambah baris:
 * - `VIEW_SCORING` dimiliki AWARDEE dan ADMIN dengan arti berbeda: Awardee
 *   melihat poin miliknya sendiri, Admin melihat agregat. Pembedaan "milik siapa"
 *   bukan urusan peran, melainkan kepemilikan record.
 * - `VIEW_LEADERBOARD` hanya AWARDEE. Papan peringkat bernama tidak pernah tampil
 *   di zona publik maupun di zona Admin; Admin hanya melihat distribusi tier.
 * - VERIFIER sengaja tanpa `VIEW_SCORING`: verifikator dinilai pada mutu
 *   keputusan, bukan capaian angka.
 * @type {Readonly<Record<string, readonly string[]>>}
 */
export const ROLE_PERMISSIONS = Object.freeze({
	[UserRole.AWARDEE]: Object.freeze([
		RolePermission.WRITE_CONTENT,
		RolePermission.PROPOSE_EVENT,
		RolePermission.VIEW_SCORING,
		RolePermission.VIEW_LEADERBOARD
	]),
	[UserRole.VERIFIER]: Object.freeze([
		RolePermission.PROPOSE_EVENT,
		RolePermission.REVIEW_CONTENT,
		RolePermission.PUBLISH_CONTENT,
		RolePermission.VERIFY_EVIDENCE
	]),
	[UserRole.ADMIN]: Object.freeze([
		RolePermission.VIEW_SCORING,
		RolePermission.MANAGE_PROGRAM,
		RolePermission.EXPORT_DATA
	])
});

/**
 * Metadata sebuah peran.
 *
 * Mengembalikan `null`: bukan melempar: karena pemanggil terbesarnya adalah
 * antarmuka yang juga melayani tamu tanpa sesi. Melempar di sini akan mengubah
 * "belum masuk" menjadi galat yang merobohkan halaman.
 *
 * @param {string|null} role Kode peran, atau `null` untuk tamu.
 * @returns {UserRoleDef|null} Definisi peran, atau `null` bila tidak dikenal.
 */
export function peranPengguna(role) {
	if (typeof role !== 'string') return null;
	return USER_ROLE_META[role] ?? null;
}

/**
 * Apakah sebuah peran memegang kapabilitas tertentu.
 *
 * Tamu (`null`) selalu `false`. Peran maupun kapabilitas yang tidak dikenal juga
 * `false`: gerbang kewenangan menutup ketika ditanya hal yang tidak ia pahami.
 *
 * @param {string|null} role Kode peran, atau `null` untuk tamu.
 * @param {string} permission Salah satu RolePermission.
 * @returns {boolean}
 */
export function bolehkan(role, permission) {
	if (typeof role !== 'string' || typeof permission !== 'string') return false;
	return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
