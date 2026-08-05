/**
 * STORE — Konsol Pertamina Foundation.
 *
 * Tanggung jawab: menyediakan potret KPI, matriks bukti ESG, agregat antrean
 * moderasi, dan **seluruh deret angka yang digambar dasbor ECharts**.
 *
 * ── Dua keputusan yang menentukan bentuk berkas ini ──────────────────────────
 *
 * 1. **Admin tidak lagi memutuskan nasib cerita.** `approve()` dan
 *    `requestRevision()` DIHAPUS. Matriks kewenangan memberi ADMIN tanda silang
 *    pada `REVIEW_CONTENT` dan `PUBLISH_CONTENT`; versi sebelumnya tetap menulis
 *    status cerita langsung ke repository, melewati `ContentReviewService`, dan
 *    karena itu melewati pemeriksaan legalitas transisi maupun konflik
 *    kepentingan. Jalur kedua yang lebih longgar daripada jalur resmi bukan
 *    kemudahan — itu lubang tata kelola yang tidak terlihat dari antarmuka.
 *    Satu-satunya tindakan konten yang tersisa bagi Admin adalah **takedown**
 *    (`TERPUBLIKASI → DIARSIPKAN`), dan ia WAJIB lewat `ContentReviewService`.
 *
 * 2. **Angka chart dihitung di sini, bukan di komponen chart.** Komponen chart
 *    hanya menyusun `option`. Metrik yang lahir di dalam komponen adalah metrik
 *    tanpa definisi operasional tertulis — dan Corsec yang akan diminta
 *    mempertanggungjawabkan angkanya, bukan aplikasinya. Rumus yang sudah punya
 *    rumah di domain (`KpiCalculator`, `EsgEvidenceService`, `TierResolver`,
 *    `ContentReviewService`) **tidak disalin ke sini**; store hanya memanggilnya
 *    dan menyusun hasilnya menjadi deret per bulan atau per segmen.
 *
 * @see docs/12-BUILD-CONTRACT-V2.md — §2.1 matriks kewenangan, §3.5 WP-07 butir 6 & 8, R-23
 * @see docs/10-REVISION-SPEC.md — §7.2 katalog chart, §7.5 CH-7/CH-8
 * @see docs/00-SOURCE-BRIEF.md — Hal 6 KPI, Hal 10 ESG, Hal 11 tabel skor, Hal 12 gerbang bukti
 */

import { browser } from '$app/environment';
import { CHAPTERS, COMMUNITIES, STORY_ARCHIVE_REASON } from '$lib/domain/constants/community.js';
import { ESG_EVIDENCE_GATE } from '$lib/domain/constants/esg-taxonomy.js';
import { KPI_PARAMETERS } from '$lib/domain/constants/kpi-targets.js';
import { ActionClass, SCORING_TABLE } from '$lib/domain/constants/scoring-table.js';
import {
	ContentReviewService,
	REVIEW_FAILURE_MESSAGE
} from '$lib/domain/services/ContentReviewService.js';
import { EsgEvidenceService } from '$lib/domain/services/EsgEvidenceService.js';
import { KpiCalculator } from '$lib/domain/services/KpiCalculator.js';
import { TierResolver } from '$lib/domain/services/TierResolver.js';
import { FeatureEligibilityPolicy } from '$lib/domain/policies/FeatureEligibilityPolicy.js';
import {
	activityRepository,
	broadcastRepository,
	eventRepository,
	awardeeRepository,
	storyRepository
} from '$lib/infrastructure/repositories/index.js';
import { bootstrapDatabase, lastSeededAt, resetDatabase } from '$lib/infrastructure/seed/bootstrap.js';
import { akhirBulan, MS_PER_HARI, NAMA_BULAN_PENDEK } from '$lib/utils/date.js';
import { catalog } from './catalog.svelte.js';
import { session } from './session.svelte.js';
import { toast, ToastType } from './toast.svelte.js';

const kpiCalculator = new KpiCalculator({
	awardeeRepo: awardeeRepository,
	activityRepo: activityRepository,
	broadcastRepo: broadcastRepository,
	eventRepo: eventRepository
});

