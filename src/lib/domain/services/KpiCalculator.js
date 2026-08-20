/**
 * SERVICE: Kalkulator KPI.
 *
 * Tanggung jawab: menghitung lima Key Objective Hal 6 dari data yang benar-benar
 * ada di sistem, serta mengestimasi jangkauan organik komunitas.
 *
 * Prinsip yang dijaga: setiap angka harus dapat ditelusuri ke definisi
 * operasionalnya. Formula tiap metrik ikut dibawa pada hasil, sehingga pembaca
 * laporan tahu persis bagaimana angkanya muncul. KPI yang tidak dapat ditelusuri
 * cara hitungnya adalah KPI yang tidak dapat dipertanggungjawabkan: dan Corsec
 * yang akan diminta mempertanggungjawabkannya, bukan aplikasinya.
 *
 * Tiga definisi yang sengaja lebih ketat dari bacaan sepintas Hal 6:
 *   M-02 menghitung KONTEN unik, bukan peristiwa kirim. Satu konten yang dikirim
 *        ulang tiga kali tetap satu konten.
 *   M-03 menghitung HARI kirim unik, bukan jumlah broadcast. Lima pesan serentak
 *        dalam satu pagi adalah satu kali diseminasi, bukan lima.
 *   M-05 menuntut bukti dan kuorum, karena kata kuncinya "terlaksana" dan bukan
 *        "terjadwal".
 *
 * @see docs/00-SOURCE-BRIEF.md: Hal 6 KPI dan Keluaran
 * @see docs/02-KPI-MODEL.md: §2 lima metrik inti, §3 model reach
 */

import {
	KPI_PARAMETERS,
	KPI_TARGETS,
	REACH_PARAMETERS,
	rasioPencapaian,
	statusKpi,
	targetKpi
} from '../constants/kpi-targets.js';
import { ActivityType } from '../constants/scoring-table.js';
import { Broadcast } from '../entities/Broadcast.js';
import { CommunityEvent } from '../entities/CommunityEvent.js';
import { Awardee } from '../entities/Awardee.js';
import { PointActivity } from '../entities/PointActivity.js';

/** Aksi yang dihitung sebagai amplifikasi pada M-04 (Hal 11 aksi 5 dan 8 poin). */
const AKSI_AMPLIFIKASI = Object.freeze([ActivityType.SHARE_PRIVATE, ActivityType.SHARE_PUBLIC]);

/**
 * @typedef {object} KpiSnapshotRow
 * @property {string} id          Kode metrik, mis. 'M-01'.
 * @property {string} label
 * @property {string} shortLabel
 * @property {number} actual      Nilai tercapai.
 * @property {number} target      Nilai target Hal 6.
 * @property {number} percent     Rasio pencapaian dalam persen.
 * @property {string} status      Salah satu KPI_STATUS.
 * @property {string} unit
 * @property {string} formula
 * @property {number} numerator
 * @property {number} denominator
 * @property {string} source
 */

export class KpiCalculator {
	/** @type {import('../repositories/Repository.js').Repository} */
	#awardeeRepo;
	/** @type {import('../repositories/Repository.js').Repository} */
	#activityRepo;
	/** @type {import('../repositories/Repository.js').Repository} */
	#broadcastRepo;
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
	 * @param {import('../repositories/Repository.js').Repository} deps.broadcastRepo
	 * @param {import('../repositories/Repository.js').Repository} deps.eventRepo
	 * @param {number} [deps.registrySize] Ukuran registry penerima manfaat sebagai
	 *   penyebut M-01. Bila tidak diberikan, seluruh rekaman awardee dipakai
	 *   sebagai registry.
	 * @param {() => Date} [deps.clock]
	 * @throws {TypeError} bila ada repository yang tidak diberikan.
	 */
	constructor({ awardeeRepo, activityRepo, broadcastRepo, eventRepo, registrySize, clock } = {}) {
		for (const [nama, repo] of Object.entries({
			awardeeRepo,
			activityRepo,
			broadcastRepo,
			eventRepo
		})) {
			if (!repo) throw new TypeError(`KpiCalculator membutuhkan ${nama}.`);
		}
		this.#awardeeRepo = awardeeRepo;
		this.#activityRepo = activityRepo;
		this.#broadcastRepo = broadcastRepo;
		this.#eventRepo = eventRepo;
		this.#registrySize = registrySize ?? null;
		this.#clock = clock ?? (() => new Date());
	}

