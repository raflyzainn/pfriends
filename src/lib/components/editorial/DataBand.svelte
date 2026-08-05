<script>
	/**
	 * DataBand — pita navy lebar penuh: satu metrik utama + maksimum tiga sekunder.
	 *
	 * Tanggung jawab: menggantikan empat `StatTile` dalam `grid-cols-4` — persis
	 * pola yang dibuang D-05 (semua isi adalah kartu putih radius 16) dan D-06
	 * (ikon outline seragam di dalam kotak tint). Di sini tidak ada kartu, tidak
	 * ada ikon, tidak ada kotak tint: hanya angka, penyebut, dan garis pemisah.
	 *
	 * TIGA KEPUTUSAN YANG TIDAK TERBACA DARI KODE:
	 *
	 * 1. **Komponen ini TIDAK PERNAH melempar** (`docs/12` §2.13). `context` atau
	 *    `asOf` yang kosong menghasilkan `console.warn` di dev plus label pengganti
	 *    yang tercetak — satu pita data tidak boleh merobohkan beranda.
	 *
	 * 2. **Garis pemisah `putih/20` sah walau kontrasnya 1.3.** Ia dekoratif dan
	 *    bukan pembawa informasi: batas antarkolom juga dinyatakan oleh jarak dan
	 *    oleh label masing-masing angka, sehingga WCAG 1.4.11 tidak terlanggar
	 *    (`docs/11` §10.2). Yang membawa informasi — angka, label, konteks — semuanya
	 *    putih/70 ke atas (5.98 ✓); `putih/55` yang diusulkan audit visual GAGAL
	 *    di 4.28 dan tidak dipakai di mana pun.
	 *
	 * 3. **Angka HANYA boleh datang dari `ProgramImpactService.publicSnapshot()`.**
	 *    Snapshot itu tidak memuat satu pun field poin/tier, sehingga kebocoran
	 *    Keputusan Pemilik Produk #2 menjadi mustahil secara struktural, bukan
	 *    secara konvensi. Komponen ini tidak mengimpor store — pemanggil yang
	 *    mengoper, sesuai aturan D-6.
	 *
	 * @see docs/12-BUILD-CONTRACT-V2.md — §2.13 kontrak props FINAL
	 * @see docs/11-VISUAL-DIRECTION.md — §6 E2 pita data, §10.2 kontras di atas navy
	 */
	import ImpactFigure from './ImpactFigure.svelte';
	import Icon from '../Icon.svelte';
	import { ICONS } from '$lib/data/icons.js';
	import { kelas } from '../_visual.js';
	import { dev } from '$app/environment';

	/**
	 * @typedef {object} DataBandEntry
	 * @property {string|number} value
	 * @property {string} label
	 * @property {string} context
	 * @property {number[]} [sparkline]
	 * @property {'counted'|'estimated'} [kind]
	 * @property {import('svelte').Snippet} [methodology]
	 */

	/**
	 * @typedef {object} DataBandProps
	 * @property {DataBandEntry} lead    Metrik utama, dicetak 56 px.
	 * @property {DataBandEntry[]} items Maksimum 3; kelebihannya dipotong.
	 * @property {string} asOf           Tanggal potret angka, mis. '22 Juli 2026'. WAJIB.
	 * @property {string} [methodHref]
	 * @property {string} [class]
	 */

	/** @type {DataBandProps} */
	let {
		lead = { value: '', label: '', context: '' },
		items = [],
		asOf = '',
		methodHref = '/metode-pengukuran',
		class: className = ''
	} = $props();

	/** Maksimum item sekunder — empat kolom berarti pita, lima berarti tabel. */
	const MAKS_ITEM = 3;

	/** Label pengganti saat `asOf` kosong; sengaja terbaca janggal agar tertangkap. */
	const PERIODE_KOSONG = 'tanggal potret belum ditetapkan';

	const daftar = $derived(Array.isArray(items) ? items.slice(0, MAKS_ITEM) : []);
	const periode = $derived(asOf?.trim() ? asOf : PERIODE_KOSONG);

	$effect(() => {
		if (!dev) return;
		if (!asOf?.trim()) {
			console.warn(
				'[DataBand] Prop "asOf" kosong. Angka agregat tanpa tanggal potret adalah cacat D-12; ' +
					'pita tetap dirender agar halaman tidak roboh (docs/12 §2.13).'
			);
		}
		if (Array.isArray(items) && items.length > MAKS_ITEM) {
			console.warn(
				`[DataBand] ${items.length} item sekunder dioper, maksimum ${MAKS_ITEM}. ` +
					'Sisanya tidak dirender — pita data bukan tabel (docs/11 §6 E2).'
			);
		}
	});
</script>

<section
	class={kelas('w-full bg-pertamina-navy py-12', className)}
	aria-label="Angka program Pfriends"
>
	<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
		<div class="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-0">
			<div class="min-w-0 lg:basis-1/3 lg:pr-10">
				<ImpactFigure
					value={lead.value}
					label={lead.label}
					context={lead.context}
					sparkline={lead.sparkline}
					kind={lead.kind ?? 'counted'}
					methodology={lead.methodology}
					size="primary"
					surface="navy"
				/>
			</div>

			{#each daftar as item (item.label)}
				<!-- Garis vertikal 1px putih/20 — pemisah kolom, BUKAN border kartu.
				     Hilang di bawah lg: pada satu kolom ia menjadi garis mendatar tanpa arti. -->
				<div class="min-w-0 lg:flex-1 lg:border-l lg:border-white/20 lg:px-8">
					<ImpactFigure
						value={item.value}
						label={item.label}
						context={item.context}
						kind={item.kind ?? 'counted'}
						methodology={item.methodology}
						size="secondary"
						surface="navy"
					/>
				</div>
			{/each}
		</div>

		<p class="mt-10 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-white/70">
			<span>Angka dihitung dari catatan komunitas per {periode}.</span>
			<a
				href={methodHref}
				class="inline-flex items-center gap-1 text-white/88 underline underline-offset-4 transition-colors hover:text-white"
			>
				Metode pengukuran
				<Icon path={ICONS.arrowLongRight} size={16} />
			</a>
		</p>
	</div>
</section>
