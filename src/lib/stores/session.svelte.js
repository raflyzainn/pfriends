/**
 * STORE: Sesi Pengguna.
 *
 * Tanggung jawab: mengingat siapa yang sedang masuk, memeriksa kredensial lewat
 * `AuthService`, dan menjawab satu pertanyaan yang ditanyakan seluruh guard :
 * "boleh tidak orang ini membuka jalur ini?".
 *
 * Lima keputusan yang tidak terbaca dari kode:
 *
 * 1. **Store ini adalah composition root.** `AuthService` menerima repository lewat
 *    konstruktor tanpa nilai bawaan (D-2/D-3); perakitannya terjadi di sini, bukan
 *    di dalam service. Domain karenanya tetap tidak pernah menyentuh Dexie.
 * 2. **`login()` memanggil `bootstrapDatabase()` sebagai langkah PERTAMA.** Peramban
 *    dengan IndexedDB kosong yang membuka `/masuk` secara langsung akan menemukan
 *    tabel `accounts` kosong, dan kredensial demo yang benar akan ditolak sebagai
 *    `KREDENSIAL_SALAH`: kegagalan yang mustahil ditebak penggunanya. Efek
 *    penyiapan di layout publik adalah balapan, bukan jaminan.
 * 3. **`ready` terpisah dari `isAuthenticated`.** `ready` menjawab "sudah tahu
 *    belum?", `isAuthenticated` menjawab "punya sesi tidak?". Guard yang hanya
 *    membaca `isAuthenticated` akan melempar keluar setiap pengguna sah pada
 *    milidetik pertama sesudah muat ulang, karena saat itu jawabannya memang belum
 *    ada. Satu bendera saja tidak cukup; dua bendera cukup: dan bendera ketiga
 *    (`hydrated`) sengaja TIDAK ada, lihat §2.12 kontrak.
 * 4. **Keputusan akses TIDAK ditulis di sini.** `canAccess`, `homePath`, dan
 *    `nextAfterLogin` seluruhnya mendelegasikan ke `AccessPolicy`. Store yang
 *    menyalin aturan zona akan menjadi gerbang kedua yang cepat berbeda pendapat
 *    dengan gerbang pertama.
 * 5. **Sesi lama bentuk `{role:'member'}` dibaca sebagai tamu, tanpa galat.** Nilai
 *    peran yang tidak dikenal `UserRole` bukan kerusakan yang perlu dilaporkan ke
 *    konsol; ia hanya sesi dari versi aplikasi yang sudah tidak ada.
 *
 * Poin TIDAK disimpan pada potret sesi. Poin berubah setiap aksi dan sumber
 * kebenarannya adalah buku besar; menyalinnya ke localStorage hanya menciptakan
 * angka kedua yang cepat basi.
 *
 * @see docs/12-BUILD-CONTRACT-V2.md: §2.12 kontrak store sesi, §3.2 kriteria selesai WP-02
 * @see docs/10-REVISION-SPEC.md: §3 sesi dan hidrasi
 */

import { browser } from '$app/environment';
import { UserRole, peranPengguna } from '$lib/domain/constants/roles.js';
import { UserAccount } from '$lib/domain/entities/UserAccount.js';
import { AccessPolicy } from '$lib/domain/policies/AccessPolicy.js';
import { AuthService } from '$lib/domain/services/AuthService.js';
import { accountRepository, awardeeRepository } from '$lib/infrastructure/repositories/index.js';
import { bootstrapDatabase } from '$lib/infrastructure/seed/bootstrap.js';
import { getPocketBase } from '$lib/infrastructure/pocketbase/client.js';
import { isApprovedOnboarding, RegistrationStatus } from '$lib/domain/constants/registration.js';
import { apiRequest } from '$lib/infrastructure/sveltekit-api/client.js';

/** Kunci penyimpanan sesi di localStorage. */
const KUNCI_SESI = 'pfriends_dummy_session';
const KUNCI_IMPERSONASI = 'pfriends_dummy_impersonation';

/** Nilai peran yang sah untuk dipulihkan dari penyimpanan. */
const PERAN_SAH = Object.freeze(Object.values(UserRole));

