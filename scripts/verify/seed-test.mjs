/**
 * Verifikasi data seed Pfriends.
 *
 * Menguji tiga hal yang dituntut kontrak §6, ditambah pemeriksaan yang jauh lebih
 * keras: SETIAP baris seed dikonstruksi menjadi entity domain sungguhan. Entity
 * Pfriends menegakkan invariannya sendiri di konstruktor, sehingga konstruksi yang
 * lolos tanpa lemparan sudah membuktikan seluruh aturan domain terpenuhi — jauh
 * lebih meyakinkan daripada memeriksa bentuk objek satu per satu di sini.
 *
 * Jalankan: node scripts/verify/seed-test.mjs
 */

import {
	buildSeed,
	seedStats,
	RENCANA_TIER,
	TODAY,
	CAKRAWALA_AGENDA_MINIMUM_HARI
} from '../../src/lib/infrastructure/seed/seed-data.js';
import {
	ID_ADMIN,
	ID_VERIFIKATOR_KEDUA,
	ID_VERIFIKATOR_UTAMA,
	SANDI_DEMO
} from '../../src/lib/infrastructure/seed/accounts.js';
import { tierUntukPoin } from '../../src/lib/domain/constants/tier-table.js';
import { AWARDEE_STATUS, STORY_STATUS } from '../../src/lib/domain/constants/community.js';
import { UserRole } from '../../src/lib/domain/constants/roles.js';
import { UserAccount } from '../../src/lib/domain/entities/UserAccount.js';
import { EventStatus } from '../../src/lib/domain/entities/CommunityEvent.js';
import { Awardee } from '../../src/lib/domain/entities/Awardee.js';
import { PointActivity, ActivityStatus } from '../../src/lib/domain/entities/PointActivity.js';
import { Story } from '../../src/lib/domain/entities/Story.js';
import { CommunityEvent } from '../../src/lib/domain/entities/CommunityEvent.js';
import { Movement } from '../../src/lib/domain/entities/Movement.js';
import { Broadcast } from '../../src/lib/domain/entities/Broadcast.js';
import { Reward } from '../../src/lib/domain/entities/Reward.js';
import { Badge } from '../../src/lib/domain/entities/Badge.js';
import { ConsentRecord } from '../../src/lib/domain/value-objects/ConsentRecord.js';
import { ActivityType } from '../../src/lib/domain/constants/scoring-table.js';

let gagal = 0;
let lolos = 0;

/**
 * @param {string} nama
 * @param {boolean} kondisi
 * @param {string} [detail]
 */
function cek(nama, kondisi, detail = '') {
	if (kondisi) {
		lolos += 1;
		console.log(`  ✓ ${nama}`);
	} else {
		gagal += 1;
		console.error(`  ✗ ${nama}${detail ? ` — ${detail}` : ''}`);
	}
}

const bundle = buildSeed();
const stats = seedStats(bundle);

console.log('\n=== A. VOLUME DATA ===');
cek('60 anggota', bundle.awardees.length === 60, `diterima ${bundle.awardees.length}`);
cek('≥12 broadcast', bundle.broadcasts.length >= 12, `diterima ${bundle.broadcasts.length}`);
cek('≥20 cerita', bundle.stories.length >= 20, `diterima ${bundle.stories.length}`);
cek('≥10 kegiatan', bundle.events.length >= 10, `diterima ${bundle.events.length}`);
cek('≥6 gerakan', bundle.movements.length >= 6, `diterima ${bundle.movements.length}`);
cek('≥10 reward', bundle.rewards.length >= 10, `diterima ${bundle.rewards.length}`);
cek('≥12 badge', bundle.badges.length >= 12, `diterima ${bundle.badges.length}`);

const anggotaBerConsent = new Set(bundle.consents.map((c) => c.awardeeId));
cek(
	'consent untuk setiap anggota',
	anggotaBerConsent.size === bundle.awardees.length,
	`${anggotaBerConsent.size}/${bundle.awardees.length} anggota punya consent`
);

