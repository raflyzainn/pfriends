/**
 * Uji domain: memverifikasi logika inti terhadap angka kanonik dokumen sumber
 * DAN terhadap aturan peran, akses, serta alur editorial yang lahir di revisi V2.
 *
 * Ini BUKAN uji unit gaya framework; sengaja tanpa dependensi agar bisa dijalankan
 * dengan `node` polos. Fokusnya: apakah aturan bisnis benar-benar berperilaku
 * seperti yang dijanjikan Hal 11 dan Hal 12 PPT Corsec, dan apakah tujuh keputusan
 * pemilik produk benar-benar ditegakkan oleh kode: bukan oleh kesepakatan lisan.
 *
 * Empat belas bagian:
 *   1–5  angka kanonik gamifikasi (warisan V1, tidak berubah)
 *   6    matriks AccessPolicy 4 peran × 4 zona + jangkar PO-2 (`canSeeScoring`)
 *   7    peta transisi cerita & kegiatan per peran (PO-4)
 *   8    ContentReviewService: konflik kepentingan & catatan wajib (PO-4)
 *   9    ProgramImpactService.publicSnapshot() bebas kunci berbau skor (PO-2)
 *   10   UserAccount + PasswordHash: roundtrip dan penolakan invarian (PO-3)
 *   11   pemindai lapisan: domain tidak boleh mengenal framework (PO-7)
 *   12   consent tidak aktif memblokir approve & publish (gelombang G5)
 *   13   SroiCalculator: rantai penyesuaian, rasio, pembagi nol (gelombang G5)
 *   14   kuota reward berkurang dan menolak saat habis (gelombang G5)
 *
 * ── MENGAPA BAGIAN 12–14 ADA ────────────────────────────────────────────────
 * Ketiganya menutup cacat yang LOLOS seluruh gerbang sebelumnya dan baru
 * tertangkap empat peninjau adversarial pada aplikasi yang berjalan. Bagian 8
 * sudah menguji `cancelEvent` tanpa alasan; yang belum diuji adalah tiga hal
 * yang justru paling mahal bila diam-diam kembali: naskah yang penulisnya sudah
 * mencabut persetujuan tetap dapat disetujui, rasio SROI yang salah karena
 * penyesuaiannya dijumlahkan alih-alih dirantai, dan pencacah kuota reward yang
 * hanya pernah dibaca sehingga penukaran tidak pernah benar-benar habis.
 *
 * Jalankan: node scripts/verify/domain-test.mjs
 *
 * @see docs/12-BUILD-CONTRACT-V2.md: §6.2 baris `domain-test.mjs`, §6.4 matriks guard
 * @see docs/14-TRACEABILITY.md: kolom "gerbang yang membuktikan"
 */

import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SCORING_TABLE, ActivityType, aturanSkor, poinUntuk } from '../../src/lib/domain/constants/scoring-table.js';
import { TIER_TABLE, TierLevel, tierUntukPoin, tierBerikutnya } from '../../src/lib/domain/constants/tier-table.js';
import { TierResolver } from '../../src/lib/domain/services/TierResolver.js';
import { GamificationEngine } from '../../src/lib/domain/services/GamificationEngine.js';
import { AntiGamingPolicy } from '../../src/lib/domain/policies/AntiGamingPolicy.js';
import { Points } from '../../src/lib/domain/value-objects/Points.js';
import { buildSeed, seedStats } from '../../src/lib/infrastructure/seed/seed-data.js';

// ── Tambahan V2 ─────────────────────────────────────────────────────────────
import { UserRole } from '../../src/lib/domain/constants/roles.js';
import { STORY_STATUS } from '../../src/lib/domain/constants/community.js';
import {
	allowedEventTransitions,
	allowedStoryTransitions
} from '../../src/lib/domain/constants/content-workflow.js';
import { AccessPolicy, Zone } from '../../src/lib/domain/policies/AccessPolicy.js';
import { PasswordHash } from '../../src/lib/domain/value-objects/PasswordHash.js';
import { AccountStatus, UserAccount } from '../../src/lib/domain/entities/UserAccount.js';
import { CommunityEvent, EventStatus } from '../../src/lib/domain/entities/CommunityEvent.js';
import {
	ContentReviewService,
	ReviewFailure
} from '../../src/lib/domain/services/ContentReviewService.js';
import { ProgramImpactService } from '../../src/lib/domain/services/ProgramImpactService.js';
import { SroiCalculator } from '../../src/lib/domain/services/SroiCalculator.js';
import { Reward } from '../../src/lib/domain/entities/Reward.js';
import { Awardee } from '../../src/lib/domain/entities/Awardee.js';
import {
	ID_ADMIN,
	ID_VERIFIKATOR_KEDUA,
	ID_VERIFIKATOR_UTAMA,
	SANDI_DEMO
} from '../../src/lib/infrastructure/seed/accounts.js';

let lulus = 0;
let gagal = 0;
/** @type {string[]} */
const kegagalan = [];

/** @param {string} nama @param {unknown} aktual @param {unknown} harapan */
function samaDengan(nama, aktual, harapan) {
	const a = JSON.stringify(aktual);
	const h = JSON.stringify(harapan);
	if (a === h) {
		lulus++;
	} else {
		gagal++;
		kegagalan.push(`${nama}\n    harapan: ${h}\n    aktual : ${a}`);
	}
}

/** @param {string} nama @param {boolean} kondisi @param {string} [detail] */
function benar(nama, kondisi, detail = '') {
	if (kondisi) {
		lulus++;
	} else {
		gagal++;
		kegagalan.push(`${nama}${detail ? `\n    ${detail}` : ''}`);
	}
}

/** @param {string} nama @param {() => unknown} fn */
function melempar(nama, fn) {
	try {
		fn();
		gagal++;
		kegagalan.push(`${nama}\n    harapan: melempar error, aktual: tidak melempar`);
	} catch {
		lulus++;
	}
}

console.log('\n── 1. Tabel skor kanonik (Hal 11) ──');

samaDengan('jumlah jenis aksi = 9', SCORING_TABLE.length, 9);
samaDengan('BROADCAST_VIEW = 1 pt', poinUntuk(ActivityType.BROADCAST_VIEW), 1);
samaDengan('CTA_REACT = 2 pts', poinUntuk(ActivityType.CTA_REACT), 2);
samaDengan('SHARE_PRIVATE = 5 pts', poinUntuk(ActivityType.SHARE_PRIVATE), 5);
samaDengan('SHARE_PUBLIC = 8 pts', poinUntuk(ActivityType.SHARE_PUBLIC), 8);
samaDengan('STORY_SUBMIT = 10 pts', poinUntuk(ActivityType.STORY_SUBMIT), 10);
samaDengan('SESSION_ATTEND = 15 pts', poinUntuk(ActivityType.SESSION_ATTEND), 15);
samaDengan('KNOWLEDGE_QA = 15 pts', poinUntuk(ActivityType.KNOWLEDGE_QA), 15);
samaDengan('SPEAKER_MENTOR = 30 pts', poinUntuk(ActivityType.SPEAKER_MENTOR), 30);
samaDengan('LEAD_ACTION = 50 pts', poinUntuk(ActivityType.LEAD_ACTION), 50);
melempar('jenis aksi tak dikenal harus melempar', () => aturanSkor('AKSI_PALSU'));

