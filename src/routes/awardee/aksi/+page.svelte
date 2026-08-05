<script>
	/**
	 * HALAMAN — Pusat Aksi & Poin.
	 *
	 * Tanggung jawab: memperlihatkan seluruh sembilan cara memperoleh poin beserta
	 * nilainya persis Hal 11, sisa kuota hari ini, dan buku besar poin awardee apa
	 * adanya.
	 *
	 * Halaman ini dibangun di atas satu prinsip: **transparansi penuh, termasuk
	 * bagian yang tidak menyenangkan.** Kuota yang habis, aksi yang masih menunggu
	 * bukti, dan aksi yang ditolak semuanya ditampilkan beserta alasannya. Sistem
	 * poin yang menyembunyikan penolakan akan dicurigai anggotanya sendiri, dan
	 * kecurigaan itu jauh lebih mahal daripada rasa kecewa sesaat.
	 *
	 * Kartu aksi tidak membukukan poin untuk aksi yang punya rumah sendiri. Menekan
	 * "Membaca kabar mingguan" dari halaman katalog akan memberi poin tanpa ada
	 * kabar yang benar-benar dibaca — itu persis perilaku yang diperingatkan Hal 11
	 * ("reward meaningful contribution, not spammy activity"). Karena itu kartunya
	 * MENGANTAR ke tempat aksinya terjadi. Hanya dua aksi yang tidak punya halaman
	 * tersendiri di lingkup 25 route yang dapat diajukan langsung dari sini, dan
	 * keduanya masuk sebagai menunggu verifikasi, bukan langsung berpoin.
	 *
	 * Seluruh angka berasal dari `SCORING_TABLE` dan `gamification.dailyUsage`
	 * (yang bersumber pada AntiGamingPolicy). Tidak ada satu pun angka poin atau
	 * batas harian yang ditulis di berkas ini.
	 *
	 * @see docs/00-SOURCE-BRIEF.md — Hal 11 Gamification Scoring Model
	 * @see docs/03-GAMIFICATION-SPEC.md — §2.1 kelas aksi, §5 anti-gaming, §5.6 status entri
	 */
	import {
		Button,
		Card,
		EmptyState,
		FilterChips,
		Icon,
		PageHeader,
		PointsChip,
		ProgressBar,
		StatusBadge,
		StatTile,
		Tabs,
		ICONS
	} from '$lib/components';
	import { ActivityStatus } from '$lib/domain/entities/PointActivity.js';
	import { ActionClass, SCORING_TABLE } from '$lib/domain/constants/scoring-table.js';
	import { gamification } from '$lib/stores/gamification.svelte.js';
	import { formatAngka, formatTanggal, frasaHitung } from '$lib/utils/format.js';

	/**
	 * Metadata tampilan kelas aksi (docs/03 §2.1).
	 *
	 * Ini murni penjelasan untuk awardee — tidak ada ambang, poin, maupun batas di
	 * sini. Yang dijawab tabel ini hanyalah "siapa yang memverifikasi aksi ini dan
	 * mengapa perlakuannya berbeda", pertanyaan yang selalu muncul begitu ada aksi
	 * yang poinnya tidak langsung cair.
	 * @type {Readonly<Record<string, {label: string, deskripsi: string, verifikator: string, warna: string}>>}
	 */
	const KELAS_AKSI = Object.freeze({
		[ActionClass.A]: Object.freeze({
			label: 'Ringan',
			deskripsi: 'Mudah dilakukan dan langsung terhitung oleh sistem.',
			verifikator: 'Otomatis oleh sistem',
			warna: 'blue'
		}),
		[ActionClass.B]: Object.freeze({
			label: 'Amplifikasi',
			deskripsi: 'Menyebarkan kabar Pertamina Foundation ke jaringanmu.',
			verifikator: 'Moderator chapter',
			warna: 'green'
		}),
		[ActionClass.C]: Object.freeze({
			label: 'Kontribusi',
			deskripsi: 'Menambah isi dan pengetahuan bagi komunitas.',
			verifikator: 'Admin Komunitas Corsec',
			warna: 'purple'
		}),
		[ActionClass.D]: Object.freeze({
			label: 'Kepemimpinan',
			deskripsi: 'Menggerakkan orang lain — bernilai tinggi dan divalidasi ganda.',
			verifikator: 'Admin Corsec + Validator PF',
			warna: 'amber'
		})
	});

	/**
	 * Ke mana awardee harus pergi untuk benar-benar melakukan sebuah aksi.
	 *
	 * `href` kosong berarti aksi itu tidak punya halaman tersendiri dan diajukan
	 * langsung dari kartunya.
	 * @type {Readonly<Record<string, {href: string, cara: string}>>}
	 */
	const JALUR_AKSI = Object.freeze({
		BROADCAST_VIEW: { href: '/awardee/kabar', cara: 'Buka kabar terbaru lalu tandai selesai dibaca.' },
		CTA_REACT: { href: '/awardee/kabar', cara: 'Tulis tanggapan atas ajakan ringan pada sebuah kabar.' },
		SHARE_PRIVATE: { href: '/awardee/kabar', cara: 'Teruskan kabar ke grup WhatsApp atau jaringan pribadimu.' },
		SHARE_PUBLIC: { href: '/awardee/kabar', cara: 'Unggah ke media sosial publik, lampirkan tautan buktinya.' },
		STORY_SUBMIT: {
			href: '/awardee/cerita/tulis',
			cara: 'Tulis satu cerita kontribusi di komposer, lalu kirim ke antrean tinjauan verifikator.'
		},
		SESSION_ATTEND: { href: '/awardee/kalender', cara: 'Hadiri sesi daring lalu klaim dengan kode kehadiran.' },
		KNOWLEDGE_QA: { href: '', cara: 'Ajukan pertanyaan atau jawaban bermanfaat yang sudah kamu bagikan.' },
		SPEAKER_MENTOR: { href: '', cara: 'Ajukan sesi tempat kamu menjadi narasumber, mentor, atau fasilitator.' },
		LEAD_ACTION: { href: '/awardee/gerakan', cara: 'Pimpin aksi atau kampanye lokal lewat gerakan bersama.' }
	});

	/** Penyaring buku besar berdasarkan status entri. */
	const SARINGAN_SEMUA = 'SEMUA';

	/** @type {string} */
	let tabAktif = $state('katalog');

	/** @type {string} */
	let saringanStatus = $state(SARINGAN_SEMUA);

	/**
	 * Sembilan aksi lengkap dengan keadaan kuotanya hari ini.
	 *
	 * `dailyUsage` diurutkan mengikuti SCORING_TABLE, tetapi dicocokkan lewat
	 * `usageFor` alih-alih indeks — mengandalkan urutan dua daftar yang kebetulan
	 * sama adalah tautan tak tertulis yang akan putus diam-diam.
	 */
	const katalogAksi = $derived(
		SCORING_TABLE.map((rule) => ({
			rule,
			kelas: KELAS_AKSI[rule.actionClass],
			jalur: JALUR_AKSI[rule.type] ?? { href: '', cara: '' },
			kuota: gamification.usageFor(rule.type)
		}))
	);

	/** Aksi dikelompokkan per kelas, urut dari yang paling ringan. */
	const kelompokAksi = $derived(
		Object.values(ActionClass).map((kode) => ({
			kode,
			meta: KELAS_AKSI[kode],
			aksi: katalogAksi.filter((entri) => entri.rule.actionClass === kode)
		}))
	);

	const jumlahDiberikan = $derived(
		gamification.ledger.filter((entri) => entri.status === ActivityStatus.AWARDED).length
	);
	const jumlahMenunggu = $derived(
		gamification.ledger.filter((entri) => entri.status === ActivityStatus.PENDING).length
	);
	const jumlahDitolak = $derived(
		gamification.ledger.filter(
			(entri) =>
				entri.status === ActivityStatus.REJECTED || entri.status === ActivityStatus.REVOKED
		).length
	);

	const pilihanStatus = $derived([
		{ id: SARINGAN_SEMUA, label: 'Semua', count: gamification.ledger.length },
		{ id: ActivityStatus.AWARDED, label: 'Diberikan', count: jumlahDiberikan },
		{ id: ActivityStatus.PENDING, label: 'Menunggu bukti', count: jumlahMenunggu },
		{ id: ActivityStatus.REJECTED, label: 'Ditolak', count: jumlahDitolak }
	]);

	const riwayatTampil = $derived(
		saringanStatus === SARINGAN_SEMUA || saringanStatus === ''
			? gamification.ledger
			: gamification.ledger.filter((entri) => entri.status === saringanStatus)
	);

	const tabs = $derived([
		{ id: 'katalog', label: 'Aksi & Kuota', count: SCORING_TABLE.length },
		{ id: 'riwayat', label: 'Riwayat Poin', count: gamification.ledger.length }
	]);

	/**
	 * Mengajukan aksi yang tidak punya halaman tersendiri.
	 *
	 * Tanpa bukti terlampir, mesin membukukannya sebagai menunggu verifikasi dengan
	 * poin nol — dan itulah yang dijanjikan tombolnya, sehingga tidak ada kejutan.
	 * @param {string} activityType
	 * @returns {Promise<void>}
	 */
	async function ajukan(activityType) {
		await gamification.perform(activityType, {
			note: 'Diajukan dari Pusat Aksi, menunggu verifikasi bukti.'
		});
	}

	/**
	 * Kalimat sisa kuota. Kuota yang habis selalu disertai kapan ia pulih —
	 * larangan tanpa jalan keluar membuat awardee berhenti mencoba.
	 * @param {import('$lib/domain/services/GamificationEngine.js').DailyUsageRow|null} kuota
	 * @returns {string}
	 */
	function kalimatKuota(kuota) {
		if (!kuota) return 'Kuota sedang dihitung…';
		if (kuota.exhausted) {
			return `Kuota hari ini terpakai penuh (${formatAngka(kuota.used)} dari ${formatAngka(kuota.cap)}). Poin kembali besok.`;
		}
		return `Terpakai ${formatAngka(kuota.used)} dari ${formatAngka(kuota.cap)} — sisa ${frasaHitung(kuota.remaining, 'kali')} hari ini.`;
	}
