<script>
	/**
	 * ImpactFigure — satu angka agregat BESERTA penyebutnya.
	 *
	 * Tanggung jawab: menegakkan prinsip P-2 ("setiap angka membawa penyebutnya dan
	 * tanggal potretnya") dan menyembuhkan cacat D-12 ("angka statistik tanpa
	 * penyebut, tanpa periode, tanpa sumber").
	 *
	 * EMPAT KEPUTUSAN YANG TIDAK TERBACA DARI KODE:
	 *
	 * 1. **`context` kosong TIDAK melempar — ia menjadi cacat yang TERLIHAT.**
	 *    `docs/11` §8.3 semula mewajibkan `TypeError`. `docs/12` §8.2 MENCABUTNYA
	 *    secara resmi: melempar dari komponen presentasi merobohkan seluruh halaman,
	 *    bukan satu kartu, dan penyebut yang belum tersedia bukan alasan yang
	 *    sepadan untuk itu. Penegakannya tetap ada dan tetap di kode, hanya
	 *    bentuknya berbeda: `console.error` di mode dev DITAMBAH label pengganti
	 *    yang tercetak di layar. Angka tanpa penyebut jadi mustahil lolos tinjauan
	 *    visual — tanpa mempertaruhkan halaman di depan penonton.
	 *
	 * 2. **`kind='estimated'` wajib disertai `methodology`.** Rentang estimasi tanpa
	 *    asumsi yang dapat dibuka adalah klaim, bukan data. Diperiksa di dev.
	 *
	 * 3. **Popover metode memakai `<details>`, bukan JavaScript.** Ia sudah dapat
	 *    dioperasikan papan ketik, sudah mengumumkan keadaan buka/tutup kepada
	 *    pembaca layar, dan tetap bekerja bila hidrasi gagal. Semua yang akan
	 *    ditulis tangan di sini hanya akan lebih buruk.
	 *
	 * 4. **Sparkline adalah DEKORASI, dan itu disengaja.** Kontrasnya di atas navy
	 *    hanya 1.87 — jauh di bawah 3.0:1 WCAG 1.4.11. Ia sah justru karena nol
	 *    informasi hilang tanpanya: angkanya tercetak penuh tepat di sebelahnya
	 *    (`docs/11` §10.4). Karena itu ia `aria-hidden` dan tanpa sumbu.
	 *
	 * @see docs/12-BUILD-CONTRACT-V2.md — §2.13 kontrak props FINAL, §8.2 pencabutan TypeError
	 * @see docs/11-VISUAL-DIRECTION.md — §8.3, §3.3 skala angka, §10.2 & §10.4 kontras
	 */
	import { kelas } from '../_visual.js';
	import { dev } from '$app/environment';

	/**
	 * @typedef {object} ImpactFigureProps
	 * @property {string|number} value  Sudah terformat, mis. `'3.200 – 64.000'`.
	 * @property {string} label         Kicker mono uppercase.
	 * @property {string} context       WAJIB. Penyebut atau periode potret angka.
	 * @property {'primary'|'secondary'} [size]
	 * @property {'counted'|'estimated'} [kind]
	 * @property {number[]} [sparkline] 8 titik; hanya sah pada `size='primary'`.
	 * @property {'navy'|'canvas'} [surface]
	 * @property {import('svelte').Snippet} [methodology] Isi popover metode.
	 * @property {string} [class]
	 */

	/** @type {ImpactFigureProps} */
	let {
		value = '',
		label = '',
		context = '',
		size = 'secondary',
		kind = 'counted',
		sparkline = undefined,
		surface = 'navy',
		methodology = undefined,
		class: className = ''
	} = $props();

	/** Label pengganti saat `context` kosong. Lihat keputusan 1. */
	const KONTEKS_KOSONG = 'Penyebut belum tersedia';

	const diNavy = $derived(surface === 'navy');
	const kontekTampil = $derived(context?.trim() ? context : KONTEKS_KOSONG);
	const estimasi = $derived(kind === 'estimated');

	/**
	 * Titik sparkline dinormalkan ke kotak 100×40. Hanya dirender pada `primary`:
	 * grafik mini di sebelah angka 40 px menyempitkan angkanya sendiri.
	 * @type {string}
	 */
	const titikSparkline = $derived.by(() => {
		if (size !== 'primary' || !Array.isArray(sparkline) || sparkline.length < 2) return '';
		const maks = Math.max(...sparkline);
		const min = Math.min(...sparkline);
		const rentang = maks - min || 1;
		const langkah = 100 / (sparkline.length - 1);
		return sparkline
			.map((n, i) => `${(i * langkah).toFixed(2)},${(40 - ((n - min) / rentang) * 40).toFixed(2)}`)
			.join(' ');
	});

	$effect(() => {
		if (!dev) return;
		if (!context?.trim()) {
			console.error(
				`[ImpactFigure] Prop "context" kosong pada angka "${value}" (${label}). ` +
					'Setiap angka wajib membawa penyebut atau periode potretnya (docs/11 P-2, cacat D-12). ' +
					`Sementara ini dicetak "${KONTEKS_KOSONG}" agar cacatnya terlihat di layar.`
			);
		}
		if (estimasi && !methodology) {
			console.error(
				`[ImpactFigure] kind="estimated" pada "${label}" tanpa snippet "methodology". ` +
					'Rentang estimasi tanpa asumsi yang dapat dibuka adalah klaim, bukan data (docs/11 §8.3).'
			);
		}
	});
