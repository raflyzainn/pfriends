<script>
	/**
	 * METODE PENGUKURAN: prasyarat menampilkan angka kelas B dan C.
	 *
	 * Halaman ini bukan pelengkap: `docs/10` §4.4 membolehkan angka estimasi tampil
	 * di zona publik **hanya bila** halaman ini ada. Tanpa daftar asumsi yang dapat
	 * dibuka, rentang jangkauan organik adalah klaim, bukan data.
	 *
	 * EMPAT KEPUTUSAN YANG TIDAK TERBACA DARI KODE:
	 *
	 * 1. **Halaman ini boleh menyebut mekanik skor.** Menyembunyikan keberadaan
	 *    sistem pencatatan justru membuat penjelasan metode menjadi tidak jujur.
	 *    `scripts/verify/public-purity.mjs` mengecualikan jalurnya dari aturan kata.
	 *    (Jalur kedua yang dikecualikan, `/daftar`, sudah dihapus bersama fitur
	 *    pendaftarannya: pengecualiannya kini tidak menaungi berkas mana pun.)
	 *
	 * 2. **Seluruh angka parameter dibaca dari `REACH_PARAMETERS`.** Nol literal.
	 *    Halaman yang menjelaskan rumus lalu menuliskan angkanya sendiri adalah
	 *    dokumentasi yang akan basi pada perubahan parameter pertama.
	 *
	 * 3. **Kalimat kelas C datang dari `BENCHMARK_RUJUKAN`, bukan ditulis ulang.**
	 *    Domain sengaja menyediakannya sebagai KALIMAT, bukan sebagai angka, supaya
	 *    halaman tidak tergoda merendernya sebagai capaian (aturan D-02).
	 *
	 * 4. **Angka potret ikut ditampilkan bila tersedia**: pembaca yang datang dari
	 *    ⓘ pita data perlu melihat nilai yang sedang dijelaskan, bukan hanya
	 *    rumusnya.
	 *
	 * @see docs/10-REVISION-SPEC.md: §4.4 klasifikasi angka, §4.6 aturan bagian dampak
	 * @see docs/12-BUILD-CONTRACT-V2.md: §3.5 WP-04 kriteria selesai butir 4
	 */
	import { SectionRule } from '$lib/components/editorial';
	import { impact } from '$lib/stores/impact.svelte.js';
	import {
		BENCHMARK_RUJUKAN,
		IMPACT_FIGURE_CLASS
	} from '$lib/domain/services/ProgramImpactService.js';
	import { REACH_PARAMETERS } from '$lib/domain/constants/kpi-targets.js';
	import { formatAngka, formatPersen, formatTanggal } from '$lib/utils/format.js';

	/**
	 * Definisi tiap angka kelas A yang tampil di zona publik.
	 *
	 * Kolom `kunci` menunjuk field `PublicImpactSnapshot`, sehingga kelas angkanya
	 * dibaca dari `IMPACT_FIGURE_CLASS`: bukan ditulis ulang di sini dan berisiko
	 * menyimpang dari domain.
	 */
	const ANGKA_TERHITUNG = [
		{
			kunci: 'registeredAwardees',
			nama: 'Anggota terdata',
			definisi:
				'Cacah awardee berstatus aktif yang persetujuan pendataannya masih berlaku. Pendaftar yang belum terverifikasi sengaja tidak dihitung.',
			mengapa:
				'Angka publik adalah klaim. Klaim yang dibesarkan akan runtuh pada audit pertama, dan penyaring yang dipakai di sini sama persis dengan penyaring laporan internal.'
		},
		{
			kunci: 'activeChapters',
			nama: 'Chapter aktif',
			definisi:
				'Cacah chapter berbasis batch yang benar-benar terisi minimal satu anggota aktif, ditulis sebagai "n dari total chapter".',
			mengapa: 'Chapter yang terdaftar tetapi kosong bukan chapter yang berjalan.'
		},
		{
			kunci: 'publishedStories',
			nama: 'Cerita terpublikasi',
			definisi:
				'Cacah naskah berstatus terpublikasi. Setiap satuannya dapat diklik dan dibaca utuh di halaman cerita.',
			mengapa:
				'Ini bukti terkuat di seluruh microsite justru karena dapat diperiksa satu per satu.'
		},
		{
			kunci: 'completedEvents',
			nama: 'Kegiatan terlaksana',
			definisi:
				'Hanya kegiatan yang sudah selesai, berbukti, dan dihadiri sekurangnya jumlah kuorum yang ditetapkan parameter KPI.',
			mengapa:
				'Dokumen sumber memakai kata "terlaksana", bukan "terjadwal". Agenda yang batal tidak boleh ikut dihitung.'
		},
		{
			kunci: 'runningMovements',
			nama: 'Gerakan berjalan',
			definisi: 'Cacah gerakan bersama yang berstatus berjalan pada tanggal potret.',
			mengapa: 'Gerakan yang masih berupa usulan belum menjanjikan apa pun kepada publik.'
		},
		{
			kunci: 'amplifiersThisMonth',
			nama: 'Anggota yang mengamplifikasi bulan ini',
			definisi:
				'Cacah orang yang tercatat menyebarkan informasi program pada bulan berjalan: angka orang, bukan rasio terhadap target.',
			mengapa:
				'Rasio terhadap target internal adalah angka tata kelola; bagi pembaca luar ia hanya mengundang salah tafsir.'
		}
	];

	/** Yang sengaja TIDAK ditampilkan di zona publik, berikut alasannya. */
	const TIDAK_DITAMPILKAN = [
		{
			hal: 'Poin, tier, papan peringkat, dan lencana',
			alasan:
				'Mekanik pencatatan kontribusi ada, dan halaman ini mengakuinya. Yang tidak dilakukan adalah memajangnya di ruang publik: halaman muka yang menempelkan harga pada sebuah unggahan membaca sebagai program yang membeli amplifikasi, dan itu membatalkan klaim amplifikasi organik yang menjadi alasan inisiatif ini ada. Angkanya hanya terlihat oleh pemiliknya sendiri di ruang anggota.'
		},
		{
			hal: 'Nama seseorang beserta capaian kontribusinya',
			alasan:
				'Persetujuan publikasi nama berstatus mati secara baku. Menampilkan nama bersama capaian melampaui apa pun yang pernah disetujui anggota, dan urutan kompetitif di halaman muka korporat merugikan orang yang justru sedang dibantu program.'
		},
		{
			hal: 'Nilai rupiah: earned media value, penghematan iklan, rasio SROI',
			alasan:
				'Perhitungannya bertumpu pada rantai asumsi yang panjang. Nilai rupiah di halaman muka adalah risiko kredibilitas terbesar dengan manfaat komunikasi terkecil.'
		},
		{
			hal: 'Capaian terhadap target internal',
			alasan:
				'Target adalah alat kelola, bukan pernyataan kepada publik. Disajikan mentah, ia hanya menimbulkan kesan gagal atau berlebihan tanpa konteks yang menyertainya.'
		},
		{
			hal: 'Nama pendaftar kegiatan, sisa kuota, dan kode kehadiran',
			alasan:
				'Data pribadi dan integritas kehadiran. "Sisa dua kursi" juga menciptakan tekanan palsu pada undangan yang seharusnya berupa ajakan.'
		}
	];

	const potret = $derived(impact.snapshot);
	const tanggalPotret = $derived(potret ? formatTanggal(potret.capturedAt, 'panjang') : '');

	/**
	 * Nilai potret sebuah angka kelas A, sudah terformat.
	 * @param {string} kunci Field pada `PublicImpactSnapshot`.
	 * @returns {string} String kosong bila potret belum tersusun.
	 */
	function nilaiPotret(kunci) {
		const nilai = potret?.[kunci];
		return typeof nilai === 'number' ? formatAngka(nilai) : '';
	}