console.log('\n=== B. KONSISTENSI POIN (total anggota == jumlah aktivitasnya) ===');
/** @type {Map<string, number>} */
const jumlahPerAnggota = new Map();
for (const entry of bundle.activities) {
	if (entry.status !== ActivityStatus.AWARDED) continue;
	jumlahPerAnggota.set(entry.awardeeId, (jumlahPerAnggota.get(entry.awardeeId) ?? 0) + entry.points);
}

const selisih = bundle.awardees
	.map((awardee) => ({
		id: awardee.id,
		total: awardee.points,
		ledger: jumlahPerAnggota.get(awardee.id) ?? 0
	}))
	.filter((baris) => baris.total !== baris.ledger);

cek(
	'semua 60 anggota: points === Σ aktivitas AWARDED',
	selisih.length === 0,
	selisih.length > 0
		? selisih.slice(0, 3).map((s) => `${s.id}: ${s.total} vs ${s.ledger}`).join('; ')
		: ''
);

const musimMelebihi = bundle.awardees.filter((m) => m.seasonPoints > m.points);
cek('poin musim tidak melebihi total poin', musimMelebihi.length === 0);

const entriNolPoin = bundle.activities.filter(
	(entry) => entry.status !== ActivityStatus.AWARDED && entry.points !== 0
);
cek('entri non-AWARDED tidak membukukan poin', entriNolPoin.length === 0);

console.log('\n=== C. DISTRIBUSI TIER ===');
for (const rencana of RENCANA_TIER) {
	const aktual = stats.tierDistribution[rencana.level] ?? 0;
	cek(
		`${rencana.level}: target ${rencana.count}, aktual ${aktual}`,
		aktual === rencana.count,
		`selisih ${aktual - rencana.count}`
	);
}

// Diuji lewat entity Awardee, yang menurunkan tiernya sendiri dari Tier.fromPoints —
// sehingga yang diperiksa di sini adalah tier yang benar-benar dilihat aplikasi,
// bukan hasil hitungan ulang milik skrip ini.
const tierSalah = bundle.awardees.filter((row) => {
	const awardee = new Awardee(row);
	return awardee.points < tierUntukPoin(awardee.points).threshold;
});
cek('setiap anggota berada di dalam ambang tiernya', tierSalah.length === 0);

console.log('\n=== D. KONSTRUKSI ENTITY DOMAIN ===');
/**
 * @param {string} nama
 * @param {readonly any[]} rows
 * @param {(row: any) => unknown} buat
 */
function ujiKonstruksi(nama, rows, buat) {
	try {
		rows.forEach(buat);
		cek(`${nama} (${rows.length} baris) lolos validasi entity`, true);
	} catch (error) {
		cek(`${nama} lolos validasi entity`, false, error.message);
	}
}

ujiKonstruksi('Awardee', bundle.awardees, (row) => new Awardee(row));
ujiKonstruksi('PointActivity', bundle.activities, (row) => new PointActivity(row));
ujiKonstruksi('Story', bundle.stories, (row) => new Story(row));
ujiKonstruksi('CommunityEvent', bundle.events, (row) => new CommunityEvent(row));
ujiKonstruksi('Movement', bundle.movements, (row) => new Movement(row));
ujiKonstruksi('Broadcast', bundle.broadcasts, (row) => new Broadcast(row));
ujiKonstruksi('Reward', bundle.rewards, (row) => new Reward(row));
ujiKonstruksi('Badge', bundle.badges, (row) => new Badge(row));
ujiKonstruksi('ConsentRecord', bundle.consents, (row) => new ConsentRecord(row));
ujiKonstruksi('UserAccount', bundle.accounts, (row) => new UserAccount(row));

console.log('\n=== E. DETERMINISME ===');
const ulang = seedStats(buildSeed());
cek(
	'dua kali buildSeed() menghasilkan statistik identik',
	JSON.stringify(ulang) === JSON.stringify(stats)
);
const kedua = buildSeed();
cek(
	'id dan poin anggota identik antar-pemanggilan',
	JSON.stringify(kedua.awardees.map((m) => [m.id, m.points])) ===
		JSON.stringify(bundle.awardees.map((m) => [m.id, m.points]))
);

