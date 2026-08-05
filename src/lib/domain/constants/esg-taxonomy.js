/**
 * TAKSONOMI ESG — Hal 10 dokumen sumber ("ESG Measurement Hints") dan
 * Hal 12 ("Minimum for ESG evidence").
 *
 * Tanggung jawab: mendefinisikan tiga pilar ESG beserta cakupan aktivitas dan
 * field bukti yang diminta dokumen, daftar SDG yang relevan bagi Pfriends, serta
 * pemetaan aktivitas komunitas ke pilar dan SDG.
 *
 * Prinsip yang dijaga di file ini: `cakupan` dan `buktiField` bukan karangan —
 * keduanya adalah pemecahan langsung dari dua kolom tabel Hal 10, dan teks Inggris
 * aslinya disimpan pada `labelSumber` agar setiap baris dapat ditelusuri balik ke
 * slide. Field turunan yang tidak ada di Hal 10 tidak dimasukkan ke sini.
 *
 * Satu batasan penting (docs/04 §2.2): tidak semua aksi berpoin layak menjadi
 * bukti ESG. Empat aksi berpoin rendah adalah KPI aktivitas, bukan bukti dampak.
 * Tanpa batasan ini poin bisa "dicuci" menjadi klaim dampak — persis yang
 * diperingatkan Hal 11.
 *
 * @see docs/00-SOURCE-BRIEF.md — Hal 10 dan Hal 12
 * @see docs/04-ESG-GOVERNANCE.md — §1 Model Bukti Tiga Pilar, §2 Pemetaan Aktivitas
 */

import { ActivityType } from './scoring-table.js';

/**
 * Tiga pilar ESG. Kode satu huruf dipakai sebagai diskriminator di seluruh sistem.
 * @readonly
 * @enum {string}
 */
export const EsgPillar = Object.freeze({
	E: 'E',
	S: 'S',
	G: 'G'
});

/**
 * @typedef {object} EsgCakupan
 * @property {string} key         Identitas cakupan, dipakai sebagai nilai esgTag.
 * @property {string} label       Label Bahasa Indonesia untuk UI.
 * @property {string} labelSumber Teks Inggris asli Hal 10.
 */

/**
 * @typedef {object} EsgBuktiField
 * @property {string} key         Identitas field bukti.
 * @property {string} label       Label Bahasa Indonesia untuk UI.
 * @property {string} labelSumber Teks Inggris asli Hal 10 (kolom "Bukti / Metrik").
 * @property {string} deskripsi   Apa yang harus diisi agar field ini dianggap terpenuhi.
 */

/**
 * @typedef {object} EsgPillarDef
 * @property {string} pillar      Salah satu EsgPillar.
 * @property {string} label       Nama pilar Bahasa Indonesia.
 * @property {string} labelSumber Nama pilar Inggris (Hal 10).
 * @property {string} deskripsi   Ringkasan peran pilar dalam program ini.
 * @property {string} token       Nama token warna dasar (Tailwind).
 * @property {string} ink         Nama token warna aman untuk teks.
 * @property {string} tint        Nama token warna latar lembut.
 * @property {readonly EsgCakupan[]} cakupan
 * @property {readonly EsgBuktiField[]} buktiField
 */

/**
 * Tiga pilar beserta cakupan dan field buktinya, dipecah persis dari tabel Hal 10.
 * @type {readonly EsgPillarDef[]}
 */
