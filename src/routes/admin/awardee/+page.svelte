<script>
	/**
	 * HALAMAN — Kontrol Akun.
	 *
	 * Tanggung jawab: satu daftar berisi SELURUH akun PFfriends — awardee,
	 * verifikator, dan admin — beserta satu tindakan yang hanya boleh dimiliki
	 * konsol ini: berpindah sesi ke akun mana pun untuk keperluan peragaan.
	 *
	 * ── Tiga keputusan yang tidak terbaca dari kode ──────────────────────────
	 *
	 * 1. **Sumbernya `accounts`, bukan `awardees`.** Versi sebelumnya hanya
	 *    menampilkan enam puluh baris registry penerima manfaat, sehingga dua
	 *    verifikator dan satu admin tidak terlihat di mana pun dalam aplikasi.
	 *    Halaman yang bernama "Kontrol Akun" tetapi tidak dapat menampilkan akun
	 *    yang sedang dipakai membukanya adalah daftar yang tidak lengkap menurut
	 *    definisinya sendiri.
	 * 2. **Perpindahan sesi berjalan lewat `session.login()`, bukan lewat
	 *    penulisan peran langsung ke store.** Menyetel `session.role` dari
	 *    halaman akan melewati `AuthService` — dan bersamanya melewati
	 *    pemeriksaan akun nonaktif, pemuatan entity awardee, serta pencatatan
	 *    waktu masuk terakhir. Sesi hasil jalan pintas itu tampak benar di layar
	 *    dan salah di setiap tempat yang membacanya. Kata sandi demo seragam
	 *    (`SANDI_DEMO`) memang membuat jalur resminya tetap murah.
	 * 3. **Tujuan pengalihan diminta dari `session.homePath()`, bukan ditebak
	 *    dari peran di sini.** Peta peran → beranda hidup di `AccessPolicy`;
	 *    menyalinnya ke halaman ini melahirkan peta kedua yang cepat berbeda
	 *    pendapat dengan `ZoneGuard` — dan pengguna akan terlempar bolak-balik di
	 *    antara keduanya.
	 *
	 * Halaman ini TIDAK menyunting akun. Menonaktifkan, mengubah peran, dan
	 * menyetel ulang sandi adalah tindakan bertanda tangan yang menuntut jejak
	 * audit; menaruh tombolnya di mockup akan menjanjikan kemampuan yang belum
	 * ada penampungnya.
	 *
	 * @see src/lib/stores/session.svelte.js — kontrak sesi dan hidrasi
	 * @see src/lib/domain/services/AuthService.js — satu-satunya gerbang kredensial
	 */
	import { goto } from '$app/navigation';
	import {
		Avatar,
		Button,
		Card,
		DataTable,
		FilterChips,
		Icon,
		PageHeader,
		SearchInput,
		StatTile,
		StatusBadge,
		ICONS
	} from '$lib/components';
	import { ACCOUNT_STATUS_META } from '$lib/domain/entities/UserAccount.js';
	import { UserRole, USER_ROLE_META } from '$lib/domain/constants/roles.js';
	import { accountRepository } from '$lib/infrastructure/repositories/index.js';
	import { SANDI_DEMO } from '$lib/infrastructure/seed/accounts.js';
	import { bootstrapDatabase } from '$lib/infrastructure/seed/bootstrap.js';
	import { catalog } from '$lib/stores/catalog.svelte.js';
	import { session } from '$lib/stores/session.svelte.js';
	import { toast, ToastType } from '$lib/stores/toast.svelte.js';
	import { formatAngka, formatRelatif } from '$lib/utils/format.js';

	/** Warna lencana tiap peran; sekadar penanda visual, bukan kewenangan. */
	const WARNA_PERAN = Object.freeze({
		[UserRole.AWARDEE]: 'blue',
		[UserRole.VERIFIER]: 'green',
		[UserRole.ADMIN]: 'navy'
	});

	/** @type {import('$lib/domain/entities/UserAccount.js').UserAccount[]} */
	let akun = $state.raw([]);
	let memuat = $state(true);

	let kataKunci = $state('');
	let filterPeran = $state('');
	let sortKey = $state('nama');
	let sortDir = $state('asc');

	/** @type {string|null} Id akun yang sedang dipindahi sesinya. */
	let sedangMasuk = $state(null);

	$effect(() => {
		let dibatalkan = false;

		(async () => {
			try {
				await bootstrapDatabase();
				const baris = await accountRepository.getAll();
				if (!dibatalkan) akun = baris;
			} finally {
				if (!dibatalkan) memuat = false;
			}
		})();

		return () => {
			dibatalkan = true;
		};
	});

	/** Entity awardee dipetakan sekali; tabel membacanya per baris. */
	const awardeeById = $derived(new Map(catalog.awardees.map((awardee) => [awardee.id, awardee])));

	const cacahPeran = $derived(
		Object.values(UserRole).map((peran) => ({
			id: peran,
			label: USER_ROLE_META[peran]?.label ?? peran,
			count: akun.filter((baris) => baris.role === peran).length
		}))
	);

	const akunAktif = $derived(akun.filter((baris) => baris.isActive).length);

	const stafPf = $derived(akun.filter((baris) => !baris.isAwardee).length);

	const pernahMasuk = $derived(akun.filter((baris) => baris.lastLoginAt !== null).length);

	/**
	 * Baris tabel. Entity akun ikut dibawa supaya sel dapat merender komponen
	 * domain tanpa menyalin propertinya satu per satu ke objek datar.
	 */
	const baris = $derived.by(() => {
		const kunci = kataKunci.trim().toLowerCase();

		const tersaring = akun.filter((baris) => {
			if (filterPeran && baris.role !== filterPeran) return false;
			if (kunci === '') return true;

			const awardee = baris.awardeeId ? awardeeById.get(baris.awardeeId) : null;
			return [
				baris.displayName,
				baris.email,
				baris.id,
				baris.unit,
				baris.roleLabel,
				awardee?.chapterId,
				awardee?.city
			]
				.filter(Boolean)
				.some((bidang) => String(bidang).toLowerCase().includes(kunci));
		});

		const arah = sortDir === 'asc' ? 1 : -1;

		/** @param {any} row */
		const nilaiUrut = (row) => {
			if (sortKey === 'peran') return row.akun.roleLabel.toLowerCase();
			if (sortKey === 'status') return row.akun.status;
			if (sortKey === 'masuk') return row.akun.lastLoginAt?.getTime() ?? 0;
			return row.akun.displayName.toLowerCase();
		};

		return tersaring
			.map((entity) => ({
				id: entity.id,
				akun: entity,
				awardee: entity.awardeeId ? (awardeeById.get(entity.awardeeId) ?? null) : null
			}))
			.sort((a, b) => {
				const kiri = nilaiUrut(a);
				const kanan = nilaiUrut(b);
				if (kiri === kanan) return a.akun.displayName.localeCompare(b.akun.displayName);
				return kiri > kanan ? arah : -arah;
			});
	});

	const KOLOM = Object.freeze([
		{ key: 'nama', label: 'Akun', sortable: true },
		{ key: 'peran', label: 'Peran', sortable: true },
		{ key: 'konteks', label: 'Penempatan' },
		{ key: 'status', label: 'Status akun', sortable: true },
		{ key: 'masuk', label: 'Masuk terakhir', sortable: true },
		{ key: 'aksi', label: 'Sesi', align: 'right' }
	]);

	function bersihkanFilter() {
		kataKunci = '';
		filterPeran = '';
	}

	/**
	 * Berpindah sesi ke sebuah akun, lalu membuka zona miliknya.
	 *
	 * Memakai jalur masuk yang sama persis dengan halaman `/masuk`: sandi demo
	 * seragam diperiksa `AuthService`, akun nonaktif ditolak dengan pesannya
	 * sendiri, dan entity awardee ikut dimuat. Tidak ada jalan pintas — lihat
	 * butir 2 pada catatan berkas.
	 *
	 * @param {import('$lib/domain/entities/UserAccount.js').UserAccount} entity
	 * @returns {Promise<void>}
	 */
	async function masukSebagai(entity) {
		sedangMasuk = entity.id;
		try {
			const hasil = await session.login(entity.email, SANDI_DEMO);
			if (!hasil.success) {
				toast.error('Perpindahan sesi ditolak', hasil.error);
				return;
			}

			toast.push({
				type: ToastType.SUCCESS,
				title: `Kini masuk sebagai ${entity.displayName}`,
				message: `Sesi berpindah ke peran ${entity.roleLabel}. Keluar dari zona itu untuk kembali ke konsol admin.`
			});
			await goto(session.homePath());
		} finally {
			sedangMasuk = null;
		}
	}
