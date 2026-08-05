<script>
	/**
	 * TierBadge — chip identitas tier.
	 *
	 * Props:
	 * @prop {string|{level:string}|null} tier  Kode tier, entri TIER_TABLE, atau value object Tier.
	 * @prop {'sm'|'md'|'lg'} size
	 * @prop {boolean} showLabel  Lihat catatan aksesibilitas di bawah.
	 * @prop {'soft'|'solid'|'minimal'} variant
	 * @prop {boolean} honorary   Gelar kehormatan — tier yang pernah diraih.
	 * @prop {boolean} locked     Tier terkunci; abu + gembok, tidak pernah merah.
	 * @prop {number|null} points Bila diisi, poin tampil sebagai sufiks.
	 *
	 * Seluruh warna, label, ambang, dan kalimat benefit berasal dari
	 * `$lib/domain/constants/tier-table.js`. Tidak ada heksadesimal maupun angka
	 * ambang yang ditulis di komponen ini.
	 *
	 * Catatan aksesibilitas. Mandat 08-DESIGN-SYSTEM §6 butir 6: tier tidak boleh
	 * dibedakan hanya lewat warna. Karena itu `showLabel = false` TIDAK menghapus
	 * nama tier, melainkan hanya menyembunyikannya secara visual sambil tetap
	 * mengumumkannya lewat `sr-only` dan `title`. Varian ini hanya layak dipakai di
	 * tempat yang sudah menyebut nama tier di dekatnya (mis. kolom bertajuk "Tier");
	 * di luar itu, biarkan `showLabel` bernilai true.
	 */
	import Icon from './Icon.svelte';
	import { ICONS } from '$lib/data/icons.js';
	import { formatAngka } from '$lib/utils/format.js';
	import { gayaTier, kelas } from './_visual.js';

	let {
		tier = null,
		size = 'md',
		showLabel = true,
		variant = 'soft',
		honorary = false,
		locked = false,
		points = null
	} = $props();

	const UKURAN = {
		sm: { chip: 'text-[10px] px-2 py-0.5 gap-1', dot: 'h-1.5 w-1.5', ikon: 12 },
		md: { chip: 'text-xs px-2.5 py-1 gap-1.5', dot: 'h-2 w-2', ikon: 14 },
		lg: { chip: 'text-sm px-3 py-1.5 gap-2', dot: 'h-2.5 w-2.5', ikon: 16 }
	};

	const cfg = $derived(UKURAN[size] ?? UKURAN.md);
	const visual = $derived(gayaTier(tier));

	/** Tanpa tier yang dikenal, chip menyatakan keadaan netral — bukan kosong. */
	const label = $derived(visual ? visual.label : 'Belum Aktif');
	const teksLengkap = $derived(`${honorary ? 'Pernah: ' : ''}${label}`);
	const netral = $derived(locked || !visual);

	const gayaWadah = $derived.by(() => {
		if (netral) return '';
		if (variant === 'solid') return visual.gayaSolid;
		if (variant === 'minimal') return visual.gayaTeks;
		return visual.gayaSoft;
	});

	const judul = $derived(
		locked
			? `${label} — belum terbuka`
			: visual
				? `${teksLengkap} — ${visual.benefit}`
				: 'Belum mengumpulkan poin kontribusi'
	);
</script>

<span
	class={kelas(
		'inline-flex items-center rounded-chip font-semibold whitespace-nowrap',
		cfg.chip,
		variant === 'minimal' ? '' : 'border',
		netral && 'border-ink-200 bg-ink-100 text-ink-600',
		honorary && 'opacity-85'
	)}
	style={gayaWadah}
	title={judul}
>
	{#if locked}
		<Icon path={ICONS.lock} size={cfg.ikon} class="shrink-0" />
	{:else if honorary}
		<Icon path={ICONS.shield} size={cfg.ikon} class="shrink-0" />
	{:else if visual && variant !== 'solid'}
		<span class={kelas('shrink-0 rounded-full', cfg.dot)} style={visual.gayaDot}></span>
	{/if}

	<span class={showLabel ? '' : 'sr-only'}>{teksLengkap}</span>

	{#if points !== null && points !== undefined}
		<span class="numeric opacity-80">· {formatAngka(points)}</span>
	{/if}
</span>
