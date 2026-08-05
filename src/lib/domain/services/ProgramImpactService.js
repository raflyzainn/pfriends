/**
 * SERVICE — Dampak Program untuk Zona Publik.
 *
 * Tanggung jawab: menyusun SATU potret angka agregat level program yang boleh
 * dibaca siapa pun tanpa masuk — dan hanya itu.
 *
 * Empat keputusan desain yang tidak terbaca dari kode:
 *
 * 1. **Bentuk kembaliannya adalah penegakan PO-2, bukan sekadar disiplin.**
 *    `PublicImpactSnapshot` tidak memuat satu pun field poin, tier, peringkat,
 *    lencana, maupun rupiah. Zona publik karenanya tidak dapat membocorkannya
 *    secara struktural: tidak ada kunci yang dapat dirender, sehingga tidak ada
 *    kebocoran yang mungkin terjadi karena seseorang lupa satu penyaring.
 * 2. **Satu-satunya sumber angka publik.** Halaman publik dilarang menyentuh
 *    repository. Dua jalur menuju angka yang sama akan berselisih pada hari
 *    salah satunya diperbaiki, dan yang tertinggal justru yang dipajang di
 *    halaman muka.
 * 3. **Kelas angka dibedakan dan dapat dibaca komponen.** Angka terhitung (A),
 *    estimasi berparameter (B), dan benchmark eksternal (C) tidak boleh disajikan
 *    dengan tipografi yang sama. Peta `IMPACT_FIGURE_CLASS` dan daftar
 *    `BENCHMARK_RUJUKAN` disediakan supaya pelabelan itu bersumber dari domain,
 *    bukan dari kesepakatan lisan antar halaman. Menyatukan angka berbeda kelas
 *    menjadi satu "skor dampak" dilarang — hasilnya tidak berarti apa pun.
 * 4. **Jangkauan organik WAJIB rentang.** Ia lahir dari perkalian dengan parameter
 *    berasumsi; satu angka tunggal akan terbaca sebagai hasil ukur, dan klaim itu
 *    tidak dapat dipertahankan saat ditanya "diukur bagaimana?".
 *
 * @see docs/12-BUILD-CONTRACT-V2.md — §2.10 kontrak export dan kontrak keras PO-2
 * @see docs/10-REVISION-SPEC.md — §4.4 klasifikasi angka, §4.5 penempatan angka Hal 6, §4.6 aturan Dampak
 */

import { CHAPTERS } from '../constants/community.js';
import { REACH_PARAMETERS } from '../constants/kpi-targets.js';
import { ActivityType } from '../constants/scoring-table.js';
import { Awardee } from '../entities/Awardee.js';
import { CommunityEvent } from '../entities/CommunityEvent.js';
import { Movement } from '../entities/Movement.js';
import { PointActivity } from '../entities/PointActivity.js';
import { Story } from '../entities/Story.js';

/** Aksi yang dihitung sebagai amplifikasi — sama dengan definisi M-04. */
const AKSI_AMPLIFIKASI = Object.freeze([ActivityType.SHARE_PRIVATE, ActivityType.SHARE_PUBLIC]);

/**
 * Kelas tiap angka potret publik menurut docs/10 §4.4.
 *
 * `A` terhitung — cacah langsung dari record, boleh disajikan sebagai angka tegas
 * berikut tanggal potret dan penyebutnya.
 * `B` estimasi berparameter — WAJIB rentang, berlabel estimasi, dengan tautan ke
 * halaman metode pengukuran.
 * `C` benchmark eksternal — bukan hasil pengukuran Pfriends; ditulis sebagai
 * kalimat rujukan, tanpa angka besar, tanpa gauge, tanpa panah naik.
 * @type {Readonly<Record<string, string>>}
 */
export const IMPACT_FIGURE_CLASS = Object.freeze({
	registeredAwardees: 'A',
	activeChapters: 'A',
	totalChapters: 'A',
	publishedStories: 'A',
	completedEvents: 'A',
	upcomingEvents: 'A',
	runningMovements: 'A',
	recordedActions: 'A',
	amplifiersThisMonth: 'A',
	organicReach: 'B'
});

