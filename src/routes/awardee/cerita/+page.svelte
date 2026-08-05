<script>
	/**
	 * HALAMAN — Ruang Cerita (`/awardee/cerita`).
	 *
	 * Pilar 06 Hal 5 (Community Journalism) dan "story bank" Hal 9.
	 *
	 * Tanggung jawab halaman ini menyempit sejak V2: ia MENDAFTAR naskah dan
	 * statusnya, tidak lagi memuat formulir pengiriman. Komposer pindah ke
	 * `/awardee/cerita/tulis` karena dua pekerjaan itu punya ritme yang berbeda —
	 * memeriksa status adalah kunjungan tiga puluh detik yang diulang tiap minggu,
	 * menulis naskah adalah pekerjaan setengah jam. Menumpuk keduanya di satu
	 * halaman memaksa yang pertama menunggu render yang kedua, dan membuat formulir
	 * panjang tersembunyi di balik tab yang jarang dibuka.
	 *
	 * TIGA KEPUTUSAN YANG TIDAK TERBACA DARI KODE:
	 *
	 * 1. **Kartu naskah TIDAK memuat poin, tier, maupun peringkat** (US-R14 AC-4).
	 *    Larangannya ditegakkan pada struktur: kartunya adalah `StoryStatusCard`,
	 *    yang tidak mengimpor satu pun komponen gamifikasi. Halaman ini pun tidak
	 *    mengimpor `PointsChip` maupun `TierBadge`.
	 * 2. **Sumber daftar adalah `editorial.myStories`, bukan katalog.** Store
	 *    editorial menyegarkan dirinya sesudah setiap keputusan yang berhasil,
	 *    sehingga naskah yang baru dikirim langsung berpindah kolom tanpa perlu
	 *    memuat ulang halaman. Katalog dipakai sebagai cadangan pada hidrasi awal.
	 * 3. **Naskah "Perlu revisi" ditempatkan lebih dulu, apa pun tab yang dibuka.**
	 *    Hanya di kelompok itulah bola ada di tangan penulis; menyusunnya menurut
	 *    tanggal saja akan menyembunyikan satu-satunya baris yang menuntut tindakan.
	 *
	 * @see docs/00-SOURCE-BRIEF.md — Hal 5 pilar 06, Hal 9 story bank
	 * @see docs/12-BUILD-CONTRACT-V2.md — §3.5 WP-05 kriteria selesai butir 4 & 5
	 */

	import { onMount } from 'svelte';
	import {
		Button,
		Card,
		EmptyState,
		Icon,
		ICONS,
		PageHeader,
		StatTile,
		Tabs
	} from '$lib/components';
	import { STORY_STATUS } from '$lib/domain/constants/community.js';
	import { catalog } from '$lib/stores/catalog.svelte.js';
	import { editorial } from '$lib/stores/editorial.svelte.js';
	import { session } from '$lib/stores/session.svelte.js';
	import StoryStatusCard from '../_components/StoryStatusCard.svelte';

	const TAB_SEMUA = 'semua';
	const TAB_REVISI = 'revisi';
	const TAB_TINJAUAN = 'tinjauan';
	const TAB_TERBIT = 'terbit';

	/** Jalur komposer; ditulis sekali supaya seluruh tautan tidak pernah berselisih. */
	const JALUR_KOMPOSER = '/awardee/cerita/tulis';

	/** @type {string} */
	let tabAktif = $state(TAB_SEMUA);

	const awardee = $derived(session.awardee);

	/**
	 * Naskah milik penulis yang sedang masuk.
	 *
	 * Store editorial menang atas katalog karena ia lebih baru; katalog hanya
	 * mengisi jeda antara halaman terbuka dan antrean selesai dimuat.
	 * @type {import('$lib/domain/entities/Story.js').Story[]}
	 */
	const naskahSaya = $derived.by(() => {
		if (editorial.myStories.length > 0) return editorial.myStories;
		return awardee ? catalog.storiesByAwardee(awardee.id) : [];
	});

	const perluRevisi = $derived(naskahSaya.filter((cerita) => cerita.needsRevision));
	const dalamTinjauan = $derived(naskahSaya.filter((cerita) => cerita.isInModeration));
	const terbit = $derived(naskahSaya.filter((cerita) => cerita.isPublished));
	const disetujui = $derived(
		naskahSaya.filter((cerita) => cerita.status === STORY_STATUS.DISETUJUI)
	);

	const tabs = $derived([
		{ id: TAB_SEMUA, label: 'Semua naskah', count: naskahSaya.length },
		{ id: TAB_REVISI, label: 'Perlu revisi', count: perluRevisi.length },
		{ id: TAB_TINJAUAN, label: 'Dalam tinjauan', count: dalamTinjauan.length },
		{ id: TAB_TERBIT, label: 'Terbit', count: terbit.length }
	]);

	/**
	 * Naskah yang ditampilkan pada tab aktif, naskah yang menuntut tindakan lebih
	 * dulu. Lihat keputusan 3 pada blok pembuka.
	 */
	const tampil = $derived.by(() => {
		const sumber =
			tabAktif === TAB_REVISI
				? perluRevisi
				: tabAktif === TAB_TINJAUAN
					? dalamTinjauan
					: tabAktif === TAB_TERBIT
						? terbit
						: naskahSaya;
		return [...sumber].sort((a, b) => {
			if (a.needsRevision !== b.needsRevision) return a.needsRevision ? -1 : 1;
			return (b.submittedAt?.getTime() ?? 0) - (a.submittedAt?.getTime() ?? 0);
		});
	});

	/**
	 * Keadaan kosong yang sesuai dengan tab yang sedang dibuka. Satu kalimat kosong
	 * untuk empat tab akan berbohong pada tiga di antaranya.
	 * @returns {{judul: string, pesan: string}}
	 */
	const pesanKosong = $derived.by(() => {
		if (tabAktif === TAB_REVISI) {
			return {
				judul: 'Tidak ada naskah yang menunggu perbaikanmu',
				pesan:
					'Setiap naskah yang dikembalikan verifikator muncul di sini beserta catatan yang harus ditindaklanjuti.'
			};
		}
		if (tabAktif === TAB_TINJAUAN) {
			return {
				judul: 'Tidak ada naskah di antrean tinjauan',
				pesan:
					'Naskah yang sudah kamu kirim tampil di sini sampai verifikator mengambil keputusan.'
			};
		}
		if (tabAktif === TAB_TERBIT) {
			return {
				judul: 'Belum ada naskah yang terbit',
				pesan:
					'Naskah yang lolos tinjauan tayang di ruang publik dan masuk story bank untuk laporan ESG.'
			};
		}
		return {
			judul: 'Kamu belum mengirim cerita',
			pesan:
				'Satu aksi kecil bulan ini sudah cukup menjadi cerita. Tulis apa yang berubah, lampirkan buktinya, dan naskahnya masuk antrean tinjauan.'
		};
	});

	onMount(async () => {
		if (!session.ready) await session.hydrate();
		await Promise.all([catalog.load(), editorial.load()]);
	});
