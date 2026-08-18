/**
 * POLICY — Kebijakan Akses Zona.
 *
 * Tanggung jawab: menjawab satu pertanyaan untuk seluruh aplikasi — "boleh atau
 * tidak peran ini membuka jalur ini" — beserta turunannya: ke mana seseorang
 * dipulangkan, jalur tujuan mana yang aman dipakai sesudah masuk, dan kapan
 * seorang aktor sedang menilai karyanya sendiri.
 *
 * Empat keputusan desain yang tidak terbaca dari kode:
 *
 * 1. **Ini SATU-SATUNYA tempat aturan otorisasi jalur hidup.** Store sesi dan
 *    komponen penjaga zona hanya mendelegasikan ke sini. Sebelumnya aturan yang
 *    sama ditulis ulang sebagai `pathname.startsWith('/admin')` di beberapa
 *    berkas; dua salinan aturan akses selalu berakhir berselisih, dan yang
 *    tertinggal justru yang longgar.
 * 2. **Murni dan sinkron.** Tanpa `await`, tanpa penyimpanan, tanpa `$app/*`.
 *    Itulah yang membuat matriks perilaku guard dapat diuji di `node` polos untuk
 *    zona yang halamannya bahkan belum dibuat — jauh lebih murah daripada
 *    membuktikannya lewat peramban.
 * 3. **Tamu diwakili `null`, dan `null` fail-closed.** Setiap pertanyaan yang
 *    tidak dipahami kebijakan ini dijawab "tidak boleh". Zona yang tidak dikenal
 *    dianggap PUBLIK hanya untuk pemetaan jalur, sedangkan pemeriksaan peran
 *    terhadap zona tak dikenal selalu `false`.
 * 4. **Pencocokan zona dilakukan pada bentuk jalur yang dinormalkan** — tanpa
 *    query string, tanpa fragmen, tanpa garis miring akhir, dan tanpa perbedaan
 *    besar-kecil huruf. Tanpa penormalan itu, `/Admin/` dan `/admin?x=1` akan
 *    lolos sebagai jalur publik hanya karena bentuk tulisannya berbeda.
 *
 * @see docs/12-BUILD-CONTRACT-V2.md — §2.6 kontrak export, §6.4 matriks perilaku guard
 * @see docs/10-REVISION-SPEC.md — §3.6 route guard satu keputusan satu tempat, §4.3 jangkar PO-2
 */

import { bolehkan, peranPengguna, RolePermission, UserRole } from '../constants/roles.js';

/**
 * Empat zona aplikasi. Zona adalah pengelompokan jalur berdasarkan siapa yang
 * berhak masuk — bukan berdasarkan tata letak maupun menu.
 * @readonly
 * @enum {string}
 */
export const Zone = Object.freeze({
	PUBLIC: 'PUBLIC',
	AWARDEE: 'AWARDEE',
	VERIFIER: 'VERIFIER',
	ADMIN: 'ADMIN'
});

/**
 * Prefiks jalur → zona. Pencocokan: sama persis ATAU diawali `${prefix}/`.
 *
 * Pencocokan "diawali `${prefix}/`" dipilih, bukan `startsWith(prefix)` polos:
 * jalur hipotetis `/adminstrasi` tidak boleh ikut terkunci hanya karena huruf
 * awalnya sama dengan `/admin`.
 * @type {Readonly<Record<string, string>>}
 */
export const ZONE_PREFIX = Object.freeze({
	'/awardee': Zone.AWARDEE,
	'/verifikator': Zone.VERIFIER,
	'/admin': Zone.ADMIN
});

/**
 * Zona → peran yang berhak memasukinya. Array kosong berarti terbuka untuk semua,
 * termasuk tamu tanpa sesi.
 *
 * Perhatikan bahwa peran BUKAN hierarki: `ADMIN` tidak tercantum pada zona
 * verifikator, dan itu disengaja. Admin membaca agregat dan memegang jalur
 * banding; keputusan konten per record milik verifikator.
 * @type {Readonly<Record<string, readonly string[]>>}
 */
export const ZONE_ROLES = Object.freeze({
	[Zone.PUBLIC]: Object.freeze([]),
	[Zone.AWARDEE]: Object.freeze([UserRole.AWARDEE]),
	[Zone.VERIFIER]: Object.freeze([UserRole.VERIFIER]),
	[Zone.ADMIN]: Object.freeze([UserRole.ADMIN])
});