/**
 * @typedef {object} BenchmarkRujukan
 * @property {string} id       Penciri rujukan.
 * @property {string} kelas    Selalu 'C'.
 * @property {string} kalimat  Kalimat rujukan siap tampil — bukan angka besar.
 * @property {string} sumber   Asal angka rujukan.
 */

/**
 * Angka kelas C yang dikutip Hal 6.
 *
 * Disediakan sebagai KALIMAT, bukan sebagai angka, supaya halaman publik tidak
 * tergoda merendernya sebagai capaian. Keduanya adalah rujukan industri: Pfriends
 * tidak dapat membaca engagement akun pribadi anggota, dan kata "hingga" pada
 * penghematan paid media menyatakan batas atas, bukan nilai harapan.
 * @type {readonly BenchmarkRujukan[]}
 */
export const BENCHMARK_RUJUKAN = Object.freeze([
	Object.freeze({
		id: 'engagement-komunitas',
		kelas: 'C',
		kalimat: `Benchmark komunikasi menyebut konten komunitas memperoleh keterlibatan ${REACH_PARAMETERS.pengaliEngagementMin}–${REACH_PARAMETERS.pengaliEngagementMax} kali lebih tinggi dibanding unggahan akun merek.`,
		sumber: 'Hal 6 — Dampak Inisiatif (benchmark komunikasi, bukan hasil ukur Pfriends).'
	}),
	Object.freeze({
		id: 'penghematan-paid-media',
		kelas: 'C',
		kalimat: `Rujukan yang sama memperkirakan kebutuhan paid media dapat menurun hingga ${Math.round(REACH_PARAMETERS.penghematanPaidMediaMax * 100)} persen bila amplifikasi organik berjalan.`,
		sumber: 'Hal 6 — Dampak Inisiatif (kata "hingga" menyatakan batas atas).'
	})
]);

/**
 * Kelas sebuah angka potret publik.
 *
 * @param {string} key Nama field pada PublicImpactSnapshot.
 * @returns {string} 'A', 'B', 'C', atau `''` bila field tidak berkelas (mis. `capturedAt`).
 */
export function kelasAngka(key) {
	return IMPACT_FIGURE_CLASS[key] ?? '';
}

/**
 * @typedef {object} PublicImpactSnapshot
 * @property {Date}   capturedAt           Tanggal potret — wajib ditampilkan bersama angkanya.
 * @property {number} registeredAwardees   Awardee AKTIF ber-consent aktif.
 * @property {number} activeChapters       Chapter dengan minimal satu awardee aktif.
 * @property {number} totalChapters        Cacah chapter yang ada — penyebut "n dari 3".
 * @property {number} publishedStories     Cerita yang tampil publik.
 * @property {number} completedEvents      Hanya yang sah dihitung KPI keterlibatan.
 * @property {number} upcomingEvents       Kegiatan publik yang akan datang.
 * @property {number} runningMovements     Gerakan bersama berstatus berjalan.
 * @property {number} recordedActions      Cacah aksi tercatat — TANPA nilai poinnya.
 * @property {number} amplifiersThisMonth  Orang yang mengamplifikasi bulan ini.
 * @property {{min: number, max: number, basis: number}} organicReach Kelas B — wajib rentang.
 * @property {{value: number|null, source: string}} beneficiaryRegistry Penyebut populasi.
 */

export class ProgramImpactService {
	/** @type {import('../repositories/Repository.js').Repository} */
	#awardeeRepo;
	/** @type {import('../repositories/Repository.js').Repository} */
	#activityRepo;
	/** @type {import('../repositories/Repository.js').Repository} */
	#movementRepo;
	/** @type {import('../repositories/Repository.js').Repository} */
	#storyRepo;
	/** @type {import('../repositories/Repository.js').Repository} */
	#eventRepo;
	/** @type {number|null} */
	#registrySize;
	/** @type {() => Date} */
	#clock;