</script>

<PageHeader
	eyebrow="Konsol Corporate Secretary"
	title="Kontrol Akun"
	subtitle="Seluruh akun PFfriends dalam satu daftar — awardee, verifikator, dan admin. Tombol “Masuk sebagai” memindahkan sesi ke akun terpilih dan membuka zonanya, supaya setiap peran dapat diperagakan tanpa perlu keluar-masuk halaman login."
/>

<div class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
	<StatTile
		label="Total akun"
		value={akun.length}
		unit="akun"
		hint="Seluruh baris tabel identitas login"
		iconPath={ICONS.users}
		color="var(--color-pertamina-blue)"
	/>
	<StatTile
		label="Akun aktif"
		value={akunAktif}
		unit="akun"
		hint="Berstatus aktif dan dapat masuk"
		iconPath={ICONS.checkCircle}
		color="var(--color-pertamina-green)"
	/>
	<StatTile
		label="Staf Pertamina Foundation"
		value={stafPf}
		unit="akun"
		hint="Verifikator dan admin; tidak terhitung sebagai penerima manfaat"
		iconPath={ICONS.shield}
		color="var(--color-pertamina-navy)"
	/>
	<StatTile
		label="Pernah masuk"
		value={pernahMasuk}
		unit="akun"
		hint="Sisanya belum pernah membuka microsite sama sekali"
		iconPath={ICONS.clock}
		color="var(--color-tier-champion)"
	/>