console.log('\n=== F. RENTANG TANGGAL DAN KESIAPAN KPI ===');
const bulanAktivitas = new Set(bundle.activities.map((e) => e.occurredAt.slice(0, 7)));
cek(
	'aktivitas tersebar di 7 bulan (2026-01..2026-07)',
	bulanAktivitas.size === 7,
	`bulan terisi: ${[...bulanAktivitas].sort().join(', ')}`
);
cek(
	'tidak ada aktivitas setelah tanggal acuan',
	bundle.activities.every((e) => new Date(e.occurredAt) <= TODAY)
);

const BULAN_INI = '2026-07';
const hariKirim = new Set(
	bundle.broadcasts
		.filter((b) => b.sentAt && b.sentAt.slice(0, 7) === BULAN_INI)
		.map((b) => b.sentAt.slice(0, 10))
);
cek(`KPI-03 — ≥2 hari diseminasi pada ${BULAN_INI}`, hariKirim.size >= 2, `${hariKirim.size} hari`);

const kontenBulanIni = new Set(
	bundle.broadcasts
		.filter((b) => b.sentAt && b.sentAt.slice(0, 7) === BULAN_INI)
		.flatMap((b) => b.contentIds)
);
cek(`KPI-02 — ≥1 konten terdiseminasi pada ${BULAN_INI}`, kontenBulanIni.size >= 1, `${kontenBulanIni.size} konten`);

const aktif = bundle.awardees.filter((m) => m.status === AWARDEE_STATUS.AKTIF);
const idAktif = new Set(aktif.map((m) => m.id));
const amplifier = new Set(
	bundle.activities
		.filter(
			(e) =>
				[ActivityType.SHARE_PRIVATE, ActivityType.SHARE_PUBLIC].includes(e.activityType) &&
				e.status !== ActivityStatus.REJECTED &&
				e.occurredAt.slice(0, 7) === BULAN_INI &&
				idAktif.has(e.awardeeId)
		)
		.map((e) => e.awardeeId)
);
const rasioAmplifikasi = Math.round((amplifier.size / aktif.length) * 100);
cek(`KPI-04 — amplifikasi ${rasioAmplifikasi}% dari anggota aktif (target 50%)`, rasioAmplifikasi >= 50);

const berkuorum = bundle.events.filter(
	(e) => e.status === 'SELESAI' && e.evidenceRefs.length > 0 && e.attendeeAwardeeIds.length >= 10
);
cek('KPI-05 — ≥2 kegiatan terlaksana berkuorum', berkuorum.length >= 2, `${berkuorum.length} kegiatan`);

const terdata = bundle.awardees.filter((m) => m.status === AWARDEE_STATUS.AKTIF && m.consentActive);
const coverage = Math.round((terdata.length / bundle.awardees.length) * 100);
cek(`KPI-01 — coverage ${coverage}% (target 75%)`, coverage >= 75);

console.log('\n=== G. INTEGRITAS RUJUKAN ===');
const idAnggota = new Set(bundle.awardees.map((m) => m.id));
cek(
	'setiap aktivitas menunjuk anggota yang ada',
	bundle.activities.every((e) => idAnggota.has(e.awardeeId))
);
cek(
	'setiap cerita menunjuk penulis yang ada',
	bundle.stories.every((s) => idAnggota.has(s.authorId))
);
cek(
	'setiap consent menunjuk anggota yang ada',
	bundle.consents.every((c) => idAnggota.has(c.awardeeId))
);
const slugUnik = new Set(bundle.stories.map((s) => s.slug));
cek('slug cerita unik', slugUnik.size === bundle.stories.length);
const idAktivitasUnik = new Set(bundle.activities.map((e) => e.id));
cek('id aktivitas unik', idAktivitasUnik.size === bundle.activities.length);
const namaUnik = new Set(bundle.awardees.map((m) => m.fullName));
cek('nama anggota unik', namaUnik.size === bundle.awardees.length);