	/**
	 * Potret kelima KPI Hal 6 pada bulan berjalan.
	 * @param {Date} [pada] Bulan acuan; default bulan ini.
	 * @returns {Promise<KpiSnapshotRow[]>}
	 */
	async snapshot(pada = this.#clock()) {
		const monthKey = KpiCalculator.#monthKey(pada);
		const [awardees, activities, broadcasts, events] = await this.#loadAll();

		const awardeeAktif = awardees.filter((awardee) => awardee.isActive);

		const hasil = [
			this.#coverage(awardees),
			this.#volumeKonten(broadcasts, monthKey),
			this.#frekuensiDiseminasi(broadcasts, monthKey),
			this.#amplifikasi(awardeeAktif, activities, monthKey),
			this.#aktivitasEngagement(events)
		];

		return hasil.map((baris) => KpiCalculator.#lengkapi(baris));
	}

	/**
	 * Estimasi jangkauan organik komunitas (Hal 6: Dampak Inisiatif).
	 *
	 * Memakai rentang 25–500 jaringan sosial per awardee persis seperti tertulis
	 * di Hal 6, dikalikan koefisien eksposur agar kedua batas yang disebut sumber
	 * ("250 – 50 ribu orang" untuk 100 awardee aktif) tereproduksi tepat. Angka
	 * sumber tidak dikoreksi di sini; selisih 10x pada batas bawahnya adalah butir
	 * terbuka yang menunggu konfirmasi Corsec dan dicatat pada daftar asumsi.
	 *
	 * Dua angka dikembalikan berdampingan dengan sengaja: `bruto` adalah angka
	 * komunikasi yang identik dengan Hal 6, `neto` adalah angka perencanaan yang
	 * sudah didiskon tumpang tindih audiens. Menyajikan bruto sebagai angka
	 * perencanaan adalah kesalahan analitik yang paling sering terjadi pada
	 * laporan komunitas.
	 *
	 * @param {Date} [pada]
	 * @returns {Promise<{amplifiers: number, pesimis: {bruto: number, neto: number}, optimis: {bruto: number, neto: number}, parameter: Record<string, number>, asumsi: readonly string[]}>}
	 */
	async organicReach(pada = this.#clock()) {
		const monthKey = KpiCalculator.#monthKey(pada);
		const [awardees, activities] = await Promise.all([this.#awardees(), this.#activities()]);
		const awardeeAktif = awardees.filter((awardee) => awardee.isActive);
		const amplifiers = KpiCalculator.#amplifierIds(activities, monthKey, awardeeAktif).size;

		const {
			jaringanSosialMin,
			jaringanSosialMax,
			koefisienEksposurMin,
			koefisienEksposurMax,
			overlapJaringan
		} = REACH_PARAMETERS;

		const brutoPesimis = Math.round(amplifiers * jaringanSosialMin * koefisienEksposurMin);
		const brutoOptimis = Math.round(amplifiers * jaringanSosialMax * koefisienEksposurMax);

		return {
			amplifiers,
			pesimis: {
				bruto: brutoPesimis,
				neto: Math.round(brutoPesimis * (1 - overlapJaringan))
			},
			optimis: {
				bruto: brutoOptimis,
				neto: Math.round(brutoOptimis * (1 - overlapJaringan))
			},
			parameter: { ...REACH_PARAMETERS },
			asumsi: Object.freeze([
				`Setiap awardee memiliki ${jaringanSosialMin}–${jaringanSosialMax} jaringan sosial (Hal 6).`,
				`Koefisien eksposur ${koefisienEksposurMin}–${koefisienEksposurMax}: asumsi, menunggu konfirmasi Corsec.`,
				`Tumpang tindih audiens antarawardee ${Math.round(overlapJaringan * 100)}%: asumsi.`,
				'Angka bruto dipakai untuk komunikasi, angka neto untuk perencanaan.'
			])
		};
	}

	/**
	 * M-01: Coverage registrasi penerima manfaat.
	 * Akun tanpa consent tidak dihitung: terdata tanpa persetujuan bukan cakupan
	 * yang sah untuk dilaporkan.
	 * @param {readonly Awardee[]} awardees
	 * @returns {{id: string, actual: number, numerator: number, denominator: number}}
	 */
	#coverage(awardees) {
		const terdata = awardees.filter((awardee) => awardee.isActive && awardee.consentActive).length;
		const registry = this.#registrySize ?? awardees.length;
		return {
			id: 'M-01',
			actual: registry > 0 ? Math.round((terdata / registry) * 100) : 0,
			numerator: terdata,
			denominator: registry
		};
	}

	/**
	 * M-02: Volume konten terdiseminasi pada bulan berjalan.
	 * @param {readonly Broadcast[]} broadcasts
	 * @param {string} monthKey
	 * @returns {{id: string, actual: number, numerator: number, denominator: number}}
	 */
	#volumeKonten(broadcasts, monthKey) {
		/** @type {Set<string>} */
		const kontenUnik = new Set();
		for (const broadcast of broadcasts) {
			if (!broadcast.countsForDisseminationKpi(monthKey)) continue;
			for (const contentId of broadcast.contentIds) kontenUnik.add(contentId);
		}
		return {
			id: 'M-02',
			actual: kontenUnik.size,
			numerator: kontenUnik.size,
			denominator: targetKpi('M-02').targetMax ?? targetKpi('M-02').target
		};
	}

	/**
	 * M-03: Frekuensi diseminasi: jumlah HARI kalender unik yang punya kiriman.
	 * @param {readonly Broadcast[]} broadcasts
	 * @param {string} monthKey
	 * @returns {{id: string, actual: number, numerator: number, denominator: number}}
	 */
	#frekuensiDiseminasi(broadcasts, monthKey) {
		const hariUnik = new Set(
			broadcasts
				.filter((broadcast) => broadcast.countsForDisseminationKpi(monthKey))
				.map((broadcast) => broadcast.sentDayKey)
		);
		return {
			id: 'M-03',
			actual: hariUnik.size,
			numerator: hariUnik.size,
			denominator: targetKpi('M-03').target
		};
	}