</script>

<div class={kelas('min-w-0', className)}>
	{#if titikSparkline}
		<!-- Dekoratif: lihat keputusan 4. Tanpa area fill, tanpa gradien. -->
		<svg
			viewBox="0 0 100 40"
			preserveAspectRatio="none"
			class="mb-3 block h-10 w-full max-w-[220px]"
			aria-hidden="true"
			focusable="false"
		>
			<polyline
				points={titikSparkline}
				fill="none"
				stroke="var(--color-pertamina-green)"
				stroke-opacity="0.35"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				vector-effect="non-scaling-stroke"
			/>
		</svg>
	{/if}

	<p
		class={kelas(
			'figure-number',
			size === 'primary' ? 'text-[56px]' : 'text-[40px]',
			diNavy ? 'text-white' : 'text-ink-900'
		)}
	>
		{value}
	</p>

	<p
		class={kelas(
			'mt-3 font-mono text-[11px] leading-none font-medium tracking-[0.08em] uppercase',
			diNavy ? 'text-white/70' : 'text-ink-600'
		)}
	>
		{label}
	</p>

	<p class={kelas('mt-2 text-[13px] leading-[1.45]', diNavy ? 'text-white/70' : 'text-ink-600')}>
		{kontekTampil}
	</p>

	{#if estimasi}
		<div class="mt-3 flex flex-wrap items-center gap-2">
			<span
				class={kelas(
					'inline-flex items-center rounded-chip border px-2 py-0.5 text-[11px] font-semibold',
					diNavy ? 'border-white/40 text-white/88' : 'border-ink-300 text-ink-600'
				)}
			>
				Estimasi
			</span>

			{#if methodology}
				<details class="group min-w-0">
					<summary
						class={kelas(
							'inline-flex min-h-11 cursor-pointer list-none items-center gap-1 text-[13px] underline underline-offset-4',
							diNavy ? 'text-white/88' : 'text-ink-600'
						)}
					>
						Cara menghitungnya
					</summary>
					<div
						class={kelas(
							'mt-2 max-w-[46ch] text-[13px] leading-[1.6]',
							diNavy ? 'text-white/88' : 'text-ink-700'
						)}
					>
						{@render methodology()}
					</div>
				</details>
			{/if}
		</div>
	{/if}
</div>
