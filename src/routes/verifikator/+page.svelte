<script>
	/**
	 * HALAMAN `/verifikator`: dasbor performa awardee dan dampaknya.
	 *
	 * Tanggung jawab: menjawab satu pertanyaan dalam satu layar: seberapa hidup
	 * para awardee bulan ini, dan apa yang masih menunggu keputusan saya.
	 *
	 * Lima keputusan yang tidak terbaca dari kode:
	 *
	 * 1. **Dasbor ini SENGAJA berbeda fokus dari dasbor Admin.** Admin membaca
	 *    performa sistem dan aplikasi; verifikator membaca performa ORANG :
	 *    postingan, poin, KPI, dan capaian awardee. Dua dasbor yang menampilkan
	 *    deret yang sama hanya membuat satu di antaranya tidak pernah dibuka.
	 * 2. **Papan peringkat "Peserta Paling Aktif" hadir atas permintaan pemilik
	 *    produk,** dan itu mencabut larangan lama yang menjauhkan mekanik skor dari
	 *    zona ini. Yang ditampilkan tetap terbatas: poin dan peringkat awardee :
	 *    bukan poin verifikator, yang memang tidak dinilai dengan angka.
	 * 3. **Angka performa datang dari `dasbor-data.js`, angka antrean dari store.**
	 *    Pemisahan itu disengaja: deret performa adalah data contoh untuk mockup,
	 *    sedangkan cacah antrean adalah pekerjaan sungguhan yang tautannya harus
	 *    membawa ke daftar yang isinya persis sama. Mencampur keduanya membuat
	 *    lencana antrean berbohong pada halaman yang ditunjuknya.
	 * 4. **Papan peringkat memakai nama sungguhan bila katalog sudah termuat.**
	 *    `PESERTA_TERAKTIF` hanyalah cadangan agar papan tidak pernah kosong saat
	 *    demo: dan cadangan itu ditandai terbuka di kaki panel, bukan disamarkan.
	 * 5. **Profil ditaruh sebagai panel di dasbor, bukan sebagai butir navigasi.**
	 *    Profil melekat pada akun dan perannya; satu tujuan navigasi tersendiri
	 *    untuk membaca lima baris identitas menambah satu ketukan tanpa menambah
	 *    satu pun informasi.
	 *
	 * @see docs/10-REVISION-SPEC.md: §6.4 route zona verifikator
	 */
	import { DummyBadge, EmptyState, Icon, LeaderboardRow, PageHeader, StatTile, ICONS } from '$lib/components';
	import VerifAwardeePerforma from '$lib/charts/VerifAwardeePerforma.svelte';
	import VerifKpiAwardeeBar from '$lib/charts/VerifKpiAwardeeBar.svelte';
	import VerifSebaranChapter from '$lib/charts/VerifSebaranChapter.svelte';
	import { CHAPTERS } from '$lib/domain/constants/community.js';
	import { AccessPolicy } from '$lib/domain/policies/AccessPolicy.js';
	import { catalog } from '$lib/stores/catalog.svelte.js';
	import { editorial } from '$lib/stores/editorial.svelte.js';
	import { session } from '$lib/stores/session.svelte.js';
	import { verifierDashboardStore } from '$lib/stores/verifier-dashboard.svelte.js';
	import { formatAngka } from '$lib/utils/format.js';
	import { SlaBadge, slaAntrean } from './_components/index.js';
	import {
		AMBANG_KPI,
		AWARDEE_AKTIF,
		AWARDEE_TERDAFTAR,
		BARIS_PAPAN,
		BULAN,
		KPI_AWARDEE,
		LAJU_PENINJAUAN,
		PESERTA_TERAKTIF,
		POIN_BULANAN,
		POSTINGAN_TERBIT,
		SEBARAN_CHAPTER,
		jumlah,
		kpiTercapai,
		trenTerakhir
	} from './_components/dasbor-data.js';

	/** Banyaknya butir tertua yang ditampilkan sebagai pratinjau tiap antrean. */
	const PRATINJAU = 3;

	/**
	 * Waktu acuan seluruh perhitungan usia di halaman ini.
	 *
	 * Satu nilai untuk seluruh baris, dan sengaja tidak reaktif: dua kartu yang
	 * menghitung "sudah berapa hari" dari dua `new Date()` berbeda akan sesekali
	 * menampilkan angka berbeda untuk baris yang sama.
	 * @type {Date}
	 */
	const sekarang = new Date();
	let dashboardLoaded = false;
	$effect(() => {
		if (dashboardLoaded) return;
		dashboardLoaded = true;
		void verifierDashboardStore.load();
	});

	/**
	 * Peta id chapter ke sebutan pendeknya.
	 *
	 * Awalan "Chapter " dipangkas karena baris papan peringkat sudah berada di
	 * bawah judul yang menyebut konteksnya; mengulanginya delapan kali hanya
	 * memakan lebar yang seharusnya menjadi milik nama orangnya.
	 * @type {Map<string, string>}
	 */
	const LABEL_CHAPTER = new Map(CHAPTERS.map((c) => [c.id, c.label.replace(/^Chapter\s+/i, '')]));

	const totalPostingan = jumlah(POSTINGAN_TERBIT);
	const totalPoin = $derived(verifierDashboardStore.data?.totalPoints ?? 0);
	const awardeeAktif = $derived(verifierDashboardStore.data?.activeAwardees ?? 0);
	const awardeeTerdaftar = $derived(verifierDashboardStore.data?.registeredAwardees ?? 0);
	const persenAktif = $derived(awardeeTerdaftar > 0 ? Math.round((awardeeAktif / awardeeTerdaftar) * 100) : 0);
	const poinBulananBackend = $derived(verifierDashboardStore.data?.monthly?.map((item) => item.points) ?? BULAN.map(() => 0));
	const labelBulanBackend = $derived(verifierDashboardStore.data?.monthly?.map((item) => item.label) ?? [...BULAN]);
	const sebaranBackend = $derived(verifierDashboardStore.data?.chapter ?? []);

	/** Empat angka kunci performa awardee: bukan performa sistem. */
	const angkaKunci = $derived([
		{
			id: 'postingan',
			label: 'Postingan blog terbit',
			value: totalPostingan,
			hint: `${POSTINGAN_TERBIT[POSTINGAN_TERBIT.length - 1]} terbit bulan berjalan`,
			trend: trenTerakhir(POSTINGAN_TERBIT),
			iconPath: ICONS.book,
			color: 'var(--color-brand-600)'
		},
		{
			id: 'poin',
			label: 'Poin kontribusi awardee',
			value: totalPoin,
			hint: 'Terkumpul sepanjang delapan bulan program',
			trend: trenTerakhir(POIN_BULANAN),
			iconPath: ICONS.coin,
			color: 'var(--color-accent-700)'
		},
		{
			id: 'aktif',
			label: 'Awardee aktif',
			value: awardeeAktif,
			hint: `${persenAktif}% dari ${formatAngka(awardeeTerdaftar)} awardee terdaftar`,
			trend: null,
			iconPath: ICONS.users,
			color: 'var(--color-brand-700)'
		},
		{
			id: 'kpi',
			label: 'KPI awardee tercapai',
			value: `${kpiTercapai()} dari ${KPI_AWARDEE.length}`,
			hint: `Ambang capaian ${AMBANG_KPI}% per indikator`,
			trend: null,
			iconPath: ICONS.trophy,
			color: 'var(--color-brand-600)'
		}
	]);

	/**
	 * Papan peringkat peserta paling aktif.
	 *
	 * Awardee yang memilih anonim tetap dihitung poinnya tetapi tidak dinamai :
	 * pilihan itu dibuat di zona awardee dan tidak boleh terbatalkan oleh dasbor
	 * yang kebetulan berada di zona lain.
	 */
	const papanPeringkat = $derived.by(() => {
		const rows = verifierDashboardStore.data?.leaderboard ?? [];
		return { baris: rows.map((row) => ({ ...row, delta: null })), contoh: false };
	});

	/** Tiga naskah paling lama menunggu keputusan. */
	const naskahTertua = $derived(editorial.storyQueue.slice(0, PRATINJAU));

	/** Tiga usulan kegiatan paling lama menunggu keputusan. */
	const usulanTertua = $derived(editorial.eventQueue.slice(0, PRATINJAU));

	/** Dua antrean kerja verifikator, beserta tautan ke halaman yang mengerjakannya. */
	const antrean = $derived([
		{
			id: 'cerita',
			label: 'Submission Blog',
			deskripsi: 'Naskah awardee yang menunggu ditinjau, disetujui, atau dikembalikan.',
			jumlah: editorial.storyQueue.length,
			lewat: editorial.storyOverdueCount,
			href: '/verifikator/cerita',
			iconPath: ICONS.book,
			butir: naskahTertua.map((naskah) => ({
				id: naskah.id,
				title: naskah.title,
				meta: naskah.authorName,
				href: `/verifikator/cerita/${naskah.id}`,
				sla: slaAntrean(naskah, sekarang)
			})),
			kosong: 'Tidak ada naskah yang menunggu keputusan.'
		},
		{
			id: 'kegiatan',
			label: 'Konfigurasi Calendar of Event',
			deskripsi: 'Usulan kegiatan yang menunggu disetujui sebelum tayang di kalender.',
			jumlah: editorial.eventQueue.length,
			lewat: editorial.eventOverdueCount,
			href: '/verifikator/kegiatan',
			iconPath: ICONS.calendar,
			butir: usulanTertua.map((usulan) => ({
				id: usulan.id,
				title: usulan.title,
				meta: usulan.typeMeta.label,
				href: '/verifikator/kegiatan',
				sla: slaAntrean(usulan, sekarang)
			})),
			kosong: 'Tidak ada usulan kegiatan yang menunggu.'
		}
	]);

	const akun = $derived(session.account);

	/** Rekam kerja akun ini, dibaca dari jejak keputusan pada entity. */
	const rekamKerja = $derived.by(() => {
		const idAkun = session.accountId;
		if (!idAkun) return { naskah: 0, kegiatan: 0, usulan: 0 };
		return {
			naskah: catalog.stories.filter(
				(story) => story.reviewerId === idAkun || story.publishedById === idAkun
			).length,
			kegiatan: catalog.events.filter((event) => event.reviewedBy === idAkun).length,
			usulan: editorial.myEvents.length
		};
	});
