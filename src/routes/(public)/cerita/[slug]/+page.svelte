<script>
	/**
	 * DETAIL CERITA: satu naskah komunitas dibaca utuh oleh publik.
	 *
	 * Tiga keadaan yang wajib dibedakan halaman ini, dan sering tertukar:
	 *
	 * 1. katalog belum selesai dimuat  → kerangka pemuatan, bukan "tidak ditemukan";
	 * 2. slug tidak dikenal            → cerita memang tidak pernah ada;
	 * 3. cerita ada tetapi tidak publik → penulis mencabut consent atau naskah
	 *    ditarik dari peredaran.
	 *
	 * Keadaan ketiga sengaja tidak dijelaskan panjang lebar kepada pembaca.
	 * Menyebut "penulis mencabut persetujuannya" tetap membocorkan keputusan
	 * pribadi seseorang kepada siapa pun yang membuka tautan lama.
	 *
	 * EMPAT KEPUTUSAN YANG TIDAK TERBACA DARI KODE:
	 *
	 * 1. **Byline memuat orang, bukan capaiannya.** Lencana capaian dan cincin
	 *    penanda pada avatar dicabut, dan bersamanya pembacaan profil penulis dari
	 *    katalog: data itu dimuat semata-mata untuk mengambil tingkat capaian, dan
	 *    tanpa keperluan itu pembacaannya menjadi pekerjaan tanpa hasil.
	 *
	 * 2. **Sampul memakai foto sungguhan dari manifes, bukan gradien.** Gradien
	 *    sebagai pengganti foto adalah cacat D-08: placeholder yang dipromosikan
	 *    menjadi desain. Bila berkas sampulnya tidak ada, `PhotoFigure` jatuh ke
	 *    blok tipografis, bukan ke gradien pengganti.
	 *
	 * 3. **Panel agenda di sisi artikel adalah `EventListPanel` yang sama** dengan
	 *    beranda dan indeks cerita: pemakaian ketiga dari lima (KP-3).
	 *
	 * 4. **Cerita terkait dirender sebagai judul teks murni.** Tiga kartu bergambar
	 *    di kaki artikel bergambar hanya mengulang bentuk yang sudah dipakai di
	 *    indeks; teks murni memberi halaman ini akhir yang tenang.
	 *
	 * @see docs/11-VISUAL-DIRECTION.md: §7.2 rancangan `/cerita/[slug]`
	 * @see docs/12-BUILD-CONTRACT-V2.md: §3.5 WP-04
	 */
	import { page } from '$app/state';
	import { browser } from '$app/environment';
	import { Avatar, Button, Icon, ICONS, Skeleton } from '$lib/components';
	import EventListPanel from '$lib/components/EventListPanel.svelte';
	import { PhotoFigure } from '$lib/components/editorial';
	import { catalog } from '$lib/stores/catalog.svelte.js';
	import { publicContent } from '$lib/stores/publicContent.svelte.js';
	import { komunitas, chapter } from '$lib/domain/constants/community.js';
	import { fotoCerita } from '$lib/data/photos.js';
	import { formatAngka, formatTanggal, frasaHitung } from '$lib/utils/format.js';
	import { agendaPublik } from '../../_view-model.js';

	/** Jumlah cerita terkait yang ditawarkan di kaki artikel. */
	const JUMLAH_TERKAIT = 3;

	/** Jumlah agenda pada panel samping artikel. */
	const AGENDA_LIMIT = 3;

	/** Lama pesan "tautan tersalin" bertahan, dalam milidetik. */
	const DURASI_PESAN_SALIN = 2400;

	/**
	 * Warna keying rule per pilar ESG.
	 *
	 * Ditulis sebagai peta, bukan kelas Tailwind dinamis: Tailwind 4 memindai kode
	 * sebagai teks, dan kelas yang dirakit saat runtime tidak akan pernah tergenerate.
	 * @type {Readonly<Record<string, 'red'|'navy'|'green'|'none'>>}
	 */
	const KEYLINE_PILAR = Object.freeze({ E: 'green', S: 'navy', G: 'red' });

	const slug = $derived(page.params.slug ?? '');
	const cerita = $derived(publicContent.storyBySlug(slug));
	const sampul = $derived(slug ? fotoCerita(slug) : null);
	const agenda = $derived(agendaPublik(catalog.upcomingEvents()));

	const pilarUtama = $derived(cerita?.esgTags?.[0] ?? null);
	const keylineSampul = $derived(KEYLINE_PILAR[pilarUtama?.pillar ?? ''] ?? 'none');

	/** Paragraf naskah; badan cerita disimpan sebagai teks dengan baris kosong sebagai pemisah. */
	const paragraf = $derived(
		cerita
			? cerita.body
					.split(/\n\s*\n/)
					.map((bagian) => bagian.trim())
					.filter(Boolean)
			: []
	);

	/** Cerita lain yang berbagi minimal satu pilar ESG dengan cerita ini. */
	const ceritaTerkait = $derived(
		cerita
			? publicContent.stories
					.filter(
						(lain) =>
							lain.id !== cerita.id && lain.pillars.some((pilar) => cerita.pillars.includes(pilar))
					)
					.slice(0, JUMLAH_TERKAIT)
			: []
	);

	const tautanPenuh = $derived(browser ? page.url.href : '');
	const pesanBagikan = $derived(
		cerita ? `${cerita.title}: cerita dari komunitas PFriends Pertamina Foundation` : ''
	);
	const tautanWa = $derived(
		`https://wa.me/?text=${encodeURIComponent(`${pesanBagikan} ${tautanPenuh}`)}`
	);

	let tersalin = $state(false);

	async function salinTautan() {
		if (!browser) return;
		try {
			await navigator.clipboard.writeText(tautanPenuh);
			tersalin = true;
			setTimeout(() => (tersalin = false), DURASI_PESAN_SALIN);
		} catch {
			// Peramban yang menolak akses papan klip tidak boleh memunculkan galat:
			// tautannya sudah terlihat pada bilah alamat dan tetap dapat disalin manual.
		}
	}
