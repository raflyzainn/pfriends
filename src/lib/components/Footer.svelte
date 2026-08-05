<script>
	/**
	 * Footer — kaki halaman.
	 *
	 * Props (seluruhnya opsional):
	 * @prop {boolean} compact  Versi satu baris untuk zona awardee/admin.
	 * @prop {string}  version
	 *
	 * Jarak bawah `mb-16` pada mobile bukan hiasan: `BottomNav` menempel di dasar
	 * viewport dan akan menutupi baris terakhir kaki halaman tanpa jarak itu.
	 *
	 * TIGA PERUBAHAN V2:
	 *
	 * 1. **Dua pil berbingkai "PT Pertamina (Persero)" dan "Danantara Indonesia"
	 *    DIHAPUS.** Kotak berbingkai berisi nama organisasi terbaca sebagai chip
	 *    placeholder yang belum diganti logo — persis kesan yang sedang dicabut.
	 *    Penggantinya baris teks monokrom.
	 *
	 * 2. **`/kalender` masuk ke daftar tautan.** Kalender adalah salah satu dari
	 *    sebelas route publik dan sebelumnya tidak dapat dicapai dari kaki halaman.
	 *
	 * 3. **Kalimat misi tiga kata kerja ("terhubung, berbagi, menggerakkan")
	 *    diganti baris FAKTA yang dapat diperiksa** (prinsip P-7): dua komunitas,
	 *    tiga chapter, satu divisi penyelenggara. Trikolon kata kerja adalah salah
	 *    satu tanda tulisan generate yang paling mudah dikenali.
	 *
	 * @see docs/11-VISUAL-DIRECTION.md — §6 E7 catatan Footer, §2 P-7
	 */
	import { CHAPTERS, COMMUNITIES } from '$lib/domain/constants/community.js';
	import { kelas } from './_visual.js';

	let { compact = false, version = '0.1.0' } = $props();

	const TAHUN = 2026;

	const tautan = [
		{ label: 'Tentang Inisiatif', href: '/tentang' },
		{ label: 'Dua Komunitas', href: '/komunitas' },
		{ label: 'Cerita Komunitas', href: '/cerita' },
		{ label: 'Kalender Komunitas', href: '/kalender' },
		{ label: 'Gerakan Bersama', href: '/gerakan' }
	];

	/** Penyelenggara ditulis sebagai teks, bukan sebagai pil berbingkai. */
	const pendukung = ['PT Pertamina (Persero)', 'Danantara Indonesia'];
</script>

<!-- Zona publik: kaki halaman menempel langsung ke pita penutup E7 (gap 0), karena
     jarak di antara keduanya akan memutus pita menjadi "kartu" lagi. Zona ter-login
     tetap berjarak: di sana yang berada di atasnya adalah tabel kerja, bukan pita. -->
<footer class={kelas(compact ? 'mt-12' : 'mt-0', 'border-t border-ink-200 pb-16 lg:pb-0')}>
	<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
		<div class="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
			<div class="min-w-0">
				<p class="text-base font-extrabold text-heading">Pfriends</p>
				<p class="mt-1 text-sm text-ink-600">
					Community Connect Initiative · Pertamina Foundation
				</p>
				<p class="mt-0.5 text-xs text-ink-600">Divisi Corporate Secretary</p>

				{#if !compact}
					<!-- Baris FAKTA, bukan trikolon kata kerja. Angka chapter dibaca dari
					     konstanta domain supaya kalimat ini tidak basi saat chapter bertambah. -->
					<p class="mt-3 max-w-md text-[14px] leading-[1.6] text-ink-600">
						Dua komunitas — {COMMUNITIES[0].akronim} dan {COMMUNITIES[1].akronim} — dalam
						{CHAPTERS.length} chapter angkatan, dikelola Divisi Corporate Secretary
						Pertamina Foundation.
					</p>
				{/if}
			</div>

			{#if !compact}
				<nav aria-label="Tautan halaman publik" class="min-w-0">
					<p class="kicker">Jelajahi</p>
					<ul class="mt-3 space-y-2">
						{#each tautan as item (item.href)}
							<li>
								<a
									href={item.href}
									class="text-sm text-ink-600 transition-colors hover:text-pertamina-red-ink"
								>
									{item.label}
								</a>
							</li>
						{/each}
					</ul>
				</nav>
			{/if}

			<div class="min-w-0">
				<p class="kicker">Didukung oleh</p>
				<ul class="mt-3 space-y-1.5">
					{#each pendukung as nama (nama)}
						<li class="text-sm font-medium text-ink-700">{nama}</li>
					{/each}
				</ul>
			</div>
		</div>

		<div
			class="mt-8 flex flex-wrap items-center justify-between gap-2 border-t border-ink-100 pt-5"
		>
			<p class="text-xs text-ink-600">
				© {TAHUN} Pertamina Foundation. Mockup internal untuk keperluan presentasi.
			</p>
			<p class="numeric text-xs text-ink-600">v{version}</p>
		</div>
	</div>
</footer>
