<script>
	/**
	 * RequirementList: daftar syarat beserta status terpenuhi/belum.
	 *
	 * Komponen lokal zona Awardee (KP-5). Dipakai dua formulir yang sama-sama
	 * bergerbang: komposer cerita `/awardee/cerita/tulis` dan pengusulan kegiatan
	 * di `/awardee/kalender`.
	 *
	 * Dua keputusan yang tidak terbaca dari kode:
	 *
	 * 1. **Komponen ini tidak menghitung apa pun.** Ia menerima daftar syarat yang
	 *    sudah dinilai dan hanya merenderkannya. Penilaian kelayakan tinggal di
	 *    entity (`Story.isSubmittable`) dan di `Validator`; menyalin sebagiannya ke
	 *    sini akan melahirkan gerbang kedua yang cepat berbeda pendapat dengan
	 *    gerbang pertama.
	 * 2. **Syarat yang BELUM terpenuhi selalu membawa `hint`.** Sebuah tanda silang
	 *    tanpa penjelasan hanya memberi tahu penulis bahwa ia gagal, bukan apa yang
	 *    harus ia perbaiki: dan itulah persis kegagalan pesan galat umum yang
	 *    dilarang §3.5 WP-05 butir 1.
	 *
	 * @see docs/12-BUILD-CONTRACT-V2.md: §3.5 WP-05 kriteria selesai butir 1
	 */
	import { Icon, ICONS } from '$lib/components';

	/**
	 * @typedef {object} Requirement
	 * @property {string} key        Identitas stabil; dipakai sebagai kunci `{#each}`.
	 * @property {string} label      Nama syarat dalam Bahasa Indonesia.
	 * @property {boolean} terpenuhi
	 * @property {string} [hint]     Langkah konkret yang membuatnya terpenuhi.
	 */

	/**
	 * @typedef {object} RequirementListProps
	 * @property {Requirement[]} items
	 * @property {string} [title]
	 * @property {string} [description]
	 * @property {string} [class]
	 */

	/** @type {RequirementListProps} */
	let { items = [], title = '', description = '', class: className = '' } = $props();

	const daftar = $derived(Array.isArray(items) ? items : []);
	const belum = $derived(daftar.filter((syarat) => !syarat.terpenuhi));
</script>

<div class={className}>
	{#if title}
		<p class="text-sm font-semibold text-ink-800">{title}</p>
	{/if}
	{#if description}
		<p class="mt-0.5 text-xs leading-relaxed text-ink-600">{description}</p>
	{/if}

	<ul class="mt-3 space-y-2.5">
		{#each daftar as syarat (syarat.key)}
			<li class="flex items-start gap-2">
				<span
					class="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full {syarat.terpenuhi
						? 'bg-success-tint text-success'
						: 'bg-ink-200 text-ink-600'}"
					aria-hidden="true"
				>
					<Icon path={syarat.terpenuhi ? ICONS.check : ICONS.x} size={14} />
				</span>
				<span class="min-w-0 text-[13px] leading-relaxed text-ink-700">
					<span class="font-medium text-ink-800">{syarat.label}</span>
					{#if !syarat.terpenuhi && syarat.hint}
						<span class="text-ink-600">: {syarat.hint}</span>
					{/if}
					<span class="sr-only">{syarat.terpenuhi ? 'Terpenuhi' : 'Belum terpenuhi'}</span>
				</span>
			</li>
		{/each}
	</ul>

	{#if daftar.length > 0}
		<p class="mt-3 border-t border-ink-100 pt-3 text-xs leading-relaxed text-ink-600">
			{#if belum.length === 0}
				Seluruh syarat terpenuhi. Naskah siap dikirim.
			{:else}
				Masih ada {belum.length} syarat yang belum terpenuhi: {belum
					.map((syarat) => syarat.label.toLowerCase())
					.join(', ')}.
			{/if}
		</p>
	{/if}
</div>
