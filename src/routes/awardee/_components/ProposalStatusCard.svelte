<script>
	/**
	 * ProposalStatusCard — satu usulan kegiatan dari sisi pengusulnya.
	 *
	 * Komponen lokal zona Awardee (KP-5). Menjawab dua pertanyaan yang selalu
	 * diajukan pengusul: *"sudah diputuskan belum?"* dan, bila sudah, *"apa kata
	 * verifikator?"*
	 *
	 * TIGA KEPUTUSAN YANG TIDAK TERBACA DARI KODE:
	 *
	 * 1. **Catatan verifikator selalu ditampilkan bila ada — termasuk pada usulan
	 *    yang DISETUJUI.** Menyembunyikannya kecuali saat ditolak membuat pengusul
	 *    hanya menerima kabar buruk yang beralasan, sementara kabar baik datang
	 *    tanpa penjelasan. Keduanya adalah keputusan; keduanya layak dibaca.
	 * 2. **Status dibaca dari `statusMeta` entity.** Tidak ada peta status kedua di
	 *    komponen ini, sehingga status baru yang ditambahkan kelak tidak perlu
	 *    disalin ke sini untuk dapat tampil.
	 * 3. **NOL poin, kuota, dan daftar peserta.** Usulan bukan mekanik gamifikasi,
	 *    dan daftar pendaftar adalah data pribadi orang lain.
	 *
	 * @see docs/12-BUILD-CONTRACT-V2.md — §3.5 WP-05 kriteria selesai butir 3
	 */
	import { Card, Icon, ICONS, StatusBadge } from '$lib/components';
	import { EventStatus } from '$lib/domain/entities/CommunityEvent.js';
	import { formatTanggal } from '$lib/utils/format.js';

	/**
	 * @typedef {object} ProposalStatusCardProps
	 * @property {import('$lib/domain/entities/CommunityEvent.js').CommunityEvent} event
	 */

	/** @type {ProposalStatusCardProps} */
	let { event } = $props();

	const ditolak = $derived(event.status === EventStatus.DITOLAK);
	const menunggu = $derived(event.isProposal);

	/**
	 * Kalimat yang menerangkan posisi usulan pada alurnya.
	 *
	 * Ditulis di sini, bukan di `EVENT_STATUS_META`, karena kalimatnya berbicara
	 * kepada PENGUSUL. Metadata status dibaca juga oleh verifikator dan halaman
	 * publik, yang membutuhkan sudut pandang berbeda atas status yang sama.
	 */
	const kalimatPosisi = $derived.by(() => {
		if (menunggu) return 'Menunggu keputusan verifikator. Usulan diambil sesuai urutan masuk.';
		if (ditolak) return 'Usulan tidak dilanjutkan. Alasannya tertulis di bawah.';
		if (event.status === EventStatus.DIBATALKAN) {
			return 'Kegiatan dibatalkan sesudah sempat terjadwal.';
		}
		return 'Usulan disetujui dan sudah tampil pada kalender komunitas.';
	});
</script>

<Card padding="md">
	<div class="flex flex-wrap items-center gap-1.5">
		<StatusBadge
			label={event.statusMeta.label}
			color={event.statusMeta.badgeColor}
			size="sm"
			withDot
		/>
		<StatusBadge label={event.typeMeta.label} color="slate" size="sm" variant="outline" />
		<StatusBadge
			label={event.isOnline ? 'Daring' : 'Luring'}
			color="slate"
			size="sm"
			variant="outline"
		/>
	</div>

	<h3 class="mt-2 text-base leading-snug font-semibold break-words text-ink-800">{event.title}</h3>

	<p class="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-600">
		<span class="inline-flex items-center gap-1">
			<Icon path={ICONS.calendar} size={14} />
			{formatTanggal(event.startsAt, 'panjang')}
		</span>
		<span class="inline-flex items-center gap-1">
			<Icon path={ICONS.clock} size={14} />
			{formatTanggal(event.startsAt, 'jam')}–{formatTanggal(event.endsAt, 'jam')} WIB
		</span>
		{#if event.location}
			<span class="inline-flex items-center gap-1">
				<Icon path={ICONS.mapPin} size={14} />
				{event.location}
			</span>
		{/if}
	</p>

	{#if event.description}
		<p class="mt-2 text-[13px] leading-relaxed text-ink-600">{event.description}</p>
	{/if}

	<p class="mt-3 text-[13px] leading-relaxed text-ink-700">{kalimatPosisi}</p>

	{#if event.submittedAt}
		<p class="mt-1 text-xs text-ink-600">
			Diusulkan {formatTanggal(event.submittedAt, 'pendek')}
			{#if event.reviewedAt}
				· diputuskan {formatTanggal(event.reviewedAt, 'pendek')}
			{/if}
		</p>
	{/if}

	{#if event.reviewNote}
		<div
			class="mt-3 rounded-xl border p-3 {ditolak
				? 'border-danger/30 bg-danger-tint/50'
				: 'border-ink-200 bg-canvas'}"
		>
			<p class="text-[13px] font-semibold text-ink-800">Catatan verifikator</p>
			<p class="mt-1 text-[13px] leading-relaxed text-ink-700">{event.reviewNote}</p>
		</div>
	{/if}
</Card>