/**
 * Pesan yang dipakai ketika kegagalan tidak punya kode yang dikenal: mis.
 * IndexedDB ditolak peramban. Pesan tiap `AuthFailure` hidup di domain dan tidak
 * pernah disalin ke sini.
 */
const PESAN_GALAT_TAK_TERDUGA =
	'Masuk gagal diproses di peramban ini. Muat ulang halaman, lalu coba sekali lagi.';

/**
 * @typedef {object} SessionUser
 * @property {string} id        Identitas akun (`UserAccount.id`).
 * @property {string} name      Nama yang disapa antarmuka.
 * @property {string} role      Salah satu UserRole.
 * @property {string} initials  Inisial untuk avatar.
 * @property {string} email
 * @property {string} [awardeeId] Identitas awardee; hanya untuk peran AWARDEE.
 * @property {string} [unit]      Unit kerja; hanya untuk staf Pertamina Foundation.
 */

/**
 * @typedef {object} LoginOutcome
 * @property {boolean} success
 * @property {string} error Pesan Bahasa Indonesia siap tampil; `''` bila berhasil.
 */

/**
 * @typedef {object} SesiTersimpan
 * @property {string|null} role
 * @property {string|null} accountId
 * @property {string|null} awardeeId
 * @property {string|null} onboardingStatus
 * @property {SessionUser|null} user
 */

/** Bentuk sesi kosong: tamu. */
const SESI_KOSONG = Object.freeze({ role: null, accountId: null, awardeeId: null, onboardingStatus: null, user: null });

/**
 * Membaca sesi tersimpan.
 *
 * Kegagalan apa pun: localStorage diblokir, JSON rusak, atau bentuk lama dari
 * versi sebelumnya (`{role:'member'}`): diperlakukan sebagai "belum ada sesi".
 * Melempar di sini akan mematikan seluruh aplikasi hanya karena satu baris
 * penyimpanan yang tidak dapat dibaca, dan menulis ke konsol hanya menakut-nakuti
 * peninjau tentang keadaan yang sudah tertangani.
 *
 * @returns {SesiTersimpan}
 */
function bacaSesiTersimpan() {
	if (!browser) return { ...SESI_KOSONG };
	try {
		const mentah = localStorage.getItem(KUNCI_SESI);
		if (!mentah) return { ...SESI_KOSONG };
		const data = JSON.parse(mentah);
		const role = PERAN_SAH.includes(data?.role) ? data.role : null;
		if (role === null) return { ...SESI_KOSONG };
		return {
			role,
			accountId: typeof data?.accountId === 'string' ? data.accountId : null,
			awardeeId: typeof data?.awardeeId === 'string' ? data.awardeeId : null,
			onboardingStatus: typeof data?.onboardingStatus === 'string' ? data.onboardingStatus : null,
			user: data?.user ?? null
		};
	} catch {
		return { ...SESI_KOSONG };
	}
}

function bacaImpersonasi() {
	if (!browser) return null;
	try {
		const value = JSON.parse(sessionStorage.getItem(KUNCI_IMPERSONASI) || 'null');
		return value?.adminToken && value?.adminRecord && value?.id && value?.expiresAt ? value : null;
	} catch { return null; }
}

/**
 * Potret ringkas seorang pengguna untuk kebutuhan tampilan sesi.
 *
 * Potret ikut tersimpan di localStorage supaya nama pengguna tampil seketika saat
 * halaman dimuat ulang, sebelum IndexedDB sempat terbuka. Tanpa lapis ini setiap
 * muat ulang menampilkan header kosong lebih dulu: kedipan yang tidak perlu
 * dilihat siapa pun.
 *
 * @param {UserAccount} account
 * @returns {SessionUser}
 */
function potretPengguna(account) {
	return {
		id: account.id,
		name: account.displayName,
		role: account.role,
		initials: account.initials,
		email: account.email,
		...(account.awardeeId ? { awardeeId: account.awardeeId } : {}),
		...(account.unit ? { unit: account.unit } : {})
	};
}

