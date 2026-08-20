/**
 * REPOSITORY: Katalog Penukaran Poin (Hal 5 pilar 05).
 *
 * Tanggung jawab: akses data item yang dapat ditukar awardee dengan Koin Tukar,
 * beserta rekaman penukarannya.
 *
 * Perhatikan pembagian tabel: `rewards` adalah katalog (definisi item), sedangkan
 * `redemptions` adalah peristiwa penukaran. Menggabungkan keduanya akan membuat
 * riwayat penukaran seorang awardee hilang begitu item ditarik dari katalog :
 * padahal justru riwayat itulah bukti bahwa poin benar-benar dapat ditukar.
 *
 * PENUKARAN ADALAH SATU TRANSAKSI, DAN PERAKITANNYA TINGGAL DI SINI.
 * Sebelumnya sebuah komponen halaman merakit penukaran sendiri: memanggil
 * `awardeeRepository.update()` untuk memotong koin, lalu `saveRedemption()` untuk
 * menaruh barisnya, dan tidak pernah menyentuh pencacah kuota sama sekali. Tiga
 * cacat sekaligus lahir dari sana: kuota bulanan yang tidak pernah berkurang,
 * potongan koin yang dapat berhasil sementara pencatatannya gagal, dan aturan
 * bisnis yang hidup di dalam berkas `.svelte`. Kini ketiga tabel ditulis di dalam
 * SATU transaksi Dexie `rw`, dan kelayakannya diperiksa ulang atas baris yang
 * dibaca DI DALAM transaksi itu. Klik ganda di depan atasan tidak lagi dapat
 * menembus kuota, karena penukaran kedua membaca pencacah yang sudah naik.
 *
 * Transaksi itu pula yang menjelaskan mengapa repository ini menyentuh tabel
 * `awardees`: bukan karena batas repository kabur, melainkan karena Dexie menuntut
 * seluruh tabel sebuah transaksi disebutkan pada satu pemanggilan. Memecahnya
 * menjadi dua repository berarti memecahnya menjadi dua transaksi, dan atomisitas
 * yang menjadi seluruh tujuan method ini hilang.
 *
 * @see src/lib/domain/entities/Reward.js
 * @see docs/03-GAMIFICATION-SPEC.md: §10 katalog penukaran
 */

import { Awardee } from '$lib/domain/entities/Awardee.js';
import { kunciBulanKuota, Reward, RewardStatus } from '$lib/domain/entities/Reward.js';
import { getDb, TABLE } from '../db.js';
import { DexieRepository } from './DexieRepository.js';
import { RedemptionStatus, REDEMPTION_STATUS_META } from './redemption-status.js';

export { RedemptionStatus, REDEMPTION_STATUS_META };

/**
 * @typedef {object} RedemptionOutcome
 * @property {boolean} ok                       `false` berarti tidak ada satu pun baris ditulis.
 * @property {string|null} reason               Alasan penolakan, siap ditampilkan kepada anggota.
 * @property {Record<string, any>|null} redemption Baris penukaran yang tercatat.
 * @property {Reward|null} reward               Katalog sesudah pencacah kuota naik.
 * @property {Awardee|null} awardee             Anggota sesudah Koin Tukar dipotong.
 */

/**
 * Hasil penolakan yang seragam: seluruh jalur gagal memakai bentuk yang sama
 * supaya pemanggil tidak perlu membedakan "gagal karena data" dari "gagal karena
 * aturan". Keduanya sama-sama berarti: tidak ada yang berubah.
 * @param {string} reason
 * @returns {RedemptionOutcome}
 */
function ditolak(reason) {
	return { ok: false, reason, redemption: null, reward: null, awardee: null };
}

export class RewardRepository extends DexieRepository {
	constructor() {
		super({
			tableName: TABLE.REWARDS,
			entity: Reward,
			indexedFields: ['category', 'status', 'community']
		});
	}

	/**
	 * Item yang masih dapat ditukar, diurutkan dari yang termurah: awardee bertier
	 * rendah harus melihat sesuatu yang terjangkau lebih dulu, bukan deretan hadiah
	 * yang belum mungkin diraihnya.
	 * @param {Date} [pada] Waktu acuan pembacaan kuota bulanan; default sekarang.
	 * @returns {Promise<Reward[]>}
	 */
	async available(pada = new Date()) {
		const monthKey = kunciBulanKuota(pada);
		const rewards = await this.query({ status: RewardStatus.TERSEDIA });
		return rewards
			.filter((reward) => reward.isAvailableFor(monthKey))
			.sort((a, b) => a.priceCoins - b.priceCoins);
	}

