<script>
	/**
	 * HALAMAN `/verifikator/kegiatan` — Konfigurasi Calendar of Event.
	 *
	 * Tanggung jawab: menjadi satu tempat verifikator MENGATUR kalender komunitas —
	 * memutuskan usulan yang menunggu, menambah event baru, menyunting detail event
	 * yang sudah terjadwal, dan melihat bentuk kalender yang dihasilkannya.
	 *
	 * Delapan keputusan yang tidak terbaca dari kode:
	 *
	 * 1. **Usulan yang diajukan verifikator yang sedang masuk TIDAK dapat ia
	 *    setujui atau tolak sendiri.** Tombolnya nonaktif beserta alasan tertulis,
	 *    dan `ContentReviewService.approveEvent` tetap menolaknya bila permintaan
	 *    dipaksakan lewat konsol peramban — penjagaan yang sesungguhnya hidup di
	 *    domain, sedangkan halaman ini bertugas MENJELASKANNYA. Kegagalan yang
	 *    senyap membuat verifikator menekan tombol yang sama berulang kali.
	 * 2. **Formulir berada di halaman yang sama dengan antreannya.** Justru karena
	 *    verifikator boleh menambah event, konflik kepentingan pada butir 1 bukan
	 *    kasus tepi teoretis: event yang baru saja ia kirim langsung muncul di
	 *    antrean di bawahnya dengan tombol keputusan nonaktif.
	 * 3. **SATU formulir melayani "tambah" dan "sunting".** Dua formulir kembar
	 *    untuk satu bentuk data adalah dua tempat yang harus diingat ketika sebuah
	 *    field ditambahkan — dan yang kedua selalu yang terlupa.
	 * 4. **"Tambah" dan "sunting" menempuh jalur tulis yang BERBEDA, dan itu
	 *    disengaja.** Event baru lahir sebagai USULAN lewat
	 *    `editorial.proposeEvent()` sehingga tetap menempuh persetujuan; penyuntingan
	 *    hanya menyentuh detail deskriptif lewat `simpanPerubahanEvent()` dan tidak
	 *    pernah menyentuh `status`. Verifikator memperbaiki salah ketik tanpa
	 *    memperoleh pintu belakang menuju "terjadwal".
	 * 5. **Kalender hanya menampilkan event yang benar-benar punya tempat di
	 *    kalender** — terjadwal, berlangsung, dan selesai. Usulan mentah sengaja
	 *    tidak ikut: penanda tanggal yang tidak dapat membedakan "sudah pasti" dari
	 *    "masih diusulkan" akan membuat orang menjadwalkan diri pada acara yang
	 *    mungkin ditolak besok.
	 * 6. **Tombol keputusan dirender dari `allowedEventTransitions(status, role)`,**
	 *    termasuk pada agenda yang sudah terjadwal. Transisi sah yang belum punya
	 *    jalur eksekusi di konsol ini tampil nonaktif beserta alasannya, bukan
	 *    dihapus diam-diam.
	 * 7. **Penolakan usulan wajib disertai alasan.** Pengusul membacanya di
	 *    `/awardee/kalender`; penolakan tanpa alasan memindahkan pertanyaan ke kanal
	 *    yang tidak tercatat.
	 * 8. **Pembatalan agenda disambungkan DI HALAMAN INI, bukan di registri
	 *    keputusan.** `EVENT_DECISIONS` menandai transisi itu `jalankan: null` karena
	 *    kontrak store belum memuat jalurnya saat registri ditulis; kini store
	 *    memuatnya, dan halaman ini memasangkannya lewat `lengkapiKeputusan()`.
	 *    Registri tidak disunting dari sini — pemiliknya paket lain.
	 *
	 * @see docs/10-REVISION-SPEC.md — US-R24 antrean usulan kegiatan, §5.5 konflik kepentingan
	 * @see docs/12-BUILD-CONTRACT-V2.md — §3.5 WP-06 butir 3 dan 6
	 */
	import {
		Button,
		EmptyState,
		Icon,
		MonthCalendar,
		PageHeader,
		StatusBadge,
		ICONS,
		eventCardVM
	} from '$lib/components';
	import { EventStatus, EVENT_TYPE_META } from '$lib/domain/entities/CommunityEvent.js';
	import { AccessPolicy } from '$lib/domain/policies/AccessPolicy.js';
	import { catalog } from '$lib/stores/catalog.svelte.js';
	import { editorial } from '$lib/stores/editorial.svelte.js';
	import { session } from '$lib/stores/session.svelte.js';
	import { toast } from '$lib/stores/toast.svelte.js';
	import { activitySubmissions, SUBMISSION_STATUS_META } from '$lib/stores/activity-submissions.svelte.js';
	import { formatRentangTanggal, formatTanggal } from '$lib/utils/format.js';
	import {
		DecisionBar,
		DecisionDialog,
		PESAN_KONFLIK_KEGIATAN,
		QueueRow,
		formulirDariEvent,
		formulirKosong,
		keputusanKegiatan,
		nomorAntrean,
		periksaFormulirEvent,
		simpanPerubahanEvent,
		slaAntrean
	} from '../_components/index.js';

	/** Waktu acuan seluruh perhitungan usia di halaman ini. */
	const sekarang = new Date();

	/** Status yang benar-benar punya tempat di kalender. Lihat keputusan 5. */
	const STATUS_DI_KALENDER = Object.freeze([
		EventStatus.TERJADWAL,
		EventStatus.BERLANGSUNG,
		EventStatus.SELESAI
	]);

	/**
	 * Memasang jalur eksekusi pembatalan pada daftar keputusan yang datang dari peta
	 * transisi domain. Isian wajibnya tidak diubah: `input: DecisionInput.NOTE` dari
	 * registri tetap berlaku, sehingga `DecisionDialog` menuntut alasan pembatalan
	 * dan `ContentReviewService.cancelEvent` menolaknya sekali lagi bila kosong.
	 *
	 * @param {import('../_components/decisions.js').Decision[]} daftar
	 * @returns {import('../_components/decisions.js').Decision[]}
	 */
	function lengkapiKeputusan(daftar) {
		return daftar.map((entri) =>
			entri.to === EventStatus.DIBATALKAN
				? {
						...entri,
						jalankan: (event, payload) => editorial.cancelEvent(event, payload.note ?? ''),
						alasanTidakTersedia: ''
					}
				: entri
		);
	}

	/** @type {{decision: import('../_components/decisions.js').Decision, event: object}|null} */
	let keputusanTerbuka = $state(null);

	/** @type {boolean} Formulir event sedang terbuka. */
	let formulirTerbuka = $state(false);

	/**
	 * @type {string} Identitas event yang sedang disunting; kosong berarti formulir
	 * sedang dipakai untuk menambah event baru. Satu nilai ini yang membedakan kedua
	 * mode — bukan dua flag terpisah yang dapat saling bertentangan.
	 */
	let idDisunting = $state('');

	/** @type {string} Pesan penolakan formulir; kosong berarti belum ada. */
	let galatFormulir = $state('');

	/** @type {boolean} Penyimpanan suntingan sedang berjalan. */
	let menyimpan = $state(false);

	/** Isian formulir event. */
	let form = $state(formulirKosong());

	/** @type {Date} Bulan yang sedang ditampilkan kalender. */
	let bulanTampil = $state(new Date());

	/** @type {Date|null} Tanggal terpilih; `null` berarti daftar menampilkan sebulan penuh. */
	let tanggalTerpilih = $state(null);

	/** Ketiga jenis event sebagai pasangan kode dan label. */
	const jenisKegiatan = Object.values(EVENT_TYPE_META);

	const bolehMengusulkan = $derived(AccessPolicy.canProposeEvent(session.role));
	const buktiHadir = $derived(activitySubmissions.items.filter((item) => item.activityType === 'SESSION_ATTEND'));
	const buktiHadirMenunggu = $derived(buktiHadir.filter((item) => item.status === 'SUBMITTED' || item.status === 'IN_REVIEW'));

	/** Event yang punya tempat di kalender, urut waktu mulai. */
	const agendaKalender = $derived(
		catalog.events
			.filter((event) => STATUS_DI_KALENDER.includes(event.status))
			.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
	);

	/** Penanda tanggal untuk `MonthCalendar`; ia menyaring bulannya sendiri. */
	const penandaKalender = $derived(agendaKalender.map(eventCardVM));

	/**
	 * Agenda yang ditampilkan di samping kalender.
	 *
	 * Menyempit ke satu hari begitu sebuah tanggal dipilih, dan kembali ke sebulan
	 * penuh saat pilihan dilepas — supaya kalender dan daftarnya mustahil menunjuk
	 * rentang yang berbeda.
	 */
	const agendaTerlihat = $derived(
		agendaKalender.filter((event) => {
			const mulai = event.startsAt;
			if (tanggalTerpilih) {
				return (
					mulai.getFullYear() === tanggalTerpilih.getFullYear() &&
					mulai.getMonth() === tanggalTerpilih.getMonth() &&
					mulai.getDate() === tanggalTerpilih.getDate()
				);
			}
			return (
				mulai.getFullYear() === bulanTampil.getFullYear() &&
				mulai.getMonth() === bulanTampil.getMonth()
			);
		})
	);

	/** Tiga angka ringkas kepala halaman, dihitung dari data yang sama dengan daftarnya. */
	const ringkasan = $derived([
		{
			id: 'menunggu',
			label: 'Usulan menunggu keputusan',
			nilai: editorial.eventQueue.length,
			tegas: false,
			iconPath: ICONS.inbox
		},
		{
			id: 'lewat',
			label: 'Sudah lewat tenggat',
			nilai: editorial.eventOverdueCount,
			tegas: editorial.eventOverdueCount > 0,
			iconPath: ICONS.warning
		},
		{
			id: 'terjadwal',
			label: 'Event di kalender',
			nilai: agendaKalender.length,
			tegas: false,
			iconPath: ICONS.calendar
		}
	]);

	/**
	 * Waktu sebuah event sebagai satu kalimat.
	 *
	 * Jam ikut ditulis, tidak seperti `formatRentangTanggal` yang hanya mengenal
	 * tanggal: peserta yang membaca "12 Maret 2026" tanpa jam tetap harus bertanya
	 * ke kanal lain, dan pertanyaan itulah yang seharusnya dijawab kalender.
	 *
	 * @param {Date} mulai
	 * @param {Date} selesai
	 * @returns {string}
	 */
	function labelWaktuEvent(mulai, selesai) {
		const hariSama =
			mulai.getFullYear() === selesai.getFullYear() &&
			mulai.getMonth() === selesai.getMonth() &&
			mulai.getDate() === selesai.getDate();
		if (hariSama) return `${formatTanggal(mulai, 'waktu')}–${formatTanggal(selesai, 'jam')}`;
		return formatRentangTanggal(mulai, selesai);
	}

	/**
	 * Alasan tertulis mengapa keputusan atas sebuah usulan dimatikan.
	 *
	 * Perbandingannya `actor.id` melawan `event.proposedBy` — keduanya menunjuk
	 * `UserAccount`. Pada jalur cerita pasangannya berbeda (`awardeeId` melawan
	 * `authorId`), dan menukarnya akan membuat pemeriksaan ini tidak pernah menyala.
	 *
	 * @param {object} event
	 * @returns {string} Kosong berarti tidak ada halangan.
	 */
	function halangan(event) {
		return AccessPolicy.isSelfReview(session.accountId, event.proposedBy)
			? PESAN_KONFLIK_KEGIATAN
			: '';
	}

	/**
	 * Mengirim keputusan atas sebuah usulan ke store editorial.
	 * @param {import('../_components/decisions.js').DecisionPayload} payload
	 * @returns {Promise<void>}
	 */
	async function kirim(payload) {
		const terbuka = keputusanTerbuka;
		if (!terbuka || terbuka.decision.jalankan === null) return;
		const hasil = await terbuka.decision.jalankan(terbuka.event, payload);
		if (hasil.ok) {
			keputusanTerbuka = null;
			await catalog.refresh();
		}
	}

	/** Membuka formulir dalam mode tambah. */
	function bukaTambah() {
		idDisunting = '';
		galatFormulir = '';
		form = formulirKosong();
		formulirTerbuka = true;
	}

	/**
	 * Membuka formulir dalam mode sunting atas sebuah event yang sudah ada.
	 * @param {object} event
	 */
	function bukaSunting(event) {
		idDisunting = event.id;
		galatFormulir = '';
		form = formulirDariEvent(event);
		formulirTerbuka = true;
	}

	function tutupFormulir() {
		formulirTerbuka = false;
		idDisunting = '';
		galatFormulir = '';
	}

	/**
	 * Menyimpan isi formulir lewat jalur yang sesuai modenya.
	 *
	 * Event baru dikirim sebagai objek polos, bukan entity yang dirakit halaman:
	 * `ContentReviewService.proposeEvent` membangun `CommunityEvent` sendiri dan
	 * menimpa `proposedBy` dengan identitas aktor — nilai yang boleh dikirim dari
	 * formulir akan membuat pemeriksaan konflik kepentingan dapat dilewati hanya
	 * dengan mengetik id orang lain.
	 *
	 * @returns {Promise<void>}
	 */
	async function simpan() {
		const salah = periksaFormulirEvent(form);
		if (salah !== '') {
			galatFormulir = salah;
			return;
		}
		galatFormulir = '';
		menyimpan = true;

		try {
			if (idDisunting !== '') {
				const hasil = await simpanPerubahanEvent(idDisunting, form);
				if (!hasil.ok) {
					galatFormulir = hasil.reason;
					return;
				}
				toast.info('Perubahan tersimpan', 'Detail event diperbarui; statusnya tidak berubah.');
			} else {
				const hasil = await editorial.proposeEvent({
					id: `EVT-${Date.now().toString(36).toUpperCase()}`,
					title: form.title.trim(),
					type: form.type,
					status: EventStatus.DRAFT,
					description: form.description.trim(),
					location: form.location.trim(),
					isOnline: form.isOnline,
					startsAt: new Date(form.startsAt),
					endsAt: new Date(form.endsAt),
					quota: Number(form.quota) || 0
				});
				if (!hasil.ok) return;
				toast.info(
					'Event baru masuk antrean',
					'Persetujuan atas event ini harus diambil verifikator lain — Anda pengusulnya.'
				);
			}

			tutupFormulir();
			await catalog.refresh();
			await editorial.refresh();
		} finally {
			menyimpan = false;
		}
	}