export const ESG_PILLARS = Object.freeze([
	Object.freeze({
		pillar: EsgPillar.E,
		label: 'Lingkungan',
		labelSumber: 'Environmental',
		deskripsi:
			'Aksi dan edukasi lingkungan yang dijalankan komunitas, selaras fokus keberlanjutan Pertamina.',
		token: 'esg-e',
		ink: 'esg-e-ink',
		tint: 'esg-e-tint',
		cakupan: Object.freeze([
			Object.freeze({
				key: 'climate_literacy',
				label: 'Literasi iklim',
				labelSumber: 'Climate literacy'
			}),
			Object.freeze({
				key: 'clean_energy_campaign',
				label: 'Kampanye energi bersih',
				labelSumber: 'Clean energy campaign'
			}),
			Object.freeze({
				key: 'waste_reduction',
				label: 'Pengurangan sampah',
				labelSumber: 'Waste reduction'
			}),
			Object.freeze({
				key: 'local_environmental_action',
				label: 'Aksi lingkungan lokal',
				labelSumber: 'Local environmental action'
			})
		]),
		buktiField: Object.freeze([
			Object.freeze({
				key: 'participants',
				label: 'Jumlah peserta',
				labelSumber: 'participants',
				deskripsi: 'Hitungan kepala yang hadir, disertai rincian agregat tanpa identitas.'
			}),
			Object.freeze({
				key: 'locations',
				label: 'Lokasi aksi',
				labelSumber: 'locations',
				deskripsi:
					'Kelurahan hingga provinsi. Koordinat dibulatkan — presisi tingkat rumah dilarang.'
			}),
			Object.freeze({
				key: 'action_reports',
				label: 'Laporan aksi',
				labelSumber: 'action reports',
				deskripsi: 'Narasi kronologis persiapan, pelaksanaan, dan hasil.'
			}),
			Object.freeze({
				key: 'photos',
				label: 'Dokumentasi foto',
				labelSumber: 'photos',
				deskripsi: 'Minimal dua foto, metadata EXIF wajib dibersihkan sebelum unggah.'
			}),
			Object.freeze({
				key: 'outcomes',
				label: 'Hasil terukur',
				labelSumber: 'outcomes',
				deskripsi:
					'Metrik, nilai, dan satuan, mis. sampah terkumpul (kg) atau pohon ditanam (batang).'
			})
		])
	}),
	Object.freeze({
		pillar: EsgPillar.S,
		label: 'Sosial',
		labelSumber: 'Social',
		deskripsi:
			'Pertumbuhan alumni beasiswa dan womenpreneur binaan, termasuk mentoring dan upskilling antaranggota.',
		token: 'esg-s',
		ink: 'esg-s-ink',
		tint: 'esg-s-tint',
		cakupan: Object.freeze([
			Object.freeze({
				key: 'scholarship_alumni',
				label: 'Alumni penerima beasiswa',
				labelSumber: 'Scholarship alumni'
			}),
			Object.freeze({
				key: 'womenpreneur_growth',
				label: 'Pertumbuhan womenpreneur',
				labelSumber: 'Womenpreneur growth'
			}),
			Object.freeze({ key: 'mentoring', label: 'Mentoring', labelSumber: 'Mentoring' }),
			Object.freeze({ key: 'upskilling', label: 'Upskilling', labelSumber: 'Upskilling' }),
			Object.freeze({
				key: 'social_mobility',
				label: 'Mobilitas sosial',
				labelSumber: 'Social mobility'
			})
		]),
		buktiField: Object.freeze([
			Object.freeze({
				key: 'alumni_progress',
				label: 'Perkembangan alumni',
				labelSumber: 'alumni progress',
				deskripsi: 'Tahun lulus, status karier, dan keaktifan sebagai mentor.'
			}),
			Object.freeze({
				key: 'mentoring_hours',
				label: 'Jam mentoring',
				labelSumber: 'mentoring hours',
				deskripsi: 'Total jam, jumlah sesi, jumlah mentee agregat, dan topik yang dibahas.'
			}),
			Object.freeze({
				key: 'business_growth',
				label: 'Pertumbuhan usaha',
				labelSumber: 'business growth',
				deskripsi:
					'Persentase pertumbuhan dan jumlah tenaga kerja. Nominal omzet bersifat internal kecuali ada consent terpisah.'
			}),
			Object.freeze({
				key: 'event_completion',
				label: 'Penyelesaian kegiatan',
				labelSumber: 'event completion',
				deskripsi: 'Corong terdaftar, hadir, dan menyelesaikan beserta tingkat penyelesaiannya.'
			})
		])
	}),
	Object.freeze({
		pillar: EsgPillar.G,
		label: 'Tata Kelola',
		labelSumber: 'Governance',
		deskripsi:
			'Bukti pilar ini tidak diunggah anggota melainkan dihasilkan sistem — tata kelola harus menjadi hasil sampingan cara aplikasi bekerja, bukan laporan manual.',
		token: 'esg-g',
		ink: 'esg-g-ink',
		tint: 'esg-g-tint',
		cakupan: Object.freeze([
			Object.freeze({ key: 'consent', label: 'Persetujuan data', labelSumber: 'Consent' }),
			Object.freeze({ key: 'approval', label: 'Persetujuan konten', labelSumber: 'Approval' }),
			Object.freeze({ key: 'data_quality', label: 'Kualitas data', labelSumber: 'Data quality' }),
			Object.freeze({
				key: 'evidence_integrity',
				label: 'Integritas bukti',
				labelSumber: 'Evidence integrity'
			}),
			Object.freeze({
				key: 'escalation_protocol',
				label: 'Protokol eskalasi',
				labelSumber: 'Escalation protocol'
			})
		]),
		buktiField: Object.freeze([
			Object.freeze({
				key: 'consent_records',
				label: 'Rekaman consent',
				labelSumber: 'consent records',
				deskripsi: 'Jumlah consent aktif, dicabut, dan cakupannya terhadap total anggota.'
			}),
			Object.freeze({
				key: 'approved_stories',
				label: 'Cerita disetujui',
				labelSumber: 'approved stories',
				deskripsi: 'Rasio persetujuan dan rata-rata waktu review terhadap cerita yang diajukan.'
			}),
			Object.freeze({
				key: 'metadata',
				label: 'Kelengkapan metadata',
				labelSumber: 'metadata',
				deskripsi: 'Skor kelengkapan field wajib dan jumlah record yang belum lengkap.'
			}),
			Object.freeze({
				key: 'audit_trail',
				label: 'Jejak audit',
				labelSumber: 'audit trail',
				deskripsi: 'Rantai hash bukti dan riwayat perubahan status yang dapat diverifikasi.'
			}),
			Object.freeze({
				key: 'issue_log',
				label: 'Catatan isu',
				labelSumber: 'issue log',
				deskripsi: 'Jumlah isu terbuka, isu keparahan tinggi, dan rata-rata waktu penyelesaian.'
			})
		])
	})
]);

