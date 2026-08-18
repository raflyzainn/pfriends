<script>
	/**
	 * HALAMAN — Profil Saya.
	 *
	 * Tanggung jawab: menampilkan identitas awardee, capaian gamifikasinya,
	 * kontribusi yang dapat naik menjadi bukti ESG, dan kendali penuh atas
	 * persetujuan data yang pernah ia berikan.
	 *
	 * Panel consent adalah bagian terpenting halaman ini, bukan pelengkap.
	 * Pilar Governance Hal 10 menyebut "consent records" sebagai bukti yang harus
	 * dapat ditunjukkan, dan bukti itu hanya bernilai bila pemiliknya benar-benar
	 * dapat menariknya kembali. Karena itu pencabutan di sini dibuat TANPA FRIKSI:
	 * satu konfirmasi, tanpa tawaran retensi, tanpa alasan wajib. Alur pencabutan
	 * yang dipersulit adalah bentuk lain dari tidak memberi pilihan.
	 *
	 * Yang juga dijaga: mencabut consent TIDAK menurunkan poin maupun tier
	 * (docs/04 §4.5). Menghukum penggunaan hak privasi dengan kehilangan capaian
	 * akan membuat panel ini tidak pernah dipakai — dan bukti governance yang tidak
	 * pernah dipakai bukan bukti apa pun.
	 *
	 * Pencabutan memakai `ConsentRecord.revoke()` yang mengembalikan instans BARU
	 * berstatus DICABUT lengkap dengan waktu dan cara pencabutannya. Rekaman itulah
	 * yang disimpan — halaman ini tidak pernah menyunting rekaman lama di tempat.
	 *
	 * **Yang berubah pada G5.** Sebelumnya pencabutan hanya menulis ke dua tabel —
	 * `consents` dan `awardees` — dan tidak menyentuh `stories` sama sekali. Kalimat
	 * di bawah menjanjikan konten terbit "ditarik dari publik", sementara naskahnya
	 * tetap tayang dan tetap dapat disetujui verifikator. Sekarang pencabutan
	 * memanggil `editorial.applyConsentRevocation()`, yang meneruskannya ke
	 * `ContentReviewService.withdrawOnConsentRevoked()` — satu-satunya jalur yang
	 * berwenang mengubah status cerita. Halaman ini TIDAK menulis tabel `stories`
	 * sendiri: jalur kedua ke tabel yang sama akan melewati peta transisi, alasan
	 * arsip, dan jejak audit sekaligus.
	 *
	 * @see docs/00-SOURCE-BRIEF.md — Hal 10 Governance, Hal 12 gate fitur publik
	 * @see docs/04-ESG-GOVERNANCE.md — §4 rancangan consent record, §4.5 dampak pencabutan
	 */
	import {
		Avatar,
		BadgeTile,
		Button,
		Card,
		EmptyState,
		Icon,
		Modal,
		PageHeader,
		PointsChip,
		StatusBadge,
		TierProgress,
		ICONS
	} from '$lib/components';
	import { AMBANG_FITUR_PUBLIK } from '$lib/domain/constants/tier-table.js';
	import {
		ESG_ELIGIBLE_ACTIVITIES,
		ESG_PILLARS
	} from '$lib/domain/constants/esg-taxonomy.js';
	import {
		CONSENT_TYPE_META,
		ConsentStatus,
		ConsentType
	} from '$lib/domain/value-objects/ConsentRecord.js';
	import { consentRepository, awardeeRepository } from '$lib/infrastructure/repositories/index.js';
	import { catalog } from '$lib/stores/catalog.svelte.js';
	import { editorial } from '$lib/stores/editorial.svelte.js';
	import { gamification } from '$lib/stores/gamification.svelte.js';
	import { session } from '$lib/stores/session.svelte.js';
	import { toast } from '$lib/stores/toast.svelte.js';
	import { formatAngka, formatTanggal, frasaHitung } from '$lib/utils/format.js';

	/** Warna lencana untuk tiap tingkat risiko privasi. */
	const WARNA_RISIKO = Object.freeze({
		RENDAH: 'green',
		SEDANG: 'amber',
		TINGGI: 'red'
	});

	const awardee = $derived(session.awardee);

	/** @type {import('$lib/domain/value-objects/ConsentRecord.js').ConsentRecord[]} */
	let rekamanConsent = $state.raw([]);

	/** @type {boolean} */
	let consentDimuat = $state(false);

	/** @type {import('$lib/domain/value-objects/ConsentRecord.js').ConsentRecord|null} */
	let consentDikonfirmasi = $state.raw(null);

	/** @type {boolean} Pencabutan sedang diproses. */
	let sedangMencabut = $state(false);

	/**
	 * Memuat rekaman consent milik awardee yang sedang masuk.
	 * @returns {Promise<void>}
	 */
	async function muatConsent() {
		const id = session.awardee?.id;
		if (!id) return;
		rekamanConsent = await consentRepository.forAwardee(id);
		consentDimuat = true;
	}

	// Dijalankan sekali saat halaman dibuka. Penanda non-reaktif menjaga efek ini
	// tidak berjalan ulang setiap kali daftar consent-nya sendiri berubah.
	let sudahMemuat = false;
	$effect(() => {
		if (sudahMemuat) return;
		sudahMemuat = true;
		void muatConsent();
	});

	const consentAktif = $derived(rekamanConsent.filter((rekaman) => rekaman.isAktif()));
	const consentDicabut = $derived(rekamanConsent.filter((rekaman) => rekaman.isDicabut));

	/** Lencana yang sudah terkumpul, dari katalog yang sudah ditandai store. */
	const lencanaTerkumpul = $derived(gamification.badges.filter((entri) => entri.unlocked));

	/**
	 * Ringkasan kontribusi yang layak naik menjadi bukti ESG.
	 * Peta `ESG_ELIGIBLE_ACTIVITIES` yang memutuskan aksi mana yang berhak, bukan
	 * halaman ini — aksi amplifikasi tidak boleh berubah menjadi klaim dampak.
	 */
	const ringkasanEsg = $derived.by(() => {
		/** @type {Map<string, number>} */
		const perPilar = new Map(ESG_PILLARS.map((pilar) => [pilar.pillar, 0]));
		let total = 0;

		for (const entri of gamification.ledger) {
			if (!entri.isAwarded) continue;
			const pemetaan = ESG_ELIGIBLE_ACTIVITIES[entri.activityType];
			if (!pemetaan) continue;
			perPilar.set(pemetaan.pillar, (perPilar.get(pemetaan.pillar) ?? 0) + 1);
			total += 1;
		}

		return {
			total,
			baris: ESG_PILLARS.map((pilar) => ({
				pillar: pilar.pillar,
				label: pilar.label,
				deskripsi: pilar.deskripsi,
				ink: pilar.ink,
				tint: pilar.tint,
				jumlah: perPilar.get(pilar.pillar) ?? 0
			}))
		};
	});

	/** Apakah ambang poin gate fitur publik Hal 12 sudah terlampaui. */
	const poinFiturPublikTerpenuhi = $derived(gamification.points >= AMBANG_FITUR_PUBLIK);

	/**
	 * Jenis persetujuan yang menjadi dasar tayangnya sebuah naskah cerita.
	 *
	 * Dipisahkan dari "punya persetujuan aktif apa pun" dengan sengaja. Setiap
	 * awardee selalu memegang `PENGOLAHAN_DATA_INTERNAL` sejak mendaftar, sehingga
	 * "masih ada consent yang aktif" akan hampir selalu benar — dan menjadikannya
	 * dasar penarikan konten berarti mencabut persetujuan publikasi cerita tidak
	 * pernah menarik satu naskah pun.
	 * @type {string}
	 */
	const CONSENT_DASAR_CERITA = ConsentType.PUBLIKASI_CERITA;

	/**
	 * Menyusun kalimat kedua toast pencabutan: apa yang benar-benar terjadi pada
	 * naskah penulis. Kalimatnya menyebut angka, bukan janji — pengguna yang diberi
	 * tahu "konten ditarik" tanpa jumlah tidak punya cara memeriksa bahwa itu benar.
	 *
	 * @param {{withdrawn: number, blocked: number}} kaskade
	 * @returns {string}
	 */
	function ringkasanPenarikan({ withdrawn, blocked }) {
		if (withdrawn === 0 && blocked === 0) return 'Tidak ada naskah yang perlu ditarik.';
		const bagian = [];
		if (withdrawn > 0) {
			bagian.push(`${frasaHitung(withdrawn, 'naskah')} ditarik dari publik dan diarsipkan`);
		}
		if (blocked > 0) {
			// "Naskah lain", bukan "naskah di antrean": daftar ini juga memuat draf yang
			// belum pernah dikirim, dan draf tidak berada di antrean siapa pun.
			bagian.push(
				`${frasaHitung(blocked, 'naskah')} lainnya berhenti dapat disetujui maupun diterbitkan`
			);
		}
		return `${bagian.join(', ')}.`;
	}

	/**
	 * Mencabut sebuah persetujuan, lalu menjalankan konsekuensinya sampai tuntas.
	 *
	 * Tiga tulisan berurutan, dan urutannya bukan kebetulan:
	 * 1. Rekaman consent baru berstatus DICABUT disimpan — jejak audit lebih dulu,
	 *    supaya kegagalan pada langkah berikutnya tetap meninggalkan bukti bahwa
	 *    penulis pernah menyatakan kehendaknya.
	 * 2. `consentActive` pada awardee disegarkan, karena gerbang fitur publik dan
	 *    laporan tata kelola membacanya.
	 * 3. Kaskade penarikan naskah lewat store editorial — hanya bila persetujuan
	 *    yang mendasari publikasi cerita benar-benar sudah tidak ada lagi.
	 *
	 * @returns {Promise<void>}
	 */
	async function cabutConsent() {
		const rekaman = consentDikonfirmasi;
		const id = session.awardee?.id;
		if (!rekaman || !id) return;

		sedangMencabut = true;
		try {
			await consentRepository.save(rekaman.revoke());
			await muatConsent();

			const masihAda = rekamanConsent.some((entri) => entri.isAktif());
			await awardeeRepository.update(id, { consentActive: masihAda });
			await session.refresh();

			const dasarCeritaAktif = rekamanConsent.some(
				(entri) => entri.consentType === CONSENT_DASAR_CERITA && entri.isAktif()
			);

			let akibat = 'Tulisanmu tidak terpengaruh — dasar publikasi Blog-mu masih aktif.';
			if (!dasarCeritaAktif) {
				const kaskade = await editorial.applyConsentRevocation(id);
				if (!kaskade.ok) {
					toast.error(
						'Konten belum berhasil ditarik',
						'Persetujuanmu sudah tercatat dicabut, tetapi penarikan naskah dari publik gagal disimpan. Muat ulang halaman, lalu buka kembali panel ini.'
					);
					return;
				}
				akibat = ringkasanPenarikan(kaskade);
				// Katalog publik dimuat sekali per sesi; tanpa pemuatan paksa, daftar
				// cerita di zona publik masih memegang naskah yang baru saja ditarik.
				await catalog.load({ force: true });
			}

			toast.success(
				'Persetujuan dicabut',
				`"${rekaman.label}" tidak lagi menjadi dasar publikasi. Poin dan tier kamu tidak berubah. ${akibat}`
			);
		} catch (penyebab) {
			toast.error(
				'Pencabutan gagal disimpan',
				penyebab instanceof Error ? penyebab.message : 'Coba ulangi beberapa saat lagi.'
			);
		} finally {
			sedangMencabut = false;
			consentDikonfirmasi = null;
		}
	}