</script>

<svelte:head>
	<title>Ruang Cerita — Pfriends</title>
</svelte:head>

<PageHeader
	eyebrow="Pilar 06 · Community Journalism"
	title="Ruang Cerita"
	subtitle="Tempat kontribusimu berubah menjadi bukti. Naskah yang lolos tinjauan tayang di ruang publik Pfriends dan menjadi bahan laporan ESG Pertamina Foundation."
/>

<div class="mt-5 flex flex-wrap items-center gap-3">
	<Button href={JALUR_KOMPOSER} iconPath={ICONS.edit}>Tulis cerita baru</Button>
	{#if perluRevisi.length > 0}
		<p class="min-w-0 text-[13px] leading-relaxed text-ink-600">
			<span class="font-semibold text-ink-800">{perluRevisi.length} naskah</span> menunggu perbaikanmu
			— verifikator sudah menuliskan apa yang perlu diubah.
		</p>
	{/if}
</div>

<div class="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
	<StatTile
		label="Naskah saya"
		value={naskahSaya.length}
		hint="Seluruh naskah yang pernah dikirim"
		iconPath={ICONS.book}
		color="var(--color-pertamina-navy)"
	/>
	<StatTile
		label="Dalam tinjauan"
		value={dalamTinjauan.length}
		hint="Menunggu keputusan verifikator"
		iconPath={ICONS.clock}
		color="var(--color-esg-g-ink)"
	/>
	<StatTile
		label="Disetujui"
		value={disetujui.length}
		hint="Lolos gerbang, menunggu penerbitan"
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
			title="Sesi awardee belum termuat"
			message="Masuk sebagai awardee Pfriends untuk melihat naskah yang pernah kamu kirim beserta status tinjauannya."
			actionLabel="Ke halaman Masuk"
			actionHref="/masuk"
		/>
	</div>
{:else if editorial.loading && naskahSaya.length === 0}
	<p class="mt-8 text-sm text-ink-600">Memuat naskahmu…</p>
{:else if tampil.length === 0}
	<div class="mt-6">
		<EmptyState
			iconPath={ICONS.book}
			title={pesanKosong.judul}
			message={pesanKosong.pesan}
			actionLabel={tabAktif === TAB_SEMUA ? 'Tulis cerita pertama' : 'Lihat semua naskah'}
			actionHref={tabAktif === TAB_SEMUA ? JALUR_KOMPOSER : ''}
			onAction={tabAktif === TAB_SEMUA ? undefined : () => (tabAktif = TAB_SEMUA)}
		/>
	</div>
{:else}
	<div class="mt-6 space-y-4">
		{#each tampil as cerita (cerita.id)}
			<StoryStatusCard story={cerita} reviseHref="{JALUR_KOMPOSER}?naskah={cerita.id}" />
		{/each}
	</div>
{/if}

<Card padding="md" class="mt-6">
	<p class="flex items-center gap-2 text-sm font-semibold text-ink-800">
		<Icon path={ICONS.info} size={16} />
		Bagaimana naskah dinilai
	</p>
	<p class="mt-1.5 text-[13px] leading-relaxed text-ink-600">
		Verifikator memeriksa kelengkapan bukti, kejelasan hasil, dan ketiadaan data pribadi orang lain.
		Naskah tidak pernah dinilai dari poin maupun tier penulisnya — kartu di halaman ini sengaja tidak
		menampilkan keduanya.
	</p>
</Card>