/**
 * Jalur publik yang tidak pernah menjadi tujuan sesudah masuk.
 *
 * Mengembalikan pengguna ke `/masuk` sesudah ia berhasil masuk menghasilkan gelang
 * tak berujung: halaman masuk mengalihkan pengguna ter-login ke berandanya, dan
 * beranda mengembalikannya ke `next`.
 *
 * `/daftar` dicabut pada revisi 4 Agustus 2026 bersama fitur pendaftaran mandiri —
 * alurnya kini hanya Beranda → Login.
 * @type {readonly string[]}
 */
const RUTE_TAMU = Object.freeze(['/masuk']);

/**
 * Menormalkan jalur sebelum dicocokkan dengan peta zona.
 *
 * @param {string|null|undefined} pathname Jalur mentah, boleh membawa query dan fragmen.
 * @returns {string} Jalur ternormalkan; `'/'` untuk masukan yang tidak dapat dipakai.
 */
function jalurTernormalkan(pathname) {
	if (typeof pathname !== 'string') return '/';
	const tanpaQuery = pathname.split('?')[0].split('#')[0].trim().toLowerCase();
	if (tanpaQuery === '') return '/';
	const tanpaGarisAkhir = tanpaQuery.replace(/\/+$/, '');
	return tanpaGarisAkhir === '' ? '/' : tanpaGarisAkhir;
}

export class AccessPolicy {
	/**
	 * Zona sebuah jalur.
	 *
	 * @param {string|null|undefined} pathname Jalur yang sedang dibuka.
	 * @returns {string} Salah satu Zone; `Zone.PUBLIC` untuk jalur di luar peta.
	 */
	static zoneOf(pathname) {
		const jalur = jalurTernormalkan(pathname);
		for (const [prefix, zone] of Object.entries(ZONE_PREFIX)) {
			if (jalur === prefix || jalur.startsWith(`${prefix}/`)) return zone;
		}
		return Zone.PUBLIC;
	}

	/**
	 * Apakah sebuah peran berhak memasuki sebuah zona.
	 *
	 * @param {string|null} role Kode UserRole, atau `null` untuk tamu.
	 * @param {string} zone Salah satu Zone.
	 * @returns {boolean} `false` untuk zona yang tidak dikenal — gerbang menutup
	 *   ketika ditanya hal yang tidak ia pahami.
	 */
	static canEnter(role, zone) {
		const berhak = ZONE_ROLES[zone];
		if (!berhak) return false;
		if (berhak.length === 0) return true;
		return typeof role === 'string' && berhak.includes(role);
	}

	/**
	 * Apakah sebuah peran berhak membuka sebuah jalur.
	 *
	 * Dipakai store sesi, komponen penjaga zona, dan uji perilaku guard. Jalur yang
	 * halamannya belum dibuat tetap dapat ditanyakan — kebijakan ini menjawab dari
	 * peta zona, bukan dari keberadaan berkas route.
	 *
	 * @param {string|null} role Kode UserRole, atau `null` untuk tamu.
	 * @param {string|null|undefined} pathname Jalur yang sedang dibuka.
	 * @returns {boolean}
	 */
	static canAccess(role, pathname) {
		return AccessPolicy.canEnter(role, AccessPolicy.zoneOf(pathname));
	}

	/**
	 * Beranda sebuah peran.
	 *
	 * @param {string|null} role Kode UserRole, atau `null` untuk tamu.
	 * @returns {string} Jalur beranda; `'/'` untuk tamu maupun peran tak dikenal.
	 */
	static homePathFor(role) {
		return peranPengguna(role)?.homePath ?? '/';
	}

