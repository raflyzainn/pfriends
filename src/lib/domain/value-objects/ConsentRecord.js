/**
 * VALUE OBJECT: Rekaman Persetujuan Data (Consent).
 *
 * Tanggung jawab: menyimpan satu persetujuan anggota secara utuh dan tak dapat
 * diubah: termasuk teks persis yang disetujui, versi kebijakan yang berlaku saat
 * itu, kanal yang dicakup, dan masa berlakunya.
 *
 * Consent adalah bukti pilar Governance (Hal 10: "consent records") dan satu dari
 * lima gerbang fitur publik (Hal 12). Karena fungsinya sebagai bukti, rekaman ini
 * dibuat IMMUTABLE tanpa kecuali: `revoke()` mengembalikan instans baru dan tidak
 * pernah mengubah yang lama. Rekaman consent yang dapat disunting di tempat sama
 * saja dengan tidak punya bukti: riwayat persetujuan justru yang perlu dibuktikan
 * bila kelak dipersoalkan.
 *
 * Konsekuensi pencabutan terhadap poin dan bukti ESG diputuskan di docs/04 §4.5 dan
 * TIDAK ditangani di sini: poin dipertahankan penuh, tier tidak turun, bukti ESG
 * dianonimkan bukan dihapus. Value object ini hanya merekam faktanya; eksekusi
 * dampaknya milik lapisan service.
 *
 * @see docs/00-SOURCE-BRIEF.md: Hal 10 Governance, Hal 12 Minimum for public feature
 * @see docs/04-ESG-GOVERNANCE.md: §4 Rancangan Consent Record
 */

/**
 * Jenis persetujuan, granular per objek yang dipublikasikan (docs/04 §4.3).
 * Seluruhnya bersifat opt-in dan default tidak aktif, kecuali
 * PENGOLAHAN_DATA_INTERNAL yang aktif saat pendaftaran dan wajib diinformasikan
 * secara eksplisit di formulir.
 * @readonly
 * @enum {string}
 */
export const ConsentType = Object.freeze({
	PUBLIKASI_NAMA: 'PUBLIKASI_NAMA',
	PUBLIKASI_FOTO_WAJAH: 'PUBLIKASI_FOTO_WAJAH',
	PUBLIKASI_CERITA: 'PUBLIKASI_CERITA',
	PUBLIKASI_VIDEO: 'PUBLIKASI_VIDEO',
	PUBLIKASI_DATA_USAHA: 'PUBLIKASI_DATA_USAHA',
	PUBLIKASI_NOMINAL_OMZET: 'PUBLIKASI_NOMINAL_OMZET',
	PUBLIKASI_INSTITUSI: 'PUBLIKASI_INSTITUSI',
	AMPLIFIKASI_SOSMED: 'AMPLIFIKASI_SOSMED',
	KONTAK_UNTUK_MENTORING: 'KONTAK_UNTUK_MENTORING',
	PENGOLAHAN_DATA_INTERNAL: 'PENGOLAHAN_DATA_INTERNAL'
});

/**
 * Metadata tiap jenis consent untuk halaman pengaturan privasi anggota.
 * @type {Readonly<Record<string, {code: string, label: string, deskripsi: string, risiko: 'RENDAH'|'SEDANG'|'TINGGI', aktifSaatDaftar: boolean}>>}
 */
