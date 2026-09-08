/**
 * PEMBANGKIT DATA DEMO PFRIENDS: deterministik.
 *
 * Tanggung jawab: membangkitkan seluruh isi basis data demo dari satu benih tetap,
 * sehingga dua kali menjalankan aplikasi menghasilkan angka yang persis sama.
 *
 * ATURAN PALING PENTING DI BERKAS INI: konsistensi poin.
 * Riwayat `PointActivity` dibangkitkan LEBIH DULU, lalu `points` awardee diisi
 * dengan hasil penjumlahannya. Tidak pernah sebaliknya. Alasannya menentukan
 * kredibilitas seluruh demo: dasbor awardee menampilkan total poin, halaman riwayat
 * menampilkan daftar aksinya, dan keduanya dibaca berdampingan saat presentasi.
 * Bila total dikarang lebih dulu lalu riwayatnya ditambal, selisihnya akan terlihat
 * pada layar pertama yang dibuka pemirsa.
 *
 * Distribusi tier yang mengerucut diperoleh dengan cara yang sama jujurnya: tiap
 * awardee diberi TARGET tier lebih dulu, lalu aksi ditarik satu per satu sampai
 * totalnya jatuh di rentang tier tersebut: dan angka yang dipakai adalah jumlah
 * sebenarnya dari aksi-aksi itu.
 *
 * Seluruh rentang tanggal berada di Januari–Juli 2026 mengikuti timeline Hal 7,
 * dengan tanggal acuan tetap 20 Juli 2026.
 *
 * @see docs/09-BUILD-CONTRACT.md: §6 Aturan seed data
 * @see docs/00-SOURCE-BRIEF.md: Hal 7 Timeline, Hal 11 Skor, Hal 12 Tier
 */

import { ActivityType, aturanSkor, poinUntuk } from '../../domain/constants/scoring-table.js';
import {
	TIER_TABLE,
	TierLevel,
	tierUntukLevel,
	tierUntukPoin
} from '../../domain/constants/tier-table.js';
import {
	CHAPTERS,
	CommunityType,
	AWARDEE_STATUS,
	REWARD_CATEGORY,
	STORY_STATUS,
	STORY_ARCHIVE_REASON
} from '../../domain/constants/community.js';
import { ESG_ACTIVITY_MAP } from '../../domain/constants/esg-taxonomy.js';
import { KPI_PARAMETERS } from '../../domain/constants/kpi-targets.js';
import { ActivityStatus, CapReason } from '../../domain/entities/PointActivity.js';
import { BADGE_RARITY_META, BadgeFamily, BadgeRarity } from '../../domain/entities/Badge.js';
import { BroadcastChannel, BroadcastStatus } from '../../domain/entities/Broadcast.js';
import { EventStatus, EventType } from '../../domain/entities/CommunityEvent.js';
import { MovementCategory, MovementStatus } from '../../domain/entities/Movement.js';
import { kunciBulanKuota, RewardStatus } from '../../domain/entities/Reward.js';
import { SensitivityScan } from '../../domain/entities/Story.js';
import {
	ConsentChannel,
	ConsentStatus,
	ConsentType,
	GrantedVia,
	RevokedVia,
	SCOPE_SEMUA_KONTEN
} from '../../domain/value-objects/ConsentRecord.js';
import { UserRole } from '../../domain/constants/roles.js';
import { RedemptionStatus } from '../repositories/redemption-status.js';
import {
	bangkitkanAkun,
	ID_VERIFIKATOR_KEDUA,
	ID_VERIFIKATOR_UTAMA
} from './accounts.js';
import { chance, intBetween, mulberry32, pick, pickWeighted, sample, SEED, shuffle } from './rng.js';
import {
	BIDANG_USAHA,
	KEAHLIAN,
	KOTA,
	NAMA_BELAKANG,
	NAMA_DEPAN_LAKI,
	NAMA_DEPAN_PEREMPUAN,
	PEKERJAAN_ALUMNI,
	UNIVERSITAS
} from './names.js';

/* ────────────────────────────────────────────────────────────────────────────
 * 1. TANGGAL ACUAN DAN KALENDER SEED
 * ──────────────────────────────────────────────────────────────────────────── */

/** Tanggal acuan tetap seluruh data demo (kontrak §6). */
export const TODAY = new Date('2026-07-20T00:00:00+07:00');

/** Selisih WIB terhadap UTC, dalam jam. */
const WIB_OFFSET = 7;

/** Milidetik dalam satu hari. */
const MS_PER_DAY = 86_400_000;

/** Hari ke-0 kalender seed: 1 Januari 2026. */
const HARI_NOL = Date.UTC(2026, 0, 1, 0 - WIB_OFFSET);

/** Indeks hari untuk 20 Juli 2026: batas atas seluruh peristiwa yang sudah lewat. */
const HARI_INI = Math.round((TODAY.getTime() - HARI_NOL) / MS_PER_DAY);

/** Indeks hari 1 Mei 2026, awal musim gamifikasi berjalan. */
const HARI_AWAL_MUSIM = 120;

/** Indeks hari 1 Juli 2026: bulan berjalan pada dasbor KPI. */
const HARI_AWAL_BULAN_INI = 181;

/** Jam paling pagi sebuah aktivitas dicatat (WIB). */
const JAM_MULAI = 8;

/** Jam paling malam sebuah aktivitas dicatat (WIB). */
const JAM_SELESAI = 20;

/**
 * Tanggal dari indeks hari dan jam WIB.
 *
 * Jam sengaja dibatasi 08.00–20.00 WIB (01.00–13.00 UTC) supaya komponen tanggal
 * lokal dan UTC selalu jatuh pada hari kalender yang sama. Tanpa batas itu, entri
 * yang dibuat menjelang tengah malam akan berpindah bulan ketika peramban pemirsa
 * memakai zona waktu berbeda: dan chart tren bulanan ikut bergeser.
 *
 * @param {number} dayIndex Indeks hari sejak 1 Januari 2026.
 * @param {number} hour Jam WIB, 8..20.
 * @param {number} [minute]
 * @returns {Date}
 */
function tanggal(dayIndex, hour, minute = 0) {
	return new Date(HARI_NOL + dayIndex * MS_PER_DAY + (hour * 60 + minute) * 60_000);
}

/**
 * Indeks hari acak yang condong ke waktu yang lebih baru.
 *
 * Kondisi awal komunitas memang begitu: Hal 7 menempatkan onboarding di Mei dan
 * gamifikasi di Juni–Juli, sehingga sebaran rata sepanjang tujuh bulan justru akan
 * memberi gambaran yang keliru tentang kapan aktivitas benar-benar ramai.
 *
 * @param {import('./rng.js').Rng} rng
 * @param {number} minDay
 * @param {number} maxDay
 * @returns {number}
 */
function hariCondongBaru(rng, minDay, maxDay) {
	if (maxDay <= minDay) return minDay;
	const rentang = maxDay - minDay;
	return minDay + Math.floor(Math.pow(rng(), 0.62) * rentang);
}

/**
 * Jam acak dalam rentang jam aktivitas.
 * @param {import('./rng.js').Rng} rng
 * @returns {{hour: number, minute: number}}
 */
function jamAcak(rng) {
	return { hour: intBetween(rng, JAM_MULAI, JAM_SELESAI), minute: intBetween(rng, 0, 11) * 5 };
}

/**
 * Indeks hari kalender seed untuk sebuah waktu nyata.
 *
 * Kalender seed berpangkal pada 1 Januari 2026 dan indeksnya boleh melewati 365 :
 * `tanggal()` hanya menjumlahkan hari, sehingga 2027 dan seterusnya terbentuk
 * dengan sendirinya. Itulah yang membuat agenda bergulir dapat memakai mesin
 * tanggal yang sama persis dengan seluruh data historis.
 *
 * @param {Date} pada
 * @returns {number} Indeks hari sejak 1 Januari 2026 menurut WIB.
 */
function indeksHari(pada) {
	return Math.floor((pada.getTime() - HARI_NOL) / MS_PER_DAY);
}

/**
 * Cakrawala agenda minimum: kalender publik WAJIB memuat kegiatan terjadwal sejauh
 * ini ke depan, terhitung dari saat data demo dipasang.
 *
 * Angka ini adalah kontrak, bukan preferensi. Kalender publik yang kosong berarti
 * PO-1 berhenti terpenuhi: dan cara ia berhenti adalah yang paling berbahaya:
 * tanpa satu pun galat, tanpa satu pun gerbang berubah warna, pada hari yang tidak
 * ada dalam kalender siapa pun.
 *
 * @type {number}
 */
export const CAKRAWALA_AGENDA_MINIMUM_HARI = 90;

/* ────────────────────────────────────────────────────────────────────────────
 * 2. RENCANA DISTRIBUSI TIER
 * ──────────────────────────────────────────────────────────────────────────── */

/** Jumlah awardee yang dibangkitkan (kontrak §6). */
export const JUMLAH_AWARDEE = 60;

/**
 * Rentang poin tiap tier, DITURUNKAN dari `TIER_TABLE`: bukan ditulis ulang.
 * Batas atas sebuah tier adalah ambang tier berikutnya dikurangi satu; tier
 * tertinggi memakai dua kali ambangnya sendiri sebagai langit-langit yang wajar
 * agar Champion tetap terlihat menonjol tanpa menjadi angka yang mustahil.
 * @returns {Map<string, {min: number, max: number}>}
 */
function rentangTier() {
	/** @type {Map<string, {min: number, max: number}>} */
	const rentang = new Map();
	TIER_TABLE.forEach((entry, index) => {
		const berikutnya = TIER_TABLE[index + 1];
		rentang.set(entry.level, {
			min: entry.threshold,
			max: berikutnya ? berikutnya.threshold - 1 : entry.threshold * 2
		});
	});
	return rentang;
}

/**
 * Target jumlah awardee per tier (kontrak §6: ±22 / 16 / 12 / 7 / 3).
 * @type {readonly {level: string, count: number}[]}
 */
export const RENCANA_TIER = Object.freeze([
	Object.freeze({ level: TierLevel.NEWCOMER, count: 22 }),
	Object.freeze({ level: TierLevel.ACTIVE_MEMBER, count: 16 }),
	Object.freeze({ level: TierLevel.CONTRIBUTOR, count: 12 }),
	Object.freeze({ level: TierLevel.FEATURED_CANDIDATE, count: 7 }),
	Object.freeze({ level: TierLevel.CHAMPION, count: 3 })
]);

/**
 * Bobot pemilihan jenis aksi per tier.
 *
 * Awardee bertier tinggi bukan awardee yang menekan tombol lebih banyak, melainkan
 * yang melakukan hal yang lebih berat: memimpin aksi, menjadi mentor, mengisi sesi.
 * Bobot inilah yang mewujudkan pesan Hal 11: *points should reward meaningful
 * contribution, not spammy activity*: pada data demo. Tanpa pembedaan ini seorang
 * Champion akan tampak sebagai orang yang membuka 300 kabar mingguan.
 *
 * @type {Readonly<Record<string, readonly {item: string, weight: number}[]>>}
 */
const BOBOT_AKSI_PER_TIER = Object.freeze({
	[TierLevel.NEWCOMER]: Object.freeze([
		{ item: ActivityType.BROADCAST_VIEW, weight: 34 },
		{ item: ActivityType.CTA_REACT, weight: 24 },
		{ item: ActivityType.SHARE_PRIVATE, weight: 10 },
		{ item: ActivityType.SHARE_PUBLIC, weight: 4 },
		{ item: ActivityType.STORY_SUBMIT, weight: 2 },
		{ item: ActivityType.SESSION_ATTEND, weight: 3 },
		{ item: ActivityType.KNOWLEDGE_QA, weight: 2 }
	]),
	[TierLevel.ACTIVE_MEMBER]: Object.freeze([
		{ item: ActivityType.BROADCAST_VIEW, weight: 26 },
		{ item: ActivityType.CTA_REACT, weight: 20 },
		{ item: ActivityType.SHARE_PRIVATE, weight: 16 },
		{ item: ActivityType.SHARE_PUBLIC, weight: 9 },
		{ item: ActivityType.STORY_SUBMIT, weight: 4 },
		{ item: ActivityType.SESSION_ATTEND, weight: 8 },
		{ item: ActivityType.KNOWLEDGE_QA, weight: 5 }
	]),
	[TierLevel.CONTRIBUTOR]: Object.freeze([
		{ item: ActivityType.BROADCAST_VIEW, weight: 20 },
		{ item: ActivityType.CTA_REACT, weight: 16 },
		{ item: ActivityType.SHARE_PRIVATE, weight: 17 },
		{ item: ActivityType.SHARE_PUBLIC, weight: 12 },
		{ item: ActivityType.STORY_SUBMIT, weight: 6 },
		{ item: ActivityType.SESSION_ATTEND, weight: 12 },
		{ item: ActivityType.KNOWLEDGE_QA, weight: 9 },
		{ item: ActivityType.SPEAKER_MENTOR, weight: 3 }
	]),
	[TierLevel.FEATURED_CANDIDATE]: Object.freeze([
		{ item: ActivityType.BROADCAST_VIEW, weight: 14 },
		{ item: ActivityType.CTA_REACT, weight: 12 },
		{ item: ActivityType.SHARE_PRIVATE, weight: 15 },
		{ item: ActivityType.SHARE_PUBLIC, weight: 14 },
		{ item: ActivityType.STORY_SUBMIT, weight: 8 },
		{ item: ActivityType.SESSION_ATTEND, weight: 14 },
		{ item: ActivityType.KNOWLEDGE_QA, weight: 11 },
		{ item: ActivityType.SPEAKER_MENTOR, weight: 7 },
		{ item: ActivityType.LEAD_ACTION, weight: 4 }
	]),
	[TierLevel.CHAMPION]: Object.freeze([
		{ item: ActivityType.BROADCAST_VIEW, weight: 10 },
		{ item: ActivityType.CTA_REACT, weight: 9 },
		{ item: ActivityType.SHARE_PRIVATE, weight: 13 },
		{ item: ActivityType.SHARE_PUBLIC, weight: 14 },
		{ item: ActivityType.STORY_SUBMIT, weight: 9 },
		{ item: ActivityType.SESSION_ATTEND, weight: 15 },
		{ item: ActivityType.KNOWLEDGE_QA, weight: 13 },
		{ item: ActivityType.SPEAKER_MENTOR, weight: 10 },
		{ item: ActivityType.LEAD_ACTION, weight: 7 }
	])
});

/* ────────────────────────────────────────────────────────────────────────────
 * 3. AWARDEE
 * ──────────────────────────────────────────────────────────────────────────── */

/** Jumlah awardee komunitas Sobat Bumi (kontrak §6: SOBI ±40). */
const JUMLAH_SOBI = 40;

/**
 * Status keanggotaan selain AKTIF, beserta jumlahnya. Seluruhnya hanya diberikan
 * kepada awardee bertier Newcomer: akun yang belum terverifikasi atau sedang
 * ditangguhkan tidak masuk akal memiliki ratusan poin kontribusi.
 * @type {readonly {status: string, count: number}[]}
 */
const STATUS_NON_AKTIF = Object.freeze([
	{ status: AWARDEE_STATUS.MENUNGGU_VERIFIKASI, count: 2 },
	{ status: AWARDEE_STATUS.DORMAN, count: 3 },
	{ status: AWARDEE_STATUS.PERLU_KLARIFIKASI, count: 1 },
	{ status: AWARDEE_STATUS.DITANGGUHKAN, count: 1 },
	{ status: AWARDEE_STATUS.NONAKTIF, count: 1 }
]);

/**
 * Menyusun daftar tier target untuk 60 awardee, lalu mengacaknya agar urutan id
 * tidak berkorelasi dengan tier: papan peringkat yang isinya persis berurutan
 * dengan nomor awardee langsung terbaca sebagai data buatan.
 * @param {import('./rng.js').Rng} rng
 * @returns {string[]}
 */
function daftarTierTarget(rng) {
	/** @type {string[]} */
	const daftar = [];
	for (const rencana of RENCANA_TIER) {
		for (let i = 0; i < rencana.count; i++) daftar.push(rencana.level);
	}
	return shuffle(rng, daftar);
}

/**
 * Membangkitkan 60 profil awardee sebagai objek polos.
 *
 * Entity `Awardee` sengaja belum dikonstruksi di sini: poin, koin, badge, dan
 * streak baru diketahui setelah riwayat aktivitas dibangkitkan. Membangun entity
 * dua kali: sekali kosong lalu sekali penuh: hanya menyisakan peluang keduanya
 * lepas sinkron.
 *
 * @param {import('./rng.js').Rng} rng
 * @returns {Record<string, any>[]}
 */
function bangkitkanProfilAwardee(rng) {
	const tierTarget = daftarTierTarget(rng);
	const namaTerpakai = new Set();

	/** @type {string[]} */
	const antreanStatus = [];
	for (const { status, count } of STATUS_NON_AKTIF) {
		for (let i = 0; i < count; i++) antreanStatus.push(status);
	}

	return Array.from({ length: JUMLAH_AWARDEE }, (_, index) => {
		const urut = index + 1;
		const community = index < JUMLAH_SOBI ? CommunityType.SOBI : CommunityType.WOMENPRENEUR;
		const isWomenpreneur = community === CommunityType.WOMENPRENEUR;
		const plannedTier = tierTarget[index];

		// Womenpreneur seluruhnya perempuan; SOBI campur.
		const daftarDepan =
			isWomenpreneur || chance(rng, 0.5) ? NAMA_DEPAN_PEREMPUAN : NAMA_DEPAN_LAKI;
		let fullName = '';
		do {
			fullName = `${pick(rng, daftarDepan)} ${pick(rng, NAMA_BELAKANG)}`;
		} while (namaTerpakai.has(fullName));
		namaTerpakai.add(fullName);

		const chapterId = pick(rng, CHAPTERS).id;
		const kampus = pick(rng, UNIVERSITAS);
		const kota = pick(rng, KOTA);
		const bidang = pick(rng, BIDANG_USAHA);

		// Awardee bertier tinggi bergabung lebih awal: tier adalah hasil waktu dan
		// kontribusi, bukan sesuatu yang muncul dalam sepekan.
		const rankTier = tierUntukLevel(plannedTier).rank;
		const batasGabung = Math.max(10, 96 - rankTier * 22);
		const joinDay = intBetween(rng, Math.max(0, batasGabung - 60), batasGabung);
		const jam = jamAcak(rng);

		const status =
			plannedTier === TierLevel.NEWCOMER && antreanStatus.length > 0 && chance(rng, 0.45)
				? /** @type {string} */ (antreanStatus.pop())
				: AWARDEE_STATUS.AKTIF;

		const businessProfile = isWomenpreneur
			? {
					businessName: pick(rng, bidang.contohNama),
					sector: bidang.sektor,
					city: kota.kota,
					employees: intBetween(rng, 2, 14),
					growthPercent: intBetween(rng, 8, 65)
				}
			: null;

		return {
			id: `AWD-${String(urut).padStart(3, '0')}`,
			seq: urut,
			plannedTier,
			joinDay,
			fullName,
			email: `${fullName.toLowerCase().replace(/\s+/g, '.')}@pfriends.id`,
			whatsapp: `+62812${String(3000000 + urut * 7331).slice(0, 7)}`,
			community,
			chapterId,
			status,
			university: isWomenpreneur ? '' : kampus.nama,
			city: kota.kota,
			provinsi: kota.provinsi,
			graduationYear: intBetween(rng, 2018, 2025),
			occupation: isWomenpreneur
				? `Pemilik ${businessProfile?.businessName}`
				: pick(rng, PEKERJAAN_ALUMNI),
			skills: sample(rng, KEAHLIAN, intBetween(rng, 2, 4)),
			openToMentoring: rankTier >= 2 ? chance(rng, 0.78) : chance(rng, 0.3),
			anonymousOnLeaderboard: chance(rng, 0.07),
			businessProfile,
			joinedAt: tanggal(joinDay, jam.hour, jam.minute),
			satuanUsaha: bidang.satuan
		};
	});
}

/**
 * Perkenalan singkat untuk direktori alumni.
 *
 * Disusun dari data yang memang dimiliki awardee: kampus, kota, pekerjaan, usaha,
 * keahlian: supaya tidak ada kalimat yang mengklaim hal yang tidak tercatat di
 * mana pun. Bio yang mengarang pencapaian akan berbenturan dengan angka pada
 * kartu yang sama.
 *
 * @param {Record<string, any>} profil
 * @returns {string}
 */
function susunBio(profil) {
	const keahlian = profil.skills.slice(0, 2).join(' dan ').toLowerCase();
	if (profil.community === CommunityType.WOMENPRENEUR) {
		const usaha = profil.businessProfile;
		return (
			`Pemilik ${usaha.businessName}, usaha ${usaha.sector.toLowerCase()} di ${usaha.city} ` +
			`dengan ${usaha.employees} tenaga kerja. Bergabung di PFpreneur sejak ${profil.graduationYear} ` +
			`dan kini terbuka untuk berbagi pengalaman soal ${keahlian}.`
		);
	}
	return (
		`Alumni ${profil.university} angkatan ${profil.graduationYear}, kini ${profil.occupation.toLowerCase()} ` +
		`dan berdomisili di ${profil.city}. Senang membantu sesama anggota Pfriends di bidang ${keahlian}.`
	);
}

/* ────────────────────────────────────────────────────────────────────────────
 * 4. KABAR PFRIENDS (BROADCAST)
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Naskah kabar komunitas sepanjang Januari–Juli 2026, mengikuti milestone Hal 7.
 *
 * `contentId` dipisahkan dari id kabar dengan sengaja: KPI-02 menghitung ASET
 * KONTEN sedangkan KPI-03 menghitung PERISTIWA PENGIRIMAN. Satu materi yang
 * dikirim ulang ke kanal berbeda menambah frekuensi diseminasi tetapi tidak
 * menambah volume konten: dan itu hanya dapat dibedakan bila keduanya memang
 * disimpan sebagai dua hal.
 *
 * @type {readonly Record<string, any>[]}
 */