</script>

<svelte:head>
	<title>Profil Saya · PFfriends</title>
</svelte:head>

{#if !awardee}
	<EmptyState
		title="Data awardee belum termuat"
		message="Sesi kamu sedang dipulihkan. Bila keadaan ini bertahan, masuk ulang lewat halaman Masuk."
		iconPath={ICONS.user}
		actionLabel="Ke halaman Masuk"
		actionHref="/masuk"
	/>
{:else}
	<PageHeader
		title="Profil Saya"
		subtitle="Identitas, capaian kontribusi, dan kendali atas data pribadimu."
		eyebrow="Open Community Ecosystem"
	/>

	<div class="grid gap-4 lg:grid-cols-3">
		<!-- Identitas -->
		<Card padding="lg" class="lg:col-span-2">
			<div class="flex flex-wrap items-start gap-4">
				<Avatar name={awardee.fullName} size="xl" tier={gamification.tier.level} showRing />

				<div class="min-w-0 flex-1">
					<h2 class="text-lg font-extrabold text-heading">{awardee.fullName}</h2>
					<p class="mt-0.5 text-sm text-ink-600">
						{awardee.occupation || awardee.communityDef.peran}
					</p>

					<div class="mt-2.5 flex flex-wrap items-center gap-2">
						<StatusBadge label={awardee.communityDef.akronim} color="navy" size="sm" />
						<StatusBadge label={awardee.chapterDef.label} color="slate" size="sm" />
						<StatusBadge
							label={awardee.statusMeta.label}
							color={awardee.statusMeta.badgeColor}
							size="sm"
						/>
					</div>
				</div>
			</div>

			{#if awardee.bio}
				<p class="mt-4 text-sm leading-relaxed text-ink-700">{awardee.bio}</p>
			{/if}

			<dl class="mt-5 grid gap-x-6 gap-y-3 border-t border-ink-100 pt-4 sm:grid-cols-2">
				<div>
					<dt class="label-micro">Surel</dt>
					<dd class="mt-0.5 truncate text-sm text-ink-800">{awardee.email}</dd>
				</div>
				{#if awardee.whatsapp}
					<div>
						<dt class="label-micro">WhatsApp</dt>
						<dd class="numeric mt-0.5 text-sm text-ink-800">{awardee.whatsapp}</dd>
					</div>
				{/if}
				{#if awardee.university}
					<div>
						<dt class="label-micro">Kampus asal</dt>
						<dd class="mt-0.5 text-sm text-ink-800">{awardee.university}</dd>
					</div>
				{/if}
				{#if awardee.city}
					<div>
						<dt class="label-micro">Kota domisili</dt>
						<dd class="mt-0.5 text-sm text-ink-800">{awardee.city}</dd>
					</div>
				{/if}
				{#if awardee.graduationYear}
					<div>
						<dt class="label-micro">Tahun lulus</dt>
						<dd class="numeric mt-0.5 text-sm text-ink-800">{awardee.graduationYear}</dd>
					</div>
				{/if}
				<div>
					<dt class="label-micro">Bergabung</dt>
					<dd class="mt-0.5 text-sm text-ink-800">{formatTanggal(awardee.joinedAt, 'panjang')}</dd>
				</div>
			</dl>

			{#if awardee.skills.length > 0}
				<div class="mt-4 border-t border-ink-100 pt-4">
					<p class="label-micro">Keahlian yang ditawarkan</p>
					<ul class="mt-2 flex flex-wrap gap-1.5">
						{#each awardee.skills as keahlian (keahlian)}
							<li
								class="rounded-chip border border-ink-200 bg-surface px-2.5 py-1 text-xs font-medium text-ink-700"
							>
								{keahlian}
							</li>
						{/each}
					</ul>
				</div>
			{/if}

			{#if awardee.businessProfile}
				<div class="mt-4 rounded-xl border border-pertamina-red/20 bg-pertamina-red-tint/30 p-4">
					<p class="label-micro">Profil usaha</p>
					<h3 class="mt-1 text-sm font-bold text-heading">
						{awardee.businessProfile.businessName}
					</h3>
					<p class="mt-1 text-xs text-ink-600">
						{awardee.businessProfile.sector} · {awardee.businessProfile.city}
					</p>
					<div class="mt-3 flex flex-wrap gap-x-6 gap-y-2">
						<span class="text-xs text-ink-600">
							Tenaga kerja
							<span class="numeric ml-1 font-bold text-ink-900">
								{formatAngka(awardee.businessProfile.employees)}
							</span>
						</span>
						<span class="text-xs text-ink-600">
							Pertumbuhan
							<span class="numeric ml-1 font-bold text-success">
								+{formatAngka(awardee.businessProfile.growthPercent)}%
							</span>
						</span>
					</div>
				</div>
			{/if}
		</Card>

		<!-- Tier & capaian -->
		<Card padding="lg">
			<h2 class="text-sm font-bold text-heading">Tier & capaian</h2>
			<div class="mt-4">
				<TierProgress points={gamification.points} showLabels={false} />
			</div>

			<div class="mt-5 grid grid-cols-2 gap-3 border-t border-ink-100 pt-4">
				<div>
					<p class="label-micro">Koin Tukar</p>
					<div class="mt-1"><PointsChip points={gamification.coins} currency="KT" size="sm" /></div>
				</div>
				<div>
					<p class="label-micro">Streak</p>
					<p class="numeric mt-1 text-sm font-bold text-ink-900">
						{frasaHitung(gamification.streakWeeks, 'minggu')}
					</p>
				</div>
			</div>

			<div class="mt-4 rounded-xl bg-surface-soft p-3">
				<p class="flex items-center gap-1.5 text-xs font-semibold text-ink-800">
					<Icon
						path={poinFiturPublikTerpenuhi ? ICONS.checkCircle : ICONS.lock}
						size={14}
						class={poinFiturPublikTerpenuhi ? 'text-success' : 'text-ink-450'}
					/>
					Gate fitur publik
				</p>
				<p class="mt-1 text-[11px] leading-relaxed text-ink-600">
					{#if poinFiturPublikTerpenuhi}
						Ambang {formatAngka(AMBANG_FITUR_PUBLIK)} poin sudah terpenuhi. Syarat lainnya — Blog
						terverifikasi, consent aktif, validasi PF, dan bebas data sensitif — dinilai tim Corsec.
					{:else}
						Butuh {frasaHitung(AMBANG_FITUR_PUBLIK - gamification.points, 'poin')} lagi, ditambah Blog
						terverifikasi, consent aktif, validasi PF, dan bebas data sensitif.
					{/if}
				</p>
			</div>
		</Card>
	</div>

	<!-- Lencana -->
	<section class="mt-6" aria-labelledby="judul-lencana">
		<div class="mb-3 flex flex-wrap items-baseline justify-between gap-2">
			<h2 id="judul-lencana" class="text-base font-bold text-heading">
				Lencana terkumpul
				<span class="numeric ml-1 text-sm font-semibold text-ink-600">
					{formatAngka(lencanaTerkumpul.length)} dari {formatAngka(gamification.badges.length)}
				</span>
			</h2>
			<a
				href="/awardee/penghargaan"
				class="text-sm font-semibold text-brand-700 transition-colors hover:text-brand-600"
			>
				Buka halaman Pencapaian
			</a>
		</div>

		{#if lencanaTerkumpul.length === 0}
			<EmptyState
				title="Belum ada lencana terkumpul"
				message="Lencana terbuka sendiri begitu kriterianya terpenuhi — mulai dari membaca kabar mingguan secara rutin."
				iconPath={ICONS.badge}
				size="sm"
			/>
		{:else}
			<ul class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
				{#each lencanaTerkumpul as entri (entri.badge.code)}
					<li><BadgeTile badge={entri.badge} unlocked={true} /></li>
				{/each}
			</ul>
		{/if}
	</section>

	<!-- Kontribusi ESG -->
	<section class="mt-8" aria-labelledby="judul-esg">
		<h2 id="judul-esg" class="mb-1 text-base font-bold text-heading">Kontribusi ESG</h2>
		<p class="mb-3 text-sm text-ink-600">
			Aksi yang layak diangkat menjadi bukti dampak dalam pelaporan Pertamina Foundation.
		</p>

		{#if ringkasanEsg.total === 0}
			<EmptyState
				title="Belum ada kontribusi berbukti ESG"
				message="Menulis Blog, menghadiri sesi upskilling, menjadi narasumber, atau memimpin aksi lokal akan mengisi bagian ini."
				iconPath={ICONS.leaf}
				size="sm"
				actionLabel="Lihat jenis aksinya"
				actionHref="/awardee/aksi"
			/>
		{:else}
			<ul class="grid gap-3 md:grid-cols-3">
				{#each ringkasanEsg.baris as pilar (pilar.pillar)}
					<li>
						<Card padding="md" class="h-full">
							<div class="flex items-center gap-2">
								<span
									class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold"
									style="background:var(--color-{pilar.tint});color:var(--color-{pilar.ink});"
								>
									{pilar.pillar}
								</span>
								<div>
									<p class="text-sm font-bold text-heading">{pilar.label}</p>
									<p class="numeric text-xs text-ink-600">
										{frasaHitung(pilar.jumlah, 'aksi')}
									</p>
								</div>
							</div>
							<p class="mt-2.5 text-xs leading-relaxed text-ink-600">{pilar.deskripsi}</p>
						</Card>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<!-- Privasi & consent -->
	<section class="mt-8" aria-labelledby="judul-consent">
		<h2 id="judul-consent" class="mb-1 text-base font-bold text-heading">Privasi & persetujuan</h2>
		<p class="mb-4 text-sm leading-relaxed text-ink-600">
			Setiap persetujuan berlaku terpisah dan dapat kamu cabut kapan saja. Mencabut persetujuan
			<span class="font-semibold text-ink-800">tidak mengurangi poin maupun menurunkan tier</span>.
			Begitu persetujuan publikasi Blog-mu dicabut, tulisan yang sudah terbit ditarik dari kanal
			publik saat itu juga dan diarsipkan sebagai jejak audit — bukan dihapus — sedangkan naskah
			yang masih di antrean berhenti dapat disetujui siapa pun.
		</p>

		{#if !consentDimuat}
			<div class="space-y-2.5" aria-busy="true">
				{#each ['a', 'b', 'c'] as kunci (kunci)}
					<div class="skeleton h-24 rounded-card"></div>
				{/each}
			</div>
		{:else if rekamanConsent.length === 0}
			<EmptyState
				title="Belum ada rekaman persetujuan"
				message="Persetujuan tercatat saat kamu mendaftar atau saat pertama kali mengirim Blog untuk dipublikasikan."
				iconPath={ICONS.shield}
				size="sm"
			/>
		{:else}
			<div class="mb-3 flex flex-wrap gap-2">
				<StatusBadge
					label="{formatAngka(consentAktif.length)} aktif"
					color="green"
					size="sm"
					withDot
				/>
				{#if consentDicabut.length > 0}
					<StatusBadge label="{formatAngka(consentDicabut.length)} dicabut" color="slate" size="sm" />
				{/if}
			</div>

			<ul class="space-y-2.5">
				{#each rekamanConsent as rekaman (rekaman.id)}
					{@const meta = CONSENT_TYPE_META[rekaman.consentType]}
					{@const aktif = rekaman.isAktif()}
					<li>
						<Card padding="md">
							<div class="flex flex-wrap items-start justify-between gap-3">
								<div class="min-w-0 flex-1">
									<div class="flex flex-wrap items-center gap-2">
										<h3 class="text-sm font-bold text-heading">{rekaman.label}</h3>
										<StatusBadge
											label="Risiko {meta.risiko.toLowerCase()}"
											color={WARNA_RISIKO[meta.risiko] ?? 'slate'}
											size="sm"
										/>
										{#if aktif}
											<StatusBadge label="Aktif" color="green" size="sm" withDot />
										{:else if rekaman.isDicabut}
											<StatusBadge label="Dicabut" color="slate" size="sm" />
										{:else if rekaman.status === ConsentStatus.KEDALUWARSA}
											<StatusBadge label="Kedaluwarsa" color="amber" size="sm" />
										{/if}
									</div>

									<p class="mt-1.5 text-xs leading-relaxed text-ink-600">{meta.deskripsi}</p>

									<p class="mt-2 text-[11px] leading-relaxed text-ink-600">
										Tujuan: {rekaman.purpose}
									</p>
									<p class="mt-1 text-[11px] text-ink-600">
										Diberikan {formatTanggal(rekaman.grantedAt, 'pendek')} · berlaku sampai
										{formatTanggal(rekaman.expiresAt, 'pendek')} · versi kebijakan
										{rekaman.policyVersion}
									</p>

									{#if rekaman.isDicabut && rekaman.revokedAt}
										<p class="mt-2 rounded-lg bg-surface-soft p-2 text-[11px] leading-relaxed text-ink-600">
											Dicabut pada {formatTanggal(rekaman.revokedAt, 'waktu')}. Rekaman ini tetap
											tersimpan sebagai jejak audit.
										</p>
									{/if}
								</div>

								{#if aktif}
									<Button
										variant="outline"
										size="sm"
										iconPath={ICONS.lock}
										onclick={() => (consentDikonfirmasi = rekaman)}
									>
										Cabut
									</Button>
								{/if}
							</div>
						</Card>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<!-- Konfirmasi pencabutan -->
	<Modal
		open={consentDikonfirmasi !== null}
		title="Cabut persetujuan ini?"
		size="sm"
		onclose={() => (consentDikonfirmasi = null)}
	>
		{#if consentDikonfirmasi}
			<p class="text-sm leading-relaxed text-ink-700">
				<span class="font-semibold text-ink-900">{consentDikonfirmasi.label}</span> tidak akan lagi
				menjadi dasar publikasi apa pun oleh Pertamina Foundation.
			</p>
			<ul class="mt-3 space-y-2 text-xs leading-relaxed text-ink-600">
				<li class="flex items-start gap-2">
					<span class="mt-0.5 shrink-0 text-success"><Icon path={ICONS.check} size={14} /></span>
					Poin, tier, dan lencana kamu tetap utuh.
				</li>
				<li class="flex items-start gap-2">
					<span class="mt-0.5 shrink-0 text-success"><Icon path={ICONS.check} size={14} /></span>
					Bila ini persetujuan terakhir yang mendasari publikasi Blog-mu: tulisan yang sudah terbit
					langsung ditarik dari kanal publik dan diarsipkan, dan naskah yang masih ditinjau berhenti
					dapat disetujui.
				</li>
				<li class="flex items-start gap-2">
					<span class="mt-0.5 shrink-0 text-ink-450"><Icon path={ICONS.info} size={14} /></span>
					Rekaman persetujuan lama tetap tersimpan sebagai jejak audit — itu kewajiban tata kelola,
					bukan penyimpanan data pribadimu.
				</li>
			</ul>
		{/if}

		{#snippet footer()}
			<Button variant="ghost" size="md" onclick={() => (consentDikonfirmasi = null)}>Batal</Button>
			<Button variant="danger" size="md" loading={sedangMencabut} onclick={cabutConsent}>
				Ya, cabut persetujuan
			</Button>
		{/snippet}
	</Modal>
{/if}
