<script>
	/**
	 * QueueRow — satu baris antrean FIFO.
	 *
	 * @prop {number} position     Nomor antrean satu-basis; 1 berarti paling lama menunggu.
	 * @prop {string} title
	 * @prop {string} subtitle
	 * @prop {string} statusLabel
	 * @prop {'red'|'blue'|'navy'|'green'|'amber'|'slate'|'purple'} statusColor
	 * @prop {{overdue: boolean, days: number, limit: number}|null} sla
	 * @prop {readonly string[]} meta   Keterangan pendek; ditampilkan berjajar.
	 * @prop {string} href              Tujuan baris; kosong berarti baris tidak bertaut.
	 * @prop {import('svelte').Snippet} [actions]  Kendali keputusan di sisi kanan.
	 *
	 * Tiga keputusan yang tidak terbaca dari kode:
	 *
	 * 1. **Nomor antrean ditampilkan, bukan disembunyikan.** Antrean FIFO yang
	 *    tidak menunjukkan posisinya sulit dibedakan dari daftar biasa, dan
	 *    verifikator kehilangan satu-satunya alasan untuk tidak melompati baris.
	 * 2. **Baris tetap terbaca tanpa warna.** Status ditulis sebagai kata, usia
	 *    antrean sebagai kalimat — bukan hanya sebagai latar merah.
	 * 3. **Tautan membungkus judul, bukan seluruh baris.** Baris yang seluruhnya
	 *    dapat diklik akan menelan tombol keputusan di dalamnya, dan tombol yang
	 *    tertelan tautan berpindah halaman alih-alih membuka dialog.
	 */
	import { StatusBadge } from '$lib/components';
	import SlaBadge from './SlaBadge.svelte';

	/**
	 * @type {{
	 *   position: number,
	 *   title: string,
	 *   subtitle?: string,
	 *   statusLabel?: string,
	 *   statusColor?: 'red'|'blue'|'navy'|'green'|'amber'|'slate'|'purple',
	 *   sla?: {overdue: boolean, days: number, limit: number}|null,
	 *   meta?: readonly string[],
	 *   href?: string,
	 *   actions?: import('svelte').Snippet
	 * }}
	 */
	let {
		position,
		title,
		subtitle = '',
		statusLabel = '',
		statusColor = 'slate',
		sla = null,
		meta = [],
		href = '',
		actions
	} = $props();
</script>

<article
	class="card p-4 {sla?.overdue ? 'border-l-2 border-l-pertamina-red' : ''}"
	aria-label="Antrean nomor {position}: {title}"
>
	<div class="flex items-start gap-3">
		<span
			class="numeric mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-chip bg-ink-100 text-sm font-bold text-ink-700"
			aria-hidden="true"
		>
			{position}
		</span>

		<div class="min-w-0 flex-1">
			<h3 class="text-[15px] leading-snug font-bold text-heading">
				{#if href !== ''}
					<a class="hover:text-pertamina-red-ink hover:underline" {href}>{title}</a>
				{:else}
					{title}
				{/if}
			</h3>

			{#if subtitle !== ''}
				<p class="mt-1 text-sm leading-relaxed text-ink-600">{subtitle}</p>
			{/if}

			<div class="mt-2.5 flex flex-wrap items-center gap-2">
				{#if statusLabel !== ''}
					<StatusBadge label={statusLabel} color={statusColor} size="sm" variant="soft" />
				{/if}
				{#if sla}
					<SlaBadge {sla} />
				{/if}
				{#each meta as keterangan (keterangan)}
					<span class="text-xs text-ink-600">{keterangan}</span>
				{/each}
			</div>

			{#if actions}
				<div class="mt-3 border-t border-ink-100 pt-3">
					{@render actions()}
				</div>
			{/if}
		</div>
	</div>
</article>