</script>

<svelte:head>
	<title>{cerita?.isPublic ? `${cerita.title}: PFriends` : 'Cerita Komunitas: PFriends'}</title>
	{#if cerita?.isPublic}
		<meta name="description" content={cerita.summary} />
	{/if}
</svelte:head>

{#if !publicContent.loaded && publicContent.loading}
	<div class="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8" aria-busy="true">
		<Skeleton variant="card" />
		<Skeleton variant="title" class="mt-8" />
		<Skeleton variant="text" lines={4} class="mt-4" />
		<span class="sr-only">Memuat cerita komunitas</span>
	</div>
{:else if !cerita || !cerita.isPublic}
	<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" style="padding-block:var(--rhythm-base);">
		<p class="kicker">Cerita komunitas</p>
		<!-- `leading-[1.06]` sama dengan h1 artikel: tanpanya judul ini mewarisi
		     baris 0.98 milik `display-editorial` dan pecah dua barisnya berimpit. -->
		<h1
			class="display-editorial mt-4 max-w-[20ch] text-[clamp(30px,3.2vw,44px)] leading-[1.06] text-heading"
		>
			{cerita ? 'Cerita ini tidak lagi ditampilkan' : 'Cerita tidak ditemukan'}
		</h1>
		<p class="mt-6 max-w-[56ch] text-[18px] leading-[1.55] text-ink-700">
			{cerita
				? 'Naskah ini sudah ditarik dari ruang publik. Cerita lain dari komunitas tetap dapat kamu baca.'
				: 'Tautan yang kamu buka mungkin sudah berubah. Telusuri kembali dari daftar cerita komunitas.'}
		</p>
		<a
			href="/cerita"
			class="mt-6 inline-flex min-h-11 items-center gap-2 text-[15px] font-semibold text-pertamina-red-ink underline-offset-4 hover:underline"
		>
			Lihat semua cerita
			<Icon path={ICONS.arrowLongRight} size={18} />
		</a>
	</div>
{:else}
	<article>
		<!-- Sampul 21:9 lebar penuh, foto asli tanpa overlay. -->
		<div class="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
			<PhotoFigure
				src={sampul?.src ?? ''}
				alt={sampul?.alt ?? ''}
				width={sampul?.w ?? 0}
				height={sampul?.h ?? 0}
				ratio="21:9"
				caption={sampul?.caption ?? ''}
				keyline={keylineSampul}
				keylinePos="top"
				priority
				fallbackLabel={pilarUtama?.pillarLabel ?? 'Cerita komunitas'}
			/>
		</div>

		<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
			<div
				class="grid grid-cols-1 gap-x-12 gap-y-14 lg:grid-cols-12"
				style="padding-block:var(--rhythm-snug);"
			>
				<!-- Badan artikel -->
				<div class="min-w-0 lg:col-span-8">
					<p class="kicker">
						{pilarUtama?.pillarLabel ?? 'Cerita komunitas'}
						{#if cerita.esgTags.length > 0}
							· SDG {cerita.esgTags.map((tag) => tag.sdgGoal).join(', ')}
						{/if}
					</p>

					<h1
						class="display-editorial mt-4 max-w-[22ch] text-[clamp(30px,3.2vw,44px)] leading-[1.06] text-heading"
					>
						{cerita.title}
					</h1>

					<p class="mt-6 max-w-[56ch] text-[18px] leading-[1.55] text-ink-700">
						{cerita.summary}
					</p>

					<!-- Byline: orang, bukan capaiannya. -->
					<div class="mt-8 flex items-center gap-3 border-y border-ink-200 py-5">
						<Avatar name={cerita.authorName} size="md" />
						<div class="min-w-0">
							<p class="text-[15px] leading-[1.5] font-semibold text-ink-800">
								{cerita.authorName}
							</p>
							<p class="mt-1 text-[13px] leading-[1.45] text-ink-600">
								{komunitas(cerita.community).akronim}
								{#if cerita.chapterId}
									· {chapter(cerita.chapterId).label}
								{/if}
								{#if cerita.publishedAt}
									· {formatTanggal(cerita.publishedAt, 'panjang')}
								{/if}
								· {frasaHitung(cerita.readMinutes, 'menit')} baca
							</p>
						</div>
					</div>

					<div class="mt-10">
						{#each paragraf as alinea, index (index)}
							<p
								class="max-w-[66ch] text-ink-700 {index === 0
									? 'text-[20px] leading-[1.7]'
									: 'mt-6 text-[18px] leading-[1.75]'}"
							>
								{alinea}
							</p>
						{/each}
					</div>

					{#if cerita.outcome}
						<!-- Kotak dampak: hairline atas & bawah, bukan kartu berlatar tint. -->
						<div class="mt-12 max-w-[66ch] border-y border-ink-200 py-6">
							<p class="kicker">Dampak terukur</p>
							<p class="mt-4 text-[16px] leading-[1.68] text-ink-700">
								<span class="figure-number text-[40px] text-ink-900">
									{formatAngka(cerita.outcome.value)}
								</span>
								{cerita.outcome.unit} · {cerita.outcome.metric}
							</p>
							<p class="mt-4 max-w-[58ch] text-[15px] leading-[1.6] text-ink-600">
								{cerita.outcome.note}
							</p>
						</div>
					{/if}

					<div class="mt-12 border-t border-ink-200 pt-6">
						<p class="text-[16px] leading-[1.68] text-ink-700">
							Setiap kali cerita ini dibaca orang baru, kerja komunitas ikut terlihat.
						</p>
						<div class="mt-4 flex flex-wrap gap-2">
							<Button href={tautanWa} variant="secondary" size="sm" iconPath={ICONS.whatsapp}>
								WhatsApp
							</Button>
							<Button
								variant="secondary"
								size="sm"
								iconPath={tersalin ? ICONS.check : ICONS.link}
								onclick={salinTautan}
							>
								{tersalin ? 'Tautan tersalin' : 'Salin tautan'}
							</Button>
						</div>
					</div>
				</div>

				<!-- Panel samping -->
				<aside class="min-w-0 lg:col-span-4 lg:sticky lg:top-24 lg:self-start">
					<p class="kicker">Tentang cerita ini</p>
					<dl class="mt-5 border-t border-ink-200">
						{#if cerita.location}
							<div class="flex justify-between gap-4 border-b border-ink-200 py-3">
								<dt class="text-[14px] leading-[1.5] text-ink-600">Lokasi</dt>
								<dd class="text-right text-[14px] leading-[1.5] text-ink-800">
									{cerita.location}
								</dd>
							</div>
						{/if}
						{#if cerita.activityDate}
							<div class="flex justify-between gap-4 border-b border-ink-200 py-3">
								<dt class="text-[14px] leading-[1.5] text-ink-600">Waktu kegiatan</dt>
								<dd class="text-right text-[14px] leading-[1.5] text-ink-800">
									{formatTanggal(cerita.activityDate, 'panjang')}
								</dd>
							</div>
						{/if}
						{#if cerita.participantCount > 0}
							<div class="flex justify-between gap-4 border-b border-ink-200 py-3">
								<dt class="text-[14px] leading-[1.5] text-ink-600">Peserta terlibat</dt>
								<dd class="text-right text-[14px] leading-[1.5] text-ink-800">
									{formatAngka(cerita.participantCount)} orang
								</dd>
							</div>
						{/if}
						{#if cerita.esgTags.length > 0}
							<!-- Satu baris untuk seluruh tag: `dt` yang berulang dengan istilah
							     identik membuat daftar definisi terbaca seperti galat render. -->
							<div class="flex justify-between gap-4 border-b border-ink-200 py-3">
								<dt class="text-[14px] leading-[1.5] text-ink-600">
									{cerita.esgTags.length > 1 ? 'Pilar ESG' : 'Pilar'}
								</dt>
								<dd class="text-right text-[14px] leading-[1.5] text-ink-800">
									{#each cerita.esgTags as tag, index (tag.shortLabel)}
										{index > 0 ? ' · ' : ''}{tag.pillarLabel} (SDG {tag.sdgGoal})
									{/each}
								</dd>
							</div>
						{/if}
					</dl>

					<div class="mt-10">
						<EventListPanel
							events={agenda}
							limit={AGENDA_LIMIT}
							variant="rail"
							title="Kalender komunitas"
							href="/kalender"
							emptyMessage="Belum ada kegiatan terjadwal. Agenda baru diumumkan tiap awal bulan."
						/>
					</div>
				</aside>
			</div>
		</div>
	</article>

	{#if ceritaTerkait.length > 0}
		<!-- Cerita lain: judul teks murni, tanpa gambar. Akhir yang tenang. -->
		<section class="border-t border-ink-200" aria-labelledby="judul-terkait">
			<div
				class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
				style="padding-block:var(--rhythm-tight);"
			>
				<h2 id="judul-terkait" class="kicker">Cerita lain bertema serupa</h2>
				<div class="mt-8 grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-3">
					{#each ceritaTerkait as lain (lain.id)}
						<article class="min-w-0">
							<p class="kicker">{lain.esgTags[0]?.pillarLabel ?? 'Cerita komunitas'}</p>
							<h3 class="mt-3 text-[18px] leading-[1.35] font-bold tracking-[-0.01em]">
								<a
									href="/cerita/{lain.slug}"
									class="text-heading transition-colors hover:text-pertamina-red-ink"
								>
									{lain.title}
								</a>
							</h3>
							{#if lain.publishedAt}
								<p class="mt-2 text-[14px] leading-[1.5] text-ink-600">
									{formatTanggal(lain.publishedAt, 'pendek')}
								</p>
							{/if}
						</article>
					{/each}
				</div>
			</div>
		</section>
	{/if}
{/if}
