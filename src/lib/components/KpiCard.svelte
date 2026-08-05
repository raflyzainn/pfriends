<script>
	/**
	 * KpiCard — kartu satu metrik KPI.
	 *
	 * Props:
	 * @prop {{id:string,label?:string,name?:string,actual:number,target:number,unit?:string,
	 *         percent?:number,status?:string,category?:string,change?:number,
	 *         invertChange?:boolean,iconPath?:string,formula?:string}} kpi
	 * @prop {string} href
	 * @prop {string} class
	 *
	 * Menerima langsung keluaran `KpiCalculator.snapshot()`. Bila `percent` atau
	 * `status` tidak disertakan, keduanya diturunkan dari `actual` dan `target`
	 * sebagai tampilan semata — aturan ambang warna tetap milik
	 * `$lib/domain/constants/kpi-targets.js`, tidak pernah ditulis ulang di sini.
	 *
	 * MITIGASI WAJIB `--font-display` — jangan dihapus tanpa membaca ini.
	 *
	 * Kartu ini adalah pemakai `@utility numeric` yang paling menonjol di `/admin`.
	 * Dua lapis pengaman dipasang bersamaan:
	 * (a) `app.css` mengubah `numeric` agar membaca `var(--font-sans)` (daftar
	 *     putih `docs/12` §3.4 butir 7) — tanpa itu, mengganti `--font-display`
	 *     memindahkan 167 pemakaian `numeric` di 47 berkas ke serif sekaligus;
	 * (b) judul kartu di bawah memasang `font-sans` eksplisit, sehingga komponen
	 *     ini tetap benar walau seseorang kelak menyunting `app.css`.
	 * Menambahkan `font-sans` di SEBELAH `numeric` bukan mitigasi yang sah: utility
	 * itu menetapkan `font-family` sendiri, jadi pemenangnya bergantung urutan
	 * utility Tailwind 4 — taruhan, bukan jaminan. Karena itu perbaikan (a) ada di
	 * `app.css`, bukan di sini.
	 *
	 * @see docs/12-BUILD-CONTRACT-V2.md — §3.3(a) baris KpiCard, §3.3(d) butir 8
	 * @see docs/11-VISUAL-DIRECTION.md — §3.4 KOREKSI atas klaim "nol tabrakan"
	 */
	import Icon from './Icon.svelte';
	import ProgressBar from './ProgressBar.svelte';
	import { ICONS } from '$lib/data/icons.js';
	import { formatAngka, formatPersen, formatBertanda, persenProgres } from '$lib/utils/format.js';
	import {
		KPI_STATUS,
		statusKpi,
		rasioPencapaian,
		targetKpi
	} from '$lib/domain/constants/kpi-targets.js';
	import { kelas } from './_visual.js';

	let { kpi = null, href = '', class: className = '' } = $props();

	/** Warna status universal — hijau tercapai, kuning mendekati, merah tertinggal. */
	const WARNA_STATUS = {
		[KPI_STATUS.HIJAU]: { aksen: 'var(--color-pertamina-green)', teks: 'text-pertamina-green-ink' },
		[KPI_STATUS.KUNING]: { aksen: 'var(--color-tier-champion)', teks: 'text-warning' },
		[KPI_STATUS.MERAH]: { aksen: 'var(--color-pertamina-red)', teks: 'text-pertamina-red-ink' }
	};

	const judul = $derived(kpi?.label ?? kpi?.name ?? '');

	/**
	 * Definisi kanonik metrik, bila `kpi.id` merujuk salah satu dari lima KPI Hal 6.
	 * Ambang warna dan penyebut rasio diambil dari sana, tidak pernah dikarang di UI.
	 */
	const definisi = $derived.by(() => {
		if (!kpi?.id) return null;
		try {
			return targetKpi(kpi.id);
		} catch {
			return null;
		}
	});

	const persen = $derived.by(() => {
		if (typeof kpi?.percent === 'number') return kpi.percent;
		if (definisi) return Math.min(100, rasioPencapaian(kpi?.actual ?? 0, definisi) * 100);
		return persenProgres(kpi?.actual ?? 0, kpi?.target ?? 0);
	});

	const status = $derived.by(() => {
		if (kpi?.status) return kpi.status;
		if (definisi) return statusKpi(kpi?.actual ?? 0, definisi);
		return persen >= 100 ? KPI_STATUS.HIJAU : KPI_STATUS.MERAH;
	});

	const cfg = $derived(WARNA_STATUS[status] ?? WARNA_STATUS[KPI_STATUS.MERAH]);

	/** KPI "turun = bagus" membalik makna warna delta, bukan tanda angkanya. */
	const deltaMembaik = $derived(
		typeof kpi?.change === 'number' ? (kpi.invertChange ? kpi.change < 0 : kpi.change > 0) : null
	);
</script>

{#if kpi}
	<svelte:element
		this={href ? 'a' : 'div'}
		href={href || undefined}
		class={kelas('card block p-5', href && 'card-hover', className)}
		style="border-left:2px solid {cfg.aksen};"
	>
		<div class="flex items-start justify-between gap-3">
			<div class="flex min-w-0 items-center gap-2">
				<Icon path={kpi.iconPath || ICONS.chart} size={16} class="shrink-0 text-ink-400" />
				<p class="label-micro truncate font-sans" title={judul}>{judul}</p>
			</div>

			{#if typeof kpi.change === 'number' && kpi.change !== 0}
				<span
					class={kelas(
						'numeric shrink-0 rounded-chip px-1.5 py-0.5 text-[10px] font-bold',
						deltaMembaik ? 'bg-success-tint text-success' : 'bg-danger-tint text-danger'
					)}
					title="Perubahan dibanding periode sebelumnya"
				>
					{formatBertanda(kpi.change)}
				</span>
			{/if}
		</div>

		<p class="mt-2 flex items-baseline gap-1.5">
			<span class="numeric font-sans text-3xl text-ink-900">{formatAngka(kpi.actual)}</span>
			{#if kpi.unit}<span class="text-sm font-medium text-ink-500">{kpi.unit}</span>{/if}
		</p>

		<p class="mt-1.5 flex items-baseline justify-between gap-2 text-xs">
			<span class="text-ink-600">
				Target <span class="numeric font-semibold text-ink-700">{formatAngka(kpi.target)}</span>
				{#if kpi.unit}<span class="text-ink-500">{kpi.unit}</span>{/if}
			</span>
			<span class={kelas('numeric font-bold', cfg.teks)}>{formatPersen(persen)}</span>
		</p>

		<ProgressBar
			value={persen}
			max={100}
			size="xs"
			color={cfg.aksen}
			label="Pencapaian {judul}"
			class="mt-2.5"
		/>
	</svelte:element>
{/if}
