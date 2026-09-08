<script>
	/**
	 * EventProposalForm: formulir usulan kegiatan komunitas.
	 *
	 * Komponen lokal zona Awardee (KP-5). Awardee mengusulkan agenda; verifikator
	 * memutuskan. Formulir ini adalah sisi awardee dari alur E-01 `docs/10` §5.4.
	 *
	 * EMPAT KEPUTUSAN YANG TIDAK TERBACA DARI KODE:
	 *
	 * 1. **Usulan dikirim lewat `editorial.proposeEvent`, bukan repository.** Store
	 *    meneruskannya ke `ContentReviewService`, yang mencatat pengusul DARI AKTOR
	 *    SESI: bukan dari isian formulir. Identitas pengusul adalah dasar
	 *    pemeriksaan konflik kepentingan saat persetujuan; nilai yang boleh dikirim
	 *    dari formulir membuat pemeriksaan itu dapat dilewati dengan mengetik id
	 *    orang lain.
	 * 2. **Status awal DRAFT, bukan DIUSULKAN.** Peta transisi `DRAFT → DIUSULKAN`
	 *    yang menjadikannya usulan, dan hanya lewat peta itulah peran pengusul
	 *    diperiksa. Menyetel `DIUSULKAN` langsung di sini akan melompati satu-
	 *    satunya gerbang yang ada.
	 * 3. **Penolakan menyebut isian mana yang belum benar**, lewat `Validator` dan
	 *    galat per field: bukan satu kalimat "formulir belum lengkap" yang memaksa
	 *    pengusul menebak kolomnya.
	 * 4. **Kuota, poin, dan daftar peserta TIDAK ada di formulir ini.** Usulan
	 *    kegiatan bukan mekanik gamifikasi, dan menaruh nilai poin di sini akan
	 *    mendorong orang mengusulkan agenda demi angkanya.
	 *
	 * @see docs/12-BUILD-CONTRACT-V2.md: §2.9 ContentReviewService.proposeEvent
	 * @see docs/10-REVISION-SPEC.md: §5.4 alur usulan kegiatan
	 */
	import { Button, Card, Icon, ICONS } from '$lib/components';
	import { CHAPTERS } from '$lib/domain/constants/community.js';
	import { CommunityEvent, EventStatus, EVENT_TYPE_META } from '$lib/domain/entities/CommunityEvent.js';
	import { Rule, Validator } from '$lib/domain/validation/Validator.js';
	import { editorial } from '$lib/stores/editorial.svelte.js';
	import { toast, ToastType } from '$lib/stores/toast.svelte.js';

	/**
	 * @typedef {object} EventProposalFormProps
	 * @property {import('$lib/domain/entities/Awardee.js').Awardee|null} awardee
	 * @property {() => void} [onsubmitted] Dipanggil sesudah usulan diterima domain.
	 */

	/** @type {EventProposalFormProps} */
	let { awardee = null, onsubmitted = undefined } = $props();

	/** Nilai pilihan "kegiatan terbuka untuk seluruh chapter". */
	const LINTAS_CHAPTER = '';

	/**
	 * Tanggal waktu lokal untuk `<input type="date">`: bukan `toISOString()`, yang
	 * memundurkan tanggal satu hari bagi pengusul di zona WIB setiap sore.
	 * @param {Date} tanggal
	 * @returns {string}
	 */
	function isoLokal(tanggal) {
		const dua = (/** @type {number} */ nilai) => String(nilai).padStart(2, '0');
		return `${tanggal.getFullYear()}-${dua(tanggal.getMonth() + 1)}-${dua(tanggal.getDate())}`;
	}

	const HARI_INI = isoLokal(new Date());

	const validator = new Validator({
		title: [
			Rule.required('Judul kegiatan wajib diisi.'),
			Rule.minLength(10, 'Judul terlalu pendek untuk menerangkan isi kegiatan: minimal 10 karakter.'),
			Rule.maxLength(120, 'Judul maksimal 120 karakter.')
		],
		description: [
			Rule.required('Deskripsi wajib diisi: verifikator memutuskan dari penjelasan ini.'),
			Rule.minLength(40, 'Jelaskan setidaknya dalam 40 karakter: untuk siapa dan apa yang dikerjakan.')
		],
		date: [
			Rule.required('Tanggal pelaksanaan wajib diisi.'),
			Rule.date('Tanggal pelaksanaan belum terbaca sebagai tanggal yang sah.')
		],
		startTime: [Rule.required('Jam mulai wajib diisi.')],
		endTime: [Rule.required('Jam selesai wajib diisi.')],
		location: [Rule.required('Lokasi atau kanal daring wajib diisi.')]
	});

	let formJudul = $state('');
	let formJenis = $state(Object.values(EVENT_TYPE_META)[0].code);
	let formDeskripsi = $state('');
	let formTanggal = $state('');
	let formMulai = $state('09:00');
	let formSelesai = $state('11:00');
	let formDaring = $state(true);
	let formLokasi = $state('');
	let formChapter = $state(LINTAS_CHAPTER);
	let formNarasumber = $state('');

	/** @type {boolean} Pengusul sudah menekan kirim; galat per field baru tampil sesudahnya. */
	let sudahDicoba = $state(false);

	const nilaiFormulir = $derived({
		title: formJudul,
		description: formDeskripsi,
		date: formTanggal,
		startTime: formMulai,
		endTime: formSelesai,
		location: formLokasi
	});

	const validasi = $derived(validator.validate(nilaiFormulir));
	const galat = $derived(sudahDicoba ? validasi.errors : {});

	/**
	 * Apakah jam selesai berada sesudah jam mulai.
	 *
	 * Diperiksa terpisah dari `Validator` karena syaratnya melibatkan DUA field
	 * sekaligus, sedangkan skema validator menilai satu field pada satu waktu.
	 */
	const rentangWaktuSah = $derived(formMulai !== '' && formSelesai !== '' && formSelesai > formMulai);

	const layakKirim = $derived(validasi.valid && rentangWaktuSah && awardee !== null);

	/**
	 * Menyusun kegiatan kandidat dari isian formulir.
	 * @returns {CommunityEvent|null} `null` bila tanggal atau jam belum terbaca.
	 */
	function susunKegiatan() {
		if (!awardee) return null;
		const mulai = new Date(`${formTanggal}T${formMulai}:00`);
		const selesai = new Date(`${formTanggal}T${formSelesai}:00`);
		if (Number.isNaN(mulai.getTime()) || Number.isNaN(selesai.getTime())) return null;

		return new CommunityEvent({
			id: `EVT-USUL-${awardee.id}-${Date.now()}`,
			title: formJudul.trim(),
			type: formJenis,
			status: EventStatus.DRAFT,
			description: formDeskripsi.trim(),
			speakerName: formNarasumber.trim(),
			chapterId: formChapter,
			community: awardee.community,
			location: formLokasi.trim(),
			isOnline: formDaring,
			startsAt: mulai,
			endsAt: selesai
		});
	}

	/** @returns {void} */
	function kosongkan() {
		formJudul = '';
		formJenis = Object.values(EVENT_TYPE_META)[0].code;
		formDeskripsi = '';
		formTanggal = '';
		formMulai = '09:00';
		formSelesai = '11:00';
		formDaring = true;
		formLokasi = '';
		formChapter = LINTAS_CHAPTER;
		formNarasumber = '';
		sudahDicoba = false;
	}

	/**
	 * Mengirim usulan ke antrean verifikator.
	 *
	 * Penolakan menyebut isian mana yang belum benar, satu per satu: pesan galat
	 * umum membuat pengusul menekan tombol yang sama berulang kali.
	 * @returns {Promise<void>}
	 */
	async function usulkan() {
		sudahDicoba = true;
		if (!layakKirim) {
			const pesan = Object.values(validasi.errors);
			if (!rentangWaktuSah) pesan.push('Jam selesai harus berada sesudah jam mulai.');
			if (!awardee) pesan.push('Sesi awardee belum termuat: masuk kembali untuk mengusulkan.');
			toast.push({
				type: ToastType.WARNING,
				title: 'Usulan belum dapat dikirim',
				message: pesan.join(' · ')
			});
			return;
		}

		const kegiatan = susunKegiatan();
		if (!kegiatan) return;

		const hasil = await editorial.proposeEvent(kegiatan);
		if (!hasil.ok) return;
		kosongkan();
		onsubmitted?.();
	}