	/**
	 * @param {object} deps
	 * @param {import('../repositories/Repository.js').Repository} deps.awardeeRepo
	 * @param {import('../repositories/Repository.js').Repository} deps.activityRepo
	 * @param {import('../repositories/Repository.js').Repository} deps.movementRepo
	 * @param {import('../repositories/Repository.js').Repository} deps.storyRepo
	 * @param {import('../repositories/Repository.js').Repository} deps.eventRepo
	 * @param {number} [deps.registrySize] Ukuran registry penerima manfaat. Satu-satunya
	 *   jalan mengisi `beneficiaryRegistry.value`; tanpa injeksi ini nilainya `null` dan
	 *   komponen WAJIB memakai periode sebagai konteks — mengarang penyebut dilarang.
	 * @param {() => Date} [deps.clock] Sumber waktu; disuntik agar potret bersifat deterministik.
	 * @throws {TypeError} bila ada repository yang tidak diberikan.
	 */
	constructor({
		awardeeRepo,
		activityRepo,
		movementRepo,
		storyRepo,
		eventRepo,
		registrySize,
		clock
	} = {}) {
		for (const [nama, repo] of Object.entries({
			awardeeRepo,
			activityRepo,
			movementRepo,
			storyRepo,
			eventRepo
		})) {
			if (!repo) throw new TypeError(`ProgramImpactService membutuhkan ${nama}.`);
		}
		this.#awardeeRepo = awardeeRepo;
		this.#activityRepo = activityRepo;
		this.#movementRepo = movementRepo;
		this.#storyRepo = storyRepo;
		this.#eventRepo = eventRepo;
		this.#registrySize =
			typeof registrySize === 'number' && Number.isFinite(registrySize) ? registrySize : null;
		this.#clock = clock ?? (() => new Date());
	}

	/**
	 * Potret angka dampak level program untuk zona publik.
	 *
	 * Seluruh penyaringnya sama persis dengan penyaring KPI internal — "awardee
	 * terdata" berarti aktif DAN ber-consent, di halaman publik maupun di dasbor
	 * admin. Dua definisi untuk satu nama angka adalah cara tercepat kehilangan
	 * kepercayaan pembaca.
	 *
	 * @returns {Promise<PublicImpactSnapshot>}
	 */
	async publicSnapshot() {
		const capturedAt = this.#clock();
		const monthKey = ProgramImpactService.#monthKey(capturedAt);
		const [awardees, activities, movements, stories, events] = await this.#muatSemua();

		const awardeeAktif = awardees.filter((awardee) => awardee.isActive);
		const amplifiersThisMonth = ProgramImpactService.#amplifierIds(
			activities,
			monthKey,
			awardeeAktif
		).size;

