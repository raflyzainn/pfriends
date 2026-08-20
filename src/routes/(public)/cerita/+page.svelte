<script>
	/**
	 * CERITA KOMUNITAS: indeks blog publik, dengan panel agenda di sisinya.
	 *
	 * Hanya cerita berstatus terpublikasi yang boleh muncul di sini, dan
	 * penyaringnya adalah `catalog.publishedStories`: bukan perbandingan status
	 * yang ditulis ulang di halaman ini. Aturan "apa yang boleh dibaca publik"
	 * hanya boleh hidup di satu tempat; menyalinnya ke komponen adalah cara
	 * tercepat membocorkan naskah yang belum disetujui penulisnya.
	 *
	 * EMPAT KEPUTUSAN YANG TIDAK TERBACA DARI KODE:
	 *
	 * 1. **Panel agenda ada di sisi halaman blog, dan tidak pernah disembunyikan.**
	 *    Kegiatan adalah alasan orang kembali ke microsite; menyembunyikannya di
	 *    lebar kecil berarti menghilangkan alasan itu justru pada perangkat yang
	 *    paling banyak dipakai anggota.
	 *
	 * 2. **Varian panel mengikuti lebar layar lewat `matchMedia`, bukan tiga
	 *    instance yang saling disembunyikan `hidden`.** Tiga instance berarti tiga
	 *    salinan daftar yang sama di DOM dan tiga kali pembacaan yang sama :
	 *    sekaligus tiga tempat yang harus diingat saat propsnya berubah.
	 *
	 * 3. **`EventListPanel` adalah komponen bersama, bukan salinan lokal.** Satu
	 *    komponen dipakai lima tempat (KP-3). Tautan "Lihat kalender penuh"
	 *    mengarah ke `/kalender` milik WP-08 dan boleh 404 selama G3-B.
	 *
	 * 4. **Sampul kartu diisi `kartuCerita().cover`.** Tanpa itu `StoryCard` selalu
	 *    jatuh ke fallback tipografis dan dua belas foto sampul tidak pernah tampil.
	 *
	 * @see docs/11-VISUAL-DIRECTION.md: §7.1 rancangan `/cerita`
	 * @see docs/12-BUILD-CONTRACT-V2.md: §3.5 WP-04
	 */
	import { FilterChips, Icon, ICONS, SearchInput, StoryCard } from '$lib/components';
	import EventListPanel from '$lib/components/EventListPanel.svelte';
	import { catalog } from '$lib/stores/catalog.svelte.js';
	import { publicContent } from '$lib/stores/publicContent.svelte.js';
	import { ESG_PILLARS } from '$lib/domain/constants/esg-taxonomy.js';
	import { frasaHitung } from '$lib/utils/format.js';
	import { agendaPublik, kartuCerita } from '../_view-model.js';

	/** Nilai filter yang berarti "tanpa penyaringan pilar". */
	const SEMUA = 'SEMUA';

	/** Banyaknya agenda pada panel, per titik henti tata letak. */
	const AGENDA_LIMIT = Object.freeze({ desktop: 4, tablet: 5, mobile: 3 });

	/** Varian `EventListPanel` per titik henti: lihat keputusan 2. */
	const AGENDA_VARIAN = Object.freeze({ desktop: 'rail', tablet: 'strip', mobile: 'panel' });

	let pilarTerpilih = $state(SEMUA);
	let kataKunci = $state('');

	/** Titik henti tata letak aktif; nilai awal aman untuk prerender tanpa viewport. */
	let titikHenti = $state('mobile');

	$effect(() => {
		if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
		const lebar = window.matchMedia('(min-width: 1024px)');
		const sedang = window.matchMedia('(min-width: 768px)');
		const sinkron = () => {
			titikHenti = lebar.matches ? 'desktop' : sedang.matches ? 'tablet' : 'mobile';
		};
		sinkron();
		lebar.addEventListener('change', sinkron);
		sedang.addEventListener('change', sinkron);
		return () => {
			lebar.removeEventListener('change', sinkron);
			sedang.removeEventListener('change', sinkron);
		};
	});

	const ceritaTerbit = $derived(publicContent.stories);
	const agenda = $derived(agendaPublik(catalog.upcomingEvents()));

	/** Pencocokan judul, ringkasan, lokasi, dan nama penulis: tanpa peka huruf. */
	const hasilSaring = $derived.by(() => {
		const kunci = kataKunci.trim().toLowerCase();
		return ceritaTerbit.filter((story) => {
			const cocokPilar = pilarTerpilih === SEMUA || story.pillars.includes(pilarTerpilih);
			if (!cocokPilar) return false;
			if (kunci === '') return true;
			return [story.title, story.summary, story.location, story.authorName]
				.join(' ')
				.toLowerCase()
				.includes(kunci);
		});
	});

	const opsiPilar = $derived([
		{ id: SEMUA, label: 'Semua', count: ceritaTerbit.length },
		...ESG_PILLARS.map((pilar) => ({
			id: pilar.pillar,
			label: pilar.label,
			count: ceritaTerbit.filter((story) => story.pillars.includes(pilar.pillar)).length
		}))
	]);

	/**
	 * Cerita unggulan hanya diangkat ketika daftar ditampilkan utuh. Menyorot satu
	 * cerita di atas hasil pencarian akan menggeser perhatian dari apa yang justru
	 * sedang dicari pembaca.
	 */
	const unggulan = $derived(
		pilarTerpilih === SEMUA && kataKunci.trim() === '' ? (hasilSaring[0] ?? null) : null
	);
	const sisaCerita = $derived(unggulan ? hasilSaring.slice(1) : hasilSaring);

	const sedangMenyaring = $derived(pilarTerpilih !== SEMUA || kataKunci.trim() !== '');

	function hapusSaringan() {
		pilarTerpilih = SEMUA;
		kataKunci = '';
	}
