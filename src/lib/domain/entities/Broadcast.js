/**
 * ENTITY — Kabar Pfriends (Broadcast).
 *
 * Tanggung jawab: merekam satu peristiwa penyebaran informasi ke komunitas —
 * pilar 04 Hal 5 (Diseminasi dan amplifikasi informasi).
 *
 * Broadcast sengaja dipisahkan dari materi kontennya. Satu konten dapat
 * didiseminasi berkali-kali, sementara Hal 6 menuntut dua KPI yang berbeda:
 * KPI-02 menghitung **konten** ("1–2 konten per bulan") dan KPI-03 menghitung
 * **peristiwa pengiriman** ("diseminasi minimal 2 kali per bulan"). Kalau
 * keduanya digabung menjadi satu entitas, dua KPI itu menjadi mustahil dibedakan
 * dan salah satunya pasti dilaporkan keliru.
 *
 * `openedBy` menyimpan siapa saja yang sudah membuka, bukan sekadar cacahnya.
 * Itulah yang menegakkan idempotensi aksi `BROADCAST_VIEW` — satu poin per kabar
 * seumur hidup, sehingga membuka ulang kabar lama tidak menjadi lumbung poin.
 *
 * @see docs/00-SOURCE-BRIEF.md — Hal 5 pilar 04, Hal 6 KPI diseminasi
 * @see docs/02-KPI-MODEL.md — M-02 volume konten, M-03 frekuensi diseminasi
 */

/**
 * Kanal penyebaran. Hal 4 menyebut tiga kanal Pfriends; `SEMUA` dipakai saat satu
 * kabar dikirim serentak ke seluruh kanal.
 * @readonly
 * @enum {string}
 */
export const BroadcastChannel = Object.freeze({
	WA_KOMUNITAS: 'WA_KOMUNITAS',
	MICROSITE: 'MICROSITE',
	EMAIL: 'EMAIL',
	SEMUA: 'SEMUA'
});

/**
 * Label kanal untuk UI.
 * @type {Readonly<Record<string, string>>}
 */
export const BROADCAST_CHANNEL_LABEL = Object.freeze({
	[BroadcastChannel.WA_KOMUNITAS]: 'WA Komunitas',
	[BroadcastChannel.MICROSITE]: 'Microsite Pfriends',
	[BroadcastChannel.EMAIL]: 'Surel anggota',
	[BroadcastChannel.SEMUA]: 'Semua kanal'
});

/**
 * Status siklus hidup kabar.
 * @readonly
 * @enum {string}
 */
export const BroadcastStatus = Object.freeze({
	DRAF: 'DRAF',
	TERJADWAL: 'TERJADWAL',
	TERKIRIM: 'TERKIRIM'
});

/**
 * Metadata status kabar.
 * @type {Readonly<Record<string, {code: string, label: string, badgeColor: string}>>}
 */
export const BROADCAST_STATUS_META = Object.freeze({
	[BroadcastStatus.DRAF]: Object.freeze({
		code: BroadcastStatus.DRAF,
		label: 'Draf',
		badgeColor: 'slate'
	}),
	[BroadcastStatus.TERJADWAL]: Object.freeze({
		code: BroadcastStatus.TERJADWAL,
		label: 'Terjadwal',
		badgeColor: 'blue'
	}),
	[BroadcastStatus.TERKIRIM]: Object.freeze({
		code: BroadcastStatus.TERKIRIM,
		label: 'Terkirim',
		badgeColor: 'green'
	})
});

/**
 * @typedef {object} BroadcastInput
 * @property {string} id
 * @property {string} title
 * @property {string} summary
 * @property {string} [body]
 * @property {string} [status]      Salah satu BroadcastStatus; default DRAF.
 * @property {string} [channel]     Salah satu BroadcastChannel; default WA_KOMUNITAS.
 * @property {readonly string[]} contentIds  Materi konten yang dibawa kabar ini.
 * @property {string} [contentSource]        Sumber konten, mis. 'Pertamina Foundation'.
 * @property {string} [lightCta]             Ajakan ringan yang menyertai kabar.
 * @property {string} [ctaLink]              Tautan yang dibagikan anggota saat amplifikasi.
 * @property {string} [audience]             Sasaran kabar; kosong berarti seluruh anggota.
 * @property {Date|string|null} [scheduledAt]
 * @property {Date|string|null} [sentAt]
 * @property {number} [recipientCount]       Jumlah penerima saat dikirim.
 * @property {readonly string[]} [openedBy]  Anggota yang sudah membuka kabar ini.
 * @property {readonly string[]} [amplifiedBy] Anggota yang sudah mengamplifikasi.
 */