const NASKAH_KABAR = Object.freeze([
	{
		day: 12, contentId: 'KNT-2026-01-A', channel: BroadcastChannel.WA_KOMUNITAS,
		title: 'Pfriends Dibuka: Rumah Baru bagi Alumni Sobat Bumi dan Womenpreneur',
		summary: 'Corporate Secretary Pertamina Foundation membuka kanal komunitas yang menyatukan alumni beasiswa dan UMKM binaan PFpreneur dalam satu ekosistem.',
		body: 'Selama ini alumni Beasiswa Sobat Bumi dan pelaku usaha binaan PFpreneur berjalan di jalur yang terpisah. Padahal keduanya saling membutuhkan: alumni punya keahlian riset pasar dan digital, sementara womenpreneur punya usaha nyata yang siap tumbuh. Pfriends dibangun untuk mempertemukan keduanya di satu tempat.\n\nTahap pertama tahun ini adalah pengumpulan dan validasi database penerima manfaat. Bila Anda menerima kabar ini, nama Anda sudah tercatat pada registry Pertamina Foundation. Mohon periksa kembali data diri Anda dan sampaikan koreksi bila ada yang perlu diperbarui.',
		lightCta: 'Balas pesan ini bila data Anda perlu dikoreksi.',
		ctaLink: 'https://pertaminafoundation.org/pfriends'
	},
	{
		day: 26, contentId: 'KNT-2026-01-B', channel: BroadcastChannel.WA_KOMUNITAS,
		title: 'Validasi Penerima Manfaat Tahap Pertama Selesai',
		summary: 'Sebanyak tiga chapter angkatan telah selesai divalidasi dan siap masuk ke tahap pembentukan grup komunitas.',
		body: 'Proses pencocokan data dengan registry PFprestasi dan PFpreneur untuk chapter PF 10, PF 11, dan PF 12 telah rampung. Data yang divalidasi meliputi nama, angkatan, kampus atau nama usaha, serta kontak yang masih aktif.\n\nAnggota yang datanya belum lengkap akan dihubungi terpisah oleh penanggung jawab chapter masing-masing. Tidak ada data yang dipublikasikan pada tahap ini: seluruh proses masih berada di lingkup internal Pertamina Foundation.',
		lightCta: 'Konfirmasi chapter Anda kepada penanggung jawab angkatan.',
		ctaLink: 'https://pertaminafoundation.org/pfriends/validasi'
	},
	{
		day: 40, contentId: 'KNT-2026-02-A', channel: BroadcastChannel.WA_KOMUNITAS,
		title: 'Survei Kebutuhan Anggota: Apa yang Paling Anda Butuhkan dari Komunitas?',
		summary: 'Survei singkat tujuh pertanyaan untuk menentukan prioritas program upskilling dan mentoring sepanjang 2026.',
		body: 'Kami tidak ingin menyusun kalender kegiatan berdasarkan tebakan. Survei ini menanyakan tiga hal pokok: keterampilan apa yang paling ingin Anda pelajari, kendala terbesar yang sedang Anda hadapi, dan bentuk pertemuan seperti apa yang paling mungkin Anda ikuti.\n\nHasil survei akan dibuka kembali kepada komunitas dalam bentuk ringkasan agregat, tanpa menyebut identitas responden.',
		lightCta: 'Isi survei: kurang dari empat menit.',
		ctaLink: 'https://pertaminafoundation.org/pfriends/survei-kebutuhan'
	},
	{
		day: 53, contentId: 'KNT-2026-02-B', channel: BroadcastChannel.EMAIL,
		title: 'Konsep Community Building Dibahas Bersama Fungsi IT dan Tim Corsec',
		summary: 'Rancangan microsite Pfriends memasuki pembahasan teknis, termasuk mekanisme perlindungan data anggota.',
		body: 'Pertemuan lintas fungsi membahas tiga hal: bentuk microsite sebagai rumah komunitas, mekanisme penyebaran informasi yang terlacak, dan rancangan gamifikasi kontribusi.\n\nSatu keputusan penting yang diambil adalah bahwa setiap publikasi yang memuat nama, foto, atau cerita anggota harus berdasar persetujuan tertulis yang dapat dicabut kapan saja. Persetujuan itu akan diminta secara terpisah, bukan diselipkan pada formulir pendaftaran.',
		lightCta: 'Sampaikan masukan Anda soal perlindungan data.',
		ctaLink: 'https://pertaminafoundation.org/pfriends/konsep'
	},
	{
		day: 68, contentId: 'KNT-2026-03-A', channel: BroadcastChannel.SEMUA,
		title: 'Pfriends Home Kini Dapat Diakses dari pertaminafoundation.org',
		summary: 'Pintu masuk komunitas resmi tersedia di halaman muka situs Pertamina Foundation.',
		body: 'Mulai hari ini Anda dapat masuk ke Pfriends langsung dari situs Pertamina Foundation tanpa perlu mencari tautan di grup percakapan. Pintu masuk berada di bagian atas halaman muka.\n\nDi dalamnya Anda akan menemukan kalender kegiatan, kabar komunitas, dan ruang cerita. Beberapa bagian masih dalam penyempurnaan dan akan bertambah bertahap sampai Juli.',
		lightCta: 'Buka Pfriends dan periksa profil Anda.',
		ctaLink: 'https://pertaminafoundation.org/pfriends'
	},
	{
		day: 79, contentId: 'KNT-2026-03-B', channel: BroadcastChannel.WA_KOMUNITAS,
		title: 'Sosialisasi Pfriends ke Chapter PF 10, PF 11, dan PF 12',
		summary: 'Tiga sesi pengenalan daring digelar per chapter agar penjelasan dapat disesuaikan dengan kebutuhan tiap angkatan.',
		body: 'Sesi pengenalan digelar terpisah untuk setiap chapter. Alasannya sederhana: kebutuhan angkatan PF 10 yang sebagian besar sudah mapan berkarier berbeda dari PF 12 yang baru menyelesaikan program.\n\nMateri yang dibahas mencakup cara kerja komunitas, apa yang bisa Anda dapatkan, dan apa yang diharapkan dari keanggotaan. Rekaman sesi tersedia bagi yang berhalangan hadir.',
		lightCta: 'Tandai kehadiran Anda pada sesi chapter.',
		ctaLink: 'https://pertaminafoundation.org/pfriends/sosialisasi'
	},
	{
		day: 96, contentId: 'KNT-2026-04-A', channel: BroadcastChannel.WA_KOMUNITAS,
		title: 'WA Komunitas Dibuka Bertahap per Chapter',
		summary: 'Grup percakapan induk dan grup batch mulai diaktifkan, dimulai dari chapter PF 10.',
		body: 'Pembukaan dilakukan bertahap supaya penanggung jawab tiap chapter sempat mendampingi anggota baru satu per satu. Grup induk berisi kabar resmi Pertamina Foundation, sedangkan grup batch dipakai untuk percakapan sehari-hari.\n\nKami meminta satu hal: gunakan grup batch untuk berdiskusi, dan biarkan grup induk tetap ringkas agar kabar penting tidak tenggelam.',
		lightCta: 'Bergabunglah ke grup chapter Anda.',
		ctaLink: 'https://pertaminafoundation.org/pfriends/wag'
	},
	{
		day: 110, contentId: 'KNT-2026-04-B', channel: BroadcastChannel.SEMUA,
		title: 'Cerita Perdana dari Womenpreneur: Tenun Ikat Sumba Naik Kelas',
		summary: 'Satu usaha tenun binaan PFpreneur berbagi bagaimana perbaikan foto produk mengubah cara pembeli menilai kainnya.',
		body: 'Cerita pertama yang tayang di ruang cerita Pfriends datang dari usaha tenun ikat di Nusa Tenggara Timur. Isinya bukan kisah keberhasilan yang mulus, melainkan catatan jujur tentang kesalahan yang selama ini membuat kain bagus terlihat biasa saja pada layar ponsel pembeli.\n\nBila Anda punya pengalaman serupa, ruang cerita terbuka untuk siapa pun. Setiap cerita ditinjau lebih dulu dan hanya tayang setelah penulisnya menyetujui publikasi.',
		lightCta: 'Baca ceritanya dan bagikan bila bermanfaat.',
		ctaLink: 'https://pertaminafoundation.org/pfriends/cerita'
	},
	{
		day: 124, contentId: 'KNT-2026-05-A', channel: BroadcastChannel.SEMUA,
		title: 'Onboarding Microsite Dimulai: Cara Menautkan Akun Anda',
		summary: 'Anggota yang sudah tervalidasi dapat mulai melengkapi profil dan mengatur persetujuan data masing-masing.',
		body: 'Proses penautan akun hanya memerlukan tiga langkah: verifikasi nomor yang terdaftar, pelengkapan profil, dan pengaturan persetujuan data. Langkah ketiga adalah yang paling penting dan tidak kami lewati begitu saja.\n\nAnda memilih sendiri apa yang boleh dipublikasikan: nama, foto, cerita, atau data usaha. Semuanya dimatikan secara bawaan dan dapat dicabut kapan saja tanpa perlu memberi alasan.',
		lightCta: 'Lengkapi profil dan atur persetujuan Anda.',
		ctaLink: 'https://pertaminafoundation.org/pfriends/onboarding'
	},
	{
		day: 138, contentId: 'KNT-2026-05-B', channel: BroadcastChannel.WA_KOMUNITAS,
		title: 'Kalender Kegiatan Mei–Juli Sudah Terbit',
		summary: 'Sembilan kegiatan upskilling dan sharing session dijadwalkan, disusun dari hasil survei kebutuhan Februari.',
		body: 'Kalender kali ini disusun langsung dari tiga kebutuhan teratas hasil survei: pemasaran digital, pencatatan keuangan usaha, dan perhitungan harga pokok produksi. Tiga topik itu mendapat porsi terbesar.\n\nSeluruh sesi digelar daring pada malam hari agar dapat diikuti anggota yang bekerja maupun yang mengurus usaha di siang hari. Rekaman disediakan untuk semua sesi.',
		lightCta: 'Simpan tanggalnya dan daftar sesi yang Anda butuhkan.',
		ctaLink: 'https://pertaminafoundation.org/pfriends/kalender'
	},
	{
		day: 152, contentId: 'KNT-2026-06-A', channel: BroadcastChannel.SEMUA,
		title: 'Gamifikasi Pfriends Aktif: Begini Poin Kontribusi Dihitung',
		summary: 'Sembilan jenis aksi kini bernilai poin, dari membaca kabar mingguan sampai memimpin aksi lapangan.',
		body: 'Poin Kontribusi bukan alat lomba. Ia dipakai untuk satu hal: mengenali siapa saja yang selama ini menggerakkan komunitas tanpa pernah diminta. Tabel poinnya terbuka dan dapat Anda periksa sendiri di pusat aksi.\n\nAksi yang bernilai besar adalah yang memang berat dan berdampak: memimpin aksi lapangan, menjadi mentor, mengisi sesi. Membaca kabar tetap dihargai, tetapi tidak akan pernah bisa dikumpulkan menjadi tumpukan poin: setiap kabar hanya dihitung satu kali seumur hidup.',
		lightCta: 'Buka pusat aksi dan lihat tabel poinnya.',
		ctaLink: 'https://pertaminafoundation.org/pfriends/aksi'
	},
	{
		day: 160, contentId: 'KNT-2026-06-B', channel: BroadcastChannel.WA_KOMUNITAS,
		title: 'Kelas Upskilling Juni: Fotografi Produk dengan Ponsel',
		summary: 'Kelas praktik dua jam khusus untuk pelaku usaha binaan, dipandu alumni yang bekerja di bidang desain produk.',
		body: 'Kelas ini tidak membahas kamera mahal. Seluruh materi memakai ponsel yang sudah Anda punya, cahaya matahari, dan kertas putih seharga beberapa ribu rupiah.\n\nPeserta diminta membawa satu produk untuk difoto langsung selama sesi, lalu hasilnya dibahas bersama. Yang dibahas bukan hanya cara memotret, tetapi juga kesalahan yang paling sering membuat calon pembeli mengurungkan niat.',
		lightCta: 'Daftar kelas: kuota tiga puluh peserta.',
		ctaLink: 'https://pertaminafoundation.org/pfriends/kelas-foto'
	},
	{
		day: 171, contentId: 'KNT-2026-06-C', channel: BroadcastChannel.SEMUA,
		title: 'Gerakan Bersama Juni: Pengurangan Sampah di Lima Kota',
		summary: 'Anggota di lima kota menjalankan aksi pemilahan sampah serentak bersama warga sekitar.',
		body: 'Gerakan ini berangkat dari usulan anggota chapter PF 11 yang sudah lebih dulu mendampingi bank sampah di lingkungannya. Bentuknya sederhana dan dapat ditiru: pemilahan di sumber, pencatatan berat, dan penyaluran ke pengolah terdekat.\n\nYang kami minta bukan aksi besar sekali jalan, melainkan aksi kecil yang benar-benar berlanjut. Setiap tim melaporkan berat sampah terkumpul dan foto pelaksanaannya sebagai bukti.',
		lightCta: 'Ikut gerakan atau usulkan aksi di kota Anda.',
		ctaLink: 'https://pertaminafoundation.org/pfriends/gerakan'
	},
	{
		day: 184, contentId: 'KNT-2026-07-A', channel: BroadcastChannel.SEMUA,
		title: 'Agenda Juli: Profil Anggota Masuk Kanal Pertamina Foundation',
		summary: 'Cerita dan profil anggota terpilih mulai diangkat ke situs dan media sosial Pertamina Foundation.',
		body: 'Bulan ini Pertamina Foundation mulai mengangkat profil anggota komunitas ke kanal resminya. Yang diangkat bukan yang poinnya paling tinggi, melainkan yang ceritanya paling layak dibagikan dan sudah memenuhi seluruh syarat publikasi.\n\nSyaratnya lima dan berlaku tanpa kecuali: kontribusi yang memadai, cerita yang sudah diverifikasi, persetujuan yang masih aktif, validasi Pertamina Foundation, dan tidak ada data sensitif di dalamnya. Bila satu saja tidak terpenuhi, publikasi ditunda.',
		lightCta: 'Periksa kesiapan profil Anda di halaman penghargaan.',
		ctaLink: 'https://pertaminafoundation.org/pfriends/profil'
	},
	{
		day: 191, contentId: 'KNT-2026-07-B', channel: BroadcastChannel.WA_KOMUNITAS,
		title: 'Halaman Pencapaian Musim Pertama dan Cara Membacanya',
		summary: 'Capaian kini ditampilkan sebagai perjalanan pribadi: jenjang, lencana, dan jarak menuju jenjang berikutnya.',
		body: 'Membandingkan diri dengan daftar panjang berisi nama orang lain membuat anggota baru selalu berada di dasar tanpa harapan mengejar. Karena itu yang Anda lihat bukan peringkat antar-anggota, melainkan perjalanan Anda sendiri: jenjang saat ini, lencana yang sudah diraih, dan berapa lagi yang dibutuhkan untuk naik.\n\nKontribusi anggota yang memilih tampil anonim tetap dihitung penuh; hanya namanya yang diganti inisial pada tampilan agregat. Pilihan itu ada di pengaturan profil dan dapat diubah kapan saja.',
		lightCta: 'Lihat perjalanan pencapaian Anda.',
		ctaLink: 'https://pertaminafoundation.org/pffriends/pencapaian'
	},
	{
		day: 198, contentId: 'KNT-2026-07-C', channel: BroadcastChannel.SEMUA,
		title: 'Mentoring Lintas Komunitas Batch 2 Dibuka',
		summary: 'Alumni Sobat Bumi dan pelaku usaha binaan dipasangkan berdasarkan kebutuhan, bukan urutan pendaftaran.',
		body: 'Batch pertama mempertemukan dua puluh pasangan mentor dan mentee selama delapan minggu. Yang paling banyak dibahas ternyata bukan strategi besar, melainkan hal-hal mendasar: menghitung harga pokok, memisahkan uang usaha dari uang rumah tangga, dan membaca data penjualan sendiri.\n\nBatch kedua dibuka dengan mekanisme yang sama. Mentor mengisi keahlian yang ditawarkan, mentee mengisi kendala yang dihadapi, lalu pasangan disusun berdasarkan kecocokan keduanya.',
		lightCta: 'Daftar sebagai mentor atau mentee.',
		ctaLink: 'https://pertaminafoundation.org/pfriends/mentoring'
	},
	{
		day: 205, contentId: 'KNT-2026-08-A', channel: BroadcastChannel.SEMUA,
		status: BroadcastStatus.TERJADWAL,
		title: 'Pengumuman Champion Musim Pertama',
		summary: 'Anggota yang mencapai tier tertinggi pada musim pertama akan diumumkan beserta rekam kontribusinya.',
		body: 'Pengumuman akan memuat rekam kontribusi masing-masing, bukan sekadar angka total. Yang ingin kami tunjukkan adalah bentuk kontribusinya: berapa sesi yang diisi, berapa aksi yang dipimpin, berapa anggota yang didampingi.\n\nSeluruh nama yang diumumkan sudah memberikan persetujuan publikasi lebih dulu.',
		lightCta: 'Nantikan pengumumannya pekan depan.',
		ctaLink: 'https://pertaminafoundation.org/pfriends/champion'
	},
	{
		day: 210, contentId: 'KNT-2026-08-B', channel: BroadcastChannel.MICROSITE,
		status: BroadcastStatus.DRAF,
		title: 'Rencana Diseminasi Agustus: Fokus Energi Bersih',
		summary: 'Rangkaian konten Agustus akan berfokus pada literasi energi bersih menjelang peringatan Hari Lingkungan Hidup.',
		body: 'Naskah masih disusun bersama tim komunikasi Pertamina Foundation. Rencananya rangkaian ini memuat tiga materi: penjelasan dasar transisi energi, contoh penerapan skala rumah tangga, dan wawancara dengan alumni yang bekerja di sektor energi terbarukan.\n\nMasukan dari anggota komunitas masih dibuka sampai akhir Juli.',
		lightCta: 'Usulkan topik yang ingin Anda baca.',
		ctaLink: 'https://pertaminafoundation.org/pfriends/usulan'
	}
]);

/* ────────────────────────────────────────────────────────────────────────────
 * 5. KALENDER KOMUNITAS
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Dua puluh agenda Kalender Komunitas (Hal 5 pilar 02).
 *
 * Topiknya diambil dari kebutuhan yang paling sering disebut kedua komunitas :
 * pemasaran, keuangan usaha, dan keahlian digital untuk Womenpreneur; berbagi
 * karier dan literasi energi untuk alumni Sobat Bumi. Kegiatan yang sudah selesai
 * membawa `outcomeNote` dan lampiran bukti karena Hal 6 menghitung yang
 * *terlaksana*, bukan yang terjadwal.
 *
 * Tiga kelompok mengisi daftar ini, dan ketiganya perlu ada sekaligus:
 *
 * 1. **Kegiatan lampau** (`day` < 200): pemasok KPI-05 dan aksi SESSION_ATTEND.
 * 2. **Tujuh kegiatan mendatang** (`day` 205–260, dua di antaranya luring) :
 *    tanpa agenda ke depan, kalender publik dan panel kegiatan pada halaman blog
 *    hanya menampilkan masa lalu, dan komunitas terlihat sudah berhenti berjalan.
 * 3. **Dua usulan** berstatus `DIUSULKAN` ber-`proposedBy` akun awardee: tanpa
 *    keduanya antrean verifikator kosong pada peragaan, dan larangan menyetujui
 *    usulan sendiri tidak dapat ditunjukkan sama sekali.
 *
 * Seluruhnya ditulis sebagai NASKAH literal, bukan dibangkitkan lewat pemanggilan
 * `rng()` baru: satu draw tambahan yang disisipkan sebelum generator buku besar
 * akan menggeser 60 profil dan seluruh distribusi tier sekaligus.
 *
 * @type {readonly Record<string, any>[]}
 */
const NASKAH_KEGIATAN = Object.freeze([
	{
		day: 44, durasiJam: 2, type: EventType.PERTEMUAN, unggulan: false,
		slug: 'temu-perdana-chapter-pf-10',
		title: 'Temu Perdana Chapter PF 10',
		description: 'Perkenalan antaranggota angkatan 10 dan pembahasan bentuk komunitas yang diharapkan setelah masa program berakhir.',
		speakerName: 'Tim Corporate Secretary Pertamina Foundation',
		chapterId: 'PF10', location: 'Zoom Meeting', kuota: 60,
		outcomeNote: 'Terkumpul 34 usulan bentuk kegiatan, tiga terbanyak: mentoring karier, kelas keuangan usaha, dan aksi lingkungan bersama.'
	},
	{
		day: 71, durasiJam: 2, type: EventType.SHARING, unggulan: false,
		slug: 'sharing-karier-alumni-ke-sektor-energi',
		title: 'Sharing Karier: Jalan Alumni Sobat Bumi ke Sektor Energi',
		description: 'Tiga alumni yang bekerja di sektor energi berbagi jalur masuk, keterampilan yang dibutuhkan, dan kesalahan yang mereka buat di tahun pertama.',
		speakerName: 'Panel alumni angkatan 10 dan 11',
		chapterId: '', location: 'Zoom Meeting', kuota: 80,
		outcomeNote: 'Empat peserta mendapat kontak lanjutan untuk magang dan rekrutmen di dua perusahaan mitra.'
	},
	{
		day: 98, durasiJam: 3, type: EventType.UPSKILLING, unggulan: true,
		slug: 'kelas-pencatatan-keuangan-usaha-womenpreneur',
		title: 'Kelas Pencatatan Keuangan Usaha untuk Womenpreneur',
		description: 'Kelas praktik memisahkan uang usaha dari uang rumah tangga, menyusun catatan harian, dan membaca laba rugi sederhana.',
		speakerName: 'Fasilitator PFpreneur bersama alumni bidang keuangan',
		chapterId: '', community: CommunityType.WOMENPRENEUR, location: 'Google Meet', kuota: 40,
		outcomeNote: 'Dua puluh satu peserta menyelesaikan latihan pencatatan satu bulan penuh dan mengirimkan hasilnya untuk ditinjau.'
	},
	{
		day: 116, durasiJam: 2, type: EventType.UPSKILLING, unggulan: true,
		slug: 'kelas-fotografi-produk-dengan-ponsel',
		title: 'Kelas Fotografi Produk dengan Ponsel',
		description: 'Praktik memotret produk memakai ponsel, cahaya matahari, dan alas sederhana. Peserta membawa satu produk untuk dibahas langsung.',
		speakerName: 'Alumni bidang desain produk',
		chapterId: '', community: CommunityType.WOMENPRENEUR, location: 'Google Meet', kuota: 30,
		outcomeNote: 'Dua puluh enam peserta mengunggah ulang foto produknya; sembilan di antaranya melaporkan pertanyaan pembeli meningkat dalam dua pekan.'
	},
	{
		day: 133, durasiJam: 2, type: EventType.SHARING, unggulan: true,
		slug: 'sharing-membaca-data-penjualan-sendiri',
		title: 'Sharing Session: Membaca Data Penjualan Sendiri',
		description: 'Membedah cara membaca data penjualan dari marketplace dan catatan manual, lalu mengubahnya menjadi keputusan stok dan harga.',
		speakerName: 'Alumni bidang analisis data',
		chapterId: '', location: 'Zoom Meeting', kuota: 50,
		outcomeNote: 'Peserta menyusun satu ringkasan penjualan tiga bulan terakhir usahanya masing-masing sebagai tugas sesi.'
	},
	{
		day: 147, durasiJam: 2, type: EventType.PERTEMUAN, unggulan: false,
		slug: 'temu-chapter-pf-11-dan-pf-12-gerakan-bersama',
		title: 'Temu Chapter PF 11 dan PF 12: Menyusun Gerakan Bersama',
		description: 'Pertemuan lintas batch untuk memilih tema gerakan yang dijalankan serentak pada Juni dan Juli.',
		speakerName: 'Penanggung jawab chapter PF 11',
		chapterId: 'PF11', location: 'Zoom Meeting', kuota: 70,
		outcomeNote: 'Terpilih tiga tema gerakan: pengurangan sampah, literasi iklim di sekolah, dan pendampingan usaha binaan.'
	},
	{
		day: 158, durasiJam: 3, type: EventType.UPSKILLING, unggulan: true,
		slug: 'kelas-pemasaran-digital-dari-konten-ke-penjualan',
		title: 'Kelas Pemasaran Digital: Dari Konten ke Penjualan',
		description: 'Menyusun kalender konten sederhana, menulis keterangan produk yang jelas, dan mengukur mana yang benar-benar menghasilkan pesanan.',
		speakerName: 'Alumni bidang pemasaran digital',
		chapterId: '', location: 'Google Meet', kuota: 45,
		outcomeNote: 'Tiga puluh dua peserta menyusun kalender konten empat pekan; delapan belas melaporkan menjalankannya penuh sampai akhir bulan.'
	},
	{
		day: 166, durasiJam: 2, type: EventType.SHARING, unggulan: false,
		slug: 'klinik-bisnis-menghitung-harga-pokok-produksi',
		title: 'Klinik Bisnis: Menghitung Harga Pokok Produksi',
		description: 'Sesi hitung bersama harga pokok produksi, termasuk komponen yang paling sering terlewat seperti tenaga sendiri dan penyusutan alat.',
		speakerName: 'Mentor PFpreneur bidang keuangan',
		chapterId: '', community: CommunityType.WOMENPRENEUR, location: 'Google Meet', kuota: 35,
		outcomeNote: 'Empat belas peserta menemukan harga jualnya selama ini di bawah harga pokok sebenarnya, dan menyusun ulang struktur harganya.'
	},
	{
		day: 174, durasiJam: 2, type: EventType.UPSKILLING, unggulan: true,
		slug: 'literasi-iklim-untuk-fasilitator-komunitas',
		title: 'Literasi Iklim untuk Fasilitator Komunitas',
		description: 'Bekal materi dan cara menyampaikan topik perubahan iklim kepada warga dan pelajar tanpa istilah yang membingungkan.',
		speakerName: 'Peneliti energi terbarukan, alumni angkatan 10',
		chapterId: '', location: 'Zoom Meeting', kuota: 50,
		outcomeNote: 'Tersusun satu paket materi ajar ringkas yang kemudian dipakai pada tiga kegiatan edukasi di sekolah.'
	},
	{
		day: 190, durasiJam: 2, type: EventType.SHARING, unggulan: false,
		slug: 'sertifikasi-halal-dan-izin-edar-produk-pangan',
		title: 'Sharing Session: Sertifikasi Halal dan Izin Edar Produk Pangan',
		description: 'Menelusuri tahapan pengurusan izin edar dan sertifikasi halal, beserta biaya dan lama proses yang realistis.',
		speakerName: 'Pendamping perizinan usaha mikro',
		chapterId: '', community: CommunityType.WOMENPRENEUR, location: 'Google Meet', kuota: 40,
		outcomeNote: 'Sebelas peserta memulai proses pengurusan izin edar dalam dua pekan setelah sesi.'
	},
	{
		day: 214, durasiJam: 2, type: EventType.UPSKILLING, unggulan: false,
		status: EventStatus.TERJADWAL,
		slug: 'kelas-penulisan-cerita-dampak',
		title: 'Kelas Penulisan Cerita Dampak',
		description: 'Menulis cerita kegiatan yang memuat hasil terukur, bukan sekadar laporan jalannya acara. Kelas ini menyiapkan naskah untuk ruang cerita Pfriends.',
		speakerName: 'Tim komunikasi Pertamina Foundation',
		chapterId: '', location: 'Zoom Meeting', kuota: 45
	},
	{
		day: 228, durasiJam: 3, type: EventType.PERTEMUAN, unggulan: false,
		status: EventStatus.TERJADWAL,
		slug: 'temu-nasional-pfriends-2026',
		title: 'Temu Nasional Pfriends 2026',
		description: 'Pertemuan tatap muka pertama seluruh chapter, memuat pameran produk usaha binaan dan pengumuman Champion musim pertama.',
		speakerName: 'Corporate Secretary Pertamina Foundation',
		chapterId: '', location: 'Gedung Pertamina Foundation, Jakarta Selatan', kuota: 120, luring: true
	},
	{
		day: 180, durasiJam: 2, type: EventType.SHARING, unggulan: false,
		status: EventStatus.DIBATALKAN,
		slug: 'ekspor-produk-kriya-ke-pasar-asia-tenggara',
		title: 'Sharing Session: Ekspor Produk Kriya ke Pasar Asia Tenggara',
		description: 'Sesi ditunda karena narasumber berhalangan; dijadwalkan ulang pada kuartal berikutnya bersama pendamping ekspor yang sama.',
		speakerName: 'Pendamping ekspor UMKM',
		chapterId: '', location: 'Zoom Meeting', kuota: 40,
		reviewNote: 'Dibatalkan karena narasumber berhalangan pada tanggal yang sudah diumumkan; peserta terdaftar dikabari langsung lewat grup chapter.'
	},

	// ── Kegiatan mendatang (day 205–260) ────────────────────────────────────────
	{
		day: 205, durasiJam: 2, type: EventType.UPSKILLING, unggulan: false,
		status: EventStatus.TERJADWAL,
		slug: 'kelas-lembar-kerja-keuangan-di-ponsel',
		title: 'Kelas Lembar Kerja Keuangan Langsung dari Ponsel',
		description: 'Lanjutan kelas pencatatan digital, kali ini sepenuhnya memakai ponsel. Disusun setelah dua belas dari delapan belas peserta kelas Balikpapan melaporkan laptop harus dipakai bergantian dengan anak untuk tugas sekolah.',
		speakerName: 'Alumni bidang analisis data bersama fasilitator PFpreneur',
		chapterId: '', location: 'Google Meet', kuota: 40
	},
	{
		day: 219, durasiJam: 2, type: EventType.SHARING, unggulan: false,
		status: EventStatus.TERJADWAL,
		slug: 'sharing-mengurus-izin-edar-tanpa-perantara',
		title: 'Sharing Session: Mengurus Izin Edar Pangan Tanpa Perantara',
		description: 'Sembilan pengolah ikan asap Ambon membagikan buku catatan bersama mereka: urutan berkas, perkiraan biaya, dan lama proses tiap tahap, termasuk berkas yang sempat ditolak.',
		speakerName: 'Kelompok pengolah ikan asap Batu Merah, Ambon',
		chapterId: '', community: CommunityType.WOMENPRENEUR, location: 'Zoom Meeting', kuota: 45
	},
	{
		day: 236, durasiJam: 4, type: EventType.PERTEMUAN, unggulan: false,
		status: EventStatus.TERJADWAL,
		slug: 'temu-chapter-timur-dan-pasar-bersama-surabaya',
		title: 'Temu Chapter Wilayah Timur dan Pasar Bersama Surabaya',
		description: 'Pertemuan tatap muka chapter wilayah timur sekaligus lapak bersama produk usaha binaan. Peserta luar kota dibantu penggantian transportasi darat sesuai ketentuan program.',
		speakerName: 'Penanggung jawab chapter PF 11 dan PF 12',
		chapterId: 'PF12', location: 'Gedung Serbaguna Universitas Airlangga, Surabaya', kuota: 90, luring: true
	},
	{
		day: 245, durasiJam: 3, type: EventType.UPSKILLING, unggulan: false,
		status: EventStatus.TERJADWAL,
		slug: 'kelas-menghitung-dampak-kegiatan',
		title: 'Kelas Menghitung Dampak Kegiatan dengan Data yang Ada',
		description: 'Menyusun satu angka hasil yang benar-benar dapat dipertanggungjawabkan dari catatan yang sudah dimiliki tim: daftar hadir, timbangan, tagihan, dan foto pelaksanaan. Bukan estimasi, bukan proyeksi.',
		speakerName: 'Tim pemantauan dan evaluasi Pertamina Foundation',
		chapterId: '', location: 'Zoom Meeting', kuota: 60
	},
	{
		day: 258, durasiJam: 2, type: EventType.SHARING, unggulan: false,
		status: EventStatus.TERJADWAL,
		slug: 'sharing-mentoring-batch-dua-apa-yang-berbeda',
		title: 'Sharing Session: Mentoring Batch Dua, Apa yang Kami Ubah',
		description: 'Evaluasi terbuka batch pertama mentoring lintas komunitas: termasuk empat pasangan yang berhenti di tengah jalan dan alasannya: sebelum batch kedua berjalan penuh.',
		speakerName: 'Mentor dan mentee batch pertama',
		chapterId: '', location: 'Zoom Meeting', kuota: 70
	},

	// ── Usulan dari awardee, menunggu keputusan verifikator ─────────────────────
	{
		day: 240, durasiJam: 3, type: EventType.UPSKILLING, unggulan: false,
		status: EventStatus.DIUSULKAN,
		slug: 'usulan-kelas-perbaikan-alat-produksi-rumahan',
		title: 'Usulan: Kelas Perbaikan Ringan Alat Produksi Rumahan',
		description: 'Usulan anggota chapter PF 11: kelas praktik memperbaiki sendiri kerusakan ringan mesin jahit, penggorengan listrik, dan pengemas plastik: tiga alat yang paling sering menghentikan produksi usaha mikro selama berhari-hari.',
		speakerName: 'Teknisi bengkel komunitas Yogyakarta',
		chapterId: 'PF11', location: 'Zoom Meeting', kuota: 35,
		usulDay: 193, pengusulSeq: 7
	},
	{
		day: 252, durasiJam: 2, type: EventType.SHARING, unggulan: false,
		status: EventStatus.DIUSULKAN,
		slug: 'usulan-sharing-menolak-pesanan-yang-merugikan',
		title: 'Usulan: Sharing Session Menolak Pesanan yang Merugikan',
		description: 'Usulan pelaku usaha binaan: membahas cara menghitung kapan sebuah pesanan besar justru merugikan, dan cara menolaknya tanpa kehilangan hubungan baik dengan pembeli.',
		speakerName: 'Pelaku usaha binaan PFpreneur bersama mentor bidang keuangan',
		chapterId: '', community: CommunityType.WOMENPRENEUR, location: 'Google Meet', kuota: 40,
		usulDay: 199, pengusulSeq: 32
	}
]);

/* ────────────────────────────────────────────────────────────────────────────
 * 5b. AGENDA BERGULIR: kalender publik yang tidak pernah kedaluwarsa
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Enam format kegiatan RUTIN, dijadwalkan relatif terhadap saat data demo dipasang.
 *
 * MENGAPA ADA DUA JENIS AGENDA DI BERKAS INI.
 * Seluruh naskah di atas memakai kalender BEKU yang berpangkal pada 20 Juli 2026,
 * dan itu tepat: rekap bulanan Januari–Juli, lima KPI Hal 6, dan timeline Hal 7
 * semuanya bertumpu pada tanggal-tanggal itu. Menggeser data historis mengikuti jam
 * nyata akan menggeser setiap draw bilangan acak yang bergantung padanya :
 * `hariCondongBaru()` menerima `HARI_INI` sebagai batas atas: dan total poin
 * komunitas 3.234 beserta distribusi tier 22/16/12/7/3 tidak akan bertahan satu
 * pemanggilan pun. Determinisme itu bukan kemewahan; ia yang membuat dua kali
 * pemasangan data demo menghasilkan layar yang sama saat presentasi.
 *
 * Tetapi MASA DEPAN tidak boleh ikut dibekukan. Kegiatan terjadwal terakhir pada
 * kalender beku jatuh pada 16 September 2026; sesudah tanggal itu beranda menulis
 * "Belum ada kegiatan terjadwal" dan tampilan Bulan pada `/kalender` kosong :
 * tanpa satu pun gerbang berubah warna, karena gerbangnya membandingkan terhadap
 * tanggal acuan yang beku juga. Maka masa lalu tetap beku, masa depan bergulir.
 *
 * Isinya sengaja berupa format yang memang BERULANG: klinik bulanan, orientasi
 * anggota baru, forum mentor: bukan peristiwa sekali seumur hidup. Agenda bergulir
 * yang berisi "Temu Nasional 2026" akan menjadi kebohongan pada pemasangan kedua.
 *
 * Offset dipilih 21 sampai 126 hari sehingga cakrawala agenda selalu setidaknya
 * 126 hari: dengan margin nyaman di atas `CAKRAWALA_AGENDA_MINIMUM_HARI`.
 *
 * @type {readonly Record<string, any>[]}
 */
const NASKAH_AGENDA_BERGULIR = Object.freeze([
	{
		offsetHari: 21, durasiJam: 2, type: EventType.PERTEMUAN,
		slug: 'orientasi-anggota-baru-pfriends',
		title: 'Orientasi Anggota Baru Pfriends',
		description: 'Sesi pengenalan bagi anggota yang baru bergabung: cara kerja komunitas, kanal yang dipakai sehari-hari, dan apa saja yang boleh diminta dari Corsec. Digelar rutin tiap awal periode pendaftaran.',
		speakerName: 'Tim Corporate Secretary Pertamina Foundation',
		chapterId: '', location: 'Zoom Meeting', kuota: 60,
		pengusulSeq: 0
	},
	{
		offsetHari: 42, durasiJam: 2, type: EventType.SHARING,
		slug: 'klinik-bisnis-bulanan-pfpreneur',
		title: 'Klinik Bisnis Bulanan PFpreneur',
		description: 'Klinik rutin membahas satu kendala usaha yang dibawa peserta: harga pokok, arus kas, atau pengurusan izin. Satu jam pertama untuk kasus terpilih, satu jam berikutnya untuk pertanyaan terbuka.',
		speakerName: 'Mentor PFpreneur bidang keuangan usaha',
		chapterId: '', community: CommunityType.WOMENPRENEUR, location: 'Google Meet', kuota: 40,
		pengusulSeq: 32
	},
	{
		offsetHari: 63, durasiJam: 2, type: EventType.UPSKILLING,
		slug: 'kelas-menulis-cerita-dampak-batch-berjalan',
		title: 'Kelas Menulis Cerita Dampak: Batch Berjalan',
		description: 'Kelas berkala menyiapkan naskah untuk ruang cerita Pfriends: menyusun hasil terukur, memilih foto yang layak tayang, dan melengkapi persetujuan narasumber sebelum naskah diajukan.',
		speakerName: 'Tim komunikasi Pertamina Foundation bersama verifikator konten',
		chapterId: '', location: 'Zoom Meeting', kuota: 45,
		pengusulSeq: 0
	},
	{
		offsetHari: 84, durasiJam: 2, type: EventType.PERTEMUAN,
		slug: 'temu-chapter-daring-lintas-angkatan',
		title: 'Temu Chapter Daring Lintas Angkatan',
		description: 'Pertemuan berkala antarchapter untuk menyamakan agenda gerakan yang sedang berjalan dan memindahkan pelajaran satu chapter ke chapter lain sebelum kesalahannya diulang.',
		speakerName: 'Penanggung jawab chapter PF 10, PF 11, dan PF 12',
		chapterId: '', location: 'Zoom Meeting', kuota: 80,
		pengusulSeq: 7
	},
	{
		offsetHari: 105, durasiJam: 2, type: EventType.SHARING,
		slug: 'forum-mentor-dan-mentee-evaluasi-berkala',
		title: 'Forum Mentor dan Mentee: Evaluasi Berkala',
		description: 'Forum terbuka pasangan mentoring yang sedang berjalan. Yang dibahas termasuk pasangan yang berhenti di tengah jalan: evaluasi yang hanya memuat keberhasilan tidak memperbaiki apa pun.',
		speakerName: 'Mentor dan mentee gerakan Satu Alumni, Satu Usaha Binaan',
		chapterId: '', location: 'Google Meet', kuota: 50,
		pengusulSeq: 0
	},
	{
		offsetHari: 126, durasiJam: 3, type: EventType.UPSKILLING,
		slug: 'kelas-menghitung-dampak-dari-catatan-yang-ada',
		title: 'Kelas Menghitung Dampak dari Catatan yang Ada',
		description: 'Menyusun satu angka hasil yang dapat dipertanggungjawabkan dari catatan yang sudah dimiliki tim: daftar hadir, timbangan, tagihan, dan foto pelaksanaan. Bukan estimasi, bukan proyeksi.',
		speakerName: 'Tim pemantauan dan evaluasi Pertamina Foundation',
		chapterId: '', location: 'Zoom Meeting', kuota: 60,
		pengusulSeq: 0
	}
]);

