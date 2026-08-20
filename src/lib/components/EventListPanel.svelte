<script>
	/**
	 * EventListPanel: daftar kegiatan sebagai BARIS TABEL, bukan kartu.
	 *
	 * Satu komponen, lima tempat: E4 beranda · panel `/cerita` · panel
	 * `/cerita/[slug]` · dasbor `/awardee` · dasbor `/verifikator`. Membuat
	 * kembarannya untuk salah satu dari lima itu adalah pelanggaran KP-3, dan
	 * karena itu komponen ini dirancang untuk kelimanya sejak baris pertama.
	 *
	 * LIMA KEPUTUSAN YANG TIDAK TERBACA DARI KODE:
	 *
	 * 1. **Ia hidup di `components/`, BUKAN di `components/editorial/`.** Tiga dari
	 *    lima pemakainya adalah zona ter-login; menaruhnya di subdirektori editorial
	 *    akan membuat dua zona mengimpor dari direktori yang menyatakan dirinya
	 *    milik zona publik.
	 *
	 * 2. **Nol jejak gamifikasi: secara STRUKTURAL.** `EventCardVM` memang tidak
	 *    memuat poin, kuota, sisa kursi, maupun daftar pendaftar, jadi prop
	 *    `showPoints` yang ada pada `EventCard` tidak punya padanan di sini dan
	 *    memang tidak boleh punya (Keputusan Pemilik Produk #2, `docs/11` §6 E4).
	 *
	 * 3. **`thumbnailAt` BAKU `0` dan ditentukan PEMANGGIL per lokasi.** Baku `3`
	 *    akan menjadikan "baris ketiga selalu berbeda" sebagai keseragaman BARU di
	 *    lima halaman sekaligus: persis yang prinsip P-3 hindari. Penyimpangan
	 *    ritme adalah keputusan editor, bukan nilai bawaan komponen.
	 *
	 * 4. **Nilai `variant` `'list'` DILARANG.** Ia nama lama (`docs/10` §6.5,
	 *    `docs/11` §8.5) dan sudah diganti `'panel'` di `docs/12` §2.13. Nilai tak
	 *    dikenal jatuh ke `'panel'` supaya salah ketik tidak menghasilkan halaman
	 *    kosong, tetapi memperingatkan di mode dev supaya tidak diam-diam bertahan.
	 *
	 * 5. **Baris setinggi ≥44 px dan seluruh baris dapat diklik.** Target sentuh
	 *    WCAG, dan sekaligus menghindari "judul mungil sebagai satu-satunya tautan"
	 *    yang membuat daftar sulit dipakai di ponsel.
	 *
	 * @see docs/12-BUILD-CONTRACT-V2.md: §2.13 kontrak props FINAL
	 * @see docs/11-VISUAL-DIRECTION.md: §6 E4 baris agenda, §7.1 panel `/cerita`, §10.1 hover
	 */
	import Icon from './Icon.svelte';
	import { ICONS } from '$lib/data/icons.js';
	import { kelas, pantauGagalMuat } from './_visual.js';
	import { NAMA_BULAN_PENDEK } from '$lib/utils/date.js';
	import { dev } from '$app/environment';

	/**
	 * @typedef {import('./editorial/view-model.js').EventCardVM} EventCardVM
	 */

	/**
	 * @typedef {object} EventListPanelProps
	 * @property {EventCardVM[]} events
	 * @property {number} [limit]
	 * @property {string} [title]
	 * @property {string} [href]        Tujuan tautan "Lihat kalender penuh".
	 * @property {'panel'|'rail'|'strip'} [variant]
	 * @property {number} [thumbnailAt] Indeks 1-basis baris ber-thumbnail; 0 = tidak ada.
	 * @property {string} [emptyMessage]
	 * @property {string} [class]
	 */

	/** @type {EventListPanelProps} */
	let {
		events = [],
		limit = 5,
		title = 'Kalender Komunitas',
		href = '/kalender',
		variant = 'panel',
		thumbnailAt = 0,
		emptyMessage = 'Belum ada kegiatan terjadwal. Kegiatan baru diumumkan tiap awal bulan.',
		class: className = ''
	} = $props();

	/** Sisi thumbnail dalam piksel: kotak, sesuai rasio 1:1 manifes foto. */
	const SISI_THUMBNAIL = 72;

	const VARIAN_SAH = ['panel', 'rail', 'strip'];

	const varianAktif = $derived(VARIAN_SAH.includes(variant) ? variant : 'panel');
	const daftar = $derived((Array.isArray(events) ? events : []).slice(0, Math.max(0, limit)));

	// `rail` sempit: thumbnail 72 px memakan separuh lebarnya, jadi ia diabaikan
	// di sana alih-alih memaksa pemanggil mengingat aturan yang tidak tertulis.
	const thumbnailAktif = $derived(varianAktif === 'rail' ? 0 : thumbnailAt);

	/**
	 * Thumbnail yang berkasnya gagal dimuat. Barisnya tetap utuh: tanggal, judul,
	 * dan tempat sudah memuat seluruh informasi: hanya kotak gambarnya yang
	 * dilepas, bukan diganti ikon rusak (`docs/12` §3.3(d) butir 4).
	 * @type {Record<string, true>}
	 */
	let thumbnailGagal = $state({});

	/**
	 * Menandai satu thumbnail sebagai gagal dimuat.
	 * @param {string} src
	 */
	function tandaiGagal(src) {
		thumbnailGagal = { ...thumbnailGagal, [src]: true };
	}

	$effect(() => {
		if (!dev) return;
		if (!VARIAN_SAH.includes(variant)) {
			console.warn(
				`[EventListPanel] variant="${variant}" tidak dikenal: dirender sebagai "panel". ` +
					"Nilai 'list' adalah nama lama dan dilarang dipakai (docs/12 §2.13)."
			);
		}
	});
