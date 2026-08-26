<script>
	/**
	 * HALAMAN: Baca & Amplifikasi Kabar.
	 *
	 * Tanggung jawab: menyajikan isi satu kabar, lalu menyediakan tiga jalur
	 * amplifikasi beserta poinnya persis seperti tabel Hal 11.
	 *
	 * Ini mesin utama KPI Hal 6 ("50% awardee melakukan amplifikasi"), dan karena
	 * itu tidak ada halaman "Amplifikasi" tersendiri: amplifikasi adalah aksi DI
	 * ATAS konten, bukan destinasi (07-UX §1.2 butir 4). Menaruhnya di halaman
	 * terpisah berarti menambah satu ketukan pada langkah yang paling ingin
	 * dipermudah.
	 *
	 * Satu keputusan yang membentuk halaman ini: **bagikan ke media sosial publik
	 * meminta tautan bukti LEBIH DULU, bukan sesudah poin diberikan.** Tanpa
	 * tautan, mesin mencatat aksinya sebagai menunggu bukti dengan poin nol :
	 * jujur, tetapi mengecewakan bila awardee baru mengetahuinya setelah menekan.
	 * Meminta buktinya di muka membuat janji poin di tombol selalu benar.
	 *
	 * Dua aksi bersifat sekali per kabar (membaca dan menanggapi ajakan), dua
	 * lainnya memang boleh berulang ke kanal yang berbeda. Perbedaan itu tercermin
	 * pada `refId`: yang sekali-per-objek merujuk kabarnya sehingga dapat dikenali
	 * sebagai sudah diklaim, yang berulang menyimpan konteksnya di catatan dan
	 * bukti agar setiap kejadian tetap tercatat sebagai baris tersendiri.
	 *
	 * @see docs/00-SOURCE-BRIEF.md: Hal 11 tabel skor, Hal 6 KPI amplifikasi
	 * @see docs/03-GAMIFICATION-SPEC.md: §5.2 kunci idempotensi per aksi
	 */
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { startBroadcast } from '$lib/infrastructure/pocketbase/broadcasts.js';
	import {
		Button,
		Card,
		EmptyState,
		Icon,
		Modal,
		PageHeader,
		PointsChip,
		StatusBadge,
		ICONS
	} from '$lib/components';
	import { ActivityType, aturanSkor } from '$lib/domain/constants/scoring-table.js';
	import { catalog, CatalogKind } from '$lib/stores/catalog.svelte.js';
	import { gamification } from '$lib/stores/gamification.svelte.js';
	import { activitySubmissions } from '$lib/stores/activity-submissions.svelte.js';
	import { toast } from '$lib/stores/toast.svelte.js';
	import { formatRelatif, formatTanggal, frasaHitung } from '$lib/utils/format.js';

	/**
	 * Panjang minimum tanggapan agar dianggap bermakna (docs/03 §5.2 - balasan
	 * ≥ 20 karakter, bukan emoji atau satu kata). Ini ambang MUTU tanggapan, bukan
	 * angka gamifikasi, sehingga tempatnya memang di halaman yang memungutnya.
	 */
	const MIN_KARAKTER_TANGGAPAN = 20;

	const aturanBaca = aturanSkor(ActivityType.BROADCAST_VIEW);
	const aturanTanggapi = aturanSkor(ActivityType.CTA_REACT);
	const aturanBagikanPribadi = aturanSkor(ActivityType.SHARE_PRIVATE);
	const aturanBagikanPublik = aturanSkor(ActivityType.SHARE_PUBLIC);

	const idKabar = $derived(page.params.id ?? '');
	const kabar = $derived(catalog.byId(CatalogKind.BROADCAST, idKabar));

	onMount(async () => {
		await catalog.load();
	});

	/**
	 * Seluruh entri buku besar yang menyangkut kabar ini.
	 *
	 * Dua jalur pencocokan karena dua jenis aksi menyimpan konteksnya secara
	 * berbeda: yang sekali-per-kabar merujuk lewat `refId`, yang boleh berulang
	 * menyimpan judul kabar di catatannya. Pencocokan judul hanya berjalan bila
	 * judulnya memang ada - tanpa penjaga itu, judul kosong akan mencocoki
	 * seluruh isi buku besar sekaligus.
	 */
	const kontribusiKabarIni = $derived.by(() => {
		const judul = kabar?.title ?? '';
		return gamification.ledger.filter((entri) => {
			if (entri.refId === idKabar) return true;
			return judul !== '' && (entri.note ?? '').includes(judul);
		});
	});

	/** Sisa kuota harian dua aksi amplifikasi - dibaca sekali, dipakai di beberapa tempat. */
	const kuotaBagikanPribadi = $derived(gamification.usageFor(ActivityType.SHARE_PRIVATE));
	const kuotaBagikanPublik = $derived(gamification.usageFor(ActivityType.SHARE_PUBLIC));

	/**
	 * Apakah sebuah aksi sekali-per-kabar sudah pernah diklaim.
	 * @param {string} activityType
	 * @returns {boolean}
	 */
	function sudahDiklaim(activityType) {
		return gamification.ledger.some(
			(entri) => entri.activityType === activityType && entri.refId === idKabar
		);
	}

	const bacaSelesai = $derived(sudahDiklaim(ActivityType.BROADCAST_VIEW));
	const tanggapanSelesai = $derived(sudahDiklaim(ActivityType.CTA_REACT));

	/** @type {string} Isi tanggapan atas ajakan ringan. */
	let tanggapan = $state('');

	/** @type {boolean} Dialog tautan bukti sedang terbuka. */
	let dialogBuktiTerbuka = $state(false);

	/** @type {string} Tautan unggahan media sosial yang dilampirkan awardee. */
	let tautanBukti = $state('');

	/** @type {string} Platform tujuan unggahan. */
	let platformBukti = $state('Instagram');

	/** @type {string} Pesan galat pada dialog bukti. */
	let galatBukti = $state('');
	let berkasBukti = $state.raw([]);
	/** @type {HTMLInputElement|null} */
	let inputBukti = $state(null);
	let jenisBukti = $state('SHARE_PUBLIC');
	let sisaBaca = $state(15);
	let sesiDimulai = $state('');

	$effect(() => {
		if (!kabar || bacaSelesai || sesiDimulai === kabar.id) return;
		sesiDimulai = kabar.id;
		startBroadcast(kabar.id).then(({ unlockAt }) => {
			const perbarui = () => (sisaBaca = Math.max(0, Math.ceil((new Date(unlockAt).getTime() - Date.now()) / 1000)));
			perbarui(); const timer = setInterval(perbarui, 500); setTimeout(() => clearInterval(timer), 17000);
		}).catch((error) => toast.error('Sesi baca gagal dimulai', error.message));
	});

	const PLATFORM_PUBLIK = ['Instagram', 'LinkedIn', 'X', 'Facebook', 'TikTok', 'YouTube'];
	const pilihanPlatform = $derived(
		jenisBukti === 'SHARE_PRIVATE' ? ['WhatsApp'] : PLATFORM_PUBLIK
	);

	const tanggapanCukup = $derived(tanggapan.trim().length >= MIN_KARAKTER_TANGGAPAN);

	/**
	 * Teks siap salin untuk dibagikan awardee. Disusun dari isi kabar, bukan
	 * dikarang di sini - awardee yang harus menulis ulang ringkasannya sendiri
	 * adalah gesekan yang langsung menurunkan angka amplifikasi.
	 */
	const teksBagikan = $derived(
		kabar
			? `${kabar.title}\n\n${kabar.summary}\n\nSelengkapnya: ${kabar.ctaLink || 'https://pertaminafoundation.org/pfriends'}\n\n#PFriends #PertaminaFoundation`
			: ''
	);

	/**
	 * Kalimat sisa kuota yang menyebut kapan kuotanya pulih.
	 * @param {import('$lib/domain/services/GamificationEngine.js').DailyUsageRow|null} baris
	 * @returns {string}
	 */
	function kalimatKuota(baris) {
		if (!baris) return '';
		if (baris.exhausted) return 'Kuota harian aksi ini sudah penuh. Poin kembali tersedia besok.';
		return `Sisa ${frasaHitung(baris.remaining, 'kali')} hari ini.`;
	}

	/** Menandai kabar selesai dibaca. */
	async function tandaiDibaca() {
		if (!kabar || bacaSelesai) return;
		await gamification.perform(ActivityType.BROADCAST_VIEW, {
			refId: kabar.id,
			note: kabar.title
		});
	}

	/** Mengirim tanggapan atas ajakan ringan. */
	async function kirimTanggapan() {
		if (!kabar || !tanggapanCukup || tanggapanSelesai) return;
		const hasil = await gamification.perform(ActivityType.CTA_REACT, {
			refId: kabar.id,
			note: tanggapan.trim()
		});
		if (hasil.accepted) tanggapan = '';
	}

	/**
	 * Membagikan ke jaringan pribadi.
	 *
	 * Tanpa `refId`: membagikan kabar yang sama ke grup WhatsApp yang berbeda
	 * adalah dua amplifikasi yang sah, dan keduanya berhak menjadi dua baris
	 * terpisah di buku besar.
	 */
	function bagikanKeWhatsApp() {
		if (!kabar) return;
		jenisBukti = 'SHARE_PRIVATE'; platformBukti = 'WhatsApp'; tautanBukti = ''; berkasBukti = []; galatBukti = '';
		dialogBuktiTerbuka = true;
	}

	const tautanWhatsApp = $derived(`https://wa.me/?text=${encodeURIComponent(teksBagikan)}`);

	function bukaDialogBukti() {
		jenisBukti = 'SHARE_PUBLIC';
		platformBukti = 'Instagram';
		galatBukti = '';
		tautanBukti = '';
		dialogBuktiTerbuka = true;
	}

	/** Membagikan ke media sosial publik, disertai tautan bukti unggahannya. */
	async function kirimBuktiPublik() {
		if (!kabar) return;
		const tautan = tautanBukti.trim();

		if (jenisBukti === 'SHARE_PUBLIC' && tautan === '') {
			galatBukti = 'Tautan unggahan wajib diisi agar poin dapat dibukukan.';
			return;
		}
		if (jenisBukti === 'SHARE_PUBLIC' && !/^https?:\/\/\S+\.\S+/.test(tautan)) {
			galatBukti = 'Tautan harus berupa alamat lengkap, mis. https://instagram.com/p/...';
			return;
		}

		if (berkasBukti.length === 0) { galatBukti = 'Lampirkan minimal satu tangkapan layar atau PDF.'; return; }
		galatBukti = '';
		try { await activitySubmissions.submitBroadcastShare(kabar, platformBukti, tautan, berkasBukti, jenisBukti); dialogBuktiTerbuka=false; berkasBukti=[]; toast.success('Bukti terkirim','Poin diberikan setelah disetujui Verifikator.'); }
		catch(error){ galatBukti=error.message; }
	}

	/** Menyalin teks bagikan ke papan klip. */
	async function salinTeks() {
		try {
			await navigator.clipboard.writeText(teksBagikan);
			toast.success('Teks tersalin', 'Tempel di WhatsApp atau media sosialmu, lalu catat aksinya di sini.');
		} catch {
			toast.warning(
				'Peramban menolak akses papan klip',
				'Pilih teksnya secara manual lalu salin dengan Ctrl+C.'
			);
		}
	}