const esgService = new EsgEvidenceService({ storyRepo: storyRepository });

const reviewService = new ContentReviewService({
	storyRepo: storyRepository,
	eventRepo: eventRepository
});

/**
 * Rentang program Hal 7: Januari–Juli 2026. Seluruh chart deret waktu memakai
 * ketujuh bulan ini, termasuk bulan yang kosong — bulan yang hilang dari sumbu
 * membuat kekosongan aktivitas tidak terlihat, padahal justru itu yang perlu
 * dilihat pengelola.
 */
const TAHUN_PROGRAM = 2026;
const JUMLAH_BULAN_PROGRAM = 7;

/**
 * Jenis aksi yang dihitung sebagai amplifikasi, DITURUNKAN dari kelas verifikasi
 * B pada tabel skor Hal 11 — bukan ditulis sebagai daftar lepas.
 *
 * Kelas B adalah kelas "membagikan konten" (jaringan pribadi dan media sosial
 * publik); itulah definisi yang dipakai `KpiCalculator` untuk M-04. Menurunkannya
 * di sini, alih-alih menyalin dua nama enum, membuat chart tren amplifikasi tidak
 * dapat menyimpang dari kartu KPI di halaman yang sama.
 * @type {readonly string[]}
 */
const AKSI_AMPLIFIKASI = Object.freeze(
	SCORING_TABLE.filter((aturan) => aturan.actionClass === ActionClass.B).map((a) => a.type)
);

/** Kode sebab yang dipakai ketika kegagalan datang dari luar domain. */
const SEBAB_LUAR_DOMAIN = 'GAGAL_TEKNIS';

/** Pesan ketika tindakan dijalankan tanpa akun aktif di sesi. */
const PESAN_TANPA_SESI = 'Sesi Anda sudah berakhir. Masuk kembali untuk melanjutkan.';

/** Pesan ketika penyimpanan peramban menolak menyimpan keputusan. */
const PESAN_GALAT_PENYIMPANAN =
	'Keputusan gagal disimpan di peramban ini. Muat ulang halaman, lalu ulangi.';

/**
 * @typedef {object} BulanProgram
 * @property {string} monthKey Kunci bulan, mis. '2026-07'.
 * @property {string} label    Nama bulan pendek untuk sumbu chart.
 */

/**
 * @typedef {object} SegmenCoverage
 * @property {string} id
 * @property {string} label
 * @property {string} kind      `komunitas` atau `chapter`.
 * @property {number} registered Awardee aktif ber-consent aktif.
 * @property {number} total      Seluruh awardee pada segmen.
 * @property {number} percent    Porsi terdaftar, bulat.
 */

class AdminStore {
	/** @type {import('$lib/domain/services/KpiCalculator.js').KpiSnapshotRow[]} */
	kpi = $state.raw([]);

	/**
	 * Estimasi jangkauan organik Hal 6, lengkap dengan parameter dan asumsinya.
	 * @type {{amplifiers: number, pesimis: {bruto: number, neto: number}, optimis: {bruto: number, neto: number}, parameter: Record<string, number>, asumsi: readonly string[]}|null}
	 */
	reach = $state.raw(null);

	/** @type {{E: any, S: any, G: any}|null} Matriks bukti tiga pilar ESG. */
	esgMatrix = $state.raw(null);

	/** @type {{goal: number, label: string, color: string, count: number}[]} */
	sdgCoverage = $state.raw([]);

	/** @type {{story: import('$lib/domain/entities/Story.js').Story, checklist: any}[]} */
	esgIncomplete = $state.raw([]);

	/** @type {import('$lib/domain/entities/Story.js').Story[]} Naskah yang menunggu keputusan verifikator. */
	moderationQueue = $state.raw([]);

	/** @type {import('$lib/domain/entities/Story.js').Story[]} Cerita yang sudah tayang — kandidat takedown. */
	publishedStories = $state.raw([]);

	/** @type {import('$lib/domain/services/TierResolver.js').TierDistributionRow[]} */
	tierDistribution = $state.raw([]);

