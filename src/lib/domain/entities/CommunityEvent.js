/**
 * ENTITY — Kegiatan Komunitas.
 *
 * Tanggung jawab: merepresentasikan satu agenda pada Kalender Komunitas (Hal 5
 * pilar 02) — upskilling, pertemuan komunitas, atau sharing session.
 *
 * Kegiatan adalah sumber langsung KPI-05 Hal 6 ("2 aktivitas engagement
 * terlaksana") sekaligus pemasok aksi `SESSION_ATTEND`. Kata kunci Hal 6 adalah
 * "terlaksana", bukan "terjadwal" — itulah sebabnya `countsForEngagementKpi`
 * menuntut bukti dan kuorum, bukan sekadar status selesai. Kegiatan yang
 * diselenggarakan tanpa jejak apa pun tidak dapat dipertanggungjawabkan sebagai
 * capaian program.
 *
 * Sejak V2 entitas ini juga membawa jejak alur editorial: pengusul, peninjau, waktu
 * terbit. Modelnya SATU sumbu status — usulan dan eksekusi hidup pada `EventStatus`
 * yang sama; sumbu publikasi terpisah dicabut karena menuntut indeks basis data
 * kedua dan dua peta metadata yang harus dijaga sinkron oleh banyak paket paralel.
 *
 * @see docs/00-SOURCE-BRIEF.md — Hal 5 pilar 02, Hal 6 KPI aktivitas engagement
 * @see docs/02-KPI-MODEL.md — M-05 Aktivitas Engagement Terlaksana
 * @see docs/12-BUILD-CONTRACT-V2.md — §2.2 satu sumbu EventStatus, §4.1 L3-b field baru
 */

import { KPI_PARAMETERS } from '../constants/kpi-targets.js';
import { UserRole } from '../constants/roles.js';

/**
 * Jenis kegiatan, mengikuti tiga bentuk yang disebut Hal 5 pilar 02.
 * @readonly
 * @enum {string}
 */
export const EventType = Object.freeze({
	UPSKILLING: 'UPSKILLING',
	PERTEMUAN: 'PERTEMUAN',
	SHARING: 'SHARING'
});

/**
 * Metadata jenis kegiatan untuk kartu dan penyaring kalender.
 * @type {Readonly<Record<string, {code: string, label: string, deskripsi: string, badgeColor: string}>>}
 */
export const EVENT_TYPE_META = Object.freeze({
	[EventType.UPSKILLING]: Object.freeze({ code: EventType.UPSKILLING, label: 'Upskilling', deskripsi: 'Kelas peningkatan keterampilan bagi anggota komunitas.', badgeColor: 'blue' }),
	[EventType.PERTEMUAN]: Object.freeze({ code: EventType.PERTEMUAN, label: 'Pertemuan komunitas', deskripsi: 'Temu anggota lintas chapter untuk mempererat jejaring.', badgeColor: 'purple' }),
	[EventType.SHARING]: Object.freeze({ code: EventType.SHARING, label: 'Sharing session', deskripsi: 'Berbagi pengalaman dan praktik baik antaranggota.', badgeColor: 'green' })
});

/**
 * Status siklus hidup kegiatan — SATU sumbu, mencakup usulan sekaligus eksekusi.
 *
 * `DRAFT` dan `DIUSULKAN` adalah tahap sebelum kegiatan menjadi agenda resmi;
 * `TERJADWAL` berarti usulan sudah disetujui dan terbit ke kalender publik.
 * @readonly
 * @enum {string}
 */
export const EventStatus = Object.freeze({
	DRAFT: 'DRAFT',
	DIUSULKAN: 'DIUSULKAN',
	TERJADWAL: 'TERJADWAL',
	BERLANGSUNG: 'BERLANGSUNG',
	SELESAI: 'SELESAI',
	DITOLAK: 'DITOLAK',
	DIBATALKAN: 'DIBATALKAN'
});