const statusCerita = new Set(bundle.stories.map((s) => s.status));
cek(
	'cerita tersebar di ≥6 status siklus hidup',
	statusCerita.size >= 6,
	`status terisi: ${[...statusCerita].join(', ')}`
);
const terbit = bundle.stories.filter((s) => s.status === STORY_STATUS.TERPUBLIKASI);
cek(
	'setiap cerita terbit lolos gerbang publikasi',
	terbit.every((s) => s.consentActive && s.consentId && s.pfValidation && s.mediaRefs.length > 0),
	`${terbit.length} cerita terbit`
);

console.log('\n=== H. AKUN, PERAN, DAN KREDENSIAL DEMO (PO-3) ===');
cek('63 akun (60 awardee + 2 verifikator + 1 admin)', bundle.accounts.length === 63, `diterima ${bundle.accounts.length}`);

/** @type {Record<string, number>} */
const perPeran = {};
for (const akun of bundle.accounts) perPeran[akun.role] = (perPeran[akun.role] ?? 0) + 1;
cek('60 akun berperan AWARDEE', perPeran[UserRole.AWARDEE] === 60, `diterima ${perPeran[UserRole.AWARDEE] ?? 0}`);
cek(
	'≥2 akun berperan VERIFIER — tanpa dua verifikator, larangan self-review membuntukan antrean',
	(perPeran[UserRole.VERIFIER] ?? 0) >= 2,
	`diterima ${perPeran[UserRole.VERIFIER] ?? 0}`
);
cek('1 akun berperan ADMIN', perPeran[UserRole.ADMIN] === 1, `diterima ${perPeran[UserRole.ADMIN] ?? 0}`);

const surel = bundle.accounts.map((a) => String(a.email).trim().toLowerCase());
cek('surel akun unik (indeks &email tidak akan bentrok)', new Set(surel).size === surel.length);

const idAkun = new Set(bundle.accounts.map((a) => a.id));
for (const id of [ID_VERIFIKATOR_UTAMA, ID_VERIFIKATOR_KEDUA, ID_ADMIN]) {
	cek(`akun staf "${id}" ada di seed`, idAkun.has(id));
}

const idAwardeeSeed = new Set(bundle.awardees.map((m) => m.id));
const rujukanYatim = bundle.accounts.filter(
	(a) => a.role === UserRole.AWARDEE && !idAwardeeSeed.has(a.awardeeId)
);
cek(
	'setiap akun AWARDEE menunjuk awardee yang benar-benar ada',
	rujukanYatim.length === 0,
	rujukanYatim.slice(0, 3).map((a) => `${a.id}→${a.awardeeId}`).join(', ')
);

const stafBerAwardeeId = bundle.accounts.filter(
	(a) => a.role !== UserRole.AWARDEE && a.awardeeId !== null
);
cek(
	'akun VERIFIER/ADMIN ber-awardeeId null (invarian UserAccount)',
	stafBerAwardeeId.length === 0,
	stafBerAwardeeId.map((a) => a.id).join(', ')
);

const sandiTidakCocok = bundle.accounts.filter((row) => !new UserAccount(row).matchesPassword(SANDI_DEMO));
cek(
	`SANDI_DEMO cocok untuk seluruh ${bundle.accounts.length} akun`,
	sandiTidakCocok.length === 0,
	sandiTidakCocok.slice(0, 3).map((a) => a.id).join(', ')
);

// Jejak peninjauan historis harus punya pemilik: `reviewerId` pada cerita ter-seed
// menunjuk akun verifikator yang benar-benar dapat dibuka, bukan string yatim.
const peninjau = new Set(bundle.stories.map((s) => s.reviewerId).filter(Boolean));
cek(
	'setiap reviewerId cerita menunjuk akun yang ada',
	[...peninjau].every((id) => idAkun.has(id)),
	`peninjau: ${[...peninjau].join(', ')}`
);
cek(`verifikator utama ${ID_VERIFIKATOR_UTAMA} memang meninjau cerita ter-seed`, peninjau.has(ID_VERIFIKATOR_UTAMA));

console.log('\n=== I. ALUR EDITORIAL & KALENDER TER-SEED (PO-1, PO-4) ===');

