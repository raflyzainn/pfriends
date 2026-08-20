<script>
	/**
	 * HALAMAN: Komposer Cerita (`/awardee/cerita/tulis`).
	 *
	 * Tanggung jawab: mengubah satu aksi lapangan menjadi naskah yang layak masuk
	 * antrean tinjauan, dan membuat setiap syarat kelayakannya terlihat SAMBIL
	 * penulis mengetik: bukan sesudah ia menekan kirim.
	 *
	 * ENAM KEPUTUSAN YANG TIDAK TERBACA DARI KODE:
	 *
	 * 1. **Kelayakan kirim dibaca dari `Story.isSubmittable`, bukan dinilai ulang di
	 *    sini.** Halaman membangun `Story` kandidat dari isian formulir pada setiap
	 *    perubahan, lalu bertanya kepada entity. Menyalin ketiga syaratnya ke dalam
	 *    ekspresi turunan akan melahirkan gerbang kedua yang cepat berselisih dengan
	 *    gerbang pertama: dan yang dilihat penulis adalah versi halaman, sementara
	 *    yang menolak kiriman adalah versi domain.
	 * 2. **Naskah kandidat SELALU terbentuk, bahkan saat formulir masih kosong.**
	 *    Field wajib entity diisi nilai singgahan (`:`) supaya konstruktor tidak
	 *    melempar, dan justru dengan begitu `isSubmittable` menjawab "belum" karena
	 *    alasan yang benar: jumlah kata belum cukup. Kelengkapan per field adalah
	 *    urusan `Validator`, bukan urusan konstruktor entity.
	 * 3. **Penolakan menyebut syarat mana yang belum terpenuhi.** Tombol kirim tidak
	 *    pernah dinonaktifkan diam-diam: menekannya saat belum layak menampilkan
	 *    daftar syarat yang kurang, satu per satu, dengan langkah perbaikannya
	 *    (§3.5 WP-05 butir 1). Pesan galat umum membuat penulis menekan tombol yang
	 *    sama berulang kali.
	 * 4. **Consent diperiksa DUA lapis.** Pernyataan izin pada formulir ini saja
	 *    tidak cukup: awardee yang sudah mencabut consent programnya di `/awardee/
	 *    profil` tidak dapat menerbitkan apa pun, dan itu harus terbaca di sini :
	 *    bukan menjadi kejutan di ujung antrean tinjauan.
	 * 5. **Pengiriman melewati `editorial.submitStory`, bukan repository.** Store
	 *    meneruskannya ke `ContentReviewService`, satu-satunya tempat peta transisi
	 *    `DRAFT/PERLU_REVISI → DIAJUKAN` ditegakkan. Menyimpan langsung ke
	 *    repository melewati peta itu tanpa jejak.
	 * 6. **Poin dibaca dari `poinUntuk(ActivityType.STORY_SUBMIT)`: nol angka
	 *    literal**, dan baru diajukan SESUDAH naskah benar-benar diterima domain.
	 *    Urutan sebaliknya menjanjikan poin atas naskah yang ditolak.
	 *
	 * @see docs/00-SOURCE-BRIEF.md: Hal 11 Submit story, Hal 12 empat gerbang bukti ESG
	 * @see docs/12-BUILD-CONTRACT-V2.md: §3.5 WP-05 kriteria selesai butir 1, 2, 4, 5
	 * @see docs/10-REVISION-SPEC.md: §5.2 state machine cerita
	 */

	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Button, Card, EmptyState, Icon, ICONS, PageHeader, StatusBadge } from '$lib/components';
	import { STORY_STATUS } from '$lib/domain/constants/community.js';
	import { ESG_EVIDENCE_GATE, ESG_PILLARS, SDG_GOALS } from '$lib/domain/constants/esg-taxonomy.js';
	import { ActivityType, poinUntuk } from '$lib/domain/constants/scoring-table.js';
	import { MIN_KATA_NASKAH, Story } from '$lib/domain/entities/Story.js';
	import { Rule, Validator } from '$lib/domain/validation/Validator.js';
	import { catalog } from '$lib/stores/catalog.svelte.js';
	import { editorial } from '$lib/stores/editorial.svelte.js';
	import { gamification } from '$lib/stores/gamification.svelte.js';
	import { session } from '$lib/stores/session.svelte.js';
	import { toast, ToastType } from '$lib/stores/toast.svelte.js';
	import { formatAngka, potongTeks } from '$lib/utils/format.js';
	import RequirementList from '../../_components/RequirementList.svelte';

	/** Nilai poin pengiriman cerita: dari tabel kanonik, tidak pernah ditulis literal. */
	const POIN_CERITA = poinUntuk(ActivityType.STORY_SUBMIT);

	/** Nama parameter kueri yang menunjuk naskah yang sedang diperbaiki. */
	const PARAM_NASKAH = 'naskah';

	/**
	 * Nilai singgahan untuk field wajib entity yang belum diisi penulis. Lihat
	 * keputusan 2 pada blok pembuka: ia tidak pernah ikut tersimpan, karena naskah
	 * dengan judul kosong sudah ditahan `Validator` jauh sebelum tombol kirim
	 * meneruskannya ke domain.
	 */
	const SINGGAHAN = ':';

	/** Batas panjang ringkasan yang dipotong otomatis dari isi naskah. */
	const PANJANG_RINGKASAN = 160;

	/**
	 * Tanggal waktu lokal untuk `<input type="date">`.
	 *
	 * Dihitung dari komponen tanggal lokal, bukan `toISOString()`: konversi UTC
	 * memundurkan tanggal satu hari bagi penulis di zona WIB setiap sore.
	 *
	 * @param {Date} tanggal
	 * @returns {string} Bentuk `YYYY-MM-DD`.
	 */
	function isoLokal(tanggal) {
		const dua = (/** @type {number} */ nilai) => String(nilai).padStart(2, '0');
		return `${tanggal.getFullYear()}-${dua(tanggal.getMonth() + 1)}-${dua(tanggal.getDate())}`;
	}

	const HARI_INI = isoLokal(new Date());

	/**
	 * Aturan per field.
	 *
	 * Hanya syarat KELENGKAPAN dan BENTUK yang tinggal di sini. Syarat KELAYAKAN
	 * KIRIM: panjang naskah, lampiran, tag ESG: dijawab `Story.isSubmittable`;
	 * menuliskannya dua kali berarti dua gerbang yang harus dijaga sinkron.
	 */
	const validator = new Validator({
		title: [
			Rule.required('Judul Blog wajib diisi.'),
			Rule.minLength(10, 'Judul terlalu pendek untuk menerangkan isi tulisan: minimal 10 karakter.'),
			Rule.maxLength(120, 'Judul maksimal 120 karakter agar utuh terbaca pada kartu Blog.')
		],
		summary: [Rule.maxLength(200, 'Ringkasan maksimal 200 karakter.')],
		body: [Rule.required('Isi Blog wajib diisi.')],
		outcomeNote: [
			Rule.required('Catatan hasil wajib diisi: tuliskan perubahan yang terjadi, bukan jalannya acara.')
		],
		location: [Rule.required('Lokasi aktivitas wajib diisi.')],
		activityDate: [
			Rule.required('Tanggal aktivitas wajib diisi.'),
			Rule.date('Tanggal aktivitas belum terbaca sebagai tanggal yang sah.')
		],
		participantCount: [
			Rule.required('Jumlah peserta wajib diisi.'),
			Rule.min(1, 'Jumlah peserta minimal 1 orang.')
		],
		evidence: [
			Rule.required('Sumber bukti wajib diisi: nama berkas dokumentasi atau tautan album.')
		]
	});

	// ── Isian formulir ────────────────────────────────────────────────────────
	let formJudul = $state('');
	let formRingkasan = $state('');
	let formIsi = $state('');
	let formPilar = $state(ESG_PILLARS[0].pillar);
	let formSdg = $state(String(SDG_GOALS[0].goal));
	let formCatatanHasil = $state('');
	let formMetrik = $state('');
	let formNilai = $state('');
	let formSatuan = $state('');
	let formLokasi = $state('');
	let formTanggal = $state(HARI_INI);
	let formPeserta = $state('');
	let formBukti = $state('');
	let formConsent = $state(false);

	/** @type {boolean} Penulis sudah pernah menekan kirim; galat per field baru ditampilkan sesudahnya. */
	let sudahDicoba = $state(false);

	/** @type {boolean} Pengiriman sedang berjalan. */
	let sedangMengirim = $state(false);

	/** @type {boolean} Formulir sudah diisi dari naskah yang diperbaiki. */
	let sudahDiprefill = $state(false);

	/**
	 * Identitas naskah baru, dibentuk sekali pada pemakaian pertama.
	 *
	 * Sengaja BUKAN `$state`: naskah kandidat dibangun ulang pada setiap ketukan
	 * tombol, dan membentuk identitas baru di dalamnya akan menghasilkan id yang
	 * berubah-ubah selama penulis mengetik: sesuatu yang tidak pernah terlihat
	 * sampai dua kiriman beruntun tersimpan sebagai dua baris berbeda.
	 * @type {string}
	 */
	let idNaskahBaru = '';

	const awardee = $derived(session.awardee);

	/** Identitas naskah yang sedang diperbaiki; kosong berarti naskah baru. */
	const idNaskahRevisi = $derived(page.url?.searchParams?.get(PARAM_NASKAH) ?? '');

	/**
	 * Naskah yang sedang diperbaiki, bila halaman dibuka dari kartu "Perlu revisi".
	 * @type {import('$lib/domain/entities/Story.js').Story|null}
	 */
	const naskahRevisi = $derived(
		idNaskahRevisi
			? (catalog.stories.find((cerita) => cerita.id === idNaskahRevisi) ?? null)
			: null
	);

	const modeRevisi = $derived(naskahRevisi !== null);

	/** Nilai formulir dalam bentuk yang dibaca `Validator`. */
	const nilaiFormulir = $derived({
		title: formJudul,
		summary: formRingkasan,
		body: formIsi,
		outcomeNote: formCatatanHasil,
		location: formLokasi,
		activityDate: formTanggal,
		participantCount: formPeserta,
		evidence: formBukti
	});

	const validasi = $derived(validator.validate(nilaiFormulir));

	/** Galat per field; hanya tampil sesudah penulis menekan kirim sekali. */
	const galat = $derived(sudahDicoba ? validasi.errors : {});

	/**
	 * Naskah kandidat dari isian formulir saat ini.
	 *
	 * Inilah objek yang ditanya "sudah layak dikirim?" dan, bila layak, objek yang
	 * benar-benar dikirim ke domain. Satu objek untuk kedua peran: tidak ada
	 * kemungkinan yang diperiksa berbeda dari yang dikirim.
	 * @type {import('$lib/domain/entities/Story.js').Story|null}
	 */
	const naskah = $derived.by(() => {
		const penulis = awardee;
		if (!penulis) return null;

		const bukti = formBukti.trim();
		const isi = formIsi.trim();
		const tanggalAktivitas = new Date(`${formTanggal}T09:00:00`);

		if (idNaskahBaru === '') idNaskahBaru = `STR-${penulis.id}-${Date.now()}`;

		return new Story({
			id: naskahRevisi?.id ?? idNaskahBaru,
			slug: naskahRevisi?.slug ?? buatSlug(formJudul, penulis.id),
			authorId: penulis.id,
			authorName: penulis.fullName,
			title: formJudul.trim() || SINGGAHAN,
			summary: formRingkasan.trim() || potongTeks(isi, PANJANG_RINGKASAN),
			body: isi || SINGGAHAN,
			status: naskahRevisi?.status ?? STORY_STATUS.DRAFT,
			community: penulis.community,
			chapterId: penulis.chapterId,
			esgTags: [{ pillar: formPilar, sdgGoal: Number(formSdg) }],
			mediaRefs: bukti === '' ? [] : [bukti],
			outcome: {
				note: formCatatanHasil.trim(),
				metric: formMetrik.trim(),
				value: Number(formNilai) || 0,
				unit: formSatuan.trim()
			},
			location: formLokasi.trim(),
			activityDate: Number.isNaN(tanggalAktivitas.getTime()) ? null : tanggalAktivitas,
			participantCount: Number(formPeserta) || 0,
			consentActive: (penulis.consentActive && formConsent) === true,
			consentId: naskahRevisi?.consentId ?? `CONSENT-${penulis.id}`,
			reviewNotes: naskahRevisi ? naskahRevisi.reviewNotes.map((catatan) => ({ ...catatan })) : [],
			revisionCount: naskahRevisi?.revisionCount ?? 0
		});
	});

	const jumlahKata = $derived(naskah?.wordCount ?? 0);

	/** Consent program awardee: dikelola di `/awardee/profil`, dibaca di sini. */
	const consentProgramAktif = $derived(awardee?.consentActive === true);

	const consentLengkap = $derived(consentProgramAktif && formConsent);

	/**
	 * Syarat pengiriman beserta status pemenuhannya.
	 *
	 * Tiga syarat pertama adalah `Story.isSubmittable` yang dipecah menjadi kalimat
	 *: nilai kebenarannya tetap dibaca dari getter entity, yang dipecah hanyalah
	 * penjelasannya. Syarat keempat adalah consent, yang berada di luar entity
	 * karena menyangkut hak yang dapat dicabut penulis kapan saja.
	 * @type {{key: string, label: string, terpenuhi: boolean, hint: string}[]}
	 */
	const syaratKirim = $derived([
		{
			key: 'panjang',
			label: `Naskah minimal ${MIN_KATA_NASKAH} kata`,
			terpenuhi: jumlahKata >= MIN_KATA_NASKAH,
			hint: `baru ${formatAngka(jumlahKata)} kata, kurang ${formatAngka(Math.max(0, MIN_KATA_NASKAH - jumlahKata))} kata lagi`
		},
		{
			key: 'bukti',
			label: 'Lampiran dokumentasi',
			terpenuhi: naskah?.hasMedia === true,
			hint: 'isi kolom "Sumber bukti" dengan nama berkas atau tautan album dokumentasi'
		},
		{
			key: 'esg',
			label: 'Tag pilar ESG dan tujuan SDG',
			terpenuhi: naskah?.hasEsgTag === true,
			hint: 'pilih satu pilar ESG dan satu tujuan SDG di bagian klasifikasi dampak'
		},
		{
			key: 'consent',
			label: 'Izin publikasi',
			terpenuhi: consentLengkap,
			hint: consentProgramAktif
				? 'centang pernyataan izin publikasi di bagian bawah formulir'
				: 'consent program Anda sedang tidak aktif: aktifkan kembali di halaman Profil sebelum mengirim naskah'
		}
	]);

	/** Empat gerbang bukti ESG Hal 12, dinilai dari getter entity. */
	const gerbangEsg = $derived.by(() => {
		const terpenuhi = {
			documented_activity: naskah?.isActivityDocumented === true,
			outcome_note: naskah?.hasOutcomeNote === true,
			esg_sdg_tag: naskah?.hasEsgTag === true,
			evidence_source: naskah?.hasMedia === true
		};
		return ESG_EVIDENCE_GATE.map((syarat) => ({
			key: syarat.key,
			label: syarat.label,
			terpenuhi: terpenuhi[/** @type {keyof typeof terpenuhi} */ (syarat.key)] === true,
			hint: syarat.deskripsi
		}));
	});

	const syaratBelumTerpenuhi = $derived(syaratKirim.filter((syarat) => !syarat.terpenuhi));

	const layakKirim = $derived(
		naskah !== null && naskah.isSubmittable && consentLengkap && validasi.valid
	);

	onMount(async () => {
		if (!session.ready) await session.hydrate();
		await Promise.all([catalog.load(), editorial.load(), gamification.refresh()]);
	});

	// Prefill sekali saja. Menjadikannya reaktif penuh akan menimpa suntingan
	// penulis setiap kali katalog disegarkan di latar belakang.
	$effect(() => {
		const sumber = naskahRevisi;
		if (!sumber || sudahDiprefill) return;
		sudahDiprefill = true;
		formJudul = sumber.title;
		formRingkasan = sumber.summary;
		formIsi = sumber.body;
		formPilar = sumber.esgTags[0]?.pillar ?? ESG_PILLARS[0].pillar;
		formSdg = String(sumber.esgTags[0]?.sdgGoal ?? SDG_GOALS[0].goal);
		formCatatanHasil = sumber.outcome?.note ?? '';
		formMetrik = sumber.outcome?.metric ?? '';
		formNilai = sumber.outcome?.value ? String(sumber.outcome.value) : '';
		formSatuan = sumber.outcome?.unit ?? '';
		formLokasi = sumber.location;
		formTanggal = sumber.activityDate ? isoLokal(sumber.activityDate) : HARI_INI;
		formPeserta = sumber.participantCount ? String(sumber.participantCount) : '';
		formBukti = sumber.mediaRefs[0] ?? '';
	});

	/**
	 * Slug URL sebuah judul, dibubuhi identitas penulis.
	 *
	 * Identitas penulis ikut disertakan supaya dua cerita berjudul mirip dari dua
	 * penulis berbeda tidak pernah bertabrakan di jalur publik `/cerita/<slug>`.
	 *
	 * @param {string} judul
	 * @param {string} awardeeId
	 * @returns {string}
	 */
	function buatSlug(judul, awardeeId) {
		const dasar = judul
			.toLowerCase()
			.normalize('NFD')
			.replace(/[̀-ͯ]/g, '')
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '');
		return `${dasar || 'cerita'}-${awardeeId.toLowerCase()}`;
	}

	/**
	 * Menerangkan penolakan dengan menyebut syarat yang belum terpenuhi.
	 *
	 * Bukan satu kalimat umum: penulis yang membaca "naskah belum layak dikirim"
	 * tidak tahu apa yang harus ia perbaiki, dan akan menekan tombol yang sama
	 * sekali lagi (§3.5 WP-05 butir 1).
	 * @returns {void}
	 */
	function terangkanPenolakan() {
		const kurang = syaratBelumTerpenuhi.map((syarat) => `${syarat.label} (${syarat.hint})`);
		const fieldKurang = Object.values(validasi.errors);

		if (kurang.length === 0 && fieldKurang.length === 0) return;

		toast.push({
			type: ToastType.WARNING,
			title: 'Naskah belum dapat dikirim',
			message: [...kurang, ...fieldKurang].join(' · ')
		});
	}

	/**
	 * Mengirim naskah ke antrean tinjauan, lalu mengajukan poinnya.
	 *
	 * Poin diajukan SESUDAH domain menerima naskah: lihat keputusan 6 pada blok
	 * pembuka. Kuota harian hanya membatasi poin, bukan hak menulis: naskah kedua
	 * pada hari yang sama tetap masuk antrean, yang tidak diperoleh hanyalah poin
	 * keduanya.
	 *
	 * @returns {Promise<void>}
	 */
	async function kirim() {
		sudahDicoba = true;
		if (!awardee || !naskah) return;
		if (!layakKirim) {
			terangkanPenolakan();
			return;
		}

		sedangMengirim = true;
		try {
			const hasil = await editorial.submitStory(naskah);
			if (!hasil.ok) return;

			await gamification.perform(ActivityType.STORY_SUBMIT, {
				refId: naskah.id,
				evidence: [...naskah.mediaRefs],
				note: naskah.title
			});
			await catalog.refresh();
			await goto('/awardee/cerita');
		} finally {
			sedangMengirim = false;
		}
	}