console.log('── 2. Ambang tier di titik batas (Hal 12) ──');

/** @param {number} p */
const level = (p) => tierUntukPoin(p).level;
samaDengan('0 poin  -> NEWCOMER', level(0), TierLevel.NEWCOMER);
samaDengan('24 poin -> NEWCOMER', level(24), TierLevel.NEWCOMER);
samaDengan('25 poin -> ACTIVE_MEMBER', level(25), TierLevel.ACTIVE_MEMBER);
samaDengan('49 poin -> ACTIVE_MEMBER', level(49), TierLevel.ACTIVE_MEMBER);
samaDengan('50 poin -> CONTRIBUTOR', level(50), TierLevel.CONTRIBUTOR);
samaDengan('99 poin -> CONTRIBUTOR', level(99), TierLevel.CONTRIBUTOR);
samaDengan('100 poin -> FEATURED_CANDIDATE', level(100), TierLevel.FEATURED_CANDIDATE);
samaDengan('149 poin -> FEATURED_CANDIDATE', level(149), TierLevel.FEATURED_CANDIDATE);
samaDengan('150 poin -> CHAMPION', level(150), TierLevel.CHAMPION);
samaDengan('9999 poin -> CHAMPION', level(9999), TierLevel.CHAMPION);
samaDengan('tier tertinggi tidak punya tier berikutnya', tierBerikutnya(150), null);
samaDengan('ambang TIER_TABLE', TIER_TABLE.map((t) => t.threshold), [0, 25, 50, 100, 150]);

// Tier HARUS murni ambang poin: tanpa syarat kualitatif tersembunyi (Keputusan K-3).
samaDengan('TierResolver sepakat dengan tabel di 50', TierResolver.resolve(50).level, TierLevel.CONTRIBUTOR);
const prog = TierResolver.progress(40);
samaDengan('progress(40).next = CONTRIBUTOR', prog.next?.level, TierLevel.CONTRIBUTOR);
samaDengan('progress(40).needed = 10', prog.needed, 10);

console.log('── 3. Value object Points ──');

samaDengan('Points(10).plus(5) = 15', new Points(10).plus(new Points(5)).value, 15);
melempar('Points menolak negatif', () => new Points(-1));
melempar('Points menolak pecahan', () => new Points(1.5));
benar('Points immutable', Object.isFrozen(new Points(5)));
benar('Points.equals bernilai benar', new Points(7).equals(new Points(7)));

console.log('── 4. GamificationEngine: pemberian poin & batas harian ──');

/**
 * Repo aktivitas in-memory untuk menguji engine tanpa Dexie.
 * Mengikuti kontrak Repository: `query(criteria)` menerima OBJEK kriteria polos
 * dan mengabaikan kunci yang tidak dikenalnya.
 */
class RepoAktivitasMemori {
	/** @type {Record<string, any>[]} */
	items = [];
	async save(a) {
		this.items.push(typeof a?.toJSON === 'function' ? a.toJSON() : a);
		return a;
	}
	async getAll() {
		return this.items;
	}
	async query(criteria = {}) {
		const kunci = Object.keys(criteria);
		return this.items.filter((item) => kunci.every((k) => item[k] === criteria[k]));
	}
}

const repo = new RepoAktivitasMemori();
const engine = new GamificationEngine({
	activityRepo: repo,
	clock: () => new Date('2026-07-20T09:00:00+07:00')
});

const r1 = await engine.award('m-1', ActivityType.SHARE_PRIVATE, { refId: 'b-1' });
samaDengan('share privat pertama diterima', r1.accepted, true);
samaDengan('share privat memberi 5 poin', r1.points, 5);

// dailyCap SHARE_PRIVATE = 3 -> percobaan ke-4 harus ditolak
await engine.award('m-1', ActivityType.SHARE_PRIVATE, { refId: 'b-2' });
await engine.award('m-1', ActivityType.SHARE_PRIVATE, { refId: 'b-3' });
const r4 = await engine.award('m-1', ActivityType.SHARE_PRIVATE, { refId: 'b-4' });
benar('share privat ke-4 ditolak oleh batas harian', r4.accepted === false, `accepted=${r4.accepted}`);
benar('penolakan menyertakan alasan', typeof r4.reason === 'string' && r4.reason.length > 0);

const total = await engine.totalPoints('m-1');
samaDengan('total poin setelah 3 share = 15', total, 15);

// Aksi yang butuh bukti tidak boleh langsung menambah poin tanpa bukti.
const tanpaBukti = await engine.award('m-2', ActivityType.SHARE_PUBLIC, { refId: 'b-9' });
benar(
	'aksi wajib bukti tanpa bukti tidak langsung diberi poin',
	tanpaBukti.points === 0 || tanpaBukti.accepted === false,
	`accepted=${tanpaBukti.accepted} points=${tanpaBukti.points}`
);

const kuota = AntiGamingPolicy.check(aturanSkor(ActivityType.BROADCAST_VIEW), 0);
benar('AntiGamingPolicy mengizinkan saat kuota kosong', kuota.allowed === true);
const kuotaHabis = AntiGamingPolicy.check(aturanSkor(ActivityType.BROADCAST_VIEW), 99);
benar('AntiGamingPolicy menolak saat kuota terlampaui', kuotaHabis.allowed === false);

console.log('── 5. Konsistensi seed data ──');

const bundle = buildSeed();
const stats = seedStats(bundle);

samaDengan('jumlah anggota = 60', stats.awardees, 60);
benar('aktivitas terbangkitkan', stats.activities > 200, `activities=${stats.activities}`);
benar('cerita >= 20', stats.stories >= 20, `stories=${stats.stories}`);
benar('kegiatan >= 10', stats.events >= 10, `events=${stats.events}`);
benar('gerakan >= 6', stats.movements >= 6, `movements=${stats.movements}`);
benar('broadcast >= 12', stats.broadcasts >= 12, `broadcasts=${stats.broadcasts}`);
benar('reward >= 10', stats.rewards >= 10, `rewards=${stats.rewards}`);

// INI PEMERIKSAAN TERPENTING: total poin tiap anggota harus benar-benar
// merupakan jumlah aktivitas berpoinnya, bukan angka yang ditempel.
const poinPerAnggota = new Map();
for (const a of bundle.activities) {
	const diberikan = a.status === undefined || a.status === 'AWARDED' || a.status === 'DIBERIKAN';
	if (!diberikan) continue;
	poinPerAnggota.set(a.awardeeId, (poinPerAnggota.get(a.awardeeId) ?? 0) + (a.points ?? 0));
}

let tidakKonsisten = 0;
/** @type {string[]} */
const contohBeda = [];
for (const m of bundle.awardees) {
	const jumlah = poinPerAnggota.get(m.id) ?? 0;
	if (jumlah !== m.points) {
		tidakKonsisten++;
		if (contohBeda.length < 5) contohBeda.push(`${m.id}: awardee.points=${m.points} vs sum=${jumlah}`);
	}
}
benar(
	'total poin setiap anggota == jumlah aktivitasnya',
	tidakKonsisten === 0,
	tidakKonsisten > 0 ? `${tidakKonsisten} anggota tidak konsisten. Contoh:\n    ${contohBeda.join('\n    ')}` : ''
);

