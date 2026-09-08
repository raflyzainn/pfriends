<script>
	/**
	 * MonthCalendar: grid bulan dengan penanda tanggal ber-kegiatan.
	 *
	 * Tanggung jawab: kolom kiri E4 beranda dan halaman `/kalender`. Ia sekaligus
	 * MENGELUARKAN perhitungan grid bulan dari dalam halaman kalender, tempat ia
	 * hidup hari ini sebagai puluhan baris di dalam `+page.svelte`.
	 *
	 * EMPAT KEPUTUSAN YANG TIDAK TERBACA DARI KODE:
	 *
	 * 1. **Prop `events` adalah `EventCardVM[]`, BUKAN `markers[]`.** `docs/11` §8.6
	 *    memakai `{date,type,color}[]`; `docs/12` §2.13 menggantinya: beda BENTUK
	 *    DATA, bukan sekadar nama. Menerima VM utuh berarti sel dapat mengumumkan
	 *    judul kegiatan kepada pembaca layar tanpa pemanggil menyusun label sendiri.
	 *
	 * 2. **Warna penanda TIDAK PERNAH menjadi satu-satunya pembawa informasi**
	 *    (WCAG 1.4.1). Tanggal ber-kegiatan juga ditebalkan ke bobot 700, sel-nya
	 *    membawa `aria-label` yang menyebut jumlah dan judul kegiatan, dan daftar
	 *    teksnya berdiri di sebelah kalender. Kotak berwarna 6 px hanyalah lapis
	 *    keempat.
	 *
	 * 3. **Minggu dimulai Senin.** Kalender Indonesia dibaca Sen–Min; memulainya
	 *    Minggu memindahkan akhir pekan ke tempat yang salah bagi setiap pembaca
	 *    di ruang rapat ini.
	 *
	 * 4. **Sel tanpa kegiatan bukan tombol.** Membuat 35 sel dapat difokus hanya
	 *    untuk memberi tahu "tidak ada apa-apa di sini" memperpanjang jalur papan
	 *    ketik tanpa menambah satu pun informasi.
	 *
	 * @see docs/12-BUILD-CONTRACT-V2.md: §2.13 kontrak props FINAL
	 * @see docs/11-VISUAL-DIRECTION.md: §6 E4, §8.6 aksesibilitas, §10.4 kontras penanda
	 */
	import Icon from '../Icon.svelte';
	import { ICONS } from '$lib/data/icons.js';
	import { kelas } from '../_visual.js';
	import { awalBulan, awalHari, hariSama, NAMA_BULAN, tambahBulan } from '$lib/utils/date.js';

	/**
	 * @typedef {import('./view-model.js').EventCardVM} EventCardVM
	 */

	/**
	 * @typedef {object} MonthCalendarProps
	 * @property {Date} month              Bulan yang ditampilkan.
	 * @property {EventCardVM[]} events    Kegiatan bulan mana pun; disaring di sini.
	 * @property {Date} [selected]         Tanggal terpilih.
	 * @property {Date} [min]              Batas navigasi mundur.
	 * @property {Date} [max]              Batas navigasi maju.
	 * @property {boolean} [compact]       `true` → sel 28 px untuk `<aside>`.
	 * @property {(date: Date) => void} [onselect]
	 * @property {(month: Date) => void} [onstep]
	 * @property {string} [class]
	 */

	/** @type {MonthCalendarProps} */
	let {
		month = new Date(),
		events = [],
		selected = undefined,
		min = undefined,
		max = undefined,
		compact = false,
		onselect = undefined,
		onstep = undefined,
		class: className = ''
	} = $props();

	/** Nama hari dua huruf, Senin lebih dulu. Lihat keputusan 3. */
	const HARI_PENDEK = Object.freeze(['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']);

	/**
	 * Warna penanda per jenis kegiatan. Ketiganya adalah warna keying rule yang
	 * sudah ada: tidak ada warna baru yang masuk ke palet.
	 * @type {Readonly<Record<string, string>>}
	 */
	const WARNA_PENANDA = Object.freeze({
		UPSKILLING: 'var(--color-pertamina-green)',
		PERTEMUAN: 'var(--color-pertamina-navy)',
		SHARING: 'var(--color-pertamina-red)'
	});

	const bulanIni = $derived(awalBulan(month) ?? awalBulan(new Date()));

	/**
	 * Kegiatan bulan ini, dikelompokkan per tanggal.
	 * @type {Map<number, EventCardVM[]>}
	 */
	const perTanggal = $derived.by(() => {
		/** @type {Map<number, EventCardVM[]>} */
		const peta = new Map();
		if (!bulanIni) return peta;
		for (const ev of events ?? []) {
			const t = ev?.startsAt;
			if (!(t instanceof Date)) continue;
			if (t.getFullYear() !== bulanIni.getFullYear() || t.getMonth() !== bulanIni.getMonth()) {
				continue;
			}
			const kunci = t.getDate();
			peta.set(kunci, [...(peta.get(kunci) ?? []), ev]);
		}
		return peta;
	});

	/**
	 * Sel grid: `null` untuk padding awal bulan, angka untuk tanggal.
	 * Padding akhir sengaja tidak diisi: baris terakhir yang pendek lebih jujur
	 * daripada tujuh sel kosong yang terlihat dapat diklik.
	 * @type {(number|null)[][]}
	 */
	const baris = $derived.by(() => {
		if (!bulanIni) return [];
		// getDay(): 0=Minggu. Digeser agar Senin bernilai 0.
		const geser = (bulanIni.getDay() + 6) % 7;
		const jumlahHari = new Date(bulanIni.getFullYear(), bulanIni.getMonth() + 1, 0).getDate();
		/** @type {(number|null)[]} */
		const sel = [...Array(geser).fill(null), ...Array.from({ length: jumlahHari }, (_, i) => i + 1)];
		/** @type {(number|null)[][]} */
		const hasil = [];
		for (let i = 0; i < sel.length; i += 7) hasil.push(sel.slice(i, i + 7));
		return hasil;
	});

	const judulBulan = $derived(
		bulanIni ? `${NAMA_BULAN[bulanIni.getMonth()]} ${bulanIni.getFullYear()}` : ''
	);

	const bulanSebelumnya = $derived(bulanIni ? tambahBulan(bulanIni, -1) : null);
	const bulanBerikutnya = $derived(bulanIni ? tambahBulan(bulanIni, 1) : null);

	const mundurTerkunci = $derived(
		Boolean(min && bulanSebelumnya && bulanSebelumnya < (awalBulan(min) ?? new Date(0)))
	);
	const majuTerkunci = $derived(
		Boolean(max && bulanBerikutnya && bulanBerikutnya > (awalBulan(max) ?? new Date(8.64e15)))
	);

	const ukuranSel = $derived(compact ? 'h-7 text-[12px]' : 'h-11 min-w-11 text-[14px]');

	/**
	 * Melangkah satu bulan. Tidak menyimpan state sendiri: `month` tetap milik
	 * pemanggil, sehingga kalender dan daftar event di sebelahnya mustahil
	 * menunjuk bulan yang berbeda.
	 * @param {number} arah -1 mundur, +1 maju.
	 * @returns {void}
	 */
	function melangkah(arah) {
		if (!bulanIni || !onstep) return;
		const tujuan = tambahBulan(bulanIni, arah);
		if (tujuan) onstep(tujuan);
	}

	/**
	 * Label aksesibel satu sel bertanggal.
	 * @param {number} tanggal
	 * @param {EventCardVM[]} daftar
	 * @returns {string}
	 */
	function labelSel(tanggal, daftar) {
		const dasar = `${tanggal} ${NAMA_BULAN[bulanIni?.getMonth() ?? 0]}`;
		if (!daftar.length) return dasar;
		return `${dasar}, ${daftar.length} kegiatan: ${daftar.map((e) => e.title).join(', ')}`;
	}