	/** @type {{monthKey: string, points: number, count: number}[]} Tren poin per bulan. */
	monthlyTrend = $state.raw([]);

	// ── Deret pemasok chart (C-01…C-20) ─────────────────────────────────────

	/** @type {BulanProgram[]} Sumbu waktu bersama seluruh chart deret waktu. */
	programMonths = $state.raw([]);

	/** @type {SegmenCoverage[]} C-02 — cakupan registrasi per komunitas dan chapter. */
	coverageSegments = $state.raw([]);

	/** @type {{monthKey: string, label: string, contents: number, days: number}[]} C-03. */
	dissemination = $state.raw([]);

	/** @type {{monthKey: string, label: string, activeRate: number, totalRate: number, amplifiers: number}[]} C-04. */
	amplification = $state.raw([]);

	/** @type {{label: string, value: number}[]} Amplifikasi bulan terakhir per chapter. */
	amplificationByChapter = $state.raw([]);

	/** @type {{type: string, label: string, points: number[]}[]} C-13 — sembilan seri sumber poin. */
	pointSources = $state.raw([]);

	/** @type {{monthKey: string, label: string, registered: number, active: number, amplifiers: number}[]} C-14. */
	engagement = $state.raw([]);

	/** @type {{key: string, label: string, count: number}[]} C-17 — corong gerbang bukti ESG. */
	esgGate = $state.raw([]);

	/** @type {{monthKey: string, label: string, min: number, max: number, mid: number}[]} C-18. */
	reachBand = $state.raw([]);

	/** @type {{queue: string, withinSla: number, breachedSla: number, medianDays: number}[]} C-20. */
	slaCompliance = $state.raw([]);

	/** @type {Date|null} Waktu data demo terakhir dipasang. */
	seededAt = $state.raw(null);

	/** @type {boolean} */
	loading = $state(false);

	/** @type {boolean} Konsol sudah pernah dimuat dengan sukses. */
	loaded = $state(false);

	/** @type {string|null} Id cerita yang sedang diproses; UI memakainya untuk status tombol. */
	working = $state(null);

	/** @type {Promise<void>|null} */
	#pemuatan = null;

	/** Jumlah naskah yang menunggu keputusan verifikator. */
	pendingCount = $derived(this.moderationQueue.length);

	/** KPI yang belum mencapai targetnya — inilah yang perlu ditindaklanjuti. */
	kpiTertinggal = $derived(this.kpi.filter((baris) => baris.percent < 100));

	/**
	 * Kesiapan bukti per pilar ESG, bentuk datar siap dipakai chart radar.
	 * @type {{pillar: string, label: string, readinessRate: number}[]}
	 */
	esgReadiness = $derived(
		this.esgMatrix
			? Object.values(this.esgMatrix)
					.filter(Boolean)
					.map((pilar) => ({
						pillar: pilar.pillar,
						label: pilar.label,
						readinessRate: pilar.readinessRate
					}))
			: []
	);

