<script>
	/**
	 * StorySpread — hierarki cerita 1 + 2 + 4 (E5 beranda dan indeks `/cerita`).
	 *
	 * Tanggung jawab: menggantikan `grid-cols-3` yang membuat sebelas cerita
	 * terbaca sama pentingnya (D-05 dan D-11). Satu lead besar, dua sekunder
	 * ber-thumbnail, empat brief TANPA GAMBAR SAMA SEKALI.
	 *
	 * TIGA KEPUTUSAN YANG TIDAK TERBACA DARI KODE:
	 *
	 * 1. **Ketiadaan gambar pada empat brief DISENGAJA.** Halaman butuh pasang
	 *    surut, bukan tekanan rata. Menambahkan thumbnail di sana "supaya konsisten"
	 *    mengembalikan persis cacat yang seksi ini perbaiki.
	 *
	 * 2. **Byline tanpa `TierBadge`, tanpa cincin tier, tanpa poin.** Keputusan
	 *    Pemilik Produk #2. Yang menggantikan lencana adalah keterangan orang yang
	 *    sesungguhnya — nama penulis dan tanggal terbit. `StoryVM` memang tidak
	 *    memuat satu pun field skor, jadi kebocoran di sini mustahil.
	 *
	 * 3. **`foto === null` → kicker pilar besar, bukan gradien.** Sama persis dengan
	 *    cabang `StoryCard`; `fotoCerita()` sengaja tidak jatuh ke satu foto default
	 *    bersama (`docs/12` §3.3(d) butir 4).
	 *
	 * @see docs/12-BUILD-CONTRACT-V2.md — §2.13 StorySpread { lead, secondary, briefs }
	 * @see docs/11-VISUAL-DIRECTION.md — §6 E5 hierarki 1 + 2 + 4
	 */
	import PhotoFigure from './PhotoFigure.svelte';
	import Avatar from '../Avatar.svelte';
	import { gayaKeyline, gayaPilar, kelas, keylinePilar, pantauGagalMuat } from '../_visual.js';
	import { formatTanggal, frasaHitung } from '$lib/utils/format.js';

	/**
	 * @typedef {import('./view-model.js').StoryVM} StoryVM
	 */

	/**
	 * @typedef {object} StorySpreadProps
	 * @property {StoryVM|null} lead        Cerita unggulan; foto 3:2.
	 * @property {StoryVM[]} secondary      Dua cerita ber-thumbnail 16:9.
	 * @property {StoryVM[]} briefs         Empat cerita teks murni.
	 * @property {string} [class]
	 */

	/** @type {StorySpreadProps} */
	let { lead = null, secondary = [], briefs = [], class: className = '' } = $props();

	/** Batas rancangan E5. Kelebihan dipotong, bukan dibungkus baris kedua. */
	const MAKS_SEKUNDER = 2;
	const MAKS_BRIEF = 4;

	const duaSekunder = $derived(Array.isArray(secondary) ? secondary.slice(0, MAKS_SEKUNDER) : []);
	const empatBrief = $derived(Array.isArray(briefs) ? briefs.slice(0, MAKS_BRIEF) : []);

	const pilarLead = $derived(lead ? gayaPilar(lead.pillarCode) : null);

	/**
	 * Sampul thumbnail yang gagal dimuat, dikunci per jalur `src`.
	 *
	 * Peta, bukan boolean, karena dua thumbnail dirender dalam satu `{#each}`:
	 * satu bendera bersama akan menjatuhkan keduanya ketika hanya satu berkas
	 * yang hilang. Kunci berupa `src` sekaligus membuat pemulihan otomatis saat
	 * daftar ceritanya berganti (`docs/12` §3.3(d) butir 4).
	 * @type {Record<string, true>}
	 */
	let sampulGagal = $state({});

	/**
	 * Menandai satu sampul sebagai gagal dimuat.
	 * @param {string} src
	 */
	function tandaiGagal(src) {
		sampulGagal = { ...sampulGagal, [src]: true };
	}
</script>

