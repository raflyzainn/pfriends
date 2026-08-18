<script>
	/**
	 * HALAMAN `/verifikator/cerita/[id]` — meja peninjauan satu submission blog.
	 *
	 * Tanggung jawab: menempatkan naskah utuh berdampingan dengan KETIGA gerbang
	 * keputusan, lalu menawarkan tepat keputusan yang sah dari keadaan naskah itu.
	 *
	 * Enam keputusan yang tidak terbaca dari kode:
	 *
	 * 1. **Ketiga gerbang berdiri TERPISAH dan tidak pernah dijumlahkan.**
	 *    Kelayakan fitur publik (5 syarat), kesiapan bukti ESG (4 syarat), dan
	 *    pemeriksaan data sensitif (21 butir) masing-masing punya panel sendiri
	 *    dengan cacahnya sendiri. Ketiganya konjungtif; satu angka gabungan
	 *    bernilai "80%" akan terbaca "hampir lolos" padahal artinya "ada syarat
	 *    yang tidak terpenuhi" (`docs/12` §3.5 WP-06 butir 5).
	 * 2. **Tombol keputusan dirender dari `allowedStoryTransitions(status, role)`.**
	 *    Halaman ini tidak menyimpan satu pun daftar tombol; ia hanya memberi rupa
	 *    kepada status tujuan yang dinyatakan sah peta transisi domain.
	 * 3. **Persetujuan menuntut kedua puluh satu butir dikonfirmasi lebih dahulu.**
	 *    `ContentReviewService.approveStory` menolak `sensitivityConfirmed` yang
	 *    tidak `true`; halaman ini menjelaskan syarat itu sebelum permintaan
	 *    dikirim, bukan sesudah verifikator menekan tombol dan gagal tanpa sebab.
	 * 4. **Naskah ditampilkan utuh, bukan diringkas.** Checklist data sensitif
	 *    mustahil dijalankan atas kutipan; verifikator harus membaca kalimat yang
	 *    akan tayang, bukan ringkasannya.
	 * 5. **Riwayat catatan peninjauan ditampilkan seluruhnya, tertua di atas.**
	 *    Yang dinilai bukan hanya naskah, melainkan juga apakah permintaan revisi
	 *    sebelumnya benar-benar dikerjakan.
	 * 6. **Konflik kepentingan diperiksa meski secara sah tidak pernah menyala.**
	 *    `UserAccount.awardeeId` wajib `null` untuk VERIFIER, sehingga
	 *    `story.authorId` selalu menunjuk orang lain. Pemeriksaan ini pertahanan
	 *    berlapis untuk data yang lolos invarian karena kekeliruan migrasi kelak.
	 *
	 * @see docs/10-REVISION-SPEC.md — §6.4 detail peninjauan, §5.3 tabel transisi, US-R16
	 * @see docs/00-SOURCE-BRIEF.md — Hal 12 minimum for public feature & minimum for ESG evidence
	 * @see docs/04-ESG-GOVERNANCE.md — §6 checklist data sensitif 21 butir
	 */
	import { page } from '$app/state';
	import { EmptyState, PageHeader, StatusBadge, ICONS } from '$lib/components';
	import { AccessPolicy } from '$lib/domain/policies/AccessPolicy.js';
	import { catalog } from '$lib/stores/catalog.svelte.js';
	import { editorial } from '$lib/stores/editorial.svelte.js';
	import { session } from '$lib/stores/session.svelte.js';
	import { formatTanggal } from '$lib/utils/format.js';
	import {
		DecisionBar,
		DecisionDialog,
		GatePanel,
		PESAN_KONFLIK_CERITA,
		SensitivityGate,
		SlaBadge,
		TOTAL_BUTIR_SENSITIF,
		gerbangBuktiEsg,
		gerbangFiturPublik,
		keputusanCerita,
		slaAntrean
	} from '../../_components/index.js';

	/** Waktu acuan usia antrean dan masa berlaku validasi PF di halaman ini. */
	const sekarang = new Date();

	/** @type {Set<number>} Butir checklist data sensitif yang sudah dikonfirmasi. */
	let butirDikonfirmasi = $state(new Set());

	/** @type {import('../../_components/decisions.js').Decision|null} */
	let keputusanTerbuka = $state(null);

	const idNaskah = $derived(page.params.id ?? '');

	/** @type {import('$lib/domain/entities/Story.js').Story|null} */
	const naskah = $derived(catalog.stories.find((story) => story.id === idNaskah) ?? null);

	/** Penulis naskah; dibutuhkan gerbang kelayakan fitur publik. */
	const penulis = $derived(
		naskah ? (catalog.awardees.find((awardee) => awardee.id === naskah.authorId) ?? null) : null
	);

	/** Gerbang 1 — kelayakan fitur publik; `null` bila penulisnya tidak ditemukan. */
	const gerbangSatu = $derived(naskah ? gerbangFiturPublik(penulis, naskah, sekarang) : null);

	/** Gerbang 2 — kesiapan bukti ESG. */
	const gerbangDua = $derived(naskah ? gerbangBuktiEsg(naskah) : null);

	/**
	 * Gerbang 3 dinyatakan tuntas hanya bila SELURUH butirnya dikonfirmasi.
	 *
	 * Ambangnya dibaca dari panjang daftar butir, bukan ditulis sebagai angka:
	 * daftar yang bertambah satu butir tanpa ambangnya ikut naik akan meloloskan
	 * naskah yang belum diperiksa penuh.
	 */
	const sensitivitasTuntas = $derived(butirDikonfirmasi.size === TOTAL_BUTIR_SENSITIF);

	/** Keputusan yang sah dari keadaan naskah ini bagi peran yang sedang masuk. */
	const keputusan = $derived(naskah ? keputusanCerita(naskah.status, session.role) : []);

	/** Alasan tertulis mengapa keputusan dimatikan; kosong berarti tidak ada halangan. */
	const halangan = $derived(
		naskah && AccessPolicy.isSelfReview(session.awardeeId, naskah.authorId)
			? PESAN_KONFLIK_CERITA
			: ''
	);

	/**
	 * Rumusan sumber Hal 12 sebuah gerbang, dirangkai dari `labelSumber` tiap
	 * syaratnya.
	 *
	 * Sengaja TIDAK diketik ulang sebagai kalimat tetap. Rumusan yang ditulis lepas
	 * mengeja ambang kontribusinya sebagai angka di dalam teks, dan angka itu akan
	 * tetap berbunyi demikian pada hari `AMBANG_FITUR_PUBLIK` berubah — persis jenis
	 * pergeseran yang dilarang A-1. Merangkainya dari daftar syarat membuat judul
	 * panel mustahil berselisih dengan isi panelnya sendiri.
	 *
	 * @param {import('../../_components/gates.js').GateResult|null} gate
	 * @returns {string} Kosong bila gerbangnya belum dapat dinilai.
	 */
	function rumusanSumber(gate) {
		if (!gate) return '';
		return gate.checks
			.map((check) => check.labelSumber)
			.filter((label) => typeof label === 'string' && label !== '')
			.join(' + ');
	}

	/** Paragraf naskah, dipecah pada baris kosong. */
	const paragraf = $derived(
		naskah ? naskah.body.split(/\n{2,}/).filter((blok) => blok.trim() !== '') : []
	);

	/**
	 * Mengirim keputusan ke store editorial.
	 * @param {import('../../_components/decisions.js').DecisionPayload} payload
	 * @returns {Promise<void>}
	 */
	async function kirim(payload) {
		if (!naskah || !keputusanTerbuka || keputusanTerbuka.jalankan === null) return;
		const hasil = await keputusanTerbuka.jalankan(naskah, payload);
		if (hasil.ok) {
			keputusanTerbuka = null;
			await catalog.refresh();
		}
	}
