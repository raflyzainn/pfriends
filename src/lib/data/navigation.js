/**
 * DATA NAVIGASI — daftar tujuan tiap zona, sebagai data.
 *
 * Tanggung jawab: menjadi satu-satunya tempat yang tahu "zona X punya tujuan apa
 * saja, dengan label dan ikon apa". Layout zona, `Sidebar`, dan `BottomNav`
 * membacanya dari sini; tidak satu pun dari ketiganya menyimpan daftarnya sendiri.
 *
 * Tiga keputusan yang tidak terbaca dari kode:
 *
 * 1. **Berkas ini tidak tahu siapa yang sedang masuk.** Ia tidak mengimpor store
 *    sesi, tidak memanggil `AccessPolicy.canEnter`, dan tidak pernah menyaring
 *    butir berdasarkan peran. Penjagaan akses hidup di `AccessPolicy` + `ZoneGuard`;
 *    menaruh separuh keputusan di daftar menu akan melahirkan dua gerbang yang
 *    cepat berbeda pendapat — dan gerbang yang berbeda pendapat selalu dimenangkan
 *    oleh yang paling longgar.
 * 2. **Tujuan yang halamannya belum ada tetap didaftarkan.** `/kalender` dan
 *    `/metode-pengukuran` dibangun paket lain pada gelombang berikutnya. Menunda
 *    pendaftarannya berarti berkas ini harus disunting lagi tepat pada gelombang
 *    ketika lima paket menyentuh berkas lain secara paralel — persis waktu yang
 *    paling buruk untuk menyentuh berkas bersama.
 * 3. **Lencana dinyatakan sebagai `badgeKey`, bukan sebagai angka.** Angkanya
 *    hidup di store (`editorial.reviewQueueCount`, `admin.pendingCount`) dan baru
 *    ditempelkan oleh `withBadges()` di lapisan yang memang punya akses ke store.
 *    Menyimpan angka di sini akan menjadikan daftar menu sebagai state.
 *
 * Ikon dirujuk lewat kunci `ICONS` yang SUDAH ADA. Berkas `data/icons.js` bukan
 * milik paket ini; menuliskan path SVG langsung di sini akan menjadi salinan kedua
 * dari registry ikon.
 *
 * @see docs/12-BUILD-CONTRACT-V2.md — §2.13 kontrak export navigation.js, §2.14 route final V2
 * @see src/lib/domain/policies/AccessPolicy.js — Zone; penjagaan akses yang sesungguhnya
 */

import { Zone } from '$lib/domain/policies/AccessPolicy.js';
import { ICONS } from '$lib/data/icons.js';

/**
 * @typedef {object} NavItem
 * @property {string} id        Identitas stabil butir; dipakai sebagai kunci `{#each}`.
 * @property {string} label     Teks Bahasa Indonesia yang dilihat pengguna.
 * @property {string} href      Jalur tujuan.
 * @property {string} iconPath  Path SVG dari registry `ICONS`.
 * @property {boolean} [primary] Ikut tampil di navigasi ponsel (maksimum lima).
 * @property {string} [badgeKey] Kunci pencarian angka lencana pada objek `counts`.
 * @property {number} [badge]   Angka lencana; hanya ada sesudah `withBadges()`.
 */

/** Banyaknya butir yang muat di bilah navigasi ponsel. */
const BATAS_NAV_PONSEL = 5;

/**
 * Beranda tiap zona. Butir-butir ini tidak pernah menyala karena awalan: bila
 * `/awardee` ikut menyala di `/awardee/aksi`, dua butir menyala sekaligus dan
 * penanda "Anda di sini" berhenti menjawab pertanyaan yang diajukannya.
 * @type {readonly string[]}
 */
const BERANDA_ZONA = Object.freeze(['/', '/awardee', '/verifikator', '/admin']);

/**
 * Tiga tujuan zona publik.
 *
 * Dipangkas dari tujuh menjadi tiga (revisi 4 Agustus 2026). Halaman `/gerakan`,
 * `/komunitas`, `/tentang`, dan `/metode-pengukuran` MASIH ADA dan tetap dapat
 * dibuka lewat tautan di dalam halaman — yang dicabut hanya tempatnya di bilah
 * navigasi. Menghapus routenya sekalian akan mematikan tautan yang tersebar di
 * beranda dan footer, jauh melebihi yang diminta.
 *
 * Label "Blog" menunjuk ke `/cerita`. Routenya sengaja tidak ikut diganti nama:
 * slug cerita, data seed, dan halaman `[slug]` seluruhnya menautkan `/cerita`,
 * dan mengganti route hanya demi kecocokan label akan menyentuh berkas jauh lebih
 * banyak daripada nilainya pada tahap mockup.
 *
 * Nol butir bermuatan mekanik skor — tidak ada "Papan Peringkat", tidak ada
 * "Poin". Larangan PO-2 ditegakkan pada bentuk data navigasi, bukan pada disiplin
 * pemanggil yang kelak menyalin daftar ini.
 * @type {readonly NavItem[]}
 */