</script>

<svelte:head>
	<title>Pusat Aksi & Poin · Pfriends</title>
</svelte:head>

<PageHeader
	title="Pusat Aksi & Poin"
	subtitle="Sembilan cara memperoleh Poin Kontribusi, sisa kuota harianmu, dan seluruh riwayat poin apa adanya."
	eyebrow="Recognition & Gamifikasi"
/>

<div class="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
	<StatTile
		label="Poin Kontribusi"
		value={gamification.points}
		unit="PK"
		hint="Penentu tier"
		iconPath={ICONS.bolt}
		accent="var(--color-pertamina-navy)"
	/>
	<StatTile
		label="Diberikan"
		value={jumlahDiberikan}
		unit="aksi"
		hint="Poin sudah dibukukan"
		iconPath={ICONS.checkCircle}
		accent="var(--color-success)"
	/>
	<StatTile
		label="Menunggu bukti"
		value={jumlahMenunggu}
		unit="aksi"
		hint="Poin cair setelah diverifikasi"
		iconPath={ICONS.clock}
		accent="var(--color-warning)"
	/>
	<StatTile
		label="Tidak dihitung"
		value={jumlahDitolak}
		unit="aksi"
		hint="Ditolak atau ditarik audit"
		iconPath={ICONS.xCircle}
		accent="var(--color-danger)"
	/>