export const CONSENT_TYPE_META = Object.freeze({
	[ConsentType.PUBLIKASI_NAMA]: Object.freeze({
		code: ConsentType.PUBLIKASI_NAMA,
		label: 'Publikasi nama',
		deskripsi: 'Nama lengkap Anda ditampilkan pada konten publik Pfriends.',
		risiko: 'SEDANG',
		aktifSaatDaftar: false
	}),
	[ConsentType.PUBLIKASI_FOTO_WAJAH]: Object.freeze({
		code: ConsentType.PUBLIKASI_FOTO_WAJAH,
		label: 'Publikasi foto wajah',
		deskripsi: 'Wajah Anda dapat terlihat pada foto dokumentasi yang dipublikasikan.',
		risiko: 'TINGGI',
		aktifSaatDaftar: false
	}),
	[ConsentType.PUBLIKASI_CERITA]: Object.freeze({
		code: ConsentType.PUBLIKASI_CERITA,
		label: 'Publikasi cerita',
		deskripsi: 'Narasi atau testimoni Anda diterbitkan di microsite dan kanal Pertamina Foundation.',
		risiko: 'SEDANG',
		aktifSaatDaftar: false
	}),
	[ConsentType.PUBLIKASI_VIDEO]: Object.freeze({
		code: ConsentType.PUBLIKASI_VIDEO,
		label: 'Publikasi video atau suara',
		deskripsi: 'Rekaman video maupun suara Anda dapat digunakan pada konten publik.',
		risiko: 'TINGGI',
		aktifSaatDaftar: false
	}),
	[ConsentType.PUBLIKASI_DATA_USAHA]: Object.freeze({
		code: ConsentType.PUBLIKASI_DATA_USAHA,
		label: 'Publikasi profil usaha',
		deskripsi: 'Nama dan profil usaha Anda tampil di direktori serta materi promosi komunitas.',
		risiko: 'SEDANG',
		aktifSaatDaftar: false
	}),
	[ConsentType.PUBLIKASI_NOMINAL_OMZET]: Object.freeze({
		code: ConsentType.PUBLIKASI_NOMINAL_OMZET,
		label: 'Publikasi nominal omzet',
		deskripsi:
			'Angka omzet usaha ditampilkan terbuka. Tanpa persetujuan ini hanya persentase pertumbuhan yang dibagikan.',
		risiko: 'TINGGI',
		aktifSaatDaftar: false
	}),
	[ConsentType.PUBLIKASI_INSTITUSI]: Object.freeze({
		code: ConsentType.PUBLIKASI_INSTITUSI,
		label: 'Publikasi nama institusi',
		deskripsi: 'Nama kampus atau tempat kerja Anda disebutkan pada konten publik.',
		risiko: 'SEDANG',
		aktifSaatDaftar: false
	}),
	[ConsentType.AMPLIFIKASI_SOSMED]: Object.freeze({
		code: ConsentType.AMPLIFIKASI_SOSMED,
		label: 'Amplifikasi ke media sosial',
		deskripsi: 'Konten Anda dapat diunggah ulang di kanal media sosial Pertamina Foundation.',
		risiko: 'SEDANG',
		aktifSaatDaftar: false
	}),
	[ConsentType.KONTAK_UNTUK_MENTORING]: Object.freeze({
		code: ConsentType.KONTAK_UNTUK_MENTORING,
		label: 'Kontak untuk mentoring',
		deskripsi: 'Kontak Anda dibagikan kepada mentee terverifikasi yang membutuhkan pendampingan.',
		risiko: 'TINGGI',
		aktifSaatDaftar: false
	}),
	[ConsentType.PENGOLAHAN_DATA_INTERNAL]: Object.freeze({
		code: ConsentType.PENGOLAHAN_DATA_INTERNAL,
		label: 'Pengolahan data internal',
		deskripsi:
			'Data keanggotaan diolah untuk analitik dan pelaporan internal Pertamina Foundation, tanpa dipublikasikan.',
		risiko: 'RENDAH',
		aktifSaatDaftar: true
	})
});

/**
 * Status rekaman consent.
 * @readonly
 * @enum {string}
 */
export const ConsentStatus = Object.freeze({
	AKTIF: 'AKTIF',
	KEDALUWARSA: 'KEDALUWARSA',
	DICABUT: 'DICABUT',
	DITANGGUHKAN: 'DITANGGUHKAN'
});

/**
 * Kanal yang dapat dicakup sebuah persetujuan.
 * @readonly
 * @enum {string}
 */