	/**
	 * Item yang terbuka bagi sebuah komunitas.
	 * @param {string} community Salah satu CommunityType.
	 * @returns {Promise<Reward[]>}
	 */
	async forCommunity(community) {
		const rewards = await this.getAll();
		return rewards.filter((reward) => reward.isOpenTo(community));
	}

	/**
	 * Item pada sebuah kategori katalog.
	 * @param {string} category Salah satu REWARD_CATEGORY.
	 * @returns {Promise<Reward[]>}
	 */
	async byCategory(category) {
		return this.query({ category });
	}

	/**
	 * Item yang benar-benar dapat ditukar seorang awardee saat ini, beserta alasan
	 * bagi yang belum bisa. Alasan ikut dikembalikan supaya kartu penghargaan dapat
	 * menjelaskan apa yang kurang alih-alih menampilkan tombol mati tanpa keterangan.
	 * @param {import('$lib/domain/entities/Awardee.js').Awardee} awardee
	 * @param {Date} [pada] Waktu acuan pembacaan kuota bulanan; default sekarang.
	 * @returns {Promise<{reward: Reward, allowed: boolean, reason: string|null}[]>}
	 */
	async catalogFor(awardee, pada = new Date()) {
		const monthKey = kunciBulanKuota(pada);
		const rewards = await this.forCommunity(awardee.community);
		return rewards
			.map((reward) => ({ reward, ...reward.canBeRedeemedBy(awardee, monthKey) }))
			.sort((a, b) => Number(b.allowed) - Number(a.allowed) || a.reward.priceCoins - b.reward.priceCoins);
	}

	/**
	 * Riwayat penukaran seorang awardee, terbaru lebih dulu.
	 * @param {string} awardeeId
	 * @returns {Promise<Record<string, any>[]>}
	 */
	async redemptionsFor(awardeeId) {
		const table = await this.redemptionTable();
		if (!table) return [];
		const rows = await table.where('awardeeId').equals(awardeeId).toArray();
		return rows.sort((a, b) => String(b.requestedAt).localeCompare(String(a.requestedAt)));
	}

	/**
	 * Seluruh penukaran yang menunggu tindakan admin.
	 * @returns {Promise<Record<string, any>[]>}
	 */
	async pendingRedemptions() {
		const table = await this.redemptionTable();
		if (!table) return [];
		return table.where('status').equals(RedemptionStatus.DIAJUKAN).toArray();
	}

	/**
	 * Mencatat satu penukaran baru apa adanya.
	 *
	 * TIDAK memotong koin dan TIDAK menaikkan pencacah kuota: ia hanya menaruh
	 * baris. Dipakai proses seed dan jalur administratif yang memang sudah mengurus
	 * dua hal itu sendiri. Untuk penukaran yang dilakukan anggota, pakai
	 * {@link RewardRepository#redeem}; jalur ini akan meninggalkan kuota dan saldo
	 * dalam keadaan tidak konsisten bila dipakai sendirian.
	 *
	 * @param {Record<string, any>} redemption
	 * @returns {Promise<Record<string, any>>}
	 */
	async saveRedemption(redemption) {
		const table = await this.redemptionTable();
		if (table) await table.put({ ...redemption });
		return redemption;
	}