</div>

<Tabs {tabs} active={tabAktif} onchange={(id) => (tabAktif = id)} class="mb-5" />

{#if tabAktif === 'riwayat'}
	<div id="panel-riwayat" role="tabpanel" aria-labelledby="tab-riwayat">
		<div class="mb-4">
			<FilterChips
				options={pilihanStatus}
				selected={saringanStatus}
				onchange={(id) => (saringanStatus = id)}
				label="Saring riwayat poin"
			/>
		</div>

		{#if riwayatTampil.length === 0}
			<EmptyState
				title={gamification.ledger.length === 0
					? 'Buku besar poinmu masih kosong'
					: 'Tidak ada entri dengan status itu'}
				message={gamification.ledger.length === 0
					? 'Setiap aksi yang kamu lakukan akan tercatat di sini beserta poin dan statusnya — termasuk yang ditolak.'
					: 'Coba pilih status lain untuk melihat entri yang tersedia.'}
				iconPath={ICONS.document}
				actionLabel={gamification.ledger.length === 0 ? 'Mulai dari kabar terbaru' : ''}
				actionHref={gamification.ledger.length === 0 ? '/awardee/kabar' : ''}
			/>
		{:else}
			<ul class="space-y-2.5">
				{#each riwayatTampil as entri (entri.id)}
					<li>
						<Card padding="md">
							<div class="flex items-start justify-between gap-3">
								<div class="min-w-0 flex-1">
									<div class="flex flex-wrap items-center gap-2">
										<StatusBadge
											label={entri.statusMeta.label}
											color={entri.statusMeta.badgeColor}
											size="sm"
										/>
										<span class="label-micro">Kelas {entri.actionClass}</span>
									</div>

									<h3 class="mt-1.5 text-sm font-bold text-heading">{entri.label}</h3>

									{#if entri.note}
										<p class="mt-1 line-clamp-2 text-xs leading-relaxed text-ink-600">
											{entri.note}
										</p>
									{/if}

									<p class="mt-1.5 text-[11px] text-ink-600">
										{formatTanggal(entri.occurredAt, 'waktu')} · {entri.pillar}
									</p>

									{#if !entri.isAwarded}
										<p class="mt-2 rounded-lg bg-surface-soft p-2 text-[11px] leading-relaxed text-ink-600">
											{entri.statusMeta.deskripsi}
										</p>
									{/if}
								</div>

								<div class="shrink-0 text-right">
									<span
										class="numeric block text-lg font-extrabold {entri.isAwarded
											? 'text-ink-900'
											: 'text-ink-450'}"
									>
										{entri.isAwarded ? `+${formatAngka(entri.points)}` : '—'}
									</span>
									{#if !entri.isAwarded}
										<span class="numeric block text-[11px] text-ink-600">
											{formatAngka(entri.basePoints)} menanti
										</span>
									{/if}
								</div>
							</div>
						</Card>
					</li>
				{/each}
			</ul>

			<p class="mt-4 text-xs leading-relaxed text-ink-600">
				Entri yang ditolak maupun ditarik tetap tersimpan sebagai jejak audit dan tidak pernah
				dihapus — itulah yang membuat total poin di atas dapat direkonsiliasi kapan saja.
			</p>
		{/if}
	</div>
{:else}
	<div id="panel-katalog" role="tabpanel" aria-labelledby="tab-katalog">
		<p class="mb-5 rounded-xl border border-ink-100 bg-surface-soft p-3.5 text-xs leading-relaxed text-ink-600">
			<span class="font-semibold text-ink-800">Poin menghargai kontribusi yang bermakna, bukan
				aktivitas yang diulang-ulang.</span>
			Karena itu setiap aksi punya batas harian, dan aksi bernilai tinggi membutuhkan bukti yang
			ditinjau manusia sebelum poinnya dibukukan.
		</p>

		<div class="space-y-7">
			{#each kelompokAksi as kelompok (kelompok.kode)}
				<div>
					<div class="mb-3 flex flex-wrap items-center gap-2">
						<h2 class="text-base font-bold text-heading">
							Kelas {kelompok.kode} · {kelompok.meta.label}
						</h2>
						<StatusBadge label={kelompok.meta.verifikator} color={kelompok.meta.warna} size="sm" />
					</div>
					<p class="mb-3 text-xs text-ink-600">{kelompok.meta.deskripsi}</p>

					<div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
						{#each kelompok.aksi as entri (entri.rule.type)}
							{@const habis = Boolean(entri.kuota?.exhausted)}
							<Card padding="md" class="flex h-full flex-col">
								<div class="flex items-start justify-between gap-2">
									<h3 class="text-sm font-bold text-heading">{entri.rule.label}</h3>
									<PointsChip
										points={entri.rule.points}
										currency="PK"
										size="sm"
										showLabel={false}
									/>
								</div>

								<p class="mt-1.5 flex-1 text-xs leading-relaxed text-ink-600">{entri.jalur.cara}</p>

								<div class="mt-3">
									<ProgressBar
										value={entri.kuota?.used ?? 0}
										max={entri.kuota?.cap ?? 1}
										color={habis ? 'var(--color-warning)' : 'var(--color-pertamina-blue)'}
										size="xs"
										label="Kuota harian {entri.rule.label}"
									/>
									<p class="mt-1.5 text-[11px] leading-relaxed {habis ? 'text-warning' : 'text-ink-600'}">
										{kalimatKuota(entri.kuota)}
									</p>
								</div>

								{#if entri.rule.needsEvidence}
									<p class="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-ink-600">
										<span class="mt-px shrink-0"><Icon path={ICONS.shield} size={12} /></span>
										Butuh bukti — diverifikasi {kelompok.meta.verifikator.toLowerCase()}.
									</p>
								{/if}

								<div class="mt-3">
									{#if entri.jalur.href}
										<Button variant="outline" size="sm" fullWidth href={entri.jalur.href}>
											Buka halamannya
										</Button>
									{:else}
										<Button
											variant={habis ? 'ghost' : 'secondary'}
											size="sm"
											fullWidth
											disabled={habis}
											loading={gamification.busy === entri.rule.type}
											onclick={() => ajukan(entri.rule.type)}
										>
											{habis ? 'Kuota penuh' : 'Ajukan untuk verifikasi'}
										</Button>
									{/if}
								</div>
							</Card>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	</div>
{/if}