/**
 * @typedef {object} SdgGoal
 * @property {number} goal        Nomor tujuan SDG (1–17).
 * @property {string} label       Nama tujuan Bahasa Indonesia.
 * @property {string} labelSumber Nama tujuan Inggris (nomenklatur PBB).
 * @property {string} color       Warna resmi SDG PBB — dipakai untuk chip dan chart.
 */

/**
 * SDG yang relevan bagi Pfriends, diturunkan dari pemetaan docs/04 §2.1.
 * Bukan seluruh 17 tujuan: hanya yang benar-benar dapat dibuktikan oleh aktivitas
 * komunitas ini. Mencantumkan tujuan yang tidak pernah dibuktikan adalah bentuk
 * klaim berlebih yang justru melemahkan laporan ESG.
 * @type {readonly SdgGoal[]}
 */
export const SDG_GOALS = Object.freeze([
	Object.freeze({
		goal: 1,
		label: 'Tanpa Kemiskinan',
		labelSumber: 'No Poverty',
		color: '#E5243B'
	}),
	Object.freeze({
		goal: 4,
		label: 'Pendidikan Berkualitas',
		labelSumber: 'Quality Education',
		color: '#C5192D'
	}),
	Object.freeze({
		goal: 5,
		label: 'Kesetaraan Gender',
		labelSumber: 'Gender Equality',
		color: '#FF3A21'
	}),
	Object.freeze({
		goal: 7,
		label: 'Energi Bersih dan Terjangkau',
		labelSumber: 'Affordable and Clean Energy',
		color: '#FCC30B'
	}),
	Object.freeze({
		goal: 8,
		label: 'Pekerjaan Layak dan Pertumbuhan Ekonomi',
		labelSumber: 'Decent Work and Economic Growth',
		color: '#A21942'
	}),
	Object.freeze({
		goal: 10,
		label: 'Berkurangnya Kesenjangan',
		labelSumber: 'Reduced Inequalities',
		color: '#DD1367'
	}),
	Object.freeze({
		goal: 11,
		label: 'Kota dan Permukiman Berkelanjutan',
		labelSumber: 'Sustainable Cities and Communities',
		color: '#FD9D24'
	}),
	Object.freeze({
		goal: 12,
		label: 'Konsumsi dan Produksi yang Bertanggung Jawab',
		labelSumber: 'Responsible Consumption and Production',
		color: '#BF8B2E'
	}),
	Object.freeze({
		goal: 13,
		label: 'Penanganan Perubahan Iklim',
		labelSumber: 'Climate Action',
		color: '#3F7E44'
	}),
	Object.freeze({
		goal: 14,
		label: 'Ekosistem Lautan',
		labelSumber: 'Life Below Water',
		color: '#0A97D9'
	}),
	Object.freeze({
		goal: 15,
		label: 'Ekosistem Daratan',
		labelSumber: 'Life on Land',
		color: '#56C02B'
	}),
	Object.freeze({
		goal: 16,
		label: 'Perdamaian, Keadilan, dan Kelembagaan yang Tangguh',
		labelSumber: 'Peace, Justice and Strong Institutions',
		color: '#00689D'
	}),
	Object.freeze({
		goal: 17,
		label: 'Kemitraan untuk Mencapai Tujuan',
		labelSumber: 'Partnerships for the Goals',
		color: '#19486A'
	})
]);

