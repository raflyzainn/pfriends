<script>
	/**
	 * StoryCard — kartu cerita komunitas.
	 *
	 * EMPAT PERUBAHAN KONTRAK YANG WAJIB DIKETAHUI PEMANGGIL:
	 *
	 * 1. **Sampul kini datang dari prop `foto` bertipe `Photo|null`, BUKAN dari
	 *    `story.cover`.** `Story` tidak pernah punya field `cover` maupun
	 *    `coverImage` — diverifikasi ke typedef `StoryInput` dan ke `seed-data.js`.
	 *    Cabang lama `{#if story?.cover}` karena itu **selalu salah**, dan itulah
	 *    sebabnya tidak satu pun kartu cerita pernah menampilkan sampul (cacat D-08).
	 *    Pengisinya adalah `fotoCerita(story.slug)`; kepemilikan pemetaan itu ada
	 *    di `src/lib/data/photos.js`, satu tempat, bukan di setiap halaman.
	 *
	 * 2. **`<img>` lama melanggar aturan aksesibilitas dokumen ini sendiri**:
	 *    `alt=""` keras, tanpa `width`/`height`, tanpa `loading`. Ketiganya kini
	 *    wajib dan diteruskan dari manifes (`docs/12` §3.3(d) butir 2).
	 *
	 * 3. **`foto === null` ATAU berkasnya gagal dimuat → fallback TIPOGRAFIS**,
	 *    bukan gradien tint + ikon. Cabang kedua (`use:pantauGagalMuat`) menutup
	 *    kasus berkas yang hilang SETELAH build, yang tidak terlihat oleh
	 *    penyaringan statis di `photos.js`.
	 *    Gradien sebagai pengganti foto adalah cacat D-08 ("placeholder
	 *    dipromosikan menjadi desain"), dan satu foto default yang dipakai bersama
	 *    seluruh kartu cerita dilarang eksplisit oleh `docs/12` §3.3(d) butir 4 —
	 *    dua belas kartu bersampul sama persis terbaca LEBIH otomatis daripada dua
	 *    belas kartu tanpa sampul.
	 *
	 * 4. **Avatar penulis tanpa cincin tier dan tanpa `TierBadge`.** Keputusan
	 *    Pemilik Produk #2: byline di zona publik memuat orang, bukan skornya.
	 *
	 * Props:
	 * @prop {{id:string,slug?:string,title:string,excerpt?:string,summary?:string,
	 *         author?:{name:string},authorName?:string,esgPillar?:'E'|'S'|'G',
	 *         pillarCode?:string,status?:string,publishedAt?:string,readMinutes?:number}} story
	 * @prop {import('$lib/data/photos.js').Photo|null} foto
	 * @prop {string} href
	 * @prop {'grid'|'feature'|'compact'} variant
	 * @prop {boolean} showStatus  Tampilan pengurus: memperlihatkan status moderasi.
	 *
	 * @see docs/12-BUILD-CONTRACT-V2.md — §2.13 StoryCard { story, foto, href, variant, showStatus }
	 * @see docs/11-VISUAL-DIRECTION.md — §9 baris StoryCard, §4.3 butir 4 fallback tipografis
	 */
	import Avatar from './Avatar.svelte';
	import StatusBadge from './StatusBadge.svelte';
	import { formatTanggal, frasaHitung } from '$lib/utils/format.js';
	import { STORY_STATUS_META } from '$lib/domain/constants/community.js';
	import { gayaKeyline, gayaPilar, kelas, keylinePilar, pantauGagalMuat } from './_visual.js';

	let {
		story = { id: '', title: '' },
		foto = null,
		href = '',
		variant = 'grid',
		showStatus = false
	} = $props();

	// `pillarCode` adalah nama field pada StoryVM; `esgPillar` adalah nama lama yang
	// masih dipakai beberapa pemanggil zona ter-login. Keduanya dibaca agar migrasi
	// halaman tidak harus serentak.
	const kodePilar = $derived(story?.pillarCode ?? story?.esgPillar ?? '');
	const pilar = $derived(gayaPilar(kodePilar));
	const statusMeta = $derived(story?.status ? STORY_STATUS_META[story.status] : null);

	const gayaBar = $derived(gayaKeyline(keylinePilar(kodePilar)));
	const rasioSampul = $derived(variant === 'feature' ? 'aspect-[3/2]' : 'aspect-video');
	const tautan = $derived(href || (story?.slug ? `/cerita/${story.slug}` : ''));
	const ringkasan = $derived(story?.excerpt ?? story?.summary ?? '');
	const namaPenulis = $derived(story?.authorName ?? story?.author?.name ?? '');

	// Ketahanan runtime (docs/12 §3.3(d) butir 4): berkas yang hilang SETELAH build
	// tidak boleh menghasilkan ikon gambar rusak. Disimpan sebagai nilai `src`
	// supaya kartu yang dipakai ulang di dalam `{#each}` pulih sendiri saat
	// ceritanya berganti.
	let srcGagal = $state('');
	const adaSampul = $derived(Boolean(foto?.src) && srcGagal !== foto.src);
