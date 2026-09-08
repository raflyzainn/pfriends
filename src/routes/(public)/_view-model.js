/**
 * ADAPTER TAMPILAN: zona publik.
 *
 * Tanggung jawab: menerjemahkan entity domain menjadi bentuk polos yang diminta
 * kontrak props komponen bersama, untuk tujuh halaman publik sekaligus.
 *
 * EMPAT KEPUTUSAN YANG TIDAK TERBACA DARI KODE:
 *
 * 1. **`totalPoin` DICABUT dari `ringkasKomunitas`.** Field itu belum pernah
 *    dirender, tetapi ia terekspos: dan satu-satunya fungsinya adalah
 *    membocorkan bahwa sistem skor ada (`docs/10` §4.3 H-6). Larangan Keputusan
 *    Pemilik Produk #2 ditegakkan pada BENTUK DATA: halaman publik tidak dapat
 *    membocorkan angka yang tidak pernah sampai kepadanya. Agregat skor per
 *    komunitas kini hanya hidup di zona ter-login dan di agregat `/admin`.
 *
 * 2. **`kartuCerita` mengisi `cover` lewat `fotoCerita(slug)`.** `Story` tidak
 *    pernah punya field sampul: diverifikasi ke `StoryInput` dan ke seed. Selama
 *    pemetaan itu tidak dilakukan di sini, `StoryCard` selalu jatuh ke fallback
 *    tipografis dan dua belas foto sampul di `static/img/` tidak pernah tampil
 *    (cacat D-08). Sumber pemetaannya tunggal: `src/lib/data/photos.js`.
 *
 * 3. **Kegiatan TIDAK dipetakan di berkas ini.** `eventCardVM` milik
 *    `editorial/view-model.js` adalah satu-satunya pemeta kegiatan di seluruh
 *    proyek (KP-3). `agendaPublik()` di bawah hanya memotong daftarnya lalu
 *    mendelegasikan pemetaan: ia bukan pemeta tandingan.
 *
 * 4. **Berkas berawalan garis bawah dan tanpa `+`**, sehingga tidak pernah
 *    menjadi rute SvelteKit.
 *
 * @see docs/12-BUILD-CONTRACT-V2.md: §2.13 kontrak komponen, §3.5 WP-04
 * @see docs/10-REVISION-SPEC.md: §4.3 H-6 agregat skor haram tampil publik
 */

import { CommunityType, komunitas } from '$lib/domain/constants/community.js';
// Diimpor dari modulnya langsung, bukan dari barel `editorial/index.js`: modul ini
// adalah JavaScript polos, dan menariknya lewat barel akan menyeret delapan komponen
// Svelte ke setiap pemakainya tanpa satu pun dipakai.
import { eventCardVM } from '$lib/components/editorial/view-model.js';
import { fotoCerita } from '$lib/data/photos.js';
import { MovementCategory } from '$lib/domain/entities/Movement.js';

/**
 * Bentuk kartu untuk `StoryCard`.
 *
 * Hanya pilar pertama yang dibawa: kartu punya satu kanal warna identitas, dan
 * cerita bertag ganda tetap harus dapat dikenali sekilas. Daftar pilar lengkap
 * tersedia di halaman detail, tempat ruangnya memadai.
 *
 * `cover` dipisahkan dari `story` karena kontrak `StoryCard` §2.13 menerima
 * sampul sebagai prop `foto` tersendiri, bukan sebagai field entity.
 *
 * @param {import('$lib/domain/entities/Story.js').Story} story
 * @returns {{id:string, slug:string, title:string, excerpt:string, esgPillar:string|undefined,
 *   status:string, publishedAt:Date|null, readMinutes:number, author:{name:string},
 *   href:string, cover:(import('$lib/data/photos.js').Photo|null)}}
 */
export function kartuCerita(story) {
	return {
		id: story.id,
		slug: story.slug,
		title: story.title,
		excerpt: story.summary,
		esgPillar: story.pillars[0],
		status: story.status,
		publishedAt: story.publishedAt,
		readMinutes: story.readMinutes,
		author: { name: story.authorName },
		href: `/cerita/${story.slug}`,
		cover: story.coverUrl || fotoCerita(story.slug)
	};
}

/**
 * @typedef {object} BarisGerakan
 * @property {string} id
 * @property {string} slug
 * @property {string} judul
 * @property {string} tujuan
 * @property {string} kategoriLabel
 * @property {string} statusLabel
 * @property {'red'|'navy'|'green'} keyline
 * @property {number} peserta
 * @property {number} target
 * @property {number} wilayah   Cacah titik wilayah aksi.
 * @property {boolean} berjalan
 */

/**
 * Warna keying rule per kategori gerakan.
 *
 * Tiga warna palet yang sudah ada: tidak ada warna baru yang masuk. Pemetaan
 * ditulis di sini, bukan di komponen, supaya `/` dan `/gerakan` tidak pernah
 * memberi warna berbeda untuk kategori yang sama.
 * @type {Readonly<Record<string, 'red'|'navy'|'green'>>}
 */
