<script>
	/**
	 * DecisionDialog: pengumpul masukan wajib sebuah keputusan editorial.
	 *
	 * @prop {import('./decisions.js').Decision|null} decision  Keputusan yang dipilih; `null` menutup dialog.
	 * @prop {string} entityTitle   Judul naskah atau kegiatan yang sedang diputuskan.
	 * @prop {boolean} working      Permintaan sedang dikirim.
	 * @prop {boolean} sensitivityReady  Checklist data sensitif sudah tuntas 21 butir.
	 * @prop {(payload: import('./decisions.js').DecisionPayload) => void} onconfirm
	 * @prop {() => void} oncancel
	 *
	 * Empat keputusan yang tidak terbaca dari kode:
	 *
	 * 1. **Isian yang muncul ditentukan `decision.input`, bukan oleh percabangan
	 *    per halaman.** Dengan begitu "Minta revisi" di halaman naskah dan "Tolak
	 *    usulan" di halaman kegiatan menuntut hal yang sama dengan kalimat yang
	 *    sama, karena keduanya membaca registri yang sama.
	 * 2. **Penolakan karena catatan kosong terjadi DI SINI, sebelum permintaan
	 *    dikirim.** `ContentReviewService` memang menolaknya lagi, tetapi
	 *    penolakan yang baru terbaca sesudah dialog tertutup memaksa verifikator
	 *    mengetik ulang seluruh catatannya (`docs/12` §3.5 WP-06 butir 6).
	 * 3. **Pesan galat tidak menghilang saat pengguna mengetik.** Ia bertahan
	 *    hingga tombol ditekan lagi: pesan yang lenyap pada ketukan pertama sering
	 *    hilang sebelum sempat dibaca.
	 * 4. **Konfirmasi data sensitif TIDAK dapat dicentang dari dialog ini.**
	 *    Kesiapannya dioper sebagai `sensitivityReady` dari panel gerbang, karena
	 *    kedua puluh satu butirnya harus dibaca di samping naskah: bukan dicentang
	 *    sekaligus lewat satu kotak di dalam dialog.
	 */
	import { Button, Modal } from '$lib/components';
	import {
		ARCHIVE_REASON_LABEL,
		DecisionInput,
		periksaMasukan,
		PESAN_SENSITIVITAS_WAJIB
	} from './decisions.js';

	/**
	 * @type {{
	 *   decision: import('./decisions.js').Decision|null,
	 *   entityTitle?: string,
	 *   working?: boolean,
	 *   sensitivityReady?: boolean,
	 *   onconfirm: (payload: import('./decisions.js').DecisionPayload) => void,
	 *   oncancel: () => void
	 * }}
	 */
	let {
		decision = null,
		entityTitle = '',
		working = false,
		sensitivityReady = false,
		onconfirm,
		oncancel
	} = $props();

	/** @type {string} Catatan bebas yang sedang diketik. */
	let catatan = $state('');

	/** @type {string} Kunci alasan arsip yang dipilih. */
	let alasan = $state('');

	/** @type {string} Pesan penolakan masukan; kosong berarti belum ada. */
	let galat = $state('');

	/** @type {string|null} Keputusan yang isiannya sedang ditampilkan; pelacak reset. */
	let terakhirDirender = $state(null);

	// Isian dikosongkan setiap kali keputusan yang dibuka berganti. Tanpa ini,
	// alasan penolakan usulan sebelumnya akan terbawa ke usulan berikutnya dan
	// tersimpan sebagai jejak audit milik orang lain.
	$effect(() => {
		const kunci = decision?.to ?? null;
		if (kunci === terakhirDirender) return;
		terakhirDirender = kunci;
		catatan = '';
		alasan = '';
		galat = '';
	});

	const butuhCatatan = $derived(decision?.input === DecisionInput.NOTE);
	const butuhAlasan = $derived(decision?.input === DecisionInput.ARCHIVE_REASON);
	const butuhSensitivitas = $derived(decision?.input === DecisionInput.SENSITIVITY);
	const adaCatatanOpsional = $derived(butuhSensitivitas && decision?.noteLabel !== '');

	/** Daftar alasan arsip sebagai pasangan kunci dan label. */
	const daftarAlasan = Object.entries(ARCHIVE_REASON_LABEL);

	/** Menyusun payload dari isian yang sedang terlihat. */
	function payloadKini() {
		return {
			note: catatan,
			reason: alasan,
			sensitivityConfirmed: butuhSensitivitas ? sensitivityReady : undefined
		};
	}

	/** Memeriksa kelengkapan lalu meneruskan keputusan ke pemanggil. */
	function konfirmasi() {
		if (!decision) return;
		const hasil = periksaMasukan(decision, payloadKini());
		if (!hasil.ok) {
			galat = hasil.message;
			return;
		}
		galat = '';
		onconfirm(payloadKini());
	}
</script>

<Modal
	open={decision !== null}
	title={decision?.label ?? ''}
	size="md"
	onclose={oncancel}
	closeOnBackdrop={!working}
>
	{#if decision}
		<div class="space-y-4">
			<p class="text-sm leading-relaxed text-ink-600">
				{decision.description}
			</p>

			{#if entityTitle !== ''}
				<p class="rounded-control bg-ink-50 p-3 text-sm font-semibold text-ink-800">
					{entityTitle}
				</p>
			{/if}

			{#if butuhSensitivitas}
				<p
					class="rounded-control border border-ink-200 p-3 text-[13px] leading-relaxed text-ink-700 {sensitivityReady
						? 'bg-success-tint'
						: 'bg-warning-tint'}"
				>
					{sensitivityReady
						? 'Checklist data sensitif sudah dikonfirmasi lolos seluruhnya. Persetujuan akan mencatatnya pada jejak audit.'
						: PESAN_SENSITIVITAS_WAJIB}
				</p>
			{/if}

			{#if butuhAlasan}
				<div>
					<label class="label-micro mb-1.5 block" for="alasan-arsip">{decision.noteLabel}</label>
					<select
						id="alasan-arsip"
						bind:value={alasan}
						class="min-h-11 w-full rounded-control border border-ink-200 bg-white px-3 text-sm text-ink-800"
					>
						<option value="">Pilih alasan arsip…</option>
						{#each daftarAlasan as [kunci, label] (kunci)}
							<option value={kunci}>{label}</option>
						{/each}
					</select>
				</div>
			{/if}

			{#if butuhCatatan || adaCatatanOpsional}
				<div>
					<label class="label-micro mb-1.5 block" for="catatan-keputusan">
						{decision.noteLabel}
					</label>
					<textarea
						id="catatan-keputusan"
						bind:value={catatan}
						rows="4"
						placeholder={decision.notePlaceholder}
						class="w-full rounded-control border border-ink-200 bg-white p-3 text-sm leading-relaxed text-ink-800"
					></textarea>
				</div>
			{/if}

			{#if galat !== ''}
				<p class="text-sm leading-relaxed font-semibold text-danger" role="alert">{galat}</p>
			{/if}
		</div>
	{/if}

	{#snippet footer()}
		<Button variant="ghost" size="md" disabled={working} onclick={oncancel}>Batal</Button>
		<Button
			variant={decision?.tone === 'danger' ? 'danger' : 'primary'}
			size="md"
			loading={working}
			onclick={konfirmasi}
		>
			{decision?.label ?? 'Konfirmasi'}
		</Button>
	{/snippet}
</Modal>