function inisialDariNama(name) {
	const words = String(name || '').trim().split(/\s+/).filter(Boolean);
	if (words.length === 0) return 'PF';
	const selected = words.length === 1 ? [words[0]] : [words[0], words[words.length - 1]];
	return selected.map((word) => word.charAt(0).toUpperCase()).join('');
}

function principalPocketBase(record) {
	const displayName = record.displayName || record.email;
	return Object.freeze({
		id: record.legacyAccountId || record.id,
		pocketBaseId: record.id,
		email: record.email,
		displayName,
		role: record.role,
		awardeeId: record.awardeeId || null,
		unit: record.unit || '',
		status: record.status,
		initials: inisialDariNama(displayName),
		isActive: record.status === 'AKTIF',
		isAwardee: record.role === UserRole.AWARDEE,
		isVerifier: record.role === UserRole.VERIFIER,
		isAdmin: record.role === UserRole.ADMIN
	});
}

class SessionStore {
	/** @type {string|null} Salah satu UserRole; `null` berarti tamu. */
	role = $state(null);

	/** @type {UserAccount|null} Akun yang sedang masuk. */
	account = $state.raw(null);

	/**
	 * @type {import('$lib/domain/entities/Awardee.js').Awardee|null}
	 * Entity awardee penuh; `null` untuk verifikator, admin, dan tamu.
	 */
	awardee = $state.raw(null);

	/** @type {SessionUser|null} Potret ringkas pengguna aktif. */
	user = $state(null);

	/** Status onboarding PocketBase; null untuk tamu. */
	onboardingStatus = $state(null);

	/** @type {boolean} Hidrasi sesi sudah selesai: jawaban sudah ada, apa pun isinya. */
	ready = $state(false);

	/** @type {boolean} Sedang memeriksa kredensial atau memuat entity. */
	loading = $state(false);

	/** @type {string|null} Pesan galat terakhir yang layak ditampilkan. */
	error = $state(null);

	/** Metadata sesi Admin yang sedang membuka ruang Awardee. */
	impersonation = $state.raw(null);

	/** Ada sesi aktif. */
	isAuthenticated = $derived(this.role !== null);

	isApplicant = $derived(this.isAuthenticated && !isApprovedOnboarding(this.onboardingStatus));

	isAwardee = $derived(this.role === UserRole.AWARDEE);

	isVerifier = $derived(this.role === UserRole.VERIFIER);

	isAdmin = $derived(this.role === UserRole.ADMIN);

	/** Nama yang layak disapa di antarmuka. */
	displayName = $derived(this.user?.name ?? 'Tamu');

	/** Label peran Bahasa Indonesia; `''` untuk tamu. */
	roleLabel = $derived(peranPengguna(this.role)?.label ?? '');

	/** @type {string|null} */
	#awardeeId = $state(null);

	/** @type {string|null} */
	#accountId = $state(null);

	/** @type {Promise<void>|null} Hidrasi yang sedang berjalan. */
	#hidrasi = null;

	/** @type {AuthService|null} Dirakit malas: konstruktor store berjalan juga di server. */
	#auth = null;

	/**
	 * Sesi dipulihkan dari localStorage secara sinkron. Entity TIDAK dimuat di sini:
	 * konstruktor berjalan saat modul diimpor, termasuk saat prerender di server,
	 * dan membuka IndexedDB pada saat itu bukan pekerjaan konstruktor. Pemulihan
	 * lengkapnya dikerjakan `hydrate()` yang dipanggil `ZoneGuard`.
	 */
	constructor() {
		const tersimpan = bacaSesiTersimpan();
		this.impersonation = bacaImpersonasi();
		this.role = tersimpan.role;
		this.user = tersimpan.user;
		this.#accountId = tersimpan.accountId;
		this.#awardeeId = tersimpan.awardeeId;
		this.onboardingStatus = tersimpan.onboardingStatus;
		// Tidak ada yang perlu dihidrasi bila kita di server atau tidak ada sesi
		// tersimpan: menahan `ready` pada keadaan itu membuat halaman menampilkan
		// pemuatan yang tidak akan pernah selesai.
		this.ready = !browser || tersimpan.role === null;
	}