const KEYLINE_KATEGORI = Object.freeze({
	[MovementCategory.AKSI_LINGKUNGAN]: 'green',
	[MovementCategory.EDUKASI_MASYARAKAT]: 'navy',
	[MovementCategory.PEMBERDAYAAN_EKONOMI]: 'red'
});

/**
 * Bentuk baris daftar gerakan: baris editorial ber-keying rule, bukan kartu.
 *
 * `wilayah` dihitung dari daftar wilayah yang dipisahkan koma pada entity:
 * gerakan menyimpan wilayah sebagai teks bebas, dan cacah titik aksi adalah
 * satu-satunya bacaan yang dapat diambil darinya tanpa mengarang data.
 *
 * Nol field skor: memimpin aksi memang bernilai bagi anggota, tetapi itu urusan
 * zona ter-login (`docs/11` §6 E6, US-R21 AC-4).
 *
 * @param {import('$lib/domain/entities/Movement.js').Movement} movement
 * @param {string} kategoriLabel Label dari `MOVEMENT_CATEGORY_META`.
 * @param {string} statusLabel   Label dari `MOVEMENT_STATUS_META`.
 * @returns {BarisGerakan}
 */
export function barisGerakan(movement, kategoriLabel, statusLabel) {
	return {
		id: movement.id,
		slug: movement.slug,
		judul: movement.title,
		tujuan: movement.objective,
		kategoriLabel,
		statusLabel,
		keyline: KEYLINE_KATEGORI[movement.category] ?? 'navy',
		peserta: movement.participantCount,
		target: movement.targetParticipants,
		wilayah: cacahWilayah(movement.region),
		berjalan: movement.isRunning
	};
}

/**
 * Jumlah wilayah pada teks wilayah gerakan.
 * @param {string} region
 * @returns {number}
 */
function cacahWilayah(region) {
	return region
		.split(',')
		.map((bagian) => bagian.trim())
		.filter(Boolean).length;
}

/**
 * @typedef {object} RingkasanKomunitas
 * @property {import('$lib/domain/constants/community.js').CommunityDef} profil
 * @property {number} jumlahAnggota  Anggota berstatus aktif pada komunitas ini.
 * @property {number} jumlahChapter  Chapter yang benar-benar terisi anggota.
 */

/**
 * Ringkasan satu komunitas dari daftar anggota yang sudah dimuat katalog.
 *
 * Hanya anggota aktif yang dihitung. Angka yang dipajang di halaman publik adalah
 * klaim kepada calon anggota, dan menghitung pendaftar yang belum terverifikasi
 * akan membesarkan klaim itu melebihi yang dapat dipertanggungjawabkan: penyaring
 * yang sama dipakai `ProgramImpactService.publicSnapshot()` (aturan D-07).
 *
 * @param {readonly import('$lib/domain/entities/Awardee.js').Awardee[]} awardees
 * @param {string} communityId Salah satu CommunityType.
 * @returns {RingkasanKomunitas}
 */
export function ringkasKomunitas(awardees, communityId) {
	const anggota = awardees.filter(
		(awardee) => awardee.isActive && awardee.community === communityId
	);
	return {
		profil: komunitas(communityId),
		jumlahAnggota: anggota.length,
		jumlahChapter: new Set(anggota.map((awardee) => awardee.chapterId)).size
	};
}

/**
 * Ringkasan kedua komunitas, urut sesuai penyebutan Hal 4 dokumen sumber.
 * @param {readonly import('$lib/domain/entities/Awardee.js').Awardee[]} awardees
 * @returns {RingkasanKomunitas[]}
 */
export function ringkasSemuaKomunitas(awardees) {
	return [
		ringkasKomunitas(awardees, CommunityType.SOBI),
		ringkasKomunitas(awardees, CommunityType.WOMENPRENEUR)
	];
}

/**
 * Daftar agenda siap render untuk `EventListPanel` dan `MonthCalendar`.
 *
 * Masukannya WAJIB daftar yang sudah tersaring publik (`catalog.publishedEvents`
 * atau `catalog.upcomingEvents()`); fungsi ini sengaja TIDAK menyaring ulang.
 * Gerbang visibilitas kedua di lapisan tampilan berarti dua definisi "boleh
 * dilihat publik" yang harus dijaga sinkron, dan yang kalah akan membocorkan
 * usulan mentah sebagai agenda resmi (risiko R-09).
 *
 * @param {readonly import('$lib/domain/entities/CommunityEvent.js').CommunityEvent[]} events
 * @param {number} [limit] Banyaknya butir teratas; `0` berarti seluruhnya.
 * @returns {import('$lib/components/editorial/view-model.js').EventCardVM[]}
 */
export function agendaPublik(events, limit = 0) {
	const daftar = limit > 0 ? events.slice(0, limit) : [...events];
	return daftar.map((event) => eventCardVM(event));
}
