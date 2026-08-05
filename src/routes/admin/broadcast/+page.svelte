<script>
	/**
	 * HALAMAN — Diseminasi & Amplifikasi.
	 *
	 * Tanggung jawab: menampilkan seluruh kabar yang pernah disusun beserta
	 * jangkauan dan amplifikasinya, serta menyediakan penyusun kabar baru.
	 *
	 * Dua KPI Hal 6 lahir dari halaman ini dan sengaja ditampilkan berdampingan
	 * karena sering tertukar: M-02 menghitung KONTEN unik (stok materi), M-03
	 * menghitung HARI kirim unik (ritme komunikasi). Satu materi yang dikirim
	 * ulang tiga kali menaikkan M-03 tanpa menaikkan M-02 — dan itu memang
	 * perilaku yang benar.
	 *
	 * Catatan arsitektur. Penyusun kabar menulis lewat `broadcastRepository`
	 * langsung karena kontrak store WP-4 §5 belum memuat tindakan penyusunan
	 * kabar. Seluruh mutasi terkumpul pada satu fungsi `simpanKabar()` agar
	 * berpindah ke store tanpa menyentuh tampilan begitu tersedia.
	 *
	 * @see docs/00-SOURCE-BRIEF.md — Hal 4 kanal, Hal 5 pilar 04, Hal 6 M-02 dan M-03
	 * @see docs/02-KPI-MODEL.md — §5 amplification tracking
	 */
	import {
		Button,
		Card,
		DataTable,
		EmptyState,
		Icon,
		KpiCard,
		Modal,
		PageHeader,
		ProgressBar,
		StatTile,
		StatusBadge,
		ICONS
	} from '$lib/components';
	import AmplificationBarChart from '$lib/charts/AmplificationBarChart.svelte';
	import DisseminationComboChart from '$lib/charts/DisseminationComboChart.svelte';
	import { targetKpi } from '$lib/domain/constants/kpi-targets.js';
	import {
		BROADCAST_CHANNEL_LABEL,
		BroadcastChannel,
		BroadcastStatus
	} from '$lib/domain/entities/Broadcast.js';
	import { broadcastRepository } from '$lib/infrastructure/repositories/index.js';
	import { admin } from '$lib/stores/admin.svelte.js';
	import { catalog } from '$lib/stores/catalog.svelte.js';
	import { toast, ToastType } from '$lib/stores/toast.svelte.js';
	import { formatAngka, formatPersen, formatTanggal, potongTeks } from '$lib/utils/format.js';

	/** Jumlah kabar teratas yang ditampilkan pada peringkat amplifikasi. */
	const PERINGKAT_TERATAS = 8;

	/** Sumber materi yang sah menurut Hal 6 — konten Pertamina dan/atau PF. */
	const SUMBER_KONTEN = Object.freeze([
		{ id: 'Pertamina Foundation', label: 'Pertamina Foundation' },
		{ id: 'PT Pertamina (Persero)', label: 'PT Pertamina (Persero)' },
		{ id: 'Pertamina & Pertamina Foundation', label: 'Kolaborasi keduanya' }
	]);

	let penyusunTerbuka = $state(false);
	let sedangMenyimpan = $state(false);
	let sortKey = $state('sentAt');
	let sortDir = $state('desc');

	/** @type {import('$lib/domain/entities/Broadcast.js').Broadcast|null} */
	let kabarTerpilih = $state(null);

	/** Naskah yang sedang disusun. */
	let naskah = $state({
		title: '',
		summary: '',
		body: '',
		contentId: '',
		contentSource: SUMBER_KONTEN[0].id,
		channel: BroadcastChannel.WA_KOMUNITAS,
		audience: 'Seluruh anggota Pfriends',
		lightCta: ''
	});

	const kpiDiseminasi = $derived(
		admin.kpi.filter((baris) => baris.id === 'M-02' || baris.id === 'M-03')
	);

	const terkirim = $derived(catalog.broadcasts.filter((kabar) => kabar.isSent));

	const totalPenerima = $derived(
		terkirim.reduce((jumlah, kabar) => jumlah + kabar.recipientCount, 0)
	);

	const totalDibuka = $derived(terkirim.reduce((jumlah, kabar) => jumlah + kabar.openCount, 0));

	const totalAmplifikasi = $derived(
		terkirim.reduce((jumlah, kabar) => jumlah + kabar.amplificationCount, 0)
	);

	const rataOpenRate = $derived(
		totalPenerima > 0 ? Math.round((totalDibuka / totalPenerima) * 100) : 0
	);

	const rataAmplifikasi = $derived(
		totalPenerima > 0 ? Math.round((totalAmplifikasi / totalPenerima) * 100) : 0
	);

	/** Materi konten unik yang pernah didiseminasikan — penyebut nyata M-02. */
	const kontenUnik = $derived(
		new Set(terkirim.flatMap((kabar) => [...kabar.contentIds])).size
	);

	const peringkatAmplifikasi = $derived(
		[...terkirim]
			.filter((kabar) => kabar.recipientCount > 0)
			.sort((a, b) => b.amplificationRate - a.amplificationRate)
			.slice(0, PERINGKAT_TERATAS)
			.map((kabar) => ({
				label: potongTeks(kabar.title, 36),
				value: Math.round(kabar.amplificationRate)
			}))
	);

	const baris = $derived.by(() => {
		const arah = sortDir === 'asc' ? 1 : -1;

		/** @param {any} row */
		const nilaiUrut = (row) => {
			const kabar = row.kabar;
			if (sortKey === 'jangkauan') return kabar.recipientCount;
			if (sortKey === 'dibuka') return kabar.openRate;
			if (sortKey === 'amplifikasi') return kabar.amplificationRate;
			if (sortKey === 'kabar') return kabar.title.toLowerCase();
			return kabar.sentAt?.getTime() ?? kabar.scheduledAt?.getTime() ?? 0;
		};

		return [...catalog.broadcasts]
			.map((kabar) => ({ id: kabar.id, kabar }))
			.sort((a, b) => {
				const kiri = nilaiUrut(a);
				const kanan = nilaiUrut(b);
				if (kiri === kanan) return a.kabar.title.localeCompare(b.kabar.title);
				return kiri > kanan ? arah : -arah;
			});
	});

	const KOLOM = Object.freeze([
		{ key: 'kabar', label: 'Kabar', sortable: true },
		{ key: 'kanal', label: 'Kanal' },
		{ key: 'status', label: 'Status' },
		{ key: 'sentAt', label: 'Dikirim', sortable: true },
		{ key: 'jangkauan', label: 'Penerima', numeric: true, sortable: true },
		{ key: 'dibuka', label: 'Dibuka', numeric: true, sortable: true },
		{ key: 'amplifikasi', label: 'Amplifikasi', numeric: true, sortable: true }
	]);

	const naskahSiap = $derived(
		naskah.title.trim().length > 0 &&
			naskah.summary.trim().length > 0 &&
			naskah.contentId.trim().length > 0
	);

	function resetNaskah() {
		naskah = {
			title: '',
			summary: '',
			body: '',
			contentId: '',
			contentSource: SUMBER_KONTEN[0].id,
			channel: BroadcastChannel.WA_KOMUNITAS,
			audience: 'Seluruh anggota Pfriends',
			lightCta: ''
		};
	}

	/**
	 * Menyimpan naskah sebagai kabar baru.
	 *
	 * Status maksimum yang dapat dibuat dari sini adalah TERJADWAL, bukan
	 * TERKIRIM. Alasannya bukan kehati-hatian teknis: M-03 menghitung hari kirim
	 * nyata, dan menandai sebuah kabar "terkirim" hanya karena tombolnya ditekan
	 * akan menaikkan KPI diseminasi tanpa satu pun anggota benar-benar
	 * menerimanya. Pengiriman sesungguhnya milik kanal WA dan surel di luar
	 * aplikasi ini.
	 *
	 * @param {string} status Salah satu BroadcastStatus.
	 * @returns {Promise<void>}
	 */
	async function simpanKabar(status) {
		if (!naskahSiap) {
			toast.push({
				type: ToastType.WARNING,
				title: 'Naskah belum lengkap',
				message: 'Judul, ringkasan, dan kode materi konten wajib terisi sebelum kabar disimpan.'
			});
			return;
		}

		sedangMenyimpan = true;
		try {
			const sekarang = new Date();
			await broadcastRepository.save({
				id: `KBR-${sekarang.getTime().toString(36).toUpperCase()}`,
				title: naskah.title.trim(),
				summary: naskah.summary.trim(),
				body: naskah.body.trim(),
				status,
				channel: naskah.channel,
				contentIds: [naskah.contentId.trim()],
				contentSource: naskah.contentSource,
				lightCta: naskah.lightCta.trim(),
				audience: naskah.audience.trim(),
				scheduledAt: status === BroadcastStatus.TERJADWAL ? sekarang.toISOString() : null,
				recipientCount: 0
			});

			await Promise.all([catalog.refresh(), admin.refresh()]);
			penyusunTerbuka = false;
			resetNaskah();

			toast.push({
				type: ToastType.SUCCESS,
				title: status === BroadcastStatus.TERJADWAL ? 'Kabar dijadwalkan' : 'Draf kabar tersimpan',
				message:
					status === BroadcastStatus.TERJADWAL
						? 'Kabar masuk antrean diseminasi. KPI frekuensi baru bertambah setelah kabar benar-benar terkirim.'
						: 'Naskah tersimpan sebagai draf dan belum terhitung pada KPI diseminasi.'
			});
		} catch (penyebab) {
			toast.push({
				type: ToastType.ERROR,
				title: 'Kabar gagal disimpan',
				message:
					penyebab instanceof Error
						? penyebab.message
						: 'Basis data peramban menolak penyimpanan. Muat ulang halaman lalu coba lagi.'
			});
		} finally {
			sedangMenyimpan = false;
		}
	}