	/** @returns {string|null} Identitas awardee pemilik sesi; `null` untuk peran lain. */
	get awardeeId() {
		return this.#awardeeId;
	}

	/** @returns {string|null} Identitas akun pemilik sesi. */
	get accountId() {
		return this.#accountId;
	}

	get isImpersonating() { return this.impersonation !== null; }

	async beginImpersonation(result) {
		if (!browser) throw new Error('Impersonasi hanya tersedia di peramban.');
		const pb = getPocketBase();
		if (!pb?.authStore.isValid || !this.isAdmin) throw new Error('Sesi Admin tidak tersedia.');
		const state = { ...result.impersonation, adminToken: pb.authStore.token, adminRecord: pb.authStore.record };
		sessionStorage.setItem(KUNCI_IMPERSONASI, JSON.stringify(state));
		this.impersonation = state;
		pb.authStore.save(result.token, result.record);
		const principal = principalPocketBase(result.record);
		const awardee = principal.awardeeId ? await awardeeRepository.getById(principal.awardeeId) : null;
		if (!awardee) throw new Error('Profil Awardee tidak tersedia.');
		this.#terapkan(principal, awardee, RegistrationStatus.APPROVED);
	}

	async endImpersonation() {
		if (!browser || !this.impersonation) return false;
		const state = this.impersonation;
		const pb = getPocketBase();
		pb.authStore.save(state.adminToken, state.adminRecord);
		const principal = principalPocketBase(state.adminRecord);
		this.#terapkan(principal, null, state.adminRecord.onboardingStatus || RegistrationStatus.APPROVED);
		try {
			const { endAwardeeImpersonation } = await import('$lib/infrastructure/pocketbase/adminAwardees.js');
			await endAwardeeImpersonation(state.id);
		} finally {
			sessionStorage.removeItem(KUNCI_IMPERSONASI);
			this.impersonation = null;
		}
		return true;
	}

	/**
	 * Masuk dengan surel dan kata sandi.
	 *
	 * `bootstrapDatabase()` dipanggil lebih dulu, sebelum menyentuh `AuthService`.
	 * Lihat butir 2 pada catatan berkas: tanpa itu, kredensial demo yang benar
	 * ditolak di peramban yang IndexedDB-nya masih kosong.
	 *
	 * Tidak melempar: gagal masuk adalah jawaban yang sah, dan halaman `/masuk`
	 * hanya perlu satu kalimat untuk ditampilkan.
	 *
	 * @param {string} email
	 * @param {string} password
	 * @returns {Promise<LoginOutcome>}
	 */
	async login(email, password) {
		if (!browser) return { success: false, error: PESAN_GALAT_TAK_TERDUGA };

		this.loading = true;
		this.error = null;
		try {
			await bootstrapDatabase();
			const pb = getPocketBase();
			if (!pb) throw new Error('PocketBase tidak tersedia.');
			const hasil = await apiRequest('/api/pfriends/auth/login', { method: 'POST', body: { email, password } });
			pb.authStore.save(hasil.token, hasil.record);
			const onboarding = hasil.record.onboardingStatus || RegistrationStatus.APPROVED;
			const principal = principalPocketBase(hasil.record);
			if (!isApprovedOnboarding(onboarding)) {
				this.#terapkan(principal, null, onboarding);
				return { success: true, error: '' };
			}
			if (!principal.isActive) throw new Error('Akun tidak aktif.');
			const akunLokal = hasil.record.legacyAccountId
				? await accountRepository.getById(hasil.record.legacyAccountId)
				: null;
			const akun = akunLokal && akunLokal.role === hasil.record.role ? akunLokal : principal;
			const awardee = akunLokal
				? await this.#authService().awardeeOf(akunLokal)
				: principal.awardeeId
					? await awardeeRepository.getById(principal.awardeeId)
					: null;
			if (principal.isAwardee && !awardee) throw new Error('Profil Awardee belum tersedia.');
			this.#terapkan(akun, awardee, onboarding);
			return { success: true, error: '' };
		} catch (error) {
			// Kegagalan penyimpanan peramban (mode privat, kuota, IndexedDB diblokir)
			// bukan kredensial yang salah, dan pesannya tidak boleh menyesatkan
			// pengguna untuk mengetik ulang sandi yang sebenarnya sudah benar.
			this.error = error?.message || PESAN_GALAT_TAK_TERDUGA;
			return { success: false, error: this.error };
		} finally {
			this.loading = false;
			this.ready = true;
		}
	}

