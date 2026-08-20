<script>
	/**
	 * HALAMAN: Kabar PFriends.
	 *
	 * Tanggung jawab: menampilkan seluruh diseminasi yang sudah dikirim ke
	 * komunitas, dan menunjukkan dengan jelas mana yang poinnya masih menunggu.
	 *
	 * Halaman ini adalah pintu masuk KPI Hal 6: "1–2 konten terdiseminasi per
	 * bulan", "diseminasi minimal 2 kali per bulan", dan "50% awardee melakukan
	 * amplifikasi". Karena itu penanda "belum diklaim" dibuat menonjol: yang
	 * hendak didorong bukan sekadar membuka daftar, melainkan menindaklanjuti
	 * kabarnya.
	 *
	 * Status "sudah dibaca" dibaca dari BUKU BESAR POIN, bukan dari penanda
	 * `openedBy` pada kabar. Keduanya bisa berbeda, dan yang ingin dijawab
	 * antarmuka ini adalah "masih adakah poin di sini": hanya buku besar yang
	 * mengetahuinya.
	 *
	 * @see docs/00-SOURCE-BRIEF.md: Hal 5 pilar 04, Hal 6 KPI diseminasi
	 * @see docs/12-BUILD-CONTRACT-V2.md: §2.14 /awardee/kabar
	 */
	import {
		Card,
		EmptyState,
		FilterChips,
		Icon,
		PageHeader,
		StatusBadge,
		ICONS
	} from '$lib/components';
	import { ActivityType, poinUntuk } from '$lib/domain/constants/scoring-table.js';
	import { catalog } from '$lib/stores/catalog.svelte.js';
	import { gamification } from '$lib/stores/gamification.svelte.js';
	import { formatAngka, formatRelatif, formatTanggal, frasaHitung } from '$lib/utils/format.js';

	/** Pilihan penyaring daftar kabar. */
	const SARINGAN = Object.freeze({
		SEMUA: 'SEMUA',
		BELUM: 'BELUM',
		SUDAH: 'SUDAH'
	});

	const poinBaca = poinUntuk(ActivityType.BROADCAST_VIEW);

	/** @type {string} */
	let saringan = $state(SARINGAN.SEMUA);

	/** Kabar yang poin bacanya sudah dibukukan awardee ini. */
	const sudahDiklaim = $derived(
		new Set(
			gamification.ledger
				.filter((entri) => entri.activityType === ActivityType.BROADCAST_VIEW)
				.map((entri) => entri.refId)
				.filter(Boolean)
		)
	);

	const kabarTerkirim = $derived(catalog.sentBroadcasts);

	const jumlahBelum = $derived(
		kabarTerkirim.filter((kabar) => !sudahDiklaim.has(kabar.id)).length
	);

	const pilihanSaringan = $derived([
		{ id: SARINGAN.SEMUA, label: 'Semua', count: kabarTerkirim.length },
		{ id: SARINGAN.BELUM, label: 'Belum dibaca', count: jumlahBelum },
		{ id: SARINGAN.SUDAH, label: 'Sudah dibaca', count: kabarTerkirim.length - jumlahBelum }
	]);

	const kabarTampil = $derived.by(() => {
		if (saringan === SARINGAN.BELUM) {
			return kabarTerkirim.filter((kabar) => !sudahDiklaim.has(kabar.id));
		}
		if (saringan === SARINGAN.SUDAH) {
			return kabarTerkirim.filter((kabar) => sudahDiklaim.has(kabar.id));
		}
		return kabarTerkirim;
	});

	/**
	 * Pesan kosong yang sesuai dengan penyaring yang sedang dipakai. Satu kalimat
	 * kosong untuk semua keadaan akan berbohong pada dua di antaranya.
	 * @returns {{judul: string, pesan: string}}
	 */
	const pesanKosong = $derived.by(() => {
		if (saringan === SARINGAN.BELUM) {
			return {
				judul: 'Semua kabar sudah kamu baca',
				pesan: 'Tidak ada poin baca yang tertinggal. Kabar berikutnya terbit Selasa pagi.'
			};
		}
		if (saringan === SARINGAN.SUDAH) {
			return {
				judul: 'Belum ada kabar yang dibaca',
				pesan: `Setiap kabar yang kamu tandai selesai dibaca memberi ${frasaHitung(poinBaca, 'poin')}.`
			};
		}
		return {
			judul: 'Belum ada kabar baru',
			pesan: 'Kabar mingguan PFriends terbit setiap Selasa pagi.'
		};
	});