/**
 * @typedef {object} EsgActivityMapping
 * @property {string} key           Identitas aktivitas komunitas.
 * @property {string} label         Label Bahasa Indonesia untuk UI.
 * @property {string} labelSumber   Rumusan aktivitas pada dokumen sumber.
 * @property {string} pillar        Pilar ESG yang diwakili.
 * @property {string} esgTag        Tag cakupan pada pilar tersebut.
 * @property {readonly number[]} sdgGoals SDG yang dapat diklaim aktivitas ini.
 * @property {string} metrikUtama   Metrik bukti utama yang wajib terisi.
 */

/**
 * Pemetaan aktivitas komunitas ke pilar ESG dan SDG (docs/04 §2.1), disusun dari
 * enam pilar aktivitas Hal 5 dan cakupan ESG Hal 10.
 * @type {readonly EsgActivityMapping[]}
 */
export const ESG_ACTIVITY_MAP = Object.freeze([
	Object.freeze({
		key: 'edukasi_iklim',
		label: 'Edukasi dan literasi iklim',
		labelSumber: 'Climate literacy',
		pillar: EsgPillar.E,
		esgTag: 'climate_literacy',
		sdgGoals: Object.freeze([13, 4]),
		metrikUtama: 'Jumlah warga teredukasi'
	}),
	Object.freeze({
		key: 'kampanye_energi_bersih',
		label: 'Kampanye energi bersih',
		labelSumber: 'Clean energy campaign',
		pillar: EsgPillar.E,
		esgTag: 'clean_energy_campaign',
		sdgGoals: Object.freeze([7, 13]),
		metrikUtama: 'Energi dihemat (kWh)'
	}),
	Object.freeze({
		key: 'pengurangan_sampah',
		label: 'Gerakan pengurangan sampah',
		labelSumber: 'Waste reduction',
		pillar: EsgPillar.E,
		esgTag: 'waste_reduction',
		sdgGoals: Object.freeze([12, 11]),
		metrikUtama: 'Sampah terkumpul (kg)'
	}),
	Object.freeze({
		key: 'aksi_lingkungan_lokal',
		label: 'Aksi lingkungan lokal',
		labelSumber: 'Local environmental action',
		pillar: EsgPillar.E,
		esgTag: 'local_environmental_action',
		sdgGoals: Object.freeze([13, 15, 14]),
		metrikUtama: 'Pohon ditanam / luas area dipulihkan'
	}),
	Object.freeze({
		key: 'perkembangan_alumni',
		label: 'Perkembangan alumni Sobat Bumi',
		labelSumber: 'Scholarship alumni progress',
		pillar: EsgPillar.S,
		esgTag: 'scholarship_alumni',
		sdgGoals: Object.freeze([4]),
		metrikUtama: 'Status karier alumni'
	}),
	Object.freeze({
		key: 'pertumbuhan_womenpreneur',
		label: 'Pertumbuhan usaha womenpreneur',
		labelSumber: 'Womenpreneur growth',
		pillar: EsgPillar.S,
		esgTag: 'womenpreneur_growth',
		sdgGoals: Object.freeze([5, 8]),
		metrikUtama: 'Pertumbuhan usaha dan tenaga kerja'
	}),
	Object.freeze({
		key: 'mentoring_lintas_komunitas',
		label: 'Mentoring alumni untuk womenpreneur',
		labelSumber: 'Mentoring alumni to Womenpreneur',
		pillar: EsgPillar.S,
		esgTag: 'mentoring',
		sdgGoals: Object.freeze([4, 8, 17]),
		metrikUtama: 'Total jam mentoring'
	}),
	Object.freeze({
		key: 'upskilling',
		label: 'Upskilling dan sharing session',
		labelSumber: 'Upskilling / sharing session',
		pillar: EsgPillar.S,
		esgTag: 'upskilling',
		sdgGoals: Object.freeze([4, 8]),
		metrikUtama: 'Tingkat penyelesaian kegiatan'
	}),
	Object.freeze({
		key: 'mobilitas_sosial',
		label: 'Mobilitas sosial dan ekonomi anggota',
		labelSumber: 'Social mobility',
		pillar: EsgPillar.S,
		esgTag: 'social_mobility',
		sdgGoals: Object.freeze([1, 8, 10]),
		metrikUtama: 'Perubahan status karier'
	}),
	Object.freeze({
		key: 'perlindungan_data',
		label: 'Consent dan perlindungan data anggota',
		labelSumber: 'Consent',
		pillar: EsgPillar.G,
		esgTag: 'consent',
		sdgGoals: Object.freeze([16]),
		metrikUtama: 'Cakupan consent aktif'
	}),
	Object.freeze({
		key: 'moderasi_konten',
		label: 'Moderasi dan persetujuan konten',
		labelSumber: 'Approval',
		pillar: EsgPillar.G,
		esgTag: 'approval',
		sdgGoals: Object.freeze([16]),
		metrikUtama: 'Rasio persetujuan cerita'
	}),
	Object.freeze({
		key: 'integritas_bukti',
		label: 'Kualitas data dan integritas bukti',
		labelSumber: 'Data quality, Evidence integrity',
		pillar: EsgPillar.G,
		esgTag: 'evidence_integrity',
		sdgGoals: Object.freeze([16]),
		metrikUtama: 'Skor kelengkapan metadata'
	}),
	Object.freeze({
		key: 'protokol_eskalasi',
		label: 'Protokol eskalasi isu',
		labelSumber: 'Escalation protocol',
		pillar: EsgPillar.G,
		esgTag: 'escalation_protocol',
		sdgGoals: Object.freeze([16]),
		metrikUtama: 'Waktu penyelesaian isu'
	}),
	Object.freeze({
		key: 'sinergi_lintas_pilar',
		label: 'Kolaborasi lintas pilar program',
		labelSumber: 'Cross-pillar synergy',
		pillar: EsgPillar.S,
		esgTag: 'cross_pillar_synergy',
		sdgGoals: Object.freeze([17]),
		metrikUtama: 'Jumlah aktivitas multi-pilar'
	})
]);

