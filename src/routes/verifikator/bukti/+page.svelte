<script>
	/**
	 * HALAMAN `/verifikator/bukti` — antrean kesiapan bukti ESG.
	 *
	 * Tanggung jawab: menunjukkan naskah yang sudah bertag ESG namun buktinya belum
	 * lengkap, beserta syarat mana yang kurang dari masing-masing.
	 *
	 * Lima keputusan yang tidak terbaca dari kode:
	 *
	 * 1. **Definisi antreannya milik domain.** `EsgEvidenceService.incompleteQueue()`
	 *    yang menentukan naskah mana yang masuk dan bagaimana urutannya — "hampir
	 *    lengkap lebih dahulu". Menyusun ulang penyaring dan urutan di halaman akan
	 *    melahirkan definisi kedua atas kata "belum lengkap".
	 * 2. **Yang ditampilkan adalah pekerjaan konkret, bukan persentase kesiapan.**
	 *    Daftar "kurang satu lampiran" jauh lebih berguna bagi verifikator daripada
	 *    angka 78% yang tidak memberi tahu siapa yang harus dihubungi
	 *    (`docs/00` Hal 9: bukti pipeline sebelum dasbor).
	 * 3. **Nol chart dan nol agregat lintas pilar.** Matriks tiga pilar adalah
	 *    tampilan admin; di sini ia hanya akan mengundang verifikator membaca
	 *    ringkasan alih-alih menuntaskan barisnya (larangan X-02 pada paket ini).
	 * 4. **Keempat syarat ditampilkan sebagai daftar terpisah per naskah**, tidak
	 *    dilebur menjadi satu nilai kesiapan. Gerbangnya konjungtif: tiga dari empat
	 *    sama artinya dengan belum siap.
	 * 5. **Halaman ini tidak mengubah status apa pun.** Kelengkapan bukti diperbaiki
	 *    penulisnya; yang dapat dilakukan verifikator adalah membuka naskahnya dan
	 *    meminta revisi lewat jalur keputusan yang sama dengan antrean cerita.
	 *
	 * @see docs/00-SOURCE-BRIEF.md — Hal 12 minimum for ESG evidence, Hal 9 bukti sebelum dasbor
	 * @see docs/10-REVISION-SPEC.md — US-R24 antrean bukti
	 */
	import { EmptyState, Icon, PageHeader, StatusBadge, ICONS } from '$lib/components';
	import { catalog } from '$lib/stores/catalog.svelte.js';
	import { antreanBuktiBelumLengkap } from '../_components/index.js';

	/** @type {{story: object, checklist: {checks: readonly object[], missing: readonly string[], passedCount: number, totalCount: number}}[]} */
	let antrean = $state([]);

	/** @type {boolean} Antrean sedang dihitung ulang. */
	let memuat = $state(true);

	// Antrean dihitung ulang setiap katalog berubah. `incompleteQueue()` membaca
	// katalog yang SUDAH dimuat store — tidak ada transaksi basis data tambahan di
	// sini, sehingga menghitungnya ulang jauh lebih murah daripada menyimpan salinan
	// yang bisa basi sesudah sebuah keputusan.
	$effect(() => {
		// Rujukan dibaca lebih dulu agar efek ini benar-benar bergantung padanya:
		// `incompleteQueue()` membaca katalog secara tidak langsung, dan
		// ketergantungan yang hanya tersembunyi di dalam janji tidak akan terlacak.
		void catalog.stories;

		let dibatalkan = false;
		memuat = true;
		antreanBuktiBelumLengkap()
			.then((hasil) => {
				if (dibatalkan) return;
				antrean = hasil;
				memuat = false;
			})
			.catch(() => {
				if (dibatalkan) return;
				antrean = [];
				memuat = false;
			});

		return () => {
			dibatalkan = true;
		};
	});
</script>

<PageHeader
	eyebrow="Antrean tinjauan"
	title="Kesiapan bukti ESG"
	subtitle="Naskah yang sudah membawa tag ESG namun belum lengkap buktinya. Empat syarat Hal 12 bersifat konjungtif — tiga dari empat berarti belum siap."
/>

{#if memuat}
	<div class="mt-5 space-y-3" aria-busy="true" aria-label="Memuat antrean bukti">
		{#each ['a', 'b', 'c'] as kunci (kunci)}
			<div class="skeleton h-32 w-full rounded-card"></div>
		{/each}
	</div>
{:else if antrean.length === 0}
	<div class="mt-5">
		<EmptyState
			title="Seluruh bukti sudah lengkap"
			message="Tidak ada naskah bertag ESG yang buktinya kurang. Naskah baru akan muncul di sini begitu tagnya dipasang tanpa lampiran atau catatan hasil."
			iconPath={ICONS.checkCircle}
		/>
	</div>
{:else}
	<ul class="mt-5 space-y-3">
		{#each antrean as baris (baris.story.id)}
			<li class="card p-4">
				<div class="flex flex-wrap items-start gap-2">
					<h2 class="min-w-0 flex-1 text-[15px] leading-snug font-bold text-heading">
						<a
							class="hover:text-pertamina-red-ink hover:underline"
							href="/verifikator/cerita/{baris.story.id}"
						>
							{baris.story.title}
						</a>
					</h2>
					<StatusBadge
						label={baris.story.statusMeta.label}
						color={baris.story.statusMeta.badgeColor}
						size="sm"
						variant="soft"
					/>
				</div>

				<p class="mt-1 text-sm text-ink-600">
					Ditulis {baris.story.authorName}
					<span class="numeric font-semibold text-ink-800">
						· {baris.checklist.passedCount} dari {baris.checklist.totalCount} syarat terpenuhi
					</span>
				</p>

				<ul class="mt-3 space-y-2">
					{#each baris.checklist.checks as check (check.key)}
						<li class="flex items-start gap-2.5">
							<span
								class="mt-0.5 shrink-0 {check.passed ? 'text-success' : 'text-ink-400'}"
								aria-hidden="true"
							>
								<Icon path={check.passed ? ICONS.checkCircle : ICONS.xCircle} size={16} />
							</span>
							<span class="min-w-0">
								<span class="block text-sm leading-snug font-medium text-ink-800">
									{check.label}
									<span class="sr-only">{check.passed ? '— terpenuhi' : '— belum terpenuhi'}</span>
								</span>
								{#if !check.passed}
									<span class="mt-0.5 block text-xs leading-relaxed text-ink-600">
										{check.hint}
									</span>
								{/if}
							</span>
						</li>
					{/each}
				</ul>
			</li>
		{/each}
	</ul>
{/if}

<p class="mt-6 text-xs leading-relaxed text-ink-600">
	Kelengkapan bukti diperbaiki penulisnya. Yang dapat dilakukan dari sini adalah membuka naskahnya,
	lalu mengembalikannya lewat keputusan "Minta revisi" beserta catatan yang menyebut syarat mana yang
	kurang.
</p>
