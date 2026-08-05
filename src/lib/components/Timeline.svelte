<script>
	/**
	 * Timeline — jejak kronologis untuk riwayat poin dan audit ESG.
	 *
	 * Props:
	 * @prop {{id:string,title:string,description?:string,at:string,iconPath?:string,
	 *         color?:string}[]} items
	 * @prop {'default'|'compact'} variant
	 * @prop {string} emptyMessage
	 * @prop {string} [emptyDetail] Kalimat pendukung keadaan kosong; wajib netral zona.
	 * @prop {import('svelte').Snippet<[any]>} [trailing] Isi opsional di ujung kanan tiap butir.
	 * @prop {string} class
	 *
	 * Waktu ditulis relatif ("2 hari lalu") karena pertanyaan yang sebenarnya
	 * diajukan pembaca riwayat adalah "seberapa baru", bukan "tanggal berapa".
	 * Tanggal absolut tetap tersedia sebagai tooltip.
	 *
	 * ── MENGAPA KOMPONEN INI TIDAK LAGI MENGENAL `PointsChip` ──────────────────
	 * Sebelum G5, tiap butir boleh membawa `points` dan komponen ini merender
	 * `PointsChip` sendiri. Satu-satunya pemakainya di seluruh aplikasi adalah
	 * `/tentang` — halaman ZONA PUBLIK, tempat Keputusan Pemilik Produk #2
	 * melarang angka kontribusi muncul sama sekali. Cabang itu tidak pernah
	 * dipakai siapa pun, tetapi ia menautkan komponen gamifikasi ke dalam bundel
	 * zona publik, dan menjadikan kebocoran PO-2 berjarak satu field data saja:
	 * cukup seseorang menambahkan `points` pada `LINI_MASA`, dan angkanya tayang
	 * di halaman publik tanpa satu pun gerbang berubah warna.
	 *
	 * Ketergantungannya dibalik, bukan dihapus begitu saja: pemanggil dari zona
	 * ter-login yang memerlukan pil poin cukup menyerahkan snippet `trailing`.
	 * Kemampuannya utuh, arah pengetahuannya yang berubah — komponen bersama
	 * tidak lagi memikul pengetahuan yang haram bagi separuh pemakainya.
	 */
	import Icon from './Icon.svelte';
	import EmptyState from './EmptyState.svelte';
	import { ICONS } from '$lib/data/icons.js';
	import { formatRelatif, formatTanggal } from '$lib/utils/format.js';
	import { kelas } from './_visual.js';

	let {
		items = [],
		variant = 'default',
		emptyMessage = 'Belum ada aktivitas tercatat',
		emptyDetail = 'Catatan akan muncul di sini begitu kegiatannya berjalan.',
		trailing = undefined,
		class: className = ''
	} = $props();

	const rapat = $derived(variant === 'compact');
</script>

{#if items.length === 0}
	<!-- Pesan kosong sengaja NETRAL ZONA. Kalimat sebelumnya berbunyi "Poin
	     pertama Anda menunggu…" — dan komponen ini dirender `/tentang`, halaman
	     zona publik, tempat PO-2 melarang angka kontribusi disebut sama sekali.
	     Cukup satu lini masa kosong di sana untuk menayangkannya. Pemanggil dari
	     zona ter-login yang memang ingin mengajak mengumpulkan poin menyerahkan
	     kalimatnya lewat `emptyDetail`. -->
	<EmptyState
		title={emptyMessage}
		message={emptyDetail}
		iconPath={ICONS.clock}
		size="sm"
		class={className}
	/>
{:else}
	<ol class={kelas('relative', className)}>
		{#each items as butir, index (butir.id ?? index)}
			{@const warna = butir.color || 'var(--color-pertamina-blue)'}
			<li class={kelas('relative flex gap-3 pl-6', rapat ? 'pb-4' : 'pb-6', 'last:pb-0')}>
				<!-- Garis penghubung berhenti pada butir terakhir agar tidak menggantung. -->
				{#if index < items.length - 1}
					<span
						class="absolute top-4 bottom-0 left-[5px] w-0.5 bg-ink-200"
						aria-hidden="true"
					></span>
				{/if}

				<span
					class="absolute top-1.5 left-0 h-2.5 w-2.5 rounded-full ring-2 ring-white"
					style="background:{warna};"
					aria-hidden="true"
				></span>

				<div class="min-w-0 flex-1">
					<div class="flex flex-wrap items-start justify-between gap-2">
						<div class="min-w-0">
							<p class="flex items-center gap-1.5 text-sm font-semibold text-ink-800">
								{#if butir.iconPath}
									<Icon path={butir.iconPath} size={14} class="shrink-0 text-ink-500" />
								{/if}
								{butir.title}
							</p>

							{#if butir.description && !rapat}
								<p class="mt-0.5 text-[13px] leading-relaxed text-ink-600">{butir.description}</p>
							{/if}

							<p class="mt-1 text-xs text-ink-500" title={formatTanggal(butir.at, 'waktu')}>
								{formatRelatif(butir.at)}
							</p>
						</div>

						{#if trailing}
							{@render trailing(butir)}
						{/if}
					</div>
				</div>
			</li>
		{/each}
	</ol>
{/if}