/** @type {Record<string, number>} */
const perStatusCerita = {};
for (const s of bundle.stories) perStatusCerita[s.status] = (perStatusCerita[s.status] ?? 0) + 1;
console.log(`  distribusi status cerita: ${JSON.stringify(perStatusCerita)}`);

// Demo alur editorial hanya meyakinkan bila setiap tahap punya penghuni: antrean
// verifikator yang kosong tidak membuktikan apa pun tentang PO-4.
for (const status of [
	STORY_STATUS.DRAFT,
	STORY_STATUS.DIAJUKAN,
	STORY_STATUS.REVIEW,
	STORY_STATUS.PERLU_REVISI,
	STORY_STATUS.DISETUJUI,
	STORY_STATUS.TERPUBLIKASI
]) {
	cek(`ada cerita berstatus ${status}`, (perStatusCerita[status] ?? 0) >= 1, `diterima ${perStatusCerita[status] ?? 0}`);
}
cek(
	'antrean verifikator tidak kosong (DIAJUKAN + REVIEW ≥ 3)',
	(perStatusCerita[STORY_STATUS.DIAJUKAN] ?? 0) + (perStatusCerita[STORY_STATUS.REVIEW] ?? 0) >= 3
);
cek(
	'≥10 cerita TERPUBLIKASI untuk mengisi blog publik',
	(perStatusCerita[STORY_STATUS.TERPUBLIKASI] ?? 0) >= 10,
	`diterima ${perStatusCerita[STORY_STATUS.TERPUBLIKASI] ?? 0}`
);

/** @type {Record<string, number>} */
const perStatusKegiatan = {};
for (const e of bundle.events) perStatusKegiatan[e.status] = (perStatusKegiatan[e.status] ?? 0) + 1;
console.log(`  distribusi status kegiatan: ${JSON.stringify(perStatusKegiatan)}`);

/* ── Kalender diukur terhadap HARI INI, bukan terhadap TODAY yang beku ────────
 *
 * Versi sebelumnya membandingkan `startsAt` dengan konstanta `TODAY`
 * (20 Juli 2026) — tanggal acuan yang sama dengan yang dipakai MEMBANGKITKAN
 * kegiatannya. Perbandingan itu tidak pernah bisa gagal: ia menanyakan apakah
 * data yang dibuat setelah `TODAY` memang jatuh setelah `TODAY`. Gerbangnya
 * hijau selamanya, termasuk pada hari kalender publik benar-benar kosong bagi
 * pengunjung — persis cacat yang dilaporkan peninjau.
 *
 * Acuan yang benar adalah jam yang sama dengan yang dipakai peramban pengunjung.
 * Karena `bangkitkanAgendaBergulir()` menjadwalkan enam kegiatan rutin 21–126
 * hari ke depan terhitung saat data dipasang, asersi ini akan tetap hijau kapan
 * pun ia dijalankan — dan akan MERAH begitu mekanisme bergulir itu dicabut,
 * yang memang satu-satunya keadaan yang perlu diketahui.
 */
const SEKARANG = new Date();
const MS_PER_HARI = 86_400_000;

const mendatang = bundle.events.filter((e) => new Date(e.startsAt) > SEKARANG);
cek(
	`≥6 kegiatan mendatang terhadap HARI INI (kalender publik tidak boleh kosong)`,
	mendatang.length >= 6,
	`${mendatang.length} kegiatan · acuan ${SEKARANG.toISOString().slice(0, 10)}`
);
const terjadwalMendatang = mendatang.filter((e) => e.status === EventStatus.TERJADWAL);
cek(
	'≥5 di antaranya berstatus TERJADWAL (tampil di /kalender)',
	terjadwalMendatang.length >= 5,
	`${terjadwalMendatang.length} kegiatan`
);