/**
 * Menormalkan tanggal opsional.
 * @param {Date|string|null|undefined} nilai
 * @param {string} namaField
 * @returns {Date|null}
 */
function keTanggalOpsional(nilai, namaField) {
	if (nilai === null || nilai === undefined) return null;
	const tanggal = nilai instanceof Date ? new Date(nilai.getTime()) : new Date(nilai);
	if (Number.isNaN(tanggal.getTime())) {
		throw new TypeError(`Field "${namaField}" harus berupa Date atau string ISO 8601 yang sah.`);
	}
	return tanggal;
}

export class Broadcast {
	/** @type {Readonly<Record<string, any>>} */
	#data;

	/**
	 * @param {BroadcastInput} input
	 * @throws {TypeError} bila field wajib kosong.
	 * @throws {RangeError} bila enum tidak dikenal, konten kosong, atau kabar
	 *   berstatus terkirim tanpa waktu kirim.
	 */
	constructor(input) {
		const {
			id,
			title,
			summary,
			body = '',
			status = BroadcastStatus.DRAF,
			channel = BroadcastChannel.WA_KOMUNITAS,
			contentIds = [],
			contentSource = '',
			lightCta = '',
			ctaLink = '',
			audience = '',
			scheduledAt = null,
			sentAt = null,
			recipientCount = 0,
			openedBy = [],
			amplifiedBy = []
		} = input ?? {};

		for (const [nama, nilai] of Object.entries({ id, title, summary })) {
			if (typeof nilai !== 'string' || nilai.trim() === '') {
				throw new TypeError(`Field "${nama}" wajib berupa string tidak kosong.`);
			}
		}
		if (!Object.hasOwn(BROADCAST_STATUS_META, status)) {
			throw new RangeError(`Status kabar tidak dikenal: "${status}".`);
		}
		if (!Object.hasOwn(BROADCAST_CHANNEL_LABEL, channel)) {
			throw new RangeError(`Kanal kabar tidak dikenal: "${channel}".`);
		}
		if (contentIds.length === 0) {
			throw new RangeError(`Kabar "${id}" wajib membawa minimal satu materi konten.`);
		}

		const terkirim = keTanggalOpsional(sentAt, 'sentAt');
		if (status === BroadcastStatus.TERKIRIM && terkirim === null) {
			throw new RangeError(
				`Kabar "${id}" berstatus terkirim tetapi tidak punya waktu kirim — KPI frekuensi diseminasi menghitung hari kirim.`
			);
		}

		this.#data = Object.freeze({
			id,
			title,
			summary,
			body,
			status,
			channel,
			contentIds: Object.freeze([...new Set(contentIds)]),
			contentSource,
			lightCta,
			ctaLink,
			audience,
			scheduledAt: keTanggalOpsional(scheduledAt, 'scheduledAt'),
			sentAt: terkirim,
			recipientCount,
			openedBy: Object.freeze([...new Set(openedBy)]),
			amplifiedBy: Object.freeze([...new Set(amplifiedBy)])
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

	/** @returns {string} */
	get summary() {
		return this.#data.summary;
	}

	/** @returns {string} */
	get body() {
		return this.#data.body;
	}

	/** @returns {string} Salah satu BroadcastStatus. */
	get status() {
		return this.#data.status;
	}

	/** @returns {string} Salah satu BroadcastChannel. */
	get channel() {
		return this.#data.channel;
	}

	/** @returns {readonly string[]} */
	get contentIds() {
		return this.#data.contentIds;
	}

	/** @returns {string} */
	get contentSource() {
		return this.#data.contentSource;
	}

	/** @returns {string} */
	get lightCta() {
		return this.#data.lightCta;
	}

	/** @returns {string} */
	get ctaLink() {
		return this.#data.ctaLink;
	}

	/** @returns {string} */
	get audience() {
		return this.#data.audience;
	}

	/** @returns {Date|null} */
	get scheduledAt() {
		return this.#data.scheduledAt === null ? null : new Date(this.#data.scheduledAt.getTime());
	}

	/** @returns {Date|null} */
	get sentAt() {
		return this.#data.sentAt === null ? null : new Date(this.#data.sentAt.getTime());
	}

	/** @returns {number} */
	get recipientCount() {
		return this.#data.recipientCount;
	}

	/** @returns {readonly string[]} */
	get openedBy() {
		return this.#data.openedBy;
	}

	/** @returns {readonly string[]} */
	get amplifiedBy() {
		return this.#data.amplifiedBy;
	}

	/** @returns {{code: string, label: string, badgeColor: string}} */
	get statusMeta() {
		return BROADCAST_STATUS_META[this.#data.status];
	}

	/** @returns {string} */
	get channelLabel() {
		return BROADCAST_CHANNEL_LABEL[this.#data.channel];
	}

	/** @returns {boolean} */
	get isSent() {
		return this.#data.status === BroadcastStatus.TERKIRIM;
	}

	/** @returns {boolean} Punya ajakan ringan yang dapat ditanggapi anggota. */
	get hasCta() {
		return this.#data.lightCta.trim() !== '';
	}

	/** @returns {number} */
	get openCount() {
		return this.#data.openedBy.length;
	}

	/** @returns {number} */
	get amplificationCount() {
		return this.#data.amplifiedBy.length;
	}

	/**
	 * Tingkat keterbacaan kabar, dalam persen dari jumlah penerima.
	 * @returns {number} 0 bila belum ada penerima.
	 */
	get openRate() {
		if (this.#data.recipientCount === 0) return 0;
		return Math.round((this.openCount / this.#data.recipientCount) * 100);
	}

	/**
	 * Tingkat amplifikasi kabar, dalam persen dari jumlah penerima. Inilah angka
	 * yang menjawab KPI-04 Hal 6 pada level satu kabar.
	 * @returns {number} 0 bila belum ada penerima.
	 */
	get amplificationRate() {
		if (this.#data.recipientCount === 0) return 0;
		return Math.round((this.amplificationCount / this.#data.recipientCount) * 100);
	}

	/**
	 * Kunci hari kirim untuk KPI-03. Memakai komponen tanggal waktu lokal agar
	 * batas hari mengikuti zona waktu Indonesia, bukan bergeser tengah malam UTC.
	 * @returns {string|null} mis. '2026-07-14'; null bila belum terkirim.
	 */
	get sentDayKey() {
		if (this.#data.sentAt === null) return null;
		const d = this.#data.sentAt;
		const bulan = String(d.getMonth() + 1).padStart(2, '0');
		const tanggal = String(d.getDate()).padStart(2, '0');
		return `${d.getFullYear()}-${bulan}-${tanggal}`;
	}

	/** @returns {string|null} Kunci bulan kirim, mis. '2026-07'. */
	get sentMonthKey() {
		return this.sentDayKey?.slice(0, 7) ?? null;
	}

	/**
	 * Apakah seorang anggota sudah membuka kabar ini. Menjadi penjaga idempotensi
	 * aksi `BROADCAST_VIEW` — satu poin per kabar seumur hidup (docs/03 §5.2).
	 * @param {string} awardeeId
	 * @returns {boolean}
	 */
	hasOpened(awardeeId) {
		return this.#data.openedBy.includes(awardeeId);
	}

	/**
	 * Apakah seorang anggota sudah mengamplifikasi kabar ini.
	 * @param {string} awardeeId
	 * @returns {boolean}
	 */
	hasAmplified(awardeeId) {
		return this.#data.amplifiedBy.includes(awardeeId);
	}

	/**
	 * Apakah kabar ini dihitung pada KPI frekuensi diseminasi untuk sebuah bulan.
	 * @param {string} monthKey Kunci bulan, mis. '2026-07'.
	 * @returns {boolean}
	 */
	countsForDisseminationKpi(monthKey) {
		return this.isSent && this.sentMonthKey === monthKey;
	}

	/**
	 * Salinan dengan sebagian field diganti.
	 * @param {Partial<BroadcastInput>} changes
	 * @returns {Broadcast}
	 */
	withChanges(changes) {
		return new Broadcast({ .../** @type {BroadcastInput} */ (this.toJSON()), ...changes });
	}

	/**
	 * Bentuk yang disimpan ke basis data.
	 * @returns {Record<string, unknown>}
	 */
	toJSON() {
		return {
			id: this.id,
			title: this.title,
			summary: this.summary,
			body: this.body,
			status: this.status,
			channel: this.channel,
			contentIds: [...this.contentIds],
			contentSource: this.contentSource,
			lightCta: this.lightCta,
			ctaLink: this.ctaLink,
			audience: this.audience,
			scheduledAt: this.scheduledAt?.toISOString() ?? null,
			sentAt: this.sentAt?.toISOString() ?? null,
			recipientCount: this.recipientCount,
			openedBy: [...this.openedBy],
			amplifiedBy: [...this.amplifiedBy]
		};
	}

	/**
	 * Menerima instans apa adanya, atau membungkus objek polos dari repository.
	 * @param {Broadcast|BroadcastInput} value
	 * @returns {Broadcast}
	 */
	static from(value) {
		return value instanceof Broadcast ? value : new Broadcast(value);
	}
}