const NAV_PUBLIC = Object.freeze([
	Object.freeze({ id: 'home', label: 'Beranda', href: '/', iconPath: ICONS.home, primary: true }),
	Object.freeze({
		id: 'stories',
		label: 'Blog',
		href: '/cerita',
		iconPath: ICONS.book,
		primary: true
	}),
	Object.freeze({
		id: 'calendar',
		label: 'Calendar of Event',
		href: '/kalender',
		iconPath: ICONS.calendar,
		primary: true
	})
]);

/**
 * Sepuluh tujuan zona awardee.
 *
 * Lima butir bertanda `primary` adalah yang muat di bilah ponsel, dan urutannya
 * bukan selera: awardee membuka microsite ini terutama dari tautan WhatsApp di
 * ponsel, sehingga kelima itulah navigasi utamanya — bukan pelengkap sidebar.
 * @type {readonly NavItem[]}
 */
const NAV_AWARDEE = Object.freeze([
	Object.freeze({
		id: 'dashboard',
		label: 'Beranda',
		href: '/awardee',
		iconPath: ICONS.home,
		primary: true
	}),
	Object.freeze({
		id: 'stories',
		label: 'Blog Saya',
		href: '/awardee/cerita',
		iconPath: ICONS.book,
		primary: true,
		badgeKey: 'myStoriesNeedingRevision'
	}),
	Object.freeze({
		id: 'forum',
		label: 'Forum',
		href: '/awardee/forum',
		iconPath: ICONS.chat,
		primary: true
	}),
	Object.freeze({
		id: 'calendar',
		label: 'Calendar of Event',
		href: '/awardee/kalender',
		iconPath: ICONS.calendar,
		primary: true
	}),
	Object.freeze({
		id: 'rewards',
		label: 'Pencapaian',
		href: '/awardee/penghargaan',
		iconPath: ICONS.trophy,
		primary: true
	}),
	Object.freeze({
		id: 'news',
		label: 'Kabar',
		href: '/awardee/kabar',
		iconPath: ICONS.megaphone,
		badgeKey: 'unreadBroadcasts'
	}),
	Object.freeze({
		id: 'activity-evidence',
		label: 'Bukti Keaktifan',
		href: '/awardee/bukti-keaktifan',
		iconPath: ICONS.upload,
		badgeKey: 'activityEvidenceRevision'
	}),
	// Label "Jejaring" menunjuk ke `/awardee/direktori`. Routenya sengaja TIDAK ikut
	// diganti nama, mengikuti keputusan yang sama pada butir "Blog" → `/cerita`:
	// mengganti route hanya demi kecocokan label akan menyentuh tautan silang di
	// forum, profil, dan seed sekaligus — jauh melebihi nilainya pada tahap mockup.
	Object.freeze({
		id: 'directory',
		label: 'Jejaring',
		href: '/awardee/direktori',
		iconPath: ICONS.users
	})
]);

/**
 * Lima tujuan zona verifikator.
 *
 * Halamannya dibangun paket lain; daftarnya sudah final di sini supaya paket itu
 * tidak perlu menyunting berkas bersama saat lima paket berjalan bersamaan.
 * @type {readonly NavItem[]}
 */
const NAV_VERIFIER = Object.freeze([
	Object.freeze({
		id: 'dashboard',
		label: 'Dasbor',
		href: '/verifikator',
		iconPath: ICONS.chart,
		primary: true
	}),
	Object.freeze({
		id: 'stories',
		label: 'Submission Blog',
		href: '/verifikator/cerita',
		iconPath: ICONS.book,
		primary: true,
		badgeKey: 'storyQueue'
	}),
	Object.freeze({
		id: 'events',
		label: 'Konfigurasi Calendar of Event',
		href: '/verifikator/kegiatan',
		iconPath: ICONS.calendar,
		primary: true,
		badgeKey: 'eventQueue'
	}),
	Object.freeze({
		id: 'activity-evidence',
		label: 'Bukti Keaktifan',
		href: '/verifikator/bukti-keaktifan',
		iconPath: ICONS.upload,
		primary: true,
		badgeKey: 'activityEvidenceQueue'
	}),
	Object.freeze({
		id: 'registrations',
		label: 'Registrasi Awardee',
		href: '/verifikator/pendaftaran',
		iconPath: ICONS.inbox,
		primary: true
	}),
	Object.freeze({
		id: 'rewards',
		label: 'Hadiah & Penukaran',
		href: '/verifikator/gamifikasi',
		iconPath: ICONS.gift,
		primary: true
	})
]);

/**
 * Tujuh tujuan zona admin.
 * @type {readonly NavItem[]}
 */