</script>

<svelte:element
	this={tautan ? 'a' : 'article'}
	href={tautan || undefined}
	class={kelas(
		'group block',
		tautan && 'transition-colors hover:bg-[#efece6]',
		variant === 'compact' && 'py-1'
	)}
>
	{#if variant !== 'compact'}
		<!-- Keying rule pilar 4 px di tepi atas sampul: garis yang MENGHUBUNGKAN
		     sampul dengan teksnya, menggantikan border kartu yang MENGOTAKKAN. -->
		{#if gayaBar}
			<span class="keyline" style={gayaBar} aria-hidden="true"></span>
		{/if}

		<div class="relative w-full">
			{#if adaSampul}
				<img
					src={foto.src}
					alt={foto.alt}
					width={foto.w}
					height={foto.h}
					loading="lazy"
					decoding="async"
					class={kelas('block w-full max-w-full rounded-photo object-cover', rasioSampul)}
					use:pantauGagalMuat={() => (srcGagal = foto.src)}
				/>
			{:else}
				<!-- Fallback TIPOGRAFIS: kicker pilar dicetak besar di atas ink-50.
				     Bukan gradien, bukan ikon dalam kotak tint (D-06, D-08). -->
				<div
					class={kelas(
						'flex items-end rounded-photo bg-ink-50 p-4',
						rasioSampul
					)}
				>
					<p
						class="display-editorial text-[clamp(22px,3vw,34px)] text-ink-900"
						style={pilar ? `color:${pilar.ink};` : ''}
					>
						{pilar?.label ?? 'Cerita komunitas'}
					</p>
				</div>
			{/if}

			{#if showStatus && statusMeta}
				<span class="absolute top-3 left-3">
					<StatusBadge label={statusMeta.label} color={statusMeta.badgeColor} size="sm" />
				</span>
			{/if}
		</div>
	{/if}

	<div class={variant === 'compact' ? '' : 'pt-4'}>
		{#if pilar}
			<p class="kicker mb-3">{pilar.label}</p>
		{/if}

		<h3
			class={kelas(
				'line-clamp-2 tracking-[-0.01em] text-heading',
				variant === 'feature'
					? 'display-editorial text-[24px] leading-[1.20]'
					: 'text-[18px] leading-[1.35] font-bold'
			)}
		>
			{story?.title}
		</h3>

		{#if ringkasan}
			<p class="mt-2 line-clamp-2 text-[14px] leading-[1.5] text-ink-600">{ringkasan}</p>
		{/if}

		<div class="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1">
			{#if namaPenulis}
				<!-- Inisial, bukan wajah stok: docs/11 §4.6. Tanpa cincin tier. -->
				<Avatar name={namaPenulis} size="xs" />
				<span class="truncate text-[14px] font-medium text-ink-700">{namaPenulis}</span>
			{/if}
			{#if story?.publishedAt}
				<span class="text-[14px] text-ink-600">· {formatTanggal(story.publishedAt, 'pendek')}</span>
			{/if}
			{#if story?.readMinutes}
				<span class="text-[14px] text-ink-600">
					· {frasaHitung(story.readMinutes, 'menit')} baca
				</span>
			{/if}
			{#if showStatus && statusMeta && variant === 'compact'}
				<span class="ml-auto">
					<StatusBadge label={statusMeta.label} color={statusMeta.badgeColor} size="sm" />
				</span>
			{/if}
		</div>
	</div>
</svelte:element>
