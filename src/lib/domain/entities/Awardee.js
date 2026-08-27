/**
 * ENTITY: Awardee Pfriends (penerima manfaat).
 *
 * Tanggung jawab: menyimpan identitas seorang penerima manfaat komunitas beserta
 * saldo kontribusinya, dan menjawab pertanyaan "awardee ini boleh apa" di satu
 * tempat.
 *
 * **Awardee adalah penerima manfaat, BUKAN akun.** Entitas ini tidak memegang satu
 * pun field autentikasi: tidak ada peran, tidak ada surel login, tidak ada hash
 * kata sandi. Identitas login seluruhnya pindah ke `UserAccount`, dan alasannya
 * korektness, bukan kerapian: menaruh staf (verifikator, admin) sebagai baris
 * `Awardee` merusak tiga perhitungan sekaligus :
 * 1. `KpiCalculator.#coverage` memakai cacah awardee sebagai penyebut cakupan,
 *    sehingga akun staf akan mengembungkan capaian KPI M-01;
 * 2. `LeaderboardService.#visibleAwardees` menyaring hanya lewat
 *    `visibleOnLeaderboard`, sehingga staf berstatus AKTIF akan muncul di papan;
 * 3. `TierResolver.distribution` akan menghitung staf berpoin nol sebagai tier
 *    terendah dan membiaskan distribusi tier di dasbor admin.
 * Ketiganya gagal DIAM-DIAM: angkanya tetap muncul, hanya saja salah.
 *
 * Yang sengaja TIDAK dilakukan entitas ini: menghitung progres tier, memutuskan
 * kelayakan fitur publik, atau menilai kelayakan bukti ESG. Ketiganya butuh data
 * yang tidak dimiliki `Awardee` (buku besar poin, cerita, consent), sehingga
 * menaruhnya di sini berarti entitas menghitung sesuatu yang datanya bukan
 * miliknya. Itu tugas TierResolver, FeatureEligibilityPolicy, dan EsgEvidenceService.
 *
 * `tier` tetap ada sebagai getter karena: sesuai keputusan K-3: tier murni
 * turunan dari satu angka yang memang dimiliki entitas ini: `points`.
 *
 * @see docs/00-SOURCE-BRIEF.md: Hal 2 Background, Hal 4 dua komunitas, Hal 12 tier
 * @see docs/05-ARCHITECTURE.md: §4.2 entitas penerima manfaat
 * @see docs/09-BUILD-CONTRACT.md: K-3 tier murni ambang poin
 * @see docs/12-BUILD-CONTRACT-V2.md: §2.5 rename dan pencabutan field peran
 * @see docs/10-REVISION-SPEC.md: §2.4 mengapa UserAccount terpisah dari Awardee
 */

import { chapter, komunitas, bolehMemperolehPoin, tampilDiPapanPeringkat, CommunityType, AWARDEE_STATUS, AWARDEE_STATUS_META } from '../constants/community.js';
import { Points } from '../value-objects/Points.js';
import { Tier } from '../value-objects/Tier.js';

/** Jumlah token Jeda Aman maksimum yang boleh disimpan (docs/03 §7.3). */
export const MAKS_TOKEN_JEDA_AMAN = 2;

/**
 * @typedef {object} BusinessProfile
 * @property {string} businessName  Nama usaha.
 * @property {string} sector        Sektor usaha, mis. 'Kuliner'.
 * @property {string} city          Kota operasional usaha.
 * @property {number} employees     Jumlah tenaga kerja.
 * @property {number} growthPercent Pertumbuhan usaha dalam persen.
 */

/**
 * @typedef {object} AwardeeInput
 * @property {string} id
 * @property {string} fullName
 * @property {string} email
 * @property {string} [whatsapp]
 * @property {string} [avatar]
 * @property {string} community        Salah satu CommunityType.
 * @property {string} chapterId        Identitas chapter, mis. 'PF11'.
 * @property {string} [status]         Salah satu AWARDEE_STATUS; default AKTIF.
 * @property {number} [points]         Total Poin Kontribusi. Wajib sama dengan jumlah ledger.
 * @property {number} [coins]          Saldo Koin Tukar; default mengikuti points.
 * @property {number} [seasonPoints]   Poin musim berjalan; default mengikuti points.
 * @property {number} [streakWeeks]    Panjang streak mingguan berjalan.
 * @property {number} [streakDays]     Panjang streak harian berdasarkan tanggal poin masuk.
 * @property {number} [freezeTokens]   Token Jeda Aman tersimpan.
 * @property {string} [university]     Kampus asal (relevan untuk SOBI).
 * @property {string} [city]           Kota domisili.
 * @property {number} [graduationYear] Tahun lulus beasiswa.
 * @property {string} [occupation]     Pekerjaan atau peran saat ini.
 * @property {string} [bio]            Perkenalan singkat untuk direktori alumni.
 * @property {readonly string[]} [skills]     Keahlian yang ditawarkan untuk mentoring.
 * @property {readonly string[]} [badgeCodes] Kode badge yang sudah dimiliki.
 * @property {boolean} [openToMentoring]      Bersedia menjadi mentor lintas komunitas.
 * @property {boolean} [consentActive]        Punya consent aktif untuk pengolahan data.
 * @property {boolean} [anonymousOnLeaderboard] Memilih tampil anonim di papan peringkat.
 * @property {BusinessProfile|null} [businessProfile] Hanya untuk komunitas Womenpreneur.
 * @property {Date|string} joinedAt
 * @property {Date|string|null} [lastActiveAt]
 */

