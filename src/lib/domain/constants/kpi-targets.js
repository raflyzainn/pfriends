/**
 * TARGET KPI KANONIK: Hal 6 dokumen sumber ("KPI dan Keluaran").
 *
 * Tanggung jawab: mendefinisikan lima Key Objective beserta target, satuan,
 * formula, dan ambang warna. Ini satu-satunya tempat angka 75% / 1–2 / 2 / 50% / 2
 * boleh dituliskan.
 *
 * Formula disimpan sebagai STRING, bukan fungsi. Alasannya disengaja: string ini
 * ikut ditampilkan di konsol admin agar pembaca laporan tahu persis bagaimana
 * angka dihitung: KPI yang tidak bisa ditelusuri cara hitungnya adalah KPI yang
 * tidak bisa dipertanggungjawabkan. Eksekusi hitungnya milik KpiCalculator (WP-2).
 *
 * Penandaan provenance mengikuti konvensi docs/02: nilai tanpa penanda berasal
 * langsung dari Hal 6; nilai ber-`[ASUMSI]` adalah turunan yang perlu konfirmasi
 * Corsec dan sudah dicatat sebagai butir terbuka di docs/02.
 *
 * @see docs/00-SOURCE-BRIEF.md: Hal 6 "KPI dan Keluaran"
 * @see docs/02-KPI-MODEL.md: §1.3 Registry Parameter, §2 Lima Metrik Inti, §3 Reach
 */

/**
 * Status warna universal kartu KPI (docs/02 §1.2).
 * @readonly
 * @enum {string}
 */
export const KPI_STATUS = Object.freeze({
	HIJAU: 'HIJAU',
	KUNING: 'KUNING',
	MERAH: 'MERAH'
});

/**
 * Jenis metrik menentukan cara membaca angkanya di UI.
 * RASIO ditampilkan sebagai persen, CACAH sebagai bilangan.
 * @readonly
 * @enum {string}
 */
export const KPI_TYPE = Object.freeze({
	RASIO: 'RASIO',
	CACAH: 'CACAH'
});

/**
 * @typedef {object} KpiTarget
 * @property {string} id             Kode metrik docs/02 (M-01 … M-05).
 * @property {string} label          Nama metrik untuk UI.
 * @property {string} shortLabel     Nama pendek untuk kartu sempit dan label chart.
 * @property {number} target         Nilai target: KANONIK, dari Hal 6.
 * @property {number} [targetMax]    Batas atas bila target berupa rentang (hanya M-02).
 * @property {string} unit           Satuan yang ditampilkan di sebelah angka.
 * @property {string} type           Salah satu KPI_TYPE.
 * @property {string} periode        Periode evaluasi target.
 * @property {string} formula        Formula perhitungan, ditampilkan apa adanya di konsol admin.
 * @property {string} definisi       Definisi operasional ringkas: apa yang dihitung dan apa yang tidak.
 * @property {string} kutipanSumber  Kutipan Hal 6 yang menjadi dasar metrik ini.
 * @property {string} source         Rujukan halaman sumber.
 * @property {number} ambangKuning   Rasio pencapaian minimum agar berstatus KUNING (di bawahnya MERAH).
 */

/**
 * Lima KPI inti Hal 6.
 *
 * `ambangKuning` dinyatakan sebagai rasio pencapaian (aktual / target), bukan
 * nilai absolut, supaya aturan warna tetap benar bila target diubah. Metrik rasio
 * memakai 0,80 (mereproduksi batas 60% dan 40% pada docs/02), metrik cacah memakai
 * 0,50 (mereproduksi aturan "1 = kuning, 0 = merah" pada target 2).
 *
 * @type {readonly KpiTarget[]}
 */