	/**
	 * Memuat seluruh potret konsol dalam satu gelombang.
	 *
	 * @param {{force?: boolean}} [opsi]
	 * @returns {Promise<void>}
	 */
	async load({ force = false } = {}) {
		if (!browser) return;
		if (this.loaded && !force) return;
		if (this.#pemuatan && !force) return this.#pemuatan;

		this.#pemuatan = this.#muat();
		try {
			await this.#pemuatan;
		} finally {
			this.#pemuatan = null;
		}
	}

	/**
	 * Memuat ulang seluruh potret konsol.
	 * @returns {Promise<void>}
	 */
	async refresh() {
		return this.load({ force: true });
	}

	/**
	 * Menarik cerita yang sudah tayang dari ruang publik (takedown).
	 *
	 * Ini satu-satunya tindakan konten yang tersisa bagi Admin, dan ia berjalan
	 * lewat `ContentReviewService.archiveStory` — bukan lewat penulisan status
	 * langsung. Konsekuensinya nyata dan disengaja: bila peta transisi kelak
	 * mencabut kewenangan takedown dari Admin, tombol ini berhenti bekerja
	 * seketika tanpa satu baris pun di store yang perlu diubah.
	 *
	 * Alasan arsip bersifat wajib dan harus salah satu `STORY_ARCHIVE_REASON`.
	 * Naskah yang hilang dari publik tanpa alasan tercatat tidak dapat dijelaskan
	 * kepada penulisnya maupun kepada auditor.
	 *
	 * @param {import('$lib/domain/entities/Story.js').Story} story
	 * @param {string} reason Salah satu `STORY_ARCHIVE_REASON`.
	 * @returns {Promise<{ok: boolean, reason: string}>}
	 */
	async takedown(story, reason) {
		if (!browser || !story) return { ok: false, reason: SEBAB_LUAR_DOMAIN };

		const actor = session.account;
		if (!actor) {
			toast.error('Tindakan tidak dapat diproses', PESAN_TANPA_SESI);
			return { ok: false, reason: SEBAB_LUAR_DOMAIN };
		}

		this.working = story.id;
		try {
			const hasil = await reviewService.archiveStory(story, actor, reason);
			if (!hasil.ok) {
				toast.error(
					'Takedown ditolak',
					REVIEW_FAILURE_MESSAGE[hasil.reason] ?? PESAN_GALAT_PENYIMPANAN
				);
				return { ok: false, reason: hasil.reason };
			}

			toast.push({
				type: ToastType.SUCCESS,
				title: 'Cerita ditarik dari publik',
				message: `"${story.title}" diarsipkan beserta alasannya dan tidak lagi tampil di ruang publik.`
			});
			await Promise.all([catalog.refresh(), this.load({ force: true })]);
			return { ok: true, reason: '' };
		} catch {
			toast.error('Takedown gagal', PESAN_GALAT_PENYIMPANAN);
			return { ok: false, reason: SEBAB_LUAR_DOMAIN };
		} finally {
			this.working = null;
		}
	}

	/**
	 * Daftar alasan arsip yang sah, untuk mengisi pemilih pada halaman moderasi.
	 * @returns {readonly string[]}
	 */
	static archiveReasons() {
		return Object.freeze(Object.values(STORY_ARCHIVE_REASON));
	}

	/**
	 * Checklist empat gerbang bukti ESG sebuah cerita.
	 * @param {import('$lib/domain/entities/Story.js').Story} story
	 * @returns {import('$lib/domain/services/EsgEvidenceService.js').EvidenceChecklist}
	 */
	evidenceChecklist(story) {
		return esgService.evidenceChecklist(story);
	}

	/**
	 * Evaluasi lima syarat gerbang fitur publik Hal 12.
	 * @param {import('$lib/domain/entities/Awardee.js').Awardee} awardee
	 * @param {import('$lib/domain/entities/Story.js').Story|null} [story]
	 * @returns {import('$lib/domain/policies/FeatureEligibilityPolicy.js').EligibilityResult}
	 */
	eligibility(awardee, story = null) {
		return FeatureEligibilityPolicy.evaluate(awardee, story);
	}

	/**
	 * Memasang ulang data demo dari awal. Dipakai panel data demo agar presentasi
	 * dapat diulang dari keadaan bersih tanpa membuka DevTools.
	 * @returns {Promise<void>}
	 */
	async reloadDemoData() {
		if (!browser) return;
		this.loading = true;
		try {
			const hasil = await resetDatabase();
			await catalog.refresh();
			await this.load({ force: true });
			await session.refresh();
			toast.push({
				type: ToastType.SUCCESS,
				title: 'Data demo dimuat ulang',
				message: hasil.reason
			});
		} finally {
			this.loading = false;
		}
	}

	// ─────────────────────────────────────────────────────── pemuatan internal

	/**
	 * Pemuatan sesungguhnya: satu gelombang baca, lalu seluruh deret chart
	 * diturunkan dari koleksi yang sama.
	 *
	 * Koleksi mentah dibaca SEKALI dan dipakai bersama. Tujuh chart yang
	 * masing-masing membaca ulang buku besar poin akan menghasilkan tujuh potret
	 * yang berbeda tipis begitu satu keputusan tersimpan di tengah pemuatan.
	 *
	 * @returns {Promise<void>}
	 */
	async #muat() {
		this.loading = true;
		try {
			await bootstrapDatabase();

			const bulan = AdminStore.#bulanProgram();

			const [
				kpi,
				reach,
				esgMatrix,
				sdgCoverage,
				esgIncomplete,
				queue,
				published,
				awardees,
				activities,
				broadcasts,
				stories,
				monthly,
				sla,
				seeded
			] = await Promise.all([
				kpiCalculator.snapshot(),
				kpiCalculator.organicReach(),
				esgService.matrix(),
				esgService.sdgCoverage(),
				esgService.incompleteQueue(),
				storyRepository.moderationQueue(),
				storyRepository.published(),
				awardeeRepository.getAll(),
				activityRepository.getAll(),
				broadcastRepository.sent(),
				storyRepository.getAll(),
				activityRepository.monthlyTotals(),
				reviewService.slaCompliance(),
				lastSeededAt()
			]);

			// Pita estimasi jangkauan dihitung per bulan lewat service yang sama
			// dengan kartu jangkauan di atasnya — rumusnya tidak disalin ke sini.
			const pita = await Promise.all(
				bulan.map((b) => kpiCalculator.organicReach(AdminStore.#tengahBulan(b.indeks)))
			);

			this.kpi = kpi;
			this.reach = reach;
			this.esgMatrix = esgMatrix;
			this.sdgCoverage = sdgCoverage;
			this.esgIncomplete = esgIncomplete;
			this.moderationQueue = queue;
			this.publishedStories = published;
			this.tierDistribution = TierResolver.distribution(awardees);
			this.monthlyTrend = AdminStore.#urutkanBulan(monthly);
			this.slaCompliance = sla;
			this.seededAt = seeded;

			this.programMonths = bulan.map((b) => ({ monthKey: b.monthKey, label: b.label }));
			this.coverageSegments = AdminStore.#segmenCoverage(awardees);
			this.dissemination = AdminStore.#diseminasi(broadcasts, bulan);
			this.amplification = AdminStore.#amplifikasiBulanan(awardees, activities, bulan);
			this.amplificationByChapter = AdminStore.#amplifikasiPerChapter(
				awardees,
				activities,
				bulan[bulan.length - 1]?.monthKey ?? ''
			);
			this.pointSources = AdminStore.#sumberPoin(activities, bulan);
			this.engagement = AdminStore.#corongKeterlibatan(awardees, activities, bulan);
			this.esgGate = AdminStore.#corongGerbangBukti(stories);
			this.reachBand = AdminStore.#pitaJangkauan(bulan, pita);

			this.loaded = true;
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Ketujuh bulan program beserta batas akhirnya.
	 * @returns {{monthKey: string, label: string, indeks: number, akhir: Date}[]}
	 */
	static #bulanProgram() {
		return Array.from({ length: JUMLAH_BULAN_PROGRAM }, (_, indeks) => ({
			monthKey: `${TAHUN_PROGRAM}-${String(indeks + 1).padStart(2, '0')}`,
			label: NAMA_BULAN_PENDEK[indeks] ?? String(indeks + 1),
			indeks,
			akhir: akhirBulan(new Date(TAHUN_PROGRAM, indeks, 1))
		}));
	}

	/**
	 * Tanggal acuan di tengah sebuah bulan program. Dipakai sebagai argumen
	 * `organicReach(pada)`: pertengahan bulan aman dari pergeseran zona waktu yang
	 * dapat melempar tanggal ke bulan tetangga.
	 * @param {number} indeks Indeks bulan, 0 untuk Januari.
	 * @returns {Date}
	 */
	static #tengahBulan(indeks) {
		return new Date(TAHUN_PROGRAM, indeks, 15);
	}

	/**
	 * C-02 — cakupan registrasi per segmen.
	 *
	 * Pembilangnya memakai definisi M-01 apa adanya: aktif DAN ber-consent aktif.
	 * Terdata tanpa persetujuan bukan cakupan yang sah untuk dilaporkan, dan
	 * segmen tidak boleh memakai definisi yang lebih longgar daripada totalnya.
	 *
	 * @param {readonly import('$lib/domain/entities/Awardee.js').Awardee[]} awardees
	 * @returns {SegmenCoverage[]}
	 */
	static #segmenCoverage(awardees) {
		const segmen = [
			...COMMUNITIES.map((c) => ({
				id: c.id,
				label: c.akronim,
				kind: 'komunitas',
				anggota: awardees.filter((a) => a.community === c.id)
			})),
			...CHAPTERS.map((c) => ({
				id: c.id,
				label: c.id,
				kind: 'chapter',
				anggota: awardees.filter((a) => a.chapterId === c.id)
			}))
		];

		return segmen.map((s) => {
			const total = s.anggota.length;
			const registered = s.anggota.filter((a) => a.isActive && a.consentActive).length;
			return {
				id: s.id,
				label: s.label,
				kind: s.kind,
				registered,
				total,
				percent: total > 0 ? Math.round((registered / total) * 100) : 0
			};
		});
	}