</script>

<svelte:head>
	<title>{kabar ? kabar.title : 'Kabar tidak ditemukan'} · PFriends</title>
</svelte:head>

{#if !kabar}
	<EmptyState
		title="Kabar tidak ditemukan"
		message="Kabar yang kamu tuju mungkin sudah ditarik atau tautannya tidak lagi berlaku."
		iconPath={ICONS.megaphone}
		actionLabel="Kembali ke daftar kabar"
		actionHref="/awardee/kabar"
	/>
{:else}
	<PageHeader
		title={kabar.title}
		eyebrow="{kabar.channelLabel} · {formatTanggal(kabar.sentAt, 'pendek')}"
		backHref="/awardee/kabar"
		backLabel="Kabar PFriends"
	/>

	<!-- `[&>*]:min-w-0`: butir grid berbaku `min-width: auto`. Kolom isi kabar memuat
	     teks siap bagikan dan kartu amplifikasi yang lebar min-content-nya 372 px,
	     jadi tanpa izin menyusut kolomnya menahan lebar itu dan halaman menggulir
	     mendatar di 375 px. -->
	<div class="grid gap-4 lg:grid-cols-3 [&>*]:min-w-0">
		<!-- Isi kabar -->
		<div class="space-y-4 lg:col-span-2">
			<Card padding="lg">
				<div class="flex flex-wrap items-center gap-2">
					{#if bacaSelesai}
						<StatusBadge label="Sudah dibaca" color="green" size="sm" iconPath={ICONS.check} />
					{:else}
						<StatusBadge label="Belum ditandai dibaca" color="amber" size="sm" withDot />
					{/if}
					{#if kabar.contentSource}
						<span class="label-micro">{kabar.contentSource}</span>
					{/if}
					<span class="text-[11px] text-ink-600">{formatRelatif(kabar.sentAt)}</span>
				</div>

				<p class="mt-4 text-base leading-relaxed font-semibold text-ink-800">{kabar.summary}</p>

				{#if kabar.body}
					<div class="mt-4 space-y-3 text-sm leading-relaxed text-ink-700">
						{#each kabar.body.split('\n').filter((baris) => baris.trim() !== '') as paragraf, i (i)}
							<p>{paragraf}</p>
						{/each}
					</div>
				{/if}

				<div class="mt-6 border-t border-ink-100 pt-4">
					<Button
						variant={bacaSelesai ? 'ghost' : 'primary'}
						size="md"
						disabled={bacaSelesai || sisaBaca > 0}
						loading={gamification.busy === ActivityType.BROADCAST_VIEW}
						iconPath={bacaSelesai ? ICONS.checkCircle : ICONS.check}
						onclick={tandaiDibaca}
					>
						{bacaSelesai
							? 'Poin baca sudah diklaim'
							: sisaBaca > 0 ? `Baca ${sisaBaca} detik lagi` : `Sudah dibaca · +${aturanBaca.points} poin`}
					</Button>
					{#if !bacaSelesai}
						<p class="mt-2 text-xs text-ink-600">
							Poin baca diberikan satu kali untuk setiap kabar, sepanjang keanggotaanmu.
						</p>
					{/if}
				</div>
			</Card>

			<!-- Ajakan ringan -->
			{#if kabar.hasCta}
				<Card padding="lg">
					<div class="flex items-center gap-2">
						<Icon path={ICONS.sparkles} size={18} class="text-pertamina-navy" />
						<h2 class="text-sm font-bold text-heading">Ajakan dari Pertamina Foundation</h2>
						<PointsChip points={aturanTanggapi.points} currency="PK" size="sm" showLabel={false} />
					</div>

					<p class="mt-2 rounded-xl bg-surface-soft p-3 text-sm text-ink-700">{kabar.lightCta}</p>

					{#if tanggapanSelesai}
						<p class="mt-3 flex items-center gap-2 text-sm text-success">
							<Icon path={ICONS.checkCircle} size={16} />
							Tanggapanmu untuk kabar ini sudah tercatat.
						</p>
					{:else}
						<label class="mt-4 block">
							<span class="label-micro">Tanggapanmu</span>
							<textarea
								bind:value={tanggapan}
								rows="3"
								maxlength="400"
								placeholder="Tulis tanggapan yang bermanfaat bagi awardee lain…"
								class="mt-1.5 w-full rounded-control border border-ink-200 bg-surface p-3 text-sm text-ink-800 transition-colors outline-none placeholder:text-ink-450 focus:border-pertamina-blue"
							></textarea>
						</label>

						<div class="mt-2 flex flex-wrap items-center justify-between gap-2">
							<p class="numeric text-xs {tanggapanCukup ? 'text-success' : 'text-ink-600'}">
								{tanggapan.trim().length} / {MIN_KARAKTER_TANGGAPAN} karakter minimum
							</p>
							<Button
								variant="secondary"
								size="sm"
								disabled={!tanggapanCukup}
								loading={gamification.busy === ActivityType.CTA_REACT}
								onclick={kirimTanggapan}
							>
								Kirim tanggapan · +{aturanTanggapi.points} poin
							</Button>
						</div>
						<p class="mt-2 text-xs leading-relaxed text-ink-600">
							Tanggapan minimal {MIN_KARAKTER_TANGGAPAN} karakter agar poin diberikan - balasan satu
							kata atau emoji saja tidak menambah apa pun bagi komunitas.
						</p>
					{/if}
				</Card>
			{/if}
		</div>

		<!-- Panel amplifikasi -->
		<div class="space-y-4">
			<Card padding="lg" variant="highlight">
				<h2 class="text-sm font-bold text-heading">Sebarkan kabar ini</h2>
				<p class="mt-1 text-xs leading-relaxed text-ink-600">
					Satu awardee rata-rata memiliki 25–500 jaringan sosial. Amplifikasimu adalah jangkauan
					organik Pertamina Foundation tanpa biaya iklan.
				</p>

				<div class="mt-4 space-y-3">
					<!-- Bagikan ke WhatsApp -->
					<div>
						<Button
							variant="primary"
							size="md"
							fullWidth
							iconPath={ICONS.whatsapp}
							disabled={Boolean(kuotaBagikanPribadi?.exhausted)}
							loading={activitySubmissions.working && jenisBukti === 'SHARE_PRIVATE'}
							onclick={bagikanKeWhatsApp}
						>
							Bagikan ke WhatsApp · bukti +{aturanBagikanPribadi.points}
						</Button>
						<p
							class="mt-1.5 text-[11px] leading-relaxed {kuotaBagikanPribadi?.exhausted
								? 'text-warning'
								: 'text-ink-600'}"
						>
							{kalimatKuota(kuotaBagikanPribadi)}
						</p>
					</div>

					<!-- Bagikan ke media sosial publik -->
					<div>
						<Button
							variant="outline"
							size="md"
							fullWidth
							iconPath={ICONS.share}
							disabled={Boolean(kuotaBagikanPublik?.exhausted)}
							loading={gamification.busy === ActivityType.SHARE_PUBLIC}
							onclick={bukaDialogBukti}
						>
							Bagikan ke media sosial · +{aturanBagikanPublik.points}
						</Button>
						<p
							class="mt-1.5 text-[11px] leading-relaxed {kuotaBagikanPublik?.exhausted
								? 'text-warning'
								: 'text-ink-600'}"
						>
							{#if kuotaBagikanPublik?.exhausted}
								{kalimatKuota(kuotaBagikanPublik)}
							{:else}
								Butuh tautan unggahan sebagai bukti. {kalimatKuota(kuotaBagikanPublik)}
							{/if}
						</p>
					</div>
				</div>
			</Card>

			<!-- Teks siap bagikan -->
			<Card padding="lg">
				<div class="flex items-center justify-between gap-2">
					<h2 class="text-sm font-bold text-heading">Teks siap bagikan</h2>
					<Button variant="ghost" size="sm" iconPath={ICONS.document} onclick={salinTeks}>
						Salin
					</Button>
				</div>
				<pre
					class="mt-2 max-h-56 overflow-auto rounded-xl bg-surface-soft p-3 text-xs leading-relaxed whitespace-pre-wrap text-ink-700">{teksBagikan}</pre>
			</Card>

			<!-- Kontribusi pada kabar ini -->
			<Card padding="lg">
				<h2 class="text-sm font-bold text-heading">Kontribusimu di kabar ini</h2>
				{#if kontribusiKabarIni.length === 0}
					<p class="mt-2 text-xs leading-relaxed text-ink-600">
						Belum ada aksi tercatat untuk kabar ini. Mulai dari menandainya sudah dibaca.
					</p>
				{:else}
					<ul class="mt-3 space-y-2.5">
						{#each kontribusiKabarIni as entri (entri.id)}
							<li class="flex items-start justify-between gap-3">
								<span class="min-w-0">
									<span class="block text-xs font-semibold text-ink-800">{entri.label}</span>
									<span class="block text-[11px] text-ink-600">
										{formatTanggal(entri.occurredAt, 'waktu')}
									</span>
								</span>
								<span class="flex shrink-0 flex-col items-end gap-1">
									<span class="numeric text-xs font-bold text-ink-900">+{entri.points}</span>
									<StatusBadge
										label={entri.statusMeta.label}
										color={entri.statusMeta.badgeColor}
										size="sm"
									/>
								</span>
							</li>
						{/each}
					</ul>
				{/if}
			</Card>
		</div>
	</div>

	<!-- Dialog tautan bukti unggahan publik -->
	<Modal
		open={dialogBuktiTerbuka}
		title={jenisBukti === 'SHARE_PRIVATE' ? 'Lampirkan bukti WhatsApp' : 'Lampirkan tautan unggahan'}
		size="md"
		onclose={() => (dialogBuktiTerbuka = false)}
	>
		<p class="text-sm leading-relaxed text-ink-600">
			{jenisBukti === 'SHARE_PRIVATE' ? 'Poin WhatsApp tidak diberikan saat tab dibuka. Unggah screenshot pesan yang benar-benar sudah terkirim untuk diperiksa Verifikator.' : 'Poin amplifikasi publik diberikan setelah tautan dan bukti diperiksa Verifikator.'}
		</p>

		<div class="mt-4 space-y-4">
			{#if jenisBukti === 'SHARE_PRIVATE'}
				<a
					href={tautanWhatsApp}
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-control bg-pertamina-red-ink px-4 py-2.5 text-sm font-semibold text-white hover:bg-pertamina-red-dark"
				>
					<Icon path={ICONS.whatsapp} size={18} /> Buka WhatsApp
				</a>
				<p class="text-xs leading-relaxed text-ink-600">Setelah pesan terkirim, kembali ke dialog ini dan pilih tangkapan layarnya.</p>
			{/if}
			<label class="block">
				<span class="label-micro">Platform tujuan</span>
				<select
					bind:value={platformBukti}
					class="mt-1.5 w-full rounded-control border border-ink-200 bg-surface p-2.5 text-sm text-ink-800 outline-none focus:border-pertamina-blue"
				>
					{#each pilihanPlatform as nama (nama)}
						<option value={nama}>{nama}</option>
					{/each}
				</select>
			</label>

			{#if jenisBukti === 'SHARE_PUBLIC'}<label class="block">
				<span class="label-micro">Tautan unggahan</span>
				<input
					bind:value={tautanBukti}
					type="url"
					inputmode="url"
					placeholder="https://instagram.com/p/…"
					class="mt-1.5 w-full rounded-control border bg-surface p-2.5 text-sm text-ink-800 outline-none focus:border-pertamina-blue {galatBukti
						? 'border-danger'
						: 'border-ink-200'}"
				/>
				{#if galatBukti}
					<span class="mt-1.5 flex items-start gap-1.5 text-xs text-danger">
						<Icon path={ICONS.warning} size={14} />
						{galatBukti}
					</span>
				{/if}
			</label>{/if}
			<div>
				<span class="label-micro">Tangkapan layar / PDF</span>
				<input
					bind:this={inputBukti}
					type="file"
					multiple
					accept="image/jpeg,image/png,image/webp,application/pdf"
					class="sr-only"
					onchange={(e) => (berkasBukti = [...e.currentTarget.files])}
				/>
				<div class="mt-1.5">
					<Button variant="secondary" size="md" fullWidth onclick={() => inputBukti?.click()}>
						Pilih file
					</Button>
				</div>
				{#if berkasBukti.length > 0}
					<p class="mt-2 text-xs font-semibold text-success">{berkasBukti.length} file dipilih</p>
					<ul class="mt-1 space-y-1 text-xs text-ink-600">
						{#each berkasBukti as file (file.name)}<li>{file.name}</li>{/each}
					</ul>
				{:else}
					<p class="mt-2 text-xs text-ink-600">JPG, PNG, WebP, atau PDF. Maksimal 5 MB per file.</p>
				{/if}
			</div>
			{#if jenisBukti === 'SHARE_PRIVATE' && galatBukti}<p class="text-xs font-semibold text-danger" role="alert">{galatBukti}</p>{/if}
		</div>

		{#snippet footer()}
			<Button variant="ghost" size="md" onclick={() => (dialogBuktiTerbuka = false)}>Batal</Button>
			<Button variant="primary" size="md" iconPath={ICONS.check} onclick={kirimBuktiPublik}>
				Kirim bukti · +{jenisBukti === 'SHARE_PRIVATE' ? aturanBagikanPribadi.points : aturanBagikanPublik.points} poin
			</Button>
		{/snippet}
	</Modal>
{/if}