// Determinisme: dua kali build harus identik, kalau tidak demo akan berubah tiap refresh.
const bundle2 = buildSeed();
samaDengan(
	'seed deterministik (2 build identik)',
	bundle2.awardees.map((m) => `${m.id}:${m.points}`).join('|'),
	bundle.awardees.map((m) => `${m.id}:${m.points}`).join('|')
);

// Distribusi tier harus mengerucut ke atas, bukan rata.
const d = stats.tierDistribution;
console.log('    distribusi tier:', JSON.stringify(d));
const champion = d[TierLevel.CHAMPION] ?? 0;
const newcomer = d[TierLevel.NEWCOMER] ?? 0;
benar('ada anggota Champion', champion > 0, `champion=${champion}`);
benar('Newcomer lebih banyak daripada Champion', newcomer > champion, `newcomer=${newcomer} champion=${champion}`);
samaDengan(
	'total distribusi tier = 60',
	Object.values(d).reduce((a, b) => a + b, 0),
	60
);

// Nama anggota harus wajar, bukan placeholder.
const namaBuruk = bundle.awardees.filter((m) => /user\s*\d|lorem|placeholder|test/i.test(m.name ?? ''));
benar('tidak ada nama placeholder', namaBuruk.length === 0, namaBuruk.slice(0, 3).map((m) => m.name).join(', '));

// ═══════════════════════════════════════════════════════════════════════════
// TAMBAHAN V2: aturan peran, akses, alur editorial, dan kemurnian zona publik.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Repository in-memory generik untuk menguji service tanpa Dexie.
 *
 * Sengaja menyimpan baris POLOS, bukan entity: itulah bentuk yang benar-benar
 * dikembalikan repository Dexie, sehingga service ikut teruji pada jalur
 * `Entity.from(row)`-nya: jalur yang paling mungkin patah saat skema berubah.
 */
class RepoMemori {
	/** @param {readonly Record<string, any>[]} rows */
	constructor(rows = []) {
		/** @type {Record<string, any>[]} */
		this.items = rows.map((row) => ({ ...row }));
	}
	/** @param {any} entity */
	async save(entity) {
		const baris = typeof entity?.toJSON === 'function' ? entity.toJSON() : entity;
		const posisi = this.items.findIndex((row) => row.id === baris.id);
		if (posisi >= 0) this.items[posisi] = baris;
		else this.items.push(baris);
		return entity;
	}
	async getAll() {
		return this.items;
	}
	/** @param {Record<string, unknown>} criteria */
	async query(criteria = {}) {
		const kunci = Object.keys(criteria);
		return this.items.filter((row) => kunci.every((k) => row[k] === criteria[k]));
	}
	/**
	 * Dibutuhkan `ContentReviewService` untuk membaca ULANG consent penulis.
	 * Tanpa method ini, gerbang consent jatuh ke jalur "repo tidak diberikan" dan
	 * bagian 12 akan lulus tanpa pernah menyentuh pembacaan lapis kedua.
	 * @param {string} id
	 */
	async getById(id) {
		return this.items.find((row) => row.id === id) ?? null;
	}
}

/** Jam tetap supaya seluruh keputusan editorial di uji ini deterministik. */
const JAM_UJI = () => new Date('2026-07-20T09:00:00+07:00');

console.log('── 6. AccessPolicy: matriks peran × zona (PO-2, PO-3) ──');

/**
 * Matriks §6.4 kontrak: empat keadaan aktor × empat zona.
 * Tamu diwakili `null`: bukan peran bernama "GUEST", supaya "tidak punya peran"
 * tidak pernah dapat menyamar sebagai peran yang sah.
 * @type {{aktor: string, role: string|null, boleh: Record<string, boolean>}[]}
 */
const MATRIKS_AKSES = [
	{
		aktor: 'tamu',
		role: null,
		boleh: { '/cerita': true, '/awardee/aksi': false, '/verifikator/cerita': false, '/admin': false }
	},
	{
		aktor: 'AWARDEE',
		role: UserRole.AWARDEE,
		boleh: { '/cerita': true, '/awardee/aksi': true, '/verifikator/cerita': false, '/admin': false }
	},
	{
		aktor: 'VERIFIER',
		role: UserRole.VERIFIER,
		boleh: { '/cerita': true, '/awardee/aksi': false, '/verifikator/cerita': true, '/admin': false }
	},
	{
		aktor: 'ADMIN',
		role: UserRole.ADMIN,
		boleh: { '/cerita': true, '/awardee/aksi': false, '/verifikator/cerita': false, '/admin': true }
	}
];

for (const baris of MATRIKS_AKSES) {
	for (const [jalur, harapan] of Object.entries(baris.boleh)) {
		samaDengan(
			`canAccess(${baris.aktor}, "${jalur}") = ${harapan}`,
			AccessPolicy.canAccess(baris.role, jalur),
			harapan
		);
	}
}

// Peran BUKAN hierarki: ADMIN tidak mewarisi zona verifikator, dan sebaliknya.
benar(
	'ADMIN tidak mewarisi zona VERIFIER',
	AccessPolicy.canEnter(UserRole.ADMIN, Zone.VERIFIER) === false
);
benar(
	'VERIFIER tidak mewarisi zona ADMIN',
	AccessPolicy.canEnter(UserRole.VERIFIER, Zone.ADMIN) === false
);
benar('zona tak dikenal fail-closed', AccessPolicy.canEnter(UserRole.ADMIN, 'ZONA_HANTU') === false);

samaDengan('zoneOf("/") = PUBLIC', AccessPolicy.zoneOf('/'), Zone.PUBLIC);
samaDengan('zoneOf("/kalender") = PUBLIC', AccessPolicy.zoneOf('/kalender'), Zone.PUBLIC);
samaDengan('zoneOf("/Admin/?x=1") ternormalkan = ADMIN', AccessPolicy.zoneOf('/Admin/?x=1'), Zone.ADMIN);
samaDengan('zoneOf("/adminstrasi") bukan ADMIN', AccessPolicy.zoneOf('/adminstrasi'), Zone.PUBLIC);

// Jangkar struktural PO-2: zona publik tidak punya jawaban "boleh" untuk ditanya.
samaDengan('canSeeScoring(tamu) = false', AccessPolicy.canSeeScoring(null), false);
samaDengan('canSeeScoring(AWARDEE) = true', AccessPolicy.canSeeScoring(UserRole.AWARDEE), true);
samaDengan('canSeeScoring(VERIFIER) = false', AccessPolicy.canSeeScoring(UserRole.VERIFIER), false);
samaDengan('canSeeScoring(ADMIN) = true', AccessPolicy.canSeeScoring(UserRole.ADMIN), true);
samaDengan('canSeeLeaderboard(AWARDEE) = true', AccessPolicy.canSeeLeaderboard(UserRole.AWARDEE), true);
samaDengan('canSeeLeaderboard(ADMIN) = false', AccessPolicy.canSeeLeaderboard(UserRole.ADMIN), false);
samaDengan('canSeeLeaderboard(tamu) = false', AccessPolicy.canSeeLeaderboard(null), false);