const NAV_ADMIN = Object.freeze([
	Object.freeze({
		id: 'dashboard',
		label: 'Dasbor KPI',
		href: '/admin',
		iconPath: ICONS.chart,
		primary: true
	}),
	Object.freeze({
		id: 'awardees',
		label: 'Kontrol Akun',
		href: '/admin/awardee',
		iconPath: ICONS.users,
		primary: true
	}),
	Object.freeze({
		id: 'registrations',
		label: 'Pemantauan Registrasi',
		href: '/admin/pendaftaran',
		iconPath: ICONS.inbox,
		primary: true
	}),
	Object.freeze({
		id: 'gamification',
		label: 'Gamifikasi',
		href: '/admin/gamifikasi',
		iconPath: ICONS.trophy,
		primary: true
	})
]);

/**
 * Peta zona → daftar tujuannya.
 * @type {Readonly<Record<string, readonly NavItem[]>>}
 */
export const NAV_BY_ZONE = Object.freeze({
	[Zone.PUBLIC]: NAV_PUBLIC,
	[Zone.AWARDEE]: NAV_AWARDEE,
	[Zone.VERIFIER]: NAV_VERIFIER,
	[Zone.ADMIN]: NAV_ADMIN
});

/**
 * Seluruh tujuan sebuah zona.
 *
 * Mengembalikan salinan dangkal baru setiap pemanggilan. Konstanta di atas beku,
 * tetapi pemanggil yang menambahkan lencana atau menyortir ulang tetap perlu array
 * yang boleh disentuh — dan array bersama yang diam-diam disortir di satu halaman
 * akan mengubah urutan menu di halaman lain.
 *
 * @param {string} zone Salah satu `Zone`.
 * @returns {NavItem[]} Array baru; kosong untuk zona yang tidak dikenal.
 */
export function navForZone(zone) {
	const daftar = NAV_BY_ZONE[zone];
	return daftar ? daftar.map((item) => ({ ...item })) : [];
}

/**
 * Tujuan utama sebuah zona untuk bilah navigasi ponsel.
 *
 * Bila tidak satu pun butir bertanda `primary`, lima butir pertama dipakai —
 * bilah navigasi yang kosong jauh lebih merugikan daripada bilah yang urutannya
 * belum ditata.
 *
 * @param {string} zone Salah satu `Zone`.
 * @returns {NavItem[]} Maksimum lima butir.
 */
export function primaryNavForZone(zone) {
	const semua = navForZone(zone);
	const utama = semua.filter((item) => item.primary === true);
	return (utama.length > 0 ? utama : semua).slice(0, BATAS_NAV_PONSEL);
}

/**
 * Menempelkan angka lencana pada butir yang memilikinya.
 *
 * Angka nol dan angka yang tidak tersedia sengaja TIDAK menghasilkan field
 * `badge`. Lencana "0" bukan informasi; ia hanya kotak merah yang mengabarkan
 * bahwa tidak ada apa-apa.
 *
 * @param {readonly NavItem[]} items Butir navigasi, umumnya dari `navForZone()`.
 * @param {Record<string, number>} counts Peta `badgeKey` → angka.
 * @returns {NavItem[]} Array baru berisi objek baru; masukan tidak berubah.
 */
export function withBadges(items, counts) {
	const angka = counts ?? {};
	return (items ?? []).map((item) => {
		const nilai = item.badgeKey ? angka[item.badgeKey] : undefined;
		if (typeof nilai !== 'number' || !Number.isFinite(nilai) || nilai <= 0) return { ...item };
		return { ...item, badge: nilai };
	});
}

/**
 * Apakah sebuah tujuan sedang dibuka.
 *
 * Pencocokan awalan memakai pemisah `/` — `/admin` tidak menyalakan dirinya untuk
 * `/administrasi`, dan `/awardee/cerita` tidak menyalakan `/awardee/ceritaku`.
 * Beranda zona (`/`, `/awardee`, `/admin`, `/verifikator`) dicocokkan persis:
 * tanpa itu beranda akan menyala di seluruh halaman zonanya sekaligus.
 *
 * @param {string} href Jalur tujuan butir navigasi.
 * @param {string} pathname Jalur yang sedang dibuka.
 * @param {{exact?: boolean}} [opsi] `exact: true` memaksa pencocokan persis.
 * @returns {boolean}
 */
export function isNavActive(href, pathname, { exact = false } = {}) {
	if (typeof href !== 'string' || typeof pathname !== 'string') return false;
	const tujuan = href.replace(/\/+$/, '') || '/';
	const kini = (pathname.split('?')[0].split('#')[0].replace(/\/+$/, '') || '/').toLowerCase();
	const bandingan = tujuan.toLowerCase();
	if (kini === bandingan) return true;
	if (exact) return false;
	// Beranda zona hanya menyala pada dirinya sendiri; anaknya punya butir sendiri.
	if (BERANDA_ZONA.includes(bandingan)) return false;
	return kini.startsWith(`${bandingan}/`);
}
