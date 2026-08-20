<script>
	/**
	 * DecisionBar: deretan tombol keputusan sebuah entity.
	 *
	 * @prop {import('./decisions.js').Decision[]} decisions  Hasil `keputusanCerita()` /
	 *   `keputusanKegiatan()`: yakni turunan langsung dari peta transisi domain.
	 * @prop {string} blockedReason  Alasan tertulis mengapa seluruh keputusan dimatikan;
	 *   kosong berarti tidak ada halangan. Dipakai konflik kepentingan.
	 * @prop {boolean} working       Ada keputusan lain yang sedang diproses.
	 * @prop {string} emptyMessage   Kalimat ketika tidak ada transisi yang sah.
	 * @prop {boolean} compact       Sembunyikan daftar penjelasan; dipakai di dalam daftar.
	 * @prop {(decision: import('./decisions.js').Decision) => void} onpick
	 *
	 * Lima keputusan yang tidak terbaca dari kode:
	 *
	 * 1. **Komponen ini tidak tahu status apa pun.** Ia hanya merender daftar yang
	 *    diberikan. Daftarnya selalu berasal dari `allowedStoryTransitions` /
	 *    `allowedEventTransitions`, sehingga tidak ada satu pun tombol keputusan di
	 *    zona ini yang ditulis tangan (`docs/12` §3.5 WP-06 butir 2).
	 * 2. **Halangan dijelaskan, bukan disembunyikan.** Ketika `blockedReason`
	 *    terisi, tombolnya tetap tampil dalam keadaan nonaktif beserta kalimat
	 *    sebabnya. Menyembunyikan tombolnya akan membuat verifikator menyangka
	 *    sistemnya rusak, dan `ContentReviewService` yang menolak permintaan
	 *    paksaan lewat konsol tidak akan pernah terbaca alasannya
	 *    (`docs/12` §3.5 WP-06 butir 3).
	 * 3. **Transisi sah yang belum punya jalur eksekusi juga ditampilkan
	 *    nonaktif** beserta `alasanTidakTersedia`-nya. Selisih antara peta transisi
	 *    dan kemampuan konsol lebih baik terbaca daripada tersembunyi.
	 * 4. **Tidak ada keadaan "tidak ada tombol" yang senyap.** Entity terminal
	 *    menampilkan kalimat penjelas, karena layar tanpa tombol dan tanpa kalimat
	 *    tidak dapat dibedakan dari layar yang gagal memuat.
	 * 5. **`compact` MENGGESER penjelasan, bukan membuangnya.** Di dalam daftar
	 *    submission, tiga paragraf penjelasan per baris menenggelamkan judul naskah
	 *    yang seharusnya dibaca lebih dulu; di sana penjelasan itu pindah ke atribut
	 *    `title` tiap tombol. Banner `blockedReason` TIDAK ikut diringkas: alasan
	 *    sebuah keputusan dimatikan harus terbaca tanpa menunggu kursor singgah,
	 *    karena pengguna papan ketik dan layar sentuh tidak pernah memicu tooltip.
	 */
	import { Button, Icon, ICONS } from '$lib/components';

	/**
	 * @type {{
	 *   decisions: import('./decisions.js').Decision[],
	 *   blockedReason?: string,
	 *   working?: boolean,
	 *   emptyMessage?: string,
	 *   compact?: boolean,
	 *   onpick: (decision: import('./decisions.js').Decision) => void
	 * }}
	 */
	let {
		decisions = [],
		blockedReason = '',
		working = false,
		emptyMessage = 'Tidak ada keputusan yang tersedia dari keadaan ini.',
		compact = false,
		onpick
	} = $props();

	/**
	 * Alasan sebuah tombol dimatikan; kosong berarti tombolnya aktif.
	 * @param {import('./decisions.js').Decision} decision
	 * @returns {string}
	 */
	function alasanNonaktif(decision) {
		if (blockedReason !== '') return blockedReason;
		if (decision.jalankan === null) return decision.alasanTidakTersedia;
		return '';
	}
</script>

{#if decisions.length === 0}
	<p class="text-sm leading-relaxed text-ink-600">{emptyMessage}</p>
{:else}
	<div class="space-y-3">
		{#if blockedReason !== ''}
			<p
				class="flex items-start gap-2 rounded-control border border-ink-200 bg-pertamina-red-tint p-3 text-sm leading-relaxed text-pertamina-red-ink"
				role="status"
			>
				<span class="mt-0.5 shrink-0" aria-hidden="true">
					<Icon path={ICONS.shield} size={16} />
				</span>
				<span>{blockedReason}</span>
			</p>
		{/if}

		<ul class="flex flex-wrap gap-2">
			{#each decisions as decision (decision.to)}
				{@const halangan = alasanNonaktif(decision)}
				<li
					class="min-w-0"
					title={halangan !== '' && blockedReason === '' ? halangan : decision.description}
				>
					<Button
						variant={decision.tone === 'primary'
							? 'primary'
							: decision.tone === 'danger'
								? 'danger'
								: 'secondary'}
						size={compact ? 'sm' : 'md'}
						disabled={halangan !== '' || working}
						onclick={() => onpick(decision)}
					>
						{decision.label}
					</Button>
				</li>
			{/each}
		</ul>

		{#if !compact}
			<dl class="space-y-1.5">
				{#each decisions as decision (decision.to)}
					{@const halangan = alasanNonaktif(decision)}
					<div class="text-[13px] leading-relaxed">
						<dt class="inline font-semibold text-ink-800">{decision.label} :</dt>
						<dd class="inline text-ink-600">
							{halangan !== '' && blockedReason === '' ? halangan : decision.description}
						</dd>
					</div>
				{/each}
			</dl>
		{/if}
	</div>
{/if}