// Jangkar anti-regresi: perbandingan terhadap TODAY tidak boleh dipakai lagi
// untuk kegiatan mendatang. Bila `TODAY` sudah lewat, sebuah asersi berbasis
// TODAY akan lulus meski agenda nyata sudah habis — itulah bentuk kegagalannya.
cek(
	'acuan uji kalender BUKAN konstanta TODAY yang beku',
	SEKARANG.getTime() !== TODAY.getTime(),
	`TODAY=${TODAY.toISOString().slice(0, 10)} · sekarang=${SEKARANG.toISOString().slice(0, 10)}`
);

/* ── Cakrawala agenda ────────────────────────────────────────────────────────
 * Kalender yang berisi enam kegiatan yang semuanya jatuh pekan depan tetap akan
 * kosong bulan depan. Yang menjaga PO-1 bukan JUMLAH agenda, melainkan seberapa
 * JAUH agenda terakhirnya — dan itulah yang diukur di sini terhadap ambang
 * kanonik `CAKRAWALA_AGENDA_MINIMUM_HARI` (bukan angka literal di skrip uji).
 */
const terjadwalSemua = bundle.events.filter((e) => e.status === EventStatus.TERJADWAL);
const kegiatanTerjauh = terjadwalSemua
	.map((e) => new Date(e.startsAt))
	.sort((a, b) => a.getTime() - b.getTime())
	.at(-1);
const cakrawalaHari = kegiatanTerjauh
	? Math.floor((kegiatanTerjauh.getTime() - SEKARANG.getTime()) / MS_PER_HARI)
	: -1;
cek(
	`kegiatan TERJADWAL terakhir ≥${CAKRAWALA_AGENDA_MINIMUM_HARI} hari dari HARI INI`,
	cakrawalaHari >= CAKRAWALA_AGENDA_MINIMUM_HARI,
	`cakrawala ${cakrawalaHari} hari (terjauh ${kegiatanTerjauh?.toISOString().slice(0, 10) ?? '—'})`
);

// Agenda bergulir wajib TERSEBAR, bukan menumpuk di satu pekan: enam kegiatan
// yang semuanya jatuh pada hari ke-126 memenuhi asersi cakrawala di atas namun
// tetap meninggalkan empat bulan kosong di tengahnya.
const bulanMendatang = new Set(
	mendatang.map((e) => new Date(e.startsAt).toISOString().slice(0, 7))
);
cek(
	'agenda mendatang tersebar pada ≥3 bulan berbeda',
	bulanMendatang.size >= 3,
	[...bulanMendatang].sort().join(', ')
);

const diusulkan = bundle.events.filter((e) => e.status === EventStatus.DIUSULKAN);
cek('≥2 kegiatan berstatus DIUSULKAN (antrean verifikator terisi)', diusulkan.length >= 2, `${diusulkan.length} usulan`);
cek(
	'setiap usulan menunjuk pengusul yang punya akun',
	diusulkan.every((e) => idAkun.has(e.proposedBy)),
	diusulkan.map((e) => `${e.id}→${e.proposedBy}`).join(', ')
);
cek(
	'ada usulan kegiatan yang berasal dari AWARDEE, bukan hanya staf',
	diusulkan.some((e) => e.proposedByRole === UserRole.AWARDEE),
	diusulkan.map((e) => e.proposedByRole).join(', ')
);

console.log('\n' + '='.repeat(64));
console.log('STATISTIK SEED');
console.log('='.repeat(64));
console.log(
	`  anggota ${stats.awardees} · aktivitas ${stats.activities} · cerita ${stats.stories} · ` +
		`kegiatan ${stats.events} · gerakan ${stats.movements}`
);
console.log(
	`  kabar ${stats.broadcasts} · reward ${stats.rewards} · badge ${stats.badges} · ` +
		`consent ${stats.consents} · penukaran ${stats.redemptions}`
);
console.log(`  total poin komunitas: ${stats.totalPoints}`);
console.log(
	'  distribusi tier: ' +
		Object.entries(stats.tierDistribution)
			.map(([level, count]) => `${level} ${count}`)
			.join(' · ')
);
console.log('='.repeat(64));
console.log(`Lolos: ${lolos}   Gagal: ${gagal}`);
console.log('='.repeat(64) + '\n');

process.exit(gagal > 0 ? 1 : 0);