/**
 * Langkah pemilihan pendaftar agenda bergulir.
 *
 * Pendaftar dipilih dengan pencacah tetap, BUKAN dengan `rng()`. Satu draw tambahan
 * yang disisipkan sebelum generator buku besar akan menggeser 60 profil dan seluruh
 * distribusi tier sekaligus: dan agenda bergulir dibangkitkan justru supaya
 * kalender ikut waktu nyata TANPA menyentuh satu angka pun.
 */
const LANGKAH_PENDAFTAR_BERGULIR = 4;

/* ────────────────────────────────────────────────────────────────────────────
 * 6. GERAKAN BERSAMA
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Tujuh gerakan kolektif (Hal 5 pilar 03).
 *
 * `esgKey` merujuk entri `ESG_ACTIVITY_MAP` supaya pasangan pilar dan SDG tidak
 * pernah dikarang di berkas ini: taksonomi ESG punya satu sumber, dan seed hanya
 * boleh menunjuk ke sana. Gerakan berstatus berjalan atau selesai wajib bertag ESG;
 * itu invarian yang ditegakkan entity `Movement` sendiri.
 *
 * @type {readonly Record<string, any>[]}
 */
const NASKAH_GERAKAN = Object.freeze([
	{
		slug: 'pilah-sampah-dari-rumah',
		title: 'Pilah Sampah dari Rumah',
		category: MovementCategory.AKSI_LINGKUNGAN,
		status: MovementStatus.BERJALAN,
		objective: 'Membiasakan pemilahan sampah di sumber pada seribu rumah tangga di lima kota sepanjang 2026.',
		description: 'Gerakan ini tidak menuntut peralatan mahal. Setiap peserta memilah sampah organik dan anorganik di rumahnya, menimbang yang terkumpul tiap pekan, lalu menyalurkannya ke bank sampah terdekat. Data timbangan dicatat bersama sehingga komunitas tahu persis berapa yang berhasil dialihkan dari tempat pembuangan akhir.',
		esgKey: 'pengurangan_sampah',
		region: 'Jakarta, Semarang, Surabaya, Bandung, Makassar',
		startDay: 152, endDay: 240, target: 220,
		impact: { metric: 'Sampah terpilah', value: 4820, unit: 'kg' }
	},
	{
		slug: 'kelas-iklim-untuk-sekolah',
		title: 'Kelas Iklim untuk Sekolah',
		category: MovementCategory.EDUKASI_MASYARAKAT,
		status: MovementStatus.BERJALAN,
		objective: 'Membawa materi literasi iklim ke lima puluh sekolah menengah lewat alumni yang mengajar langsung di kelas.',
		description: 'Alumni Sobat Bumi mengisi satu jam pelajaran di sekolah terdekat dengan tempat tinggalnya, memakai paket materi yang disusun bersama pada kelas fasilitator Juni. Sekolah tidak perlu menyiapkan apa pun selain jadwal dan ruang kelas.',
		esgKey: 'edukasi_iklim',
		region: 'Jawa, Sumatera, Sulawesi',
		startDay: 168, endDay: 260, target: 60,
		impact: { metric: 'Pelajar teredukasi', value: 1740, unit: 'orang' }
	},
	{
		slug: 'mentor-untuk-satu-usaha',
		title: 'Satu Alumni, Satu Usaha Binaan',
		category: MovementCategory.PEMBERDAYAAN_EKONOMI,
		status: MovementStatus.BERJALAN,
		objective: 'Memasangkan alumni Sobat Bumi dengan satu usaha binaan PFpreneur selama delapan pekan pendampingan.',
		description: 'Inilah wujud paling langsung dari gagasan Hal 4: alumni sebagai mitra muda dan mentor, womenpreneur sebagai entitas bisnis binaan. Pasangan disusun berdasarkan kecocokan keahlian mentor dengan kendala yang sedang dihadapi mentee, bukan berdasarkan urutan pendaftaran.',
		esgKey: 'mentoring_lintas_komunitas',
		region: 'Nasional',
		startDay: 140, endDay: 250, target: 40,
		impact: { metric: 'Jam pendampingan', value: 384, unit: 'jam' }
	},
	{
		slug: 'tanam-dan-rawat-mangrove',
		title: 'Tanam dan Rawat Mangrove Pesisir',
		category: MovementCategory.AKSI_LINGKUNGAN,
		status: MovementStatus.SELESAI,
		objective: 'Menanam dan merawat bibit mangrove di tiga titik pesisir, dengan pemantauan tumbuh selama enam bulan.',
		description: 'Yang membedakan gerakan ini dari kegiatan tanam pada umumnya adalah kewajiban merawat. Setiap tim menyanggupi pemantauan bulanan selama setengah tahun dan melaporkan tingkat hidup bibitnya secara terbuka, termasuk ketika angkanya mengecewakan.',
		esgKey: 'aksi_lingkungan_lokal',
		region: 'Belawan, Kenjeran, Bunaken',
		startDay: 60, endDay: 175, target: 90,
		impact: { metric: 'Bibit mangrove hidup', value: 2150, unit: 'batang' }
	},
	{
		slug: 'hemat-energi-di-warung',
		title: 'Hemat Energi di Warung dan Usaha Mikro',
		category: MovementCategory.AKSI_LINGKUNGAN,
		status: MovementStatus.SELESAI,
		objective: 'Melakukan audit energi sederhana pada seratus usaha mikro dan menerapkan perbaikan yang tidak berbiaya.',
		description: 'Audit dilakukan dengan lembar periksa satu halaman: jenis lampu, pengaturan suhu kulkas, kebocoran karet pintu, dan jam operasional peralatan. Sebagian besar temuan dapat diperbaiki tanpa biaya sama sekali, dan justru itulah yang membuat penghematannya bertahan.',
		esgKey: 'kampanye_energi_bersih',
		region: 'Yogyakarta, Solo, Malang',
		startDay: 95, endDay: 170, target: 100,
		impact: { metric: 'Energi dihemat', value: 5260, unit: 'kWh/tahun' }
	},
	{
		slug: 'pasar-bersama-produk-binaan',
		title: 'Pasar Bersama Produk Binaan',
		category: MovementCategory.PEMBERDAYAAN_EKONOMI,
		status: MovementStatus.BERJALAN,
		objective: 'Membuka lapak bersama produk usaha binaan pada acara internal Pertamina dan Pertamina Foundation.',
		description: 'Kendala terbesar usaha binaan bukan mutu produk melainkan akses pasar. Gerakan ini menempuh jalan yang paling dekat: memanfaatkan acara yang memang sudah rutin digelar di lingkungan Pertamina, mulai dari pengadaan suvenir sampai bazar internal.',
		esgKey: 'pertumbuhan_womenpreneur',
		region: 'Jakarta, Balikpapan, Dumai',
		startDay: 176, endDay: 258, target: 35,
		impact: { metric: 'Nilai transaksi', value: 96, unit: 'juta rupiah' }
	},
	{
		slug: 'arsip-cerita-alumni',
		title: 'Arsip Cerita Alumni Sobat Bumi',
		category: MovementCategory.EDUKASI_MASYARAKAT,
		status: MovementStatus.DIUSULKAN,
		objective: 'Mengumpulkan seratus cerita perjalanan alumni sebagai bahan orientasi bagi penerima beasiswa angkatan berikutnya.',
		description: 'Usulan datang dari chapter PF 12 yang merasa kehilangan gambaran tentang apa yang menanti setelah kelulusan. Bentuknya wawancara tertulis singkat dengan kerangka pertanyaan yang sama, sehingga cerita-ceritanya dapat dibandingkan dan dibaca sebagai satu kumpulan.',
		esgKey: 'perkembangan_alumni',
		region: 'Nasional',
		startDay: 196, endDay: 280, target: 100,
		impact: null
	}
]);

/* ────────────────────────────────────────────────────────────────────────────
 * 7. CERITA KOMUNITAS
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Dua puluh dua naskah cerita komunitas: "story bank" Hal 9.
 *
 * Naskah ditulis utuh, bukan dibangkitkan dari potongan kalimat. Cerita adalah
 * satu-satunya bagian aplikasi yang benar-benar dibaca kata per kata saat demo,
 * dan teks yang tersusun dari template akan langsung terasa hambar pada paragraf
 * kedua. Setiap naskah memuat angka hasil yang spesifik karena gerbang bukti ESG
 * Hal 12 menuntut catatan hasil, bukan deskripsi acara.
 *
 * `esgKey` menunjuk `ESG_ACTIVITY_MAP`; pilar dan SDG tidak pernah ditulis lepas.
 *
 * Naskah dipisah menurut keadaan terbitnya. Cerita yang sudah tayang mengisi zona
 * publik, sedangkan cerita yang masih berjalan di alur moderasi mengisi antrean
 * admin dan ruang cerita awardee: dua layar yang butuh isi berbeda dan sama-sama
 * tidak boleh kosong saat didemokan.
 *
 * @type {readonly Record<string, any>[]}
 */
const CERITA_TERBIT = Object.freeze([
	{
		slug: 'lampu-surya-kampung-enggros',
		status: STORY_STATUS.TERPUBLIKASI,
		title: 'Lampu Surya untuk Enam Belas Rumah di Kampung Enggros',
		summary: 'Enam belas rumah di kampung pesisir Jayapura kini punya penerangan malam yang tidak bergantung pada genset dan bahan bakar yang harus diseberangkan dengan perahu.',
		esgKey: 'kampanye_energi_bersih',
		location: 'Kampung Enggros, Jayapura', peserta: 42, dayIndex: 138,
		outcome: { note: 'Enam belas rumah memperoleh penerangan malam selama minimal enam jam tanpa bahan bakar, dan pengeluaran bulanan untuk solar turun rata-rata Rp180 ribu per rumah.', metric: 'Rumah teraliri listrik surya', value: 16, unit: 'rumah' },
		body: `Kampung Enggros terletak di seberang teluk, dan satu-satunya cara membawa jeriken solar ke sana adalah dengan perahu. Setiap liter yang sampai di kampung sudah berlipat harganya dibanding di kota, dan ketika ombak sedang besar, pasokan bisa terhenti berhari-hari. Malam hari di kampung ini berarti gelap yang benar-benar gelap, dan anak-anak yang ingin belajar setelah magrib harus berbagi satu lampu minyak dengan seluruh isi rumah.

Kami datang bukan dengan rencana yang sudah jadi. Dua pekan pertama dihabiskan untuk mendata: berapa rumah, berapa jam listrik dibutuhkan tiap malam, dan siapa yang bersedia belajar memasang serta merawat. Pendataan itu mengubah rencana awal kami. Semula kami membayangkan satu instalasi besar terpusat, tetapi warga lebih menginginkan sistem kecil per rumah: alasannya masuk akal, sistem terpusat menuntut kesepakatan pembagian yang rumit dan seorang penjaga tetap yang tidak ada.

Pemasangan dikerjakan bersama tujuh warga yang sebelumnya mengikuti pelatihan dua hari. Mereka yang memanjat atap, kami yang mendampingi. Keputusan itu disengaja: instalasi yang dipasang orang luar akan berhenti berfungsi pada kerusakan pertama, sementara instalasi yang dipasang sendiri oleh pemiliknya punya peluang jauh lebih besar untuk bertahan. Tiga bulan setelah pemasangan, dua panel sempat bermasalah dan keduanya diperbaiki warga tanpa memanggil siapa pun.

Yang paling berkesan bukan saat lampu pertama menyala, melainkan percakapan sebulan kemudian. Seorang ibu bercerita bahwa anaknya kini mengerjakan tugas sekolah di rumah, bukan menumpang di balai kampung yang jaraknya sepuluh menit berjalan kaki. Angka penghematan solar memang bisa kami laporkan dengan rapi, tetapi perubahan yang sebenarnya terjadi pada hal-hal kecil semacam itu: dan itu yang paling sulit dimasukkan ke dalam tabel.`
	},
	{
		slug: 'sampah-plastik-menjadi-paving-blok',
		status: STORY_STATUS.TERPUBLIKASI,
		title: 'Dari 40 Kilogram Plastik Menjadi Paving Blok Halaman Balai Warga',
		summary: 'Percobaan mengolah sampah plastik menjadi paving blok di Semarang berhasil pada usaha keempat, setelah tiga kali gagal karena suhu dan campuran yang keliru.',
		esgKey: 'pengurangan_sampah',
		location: 'Kelurahan Sukorejo, Semarang', peserta: 28, dayIndex: 154,
		outcome: { note: 'Empat puluh kilogram sampah plastik jenis kemasan berhasil diolah menjadi 96 paving blok yang kini terpasang di halaman balai warga; bank sampah setempat menambah satu jalur penerimaan khusus plastik kemasan.', metric: 'Sampah plastik terolah', value: 40, unit: 'kg' },
		body: `Sampah plastik kemasan adalah jenis yang paling tidak disukai bank sampah. Nilainya terlalu rendah untuk dijual, tetapi jumlahnya paling banyak. Di Sukorejo, tumpukan plastik kemasan itu berakhir di satu sudut halaman bank sampah selama berbulan-bulan karena tidak ada yang mau mengambilnya, dan lama-lama menjadi persoalan tersendiri bagi pengurusnya.

Gagasan mengubahnya menjadi paving blok datang dari salah seorang pengurus yang melihat video di media sosial. Kami memutuskan mencobanya, dengan satu catatan yang kami sepakati sejak awal: bila tiga kali percobaan gagal, kami berhenti dan mencari cara lain, tidak memaksakan sesuatu yang tidak berhasil hanya karena sudah terlanjur diumumkan.

Percobaan pertama gagal total, hasilnya rapuh dan pecah saat diangkat. Percobaan kedua terlalu getas. Percobaan ketiga lebih baik tetapi permukaannya berlubang. Baru pada percobaan keempat kami menemukan campurannya: perbandingan plastik dan pasir yang tepat, suhu lebur yang lebih rendah dari dugaan awal, dan yang ternyata paling menentukan, plastik harus benar-benar kering sebelum dilebur. Kelembapan sedikit saja membuat seluruh adonan gagal.

Empat puluh kilogram plastik menghasilkan sembilan puluh enam paving blok, dan seluruhnya kini terpasang di halaman balai warga. Kami sengaja tidak menjualnya. Halaman balai adalah tempat yang dilewati semua orang setiap hari, dan paving blok yang terpasang di sana bekerja sebagai pengingat yang jauh lebih meyakinkan daripada penyuluhan mana pun. Sejak itu bank sampah membuka jalur penerimaan khusus plastik kemasan, dan tumpukan di sudut halaman itu tidak pernah kembali sebesar dulu.`
	},
	{
		slug: 'literasi-iklim-guru-lereng-merapi',
		status: STORY_STATUS.TERPUBLIKASI,
		title: 'Kelas Literasi Iklim untuk Guru SD di Lereng Merapi',
		summary: 'Dua belas guru sekolah dasar mendapat bekal menjelaskan perubahan iklim dengan bahasa yang dipahami murid kelas empat, tanpa satu pun istilah teknis.',
		esgKey: 'edukasi_iklim',
		location: 'Kecamatan Cangkringan, Sleman', peserta: 12, dayIndex: 161,
		outcome: { note: 'Dua belas guru menyusun rencana pembelajaran satu semester dengan materi iklim yang menyatu ke pelajaran yang sudah ada, dan tujuh di antaranya menjalankannya penuh sampai akhir semester.', metric: 'Guru terlatih', value: 12, unit: 'orang' },
		body: `Permintaan datang dari kepala sekolah, bukan dari kami. Ia bercerita bahwa murid-muridnya sering bertanya soal cuaca yang berubah-ubah dan panen yang gagal di kebun orang tua mereka, sementara para guru merasa tidak punya bekal untuk menjawab dengan benar. Yang mereka butuhkan bukan pelatihan lingkungan pada umumnya, melainkan cara menjelaskan sesuatu yang rumit kepada anak berusia sepuluh tahun.

Kami membuang seluruh materi presentasi yang sudah disiapkan pada hari pertama. Istilah seperti mitigasi, adaptasi, dan gas rumah kaca tidak bisa dibawa masuk ke kelas empat sekolah dasar, dan memaksakannya hanya akan membuat guru menghafal kata yang tidak mereka pahami sendiri. Sisa hari itu dihabiskan untuk satu pertanyaan sederhana: apa yang sebenarnya sudah dilihat anak-anak ini dengan mata mereka sendiri.

Jawabannya banyak. Musim hujan yang datang terlambat, kebun cabai yang gagal dua kali berturut-turut, sungai yang menyusut di bulan yang biasanya deras. Dari situ kami menyusun materi yang berangkat dari pengamatan mereka sendiri, bukan dari definisi. Perubahan iklim dijelaskan sebagai perubahan pola yang bisa mereka catat dan bandingkan, dan setiap kelas membuat papan catatan cuaca sederhana yang diisi bergantian setiap pagi.

Empat bulan kemudian tujuh dari dua belas guru masih menjalankannya. Lima berhenti, dan kami menanyakan alasannya. Jawaban yang paling sering muncul bukan soal materi, melainkan padatnya jadwal dan tuntutan administrasi yang tidak menyisakan ruang. Itu catatan penting bagi kami: pelatihan yang baik saja tidak cukup bila yang dilatih tidak punya waktu untuk menjalankannya, dan pada rancangan berikutnya kami harus ikut memikirkan hal itu.`
	},
	{
		slug: 'mangrove-kembali-di-belawan',
		status: STORY_STATUS.TERPUBLIKASI,
		title: 'Mangrove Kembali di Pesisir Belawan, dan Kali Ini Kami Merawatnya',
		summary: 'Tiga ribu bibit ditanam di Belawan, dan yang dilaporkan bukan jumlah tanamnya melainkan jumlah yang masih hidup enam bulan kemudian.',
		esgKey: 'aksi_lingkungan_lokal',
		location: 'Kelurahan Belawan, Medan', peserta: 64, dayIndex: 118,
		outcome: { note: 'Dari 3.000 bibit yang ditanam, 2.150 masih hidup pada pemantauan bulan keenam: tingkat hidup 72 persen, dengan kematian terbanyak pada titik yang terlalu dekat alur perahu nelayan.', metric: 'Bibit mangrove hidup', value: 2150, unit: 'batang' },
		body: `Ini bukan penanaman mangrove pertama di Belawan. Warga bercerita sudah ada beberapa kegiatan serupa sebelumnya, lengkap dengan spanduk dan foto bersama, tetapi tidak ada yang tahu berapa yang akhirnya tumbuh. Bibit ditanam, rombongan pulang, dan enam bulan kemudian tidak ada yang datang memeriksa. Kalimat itu yang membuat kami mengubah rencana sebelum mulai.

Kami menyanggupi satu hal yang terdengar sepele tetapi ternyata paling berat: memantau selama enam bulan dan melaporkan angkanya apa adanya, termasuk bila hasilnya buruk. Enam tim dibentuk, masing-masing bertanggung jawab atas satu petak, dengan jadwal pemantauan bulanan yang disepakati sejak hari pertama. Setiap tim mencatat jumlah bibit hidup, kondisi daun, dan hal-hal yang mengganggu pertumbuhan.

Pemantauan bulan kedua sudah menunjukkan masalah. Petak yang berbatasan dengan alur perahu nelayan kehilangan hampir separuh bibitnya, tersapu baling-baling dan gelombang. Kami sempat berdebat apakah angka itu perlu masuk laporan, dan akhirnya sepakat bahwa justru angka itulah yang paling berguna. Pada penanaman berikutnya, tidak ada lagi bibit yang ditempatkan dalam radius sepuluh meter dari alur perahu.

Pada bulan keenam, dua ribu seratus lima puluh dari tiga ribu bibit masih hidup. Tujuh puluh dua persen. Angka ini lebih rendah dari yang kami harapkan dan lebih tinggi dari yang ditakutkan, tetapi yang terpenting adalah angka ini benar-benar dihitung, bukan diperkirakan. Nelayan setempat kini ikut mengawasi petak yang berdekatan dengan tambatan perahunya, dan itu terjadi bukan karena diminta, melainkan karena mereka melihat sendiri datanya setiap bulan.`
	},
	{
		slug: 'tenun-ikat-sumba-naik-kelas',
		status: STORY_STATUS.TERPUBLIKASI,
		title: 'Tenun Ikat Sumba Naik Kelas Lewat Foto Produk yang Benar',
		summary: 'Kain yang dikerjakan tiga bulan selama ini difoto seadanya di atas lantai. Setelah cara memotretnya diperbaiki, harga yang berani ditawarkan pembeli berubah.',
		esgKey: 'pertumbuhan_womenpreneur',
		location: 'Waingapu, Sumba Timur', peserta: 9, dayIndex: 128,
		outcome: { note: 'Rata-rata harga jual per lembar naik dari Rp650 ribu menjadi Rp1,1 juta dalam dua bulan, dan pesanan dari luar pulau meningkat dari dua menjadi sebelas lembar per bulan.', metric: 'Kenaikan harga jual rata-rata', value: 69, unit: 'persen' },
		body: `Satu lembar tenun ikat Sumba dikerjakan tiga sampai empat bulan. Pewarnaannya memakai bahan alam, motifnya diturunkan dari generasi sebelumnya, dan setiap helai benang diikat satu per satu sebelum ditenun. Semua itu tidak terlihat sama sekali pada foto yang selama ini kami unggah: kain digelar di lantai, difoto dari atas dengan lampu neon, dan hasilnya terlihat seperti kain cetakan biasa.

Kami baru menyadarinya saat kelas fotografi produk. Pemateri tidak membahas kamera sama sekali. Ia hanya meminta kami memotret satu produk dengan cara yang biasa dilakukan, lalu memotret ulang dengan tiga perubahan: dekat jendela pada pagi hari, alas kain polos berwarna terang, dan satu foto tambahan yang memperlihatkan tekstur benang dari jarak sangat dekat. Perbedaannya mengejutkan kami sendiri.

Foto jarak dekat itulah yang paling mengubah keadaan. Pembeli yang sebelumnya menawar dengan pertanyaan seragam soal harga mulai bertanya hal lain: berapa lama dikerjakan, pewarnanya dari tumbuhan apa, motifnya bermakna apa. Percakapan berubah, dan bersamanya berubah pula angka yang berani mereka bayar. Kami tidak menaikkan harga secara sepihak; harga naik karena pembeli akhirnya melihat apa yang selama ini mereka beli.

Dalam dua bulan, harga rata-rata per lembar naik dari enam ratus lima puluh ribu menjadi satu juta seratus ribu rupiah. Pesanan dari luar pulau naik dari dua menjadi sebelas lembar per bulan. Sembilan penenun di kelompok kami kini bergantian memotret produk masing-masing, dan yang paling mahir mengajari yang belum. Tidak ada peralatan baru yang kami beli sepanjang proses ini, kecuali dua meter kain polos untuk alas.`
	},
	{
		slug: 'sepuluh-jam-pendampingan-harga-pokok',
		status: STORY_STATUS.TERPUBLIKASI,
		title: 'Sepuluh Jam Pendampingan yang Mengubah Cara Saya Menghitung Harga',
		summary: 'Selama empat tahun berjualan keripik, saya tidak pernah memasukkan tenaga sendiri ke dalam hitungan harga pokok. Ternyata usaha saya rugi tanpa saya sadari.',
		esgKey: 'mentoring_lintas_komunitas',
		location: 'Bandar Lampung', peserta: 1, dayIndex: 166,
		outcome: { note: 'Harga pokok produksi dihitung ulang dan ditemukan 23 persen lebih tinggi dari perkiraan sebelumnya; harga jual disesuaikan bertahap dan margin bersih naik dari 6 persen menjadi 19 persen dalam tiga bulan.', metric: 'Kenaikan margin bersih', value: 13, unit: 'poin persentase' },
		body: `Saya sudah empat tahun membuat dan menjual keripik pisang. Setiap bulan uang masuk, setiap bulan uang keluar, dan setiap bulan saya merasa hasilnya kurang tanpa tahu di mana letak masalahnya. Ketika ditawari pendampingan lewat program mentoring Pfriends, terus terang saya berharap diajari cara berjualan di media sosial, bukan diajak menghitung.

Pertemuan pertama justru dihabiskan untuk mendaftar biaya. Mentor saya, seorang alumni yang bekerja di bidang keuangan, meminta saya menyebutkan semua yang keluar untuk membuat satu kilogram keripik. Saya sebutkan pisang, minyak, gas, bumbu, dan kemasan. Ia bertanya, tenaga siapa yang menggoreng. Saya jawab, tenaga saya sendiri. Ia bertanya lagi, berapa jam, dan berapa yang akan saya bayarkan bila orang lain yang mengerjakannya.

Pertanyaan itu yang membongkar semuanya. Selama empat tahun saya tidak pernah menghitung tenaga sendiri sebagai biaya, juga tidak menghitung penyusutan wajan dan penggorengan yang harus diganti tiap dua tahun. Setelah semuanya dimasukkan, harga pokok produksi saya ternyata dua puluh tiga persen lebih tinggi dari yang selama ini saya kira. Pada beberapa varian, harga jual saya bahkan berada di bawahnya. Saya sedang membayari orang lain untuk memakan keripik saya.

Penyesuaian harga tidak dilakukan sekaligus karena saya takut kehilangan pelanggan. Mentor saya menyarankan menaikkannya bertahap dalam tiga bulan, dimulai dari varian yang paling banyak diminati. Sebagian pelanggan memang bertanya, tetapi hampir semua tetap membeli. Setelah tiga bulan, margin bersih saya naik dari enam persen menjadi sembilan belas persen. Total waktu pendampingan sepuluh jam, tersebar dalam delapan pertemuan daring, dan sebagian besarnya hanya berisi hitungan di atas kertas.`
	},
	{
		slug: 'kopi-gayo-perempuan-ekspor-pertama',
		status: STORY_STATUS.TERPUBLIKASI,
		title: 'Kopi Gayo Perempuan dan Kontainer Ekspor yang Pertama',
		summary: 'Kelompok tani perempuan di Aceh Tengah menyelesaikan pengiriman ekspor pertamanya setelah delapan bulan mengurus dokumen dan memperbaiki mutu pascapanen.',
		esgKey: 'pertumbuhan_womenpreneur',
		location: 'Aceh Tengah', peserta: 34, dayIndex: 145,
		outcome: { note: 'Pengiriman ekspor pertama sebanyak 1,2 ton green bean terlaksana dengan harga 34 persen di atas harga tengkulak setempat; 34 petani perempuan menerima pembayaran langsung tanpa perantara.', metric: 'Kopi diekspor', value: 1200, unit: 'kg' },
		body: `Selama bertahun-tahun kopi dari kebun kami berpindah tangan tiga kali sebelum sampai ke pemanggang di kota. Setiap perpindahan memotong harga, dan yang paling sedikit menerima selalu yang paling banyak bekerja. Kami tahu kopi Gayo dihargai tinggi di luar negeri, tetapi jarak antara kebun kami dan pembeli itu terasa mustahil dijembatani.

Yang mengubah keadaan bukan pelatihan pemasaran, melainkan perbaikan yang sangat teknis dan membosankan. Pendampingan mengajari kami hal-hal kecil di tahap pascapanen: waktu petik yang tepat, cara menyortir buah merah, lama fermentasi, dan kadar air yang harus dicapai sebelum penyimpanan. Delapan bulan dihabiskan hanya untuk itu, dan berkali-kali sampel kami ditolak karena kadar airnya meleset satu dua persen.

Urusan dokumen ternyata sama beratnya. Nomor induk berusaha, sertifikat asal barang, dan pendaftaran eksportir memerlukan kesabaran yang tidak kami duga sebelumnya. Ada tiga kali berkas kami dikembalikan karena kesalahan yang sepenuhnya bisa dihindari seandainya ada yang memberi tahu lebih awal. Catatan itu kini kami tulis rapi dan bagikan ke kelompok tani lain supaya mereka tidak mengulangi jalan memutar yang sama.

Pengiriman pertama sebanyak satu koma dua ton berangkat pada Mei. Harganya tiga puluh empat persen di atas harga yang biasa ditawarkan pengumpul setempat, dan tiga puluh empat petani perempuan menerima pembayarannya langsung. Yang paling berarti bagi kami bukan angka itu, melainkan kenyataan bahwa sekarang kami tahu persis siapa yang meminum kopi kami dan berapa yang mereka bayarkan untuk itu.`
	},
	{
		slug: 'kelas-malam-excel-balikpapan',
		status: STORY_STATUS.TERPUBLIKASI,
		title: 'Kelas Malam Pencatatan Digital untuk Pelaku UMKM Balikpapan',
		summary: 'Delapan belas pelaku usaha belajar memindahkan catatan penjualan dari buku tulis ke lembar kerja digital, dengan kelas yang digelar pukul delapan malam setelah warung tutup.',
		esgKey: 'upskilling',
		location: 'Kelurahan Manggar, Balikpapan', peserta: 18, dayIndex: 149,
		outcome: { note: 'Delapan belas peserta menyelesaikan pencatatan digital satu bulan penuh; dua belas di antaranya masih menjalankannya pada bulan ketiga tanpa pendampingan lanjutan.', metric: 'Peserta menyelesaikan pelatihan', value: 18, unit: 'orang' },
		body: `Kelas ini gagal dua kali sebelum berhasil. Percobaan pertama digelar pukul sepuluh pagi dan hanya empat orang datang. Percobaan kedua pukul dua siang, hasilnya tidak jauh berbeda. Baru ketika kami bertanya langsung kepada calon peserta, jawabannya jelas: pagi dan siang adalah waktu berjualan, dan tidak ada satu pun dari mereka yang bisa meninggalkan warung pada jam itu.

Kelas ketiga digelar pukul delapan malam, setelah sebagian besar warung tutup. Delapan belas orang datang, dan hampir semuanya membawa anak. Kami tidak menyiapkan itu, tetapi ternyata bukan masalah: anak-anak duduk di belakang, dan beberapa yang lebih besar justru membantu orang tuanya mengoperasikan laptop. Sejak itu kami selalu menyediakan meja tambahan di belakang ruangan.

Materinya sengaja dibuat sesempit mungkin. Kami tidak mengajarkan lembar kerja secara umum, hanya empat hal: mencatat penjualan harian, menjumlahkan otomatis, memisahkan pemasukan per jenis produk, dan membuat satu grafik sederhana. Empat pertemuan, satu topik per pertemuan. Setiap peserta pulang dengan berkas yang sudah berisi data usahanya sendiri, bukan data contoh, dan itu keputusan yang menurut kami paling menentukan.

Pada bulan ketiga kami menghubungi kembali seluruh peserta. Dua belas dari delapan belas masih mencatat secara digital, enam kembali ke buku tulis. Alasan yang kembali paling sering disebut adalah laptop yang harus dipakai bergantian dengan anak untuk tugas sekolah. Kami mencatat itu sebagai bahan perbaikan: kelas berikutnya akan memakai aplikasi lembar kerja pada ponsel, karena ponsel adalah satu-satunya perangkat yang benar-benar dimiliki setiap peserta sepanjang waktu.`
	},
	{
		slug: 'sabun-minyak-jelantah-cilincing',
		status: STORY_STATUS.TERPUBLIKASI,
		title: 'Sabun dari Minyak Jelantah Warga Cilincing',
		summary: 'Minyak goreng bekas yang biasanya dibuang ke saluran air kini dikumpulkan warga dan diolah menjadi sabun cuci yang dipakai sendiri dan dijual terbatas.',
		esgKey: 'pengurangan_sampah',
		location: 'Kelurahan Cilincing, Jakarta Utara', peserta: 37, dayIndex: 172,
		outcome: { note: 'Terkumpul 310 liter minyak jelantah dalam empat bulan dan diolah menjadi 1.240 batang sabun cuci; saluran air di dua RT dilaporkan tidak lagi tersumbat lemak beku sejak program berjalan.', metric: 'Minyak jelantah terkumpul', value: 310, unit: 'liter' },
		body: `Saluran air di lingkungan kami tersumbat hampir setiap bulan. Petugas kebersihan yang membersihkannya selalu mengangkat gumpalan lemak beku bercampur sampah, dan semua orang tahu dari mana asalnya, tetapi tidak ada yang merasa perlu berhenti membuang minyak bekas ke sana. Membuangnya ke saluran adalah kebiasaan yang sudah berlangsung bertahun-tahun karena tidak ada pilihan lain yang jelas.

Kami mulai dengan hal paling sederhana: menyediakan tempat. Enam jeriken bekas ditempatkan di titik yang dilewati orang setiap hari, dan satu ibu di setiap RT bersedia menjadi penanggung jawabnya. Tiga pekan pertama hanya terkumpul sembilan liter, dan sempat ada yang menyarankan menghentikan program. Kami memilih bertahan dan mengubah pendekatan: alih-alih mengumumkan lewat pengeras suara musala, penanggung jawab mendatangi rumah satu per satu.

Cara itu berhasil, meski melelahkan. Bulan kedua terkumpul enam puluh delapan liter. Pengolahan menjadi sabun dikerjakan bergantian oleh kelompok ibu-ibu, dengan takaran yang sudah diuji berulang kali sampai hasilnya konsisten. Kami sempat menghasilkan satu batch yang terlalu keras dan satu lagi yang tidak mengeras sama sekali, dan keduanya kami catat lengkap dengan takarannya supaya kesalahan yang sama tidak terulang.

Empat bulan berjalan, tiga ratus sepuluh liter minyak terkumpul dan menjadi seribu dua ratus empat puluh batang sabun. Sebagian besar dibagikan kembali kepada warga yang menyetor, sisanya dijual dengan harga terjangkau di warung sekitar. Yang paling kami syukuri bukan hasil penjualannya, melainkan laporan petugas kebersihan bahwa saluran di dua RT tidak lagi tersumbat lemak sejak program ini berjalan.`
	},
	{
		slug: 'bank-sampah-sekolah-kenjeran',
		status: STORY_STATUS.TERPUBLIKASI,
		title: 'Bank Sampah Sekolah di Kenjeran Mengumpulkan 1,2 Ton dalam Enam Bulan',
		summary: 'Dua sekolah dasar di Surabaya menjalankan bank sampah yang dikelola murid sendiri, lengkap dengan pencatatan dan pembagian hasil.',
		esgKey: 'pengurangan_sampah',
		location: 'Kelurahan Kenjeran, Surabaya', peserta: 214, dayIndex: 158,
		outcome: { note: 'Terkumpul 1.208 kilogram sampah bernilai jual dalam enam bulan; hasil penjualan sebesar Rp3,4 juta dipakai membeli buku bacaan perpustakaan atas keputusan musyawarah murid.', metric: 'Sampah terkumpul', value: 1208, unit: 'kg' },
		body: `Bank sampah sekolah bukan gagasan baru, dan justru itu masalahnya. Ketika kami menawarkannya ke sekolah, tanggapan pertama kepala sekolah adalah bahwa program serupa pernah dijalankan dan berhenti setelah tiga bulan. Ia tidak menolak, tetapi meminta kami menjelaskan apa yang akan berbeda kali ini. Pertanyaan itu wajar dan kami tidak punya jawaban yang meyakinkan pada saat itu.

Kami menghabiskan dua pekan mencari tahu mengapa program sebelumnya berhenti. Jawabannya ternyata satu hal yang sangat teknis: seluruh pencatatan dan penimbangan dikerjakan satu guru, dan ketika guru itu pindah tugas, tidak ada yang meneruskan. Program tidak gagal karena murid kehilangan minat, melainkan karena seluruh beban bertumpu pada satu orang yang tidak tergantikan.

Rancangan kali ini menempatkan murid sebagai pengelola. Setiap kelas memilih dua petugas yang bertugas selama satu bulan lalu digantikan, sehingga dalam satu tahun ajaran hampir semua murid pernah menjalankannya. Penimbangan dan pencatatan dilakukan murid, guru hanya memeriksa. Buku catatannya sengaja dibuat sederhana agar bisa diisi anak kelas empat: tanggal, jenis, berat, dan nama penyetor.

Enam bulan berjalan, terkumpul seribu dua ratus delapan kilogram sampah bernilai jual. Hasil penjualannya tiga juta empat ratus ribu rupiah, dan penggunaannya diputuskan lewat musyawarah murid: mereka memilih membeli buku bacaan untuk perpustakaan. Yang membuat kami cukup yakin program ini akan bertahan adalah pergantian petugas yang sudah berlangsung enam kali tanpa satu kali pun terputus.`
	},
	{
		slug: 'kelas-energi-sma-palu',
		status: STORY_STATUS.TERPUBLIKASI,
		title: 'Alumni Sobat Bumi Mengisi Kelas Energi di SMA Negeri 3 Palu',
		summary: 'Satu jam pelajaran fisika diisi alumni yang bekerja di sektor panas bumi, dan berakhir dengan sesi tanya jawab yang melewati jam istirahat.',
		esgKey: 'edukasi_iklim',
		location: 'Palu, Sulawesi Tengah', peserta: 96, dayIndex: 176,
		outcome: { note: 'Tiga kelas dengan total 96 siswa mengikuti materi transisi energi; sekolah kemudian memasukkan kunjungan ke instalasi energi terbarukan setempat ke dalam agenda semester berikutnya.', metric: 'Siswa mengikuti kelas', value: 96, unit: 'orang' },
		body: `Saya kembali ke sekolah tempat saya dulu belajar, dan berdiri di depan kelas yang sama dengan tempat saya pernah duduk. Guru fisika yang mengajari saya belasan tahun lalu masih mengajar di sana, dan justru beliau yang meminta saya datang. Permintaannya spesifik: jangan bawa presentasi yang penuh grafik, ceritakan saja pekerjaanmu sehari-hari.

Saya menuruti permintaan itu, dan ternyata itu keputusan yang tepat. Saya bercerita tentang bagaimana panas dari dalam bumi diubah menjadi listrik, bukan sebagai konsep, melainkan sebagai pekerjaan yang saya kerjakan setiap hari: termasuk bagian yang membosankan seperti pengukuran berulang dan laporan yang harus diperiksa berkali-kali. Pertanyaan pertama yang muncul dari murid bukan soal teknologi, melainkan berapa gajinya.

Pertanyaan itu membawa percakapan ke arah yang tidak saya rencanakan tetapi paling berguna. Mereka ingin tahu jalur masuknya, jurusan apa yang harus diambil, apakah harus dari kampus besar, dan apakah nilai matematika yang biasa-biasa saja menutup peluang. Saya menjawab sejujurnya, termasuk bahwa nilai saya dulu tidak istimewa dan bahwa beasiswa Sobat Bumi adalah alasan saya bisa kuliah sama sekali.

Sesi yang dijadwalkan satu jam berlangsung sampai melewati jam istirahat, dan tidak ada murid yang keluar kelas. Tiga kelas dengan total sembilan puluh enam siswa mengikuti materi ini dalam satu hari. Sebulan kemudian sekolah mengabari bahwa mereka memasukkan kunjungan ke instalasi energi terbarukan setempat ke dalam agenda semester berikutnya, dan meminta saya membantu mengurusnya. Tentu saja saya bersedia.`
	}
]);

