<script>
	/**
	 * EventCard: kartu kegiatan komunitas.
	 *
	 * Props:
	 * @prop {{id:string,title:string,startAt:string,endAt?:string,mode?:'ONLINE'|'OFFLINE'|'HYBRID',
	 *         location?:string,chapter?:string,quota?:number,registered?:number,
	 *         pointsReward?:number,status?:'UPCOMING'|'ONGOING'|'DONE'}} event
	 * @prop {boolean} showPoints            Baku `false`: lihat catatan di bawah.
	 * @prop {(event:any)=>void} onAttend    Kontrak 09 §5.
	 * @prop {(event:any)=>void} onRegister  Alias `onAttend` (penamaan 08 §5.2).
	 * @prop {'grid'|'list'} variant
	 * @prop {boolean} isRegistered
	 * @prop {string} href
	 *
	 * Kuota penuh mengubah tombol menjadi "Daftar Tunggu", bukan mematikannya :
	 * jalan buntu tanpa alternatif adalah kegagalan desain, bukan penegakan aturan.
	 *
	 * `showPoints` BAKU `false` dan itu keputusan kepatuhan, bukan preferensi.
	 * Keputusan Pemilik Produk #2 melarang nilai poin muncul di zona publik, dan
	 * baku `true` berarti setiap pemakaian baru bocor sampai ada yang ingat
	 * mematikannya. Zona publik memang tidak memakai komponen ini sama sekali :
	 * ia digantikan `EventListPanel` yang secara struktural tidak menerima poin :
	 * tetapi baku aman membuat kepatuhan tidak bergantung pada ingatan siapa pun.
	 *
	 * @see docs/12-BUILD-CONTRACT-V2.md: §2.13 EventCard { event, showPoints, … }
	 * @see docs/11-VISUAL-DIRECTION.md: §6 E4 tabel "yang TIDAK boleh tampil publik"
	 */
	import Button from './Button.svelte';
	import StatusBadge from './StatusBadge.svelte';
	import PointsChip from './PointsChip.svelte';
	import ProgressBar from './ProgressBar.svelte';
	import Icon from './Icon.svelte';
	import { ICONS } from '$lib/data/icons.js';
	import { formatAngka, formatTanggal } from '$lib/utils/format.js';
	import { bagianTanggal } from '$lib/utils/date.js';
	import { kelas } from './_visual.js';

	let {
		event = { id: '', title: '', startAt: '' },
		showPoints = false,
		onAttend = undefined,
		onRegister = undefined,
		variant = 'grid',
		isRegistered = false,
		href = ''
	} = $props();

	const MODE = {
		ONLINE: { label: 'Daring', color: 'blue', ikon: ICONS.globe },
		OFFLINE: { label: 'Luring', color: 'green', ikon: ICONS.mapPin },
		HYBRID: { label: 'Hibrida', color: 'purple', ikon: ICONS.users }
	};

	const STATUS = {
		UPCOMING: { label: 'Akan datang', color: 'blue' },
		ONGOING: { label: 'Berlangsung', color: 'green' },
		DONE: { label: 'Selesai', color: 'slate' }
	};

	const tanggal = $derived(bagianTanggal(event?.startAt));
	const mode = $derived(MODE[event?.mode] ?? null);
	const status = $derived(STATUS[event?.status] ?? null);

	const kuota = $derived(event?.quota ?? 0);
	const terdaftar = $derived(event?.registered ?? 0);
	const sisaKursi = $derived(Math.max(0, kuota - terdaftar));
	const penuh = $derived(kuota > 0 && sisaKursi === 0);
	const selesai = $derived(event?.status === 'DONE');

	const daftar = $derived(onRegister ?? onAttend);

	const labelTombol = $derived(
		isRegistered ? 'Terdaftar' : penuh ? 'Daftar Tunggu' : selesai ? 'Lihat Rekaman' : 'Daftar Hadir'
	);
</script>

<div
	class={kelas(
		'rounded-card border border-ink-100 bg-surface p-4 shadow-card transition-all',
		href && 'hover:border-ink-200 hover:shadow-card-hover'
	)}
>
	<div class={kelas('flex gap-4', variant === 'list' ? 'items-center' : 'items-start')}>
		{#if tanggal}
			<div
				class="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-pertamina-navy-tint"
			>
				<span class="numeric text-2xl leading-none text-pertamina-navy">{tanggal.tanggal}</span>
				<span class="label-micro mt-1 text-pertamina-navy">{tanggal.bulan}</span>
			</div>
		{/if}

		<div class="min-w-0 flex-1">
			<div class="flex flex-wrap items-center gap-1.5">
				{#if mode}<StatusBadge label={mode.label} color={mode.color} size="sm" />{/if}
				{#if status}<StatusBadge label={status.label} color={status.color} size="sm" withDot />{/if}
				{#if event?.chapter}
					<span class="text-xs text-ink-500">{event.chapter}</span>
				{/if}
			</div>

			<h3 class="mt-1.5 line-clamp-2 text-base font-semibold text-ink-800">
				{#if href}
					<a {href} class="hover:text-pertamina-red-ink">{event?.title}</a>
				{:else}
					{event?.title}
				{/if}
			</h3>

			<div class="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-600">
				<span class="inline-flex items-center gap-1">
					<Icon path={ICONS.clock} size={14} />
					{formatTanggal(event?.startAt, 'waktu')}
				</span>
				{#if event?.location}
					<span class="inline-flex items-center gap-1">
						<Icon path={ICONS.mapPin} size={14} />
						<span class="truncate">{event.location}</span>
					</span>
				{/if}
			</div>
		</div>
	</div>

	{#if kuota > 0}
		<div class="mt-4">
			<ProgressBar
				value={terdaftar}
				max={kuota}
				size="xs"
				color="var(--color-pertamina-blue)"
				label="Kuota peserta"
			/>
			<p class="mt-1.5 text-xs text-ink-600">
				<span class="numeric font-semibold text-ink-800">{formatAngka(terdaftar)}</span>
				dari {formatAngka(kuota)} kursi terisi
				{#if penuh}
					<span class="text-warning">· kuota penuh</span>
				{:else if sisaKursi <= 5}
					<span class="text-warning">· sisa {formatAngka(sisaKursi)} kursi</span>
				{/if}
			</p>
		</div>
	{/if}

	<div class="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-ink-100 pt-3">
		{#if showPoints && event?.pointsReward}
			<PointsChip points={event.pointsReward} currency="PK" size="sm" signed />
		{:else}
			<span></span>
		{/if}

		{#if daftar}
			<Button
				variant={isRegistered ? 'secondary' : 'primary'}
				size="sm"
				disabled={isRegistered}
				iconPath={isRegistered ? ICONS.check : ''}
				onclick={() => daftar(event)}
			>
				{labelTombol}
			</Button>
		{/if}
	</div>
</div>
