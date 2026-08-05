/**
 * DATA LOKAL ZONA VERIFIKATOR — checklist data sensitif 21 butir.
 *
 * Tanggung jawab: menyatakan kedua puluh satu butir pemeriksaan data sensitif
 * `docs/04` §6.1 sebagai DATA, supaya panel gerbang merendernya dari satu daftar
 * alih-alih dua puluh satu blok markup yang ditulis tangan.
 *
 * Tiga keputusan yang tidak terbaca dari kode:
 *
 * 1. **Berkas ini tinggal di `_components/` zona verifikator, bukan di
 *    `domain/constants/`.** Butir-butir ini belum punya penegakan domain: tidak
 *    ada regex, tidak ada parser EXIF, dan tidak ada satu pun pemeriksaan otomatis
 *    di `Story`. Yang ada hanyalah `SensitivityScan` bernilai tiga keadaan.
 *    Menaruh daftar ini di `domain/constants/` akan menyiratkan bahwa domain
 *    memeriksanya — padahal yang memeriksa adalah manusia yang sedang membaca
 *    layar ini. Berkas beku `docs/12` §1.2 juga melarang paket ini menyentuh
 *    `src/lib/domain/**`.
 * 2. **Butir "blokir" ditandai, bukan disaring.** Enam butir (1, 2, 3, 4, 13, 20)
 *    berkonsekuensi blokir permanen menurut `docs/04` §6.2. Ia ditandai supaya
 *    verifikator melihat bobot butir yang sedang ia centang, bukan disembunyikan
 *    ke daftar terpisah — daftar terpisah membuat delapan belas butir sisanya
 *    terasa opsional.
 * 3. **Tidak ada skor.** Panel gerbang menampilkan "n dari 21 dikonfirmasi", bukan
 *    persentase dan bukan nilai gabungan dengan dua gerbang lain. `docs/12` §3.5
 *    WP-06 butir 5 melarang ketiga gerbang dilebur menjadi satu angka: gerbang
 *    yang dilebur membuat kegagalan satu syarat dapat ditutupi kelulusan syarat
 *    lain, padahal ketiganya konjungtif.
 *
 * @see docs/04-ESG-GOVERNANCE.md — §6.1 checklist 21 butir, §6.2 aturan keputusan
 * @see docs/12-BUILD-CONTRACT-V2.md — §3.5 WP-06 butir 5 tiga panel gerbang terpisah
 */

/**
 * @typedef {object} SensitivityItem
 * @property {number} no        Nomor butir sesuai docs/04 §6.1.
 * @property {string} label     Butir pemeriksaan dalam Bahasa Indonesia.
 * @property {string} aksi      Tindakan yang wajib diambil bila temuan muncul.
 * @property {boolean} blocking Temuan pada butir ini memblokir publikasi permanen.
 */

/**
 * @typedef {object} SensitivityGroup
 * @property {string} kode                    Kode kelompok, 'A'…'E'.
 * @property {string} label                   Nama kelompok.
 * @property {readonly SensitivityItem[]} items
 */

/**
 * Kelima kelompok pemeriksaan beserta kedua puluh satu butirnya.
 * @type {readonly SensitivityGroup[]}
 */
