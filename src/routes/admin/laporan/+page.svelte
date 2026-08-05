<script>
	/**
	 * HALAMAN — Laporan.
	 *
	 * Tanggung jawab: merangkum program Januari–Juli 2026 per bulan, menyusun
	 * perhitungan SROI sederhana, dan mengekspor data nyata ke JSON dan CSV.
	 *
	 * Dua aturan menjaga halaman ini tetap jujur.
	 *
	 * Pertama, seluruh KUANTITAS berasal dari data yang benar-benar tercatat —
	 * jam kegiatan dihitung dari kehadiran nyata, peserta aksi lapangan dari
	 * cerita yang lolos gerbang bukti. Yang berstatus asumsi hanyalah NILAI PROXY
	 * rupiahnya, dan setiap satuannya diberi label tanpa terkecuali.
	 *
	 * Kedua, rasio SROI tidak pernah tampil sendirian. Hal 9 menuntut bukti
	 * pipeline berdiri sebelum dasbor, sehingga kelengkapan bukti ditampilkan
	 * bersanding dengan rasio — dan selama kelengkapan belum mencapai ambang,
	 * angkanya dinyatakan sebagai estimasi yang belum layak dilaporkan keluar.
	 * Rasio yang tidak dapat dipertahankan saat diaudit justru merusak program
	 * yang sebenarnya berkinerja baik.
	 *
	 * BATAS TANGGUNG JAWAB. Halaman ini TIDAK memiliki satu pun angka model SROI.
	 * Faktor penyesuaian, nilai proxy rupiah, investasi program, dan ambang
	 * kelengkapan bukti seluruhnya tinggal di `domain/constants/sroi-model.js`;
	 * aritmetikanya milik `domain/services/SroiCalculator.js`. Yang tersisa di sini
	 * hanyalah membaca kuantitas dari koleksi dan MERENDER hasilnya. Selama model
	 * itu hidup di dalam komponen, rasio yang akan dikutip ke luar organisasi tidak
	 * dapat diuji tanpa peramban — dan memang tidak pernah teruji.
	 *
	 * @see docs/00-SOURCE-BRIEF.md — Hal 3 SROI, Hal 6 dampak, Hal 7 timeline, Hal 9
	 * @see docs/02-KPI-MODEL.md — §3 reach dan EMV, §7 SROI sederhana
	 */
	import {
		Button,
		Card,
		EmptyState,
		Icon,
		PageHeader,
		ProgressBar,
		StatTile,
		StatusBadge,
		ICONS
	} from '$lib/components';
	import { REACH_PARAMETERS } from '$lib/domain/constants/kpi-targets.js';
	import { EsgPillar } from '$lib/domain/constants/esg-taxonomy.js';
	import { SROI_PROXY } from '$lib/domain/constants/sroi-model.js';
	import { sroiCalculator } from '$lib/domain/services/SroiCalculator.js';
	import { admin } from '$lib/stores/admin.svelte.js';
	import { catalog } from '$lib/stores/catalog.svelte.js';
	import { toast, ToastType } from '$lib/stores/toast.svelte.js';
	import { kunciBulan, NAMA_BULAN } from '$lib/utils/date.js';
	import { formatAngka, formatPersen, formatRupiah, formatTanggal } from '$lib/utils/format.js';

	/** Rentang program Hal 7 — Januari sampai Juli 2026. */
	const TAHUN_PROGRAM = 2026;
	const JUMLAH_BULAN_PROGRAM = 7;

	/** @type {readonly {monthKey: string, label: string}[]} */
	const BULAN_PROGRAM = Object.freeze(
		Array.from({ length: JUMLAH_BULAN_PROGRAM }, (_, i) => ({
			monthKey: `${TAHUN_PROGRAM}-${String(i + 1).padStart(2, '0')}`,
			label: NAMA_BULAN[i] ?? `Bulan ${i + 1}`
		}))
	);

	/** Rekap bulanan lima besaran, seluruhnya dari koleksi yang benar-benar ada. */
	const rekapBulanan = $derived.by(() => {
		const poin = new Map(admin.monthlyTrend.map((baris) => [baris.monthKey, baris]));

		return BULAN_PROGRAM.map((bulan) => ({
			monthKey: bulan.monthKey,
			label: bulan.label,
			points: poin.get(bulan.monthKey)?.points ?? 0,
			actions: poin.get(bulan.monthKey)?.count ?? 0,
			broadcasts: catalog.broadcasts.filter(
				(kabar) => kabar.isSent && kabar.sentMonthKey === bulan.monthKey
			).length,
			stories: catalog.stories.filter(
				(cerita) => cerita.publishedAt && kunciBulan(cerita.publishedAt) === bulan.monthKey
			).length,
			events: catalog.events.filter(
				(kegiatan) => kegiatan.isCompleted && kunciBulan(kegiatan.startsAt) === bulan.monthKey
			).length
		}));
	});

	const totalRekap = $derived(
		rekapBulanan.reduce(
			(jumlah, bulan) => ({
				points: jumlah.points + bulan.points,
				actions: jumlah.actions + bulan.actions,
				broadcasts: jumlah.broadcasts + bulan.broadcasts,
				stories: jumlah.stories + bulan.stories,
				events: jumlah.events + bulan.events
			}),
			{ points: 0, actions: 0, broadcasts: 0, stories: 0, events: 0 }
		)
	);

	/** Kelengkapan bukti ESG — penentu apakah rasio SROI layak dilaporkan keluar. */
	const kelengkapanBukti = $derived.by(() => {
		if (!admin.esgMatrix) return { total: 0, siap: 0, persen: 0 };
		const pilar = Object.values(admin.esgMatrix);
		const total = pilar.reduce((jumlah, baris) => jumlah + baris.total, 0);
		const siap = pilar.reduce((jumlah, baris) => jumlah + baris.ready, 0);
		return { total, siap, persen: total > 0 ? Math.round((siap / total) * 100) : 0 };
	});

	/** Jam pelatihan terkumpul — durasi kegiatan selesai dikali jumlah hadir nyata. */
	const jamPelatihan = $derived(
		Math.round(
			catalog.events
				.filter((kegiatan) => kegiatan.isCompleted)
				.reduce(
					(jumlah, kegiatan) => jumlah + (kegiatan.durationMinutes / 60) * kegiatan.attendeeCount,
					0
				)
		)
	);

	/** Peserta aksi lapangan pada cerita berpilar lingkungan yang lolos gerbang bukti. */
	const pesertaAksiLingkungan = $derived(
		catalog.stories
			.filter(
				(cerita) =>
					cerita.pillars.includes(EsgPillar.E) && admin.evidenceChecklist(cerita).ready
			)
			.reduce((jumlah, cerita) => jumlah + cerita.participantCount, 0)
	);

	/** Titik tengah jangkauan neto — angka perencanaan, bukan angka komunikasi. */
	const jangkauanNeto = $derived(
		admin.reach ? Math.round((admin.reach.pesimis.neto + admin.reach.optimis.neto) / 2) : 0
	);

	/**
	 * Seluruh perhitungan SROI, dikerjakan lapisan domain.
	 *
	 * Halaman hanya menyerahkan tiga kuantitas yang dibacanya dari koleksi lalu
	 * menerima hasil lengkap beserta langkah antaranya. Tidak ada satu pun operasi
	 * aritmetika model di berkas ini — itulah syarat agar angka rasio dapat diuji
	 * `node scripts/verify/domain-test.mjs` tanpa merender apa pun.
	 */
	const sroi = $derived(
		sroiCalculator.hitung({
			jangkauanNeto,
			jamPelatihan,
			pesertaAksiLingkungan,
			kelengkapanBuktiPersen: kelengkapanBukti.persen
		})
	);

	const buktiMemadai = $derived(sroi.layakDilaporkan);

	/**
	 * Rasio dalam bentuk teks, dipakai SELURUH tempat yang menyebut angka ini.
	 * Membulatkannya berbeda-beda per tempat pernah membuat kartu menampilkan
	 * "1 : 1,47" tepat di atas kalimat "menghasilkan Rp1" — dua angka yang saling
	 * membantah pada kartu yang sama.
	 */
	const rasioTeks = $derived(
		sroi.rasio.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
	);

	/**
	 * Membangun satu baris CSV yang aman. Nilai yang memuat pemisah, tanda kutip,
	 * atau baris baru dibungkus dan kutipnya digandakan — tanpa ini, satu nama
	 * anggota yang memuat koma akan menggeser seluruh kolom di sebelah kanannya.
	 *
	 * @param {readonly (string|number)[]} kolom
	 * @returns {string}
	 */
	function barisCsv(kolom) {
		return kolom
			.map((nilai) => {
				const teks = String(nilai ?? '');
				return /[",\n;]/.test(teks) ? `"${teks.replaceAll('"', '""')}"` : teks;
			})
			.join(',');
	}

	/**
	 * Mengunduh sebuah berkas dari data yang sudah ada di memori.
	 *
	 * BOM UTF-8 sengaja disisipkan pada CSV agar huruf beraksen dan nama Indonesia
	 * terbaca benar ketika berkas dibuka langsung di Excel — tanpa itu, "Nurhaliza"
	 * tetap aman tetapi judul kolom beraksen tidak.
	 *
	 * @param {string} namaBerkas
	 * @param {string} isi
	 * @param {string} tipe
	 * @returns {void}
	 */
	function unduh(namaBerkas, isi, tipe) {
		try {
			const blob = new Blob([isi], { type: tipe });
			const url = URL.createObjectURL(blob);
			const tautan = document.createElement('a');
			tautan.href = url;
			tautan.download = namaBerkas;
			document.body.append(tautan);
			tautan.click();
			tautan.remove();
			URL.revokeObjectURL(url);

			toast.push({
				type: ToastType.SUCCESS,
				title: 'Berkas terunduh',
				message: `${namaBerkas} tersimpan ke folder unduhan peramban.`
			});
		} catch (penyebab) {
			toast.push({
				type: ToastType.ERROR,
				title: 'Ekspor gagal',
				message:
					penyebab instanceof Error
						? penyebab.message
						: 'Peramban menolak pembuatan berkas unduhan.'
			});
		}
	}

	/** @param {string} nama @param {string} isi */
	const unduhCsv = (nama, isi) => unduh(nama, `﻿${isi}`, 'text/csv;charset=utf-8');

	function eksporRekapBulanan() {
		const isi = [
			barisCsv(['Bulan', 'Poin kontribusi', 'Aksi tercatat', 'Kabar terkirim', 'Cerita terbit', 'Kegiatan selesai']),
			...rekapBulanan.map((bulan) =>
				barisCsv([bulan.label, bulan.points, bulan.actions, bulan.broadcasts, bulan.stories, bulan.events])
			),
			barisCsv([
				'Total program',
				totalRekap.points,
				totalRekap.actions,
				totalRekap.broadcasts,
				totalRekap.stories,
				totalRekap.events
			])
		].join('\n');

		unduhCsv('pfriends-rekap-bulanan-2026.csv', isi);
	}

	function eksporKpi() {
		const isi = [
			barisCsv(['Kode', 'Metrik', 'Aktual', 'Target', 'Satuan', 'Pencapaian %', 'Status', 'Pembilang', 'Penyebut', 'Formula', 'Sumber']),
			...admin.kpi.map((baris) =>
				barisCsv([
					baris.id,
					baris.label,
					baris.actual,
					baris.target,
					baris.unit,
					baris.percent,
					baris.status,
					baris.numerator,
					baris.denominator,
					baris.formula,
					baris.source
				])
			)
		].join('\n');

		unduhCsv('pfriends-kpi-hal6.csv', isi);
	}

	function eksporAnggota() {
		const isi = [
			barisCsv(['Identitas', 'Nama', 'Komunitas', 'Chapter', 'Tier', 'Poin', 'Status', 'Consent aktif', 'Kota', 'Tahun lulus']),
			...catalog.awardees.map((awardee) =>
				barisCsv([
					awardee.id,
					awardee.fullName,
					awardee.communityDef?.akronim ?? awardee.community,
					awardee.chapterId,
					awardee.tier.label,
					awardee.points,
					awardee.statusMeta.label,
					awardee.consentActive ? 'Ya' : 'Tidak',
					awardee.city,
					awardee.graduationYear ?? ''
				])
			)
		].join('\n');

		unduhCsv('pfriends-registry-anggota.csv', isi);
	}

	function eksporJson() {
		const laporan = {
			meta: {
				program: 'Community Connect Initiative — Pfriends',
				pemilik: 'Divisi Corporate Secretary, Pertamina Foundation',
				periode: 'Januari–Juli 2026',
				disusunPada: new Date().toISOString()
			},
			kpiAktivitas: admin.kpi.map((baris) => ({
				id: baris.id,
				label: baris.label,
				aktual: baris.actual,
				target: baris.target,
				satuan: baris.unit,
				pencapaianPersen: baris.percent,
				status: baris.status,
				pembilang: baris.numerator,
				penyebut: baris.denominator,
				formula: baris.formula,
				sumber: baris.source
			})),
			rekapBulanan,
			sebaranTier: admin.tierDistribution,
			jangkauanOrganik: admin.reach,
			buktiEsg: {
				matriks: admin.esgMatrix,
				kelengkapanBukti,
				sdgTerbukti: admin.sdgCoverage.filter((sdg) => sdg.count > 0)
			},
			sroi: {
				outcome: sroi.outcomes,
				nilaiKotor: sroi.nilaiKotor,
				penyesuaian: sroi.penyesuaian,
				nilaiNeto: sroi.nilaiNeto,
				investasi: sroi.investasi,
				rasio: Number(sroi.rasio.toFixed(2)),
				kelengkapanBuktiPersen: sroi.kelengkapanBuktiPersen,
				ambangKelengkapanBukti: sroi.ambangKelengkapanBukti,
				layakDilaporkan: sroi.layakDilaporkan,
				asumsi: sroiCalculator.proxy
			}
		};

		unduh(
			'pfriends-laporan-program-2026.json',
			JSON.stringify(laporan, null, 2),
			'application/json;charset=utf-8'
		);
	}
</script>

<PageHeader
	eyebrow="Laporan"
	title="Ringkasan program Januari–Juli 2026"
	subtitle="Rekap bulanan, perhitungan SROI sederhana, dan ekspor data mentah. Seluruh kuantitas berasal dari catatan nyata; nilai proxy rupiahnya berstatus asumsi dan diberi label di setiap tempat ia muncul."
>
	{#snippet actions()}
		<Button variant="secondary" size="sm" iconPath={ICONS.download} onclick={eksporKpi}>
			CSV KPI
		</Button>
		<Button variant="primary" size="sm" iconPath={ICONS.download} onclick={eksporJson}>
			Unduh laporan JSON
		</Button>
	{/snippet}
</PageHeader>

<div class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
	<StatTile
		label="Poin kontribusi program"
		value={totalRekap.points}
		unit="poin"
		hint="{formatAngka(totalRekap.actions)} aksi tercatat sepanjang tujuh bulan"
		iconPath={ICONS.coin}
		color="var(--color-pertamina-blue)"
	/>
	<StatTile
		label="Kabar terdiseminasi"
		value={totalRekap.broadcasts}
		unit="kabar"
		hint="Berstatus terkirim ke kanal komunitas"
		iconPath={ICONS.megaphone}
		color="var(--color-pertamina-red)"
	/>
	<StatTile
		label="Cerita terpublikasi"
		value={totalRekap.stories}
		unit="cerita"
		hint="Lolos seluruh gerbang publikasi dan tayang di microsite"
		iconPath={ICONS.book}
		color="var(--color-pertamina-navy)"
	/>
	<StatTile
		label="Kegiatan terlaksana"
		value={totalRekap.events}
		unit="kegiatan"
		hint="Berstatus selesai pada kalender komunitas"
		iconPath={ICONS.calendar}
		color="var(--color-pertamina-green)"
	/>
</div>

<!-- ── Rekap bulanan ───────────────────────────────────────────────────── -->
<section aria-labelledby="judul-rekap" class="mb-8">
	<div class="mb-3 flex flex-wrap items-baseline justify-between gap-2">
		<h2 id="judul-rekap" class="text-base font-bold text-heading">Rekap bulanan program</h2>
		<Button variant="ghost" size="sm" iconPath={ICONS.download} onclick={eksporRekapBulanan}>
			Unduh CSV
		</Button>
	</div>

	<div class="overflow-hidden rounded-card border border-ink-100 bg-surface shadow-card">
		<div class="overflow-x-auto">
			<table class="w-full min-w-max border-collapse text-left">
				<caption class="sr-only">
					Rekap bulanan poin kontribusi, aksi tercatat, kabar terkirim, cerita terbit, dan kegiatan
					selesai sepanjang Januari hingga Juli 2026
				</caption>
				<thead>
					<tr class="bg-ink-50">
						<th scope="col" class="label-micro px-4 py-3">Bulan</th>
						<th scope="col" class="label-micro px-4 py-3 text-right">Poin</th>
						<th scope="col" class="label-micro px-4 py-3 text-right">Aksi</th>
						<th scope="col" class="label-micro px-4 py-3 text-right">Kabar terkirim</th>
						<th scope="col" class="label-micro px-4 py-3 text-right">Cerita terbit</th>
						<th scope="col" class="label-micro px-4 py-3 text-right">Kegiatan selesai</th>
					</tr>
				</thead>
				<tbody>
					{#each rekapBulanan as bulan (bulan.monthKey)}
						<tr class="border-b border-ink-100 last:border-b-0 hover:bg-ink-50">
							<th scope="row" class="px-4 py-2.5 text-sm font-medium text-ink-800">{bulan.label}</th>
							<td class="numeric px-4 py-2.5 text-right text-sm text-ink-700">{formatAngka(bulan.points)}</td>
							<td class="numeric px-4 py-2.5 text-right text-sm text-ink-700">{formatAngka(bulan.actions)}</td>
							<td class="numeric px-4 py-2.5 text-right text-sm text-ink-700">{formatAngka(bulan.broadcasts)}</td>
							<td class="numeric px-4 py-2.5 text-right text-sm text-ink-700">{formatAngka(bulan.stories)}</td>
							<td class="numeric px-4 py-2.5 text-right text-sm text-ink-700">{formatAngka(bulan.events)}</td>
						</tr>
					{/each}
					<tr class="bg-ink-50 font-semibold">
						<th scope="row" class="px-4 py-2.5 text-sm text-heading">Total program</th>
						<td class="numeric px-4 py-2.5 text-right text-sm text-ink-900">{formatAngka(totalRekap.points)}</td>
						<td class="numeric px-4 py-2.5 text-right text-sm text-ink-900">{formatAngka(totalRekap.actions)}</td>
						<td class="numeric px-4 py-2.5 text-right text-sm text-ink-900">{formatAngka(totalRekap.broadcasts)}</td>
						<td class="numeric px-4 py-2.5 text-right text-sm text-ink-900">{formatAngka(totalRekap.stories)}</td>
						<td class="numeric px-4 py-2.5 text-right text-sm text-ink-900">{formatAngka(totalRekap.events)}</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>
</section>

<!-- ── SROI sederhana ──────────────────────────────────────────────────── -->
<section aria-labelledby="judul-sroi" class="mb-8">
	<h2 id="judul-sroi" class="mb-1 text-base font-bold text-heading">SROI sederhana</h2>
	<p class="mb-3 max-w-4xl text-sm text-ink-600">
		Nilai sosial neto dibagi investasi program. Empat penyesuaian standar diterapkan berurutan —
		tanpa keempatnya, angka yang muncul hanyalah penjumlahan manfaat dan tidak layak disebut SROI.
	</p>

	<div
		class="mb-4 flex flex-wrap items-start gap-3 rounded-card border p-4 {buktiMemadai
			? 'border-pertamina-green/25 bg-pertamina-green-tint/40'
			: 'border-warning/25 bg-warning-tint/40'}"
	>
		<Icon
			path={buktiMemadai ? ICONS.checkCircle : ICONS.warning}
			size={20}
			class="mt-0.5 shrink-0 {buktiMemadai ? 'text-pertamina-green-ink' : 'text-warning'}"
		/>
		<div class="min-w-0 flex-1">
			<p class="text-sm font-semibold text-heading">
				{buktiMemadai
					? 'Pipeline bukti memenuhi ambang pelaporan'
					: 'Estimasi — menunggu pipeline bukti mencapai ambang'}
			</p>
			<p class="mt-1 text-xs leading-relaxed text-ink-600">
				Kelengkapan bukti ESG {formatPersen(kelengkapanBukti.persen)} ({formatAngka(
					kelengkapanBukti.siap
				)} dari {formatAngka(kelengkapanBukti.total)} record lolos gerbang) terhadap ambang
				{sroi.ambangKelengkapanBukti}%.
				{buktiMemadai
					? ' Rasio di bawah dapat dilaporkan disertai daftar asumsinya.'
					: ' Rasio di bawah belum layak dibawa keluar sebagai klaim — Hal 9 menuntut bukti pipeline berdiri lebih dulu.'}
			</p>
			<ProgressBar
				value={kelengkapanBukti.persen}
				max={100}
				color={buktiMemadai ? 'var(--color-pertamina-green)' : 'var(--color-tier-champion)'}
				label="Kelengkapan bukti ESG"
				class="mt-2"
			/>
		</div>
	</div>

	{#if !sroi.adaOutcome}
		<Card>
			<EmptyState
				title={admin.loading ? 'Menghitung nilai sosial' : 'Belum ada outcome berproxy'}
				message="Perhitungan SROI memerlukan minimal satu kegiatan selesai berpeserta, atau satu cerita lingkungan yang lolos gerbang bukti."
				iconPath={ICONS.trend}
			/>
		</Card>
	{:else}
		<div class="grid grid-cols-1 gap-4 xl:grid-cols-3">
			<Card class="xl:col-span-2">
				<h3 class="mb-3 text-sm font-bold text-heading">Outcome berproxy</h3>

				<ul class="space-y-3">
					{#each sroi.outcomes as outcome (outcome.id)}
						<li class="rounded-card border border-ink-100 p-3">
							<div class="flex flex-wrap items-start justify-between gap-2">
								<p class="min-w-0 flex-1 text-sm font-semibold text-ink-900">{outcome.label}</p>
								<p class="numeric shrink-0 text-sm font-bold text-ink-900">
									{formatRupiah(outcome.nilai)}
								</p>
							</div>
							<p class="numeric mt-1 text-xs text-ink-700">
								{formatAngka(outcome.kuantitas)} {outcome.satuan} × {formatRupiah(outcome.proxy)}
								{outcome.satuanProxy}
							</p>
							<p class="mt-1 text-xs leading-relaxed text-ink-500">
								Kuantitas dari {outcome.sumber}. Nilai proxy berstatus asumsi.
							</p>
						</li>
					{/each}
				</ul>

				<div class="mt-3 flex items-baseline justify-between border-t border-ink-100 pt-3">
					<span class="text-sm font-semibold text-heading">Nilai sosial kotor</span>
					<span class="numeric text-lg font-bold text-ink-900">{formatRupiah(sroi.nilaiKotor)}</span>
				</div>

				<h3 class="mt-4 mb-2 text-sm font-bold text-heading">Penyesuaian standar</h3>
				<ul class="space-y-2">
					{#each sroi.penyesuaian as penyesuaian (penyesuaian.key)}
						<li class="flex flex-wrap items-baseline justify-between gap-2 border-b border-ink-100 pb-2 last:border-b-0">
							<span class="min-w-0">
								<span class="block text-sm font-medium text-ink-800">
									{penyesuaian.label}
									<span class="numeric text-xs text-ink-500">
										−{formatPersen(penyesuaian.faktor * 100)}
									</span>
								</span>
								<span class="block text-xs text-ink-500">{penyesuaian.pertanyaan}</span>
							</span>
							<span class="numeric shrink-0 text-right">
								<span class="block text-xs text-pertamina-red-ink">
									−{formatRupiah(penyesuaian.potongan)}
								</span>
								<span class="block text-xs text-ink-600">{formatRupiah(penyesuaian.sisa)}</span>
							</span>
						</li>
					{/each}
				</ul>
			</Card>

			<Card accent="var(--color-pertamina-green)">
				<h3 class="text-sm font-bold text-heading">Hasil perhitungan</h3>

				<dl class="mt-3 space-y-3">
					<div>
						<dt class="label-micro">Nilai sosial neto</dt>
						<dd class="numeric mt-0.5 text-xl text-ink-900">{formatRupiah(sroi.nilaiNeto)}</dd>
					</div>
					<div>
						<dt class="label-micro">Investasi program</dt>
						<dd class="numeric mt-0.5 text-base text-ink-800">
							{formatRupiah(sroi.investasi)}
						</dd>
						<dd class="mt-0.5 text-xs text-ink-500">Asumsi — menunggu angka realisasi Corsec</dd>
					</div>
				</dl>

				<div class="mt-4 rounded-card border border-pertamina-green/25 bg-pertamina-green-tint/40 p-4 text-center">
					<p class="label-micro">Rasio SROI</p>
					<p class="numeric mt-1 text-3xl text-ink-900">1 : {rasioTeks}</p>
					<p class="mt-1 text-xs leading-relaxed text-ink-600">
						Setiap Rp1 yang diinvestasikan menghasilkan Rp{rasioTeks} nilai sosial terestimasi.
					</p>
					<p class="mt-2">
						<StatusBadge
							label={buktiMemadai ? 'Layak dilaporkan' : 'Estimasi internal'}
							color={buktiMemadai ? 'green' : 'amber'}
							size="sm"
							withDot
						/>
					</p>
				</div>

				<p class="mt-3 text-xs leading-relaxed text-ink-500">
					Rasio tidak pernah ditampilkan tanpa kelengkapan buktinya. Angka SROI yang tidak dapat
					ditelusuri ke baris bukti akan runtuh saat diaudit — dan yang rusak bukan angkanya,
					melainkan kepercayaan pada program yang sebenarnya berkinerja baik.
				</p>
			</Card>
		</div>
	{/if}
</section>

<!-- ── Ekspor dan asumsi ───────────────────────────────────────────────── -->
<section aria-labelledby="judul-ekspor" class="grid grid-cols-1 gap-4 xl:grid-cols-2">
	<Card>
		<h2 id="judul-ekspor" class="text-base font-bold text-heading">Ekspor data</h2>
		<p class="mt-1 text-sm text-ink-600">
			Seluruh berkas dibangun dari data yang sedang tampil di konsol, bukan dari cuplikan terpisah.
			Angka pada berkas dijamin sama dengan angka di layar.
		</p>

		<ul class="mt-4 space-y-2">
			{#each [{ id: 'json', label: 'Laporan program lengkap', format: 'JSON', isi: 'KPI, rekap bulanan, sebaran tier, jangkauan, matriks ESG, dan perhitungan SROI beserta asumsinya', aksi: eksporJson }, { id: 'kpi', label: 'Potret lima KPI Hal 6', format: 'CSV', isi: 'Aktual, target, pembilang, penyebut, formula, dan rujukan sumber tiap metrik', aksi: eksporKpi }, { id: 'bulanan', label: 'Rekap bulanan program', format: 'CSV', isi: 'Poin, aksi, kabar terkirim, cerita terbit, dan kegiatan selesai per bulan', aksi: eksporRekapBulanan }, { id: 'anggota', label: 'Registry anggota', format: 'CSV', isi: 'Identitas, komunitas, chapter, tier, poin, status keanggotaan, dan status consent', aksi: eksporAnggota }] as berkas (berkas.id)}
				<li class="flex flex-wrap items-center gap-3 rounded-card border border-ink-100 p-3">
					<span class="min-w-0 flex-1">
						<span class="flex flex-wrap items-baseline gap-2">
							<span class="text-sm font-semibold text-ink-900">{berkas.label}</span>
							<span class="label-micro">{berkas.format}</span>
						</span>
						<span class="mt-0.5 block text-xs leading-relaxed text-ink-500">{berkas.isi}</span>
					</span>
					<Button variant="secondary" size="sm" iconPath={ICONS.download} onclick={berkas.aksi}>
						Unduh
					</Button>
				</li>
			{/each}
		</ul>

		{#if admin.seededAt}
			<p class="mt-3 text-xs text-ink-500">
				Data demo terakhir dipasang {formatTanggal(admin.seededAt, 'waktu')}.
			</p>
		{/if}
	</Card>

	<Card>
		<h2 class="text-base font-bold text-heading">Asumsi yang dipakai perhitungan</h2>
		<p class="mt-1 text-sm text-ink-600">
			Setiap angka estimasi tanpa asumsi yang terlihat akan diperlakukan pembaca sebagai fakta
			terukur — risiko kredibilitas yang tidak sepadan. Seluruh butir di bawah menunggu penetapan
			Corsec.
		</p>

		<div class="mt-3 overflow-x-auto">
			<table class="w-full min-w-max border-collapse text-left text-sm">
				<caption class="sr-only">
					Daftar parameter asumsi beserta nilai yang sedang dipakai dan rujukan dokumennya
				</caption>
				<thead>
					<tr class="border-b border-ink-200">
						<th scope="col" class="label-micro py-2 pr-4">Parameter</th>
						<th scope="col" class="label-micro py-2 pr-4 text-right">Nilai</th>
						<th scope="col" class="label-micro py-2">Rujukan</th>
					</tr>
				</thead>
				<tbody>
					{#each [{ label: 'Engagement rate akun brand PF', nilai: formatPersen(SROI_PROXY.engagementRateBrand * 100), rujukan: 'Input eksternal' }, { label: 'Pengali engagement komunitas', nilai: `${REACH_PARAMETERS.pengaliEngagementMin}×`, rujukan: 'Hal 6 — batas bawah' }, { label: 'Biaya per engagement pasar', nilai: formatRupiah(SROI_PROXY.biayaPerEngagement), rujukan: 'Rate card, belum tersedia' }, { label: 'Nilai jam pelatihan per peserta', nilai: formatRupiah(SROI_PROXY.nilaiJamPelatihan), rujukan: 'Proxy pasar' }, { label: 'Nilai partisipasi aksi per orang', nilai: formatRupiah(SROI_PROXY.nilaiPesertaAksi), rujukan: 'Proxy pasar' }, { label: 'Investasi program Jan–Jul 2026', nilai: formatRupiah(SROI_PROXY.investasiProgram), rujukan: 'Realisasi anggaran Corsec' }, { label: 'Tumpang tindih audiens', nilai: formatPersen(REACH_PARAMETERS.overlapJaringan * 100), rujukan: 'Asumsi model reach' }, { label: 'Ambang kelengkapan bukti', nilai: `${sroi.ambangKelengkapanBukti}%`, rujukan: 'Gerbang fase pelaporan' }] as asumsi (asumsi.label)}
						<tr class="border-b border-ink-100 last:border-b-0">
							<th scope="row" class="py-2 pr-4 text-xs font-medium text-ink-700">{asumsi.label}</th>
							<td class="numeric py-2 pr-4 text-right text-xs font-semibold text-ink-900">
								{asumsi.nilai}
							</td>
							<td class="py-2 text-xs text-ink-500">{asumsi.rujukan}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<p class="mt-3 text-xs leading-relaxed text-ink-500">
			Empat penyesuaian SROI memakai nilai baku {sroiCalculator.adjustments
				.map((p) => `${p.label} ${Math.round(p.faktor * 100)}%`)
				.join(' · ')} — seluruhnya asumsi yang wajib dikonfirmasi sebelum laporan dibawa keluar.
		</p>
	</Card>
</section>
