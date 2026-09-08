/**
 * STORE: Angka Dampak Publik.
 *
 * Tanggung jawab: menjadi SATU-SATUNYA jalan zona publik memperoleh angka.
 *
 * Tiga keputusan yang tidak terbaca dari kode:
 *
 * 1. **Zona publik dilarang mengimpor repository (D-4).** Halaman publik yang boleh
 *    membaca tabel akan cepat menumbuhkan penyaringnya sendiri: dan penyaring
 *    kedua untuk "awardee terdata" adalah cara tercepat membuat angka di beranda
 *    berbeda dari angka di dasbor admin. Satu potret, satu definisi.
 * 2. **Yang disimpan adalah potret, bukan koleksi.** `PublicImpactSnapshot` sudah
 *    berupa angka jadi; halaman publik tidak pernah memegang daftar awardee, daftar
 *    aktivitas, maupun apa pun yang dapat dipakai menyusun peringkat bernama.
 * 3. **Nol mekanik skor melintas ke sini.** Bentuk potretnya sendiri tidak memuat
 *    poin, tier, maupun peringkat: larangan PO-2 ditegakkan pada bentuk data di
 *    domain, bukan pada disiplin komponen yang membacanya.
 *
 * @see docs/12-BUILD-CONTRACT-V2.md: §2.12 kontrak store impact, §2.10 ProgramImpactService
 * @see docs/10-REVISION-SPEC.md: §4 arsitektur informasi publik
 */

import { browser } from '$app/environment';
import { publicImpactSnapshot } from '$lib/infrastructure/pocketbase/publicContent.js';

class ImpactStore {
	/**
	 * @type {import('$lib/domain/services/ProgramImpactService.js').PublicImpactSnapshot|null}
	 * Potret angka program; `null` selama belum pernah dimuat.
	 */
	snapshot = $state.raw(null);

	/** @type {boolean} */
	loading = $state(false);

	/** @type {boolean} Potret sudah pernah tersusun dengan sukses. */
	loaded = $state(false);

	/** @type {string|null} Pesan galat pemuatan terakhir. */
	error = $state(null);

	/** @type {Promise<void>|null} */
	#pemuatan = null;

	/**
	 * Menyusun potret sekali. Pemanggilan berikutnya tidak menghitung ulang.
	 *
	 * Idempoten dan menahan pemanggilan serentak: beranda publik memasang beberapa
	 * komponen angka sekaligus, dan tanpa penahan ini seluruh tabel dibaca berkali-
	 * kali untuk potret yang identik.
	 *
	 * @returns {Promise<void>}
	 */
	async load() {
		if (!browser) return;
		if (this.loaded) return;
		if (this.#pemuatan) return this.#pemuatan;

		this.#pemuatan = this.#muat();
		try {
			await this.#pemuatan;
		} finally {
			this.#pemuatan = null;
		}
	}

	/**
	 * Menyusun ulang potret meski sudah pernah tersusun. Dipakai sesudah data
	 * berubah, mis. sebuah cerita baru terbit.
	 * @returns {Promise<void>}
	 */
	async refresh() {
		if (!browser) return;
		await this.#muat();
	}

	/**
	 * Penyusunan sesungguhnya.
	 * @returns {Promise<void>}
	 */
	async #muat() {
		this.loading = true;
		this.error = null;
		try {
			this.snapshot = await publicImpactSnapshot();
			this.loaded = true;
		} catch (penyebab) {
			this.error =
				penyebab instanceof Error
					? penyebab.message
					: 'Angka program gagal dimuat dari PocketBase.';
		} finally {
			this.loading = false;
		}
	}
}

/** Instans tunggal yang dipakai seluruh aplikasi. */
export const impact = new ImpactStore();
