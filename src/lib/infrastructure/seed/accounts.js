/**
 * PEMBANGKIT AKUN DEMO: pemetaan murni, nol keacakan.
 *
 * Tanggung jawab: mengubah daftar awardee hasil `buildSeed()` menjadi baris tabel
 * `accounts`, dan menjadi SATU-SATUNYA tempat kredensial demo dituliskan.
 *
 * Empat keputusan yang tidak terbaca dari kode:
 *
 * 1. **Nol pemanggilan `rng()`.** Berkas ini dipanggil PALING AKHIR di `buildSeed()`
 *    dan tidak pernah menarik satu pun bilangan acak. Setiap draw tambahan yang
 *    disisipkan sebelum generator yang sudah ada akan menggeser 60 profil, 639
 *    entri buku besar, dan seluruh distribusi tier sekaligus.
 * 2. **`createdAt` diturunkan dari `joinedAt` awardee**, bukan dari `new Date()`.
 *    Seed yang membaca jam dinding berhenti deterministik pada detik pertama ia
 *    dijalankan dua kali.
 * 3. **Kata sandi adalah konstanta literal tunggal.** Satu tempat, satu nilai.
 *    Panel bantuan `/masuk` membacanya lewat `accountRepository.demoAccounts()`
 *    yang TIDAK mengembalikan kata sandi; nilai sandinya sendiri diimpor dari
 *    `SANDI_DEMO` di berkas ini. Menyalin kredensial ke komponen akan membuat
 *    tombol "isi otomatis" gagal diam-diam begitu sandi diubah di satu sisi saja.
 * 4. **Id verifikator sengaja sama dengan `validatorId` pada cerita ter-seed.**
 *    `PF-CORSEC-01` sudah tertulis sebagai pemvalidasi dan pemberi catatan review
 *    pada naskah cerita. Memakai id yang sama membuat jejak peninjauan historis
 *    langsung punya pemilik, bukan menunjuk string yatim yang tidak dapat dibuka.
 *
 * @see docs/12-BUILD-CONTRACT-V2.md: §2.11 kontrak export, §5.6 S-2…S-6 determinisme
 * @see docs/10-REVISION-SPEC.md: §11.3 delta seed & akun demo
 */

import { UserRole } from '../../domain/constants/roles.js';
import { AWARDEE_STATUS } from '../../domain/constants/community.js';
import { AccountStatus } from '../../domain/entities/UserAccount.js';
import { PasswordHash } from '../../domain/value-objects/PasswordHash.js';

/**
 * Kata sandi seluruh akun demo. Konstanta literal, bukan hasil pengacakan :
 * lihat butir 3 pada catatan berkas.
 */
export const SANDI_DEMO = 'pfriends2026';

/** Id verifikator utama; sama dengan `validatorId` pada cerita ter-seed. */
export const ID_VERIFIKATOR_UTAMA = 'PF-CORSEC-01';

/**
 * Id verifikator kedua.
 *
 * Tambahan atas daftar export §2.11 (yang hanya menyebut verifikator utama dan
 * admin). Diperlukan karena `seed-data.js` harus dapat menunjuk peninjau kedua
 * secara simbolis alih-alih menuliskan string `'PF-CORSEC-02'` berulang kali :
 * dan karena satu akun verifikator saja membuat cerita atau kegiatan yang
 * diajukan verifikator itu sendiri menjadi buntu permanen: penyetujunya wajib
 * bukan pengusulnya.
 */
export const ID_VERIFIKATOR_KEDUA = 'PF-CORSEC-02';

/** Id akun admin pengelola program. */
export const ID_ADMIN = 'PF-CORSEC';

/** Ranah surel staf Pertamina Foundation; berbeda dari ranah awardee (`pfriends.id`). */
const RANAH_STAF = 'pertaminafoundation.org';

/**
 * Naskah akun staf. Ditulis literal karena staf bukan turunan data awardee :
 * mereka tidak punya poin, chapter, maupun tanggal bergabung sebagai penerima
 * manfaat, dan membangkitkannya dari profil awardee justru akan menyeret ketiganya.
 *
 * @type {readonly {id: string, email: string, role: string, displayName: string, unit: string, createdAt: string, lastLoginAt: string}[]}
 */
const NASKAH_AKUN_STAF = Object.freeze([
	Object.freeze({
		id: ID_VERIFIKATOR_UTAMA,
		email: `verifikator@${RANAH_STAF}`,
		role: UserRole.VERIFIER,
		displayName: 'Rani Hapsari',
		unit: 'Corporate Secretary: Kendali Mutu Konten',
		createdAt: '2026-01-05T08:00:00+07:00',
		lastLoginAt: '2026-07-19T16:20:00+07:00'
	}),
	Object.freeze({
		id: ID_VERIFIKATOR_KEDUA,
		email: `verifikator2@${RANAH_STAF}`,
		role: UserRole.VERIFIER,
		displayName: 'Bagas Prayoga',
		unit: 'Corporate Secretary: Kendali Mutu Konten',
		// Dibuat pada tanggal yang sama dengan verifikator utama, bukan menyusul
		// belakangan: ia tercatat sebagai penyetuju kegiatan sejak Februari, dan akun
		// yang baru ada sesudah keputusannya sendiri adalah jejak audit yang mustahil.
		createdAt: '2026-01-05T08:00:00+07:00',
		lastLoginAt: '2026-07-18T11:05:00+07:00'
	}),
	Object.freeze({
		id: ID_ADMIN,
		email: `admin@${RANAH_STAF}`,
		role: UserRole.ADMIN,
		displayName: 'Dwi Anggraini',
		unit: 'Corporate Secretary: Pengelola Program Pfriends',
		createdAt: '2026-01-05T08:00:00+07:00',
		lastLoginAt: '2026-07-19T09:40:00+07:00'
	})
]);