/**
 * Cerita yang belum tayang: sedang disusun, diajukan, ditinjau, diminta revisi,
 * sudah disetujui menunggu jadwal terbit, atau sudah diarsipkan.
 *
 * Bagian ini yang mengisi antrean moderasi admin. Antrean yang kosong membuat
 * halaman `/admin/moderasi` tidak dapat dinilai sama sekali saat demo, padahal
 * justru di sanalah tata kelola konten Hal 10 terlihat bekerja.
 *
 * @type {readonly Record<string, any>[]}
 */
const CERITA_DALAM_PROSES = Object.freeze([
	{
		slug: 'rumput-laut-oesapa-rantai-dingin',
		status: STORY_STATUS.DISETUJUI,
		title: 'Rumput Laut Oesapa dan Rantai Dingin yang Akhirnya Terpasang',
		summary: 'Hasil panen rumput laut yang selama ini turun mutunya sebelum sampai pembeli kini bertahan setelah kelompok tani memasang penyimpanan sederhana.',
		esgKey: 'pertumbuhan_womenpreneur',
		location: 'Desa Oesapa, Kupang', peserta: 26, dayIndex: 179,
		outcome: { note: 'Susut mutu pascapanen turun dari 22 persen menjadi 7 persen setelah penyimpanan berpendingin dipasang; harga terima naik rata-rata Rp2.800 per kilogram.', metric: 'Penurunan susut pascapanen', value: 15, unit: 'poin persentase' },
		body: `Rumput laut kami tumbuh baik. Perairan di sini cocok, bibitnya sehat, dan hasil panennya stabil sepanjang tahun. Masalahnya selalu muncul setelah panen: jarak ke pembeli memakan waktu, dan dalam perjalanan itu mutu rumput laut menurun. Pembeli membayar dengan harga yang lebih rendah, dan kami tidak punya dasar untuk menawar karena memang kondisinya sudah tidak sebaik saat diangkat dari laut.

Selama bertahun-tahun kami mengira solusinya adalah mencari pembeli yang lebih dekat. Pendampingan yang kami ikuti membalik cara berpikir itu dengan satu pertanyaan: berapa persen sebenarnya susut yang terjadi, dan pada tahap mana. Kami tidak tahu jawabannya, karena tidak pernah mengukurnya. Dua bulan berikutnya dihabiskan hanya untuk menimbang dan mencatat di setiap tahap.

Datanya mengejutkan. Susut terbesar tidak terjadi selama perjalanan, melainkan pada dua hari pertama setelah panen ketika hasil masih menumpuk di rumah menunggu jumlahnya cukup untuk diangkut. Panas dan kelembapan pada tahap itulah yang paling merusak. Artinya solusinya bukan mencari pembeli lebih dekat, melainkan memperbaiki penyimpanan sementara di tempat kami sendiri.

Penyimpanan berpendingin sederhana dipasang bersama, dibiayai patungan kelompok dan bantuan program. Susut pascapanen turun dari dua puluh dua persen menjadi tujuh persen, dan harga terima naik rata-rata dua ribu delapan ratus rupiah per kilogram. Yang paling berharga dari seluruh proses ini adalah kebiasaan menimbang dan mencatat, karena tanpa itu kami akan menghabiskan uang untuk memperbaiki hal yang bukan masalahnya.`
	},
	{
		slug: 'ecoprint-rumah-daun-dua-pekerja',
		status: STORY_STATUS.DISETUJUI,
		title: 'Ecoprint Rumah Daun Membuka Dua Lapangan Kerja Baru',
		summary: 'Usaha kain ecoprint di Bandung menambah dua pekerja tetap setelah pesanan korporat pertamanya, dan menuliskan apa yang berubah pada cara kerjanya.',
		esgKey: 'pertumbuhan_womenpreneur',
		location: 'Bandung, Jawa Barat', peserta: 5, dayIndex: 183,
		outcome: { note: 'Dua pekerja tetap direkrut dari lingkungan sekitar setelah pesanan korporat 400 lembar; kapasitas produksi naik dari 60 menjadi 180 lembar per bulan tanpa penambahan alat.', metric: 'Lapangan kerja baru', value: 2, unit: 'orang' },
		body: `Pesanan empat ratus lembar datang dari perusahaan yang mencari suvenir untuk acara tahunannya. Angka itu enam kali lipat produksi bulanan kami saat itu, dan tenggatnya enam pekan. Reaksi pertama saya adalah menolak, karena saya tahu persis berapa yang bisa saya kerjakan sendiri dalam sehari.

Saya membicarakannya dengan mentor dari program pendampingan sebelum memberi jawaban. Ia tidak langsung menyarankan menerima atau menolak, melainkan meminta saya memecah pekerjaan menjadi tahapan dan menghitung waktu setiap tahap. Setelah dipetakan, ternyata bagian yang benar-benar menuntut keahlian saya hanya penyusunan daun dan pemilihan warna. Perendaman, pengukusan, pencucian, dan penyetrikaan bisa dikerjakan siapa pun setelah dilatih dua hari.

Saya menerima pesanan itu dan merekrut dua orang dari lingkungan sekitar. Keduanya ibu rumah tangga yang selama ini tidak punya penghasilan sendiri. Dua pekan pertama berat karena saya harus melatih sambil mengejar tenggat, dan ada satu batch yang harus diulang seluruhnya karena kesalahan takaran perendaman. Batch itu rugi, tetapi kesalahannya tidak pernah terulang lagi setelah kami menempel takaran di dinding ruang kerja.

Pesanan selesai tiga hari sebelum tenggat. Yang tidak saya perhitungkan sebelumnya adalah bahwa setelah pesanan besar itu selesai, kapasitas produksi saya tidak kembali seperti semula: dari enam puluh menjadi seratus delapan puluh lembar per bulan, tanpa menambah satu pun alat. Yang berubah hanya pembagian kerja, dan itu seharusnya bisa saya lakukan bertahun-tahun lebih awal seandainya saya pernah memetakan tahapan pekerjaan saya sendiri.`
	},
	{
		slug: 'audit-energi-warung-kopi-yogyakarta',
		status: STORY_STATUS.REVIEW,
		title: 'Audit Energi Sederhana di Dua Puluh Warung Kopi Yogyakarta',
		summary: 'Lembar periksa satu halaman dipakai memeriksa pemakaian listrik warung kopi, dan sebagian besar temuannya bisa diperbaiki tanpa biaya sama sekali.',
		esgKey: 'kampanye_energi_bersih',
		location: 'Yogyakarta', peserta: 20, dayIndex: 187,
		outcome: { note: 'Dua puluh warung menerapkan perbaikan tanpa biaya; tagihan listrik bulanan turun rata-rata 14 persen pada bulan kedua setelah audit.', metric: 'Penurunan tagihan listrik', value: 14, unit: 'persen' },
		body: `Audit energi terdengar seperti pekerjaan yang menuntut alat ukur mahal dan sertifikasi khusus. Untuk skala industri memang begitu, tetapi untuk warung kopi berukuran kecil, sebagian besar pemborosan justru berasal dari hal-hal yang bisa dilihat dengan mata dan diperiksa dengan tangan. Itulah yang kami coba buktikan.

Lembar periksa yang kami susun hanya satu halaman berisi delapan pertanyaan: jenis lampu yang dipakai, jumlah lampu yang menyala di siang hari, suhu pengaturan kulkas, kondisi karet pintu kulkas, jarak kulkas dari dinding, jam operasional mesin kopi, keberadaan alat yang menyala saat tidak dipakai, dan kondisi kipas kondensor. Pemeriksaan setiap warung memakan waktu kurang dari tiga puluh menit.

Temuan yang paling sering muncul sama sekali tidak rumit. Enam belas dari dua puluh warung mengatur kulkas pada suhu terdingin tanpa alasan, padahal isinya hanya susu dan air kemasan. Sebelas warung memiliki karet pintu kulkas yang sudah tidak rapat, dan itu diketahui hanya dengan menjepit selembar kertas di pintu lalu menariknya. Sembilan warung menempatkan kulkas rapat ke dinding sehingga panasnya tidak bisa keluar.

Semua perbaikan itu tidak berbiaya, kecuali penggantian karet pintu yang harganya di bawah seratus ribu rupiah. Pada bulan kedua setelah audit, tagihan listrik dua puluh warung turun rata-rata empat belas persen. Kami sedang menyiapkan lembar periksa yang sama untuk warung makan, dan berencana melatih anggota komunitas di kota lain supaya bisa menjalankannya sendiri tanpa perlu kami datangi.`
	},
	{
		slug: 'perempuan-pengolah-ikan-asap-ambon',
		status: STORY_STATUS.REVIEW,
		title: 'Perempuan Pengolah Ikan Asap Ambon Belajar Mengurus Izin Edar',
		summary: 'Sembilan pengolah ikan asap menempuh proses perizinan pangan bersama-sama, dan mencatat setiap tahapannya agar bisa diikuti kelompok lain.',
		esgKey: 'upskilling',
		location: 'Kelurahan Batu Merah, Ambon', peserta: 9, dayIndex: 192,
		outcome: { note: 'Sembilan pelaku usaha menyelesaikan pendaftaran izin edar pangan olahan; empat di antaranya langsung diterima masuk ke dua jaringan toko oleh-oleh yang sebelumnya menolak karena ketiadaan izin.', metric: 'Usaha memperoleh izin edar', value: 9, unit: 'usaha' },
		body: `Ikan asap kami sudah dijual turun-temurun, tetapi selalu berhenti di pasar dan warung sekitar. Setiap kali menawarkan ke toko oleh-oleh yang lebih besar, jawabannya sama: produk tanpa izin edar tidak bisa diterima. Kami tahu apa yang harus diurus, tetapi tidak ada satu pun dari kami yang tahu harus mulai dari mana.

Kami memutuskan mengurusnya bersama-sama, sembilan orang sekaligus. Alasannya praktis: biaya pendampingan bisa dibagi, dan yang lebih penting, kesalahan satu orang menjadi pelajaran untuk delapan lainnya. Setiap kali ada berkas yang ditolak atau persyaratan yang ternyata berbeda dari yang kami kira, kami catat di satu buku bersama.

Tahapan yang paling memakan waktu ternyata bukan pengurusan izinnya, melainkan perbaikan tempat produksi. Ada persyaratan tentang pemisahan area, alas yang mudah dibersihkan, dan aliran udara yang harus dipenuhi lebih dulu. Empat dari kami harus mengubah tata letak dapur produksi, dan satu orang sempat mundur karena merasa tidak sanggup, lalu kembali bergabung setelah melihat perubahan yang dilakukan tetangganya ternyata tidak semahal dugaannya.

Sembilan-sembilannya akhirnya menyelesaikan pendaftaran. Empat langsung diterima masuk ke dua jaringan toko oleh-oleh yang dulu menolak kami. Buku catatan bersama itu kini kami salin dan bagikan ke dua kelompok pengolah lain di kota ini, lengkap dengan perkiraan biaya dan lama proses setiap tahap. Itu bagian yang paling ingin kami wariskan, karena ketiadaan informasi semacam inilah yang selama ini menahan kami bertahun-tahun.`
	},
	{
		slug: 'purun-rawa-gambut-pasar-baru',
		status: STORY_STATUS.DIAJUKAN,
		title: 'Purun Rawa Gambut dan Pasar yang Baru Ditemukan',
		summary: 'Anyaman purun yang dulu hanya dijual sebagai tikar kini dibuat menjadi tas dan wadah, dan pembelinya datang dari kota yang tidak pernah kami sangka.',
		esgKey: 'pertumbuhan_womenpreneur',
		location: 'Desa Sungai Rengas, Pontianak', peserta: 22, dayIndex: 196,
		outcome: { note: 'Ragam produk bertambah dari satu menjadi enam jenis; pendapatan rata-rata perajin naik dari Rp450 ribu menjadi Rp1,15 juta per bulan dalam lima bulan.', metric: 'Kenaikan pendapatan perajin', value: 156, unit: 'persen' },
		body: `Purun tumbuh liar di rawa gambut sekitar desa kami, dan sudah puluhan tahun dianyam menjadi tikar. Harganya tidak pernah berubah banyak, dan yang membeli selalu orang yang sama dari pasar kecamatan. Kami sempat berpikir bahwa memang begitulah nilai purun, sampai seseorang bertanya mengapa kami tidak membuat barang lain.

Pertanyaan itu tidak langsung kami jawab dengan produk baru. Pendampingan yang kami ikuti justru dimulai dengan mengamati siapa yang membeli dan untuk apa. Selama enam pekan kami mencatat pertanyaan pembeli, termasuk pertanyaan yang tidak berujung pembelian. Yang paling sering ditanyakan ternyata bukan tikar, melainkan apakah kami membuat tas atau wadah penyimpanan.

Enam jenis produk kami kembangkan dari situ: tas jinjing, wadah serbaguna, tempat tisu, alas meja, keranjang cucian, dan dompet kecil. Yang paling sulit bukan menganyamnya, melainkan menjaga ukuran tetap sama antarperajin. Kami membuat cetakan kayu sederhana untuk setiap jenis produk, dan sejak itu barang dari dua puluh dua perajin bisa dijual sebagai satu kelompok dengan mutu yang seragam.

Pembeli terbesar kami sekarang justru dari Jakarta dan Surabaya, kota yang tidak pernah kami bayangkan sebelumnya. Pendapatan rata-rata perajin naik dari empat ratus lima puluh ribu menjadi satu juta seratus lima puluh ribu rupiah per bulan dalam lima bulan. Kami sedang berhati-hati soal satu hal: purun diambil dari rawa, dan kami sudah menyepakati batas panen bersama supaya kenaikan pesanan tidak berbalik merusak sumbernya sendiri.`
	},
	{
		slug: 'hidroponik-atap-rumah-susun',
		status: STORY_STATUS.DIAJUKAN,
		title: 'Hidroponik di Atap Rumah Susun Jakarta Timur',
		summary: 'Atap rumah susun yang selama ini kosong ditanami sayur oleh warga, dan hasilnya cukup untuk kebutuhan sendiri dengan sedikit sisa untuk dijual.',
		esgKey: 'aksi_lingkungan_lokal',
		location: 'Jakarta Timur', peserta: 31, dayIndex: 199,
		outcome: { note: 'Panen rutin 46 kilogram sayur per bulan dari 180 lubang tanam; pengeluaran sayur harian 31 keluarga turun rata-rata Rp95 ribu per bulan.', metric: 'Panen sayur per bulan', value: 46, unit: 'kg' },
		body: `Atap blok rumah susun kami luasnya lebih dari dua ratus meter persegi dan selama bertahun-tahun hanya dipakai menjemur pakaian pada pagi hari. Sisa waktunya kosong dan panas. Usulan menanam sayur di sana sempat ditolak pengurus karena kekhawatiran soal beban dan rembesan air ke lantai bawah.

Kekhawatiran itu wajar dan kami menanggapinya dengan serius. Sebelum menanam apa pun, kami menghitung beban sistem hidroponik dalam keadaan penuh air dan membandingkannya dengan beban jemuran basah yang selama ini sudah ada di sana. Hasilnya jauh lebih ringan dari dugaan semula. Untuk rembesan, seluruh instalasi dibuat berdiri di atas rak dengan penampung tertutup, tidak ada satu pun titik yang bersentuhan langsung dengan lantai atap.

Instalasi pertama hanya empat puluh lubang tanam, sengaja kecil untuk menguji. Tiga bulan berjalan tanpa masalah, dan pengurus mengizinkan perluasan. Sekarang ada seratus delapan puluh lubang yang dikelola tiga puluh satu keluarga secara bergiliran. Jadwal penyiraman dan pengecekan nutrisi ditempel di papan pengumuman, dan setiap keluarga mendapat giliran satu pekan.

Panen rutin mencapai empat puluh enam kilogram sayur per bulan. Sebagian besar dibagi rata untuk kebutuhan sendiri, sisanya dijual di lingkungan rumah susun dengan harga di bawah pasar. Pengeluaran sayur harian tiga puluh satu keluarga turun rata-rata sembilan puluh lima ribu rupiah per bulan. Angka itu tidak besar, tetapi bagi sebagian tetangga kami, sembilan puluh lima ribu rupiah adalah selisih yang benar-benar terasa.`
	},
	{
		slug: 'mendampingi-bank-sampah-hampir-berhenti',
		status: STORY_STATUS.PERLU_REVISI,
		title: 'Enam Bulan Mendampingi Bank Sampah yang Nyaris Berhenti',
		summary: 'Bank sampah yang sudah berjalan empat tahun hampir tutup karena pengurusnya kelelahan. Pendampingan kali ini tidak menambah program, melainkan menguranginya.',
		esgKey: 'pengurangan_sampah',
		location: 'Desa Panggungharjo, Bantul', peserta: 48, dayIndex: 190,
		outcome: { note: 'Jumlah pengurus aktif naik dari 3 menjadi 11 orang setelah pembagian tugas dirombak; setoran nasabah kembali naik dari 210 kg menjadi 640 kg per bulan.', metric: 'Setoran sampah per bulan', value: 640, unit: 'kg' },
		body: `Bank sampah ini sudah berjalan empat tahun ketika kami datang, dan sedang berada di titik terendahnya. Setoran nasabah turun terus, dan dari sebelas pengurus yang tercatat, hanya tiga yang masih benar-benar aktif. Ketiganya mengerjakan hampir semua hal: menimbang, mencatat, menjual, mengantar, dan mengurus administrasi.

Permintaan awal dari pengurus adalah pelatihan untuk menarik nasabah baru. Kami menunda permintaan itu dan meminta izin mengamati dulu selama tiga pekan. Yang kami lihat bukan masalah jumlah nasabah, melainkan tiga orang yang kelelahan berat dan sudah kehilangan alasan untuk melanjutkan. Menambah nasabah pada keadaan itu justru akan mempercepat berhentinya.

Kami mengusulkan sesuatu yang berlawanan dengan harapan mereka: mengurangi kegiatan, bukan menambah. Tiga program sampingan yang selama ini dijalankan dihentikan sementara. Tugas dipecah menjadi bagian kecil yang masing-masing tidak lebih dari dua jam per pekan, lalu ditawarkan kepada nasabah. Delapan orang bersedia, sebagian besar justru yang selama ini hanya datang menyetor tanpa pernah dilibatkan.

Enam bulan kemudian jumlah pengurus aktif menjadi sebelas orang, dan setoran naik kembali dari dua ratus sepuluh menjadi enam ratus empat puluh kilogram per bulan. Dua dari tiga program yang dihentikan sudah dijalankan lagi, kali ini oleh orang yang berbeda. Pelajaran yang kami bawa pulang cukup mengganggu: kami hampir saja memberikan pelatihan yang justru akan menghancurkan apa yang tersisa, semata karena itu yang diminta.`
	},
	{
		slug: 'madu-hutan-kalimantan-panen-lestari',
		status: STORY_STATUS.PERLU_REVISI,
		title: 'Madu Hutan Kalimantan dan Kesepakatan Panen Lestari',
		summary: 'Permintaan madu yang naik tajam sempat mendorong panen berlebihan, sampai kelompok pemanen menyepakati aturan yang mereka susun sendiri.',
		esgKey: 'mobilitas_sosial',
		location: 'Kabupaten Kapuas Hulu, Kalimantan Barat', peserta: 17, dayIndex: 194,
		outcome: { note: 'Disepakati aturan panen bersama berisi batas pengambilan dan larangan panen pada dua bulan tertentu; hasil panen per sarang tetap stabil pada musim berikutnya sementara harga jual naik 40 persen.', metric: 'Pemanen menyepakati aturan', value: 17, unit: 'orang' },
		body: `Selama bertahun-tahun madu hutan dari daerah kami dijual dengan harga rendah kepada pengumpul yang datang beberapa bulan sekali. Ketika akhirnya kami bisa menjual langsung dengan harga jauh lebih baik, permintaan naik cepat, dan bersamanya muncul persoalan yang tidak kami perkirakan.

Beberapa pemanen mulai mengambil terlalu banyak dari satu sarang, dan ada yang memanen di musim yang seharusnya dilewati. Alasannya bisa dimengerti: harga sedang bagus dan tidak ada yang tahu sampai kapan. Tetapi pemanen yang lebih tua sudah melihat pola ini sebelumnya di daerah lain, dan mereka yang pertama kali mengangkat persoalannya dalam pertemuan kelompok.

Pertemuan itu berlangsung panjang dan sempat memanas. Yang paling sulit bukan menyepakati bahwa aturan diperlukan, melainkan menentukan siapa yang berhak menegakkannya. Kami menolak gagasan menunjuk pengawas dari luar, karena orang luar tidak akan tahu kondisi setiap sarang dan tidak akan menanggung akibatnya bila salah. Akhirnya disepakati pengawasan dilakukan bergantian antarsesama pemanen.

Aturan yang tersusun memuat batas pengambilan per sarang, larangan panen pada dua bulan tertentu, dan kewajiban melaporkan lokasi sarang baru kepada kelompok. Musim berikutnya hasil panen per sarang tetap stabil, sementara harga jual naik empat puluh persen. Kami sadar aturan ini akan benar-benar diuji ketika harga naik lebih tinggi lagi, dan itulah sebabnya kesepakatannya dituliskan dan ditandatangani, bukan sekadar disepakati lisan.`
	},
	{
		slug: 'jejak-karbon-acara-komunitas',
		status: STORY_STATUS.DRAFT,
		title: 'Menghitung Jejak Karbon Acara Komunitas: Sebuah Percobaan Jujur',
		summary: 'Kami mencoba menghitung emisi dari satu pertemuan komunitas, dan menemukan bahwa bagian terbesarnya bukan dari hal yang kami duga.',
		esgKey: 'edukasi_iklim',
		location: 'Jakarta Selatan', peserta: 15, dayIndex: 201,
		outcome: { note: 'Perhitungan awal menunjukkan 78 persen emisi acara berasal dari perjalanan peserta, bukan dari konsumsi maupun listrik ruangan; hasil ini menjadi dasar usulan menggelar pertemuan secara daring untuk agenda rutin.', metric: 'Porsi emisi dari perjalanan peserta', value: 78, unit: 'persen' },
		body: `Naskah ini masih kami susun dan angkanya belum kami anggap final. Kami menuliskannya lebih awal karena prosesnya sendiri yang menurut kami layak dibagikan, termasuk bagian yang belum selesai dan asumsi yang masih kami perdebatkan.

Perhitungan dilakukan untuk satu pertemuan komunitas berdurasi setengah hari dengan seratus dua puluh peserta. Kami membagi sumber emisi menjadi empat: perjalanan peserta, konsumsi, listrik ruangan, dan bahan cetak. Data perjalanan dikumpulkan lewat pertanyaan sederhana pada formulir pendaftaran ulang: dari kota mana, dengan moda apa.

Hasil sementara cukup mengubah cara kami memandang acara sendiri. Tujuh puluh delapan persen emisi berasal dari perjalanan peserta, terutama dari mereka yang datang dengan pesawat dari luar Jawa. Konsumsi dan listrik ruangan, dua hal yang paling sering menjadi sorotan pada acara ramah lingkungan, ternyata porsinya kecil. Selama ini kami merasa sudah berbuat banyak dengan meniadakan botol plastik sekali pakai, padahal dampaknya jauh lebih kecil dari yang kami bayangkan.

Yang masih kami perdebatkan adalah kesimpulan apa yang pantas ditarik dari angka ini. Menggelar seluruh pertemuan secara daring akan memangkas sebagian besar emisi, tetapi juga menghapus nilai pertemuan tatap muka yang tidak bisa digantikan, terutama bagi anggota dari luar Jawa yang justru paling jarang bertemu siapa pun. Kami belum punya jawaban, dan cerita ini akan kami lanjutkan setelah pembahasan berikutnya.`
	},
	{
		slug: 'kelas-menulis-cerita-dampak-pf12',
		status: STORY_STATUS.DIARSIPKAN,
		archiveReason: STORY_ARCHIVE_REASON.PERMINTAAN_ANGGOTA,
		title: 'Kelas Menulis Cerita Dampak untuk Anggota Chapter PF 12',
		summary: 'Catatan pelaksanaan kelas menulis yang ditarik penulisnya karena memuat kutipan peserta yang belum dimintai persetujuan.',
		esgKey: 'upskilling',
		location: 'Daring', peserta: 24, dayIndex: 168,
		outcome: { note: 'Dua puluh empat peserta menyelesaikan satu naskah cerita dampak; tujuh naskah kemudian diajukan ke ruang cerita Pfriends.', metric: 'Naskah dihasilkan', value: 24, unit: 'naskah' },
		body: `Cerita ini ditarik atas permintaan penulisnya sendiri dan disimpan sebagai arsip. Alasannya tercatat pada jejak audit: naskah memuat kutipan langsung dari tiga peserta kelas yang belum dimintai persetujuan publikasi. Penulis menyadarinya sendiri setelah naskah diajukan, dan meminta penarikan sebelum sempat ditinjau.

Isi kelasnya sendiri berjalan baik. Dua puluh empat anggota chapter PF 12 mengikuti empat pertemuan yang membahas satu hal pokok: perbedaan antara melaporkan jalannya kegiatan dan menuliskan perubahan yang terjadi. Sebagian besar peserta terbiasa menulis laporan kegiatan yang berisi susunan acara dan daftar hadir, dan kesulitan terbesar mereka adalah menemukan apa sebenarnya yang berubah setelah kegiatan itu.

Latihan utama kelas ini sederhana. Setiap peserta menuliskan satu kegiatan yang pernah mereka jalankan, lalu diminta menghapus seluruh kalimat yang hanya menceritakan apa yang terjadi tanpa menyebut akibatnya. Sebagian besar naskah menyusut lebih dari separuh, dan sisa yang tertinggal itulah yang menjadi bahan cerita sesungguhnya.

Tujuh naskah dari kelas ini kemudian diajukan ke ruang cerita Pfriends dan sebagian sudah tayang. Penarikan cerita tentang kelasnya sendiri justru menjadi bahan ajar yang tidak direncanakan: pada kelas berikutnya, pemeriksaan persetujuan atas setiap kutipan orang lain dimasukkan sebagai langkah wajib sebelum naskah boleh diajukan.`
	},
	{
		slug: 'bibit-trembesi-desa-cikadu',
		status: STORY_STATUS.TERPUBLIKASI,
		title: 'Bibit Trembesi di Sepanjang Jalan Desa Cikadu',
		summary: 'Empat ratus bibit trembesi ditanam di sepanjang jalan desa, dengan satu pohon diampu satu keluarga yang namanya dicatat pada papan pemantauan.',
		esgKey: 'aksi_lingkungan_lokal',
		location: 'Desa Cikadu, Kabupaten Bandung Barat', peserta: 88, dayIndex: 122,
		outcome: { note: 'Dari 400 bibit yang ditanam, 371 hidup pada pemantauan bulan kelima; sistem satu keluarga satu pohon membuat penyiraman musim kemarau berjalan tanpa jadwal terpusat.', metric: 'Bibit trembesi hidup', value: 371, unit: 'batang' },
		body: `Jalan desa sepanjang dua kilometer ini tidak punya satu pun pohon peneduh. Pada musim kemarau, anak-anak yang berjalan kaki ke sekolah menempuhnya di bawah matahari penuh, dan warga yang berdagang di pinggir jalan harus memasang terpal setiap hari. Usulan menanam pohon sudah beberapa kali muncul dalam musyawarah desa dan selalu berhenti pada pertanyaan yang sama: siapa yang akan menyiram.

Pertanyaan itu yang kami jadikan titik awal, bukan penanamannya. Sebelum satu bibit pun dibeli, kami mendata rumah di sepanjang jalan dan menawarkan satu hal: setiap keluarga mengampu pohon yang ditanam di depan rumahnya. Bukan menyumbang, bukan sekadar mengizinkan, tetapi mengampu: menyiram, memasang pelindung, dan melaporkan kondisinya.

Delapan puluh delapan keluarga bersedia. Bagi rumah yang berjarak jauh dari jalan, satu keluarga mengampu dua sampai tiga pohon. Nama pengampu ditulis pada papan pemantauan yang dipasang di balai desa, lengkap dengan nomor pohonnya. Papan itu bukan untuk mempermalukan siapa pun, melainkan supaya jelas siapa yang bisa dimintai kabar ketika ada pohon yang terlihat layu.

Pada pemantauan bulan kelima, tiga ratus tujuh puluh satu dari empat ratus bibit masih hidup. Musim kemarau tahun ini adalah ujian pertamanya dan tidak ada satu pun jadwal penyiraman terpusat yang perlu disusun, karena masing-masing sudah tahu pohonnya sendiri. Dua puluh sembilan pohon yang mati sebagian besar berada di titik yang rumahnya kosong ditinggal pemiliknya merantau, dan itu sudah kami perhitungkan untuk penanaman tahap berikutnya.`
	}
]);