	/**
	 * Mengakhiri sesi dan membersihkan jejaknya dari peramban.
	 *
	 * `ready` sengaja TETAP `true`: jawaban atas "siapa yang masuk?" sudah diketahui
	 *: jawabannya "tidak ada". Menurunkannya ke `false` akan membuat guard
	 * menampilkan splash tepat setelah pengguna menekan keluar.
	 *
	 * @returns {void}
	 */
	logout() {
		const pb = getPocketBase();
		if (this.impersonation && pb?.authStore.isValid) {
			void apiRequest(`/api/pfriends/admin/impersonations/${encodeURIComponent(this.impersonation.id)}/end`, { method: 'POST' }).catch(() => {});
		}
		pb?.authStore.clear();
		this.role = null;
		this.account = null;
		this.awardee = null;
		this.user = null;
		this.onboardingStatus = null;
		this.error = null;
		this.#accountId = null;
		this.#awardeeId = null;
		this.#hidrasi = null;
		this.ready = true;
		if (!browser) return;
		try {
			localStorage.removeItem(KUNCI_SESI);
			sessionStorage.removeItem(KUNCI_IMPERSONASI);
			this.impersonation = null;
		} catch {
			// Penyimpanan yang menolak dihapus tidak boleh menggagalkan proses keluar;
			// keadaan dalam memori sudah bersih dan itulah yang menentukan tampilan.
		}
	}

	/**
	 * Jalur beranda sesuai peran yang sedang aktif.
	 * @returns {string} `'/'` untuk tamu.
	 */
	homePath() {
		if (this.isApplicant) return '/pendaftaran/status';
		return AccessPolicy.homePathFor(this.role);
	}

	/**
	 * Apakah peran yang sedang aktif berhak membuka sebuah jalur.
	 *
	 * Delegasi penuh ke `AccessPolicy`: tidak ada satu pun perbandingan prefiks
	 * jalur di berkas ini, dan ketiadaannya diperiksa sebagai gerbang (§3.2 butir 5).
	 *
	 * @param {string} pathname
	 * @returns {boolean}
	 */
	canAccess(pathname) {
		if (this.isApplicant) return pathname === '/pendaftaran/status';
		return AccessPolicy.canAccess(this.role, pathname);
	}

	/**
	 * Jalur tujuan yang aman dibuka sesudah masuk.
	 * @param {string|null|undefined} next Umumnya isi query `?next=`.
	 * @returns {string}
	 */
	nextAfterLogin(next) {
		if (this.isApplicant) return '/pendaftaran/status';
		return AccessPolicy.safeNext(next, this.role);
	}

