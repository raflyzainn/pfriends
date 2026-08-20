<script>
	/**
	 * HALAMAN: Konfigurasi Gamifikasi.
	 *
	 * Tanggung jawab: satu tempat untuk MENYETEL sistem poin: nilai poin tiap
	 * aksi, batas hariannya, dan ambang tiap jenjang: lalu memperlihatkan akibat
	 * setelan itu sebelum disimpan.
	 *
	 * ── Perubahan sikap dibanding versi sebelumnya ───────────────────────────
	 *
	 * Versi sebelumnya menyatakan tabel skor "baca saja": nilai poin adalah angka
	 * kanonik dokumen sumber, dan mengubahnya lewat antarmuka dianggap membuat
	 * poin yang sudah dibukukan tidak lagi dapat dijelaskan asalnya. Kekhawatiran
	 * itu benar, tetapi jalan keluarnya keliru: ia menutup seluruh penyetelan,
	 * padahal yang perlu dijaga hanyalah poin yang SUDAH tercatat.
	 *
	 * Karena itu tiga penjagaan dipasang menggantikan larangan tadi:
	 *
	 * 1. **Poin yang sudah dibukukan tidak pernah dihitung ulang.** Setiap entri
	 *    buku besar menyimpan nilai poinnya sendiri pada saat kejadian, sehingga
	 *    setelan baru hanya berlaku untuk perolehan berikutnya. Konfigurasi yang
	 *    berlaku surut akan mengubah saldo orang yang sudah menerima haknya :
	 *    dan itu, bukan penyetelannya, yang mustahil dijelaskan.
	 * 2. **Nilai kanonik selalu terlihat di sebelah nilai setelan.** Kolom
	 *    "Kanonik" tidak pernah hilang, dan satu tombol mengembalikan seluruhnya.
	 *    Setelan yang menghapus jejak nilai asalnya berhenti dapat diaudit.
	 * 3. **Akibatnya ditampilkan sebelum disimpan.** Sebaran jenjang dihitung
	 *    ulang atas anggota yang benar-benar ada, dan satu contoh perhitungan
	 *    bulanan ditunjukkan berdampingan. Menyetel ambang tanpa melihat berapa
	 *    orang yang berpindah jenjang adalah menebak.
	 *
	 * Setelan disimpan ke tabel `meta` lewat `setMeta`, bukan ke `localStorage`:
	 * ia konfigurasi program, bukan preferensi peramban seseorang, dan tempatnya
	 * memang bersama data demo yang lain supaya ikut bersih ketika data dimuat
	 * ulang.
	 *
	 * @see docs/00-SOURCE-BRIEF.md: Hal 11 tabel skor, Hal 12 ambang jenjang
	 * @see src/lib/domain/constants/scoring-table.js: nilai kanonik
	 * @see src/lib/domain/constants/tier-table.js: ambang kanonik
	 */
	import { AdminGamificationNav, Button, Card, DummyBadge, Icon, PageHeader, StatTile, StatusBadge, ICONS } from '$lib/components';
	import TierDistributionChart from '$lib/charts/TierDistributionChart.svelte';
	import { ActionClass, ActivityType, SCORING_TABLE } from '$lib/domain/constants/scoring-table.js';
	import { TIER_TABLE } from '$lib/domain/constants/tier-table.js';
	import { getMeta, setMeta } from '$lib/infrastructure/db.js';
	import { bootstrapDatabase } from '$lib/infrastructure/seed/bootstrap.js';
	import { catalog } from '$lib/stores/catalog.svelte.js';
	import { toast, ToastType } from '$lib/stores/toast.svelte.js';
	import { formatAngka, formatBertanda } from '$lib/utils/format.js';

	/** Kunci baris `meta` tempat setelan disimpan. */
	const KUNCI_META = 'gamifikasi_konfigurasi';

	/** Label kelas verifikasi aksi. */
	const LABEL_KELAS = Object.freeze({
		[ActionClass.A]: 'A: otomatis',
		[ActionClass.B]: 'B: bukti ringan',
		[ActionClass.C]: 'C: perlu bukti',
		[ActionClass.D]: 'D: validasi PF'
	});

	/**
	 * Satu bulan khas seorang anggota aktif, dipakai sebagai contoh perhitungan.
	 *
	 * Bauran ini dipilih supaya menyentuh keempat kelas verifikasi sekaligus :
	 * contoh yang hanya berisi aksi ringan tidak akan pernah memperlihatkan akibat
	 * perubahan nilai poin kontribusi bermakna, dan justru di situlah setelan
	 * paling sering digeser.
	 * @type {readonly {type: string, jumlah: number}[]}
	 */
	const CONTOH_BULAN = Object.freeze([
		Object.freeze({ type: ActivityType.BROADCAST_VIEW, jumlah: 4 }),
		Object.freeze({ type: ActivityType.CTA_REACT, jumlah: 3 }),
		Object.freeze({ type: ActivityType.SHARE_PRIVATE, jumlah: 3 }),
		Object.freeze({ type: ActivityType.SHARE_PUBLIC, jumlah: 2 }),
		Object.freeze({ type: ActivityType.STORY_SUBMIT, jumlah: 1 }),
		Object.freeze({ type: ActivityType.SESSION_ATTEND, jumlah: 1 })
	]);

	/** Setelan bawaan: salinan nilai kanonik Hal 11 dan Hal 12. */
	function konfigurasiKanonik() {
		return {
			poin: Object.fromEntries(SCORING_TABLE.map((aturan) => [aturan.type, aturan.points])),
			cap: Object.fromEntries(SCORING_TABLE.map((aturan) => [aturan.type, aturan.dailyCap])),
			ambang: Object.fromEntries(TIER_TABLE.map((tier) => [tier.level, tier.threshold]))
		};
	}

	/**
	 * Membaca satu angka setelan dengan cadangan nilai kanonik. Kolom yang
	 * dikosongkan penggunanya menghasilkan `null` dari `bind:value`, dan
	 * membiarkannya mengalir ke perhitungan membuat seluruh pratinjau berubah
	 * menjadi `NaN` sementara ia mengetik.
	 * @param {Record<string, number>} sumber
	 * @param {string} kunci
	 * @param {number} cadangan
	 * @returns {number}
	 */
	function angkaSetelan(sumber, kunci, cadangan) {
		const nilai = sumber[kunci];
		return typeof nilai === 'number' && Number.isFinite(nilai) ? nilai : cadangan;
	}

	const BAWAAN = konfigurasiKanonik();

	let poin = $state({ ...BAWAAN.poin });
	let cap = $state({ ...BAWAAN.cap });
	let ambang = $state({ ...BAWAAN.ambang });

	/** @type {{poin: Record<string, number>, cap: Record<string, number>, ambang: Record<string, number>}} */
	let tersimpan = $state.raw(konfigurasiKanonik());

	/** @type {Date|null} */
	let disimpanPada = $state.raw(null);
	let memuat = $state(true);
	let menyimpan = $state(false);

	// Setelan tersimpan dibaca sekali saat halaman dibuka. Bila belum pernah ada,
	// nilai kanonik yang sudah terpasang di atas tetap berlaku: halaman tidak
	// perlu menunggu apa pun untuk dapat dibaca.
	$effect(() => {
		let dibatalkan = false;

		(async () => {
			try {
				await bootstrapDatabase();
				const baris = await getMeta(KUNCI_META);
				if (dibatalkan || !baris || typeof baris !== 'object') return;

				const config = /** @type {any} */ (baris);
				poin = { ...BAWAAN.poin, ...(config.poin ?? {}) };
				cap = { ...BAWAAN.cap, ...(config.cap ?? {}) };
				ambang = { ...BAWAAN.ambang, ...(config.ambang ?? {}) };
				tersimpan = { poin: { ...poin }, cap: { ...cap }, ambang: { ...ambang } };
				disimpanPada = config.disimpanPada ? new Date(config.disimpanPada) : null;
			} finally {
				if (!dibatalkan) memuat = false;
			}
		})();

		return () => {
			dibatalkan = true;
		};
	});

	// ── Turunan setelan ──────────────────────────────────────────────────────

	const barisSkor = $derived(
		SCORING_TABLE.map((aturan) => ({
			id: aturan.type,
			aturan,
			poin: angkaSetelan(poin, aturan.type, aturan.points),
			cap: angkaSetelan(cap, aturan.type, aturan.dailyCap)
		}))
	);

	/** Ambang setelan, lengkap dengan rank supaya urutannya tidak bergantung objek. */
	const ambangDraf = $derived(
		TIER_TABLE.map((tier) => ({
			level: tier.level,
			label: tier.label,
			color: tier.color,
			rank: tier.rank,
			kanonik: tier.threshold,
			benefit: tier.benefit,
			nilai: tier.rank === 0 ? 0 : angkaSetelan(ambang, tier.level, tier.threshold)
		}))
	);

	const ambangKanonik = TIER_TABLE.map((tier) => ({
		level: tier.level,
		label: tier.label,
		nilai: tier.threshold
	}));

	/**
	 * Jenjang yang dipegang sejumlah poin pada sebuah daftar ambang.
	 * @param {number} nilai
	 * @param {readonly {level: string, label: string, nilai: number}[]} daftar
	 * @returns {{level: string, label: string, nilai: number}}
	 */
	function jenjangUntuk(nilai, daftar) {
		let hasil = daftar[0];
		for (const tier of daftar) if (nilai >= tier.nilai) hasil = tier;
		return hasil;
	}

	const konfigurasiKini = $derived({
		poin: Object.fromEntries(barisSkor.map((baris) => [baris.id, baris.poin])),
		cap: Object.fromEntries(barisSkor.map((baris) => [baris.id, baris.cap])),
		ambang: Object.fromEntries(ambangDraf.map((tier) => [tier.level, tier.nilai]))
	});

	const belumDisimpan = $derived(JSON.stringify(konfigurasiKini) !== JSON.stringify(tersimpan));

	const jumlahPerubahan = $derived(
		barisSkor.filter((baris) => baris.poin !== baris.aturan.points).length +
			barisSkor.filter((baris) => baris.cap !== baris.aturan.dailyCap).length +
			ambangDraf.filter((tier) => tier.nilai !== tier.kanonik).length
	);

	/** Pesan galat pertama yang menghalangi penyimpanan; `''` bila setelan sah. */
	const galat = $derived.by(() => {
		for (const baris of barisSkor) {
			if (baris.poin < 1) return `Nilai poin “${baris.aturan.label}” harus minimal 1.`;
			if (baris.poin > 999) return `Nilai poin “${baris.aturan.label}” terlalu besar; batas wajar 999.`;
			if (baris.cap < 0) return `Batas harian “${baris.aturan.label}” tidak boleh negatif.`;
		}

		let sebelumnya = -1;
		for (const tier of ambangDraf) {
			if (tier.nilai < 0) return `Ambang “${tier.label}” tidak boleh negatif.`;
			if (tier.nilai <= sebelumnya) {
				return `Ambang “${tier.label}” harus lebih besar daripada jenjang di bawahnya.`;
			}
			sebelumnya = tier.nilai;
		}
		return '';
	});

	const rentangPoin = $derived.by(() => {
		const nilai = barisSkor.map((baris) => baris.poin);
		return nilai.length > 0 ? { min: Math.min(...nilai), maks: Math.max(...nilai) } : { min: 0, maks: 0 };
	});

	const ambangPuncak = $derived(ambangDraf[ambangDraf.length - 1]?.nilai ?? 0);

	// ── Pratinjau dampak ─────────────────────────────────────────────────────

	/** Sebaran jenjang anggota nyata di bawah ambang setelan, dan di bawah ambang kanonik. */
	const sebaran = $derived.by(() => {
		/** @type {Map<string, number>} */
		const draf = new Map(ambangDraf.map((tier) => [tier.level, 0]));
		/** @type {Map<string, number>} */
		const kanonik = new Map(ambangDraf.map((tier) => [tier.level, 0]));

		for (const awardee of catalog.awardees) {
			const levelDraf = jenjangUntuk(awardee.points, ambangDraf).level;
			const levelKanonik = jenjangUntuk(awardee.points, ambangKanonik).level;
			draf.set(levelDraf, (draf.get(levelDraf) ?? 0) + 1);
			kanonik.set(levelKanonik, (kanonik.get(levelKanonik) ?? 0) + 1);
		}

		return ambangDraf.map((tier) => ({
			level: tier.level,
			label: tier.label,
			color: tier.color,
			nilai: tier.nilai,
			benefit: tier.benefit,
			count: draf.get(tier.level) ?? 0,
			selisih: (draf.get(tier.level) ?? 0) - (kanonik.get(tier.level) ?? 0)
		}));
	});

	const anggotaBerpindah = $derived(
		Math.round(sebaran.reduce((jumlah, tier) => jumlah + Math.abs(tier.selisih), 0) / 2)
	);

	const contoh = $derived(
		CONTOH_BULAN.map((entri) => {
			const aturan = SCORING_TABLE.find((baris) => baris.type === entri.type);
			const satuanDraf = angkaSetelan(poin, entri.type, aturan?.points ?? 0);
			return {
				id: entri.type,
				label: aturan?.label ?? entri.type,
				jumlah: entri.jumlah,
				satuanKanonik: aturan?.points ?? 0,
				satuanDraf,
				subtotalKanonik: (aturan?.points ?? 0) * entri.jumlah,
				subtotalDraf: satuanDraf * entri.jumlah
			};
		})
	);

	const totalContohKanonik = $derived(contoh.reduce((jumlah, baris) => jumlah + baris.subtotalKanonik, 0));
	const totalContohDraf = $derived(contoh.reduce((jumlah, baris) => jumlah + baris.subtotalDraf, 0));
	const jenjangContohKanonik = $derived(jenjangUntuk(totalContohKanonik, ambangKanonik));
	const jenjangContohDraf = $derived(jenjangUntuk(totalContohDraf, ambangDraf));

	// ── Tindakan ─────────────────────────────────────────────────────────────

	/** Mengembalikan seluruh kolom ke nilai kanonik; penyimpanan tetap terpisah. */
	function kembalikanKanonik() {
		poin = { ...BAWAAN.poin };
		cap = { ...BAWAAN.cap };
		ambang = { ...BAWAAN.ambang };
		toast.push({
			type: ToastType.INFO,
			title: 'Nilai kanonik dipulihkan pada formulir',
			message: 'Tekan “Simpan konfigurasi” bila pemulihan ini memang hendak diberlakukan.'
		});
	}

	/** Menyimpan setelan ke tabel `meta` supaya bertahan setelah halaman dimuat ulang. */
	async function simpan() {
		if (galat !== '' || menyimpan) return;
		menyimpan = true;
		try {
			const pada = new Date();
			await setMeta(KUNCI_META, { ...$state.snapshot(konfigurasiKini), disimpanPada: pada.toISOString() });
			tersimpan = $state.snapshot(konfigurasiKini);
			disimpanPada = pada;
			toast.push({
				type: ToastType.SUCCESS,
				title: 'Konfigurasi gamifikasi tersimpan',
				message:
					jumlahPerubahan > 0
						? `${formatAngka(jumlahPerubahan)} setelan berbeda dari nilai kanonik dan berlaku untuk perolehan poin berikutnya.`
						: 'Seluruh setelan kembali sama dengan nilai kanonik Hal 11 dan Hal 12.'
			});
		} catch {
			toast.error(
				'Konfigurasi gagal disimpan',
				'Basis data peramban menolak penulisan. Muat ulang halaman, lalu coba sekali lagi.'
			);
		} finally {
			menyimpan = false;
		}
	}