</script>

<PageHeader
	eyebrow="Ruang kerja verifikator"
	title="Konfigurasi Calendar of Event"
	subtitle="Putuskan usulan Awardee, periksa bukti hadir peserta, dan rapikan detail agenda yang sudah tayang."
/>

{#if formulirTerbuka}
	<section class="card mt-5 p-5" aria-labelledby="judul-formulir">
		<h2 id="judul-formulir" class="text-base font-bold text-heading">
			{idDisunting !== '' ? 'Sunting detail event' : 'Tambah event baru'}
		</h2>
		<p class="mt-1 text-sm leading-relaxed text-ink-600">
			{#if idDisunting !== ''}
				Yang disunting hanya detail deskriptif: judul, jenis, waktu, lokasi, dan kapasitas. Status
				event tidak ikut berubah — persetujuan, penolakan, dan pembatalan tetap hanya lewat tombol
				keputusan di daftar agenda.
			{:else}
				Event yang Anda tambahkan masuk ke antrean yang sama dengan usulan awardee, dan akan
				diputuskan verifikator lain. Pengusul tidak pernah menjadi pemutus atas usulannya sendiri.
			{/if}
		</p>

		<div class="mt-4 grid gap-4 sm:grid-cols-2">
			<div class="sm:col-span-2">
				<label class="label-micro mb-1.5 block" for="event-judul">Judul event</label>
				<input
					id="event-judul"
					type="text"
					bind:value={form.title}
					class="min-h-11 w-full rounded-control border border-ink-200 bg-white px-3 text-sm text-ink-800"
					placeholder="Misalnya: Kelas pembukuan sederhana untuk UMKM"
				/>
			</div>

			<div>
				<label class="label-micro mb-1.5 block" for="event-jenis">Jenis event</label>
				<select
					id="event-jenis"
					bind:value={form.type}
					class="min-h-11 w-full rounded-control border border-ink-200 bg-white px-3 text-sm text-ink-800"
				>
					{#each jenisKegiatan as jenis (jenis.code)}
						<option value={jenis.code}>{jenis.label}</option>
					{/each}
				</select>
			</div>

			<div>
				<label class="label-micro mb-1.5 block" for="event-kuota">Kapasitas peserta</label>
				<input
					id="event-kuota"
					type="number"
					min="0"
					bind:value={form.quota}
					class="numeric min-h-11 w-full rounded-control border border-ink-200 bg-white px-3 text-sm text-ink-800"
				/>
				<p class="mt-1 text-xs text-ink-600">Isi 0 bila tanpa batas.</p>
			</div>

			<div>
				<label class="label-micro mb-1.5 block" for="event-mulai">Mulai</label>
				<input
					id="event-mulai"
					type="datetime-local"
					bind:value={form.startsAt}
					class="min-h-11 w-full rounded-control border border-ink-200 bg-white px-3 text-sm text-ink-800"
				/>
			</div>

			<div>
				<label class="label-micro mb-1.5 block" for="event-selesai">Selesai</label>
				<input
					id="event-selesai"
					type="datetime-local"
					bind:value={form.endsAt}
					class="min-h-11 w-full rounded-control border border-ink-200 bg-white px-3 text-sm text-ink-800"
				/>
			</div>

			<div class="sm:col-span-2">
				<label class="label-micro mb-1.5 block" for="event-lokasi">Lokasi atau kanal daring</label>
				<input
					id="event-lokasi"
					type="text"
					bind:value={form.location}
					class="min-h-11 w-full rounded-control border border-ink-200 bg-white px-3 text-sm text-ink-800"
					placeholder="Misalnya: Zoom, atau Aula Chapter PF 11"
				/>
			</div>

			<div class="sm:col-span-2">
				<label class="flex items-center gap-2.5 text-sm text-ink-800">
					<input
						type="checkbox"
						bind:checked={form.isOnline}
						class="h-4 w-4 rounded border-ink-450 accent-pertamina-navy"
					/>
					Event dilaksanakan daring
				</label>
			</div>

			<div class="sm:col-span-2">
				<label class="label-micro mb-1.5 block" for="event-deskripsi">Deskripsi singkat</label>
				<textarea
					id="event-deskripsi"
					rows="3"
					bind:value={form.description}
					class="w-full rounded-control border border-ink-200 bg-white p-3 text-sm leading-relaxed text-ink-800"
					placeholder="Apa yang akan dikerjakan peserta, dan apa yang mereka bawa pulang."
				></textarea>
			</div>
		</div>

		{#if galatFormulir !== ''}
			<p class="mt-3 text-sm leading-relaxed font-semibold text-danger" role="alert">
				{galatFormulir}
			</p>
		{/if}

		<div class="mt-4 flex justify-end gap-2">
			<Button variant="ghost" size="md" onclick={tutupFormulir}>Batal</Button>
			<Button
				variant="primary"
				size="md"
				loading={editorial.working || menyimpan}
				onclick={simpan}
			>
				{idDisunting !== '' ? 'Simpan perubahan' : 'Kirim event baru'}
			</Button>
		</div>
	</section>
{/if}

<section class="mt-5 grid gap-4 sm:grid-cols-3" aria-label="Ringkasan kalender">
	{#each ringkasan as kartu (kartu.id)}
		<div class="card p-4">
			<span class="flex items-center gap-2 {kartu.tegas ? 'text-pertamina-red-ink' : 'text-ink-600'}">
				<Icon path={kartu.iconPath} size={16} />
				<span class="label-micro">{kartu.label}</span>
			</span>
			<span
				class="numeric mt-2 block text-3xl leading-none {kartu.tegas
					? 'text-pertamina-red-ink'
					: 'text-ink-900'}"
			>
				{kartu.nilai}
			</span>
		</div>
	{/each}
</section>

<section class="mt-8" aria-labelledby="judul-bukti-hadir">
	<div class="flex flex-wrap items-baseline justify-between gap-2">
		<div><h2 id="judul-bukti-hadir" class="text-lg font-bold text-heading">Bukti hadir peserta</h2><p class="mt-1 text-sm text-ink-600">Pendaftaran belum menghasilkan poin. Poin baru dibukukan setelah bukti hadir disetujui.</p></div>
		<StatusBadge label={`${buktiHadirMenunggu.length} menunggu`} color={buktiHadirMenunggu.length ? 'amber' : 'slate'} withDot={buktiHadirMenunggu.length > 0} />
	</div>
	{#if buktiHadir.length === 0}
		<div class="mt-4"><EmptyState title="Belum ada bukti hadir" message="Bukti yang diunggah peserta terdaftar setelah event selesai akan tampil di sini." iconPath={ICONS.upload} size="sm" /></div>
	{:else}
		<div class="mt-4 grid gap-3 md:grid-cols-2">
			{#each buktiHadir as item (item.id)}
				<div class="card p-4">
					<div class="flex items-start justify-between gap-3"><div class="min-w-0"><h3 class="truncate font-semibold text-heading">{item.title}</h3><p class="mt-1 text-sm text-ink-600">{item.awardeeName || item.expand?.owner?.displayName || 'Awardee'}</p></div><StatusBadge label={SUBMISSION_STATUS_META[item.status]?.label || item.status} color={SUBMISSION_STATUS_META[item.status]?.color || 'slate'} withDot /></div>
					<Button class="mt-3" size="sm" variant="secondary" href={`/verifikator/bukti-keaktifan/${item.id}`}>Periksa bukti</Button>
				</div>
			{/each}
		</div>
	{/if}
</section>

<section class="mt-8" aria-labelledby="judul-antrean">
	<h2 id="judul-antrean" class="text-lg font-bold text-heading">Usulan menunggu keputusan</h2>
	<p class="mt-1 text-sm leading-relaxed text-ink-600">
		Tertua lebih dahulu. Usulan yang Anda ajukan sendiri tetap tampil di sini, namun keputusannya
		harus diambil verifikator lain.
	</p>

	{#if editorial.loading && editorial.eventQueue.length === 0}
		<div class="mt-4 space-y-3" aria-busy="true" aria-label="Memuat antrean usulan">
			{#each ['a', 'b'] as kunci (kunci)}
				<div class="skeleton h-28 w-full rounded-card"></div>
			{/each}
		</div>
	{:else if editorial.eventQueue.length === 0}
		<div class="mt-4">
			<EmptyState
				title="Tidak ada usulan menunggu"
				message="Usulan dari awardee maupun sesama verifikator akan tampil di sini, tertua lebih dahulu."
				iconPath={ICONS.calendar}
			/>
		</div>
	{:else}
		<ul class="mt-4 space-y-3">
			{#each editorial.eventQueue as usulan, indeks (usulan.id)}
				{@const sebab = halangan(usulan)}
				<li>
					<QueueRow
						position={nomorAntrean(indeks)}
						title={usulan.title}
						subtitle={usulan.description}
						statusLabel={usulan.statusMeta.label}
						statusColor={usulan.statusMeta.badgeColor}
						sla={slaAntrean(usulan, sekarang)}
						meta={[
							usulan.typeMeta.label,
							labelWaktuEvent(usulan.startsAt, usulan.endsAt),
							usulan.isOnline ? 'Daring' : 'Luring',
							usulan.location || 'Lokasi belum diisi',
							sebab !== '' ? 'Diusulkan oleh Anda' : `Pengusul: ${usulan.proposedBy || 'tidak tercatat'}`
						]}
					>
						{#snippet actions()}
							<div class="flex flex-wrap items-start gap-x-3 gap-y-2">
								<div class="min-w-0 flex-1">
									<DecisionBar
										decisions={lengkapiKeputusan(keputusanKegiatan(usulan.status, session.role))}
										blockedReason={sebab}
										working={editorial.working}
										compact
										emptyMessage="Usulan ini tidak lagi menunggu keputusan."
										onpick={(decision) => (keputusanTerbuka = { decision, event: usulan })}
									/>
								</div>
								<Button
									variant="ghost"
									size="sm"
									iconPath={ICONS.edit}
									onclick={() => bukaSunting(usulan)}
								>
									Sunting
								</Button>
							</div>
						{/snippet}
					</QueueRow>
				</li>
			{/each}
		</ul>
	{/if}
</section>

<!--
	`min-w-0` pada kedua kolom: judul event yang panjang akan menaikkan lebar
	`min-content` kolomnya dan membuat halaman menggulir mendatar di 375 px.
-->
<div class="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
	<section class="card min-w-0 p-5" aria-labelledby="judul-kalender">
		<h2 id="judul-kalender" class="kicker">Kalender komunitas</h2>
		<div class="mt-3">
			<MonthCalendar
				month={bulanTampil}
				events={penandaKalender}
				selected={tanggalTerpilih ?? undefined}
				onstep={(bulan) => {
					bulanTampil = bulan;
					tanggalTerpilih = null;
				}}
				onselect={(tanggal) => (tanggalTerpilih = tanggal)}
			/>
		</div>
		<p class="mt-4 text-xs leading-relaxed text-ink-600">
			Penanda hanya muncul untuk event yang benar-benar terjadwal, berlangsung, atau selesai. Usulan
			yang belum diputuskan sengaja tidak ditandai — tanggal yang tampak pasti padahal masih mungkin
			ditolak akan menyesatkan siapa pun yang menjadwalkan dirinya ke sana.
		</p>
	</section>

	<section class="min-w-0" aria-labelledby="judul-agenda">
		<div class="flex flex-wrap items-baseline justify-between gap-2">
			<h2 id="judul-agenda" class="text-lg font-bold text-heading">
				{tanggalTerpilih ? 'Agenda tanggal terpilih' : 'Agenda bulan ini'}
			</h2>
			{#if tanggalTerpilih}
				<button
					type="button"
					class="text-sm font-semibold text-pertamina-navy hover:underline"
					onclick={() => (tanggalTerpilih = null)}
				>
					Tampilkan sebulan penuh
				</button>
			{/if}
		</div>
		<p class="mt-1 text-sm leading-relaxed text-ink-600">
			Daftar transisi tiap event dirender dari peta transisi domain, sehingga terlihat persis apa
			yang sah dilakukan seorang verifikator atas agenda berjalan.
		</p>

		{#if agendaTerlihat.length === 0}
			<div class="mt-4">
				<EmptyState
					title="Belum ada event pada rentang ini"
					message="Event yang sudah disetujui akan muncul di sini beserta transisi yang sah atasnya."
					iconPath={ICONS.calendar}
					size="sm"
				/>
			</div>
		{:else}
			<ul class="mt-4 space-y-3">
				{#each agendaTerlihat as agenda (agenda.id)}
					<li class="card p-4">
						<div class="flex flex-wrap items-start gap-2">
							<h3 class="min-w-0 flex-1 text-[15px] leading-snug font-bold text-heading">
								{agenda.title}
							</h3>
							<StatusBadge
								label={agenda.statusMeta.label}
								color={agenda.statusMeta.badgeColor}
								size="sm"
								variant="soft"
							/>
						</div>

						<div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-600">
							<span>{agenda.typeMeta.label}</span>
							<span>{labelWaktuEvent(agenda.startsAt, agenda.endsAt)}</span>
							<span>{agenda.isOnline ? 'Daring' : 'Luring'}</span>
							<span class="min-w-0 truncate">{agenda.location || 'Lokasi belum diisi'}</span>
							<span class="numeric">
								{agenda.quota > 0 ? `Kapasitas ${agenda.quota}` : 'Tanpa batas kapasitas'}
							</span>
						</div>

						<div class="mt-3 flex flex-wrap items-start gap-x-3 gap-y-2 border-t border-ink-100 pt-3">
							<div class="min-w-0 flex-1">
								<DecisionBar
									decisions={lengkapiKeputusan(keputusanKegiatan(agenda.status, session.role))}
									working={editorial.working}
									compact
									emptyMessage="Event ini sudah berada pada keadaan akhir."
									onpick={(decision) => (keputusanTerbuka = { decision, event: agenda })}
								/>
							</div>
							<Button
								variant="ghost"
								size="sm"
								iconPath={ICONS.edit}
								onclick={() => bukaSunting(agenda)}
							>
								Sunting
							</Button>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</div>

<DecisionDialog
	decision={keputusanTerbuka?.decision ?? null}
	entityTitle={keputusanTerbuka?.event.title ?? ''}
	working={editorial.working}
	onconfirm={kirim}
	oncancel={() => (keputusanTerbuka = null)}
/>