/**
 * Metadata status kegiatan, termasuk gerbang visibilitas publik.
 *
 * Flag `publik` adalah SATU-SATUNYA sumber kebenaran atas "boleh tampil di kalender
 * publik". Penyaring lama `status !== 'DIBATALKAN'` benar selama usulan belum ada,
 * dan bocor pada hari pertama `DIUSULKAN` masuk ke enum ini — komponen dilarang
 * menyusun penyaringnya sendiri; pakai `isPubliclyVisible`.
 *
 * Setiap nilai `EventStatus` WAJIB punya entri di sini: konstruktor melempar untuk
 * status tak terdaftar, sehingga yang lupa didaftarkan menjatuhkan halaman pada
 * baris data pertama yang memakainya.
 * @type {Readonly<Record<string, {code: string, label: string, badgeColor: string, publik: boolean}>>}
 */
export const EVENT_STATUS_META = Object.freeze({
	[EventStatus.DRAFT]: Object.freeze({ code: EventStatus.DRAFT, label: 'Draf', badgeColor: 'slate', publik: false }),
	[EventStatus.DIUSULKAN]: Object.freeze({ code: EventStatus.DIUSULKAN, label: 'Diusulkan', badgeColor: 'purple', publik: false }),
	[EventStatus.TERJADWAL]: Object.freeze({ code: EventStatus.TERJADWAL, label: 'Terjadwal', badgeColor: 'blue', publik: true }),
	[EventStatus.BERLANGSUNG]: Object.freeze({ code: EventStatus.BERLANGSUNG, label: 'Berlangsung', badgeColor: 'amber', publik: true }),
	[EventStatus.SELESAI]: Object.freeze({ code: EventStatus.SELESAI, label: 'Selesai', badgeColor: 'green', publik: true }),
	[EventStatus.DITOLAK]: Object.freeze({ code: EventStatus.DITOLAK, label: 'Ditolak', badgeColor: 'red', publik: false }),
	// Kegiatan yang dibatalkan hilang dari agenda publik, tetapi tetap tersimpan pada
	// riwayat internal — pembatalan adalah fakta yang perlu dapat ditelusuri.
	[EventStatus.DIBATALKAN]: Object.freeze({ code: EventStatus.DIBATALKAN, label: 'Dibatalkan', badgeColor: 'slate', publik: false })
});

/**
 * Apakah kegiatan berstatus tertentu boleh tampil di zona publik.
 *
 * Berpasangan dengan `ceritaTampilPublik()` (`constants/community.js`) supaya kedua
 * jenis konten dibaca dengan pola yang sama. Ia tinggal di sini, bukan di berkas
 * konstanta, karena sumber jawabannya `EVENT_STATUS_META` juga di sini.
 *
 * @param {string} status Salah satu EventStatus.
 * @returns {boolean} `false` untuk status yang tidak dikenal.
 */
export function kegiatanTampilPublik(status) {
	return EVENT_STATUS_META[status]?.publik ?? false;
}

/**
 * @typedef {object} CommunityEventInput
 * @property {string} id
 * @property {string} title
 * @property {string} type            Salah satu EventType.
 * @property {string} [slug]          Slug URL halaman detail; diturunkan dari judul bila kosong.
 * @property {string} [status]        Salah satu EventStatus; default TERJADWAL.
 * @property {string} [description]
 * @property {string} [speakerName]   Narasumber kegiatan.
 * @property {string} [chapterId]     Chapter penyelenggara; kosong berarti lintas chapter.
 * @property {string} [community]     Komunitas sasaran; kosong berarti kedua komunitas.
 * @property {string} [location]      Lokasi atau kanal daring.
 * @property {boolean} [isOnline]
 * @property {Date|string} startsAt
 * @property {Date|string} endsAt
 * @property {number} [quota]                 Kapasitas peserta; 0 berarti tanpa batas.
 * @property {string} [proposedBy]            Id akun pengusul kegiatan.
 * @property {string} [proposedByRole]        Peran pengusul; salah satu UserRole.
 * @property {Date|string|null} [submittedAt] Waktu usulan diajukan.
 * @property {string} [reviewedBy]            Id akun verifikator yang memutuskan.
 * @property {Date|string|null} [reviewedAt]  Waktu keputusan peninjauan.
 * @property {string} [reviewNote]            Catatan keputusan; wajib terisi saat menolak.
 * @property {Date|string|null} [publishedAt] Waktu kegiatan terbit ke kalender publik.
 * @property {readonly string[]} [registeredAwardeeIds]
 * @property {readonly string[]} [attendeeAwardeeIds]
 * @property {readonly string[]} [evidenceRefs]  Dokumentasi pelaksanaan.
 * @property {string} [outcomeNote]              Catatan hasil pelaksanaan.
 */