samaDengan('homePathFor(AWARDEE) = /awardee', AccessPolicy.homePathFor(UserRole.AWARDEE), '/awardee');
samaDengan('homePathFor(VERIFIER) = /verifikator', AccessPolicy.homePathFor(UserRole.VERIFIER), '/verifikator');
samaDengan('homePathFor(ADMIN) = /admin', AccessPolicy.homePathFor(UserRole.ADMIN), '/admin');
samaDengan('homePathFor(tamu) = /', AccessPolicy.homePathFor(null), '/');

// safeNext menutup open redirect, gelang login, dan pantulan zona sekaligus.
samaDengan('safeNext("//evil.com") -> beranda', AccessPolicy.safeNext('//evil.com', UserRole.ADMIN), '/admin');
samaDengan('safeNext("https://evil.com") -> beranda', AccessPolicy.safeNext('https://evil.com', UserRole.ADMIN), '/admin');
samaDengan('safeNext("/masuk") -> beranda', AccessPolicy.safeNext('/masuk', UserRole.AWARDEE), '/awardee');
samaDengan('safeNext zona salah -> beranda', AccessPolicy.safeNext('/admin/esg', UserRole.AWARDEE), '/awardee');
samaDengan('safeNext jalur sah dipertahankan', AccessPolicy.safeNext('/awardee/aksi', UserRole.AWARDEE), '/awardee/aksi');

samaDengan('isSelfReview(id, id) = true', AccessPolicy.isSelfReview('USR-007', 'USR-007'), true);
samaDengan('isSelfReview(beda) = false', AccessPolicy.isSelfReview('USR-007', 'USR-008'), false);
samaDengan('isSelfReview(null, null) = false', AccessPolicy.isSelfReview(null, null), false);
samaDengan('isSelfReview("", "") = false', AccessPolicy.isSelfReview('', ''), false);

console.log('── 7. Alur editorial: transisi sah per peran (PO-4) ──');

samaDengan('DRAFT × AWARDEE -> [DIAJUKAN]', allowedStoryTransitions(STORY_STATUS.DRAFT, UserRole.AWARDEE), [STORY_STATUS.DIAJUKAN]);
samaDengan('DRAFT × VERIFIER -> []', allowedStoryTransitions(STORY_STATUS.DRAFT, UserRole.VERIFIER), []);
samaDengan('DIAJUKAN × VERIFIER -> [REVIEW]', allowedStoryTransitions(STORY_STATUS.DIAJUKAN, UserRole.VERIFIER), [STORY_STATUS.REVIEW]);
samaDengan('DIAJUKAN × AWARDEE -> [] (penulis tidak meninjau dirinya)', allowedStoryTransitions(STORY_STATUS.DIAJUKAN, UserRole.AWARDEE), []);
samaDengan(
	'REVIEW × VERIFIER -> [DISETUJUI, PERLU_REVISI, DIARSIPKAN]',
	allowedStoryTransitions(STORY_STATUS.REVIEW, UserRole.VERIFIER),
	[STORY_STATUS.DISETUJUI, STORY_STATUS.PERLU_REVISI, STORY_STATUS.DIARSIPKAN]
);
samaDengan('REVIEW × ADMIN -> [] (Admin bukan pemutus konten)', allowedStoryTransitions(STORY_STATUS.REVIEW, UserRole.ADMIN), []);
samaDengan('PERLU_REVISI × AWARDEE -> [DIAJUKAN]', allowedStoryTransitions(STORY_STATUS.PERLU_REVISI, UserRole.AWARDEE), [STORY_STATUS.DIAJUKAN]);
samaDengan(
	'DISETUJUI × VERIFIER -> [TERPUBLIKASI, DIARSIPKAN]',
	allowedStoryTransitions(STORY_STATUS.DISETUJUI, UserRole.VERIFIER),
	[STORY_STATUS.TERPUBLIKASI, STORY_STATUS.DIARSIPKAN]
);
samaDengan('TERPUBLIKASI × ADMIN -> [DIARSIPKAN] (jalur takedown)', allowedStoryTransitions(STORY_STATUS.TERPUBLIKASI, UserRole.ADMIN), [STORY_STATUS.DIARSIPKAN]);
samaDengan('DIARSIPKAN terminal untuk semua peran', allowedStoryTransitions(STORY_STATUS.DIARSIPKAN, UserRole.VERIFIER), []);
samaDengan('tamu tidak punya transisi cerita', allowedStoryTransitions(STORY_STATUS.DRAFT, null), []);

samaDengan('kegiatan DRAFT × AWARDEE -> [DIUSULKAN]', allowedEventTransitions(EventStatus.DRAFT, UserRole.AWARDEE), [EventStatus.DIUSULKAN]);
samaDengan('kegiatan DRAFT × VERIFIER -> [DIUSULKAN]', allowedEventTransitions(EventStatus.DRAFT, UserRole.VERIFIER), [EventStatus.DIUSULKAN]);
samaDengan(
	'kegiatan DIUSULKAN × VERIFIER -> [TERJADWAL, DITOLAK]',
	allowedEventTransitions(EventStatus.DIUSULKAN, UserRole.VERIFIER),
	[EventStatus.TERJADWAL, EventStatus.DITOLAK]
);
samaDengan('kegiatan DIUSULKAN × AWARDEE -> []', allowedEventTransitions(EventStatus.DIUSULKAN, UserRole.AWARDEE), []);
samaDengan('kegiatan DIUSULKAN × ADMIN -> []', allowedEventTransitions(EventStatus.DIUSULKAN, UserRole.ADMIN), []);
samaDengan(
	'kegiatan TERJADWAL × ADMIN -> [BERLANGSUNG, DIBATALKAN]',
	allowedEventTransitions(EventStatus.TERJADWAL, UserRole.ADMIN),
	[EventStatus.BERLANGSUNG, EventStatus.DIBATALKAN]
);
samaDengan('kegiatan SELESAI terminal', allowedEventTransitions(EventStatus.SELESAI, UserRole.VERIFIER), []);
samaDengan('tamu tidak punya transisi kegiatan', allowedEventTransitions(EventStatus.DIUSULKAN, null), []);

console.log('── 8. ContentReviewService: konflik kepentingan & catatan wajib (PO-4) ──');

const akunVerifikator = new UserAccount(
	/** @type {any} */ (bundle.accounts.find((a) => a.id === ID_VERIFIKATOR_UTAMA))
);
const akunVerifikatorKedua = new UserAccount(
	/** @type {any} */ (bundle.accounts.find((a) => a.id === ID_VERIFIKATOR_KEDUA))
);
const akunAdmin = new UserAccount(/** @type {any} */ (bundle.accounts.find((a) => a.id === ID_ADMIN)));
const akunAwardee = new UserAccount(
	/** @type {any} */ (bundle.accounts.find((a) => a.role === UserRole.AWARDEE))
);
const akunTerkunci = akunVerifikator.withChanges({ status: AccountStatus.TERKUNCI });

const review = new ContentReviewService({
	storyRepo: new RepoMemori(bundle.stories),
	eventRepo: new RepoMemori(bundle.events),
	clock: JAM_UJI
});