</script>

<svelte:head>
	<title>Kabar PFriends · PFriends</title>
</svelte:head>

<PageHeader
	title="Kabar"
	subtitle="Informasi Pertamina dan Pertamina Foundation yang disebarkan ke komunitas."
	eyebrow="Diseminasi & Amplifikasi"
/>

{#if kabarTerkirim.length > 0}
	<div class="mb-4 flex flex-wrap items-center gap-3">
		<FilterChips options={pilihanSaringan} selected={saringan} onchange={(id) => (saringan = id)} />
	</div>

	{#if jumlahBelum > 0}
		<p
			class="mb-4 flex items-start gap-2 rounded-xl border border-warning/25 bg-warning-tint/60 p-3 text-sm text-ink-700"
		>
			<span class="mt-0.5 shrink-0 text-warning"><Icon path={ICONS.bolt} size={16} /></span>
			<span>
				<span class="font-semibold text-ink-900">
					{frasaHitung(jumlahBelum, 'kabar')} belum kamu tandai selesai dibaca.
				</span>
				Masing-masing menyimpan {frasaHitung(poinBaca, 'poin')} yang belum diambil.
			</span>
		</p>
	{/if}
{/if}

{#if kabarTampil.length === 0}
	<EmptyState
		title={pesanKosong.judul}
		message={pesanKosong.pesan}
		iconPath={ICONS.megaphone}
		actionLabel={saringan === SARINGAN.SEMUA ? '' : 'Tampilkan semua kabar'}
		onAction={saringan === SARINGAN.SEMUA ? undefined : () => (saringan = SARINGAN.SEMUA)}
	/>
{:else}
	<ul class="space-y-3">
		{#each kabarTampil as kabar (kabar.id)}
			{@const belum = !sudahDiklaim.has(kabar.id)}
			<li>
				<Card variant="interactive" padding="md" href="/awardee/kabar/{kabar.id}">
					<article class="flex gap-3 sm:gap-4">
						<span
							class="hidden h-[72px] w-[72px] shrink-0 items-center justify-center rounded-xl sm:inline-flex {belum
								? 'bg-pertamina-red-tint text-pertamina-red-ink'
								: 'bg-ink-100 text-ink-600'}"
							aria-hidden="true"
						>
							<Icon path={ICONS.megaphone} size={28} />
						</span>

						<div class="min-w-0 flex-1">
							<div class="flex flex-wrap items-center gap-2">
								{#if belum}
									<StatusBadge label="Belum dibaca" color="red" size="sm" withDot />
									<StatusBadge label="+{formatAngka(poinBaca)} poin" color="amber" size="sm" />
								{:else}
									<StatusBadge label="Sudah dibaca" color="green" size="sm" />
								{/if}
								<span class="label-micro">{kabar.channelLabel}</span>
							</div>

							<h2 class="mt-1.5 line-clamp-2 text-sm font-bold text-heading sm:text-base">
								{kabar.title}
							</h2>
							<p class="mt-1 line-clamp-2 text-xs leading-relaxed text-ink-600 sm:text-sm">
								{kabar.summary}
							</p>

							<div class="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-600">
								<span>{formatTanggal(kabar.sentAt, 'pendek')}</span>
								<span aria-hidden="true">·</span>
								<span>{formatRelatif(kabar.sentAt)}</span>
								{#if kabar.contentSource}
									<span aria-hidden="true">·</span>
									<span>{kabar.contentSource}</span>
								{/if}
							</div>
						</div>
					</article>
				</Card>
			</li>
		{/each}
	</ul>
{/if}