</script>

<PageHeader
	eyebrow="Ruang kerja verifikator"
	title="Performa awardee & dampaknya"
	subtitle="Selamat datang, {session.displayName}. Layar ini membaca capaian para awardee: bukan performa aplikasi: lalu menutupnya dengan pekerjaan yang masih menunggu keputusan Anda."
/>

{#if editorial.error}
	<p class="card mt-5 p-4 text-sm leading-relaxed text-danger" role="alert">
		{editorial.error}
	</p>
{/if}

<!-- BLOK 1: angka kunci performa awardee. -->
<section class="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Angka kunci performa awardee">
	{#each angkaKunci as kartu (kartu.id)}
		<div class="relative">
			{#if kartu.id === 'postingan' || kartu.id === 'kpi'}<span class="absolute top-3 right-3 z-10"><DummyBadge /></span>{/if}
			<StatTile label={kartu.label} value={kartu.value} hint={kartu.hint} trend={kartu.trend} iconPath={kartu.iconPath} color={kartu.color} />
		</div>
	{/each}
</section>

<!--
	BLOK 2: dua chart yang menjawab dua pertanyaan berbeda.
	`min-w-0` pada butir grid wajib: canvas ECharts tidak menyusut sendiri, dan
	tanpanya halaman menggulir mendatar di lebar 375 px.
-->
<div class="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
	<section class="card min-w-0 p-5" aria-labelledby="judul-produktivitas">
		<h2 id="judul-produktivitas" class="text-base font-bold text-heading">
			Produktivitas dan poin awardee
		</h2>
		<p class="mt-1 mb-3 text-sm leading-relaxed text-ink-600">
			Apakah jumlah cerita yang benar-benar terbit tumbuh bersama poin yang diperoleh awardee?
		</p>
		<p class="mb-3 flex items-center gap-2 text-xs text-ink-600"><DummyBadge title="Seri Postingan masih memakai data contoh." /> Seri Postingan belum backend; seri Poin sudah berasal dari PocketBase.</p>
		<VerifAwardeePerforma
			labels={labelBulanBackend}
			postingan={[...POSTINGAN_TERBIT]}
			poin={poinBulananBackend}
			height="300px"
		/>
	</section>

	<section class="card min-w-0 p-5" aria-labelledby="judul-kpi">
		<div class="flex items-center gap-2"><h2 id="judul-kpi" class="text-base font-bold text-heading">Capaian KPI awardee</h2><DummyBadge /></div>
		<p class="mt-1 mb-3 text-sm leading-relaxed text-ink-600">
			Indikator mana yang sudah melewati ambang {AMBANG_KPI}%, dan mana yang masih tertinggal?
		</p>
		<VerifKpiAwardeeBar data={[...KPI_AWARDEE]} target={AMBANG_KPI} height="300px" />
	</section>
</div>

<!-- BLOK 3: papan peringkat peserta paling aktif, berdampingan dengan asal kontribusinya. -->
<div class="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
	<section class="card min-w-0 p-5" aria-labelledby="judul-papan">
		<div class="flex flex-wrap items-baseline justify-between gap-2">
			<h2 id="judul-papan" class="text-base font-bold text-heading">Peserta paling aktif</h2>
			<span class="label-micro">Diurut poin kontribusi</span>
		</div>
		<p class="mt-1 text-sm leading-relaxed text-ink-600">
			Delapan awardee dengan perolehan poin tertinggi. Mereka layak diprioritaskan sebagai narasumber
			dan mentor bagi chapter yang lebih sepi.
		</p>

		{#if papanPeringkat.baris.length === 0}
			<div class="mt-4">
				<EmptyState
					title="Papan peringkat belum terisi"
					message="Peringkat muncul setelah awardee pertama mengumpulkan poin kontribusi."
					iconPath={ICONS.trophy}
					size="sm"
				/>
			</div>
		{:else}
			<ul class="mt-4 border-t border-ink-100">
				{#each papanPeringkat.baris as peserta (peserta.id)}
					<li>
						<LeaderboardRow
							rank={peserta.rank}
							awardee={{
								id: peserta.id,
								name: peserta.name,
								community: peserta.community,
								chapter: peserta.chapter
							}}
							points={peserta.points}
							delta={peserta.delta}
							variant="full"
						/>
					</li>
				{/each}
			</ul>

		{/if}
	</section>

	<section class="card min-w-0 p-5" aria-labelledby="judul-sebaran">
		<h2 id="judul-sebaran" class="text-base font-bold text-heading">Asal kontribusi</h2>
		<p class="mt-1 mb-3 text-sm leading-relaxed text-ink-600">
			Chapter dan komunitas mana yang paling hidup: dan mana yang perlu didekati.
		</p>
		<VerifSebaranChapter data={sebaranBackend} height="230px" />
	</section>
</div>

<!-- BLOK 4: pekerjaan yang menunggu keputusan, dengan tautan ke halaman yang mengerjakannya. -->
<section class="mt-8" aria-labelledby="judul-antrean">
	<div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
		<h2 id="judul-antrean" class="text-lg font-bold text-heading">Menunggu keputusan Anda</h2>
		<p class="text-xs text-ink-600">
			<DummyBadge title="Metrik laju peninjauan ini masih berupa data contoh." />
			Laju peninjauan
			<span class="numeric font-semibold text-ink-800">
				{LAJU_PENINJAUAN.keputusanPekanIni} keputusan
			</span>
			pekan ini · waktu tanggap rata-rata
			<span class="numeric font-semibold text-ink-800">
				{LAJU_PENINJAUAN.waktuTanggapHari} hari kerja
			</span>
			· {LAJU_PENINJAUAN.submissionLangsungSetuju}% submission lolos tanpa revisi
		</p>
	</div>

	<div class="mt-4 grid gap-5 sm:grid-cols-2">
		{#each antrean as kotak (kotak.id)}
			<div class="card min-w-0 p-5">
				{#if kotak.id === 'kegiatan'}<div class="mb-2"><DummyBadge title="Antrean kegiatan masih memakai penyimpanan lokal." /></div>{/if}
				<div class="flex items-start gap-3">
					<span
						class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-pertamina-navy-tint text-pertamina-navy"
						aria-hidden="true"
					>
						<Icon path={kotak.iconPath} size={18} />
					</span>
					<div class="min-w-0 flex-1">
						<h3 class="text-base font-bold text-heading">{kotak.label}</h3>
						<p class="mt-0.5 text-xs leading-relaxed text-ink-600">{kotak.deskripsi}</p>
					</div>
					<span class="numeric shrink-0 text-2xl leading-none font-bold text-ink-900">
						{kotak.jumlah}
					</span>
				</div>

				<p
					class="mt-3 text-xs leading-relaxed {kotak.lewat > 0
						? 'font-semibold text-pertamina-red-ink'
						: 'text-ink-600'}"
				>
					{kotak.lewat > 0
						? `${kotak.lewat} di antaranya sudah lewat tenggat`
						: 'Seluruhnya masih dalam tenggat'}
				</p>

				{#if kotak.butir.length === 0}
					<p class="mt-3 border-t border-ink-100 pt-3 text-sm leading-relaxed text-ink-600">
						{kotak.kosong}
					</p>
				{:else}
					<ul class="mt-3 border-t border-ink-100">
						{#each kotak.butir as butir (butir.id)}
							<li class="border-b border-ink-100 py-2.5 last:border-0">
								<a class="group block min-w-0" href={butir.href}>
									<span
										class="block truncate text-sm font-semibold text-ink-800 group-hover:text-pertamina-navy group-hover:underline"
									>
										{butir.title}
									</span>
									<span class="mt-1 flex flex-wrap items-center gap-2">
										<span class="text-xs text-ink-600">{butir.meta}</span>
										<SlaBadge sla={butir.sla} size="sm" />
									</span>
								</a>
							</li>
						{/each}
					</ul>
				{/if}

				<a
					class="mt-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-pertamina-navy hover:underline"
					href={kotak.href}
				>
					Buka {kotak.label}
					<Icon path={ICONS.arrowRight} size={16} />
				</a>
			</div>
		{/each}
	</div>
</section>

<!-- BLOK 5: profil ringkas; menggantikan halaman profil yang dicabut dari navigasi. -->
<section class="card mt-8 p-5" aria-labelledby="judul-profil">
	<div class="flex items-center gap-2"><h2 id="judul-profil" class="text-base font-bold text-heading">Profil & rekam kerja Anda</h2><DummyBadge title="Rekam keputusan kegiatan masih memakai penyimpanan lokal." /></div>
	<p class="mt-1 text-sm leading-relaxed text-ink-600">
		Profil melekat pada akun dan perannya, sehingga tidak lagi menjadi tujuan navigasi tersendiri.
	</p>

	<div class="mt-4 grid gap-5 border-t border-ink-100 pt-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
		<div class="flex min-w-0 items-center gap-3">
			<span
				class="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-chip bg-pertamina-navy-tint text-sm font-bold text-pertamina-navy"
				aria-hidden="true"
			>
				{akun?.initials ?? 'PF'}
			</span>
			<div class="min-w-0">
				<p class="truncate text-base font-bold text-heading">{session.displayName}</p>
				<p class="truncate text-sm text-ink-600">{akun?.email ?? ':'}</p>
				<p class="label-micro mt-0.5">
					{session.roleLabel}{akun?.unit ? ` · ${akun.unit}` : ''}
				</p>
			</div>
		</div>

		<dl class="grid min-w-0 grid-cols-3 gap-3">
			<div class="rounded-control bg-canvas p-3">
				<dt class="label-micro">Naskah diputuskan</dt>
				<dd class="numeric mt-1 text-xl leading-none font-bold text-ink-900">{rekamKerja.naskah}</dd>
			</div>
			<div class="rounded-control bg-canvas p-3">
				<dt class="label-micro">Kegiatan diputuskan</dt>
				<dd class="numeric mt-1 text-xl leading-none font-bold text-ink-900">
					{rekamKerja.kegiatan}
				</dd>
			</div>
			<div class="rounded-control bg-canvas p-3">
				<dt class="label-micro">Usulan Anda</dt>
				<dd class="numeric mt-1 text-xl leading-none font-bold text-ink-900">{rekamKerja.usulan}</dd>
			</div>
		</dl>
	</div>

	<p class="mt-4 text-xs leading-relaxed text-ink-600">
		Verifikator dinilai pada mutu keputusan, bukan pada perolehan angka: karena itu tidak ada poin,
		tier, maupun peringkat untuk akun Anda sendiri. Poin pada papan di atas adalah milik awardee.
		{#if !AccessPolicy.canProposeEvent(session.role)}
			Peran Anda tidak berwenang mengusulkan kegiatan.
		{/if}
	</p>
</section>
