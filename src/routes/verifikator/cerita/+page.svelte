<script>
	/**
	 * HALAMAN `/verifikator/cerita`: Submission Blog, antrean FIFO.
	 *
	 * Tanggung jawab: menampilkan submission blog yang menunggu tindakan verifikator
	 * dengan urutan tertua lebih dahulu, usia antrean dalam hari kerja, penanda
	 * pelanggaran SLA, dan tombol keputusan yang sah untuk masing-masing baris.
	 *
	 * Enam keputusan yang tidak terbaca dari kode:
	 *
	 * 1. **Urutan tidak disortir ulang di sini.** `editorial.storyQueue` sudah
	 *    tertua-dahulu dari domain. Menyortir ulang berarti dua kebijakan urutan,
	 *    dan yang di halaman akan menang tanpa pernah diuji (`docs/10` US-R26 AC-1).
	 * 2. **Tombol keputusan tiap baris dirender dari
	 *    `allowedStoryTransitions(status, role)`.** Baris berstatus `DIAJUKAN`
	 *    karena itu hanya menawarkan "Ambil untuk ditinjau", sedangkan baris
	 *    `REVIEW` menawarkan tiga keputusan: bukan karena halaman ini tahu
	 *    aturannya, melainkan karena peta transisi domain yang menjawabnya
	 *    (`docs/12` §3.5 WP-06 butir 2).
	 * 3. **Penyaring status memakai daftar dari antrean itu sendiri**, bukan daftar
	 *    status yang ditulis tangan: tab yang menyebut status yang tidak pernah ada
	 *    di antrean akan selamanya kosong tanpa penjelasan.
	 * 4. **Konflik kepentingan tetap diperiksa pada jalur cerita.** `WRITE_CONTENT`
	 *    bukan milik VERIFIER, sehingga `story.authorId` selalu menunjuk Awardee dan
	 *    pemeriksaan ini secara sah tidak pernah menyala. Ia dipasang sebagai
	 *    pertahanan berlapis: untuk menangkap data yang lolos invarian karena
	 *    kekeliruan migrasi kelak (`docs/12` §3.5 WP-06 butir 3).
	 * 5. **Nol angka hari kerja tertulis di berkas ini.** Usia dan batas datang dari
	 *    `slaAntrean()`, yang bersumber pada `SLA_HARI_KERJA`.
	 * 6. **`DecisionBar` dirender `compact` di dalam daftar.** Penjelasan tiap
	 *    keputusan tetap ada: ia pindah ke atribut `title` tombolnya: karena tiga
	 *    paragraf penjelasan yang berulang pada setiap baris menenggelamkan judul
	 *    submission yang justru harus dibaca lebih dulu. Penjelasan lengkapnya hidup
	 *    di halaman detail, tempat keputusan sesungguhnya diambil.
	 *
	 * @see docs/10-REVISION-SPEC.md: US-R26 antrean tinjauan FIFO, §5.6 SLA
	 * @see docs/12-BUILD-CONTRACT-V2.md: §3.5 WP-06 butir 2, 4, dan 6
	 */
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Button, EmptyState, Icon, PageHeader, Tabs, ICONS } from '$lib/components';
	import { STORY_STATUS_META } from '$lib/domain/constants/community.js';
	import { AccessPolicy } from '$lib/domain/policies/AccessPolicy.js';
	import { editorial } from '$lib/stores/editorial.svelte.js';
	import { session } from '$lib/stores/session.svelte.js';
	import {
		DecisionBar,
		DecisionDialog,
		DecisionInput,
		PESAN_KONFLIK_CERITA,
		QueueRow,
		TOTAL_BUTIR_SENSITIF,
		keputusanCerita,
		nomorAntrean,
		slaAntrean
	} from '../_components/index.js';

	/** Kunci tab yang berarti "tanpa penyaring". */
	const SEMUA = 'SEMUA';
	const MODE_ANTREAN = 'ANTREAN';
	const MODE_SEMUA = 'SEMUA_CERITA';
	let mode = $state(MODE_ANTREAN);

	/**
	 * Waktu acuan seluruh perhitungan usia di halaman ini: satu nilai untuk
	 * seluruh baris. Lihat catatan yang sama pada papan antrean.
	 * @type {Date}
	 */
	const sekarang = new Date();

	/** @type {string} Tab status yang sedang aktif. */
	let tabAktif = $state(SEMUA);

	/** @type {{decision: import('../_components/decisions.js').Decision, story: object}|null} */
	let keputusanTerbuka = $state(null);

	/** Status yang benar-benar ada di antrean saat ini, urut sesuai antrean. */
	const sumber = $derived(mode === MODE_ANTREAN ? editorial.storyQueue : editorial.verifierStories);
	const statusDiAntrean = $derived([...new Set(sumber.map((story) => story.status))]);

	/** Tab penyaring: "Semua" ditambah status yang benar-benar ada. */
	const tabs = $derived([
		{ id: SEMUA, label: 'Semua', count: sumber.length },
		...statusDiAntrean.map((status) => ({
			id: status,
			label: STORY_STATUS_META[status]?.label ?? status,
			count: sumber.filter((story) => story.status === status).length
		}))
	]);

	/** Antrean sesudah disaring; urutannya tetap urutan asal dari domain. */
	const antrean = $derived(
		tabAktif === SEMUA
			? sumber
			: sumber.filter((story) => story.status === tabAktif)
	);

	function gantiMode(value) {
		mode = value;
		tabAktif = SEMUA;
	}

	/**
	 * Tiga angka ringkas di kepala halaman.
	 *
	 * Ketiganya dihitung dari antrean yang SAMA dengan daftar di bawahnya, bukan
	 * dari sumber lain: ringkasan yang menyebut angka berbeda dari daftar yang
	 * ditemaninya adalah cara tercepat membuat kedua-duanya tidak dipercaya.
	 */
	const ringkasan = $derived([
		{
			id: 'total',
			label: 'Submission menunggu',
			nilai: editorial.storyQueue.length,
			tegas: false,
			iconPath: ICONS.inbox
		},
		{
			id: 'lewat',
			label: 'Sudah lewat tenggat',
			nilai: editorial.storyOverdueCount,
			tegas: editorial.storyOverdueCount > 0,
			iconPath: ICONS.warning
		},
		{
			id: 'revisi',
			label: 'Pernah dikembalikan',
			nilai: editorial.storyQueue.filter((story) => story.revisionCount > 0).length,
			tegas: false,
			iconPath: ICONS.refresh
		}
	]);

	/**
	 * Alasan tertulis mengapa keputusan atas sebuah naskah dimatikan.
	 * @param {object} story
	 * @returns {string} Kosong berarti tidak ada halangan.
	 */
	function halangan(story) {
		return AccessPolicy.isSelfReview(session.awardeeId, story.authorId) ? PESAN_KONFLIK_CERITA : '';
	}

	/**
	 * Membuka dialog konfirmasi sebuah keputusan.
	 *
	 * Persetujuan naskah dialihkan ke halaman detail alih-alih dibuka di sini:
	 * syaratnya adalah checklist data sensitif 21 butir, dan checklist itu harus
	 * dibaca berdampingan dengan naskahnya. Dialog persetujuan yang dapat dituntaskan
	 * dari daftar antrean akan menjadikan gerbang paling menentukan sebagai satu
	 * ketukan tanpa bacaan.
	 *
	 * @param {import('../_components/decisions.js').Decision} decision
	 * @param {object} story
	 */
	function pilih(decision, story) {
		if (decision.input === DecisionInput.SENSITIVITY) {
			void goto(`/verifikator/cerita/${story.id}`);
			return;
		}
		keputusanTerbuka = { decision, story };
	}

	/**
	 * Mengirim keputusan ke store editorial.
	 *
	 * Halaman ini tidak menilai ulang legalitas transisi maupun kelengkapan
	 * catatan: keduanya sudah diperiksa registri keputusan sebelum dialog ditutup,
	 * dan diperiksa lagi oleh domain sesudahnya.
	 *
	 * @param {import('../_components/decisions.js').DecisionPayload} payload
	 * @returns {Promise<void>}
	 */
	async function kirim(payload) {
		const terbuka = keputusanTerbuka;
		if (!terbuka || terbuka.decision.jalankan === null) return;
		const hasil = await terbuka.decision.jalankan(terbuka.story, payload);
		if (hasil.ok) keputusanTerbuka = null;
	}

	onMount(async () => {
		if (!session.ready) await session.hydrate();
		if (session.isVerifier) await editorial.refresh();
	});