export const SENSITIVITY_GROUPS = Object.freeze([
	Object.freeze({
		kode: 'A',
		label: 'Identitas langsung',
		items: Object.freeze([
			Object.freeze({
				no: 1,
				label: 'NIK atau nomor KTP (16 digit)',
				aksi: 'Blokir — naskah wajib diredaksi lebih dahulu.',
				blocking: true
			}),
			Object.freeze({
				no: 2,
				label: 'Nomor kartu keluarga, paspor, atau SIM',
				aksi: 'Blokir — naskah wajib diredaksi lebih dahulu.',
				blocking: true
			}),
			Object.freeze({
				no: 3,
				label: 'NPWP berformat 15–16 digit',
				aksi: 'Blokir — naskah wajib diredaksi lebih dahulu.',
				blocking: true
			}),
			Object.freeze({
				no: 4,
				label: 'Nomor rekening bank atau dompet elektronik',
				aksi: 'Blokir — naskah wajib diredaksi lebih dahulu.',
				blocking: true
			}),
			Object.freeze({
				no: 5,
				label: 'Nomor ponsel atau WhatsApp pribadi',
				aksi: 'Redaksi, kecuali consent kontak untuk mentoring masih aktif.',
				blocking: false
			}),
			Object.freeze({
				no: 6,
				label: 'Alamat surel pribadi',
				aksi: 'Redaksi sebelum naskah disetujui.',
				blocking: false
			})
		])
	}),
	Object.freeze({
		kode: 'B',
		label: 'Lokasi',
		items: Object.freeze([
			Object.freeze({
				no: 7,
				label: 'Alamat rumah lengkap dengan RT/RW dan nomor',
				aksi: 'Potong sampai tingkat kelurahan.',
				blocking: false
			}),
			Object.freeze({
				no: 8,
				label: 'Geotag EXIF presisi pada foto lampiran',
				aksi: 'Strip metadata lokasi sebelum lampiran dipakai.',
				blocking: false
			}),
			Object.freeze({
				no: 9,
				label: 'Koordinat lebih presisi daripada tingkat desa',
				aksi: 'Bulatkan sesuai presisi koordinat yang disepakati.',
				blocking: false
			}),
			Object.freeze({
				no: 10,
				label: 'Titik rutin yang dapat dilacak, misalnya sekolah anak atau jadwal tetap',
				aksi: 'Kaburkan atau hapus penyebutannya.',
				blocking: false
			})
		])
	}),
	Object.freeze({
		kode: 'C',
		label: 'Data sensitif khusus',
		items: Object.freeze([
			Object.freeze({
				no: 11,
				label: 'Data kesehatan, disabilitas, atau kondisi medis',
				aksi: 'Hapus, kecuali ada consent eksplisit terpisah.',
				blocking: false
			}),
			Object.freeze({
				no: 12,
				label: 'Agama, etnis, atau orientasi seksual',
				aksi: 'Hapus, kecuali intrinsik pada cerita dan ada consent.',
				blocking: false
			}),
			Object.freeze({
				no: 13,
				label: 'Afiliasi politik atau konten partisan',
				aksi: 'Blokir — konten partisan tidak dapat diterbitkan.',
				blocking: true
			}),
			Object.freeze({
				no: 14,
				label: 'Data anak di bawah umur: wajah, nama, atau sekolah',
				aksi: 'Wajib consent wali; bila tidak ada, wajah harus diburamkan.',
				blocking: false
			}),
			Object.freeze({
				no: 15,
				label: 'Kondisi ekonomi memalukan atau narasi belas kasihan',
				aksi: 'Tulis ulang — martabat subjek harus terjaga.',
				blocking: false
			})
		])
	}),
	Object.freeze({
		kode: 'D',
		label: 'Komersial dan pihak ketiga',
		items: Object.freeze([
			Object.freeze({
				no: 16,
				label: 'Nominal omzet UMKM tanpa consent publikasi nominal',
				aksi: 'Turunkan penyajiannya menjadi persentase.',
				blocking: false
			}),
			Object.freeze({
				no: 17,
				label: 'Wajah pihak ketiga tanpa consent',
				aksi: 'Buramkan wajah atau kumpulkan consent terlebih dahulu.',
				blocking: false
			}),
			Object.freeze({
				no: 18,
				label: 'Plat nomor, QR, barcode, atau dokumen terbaca pada foto',
				aksi: 'Redaksi bagian yang terbaca.',
				blocking: false
			}),
			Object.freeze({
				no: 19,
				label: 'Logo atau merek pihak ketiga dan materi berhak cipta',
				aksi: 'Minta izin tertulis atau hapus dari lampiran.',
				blocking: false
			})
		])
	}),
	Object.freeze({
		kode: 'E',
		label: 'Reputasi dan klaim',
		items: Object.freeze([
			Object.freeze({
				no: 20,
				label: 'Konten SARA, ujaran kebencian, atau hoaks',
				aksi: 'Blokir dan buka isu eskalasi.',
				blocking: true
			}),
			Object.freeze({
				no: 21,
				label: 'Klaim dampak berlebihan tanpa catatan asumsi',
				aksi: 'Kembalikan ke penulis sebagai permintaan revisi.',
				blocking: false
			})
		])
	})
]);

/**
 * Seluruh butir dalam satu deret, urut nomor. Dipakai untuk menghitung kelengkapan
 * tanpa perlu meratakan kelompok berulang kali di komponen.
 * @type {readonly SensitivityItem[]}
 */
export const SENSITIVITY_ITEMS = Object.freeze(
	SENSITIVITY_GROUPS.flatMap((grup) => grup.items)
);

/**
 * Banyaknya butir yang harus dikonfirmasi manusia sebelum naskah boleh disetujui.
 *
 * Diturunkan dari panjang daftar, bukan ditulis sebagai angka: daftar yang
 * bertambah satu butir tanpa ambangnya ikut naik akan meloloskan naskah yang
 * belum diperiksa penuh.
 * @type {number}
 */
export const TOTAL_BUTIR_SENSITIF = SENSITIVITY_ITEMS.length;

/**
 * Nomor butir yang temuannya memblokir publikasi permanen (`docs/04` §6.2).
 * @type {readonly number[]}
 */
export const BUTIR_BLOKIR = Object.freeze(
	SENSITIVITY_ITEMS.filter((butir) => butir.blocking).map((butir) => butir.no)
);