/**
 * Pemetaan status awardee ke status akun.
 *
 * Keduanya sengaja tidak disamakan: status awardee menyatakan keadaan sebagai
 * PENERIMA MANFAAT, status akun menyatakan hak MASUK. Awardee yang dorman tetap
 * boleh masuk untuk memperbarui datanya: justru itu jalan keluarnya dari dorman.
 * Yang benar-benar kehilangan akses hanyalah yang ditangguhkan (sementara,
 * `TERKUNCI`) dan yang keluar atau dinonaktifkan (permanen, `NONAKTIF`).
 *
 * @type {Readonly<Record<string, string>>}
 */
const STATUS_AKUN_DARI_AWARDEE = Object.freeze({
	[AWARDEE_STATUS.DITANGGUHKAN]: AccountStatus.TERKUNCI,
	[AWARDEE_STATUS.NONAKTIF]: AccountStatus.NONAKTIF,
	[AWARDEE_STATUS.KELUAR]: AccountStatus.NONAKTIF,
	[AWARDEE_STATUS.DITOLAK]: AccountStatus.NONAKTIF
});

/**
 * Nomor urut akun dari id awardee.
 *
 * Diturunkan dari digit pada id (`AWD-014` → `14`) supaya pasangan akun–awardee
 * terbaca sekilas saat menelusuri basis data. Indeks larik dipakai sebagai
 * cadangan bila kelak formatnya berubah.
 *
 * @param {string} awardeeId
 * @param {number} index Posisi pada larik awardee, 0-basis.
 * @returns {number}
 */
function nomorUrut(awardeeId, index) {
	const angka = /(\d+)\s*$/.exec(String(awardeeId ?? ''));
	return angka ? Number(angka[1]) : index + 1;
}

/**
 * Baris akun untuk satu awardee.
 *
 * @param {Record<string, any>} awardee Baris awardee hasil `buildSeed()`.
 * @param {number} index Posisi pada larik awardee, 0-basis.
 * @returns {Record<string, any>}
 */
function akunAwardee(awardee, index) {
	const id = `USR-${String(nomorUrut(awardee.id, index)).padStart(3, '0')}`;
	const status = STATUS_AKUN_DARI_AWARDEE[awardee.status] ?? AccountStatus.AKTIF;
	return {
		id,
		email: String(awardee.email).trim().toLowerCase(),
		passwordHash: PasswordHash.of(SANDI_DEMO, id).value,
		role: UserRole.AWARDEE,
		awardeeId: awardee.id,
		displayName: awardee.fullName,
		unit: '',
		status,
		createdAt: awardee.joinedAt,
		// Akun yang tidak aktif tidak memiliki jejak masuk terakhir yang bermakna;
		// menampilkan tanggal masuk pada akun terkunci akan membingungkan pengelola.
		lastLoginAt: status === AccountStatus.AKTIF ? (awardee.lastActiveAt ?? null) : null
	};
}

/**
 * Membangkitkan seluruh baris tabel `accounts` dari daftar awardee.
 *
 * Hasilnya 63 baris: 60 akun awardee (satu per penerima manfaat, ber-`awardeeId`),
 * dua akun verifikator, dan satu akun admin. Akun staf ber-`awardeeId: null` :
 * invarian `UserAccount` menolak sebaliknya, dan invarian itulah yang membuat
 * pemeriksaan konflik kepentingan pada jalur cerita bermakna.
 *
 * @param {readonly Record<string, any>[]} awardees Baris awardee hasil `buildSeed()`.
 * @returns {Record<string, any>[]} Baris siap dikonstruksi menjadi `UserAccount`.
 */
export function bangkitkanAkun(awardees) {
	const akunPenerimaManfaat = awardees.map((awardee, index) => akunAwardee(awardee, index));

	const akunStaf = NASKAH_AKUN_STAF.map((naskah) => ({
		id: naskah.id,
		email: naskah.email,
		passwordHash: PasswordHash.of(SANDI_DEMO, naskah.id).value,
		role: naskah.role,
		awardeeId: null,
		displayName: naskah.displayName,
		unit: naskah.unit,
		status: AccountStatus.AKTIF,
		createdAt: new Date(naskah.createdAt).toISOString(),
		lastLoginAt: new Date(naskah.lastLoginAt).toISOString()
	}));

	return [...akunPenerimaManfaat, ...akunStaf];
}

/**
 * Akun awardee yang dipajang sebagai contoh pada panel bantuan `/masuk`.
 *
 * Dipilih deterministik: poin tertinggi berstatus AKTIF, seri diputus oleh id
 * menaik: bukan diacak. Alasannya bukan estetika: panel demo yang menunjuk akun
 * berbeda pada tiap pemuatan membuat tangkapan layar dan naskah peragaan basi
 * setiap kali data dibangun ulang. Awardee berpoin tertinggi juga profil yang
 * paling layak dibuka lebih dulu: papan peringkat, lencana, dan riwayat poinnya
 * terisi penuh.
 *
 * @param {readonly Record<string, any>[]} awardees Baris awardee hasil `buildSeed()`.
 * @returns {{email: string, awardeeId: string}} Surel kosong bila tidak ada yang layak.
 */
export function akunSorotan(awardees) {
	const layak = [...awardees].filter((awardee) => awardee.status === AWARDEE_STATUS.AKTIF);
	layak.sort(
		(a, b) => (b.points ?? 0) - (a.points ?? 0) || String(a.id).localeCompare(String(b.id))
	);
	const terpilih = layak[0];
	if (!terpilih) return { email: '', awardeeId: '' };
	return {
		email: String(terpilih.email).trim().toLowerCase(),
		awardeeId: String(terpilih.id)
	};
}
