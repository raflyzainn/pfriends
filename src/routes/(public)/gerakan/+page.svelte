<script>
	/**
	 * GERAKAN BERSAMA: etalase movement-based program.
	 *
	 * Hanya gerakan yang benar-benar berjalan atau sudah selesai yang tampil di
	 * sini. Usulan yang belum disetujui sengaja disembunyikan: memajangnya di
	 * halaman publik berarti menjanjikan sesuatu yang belum tentu jadi, dan
	 * kepercayaan yang hilang karenanya jauh lebih mahal daripada tambahan satu
	 * baris di layar.
	 *
	 * TIGA KEPUTUSAN YANG TIDAK TERBACA DARI KODE:
	 *
	 * 1. **Kalimat "memimpin aksi lapangan bernilai N" DICABUT.** Progres
	 *    partisipasi ditampilkan sebagai cacah peserta terhadap target, tanpa satu
	 *    pun nilai kontribusi. Gerakan yang dijelaskan lewat imbalannya berubah
	 *    menjadi transaksi, dan itu persis yang membuat klaim "gerakan bersama"
	 *    kehilangan arti (US-R21 AC-4).
	 *
	 * 2. **`MovementCard` diganti baris ber-keying rule.** Kartu memaksa setiap
	 *    gerakan tampil sama besar; barisnya membuat gerakan unggulan benar-benar
	 *    terbaca sebagai unggulan. Strip empat kartu statistik yang dulu ada di
	 *    puncak halaman juga dicabut: empat kotak berukuran identik adalah bentuk
	 *    yang dibuang diagnosis D-05.
	 *
	 * 3. **Angka ringkasan dihitung dari daftar yang sudah tersaring publik**, dan
	 *    hanya tiga: gerakan berjalan, orang bergerak, laporan lapangan. Ketiganya
	 *    berkelas terhitung, jadi ditulis tegas: tanpa gauge dan tanpa rasio
	 *    terhadap target internal.
	 *
	 * @see docs/00-SOURCE-BRIEF.md: Hal 5 pilar 03 Movement-Based Program
	 * @see docs/11-VISUAL-DIRECTION.md: §6 E6 gerakan bersama
	 */
	import { FilterChips, Icon, ICONS } from '$lib/components';
	import { PhotoFigure, SectionRule } from '$lib/components/editorial';
	import { publicContent } from '$lib/stores/publicContent.svelte.js';
	import {
		MovementCategory,
		MovementStatus,
		MOVEMENT_CATEGORY_META,
		MOVEMENT_STATUS_META
	} from '$lib/domain/entities/Movement.js';
	import { foto } from '$lib/data/photos.js';
	import { formatAngka, formatTanggal, frasaHitung, persenProgres } from '$lib/utils/format.js';
	import { barisGerakan } from '../_view-model.js';

	/** Nilai filter yang berarti "tanpa penyaringan kategori". */
	const SEMUA = 'SEMUA';

	/** Status gerakan yang layak dipublikasikan. */
	const STATUS_PUBLIK = [MovementStatus.BERJALAN, MovementStatus.SELESAI];

	let kategoriTerpilih = $state(SEMUA);

	$effect(() => {
		publicContent.loadMovements();
	});

	const gerakanPublik = $derived(
		publicContent.movements.filter((gerakan) => STATUS_PUBLIK.includes(gerakan.status))
	);

	const hasilSaring = $derived(
		kategoriTerpilih === SEMUA
			? gerakanPublik
			: gerakanPublik.filter((gerakan) => gerakan.category === kategoriTerpilih)
	);

	const opsiKategori = $derived([
		{ id: SEMUA, label: 'Semua', count: gerakanPublik.length },
		...Object.values(MovementCategory).map((kode) => ({
			id: kode,
			label: MOVEMENT_CATEGORY_META[kode].label,
			count: gerakanPublik.filter((gerakan) => gerakan.category === kode).length
		}))
	]);

	/** Gerakan unggulan: partisipasi terbanyak, bukan yang paling baru. */
	const unggulan = $derived(
		[...gerakanPublik].sort((a, b) => b.participantCount - a.participantCount)[0] ?? null
	);
	const unggulanVM = $derived(unggulan ? baris(unggulan) : null);

	/** Baris daftar; gerakan unggulan tidak diulang ketika saringan sedang polos. */
	const daftarBaris = $derived(
		hasilSaring
			.filter((gerakan) => kategoriTerpilih !== SEMUA || gerakan.id !== unggulan?.id)
			.map((gerakan) => baris(gerakan))
	);

	/** Ringkasan dampak kolektif: bahasa gerakan selalu jamak, bukan per individu. */
	const dampak = $derived({
		berjalan: gerakanPublik.filter((gerakan) => gerakan.isRunning).length,
		peserta: gerakanPublik.reduce((jumlah, gerakan) => jumlah + gerakan.participantCount, 0),
		laporan: gerakanPublik.reduce((jumlah, gerakan) => jumlah + gerakan.reportCount, 0)
	});

	const tanggalPotret = $derived(formatTanggal(new Date(), 'panjang'));

	/**
	 * Baris gerakan siap render, lengkap dengan label kategori dan statusnya.
	 * @param {import('$lib/domain/entities/Movement.js').Movement} gerakan
	 * @returns {import('../_view-model.js').BarisGerakan}
	 */
	function baris(gerakan) {
		return barisGerakan(
			gerakan,
			MOVEMENT_CATEGORY_META[gerakan.category]?.label ?? 'Gerakan bersama',
			MOVEMENT_STATUS_META[gerakan.status]?.label ?? ''
		);
	}

	/**
	 * Props `PhotoFigure` dari satu kunci manifes foto.
	 * @param {string} kunci
	 * @returns {{src:string, alt:string, width:number, height:number, caption:string}}
	 */
	function propsFoto(kunci) {
		const berkas = foto(kunci);
		return {
			src: berkas?.src ?? '',
			alt: berkas?.alt ?? '',
			width: berkas?.w ?? 0,
			height: berkas?.h ?? 0,
			caption: berkas?.caption ?? ''
		};
	}

	/**
	 * Warna keying rule sebuah baris, dalam bentuk nilai CSS.
	 * @param {'red'|'navy'|'green'} nada
	 * @returns {string}
	 */
	function warnaKeyline(nada) {
		return `background:var(--color-pertamina-${nada});`;
	}