		return {
			capturedAt,
			registeredAwardees: awardees.filter(
				(awardee) => awardee.isActive && awardee.consentActive
			).length,
			activeChapters: ProgramImpactService.#chapterAktif(awardeeAktif),
			totalChapters: CHAPTERS.length,
			publishedStories: stories.filter((story) => story.isPublic).length,
			completedEvents: events.filter((event) => event.countsForEngagementKpi).length,
			upcomingEvents: events.filter(
				(event) => event.isPubliclyVisible && event.isUpcoming(capturedAt)
			).length,
			runningMovements: movements.filter((movement) => movement.isRunning).length,
			recordedActions: activities.filter((activity) => activity.isAwarded).length,
			amplifiersThisMonth,
			organicReach: ProgramImpactService.#organicReach(amplifiersThisMonth),
			beneficiaryRegistry: this.#beneficiaryRegistry()
		};
	}

	/**
	 * Rentang jangkauan organik — angka kelas B.
	 *
	 * Rumusnya `pengamplifikasi × jaringan sosial × koefisien eksposur ×
	 * (1 − tumpang tindih)`, dengan seluruh parameter berasal dari `REACH_PARAMETERS`.
	 * Batas bawah dan batas atas dihitung dari pasangan parameter terkecil dan
	 * terbesar, dan keduanya sudah didiskon tumpang tindih audiens: angka bruto
	 * dipakai untuk komunikasi internal, sedangkan yang dipajang publik adalah angka
	 * yang tidak menghitung orang yang sama dua kali.
	 *
	 * @param {number} basis Cacah pengamplifikasi bulan berjalan.
	 * @returns {{min: number, max: number, basis: number}}
	 */
	static #organicReach(basis) {
		const {
			jaringanSosialMin,
			jaringanSosialMax,
			koefisienEksposurMin,
			koefisienEksposurMax,
			overlapJaringan
		} = REACH_PARAMETERS;
		const sisaJangkauan = 1 - overlapJaringan;
		return {
			min: Math.round(basis * jaringanSosialMin * koefisienEksposurMin * sisaJangkauan),
			max: Math.round(basis * jaringanSosialMax * koefisienEksposurMax * sisaJangkauan),
			basis
		};
	}

	/**
	 * Penyebut populasi penerima manfaat.
	 *
	 * `null` adalah jawaban yang sah dan sering benar: registry penerima manfaat
	 * Pertamina Foundation berada di luar sistem ini. Komponen yang menerimanya wajib
	 * memakai periode potret sebagai konteks, bukan mengarang penyebut — angka yang
	 * dibesarkan akan runtuh pada audit pertama.
	 *
	 * @returns {{value: number|null, source: string}}
	 */
	#beneficiaryRegistry() {
		if (this.#registrySize === null) {
			return {
				value: null,
				source:
					'Registry penerima manfaat belum ditetapkan program; angka disajikan dengan konteks periode.'
			};
		}
		return {
			value: this.#registrySize,
			source: 'Registry penerima manfaat Pertamina Foundation, ditetapkan pengelola program.'
		};
	}

	/**
	 * Cacah chapter yang benar-benar terisi awardee aktif.
	 *
	 * Hanya chapter yang terdaftar pada `CHAPTERS` yang dihitung: baris data dengan
	 * chapter tak dikenal adalah data kotor, dan menghitungnya akan membuat "n dari 3"
	 * mengembalikan angka lebih besar dari penyebutnya sendiri.
	 *
	 * @param {readonly Awardee[]} awardeeAktif
	 * @returns {number}
	 */
	static #chapterAktif(awardeeAktif) {
		const sah = new Set(CHAPTERS.map((chapter) => chapter.id));
		const terisi = new Set(
			awardeeAktif.map((awardee) => awardee.chapterId).filter((id) => sah.has(id))
		);
		return terisi.size;
	}

	/**
	 * Identitas awardee aktif yang tercatat mengamplifikasi pada sebuah bulan.
	 *
	 * Berbasis orang unik, bukan jumlah peristiwa: satu orang yang membagikan dua
	 * puluh kali tetap satu pengamplifikasi.
	 *
	 * @param {readonly PointActivity[]} activities
	 * @param {string} monthKey
	 * @param {readonly Awardee[]} awardeeAktif
	 * @returns {Set<string>}
	 */
	static #amplifierIds(activities, monthKey, awardeeAktif) {
		const idAktif = new Set(awardeeAktif.map((awardee) => awardee.id));
		/** @type {Set<string>} */
		const amplifiers = new Set();
		for (const entry of activities) {
			if (!entry.countsForKpi) continue;
			if (entry.monthKey !== monthKey) continue;
			if (!AKSI_AMPLIFIKASI.includes(entry.activityType)) continue;
			if (!idAktif.has(entry.awardeeId)) continue;
			amplifiers.add(entry.awardeeId);
		}
		return amplifiers;
	}

	/**
	 * Memuat seluruh koleksi yang dibutuhkan potret dalam satu gelombang.
	 * @returns {Promise<[Awardee[], PointActivity[], Movement[], Story[], CommunityEvent[]]>}
	 */
	async #muatSemua() {
		const [awardees, activities, movements, stories, events] = await Promise.all([
			this.#awardeeRepo.getAll(),
			this.#activityRepo.getAll(),
			this.#movementRepo.getAll(),
			this.#storyRepo.getAll(),
			this.#eventRepo.getAll()
		]);
		return [
			awardees.map((row) => Awardee.from(row)),
			activities.map((row) => PointActivity.from(row)),
			movements.map((row) => Movement.from(row)),
			stories.map((row) => Story.from(row)),
			events.map((row) => CommunityEvent.from(row))
		];
	}

	/**
	 * Kunci bulan kalender waktu lokal.
	 * @param {Date} pada
	 * @returns {string} mis. '2026-07'.
	 */
	static #monthKey(pada) {
		return `${pada.getFullYear()}-${String(pada.getMonth() + 1).padStart(2, '0')}`;
	}
}
