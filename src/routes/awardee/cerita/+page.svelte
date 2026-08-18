<script>
	/**
	 * HALAMAN — Blog Saya (`/awardee/cerita`).
	 *
	 * Pilar 06 Hal 5 (Community Journalism) dan "story bank" Hal 9.
	 *
	 * Route-nya tetap `/awardee/cerita`; yang berganti hanya KATA yang dilihat
	 * pengguna. Slug naskah, data seed, halaman publik `[slug]`, dan tautan
	 * verifikator seluruhnya menunjuk `/cerita` — mengganti route hanya demi
	 * kecocokan label akan menyentuh berkas jauh lebih banyak daripada nilainya
	 * pada tahap mockup.
	 *
	 * Tanggung jawab halaman ini menyempit sejak V2: ia MENDAFTAR tulisan dan
	 * statusnya, tidak lagi memuat formulir pengiriman. Komposer pindah ke
	 * `/awardee/cerita/tulis` karena dua pekerjaan itu punya ritme yang berbeda —
	 * memeriksa status adalah kunjungan tiga puluh detik yang diulang tiap minggu,
	 * menulis adalah pekerjaan setengah jam. Menumpuk keduanya di satu halaman
	 * memaksa yang pertama menunggu render yang kedua.
	 *
	 * EMPAT KEPUTUSAN YANG TIDAK TERBACA DARI KODE:
	 *
	 * 1. **Ajakan menulis berdiri sebagai kartu, bukan sebagai tombol kecil di
	 *    pojok.** Menulis adalah satu-satunya hal yang dapat DIKERJAKAN di halaman
	 *    ini; sisanya bacaan. Tombol setinggi 36px di sebelah judul membuat fitur
	 *    utama halaman terlihat seperti pelengkap.
	 * 2. **Kartu naskah TIDAK memuat poin, jenjang, maupun peringkat** (US-R14
	 *    AC-4). Larangannya ditegakkan pada struktur: kartunya `StoryStatusCard`,
	 *    yang tidak mengimpor satu pun komponen gamifikasi. Halaman ini pun tidak
	 *    mengimpor `PointsChip` maupun `TierBadge`.
	 * 3. **Sumber daftar adalah `editorial.myStories`, bukan katalog.** Store
	 *    editorial menyegarkan dirinya sesudah setiap keputusan yang berhasil,
	 *    sehingga naskah yang baru dikirim langsung berpindah kolom tanpa perlu
	 *    memuat ulang halaman. Katalog dipakai sebagai cadangan pada hidrasi awal.
	 * 4. **Naskah "Perlu revisi" ditempatkan lebih dulu, apa pun tab yang dibuka.**
	 *    Hanya di kelompok itulah bola ada di tangan penulis; menyusunnya menurut
	 *    tanggal saja akan menyembunyikan satu-satunya baris yang menuntut tindakan.
	 *
	 * @see docs/00-SOURCE-BRIEF.md — Hal 5 pilar 06, Hal 9 story bank
	 * @see docs/12-BUILD-CONTRACT-V2.md — §3.5 WP-05 kriteria selesai butir 4 & 5
	 */

	import { onMount } from 'svelte';
	import { Button, Card, EmptyState, Icon, ICONS, StatTile, Tabs } from '$lib/components';
	import { STORY_STATUS } from '$lib/domain/constants/community.js';
	import { catalog } from '$lib/stores/catalog.svelte.js';
	import { editorial } from '$lib/stores/editorial.svelte.js';
	import { session } from '$lib/stores/session.svelte.js';
	import { frasaHitung } from '$lib/utils/format.js';
	import StoryStatusCard from '../_components/StoryStatusCard.svelte';

	const TAB_SEMUA = 'semua';
	const TAB_REVISI = 'revisi';
	const TAB_TINJAUAN = 'tinjauan';
	const TAB_TERBIT = 'terbit';
	const TAB_DRAF = 'draf';

	/** Jalur komposer; ditulis sekali supaya seluruh tautan tidak pernah berselisih. */
	const JALUR_KOMPOSER = '/awardee/cerita/tulis';

	/** @type {string} */
	let tabAktif = $state(TAB_SEMUA);

	const awardee = $derived(session.awardee);

	/**
	 * Tulisan milik penulis yang sedang masuk.
	 *
	 * Store editorial menang atas katalog karena ia lebih baru; katalog hanya
	 * mengisi jeda antara halaman terbuka dan antrean selesai dimuat.
	 * @type {import('$lib/domain/entities/Story.js').Story[]}
	 */
	const blogSaya = $derived.by(() => {
		if (editorial.myStories.length > 0) return editorial.myStories;
		return awardee ? catalog.storiesByAwardee(awardee.id) : [];
	});

	const perluRevisi = $derived(blogSaya.filter((tulisan) => tulisan.needsRevision));
	const dalamTinjauan = $derived(blogSaya.filter((tulisan) => tulisan.isInModeration));
	const terbit = $derived(blogSaya.filter((tulisan) => tulisan.isPublished));
	const draf = $derived(blogSaya.filter((tulisan) => tulisan.status === STORY_STATUS.DRAFT));

	const tabs = $derived([
		{ id: TAB_SEMUA, label: 'Semua tulisan', count: blogSaya.length },
		{ id: TAB_REVISI, label: 'Perlu revisi', count: perluRevisi.length },
		{ id: TAB_TINJAUAN, label: 'Menunggu tinjauan', count: dalamTinjauan.length },
		{ id: TAB_TERBIT, label: 'Terbit', count: terbit.length },
		{ id: TAB_DRAF, label: 'Draf', count: draf.length }
	]);

	/**
	 * Tulisan yang ditampilkan pada tab aktif, yang menuntut tindakan lebih dulu.
	 * Lihat keputusan 4 pada blok pembuka.
	 */
	const tampil = $derived.by(() => {
		const sumber =
			tabAktif === TAB_REVISI
				? perluRevisi
				: tabAktif === TAB_TINJAUAN
					? dalamTinjauan
					: tabAktif === TAB_TERBIT
						? terbit
						: tabAktif === TAB_DRAF
							? draf
							: blogSaya;
		return [...sumber].sort((a, b) => {
			if (a.needsRevision !== b.needsRevision) return a.needsRevision ? -1 : 1;
			return (b.submittedAt?.getTime() ?? 0) - (a.submittedAt?.getTime() ?? 0);
		});
	});

	/**
	 * Keadaan kosong yang sesuai dengan tab yang sedang dibuka. Satu kalimat kosong
	 * untuk lima tab akan berbohong pada empat di antaranya.
	 * @returns {{judul: string, pesan: string}}
	 */
	const pesanKosong = $derived.by(() => {
		if (tabAktif === TAB_REVISI) {
			return {
				judul: 'Tidak ada tulisan yang menunggu perbaikanmu',
				pesan:
					'Setiap tulisan yang dikembalikan verifikator muncul di sini beserta catatan yang harus ditindaklanjuti.'
			};
		}
		if (tabAktif === TAB_TINJAUAN) {
			return {
				judul: 'Tidak ada tulisan di antrean tinjauan',
				pesan:
					'Tulisan yang sudah kamu kirim tampil di sini sampai verifikator mengambil keputusan.'
			};
		}
		if (tabAktif === TAB_TERBIT) {
			return {
				judul: 'Belum ada tulisan yang terbit',
				pesan:
					'Tulisan yang lolos tinjauan tayang di ruang publik dan masuk story bank untuk laporan ESG.'
			};
		}
		if (tabAktif === TAB_DRAF) {
			return {
				judul: 'Tidak ada draf tersimpan',
				pesan: 'Draf adalah tulisan yang sudah kamu mulai tetapi belum dikirim ke antrean tinjauan.'
			};
		}
		return {
			judul: 'Kamu belum menulis Blog',
			pesan:
				'Satu aksi kecil bulan ini sudah cukup menjadi tulisan. Ceritakan apa yang berubah, lampirkan buktinya, dan naskahnya masuk antrean tinjauan.'
		};
	});

	onMount(async () => {
		if (!session.ready) await session.hydrate();
		await Promise.all([catalog.load(), editorial.load()]);
	});