export const KPI_TARGETS = Object.freeze([
	Object.freeze({
		id: 'M-01',
		label: 'Coverage registrasi penerima manfaat',
		shortLabel: 'Coverage registrasi',
		target: 75,
		unit: '%',
		type: KPI_TYPE.RASIO,
		periode: 'Kumulatif program',
		formula:
			'CVG = |{ anggota berstatus terverifikasi DAN ber-consent aktif }| / |registry penerima manfaat| x 100%',
		definisi:
			'Akun tanpa consent tidak dihitung. Penyebut dibekukan sebagai snapshot awal periode agar coverage tidak terlihat stagnan saat data baru masuk.',
		kutipanSumber:
			'75% dari penerima manfaat Pertamina Foundation terdata dalam komunitas Pfriends.',
		source: 'Hal 6: Key Objectives',
		ambangKuning: 0.8
	}),
	Object.freeze({
		id: 'M-02',
		label: 'Volume konten terdiseminasi',
		shortLabel: 'Volume konten',
		target: 1,
		targetMax: 2,
		unit: 'konten/bulan',
		type: KPI_TYPE.CACAH,
		periode: 'Bulanan',
		formula:
			'VKT = |{ konten bersumber Pertamina/PF, berstatus terbit, pada bulan berjalan }|',
		definisi:
			'Menghitung aset konten unik, bukan peristiwa pengirimannya. Satu konten yang dikirim ulang tiga kali tetap dihitung satu.',
		kutipanSumber:
			'1–2 konten Pertamina dan/atau PF terdiseminasi di forum komunitas Pfriends dalam satu bulan.',
		source: 'Hal 6: Key Objectives',
		ambangKuning: 0.5
	}),
	Object.freeze({
		id: 'M-03',
		label: 'Frekuensi diseminasi',
		shortLabel: 'Frekuensi diseminasi',
		target: 2,
		unit: 'kali/bulan',
		type: KPI_TYPE.CACAH,
		periode: 'Bulanan',
		formula: 'FD = |{ hari kalender unik yang memiliki minimal satu broadcast terkirim }|',
		definisi:
			'Dihitung per hari, bukan per broadcast, agar satu batch berisi lima pesan serentak tidak terhitung lima kali diseminasi. Ini metrik ritme komunikasi.',
		kutipanSumber: 'Melakukan diseminasi informasi ke komunitas minimal 2 kali dalam satu bulan.',
		source: 'Hal 6: Key Objectives',
		ambangKuning: 0.5
	}),
	Object.freeze({
		id: 'M-04',
		label: 'Amplification rate anggota',
		shortLabel: 'Amplifikasi',
		target: 50,
		unit: '%',
		type: KPI_TYPE.RASIO,
		periode: 'Bulanan',
		formula:
			'AR = |{ anggota aktif dengan minimal satu amplifikasi terhitung }| / |anggota aktif| x 100%',
		definisi:
			'Berbasis anggota unik, bukan jumlah share. Satu anggota yang membagikan 20 kali tetap dihitung satu amplifier.',
		kutipanSumber:
			'50% anggota komunitas ikut melakukan amplifikasi informasi Pertamina dan/atau PF.',
		source: 'Hal 6: Key Objectives',
		ambangKuning: 0.8
	}),
	Object.freeze({
		id: 'M-05',
		label: 'Aktivitas engagement terlaksana',
		shortLabel: 'Aktivitas engagement',
		target: 2,
		unit: 'kegiatan',
		type: KPI_TYPE.CACAH,
		periode: 'Sepanjang program Januari–Juli 2026',
		formula:
			'AE = |{ kegiatan berstatus selesai DAN memiliki minimal satu lampiran bukti DAN jumlah hadir >= kuorum }|',
		definisi:
			'Kata kunci Hal 6 adalah "terlaksana", bukan "terjadwal": kegiatan tanpa bukti pelaksanaan tidak dihitung.',
		kutipanSumber: '2 aktivitas engagement komunitas terlaksana.',
		source: 'Hal 6: Key Objectives',
		ambangKuning: 0.5
	})
]);

/**
 * Parameter estimasi jangkauan organik dan konversi reputasi (Hal 6: Dampak Inisiatif).
 *
 * Catatan rekonsiliasi (docs/02 §3.1): perkalian langsung 100 anggota x 25 jaringan
 * menghasilkan 2.500, sedangkan Hal 6 menulis 250. Selisih 10x ini TIDAK diperbaiki
 * di sini: angka sumber dipertahankan apa adanya, dan koefisien eksposur `alpha`
 * diperkenalkan untuk mereproduksi kedua batas Hal 6 secara persis:
 *   pesimis  100 x 25  x 0,10 = 250
 *   optimis  100 x 500 x 1,00 = 50.000
 * Butir ini menunggu konfirmasi Corsec.
 *
 * @type {Readonly<Record<string, number>>}
 */
