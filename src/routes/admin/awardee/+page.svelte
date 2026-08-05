<script>
	/**
	 * HALAMAN — Kelola Anggota.
	 *
	 * Tanggung jawab: memberi pengelola satu tempat untuk mencari anggota,
	 * menyaringnya per komunitas / chapter / tier, dan menuntaskan validasi
	 * keanggotaan yang tertunda.
	 *
	 * Validasi keanggotaan bukan pekerjaan administratif biasa. M-01 hanya
	 * menghitung anggota yang berstatus aktif DAN ber-consent, sehingga setiap
	 * baris yang divalidasi di halaman ini langsung menggerakkan coverage 75%
	 * Hal 6. Karena itu tombolnya diberi konsekuensi yang terlihat, bukan sekadar
	 * mengubah label status.
	 *
	 * Catatan arsitektur. Pembaruan status ditulis lewat `awardeeRepository`
	 * langsung dari halaman karena kontrak store WP-4 belum memuat tindakan
	 * validasi keanggotaan (§5 hanya menyebut `admin.kpi`, `esgMatrix`,
	 * `moderationQueue`). Begitu store menyediakannya, pemanggilan di bawah
	 * berpindah ke sana tanpa mengubah tampilan — seluruh mutasi sudah terkumpul
	 * pada satu fungsi.
	 *
	 * @see docs/00-SOURCE-BRIEF.md — Hal 6 coverage 75%, Hal 7 validasi penerima manfaat
	 * @see docs/12-BUILD-CONTRACT-V2.md — §2.14 `/admin/awardee`
	 */
	import {
		Avatar,
		Button,
		Card,
		DataTable,
		FilterChips,
		Icon,
		Modal,
		PageHeader,
		SearchInput,
		StatTile,
		StatusBadge,
		TierBadge,
		ICONS
	} from '$lib/components';
	import { CHAPTERS, COMMUNITIES, AWARDEE_STATUS } from '$lib/domain/constants/community.js';
	import { TIER_TABLE } from '$lib/domain/constants/tier-table.js';
	import { awardeeRepository } from '$lib/infrastructure/repositories/index.js';
	import { admin } from '$lib/stores/admin.svelte.js';
	import { catalog } from '$lib/stores/catalog.svelte.js';
	import { toast, ToastType } from '$lib/stores/toast.svelte.js';
	import { formatAngka, formatPersen, formatTanggal } from '$lib/utils/format.js';

	/** Status yang masih menunggu keputusan pengelola. */
	const STATUS_PERLU_TINDAKAN = Object.freeze([
		AWARDEE_STATUS.TERDAFTAR,
		AWARDEE_STATUS.MENUNGGU_VERIFIKASI,
		AWARDEE_STATUS.PERLU_KLARIFIKASI
	]);

	let kataKunci = $state('');
	let filterKomunitas = $state('');
	let filterChapter = $state('');
	let filterTier = $state('');
	let hanyaPerluTindakan = $state(false);
	let sortKey = $state('points');
	let sortDir = $state('desc');

	/** @type {import('$lib/domain/entities/Awardee.js').Awardee|null} */
	let anggotaTerpilih = $state(null);

	/** @type {string|null} Id anggota yang sedang diproses. */
	let sedangDiproses = $state(null);

	const opsiKomunitas = $derived(
		COMMUNITIES.map((komunitas) => ({
			id: komunitas.id,
			label: komunitas.akronim,
			count: catalog.awardees.filter((m) => m.community === komunitas.id).length
		}))
	);

	const opsiChapter = $derived(
		CHAPTERS.map((chapter) => ({
			id: chapter.id,
			label: chapter.label,
			count: catalog.awardees.filter((m) => m.chapterId === chapter.id).length
		}))
	);

	const opsiTier = $derived(
		TIER_TABLE.map((tier) => ({
			id: tier.level,
			label: tier.label,
			count: catalog.awardees.filter((m) => m.tierLevel === tier.level).length
		}))
	);

	const perluTindakan = $derived(
		catalog.awardees.filter((awardee) => STATUS_PERLU_TINDAKAN.includes(awardee.status))
	);

	const tanpaConsent = $derived(catalog.awardees.filter((awardee) => !awardee.consentActive));

	const coverage = $derived(admin.kpi.find((baris) => baris.id === 'M-01') ?? null);

	/** Penyaringan berlapis; pencarian menyentuh nama, surel, kampus, kota, dan okupasi. */
	const tersaring = $derived.by(() => {
		const kunci = kataKunci.trim().toLowerCase();

		return catalog.awardees.filter((awardee) => {
			if (filterKomunitas && awardee.community !== filterKomunitas) return false;
			if (filterChapter && awardee.chapterId !== filterChapter) return false;
			if (filterTier && awardee.tierLevel !== filterTier) return false;
			if (hanyaPerluTindakan && !STATUS_PERLU_TINDAKAN.includes(awardee.status)) return false;
			if (kunci === '') return true;

			return [
				awardee.fullName,
				awardee.email,
				awardee.university,
				awardee.city,
				awardee.occupation,
				awardee.chapterId
			]
				.filter(Boolean)
				.some((bidang) => String(bidang).toLowerCase().includes(kunci));
		});
	});

	/** Baris tabel; entity ikut dibawa agar sel dapat merender komponen domain. */
	const baris = $derived.by(() => {
		const arah = sortDir === 'asc' ? 1 : -1;

		/** @param {any} row */
		const nilaiUrut = (row) => {
			if (sortKey === 'points') return row.awardee.points;
			if (sortKey === 'anggota') return row.awardee.fullName.toLowerCase();
			if (sortKey === 'chapter') return row.awardee.chapterId;
			if (sortKey === 'status') return row.awardee.statusMeta.label;
			return row.awardee.fullName.toLowerCase();
		};

		return tersaring
			.map((awardee) => ({ id: awardee.id, awardee }))
			.sort((a, b) => {
				const kiri = nilaiUrut(a);
				const kanan = nilaiUrut(b);
				if (kiri === kanan) return a.awardee.fullName.localeCompare(b.awardee.fullName);
				return kiri > kanan ? arah : -arah;
			});
	});

	const KOLOM = Object.freeze([
		{ key: 'anggota', label: 'Anggota', sortable: true },
		{ key: 'komunitas', label: 'Komunitas' },
		{ key: 'chapter', label: 'Chapter', sortable: true },
		{ key: 'tier', label: 'Tier' },
		{ key: 'points', label: 'Poin', numeric: true, sortable: true },
		{ key: 'status', label: 'Status', sortable: true },
		{ key: 'consent', label: 'Consent' },
		{ key: 'aksi', label: 'Validasi', align: 'right' }
	]);

	/** @param {import('$lib/domain/entities/Awardee.js').Awardee} awardee */
	const bisaDivalidasi = (awardee) => STATUS_PERLU_TINDAKAN.includes(awardee.status);

	function bersihkanFilter() {
		kataKunci = '';
		filterKomunitas = '';
		filterChapter = '';
		filterTier = '';
		hanyaPerluTindakan = false;
	}

	/**
	 * Menetapkan status keanggotaan baru dan menyegarkan seluruh potret konsol.
	 *
	 * Titik tunggal untuk seluruh mutasi anggota di halaman ini. Penyegaran
	 * katalog dan KPI dijalankan bersamaan karena keduanya membaca tabel yang sama:
	 * membiarkan salah satunya basi membuat kartu coverage tidak cocok dengan
	 * tabel di bawahnya, dan pembaca akan mempercayai yang salah.
	 *
	 * @param {import('$lib/domain/entities/Awardee.js').Awardee} awardee
	 * @param {string} status Salah satu AWARDEE_STATUS.
	 * @param {{title: string, message: string, type?: string}} kabar
	 * @returns {Promise<void>}
	 */
	async function ubahStatus(awardee, status, kabar) {
		sedangDiproses = awardee.id;
		try {
			await awardeeRepository.update(awardee.id, { status });
			await Promise.all([catalog.refresh(), admin.refresh()]);
			anggotaTerpilih = null;
			toast.push({ type: kabar.type ?? ToastType.SUCCESS, title: kabar.title, message: kabar.message });
		} catch (penyebab) {
			toast.push({
				type: ToastType.ERROR,
				title: 'Perubahan status gagal disimpan',
				message:
					penyebab instanceof Error
						? penyebab.message
						: 'Basis data peramban menolak pembaruan. Muat ulang halaman lalu coba lagi.'
			});
		} finally {
			sedangDiproses = null;
		}
	}

	/** @param {import('$lib/domain/entities/Awardee.js').Awardee} awardee */
	const validasi = (awardee) =>
		ubahStatus(awardee, AWARDEE_STATUS.AKTIF, {
			title: 'Keanggotaan tervalidasi',
			message: `${awardee.fullName} kini berstatus aktif dan ikut terhitung pada coverage registrasi.`
		});

	/** @param {import('$lib/domain/entities/Awardee.js').Awardee} awardee */
	const mintaKlarifikasi = (awardee) =>
		ubahStatus(awardee, AWARDEE_STATUS.PERLU_KLARIFIKASI, {
			type: ToastType.INFO,
			title: 'Ditandai perlu klarifikasi',
			message: `Data ${awardee.fullName} perlu dicocokkan ulang dengan registry penerima manfaat.`
		});
