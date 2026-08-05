<script>
	/**
	 * HALAMAN `/verifikator` — papan antrean dan beban SLA.
	 *
	 * Tanggung jawab: menjawab satu pertanyaan dalam satu layar — apa yang menunggu
	 * keputusan saya hari ini, dan mana yang sudah melewati tenggat.
	 *
	 * Lima keputusan yang tidak terbaca dari kode:
	 *
	 * 1. **Nol chart.** Larangan X-02 pada paket ini bukan soal selera: verifikator
	 *    memutuskan record, bukan membaca agregat. Grafik beban antrean milik dasbor
	 *    admin; di layar ini ia hanya menunda tindakan yang seharusnya diambil.
	 *    Yang tampil adalah cacah, usia, dan tautan langsung ke barisnya.
	 * 2. **Angka "lewat tenggat" dibaca dari store, bukan dihitung ulang di sini.**
	 *    `editorial.storyOverdueCount` dan `eventOverdueCount` memakai satu waktu
	 *    acuan yang sama untuk seluruh baris; menghitungnya lagi di halaman akan
	 *    menghasilkan angka yang sesekali berbeda dari daftar yang ditunjuknya.
	 * 3. **Batas SLA tiap antrean ditampilkan apa adanya dari `SLA_HARI_KERJA`**
	 *    lewat `ANTREAN_SLA`. Nol angka hari kerja tertulis di berkas ini.
	 * 4. **Tiga butir tertua ditampilkan di muka.** Papan yang hanya menampilkan
	 *    cacah menuntut satu klik lagi sebelum pekerjaan pertama terlihat, dan
	 *    baris tertua justru yang paling dekat melewati tenggat.
	 * 5. **Panel agenda memakai `EventListPanel` yang sama dengan empat tempat
	 *    lain.** Ini pemakaian kelima (`docs/10` §6.5); membuat kembarannya untuk
	 *    zona ini adalah pelanggaran KP-3.
	 *
	 * @see docs/10-REVISION-SPEC.md — US-R25 papan SLA & beban antrean, §6.4 route zona verifikator
	 * @see docs/12-BUILD-CONTRACT-V2.md — §3.5 WP-06 butir 4
	 */
	import { EmptyState, EventListPanel, Icon, PageHeader, ICONS, eventCardVM } from '$lib/components';
	import { catalog } from '$lib/stores/catalog.svelte.js';
	import { editorial } from '$lib/stores/editorial.svelte.js';
	import { session } from '$lib/stores/session.svelte.js';
	import { ANTREAN_SLA, QueueRow, nomorAntrean, slaAntrean } from './_components/index.js';

	/** Banyaknya butir tertua yang ditampilkan sebagai pratinjau tiap antrean. */
	const PRATINJAU = 3;

	/** Banyaknya agenda terdekat pada panel kalender. */
	const AGENDA_TERDEKAT = 5;

	/**
	 * Waktu acuan seluruh perhitungan usia di halaman ini.
	 *
	 * Satu nilai untuk seluruh baris, dan sengaja tidak reaktif: dua kartu yang
	 * menghitung "sudah berapa hari" dari dua `new Date()` berbeda akan sesekali
	 * menampilkan angka berbeda untuk baris yang sama.
	 * @type {Date}
	 */
	const sekarang = new Date();

	/** Tiga naskah paling lama menunggu. */
	const naskahTertua = $derived(editorial.storyQueue.slice(0, PRATINJAU));

	/** Tiga usulan kegiatan paling lama menunggu. */
	const usulanTertua = $derived(editorial.eventQueue.slice(0, PRATINJAU));

	/** Agenda terdekat yang sudah terbit ke kalender publik. */
	const agenda = $derived(catalog.upcomingEvents(sekarang, AGENDA_TERDEKAT).map(eventCardVM));

	/**
	 * Tiga ringkasan beban. Nol angka poin, nol tier, nol peringkat — yang dihitung
	 * hanyalah pekerjaan yang menunggu keputusan.
	 */
	const ringkasan = $derived([
		{
			id: 'cerita',
			label: 'Naskah menunggu keputusan',
			nilai: editorial.storyQueue.length,
			lewat: editorial.storyOverdueCount,
			href: '/verifikator/cerita',
			iconPath: ICONS.book
		},
		{
			id: 'kegiatan',
			label: 'Usulan kegiatan menunggu',
			nilai: editorial.eventQueue.length,
			lewat: editorial.eventOverdueCount,
			href: '/verifikator/kegiatan',
			iconPath: ICONS.calendar
		},
		{
			id: 'bukti',
			label: 'Total butir di kedua antrean',
			nilai: editorial.reviewQueueCount,
			lewat: editorial.storyOverdueCount + editorial.eventOverdueCount,
			href: '/verifikator/bukti',
			iconPath: ICONS.camera
		}
	]);
</script>

<PageHeader
	eyebrow="Ruang kerja verifikator"
	title="Papan antrean"
	subtitle="Selamat datang, {session.displayName}. Antrean disusun tertua lebih dahulu — baris teratas adalah yang paling dekat melewati tenggat."
/>

