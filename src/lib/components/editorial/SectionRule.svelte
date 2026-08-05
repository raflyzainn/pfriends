<script module>
	/**
	 * Kombinasi skala+ritme yang dipakai `SectionRule` terakhir yang di-mount.
	 * Hidup di tingkat modul karena dua seksi bersebelahan adalah dua INSTANCE
	 * berbeda — perbandingan mustahil dilakukan dari dalam satu instance.
	 * @type {string}
	 */
	let kombinasiTerakhir = '';
</script>

<script>
	/**
	 * SectionRule — kepala seksi zona publik yang MEMAKSA variasi.
	 *
	 * Tanggung jawab: garis kunci + label seksi + ritme vertikal seksi. Obat
	 * langsung untuk D-03 (empat kepala seksi identik strukturnya), D-04 (judul
	 * empat seksi berbeda pada ukuran & bobot yang sama persis), dan D-10
	 * (spacing metronomik).
	 *
	 * TIGA KEPUTUSAN YANG TIDAK TERBACA DARI KODE:
	 *
	 * 1. **Aturan ritme DITEGAKKAN KODE, bukan konvensi.** Bila dua `SectionRule`
	 *    bersebelahan memakai kombinasi `scale` + `rhythm` identik, komponen
	 *    memperingatkan di konsol mode dev. Aturan yang hanya tertulis di dokumen
	 *    akan dilanggar dalam dua sprint; inilah satu-satunya bentuk yang bertahan
	 *    setelah orang lain menyunting halaman.
	 *
	 * 2. **Peringatan TIDAK PERNAH menjadi lemparan.** Satu kepala seksi yang
	 *    ritmenya kurang bervariasi bukan alasan yang sepadan untuk merobohkan
	 *    seluruh halaman (`docs/12` §8.2).
	 *
	 * 3. **`children` opsional.** Dipakai sebagai pembungkus `<section>`, komponen
	 *    ini menerapkan `padding-block` ritme ke seluruh isi seksi — itulah yang
	 *    membuat prop `rhythm` punya arti. Dipakai berdiri sendiri, ia hanya
	 *    mencetak garis + label. Keduanya sah; kontrak §2.13 tidak melarang
	 *    snippet karena snippet bukan prop yang bisa salah nama (R-22).
	 *
	 * @see docs/12-BUILD-CONTRACT-V2.md — §2.13 SectionRule { label, tone, scale, rhythm }
	 * @see docs/11-VISUAL-DIRECTION.md — §8.2 tanggung jawab, §3.3 skala tipografi
	 */
	import { gayaKeyline, kelas, ritmeSeksi } from '../_visual.js';
	import { dev } from '$app/environment';

	/**
	 * @typedef {object} SectionRuleProps
	 * @property {string} [label]   Judul seksi. Kosong → hanya garis pemisah.
	 * @property {'ink'|'red'|'navy'} [tone]
	 * @property {'display'|'section'|'quiet'} [scale]
	 * @property {'loose'|'base'|'snug'|'tight'|'flush'} [rhythm]
	 * @property {string} [kicker]  Kicker mono 11px di atas judul; sengaja opsional.
	 * @property {string} [lead]    Dek 18px di bawah judul.
	 * @property {import('svelte').Snippet} [action]   Tautan "Lihat semua →".
	 * @property {import('svelte').Snippet} [children] Isi seksi.
	 * @property {string} [class]
	 */

	/** @type {SectionRuleProps} */
	let {
		label = '',
		tone = 'ink',
		scale = 'section',
		rhythm = 'base',
		kicker = '',
		lead = '',
		action = undefined,
		children = undefined,
		class: className = ''
	} = $props();

	/**
	 * Skala judul seksi — 44 / 30 / 24 px, lompatan sungguhan (docs/11 §3.3).
	 * Fraunces tidak pernah dipakai di bawah 24 px, jadi ketiganya aman memakai
	 * `display-editorial`.
	 */
	const SKALA = {
		display: 'text-[clamp(30px,3.2vw,44px)] leading-[1.06]',
		section: 'text-[30px] leading-[1.12]',
		quiet: 'text-[24px] leading-[1.20]'
	};

	/** `tone` mewarnai garis kunci; `ink` berarti hairline netral, bukan bar berwarna. */
	const gayaBar = $derived(tone === 'ink' ? '' : gayaKeyline(tone));

	const gayaRitme = $derived(`padding-block:${ritmeSeksi(rhythm)};`);

	// Peringatan ritme. Dijalankan sekali per instance saat komponen di-mount.
	$effect(() => {
		if (!dev) return;
		const kombinasi = `${scale}/${rhythm}`;
		if (kombinasi === kombinasiTerakhir) {
			console.warn(
				`[SectionRule] Dua seksi berurutan memakai kombinasi skala+ritme yang sama ("${kombinasi}"). ` +
					'Halaman akan terbaca metronomik (D-10) dan kepala seksinya seragam (D-03/D-04). ' +
					'Ubah salah satunya — docs/11 §3.3 & §3.5.'
			);
		}
		kombinasiTerakhir = kombinasi;
	});
</script>

<section class={kelas('w-full', className)} style={gayaRitme}>
	{#if gayaBar}
		<span class="keyline max-w-24" style={gayaBar} aria-hidden="true"></span>
	{:else}
		<span class="block h-px w-full bg-ink-200" aria-hidden="true"></span>
	{/if}

	{#if label || kicker || lead || action}
		<div
			class="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
		>
			<div class="min-w-0">
				{#if kicker}
					<p class="kicker mb-3">{kicker}</p>
				{/if}
				{#if label}
					<h2 class={kelas('display-editorial max-w-[22ch] text-heading', SKALA[scale] ?? SKALA.section)}>
						{label}
					</h2>
				{/if}
				{#if lead && scale !== 'quiet'}
					<!-- Skala `quiet` sengaja tanpa dek: seksi tenang yang tetap berdek
					     kembali menjadi kepala seksi penuh, dan variasinya hilang. -->
					<p class="mt-4 max-w-[52ch] text-[18px] leading-[1.55] text-ink-700">{lead}</p>
				{/if}
			</div>

			{#if action}
				<div class="shrink-0">{@render action()}</div>
			{/if}
		</div>
	{/if}

	{#if children}
		<div class="mt-10">{@render children()}</div>
	{/if}
</section>
