<script>
	/**
	 * EChart — pembungkus tipis ECharts. Tidak memuat logika chart apa pun.
	 *
	 * Props:
	 * @prop {Record<string, any>|null} option  Option ECharts yang sudah jadi.
	 *   `null` berarti "tidak ada data" dan merender pesan kosong — BUKAN grafik
	 *   bernilai nol (CH-4).
	 * @prop {string} height
	 * @prop {boolean} loading
	 * @prop {string} emptyMessage  Kalimat yang tampil saat `option === null`.
	 * @prop {((param: any) => void)|null} onclick  Penangan klik seri ECharts.
	 * @prop {string} cls    Kelas tambahan (kontrak 09 §5).
	 * @prop {string} class  Alias `cls` (penamaan 08 §5.2).
	 *
	 * ── Mengapa efeknya dipecah tiga ─────────────────────────────────────────
	 *
	 * Versi sebelumnya membaca `option` di dalam efek yang juga MEMBUAT dan
	 * MEMBONGKAR instans chart. Akibatnya setiap perubahan filter dasbor
	 * membongkar canvas, menjalankan ulang impor pustaka, dan menggambar dari
	 * nol: animasi hilang, ada kedipan putih, dan halaman dengan enam chart
	 * membayarnya enam kali. Cacat itu baru benar-benar terasa ketika jumlah
	 * chart naik — persis yang dilakukan paket ini.
	 *
	 *   1. **Siklus hidup** — bergantung pada `container` saja. Membuat instans,
	 *      memasang `ResizeObserver`, membongkar saat komponen dilepas.
	 *   2. **Data** — bergantung pada `option` dan instans. Memanggil
	 *      `setOption(opt, { notMerge: true })`. `notMerge` wajib: tanpa itu seri
	 *      lama yang tidak lagi ada pada option baru tetap tergambar.
	 *   3. **Interaksi** — memasang dan melepas `chart.on('click')` mengikuti
	 *      identitas handler, sehingga handler lama tidak menumpuk.
	 *
	 * Empat penjagaan lain yang harus tetap ada:
	 *   - `browser` guard: ECharts menyentuh `document` saat init.
	 *   - Impor dinamis `$lib/charts/_echarts.js`: pustaka (walau sudah
	 *     di-tree-shake) tetap keluar dari bundel awal; halaman tanpa chart tidak
	 *     membayarnya.
	 *   - `ResizeObserver` diperedam `requestAnimationFrame` dan **melewati wadah
	 *     berlebar nol**. Ini bukan mikro-optimasi: ECharts yang digambar ulang
	 *     pada ukuran nol tidak pulih sendiri, sehingga chart tampil kosong
	 *     selamanya setelah wadahnya sempat tersembunyi.
	 *   - `dispose()` berpenjagaan ganda saat pembongkaran; instans ECharts
	 *     memegang canvas dan listener.
	 *
	 * Setiap chart konkret tinggal di `src/lib/charts/` dan hanya menyusun `option`.
	 *
	 * @see docs/10-REVISION-SPEC.md — §7.1 cacat E-1…E-4, §7.5 CH-4
	 * @see docs/12-BUILD-CONTRACT-V2.md — §3.5 WP-07 butir 2 & 4, R-15
	 */
	import { browser } from '$app/environment';
	import Skeleton from './Skeleton.svelte';
	import { kelas } from './_visual.js';

	let {
		option = null,
		height = '280px',
		loading = false,
		emptyMessage = 'Belum ada data untuk ditampilkan',
		onclick = null,
		cls = '',
		class: className = ''
	} = $props();

	/** @type {HTMLDivElement|null} */
	let container = $state(null);

	/**
	 * @type {any}
	 * Instans ECharts disimpan sebagai state, bukan variabel biasa: efek data
	 * harus dijalankan ulang begitu instansnya siap, dan impor dinamis membuat
	 * kesiapan itu datang belakangan.
	 */
	let chart = $state.raw(null);

	const gaya = $derived(kelas(cls, className));

	/** Tidak ada data sama sekali — pesan kosong, bukan sumbu bernilai nol. */
	const kosong = $derived(option === null || option === undefined);

	// ── Efek 1 · siklus hidup ────────────────────────────────────────────────
	$effect(() => {
		const wadah = container;
		if (!browser || !wadah) return;

		/** @type {any} */
		let instans = null;
		let dibatalkan = false;
		let rafId = 0;

		import('$lib/charts/_echarts.js').then((mod) => {
			if (dibatalkan) return;
			instans = mod.default.init(wadah, null, { renderer: 'canvas' });
			instans.setOption({ backgroundColor: 'transparent' });
			chart = instans;
		});

		const ro = new ResizeObserver((entries) => {
			// Wadah berlebar nol (tab tersembunyi, panel terlipat) DILEWATI.
			const lebar = entries[0]?.contentRect?.width ?? 0;
			if (lebar === 0) return;
			cancelAnimationFrame(rafId);
			rafId = requestAnimationFrame(() => {
				if (instans && !instans.isDisposed()) instans.resize();
			});
		});
		ro.observe(wadah);

		return () => {
			dibatalkan = true;
			cancelAnimationFrame(rafId);
			ro.disconnect();
			if (instans && !instans.isDisposed()) instans.dispose();
			chart = null;
		};
	});

	// ── Efek 2 · data ────────────────────────────────────────────────────────
	$effect(() => {
		const instans = chart;
		const opt = option;
		if (!instans || instans.isDisposed()) return;

		if (!opt || Object.keys(opt).length === 0) {
			instans.clear();
			return;
		}
		instans.setOption({ backgroundColor: 'transparent', ...opt }, { notMerge: true });
	});

	// ── Efek 3 · interaksi ───────────────────────────────────────────────────
	$effect(() => {
		const instans = chart;
		const penangan = onclick;
		if (!instans || instans.isDisposed() || typeof penangan !== 'function') return;

		instans.on('click', penangan);
		return () => {
			if (!instans.isDisposed()) instans.off('click', penangan);
		};
	});
</script>

{#if loading}
	<Skeleton variant="chart" class={gaya} />
{:else if kosong}
	<div
		class={kelas(
			'flex items-center justify-center rounded-card border border-dashed border-ink-200 px-4 py-6 text-center',
			gaya
		)}
		style="width:100%;min-height:{height};"
		role="status"
	>
		<p class="max-w-sm text-sm leading-relaxed text-ink-600">{emptyMessage}</p>
	</div>
{:else}
	<div bind:this={container} class={gaya} style="width:100%;height:{height};"></div>
{/if}