</script>

<svelte:head>
	<title>Cerita Komunitas: PFriends</title>
	<meta
		name="description"
		content="Cerita lapangan yang ditulis sendiri oleh anggota PFriends: aksi lingkungan, pemberdayaan ekonomi, dan edukasi masyarakat di berbagai daerah."
	/>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
	<!-- Kepala halaman lebar penuh, tanpa foto: sampul cerita yang menjadi gambarnya. -->
	<header style="padding-block:var(--rhythm-tight) 0;">
		<!-- Kicker menyebut "Blog": label yang dipakai bilah navigasi: supaya
		     pengunjung yang menekan menu itu langsung mengenali halaman tujuannya. -->
		<p class="kicker">Blog komunitas</p>
		<h1
			class="display-editorial mt-4 max-w-[18ch] text-[clamp(30px,3.2vw,44px)] leading-[1.06] text-heading"
		>
			Cerita dari lapangan
		</h1>
		<p class="mt-6 max-w-[60ch] text-[18px] leading-[1.55] text-ink-700">
			{#if ceritaTerbit.length > 0}
				{frasaHitung(ceritaTerbit.length, 'cerita')} sudah terbit. Semuanya ditulis anggota,
				ditinjau verifikator, lalu diterbitkan.
			{:else}
				Setiap naskah ditulis anggota, ditinjau verifikator, lalu diterbitkan. Ruang ini menunggu
				cerita pertamanya.
			{/if}
		</p>
	</header>

	<div
		class="grid grid-cols-1 gap-x-12 gap-y-14 lg:grid-cols-12"
		style="padding-block:var(--rhythm-snug);"
	>
		<!-- Kolom daftar cerita -->
		<div class="min-w-0 lg:col-span-8">
			{#if ceritaTerbit.length > 0}
				<div class="flex flex-col gap-4">
					<SearchInput
						bind:value={kataKunci}
						placeholder="Cari judul, daerah, atau nama penulis"
						label="Cari cerita komunitas"
					/>
					<FilterChips
						options={opsiPilar}
						bind:selected={pilarTerpilih}
						showClear={false}
						label="Saring berdasarkan pilar ESG"
					/>
				</div>

				<p class="mt-5 text-[14px] leading-[1.5] text-ink-600" aria-live="polite">
					Menampilkan {frasaHitung(hasilSaring.length, 'cerita')}
					{#if sedangMenyaring}
						dari {ceritaTerbit.length} yang terbit
					{/if}
				</p>
			{/if}

			{#if hasilSaring.length > 0}
				{#if unggulan}
					{@const kartu = kartuCerita(unggulan)}
					<div class="mt-10 border-b border-ink-200 pb-10">
						<StoryCard story={kartu} foto={kartu.cover} href={kartu.href} variant="feature" />
					</div>
				{/if}

				{#if sisaCerita.length > 0}
					<div class="mt-10 grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2">
						{#each sisaCerita as cerita (cerita.id)}
							{@const kartu = kartuCerita(cerita)}
							<StoryCard story={kartu} foto={kartu.cover} href={kartu.href} />
						{/each}
					</div>
				{/if}
			{:else if ceritaTerbit.length > 0}
				<div class="mt-10 border-t border-ink-200 pt-8">
					<h2 class="display-editorial text-[24px] leading-[1.20] text-heading">
						Tidak ada cerita untuk saringan ini
					</h2>
					<p class="mt-3 max-w-[52ch] text-[16px] leading-[1.68] text-ink-700">
						Kata kunci atau pilar yang dipilih belum punya cerita terbit. Hapus saringannya untuk
						melihat seluruh cerita komunitas.
					</p>
					<button
						type="button"
						class="mt-5 inline-flex min-h-11 items-center gap-2 text-[15px] font-semibold text-brand-700 underline-offset-4 hover:underline"
						onclick={hapusSaringan}
					>
						Tampilkan semua cerita
						<Icon path={ICONS.arrowLongRight} size={18} />
					</button>
				</div>
			{:else}
				<div class="mt-10 border-t border-ink-200 pt-8">
					<h2 class="display-editorial text-[24px] leading-[1.20] text-heading">
						Cerita pertama sedang disiapkan
					</h2>
					<p class="mt-3 max-w-[52ch] text-[16px] leading-[1.68] text-ink-700">
						Naskah baru melewati tinjauan verifikator lebih dulu, dan hanya tayang setelah
						penulisnya menyetujui. Daripada mengisi ruang ini dengan contoh, kami menunggu
						cerita yang benar-benar terjadi.
					</p>
					<a
						href="/masuk?next=/awardee/cerita/tulis"
						class="mt-5 inline-flex min-h-11 items-center gap-2 text-[15px] font-semibold text-brand-700 underline-offset-4 hover:underline"
					>
						Masuk dan tulis cerita pertama
						<Icon path={ICONS.arrowLongRight} size={18} />
					</a>
				</div>
			{/if}
		</div>

		<!-- Panel agenda: komponen yang sama dengan beranda dan halaman artikel. -->
		<aside class="min-w-0 lg:col-span-4 lg:sticky lg:top-24 lg:self-start">
			<EventListPanel
				events={agenda}
				limit={AGENDA_LIMIT[titikHenti]}
				variant={AGENDA_VARIAN[titikHenti]}
				title="Kalender komunitas"
				href="/kalender"
				emptyMessage="Belum ada kegiatan terjadwal. Agenda baru diumumkan tiap awal bulan."
			/>

			<div class="mt-10 border-t border-ink-200 pt-6">
				<p class="text-[16px] leading-[1.68] text-ink-700">Punya cerita dari lapangan?</p>
				<a
					href="/masuk?next=/awardee/cerita/tulis"
					class="mt-3 inline-flex min-h-11 items-center gap-2 text-[15px] font-semibold text-brand-700 underline-offset-4 hover:underline"
				>
					Masuk untuk menulis
					<Icon path={ICONS.arrowLongRight} size={18} />
				</a>
			</div>
		</aside>
	</div>
</div>