/**
 * Gabungan seluruh naskah cerita yang dipakai proses seed.
 * @type {readonly Record<string, any>[]}
 */
const NASKAH_CERITA = Object.freeze([...CERITA_TERBIT, ...CERITA_DALAM_PROSES]);

/**
 * Tujuh naskah tambahan yang menyebar merata di seluruh alur editorial.
 *
 * Dipisahkan dari `NASKAH_CERITA` karena diproses oleh generator yang berbeda :
 * `bangkitkanCeritaAlurEditorial()`, yang TIDAK menarik satu pun bilangan acak dan
 * dipanggil setelah buku besar poin selesai dibangkitkan. Menambahkannya ke
 * `NASKAH_CERITA` akan menyisipkan dua draw `rng()` per naskah tepat SEBELUM
 * generator aktivitas, dan total poin komunitas berubah tanpa satu baris pun
 * menyentuh perhitungan poin.
 *
 * Sebaran statusnya disengaja: verifikator yang membuka antreannya saat peragaan
 * harus menemukan naskah pada setiap tahap: yang baru masuk, yang sedang
 * dipegang, yang dikembalikan, dan yang tinggal menunggu jadwal terbit.
 *
 * `penulisUrut` menunjuk posisi penulis pada daftar kandidat yang diurutkan
 * menurut id awardee. Angka tetap, bukan hasil acak, supaya kepengarangan naskah
 * ini tidak berpindah orang setiap kali data dibangun ulang.
 *
 * @type {readonly Record<string, any>[]}
 */
const CERITA_ALUR_EDITORIAL = Object.freeze([
	{
		slug: 'pompa-air-tenaga-surya-kebun-sayur-garut',
		status: STORY_STATUS.TERPUBLIKASI,
		title: 'Pompa Air Tenaga Surya dan Kebun Sayur yang Bertahan di Musim Kemarau',
		summary: 'Sembilan petani sayur di Garut mengganti pompa berbahan bakar solar dengan pompa tenaga surya, dan yang paling berubah bukan biayanya melainkan jam kerja mereka.',
		esgKey: 'kampanye_energi_bersih',
		location: 'Kecamatan Cikajang, Garut', peserta: 9, dayIndex: 168, penulisUrut: 3,
		outcome: { note: 'Sembilan kebun beralih ke pompa tenaga surya; pengeluaran bahan bakar turun rata-rata Rp420 ribu per bulan per kebun dan penyiraman tidak lagi tergantung pasokan solar yang sering kosong di kios desa.', metric: 'Kebun beralih ke pompa surya', value: 9, unit: 'kebun' },
		body: `Kebun sayur di lereng Cikajang berada tiga ratus meter di atas sumber airnya. Selama bertahun-tahun air dinaikkan dengan pompa berbahan bakar solar yang harus dibeli di kios desa, dan kios itu sering kosong justru pada musim kemarau ketika air paling dibutuhkan. Ketika solar tidak ada, penyiraman berhenti, dan tanaman yang sudah dua bulan dirawat bisa habis dalam sepekan.

Gagasan mengganti dengan pompa tenaga surya sebenarnya sudah lama terdengar, tetapi selalu terhenti pada satu pertanyaan yang wajar: berapa biayanya dan berapa lama kembali. Kami tidak menjawabnya dengan brosur. Selama satu bulan penuh, sembilan petani mencatat berapa liter solar yang mereka beli, berapa jam pompa menyala, dan berapa kali penyiraman batal karena solar habis. Catatan itu yang kemudian dipakai menghitung.

Hasil hitungannya membuat perdebatan selesai lebih cepat dari dugaan kami. Pengeluaran bahan bakar rata-rata empat ratus dua puluh ribu rupiah per bulan per kebun, dan itu belum menghitung kerugian dari penyiraman yang batal. Pemasangan dikerjakan bersama, dengan dua petani yang ikut belajar memasang panel dan mengukur arus agar perbaikan kecil tidak selalu menunggu teknisi dari kota.

Yang paling sering disebut petani setelah tiga bulan berjalan justru bukan penghematannya. Pompa surya menyala sendiri sejak matahari naik, sehingga tidak ada lagi yang harus datang pagi buta hanya untuk menghidupkan mesin. Waktu itu kembali menjadi milik mereka, dan bagi orang yang kebunnya berjarak satu jam berjalan kaki, itu perubahan yang jauh lebih terasa daripada angka di catatan pengeluaran.`
	},
	{
		slug: 'koperasi-simpan-pinjam-perempuan-lombok',
		status: STORY_STATUS.DISETUJUI,
		title: 'Koperasi Simpanan Perempuan Lombok dan Aturan yang Ditulis Sendiri',
		summary: 'Dua puluh delapan perempuan pelaku usaha menyusun sendiri aturan simpan pinjam kelompoknya, dan aturan pertama yang mereka sepakati adalah batas pinjaman untuk diri sendiri.',
		esgKey: 'pertumbuhan_womenpreneur',
		location: 'Kecamatan Praya, Lombok Tengah', peserta: 28, dayIndex: 185, penulisUrut: 8,
		outcome: { note: 'Terkumpul simpanan Rp41,2 juta dalam lima bulan dengan tingkat pengembalian 100 persen; sembilan belas anggota memakai pinjamannya untuk menambah stok bahan baku, bukan untuk kebutuhan konsumtif.', metric: 'Simpanan terkumpul', value: 41, unit: 'juta rupiah' },
		body: `Kami memulai bukan karena tidak ada pemberi pinjaman di desa ini. Justru sebaliknya, terlalu banyak: dan hampir semuanya menagih harian dengan bunga yang tidak pernah dijelaskan di muka. Yang tidak ada adalah tempat meminjam yang aturannya kami pahami sepenuhnya sejak awal.

Pendampingan yang kami ikuti tidak datang membawa anggaran dasar yang tinggal ditandatangani. Fasilitatornya justru menolak menuliskan aturan untuk kami, dan meminta kami menyusunnya sendiri lewat empat pertemuan. Melelahkan, dan ada yang sempat mundur karena merasa terlalu berbelit. Tetapi aturan yang kami tulis sendiri ternyata jauh lebih sulit dilanggar daripada aturan yang diberikan orang lain.

Aturan pertama yang kami sepakati mengejutkan pendamping kami sendiri: batas pinjaman maksimum berlaku juga bagi pengurus, tanpa pengecualian, dan pengurus yang meminjam harus disetujui dua pengurus lain. Kami menuliskannya karena semua orang di ruangan itu pernah melihat kelompok tetangga bubar persis karena hal itu. Aturan kedua: pinjaman untuk keperluan usaha didahulukan, dan peminjam menyebutkan untuk apa uangnya.

Lima bulan berjalan, simpanan terkumpul empat puluh satu koma dua juta rupiah dan seluruh pinjaman kembali tepat waktu. Sembilan belas dari dua puluh delapan anggota memakainya untuk menambah stok bahan baku menjelang musim ramai. Kami tahu angka ini masih kecil dan tahun pertama selalu yang paling mudah. Karena itu yang sedang kami siapkan sekarang bukan penambahan modal, melainkan pemeriksaan pembukuan oleh anggota di luar pengurus setiap tiga bulan.`
	},
	{
		slug: 'kelas-daur-ulang-seragam-sekolah-bekas',
		status: STORY_STATUS.REVIEW,
		title: 'Seragam Sekolah Bekas yang Tidak Jadi Sampah di Cirebon',
		summary: 'Satu sekolah menengah mengumpulkan seragam bekas lulusannya dan menyalurkannya kembali, setelah lebih dulu memastikan penerimanya tidak merasa dipermalukan.',
		esgKey: 'pengurangan_sampah',
		location: 'Kota Cirebon, Jawa Barat', peserta: 148, dayIndex: 191, penulisUrut: 14,
		outcome: { note: 'Terkumpul 612 potong seragam layak pakai dalam satu bulan; 148 siswa menerimanya lewat mekanisme yang dirancang bersama OSIS agar penerima tidak dapat dikenali di lingkungan sekolah.', metric: 'Seragam layak pakai tersalurkan', value: 612, unit: 'potong' },
		body: `Setiap tahun lulusan meninggalkan seragam yang masih layak pakai, dan setiap tahun sebagian besar berakhir sebagai kain lap atau dibuang. Sementara itu di sekolah yang sama ada siswa yang memakai seragam kekecilan sepanjang tahun karena membeli yang baru bukan hal yang mudah bagi keluarganya. Dua kenyataan itu berjarak beberapa ratus meter dan tidak pernah bertemu.

Bagian tersulit dari gagasan ini bukan mengumpulkan seragamnya. Kami sempat menyiapkan pembagian di aula dengan daftar nama penerima, sampai seorang guru bimbingan konseling mengingatkan bahwa cara itu akan membuat penerimanya ditandai teman-temannya seumur sekolah. Rencana itu dibatalkan seluruhnya, dan penyusunan ulang mekanismenya memakan waktu lebih lama daripada pengumpulannya.

Bentuk akhirnya disusun bersama pengurus OSIS. Seragam ditempatkan di ruang koperasi sekolah yang memang setiap hari didatangi banyak siswa untuk berbagai keperluan, dan siapa pun boleh mengambil tanpa mencatatkan nama. Kami sempat khawatir akan diambil berlebihan, dan itu tidak terjadi. Dalam satu bulan enam ratus dua belas potong tersalurkan, dan yang tersisa hanya ukuran yang memang jarang dibutuhkan.

Yang kami catat sebagai pelajaran adalah bahwa program bantuan paling mudah gagal bukan pada logistiknya. Sekolah lain yang menghubungi kami selalu bertanya soal cara mengumpulkan seragam, padahal bagian itu selesai dalam dua pekan. Yang perlu waktu paling lama, dan yang paling menentukan apakah program ini pantas ditiru, adalah memastikan penerimanya tidak membayar bantuan itu dengan rasa malu.`
	},
	{
		slug: 'pendampingan-warung-pinggir-kampus-pontianak',
		status: STORY_STATUS.PERLU_REVISI,
		title: 'Enam Warung di Pinggir Kampus dan Menu yang Akhirnya Dipangkas',
		summary: 'Pendampingan enam warung makan mahasiswa berakhir dengan keputusan yang berlawanan dengan dugaan awal: mengurangi jumlah menu, bukan menambahnya.',
		esgKey: 'mentoring_lintas_komunitas',
		location: 'Pontianak, Kalimantan Barat', peserta: 6, dayIndex: 194, penulisUrut: 21,
		outcome: { note: 'Enam warung memangkas menu dari rata-rata 23 menjadi 9 pilihan; susut bahan baku turun dari 18 persen menjadi 6 persen dan waktu penyajian turun dari 14 menjadi 6 menit per pesanan.', metric: 'Penurunan susut bahan baku', value: 12, unit: 'poin persentase' },
		body: `Enam pemilik warung di sekitar kampus meminta pendampingan dengan permintaan yang seragam: mereka ingin menambah menu supaya lebih banyak mahasiswa mampir. Kami hampir menuruti permintaan itu, karena memang begitu yang diminta dan memang itu yang paling mudah dikerjakan.

Sebelum menambah apa pun, kami meminta setiap warung mencatat dua pekan penuh: apa yang dipesan, apa yang tersisa di akhir hari, dan berapa lama satu pesanan disajikan. Catatan itu membalik seluruh rencana. Dari rata-rata dua puluh tiga menu yang ditawarkan, tujuh menu menyumbang delapan puluh persen pesanan. Sisanya jarang dipesan tetapi tetap menuntut bahan baku yang harus disiapkan setiap hari dan sebagian besar terbuang.

Keputusan memangkas menu tidak diterima dengan mudah. Ada kekhawatiran kehilangan pelanggan yang mencari menu tertentu, dan kekhawatiran itu masuk akal. Kami menyepakati percobaan empat pekan dengan sembilan menu saja, dengan catatan bila penjualan turun, keputusan dibatalkan tanpa perdebatan.

Penjualan tidak turun. Susut bahan baku turun dari delapan belas persen menjadi enam persen, dan waktu penyajian dari empat belas menit menjadi enam menit: yang ternyata paling berpengaruh, karena mahasiswa yang mengantre lama sebelumnya banyak yang pergi. Satu warung memutuskan kembali menambah dua menu setelah percobaan berakhir, dan itu haknya. Yang berubah adalah keputusannya kini diambil dari catatan, bukan dari dugaan.`
	},
	{
		slug: 'jam-belajar-malam-anak-nelayan-tegal',
		status: STORY_STATUS.DIAJUKAN,
		title: 'Jam Belajar Malam untuk Anak Nelayan di Tegal',
		summary: 'Ruang belajar malam yang dijalankan bergantian oleh alumni dan orang tua sendiri, dimulai dari satu teras rumah dan satu lampu tambahan.',
		esgKey: 'mobilitas_sosial',
		location: 'Kelurahan Tegalsari, Tegal', peserta: 34, dayIndex: 196, penulisUrut: 27,
		outcome: { note: 'Tiga puluh empat anak mengikuti jam belajar malam tiga kali sepekan selama empat bulan; dua puluh tiga di antaranya naik nilai rapor pada mata pelajaran yang paling sering ditanyakan, yaitu matematika.', metric: 'Anak mengikuti jam belajar', value: 34, unit: 'anak' },
		body: `Sebagian besar orang tua di kampung nelayan ini berangkat melaut sore hari dan pulang menjelang subuh. Anak-anak mereka belajar sendiri di rumah yang sepi, dan ketika ada soal yang tidak dipahami, tidak ada tempat bertanya sampai keesokan siang. Bukan soal kemauan; hanya soal jam kerja yang berlawanan.

Kami mulai dari satu teras rumah, satu lampu tambahan, dan empat anak yang kebetulan bertetangga. Tidak ada peresmian dan tidak ada proposal. Pekan kedua jumlahnya menjadi sebelas, dan pada bulan kedua terasnya sudah tidak cukup sehingga pindah ke balai RW yang selama ini kosong pada malam hari.

Yang membuat kegiatan ini bertahan bukan alumni yang mengajarnya, melainkan keputusan pada bulan ketiga untuk melibatkan orang tua yang tidak melaut malam itu sebagai penjaga giliran. Awalnya karena kami kekurangan orang, dan belakangan justru menjadi bagian yang paling penting: kegiatan yang seluruhnya bergantung pada orang luar akan berhenti pada hari orang luar itu berhenti datang.

Empat bulan berjalan, tiga puluh empat anak mengikuti secara rutin tiga kali sepekan. Dua puluh tiga di antaranya naik nilai rapornya pada matematika, mata pelajaran yang paling sering ditanyakan. Kami sengaja tidak melaporkan angka itu sebagai keberhasilan tunggal, karena sebelas anak lainnya tidak berubah nilainya sama sekali dan sebagian besar dari mereka adalah yang paling jarang hadir. Itu yang sedang kami cari tahu penyebabnya sebelum menambah hari.`
	},
	{
		slug: 'peta-titik-banjir-swadaya-samarinda',
		status: STORY_STATUS.DIAJUKAN,
		title: 'Peta Titik Banjir yang Disusun Warga Samarinda Sendiri',
		summary: 'Empat puluh satu warga mencatat tinggi genangan di lingkungannya selama satu musim hujan, dan peta hasilnya dipakai kelurahan menyusun prioritas perbaikan saluran.',
		esgKey: 'aksi_lingkungan_lokal',
		location: 'Kecamatan Sungai Kunjang, Samarinda', peserta: 41, dayIndex: 197, penulisUrut: 33,
		outcome: { note: 'Terkumpul 268 catatan genangan dari 41 pencatat selama satu musim hujan; kelurahan memakai peta hasilnya untuk mengubah urutan prioritas perbaikan saluran pada tiga titik.', metric: 'Catatan genangan terkumpul', value: 268, unit: 'catatan' },
		body: `Setiap musim hujan lingkungan kami tergenang, dan setiap tahun perbaikan saluran dikerjakan di titik yang sama. Ketika kami menanyakan dasarnya, jawabannya jujur: tidak ada data, yang ada hanya laporan warga yang paling sering datang mengeluh. Titik yang warganya jarang melapor tidak pernah masuk daftar.

Kami memutuskan mengumpulkan datanya sendiri dengan cara yang paling sederhana yang bisa dijalankan siapa pun. Setiap pencatat memasang satu tongkat berskala di depan rumahnya, memotret genangan beserta tongkatnya, dan mengirimkan foto berikut jam kejadian ke satu grup percakapan. Tidak ada aplikasi, tidak ada formulir panjang, dan itu disengaja: pencatatan yang merepotkan akan berhenti pada pekan ketiga.

Empat puluh satu warga ikut mencatat sepanjang musim hujan, terkumpul dua ratus enam puluh delapan catatan. Yang terlihat dari kumpulan itu tidak sepenuhnya kami duga. Titik yang paling sering tergenang ternyata bukan yang paling ramai dikeluhkan, dan satu titik yang selama ini rutin diperbaiki justru genangannya paling cepat surut.

Peta hasilnya kami serahkan ke kelurahan lengkap dengan seluruh fotonya, bukan hanya kesimpulannya. Tiga titik prioritas perbaikan berubah urutannya setelah pembahasan. Kami tidak mengklaim banjirnya selesai, karena tentu saja belum. Yang berubah adalah percakapan tentang perbaikan saluran kini dimulai dari catatan yang bisa diperiksa siapa saja, bukan dari siapa yang paling keras bersuara.`
	},
	{
		slug: 'arsip-resep-warisan-dapur-manado',
		status: STORY_STATUS.DRAFT,
		title: 'Mengarsipkan Resep Warisan Dapur Manado Sebelum Pemiliknya Tiada',
		summary: 'Catatan awal dari upaya mendokumentasikan resep masakan yang selama ini hanya diturunkan lisan, ditulis sambil proses pendataannya masih berjalan.',
		esgKey: 'perkembangan_alumni',
		location: 'Manado, Sulawesi Utara', peserta: 12, dayIndex: 198, penulisUrut: 40,
		outcome: { note: 'Dua belas resep terdokumentasi lengkap dengan takaran terukur dari total tiga puluh yang ditargetkan; pendataan masih berjalan dan naskah ini akan dilengkapi setelah tahap kedua selesai.', metric: 'Resep terdokumentasi', value: 12, unit: 'resep' },
		body: `Catatan ini belum selesai dan saya menuliskannya justru karena belum selesai. Pendataan yang sedang saya kerjakan berpacu dengan usia orang-orang yang menyimpan pengetahuannya, dan menunggu sampai semuanya rampung terasa bukan pilihan yang bijak.

Yang saya kerjakan sederhana pada permukaannya: mendatangi dua belas ibu yang masih memasak dengan cara lama, memasak bersama mereka, dan menimbang setiap bahan yang selama ini hanya disebut dengan ukuran perasaan. Satu genggam, secukupnya, sampai terasa pas. Menerjemahkan ukuran semacam itu menjadi gram dan mililiter ternyata pekerjaan yang jauh lebih lambat dari dugaan saya, karena hasil terjemahan harus dimasak ulang untuk diperiksa apakah rasanya masih sama.

Sampai hari ini dua belas resep sudah terdokumentasi lengkap dari tiga puluh yang saya targetkan. Ada dua resep yang terpaksa saya tinggalkan karena pemiliknya jatuh sakit sebelum sempat kami masak bersama, dan itu bagian yang paling saya sesali dari seluruh proses ini.

Saya akan melengkapi catatan ini setelah tahap kedua selesai, termasuk bagian yang belum saya putuskan: siapa yang berhak atas resep-resep ini setelah dibukukan, dan bagaimana memastikan yang mewariskannya tetap dikenali namanya bila kelak ada yang memakainya untuk usaha.`
	},
	{
		slug: 'bank-sampah-pasar-pagi-banjarmasin',
		status: STORY_STATUS.REVIEW,
		title: 'Bank Sampah Pasar Pagi yang Dikelola Pedagang Banjarmasin',
		summary: 'Pedagang pasar menyusun jadwal pengumpulan dan pencatatan sampah kemasan agar program tetap berjalan tanpa bergantung pada relawan.',
		esgKey: 'pengurangan_sampah',
		location: 'Banjarmasin, Kalimantan Selatan', peserta: 37, dayIndex: 199, penulisUrut: 11,
		outcome: { note: 'Tiga puluh tujuh pedagang mengumpulkan 486 kilogram kemasan dalam delapan pekan dan memakai hasil penjualannya untuk membeli alat kebersihan bersama.', metric: 'Sampah kemasan terkumpul', value: 486, unit: 'kilogram' },
		body: `Pasar pagi menghasilkan banyak kardus, botol, dan kemasan plastik setiap hari. Selama ini semua bahan itu bercampur dengan sampah basah sehingga nilainya hilang dan petugas kebersihan harus mengangkut volume yang lebih besar. Kami memulai percobaan bersama enam pedagang dengan menempatkan karung terpisah di belakang kios masing masing.

Pekan pertama memperlihatkan masalah yang tidak kami perkirakan. Karung cepat penuh, tetapi tidak ada orang yang bersedia membawanya ke titik timbang. Kami lalu menyusun jadwal bergilir dan mencatat berat dari setiap blok pasar. Pencatatan dibuat terbuka di papan dekat pos keamanan agar semua pedagang dapat melihat hasilnya.

Dalam delapan pekan jumlah peserta bertambah menjadi tiga puluh tujuh pedagang. Sampah kemasan yang terkumpul mencapai empat ratus delapan puluh enam kilogram. Uang hasil penjualan tidak dibagikan, melainkan dipakai membeli sapu, sarung tangan, dan wadah angkut yang dapat digunakan bersama.

Hal penting dari percobaan ini bukan hanya jumlah sampahnya. Pengelolaan sekarang dilakukan oleh pedagang melalui jadwal yang mereka sepakati sendiri. Relawan hanya membantu pada tahap awal dan tidak lagi menjadi penentu apakah kegiatan berjalan pada hari tertentu.`
	},
	{
		slug: 'kelas-keuangan-pedagang-kecil-kendari',
		status: STORY_STATUS.PERLU_REVISI,
		title: 'Catatan Harian Keuangan untuk Pedagang Kecil Kendari',
		summary: 'Delapan belas pedagang mencoba pencatatan sederhana untuk memisahkan uang usaha dan kebutuhan rumah tangga.',
		esgKey: 'pertumbuhan_womenpreneur',
		location: 'Kendari, Sulawesi Tenggara', peserta: 18, dayIndex: 200, penulisUrut: 18,
		outcome: { note: 'Empat belas dari delapan belas peserta mencatat transaksi secara rutin selama enam pekan dan sebelas peserta mulai memisahkan uang usaha dari belanja rumah tangga.', metric: 'Peserta rutin mencatat', value: 14, unit: 'orang' },
		body: `Pertemuan pertama dimulai dengan pertanyaan sederhana tentang keuntungan harian. Hampir semua peserta dapat menyebutkan jumlah uang yang masuk, tetapi kesulitan menjelaskan berapa yang tersisa setelah bahan baku, ongkos perjalanan, dan kebutuhan rumah tangga dibayar. Uang usaha dan uang keluarga bergerak melalui dompet yang sama.

Kami tidak memperkenalkan aplikasi. Setiap peserta menerima buku kecil dengan tiga kolom untuk uang masuk, uang keluar, dan tujuan pengeluaran. Bentuk ini dipilih setelah mencoba lembar yang lebih rinci dan mendapati peserta berhenti mengisi pada hari ketiga.

Selama enam pekan, empat belas dari delapan belas peserta mencatat secara rutin. Sebelas peserta mulai menyimpan uang usaha dalam tempat yang berbeda. Empat peserta belum konsisten karena anggota keluarga lain juga melayani pembeli dan tidak selalu menulis transaksi.

Catatan Verifikator meminta naskah ini menjelaskan perubahan pendapatan dengan bukti yang lebih terukur. Bagian tersebut masih perlu dilengkapi karena tujuan awal kegiatan adalah membangun kebiasaan pencatatan, bukan menjanjikan kenaikan pendapatan dalam waktu singkat. Data lanjutan sedang dikumpulkan sebelum tulisan dikirim kembali.`
	},
	{
		slug: 'kebun-bibit-warga-bogor',
		status: STORY_STATUS.DRAFT,
		title: 'Kebun Bibit Warga di Lahan Kosong Bogor',
		summary: 'Draf awal tentang pemanfaatan lahan kosong sebagai tempat pembibitan tanaman pangan untuk warga sekitar.',
		esgKey: 'aksi_lingkungan_lokal',
		location: 'Bogor, Jawa Barat', peserta: 22, dayIndex: 201, penulisUrut: 25,
		outcome: { note: 'Sebanyak dua ratus bibit mulai disiapkan oleh dua puluh dua warga untuk dibagikan setelah masa perawatan pertama selesai.', metric: 'Bibit disiapkan', value: 200, unit: 'bibit' },
		body: `Lahan kosong di belakang balai warga lama dipenuhi rumput dan menjadi tempat pembuangan barang yang tidak terpakai. Bulan ini kami mulai membersihkannya bersama dan menyiapkan rak sederhana untuk pembibitan cabai, tomat, serta tanaman obat.

Dua puluh dua warga sudah mengambil jadwal perawatan. Sekitar dua ratus bibit sedang tumbuh, tetapi belum semuanya cukup kuat untuk dibagikan. Tulisan ini masih berupa draf karena hasil tahap pertama baru dapat dihitung setelah bibit melewati masa perawatan dan diterima oleh keluarga yang akan menanamnya.

Bagian berikutnya akan mencatat jumlah bibit yang bertahan, keluarga penerima, dan cara kelompok menjaga ketersediaan benih untuk putaran berikutnya.`
	}
]);