/**
 * Empat syarat gerbang bukti ESG — Hal 12 "Minimum for ESG evidence".
 * Bersifat konjungtif: bukti yang kehilangan salah satunya tidak boleh masuk
 * agregasi ESG. Dipakai EsgEvidenceService.isEvidenceReady (WP-2) dan ditampilkan
 * sebagai checklist di konsol admin.
 * @type {readonly {key: string, label: string, labelSumber: string, deskripsi: string}[]}
 */
export const ESG_EVIDENCE_GATE = Object.freeze([
	Object.freeze({
		key: 'documented_activity',
		label: 'Aktivitas terdokumentasi',
		labelSumber: 'Documented activity',
		deskripsi: 'Judul, tanggal, lokasi, dan jumlah peserta terisi lengkap.'
	}),
	Object.freeze({
		key: 'outcome_note',
		label: 'Catatan hasil',
		labelSumber: 'Outcome note',
		deskripsi: 'Menjelaskan perubahan yang terjadi, bukan sekadar deskripsi acara.'
	}),
	Object.freeze({
		key: 'esg_sdg_tag',
		label: 'Tag ESG dan SDG',
		labelSumber: 'ESG/SDG tag',
		deskripsi: 'Minimal satu pilar E/S/G dan minimal satu nomor SDG terpasang.'
	}),
	Object.freeze({
		key: 'evidence_source',
		label: 'Sumber bukti',
		labelSumber: 'Evidence source',
		deskripsi: 'Minimal satu lampiran terverifikasi: foto, laporan, tautan, atau daftar hadir.'
	})
]);

