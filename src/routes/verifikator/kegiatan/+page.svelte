<script>
	/**
	 * HALAMAN `/verifikator/kegiatan` — antrean usulan kegiatan dan pengusulan sendiri.
	 *
	 * Tanggung jawab: memutuskan usulan kegiatan yang menunggu, dan menyediakan
	 * jalan bagi verifikator mengusulkan agendanya sendiri.
	 *
	 * Enam keputusan yang tidak terbaca dari kode:
	 *
	 * 1. **Usulan yang diajukan verifikator yang sedang masuk TIDAK dapat ia
	 *    setujui atau tolak sendiri.** Tombolnya nonaktif beserta alasan tertulis,
	 *    dan `ContentReviewService.approveEvent` tetap menolaknya bila permintaan
	 *    dipaksakan lewat konsol peramban — penjagaan yang sesungguhnya hidup di
	 *    domain, sedangkan halaman ini bertugas MENJELASKANNYA. Kegagalan yang
	 *    senyap membuat verifikator menekan tombol yang sama berulang kali
	 *    (`docs/12` §3.5 WP-06 butir 3, `docs/10` §5.5).
	 * 2. **Formulir pengusulan sengaja ada di halaman yang sama dengan antreannya.**
	 *    Justru karena verifikator boleh mengusulkan kegiatan, konflik kepentingan
	 *    pada butir 1 bukan kasus tepi teoretis: usulan yang baru saja ia kirim
	 *    langsung muncul di antrean di bawahnya dengan tombol keputusan nonaktif.
	 *    Inilah alasan seed mewajibkan DUA akun verifikator.
	 * 3. **Tombol keputusan dirender dari `allowedEventTransitions(status, role)`,**
	 *    termasuk pada agenda yang sudah terjadwal. Transisi sah yang belum punya
	 *    jalur eksekusi di konsol ini tampil nonaktif beserta alasannya, bukan
	 *    dihapus diam-diam — selisih antara peta transisi dan kemampuan konsol
	 *    lebih baik terbaca daripada tersembunyi.
	 * 4. **Penolakan usulan wajib disertai alasan.** Pengusul membaca alasan itu di
	 *    `/awardee/kalender`; penolakan tanpa alasan memindahkan pertanyaan ke
	 *    kanal yang tidak tercatat (`docs/12` §3.5 WP-06 butir 6).
	 * 5. **Usulan dikirim sebagai objek polos, bukan entity yang dirakit halaman.**
	 *    `ContentReviewService.proposeEvent` membangun `CommunityEvent` sendiri dan
	 *    menimpa `proposedBy` dengan identitas aktor — nilai yang boleh dikirim dari
	 *    formulir akan membuat pemeriksaan konflik kepentingan dapat dilewati hanya
	 *    dengan mengetik id orang lain.
	 * 6. **Nol angka poin dan nol pendaftar.** Halaman ini memutuskan agenda, bukan
	 *    menghitung capaian; kuota diisi sebagai kapasitas ruangan, bukan sebagai
	 *    perolehan.
	 * 7. **Pembatalan agenda disambungkan DI HALAMAN INI, bukan di registri
	 *    keputusan.** `ContentReviewService.cancelEvent` sudah lengkap sejak awal
	 *    tetapi tidak pernah dipanggil dari mana pun, sehingga siklus hidup kegiatan
	 *    PO-4 berhenti di "terjadwal" — agenda yang batal hanya bisa dicabut dengan
	 *    menyunting basis data. `EVENT_DECISIONS` menandai transisi itu
	 *    `jalankan: null` karena kontrak store editorial belum memuat jalurnya; kini
	 *    store memuatnya, dan halaman ini yang memasangkannya lewat
	 *    `lengkapiKeputusan()`. Registri keputusan tidak disunting dari sini —
	 *    pemiliknya paket lain, dan dua paket yang menulis satu berkas tanpa git
	 *    adalah cara tercepat kehilangan pekerjaan orang lain.
	 *
	 * @see docs/10-REVISION-SPEC.md — US-R24 antrean usulan kegiatan, §5.5 konflik kepentingan
	 * @see docs/12-BUILD-CONTRACT-V2.md — §3.5 WP-06 butir 3 dan 6
	 */
	import { Button, EmptyState, PageHeader, StatusBadge, ICONS } from '$lib/components';
	import { EventStatus, EventType, EVENT_TYPE_META } from '$lib/domain/entities/CommunityEvent.js';
	import { AccessPolicy } from '$lib/domain/policies/AccessPolicy.js';
	import { catalog } from '$lib/stores/catalog.svelte.js';
	import { editorial } from '$lib/stores/editorial.svelte.js';
	import { session } from '$lib/stores/session.svelte.js';
	import { toast } from '$lib/stores/toast.svelte.js';
	import {
		DecisionBar,
		DecisionDialog,
		PESAN_KONFLIK_KEGIATAN,
		QueueRow,
		keputusanKegiatan,
		nomorAntrean,
		slaAntrean
	} from '../_components/index.js';

	/** Waktu acuan seluruh perhitungan usia di halaman ini. */
	const sekarang = new Date();

	/**
	 * Memasang jalur eksekusi pembatalan pada daftar keputusan yang datang dari peta
	 * transisi domain.
	 *
	 * Registri `EVENT_DECISIONS` menandai `DIBATALKAN` sebagai transisi sah yang
	 * belum punya jalur eksekusi — itu benar pada saat registri ditulis, dan berhenti
	 * benar begitu `editorial.cancelEvent()` ada. Alih-alih menyunting registri milik
	 * paket lain, halaman ini menimpanya di sini: hasilnya satu entri yang `jalankan`
	 * -nya terisi dan `alasanTidakTersedia`-nya kosong, sehingga tombolnya hidup dan
	 * DecisionBar berhenti menjelaskan halangan yang sudah tidak ada.
	 *
	 * Isian wajibnya tidak diubah sama sekali: `input: DecisionInput.NOTE` dari
	 * registri tetap berlaku, jadi `DecisionDialog` menuntut alasan pembatalan
	 * sebelum permintaan dikirim, dan `ContentReviewService.cancelEvent` menolaknya
	 * sekali lagi bila kosong.
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

	/** @type {boolean} Formulir pengusulan sedang terbuka. */
	let formulirTerbuka = $state(false);

	/** @type {string} Pesan penolakan formulir; kosong berarti belum ada. */
	let galatFormulir = $state('');

	/** Isian formulir usulan kegiatan. */
	let form = $state({
		title: '',
		type: EventType.PERTEMUAN,
		description: '',
		location: '',
		isOnline: true,
		startsAt: '',
		endsAt: '',
		quota: 0
	});

	/** Ketiga jenis kegiatan sebagai pasangan kode dan label. */
	const jenisKegiatan = Object.values(EVENT_TYPE_META);

	/** Agenda yang sudah terbit dan masih dapat berubah statusnya. */
	const agendaBerjalan = $derived(
		catalog.events
			.filter(
				(event) =>
					event.status === EventStatus.TERJADWAL || event.status === EventStatus.BERLANGSUNG
			)
			.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
	);

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

	/**
	 * Memeriksa kelengkapan formulir usulan sebelum dikirim ke domain.
	 * @returns {string} Pesan penolakan; kosong berarti lengkap.
	 */
	function periksaFormulir() {
		if (form.title.trim() === '') return 'Judul kegiatan wajib diisi.';
		if (form.startsAt === '' || form.endsAt === '') {
			return 'Waktu mulai dan waktu selesai wajib diisi.';
		}
		const mulai = new Date(form.startsAt);
		const selesai = new Date(form.endsAt);
		if (Number.isNaN(mulai.getTime()) || Number.isNaN(selesai.getTime())) {
			return 'Waktu mulai atau waktu selesai tidak terbaca sebagai tanggal yang sah.';
		}
		if (selesai < mulai) return 'Waktu selesai tidak boleh mendahului waktu mulai.';
		if (form.location.trim() === '') {
			return 'Isi lokasi atau kanal daring agar peserta tahu harus ke mana.';
		}
		return '';
	}

	/**
	 * Mengirim usulan kegiatan atas nama akun yang sedang masuk.
	 *
	 * `proposedBy` sengaja TIDAK diisi di sini — domain mengambilnya dari aktor.
	 * @returns {Promise<void>}
	 */
	async function usulkan() {
		const salah = periksaFormulir();
		if (salah !== '') {
			galatFormulir = salah;
			return;
		}
		galatFormulir = '';

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

		if (hasil.ok) {
			formulirTerbuka = false;
			form = {
				title: '',
				type: EventType.PERTEMUAN,
				description: '',
				location: '',
				isOnline: true,
				startsAt: '',
				endsAt: '',
				quota: 0
			};
			toast.info(
				'Usulan Anda masuk antrean',
				'Persetujuan atas usulan ini harus diambil verifikator lain — Anda pengusulnya.'
			);
			await catalog.refresh();
		}
	}