// Kegiatan yang diusulkan verifikator utama sendiri: inilah kasus X-01.
const usulanSendiri = new CommunityEvent({
	.../** @type {any} */ (bundle.events.find((e) => e.status === EventStatus.DIUSULKAN)),
	status: EventStatus.DIUSULKAN,
	proposedBy: ID_VERIFIKATOR_UTAMA,
	proposedByRole: UserRole.VERIFIER
});

const setujuSendiri = await review.approveEvent(usulanSendiri, akunVerifikator);
samaDengan('pengusul menyetujui kegiatannya sendiri ditolak', setujuSendiri.reason, ReviewFailure.KONFLIK_KEPENTINGAN);
samaDengan('penolakan konflik kepentingan tidak mengembalikan entity', setujuSendiri.entity, null);

const setujuOrangLain = await review.approveEvent(usulanSendiri, akunVerifikatorKedua);
benar('verifikator kedua boleh menyetujui usulan itu', setujuOrangLain.ok === true, setujuOrangLain.reason);
samaDengan('persetujuan menaikkan status ke TERJADWAL', setujuOrangLain.entity?.status, EventStatus.TERJADWAL);

samaDengan(
	'menolak kegiatan tanpa catatan ditolak',
	(await review.rejectEvent(usulanSendiri, akunVerifikatorKedua, '')).reason,
	ReviewFailure.CATATAN_WAJIB
);
samaDengan(
	'catatan berisi spasi saja tetap dianggap kosong',
	(await review.rejectEvent(usulanSendiri, akunVerifikatorKedua, '   \n\t ')).reason,
	ReviewFailure.CATATAN_WAJIB
);
benar(
	'menolak kegiatan dengan alasan tertulis diterima',
	(await review.rejectEvent(usulanSendiri, akunVerifikatorKedua, 'Bentrok dengan agenda chapter PF 11.')).ok === true
);

const terjadwal = new CommunityEvent({
	.../** @type {any} */ (bundle.events.find((e) => e.status === EventStatus.TERJADWAL))
});
samaDengan(
	'membatalkan kegiatan tanpa alasan ditolak',
	(await review.cancelEvent(terjadwal, akunAdmin, '')).reason,
	ReviewFailure.CATATAN_WAJIB
);
samaDengan(
	'alasan pembatalan berisi spasi saja tetap dianggap kosong',
	(await review.cancelEvent(terjadwal, akunAdmin, ' \n\t ')).reason,
	ReviewFailure.CATATAN_WAJIB
);
// Pasangan kendali: tanpa ini, asersi di atas akan tetap hijau seandainya
// `cancelEvent` menolak SEMUA pembatalan: agenda yang batal lalu tidak pernah
// dapat dicabut, dan gerbangnya justru memuji kegagalan itu.
const batalSah = await review.cancelEvent(
	terjadwal,
	akunAdmin,
	'Narasumber berhalangan; agenda dijadwalkan ulang bulan depan.'
);
benar('KENDALI: pembatalan dengan alasan tertulis diterima', batalSah.ok === true, String(batalSah.reason));
samaDengan('pembatalan sah memindahkan status ke DIBATALKAN', batalSah.entity?.status, EventStatus.DIBATALKAN);
benar(
	'alasan pembatalan tersimpan pada catatan keputusan',
	String(batalSah.entity?.reviewNote ?? '').includes('Narasumber berhalangan'),
	String(batalSah.entity?.reviewNote)
);

const naskahReview = /** @type {any} */ (
	bundle.stories.find((s) => s.status === STORY_STATUS.REVIEW)
);
samaDengan(
	'meminta revisi tanpa catatan ditolak',
	(await review.requestRevision(naskahReview, akunVerifikator, '')).reason,
	ReviewFailure.CATATAN_WAJIB
);
samaDengan(
	'menyetujui naskah tanpa checklist sensitivitas ditolak',
	(await review.approveStory(naskahReview, akunVerifikator, { sensitivityConfirmed: false })).reason,
	ReviewFailure.SENSITIVITAS_BELUM_DICEK
);
benar(
	'menyetujui naskah dengan checklist lolos diterima',
	(await review.approveStory(naskahReview, akunVerifikator, { sensitivityConfirmed: true, note: 'Checklist 21 butir lolos.' })).ok === true
);
samaDengan(
	'Awardee tidak boleh membuka review naskah',
	(await review.startReview(naskahReview, akunAwardee)).reason,
	ReviewFailure.TRANSISI_TERLARANG
);
samaDengan(
	'akun TERKUNCI kehilangan kewenangan memutus',
	(await review.requestRevision(naskahReview, akunTerkunci, 'Perbaiki paragraf 3.')).reason,
	ReviewFailure.PERAN_TIDAK_BERWENANG
);

console.log('── 9. ProgramImpactService.publicSnapshot() bebas mekanik skor (PO-2) ──');

const impact = new ProgramImpactService({
	awardeeRepo: new RepoMemori(bundle.awardees),
	activityRepo: new RepoMemori(bundle.activities),
	movementRepo: new RepoMemori(bundle.movements),
	storyRepo: new RepoMemori(bundle.stories),
	eventRepo: new RepoMemori(bundle.events),
	clock: JAM_UJI
});
const potret = await impact.publicSnapshot();

/**
 * Kata yang menandakan mekanik gamifikasi. Diuji pada NAMA KUNCI, bukan nilai:
 * PO-2 melarang zona publik memiliki angka itu untuk dirender sama sekali :
 * bukan sekadar melarang menampilkannya.
 */
const KATA_TERLARANG = /poin|point|tier|jenjang|badge|lencana|peringkat|rank|leaderboard|score|skor|coin|streak|reward/i;

/** @param {unknown} nilai @param {string} jalur @returns {string[]} */
function kunciTerlarang(nilai, jalur = '') {
	if (nilai === null || typeof nilai !== 'object' || nilai instanceof Date) return [];
	return Object.entries(nilai).flatMap(([kunci, isi]) => {
		const penuh = jalur ? `${jalur}.${kunci}` : kunci;
		return [
			...(KATA_TERLARANG.test(kunci) ? [penuh] : []),
			...kunciTerlarang(isi, penuh)
		];
	});
}

const pelanggaranPotret = kunciTerlarang(potret);
benar(
	'publicSnapshot() tanpa satu pun kunci berbau poin/tier/peringkat',
	pelanggaranPotret.length === 0,
	pelanggaranPotret.join(', ')
);
benar('publicSnapshot() memuat registeredAwardees', typeof potret.registeredAwardees === 'number');
benar('publicSnapshot() memuat publishedStories', typeof potret.publishedStories === 'number');
benar('publicSnapshot() memuat upcomingEvents', typeof potret.upcomingEvents === 'number');
benar(
	'organicReach disajikan sebagai rentang, bukan angka tunggal',
	typeof potret.organicReach?.min === 'number' && potret.organicReach.max >= potret.organicReach.min
);
benar(
	'recordedActions adalah CACAH aksi, bukan jumlah poin',
	potret.recordedActions !== stats.totalPoints,
	`recordedActions=${potret.recordedActions} totalPoints=${stats.totalPoints}`
);

console.log('── 10. UserAccount + PasswordHash (PO-3) ──');