/* ────────────────────────────────────────────────────────────────────────────
 * 8. KATALOG PENUKARAN DAN LENCANA
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Dua belas item katalog penukaran (Hal 5 pilar 05).
 *
 * `priceCoins` adalah harga dalam Koin Tukar, bukan Poin Kontribusi: dua mata
 * uang yang sengaja dipisahkan supaya seorang Champion tidak turun tier hanya
 * karena menukarkan hadiah. Harga di sini adalah data katalog, bukan turunan
 * ambang tier, sehingga nilainya memang ditetapkan langsung.
 *
 * `minTierLevel` selalu merujuk `TierLevel`, tidak pernah angka poin.
 *
 * @type {readonly Record<string, any>[]}
 */
const KATALOG_PENGHARGAAN = Object.freeze([
	{
		id: 'RWD-01', name: 'Tumbler Stainless Pfriends', category: REWARD_CATEGORY.MERCHANDISE,
		description: 'Tumbler baja tahan karat 500 ml berlogo komunitas, dikirim ke alamat anggota.',
		priceCoins: 60, minTierLevel: TierLevel.NEWCOMER, monthlyQuota: 40, redeemedThisMonth: 17,
		fulfillmentNote: 'Dikirim setiap awal bulan berikutnya melalui kurir reguler.'
	},
	{
		id: 'RWD-02', name: 'Tote Bag Kanvas Edisi Chapter', category: REWARD_CATEGORY.MERCHANDISE,
		description: 'Tas kanvas dengan sablon nomor chapter masing-masing. Tersedia untuk PF 10, PF 11, dan PF 12.',
		priceCoins: 45, minTierLevel: TierLevel.NEWCOMER, monthlyQuota: 60, redeemedThisMonth: 31,
		fulfillmentNote: 'Dikirim bersama pengiriman merchandise bulanan.'
	},
	{
		id: 'RWD-03', name: 'Voucher Kelas Daring Bersertifikat', category: REWARD_CATEGORY.UPSKILLING,
		description: 'Satu kelas daring bersertifikat dari mitra pelatihan Pertamina Foundation, bebas memilih topik yang tersedia.',
		priceCoins: 150, minTierLevel: TierLevel.ACTIVE_MEMBER, monthlyQuota: 25, redeemedThisMonth: 12,
		fulfillmentNote: 'Kode voucher dikirim ke surel anggota dalam tiga hari kerja.'
	},
	{
		id: 'RWD-04', name: 'Kelas Intensif Pemasaran Digital', category: REWARD_CATEGORY.UPSKILLING,
		description: 'Kelas intensif empat pertemuan bersama praktisi pemasaran digital, dengan pendampingan penyusunan kalender konten.',
		priceCoins: 320, minTierLevel: TierLevel.CONTRIBUTOR, monthlyQuota: 12, redeemedThisMonth: 9,
		requiresApproval: true,
		fulfillmentNote: 'Jadwal disepakati bersama peserta setelah kuota bulanan terisi.'
	},
	{
		id: 'RWD-05', name: 'Sesi Mentoring Satu Jam bersama Alumni Champion', category: REWARD_CATEGORY.MENTORING,
		description: 'Satu jam konsultasi daring dengan alumni bertier Champion sesuai bidang keahlian yang dibutuhkan.',
		priceCoins: 200, minTierLevel: TierLevel.ACTIVE_MEMBER, monthlyQuota: 20, redeemedThisMonth: 14,
		requiresApproval: true,
		fulfillmentNote: 'Pasangan mentor ditentukan berdasarkan kecocokan bidang, bukan urutan penukaran.'
	},
	{
		id: 'RWD-06', name: 'Klinik Bisnis Womenpreneur', category: REWARD_CATEGORY.MENTORING,
		description: 'Sesi pendampingan usaha dua jam bersama mentor PFpreneur, membahas satu kendala spesifik yang sedang dihadapi.',
		priceCoins: 260, minTierLevel: TierLevel.ACTIVE_MEMBER, community: CommunityType.WOMENPRENEUR,
		monthlyQuota: 15, redeemedThisMonth: 11, requiresApproval: true,
		fulfillmentNote: 'Anggota mengisi ringkasan kendala terlebih dahulu agar sesi langsung masuk ke pokok persoalan.'
	},
	{
		id: 'RWD-07', name: 'Sorotan Profil di Beranda Pfriends', category: REWARD_CATEGORY.PROFIL,
		description: 'Profil ditampilkan pada bagian sorotan anggota di beranda microsite selama dua pekan.',
		priceCoins: 180, minTierLevel: TierLevel.CONTRIBUTOR, monthlyQuota: 8, redeemedThisMonth: 6,
		requiresApproval: true,
		fulfillmentNote: 'Memerlukan persetujuan publikasi nama dan foto yang masih aktif.'
	},
	{
		id: 'RWD-08', name: 'Tautan Usaha di Direktori Komunitas', category: REWARD_CATEGORY.PROFIL,
		description: 'Penambahan tautan toko daring dan kontak usaha pada kartu direktori anggota.',
		priceCoins: 90, minTierLevel: TierLevel.ACTIVE_MEMBER, community: CommunityType.WOMENPRENEUR,
		monthlyQuota: null, redeemedThisMonth: 23,
		fulfillmentNote: 'Aktif dalam satu hari kerja setelah data usaha diperiksa.'
	},
	{
		id: 'RWD-09', name: 'Kursi Townhall Pertamina Foundation', category: REWARD_CATEGORY.UNDANGAN,
		description: 'Undangan menghadiri townhall tahunan Pertamina Foundation, termasuk sesi ramah tamah bersama pengurus.',
		priceCoins: 450, minTierLevel: TierLevel.FEATURED_CANDIDATE, monthlyQuota: 6, redeemedThisMonth: 6,
		requiresApproval: true, status: RewardStatus.HABIS,
		fulfillmentNote: 'Kuota bulan ini sudah terisi; penukaran dibuka kembali bulan depan.'
	},
	{
		id: 'RWD-10', name: 'Sertifikat Kontribusi Komunitas', category: REWARD_CATEGORY.SERTIFIKAT,
		description: 'Sertifikat resmi bertanda tangan Corporate Secretary yang memuat rekam kontribusi anggota sepanjang musim.',
		priceCoins: 120, minTierLevel: TierLevel.CONTRIBUTOR, monthlyQuota: null, redeemedThisMonth: 19,
		fulfillmentNote: 'Diterbitkan dalam bentuk digital bertanda tangan elektronik, dapat dicetak sendiri.'
	},
	{
		id: 'RWD-11', name: 'Donasi Bibit Pohon atas Nama Anda', category: REWARD_CATEGORY.DAMPAK,
		description: 'Sepuluh bibit pohon ditanam pada gerakan penghijauan terdekat, dicatat atas nama anggota yang menukar.',
		priceCoins: 100, minTierLevel: TierLevel.NEWCOMER, monthlyQuota: null, redeemedThisMonth: 28,
		fulfillmentNote: 'Laporan penanaman beserta titik lokasinya dikirim setelah penanaman terlaksana.'
	},
	{
		id: 'RWD-12', name: 'Beasiswa Mikro Pelatihan untuk Satu Warga', category: REWARD_CATEGORY.DAMPAK,
		description: 'Membiayai satu kursi pelatihan keterampilan bagi warga di sekitar lokasi gerakan komunitas.',
		priceCoins: 400, minTierLevel: TierLevel.CONTRIBUTOR, monthlyQuota: 10, redeemedThisMonth: 4,
		requiresApproval: true,
		fulfillmentNote: 'Penerima dipilih bersama penyelenggara gerakan setempat, bukan ditentukan sepihak.'
	}
]);

/**
 * Empat belas lencana pengakuan.
 *
 * `syarat` adalah fungsi predikat yang diuji terhadap rekam aktivitas awardee,
 * bukan daftar yang ditempelkan secara acak. Lencana yang dibagikan sembarangan
 * kehilangan seluruh maknanya, dan pada demo akan langsung terlihat janggal:
 * awardee bertier Newcomer yang memegang lencana kepemimpinan.
 *
 * @type {readonly Record<string, any>[]}
 */
const KATALOG_LENCANA = Object.freeze([
	{
		code: 'BDG_LANGKAH_AWAL', name: 'Langkah Awal', family: BadgeFamily.ONBOARDING,
		rarity: BadgeRarity.UMUM, icon: 'sparkles',
		criteria: 'Menyelesaikan pendaftaran dan mencatatkan aksi berpoin pertama.',
		syarat: (r) => r.total > 0
	},
	{
		code: 'BDG_PEMBACA_SETIA', name: 'Pembaca Setia', family: BadgeFamily.AMPLIFIKASI,
		rarity: BadgeRarity.UMUM, icon: 'book-open',
		criteria: 'Membaca sepuluh kabar mingguan Pfriends.',
		syarat: (r) => r.hitung(ActivityType.BROADCAST_VIEW) >= 10
	},
	{
		code: 'BDG_PENANGGAP', name: 'Penanggap Aktif', family: BadgeFamily.AMPLIFIKASI,
		rarity: BadgeRarity.UMUM, icon: 'chat-bubble',
		criteria: 'Menanggapi sepuluh ajakan ringan pada kabar komunitas.',
		syarat: (r) => r.hitung(ActivityType.CTA_REACT) >= 10
	},
	{
		code: 'BDG_CORONG_KOMUNITAS', name: 'Corong Komunitas', family: BadgeFamily.AMPLIFIKASI,
		rarity: BadgeRarity.LANGKA, icon: 'megaphone',
		criteria: 'Membagikan konten Pertamina Foundation ke media sosial publik sebanyak lima kali dengan bukti terverifikasi.',
		syarat: (r) => r.hitung(ActivityType.SHARE_PUBLIC) >= 5
	},
	{
		code: 'BDG_PENYAMBUNG_KABAR', name: 'Penyambung Kabar', family: BadgeFamily.AMPLIFIKASI,
		rarity: BadgeRarity.UMUM, icon: 'share',
		criteria: 'Meneruskan konten komunitas ke jaringan pribadi sebanyak delapan kali.',
		syarat: (r) => r.hitung(ActivityType.SHARE_PRIVATE) >= 8
	},
	{
		code: 'BDG_HADIR_TERUS', name: 'Selalu Hadir', family: BadgeFamily.KONSISTENSI,
		rarity: BadgeRarity.LANGKA, icon: 'calendar-check',
		criteria: 'Menghadiri lima sesi daring komunitas.',
		syarat: (r) => r.hitung(ActivityType.SESSION_ATTEND) >= 5
	},
	{
		code: 'BDG_RANTAI_PEKAN', name: 'Rantai Pekan', family: BadgeFamily.KONSISTENSI,
		rarity: BadgeRarity.LANGKA, icon: 'fire',
		criteria: 'Menjaga keaktifan selama enam pekan berturut-turut.',
		syarat: (r) => r.streak >= 6
	},
	{
		code: 'BDG_JURU_WARTA', name: 'Juru Warta', family: BadgeFamily.JURNALISME,
		rarity: BadgeRarity.LANGKA, icon: 'pencil',
		criteria: 'Mengirimkan dua cerita komunitas ke ruang cerita Pfriends.',
		syarat: (r) => r.hitung(ActivityType.STORY_SUBMIT) >= 2
	},
	{
		code: 'BDG_PENJAGA_PENGETAHUAN', name: 'Penjaga Pengetahuan', family: BadgeFamily.PENGETAHUAN,
		rarity: BadgeRarity.LANGKA, icon: 'light-bulb',
		criteria: 'Memberi empat pertanyaan atau jawaban yang dinilai bermanfaat oleh komunitas.',
		syarat: (r) => r.hitung(ActivityType.KNOWLEDGE_QA) >= 4
	},
	{
		code: 'BDG_MENTOR_SEJAWAT', name: 'Mentor Sejawat', family: BadgeFamily.MENTORING,
		rarity: BadgeRarity.EPIK, icon: 'users',
		criteria: 'Menjadi narasumber, mentor, atau fasilitator sebanyak dua kali.',
		syarat: (r) => r.hitung(ActivityType.SPEAKER_MENTOR) >= 2
	},
	{
		code: 'BDG_PENGGERAK_LAPANGAN', name: 'Penggerak Lapangan', family: BadgeFamily.KEPEMIMPINAN,
		rarity: BadgeRarity.EPIK, icon: 'flag',
		criteria: 'Memimpin minimal satu aksi atau kampanye lokal yang terdokumentasi.',
		syarat: (r) => r.hitung(ActivityType.LEAD_ACTION) >= 1
	},
	{
		code: 'BDG_SAHABAT_BUMI', name: 'Sahabat Bumi', family: BadgeFamily.LINGKUNGAN,
		rarity: BadgeRarity.EPIK, icon: 'globe',
		criteria: 'Memimpin dua aksi lingkungan dengan laporan hasil terukur.',
		syarat: (r) => r.hitung(ActivityType.LEAD_ACTION) >= 2
	},
	{
		code: 'BDG_TUMBUH_BERSAMA', name: 'Tumbuh Bersama', family: BadgeFamily.EKONOMI,
		rarity: BadgeRarity.LANGKA, icon: 'trending-up', community: CommunityType.WOMENPRENEUR,
		criteria: 'Pelaku usaha binaan yang mengikuti tiga kegiatan upskilling dan membagikan hasilnya kepada komunitas.',
		syarat: (r) => r.hitung(ActivityType.SESSION_ATTEND) >= 3 && r.hitung(ActivityType.STORY_SUBMIT) >= 1
	},
	{
		code: 'BDG_PILAR_KOMUNITAS', name: 'Pilar Komunitas', family: BadgeFamily.KEHORMATAN,
		rarity: BadgeRarity.LEGENDARIS, icon: 'trophy',
		criteria: 'Mencapai tier Champion sekaligus memimpin aksi dan menjadi mentor bagi anggota lain.',
		syarat: (r) =>
			r.tierLevel === TierLevel.CHAMPION &&
			r.hitung(ActivityType.LEAD_ACTION) >= 1 &&
			r.hitung(ActivityType.SPEAKER_MENTOR) >= 1
	}
]);

/* ────────────────────────────────────────────────────────────────────────────
 * 9. PEMBANGKIT: CONSENT
 * ──────────────────────────────────────────────────────────────────────────── */

/** Versi teks kebijakan yang berlaku pada data demo. */
const VERSI_KEBIJAKAN = 'PF-CONSENT-v1.2';

/**
 * Teks persetujuan disimpan utuh, bukan dirujuk lewat kode.
 *
 * Rekaman consent adalah bukti, dan bukti yang hanya menyimpan nomor versi akan
 * kehilangan artinya begitu teks kebijakannya diperbarui. Yang perlu dibuktikan
 * kelak adalah apa yang persis dibaca awardee saat menyetujui.
 *
 * @type {Readonly<Record<string, {purpose: string, statement: string, channels: readonly string[]}>>}
 */
const TEKS_CONSENT = Object.freeze({
	[ConsentType.PENGOLAHAN_DATA_INTERNAL]: {
		purpose: 'Pengelolaan keanggotaan komunitas Pfriends dan pelaporan internal Pertamina Foundation.',
		statement:
			'Saya menyetujui data keanggotaan saya diolah Pertamina Foundation untuk keperluan pengelolaan komunitas Pfriends, penyusunan laporan internal, dan pengukuran capaian program. Data ini tidak dipublikasikan dan tidak dibagikan kepada pihak di luar Pertamina Foundation tanpa persetujuan terpisah dari saya.',
		channels: [ConsentChannel.LAPORAN_INTERNAL]
	},
	[ConsentType.PUBLIKASI_NAMA]: {
		purpose: 'Penyebutan nama anggota pada konten publik komunitas Pfriends.',
		statement:
			'Saya menyetujui nama lengkap saya dicantumkan pada konten publik komunitas Pfriends, termasuk microsite, situs Pertamina Foundation, dan kanal media sosial resmi. Saya memahami persetujuan ini dapat saya cabut kapan saja tanpa perlu memberikan alasan.',
		channels: [ConsentChannel.MICROSITE_PFRIENDS, ConsentChannel.WEBSITE_PF, ConsentChannel.INSTAGRAM]
	},
	[ConsentType.PUBLIKASI_CERITA]: {
		purpose: 'Penerbitan cerita dan testimoni anggota pada kanal komunitas dan Pertamina Foundation.',
		statement:
			'Saya menyetujui cerita, narasi, dan testimoni yang saya kirimkan diterbitkan pada microsite Pfriends serta kanal resmi Pertamina Foundation. Saya memahami bahwa saya berhak meninjau naskah akhir sebelum terbit dan mencabut persetujuan ini kapan saja, dan bahwa pencabutan akan menarik cerita saya dari ruang publik.',
		channels: [ConsentChannel.MICROSITE_PFRIENDS, ConsentChannel.WEBSITE_PF]
	},
	[ConsentType.PUBLIKASI_FOTO_WAJAH]: {
		purpose: 'Penggunaan foto dokumentasi kegiatan yang memperlihatkan wajah anggota.',
		statement:
			'Saya menyetujui foto dokumentasi kegiatan yang memperlihatkan wajah saya digunakan pada materi publikasi komunitas Pfriends dan Pertamina Foundation. Saya memahami risiko bahwa gambar yang sudah tersebar di ruang publik tidak selalu dapat ditarik kembali sepenuhnya.',
		channels: [ConsentChannel.MICROSITE_PFRIENDS, ConsentChannel.INSTAGRAM, ConsentChannel.MATERI_CETAK]
	},
	[ConsentType.PUBLIKASI_DATA_USAHA]: {
		purpose: 'Penampilan profil usaha binaan pada direktori dan materi promosi komunitas.',
		statement:
			'Saya menyetujui nama usaha, sektor usaha, dan kontak usaha saya ditampilkan pada direktori komunitas Pfriends serta materi promosi bersama. Persetujuan ini tidak mencakup nominal omzet, yang memerlukan persetujuan terpisah.',
		channels: [ConsentChannel.MICROSITE_PFRIENDS, ConsentChannel.WEBSITE_PF]
	},
	[ConsentType.KONTAK_UNTUK_MENTORING]: {
		purpose: 'Penyaluran kontak anggota kepada mentee terverifikasi dalam program mentoring lintas komunitas.',
		statement:
			'Saya menyetujui kontak saya dibagikan kepada mentee terverifikasi yang membutuhkan pendampingan sesuai bidang keahlian saya. Kontak hanya dibagikan setelah kecocokan bidang ditetapkan, dan saya berhak menolak pasangan mentoring mana pun tanpa konsekuensi.',
		channels: [ConsentChannel.LAPORAN_INTERNAL]
	}
});

/**
 * Membangkitkan rekaman consent untuk seluruh awardee.
 *
 * Setiap awardee selalu memiliki minimal satu rekaman: persetujuan pengolahan data
 * internal yang diberikan saat pendaftaran. Persetujuan publikasi bersifat terpisah
 * dan opt-in, persis seperti yang dijanjikan pada kabar onboarding Mei: bila seed
 * menyalakan semuanya sekaligus, janji itu langsung terbantah oleh datanya sendiri.
 *
 * Profil ikut ditandai `consentActive` dan `consentCeritaId` supaya cerita dan
 * gerbang fitur publik dapat merujuk rekaman yang benar-benar ada.
 *
 * @param {import('./rng.js').Rng} rng
 * @param {Record<string, any>[]} profiles
 * @returns {Record<string, any>[]}
 */
function bangkitkanConsent(rng, profiles) {
	/** @type {Record<string, any>[]} */
	const records = [];

	for (const profil of profiles) {
		const dasar = TEKS_CONSENT[ConsentType.PENGOLAHAN_DATA_INTERNAL];
		records.push({
			id: `CNS-${profil.seq}-INT`,
			awardeeId: profil.id,
			consentType: ConsentType.PENGOLAHAN_DATA_INTERNAL,
			scope: [SCOPE_SEMUA_KONTEN],
			channels: [...dasar.channels],
			purpose: dasar.purpose,
			policyVersion: VERSI_KEBIJAKAN,
			statementText: dasar.statement,
			grantedAt: profil.joinedAt,
			grantedVia: GrantedVia.FORM_MICROSITE,
			status: ConsentStatus.AKTIF
		});

		// Persetujuan publikasi diminta terpisah beberapa hari setelah pendaftaran.
		const aktif = profil.status === AWARDEE_STATUS.AKTIF ? chance(rng, 0.92) : chance(rng, 0.35);
		profil.consentActive = aktif;
		profil.consentCeritaId = null;

		if (!aktif) continue;

		const hariSetuju = Math.min(profil.joinDay + intBetween(rng, 1, 9), HARI_INI - 1);
		const jam = jamAcak(rng);
		for (const jenis of [ConsentType.PUBLIKASI_NAMA, ConsentType.PUBLIKASI_CERITA]) {
			const teks = TEKS_CONSENT[jenis];
			const id = `CNS-${profil.seq}-${jenis === ConsentType.PUBLIKASI_NAMA ? 'NAM' : 'CRT'}`;
			records.push({
				id,
				awardeeId: profil.id,
				consentType: jenis,
				scope: [SCOPE_SEMUA_KONTEN],
				channels: [...teks.channels],
				purpose: teks.purpose,
				policyVersion: VERSI_KEBIJAKAN,
				statementText: teks.statement,
				grantedAt: tanggal(hariSetuju, jam.hour, jam.minute),
				grantedVia: GrantedVia.FORM_MICROSITE,
				status: ConsentStatus.AKTIF
			});
			if (jenis === ConsentType.PUBLIKASI_CERITA) profil.consentCeritaId = id;
		}

		// Persetujuan tambahan sesuai peran dan komunitas.
		if (profil.community === CommunityType.WOMENPRENEUR && chance(rng, 0.75)) {
			const teks = TEKS_CONSENT[ConsentType.PUBLIKASI_DATA_USAHA];
			records.push({
				id: `CNS-${profil.seq}-USH`,
				awardeeId: profil.id,
				consentType: ConsentType.PUBLIKASI_DATA_USAHA,
				scope: [SCOPE_SEMUA_KONTEN],
				channels: [...teks.channels],
				purpose: teks.purpose,
				policyVersion: VERSI_KEBIJAKAN,
				statementText: teks.statement,
				grantedAt: tanggal(hariSetuju, jam.hour, jam.minute + 5),
				grantedVia: GrantedVia.FORM_MICROSITE,
				status: ConsentStatus.AKTIF
			});
		}
		if (profil.openToMentoring) {
			const teks = TEKS_CONSENT[ConsentType.KONTAK_UNTUK_MENTORING];
			records.push({
				id: `CNS-${profil.seq}-MTR`,
				awardeeId: profil.id,
				consentType: ConsentType.KONTAK_UNTUK_MENTORING,
				scope: [SCOPE_SEMUA_KONTEN],
				channels: [...teks.channels],
				purpose: teks.purpose,
				policyVersion: VERSI_KEBIJAKAN,
				statementText: teks.statement,
				grantedAt: tanggal(hariSetuju, jam.hour, jam.minute + 10),
				grantedVia: GrantedVia.FORM_MICROSITE,
				status: ConsentStatus.AKTIF
			});
		}

		// Sebagian kecil awardee mencabut persetujuan foto wajah. Rekaman pencabutan
		// sengaja ada di data demo: halaman moderasi dan laporan tata kelola perlu
		// menunjukkan bahwa hak mencabut memang benar-benar dapat dijalankan.
		if (chance(rng, 0.07)) {
			const teks = TEKS_CONSENT[ConsentType.PUBLIKASI_FOTO_WAJAH];
			const hariCabut = Math.min(hariSetuju + intBetween(rng, 20, 70), HARI_INI - 1);
			records.push({
				id: `CNS-${profil.seq}-FTO`,
				awardeeId: profil.id,
				consentType: ConsentType.PUBLIKASI_FOTO_WAJAH,
				scope: [SCOPE_SEMUA_KONTEN],
				channels: [...teks.channels],
				purpose: teks.purpose,
				policyVersion: VERSI_KEBIJAKAN,
				statementText: teks.statement,
				grantedAt: tanggal(hariSetuju, jam.hour, jam.minute),
				grantedVia: GrantedVia.FORM_MICROSITE,
				status: ConsentStatus.DICABUT,
				revokedAt: tanggal(hariCabut, jam.hour, jam.minute),
				revokedVia: RevokedVia.SELF_SERVICE,
				revokedReason: null
			});
		}
	}

	return records;
}

/* ────────────────────────────────────────────────────────────────────────────
 * 10. PEMBANGKIT: KEGIATAN, KABAR, GERAKAN, CERITA
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Menyusun rangka kegiatan dari naskah. Daftar peserta belum diisi di sini :
 * kehadiran baru diketahui setelah riwayat aktivitas dibangkitkan.
 *
 * Jejak alur usulan ikut diisi di sini, dan dua aturannya sengaja ditegakkan pada
 * data demo, bukan hanya pada service:
 *
 *: **Penyetuju tidak pernah sama dengan pengusul.** Kegiatan yang diusulkan
 *   verifikator utama disetujui verifikator kedua. Data demo yang melanggar
 *   larangan konflik kepentingan akan memperagakan keadaan yang justru mustahil
 *   dibentuk lewat aplikasinya sendiri.
 *: **Tanggal pengusulan selalu di masa lalu.** Kegiatan yang dijadwalkan Oktober
 *   tetap diusulkan sebelum tanggal acuan; usulan yang tercatat diajukan pada masa
 *   depan membuat perhitungan SLA menghasilkan bilangan negatif.
 *
 * @param {Record<string, any>[]} profiles
 * @returns {Record<string, any>[]}
 */