export const ConsentChannel = Object.freeze({
	MICROSITE_PFRIENDS: 'MICROSITE_PFRIENDS',
	WEBSITE_PF: 'WEBSITE_PF',
	INSTAGRAM: 'INSTAGRAM',
	LINKEDIN: 'LINKEDIN',
	YOUTUBE: 'YOUTUBE',
	MATERI_CETAK: 'MATERI_CETAK',
	LAPORAN_INTERNAL: 'LAPORAN_INTERNAL'
});

/**
 * Cara persetujuan diberikan.
 * @readonly
 * @enum {string}
 */
export const GrantedVia = Object.freeze({
	FORM_MICROSITE: 'FORM_MICROSITE',
	TTD_DIGITAL: 'TTD_DIGITAL',
	FORMULIR_CETAK: 'FORMULIR_CETAK',
	WA_TERVERIFIKASI: 'WA_TERVERIFIKASI'
});

/**
 * Cara persetujuan dicabut.
 * @readonly
 * @enum {string}
 */
export const RevokedVia = Object.freeze({
	SELF_SERVICE: 'SELF_SERVICE',
	PERMINTAAN_EMAIL: 'PERMINTAAN_EMAIL',
	PERMINTAAN_WA: 'PERMINTAAN_WA',
	PERMINTAAN_DPO: 'PERMINTAAN_DPO'
});

/** Cakupan khusus yang berarti seluruh konten milik anggota. */
export const SCOPE_SEMUA_KONTEN = 'SEMUA_KONTEN';

/** Masa berlaku baku sebuah persetujuan, dalam bulan (docs/04 §4.2). */
export const MASA_BERLAKU_CONSENT_BULAN = 24;

/**
 * Menormalkan tanggal yang boleh datang sebagai Date maupun string ISO 8601.
 * @param {Date|string} nilai
 * @param {string} namaField
 * @returns {Date}
 */
function keTanggal(nilai, namaField) {
	const tanggal = nilai instanceof Date ? new Date(nilai.getTime()) : new Date(nilai);
	if (Number.isNaN(tanggal.getTime())) {
		throw new TypeError(`${namaField} harus berupa Date atau string ISO 8601 yang sah.`);
	}
	return tanggal;
}

/**
 * Menyalin dan membekukan daftar string agar isi rekaman tidak dapat diubah lewat
 * referensi array yang bocor keluar.
 * @param {readonly string[]} nilai
 * @param {string} namaField
 * @returns {readonly string[]}
 */
function keDaftarBeku(nilai, namaField) {
	if (!Array.isArray(nilai) || nilai.length === 0) {
		throw new TypeError(`${namaField} harus berupa array berisi minimal satu nilai.`);
	}
	return Object.freeze([...nilai]);
}

/**
 * @typedef {object} ConsentRecordInput
 * @property {string} id             Identitas rekaman.
 * @property {string} awardeeId       Awardee pemilik persetujuan.
 * @property {string} consentType    Salah satu ConsentType.
 * @property {readonly string[]} scope    Objek yang dicakup, atau [SCOPE_SEMUA_KONTEN].
 * @property {readonly string[]} channels Kanal yang dicakup: salah satu ConsentChannel.
 * @property {string} purpose        Tujuan spesifik; tujuan generik ditolak saat penyusunan formulir.
 * @property {string} policyVersion  Versi teks kebijakan, mis. 'PF-CONSENT-v1.2'.
 * @property {string} statementText  Teks persis yang disetujui, disimpan bukan dirujuk.
 * @property {Date|string} grantedAt Waktu pemberian.
 * @property {Date|string} [expiresAt] Waktu kedaluwarsa; default grantedAt + 24 bulan.
 * @property {string} [grantedVia]   Salah satu GrantedVia.
 * @property {string} [status]       Salah satu ConsentStatus; default AKTIF.
 * @property {Date|string|null} [revokedAt] Waktu pencabutan bila sudah dicabut.
 * @property {string|null} [revokedVia]     Salah satu RevokedVia.
 * @property {string|null} [revokedReason]  Alasan pencabutan: anggota tidak wajib mengisinya.
 */