	/**
	 * M-04: Amplification rate: porsi awardee aktif yang mengamplifikasi.
	 * Berbasis awardee unik, bukan jumlah share: satu awardee yang membagikan
	 * dua puluh kali tetap satu amplifier.
	 * @param {readonly Awardee[]} awardeeAktif
	 * @param {readonly PointActivity[]} activities
	 * @param {string} monthKey
	 * @returns {{id: string, actual: number, numerator: number, denominator: number}}
	 */
	#amplifikasi(awardeeAktif, activities, monthKey) {
		const amplifiers = KpiCalculator.#amplifierIds(activities, monthKey, awardeeAktif).size;
		const penyebut = awardeeAktif.length;
		return {
			id: 'M-04',
			actual: penyebut > 0 ? Math.round((amplifiers / penyebut) * 100) : 0,
			numerator: amplifiers,
			denominator: penyebut
		};
	}

	/**
	 * M-05: Aktivitas engagement terlaksana sepanjang program.
	 * @param {readonly CommunityEvent[]} events
	 * @returns {{id: string, actual: number, numerator: number, denominator: number}}
	 */
	#aktivitasEngagement(events) {
		const terlaksana = events.filter((event) => event.countsForEngagementKpi).length;
		return {
			id: 'M-05',
			actual: terlaksana,
			numerator: terlaksana,
			denominator: targetKpi('M-05').target
		};
	}

	/**
	 * Melengkapi baris mentah dengan target, status warna, dan formula.
	 * @param {{id: string, actual: number, numerator: number, denominator: number}} baris
	 * @returns {KpiSnapshotRow}
	 */
	static #lengkapi(baris) {
		const kpi = targetKpi(baris.id);
		return {
			id: kpi.id,
			label: kpi.label,
			shortLabel: kpi.shortLabel,
			actual: baris.actual,
			target: kpi.targetMax ?? kpi.target,
			percent: Math.round(rasioPencapaian(baris.actual, kpi) * 100),
			status: statusKpi(baris.actual, kpi),
			unit: kpi.unit,
			formula: kpi.formula,
			numerator: baris.numerator,
			denominator: baris.denominator,
			source: kpi.source
		};
	}

	/**
	 * Identitas awardee aktif yang tercatat mengamplifikasi pada sebuah bulan.
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
	 * Memuat seluruh koleksi yang dibutuhkan snapshot dalam satu gelombang.
	 * @returns {Promise<[Awardee[], PointActivity[], Broadcast[], CommunityEvent[]]>}
	 */
	async #loadAll() {
		const [awardees, activities, broadcasts, events] = await Promise.all([
			this.#awardees(),
			this.#activities(),
			this.#broadcastRepo.getAll(),
			this.#eventRepo.getAll()
		]);
		return [
			awardees,
			activities,
			broadcasts.map((row) => Broadcast.from(row)),
			events.map((row) => CommunityEvent.from(row))
		];
	}

	/** @returns {Promise<Awardee[]>} */
	async #awardees() {
		const rows = await this.#awardeeRepo.getAll();
		return rows.map((row) => Awardee.from(row));
	}

	/** @returns {Promise<PointActivity[]>} */
	async #activities() {
		const rows = await this.#activityRepo.getAll();
		return rows.map((row) => PointActivity.from(row));
	}

	/**
	 * Kunci bulan kalender waktu lokal.
	 * @param {Date} pada
	 * @returns {string} mis. '2026-07'.
	 */
	static #monthKey(pada) {
		return `${pada.getFullYear()}-${String(pada.getMonth() + 1).padStart(2, '0')}`;
	}

	/**
	 * Seluruh definisi KPI beserta targetnya, tanpa perhitungan.
	 * Dipakai halaman admin untuk menjelaskan metrik sebelum datanya dimuat.
	 * @returns {readonly import('../constants/kpi-targets.js').KpiTarget[]}
	 */
	static definitions() {
		return KPI_TARGETS;
	}

	/**
	 * Parameter operasional yang dipakai perhitungan, untuk ditampilkan sebagai
	 * catatan asumsi di konsol admin.
	 * @returns {Readonly<Record<string, number>>}
	 */
	static parameters() {
		return KPI_PARAMETERS;
	}
}