function bangkitkanKegiatan(profiles) {
	return NASKAH_KEGIATAN.map((naskah, index) => {
		const status =
			naskah.status ?? (naskah.day < HARI_INI ? EventStatus.SELESAI : EventStatus.TERJADWAL);
		const selesai = status === EventStatus.SELESAI;
		const usulan = status === EventStatus.DIUSULKAN;

		// Usulan awardee menunjuk AKUN pengusul (`USR-nnn`), bukan id awardee-nya:
		// pemeriksaan konflik kepentingan membandingkan aktor sebagai akun.
		const pengusul = naskah.pengusulSeq
			? `USR-${String(naskah.pengusulSeq).padStart(3, '0')}`
			: ID_VERIFIKATOR_UTAMA;
		const peranPengusul = naskah.pengusulSeq ? UserRole.AWARDEE : UserRole.VERIFIER;

		const hariUsul = naskah.usulDay ?? Math.max(0, Math.min(naskah.day - 30, HARI_INI - 5));
		const hariPutus = Math.min(hariUsul + 2, HARI_INI - 1);
		const diputuskan = !usulan;

		return {
			id: `EVT-${String(index + 1).padStart(2, '0')}`,
			slug: naskah.slug,
			title: naskah.title,
			type: naskah.type,
			status,
			description: naskah.description,
			speakerName: naskah.speakerName,
			chapterId: naskah.chapterId ?? '',
			community: naskah.community ?? '',
			location: naskah.location,
			isOnline: naskah.luring !== true,
			startsAt: tanggal(naskah.day, naskah.luring ? 9 : 19),
			endsAt: tanggal(naskah.day, (naskah.luring ? 9 : 19) + naskah.durasiJam),
			quota: naskah.kuota,
			proposedBy: pengusul,
			proposedByRole: peranPengusul,
			submittedAt: tanggal(hariUsul, 10),
			reviewedBy: diputuskan ? ID_VERIFIKATOR_KEDUA : '',
			reviewedAt: diputuskan ? tanggal(hariPutus, 11) : null,
			reviewNote: naskah.reviewNote ?? '',
			publishedAt: diputuskan ? tanggal(hariPutus, 11) : null,
			registeredAwardeeIds: [],
			attendeeAwardeeIds: [],
			evidenceRefs: selesai
				? [`EVD-${String(index + 1).padStart(2, '0')}-daftar-hadir.csv`, `EVD-${String(index + 1).padStart(2, '0')}-dokumentasi.jpg`]
				: [],
			outcomeNote: naskah.outcomeNote ?? '',
			day: naskah.day,
			unggulan: naskah.unggulan === true,
			jumlahAwardeeSaatItu: profiles.filter((p) => p.joinDay <= naskah.day).length
		};
	});
}

/**
 * Menyusun agenda bergulir: kegiatan TERJADWAL yang tanggalnya mengikuti waktu
 * nyata saat data demo dipasang.
 *
 * TIGA SYARAT YANG DITEGAKKAN FUNGSI INI, dan alasan masing-masing:
 *
 * 1. **Nol pemanggilan `rng()`.** Seluruh isinya turunan murni dari naskah, daftar
 *    profil, dan satu tanggal acuan. Karena itu fungsi ini boleh dipanggil di mana
 *    saja tanpa memindahkan satu bilangan acak pun: dan memang dipanggil SETELAH
 *    seluruh penarikan selesai, sekamar dengan `bangkitkanCeritaAlurEditorial()`.
 * 2. **Pendaftar tetap merujuk awardee yang benar-benar ada.** Dipilih dengan
 *    pencacah dari profil aktif, bukan diacak. Kalender yang menampilkan "18
 *    terdaftar" atas id yang tidak ada di registry adalah kalender yang runtuh pada
 *    halaman detail pertama yang dibuka.
 * 3. **Jejak usulannya utuh dan tidak melanggar konflik kepentingan.** Pengusul
 *    boleh awardee (PO-4: kegiatan boleh datang dari awardee maupun verifikator),
 *    tetapi penyetujunya selalu verifikator kedua: tidak pernah dirinya sendiri.
 *    Tanggal usul dan keputusan diletakkan di masa lalu supaya perhitungan SLA
 *    tidak menghasilkan bilangan negatif.
 *
 * @param {Record<string, any>[]} profiles
 * @param {Date} pada Waktu pemasangan data demo.
 * @param {number} nomorAwal Nomor urut pertama; melanjutkan penomoran kegiatan beku.
 * @returns {Record<string, any>[]}
 */
function bangkitkanAgendaBergulir(profiles, pada, nomorAwal) {
	const hariAcuan = indeksHari(pada);
	const aktif = profiles.filter((profil) => profil.status === AWARDEE_STATUS.AKTIF);

	return NASKAH_AGENDA_BERGULIR.map((naskah, index) => {
		const hariMulai = hariAcuan + naskah.offsetHari;
		const jamMulai = naskah.luring ? 9 : 19;

		// Usulan diajukan sebelum tanggal acuan, keputusannya sehari sesudahnya :
		// keduanya tetap di masa lalu berapa pun jauhnya kegiatan dijadwalkan.
		const hariUsul = hariAcuan - 12 + index;
		const hariPutus = hariUsul + 2;

		const pengusul = naskah.pengusulSeq
			? `USR-${String(naskah.pengusulSeq).padStart(3, '0')}`
			: ID_VERIFIKATOR_UTAMA;
		const peranPengusul = naskah.pengusulSeq ? UserRole.AWARDEE : UserRole.VERIFIER;

		const pendaftar = aktif
			.filter((_, urutan) => (urutan + index) % LANGKAH_PENDAFTAR_BERGULIR === 0)
			.slice(0, naskah.kuota)
			.map((profil) => profil.id);

		return {
			id: `EVT-${String(nomorAwal + index).padStart(2, '0')}`,
			slug: naskah.slug,
			title: naskah.title,
			type: naskah.type,
			status: EventStatus.TERJADWAL,
			description: naskah.description,
			speakerName: naskah.speakerName,
			chapterId: naskah.chapterId ?? '',
			community: naskah.community ?? '',
			location: naskah.location,
			isOnline: naskah.luring !== true,
			startsAt: tanggal(hariMulai, jamMulai),
			endsAt: tanggal(hariMulai, jamMulai + naskah.durasiJam),
			quota: naskah.kuota,
			proposedBy: pengusul,
			proposedByRole: peranPengusul,
			submittedAt: tanggal(hariUsul, 10),
			reviewedBy: ID_VERIFIKATOR_KEDUA,
			reviewedAt: tanggal(hariPutus, 11),
			reviewNote: 'Agenda rutin komunitas; disetujui mengikuti kalender berjalan.',
			publishedAt: tanggal(hariPutus, 11),
			registeredAwardeeIds: pendaftar,
			attendeeAwardeeIds: [],
			evidenceRefs: [],
			outcomeNote: '',
			day: hariMulai,
			unggulan: false,
			jumlahAwardeeSaatItu: profiles.length
		};
	});
}

/**
 * Cakrawala agenda: berapa hari ke depan kalender publik masih terisi.
 *
 * Diekspor supaya proses bootstrap dan panel data demo admin dapat memeriksanya
 * TANPA menyalin ulang aturannya. Data demo yang dipasang di peramban berbulan-bulan
 * lalu tetap dapat menjadi basi meski pembangkitnya sudah bergulir: pemeriksaan
 * inilah yang mengubah kebasian itu menjadi sesuatu yang dapat dideteksi, bukan
 * sesuatu yang baru ketahuan saat halaman dibuka di depan orang.
 *
 * @param {readonly Record<string, any>[]} events Baris kegiatan hasil `buildSeed()`.
 * @param {Date} [pada] Waktu acuan; default sekarang.
 * @returns {number} Jarak hari ke kegiatan TERJADWAL terjauh; 0 bila tidak ada satu pun.
 */
export function cakrawalaAgendaHari(events, pada = new Date()) {
	const terjauh = events
		.filter((event) => event.status === EventStatus.TERJADWAL)
		.map((event) => new Date(event.startsAt).getTime())
		.filter((waktu) => waktu > pada.getTime())
		.reduce((maksimum, waktu) => Math.max(maksimum, waktu), 0);
	return terjauh === 0 ? 0 : Math.floor((terjauh - pada.getTime()) / MS_PER_DAY);
}

/**
 * Menyusun rangka kabar dari naskah. `openedBy` dan `amplifiedBy` diisi belakangan
 * dari buku besar poin, bukan diacak: kalau keduanya diacak terpisah, jumlah
 * pembaca kabar tidak akan cocok dengan jumlah entri BROADCAST_VIEW dan angka pada
 * dua halaman berbeda akan saling membantah.
 * @param {Record<string, any>[]} profiles
 * @returns {Record<string, any>[]}
 */
function bangkitkanKabar(profiles) {
	return NASKAH_KABAR.map((naskah, index) => {
		const status = naskah.status ?? BroadcastStatus.TERKIRIM;
		const terkirim = status === BroadcastStatus.TERKIRIM;
		const penerima = profiles.filter((p) => p.joinDay <= naskah.day).length;
		return {
			id: `BRC-${String(index + 1).padStart(2, '0')}`,
			title: naskah.title,
			summary: naskah.summary,
			body: naskah.body,
			status,
			channel: naskah.channel,
			contentIds: [naskah.contentId],
			contentSource: 'Pertamina Foundation',
			lightCta: naskah.lightCta,
			ctaLink: naskah.ctaLink,
			audience: 'Seluruh anggota Pfriends',
			scheduledAt: tanggal(naskah.day, 8),
			sentAt: terkirim ? tanggal(naskah.day, 9) : null,
			recipientCount: terkirim ? penerima : 0,
			openedBy: [],
			amplifiedBy: [],
			day: naskah.day
		};
	});
}

/**
 * Menyusun rangka gerakan dari naskah, termasuk penerjemahan `esgKey` menjadi
 * pasangan tag ESG dan SDG dari taksonomi.
 * @param {import('./rng.js').Rng} rng
 * @param {Record<string, any>[]} profiles
 * @returns {Record<string, any>[]}
 */
function bangkitkanGerakan(rng, profiles) {
	const petaEsg = new Map(ESG_ACTIVITY_MAP.map((entry) => [entry.key, entry]));
	return NASKAH_GERAKAN.map((naskah, index) => {
		const peta = petaEsg.get(naskah.esgKey);
		if (!peta) throw new RangeError(`Kunci ESG tidak dikenal pada gerakan: "${naskah.esgKey}".`);
		const berjalan = naskah.status !== MovementStatus.DIUSULKAN;
		return {
			id: `MOV-${String(index + 1).padStart(2, '0')}`,
			slug: naskah.slug,
			title: naskah.title,
			category: naskah.category,
			status: naskah.status,
			objective: naskah.objective,
			description: naskah.description,
			region: naskah.region,
			leaderId: '',
			leaderName: '',
			startsAt: tanggal(naskah.startDay, 9),
			endsAt: tanggal(naskah.endDay, 17),
			targetParticipants: naskah.target,
			participantIds: [],
			esgTags: berjalan
				? peta.sdgGoals.slice(0, 2).map((goal) => ({ pillar: peta.pillar, sdgGoal: goal }))
				: [],
			reportIds: [],
			impact: naskah.impact,
			startDay: naskah.startDay
		};
	});
}

/**
 * Menyusun cerita dari naskah dan menautkannya ke penulis.
 *
 * Penulis dipilih dari awardee ber-consent publikasi cerita yang aktif. Menautkan
 * cerita ke awardee tanpa consent akan membuat halaman moderasi menampilkan naskah
 * yang tidak mungkin lolos gerbang publikasi mana pun: data demo yang mustahil
 * terjadi di sistem sungguhan.
 *
 * Peninjau digilir antara dua akun verifikator berdasarkan urutan naskah. Kolom
 * "ditinjau oleh" yang seragam menyembunyikan satu-satunya hal yang perlu terlihat
 * pada peragaan tata kelola: keputusan konten dipegang lebih dari satu orang.
 * `pfValidation.validatorId` tetap verifikator utama karena validasi Pertamina
 * Foundation adalah gerbang yang berbeda dari kepemilikan antrean.
 *
 * @param {import('./rng.js').Rng} rng
 * @param {Record<string, any>[]} profiles
 * @returns {Record<string, any>[]}
 */
function bangkitkanCerita(rng, profiles) {
	const petaEsg = new Map(ESG_ACTIVITY_MAP.map((entry) => [entry.key, entry]));

	// Penulis diprioritaskan dari awardee bertier menengah ke atas: menulis cerita
	// lengkap dengan catatan hasil adalah kontribusi berat, dan wajar bila datang
	// dari awardee yang memang sudah aktif.
	const rank = (p) => tierUntukLevel(p.plannedTier).rank;
	const kandidat = shuffle(
		rng,
		profiles.filter((p) => p.consentActive && p.status === AWARDEE_STATUS.AKTIF)
	).sort((a, b) => rank(b) - rank(a));

	return NASKAH_CERITA.map((naskah, index) => {
		const penulis = kandidat[index % kandidat.length];
		const peta = petaEsg.get(naskah.esgKey);
		if (!peta) throw new RangeError(`Kunci ESG tidak dikenal pada cerita: "${naskah.esgKey}".`);

		const terbit = naskah.status === STORY_STATUS.TERPUBLIKASI;
		const terverifikasi = terbit || naskah.status === STORY_STATUS.DISETUJUI;
		const sudahDiajukan = naskah.status !== STORY_STATUS.DRAFT;
		const hariAjukan = Math.max(0, naskah.dayIndex - intBetween(rng, 5, 14));

		const peninjau = index % 2 === 0 ? ID_VERIFIKATOR_UTAMA : ID_VERIFIKATOR_KEDUA;
		// Naskah yang masih draf atau baru diajukan belum dipegang siapa pun: antrean
		// yang seluruh isinya sudah bernama peninjau tidak lagi menjadi antrean.
		const sudahDipegang =
			sudahDiajukan && naskah.status !== STORY_STATUS.DIAJUKAN ? peninjau : null;

		return {
			id: `STR-${String(index + 1).padStart(2, '0')}`,
			slug: naskah.slug,
			authorId: penulis.id,
			authorName: penulis.fullName,
			title: naskah.title,
			summary: naskah.summary,
			body: naskah.body,
			status: naskah.status,
			community: penulis.community,
			chapterId: penulis.chapterId,
			esgTags: peta.sdgGoals.slice(0, 2).map((goal) => ({ pillar: peta.pillar, sdgGoal: goal })),
			mediaRefs: [
				`MED-${naskah.slug}-01.jpg`,
				`MED-${naskah.slug}-02.jpg`,
				`MED-${naskah.slug}-laporan.pdf`
			],
			outcome: naskah.outcome,
			location: naskah.location,
			activityDate: tanggal(naskah.dayIndex, 10),
			participantCount: naskah.peserta,
			sensitivityScan: terverifikasi
				? SensitivityScan.CLEAR
				: naskah.status === STORY_STATUS.PERLU_REVISI
					? SensitivityScan.FLAGGED
					: SensitivityScan.MENUNGGU,
			pfValidation: terverifikasi
				? { validatorId: ID_VERIFIKATOR_UTAMA, validatedAt: tanggal(naskah.dayIndex + 3, 14) }
				: null,
			consentActive: penulis.consentActive,
			consentId: penulis.consentCeritaId,
			reviewNotes:
				naskah.status === STORY_STATUS.PERLU_REVISI
					? [
							{
								reviewerId: peninjau,
								note: 'Mohon hapus penyebutan nama warga dan nomor kontak pada paragraf ketiga, lalu lengkapi satuan pada angka hasil.',
								at: tanggal(naskah.dayIndex + 4, 11).toISOString()
							}
						]
					: [],
			reviewerId: sudahDipegang,
			reviewedAt: sudahDipegang ? tanggal(Math.min(hariAjukan + 2, HARI_INI - 1), 9) : null,
			publishedById: terbit ? peninjau : '',
			revisionCount: naskah.status === STORY_STATUS.PERLU_REVISI ? 1 : 0,
			submittedAt: sudahDiajukan ? tanggal(hariAjukan, 20) : null,
			publishedAt: terbit ? tanggal(naskah.dayIndex + 6, 10) : null,
			archivedAt:
				naskah.status === STORY_STATUS.DIARSIPKAN ? tanggal(naskah.dayIndex + 9, 16) : null,
			archiveReason: naskah.archiveReason ?? null,
			views: terbit ? intBetween(rng, 120, 1850) : intBetween(rng, 0, 24)
		};
	});
}

/**
 * Menyusun tujuh naskah alur editorial: TANPA satu pun pemanggilan `rng()`.
 *
 * Berkas ini punya dua generator cerita dengan sengaja. Yang pertama
 * (`bangkitkanCerita`) berjalan DI DALAM rangkaian acak dan karenanya tidak boleh
 * bertambah panjang: setiap naskah tambahan di sana menarik dua bilangan acak tepat
 * sebelum buku besar poin dibangkitkan, dan total poin komunitas ikut bergeser.
 * Yang kedua: fungsi ini: berjalan DI LUAR rangkaian itu, dipanggil setelah
 * seluruh perhitungan poin selesai, sehingga naskah boleh ditambah kapan saja tanpa
 * menyentuh satu angka pun.
 *
 * Konsekuensinya yang perlu diketahui: naskah di sini TIDAK menjadi rujukan aksi
 * `STORY_SUBMIT` pada buku besar poin. Itu memang bukan perannya: ia mengisi
 * antrean editorial, bukan riwayat kontribusi berpoin.
 *
 * @param {Record<string, any>[]} profiles
 * @param {number} nomorAwal Nomor urut id cerita pertama yang dibangkitkan.
 * @returns {Record<string, any>[]}
 */
function bangkitkanCeritaAlurEditorial(profiles, nomorAwal) {
	const petaEsg = new Map(ESG_ACTIVITY_MAP.map((entry) => [entry.key, entry]));

	// Urut id menaik, bukan diacak: kepengarangan naskah ini harus tetap menunjuk
	// orang yang sama setiap kali data dibangun ulang, supaya naskah peragaan dan
	// tangkapan layar tidak basi.
	const kandidat = profiles
		.filter((p) => p.consentActive && p.status === AWARDEE_STATUS.AKTIF)
		.sort((a, b) => a.id.localeCompare(b.id));
	if (kandidat.length === 0) return [];

	return CERITA_ALUR_EDITORIAL.map((naskah, index) => {
		const penulis = kandidat[naskah.penulisUrut % kandidat.length];
		const peta = petaEsg.get(naskah.esgKey);
		if (!peta) throw new RangeError(`Kunci ESG tidak dikenal pada cerita: "${naskah.esgKey}".`);

		const terbit = naskah.status === STORY_STATUS.TERPUBLIKASI;
		const terverifikasi = terbit || naskah.status === STORY_STATUS.DISETUJUI;
		const sudahDiajukan = naskah.status !== STORY_STATUS.DRAFT;
		const perluRevisi = naskah.status === STORY_STATUS.PERLU_REVISI;

		const peninjau = index % 2 === 0 ? ID_VERIFIKATOR_KEDUA : ID_VERIFIKATOR_UTAMA;
		const sudahDipegang =
			sudahDiajukan && naskah.status !== STORY_STATUS.DIAJUKAN ? peninjau : null;
		const hariAjukan = Math.max(0, naskah.dayIndex - 4);
		const hariTinjau = Math.min(hariAjukan + 2, HARI_INI - 1);

		return {
			id: `STR-${String(nomorAwal + index).padStart(2, '0')}`,
			slug: naskah.slug,
			authorId: penulis.id,
			authorName: penulis.fullName,
			title: naskah.title,
			summary: naskah.summary,
			body: naskah.body,
			status: naskah.status,
			community: penulis.community,
			chapterId: penulis.chapterId,
			esgTags: peta.sdgGoals.slice(0, 2).map((goal) => ({ pillar: peta.pillar, sdgGoal: goal })),
			mediaRefs: [
				`MED-${naskah.slug}-01.jpg`,
				`MED-${naskah.slug}-02.jpg`,
				`MED-${naskah.slug}-laporan.pdf`
			],
			outcome: naskah.outcome,
			location: naskah.location,
			activityDate: tanggal(naskah.dayIndex, 10),
			participantCount: naskah.peserta,
			sensitivityScan: terverifikasi
				? SensitivityScan.CLEAR
				: perluRevisi
					? SensitivityScan.FLAGGED
					: SensitivityScan.MENUNGGU,
			pfValidation: terverifikasi
				? { validatorId: ID_VERIFIKATOR_UTAMA, validatedAt: tanggal(hariTinjau + 1, 14) }
				: null,
			consentActive: penulis.consentActive,
			consentId: penulis.consentCeritaId,
			reviewNotes: perluRevisi
				? [
						{
							reviewerId: peninjau,
							note: 'Angka susut bahan baku sudah kuat, tetapi tiga nama pemilik warung masih tertulis lengkap. Mohon diganti inisial atau dilengkapi persetujuan tertulis masing-masing sebelum naskah diteruskan.',
							at: tanggal(hariTinjau, 11).toISOString()
						}
					]
				: [],
			reviewerId: sudahDipegang,
			reviewedAt: sudahDipegang ? tanggal(hariTinjau, 9) : null,
			publishedById: terbit ? peninjau : '',
			revisionCount: perluRevisi ? 1 : 0,
			submittedAt: sudahDiajukan ? tanggal(hariAjukan, 20) : null,
			publishedAt: terbit ? tanggal(Math.min(naskah.dayIndex + 5, HARI_INI - 1), 10) : null,
			archivedAt: null,
			archiveReason: null,
			// Jumlah pembaca ditulis literal, bukan diacak: satu draw acak di sini akan
			// menggeser seluruh rangkaian yang justru dihindari oleh fungsi ini.
			views: terbit ? 947 : sudahDiajukan ? 14 : 3
		};
	});
}

/* ────────────────────────────────────────────────────────────────────────────
 * 11. PEMBANGKIT: BUKU BESAR POIN
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Status kegiatan yang belum membuka pendaftaran peserta.
 * @type {readonly string[]}
 */
const STATUS_TANPA_PENDAFTARAN = Object.freeze([
	EventStatus.DRAFT,
	EventStatus.DIUSULKAN,
	EventStatus.DITOLAK
]);

/** Batas iterasi penarikan aksi, penjaga agar target yang mustahil tidak menggantung. */
const MAKS_ITERASI_AKSI = 500;

/** Jumlah percobaan mencari hari yang belum melampaui kuota harian sebuah aksi. */
const MAKS_COBA_HARI = 12;

/**
 * Catatan aksi yang menyertai entri buku besar, per jenis aksi.
 * @type {Readonly<Record<string, (ref: string) => string>>}
 */
const CATATAN_AKSI = Object.freeze({
	[ActivityType.BROADCAST_VIEW]: (ref) => `Membuka kabar "${ref}".`,
	[ActivityType.CTA_REACT]: (ref) => `Menanggapi ajakan pada kabar "${ref}".`,
	[ActivityType.SHARE_PRIVATE]: (ref) => `Meneruskan "${ref}" ke grup WhatsApp pribadi.`,
	[ActivityType.SHARE_PUBLIC]: (ref) => `Membagikan "${ref}" ke media sosial publik disertai tangkapan layar.`,
	[ActivityType.STORY_SUBMIT]: (ref) => `Mengirim cerita "${ref}" ke ruang cerita Pfriends.`,
	[ActivityType.SESSION_ATTEND]: (ref) => `Hadir penuh pada kegiatan "${ref}".`,
	[ActivityType.KNOWLEDGE_QA]: () => 'Menjawab pertanyaan anggota lain di forum chapter dan ditandai bermanfaat.',
	[ActivityType.SPEAKER_MENTOR]: (ref) => `Menjadi narasumber pada kegiatan "${ref}".`,
	[ActivityType.LEAD_ACTION]: (ref) => `Memimpin pelaksanaan gerakan "${ref}" di wilayahnya.`
});

/**
 * Mencari hari pelaksanaan sebuah aksi yang belum melampaui kuota harian.
 *
 * Kuota harian Hal 11 bukan hiasan: `AntiGamingPolicy` menegakkannya pada aksi
 * sungguhan, sehingga data demo yang melanggarnya akan menampilkan riwayat yang
 * tidak mungkin terbentuk lewat aplikasi itu sendiri.
 *
 * @param {import('./rng.js').Rng} rng
 * @param {number} hariPaling Awal Batas hari paling awal aksi boleh terjadi.
 * @param {string} type
 * @param {Map<string, number>} kuotaHarian
 * @returns {number|null} Indeks hari, atau `null` bila tidak ditemukan.
 */
function cariHariAksi(rng, hariPalingAwal, type, kuotaHarian) {
	const rule = aturanSkor(type);
	const paling = HARI_INI - 1;
	for (let coba = 0; coba < MAKS_COBA_HARI; coba++) {
		const hari = hariCondongBaru(rng, Math.min(hariPalingAwal, paling), paling);
		const kunci = `${hari}:${type}`;
		const dipakai = kuotaHarian.get(kunci) ?? 0;
		if (rule.dailyCap === 0 || dipakai < rule.dailyCap) {
			kuotaHarian.set(kunci, dipakai + 1);
			return hari;
		}
	}
	return null;
}

/**
 * Membangkitkan seluruh entri buku besar milik satu awardee.
 *
 * Inilah bagian yang menjamin konsistensi poin. Aksi ditarik satu per satu sampai
 * jumlahnya jatuh di rentang tier yang direncanakan, dan yang dikembalikan adalah
 * daftar aksi itu: total poin awardee dihitung darinya, bukan sebaliknya.
 *
 * @param {import('./rng.js').Rng} rng
 * @param {Record<string, any>} profil
 * @param {{rentang: Map<string, {min: number, max: number}>, kabar: Record<string, any>[], kegiatan: Record<string, any>[], gerakan: Record<string, any>[], ceritaPerAwardee: Map<string, Record<string, any>[]>}} konteks
 * @returns {Record<string, any>[]}
 */
