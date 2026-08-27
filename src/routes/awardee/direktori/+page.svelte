<script>
	/**
	 * HALAMAN: Jejaring Komunitas (`/awardee/direktori`).
	 *
	 * Labelnya "Jejaring", routenya tetap `/direktori`: mengganti route hanya demi
	 * kecocokan label akan menyentuh tautan silang di forum, profil, dan seed
	 * sekaligus: lihat catatan yang sama pada `data/navigation.js`.
	 *
	 * Pilar 01 Hal 5 dan inti Strategic Initiative Hal 4: mempertemukan **alumni
	 * Beasiswa Sobat Bumi sebagai mitra muda/mentor** dengan **PFpreneur sebagai
	 * mitra sekaligus entitas bisnis binaan**.
	 *
	 * Halaman inilah jembatan yang dimaksud Hal 2. Fragmentasi alumni dan isolasi
	 * womenpreneur adalah dua masalah yang saling menjadi jawaban: alumni punya
	 * keahlian digital dan riset pasar yang tidak tersalurkan, womenpreneur punya
	 * usaha yang tertahan justru karena kekurangan itu. Karena itu penyaring
	 * komunitas berdiri paling depan, dan panel penghubung lintas komunitas selalu
	 * mengarahkan awardee ke komunitas SEBERANG, bukan ke komunitasnya sendiri.
	 *
	 * Batas privasi yang dijaga: nomor WhatsApp dan surel pribadi tidak pernah
	 * ditampilkan, sekalipun tersimpan pada entity. Direktori mempertemukan orang
	 * lewat kanal resmi komunitas, bukan dengan membocorkan kontak pribadinya.
	 *
	 * @see docs/00-SOURCE-BRIEF.md: Hal 2 Background, Hal 4 Strategic Initiative
	 * @see docs/07-UX-SITEMAP.md: §4.2 Direktori, NFR-017 kontak pribadi
	 */

	import { onMount } from 'svelte';
	import {
		Avatar,
		Button,
		Card,
		EmptyState,
		FilterChips,
		Icon,
		ICONS,
		AwardeeCard,
		Modal,
		PageHeader,
		SearchInput,
		StatTile,
		StatusBadge,
		TierBadge
	} from '$lib/components';
	import { CHAPTERS, COMMUNITIES, CommunityType } from '$lib/domain/constants/community.js';
	import { directory } from '$lib/stores/directory.svelte.js';
	import { session } from '$lib/stores/session.svelte.js';
	import { formatAngka } from '$lib/utils/format.js';

	/** Nilai pil filter untuk "tanpa penyaringan". */
	const SEMUA = 'SEMUA';

	/** Jumlah kartu yang ditampilkan sebelum awardee meminta lebih. Murni tata letak. */
	const UKURAN_HALAMAN = 12;

	/** @type {string} */
	let kueri = $state('');

	/** @type {string} */
	let komunitas = $state(SEMUA);

	/** @type {string} */
	let chapterId = $state(SEMUA);

	/** @type {string} */
	let kota = $state(SEMUA);

	/** @type {string} */
	let keahlian = $state(SEMUA);

	/** @type {boolean} */
	let hanyaMentor = $state(false);

	/** @type {number} */
	let batas = $state(UKURAN_HALAMAN);

	/** @type {import('$lib/domain/entities/Awardee.js').Awardee|null} */
	let anggotaDipilih = $state.raw(null);

	const saya = $derived(session.awardee);

	/** Direktori hanya memuat awardee berstatus aktif. */
	const anggotaAktif = $derived(directory.items);

	const opsiKomunitas = [
		{ id: SEMUA, label: 'Semua komunitas' },
		...COMMUNITIES.map((entri) => ({ id: entri.id, label: entri.akronim }))
	];

	const opsiChapter = [
		{ id: SEMUA, label: 'Semua chapter' },
		...CHAPTERS.map((entri) => ({ id: entri.id, label: entri.label }))
	];

	/** Daftar kota yang benar-benar ada di direktori, bukan daftar tetap yang bisa kosong. */
	const opsiKota = $derived(directory.facets.cities);

	const opsiKeahlian = $derived(directory.facets.skills);

	const hasil = $derived(directory.items);
	const tampil = $derived(directory.items);

	const jumlahSobi = $derived(directory.stats.sobi);

	const jumlahWomenpreneur = $derived(directory.stats.womenpreneur);

	const mentorSobi = $derived(directory.stats.mentors);

	const adaPenyaringAktif = $derived(
		kueri.trim() !== '' ||
			komunitas !== SEMUA ||
			chapterId !== SEMUA ||
			kota !== SEMUA ||
			keahlian !== SEMUA ||
			hanyaMentor
	);

	onMount(async () => {
		if (!session.ready) await session.hydrate();
	});

	let timerPencarian;
	$effect(() => {
		const query = {
			search: kueri.trim(), community: komunitas === SEMUA ? '' : komunitas,
			chapter: chapterId === SEMUA ? '' : chapterId, city: kota === SEMUA ? '' : kota,
			skill: keahlian === SEMUA ? '' : keahlian, mentor: hanyaMentor
		};
		clearTimeout(timerPencarian);
		timerPencarian = setTimeout(() => void directory.load(query), kueri.trim() ? 250 : 0);
		return () => clearTimeout(timerPencarian);
	});

	/**
	 * Menangani pilihan pil filter: menormalkan nilainya dan mengembalikan daftar ke
	 * halaman pertama.
	 *
	 * `FilterChips` melepaskan pilihan menjadi string kosong ketika pil aktif ditekan
	 * lagi. Kedua penyaring di halaman ini sudah menyediakan opsi "Semua", sehingga
	 * string kosong bukan keadaan yang sah: ia akan mencari awardee berkomunitas ""
	 * dan mengosongkan direktori tanpa sebab yang terlihat.
	 *
	 * Batas tampil ikut disetel ulang karena hasil penyaringan yang baru hampir
	 * selalu lebih pendek; mempertahankan batas lama membuat awardee melihat tombol
	 * "muat lebih banyak" yang tidak menambah apa pun.
	 *
	 * @param {string|string[]} nilai
	 * @returns {string} Nilai penyaring yang sah.
	 */
	function pilihPenyaring(nilai) {
		batas = UKURAN_HALAMAN;
		return typeof nilai === 'string' && nilai !== '' ? nilai : SEMUA;
	}

	/**
	 * Bentuk yang dibaca `AwardeeCard`.
	 * Kontak pribadi sengaja tidak ikut: lihat catatan privasi di kepala berkas.
	 * @param {import('$lib/domain/entities/Awardee.js').Awardee} awardee
	 * @returns {Record<string, unknown>}
	 */
	function tampilanKartu(awardee) {
		return {
			id: awardee.id,
			name: awardee.fullName,
			avatar: awardee.avatar,
			community: awardee.community,
			chapter: awardee.chapterDef.label,
			tier: awardee.tierLevel,
			activePk: awardee.points,
			badges: awardee.badgeCodes.length,
			city: awardee.city,
			headline: awardee.businessProfile?.businessName || awardee.occupation
		};
	}

	/**
	 * Membuka profil seorang awardee.
	 * @param {Record<string, unknown>} tampilan Objek tampilan dari `AwardeeCard`.
	 * @returns {void}
	 */
	function bukaProfil(tampilan) {
		anggotaDipilih = directory.byId(/** @type {string} */ (tampilan.id));
	}

	/**
	 * Mengarahkan awardee ke komunitas seberang: inti dari jembatan SOBI ×
	 * PFpreneur. Penyaring lain dikosongkan supaya hasilnya tidak terpotong oleh
	 * pilihan sebelumnya yang sudah tidak relevan.
	 * @param {string} tujuan Salah satu CommunityType.
	 * @param {boolean} mentorSaja
	 * @returns {void}
	 */
	function jelajahiKomunitas(tujuan, mentorSaja) {
		komunitas = tujuan;
		hanyaMentor = mentorSaja;
		kueri = '';
		chapterId = SEMUA;
		kota = SEMUA;
		keahlian = SEMUA;
		batas = UKURAN_HALAMAN;
	}

	/** @returns {void} */
	function bersihkanPenyaring() {
		kueri = '';
		komunitas = SEMUA;
		chapterId = SEMUA;
		kota = SEMUA;
		keahlian = SEMUA;
		hanyaMentor = false;
		batas = UKURAN_HALAMAN;
	}