</div>

<Card class="mb-4" padding="sm">
	<div class="space-y-3">
		<div class="flex flex-col gap-3 sm:flex-row sm:items-center">
			<div class="min-w-0 flex-1">
				<SearchInput
					bind:value={kataKunci}
					label="Cari akun"
					placeholder="Cari nama, surel, identitas akun, unit kerja, atau chapter"
				/>
			</div>
			<Button
				variant="ghost"
				size="sm"
				iconPath={ICONS.refresh}
				class="shrink-0"
				onclick={bersihkanFilter}
			>
				Reset
			</Button>
		</div>

		<FilterChips
			label="Saring peran"
			options={cacahPeran}
			bind:selected={filterPeran}
			showClear={false}
		/>
	</div>
</Card>

<p class="mb-2 text-xs text-ink-500">
	Menampilkan <span class="numeric font-semibold text-ink-700">{formatAngka(baris.length)}</span>
	dari {formatAngka(akun.length)} akun terdaftar.
</p>

<DataTable
	columns={KOLOM}
	rows={baris}
	bind:sortKey
	bind:sortDir
	loading={memuat && akun.length === 0}
	caption="Daftar seluruh akun PFfriends beserta peran, penempatan, status akun, waktu masuk terakhir, dan tombol perpindahan sesi"
	empty="Tidak ada akun yang cocok dengan penyaring ini. Longgarkan saringan peran atau kosongkan kata kunci pencarian."
>
	{#snippet cell(row, kolom)}
		{@const entity = row.akun}

		{#if kolom.key === 'nama'}
			<div class="flex items-center gap-2.5">
				<Avatar name={entity.displayName} size="sm" tier={row.awardee?.tierLevel ?? ''} showRing />
				<span class="min-w-0">
					<span class="block truncate font-semibold text-ink-900">{entity.displayName}</span>
					<span class="block truncate text-xs text-ink-500">{entity.email}</span>
				</span>
			</div>
		{:else if kolom.key === 'peran'}
			<StatusBadge
				label={entity.roleLabel}
				color={WARNA_PERAN[entity.role] ?? 'slate'}
				size="sm"
				withDot
			/>
		{:else if kolom.key === 'konteks'}
			{#if row.awardee}
				<span class="block min-w-0">
					<span class="block truncate text-sm text-ink-800">
						{row.awardee.chapterDef?.label ?? row.awardee.chapterId}
					</span>
					<span class="block truncate text-xs text-ink-500">
						{row.awardee.communityDef?.akronim ?? row.awardee.community}
					</span>
				</span>
			{:else}
				<span class="block truncate text-sm text-ink-800">{entity.unit || 'Pertamina Foundation'}</span>
			{/if}
		{:else if kolom.key === 'status'}
			<StatusBadge
				label={ACCOUNT_STATUS_META[entity.status]?.label ?? entity.status}
				color={ACCOUNT_STATUS_META[entity.status]?.badgeColor ?? 'slate'}
				size="sm"
				withDot
				title={ACCOUNT_STATUS_META[entity.status]?.deskripsi ?? ''}
			/>
		{:else if kolom.key === 'masuk'}
			{#if entity.lastLoginAt}
				<span class="whitespace-nowrap text-sm text-ink-700">{formatRelatif(entity.lastLoginAt)}</span>
			{:else}
				<span class="text-xs text-ink-400">Belum pernah</span>
			{/if}
		{:else if kolom.key === 'aksi'}
			<div class="flex justify-end">
				{#if session.accountId === entity.id}
					<span class="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700">
						<Icon path={ICONS.checkCircle} size={14} />
						Sesi berjalan
					</span>
				{:else if !entity.isActive}
					<span class="text-xs text-ink-400">Akun nonaktif</span>
				{:else}
					<Button
						variant="secondary"
						size="sm"
						iconPath={ICONS.logout}
						loading={sedangMasuk === entity.id}
						onclick={() => masukSebagai(entity)}
					>
						Masuk sebagai
					</Button>
				{/if}
			</div>
		{:else}
			—
		{/if}
	{/snippet}
</DataTable>

<div class="card mt-4 p-4">
	<p class="flex items-center gap-2 text-sm font-semibold text-heading">
		<Icon path={ICONS.info} size={16} />
		Tentang perpindahan sesi
	</p>
	<p class="mt-1.5 text-xs leading-relaxed text-ink-600">
		Perpindahan memakai jalur masuk yang sama dengan halaman login: kredensial tetap diperiksa, akun
		nonaktif tetap ditolak, dan waktu masuk terakhir tetap tercatat. Seluruh akun peragaan memakai
		satu kata sandi yang sama. Setelah berpindah, sesi admin ini berakhir — kembali ke konsol dengan
		keluar dari zona tujuan lalu masuk kembali sebagai Admin PF.
	</p>
</div>