</script>

<PageHeader
	eyebrow="Kelola Anggota"
	title="Registry anggota Pfriends"
	subtitle="Pencocokan data penerima manfaat PFprestasi dan PFpreneur sesuai milestone Januari 2026. Hanya anggota berstatus aktif dan ber-consent yang dihitung pada coverage registrasi Hal 6."
>
	{#snippet actions()}
		<Button variant="secondary" size="sm" iconPath={ICONS.chart} href="/admin">Dasbor KPI</Button>
	{/snippet}
</PageHeader>

<div class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
	<StatTile
		label="Total terdata"
		value={catalog.awardees.length}
		unit="anggota"
		hint="Seluruh baris registry Pfriends"
		iconPath={ICONS.users}
		color="var(--color-pertamina-blue)"
	/>
	<StatTile
		label="Coverage registrasi"
		value={coverage ? `${formatPersen(coverage.actual)}` : '—'}
		hint={coverage
			? `${formatAngka(coverage.numerator)} dari ${formatAngka(coverage.denominator)} · target ${coverage.target}%`
			: 'Menunggu perhitungan M-01'}
		iconPath={ICONS.shield}
		color="var(--color-pertamina-navy)"
	/>
	<StatTile
		label="Menunggu validasi"
		value={perluTindakan.length}
		unit="anggota"
		hint="Terdaftar, menunggu verifikasi, atau perlu klarifikasi"
		iconPath={ICONS.userPlus}
		color="var(--color-tier-champion)"
	/>
	<StatTile
		label="Tanpa consent aktif"
		value={tanpaConsent.length}
		unit="anggota"
		hint="Tidak dihitung pada coverage meski berstatus aktif"
		iconPath={ICONS.lock}
		color="var(--color-pertamina-red)"
	/>
</div>

<Card class="mb-4" padding="sm">
	<div class="space-y-3">
		<div class="flex flex-col gap-3 sm:flex-row sm:items-center">
			<div class="min-w-0 flex-1">
				<SearchInput
					bind:value={kataKunci}
					label="Cari anggota"
					placeholder="Cari nama, surel, kampus, kota, atau okupasi"
				/>
			</div>
			<div class="flex shrink-0 flex-wrap gap-2">
				<Button
					variant={hanyaPerluTindakan ? 'primary' : 'secondary'}
					size="sm"
					iconPath={ICONS.filter}
					onclick={() => (hanyaPerluTindakan = !hanyaPerluTindakan)}
				>
					Perlu tindakan ({perluTindakan.length})
				</Button>
				<Button variant="ghost" size="sm" iconPath={ICONS.refresh} onclick={bersihkanFilter}>
					Reset
				</Button>
			</div>
		</div>

		<div class="space-y-2">
			<FilterChips
				label="Filter komunitas"
				options={opsiKomunitas}
				bind:selected={filterKomunitas}
				showClear={false}
			/>
			<FilterChips
				label="Filter chapter"
				options={opsiChapter}
				bind:selected={filterChapter}
				showClear={false}
			/>
			<FilterChips
				label="Filter tier"
				options={opsiTier}
				bind:selected={filterTier}
				showClear={false}
			/>
		</div>
	</div>
</Card>

<p class="mb-2 text-xs text-ink-500">
	Menampilkan <span class="numeric font-semibold text-ink-700">{formatAngka(baris.length)}</span>
	dari {formatAngka(catalog.awardees.length)} anggota terdata.
</p>

<DataTable
	columns={KOLOM}
	rows={baris}
	bind:sortKey
	bind:sortDir
	loading={catalog.loading && catalog.awardees.length === 0}
	caption="Daftar anggota Pfriends beserta komunitas, chapter, tier, poin, status keanggotaan, dan status consent"
	empty="Tidak ada anggota yang cocok dengan penyaring ini. Longgarkan filter atau kosongkan kata kunci pencarian."
	onRowClick={(row) => (anggotaTerpilih = row.awardee)}
>
	{#snippet cell(row, kolom)}
		{@const awardee = row.awardee}

		{#if kolom.key === 'anggota'}
			<div class="flex items-center gap-2.5">
				<Avatar name={awardee.fullName} size="sm" tier={awardee.tierLevel} showRing />
				<span class="min-w-0">
					<span class="block truncate font-semibold text-ink-900">{awardee.fullName}</span>
					<span class="block truncate text-xs text-ink-500">{awardee.email}</span>
				</span>
			</div>
		{:else if kolom.key === 'komunitas'}
			<span class="whitespace-nowrap">{awardee.communityDef?.akronim ?? '—'}</span>
		{:else if kolom.key === 'chapter'}
			<span class="whitespace-nowrap">{awardee.chapterDef?.label ?? awardee.chapterId}</span>
		{:else if kolom.key === 'tier'}
			<TierBadge tier={awardee.tierLevel} size="sm" />
		{:else if kolom.key === 'points'}
			{formatAngka(awardee.points)}
		{:else if kolom.key === 'status'}
			<StatusBadge
				label={awardee.statusMeta.label}
				color={awardee.statusMeta.badgeColor}
				size="sm"
				withDot
				title={awardee.statusMeta.deskripsi}
			/>
		{:else if kolom.key === 'consent'}
			{#if awardee.consentActive}
				<StatusBadge label="Aktif" color="green" size="sm" iconPath={ICONS.checkCircle} />
			{:else}
				<StatusBadge label="Belum ada" color="slate" size="sm" iconPath={ICONS.xCircle} />
			{/if}
		{:else if kolom.key === 'aksi'}
			{#if bisaDivalidasi(awardee)}
				<div class="flex justify-end gap-1.5">
					<Button
						variant="primary"
						size="sm"
						iconPath={ICONS.check}
						loading={sedangDiproses === awardee.id}
						onclick={(e) => {
							e.stopPropagation();
							validasi(awardee);
						}}
					>
						Validasi
					</Button>
					{#if awardee.status !== AWARDEE_STATUS.PERLU_KLARIFIKASI}
						<Button
							variant="secondary"
							size="sm"
							ariaLabel="Tandai {awardee.fullName} perlu klarifikasi"
							iconPath={ICONS.warning}
							onclick={(e) => {
								e.stopPropagation();
								mintaKlarifikasi(awardee);
							}}
						/>
					{/if}
				</div>
			{:else}
				<span class="text-xs text-ink-400">Tidak ada tindakan tertunda</span>
			{/if}
		{:else}
			—
		{/if}
	{/snippet}
</DataTable>

<Modal
	open={anggotaTerpilih !== null}
	title={anggotaTerpilih?.fullName ?? 'Detail anggota'}
	size="lg"
	onclose={() => (anggotaTerpilih = null)}
>
	{#if anggotaTerpilih}
		{@const awardee = anggotaTerpilih}
		<div class="space-y-4">
			<div class="flex flex-wrap items-center gap-3">
				<Avatar name={awardee.fullName} size="lg" tier={awardee.tierLevel} showRing />
				<div class="min-w-0">
					<p class="text-base font-bold text-heading">{awardee.fullName}</p>
					<p class="text-sm text-ink-600">{awardee.occupation || 'Okupasi belum diisi'}</p>
					<div class="mt-1.5 flex flex-wrap gap-1.5">
						<TierBadge tier={awardee.tierLevel} size="sm" points={awardee.points} />
						<StatusBadge
							label={awardee.statusMeta.label}
							color={awardee.statusMeta.badgeColor}
							size="sm"
							withDot
						/>
					</div>
				</div>
			</div>

			<dl class="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
				{#each [{ label: 'Identitas anggota', value: awardee.id }, { label: 'Surel', value: awardee.email }, { label: 'Komunitas', value: awardee.communityDef?.nama ?? awardee.community }, { label: 'Chapter', value: awardee.chapterDef?.label ?? awardee.chapterId }, { label: 'Kampus asal', value: awardee.university || 'Tidak dicantumkan' }, { label: 'Kota domisili', value: awardee.city || 'Tidak dicantumkan' }, { label: 'Tahun lulus', value: awardee.graduationYear ? String(awardee.graduationYear) : 'Tidak dicantumkan' }, { label: 'Bergabung', value: formatTanggal(awardee.joinedAt) }] as baris (baris.label)}
					<div class="min-w-0">
						<dt class="label-micro">{baris.label}</dt>
						<dd class="mt-0.5 truncate text-sm text-ink-800" title={baris.value}>{baris.value}</dd>
					</div>
				{/each}
			</dl>

			<div
				class="rounded-card border p-3 {awardee.consentActive
					? 'border-pertamina-green/25 bg-pertamina-green-tint/40'
					: 'border-warning/25 bg-warning-tint/40'}"
			>
				<p class="flex items-center gap-2 text-sm font-semibold text-heading">
					<Icon path={awardee.consentActive ? ICONS.checkCircle : ICONS.warning} size={16} />
					{awardee.consentActive ? 'Persetujuan data aktif' : 'Belum ada persetujuan data aktif'}
				</p>
				<p class="mt-1 text-xs leading-relaxed text-ink-600">
					{awardee.consentActive
						? 'Anggota ini dihitung pada coverage registrasi dan datanya boleh diolah untuk pelaporan internal Pertamina Foundation.'
						: 'Tanpa consent aktif, anggota ini tidak dihitung pada coverage registrasi M-01 meski statusnya aktif. Consent tidak dapat diberikan oleh pengelola — hanya oleh anggota sendiri lewat halaman profilnya.'}
				</p>
			</div>

			{#if awardee.bio}
				<div>
					<p class="label-micro">Profil singkat</p>
					<p class="mt-1 text-sm leading-relaxed text-ink-700">{awardee.bio}</p>
				</div>
			{/if}
		</div>
	{/if}

	{#snippet footer()}
		{#if anggotaTerpilih && bisaDivalidasi(anggotaTerpilih)}
			<Button variant="secondary" onclick={() => mintaKlarifikasi(anggotaTerpilih)}>
				Perlu klarifikasi
			</Button>
			<Button
				variant="primary"
				iconPath={ICONS.check}
				loading={sedangDiproses === anggotaTerpilih.id}
				onclick={() => validasi(anggotaTerpilih)}
			>
				Validasi keanggotaan
			</Button>
		{:else}
			<Button variant="secondary" onclick={() => (anggotaTerpilih = null)}>Tutup</Button>
		{/if}
	{/snippet}
</Modal>