	/**
	 * Jalur tujuan yang aman dipakai sesudah masuk.
	 *
	 * Menutup tiga kegagalan sekaligus:
	 * (a) *open redirect* — `//situs-lain.com` dan `https://situs-lain.com` adalah
	 *     jalur absolut ke host lain yang akan membawa pengguna keluar dari aplikasi
	 *     sambil membawa konteks sesinya;
	 * (b) **gelang login** — `next` yang menunjuk halaman masuk atau pendaftaran
	 *     memantulkan pengguna ter-login bolak-balik tanpa henti;
	 * (c) **pantulan zona** — `next` yang tidak boleh dibuka peran itu akan ditolak
	 *     guard tepat sesudah masuk, dan pengguna menyimpulkan loginnya gagal.
	 *
	 * @param {string|null|undefined} next Jalur tujuan yang diminta, umumnya dari query `?next=`.
	 * @param {string|null} role Peran yang baru saja masuk.
	 * @returns {string} `next` bila aman; beranda peran bila tidak.
	 */
	static safeNext(next, role) {
		const beranda = AccessPolicy.homePathFor(role);
		if (typeof next !== 'string') return beranda;

		const bersih = next.trim();
		// Hanya jalur relatif berawalan satu garis miring yang diterima. `//` dan
		// `/\` sama-sama dibaca peramban sebagai host lain, bukan sebagai jalur.
		if (!bersih.startsWith('/') || bersih.startsWith('//') || bersih.startsWith('/\\')) {
			return beranda;
		}

		const jalur = jalurTernormalkan(bersih);
		if (RUTE_TAMU.some((rute) => jalur === rute || jalur.startsWith(`${rute}/`))) return beranda;
		if (!AccessPolicy.canAccess(role, jalur)) return beranda;
		return bersih;
	}

	/**
	 * Apakah peran ini boleh melihat mekanik skor: poin, tabel skor, dan tier.
	 *
	 * Jangkar struktural PO-2. `canSeeScoring(null) === false` berarti zona publik
	 * tidak pernah punya jawaban "boleh" untuk ditanyakan — larangan gamifikasi di
	 * ruang publik menjadi aturan yang diuji, bukan kesepakatan yang akan terlupa
	 * pada halaman berikutnya. Verifikator juga `false`: ia dinilai pada mutu
	 * keputusan, bukan pada capaian angka.
	 *
	 * @param {string|null} role
	 * @returns {boolean}
	 */
	static canSeeScoring(role) {
		return bolehkan(role, RolePermission.VIEW_SCORING);
	}

	/**
	 * Apakah peran ini boleh melihat papan peringkat bernama.
	 *
	 * Hanya Awardee. Admin pun tidak — yang dilihat Admin adalah distribusi tier
	 * agregat tanpa nama, dan itu bukan papan peringkat.
	 *
	 * @param {string|null} role
	 * @returns {boolean}
	 */
	static canSeeLeaderboard(role) {
		return bolehkan(role, RolePermission.VIEW_LEADERBOARD);
	}

	/**
	 * Apakah peran ini boleh meninjau konten.
	 * @param {string|null} role
	 * @returns {boolean}
	 */
	static canReviewContent(role) {
		return bolehkan(role, RolePermission.REVIEW_CONTENT);
	}

	/**
	 * Apakah peran ini boleh menerbitkan konten.
	 * @param {string|null} role
	 * @returns {boolean}
	 */
	static canPublishContent(role) {
		return bolehkan(role, RolePermission.PUBLISH_CONTENT);
	}

	/**
	 * Apakah peran ini boleh mengusulkan kegiatan.
	 * @param {string|null} role
	 * @returns {boolean}
	 */
	static canProposeEvent(role) {
		return bolehkan(role, RolePermission.PROPOSE_EVENT);
	}

	/**
	 * Apakah aktor sedang menilai karyanya sendiri — konflik kepentingan X-01.
	 *
	 * Sengaja hanya membandingkan dua identitas, tanpa mengenal jenis kontennya.
	 * Pemanggil menentukan pasangan mana yang dibandingkan: pada jalur cerita
	 * `(actor.awardeeId, story.authorId)`, pada jalur kegiatan
	 * `(actor.id, event.proposedBy)`. Perbedaan itu bukan detail — `authorId`
	 * menunjuk seorang Awardee sedangkan `proposedBy` menunjuk sebuah UserAccount.
	 *
	 * Identitas kosong menghasilkan `false`: dua kekosongan bukan orang yang sama.
	 * Tanpa aturan itu, seluruh kegiatan warisan yang `proposedBy`-nya kosong akan
	 * mendadak tidak dapat disetujui siapa pun.
	 *
	 * @param {string|null|undefined} actorId Identitas aktor pada sumbu yang dibandingkan.
	 * @param {string|null|undefined} authorId Identitas pemilik konten pada sumbu yang sama.
	 * @returns {boolean}
	 */
	static isSelfReview(actorId, authorId) {
		if (typeof actorId !== 'string' || typeof authorId !== 'string') return false;
		const aktor = actorId.trim();
		const penulis = authorId.trim();
		if (aktor === '' || penulis === '') return false;
		return aktor === penulis;
	}
}