</script>

<PageHeader
	eyebrow="Diseminasi & Amplifikasi"
	title="Kabar komunitas Pfriends"
	subtitle="Kanal kendali Pertamina Foundation atas penyebaran informasi (Hal 4). Setiap kabar membawa metrik jangkauan dan amplifikasinya sendiri, sehingga materi yang benar-benar bergerak dapat dibedakan dari yang sekadar terkirim."
>
	{#snippet actions()}
		<Button variant="primary" size="sm" iconPath={ICONS.plus} onclick={() => (penyusunTerbuka = true)}>
			Susun kabar
		</Button>
	{/snippet}
</PageHeader>

<div class="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
	{#each kpiDiseminasi as kpi (kpi.id)}
		<KpiCard
			kpi={{ ...kpi, iconPath: kpi.id === 'M-02' ? ICONS.book : ICONS.megaphone }}
		/>
	{/each}

	<StatTile
		label="Rata-rata dibuka"
		value={`${formatPersen(rataOpenRate)}`}
		hint="{formatAngka(totalDibuka)} pembukaan dari {formatAngka(totalPenerima)} pengiriman"
		iconPath={ICONS.eye}
		color="var(--color-pertamina-blue)"
	/>
	<StatTile
		label="Rata-rata amplifikasi"
		value={`${formatPersen(rataAmplifikasi)}`}
		hint="{formatAngka(totalAmplifikasi)} amplifikasi tercatat · {formatAngka(kontenUnik)} materi unik"
		iconPath={ICONS.share}
		color="var(--color-pertamina-green)"
	/>
</div>

<section aria-labelledby="judul-peringkat" class="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-5">
	<Card class="xl:col-span-3">
		<h2 id="judul-peringkat" class="mb-1 text-base font-bold text-heading">
			Kabar dengan amplifikasi tertinggi
		</h2>
		<p class="mb-3 text-sm text-ink-600">
			Porsi penerima yang meneruskan materi ke jaringannya. Metrik inilah yang membedakan konten
			yang dibaca dari konten yang bergerak.
		</p>

		<AmplificationBarChart data={peringkatAmplifikasi} unit="%" loading={catalog.loading} />

		<!--
			Ritme diseminasi dipasang di halaman ini, bukan hanya di dasbor: M-02 dan
			M-03 adalah dua KPI yang dijelaskan panel di sebelah kanan, dan penjelasan
			yang tidak berdampingan dengan angkanya jarang dibaca sampai selesai.
		-->
		<div class="mt-5 border-t border-ink-100 pt-4">
			<h3 class="text-base font-bold text-heading">Ritme diseminasi sepanjang program</h3>
			<p class="mb-3 text-sm text-ink-600">
				Batang membaca stok materi unik per bulan (M-02); garis membaca hari kirim unik (M-03).
				Keduanya memakai sumbu nilai sendiri karena skalanya memang tidak sebanding.
			</p>
			<DisseminationComboChart
				data={admin.dissemination}
				targetKonten={targetKpi('M-02').target}
				targetHari={targetKpi('M-03').target}
				height="280px"
				loading={admin.loading}
			/>
		</div>
	</Card>

	<Card class="xl:col-span-2">
		<h2 class="mb-3 text-base font-bold text-heading">Cara dua KPI ini dibaca</h2>

		<ul class="space-y-3">
			<li class="rounded-card border border-ink-100 p-3">
				<p class="text-sm font-semibold text-ink-800">M-02 — stok materi</p>
				<p class="mt-1 text-xs leading-relaxed text-ink-600">
					Menghitung materi konten unik bersumber Pertamina dan/atau Pertamina Foundation yang
					terbit bulan ini. Satu materi yang dikirim ulang tiga kali tetap dihitung satu.
				</p>
			</li>
			<li class="rounded-card border border-ink-100 p-3">
				<p class="text-sm font-semibold text-ink-800">M-03 — ritme komunikasi</p>
				<p class="mt-1 text-xs leading-relaxed text-ink-600">
					Menghitung hari kalender unik yang punya minimal satu kabar terkirim. Lima pesan
					serentak dalam satu pagi adalah satu kali diseminasi, bukan lima.
				</p>
			</li>
			<li class="rounded-card border border-warning/25 bg-warning-tint/40 p-3">
				<p class="flex items-center gap-1.5 text-sm font-semibold text-heading">
					<Icon path={ICONS.warning} size={15} />
					Volume tinggi bukan prestasi
				</p>
				<p class="mt-1 text-xs leading-relaxed text-ink-600">
					Kenaikan jumlah kiriman tanpa kenaikan amplifikasi adalah tanda kelelahan audiens.
					Perhatikan kedua angka bersamaan, jangan salah satunya saja.
				</p>
			</li>
		</ul>
	</Card>
</section>

<h2 class="mb-3 text-base font-bold text-heading">Seluruh kabar tersusun</h2>

<DataTable
	columns={KOLOM}
	rows={baris}
	bind:sortKey
	bind:sortDir
	loading={catalog.loading && catalog.broadcasts.length === 0}
	caption="Daftar kabar komunitas beserta kanal, status, waktu kirim, jumlah penerima, tingkat pembukaan, dan tingkat amplifikasi"
	empty="Belum ada kabar tersusun. Mulai dari tombol Susun kabar di kanan atas halaman."
	onRowClick={(row) => (kabarTerpilih = row.kabar)}
>
	{#snippet cell(row, kolom)}
		{@const kabar = row.kabar}

		{#if kolom.key === 'kabar'}
			<span class="block min-w-0 max-w-md">
				<span class="block truncate font-semibold text-ink-900">{kabar.title}</span>
				<span class="block truncate text-xs text-ink-500">{kabar.summary}</span>
			</span>
		{:else if kolom.key === 'kanal'}
			<span class="whitespace-nowrap">{kabar.channelLabel}</span>
		{:else if kolom.key === 'status'}
			<StatusBadge label={kabar.statusMeta.label} color={kabar.statusMeta.badgeColor} size="sm" withDot />
		{:else if kolom.key === 'sentAt'}
			<span class="whitespace-nowrap text-xs">
				{kabar.sentAt
					? formatTanggal(kabar.sentAt, 'pendek')
					: kabar.scheduledAt
						? `Jadwal ${formatTanggal(kabar.scheduledAt, 'pendek')}`
						: 'Belum dijadwalkan'}
			</span>
		{:else if kolom.key === 'jangkauan'}
			{formatAngka(kabar.recipientCount)}
		{:else if kolom.key === 'dibuka'}
			{kabar.recipientCount > 0 ? formatPersen(kabar.openRate) : '—'}
		{:else if kolom.key === 'amplifikasi'}
			{kabar.recipientCount > 0 ? formatPersen(kabar.amplificationRate) : '—'}
		{:else}
			—
		{/if}
	{/snippet}
</DataTable>

<!-- ── Detail satu kabar ───────────────────────────────────────────────── -->
<Modal
	open={kabarTerpilih !== null}
	title={kabarTerpilih?.title ?? 'Detail kabar'}
	size="lg"
	onclose={() => (kabarTerpilih = null)}
>
	{#if kabarTerpilih}
		{@const kabar = kabarTerpilih}
		<div class="space-y-4">
			<div class="flex flex-wrap gap-2">
				<StatusBadge label={kabar.statusMeta.label} color={kabar.statusMeta.badgeColor} size="sm" withDot />
				<StatusBadge label={kabar.channelLabel} color="navy" size="sm" iconPath={ICONS.megaphone} />
				{#each kabar.contentIds as kode (kode)}
					<StatusBadge label={kode} color="slate" size="sm" />
				{/each}
			</div>

			<p class="text-sm leading-relaxed text-ink-700">{kabar.summary}</p>

			{#if kabar.body}
				<div class="rounded-card border border-ink-100 bg-ink-50 p-3">
					<p class="label-micro mb-1.5">Isi kabar</p>
					<p class="text-sm leading-relaxed whitespace-pre-line text-ink-700">{kabar.body}</p>
				</div>
			{/if}

			{#if kabar.recipientCount > 0}
				<div class="space-y-3">
					<div>
						<div class="mb-1 flex items-baseline justify-between text-xs">
							<span class="font-medium text-ink-600">Dibuka</span>
							<span class="numeric font-semibold text-ink-800">
								{formatAngka(kabar.openCount)} dari {formatAngka(kabar.recipientCount)} ·
								{formatPersen(kabar.openRate)}
							</span>
						</div>
						<ProgressBar
							value={kabar.openRate}
							max={100}
							color="var(--color-pertamina-blue)"
							label="Tingkat pembukaan kabar"
						/>
					</div>

					<div>
						<div class="mb-1 flex items-baseline justify-between text-xs">
							<span class="font-medium text-ink-600">Diamplifikasi</span>
							<span class="numeric font-semibold text-ink-800">
								{formatAngka(kabar.amplificationCount)} anggota ·
								{formatPersen(kabar.amplificationRate)}
							</span>
						</div>
						<ProgressBar
							value={kabar.amplificationRate}
							max={100}
							color="var(--color-pertamina-green)"
							label="Tingkat amplifikasi kabar"
						/>
					</div>
				</div>
			{:else}
				<EmptyState
					title="Belum ada metrik jangkauan"
					message="Angka pembukaan dan amplifikasi muncul setelah kabar benar-benar dikirim ke anggota."
					iconPath={ICONS.megaphone}
					size="sm"
				/>
			{/if}

			<dl class="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
				<div>
					<dt class="label-micro">Sasaran</dt>
					<dd class="mt-0.5 text-sm text-ink-800">{kabar.audience || 'Seluruh anggota Pfriends'}</dd>
				</div>
				<div>
					<dt class="label-micro">Sumber materi</dt>
					<dd class="mt-0.5 text-sm text-ink-800">{kabar.contentSource || 'Tidak dicantumkan'}</dd>
				</div>
				{#if kabar.lightCta}
					<div class="sm:col-span-2">
						<dt class="label-micro">Ajakan ringan</dt>
						<dd class="mt-0.5 text-sm text-ink-800">{kabar.lightCta}</dd>
					</div>
				{/if}
			</dl>
		</div>
	{/if}

	{#snippet footer()}
		<Button variant="secondary" onclick={() => (kabarTerpilih = null)}>Tutup</Button>
	{/snippet}
</Modal>

<!-- ── Penyusun kabar ──────────────────────────────────────────────────── -->
<Modal
	open={penyusunTerbuka}
	title="Susun kabar komunitas"
	size="lg"
	onclose={() => (penyusunTerbuka = false)}
>
	<div class="space-y-4">
		<p class="rounded-card border border-info/25 bg-info-tint/40 p-3 text-xs leading-relaxed text-ink-700">
			Kabar yang disusun di sini tersimpan sebagai draf atau jadwal. Pengiriman sesungguhnya
			berjalan lewat kanal WA Komunitas dan surel di luar aplikasi, sehingga KPI frekuensi
			diseminasi hanya bertambah setelah kabar benar-benar terkirim.
		</p>

		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
			<label class="block sm:col-span-2">
				<span class="label-micro">Judul kabar</span>
				<input
					type="text"
					bind:value={naskah.title}
					placeholder="Mis. Kelas Pemasaran Digital Batch 3 Dibuka"
					class="mt-1 h-11 w-full rounded-control border border-ink-200 bg-surface px-3 text-sm text-ink-900 placeholder:text-ink-400 focus:border-pertamina-red focus:outline-none"
				/>
			</label>

			<label class="block sm:col-span-2">
				<span class="label-micro">Ringkasan satu kalimat</span>
				<input
					type="text"
					bind:value={naskah.summary}
					placeholder="Kalimat yang muncul di notifikasi dan daftar kabar anggota"
					class="mt-1 h-11 w-full rounded-control border border-ink-200 bg-surface px-3 text-sm text-ink-900 placeholder:text-ink-400 focus:border-pertamina-red focus:outline-none"
				/>
			</label>

			<label class="block">
				<span class="label-micro">Kode materi konten</span>
				<input
					type="text"
					bind:value={naskah.contentId}
					placeholder="Mis. KNT-2026-07-D"
					class="numeric mt-1 h-11 w-full rounded-control border border-ink-200 bg-surface px-3 text-sm text-ink-900 placeholder:text-ink-400 focus:border-pertamina-red focus:outline-none"
				/>
				<span class="mt-1 block text-xs text-ink-500">
					Penanda materi unik — dasar perhitungan volume konten M-02.
				</span>
			</label>

			<label class="block">
				<span class="label-micro">Sumber materi</span>
				<select
					bind:value={naskah.contentSource}
					class="mt-1 h-11 w-full rounded-control border border-ink-200 bg-surface px-3 text-sm text-ink-900 focus:border-pertamina-red focus:outline-none"
				>
					{#each SUMBER_KONTEN as sumber (sumber.id)}
						<option value={sumber.id}>{sumber.label}</option>
					{/each}
				</select>
			</label>

			<label class="block">
				<span class="label-micro">Kanal penyebaran</span>
				<select
					bind:value={naskah.channel}
					class="mt-1 h-11 w-full rounded-control border border-ink-200 bg-surface px-3 text-sm text-ink-900 focus:border-pertamina-red focus:outline-none"
				>
					{#each Object.entries(BROADCAST_CHANNEL_LABEL) as [kode, label] (kode)}
						<option value={kode}>{label}</option>
					{/each}
				</select>
			</label>

			<label class="block">
				<span class="label-micro">Sasaran penerima</span>
				<input
					type="text"
					bind:value={naskah.audience}
					class="mt-1 h-11 w-full rounded-control border border-ink-200 bg-surface px-3 text-sm text-ink-900 placeholder:text-ink-400 focus:border-pertamina-red focus:outline-none"
				/>
			</label>

			<label class="block sm:col-span-2">
				<span class="label-micro">Isi kabar</span>
				<textarea
					bind:value={naskah.body}
					rows="5"
					placeholder="Uraian lengkap yang dibaca anggota di halaman Kabar Pfriends."
					class="mt-1 w-full rounded-control border border-ink-200 bg-surface px-3 py-2.5 text-sm leading-relaxed text-ink-900 placeholder:text-ink-400 focus:border-pertamina-red focus:outline-none"
				></textarea>
			</label>

			<label class="block sm:col-span-2">
				<span class="label-micro">Ajakan ringan</span>
				<input
					type="text"
					bind:value={naskah.lightCta}
					placeholder="Mis. Balas pesan ini bila Anda ingin ikut kelasnya."
					class="mt-1 h-11 w-full rounded-control border border-ink-200 bg-surface px-3 text-sm text-ink-900 placeholder:text-ink-400 focus:border-pertamina-red focus:outline-none"
				/>
				<span class="mt-1 block text-xs text-ink-500">
					Menanggapi ajakan ringan adalah salah satu aksi berpoin pada tabel skor.
				</span>
			</label>
		</div>

		{#if naskahSiap}
			<div class="rounded-card border border-ink-100 bg-ink-50 p-3">
				<p class="label-micro mb-1.5">Pratinjau di daftar kabar anggota</p>
				<p class="text-sm font-semibold text-ink-900">{naskah.title}</p>
				<p class="mt-0.5 text-xs text-ink-600">{naskah.summary}</p>
				<p class="mt-1.5 text-xs text-ink-500">
					{BROADCAST_CHANNEL_LABEL[naskah.channel]} · {naskah.contentSource} ·
					<span class="numeric">{naskah.contentId}</span>
				</p>
			</div>
		{/if}
	</div>

	{#snippet footer()}
		<Button variant="ghost" onclick={() => (penyusunTerbuka = false)}>Batal</Button>
		<Button
			variant="secondary"
			loading={sedangMenyimpan}
			disabled={!naskahSiap}
			onclick={() => simpanKabar(BroadcastStatus.DRAF)}
		>
			Simpan draf
		</Button>
		<Button
			variant="primary"
			iconPath={ICONS.calendar}
			loading={sedangMenyimpan}
			disabled={!naskahSiap}
			onclick={() => simpanKabar(BroadcastStatus.TERJADWAL)}
		>
			Jadwalkan
		</Button>
	{/snippet}
</Modal>