<div class={kelas('w-full', className)}>
	<div class="grid grid-cols-1 gap-x-10 gap-y-12 lg:grid-cols-12">
		{#if lead}
			<article class="min-w-0 lg:col-span-7">
				{#if lead.foto}
					<a href={lead.href} class="block">
						<PhotoFigure
							src={lead.foto.src}
							alt={lead.foto.alt}
							width={lead.foto.w}
							height={lead.foto.h}
							ratio="3:2"
							caption={lead.foto.caption}
							keyline={keylinePilar(lead.pillarCode)}
							keylinePos="top"
						/>
					</a>
				{:else}
					<!-- Fallback TIPOGRAFIS: kicker pilar besar di atas ink-50 + keying rule. -->
					<a href={lead.href} class="block">
						<span class="keyline" style={gayaKeyline(keylinePilar(lead.pillarCode))} aria-hidden="true"
						></span>
						<div class="flex aspect-[3/2] items-end rounded-photo bg-ink-50 p-6">
							<p
								class="display-editorial text-[clamp(28px,4vw,44px)] leading-[1.06] text-ink-900"
								style={pilarLead ? `color:${pilarLead.ink};` : ''}
							>
								{lead.pillarLabel || 'Cerita komunitas'}
							</p>
						</div>
					</a>
				{/if}

				{#if lead.pillarLabel}
					<p class="kicker mt-6">{lead.pillarLabel}</p>
				{/if}

				<h3 class="mt-3 max-w-[24ch]">
					<a
						href={lead.href}
						class="display-editorial text-[24px] leading-[1.20] text-heading transition-colors hover:text-pertamina-red-ink"
					>
						{lead.title}
					</a>
				</h3>

				{#if lead.excerpt}
					<p class="mt-4 max-w-[52ch] text-[17px] leading-[1.55] text-ink-700">{lead.excerpt}</p>
				{/if}

				<div class="mt-5 flex items-center gap-3">
					<!-- Avatar INISIAL — docs/11 §4.6 melarang menempelkan wajah stok ke nama orang. -->
					<Avatar name={lead.authorName} size="sm" />
					<p class="min-w-0 text-[14px] leading-[1.5] text-ink-600">
						<span class="font-medium text-ink-700">{lead.authorName}</span>
						{#if lead.publishedAt}
							· {formatTanggal(lead.publishedAt, 'pendek')}
						{/if}
						{#if lead.readMinutes}
							· {frasaHitung(lead.readMinutes, 'menit')} baca
						{/if}
					</p>
				</div>
			</article>
		{/if}

		{#if duaSekunder.length}
			<div class="min-w-0 lg:col-span-5">
				{#each duaSekunder as cerita, i (cerita.id)}
					<article class={kelas('flex gap-4', i > 0 && 'mt-6 border-t border-ink-200 pt-6')}>
						<a href={cerita.href} class="w-[120px] shrink-0 sm:w-[160px]">
							{#if cerita.foto && !sampulGagal[cerita.foto.src]}
								<img
									src={cerita.foto.src}
									alt={cerita.foto.alt}
									width={cerita.foto.w}
									height={cerita.foto.h}
									loading="lazy"
									decoding="async"
									class="block aspect-video w-full max-w-full rounded-photo object-cover"
									use:pantauGagalMuat={() => tandaiGagal(cerita.foto.src)}
								/>
							{:else}
								<span
									class="flex aspect-video w-full items-end rounded-photo bg-ink-50 p-2"
									aria-hidden="true"
								>
									<span class="kicker">{cerita.pillarLabel || 'Cerita'}</span>
								</span>
							{/if}
						</a>

						<div class="min-w-0">
							<h4 class="text-[18px] leading-[1.35] font-bold tracking-[-0.01em]">
								<a href={cerita.href} class="transition-colors hover:text-pertamina-red-ink">
									{cerita.title}
								</a>
							</h4>
							<p class="mt-2 text-[14px] leading-[1.5] text-ink-600">
								{cerita.authorName}
								{#if cerita.publishedAt}
									· {formatTanggal(cerita.publishedAt, 'pendek')}
								{/if}
							</p>
						</div>
					</article>
				{/each}
			</div>
		{/if}
	</div>

	{#if empatBrief.length}
		<div class="mt-14 grid grid-cols-1 gap-x-8 gap-y-8 border-t border-ink-200 pt-10 sm:grid-cols-2 lg:grid-cols-4">
			{#each empatBrief as cerita (cerita.id)}
				<article class="min-w-0">
					{#if cerita.pillarLabel}
						<p class="kicker">{cerita.pillarLabel}</p>
					{/if}
					<h4 class="mt-3 text-[18px] leading-[1.35] font-bold tracking-[-0.01em]">
						<a href={cerita.href} class="transition-colors hover:text-pertamina-red-ink">
							{cerita.title}
						</a>
					</h4>
					{#if cerita.publishedAt}
						<p class="mt-2 text-[14px] leading-[1.5] text-ink-600">
							{formatTanggal(cerita.publishedAt, 'pendek')}
						</p>
					{/if}
				</article>
			{/each}
		</div>
	{/if}
</div>
