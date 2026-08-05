/**
 * STORE — Gamifikasi Anggota.
 *
 * Tanggung jawab: menjadikan hasil `GamificationEngine` terlihat dan terasa —
 * memperbarui poin, tier, buku besar, dan sisa kuota harian, lalu merayakan apa
 * yang baru saja dicapai anggota.
 *
 * Store ini **tidak menghitung apa pun**. Ia tidak tahu berapa poin sebuah aksi,
 * tidak tahu batas hariannya, dan tidak tahu ambang tier. Seluruhnya berasal dari
 * `GamificationEngine`, `AntiGamingPolicy`, dan `TierResolver`; yang dikerjakan di
 * sini hanyalah menerjemahkan hasil keputusan mereka menjadi keadaan antarmuka dan
 * kalimat yang layak dibaca manusia.
 *
 * Pemisahan itu penting justru karena godaannya besar. Menyalin satu perbandingan
 * kecil ke sini ("kalau poinnya nol berarti gagal") tampak tidak berbahaya, tetapi
 * begitu terjadi ada dua tempat yang memutuskan hal yang sama dan keduanya akan
 * berselisih pada kasus yang tidak terpikirkan — dan yang dilihat anggota adalah
 * versi store, bukan versi mesin.
 *
 * Nada perayaan mengikuti docs/03 §8: yang dirayakan adalah KONTRIBUSINYA, bukan
 * angkanya. Karena itu setiap aksi punya kalimatnya sendiri, dan penolakan karena
 * kuota harian tidak pernah ditulis sebagai kesalahan anggota.
 *
 * @see docs/00-SOURCE-BRIEF.md — Hal 11 tabel skor, Hal 12 tier
 * @see docs/09-BUILD-CONTRACT.md — §5 gamification.perform / refresh
 */

import { browser } from '$app/environment';
import { ActivityType, aturanSkor } from '$lib/domain/constants/scoring-table.js';
import { GamificationEngine } from '$lib/domain/services/GamificationEngine.js';
import { TierResolver } from '$lib/domain/services/TierResolver.js';
import {
	activityRepository,
	badgeRepository,
	awardeeRepository
} from '$lib/infrastructure/repositories/index.js';
import { session } from './session.svelte.js';
import { toast, ToastType } from './toast.svelte.js';

/** Mesin gamifikasi dengan buku besar poin disuntikkan — satu-satunya jalan masuk poin. */
const engine = new GamificationEngine({ activityRepo: activityRepository });

/**
 * Kalimat perayaan per jenis aksi.
 *
 * Ini teks antarmuka, bukan aturan bisnis: tidak ada angka poin maupun ambang di
 * sini, dan mengubahnya tidak mengubah perilaku sistem sedikit pun. Kalimatnya
 * menyebut DAMPAK aksi, bukan mengulang nama aksinya — "kamu melakukan X" tidak
 * memberi tahu anggota mengapa X layak dilakukan lagi besok.
 *
 * @type {Readonly<Record<string, string>>}
 */
const PERAYAAN = Object.freeze({
	[ActivityType.BROADCAST_VIEW]: 'Terima kasih sudah menyimak kabar komunitas hari ini!',
	[ActivityType.CTA_REACT]: 'Tanggapanmu membuat percakapan komunitas tetap hidup!',
	[ActivityType.SHARE_PRIVATE]: 'Terima kasih sudah menyebarkan kabar baik ke jaringanmu!',
	[ActivityType.SHARE_PUBLIC]: 'Kabar Pertamina Foundation kini sampai ke lebih banyak orang berkat kamu!',
	[ActivityType.STORY_SUBMIT]: 'Ceritamu berharga — tim Pertamina Foundation akan segera meninjaunya.',
	[ActivityType.SESSION_ATTEND]: 'Senang melihatmu hadir. Ilmu baru, koneksi baru!',
	[ActivityType.KNOWLEDGE_QA]: 'Jawabanmu menolong anggota lain melangkah lebih cepat!',
	[ActivityType.SPEAKER_MENTOR]: 'Kamu membagikan pengalaman yang tidak ada di buku mana pun!',
	[ActivityType.LEAD_ACTION]: 'Kamu menggerakkan orang lain untuk bertindak — inilah yang dicari Pfriends!'
});