</script>

<svelte:head>
	<title>Jejaring Komunitas: PFriends</title>
</svelte:head>

<PageHeader
	eyebrow="Pilar 01 · Open Community Ecosystem"
	title="Jejaring"
	subtitle="Temukan orang yang tepat di komunitas PFriends. Alumni Sobat Bumi dan pelaku usaha Womenpreneur saling mencari berdasarkan keahlian, kota, atau chapter: lalu membuka percakapan lewat kanal resmi komunitas."
/>

<div class="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
	<StatTile
		label="Anggota aktif"
		value={directory.stats.active}
		hint="Terdata di komunitas PFriends"
		iconPath={ICONS.users}
		color="var(--color-pertamina-navy)"
	/>
	<StatTile
		label="Alumni SOBI"
		value={jumlahSobi}
		hint="Mitra muda dan calon mentor"
		iconPath={ICONS.academic}
		color="var(--color-pertamina-green-ink)"
	/>
	<StatTile
		label="Womenpreneur"
		value={jumlahWomenpreneur}
		hint="UMKM binaan Pertamina Foundation"
		iconPath={ICONS.briefcase}
		color="var(--color-pertamina-red-ink)"
	/>
	<StatTile
		label="Bersedia jadi mentor"
		value={mentorSobi}
		hint="Alumni yang membuka diri mendampingi"
		iconPath={ICONS.heart}
		color="var(--color-esg-g-ink)"
	/>