</script>

<div class={kelas('w-full', className)}>
	<div class="flex items-center justify-between gap-3">
		<p class="display-editorial text-[28px] text-heading">{judulBulan}</p>

		{#if onstep}
			<div class="flex items-center gap-1">
				<button
					type="button"
					class="inline-flex h-11 w-11 items-center justify-center text-ink-600 transition-colors hover:text-pertamina-red-ink disabled:cursor-not-allowed disabled:text-ink-400"
					aria-label="Bulan sebelumnya"
					disabled={mundurTerkunci}
					onclick={() => melangkah(-1)}
				>
					<Icon path={ICONS.chevronLeft} size={18} />
				</button>
				<button
					type="button"
					class="inline-flex h-11 w-11 items-center justify-center text-ink-600 transition-colors hover:text-pertamina-red-ink disabled:cursor-not-allowed disabled:text-ink-400"
					aria-label="Bulan berikutnya"
					disabled={majuTerkunci}
					onclick={() => melangkah(1)}
				>
					<Icon path={ICONS.chevronRight} size={18} />
				</button>
			</div>
		{/if}
	</div>

	<table class="mt-6 w-full table-fixed border-collapse">
		<caption class="sr-only">Kalender kegiatan komunitas bulan {judulBulan}</caption>
		<thead>
			<tr>
				{#each HARI_PENDEK as hari (hari)}
					<th
						scope="col"
						class="pb-2 font-mono text-[11px] leading-none font-medium tracking-[0.08em] text-ink-600 uppercase"
					>
						{hari}
					</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each baris as minggu, i (i)}
				<tr>
					{#each minggu as tanggal, j (j)}
						<td class="border-t border-ink-200 p-0 text-center align-middle">
							{#if tanggal === null}
								<span class={kelas('block', ukuranSel)}></span>
							{:else}
								{@const daftar = perTanggal.get(tanggal) ?? []}
								{@const terpilih =
									selected &&
									bulanIni &&
									hariSama(
										selected,
										new Date(bulanIni.getFullYear(), bulanIni.getMonth(), tanggal)
									)}
								{#if daftar.length && onselect}
									<button
										type="button"
										class={kelas(
											'flex w-full flex-col items-center justify-center gap-1 font-bold text-ink-900 transition-colors hover:bg-[#efece6]',
											ukuranSel,
											terpilih && 'bg-[#efece6]'
										)}
										aria-label={labelSel(tanggal, daftar)}
										aria-pressed={terpilih ? 'true' : 'false'}
										onclick={() =>
											onselect(
												awalHari(
													new Date(bulanIni.getFullYear(), bulanIni.getMonth(), tanggal)
												) ?? new Date()
											)}
									>
										<span>{tanggal}</span>
										<span class="flex gap-0.5" aria-hidden="true">
											{#each daftar.slice(0, 3) as ev (ev.id)}
												<span
													class="block h-1.5 w-1.5"
													style={`background:${WARNA_PENANDA[ev.typeCode] ?? 'var(--color-ink-400)'};`}
												></span>
											{/each}
										</span>
									</button>
								{:else}
									<span
										class={kelas(
											'flex w-full flex-col items-center justify-center gap-1',
											ukuranSel,
											daftar.length ? 'font-bold text-ink-900' : 'text-ink-600'
										)}
										title={daftar.length ? labelSel(tanggal, daftar) : undefined}
									>
										<span>{tanggal}</span>
										{#if daftar.length}
											<span class="flex gap-0.5" aria-hidden="true">
												{#each daftar.slice(0, 3) as ev (ev.id)}
													<span
														class="block h-1.5 w-1.5"
														style={`background:${WARNA_PENANDA[ev.typeCode] ?? 'var(--color-ink-400)'};`}
													></span>
												{/each}
											</span>
										{/if}
									</span>
								{/if}
							{/if}
						</td>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>

	<!-- Legenda: warna penanda dijelaskan sebagai KATA, bukan hanya kotak. -->
	<ul class="mt-5 flex flex-wrap gap-x-5 gap-y-2">
		<li class="inline-flex items-center gap-2 text-[13px] text-ink-600">
			<span class="block h-1.5 w-1.5 bg-pertamina-green" aria-hidden="true"></span> Upskilling
		</li>
		<li class="inline-flex items-center gap-2 text-[13px] text-ink-600">
			<span class="block h-1.5 w-1.5 bg-pertamina-navy" aria-hidden="true"></span> Pertemuan komunitas
		</li>
		<li class="inline-flex items-center gap-2 text-[13px] text-ink-600">
			<span class="block h-1.5 w-1.5 bg-pertamina-red" aria-hidden="true"></span> Sharing session
		</li>
	</ul>
</div>
