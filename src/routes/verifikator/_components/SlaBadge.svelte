<script>
	/**
	 * SlaBadge: penanda usia antrean terhadap batas SLA.
	 *
	 * @prop {import('$lib/domain/services/_editorial-metrics.js').SlaStatus} sla
	 *   Hasil `slaAntrean()`; `limit === 0` berarti status ini memang tidak ber-SLA.
	 * @prop {'sm'|'md'} size
	 *
	 * Tiga keputusan yang tidak terbaca dari kode:
	 *
	 * 1. **Nol angka hari kerja tertulis di komponen ini.** Baik usia maupun batas
	 *    datang dari `sla`, yang bersumber pada `SLA_HARI_KERJA`. Batas yang diubah
	 *    di domain langsung ikut berubah di sini (`docs/12` §3.5 WP-06 butir 4).
	 * 2. **Status tanpa SLA tidak dirender sebagai "0 hari".** Ia tidak dirender
	 *    sama sekali: lencana "0 dari 0" mengabarkan bahwa tenggatnya sudah
	 *    terpenuhi, padahal artinya tenggat itu tidak pernah ada.
	 * 3. **Warna bukan satu-satunya pembeda.** Baris yang lewat tenggat memakai
	 *    kata "lewat tenggat", bukan hanya latar merah: pembaca yang tidak
	 *    membedakan warna tetap harus dapat menemukan baris yang paling mendesak.
	 */
	import { StatusBadge, ICONS } from '$lib/components';
	import { usiaAntreanTeks } from './queue.js';

	/** @type {{sla: {overdue: boolean, days: number, limit: number}, size?: 'sm'|'md'}} */
	let { sla, size = 'sm' } = $props();

	const teks = $derived(usiaAntreanTeks(sla));
</script>

{#if teks !== ''}
	<StatusBadge
		label={sla.overdue ? `Lewat tenggat · ${teks}` : teks}
		color={sla.overdue ? 'red' : 'slate'}
		{size}
		variant="soft"
		withDot={sla.overdue}
		iconPath={sla.overdue ? ICONS.warning : ICONS.clock}
		title={sla.overdue
			? `Sudah ${sla.days} hari kerja di antrean, melewati batas ${sla.limit} hari kerja.`
			: `Sudah ${sla.days} hari kerja di antrean dari batas ${sla.limit} hari kerja.`}
	/>
{/if}