</script>

<svelte:head>
	<title>Blog Saya — PFfriends</title>
</svelte:head>

<div class="mb-5">
	<p class="label-micro">Pilar 06 · Community Journalism</p>
	<h1 class="mt-1 font-sans text-2xl font-bold tracking-[-0.02em] text-heading md:text-[28px]">
		Blog Saya
	</h1>
	<p class="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-600">
		Tempat kontribusimu berubah menjadi bukti. Tulisan yang lolos tinjauan tayang di ruang publik
		PFfriends dan menjadi bahan laporan ESG Pertamina Foundation.
	</p>
</div>

<!-- ══ Ajakan menulis · fitur utama halaman ini ═════════════════════════════
     Berdiri sebagai kartu penuh, bukan tombol kecil di pojok. Lihat keputusan 1. -->
<section
	class="rounded-card border border-brand-200 bg-brand-50 px-5 py-5 sm:px-6"
	aria-labelledby="judul-tulis"
>
	<div class="flex flex-wrap items-center justify-between gap-4">
		<div class="min-w-0 flex-1">
			<h2 id="judul-tulis" class="flex items-center gap-2 text-base font-bold text-heading">
				<Icon path={ICONS.edit} size={18} class="text-brand-700" />
				{#if perluRevisi.length > 0}
					{frasaHitung(perluRevisi.length, 'tulisan')} menunggu perbaikanmu
				{:else}
					Punya kabar baik yang layak dibaca orang lain?
				{/if}
			</h2>
			<p class="mt-1.5 max-w-xl text-[13px] leading-relaxed text-ink-700">
				{#if perluRevisi.length > 0}
					Verifikator sudah menuliskan apa yang perlu diubah pada tiap tulisan di bawah. Perbaiki,
					lalu kirim ulang — revisi tidak menghapus poin yang sudah tercatat.
				{:else}
					Tidak perlu panjang. Satu paragraf tentang apa yang kamu kerjakan bulan ini, ditambah satu
					foto sebagai bukti, sudah cukup untuk masuk antrean tinjauan.
				{/if}
			</p>
		</div>

		<div class="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row">
			<Button size="lg" href={JALUR_KOMPOSER} iconPath={ICONS.plus}>Tulis Blog Baru</Button>
			{#if perluRevisi.length > 0}
				<Button
					variant="secondary"
					size="lg"
					onclick={() => (tabAktif = TAB_REVISI)}
					iconPath={ICONS.edit}
				>
					Lihat yang perlu revisi
				</Button>
			{/if}
		</div>
	</div>
</section>

<div class="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
	<StatTile
		label="Tulisan saya"
		value={blogSaya.length}
		hint="Seluruh tulisan yang pernah dibuat"
		iconPath={ICONS.book}
		color="var(--color-pertamina-navy)"
	/>
	<StatTile
		label="Menunggu tinjauan"
		value={dalamTinjauan.length}
		hint="Bola ada di tangan verifikator"
		iconPath={ICONS.clock}
		color="var(--color-esg-g-ink)"
	/>
	<StatTile
		label="Sudah terbit"
		value={terbit.length}
		hint="Tayang di ruang publik PFfriends"
		iconPath={ICONS.checkCircle}
		color="var(--color-success)"
	/>
	<StatTile
		label="Perlu revisi"
		value={perluRevisi.length}
		hint="Menunggu tindak lanjutmu"
		iconPath={ICONS.edit}
		color="var(--color-warning)"
	/>
</div>

<div class="mt-6">
	<Tabs {tabs} bind:active={tabAktif} />
</div>

{#if !awardee}
	<div class="mt-6">
		<EmptyState
			iconPath={ICONS.user}
			title="Sesi anggota belum termuat"
			message="Masuk sebagai anggota PFfriends untuk melihat tulisan yang pernah kamu kirim beserta status tinjauannya."
			actionLabel="Ke halaman Masuk"
			actionHref="/masuk"
		/>
	</div>
{:else if editorial.loading && blogSaya.length === 0}
	<p class="mt-8 text-sm text-ink-600">Memuat tulisanmu…</p>
{:else if tampil.length === 0}
	<div class="mt-6">
		<EmptyState
			iconPath={ICONS.book}
			title={pesanKosong.judul}
			message={pesanKosong.pesan}
			actionLabel={tabAktif === TAB_SEMUA ? 'Tulis Blog pertamamu' : 'Lihat semua tulisan'}
			actionHref={tabAktif === TAB_SEMUA ? JALUR_KOMPOSER : ''}
			onAction={tabAktif === TAB_SEMUA ? undefined : () => (tabAktif = TAB_SEMUA)}
		/>
	</div>
{:else}
	<div class="mt-6 space-y-4">
		{#each tampil as tulisan (tulisan.id)}
			<StoryStatusCard story={tulisan} reviseHref="{JALUR_KOMPOSER}?naskah={tulisan.id}" />
		{/each}
	</div>
{/if}

<Card padding="md" class="mt-6">
	<p class="flex items-center gap-2 text-sm font-semibold text-ink-800">
		<Icon path={ICONS.info} size={16} />
		Bagaimana tulisanmu dinilai
	</p>
	<p class="mt-1.5 text-[13px] leading-relaxed text-ink-600">
		Verifikator memeriksa kelengkapan bukti, kejelasan hasil, dan ketiadaan data pribadi orang lain.
		Tulisan tidak pernah dinilai dari poin maupun jenjang penulisnya — kartu di halaman ini sengaja
		tidak menampilkan keduanya.
	</p>
</Card>
