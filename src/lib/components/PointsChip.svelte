<script>
	/**
	 * PointsChip — pil saldo poin.
	 *
	 * Props:
	 * @prop {number} points     Nilai poin (kontrak 09 §5).
	 * @prop {number} value      Alias `points` (penamaan 08 §5.2).
	 * @prop {'PK'|'KT'} currency
	 * @prop {number|null} delta Perolehan baru; tampil sebagai superskrip beranimasi.
	 * @prop {'sm'|'md'|'lg'} size
	 * @prop {boolean} showLabel Menampilkan satuan di sebelah angka.
	 * @prop {boolean} signed    Menampilkan tanda + / − eksplisit.
	 * @prop {string}  class
	 *
	 * Dua mata uang dibedakan oleh WARNA DAN IKON sekaligus, tidak pernah warna
	 * saja: PK memakai navy + kilat ("prestasi"), KT memakai emas + koin ("mata
	 * uang"). Tertukarnya keduanya akan membuat pengguna salah memperkirakan apa
	 * yang bisa ditukar.
	 */
	import Icon from './Icon.svelte';
	import { ICONS } from '$lib/data/icons.js';
	import { formatAngka, formatBertanda } from '$lib/utils/format.js';
	import { kelas } from './_visual.js';

	let {
		points = 0,
		value = undefined,
		currency = 'PK',
		delta = null,
		size = 'md',
		showLabel = true,
		signed = false,
		class: className = ''
	} = $props();

	const MATA_UANG = {
		PK: {
			satuan: 'PK',
			nama: 'Poin Kontribusi',
			ikon: ICONS.bolt,
			gaya: 'bg-pertamina-navy-tint text-pertamina-navy border-pertamina-navy/20'
		},
		KT: {
			satuan: 'KT',
			nama: 'Koin Tukar',
			ikon: ICONS.coin,
			gaya: 'bg-tier-champion-tint text-rarity-epik-ink border-tier-champion/30'
		}
	};

	const UKURAN = {
		sm: { chip: 'text-[11px] px-2 py-0.5 gap-1', ikon: 12 },
		md: { chip: 'text-[13px] px-2.5 py-1 gap-1.5', ikon: 14 },
		lg: { chip: 'text-base px-3 py-1.5 gap-2', ikon: 18 }
	};

	const cfg = $derived(MATA_UANG[currency] ?? MATA_UANG.PK);
	const dim = $derived(UKURAN[size] ?? UKURAN.md);
	const nilai = $derived(value === undefined ? points : value);
	const teksNilai = $derived(signed ? formatBertanda(nilai) : formatAngka(nilai));
</script>

<span
	class={kelas(
		'inline-flex items-center rounded-chip border font-semibold whitespace-nowrap',
		dim.chip,
		cfg.gaya,
		className
	)}
	title="{teksNilai} {cfg.nama}"
>
	<Icon path={cfg.ikon} size={dim.ikon} class="shrink-0" />
	<span class="numeric">{teksNilai}</span>
	{#if showLabel}
		<span class="opacity-75">{cfg.satuan}</span>
	{/if}
	{#if delta !== null && delta !== undefined && delta !== 0}
		<sup class="point-pop numeric text-[10px] font-bold text-success">
			{formatBertanda(delta)}
		</sup>
	{/if}
</span>