export class ConsentRecord {
	/** @type {Readonly<Record<string, unknown>>} */
	#data;

	/**
	 * @param {ConsentRecordInput} input
	 * @throws {TypeError} bila field wajib kosong atau bertipe salah.
	 * @throws {RangeError} bila enum tidak dikenal atau masa berlaku tidak masuk akal.
	 */
	constructor(input) {
		const {
			id,
			awardeeId,
			consentType,
			scope,
			channels,
			purpose,
			policyVersion,
			statementText,
			grantedAt,
			expiresAt,
			grantedVia = GrantedVia.FORM_MICROSITE,
			status = ConsentStatus.AKTIF,
			revokedAt = null,
			revokedVia = null,
			revokedReason = null
		} = input ?? {};

		for (const [nama, nilai] of Object.entries({
			id,
			awardeeId,
			consentType,
			purpose,
			policyVersion,
			statementText
		})) {
			if (typeof nilai !== 'string' || nilai.trim() === '') {
				throw new TypeError(`Field "${nama}" wajib berupa string tidak kosong.`);
			}
		}

		if (!Object.hasOwn(CONSENT_TYPE_META, consentType)) {
			throw new RangeError(
				`Jenis consent tidak dikenal: "${consentType}". Jenis yang sah: ${Object.keys(CONSENT_TYPE_META).join(', ')}`
			);
		}
		if (!Object.values(ConsentStatus).includes(status)) {
			throw new RangeError(`Status consent tidak dikenal: "${status}".`);
		}
		if (!Object.values(GrantedVia).includes(grantedVia)) {
			throw new RangeError(`Cara pemberian consent tidak dikenal: "${grantedVia}".`);
		}

		const scopeBeku = keDaftarBeku(scope, 'scope');
		const channelsBeku = keDaftarBeku(channels, 'channels');
		const kanalSah = Object.values(ConsentChannel);
		for (const kanal of channelsBeku) {
			if (!kanalSah.includes(kanal)) {
				throw new RangeError(
					`Kanal consent tidak dikenal: "${kanal}". Kanal yang sah: ${kanalSah.join(', ')}`
				);
			}
		}

		const granted = keTanggal(grantedAt, 'grantedAt');
		const expires =
			expiresAt === undefined
				? new Date(
						new Date(granted).setMonth(granted.getMonth() + MASA_BERLAKU_CONSENT_BULAN)
					)
				: keTanggal(expiresAt, 'expiresAt');
		if (expires <= granted) {
			throw new RangeError('Waktu kedaluwarsa consent harus setelah waktu pemberian.');
		}

		const revoked = revokedAt === null ? null : keTanggal(revokedAt, 'revokedAt');
		if (revoked !== null && !Object.values(RevokedVia).includes(String(revokedVia))) {
			throw new RangeError(
				`Consent yang dicabut wajib menyertakan revokedVia yang sah. Diterima: "${String(revokedVia)}"`
			);
		}

		this.#data = Object.freeze({
			id,
			awardeeId,
			consentType,
			scope: scopeBeku,
			channels: channelsBeku,
			purpose,
			policyVersion,
			statementText,
			grantedAt: granted,
			grantedVia,
			expiresAt: expires,
			status,
			revokedAt: revoked,
			revokedVia: revoked === null ? null : revokedVia,
			revokedReason: revoked === null ? null : revokedReason
		});
		Object.freeze(this);
	}

	/** @returns {string} */
	get id() {
		return /** @type {string} */ (this.#data.id);
	}

	/** @returns {string} */
	get awardeeId() {
		return /** @type {string} */ (this.#data.awardeeId);
	}

	/** @returns {string} Salah satu ConsentType. */
	get consentType() {
		return /** @type {string} */ (this.#data.consentType);
	}

	/** @returns {readonly string[]} */
	get scope() {
		return /** @type {readonly string[]} */ (this.#data.scope);
	}

	/** @returns {readonly string[]} */
	get channels() {
		return /** @type {readonly string[]} */ (this.#data.channels);
	}

	/** @returns {string} */
	get purpose() {
		return /** @type {string} */ (this.#data.purpose);
	}

	/** @returns {string} */
	get policyVersion() {
		return /** @type {string} */ (this.#data.policyVersion);
	}

	/** @returns {string} Teks persis yang disetujui anggota. */
	get statementText() {
		return /** @type {string} */ (this.#data.statementText);
	}

	/** @returns {Date} */
	get grantedAt() {
		return new Date(/** @type {Date} */ (this.#data.grantedAt).getTime());
	}

	/** @returns {string} */
	get grantedVia() {
		return /** @type {string} */ (this.#data.grantedVia);
	}

	/** @returns {Date} */
	get expiresAt() {
		return new Date(/** @type {Date} */ (this.#data.expiresAt).getTime());
	}

	/** @returns {string} Salah satu ConsentStatus. */
	get status() {
		return /** @type {string} */ (this.#data.status);
	}

	/** @returns {Date|null} */
	get revokedAt() {
		const nilai = /** @type {Date|null} */ (this.#data.revokedAt);
		return nilai === null ? null : new Date(nilai.getTime());
	}

	/** @returns {string|null} */
	get revokedVia() {
		return /** @type {string|null} */ (this.#data.revokedVia);
	}

	/** @returns {string|null} */
	get revokedReason() {
		return /** @type {string|null} */ (this.#data.revokedReason);
	}

	/** @returns {string} Label jenis consent untuk UI. */
	get label() {
		return CONSENT_TYPE_META[this.consentType].label;
	}

	/** @returns {'RENDAH'|'SEDANG'|'TINGGI'} Tingkat risiko privasi jenis consent ini. */
	get risiko() {
		return CONSENT_TYPE_META[this.consentType].risiko;
	}

	/** @returns {boolean} */
	get isDicabut() {
		return this.status === ConsentStatus.DICABUT;
	}

	/**
	 * Apakah persetujuan sudah lewat masa berlaku pada saat tertentu.
	 * @param {Date} [pada] Waktu acuan; default waktu sekarang.
	 * @returns {boolean}
	 */
	isKedaluwarsa(pada = new Date()) {
		return pada >= this.expiresAt;
	}

	/**
	 * Apakah persetujuan masih dapat diandalkan sebagai dasar publikasi.
	 * Ini pemeriksaan yang dipanggil ulang tepat sebelum penerbitan konten :
	 * consent yang sah saat cerita disetujui bisa saja sudah dicabut saat cerita
	 * hendak tayang.
	 * @param {Date} [pada] Waktu acuan; default waktu sekarang.
	 * @returns {boolean}
	 */
	isAktif(pada = new Date()) {
		return this.status === ConsentStatus.AKTIF && !this.isKedaluwarsa(pada);
	}

	/**
	 * Apakah persetujuan ini mencakup sebuah objek konten.
	 * @param {string} objekId Identitas cerita atau bukti.
	 * @returns {boolean}
	 */
	mencakup(objekId) {
		return this.scope.includes(SCOPE_SEMUA_KONTEN) || this.scope.includes(objekId);
	}

	/**
	 * Apakah persetujuan ini mencakup sebuah kanal publikasi.
	 * @param {string} channel Salah satu ConsentChannel.
	 * @returns {boolean}
	 */
	mencakupKanal(channel) {
		return this.channels.includes(channel);
	}

	/**
	 * Mencabut persetujuan. Mengembalikan INSTANS BARU: rekaman lama tetap utuh
	 * sebagai bukti bahwa persetujuan itu pernah diberikan, dan pasangan keduanya
	 * itulah yang membentuk jejak audit.
	 *
	 * Alur pencabutan dilarang memuat friksi: tanpa tawaran retensi, tanpa langkah
	 * tambahan, dan `reason` sengaja opsional karena awardee tidak wajib memberi
	 * alasan atas penggunaan haknya.
	 *
	 * @param {{at?: Date|string, via?: string, reason?: string|null}} [opsi]
	 * @returns {ConsentRecord} Instans baru berstatus DICABUT.
	 * @throws {RangeError} bila rekaman sudah dicabut sebelumnya.
	 */
	revoke(opsi = {}) {
		if (this.isDicabut) {
			throw new RangeError(`Consent "${this.id}" sudah dicabut pada ${this.revokedAt?.toISOString()}.`);
		}
		const { at = new Date(), via = RevokedVia.SELF_SERVICE, reason = null } = opsi;
		return new ConsentRecord({
			id: this.id,
			awardeeId: this.awardeeId,
			consentType: this.consentType,
			scope: this.scope,
			channels: this.channels,
			purpose: this.purpose,
			policyVersion: this.policyVersion,
			statementText: this.statementText,
			grantedAt: this.grantedAt,
			grantedVia: this.grantedVia,
			expiresAt: this.expiresAt,
			status: ConsentStatus.DICABUT,
			revokedAt: at,
			revokedVia: via,
			revokedReason: reason
		});
	}

	/**
	 * Menandai persetujuan sebagai kedaluwarsa. Mengembalikan INSTANS BARU.
	 * Waktu kedaluwarsanya sudah tertulis pada `expiresAt` sejak persetujuan
	 * diberikan, jadi metode ini hanya memindahkan status: tidak menggeser tanggal.
	 * @returns {ConsentRecord}
	 * @throws {RangeError} bila rekaman sudah dicabut; pencabutan mendahului kedaluwarsa.
	 */
	kedaluwarsakan() {
		if (this.isDicabut) {
			throw new RangeError(
				`Consent "${this.id}" sudah dicabut, statusnya tidak dapat diubah menjadi kedaluwarsa.`
			);
		}
		return new ConsentRecord({
			.../** @type {ConsentRecordInput} */ (this.toJSON()),
			status: ConsentStatus.KEDALUWARSA
		});
	}

	/**
	 * Perbandingan berbasis nilai atas seluruh field yang menentukan makna rekaman.
	 * Rekaman hasil `revoke()` karenanya TIDAK sama dengan rekaman asalnya meski
	 * ber-id sama: itu memang dua keadaan berbeda dari satu persetujuan.
	 * @param {unknown} other
	 * @returns {boolean}
	 */
	equals(other) {
		if (!(other instanceof ConsentRecord)) return false;
		return JSON.stringify(this.toJSON()) === JSON.stringify(other.toJSON());
	}

	/** @returns {string} */
	toString() {
		return `${this.label} (${this.status})`;
	}

	/**
	 * Bentuk yang disimpan ke basis data. Tanggal ditulis sebagai string ISO 8601
	 * sesuai rancangan field docs/04 §4.2.
	 * @returns {Record<string, unknown>}
	 */
	toJSON() {
		return {
			id: this.id,
			awardeeId: this.awardeeId,
			consentType: this.consentType,
			scope: [...this.scope],
			channels: [...this.channels],
			purpose: this.purpose,
			policyVersion: this.policyVersion,
			statementText: this.statementText,
			grantedAt: this.grantedAt.toISOString(),
			grantedVia: this.grantedVia,
			expiresAt: this.expiresAt.toISOString(),
			status: this.status,
			revokedAt: this.revokedAt?.toISOString() ?? null,
			revokedVia: this.revokedVia,
			revokedReason: this.revokedReason
		};
	}

	/**
	 * Membangun ulang rekaman dari bentuk tersimpan.
	 * @param {ConsentRecordInput} data
	 * @returns {ConsentRecord}
	 */
	static fromJSON(data) {
		return new ConsentRecord(data);
	}
}