/** Kalimat cadangan bila jenis aksi belum punya perayaannya sendiri. */
const PERAYAAN_BAKU = 'Kontribusimu tercatat. Terima kasih sudah menghidupkan komunitas!';

/** Hasil yang dikembalikan ketika aksi tidak dapat diproses sama sekali. */
const TANPA_SESI = Object.freeze({
	accepted: false,
	points: 0,
	reason: 'Masuk sebagai anggota terlebih dahulu untuk mengumpulkan poin kontribusi.',
	activity: null
});

class GamificationStore {
	/** @type {number} Total Poin Kontribusi, dihitung ulang dari buku besar. */
	points = $state(0);

	/** @type {number} Saldo Koin Tukar yang dapat dibelanjakan. */
	coins = $state(0);

	/** @type {import('$lib/domain/entities/PointActivity.js').PointActivity[]} Riwayat poin, terbaru lebih dulu. */
	ledger = $state.raw([]);

	/** @type {import('$lib/domain/services/GamificationEngine.js').DailyUsageRow[]} Sisa kuota per aksi. */
	dailyUsage = $state.raw([]);

	/** @type {{badge: import('$lib/domain/entities/Badge.js').Badge, unlocked: boolean}[]} */
	badges = $state.raw([]);

	/** @type {boolean} */
	loading = $state(false);

	/** @type {string|null} Jenis aksi yang sedang diproses; UI memakainya untuk status tombol. */
	busy = $state(null);

	/** @type {number} Panjang streak mingguan berjalan. */
	streakWeeks = $state(0);

	/** Tier aktif — murni turunan ambang poin (keputusan K-3). */
	tier = $derived(TierResolver.resolve(this.points));

	/** Progres menuju tier berikutnya. */
	progress = $derived(TierResolver.progress(this.points));

	/** Lencana yang sudah terkumpul. */
	unlockedBadges = $derived(this.badges.filter((entry) => entry.unlocked));

	/** Aksi yang kuotanya masih tersisa hari ini. */
	availableActions = $derived(this.dailyUsage.filter((row) => !row.exhausted));

	/**
	 * Melakukan sebuah aksi berpoin atas nama anggota yang sedang masuk.
	 *
	 * Urutannya: mesin memutuskan → keadaan diperbarui dari buku besar → perayaan
	 * disusun dari hasil keputusan itu. Perayaan sengaja disusun PALING AKHIR agar
	 * tidak mungkin ada notifikasi yang menjanjikan sesuatu yang tidak benar-benar
	 * tercatat.
	 *
	 * @param {string} activityType Salah satu ActivityType.
	 * @param {import('$lib/domain/services/GamificationEngine.js').AwardOptions} [payload]
	 * @returns {Promise<import('$lib/domain/services/GamificationEngine.js').AwardResult>}
	 */
	async perform(activityType, payload = {}) {
		const awardee = session.awardee;
		if (!browser || !awardee) {
			toast.push({
				type: ToastType.INFO,
				title: 'Belum ada sesi anggota',
				message: TANPA_SESI.reason
			});
			return TANPA_SESI;
		}

		// Anggota yang tidak berhak memperoleh poin (ditangguhkan, menunggu
		// verifikasi) dijawab di sini karena mesin tidak mengenal status keanggotaan.
		// Aturannya sendiri tetap milik domain — `canEarnPoints` yang memutuskan.
		if (!awardee.canEarnPoints) {
			const alasan = `Status keanggotaan "${awardee.statusMeta.label}" belum berhak mengumpulkan poin. ${awardee.statusMeta.deskripsi}`;
			toast.push({
				type: ToastType.INFO,
				title: 'Poin belum dapat dikumpulkan',
				message: alasan
			});
			return Object.freeze({ accepted: false, points: 0, reason: alasan, activity: null });
		}

		this.busy = activityType;
		const tierSebelum = this.tier;

		try {
			const hasil = await engine.award(awardee.id, activityType, payload);

			if (hasil.accepted && hasil.points > 0) {
				await this.#sinkronkanSaldo(awardee, hasil.points);
			}
			await this.refresh();
			this.#rayakan(activityType, hasil, tierSebelum);

			return hasil;
		} finally {
			this.busy = null;
		}
	}