export const REACH_PARAMETERS = Object.freeze({
	/** Ukuran jaringan sosial per anggota, batas bawah: Hal 6. */
	jaringanSosialMin: 25,
	/** Ukuran jaringan sosial per anggota, batas atas: Hal 6. */
	jaringanSosialMax: 500,
	/** Koefisien eksposur, batas bawah: [ASUMSI] docs/02 §3.1. */
	koefisienEksposurMin: 0.1,
	/** Koefisien eksposur, batas atas: [ASUMSI] docs/02 §3.1. */
	koefisienEksposurMax: 1.0,
	/** Faktor tumpang tindih audiens antaranggota: [ASUMSI] docs/02 §3.2. */
	overlapJaringan: 0.3,
	/** Penurunan kebutuhan paid media, batas bawah: Hal 6. */
	penghematanPaidMediaMin: 0.05,
	/** Penurunan kebutuhan paid media, batas atas: Hal 6. */
	penghematanPaidMediaMax: 0.2,
	/** Pengali engagement konten komunitas dibanding akun brand, batas bawah: Hal 6. */
	pengaliEngagementMin: 2.0,
	/** Pengali engagement konten komunitas dibanding akun brand, batas atas: Hal 6. */
	pengaliEngagementMax: 3.0
});

/**
 * Parameter operasional metrik yang tidak disebut Hal 6 dan berstatus [ASUMSI].
 * Dikumpulkan terpisah dari angka kanonik supaya perbedaan derajat kepastiannya
 * tetap terlihat oleh pembaca kode.
 * @type {Readonly<Record<string, number>>}
 */
export const KPI_PARAMETERS = Object.freeze({
	/** Rentang hari terakhir yang menentukan seorang anggota disebut aktif. */
	windowAnggotaAktifHari: 90,
	/** Jumlah hadir minimum agar sebuah kegiatan dihitung pada M-05. */
	kuorumEngagement: 10,
	/** Jendela deduplikasi peristiwa amplifikasi, dalam jam. */
	dedupAmplifikasiJam: 24,
	/** Batas peristiwa amplifikasi terhitung per anggota per hari. */
	capAmplifikasiHarian: 5,
	/** Volume konten per bulan yang memicu peringatan risiko over-posting. */
	saturasiKontenBulanan: 6
});

/** @type {ReadonlyMap<string, KpiTarget>} */
const TARGET_BY_ID = new Map(KPI_TARGETS.map((kpi) => [kpi.id, kpi]));

/**
 * Mengambil definisi KPI berdasarkan kode metrik.
 * @param {string} id Kode metrik, mis. 'M-01'.
 * @returns {KpiTarget}
 * @throws {RangeError} bila kode tidak dikenal.
 */
export function targetKpi(id) {
	const kpi = TARGET_BY_ID.get(id);
	if (!kpi) {
		throw new RangeError(
			`Kode KPI tidak dikenal: "${id}". Kode yang sah: ${[...TARGET_BY_ID.keys()].join(', ')}`
		);
	}
	return kpi;
}

/**
 * Rasio pencapaian sebuah KPI. Untuk M-02 yang bertarget rentang 1–2, batas bawah
 * rentanglah yang menjadi penyebut: sesuai aturan warna docs/02 (VKT 2 = hijau).
 * @param {number} actual
 * @param {KpiTarget} kpi
 * @returns {number} Rasio pencapaian, 0 bila target tidak positif.
 */
export function rasioPencapaian(actual, kpi) {
	const pembagi = kpi.targetMax ?? kpi.target;
	return pembagi > 0 ? actual / pembagi : 0;
}

/**
 * Status warna sebuah KPI mengikuti aturan warna universal docs/02 §1.2.
 * @param {number} actual
 * @param {KpiTarget} kpi
 * @returns {string} Salah satu KPI_STATUS.
 */
export function statusKpi(actual, kpi) {
	const rasio = rasioPencapaian(actual, kpi);
	if (rasio >= 1) return KPI_STATUS.HIJAU;
	if (rasio >= kpi.ambangKuning) return KPI_STATUS.KUNING;
	return KPI_STATUS.MERAH;
}