	/**
	 * Memulihkan sesi secara penuh: memastikan basis data demo terisi, lalu memuat
	 * akun dan entity awardee. Idempoten: pemanggilan berbarengan dari beberapa
	 * guard menunggu janji yang sama.
	 *
	 * @returns {Promise<void>}
	 */
	async hydrate() {
		if (!browser) return;
		if (this.#hidrasi) return this.#hidrasi;
		if (this.ready && (this.role === null || this.account !== null)) return;

		this.#hidrasi = this.#pulihkan();
		try {
			await this.#hidrasi;
		} finally {
			this.#hidrasi = null;
		}
	}

	/**
	 * Membaca ulang entity awardee dari basis data. Dipanggil setiap kali poin,
	 * lencana, atau consent berubah supaya `session.awardee` tidak menyimpan potret
	 * lama.
	 * @returns {Promise<import('$lib/domain/entities/Awardee.js').Awardee|null>}
	 */
	async refresh() {
		if (!browser || this.#awardeeId === null) return null;
		const awardee = await awardeeRepository.getById(this.#awardeeId);
		if (awardee) this.awardee = awardee;
		return awardee ?? null;
	}

	/**
	 * Pemulihan sesungguhnya.
	 *
	 * Akun yang hilang atau dinonaktifkan sesudah sesi tersimpan mengakhiri sesi.
	 * Membiarkannya berjalan berarti menampilkan zona yang seharusnya sudah tertutup
	 * bagi orang itu: dan penonaktifan akun yang baru berlaku setelah pengguna
	 * menekan keluar bukan penonaktifan.
	 *
	 * @returns {Promise<void>}
	 */
	async #pulihkan() {
		this.loading = true;
		try {
			await bootstrapDatabase();
			const pb = getPocketBase();
			if (!pb?.authStore.isValid) { this.logout(); return; }
			const auth = await apiRequest('/api/pfriends/session/me');
			pb.authStore.save(auth.token, auth.record);
			const onboarding = auth.record.onboardingStatus || RegistrationStatus.APPROVED;
			const principal = principalPocketBase(auth.record);
			if (!isApprovedOnboarding(onboarding)) {
				this.#terapkan(principal, null, onboarding);
				return;
			}
			if (!principal.isActive) {
				this.logout();
				return;
			}
			const akunLokal = auth.record.legacyAccountId
				? await accountRepository.getById(auth.record.legacyAccountId)
				: null;
			const akun = akunLokal && akunLokal.role === auth.record.role ? akunLokal : principal;
			const awardee = akunLokal
				? await this.#authService().awardeeOf(akunLokal)
				: principal.awardeeId
					? await awardeeRepository.getById(principal.awardeeId)
					: null;
			if (principal.isAwardee && awardee === null) {
				this.logout();
				return;
			}
			this.#terapkan(akun, awardee, onboarding);
		} catch {
			// Basis data yang tidak dapat dibuka bukan alasan mengunci pengguna di layar
			// pemuatan selamanya; sesi diakhiri dan halaman masuk mengambil alih.
			this.logout();
		} finally {
			this.loading = false;
			this.ready = true;
		}
	}

	/**
	 * Memasang akun sebagai pemilik sesi berjalan.
	 * @param {UserAccount|object} account
	 * @param {import('$lib/domain/entities/Awardee.js').Awardee|null} awardee
	 * @returns {void}
	 */
	#terapkan(account, awardee, onboardingStatus = RegistrationStatus.APPROVED) {
		const akun = account;
		this.account = akun;
		this.role = akun.role;
		this.user = potretPengguna(akun);
		this.awardee = awardee ?? null;
		this.#accountId = akun.id;
		this.#awardeeId = akun.awardeeId ?? null;
		this.onboardingStatus = onboardingStatus;
		this.error = null;
		this.#simpan();
	}

	/**
	 * Service autentikasi, dirakit sekali pada pemanggilan pertama.
	 *
	 * Perakitan malas, bukan di konstruktor: modul store ikut dievaluasi saat
	 * prerender, dan menyentuh instans repository pada saat itu tidak dibutuhkan
	 * siapa pun.
	 * @returns {AuthService}
	 */
	#authService() {
		this.#auth ??= new AuthService({
			accountRepo: accountRepository,
			awardeeRepo: awardeeRepository
		});
		return this.#auth;
	}

	/**
	 * Menyimpan potret sesi. Kegagalan penyimpanan tidak dianggap galat: sesi tetap
	 * berjalan di dalam memori, hanya tidak bertahan setelah muat ulang.
	 * @returns {void}
	 */
	#simpan() {
		if (!browser) return;
		try {
			localStorage.setItem(
				KUNCI_SESI,
				JSON.stringify({
					role: this.role,
					accountId: this.#accountId,
					awardeeId: this.#awardeeId,
					onboardingStatus: this.onboardingStatus,
					user: this.user
				})
			);
		} catch {
			// Mode privat sebagian peramban menolak penulisan. Diabaikan dengan sengaja.
		}
	}
}

/** Instans tunggal yang dipakai seluruh aplikasi. */
export const session = new SessionStore();