</script>

<PageHeader
	eyebrow="Antrean tinjauan"
	title="Usulan kegiatan"
	subtitle="Tertua lebih dahulu. Usulan yang Anda ajukan sendiri tetap tampil di sini, namun keputusannya harus diambil verifikator lain."
>
	{#snippet actions()}
		<Button
			variant={formulirTerbuka ? 'secondary' : 'primary'}
			size="md"
			iconPath={formulirTerbuka ? ICONS.x : ICONS.plus}
			onclick={() => (formulirTerbuka = !formulirTerbuka)}
		>
			{formulirTerbuka ? 'Tutup formulir' : 'Usulkan kegiatan'}
		</Button>
	{/snippet}
</PageHeader>

{#if formulirTerbuka}
	<section class="card mt-5 p-5" aria-labelledby="judul-formulir">
		<h2 id="judul-formulir" class="text-base font-bold text-heading">Usulkan kegiatan baru</h2>
		<p class="mt-1 text-sm leading-relaxed text-ink-600">
			Usulan Anda masuk ke antrean yang sama dengan usulan awardee, dan akan diputuskan verifikator
			lain. Pengusul tidak pernah menjadi pemutus atas usulannya sendiri.
		</p>

		<div class="mt-4 grid gap-4 sm:grid-cols-2">
			<div class="sm:col-span-2">
				<label class="label-micro mb-1.5 block" for="usul-judul">Judul kegiatan</label>
				<input
					id="usul-judul"
					type="text"
					bind:value={form.title}
					class="min-h-11 w-full rounded-control border border-ink-200 bg-white px-3 text-sm text-ink-800"
					placeholder="Misalnya: Kelas pembukuan sederhana untuk UMKM"
				/>
			</div>

			<div>
				<label class="label-micro mb-1.5 block" for="usul-jenis">Jenis kegiatan</label>
				<select
					id="usul-jenis"
					bind:value={form.type}
					class="min-h-11 w-full rounded-control border border-ink-200 bg-white px-3 text-sm text-ink-800"
				>
					{#each jenisKegiatan as jenis (jenis.code)}
						<option value={jenis.code}>{jenis.label}</option>
					{/each}
				</select>
			</div>

			<div>
				<label class="label-micro mb-1.5 block" for="usul-kuota">Kapasitas peserta</label>
				<input
					id="usul-kuota"
					type="number"
					min="0"
					bind:value={form.quota}
					class="numeric min-h-11 w-full rounded-control border border-ink-200 bg-white px-3 text-sm text-ink-800"
				/>
				<p class="mt-1 text-xs text-ink-600">Isi 0 bila tanpa batas.</p>
			</div>

			<div>
				<label class="label-micro mb-1.5 block" for="usul-mulai">Mulai</label>
				<input
					id="usul-mulai"
					type="datetime-local"
					bind:value={form.startsAt}
					class="min-h-11 w-full rounded-control border border-ink-200 bg-white px-3 text-sm text-ink-800"
				/>
			</div>

			<div>
				<label class="label-micro mb-1.5 block" for="usul-selesai">Selesai</label>
				<input
					id="usul-selesai"
					type="datetime-local"
					bind:value={form.endsAt}
					class="min-h-11 w-full rounded-control border border-ink-200 bg-white px-3 text-sm text-ink-800"
				/>
			</div>

			<div class="sm:col-span-2">
				<label class="label-micro mb-1.5 block" for="usul-lokasi">Lokasi atau kanal daring</label>
				<input
					id="usul-lokasi"
					type="text"
					bind:value={form.location}
					class="min-h-11 w-full rounded-control border border-ink-200 bg-white px-3 text-sm text-ink-800"
					placeholder="Misalnya: Zoom, atau Aula Chapter Jawa Barat"
				/>
			</div>

			<div class="sm:col-span-2">
				<label class="flex items-center gap-2.5 text-sm text-ink-800">
					<input
						type="checkbox"
						bind:checked={form.isOnline}
						class="h-4 w-4 rounded border-ink-450 accent-pertamina-red-ink"
					/>
					Kegiatan dilaksanakan daring
				</label>
			</div>

			<div class="sm:col-span-2">
				<label class="label-micro mb-1.5 block" for="usul-deskripsi">Deskripsi singkat</label>
				<textarea
					id="usul-deskripsi"
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
			<Button variant="ghost" size="md" onclick={() => (formulirTerbuka = false)}>Batal</Button>
			<Button variant="primary" size="md" loading={editorial.working} onclick={usulkan}>
				Kirim usulan
			</Button>
		</div>
	</section>
{/if}

<section class="mt-6" aria-labelledby="judul-antrean">
	<h2 id="judul-antrean" class="text-lg font-bold text-heading">Menunggu keputusan</h2>

	{#if editorial.loading && editorial.eventQueue.length === 0}
		<div class="mt-3 space-y-3" aria-busy="true" aria-label="Memuat antrean usulan">
			{#each ['a', 'b'] as kunci (kunci)}
				<div class="skeleton h-28 w-full rounded-card"></div>
			{/each}
		</div>
	{:else if editorial.eventQueue.length === 0}
		<div class="mt-3">
			<EmptyState
				title="Tidak ada usulan kegiatan"
				message="Usulan dari awardee maupun sesama verifikator akan tampil di sini, tertua lebih dahulu."
				iconPath={ICONS.calendar}
			/>
		</div>
	{:else}
		<ul class="mt-3 space-y-3">
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
							usulan.isOnline ? 'Daring' : 'Luring',
							usulan.location || 'Lokasi belum diisi',
							sebab !== '' ? 'Diusulkan oleh Anda' : `Pengusul: ${usulan.proposedBy || 'tidak tercatat'}`
						]}
					>
						{#snippet actions()}
							<DecisionBar
								decisions={lengkapiKeputusan(keputusanKegiatan(usulan.status, session.role))}
								blockedReason={sebab}
								working={editorial.working}
								emptyMessage="Usulan ini tidak lagi menunggu keputusan."
								onpick={(decision) => (keputusanTerbuka = { decision, event: usulan })}
							/>
						{/snippet}
					</QueueRow>
				</li>
			{/each}
		</ul>
	{/if}
</section>

<section class="mt-8" aria-labelledby="judul-agenda">
	<h2 id="judul-agenda" class="text-lg font-bold text-heading">Agenda yang sudah terbit</h2>
	<p class="mt-1 text-sm leading-relaxed text-ink-600">
		Daftar transisi di bawah tetap dirender dari peta transisi domain, sehingga terlihat persis apa
		yang sah dilakukan seorang verifikator atas agenda berjalan.
	</p>

	{#if agendaBerjalan.length === 0}
		<div class="mt-3">
			<EmptyState
				title="Belum ada agenda berjalan"
				message="Kegiatan yang sudah disetujui akan muncul di sini beserta transisi yang sah atasnya."
				iconPath={ICONS.calendar}
				size="sm"
			/>
		</div>
	{:else}
		<ul class="mt-3 space-y-3">
			{#each agendaBerjalan as agenda (agenda.id)}
				<li class="card p-4">
					<div class="flex flex-wrap items-center gap-2">
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

					<div class="mt-3 border-t border-ink-100 pt-3">
						<DecisionBar
							decisions={lengkapiKeputusan(keputusanKegiatan(agenda.status, session.role))}
							working={editorial.working}
							emptyMessage="Agenda ini sudah berada pada keadaan akhir."
							onpick={(decision) => (keputusanTerbuka = { decision, event: agenda })}
						/>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</section>

<DecisionDialog
	decision={keputusanTerbuka?.decision ?? null}
	entityTitle={keputusanTerbuka?.event.title ?? ''}
	working={editorial.working}
	onconfirm={kirim}
	oncancel={() => (keputusanTerbuka = null)}
/>