/**
 * Aksi berpoin yang layak naik menjadi bukti ESG (docs/04 §2.2). Empat aksi
 * berpoin tertinggi adalah tepat aksi yang menghasilkan bukti — desain poin dan
 * desain bukti saling menguatkan. Aksi di luar peta ini hanya menyumbang KPI
 * aktivitas dan amplifikasi.
 * @type {Readonly<Record<string, {pillar: string, sdgGoals: readonly number[], jalur: string}>>}
 */
export const ESG_ELIGIBLE_ACTIVITIES = Object.freeze({
	[ActivityType.STORY_SUBMIT]: Object.freeze({
		pillar: EsgPillar.S,
		sdgGoals: Object.freeze([4]),
		jalur: 'Masuk antrean moderasi cerita; pilar akhir mengikuti isi cerita.'
	}),
	[ActivityType.SESSION_ATTEND]: Object.freeze({
		pillar: EsgPillar.S,
		sdgGoals: Object.freeze([4, 8]),
		jalur: 'Menjadi bukti penyelesaian kegiatan upskilling.'
	}),
	[ActivityType.SPEAKER_MENTOR]: Object.freeze({
		pillar: EsgPillar.S,
		sdgGoals: Object.freeze([4, 8, 17]),
		jalur: 'Menjadi bukti jam mentoring dan fasilitasi.'
	}),
	[ActivityType.LEAD_ACTION]: Object.freeze({
		pillar: EsgPillar.E,
		sdgGoals: Object.freeze([7, 12, 13, 15]),
		jalur: 'Menjadi bukti aksi lapangan dengan laporan, foto, dan hasil terukur.'
	})
});

/** @type {ReadonlyMap<string, EsgPillarDef>} */
const PILLAR_BY_CODE = new Map(ESG_PILLARS.map((p) => [p.pillar, p]));

/** @type {ReadonlyMap<number, SdgGoal>} */
const SDG_BY_GOAL = new Map(SDG_GOALS.map((s) => [s.goal, s]));

/**
 * Definisi sebuah pilar ESG.
 * @param {string} pillar Salah satu EsgPillar.
 * @returns {EsgPillarDef}
 * @throws {RangeError} bila kode pilar tidak dikenal.
 */
export function pilarEsg(pillar) {
	const def = PILLAR_BY_CODE.get(pillar);
	if (!def) {
		throw new RangeError(
			`Pilar ESG tidak dikenal: "${pillar}". Pilar yang sah: ${[...PILLAR_BY_CODE.keys()].join(', ')}`
		);
	}
	return def;
}

/**
 * Definisi sebuah tujuan SDG.
 * @param {number} goal Nomor tujuan SDG.
 * @returns {SdgGoal}
 * @throws {RangeError} bila tujuan berada di luar daftar SDG yang relevan.
 */
export function tujuanSdg(goal) {
	const def = SDG_BY_GOAL.get(goal);
	if (!def) {
		throw new RangeError(
			`SDG ${goal} tidak termasuk tujuan yang relevan bagi Pfriends. ` +
				`Tujuan yang sah: ${[...SDG_BY_GOAL.keys()].join(', ')}`
		);
	}
	return def;
}

/**
 * Apakah sebuah aksi berpoin layak menjadi bukti ESG.
 * @param {string} activityType Salah satu ActivityType.
 * @returns {boolean}
 */
export function layakJadiBuktiEsg(activityType) {
	return Object.hasOwn(ESG_ELIGIBLE_ACTIVITIES, activityType);
}
