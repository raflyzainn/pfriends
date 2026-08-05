<script>
	/**
	 * HALAMAN `/verifikator/profil` — identitas akun dan riwayat keputusan.
	 *
	 * Tanggung jawab: menunjukkan siapa yang sedang masuk, kewenangan apa yang
	 * melekat pada perannya, dan keputusan apa saja yang pernah ia ambil.
	 *
	 * Lima keputusan yang tidak terbaca dari kode:
	 *
	 * 1. **Nol poin, nol tier, nol peringkat.** `AccessPolicy.canSeeScoring(VERIFIER)`
	 *    bernilai `false`, dan itu bukan kelalaian: verifikator dinilai pada mutu
	 *    keputusannya, bukan pada capaian angka. Halaman profil adalah tempat paling
	 *    mudah bagi mekanik skor untuk menyelinap masuk, karena "profil" di zona
	 *    awardee memang memuatnya.
	 * 2. **Kewenangan ditampilkan dari `AccessPolicy`, bukan dari daftar tulisan
	 *    tangan.** Kalimat "boleh meninjau konten" yang ditulis lepas akan tetap
	 *    berbunyi begitu setelah kewenangannya dicabut.
	 * 3. **Riwayat keputusan dibaca dari jejak pada entity**, bukan dari log
	 *    terpisah: `reviewerId`, `publishedById`, dan `reviewedBy` adalah rekaman
	 *    yang ditulis `ContentReviewService` pada saat keputusan diambil.
	 * 4. **Tidak ada formulir ganti kata sandi.** Kredensial hidup di
	 *    `AccountRepository` dan `passwordHash` tidak pernah keluar dari sana;
	 *    formulir yang tidak menyimpan apa pun akan mengajarkan pengguna bahwa
	 *    kata sandinya sudah berganti padahal tidak.
	 * 5. **Usulan kegiatan milik sendiri ditampilkan terpisah dari keputusan.**
	 *    Keduanya sengaja tidak dijumlahkan: yang satu pekerjaan sebagai pemutus,
	 *    yang lain sebagai pengusul — dan justru pemisahan itulah yang membuat
	 *    konflik kepentingan terbaca.
	 *
	 * @see docs/10-REVISION-SPEC.md — §6.4 route zona verifikator, §2.5 kewenangan peran
	 * @see docs/12-BUILD-CONTRACT-V2.md — §2.1 RolePermission, PO-2 larangan mekanik skor
	 */
	import { EmptyState, Icon, PageHeader, StatusBadge, ICONS } from '$lib/components';
	import { AccessPolicy } from '$lib/domain/policies/AccessPolicy.js';
	import { catalog } from '$lib/stores/catalog.svelte.js';
	import { editorial } from '$lib/stores/editorial.svelte.js';
	import { session } from '$lib/stores/session.svelte.js';
	import { formatTanggal } from '$lib/utils/format.js';

	/** Banyaknya keputusan terakhir yang ditampilkan. */
	const RIWAYAT_TERLIHAT = 12;

	const akun = $derived(session.account);

	/**
	 * Kewenangan peran yang sedang masuk, dijawab kebijakan akses.
	 * Daftarnya sengaja memuat yang TIDAK boleh juga — pembatasan yang tidak
	 * tertulis akan disangka kelalaian antarmuka.
	 */
	const kewenangan = $derived([
		{
			id: 'review',
			label: 'Meninjau naskah dan usulan kegiatan',
			boleh: AccessPolicy.canReviewContent(session.role)
		},
		{
			id: 'publish',
			label: 'Menerbitkan naskah ke ruang publik',
			boleh: AccessPolicy.canPublishContent(session.role)
		},
		{
			id: 'propose',
			label: 'Mengusulkan kegiatan komunitas',
			boleh: AccessPolicy.canProposeEvent(session.role)
		},
		{
			id: 'scoring',
			label: 'Melihat poin, tabel skor, dan tier',
			boleh: AccessPolicy.canSeeScoring(session.role)
		},
		{
			id: 'leaderboard',
			label: 'Melihat papan peringkat bernama',
			boleh: AccessPolicy.canSeeLeaderboard(session.role)
		}
	]);

	/**
	 * Naskah yang pernah diputuskan akun ini, terbaru lebih dulu.
	 *
	 * `reviewerId` dan `publishedById` sama-sama menunjuk `UserAccount`, sedangkan
	 * `authorId` menunjuk `Awardee`. Ketiganya berjenis string dan mudah tertukar.
	 */
	const naskahDiputuskan = $derived.by(() => {
		const idAkun = session.accountId;
		if (!idAkun) return [];
		return catalog.stories
			.filter((story) => story.reviewerId === idAkun || story.publishedById === idAkun)
			.sort((a, b) => (b.reviewedAt?.getTime() ?? 0) - (a.reviewedAt?.getTime() ?? 0))
			.slice(0, RIWAYAT_TERLIHAT);
	});

	/** Usulan kegiatan yang pernah diputuskan akun ini, terbaru lebih dulu. */
	const kegiatanDiputuskan = $derived.by(() => {
		const idAkun = session.accountId;
		if (!idAkun) return [];
		return catalog.events
			.filter((event) => event.reviewedBy === idAkun)
			.sort((a, b) => (b.reviewedAt?.getTime() ?? 0) - (a.reviewedAt?.getTime() ?? 0))
			.slice(0, RIWAYAT_TERLIHAT);
	});