</script>

<Card padding="lg">
	<h2 class="text-lg font-semibold text-heading">Usulkan kegiatan</h2>
	<p class="mt-1 text-[13px] leading-relaxed text-ink-600">
		Usulan masuk ke antrean verifikator. Yang disetujui terbit ke kalender publik; yang ditolak
		selalu disertai alasan tertulis, dan alasannya dapat kamu baca di daftar bawah.
	</p>

	<div class="mt-5 space-y-4">
		<label class="block">
			<span class="label-micro">Judul kegiatan</span>
			<input
				type="text"
				bind:value={formJudul}
				placeholder="Contoh: Kelas pembukuan sederhana untuk UMKM chapter PF 11"
				aria-invalid={Boolean(galat.title)}
				class="mt-1.5 w-full max-w-full rounded-xl border bg-surface px-3 py-2 text-sm text-ink-800 {galat.title
					? 'border-danger'
					: 'border-ink-450'}"
			/>
			{#if galat.title}
				<span class="mt-1 block text-xs text-danger">{galat.title}</span>
			{/if}
		</label>

		<div class="grid gap-4 sm:grid-cols-2">
			<label class="block">
				<span class="label-micro">Jenis kegiatan</span>
				<select
					bind:value={formJenis}
					class="mt-1.5 w-full max-w-full rounded-xl border border-ink-450 bg-surface px-3 py-2 text-sm text-ink-800"
				>
					{#each Object.values(EVENT_TYPE_META) as meta (meta.code)}
						<option value={meta.code}>{meta.label}</option>
					{/each}
				</select>
			</label>
			<label class="block">
				<span class="label-micro">Chapter penyelenggara</span>
				<select
					bind:value={formChapter}
					class="mt-1.5 w-full max-w-full rounded-xl border border-ink-450 bg-surface px-3 py-2 text-sm text-ink-800"
				>
					<option value={LINTAS_CHAPTER}>Lintas chapter</option>
					{#each CHAPTERS as chapterDef (chapterDef.id)}
						<option value={chapterDef.id}>{chapterDef.label}</option>
					{/each}
				</select>
			</label>
		</div>

		<label class="block">
			<span class="label-micro">Deskripsi</span>
			<textarea
				bind:value={formDeskripsi}
				rows="4"
				placeholder="Untuk siapa kegiatan ini, apa yang dikerjakan, dan hasil apa yang diharapkan."
				aria-invalid={Boolean(galat.description)}
				class="mt-1.5 w-full max-w-full rounded-xl border bg-surface px-3 py-2 text-sm leading-relaxed text-ink-800 {galat.description
					? 'border-danger'
					: 'border-ink-450'}"
			></textarea>
			{#if galat.description}
				<span class="mt-1 block text-xs text-danger">{galat.description}</span>
			{/if}
		</label>

		<div class="grid gap-4 sm:grid-cols-3">
			<label class="block">
				<span class="label-micro">Tanggal</span>
				<input
					type="date"
					bind:value={formTanggal}
					min={HARI_INI}
					aria-invalid={Boolean(galat.date)}
					class="mt-1.5 w-full max-w-full rounded-xl border bg-surface px-3 py-2 text-sm text-ink-800 {galat.date
						? 'border-danger'
						: 'border-ink-450'}"
				/>
				{#if galat.date}
					<span class="mt-1 block text-xs text-danger">{galat.date}</span>
				{/if}
			</label>
			<label class="block">
				<span class="label-micro">Jam mulai</span>
				<input
					type="time"
					bind:value={formMulai}
					class="mt-1.5 w-full max-w-full rounded-xl border border-ink-450 bg-surface px-3 py-2 text-sm text-ink-800"
				/>
			</label>
			<label class="block">
				<span class="label-micro">Jam selesai</span>
				<input
					type="time"
					bind:value={formSelesai}
					aria-invalid={!rentangWaktuSah}
					class="mt-1.5 w-full max-w-full rounded-xl border bg-surface px-3 py-2 text-sm text-ink-800 {rentangWaktuSah
						? 'border-ink-450'
						: 'border-danger'}"
				/>
			</label>
		</div>

		{#if !rentangWaktuSah}
			<p class="text-xs text-danger">Jam selesai harus berada sesudah jam mulai.</p>
		{/if}

		<fieldset class="block">
			<legend class="label-micro">Mode pelaksanaan</legend>
			<div class="mt-1.5 flex flex-wrap gap-4">
				<label class="inline-flex min-h-11 items-center gap-2 text-sm text-ink-700">
					<input type="radio" value={true} bind:group={formDaring} class="h-4 w-4" />
					Daring
				</label>
				<label class="inline-flex min-h-11 items-center gap-2 text-sm text-ink-700">
					<input type="radio" value={false} bind:group={formDaring} class="h-4 w-4" />
					Luring
				</label>
			</div>
		</fieldset>

		<label class="block">
			<span class="label-micro">{formDaring ? 'Kanal daring' : 'Lokasi'}</span>
			<input
				type="text"
				bind:value={formLokasi}
				placeholder={formDaring ? 'Zoom, Google Meet, atau kanal lain' : 'Alamat atau nama tempat'}
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
			<span class="label-micro">Narasumber <span class="text-ink-600">(opsional)</span></span>
			<input
				type="text"
				bind:value={formNarasumber}
				placeholder="Nama dan peran singkat"
				class="mt-1.5 w-full max-w-full rounded-xl border border-ink-450 bg-surface px-3 py-2 text-sm text-ink-800"
			/>
		</label>
	</div>

	<div class="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-4">
		<p class="flex min-w-0 items-start gap-2 text-xs leading-relaxed text-ink-600">
			<Icon path={ICONS.info} size={14} class="mt-px shrink-0" />
			<span>Usulan tidak memberi poin. Yang dihargai adalah kehadiran pada kegiatannya.</span>
		</p>
		<Button loading={editorial.working} iconPath={ICONS.upload} onclick={usulkan}>
			Kirim usulan
		</Button>
	</div>
</Card>
