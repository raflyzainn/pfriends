/**
 * MODUL LOKAL ZONA VERIFIKATOR: pembacaan antrean dan status SLA.
 *
 * Tanggung jawab: menyediakan satu-satunya jalan halaman zona ini memperoleh usia
 * antrean, batas SLA, dan urutan FIFO: tanpa satu pun angka hari kerja tertulis
 * di komponen.
 *
 * Empat keputusan yang tidak terbaca dari kode:
 *
 * 1. **Aritmetika hari kerja TIDAK ditulis ulang di sini.** Ia dipinjam apa adanya
 *    dari `ContentReviewService.slaOf(entity, pada)`, yang statis dan murni persis
 *    supaya kartu antrean dapat memanggilnya tanpa menyentuh repository. Menyalin
 *    perhitungannya ke zona ini akan melahirkan sumber kebenaran kedua atas
 *    "sudah berapa hari": dan dua sumber selalu berakhir berselisih pada akhir
 *    pekan, tepat ketika penanda merah paling berarti.
 * 2. **Angka SLA hanya dibaca dari `SLA_HARI_KERJA`.** Label antrean di bawah
 *    menyebut batasnya dengan membaca konstanta itu, bukan dengan menuliskan
 *    "2 hari kerja" sebagai teks. Batas yang diubah di domain langsung ikut
 *    berubah di layar (`docs/12` §3.5 WP-06 butir 4).
 * 3. **Urutan FIFO diambil apa adanya dari store.** `editorial.storyQueue` dan
 *    `editorial.eventQueue` sudah tersortir tertua-dahulu di domain. Menyortir
 *    ulang di halaman berarti dua kebijakan urutan; yang di halaman akan menang
 *    tanpa pernah diuji.
 * 4. **Tidak ada "skor antrean".** Yang dikembalikan adalah usia, batas, dan
 *    apakah batas terlewati: tiga fakta terpisah. Melebur ketiganya menjadi satu
 *    angka prioritas akan membuat naskah tertua dapat tersalip oleh naskah yang
 *    kebetulan bernilai tinggi karena alasan lain.
 *
 * @see docs/12-BUILD-CONTRACT-V2.md: §3.5 WP-06 butir 4 antrean FIFO & penanda SLA
 * @see docs/10-REVISION-SPEC.md: §5.6 SLA & eskalasi
 */

import { SLA_HARI_KERJA } from '$lib/domain/constants/content-workflow.js';
import { ContentReviewService } from '$lib/domain/services/ContentReviewService.js';

/**
 * @typedef {import('$lib/domain/services/_editorial-metrics.js').SlaStatus} SlaStatus
 */

/**
 * Status SLA sebuah naskah atau usulan kegiatan pada waktu acuan tertentu.
 *
 * Waktu acuan wajib dioper pemanggil dan tidak pernah dibaca di dalam: dua puluh
 * baris yang masing-masing memanggil `new Date()` sendiri akan sesekali
 * menampilkan usia berbeda untuk baris yang seharusnya sama.
 *
 * @param {object} entity Entity `Story` atau `CommunityEvent`.
 * @param {Date} pada Waktu acuan perhitungan.
 * @returns {SlaStatus} `limit === 0` berarti status ini memang tidak ber-SLA.
 */
export function slaAntrean(entity, pada) {
	return ContentReviewService.slaOf(entity, pada);
}

/**
 * Kalimat usia antrean untuk satu baris.
 *
 * @param {SlaStatus} sla
 * @returns {string} Kalimat kosong bila status ini tidak ber-SLA.
 */
export function usiaAntreanTeks(sla) {
	if (!sla || sla.limit === 0) return '';
	return `${sla.days} dari ${sla.limit} hari kerja`;
}

/**
 * Empat antrean bertenggat beserta label dan batas hari kerjanya.
 *
 * Batasnya dibaca dari `SLA_HARI_KERJA`, bukan ditulis ulang. Kunci antrean sengaja
 * sama persis dengan kunci konstanta itu supaya papan beban dapat memasangkan
 * keduanya tanpa peta perantara.
 * @type {readonly {key: string, label: string, deskripsi: string, limit: number}[]}
 */
export const ANTREAN_SLA = Object.freeze([
	Object.freeze({
		key: 'STORY_DIAJUKAN',
		label: 'Naskah menunggu diambil',
		deskripsi: 'Sudah diajukan penulis dan belum dipegang verifikator mana pun.',
		limit: SLA_HARI_KERJA.STORY_DIAJUKAN
	}),
	Object.freeze({
		key: 'STORY_REVIEW',
		label: 'Naskah sedang ditinjau',
		deskripsi: 'Sudah dipegang verifikator dan menunggu keputusan.',
		limit: SLA_HARI_KERJA.STORY_REVIEW
	}),
	Object.freeze({
		key: 'STORY_DISETUJUI',
		label: 'Naskah menunggu terbit',
		deskripsi: 'Sudah disetujui dan menunggu dijadwalkan tayang.',
		limit: SLA_HARI_KERJA.STORY_DISETUJUI
	}),
	Object.freeze({
		key: 'EVENT_DIUSULKAN',
		label: 'Usulan kegiatan',
		deskripsi: 'Menunggu disetujui atau ditolak agar pengusul dapat merencanakan.',
		limit: SLA_HARI_KERJA.EVENT_DIUSULKAN
	})
]);

/**
 * Posisi FIFO sebuah butir, satu-basis, untuk ditampilkan sebagai nomor antrean.
 *
 * Ditulis sebagai fungsi agar halaman tidak perlu mengingat bahwa indeks `{#each}`
 * dimulai dari nol: nomor antrean "0" terbaca sebagai data yang belum dimuat.
 *
 * @param {number} indeks Indeks nol-basis pada daftar yang sudah tersortir FIFO.
 * @returns {number}
 */
export function nomorAntrean(indeks) {
	return indeks + 1;
}