</script>

<section
	class={kelas('w-full', varianAktif === 'rail' && 'max-w-sm', className)}
	aria-label={title}
>
	<div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
		<h2
			class={kelas(
				'font-mono text-[11px] leading-none font-medium tracking-[0.08em] text-ink-600 uppercase'
			)}
		>
			{title}
		</h2>
	</div>

	{#if daftar.length === 0}
		<p class="mt-5 border-t border-ink-200 pt-5 text-[14px] leading-[1.5] text-ink-600">
			{emptyMessage}
		</p>
	{:else}
		<ul
			class={kelas(
				'mt-5',
				varianAktif === 'strip' && 'flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2'
			)}
		>
			{#each daftar as ev, i (ev.id)}
				{@const berthumbnail = thumbnailAktif > 0 && i + 1 === thumbnailAktif && Boolean(ev.foto)}
				<li
					class={kelas(
						'border-t border-ink-200',
						varianAktif === 'strip' && 'w-[280px] shrink-0 snap-start'
					)}
				>
					<a
						href={ev.href}
						class="flex min-h-11 items-start gap-4 py-4 transition-colors hover:bg-[#efece6]"
					>
						{#if berthumbnail && ev.foto && !thumbnailGagal[ev.foto.src]}
							<img
								src={ev.foto.src}
								alt={ev.foto.alt}
								width={ev.foto.w}
								height={ev.foto.h}
								loading="lazy"
								decoding="async"
								class="block aspect-square max-w-full shrink-0 rounded-photo object-cover"
								style={`width:${SISI_THUMBNAIL}px;height:${SISI_THUMBNAIL}px;`}
								use:pantauGagalMuat={() => tandaiGagal(ev.foto.src)}
							/>
						{/if}

						<!-- Blok tanggal: angka serif besar + bulan mono. Bukan kotak tint. -->
						<span class="w-11 shrink-0 text-center">
							<span class="figure-number block text-[32px] text-ink-900">
								{ev.startsAt.getDate()}
							</span>
							<span
								class="mt-1 block font-mono text-[11px] leading-none font-medium tracking-[0.08em] text-ink-600 uppercase"
							>
								{NAMA_BULAN_PENDEK[ev.startsAt.getMonth()]}
							</span>
						</span>

						<span class="min-w-0 flex-1">
							<span class="block text-[18px] leading-[1.35] font-bold tracking-[-0.01em] text-ink-900">
								{ev.title}
							</span>
							<span class="mt-1.5 block text-[14px] leading-[1.5] text-ink-600">
								{ev.modeLabel} · {ev.typeLabel} · {ev.chapterLabel}
							</span>
							<span class="mt-0.5 block text-[13px] leading-[1.45] text-ink-600">
								{ev.timeLabel}
							</span>
						</span>
					</a>
				</li>
			{/each}
		</ul>

		{#if href}
			<p class="border-t border-ink-200 pt-4">
				<a
					href={href}
					class="inline-flex min-h-11 items-center gap-2 text-[14px] font-medium text-pertamina-red-ink transition-opacity hover:opacity-80"
				>
					Lihat kalender penuh
					<Icon path={ICONS.arrowLongRight} size={16} />
				</a>
			</p>
		{/if}
	{/if}
</section>