/**
 * Menormalkan tanggal wajib.
 * @param {Date|string} nilai
 * @param {string} namaField
 * @returns {Date}
 */
function keTanggal(nilai, namaField) {
	const tanggal = nilai instanceof Date ? new Date(nilai.getTime()) : new Date(nilai);
	if (Number.isNaN(tanggal.getTime())) {
		throw new TypeError(`Field "${namaField}" harus berupa Date atau string ISO 8601 yang sah.`);
	}
	return tanggal;
}

/**
 * Menormalkan tanggal opsional.
 * @param {Date|string|null|undefined} nilai
 * @param {string} namaField
 * @returns {Date|null}
 */
function keTanggalOpsional(nilai, namaField) {
	return nilai === null || nilai === undefined ? null : keTanggal(nilai, namaField);
}

/**
 * Slug URL dari sebuah judul. Dipakai sebagai NILAI BAWAAN saja: baris kegiatan lama
 * tidak punya `slug`, dan membiarkannya kosong membuat tautan detail menunjuk
 * `/kalender/` tanpa penciri.
 *
 * @param {string} judul
 * @returns {string}
 */
function keSlug(judul) {
	return judul
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

export class CommunityEvent {
	/** @type {Readonly<Record<string, any>>} */
	#data;

	/**
	 * @param {CommunityEventInput} input
	 * @throws {TypeError} bila field wajib kosong.
	 * @throws {RangeError} bila enum tidak dikenal atau rentang waktu terbalik.
	 */
	constructor(input) {
		const {
			id,
			title,
			type,
			slug = '',
			status = EventStatus.TERJADWAL,
			description = '',
			speakerName = '',
			chapterId = '',
			community = '',
			location = '',
			isOnline = true,
			startsAt,
			endsAt,
			quota = 0,
			proposedBy = '',
			proposedByRole = '',
			submittedAt = null,
			reviewedBy = '',
			reviewedAt = null,
			reviewNote = '',
			publishedAt = null,
			registeredAwardeeIds = [],
			attendeeAwardeeIds = [],
			evidenceRefs = [],
			outcomeNote = ''
		} = input ?? {};

		for (const [nama, nilai] of Object.entries({ id, title, type })) {
			if (typeof nilai !== 'string' || nilai.trim() === '') {
				throw new TypeError(`Field "${nama}" wajib berupa string tidak kosong.`);
			}
		}
		if (!Object.hasOwn(EVENT_TYPE_META, type)) {
			throw new RangeError(`Jenis kegiatan tidak dikenal: "${type}".`);
		}
		if (!Object.hasOwn(EVENT_STATUS_META, status)) {
			throw new RangeError(`Status kegiatan tidak dikenal: "${status}".`);
		}
		// Peran pengusul boleh kosong (kegiatan warisan sebelum alur usulan ada), tetapi
		// bila terisi wajib peran yang dikenal: jejak audit berisi peran karangan lebih
		// buruk daripada jejak audit yang kosong.
		if (proposedByRole !== '' && !Object.hasOwn(UserRole, proposedByRole)) {
			throw new RangeError(`Peran pengusul kegiatan tidak dikenal: "${proposedByRole}".`);
		}

		const mulai = keTanggal(startsAt, 'startsAt');
		const selesai = keTanggal(endsAt, 'endsAt');
		if (selesai < mulai) {
			throw new RangeError(`Kegiatan "${id}" berakhir sebelum dimulai.`);
		}

		this.#data = Object.freeze({
			id,
			title,
			type,
			slug: slug.trim() === '' ? keSlug(title) : slug,
			status,
			description,
			speakerName,
			chapterId,
			community,
			location,
			isOnline,
			startsAt: mulai,
			endsAt: selesai,
			quota,
			proposedBy,
			proposedByRole,
			submittedAt: keTanggalOpsional(submittedAt, 'submittedAt'),
			reviewedBy,
			reviewedAt: keTanggalOpsional(reviewedAt, 'reviewedAt'),
			reviewNote,
			publishedAt: keTanggalOpsional(publishedAt, 'publishedAt'),
			registeredAwardeeIds: Object.freeze([...registeredAwardeeIds]),
			attendeeAwardeeIds: Object.freeze([...attendeeAwardeeIds]),
			evidenceRefs: Object.freeze([...evidenceRefs]),
			outcomeNote
		});
		Object.freeze(this);
	}

	/** @returns {string} */
	get id() {
		return this.#data.id;
	}

	/** @returns {string} */
	get title() {
		return this.#data.title;
	}

	/** @returns {string} Salah satu EventType. */
	get type() {
		return this.#data.type;
	}

	/** @returns {string} Slug URL halaman detail kegiatan. */
	get slug() {
		return this.#data.slug;
	}

	/** @returns {string} Salah satu EventStatus. */
	get status() {
		return this.#data.status;
	}

	/** @returns {string} */
	get description() {
		return this.#data.description;
	}

	/** @returns {string} */
	get speakerName() {
		return this.#data.speakerName;
	}

	/** @returns {string} */
	get chapterId() {
		return this.#data.chapterId;
	}

	/** @returns {string} */
	get community() {
		return this.#data.community;
	}

	/** @returns {string} */
	get location() {
		return this.#data.location;
	}

	/** @returns {boolean} */
	get isOnline() {
		return this.#data.isOnline;
	}

	/** @returns {Date} */
	get startsAt() {
		return new Date(this.#data.startsAt.getTime());
	}

	/** @returns {Date} */
	get endsAt() {
		return new Date(this.#data.endsAt.getTime());
	}

	/** @returns {number} Kapasitas peserta; 0 berarti tanpa batas. */
	get quota() {
		return this.#data.quota;
	}

	/** @returns {string} Id akun pengusul kegiatan; kosong untuk kegiatan warisan. */
	get proposedBy() {
		return this.#data.proposedBy;
	}

	/** @returns {string} Peran pengusul saat mengusulkan; salah satu UserRole atau kosong. */
	get proposedByRole() {
		return this.#data.proposedByRole;
	}

	/** @returns {Date|null} */
	get submittedAt() {
		return this.#data.submittedAt === null ? null : new Date(this.#data.submittedAt.getTime());
	}

	/** @returns {string} Id akun verifikator yang memutuskan usulan. */
	get reviewedBy() {
		return this.#data.reviewedBy;
	}

	/** @returns {Date|null} */
	get reviewedAt() {
		return this.#data.reviewedAt === null ? null : new Date(this.#data.reviewedAt.getTime());
	}

	/** @returns {string} Catatan keputusan peninjauan. */
	get reviewNote() {
		return this.#data.reviewNote;
	}

	/** @returns {Date|null} Waktu kegiatan terbit ke kalender publik. */
	get publishedAt() {
		return this.#data.publishedAt === null ? null : new Date(this.#data.publishedAt.getTime());
	}

	/** @returns {readonly string[]} Data pribadi — dilarang tampil di zona publik. */
	get registeredAwardeeIds() {
		return this.#data.registeredAwardeeIds;
	}

	/** @returns {readonly string[]} Data pribadi — dilarang tampil di zona publik. */
	get attendeeAwardeeIds() {
		return this.#data.attendeeAwardeeIds;
	}

	/** @returns {readonly string[]} */
	get evidenceRefs() {
		return this.#data.evidenceRefs;
	}

	/** @returns {string} */
	get outcomeNote() {
		return this.#data.outcomeNote;
	}

	/** @returns {{code: string, label: string, deskripsi: string, badgeColor: string}} */
	get typeMeta() {
		return EVENT_TYPE_META[this.#data.type];
	}

	/** @returns {{code: string, label: string, badgeColor: string, publik: boolean}} */
	get statusMeta() {
		return EVENT_STATUS_META[this.#data.status];
	}

	/** @returns {number} */
	get registeredCount() {
		return this.#data.registeredAwardeeIds.length;
	}

	/** @returns {number} Jumlah peserta yang benar-benar hadir. */
	get attendeeCount() {
		return this.#data.attendeeAwardeeIds.length;
	}

	/** @returns {number} Sisa kursi; `Infinity` bila kegiatan tanpa kuota. */
	get remainingSeats() {
		if (this.#data.quota === 0) return Number.POSITIVE_INFINITY;
		return Math.max(0, this.#data.quota - this.registeredCount);
	}

	/** @returns {boolean} */
	get isFull() {
		return this.remainingSeats === 0;
	}

	/** @returns {boolean} */
	get isCompleted() {
		return this.#data.status === EventStatus.SELESAI;
	}

	/** @returns {boolean} */
	get isCancelled() {
		return this.#data.status === EventStatus.DIBATALKAN;
	}

	/** @returns {boolean} Masih berupa usulan yang menunggu keputusan verifikator. */
	get isProposal() {
		return this.#data.status === EventStatus.DIUSULKAN;
	}

	/**
	 * Gerbang TUNGGAL visibilitas publik kegiatan. Penyaring buatan sendiri di komponen
	 * akan membocorkan usulan mentah sebagai agenda resmi — kebocoran yang tidak
	 * tertangkap gerbang statis mana pun karena kodenya tetap sah.
	 * @returns {boolean}
	 */
	get isPubliclyVisible() {
		return kegiatanTampilPublik(this.#data.status);
	}

	/**
	 * Kunci bulan kalender waktu lokal, mis. '2026-07'. Ada di entity supaya grid bulan
	 * tidak menghitung tanggalnya sendiri — perhitungan yang tersebar adalah sumber
	 * klasik selisih satu hari antar tampilan.
	 * @returns {string}
	 */
	get monthKey() {
		const mulai = this.#data.startsAt;
		return `${mulai.getFullYear()}-${String(mulai.getMonth() + 1).padStart(2, '0')}`;
	}

	/** @returns {number} Durasi kegiatan dalam menit. */
	get durationMinutes() {
		const milidetikPerMenit = 60_000;
		return Math.round((this.#data.endsAt.getTime() - this.#data.startsAt.getTime()) / milidetikPerMenit);
	}

	/**
	 * Tingkat kehadiran terhadap jumlah pendaftar, dalam persen.
	 * @returns {number} 0 bila belum ada pendaftar.
	 */
	get attendanceRate() {
		if (this.registeredCount === 0) return 0;
		return Math.round((this.attendeeCount / this.registeredCount) * 100);
	}

	/** @returns {boolean} Punya dokumentasi pelaksanaan. */
	get hasEvidence() {
		return this.#data.evidenceRefs.length > 0;
	}

	/**
	 * Apakah kegiatan ini sah dihitung pada KPI-05 Hal 6.
	 *
	 * Tiga syarat serentak sesuai definisi operasional docs/02 M-05: berstatus
	 * selesai, punya minimal satu lampiran bukti, dan jumlah hadir mencapai
	 * kuorum. Syarat kedua dan ketiga adalah penerjemahan kata "terlaksana" —
	 * tanpa keduanya yang terhitung hanyalah niat menyelenggarakan.
	 * @returns {boolean}
	 */
	get countsForEngagementKpi() {
		return (
			this.isCompleted && this.hasEvidence && this.attendeeCount >= KPI_PARAMETERS.kuorumEngagement
		);
	}

	/**
	 * Apakah kegiatan berlangsung sesudah waktu acuan.
	 *
	 * **BUKAN penyaring publik.** Ia sengaja tidak mengecualikan usulan, karena zona
	 * Awardee memakainya untuk tab "usulan saya". Agenda publik wajib disaring
	 * `isPubliclyVisible` LEBIH DULU, baru `isUpcoming()`.
	 *
	 * @param {Date} [pada] Waktu acuan; default waktu sekarang.
	 * @returns {boolean}
	 */
	isUpcoming(pada = new Date()) {
		return this.#data.startsAt > pada && !this.isCancelled;
	}

	/**
	 * Apakah kegiatan jatuh pada tanggal kalender yang sama dengan tanggal acuan.
	 * Perbandingan pada waktu lokal, bukan UTC: kalender yang dilihat pengguna adalah
	 * kalender zona waktunya sendiri.
	 *
	 * @param {Date} date Tanggal acuan.
	 * @returns {boolean}
	 */
	occursOn(date) {
		const mulai = this.#data.startsAt;
		return (
			mulai.getFullYear() === date.getFullYear() &&
			mulai.getMonth() === date.getMonth() &&
			mulai.getDate() === date.getDate()
		);
	}

	/**
	 * Apakah seorang awardee terdaftar pada kegiatan ini.
	 * @param {string} awardeeId
	 * @returns {boolean}
	 */
	isRegistered(awardeeId) {
		return this.#data.registeredAwardeeIds.includes(awardeeId);
	}

	/**
	 * Apakah seorang awardee tercatat hadir.
	 * @param {string} awardeeId
	 * @returns {boolean}
	 */
	hasAttended(awardeeId) {
		return this.#data.attendeeAwardeeIds.includes(awardeeId);
	}

	/**
	 * Salinan dengan sebagian field diganti.
	 * @param {Partial<CommunityEventInput>} changes
	 * @returns {CommunityEvent}
	 */
	withChanges(changes) {
		return new CommunityEvent({
			.../** @type {CommunityEventInput} */ (this.toJSON()),
			...changes
		});
	}

	/**
	 * Bentuk yang disimpan ke basis data.
	 * @returns {Record<string, unknown>}
	 */
	toJSON() {
		return {
			id: this.id,
			title: this.title,
			type: this.type,
			slug: this.slug,
			status: this.status,
			description: this.description,
			speakerName: this.speakerName,
			chapterId: this.chapterId,
			community: this.community,
			location: this.location,
			isOnline: this.isOnline,
			startsAt: this.startsAt.toISOString(),
			endsAt: this.endsAt.toISOString(),
			quota: this.quota,
			proposedBy: this.proposedBy,
			proposedByRole: this.proposedByRole,
			submittedAt: this.submittedAt?.toISOString() ?? null,
			reviewedBy: this.reviewedBy,
			reviewedAt: this.reviewedAt?.toISOString() ?? null,
			reviewNote: this.reviewNote,
			publishedAt: this.publishedAt?.toISOString() ?? null,
			registeredAwardeeIds: [...this.registeredAwardeeIds],
			attendeeAwardeeIds: [...this.attendeeAwardeeIds],
			evidenceRefs: [...this.evidenceRefs],
			outcomeNote: this.outcomeNote
		};
	}

	/**
	 * Menerima instans apa adanya, atau membungkus objek polos dari repository.
	 * @param {CommunityEvent|CommunityEventInput} value
	 * @returns {CommunityEvent}
	 */
	static from(value) {
		return value instanceof CommunityEvent ? value : new CommunityEvent(value);
	}
}