</script>

<PageHeader eyebrow="Ruang kerja verifikator" title="Profil akun" />

<!--
	`min-w-0` pada kedua kolom bukan hiasan: butir grid berukuran minimum
	`min-content`, dan satu judul naskah yang dipotong `truncate` (karenanya
	`white-space: nowrap`) akan menarik lebar kolom melampaui 375 px sampai halaman
	menggulir mendatar. Nilai nol memulihkan haknya untuk menyusut.
-->
<div class="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
	<div class="min-w-0 space-y-4">
		<section class="card p-5" aria-labelledby="judul-identitas">
			<h2 id="judul-identitas" class="kicker">Identitas akun</h2>

			<div class="mt-3 flex items-center gap-3">
				<span
					class="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-chip bg-pertamina-navy-tint text-sm font-bold text-pertamina-navy"
					aria-hidden="true"
				>
					{akun?.initials ?? 'PF'}
				</span>
				<div class="min-w-0">
					<p class="truncate text-base font-bold text-heading">{session.displayName}</p>
					<p class="truncate text-sm text-ink-600">{akun?.email ?? '—'}</p>
				</div>
			</div>

			<dl class="mt-4 space-y-2.5 border-t border-ink-100 pt-4">
				<div class="flex items-baseline justify-between gap-3">
					<dt class="label-micro">Peran</dt>
					<dd class="text-sm font-semibold text-ink-800">{session.roleLabel}</dd>
				</div>
				<div class="flex items-baseline justify-between gap-3">
					<dt class="label-micro">Identitas akun</dt>
					<dd class="numeric text-sm text-ink-800">{akun?.id ?? '—'}</dd>
				</div>
				<div class="flex items-baseline justify-between gap-3">
					<dt class="label-micro">Unit</dt>
					<dd class="text-sm text-ink-800">{akun?.unit || '—'}</dd>
				</div>
				<div class="flex items-baseline justify-between gap-3">
					<dt class="label-micro">Status akun</dt>
					<dd class="text-sm text-ink-800">{akun?.status ?? '—'}</dd>
				</div>
				<div class="flex items-baseline justify-between gap-3">
					<dt class="label-micro">Masuk terakhir</dt>
					<dd class="text-sm text-ink-800">
						{akun?.lastLoginAt ? formatTanggal(akun.lastLoginAt, 'panjang') : 'Belum tercatat'}
					</dd>
				</div>
			</dl>
		</section>

		<section class="card p-5" aria-labelledby="judul-wewenang">
			<h2 id="judul-wewenang" class="kicker">Kewenangan peran</h2>
			<ul class="mt-3 space-y-2">
				{#each kewenangan as butir (butir.id)}
					<li class="flex items-start gap-2.5">
						<span
							class="mt-0.5 shrink-0 {butir.boleh ? 'text-success' : 'text-ink-400'}"
							aria-hidden="true"
						>
							<Icon path={butir.boleh ? ICONS.checkCircle : ICONS.xCircle} size={16} />
						</span>
						<span class="text-sm leading-snug text-ink-800">
							{butir.label}
							<span class="sr-only">{butir.boleh ? '— diizinkan' : '— tidak diizinkan'}</span>
						</span>
					</li>
				{/each}
			</ul>
			<p class="mt-3 text-xs leading-relaxed text-ink-600">
				Peran bukan hierarki. Admin tidak berwenang mengambil keputusan konten per record, dan
				verifikator tidak melihat mekanik skor — keduanya bukan kekurangan tampilan, melainkan
				pembagian kewenangan.
			</p>
		</section>

		<section class="card p-5" aria-labelledby="judul-kredensial">
			<h2 id="judul-kredensial" class="kicker">Kata sandi</h2>
			<p class="mt-2 text-sm leading-relaxed text-ink-600">
				Penggantian kata sandi belum tersedia dari konsol ini. Kredensial disimpan terpisah dari
				sesi, dan tidak pernah dibaca maupun ditulis oleh halaman. Ajukan penggantian lewat
				Corporate Secretary Pertamina Foundation.
			</p>
		</section>
	</div>

	<div class="min-w-0 space-y-4">
		<section class="card p-5" aria-labelledby="judul-riwayat-naskah">
			<h2 id="judul-riwayat-naskah" class="kicker">Naskah yang pernah Anda putuskan</h2>

			{#if naskahDiputuskan.length === 0}
				<div class="mt-3">
					<EmptyState
						title="Belum ada keputusan tercatat"
						message="Keputusan atas naskah akan muncul di sini beserta status akhirnya."
						iconPath={ICONS.book}
						size="sm"
					/>
				</div>
			{:else}
				<ul class="mt-3 space-y-2.5">
					{#each naskahDiputuskan as naskah (naskah.id)}
						<li class="flex flex-wrap items-center gap-2 border-b border-ink-100 pb-2.5 last:border-0">
							<a
								class="min-w-0 flex-1 truncate text-sm font-semibold text-ink-800 hover:text-pertamina-red-ink hover:underline"
								href="/verifikator/cerita/{naskah.id}"
							>
								{naskah.title}
							</a>
							<StatusBadge
								label={naskah.statusMeta.label}
								color={naskah.statusMeta.badgeColor}
								size="sm"
								variant="soft"
							/>
							<span class="text-xs text-ink-600">
								{naskah.reviewedAt ? formatTanggal(naskah.reviewedAt, 'pendek') : '—'}
							</span>
						</li>
					{/each}
				</ul>
			{/if}
		</section>

		<section class="card p-5" aria-labelledby="judul-riwayat-kegiatan">
			<h2 id="judul-riwayat-kegiatan" class="kicker">Usulan kegiatan yang pernah Anda putuskan</h2>

			{#if kegiatanDiputuskan.length === 0}
				<div class="mt-3">
					<EmptyState
						title="Belum ada keputusan kegiatan"
						message="Persetujuan dan penolakan usulan kegiatan akan tercatat di sini."
						iconPath={ICONS.calendar}
						size="sm"
					/>
				</div>
			{:else}
				<ul class="mt-3 space-y-2.5">
					{#each kegiatanDiputuskan as kegiatan (kegiatan.id)}
						<li class="flex flex-wrap items-center gap-2 border-b border-ink-100 pb-2.5 last:border-0">
							<span class="min-w-0 flex-1 truncate text-sm font-semibold text-ink-800">
								{kegiatan.title}
							</span>
							<StatusBadge
								label={kegiatan.statusMeta.label}
								color={kegiatan.statusMeta.badgeColor}
								size="sm"
								variant="soft"
							/>
							<span class="text-xs text-ink-600">
								{kegiatan.reviewedAt ? formatTanggal(kegiatan.reviewedAt, 'pendek') : '—'}
							</span>
						</li>
					{/each}
				</ul>
			{/if}
		</section>

		<section class="card p-5" aria-labelledby="judul-usulan-saya">
			<h2 id="judul-usulan-saya" class="kicker">Kegiatan yang Anda usulkan</h2>
			<p class="mt-1 text-xs leading-relaxed text-ink-600">
				Ditampilkan terpisah dari daftar keputusan di atas: atas usulan ini Anda pengusul, bukan
				pemutus.
			</p>

			{#if editorial.myEvents.length === 0}
				<div class="mt-3">
					<EmptyState
						title="Belum ada usulan"
						message="Usulan yang Anda kirim dari halaman Usulan Kegiatan akan tampil di sini."
						iconPath={ICONS.flag}
						size="sm"
					/>
				</div>
			{:else}
				<ul class="mt-3 space-y-2.5">
					{#each editorial.myEvents as usulan (usulan.id)}
						<li class="flex flex-wrap items-center gap-2 border-b border-ink-100 pb-2.5 last:border-0">
							<span class="min-w-0 flex-1 truncate text-sm font-semibold text-ink-800">
								{usulan.title}
							</span>
							<StatusBadge
								label={usulan.statusMeta.label}
								color={usulan.statusMeta.badgeColor}
								size="sm"
								variant="soft"
							/>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	</div>
</div>