	/**
	 * Membaca ulang seluruh keadaan gamifikasi dari buku besar.
	 *
	 * Poin selalu dihitung ulang dari entri, tidak pernah ditambahkan sendiri di
	 * sini. Menambahkan `+= hasil.points` akan lebih cepat, tetapi menciptakan
	 * penghitung kedua yang cepat atau lambat menyimpang dari buku besarnya — dan
	 * saat itu terjadi tidak ada cara memutuskan angka mana yang benar.
	 *
	 * **Sesi yang belum selesai dipulihkan bukan sesi kosong.** Saat halaman dimuat
	 * ulang, `session.restore()` mengembalikan `awardeeId` dari penyimpanan lokal
	 * seketika, sedangkan entity `session.awardee` baru terisi oleh `hydrate()`
	 * yang asinkron. Pemanggil yang tiba di antara dua saat itu — mis. efek
	 * penyiapan zona awardee — akan melihat `awardee === null` padahal orangnya
	 * jelas masih masuk. Menyamakan keadaan itu dengan "tidak ada sesi" lalu
	 * `reset()` membuat poin, jenjang, dan lencana terkunci pada nol sampai ada
	 * yang memanggil ulang; yang benar adalah menunggu pemulihan selesai dulu.
	 *
	 * @returns {Promise<void>}
	 */
	async refresh() {
		if (!browser) {
			this.reset();
			return;
		}

		let awardee = session.awardee;
		if (!awardee && session.awardeeId !== null) {
			await session.hydrate();
			awardee = session.awardee ?? (await session.refresh());
		}

		if (!awardee) {
			this.reset();
			return;
		}

		this.loading = true;
		try {
			const [points, ledger, dailyUsage, badges] = await Promise.all([
				engine.totalPoints(awardee.id),
				engine.ledger(awardee.id),
				engine.dailyUsage(awardee.id),
				badgeRepository.catalogFor(awardee)
			]);

			this.points = points;
			this.ledger = ledger;
			this.dailyUsage = dailyUsage;
			this.badges = badges;
			this.coins = awardee.coins;
			this.streakWeeks = awardee.streakWeeks;
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Mengosongkan keadaan. Dipanggil saat sesi berakhir supaya poin anggota
	 * sebelumnya tidak sempat terlihat oleh peran berikutnya.
	 * @returns {void}
	 */
	reset() {
		this.points = 0;
		this.coins = 0;
		this.ledger = [];
		this.dailyUsage = [];
		this.badges = [];
		this.streakWeeks = 0;
		this.busy = null;
	}

	/**
	 * Pratinjau kelayakan sebuah aksi tanpa menulis apa pun — dipakai UI untuk
	 * menonaktifkan tombol beserta alasannya sebelum anggota menekannya.
	 * @param {string} activityType
	 * @returns {Promise<{allowed: boolean, points: number, reason: string|null, remaining: number}|null>}
	 */
	async preview(activityType) {
		const awardee = session.awardee;
		if (!browser || !awardee) return null;
		return engine.preview(awardee.id, activityType);
	}

	/**
	 * Baris kuota harian sebuah aksi.
	 * @param {string} activityType
	 * @returns {import('$lib/domain/services/GamificationEngine.js').DailyUsageRow|null}
	 */
	usageFor(activityType) {
		return this.dailyUsage.find((row) => row.type === activityType) ?? null;
	}

	/**
	 * Menyelaraskan saldo tersimpan anggota dengan buku besar.
	 *
	 * Kolom `points` pada anggota adalah cache yang dibaca papan peringkat dan
	 * direktori; buku besar tetap kebenarannya. Keduanya disamakan di sini supaya
	 * papan peringkat tidak tertinggal satu aksi di belakang. Koin Tukar dan poin
	 * musim naik dengan selisih yang sama, sehingga invarian "poin musim tidak
	 * melebihi total poin" terjaga tanpa perlu diperiksa ulang.
	 *
	 * @param {import('$lib/domain/entities/Awardee.js').Awardee} awardee
	 * @param {number} diperoleh
	 * @returns {Promise<void>}
	 */
	async #sinkronkanSaldo(awardee, diperoleh) {
		const total = await engine.totalPoints(awardee.id);
		await awardeeRepository.update(awardee.id, {
			points: total,
			coins: awardee.coins + diperoleh,
			seasonPoints: awardee.seasonPoints + diperoleh,
			lastActiveAt: new Date().toISOString()
		});
		await session.refresh();
	}

	/**
	 * Menyusun notifikasi yang sesuai dengan apa yang benar-benar terjadi.
	 *
	 * Tiga keadaan dibedakan dengan sengaja, karena ketiganya berbeda arti bagi
	 * anggota: aksi ditolak kuota (coba lagi besok), aksi tercatat tetapi poinnya
	 * menunggu bukti (ada langkah lanjutan), dan aksi berpoin penuh (rayakan).
	 *
	 * @param {string} activityType
	 * @param {import('$lib/domain/services/GamificationEngine.js').AwardResult} hasil
	 * @param {import('$lib/domain/value-objects/Tier.js').Tier} tierSebelum
	 * @returns {void}
	 */
	#rayakan(activityType, hasil, tierSebelum) {
		const rule = aturanSkor(activityType);

		if (!hasil.accepted) {
			// Nada informatif, bukan galat: kuota harian adalah rancangan anti-spam
			// yang melindungi nilai poin, bukan hukuman atas kontribusi anggota.
			toast.push({
				type: ToastType.INFO,
				title: 'Kuota harian aksi ini sudah penuh',
				message: hasil.reason ?? undefined
			});
			return;
		}

		if (hasil.points === 0) {
			toast.push({
				type: ToastType.WARNING,
				title: `${rule.label} tercatat`,
				message: hasil.reason ?? undefined
			});
			return;
		}

		toast.push({
			type: ToastType.POINTS,
			title: rule.label,
			message: PERAYAAN[activityType] ?? PERAYAAN_BAKU,
			points: hasil.points,
			newTotal: this.points
		});

		if (this.tier.rank > tierSebelum.rank) this.#rayakanKenaikanTier();
	}

	/**
	 * Notifikasi kenaikan tier — menetap sampai ditutup sendiri oleh anggota.
	 *
	 * Kalimatnya menyebut benefit tier yang baru terbuka, bukan sekadar namanya.
	 * Tier tanpa benefit yang disebutkan hanyalah label; yang membuatnya terasa
	 * layak diperjuangkan adalah apa yang kini boleh dilakukan pemegangnya.
	 * @returns {void}
	 */
	#rayakanKenaikanTier() {
		const tier = this.tier;
		toast.push({
			type: ToastType.SUCCESS,
			title: `Selamat, kamu naik ke ${tier.label}!`,
			message: `${tier.deskripsi} Mulai sekarang kamu ${tier.benefit.toLowerCase()}.`,
			tier: tier.level,
			sticky: true
		});
	}
}

/** Instans tunggal yang dipakai seluruh aplikasi. */
export const gamification = new GamificationStore();