</div>

{#if saya}
	<Card variant="highlight" class="mt-4">
		<div class="flex flex-wrap items-start gap-4">
			<span
				class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-pertamina-navy-tint text-pertamina-navy"
			>
				<Icon path={ICONS.link} size={22} />
			</span>
			<div class="min-w-0 flex-1">
				<p class="label-micro">Jembatan SOBI × PFpreneur</p>
				{#if saya.isWomenpreneur}
					<p class="mt-1 text-base font-semibold text-heading">
						{formatAngka(mentorSobi)} alumni Sobat Bumi bersedia mendampingi usahamu
					</p>
					<p class="mt-1 text-[13px] leading-relaxed text-ink-600">
						Mereka membawa keahlian yang paling sering menahan pertumbuhan UMKM: pemasaran digital,
						riset pasar, dan pengelolaan keuangan. Telusuri profil mereka, lalu ajukan sesi
						pendampingan lewat katalog penukaran.
					</p>
					<div class="mt-3 flex flex-wrap gap-2">
						<Button
							size="sm"
							onclick={() => jelajahiKomunitas(CommunityType.SOBI, true)}
						>
							Lihat alumni yang siap mendampingi
						</Button>
						<Button variant="outline" size="sm" href="/awardee/penghargaan">
							Katalog slot mentoring
						</Button>
					</div>
				{:else}
					<p class="mt-1 text-base font-semibold text-heading">
						{formatAngka(jumlahWomenpreneur)} usaha Womenpreneur menunggu keahlianmu
					</p>
					<p class="mt-1 text-[13px] leading-relaxed text-ink-600">
						Alumni PFpreneur adalah UMKM unggulan binaan Pertamina, namun jaringan pemasaran dan
						akses tenaga ahli digital masih menjadi kendala mereka. Satu sesi berbagi darimu bernilai
						besar bagi usaha yang sedang mencari bentuk.
					</p>
					<div class="mt-3 flex flex-wrap gap-2">
						<Button
							size="sm"
							onclick={() => jelajahiKomunitas(CommunityType.WOMENPRENEUR, false)}
						>
							Jelajahi usaha Womenpreneur
						</Button>
						<Button variant="outline" size="sm" href="/awardee/kalender">
							Sharing session terdekat
						</Button>
					</div>
				{/if}
			</div>
		</div>
	</Card>
{/if}

<div class="mt-6 space-y-3">
	<SearchInput
		bind:value={kueri}
		placeholder="Cari nama, keahlian, kota, kampus, atau nama usaha"
		label="Pencarian awardee"
		oninput={() => (batas = UKURAN_HALAMAN)}
	/>

	<FilterChips
		options={opsiKomunitas}
		bind:selected={komunitas}
		showClear={false}
		label="Penyaring komunitas"
		onchange={(nilai) => (komunitas = pilihPenyaring(nilai))}
	/>

	<FilterChips
		options={opsiChapter}
		bind:selected={chapterId}
		showClear={false}
		label="Penyaring chapter"
		onchange={(nilai) => (chapterId = pilihPenyaring(nilai))}
	/>

	<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
		<label class="block">
			<span class="label-micro">Kota</span>
			<select
				bind:value={kota}
				onchange={() => (batas = UKURAN_HALAMAN)}
				class="mt-1.5 w-full rounded-xl border border-ink-450 bg-surface px-3 py-2 text-sm text-ink-800"
			>
				<option value={SEMUA}>Semua kota</option>
				{#each opsiKota as nama (nama)}
					<option value={nama}>{nama}</option>
				{/each}
			</select>
		</label>

		<label class="block">
			<span class="label-micro">Keahlian</span>
			<select
				bind:value={keahlian}
				onchange={() => (batas = UKURAN_HALAMAN)}
				class="mt-1.5 w-full rounded-xl border border-ink-450 bg-surface px-3 py-2 text-sm text-ink-800"
			>
				<option value={SEMUA}>Semua keahlian</option>
				{#each opsiKeahlian as nama (nama)}
					<option value={nama}>{nama}</option>
				{/each}
			</select>
		</label>

		<label class="flex items-center gap-2.5 self-end rounded-xl border border-ink-200 px-3 py-2.5">
			<input
				type="checkbox"
				bind:checked={hanyaMentor}
				onchange={() => (batas = UKURAN_HALAMAN)}
				class="h-4 w-4 shrink-0"
			/>
			<span class="text-[13px] text-ink-700">Hanya yang bersedia menjadi mentor</span>
		</label>
	</div>
</div>

<div class="mt-5 flex flex-wrap items-center justify-between gap-2">
	<p class="text-[13px] text-ink-600">
		Menampilkan <span class="numeric font-semibold text-ink-800">{formatAngka(tampil.length)}</span>
		dari {formatAngka(directory.totalItems)} awardee
	</p>
	{#if adaPenyaringAktif}
		<Button variant="ghost" size="sm" iconPath={ICONS.refresh} onclick={bersihkanPenyaring}>
			Bersihkan penyaring
		</Button>
	{/if}
</div>

{#if directory.loading && anggotaAktif.length === 0}
	<p class="mt-8 text-sm text-ink-600">Memuat direktori awardee…</p>
{:else if directory.error}
	<div class="mt-4">
		<EmptyState
			icon={ICONS.refresh}
			title="Jejaring belum dapat dimuat"
			message={directory.error}
			actionLabel="Coba lagi"
			onAction={() => directory.load()}
		/>
	</div>
{:else if directory.totalItems === 0}
	<div class="mt-4">
		<EmptyState
			icon={ICONS.search}
			title="Belum ada awardee yang cocok"
			message="Coba kurangi penyaring atau gunakan kata kunci yang lebih umum: misalnya nama kota saja, tanpa nama keahlian."
			actionLabel="Bersihkan penyaring"
			onAction={bersihkanPenyaring}
		/>
	</div>
{:else}
	<div class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
		{#each tampil as awardee (awardee.id)}
			<AwardeeCard awardee={tampilanKartu(awardee)} showActions onclick={bukaProfil} />
		{/each}
	</div>

	{#if directory.page < directory.totalPages}
		<div class="mt-6 flex justify-center">
			<Button variant="outline" loading={directory.loading} onclick={() => directory.loadMore()}>
				Muat {formatAngka(Math.min(UKURAN_HALAMAN, directory.totalItems - tampil.length))} awardee lagi
			</Button>
		</div>
	{/if}
{/if}

<Modal
	open={anggotaDipilih !== null}
	title="Profil awardee"
	size="md"
	onclose={() => (anggotaDipilih = null)}
>
	{#if anggotaDipilih}
		<div class="flex items-start gap-4">
			<Avatar
				name={anggotaDipilih.fullName}
				src={anggotaDipilih.avatar}
				size="xl"
				tier={anggotaDipilih.tierLevel}
				showRing
			/>
			<div class="min-w-0 flex-1">
				<p class="text-lg font-semibold text-ink-800">{anggotaDipilih.fullName}</p>
				{#if anggotaDipilih.occupation}
					<p class="mt-0.5 text-[13px] text-ink-600">{anggotaDipilih.occupation}</p>
				{/if}
				<div class="mt-2 flex flex-wrap items-center gap-1.5">
					<StatusBadge
						label={anggotaDipilih.communityDef.akronim}
						color={anggotaDipilih.isWomenpreneur ? 'purple' : 'navy'}
						size="sm"
					/>
					<StatusBadge label={anggotaDipilih.chapterDef.label} color="slate" size="sm" />
					<TierBadge tier={anggotaDipilih.tierLevel} size="sm" />
				</div>
			</div>
		</div>

		<div class="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-ink-50 p-3 text-center">
			<div>
				<p class="numeric text-base font-bold text-ink-900">
					{formatAngka(anggotaDipilih.points)}
				</p>
				<p class="label-micro mt-0.5">Poin</p>
			</div>
			<div>
				<p class="numeric text-base font-bold text-ink-900">
					{formatAngka(anggotaDipilih.badgeCodes.length)}
				</p>
				<p class="label-micro mt-0.5">Lencana</p>
			</div>
			<div>
				<p class="numeric text-base font-bold text-ink-900">{anggotaDipilih.streakDays}</p>
				<p class="label-micro mt-0.5">Hari streak</p>
			</div>
		</div>

		{#if anggotaDipilih.bio}
			<p class="mt-4 text-[13px] leading-relaxed text-ink-700">{anggotaDipilih.bio}</p>
		{/if}

		<dl class="mt-4 space-y-2 text-[13px]">
			{#if anggotaDipilih.city}
				<div class="flex items-start justify-between gap-3">
					<dt class="inline-flex items-center gap-1.5 text-ink-600">
						<Icon path={ICONS.mapPin} size={14} /> Domisili
					</dt>
					<dd class="text-right text-ink-800">{anggotaDipilih.city}</dd>
				</div>
			{/if}
			{#if anggotaDipilih.university}
				<div class="flex items-start justify-between gap-3">
					<dt class="inline-flex items-center gap-1.5 text-ink-600">
						<Icon path={ICONS.academic} size={14} /> Kampus asal
					</dt>
					<dd class="text-right text-ink-800">
						{anggotaDipilih.university}
						{#if anggotaDipilih.graduationYear}
							<span class="numeric text-ink-600"> · {anggotaDipilih.graduationYear}</span>
						{/if}
					</dd>
				</div>
			{/if}
		</dl>

		{#if anggotaDipilih.skills.length > 0}
			<div class="mt-4">
				<p class="label-micro">Keahlian yang ditawarkan</p>
				<div class="mt-2 flex flex-wrap gap-1.5">
					{#each anggotaDipilih.skills as nama (nama)}
						<StatusBadge label={nama} color="blue" size="sm" variant="outline" />
					{/each}
				</div>
			</div>
		{/if}

		{#if anggotaDipilih.openToMentoring && anggotaDipilih.whatsapp}
			<a class="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-700" href={`https://wa.me/${anggotaDipilih.whatsapp.replace(/^0/, '62')}`} target="_blank" rel="noreferrer">
				<Icon path={ICONS.whatsapp} size={15} /> Hubungi WhatsApp untuk mentoring
			</a>
		{/if}

		{#if anggotaDipilih.businessProfile}
			{@const usaha = anggotaDipilih.businessProfile}
			<div class="mt-4 rounded-xl border border-pertamina-red-tint bg-pertamina-red-tint/50 p-3">
				<p class="label-micro">Profil usaha</p>
				<p class="mt-1 text-sm font-semibold text-ink-800">{usaha.businessName}</p>
				<p class="mt-0.5 text-[13px] text-ink-600">{usaha.sector} · {usaha.city}</p>
				<p class="mt-2 text-[13px] text-ink-700">
					<span class="numeric font-semibold">{formatAngka(usaha.employees)}</span> tenaga kerja ·
					pertumbuhan <span class="numeric font-semibold">{formatAngka(usaha.growthPercent)}%</span>
				</p>
				{#if usaha.description}
					<p class="mt-2 text-[13px] leading-relaxed text-ink-700">{usaha.description}</p>
				{/if}
				{#if usaha.contact}
					<a class="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-700" href={`https://wa.me/${usaha.contact.replace(/^0/, '62')}`} target="_blank" rel="noreferrer">
						<Icon path={ICONS.whatsapp} size={15} /> Hubungi WhatsApp usaha
					</a>
				{/if}
			</div>
			{#if usaha.products?.length}
				<div class="mt-4">
					<p class="label-micro">Etalase produk</p>
					<div class="mt-2 grid grid-cols-2 gap-2">
						{#each usaha.products as produk (produk.id)}
							<div class="overflow-hidden rounded-xl border border-ink-100 bg-surface">
								<img src={produk.imageUrl} alt={produk.name} width="320" height="200" class="h-24 w-full object-cover" />
								<div class="p-2"><p class="text-xs font-bold text-ink-800">{produk.name}</p><p class="text-[11px] text-ink-600">{produk.category}</p></div>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		{/if}

		<div class="mt-4 border-t border-ink-100 pt-4">
			{#if anggotaDipilih.openToMentoring}
				<p class="flex items-start gap-2 text-[13px] leading-relaxed text-ink-700">
					<Icon path={ICONS.heart} size={16} class="mt-px shrink-0 text-pertamina-red-ink" />
					<span>
						<span class="font-semibold text-ink-800">Bersedia menjadi mentor.</span>
						Ajukan sesi pendampingan lewat kategori “Slot mentoring” di halaman Pencapaian, atau temui
						langsung pada sharing session chapter terdekat.
					</span>
				</p>
				<div class="mt-3 flex flex-wrap gap-2">
					<Button size="sm" href="/awardee/penghargaan" iconPath={ICONS.gift}>
						Ajukan sesi mentoring
					</Button>
					<Button variant="outline" size="sm" href="/awardee/kalender" iconPath={ICONS.calendar}>
						Lihat kalender
					</Button>
				</div>
			{:else}
				<p class="text-[13px] leading-relaxed text-ink-600">
					Awardee ini belum membuka diri untuk mentoring. Kamu tetap dapat bertemu dengannya pada
					kegiatan chapter maupun gerakan bersama.
				</p>
			{/if}
			<p class="mt-3 text-xs leading-relaxed text-ink-600">
				Nomor WhatsApp dan surel pribadi tidak ditampilkan di Jejaring. Perkenalan difasilitasi lewat
				kanal resmi komunitas PFriends.
			</p>
		</div>
	{/if}
</Modal>