samaDengan(
	'PasswordHash.of() dua kali menghasilkan nilai identik',
	PasswordHash.of(SANDI_DEMO, 'USR-001').value,
	PasswordHash.of(SANDI_DEMO, 'USR-001').value
);
benar('garam berbeda menghasilkan digest berbeda', PasswordHash.of(SANDI_DEMO, 'USR-001').value !== PasswordHash.of(SANDI_DEMO, 'USR-002').value);
benar('matches() benar untuk sandi yang tepat', PasswordHash.of(SANDI_DEMO, 'USR-001').matches(SANDI_DEMO));
benar('matches() salah untuk sandi yang keliru', PasswordHash.of(SANDI_DEMO, 'USR-001').matches('salah') === false);
samaDengan(
	'fromStored(value) roundtrip identik',
	PasswordHash.fromStored(PasswordHash.of(SANDI_DEMO, 'USR-001').value).value,
	PasswordHash.of(SANDI_DEMO, 'USR-001').value
);
melempar('fromStored menolak format asing', () => PasswordHash.fromStored('bcrypt:abc'));
melempar('konstruktor menolak digest cacat', () => new PasswordHash('USR-001', 'ZZZ'));
melempar('konstruktor menolak garam ber-titik-dua', () => new PasswordHash('US:R', '00000000'));

/** @param {Record<string, unknown>} ubahan */
const akunUji = (ubahan) => ({
	id: 'USR-999',
	email: 'uji@pfriends.id',
	passwordHash: PasswordHash.of(SANDI_DEMO, 'USR-999').value,
	role: UserRole.AWARDEE,
	awardeeId: 'AWD-001',
	displayName: 'Akun Uji',
	createdAt: '2026-01-05T00:00:00.000Z',
	...ubahan
});

melempar('akun AWARDEE tanpa awardeeId ditolak', () => new UserAccount(akunUji({ awardeeId: null })));
melempar('akun VERIFIER ber-awardeeId ditolak', () => new UserAccount(akunUji({ role: UserRole.VERIFIER, awardeeId: 'AWD-001' })));
melempar('surel tanpa "@" ditolak', () => new UserAccount(akunUji({ email: 'bukan-surel' })));
melempar('peran tak dikenal ditolak', () => new UserAccount(akunUji({ role: 'SUPERUSER' })));
melempar('status akun tak dikenal ditolak', () => new UserAccount(akunUji({ status: 'MELAYANG' })));

benar('seed: akun verifikator utama cocok SANDI_DEMO', akunVerifikator.matchesPassword(SANDI_DEMO));
benar('seed: akun admin cocok SANDI_DEMO', akunAdmin.matchesPassword(SANDI_DEMO));
benar('sandi keliru ditolak akun seed', akunAdmin.matchesPassword('pfriends2027') === false);
benar('akun TERKUNCI kehilangan seluruh kapabilitas', akunTerkunci.can('REVIEW_CONTENT') === false);
samaDengan(
	'toJSON() -> konstruktor menghasilkan akun setara',
	new UserAccount(/** @type {any} */ (akunVerifikator.toJSON())).toJSON(),
	akunVerifikator.toJSON()
);
samaDengan('roleLabel VERIFIER = Verifikator', akunVerifikator.roleLabel, 'Verifikator');
samaDengan('homePath ADMIN = /admin', akunAdmin.homePath, '/admin');
samaDengan('awardeeId akun staf = null', akunAdmin.awardeeId, null);

console.log('── 11. Pemindai lapisan: domain tidak mengenal framework (PO-7) ──');

/** Impor yang tidak boleh muncul di mana pun dalam `src/lib/domain/**`. */
const IMPOR_TERLARANG = /from\s+['"](svelte|svelte\/[^'"]*|dexie|\$app\/[^'"]*|\$lib\/stores\/[^'"]*|\$lib\/infrastructure\/[^'"]*)['"]/;

const AKAR_DOMAIN = fileURLToPath(new URL('../../src/lib/domain/', import.meta.url));

/** @param {string} dir @returns {Promise<string[]>} */
async function berkasJs(dir) {
	const isi = await readdir(dir, { withFileTypes: true });
	const hasil = await Promise.all(
		isi.map(async (entri) => {
			const jalur = join(dir, entri.name);
			if (entri.isDirectory()) return berkasJs(jalur);
			return entri.name.endsWith('.js') ? [jalur] : [];
		})
	);
	return hasil.flat();
}

const berkasDomain = await berkasJs(AKAR_DOMAIN);
/** @type {string[]} */
const pelanggaranLapisan = [];
for (const jalur of berkasDomain) {
	const isi = await readFile(jalur, 'utf8');
	for (const [nomor, baris] of isi.split('\n').entries()) {
		if (IMPOR_TERLARANG.test(baris)) {
			pelanggaranLapisan.push(`${jalur.slice(AKAR_DOMAIN.length)}:${nomor + 1}: ${baris.trim()}`);
		}
	}
}
benar('pemindai benar-benar membaca lapisan domain', berkasDomain.length >= 20, `${berkasDomain.length} berkas`);
benar(
	'nol impor svelte/dexie/$app/$lib{stores,infrastructure} di src/lib/domain/**',
	pelanggaranLapisan.length === 0,
	pelanggaranLapisan.slice(0, 5).join('\n    ')
);

console.log('── 12. Consent tidak aktif memblokir approve & publish (G5) ──');

/**
 * Naskah uji ber-consent, dipisahkan dari `bundle` supaya bagian ini tidak
 * bergantung pada urutan seed maupun pada keputusan bagian 8 yang sudah menulis
 * ke repo bersama.
 * @param {Record<string, unknown>} ubahan
 */
const naskahConsent = (ubahan = {}) => ({
	.../** @type {any} */ (bundle.stories.find((s) => s.status === STORY_STATUS.REVIEW)),
	id: 'STR-UJI-CONSENT',
	authorId: 'AWD-UJI',
	status: STORY_STATUS.REVIEW,
	consentActive: true,
	consentId: 'CST-UJI',
	...ubahan
});

/** @param {boolean} consentPenulis */
function reviewDenganPenulis(consentPenulis) {
	return new ContentReviewService({
		storyRepo: new RepoMemori([]),
		eventRepo: new RepoMemori(bundle.events),
		awardeeRepo: new RepoMemori([{ id: 'AWD-UJI', consentActive: consentPenulis }]),
		clock: JAM_UJI
	});
}

// ── Kendali: penulis ber-consent aktif WAJIB bisa disetujui ─────────────────
// Tanpa pasangan kendali ini, asersi penolakan di bawah akan tetap hijau
// seandainya `approveStory` menolak SEMUA naskah: kegagalan yang menyamar
// sebagai keamanan.
const setujuConsentAktif = await reviewDenganPenulis(true).approveStory(
	naskahConsent(),
	akunVerifikator,
	{ sensitivityConfirmed: true, note: 'Checklist 21 butir lolos.' }
);
benar(
	'KENDALI: naskah ber-consent aktif dapat disetujui',
	setujuConsentAktif.ok === true,
	String(setujuConsentAktif.reason)
);

