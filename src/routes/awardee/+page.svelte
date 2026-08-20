<script>
	/**
	 * HALAMAN: Beranda Awardee.
	 *
	 * Tanggung jawab: MENYAMBUT, lalu menjawab dua pertanyaan berurutan: *"apa
	 * yang perlu saya ikuti?"* dan *"apa yang perlu saya ketahui?"*. Ringkasan
	 * pencapaian menyusul sesudahnya sebagai penutup yang menyemangati, bukan
	 * sebagai pembuka yang menagih.
	 *
	 * ── EMPAT KEPUTUSAN YANG TIDAK TERBACA DARI KODE ───────────────────────────
	 *
	 * 1. **NOL papan peringkat, dan itu ditegakkan secara struktural.** Halaman ini
	 *    tidak mengimpor `leaderboard` store maupun `LeaderboardRow`, sehingga
	 *    tidak ada jalur bagi peringkat antar-anggota untuk sampai ke layar ini.
	 *    Pemilik produk meminta anggota melihat capaiannya sebagai perjalanan
	 *    pribadi; peringkat membuat sembilan dari sepuluh pembacanya pulang dengan
	 *    kabar bahwa mereka kalah. Papan peringkat tetap hidup di beranda publik
	 *    dan dasbor verifikator, tempat pembacanya memang bukan pesertanya.
	 *
	 * 2. **Susunannya dibalik dari versi sebelumnya.** Dahulu saldo poin dan empat
	 *    tombol aksi berpoin adalah hal pertama yang terlihat, dan halaman terbaca
	 *    seperti mesin absensi. Kini urutannya sapaan → kegiatan → informasi →
	 *    pencapaian: tiga hal pertama adalah alasan orang membuka microsite, dan
	 *    yang keempat adalah hadiah karena sudah melakukannya.
	 *
	 * 3. **Daftar "yang perlu kamu ketahui" tidak pernah kosong.** Butir yang
	 *    bersumber pada keadaan (naskah perlu revisi, kabar belum dibaca, kegiatan
	 *    dalam pekan ini) memang bisa habis, dan dasbor yang menyisakan kotak
	 *    kosong terbaca sebagai halaman rusak. Karena itu selalu ada satu butir
	 *    ajakan yang berlaku kapan pun.
	 *
	 * 4. **Chart-nya satu seri dan tanpa pembanding.** `AwardeePointTrend` memang
	 *    tidak mampu menampung seri kedua: garis "rata-rata komunitas" di
	 *    sebelahnya akan menjadi papan peringkat yang menyamar.
	 *
	 * @see docs/00-SOURCE-BRIEF.md: Hal 11 tabel skor, Hal 12 tier
	 * @see docs/07-UX-SITEMAP.md: §5.2 wireframe dasbor awardee
	 */
	import { onMount } from 'svelte';
	import {
		BadgeTile,
		Button,
		Card,
		EmptyState,
		Icon,
		StatusBadge,
		TierBadge,
		TierProgress,
		ICONS
	} from '$lib/components';
	import AwardeePointTrend from '$lib/charts/AwardeePointTrend.svelte';
	import { ActivityType } from '$lib/domain/constants/scoring-table.js';
	import { catalog } from '$lib/stores/catalog.svelte.js';
	import { editorial } from '$lib/stores/editorial.svelte.js';
	import { gamification } from '$lib/stores/gamification.svelte.js';
	import { session } from '$lib/stores/session.svelte.js';
	import { selisihHari, tambahHari } from '$lib/utils/date.js';
	import { formatAngka, formatRelatif, formatTanggal, frasaHitung } from '$lib/utils/format.js';

	/** Banyaknya kegiatan yang muat sebagai kartu tanpa mendorong isi lain keluar layar. */
	const JUMLAH_KEGIATAN = 3;

	/** Banyaknya kabar terbaru yang diringkas di dasbor. */
	const JUMLAH_KABAR = 3;

	/** Banyaknya butir informasi yang masih terbaca sebagai daftar, bukan sebagai antrean. */
	const BATAS_INFO = 4;

	/** Sebuah kegiatan disebut "pekan ini" bila jaraknya tidak lebih dari tujuh hari. */
	const AMBANG_PEKAN_INI = 7;

	/** Banyaknya titik pada grafik perjalanan poin. */
	const JUMLAH_TITIK_GRAFIK = 6;

	/** Jarak antar titik grafik, dalam hari. */
	const JEDA_TITIK_HARI = 7;

	/** Banyaknya lencana yang dipamerkan sebelum ditawari melihat koleksi penuh. */
	const BATAS_LENCANA_PAMER = 4;

	const awardee = $derived(session.awardee);

	/** Nama panggilan: kata pertama saja. Sapaan yang menyebut nama lengkap terasa formal. */
	const namaPanggilan = $derived(awardee ? awardee.fullName.split(' ')[0] : '');

	/**
	 * Sapaan yang mengikuti jam perangkat.
	 *
	 * Dihitung sekali saat halaman dibuka, bukan reaktif terhadap jam: sapaan yang
	 * berubah sendiri di tengah sesi lebih mengagetkan daripada menyenangkan.
	 */
	const sapaan = (() => {
		const jam = new Date().getHours();
		if (jam < 11) return 'Selamat pagi';
		if (jam < 15) return 'Selamat siang';
		if (jam < 19) return 'Selamat sore';
		return 'Selamat malam';
	})();

	/** Kabar yang poin bacanya sudah pernah diklaim, dibaca dari buku besar. */
	const kabarSudahDiklaim = $derived(
		new Set(
			gamification.ledger
				.filter((entri) => entri.activityType === ActivityType.BROADCAST_VIEW)
				.map((entri) => entri.refId)
				.filter(Boolean)
		)
	);

	const kabarTerbaru = $derived(catalog.sentBroadcasts.slice(0, JUMLAH_KABAR));

	const kabarBelumDibaca = $derived(
		catalog.sentBroadcasts.filter((kabar) => !kabarSudahDiklaim.has(kabar.id)).length
	);

	/** Kegiatan terdekat yang masih akan datang. */
	const kegiatanTerdekat = $derived(catalog.upcomingEvents(new Date(), JUMLAH_KEGIATAN));

	/** Kegiatan yang jatuh dalam tujuh hari ke depan: satu-satunya yang layak disebut mendesak. */
	const kegiatanPekanIni = $derived(
		kegiatanTerdekat.filter(
			(kegiatan) => selisihHari(new Date(), kegiatan.startsAt) <= AMBANG_PEKAN_INI
		)
	);

	/** Naskah milik penulis yang sedang masuk. */
	const naskahSaya = $derived.by(() => {
		if (editorial.myStories.length > 0) return editorial.myStories;
		return awardee ? catalog.storiesByAwardee(awardee.id) : [];
	});

	const naskahPerluRevisi = $derived(naskahSaya.filter((cerita) => cerita.needsRevision));
	const naskahTerbit = $derived(naskahSaya.filter((cerita) => cerita.isPublished));

	const lencanaTerkumpul = $derived(gamification.badges.filter((entri) => entri.unlocked));

	/**
	 * @typedef {object} ButirInfo
	 * @property {string} id
	 * @property {string} jenis      Label kategori: Tugas, Tenggat, Pengumuman, Ajakan.
	 * @property {'amber'|'navy'|'green'|'slate'} warna
	 * @property {string} iconPath
	 * @property {string} judul
	 * @property {string} isi
	 * @property {string} href
	 * @property {string} aksi       Teks tautan.
	 */

	/**
	 * Daftar "yang perlu kamu ketahui".
	 *
	 * Butir yang menuntut TINDAKAN diletakkan lebih dulu, butir bacaan menyusul,
	 * ajakan menutup. Urutannya bukan selera: daftar yang dibuka dengan ajakan
	 * membuat naskah yang dikembalikan verifikator terbaca sebagai catatan kaki.
	 * @type {ButirInfo[]}
	 */
	const infoPenting = $derived.by(() => {
		/** @type {ButirInfo[]} */
		const daftar = [];

		if (naskahPerluRevisi.length > 0) {
			daftar.push({
				id: 'revisi',
				jenis: 'Tugas',
				warna: 'amber',
				iconPath: ICONS.edit,
				judul: `${frasaHitung(naskahPerluRevisi.length, 'naskah Blog')} menunggu perbaikanmu`,
				isi: 'Verifikator sudah menuliskan apa yang perlu diubah. Catatannya menyertai tiap naskah.',
				href: '/awardee/cerita',
				aksi: 'Baca catatan'
			});
		}

		for (const kegiatan of kegiatanPekanIni) {
			daftar.push({
				id: `agenda-${kegiatan.id}`,
				jenis: 'Tenggat',
				warna: 'navy',
				iconPath: ICONS.calendar,
				judul: `${kegiatan.title}: ${formatRelatif(kegiatan.startsAt)}`,
				isi: `${kegiatan.typeMeta?.label ?? 'Kegiatan komunitas'} · ${kegiatan.isOnline ? 'Daring' : kegiatan.location || 'Luring'}. Pastikan kamu sudah mencatat jadwalnya.`,
				href: '/awardee/kalender',
				aksi: 'Lihat jadwal'
			});
		}

		if (kabarBelumDibaca > 0) {
			daftar.push({
				id: 'kabar',
				jenis: 'Pengumuman',
				warna: 'green',
				iconPath: ICONS.megaphone,
				judul: `${frasaHitung(kabarBelumDibaca, 'kabar')} belum kamu simak`,
				isi: 'Kabar mingguan memuat pengumuman program, undangan, dan peluang yang hanya dibuka untuk anggota.',
				href: '/awardee/kabar',
				aksi: 'Simak kabar'
			});
		}

		if (naskahSaya.length === 0) {
			daftar.push({
				id: 'blog-pertama',
				jenis: 'Ajakan',
				warna: 'slate',
				iconPath: ICONS.book,
				judul: 'Kamu belum menulis Blog pertama',
				isi: 'Satu aksi kecil bulan ini sudah cukup menjadi tulisan. Naskah yang lolos tinjauan tayang di ruang publik PFriends.',
				href: '/awardee/cerita/tulis',
				aksi: 'Mulai menulis'
			});
		}

		// Butir tetap: menjaga daftar tidak pernah kosong. Lihat keputusan 3.
		daftar.push({
			id: 'forum',
			jenis: 'Info',
			warna: 'slate',
			iconPath: ICONS.chat,
			judul: 'Forum komunitas terbuka untuk semua anggota',
			isi: 'Bertanya di #tanya-jawab, berbagi kabar usaha di #pfpreneur, atau menyapa sesama alumni di #sobi-alumni.',
			href: '/awardee/forum',
			aksi: 'Buka Forum'
		});

		return daftar.slice(0, BATAS_INFO);
	});

	/**
	 * Perjalanan Poin Kontribusi enam pekan terakhir, sebagai nilai KUMULATIF.
	 *
	 * Kumulatif, bukan perolehan per pekan: yang ingin diperlihatkan adalah garis
	 * yang selalu menanjak. Grafik batang perolehan mingguan justru menyorot pekan
	 * yang kosong, dan seorang anggota yang sedang sibuk skripsi tidak perlu
	 * dasbor yang mengingatkannya setiap kali membuka halaman.
	 */
	const perjalananPoin = $derived.by(() => {
		const entri = gamification.ledger.filter((baris) => baris.isAwarded);
		if (entri.length === 0) return { kategori: [], nilai: [] };

		const sekarang = new Date();
		/** @type {Date[]} */
		const titik = [];
		for (let mundur = JUMLAH_TITIK_GRAFIK - 1; mundur >= 0; mundur -= 1) {
			titik.push(tambahHari(sekarang, -mundur * JEDA_TITIK_HARI));
		}

		return {
			kategori: titik.map((tanggal) => formatTanggal(tanggal, 'ringkas')),
			nilai: titik.map((tanggal) =>
				entri
					.filter((baris) => new Date(baris.occurredAt).getTime() <= tanggal.getTime())
					.reduce((jumlah, baris) => jumlah + baris.points, 0)
			)
		};
	});

	// Antrean editorial dimuat di sini, bukan di layout: hanya dasbor dan dua
	// halaman yang membutuhkannya, dan store menahan pemanggilan serentak pada satu
	// janji yang sama sehingga pemanggilan ganda tidak berarti dua pembacaan.
	onMount(async () => {
		await editorial.load();
	});