</script>

{#if !naskah}
	<PageHeader
		eyebrow="Submission Blog"
		title="Submission tidak ditemukan"
		backHref="/verifikator/cerita"
		backLabel="Kembali ke Submission Blog"
	/>
	<div class="mt-5">
		<EmptyState
			title="Submission tidak ditemukan"
			message="Identitas naskah pada tautan ini tidak ada di katalog. Naskah mungkin sudah diarsipkan, atau tautannya keliru disalin."
			iconPath={ICONS.warning}
			actionLabel="Kembali ke Submission Blog"
			actionHref="/verifikator/cerita"
		/>
	</div>
{:else}
	<PageHeader
		eyebrow="Submission Blog · meja peninjauan"
		title={naskah.title}
		subtitle="Ditulis {naskah.authorName} · {naskah.wordCount} kata · perkiraan baca {naskah.readMinutes} menit"
		backHref="/verifikator/cerita"
		backLabel="Kembali ke Submission Blog"
	/>

	<div class="mt-4 flex flex-wrap items-center gap-2">
		<StatusBadge
			label={naskah.statusMeta.label}
			color={naskah.statusMeta.badgeColor}
			size="md"
			variant="soft"
		/>
		<SlaBadge sla={slaAntrean(naskah, sekarang)} size="md" />
		{#if naskah.revisionCount > 0}
			<span class="text-xs text-ink-600">Sudah {naskah.revisionCount} kali direvisi</span>
		{/if}
	</div>

	<section class="card mt-5 p-5" aria-labelledby="judul-keputusan">
		<h2 id="judul-keputusan" class="text-base font-bold text-heading">Keputusan yang tersedia</h2>
		<p class="mt-1 mb-4 text-sm leading-relaxed text-ink-600">
			Daftar di bawah berasal dari peta transisi domain untuk status
			<span class="font-semibold">{naskah.statusMeta.label}</span>
			dan peran {session.roleLabel}. Ia bukan daftar tombol yang ditulis untuk halaman ini.
		</p>

		<DecisionBar
			decisions={keputusan}
			blockedReason={halangan}
			working={editorial.working}
			emptyMessage="Naskah ini sudah berada pada keadaan akhir; tidak ada transisi keluar bagi peran mana pun."
			onpick={(decision) => (keputusanTerbuka = decision)}
		/>

		{#if !sensitivitasTuntas}
			<p class="mt-4 text-[13px] leading-relaxed text-ink-600">
				Persetujuan naskah baru dapat dikirim setelah seluruh butir checklist data sensitif di
				panel gerbang ketiga dikonfirmasi lolos.
			</p>
		{/if}
	</section>

	<div class="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
		<article class="min-w-0 space-y-6">
			<section class="card p-5" aria-labelledby="judul-naskah">
				<h2 id="judul-naskah" class="kicker">Naskah utuh</h2>
				{#if naskah.summary !== ''}
					<p class="mt-2 text-[15px] leading-relaxed font-semibold text-ink-800">
						{naskah.summary}
					</p>
				{/if}
				<div class="mt-4 space-y-3">
					{#each paragraf as blok, indeks (indeks)}
						<p class="text-[15px] leading-relaxed text-ink-700">{blok}</p>
					{/each}
				</div>
			</section>

			<section class="card p-5" aria-labelledby="judul-dokumentasi">
				<h2 id="judul-dokumentasi" class="kicker">Dokumentasi aktivitas</h2>
				<dl class="mt-3 grid gap-3 sm:grid-cols-2">
					<div>
						<dt class="label-micro">Lokasi</dt>
						<dd class="text-sm text-ink-800">{naskah.location || 'Belum diisi'}</dd>
					</div>
					<div>
						<dt class="label-micro">Tanggal aktivitas</dt>
						<dd class="text-sm text-ink-800">
							{naskah.activityDate ? formatTanggal(naskah.activityDate, 'panjang') : 'Belum diisi'}
						</dd>
					</div>
					<div>
						<dt class="label-micro">Jumlah peserta</dt>
						<dd class="numeric text-sm text-ink-800">{naskah.participantCount}</dd>
					</div>
					<div>
						<dt class="label-micro">Lampiran bukti</dt>
						<dd class="numeric text-sm text-ink-800">{naskah.mediaRefs.length}</dd>
					</div>
				</dl>

				{#if naskah.outcome}
					<div class="mt-4 border-t border-ink-100 pt-4">
						<p class="label-micro">Catatan hasil</p>
						<p class="mt-1 text-sm leading-relaxed text-ink-700">{naskah.outcome.note}</p>
						<p class="numeric mt-1 text-sm font-semibold text-ink-900">
							{naskah.outcome.metric}: {naskah.outcome.value}
							{naskah.outcome.unit}
						</p>
					</div>
				{/if}
			</section>

			<section class="card p-5" aria-labelledby="judul-riwayat">
				<h2 id="judul-riwayat" class="kicker">Riwayat catatan peninjauan</h2>
				{#if naskah.reviewNotes.length === 0}
					<p class="mt-2 text-sm leading-relaxed text-ink-600">
						Belum ada catatan peninjauan pada naskah ini.
					</p>
				{:else}
					<ol class="mt-3 space-y-3">
						{#each naskah.reviewNotes as catatan, indeks (indeks)}
							<li class="border-l-2 border-ink-200 pl-3">
								<p class="text-sm leading-relaxed text-ink-700">{catatan.note}</p>
								<p class="mt-1 text-xs text-ink-600">
									{catatan.reviewerId} · {formatTanggal(catatan.at, 'waktu')}
								</p>
							</li>
						{/each}
					</ol>
				{/if}
			</section>
		</article>

		<aside class="min-w-0 space-y-4" aria-label="Tiga gerbang keputusan">
			<GatePanel
				kicker="Gerbang 1 dari 3"
				title="Kelayakan fitur publik"
				sumber={rumusanSumber(gerbangSatu)}
				gate={gerbangSatu}
				unavailableMessage="Penulis naskah ini tidak ditemukan di katalog awardee, sehingga kelayakannya belum dapat dinilai. Ini kekeliruan data, bukan kegagalan gerbang."
			/>

			<GatePanel
				kicker="Gerbang 2 dari 3"
				title="Kesiapan bukti ESG"
				sumber={rumusanSumber(gerbangDua)}
				gate={gerbangDua}
			/>

			<SensitivityGate
				kicker="Gerbang 3 dari 3"
				bind:confirmed={butirDikonfirmasi}
				recordedScan={naskah.sensitivityScan}
			/>

			<p class="text-xs leading-relaxed text-ink-600">
				Ketiga gerbang di atas sengaja tidak dijumlahkan menjadi satu nilai. Syaratnya konjungtif:
				satu saja tidak terpenuhi berarti naskah belum boleh tayang, dan angka gabungan justru
				menyembunyikan hal itu.
			</p>
		</aside>
	</div>

	<DecisionDialog
		decision={keputusanTerbuka}
		entityTitle={naskah.title}
		working={editorial.working}
		sensitivityReady={sensitivitasTuntas}
		onconfirm={kirim}
		oncancel={() => (keputusanTerbuka = null)}
	/>
{/if}