// ── Pencabutan pada PENULIS (pembacaan ulang lapis kedua) ───────────────────
samaDengan(
	'approveStory ditolak ketika consent PENULIS dicabut',
	(
		await reviewDenganPenulis(false).approveStory(naskahConsent(), akunVerifikator, {
			sensitivityConfirmed: true
		})
	).reason,
	ReviewFailure.CONSENT_DICABUT
);
samaDengan(
	'publishStory ditolak ketika consent PENULIS dicabut',
	(
		await reviewDenganPenulis(false).publishStory(
			naskahConsent({ status: STORY_STATUS.DISETUJUI }),
			akunVerifikator
		)
	).reason,
	ReviewFailure.CONSENT_DICABUT
);

// ── Pencabutan pada NASKAH (proyeksi `consentActive`) ───────────────────────
// Kedua pembacaan wajib berdiri sendiri: gerbang yang hanya memeriksa salah
// satunya akan bocor pada hari proyeksi dan sumber kebenarannya berselisih.
samaDengan(
	'approveStory ditolak ketika proyeksi consent naskah mati',
	(
		await reviewDenganPenulis(true).approveStory(naskahConsent({ consentActive: false }), akunVerifikator, {
			sensitivityConfirmed: true
		})
	).reason,
	ReviewFailure.CONSENT_DICABUT
);
samaDengan(
	'approveStory ditolak ketika naskah tidak pernah punya rekaman consent',
	(
		await reviewDenganPenulis(true).approveStory(naskahConsent({ consentId: null }), akunVerifikator, {
			sensitivityConfirmed: true
		})
	).reason,
	ReviewFailure.CONSENT_DICABUT
);
// `consentId: ''` berarti hal yang sama dengan `null`: kolom kosong dari basis
// data atau formulir. Uji "bukan null" saja meluluskannya, dan naskah tanpa dasar
// persetujuan lolos gerbang terbit. Asersi ini menahan lubang itu tetap tertutup.
samaDengan(
	'approveStory ditolak ketika rujukan consent naskah string kosong',
	(
		await reviewDenganPenulis(true).approveStory(naskahConsent({ consentId: '' }), akunVerifikator, {
			sensitivityConfirmed: true
		})
	).reason,
	ReviewFailure.CONSENT_DICABUT
);
samaDengan(
	'approveStory ditolak ketika rujukan consent hanya spasi',
	(
		await reviewDenganPenulis(true).approveStory(naskahConsent({ consentId: '   ' }), akunVerifikator, {
			sensitivityConfirmed: true
		})
	).reason,
	ReviewFailure.CONSENT_DICABUT
);
samaDengan(
	'penulis yang tidak ditemukan di katalog BUKAN izin',
	(
		await new ContentReviewService({
			storyRepo: new RepoMemori([]),
			eventRepo: new RepoMemori(bundle.events),
			awardeeRepo: new RepoMemori([]),
			clock: JAM_UJI
		}).approveStory(naskahConsent(), akunVerifikator, { sensitivityConfirmed: true })
	).reason,
	ReviewFailure.CONSENT_DICABUT
);
samaDengan(
	'penolakan consent tidak mengembalikan entity',
	(
		await reviewDenganPenulis(false).approveStory(naskahConsent(), akunVerifikator, {
			sensitivityConfirmed: true
		})
	).entity,
	null
);

// Gerbang consent diperiksa SEBELUM checklist sensitivitas: verifikator yang
// naskahnya tertahan pencabutan hak tidak boleh disuruh mencentang 21 butir
// terlebih dahulu untuk mengetahui sebab yang sebenarnya.
samaDengan(
	'sebab consent menang atas sebab sensitivitas',
	(
		await reviewDenganPenulis(false).approveStory(naskahConsent(), akunVerifikator, {
			sensitivityConfirmed: false
		})
	).reason,
	ReviewFailure.CONSENT_DICABUT
);

console.log('── 13. SroiCalculator: rantai penyesuaian, rasio, pembagi nol (G5) ──');

/**
 * Kalkulator ber-parameter sederhana. Angkanya sengaja bulat supaya aritmetikanya
 * dapat diperiksa dengan mata, dan sengaja BUKAN angka produksi supaya uji ini
 * tidak ikut merah setiap kali Corsec menyetel ulang asumsinya.
 */
const sroiUji = new SroiCalculator({
	adjustments: [
		{ key: 'a', label: 'A', pertanyaan: 'A?', faktor: 0.5 },
		{ key: 'b', label: 'B', pertanyaan: 'B?', faktor: 0.5 }
	],
	proxy: {
		engagementRateBrand: 1,
		investasiProgram: 100,
		biayaPerEngagement: 1,
		nilaiJamPelatihan: 1,
		nilaiPesertaAksi: 1
	},
	ambangKelengkapanBukti: 60,
	pengaliEngagement: 1
});

const rantai = sroiUji.adjustmentChain(100);
samaDengan('rantai penyesuaian punya satu baris per penyesuaian', rantai.length, 2);
// INI jangkar utamanya: dua faktor 50% BERURUTAN menyisakan 25, bukan 0.
// Menjumlahkan keduanya lebih dulu (50%+50% = 100%) menghasilkan 0: kekeliruan
// paling sering pada perhitungan SROI buatan sendiri.
samaDengan('langkah 1 memotong 50 dan menyisakan 50', [rantai[0].potongan, rantai[0].sisa], [50, 50]);
samaDengan('langkah 2 memotong 25 dan menyisakan 25', [rantai[1].potongan, rantai[1].sisa], [25, 25]);
benar(
	'penyesuaian DIRANTAI, bukan dijumlahkan',
	rantai.at(-1)?.sisa === 25,
	`sisa akhir=${rantai.at(-1)?.sisa} (dijumlahkan akan menghasilkan 0)`
);
samaDengan('rantai atas nilai kotor 0 tetap menghasilkan sisa 0', sroiUji.adjustmentChain(0).at(-1)?.sisa, 0);
melempar('nilai kotor negatif ditolak', () => sroiUji.adjustmentChain(-1));
melempar('faktor penyesuaian di luar 0..1 ditolak konstruktor', () =>
	new SroiCalculator({ adjustments: [{ key: 'x', label: 'X', pertanyaan: 'X?', faktor: 1.5 }] })
);

const hitung = sroiUji.hitung({
	jangkauanNeto: 10,
	jamPelatihan: 20,
	pesertaAksiLingkungan: 30,
	kelengkapanBuktiPersen: 80
});
samaDengan('nilai kotor = 10 + 20 + 30', hitung.nilaiKotor, 60);
samaDengan('nilai neto = 60 × 0,5 × 0,5', hitung.nilaiNeto, 15);
samaDengan('rasio = neto / investasi', hitung.rasio, 0.15);
benar('kelengkapan bukti di atas ambang membuka pelaporan', hitung.layakDilaporkan === true);
benar(
	'kelengkapan bukti di bawah ambang menutup pelaporan',
	sroiUji.hitung({ jangkauanNeto: 10, jamPelatihan: 20, pesertaAksiLingkungan: 30, kelengkapanBuktiPersen: 59 })
		.layakDilaporkan === false
);
benar(
	'kelengkapan bukti TEPAT di ambang membuka pelaporan',
	sroiUji.hitung({ jangkauanNeto: 10, jamPelatihan: 20, pesertaAksiLingkungan: 30, kelengkapanBuktiPersen: 60 })
		.layakDilaporkan === true
);