</script>

<svelte:head>
	<title>Metode Pengukuran: PFriends</title>
	<meta
		name="description"
		content="Cara setiap angka di microsite PFriends diperoleh: mana yang terhitung dari data, mana yang estimasi berparameter, mana yang sekadar rujukan industri, dan apa batasannya."
	/>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
	<!-- Kepala halaman: tanpa foto. Halaman metode adalah dokumen, bukan etalase. -->
	<header style="padding-block:var(--rhythm-tight) 0;">
		<p class="kicker">Transparansi angka</p>
		<h1
			class="display-editorial mt-4 max-w-[20ch] text-[clamp(30px,3.2vw,44px)] leading-[1.06] text-heading"
		>
			Metode pengukuran
		</h1>
		<p class="mt-6 max-w-[60ch] text-[18px] leading-[1.55] text-ink-700">
			Setiap angka di microsite ini masuk salah satu dari tiga kelas, dan kelasnya sengaja terbaca
			oleh pengunjung: bukan hanya diketahui pengembangnya. Halaman ini menjelaskan cara tiap angka
			diperoleh dan apa yang tidak dapat disimpulkan darinya.
		</p>
		{#if tanggalPotret}
			<p class="mt-4 text-[13px] leading-[1.45] text-ink-600">
				Potret angka terakhir disusun pada {tanggalPotret}.
			</p>
		{:else if impact.loading}
			<p class="mt-4 text-[13px] leading-[1.45] text-ink-600">Memuat potret angka dari PocketBase.</p>
		{:else if impact.error}
			<p class="mt-4 text-[13px] leading-[1.45] text-ink-600">
				Potret angka belum dapat dimuat. Silakan coba kembali.
			</p>
		{/if}
	</header>

	<!-- Tiga kelas angka: ringkas, sebagai peta baca sebelum rinciannya. -->
	<SectionRule
		tone="navy"
		scale="section"
		rhythm="base"
		kicker="Peta baca"
		label="Tiga kelas angka, tiga perlakuan berbeda"
	>
		<dl class="grid grid-cols-1 gap-x-10 gap-y-8 md:grid-cols-3">
			<div class="min-w-0">
				<dt class="figure-number text-[40px] text-ink-900">A</dt>
				<dd class="mt-3">
					<p class="kicker">Terhitung</p>
					<p class="mt-3 max-w-[46ch] text-[16px] leading-[1.68] text-ink-700">
						Cacah langsung dari catatan sistem. Dapat ditelusuri ke barisnya. Ditulis tegas,
						selalu bersama tanggal potret dan penyebutnya.
					</p>
				</dd>
			</div>
			<div class="min-w-0 md:border-l md:border-ink-200 md:pl-10">
				<dt class="figure-number text-[40px] text-ink-900">B</dt>
				<dd class="mt-3">
					<p class="kicker">Estimasi berparameter</p>
					<p class="mt-3 max-w-[46ch] text-[16px] leading-[1.68] text-ink-700">
						Angka kelas A dikalikan parameter berasumsi. Selalu disajikan sebagai rentang,
						berlabel Estimasi, dan asumsinya dapat dibuka di halaman ini.
					</p>
				</dd>
			</div>
			<div class="min-w-0 md:border-l md:border-ink-200 md:pl-10">
				<dt class="figure-number text-[40px] text-ink-900">C</dt>
				<dd class="mt-3">
					<p class="kicker">Benchmark eksternal</p>
					<p class="mt-3 max-w-[46ch] text-[16px] leading-[1.68] text-ink-700">
						Angka rujukan industri yang dikutip dokumen inisiatif. Bukan hasil pengukuran
						PFriends, karena itu ditulis sebagai kalimat dan tidak pernah sebagai angka besar.
					</p>
				</dd>
			</div>
		</dl>
	</SectionRule>

	<!-- Kelas A: definisi per angka. -->
	<SectionRule
		scale="display"
		rhythm="loose"
		kicker="Kelas A"
		label="Angka yang terhitung dari data"
		lead="Enam angka berikut adalah cacah langsung. Yang membedakannya dari angka pemasaran adalah penyaringnya: sama persis dengan penyaring yang dipakai laporan internal."
	>
		<div class="border-t border-ink-200">
			{#each ANGKA_TERHITUNG as angka (angka.kunci)}
				<article class="grid grid-cols-1 gap-x-10 gap-y-4 border-b border-ink-200 py-8 lg:grid-cols-12">
					<div class="min-w-0 lg:col-span-4">
						<h3 class="text-[18px] leading-[1.35] font-bold text-heading">{angka.nama}</h3>
						<p class="mt-2 text-[13px] leading-[1.45] text-ink-600">
							Kelas {IMPACT_FIGURE_CLASS[angka.kunci]} · terhitung
						</p>
						{#if nilaiPotret(angka.kunci)}
							<p class="figure-number mt-4 text-[40px] text-ink-900">
								{nilaiPotret(angka.kunci)}
							</p>
						{/if}
					</div>
					<div class="min-w-0 lg:col-span-8">
						<p class="max-w-[62ch] text-[16px] leading-[1.68] text-ink-700">{angka.definisi}</p>
						<p class="mt-3 max-w-[62ch] text-[15px] leading-[1.6] text-ink-600">
							{angka.mengapa}
						</p>
					</div>
				</article>
			{/each}
		</div>
	</SectionRule>

	<!-- Kelas B: rumus jangkauan organik. -->
	<SectionRule
		tone="red"
		scale="quiet"
		rhythm="snug"
		kicker="Kelas B"
		label="Jangkauan organik: estimasi, bukan hasil ukur"
	>
		<div class="grid grid-cols-1 gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,1fr)_340px]">
			<div class="min-w-0">
				<p class="max-w-[62ch] text-[16px] leading-[1.68] text-ink-700">
					PFriends tidak dapat membaca statistik akun pribadi anggota, dan tidak berniat
					melakukannya. Yang dapat dihitung adalah berapa orang menyebarkan informasi program;
					sisanya adalah perkiraan berdasarkan parameter yang seluruhnya ditulis di bawah ini.
				</p>

				<p class="mt-6 max-w-[62ch] font-mono text-[14px] leading-[1.7] text-ink-800">
					jangkauan = pengamplifikasi × ukuran jaringan × koefisien eksposur × (1 − irisan
					jaringan)
				</p>

				<p class="mt-6 max-w-[62ch] text-[16px] leading-[1.68] text-ink-700">
					Batas bawah rentang memakai kombinasi paling konservatif, batas atas memakai kombinasi
					paling longgar. Karena itu hasilnya selalu ditulis sebagai rentang lebar: angka
					tunggal akan terbaca sebagai hasil pengukuran, dan ini bukan hasil pengukuran.
				</p>

				<p class="mt-6 max-w-[62ch] text-[15px] leading-[1.6] text-ink-600">
					Batas yang wajib diketahui: satu orang yang terpapar dua kali dari dua anggota berbeda
					sudah dikoreksi lewat faktor irisan jaringan, tetapi koreksinya berupa satu angka rata,
					bukan pengukuran per jaringan. Angka ini layak dipakai untuk melihat besaran, tidak
					layak dipakai sebagai dasar transaksi.
				</p>
			</div>

			<dl class="min-w-0 border-t border-ink-200 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-10">
				<div class="border-b border-ink-200 py-4">
					<dt class="kicker">Ukuran jaringan per anggota</dt>
					<dd class="mt-2 text-[16px] leading-[1.6] text-ink-700">
						{formatAngka(REACH_PARAMETERS.jaringanSosialMin)}–{formatAngka(
							REACH_PARAMETERS.jaringanSosialMax
						)} orang · angka rujukan dokumen sumber
					</dd>
				</div>
				<div class="border-b border-ink-200 py-4">
					<dt class="kicker">Koefisien eksposur</dt>
					<dd class="mt-2 text-[16px] leading-[1.6] text-ink-700">
						{formatPersen(REACH_PARAMETERS.koefisienEksposurMin * 100)}–{formatPersen(
							REACH_PARAMETERS.koefisienEksposurMax * 100
						)} · asumsi, bukan hasil ukur
					</dd>
				</div>
				<div class="py-4">
					<dt class="kicker">Irisan jaringan antaranggota</dt>
					<dd class="mt-2 text-[16px] leading-[1.6] text-ink-700">
						{formatPersen(REACH_PARAMETERS.overlapJaringan * 100)} · asumsi, bukan hasil ukur
					</dd>
				</div>
			</dl>
		</div>
	</SectionRule>

	<!-- Kelas C: kalimat rujukan, tanpa angka besar. -->
	<SectionRule
		scale="section"
		rhythm="base"
		kicker="Kelas C"
		label="Rujukan industri yang dikutip, bukan capaian PFriends"
	>
		<ul class="max-w-[70ch] border-t border-ink-200">
			{#each BENCHMARK_RUJUKAN as rujukan (rujukan.id)}
				<li class="border-b border-ink-200 py-6">
					<p class="text-[18px] leading-[1.55] text-ink-700">{rujukan.kalimat}</p>
					<p class="mt-3 text-[13px] leading-[1.45] text-ink-600">Sumber: {rujukan.sumber}</p>
				</li>
			{/each}
		</ul>
		<p class="mt-6 max-w-[62ch] text-[15px] leading-[1.6] text-ink-600">
			Kedua kalimat di atas sengaja tidak dicetak sebagai angka besar, gauge, maupun batang progres.
			Bentuk visual seperti itu menyatakan "capaian" tanpa satu kata pun, dan keduanya bukan capaian
			PFriends.
		</p>
	</SectionRule>

	<!-- Yang tidak ditampilkan. -->
	<SectionRule
		tone="navy"
		scale="quiet"
		rhythm="tight"
		kicker="Batas"
		label="Yang sengaja tidak ditampilkan di sini"
	>
		<dl class="max-w-[70ch] border-t border-ink-200">
			{#each TIDAK_DITAMPILKAN as butir (butir.hal)}
				<div class="border-b border-ink-200 py-6">
					<dt class="text-[18px] leading-[1.35] font-bold text-heading">{butir.hal}</dt>
					<dd class="mt-3 text-[16px] leading-[1.68] text-ink-700">{butir.alasan}</dd>
				</div>
			{/each}
		</dl>

		<p class="mt-8 max-w-[62ch] text-[15px] leading-[1.6] text-ink-600">
			Pertanyaan mengenai definisi sebuah angka dapat dialamatkan ke Divisi Corporate Secretary
			Pertamina Foundation lewat kontak di kaki halaman.
		</p>
	</SectionRule>
</div>