/**
 * Menormalkan tanggal yang boleh datang sebagai Date maupun string ISO 8601.
 * @param {Date|string|null|undefined} nilai
 * @param {string} namaField
 * @param {boolean} [wajib]
 * @returns {Date|null}
 */
function keTanggal(nilai, namaField, wajib = false) {
	if (nilai === null || nilai === undefined) {
		if (wajib) throw new TypeError(`Field "${namaField}" wajib berisi tanggal.`);
		return null;
	}
	const tanggal = nilai instanceof Date ? new Date(nilai.getTime()) : new Date(nilai);
	if (Number.isNaN(tanggal.getTime())) {
		throw new TypeError(`Field "${namaField}" harus berupa Date atau string ISO 8601 yang sah.`);
	}
	return tanggal;
}

export class Awardee {
	/** @type {Readonly<Record<string, any>>} */
	#data;

	/**
	 * @param {AwardeeInput} input Objek polos, umumnya berasal dari repository.
	 * @throws {TypeError} bila field wajib kosong.
	 * @throws {RangeError} bila enum tidak dikenal atau invarian dilanggar.
	 */
	constructor(input) {
		const {
			id,
			fullName,
			email,
			whatsapp = '',
			avatar = '',
			community,
			chapterId,
			status = AWARDEE_STATUS.AKTIF,
			points = 0,
			coins,
			seasonPoints,
			streakWeeks = 0,
			streakDays = 0,
			freezeTokens = 0,
			university = '',
			city = '',
			graduationYear = null,
			occupation = '',
			bio = '',
			skills = [],
			badgeCodes = [],
			openToMentoring = false,
			consentActive = false,
			anonymousOnLeaderboard = false,
			businessProfile = null,
			joinedAt,
			lastActiveAt = null
		} = input ?? {};

		for (const [nama, nilai] of Object.entries({ id, fullName, email, community, chapterId })) {
			if (typeof nilai !== 'string' || nilai.trim() === '') {
				throw new TypeError(`Field "${nama}" wajib berupa string tidak kosong.`);
			}
		}
		if (!Object.hasOwn(AWARDEE_STATUS_META, status)) {
			throw new RangeError(`Status awardee tidak dikenal: "${status}".`);
		}
		// Melempar RangeError bila komunitas atau chapter tidak dikenal.
		komunitas(community);
		chapter(chapterId);

		if (businessProfile !== null && community !== CommunityType.WOMENPRENEUR) {
			throw new RangeError(
				`Profil usaha hanya sah untuk komunitas Womenpreneur, awardee "${id}" berkomunitas ${community}.`
			);
		}
		if (freezeTokens < 0 || freezeTokens > MAKS_TOKEN_JEDA_AMAN) {
			throw new RangeError(
				`Token Jeda Aman harus 0..${MAKS_TOKEN_JEDA_AMAN}, diterima: ${freezeTokens}`
			);
		}

		const pk = new Points(points);
		const musim = seasonPoints === undefined ? pk : new Points(seasonPoints);
		if (musim.value > pk.value) {
			throw new RangeError(
				`Poin musim (${musim.value}) tidak boleh melebihi total poin (${pk.value}) pada awardee "${id}".`
			);
		}

		this.#data = Object.freeze({
			id,
			fullName,
			email,
			whatsapp,
			avatar,
			community,
			chapterId,
			status,
			points: pk,
			coins: new Points(coins === undefined ? points : coins),
			seasonPoints: musim,
			streakWeeks,
			streakDays,
			freezeTokens,
			university,
			city,
			graduationYear,
			occupation,
			bio,
			skills: Object.freeze([...skills]),
			badgeCodes: Object.freeze([...badgeCodes]),
			openToMentoring,
			consentActive,
			anonymousOnLeaderboard,
			businessProfile: businessProfile === null ? null : Object.freeze({ ...businessProfile }),
			joinedAt: keTanggal(joinedAt, 'joinedAt', true),
			lastActiveAt: keTanggal(lastActiveAt, 'lastActiveAt')
		});
		Object.freeze(this);
	}

	/** @returns {string} */
	get id() {
		return this.#data.id;
	}

	/** @returns {string} */
	get fullName() {
		return this.#data.fullName;
	}

	/** @returns {string} */
	get email() {
		return this.#data.email;
	}

	/** @returns {string} */
	get whatsapp() {
		return this.#data.whatsapp;
	}

	/** @returns {string} */
	get avatar() {
		return this.#data.avatar;
	}

	/** @returns {string} Salah satu CommunityType. */
	get community() {
		return this.#data.community;
	}

	/** @returns {string} */
	get chapterId() {
		return this.#data.chapterId;
	}

	/** @returns {string} Salah satu AWARDEE_STATUS. */
	get status() {
		return this.#data.status;
	}

	/** @returns {number} Total Poin Kontribusi: penentu tier. */
	get points() {
		return this.#data.points.value;
	}

	/** @returns {number} Saldo Koin Tukar yang dapat dibelanjakan. */
	get coins() {
		return this.#data.coins.value;
	}

	/** @returns {number} Poin musim berjalan. */
	get seasonPoints() {
		return this.#data.seasonPoints.value;
	}

	/** @returns {number} */
	get streakWeeks() {
		return this.#data.streakWeeks;
	}

	/** @returns {number} */
	get streakDays() {
		return this.#data.streakDays;
	}

	/** @returns {number} */
	get freezeTokens() {
		return this.#data.freezeTokens;
	}

	/** @returns {string} */
	get university() {
		return this.#data.university;
	}

	/** @returns {string} */
	get city() {
		return this.#data.city;
	}

	/** @returns {number|null} */
	get graduationYear() {
		return this.#data.graduationYear;
	}

	/** @returns {string} */
	get occupation() {
		return this.#data.occupation;
	}

	/** @returns {string} */
	get bio() {
		return this.#data.bio;
	}

	/** @returns {readonly string[]} */
	get skills() {
		return this.#data.skills;
	}

	/** @returns {readonly string[]} */
	get badgeCodes() {
		return this.#data.badgeCodes;
	}

	/** @returns {boolean} */
	get openToMentoring() {
		return this.#data.openToMentoring;
	}

	/** @returns {boolean} Punya consent aktif: gerbang ketiga fitur publik Hal 12. */
	get consentActive() {
		return this.#data.consentActive;
	}

	/** @returns {boolean} */
	get anonymousOnLeaderboard() {
		return this.#data.anonymousOnLeaderboard;
	}

	/** @returns {BusinessProfile|null} */
	get businessProfile() {
		return this.#data.businessProfile;
	}

	/** @returns {Date} */
	get joinedAt() {
		return new Date(this.#data.joinedAt.getTime());
	}

	/** @returns {Date|null} */
	get lastActiveAt() {
		return this.#data.lastActiveAt === null ? null : new Date(this.#data.lastActiveAt.getTime());
	}

	/**
	 * Tier aktif awardee: murni turunan ambang poin (K-3).
	 * @returns {Tier}
	 */
	get tier() {
		return Tier.fromPoints(this.#data.points);
	}

	/** @returns {string} Level tier, mis. 'CONTRIBUTOR'. */
	get tierLevel() {
		return this.tier.level;
	}

	/** @returns {import('../constants/community.js').CommunityDef} */
	get communityDef() {
		return komunitas(this.#data.community);
	}

	/** @returns {import('../constants/community.js').ChapterDef} */
	get chapterDef() {
		return chapter(this.#data.chapterId);
	}

	/** @returns {import('../constants/community.js').StatusDef} */
	get statusMeta() {
		return AWARDEE_STATUS_META[this.#data.status];
	}

	/** @returns {boolean} */
	get isActive() {
		return this.#data.status === AWARDEE_STATUS.AKTIF;
	}

	/** @returns {boolean} */
	get isWomenpreneur() {
		return this.#data.community === CommunityType.WOMENPRENEUR;
	}

	/**
	 * Apakah awardee berhak memperoleh poin atas aksinya.
	 * @returns {boolean}
	 */
	get canEarnPoints() {
		return bolehMemperolehPoin(this.#data.status);
	}

	/**
	 * Apakah awardee ditampilkan di papan peringkat (docs/03 §9.3).
	 * @returns {boolean}
	 */
	get visibleOnLeaderboard() {
		return tampilDiPapanPeringkat(this.#data.status);
	}

	/**
	 * Inisial untuk avatar. Dibatasi dua huruf agar tetap terbaca pada ukuran kecil.
	 * @returns {string} mis. 'RA' untuk 'Rani Ayu Pertiwi'.
	 */
	get initials() {
		const kata = this.#data.fullName.trim().split(/\s+/);
		const dipakai = kata.length === 1 ? [kata[0]] : [kata[0], kata[kata.length - 1]];
		return dipakai.map((k) => k.charAt(0).toUpperCase()).join('');
	}

	/**
	 * Nama yang layak ditampilkan di papan peringkat publik. Awardee yang memilih
	 * anonim tampil sebagai inisial dan chapter: mekanisme anti-demotivasi ke-7
	 * docs/03 §9.2 sekaligus penghormatan pilihan privasi Hal 10.
	 * @returns {string} mis. 'R.P.: Chapter PF 11'.
	 */
	get displayName() {
		if (!this.#data.anonymousOnLeaderboard) return this.#data.fullName;
		const inisial = this.initials.split('').join('.');
		return `${inisial}.: ${this.chapterDef.label}`;
	}

	/**
	 * Lama menjadi awardee dalam hari terhitung dari sebuah waktu acuan.
	 * @param {Date} [pada] Waktu acuan; default waktu sekarang.
	 * @returns {number}
	 */
	tenureDays(pada = new Date()) {
		const milidetikPerHari = 86_400_000;
		return Math.max(0, Math.floor((pada.getTime() - this.#data.joinedAt.getTime()) / milidetikPerHari));
	}

	/**
	 * Apakah awardee memiliki sebuah badge.
	 * @param {string} badgeCode
	 * @returns {boolean}
	 */
	hasBadge(badgeCode) {
		return this.#data.badgeCodes.includes(badgeCode);
	}

	/**
	 * Salinan dengan sebagian field diganti. Entitas ini immutable, sehingga
	 * perubahan selalu menghasilkan instans baru: repository menyimpan hasilnya.
	 *
	 * `seasonPoints` ikut disesuaikan ketika `points` diturunkan tanpa poin musim
	 * dinyatakan eksplisit. Tanpa penyesuaian ini, invarian "poin musim tidak
	 * melebihi total poin" akan dilanggar oleh perubahan yang tampak polos :
	 * pemanggil tidak seharusnya perlu mengingat keterkaitan dua field ini.
	 *
	 * @param {Partial<AwardeeInput>} changes
	 * @returns {Awardee}
	 */
	withChanges(changes) {
		const dasar = /** @type {AwardeeInput} */ (this.toJSON());
		const gabungan = { ...dasar, ...changes };
		if (changes.points !== undefined && changes.seasonPoints === undefined) {
			gabungan.seasonPoints = Math.min(dasar.seasonPoints ?? changes.points, changes.points);
		}
		return new Awardee(gabungan);
	}

	/**
	 * Bentuk yang disimpan ke basis data.
	 * @returns {Record<string, unknown>}
	 */
	toJSON() {
		return {
			id: this.id,
			fullName: this.fullName,
			email: this.email,
			whatsapp: this.whatsapp,
			avatar: this.avatar,
			community: this.community,
			chapterId: this.chapterId,
			status: this.status,
			points: this.points,
			coins: this.coins,
			seasonPoints: this.seasonPoints,
			streakWeeks: this.streakWeeks,
			streakDays: this.streakDays,
			freezeTokens: this.freezeTokens,
			university: this.university,
			city: this.city,
			graduationYear: this.graduationYear,
			occupation: this.occupation,
			bio: this.bio,
			skills: [...this.skills],
			badgeCodes: [...this.badgeCodes],
			openToMentoring: this.openToMentoring,
			consentActive: this.consentActive,
			anonymousOnLeaderboard: this.anonymousOnLeaderboard,
			businessProfile: this.businessProfile === null ? null : { ...this.businessProfile },
			joinedAt: this.joinedAt.toISOString(),
			lastActiveAt: this.lastActiveAt?.toISOString() ?? null
		};
	}

	/**
	 * Menerima instans Awardee apa adanya, atau membungkus objek polos dari
	 * repository. Dipakai di batas lapisan agar service tidak perlu menebak
	 * bentuk yang diterimanya.
	 * @param {Awardee|AwardeeInput} value
	 * @returns {Awardee}
	 */
	static from(value) {
		return value instanceof Awardee ? value : new Awardee(value);
	}
}