// Pembagi nol: investasi yang belum ditetapkan Corsec. Rasio tak hingga di layar
// jauh lebih berbahaya daripada nol yang jelas-jelas kosong.
const sroiTanpaInvestasi = new SroiCalculator({
	adjustments: [{ key: 'a', label: 'A', pertanyaan: 'A?', faktor: 0 }],
	proxy: {
		engagementRateBrand: 1,
		investasiProgram: 0,
		biayaPerEngagement: 1,
		nilaiJamPelatihan: 1,
		nilaiPesertaAksi: 1
	},
	pengaliEngagement: 1
});
const tanpaInvestasi = sroiTanpaInvestasi.hitung({
	jangkauanNeto: 1,
	jamPelatihan: 1,
	pesertaAksiLingkungan: 1
});
samaDengan('investasi nol -> rasio 0, bukan Infinity', tanpaInvestasi.rasio, 0);
benar('rasio investasi nol berupa bilangan terhingga', Number.isFinite(tanpaInvestasi.rasio));
samaDengan(
	'nol outcome ditandai adaOutcome=false',
	sroiUji.hitung({ jangkauanNeto: 0, jamPelatihan: 0, pesertaAksiLingkungan: 0 }).adaOutcome,
	false
);
melempar('kuantitas negatif ditolak, bukan dibulatkan ke nol', () =>
	sroiUji.hitung({ jangkauanNeto: -1, jamPelatihan: 0, pesertaAksiLingkungan: 0 })
);
melempar('kuantitas bukan angka ditolak', () =>
	sroiUji.hitung({ jangkauanNeto: /** @type {any} */ ('10'), jamPelatihan: 0, pesertaAksiLingkungan: 0 })
);

console.log('── 14. Kuota reward berkurang & menolak saat habis (G5) ──');

const BULAN_UJI = '2026-07';

/** @param {Record<string, unknown>} ubahan */
const rewardUji = (ubahan = {}) =>
	new Reward({
		id: 'RWD-UJI',
		name: 'Item Uji Kuota',
		category: 'MERCHANDISE',
		description: 'Item uji gerbang kuota.',
		priceCoins: 10,
		minTierLevel: TierLevel.NEWCOMER,
		status: 'TERSEDIA',
		monthlyQuota: 2,
		redeemedThisMonth: 0,
		quotaMonthKey: BULAN_UJI,
		.../** @type {any} */ (ubahan)
	});

const kuota0 = rewardUji();
samaDengan('sisa kuota awal = kuota bulanan', kuota0.remainingQuotaFor(BULAN_UJI), 2);

// Pencacah HARUS benar-benar naik. Sebelum `withRedemptionRecorded()` ada,
// `redeemedThisMonth` hanya pernah dibaca: kuota bulanan sekadar hiasan.
const kuota1 = kuota0.withRedemptionRecorded(BULAN_UJI);
samaDengan('penukaran ke-1 menurunkan sisa menjadi 1', kuota1.remainingQuotaFor(BULAN_UJI), 1);
samaDengan('pencacah bulan berjalan naik menjadi 1', kuota1.redeemedIn(BULAN_UJI), 1);
samaDengan('instans lama TIDAK ikut berubah', kuota0.remainingQuotaFor(BULAN_UJI), 2);

const kuota2 = kuota1.withRedemptionRecorded(BULAN_UJI);
samaDengan('penukaran ke-2 menghabiskan kuota', kuota2.remainingQuotaFor(BULAN_UJI), 0);
benar('kuota habis menutup ketersediaan', kuota2.isAvailableFor(BULAN_UJI) === false);
melempar('penukaran ke-3 DITOLAK saat kuota habis', () => kuota2.withRedemptionRecorded(BULAN_UJI));

// Reset bulanan tanpa cron: bulan berikutnya mulai dari nol lagi.
samaDengan('bulan berikutnya sisa kuotanya penuh kembali', kuota2.remainingQuotaFor('2026-08'), 2);
samaDengan(
	'penukaran pada bulan baru MENGGANTI pencacah menjadi 1',
	kuota2.withRedemptionRecorded('2026-08').redeemedIn('2026-08'),
	1
);

// Item tanpa batas kuota tidak boleh ikut tertutup.
const tanpaBatas = rewardUji({ monthlyQuota: null, redeemedThisMonth: 999 });
samaDengan('item tanpa kuota melaporkan sisa null', tanpaBatas.remainingQuotaFor(BULAN_UJI), null);
benar('item tanpa kuota tetap tersedia', tanpaBatas.isAvailableFor(BULAN_UJI) === true);

// `canBeRedeemedBy` wajib menyebut sebab yang dapat dibaca anggota, dan sebab
// "kuota habis" wajib DIBEDAKAN dari "sedang tidak tersedia": yang pertama
// terbuka lagi bulan depan, yang kedua belum tentu.
// Anggota uji dibuat kaya secara sengaja: bagian ini menguji KUOTA, bukan saldo.
// Memakai anggota seed apa adanya membuat asersi "masih boleh menukar" gagal
// karena sebab yang sama sekali lain: dan kegagalan yang salah alamat lebih
// buruk daripada tidak diuji, sebab ia mengajari pembacanya mengabaikan gerbang.
const awardeeUji = new Awardee(
	/** @type {any} */ ({
		...(bundle.awardees.find((a) => a.tierLevel === TierLevel.CHAMPION) ?? bundle.awardees[0]),
		consentActive: true,
		coins: 10_000
	})
);
const putusanHabis = kuota2.canBeRedeemedBy(awardeeUji, BULAN_UJI);
benar('penukaran ditolak saat kuota habis', putusanHabis.allowed === false);
benar(
	'alasan penolakan menyebut kuota, bukan sekadar "tidak tersedia"',
	/kuota/i.test(String(putusanHabis.reason)),
	String(putusanHabis.reason)
);
benar(
	'penukaran diizinkan selama kuota masih ada',
	kuota1.canBeRedeemedBy(awardeeUji, BULAN_UJI).allowed === true,
	String(kuota1.canBeRedeemedBy(awardeeUji, BULAN_UJI).reason)
);

// Seed: setiap item berkuota wajib konsisten: pencacah tidak boleh melampaui kuota.
const rewardSeedCacat = bundle.rewards.filter(
	(r) => r.monthlyQuota !== null && r.redeemedThisMonth > r.monthlyQuota
);
benar(
	'seed: nol reward dengan pencacah melampaui kuotanya',
	rewardSeedCacat.length === 0,
	rewardSeedCacat.map((r) => `${r.id} ${r.redeemedThisMonth}/${r.monthlyQuota}`).join(', ')
);

console.log(`\n${'='.repeat(60)}`);
console.log(`LULUS : ${lulus}`);
console.log(`GAGAL : ${gagal}`);
if (kegagalan.length > 0) {
	console.log('\nKegagalan:');
	for (const k of kegagalan) console.log(`  ✗ ${k}`);
}
console.log('='.repeat(60));

process.exit(gagal > 0 ? 1 : 0);