	/**
	 * Menukarkan Koin Tukar seorang anggota dengan satu item katalog: ATOMIK.
	 *
	 * Satu transaksi `rw` atas tiga tabel mengerjakan empat hal yang wajib berhasil
	 * atau gagal bersama-sama: membaca ulang katalog dan anggota, memeriksa
	 * kelayakan, memotong Koin Tukar, menaikkan pencacah kuota bulan berjalan, dan
	 * menaruh baris penukaran.
	 *
	 * Kelayakan diperiksa atas baris yang dibaca DI DALAM transaksi, bukan atas
	 * objek yang sudah dipegang halaman. Jeda antara kartu dirender dan tombol
	 * ditekan cukup panjang untuk membuat pemeriksaan pertama basi: saldo bisa saja
	 * sudah terpakai di tab lain, dan kuota bisa saja sudah diambil anggota lain.
	 * Pemotongan koin ganda tidak akan pernah bisa dibatalkan.
	 *
	 * Nomor urut penukaran juga dihitung di dalam transaksi, bukan dari panjang
	 * daftar yang sedang tampil di layar. Dua klik beruntun pada daftar yang sama
	 * menghasilkan nomor yang sama, dan `put` yang kedua akan MENIMPA penukaran
	 * pertama alih-alih menambahkannya: kehilangan yang senyap.
	 *
	 * @param {object} permintaan
	 * @param {string} permintaan.awardeeId
	 * @param {string} permintaan.rewardId
	 * @param {Date} [permintaan.pada] Waktu penukaran; menentukan bulan kuota. Default sekarang.
	 * @returns {Promise<RedemptionOutcome>}
	 */
	async redeem({ awardeeId, rewardId, pada = new Date() }) {
		const database = await getDb();
		if (!database) return ditolak('Basis data tidak tersedia di lingkungan ini.');

		const monthKey = kunciBulanKuota(pada);
		const waktu = pada.toISOString();
		const tabelReward = database.table(TABLE.REWARDS);
		const tabelAwardee = database.table(TABLE.AWARDEES);
		const tabelPenukaran = database.table(TABLE.REDEMPTIONS);

		return database.transaction('rw', [tabelReward, tabelAwardee, tabelPenukaran], async () => {
			const barisReward = await tabelReward.get(rewardId);
			if (!barisReward) return ditolak('Penghargaan ini tidak lagi ada di katalog.');
			const barisAwardee = await tabelAwardee.get(awardeeId);
			if (!barisAwardee) return ditolak('Data keanggotaanmu tidak ditemukan.');

			const reward = Reward.from(barisReward);
			const awardee = Awardee.from(barisAwardee);

			const kelayakan = reward.canBeRedeemedBy(awardee, monthKey);
			if (!kelayakan.allowed) return ditolak(kelayakan.reason ?? 'Penukaran belum dapat diproses.');

			// Melempar RangeError bila kuota habis: jaring kedua di bawah pemeriksaan
			// kelayakan, dan sengaja dibiarkan melempar: sampai di sini artinya dua
			// pembacaan kuota berbeda pendapat, dan transaksi wajib batal seluruhnya.
			const rewardSesudah = reward.withRedemptionRecorded(monthKey);
			const sisaKoin = awardee.coins - reward.priceCoins;
			const awardeeSesudah = awardee.withChanges({ coins: sisaKoin });

			const nomor = await this.#nomorPenukaran(tabelPenukaran, awardeeId, rewardId);
			const redemption = {
				id: `RDM-${awardeeId}-${rewardId}-${nomor}`,
				awardeeId,
				rewardId,
				rewardName: reward.name,
				coins: reward.priceCoins,
				status: reward.requiresApproval ? RedemptionStatus.DIAJUKAN : RedemptionStatus.DIKIRIM,
				requestedAt: waktu,
				fulfilledAt: null,
				note: reward.fulfillmentNote
			};

			await tabelReward.put(rewardSesudah.toJSON());
			await tabelAwardee.put(awardeeSesudah.toJSON());
			await tabelPenukaran.put(redemption);

			return { ok: true, reason: null, redemption, reward: rewardSesudah, awardee: awardeeSesudah };
		});
	}

	/**
	 * Nomor urut penukaran berikutnya bagi satu pasangan anggota–penghargaan.
	 *
	 * Dihitung dari baris yang benar-benar ada, di dalam transaksi pemanggil,
	 * sehingga tidak mungkin bertabrakan dengan penukaran yang tercatat sepersekian
	 * detik sebelumnya.
	 *
	 * @param {import('dexie').Table} tabelPenukaran
	 * @param {string} awardeeId
	 * @param {string} rewardId
	 * @returns {Promise<string>} Dua digit, mis. `'03'`.
	 */
	async #nomorPenukaran(tabelPenukaran, awardeeId, rewardId) {
		const milikAnggota = await tabelPenukaran.where('awardeeId').equals(awardeeId).toArray();
		const sejenis = milikAnggota.filter((baris) => baris.rewardId === rewardId).length;
		return String(sejenis + 1).padStart(2, '0');
	}

	/**
	 * Tabel penukaran. Dipisahkan menjadi method agar seluruh akses ke tabel kedua
	 * repository ini melewati satu titik yang sama-sama aman di server.
	 * @protected
	 * @returns {Promise<import('dexie').Table|null>}
	 */
	async redemptionTable() {
		const database = await getDb();
		return database ? database.table(TABLE.REDEMPTIONS) : null;
	}
}

/** Instans tunggal yang dipakai seluruh aplikasi. */
export const rewardRepository = new RewardRepository();