</script>

<svelte:head>
	<title>Gerakan Bersama: PFriends</title>
	<meta
		name="description"
		content="Gerakan bersama komunitas PFriends: aksi lingkungan, edukasi masyarakat, dan pemberdayaan ekonomi yang dijalankan anggota di berbagai daerah."
	/>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
	<header style="padding-block:var(--rhythm-tight) 0;">
		<!-- "Movement-based program" adalah nama pilar pada dokumen sumber; sebagai
		     label antarmuka di zona publik ia wajib Bahasa Indonesia. -->
		<p class="kicker">Gerakan bersama komunitas</p>
		<h1
			class="display-editorial mt-4 max-w-[18ch] text-[clamp(30px,3.2vw,44px)] leading-[1.06] text-heading"
		>
			Bukan acara sekali jalan
		</h1>
		<p class="mt-6 max-w-[60ch] text-[18px] leading-[1.55] text-ink-700">
			Setiap gerakan punya target peserta, wilayah kerja, penanggung jawab, dan laporan hasil yang
			dapat diperiksa.
		</p>
	</header>

	{#if publicContent.movementsLoading && gerakanPublik.length === 0}
		<p class="mt-8 text-[15px] leading-[1.6] text-ink-600" aria-live="polite">
			Memuat gerakan dari PocketBase.
		</p>
	{:else if publicContent.movementsError}
		<p class="mt-8 max-w-[58ch] border-l-4 border-pertamina-red pl-4 text-[15px] leading-[1.6] text-ink-700" role="alert">
			{publicContent.movementsError} Muat ulang halaman untuk mencoba kembali.
		</p>
	{/if}

	{#if unggulanVM}
		<!-- Gerakan unggulan: foto 21:9 dengan panel teks menumpuk. -->
		<section aria-labelledby="judul-unggulan" style="padding-block:var(--rhythm-snug) 0;">
			<!-- `gerakan-mangrove` DICABUT: berkasnya memajang kaus berlogo satu
			     organisasi pihak ketiga pada tujuh orang sekaligus, dan alt-nya
			     ("hamparan lumpur pesisir saat penanaman") tidak menggambarkan isi
			     gambarnya (kerja bersih pantai dengan karung). Dua kesalahan berbeda
			     pada satu berkas, keduanya di foto terbesar halaman ini.
			     `cta-penutup` berasio 21:9 intrinsik (1600×686), alt-nya cocok, dan
			     tidak memuat merek organisasi mana pun. -->
			<PhotoFigure {...propsFoto('cta-penutup')} ratio="21:9" fallbackLabel="Gerakan bersama" />

			<!-- Panel digantung di TEPI KANAN pada ≥1024 px. Rata kiri dan dinaikkan
			     80 px seperti sebelumnya, latarnya yang pejal menutup rapat kapsi dan
			     baris kredit foto: keduanya rata kiri, tepat di bawah gambar: pada
			     seluruh lebar 375–1920 px. Foto unggulan halaman ini akhirnya tampil
			     tanpa label "foto stok" dan tanpa nama fotografernya, dua keterangan
			     yang wajib ada (`docs/11` §4.4). Di bawah 1024 px tumpukannya dilepas:
			     talangnya tidak cukup lebar untuk digantungi. -->
			<div
				class="relative z-10 mt-6 max-w-[46rem] bg-surface p-6 sm:p-8 lg:-mt-20 lg:ml-auto lg:max-w-[40rem]"
			>
				<span class="keyline" style={warnaKeyline(unggulanVM.keyline)} aria-hidden="true"></span>

				<p class="kicker mt-5">Gerakan terbesar · {unggulanVM.kategoriLabel}</p>
				<h2
					id="judul-unggulan"
					class="display-editorial mt-3 text-[clamp(24px,3vw,30px)] leading-[1.12] text-heading"
				>
					{unggulanVM.judul}
				</h2>
				<p class="mt-4 max-w-[58ch] text-[16px] leading-[1.68] text-ink-700">
					{unggulanVM.tujuan}
				</p>

				<p class="mt-6 text-[16px] leading-[1.6] text-ink-700">
					<span class="figure-number text-[28px] text-ink-900">
						{formatAngka(unggulanVM.peserta)}
					</span>
					orang bergerak di
					{frasaHitung(unggulanVM.wilayah, 'wilayah')}
				</p>

				{#if unggulanVM.target > 0}
					<div class="mt-4 max-w-[26rem]">
						<!-- Rule progres 4 px PERSEGI: cacah peserta terhadap target, tanpa nilai kontribusi. -->
						<div class="h-1 w-full bg-ink-200">
							<div
								class="h-1 bg-pertamina-green"
								style="width:{persenProgres(unggulanVM.peserta, unggulanVM.target)}%;"
							></div>
						</div>
						<p class="mt-2 text-[13px] leading-[1.45] text-ink-600">
							{formatAngka(unggulanVM.peserta)} dari {formatAngka(unggulanVM.target)} peserta sasaran
						</p>
					</div>
				{/if}
			</div>
		</section>

		<!-- Tiga angka ringkasan, sejajar dalam prosa: bukan empat kotak statistik. -->
		<SectionRule scale="quiet" rhythm="snug" kicker="Sejauh ini" label="Yang sudah tercatat">
			<dl class="grid grid-cols-1 gap-x-10 gap-y-8 sm:grid-cols-3">
				<div class="min-w-0">
					<dt class="kicker">Gerakan berjalan</dt>
					<dd class="figure-number mt-3 text-[40px] text-ink-900">
						{formatAngka(dampak.berjalan)}
					</dd>
					<p class="mt-2 text-[13px] leading-[1.45] text-ink-600">
						dari {frasaHitung(gerakanPublik.length, 'gerakan')} yang pernah dijalankan
					</p>
				</div>
				<div class="min-w-0 sm:border-l sm:border-ink-200 sm:pl-10">
					<dt class="kicker">Orang bergerak</dt>
					<dd class="figure-number mt-3 text-[40px] text-ink-900">
						{formatAngka(dampak.peserta)}
					</dd>
					<p class="mt-2 text-[13px] leading-[1.45] text-ink-600">
						cacah keikutsertaan pada seluruh gerakan, per {tanggalPotret}
					</p>
				</div>
				<div class="min-w-0 sm:border-l sm:border-ink-200 sm:pl-10">
					<dt class="kicker">Laporan lapangan</dt>
					<dd class="figure-number mt-3 text-[40px] text-ink-900">
						{formatAngka(dampak.laporan)}
					</dd>
					<p class="mt-2 text-[13px] leading-[1.45] text-ink-600">
						catatan hasil yang dikirim penanggung jawab wilayah
					</p>
				</div>
			</dl>
		</SectionRule>
	{/if}

	<!-- Daftar gerakan sebagai baris, dengan penyaring kategori. -->
	<SectionRule
		tone="navy"
		scale="display"
		rhythm="base"
		kicker="Daftar gerakan"
		label="Yang sedang dan pernah dijalankan"
	>
		{#if gerakanPublik.length > 0}
			<FilterChips
				options={opsiKategori}
				bind:selected={kategoriTerpilih}
				showClear={false}
				label="Saring berdasarkan kategori gerakan"
			/>

			<p class="mt-5 text-[14px] leading-[1.5] text-ink-600" aria-live="polite">
				Menampilkan {frasaHitung(daftarBaris.length, 'gerakan')}
			</p>
		{/if}

		{#if daftarBaris.length > 0}
			<ul class="mt-8 border-t border-ink-200">
				{#each daftarBaris as gerakan (gerakan.id)}
					<li class="border-b border-ink-200">
						<div class="flex flex-wrap items-baseline gap-x-6 gap-y-3 py-6">
							<span
								class="h-8 w-1 shrink-0 self-center"
								style={warnaKeyline(gerakan.keyline)}
								aria-hidden="true"
							></span>

							<div class="min-w-0 flex-1">
								<h3 class="text-[18px] leading-[1.35] font-bold text-heading">{gerakan.judul}</h3>
								<p class="mt-2 max-w-[58ch] text-[15px] leading-[1.6] text-ink-700">
									{gerakan.tujuan}
								</p>
							</div>

							<div class="shrink-0 text-right">
								<p class="text-[14px] leading-[1.5] text-ink-600">
									{gerakan.kategoriLabel} · {frasaHitung(gerakan.wilayah, 'wilayah')}
								</p>
								<p class="mt-1 text-[14px] leading-[1.5] text-ink-700">
									{frasaHitung(gerakan.peserta, 'peserta')}
									{#if gerakan.target > 0}
										dari {formatAngka(gerakan.target)} sasaran
									{/if}
								</p>
								<p class="kicker mt-2">{gerakan.statusLabel}</p>
							</div>
						</div>
					</li>
				{/each}
			</ul>
		{:else if gerakanPublik.length > 0}
			<div class="mt-8 border-t border-ink-200 pt-8">
				<p class="max-w-[52ch] text-[16px] leading-[1.68] text-ink-700">
					Kategori ini belum punya gerakan yang berjalan. Lihat kategori lain, atau usulkan gerakan
					baru setelah kamu menjadi anggota.
				</p>
				<button
					type="button"
					class="mt-5 inline-flex min-h-11 items-center gap-2 text-[15px] font-semibold text-pertamina-red-ink underline-offset-4 hover:underline"
					onclick={() => (kategoriTerpilih = SEMUA)}
				>
					Tampilkan semua gerakan
					<Icon path={ICONS.arrowLongRight} size={18} />
				</button>
			</div>
		{:else if publicContent.movementsLoaded && !publicContent.movementsError}
			<div class="mt-8 border-t border-ink-200 pt-8">
				<p class="max-w-[56ch] text-[16px] leading-[1.68] text-ink-700">
					Belum ada gerakan yang berjalan. Gerakan bersama selalu berawal dari usulan anggota
					sendiri: begitu satu usulan disetujui verifikator, wilayah dan target pesertanya
					muncul di halaman ini.
				</p>
				<a
					href="/masuk?next=/awardee/gerakan"
					class="mt-5 inline-flex min-h-11 items-center gap-2 text-[15px] font-semibold text-brand-700 underline-offset-4 hover:underline"
				>
					Masuk dan usulkan yang pertama
					<Icon path={ICONS.arrowLongRight} size={18} />
				</a>
			</div>
		{/if}
	</SectionRule>
</div>

<!-- Penutup: pita, bukan kartu. -->
<section class="bg-pertamina-navy">
	<span class="keyline bg-pertamina-red" aria-hidden="true"></span>
	<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" style="padding-block:var(--rhythm-tight);">
		<div class="grid grid-cols-1 gap-x-12 gap-y-8 lg:grid-cols-12">
			<div class="min-w-0 lg:col-span-7">
				<!-- `display-editorial` berbaris 0.98: ukuran judul satu baris. Judul
				     yang dibatasi 22ch selalu pecah dua baris, dan leading itu membuat
				     ekor huruf baris pertama menyentuh kepala huruf baris kedua. -->
				<h2
					class="display-editorial max-w-[22ch] text-[clamp(24px,3vw,28px)] leading-[1.15] text-white"
				>
					Ingin menggerakkan sesuatu di daerahmu?
				</h2>
				<p class="mt-4 max-w-[52ch] text-[16px] leading-[1.68] text-white/88">
					Anggota PFriends dapat mengusulkan gerakan sendiri dan memimpinnya sampai laporannya
					selesai.
				</p>
			</div>
			<div class="flex flex-col items-start gap-3 lg:col-span-5 lg:items-end lg:justify-center">
				<a
					href="/masuk"
					class="inline-flex min-h-11 items-center rounded-control bg-accent-200 px-6 text-sm font-bold text-brand-800 transition-colors hover:bg-accent-300"
				>
					Masuk ke ruang anggota
				</a>
				<a
					href="/kalender"
					class="text-[15px] text-white/88 underline underline-offset-4 transition-colors hover:text-white"
				>
					Lihat Calendar of Event
				</a>
			</div>
		</div>
	</div>
</section>
