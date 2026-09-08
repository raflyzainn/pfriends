<script>
	/**
	 * SensitivityGate: gerbang data sensitif 21 butir, dengan konfirmasi manusia.
	 *
	 * @prop {string} kicker
	 * @prop {Set<number>} confirmed  Nomor butir yang sudah dikonfirmasi; dapat di-`bind`.
	 * @prop {string} recordedScan    Nilai `story.sensitivityScan` yang tersimpan.
	 * @prop {boolean} readOnly       Naskah sudah melewati tahap keputusan.
	 *
	 * Empat keputusan yang tidak terbaca dari kode:
	 *
	 * 1. **Yang menentukan kelulusan gerbang ini adalah centang manusia, bukan
	 *    `story.sensitivityScan`.** Nilai tersimpan itu adalah rekaman keputusan
	 *    yang PERNAH diambil seseorang; ia ditampilkan sebagai konteks, bukan
	 *    sebagai pengganti pemeriksaan yang sedang berjalan (`docs/04` §6.2:
	 *    deteksi otomatis menyaring, tidak pernah memutuskan).
	 * 2. **Tidak ada tombol "centang semua".** Kedua puluh satu butir ini adalah
	 *    satu-satunya titik tempat checklist data sensitif benar-benar dijalankan;
	 *    tombol yang menuntaskannya dalam satu ketukan meniadakan gunanya.
	 * 3. **Butir berkonsekuensi blokir ditandai di tempatnya**, bukan dipisah ke
	 *    daftar sendiri. Daftar terpisah membuat lima belas butir sisanya terbaca
	 *    sebagai butir opsional.
	 * 4. **Cacah ditampilkan sebagai "n dari 21".** Sama seperti dua gerbang lain,
	 *    dan sengaja tidak digabung dengan keduanya menjadi satu angka
	 *    (`docs/12` §3.5 WP-06 butir 5).
	 */
	import { Icon, ICONS } from '$lib/components';
	import { SENSITIVITY_GROUPS, TOTAL_BUTIR_SENSITIF } from './sensitivity-checklist.js';

	/**
	 * @type {{
	 *   kicker?: string,
	 *   confirmed: Set<number>,
	 *   recordedScan?: string,
	 *   readOnly?: boolean
	 * }}
	 */
	let { kicker = '', confirmed = $bindable(new Set()), recordedScan = '', readOnly = false } =
		$props();

	const jumlahDikonfirmasi = $derived(confirmed.size);
	const tuntas = $derived(jumlahDikonfirmasi === TOTAL_BUTIR_SENSITIF);

	/**
	 * Membalik keadaan satu butir.
	 *
	 * `Set` diganti dengan salinan baru, bukan dimutasi di tempat: `$state` melacak
	 * penggantian rujukan, dan `Set` yang dimutasi diam-diam tidak akan pernah
	 * memicu perhitungan ulang cacahnya.
	 * @param {number} no
	 */
	function balik(no) {
		const salinan = new Set(confirmed);
		if (salinan.has(no)) salinan.delete(no);
		else salinan.add(no);
		confirmed = salinan;
	}
</script>

<section class="card p-5">
	<header class="mb-4">
		{#if kicker !== ''}
			<p class="kicker">{kicker}</p>
		{/if}
		<h3 class="mt-1 text-base font-bold text-heading">Pemeriksaan data sensitif</h3>
		<p class="mt-1 text-xs leading-relaxed text-ink-600">
			<!-- Cacah butir dibaca dari panjang daftar, bukan ditulis sebagai angka: kalimat
			     yang menyebut "21" akan berbohong pada hari daftarnya bertambah satu butir. -->
			Rumusan sumber: no sensitive-data concern · checklist {TOTAL_BUTIR_SENSITIF} butir
		</p>

		<p
			class="mt-3 inline-flex items-center gap-1.5 rounded-chip px-2.5 py-1 text-xs font-bold {tuntas
				? 'bg-success-tint text-success'
				: 'bg-warning-tint text-warning'}"
		>
			<Icon path={tuntas ? ICONS.checkCircle : ICONS.warning} size={14} />
			<span class="numeric">
				{jumlahDikonfirmasi} dari {TOTAL_BUTIR_SENSITIF} butir dikonfirmasi
			</span>
		</p>

		{#if recordedScan !== ''}
			<p class="mt-2 text-xs leading-relaxed text-ink-600">
				Hasil pemindaian tersimpan pada naskah: <span class="font-semibold">{recordedScan}</span>.
				Nilai ini rekaman keputusan sebelumnya, bukan pengganti pemeriksaan hari ini.
			</p>
		{/if}
	</header>

	<div class="space-y-4">
		{#each SENSITIVITY_GROUPS as grup (grup.kode)}
			<div>
				<p class="label-micro mb-2">{grup.kode}. {grup.label}</p>
				<ul class="space-y-1.5">
					{#each grup.items as butir (butir.no)}
						{@const dicentang = confirmed.has(butir.no)}
						<li>
							<label
								class="flex cursor-pointer items-start gap-2.5 rounded-control p-2 hover:bg-ink-50"
							>
								<input
									type="checkbox"
									class="mt-0.5 h-4 w-4 shrink-0 rounded border-ink-450 accent-pertamina-red-ink"
									checked={dicentang}
									disabled={readOnly}
									onchange={() => balik(butir.no)}
								/>
								<span class="min-w-0">
									<span class="block text-sm leading-snug text-ink-800">
										<span class="numeric font-semibold">{butir.no}.</span>
										{butir.label}
										{#if butir.blocking}
											<span
												class="ml-1 inline-block rounded-chip bg-pertamina-red-tint px-1.5 text-[10px] leading-4 font-bold text-pertamina-red-ink"
											>
												blokir
											</span>
										{/if}
									</span>
									<span class="mt-0.5 block text-xs leading-relaxed text-ink-600">
										{butir.aksi}
									</span>
								</span>
							</label>
						</li>
					{/each}
				</ul>
			</div>
		{/each}
	</div>
</section>
