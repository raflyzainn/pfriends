/**
 * KOSAKATA STATUS PENUKARAN.
 *
 * Berkas ini sengaja tidak mengimpor apa pun. Status penukaran dibutuhkan oleh dua
 * pihak yang tidak boleh saling bergantung: `RewardRepository` yang membacanya dari
 * Dexie, dan pembangkit seed yang harus dapat dijalankan di Node polos untuk
 * diverifikasi. Menaruhnya di dalam repository akan menyeret `$lib` dan
 * `$app/environment` — dua alias milik SvelteKit — ke dalam proses verifikasi yang
 * seharusnya tidak memerlukan bundler sama sekali.
 *
 * @see ./RewardRepository.js — yang mengekspor ulang kosakata ini
 */

/**
 * Status siklus hidup penukaran Koin Tukar.
 * @readonly
 * @enum {string}
 */
export const RedemptionStatus = Object.freeze({
	DIAJUKAN: 'DIAJUKAN',
	DISETUJUI: 'DISETUJUI',
	DIKIRIM: 'DIKIRIM',
	SELESAI: 'SELESAI',
	DITOLAK: 'DITOLAK'
});

/**
 * Metadata status penukaran untuk komponen StatusBadge.
 * @type {Readonly<Record<string, {code: string, label: string, badgeColor: string}>>}
 */
export const REDEMPTION_STATUS_META = Object.freeze({
	[RedemptionStatus.DIAJUKAN]: Object.freeze({
		code: RedemptionStatus.DIAJUKAN,
		label: 'Diajukan',
		badgeColor: 'amber'
	}),
	[RedemptionStatus.DISETUJUI]: Object.freeze({
		code: RedemptionStatus.DISETUJUI,
		label: 'Disetujui',
		badgeColor: 'blue'
	}),
	[RedemptionStatus.DIKIRIM]: Object.freeze({
		code: RedemptionStatus.DIKIRIM,
		label: 'Dalam pengiriman',
		badgeColor: 'purple'
	}),
	[RedemptionStatus.SELESAI]: Object.freeze({
		code: RedemptionStatus.SELESAI,
		label: 'Selesai',
		badgeColor: 'green'
	}),
	[RedemptionStatus.DITOLAK]: Object.freeze({
		code: RedemptionStatus.DITOLAK,
		label: 'Ditolak',
		badgeColor: 'slate'
	})
});