</script>

<PageHeader
	eyebrow="Konsol Corporate Secretary"
	title="Konfigurasi Gamifikasi"
	subtitle="Nilai poin tiap aksi, batas hariannya, dan ambang tiap jenjang dapat disetel di sini. Setelan berlaku untuk perolehan poin berikutnya: poin yang sudah dibukukan menyimpan nilainya sendiri dan tidak pernah dihitung ulang."
>
	{#snippet actions()}
		<Button variant="secondary" size="sm" iconPath={ICONS.refresh} onclick={kembalikanKanonik}>
			Nilai kanonik
		</Button>
		<Button
			variant="primary"
			size="sm"
			iconPath={ICONS.check}
			loading={menyimpan}
			disabled={galat !== '' || !belumDisimpan}
			onclick={simpan}
		>
			Simpan konfigurasi
		</Button>
	{/snippet}
</PageHeader>

<AdminGamificationNav />

<div class="mb-5 flex flex-wrap gap-2">
	<a href="#nilai-poin" class="rounded-full border border-ink-200 bg-white px-3 py-2 text-xs font-semibold text-ink-700 hover:border-brand-300">Nilai poin</a>
	<a href="#ambang-tier" class="rounded-full border border-ink-200 bg-white px-3 py-2 text-xs font-semibold text-ink-700 hover:border-brand-300">Ambang tier</a>
	<a href="#simulasi" class="rounded-full border border-ink-200 bg-white px-3 py-2 text-xs font-semibold text-ink-700 hover:border-brand-300">Simulasi dampak</a>
	<DummyBadge title="Konfigurasi dan simulasi pada bagian ini masih memakai data lokal Dexie." />
</div>

{#if galat !== ''}
	<div
		class="mb-4 flex items-start gap-2.5 rounded-card border border-pertamina-red/25 bg-pertamina-red-tint/50 p-3.5"
		role="alert"
	>
		<Icon path={ICONS.warning} size={18} class="mt-0.5 shrink-0 text-pertamina-red-ink" />
		<p class="text-sm leading-relaxed text-pertamina-red-ink">
			<span class="font-semibold">Setelan belum dapat disimpan.</span>
			{galat}
		</p>
	</div>
{:else if belumDisimpan}
	<div
		class="mb-4 flex items-start gap-2.5 rounded-card border border-warning/25 bg-warning-tint/50 p-3.5"
		role="status"
	>
		<Icon path={ICONS.info} size={18} class="mt-0.5 shrink-0 text-warning" />
		<p class="text-sm leading-relaxed text-ink-700">
			<span class="font-semibold text-heading">Ada perubahan yang belum disimpan.</span>
			Pratinjau di bawah sudah memakai setelan baru; anggota belum terpengaruh sampai konfigurasi disimpan.
		</p>
	</div>
{/if}

<div class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
	<StatTile
		label="Jenis aksi berpoin"
		value={barisSkor.length}
		unit="aksi"
		hint="Seluruhnya dapat disetel nilai poin dan batas hariannya"
		iconPath={ICONS.bolt}
		color="var(--color-pertamina-blue)"
	/>
	<StatTile
		label="Rentang nilai poin"
		value="{formatAngka(rentangPoin.min)}–{formatAngka(rentangPoin.maks)}"
		unit="poin"
		hint="Dari aksi paling ringan sampai kontribusi paling bermakna"
		iconPath={ICONS.coin}
		color="var(--color-pertamina-green)"
	/>
	<StatTile
		label="Ambang jenjang puncak"
		value={ambangPuncak}
		unit="poin"
		hint="Ambang Champion pada setelan yang sedang berlaku di formulir"
		iconPath={ICONS.trophy}
		color="var(--color-tier-champion)"
	/>
	<StatTile
		label="Berbeda dari kanonik"
		value={jumlahPerubahan}
		unit="setelan"
		hint={disimpanPada
			? `Terakhir disimpan ${disimpanPada.toLocaleString('id-ID')}`
			: 'Belum pernah disimpan; nilai kanonik Hal 11 dan Hal 12 berlaku'}
		iconPath={ICONS.edit}
		color="var(--color-pertamina-red)"
	/>
</div>

<!-- ── Nilai poin per aksi ─────────────────────────────────────────────── -->
<span id="nilai-poin" class="block scroll-mt-28"></span>
<Card class="mb-4" variant="flush" padding="none">
	<div class="flex flex-wrap items-start justify-between gap-3 p-4">
		<div class="min-w-0">
			<h2 class="text-base font-bold text-heading">Nilai poin per aksi</h2>
			<p class="mt-1 max-w-3xl text-sm text-ink-600">
				Kolom kanonik adalah angka Hal 11 dan tidak pernah ikut berubah: ia acuan untuk menilai
				seberapa jauh setelan sudah bergeser.
			</p>
		</div>
		<StatusBadge
			label={belumDisimpan
				? 'Draf belum disimpan'
				: disimpanPada
					? 'Setelan tersimpan'
					: 'Nilai kanonik'}
			color={belumDisimpan ? 'amber' : disimpanPada ? 'green' : 'slate'}
			size="sm"
			withDot
		/>
	</div>

	<div class="overflow-x-auto">
		<table class="w-full min-w-max border-collapse text-left">
			<caption class="sr-only">
				Setelan nilai poin dan batas harian untuk sembilan aksi berpoin PFriends, berdampingan
				dengan nilai kanonik dokumen sumber.
			</caption>

			<thead>
				<tr class="bg-ink-50">
					<th scope="col" class="label-micro px-4 py-3">Aksi berpoin</th>
					<th scope="col" class="label-micro px-4 py-3 text-right">Kanonik</th>
					<th scope="col" class="label-micro px-4 py-3 text-right">Nilai poin</th>
					<th scope="col" class="label-micro px-4 py-3 text-right">Batas harian</th>
					<th scope="col" class="label-micro px-4 py-3">Kelas verifikasi</th>
				</tr>
			</thead>

			<tbody>
				{#each barisSkor as baris (baris.id)}
					{@const berubah = baris.poin !== baris.aturan.points}
					<tr class="border-b border-ink-100 last:border-b-0">
						<th scope="row" class="px-4 py-2.5">
							<span class="block min-w-0">
								<span class="block text-sm font-semibold text-ink-900">{baris.aturan.label}</span>
								<span class="block text-xs text-ink-500">{baris.aturan.pillar}</span>
							</span>
						</th>

						<td class="numeric px-4 py-2.5 text-right text-sm text-ink-500 tabular-nums">
							{formatAngka(baris.aturan.points)}
						</td>

						<td class="px-4 py-2.5 text-right">
							<span class="inline-flex items-center justify-end gap-2">
								{#if berubah}
									<span class="numeric text-xs font-semibold text-brand-700">
										{formatBertanda(baris.poin - baris.aturan.points)}
									</span>
								{/if}
								<input
									type="number"
									min="1"
									max="999"
									step="1"
									aria-label="Nilai poin untuk {baris.aturan.label}"
									bind:value={poin[baris.id]}
									class="numeric min-h-11 w-24 rounded-control border bg-white px-3 text-right text-sm text-ink-800 tabular-nums {berubah
										? 'border-brand-300'
										: 'border-ink-200'}"
								/>
							</span>
						</td>

						<td class="px-4 py-2.5 text-right">
							<input
								type="number"
								min="0"
								max="99"
								step="1"
								aria-label="Batas harian untuk {baris.aturan.label}"
								bind:value={cap[baris.id]}
								class="numeric min-h-11 w-20 rounded-control border border-ink-200 bg-white px-3 text-right text-sm text-ink-800 tabular-nums"
							/>
						</td>

						<td class="px-4 py-2.5">
							<span class="whitespace-nowrap text-xs text-ink-600">
								{LABEL_KELAS[baris.aturan.actionClass] ?? baris.aturan.actionClass}
							</span>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<p class="border-t border-ink-100 px-4 py-3 text-xs leading-relaxed text-ink-500">
		Batas harian bernilai 0 berarti tanpa batas. Batas ini bukan angka dokumen sumber melainkan
		turunan sah dari catatan Hal 11: poin harus menghargai kontribusi bermakna, bukan aktivitas spam.
		Tanpa batas itu, jenjang tertinggi dapat dicapai hanya dengan menekan tombol bagikan ratusan kali
		dalam semalam.
	</p>
</Card>

<!-- ── Ambang jenjang dan pratinjau dampaknya ──────────────────────────── -->
<div id="ambang-tier" class="mb-4 grid scroll-mt-28 grid-cols-1 gap-4 xl:grid-cols-2">
	<Card>
		<h2 class="text-base font-bold text-heading">Ambang tiap jenjang</h2>
		<p class="mb-3 text-sm text-ink-600">
			Ambang wajib menaik. Jenjang awal terkunci di 0 poin supaya setiap anggota selalu punya
			jenjang yang dapat ditampilkan.
		</p>

		<ul class="space-y-2">
			{#each ambangDraf as tier (tier.level)}
				<li class="flex items-center gap-3 rounded-card border border-ink-100 p-2.5">
					<span
						class="h-2.5 w-2.5 shrink-0 rounded-full"
						style="background:{tier.color};"
						aria-hidden="true"
					></span>

					<span class="min-w-0 flex-1">
						<span class="block text-sm font-semibold text-ink-900">{tier.label}</span>
						<span class="block truncate text-xs text-ink-500" title={tier.benefit}>{tier.benefit}</span>
					</span>

					{#if tier.nilai !== tier.kanonik}
						<span class="numeric shrink-0 text-xs font-semibold text-brand-700">
							{formatBertanda(tier.nilai - tier.kanonik)}
						</span>
					{/if}

					{#if tier.rank === 0}
						<span class="numeric shrink-0 w-24 text-right text-sm text-ink-400 tabular-nums">
							0 poin
						</span>
					{:else}
						<input
							type="number"
							min="1"
							step="1"
							aria-label="Ambang poin jenjang {tier.label}"
							bind:value={ambang[tier.level]}
							class="numeric min-h-11 w-24 shrink-0 rounded-control border bg-white px-3 text-right text-sm text-ink-800 tabular-nums {tier.nilai !==
							tier.kanonik
								? 'border-brand-300'
								: 'border-ink-200'}"
						/>
					{/if}
				</li>
			{/each}
		</ul>
	</Card>

	<Card>
		<div class="mb-3 flex flex-wrap items-start justify-between gap-3">
			<div class="min-w-0">
				<h2 class="text-base font-bold text-heading">Pratinjau sebaran jenjang</h2>
				<p class="mt-1 text-sm text-ink-600">
					Berapa anggota berpindah jenjang bila ambang ini diberlakukan?
				</p>
			</div>
			<StatusBadge
				label="{formatAngka(anggotaBerpindah)} berpindah"
				color={anggotaBerpindah > 0 ? 'amber' : 'slate'}
				size="sm"
				withDot
			/>
		</div>

		<TierDistributionChart data={sebaran} height="220px" loading={catalog.loading} />

		<ul class="mt-3 space-y-1.5">
			{#each sebaran as tier (tier.level)}
				<li class="flex items-baseline gap-2 text-xs">
					<span class="h-2 w-2 shrink-0 rounded-full" style="background:{tier.color};" aria-hidden="true"
					></span>
					<span class="min-w-0 flex-1 truncate text-ink-700">
						{tier.label}
						<span class="numeric text-ink-400">· ≥ {formatAngka(tier.nilai)} poin</span>
					</span>
					<span class="numeric shrink-0 font-semibold text-ink-800">{formatAngka(tier.count)}</span>
					{#if tier.selisih !== 0}
						<span
							class="numeric shrink-0 w-10 text-right font-semibold {tier.selisih > 0
								? 'text-brand-700'
								: 'text-pertamina-red-ink'}"
						>
							{formatBertanda(tier.selisih)}
						</span>
					{:else}
						<span class="w-10 shrink-0" aria-hidden="true"></span>
					{/if}
				</li>
			{/each}
		</ul>
	</Card>
</div>

<!-- ── Contoh perhitungan ──────────────────────────────────────────────── -->
<span id="simulasi" class="block scroll-mt-28"></span>
<Card variant="flush" padding="none">
	<div class="p-4">
		<h2 class="text-base font-bold text-heading">Contoh perhitungan satu bulan</h2>
		<p class="mt-1 max-w-3xl text-sm text-ink-600">
			Bauran aksi seorang anggota aktif dalam sebulan, dihitung dua kali: dengan nilai kanonik dan
			dengan setelan yang sedang di formulir. Contoh ini mengabaikan batas harian: bauran di bawah
			tersebar sepanjang bulan sehingga tidak satu pun batasnya tersentuh.
		</p>
	</div>

	<div class="overflow-x-auto">
		<table class="w-full min-w-max border-collapse text-left">
			<caption class="sr-only">
				Contoh perhitungan poin satu bulan seorang anggota aktif, membandingkan nilai kanonik
				dengan setelan yang sedang disunting.
			</caption>

			<thead>
				<tr class="bg-ink-50">
					<th scope="col" class="label-micro px-4 py-3">Aksi</th>
					<th scope="col" class="label-micro px-4 py-3 text-right">Kejadian</th>
					<th scope="col" class="label-micro px-4 py-3 text-right">Kanonik</th>
					<th scope="col" class="label-micro px-4 py-3 text-right">Setelan</th>
					<th scope="col" class="label-micro px-4 py-3 text-right">Selisih</th>
				</tr>
			</thead>

			<tbody>
				{#each contoh as baris (baris.id)}
					<tr class="border-b border-ink-100">
						<th scope="row" class="px-4 py-2.5 text-sm font-medium text-ink-800">{baris.label}</th>
						<td class="numeric px-4 py-2.5 text-right text-sm text-ink-600 tabular-nums">
							{formatAngka(baris.jumlah)}×
						</td>
						<td class="numeric px-4 py-2.5 text-right text-sm text-ink-500 tabular-nums">
							{formatAngka(baris.subtotalKanonik)}
						</td>
						<td class="numeric px-4 py-2.5 text-right text-sm font-semibold text-ink-900 tabular-nums">
							{formatAngka(baris.subtotalDraf)}
						</td>
						<td
							class="numeric px-4 py-2.5 text-right text-sm tabular-nums {baris.subtotalDraf ===
							baris.subtotalKanonik
								? 'text-ink-400'
								: 'text-brand-700'}"
						>
							{baris.subtotalDraf === baris.subtotalKanonik
								? ':'
								: formatBertanda(baris.subtotalDraf - baris.subtotalKanonik)}
						</td>
					</tr>
				{/each}

				<tr class="bg-ink-50">
					<th scope="row" class="px-4 py-3 text-sm font-bold text-heading">
						Total sebulan
						<span class="block text-xs font-normal text-ink-500">
							Jenjang: {jenjangContohKanonik.label} → {jenjangContohDraf.label}
						</span>
					</th>
					<td class="px-4 py-3"></td>
					<td class="numeric px-4 py-3 text-right text-sm font-semibold text-ink-600 tabular-nums">
						{formatAngka(totalContohKanonik)}
					</td>
					<td class="numeric px-4 py-3 text-right text-base font-bold text-ink-900 tabular-nums">
						{formatAngka(totalContohDraf)}
					</td>
					<td
						class="numeric px-4 py-3 text-right text-sm font-bold tabular-nums {totalContohDraf ===
						totalContohKanonik
							? 'text-ink-400'
							: 'text-brand-700'}"
					>
						{totalContohDraf === totalContohKanonik
							? ':'
							: formatBertanda(totalContohDraf - totalContohKanonik)}
					</td>
				</tr>
			</tbody>
		</table>
	</div>

	{#if memuat}
		<p class="border-t border-ink-100 px-4 py-3 text-xs text-ink-500">
			Membaca setelan tersimpan dari basis data demo…
		</p>
	{/if}
</Card>