	/**
	 * C-03 — ritme diseminasi per bulan.
	 *
	 * Dua angka berbeda dan tidak boleh dipertukarkan: `contents` adalah konten
	 * UNIK (M-02), `days` adalah HARI kirim unik (M-03). Lima pesan serentak
	 * dalam satu pagi adalah satu kali diseminasi, bukan lima.
	 *
	 * @param {readonly import('$lib/domain/entities/Broadcast.js').Broadcast[]} broadcasts
	 * @param {readonly {monthKey: string, label: string}[]} bulan
	 * @returns {{monthKey: string, label: string, contents: number, days: number}[]}
	 */
	static #diseminasi(broadcasts, bulan) {
		return bulan.map((b) => {
			const terkirim = broadcasts.filter((x) => x.countsForDisseminationKpi(b.monthKey));
			const konten = new Set(terkirim.flatMap((x) => x.contentIds));
			const hari = new Set(terkirim.map((x) => x.sentDayKey).filter(Boolean));
			return { monthKey: b.monthKey, label: b.label, contents: konten.size, days: hari.size };
		});
	}

	/**
	 * C-04 — amplification rate per bulan, dua penyebut berdampingan.
	 *
	 * `activeRate` memakai penyebut anggota AKTIF (definisi M-04 Hal 6);
	 * `totalRate` memakai penyebut seluruh anggota terdaftar. Keduanya ditampilkan
	 * bersama karena melebarnya jarak antara keduanya adalah tanda paling awal
	 * bahwa pertumbuhan registrasi tidak diikuti keterlibatan.
	 *
	 * @param {readonly import('$lib/domain/entities/Awardee.js').Awardee[]} awardees
	 * @param {readonly import('$lib/domain/entities/PointActivity.js').PointActivity[]} activities
	 * @param {readonly {monthKey: string, label: string}[]} bulan
	 * @returns {{monthKey: string, label: string, activeRate: number, totalRate: number, amplifiers: number}[]}
	 */
	static #amplifikasiBulanan(awardees, activities, bulan) {
		const idAktif = new Set(awardees.filter((a) => a.isActive).map((a) => a.id));
		const idSemua = new Set(awardees.map((a) => a.id));

		return bulan.map((b) => {
			const pelakuAktif = new Set();
			const pelakuSemua = new Set();
			for (const entry of activities) {
				if (!entry.countsForKpi) continue;
				if (entry.monthKey !== b.monthKey) continue;
				if (!AKSI_AMPLIFIKASI.includes(entry.activityType)) continue;
				if (idSemua.has(entry.awardeeId)) pelakuSemua.add(entry.awardeeId);
				if (idAktif.has(entry.awardeeId)) pelakuAktif.add(entry.awardeeId);
			}
			return {
				monthKey: b.monthKey,
				label: b.label,
				activeRate: AdminStore.#persen(pelakuAktif.size, idAktif.size),
				totalRate: AdminStore.#persen(pelakuSemua.size, idSemua.size),
				amplifiers: pelakuAktif.size
			};
		});
	}

	/**
	 * Amplifikasi bulan terakhir program, dipecah per chapter.
	 * @param {readonly import('$lib/domain/entities/Awardee.js').Awardee[]} awardees
	 * @param {readonly import('$lib/domain/entities/PointActivity.js').PointActivity[]} activities
	 * @param {string} monthKey
	 * @returns {{label: string, value: number}[]}
	 */
	static #amplifikasiPerChapter(awardees, activities, monthKey) {
		if (monthKey === '') return [];
		const pelaku = new Set(
			activities
				.filter(
					(e) =>
						e.countsForKpi && e.monthKey === monthKey && AKSI_AMPLIFIKASI.includes(e.activityType)
				)
				.map((e) => e.awardeeId)
		);

		return CHAPTERS.map((c) => {
			const aktif = awardees.filter((a) => a.chapterId === c.id && a.isActive);
			return { label: c.label, value: AdminStore.#persen(
				aktif.filter((a) => pelaku.has(a.id)).length,
				aktif.length
			) };
		}).sort((a, b) => b.value - a.value);
	}

	/**
	 * C-13 — poin per jenis aksi per bulan, satu seri per baris tabel skor.
	 *
	 * Urutan seri mengikuti `SCORING_TABLE` (poin menaik), sehingga tumpukan
	 * terbaca dari aksi paling ringan sampai kontribusi paling bermakna. Itulah
	 * pertanyaan yang dijawab chart ini — bukan sekadar totalnya.
	 *
	 * @param {readonly import('$lib/domain/entities/PointActivity.js').PointActivity[]} activities
	 * @param {readonly {monthKey: string}[]} bulan
	 * @returns {{type: string, label: string, points: number[]}[]}
	 */
	static #sumberPoin(activities, bulan) {
		const seri = SCORING_TABLE.map((aturan) => ({
			type: aturan.type,
			label: aturan.label,
			points: bulan.map(() => 0)
		}));
		const indeksSeri = new Map(SCORING_TABLE.map((aturan, i) => [aturan.type, i]));
		const indeksBulan = new Map(bulan.map((b, i) => [b.monthKey, i]));

		for (const entry of activities) {
			if (!entry.countsForKpi) continue;
			const i = indeksSeri.get(entry.activityType);
			const j = indeksBulan.get(entry.monthKey);
			if (i === undefined || j === undefined) continue;
			seri[i].points[j] += entry.points;
		}
		return seri;
	}

	/**
	 * C-14 — corong keterlibatan sepanjang program.
	 *
	 * Ketiga deret dibaca sebagai penyusutan: berapa yang TERDAFTAR sampai akhir
	 * bulan itu, berapa di antaranya AKTIF dalam jendela
	 * `windowAnggotaAktifHari`, dan berapa dari yang aktif itu benar-benar
	 * MENGAMPLIFIKASI. Jendela aktif dihitung mundur dari akhir bulan
	 * bersangkutan, bukan dari hari ini — kalau tidak, keenam bulan pertama akan
	 * selalu tampak mati.
	 *
	 * @param {readonly import('$lib/domain/entities/Awardee.js').Awardee[]} awardees
	 * @param {readonly import('$lib/domain/entities/PointActivity.js').PointActivity[]} activities
	 * @param {readonly {monthKey: string, label: string, akhir: Date}[]} bulan
	 * @returns {{monthKey: string, label: string, registered: number, active: number, amplifiers: number}[]}
	 */
	static #corongKeterlibatan(awardees, activities, bulan) {
		const jendelaMs = KPI_PARAMETERS.windowAnggotaAktifHari * MS_PER_HARI;

		return bulan.map((b) => {
			const akhir = b.akhir.getTime();
			const mulai = akhir - jendelaMs;

			const registered = awardees.filter(
				(a) => a.joinedAt instanceof Date && a.joinedAt.getTime() <= akhir
			).length;

			const aktif = new Set();
			const pengamplifikasi = new Set();
			for (const entry of activities) {
				if (!entry.countsForKpi) continue;
				const pada = entry.occurredAt instanceof Date ? entry.occurredAt.getTime() : NaN;
				if (Number.isNaN(pada) || pada > akhir || pada < mulai) continue;
				aktif.add(entry.awardeeId);
				if (AKSI_AMPLIFIKASI.includes(entry.activityType)) pengamplifikasi.add(entry.awardeeId);
			}

			return {
				monthKey: b.monthKey,
				label: b.label,
				registered,
				active: aktif.size,
				amplifiers: pengamplifikasi.size
			};
		});
	}

	/**
	 * C-17 — di gerbang mana bukti ESG paling banyak gugur.
	 *
	 * Tahapnya KUMULATIF dan karena itu menurun monoton: setiap batang menghitung
	 * naskah yang lolos gerbang tersebut DAN seluruh gerbang sebelumnya. Batang
	 * terakhir, "Layak ESG", adalah keempat gerbang sekaligus — nilainya memang
	 * sama dengan batang keempat, dan kesamaan itu justru pernyataannya: tidak ada
	 * syarat tersembunyi di luar keempat gerbang Hal 12.
	 *
	 * @param {readonly import('$lib/domain/entities/Story.js').Story[]} stories
	 * @returns {{key: string, label: string, count: number}[]}
	 */
	static #corongGerbangBukti(stories) {
		if (stories.length === 0) return [];

		const checklists = stories.map((story) => esgService.evidenceChecklist(story));
		const urutan = ESG_EVIDENCE_GATE.map((gate) => gate.key);

		const tahap = ESG_EVIDENCE_GATE.map((gate, i) => {
			const sampai = urutan.slice(0, i + 1);
			return {
				key: gate.key,
				label: i === 0 ? gate.label : `+ ${gate.label}`,
				count: checklists.filter((c) =>
					sampai.every((k) => c.checks.find((cek) => cek.key === k)?.passed === true)
				).length
			};
		});

		tahap.push({
			key: 'ready',
			label: 'Layak ESG',
			count: checklists.filter((c) => c.ready).length
		});
		return tahap;
	}

	/**
	 * C-18 — pita estimasi jangkauan organik per bulan.
	 *
	 * Memakai angka NETO (sudah didiskon tumpang tindih audiens), bukan bruto:
	 * pita ini dibaca sebagai jangkauan yang masuk akal untuk perencanaan.
	 * Menyajikan bruto sebagai angka perencanaan adalah kesalahan analitik yang
	 * paling sering terjadi pada laporan komunitas — angka brutonya tetap tersedia
	 * pada kartu jangkauan, tanpa perlu ada yang memilih diam-diam.
	 *
	 * @param {readonly {monthKey: string, label: string}[]} bulan
	 * @param {readonly {pesimis: {neto: number}, optimis: {neto: number}}[]} pita
	 * @returns {{monthKey: string, label: string, min: number, max: number, mid: number}[]}
	 */
	static #pitaJangkauan(bulan, pita) {
		return bulan.map((b, i) => {
			const min = pita[i]?.pesimis?.neto ?? 0;
			const max = pita[i]?.optimis?.neto ?? 0;
			return {
				monthKey: b.monthKey,
				label: b.label,
				min,
				max,
				mid: Math.round((min + max) / 2)
			};
		});
	}

	/**
	 * Persentase bulat dengan penyebut nol yang aman.
	 * @param {number} pembilang
	 * @param {number} penyebut
	 * @returns {number}
	 */
	static #persen(pembilang, penyebut) {
		return penyebut > 0 ? Math.round((pembilang / penyebut) * 100) : 0;
	}

	/**
	 * Mengubah rekap bulanan menjadi deret terurut yang siap dipakai chart tren.
	 * @param {Map<string, {points: number, count: number}>} rekap
	 * @returns {{monthKey: string, points: number, count: number}[]}
	 */
	static #urutkanBulan(rekap) {
		return [...rekap.entries()]
			.map(([monthKey, nilai]) => ({ monthKey, points: nilai.points, count: nilai.count }))
			.sort((a, b) => a.monthKey.localeCompare(b.monthKey));
	}
}

/** Instans tunggal yang dipakai seluruh aplikasi. */
export const admin = new AdminStore();