</script>

<svelte:head>
	<title>Beranda: PFriends</title>
</svelte:head>

{#if !awardee}
	<EmptyState
		title="Data anggota belum termuat"
		message="Sesi kamu sedang dipulihkan. Bila keadaan ini bertahan, masuk ulang lewat halaman Masuk."
		iconPath={ICONS.user}
		actionLabel="Ke halaman Masuk"
		actionHref="/masuk"
	/>
{:else}
	<!-- ══ S1 · Sapaan ═══════════════════════════════════════════════════════
	     Kartu sambutan memakai tint teal, bukan putih: ia satu-satunya blok yang
	     boleh terasa "hangat" sebelum halaman berpindah ke permukaan kerja. -->
	<section
		class="rounded-card border border-brand-200 bg-brand-50 px-5 py-5 sm:px-6"
		aria-labelledby="judul-sapaan"
	>
		<div class="flex flex-wrap items-start justify-between gap-4">
			<div class="min-w-0">
				<p class="label-micro">{formatTanggal(new Date(), 'penuh')}</p>
				<h1 id="judul-sapaan" class="mt-1.5 font-sans text-2xl font-bold text-heading sm:text-[28px]">
					{sapaan}, {namaPanggilan}! 👋
				</h1>
				<p class="mt-2 max-w-2xl text-sm leading-relaxed text-ink-700">
					Kamu terdaftar sebagai anggota <span class="font-semibold text-brand-700"
						>{awardee.communityDef.akronim}</span
					>
					di {awardee.chapterDef.label}{#if awardee.city}, {awardee.city}{/if}. Senang kamu kembali :
					di bawah ini kegiatan terdekat dan hal-hal yang perlu kamu ketahui hari ini.
				</p>
			</div>

			<div class="flex shrink-0 flex-wrap items-center gap-2">
				<TierBadge tier={gamification.tier.level} size="md" />
				{#if gamification.streakWeeks > 0}
					<span
						class="inline-flex items-center gap-1.5 rounded-chip border border-accent-300 bg-accent-100 px-2.5 py-1 text-xs font-semibold text-accent-700"
					>
						<Icon path={ICONS.fire} size={14} />
						Aktif {frasaHitung(gamification.streakWeeks, 'minggu')} berturut-turut
					</span>
				{/if}
			</div>
		</div>
	</section>

	<!-- ══ S2 · Kegiatan terdekat ════════════════════════════════════════════ -->
	<section class="mt-7" aria-labelledby="judul-kegiatan">
		<div class="mb-3 flex flex-wrap items-baseline justify-between gap-2">
			<h2 id="judul-kegiatan" class="text-lg font-bold text-heading">
				Kegiatan yang bisa kamu ikuti
			</h2>
			<a
				href="/awardee/kalender"
				class="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 transition-colors hover:text-brand-600"
			>
				Calendar of Event
				<Icon path={ICONS.arrowRight} size={14} />
			</a>
		</div>

		{#if kegiatanTerdekat.length === 0}
			<EmptyState
				title="Belum ada kegiatan terjadwal"
				message="Kegiatan baru diumumkan tiap awal bulan: dan kamu boleh mengusulkan sendiri lewat tab “Usulan saya” di Calendar of Event."
				iconPath={ICONS.calendar}
				size="sm"
				actionLabel="Buka Calendar of Event"
				actionHref="/awardee/kalender"
			/>
		{:else}
			<ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each kegiatanTerdekat as kegiatan (kegiatan.id)}
					{@const jarakHari = selisihHari(new Date(), kegiatan.startsAt)}
					<li class="h-full">
						<!-- Kelas `flex` TIDAK dipasang pada `Card` berprop `href`: komponen itu
						     menambahkan `block` pada anchor-nya, dan dua utility `display` di satu
						     elemen dimenangkan oleh urutan CSS Tailwind, bukan urutan atributnya.
						     Kolomnya dibuat di dalam, tempat tidak ada yang menimpanya. -->
						<Card variant="interactive" padding="md" href="/awardee/kalender" class="h-full">
							<div class="flex h-full flex-col">
								<div class="flex items-start gap-3">
									<span
										class="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-brand-100 text-brand-700"
										aria-hidden="true"
									>
										<span class="numeric text-lg leading-none">{kegiatan.startsAt.getDate()}</span>
										<span class="mt-0.5 text-[10px] font-bold tracking-wider uppercase">
											{formatTanggal(kegiatan.startsAt, 'ringkas').split(' ')[1]}
										</span>
									</span>

									<div class="min-w-0 flex-1">
										<p class="label-micro truncate">{kegiatan.typeMeta?.label ?? 'Kegiatan komunitas'}</p>
										<h3 class="mt-1 line-clamp-2 text-sm leading-snug font-bold text-heading">
											{kegiatan.title}
										</h3>
									</div>
								</div>

								<p class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-600">
									<span class="inline-flex items-center gap-1">
										<Icon path={ICONS.clock} size={13} />
										{formatTanggal(kegiatan.startsAt, 'waktu')}
									</span>
									<span class="inline-flex items-center gap-1">
										<Icon path={kegiatan.isOnline ? ICONS.globe : ICONS.mapPin} size={13} />
										{kegiatan.isOnline ? 'Daring' : kegiatan.location || 'Luring'}
									</span>
								</p>

								<div class="mt-3 flex flex-1 items-end">
									{#if jarakHari <= AMBANG_PEKAN_INI}
										<StatusBadge
											label="Berlangsung {formatRelatif(kegiatan.startsAt)}"
											color="amber"
											size="sm"
											withDot
										/>
									{:else}
										<StatusBadge
											label={kegiatan.chapterId ? 'Terbuka untuk chapter-mu' : 'Terbuka'}
											color="green"
											size="sm"
										/>
									{/if}
								</div>
							</div>
						</Card>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<!-- ══ S3 · Yang perlu kamu ketahui ══════════════════════════════════════ -->
	<section class="mt-8" aria-labelledby="judul-info">
		<h2 id="judul-info" class="mb-3 text-lg font-bold text-heading">Yang perlu kamu ketahui</h2>

		<ul class="grid gap-3 lg:grid-cols-2">
			{#each infoPenting as butir (butir.id)}
				<li>
					<Card padding="md" class="flex h-full items-start gap-3">
						<span
							class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700"
							aria-hidden="true"
						>
							<Icon path={butir.iconPath} size={18} />
						</span>

						<div class="min-w-0 flex-1">
							<StatusBadge label={butir.jenis} color={butir.warna} size="sm" />
							<h3 class="mt-1.5 text-sm leading-snug font-bold text-heading">{butir.judul}</h3>
							<p class="mt-1 text-[13px] leading-relaxed text-ink-600">{butir.isi}</p>
							<a
								href={butir.href}
								class="mt-2 inline-flex min-h-9 items-center gap-1 text-[13px] font-semibold text-brand-700 transition-colors hover:text-brand-600"
							>
								{butir.aksi}
								<Icon path={ICONS.arrowRight} size={14} />
							</a>
						</div>
					</Card>
				</li>
			{/each}
		</ul>
	</section>

	<!-- ══ S4 · Pencapaian pribadi ═══════════════════════════════════════════
	     Dibingkai sebagai PERJALANAN, bukan sebagai posisi. Tidak ada satu pun
	     angka pembanding terhadap anggota lain di seluruh bagian ini. -->
	<section class="mt-8" aria-labelledby="judul-pencapaian">
		<div class="mb-3 flex flex-wrap items-baseline justify-between gap-2">
			<h2 id="judul-pencapaian" class="text-lg font-bold text-heading">Pencapaian pribadimu</h2>
			<a
				href="/awardee/penghargaan"
				class="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 transition-colors hover:text-brand-600"
			>
				Lihat semua pencapaian
				<Icon path={ICONS.arrowRight} size={14} />
			</a>
		</div>

		<div class="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
			<Card padding="lg" class="min-w-0">
				<div class="flex flex-wrap items-start justify-between gap-4">
					<div>
						<p class="label-micro">Poin Kontribusi terkumpul</p>
						<p class="numeric mt-1 text-4xl leading-none text-heading sm:text-5xl">
							{formatAngka(gamification.points)}
						</p>
						<p class="mt-2 text-xs text-ink-600">
							Dari {frasaHitung(gamification.ledger.length, 'aksi')} yang kamu catatkan sendiri
						</p>
					</div>

					<div class="grid grid-cols-3 gap-3 text-center sm:gap-5">
						<div>
							<p class="numeric text-xl text-heading">{formatAngka(gamification.coins)}</p>
							<p class="label-micro mt-1">Koin</p>
						</div>
						<div>
							<p class="numeric text-xl text-heading">{formatAngka(lencanaTerkumpul.length)}</p>
							<p class="label-micro mt-1">Lencana</p>
						</div>
						<div>
							<p class="numeric text-xl text-heading">{formatAngka(naskahTerbit.length)}</p>
							<p class="label-micro mt-1">Blog terbit</p>
						</div>
					</div>
				</div>

				<div class="mt-5 border-t border-ink-100 pt-5">
					<TierProgress points={gamification.points} />
				</div>

				<div class="mt-5 border-t border-ink-100 pt-4">
					<p class="label-micro mb-1">Perjalanan poinmu · enam pekan terakhir</p>
					<AwardeePointTrend
						categories={perjalananPoin.kategori}
						values={perjalananPoin.nilai}
						height="170px"
						loading={gamification.loading}
					/>
				</div>
			</Card>

			<Card padding="lg" class="min-w-0">
				<div class="flex items-center gap-2">
					<Icon path={ICONS.badge} size={18} class="text-accent-700" />
					<h3 class="text-sm font-bold text-heading">Lencana yang sudah kamu raih</h3>
				</div>

				{#if lencanaTerkumpul.length === 0}
					<p class="mt-3 rounded-xl bg-surface-soft p-3 text-[13px] leading-relaxed text-ink-600">
						Belum ada lencana yang terbuka: dan itu wajar bagi anggota baru. Lencana pertama
						biasanya datang dari kabar yang disimak dan kegiatan pertama yang dihadiri.
					</p>
				{:else}
					<div class="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
						{#each lencanaTerkumpul.slice(0, BATAS_LENCANA_PAMER) as entri (entri.badge.code)}
							<BadgeTile badge={entri.badge} unlocked size="sm" />
						{/each}
					</div>
					{#if lencanaTerkumpul.length > BATAS_LENCANA_PAMER}
						<p class="mt-3 text-xs text-ink-600">
							dan {frasaHitung(lencanaTerkumpul.length - BATAS_LENCANA_PAMER, 'lencana')} lainnya.
						</p>
					{/if}
				{/if}

				<p class="mt-4 border-t border-ink-100 pt-3 text-[13px] leading-relaxed text-ink-600">
					Angka-angka di halaman ini hanya membandingkanmu dengan dirimu sendiri bulan lalu. Tidak
					ada peringkat antar-anggota di ruang ini.
				</p>

				<div class="mt-4">
					<Button variant="secondary" size="sm" fullWidth href="/awardee/penghargaan" iconPath={ICONS.trophy}>
						Buka halaman Pencapaian
					</Button>
				</div>
			</Card>
		</div>
	</section>

	<!-- ══ S5 · Kabar terbaru & ajakan menulis ═══════════════════════════════ -->
	<section class="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
		<div class="min-w-0">
			<div class="mb-3 flex flex-wrap items-baseline justify-between gap-2">
				<h2 class="text-lg font-bold text-heading">Kabar terbaru</h2>
				<a
					href="/awardee/kabar"
					class="text-sm font-semibold text-brand-700 transition-colors hover:text-brand-600"
				>
					Semua kabar
				</a>
			</div>

			{#if kabarTerbaru.length === 0}
				<EmptyState
					title="Belum ada kabar baru"
					message="Kabar mingguan PFriends terbit setiap Selasa pagi."
					iconPath={ICONS.megaphone}
					size="sm"
				/>
			{:else}
				<ul class="space-y-3">
					{#each kabarTerbaru as kabar (kabar.id)}
						{@const belumDibaca = !kabarSudahDiklaim.has(kabar.id)}
						<li>
							<Card variant="interactive" padding="md" href="/awardee/kabar/{kabar.id}">
								<div class="flex items-center justify-between gap-2">
									<span class="label-micro">{kabar.channelLabel}</span>
									{#if belumDibaca}
										<StatusBadge label="Belum disimak" color="amber" size="sm" withDot />
									{:else}
										<StatusBadge label="Sudah disimak" color="green" size="sm" />
									{/if}
								</div>
								<h3 class="mt-2 line-clamp-2 text-sm font-bold text-heading">{kabar.title}</h3>
								<p class="mt-1 line-clamp-2 text-[13px] leading-relaxed text-ink-600">
									{kabar.summary}
								</p>
								<p class="mt-2 text-[11px] text-ink-600">
									{formatTanggal(kabar.sentAt, 'pendek')} · {formatRelatif(kabar.sentAt)}
								</p>
							</Card>
						</li>
					{/each}
				</ul>
			{/if}
		</div>

		<Card padding="lg" class="min-w-0">
			<p class="label-micro">Blog Saya</p>
			{#if naskahPerluRevisi.length > 0}
				<h2 class="mt-1.5 text-base font-bold text-heading">
					{frasaHitung(naskahPerluRevisi.length, 'naskah')} menunggu perbaikanmu
				</h2>
				<p class="mt-1.5 text-[13px] leading-relaxed text-ink-600">
					Verifikator sudah menuliskan apa yang perlu diubah. Catatannya menyertai tiap naskah di
					halaman Blog Saya.
				</p>
				<div class="mt-4">
					<Button size="sm" fullWidth href="/awardee/cerita" iconPath={ICONS.edit}>
						Baca catatan verifikator
					</Button>
				</div>
			{:else}
				<h2 class="mt-1.5 text-base font-bold text-heading">Ada yang layak kamu tulis?</h2>
				<p class="mt-1.5 text-[13px] leading-relaxed text-ink-600">
					Satu aksi kecil bulan ini sudah cukup menjadi tulisan. Blog yang lolos tinjauan tayang di
					ruang publik dan menjadi bahan laporan ESG Pertamina Foundation.
				</p>
				<div class="mt-4 space-y-2">
					<Button size="sm" fullWidth href="/awardee/cerita/tulis" iconPath={ICONS.edit}>
						Tulis Blog Baru
					</Button>
					<Button variant="secondary" size="sm" fullWidth href="/awardee/cerita">
						Lihat Blog saya
					</Button>
				</div>
			{/if}
		</Card>
	</section>

	<!-- ══ S6 · Ruang lain ═══════════════════════════════════════════════════
	     Tiga halaman ini dicabut dari navigasi supaya bilah menu tetap pendek,
	     tetapi routenya tetap hidup dan isinya tetap berguna. Baris kecil di kaki
	     dasbor menjaga keduanya tetap dapat dijangkau tanpa mengetik alamat. -->
	<section class="mt-8 border-t border-ink-100 pt-5" aria-labelledby="judul-ruang-lain">
		<h2 id="judul-ruang-lain" class="label-micro">Ruang lain di PFriends</h2>
		<ul class="mt-2.5 flex flex-wrap gap-x-5 gap-y-2">
			<li>
				<a
					href="/awardee/aksi"
					class="inline-flex min-h-9 items-center gap-1.5 text-sm font-medium text-ink-600 transition-colors hover:text-brand-700"
				>
					<Icon path={ICONS.bolt} size={15} />
					Pusat aksi & poin
				</a>
			</li>
			<li>
				<a
					href="/awardee/gerakan"
					class="inline-flex min-h-9 items-center gap-1.5 text-sm font-medium text-ink-600 transition-colors hover:text-brand-700"
				>
					<Icon path={ICONS.flag} size={15} />
					Gerakan bersama
				</a>
			</li>
			<li>
				<a
					href="/awardee/profil"
					class="inline-flex min-h-9 items-center gap-1.5 text-sm font-medium text-ink-600 transition-colors hover:text-brand-700"
				>
					<Icon path={ICONS.user} size={15} />
					Profil & persetujuan
				</a>
			</li>
		</ul>
	</section>
{/if}