</script>

<PageHeader
	eyebrow="Ruang kerja verifikator"
	title="Submission Blog"
	subtitle="Naskah yang dikirim awardee, tertua lebih dahulu. Tombol keputusan tiap baris berasal dari peta transisi domain, sehingga daftarnya tidak pernah berbeda dari aturan alur editorial."
/>

<div class="mb-5 flex gap-2 border-b border-ink-200">
	<button type="button" class={`px-4 py-3 text-sm font-semibold ${mode === MODE_ANTREAN ? 'border-b-2 border-pertamina-red text-heading' : 'text-ink-500'}`} onclick={() => gantiMode(MODE_ANTREAN)}>Antrean</button>
	<button type="button" class={`px-4 py-3 text-sm font-semibold ${mode === MODE_SEMUA ? 'border-b-2 border-pertamina-red text-heading' : 'text-ink-500'}`} onclick={() => gantiMode(MODE_SEMUA)}>Semua Cerita</button>
</div>

{#if mode === MODE_ANTREAN}<section class="mt-5 grid gap-4 sm:grid-cols-3" aria-label="Ringkasan submission">
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
</section>{/if}

{#if sumber.length > 0}
	<div class="mt-6">
		<Tabs {tabs} bind:active={tabAktif} variant="pill" />
	</div>
{/if}

{#if editorial.error && sumber.length === 0}
	<div class="mt-5 rounded-card border border-danger/30 bg-danger-tint/40 p-5" role="alert">
		<p class="text-sm font-semibold text-heading">Antrean Cerita gagal dimuat</p>
		<p class="mt-1 text-sm leading-relaxed text-ink-600">{editorial.error}</p>
		<div class="mt-4"><Button size="sm" variant="secondary" onclick={() => editorial.refresh()}>Coba lagi</Button></div>
	</div>
{:else if editorial.loading && sumber.length === 0}
	<div class="mt-5 space-y-3" aria-busy="true" aria-label="Memuat Submission Blog">
		{#each ['a', 'b', 'c'] as kunci (kunci)}
			<div class="skeleton h-28 w-full rounded-card"></div>
		{/each}
	</div>
{:else if antrean.length === 0}
	<div class="mt-5">
		<EmptyState
			title="Tidak ada submission pada penyaring ini"
			message="Submission Blog kosong. Naskah baru muncul di sini begitu penulis mengirimkannya dari zona awardee."
			iconPath={ICONS.inbox}
		/>
	</div>
{:else}
	<ul class="mt-5 space-y-3">
		{#each antrean as naskah, indeks (naskah.id)}
			{@const sebab = halangan(naskah)}
			<li>
				<QueueRow
					position={nomorAntrean(indeks)}
					title={naskah.title}
					subtitle={naskah.summary}
					statusLabel={naskah.statusMeta.label}
					statusColor={naskah.statusMeta.badgeColor}
					sla={mode === MODE_ANTREAN ? slaAntrean(naskah, sekarang) : null}
					meta={[
						`Penulis: ${naskah.authorName}`,
						`${naskah.wordCount} kata`,
						naskah.revisionCount > 0 ? `Revisi ke-${naskah.revisionCount}` : 'Belum pernah direvisi'
					]}
					href="/verifikator/cerita/{naskah.id}"
				>
					{#snippet actions()}
						<DecisionBar
							decisions={keputusanCerita(naskah.status, session.role)}
							blockedReason={sebab}
							working={editorial.working}
							compact
							emptyMessage="Submission ini tidak lagi menunggu keputusan Anda."
							onpick={(decision) => pilih(decision, naskah)}
						/>
					{/snippet}
				</QueueRow>
			</li>
		{/each}
	</ul>
{/if}

<DecisionDialog
	decision={keputusanTerbuka?.decision ?? null}
	entityTitle={keputusanTerbuka?.story.title ?? ''}
	working={editorial.working}
	sensitivityReady={false}
	onconfirm={kirim}
	oncancel={() => (keputusanTerbuka = null)}
/>

<p class="mt-6 text-xs leading-relaxed text-ink-600">
	Persetujuan submission menuntut checklist data sensitif {TOTAL_BUTIR_SENSITIF} butir dikonfirmasi
	lebih dahulu. Buka halaman detail submission untuk menjalankannya: checklist itu harus dibaca
	berdampingan dengan naskahnya, bukan dicentang dari daftar. Keterangan tiap tombol keputusan
	tersedia sebagai penjelasan singkat saat kursor menyinggahinya, dan tertulis lengkap di halaman
	detail.
</p>