{#if editorial.error}
	<p class="card mt-5 p-4 text-sm leading-relaxed text-danger" role="alert">
		{editorial.error}
	</p>
{/if}

<section class="mt-5 grid gap-4 sm:grid-cols-3" aria-label="Beban antrean">
	{#each ringkasan as kartu (kartu.id)}
		<a href={kartu.href} class="card card-hover p-4">
			<span class="flex items-center gap-2 text-ink-600">
				<Icon path={kartu.iconPath} size={16} />
				<span class="label-micro">{kartu.label}</span>
			</span>
			<span class="numeric mt-2 block text-3xl leading-none text-ink-900">{kartu.nilai}</span>
			<span
				class="mt-2 block text-xs leading-relaxed {kartu.lewat > 0
					? 'font-semibold text-pertamina-red-ink'
					: 'text-ink-600'}"
			>
				{kartu.lewat > 0
					? `${kartu.lewat} di antaranya sudah lewat tenggat`
					: 'Seluruhnya masih dalam tenggat'}
			</span>
		</a>
	{/each}
</section>

<section class="mt-8" aria-labelledby="judul-sla">
	<h2 id="judul-sla" class="text-lg font-bold text-heading">Tenggat tiap antrean</h2>
	<p class="mt-1 text-sm leading-relaxed text-ink-600">
		Batas di bawah dihitung dalam hari kerja dan berasal dari satu sumber di domain. Sabtu dan Minggu
		tidak dihitung; hari libur nasional belum dikenal sistem ini.
	</p>

	<ul class="mt-4 grid gap-3 sm:grid-cols-2">
		{#each ANTREAN_SLA as antrean (antrean.key)}
			<li class="card p-4">
				<p class="text-sm font-semibold text-ink-800">{antrean.label}</p>
				<p class="mt-1 text-xs leading-relaxed text-ink-600">{antrean.deskripsi}</p>
				<p class="numeric mt-2 text-sm font-bold text-ink-900">
					Batas {antrean.limit} hari kerja
				</p>
			</li>
		{/each}
	</ul>
</section>

<!--
	`min-w-0` pada butir grid: tanpanya, satu judul naskah panjang menaikkan
	`min-content` kolom dan halaman ikut menggulir mendatar di 375 px.
-->
<div class="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
	<div class="min-w-0 space-y-8">
		<section aria-labelledby="judul-naskah">
			<div class="flex items-baseline justify-between gap-3">
				<h2 id="judul-naskah" class="text-lg font-bold text-heading">Naskah paling lama menunggu</h2>
				<a class="text-sm font-semibold text-pertamina-red-ink hover:underline" href="/verifikator/cerita">
					Buka antrean cerita
				</a>
			</div>

			{#if naskahTertua.length === 0}
				<div class="mt-3">
					<EmptyState
						title="Antrean cerita kosong"
						message="Tidak ada naskah yang menunggu keputusan. Naskah baru akan muncul di sini begitu penulis mengirimkannya."
						iconPath={ICONS.inbox}
						size="sm"
					/>
				</div>
			{:else}
				<ul class="mt-3 space-y-3">
					{#each naskahTertua as naskah, indeks (naskah.id)}
						<li>
							<QueueRow
								position={nomorAntrean(indeks)}
								title={naskah.title}
								subtitle="Ditulis {naskah.authorName}"
								statusLabel={naskah.statusMeta.label}
								statusColor={naskah.statusMeta.badgeColor}
								sla={slaAntrean(naskah, sekarang)}
								href="/verifikator/cerita/{naskah.id}"
							/>
						</li>
					{/each}
				</ul>
			{/if}
		</section>

		<section aria-labelledby="judul-usulan">
			<div class="flex items-baseline justify-between gap-3">
				<h2 id="judul-usulan" class="text-lg font-bold text-heading">Usulan kegiatan tertua</h2>
				<a
					class="text-sm font-semibold text-pertamina-red-ink hover:underline"
					href="/verifikator/kegiatan"
				>
					Buka antrean kegiatan
				</a>
			</div>

			{#if usulanTertua.length === 0}
				<div class="mt-3">
					<EmptyState
						title="Tidak ada usulan kegiatan"
						message="Usulan dari awardee maupun sesama verifikator akan tampil di sini."
						iconPath={ICONS.calendar}
						size="sm"
					/>
				</div>
			{:else}
				<ul class="mt-3 space-y-3">
					{#each usulanTertua as usulan, indeks (usulan.id)}
						<li>
							<QueueRow
								position={nomorAntrean(indeks)}
								title={usulan.title}
								subtitle={usulan.typeMeta.label}
								statusLabel={usulan.statusMeta.label}
								statusColor={usulan.statusMeta.badgeColor}
								sla={slaAntrean(usulan, sekarang)}
								href="/verifikator/kegiatan"
							/>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	</div>

	<aside class="min-w-0">
		<EventListPanel
			events={agenda}
			limit={AGENDA_TERDEKAT}
			title="Agenda terdekat"
			href="/kalender"
			variant="panel"
			emptyMessage="Belum ada agenda yang terbit ke kalender publik."
		/>
	</aside>
</div>