function bangkitkanAktivitasAwardee(rng, profil, konteks) {
	const band = konteks.rentang.get(profil.plannedTier);
	if (!band) throw new RangeError(`Rentang tier tidak dikenal: "${profil.plannedTier}".`);

	// Sebagian Newcomer memang belum pernah beraksi sama sekali: awardee yang baru
	// mendaftar dan belum sempat apa-apa adalah keadaan paling lazim di komunitas
	// mana pun, dan menghapusnya dari data demo akan menyembunyikan justru kelompok
	// yang paling perlu disasar program aktivasi.
	const belumBergerak = profil.plannedTier === TierLevel.NEWCOMER && chance(rng, 0.18);
	const target = belumBergerak ? 0 : intBetween(rng, band.min, band.max);

	const bobot = BOBOT_AKSI_PER_TIER[profil.plannedTier];
	/** @type {Record<string, any>[]} */
	const entries = [];
	/** @type {Map<string, number>} */
	const kuotaHarian = new Map();
	const kabarDibaca = new Set();
	const kegiatanDihadiri = new Set();

	const kabarTersedia = konteks.kabar.filter(
		(k) => k.status === BroadcastStatus.TERKIRIM && k.day >= profil.joinDay
	);
	const kegiatanSelesai = konteks.kegiatan.filter(
		(e) => e.status === EventStatus.SELESAI && e.day >= profil.joinDay
	);
	const gerakanAktif = konteks.gerakan.filter((m) => m.status !== MovementStatus.DIUSULKAN);
	const ceritaSaya = konteks.ceritaPerAwardee.get(profil.id) ?? [];
	let ceritaTerpakai = 0;

	let total = 0;
	let iterasi = 0;

	while (total < target && iterasi < MAKS_ITERASI_AKSI) {
		iterasi += 1;
		const sisa = target - total;

		// Hanya aksi yang muat pada sisa poin yang boleh ditarik. Dengan aksi
		// terkecil bernilai satu poin, target selalu dapat dicapai persis.
		let kandidat = bobot.filter((b) => poinUntuk(b.item) <= sisa);
		if (kabarDibaca.size >= kabarTersedia.length) {
			kandidat = kandidat.filter((b) => b.item !== ActivityType.BROADCAST_VIEW);
		}
		if (kegiatanDihadiri.size >= kegiatanSelesai.length) {
			kandidat = kandidat.filter((b) => b.item !== ActivityType.SESSION_ATTEND);
		}
		if (kandidat.length === 0) break;

		const type = pickWeighted(rng, kandidat);
		const rule = aturanSkor(type);

		/** @type {number|null} */
		let hari = null;
		/** @type {string|null} */
		let refId = null;
		let refLabel = '';

		if (type === ActivityType.SESSION_ATTEND || type === ActivityType.SPEAKER_MENTOR) {
			// Kehadiran menempel pada tanggal kegiatannya: awardee tidak dapat hadir
			// pada hari yang berbeda dari hari acara itu digelar.
			const pilihan = kegiatanSelesai.filter((e) => !kegiatanDihadiri.has(e.id));
			if (pilihan.length === 0) continue;
			const kegiatan = pick(rng, pilihan);
			const kunci = `${kegiatan.day}:${type}`;
			if ((kuotaHarian.get(kunci) ?? 0) >= rule.dailyCap && rule.dailyCap !== 0) continue;
			kuotaHarian.set(kunci, (kuotaHarian.get(kunci) ?? 0) + 1);
			if (type === ActivityType.SESSION_ATTEND) kegiatanDihadiri.add(kegiatan.id);
			hari = kegiatan.day;
			refId = kegiatan.id;
			refLabel = kegiatan.title;
		} else {
			// Kabar dipilih LEBIH DULU, baru tanggalnya ditentukan setelah hari kirim.
			// Urutan ini penting: bila tanggal ditarik lebih dulu lalu aksi dibuang
			// karena belum ada kabar terbit pada hari itu, seluruh aksi awardee yang
			// bergabung paling awal akan terlempar ke bulan-bulan berikutnya dan
			// Januari menjadi kosong pada chart tren admin.
			let batasAwal = profil.joinDay;
			/** @type {Record<string, any>|null} */
			let kabarTerpilih = null;

			if (type === ActivityType.BROADCAST_VIEW) {
				const pilihan = kabarTersedia.filter((k) => !kabarDibaca.has(k.id));
				if (pilihan.length === 0) continue;
				kabarTerpilih = pick(rng, pilihan);
			} else if (
				type === ActivityType.CTA_REACT ||
				type === ActivityType.SHARE_PRIVATE ||
				type === ActivityType.SHARE_PUBLIC
			) {
				if (kabarTersedia.length === 0) continue;
				kabarTerpilih = pick(rng, kabarTersedia);
			}
			if (kabarTerpilih) batasAwal = Math.max(batasAwal, kabarTerpilih.day);

			hari = cariHariAksi(rng, batasAwal, type, kuotaHarian);
			if (hari === null) continue;

			if (kabarTerpilih) {
				if (type === ActivityType.BROADCAST_VIEW) kabarDibaca.add(kabarTerpilih.id);
				refId = kabarTerpilih.id;
				refLabel = kabarTerpilih.title;
			} else if (type === ActivityType.STORY_SUBMIT) {
				const cerita = ceritaSaya[ceritaTerpakai % Math.max(1, ceritaSaya.length)];
				if (cerita) {
					refId = cerita.id;
					refLabel = cerita.title;
					ceritaTerpakai += 1;
				} else {
					refLabel = 'survei kebutuhan anggota';
				}
			} else if (type === ActivityType.LEAD_ACTION) {
				if (gerakanAktif.length === 0) continue;
				const gerakan = pick(rng, gerakanAktif);
				refId = gerakan.id;
				refLabel = gerakan.title;
			}
		}

		const jam = jamAcak(rng);
		const nomor = entries.length + 1;
		entries.push({
			id: `ACT-${profil.seq}-${String(nomor).padStart(3, '0')}`,
			awardeeId: profil.id,
			activityType: type,
			points: rule.points,
			status: ActivityStatus.AWARDED,
			refId,
			evidence: rule.needsEvidence ? [`EVD-${profil.id}-${String(nomor).padStart(3, '0')}.jpg`] : [],
			capReason: null,
			note: CATATAN_AKSI[type](refLabel),
			occurredAt: tanggal(hari, jam.hour, jam.minute),
			day: hari
		});
		total += rule.points;
	}

	// Penjaga terakhir: bila penarikan berhenti sedikit di bawah ambang tier karena
	// kehabisan objek rujukan, kekurangannya ditutup dengan aksi tanpa batas rujukan.
	// Tanpa penjaga ini seorang awardee bisa jatuh satu poin di bawah tiernya dan
	// distribusi yang direncanakan meleset tanpa sebab yang terlihat.
	while (total < band.min) {
		const rule = aturanSkor(ActivityType.CTA_REACT);
		const hari =
			cariHariAksi(rng, profil.joinDay, ActivityType.CTA_REACT, kuotaHarian) ?? HARI_INI - 1;
		const kabar = kabarTersedia.filter((k) => k.day <= hari);
		const jam = jamAcak(rng);
		const nomor = entries.length + 1;
		entries.push({
			id: `ACT-${profil.seq}-${String(nomor).padStart(3, '0')}`,
			awardeeId: profil.id,
			activityType: ActivityType.CTA_REACT,
			points: rule.points,
			status: ActivityStatus.AWARDED,
			refId: kabar.length > 0 ? pick(rng, kabar).id : null,
			evidence: [],
			capReason: null,
			note: CATATAN_AKSI[ActivityType.CTA_REACT](
				kabar.length > 0 ? pick(rng, kabar).title : 'kabar komunitas'
			),
			occurredAt: tanggal(hari, jam.hour, jam.minute),
			day: hari
		});
		total += rule.points;
	}

	// Entri tanpa poin: menunggu bukti dan ditolak. Keduanya tidak menambah total
	// sama sekali (entity menolak poin pada status yang tidak membukukan), tetapi
	// tetap dihitung sebagai jejak audit dan mengisi antrean verifikasi admin.
	if (entries.length > 0 && chance(rng, 0.3)) {
		const hari = hariCondongBaru(rng, HARI_AWAL_BULAN_INI, HARI_INI - 1);
		const jam = jamAcak(rng);
		entries.push({
			id: `ACT-${profil.seq}-P01`,
			awardeeId: profil.id,
			activityType: ActivityType.SHARE_PUBLIC,
			points: 0,
			status: ActivityStatus.PENDING,
			refId: kabarTersedia.length > 0 ? kabarTersedia[kabarTersedia.length - 1].id : null,
			evidence: [],
			capReason: CapReason.NEEDS_EVIDENCE,
			note: 'Menunggu tangkapan layar unggahan sebagai bukti amplifikasi.',
			occurredAt: tanggal(hari, jam.hour, jam.minute),
			day: hari
		});
	}
	if (entries.length > 6 && chance(rng, 0.12)) {
		const hari = hariCondongBaru(rng, HARI_AWAL_MUSIM, HARI_INI - 1);
		const jam = jamAcak(rng);
		entries.push({
			id: `ACT-${profil.seq}-R01`,
			awardeeId: profil.id,
			activityType: ActivityType.SHARE_PRIVATE,
			points: 0,
			status: ActivityStatus.REJECTED,
			refId: null,
			evidence: [],
			capReason: CapReason.DUPLICATE,
			note: 'Ditolak karena tautan yang sama sudah dilaporkan pada hari yang sama.',
			occurredAt: tanggal(hari, jam.hour, jam.minute),
			day: hari
		});
	}

	return entries;
}

/**
 * Memindahkan satu aksi amplifikasi milik sebagian awardee aktif ke bulan berjalan.
 *
 * KPI-04 Hal 6 mengukur porsi awardee yang mengamplifikasi **pada bulan berjalan**.
 * Sebaran tanggal yang sepenuhnya acak sepanjang tujuh bulan akan menempatkan
 * sebagian besar amplifikasi di bulan-bulan lampau, sehingga dasbor menampilkan
 * angka yang tidak menggambarkan komunitas yang sedang aktif hari ini.
 *
 * Yang dipindahkan hanya TANGGAL, tidak pernah jumlah poinnya: konsistensi total
 * poin terhadap buku besar tetap utuh setelah pemindahan ini.
 *
 * @param {import('./rng.js').Rng} rng
 * @param {Record<string, any>[]} profiles
 * @param {Record<string, any>[]} activities
 * @returns {void}
 */
function ratakanAmplifikasiBulanIni(rng, profiles, activities) {
	const AKSI_AMPLIFIKASI = [ActivityType.SHARE_PRIVATE, ActivityType.SHARE_PUBLIC];
	const idAktif = new Set(
		profiles.filter((p) => p.status === AWARDEE_STATUS.AKTIF).map((p) => p.id)
	);

	/** @type {Map<string, Record<string, any>[]>} */
	const perAwardee = new Map();
	for (const entry of activities) {
		if (!idAktif.has(entry.awardeeId)) continue;
		if (!AKSI_AMPLIFIKASI.includes(entry.activityType)) continue;
		if (entry.status !== ActivityStatus.AWARDED) continue;
		if (!perAwardee.has(entry.awardeeId)) perAwardee.set(entry.awardeeId, []);
		perAwardee.get(entry.awardeeId)?.push(entry);
	}

	const sudahBulanIni = new Set(
		[...perAwardee].filter(([, list]) => list.some((e) => e.day >= HARI_AWAL_BULAN_INI)).map(([id]) => id)
	);
	const belum = shuffle(rng, [...perAwardee.keys()].filter((id) => !sudahBulanIni.has(id)));

	// Sasaran: sedikit di atas ambang KPI-04 supaya kartu dasbor menunjukkan capaian
	// yang tercapai namun tidak dibuat sempurna: angka yang terlalu bulat justru
	// membuat pemirsa curiga datanya tidak nyata.
	const sasaran = Math.round(idAktif.size * 0.56);
	const perlu = Math.max(0, sasaran - sudahBulanIni.size);

	for (const awardeeId of belum.slice(0, perlu)) {
		const daftar = perAwardee.get(awardeeId) ?? [];
		const entry = daftar[daftar.length - 1];
		if (!entry) continue;
		const hari = intBetween(rng, HARI_AWAL_BULAN_INI, HARI_INI - 1);
		const jam = jamAcak(rng);
		entry.day = hari;
		entry.occurredAt = tanggal(hari, jam.hour, jam.minute);
	}
}

/* ────────────────────────────────────────────────────────────────────────────
 * 12. PENYELESAIAN: LENCANA, KOIN, DAN ENTITAS AWARDEE
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Panjang streak mingguan berjalan, dihitung mundur dari tanggal acuan.
 * @param {readonly number[]} hariAktivitas
 * @returns {number}
 */
function hitungStreak(hariAktivitas) {
	const pekanAktif = new Set(hariAktivitas.map((hari) => Math.floor((HARI_INI - 1 - hari) / 7)));
	let streak = 0;
	while (pekanAktif.has(streak)) streak += 1;
	return streak;
}

/**
 * Menentukan lencana yang benar-benar diperoleh seorang awardee.
 *
 * Kriteria diuji terhadap rekam aktivitasnya, sehingga setiap lencana pada profil
 * dapat ditelusuri ke entri buku besar yang menghasilkannya. Lencana yang tidak
 * dapat dijelaskan asalnya adalah hal pertama yang akan dipertanyakan Corsec.
 *
 * @param {Record<string, any>[]} entries
 * @param {number} streak
 * @param {string} tierLevel
 * @param {string} community
 * @returns {string[]}
 */
function tentukanLencana(entries, streak, tierLevel, community) {
	const cacah = new Map();
	let total = 0;
	for (const entry of entries) {
		if (entry.status !== ActivityStatus.AWARDED) continue;
		cacah.set(entry.activityType, (cacah.get(entry.activityType) ?? 0) + 1);
		total += entry.points;
	}
	const rekam = {
		total,
		streak,
		tierLevel,
		hitung: (type) => cacah.get(type) ?? 0
	};
	return KATALOG_LENCANA.filter(
		(badge) =>
			(badge.community === undefined || badge.community === community) && badge.syarat(rekam)
	).map((badge) => badge.code);
}

/**
 * Menyusun profil akhir awardee beserta poin, koin, streak, dan lencananya.
 *
 * `points` diisi dari penjumlahan buku besar: inilah baris yang menegakkan aturan
 * pokok berkas ini. `seasonPoints` dihitung dari entri sejak awal musim, dan karena
 * ia selalu merupakan himpunan bagian, invarian "poin musim tidak melebihi total"
 * terpenuhi dengan sendirinya tanpa perlu dijaga terpisah.
 *
 * @param {import('./rng.js').Rng} rng
 * @param {Record<string, any>[]} profiles
 * @param {Record<string, any>[]} activities
 * @returns {{awardees: Record<string, any>[], redemptions: Record<string, any>[]}}
 */
function finalisasiAwardee(rng, profiles, activities) {
	/** @type {Map<string, Record<string, any>[]>} */
	const perAwardee = new Map(profiles.map((p) => [p.id, []]));
	for (const entry of activities) perAwardee.get(entry.awardeeId)?.push(entry);

	/** @type {Record<string, any>[]} */
	const redemptions = [];

	const awardees = profiles.map((profil) => {
		const entries = (perAwardee.get(profil.id) ?? []).sort((a, b) => a.day - b.day);
		const dibukukan = entries.filter((entry) => entry.status === ActivityStatus.AWARDED);

		const points = dibukukan.reduce((jumlah, entry) => jumlah + entry.points, 0);
		const seasonPoints = dibukukan
			.filter((entry) => entry.day >= HARI_AWAL_MUSIM)
			.reduce((jumlah, entry) => jumlah + entry.points, 0);

		const hariAktivitas = entries.map((entry) => entry.day);
		const streak = hitungStreak(hariAktivitas);
		// Tier dibaca lewat fungsi kanonik, tidak dihitung ulang di sini: ambang
		// 25/50/100/150 hanya boleh hidup di satu berkas (kontrak §2).
		const tier = tierUntukPoin(points);
		const badgeCodes = tentukanLencana(entries, streak, tier.level, profil.community);

		// Koin Tukar diperoleh sejalan dengan Poin Kontribusi lalu ditambah bonus
		// lencana, dan BERKURANG ketika ditukar. Poin Kontribusi tidak pernah
		// berkurang: pemisahan itulah yang menjaga tier tetap bermakna sebagai
		// pengakuan, bukan sebagai saldo belanja.
		const bonusLencana = badgeCodes.reduce((jumlah, code) => {
			const badge = KATALOG_LENCANA.find((b) => b.code === code);
			return jumlah + (badge ? BADGE_RARITY_META[badge.rarity].bonusCoins : 0);
		}, 0);
		const koinDiperoleh = points + bonusLencana;

		let koinTerpakai = 0;
		const layak = KATALOG_PENGHARGAAN.filter((item) => {
			const minRank = tierUntukLevel(item.minTierLevel).rank;
			return (
				minRank <= tier.rank &&
				(item.community === undefined || item.community === profil.community) &&
				item.status !== RewardStatus.HABIS
			);
		});
		const jumlahTukar = points > 0 && chance(rng, 0.6) ? intBetween(rng, 1, 2) : 0;
		// Awardee menyisakan sebagian saldonya, tidak pernah membelanjakan habis :
		// katalog yang selalu terkuras habis membuat halaman penghargaan kehilangan
		// fungsinya sebagai tujuan yang masih ingin dikejar.
		for (const item of sample(rng, layak, jumlahTukar)) {
			if (koinTerpakai + item.priceCoins > Math.floor(koinDiperoleh * 0.8)) continue;
			koinTerpakai += item.priceCoins;
			const hari = hariCondongBaru(rng, HARI_AWAL_MUSIM, HARI_INI - 1);
			const jam = jamAcak(rng);
			const selesai = hari < HARI_INI - 14;
			redemptions.push({
				id: `RDM-${profil.seq}-${item.id}`,
				awardeeId: profil.id,
				rewardId: item.id,
				rewardName: item.name,
				coins: item.priceCoins,
				status: selesai
					? RedemptionStatus.SELESAI
					: item.requiresApproval
						? RedemptionStatus.DIAJUKAN
						: RedemptionStatus.DIKIRIM,
				requestedAt: tanggal(hari, jam.hour, jam.minute).toISOString(),
				fulfilledAt: selesai ? tanggal(hari + 9, 14).toISOString() : null,
				note: item.fulfillmentNote
			});
		}

		const terakhir = entries.at(-1);
		return {
			id: profil.id,
			fullName: profil.fullName,
			email: profil.email,
			whatsapp: profil.whatsapp,
			community: profil.community,
			chapterId: profil.chapterId,
			status: profil.status,
			points,
			coins: koinDiperoleh - koinTerpakai,
			seasonPoints,
			streakWeeks: streak,
			freezeTokens: streak >= 4 ? intBetween(rng, 1, 2) : 0,
			university: profil.university,
			city: profil.city,
			graduationYear: profil.graduationYear,
			occupation: profil.occupation,
			bio: susunBio(profil),
			skills: profil.skills,
			badgeCodes,
			openToMentoring: profil.openToMentoring,
			consentActive: profil.consentActive,
			anonymousOnLeaderboard: profil.anonymousOnLeaderboard,
			businessProfile: profil.businessProfile,
			joinedAt: profil.joinedAt.toISOString(),
			lastActiveAt: (terakhir ? terakhir.occurredAt : profil.joinedAt).toISOString()
		};
	});

	return { awardees, redemptions };
}

/**
 * Melengkapi kegiatan, kabar, dan gerakan dengan daftar keikutsertaan yang
 * diturunkan dari buku besar poin.
 *
 * Arah turunannya penting: daftar hadir dibaca DARI aksi yang tercatat, bukan
 * dibangkitkan terpisah. Bila keduanya diacak sendiri-sendiri, jumlah peserta pada
 * kartu kegiatan tidak akan sama dengan jumlah entri SESSION_ATTEND pada buku
 * besar, dan pemirsa yang membandingkan dua layar akan menemukannya.
 *
 * @param {import('./rng.js').Rng} rng
 * @param {Record<string, any>[]} profiles
 * @param {Record<string, any>[]} activities
 * @param {{kegiatan: Record<string, any>[], kabar: Record<string, any>[], gerakan: Record<string, any>[]}} koleksi
 * @returns {void}
 */
function tautkanKeikutsertaan(rng, profiles, activities, koleksi) {
	/** @type {Map<string, Set<string>>} */
	const hadir = new Map();
	/** @type {Map<string, Set<string>>} */
	const membuka = new Map();
	/** @type {Map<string, Set<string>>} */
	const mengamplifikasi = new Map();
	/** @type {Map<string, Set<string>>} */
	const memimpin = new Map();

	const catat = (peta, kunci, nilai) => {
		if (!kunci) return;
		if (!peta.has(kunci)) peta.set(kunci, new Set());
		peta.get(kunci).add(nilai);
	};

	for (const entry of activities) {
		if (entry.status === ActivityStatus.REJECTED) continue;
		switch (entry.activityType) {
			case ActivityType.SESSION_ATTEND:
			case ActivityType.SPEAKER_MENTOR:
				catat(hadir, entry.refId, entry.awardeeId);
				break;
			case ActivityType.BROADCAST_VIEW:
			case ActivityType.CTA_REACT:
				catat(membuka, entry.refId, entry.awardeeId);
				break;
			case ActivityType.SHARE_PRIVATE:
			case ActivityType.SHARE_PUBLIC:
				catat(membuka, entry.refId, entry.awardeeId);
				catat(mengamplifikasi, entry.refId, entry.awardeeId);
				break;
			case ActivityType.LEAD_ACTION:
				catat(memimpin, entry.refId, entry.awardeeId);
				break;
			default:
				break;
		}
	}

	const petaAwardee = new Map(profiles.map((p) => [p.id, p]));

	for (const kegiatan of koleksi.kegiatan) {
		// Usulan yang belum menjadi agenda resmi tidak punya pendaftar: pendaftaran
		// baru dibuka setelah verifikator menyetujuinya. Mengisi daftar hadir pada
		// usulan akan menampilkan peserta untuk kegiatan yang belum tentu digelar.
		if (STATUS_TANPA_PENDAFTARAN.includes(kegiatan.status)) {
			kegiatan.attendeeAwardeeIds = [];
			kegiatan.registeredAwardeeIds = [];
			continue;
		}

		const dariBukuBesar = [...(hadir.get(kegiatan.id) ?? [])];

		// Kegiatan Januari–Mei berlangsung sebelum gamifikasi diaktifkan pada Juni
		// (Hal 7), sehingga kehadirannya memang tidak meninggalkan entri poin.
		// Daftar hadir dilengkapi dari awardee yang sudah bergabung saat itu supaya
		// KPI-05 dapat dihitung atas kegiatan yang benar-benar terlaksana.
		const kandidat = profiles.filter(
			(p) => p.joinDay <= kegiatan.day && !dariBukuBesar.includes(p.id)
		);
		const kuorum = kegiatan.unggulan ? KPI_PARAMETERS.kuorumEngagement + intBetween(rng, 6, 22) : 0;
		const tambahan =
			kegiatan.status === EventStatus.SELESAI && dariBukuBesar.length < kuorum
				? sample(rng, kandidat, kuorum - dariBukuBesar.length).map((p) => p.id)
				: [];

		kegiatan.attendeeAwardeeIds = [...dariBukuBesar, ...tambahan];
		const belumHadir = kandidat.filter((p) => !tambahan.includes(p.id));
		kegiatan.registeredAwardeeIds = [
			...kegiatan.attendeeAwardeeIds,
			...sample(rng, belumHadir, intBetween(rng, 3, 12)).map((p) => p.id)
		];
	}

	for (const kabar of koleksi.kabar) {
		kabar.openedBy = [...(membuka.get(kabar.id) ?? [])];
		kabar.amplifiedBy = [...(mengamplifikasi.get(kabar.id) ?? [])];
	}

	for (const gerakan of koleksi.gerakan) {
		const pemimpin = [...(memimpin.get(gerakan.id) ?? [])];
		const kandidat = profiles.filter(
			(p) => p.joinDay <= gerakan.startDay && !pemimpin.includes(p.id)
		);
		const jumlahPeserta =
			gerakan.status === MovementStatus.DIUSULKAN
				? 0
				: Math.min(
						kandidat.length,
						Math.round(gerakan.targetParticipants * (gerakan.status === MovementStatus.SELESAI ? 0.9 : 0.55))
					);
		gerakan.participantIds = [
			...pemimpin,
			...sample(rng, kandidat, jumlahPeserta).map((p) => p.id)
		];
		gerakan.reportIds = pemimpin.map((id, i) => `RPT-${gerakan.id}-${String(i + 1).padStart(2, '0')}`);

		const utama = pemimpin[0] ?? gerakan.participantIds[0] ?? '';
		gerakan.leaderId = utama;
		gerakan.leaderName = petaAwardee.get(utama)?.fullName ?? '';
	}
}

/* ────────────────────────────────────────────────────────────────────────────
 * 13. PERAKITAN
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * @typedef {object} SeedBundle
 * @property {Record<string, any>[]} awardees
 * @property {Record<string, any>[]} accounts
 * @property {Record<string, any>[]} activities
 * @property {Record<string, any>[]} stories
 * @property {Record<string, any>[]} events
 * @property {Record<string, any>[]} movements
 * @property {Record<string, any>[]} broadcasts
 * @property {Record<string, any>[]} rewards
 * @property {Record<string, any>[]} badges
 * @property {Record<string, any>[]} consents
 * @property {Record<string, any>[]} redemptions
 */

/**
 * Membuang field kerja yang hanya dipakai selama proses pembangkitan.
 *
 * Field seperti `day` dan `seq` berguna untuk menautkan antarkoleksi, tetapi tidak
 * punya arti apa pun bagi entity. Membiarkannya masuk basis data akan menggoda
 * lapisan di atasnya untuk membacanya, dan sejak saat itu ia berubah menjadi
 * kontrak tak tertulis yang tidak pernah disepakati siapa pun.
 *
 * @template {Record<string, any>} T
 * @param {T[]} rows
 * @param {readonly string[]} fields
 * @returns {Record<string, any>[]}
 */
function tanpaFieldKerja(rows, fields) {
	return rows.map((row) => {
		const salinan = { ...row };
		for (const field of fields) delete salinan[field];
		return salinan;
	});
}

/**
 * Membangun seluruh data demo dari satu benih tetap.
 *
 * Urutannya tidak dapat ditukar. Setiap tahap membutuhkan hasil tahap sebelumnya:
 * consent menentukan siapa yang boleh menulis cerita, cerita dan kegiatan menjadi
 * objek rujukan aksi berpoin, dan buku besar poin menentukan poin, koin, lencana,
 * serta daftar keikutsertaan pada seluruh koleksi lain.
 *
 * DUA SUMBU WAKTU. Parameter `seed` mengunci seluruh data HISTORIS pada kalender
 * beku 20 Juli 2026; parameter `pada` hanya menentukan dua hal yang memang wajib
 * mengikuti waktu nyata: agenda bergulir kalender publik dan bulan yang dibebani
 * kuota penukaran. Tidak satu pun angka poin, tier, atau aktivitas bergantung pada
 * `pada`, dan itu disengaja: `buildSeed()` dipanggil dua kali berturut-turut oleh
 * gerbang seed dan wajib menghasilkan statistik yang identik.
 *
 * @param {number} [seed] Benih PRNG; ubah hanya untuk pengujian.
 * @param {Date} [pada] Waktu pemasangan data demo; disuntikkan agar dapat diuji.
 * @returns {SeedBundle}
 */
export function buildSeed(seed = SEED, pada = new Date()) {
	const rng = mulberry32(seed);
	const rentang = rentangTier();

	const profiles = bangkitkanProfilAwardee(rng);
	const consents = bangkitkanConsent(rng, profiles);
	const kegiatan = bangkitkanKegiatan(profiles);
	const kabar = bangkitkanKabar(profiles);
	const gerakan = bangkitkanGerakan(rng, profiles);
	const cerita = bangkitkanCerita(rng, profiles);

	/** @type {Map<string, Record<string, any>[]>} */
	const ceritaPerAwardee = new Map();
	for (const story of cerita) {
		if (!ceritaPerAwardee.has(story.authorId)) ceritaPerAwardee.set(story.authorId, []);
		ceritaPerAwardee.get(story.authorId)?.push(story);
	}

	const konteks = { rentang, kabar, kegiatan, gerakan, ceritaPerAwardee };
	const activities = profiles.flatMap((profil) =>
		bangkitkanAktivitasAwardee(rng, profil, konteks)
	);

	ratakanAmplifikasiBulanIni(rng, profiles, activities);
	tautkanKeikutsertaan(rng, profiles, activities, { kegiatan, kabar, gerakan });

	const { awardees, redemptions } = finalisasiAwardee(rng, profiles, activities);

	// Tiga langkah terakhir sengaja berada SETELAH seluruh penarikan bilangan acak
	// selesai, dan ketiganya murni: naskah alur editorial, agenda bergulir, dan
	// pemetaan akun. Selama ketiganya tetap di sini, isinya boleh ditambah tanpa
	// menggeser satu angka pun pada distribusi tier maupun total poin komunitas.
	//
	// Agenda bergulir WAJIB berada di sini, bukan digabungkan ke `bangkitkanKegiatan()`
	// di atas: `tautkanKeikutsertaan()` menarik `intBetween()` dan `sample()` untuk
	// SETIAP kegiatan yang dilewatinya, sehingga enam kegiatan tambahan di hulu akan
	// menggeser seluruh buku besar poin sesudahnya.
	const ceritaEditorial = bangkitkanCeritaAlurEditorial(profiles, cerita.length + 1);
	const agendaBergulir = bangkitkanAgendaBergulir(profiles, pada, kegiatan.length + 1);
	const seluruhKegiatan = [...kegiatan, ...agendaBergulir];
	const accounts = bangkitkanAkun(awardees);

	const badges = KATALOG_LENCANA.map((badge) => ({
		code: badge.code,
		name: badge.name,
		family: badge.family,
		rarity: badge.rarity,
		criteria: badge.criteria,
		icon: badge.icon,
		community: badge.community ?? '',
		seasonLimited: false,
		holderCount: awardees.filter((awardee) => awardee.badgeCodes.includes(badge.code)).length
	}));

	const rewards = KATALOG_PENGHARGAAN.map((item) => ({
		id: item.id,
		name: item.name,
		category: item.category,
		description: item.description,
		priceCoins: item.priceCoins,
		minTierLevel: item.minTierLevel,
		status: item.status ?? RewardStatus.TERSEDIA,
		monthlyQuota: item.monthlyQuota ?? null,
		redeemedThisMonth: item.redeemedThisMonth ?? 0,
		// Pencacah kuota dibebankan ke BULAN BERJALAN NYATA, bukan ke Juli 2026.
		// Tanpa bulan acuan, `redeemedThisMonth` adalah bilangan tanpa arti: pencacah
		// yang tidak tahu bulannya tidak akan pernah tahu kapan harus kembali ke nol,
		// dan RWD-09 yang memang sengaja diperagakan berkuota habis akan tetap habis
		// selamanya: termasuk pada demo yang digelar tahun depan.
		quotaMonthKey: kunciBulanKuota(pada),
		requiresApproval: item.requiresApproval === true,
		community: item.community ?? '',
		fulfillmentNote: item.fulfillmentNote
	}));

	return {
		awardees,
		accounts,
		activities: tanpaFieldKerja(activities, ['day']).map((entry) => ({
			...entry,
			occurredAt: entry.occurredAt.toISOString()
		})),
		stories: [...cerita, ...ceritaEditorial].map((story) => ({
			...story,
			activityDate: story.activityDate.toISOString(),
			pfValidation: story.pfValidation
				? {
						validatorId: story.pfValidation.validatorId,
						validatedAt: story.pfValidation.validatedAt.toISOString()
					}
				: null,
			reviewedAt: story.reviewedAt?.toISOString() ?? null,
			submittedAt: story.submittedAt?.toISOString() ?? null,
			publishedAt: story.publishedAt?.toISOString() ?? null,
			archivedAt: story.archivedAt?.toISOString() ?? null
		})),
		events: tanpaFieldKerja(seluruhKegiatan, ['day', 'unggulan', 'jumlahAwardeeSaatItu']).map((event) => ({
			...event,
			startsAt: event.startsAt.toISOString(),
			endsAt: event.endsAt.toISOString(),
			submittedAt: event.submittedAt?.toISOString() ?? null,
			reviewedAt: event.reviewedAt?.toISOString() ?? null,
			publishedAt: event.publishedAt?.toISOString() ?? null
		})),
		movements: tanpaFieldKerja(gerakan, ['startDay']).map((movement) => ({
			...movement,
			startsAt: movement.startsAt.toISOString(),
			endsAt: movement.endsAt.toISOString()
		})),
		broadcasts: tanpaFieldKerja(kabar, ['day']).map((broadcast) => ({
			...broadcast,
			scheduledAt: broadcast.scheduledAt?.toISOString() ?? null,
			sentAt: broadcast.sentAt?.toISOString() ?? null
		})),
		rewards,
		badges,
		consents: consents.map((consent) => ({
			...consent,
			grantedAt: consent.grantedAt.toISOString(),
			revokedAt: consent.revokedAt?.toISOString() ?? null
		})),
		redemptions
	};
}

/**
 * Ringkasan statistik seed: dipakai skrip verifikasi dan panel data demo admin.
 * @param {SeedBundle} [bundle]
 * @returns {Record<string, any>}
 */
export function seedStats(bundle = buildSeed()) {
	const perTier = new Map(TIER_TABLE.map((entry) => [entry.level, 0]));
	for (const awardee of bundle.awardees) {
		const { level } = tierUntukPoin(awardee.points);
		perTier.set(level, (perTier.get(level) ?? 0) + 1);
	}
	return {
		awardees: bundle.awardees.length,
		accounts: bundle.accounts.length,
		activities: bundle.activities.length,
		stories: bundle.stories.length,
		events: bundle.events.length,
		movements: bundle.movements.length,
		broadcasts: bundle.broadcasts.length,
		rewards: bundle.rewards.length,
		badges: bundle.badges.length,
		consents: bundle.consents.length,
		redemptions: bundle.redemptions.length,
		tierDistribution: Object.fromEntries(perTier),
		totalPoints: bundle.awardees.reduce((jumlah, awardee) => jumlah + awardee.points, 0)
	};
}