</script>

<svelte:head>
	<title>{modeRevisi ? 'Perbaiki tulisan' : 'Tulis Blog Baru'}: PFriends</title>
</svelte:head>

<PageHeader
	eyebrow="Pilar 06 · Community Journalism"
	title={modeRevisi ? 'Perbaiki tulisan' : 'Tulis Blog Baru'}
	subtitle={modeRevisi
		? 'Tindak lanjuti catatan verifikator, lalu kirim ulang tulisanmu ke antrean tinjauan.'
		: 'Ceritakan satu hal baik yang benar-benar terjadi. Setiap kolom di bawah menopang salah satu syarat bukti ESG Pertamina Foundation.'}
/>

{#if !awardee}
	<div class="mt-6">
		<EmptyState
			iconPath={ICONS.user}
			title="Sesi anggota belum termuat"
			message="Komposer Blog membutuhkan identitas penulis. Masuk kembali sebagai anggota PFriends untuk melanjutkan."
			actionLabel="Ke halaman Masuk"
			actionHref="/masuk"
		/>
	</div>
{:else}
	{#if modeRevisi && naskahRevisi?.latestReviewNote}
		<div class="mt-5 rounded-card border border-warning/30 bg-warning-tint/60 p-4">
			<p class="flex items-center gap-2 text-sm font-semibold text-ink-800">
				<Icon path={ICONS.info} size={16} />
				Catatan verifikator atas naskah ini
			</p>
			<p class="mt-1.5 text-[13px] leading-relaxed text-ink-700">
				{naskahRevisi.latestReviewNote}
			</p>
		</div>
	{/if}

	<div class="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
		<!-- Kolom kiri: naskah dan buktinya. -->
		<div class="min-w-0 space-y-5">
			<Card padding="lg">
				<h2 class="text-lg font-semibold text-heading">Naskah</h2>
				<p class="mt-1 text-[13px] leading-relaxed text-ink-600">
					Mulai dari keadaan sebelum aksi, apa yang dikerjakan, siapa yang terlibat, dan apa yang
					berbeda sesudahnya.
				</p>

				<div class="mt-5 space-y-4">
					<label class="block">
						<span class="label-micro">Judul Blog</span>
						<input
							type="text"
							bind:value={formJudul}
							placeholder="Contoh: Bank sampah RW 04 Cilacap bertahan setahun penuh"
							aria-invalid={Boolean(galat.title)}
							class="mt-1.5 w-full max-w-full rounded-xl border bg-surface px-3 py-2 text-sm text-ink-800 {galat.title
								? 'border-danger'
								: 'border-ink-450'}"
						/>
						{#if galat.title}
							<span class="mt-1 block text-xs text-danger">{galat.title}</span>
						{/if}
					</label>

					<label class="block">
						<span class="label-micro">Ringkasan <span class="text-ink-600">(opsional)</span></span>
						<input
							type="text"
							bind:value={formRingkasan}
							placeholder="Satu kalimat yang tampil di kartu Blog"
							aria-invalid={Boolean(galat.summary)}
							class="mt-1.5 w-full max-w-full rounded-xl border bg-surface px-3 py-2 text-sm text-ink-800 {galat.summary
								? 'border-danger'
								: 'border-ink-450'}"
						/>
						{#if galat.summary}
							<span class="mt-1 block text-xs text-danger">{galat.summary}</span>
						{:else}
							<span class="mt-1 block text-xs text-ink-600">
								Dibiarkan kosong berarti dipotong otomatis dari awal naskah.
							</span>
						{/if}
					</label>

					<label class="block">
						<span class="label-micro">Isi Blog</span>
						<textarea
							bind:value={formIsi}
							rows="12"
							placeholder="Tulis selengkap mungkin. Naskah yang terlalu pendek hampir selalu dikembalikan verifikator."
							aria-invalid={Boolean(galat.body)}
							class="mt-1.5 w-full max-w-full rounded-xl border bg-surface px-3 py-2 text-sm leading-relaxed text-ink-800 {galat.body
								? 'border-danger'
								: 'border-ink-450'}"
						></textarea>
						<span
							class="mt-1 block text-xs {jumlahKata >= MIN_KATA_NASKAH
								? 'text-success'
								: 'text-ink-600'}"
						>
							{formatAngka(jumlahKata)} kata · syarat kirim minimal {MIN_KATA_NASKAH} kata
						</span>
						{#if galat.body}
							<span class="mt-1 block text-xs text-danger">{galat.body}</span>
						{/if}
					</label>
				</div>
			</Card>

			<Card padding="lg">
				<h2 class="text-lg font-semibold text-heading">Klasifikasi dampak</h2>
				<p class="mt-1 text-[13px] leading-relaxed text-ink-600">
					Menentukan ke pilar mana tulisan ini dihitung saat Pertamina Foundation menyusun laporan
					ESG.
				</p>

				<div class="mt-5 grid gap-4 sm:grid-cols-2">
					<label class="block">
						<span class="label-micro">Pilar ESG</span>
						<select
							bind:value={formPilar}
							class="mt-1.5 w-full max-w-full rounded-xl border border-ink-450 bg-surface px-3 py-2 text-sm text-ink-800"
						>
							{#each ESG_PILLARS as pilar (pilar.pillar)}
								<option value={pilar.pillar}>{pilar.pillar} · {pilar.label}</option>
							{/each}
						</select>
					</label>
					<label class="block">
						<span class="label-micro">Tujuan SDG</span>
						<select
							bind:value={formSdg}
							class="mt-1.5 w-full max-w-full rounded-xl border border-ink-450 bg-surface px-3 py-2 text-sm text-ink-800"
						>
							{#each SDG_GOALS as tujuan (tujuan.goal)}
								<option value={String(tujuan.goal)}>SDG {tujuan.goal} · {tujuan.label}</option>
							{/each}
						</select>
					</label>
				</div>

				<label class="mt-4 block">
					<span class="label-micro">Catatan hasil</span>
					<textarea
						bind:value={formCatatanHasil}
						rows="3"
						placeholder="Perubahan yang terjadi, bukan jalannya acara. Contoh: 32 keluarga kini memilah sampah organik setiap hari."
						aria-invalid={Boolean(galat.outcomeNote)}
						class="mt-1.5 w-full max-w-full rounded-xl border bg-surface px-3 py-2 text-sm leading-relaxed text-ink-800 {galat.outcomeNote
							? 'border-danger'
							: 'border-ink-450'}"
					></textarea>
					{#if galat.outcomeNote}
						<span class="mt-1 block text-xs text-danger">{galat.outcomeNote}</span>
					{/if}
				</label>

				<div class="mt-4 grid gap-4 sm:grid-cols-3">
					<label class="block">
						<span class="label-micro">Metrik <span class="text-ink-600">(opsional)</span></span>
						<input
							type="text"
							bind:value={formMetrik}
							placeholder="Sampah terpilah"
							class="mt-1.5 w-full max-w-full rounded-xl border border-ink-450 bg-surface px-3 py-2 text-sm text-ink-800"
						/>
					</label>
					<label class="block">
						<span class="label-micro">Nilai <span class="text-ink-600">(opsional)</span></span>
						<input
							type="number"
							min="0"
							inputmode="numeric"
							bind:value={formNilai}
							placeholder="180"
							class="mt-1.5 w-full max-w-full rounded-xl border border-ink-450 bg-surface px-3 py-2 text-sm text-ink-800"
						/>
					</label>
					<label class="block">
						<span class="label-micro">Satuan <span class="text-ink-600">(opsional)</span></span>
						<input
							type="text"
							bind:value={formSatuan}
							placeholder="kg"
							class="mt-1.5 w-full max-w-full rounded-xl border border-ink-450 bg-surface px-3 py-2 text-sm text-ink-800"
						/>
					</label>
				</div>
			</Card>

			<Card padding="lg">
				<h2 class="text-lg font-semibold text-heading">Dokumentasi aktivitas</h2>
				<p class="mt-1 text-[13px] leading-relaxed text-ink-600">
					Empat isian ini adalah gerbang pertama bukti ESG: tanpa keduanya tulisan tidak dapat
					dipertanggungjawabkan sebagai capaian program.
				</p>

				<div class="mt-5 grid gap-4 sm:grid-cols-3">
					<label class="block sm:col-span-2">
						<span class="label-micro">Lokasi aktivitas</span>
						<input
							type="text"
							bind:value={formLokasi}
							placeholder="Kelurahan, kota, atau provinsi"
							aria-invalid={Boolean(galat.location)}
							class="mt-1.5 w-full max-w-full rounded-xl border bg-surface px-3 py-2 text-sm text-ink-800 {galat.location
								? 'border-danger'
								: 'border-ink-450'}"
						/>
						{#if galat.location}
							<span class="mt-1 block text-xs text-danger">{galat.location}</span>
						{/if}
					</label>
					<label class="block">
						<span class="label-micro">Jumlah peserta</span>
						<input
							type="number"
							min="1"
							inputmode="numeric"
							bind:value={formPeserta}
							placeholder="24"
							aria-invalid={Boolean(galat.participantCount)}
							class="mt-1.5 w-full max-w-full rounded-xl border bg-surface px-3 py-2 text-sm text-ink-800 {galat.participantCount
								? 'border-danger'
								: 'border-ink-450'}"
						/>
						{#if galat.participantCount}
							<span class="mt-1 block text-xs text-danger">{galat.participantCount}</span>
						{/if}
					</label>
				</div>

				<label class="mt-4 block">
					<span class="label-micro">Tanggal aktivitas</span>
					<input
						type="date"
						bind:value={formTanggal}
						max={HARI_INI}
						aria-invalid={Boolean(galat.activityDate)}
						class="mt-1.5 w-full max-w-full rounded-xl border bg-surface px-3 py-2 text-sm text-ink-800 sm:w-56 {galat.activityDate
							? 'border-danger'
							: 'border-ink-450'}"
					/>
					{#if galat.activityDate}
						<span class="mt-1 block text-xs text-danger">{galat.activityDate}</span>
					{/if}
				</label>

				<label class="mt-4 block">
					<span class="label-micro">Sumber bukti</span>
					<input
						type="text"
						bind:value={formBukti}
						placeholder="Nama berkas dokumentasi atau tautan album, mis. bank-sampah-rw04.jpg"
						aria-invalid={Boolean(galat.evidence)}
						class="mt-1.5 w-full max-w-full rounded-xl border bg-surface px-3 py-2 text-sm text-ink-800 {galat.evidence
							? 'border-danger'
							: 'border-ink-450'}"
					/>
					{#if galat.evidence}
						<span class="mt-1 block text-xs text-danger">{galat.evidence}</span>
					{:else}
						<span class="mt-1 block text-xs text-ink-600">
							Foto, daftar hadir, atau laporan tertulis yang dapat diperiksa verifikator.
						</span>
					{/if}
				</label>
			</Card>

			<Card padding="lg">
				<h2 class="text-lg font-semibold text-heading">Izin publikasi</h2>

				{#if !consentProgramAktif}
					<p
						class="mt-3 flex items-start gap-2 rounded-xl border border-danger/30 bg-danger-tint/50 p-3 text-[13px] leading-relaxed text-ink-700"
					>
						<Icon path={ICONS.shield} size={16} class="mt-px shrink-0" />
						<span>
							<span class="font-semibold">Consent program Anda sedang tidak aktif.</span>
							Naskah tidak dapat dikirim sampai consent diaktifkan kembali di halaman Profil.
							Mencabut consent tidak pernah mengurangi poin maupun tier Anda.
						</span>
					</p>
					<div class="mt-3">
						<Button variant="outline" size="sm" href="/awardee/profil">Buka pengaturan consent</Button>
					</div>
				{/if}

				<label class="mt-4 flex items-start gap-2.5 rounded-xl border border-ink-200 p-3">
					<input type="checkbox" bind:checked={formConsent} class="mt-0.5 h-4 w-4 shrink-0" />
					<span class="text-[13px] leading-relaxed text-ink-700">
						Saya mengizinkan Pertamina Foundation memublikasikan tulisan ini beserta nama saya, dan
						memastikan tidak ada data pribadi orang lain: nomor telepon, NIK, alamat rumah: di
						dalam naskah maupun buktinya.
					</span>
				</label>
			</Card>

			<div
				class="flex flex-wrap items-center justify-between gap-3 rounded-card border border-ink-100 bg-surface p-4"
			>
				<p class="min-w-0 text-[13px] leading-relaxed text-ink-600">
					Pengiriman yang diterima mencatat
					<span class="numeric font-semibold text-ink-800">{formatAngka(POIN_CERITA)}</span>
					Poin Kontribusi pada buku besarmu.
				</p>
				<div class="flex flex-wrap items-center gap-2">
					<Button variant="secondary" size="md" href="/awardee/cerita">Batal</Button>
					<Button
						size="md"
						loading={sedangMengirim || editorial.working}
						iconPath={ICONS.upload}
						onclick={kirim}
					>
						{modeRevisi ? 'Kirim ulang tulisan' : 'Kirim ke antrean tinjauan'}
					</Button>
				</div>
			</div>
		</div>

		<!-- Kolom kanan: gerbang yang harus dilewati naskah. -->
		<div class="min-w-0 space-y-4">
			<Card padding="md">
				<RequirementList
					items={syaratKirim}
					title="Syarat pengiriman"
					description="Diperiksa langsung pada naskahmu, bukan pada isian formulir semata."
				/>
			</Card>

			<Card padding="md">
				<RequirementList
					items={gerbangEsg}
					title="Empat gerbang bukti ESG"
					description="Terisi otomatis sambil kamu mengetik. Gerbang yang lengkap mempercepat tinjauan."
				/>
			</Card>

			<Card padding="md">
				<p class="text-sm font-semibold text-ink-800">Setelah kamu mengirim</p>
				<ol class="mt-2.5 space-y-2 text-[13px] leading-relaxed text-ink-600">
					<li>
						<span class="font-medium text-ink-800">1. Antrean tinjauan</span>: verifikator mengambil
						naskah sesuai urutan masuk, yang paling lama menunggu lebih dulu.
					</li>
					<li>
						<span class="font-medium text-ink-800">2. Keputusan</span>: disetujui, atau dikembalikan
						dengan catatan perbaikan yang wajib tertulis.
					</li>
					<li>
						<span class="font-medium text-ink-800">3. Terbit</span>: tulisan tayang di ruang publik dan
						masuk story bank untuk laporan ESG.
					</li>
				</ol>
				{#if modeRevisi}
					<p class="mt-3 border-t border-ink-100 pt-3 text-xs leading-relaxed text-ink-600">
						Pengiriman ulang menaikkan penghitung revisi naskah ini. Angka itu dibaca verifikator
						sebagai sinyal naskah yang berputar, bukan sebagai penilaian atas dirimu.
					</p>
				{/if}
			</Card>

			{#if syaratBelumTerpenuhi.length > 0}
				<div class="rounded-card border border-ink-200 bg-canvas p-4">
					<p class="flex items-center gap-2 text-sm font-semibold text-ink-800">
						<Icon path={ICONS.info} size={16} />
						Belum dapat dikirim
					</p>
					<ul class="mt-2 space-y-1.5">
						{#each syaratBelumTerpenuhi as syarat (syarat.key)}
							<li class="text-[13px] leading-relaxed text-ink-700">
								<StatusBadge label={syarat.label} color="amber" size="sm" />
								<span class="mt-0.5 block text-ink-600">{syarat.hint}</span>
							</li>
						{/each}
					</ul>
				</div>
			{/if}
		</div>
	</div>
{/if}
